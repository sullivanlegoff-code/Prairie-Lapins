import type {Point} from '../ui/gestures';
import {endRabbitActivity, motionZone, startRabbitActivity, type Box, type RabbitMotion} from './rabbitMotion';

/**
 * The Christmas snowball fights (owner, 4 November 2026: « je veux que les lapins fassent de mini batailles de boules de neige »).
 * Presentation only, like the chases: now and then two free rabbits of an enclosure step a little apart, face each other and
 * throw a few tiny snowballs in turn; each hit leaves a small puff. Never in reduced motion, never saved.
 */
export const SNOWBALL_EVENT = 'prairie-snowball-test';
export const SNOWBALL_GAP: readonly [number, number] = [45_000, 100_000];
/** Distance between the two throwers (enclosure units), and the time to get there before the first throw. */
export const SNOWBALL_SPACING = 46, SNOWBALL_SETUP_MAX = 2600;
/** Throws per fight, the flight of one snowball and the pause between two throws (ms). */
export const SNOWBALL_THROWS: readonly [number, number] = [3, 5];
export const SNOWBALL_FLIGHT = 620, SNOWBALL_PAUSE = 380;
/** Height of the snowball's arc above the straight line (enclosure units). */
export const SNOWBALL_ARC = 16;
const hash = (id: string) => { let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export interface SnowballThrower {id: string; group: string; motion: RabbitMotion; available: boolean}
/** A snowball in the air: from the thrower's paws to the other's body, `u` from 0 to 1. */
export interface Snowball {group: string; from: string; to: string; u: number}
interface Fight {group: string; a: string; b: string; elapsed: number; throws: number; thrown: number; next: number; ball: Snowball | null}
const free = (r: SnowballThrower) => r.available && (r.motion.mode === 'rest' || r.motion.mode === 'walk');

/** The two standing places, side by side across the middle of the fenced area (kept inside it). */
export function fightPlaces(a: Point, b: Point, zone: Box, spacing = SNOWBALL_SPACING): [Point, Point] {
  const cx = Math.max(zone.minX + spacing / 2, Math.min(zone.maxX - spacing / 2, (a.x + b.x) / 2));
  const cy = Math.max(zone.minY, Math.min(zone.maxY, (a.y + b.y) / 2)), left = a.x <= b.x;
  const l = {x: cx - spacing / 2, y: cy}, r = {x: cx + spacing / 2, y: cy};
  return left ? [l, r] : [r, l];
}
/** Position of a snowball along its arc, in enclosure units; `lift` is how high it is above the ground line. */
export function snowballPoint(from: Point, to: Point, u: number, arc = SNOWBALL_ARC): {x: number; y: number; lift: number} {
  const t = Math.max(0, Math.min(1, u));
  return {x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, lift: arc * 4 * t * (1 - t)};
}

export class SnowballFights {
  private clocks = new Map<string, {seed: number; remaining: number}>();
  readonly active = new Map<string, Fight>();
  /** Snowballs that landed during the last step: the display shows a puff on the target. */
  readonly hits: Snowball[] = [];
  private random(clock: {seed: number}): number { clock.seed = (clock.seed + 0x6D2B79F5) >>> 0; let t = clock.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  private clock(group: string) {
    let clock = this.clocks.get(group);
    if (!clock) { clock = {seed: hash(group) ^ 0x51ab, remaining: 0}; clock.remaining = this.between(clock, SNOWBALL_GAP); this.clocks.set(group, clock); }
    return clock;
  }
  private between(clock: {seed: number}, [a, b]: readonly [number, number]): number { return a + (b - a) * this.random(clock); }

  /** `enabled`: the Christmas event is on. */
  step(dt: number, throwers: readonly SnowballThrower[], lifeActive: boolean, reduced: boolean, enabled: boolean, force = false): void {
    this.hits.length = 0;
    const ms = lifeActive && Number.isFinite(dt) && dt >= 0 && dt <= 1000 ? dt : 0, byId = new Map(throwers.map(r => [r.id, r]));
    for (const fight of [...this.active.values()]) {
      const a = byId.get(fight.a), b = byId.get(fight.b);
      // Stopped at once when either rabbit is needed elsewhere or touched (it leaves its 'meet' place), or the event ends.
      if (!enabled || reduced || !a || !b || !a.available || !b.available || a.motion.mode !== 'meet' || b.motion.mode !== 'meet') { this.end(fight, a, b); continue; }
      fight.elapsed += ms;
      const arrived = a.motion.elapsed >= a.motion.duration && b.motion.elapsed >= b.motion.duration;
      if (!arrived && fight.elapsed < SNOWBALL_SETUP_MAX) continue;
      // Face each other once in place.
      const left = a.motion.local.x <= b.motion.local.x;
      a.motion.facing = left ? 1 : -1; b.motion.facing = left ? -1 : 1;
      if (fight.ball) {
        fight.ball.u += ms / SNOWBALL_FLIGHT;
        if (fight.ball.u >= 1) { this.hits.push({...fight.ball, u: 1}); fight.ball = null; fight.next = SNOWBALL_PAUSE; }
        continue;
      }
      fight.next -= ms;
      if (fight.next > 0) continue;
      if (fight.thrown >= fight.throws) { this.end(fight, a, b); continue; }
      const from = fight.thrown % 2 === 0 ? fight.a : fight.b;
      fight.ball = {group: fight.group, from, to: from === fight.a ? fight.b : fight.a, u: 0}; fight.thrown++;
    }
    if (!enabled) return;
    const groups = new Map<string, SnowballThrower[]>();
    for (const r of throwers) if (!this.active.has(r.group)) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
    for (const [group, members] of groups) {
      const clock = this.clock(group), eligible = members.filter(free);
      if (reduced || eligible.length < 2) continue;
      if (force) clock.remaining = 0; else clock.remaining -= Math.max(0, Math.min(ms, 1000));
      if (clock.remaining > 0) continue;
      clock.remaining = this.between(clock, SNOWBALL_GAP);
      const first = Math.floor(this.random(clock) * eligible.length), a = eligible[first], b = eligible[(first + 1) % eligible.length];
      const [pa, pb] = fightPlaces(a.motion.local, b.motion.local, motionZone(a.motion));
      startRabbitActivity(a.motion, 'meet', pa); startRabbitActivity(b.motion, 'meet', pb);
      const throws = Math.round(this.between(clock, SNOWBALL_THROWS));
      this.active.set(group, {group, a: a.id, b: b.id, elapsed: 0, throws, thrown: 0, next: 250, ball: null});
    }
  }
  /** The snowballs in the air now. */
  balls(): Snowball[] { return [...this.active.values()].flatMap(f => f.ball ? [f.ball] : []); }
  isFighting(id: string): boolean { return [...this.active.values()].some(f => f.a === id || f.b === id); }
  private end(fight: Fight, ...throwers: (SnowballThrower | undefined)[]): void {
    for (const r of throwers) if (r?.motion.mode === 'meet') endRabbitActivity(r.motion);
    this.active.delete(fight.group);
  }
  reset(throwers: readonly SnowballThrower[] = []): void {
    const byId = new Map(throwers.map(r => [r.id, r]));
    for (const fight of [...this.active.values()]) this.end(fight, byId.get(fight.a), byId.get(fight.b));
    this.hits.length = 0;
  }
}
