import type {SpeciesId} from './species';

/**
 * Painted effects of the legendaries (owner's requests of 31 October and 1 November 2026, ChatGPT paintings, free hand given to the assistant).
 * Pictures: scripts/prepare-legendary-effects.mjs (effects) and scripts/prepare-legendary-parts.mjs (wing, fin, tail, open mouth).
 * Their designs never change: the body pictures are the approved sprite minus the moving part, which is drawn behind it.
 */
export const LEGENDARY_SHOWS = ['dragon', 'requin', 'ankylosaure'] as const;
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
  // Ankylosaure (owner's request of 1 November 2026: everything about the earth)
  rock: effect('rock', 64, 56), stone: effect('stone', 40, 34), clod: effect('clod', 44, 43), mound: effect('mound', 96, 49), gravel: effect('gravel', 40, 30),
  /** A crack in the ground seen in perspective, and a ring of dust flat on the ground (the slam's shock). */
  crack: effect('crack', 160, 78), dustring: effect('dustring', 192, 85), dust: effect('dust', 96, 80),
  /** Full-screen paintings of the earthquake (page only): the ground split open, a wall of dust, and earth strata for the card. */
  rift: effect('rift', 1280, 853), dustwall: effect('dustwall', 1280, 853), strata: effect('strata', 1280, 853),
} as const;

export interface LegendaryParts {
  /** The approved sprite without its moving part. */
  body: {texture: string; url: string};
  /** The part alone, same frame as the sprite; it turns about `pivot` (sprite pixels), hidden behind the body. */
  part: {texture: string; url: string}; pivot: {x: number; y: number};
  /** Ankylosaure only: where the club of its tail meets the ground at the end of a slam (sprite pixels). */
  strike?: {x: number; y: number};
  /** Dragon only: the body with its mouth open (wider on the right, same left edge and scale) and the mouth point in its pixels. */
  mouth?: {texture: string; url: string; width: number; point: {x: number; y: number}};
}
const rabbitFile = (species: LegendaryShow, name: string) => ({texture: `rabbit-${name}`, url: `${import.meta.env.BASE_URL}assets/rabbits/${species}/${name}.png`});
export const LEGENDARY_PARTS: Record<LegendaryShow, LegendaryParts> = {
  dragon: {body: rabbitFile('dragon', 'dragon-v1-body'), part: rabbitFile('dragon', 'dragon-wing'), pivot: {x: 181, y: 168},
    mouth: {...rabbitFile('dragon', 'dragon-mouth-open-body'), width: 442, point: {x: 403, y: 174}}},
  requin: {body: rabbitFile('requin', 'requin-v1-body'), part: rabbitFile('requin', 'requin-fin'), pivot: {x: 160, y: 181}},
  ankylosaure: {body: rabbitFile('ankylosaure', 'ankylosaure-v1-body'), part: rabbitFile('ankylosaure', 'ankylosaure-tail'), pivot: {x: 81.5, y: 275.2}, strike: {x: 42, y: 288}},
};

/** Every picture a meadow with this legendary needs, for the scene loader. */
export function legendaryMeadowArt(species: LegendaryShow): {texture: string; url: string}[] {
  const parts = LEGENDARY_PARTS[species], e = LEGENDARY_EFFECTS;
  const own = species === 'dragon' ? [...e.breath, ...e.flame, e.ember, e.spark, e.smoke]
    : species === 'requin' ? [e.surfboard, e.puddle, e.bubble, e.drop, ...e.surfwave, ...e.splash]
    : [e.rock, e.stone, e.clod, e.mound, e.gravel, e.crack, e.dustring, e.dust];
  return [parts.body, parts.part, ...(parts.mouth ? [parts.mouth] : []), ...own];
}
