import {mountProgressionFeedback} from './ProgressionFeedback';
import {mountPlayerProgression} from './PlayerProgression';
import {GameController, type ControllerIssue, type Snapshot} from '../application/GameController';
import {HOUR, SPECIES} from '../config/balance';
import {MAX_JSON_LENGTH} from '../persistence/json';
import {fileExporter} from './fileExport';
import {formatCoinAmount, setCurrencyText} from './currency';

const CATALOG_RESET_REASON = 'Cette sauvegarde vient d’une version de développement antérieure à la suppression de Terre, Mottelin, Géant et Brumelin : elle n’est plus compatible et ne peut pas être importée. La partie actuelle n’a pas été modifiée.';
const CATALOG_RESET_NOTICE = 'Ton ancienne partie venait d’une version de développement incompatible avec le nouveau catalogue (Terre, Mottelin, Géant et Brumelin ont été retirés). Une nouvelle partie a été créée.';
export const ERROR_MESSAGES: Record<ControllerIssue, string> = {
  INVALID_JSON: 'Ce fichier ne contient pas un JSON lisible.',
  INVALID_STATE: 'Cette sauvegarde est incohérente ou incomplète.',
  UNSUPPORTED_VERSION: 'Cette version de sauvegarde n’est pas prise en charge par cette version du jeu.',
  INCOMPATIBLE_CATALOG: CATALOG_RESET_REASON,
  FILE_TOO_LARGE: 'Le fichier dépasse la limite de 1 000 000 octets pour l’import.',
  READ_FAILED: 'Le navigateur ne permet pas de lire la sauvegarde. Aucun contenu existant n’a été écrasé.',
  WRITE_FAILED: 'L’écriture locale a échoué. Vérifie l’espace disponible et les autorisations du navigateur.',
  STORAGE_CHANGED: 'La sauvegarde a changé dans un autre onglet ou contrôleur. Les écritures sont bloquées pour la protéger. Exporte cette partie puis recharge la page.',
  NO_GAME: 'Aucune partie n’est chargée. Importe un fichier ou confirme un nouveau départ.',
  NOT_CONFIRMED: 'Opération annulée : la partie actuelle est conservée.',
  STALE_IMPORT: 'Cet import n’est plus actif. Sélectionne à nouveau le fichier.',
  DISPOSED: 'Cette session est terminée. Recharge la page.',
  ENCODING_FAILED: 'La partie ne peut pas être encodée. Elle reste disponible en mémoire.',
};

export function mountSavePanel(controller: GameController, onReplacement: (fresh?: boolean) => void = () => {}, environment: {test: boolean; decorationPreview?: boolean; preferenceKey?: string} = {test: false}): () => void {
  const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const status = get('save-status'), savedAt = get('saved-at'), notice = get('save-notice');
  const exportButton = get<HTMLButtonElement>('export-game'), importButton = get<HTMLButtonElement>('import-game');
  const retry = get<HTMLButtonElement>('retry-save'), restart = get<HTMLButtonElement>('restart-game');
  const backup = get<HTMLButtonElement>('export-unreadable'), fallback = get<HTMLButtonElement>('download-fallback');
  const input = get<HTMLInputElement>('import-file');
  const dialog = get<HTMLDialogElement>('import-dialog'), summary = get('import-summary'), importError = get('import-error');
  const confirm = get<HTMLButtonElement>('confirm-import'), cancel = get<HTMLButtonElement>('cancel-import');
  const beforeImport = get<HTMLButtonElement>('export-before-import');
  const exporter = fileExporter();
  const exportFilename = (name: string) => environment.test ? name.replace(/^prairie-lapins-/, environment.decorationPreview ? 'prairie-lapins-PREVIEW-DECORATIONS-v8-MODE-TEST-' : 'prairie-lapins-MODE-TEST-') : name;
  if (environment.test) {
    exportButton.textContent = 'Exporter la partie de test';
    importButton.textContent = 'Importer dans la partie de test';
    restart.textContent = 'Recommencer la partie de test';
    get('import-warning').textContent = 'Cet import remplace seulement la partie du laboratoire. La sauvegarde normale reste intacte. Les exports MODE-TEST peuvent contenir du temps avancé et des ressources ajoutées.';
    if (environment.decorationPreview) get('import-warning').textContent = 'Cet import remplace seulement la prévisualisation Décorations. Les fichiers v1 à v7 sont migrés en v8 dans cet espace, avec un secours avant migration. Export PREVIEW-DECORATIONS-v8-MODE-TEST : importable volontairement dans le jeu normal et le laboratoire v8 après export de la partie à remplacer. Incompatible avec les comptes figés en v4. Aucun transfert automatique.';
  }
  const abort = new AbortController();
  let importToken: number | null = null;
  let readSequence = 0;
  let alive = true;
  const measureHud = () => {
    if (!alive) return;
    const height = Math.ceil(get('hud').getBoundingClientRect().height);
    const style = document.documentElement.style;
    if (height > 0 && style.getPropertyValue('--hud-occupied-height') !== `${height}px`) style.setProperty('--hud-occupied-height', `${height}px`);
  };
  const hudResize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureHud);
  // Safe-area padding can change without changing the content box (e.g. rotation).
  hudResize?.observe(get('hud'), {box: 'border-box'});
  if (!hudResize) window.addEventListener('resize', measureHud, {signal: abort.signal});
  measureHud();
  let pendingDownload: {json: string; filename: string} | null = null;
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short', timeStyle: 'medium'});
  function say(message: string) { notice.textContent = message; }
  function closeImport() {
    readSequence++; importToken = null; controller.cancelImport();
    if (dialog.open) dialog.close();
    importError.textContent = '';
  }
  const playerProgression = mountPlayerProgression();
  const disposeProgressionFeedback = mountProgressionFeedback(controller, environment.preferenceKey ?? ('prairie-lapins.ui.' + controller.storageScope), playerProgression.confirmedGain);
  let resetShown = false;
  const unsubscribe = controller.subscribe((snapshot: Snapshot) => {
    playerProgression.update(snapshot);
    const {state} = snapshot;
    if (!resetShown && snapshot.catalogReset) {
      resetShown = true;
      const message = document.createElement('p'); message.id = 'catalog-reset-notice'; message.setAttribute('role', 'status'); message.textContent = CATALOG_RESET_NOTICE;
      document.getElementById('game')!.insertAdjacentElement('afterend', message);
      const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = 'Compris'; dismiss.onclick = () => message.remove(); message.append(dismiss);
    }
    get('pattes').textContent = state ? formatCoinAmount(state.pattes) : '—';
    get('hearts').textContent = state ? formatCoinAmount(state.hearts) : '—';
    get('grass').textContent = state ? formatCoinAmount(state.grass) : '—';
    if (!hudResize) measureHud();
    get('rabbits').textContent = state ? String(state.rabbits.length) : '—';
    get('stored-income').textContent = state ? formatCoinAmount(Math.floor(state.buildings.reduce((sum, b) => sum + b.incomeUnits, 0) / HOUR)) : '—';
    const label = snapshot.status === 'saved' ? 'Partie enregistrée sur cet appareil.' :
      state ? 'Attention : les dernières modifications ne sont pas sauvegardées. La partie reste en mémoire.' :
        'Aucune partie chargée. La sauvegarde existante est protégée.';
    status.textContent = label + (snapshot.issue ? ` ${ERROR_MESSAGES[snapshot.issue]}` : '');
    status.dataset.status = snapshot.status;
    savedAt.textContent = snapshot.lastSavedAt === null ? 'Aucune sauvegarde réussie dans cette session.' :
      `Dernière sauvegarde réussie : ${dateFormat.format(snapshot.lastSavedAt)}.`;
    exportButton.disabled = !state; beforeImport.disabled = !state;
    retry.hidden = !['write-error', 'read-error'].includes(snapshot.status);
    restart.hidden = false;
    backup.hidden = !snapshot.hasUnreadableBackup;
  });
  async function exportCurrent() {
    const result = controller.exportGame();
    if (!result.ok) { say(ERROR_MESSAGES[result.reason]); return; }
    const filename = exportFilename(result.filename);
    try {
      const outcome = await exporter.export(result.json, filename);
      if (!alive) return;
      if (outcome === 'fallback') {
        pendingDownload = {json: result.json, filename}; fallback.hidden = false;
        say('Le partage n’a pas pu démarrer. Touche « Télécharger le JSON » pour utiliser le téléchargement.');
      } else say(outcome === 'cancelled' ? 'Export annulé. La partie est conservée.' :
        outcome === 'shared' ? 'Partage effectué. Vérifie que le fichier est conservé dans Fichiers ou à l’emplacement choisi.' :
          'Téléchargement demandé. Vérifie le fichier dans les téléchargements de ton navigateur.');
    } catch { if (alive) say('L’export n’a pas pu démarrer. La partie est conservée ; tu peux réessayer.'); }
  }
  const options = {signal: abort.signal};
  exportButton.addEventListener('click', () => { void exportCurrent(); }, options);
  beforeImport.addEventListener('click', () => { void exportCurrent(); }, options);
  fallback.addEventListener('click', () => {
    if (pendingDownload) {
      try { exporter.download(pendingDownload.json, pendingDownload.filename); say('Téléchargement demandé. Vérifie le fichier.'); }
      catch { say('Le téléchargement a échoué. Tu peux réessayer.'); }
    }
  }, options);
  importButton.addEventListener('click', () => { closeImport(); input.value = ''; input.click(); }, options);
  input.addEventListener('change', () => { void (async () => {
    const file = input.files?.[0]; if (!file) return;
    const sequence = ++readSequence;
    if (file.size > MAX_JSON_LENGTH) { say(ERROR_MESSAGES.FILE_TOO_LARGE); return; }
    let json: string;
    try { json = await file.text(); }
    catch { if (alive && sequence === readSequence) say('Impossible de lire ce fichier. La partie actuelle est conservée.'); return; }
    if (!alive || sequence !== readSequence) return;
    const prepared = controller.prepareImport(json, file.size);
    if (!prepared.ok) { say(ERROR_MESSAGES[prepared.reason]); return; }
    importToken = prepared.token;
    const s = prepared.summary;
    setCurrencyText(summary, `${s.pattes} pattes · ${s.grass} nourriture · ${s.hearts} cœurs · ${s.rabbits} ${s.rabbits===1?'lapin':'lapins'}. Espèces découvertes : ${s.discovered.map(id => SPECIES[id].name).join(', ') || 'aucune'}.`);
    importError.textContent = ''; dialog.showModal();
  })(); }, options);
  confirm.addEventListener('click', () => {
    if (importToken === null) return;
    const result = controller.confirmImport(importToken, true);
    if (!result.ok) { importError.textContent = `${ERROR_MESSAGES[result.reason]} L’import n’a pas remplacé la partie actuelle.`; return; }
    closeImport(); pendingDownload = null; fallback.hidden = true; onReplacement(); say('Partie importée et enregistrée.');
  }, options);
  cancel.addEventListener('click', () => { closeImport(); say('Import annulé. La partie actuelle est conservée.'); }, options);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeImport(); say('Import annulé. La partie actuelle est conservée.'); }, options);
  retry.addEventListener('click', () => {
    const result = controller.retrySave(); say(result.ok ? 'Sauvegarde réussie.' : ERROR_MESSAGES[result.reason]);
  }, options);
  restart.addEventListener('click', () => {
    const confirmed = window.confirm(environment.test ? 'Remplacer seulement la partie de test ? La partie normale est conservée. L’horloge et les préférences de test restent en place.' : 'Créer une nouvelle partie remplacera la sauvegarde actuelle. Exporte d’abord le contenu protégé si tu souhaites le conserver. Confirmer le nouveau départ ?');
    if (!confirmed) { say('Nouveau départ annulé. La sauvegarde est conservée.'); return; }
    const result = controller.restart(true);
    if (result.ok) onReplacement(true);
    say(result.ok ? 'Nouvelle partie créée et enregistrée.' : `${ERROR_MESSAGES[result.reason]} La sauvegarde précédente est conservée.`);
  }, options);
  backup.addEventListener('click', () => {
    const raw = controller.unreadableBackup();
    if (raw !== null) void exporter.export(raw, exportFilename(`prairie-lapins-sauvegarde-protegee-${new Date().toISOString().slice(0, 10)}.json`))
      .then(outcome => { if (alive) {
        if (outcome === 'fallback') { pendingDownload = {json: raw, filename: exportFilename('prairie-lapins-sauvegarde-protegee.json')}; fallback.hidden = false; }
        say(outcome === 'cancelled' ? 'Export annulé.' : 'Export du contenu protégé demandé. Vérifie le fichier.');
      } }).catch(() => { if (alive) say('L’export du contenu protégé a échoué.'); });
  }, options);
  return () => { alive = false; hudResize?.disconnect(); document.documentElement.style.removeProperty('--hud-occupied-height'); closeImport(); abort.abort(); unsubscribe(); disposeProgressionFeedback(); playerProgression.dispose(); exporter.dispose(); };
}
