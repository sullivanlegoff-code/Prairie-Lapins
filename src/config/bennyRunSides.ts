/**
 * Benny Rampage: what stands along the sides of the road (owner, 19 Nov. 2026: tall grass left and right of the track instead of the
 * void, the old walls of the scenery gone, « des barrières le long de la piste, à gauche et à droite, et de temps en temps un mur où
 * il peut courir »). The rules, which side is a fence or a wall to run on, are `wallRuns` in src/simulation/bennyRun.ts; this is only
 * their look.
 *
 * Each picture is a painted square tile of the run's decor (public/assets/benny-run/<name>.webp, made by
 * scripts/prepare-benny-run-decor.mjs and listed in the run's DECOR), laid along the road column by column: `fit` is the part of the
 * tile's height drawn (0 its top, 1 its bottom), `tile` how many metres of road one tile covers, `high` how tall it stands (m), `out`
 * how far past the road's edge (m).
 *
 * Until the owner picks the new paintings (concepts A/B/C for the tall grass, the fence and the wall to run on), each entry points to a
 * picture the game already has: the grass tufts, the honey-wood fence, and the tiered wall with its light blue base.
 */
export type RunSideWorld = 'grotte' | 'pont' | 'montagne';
export type RunSideTile = `decor-${string}`;
export interface RunSideStrip {name: Record<RunSideWorld, RunSideTile>; fit: readonly [number, number]; tile: number; high: number; out: number}

export const RUN_SIDES = {
  /** Tall grass past the fences, in rows from the farthest to the nearest, on a ground of grass `ground` m wide past the road's edge
   *  (none beside an open side: there the void shows, and Benny falls into it). */
  grass: {
    name: {grotte: 'decor-touffes', pont: 'decor-touffes-lave', montagne: 'decor-touffes-neige'},
    fit: [.62, 1], tile: 4.5,
    rows: [{out: 4.6, high: 2.6}, {out: 3, high: 2.1}, {out: 1.5, high: 1.6}],
    ground: 5.4,
  },
  /** The fence along the road, on both sides wherever there is no wall to run on. */
  fence: {name: {grotte: 'decor-barriere', pont: 'decor-barriere', montagne: 'decor-barriere'}, fit: [.5, .965], tile: 9, high: 2.1, out: .3} satisfies RunSideStrip,
  /** The wall Benny runs on, now and then: one painted strip `high` m tall at the road's edge once chosen; `null` keeps the tiered wall
   *  with its light blue base (the sign that she can run on it), which also hides the grass behind it. */
  wall: null as RunSideStrip | null,
} as const;
