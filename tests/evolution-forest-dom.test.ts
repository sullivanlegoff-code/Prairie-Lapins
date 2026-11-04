// @vitest-environment happy-dom
import {beforeEach, afterEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, encodeGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {SAVE_KEY} from '../src/persistence/storage';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {portrait, rabbitPortrait} from '../src/ui/portraits';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  // The action gate ignores a second press of the same button within 350 ms: each press here comes a second later.
  let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock += 1000);
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function mount(s: GameState) {
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), playPicnic: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('forest'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => 0, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); }); return {ui, controller};
}
const panel = () => document.getElementById('panel-content')!;
/** Level 20, the forest (building-100), a universal enclosure (building-101) with a paille at 30, a neige at 29 and a Frisket at 40. */
function game(forest = true): GameState {
  const s = createGame(0); s.pattes = 20_000; s.progression = {totalXp: cumulativeLevelXp(20), rewardedThroughLevel: 20};
  const free = () => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('No space'); };
  for (const [id, kind] of [['building-100', 'forest'], ['building-101', 'enclosure'], ['building-102', 'statue'], ['building-103', 'statue']] as const) {
    if (kind === 'forest' && !forest) continue; const c = free(); s.buildings.push(emptyBuilding(id, kind, c.x, c.y));
  }
  s.buildings.find(b => b.id === 'building-101')!.habitat = {type: 'universal', level: 3};
  s.rabbits.push({id: 'rabbit-104', species: 'paille', affection: 30, enclosureId: 'building-101'}, {id: 'rabbit-105', species: 'neige', affection: 29, enclosureId: 'building-101'},
    {id: 'rabbit-106', species: 'frisket', affection: 40, enclosureId: 'building-101'});
  s.discovered.push('neige', 'frisket'); s.nextId = 107; return s;
}

it('a portrait keeps the old drawing until the rabbit has evolved explicitly', () => {
  expect(rabbitPortrait({species: 'paille', affection: 30})).toContain('paille-v1.png');
  expect(rabbitPortrait({species: 'paille', affection: 30})).not.toContain('data-evolved');
  expect(rabbitPortrait({species: 'paille', affection: 30, evolution: {done: true}})).toContain('paille-v2.png');
  expect(rabbitPortrait({species: 'paille', affection: 29})).toContain('paille-v1.png');
  expect(rabbitPortrait({species: 'paille', affection: 45, classicLook: true})).toContain('paille-v1.png');
  expect(rabbitPortrait({species: 'frisket', affection: 50})).toContain('frisket-v1.png');
  expect(rabbitPortrait({species: 'frisket', affection: 50, evolution: {done: true}})).toContain('frisket-v2.png');
  expect(portrait('paille')).toContain('paille-v1.png'); // Catalogue and shop: the species' own drawing.
});

it('shows the required challenge progress and keeps evolution disabled until it is complete', () => {
  const {ui} = mount(game());
  ui.select({kind: 'rabbit', id: 'rabbit-104'});
  const section = panel().querySelector('[data-rabbit-evolution="rabbit-104"]')!;
  expect(section.textContent).toContain('0 / 1 voyage');
  expect(section.querySelector<HTMLButtonElement>('[data-evolve-rabbit]')!.disabled).toBe(true);
  expect(section.querySelector('.evolution-look.is-locked')).not.toBeNull();
});

it('the sheet requires explicit evolution; the scene plays and the forest then switches drawings both ways', () => {
  const s = game(); s.rabbits.find(r => r.id === 'rabbit-104')!.evolution = {challenges: {voyage: 1}};
  const {ui, controller} = mount(s);
  (ui as unknown as {open(view: unknown): void}).open({kind: 'collection'});
  expect(panel().querySelector('.collection-evolution-count')?.textContent).toBe('0 / 35 évolutions');
  expect(panel().querySelector('[data-collection-evolution="paille"]')?.classList.contains('is-locked')).toBe(true);
  expect(panel().querySelector('[data-collection-evolution="feu"]')).toBeNull(); // An undiscovered species does not reveal its evolution's shape.
  ui.select({kind: 'rabbit', id: 'rabbit-104'});
  expect(panel().querySelector<HTMLImageElement>('.portrait.large img')!.src).toContain('paille-v1.png');
  expect(panel().querySelector('[data-rabbit-evolution="rabbit-104"]')?.textContent).toContain('1 / 1 voyage');
  expect((panel().querySelector<HTMLButtonElement>('[data-evolve-rabbit]'))?.disabled).toBe(false);
  panel().querySelector<HTMLButtonElement>('[data-evolve-rabbit]')!.click();
  expect(controller.getSnapshot().state!.rabbits.find(r => r.id === 'rabbit-104')!.evolution?.done).toBe(true);
  expect(document.querySelector('.evolution-moment')).not.toBeNull();
  expect(document.querySelector<HTMLImageElement>('.evolution-after')!.src).toContain('paille-v2.png');
  document.querySelector<HTMLButtonElement>('.evolution-moment-close')!.click();
  expect(document.querySelector('.evolution-moment')).toBeNull();
  ui.select({kind: 'building', id: 'building-100'});
  expect(document.getElementById('panel-title')?.textContent ?? panel().textContent).toContain('Forêt de Brocéliande');
  const cards = [...panel().querySelectorAll<HTMLElement>('[data-forest-rabbit]')];
  expect(cards.map(card => card.dataset.forestRabbit)).toEqual(['rabbit-104']); // Affection 30 alone never adds a rabbit to the forest.
  expect(cards[0].querySelector('img')!.src).toContain('paille-v2.png');
  const toOld = cards[0].querySelector('button')!; expect(toOld.textContent).toBe('Remettre l’ancien dessin');
  const pattes = controller.getSnapshot().state!.pattes;
  toOld.click();
  let state = controller.getSnapshot().state!;
  expect(state.rabbits.find(r => r.id === 'rabbit-104')!.classicLook).toBe(true); expect(state.pattes).toBe(pattes);
  const card = panel().querySelector<HTMLElement>('[data-forest-rabbit="rabbit-104"]')!;
  expect(card.dataset.look).toBe('classic'); expect(card.querySelector('img')!.src).toContain('paille-v1.png');
  const toNew = card.querySelector('button')!; expect(toNew.textContent).toBe('Remettre le nouveau dessin');
  toNew.click();
  state = controller.getSnapshot().state!;
  expect('classicLook' in state.rabbits.find(r => r.id === 'rabbit-104')!).toBe(false);
  (ui as unknown as {open(view: unknown): void}).open({kind: 'collection'});
  expect(panel().querySelector('.collection-evolution-count')?.textContent).toBe('1 / 35 évolutions');
  expect(panel().querySelector('[data-collection-evolution="paille"]')?.classList.contains('is-unlocked')).toBe(true);
  expect(panel().querySelector('[data-collection-evolution="paille"]')?.textContent).toContain('Cœur des moissons');
});

it('the shop sells the forest from level 20 for 10 000 pattes', () => {
  const s = game(false); s.progression = {totalXp: cumulativeLevelXp(19), rewardedThroughLevel: 19};
  const {ui} = mount(s); (ui as unknown as {open(view: unknown): void}).open({kind: 'shop', tab: 'buildings'});
  const card = [...panel().querySelectorAll<HTMLElement>('article')].find(a => a.textContent?.includes('Forêt de Brocéliande'))!;
  expect(card).toBeDefined(); expect(card.textContent).toMatch(/Placer · 10.000 pièces/); expect(card.textContent).toContain('Niveau 20 requis');
  expect(card.querySelector('button')!.disabled).toBe(true);
});
