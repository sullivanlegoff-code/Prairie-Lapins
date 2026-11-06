import {BENNY_FLIGHT} from '../config/balance';
import {giftCycle} from './care';
import type {GameState, Refusal} from '../state/types';

/** Benny's perch, when it is built. */
export const perchBuilding = (s: Pick<GameState, 'buildings'>) => s.buildings.find(b => b.kind === 'perch');
/** The perch and its game need Benny on the island (owner, 5 November 2026: « avec Benny uniquement »). */
export const hasBenny = (s: Pick<GameState, 'rabbits'>) => s.rabbits.some(r => r.species === 'benny');
/** Why « Le vol de Benny » cannot be played now, or null. */
export function bennyFlightReason(s: Pick<GameState, 'rabbits' | 'buildings'>): Refusal | null {
  if (!perchBuilding(s)) return 'NOT_FOUND';
  return hasBenny(s) ? null : 'BENNY_REQUIRED';
}
/** Today's rewarded games left, whether the day's Heart is still to win (first game only), and the record. */
export function bennyFlightDay(s: Pick<GameState, 'bennyFlight' | 'missions'>, now: number): {rewardedLeft: number; heartLeft: boolean; best: number} {
  const g = s.bennyFlight, day = g && g.cycle === giftCycle(s, now) ? g : null;
  return {rewardedLeft: Math.max(0, BENNY_FLIGHT.rewardedGamesPerCycle - (day?.rewarded ?? 0)), heartLeft: !day, best: g?.best ?? 0};
}
/** What a finished game with `passed` columns pays now: pattes within the daily limit, a Heart on the first game of the day at `heartColumns`. */
export function bennyFlightReward(s: Pick<GameState, 'bennyFlight' | 'missions'>, passed: number, now: number): {pattes: number; hearts: number; rewarded: boolean} {
  const day = bennyFlightDay(s, now), rewarded = day.rewardedLeft > 0, count = Math.max(0, Math.floor(passed));
  return {pattes: rewarded ? Math.min(BENNY_FLIGHT.maxPattes, count * BENNY_FLIGHT.pattesPerColumn) : 0, hearts: day.heartLeft && count >= BENNY_FLIGHT.heartColumns ? 1 : 0, rewarded};
}
