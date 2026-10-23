import {establishHistoricalLevelRights} from './levelRights';
import {settleInitiation} from './initiation';
import {habitatStats} from './habitats';
import {updateMissions} from './missions';
import {BALANCE, HOUR} from '../config/balance';
import type {GameState} from '../state/types';
export function rabbitIncome(affection: number): number {
  return BALANCE.incomeBase + BALANCE.incomePerLevel * (affection - 1);
}
export function validTime(now: number): boolean { return Number.isSafeInteger(now) && now >= 0; }
/** Pure, monotonic update. No births are rerolled, no automatic farm repetition. */
export function advance(state: GameState, now: number): GameState {
  if (!validTime(now)) throw new RangeError('Invalid timestamp');
  const next = structuredClone(state);
  establishHistoricalLevelRights(next);
  const target = Math.max(now, state.lastSimulatedAt, state.missions.daily.referenceAt);
  const elapsed = target - state.lastSimulatedAt;
  for (const enclosure of next.buildings.filter(b => b.kind === 'enclosure')) {
    const rate = next.rabbits.filter(r => r.enclosureId === enclosure.id)
      .reduce((sum, rabbit) => sum + rabbitIncome(rabbit.affection), 0);
    const cap = habitatStats(enclosure).cap * HOUR;
    // Bound multiplication before applying a potentially enormous absence.
    const boundedElapsed = rate === 0 ? 0 : Math.min(elapsed, Math.ceil((cap - enclosure.incomeUnits) / rate));
    enclosure.incomeUnits = Math.min(cap, enclosure.incomeUnits + boundedElapsed * rate);
  }
  next.lastSimulatedAt = target;
  updateMissions(next, target);
  settleInitiation(next);
  return next;
}
