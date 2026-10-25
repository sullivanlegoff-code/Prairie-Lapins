/** Presentation only: the Statue de l'Affection (Codex imagegen painting, prepared by scripts/prepare-food-art.mjs). Logical 4 × 4 footprint.
 * Its grass diamond spans x 8–469 of the 478-pixel texture, side corners at y 370: drawn so the diamond is 177 wide, like the kitchen's. */
export const STATUE_ART = {
  texture: 'statue-affection',
  url: import.meta.env.BASE_URL + 'assets/buildings/statue-affection.png',
  width: 478, height: 512,
  worldWidth: 177 * 478 / 461, originY: (370 - 18 * 461 / 177) / 512,
  labelY: 76,
} as const;
