import {describe, expect, it} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {HOUR, MARKET} from '../src/config/balance';
import {marketPrice} from '../src/simulation/market';
import {cumulativeLevelXp} from '../src/simulation/progression';
import type {GameState} from '../src/state/types';

// Late game (25 October 2026): surplus pattes and grass become Hearts at Paille's counter.
function rich(level: number = MARKET.unlockLevel) {
  const s = createGame(0); s.pattes = 1_000_000; s.grass = 1_000_000;
  s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  return s;
}
const exchange = (s: GameState, resource: 'pattes' | 'grass') => {
  const r = act(s, {type: 'exchangeForHeart', resource, expectedCost: marketPrice(s, resource)!}, s.lastSimulatedAt);
  if (!r.ok) throw Error(r.reason); return r.state;
};
describe('Paille’s counter', () => {
  it('opens at its level only', () => {
    const s = rich(MARKET.unlockLevel - 1);
    expect(act(s, {type: 'exchangeForHeart', resource: 'pattes', expectedCost: 250}, 0)).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED'});
  });
  it('gives one Heart per exchange, each one 25 % dearer within the cycle, then stops at thirty', () => {
    let s = rich(); const hearts = s.hearts;
    const paid: number[] = [];
    for (let i = 0; i < 3; i++) { paid.push(marketPrice(s, 'pattes')!); s = exchange(s, 'pattes'); }
    expect(paid).toEqual([250, 313, 391]);
    expect(s.pattes).toBe(1_000_000 - 954); expect(s.hearts).toBe(hearts + 3);
    expect(marketPrice(s, 'grass')).toBe(100); s = exchange(s, 'grass'); expect(s.grass).toBe(1_000_000 - 100);
    while (marketPrice(s, 'grass') !== null) s = exchange(s, 'grass');
    expect(s.market?.grass).toBe(MARKET.maximumPerCycle);
    expect(act(s, {type: 'exchangeForHeart', resource: 'grass', expectedCost: 1}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'MARKET_LIMIT'});
  });
  it('refuses a stale price or missing funds without changing anything', () => {
    const s = rich(); s.pattes = 100;
    expect(act(s, {type: 'exchangeForHeart', resource: 'pattes', expectedCost: 200}, 0)).toMatchObject({ok: false, reason: 'PRICE_CHANGED'});
    expect(act(s, {type: 'exchangeForHeart', resource: 'pattes', expectedCost: 250}, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_PATTES'});
  });
  it('resets its prices at the next daily cycle and survives a save', () => {
    let s = exchange(exchange(rich(), 'pattes'), 'pattes');
    const decoded = decodeGame(encodeGame(s)); expect(decoded.ok && decoded.state.market).toEqual(s.market);
    s = advance(s, 24 * HOUR);
    expect(marketPrice(s, 'pattes')).toBe(250);
    const future = structuredClone(s); future.market = {cycle: 5, pattes: 1, grass: 0};
    expect(() => encodeGame(future)).toThrow();
  });
});
