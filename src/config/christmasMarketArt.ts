import {gridPoint, type WorldBounds} from '../ui/gestures';
import {toScreen} from '../ui/projection';

/**
 * Presentation only: the Christmas market islet, « Marché de Noël » (owner, 4 November 2026: « une petite île qui apparaisse à
 * l'ouest de l'île principale du début »). Concept A « Chalets », still to be painted: until the picture exists the islet is
 * simply not drawn. It floats alone to the west (screen left) of the island, off the land grid, above the jump-rope islet's
 * row, and shows for every player while the event is on (nothing to buy).
 *
 * The picture: a portrait texture (`width` × `height`, update both once the painting is prepared) whose anchor (`originX`,
 * `originY`) is the centre of the islet's ground, in front of the chalets. The night picture holds the lights only, on black,
 * the same size and framing: it is added on top (ADD blend) when the garlands are lit.
 */
export const CHRISTMAS_MARKET_ART = {
  texture: 'noel-marche',
  url: import.meta.env.BASE_URL + 'assets/noel/marche.png',
  night: {texture: 'noel-marche-nuit', url: import.meta.env.BASE_URL + 'assets/noel/marche-nuit.png'},
  width: 1024, height: 1536,
  worldWidth: 300,
  originX: .5, originY: .62,
  /** Ground anchor, in cells (the island begins at x 0): west of the north and west parcels, clear of the jump-rope islet (-2.9, 10.2). */
  cell: {x: -3.4, y: 3.5},
} as const;

/** The islet's anchor in screen-world coordinates. */
export const christmasMarketPoint = () => toScreen(gridPoint(CHRISTMAS_MARKET_ART.cell.x, CHRISTMAS_MARKET_ART.cell.y));
/** Screen-world extent of the islet picture (for taps, the overview and the camera limits). */
export function christmasMarketFrame(): WorldBounds {
  const c = christmasMarketPoint(), a = CHRISTMAS_MARKET_ART, height = a.worldWidth * a.height / a.width;
  return {left: c.x - a.worldWidth * a.originX, right: c.x + a.worldWidth * (1 - a.originX), top: c.y - height * a.originY, bottom: c.y + height * (1 - a.originY)};
}
