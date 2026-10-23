import {jobKey as targetJobKey} from './initiation';
import {welcomeDestinations} from './habitats';
import {babyInNursery} from './nursery';
import {HEARTS} from '../config/balance';
import type {GameState, Refusal, TimedStage} from '../state/types';
import {advance, validTime} from './time';

export const accelerationCost = (remaining: number): number => Math.ceil(Math.max(0, remaining) / HEARTS.accelerationStep);
export const complementCost = (missing: number): number => Math.ceil(Math.max(0, missing) / HEARTS.pattesPerHeart);
export type AccelerationQuote = {ok: true; hearts: number; jobKey: string; endsAt: number} | {ok: false; reason: Refusal};
/** Quote only; never reveals the birth's species or consumes random numbers. Growth quotes one baby, named by its birth id. */
export function quoteAcceleration(state: GameState, id: string, stage: TimedStage, now: number, birthId?: string): AccelerationQuote {
  if (!validTime(now)) return {ok: false, reason: 'INVALID_TIME'};
  const s = advance(state, now), b = s.buildings.find(b => b.id === id);
  if (!b) return {ok: false, reason: 'NOT_FOUND'};
  if (stage === 'growth' && birthId === undefined) return {ok: false, reason: 'INVALID_CHOICE'};
  const job = stage === 'order' ? b.order : stage === 'breeding' ? b.breeding : stage === 'growth' ? babyInNursery(b, birthId) : null;
  if (!job) return {ok: false, reason: 'ACTION_FINISHED'};
  const endsAt = 'readyAt' in job ? job.readyAt : job.endsAt;
  if (endsAt <= s.lastSimulatedAt) return {ok: false, reason: 'ACTION_FINISHED'};
  // Ending growth must leave a legal welcome for this very baby: the same type and capacity rule as `welcome`. The refusal stays
  // CAPACITY_FULL whether compatible homes are full or only incompatible ones have room; the quote never names the species.
  if (stage === 'growth' && 'birth' in job && !welcomeDestinations(s, job.birth.species).length)
    return {ok: false, reason: 'CAPACITY_FULL'};
  // An occupied nursery does not stop a running reproduction. Its result will wait in the nest.
  const jobKey = targetJobKey(b, stage, birthId)!;
  return {ok: true, hearts: accelerationCost(endsAt - s.lastSimulatedAt), endsAt, jobKey};
}
