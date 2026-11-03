import {rabbitArt} from '../config/rabbitArt';
import {CROWN_ART, ULTIMATE_FRAME, crownAnchor, preloadUltimateArt} from '../config/ultimateArt';
import {isUltimate} from '../simulation/affection';
import type {SpeciesId} from '../config/species';
import type {Rabbit} from '../state/types';

/**
 * The card of a lapin ultime (affection 50, owner, 2 November 2026: « quand on ouvre sa fiche elle est adaptée au fait que ce soit
 * un lapin ultime »): the painted golden frame with laurels and purple ribbons around the whole card, its crown centred on the top
 * bar (src/display/ultimate-card.css). Decoration only: hidden from assistive technology, it ignores the pointer.
 */
export function decorateUltimateCard(panel: HTMLElement, rabbit: Pick<Rabbit, 'affection'>): boolean {
  clearUltimateCard(panel);
  if (!isUltimate(rabbit)) return false;
  preloadUltimateArt();
  panel.dataset.ultimate = '';
  panel.style.setProperty('--ultimate-frame', `url("${ULTIMATE_FRAME.url}")`);
  const frame = document.createElement('div'); frame.className = 'ultimate-frame'; frame.setAttribute('aria-hidden', 'true');
  const crown = document.createElement('img'); crown.className = 'ultimate-frame-crown'; crown.alt = ''; crown.draggable = false; crown.decoding = 'async';
  crown.src = ULTIMATE_FRAME.piece.url; frame.append(crown); panel.append(frame);
  return true;
}
export function clearUltimateCard(panel: HTMLElement): void {
  delete panel.dataset.ultimate; panel.style.removeProperty('--ultimate-frame');
  panel.querySelectorAll(':scope > .ultimate-frame').forEach(layer => layer.remove());
}
/**
 * Puts the golden crown on a portrait's painted rabbit, between the ears (the per-species head anchor of the meadow sprite). The
 * picture is wrapped in a box of its own proportions so the anchor, in fractions of the picture, lands on the head at any size.
 */
export function crownPortrait(portrait: HTMLElement, species: SpeciesId): HTMLElement {
  const picture = portrait.querySelector<HTMLImageElement>('img[data-rabbit-art]'), art = rabbitArt(species);
  if (!picture || !art) return portrait;
  const figure = document.createElement('span'); figure.className = 'ultimate-figure';
  figure.style.setProperty('--ratio', String(art.width / art.height));
  picture.replaceWith(figure); figure.append(picture);
  const anchor = crownAnchor(species, art.facing), crown = document.createElement('img');
  crown.className = 'ultimate-crown'; crown.alt = ''; crown.draggable = false; crown.decoding = 'async'; crown.src = CROWN_ART.url;
  crown.setAttribute('aria-hidden', 'true');
  crown.style.left = `${anchor.x * 100}%`; crown.style.top = `${anchor.y * 100}%`; crown.style.width = `${anchor.w * 100}%`;
  crown.style.setProperty('--tilt', `${anchor.r}deg`);
  figure.append(crown); portrait.dataset.crowned = '';
  return portrait;
}
