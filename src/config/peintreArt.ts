import type {PeintrePose} from '../display/legendaryTimeline';
import show from './peintreShow.json';

/**
 * The Peintre's painted shows (owner, 24 November 2026), prepared by scripts/prepare-peintre-show.mjs from paintings made from his
 * two approved drawings: four poses per drawing on one canvas each (bottom on the drawing's ground, lower body's centre on the
 * drawing's, so the sprite only changes texture, origin and scale kept), the brush's tip in those canvases' pixels, and the pieces
 * of his shows. The canvas on the easel is Van Gogh's Almond Blossom (1890, public domain), shown in CANVAS_STEPS painted steps.
 */
export interface PeintreArt {texture: string; url: string; width: number; height: number}
type EffectName = keyof typeof show.effects;
const sized = (name: EffectName) => show.effects[name] as {width: number; height: number};
const effect = (name: EffectName | string, size: {width: number; height: number} = sized(name as EffectName)): PeintreArt =>
  ({texture: `peintre-${name}`, url: `${import.meta.env.BASE_URL}assets/effects/peintre/${name}.png`, width: size.width, height: size.height});
export const CANVAS_STEPS = show.effects.canvas.steps;
export const PEINTRE_FX = {
  /** A great crescent brush stroke of swirling blue and yellow paint. */
  stroke: effect('stroke'),
  /** A star of a starry night with its swirling halo, and a little spiral of wind. */
  star: effect('star'), swirl: effect('swirl'),
  /** A sunflower in bloom and its closed bud. */
  sunflower: effect('sunflower'), bud: effect('bud'),
  /** Paint: a yellow and a blue splat on the ground, an orange drop in the air. */
  splatYellow: effect('splat-yellow'), splatBlue: effect('splat-blue'), drop: effect('drop'),
  /** The empty easel, seen from the front; its ledge and the canvas's place on it are EASEL_REST. */
  easel: effect('easel'),
  /** The canvas from bare (0) to finished (CANVAS_STEPS). */
  canvas: Array.from({length: CANVAS_STEPS + 1}, (_, k) => effect(`canvas-${k}`, sized('canvas'))),
  /** Full-screen starry sky and the gilded frame of his first appearance (page only). */
  sky: effect('sky'), frame: effect('frame'),
} as const;
/** Where the canvas rests on the easel: its bottom centre and its width, as fractions of the easel's picture. */
export const EASEL_REST = {x: .5, y: .6, width: .82} as const;

export type PeintreVersion = 'v1' | 'v2';
export const peintreVersion = (art: {evolved?: true}): PeintreVersion => art.evolved ? 'v2' : 'v1';
interface Version {canvas: {width: number; height: number}; tips: Partial<Record<PeintrePose, {x: number; y: number}>>}
const versions = show.versions as Record<PeintreVersion, Version>;
export interface PeintrePoseArt {texture: string; url: string; tip?: {x: number; y: number}}
export interface PeintrePoses {canvas: {width: number; height: number}; poses: Record<PeintrePose, PeintrePoseArt>}
const POSES: readonly PeintrePose[] = ['swing', 'carry', 'paint', 'admire'];
export const PEINTRE_POSES: Record<PeintreVersion, PeintrePoses> = Object.fromEntries((['v1', 'v2'] as const).map(version => [version, {
  canvas: versions[version].canvas,
  poses: Object.fromEntries(POSES.map(pose => [pose, {texture: `rabbit-peintre-${version}-pose-${pose}`,
    url: `${import.meta.env.BASE_URL}assets/rabbits/peintre/peintre-${version}-pose-${pose}.png`, tip: versions[version].tips[pose]}])) as Record<PeintrePose, PeintrePoseArt>,
}])) as Record<PeintreVersion, PeintrePoses>;

/** Everything a meadow with this Peintre needs (both drawings when `art` is not given). */
export function peintreMeadowArt(art?: {evolved?: true}): {texture: string; url: string}[] {
  const fx = PEINTRE_FX, versionsShown: PeintreVersion[] = art ? [peintreVersion(art)] : ['v1', 'v2'];
  return [...versionsShown.flatMap(v => Object.values(PEINTRE_POSES[v].poses)), fx.stroke, fx.star, fx.swirl, fx.sunflower, fx.bud, fx.splatYellow, fx.splatBlue,
    fx.drop, fx.easel, ...fx.canvas];
}
