import {establishHistoricalLevelRights} from './levelRights';
import {settleInitiation} from './initiation';
import {habitatStats} from './habitats';
import {updateMissions} from './missions';
import {BALANCE, HOUR, MINUTE} from '../config/balance';
import type {GameState} from '../state/types';
export function rabbitIncome(affection: number): number {
  return BALANCE.incomeBase + BALANCE.incomePerLevel * (affection - 1);
}
export function validTime(now: number): boolean { return Number.isSafeInteger(now) && now >= 0; }
/** Rebase every absolute timestamp; cycle indices and already earned resources stay unchanged. */
function rebaseClock(s: GameState, offset: number): void {
  s.lastSimulatedAt += offset;
  s.nextHeartGiftAt += offset;
  s.missions.daily.referenceAt += offset;
  for (const b of s.buildings) {
    if (b.order) { b.order.startedAt += offset; b.order.endsAt += offset; }
    if (b.breeding) { b.breeding.startedAt += offset; b.breeding.endsAt += offset; }
    for (const baby of b.nursery?.babies ?? []) { baby.startedAt += offset; baby.readyAt += offset; }
  }
  // Initiation stores jobKey tuples, including timestamps, even for closed/used jobs.
  if (s.initiation) for (const stage of ['order', 'breeding', 'growth'] as const) {
    const key = s.initiation[stage];
    if (!key) continue;
    try {
      const tuple: unknown = JSON.parse(key);
      if (Array.isArray(tuple) && tuple.length === 5 && tuple[1] === stage &&
          Number.isSafeInteger(tuple[2]) && Number.isSafeInteger(tuple[3])) {
        tuple[2] += offset; tuple[3] += offset;
        s.initiation[stage] = JSON.stringify(tuple);
      }
    } catch { /* Historical unrecognised keys remain unavailable, as before. */ }
  }
}
/** Pure update. Small clock reversals remain monotonic; large ones preserve remaining durations. */
export function advance(state: GameState, now: number): GameState {
  if (!validTime(now)) throw new RangeError('Invalid timestamp');
  const next = structuredClone(state);
  establishHistoricalLevelRights(next);
  if (state.lastSimulatedAt - now > 5 * MINUTE) rebaseClock(next, now - state.lastSimulatedAt);
  const target = Math.max(now, next.lastSimulatedAt, next.missions.daily.referenceAt);
  const elapsed = target - next.lastSimulatedAt;
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
