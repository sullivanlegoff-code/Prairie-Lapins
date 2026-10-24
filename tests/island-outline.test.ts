import {describe, expect, it} from 'vitest';
import {PARCEL_IDS, PARCELS, type ParcelId} from '../src/config/land';
import {ISLAND} from '../src/config/islandGeometry';
import {islandOutline, organicLoop, signedArea, type OutlinePoint} from '../src/display/islandOutline';

export const parcelSamples = Array.from({length: 512}, (_, bits) => PARCEL_IDS.filter((_, i) => bits & (1 << i)));
const owns = (ids: readonly ParcelId[], p: OutlinePoint) => ids.some(id => {
  const q = PARCELS[id], x = ISLAND.originX + q.x * ISLAND.cellWidth, y = ISLAND.originY + q.y * ISLAND.cellDepth;
  return p.x > x && p.x < x + ISLAND.parcelWidth && p.y > y && p.y < y + ISLAND.parcelDepth;
});

describe('oriented union of parcel plateaux', () => {
  it('merges a rectangle and never retains its internal shared edges', () => {
    expect(islandOutline(['southwest'])[0].loops[0].edges).toHaveLength(4);
    expect(islandOutline(['southwest', 'south'])[0].loops[0].edges).toHaveLength(4);
    expect(islandOutline(PARCEL_IDS)[0].loops[0].edges).toHaveLength(4);
  });
  it('represents an L with three squares and six exposed runs', () => {
    const c = islandOutline(['southwest', 'south', 'west']);
    expect(c).toHaveLength(1); expect(c[0].loops).toHaveLength(1); expect(c[0].loops[0].edges).toHaveLength(6);
  });
  it('retains a hole with reversed winding', () => {
    const c = islandOutline(PARCEL_IDS.filter(id => id !== 'center'));
    expect(c).toHaveLength(1); expect(c[0].loops).toHaveLength(2);
    expect(c[0].loops.map(l => l.hole).sort()).toEqual([false, true]);
    expect(c[0].loops.find(l => l.hole)!.edges).toHaveLength(4);
  });
  it('keeps detached and corner-touching parcels in separate components', () => {
    expect(islandOutline(['southwest', 'northeast'])).toHaveLength(2);
    expect(islandOutline(['southwest', 'center'])).toHaveLength(2);
  });
  it('conserves area, winding, exposed perimeter and canonical order for ALL 512 subsets', () => {
    for (const ids of parcelSamples) {
      const result = islandOutline(ids);
      expect(result).toEqual(islandOutline([...ids].reverse().concat(ids)));
      expect(result.flatMap(c => c.ids).sort()).toEqual([...ids].sort());
      expect(result.flatMap(c => c.loops).reduce((s, l) => s + signedArea(l.points), 0)).toBeCloseTo(ids.length * ISLAND.parcelWidth * ISLAND.parcelDepth, 5);
      let perimeter = 0;
      for (const c of result) for (const l of c.loops) for (const e of l.edges) {
        expect(e.a).not.toEqual(e.b);
        expect(e.a.x === e.b.x || e.a.y === e.b.y).toBe(true);
        const length = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y); perimeter += length;
        // Test each elementary parcel-length segment, away from vertices and internal seams.
        const unit = e.a.x === e.b.x ? ISLAND.parcelDepth : ISLAND.parcelWidth, count = Math.round(length / unit);
        for (let i = 0; i < count; i++) {
          const t = (i + .5) / count, p = {x: e.a.x + (e.b.x - e.a.x) * t, y: e.a.y + (e.b.y - e.a.y) * t};
          expect(owns(ids, {x: p.x - e.normal.x, y: p.y - e.normal.y})).toBe(true);
          expect(owns(ids, {x: p.x + e.normal.x, y: p.y + e.normal.y})).toBe(false);
        }
      }
      let expected = ids.length * (ISLAND.parcelWidth + ISLAND.parcelDepth) * 2;
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = PARCELS[ids[i]], b = PARCELS[ids[j]];
        if (a.x === b.x && Math.abs(a.y - b.y) === 4) expected -= ISLAND.parcelWidth * 2;
        if (a.y === b.y && Math.abs(a.x - b.x) === 4) expected -= ISLAND.parcelDepth * 2;
      }
      expect(perimeter).toBeCloseTo(expected, 5);
    }
  });
});


describe('organic presentation boundary', () => {
  it('rounds convex and concave vertices, retains winding and stays deterministic for every subset', () => {
    for (const ids of parcelSamples) for (const c of islandOutline(ids)) for (const loop of c.loops) {
      const points=organicLoop(loop);
      expect(points).toEqual(organicLoop(loop));
      expect(Math.sign(signedArea(points))).toBe(Math.sign(signedArea(loop.points)));
      expect(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).toBe(true);
      for(const corner of loop.points) expect(Math.min(...points.map(p=>Math.hypot(p.x-corner.x,p.y-corner.y)))).toBeGreaterThan(15);
      // Small waves and fillets cannot swallow a whole placement cell.
      expect(Math.abs(signedArea(points)-signedArea(loop.points))).toBeLessThan(loop.points.length*58*58);
    }
  });
});
