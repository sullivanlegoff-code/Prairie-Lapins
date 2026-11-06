import {FINE_GRID} from '../config/decorations';
import {ISLAND} from '../config/islandGeometry';
import {PARCELS} from '../config/land';
import type {ParcelId} from '../config/land';
import type {Debris, DebrisKind, GameState} from '../state/types';

/**
 * Debris (owner, 5 November 2026): only a parcel bought from the Christmas update on comes with rocks, wild weeds and bushes on
 * it. Each one blocks its 2 × 2 fine cells until the player clears it for pattes; together they cost about half the parcel's
 * price, a rock dearer than a bush, a bush dearer than the weeds. Parcels owned before keep their land free.
 */
export const DEBRIS = {
  size: 2,
  perParcel: 6,
  /** The share of the parcel's price paid to clear all of its debris. */
  share: .5,
  kinds: ['rocher', 'buisson', 'herbes'] as const satisfies readonly DebrisKind[],
  /** Relative price of each kind (two of each per parcel: their mean is 1). */
  weight: {rocher: 1.3, buisson: 1, herbes: .7} satisfies Record<DebrisKind, number>,
} as const;
export const DEBRIS_NAMES: Record<DebrisKind, string> = {rocher: 'Rocher', buisson: 'Buisson sauvage', herbes: 'Mauvaises herbes'};

/** The debris of a parcel just bought for `price` pattes, spread without overlap by `rng`; `nextId` names them. */
export function parcelDebris(parcel: ParcelId, price: number, rng: () => number, nextId: () => string): Debris[] {
  const p = PARCELS[parcel], span = ISLAND.parcelCells * FINE_GRID, size = DEBRIS.size, out: Debris[] = [];
  const slots: {x: number; y: number}[] = [];
  // Whole 2 × 2 slots, one ring of cells away from the parcel's edges so the paths along them stay free.
  for (let y = 1; y + size <= span - 1; y += size) for (let x = 1; x + size <= span - 1; x += size) slots.push({x: p.x * FINE_GRID + x, y: p.y * FINE_GRID + y});
  for (let i = 0; i < DEBRIS.perParcel && slots.length; i++) {
    const at = slots.splice(Math.min(slots.length - 1, Math.floor(rng() * slots.length)), 1)[0];
    const kind = DEBRIS.kinds[i % DEBRIS.kinds.length];
    out.push({id: nextId(), kind, x: at.x, y: at.y, price: Math.max(1, Math.round(price * DEBRIS.share / DEBRIS.perParcel * DEBRIS.weight[kind]))});
  }
  return out;
}
export const debrisFootprint = (d: Pick<Debris, 'x' | 'y'>) => ({x: d.x, y: d.y, width: DEBRIS.size, height: DEBRIS.size});
export const debrisOf = (s: Partial<Pick<GameState, 'debris'>>): readonly Debris[] => s.debris ?? [];
