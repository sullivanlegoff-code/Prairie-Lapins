import {emptyBuilding} from '../src/state/initial';
import {buildingPlacementReason} from '../src/simulation/placement';
import {ISLAND} from '../src/config/islandGeometry';
import type {GameState} from '../src/state/types';
/** Adds the Kitchen that `rewardCuisine` now requires, on the first free 4 × 4 footprint of the owned land. */
export function withKitchen<T extends Pick<GameState, 'buildings' | 'decorations' | 'acquiredParcels' | 'nextId'>>(s: T): T {
  for (let y = 0; y < ISLAND.mapFine; y++) for (let x = 0; x < ISLAND.mapFine; x++) {
    if (buildingPlacementReason(s, x, y)) continue;
    s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'kitchen', x, y)); return s;
  }
  throw Error('No free kitchen footprint in test fixture');
}
