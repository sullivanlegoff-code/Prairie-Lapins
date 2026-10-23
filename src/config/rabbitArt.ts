import {SPECIES, SPECIES_IDS, type SpeciesId, type SpeciesArt} from './species';

/** The adapter resolves deployment URLs; the registry owns all sprite metadata. */
/** `facing` is the native direction of the picture as a mirror sign: 1 looks right (default), -1 looks left. */
export type RabbitArt = Omit<Extract<SpeciesArt, {kind: 'static-sprite'}>, 'kind' | 'file' | 'preloadOrder' | 'facing'> & {species: SpeciesId; url: string; facing: 1 | -1};
export const RABBIT_ART: readonly RabbitArt[] = SPECIES_IDS.flatMap(species => {
  const art = SPECIES[species].art;
  return art.kind === 'static-sprite' ? [{species, ...art}] : [];
}).sort((a, b) => a.preloadOrder - b.preloadOrder).map(({species, file, texture, width, height, worldWidth, groundY, facing}) => ({
  species, texture, url: `${import.meta.env.BASE_URL}${file}`, width, height, worldWidth, groundY, facing: facing === 'left' ? -1 as const : 1 as const,
}));
export function rabbitArt(species?: string): RabbitArt | undefined {
  return RABBIT_ART.find(art => art.species === species);
}
/** Public compatibility views: references to the same derived objects, never separate metadata. */
export const SNOW_ART = rabbitArt('neige')!;
export const STRAW_ART = rabbitArt('paille')!;
export const LOP_ART = rabbitArt('belier-gris')!;
export const FIRE_ART = rabbitArt('feu')!;
export const FLIGHT_ART = rabbitArt('volant')!;
