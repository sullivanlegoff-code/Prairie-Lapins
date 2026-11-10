/**
 * The evolved Magicien's magic shows on the meadow (owner, 10 November 2026: « plus animé et capable de faire de la magie », full
 * freedom). Pure clock and curves, apart from Phaser so they can be tested; purely visual, nothing is saved.
 *
 * Every trick is a short show of painted poses (src/config/magicienArt.ts) and painted effects:
 * - sparks: he raises his wand high and a burst of stars and golden twinkles springs from its tip;
 * - circle: he points his wand at the ground, a magic circle opens under him, golden runes rise from it;
 * - levitation: eyes closed, his cape floating, he rises a little above a faint circle, twinkles under his paws;
 * - firework: he twirls his wand, a comet shoots up from its tip and bursts into a violet and gold firework, stars raining down,
 *   then he bows;
 * - butterflies: he points at the ground in front of him, a puff of violet smoke, and magic butterflies fly away; then he bows;
 * - spell: he turns to a friend resting in his enclosure and points his wand at it: a trail of twinkles flies to the friend, who
 *   glows and floats a moment among twinkles; then he bows. Only when such a friend is there.
 * Between two tricks, a little twinkle now and then at the tip of his wand.
 */
export type MagicienAct = 'sparks' | 'circle' | 'levitation' | 'firework' | 'butterflies' | 'spell';
export const MAGICIEN_ACTS: readonly MagicienAct[] = ['sparks', 'circle', 'levitation', 'firework', 'butterflies', 'spell'];
/** The painted poses (the rest is his usual drawing). */
export type MagicienPose = 'cast' | 'point' | 'twirl' | 'float' | 'bow';
export const MAGICIEN_POSES: readonly MagicienPose[] = ['cast', 'point', 'twirl', 'float', 'bow'];
export const MAGICIEN_DURATION: Record<MagicienAct, number> = {sparks: 2200, circle: 3000, levitation: 3200, firework: 3600, butterflies: 3600, spell: 3800};
/** Time between two tricks (ms): more often than before 10 November 2026 (15 to 30 s). */
export const MAGICIEN_GAP = {first: [5_000, 12_000], next: [9_000, 18_000]} as const;
/** A little twinkle at the wand's tip between tricks, every so often (ms), lasting TWINKLE_MS. */
export const TWINKLE_GAP = [2_200, 4_500] as const, TWINKLE_MS = 700;
export interface MagicienActState {act: MagicienAct; elapsed: number; duration: number}
const hash = (id: string) => { let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (v: number, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const ease = (u: number) => { u = clamp(u); return u * u * (3 - 2 * u); };
/** 0 → 1 between `a` and `b` ms. */
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
/** 0 outside [a, b], rising and falling smoothly inside (a bump). */
const bump = (t: number, a: number, b: number) => Math.sin(Math.PI * span(t, a, b));
/**
 * A spontaneous trick starts only while the Magicien rests, and takes part in nothing else (audit, 4 November 2026): never asleep,
 * walking, during a kiss, a picnic, a chase or a visit to a decoration. While a trick plays he stays where he is.
 */
export const magicienFree = (mode: string | undefined, occupied: boolean): boolean => !occupied && mode === 'rest';

export class MagicienClock {
  act: MagicienActState | null = null;
  /** The twinkle at the wand's tip between tricks: its age (ms), or -1. */
  twinkle = -1;
  private seed: number;
  private next: number;
  private nextTwinkle: number;
  private last: MagicienAct | null = null;
  constructor(readonly id: string) { this.seed = hash(id); this.next = this.between(MAGICIEN_GAP.first); this.nextTwinkle = this.between(TWINKLE_GAP); }
  private random(): number { this.seed = (this.seed + 0x6D2B79F5) >>> 0; let t = this.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  private between([a, b]: readonly [number, number]): number { return a + (b - a) * this.random(); }
  /** Starts a trick now (the laboratory's buttons); a spell needs a friend (`friend`). */
  play(act: MagicienAct, friend = true): MagicienActState | null { if (this.act || !MAGICIEN_ACTS.includes(act) || (act === 'spell' && !friend)) return null; return this.start(act); }
  private start(act: MagicienAct): MagicienActState { this.last = act; this.twinkle = -1; return this.act = {act, elapsed: 0, duration: MAGICIEN_DURATION[act]}; }
  /**
   * One frame: the running trick goes on (and ends), or, when he is free, the wait for the next one goes down and a trick starts:
   * never the same twice in a row, a spell only if `friend`. Returns the trick that has just started.
   */
  step(dt: number, eligible: boolean, reduced: boolean, friend = false): MagicienActState | null {
    const ms = Math.max(0, Math.min(dt, 1000));
    if (this.act) { this.act.elapsed += ms; if (this.act.elapsed >= this.act.duration) { this.act = null; this.next = this.between(MAGICIEN_GAP.next); } return null; }
    if (this.twinkle >= 0) { this.twinkle += ms; if (this.twinkle >= TWINKLE_MS) this.twinkle = -1; }
    if (!eligible || reduced) { this.twinkle = -1; return null; }
    this.nextTwinkle -= ms; if (this.nextTwinkle <= 0 && this.twinkle < 0) { this.twinkle = 0; this.nextTwinkle = this.between(TWINKLE_GAP); }
    this.next -= ms; if (this.next > 0) return null;
    const choices = MAGICIEN_ACTS.filter(act => act !== this.last && (act !== 'spell' || friend));
    return this.start(choices[Math.floor(this.random() * choices.length)]);
  }
}

/** The painted pose shown at `elapsed` ms of a trick, or null for his usual drawing. */
export function magicienPose(act: MagicienAct, elapsed: number): MagicienPose | null {
  const t = elapsed, within = (a: number, b: number) => t >= a && t < b;
  switch (act) {
    case 'sparks': return within(120, 1900) ? 'cast' : null;
    case 'circle': return within(100, 2750) ? 'point' : null;
    case 'levitation': return within(250, 2950) ? 'float' : null;
    case 'firework': return within(0, 900) ? 'twirl' : within(900, 2500) ? 'cast' : within(2600, 3400) ? 'bow' : null;
    case 'butterflies': return within(100, 1500) ? 'point' : within(2300, 3300) ? 'bow' : null;
    case 'spell': return within(100, 2100) ? 'point' : within(2700, 3600) ? 'bow' : null;
  }
}
/** How high he floats (0 → 1 → 0) during his levitation. */
export const magicienLevitation = (act: MagicienAct, elapsed: number): number => act === 'levitation' ? ease(span(elapsed, 200, 900)) * (1 - ease(span(elapsed, 2500, 3100))) : 0;
/** The burst of stars from the wand's tip (sparks): offset from the tip and opacity of star `index` of `count`. */
export function magicienSparks(elapsed: number, index: number, count: number): {x: number; y: number; alpha: number; scale: number} {
  const u = span(elapsed, 350, 1900), angle = -Math.PI * .95 + index / Math.max(1, count - 1) * Math.PI * .9;
  const travel = 18 + (index * 7 % 13);
  return {x: Math.cos(angle) * travel * ease(u), y: Math.sin(angle) * travel * ease(u) + 14 * u * u, alpha: u <= 0 ? 0 : 1 - u * u, scale: .6 + .5 * Math.sin(Math.PI * u)};
}
/** The magic circle under him: its size (0 → 1), opacity and turn (radians). Circle trick, and faintly under his levitation. */
export function magicienCircle(act: MagicienAct, elapsed: number): {size: number; alpha: number; turn: number} {
  if (act === 'circle') return {size: .55 + .45 * ease(span(elapsed, 250, 900)), alpha: Math.min(ease(span(elapsed, 250, 600)), 1 - ease(span(elapsed, 2500, 3000))), turn: elapsed / 1000 * 1.4};
  if (act === 'levitation') return {size: .8, alpha: .55 * bump(elapsed, 200, 3100), turn: -elapsed / 1000 * 1.1};
  return {size: 0, alpha: 0, turn: 0};
}
/** Rune `index` of `count` rising from the circle's edge (circle trick): its angle round the circle, height and opacity. */
export function magicienRune(elapsed: number, index: number, count: number): {angle: number; rise: number; alpha: number} {
  const start = 700 + index * 260, u = span(elapsed, start, start + 1300);
  return {angle: index / count * Math.PI * 2 + elapsed / 1000 * .9, rise: 26 * ease(u), alpha: u <= 0 ? 0 : Math.sin(Math.PI * u)};
}
/** The firework: the comet's climb from the tip (0 → 1, then gone), the burst (size and opacity), the rain of stars (0 → 1). */
export function magicienFirework(elapsed: number): {comet: number; cometAlpha: number; burst: number; burstAlpha: number; rain: number} {
  const climb = span(elapsed, 1000, 1650);
  return {comet: ease(climb), cometAlpha: elapsed >= 1000 && elapsed < 1650 ? 1 : 0,
    burst: elapsed < 1650 ? 0 : .35 + .85 * ease(span(elapsed, 1650, 2100)), burstAlpha: elapsed < 1650 ? 0 : 1 - ease(span(elapsed, 2000, 2800)),
    rain: span(elapsed, 1750, 3300)};
}
/** The butterflies: the puff of smoke (size and opacity), then butterfly `index` flying away (progress 0 → 1, opacity, wings open). */
export function magicienSmoke(elapsed: number): {size: number; alpha: number} {
  return {size: .4 + .8 * ease(span(elapsed, 500, 1300)), alpha: Math.min(ease(span(elapsed, 500, 700)), 1 - ease(span(elapsed, 1000, 1700)))};
}
export function magicienButterfly(elapsed: number, index: number): {u: number; alpha: number; open: boolean} {
  const start = 850 + index * 140, u = span(elapsed, start, start + 2300);
  return {u: ease(u) * .3 + u * .7, alpha: u <= 0 ? 0 : Math.min(1, u * 8, (1 - u) * 4), open: Math.floor(elapsed / 110 + index) % 2 === 0};
}
/** The spell: the twinkles' flight from the wand to the friend (0 → 1), and the friend's glow and float (0 → 1 → 0). */
export function magicienSpell(elapsed: number): {flight: number; flightAlpha: number; friend: number} {
  return {flight: ease(span(elapsed, 450, 1350)), flightAlpha: elapsed >= 450 && elapsed < 1450 ? 1 : 0, friend: bump(elapsed, 1300, 3300)};
}
/** How high the enchanted friend floats (scene units), and the little twinkles' turn round it. */
export const SPELL_LIFT = 10, LEVITATION_LIFT = 16;
