/**
 * Benny Rampage: what stands along the sides of the road (owner, 19 Nov. 2026: tall grass left and right of the track instead of the
 * void, the old walls of the scenery gone, « des barrières le long de la piste, à gauche et à droite, et de temps en temps un mur où
 * il peut courir »). The rules, which side is a fence or a wall to run on, are `wallRuns` in src/simulation/bennyRun.ts; this is only
 * their look.
 *
 * The owner's picks (20 Nov., concepts A): a green meadow of tall grass with daisies, the honey-wood fence with cream caps, the wall of
 * cream stones on light blue slabs (the light blue says that Benny can run on it). Each is a painted strip cut out of its painting
 * (assets-source/benny-run/cotes-*.png, encoded by scripts/prepare-benny-run-decor.mjs into public/assets/benny-run/<file>.webp)
 * that repeats end to end along the road, `high` m tall: its length on the road keeps the painting's proportions. A `crop` keeps only
 * that part of the picture's height (0 its top, 1 its bottom), for a square decor tile.
 *
 * The lava bridge and the mountain path keep their own grass tufts (embers, snow) under the same fence and wall.
 */
export type RunSideWorld = 'grotte' | 'pont' | 'montagne';
export interface RunSidePicture {file: string; crop?: readonly [number, number]}

const same = (picture: RunSidePicture): Record<RunSideWorld, RunSidePicture> => ({grotte: picture, pont: picture, montagne: picture});

export const RUN_SIDES = {
  /** Tall grass past the fences, in rows from the farthest to the nearest, on a ground of grass `ground` m wide past the road's edge
   *  (none beside an open side: there the void shows, and Benny falls into it). */
  grass: {
    picture: {grotte: {file: 'cotes-herbe'}, pont: {file: 'decor-touffes-lave', crop: [.62, 1]}, montagne: {file: 'decor-touffes-neige', crop: [.62, 1]}} as Record<RunSideWorld, RunSidePicture>,
    rows: [{out: 4.6, high: 2.4}, {out: 3, high: 1.9}, {out: 1.5, high: 1.5}],
    ground: 5.4,
  },
  /** The fence along the road, on both sides wherever there is no wall to run on, `out` m past the road's edge. */
  fence: {picture: same({file: 'cotes-barriere'}), high: 1.3, out: .3},
  /** The wall Benny runs on, now and then, at the road's edge (`out` m further). */
  wall: {picture: same({file: 'cotes-mur'}), high: 4.6, out: 0},
};

/** Every picture file the sides use. */
export const RUN_SIDE_FILES = [...new Set([RUN_SIDES.grass, RUN_SIDES.fence, RUN_SIDES.wall].flatMap(s => Object.values(s.picture).map(p => p.file)))];
