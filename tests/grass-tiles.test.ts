import {describe, expect, it} from 'vitest';
import {grassTileLayout} from '../src/display/grassTiles';
import {GRASS_TILE, WINTER_GRASS_TILE} from '../src/config/islandStages';
import {ISLAND} from '../src/config/islandGeometry';

/** What Phaser's WebGL tile sprite draws (TileSpriteWebGLRenderer): repeats across the sprite and the pattern's offset. */
const drawn = (t: {width: number; height: number; scale: number; tileScale: number; tileX: number; tileY: number}, size: number) => ({
  repeatsX: t.width / (size * t.tileScale), repeatsY: t.height / (size * t.tileScale),
  offsetX: (t.tileX % size) / size, offsetY: (t.tileY % size) / size,
  worldWidth: t.width * t.scale, worldHeight: t.height * t.scale,
  /** Pixels of the canvas Phaser keeps (and uploads) for the sprite. */
  canvas: Math.ceil(t.width) * Math.ceil(t.height),
});

describe('parcel grass without a large empty picture (plan 5.1)', () => {
  it('draws the same grass at the same place, with a canvas the parcel own size', () => {
    for (const grass of [GRASS_TILE, WINTER_GRASS_TILE]) for (const [x, y] of [[-1056, -888], [0, 0], [704, 592], [1408, -296]]) {
      const scale = grass.worldUnits / grass.size;
      // Before: the parcel drawn `1 / scale` times wider, shrunk by the sprite scale.
      const before = drawn({width: ISLAND.parcelWidth / scale, height: ISLAND.parcelDepth / scale, scale, tileScale: 1, tileX: x / scale, tileY: y / scale}, grass.size);
      const tile = grassTileLayout(x, y, ISLAND.parcelWidth, ISLAND.parcelDepth, grass);
      const after = drawn({...tile, scale: 1}, grass.size);
      for (const k of ['repeatsX', 'repeatsY', 'offsetX', 'offsetY', 'worldWidth', 'worldHeight'] as const) expect(after[k]).toBeCloseTo(before[k], 9);
      expect(after.canvas).toBeLessThan(before.canvas);
      expect(after.canvas).toBe(ISLAND.parcelWidth * ISLAND.parcelDepth);
    }
  });
});
