/**
 * The Christmas mini-game « Les cadeaux du ciel » (concept noel-v1 B, owner's choice of 4 November 2026): the sleigh crosses the
 * night sky and drops presents; the player slides their rabbit and its basket to catch them. A game lasts SKY_GIFTS_GAME.ms or
 * ends after SKY_GIFTS_GAME.misses presents fall into the snow. Harder since the owner's requests of 5 November 2026: now and
 * then a poisoned present or a bomb falls instead, which must NOT be caught. A bomb in the basket explodes and ends the game; a
 * poisoned present takes away SKY_GIFTS_GAME.poisonGifts caught presents. Letting a trap fall costs nothing. Pure functions of the time, so tests can play a whole game; the
 * reward is the simulation's 'rewardSkyGifts' command. The field runs from 0 to 1 across and from 0 (top) to 1 (bottom).
 */
export const SKY_GIFTS_GAME = {
  ms: 45_000, misses: 3,
  /** Time between two drops: first, fastest, and how much shorter each one makes it. */
  dropStart: 1050, dropMin: 450, dropFactor: .97,
  /** Falling speed in field heights per second: first and fastest, reached after `rampDrops` drops. */
  fallStart: .32, fallMax: .72, rampDrops: 55,
  /** Traps (poisoned presents and bombs): none in the first `safeDrops` drops, then their share grows from first to most. */
  safeDrops: 4, trapStart: .16, trapMax: .32,
  /** Caught presents a poisoned present takes away (never below zero). */
  poisonGifts: 3,
  /** Share of bombs among the traps (a bomb ends the game, so it is the rarer one). */
  bombShare: .35,
  /** Sleigh height, and the time of one crossing of the sky. */
  sleighY: .14, crossingMs: 5200,
  /** Basket half width and the band of heights where a present lands in it. */
  basketHalf: .08, catchTop: .74, catchBottom: .86,
  /** Below this height a present is lost in the snow. */
  groundY: .95,
  /** Where the rabbit starts, and how fast it follows the finger (share of the gap closed in one second, frame-rate free). */
  startX: .5, follow: 14,
} as const;

/** A present to catch, or a trap to let fall: a poisoned present or a bomb. */
export type FallingKind = 'gift' | 'poison' | 'bomb';
export interface FallingGift {id: number; x: number; y: number; speed: number; sway: number; colour: 0 | 1 | 2 | 3; kind: FallingKind}
export interface SkyGiftsGame {
  startedAt: number; now: number; seed: number;
  sleighX: number; basketX: number; targetX: number;
  gifts: FallingGift[]; nextDropAt: number; drop: number; dropped: number;
  caught: number; missed: number; over: boolean;
  /** Poisoned presents caught (each took presents away), and whether a bomb ended the game. */
  poisoned: number; exploded: boolean;
  /** What happened in the last advance, for the display: caught and lost presents, traps caught and traps let fall. */
  events: {caught: FallingGift[]; missed: FallingGift[]; trapped: FallingGift[]; dodged: FallingGift[]};
}

const random = (g: SkyGiftsGame) => { g.seed = (g.seed + 0x6D2B79F5) >>> 0; let t = g.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function startSkyGifts(now: number, seed = Math.floor(now) >>> 0): SkyGiftsGame {
  const c = SKY_GIFTS_GAME;
  return {startedAt: now, now, seed: seed || 1, sleighX: 0, basketX: c.startX, targetX: c.startX, gifts: [], nextDropAt: now + 900, drop: c.dropStart, dropped: 0,
    caught: 0, missed: 0, poisoned: 0, exploded: false, over: false, events: {caught: [], missed: [], trapped: [], dodged: []}};
}
/** Where the sleigh is in the sky: it goes left to right, then right to left, slightly beyond the edges. */
export function sleighAt(g: SkyGiftsGame, now: number): {x: number; facing: 1 | -1} {
  const u = ((now - g.startedAt) / SKY_GIFTS_GAME.crossingMs) % 2, there = u < 1;
  const t = there ? u : 2 - u;
  return {x: -.08 + 1.16 * (t * t * (3 - 2 * t)), facing: there ? 1 : -1};
}
/** Seconds left in the game. */
export const skyGiftsLeft = (g: SkyGiftsGame) => Math.max(0, Math.ceil((SKY_GIFTS_GAME.ms - (g.now - g.startedAt)) / 1000));
/** The finger (or the arrow keys) says where the rabbit goes; it keeps inside the field. */
export function aimSkyGifts(g: SkyGiftsGame, x: number): void { if (Number.isFinite(x)) g.targetX = clamp(x, SKY_GIFTS_GAME.basketHalf, 1 - SKY_GIFTS_GAME.basketHalf); }

/** Moves the game to `now`, in small steps so a slow frame never lets a present pass through the basket. */
export function advanceSkyGifts(g: SkyGiftsGame, now: number): void {
  g.events = {caught: [], missed: [], trapped: [], dodged: []};
  if (g.over) return;
  const c = SKY_GIFTS_GAME, end = Math.min(now, g.startedAt + c.ms);
  while (g.now < end) {
    const dt = Math.min(16, end - g.now), s = dt / 1000; g.now += dt;
    g.basketX += (g.targetX - g.basketX) * (1 - Math.exp(-c.follow * s));
    g.sleighX = sleighAt(g, g.now).x;
    if (g.now >= g.nextDropAt) {
      const progress = Math.min(1, g.dropped / c.rampDrops), safe = g.dropped < c.safeDrops;
      const speed = c.fallStart + (c.fallMax - c.fallStart) * progress * (.85 + .3 * random(g)), sway = (random(g) - .5) * .05, colour = Math.floor(random(g) * 4) as FallingGift['colour'];
      const trap = !safe && random(g) < c.trapStart + (c.trapMax - c.trapStart) * progress, kind: FallingKind = !trap ? 'gift' : random(g) < c.bombShare ? 'bomb' : 'poison';
      g.gifts.push({id: g.dropped++, x: clamp(g.sleighX, .07, .93), y: c.sleighY + .04, speed, sway, colour, kind});
      g.drop = Math.max(c.dropMin, g.drop * c.dropFactor); g.nextDropAt = g.now + g.drop * (.8 + .4 * random(g));
    }
    for (let i = g.gifts.length - 1; i >= 0; i--) {
      const gift = g.gifts[i], before = gift.y;
      gift.y += gift.speed * s; gift.x = clamp(gift.x + gift.sway * s, .04, .96);
      // Caught when it enters the basket band right above the basket.
      if (before < c.catchBottom && gift.y >= c.catchTop && Math.abs(gift.x - g.basketX) <= c.basketHalf) {
        g.gifts.splice(i, 1);
        if (gift.kind === 'gift') { g.caught++; g.events.caught.push(gift); continue; }
        g.events.trapped.push(gift);
        if (gift.kind === 'poison') { g.poisoned++; g.caught = Math.max(0, g.caught - c.poisonGifts); continue; }
        // A bomb: the game ends at once, with what was caught so far.
        g.exploded = true; g.over = true; break;
      }
      if (gift.y >= c.groundY) {
        g.gifts.splice(i, 1);
        if (gift.kind === 'gift') { g.missed++; g.events.missed.push(gift); } else g.events.dodged.push(gift);
      }
    }
    if (g.over || g.missed >= c.misses) { g.over = true; break; }
  }
  if (g.now >= g.startedAt + c.ms) g.over = true;
}
