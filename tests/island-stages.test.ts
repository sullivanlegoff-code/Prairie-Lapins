import {describe, expect, it} from 'vitest';
import {ISLAND_ORDER, ISLAND_STAGE_ART, STAGE_PX_PER_UNIT, islandStage, GRASS_TILE} from '../src/config/islandStages';
import {PARCELS, PARCEL_IDS, purchasableParcels, type ParcelId} from '../src/config/land';
import {ISLAND} from '../src/config/islandGeometry';
import {toScreen} from '../src/ui/projection';
import STAGE_ART from '../src/config/islandStageArt.json';


describe('fixed island growth', () => {
  it('orders all nine parcels once, starting south-west', () => {
    expect(new Set(ISLAND_ORDER)).toEqual(new Set(PARCEL_IDS));
    expect(ISLAND_ORDER).toHaveLength(9);
    expect(ISLAND_ORDER[0]).toBe('southwest');
  });
  it('offers exactly the next parcel of the order to south-west islands', () => {
    for (let n = 1; n < 9; n++) {
      const acquiredParcels = [...ISLAND_ORDER.slice(0, n)].reverse();
      expect(purchasableParcels({acquiredParcels, islandStart: 'southwest'})).toEqual([ISLAND_ORDER[n]]);
    }
    expect(purchasableParcels({acquiredParcels: [...ISLAND_ORDER], islandStart: 'southwest'})).toEqual([]);
  });
  it('keeps every next parcel adjacent to the owned land', () => {
    for (let n = 1; n < 9; n++) {
      const p = PARCELS[ISLAND_ORDER[n]];
      expect(ISLAND_ORDER.slice(0, n).some(id => Math.abs(PARCELS[id].x - p.x) + Math.abs(PARCELS[id].y - p.y) === ISLAND.parcelCells)).toBe(true);
    }
  });
  it('still lets an island grown out of order reach the next parcel of the order', () => {
    const diverged: ParcelId[] = ['southwest', 'west', 'northwest'];
    expect(purchasableParcels({acquiredParcels: diverged, islandStart: 'southwest'})).toEqual(['south']);
  });
  it('keeps the former rule for legacy centre-start islands', () => {
    expect(purchasableParcels({acquiredParcels: ['center']})).toHaveLength(8);
  });
  it('recognises the stages whatever the saved order, and nothing else', () => {
    for (let n = 1; n <= 9; n++) expect(islandStage([...ISLAND_ORDER.slice(0, n)].reverse())).toBe(n);
    expect(islandStage([])).toBeNull();
    expect(islandStage(['center'])).toBeNull();
    expect(islandStage(['southwest', 'west'])).toBeNull();
    expect(islandStage(['southwest', 'southwest'])).toBeNull();
  });
});

describe('painted stage manifest', () => {
  it('covers each stage with the projected parcels and the agreed margins', () => {
    for (const [i, art] of ISLAND_STAGE_ART.entries()) {
      const points = ISLAND_ORDER.slice(0, i + 1).flatMap(id => {
        const p = PARCELS[id], x = ISLAND.originX + p.x * ISLAND.cellWidth, y = ISLAND.originY + p.y * ISLAND.cellDepth;
        return [toScreen({x, y}), toScreen({x: x + ISLAND.parcelWidth, y: y + ISLAND.parcelDepth})];
      });
      const m = STAGE_ART.margin;
      expect(art.canvas.left).toBeCloseTo(Math.min(...points.map(p => p.x)) - m.left, 2);
      expect(art.canvas.top).toBeCloseTo(Math.min(...points.map(p => p.y)) - m.top, 2);
      expect(art.canvas.left + art.canvas.width).toBeCloseTo(Math.max(...points.map(p => p.x)) + m.right, 2);
      expect(art.canvas.top + art.canvas.height).toBeCloseTo(Math.max(...points.map(p => p.y)) + m.bottom, 2);
      expect(STAGE_ART.stages[i].parcels).toEqual(ISLAND_ORDER.slice(0, i + 1));
    }
  });
  it('keeps every tile inside its canvas and one resident stage below the mobile texture budget', () => {
    for (const art of ISLAND_STAGE_ART) {
      const [w, h] = STAGE_ART.stages[art.stage - 1].size;
      let gpu = 0;
      for (const tile of art.tiles) {
        expect(tile.x + tile.width).toBeLessThanOrEqual(w); expect(tile.y + tile.height).toBeLessThanOrEqual(h);
        expect(STAGE_ART.files).toHaveProperty([tile.url.split('/').pop()!]);
        gpu += tile.width * tile.height * 4;
      }
      // One resident stage; the former per-parcel grass textures took 47.86 MiB for the full island.
      expect(gpu).toBeLessThan(40 * 2 ** 20);
      expect(w / STAGE_PX_PER_UNIT).toBeCloseTo(art.canvas.width, 0);
    }
    expect(GRASS_TILE.url.endsWith(STAGE_ART.grass.file)).toBe(true);
  });
});
