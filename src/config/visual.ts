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
  // Interior textures hold only the rectangular plateau (drawParcelTerrain clips every patch to it). The 5-unit
  // margin covers its grass strokes' half-width and is 9 whole texels at 1.8, keeping the former texel alignment.
  // 47.86 MiB at full 3×3, instead of 60.36 MiB with the former shore margins. Raised edges are vector geometry:
  // their bounds do not enlarge those textures.
  ground: {margin: {top: 5, right: 5, bottom: 5, left: 5}, maxResolution: 1.8,
    visualMargin: {top: 16, right: 16, bottom: 128, left: 80}},
  // Ground → screen projection (src/ui/projection.ts): the island turned θ = 4° (rows rise to the right, columns
  // lean right) and its depth scaled by q = .84, as in docs/art-references/visuel île avec nouvel angle de caméra.png.
  projection: {theta: 4, q: .84},
  camera: {minZoom: .4, maxZoom: 1.65, initialZoom: 1.05, overviewWaterMargin: 80, overviewPadding: 16, frameMargin: 12, focusX: ISLAND.focus, focusY: ISLAND.focus,
    marginX: 300, marginY: 160, hudHeight: 70, compactHudHeight: 62, portraitHudHeight: 122,
    // Pan limit: at least this share of the viewport, on each axis, keeps showing owned land or its shore (the
    // open sea never fills more than two thirds). Below .39 a pinch keeps its anchor down to the minimum zoom,
    // since the HUD shifts the viewport centre by about a tenth of its height.
    panKeep: 1 / 3,
    // Recentrer includes the raised front and left edges (ground-world units),
    // never below readableZoom / √(owned parcels), so a small island stays readable and a large one gets an overview.
    recenterShore: {left: 80, right: 0, top: 0, bottom: 128}, readableZoom: .6},
} as const;
