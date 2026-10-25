import {MARKET} from '../config/balance';
import {progressionFromXp} from './progression';
import type {GameState} from '../state/types';

/** Paille's counter: late-game pattes and grass become Hearts, each exchange of a daily cycle dearer than the last. */
export type MarketResource = keyof typeof MARKET.base;
/** Exchanges already made with this resource in the current daily cycle; a new cycle starts from zero. */
export function marketExchanges(s: Pick<GameState, 'market' | 'missions'>, resource: MarketResource): number {
  return s.market?.cycle === s.missions.daily.cycleIndex ? s.market[resource] : 0;
}
/** Price of the next Heart, or null once the cycle's exchanges are used up. */
export function marketPrice(s: Pick<GameState, 'market' | 'missions'>, resource: MarketResource): number | null {
  const n = marketExchanges(s, resource);
  return n >= MARKET.maximumPerCycle ? null : Math.round(MARKET.base[resource] * MARKET.growth ** n);
}
export const marketUnlocked = (s: Pick<GameState, 'progression'>): boolean => progressionFromXp(s.progression.totalXp).level >= MARKET.unlockLevel;
