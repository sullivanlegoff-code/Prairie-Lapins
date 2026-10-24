import manifest from './rabbitBlinkArt.json';
import {rabbitArt, type RabbitArt} from './rabbitArt';
import {SPECIES_IDS, type SpeciesId} from './species';

export const PATCH_KINDS = ['eyes-closed', 'nose-twitch'] as const;
export type PatchKind = typeof PATCH_KINDS[number];
export interface RabbitPatch {kind: PatchKind; texture: string; url: string; x: number; y: number; width: number; height: number}
export interface RabbitBlinkArt {species: SpeciesId; patches: readonly RabbitPatch[]}

/** Fail early if a derived manifest no longer matches the canonical species/sprite registry. */
export const RABBIT_BLINK_ART: readonly RabbitBlinkArt[] = Object.entries(manifest).map(([id, entry]) => {
  const species = SPECIES_IDS.find(species => species === id), art = rabbitArt(species);
  if (!species || !art || art.width !== entry.spriteWidth || art.height !== entry.spriteHeight ||
      !art.url.endsWith(entry.sprite)) throw new Error(`Invalid rabbit patch sprite: ${id}`);
  const patches = PATCH_KINDS.map(kind => {
    const patch = entry[kind];
    if (![patch.x, patch.y, patch.width, patch.height].every(Number.isInteger) || patch.x < 0 || patch.y < 0 ||
        patch.width <= 0 || patch.height <= 0 || patch.x + patch.width > art.width || patch.y + patch.height > art.height)
      throw new Error(`Invalid rabbit patch bounds: ${id}/${kind}`);
    return {kind, texture: `${art.texture}-${kind}`, url: `${import.meta.env.BASE_URL}${patch.file}`,
      x: patch.x, y: patch.y, width: patch.width, height: patch.height};
  });
  return {species, patches};
});
export function rabbitBlinkArt(species: SpeciesId): RabbitBlinkArt | undefined {
  return RABBIT_BLINK_ART.find(art => art.species === species);
}
/** Coordinates in body space, for an image with origin (0, 0), sharing the sprite's uniform scale. */
export function rabbitPatchPlacement(art: Pick<RabbitArt, 'width' | 'height' | 'worldWidth' | 'groundY'>, patch: Pick<RabbitPatch, 'x' | 'y'>) {
  const scale = art.worldWidth / art.width;
  return {x: (patch.x - art.width / 2) * scale, y: art.groundY + (patch.y - art.height) * scale, scale};
}
