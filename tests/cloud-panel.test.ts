// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {authMessage, mountAccountPanel} from '../src/cloud/accountPanel';
import {cloudConfig, UNAVAILABLE} from '../src/cloud/config';
import {accountKnown} from '../src/cloud/accountState';
import {BACKUP_KEY, CLOUD_KEY, LINK_BACKUP_PREFIX} from '../src/cloud/sync';
import {SAVE_KEY} from '../src/persistence/storage';
import {fixture, remote} from './cloud-fixtures';
import shell from '../src/main.ts?raw';

// Toute importation effective du SDK ferait échouer ces tests ; les clients configurés sont injectés.
vi.mock('@supabase/supabase-js', () => { throw new Error('Le SDK ne doit pas être importé dans ce test'); });

const config = {url: 'https://exemple-projet.supabase.co', key: 'sb_publishable_FACTICE', ref: 'exemple-projet'};
const disposals: (() => void)[] = [];
afterEach(() => { disposals.splice(0).forEach(f => f()); document.body.replaceChildren(); vi.restoreAllMocks(); });
const tick = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
async function panel(configured = true, options: {signupNull?: boolean; error?: {code: string}; online?: boolean; scope?: 'normal' | 'laboratory'} = {}) {
  const f = fixture(options.scope); disposals.push(() => f.dispose());
  if (options.online) f.gateway.remote = remote();
  const user = {id: 'player-a', email: 'lapin@example.invalid'};
  let notify: (event: string, session: {user: typeof user} | null) => void = () => {};
  const auth = {
    onAuthStateChange: vi.fn((callback: typeof notify) => { notify = callback; return {data: {subscription: {unsubscribe: vi.fn()}}}; }),
    getSession: vi.fn(async () => ({data: {session: null}, error: null})),
    signUp: vi.fn(async () => ({data: {session: options.signupNull ? null : {user}}, error: options.error ?? null})),
    signInWithPassword: vi.fn(async () => ({data: {session: {user}}, error: options.error ?? null})),
    signOut: vi.fn(async () => ({error: null})),
  };
  const create = vi.fn(async () => ({auth}) as unknown as SupabaseClient);
  const root = document.createElement('section'); root.hidden = true; document.body.append(root);
  disposals.push(await mountAccountPanel(root, f.controller, f.storage, {config: configured ? config : null,
    policy: {onlineServicesAllowed: options.scope !== 'laboratory'}, onReplacement: f.replacement, create, gateway: f.gateway}));
  await tick();
  const button = (label: string) => Array.from(root.querySelectorAll('button')).find(b => b.textContent === label)!;
  const input = (name: string, value: string) => { root.querySelector<HTMLInputElement>(`[name=${name}]`)!.value = value; };
  const submit = async () => { root.querySelector('form')!.dispatchEvent(new Event('submit', {cancelable: true})); await tick(); };
  return {...f, root, auth, create, button, input, submit, authSession: (connected: boolean) => notify(connected ? 'SIGNED_IN' : 'SIGNED_OUT', connected ? {user} : null)};
}
it('sans configuration : message et aucune création du SDK ; le boot garde son import dynamique après Jouer', async () => {
  const p = await panel(false); expect(p.root.textContent).toContain(UNAVAILABLE); expect(p.create).not.toHaveBeenCalled();
  expect(cloudConfig({})).toBeNull(); expect(cloudConfig({VITE_SUPABASE_URL: config.url, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_FACTICE'})).toBeNull();
  expect(cloudConfig({VITE_SUPABASE_URL: config.url, VITE_SUPABASE_PUBLISHABLE_KEY: config.key})).toEqual(config);
  expect(shell.indexOf("import('./cloud/accountPanel')")).toBeGreaterThan(shell.indexOf('const play ='));
});
it('demande confirmation pour réparer la liaison et laisse comparer les parties sans les remplacer', async () => {
  const p = await panel(true, {online: true}); const raw = '{liaison abîmée';
  p.data.set(CLOUD_KEY, raw); const before = p.data.get(SAVE_KEY);
  p.authSession(true); await tick();
  p.button('Réparer la liaison').click();
  expect(p.root.textContent).toContain('tout envoi en attente'); expect(p.data.get(CLOUD_KEY)).toBe(raw);
  p.button('Annuler').click(); expect(p.data.get(CLOUD_KEY)).toBe(raw);
  p.button('Réparer la liaison').click(); p.button('Confirmer la réparation').click(); await tick();
  expect(p.root.textContent).toContain('Sur cet appareil'); expect(p.root.textContent).toContain('En ligne');
  expect([...p.data].find(([key]) => key.startsWith(LINK_BACKUP_PREFIX))?.[1]).toBe(raw);
  expect(p.data.get(SAVE_KEY)).toBe(before); expect(p.gateway.calls).toHaveLength(0); expect(p.replacement).not.toHaveBeenCalled();
});
it('exporte la copie de secours sans importer ni modifier les parties et libère son URL', async () => {
  const p = await panel(); const raw = p.data.get(SAVE_KEY)!;
  p.data.set(BACKUP_KEY, raw); p.authSession(true); await tick();
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:secours');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const before = p.data.get(SAVE_KEY); p.button('Télécharger la copie de secours').click(); await tick();
  expect(create).toHaveBeenCalledOnce(); expect(click).toHaveBeenCalledOnce();
  expect(p.root.textContent).toContain('Importer une partie');
  expect(p.data.get(SAVE_KEY)).toBe(before); expect(p.data.get(BACKUP_KEY)).toBe(raw); expect(p.replacement).not.toHaveBeenCalled();
  disposals.splice(0).forEach(f => f()); expect(revoke).toHaveBeenCalledWith('blob:secours');
});
it('crée un compte sans e-mail, vérifie confirmation et affiche association/statut/adresse', async () => {
  const p = await panel(); p.button('Créer mon compte').click();
  expect(p.root.querySelector<HTMLInputElement>('[name=password]')!.autocomplete).toBe('new-password');
  p.input('email', 'lapin@example.invalid'); p.input('password', 'abcdefgh'); p.input('confirmation', 'différent'); await p.submit();
  expect(p.auth.signUp).not.toHaveBeenCalled(); expect(p.root.textContent).toContain('deux mots de passe');
  p.input('confirmation', 'abcdefgh'); await p.submit();
  expect(p.auth.signUp).toHaveBeenCalledWith({email: 'lapin@example.invalid', password: 'abcdefgh'});
  expect(p.root.textContent).toContain('lapin@example.invalid'); expect(p.root.textContent).toContain('Niveau 1');
  p.button('Associer cette partie à mon compte').click(); expect(p.gateway.calls).toHaveLength(0);
  p.button('Confirmer mon choix').click(); await tick();
  expect(p.root.textContent).toContain('Sauvegardé en ligne'); expect(p.gateway.calls).toHaveLength(1);
  p.button('Se déconnecter').click(); await tick(); expect(p.auth.signOut).toHaveBeenCalledWith({scope: 'local'});
  expect(p.controller.getSnapshot().state).not.toBeNull(); expect(p.root.querySelector('form')!.hidden).toBe(false);
});
it('se connecte et propose les deux parties, confirmation et annulation', async () => {
  const p = await panel(true, {online: true}); p.input('email', 'lapin@example.invalid'); p.input('password', 'abcdefgh'); await p.submit();
  expect(p.auth.signInWithPassword).toHaveBeenCalledOnce();
  expect(p.root.textContent).toContain('Sur cet appareil'); expect(p.root.textContent).toContain('En ligne');
  p.button('Garder la partie de cet appareil').click(); p.button('Annuler').click(); expect(p.gateway.calls).toHaveLength(0);
  p.button('Récupérer ma partie en ligne').click(); p.button('Confirmer mon choix').click(); await tick();
  expect(p.replacement).toHaveBeenCalledOnce(); expect(p.root.textContent).toContain('Sauvegardé en ligne');
});
it('explique une session nulle à la création et traduit les erreurs auth', async () => {
  const p = await panel(true, {signupNull: true}); p.button('Créer mon compte').click();
  p.input('email', 'lapin@example.invalid'); p.input('password', 'abcdefgh'); p.input('confirmation', 'abcdefgh'); await p.submit();
  expect(p.root.textContent).toContain("La confirmation d'e-mail est activée dans Supabase");
  expect(authMessage({code: 'invalid_credentials'})).toContain('incorrect');
  expect(authMessage({code: 'email_exists'})).toContain('déjà utilisée');
  expect(authMessage({code: 'weak_password'})).toContain('8 caractères');
  expect(authMessage({status: 429})).toContain('trop de tentatives');
  expect(authMessage({})).toContain('indisponible');
  const q = await panel(true, {error: {code: 'invalid_credentials'}}); await q.submit(); expect(q.root.textContent).toContain('incorrect');
});
it('le laboratoire ne crée jamais de client', async () => {
  const p = await panel(true, {scope: 'laboratory'}); expect(p.root.hidden).toBe(true); expect(p.create).not.toHaveBeenCalled();
});
it('une session expirée demande une reconnexion ; une déconnexion explicite ignore les événements tardifs', async () => {
  const p = await panel(); await p.submit();
  p.button('Associer cette partie à mon compte').click(); p.button('Confirmer mon choix').click(); await tick();
  p.authSession(false); expect(p.root.textContent).toContain('Ta session a expiré'); expect(p.root.querySelector('form')!.hidden).toBe(false);
  p.authSession(true); await tick(); expect(p.root.textContent).toContain('Sauvegardé en ligne');
  p.button('Se déconnecter').click(); await tick(); p.authSession(true); await tick();
  expect(p.root.querySelector('form')!.hidden).toBe(false); expect(p.root.querySelector<HTMLElement>('[data-signout]')!.hidden).toBe(true);
});
it('affiche et masque les deux mots de passe et rétablit le masquage après connexion et déconnexion', async () => {
  const p = await panel(); p.button('Créer mon compte').click();
  const password = p.root.querySelector<HTMLInputElement>('[name=password]')!;
  const confirmation = p.root.querySelector<HTMLInputElement>('[name=confirmation]')!;
  const visibility = p.button('Afficher');
  expect(visibility.getAttribute('aria-pressed')).toBe('false');
  visibility.click();
  expect([password.type, confirmation.type]).toEqual(['text', 'text']);
  expect(visibility.textContent).toBe('Masquer'); expect(visibility.getAttribute('aria-pressed')).toBe('true');
  visibility.click(); expect([password.type, confirmation.type]).toEqual(['password', 'password']);
  visibility.click(); p.input('email', 'lapin@example.invalid'); p.input('password', 'abcdefgh'); p.input('confirmation', 'abcdefgh');
  await p.submit();
  expect(accountKnown(p.storage)).toBe(true);
  expect([password.type, confirmation.type]).toEqual(['password', 'password']);
  expect(visibility.getAttribute('aria-pressed')).toBe('false'); expect(password.value).toBe('');
  visibility.click(); p.button('Se déconnecter').click(); await tick();
  expect([password.type, confirmation.type]).toEqual(['password', 'password']);
  expect(visibility.textContent).toBe('Afficher'); expect(visibility.getAttribute('aria-pressed')).toBe('false');
  expect(accountKnown(p.storage)).toBe(false);
});
it('la demande du rappel choisit le mode création de compte', async () => {
  const p = await panel();
  p.root.dispatchEvent(new Event('create-account'));
  expect(p.root.querySelector('[data-confirm]')!.hasAttribute('hidden')).toBe(false);
  expect(p.root.querySelector('[type=submit]')!.textContent).toBe('Créer mon compte');
  expect(document.activeElement).toBe(p.root.querySelector('[name=email]'));
  // Une deuxième invitation conserve le mode création.
  p.root.dispatchEvent(new Event('create-account'));
  expect(p.root.querySelector('[type=submit]')!.textContent).toBe('Créer mon compte');
});
it('conserve la demande de création pendant le chargement du client', async () => {
  const mounting = panel();
  document.querySelector<HTMLElement>('section')!.dataset.createAccount = 'true';
  const p = await mounting;
  expect(p.root.querySelector('[type=submit]')!.textContent).toBe('Créer mon compte');
  expect(document.activeElement).toBe(p.root.querySelector('[name=email]'));
  expect(p.root.dataset.createAccount).toBeUndefined();
});
