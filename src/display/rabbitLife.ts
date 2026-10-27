import {endRabbitActivity, motionZone, startRabbitActivity, type RabbitMotion} from './rabbitMotion';
import {rabbitFaceSeed} from './rabbitBlink';

export interface LifeResident {id: string; group: string; motion: RabbitMotion; visible: boolean}
export interface LifeTiming {zoomGap: readonly [number, number]; sleepGap: readonly [number, number]; socialGap: readonly [number, number]}
export const LIFE_TIMING: LifeTiming = {zoomGap: [240_000, 480_000], sleepGap: [300_000, 600_000], socialGap: [90_000, 180_000]};
export const NAP_MS = 60_000;
type Individual = {group: string; motion: RabbitMotion; napIn: number; sleeping: number | null};
type Pair = {a: string; b: string; elapsed: number; kissing: boolean};
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
  constructor(private timing: LifeTiming = LIFE_TIMING) {
    this.zoomIn = this.between([Math.min(timing.zoomGap[0], 120_000), Math.min(timing.zoomGap[1], 300_000)]);
    this.socialIn = this.between(timing.socialGap);
  }
  private between(range: readonly [number, number]): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return range[0] + (range[1] - range[0]) * this.seed / 4294967296;
  }
  reset(): void {
    for (const r of this.residents.values()) if (special(r.motion)) endRabbitActivity(r.motion);
    this.residents.clear(); this.zoom = null; this.pair = null;
    this.zoomIn = this.between([Math.min(this.timing.zoomGap[0], 120_000), Math.min(this.timing.zoomGap[1], 300_000)]);
    this.socialIn = this.between(this.timing.socialGap);
  }
  /** User actions and Dadi's confirmed dialogue always take precedence. */
  interrupt(id: string): void {
    const r = this.residents.get(id);
    if (!(r && (special(r.motion) || r.sleeping !== null)) && this.zoom?.id !== id && !this.pairIds().includes(id)) return;
    if (r) {
      if (special(r.motion)) endRabbitActivity(r.motion);
      r.sleeping = null; r.napIn = this.between(this.timing.sleepGap);
    }
    if (this.zoom?.id === id) { this.zoom = null; this.zoomIn = this.between(this.timing.zoomGap); }
    if (this.pair && [this.pair.a, this.pair.b].includes(id)) this.endPair();
  }
  private endPair(): void {
    if (this.pair) for (const id of [this.pair.a, this.pair.b]) {
      const r = this.residents.get(id); if (r && ['meet', 'kiss'].includes(r.motion.mode)) endRabbitActivity(r.motion);
    }
    this.pair = null; this.socialIn = this.between(this.timing.socialGap);
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
      const firstMin = Math.min(this.timing.sleepGap[0], 60_000), firstMax = Math.min(this.timing.sleepGap[1], 240_000);
      this.residents.set(r.id, {group: r.group, motion: r.motion, napIn: firstMin + phase * (firstMax - firstMin), sleeping: null});
    }
    for (const id of priority) this.interrupt(id);
    if (reducedMotion) {
      if (this.zoom) this.interrupt(this.zoom.id);
      if (this.pair) this.endPair();
    }
    // A suspended tab must never skip a whole nap or burst. Ordinary long frames are bounded too.
    const ms = active && Number.isFinite(dt) && dt >= 0 && dt <= 1000 ? dt : 0;
    const seen = input.filter(r => r.visible && !priority.includes(r.id));
    if (!ms || !seen.length) return;
    for (const rabbit of seen) {
      const r = this.residents.get(rabbit.id)!;
      if (r.sleeping !== null) {
        if (r.motion.mode !== 'sleep') { r.sleeping = null; r.napIn = this.between(this.timing.sleepGap); }
        else {
          r.sleeping -= ms;
          if (r.sleeping <= 0) { endRabbitActivity(r.motion); r.sleeping = null; r.napIn = this.between(this.timing.sleepGap); }
        }
      } else {
        r.napIn -= ms;
        if (r.napIn <= 0 && r.motion.mode === 'rest' && this.zoom?.id !== rabbit.id && !this.pairIds().includes(rabbit.id)) {
          startRabbitActivity(r.motion, 'sleep'); r.sleeping = NAP_MS;
        }
      }
    }
    const zoomResident = this.zoom && live.get(this.zoom.id);
    if (this.zoom) {
      if (!zoomResident || zoomResident.motion.mode !== 'zoom') { this.zoom = null; this.zoomIn = this.between(this.timing.zoomGap); }
      else if (zoomResident.visible) {
        this.zoom.remaining -= ms;
        if (this.zoom.remaining <= 0) this.interrupt(zoomResident.id);
      }
    } else if (!reducedMotion) {
      this.zoomIn -= ms;
      if (this.zoomIn <= 0) {
        const eligible = seen.filter(r => available(r.motion) && !this.pairIds().includes(r.id));
        const rabbit = eligible[Math.floor(this.between([0, eligible.length]))];
        if (rabbit) {
          const zone = motionZone(rabbit.motion), p = rabbit.motion.local;
          startRabbitActivity(rabbit.motion, 'zoom', {x: p.x < (zone.minX + zone.maxX) / 2 ? zone.maxX - 3 : zone.minX + 3,
            y: p.y < (zone.minY + zone.maxY) / 2 ? zone.maxY - 2 : zone.minY + 2});
          this.zoom = {id: rabbit.id, remaining: this.between([5000, 8000])};
        }
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
        } else if (this.pair.elapsed >= (this.pair.kissing ? 1500 : 20_000)) this.endPair();
      }
    } else if (!reducedMotion) {
      this.socialIn -= ms;
      if (this.socialIn <= 0) {
        const availableResidents = seen.filter(r => available(r.motion) && r.id !== this.zoom?.id);
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
          startRabbitActivity(a.motion, 'meet', {x: x + (left ? -12 : 12), y});
          startRabbitActivity(b.motion, 'meet', {x: x + (left ? 12 : -12), y});
          this.pair = {a: a.id, b: b.id, elapsed: 0, kissing: false}; break;
        }
      }
    }
  }
  private pairIds(): string[] { return this.pair ? [this.pair.a, this.pair.b] : []; }
}
