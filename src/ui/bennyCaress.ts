import {BENNY_ATLAS, BENNY_EFFECTS as FX, BENNY_ID} from '../config/bennyArt';
import {SPA_PIECES} from '../config/salonArt';
import {preferWebp} from '../display/webpTwins';
import {heartIcon} from '../display/currency';
import {pose, type Pose} from './bennyReveal';

/**
 * Caressing Benny in her sheet. Owner, 20 November 2026: « je veux qu'elle fasse un bisous et qu'elle fasse une super animation où
 * elle est super heureuse », then the same evening: « elle doit avoir plusieurs animations de caresses différentes. Je veux que
 * l'animation s'arrête quand on arrête de caresser et qu'elle continue tant que l'on caresse ».
 * So a caress is a session: it starts with her kiss, then, as long as the finger keeps rubbing, her moments of joy follow one
 * another (never the same one twice in a row): hops of joy under a rainbow, a cuddle where she leans into the hand, a twirl, a
 * roll on her back, and the kiss again now and then. Hearts rise where the finger rubs. As soon as the finger stops or lifts, the
 * moment stops and she softly comes back to rest. Benny only: every other rabbit keeps its short wiggle (GameUI.caress).
 * Painted pictures only (her meadow atlas, her Mythic effects, the spa's heart and the heart of the game); the code only moves them.
 * With reduced motion: her kiss pose, a heart and the rainbow fade in while she is caressed, and fade out when it stops.
 */
export type BennyCaressCue = 'kiss' | 'jump' | 'land' | 'purr';
export type BennyMoveName = 'kiss' | 'hops' | 'cuddle' | 'twirl' | 'roll';
export interface BennyMove {
  name: BennyMoveName;
  /** How long it lasts (ms). */
  ms: number;
  /** Her poses (from, until) in seconds; her rest picture hides under them while they last. */
  poses: readonly (readonly [Pose, number, number])[];
  /** Sounds (seconds from the start of the moment). */
  cues: readonly (readonly [number, BennyCaressCue])[];
}
const run = (names: readonly Pose[], from: number, step: number): [Pose, number, number][] =>
  names.map((name, k) => [name, +(from + k * step).toFixed(2), +(from + (k + 1) * step).toFixed(2)]);
const HOP: readonly Pose[] = ['hop-1', 'hop-2', 'hop-3', 'hop-4', 'hop-5', 'hop-6', 'hop-7'];
export const BENNY_CARESS_MOVES: Readonly<Record<BennyMoveName, BennyMove>> = {
  // The kiss: ears up, paw to her mouth, eyes closed, she leans to the player and a big heart flies out at the player.
  kiss: {name: 'kiss', ms: 1700, poses: [['ears-3', 0, .2], ['groom-1', .2, .4], ['groom-4', .4, .6], ['groom-5', .6, 1.05], ['groom-6', 1.05, 1.35], ['blink-2', 1.35, 1.55]],
    cues: [[.9, 'kiss']]},
  // Two hops of joy, a rainbow drawing itself behind her, rings of light and stars where she lands.
  hops: {name: 'hops', ms: 1500, poses: [...run(HOP, 0, .09), ...run(HOP, .66, .09), ['ears-3', 1.29, 1.45]],
    cues: [[.12, 'jump'], [.63, 'land'], [.78, 'jump'], [1.29, 'land']]},
  // The cuddle: eyes closed with happiness, she leans into the hand from one side to the other, a soft light breathing.
  cuddle: {name: 'cuddle', ms: 1900, poses: [['blink-1', 0, .15], ['blink-2', .15, .75], ['ears-1', .75, .9], ['blink-2', .9, 1.55], ['nose-1', 1.55, 1.68], ['nose-2', 1.68, 1.8]],
    cues: [[.1, 'purr'], [1, 'purr']]},
  // The twirl: a hop turning on herself, a trail and a swirl of stardust, feathers floating down.
  twirl: {name: 'twirl', ms: 1300, poses: [['ears-3', 0, .12], ...run(HOP, .12, .1), ['nose-3', .82, 1]], cues: [[.2, 'jump'], [.82, 'land']]},
  // The roll: she flops onto her back for a tummy rub, wriggles happily, then twitches her nose.
  roll: {name: 'roll', ms: 1800, poses: [['flop-1', 0, 1.25], ['nose-1', 1.25, 1.4], ['nose-2', 1.4, 1.55], ['nose-3', 1.55, 1.7]], cues: [[.05, 'purr'], [.7, 'purr']]},
};
/** The order her moments come in while the caress goes on: the kiss first, then joy, the kiss coming back now and then. */
export const BENNY_CARESS_ORDER: readonly BennyMoveName[] = ['kiss', 'hops', 'cuddle', 'twirl', 'kiss', 'roll', 'hops', 'cuddle', 'kiss', 'twirl', 'roll'];
/** The finger has stopped once it has not rubbed for this long (ms): the moment stops. */
export const BENNY_CARESS_IDLE_MS = 600;
/** How long she takes to come back to rest after the caress (ms). */
export const BENNY_CARESS_SETTLE_MS = 320;
/** One « caress » counted for the missions at the start, then one more every this long while it goes on (ms). */
export const BENNY_CARESS_COUNT_MS = 3900;
/** A heart rises where the finger rubs, at most this often (ms), and at most this many at once. */
export const BENNY_CARESS_FINGER_MS = 140;
const FINGER_HEARTS = 10, HEARTS = 9, TWINKLES = 5, FEATHERS = 4, STARS_PER_LANDING = 7;
const REDUCED_POSE: Pose = 'groom-5';
/** Her atlas, decoded once her sheet is open; while it is not ready a caress moves her rest picture only. */
let atlasImage: HTMLImageElement | null = null;
let atlasReady = false;

export const isBenny = (species: string): boolean => species === BENNY_ID;
/** Starts loading her poses when her sheet opens, so the first caress already has them. */
export function warmBennyCaress(): void {
  if (atlasImage || typeof Image === 'undefined') return;
  atlasImage = new Image(); atlasImage.src = BENNY_ATLAS.url;
  const done = () => { atlasReady = true; };
  if (typeof atlasImage.decode === 'function') atlasImage.decode().then(done, () => { atlasImage = null; }); else atlasImage.onload = done;
}
/** For the tests: forget the atlas state. */
export function resetBennyCaressAtlas(ready = false): void { atlasImage = ready ? new Image() : null; atlasReady = ready; }

const rand = (seed: number) => { const x = Math.sin(seed * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); };
function picture(url: string, className: string): HTMLImageElement {
  const img = document.createElement('img'); img.src = url; img.alt = ''; img.className = className; img.draggable = false; img.decoding = 'async';
  img.setAttribute('aria-hidden', 'true'); return img;
}
function layer(className: string, children: Element[] = []): HTMLSpanElement {
  const span = document.createElement('span'); span.className = className; span.setAttribute('aria-hidden', 'true'); span.append(...children); return span;
}
const time = (element: HTMLElement, name: string, seconds: number) => element.style.setProperty(name, `${seconds.toFixed(2)}s`);
const spaHeart = () => preferWebp(SPA_PIECES.heart.url);

function hearts(seed: number, from: number, every: number, count = HEARTS): HTMLElement[] {
  return Array.from({length: count}, (_, k) => {
    const heart = k % 2 ? heartIcon() : picture(spaHeart(), 'bc-heart-art'); heart.classList.add('bc-heart'); heart.setAttribute('aria-hidden', 'true');
    const r = (n: number) => rand(seed + k * 13 + n);
    heart.style.setProperty('--x', `${(8 + r(1) * 84).toFixed(1)}%`); heart.style.setProperty('--y', `${(46 + r(2) * 40).toFixed(1)}%`);
    heart.style.setProperty('--dx', `${((r(3) * 2 - 1) * 34).toFixed(0)}px`); heart.style.setProperty('--rise', `${(60 + r(4) * 60).toFixed(0)}px`);
    heart.style.setProperty('--s', (.7 + r(5) * .8).toFixed(2)); heart.style.setProperty('--r', `${Math.round((r(6) * 2 - 1) * 30)}deg`);
    time(heart, '--at', from + k * every); time(heart, '--t', .9 + r(7) * .5);
    return heart;
  });
}
function landingStars(at: number, seed: number): HTMLElement[] {
  return Array.from({length: STARS_PER_LANDING}, (_, k) => {
    const star = picture(k % 3 ? FX.star.url : FX.starFive.url, 'bc-spark'), angle = Math.PI * (1.05 + k / (STARS_PER_LANDING - 1) * .9), far = 46 + rand(seed + k) * 40;
    star.style.setProperty('--sx', `${(Math.cos(angle) * far * 1.3).toFixed(0)}px`); star.style.setProperty('--sy', `${(Math.sin(angle) * far).toFixed(0)}px`);
    star.style.setProperty('--s', (.7 + rand(seed + k + 7) * .9).toFixed(2)); time(star, '--at', at + rand(seed + k + 3) * .08);
    return star;
  });
}
function twinkles(seed: number, from: number, every: number): HTMLElement[] {
  return Array.from({length: TWINKLES}, (_, k) => {
    const piece = picture(k % 2 ? FX.twinkle.url : FX.starFive.url, 'bc-twinkle');
    piece.style.setProperty('--x', `${(rand(seed + k + 40) * 100).toFixed(1)}%`); piece.style.setProperty('--y', `${(rand(seed + k + 50) * 80).toFixed(1)}%`);
    piece.style.setProperty('--s', (.6 + rand(seed + k + 60) * .8).toFixed(2)); time(piece, '--at', from + k * every);
    return piece;
  });
}
function feathers(seed: number, from: number): HTMLElement[] {
  return Array.from({length: FEATHERS}, (_, k) => {
    const piece = picture(FX.feather[(k + 1) % FX.feather.length].url, 'bc-feather');
    piece.style.setProperty('--x', `${(10 + k * 25 + rand(seed + k + 70) * 10).toFixed(1)}%`); piece.style.setProperty('--dx', `${((rand(seed + k + 80) * 2 - 1) * 26).toFixed(0)}px`);
    piece.style.setProperty('--r', `${Math.round((rand(seed + k + 90) * 2 - 1) * 60)}deg`); time(piece, '--at', from + k * .25);
    return piece;
  });
}
function rainbow(from: number, prisms: number | null): HTMLElement {
  const frames = FX.rainbow.map((art, k) => {
    const frame = picture(art.url, `bc-rainbow-frame${k === FX.rainbow.length - 1 ? ' bc-rainbow-last' : ''}`);
    time(frame, '--at', from + k * .08); return frame;
  });
  const box = layer('bc-rainbow', frames);
  if (prisms !== null) for (const side of ['left', 'right']) { const prism = picture(FX.prism.url, `bc-prism bc-prism-${side}`); time(prism, '--at', prisms); box.append(prism); }
  return box;
}
function rings(landings: readonly number[]): HTMLElement {
  return layer('bc-ground', landings.map(at => { const ring = picture(FX.ring.url, 'bc-ring'); time(ring, '--at', at - .04); return ring; }));
}
/** What surrounds her during one moment: behind her (`back`) and in front of her (`front`). */
function scenery(name: BennyMoveName, seed: number): {back: Element[]; front: Element[]} {
  const glow = picture(FX.glow.url, 'bc-glow');
  switch (name) {
  case 'kiss': return {back: [glow], front: [layer('bc-kiss', [picture(FX.burst.url, 'bc-kiss-flash'), picture(spaHeart(), 'bc-kiss-heart')]),
    layer('bc-hearts', hearts(seed, 1, .08, 5)), layer('bc-twinkles', twinkles(seed, .3, .2))]};
  case 'hops': return {back: [glow, rainbow(0, .66), rings([.63, 1.29])], front: [layer('bc-hearts', hearts(seed, .1, .14)),
    layer('bc-sparks', [...landingStars(.63, seed), ...landingStars(1.29, seed + 30)])]};
  case 'cuddle': return {back: [glow], front: [layer('bc-hearts', hearts(seed, .05, .19)), layer('bc-twinkles', twinkles(seed, .2, .3))]};
  case 'twirl': return {back: [glow, picture(FX.swirl.url, 'bc-swirl'), rings([.82])], front: [picture(FX.trail.url, 'bc-trail'),
    picture(FX.stardust.url, 'bc-stardust'), layer('bc-feathers', feathers(seed, .2)), layer('bc-sparks', landingStars(.82, seed))]};
  case 'roll': return {back: [glow, rainbow(.1, null)], front: [layer('bc-hearts', hearts(seed, .1, .17)), layer('bc-feathers', feathers(seed, .3)),
    layer('bc-twinkles', twinkles(seed, .4, .25))]};
  }
}

export interface BennyCaressSession {
  /** The finger rubbed again, at (x, y) in the page: the caress goes on. */
  rub(x?: number, y?: number): void;
  /** The finger lifted: the moment stops and she settles back. */
  stop(): void;
  /** Takes everything away at once (the sheet changes). */
  dispose(): void;
  readonly active: boolean;
  /** The moments played so far, in order. */
  readonly played: readonly BennyMoveName[];
}
export interface BennyCaressOptions {
  reduced: boolean;
  /** A sound of a moment. */
  sound?: (cue: BennyCaressCue) => void;
  /** One caress counted for the missions (at the start, then every BENNY_CARESS_COUNT_MS while it goes on). */
  count?: () => void;
  /** Everything is over and gone. */
  ended?: () => void;
  now?: () => number;
}
/**
 * Starts a caress session on her portrait. `figure` is the box of her picture (its size is the sprite's). The moment playing is
 * `portrait.dataset.bennyCaress` (its name, « still » with reduced motion, « settle » while she comes back to rest).
 */
export function startBennyCaress(portrait: HTMLElement, figure: HTMLElement, options: BennyCaressOptions): BennyCaressSession {
  clearBennyCaress(portrait);
  const now = options.now ?? (() => performance.now()), reduced = options.reduced, played: BennyMoveName[] = [];
  let active = true, lastRub = now(), lastFinger = -Infinity, nextCount = now() + BENNY_CARESS_COUNT_MS, step = 0;
  let moveTimer = 0, idleTimer = 0, settleTimer = 0; const cueTimers: number[] = [];
  figure.classList.add('bc-figure'); figure.style.setProperty('--atlas', `url('${BENNY_ATLAS.url}')`);
  if (atlasReady) figure.classList.add('bc-has-poses');
  const fingers = layer('bc-fingers'); portrait.append(fingers);
  const clearMoment = () => {
    cueTimers.splice(0).forEach(timer => window.clearTimeout(timer));
    portrait.querySelectorAll(':scope > .bc-back, :scope > .bc-front').forEach(element => element.remove());
    figure.querySelectorAll('.bc-poses').forEach(element => element.remove());
  };
  const play = (name: BennyMoveName) => {
    clearMoment(); played.push(name);
    const move = BENNY_CARESS_MOVES[name], seed = played.length * 17;
    portrait.dataset.bennyCaress = name; figure.style.setProperty('--move', `${move.ms / 1000}s`);
    const {back, front} = scenery(name, seed);
    portrait.prepend(layer('bc-back', back)); fingers.before(layer('bc-front', front));
    const poses = layer('bc-poses');
    const rest = figure.querySelector<HTMLImageElement>('img[data-rabbit-art]')?.getAttribute('src');
    if (atlasReady) for (const [pose_, from, until] of move.poses) {
      // A blink is only her closed eyes: it lies over her whole rest picture, shown with it.
      if (pose_.startsWith('blink') && rest) { const whole = picture(rest, 'bc-pose-rest bc-pose-cut'); time(whole, '--at', from); time(whole, '--for', until - from); poses.append(whole); }
      const piece = pose(pose_, 'bc-pose bc-pose-cut'); piece.dataset.pose = pose_; time(piece, '--at', from); time(piece, '--for', until - from); poses.append(piece);
    }
    figure.append(poses);
    figure.style.setProperty('--hide', `${atlasReady && move.poses.length ? move.poses[move.poses.length - 1]![2] : 0}s`);
    // Restart her body's dance for this moment (the same class twice would not restart it).
    figure.classList.remove('bc-moving'); void figure.offsetWidth; figure.classList.add('bc-moving');
    for (const [at, cue] of move.cues) cueTimers.push(window.setTimeout(() => options.sound?.(cue), at * 1000));
    moveTimer = window.setTimeout(next, move.ms);
  };
  const next = () => {
    if (!active) return;
    step++; play(BENNY_CARESS_ORDER[step % BENNY_CARESS_ORDER.length]!);
  };
  const playStill = () => {
    portrait.dataset.bennyCaress = 'still'; played.push('kiss');
    const back = layer('bc-back', [picture(FX.glow.url, 'bc-glow'), layer('bc-rainbow', [picture(FX.rainbow[7].url, 'bc-rainbow-frame bc-rainbow-still')])]);
    const front = layer('bc-front', [layer('bc-kiss', [picture(spaHeart(), 'bc-kiss-heart')])]);
    portrait.prepend(back); fingers.before(front);
    if (atlasReady) { const poses = layer('bc-poses', [pose(REDUCED_POSE, 'bc-pose bc-pose-still')]); figure.append(poses); }
  };
  const watchIdle = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => { if (now() - lastRub >= BENNY_CARESS_IDLE_MS - 5) session.stop(); else watchIdle(); }, BENNY_CARESS_IDLE_MS);
  };
  const finish = () => {
    window.clearTimeout(moveTimer); window.clearTimeout(idleTimer); window.clearTimeout(settleTimer); clearMoment();
    clearBennyCaress(portrait); options.ended?.();
  };
  const session: BennyCaressSession = {
    get active() { return active; },
    played,
    rub(x, y) {
      if (!active) return;
      const t = now(); lastRub = t; watchIdle();
      if (t >= nextCount) { nextCount = t + BENNY_CARESS_COUNT_MS; options.count?.(); }
      // A heart rises where the finger rubs (not with reduced motion: nothing moves).
      if (reduced || x === undefined || y === undefined || t - lastFinger < BENNY_CARESS_FINGER_MS) return;
      lastFinger = t;
      const box = portrait.getBoundingClientRect(), heart = picture(spaHeart(), 'bc-finger-heart');
      heart.style.left = `${(x - box.left).toFixed(0)}px`; heart.style.top = `${(y - box.top).toFixed(0)}px`;
      heart.style.setProperty('--dx', `${((rand(t) * 2 - 1) * 18).toFixed(0)}px`); heart.style.setProperty('--s', (.7 + rand(t + 1) * .6).toFixed(2));
      heart.addEventListener('animationend', () => heart.remove(), {once: true});
      fingers.append(heart);
      while (fingers.childElementCount > FINGER_HEARTS) fingers.firstElementChild?.remove();
    },
    stop() {
      if (!active) return;
      active = false; window.clearTimeout(moveTimer); window.clearTimeout(idleTimer); cueTimers.splice(0).forEach(timer => window.clearTimeout(timer));
      // She comes back to rest from wherever her dance had taken her: her pose of the moment is kept, and everything fades.
      const transform = getComputedStyle(figure).transform;
      figure.classList.remove('bc-moving'); figure.style.transform = transform && transform !== 'none' ? transform : '';
      void figure.offsetWidth; figure.style.transform = '';
      portrait.dataset.bennyCaress = 'settle';
      settleTimer = window.setTimeout(finish, BENNY_CARESS_SETTLE_MS);
    },
    dispose() { active = false; finish(); },
  };
  options.count?.();
  if (reduced) playStill(); else play(BENNY_CARESS_ORDER[0]!);
  watchIdle();
  return session;
}
export function clearBennyCaress(portrait: HTMLElement): void {
  delete portrait.dataset.bennyCaress;
  portrait.querySelectorAll('.bc-back, .bc-front, .bc-poses, .bc-fingers').forEach(element => element.remove());
  portrait.querySelectorAll<HTMLElement>('.bc-figure').forEach(figure => {
    figure.classList.remove('bc-figure', 'bc-has-poses', 'bc-moving'); figure.style.removeProperty('--atlas'); figure.style.removeProperty('--move'); figure.style.removeProperty('--hide'); figure.style.transform = '';
  });
}
