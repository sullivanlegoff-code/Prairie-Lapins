/** Presentation only: the Terrain de corde à sauter, concept B « Kiosque à sauter » (imagegen painting, prepared by
 * scripts/prepare-jump-rope-art.mjs). Logical 4 × 4 footprint. Its grass diamond spans x 8–494 of the 504-pixel texture,
 * side corners at y 362: drawn so the diamond is 177 wide, like the forest's. */
export const JUMP_ROPE_ART = {
  texture: 'kiosque-corde',
  url: import.meta.env.BASE_URL + 'assets/buildings/kiosque-corde.png',
  width: 504, height: 512,
  worldWidth: 177 * 504 / 486, originY: (362 - 18 * 486 / 177) / 512,
  labelY: 76,
  /** Where a bubble would float, above the steps. */
  actionY: -40,
} as const;
