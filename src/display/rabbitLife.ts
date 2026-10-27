import {canSalto, endRabbitActivity, KISS_MS, motionZone, startRabbitActivity, startWalk, triggerWelcomeSalto, type RabbitMotion} from './rabbitMotion';
import {rabbitFaceSeed} from './rabbitBlink';

export interface LifeResident {id: string; group: string; motion: RabbitMotion; visible: boolean; nest?: boolean}
export interface LifeTiming {zoomGap: readonly [number, number]; sleepGap: readonly [number, number]; socialGap: readonly [number, number]}
export const LIFE_TIMING: LifeTiming = {zoomGap: [90_000, 90_000], sleepGap: [60_000, 120_000], socialGap: [30_000, 60_000]};
export const NAP_MS = 60_000;
export const NEST_KISS_MS = 15_000;
type Individual = {group: string; motion: RabbitMotion; napIn: number; sleeping: number | null; nest?: boolean};
type Pair = {a: string; b: string; elapsed: number; kissing: boolean};
type Nest = {ids: string; due: number; pair: Pair | null; moveIn: number[]; saltoIn: number[]; zoomIn: number; zoomTurn: number};
const available = (m: RabbitMotion) => m.mode === 'rest' || m.mode === 'walk';
const special = (m: RabbitMotion) => ['sleep', 'zoom', 'meet', 'kiss'].includes(m.mode);
function napPhase(id: string): number {
  let seed = rabbitFaceSeed(id) ^ 0xa511e9b3;
  seed = Math.imul(seed ^ seed >>> 16, 0x7feb352d);
  seed = Math.imul(seed ^ seed >>> 15, 0x846ca68b);
  return ((seed ^ seed >>> 16) >>> 0) / 4294967296;
}

/** Visual-only clocks. They consume visible meadow time, never the save's clock or breeding RNG. */
export class RabbitLife {
  private residents = new Map<string, Individual>();
  private seed = 0x62756e6e;
  private zoomIn: number;
  private socialIn: number;
  private zoom: {id: string; remaining: number} | null = null;
  private pair: Pair | null = null;
  private nests = new Map<string, Nest>();
  constructor(private timing: LifeTiming = LIFE_TIMING) {
    this.zoomIn = this.between(timing.zoomGap);
    this.socialIn = this.between(timing.socialGap);
  }
  private between(range: readonly [number, number]): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return range[0] + (range[1] - range[0]) * this.seed / 4294967296;
  }
  reset(): void {
    for (const r of this.residents.values()) if (special(r.motion)) endRabbitActivity(r.motion);
    this.residents.clear(); this.zoom = null; this.pair = null; this.nests.clear();
    this.zoomIn = this.between(this.timing.zoomGap);
    this.socialIn = this.between(this.timing.socialGap);
  }
  /** User actions and Dadi's confirmed dialogue always take precedence. */
  interrupt(id: string): void {
    const r = this.residents.get(id);
    const nest = [...this.nests.values()].find(n => n.pair && [n.pair.a, n.pair.b].includes(id));
    if (!(r && (special(r.motion) || r.sleeping !== null)) && this.zoom?.id !== id && !this.pairIds().includes(id) && !nest) return;
    if (r) {
      if (special(r.motion)) endRabbitActivity(r.motion);
      r.sleeping = null; r.napIn = this.between(this.timing.sleepGap);
    }
    if (this.zoom?.id === id) this.zoom = null;
    if (this.pair && [this.pair.a, this.pair.b].includes(id)) this.endPair();
    if (nest) { this.finishPair(nest.pair!); nest.pair = null; }
  }
  private finishPair(pair: Pair): void {
    for (const id of [pair.a, pair.b]) {
      const r = this.residents.get(id);
      if (r && ['meet', 'kiss'].includes(r.motion.mode)) {
        if (r.nest) startWalk(r.motion, r.motion.home); else endRabbitActivity(r.motion);
      }
    }
  }
  private endPair(): void {
    if (this.pair) this.finishPair(this.pair);
    this.pair = null;
  }
  step(dt: number, input: readonly LifeResident[], active: boolean, reducedMotion: boolean, priority: readonly string[] = []): void {
    const live = new Map(input.map(r => [r.id, r]));
    for (const [id, r] of this.residents) {
      const current = live.get(id);
      if (!current || current.group !== r.group || current.motion !== r.motion) { this.interrupt(id); this.residents.delete(id); }
    }
    for (const r of input) if (!this.residents.has(r.id)) {
      // Independent first nap, so no freshly drawn habitat falls asleep in unison.
      const phase = napPhase(r.id);
      const firstMin = Math.min(this.timing.sleepGap[0], 15_000), firstMax = Math.min(this.timing.sleepGap[1], 45_000);
      this.residents.set(r.id, {group: r.group, motion: r.motion, napIn: firstMin + phase * (firstMax - firstMin), sleeping: null, nest: r.nest});
    }
    for (const id of priority) this.interrupt(id);
    if (reducedMotion) {
      if (this.zoom) this.interrupt(this.zoom.id);
      if (this.pair) this.endPair();
    }
    // A meeting needs both partners on screen; do not leave one hopping alone at the edge.
    if (this.pair && (!live.get(this.pair.a)?.visible || !live.get(this.pair.b)?.visible)) this.endPair();
    // A suspended tab must never skip a whole nap or burst. Ordinary long frames are bounded too.
    const ms = active && Number.isFinite(dt) && dt >= 0 && dt <= 1000 ? dt : 0;
    // A nest can be the only visible group: release its global running lock there too.
    if (this.zoom) {
      const runner = live.get(this.zoom.id);
      if (runner && !runner.visible) this.interrupt(runner.id);
      else if (!runner || runner.motion.mode !== 'zoom') this.zoom = null;
      else if (runner.visible) {
        this.zoom.remaining -= ms;
        if (this.zoom.remaining <= 0) this.interrupt(runner.id);
      }
    }
    this.stepNests(ms, input, reducedMotion, priority);
    const seen = input.filter(r => !r.nest && r.visible && !priority.includes(r.id));
    if (!ms || !seen.length) return;
    if (!reducedMotion) { this.zoomIn -= ms; this.socialIn -= ms; }
    let sleepers = [...this.residents.values()].filter(r => r.sleeping !== null && r.motion.mode === 'sleep').length;
    for (const rabbit of seen) {
      const r = this.residents.get(rabbit.id)!;
      if (r.sleeping !== null) {
        if (r.motion.mode !== 'sleep') { r.sleeping = null; r.napIn = this.between(this.timing.sleepGap); }
        else {
          r.sleeping -= ms;
          if (r.sleeping <= 0) { endRabbitActivity(r.motion); r.sleeping = null; r.napIn = this.between(this.timing.sleepGap); sleepers--; }
        }
      } else {
        r.napIn -= ms;
        if (sleepers < 2 && r.napIn <= 0 && r.motion.mode === 'rest' && this.zoom?.id !== rabbit.id && !this.pairIds().includes(rabbit.id)) {
          startRabbitActivity(r.motion, 'sleep'); r.sleeping = NAP_MS; sleepers++;
        }
      }
    }
    if (!this.zoom && !reducedMotion) {
      if (this.zoomIn <= 0) {
        let eligible = seen.filter(r => available(r.motion) && !this.pairIds().includes(r.id));
        if (!eligible.length) {
          const sleeper = seen.find(r => r.motion.mode === 'sleep');
          if (sleeper) { this.interrupt(sleeper.id); eligible = [sleeper]; }
        }
        const rabbit = eligible[Math.floor(this.between([0, eligible.length]))];
        if (rabbit) {
          const zone = motionZone(rabbit.motion), p = rabbit.motion.local;
          startRabbitActivity(rabbit.motion, 'zoom', {x: p.x < (zone.minX + zone.maxX) / 2 ? zone.maxX - 3 : zone.minX + 3,
            y: p.y < (zone.minY + zone.maxY) / 2 ? zone.maxY - 2 : zone.minY + 2});
          this.zoom = {id: rabbit.id, remaining: this.between([5000, 8000])};
          this.zoomIn = this.between(this.timing.zoomGap);
        } else this.zoomIn = 1000;
      }
    }
    if (this.pair) {
      const a = live.get(this.pair.a), b = live.get(this.pair.b);
      if (!a || !b || a.group !== b.group || !['meet', 'kiss'].includes(a.motion.mode) || !['meet', 'kiss'].includes(b.motion.mode)) this.endPair();
      else if (a.visible && b.visible) {
        this.pair.elapsed += ms;
        if (!this.pair.kissing && a.motion.elapsed >= a.motion.duration && b.motion.elapsed >= b.motion.duration &&
          Math.hypot(a.motion.local.x - b.motion.local.x, a.motion.local.y - b.motion.local.y) <= 28) {
          startRabbitActivity(a.motion, 'kiss'); startRabbitActivity(b.motion, 'kiss');
          a.motion.facing = a.motion.local.x <= b.motion.local.x ? 1 : -1; b.motion.facing = a.motion.facing === 1 ? -1 : 1;
          this.pair.kissing = true; this.pair.elapsed = 0;
        } else if (this.pair.elapsed >= (this.pair.kissing ? KISS_MS : 20_000)) this.endPair();
      }
    } else if (!reducedMotion) {
      if (this.socialIn <= 0) {
        const availableResidents = seen.filter(r => (available(r.motion) || r.motion.mode === 'sleep') && r.id !== this.zoom?.id);
        const offset = Math.floor(this.between([0, availableResidents.length]));
        const candidates = [...availableResidents.slice(offset), ...availableResidents.slice(0, offset)];
        for (const a of candidates) {
          const b = candidates.find(b => b.id !== a.id && b.group === a.group);
          if (!b) continue;
          const zone = motionZone(a.motion), other = motionZone(b.motion);
          const minX = Math.max(zone.minX, other.minX), maxX = Math.min(zone.maxX, other.maxX);
          const minY = Math.max(zone.minY, other.minY), maxY = Math.min(zone.maxY, other.maxY);
          if (maxX - minX < 28 || maxY <= minY) continue;
          const x = Math.max(minX + 14, Math.min(maxX - 14, (a.motion.local.x + b.motion.local.x) / 2));
          const y = Math.max(minY + 2, Math.min(maxY - 2, (a.motion.local.y + b.motion.local.y) / 2));
          const left = a.motion.local.x <= b.motion.local.x;
          if (a.motion.mode === 'sleep') this.interrupt(a.id);
          if (b.motion.mode === 'sleep') this.interrupt(b.id);
          startRabbitActivity(a.motion, 'meet', {x: x + (left ? -12 : 12), y});
          startRabbitActivity(b.motion, 'meet', {x: x + (left ? 12 : -12), y});
          this.pair = {a: a.id, b: b.id, elapsed: 0, kissing: false};
          this.socialIn = this.between(this.timing.socialGap); break;
        }
        // No compatible pair yet: retry shortly instead of scanning every rendered frame.
        if (!this.pair) this.socialIn = 1000;
      }
    }
  }
  private stepNests(ms: number, input: readonly LifeResident[], reduced: boolean, priority: readonly string[]): void {
    const groups = new Map<string, LifeResident[]>();
    for (const r of input) if (r.nest) { const group = groups.get(r.group) ?? []; group.push(r); groups.set(r.group, group); }
    for (const [id, nest] of this.nests) if (!groups.has(id) || groups.get(id)!.map(r => r.id).join(':') !== nest.ids) {
      if (nest.pair) this.finishPair(nest.pair);
      this.nests.delete(id);
    }
    for (const [id, parents] of groups) {
      if (parents.length !== 2) continue;
      let nest = this.nests.get(id);
      if (!nest) {
        nest = {ids: parents.map(r => r.id).join(':'), due: NEST_KISS_MS, pair: null,
          moveIn: [this.between([700, 1200]), this.between([1400, 2000])],
          saltoIn: [this.between([2000, 3500]), this.between([3500, 5000])], zoomIn: this.between([7000, 10_000]), zoomTurn: 0};
        this.nests.set(id, nest);
      }
      const [a, b] = parents, visible = parents.every(r => r.visible && !priority.includes(r.id));
      if (reduced || !visible) {
        if (nest.pair) this.finishPair(nest.pair); nest.pair = null;
        for (const r of parents) if (r.motion.mode === 'zoom') this.interrupt(r.id);
        continue;
      }
      if (!ms) continue;
      nest.due -= ms;
      if (nest.pair) {
        const pair = nest.pair;
        if (!parents.every(r => ['meet', 'kiss'].includes(r.motion.mode))) { this.finishPair(pair); nest.pair = null; continue; }
        pair.elapsed += ms;
        if (!pair.kissing && parents.every(r => r.motion.elapsed >= r.motion.duration) &&
          Math.hypot(a.motion.local.x - b.motion.local.x, a.motion.local.y - b.motion.local.y) <= 28) {
          parents.forEach(r => startRabbitActivity(r.motion, 'kiss'));
          a.motion.facing = a.motion.local.x <= b.motion.local.x ? 1 : -1; b.motion.facing = a.motion.facing === 1 ? -1 : 1;
          pair.kissing = true; pair.elapsed = 0;
        } else if (pair.elapsed >= (pair.kissing ? KISS_MS : 20_000)) { this.finishPair(pair); nest.pair = null; }
      } else if (nest.due <= 0) {
        for (const r of parents) if (r.motion.mode === 'zoom') this.interrupt(r.id);
        // A scheduled kiss waits for a body already in the air to land.
        if (!parents.every(r => available(r.motion))) continue;
        const x = (a.motion.home.x + b.motion.home.x) / 2, y = (a.motion.home.y + b.motion.home.y) / 2;
        const left = a.motion.local.x <= b.motion.local.x;
        startRabbitActivity(a.motion, 'meet', {x: x + (left ? -12 : 12), y});
        startRabbitActivity(b.motion, 'meet', {x: x + (left ? 12 : -12), y});
        nest.pair = {a: a.id, b: b.id, elapsed: 0, kissing: false}; nest.due = NEST_KISS_MS;
      } else {
        nest.zoomIn -= ms;
        parents.forEach((_, index) => { nest!.moveIn[index] -= ms; nest!.saltoIn[index] -= ms; });
        // The return after a kiss has priority over a new trick or race.
        if (parents.some(r => r.motion.mode === 'walk' && r.motion.to.x === r.motion.home.x && r.motion.to.y === r.motion.home.y)) continue;
        for (const [index, r] of parents.entries()) {
          const m = r.motion, other = parents[1 - index].motion;
          if (!available(m)) continue;
          if (nest.saltoIn[index] <= 0 && nest.due > 1200 && canSalto(m, [other.local])) {
            triggerWelcomeSalto(m, false); nest.saltoIn[index] = this.between([4000, 8000]);
          } else if (nest.zoomIn <= 0 && index === nest.zoomTurn && !this.zoom && nest.due > 4000) {
            const zone = motionZone(m);
            startRabbitActivity(m, 'zoom', {x: m.local.x < 5 ? zone.maxX - 6 : zone.minX + 6, y: this.between([zone.minY + 4, zone.maxY - 4])});
            this.zoom = {id: r.id, remaining: this.between([3000, 4000])}; nest.zoomIn = this.between([10_000, 20_000]); nest.zoomTurn = 1 - index;
          } else if (nest.moveIn[index] <= 0 && nest.due > 500) {
            const zone = motionZone(m), target = {x: Math.max(zone.minX + 5, Math.min(zone.maxX - 5, m.local.x + this.between([-35, 35]))),
              y: this.between([zone.minY + 4, zone.maxY - 4])};
            if (Math.hypot(target.x - other.local.x, target.y - other.local.y) > 24) startWalk(m, target);
            nest.moveIn[index] = this.between([2000, 4000]);
          }
        }
      }
    }
  }
  private pairIds(): string[] { return this.pair ? [this.pair.a, this.pair.b] : []; }
}
