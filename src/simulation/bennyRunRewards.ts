import {BENNY_RUN} from './bennyRun';
import {giftCycle} from './care';
import type {GameState} from '../state/types';

/** Today's rewarded runs left, on the same daily cycle as the other games of Benny. */
export function bennyRunDay(s: Pick<GameState, 'bennyRun' | 'missions'>, now: number): {rewardedLeft: number} {
  const day = s.bennyRun?.day, cycle = giftCycle(s, now);
  return {rewardedLeft: Math.max(0, BENNY_RUN.rewardedRunsPerCycle - (day?.cycle === cycle ? day.rewarded : 0))};
}
/** What a finished run pays: its coins as pattes, at most `maxPattes`, while today's rewarded runs last. */
export function bennyRunReward(s: Pick<GameState, 'bennyRun' | 'missions'>, coins: number, now: number): {pattes: number; rewarded: boolean} {
  const count = Math.max(0, Math.floor(coins)), rewarded = count >= 1 && bennyRunDay(s, now).rewardedLeft > 0;
  return {pattes: rewarded ? Math.min(BENNY_RUN.maxPattes, count * BENNY_RUN.pattesPerCoin) : 0, rewarded};
}
