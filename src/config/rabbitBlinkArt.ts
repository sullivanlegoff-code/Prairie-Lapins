import manifest from './rabbitBlinkArt.json';
import {evolvedRabbitArt, rabbitArt, type RabbitArt} from './rabbitArt';
import {SPECIES_IDS, type SpeciesId} from './species';

export const PATCH_KINDS = ['eyes-closed', 'nose-twitch'] as const;
export type PatchKind = typeof PATCH_KINDS[number];
export interface RabbitPatch {kind: PatchKind; texture: string; url: string; x: number; y: number; width: number; height: number}
/** `evolved`: the patches of the species' evolved drawing (7 November 2026: the evolutions blink too). */
export interface RabbitBlinkArt {species: SpeciesId; evolved: boolean; patches: readonly RabbitPatch[]}
type Patch = {file: string; x: number; y: number; width: number; height: number};
type Entry = {sprite: string; spriteWidth: number; spriteHeight: number} & Partial<Record<PatchKind, Patch>>;

/**
 * Fail early if a derived manifest no longer matches the canonical species/sprite registry. A key is a species id (its first
 * drawing) or `<id>-evolution`; an entry may hold only one kind (Bouée keeps her sunglasses on: a nose, no eyelids).
 */
export const RABBIT_BLINK_ART: readonly RabbitBlinkArt[] = Object.entries(manifest as Record<string, Entry>).map(([key, entry]) => {
  const evolved = key.endsWith('-evolution'), id = evolved ? key.slice(0, -'-evolution'.length) : key;
  const species = SPECIES_IDS.find(species => species === id), art: RabbitArt | undefined = evolved ? evolvedRabbitArt(species) : rabbitArt(species);
  if (!species || !art || art.width !== entry.spriteWidth || art.height !== entry.spriteHeight ||
      !art.url.endsWith(entry.sprite)) throw new Error(`Invalid rabbit patch sprite: ${key}`);
  const patches = PATCH_KINDS.flatMap(kind => {
    const patch = entry[kind];
    if (!patch) return [];
    if (![patch.x, patch.y, patch.width, patch.height].every(Number.isInteger) || patch.x < 0 || patch.y < 0 ||
        patch.width <= 0 || patch.height <= 0 || patch.x + patch.width > art.width || patch.y + patch.height > art.height)
      throw new Error(`Invalid rabbit patch bounds: ${key}/${kind}`);
    return [{kind, texture: `${art.texture}-${kind}`, url: `${import.meta.env.BASE_URL}${patch.file}`,
      x: patch.x, y: patch.y, width: patch.width, height: patch.height}];
  });
  if (!patches.length) throw new Error(`Rabbit patch entry without patches: ${key}`);
  return {species, evolved, patches};
});
export function rabbitBlinkArt(species: SpeciesId, evolved = false): RabbitBlinkArt | undefined {
  return RABBIT_BLINK_ART.find(art => art.species === species && art.evolved === evolved);
}
/** Coordinates in body space, for an image with origin (0, 0), sharing the sprite's uniform scale. */
export function rabbitPatchPlacement(art: Pick<RabbitArt, 'width' | 'height' | 'worldWidth' | 'groundY'>, patch: Pick<RabbitPatch, 'x' | 'y'>) {
  const scale = art.worldWidth / art.width;
  return {x: (patch.x - art.width / 2) * scale, y: art.groundY + (patch.y - art.height) * scale, scale};
}
