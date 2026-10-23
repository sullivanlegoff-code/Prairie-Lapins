/** Presentation only: one shared static texture. No footprint, camera or saved-state data. */
export const FARM_PALETTE: 'original' | 'light' | 'nest' = 'nest';
const FARM_FILE = {original: 'farm-windmill', light: 'farm-windmill-light', nest: 'farm-windmill-nest'}[FARM_PALETTE];
export const FARM_ART = {
  texture: FARM_FILE,
  url: import.meta.env.BASE_URL + `assets/buildings/${FARM_FILE}.png`,
  width: 1254, height: 1254,
  worldWidth: 156, originY: .70,
  harvestY: 38,
} as const;
