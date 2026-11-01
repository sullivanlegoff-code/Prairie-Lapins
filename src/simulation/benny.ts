import {HOUR, SPECIES, SPECIES_IDS, type SpeciesId} from '../config/balance';
import {nurseryBabies} from './nursery';
import type {GameState, Refusal} from '../state/types';

/**
 * Benny, the one Mythic (owner, 1 November 2026). Pure readers of her rules; the actions live in actions.ts.
 * - Only one Benny per game: once owned, or already in the nest or the nursery, she leaves every breeding result.
 * - As a parent, she stands in for one Common rabbit drawn at random at each breeding.
 * - Her power ends the wait of every baby in the nursery at once, then recharges for 48 hours.
 * - Her sky mode is a saved state (she flies over the island: src/display/bennyFlight.ts); she stays attached to her enclosure.
 */
export const BENNY: SpeciesId = 'benny';
export const BENNY_POWER_RECHARGE = 48 * HOUR;
/** The Commons Benny may stand in for, in catalogue order, each equally likely. */
export const BENNY_STAND_INS: readonly SpeciesId[] = SPECIES_IDS.filter(id => SPECIES[id].rarity === 'common');

/** True once a Benny is owned, or is already on her way (in the nest or in the nursery). */
export function bennyClaimed(s: Pick<GameState, 'rabbits' | 'buildings'>): boolean {
  return s.rabbits.some(r => r.species === BENNY) || s.buildings.some(b => b.breeding?.birth.species === BENNY)
    || nurseryBabies(s).some(baby => baby.birth.species === BENNY);
}
/** Whether this species may still come out of a breeding: everything but a Benny already claimed. */
export const bennyAllows = (s: Pick<GameState, 'rabbits' | 'buildings'>, id: SpeciesId): boolean => id !== BENNY || !bennyClaimed(s);
/** The Common a Benny parent stands in for, from one draw in [0, 1). Any other species is itself. */
export function bennyStandIn(species: SpeciesId, roll: number): SpeciesId {
  if (species !== BENNY) return species;
  return BENNY_STAND_INS[Math.min(BENNY_STAND_INS.length - 1, Math.floor(roll * BENNY_STAND_INS.length))];
}
/** Every species a parent may act as, equally likely: the Commons for Benny, itself otherwise. */
export const bennyStandIns = (species: SpeciesId): readonly SpeciesId[] => species === BENNY ? BENNY_STAND_INS : [species];

/** Babies of the nursery still growing at `now`. */
export const waitingNurseryBabies = (s: Pick<GameState, 'buildings'>, now: number) => nurseryBabies(s).filter(baby => baby.readyAt > now);
/** The time the power is usable again; 0 when it has never been used. */
export const bennyPowerReadyAt = (s: Pick<GameState, 'benny'>): number => s.benny?.powerReadyAt ?? 0;
/** Why Benny's power cannot be used now, or null. */
export function bennyPowerReason(s: Pick<GameState, 'rabbits' | 'buildings' | 'benny'>, now: number): Refusal | null {
  if (!s.rabbits.some(r => r.species === BENNY)) return 'NOT_FOUND';
  if (bennyPowerReadyAt(s) > now) return 'BENNY_RECHARGING';
  if (!waitingNurseryBabies(s, now).length) return 'NO_WAITING_BABY';
  return null;
}
export const bennyInSky = (s: Pick<GameState, 'benny'>): boolean => s.benny?.inSky === true;
