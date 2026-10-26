/** Presentation only: two registered textures sharing the same furrows. No footprint, camera or saved-state data. */
export const FARM_PALETTE: 'original' | 'light' | 'nest' = 'nest';
const FARM_FILE = {original: 'farm-windmill', light: 'farm-windmill-light', nest: 'farm-windmill-nest'}[FARM_PALETTE];
export const FARM_ART = {
  texture: FARM_FILE,
  url: import.meta.env.BASE_URL + `assets/buildings/${FARM_FILE}.png`,
  width: 1254, height: 1254,
  worldWidth: 156, originY: .70,
  harvestY: 38,
  /**
   * The dirt field, in texture pixels: five furrows parallel to T → R, stacked from T toward L. While a crop grows, small sprouts
   * stand along them; once ripe, the crop's own icon replaces every sprout. `along` keeps the plants clear of the windmill's
   * sails (behind) and of the front fence; sizes are the drawn widths, in texture pixels.
   */
  furrows: {T: [910, 645], L: [680, 735], R: [1180, 810], rows: 5, perRow: 5, along: [.3, .86], sproutSize: 46, ripeSize: 62},
} as const;

export const FARM_LEVEL_1_ART = {...FARM_ART, texture: "farm-level-1", url: import.meta.env.BASE_URL + "assets/buildings/farm-level-1.png"} as const;
