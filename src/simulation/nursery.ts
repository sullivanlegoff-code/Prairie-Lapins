import {NURSERY, growthDuration} from '../config/balance';
import type {Building, GameState, NurseryBaby, NurseryCapacity, NurserySlot} from '../state/types';

/** Pure nursery readers: the only place that knows slot rules. Readiness stays derived: `readyAt <= now`. */
export const nurseryBuilding = (s: Pick<GameState, 'buildings'>): Building | undefined => s.buildings.find(b => b.kind === 'nursery');
/** Babies of one nursery in slot order; storage order is never relied upon. */
export const babiesBySlot = (b: Building | undefined): NurseryBaby[] => [...(b?.nursery?.babies ?? [])].sort((x, y) => x.slot - y.slot);
/** The baby in the lowest occupied slot, or null. */
export const firstNurseryBaby = (b: Building | undefined): NurseryBaby | null => babiesBySlot(b)[0] ?? null;
export const nurseryBabies = (s: Pick<GameState, 'buildings'>): NurseryBaby[] => s.buildings.flatMap(b => babiesBySlot(b));
/** The baby of this exact birth, never another one. */
export const findNurseryBaby = (s: Pick<GameState, 'buildings'>, birthId: string): NurseryBaby | null =>
  nurseryBabies(s).find(baby => baby.birth.id === birthId) ?? null;
export const babyInNursery = (b: Building | undefined, birthId: string | undefined): NurseryBaby | null =>
  birthId === undefined ? null : b?.nursery?.babies.find(baby => baby.birth.id === birthId) ?? null;
/** Usable cushions (`0 .. capacity - 1`) holding no baby, lowest first. */
export function freeNurserySlots(b: Building | undefined): NurserySlot[] {
  const n = b?.nursery; if (!n) return [];
  const taken = new Set(n.babies.map(baby => baby.slot));
  return ([0, 1, 2, 3] as const).filter(slot => slot < n.capacity && !taken.has(slot));
}
export const firstFreeNurserySlot = (b: Building | undefined): NurserySlot | null => freeNurserySlots(b)[0] ?? null;
export const nurseryHasCapacity = (b: Building | undefined): boolean => firstFreeNurserySlot(b) !== null;
/** A nursery with every usable cushion taken; the next birth waits in the nest. */
export const nurseryFull = (b: Building | undefined): boolean => !!b?.nursery && !nurseryHasCapacity(b);
/** Once the transfer has been learned (its initial mission claimed), a finished birth joins the nursery by itself. */
export const automaticNurseryTransfer = (s: Pick<GameState, 'missions'>): boolean => s.missions.claimed.includes('to-nursery');
/**
 * Session rhythm: a finished birth moves to the lowest free cushion and starts growing at the end of its breeding,
 * or at `freeSince` when the cushion was only freed later (a welcome is the only way to free one). Parents return home as
 * with a manual transfer; a birth that finds no cushion keeps waiting at the nest. Mutates the transaction copy only.
 */
export function settleNestTransfers(s: GameState, freeSince: number): void {
  if (!automaticNurseryTransfer(s)) return;
  for (const nest of s.buildings) {
    const job = nest.kind === 'nest' ? nest.breeding : null, nursery = nurseryBuilding(s), slot = firstFreeNurserySlot(nursery);
    if (!job || job.endsAt > s.lastSimulatedAt || !nursery?.nursery || slot === null || findNurseryBaby(s, job.birth.id)) continue;
    const startedAt = Math.max(job.endsAt, freeSince), readyAt = startedAt + growthDuration(job.birth.species);
    if (!Number.isSafeInteger(readyAt)) continue;
    nursery.nursery.babies.push({slot, birth: job.birth, startedAt, readyAt}); nest.breeding = null;
  }
}
export const readyNurseryBabies = (b: Building | undefined, now: number): NurseryBaby[] => babiesBySlot(b).filter(baby => baby.readyAt <= now);
/** The next permanent cushion unlock (one step at a time, Hearts only), or null at the maximum or without a nursery. */
export function nurseryUnlockQuote(b: Building | undefined): {fromCapacity: NurseryCapacity; toCapacity: NurseryCapacity; hearts: number} | null {
  const capacity = b?.nursery?.capacity;
  if (capacity === undefined || capacity >= NURSERY.maxCapacity) return null;
  return {fromCapacity: capacity, toCapacity: (capacity + 1) as NurseryCapacity, hearts: NURSERY.unlockHearts[capacity as 1 | 2 | 3]};
}
/** What each of the four cushions shows: locked beyond the capacity, else empty, growing or ready. */
export type NurserySlotState = 'locked' | 'empty' | 'growing' | 'ready';
export function nurserySlotStates(b: Building | undefined, now: number): NurserySlotState[] {
  const capacity = b?.nursery?.capacity ?? 0;
  return ([0, 1, 2, 3] as const).map(slot => {
    if (slot >= capacity) return 'locked';
    const baby = b!.nursery!.babies.find(x => x.slot === slot);
    return !baby ? 'empty' : baby.readyAt <= now ? 'ready' : 'growing';
  });
}
