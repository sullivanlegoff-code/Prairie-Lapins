import type {SpeciesId} from './species';

/**
 * Painted effects of the two legendaries (owner's request of 31 October 2026, ChatGPT paintings, free hand given to the assistant).
 * Pictures: scripts/prepare-legendary-effects.mjs (effects) and scripts/prepare-legendary-parts.mjs (wing, fin, open mouth).
 * Their designs never change: the body pictures are the approved sprite minus the moving part, which is drawn behind it.
 */
export const LEGENDARY_SHOWS = ['dragon', 'requin'] as const;
export type LegendaryShow = typeof LEGENDARY_SHOWS[number];
export const isLegendaryShow = (species: SpeciesId | string): species is LegendaryShow => (LEGENDARY_SHOWS as readonly string[]).includes(species);

/** Window event of the laboratory buttons: `detail.act` replays that meadow show on every legendary in view. */
export const LEGENDARY_TEST_EVENT = 'prairie-legendary-test';

export interface EffectArt {texture: string; url: string; width: number; height: number}
const effect = (name: string, width: number, height: number): EffectArt =>
  ({texture: `legendary-${name}`, url: `${import.meta.env.BASE_URL}assets/effects/legendary/${name}.webp`, width, height});
const frames = (name: string, count: number, width: number, height: number) => Array.from({length: count}, (_, k) => effect(`${name}-${k + 1}`, width, height));

/** Sizes are the WebP pixels (assets-source/effects/legendary/manifest.json). */
export const LEGENDARY_EFFECTS = {
  /** Fire breath leaving the mouth on the left, at mid-height: start, growth, three full flames, fading. */
  breath: frames('breath', 6, 384, 96),
  /** A dancing flame standing on its base: a loop of six. */
  flame: frames('flame', 6, 96, 131),
  ember: effect('ember', 24, 26), spark: effect('spark', 20, 20), smoke: effect('smoke', 96, 69),
  halo: effect('halo', 512, 512),
  surfboard: effect('surfboard', 160, 32), puddle: effect('puddle', 128, 51), bubble: effect('bubble', 32, 32), drop: effect('drop', 24, 26),
  /** A small wave rolling to the right under the surfboard: a loop of six. */
  surfwave: frames('surfwave', 6, 128, 88),
  /** A splash standing on the ground: rise, crown, fall. */
  splash: frames('splash', 6, 112, 93),
  /** Full-screen paintings of the first appearance, used by the page only. */
  firewall: frames('firewall', 5, 1280, 853), wave: frames('wave', 3, 1280, 853), foam: effect('foam', 1280, 853),
} as const;

export interface LegendaryParts {
  /** The approved sprite without its moving part. */
  body: {texture: string; url: string};
  /** The part alone, same frame as the sprite; it turns about `pivot` (sprite pixels), hidden behind the body. */
  part: {texture: string; url: string}; pivot: {x: number; y: number};
  /** Dragon only: the body with its mouth open (wider on the right, same left edge and scale) and the mouth point in its pixels. */
  mouth?: {texture: string; url: string; width: number; point: {x: number; y: number}};
}
const rabbitFile = (species: LegendaryShow, name: string) => ({texture: `rabbit-${name}`, url: `${import.meta.env.BASE_URL}assets/rabbits/${species}/${name}.png`});
export const LEGENDARY_PARTS: Record<LegendaryShow, LegendaryParts> = {
  dragon: {body: rabbitFile('dragon', 'dragon-v1-body'), part: rabbitFile('dragon', 'dragon-wing'), pivot: {x: 181, y: 168},
    mouth: {...rabbitFile('dragon', 'dragon-mouth-open-body'), width: 442, point: {x: 403, y: 174}}},
  requin: {body: rabbitFile('requin', 'requin-v1-body'), part: rabbitFile('requin', 'requin-fin'), pivot: {x: 160, y: 181}},
};

/** Every picture a meadow with this legendary needs, for the scene loader. */
export function legendaryMeadowArt(species: LegendaryShow): {texture: string; url: string}[] {
  const parts = LEGENDARY_PARTS[species], e = LEGENDARY_EFFECTS;
  const own = species === 'dragon' ? [...e.breath, ...e.flame, e.ember, e.spark, e.smoke] : [e.surfboard, e.puddle, e.bubble, e.drop, ...e.surfwave, ...e.splash];
  return [parts.body, parts.part, ...(parts.mouth ? [parts.mouth] : []), e.halo, ...own];
}
