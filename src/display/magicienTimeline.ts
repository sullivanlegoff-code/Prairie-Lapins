export type MagicienAct = 'sparks' | 'circle' | 'levitation';
export const MAGICIEN_ACTS: readonly MagicienAct[] = ['sparks', 'circle', 'levitation'];
export const MAGICIEN_DURATION: Record<MagicienAct, number> = {sparks: 1400, circle: 2000, levitation: 2000};
export const MAGICIEN_GAP = {first: [15_000, 30_000], next: [15_000, 30_000]} as const;
export interface MagicienActState {act: MagicienAct; elapsed: number; duration: number}
const hash = (id: string) => { let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export class MagicienClock {
  act: MagicienActState | null = null;
  private seed: number;
  private next: number;
  constructor(readonly id: string) { this.seed = hash(id); this.next = this.between(MAGICIEN_GAP.first); }
  private random(): number { this.seed = (this.seed + 0x6D2B79F5) >>> 0; let t = this.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  private between([a,b]: readonly [number,number]): number { return a + (b-a)*this.random(); }
  play(act: MagicienAct): MagicienActState | null { if (this.act || !MAGICIEN_ACTS.includes(act)) return null; return this.start(act); }
  private start(act: MagicienAct): MagicienActState { return this.act = {act, elapsed: 0, duration: MAGICIEN_DURATION[act]}; }
  step(dt: number, eligible: boolean, reduced: boolean): MagicienActState | null {
    const ms = Math.max(0, Math.min(dt, 1000));
    if (this.act) { this.act.elapsed += ms; if (this.act.elapsed >= this.act.duration) { this.act = null; this.next = this.between(MAGICIEN_GAP.next); } return null; }
    if (!eligible || reduced) return null;
    this.next -= ms; if (this.next > 0) return null;
    return this.start(MAGICIEN_ACTS[Math.floor(this.random() * MAGICIEN_ACTS.length)]);
  }
}
export function magicienSparks(elapsed: number, index: number, count: number): {x:number;y:number;alpha:number} {
  const u = Math.max(0, Math.min(1, elapsed / MAGICIEN_DURATION.sparks)), angle = -Math.PI * .82 + index / Math.max(1,count-1) * Math.PI * .64;
  const travel = 16 + (index * 7 % 13);
  return {x: Math.cos(angle) * travel * u, y: Math.sin(angle) * travel * u + 12*u*u, alpha: 1-u};
}
export const magicienLevitation = (elapsed: number) => Math.sin(Math.PI * Math.max(0, Math.min(1, elapsed / MAGICIEN_DURATION.levitation)));
