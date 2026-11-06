/** Painted Magician evolution effects. Point coordinates are pixels in magicien-v2.png. */
export const MAGICIEN_ART = {
  wandTip: {x: 420, y: 202},
  circle: {texture: 'magicien-circle', url: `${import.meta.env.BASE_URL}assets/effects/magicien/circle.png`, width: 192, height: 192},
  star: {texture: 'magicien-star', url: `${import.meta.env.BASE_URL}assets/effects/magicien/star.png`, width: 48, height: 45},
} as const;
export const MAGICIEN_TEST_EVENT = 'prairie-magicien-test';
