import {describe, expect, it} from 'vitest';
import {advanceSkyGifts, aimSkyGifts, sleighAt, startSkyGifts, SKY_GIFTS_GAME} from '../src/simulation/skyGiftsGame';
import {fightPlaces, snowballPoint} from '../src/display/snowballFight';

describe('« Les cadeaux du ciel »', () => {
  it('ends after the game time when the rabbit follows every present', () => {
    const g = startSkyGifts(0, 42);
    for (let t = 0; !g.over && t < 60_000; t += 16) {
      const next = [...g.gifts].sort((a, b) => b.y - a.y)[0];
      if (next) aimSkyGifts(g, next.x);
      advanceSkyGifts(g, t);
    }
    expect(g.over).toBe(true);
    expect(g.now).toBe(SKY_GIFTS_GAME.ms);
    expect(g.missed).toBeLessThan(SKY_GIFTS_GAME.misses);
    expect(g.caught).toBeGreaterThan(30);
  });
  it('ends after three presents fall into the snow when nobody moves', () => {
    const g = startSkyGifts(0, 7);
    aimSkyGifts(g, 0);
    for (let t = 0; !g.over; t += 50) advanceSkyGifts(g, t);
    expect(g.missed).toBe(SKY_GIFTS_GAME.misses);
    expect(g.now).toBeLessThan(SKY_GIFTS_GAME.ms);
  });
  it('is the same game for the same seed, whatever the frame rate', () => {
    const a = startSkyGifts(0, 9), b = startSkyGifts(0, 9);
    for (let t = 0; t <= 20_000; t += 16) advanceSkyGifts(a, t);
    for (let t = 0; t <= 20_000; t += 250) advanceSkyGifts(b, t);
    advanceSkyGifts(b, 20_000);
    expect(b.dropped).toBe(a.dropped);
  });
  it('keeps the basket inside the field and the sleigh crossing the sky', () => {
    const g = startSkyGifts(0, 3);
    aimSkyGifts(g, -5); expect(g.targetX).toBe(SKY_GIFTS_GAME.basketHalf);
    aimSkyGifts(g, 9); expect(g.targetX).toBe(1 - SKY_GIFTS_GAME.basketHalf);
    expect(sleighAt(g, 0).x).toBeLessThan(0); expect(sleighAt(g, SKY_GIFTS_GAME.crossingMs).x).toBeGreaterThan(1);
    expect(sleighAt(g, SKY_GIFTS_GAME.crossingMs * 1.5).facing).toBe(-1);
  });
});

describe('the snowball fights', () => {
  it('places the two rabbits apart, inside the fence, and throws in an arc', () => {
    const zone = {minX: -40, maxX: 40, minY: -10, maxY: 10};
    const [a, b] = fightPlaces({x: 35, y: 0}, {x: 38, y: 2}, zone);
    expect(b.x - a.x).toBeCloseTo(46); expect(a.x).toBeGreaterThanOrEqual(zone.minX); expect(b.x).toBeLessThanOrEqual(zone.maxX);
    expect(snowballPoint(a, b, .5).lift).toBeGreaterThan(snowballPoint(a, b, .1).lift);
    expect(snowballPoint(a, b, 1)).toEqual({...b, lift: 0});
  });
});
