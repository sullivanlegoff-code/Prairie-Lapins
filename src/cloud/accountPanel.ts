import {setAccountSession} from './accountState';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {GameController} from '../application/GameController';
import type {SaveStorage} from '../persistence/storage';
import type {GameState} from '../state/types';
import {progressionFromXp} from '../simulation/progression';
import {cloudConfig, UNAVAILABLE, type CloudConfig} from './config';
import {SupabaseGateway, type CloudGateway} from './gateway';
import {BACKUP_KEY, CloudSync, type SyncView} from './sync';
import {fileExporter} from '../display/fileExport';

export function authMessage(error: {code?: string; message?: string; status?: number}): string {
  const code = error.code ?? '', message = (error.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || message.includes('invalid login')) return 'Ton adresse e-mail ou ton mot de passe est incorrect.';
  if (['user_already_exists', 'email_exists'].includes(code) || message.includes('already registered')) return 'Cette adresse e-mail est déjà utilisée. Connecte-toi à ton compte.';
  if (code === 'weak_password' || message.includes('password')) return 'Choisis un mot de passe de 8 caractères minimum.';
  if (error.status === 429 || code.includes('rate_limit')) return 'Tu as fait trop de tentatives. Attends un peu avant de réessayer.';
  if (code === 'email_not_confirmed') return "La confirmation d'e-mail est activée dans Supabase : le propriétaire doit la désactiver";
  if (code === 'email_address_invalid' || message.includes('invalid email')) return 'Vérifie ton adresse e-mail.';
  return 'Le service est indisponible. Ta partie reste sur cet appareil. Réessaie plus tard.';
}
const plural = (n: number, one: string, many = one + 's') => `${n} ${n > 1 ? many : one}`;
export function summary(s: GameState | null): string {
  return s ? `Niveau ${progressionFromXp(s.progression.totalXp).level} · ${s.pattes} pièces · ${s.grass} nourriture · ${s.hearts} cœurs · ${plural(s.rabbits.length, 'lapin')} · ${plural(s.discovered.length, 'espèce découverte', 'espèces découvertes')}` : 'Aucune partie';
}
export function syncMessage(v: SyncView): string {
  switch (v.status) {
    case 'saved': return `Sauvegardé en ligne${v.syncedAt ? ' · ' + new Date(v.syncedAt).toLocaleString('fr-FR') : ''}`;
    case 'checking': return 'Vérification de ta partie en ligne…';
    case 'waiting': return 'Tes progrès seront envoyés dans quelques secondes…';
    case 'sending': return 'Envoi en cours…';
    case 'offline': return 'Hors ligne : tes progrès sont gardés sur cet appareil et seront envoyés plus tard.';
    case 'local-error': return "Ta sauvegarde locale est en erreur. Répare-la dans « Sauvegarde » avant l'envoi en ligne.";
    case 'session': return 'Ta session a expiré. Reconnecte-toi ; ta partie reste sur cet appareil.';
    case 'choice': return 'Choisis la partie à associer à ton compte.';
    case 'conflict': return 'Ta partie a changé ici et en ligne. Choisis celle que tu veux garder. Aucune fusion ne sera faite.';
    case 'recovery': return v.message ?? 'La liaison de cet appareil à ton compte est abîmée. Ta partie reste conservée. Tu peux réparer la liaison puis comparer les deux parties.';
    case 'error': case 'outdated': return v.message ?? 'La sauvegarde en ligne est bloquée. Exporte ta partie et réessaie.';
    default: return '';
  }
}
interface Options {
  config?: CloudConfig | null; policy: {onlineServicesAllowed: boolean}; onReplacement(): void;
  create?: (config: CloudConfig) => Promise<SupabaseClient>; gateway?: CloudGateway;
}
async function create(config: CloudConfig): Promise<SupabaseClient> {
  const {createClient} = await import('@supabase/supabase-js');
  return createClient(config.url, config.key, {auth: {persistSession: true, autoRefreshToken: true,
    detectSessionInUrl: false, storageKey: `prairie-lapins.auth.${config.ref}`}});
}
export async function mountAccountPanel(root: HTMLElement, controller: GameController, storage: SaveStorage, options: Options): Promise<() => void> {
  if (!options.policy.onlineServicesAllowed || controller.storageScope === 'laboratory') return () => {};
  root.hidden = false;
  const config = options.config === undefined ? cloudConfig() : options.config;
  if (!config) {
    root.replaceChildren(); const heading = document.createElement('h3'), p = document.createElement('p');
    heading.textContent = 'Sauvegarde en ligne'; p.textContent = UNAVAILABLE; root.append(heading, p); return () => {};
  }
  root.innerHTML = `<h3>Sauvegarde en ligne</h3>
    <p class="small">Associe ta partie à ton adresse e-mail pour la retrouver sur un autre appareil ou si ton navigateur l'efface.</p>
    <p data-email></p><p data-status role="status" aria-live="polite"></p><p data-error role="alert"></p>
    <form><label>Adresse e-mail<input name="email" type="email" autocomplete="email" required></label>
    <label>Mot de passe<input name="password" type="password" autocomplete="current-password" required></label>
    <label data-confirm hidden>Confirme ton mot de passe<input name="confirmation" type="password" autocomplete="new-password"></label>
    <button type="button" data-visibility class="secondary" aria-pressed="false">Afficher</button>
    <button type="submit">Se connecter</button><button type="button" data-toggle class="secondary">Créer mon compte</button>
    <p class="small">Mot de passe oublié ? Contacte le propriétaire pour qu'il le réinitialise. Aucun e-mail ne sera envoyé.</p></form>
    <div data-choices></div><div class="actions"><button data-retry type="button" class="secondary" hidden>Réessayer</button>
    <button data-signout type="button" class="secondary" hidden>Se déconnecter</button></div>
    <section data-backup-area hidden><h4>Copie de secours</h4>
    <p class="small">Cette copie contient la partie de cet appareil avant sa dernière récupération en ligne. Télécharge-la, puis utilise « Importer une partie » dans la section « Remplacer la partie » des Paramètres. Tu verras son résumé avant de confirmer le remplacement.</p>
    <button data-backup type="button" class="secondary">Télécharger la copie de secours</button>
    <button data-backup-fallback type="button" class="secondary" hidden>Télécharger le JSON de secours</button>
    <p data-backup-status role="status"></p></section>`;
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const form = get<HTMLFormElement>('form'), email = get<HTMLInputElement>('[name=email]'), password = get<HTMLInputElement>('[name=password]'), confirmation = get<HTMLInputElement>('[name=confirmation]');
  const error = get('[data-error]'), toggle = get<HTMLButtonElement>('[data-toggle]'), submit = get<HTMLButtonElement>('[type=submit]');
  const retry = get<HTMLButtonElement>('[data-retry]'), signout = get<HTMLButtonElement>('[data-signout]');
  const visibility = get<HTMLButtonElement>('[data-visibility]');
  function hidePassword() {
    password.type = confirmation.type = 'password';
    visibility.textContent = 'Afficher'; visibility.setAttribute('aria-pressed', 'false');
  }
  visibility.onclick = () => {
    const visible = password.type === 'password';
    password.type = confirmation.type = visible ? 'text' : 'password';
    visibility.textContent = visible ? 'Masquer' : 'Afficher'; visibility.setAttribute('aria-pressed', String(visible));
  };
  let client: SupabaseClient;
  try { client = await (options.create ?? create)(config); }
  catch { error.textContent = 'Le service est indisponible. Réessaie en rechargeant la page.'; return () => {}; }
  const sync = new CloudSync(controller, storage, options.gateway ?? new SupabaseGateway(client), options.onReplacement, undefined, options.policy);
  const exporter = fileExporter();
  let pendingBackup: {json: string; filename: string} | null = null;
  let alive = true, signup = false, busy = false, signedOut = false, owner: string | null = null, address = '', sequence = 0;
  let selected: 'remote' | 'local' | null = null;
  let confirmRepair = false;
  function render(v: SyncView) {
    if (!alive) return;
    form.hidden = !!owner && v.status !== 'session';
    get('[data-email]').textContent = address;
    get('[data-status]').textContent = syncMessage(v);
    retry.hidden = !['offline', 'error', 'local-error'].includes(v.status);
    signout.hidden = !owner;
    try { get('[data-backup-area]').hidden = storage.getItem(BACKUP_KEY) === null; }
    catch { get('[data-backup-area]').hidden = true; }
    const choices = get('[data-choices]'); choices.replaceChildren();
    const button = (label: string, f: () => void) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary'; b.textContent = label; b.onclick = f; choices.append(b); };
    if (v.status === 'recovery') {
      if (confirmRepair) {
        const warning = document.createElement('p');
        warning.textContent = 'La liaison abîmée, y compris tout envoi en attente, sera conservée dans une copie de secours. La partie jouée ne sera pas remplacée. Tu devras ensuite choisir la partie à garder après comparaison.';
        choices.append(warning);
        button('Confirmer la réparation', () => { confirmRepair = false; void sync.repairLink(true); });
        button('Annuler', () => { confirmRepair = false; render(sync.getView()); });
      } else button('Réparer la liaison', () => { confirmRepair = true; render(sync.getView()); });
      return;
    }
    confirmRepair = false;
    if (!['choice', 'conflict'].includes(v.status)) { selected = null; return; }
    const local = document.createElement('p'), remote = document.createElement('p');
    local.textContent = 'Sur cet appareil : ' + summary(controller.getSnapshot().state);
    remote.textContent = 'En ligne : ' + summary(v.remote?.state ?? null); choices.append(local, remote);
    if (selected) {
      const warning = document.createElement('p');
      warning.textContent = selected === 'remote' ? 'Confirme le remplacement de la partie de cet appareil. Une copie de secours locale sera conservée.'
        : v.remote ? "Confirme le remplacement de la partie en ligne. L'ancienne restera dans l'historique serveur." : "Confirme l'association de cette partie à ton compte.";
      choices.append(warning);
      button('Confirmer mon choix', () => { const choice = selected!; selected = null; void sync.choose(choice, true); });
      button('Annuler', () => { selected = null; render(sync.getView()); });
    } else {
      if (v.remote) button('Récupérer ma partie en ligne', () => { selected = 'remote'; render(sync.getView()); });
      button(v.remote ? 'Garder la partie de cet appareil' : 'Associer cette partie à mon compte', () => { selected = 'local'; render(sync.getView()); });
    }
  }
  const stop = sync.subscribe(render);
  let lastSummary = summary(controller.getSnapshot().state);
  const stopController = controller.subscribe(snapshot => {
    const current = summary(snapshot.state);
    if (current !== lastSummary && ['choice', 'conflict'].includes(sync.getView().status)) render(sync.getView());
    lastSummary = current;
  });
  function session(user: {id: string; email?: string} | null) {
    if (!alive) return;
    const next = user?.id ?? null;
    setAccountSession(root, !!next);
    hidePassword();
    if (next === owner) {
      if (next && sync.getView().status === 'session') void sync.connect(next);
      return;
    }
    sequence++; owner = next; address = user?.email ?? ''; selected = null;
    password.value = ''; confirmation.value = '';
    if (next) void sync.connect(next); else sync.disconnect();
    render(sync.getView());
  }
  const {data: listener} = client.auth.onAuthStateChange((_event, s) => {
    if (signedOut && s) return;
    const expired = !!owner && !s;
    session(s?.user ?? null);
    if (expired) sync.expire();
  });
  const initial = sequence;
  void client.auth.getSession().then(({data, error: err}) => {
    if (!alive || initial !== sequence) return;
    if (err) error.textContent = authMessage(err); else session(data.session?.user ?? null);
  }).catch(() => { if (alive) error.textContent = authMessage({}); });
  function setSignup(value: boolean) {
    signup = value; get('[data-confirm]').hidden = !signup; confirmation.required = signup;
    password.autocomplete = signup ? 'new-password' : 'current-password'; password.minLength = signup ? 8 : 0;
    submit.textContent = signup ? 'Créer mon compte' : 'Se connecter'; toggle.textContent = signup ? 'Se connecter' : 'Créer mon compte'; error.textContent = '';
  };
  toggle.onclick = () => setSignup(!signup);
  const createAccount = () => {
    setSignup(true); delete root.dataset.createAccount;
    root.scrollIntoView?.({block: 'start'});
    email.focus({preventScroll: true});
  };
  root.addEventListener('create-account', createAccount);
  if (root.dataset.createAccount === 'true') createAccount();
  form.onsubmit = event => {
    event.preventDefault(); if (busy) return;
    if (signup && password.value.length < 8) { error.textContent = authMessage({code: 'weak_password'}); return; }
    if (signup && password.value !== confirmation.value) { error.textContent = 'Les deux mots de passe sont différents.'; return; }
    busy = true; submit.disabled = true; toggle.disabled = true; error.textContent = '';
    const attempt = sequence;
    void (async () => {
      try {
        const credentials = {email: email.value.trim(), password: password.value};
        const result = signup ? await client.auth.signUp(credentials) : await client.auth.signInWithPassword(credentials);
        if (!alive || attempt !== sequence) return;
        if (result.error) { if (attempt === sequence) error.textContent = authMessage(result.error); }
        else if (!result.data.session) error.textContent = "La confirmation d'e-mail est activée dans Supabase : le propriétaire doit la désactiver";
        else { signedOut = false; password.value = ''; confirmation.value = ''; session(result.data.session.user); }
      } catch { if (alive) error.textContent = authMessage({}); }
      finally { busy = false; if (alive) { submit.disabled = false; toggle.disabled = false; } }
    })();
  };
  signout.onclick = () => {
    setAccountSession(root, false); hidePassword(); password.value = ''; confirmation.value = '';
    signedOut = true; sequence++; sync.disconnect(); owner = null; address = ''; render(sync.getView());
    void client.auth.signOut({scope: 'local'}).then(({error: err}) => { if (alive && err) error.textContent = authMessage(err); })
      .catch(() => { if (alive) error.textContent = authMessage({}); });
  };
  retry.onclick = () => { void sync.retry(); };
  get<HTMLButtonElement>('[data-backup]').onclick = () => { void (async () => {
    const status = get('[data-backup-status]');
    try {
      const json = storage.getItem(BACKUP_KEY);
      if (json === null) { status.textContent = 'Aucune copie de secours n’est disponible.'; return; }
      const filename = `prairie-lapins-copie-de-secours-${new Date().toISOString().slice(0, 10)}.json`;
      const outcome = await exporter.export(json, filename);
      if (!alive) return;
      pendingBackup = outcome === 'fallback' ? {json, filename} : null;
      get('[data-backup-fallback]').hidden = !pendingBackup;
      status.textContent = outcome === 'cancelled' ? 'Export annulé. La copie est conservée.' : outcome === 'fallback' ? 'Touche « Télécharger le JSON de secours » pour réessayer le téléchargement.' :
        'Export demandé. Conserve le fichier, puis utilise « Importer une partie » dans les Paramètres pour le consulter et confirmer sa récupération.';
    } catch { if (alive) status.textContent = 'La copie n’a pas pu être exportée. Elle reste conservée ; réessaie.'; }
  })(); };
  get<HTMLButtonElement>('[data-backup-fallback]').onclick = () => {
    if (!pendingBackup) return;
    try { exporter.download(pendingBackup.json, pendingBackup.filename); get('[data-backup-status]').textContent = 'Téléchargement demandé. Vérifie le fichier dans tes téléchargements.'; }
    catch { get('[data-backup-status]').textContent = 'Le téléchargement a échoué. Réessaie ; la copie est conservée.'; }
  };
  const background = () => { if (document.hidden) void sync.flush(); else void sync.retry(); };
  const hide = () => { void sync.flush(); }, online = () => { void sync.retry(); };
  document.addEventListener('visibilitychange', background); window.addEventListener('pagehide', hide); window.addEventListener('online', online);
  return () => {
    setAccountSession(root, false); root.removeEventListener('create-account', createAccount);
    alive = false; sequence++; stop(); stopController(); sync.dispose(); exporter.dispose(); listener.subscription.unsubscribe();
    document.removeEventListener('visibilitychange', background); window.removeEventListener('pagehide', hide); window.removeEventListener('online', online);
    root.replaceChildren();
  };
}
