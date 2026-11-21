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
  /** A field of tall grass on both sides, out to the fog (owner, 21 Nov. 2026: « on doit vraiment avoir l'impression que l'herbe est
   *  plus haute que Benny », « un énorme champ d'herbe qui s'étend à perte de vue », concept A): its top (`field`, a painted tile seen
   *  from above, `tile` m square) drawn by the graphics card `field.high` m above the ground (Benny is 2 m), and its edge along the
   *  road, `out` m past the road's edge behind the things standing on the verge and the fence: the painted strip `high` m tall, its
   *  dense part as high as the field's top, its blades sticking up over it. Hidden behind a wall to run on. */
  grass: {
    picture: {grotte: {file: 'cotes-herbe'}, pont: {file: 'decor-touffes-lave', crop: [.62, 1]}, montagne: {file: 'decor-touffes-neige', crop: [.62, 1]}} as Record<RunSideWorld, RunSidePicture>,
    high: 3.6, out: 1.5,
    field: {file: 'decor-champ', high: 2.4, tile: 3.5},
    /** The rows of tall blades standing in the field, drawn by the graphics card (owner, 21 Nov.: long wide pointed blades, dark green
     *  at the foot to bright yellow-green at the tips, no outline, no flowers): a painted strip seen side on, `length` m long and `high`
     *  m tall; `rows` of them `gap` m apart, the first along the field's edge. */
    blades: {file: 'decor-brins', rows: 5, gap: 1.3, high: 3.8, length: 7},
  },

  /** The fence along the road, on both sides wherever there is no wall to run on, `out` m past the road's edge, on the short grass
   *  before the tall grass. In volume like the wall (owner, 21 Nov. 2026: « une barrière un peu effet trois D comme le mur »): its
   *  painted face along the road, the same face `thick` m further out behind it, and between the two the top of its upper rail seen
   *  from above, beam by beam (where the painting's rails are and their colour are read from the painting; the owner's
   *  pick, 21 Nov.: concept A, honey wood, with thin beams « barrière par poutre »). */
  fence: {picture: same({file: 'cotes-barriere'}), high: 1.8, out: .7, thick: .16},
  /** The wall Benny runs on, now and then, at the road's edge (`out` m further). In volume (owner, 20 Nov.: « Pour le mur je veux
   *  qu'il soit en volume »): one lane thick, its painted face along the road, its end facing Benny, and its top seen from above,
   *  a coping of the painted cream stones (`top`, a decor tile `tile` m square, lit a little by the sky), laid at `topAt` of the
   *  face's height, where the painting's grass cap is solid: its blades stick up over the coping's edge. */
  wall: {picture: same({file: 'cotes-mur'}), high: 4.6, out: 0, top: {file: 'decor-corps-creme', tile: 5.4, topAt: .917}},
};

/** Every picture file the sides use. */
export const RUN_SIDE_FILES = [...new Set([RUN_SIDES.grass, RUN_SIDES.fence, RUN_SIDES.wall].flatMap(s => Object.values(s.picture).map(p => p.file)))];
