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
/**
 * The painted rope (owner, 4 November 2026: the flat pink line did not fit the game): a twisted pink and cream rope tile, a whole
 * number of twists wide so it repeats without a seam, and a light wooden handle with a pink flower (imagegen, prepared by
 * scripts/prepare-statue-picnic-rope-art.mjs).
 */
export const JUMP_ROPE_PIECES = {
  tile: {url: import.meta.env.BASE_URL + 'assets/jump-rope/rope-tile.png', width: 648, height: 48},
  handle: {url: import.meta.env.BASE_URL + 'assets/jump-rope/rope-handle.png', width: 31, height: 96},
  /** Thickness of the drawn rope, in CSS pixels. */
  thickness: 7,
} as const;
