import {rabbitFaceSeed} from './rabbitBlink';

/**
 * Ardent's living flames (owner, 7 November 2026): five painted frames of his first drawing, with moving flames and a pose that
 * changes, in place of a blink. His evolution keeps the face animation of the other rabbits.
 * The frames share one canvas whose bottom centre is the served sprite's (`scripts/prepare-ardent-frames.mjs`), so the game
 * swaps the texture with the same origin (.5, 1) and the same scale.
 */
export const ARDENT_FRAMES = [1, 2, 3, 4, 5].map(n => ({texture: `rabbit-ardent-frame-${n}`, url: `assets/rabbits/ardent/ardent-frame-${n}.png`}));
/** Back and forth (1 2 3 4 5 4 3 2), about seven pictures a second. */
const ORDER = [0, 1, 2, 3, 4, 3, 2, 1], STEP = 140;

/** Which frame a given Ardent shows: its own phase, so two Ardent never move together; the first frame with reduced motion. */
export function ardentFrame(id: string, time: number, reducedMotion = false): number {
  if (reducedMotion) return 0;
  const offset = rabbitFaceSeed(id) % (ORDER.length * STEP);
  return ORDER[Math.floor((time + offset) / STEP) % ORDER.length];
}
