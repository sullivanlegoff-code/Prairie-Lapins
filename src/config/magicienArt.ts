import type {MagicienPose} from '../display/magicienTimeline';

const effect = (name: string, width: number, height: number) => ({texture: `magicien-${name}`, url: `${import.meta.env.BASE_URL}assets/effects/magicien/${name}.png`, width, height});
/**
 * Painted Magician evolution effects. Point coordinates are pixels in magicien-v2.png.
 * The magic shows (owner, 10 November 2026, scripts/prepare-magicien-show.mjs): five painted poses on one shared canvas (POSE_CANVAS,
 * its bottom on the drawing's ground and its centre on the drawing's, so the sprite only changes texture), with their wand tips,
 * and the effects painted for them.
 */
export const MAGICIEN_ART = {
  wandTip: {x: 420, y: 202},
  circle: effect('circle', 192, 192),
  star: effect('star', 48, 45),
  smoke: effect('smoke', 160, 145),
  firework: effect('firework', 192, 186),
  comet: effect('comet', 69, 96),
  butterflyOpen: effect('butterfly-open', 64, 43),
  butterflyClosed: effect('butterfly-closed', 29, 64),
  twinkle: effect('twinkle', 38, 40),
  ribbon: effect('ribbon', 128, 99),
} as const;
/** The poses' shared canvas (pixels, the same scale as magicien-v2.png: 448 × 487). */
export const POSE_CANVAS = {width: 626, height: 515} as const;
/** The five poses and their wand's star (pixels in POSE_CANVAS). */
export const MAGICIEN_POSE_ART: Record<MagicienPose, {texture: string; url: string; tip: {x: number; y: number}}> = {
  cast: {texture: 'magicien-pose-cast', url: `${import.meta.env.BASE_URL}assets/rabbits/magicien/magicien-pose-cast.png`, tip: {x: 514, y: 32}},
  point: {texture: 'magicien-pose-point', url: `${import.meta.env.BASE_URL}assets/rabbits/magicien/magicien-pose-point.png`, tip: {x: 595, y: 356}},
  twirl: {texture: 'magicien-pose-twirl', url: `${import.meta.env.BASE_URL}assets/rabbits/magicien/magicien-pose-twirl.png`, tip: {x: 479, y: 35}},
  float: {texture: 'magicien-pose-float', url: `${import.meta.env.BASE_URL}assets/rabbits/magicien/magicien-pose-float.png`, tip: {x: 500, y: 226}},
  bow: {texture: 'magicien-pose-bow', url: `${import.meta.env.BASE_URL}assets/rabbits/magicien/magicien-pose-bow.png`, tip: {x: 564, y: 246}},
};
/** Everything an evolved Magicien's shows need, loaded with the meadow. */
export const magicienShowArt = (): {texture: string; url: string}[] => [
  MAGICIEN_ART.circle, MAGICIEN_ART.star, MAGICIEN_ART.smoke, MAGICIEN_ART.firework, MAGICIEN_ART.comet, MAGICIEN_ART.butterflyOpen,
  MAGICIEN_ART.butterflyClosed, MAGICIEN_ART.twinkle, MAGICIEN_ART.ribbon, ...Object.values(MAGICIEN_POSE_ART),
];
export const MAGICIEN_TEST_EVENT = 'prairie-magicien-test';
