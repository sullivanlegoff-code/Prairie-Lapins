/** Presentation only: the travel agency (Codex imagegen painting, prepared by scripts/prepare-agency-art.mjs). Logical 4 × 4 footprint.
 * Its grass diamond spans x 5–507 of the 512-pixel texture, side corners at y 360: drawn so the diamond is 177 wide, like the kitchen's. */
export const AGENCY_ART = {
  texture: 'travel-agency',
  url: import.meta.env.BASE_URL + 'assets/buildings/travel-agency.png',
  width: 512, height: 512,
  worldWidth: 177 * 512 / 502, originY: (360 - 18 * 502 / 177) / 512,
  labelY: 76,
  /** Where Coco's « welcome back » heart bubble floats, above the door. */
  actionY: -40,
} as const;
