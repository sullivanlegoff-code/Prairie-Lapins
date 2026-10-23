import {describe, it, expect} from 'vitest';
import {act, createGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {PARCEL_IDS, extensionPrice, type ParcelId} from '../src/config/land';
import {VISUAL} from '../src/config/visual';
import {ISLAND} from '../src/config/islandGeometry';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {EDGE_LAYERS, terrainEdges, plateauRect, edgeProfile, type EdgePoint, type EdgePolygon, type EdgeRun, type TerrainEdges} from '../src/display/terrainEdges';
import {drawParcelTerrain} from '../src/display/parcelArt';
import {ownedRegions, islandFrame} from '../src/display/recenter';
import {toScreen} from '../src/ui/projection';
import type {GameState} from '../src/state/types';
import type Phaser from 'phaser';

const buy = (s: GameState, ...ids: ParcelId[]) => {
  s.pattes = 1e6; s.progression = {totalXp: cumulativeLevelXp(22), rewardedThroughLevel: 22};
  return ids.reduce((g, parcelId) => {const r = act(g, {type: 'expand', parcelId, expectedCost: extensionPrice(g)}, 0); if (!r.ok) throw Error(r.reason); return r.state;}, s);
};
const fixtures: [string, ParcelId[]][] = [
  ['southwest', ['southwest']], ['two north', ['southwest', 'west']], ['two east', ['southwest', 'south']],
  ['L', ['southwest', 'west', 'south']], ['2×2', ['southwest', 'west', 'south', 'center']], ['3×3', [...PARCEL_IDS]],
  ['legacy centre', ['center']], ['legacy detached', ['southwest', 'northeast']], ['legacy diagonal', ['southwest', 'center']],
  ['internal hole', PARCEL_IDS.filter(id => id !== 'center')],
];
const shapes = (s: TerrainEdges): EdgePolygon[] => [...EDGE_LAYERS.flatMap(k => s.layers[k]), ...s.strata.map(p => p.poly), ...s.accents.flatMap(a => a.paint.map(p => p.poly))];
type Rect = {left: number; top: number; right: number; bottom: number};
const area = (p: EdgePolygon) => Math.abs(p.reduce((sum, a, i) => {const b = p[(i + 1) % p.length]; return sum + a.x * b.y - b.x * a.y;}, 0)) / 2;
/** Independent full-polygon clipping check: vertices alone cannot establish non-intersection. */
function clippedArea(poly: EdgePolygon, r: Rect): number {
  let out = poly;
  for (const [axis, edge, sign] of [['x', r.left, 1], ['x', r.right, -1], ['y', r.top, 1], ['y', r.bottom, -1]] as const) {
    const input = out; out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length], da = sign * (a[axis] - edge), db = sign * (b[axis] - edge);
      if (da >= 0) out.push(a);
      if ((da < 0) !== (db < 0)) {const t = da / (da - db); out.push({x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y)});}
    }
  }
  return out.length < 3 ? 0 : area(out);
}
function contains(poly: EdgePolygon, p: EdgePoint): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
const expand = (r: Rect) => {const m = VISUAL.ground.visualMargin; return {left: r.left - m.left, right: r.right + m.right, top: r.top - m.top, bottom: r.bottom + m.bottom};};
const inside = (p: EdgePoint, r: Rect) => p.x >= r.left - 1e-6 && p.x <= r.right + 1e-6 && p.y >= r.top - 1e-6 && p.y <= r.bottom + 1e-6;
/**
 * Replaces the former shallow-water collar check: raised-edge bushes deliberately overhang the water layer, so the
 * collar is now the exposed run's outward band. Each accent (id `side:line:station`) belongs to a current run of its
 * side; every paint point lies on that run's outward side, within its span and within the side's visual margin.
 */
function accentBandIssues(s: TerrainEdges): string[] {
  const span = (r: EdgeRun, horizontal: boolean) => [Math.min(horizontal ? r.a.x : r.a.y, horizontal ? r.b.x : r.b.y), Math.max(horizontal ? r.a.x : r.a.y, horizontal ? r.b.x : r.b.y)];
  return s.accents.flatMap(a => {
    const [side, line, station] = a.id.split(':'), at = Number(line), pos = Number(station), horizontal = a.side === 'top' || a.side === 'bottom';
    const run = side === a.side ? s.runs.find(r => r.side === a.side && (horizontal ? r.a.y : r.a.x) === at && span(r, horizontal)[0] < pos && pos < span(r, horizontal)[1]) : undefined;
    if (!run) return [a.id + ': no exposed run'];
    const [low, high] = span(run, horizontal), sign = a.side === 'bottom' || a.side === 'right' ? 1 : -1, depth = VISUAL.ground.visualMargin[a.side];
    const outside = a.paint.some(({poly}) => poly.some(p => {const normal = sign * ((horizontal ? p.y : p.x) - at), along = horizontal ? p.x : p.y;
      return normal < -1e-6 || normal > depth + 1e-6 || along < low - 1e-6 || along > high + 1e-6;}));
    return outside ? [a.id + ': outside its edge band'] : [];
  });
}
function checkGeometry(ids: ParcelId[]) {
  const s = terrainEdges({acquiredParcels: ids}), rooms = s.rects.map(expand); let overlap = 0, fits = true;
  expect(accentBandIssues(s), 'accent outside its edge collar: ' + ids).toEqual([]);
  for (const poly of shapes(s)) {
    for (const r of s.rects) {
      if (poly.every(p => p.x <= r.left) || poly.every(p => p.x >= r.right) || poly.every(p => p.y <= r.top) || poly.every(p => p.y >= r.bottom)) continue;
      overlap = Math.max(overlap, clippedArea(poly, r));
    }
    fits &&= poly.every(p => rooms.some(r => inside(p, r)));
  }
  expect(overlap, 'filled surface over owned grass: ' + ids).toBeLessThan(1e-6);
  expect(fits, 'visual bounds overflow: ' + ids).toBe(true);
  return s;
}

describe('raised rectangular plateaus and exposed edges', () => {
  it.each(fixtures)('%s: keeps every filled surface and accent outside playable grass and inside visual bounds', (_name, ids) => {
    const s = checkGeometry(ids);
    expect(s.rects.reduce((sum, r) => sum + (r.right - r.left) * (r.bottom - r.top), 0)).toBe(ids.length * 704 * 592);
    for (const r of s.rects) expect(r).toEqual(plateauRect(r.id));
  });
  it('sweeps all 511 ownership sets for full-surface safety, accent edge collars, bounds, determinism and purchase-order independence', () => {
    for (let mask = 1; mask < 512; mask++) {
      const ids = PARCEL_IDS.filter((_, i) => mask & (1 << i)), s = checkGeometry(ids);
      expect(JSON.stringify(terrainEdges({acquiredParcels: [...ids].reverse()}))).toBe(JSON.stringify(s));
      expect(new Set(s.accents.map(a => a.id)).size).toBe(s.accents.length);
    }
  }, 60000);
  it.each([['north', 'west', 'top'], ['east', 'south', 'right']] as const)('buy %s: removes the old edge and its temporary accents', (_direction, id, side) => {
    const before = terrainEdges(createGame(0)), after = terrainEdges(buy(createGame(0), id)), r = plateauRect('southwest');
    const old = before.accents.filter(a => a.side === side); expect(old.length).toBeGreaterThan(0);
    expect(old.every(a => a.temporary)).toBe(true);
    expect(after.accents.some(a => old.some(o => o.id === a.id))).toBe(false);
    const oldLine = side === 'top' ? r.top : r.right;
    expect(after.runs.some(e => e.side === side && (side === 'top' ? e.a.y : e.a.x) === oldLine)).toBe(false);
    const strip = side === 'top' ? {left: r.left + 1, right: r.right - 1, top: r.top - 12, bottom: r.top + 12} :
      {left: r.right - 12, right: r.right + 12, top: r.top + 1, bottom: r.bottom - 1};
    for (const poly of shapes(after)) expect(clippedArea(poly, strip)).toBeLessThan(1e-6);
  });
  it('preserves world-stationed public-edge accents when expanding north and east', () => {
    const before = terrainEdges(createGame(0)), after = terrainEdges(buy(createGame(0), 'west', 'south'));
    for (const a of before.accents.filter(a => !a.temporary)) expect(after.accents.find(b => b.id === a.id)).toEqual(a);
  });
  it('removes south/west dressing too when a bay or legacy expansion makes it interior', () => {
    const before = terrainEdges(createCentreStartGame(0)), after = terrainEdges(buy(createCentreStartGame(0), 'south', 'west'));
    const old = before.accents.filter(a => !a.temporary); expect(old.length).toBeGreaterThan(0);
    expect(after.accents.some(a => old.some(b => b.id === a.id))).toBe(false);
  });
  it('has one continuous run per side of adjacent rectangles, 2×2 and full 3×3 (no parcel restart)', () => {
    for (const ids of [['southwest', 'south'], ['southwest', 'south', 'west', 'center'], PARCEL_IDS] as const) {
      const s = terrainEdges({acquiredParcels: [...ids]}); expect(s.runs).toHaveLength(4);
      expect(s.runs.filter(e => e.side === 'bottom')).toHaveLength(1);
    }
    const full = terrainEdges({acquiredParcels: [...PARCEL_IDS]});
    expect(full.runs.filter(e => e.side === 'bottom').map(e => Math.abs(e.b.x - e.a.x))).toEqual([ISLAND.mapWidth]);
  });
  it('uses a thin grass lip, stronger front earth, medium left edge, and quiet rear/right edges', () => {
    for (let t = 120; t <= 2232; t += 8) {
      const f = edgeProfile('bottom', t), l = edgeProfile('left', t);
      expect(f.grass).toBeLessThanOrEqual(7); expect(l.grass).toBeLessThanOrEqual(5.2);
      expect(f.earth - f.grass).toBeGreaterThan(20); expect(l.earth - l.grass).toBeGreaterThan(10);
      expect(f.sand - f.earth).toBeGreaterThanOrEqual(23); expect(f.water - f.sand).toBeCloseTo(19, 12);
      for (const side of ['top', 'right'] as const) expect(edgeProfile(side, t).water).toBeLessThanOrEqual(13);
    }
  });
  it('keeps the approved restrained decoration count, including readable bushes and provisional grass', () => {
    const one = terrainEdges(createGame(0)), full = terrainEdges({acquiredParcels: [...PARCEL_IDS]});
    expect(one.accents).toHaveLength(7); expect(full.accents).toHaveLength(23);
    expect(one.accents.some(a => a.kind === 'bush')).toBe(true);
    expect(one.accents.filter(a => a.temporary).every(a => a.kind === 'grass')).toBe(true);
  });
  it('keeps convex joins outside the rectangle and leaves L-shaped bays and internal holes open', () => {
    const one = terrainEdges(createGame(0)), r = plateauRect('southwest');
    expect(one.layers.sand.some(poly => poly.length === 26 && poly.some(p => p.x < r.left - 20 && p.y > r.bottom + 20))).toBe(true);
    for (const ids of [['southwest', 'west', 'south'], PARCEL_IDS.filter(id => id !== 'center')] as ParcelId[][]) {
      const s = terrainEdges({acquiredParcels: ids}), r = plateauRect('center'), middle = {x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2};
      expect(shapes(s).some(poly => contains(poly, middle))).toBe(false);
    }
  });
  it('avoids overlapping water collars at all 15 non-empty 2×2 contacts, including diagonal islands', () => {
    const ids: ParcelId[] = ['northwest', 'north', 'west', 'center'], r = plateauRect('center');
    for (let mask = 1; mask < 16; mask++) {
      const s = terrainEdges({acquiredParcels: ids.filter((_, i) => mask & (1 << i))}); let covering = 0;
      for (let y = -128.3; y < 128; y += 5) for (let x = -80.7; x < 80; x += 5) {
        const p = {x: r.left + x, y: r.top + y}; covering = Math.max(covering, s.layers.water.filter(poly => contains(poly, p)).length);
      }
      expect(covering, 'duplicate collar at contact mask ' + mask).toBeLessThanOrEqual(1);
    }
  });
  it('sizes interior textures to the plateau (no transparent shore margins) while the vector visual bounds grow deliberately', () => {
    expect(VISUAL.projection).toEqual({theta: 4, q: .84});
    expect(VISUAL.ground.margin).toEqual({left: 5, right: 5, top: 5, bottom: 5});
    expect(VISUAL.ground.visualMargin).toEqual({left: 80, right: 16, top: 16, bottom: 128});
    expect(VISUAL.ground.maxResolution).toBe(1.8);
    const m = VISUAL.ground.margin, resolution = VISUAL.ground.maxResolution;
    const bytes = 9 * Math.ceil((704 + m.left + m.right) * resolution) * Math.ceil((592 + m.top + m.bottom) * resolution) * 4;
    expect(bytes / 1024 ** 2).toBeCloseTo(47.86002, 4);
  });
  it.each(fixtures)('%s: pan regions cover every projected visual surface', (_name, ids) => {
    const regions = ownedRegions(ids); for (const p of shapes(terrainEdges({acquiredParcels: ids})).flat()) expect(regions.some(r => inside(toScreen(p), r))).toBe(true);
  });
  it('Recentrer uses the extended front/left bounds without changing camera rules', () => {
    const state = createGame(0), f = islandFrame(state)!, r = plateauRect('southwest');
    for (const p of [{x: r.left - 80, y: r.bottom + 128}, {x: r.right, y: r.bottom + 128}]) expect(inside(toScreen(p), f.island)).toBe(true);
  });
  it('draws only rectangular core grass, with sparse clipped world-space patches and no repeated path', () => {
    const rects: number[][] = [], patches: EdgePolygon[] = [];
    const g = {fillStyle() {}, lineStyle() {}, lineBetween() {}, fillRect(...args: number[]) {rects.push(args);}, fillPoints(p: EdgePolygon) {patches.push(p);}};
    const r = plateauRect('southwest'); drawParcelTerrain(g as unknown as Phaser.GameObjects.Graphics, 'southwest');
    expect(rects).toEqual([[r.left, r.top, 704, 592]]); expect(patches.length).toBeGreaterThan(3); expect(patches.length).toBeLessThan(40);
    expect(patches.flat().every(p => inside(p, r))).toBe(true);
  });
  it('never draws a parcel texture outside its plateau plus the texture margin, for every parcel', () => {
    const m = VISUAL.ground.margin;
    for (const id of PARCEL_IDS) {
      const r = plateauRect(id), room = {left: r.left - m.left, right: r.right + m.right, top: r.top - m.top, bottom: r.bottom + m.bottom};
      let width = 0; const outside: string[] = [];
      const fits = (p: EdgePoint, pad = 0) => p.x - pad >= room.left && p.x + pad <= room.right && p.y - pad >= room.top && p.y + pad <= room.bottom;
      const g = {fillStyle() {}, lineStyle(w: number) {width = w;},
        lineBetween(x1: number, y1: number, x2: number, y2: number) {if (![{x: x1, y: y1}, {x: x2, y: y2}].every(p => fits(p, width / 2))) outside.push('stroke');},
        fillRect(x: number, y: number, w: number, h: number) {if (!fits({x, y}) || !fits({x: x + w, y: y + h})) outside.push('rect');},
        fillPoints(poly: EdgePolygon) {if (!poly.every(p => fits(p))) outside.push('patch');}};
      drawParcelTerrain(g as unknown as Phaser.GameObjects.Graphics, id);
      expect(outside, 'parcel texture clips at ' + id).toEqual([]);
    }
  });
});
