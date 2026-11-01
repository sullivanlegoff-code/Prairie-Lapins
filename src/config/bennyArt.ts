import frames from './bennyFrames.json';
import {rabbitArt} from './rabbitArt';

/**
 * Benny's painted meadow animations (Mythic rabbit; poses approved by the owner on 1 November 2026). Her rest pose stays the approved
 * sprite A1 (benny-v1.png); every other picture comes from one WebP atlas made by scripts/prepare-benny-frames.mjs, in a common frame
 * aligned pixel for pixel with the sprite: the sprite sits at `BENNY_FRAMES.sprite` in it, so every frame keeps A1's scale and ground.
 */
export const BENNY_ID = 'benny';
/** Window event of the laboratory buttons: `detail.act` replays that act on Benny in the meadow; nothing in the normal game sends it. */
export const BENNY_TEST_EVENT = 'prairie-benny-test';

export type BennyFrameKind = 'patch' | 'whole' | 'pose';
export interface BennyFrame {kind: BennyFrameKind; /** Painted height above the ground (meadow units). */ lift: number; /** Body span against A1's. */ width: number; /** Body centre against A1's (meadow units, facing right). */ x: number}
export const BENNY_FRAMES = {
  canvas: frames.canvas, sprite: frames.sprite, anchor: frames.anchor,
  frames: frames.frames as Record<string, BennyFrame>,
};
export type BennyFrameName = keyof typeof frames.frames;
export const BENNY_ATLAS = {texture: 'benny-frames', url: `${import.meta.env.BASE_URL}assets/rabbits/benny/frames/benny-frames.webp`,
  atlas: `${import.meta.env.BASE_URL}assets/rabbits/benny/frames/benny-frames.json`} as const;

/** Fail early if the generated frame no longer matches the sprite registry. */
const sprite = rabbitArt(BENNY_ID);
if (!sprite || sprite.width !== frames.sprite.width || sprite.height !== frames.sprite.height || frames.anchor.x !== frames.sprite.x + frames.sprite.width / 2 ||
  frames.anchor.y !== frames.sprite.y + frames.sprite.height) throw new Error('Benny frames no longer match her sprite');

/** Origin of a frame image so that it lands exactly on the sprite (whose origin is its bottom centre). */
export const BENNY_ORIGIN = {x: frames.anchor.x / frames.canvas.width, y: frames.anchor.y / frames.canvas.height} as const;

/** What a meadow with Benny loads, besides her sprite: the atlas, once. */
export const bennyMeadowArt = (): {texture: string; url: string; atlas: string}[] => [BENNY_ATLAS];

/**
 * Painted effects of Benny's first appearance and of her Mythic card (ChatGPT paintings approved by the owner on 1 November 2026):
 * scripts/prepare-benny-effects.mjs cuts them from the four boards and keys their black background into opacity. Page only, never the meadow.
 * Sizes are the WebP pixels (assets-source/effects/benny/manifest.json).
 */
export interface BennyEffectArt {url: string; width: number; height: number}
const bennyEffect = (name: string, width: number, height: number): BennyEffectArt =>
  ({url: `${import.meta.env.BASE_URL}assets/effects/benny/${name}.webp`, width, height});
const bennyFrames = (name: string, sizes: [number, number][]) => sizes.map(([width, height], k) => bennyEffect(`${name}-${k + 1}`, width, height));
export const BENNY_EFFECTS = {
  /** Clouds gathered (1), parting and opening on a golden light (2 to 7), then drifting apart into small clouds (8). */
  cloud: bennyFrames('cloud', [[443, 339], [443, 340], [443, 339], [443, 340], [443, 339], [443, 340], [443, 339], [443, 340]]),
  /** A pastel rainbow drawing itself from the left cloud to the right one; 7 shines, 8 rests. */
  rainbow: bennyFrames('rainbow', [[443, 299], [443, 300], [443, 299], [443, 300], [443, 299], [443, 300], [443, 299], [443, 300]]),
  /** Golden rays falling from a point: rising (1 to 4), full (4), fading (5, 6). */
  rays: bennyFrames('rays', [[296, 278], [295, 278], [296, 278], [296, 278], [295, 278], [296, 278]]),
  ring: bennyEffect('ring', 256, 128), ringSparkles: bennyEffect('ring-sparkles', 256, 147), glow: bennyEffect('glow', 192, 197),
  twinkle: bennyEffect('twinkle', 96, 96), burst: bennyEffect('burst', 224, 218), prism: bennyEffect('prism', 224, 223),
  star: bennyEffect('star', 32, 32), starFive: bennyEffect('star-five', 40, 40), starBig: bennyEffect('star-big', 96, 99),
  stardust: bennyEffect('stardust', 128, 107), trail: bennyEffect('trail', 192, 113), swirl: bennyEffect('swirl', 256, 232),
  feather: bennyFrames('feather', [[96, 176], [96, 88], [96, 80], [96, 110], [96, 105]]),
} as const;
