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
const tierOf = (tier: number | undefined): HabitatLevel => tier === 2 || tier === 3 ? tier : 1;
/**
 * Enclosure sizes, by era (an era is one of the successive sizes the game has given its enclosures, oldest first):
 * - era 1, the sizes before 3 November 2026: 4 × 4, 6 × 5, 8 × 6 (`HABITAT_SIZE_PROPOSAL[tier].footprint`), drawn at × 1;
 * - era 2, the first enlargement (3 November 2026, the owner: « Les enclos doivent être plus grands »): 5 × 4, 8 × 5, 10 × 6,
 *   drawn at × 1.15, × 1.15 and × 1.12;
 * - era 3, the current one (6 November 2026, the owner: « Je veux que les enclos soient encore plus grand (niveau 1, 2 et 3
 *   agrandis) »): 6 × 5, 10 × 6, 12 × 7 fine cells (+50 %, +50 % and +40 % of ground over era 2), drawn at × 1.38, × 1.4 and
 *   × 1.3 (+44 %, +48 % and +35 % of drawn area over era 2).
 * At every era the approved paintings, their rabbit places and wandering zones are shown `ENCLOSURE_SCALE` times larger, the same
 * factor on both axes (never stretched, never redrawn): just below the largest factor whose painting still ends, at the front and
 * on both sides, inside the footprint, for every habitat type (× 1.398, × 1.428 and × 1.318 at era 3: level 1 is held by the
 * width of the Feu painting, levels 2 and 3 by the front of the Neige and Universel ones). A level 3 (12 × 7) still leaves four
 * free columns and nine free rows of its 16 × 16 parcel; a new island's Paille enclosure (6 × 5 at 6, 40) stays clear of the nest
 * and the nursery. Rabbits keep their size, so each one has more room.
 *
 * An enclosure saved with an older era's size keeps it (`Building.formerFootprint`: the era it keeps) until it can grow at load
 * (`growFormerEnclosures`) or is upgraded (always to the current size of its next tier).
 */
export type FormerFootprintEra = 1 | 2;
export const ENCLOSURE_FOOTPRINTS: Readonly<Record<HabitatLevel, {width: number; depth: number}>> = {1: {width: 6, depth: 5}, 2: {width: 10, depth: 6}, 3: {width: 12, depth: 7}};
export const ENCLOSURE_SCALE: Readonly<Record<HabitatLevel, number>> = {1: 1.38, 2: 1.4, 3: 1.3};
/** The sizes of the former eras and the factor their drawings had. */
export const FORMER_ENCLOSURE_FOOTPRINTS: Readonly<Record<FormerFootprintEra, Readonly<Record<HabitatLevel, {width: number; depth: number}>>>> = {
  1: {1: HABITAT_SIZE_PROPOSAL[1].footprint, 2: HABITAT_SIZE_PROPOSAL[2].footprint, 3: HABITAT_SIZE_PROPOSAL[3].footprint},
  2: {1: {width: 5, depth: 4}, 2: {width: 8, depth: 5}, 3: {width: 10, depth: 6}},
};
export const FORMER_ENCLOSURE_SCALE: Readonly<Record<FormerFootprintEra, Readonly<Record<HabitatLevel, number>>>> = {1: {1: 1, 2: 1, 3: 1}, 2: {1: 1.15, 2: 1.15, 3: 1.12}};
/** The era of the current sizes (no `formerFootprint`), written in every save since 6 November 2026 (`enclosureSizes`). */
export const ENCLOSURE_SIZE_ERA = 3;
const eraOf = (former: number | undefined): FormerFootprintEra | null => former === 1 || former === 2 ? former : null;
/** Footprint of every other building kind. */
export const COMPACT_FOOTPRINT = {width: 4, depth: 4} as const;
/**
 * Footprint in fine cells of an enclosure tier (any value outside the three tiers reads as tier 1): the current size, or the
 * size of the former era an enclosure still keeps.
 */
export const habitatFootprint = (tier: number | undefined, former?: number): {width: number; depth: number} => {
  const era = eraOf(former);
  return era ? FORMER_ENCLOSURE_FOOTPRINTS[era][tierOf(tier)] : ENCLOSURE_FOOTPRINTS[tierOf(tier)];
};
/**
 * The Salon de soins turned into a spa with three care corners (owner, 10 November 2026: « il doit être plus grand »). A salon
 * built before keeps the compact size (`formerFootprint: 1`) until it has room to grow at load (`growFormerEnclosures`).
 */
export const SALON_FOOTPRINT = {width: 6, depth: 6} as const;
/** Footprint of any building: enclosures by tier (and former era), the salon 6 × 6 (or its former 4 × 4), everything else 4 × 4. */
export const buildingSize = (b: {kind: string; footprintTier?: number; formerFootprint?: number}): {width: number; depth: number} =>
  b.kind === 'enclosure' ? habitatFootprint(b.footprintTier, b.formerFootprint) : b.kind === 'salon' ? (b.formerFootprint ? COMPACT_FOOTPRINT : SALON_FOOTPRINT) : COMPACT_FOOTPRINT;
/** Drawing factor of the salon: its spa painting is made for the 6 × 6 footprint, shrunk on a salon that keeps the former size. */
export const salonScale = (b: {formerFootprint?: number}): number => b.formerFootprint ? COMPACT_FOOTPRINT.width / SALON_FOOTPRINT.width : 1;
/** Uniform factor applied to an enclosure's drawing and rabbit layout: the one of the era whose footprint it has. */
export const enclosureScale = (b: {footprintTier?: number; formerFootprint?: number}): number => {
  const era = eraOf(b.formerFootprint);
  return era ? FORMER_ENCLOSURE_SCALE[era][tierOf(b.footprintTier)] : ENCLOSURE_SCALE[tierOf(b.footprintTier)];
};
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
