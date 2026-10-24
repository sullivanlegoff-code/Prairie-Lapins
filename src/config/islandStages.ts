import type {ParcelId} from './land';
import STAGE_ART from './islandStageArt.json';

/**
 * Fixed growth of southwest-start islands: every player owns the same nine shapes, in this order, each drawn by one
 * painted illustration (assets-source/island/stages, derived by scripts/derive-island-stages.mjs).
 */
export const ISLAND_ORDER: readonly ParcelId[] = ['southwest', 'south', 'west', 'center', 'southeast', 'east', 'northwest', 'north', 'northeast'];

export interface StageTile {readonly key: string; readonly url: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number}
export interface StageArt {
  readonly stage: number;
  /** Screen-world rectangle covered by the illustration (after projection). */
  readonly canvas: {readonly left: number; readonly top: number; readonly width: number; readonly height: number};
  readonly tiles: readonly StageTile[];
}

/** Stage number (1 to 9) when the owned parcels are exactly the first parcels of ISLAND_ORDER, otherwise null. */
export function islandStage(ids: readonly ParcelId[]): number | null {
  const owned = new Set(ids);
  if (owned.size === 0 || owned.size !== ids.length) return null;
  return ISLAND_ORDER.slice(0, owned.size).every(id => owned.has(id)) ? owned.size : null;
}

const base = `${import.meta.env.BASE_URL}assets/island/stages/`;
export const STAGE_PX_PER_UNIT = STAGE_ART.pxPerUnit;
export const ISLAND_STAGE_ART: readonly StageArt[] = STAGE_ART.stages.map(s => ({
  stage: s.stage, canvas: s.canvas,
  tiles: s.tiles.map(t => ({key: `island-stage:${t.file}`, url: base + t.file, x: t.x, y: t.y, width: t.width, height: t.height})),
}));
export const stageArt = (stage: number): StageArt => ISLAND_STAGE_ART[stage - 1];
export const GRASS_TILE = {texture: 'island-grass', url: base + STAGE_ART.grass.file, size: STAGE_ART.grass.size, worldUnits: STAGE_ART.grass.worldUnits};
