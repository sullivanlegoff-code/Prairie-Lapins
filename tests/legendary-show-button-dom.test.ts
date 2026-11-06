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
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), playPicnic: vi.fn(), playLegendaryAct: vi.fn(() => true), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('forest'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => 0, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); }); return {ui, controller, scene};
}

const panel = () => document.getElementById('panel-content')!;
// Owner, 4 November 2026: touching a legendary opens its sheet only; a button on the sheet plays its show after closing it.
function game(): GameState {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(20), rewardedThroughLevel: 20};
  const free = (kind?: 'enclosure') => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, undefined, kind)) return {x, y}; throw Error('No space'); };
  const c = free('enclosure'); s.buildings.push(emptyBuilding('building-101', 'enclosure', c.x, c.y)); s.buildings.find(b => b.id === 'building-101')!.habitat = {type: 'universal', level: 3};
  s.rabbits.push({id: 'rabbit-104', species: 'ankylosaure', affection: 5, enclosureId: 'building-101'}, {id: 'rabbit-105', species: 'dragon', affection: 5, enclosureId: 'building-101'},
    {id: 'rabbit-106', species: 'requin', affection: 5, enclosureId: 'building-101'});
  s.discovered.push('ankylosaure', 'dragon', 'requin'); s.nextId = 107; return s;
}
it('puts one show button on each legendary sheet, and none on the others', () => {
  const {ui, scene} = mount(game());
  for (const [id, label, act] of [['rabbit-104', 'Coup de queue', 'slam'], ['rabbit-105', 'Souffle de feu', 'tap'], ['rabbit-106', 'Surf', 'surf']] as const) {
    ui.open({kind: 'rabbit', id});
    const button = panel().querySelector<HTMLButtonElement>(`[data-legendary-show="${act}"]`)!;
    expect(button.textContent).toBe(label); expect(button.disabled).toBe(false);
    button.click();
    expect(panel().querySelector('[data-legendary-show]')).toBeNull(); // the sheet closed
    expect(scene.playLegendaryAct).toHaveBeenLastCalledWith(id, act);
  }
  ui.open({kind: 'rabbit', id: 'rabbit-2'});
  expect(panel().querySelector('[data-legendary-show]')).toBeNull();
});
