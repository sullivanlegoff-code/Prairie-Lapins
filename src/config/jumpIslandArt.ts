import {gridPoint, type WorldBounds} from '../ui/gestures';
import {toScreen} from '../ui/projection';

/**
 * Presentation only: the jump-rope islet in the meadow, concept I1 « Îlot rond » (imagegen painting, prepared by
 * scripts/prepare-jump-island-art.mjs; chosen on 4 November 2026, the owner may pick I2 or I3 instead). It floats alone left
 * of the start island (the southwest parcel's row), off the land grid, so the island's growth never reaches it. The anchor is
 * the centre of the sand circle in front of the kiosk (x 178, y 322 of the 353 × 512 texture).
 */
export const JUMP_ISLAND_ART = {
  texture: 'ilot-corde',
  url: import.meta.env.BASE_URL + 'assets/buildings/ilot-corde.png',
  width: 353, height: 512,
  worldWidth: 300,
  originX: 178 / 353, originY: 322 / 512,
  /** Ground anchor, in cells (the start island begins at x 0). */
  cell: {x: -2.9, y: 10.2},
} as const;

/**
 * The record medals, concept M1 « Rubans » (same script): one picture per step of JUMP_ROPE.medals, hung in a row along the
 * kiosk's front balustrade, above its steps (`y` is the ribbons' top in islet texture pixels).
 */
export const JUMP_MEDAL_ART = {
  texture: (step: number) => `medaille-corde-${step}`,
  url: (step: number) => import.meta.env.BASE_URL + `assets/buildings/medaille-corde-${step}.png`,
  width: 86, height: 128,
  worldHeight: 52,
  spacing: 36,
  x: 178, y: 186,
} as const;

/** The islet's anchor in screen-world coordinates. */
export const jumpIslandPoint = () => toScreen(gridPoint(JUMP_ISLAND_ART.cell.x, JUMP_ISLAND_ART.cell.y));
/** Screen-world extent of the islet picture (for taps, the overview and the camera limits). */
export function jumpIslandFrame(): WorldBounds {
  const c = jumpIslandPoint(), a = JUMP_ISLAND_ART, height = a.worldWidth * a.height / a.width;
  return {left: c.x - a.worldWidth * a.originX, right: c.x + a.worldWidth * (1 - a.originX), top: c.y - height * a.originY, bottom: c.y + height * (1 - a.originY)};
}
/** Where the medal of rank `index` (of `count` won) hangs, in screen-world coordinates (top centre of its ribbon). */
export function jumpMedalPoint(index: number, count: number): {x: number; y: number} {
  const f = jumpIslandFrame(), a = JUMP_ISLAND_ART, m = JUMP_MEDAL_ART, scale = a.worldWidth / a.width;
  return {x: f.left + m.x * scale + (index - (count - 1) / 2) * m.spacing, y: f.top + m.y * scale};
}
