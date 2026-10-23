import {ISLAND} from './islandGeometry';
import {VISUAL} from './visual';
/** Presentation only. Logical footprint, camera and breeding state remain unchanged. */
/** World units from a building's anchor (its footprint centre) to the projected footprint's front edge. */
const NEST_FOOTPRINT_FRONT = ISLAND.cellDepth * VISUAL.projection.q / 2;
export const NEST_ART = {
  texture: 'nest-cozy-refuge',
  url: import.meta.env.BASE_URL + 'assets/buildings/nest-cozy-refuge.png',
  width: 1254, height: 1254,
  // Approved transparent source, uniformly scaled without cropping or redrawing.
  // Contact-path bottom (row 1098) meets the projected footprint's front edge.
  worldWidth: 180, originY: (1098 - NEST_FOOTPRINT_FRONT * 1254 / 180) / 1254,
  // Two parents flank the heart doorway (art x ≈ -16…32), feet and shadows above the « Envoyer » bubble at actionY.
  parentOffsets: [{x: -52, y: 2}, {x: 68, y: 2}],
  // Label 9 units in front of the footprint's front edge, as before the projection.
  actionY: 46, labelY: 73,
} as const;
