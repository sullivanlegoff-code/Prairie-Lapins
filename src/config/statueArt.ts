import type {Building} from '../state/types';

/** Presentation only: the Statue de l'Affection (Codex imagegen painting, prepared by scripts/prepare-food-art.mjs). Logical 4 × 4 footprint.
 * Its grass diamond spans x 8–469 of the 478-pixel texture, side corners at y 370: drawn so the diamond is 177 wide, like the kitchen's. */
export const STATUE_ART = {
  texture: 'statue-affection',
  url: import.meta.env.BASE_URL + 'assets/buildings/statue-affection.png',
  width: 478, height: 512,
  worldWidth: 177 * 478 / 461, originY: (370 - 18 * 461 / 177) / 512,
  labelY: 76,
} as const;
/**
 * The second Statue de l'Affection (owner's carte blanche, 4 November 2026: two stone rabbits kissing under a flowered arch;
 * imagegen painting prepared by scripts/prepare-statue-picnic-rope-art.mjs). Its grass diamond spans x 8–479 of the 488-pixel
 * texture, side corners at y 365: drawn so the diamond is 177 wide, like the first statue's.
 */
export const STATUE_2_ART = {
  texture: 'statue-affection-2',
  url: import.meta.env.BASE_URL + 'assets/buildings/statue-affection-2.png',
  width: 488, height: 512,
  worldWidth: 177 * 488 / 471, originY: (365 - 18 * 471 / 177) / 512,
  labelY: 76,
} as const;
/** The drawing of a statue: the second one built gets its own. Without `id`, the statue about to be placed. */
export function statueArtFor(buildings: readonly Pick<Building, 'id' | 'kind'>[], id?: string): typeof STATUE_ART | typeof STATUE_2_ART {
  const statues = buildings.filter(b => b.kind === 'statue');
  const index = id === undefined ? statues.length : statues.findIndex(b => b.id === id);
  return index >= 1 ? STATUE_2_ART : STATUE_ART;
}
