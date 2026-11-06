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
  // Provisional A1 drawing (1 November 2026), checked with its toque and bib on a capture (6 November 2026).
  benny: a([.58, .22, .36, 6], [.7, .56, .3], [.66, .37, .3]),
  // The Christmas update's rabbits (5 November 2026), read on 10 % grids of their v1 sprites, checked on captures (6 November 2026).
  vantablack: a([.68, .24, .34, 6], [.72, .5, .3], [.73, .37, .3]),
  'gigi-rarafe': a([.42, .09, .3, -4], [.42, .33, .28], [.42, .17, .28]),
  yetiti: a([.62, .08, .36, 4], [.68, .34, .28], [.66, .2, .26]),
  rennes: a([.66, .28, .3, 4], [.7, .56, .28], [.7, .43, .26]),
  susucre: a([.72, .3, .34, 6], [.78, .56, .3], [.79, .43, .28]),
  arkoko: a([.68, .2, .38, 6], [.76, .54, .32], [.79, .4, .3]),
  // The second wave (6 November 2026), read on 10 % grids of their v1 sprites, checked on captures (6 November 2026).
  fantome: a([.55, .1, .36, 2], [.55, .45, .3], [.56, .3, .3]),
  bouyoyo: a([.6, .12, .36, 4], [.6, .48, .3], [.62, .32, .3]),
  nuage: a([.62, .12, .36, 4], [.64, .48, .3], [.66, .32, .3]),
  champignon: a([.62, .24, .3, 8], [.77, .58, .28], [.77, .47, .26]),
  'lapin-de-sulli': a([.5, .12, .4, 0], [.5, .6, .34], [.52, .4, .34]),
  'pain-epice': a([.74, .3, .26, 6], [.76, .62, .26], [.8, .41, .24]),
  'flocon-cristal': a([.62, .14, .34, 4], [.64, .45, .28], [.66, .3, .28]),
};
/** A right-facing rabbit with its head at the top right of its picture; mirrored for a left-facing one. */
export const DEFAULT_ANCHORS: CuisineAnchors = a([.7, .15, .36, 6], [.72, .48, .3], [.75, .3, .3]);
/**
 * The same anchors on the evolved drawings (affection 30, src/config/evolvedArt.ts), read on 10 % grids of the v2 sprites
 * (3 November 2026). All checked on captures of the toque and bib on 6 November 2026; fifteen were re-read on a 5 % grid then. An evolved species without an entry uses `DEFAULT_ANCHORS`.
 */
export const EVOLVED_CUISINE_ANCHORS: Partial<Record<SpeciesId, CuisineAnchors>> = {
  paille: a([.4, .19, .42, -8], [.3, .42, .44], [.25, .29, .45]),
  neige: a([.78, .23, .34, 10], [.8, .56, .3], [.8, .38, .3]),
  feu: a([.78, .18, .34, 8], [.82, .52, .3], [.78, .33, .3]),
  'belier-gris': a([.74, .05, .34, 6], [.78, .42, .32], [.8, .22, .3]),
  volant: a([.7, .07, .36, 4], [.74, .36, .36], [.76, .19, .38]),
  // Read the same way on the v2 of Dinono and Dinenette (3 November 2026): checked on a capture (6 November 2026).
  dinono: a([.74, .17, .34, 6], [.76, .5, .3], [.76, .33, .28]),
  dinenette: a([.76, .14, .34, 6], [.76, .47, .3], [.75, .3, .28]),
  // Read on the v2 drawings; checked on captures (6 November 2026), the misplaced ones re-read on a 5 % grid.
  amethyste: a([.7, .3, .32, 4], [.78, .58, .26], [.74, .43, .24]),
  ardent: a([.8, .35, .3, 6], [.82, .6, .28], [.82, .46, .24]),
  boudinet: a([0.72, 0.12, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  bouee: a([0.72, 0.12, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  bretonette: a([0.72, 0.1, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  egiiipte: a([0.72, 0.12, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  fluffy: a([.5, .4, .3, 0], [.58, .6, .26], [.58, .51, .24]),
  frisket: a([.72, .25, .32, 4], [.74, .55, .28], [.76, .39, .32]),
  glassofeu: a([.42, .31, .32, -4], [.43, .6, .28], [.43, .47, .28]),
  icy: a([.56, .3, .36, 2], [.6, .6, .3], [.62, .46, .32]),
  phoenix: a([0.72, 0.12, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  'pic-pic': a([.5, .33, .32, 0], [.5, .57, .28], [.5, .46, .28]),
  piment: a([0.72, 0.12, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  plume: a([.74, .37, .3, 6], [.8, .64, .26], [.76, .5, .24]),
  'princesse-neige': a([.56, .12, .28, 2], [.6, .36, .24], [.6, .26, .24]),
  roukette: a([0.72, 0.12, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  snk: a([0.72, 0.12, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  tunini: a([.65, .3, .26, 4], [.7, .54, .24], [.66, .43, .22]),
  virvoletant: a([.72, .3, .3, 4], [.74, .68, .26], [.75, .55, .28]),
  'wat-wat': a([0.72, 0.12, .36, 4], [.74, 0.5, .3], [.74, 0.3, .3]),
  calinou: a([0.7, 0.18, .36, 4], [.74, 0.55, .3], [.74, 0.34, .3]),
  dadi: a([0.72, 0.1, .36, 4], [.74, 0.56, .3], [.74, 0.3, .3]),
  magicien: a([0.72, 0.1, .36, 4], [.74, 0.55, .3], [.74, 0.38, .3]),
  maxou: a([.68, .3, .3, 4], [.8, .55, .26], [.74, .4, .24]),
  orange: a([.45, .08, .3, 2], [.47, .4, .26], [.46, .25, .28]),
  ankylosaure: a([0.74, 0.12, .36, 4], [.74, 0.54, .3], [.74, 0.33, .3]),
  dragon: a([.74, .18, .3, 4], [.8, .5, .28], [.78, .33, .24]),
  requin: a([0.72, 0.12, .36, 4], [.74, 0.58, .3], [.74, 0.31, .3]),
  // The Christmas update's evolutions (6 November 2026): read on the v2 sprites, checked on captures.
  fantome: a([.45, .19, .28, -2], [.42, .34, .26], [.42, .24, .26]),
  bouyoyo: a([.76, .31, .22, 6], [.85, .55, .2], [.87, .405, .18]),
  nuage: a([.3, .2, .3, -4], [.3, .4, .3], [.28, .29, .24]),
  champignon: a([.73, .19, .26, 6], [.8, .5, .24], [.78, .375, .22]),
  'lapin-de-sulli': a([.42, .16, .34, -2], [.38, .4, .34], [.3, .28, .3]),
  'pain-epice': a([.81, .3, .26, 2], [.84, .535, .22], [.86, .405, .18]),
  'flocon-cristal': a([.62, .14, .34, 4], [.64, .45, .28], [.66, .3, .28]),
  vantablack: a([.745, .3, .2, 4], [.865, .57, .2], [.86, .385, .18]),
  'gigi-rarafe': a([.4, .09, .28, -4], [.45, .33, .26], [.42, .15, .26]),
  yetiti: a([.38, .1, .3, -4], [.4, .33, .3], [.4, .2, .24]),
  rennes: a([.72, .255, .28, 4], [.79, .45, .24], [.79, .35, .22]),
  susucre: a([.7, .28, .34, 6], [.74, .58, .3], [.76, .44, .28]),
  arkoko: a([.826, .233, .22, 4], [.85, .56, .22], [.863, .38, .18]),
};
/** `evolved`: the anchors of the species' evolved drawing (a rabbit showing it), else those of its v1. */
export function cuisineAnchors(species: SpeciesId, facing: 1 | -1 = 1, evolved = false): CuisineAnchors {
  const known = evolved ? EVOLVED_CUISINE_ANCHORS[species] : CUISINE_ANCHORS[species]; if (known) return known;
  if (facing === 1) return DEFAULT_ANCHORS;
  const {hat, bib, eyes} = DEFAULT_ANCHORS;
  return {hat: {...hat, x: 1 - hat.x, r: -hat.r}, bib: {...bib, x: 1 - bib.x}, eyes: {...eyes, x: 1 - eyes.x}};
}
