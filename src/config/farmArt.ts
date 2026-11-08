/** Presentation only: one picture per farm level (level 1 and level 2 share the same furrows). No footprint, camera or saved-state data. */
export const FARM_PALETTE: 'original' | 'light' | 'nest' = 'nest';
const FARM_FILE = {original: 'farm-windmill', light: 'farm-windmill-light', nest: 'farm-windmill-nest'}[FARM_PALETTE];
export const FARM_ART = {
  texture: FARM_FILE,
  url: import.meta.env.BASE_URL + `assets/buildings/${FARM_FILE}.png`,
  width: 1254, height: 1254,
  worldWidth: 156, originY: .70,
  harvestY: 38,
  progress: {x: 0, y: 25, width: 54, height: 7},
  /**
   * The dirt field, in texture pixels: five furrows parallel to T → R, stacked from T toward L. While a crop grows, small sprouts
   * stand along them; once ripe, the crop's own icon replaces every sprout. `along` keeps the plants clear of the windmill's
   * sails (behind) and of the front fence; sizes are the drawn widths, in texture pixels.
   */
  furrows: {T: [910, 645], L: [680, 735], R: [1180, 810], rows: 5, perRow: 5, along: [.3, .86], sproutSize: 46, ripeSize: 62},
} as const;

export const FARM_LEVEL_1_ART = {...FARM_ART, texture: "farm-level-1", url: import.meta.env.BASE_URL + "assets/buildings/farm-level-1.png"} as const;

/** What the scene, the plants and the menus need from a farm picture. */
export interface FarmArt {
  readonly texture: string; readonly url: string; readonly width: number; readonly height: number;
  readonly worldWidth: number; readonly originY: number; readonly harvestY: number;
  readonly progress: {readonly x: number; readonly y: number; readonly width: number; readonly height: number};
  readonly furrows: {readonly T: readonly [number, number]; readonly L: readonly [number, number]; readonly R: readonly [number, number]; readonly rows: number; readonly perRow: number; readonly along: readonly [number, number]; readonly sproutSize: number; readonly ripeSize: number};
}
/**
 * The level 4 farm (owner, 8 November 2026: variant 1, a taller windmill with a stone storey and a balcony, the level 3
 * colours, a bare dirt field). Scaled so its grass base covers the same ground as the level 3 picture (bottoms aligned), so
 * the windmill rises higher; seven furrows, the plants kept off the windmill's sails and the front fence.
 */
export const FARM_LEVEL_4_ART: FarmArt = {
  texture: 'farm-level-4', url: import.meta.env.BASE_URL + 'assets/buildings/farm-level-4.png',
  width: 1254, height: 1254, worldWidth: 152.8, originY: .769,
  harvestY: FARM_ART.harvestY, progress: FARM_ART.progress,
  furrows: {T: [900, 628], L: [680, 835], R: [1210, 812], rows: 7, perRow: 6, along: [.04, .8], sproutSize: 46, ripeSize: 62},
};
/**
 * The level 3 farm (owner, 8 November 2026: concept A « Moulin fleuri », a slightly taller windmill with a flower box, a pink
 * porch roof, a lantern, a bench and a hay wheelbarrow). Scaled like level 4 so its grass base covers the same ground as the
 * level 2 picture (bottoms aligned); six furrows, the plants kept clear of the front fence.
 */
export const FARM_LEVEL_3_ART: FarmArt = {
  texture: 'farm-level-3', url: import.meta.env.BASE_URL + 'assets/buildings/farm-level-3.png',
  width: 1448, height: 1086, worldWidth: 195.4, originY: .735,
  harvestY: FARM_ART.harvestY, progress: FARM_ART.progress,
  furrows: {T: [935, 535], L: [730, 605], R: [1205, 690], rows: 6, perRow: 6, along: [.06, .82], sproutSize: 46, ripeSize: 62},
};
/** The picture of a farm at this level: the small farm at level 1, the windmill at level 2, the flowered windmill at level 3, the grand windmill at level 4. */
export const farmArtFor = (farmLevel?: number): FarmArt => farmLevel === 4 ? FARM_LEVEL_4_ART : farmLevel === 3 ? FARM_LEVEL_3_ART : farmLevel ? FARM_ART : FARM_LEVEL_1_ART;
