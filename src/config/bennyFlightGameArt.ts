/**
 * Presentation only: « Le vol de Benny » (6 November 2026), painted by the image model and prepared by
 * scripts/prepare-noel-extras-art.mjs. The sky loops horizontally; one hay column picture serves both halves of a column
 * (the top one is flipped by its style).
 */
export const BENNY_FLIGHT_ART = {
  background: import.meta.env.BASE_URL + 'assets/benny-envol/fond-envol.png',
  column: import.meta.env.BASE_URL + 'assets/benny-envol/obstacle-foin.png',
} as const;

/**
 * Benny's perch, the mini-game's building (same framing as the Salon de soins: a 4 × 4 footprint). Its grass base spans the
 * picture's width, its side corners about 82 % down.
 */
export const PERCH_ART = {
  texture: 'perchoir-benny',
  url: import.meta.env.BASE_URL + 'assets/buildings/perchoir-benny.png',
  width: 399, height: 512,
  worldWidth: 182, originY: .8,
  labelY: 76, actionY: -60,
} as const;

/**
 * Debris on a newly bought parcel (6 November 2026, scripts/prepare-noel-extras-art.mjs): one picture per kind, drawn on its
 * 2 × 2 fine cells, its foot (`originY`) at the cells' centre.
 */
export const DEBRIS_ART = {
  texture: (kind: string) => `debris-${kind}`,
  url: (kind: string) => import.meta.env.BASE_URL + `assets/buildings/debris-${kind}.png`,
  worldWidth: 96, originY: .78,
} as const;
