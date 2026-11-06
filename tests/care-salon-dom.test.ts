// @vitest-environment happy-dom
import {beforeEach, afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, encodeGame} from '../src/simulation';
import {HOUR} from '../src/config/balance';
import {emptyBuilding} from '../src/state/initial';
import {SAVE_KEY} from '../src/persistence/storage';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
let now = 0;
beforeEach(() => {
  now = 0;
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); });
function mount(s: GameState) {
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => now);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), playPicnic: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('care-salon'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => now, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); }); return {ui, controller, scene};
}
const panel = () => document.getElementById('panel-content')!;
const buttonNamed = (root: ParentNode, text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes(text));
/** Level 12, one statue, the salon (building-100), a universal enclosure (building-101) with a frisket at 20 and a paille at 14. */
function game(): GameState {
  const s = createGame(0); s.pattes = 10_000; s.progression = {totalXp: cumulativeLevelXp(12), rewardedThroughLevel: 12};
  const free = (kind?: 'enclosure') => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, undefined, kind)) return {x, y}; throw Error('No space'); };
  for (const [id, kind] of [['building-100', 'salon'], ['building-101', 'enclosure'], ['building-102', 'statue']] as const) { const c = free(kind === 'enclosure' ? kind : undefined); s.buildings.push(emptyBuilding(id, kind, c.x, c.y)); }
  s.rabbits.push({id: 'rabbit-103', species: 'frisket', affection: 20, enclosureId: 'building-101'}, {id: 'rabbit-104', species: 'paille', affection: 14, enclosureId: 'building-101'});
  s.discovered.push('frisket'); s.nextId = 105; return s;
}

it('the salon shows why a rabbit cannot have a care, then runs a brushing and welcomes the rabbit back', () => {
  const {ui, controller} = mount(game()); ui.select({kind: 'building', id: 'building-100'});
  const wall = panel().querySelector<HTMLElement>('[data-salon-rabbit="rabbit-104"]')!;
  expect(wall.querySelector('button')!.disabled).toBe(true); expect(wall.textContent).toContain('Ce palier se passe en le nourrissant.');
  panel().querySelector<HTMLButtonElement>('[data-salon-rabbit="rabbit-103"] button')!.click();
  const brush = panel().querySelector<HTMLElement>('[data-care="brush"]')!;
  expect(brush.textContent).toContain('2 h'); expect(brush.textContent).toContain('25 XP');
  brush.querySelector('button')!.click();
  let state = controller.getSnapshot().state!;
  expect(state.pattes).toBe(10_000 - 800); expect(state.care).toMatchObject({rabbitId: 'rabbit-103', care: 'brush'});
  expect(panel().querySelector('[data-care="away"]')).not.toBeNull();
  // The rabbit's card says where it is and refuses the meal.
  ui.select({kind: 'rabbit', id: 'rabbit-103'});
  expect(panel().textContent).toContain('Au salon de soins');
  expect(buttonNamed(panel(), 'Nourrir')!.disabled).toBe(true);
  now = 2 * HOUR; controller.refresh(); ui.select({kind: 'building', id: 'building-100'});
  panel().querySelector<HTMLButtonElement>('[data-care="ready"] button')!.click();
  state = controller.getSnapshot().state!;
  expect(state.care).toBeUndefined(); expect(state.rabbits.find(r => r.id === 'rabbit-103')!.affection).toBe(21);
  // Its gift of the day is used: the salon now explains why.
  expect(panel().querySelector('[data-salon-rabbit="rabbit-103"]')!.textContent).toContain('Ce lapin a déjà eu son cadeau aujourd’hui.');
});

it('the picnic announces how many rabbits will gain before paying, then plays its animation', () => {
  const {ui, controller, scene} = mount(game()); ui.select({kind: 'building', id: 'building-101'});
  const card = panel().querySelector<HTMLElement>('[data-picnic="building-101"]')!;
  expect(card.textContent).toContain('1 lapin sur 2 gagnera +1 d’affection');
  card.querySelector('button')!.click();
  expect(controller.getSnapshot().state!.pattes).toBe(10_000);
  buttonNamed(document.getElementById('game-dialog')!, 'Confirmer')!.click();
  const state = controller.getSnapshot().state!;
  expect(state.pattes).toBe(10_000 - 600); expect(state.picnicCycle).toBe(0);
  expect(state.rabbits.map(r => r.affection)).toEqual([1, 21, 14]);
  expect(scene.playPicnic).toHaveBeenCalledWith('building-101');
  ui.select({kind: 'building', id: 'building-101'});
  expect(panel().querySelector('[data-picnic="building-101"]')!.textContent).toContain('Tu as déjà fait ton pique-nique aujourd’hui.');
});

it('the picnic is locked below level 8', () => {
  const s = game(); s.progression = {totalXp: cumulativeLevelXp(7), rewardedThroughLevel: 7};
  const {ui} = mount(s); ui.select({kind: 'building', id: 'building-101'});
  const card = panel().querySelector<HTMLElement>('[data-picnic="building-101"]')!;
  expect(card.querySelector('button')!.disabled).toBe(true); expect(card.textContent).toContain('Niveau 8 requis');
});
