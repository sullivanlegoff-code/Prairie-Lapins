import {ISLAND} from './islandGeometry';
import {VISUAL} from './visual';
/** Presentation only: no change to nursery state, secrets or logical footprint. */
/** World units from a building's anchor (its footprint centre) to the projected footprint's front edge. */
const NURSERY_FOOTPRINT_FRONT = ISLAND.cellDepth * VISUAL.projection.q / 2;
export const NURSERY_ART = {
  texture: 'nursery-v2-base',
  url: import.meta.env.BASE_URL + 'assets/buildings/nursery-v2-base.png',
  width: 1254, height: 1254,
  // Approved transparent base, drawn upright and uniformly scaled without cropping or redrawing. Its four cushions are
  // always empty here: babies, veils and glows are separate overlays. Measured on the PNG (alpha > 8): visible
  // x 94…1158 (centre 626 of 1254), y 223…1059. The base touches the ground along its front arc at row 1050 (median
  // bottom of the body, 1043…1058 at the door step); that row meets the projected footprint's front edge.
  worldWidth: 168, originY: (1050 - NURSERY_FOOTPRINT_FRONT * 1254 / 168) / 1254,
  // Fixed architectural face; empty bays never depict the pending species.
  // Label 9 units in front of the projected footprint's front edge, as before the projection.
  actionY: 46, labelY: 73,
} as const;

/**
 * Slot → cushion mapping, in pixels of the base PNG above (a frame shared with the base, never the camera). Slots fill front
 * row first, left to right, then the back row left to right, so a new game's single usable cushion is the nearest, largest
 * one, and each purchase opens the next in reading order. Anchors are the centres of the four measured mint hollows
 * (alpha > 200, connected regions): back-left 313×154, back-right 312×154, front-left 363×183, front-right 361×180.
 */
export const NURSERY_SLOT_ANCHORS = [
  {x: 429, y: 522, row: 'front'}, {x: 830, y: 522, row: 'front'},
  {x: 456, y: 338, row: 'back'}, {x: 801, y: 338, row: 'back'},
] as const;
/** The back hollows are 86% of the front ones: overlays shrink with them (one shared look, a little perspective). */
export const NURSERY_ROW_SCALE = {front: 1, back: .88} as const;
/** The artistic frame of every approved overlay source (1254 × 1254): origins, scales and measured boxes are expressed in it. */
const SOURCE_FRAME = 1254;
/**
 * Approved overlay sprites, downscaled copies only (scripts/derive-nursery-overlays.mjs; the approved 1254² sources stay in
 * public/ untouched). `width/height` are the texture's real pixels and are independent of the artistic frame: `originX/Y`
 * (normalised) is the centre of the source's visible pixels (alpha > 8) and `scale` is a fraction of the base PNG's pixel size,
 * both expressed in the 1254² `sourceSize` frame, so a derived texture lands exactly where its source did. Texture sizes follow
 * the largest on-screen size measured in the game (framebuffer = CSS pixels; zoom 1.65, front row: baby 68, veil 80, lock 28 px
 * for the whole canvas), about 2.4 to 3.5 times that. The baby lies down in its cushion (`angle`, counter-clockwise) as in the
 * approved montage; it is the same sprite and scale for every species.
 */
export const NURSERY_OVERLAY_ART = {
  // Base-PNG pixels from each cushion centre, below the reclining baby; scales with its row.
  progress: {dy: 128, width: 230, height: 32},
  baby: {texture: 'nursery-v2-baby', url: import.meta.env.BASE_URL + 'assets/buildings/nursery-v2-baby-192.png', width: 192, height: 192, sourceSize: SOURCE_FRAME,
    originX: 630 / 1254, originY: 629 / 1254, scale: .245, angle: -78, dy: 2},
  veil: {texture: 'nursery-v2-veil', url: import.meta.env.BASE_URL + 'assets/buildings/nursery-v2-veil-192.png', width: 192, height: 192, sourceSize: SOURCE_FRAME,
    originX: 626 / 1254, originY: 636 / 1254, scale: .29, dy: 8},
  lock: {texture: 'nursery-v2-lock', url: import.meta.env.BASE_URL + 'assets/buildings/nursery-v2-lock-96.png', width: 96, height: 96, sourceSize: SOURCE_FRAME,
    originX: 626 / 1254, originY: 630 / 1254, scale: .10, dy: -4},
  // Soft static glow under a ready baby: a generated radial gradient, rx × ry in base pixels at front-row scale.
  halo: {texture: 'nursery-v2-halo', rx: 235, ry: 120, rgb: '255,238,120', stops: [[0, 0], [.5, .34], [.8, .18], [1, 0]] as readonly (readonly [number, number])[]},
} as const;
