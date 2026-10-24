import {describe, it, expect} from 'vitest';
import {act, createGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {PARCELS, extensionPrice, type ParcelId} from '../src/config/land';
import {VISUAL} from '../src/config/visual';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {MeadowCamera, gridPoint, type WorldBounds} from '../src/ui/gestures';
import {toScreen} from '../src/ui/projection';
import {buildingFrame, islandFrame, recenterCamera, type ScreenChrome} from '../src/display/recenter';
import type {GameState} from '../src/state/types';

const landscape: ScreenChrome = {width: 844, height: 390, hudBottom: 67, column: {right: 109, bottom: 278}, footerTop: null};
const compact: ScreenChrome = {width: 667, height: 375, hudBottom: 64, column: {right: 109, bottom: 275}, footerTop: null};
const large: ScreenChrome = {width: 1280, height: 720, hudBottom: 69, column: {right: 109, bottom: 278}, footerTop: null};
const buy = (s: GameState, ...ids: ParcelId[]) => { s.pattes = 1e6; s.progression = {totalXp: cumulativeLevelXp(22), rewardedThroughLevel: 22};
  return ids.reduce((g, parcelId) => {const r = act(g, {type: 'expand', parcelId, expectedCost: extensionPrice(g)}, 0); if (!r.ok) throw Error(r.reason); return r.state;}, s); };
const islands = {start: createGame(0), partial: buy(createGame(0), 'south', 'west', 'center'),
  full: buy(createGame(0), 'south', 'west', 'center', 'southeast', 'east', 'northwest', 'north', 'northeast')};
const land = (s: GameState): WorldBounds => {
  const parcels = s.acquiredParcels.map(id => PARCELS[id]);
  return {left: gridPoint(Math.min(...parcels.map(p => p.x)), 0).x, right: gridPoint(Math.max(...parcels.map(p => p.x)) + 4, 0).x,
    top: gridPoint(0, Math.min(...parcels.map(p => p.y))).y, bottom: gridPoint(0, Math.max(...parcels.map(p => p.y)) + 4).y};
};
const recentred = (s: GameState, c: ScreenChrome) => {const view = new MeadowCamera(); view.resize(c.width, c.height); recenterCamera(view, s, c); return view;};
const visible = (view: MeadowCamera, c: ScreenChrome) => ({...view.world({x: c.column!.right, y: c.hudBottom}), right: view.world({x: c.width, y: c.height}).x, bottom: view.world({x: c.width, y: c.height}).y});

it('reserves the wider rounded turf and side shoulders without changing parcel geometry', () => {
  expect(VISUAL.ground.floatingRim).toBeGreaterThanOrEqual(64);
  expect(VISUAL.ground.floatingDepth).toBeGreaterThanOrEqual(580);
});

describe('Recentrer adapts to the owned island', () => {
  it('fits a fresh island including its complete hanging rock', () => {
    for (const c of [landscape, compact]) {
      const s = islands.start, view = recentred(s, c), seen = visible(view, c), l = land(s);
      expect(view.zoom).toBeLessThanOrEqual(VISUAL.camera.readableZoom);
      const frame = islandFrame(s)!.island;
      expect(frame.top >= seen.y && frame.bottom <= seen.bottom).toBe(true);
      const leftBeach = toScreen({x: l.left - 20, y: (l.top + l.bottom) / 2}), frontBeach = toScreen({x: (l.left + l.right) / 2, y: l.bottom + 30});
      expect(seen.x).toBeLessThan(leftBeach.x);                                    // left rim
      expect(frontBeach.y).toBeLessThan(seen.bottom); expect(frontBeach.x).toBeGreaterThan(seen.x); // most of the 50-unit front rim
      for (const b of s.buildings) { const f = buildingFrame(b); expect(f.left >= seen.x && f.right <= seen.right && f.top >= seen.y && f.bottom <= seen.bottom).toBe(true); }
    }
  });
  it('zooms out with the island and fits the rock, never above 1.05', () => {
    const zooms = Object.values(islands).map(s => recentred(s, landscape).zoom);
    expect(zooms[0]).toBeGreaterThan(zooms[1]); expect(zooms[1]).toBeGreaterThan(zooms[2]);
    for (const [s, zoom] of Object.values(islands).map((s, i) => [s, zooms[i]] as const)) {
      const view = recentred(s, landscape), seen = visible(view, landscape), frame = islandFrame(s)!.island;
      expect(frame.left >= seen.x && frame.right <= seen.right && frame.top >= seen.y && frame.bottom <= seen.bottom).toBe(true);
      expect(zoom).toBeLessThanOrEqual(VISUAL.camera.initialZoom);
    }
    // The front and left coast of a cropped large island stay in view.
    const s = islands.full, view = recentred(s, landscape), seen = visible(view, landscape), l = land(s);
    const leftCoast = toScreen({x: l.left, y: l.bottom - 296}), frontBeach = toScreen({x: l.left + 352, y: l.bottom + 30});
    expect(seen.x).toBeLessThan(leftCoast.x); expect(frontBeach.y).toBeLessThan(seen.bottom); expect(frontBeach.x).toBeGreaterThan(seen.x);
  });
  it('fits a small island entirely on a large screen without over-zooming', () => {
    const s = islands.start, view = recentred(s, large), seen = visible(view, large), frame = islandFrame(s)!.island;
    expect(view.zoom).toBeLessThanOrEqual(VISUAL.camera.initialZoom);
    expect(frame.left >= seen.x && frame.right <= seen.right && frame.top >= seen.y && frame.bottom <= seen.bottom).toBe(true);
  });
  it('is repeatable and also frames a legacy centre-start island', () => {
    const a = recentred(islands.partial, landscape); recenterCamera(a, islands.partial, landscape); const b = recentred(islands.partial, landscape);
    expect({x: a.x, y: a.y, zoom: a.zoom}).toEqual({x: b.x, y: b.y, zoom: b.zoom});
    const legacy = createCentreStartGame(0), view = recentred(legacy, landscape), seen = visible(view, landscape);
    for (const f of legacy.buildings.map(buildingFrame)) expect(f.left >= seen.x && f.right <= seen.right && f.top >= seen.y && f.bottom <= seen.bottom).toBe(true);
  });
});

describe('pan bounds follow the owned land and its rim', () => {
  const m = VISUAL.ground.visualMargin;
  const regions = (s: GameState) => s.acquiredParcels.map(id => {const p = PARCELS[id]; return {left: gridPoint(p.x, 0).x - m.left, right: gridPoint(p.x + 4, 0).x + m.right, top: gridPoint(0, p.y).y - m.top, bottom: gridPoint(0, p.y + 4).y + m.bottom};});
  for (const [name, s] of Object.entries(islands)) it(`${name}: every rim edge is reachable and a third of the view stays on land, at every zoom`, () => {
    const view = new MeadowCamera(); view.resize(844, 390); view.setVisibleRegions(regions(s));
    const l = land(s), rim = {left: l.left - m.left, right: l.right + m.right, top: l.top - m.top, bottom: l.bottom + m.bottom};
    for (const zoom of [view.minimumZoom, .3, .55, 1.05, 1.65]) {
      view.zoom = zoom;
      // Keep applies to the nearest owned parcel plus its vector rim, independently of texture size.
      const v = {width: 844 - 32, height: 390 - 62 - 32}, keepX = Math.min(v.width / zoom / 3, 704 + m.left + m.right), keepY = Math.min(v.height / zoom / 3, 592 + m.top + m.bottom);
      const extremes: [number, number][] = [[1e6, 0], [-1e6, 0], [0, 1e6], [0, -1e6]];
      for (const [dx, dy] of extremes) {
        view.pan(dx, dy);
        const a = view.world({x: 16, y: 78}), b = view.world({x: 828, y: 374});
        expect(Math.min(b.x, rim.right) - Math.max(a.x, rim.left)).toBeGreaterThanOrEqual(keepX - 1e-6);
        expect(Math.min(b.y, rim.bottom) - Math.max(a.y, rim.top)).toBeGreaterThanOrEqual(keepY - 1e-6);
        if (dx > 0) expect(a.x).toBeLessThanOrEqual(rim.left + 1e-6);    // left rim reachable
        if (dx < 0) expect(b.x).toBeGreaterThanOrEqual(rim.right - 1e-6); // right rim reachable
        if (dy > 0) expect(a.y).toBeLessThanOrEqual(rim.top + 1e-6);     // top rim reachable
        if (dy < 0) expect(b.y).toBeGreaterThanOrEqual(rim.bottom - 1e-6); // front rim reachable
      }
    }
  });
  it('keeps each detached legacy parcel reachable', () => {
    const s = buy(createCentreStartGame(0), 'northwest'), view = new MeadowCamera(); view.resize(844, 390); view.setVisibleRegions(regions(s)); view.zoom = .55;
    view.pan(1e6, 1e6); const corner = view.world({x: 16, y: 78});
    expect(corner.x).toBeLessThanOrEqual(gridPoint(0, 0).x); expect(corner.y).toBeLessThanOrEqual(gridPoint(0, 0).y);
  });
});
