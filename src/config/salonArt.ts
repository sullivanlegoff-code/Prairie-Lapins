/** Presentation only: the Salon de soins (imagegen painting chosen by the owner, prepared by scripts/prepare-care-art.mjs). Logical 4 × 4 footprint.
 * Its grass diamond spans x 3–507 of the 512-pixel texture, side corners at y 370: drawn so the diamond is 177 wide, like the kitchen's. */
export const SALON_ART = {
  texture: 'salon-soins',
  url: import.meta.env.BASE_URL + 'assets/buildings/salon-soins.png',
  width: 512, height: 511,
  worldWidth: 177 * 512 / 504, originY: (370 - 18 * 504 / 177) / 511,
  labelY: 76,
  /** Where the « welcome back » heart bubble floats, above the door. */
  actionY: -40,
  /** One thin progress row for the rabbit in care, below the building's path. */
  progress: {x: 0, y: 61, width: 54, height: 7},
} as const;
/**
 * The picnic laid in an enclosure for a few seconds. Since 4 November 2026 (owner: a bigger cloth with its basket): the left part
 * of the picnic v2 painting, prepared by scripts/prepare-statue-picnic-rope-art.mjs. The scene draws it about as wide as the
 * enclosure's roaming zone; `originY` is the middle of the cloth, under its basket.
 */
export const PICNIC_ART = {
  texture: 'pique-nique-v2',
  url: import.meta.env.BASE_URL + 'assets/effects/pique-nique-v2.png',
  width: 512, height: 370,
  originY: .62,
} as const;
