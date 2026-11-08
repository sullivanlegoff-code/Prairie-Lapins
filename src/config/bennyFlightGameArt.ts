import flappy from './bennyFlappyFrames.json';

/**
 * Presentation only: « Le vol de Benny » (6 November 2026), painted by the image model and prepared by
 * scripts/prepare-noel-extras-art.mjs. The sky loops horizontally; one hay column picture serves both halves of a column
 * (the top one is flipped by its style).
 */
export const BENNY_FLIGHT_ART = {
  background: import.meta.env.BASE_URL + 'assets/benny-envol/fond-envol.png',
  column: import.meta.env.BASE_URL + 'assets/benny-envol/obstacle-foin.png',
} as const;

/**
 * Benny's perch, the mini-game's building (same framing as the Salon de soins: a 4 × 4 footprint). Its grass base spans the
 * picture's width, its side corners about 82 % down.
 */
export const PERCH_ART = {
  texture: 'perchoir-benny',
  url: import.meta.env.BASE_URL + 'assets/buildings/perchoir-benny.png',
  width: 399, height: 512,
  worldWidth: 182, originY: .8,
  labelY: 76, actionY: -60,
} as const;

/**
 * Debris on a newly bought parcel (6 November 2026, scripts/prepare-noel-extras-art.mjs): one picture per kind, drawn on its
 * 2 × 2 fine cells, its foot (`originY`) at the cells' centre.
 */
export const DEBRIS_ART = {
  texture: (kind: string) => `debris-${kind}`,
  url: (kind: string) => import.meta.env.BASE_URL + `assets/buildings/debris-${kind}.png`,
  worldWidth: 96, originY: .78,
} as const;

/**
 * Benny's flapping sprite for « Le vol de Benny » (owner, 6 November 2026: « je veux qu'elle utilise ses ailes »), composed by
 * scripts/prepare-benny-flappy.mjs from her approved flight paintings: 8 wing beats side by side in one strip. A touch plays a
 * quick full beat (`quickBeat` ms a frame), and she keeps a calmer beat in between (`calmBeat`).
 */
export const BENNY_FLAPPY = {
  url: import.meta.env.BASE_URL + 'assets/benny-envol/benny-vol.webp',
  frames: flappy.frames, width: flappy.frame.width, height: flappy.frame.height,
  // One wing frame lasts this long (ms): after a touch, then in between; wingGlide is how fast the wings change pace.
  quickBeat: 58, calmBeat: 95, wingGlide: 120,
  // Her tilt (degrees, nose up / nose down, for her speed) and how softly her tilt and her height follow the rules (time constants, ms).
  tiltUp: 15, tiltDown: 26, tiltPerSpeed: 22, tiltGlide: 130, heightGlide: 42,
} as const;
/** Window event of a full-screen activity opening (`detail` true) or closing: the island's Phaser loop sleeps meanwhile. */
export const FULLSCREEN_ACTIVITY_EVENT = 'prairie-fullscreen-activity';
/**
 * Window event of an opaque screen covering the whole island or leaving it (`detail`: which one and whether it covers it): the
 * full-screen shop and Christmas market, the Cuisine. The island's Phaser loop sleeps while anything covers it (audit of
 * 7 November 2026: it kept drawing the snow and the rabbits at 60 frames a second behind the shop).
 */
export const ISLAND_COVER_EVENT = 'prairie-island-cover';
export type IslandCover = {source: 'shop' | 'cuisine'; covered: boolean};
