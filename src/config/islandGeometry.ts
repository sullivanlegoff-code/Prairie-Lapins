import {FINE_GRID} from './decorations';
/**
 * Single source of the island's dimensions. Logical cells are the 4 × 4 building
 * cells; each is drawn as cellWidth × cellDepth world units (regular aerial projection,
 * depth compressed 148/176). Every other size below is derived, never repeated.
 */
export interface IslandGeometry {
  /** Cells per parcel side (start island and each extension). */
  readonly parcelCells: number;
  /** Parcels per map side: the start parcel at the centre, eight extensions around it. */
  readonly parcelsPerSide: number;
  /** Cells per side of the first 3 × 3 island (12): the projection pivots on its centre, which never moves. */
  readonly mapCells: number;
  /**
   * The whole land grid in cells (owner, 24 November 2026: the island grows to 18 squares, two columns to the east and a row
   * to the north). The north row lies above row 0: its cells have negative y, so every place of the first island keeps its
   * coordinates. [left, right) × [top, bottom).
   */
  readonly bounds: {readonly left: number; readonly top: number; readonly right: number; readonly bottom: number};
  /** The same rectangle in fine placement cells. */
  readonly fineBounds: {readonly left: number; readonly top: number; readonly right: number; readonly bottom: number};
  /** Cells in one parcel, and in the full island (all its parcels). */
  readonly parcelArea: number;
  readonly maxArea: number;
  /** Fine placement cells per parcel side and per map side. */
  readonly parcelFine: number;
  readonly mapFine: number;
  /** World units: one cell, one parcel, the full island, and the projection origin. */
  readonly cellWidth: number; readonly cellDepth: number; readonly originX: number; readonly originY: number;
  readonly parcelWidth: number; readonly parcelDepth: number; readonly mapWidth: number; readonly mapDepth: number;
  /** Recenter target and initial camera focus, in cells: the centre of the start parcel. */
  readonly focus: number;
  /** Grass tufts drawn per cell of parcel terrain (95 per former 3 × 3 parcel). */
  readonly grassTuftsPerCell: number;
}
function islandGeometry(parcelCells: number, grown: boolean): IslandGeometry {
  const parcelsPerSide = 3, cellWidth = 176, cellDepth = 148, mapCells = parcelCells * parcelsPerSide;
  // Grown island: parcel columns 0 to 4 and rows -1 to 2 (18 parcels: the 5 × 4 rectangle without its two north-east corners).
  const bounds = Object.freeze(grown ? {left: 0, top: -parcelCells, right: 5 * parcelCells, bottom: mapCells} : {left: 0, top: 0, right: mapCells, bottom: mapCells});
  const fineBounds = Object.freeze({left: bounds.left * FINE_GRID, top: bounds.top * FINE_GRID, right: bounds.right * FINE_GRID, bottom: bounds.bottom * FINE_GRID});
  return Object.freeze({
    parcelCells, parcelsPerSide, mapCells, bounds, fineBounds, parcelArea: parcelCells ** 2, maxArea: (grown ? 18 : 9) * parcelCells ** 2,
    parcelFine: parcelCells * FINE_GRID, mapFine: mapCells * FINE_GRID,
    cellWidth, cellDepth, originX: 120, originY: 120,
    parcelWidth: parcelCells * cellWidth, parcelDepth: parcelCells * cellDepth, mapWidth: mapCells * cellWidth, mapDepth: mapCells * cellDepth,
    focus: mapCells / 2, grassTuftsPerCell: 95 / 9,
  });
}
/** Current island: 4 × 4-cell parcels, 18 of them since 24 November 2026 (docs/island-size-plan.md, docs/island-stages.md). */
export const ISLAND = islandGeometry(4, true);
/**
 * Frozen 3 × 3-cell geometry of saves v1 to v10. Used ONLY to read and validate those
 * saves (and their legacy conversions) before the single migration to v11.
 */
export const LEGACY_ISLAND = islandGeometry(3, false);
/** Top-left cell of a parcel from its column/row in the parcel grid. */
export const parcelOrigin = (column: number, row: number, geometry: IslandGeometry = ISLAND) =>
  ({x: column * geometry.parcelCells, y: row * geometry.parcelCells});
