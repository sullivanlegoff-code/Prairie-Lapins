/** Presentation only: the Forêt de Brocéliande (imagegen painting chosen by the owner, prepared by scripts/prepare-forest-art.mjs). Logical 4 × 4 footprint.
 * Its grass diamond spans x 8–492 of the 502-pixel texture, side corners at y 362: drawn so the diamond is 177 wide, like the salon's. */
export const FOREST_ART = {
  texture: 'foret-broceliande',
  url: import.meta.env.BASE_URL + 'assets/buildings/foret-broceliande.png',
  width: 502, height: 512,
  worldWidth: 177 * 502 / 484, originY: (362 - 18 * 484 / 177) / 512,
  labelY: 76,
  /** Where a bubble would float, above the door. */
  actionY: -40,
} as const;
