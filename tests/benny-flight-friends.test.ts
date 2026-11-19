import {describe, expect, it} from 'vitest';
import {BENNY_FLIGHT_FRIENDS, bennyFlightFriend, bennyFlightVisitStart} from '../src/simulation/bennyFlightFriends';
import {BENNY_FLIGHT_GAME} from '../src/simulation/bennyFlightGame';

/** Owner, 19 November 2026: the dragon rabbit and the flying rabbit fly behind Benny now and then. */
describe('the friends of Benny’s flight', () => {
  const f = BENNY_FLIGHT_FRIENDS, length = f.enter + f.stay + f.leave;
  it('come now and then, the dragon first, then the flying rabbit, in turns', () => {
    expect(bennyFlightFriend(7, f.first - 1, .5)).toBeNull();
    const kinds = [0, 1, 2, 3].map(n => bennyFlightFriend(7, bennyFlightVisitStart(7, n) + f.enter + 100, .5)!.kind);
    expect(kinds).toEqual(['dragon', 'volant', 'dragon', 'volant']);
    for (let n = 0; n < 5; n++) {
      const gap = bennyFlightVisitStart(7, n + 1) - bennyFlightVisitStart(7, n) - length;
      expect(gap).toBeGreaterThanOrEqual(f.every); expect(gap).toBeLessThanOrEqual(f.every + f.jitter);
      expect(bennyFlightFriend(7, bennyFlightVisitStart(7, n) + length + 10, .5)).toBeNull();
    }
  });
  it('flies behind Benny, a little above her, and leaves the stage by the left', () => {
    const start = bennyFlightVisitStart(3, 0);
    for (let t = 0; t < length; t += 50) {
      const mate = bennyFlightFriend(3, start + t, .5)!;
      expect(mate.x).toBeLessThan(BENNY_FLIGHT_GAME.x - .1);
      expect(mate.y).toBeLessThan(.5);
    }
    expect(bennyFlightFriend(3, start, .5)!.x).toBeLessThan(-.1);
    expect(bennyFlightFriend(3, start + length - 1, .5)!.x).toBeLessThan(-.1);
    expect(bennyFlightFriend(3, start + f.enter + 2000, .05)!.y).toBeGreaterThanOrEqual(.08);
  });
});
