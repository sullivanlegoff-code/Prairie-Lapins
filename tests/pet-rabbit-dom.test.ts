// @vitest-environment happy-dom
import {beforeEach, afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, encodeGame} from '../src/simulation';
import {SAVE_KEY} from '../src/persistence/storage';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
let clock = 0;
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  clock = 10_000; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
function mount(s: GameState) {
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), playPicnic: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('pet'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => 0, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); }); return {ui, controller};
}
const pointer = (target: Element, type: string, x: number, y = 20) => target.dispatchEvent(new PointerEvent(type, {pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true}));
function sheet() {
  const s = createGame(0), rabbit = s.rabbits[0]!;
  s.missions.daily.picked = ['pet-rabbits', 'collect-pattes', 'gain-affection'];
  const {ui, controller} = mount(s); ui.select({kind: 'rabbit', id: rabbit.id});
  const portrait = document.querySelector<HTMLElement>(`#panel-content [data-pet-rabbit="${rabbit.id}"]`)!;
  return {ui, controller, portrait, rabbitId: rabbit.id};
}

it('a simple touch on the portrait does not caress the rabbit', () => {
  const {controller, portrait} = sheet(); const perform = vi.spyOn(controller, 'perform');
  expect(portrait.classList.contains('pettable')).toBe(true);
  pointer(portrait, 'pointerdown', 20); pointer(portrait, 'pointermove', 22); pointer(portrait, 'pointerup', 22);
  expect(perform).not.toHaveBeenCalled();
  expect(portrait.querySelector('.pet-hearts')).toBeNull();
  expect(controller.getSnapshot().state!.missions.daily.petted).toBeUndefined();
});

it('rubbing the portrait closes the eyes, sends up hearts and counts for « Des caresses » only', () => {
  const {controller, portrait, rabbitId} = sheet(); const before = structuredClone(controller.getSnapshot().state!);
  const perform = vi.spyOn(controller, 'perform');
  pointer(portrait, 'pointerdown', 20); pointer(portrait, 'pointermove', 45); pointer(portrait, 'pointermove', 22);
  expect(perform).toHaveBeenCalledTimes(1); expect(perform).toHaveBeenCalledWith({type: 'petRabbit', rabbitId});
  expect(portrait.dataset.petting).toBe('wiggle');
  expect(portrait.querySelectorAll('.pet-hearts .heart-icon')).toHaveLength(5);
  const lid = portrait.querySelector<HTMLImageElement>('.pet-eyelid');
  expect(lid?.getAttribute('src')).toContain('eyes-closed');
  const after = controller.getSnapshot().state!;
  expect(after.missions.daily.petted).toEqual([rabbitId]); expect(after.missions.daily.progress['pet-rabbits']).toBe(1);
  for (const key of ['pattes', 'grass', 'hearts', 'progression', 'rabbits'] as const) expect(after[key]).toEqual(before[key]);
  // At most one caress every 1.5 s: rubbing on at once changes nothing.
  pointer(portrait, 'pointermove', 60); pointer(portrait, 'pointermove', 10);
  expect(perform).toHaveBeenCalledTimes(1);
  clock += 1600; pointer(portrait, 'pointermove', 60);
  expect(perform).toHaveBeenCalledTimes(2);
  expect(controller.getSnapshot().state!.missions.daily.progress['pet-rabbits']).toBe(1); // The same rabbit counts once.
  pointer(portrait, 'pointerup', 60);
});

it('small back-and-forths also caress, and with reduced motion the portrait does not wiggle', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}}));
  vi.stubGlobal('requestAnimationFrame', () => 0);
  const {controller, portrait} = sheet(); const perform = vi.spyOn(controller, 'perform');
  pointer(portrait, 'pointerdown', 20);
  for (const x of [24, 20, 24, 20]) pointer(portrait, 'pointermove', x);
  expect(perform).toHaveBeenCalledTimes(1);
  expect(portrait.dataset.petting).toBe('still');
  expect(portrait.querySelector<HTMLElement>('.pet-hearts')?.dataset.reduced).toBe('');
});

it('the sheet names the commis, taster and 3-day challenges, with the streak under way', () => {
  const s = createGame(0); s.buildings[0]!.habitat = {type: 'universal', level: 3};
  s.rabbits.push({id: 'rabbit-50', species: 'boudinet', affection: 12, enclosureId: s.buildings[0]!.id}, {id: 'rabbit-51', species: 'volant', affection: 12, enclosureId: s.buildings[0]!.id});
  s.discovered.push('boudinet', 'volant'); s.nextId = 60; s.missions.streak = {count: 2, lastCycle: 0};
  const {ui} = mount(s);
  ui.select({kind: 'rabbit', id: 'rabbit-50'});
  const items = () => [...document.querySelectorAll('#panel-content .evolution-challenge-list li')].map(li => li.textContent);
  expect(items()).toEqual(['Commis : cuisiner le moelleux · 0 / 1', 'Goûteur : goûter le poulet · 0 / 1']);
  ui.select({kind: 'rabbit', id: 'rabbit-51'});
  expect(items()).toEqual(['Réussir les missions du jour 3 jours de suite · 0 / 1 (série : 2 / 3)']);
});
