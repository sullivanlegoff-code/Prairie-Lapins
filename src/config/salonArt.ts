import type {CareKind} from './balance';

/**
 * Presentation only: the Salon de soins as a spa with a corner for each care (owner, 10 November 2026; concept B « Thermes aux
 * sources chaudes », prepared by scripts/prepare-spa-art.mjs). Logical 6 × 6 footprint (a salon that keeps the former 4 × 4 is
 * drawn `salonScale` smaller, everything below included). Its grass diamond spans the whole 768-pixel texture, side corners at
 * y 486: drawn 1.5 times as wide as the 4 × 4 buildings' 177. Lengths below are world pixels for the 6 × 6 salon.
 */
export const SALON_ART = {
  texture: 'salon-soins',
  url: import.meta.env.BASE_URL + 'assets/buildings/salon-soins.png',
  width: 768, height: 767,
  worldWidth: 177 * 1.5, originY: (486 - 27 * 768 / 265.5) / 767,
  labelY: 114,
  /** Where the « welcome back » heart bubble floats, above the door. */
  actionY: -70,
  /** One thin progress row for the rabbit in care, below the building's path. */
  progress: {x: 0, y: 96, width: 64, height: 7},
  /**
   * The care corners, as fractions of the texture (painting read on 10 November 2026): where the rabbit stands on the brushing
   * stool and on the massage table, and the middle of the tub's water for the bath (the rabbit sits in it up to its chest).
   */
  stations: {bath: {x: .5861, y: .6997}, brush: {x: .2249, y: .615}, massage: {x: .8054, y: .5096}} satisfies Record<CareKind, {x: number; y: number}>,
  /** The rabbit at the salon is this share of its meadow size, to fit the stool, the tub and the table. */
  rabbitScale: .85,
  /** Each care's share of that size: smaller under the massage kiosk's roof. */
  careScale: {bath: 1, brush: 1, massage: .72} satisfies Record<CareKind, number>,
  /** The tub's front, cut from the same painting (same size and place), drawn over the rabbit in its bath. */
  tub: {texture: 'salon-baquet', url: import.meta.env.BASE_URL + 'assets/buildings/salon-baquet.png'},
} as const;
/** The spa's small painted pieces (scripts/prepare-spa-art.mjs), square pictures of `size` pixels. */
const spa = (name: string, size: number) => ({texture: `spa-${name}`, url: `${import.meta.env.BASE_URL}assets/effects/spa/${name}.png`, size});
export const SPA_PIECES = {
  foam: spa('mousse', 192), brush: spa('brosse', 160), turban: spa('turban', 160), cucumber: spa('concombre', 64),
  blanket: spa('couverture', 192), bubble: spa('bulle', 64), tuft: spa('touffe', 64), heart: spa('coeur', 64),
} as const;
/** The menu's scene of each care (960 × 640 WebP), with where the rabbit sits, as fractions: its feet, or the water line for the bath. */
export const SALON_SCENES: Record<CareKind, {url: string; seat: {x: number; y: number}; height: number; front?: number}> = {
  // `front`: from this height down, the tub is drawn again over the rabbit (the front of the tub hides its body). `height`: the
  // rabbit's whole picture, as a share of the scene's height (larger in the bath, where only its top shows).
  bath: {url: `${import.meta.env.BASE_URL}assets/salon/scene-bain.webp`, seat: {x: .5, y: .64}, height: .62, front: .66},
  brush: {url: `${import.meta.env.BASE_URL}assets/salon/scene-brossage.webp`, seat: {x: .495, y: .77}, height: .46},
  massage: {url: `${import.meta.env.BASE_URL}assets/salon/scene-massage.webp`, seat: {x: .45, y: .63}, height: .46},
};
/**
 * The picnic laid in an enclosure for a few seconds. Since 4 November 2026 (owner: a bigger cloth with its basket): the left part
 * of the picnic v2 painting, prepared by scripts/prepare-statue-picnic-rope-art.mjs. The scene draws it about as wide as the
 * enclosure's roaming zone; `originY` is the middle of the cloth, under its basket.
 */
export const PICNIC_ART = {
  texture: 'pique-nique-v2',
  url: import.meta.env.BASE_URL + 'assets/effects/pique-nique-v2.png',
  width: 512, height: 370,
  originY: .62,
} as const;
