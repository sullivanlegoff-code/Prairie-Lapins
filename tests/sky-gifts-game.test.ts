import {describe, expect, it} from 'vitest';
import {advanceSkyGifts, aimSkyGifts, sleighAt, startSkyGifts, SKY_GIFTS_GAME, type SkyGiftsGame} from '../src/simulation/skyGiftsGame';
import {battlePlaces, fightPlaces, snowballActPose, snowballPoint, SnowballFights, SNOWBALL_BATTLE_MIN, type SnowballThrower} from '../src/display/snowballFight';
import {createRabbitMotion, stepRabbitMotion} from '../src/display/rabbitMotion';

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
  const zone = {minX: -56, maxX: 56, minY: -20, maxY: 38};
  const throwers = (count: number, group = 'enclos-1'): SnowballThrower[] => Array.from({length: count}, (_, i) => ({
    id: `lapin-${i}`, group, available: true, motion: createRabbitMotion(`lapin-${i}`, {x: -30 + 60 * i / Math.max(1, count - 1), y: (i % 3) * 8}, count, {zone, roamScale: 1})}));
  /** Runs the fights and the rabbits' own motion together, like the meadow does. */
  const run = (fights: SnowballFights, list: SnowballThrower[], ms: number, onStep?: () => void) => {
    for (let t = 0; t < ms; t += 50) { for (const r of list) stepRabbitMotion(r.motion, 50); fights.step(50, list, true, false, true); onStep?.(); }
  };

  it('places the two duellers far apart, near the two ends of the fence, and throws in an arc', () => {
    const [a, b] = fightPlaces({x: 35, y: 0}, {x: 38, y: 2}, zone);
    expect(b.x - a.x).toBeGreaterThanOrEqual(90); expect(a.x).toBeGreaterThanOrEqual(zone.minX); expect(b.x).toBeLessThanOrEqual(zone.maxX);
    const small = {minX: -40, maxX: 40, minY: -10, maxY: 10}, [c, d] = fightPlaces({x: 35, y: 0}, {x: 38, y: 2}, small);
    expect(d.x - c.x).toBeCloseTo(60); expect(c.x).toBeGreaterThanOrEqual(small.minX); expect(d.x).toBeLessThanOrEqual(small.maxX);
    expect(snowballPoint(a, b, .5).lift).toBeGreaterThan(snowballPoint(a, b, .1).lift);
    expect(snowballPoint(a, b, 1)).toEqual({...b, lift: 0});
  });

  it('puts the two camps of a general battle along the two fences, inside the enclosure', () => {
    const [left, right] = battlePlaces(3, 2, zone);
    expect(left).toHaveLength(3); expect(right).toHaveLength(2);
    for (const p of [...left, ...right]) { expect(p.x).toBeGreaterThanOrEqual(zone.minX); expect(p.x).toBeLessThanOrEqual(zone.maxX); expect(p.y).toBeGreaterThanOrEqual(zone.minY); expect(p.y).toBeLessThanOrEqual(zone.maxY); }
    expect(Math.max(...left.map(p => p.x))).toBeLessThan(zone.minX + 30); expect(Math.min(...right.map(p => p.x))).toBeGreaterThan(zone.maxX - 30);
    expect(new Set(left.map(p => p.y)).size).toBe(3);
  });

  it('plays a duel: two rabbits apart, taking turns, then back to their roaming', () => {
    const fights = new SnowballFights(), list = throwers(2);
    fights.step(50, list, true, false, true, true);
    expect(fights.fightOf('lapin-0')).toBe('duel');
    let thrown = 0, most = 0, minGap = Infinity; const seen = new Set<number>();
    run(fights, list, 2500);
    run(fights, list, 20_000, () => {
      const balls = fights.balls(); most = Math.max(most, balls.length);
      for (const b of balls) if (!seen.has(b.id)) { seen.add(b.id); thrown++; }
      if (fights.isFighting('lapin-0')) minGap = Math.min(minGap, Math.abs(list[0].motion.local.x - list[1].motion.local.x));
    });
    expect(thrown).toBeGreaterThanOrEqual(4); expect(thrown).toBeLessThanOrEqual(7);
    expect(most).toBe(1);
    expect(minGap).toBeGreaterThanOrEqual(85);
    expect(fights.isFighting('lapin-0')).toBe(false);
    expect(list.every(r => r.motion.mode !== 'meet')).toBe(true);
  });

  it('plays a general battle: every free rabbit joins one of two camps and they throw at the other camp', () => {
    const fights = new SnowballFights(), list = throwers(6);
    fights.step(50, list, true, false, true, false, true);
    expect(list.every(r => fights.fightOf(r.id) === 'battle')).toBe(true);
    run(fights, list, 3000);
    const xs = list.map(r => r.motion.local.x);
    expect(xs.filter(x => x < 0)).toHaveLength(3); expect(xs.filter(x => x > 0)).toHaveLength(3);
    expect(Math.min(...xs.map(Math.abs))).toBeGreaterThan(25);
    let most = 0, misses = 0, hits = 0, crossCamp = true;
    run(fights, list, 30_000, () => {
      most = Math.max(most, fights.balls().length);
      for (const h of fights.hits) { if (h.miss) misses++; else hits++; if (Math.sign(h.start.x) === Math.sign(h.end.x)) crossCamp = false; }
    });
    expect(most).toBeGreaterThanOrEqual(2);
    expect(hits).toBeGreaterThan(3); expect(misses).toBeGreaterThan(0); expect(crossCamp).toBe(true);
    expect(list.some(r => fights.isFighting(r.id))).toBe(false);
  });

  it('needs three free rabbits for a battle; a duel otherwise', () => {
    expect(SNOWBALL_BATTLE_MIN).toBe(3);
    const fights = new SnowballFights(), list = throwers(2);
    fights.step(50, list, true, false, true, false, true);
    expect(fights.fightOf('lapin-0')).not.toBe('battle');
  });

  it('lets a touched rabbit leave a battle without stopping the others, and stops everything in reduced motion', () => {
    const fights = new SnowballFights(), list = throwers(5);
    fights.step(50, list, true, false, true, false, true);
    run(fights, list, 1000);
    list[0].available = false;
    fights.step(50, list, true, false, true);
    expect(fights.isFighting('lapin-0')).toBe(false);
    expect(list[0].motion.mode).not.toBe('meet');
    expect(fights.isFighting('lapin-4')).toBe(true);
    fights.step(50, list, true, true, true);
    expect(list.some(r => fights.isFighting(r.id))).toBe(false);
  });

  it('winds up, knocks back, dodges and cheers with poses that stay upright', () => {
    for (const kind of ['windup', 'recoil', 'dodge', 'cheer'] as const) for (const t of [0, .3, .5, .8, 1]) {
      const p = snowballActPose({kind, t: t * 400, length: 400}, 1);
      expect(Math.abs(p.rotation)).toBeLessThan(.3); expect(p.lift).toBeGreaterThanOrEqual(0); expect(p.squashY).toBeGreaterThan(.8);
    }
    expect(snowballActPose({kind: 'recoil', t: 200, length: 400}, 1).rotation).toBeLessThan(0);
    expect(snowballActPose({kind: 'recoil', t: 200, length: 400}, -1).rotation).toBeGreaterThan(0);
    expect(snowballActPose({kind: 'dodge', t: 200, length: 400}, 1).lift).toBeGreaterThan(5);
  });
});
