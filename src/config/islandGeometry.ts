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
  /** Cells per map side (full island). */
  readonly mapCells: number;
  /** Cells in one parcel, and in the full island. */
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
function islandGeometry(parcelCells: number): IslandGeometry {
  const parcelsPerSide = 3, cellWidth = 176, cellDepth = 148, mapCells = parcelCells * parcelsPerSide;
  return Object.freeze({
    parcelCells, parcelsPerSide, mapCells, parcelArea: parcelCells ** 2, maxArea: mapCells ** 2,
    parcelFine: parcelCells * FINE_GRID, mapFine: mapCells * FINE_GRID,
    cellWidth, cellDepth, originX: 120, originY: 120,
    parcelWidth: parcelCells * cellWidth, parcelDepth: parcelCells * cellDepth, mapWidth: mapCells * cellWidth, mapDepth: mapCells * cellDepth,
    focus: mapCells / 2, grassTuftsPerCell: 95 / 9,
  });
}
/** Current island: 4 × 4-cell parcels, 12 × 12 cells at most (docs/island-size-plan.md). */
export const ISLAND = islandGeometry(4);
/**
 * Frozen 3 × 3-cell geometry of saves v1 to v10. Used ONLY to read and validate those
 * saves (and their legacy conversions) before the single migration to v11.
 */
export const LEGACY_ISLAND = islandGeometry(3);
/** Top-left cell of a parcel from its column/row in the parcel grid. */
export const parcelOrigin = (column: number, row: number, geometry: IslandGeometry = ISLAND) =>
  ({x: column * geometry.parcelCells, y: row * geometry.parcelCells});
