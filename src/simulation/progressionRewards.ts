import {PROGRESSION, type ProgressionConfig} from '../config/progression';
import type {GameState, ProgressionGain} from '../state/types';
import {addXp} from './progression';

export type ProgressionRewardResult = {ok: true; gain: ProgressionGain} |
  {ok: false; reason: 'INVALID_CHOICE' | 'RESOURCE_LIMIT'};

/** Mutates a candidate only after all checks. No storage, time advance or interface. */
export function applyProgressionGain(candidate: Pick<GameState, 'progression' | 'hearts'>,
  amount: number, config: ProgressionConfig = PROGRESSION): ProgressionRewardResult {
  const {totalXp, rewardedThroughLevel} = candidate.progression;
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(totalXp) || totalXp < 0 ||
    !Number.isSafeInteger(rewardedThroughLevel) || rewardedThroughLevel < 1 ||
    !Number.isSafeInteger(candidate.hearts) || candidate.hearts < 0) return {ok: false, reason: 'INVALID_CHOICE'};
  if (!Number.isSafeInteger(totalXp + amount)) return {ok: false, reason: 'RESOURCE_LIMIT'};
  let next;
  try { next = addXp(totalXp, amount, config).progression; }
  catch { return {ok: false, reason: 'INVALID_CHOICE'}; }
  // Loading or recalculating after a cap increase is never a reward source. Zero stays neutral.
  if (amount === 0) return {ok: true, gain: {xpGained: 0, rewardedLevels: [], heartsGranted: 0}};
  const count = Math.max(0, next.level - rewardedThroughLevel);
  const heartsGranted = count * config.rewards.heartsPerLevel;
  if (!Number.isSafeInteger(heartsGranted) || !Number.isSafeInteger(candidate.hearts + heartsGranted))
    return {ok: false, reason: 'RESOURCE_LIMIT'};
  const rewardedLevels = Array.from({length: count}, (_, i) => rewardedThroughLevel + i + 1);
  candidate.progression = {totalXp: next.totalXp, rewardedThroughLevel: Math.max(rewardedThroughLevel, next.level)};
  candidate.hearts += heartsGranted;
  return {ok: true, gain: {xpGained: amount, rewardedLevels, heartsGranted}};
}
