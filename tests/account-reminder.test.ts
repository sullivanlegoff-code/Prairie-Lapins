// @vitest-environment happy-dom
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {GameController} from '../src/application/GameController';
import type {MeadowScene} from '../src/display/MeadowScene';
import type {Command} from '../src/state/types';
import {previousStart} from './regression-start';
import {encodeGame} from '../src/persistence/json';
import {SAVE_KEY} from '../src/persistence/storage';
import {accountKnown, CLOUD_KEY, setAccountSession} from '../src/cloud/accountState';
import {cloudConfig} from '../src/cloud/config';

vi.mock('../src/cloud/config', () => ({cloudConfig: vi.fn(() => ({}))}));
vi.mock('@supabase/supabase-js', () => { throw Error('SDK interdit'); });
const cleanups: (() => void)[] = [];
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false;
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  vi.mocked(cloudConfig).mockReturnValue({} as NonNullable<ReturnType<typeof cloudConfig>>);
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup(options: {fire?: boolean; refused?: boolean; laboratory?: boolean; allowed?: boolean; guided?: boolean} = {}) {
  const state = previousStart(0); delete state.initiation;
  state.rabbits[0].species = options.fire === false ? 'paille' : 'feu';
  state.discovered = ['paille', 'neige', 'feu'];
  state.rabbits.forEach(r => r.affection = options.refused ? 1 : 2);
  if (options.guided) { state.startCourse = 'paille-solo'; state.missions.events.welcome = 0; }
  localStorage.setItem(SAVE_KEY, encodeGame(state));
  const storage = {scope: options.laboratory ? 'laboratory' as const : 'normal' as const,
    getItem: (k: string) => localStorage.getItem(k), setItem: (k: string, v: string) => localStorage.setItem(k, v)};
  const controller = new GameController(storage, () => 0);
  const scene = new Proxy({}, {get: () => vi.fn()}) as MeadowScene;
  const prefs = new PreferenceStore('test-reminder'); prefs.set({muted: true, tutorial: !!options.guided, tutorialDone: false});
  const ui = new GameUI(controller, scene, () => 0, prefs, undefined, {onlineServicesAllowed: options.allowed});
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  const internal = ui as unknown as {execute(c: Command, text: string, after?: () => void): void; accountReminder: {flush(): void; request(): void}};
  const breed = () => internal.execute({type: 'breed', parents: state.rabbits.map(r => r.id) as [string, string]}, 'Reproduction lancée.', () => (document.getElementById('breeding-dialog') as HTMLDialogElement).close());
  return {ui, prefs, controller, breed, reminder: internal.accountReminder};
}
const dialog = () => document.querySelector<HTMLDialogElement>('.account-reminder')!;
const button = (label: string) => [...dialog().querySelectorAll('button')].find(b => b.textContent === label)!;
it('affiche le rappel après une reproduction réussie avec Feu et après fermeture du croisement', () => {
  const p = setup();
  p.ui.open({kind: 'building', id: p.controller.getSnapshot().state!.buildings.find(b => b.kind === 'nest')!.id});
  [...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(b => b.textContent === 'Croiser')!.click();
  const breeding = document.getElementById('breeding-dialog') as HTMLDialogElement;
  breeding.querySelector<HTMLButtonElement>('.breeding-column:nth-child(1) .breeding-row')!.click();
  breeding.querySelectorAll<HTMLButtonElement>('.breeding-column')[1].querySelectorAll<HTMLButtonElement>('.breeding-row')[1].click();
  breeding.querySelector<HTMLButtonElement>('.breeding-launch')!.click();
  expect(p.controller.getSnapshot().state!.buildings.some(b => b.breeding)).toBe(true);
  expect(document.getElementById('toast')!.textContent).toContain('Reproduction lancée');
  expect(breeding.open).toBe(false);
  expect(dialog().open).toBe(true); expect(p.prefs.value.accountReminderShown).toBe(true);
  expect(document.activeElement).toBe(button('Associer mon e-mail'));
});
it.each([{fire: false}, {refused: true}, {laboratory: true}, {allowed: false}])('reste absent : %j', options => {
  const p = setup(options); p.breed(); expect(dialog().open).toBe(false); expect(p.prefs.value.accountReminderShown).toBe(false);
});
it('reste absent sans configuration', () => {
  vi.mocked(cloudConfig).mockReturnValue(null); const p = setup(); p.breed(); expect(dialog().open).toBe(false);
});
it('reste absent avec une liaison de tout propriétaire', () => {
  localStorage.setItem(CLOUD_KEY, JSON.stringify({owner: 'autre-joueur'}));
  expect(accountKnown()).toBe(true); const p = setup(); p.breed(); expect(dialog().open).toBe(false);
});
it('reste absent avec une session connectée sans liaison', () => {
  const source = {}; setAccountSession(source, true); cleanups.push(() => setAccountSession(source, false));
  const p = setup(); p.breed(); expect(dialog().open).toBe(false);
});
it('Plus tard ferme et le drapeau persiste pour les prochains rappels', () => {
  const p = setup(); p.breed(); button('Plus tard').click(); expect(dialog().open).toBe(false);
  p.reminder.request(); expect(dialog().open).toBe(false);
  expect(new PreferenceStore('test-reminder').value.accountReminderShown).toBe(true);
});
it('Échap ferme comme Plus tard', () => {
  const p = setup(); p.breed(); dialog().dispatchEvent(new Event('cancel', {cancelable: true}));
  expect(dialog().open).toBe(false); expect(p.prefs.value.accountReminderShown).toBe(true);
});
it('Associer ouvre Paramètres sur la section compte avec demande de création et focus e-mail', () => {
  const p = setup(); const root = document.getElementById('account-content')!; root.hidden = false;
  root.innerHTML = '<input name="email" type="email">';
  const scroll = vi.fn(); root.scrollIntoView = scroll;
  const create = vi.fn(); root.addEventListener('create-account', create);
  p.breed(); button('Associer mon e-mail').click();
  expect(dialog().open).toBe(false); expect(document.getElementById('settings-content')!.hidden).toBe(false);
  expect(scroll).toHaveBeenCalledWith({block: 'start'}); expect(create).toHaveBeenCalledOnce();
  expect(root.dataset.createAccount).toBe('true'); expect(document.activeElement).toBe(root.querySelector('input'));
});
it('attend un dialogue ouvert avant affichage', () => {
  const p = setup(); const other = document.getElementById('game-dialog') as HTMLDialogElement; other.showModal();
  p.breed(); expect(dialog().open).toBe(false); expect(p.prefs.value.accountReminderShown).toBe(false);
  other.close(); p.reminder.flush(); expect(dialog().open).toBe(true);
});
it('annule le rappel en attente si un compte devient connu', () => {
  const p = setup(); const other = document.getElementById('game-dialog') as HTMLDialogElement; other.showModal();
  p.breed(); localStorage.setItem(CLOUD_KEY, '{}'); other.close(); p.reminder.flush();
  expect(dialog().open).toBe(false); expect(p.prefs.value.accountReminderShown).toBe(false);
});
it('reporte à une prochaine reproduction pendant le départ guidé de Paille', () => {
  const p = setup({guided: true}); expect((p.ui as unknown as {onboardingActive: boolean}).onboardingActive).toBe(true);
  p.breed(); expect(p.controller.getSnapshot().state!.buildings.some(b => b.breeding)).toBe(true); p.reminder.flush();
  expect(dialog().open).toBe(false); expect(p.prefs.value.accountReminderShown).toBe(false);
});
it('reste absent avec ?dev=1', () => {
  history.replaceState(null, '', '?dev=1');
  try { const p = setup(); p.breed(); expect(dialog().open).toBe(false); }
  finally { history.replaceState(null, '', '/'); }
});
