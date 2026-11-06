import {FINE_GRID} from '../config/decorations';
import {type FormerFootprintEra} from '../config/habitatSizes';
import {ISLAND} from '../config/islandGeometry';
import type {GameState} from '../state/types';
import {buildingFootprint, footprintPlacementReason} from './placement';

/**
 * Farthest an enclosure slides, in fine cells along each axis, to find room for a larger footprint: one former building
 * cell. Beyond that it keeps the size it has, where it stands, rather than jumping across the island.
 */
export const ENCLOSURE_GROWTH_REACH = 4;
const CELL = {x: ISLAND.cellWidth / FINE_GRID, y: ISLAND.cellDepth / FINE_GRID};
/** The sizes an enclosure of a former era may grow to, largest first: the current one (no mark), then the 3 November one. */
const TARGETS: readonly (FormerFootprintEra | undefined)[] = [undefined, 2];

/**
 * Gives every enclosure that still keeps the size of a former era (`formerFootprint`) the largest size that fits, among the
 * current one and the later former ones, where there is room. Run on every loaded save, after validation, so it can never make a
 * save refused:
 * - the current size is tried first for every such enclosure, then (for one of era 1 that could not get it) the size of era 2;
 * - the larger rectangle keeps the top-left cell whenever it has room there (it grows to the right and downwards, like an
 *   upgrade, so a save keeps its layout); otherwise it slides to the free place nearest to the centre of the footprint it has, at
 *   most `ENCLOSURE_GROWTH_REACH` fine cells away (a first pass only allows one cell, so that each enclosure first tries to grow
 *   where it stands before a neighbour slides into its room);
 * - the place must be owned land, free of every other building, of every decoration set outside and of debris (each one checked
 *   against the others' current footprints, so the island stays without overlap after every step);
 * - nothing else is moved, put away or removed; an enclosure without such a place simply keeps its size, and tries again at the
 *   next load. Residents belong to their enclosure by identity, so they follow it.
 * Deterministic: same save, same result. Returns the identities of the enclosures that grew (once each, in order of growth).
 */
export function growFormerEnclosures(s: Pick<GameState, 'buildings' | 'decorations' | 'acquiredParcels'> & Partial<Pick<GameState, 'debris'>>): string[] {
  const grown: string[] = [];
  for (const era of TARGETS) for (const reach of [1, ENCLOSURE_GROWTH_REACH]) for (const b of s.buildings) {
    // Only an enclosure of an older era than the target grows to it.
    if (b.kind !== 'enclosure' || !b.formerFootprint || (era !== undefined && b.formerFootprint >= era)) continue;
    const current = buildingFootprint(b), target = buildingFootprint({kind: b.kind, x: b.x, y: b.y, footprintTier: b.footprintTier, formerFootprint: era});
    const ax = current.x + (current.width - target.width) / 2, ay = current.y + (current.height - target.height) / 2;
    // First its own top-left cell: the enclosure then grows to the right and downwards, like an upgrade; then the nearest places
    // around the centre of the footprint it has.
    const candidates: {x: number; y: number; distance: number}[] = [];
    for (let y = Math.ceil(ay - reach); y <= Math.floor(ay + reach); y++) for (let x = Math.ceil(ax - reach); x <= Math.floor(ax + reach); x++)
      if (x >= 0 && y >= 0 && (x !== b.x || y !== b.y)) candidates.push({x, y, distance: Math.hypot((x - ax) * CELL.x, (y - ay) * CELL.y)});
    candidates.sort((p, q) => p.distance - q.distance || p.y - q.y || p.x - q.x);
    candidates.unshift({x: b.x, y: b.y, distance: 0});
    const free = candidates.find(p => !footprintPlacementReason(s, {x: p.x, y: p.y, width: target.width, height: target.height}, {buildingId: b.id}));
    if (!free) continue;
    b.x = free.x; b.y = free.y;
    if (era === undefined) delete b.formerFootprint; else b.formerFootprint = era;
    if (!grown.includes(b.id)) grown.push(b.id);
  }
  return grown;
}
