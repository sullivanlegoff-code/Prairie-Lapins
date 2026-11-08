/**
 * The meadow dances to Dadi's song (owner, 8 November 2026: « quand la musique de dadi se lance en cliquant dessus les autres
 * lapins de la prairie dansent »). While the song plays, every other rabbit out in the meadow stops where it stands and dances
 * in place on the beat; Dadi himself keeps his own stage show. Each rabbit gets one of three moves from its id, so the meadow
 * does not move as one block. The dance pose replaces the rabbit's own while it lasts; the song wakes sleepers and pauses kisses, chases and snowball fights.
 */
export const DANCE = {
  /** Beat of Dadi's song: 128 beats a minute, the first beat 15 ms into the file (measured on public/assets/audio/music/dadi.mp3). */
  beatMs: 60_000 / 128,
  firstBeatMs: 15,
  /** Height of a dance hop, in the same units as an ordinary hop (`VISUAL.rabbit.motion.hopHeight`, 5). */
  hop: 11,
  /** Side lean of the sway, radians. */
  lean: .26,
  squash: .14,
} as const;

export type DanceMove = 'hop' | 'sway' | 'twist';
export const DANCE_MOVES: readonly DanceMove[] = ['hop', 'sway', 'twist'];

export interface DancePose {lift: number; squashX: number; squashY: number; rotation: number; facing: 1 | -1 | null}

/** The move a rabbit dances, fixed by its id. */
export function danceMove(id: string): DanceMove {
  let h = 0;
  for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) >>> 0;
  return DANCE_MOVES[h % DANCE_MOVES.length];
}

/**
 * The pose at `ms` milliseconds into the song. `facing` is null when the move keeps the rabbit's own direction.
 * Reduced motion: a small sway only, no hop nor turn.
 */
export function dancePose(move: DanceMove, ms: number, reduced = false): DancePose {
  const beats = Math.max(0, ms - DANCE.firstBeatMs) / DANCE.beatMs, u = beats % 1, beat = Math.floor(beats);
  if (reduced) return {lift: 0, squashX: 1, squashY: 1, rotation: DANCE.lean * .4 * Math.sin(Math.PI * beats), facing: null};
  // A bounce on every beat: up in the middle, a short crouch when landing on the beat.
  const bounce = 4 * u * (1 - u), crouch = Math.max(0, 1 - u / .15);
  if (move === 'hop') {
    return {lift: DANCE.hop * bounce, squashX: 1 + DANCE.squash * .6 * crouch, squashY: 1 - DANCE.squash * crouch, rotation: 0,
      facing: beat % 4 < 2 ? 1 : -1};
  }
  if (move === 'sway') {
    // Leans to one side then the other, two beats each way, with a small bob.
    return {lift: DANCE.hop * .35 * bounce, squashX: 1, squashY: 1, rotation: DANCE.lean * Math.sin(Math.PI * beats / 2), facing: null};
  }
  // Twist: turns round every beat with a squash, like shaking the hips.
  return {lift: DANCE.hop * .2 * bounce, squashX: 1 + DANCE.squash * .5 * Math.sin(Math.PI * 2 * u), squashY: 1 - DANCE.squash * .4 * Math.sin(Math.PI * 2 * u),
    rotation: DANCE.lean * .5 * Math.sin(Math.PI * beats), facing: beat % 2 ? 1 : -1};
}
