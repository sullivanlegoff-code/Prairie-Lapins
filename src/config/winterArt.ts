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

/** « Les cadeaux du ciel »: the painted night backdrop, the sleigh, the rabbit's basket and the four presents. */
export const SKY_GIFTS_ART = {
  background: `${base}minijeu/fond.webp`,
  sleigh: `${base}minijeu/traineau.png`,
  basket: `${base}minijeu/hotte.png`,
  gifts: [0, 1, 2, 3].map(i => `${base}minijeu/cadeau-${i}.png`) as readonly string[],
} as const;

/**
 * The snowy copies of the buildings and habitats (same size and silhouette as the normal pictures, painted for the event and
 * prepared by scripts/prepare-winter-island.mjs `items`): served under assets/noel/ at the same relative path.
 */
export const WINTER_BUILDING_FILES: readonly string[] = [];
/** The snowy copy of a meadow picture while the event is on, else the picture itself. */
export function winterUrl(url: string, active: boolean): string {
  if (!active || !url.startsWith(import.meta.env.BASE_URL)) return url;
  const path = url.slice(import.meta.env.BASE_URL.length);
  if (!path.startsWith('assets/') || !WINTER_BUILDING_FILES.includes(path.slice('assets/'.length))) return url;
  return `${base}${path.slice('assets/'.length)}`;
}
