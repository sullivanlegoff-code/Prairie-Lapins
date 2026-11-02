import {BENNY_EFFECTS as FX, BENNY_ID} from '../config/bennyArt';
import {rabbitArt} from '../config/rabbitArt';
import {revealEnd, type RevealText} from './legendaryReveal';

/**
 * Benny's first appearance, the Mythic rabbit (owner's request of 1 November 2026: « un vrai phénomène pour le joueur », with
 * clouds of the sky and rainbows, larger than the legendaries'). The sky darkens to a pastel night full of stars; clouds gather and
 * open on a golden light with rays; a rainbow draws itself above, bursting at both ends; Benny comes down slowly from the opening in
 * the light, inside a glow and a swirl of stardust, lands with a small bounce and a wave of light; stardust and feathers drift down
 * and the clouds stay around the title. No wings here: they belong to her power. A tap skips to the calm end; with reduced motion
 * the end only fades in. Purely visual: the dialog is created here and removed when it closes.
 */
type Times = readonly (readonly [number, number?])[];
/** When each painting of a sequence fades in, and out (none for the one that stays), in seconds. */
const CLOUD_TIMES: Times = [[.6, 1.6], [1.5, 1.9], [1.8, 2.2], [2.1, 2.5], [2.4, 2.8], [2.7, 3.2], [3.1, 5.9], [5.8]];
const RAY_TIMES: Times = [[1.8, 2.15], [2.1, 2.45], [2.4, 2.75], [2.7, 4.9], [4.8, 5.5], [5.4, 6.1]];
const RAINBOW_TIMES: Times = [[3, 3.3], [3.22, 3.52], [3.44, 3.74], [3.66, 3.96], [3.88, 4.18], [4.1, 4.4], [4.32, 5], [4.9]];
/** The calm end is reached at the latest here, once the last feather has landed. */
const END_MS = 12_500;
const STARS = 16, FEATHERS = 8, DUST = 10;

const rand = (seed: number) => { const x = Math.sin(seed * 73.1 + 5.3) * 43758.5453; return x - Math.floor(x); };
function image(url: string, className: string): HTMLImageElement {
  const img = document.createElement('img'); img.src = url; img.alt = ''; img.className = className; img.draggable = false; img.decoding = 'async'; return img;
}
function layer(className: string, children: Element[] = []): HTMLDivElement {
  const div = document.createElement('div'); div.className = className; div.setAttribute('aria-hidden', 'true'); div.append(...children); return div;
}
/** A painted sequence: each step crossfades into the next at its own time; the last one stays. */
function sequence(arts: readonly {url: string}[], times: Times, className: string): HTMLImageElement[] {
  return arts.map((art, k) => {
    const frame = image(art.url, `br-frame ${className}`), [at, off] = times[k];
    frame.style.setProperty('--at', `${at}s`);
    if (off === undefined) frame.classList.add('br-last'); else frame.style.setProperty('--off', `${off}s`);
    return frame;
  });
}
/** Pieces scattered on their own beat: position, delay, duration, sway and size as CSS variables. */
function scatter(urls: readonly string[], className: string, count: number, seed: number): HTMLImageElement[] {
  return Array.from({length: count}, (_, k) => {
    const piece = image(urls[k % urls.length], className), r = (n: number) => rand(seed + k * 11 + n);
    piece.style.setProperty('--x', `${(4 + r(1) * 92).toFixed(1)}%`); piece.style.setProperty('--y', `${(r(2) * 100).toFixed(1)}%`);
    piece.style.setProperty('--d', `${(r(3) * 1.4).toFixed(2)}s`); piece.style.setProperty('--t', `${(2.2 + r(4) * 2.4).toFixed(2)}s`);
    piece.style.setProperty('--dx', `${((r(5) * 2 - 1) * 9).toFixed(1)}vw`); piece.style.setProperty('--s', (.6 + r(6) * .8).toFixed(2));
    piece.style.setProperty('--r', `${Math.round((r(7) * 2 - 1) * 40)}deg`);
    return piece;
  });
}

function stage(name: string): HTMLDivElement {
  const puffs = [image(FX.cloud[7].url, 'br-puff br-puff-left'), image(FX.cloud[7].url, 'br-puff br-puff-right')];
  const rainbow = layer('br-rainbow', [...sequence(FX.rainbow, RAINBOW_TIMES, 'br-rainbow-frame'),
    image(FX.prism.url, 'br-prism br-prism-left'), image(FX.prism.url, 'br-prism br-prism-right')]);
  const clouds = layer('br-clouds', sequence(FX.cloud, CLOUD_TIMES, 'br-cloud-frame'));
  const rays = layer('br-rays', sequence(FX.rays, RAY_TIMES, 'br-ray-frame'));
  const ground = layer('br-ground', [image(FX.ringSparkles.url, 'br-aura'), image(FX.ring.url, 'br-wave'), image(FX.burst.url, 'br-burst')]);
  const sprite = image(rabbitArt(BENNY_ID)?.url ?? '', 'br-rabbit'); sprite.alt = name;
  const benny = document.createElement('div'); benny.className = 'br-benny';
  benny.append(image(FX.glow.url, 'br-glow'), image(FX.swirl.url, 'br-swirl'), image(FX.trail.url, 'br-trail'), sprite);
  [...benny.children].forEach(child => { if (child !== sprite) child.setAttribute('aria-hidden', 'true'); });
  const scene = document.createElement('div'); scene.className = 'br-stage';
  scene.append(rainbow, layer('br-puffs', puffs), rays, clouds, layer('br-flash'), ground, benny);
  return scene;
}

/** Opens Benny's appearance; `onClose` runs once when the player closes it (button or Escape). */
export function showBennyReveal(text: RevealText, onClose: () => void = () => {}): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = 'benny-reveal'; dialog.dataset.species = BENNY_ID; dialog.dataset.rarity = 'mythic';
  dialog.setAttribute('aria-labelledby', 'benny-reveal-title');
  const stars = layer('br-stars', scatter([FX.star.url, FX.twinkle.url, FX.starFive.url, FX.star.url], 'br-star', STARS, 7));
  const fall = layer('br-fall', [...scatter(FX.feather.map(f => f.url), 'br-feather', FEATHERS, 41), ...scatter([FX.stardust.url, FX.starBig.url, FX.star.url], 'br-dust', DUST, 59)]);
  const words = document.createElement('div'); words.className = 'br-text';
  const title = document.createElement('h2'); title.id = 'benny-reveal-title'; title.textContent = text.title;
  const name = document.createElement('h3'); name.textContent = text.name;
  const badge = document.createElement('p'); badge.className = 'br-badge';
  const iris = document.createElement('span'); iris.textContent = 'Mythique'; badge.append(iris);
  const details = document.createElement('p'); details.className = 'br-details'; details.textContent = text.details;
  words.append(title, name, badge, details);
  dialog.append(layer('br-night'), stars, stage(text.name), fall, words);

  const finish = () => { dialog.classList.add('is-final'); window.clearTimeout(timer); };
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer = window.setTimeout(finish, END_MS);
  let closed = false;
  const close = () => { if (closed) return; closed = true; window.clearTimeout(timer); if (dialog.open) dialog.close(); dialog.remove(); onClose(); };
  // A tap anywhere but a button jumps to the calm end; the button closes.
  const button = revealEnd(dialog, words, text, finish, close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', close);
  document.body.append(dialog);
  if (reduced) finish();
  dialog.showModal(); button.focus({preventScroll: true});
  // The sky starts once the first clouds and Benny are ready (at most a short wait), so nothing flashes in empty.
  const ready = [...dialog.querySelectorAll<HTMLImageElement>('.br-cloud-frame, .br-rabbit, .br-rainbow-frame')]
    .map(img => img.complete || typeof img.decode !== 'function' ? Promise.resolve() : img.decode().catch(() => {}));
  Promise.race([Promise.all(ready), new Promise(resolve => window.setTimeout(resolve, 900))]).then(() => dialog.classList.add('is-playing'));
  return dialog;
}
