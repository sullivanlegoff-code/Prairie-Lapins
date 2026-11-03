import {JUMP_ROPE_ART} from './jumpRopeArt';
import {gridPoint, type WorldBounds} from '../ui/gestures';
import {toScreen} from '../ui/projection';

/**
 * Presentation only: the jump-rope islet in the meadow. It floats alone left of the start island (the southwest parcel's
 * row), off the land grid, so the island's growth never reaches it. PROVISIONAL picture until the owner chooses the painted
 * islet (output/imagegen/corde-a-sauter-ile-v1): the kiosk painting, a little larger than a building.
 */
export const JUMP_ISLAND_ART = {
  ...JUMP_ROPE_ART,
  worldWidth: JUMP_ROPE_ART.worldWidth * 1.35,
  /** Ground anchor, in cells (the start island begins at x 0). */
  cell: {x: -2.9, y: 10.2},
} as const;
/** The islet's anchor in screen-world coordinates. */
export const jumpIslandPoint = () => toScreen(gridPoint(JUMP_ISLAND_ART.cell.x, JUMP_ISLAND_ART.cell.y));
/** Screen-world extent of the islet picture (for taps, the overview and the camera limits). */
export function jumpIslandFrame(): WorldBounds {
  const c = jumpIslandPoint(), a = JUMP_ISLAND_ART, height = a.worldWidth * a.height / a.width;
  return {left: c.x - a.worldWidth / 2, right: c.x + a.worldWidth / 2, top: c.y - height * a.originY, bottom: c.y + height * (1 - a.originY)};
}
