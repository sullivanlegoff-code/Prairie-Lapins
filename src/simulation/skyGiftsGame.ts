/**
 * The Christmas mini-game « Les cadeaux du ciel » (concept noel-v1 B, owner's choice of 4 November 2026): the sleigh crosses the
 * night sky and drops presents; the player slides their rabbit and its basket to catch them. A game lasts SKY_GIFTS_GAME.ms or
 * ends after SKY_GIFTS_GAME.misses presents fall into the snow. Pure functions of the time, so tests can play a whole game; the
 * reward is the simulation's 'rewardSkyGifts' command. The field runs from 0 to 1 across and from 0 (top) to 1 (bottom).
 */
export const SKY_GIFTS_GAME = {
  ms: 45_000, misses: 3,
  /** Time between two presents: first, fastest, and how much shorter each one makes it. */
  dropStart: 1150, dropMin: 520, dropFactor: .975,
  /** Falling speed in field heights per second: first and fastest. */
  fallStart: .30, fallMax: .62,
  /** Sleigh height, and the time of one crossing of the sky. */
  sleighY: .14, crossingMs: 5200,
  /** Basket half width and the band of heights where a present lands in it. */
  basketHalf: .085, catchTop: .74, catchBottom: .86,
  /** Below this height a present is lost in the snow. */
  groundY: .95,
  /** Where the rabbit starts, and how fast it follows the finger (share of the gap closed in one second, frame-rate free). */
  startX: .5, follow: 14,
} as const;

export interface FallingGift {id: number; x: number; y: number; speed: number; sway: number; colour: 0 | 1 | 2 | 3}
export interface SkyGiftsGame {
  startedAt: number; now: number; seed: number;
  sleighX: number; basketX: number; targetX: number;
  gifts: FallingGift[]; nextDropAt: number; drop: number; dropped: number;
  caught: number; missed: number; over: boolean;
  /** What happened in the last advance, for the display: caught and lost presents. */
  events: {caught: FallingGift[]; missed: FallingGift[]};
}

const random = (g: SkyGiftsGame) => { g.seed = (g.seed + 0x6D2B79F5) >>> 0; let t = g.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function startSkyGifts(now: number, seed = Math.floor(now) >>> 0): SkyGiftsGame {
  const c = SKY_GIFTS_GAME;
  return {startedAt: now, now, seed: seed || 1, sleighX: 0, basketX: c.startX, targetX: c.startX, gifts: [], nextDropAt: now + 900, drop: c.dropStart, dropped: 0,
    caught: 0, missed: 0, over: false, events: {caught: [], missed: []}};
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
  g.events = {caught: [], missed: []};
  if (g.over) return;
  const c = SKY_GIFTS_GAME, end = Math.min(now, g.startedAt + c.ms);
  while (g.now < end) {
    const dt = Math.min(16, end - g.now), s = dt / 1000; g.now += dt;
    g.basketX += (g.targetX - g.basketX) * (1 - Math.exp(-c.follow * s));
    g.sleighX = sleighAt(g, g.now).x;
    if (g.now >= g.nextDropAt) {
      const progress = Math.min(1, g.dropped / 60);
      g.gifts.push({id: g.dropped++, x: clamp(g.sleighX, .07, .93), y: c.sleighY + .04, speed: c.fallStart + (c.fallMax - c.fallStart) * progress * (.85 + .3 * random(g)),
        sway: (random(g) - .5) * .05, colour: Math.floor(random(g) * 4) as FallingGift['colour']});
      g.drop = Math.max(c.dropMin, g.drop * c.dropFactor); g.nextDropAt = g.now + g.drop * (.8 + .4 * random(g));
    }
    for (let i = g.gifts.length - 1; i >= 0; i--) {
      const gift = g.gifts[i], before = gift.y;
      gift.y += gift.speed * s; gift.x = clamp(gift.x + gift.sway * s, .04, .96);
      // Caught when it enters the basket band right above the basket.
      if (before < c.catchBottom && gift.y >= c.catchTop && Math.abs(gift.x - g.basketX) <= c.basketHalf) { g.gifts.splice(i, 1); g.caught++; g.events.caught.push(gift); continue; }
      if (gift.y >= c.groundY) { g.gifts.splice(i, 1); g.missed++; g.events.missed.push(gift); }
    }
    if (g.missed >= c.misses) { g.over = true; break; }
  }
  if (g.now >= g.startedAt + c.ms) g.over = true;
}
