import {BENNY_ATLAS, BENNY_EFFECTS as FX, BENNY_FRAMES, BENNY_ID, BENNY_REVEAL_POSES} from '../config/bennyArt';
import {rabbitArt} from '../config/rabbitArt';
import {revealEnd, type RevealText} from './legendaryReveal';

/**
 * Benny's first appearance, the Mythic rabbit (owner's request of 1 November 2026: « un vrai phénomène pour le joueur », with
 * clouds of the sky and rainbows, larger than the legendaries'). The sky darkens to a pastel night full of stars, crossed by shooting
 * stars; close up, clouds gather and open on a golden light with rays; a rainbow draws itself above, bursting at both ends. Benny comes
 * down slowly from the opening, asleep in the light and swaying like a feather, inside a glow and a swirl of stardust, while the view
 * draws back. She wakes and opens her eyes just above the ground, lands in a wave of light and a sheaf of stars, and gives a small hop
 * of joy; the view makes room for the words, one after the other. Then she stays alive: she breathes, blinks, moves her nose and ears,
 * and stars rise around her. All her poses are her approved meadow paintings. No wings here: they belong to her power.
 * A tap skips to the calm end; with reduced motion the end only fades in. Purely visual: the dialog is created here and removed when it closes.
 */
type Times = readonly (readonly [number, number?])[];
/** When each painting of a sequence fades in, and out (none for the one that stays), in seconds. */
const CLOUD_TIMES: Times = [[.6, 1.6], [1.5, 1.9], [1.8, 2.2], [2.1, 2.5], [2.4, 2.8], [2.7, 3.2], [3.1, 7.1], [7]];
const RAY_TIMES: Times = [[1.8, 2.15], [2.1, 2.45], [2.4, 2.75], [2.7, 6.1], [6, 6.7], [6.6, 7.3]];
const RAINBOW_TIMES: Times = [[3, 3.3], [3.22, 3.52], [3.44, 3.74], [3.66, 3.96], [3.88, 4.18], [4.1, 4.4], [4.32, 5], [4.9]];
/** The calm end is reached at the latest here, once the last feather has landed. */
const END_MS = 15_500;
const STARS = 28, FEATHERS = 10, DUST = 12, COMET_TRAIN = 5, SPARKS = 16, MOTES = 9;
/**
 * Her story, in her meadow poses, in seconds (from, until): asleep and floating down, her head lifting, her eyes opening; her ears up
 * as she lands; the hop of joy. The rest picture takes over when the last one ends (br-hidden in the CSS); `soft` poses fade in over the one before.
 */
type Pose = keyof typeof BENNY_REVEAL_POSES.poses;
const SHOW: readonly (readonly [Pose, number, number, 'soft'?])[] = [
  ['groom-3', 3.6, 5.45, 'soft'], ['groom-5', 5.3, 6.25, 'soft'], ['groom-6', 6.1, 7, 'soft'], ['ears-3', 7, 7.55],
  ['hop-1', 7.55, 7.64], ['hop-2', 7.64, 7.73], ['hop-3', 7.73, 7.82], ['hop-4', 7.82, 7.91], ['hop-5', 7.91, 8], ['hop-6', 8, 8.08], ['hop-7', 8.08, 8.15],
];
/** The little movements she keeps once she has landed; each one's rhythm is in the CSS (br-idle-*). */
const IDLE: readonly Pose[] = ['ears-1', 'ears-2', 'ears-3', 'nose-1', 'nose-2', 'nose-3', 'blink-1', 'blink-2'];

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

/** One pose of her atlas, placed exactly over her rest sprite in `.br-body`. */
function pose(name: Pose, className: string): HTMLSpanElement {
  const {atlas, poses} = BENNY_REVEAL_POSES, {frame, at} = poses[name], {sprite} = BENNY_FRAMES, piece = document.createElement('span');
  const percent = (value: number) => `${(value * 100).toFixed(3)}%`;
  // The sprite box is the parent, so the frame's position in the atlas canvas is counted from the sprite's corner.
  piece.className = `br-pose ${className}`; piece.style.left = percent((at.x - sprite.x) / sprite.width); piece.style.top = percent((at.y - sprite.y) / sprite.height);
  piece.style.width = percent(frame.w / sprite.width); piece.style.height = percent(frame.h / sprite.height);
  piece.style.backgroundSize = `${percent(atlas.w / frame.w)} ${percent(atlas.h / frame.h)}`;
  piece.style.backgroundPosition = `${percent(frame.x / Math.max(1, atlas.w - frame.w))} ${percent(frame.y / Math.max(1, atlas.h - frame.h))}`;
  return piece;
}
function showPoses(): HTMLSpanElement[] {
  return SHOW.map(([name, from, until, soft]) => {
    const piece = pose(name, soft ? 'br-pose-soft' : 'br-pose-cut');
    piece.style.setProperty('--at', `${from}s`); piece.style.setProperty('--for', `${(until - from).toFixed(2)}s`); return piece;
  });
}
/** The sheaf of stars thrown up when she lands. */
function sparks(): HTMLImageElement[] {
  return Array.from({length: SPARKS}, (_, k) => {
    const piece = image(k % 3 ? FX.star.url : FX.starFive.url, 'br-spark'), angle = Math.PI * (1.08 + k / (SPARKS - 1) * .84), far = 20 + rand(k + 3) * 26;
    piece.style.setProperty('--sx', `${(Math.cos(angle) * far * 1.25).toFixed(1)}dvh`); piece.style.setProperty('--sy', `${(Math.sin(angle) * far).toFixed(1)}dvh`);
    piece.style.setProperty('--d', `${(rand(k + 31) * .22).toFixed(2)}s`); piece.style.setProperty('--s', (.7 + rand(k + 17) * .9).toFixed(2));
    return piece;
  });
}
/** A shooting star: a bright star and the smaller ones that follow it on the same path. */
function comet(className: string): HTMLImageElement[] {
  return Array.from({length: COMET_TRAIN}, (_, k) => {
    const piece = image(k ? FX.star.url : FX.starBig.url, `br-comet ${className}`);
    piece.style.setProperty('--lag', `${(k * .045).toFixed(3)}s`); piece.style.setProperty('--s', (1 - k * .16).toFixed(2));
    return piece;
  });
}

function stage(name: string): HTMLDivElement {
  const puffs = [image(FX.cloud[7].url, 'br-puff br-puff-left'), image(FX.cloud[7].url, 'br-puff br-puff-right')];
  const rainbow = layer('br-rainbow', [...sequence(FX.rainbow, RAINBOW_TIMES, 'br-rainbow-frame'),
    image(FX.prism.url, 'br-prism br-prism-left'), image(FX.prism.url, 'br-prism br-prism-right')]);
  const clouds = layer('br-clouds', sequence(FX.cloud, CLOUD_TIMES, 'br-cloud-frame'));
  const rays = layer('br-rays', sequence(FX.rays, RAY_TIMES, 'br-ray-frame'));
  const ground = layer('br-ground', [image(FX.ringSparkles.url, 'br-aura'), image(FX.ring.url, 'br-wave'), image(FX.ring.url, 'br-wave br-wave-hop'), image(FX.burst.url, 'br-burst')]);
  const sprite = image(rabbitArt(BENNY_ID)?.url ?? '', 'br-rabbit'); sprite.alt = name;
  const benny = document.createElement('div'); benny.className = 'br-benny';
  // Her body: the rest sprite, the poses of the story over it, and the little movements she keeps afterwards.
  const body = document.createElement('div'); body.className = 'br-body';
  body.append(sprite, layer('br-poses br-story', showPoses()), layer('br-poses br-idle', IDLE.map(name => pose(name, `br-idle-${name}`))));
  benny.append(image(FX.glow.url, 'br-glow'), image(FX.swirl.url, 'br-swirl'), image(FX.trail.url, 'br-trail'), body);
  [...benny.children].forEach(child => { if (child !== body) child.setAttribute('aria-hidden', 'true'); });
  const motes = layer('br-motes', scatter([FX.star.url, FX.starFive.url, FX.twinkle.url], 'br-mote', MOTES, 83));
  const scene = document.createElement('div'); scene.className = 'br-stage';
  scene.append(rainbow, layer('br-puffs', puffs), rays, clouds, layer('br-flash'), ground, layer('br-sparks', sparks()), benny, motes);
  return scene;
}

/** Opens Benny's appearance; `onClose` runs once when the player closes it (button or Escape). */
export function showBennyReveal(text: RevealText, onClose: () => void = () => {}): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = 'benny-reveal'; dialog.dataset.species = BENNY_ID; dialog.dataset.rarity = 'mythic';
  dialog.setAttribute('aria-labelledby', 'benny-reveal-title');
  dialog.style.setProperty('--atlas', `url('${BENNY_ATLAS.url}')`);
  const stars = layer('br-stars', [...scatter([FX.star.url, FX.twinkle.url, FX.starFive.url, FX.star.url], 'br-star', STARS, 7), ...comet('br-comet-one'), ...comet('br-comet-two')]);
  const fall = layer('br-fall', [...scatter(FX.feather.map(f => f.url), 'br-feather', FEATHERS, 41), ...scatter([FX.stardust.url, FX.starBig.url, FX.star.url], 'br-dust', DUST, 59)]);
  const words = document.createElement('div'); words.className = 'br-text';
  const title = document.createElement('h2'); title.id = 'benny-reveal-title'; title.textContent = text.title;
  const name = document.createElement('h3'); name.textContent = text.name;
  const badge = document.createElement('p'); badge.className = 'br-badge';
  const iris = document.createElement('span'); iris.textContent = 'Mythique'; badge.append(iris);
  const details = document.createElement('p'); details.className = 'br-details'; details.textContent = text.details;
  words.append(title, name, badge, details);
  dialog.append(layer('br-night'), stars, layer('br-camera', [stage(text.name)]), fall, words);
  dialog.querySelector('.br-camera')!.removeAttribute('aria-hidden'); // It holds Benny's picture, which has a name.

  // Her poses come from the meadow's atlas, which a game without her has not loaded yet. If it is late, the show starts without
  // them (she comes down as her rest picture) and her little movements begin as soon as it arrives.
  const atlas = new Image(); atlas.src = BENNY_ATLAS.url;
  let atlasReady = false, started = false;
  const atlasLoaded = (typeof atlas.decode === 'function' ? atlas.decode() : Promise.resolve()).then(() => {
    atlasReady = true; if (dialog.classList.contains('is-final')) dialog.classList.add('has-poses');
  }, () => {});
  const finish = () => { dialog.classList.add('is-final'); if (atlasReady) dialog.classList.add('has-poses'); window.clearTimeout(timer); };
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
  Promise.race([Promise.all([...ready, atlasLoaded]), new Promise(resolve => window.setTimeout(resolve, 1500))]).then(() => {
    if (started) return; started = true;
    if (atlasReady) dialog.classList.add('has-poses');
    dialog.classList.add('is-playing');
  });
  return dialog;
}
