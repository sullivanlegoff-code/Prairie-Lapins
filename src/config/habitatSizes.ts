import {FINE_GRID} from './decorations';
import {ISLAND} from './islandGeometry';
import type {HabitatLevel} from './habitats';

/**
 * The three validated enclosure sizes, by footprint tier. A building's tier (`Building.footprintTier`, absent = 1) is the
 * footprint it has actually acquired and is distinct from its capacity level: saves written before the tiers existed keep
 * 4 × 4 at every level. This one table feeds the footprint (collisions, purchase, move, decorations, selection, ghost,
 * grid) and the drawing.
 *
 * Units: a fine cell is `cellWidth / FINE_GRID` × `cellDepth / FINE_GRID` world units (44 × 37). Slots and zones are
 * local to the enclosure centre, the unit of `rabbitOffset`. Rabbits keep their current size at every level.
 */
export type FootprintTier = HabitatLevel;
export interface HabitatSizeProposal {
  /** Footprint in fine cells (level 1 is the current 4 × 4: one grid cell). */
  footprint: {width: number; depth: number};
  /** World units added to each side of the current ground rectangle (160 × 103); all zero for level 1. */
  growth: {x: number; top: number; bottom: number};
  /** Residents' resting places, in the order they fill: a first few leave a balanced group. Level 1 keeps `VISUAL.rabbit`. */
  slots: readonly {x: number; y: number}[];
  /** Safe zone for wandering (hard limits) and how far each individual strays from its slot. */
  zone: {minX: number; maxX: number; minY: number; maxY: number};
  roamScale: number;
  /** Texture box (world units) around the centre that holds the drawing, and where the name label sits below the centre. */
  texture: {width: number; height: number}; labelOffset: number;
}
const CURRENT_GROUND = {width: 160, depth: 103};
export const HABITAT_SIZE_PROPOSAL: Record<HabitatLevel, HabitatSizeProposal> = {
  1: {footprint: {width: 4, depth: 4}, growth: {x: 0, top: 0, bottom: 0}, slots: [], zone: {minX: -56, maxX: 56, minY: -20, maxY: 38}, roamScale: 1,
    texture: {width: 256, height: 256}, labelOffset: 70},
  2: {footprint: {width: 6, depth: 5}, growth: {x: 44, top: 20, bottom: 18},
    slots: [{x: -84, y: -16}, {x: 0, y: -16}, {x: 84, y: -16}, {x: -42, y: 36}, {x: 42, y: 36}],
    zone: {minX: -104, maxX: 104, minY: -34, maxY: 58}, roamScale: 1, texture: {width: 300, height: 230}, labelOffset: 96},
  3: {footprint: {width: 8, depth: 6}, growth: {x: 88, top: 34, bottom: 30},
    slots: [{x: -126, y: -30}, {x: -42, y: -30}, {x: 42, y: -30}, {x: 126, y: -30}, {x: -84, y: 38}, {x: 0, y: 38}, {x: 84, y: 38}],
    zone: {minX: -148, maxX: 148, minY: -48, maxY: 66}, roamScale: 1, texture: {width: 380, height: 280}, labelOffset: 108},
};
/**
 * Resting places for `count` residents of an enlarged enclosure: the places nearest to its middle, so a few residents sit
 * together in the centre rather than in a far corner; with the full group, every place is used.
 */
export function habitatSlots(tier: HabitatLevel, count: number): readonly {x: number; y: number}[] {
  const {slots} = HABITAT_SIZE_PROPOSAL[tier], middle = 10;
  return [...slots].sort((a, b) => Math.hypot(a.x, a.y - middle) - Math.hypot(b.x, b.y - middle)).slice(0, Math.min(count, slots.length));
}
/** Footprint in fine cells of a tier; any value outside the three tiers reads as the compact 4 × 4. */
export const habitatFootprint = (tier: number | undefined): {width: number; depth: number} =>
  HABITAT_SIZE_PROPOSAL[tier === 2 || tier === 3 ? tier : 1].footprint;
/** Footprint of a level in world units, for comparison with the drawing and with the neighbouring grid. */
export const habitatProposalWorldSize = (level: HabitatLevel) => {
  const {footprint} = HABITAT_SIZE_PROPOSAL[level];
  return {width: footprint.width * ISLAND.cellWidth / FINE_GRID, depth: footprint.depth * ISLAND.cellDepth / FINE_GRID};
};
/** The ground rectangle the drawing produces at a level (world units, centred on x = 0). */
export const habitatProposalGround = (level: HabitatLevel) => {
  const {growth} = HABITAT_SIZE_PROPOSAL[level];
  return {width: CURRENT_GROUND.width + 2 * growth.x, depth: CURRENT_GROUND.depth + growth.top + growth.bottom};
};
