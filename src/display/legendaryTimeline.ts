import {LEGENDARY_IDLE_GAP_MS, type LegendaryShow} from '../config/legendaryArt';

/**
 * Timing of the legendaries' meadow shows, apart from Phaser so it can be tested. Purely visual and session-only:
 * nothing is saved, and the game's random generator is never used.
 *
 * Dragon: touched, it opens its mouth and breathes fire while a ring of flames rises around it (`breath` + `ring`);
 * now and then: smoke from the nostrils, a fiery hiccup, a few embers. Requin: touched, it dives into a puddle and
 * only its fin circles (`dive`); now and then: a two-second surf on a board and a little wave, bubbles, a splash.
 * Ankylosaure: touched, it raises its club tail and slams the ground, which cracks and throws stones (`slam`); now and
 * then: a rumble with hopping pebbles, a little dig, a puff of dust.
 */
export type LegendaryAct = 'tap' | 'smoke' | 'hiccup' | 'embers' | 'dive' | 'surf' | 'bubbles' | 'splash' | 'slam' | 'rumble' | 'dig' | 'dust';
export const ACT_MS: Record<LegendaryAct, number> = {tap: 1900, smoke: 1700, hiccup: 1000, embers: 2000, dive: 2300, surf: 2600, bubbles: 2200, splash: 1000,
  slam: 2000, rumble: 1600, dig: 2200, dust: 1400};
export const TAP_ACT: Record<LegendaryShow, LegendaryAct> = {dragon: 'tap', requin: 'dive', ankylosaure: 'slam'};
export const IDLE_ACTS: Record<LegendaryShow, readonly LegendaryAct[]> = {dragon: ['smoke', 'hiccup', 'embers', 'smoke'], requin: ['surf', 'bubbles', 'surf', 'splash'],
  ankylosaure: ['rumble', 'dig', 'dust', 'rumble']};
/** Asleep, only soft shows: smoke rings from the Dragon, bubbles from the Requin, a puff of dust from the Ankylosaure. */
export const SLEEP_ACTS: Record<LegendaryShow, LegendaryAct> = {dragon: 'smoke', requin: 'bubbles', ankylosaure: 'dust'};
/** Milliseconds between two spontaneous shows of one legendary; the first comes sooner, to be seen (src/config/legendaryArt.ts). */
export const IDLE_GAP = LEGENDARY_IDLE_GAP_MS;
/** The surf belongs to the surfboard's 2 seconds of slide; the board appears and leaves around it. */
export const SURF_SLIDE_MS = 2000, SURF_ENTRY_MS = 300;
/** A touch replays at most this often, so repeated taps never pile shows up. */
export const TAP_COOLDOWN_MS = 900;

/** Every show one species can play (the Dragon's breath is never drawn on the Requin, nor the reverse). */
export const speciesActs = (species: LegendaryShow): LegendaryAct[] => [TAP_ACT[species], ...new Set(IDLE_ACTS[species])];

export interface ActState {act: LegendaryAct; elapsed: number; duration: number}
export class LegendaryClock {
  act: ActState | null = null;
  private next: number;
  private sinceTap = Infinity;
  private seed: number;
  constructor(readonly species: LegendaryShow, id: string) {
    let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    this.seed = h >>> 0; this.next = this.between(IDLE_GAP.first);
  }
  private random(): number {
    this.seed = (this.seed + 0x6D2B79F5) >>> 0; let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  private between([low, high]: readonly [number, number]): number { return low + (high - low) * this.random(); }
  /** A touch: its show starts at once unless one is already playing or the previous touch was too recent. */
  tap(): ActState | null {
    if (this.act || this.sinceTap < TAP_COOLDOWN_MS) return null;
    this.sinceTap = 0; return this.start(TAP_ACT[this.species]);
  }
  /** Laboratory and replays: a given show of this species, unless one is playing. */
  play(act: LegendaryAct): ActState | null { return this.act || !speciesActs(this.species).includes(act) ? null : this.start(act); }
  private start(act: LegendaryAct): ActState { this.act = {act, elapsed: 0, duration: ACT_MS[act]}; return this.act; }
  /**
   * Advances by `dt` ms. `idle` says a spontaneous show may start now (visible, nothing else going on, motion allowed);
   * `canSurf` that the Requin has room and is standing still. Returns the show that started during this step, if any.
   */
  step(dt: number, idle: boolean, asleep = false, canSurf = true): ActState | null {
    const ms = Math.max(0, Math.min(dt, 1000)); this.sinceTap += ms;
    if (this.act) { this.act.elapsed += ms; if (this.act.elapsed >= this.act.duration) { this.act = null; this.next = this.between(IDLE_GAP.next); } return null; }
    if (!idle) return null;
    this.next -= ms; if (this.next > 0) return null;
    const pool = speciesActs(this.species);
    let act = asleep ? SLEEP_ACTS[this.species] : pool[Math.floor(this.random() * pool.length)];
    if (act === 'surf' && !canSurf) act = 'bubbles';
    return this.start(act);
  }
}

const clamp = (v: number, low = 0, high = 1) => Math.min(high, Math.max(low, v));
export const smooth = (u: number) => { const v = clamp(u); return v * v * (3 - 2 * v); };
/** 0 → 1 → 0 envelope: up during `rise`, held, down during the last `fall` (fractions of the show). */
export function envelope(u: number, rise = .15, fall = .2): number { return smooth(Math.min(u / rise, (1 - u) / fall, 1)); }
/** Index of a looping frame at `fps`, with an offset so neighbours do not move in unison. */
export const loopFrame = (ms: number, count: number, fps = 12, offset = 0) => Math.floor(ms / 1000 * fps + offset) % count;
/** Breath frames: a quick start (1, 2), the full flame flickering (3, 4, 5), then fading (6). */
export function breathFrame(ms: number, duration: number): number {
  if (ms < 110) return 0; if (ms < 220) return 1;
  if (ms > duration - 260) return 5;
  return 2 + Math.floor((ms - 220) / 85) % 3;
}
/**
 * Wing or fin angle (radians, positive lifts it): a slow breathing sway, and every few seconds a short flutter;
 * a stronger beat during a show. Zero when motion is reduced.
 */
export function partAngle(species: LegendaryShow, timeMs: number, phase: number, act: ActState | null, reduced: boolean): number {
  if (reduced) return 0;
  if (species === 'ankylosaure') return reduced ? 0 : tailAngle(timeMs / 1000 + phase, act);
  const t = timeMs / 1000 + phase, amplitude = species === 'dragon' ? 1 : .55;
  let angle = Math.sin(t * 1.3) * .035;
  const cycle = (t % 7) / 7; if (cycle > .86) angle += Math.sin((cycle - .86) / .14 * Math.PI * 4) * .16 * Math.sin((cycle - .86) / .14 * Math.PI);
  if (act && ['tap', 'hiccup', 'dive', 'surf'].includes(act.act)) angle += Math.sin(act.elapsed / 1000 * Math.PI * 7) * .2 * envelope(act.elapsed / act.duration, .1, .2);
  return angle * amplitude;
}
/** Requin dive: the body is under water from `hideAt` to `showAt`; the fin turns once around the puddle meanwhile. */
export const DIVE = {hideAt: 380, showAt: 1750} as const;
export function diveFin(ms: number): {visible: boolean; angle: number} {
  const u = (ms - DIVE.hideAt) / (DIVE.showAt - DIVE.hideAt);
  return {visible: u > 0 && u < 1, angle: Math.PI / 2 + smooth(u) * Math.PI * 2};
}
/** Surf pose: board out of the ground and the body lifted on it during the slide, a gentle bob and a lean forward. */
export function surfPose(ms: number): {board: number; lift: number; lean: number} {
  const board = smooth(ms / SURF_ENTRY_MS) * smooth((ACT_MS.surf - ms) / SURF_ENTRY_MS);
  const slide = clamp((ms - SURF_ENTRY_MS) / SURF_SLIDE_MS);
  return {board, lift: board * (3 + Math.sin(slide * Math.PI * 4) * 1.2), lean: board * (.1 + Math.sin(slide * Math.PI * 2) * .04)};
}

/** Ankylosaure slam: the club tail rises, waits a breath, then strikes the ground at `impact`. */
export const SLAM = {raise: 650, impact: 820} as const;
/** Tail angle (radians, positive lifts the club): a lazy wag at rest; during the slam, up high then down past rest. */
export function tailAngle(t: number, act: ActState | null): number {
  let angle = Math.sin(t * 1.1) * .04 + Math.sin(t * 2.7) * .015;
  if (act?.act === 'slam') {
    const ms = act.elapsed;
    if (ms < SLAM.raise) angle += smooth(ms / SLAM.raise) * .62;
    else if (ms < SLAM.impact) angle += .62 - (.62 + .12) * Math.pow((ms - SLAM.raise) / (SLAM.impact - SLAM.raise), 2);
    else angle += -.12 * (1 - smooth((ms - SLAM.impact) / 420)) + Math.sin((ms - SLAM.impact) / 60) * .04 * Math.max(0, 1 - (ms - SLAM.impact) / 300);
  } else if (act?.act === 'dig' || act?.act === 'rumble') angle += Math.sin(act.elapsed / 1000 * Math.PI * 6) * .06 * envelope(act.elapsed / act.duration);
  return angle;
}
/** Stone thrown at `impact`: a parabola, from 0 at the strike to 1 when it lands again. */
export const arc = (u: number) => 4 * u * (1 - u);
