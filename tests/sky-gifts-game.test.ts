import {describe, expect, it} from 'vitest';
import {advanceSkyGifts, aimSkyGifts, sleighAt, startSkyGifts, SKY_GIFTS_GAME, type SkyGiftsGame} from '../src/simulation/skyGiftsGame';
import {fightPlaces, snowballPoint} from '../src/display/snowballFight';

describe('« Les cadeaux du ciel »', () => {
  // A quick player: goes for the lowest present out of a trap's way, and steps aside from a trap about to land.
  const player = (g: SkyGiftsGame) => {
    const traps = g.gifts.filter(x => x.kind !== 'gift');
    const danger = (x: number) => traps.some(t => t.y > SKY_GIFTS_GAME.catchTop - .2 && t.y < SKY_GIFTS_GAME.catchBottom && Math.abs(t.x - x) < SKY_GIFTS_GAME.basketHalf + .025);
    let target = g.gifts.filter(x => x.kind === 'gift' && !danger(x.x)).sort((p, q) => q.y - p.y)[0]?.x ?? g.basketX;
    if (danger(target)) for (const d of [.2, -.2, .35, -.35, .5, -.5, .7, -.7]) { const x = Math.max(.08, Math.min(.92, g.basketX + d)); if (!danger(x)) { target = x; break; } }
    aimSkyGifts(g, target);
  };
  it('lets a quick player who lets the traps fall last the whole game, most of the time', () => {
    let full = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const g = startSkyGifts(0, seed);
      for (let t = 0; !g.over && t < 60_000; t += 16) { player(g); advanceSkyGifts(g, t); }
      expect(g.over).toBe(true);
      if (g.now === SKY_GIFTS_GAME.ms) full++;
    }
    // Hard on purpose (owner, 5 November 2026): even a quick player sometimes meets a bomb it cannot dodge.
    expect(full).toBeGreaterThanOrEqual(12);
  });
  it('drops poisoned presents and bombs after the first drops: a bomb caught ends the game, a poisoned one takes 3 presents away', () => {
    const g = startSkyGifts(0, 5), kinds: string[] = [];
    for (let t = 0; !g.over && t < 60_000; t += 16) { player(g); advanceSkyGifts(g, t); for (const x of g.gifts) kinds[x.id] = x.kind; }
    expect(kinds.slice(0, SKY_GIFTS_GAME.safeDrops).every(k => k === 'gift')).toBe(true);
    expect(kinds.filter(k => k === 'poison').length).toBeGreaterThan(3); expect(kinds.filter(k => k === 'bomb').length).toBeGreaterThan(3);
    expect(kinds.filter(k => k !== 'gift').length).toBeLessThan(kinds.length * SKY_GIFTS_GAME.trapMax);
    // A trap that reaches the snow is dodged: no life lost.
    const h = startSkyGifts(0, 5); h.gifts.push({id: 999, x: .9, y: SKY_GIFTS_GAME.groundY - .001, speed: .5, sway: 0, colour: 0, kind: 'bomb'}); aimSkyGifts(h, .1);
    advanceSkyGifts(h, 32);
    expect(h.missed).toBe(0); expect(h.events.dodged.map(x => x.id)).toEqual([999]);
    // A poisoned present in the basket takes three caught presents away (never below zero), and costs no life.
    const k = startSkyGifts(0, 5); k.caught = 5; k.gifts.push({id: 998, x: .5, y: SKY_GIFTS_GAME.catchTop - .001, speed: .5, sway: 0, colour: 0, kind: 'poison'});
    advanceSkyGifts(k, 32);
    expect([k.caught, k.missed, k.poisoned, k.over]).toEqual([5 - SKY_GIFTS_GAME.poisonGifts, 0, 1, false]); expect(k.events.trapped.map(x => x.id)).toEqual([998]);
    k.gifts.push({id: 997, x: k.basketX, y: SKY_GIFTS_GAME.catchTop - .001, speed: .5, sway: 0, colour: 0, kind: 'poison'});
    advanceSkyGifts(k, 64); expect(k.caught).toBe(0);
    // A bomb in the basket explodes and ends the game at once, keeping the presents caught so far.
    const m = startSkyGifts(0, 5); m.caught = 7; m.gifts.push({id: 996, x: .5, y: SKY_GIFTS_GAME.catchTop - .001, speed: .5, sway: 0, colour: 0, kind: 'bomb'});
    advanceSkyGifts(m, 32);
    expect([m.over, m.exploded, m.caught, m.missed]).toEqual([true, true, 7, 0]); expect(m.now).toBeLessThan(SKY_GIFTS_GAME.ms);
    const ended = m.now; advanceSkyGifts(m, 5000); expect(m.now).toBe(ended);
  });
  it('ends after three lost lives when nobody moves', () => {
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
