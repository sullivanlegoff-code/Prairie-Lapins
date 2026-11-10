import type {CareKind} from '../config/balance';
import {cuisineAnchors} from '../config/cuisineAnchors';
import type {LookRabbit} from '../config/evolvedArt';
import {artForRabbit} from '../config/rabbitArt';
import {rabbitBlinkArt} from '../config/rabbitBlinkArt';
import {SALON_SCENES, SPA_PIECES} from '../config/salonArt';
import {BATH_WATER_BELOW_CHEST, SPA_LOOK} from '../display/salonSpaLayout';
import {preferWebp} from '../display/webpTwins';
import '../display/salon-spa.css';

const img = (src: string, className: string): HTMLImageElement => {
  const image = document.createElement('img'); image.src = src; image.alt = ''; image.className = className; image.draggable = false; image.decoding = 'async';
  return image;
};
/**
 * Starts a looping animation at the phase the clock gives it: a menu rebuilt by a new state draws the scene again at the same
 * moment of every loop, so the bubbles and the brush never jump back to their start.
 */
const inPhase = (element: HTMLElement, seconds: number, offset = 0): void => {
  element.style.animationDelay = `${-((Date.now() / 1000 + offset) % seconds).toFixed(2)}s`;
};
const place = (element: HTMLElement, left: number, top: number, width: number, angle = 0): HTMLElement => {
  element.style.left = `${left * 100}%`; element.style.top = `${top * 100}%`; element.style.width = `${width * 100}%`;
  if (angle) element.style.setProperty('--spa-angle', `${angle}deg`);
  return element;
};

/**
 * The care under way, drawn large at the top of the Salon de soins' menu (owner, 10 November 2026: « qu'on voit le lapin se faire
 * shampooigner ou qu'il fasse très spa »): the painted corner of the spa with the rabbit's own drawing in it, eyes closed. Bath: in
 * the tub up to its chest, a crown of foam, bubbles rising. Brush: on the stool, a brush combing its back, tufts of fur flying.
 * Massage: on the table under a towel, a turban, cucumber slices on its eyes, steam. Little hearts above the head. The pieces sit on
 * the per-species head, chest and eyes anchors of the Cuisine toque. Movements stop when the player prefers reduced motion (CSS).
 */
export function salonScene(rabbit: LookRabbit & {name?: string}, care: CareKind): HTMLElement {
  const scene = document.createElement('figure'); scene.className = 'salon-scene'; scene.dataset.salonScene = care;
  const art = artForRabbit(rabbit), spec = SALON_SCENES[care];
  scene.append(img(spec.url, 'salon-scene-backdrop'));
  if (!art) return scene;
  const flip = art.facing === SPA_LOOK[care] ? 1 : -1, a = cuisineAnchors(art.species, art.facing, !!art.evolved);
  // Fractions of the rabbit's picture, turned so it looks towards the scene's middle.
  const fx = (x: number) => flip === 1 ? x : 1 - x;
  const keep = care === 'bath' ? Math.min(1, a.bib.y + BATH_WATER_BELOW_CHEST) : 1;
  // The rabbit's box, in fractions of the scene (3:2): its picture's height is `spec.height` of the scene.
  const h = spec.height, w = h * (art.width / art.height) * (2 / 3);
  const box = document.createElement('div'); box.className = 'salon-scene-rabbit'; if (keep < 1) box.dataset.waterLine = '';
  const top = spec.seat.y - h * keep;
  box.style.left = `${(spec.seat.x - w / 2) * 100}%`; box.style.top = `${top * 100}%`; box.style.width = `${w * 100}%`; box.style.height = `${h * keep * 100}%`;
  // Inside the box, the picture keeps its full height (the bath cuts below the water line).
  const body = document.createElement('div'); body.className = 'salon-scene-body'; body.style.height = `${100 / keep}%`;
  if (flip === -1) body.classList.add('flipped');
  inPhase(body, 3.4);
  body.append(img(preferWebp(art.url), 'salon-scene-picture'));
  const eyes = rabbitBlinkArt(art.species, !!art.evolved)?.patches.find(p => p.kind === 'eyes-closed');
  if (eyes) {
    const lid = img(preferWebp(eyes.url), 'salon-scene-eyes');
    lid.style.left = `${eyes.x / art.width * 100}%`; lid.style.top = `${eyes.y / art.height * 100}%`; lid.style.width = `${eyes.width / art.width * 100}%`;
    body.append(lid);
  }
  box.append(body);
  // The spa's pieces, in fractions of the rabbit's whole picture (the body box), not mirrored.
  const pieces = document.createElement('div'); pieces.className = 'salon-scene-pieces'; pieces.style.height = `${100 / keep}%`;
  const piece = (url: string, className: string, x: number, y: number, width: number, angle = 0) => pieces.append(place(img(url, `salon-scene-piece ${className}`), x, y, width, angle));
  const head = {x: fx(a.hat.x), y: a.hat.y, w: a.hat.w, angle: a.hat.r * flip};
  const drift = (url: string, className: string, count: number, x: (i: number) => number, y: number, width: number, seconds = 2.6) => {
    for (let i = 0; i < count; i++) {
      const p = place(img(url, `salon-scene-piece salon-scene-drift ${className}`), x(i), y, width);
      inPhase(p, seconds, (i / count) * seconds); pieces.append(p);
    }
  };
  if (care === 'bath') {
    piece(SPA_PIECES.foam.url, 'spa-foam-crown', head.x, head.y + .02, Math.max(head.w * 1.25, .32), head.angle);
    piece(SPA_PIECES.foam.url, 'spa-foam-water', .5, keep, 1);
    drift(SPA_PIECES.bubble.url, 'spa-bubble', 7, i => .5 + (i % 2 ? 1 : -1) * (.2 + (i * .13) % .4), keep - .05, .14);
  } else if (care === 'brush') {
    // The rabbit looks towards SPA_LOOK.brush: its back is on the other side of its chest.
    const back = fx(a.bib.x) - .48 * SPA_LOOK.brush;
    piece(SPA_PIECES.brush.url, 'spa-brush', back, a.bib.y + (a.bib.y - a.hat.y) * .25, .55);
    inPhase(pieces.lastElementChild as HTMLElement, 1.1);
    drift(SPA_PIECES.tuft.url, 'spa-tuft', 5, i => back + (i - 2) * .05, a.bib.y, .12, 2.2);
  } else {
    piece(SPA_PIECES.blanket.url, 'spa-blanket', fx(a.bib.x) * .5 + .25, a.bib.y + .02, .95);
    piece(SPA_PIECES.turban.url, 'spa-turban', head.x, head.y + .03, Math.max(head.w * 1.6, .42), head.angle);
    const ex = fx(a.eyes.x), slice = a.eyes.w * .42;
    for (const dx of [-a.eyes.w * .22, a.eyes.w * .22]) piece(SPA_PIECES.cucumber.url, 'spa-cucumber', ex + dx, a.eyes.y, slice);
    for (let i = 0; i < 4; i++) { const steam = place(document.createElement('span'), .2 + i * .2, a.bib.y, .3); steam.className = 'salon-scene-piece salon-scene-drift spa-steam'; inPhase(steam, 3.6, i * .9); pieces.append(steam); }
  }
  drift(SPA_PIECES.heart.url, 'spa-heart', 2, i => head.x + (i ? .1 : -.1), head.y - .06, .14, 3.4);
  box.append(pieces);
  scene.append(box);
  // The bath: the front of the tub is the backdrop again, cut above its rim, drawn over the rabbit.
  if (spec.front !== undefined) { const front = img(spec.url, 'salon-scene-front'); front.style.clipPath = `inset(${spec.front * 100}% 0 0 0)`; scene.append(front); }
  const label = document.createElement('figcaption'); label.className = 'sr-only';
  label.textContent = care === 'bath' ? 'Le lapin prend son bain moussant.' : care === 'brush' ? 'Le lapin se fait brosser.' : 'Le lapin se fait masser, au calme.';
  scene.append(label);
  return scene;
}
/** A small picture of each care's corner, for the cards where the player chooses the care. */
export function salonCareThumbnail(care: CareKind): HTMLImageElement {
  const image = img(SALON_SCENES[care].url, 'salon-care-thumbnail'); image.width = 96; image.height = 64; return image;
}
