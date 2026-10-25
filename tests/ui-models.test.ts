import {cumulativeLevelXp,requiredExtensionLevel} from '../src/simulation/progression';
import {sendToNursery} from './manual-transfer';
import {regressionStart as createGame} from './regression-start';
import {VISUAL} from '../src/config/visual';
import {describe, expect, it} from 'vitest';
import {ActionGate, Gestures, MeadowCamera, gridPoint, gridCell} from '../src/ui/gestures';
import {buildingReason, collectionView, nurseryView, oddsView, placementReason, releaseReason, tutorialStep} from '../src/ui/models';
import {bindMeadowInput} from '../src/display/meadowInput';
import {act} from '../src/simulation';
import type {Command, GameState} from '../src/state/types';
import {EXPECTED_IDS} from './rabbit-art-fixtures';

function readyState(): GameState {
  let state = createGame(0); state.pattes = 10_000;
  const apply = (command: Command) => { const r = act(state, command, 0, () => .65); if (!r.ok) throw new Error(r.reason); state = r.state; };
  apply({type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20}); apply({type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20});
  apply({type: 'feed', id: 'rabbit-2'}); apply({type: 'feed', id: 'rabbit-3'});
  apply({type: 'breed', parents: ['rabbit-2', 'rabbit-3']});
  return state;
}

describe('touch gestures and camera', () => {
  it('recognizes one tap with small movement', () => {
    const g = new Gestures(); g.down(1, {x: 10, y: 10}); expect(g.move(1, {x: 13, y: 12})).toBeNull();
    expect(g.up(1, {x: 13, y: 12})).toEqual({type: 'tap', at: {x: 13, y: 12}});
    expect(g.up(1, {x: 13, y: 12})).toBeNull();
  });
  it('never selects after dragging even if the finger returns to its start', () => {
    const g = new Gestures(); g.down(1, {x: 10, y: 10}); expect(g.move(1, {x: 50, y: 10})?.type).toBe('pan');
    g.move(1, {x: 10, y: 10}); expect(g.up(1, {x: 10, y: 10})).toBeNull();
  });
  it('pinches around the midpoint without selecting on either release', () => {
    const g = new Gestures(); g.down(1, {x: 0, y: 0}); g.down(2, {x: 100, y: 0});
    expect(g.move(2, {x: 150, y: 0})).toMatchObject({type: 'zoom', factor: 1.5, at: {x: 75, y: 0}});
    expect(g.up(2, {x: 150, y: 0})).toBeNull(); expect(g.up(1, {x: 3, y: 3})).toBeNull();
  });
  it('does not select a cancelled gesture', () => {
    const g = new Gestures(); g.down(1, {x: 3, y: 3}); g.cancel(); expect(g.up(1, {x: 3, y: 3})).toBeNull();
  });
  it('keeps coordinates invertible across all cells before and after expansion', () => {
    const camera = new MeadowCamera(); camera.resize(844, 390);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 6; x++) {
      for (const zoom of [.6, 1, 1.8]) {
        camera.zoom = zoom; const point = gridPoint(x + .5, y + .5);
        expect(gridCell(camera.world(camera.screen(point)))).toEqual({x, y});
      }
    }
  });
  it('bounds zoom and panning including a viewport larger than the terrain', () => {
    const c = new MeadowCamera(); c.resize(844, 390); c.scale(100, {x: 400, y: 200}); expect(c.zoom).toBe(VISUAL.camera.maxZoom);
    c.pan(1e6, 1e6); expect(c.x).toBeGreaterThanOrEqual(c.bounds.left); expect(c.y).toBeGreaterThanOrEqual(c.bounds.top);
    c.scale(.0001, {x: 400, y: 200}); expect(c.zoom).toBe(c.minimumZoom);
    const beforeResize = {x: c.x, y: c.y};
    c.resize(3000, 1800); expect({x: c.x, y: c.y}).toEqual(beforeResize);
  });
  it('ignores pointer activity in sibling panels and disposes all canvas listeners', () => {
    class Canvas extends EventTarget { getBoundingClientRect() { return {left: 0, top: 0}; } setPointerCapture() {} }
    const canvas = new Canvas(), panel = new EventTarget(), c = new MeadowCamera(); let taps = 0, blocked = false;
    const dispose = bindMeadowInput(canvas as unknown as HTMLCanvasElement, c, () => { taps++; }, () => blocked, () => {});
    function event(target: EventTarget, type: string, x: number) { target.dispatchEvent(Object.assign(new Event(type, {cancelable: true}), {pointerId: 1, clientX: x, clientY: 100})); }
    const before = c.x; event(panel, 'pointerdown', 100); event(panel, 'pointermove', 200); event(panel, 'pointerup', 200);
    expect(c.x).toBe(before); expect(taps).toBe(0);
    event(canvas, 'pointerdown', 100); event(canvas, 'pointerup', 100); expect(taps).toBe(1);
    blocked = true; event(canvas, 'pointerdown', 100); event(canvas, 'pointerup', 100); expect(taps).toBe(1);
    dispose(); blocked = false; event(canvas, 'pointerdown', 100); event(canvas, 'pointerup', 100); expect(taps).toBe(1);
  });
  it('keeps the ground horizontal with a regular compressed depth', () => {
    const a = gridPoint(0, 0), b = gridPoint(6, 0), c = gridPoint(0, 2);
    expect(a.y).toBe(b.y); expect(a.x).toBe(c.x);
    expect(VISUAL.grid.depth).toBeLessThan(VISUAL.grid.width);
    expect(gridCell(gridPoint(-.1, -.1))).toEqual({x: -1, y: -1});
    for (const fraction of [.01, .99]) for (let x = 0; x < 6; x++) for (let y = 0; y < 2; y++)
      expect(gridCell(gridPoint(x + fraction, y + fraction))).toEqual({x, y});
  });
  it('frames the starting columns at an intermediate zoom with touchable rabbits', () => {
    const c = new MeadowCamera(); c.resize(844, 390); c.recenter();
    expect(c.zoom).toBeGreaterThan(VISUAL.camera.minZoom); expect(c.zoom).toBeLessThan(VISUAL.camera.maxZoom);
    expect(c.screen(gridPoint(4, 6)).x).toBeGreaterThan(0);
    expect(c.screen(gridPoint(8, 6)).x).toBeLessThan(844);
    expect(c.screen(gridPoint(6, 6)).y).toBeCloseTo((390 + 62) / 2);
    expect(33 * VISUAL.rabbit.scale * c.zoom).toBeGreaterThan(44);
    expect(VISUAL.rabbit.hitRadius * 2).toBeGreaterThanOrEqual(44);
  });
  it('anchors a moving pinch in a single transformation', () => {
    const c = new MeadowCamera(); c.resize(844, 390); c.recenter();
    const before = {x: 420, y: 190}, after = {x: 442, y: 201}, anchor = c.world(before);
    c.scale(1.2, after, after.x - before.x, after.y - before.y);
    expect(c.screen(anchor).x).toBeCloseTo(after.x); expect(c.screen(anchor).y).toBeCloseTo(after.y);
  });
  it('preserves focus and zoom on orientation and defers resizing during a gesture', () => {
    const c = new MeadowCamera(); c.resize(844, 390); c.recenter(); c.scale(1.2, {x: 422, y: 195});
    const before = {x: c.x, y: c.y, zoom: c.zoom};
    c.interaction(true); c.resize(390, 844); c.recenter();
    expect(c.width).toBe(844); expect(c.resizing).toBe(true);
    expect({x: c.x, y: c.y, zoom: c.zoom}).toEqual(before);
    c.interaction(false); expect(c.width).toBe(390); expect(c.zoom).toBe(before.zoom);
    c.resize(844, 390); expect(c.zoom).toBe(before.zoom);
  });
  it('does not turn an orientation change into a tap or pan', () => {
    class Canvas extends EventTarget { getBoundingClientRect() { return {left: 0, top: 0}; } setPointerCapture() {} }
    const canvas = new Canvas(), c = new MeadowCamera(); let taps = 0;
    const dispose = bindMeadowInput(canvas as unknown as HTMLCanvasElement, c, () => taps++, () => false, () => {});
    const send = (type: string, x: number) => canvas.dispatchEvent(Object.assign(new Event(type), {pointerId: 1, clientX: x, clientY: 100}));
    send('pointerdown', 100); c.resize(390, 844); const x = c.x;
    send('pointermove', 200); expect(c.x).toBe(x); send('pointerup', 100);
    expect(taps).toBe(0); expect(c.width).toBe(390); dispose();
  });
  it('uses the same camera geometry across expansion without recentering', () => {
    const c = new MeadowCamera(); c.resize(844, 390); c.pan(-200, 0);
    const point = c.screen(gridPoint(7.5, 4.5)), before = {x: c.x, y: c.y, zoom: c.zoom};
    const s = createGame(0);const level=requiredExtensionLevel(1);s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level}; s.pattes = 600; const result = act(s, {type:'expand',parcelId:'east',expectedCost:600}, 0);
    expect(result.ok).toBe(true);
    expect(gridCell(c.world(point))).toEqual({x: 7, y: 4});
    expect({x: c.x, y: c.y, zoom: c.zoom}).toEqual(before);
  });
  it('prevents re-entrant and accidental duplicate commands', () => {
    let clock = 0, actions = 0; const gate = new ActionGate(() => clock);
    const action = () => { actions++; gate.run('other', () => { actions++; }); };
    gate.run('feed', action); gate.run('feed', action); expect(actions).toBe(1);
    clock = 351; gate.run('feed', action); expect(actions).toBe(2);
  });
});

describe('UI projections preserve gameplay rules and secrets', () => {
  it('explains invalid placement, occupancy and price without spending', () => {
    const s = createGame(0), before = structuredClone(s);
    expect(placementReason(s, {kind: 'farm', cell: null})).toContain('Touche');
    expect(placementReason(s, {kind: 'farm', cell: {x: 18, y: 20}})).toContain('occupée');
    expect(placementReason(s, {kind: 'farm', cell: {x: 34, y: 20}})).toContain('disponible');
    expect(placementReason(s, {kind: 'farm', cell: {x: 22, y: 20}})).toBeNull(); expect(s).toEqual(before);
    s.pattes = 0; expect(buildingReason(s, 'farm')).toContain('Solde insuffisant');
  });
  it('allows a building to stay on its own cell, and new cells only after expansion', () => {
    const s = createGame(0); expect(placementReason(s, {kind: 'enclosure', movingId: 'building-1', cell: {x: 18, y: 20}})).toBeNull();
    s.acquiredParcels.push('east'); expect(placementReason(s, {kind: 'farm', cell: {x: 42, y: 24}})).toBeNull();
  });
  it('does not expose the species of a hidden birth in nursery or collection models', () => {
    let s = readyState(); const r = act(s, {type: 'collectIncome', id: 'building-1'}, 20 * 60_000); if (!r.ok) throw new Error(r.reason); s = sendToNursery(r.state);
    expect(nurseryView(s, 20 * 60_000).babies).toEqual([{slot: 0, birthId: expect.any(String), stage: 'growing', startedAt: expect.any(Number), readyAt: 50 * 60_000}]);
    expect(JSON.stringify(nurseryView(s, 20 * 60_000))).not.toContain('icy');
    expect(collectionView(s).filter(e => !e.known).map(({known,name})=>({known,name}))).toEqual(Array.from({length: EXPECTED_IDS.length - 2}, () => ({known: false, name: '???'})));
    expect(nurseryView(s, 50 * 60_000).babies).toMatchObject([{stage: 'ready', species: 'icy'}]);
    expect(s.discovered).not.toContain('icy');
  });
  it('shows actual guaranteed odds without revealing an unknown species name', () => {
    const s = createGame(0);s.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6}; s.pityFailures = 7; s.recipeBook = [];
    s.discovered.push('feu');const odds = oddsView(s, 'feu', 'neige', 4, 4); expect(odds.guaranteed).toBe(true);
    // Unknown recipe: neither name, types nor rarity; only the exact cumulative probability.
    expect(odds.entries).toEqual([]); expect(odds.unknown).toEqual({weight: 100, probability: '100 %'});
    s.recipeBook = ['feu-glace'];
    expect(oddsView(s, 'feu', 'neige', 4, 4).entries).toEqual([{"description":"feu + neige · Rare","name":"Lapin Feu Glacé","probability":"1/3 (≈ 33,33 %)","weight":33.333333333333336}]);
    // Two unknown guaranteed results share the guarantee equally.
    s.recipeBook = ['feu-glace', 'bouee'];const both = oddsView(s, 'feu-glace', 'paille', 4, 4); expect(both.entries.map(e => e.weight)).toEqual([12.5, 12.5]);
  });
  it('explains last-of-species protection and adapts the tutorial to existing progress', () => {
    const s = createGame(0); expect(releaseReason(s, 'rabbit-2', 0)).toContain('au moins un');
    expect(tutorialStep(s, false).text).toContain('récoltes'); expect(tutorialStep(s, true).rabbitId).toBe('rabbit-2');
    s.rabbits.forEach(r => { r.affection = 2; }); expect(tutorialStep(s, true).building).toBe('nest');
  });
});
