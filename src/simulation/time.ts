import {establishHistoricalLevelRights} from './levelRights';
import {advanceFriendships} from './cozy';
import {settleInitiation} from './initiation';
import {habitatStats} from './habitats';
import {updateMissions} from './missions';
import {settleNestTransfers} from './nursery';
import {BALANCE, HOUR, MINUTE, SPECIES, type SpeciesId, type Rarity} from '../config/balance';
import type {GameState, Rabbit} from '../state/types';
/** Stable fallback for historical rabbits: loading never rerolls an individual's income. */
export function historicalIncomeRoll(rabbit: Pick<Rabbit, 'id' | 'species'>): number {
  let hash = 2166136261;
  for (const character of `${rabbit.id}:${rabbit.species}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash % 10001;
}
export function drawIncomeRoll(rabbit: Pick<Rabbit, 'id' | 'species'>, rng: () => number): number {
  if (SPECIES[rabbit.species].rarity === 'common') return historicalIncomeRoll(rabbit);
  const roll = rng();
  return Number.isFinite(roll) && roll >= 0 && roll < 1 ? Math.floor(roll * 10001) : historicalIncomeRoll(rabbit);
}
export function individualIncomeRoll(rabbit: Pick<Rabbit, 'id' | 'species' | 'incomeRoll'>): number {
  return rabbit.incomeRoll ?? historicalIncomeRoll(rabbit);
}
/** Whole coins/hour; round once per individual, never at each simulation tick. */
export function rabbitIncome(affection: number, speciesOrRarity: SpeciesId | Rarity = 'common', incomeRoll = 5000): number {
  const species = Object.hasOwn(SPECIES, speciesOrRarity) ? speciesOrRarity as SpeciesId : null, rarity = species ? SPECIES[species].rarity : speciesOrRarity;
  if (rarity === 'common') return BALANCE.incomeBase + BALANCE.incomePerLevel * (affection - 1);
  const luck = incomeRoll / 10000;
  const rare = 10 + 10 * luck + (affection - 1) * (60 + 20 * luck) / 9;
  return Math.round(rare * (rarity === 'epic' ? 1.3 : rarity === 'legendary' ? 1.5 : 1));
}
export function validTime(now: number): boolean { return Number.isSafeInteger(now) && now >= 0; }
/** Rebase every absolute timestamp; cycle indices and already earned resources stay unchanged. */
function rebaseClock(s: GameState, offset: number): void {
  s.lastSimulatedAt += offset;
  s.nextHeartGiftAt += offset;
  s.missions.daily.referenceAt += offset;
  if (s.missions.daily.nextAt !== undefined) s.missions.daily.nextAt += offset;
  for (const trip of s.travel?.trips ?? []) { trip.startedAt += offset; trip.endsAt += offset; }
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
      .reduce((sum, rabbit) => sum + rabbitIncome(rabbit.affection, rabbit.species, individualIncomeRoll(rabbit)), 0);
    const cap = habitatStats(enclosure).cap * HOUR;
    // Bound multiplication before applying a potentially enormous absence.
    const boundedElapsed = rate === 0 ? 0 : Math.min(elapsed, Math.ceil((cap - enclosure.incomeUnits) / rate));
    enclosure.incomeUnits = Math.min(cap, enclosure.incomeUnits + boundedElapsed * rate);
  }
  const freeSince = next.lastSimulatedAt;
  advanceFriendships(next, elapsed, target);
  next.lastSimulatedAt = target;
  settleNestTransfers(next, freeSince);
  updateMissions(next, target);
  settleInitiation(next);
  return next;
}
