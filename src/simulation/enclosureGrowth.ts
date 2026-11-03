import {FINE_GRID} from '../config/decorations';
import {ISLAND} from '../config/islandGeometry';
import type {GameState} from '../state/types';
import {buildingFootprint, footprintPlacementReason} from './placement';

/**
 * Farthest an enclosure slides, in fine cells along each axis, to find room for its enlarged footprint: one former building
 * cell. Beyond that it keeps its former size, where it stands, rather than jumping across the island.
 */
export const ENCLOSURE_GROWTH_REACH = 4;
const CELL = {x: ISLAND.cellWidth / FINE_GRID, y: ISLAND.cellDepth / FINE_GRID};

/**
 * Gives the enlarged footprint of its tier to every enclosure that still keeps its former one (`formerFootprint`), where there is
 * room. Run on every loaded save, after validation, so it can never make a save refused:
 * - the enlarged rectangle is centred on the former one whenever possible (between two equally centred places, the one that keeps
 *   the top-left cell); otherwise it slides to the nearest free place, at most
 *   `ENCLOSURE_GROWTH_REACH` fine cells away (a first pass only allows one cell, so that each enclosure first tries to grow where
 *   it stands before a neighbour slides into its room);
 * - the place must be owned land, free of every other building and of every decoration set outside (each one checked against the
 *   others' current footprints, so the island stays without overlap after every step);
 * - nothing else is moved, put away or removed; an enclosure without such a place simply keeps its former size, and tries again
 *   at the next load. Residents belong to their enclosure by identity, so they follow it.
 * Deterministic: same save, same result. Returns the identities of the enclosures that grew.
 */
export function growFormerEnclosures(s: Pick<GameState, 'buildings' | 'decorations' | 'acquiredParcels'>): string[] {
  const grown: string[] = [];
  for (const reach of [1, ENCLOSURE_GROWTH_REACH]) for (const b of s.buildings) {
    if (b.kind !== 'enclosure' || !b.formerFootprint) continue;
    const former = buildingFootprint(b), target = buildingFootprint({kind: b.kind, x: b.x, y: b.y, footprintTier: b.footprintTier});
    const ax = former.x + (former.width - target.width) / 2, ay = former.y + (former.height - target.height) / 2;
    const candidates: {x: number; y: number; distance: number}[] = [];
    for (let y = Math.ceil(ay - reach); y <= Math.floor(ay + reach); y++) for (let x = Math.ceil(ax - reach); x <= Math.floor(ax + reach); x++)
      if (x >= 0 && y >= 0) candidates.push({x, y, distance: Math.hypot((x - ax) * CELL.x, (y - ay) * CELL.y)});
    // Between equally near places, keep the top-left cell: the enclosure then grows to the right and downwards, like an upgrade.
    const kept = (p: {x: number; y: number}) => p.x === b.x && p.y === b.y ? 0 : 1;
    candidates.sort((p, q) => p.distance - q.distance || kept(p) - kept(q) || p.y - q.y || p.x - q.x);
    const free = candidates.find(p => !footprintPlacementReason(s, {x: p.x, y: p.y, width: target.width, height: target.height}, {buildingId: b.id}));
    if (!free) continue;
    b.x = free.x; b.y = free.y; delete b.formerFootprint; grown.push(b.id);
  }
  return grown;
}
