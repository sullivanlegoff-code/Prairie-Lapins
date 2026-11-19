import {BENNY_ATLAS, BENNY_EFFECTS as FX, BENNY_ID} from '../config/bennyArt';
import {SPA_PIECES} from '../config/salonArt';
import {preferWebp} from '../display/webpTwins';
import {heartIcon} from '../display/currency';
import {pose, type Pose} from './bennyReveal';

/**
 * Caressing Benny in her sheet (owner, 20 November 2026: « je veux qu'elle fasse un bisous et qu'elle fasse une super animation où
 * elle est super heureuse »). Benny only: every other rabbit keeps its short wiggle and its five hearts (GameUI.caress).
 * Her story, in her approved meadow paintings: her ears go up, she sits up and puts a paw to her mouth, eyes closed, and leans
 * towards the player for a kiss; a big painted heart leaves her mouth and flies at the player in a flash of light. Then she is
 * overjoyed: two hops of joy (the second one with a twirl), a pastel rainbow drawing itself behind her with prisms at both ends,
 * hearts and stars bursting, rings of light where she lands, feathers and stardust; she ends with a happy squint and a nose twitch.
 * Painted pictures only (her atlas, her Mythic effects, the spa's heart and the heart of the game); the code only moves them.
 * With reduced motion: the kiss pose, a heart and the rainbow fade in and out, nothing moves, and it is short.
 */
export const BENNY_CARESS_MS = 3900;
export const BENNY_CARESS_REDUCED_MS = 1600;
/** Her poses (from, until) in seconds; the rest picture is hidden under them (bc-hidden) and comes back at the end. */
export const BENNY_CARESS_POSES: readonly (readonly [Pose, number, number])[] = (() => {
  const steps: [Pose, number, number][] = [['ears-3', 0, .22], ['groom-1', .22, .42], ['groom-4', .42, .62], ['groom-5', .62, 1.05], ['groom-6', 1.05, 1.35]];
  const hop = (from: number) => (['hop-1', 'hop-2', 'hop-3', 'hop-4', 'hop-5', 'hop-6', 'hop-7'] as const).forEach((name, k) => steps.push([name, +(from + k * .09).toFixed(2), +(from + (k + 1) * .09).toFixed(2)]));
  hop(1.35); hop(1.98);
  steps.push(['flop-1', 2.61, 3.15], ['nose-1', 3.15, 3.3], ['nose-2', 3.3, 3.45], ['nose-3', 3.45, 3.6]);
  return steps;
})();
/** The end of her poses: her rest picture is back from here. */
export const BENNY_CARESS_POSES_END = 3.6;
/** When she lands after each hop (seconds): rings of light and sheaves of stars. */
export const BENNY_CARESS_LANDINGS = [1.98, 2.61] as const;
/** Sounds of the show (seconds): the kiss, then each jump of joy. */
export const BENNY_CARESS_CUES: readonly (readonly [number, 'kiss' | 'jump' | 'land'])[] = [[.95, 'kiss'], [1.5, 'jump'], [1.98, 'land'], [2.13, 'jump'], [2.61, 'land']];
const REDUCED_POSE: Pose = 'groom-5';
const HEARTS = 12, STARS_PER_LANDING = 8, TWINKLES = 6, FEATHERS = 4;
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

/** The hearts rising all around her once she is happy: the spa's painted heart and the game's heart, in turn. */
function heartShower(): HTMLElement[] {
  return Array.from({length: HEARTS}, (_, k) => {
    const heart = k % 2 ? heartIcon() : picture(spaHeart(), 'bc-heart-art'); heart.classList.add('bc-heart'); heart.setAttribute('aria-hidden', 'true');
    const r = (n: number) => rand(k * 13 + n);
    heart.style.setProperty('--x', `${(8 + r(1) * 84).toFixed(1)}%`); heart.style.setProperty('--y', `${(46 + r(2) * 40).toFixed(1)}%`);
    heart.style.setProperty('--dx', `${((r(3) * 2 - 1) * 34).toFixed(0)}px`); heart.style.setProperty('--rise', `${(70 + r(4) * 60).toFixed(0)}px`);
    heart.style.setProperty('--s', (.7 + r(5) * .8).toFixed(2)); heart.style.setProperty('--r', `${Math.round((r(6) * 2 - 1) * 30)}deg`);
    time(heart, '--at', 1.3 + k * .17); time(heart, '--t', 1.1 + r(7) * .5);
    return heart;
  });
}
/** The sheaf of stars thrown up at a landing. */
function landingStars(at: number, seed: number): HTMLElement[] {
  return Array.from({length: STARS_PER_LANDING}, (_, k) => {
    const star = picture(k % 3 ? FX.star.url : FX.starFive.url, 'bc-spark'), angle = Math.PI * (1.05 + k / (STARS_PER_LANDING - 1) * .9), far = 46 + rand(seed + k) * 40;
    star.style.setProperty('--sx', `${(Math.cos(angle) * far * 1.3).toFixed(0)}px`); star.style.setProperty('--sy', `${(Math.sin(angle) * far).toFixed(0)}px`);
    star.style.setProperty('--s', (.7 + rand(seed + k + 7) * .9).toFixed(2)); time(star, '--at', at + rand(seed + k + 3) * .08);
    return star;
  });
}
function twinkles(): HTMLElement[] {
  return Array.from({length: TWINKLES}, (_, k) => {
    const piece = picture(k % 2 ? FX.twinkle.url : FX.starFive.url, 'bc-twinkle');
    piece.style.setProperty('--x', `${(rand(k + 40) * 100).toFixed(1)}%`); piece.style.setProperty('--y', `${(rand(k + 50) * 80).toFixed(1)}%`);
    piece.style.setProperty('--s', (.6 + rand(k + 60) * .8).toFixed(2)); time(piece, '--at', .9 + k * .42);
    return piece;
  });
}
function feathers(): HTMLElement[] {
  return Array.from({length: FEATHERS}, (_, k) => {
    const piece = picture(FX.feather[(k + 1) % FX.feather.length].url, 'bc-feather');
    piece.style.setProperty('--x', `${(10 + k * 25 + rand(k + 70) * 10).toFixed(1)}%`); piece.style.setProperty('--dx', `${((rand(k + 80) * 2 - 1) * 26).toFixed(0)}px`);
    piece.style.setProperty('--r', `${Math.round((rand(k + 90) * 2 - 1) * 60)}deg`); time(piece, '--at', 1.6 + k * .4);
    return piece;
  });
}
/** The rainbow drawing itself behind her (her own painted rainbow, frame after frame), with a prism bursting at each end. */
function rainbow(reduced: boolean): HTMLElement {
  if (reduced) return layer('bc-rainbow', [picture(FX.rainbow[7].url, 'bc-rainbow-frame bc-rainbow-still')]);
  const frames = FX.rainbow.map((art, k) => {
    const frame = picture(art.url, `bc-rainbow-frame${k === FX.rainbow.length - 1 ? ' bc-rainbow-last' : ''}`);
    time(frame, '--at', 1.2 + k * .12); return frame;
  });
  return layer('bc-rainbow', [...frames, picture(FX.prism.url, 'bc-prism bc-prism-left'), picture(FX.prism.url, 'bc-prism bc-prism-right')]);
}

/**
 * Plays the show on her portrait. `figure` is the box of her picture (its size is the sprite's), `portrait` the sheet's portrait.
 * Returns how long it lasts, in milliseconds; `clearBennyCaress` takes everything away.
 */
export function playBennyCaress(portrait: HTMLElement, figure: HTMLElement, reduced: boolean): number {
  clearBennyCaress(portrait);
  const poses = atlasReady;
  portrait.dataset.bennyCaress = reduced ? 'still' : 'show';
  figure.classList.add('bc-figure'); figure.style.setProperty('--atlas', `url('${BENNY_ATLAS.url}')`);
  if (poses) figure.classList.add('bc-has-poses');
  const back = layer('bc-back', [picture(FX.glow.url, 'bc-glow'), rainbow(reduced)]);
  if (!reduced) back.append(picture(FX.swirl.url, 'bc-swirl'));
  const front = layer('bc-front');
  // The kiss: a big painted heart born at her mouth, flying at the player.
  const kiss = layer('bc-kiss', [picture(FX.burst.url, 'bc-kiss-flash'), picture(spaHeart(), 'bc-kiss-heart')]);
  front.append(kiss);
  if (!reduced) {
    front.append(layer('bc-hearts', heartShower()), layer('bc-sparks', BENNY_CARESS_LANDINGS.flatMap((at, k) => landingStars(at, 20 + k * 30))),
      layer('bc-twinkles', twinkles()), layer('bc-feathers', feathers()), picture(FX.trail.url, 'bc-trail'), picture(FX.stardust.url, 'bc-stardust'));
    const ground = layer('bc-ground', BENNY_CARESS_LANDINGS.map(at => { const ring = picture(FX.ring.url, 'bc-ring'); time(ring, '--at', at - .04); return ring; }));
    back.append(ground);
  }
  const posesLayer = layer('bc-poses');
  if (poses) {
    if (reduced) { const piece = pose(REDUCED_POSE, 'bc-pose bc-pose-still'); posesLayer.append(piece); }
    else for (const [name, from, until] of BENNY_CARESS_POSES) {
      const piece = pose(name, 'bc-pose bc-pose-cut'); piece.dataset.pose = name; time(piece, '--at', from); time(piece, '--for', until - from); posesLayer.append(piece);
    }
  }
  figure.append(posesLayer);
  portrait.prepend(back); portrait.append(front);
  return reduced ? BENNY_CARESS_REDUCED_MS : BENNY_CARESS_MS;
}
export function clearBennyCaress(portrait: HTMLElement): void {
  delete portrait.dataset.bennyCaress;
  portrait.querySelectorAll('.bc-back, .bc-front, .bc-poses').forEach(element => element.remove());
  portrait.querySelectorAll<HTMLElement>('.bc-figure').forEach(figure => { figure.classList.remove('bc-figure', 'bc-has-poses'); figure.style.removeProperty('--atlas'); });
}
