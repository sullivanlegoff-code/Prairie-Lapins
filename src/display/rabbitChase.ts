import type {Point} from '../ui/gestures';
import {endRabbitActivity, motionZone, startRabbitActivity, type Box, type RabbitMotion} from './rabbitMotion';

/** Laboratory only: starts a chase at once in every enclosure that allows one. */
export const CHASE_EVENT = 'prairie-chase-test';
export const CHASE_GAP: readonly [number, number] = [40_000, 90_000];
export const CHASE_DURATION: readonly [number, number] = [3000, 5000];
/** The follower aims this far behind the leader, so it trails without touching. */
export const CHASE_TRAIL = 22;
const hash = (id: string) => { let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Deterministic per enclosure clock (seeded by its id, so enclosures are never in step); independent of the save and its randomness. */
export class RabbitChaseClock {
  private seed: number;
  remaining: number;
  constructor(readonly enclosureId: string) { this.seed = hash(enclosureId); this.remaining = this.between(CHASE_GAP); }
  random(): number { this.seed = (this.seed + 0x6D2B79F5) >>> 0; let t = this.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  between([a, b]: readonly [number, number]): number { return a + (b - a) * this.random(); }
  /** True when a chase is due in this enclosure (the next one is then scheduled). */
  step(dt: number, eligibleCount: number, reduced: boolean): boolean {
    if (reduced || eligibleCount < 2) return false;
    this.remaining -= Math.max(0, Math.min(dt, 1000));
    if (this.remaining > 0) return false;
    this.remaining = this.between(CHASE_GAP); return true;
  }
  force(): void { this.remaining = 0; }
}

/** A point behind the leader, clamped to the enclosure promenade. */
export function chaseTarget(leader: Point, facing: 1 | -1, zone: Box, distance = CHASE_TRAIL): Point {
  return {x: Math.max(zone.minX, Math.min(zone.maxX, leader.x - facing * distance)), y: Math.max(zone.minY, Math.min(zone.maxY, leader.y))};
}
/** The far side of the promenade from `p`, a little inside the fence: where the leader runs to. */
export function chaseRunTarget(p: Point, zone: Box): Point {
  return {x: p.x < (zone.minX + zone.maxX) / 2 ? zone.maxX - 3 : zone.minX + 3, y: p.y < (zone.minY + zone.maxY) / 2 ? zone.maxY - 2 : zone.minY + 2};
}

/** `available`: not Benny, not in a legendary show or a Magician act, not carried or talking, visible in its enclosure. */
export interface ChaseRunner {id: string; group: string; motion: RabbitMotion; available: boolean}
export interface Chase {group: string; lead: string; follow: string; elapsed: number; duration: number}
const free = (r: ChaseRunner) => r.available && (r.motion.mode === 'rest' || r.motion.mode === 'walk');

/** Visual-only chases, one at most per enclosure; never in reduced motion. */
export class RabbitChases {
  private clocks = new Map<string, RabbitChaseClock>();
  readonly active = new Map<string, Chase>();
  step(dt: number, runners: readonly ChaseRunner[], lifeActive: boolean, reduced: boolean, force = false): void {
    const ms = lifeActive && Number.isFinite(dt) && dt >= 0 && dt <= 1000 ? dt : 0, byId = new Map(runners.map(r => [r.id, r]));
    for (const chase of [...this.active.values()]) {
      const lead = byId.get(chase.lead), follow = byId.get(chase.follow);
      chase.elapsed += ms;
      // Stopped cleanly when it is over, when either runner is needed elsewhere, or when the leader was interrupted (a touch).
      if (!lead || !follow || !lead.available || !follow.available || lead.motion.mode !== 'zoom' || follow.motion.mode !== 'zoom' || reduced || chase.elapsed >= chase.duration) { this.end(chase, lead, follow); continue; }
      startRabbitActivity(follow.motion, 'zoom', chaseTarget(lead.motion.local, lead.motion.facing, motionZone(lead.motion)));
    }
    const groups = new Map<string, ChaseRunner[]>();
    for (const r of runners) if (!this.active.has(r.group)) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
    for (const [group, members] of groups) {
      let clock = this.clocks.get(group); if (!clock) { clock = new RabbitChaseClock(group); this.clocks.set(group, clock); }
      const eligible = members.filter(free);
      if (force && !reduced) clock.force();
      if (!clock.step(force ? Math.max(ms, 1) : ms, eligible.length, reduced)) continue;
      const first = Math.floor(clock.random() * eligible.length), lead = eligible[first], follow = eligible[(first + 1) % eligible.length];
      const zone = motionZone(lead.motion);
      startRabbitActivity(lead.motion, 'zoom', chaseRunTarget(lead.motion.local, zone));
      startRabbitActivity(follow.motion, 'zoom', chaseTarget(lead.motion.local, lead.motion.facing, zone));
      this.active.set(group, {group, lead: lead.id, follow: follow.id, elapsed: 0, duration: clock.between(CHASE_DURATION)});
    }
  }
  /** Both runners stop where they are and go back to their usual life. */
  private end(chase: Chase, ...runners: (ChaseRunner | undefined)[]): void {
    for (const r of runners) if (r?.motion.mode === 'zoom') endRabbitActivity(r.motion);
    this.active.delete(chase.group);
  }
  isChasing(id: string): boolean { return [...this.active.values()].some(c => c.lead === id || c.follow === id); }
  reset(runners: readonly ChaseRunner[] = []): void {
    const byId = new Map(runners.map(r => [r.id, r]));
    for (const chase of [...this.active.values()]) this.end(chase, byId.get(chase.lead), byId.get(chase.follow));
  }
}
