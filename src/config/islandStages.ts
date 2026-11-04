import type {ParcelId} from './land';
import STAGE_ART from './islandStageArt.json';
import WINTER_JSON from './islandStageArtWinter.json';
import {christmasActive} from './christmas';

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
export const GRASS_TILE = {texture: 'island-grass', url: base + STAGE_ART.grass.file, size: STAGE_ART.grass.size, worldUnits: STAGE_ART.grass.worldUnits};

/** The Christmas island (scripts/prepare-winter-island.mjs): the same geometry under the snow, a stage not painted yet stays normal. */
const winterBase = `${import.meta.env.BASE_URL}assets/noel/island/`;
export const WINTER_STAGE_ART_LIST: readonly StageArt[] = WINTER_JSON.stages.map(s => ({
  stage: s.stage, canvas: s.canvas,
  tiles: s.tiles.map(t => ({key: `island-stage-noel:${t.file}`, url: winterBase + t.file, x: t.x, y: t.y, width: t.width, height: t.height})),
}));
export const WINTER_GRASS_TILE = {texture: 'island-grass-noel', url: winterBase + WINTER_JSON.grass.file, size: WINTER_JSON.grass.size, worldUnits: WINTER_JSON.grass.worldUnits};
/** The painting of a stage shown now: the snowy one during Christmas when it exists. */
export const stageArt = (stage: number): StageArt =>
  (christmasActive() && WINTER_STAGE_ART_LIST.find(s => s.stage === stage)) || ISLAND_STAGE_ART[stage - 1];
/** The meadow tile shown now: snow during Christmas. */
/** The snowy meadow only around a stage whose snowy painting is shipped (the others keep their green lawn until painted). */
export const grassTile = (stage: number | null) => christmasActive() && stage !== null && WINTER_STAGE_ART_LIST.some(s => s.stage === stage) ? WINTER_GRASS_TILE : GRASS_TILE;
