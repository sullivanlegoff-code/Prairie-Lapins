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
