import {LEGENDARY_IDLE_GAP_MS, type LegendaryShow} from '../config/legendaryArt';
import {clamp} from '../util/clamp';

/**
 * Timing of the legendaries' meadow shows, apart from Phaser so it can be tested. Purely visual and session-only:
 * nothing is saved, and the game's random generator is never used.
 *
 * Dragon: touched, it opens its mouth and breathes fire while a ring of flames rises around it (`breath` + `ring`);
 * now and then: smoke from the nostrils, a fiery hiccup, a few embers. Requin: touched, it dives into a puddle and
 * only its fin circles (`dive`); now and then: a two-second surf on a board and a little wave, bubbles, a splash.
 * Ankylosaure: touched, it raises its club tail and slams the ground, which cracks and throws stones (`slam`); now and
 * then: a rumble with hopping pebbles, a little dig, a puff of dust.
 * Arkoko (owner, 19 November 2026): touched, the crystal on its forehead lights up strongly all at once, with a burst of rainbow light,
 * then goes back to normal (`flare`); now and then: stars twinkling around it, a small rainbow drawing itself above its head, a
 * rainbow trail of stardust flying around it. Since 20 November 2026 (« soigne les animations d'Arkoko ») it moves too: a jump at the
 * flare, three hops under its rainbow, a twirl about itself while its trail flies around it, a sway looking up at its stars.
 * Peintre (owner, 24 November 2026: five shows, « un grand coup de pinceau », and a ten-second one where he sets a canvas on an
 * easel and paints Van Gogh's Almond Blossom): touched, a great brush stroke swirls through the air (`stroke`); now and then: the
 * easel and its painting (`easel`), sunflowers sprouting where his brush touches the ground (`sunflowers`), swirling stars of a
 * starry night above his head (`starry`, also asleep), a flick of his brush spattering paint around him (`splatter`). He stands
 * still while he paints (`stillAct`), in painted poses (src/config/peintreArt.ts).
 */
export type LegendaryAct = 'tap' | 'smoke' | 'hiccup' | 'embers' | 'dive' | 'surf' | 'bubbles' | 'splash' | 'slam' | 'rumble' | 'dig' | 'dust'
  | 'flare' | 'stars' | 'rainbow' | 'trail' | 'stroke' | 'easel' | 'sunflowers' | 'starry' | 'splatter';
export const ACT_MS: Record<LegendaryAct, number> = {tap: 1900, smoke: 1700, hiccup: 1000, embers: 2000, dive: 2300, surf: 2600, bubbles: 2200, splash: 1000,
  slam: 2000, rumble: 1600, dig: 2200, dust: 1400, flare: 1700, stars: 2200, rainbow: 2800, trail: 2200,
  stroke: 2200, easel: 10_000, sunflowers: 3000, starry: 2800, splatter: 2000};
export const TAP_ACT: Record<LegendaryShow, LegendaryAct> = {dragon: 'tap', requin: 'dive', ankylosaure: 'slam', arkoko: 'flare', peintre: 'stroke'};
export const IDLE_ACTS: Record<LegendaryShow, readonly LegendaryAct[]> = {dragon: ['smoke', 'hiccup', 'embers', 'smoke'], requin: ['surf', 'bubbles', 'surf', 'splash'],
  ankylosaure: ['rumble', 'dig', 'dust', 'rumble'], arkoko: ['stars', 'rainbow', 'trail'], peintre: ['easel', 'sunflowers', 'starry', 'splatter', 'easel']};
/** Asleep, only soft shows: smoke rings from the Dragon, bubbles from the Requin, a puff of dust from the Ankylosaure, a few stars around Arkoko. */
export const SLEEP_ACTS: Record<LegendaryShow, LegendaryAct> = {dragon: 'smoke', requin: 'bubbles', ankylosaure: 'dust', arkoko: 'stars', peintre: 'starry'};
/** The Peintre's shows keep him in place (he paints, plants or flicks his brush where he stands). */
export const stillAct = (act: LegendaryAct | undefined): boolean => act === 'stroke' || act === 'easel' || act === 'sunflowers' || act === 'starry' || act === 'splatter';
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
  /** The show button of the rabbit's sheet (owner, 4 November 2026): this show at once, with the touch's anti-repeat delay. */
  request(act: LegendaryAct): ActState | null {
    if (this.act || this.sinceTap < TAP_COOLDOWN_MS || !speciesActs(this.species).includes(act)) return null;
    this.sinceTap = 0; return this.start(act);
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
  if (reduced || species === 'arkoko' || species === 'peintre') return 0;
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

/**
 * Arkoko's crystal flare (owner, 19 November 2026: « la pierre s'allume fortement d'un coup, puis revient à la normale »): the crystal's
 * original glow comes back at once and grows past it (`glow`, `scale`), the crystal itself shines as added light (`light`) and a burst of
 * rainbow light opens and fades around it (`burst`, `burstScale`); it holds a breath, then calms down to the toned-down drawing by `calm`.
 */
export const FLARE = {peak: 110, hold: 420, calm: 1500} as const;
export function crystalFlare(ms: number): {glow: number; light: number; scale: number; burst: number; burstScale: number} {
  if (ms <= 0 || ms >= FLARE.calm) return {glow: 0, light: 0, scale: 1, burst: 0, burstScale: .3};
  const up = smooth(ms / FLARE.peak), down = ms < FLARE.hold ? 1 : 1 - smooth((ms - FLARE.hold) / (FLARE.calm - FLARE.hold));
  const strength = Math.min(up, down);
  const light = Math.min(up, ms < FLARE.hold ? 1 : 1 - smooth((ms - FLARE.hold) / 500));
  const burst = Math.min(up, 1 - smooth((ms - FLARE.peak) / 600));
  return {glow: strength, light, scale: 1 + .2 * strength, burst, burstScale: .3 + .9 * smooth(ms / 700)};
}
/** Rainbow over the head: which of the 8 painted steps shows (drawing itself, then at rest) and its opacity. */
export function rainbowStep(ms: number, duration = ACT_MS.rainbow): {frame: number; alpha: number} {
  const drawn = Math.min(7, Math.floor(ms / 110));
  return {frame: drawn, alpha: Math.min(smooth(ms / 200), 1 - smooth((ms - (duration - 600)) / 600))};
}

/**
 * One of Arkoko's little hops: it crouches just before ms reaches start, springs height units up for most of length, then lands with
 * a squash that settles. on while it lasts.
 */
export function arkokoHop(ms: number, start: number, length: number, height: number): {on: boolean; lift: number; squashX: number; squashY: number} {
  const t = (ms - start) / length;
  if (t < -.25 || t > 1.3) return {on: false, lift: 0, squashX: 1, squashY: 1};
  if (t < 0) { const crouch = Math.sin((t + .25) / .25 * Math.PI / 2); return {on: true, lift: 0, squashX: 1 + .08 * crouch, squashY: 1 - .1 * crouch}; }
  if (t <= 1) { const stretch = Math.max(0, 1 - t * 2.5); return {on: true, lift: arc(t) * height, squashX: 1 - .05 * stretch, squashY: 1 + .08 * stretch}; }
  const land = Math.sin((t - 1) / .3 * Math.PI); return {on: true, lift: 0, squashX: 1 + .1 * land, squashY: 1 - .12 * land};
}


/**
 * The Peintre's painted poses through his shows (null: his own drawing). The easel: he sets the easel up, lifts his canvas onto it
 * (`carry`), paints it stroke by stroke (`paint`), then steps back to admire it (`admire`) before it fades away.
 */
export const EASEL = {appear: 600, carry: 700, place: 1900, paint: 2100, done: 8300, admire: 8400, fade: 9300} as const;
export type PeintrePose = 'swing' | 'carry' | 'paint' | 'admire';
export function peintrePose(act: LegendaryAct, ms: number): PeintrePose | null {
  if (act === 'stroke') return ms >= 120 && ms < 1250 ? 'swing' : null;
  if (act === 'splatter') return ms >= 100 && ms < 1100 ? 'swing' : null;
  if (act === 'sunflowers') return ms >= 2200 && ms < 2900 ? 'admire' : null;
  if (act !== 'easel') return null;
  if (ms < EASEL.carry || ms >= EASEL.fade) return null;
  if (ms < EASEL.place) return 'carry';
  if (ms < EASEL.done) return 'paint';
  return ms >= EASEL.admire ? 'admire' : 'paint';
}
/** How much of the painting is done (0 blank, 1 finished): a few strokes at a time, with short pauses between them. */
export function canvasProgress(ms: number): number {
  const u = clamp((ms - EASEL.paint) / (EASEL.done - EASEL.paint)), steps = 12, k = u * steps, whole = Math.floor(k), part = k - whole;
  return clamp((whole + smooth(Math.min(1, part * 1.6))) / steps);
}
/** The easel's presence (0 → 1 → 0): it rises out of the ground at the start and fades away at the end. */
export const easelPresence = (ms: number) => Math.min(smooth(ms / EASEL.appear), 1 - smooth((ms - EASEL.fade) / (ACT_MS.easel - EASEL.fade)));
/** The painter's arm at work: a small back-and-forth of his body while each stroke is laid. */
export const brushWork = (ms: number) => ms < EASEL.paint || ms > EASEL.done ? 0 : Math.sin((ms - EASEL.paint) / 130) * Math.abs(Math.sin((ms - EASEL.paint) / 520));
