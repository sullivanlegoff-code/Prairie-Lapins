/** Presentation only: the Antre du dragon (owner's choice B, 11 November 2026; prepared by scripts/prepare-lair-art.mjs). Logical 4 × 4 footprint.
 * Its grass diamond spans x 9–394 of the 403-pixel texture, side corners at y 380: drawn so the diamond is 177 wide, like the forest's. */
export const LAIR_ART = {
  texture: 'antre-dragon',
  url: import.meta.env.BASE_URL + 'assets/buildings/antre-dragon.png',
  width: 403, height: 512,
  worldWidth: 177 * 403 / 385, originY: (380 - 18 * 385 / 177) / 512,
  labelY: 76,
  /** Where a bubble would float, above the door. */
  actionY: -40,
} as const;
