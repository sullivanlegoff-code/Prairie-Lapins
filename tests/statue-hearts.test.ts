// @vitest-environment happy-dom
import html from '../index.html?raw';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AFFECTION_STATUE} from '../src/config/balance';
import {GameController} from '../src/application/GameController';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {quoteComplement} from '../src/simulation/actions';
import {buildingPlacementReason} from '../src/simulation/placement';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {emptyBuilding} from '../src/state/initial';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {GameUI} from '../src/ui/GameUI';
import {buildingReason, placementReason, REFUSALS} from '../src/ui/models';
import {PreferenceStore} from '../src/ui/preferences';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const ready = (hearts = 60) => {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(15), rewardedThroughLevel: 15}; s.hearts = hearts; s.pattes = 0; return s;
};
function free(s: GameState, excluding?: string) {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, excluding)) return {x, y};
  throw Error('No free footprint');
}
const buy = (s: GameState) => ({type: 'buyBuilding', kind: 'statue', ...free(s)} as const);
const panel = () => document.getElementById('panel-content')!;
const button = (label: string, host: ParentNode = panel()) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label)!;
function setup(initial = ready()) {
  const data = new Map<string, string>([[SAVE_KEY, encodeGame(initial)]]), flags = {fail: false};
  const storage: SaveStorage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => { if (flags.fail && key === SAVE_KEY) throw Error('quota'); data.set(key, value); }};
  const controller = new GameController(storage, () => 0);
  const scene = {setRabbitPurchase: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), setExpansion: vi.fn(), focusBuilding: vi.fn(), focusDecoration: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('test-statue-hearts'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => 0, prefs);
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  return {ui, controller, data, flags};
}

describe('statue heart purchase', () => {
  it('costs exactly 60 Hearts, leaves coins untouched and refuses the second copy', () => {
    expect(AFFECTION_STATUE.heartPrice).toBe(60);
    const s = ready(71), before = structuredClone(s), result = act(s, buy(s), 0);
    if (!result.ok) throw Error(result.reason);
    expect(s).toEqual(before); expect(result.state.hearts).toBe(11); expect(result.state.pattes).toBe(0);
    expect(result.state.buildings.filter(b => b.kind === 'statue')).toHaveLength(1);
    expect(act(result.state, buy(result.state), 0)).toEqual({ok: false, state: result.state, reason: 'BUILDING_LIMIT'});
    expect(decodeGame(encodeGame(result.state))).toEqual({ok: true, state: result.state});
  });
  it('does not spend Hearts on an invalid footprint, or coins when Hearts are missing', () => {
    const s = ready(59); s.pattes = 100_000;
    expect(act(s, buy(s), 0)).toEqual({ok: false, state: s, reason: 'NOT_ENOUGH_HEARTS'});
    expect(buildingReason(s, 'statue')).toBe(REFUSALS.NOT_ENOUGH_HEARTS);
    expect(placementReason(s, {kind: 'statue', cell: free(s)})).toBe(REFUSALS.NOT_ENOUGH_HEARTS);
    const enough = ready(), before = structuredClone(enough), at = enough.buildings[0];
    expect(act(enough, {type: 'buyBuilding', kind: 'statue', x: at.x, y: at.y}, 0)).toEqual({ok: false, state: enough, reason: 'CELL_OCCUPIED'});
    expect(enough).toEqual(before);
  });
  it('refuses the generic coin complement and its quote, irrespective of coin balance', () => {
    for (const pattes of [0, 60, 30_000]) {
      const s = ready(100); s.pattes = pattes; const command = buy(s), before = structuredClone(s);
      expect(quoteComplement(s, command, 0)).toEqual({ok: false, reason: 'INVALID_CHOICE'});
      expect(act(s, {type: 'payWithHearts', action: command, maxHearts: 100, maxPattes: pattes}, 0)).toEqual({ok: false, state: s, reason: 'INVALID_CHOICE'});
      expect(s).toEqual(before);
    }
  });
  it('preserves an existing v20 statue without retroactive payment and moves it freely', () => {
    const s = ready(0), at = free(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'statue', at.x, at.y));
    const loaded = decodeGame(encodeGame(s)); if (!loaded.ok) throw Error(loaded.reason);
    expect(loaded.state.hearts).toBe(0); expect(loaded.state.pattes).toBe(0);
    const statue = loaded.state.buildings.find(b => b.kind === 'statue')!, destination = free(loaded.state);
    const moved = act(loaded.state, {type: 'moveBuilding', id: statue.id, ...destination}, 0);
    if (!moved.ok) throw Error(moved.reason);
    expect(moved.state.buildings.find(b => b.id === statue.id)).toMatchObject(destination);
    expect([moved.state.hearts, moved.state.pattes]).toEqual([0, 0]);
    expect(decodeGame(encodeGame(moved.state))).toEqual({ok: true, state: moved.state});
  });
  it('rolls back the whole purchase when saving fails, then persists exactly one payment', () => {
    const {controller, data, flags} = setup(), before = controller.getSnapshot().state!, stored = data.get(SAVE_KEY), command = buy(before);
    flags.fail = true;
    expect(controller.perform(command)).toMatchObject({ok: false, reason: 'ACTION_NOT_SAVED'});
    expect(controller.getSnapshot().state).toEqual(before); expect(data.get(SAVE_KEY)).toBe(stored);
    flags.fail = false; expect(controller.perform(command).ok).toBe(true);
    const after = controller.getSnapshot().state!;
    expect([after.hearts, after.pattes]).toEqual([0, 0]);
    expect(controller.perform(command)).toMatchObject({ok: false, reason: 'BUILDING_LIMIT'});
    expect(decodeGame(data.get(SAVE_KEY)!)).toEqual({ok: true, state: after});
  });
});

describe('statue shop and placement', () => {
  it('shows the Heart price and balance; preview and cancellation are free', () => {
    const {ui, controller} = setup(); const before = controller.getSnapshot().state!;
    ui.open({kind: 'shop', tab: 'buildings'});
    const place = button('Placer · 60 cœurs'); expect(place.disabled).toBe(false); expect(place.querySelector('img.heart-icon')).not.toBeNull();
    expect(place.closest('article')!.textContent).toContain('Ton solde : 60 cœurs');
    place.click(); expect(panel().textContent).toContain('Prix : 60 cœurs · ton solde : 60 cœurs');
    expect(button('Acheter et placer · 60 cœurs').disabled).toBe(true);
    expect(controller.getSnapshot().state).toEqual(before);
    ui.select({kind: 'cell', ...free(before)});
    expect(button('Acheter et placer · 60 cœurs').disabled).toBe(false); expect(panel().querySelector('.heart-spend')).toBeNull();
    button('Annuler · aucun coût').click(); expect(controller.getSnapshot().state).toEqual(before);
  });
  it('charges once only after a valid placement confirmation, and keeps the statue after reload', () => {
    const {ui, controller, data} = setup(); ui.open({kind: 'shop', tab: 'buildings'}); button('Placer · 60 cœurs').click();
    ui.select({kind: 'cell', ...free(controller.getSnapshot().state!)});
    const confirm = button('Acheter et placer · 60 cœurs'); expect(confirm.querySelector('img.heart-icon')).not.toBeNull(); confirm.click(); confirm.click();
    const s = controller.getSnapshot().state!;
    expect([s.hearts, s.pattes]).toEqual([0, 0]); expect(s.buildings.filter(b => b.kind === 'statue')).toHaveLength(1);
    expect(decodeGame(data.get(SAVE_KEY)!)).toEqual({ok: true, state: s});
  });
  it('explains missing Hearts on the preview without offering a coin complement', () => {
    const initial = ready(59); initial.pattes = 100_000; const {ui, controller} = setup(initial), before = controller.getSnapshot().state!;
    ui.open({kind: 'shop', tab: 'buildings'}); button('Placer · 60 cœurs').click(); ui.select({kind: 'cell', ...free(before)});
    expect(button('Acheter et placer · 60 cœurs').disabled).toBe(true); expect(panel().textContent).toContain(REFUSALS.NOT_ENOUGH_HEARTS);
    expect(panel().querySelector('.heart-spend')).toBeNull(); expect(controller.getSnapshot().state).toEqual(before);
  });
});
