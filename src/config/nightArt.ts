import type {RabbitArt} from './rabbitArt';
import FUSION_LEDS from './fusionLeds.json';

/**
 * Rabbits that light up at night (owner, 24 November 2026: Fusion Nucléaire, « la forme allumée la nuit et le jour la forme
 * éteinte »). Each day drawing has a lit twin of the same size, laid exactly over it by scripts/prepare-fusion-night.mjs; the
 * meadow fades the lit twin in as night falls (src/display/winterClock.ts, nightLevel) and out at dawn, every night of the year.
 * The portraits of the cards and the collection keep the day drawing. Its lights alone (`glow`, same size) are added over the
 * Christmas night shade, which would otherwise dim them like the rest of the meadow.
 * Its LEDs really light up (owner, 24 November 2026: « vraiment des leds qui s'allument », like the lit enclosures): each one
 * found in the lit picture (`leds`: [x, y, strength 0 to 1] in the drawing's pixels, src/config/fusionLeds.json) gets a little
 * twinkling halo in the meadow at night.
 */
export type Led = readonly [number, number, number];
export interface NightArt {texture: string; url: string; glow: {texture: string; url: string}; leds: readonly Led[]}
const LIT: Readonly<Record<string, {base: string; evolved?: string; leds: {base: readonly Led[]; evolved?: readonly Led[]}}>> = {
  'fusion-nucleaire': {base: 'fusion-nucleaire/fusion-nucleaire-v1-night.png', evolved: 'fusion-nucleaire/fusion-nucleaire-v2-night.png', leds: FUSION_LEDS as unknown as {base: Led[]; evolved: Led[]}},
};
export const NIGHT_ART_SPECIES: readonly string[] = Object.keys(LIT);
/** The lit twin of this drawing, or null when it has none. */
export function nightArtFor(art: Pick<RabbitArt, 'species' | 'texture' | 'evolved'>): NightArt | null {
  const lit = LIT[art.species], stage = art.evolved ? 'evolved' : 'base', file = lit?.[stage];
  if (!file) return null;
  const url = `${import.meta.env.BASE_URL}assets/rabbits/${file}`;
  return {texture: `${art.texture}-night`, url, glow: {texture: `${art.texture}-glow`, url: url.replace(/-night\.png$/, '-glow.png')}, leds: lit.leds[stage] ?? []};
}
