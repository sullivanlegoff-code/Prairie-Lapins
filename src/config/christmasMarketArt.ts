import {gridPoint, type WorldBounds} from '../ui/gestures';
import {toScreen} from '../ui/projection';

/**
 * Presentation only: the Christmas market islet, « Marché de Noël » (owner, 4 November 2026: « une petite île qui apparaisse à
 * l'ouest de l'île principale du début »). Concept A « Chalets », painted by the image model (scripts/prepare-noel-art.mjs); without its picture the islet is
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
  width: 860, height: 1024,
  worldWidth: 335,
  originX: .5, originY: .55,
  /**
   * Ground anchor, in cells (the island begins at x 0): just left of the start island, at its height. When the player owns
   * the jump-rope islet (which floats there, cell -2.9, 10.2), the market floats just above it instead (`cellWithJumpIsland`).
   */
  cell: {x: -2.1, y: 9.57},
  cellWithJumpIsland: {x: -2, y: 6.2},
} as const;

/** The islet's anchor in screen-world coordinates. */
export const christmasMarketPoint = (jumpIsland = false) => { const c = jumpIsland ? CHRISTMAS_MARKET_ART.cellWithJumpIsland : CHRISTMAS_MARKET_ART.cell; return toScreen(gridPoint(c.x, c.y)); };
/** Screen-world extent of the islet picture (for taps, the overview and the camera limits). */
export function christmasMarketFrame(jumpIsland = false): WorldBounds {
  const c = christmasMarketPoint(jumpIsland), a = CHRISTMAS_MARKET_ART, height = a.worldWidth * a.height / a.width;
  return {left: c.x - a.worldWidth * a.originX, right: c.x + a.worldWidth * (1 - a.originX), top: c.y - height * a.originY, bottom: c.y + height * (1 - a.originY)};
}
