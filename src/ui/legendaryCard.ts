import {LEGENDARY_EFFECTS as FX, isLegendaryShow, type LegendaryShow} from '../config/legendaryArt';
import {BENNY_EFFECTS, BENNY_ID} from '../config/bennyArt';
import type {SpeciesId} from '../config/species';

/**
 * The cards of the legendaries (owner, 31 October and 1 November 2026): their shine lives only here and in their first
 * appearance, never in the meadow. Fire for the Dragon, water for the Requin, earth for the Ankylosaure: a painted banner
 * behind the title, a tinted page, embers, bubbles or dust drifting up the sides, and a turning golden halo behind the large portrait.
 * Benny, the Mythic rabbit, gets the colours of her appearance: a pastel sky with its rainbow, stars and feathers, a soft light behind her.
 * Decoration only: every added element is hidden from assistive technology and ignores the pointer.
 */
type CardShow = LegendaryShow | typeof BENNY_ID;
const AMBIENT_COUNT = 9;
const BANNER: Record<CardShow, string> = {dragon: FX.firewall[0].url, requin: FX.wave[1].url, ankylosaure: FX.strata.url, benny: BENNY_EFFECTS.rainbow[5].url};
/** What drifts up the margins: embers, bubbles, dust and grit for the Ankylosaure, stars and feathers for Benny. */
const MOTES: Record<CardShow, string[]> = {dragon: [FX.ember.url], requin: [FX.bubble.url], ankylosaure: [FX.dust.url, FX.gravel.url, FX.dust.url],
  benny: [BENNY_EFFECTS.star.url, BENNY_EFFECTS.feather[2].url, BENNY_EFFECTS.starFive.url, BENNY_EFFECTS.feather[1].url]};
const rand = (seed: number) => { const x = Math.sin(seed * 57.3 + 1.7) * 43758.5453; return x - Math.floor(x); };
const isCardShow = (species: SpeciesId): species is CardShow => isLegendaryShow(species) || species === BENNY_ID;
function decor(tag: 'div' | 'img', className: string): HTMLElement {
  const element = document.createElement(tag); element.className = className; element.setAttribute('aria-hidden', 'true');
  if (element instanceof HTMLImageElement) { element.alt = ''; element.draggable = false; element.decoding = 'async'; }
  return element;
}
const image = (url: string, className: string) => { const img = decor('img', className) as HTMLImageElement; img.src = url; return img; };

/** Themes the open card (rabbit or species) of a legendary or of Benny; returns false for every other species. */
export function decorateLegendaryCard(panel: HTMLElement, species: SpeciesId): boolean {
  clearLegendaryCard(panel);
  if (!isCardShow(species)) return false;
  panel.dataset.legendary = species;
  panel.style.setProperty('--legendary-banner', `url("${BANNER[species]}")`);
  const ambient = decor('div', 'legendary-ambient');
  for (let k = 0; k < AMBIENT_COUNT; k++) {
    const motes = MOTES[species], piece = image(motes[k % motes.length], 'legendary-mote');
    // Both side margins, away from the text in the middle.
    const side = k % 2 ? 100 - rand(k) * 11 : rand(k) * 11;
    piece.style.setProperty('--x', `${side.toFixed(1)}%`); piece.style.setProperty('--d', `${(-rand(k + 9) * 6).toFixed(2)}s`);
    piece.style.setProperty('--t', `${(4.5 + rand(k + 19) * 3).toFixed(2)}s`); piece.style.setProperty('--s', (.7 + rand(k + 29) * .8).toFixed(2));
    ambient.append(piece);
  }
  panel.append(ambient);
  return true;
}
export function clearLegendaryCard(panel: HTMLElement): void {
  delete panel.dataset.legendary; panel.style.removeProperty('--legendary-banner');
  panel.querySelectorAll(':scope > .legendary-ambient').forEach(layer => layer.remove());
}
/** The large portrait before a turning golden halo, with a few glints; Benny's is a soft light, a ring of sparkles and star glints. */
export function legendaryPortrait(portrait: HTMLElement, species?: SpeciesId): HTMLElement {
  const frame = document.createElement('span'), mythic = species === BENNY_ID;
  frame.className = mythic ? 'legendary-portrait mythic-portrait' : 'legendary-portrait';
  frame.append(image(mythic ? BENNY_EFFECTS.glow.url : FX.halo.url, 'legendary-portrait-halo'));
  for (let k = 0; k < 4; k++) {
    const glint = image(mythic ? [BENNY_EFFECTS.twinkle, BENNY_EFFECTS.starFive][k % 2].url : FX.spark.url, 'legendary-portrait-glint');
    glint.style.setProperty('--k', String(k)); frame.append(glint);
  }
  if (mythic) frame.append(image(BENNY_EFFECTS.ringSparkles.url, 'mythic-portrait-ring'));
  frame.append(portrait); return frame;
}
