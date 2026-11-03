import type {SpeciesId} from './species';

/**
 * Where the Cuisine accessories sit on each rabbit sprite, as fractions of the sprite's own picture (0–1, top left origin,
 * native facing). Read on 10 % grids of every sprite (1 November 2026), then checked on captures of the real kitchen.
 * - `hat`: middle of the toque's band, on top of the skull (between the ears); `w` toque width; `r` tilt in degrees.
 * - `bib`: the bib's tie, under the chin; `w` bib width.
 * - `eyes`: midpoint between the eyes; `w` span covered by both paws.
 * A species without an entry (a new rabbit, such as one from another branch) uses `DEFAULT_ANCHORS`, placed from its facing.
 */
export interface CuisineAnchors {
  readonly hat: {readonly x: number; readonly y: number; readonly w: number; readonly r: number};
  readonly bib: {readonly x: number; readonly y: number; readonly w: number};
  readonly eyes: {readonly x: number; readonly y: number; readonly w: number};
}
const a = (hat: [number, number, number, number], bib: [number, number, number], eyes: [number, number, number]): CuisineAnchors => ({
  hat: {x: hat[0], y: hat[1], w: hat[2], r: hat[3]}, bib: {x: bib[0], y: bib[1], w: bib[2]}, eyes: {x: eyes[0], y: eyes[1], w: eyes[2]},
});
export const CUISINE_ANCHORS: Partial<Record<SpeciesId, CuisineAnchors>> = {
  paille: a([.33, .19, .42, -8], [.29, .41, .44], [.25, .34, .45]),
  neige: a([.8, .28, .34, 10], [.76, .55, .3], [.8, .4, .3]),
  feu: a([.78, .18, .36, 8], [.8, .5, .3], [.8, .31, .3]),
  'belier-gris': a([.71, .1, .36, 8], [.72, .43, .34], [.76, .22, .3]),
  volant: a([.65, .08, .38, 4], [.65, .37, .4], [.7, .21, .4]),
  magicien: a([.6, .18, .36, 6], [.6, .43, .32], [.63, .32, .3]),
  dragon: a([.72, .1, .36, 6], [.72, .48, .3], [.75, .28, .3]),
  frisket: a([.67, .3, .32, 4], [.65, .6, .3], [.68, .45, .28]),
  icy: a([.58, .3, .4, 6], [.58, .62, .34], [.62, .47, .36]),
  ardent: a([.78, .3, .32, 6], [.8, .55, .3], [.8, .42, .28]),
  snk: a([.72, .17, .38, 6], [.72, .54, .3], [.76, .4, .32]),
  'pic-pic': a([.58, .33, .38, 2], [.6, .68, .3], [.62, .61, .3]),
  amethyste: a([.72, .34, .34, 6], [.72, .58, .3], [.74, .43, .28]),
  'princesse-neige': a([.65, .18, .36, 2], [.66, .5, .3], [.7, .37, .32]),
  fluffy: a([.62, .08, .4, 4], [.65, .44, .3], [.68, .28, .3]),
  virvoletant: a([.82, .42, .28, 8], [.85, .7, .25], [.86, .6, .2]),
  phoenix: a([.75, .32, .34, 8], [.78, .56, .28], [.78, .42, .26]),
  roukette: a([.62, .3, .38, 2], [.64, .58, .3], [.65, .49, .32]),
  'wat-wat': a([.66, .22, .38, 6], [.68, .56, .3], [.7, .42, .3]),
  glassofeu: a([.33, .3, .38, -4], [.34, .68, .3], [.35, .55, .32]),
  plume: a([.73, .44, .32, 8], [.76, .66, .26], [.78, .53, .26]),
  boudinet: a([.7, .07, .38, 6], [.72, .47, .3], [.74, .25, .3]),
  bouee: a([.55, .07, .4, 2], [.55, .4, .32], [.62, .23, .4]),
  egiiipte: a([.72, .07, .38, 6], [.74, .48, .3], [.76, .25, .3]),
  piment: a([.72, .22, .36, 6], [.74, .6, .3], [.78, .47, .3]),
  tunini: a([.78, .3, .32, 8], [.8, .58, .26], [.8, .42, .25]),
  bretonette: a([.78, .25, .34, 8], [.78, .56, .3], [.8, .42, .28]),
  dadi: a([.55, .18, .44, 4], [.6, .56, .32], [.63, .36, .38]),
  maxou: a([.75, .36, .32, 8], [.76, .58, .26], [.78, .43, .25]),
  orange: a([.55, .12, .4, 2], [.56, .44, .32], [.62, .28, .34]),
  dinono: a([.76, .17, .34, 6], [.76, .52, .3], [.78, .32, .28]),
  dinenette: a([.73, .14, .34, 6], [.74, .48, .3], [.74, .31, .28]),
  calinou: a([.65, .17, .36, 4], [.72, .45, .3], [.74, .35, .26]),
  requin: a([.72, .05, .38, 6], [.76, .4, .3], [.78, .19, .3]),
  ankylosaure: a([.76, .1, .36, 6], [.8, .48, .3], [.8, .29, .3]),
  // Provisional A1 drawing (1 November 2026), read on the sprite only: not yet checked on a capture of the kitchen.
  benny: a([.58, .22, .36, 6], [.7, .56, .3], [.66, .37, .3]),
};
/** A right-facing rabbit with its head at the top right of its picture; mirrored for a left-facing one. */
export const DEFAULT_ANCHORS: CuisineAnchors = a([.7, .15, .36, 6], [.72, .48, .3], [.75, .3, .3]);
/**
 * The same anchors on the evolved drawings (affection 30, src/config/evolvedArt.ts), read on 10 % grids of the v2 sprites
 * (3 November 2026), not yet checked on a capture of the kitchen. An evolved species without an entry uses `DEFAULT_ANCHORS`.
 */
export const EVOLVED_CUISINE_ANCHORS: Partial<Record<SpeciesId, CuisineAnchors>> = {
  paille: a([.4, .19, .42, -8], [.3, .42, .44], [.25, .29, .45]),
  neige: a([.78, .23, .34, 10], [.8, .56, .3], [.8, .38, .3]),
  feu: a([.78, .18, .34, 8], [.82, .52, .3], [.78, .33, .3]),
  'belier-gris': a([.74, .05, .34, 6], [.78, .42, .32], [.8, .22, .3]),
  volant: a([.7, .07, .36, 4], [.74, .36, .36], [.76, .19, .38]),
  // Read the same way on the v2 of Dinono and Dinenette (3 November 2026): estimates, not yet checked on a capture of the kitchen.
  dinono: a([.74, .17, .34, 6], [.76, .5, .3], [.76, .33, .28]),
  dinenette: a([.76, .14, .34, 6], [.76, .47, .3], [.75, .3, .28]),
};
/** `evolved`: the anchors of the species' evolved drawing (a rabbit showing it), else those of its v1. */
export function cuisineAnchors(species: SpeciesId, facing: 1 | -1 = 1, evolved = false): CuisineAnchors {
  const known = evolved ? EVOLVED_CUISINE_ANCHORS[species] : CUISINE_ANCHORS[species]; if (known) return known;
  if (facing === 1) return DEFAULT_ANCHORS;
  const {hat, bib, eyes} = DEFAULT_ANCHORS;
  return {hat: {...hat, x: 1 - hat.x, r: -hat.r}, bib: {...bib, x: 1 - bib.x}, eyes: {...eyes, x: 1 - eyes.x}};
}
