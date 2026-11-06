import {EPIC_ISLET} from './balance';
import {buildingCenter, type WorldBounds} from '../ui/gestures';
import {toScreen} from '../ui/projection';

/**
 * Presentation only: the islet of the Epics (owner, 5 November 2026), painted by the image model on 6 November 2026 and prepared
 * by scripts/prepare-noel-extras-art.mjs: a small floating island whose breeding nest is the islet's own `nest` building. It
 * floats alone north of the start island, beyond the land grid, so the island's growth never reaches it. The anchor is the
 * centre of the sand circle in front of the nest basket (x 188, y 300 of the 376 × 512 texture), at the building's centre.
 */
export const EPIC_ISLET_ART = {
  texture: 'ilot-epique',
  url: import.meta.env.BASE_URL + 'assets/buildings/ilot-epique.png',
  width: 376, height: 512,
  worldWidth: 320,
  originX: 188 / 376, originY: 300 / 512,
} as const;

/** The islet's anchor in screen-world coordinates: its nest building's centre. */
export const epicIsletPoint = () => toScreen(buildingCenter({kind: 'nest', ...EPIC_ISLET.cell}));
/** Screen-world extent of the islet picture (for taps, the overview and the camera limits). */
export function epicIsletFrame(): WorldBounds {
  const c = epicIsletPoint(), a = EPIC_ISLET_ART, height = a.worldWidth * a.height / a.width;
  return {left: c.x - a.worldWidth * a.originX, right: c.x + a.worldWidth * (1 - a.originX), top: c.y - height * a.originY, bottom: c.y + height * (1 - a.originY)};
}
