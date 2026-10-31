import {LEGENDARY_EFFECTS as FX, type LegendaryShow} from '../config/legendaryArt';
import {rabbitArt} from '../config/rabbitArt';

/**
 * First appearance of a legendary (owner's request of 31 October 2026): the Dragon sets the whole screen on fire, the
 * Requin arrives on a huge wave; when it calms, the rabbit appears before its golden halo. A tap skips to the end; with
 * reduced motion the end is shown at once. Purely visual: the dialog is created here and removed when it closes.
 */
export interface RevealText {title: string; name: string; details: string; button: string}

const SKIP_MS = 3400;
const rand = (seed: number) => { const x = Math.sin(seed * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); };
function image(url: string, className: string): HTMLImageElement {
  const img = document.createElement('img'); img.src = url; img.alt = ''; img.className = className; img.draggable = false; img.decoding = 'async'; return img;
}
function layer(className: string, children: Element[] = []): HTMLDivElement {
  const div = document.createElement('div'); div.className = className; div.setAttribute('aria-hidden', 'true'); div.append(...children); return div;
}
/** Small pieces drifting on their own beat: position, delay, duration and sway as CSS variables. */
function scatter(url: string, className: string, count: number, seed: number): HTMLImageElement[] {
  return Array.from({length: count}, (_, k) => {
    const piece = image(url, className), r = (n: number) => rand(seed + k * 7 + n);
    piece.style.setProperty('--x', `${(r(1) * 100).toFixed(1)}%`); piece.style.setProperty('--y', `${(r(2) * 100).toFixed(1)}%`);
    piece.style.setProperty('--d', `${(r(3) * 1.6).toFixed(2)}s`); piece.style.setProperty('--t', `${(1.6 + r(4) * 1.8).toFixed(2)}s`);
    piece.style.setProperty('--dx', `${((r(5) * 2 - 1) * 12).toFixed(1)}vw`); piece.style.setProperty('--s', (.6 + r(6) * .9).toFixed(2));
    return piece;
  });
}

function dragonEffects(): HTMLElement[] {
  const walls = (mirror: boolean) => layer(mirror ? 'lr-fire lr-fire-top' : 'lr-fire', FX.firewall.map((art, k) => {
    const wall = image(art.url, 'lr-wall'); wall.style.setProperty('--k', String(k)); return wall;
  }));
  return [layer('lr-glow'), walls(false), walls(true), layer('lr-embers', scatter(FX.ember.url, 'lr-ember', 28, 11)), layer('lr-flash')];
}
function requinEffects(): HTMLElement[] {
  const waves = layer('lr-waves', FX.wave.map((art, k) => { const wave = image(art.url, 'lr-wave'); wave.style.setProperty('--k', String(k)); return wave; }));
  return [waves, layer('lr-foam', [image(FX.foam.url, 'lr-foam-image')]), layer('lr-bubbles', scatter(FX.bubble.url, 'lr-bubble', 22, 31)),
    layer('lr-drops', scatter(FX.drop.url, 'lr-drop', 14, 53))];
}

/** Opens the appearance; `onClose` runs once when the player closes it (button or Escape). */
export function showLegendaryReveal(species: LegendaryShow, text: RevealText, onClose: () => void = () => {}): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = `legendary-reveal legendary-reveal-${species}`; dialog.dataset.species = species;
  dialog.setAttribute('aria-labelledby', 'legendary-reveal-title');
  const effects = layer('lr-fx', species === 'dragon' ? dragonEffects() : requinEffects());
  const sparks = layer('lr-sparks', scatter(FX.spark.url, 'lr-spark', 7, species === 'dragon' ? 71 : 83));
  const hero = layer('lr-hero', [image(FX.halo.url, 'lr-halo'), sparks]);
  const rabbit = image(rabbitArt(species)?.url ?? '', 'lr-rabbit'); rabbit.alt = text.name; hero.append(rabbit); hero.removeAttribute('aria-hidden');
  const words = document.createElement('div'); words.className = 'lr-text';
  const title = document.createElement('h2'); title.id = 'legendary-reveal-title'; title.textContent = text.title;
  const name = document.createElement('h3'); name.textContent = text.name;
  const badge = document.createElement('p'); badge.className = 'lr-badge'; badge.textContent = 'Légendaire';
  const details = document.createElement('p'); details.className = 'lr-details'; details.textContent = text.details;
  const button = document.createElement('button'); button.type = 'button'; button.textContent = text.button; button.autofocus = true;
  words.append(title, name, badge, details, button);
  dialog.append(layer('lr-backdrop'), effects, hero, words);

  const finish = () => { dialog.classList.add('is-final'); window.clearTimeout(timer); };
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer = window.setTimeout(finish, SKIP_MS + 900);
  // A tap anywhere but the button jumps to the calm end; the button closes.
  dialog.addEventListener('click', event => { if (event.target !== button) finish(); });
  let closed = false;
  const close = () => { if (closed) return; closed = true; window.clearTimeout(timer); if (dialog.open) dialog.close(); dialog.remove(); onClose(); };
  button.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.body.append(dialog);
  if (reduced) finish();
  dialog.showModal(); button.focus({preventScroll: true});
  // The fire or the wave starts once its first painting is ready (at most a short wait), so it never flashes in empty.
  const first = (effects.querySelector('img') as HTMLImageElement | null);
  const start = () => dialog.classList.add('is-playing');
  if (!first || first.complete || typeof first.decode !== 'function') start();
  else Promise.race([first.decode().catch(() => {}), new Promise(resolve => window.setTimeout(resolve, 700))]).then(start);
  return dialog;
}
