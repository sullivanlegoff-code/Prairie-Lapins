import {describe, it, expect} from 'vitest';
import {createGame} from '../src/simulation';
import {PARCEL_IDS, type ParcelId} from '../src/config/land';
import {ISLAND} from '../src/config/islandGeometry';
import {plateauRect, type EdgePoint} from '../src/display/terrainEdges';
import {floatingIslandArt} from '../src/display/floatingIslandArt';
import {islandOutline} from '../src/display/islandOutline';
import {ownedRegions, islandFrame} from '../src/display/recenter';
import {toScreen} from '../src/ui/projection';

type Rect = {left: number; top: number; right: number; bottom: number};
const inside = (p: EdgePoint, r: Rect) => p.x >= r.left - 1e-6 && p.x <= r.right + 1e-6 && p.y >= r.top - 1e-6 && p.y <= r.bottom + 1e-6;
const fixtures: [string, ParcelId[]][] = [
  ['southwest', ['southwest']], ['two north', ['southwest', 'west']], ['two east', ['southwest', 'south']],
  ['L', ['southwest', 'west', 'south']], ['2×2', ['southwest', 'west', 'south', 'center']], ['3×3', [...PARCEL_IDS]],
  ['legacy centre', ['center']], ['legacy detached', ['southwest', 'northeast']], ['legacy diagonal', ['southwest', 'center']],
  ['internal hole', PARCEL_IDS.filter(id => id !== 'center')],
];

describe('parcel tops and floating island bounds', () => {
  it('joins adjacent parcel tops exactly, without gaps, overlap or internal outline edges', () => {
    for (const a of PARCEL_IDS.map(plateauRect)) for (const b of PARCEL_IDS.map(plateauRect)) {
      const horizontal = a.right === b.left && a.top === b.top;
      const vertical = a.bottom === b.top && a.left === b.left;
      if (!horizontal && !vertical) continue;
      expect(horizontal ? [a.top, a.bottom] : [a.left, a.right]).toEqual(horizontal ? [b.top, b.bottom] : [b.left, b.right]);
      const edges = islandOutline([a.id, b.id])[0].loops[0].edges;
      expect(edges).toHaveLength(4);
      expect(edges.some(e => horizontal ? e.a.x === a.right && e.b.x === a.right : e.a.y === a.bottom && e.b.y === a.bottom)).toBe(false);
    }
    const edges = islandOutline(PARCEL_IDS)[0].loops[0].edges;
    expect(edges).toHaveLength(4);
    expect(edges.filter(e => e.b.x < e.a.x).map(e => e.a.x - e.b.x)).toEqual([ISLAND.mapWidth]);
  });
  it.each(fixtures)('%s: pan regions cover the current floating island drawing', (_name, ids) => {
    const regions = ownedRegions(ids);
    for (const paint of floatingIslandArt(ids).paint) {
      const points = paint.kind === 'ellipse' ? [{x: paint.x, y: paint.y}] : paint.points;
      for (const p of points) expect(regions.some(r => inside(p, r))).toBe(true);
    }
    for (const r of ids.map(plateauRect)) {
      expect((r.right - r.left) * (r.bottom - r.top)).toBe(704 * 592);
    }
  });
  it('Recentrer uses the extended front/left bounds without changing camera rules', () => {
    const state = createGame(0), f = islandFrame(state)!, r = plateauRect('southwest');
    for (const p of [{x: r.left - 80, y: r.bottom + 128}, {x: r.right, y: r.bottom + 128}]) expect(inside(toScreen(p), f.island)).toBe(true);
  });
});
