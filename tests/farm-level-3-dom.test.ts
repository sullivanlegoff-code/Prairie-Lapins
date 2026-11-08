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
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); });
function mount(s: GameState) {
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('farm-level-3'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => 0, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); }); return {ui, controller};
}
const panel = () => document.getElementById('panel-content')!;
function farmGame(level: number, farmLevel: 2 | 3, pattes: number) {
  const s = createGame(0); s.pattes = pattes; s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  const farm = emptyBuilding('building-100', 'farm', 0, 32); farm.farmLevel = farmLevel; s.buildings.push(farm); s.nextId = 101; return s;
}

it('locks the farm level 3 upgrade below player level 20', () => {
  const {ui} = mount(farmGame(19, 2, 100_000)); ui.select({kind: 'building', id: 'building-100'});
  expect(panel().querySelector('.farm-level')?.textContent).toBe('Ferme niveau 2');
  const card = panel().querySelector<HTMLElement>('[data-upgrade-farm="3"]')!;
  expect(card.textContent).toContain('Quatre nourritures fantaisie à découvrir'); expect(card.textContent).not.toContain('trèfle doré'); expect(card.querySelector('button')!.disabled).toBe(true);
  expect(card.textContent).toContain('Niveau 20 requis');
  // Owner, 8 November 2026: the fancy crops stay hidden until the farm reaches level 3.
  for (const id of ['trefleDore', 'carotteArcEnCiel', 'fraiseEtoilee', 'pommeAmour']) expect(panel().querySelector(`[data-crop="${id}"]`)).toBeNull();
  expect(panel().querySelector('[data-crop="fanes"]')).not.toBeNull();
});

it('upgrades the farm to level 3 for 60 000 pattes after confirmation, then opens the fancy crops', () => {
  const {ui, controller} = mount(farmGame(20, 2, 60_000)); ui.select({kind: 'building', id: 'building-100'});
  panel().querySelector<HTMLButtonElement>('[data-upgrade-farm="3"] button')!.click();
  expect(controller.getSnapshot().state!.pattes).toBe(60_000);
  [...document.querySelectorAll<HTMLButtonElement>('#game-dialog button')].find(b => b.textContent === 'Confirmer')!.click();
  const state = controller.getSnapshot().state!;
  expect(state.pattes).toBe(0); expect(state.buildings.at(-1)!.farmLevel).toBe(3);
  expect(panel().querySelector('.farm-level')?.textContent).toBe('Ferme niveau 3');
  expect(panel().querySelector('[data-upgrade-farm="3"]')).toBeNull();
  expect(panel().querySelector('[data-upgrade-farm="4"]')!.textContent).toContain('Niveau 25 requis');
  expect(panel().querySelector('[data-crop="trefleDore"] button')).not.toBeNull();
  expect(panel().querySelector('[data-crop="carotteArcEnCiel"]')!.textContent).toContain('Niveau 22 requis');
  expect(panel().querySelector('[data-crop="trefleDore"] img.crop-icon')).not.toBeNull();
});
