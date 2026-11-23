/**
 * The grass of a parcel (plan 5.1, 23 November 2026). A Phaser tile sprite keeps a canvas of its own width × height in texture
 * pixels and sends it to the graphics card, though WebGL never draws it. Drawn as `width / scale` pixels shrunk by `scale`, each
 * parcel held an empty 2048 × 1722 picture (14 MB, 127 MB for the nine parcels). The parcel is now the tile sprite's own size,
 * and the grass is shrunk by its tile scale instead: the same repeat and the same offset, so the same pixels on screen.
 */
export interface GrassTileLayout {
  /** Size of the tile sprite (world units, drawn at scale 1). */
  width: number; height: number;
  /** World units of one texture pixel. */
  tileScale: number;
  /** Offset of the pattern (texture pixels): anchored on the world origin, so neighbouring parcels join without a seam. */
  tileX: number; tileY: number;
}
export function grassTileLayout(x: number, y: number, width: number, depth: number, grass: {size: number; worldUnits: number}): GrassTileLayout {
  const scale = grass.worldUnits / grass.size;
  return {width, height: depth, tileScale: scale, tileX: x / scale, tileY: y / scale};
}
