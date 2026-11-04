import {cuisineAnchors} from './cuisineAnchors';
import type {SpeciesId} from './species';

/**
 * Lapin ultime (affection 50) art, chosen by the owner on 2 November 2026: crown A, « une seule couronne dorée, la même pour
 * tous », and card 1, a golden frame with laurels and purple ribbons. Prepared by scripts/prepare-ultimate-art.mjs, whose
 * printed numbers are the ones below.
 */
export const CROWN_ART = {texture: 'ultimate-crown', url: `${import.meta.env.BASE_URL}assets/effects/couronne.png`, width: 256, height: 173} as const;
/** Height fraction of the crown picture that rests on the head: its band, just above the brim. */
export const CROWN_SEAT = .8;
/** The crown is a little narrower than the Cuisine toque, about the width between the ears. */
export const CROWN_WIDTH_OF_TOQUE = .78;

export interface CrownAnchor {readonly x: number; readonly y: number; readonly w: number; readonly r: number}
/**
 * Where the crown sits on a rabbit's picture, as fractions of that picture (top left origin, native facing): the skull between the
 * ears, read for every species on the same sprites as the Cuisine toque (src/config/cuisineAnchors.ts, checked on captures of the
 * kitchen), so both accessories share one per-species anchor (`evolved`: the one of the evolved drawing). `w`: crown width over picture width; `r`: tilt in degrees.
 */
export function crownAnchor(species: SpeciesId, facing: 1 | -1 = 1, evolved = false): CrownAnchor {
  const {hat} = cuisineAnchors(species, facing, evolved);
  return {x: hat.x, y: hat.y, w: hat.w * CROWN_WIDTH_OF_TOQUE, r: hat.r};
}
/**
 * The crown on a meadow sprite drawn with origin (0.5, 1) at (0, groundY) and a uniform scale `worldWidth / width`, in the
 * coordinates of the body that carries it (so it follows the hop, squash, mirror and rotation of the body).
 */
export function crownPlacement(art: {width: number; height: number; worldWidth: number; groundY: number}, anchor: CrownAnchor): {x: number; y: number; scale: number; angle: number} {
  const scale = art.worldWidth / art.width;
  return {x: (anchor.x - .5) * art.width * scale, y: art.groundY - (1 - anchor.y) * art.height * scale, scale: anchor.w * art.worldWidth / CROWN_ART.width, angle: anchor.r};
}

/**
 * The card's nine-slice frame (WebP, 1200 x 800) with its crown piece cut out and served apart, centred over the top bar, so a
 * card of any height or width stretches only the plain bars. All lengths are in pixels of the served frame.
 * `slice`: the corners (laurels, ribbons, flowers); `bar`: from each outer side of the picture to the outer edge of its golden bar.
 */
export const ULTIMATE_FRAME = {
  url: `${import.meta.env.BASE_URL}assets/ui/ultimate/cadre.webp`, width: 1200, height: 800,
  slice: {top: 284, right: 245, bottom: 239, left: 245},
  bar: {top: 99, right: 47, bottom: 42, left: 45},
  piece: {url: `${import.meta.env.BASE_URL}assets/ui/ultimate/couronne-cadre.webp`, width: 452, height: 166, top: 0},
} as const;

const preloaded = new Set<string>();
/** Starts loading the card's frame and crown once, so an ultimate rabbit's card never opens on an empty frame. */
export function preloadUltimateArt(): void {
  if (typeof Image === 'undefined') return;
  for (const url of [ULTIMATE_FRAME.url, ULTIMATE_FRAME.piece.url, CROWN_ART.url]) {
    if (preloaded.has(url)) continue;
    const image = new Image(); image.decoding = 'async'; image.src = url; preloaded.add(url);
  }
}
