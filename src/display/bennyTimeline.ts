import {BENNY_FRAMES, type BennyFrameName} from '../config/bennyArt';

/**
 * Timing of Benny's painted meadow animations, apart from Phaser so it can be tested. Purely visual and session-only: nothing is
 * saved, and the game's random generator is never used (each Benny draws from a small generator seeded by her identifier).
 *
 * All the time: a natural blink every 3 to 6 seconds (sometimes a double one), frequent nose twitches, and now and then her ears.
 * At rest, every 8 to 15 seconds, one act drawn at random: little hops (one, or a series of two or three that may carry her a little
 * across the enclosure), a belly flop (she stays lying a few seconds with a little sigh, then gets up), a head scratch, a wash, or a
 * stretch with a yawn. Touched: one joyful hop. Napping: she lies down in her flop and breathes calmly until she wakes up.
 * Reduced motion: only the blink and the nose.
 * A hop or a stretch ends straight on the rest sprite A1 (owner's decision): `null` is A1.
 */
export type BennyAct = 'hop' | 'flop' | 'scratch' | 'groom' | 'stretch';
export const BENNY_ACTS: readonly BennyAct[] = ['hop', 'flop', 'scratch', 'groom', 'stretch'];
/** One picture held for `ms`; `hold` marks the lying flop, held as long as the nap lasts. */
export interface BennyKey {frame: BennyFrameName | null; ms: number; hold?: boolean}
export interface BennyPlan {act: BennyAct | 'nap'; keys: readonly BennyKey[]; /** Hops in the series (hop only). */ hops: number; /** The hops carry her across the enclosure. */ travel: boolean}
export interface BennyActState extends BennyPlan {elapsed: number; duration: number}

const key = (frame: BennyFrameName | null, ms: number, hold = false): BennyKey => hold ? {frame, ms, hold} : {frame, ms};
/** About 12 pictures a second, with longer holds on the key poses (top of the hop, lying flop, yawn). */
export const HOP_KEYS: readonly BennyKey[] = [key('hop-1', 90), key('hop-2', 75), key('hop-3', 80), key('hop-4', 150), key('hop-5', 80), key('hop-6', 85), key('hop-7', 90)];
/** A hop in a series starts from the landing crouch of the previous one. */
const NEXT_HOP_KEYS = HOP_KEYS.slice(1);
/** In each hop, the body leaves the ground with hop-2 and lands with hop-6: the move across the enclosure happens in between. */
export const HOP_AIRBORNE = {from: 1, to: 5} as const;
export const FLOP_LYING_MS = 3200;
const FLOP_DOWN = [key('flop-1', 110), key('flop-2', 100), key('flop-3', 120)], FLOP_UP = [key('flop-5', 120), key('flop-6', 120)];
const SCRATCH_KEYS = [key('scratch-1', 110), ...[0, 1, 2].flatMap(() => [key('scratch-2', 70), key('scratch-3', 70), key('scratch-4', 70), key('scratch-3', 70)]),
  key('scratch-2', 80), key('scratch-5', 110), key('scratch-6', 140)];
const GROOM_KEYS = [key('groom-1', 120), key('groom-2', 110), key('groom-1', 100), key('groom-2', 110), key('groom-1', 100), key('groom-2', 120),
  key('groom-3', 450), key('groom-4', 120), key('groom-5', 110), key('groom-4', 110), key('groom-5', 110), key('groom-6', 160)];
const STRETCH_KEYS = [key('stretch-1', 120), key('stretch-2', 170), key('stretch-3', 800), key('stretch-4', 650)];

/** The pictures of an act; `hops` is the length of a hop series. */
export function bennyPlan(act: BennyAct | 'nap', hops = 1, travel = false): BennyPlan {
  const count = Math.max(1, Math.min(3, Math.round(hops)));
  const keys = act === 'hop' ? [...HOP_KEYS, ...Array.from({length: count - 1}, () => NEXT_HOP_KEYS).flat()]
    : act === 'flop' ? [...FLOP_DOWN, key('flop-4', FLOP_LYING_MS), ...FLOP_UP]
    : act === 'nap' ? [...FLOP_DOWN, key('flop-4', 1000, true), ...FLOP_UP]
    : act === 'scratch' ? SCRATCH_KEYS : act === 'groom' ? GROOM_KEYS : STRETCH_KEYS;
  return {act, keys, hops: act === 'hop' ? count : 0, travel: act === 'hop' && travel};
}
export const planDuration = (plan: Pick<BennyPlan, 'keys'>) => plan.keys.reduce((sum, k) => sum + k.ms, 0);

/** The key shown `ms` into an act (the last one once it is over) and the time spent in it. */
export function keyAt(keys: readonly BennyKey[], ms: number): {index: number; at: number} {
  let start = 0;
  for (let index = 0; index < keys.length; index++) { if (ms < start + keys[index].ms) return {index, at: ms - start}; start += keys[index].ms; }
  return {index: keys.length - 1, at: keys.at(-1)!.ms};
}
/** Share of a hop series' way already travelled, 0 → 1: only while airborne, eased in each hop. */
export function hopTravel(state: Pick<BennyActState, 'keys' | 'hops' | 'elapsed'>): number {
  if (!state.hops) return 0;
  let start = 0, done = 0;
  const hopStarts: number[] = [], air = HOP_KEYS.slice(HOP_AIRBORNE.from, HOP_AIRBORNE.to).reduce((sum, k) => sum + k.ms, 0);
  for (const k of state.keys) { if (k.frame === 'hop-2') hopStarts.push(start); start += k.ms; }
  for (const takeoff of hopStarts) {
    const u = Math.max(0, Math.min(1, (state.elapsed - takeoff) / air));
    done += u * u * (3 - 2 * u);
  }
  return done / state.hops;
}
/** Light squash and stretch of each picture (x, y): crouched before a hop and at its landing, stretched on take-off. */
const SQUASH: Partial<Record<BennyFrameName, [number, number]>> = {
  'hop-1': [1.04, .95], 'hop-2': [.97, 1.05], 'hop-3': [.985, 1.025], 'hop-6': [1.05, .94], 'hop-7': [1.025, .97],
  'flop-2': [1.02, .97], 'flop-3': [1.03, .96], 'flop-6': [.99, 1.02], 'stretch-4': [1.02, .985],
};
/** Calm breathing while lying (period in ms) and the little sigh in the middle of the belly flop. */
export const BREATH_MS = 3200;
export function bennyBody(state: BennyActState | null, time: number): {squashX: number; squashY: number} {
  if (!state) return {squashX: 1, squashY: 1};
  const {index, at} = keyAt(state.keys, state.elapsed), k = state.keys[index];
  const [x, y] = (k.frame && SQUASH[k.frame]) ?? [1, 1];
  // Each picture eases into its squash over its first 60 ms, coming from the neutral shape.
  const ease = Math.min(1, at / 60);
  let squashX = 1 + (x - 1) * ease, squashY = 1 + (y - 1) * ease;
  if (k.frame === 'flop-4') {
    const breath = Math.sin(time / BREATH_MS * Math.PI * 2) * .012;
    // The sigh: one deeper, slower breath in the middle of the lie.
    const sigh = state.act === 'flop' ? Math.sin(Math.max(0, Math.min(1, (at - k.ms * .35) / 1100)) * Math.PI) * .035 : 0;
    squashY += breath + sigh; squashX -= (breath + sigh) * .4;
  }
  return {squashX, squashY};
}
/** The ground shadow under a picture: shrunk and fainter in the air, wider under the long flop and stretch, following the body. */
export function bennyShadow(frame: BennyFrameName | null): {x: number; scaleX: number; scaleY: number; alpha: number} {
  const data = frame ? BENNY_FRAMES.frames[frame] : null;
  if (!data) return {x: 0, scaleX: 1, scaleY: 1, alpha: 1};
  const air = Math.min(1, data.lift / 9);
  return {x: data.x, scaleX: Math.max(.9, data.width) * (1 - .45 * air), scaleY: 1 - .3 * air, alpha: 1 - .5 * air};
}

// ---------- the face: blink, nose and ears ----------
const BLINK = [key('blink-1', 50), key('blink-2', 90), key('blink-1', 50)];
const DOUBLE_BLINK = [...BLINK, key(null, 130), ...BLINK];
const NOSE = [key('nose-1', 70), key('nose-2', 70), key('nose-3', 70), key('nose-2', 70), key('nose-1', 70)];
const EARS_TURN = [key('ears-1', 110), key('ears-2', 650), key('ears-1', 110)], EARS_PERK = [key('ears-3', 820)];
/** Milliseconds between two face moves (each drawn in its range), and the share of double blinks and double twitches. */
export const FACE_GAP = {blink: [3000, 6000], nose: [1300, 3600], ears: [7000, 14000]} as const;
export const DOUBLE = {blink: .25, nose: .35} as const;
/**
 * Milliseconds between two acts: the first comes a little sooner, to be seen. Since 4 November 2026 (owner: seen often without a
 * touch) the time runs during her walks too, and the act starts at her next rest; formerly 5-10 s then 8-15 s, counted at rest only.
 */
export const ACT_GAP = {first: [3000, 6000], next: [5000, 9000]} as const;
/** A touch replays at most this often. */
export const TAP_COOLDOWN_MS = 900;
/** Hop series: one hop, two or three, and their chances. */
export const HOP_SERIES = [[1, .45], [2, .35], [3, .2]] as const;
/** Each idle act's weight in the draw: hops a little more often. */
export const ACT_WEIGHTS: Record<BennyAct, number> = {hop: 3, flop: 2, scratch: 2, groom: 2, stretch: 2};

export interface BennyStep {
  /** Benny is on screen and nothing hides the meadow. */ active: boolean;
  /** Standing at rest: an act may start now. */ idle: boolean;
  /** Napping (the meadow's sleep). */ asleep: boolean;
  /** The player asked for reduced motion. */ reduced: boolean;
}

export class BennyClock {
  act: BennyActState | null = null;
  private face: {keys: readonly BennyKey[]; elapsed: number} | null = null;
  private next: number;
  private timers: Record<'blink' | 'nose' | 'ears', number>;
  private sinceTap = Infinity;
  private seed: number;
  private last: BennyAct | null = null;
  private reduced = false;
  constructor(readonly id: string) {
    let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    this.seed = (h ^ 0x9e3779b9) >>> 0;
    this.next = this.between(ACT_GAP.first);
    this.timers = {blink: this.between(FACE_GAP.blink), nose: this.between(FACE_GAP.nose), ears: this.between(FACE_GAP.ears)};
  }
  private random(): number {
    this.seed = (this.seed + 0x6D2B79F5) >>> 0; let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  private between([low, high]: readonly [number, number]): number { return low + (high - low) * this.random(); }
  private start(plan: BennyPlan): BennyActState { this.face = null; this.act = {...plan, elapsed: 0, duration: planDuration(plan)}; return this.act; }

  /** A touch: one joyful hop in place, unless an act is playing, the last touch was too recent or motion is reduced. */
  tap(): BennyActState | null {
    if (this.act || this.reduced || this.sinceTap < TAP_COOLDOWN_MS) return null;
    this.sinceTap = 0; return this.start(bennyPlan('hop', 1));
  }
  /** Laboratory and the meadow's own little hops: a given act, unless one is playing or motion is reduced. */
  play(act: BennyAct, hops = 1, travel = false): BennyActState | null {
    return this.act || this.reduced ? null : this.start(bennyPlan(act, hops, travel));
  }
  /** The meadow interrupted her (fed, somersault, picked up…): back to A1 at once. */
  cancel(): void { if (this.act) { this.act = null; this.next = this.between(ACT_GAP.next); } }
  private draw(): BennyPlan {
    const total = BENNY_ACTS.reduce((sum, a) => sum + ACT_WEIGHTS[a], 0);
    let act: BennyAct = 'hop';
    for (let attempt = 0; attempt < 2; attempt++) {
      let roll = this.random() * total;
      act = BENNY_ACTS.find(a => (roll -= ACT_WEIGHTS[a]) < 0) ?? 'stretch';
      if (act !== this.last) break;
    }
    let hops = 1, roll = this.random();
    for (const [count, chance] of HOP_SERIES) { if (roll < chance) { hops = count; break; } roll -= chance; }
    return bennyPlan(act, hops, true);
  }

  /** Advances by `dt` ms (a long frame counts as one tenth of a second). Returns the act that started during this step, if any. */
  step(dt: number, {active, idle, asleep, reduced}: BennyStep): BennyActState | null {
    const ms = Math.max(0, Math.min(dt, 100)); this.sinceTap += ms; this.reduced = reduced;
    // Reduced motion: no act at all, the one playing stops on A1.
    if (reduced && this.act) this.cancel();
    if (this.act) {
      const act = this.act, {index, at} = keyAt(act.keys, act.elapsed), current = act.keys[index];
      // The nap's lying picture lasts as long as the nap.
      if (current.hold && asleep && at + ms >= current.ms) act.elapsed = act.elapsed - at + Math.max(0, current.ms - 1);
      else act.elapsed += ms;
      if (act.elapsed >= act.duration) { this.last = act.act === 'nap' ? this.last : act.act; this.act = null; this.next = this.between(ACT_GAP.next); }
      return null;
    }
    // Falling asleep: down into the flop, unless motion is reduced (then only the eyes close).
    if (asleep && !reduced) { this.face = null; return this.start(bennyPlan('nap')); }
    if (active && !reduced) {
      this.next -= ms;
      if (idle && this.next <= 0) return this.start(this.draw());
    }
    if (active && !asleep) this.stepFace(ms, reduced);
    return null;
  }
  private stepFace(ms: number, reduced: boolean): void {
    if (this.face) {
      this.face.elapsed += ms;
      if (this.face.elapsed >= planDuration(this.face)) this.face = null; else return;
    }
    for (const part of ['blink', 'nose', 'ears'] as const) this.timers[part] -= ms;
    if (reduced) this.timers.ears = Math.max(this.timers.ears, 1);
    const due = (['blink', 'nose', 'ears'] as const).find(part => this.timers[part] <= 0);
    if (!due) return;
    this.timers[due] = this.between(FACE_GAP[due]);
    const keys = due === 'blink' ? (this.random() < DOUBLE.blink ? DOUBLE_BLINK : BLINK)
      : due === 'nose' ? (this.random() < DOUBLE.nose ? [...NOSE, key(null, 90), ...NOSE] : NOSE)
      : this.random() < .5 ? EARS_TURN : EARS_PERK;
    this.face = {keys, elapsed: 0};
  }
  /** The picture to show now: an act's, else the face's, else null for the rest sprite A1. Asleep with reduced motion: eyes closed. */
  frame(asleep = false): BennyFrameName | null {
    if (this.act) return this.act.keys[keyAt(this.act.keys, this.act.elapsed).index].frame;
    if (asleep && this.reduced) return 'blink-2';
    return this.face ? this.face.keys[keyAt(this.face.keys, this.face.elapsed).index].frame : null;
  }
}
