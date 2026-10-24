import {ISLAND} from './islandGeometry';
/** Presentation only. Never persisted; logical cells and economy remain unchanged. */
export const VISUAL = {
  grid: {originX: ISLAND.originX, originY: ISLAND.originY, width: ISLAND.cellWidth, depth: ISLAND.cellDepth, columns: ISLAND.mapCells, rows: ISLAND.mapCells},
  rabbit: {
    scale: 1.3, hitRadius: 27, motion: {x: 3, y: 1.5, hop: 5},
    // Residents of an enclosure rest, take a short walk near their slot, stop, and now and then hop in place.
    // Distances are local to the enclosure centre (the unit of the slot offsets); times are seconds, speed units per second.
    roam: {hard: {minX: -56, maxX: 56, minY: -20, maxY: 38}, radius: {x: 16, y: 8}, speed: 14, stepLength: 9, turnThreshold: 5, minTravel: 6,
      restMin: 1.8, restMax: 4.5, hopChance: .28, hopDuration: .5, hopHeight: 5, walkBob: 1.4, squash: .1, maxStep: .1,
      // Rare, brief somersault in place after a rest: a share of the decisions that end a rest, one full turn about the body
      // centre in `duration` seconds, `height` units above the ground. Deferred when closer than `margin` to the zone edge
      // or than `clearance` to a neighbour.
      // Turning round: a body faces its way when a walk starts (never reversed against it within `minDelay`), and may turn
      // by itself while resting on the ground, every `restGap` seconds at the very least. Never in the air.
      turn: {minDelay: 2.5, restGapMin: 5, restGapMax: 12, settle: .35},
      salto: {chance: .06, duration: .95, height: 11, margin: {x: 4, y: 2}, clearance: 14}},
    offsets: [{x: -37, y: -4}, {x: 34, y: -4}, {x: 0, y: 30}],
    fourOffsets: [{x: -31, y: -8}, {x: 31, y: -8}, {x: -31, y: 32}, {x: 31, y: 32}],
    fiveOffsets: [{x: -49, y: -10}, {x: 0, y: -10}, {x: 49, y: -10}, {x: -27, y: 32}, {x: 27, y: 32}],
    sixOffsets: [{x: -49, y: -8}, {x: 0, y: -8}, {x: 49, y: -8}, {x: -49, y: 34}, {x: 0, y: 34}, {x: 49, y: 34}],
    crowdedOffsets: [{x: -50, y: -17}, {x: 0, y: -17}, {x: 50, y: -17}, {x: -25, y: 9}, {x: 25, y: 9}, {x: -48, y: 34}, {x: 48, y: 34}],
  },
  // The grass is one repeated tile; the rim and the hanging rock reach `floatingRim` beyond the plateau on the left,
  // right and back, and `floatingDepth` below its front (the painted stages are drawn inside these margins).
  ground: {visualMargin: {top: 16, right: 16, bottom: 128, left: 80}, floatingDepth: 580, floatingRim: 96},
  // Front three-quarter view: horizontal rows, no rotation, and modest depth compression.
  // Upright sprites keep their proportions; only their ground anchors follow this projection.
  projection: {theta: 0, q: .78},
  camera: {minZoom: .4, maxZoom: 1.65, initialZoom: 1.05, overviewMargin: 80, overviewPadding: 16, frameMargin: 12, focusX: ISLAND.focus, focusY: ISLAND.focus,
    marginX: 300, marginY: 200, hudHeight: 70, compactHudHeight: 62, portraitHudHeight: 122,
    // Pan limit: at least this share of the viewport, on each axis, keeps showing owned land or its rim (the
    // open sky never fills more than two thirds). Below .39 a pinch keeps its anchor down to the minimum zoom,
    // since the HUD shifts the viewport centre by about a tenth of its height.
    panKeep: 1 / 3,
    // Existing ground padding retained to preserve camera framing; rock depth is added after projection.
    // Recenter fits the full rock. readableZoom remains the building-label threshold.
    recenterRim: {left: 80, right: 0, top: 0, bottom: 128}, readableZoom: .6},
} as const;
