import WINTER_BUILDING_LIST from './winterBuildingFiles.json';
/**
 * The Christmas island's painted pictures (concepts noel-v1, 4 November 2026: island C « Village de Noël », night C1,
 * market A « Chalets », mini-game B « Les cadeaux du ciel »). Each asset is loaded only while the event is on.
 */
const base = `${import.meta.env.BASE_URL}assets/noel/`;

export interface WinterPicture {readonly texture: string; readonly url: string; readonly width: number; readonly height: number}

export const WINTER_ART = {
  /** Tiny painted snowflakes, a few shapes, drawn 2 to 5 screen pixels wide. */
  flakes: [0, 1, 2, 3].map(i => ({texture: `noel-flocon-${i}`, url: `${base}flocon-${i}.png`, width: 32, height: 32})) as readonly WinterPicture[],
} as const;

/**
 * The snowman (owner, 4 November 2026), built in three steps in an enclosure, then standing there until the end of the cycle:
 * three pictures of the same size and framing (the snowman's base centred at the bottom, `originY` from the top), drawn
 * `worldWidth` wide. Loaded on demand; a missing picture only means no snowman is drawn.
 */
export const SNOWMAN_ART = {
  steps: [1, 2, 3].map(i => ({texture: `noel-bonhomme-${i}`, url: `${base}bonhomme-${i}.png`})) as readonly {texture: string; url: string}[],
  worldWidth: 58, originY: .95,
} as const;

/** The snowball fights: a tiny snowball (drawn `ballWorld` wide) and the puff of a hit (drawn `puffWorld` wide, fading out). */
export const SNOWBALL_ART = {
  ball: {texture: 'noel-boule-neige', url: `${base}boule-neige.png`},
  puff: {texture: 'noel-boule-impact', url: `${base}boule-impact.png`},
  ballWorld: 9, puffWorld: 26, puffMs: 300,
} as const;

/** The sucre d'orge icon of the Christmas market and its balance (an <img>, hidden while the picture is missing). */
export const CANDY_ICON_URL = `${base}sucre-orge.png`;

/** « Les cadeaux du ciel »: the painted night backdrop, the sleigh, the rabbit's basket and the four presents. */
export const SKY_GIFTS_ART = {
  background: `${base}minijeu/fond.webp`,
  sleigh: `${base}minijeu/traineau.png`,
  basket: `${base}minijeu/hotte.png`,
  gifts: [0, 1, 2, 3].map(i => `${base}minijeu/cadeau-${i}.png`) as readonly string[],
  /** The traps not to catch (owner, 5 November 2026), and the splash or blast where one lands in the basket. */
  traps: {poison: `${base}minijeu/piege-poison.png`, bomb: `${base}minijeu/piege-bombe.png`},
  trapHits: {poison: `${base}minijeu/effet-poison.png`, bomb: `${base}minijeu/effet-boum.png`},
} as const;

/**
 * The snowy copies of the buildings and habitats (same size and silhouette as the normal pictures, painted for the event and
 * prepared by scripts/prepare-winter-island.mjs `items`): served under assets/noel/ at the same relative path.
 */
export const WINTER_BUILDING_FILES: readonly string[] = WINTER_BUILDING_LIST;
/** The snowy copy of a meadow picture while the event is on, else the picture itself. */
export function winterUrl(url: string, active: boolean): string {
  if (!active || !url.startsWith(import.meta.env.BASE_URL)) return url;
  const path = url.slice(import.meta.env.BASE_URL.length);
  if (!path.startsWith('assets/') || !WINTER_BUILDING_FILES.includes(path.slice('assets/'.length))) return url;
  return `${base}${path.slice('assets/'.length)}`;
}
