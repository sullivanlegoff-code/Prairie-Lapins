import frames from './dadiStageFrames.json';

/**
 * Dadi « Superstar » on stage (owner, 6 November 2026): once evolved, he changes pose every few seconds among his painted poses,
 * and while his song plays (a touch opens his sheet, which plays it to its end) he sings at a standing microphone, holding it with
 * both hands. Every picture is painted from his approved evolved drawing (output/imagegen/noel-v5/, prepared by
 * scripts/prepare-dadi-stage.mjs) at the same pixel scale as that drawing, feet at the bottom edge, body centred: the meadow swaps
 * the sprite's texture and keeps its scale. `frames` lists what was prepared (empty until the paintings exist).
 */
export interface DadiStageFrame {texture: string; url: string; width: number; height: number}
const frame = (name: string, size: {width: number; height: number}): DadiStageFrame =>
  ({texture: `dadi-stage-${name}`, url: `${import.meta.env.BASE_URL}assets/rabbits/dadi/stage/${name}.png`, ...size});
export const DADI_STAGE = {
  poses: Object.entries(frames.poses as Record<string, {width: number; height: number}>).map(([name, size]) => frame(name, size)),
  micro: frames.micro ? frame('micro', frames.micro as {width: number; height: number}) : null,
  /** Milliseconds a pose is held, drawn in this range; the evolved drawing itself is one of the poses. */
  hold: [3500, 6500] as const,
  /** With the music switched off, the song still « plays » this long on stage. */
  silentSongMs: 60_000,
} as const;
/** Window event from the music: Dadi's song started (`detail.singing` true) or ended. */
export const DADI_SONG_EVENT = 'prairie-dadi-song';
export interface DadiSongDetail {singing: boolean; audible: boolean}
