// @vitest-environment happy-dom
import {beforeEach, afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, encodeGame} from '../src/simulation';
import {JUMP_ROPE} from '../src/config/balance';
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
let clock = 0;
function mount(s: GameState) {
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => now);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), playPicnic: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('jump-rope'); prefs.set({tutorial: false, muted: true});
  clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const ui = new GameUI(controller, scene, () => now, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); }); return {ui, controller};
}
const panel = () => document.getElementById('panel-content')!;
const layer = () => document.querySelector<HTMLElement>('.jump-rope-activity')!;
const stage = () => layer().querySelector<HTMLElement>('[data-jump-rope-stage]')!;
const tapAt = (t: number) => { clock = t; stage().dispatchEvent(new Event('pointerdown', {bubbles: true, cancelable: true})); };
/** Level 6, the terrain (building-100), a universal enclosure (building-101) with a paille named Noisette. */
function game(): GameState {
  const s = createGame(0); s.pattes = 1_000; s.progression = {totalXp: cumulativeLevelXp(JUMP_ROPE.unlockLevel), rewardedThroughLevel: JUMP_ROPE.unlockLevel};
  const free = () => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('No space'); };
  for (const [id, kind] of [['building-100', 'jumprope'], ['building-101', 'enclosure']] as const) { const c = free(); s.buildings.push(emptyBuilding(id, kind, c.x, c.y)); }
  s.rabbits.push({id: 'rabbit-103', species: 'paille', affection: 4, enclosureId: 'building-101', name: 'Noisette'});
  s.nextId = 104; return s;
}

it('the shop sells the terrain from level 6 with the kiosk picture', () => {
  const s = game(); s.buildings = s.buildings.filter(b => b.kind !== 'jumprope');
  const {ui} = mount(s); ui.open({kind: 'shop', tab: 'buildings'});
  const card = [...panel().querySelectorAll<HTMLElement>('.card')].find(c => c.textContent?.includes('Terrain de corde à sauter'))!;
  expect(card.textContent).toMatch(/Placer · 1\s500 pièces/u); expect(card.textContent).toContain('touche l’écran');
  expect(card.querySelector<HTMLImageElement>('img.statue-thumbnail')!.src).toContain('assets/buildings/kiosque-corde.png');
});

it('the terrain launches a game at the tap, then pays the jumps and counts down today’s rewarded games', () => {
  const {ui, controller} = mount(game()); ui.select({kind: 'building', id: 'building-100'});
  expect(panel().textContent).toContain('Encore 3 parties récompensées aujourd’hui'); expect(panel().textContent).toContain('passe sous ton lapin');
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-rabbit="rabbit-103"] button')!.click();
  expect(layer().hidden).toBe(false); expect(layer().textContent).toContain('Noisette saute à la corde !');
  // The painted island and kiosk in front of the meadow's sky, no provisional backdrop left.
  expect(stage().querySelector<HTMLImageElement>('img.jump-rope-island')!.src).toContain('assets/jump-rope/island.webp');
  expect(stage().querySelector<HTMLImageElement>('img.jump-rope-kiosk')!.src).toContain('assets/jump-rope/kiosk.webp');
  expect(stage().querySelector('canvas.jump-rope-sky')).not.toBeNull(); expect(layer().textContent).not.toContain('provisoire');
  layer().querySelector<HTMLButtonElement>('[data-jump-rope-start]')!.click();
  // Five good jumps, right on each pass, then three taps far from the rope.
  let pass = JUMP_ROPE.leadIn, period: number = JUMP_ROPE.startPeriod;
  for (let i = 0; i < 5; i++) { tapAt(pass); period = Math.max(JUMP_ROPE.minPeriod, period * JUMP_ROPE.speedUp); pass += period; }
  expect(layer().querySelector('.jump-rope-score')!.textContent).toBe('5 sauts');
  for (let i = 0; i < 3; i++) { tapAt(pass - period / 2); pass += period; }
  const card = layer().querySelector<HTMLElement>('[data-jump-rope-card]')!;
  expect(card.hidden).toBe(false); expect(card.textContent).toContain('Noisette a fait 5 sauts !'); expect(card.textContent).toContain('+10');
  const s = controller.getSnapshot().state!;
  expect(s.pattes).toBe(1_010); expect(s.jumpRope).toMatchObject({rewarded: 1, best: 5});
  expect(layer().querySelector('.jump-rope-quota')!.textContent).toContain('Encore 2 parties récompensées');
  card.querySelector<HTMLButtonElement>('[data-jump-rope-quit]')!.click();
  expect(layer().hidden).toBe(true); expect(panel().textContent).toContain('Ton record : 5 sauts');
});

it('the space bar jumps too, and a rabbit on a trip cannot skip rope', () => {
  const s = game(); s.rabbits.push({id: 'rabbit-104', species: 'neige', affection: 2, enclosureId: 'building-101'}); s.discovered.push('neige');
  const free = () => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('No space'); };
  const c = free(); s.buildings.push(emptyBuilding('building-105', 'agency', c.x, c.y)); s.nextId = 106;
  s.travel = {welcomed: true, trips: [{rabbitId: 'rabbit-104', destination: 'Paris', startedAt: 0, endsAt: 3 * 3_600_000, hearts: 1}]};
  const {ui} = mount(s); ui.select({kind: 'building', id: 'building-100'});
  expect(panel().querySelector<HTMLButtonElement>('[data-jump-rope-rabbit="rabbit-104"] button')!.disabled).toBe(true);
  panel().querySelector<HTMLButtonElement>('[data-jump-rope-rabbit="rabbit-103"] button')!.click();
  layer().querySelector<HTMLButtonElement>('[data-jump-rope-start]')!.click();
  clock = JUMP_ROPE.leadIn; document.dispatchEvent(new KeyboardEvent('keydown', {key: ' '}));
  expect(layer().querySelector('.jump-rope-score')!.textContent).toBe('1 saut');
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); expect(layer().hidden).toBe(true);
});
