import {describe, expect, it} from 'vitest';
import {PARCEL_IDS, type ParcelId} from '../src/config/land';
import {VISUAL} from '../src/config/visual';
import {fillCoastPixels, plateauRect, rasterScale, sampleCoast, terrainEdges} from '../src/display/coastRaster';
import {renderCoast} from '../src/display/coastRasterJob';

type Rect = {left: number; right: number; top: number; bottom: number};
function subtract(a: Rect, b: Rect): Rect[] {
  const x0 = Math.max(a.left, b.left), x1 = Math.min(a.right, b.right), y0 = Math.max(a.top, b.top), y1 = Math.min(a.bottom, b.bottom);
  if (x1 <= x0 || y1 <= y0) return [a];
  return [{left: a.left, right: x0, top: a.top, bottom: a.bottom}, {left: x1, right: a.right, top: a.top, bottom: a.bottom},
    {left: x0, right: x1, top: a.top, bottom: y0}, {left: x0, right: x1, top: y1, bottom: a.bottom}]
    .filter(r => r.right > r.left && r.bottom > r.top);
}
const digest = async (buffers: ArrayBuffer[]) => {
  const bytes = new Uint8Array(buffers.reduce((n, b) => n + b.byteLength, 0)); let offset = 0;
  for (const b of buffers) { bytes.set(new Uint8Array(b), offset); offset += b.byteLength; }
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
};

describe('approved raster coast geometry and pixels', () => {
  it('validates all 511 sets: owned-area exclusion, disjoint tiles, margins, exposed edges, props and order independence', () => {
    expect(rasterScale).toBe(1.5);
    expect(VISUAL.ground.visualMargin).toEqual({left: 80, right: 16, top: 16, bottom: 128});
    const concaveConfigurations = new Set<string>(); let edgeChecks = 0, bayOccurrences = 0;
    for (let mask = 1; mask < 512; mask++) {
      const ids = PARCEL_IDS.filter((_, i) => mask & (1 << i)), e = terrainEdges({acquiredParcels: ids}), model = e.rasterModel;
      expect(terrainEdges({acquiredParcels: [...ids].reverse()})).toEqual(e);
      const rooms = e.rects.map(r => ({left: r.left - 80, right: r.right + 16, top: r.top - 16, bottom: r.bottom + 128}));
      for (const [index, tile] of model.tiles.entries()) {
        let remainder = [tile]; for (const room of rooms) remainder = remainder.flatMap(r => subtract(r, room));
        expect(remainder, `margin leak ${mask}`).toEqual([]);
        for (const r of [...e.rects, ...model.tiles.slice(0, index)])
          expect(Math.min(tile.right, r.right) <= Math.max(tile.left, r.left) || Math.min(tile.bottom, r.bottom) <= Math.max(tile.top, r.top)).toBe(true);
      }
      for (const r of e.rects) {
        for (const x of [r.left + .01, (r.left + r.right) / 2, r.right - .01])
          for (const y of [r.top + .01, (r.top + r.bottom) / 2, r.bottom - .01]) expect(sampleCoast(model, x, y)[3]).toBe(0);
        for (const side of ['top', 'right', 'bottom', 'left'] as const) {
          const h = side === 'top' || side === 'bottom', line = side === 'top' ? r.top : side === 'bottom' ? r.bottom : side === 'left' ? r.left : r.right;
          const lo = h ? r.left : r.top, hi = h ? r.right : r.bottom;
          const x = h ? (lo + hi) / 2 : line + (side === 'left' ? -.1 : .1), y = h ? line + (side === 'top' ? -.1 : .1) : (lo + hi) / 2;
          const internal = e.rects.some(k => x > k.left && x < k.right && y > k.top && y < k.bottom);
          const coverage = e.runs.filter(k => k.side === side && (h ? k.a.y : k.a.x) === line).reduce((sum, k) =>
            sum + Math.max(0, Math.min(hi, Math.max(h ? k.a.x : k.a.y, h ? k.b.x : k.b.y)) - Math.max(lo, Math.min(h ? k.a.x : k.a.y, h ? k.b.x : k.b.y))), 0);
          expect(coverage).toBe(internal ? 0 : hi - lo); edgeChecks++;
        }
      }
      for (const accent of e.accents) {
        expect(accent.temporary).toBe(false); expect(['bottom', 'left']).toContain(accent.side);
        for (const paint of accent.paint) for (const p of paint.poly) expect(sampleCoast(model, p.x, p.y)[4]).toBeGreaterThan(.98);
      }
      for (const bay of model.bays) {
        const occupied = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) =>
          e.rects.some(r => bay.p.x + x > r.left && bay.p.x + x < r.right && bay.p.y + y > r.top && bay.p.y + y < r.bottom) ? 1 : 0).join('');
        concaveConfigurations.add([bay.p.x, bay.p.y, bay.u.x, bay.u.y, bay.v.x, bay.v.y, occupied].join(':')); bayOccurrences++;
        for (let a = 0; a < bay.spanA; a += 12) for (let c = 0; c < bay.spanC; c += 12)
          expect(sampleCoast(model, bay.p.x + a * bay.u.x + c * bay.v.x, bay.p.y + a * bay.u.y + c * bay.v.y).every(Number.isFinite)).toBe(true);
      }
    }
    expect(edgeChecks).toBe(9216); expect(bayOccurrences).toBe(1024); expect(concaveConfigurations.size).toBe(32);
  }, 120000);

  // Frozen raw-RGBA SHA-256 values generated from the approved E2 prototype, not the production implementation.
  it.each([
    ['fresh', ['southwest'], 'e98b72dc3692c25c4f5075f65816b0d556dff2d1d97f7289a5e50337f2f43ad2'],
    ['L', ['southwest', 'west', 'south'], '5df0ee993dfa45c35e0017c5888a946a6b923403b67906ceff57c6ecead84127'],
    ['full', [...PARCEL_IDS], '5ca047806b4d603eddcc2381a60bdc07774fdad340ca106718054151040b4cb3'],
  ] as [string, ParcelId[], string][])('%s: preserves every approved E2 RGBA pixel', async (_name, ids, expected) => {
    const result = renderCoast({type: 'generate', id: 7, ids});
    expect(await digest(result.tiles.map(t => t.buffer))).toBe(expected);
    expect(result.stats.rgbaBytes).toBe(result.tiles.reduce((n, t) => n + t.width * t.height * 4, 0));
    expect(result.data).not.toHaveProperty('rasterModel');
  }, 30000);

  it('keeps pixels deterministic after reordering purchases and removes newly internal raster coverage', async () => {
    const ids: ParcelId[] = ['southwest', 'west', 'south'];
    expect(await digest(renderCoast({type: 'generate', id: 1, ids}).tiles.map(t => t.buffer)))
      .toBe(await digest(renderCoast({type: 'generate', id: 2, ids: [...ids].reverse()}).tiles.map(t => t.buffer)));
    const after = terrainEdges({acquiredParcels: ['southwest', 'west']}), old = plateauRect('southwest');
    expect(after.runs.some(r => r.side === 'top' && r.a.y === old.top)).toBe(false);
    expect(sampleCoast(after.rasterModel, (old.left + old.right) / 2, old.top - 3)[3]).toBe(0);
    const tile = after.rasterModel.tiles[0];
    expect(() => fillCoastPixels(after.rasterModel, {...tile, right: tile.right + 1}, 1, 1, new Uint8ClampedArray(4))).toThrow('Uncertified raster tile');
  }, 30000);
});
