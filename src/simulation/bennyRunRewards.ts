import {BENNY_RUN} from './bennyRun';
import {giftCycle} from './care';
import type {GameState} from '../state/types';

/** Today's rewarded runs and Hearts left, on the same daily cycle as the other games of Benny. */
export function bennyRunDay(s: Pick<GameState, 'bennyRun' | 'missions'>, now: number): {rewardedLeft: number; heartsLeft: number} {
  const day = s.bennyRun?.day, cycle = giftCycle(s, now), today = day?.cycle === cycle ? day : undefined;
  return {rewardedLeft: Math.max(0, BENNY_RUN.rewardedRunsPerCycle - (today?.rewarded ?? 0)), heartsLeft: Math.max(0, BENNY_RUN.heartsPerCycle - (today?.hearts ?? 0))};
}
/** What a finished run pays while today's rewarded runs last: its coins as pattes (at most `maxPattes`), and its Hearts (at most
 * `maxHeartsPerRun`, and only what the day has left). */
export function bennyRunReward(s: Pick<GameState, 'bennyRun' | 'missions'>, coins: number, hearts: number, now: number): {pattes: number; hearts: number; rewarded: boolean} {
  const pieces = Math.max(0, Math.floor(coins)), day = bennyRunDay(s, now);
  const rewarded = (pieces >= 1 || hearts >= 1) && day.rewardedLeft > 0;
  return {
    pattes: rewarded ? Math.min(BENNY_RUN.maxPattes, pieces * BENNY_RUN.pattesPerCoin) : 0,
    hearts: rewarded ? Math.min(BENNY_RUN.maxHeartsPerRun, Math.floor(hearts), day.heartsLeft) : 0,
    rewarded,
  };
}
