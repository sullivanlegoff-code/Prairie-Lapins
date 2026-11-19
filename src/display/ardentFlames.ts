import {rabbitFaceSeed} from './rabbitBlink';

/**
 * Ardent's living flames (owner, 7 November 2026): eight painted frames of his first drawing (five until 19 November 2026), with moving flames and a pose that
 * changes, in place of a blink. His evolution keeps the face animation of the other rabbits.
 * The frames share one canvas whose bottom centre is the served sprite's (`scripts/prepare-ardent-frames.mjs`), so the game
 * swaps the texture with the same origin (.5, 1) and the same scale.
 */
export const ARDENT_FRAMES = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({texture: `rabbit-ardent-frame-${n}`, url: `assets/rabbits/ardent/ardent-frame-${n}.png`}));
/** The eight pictures in a loop (the flames rise, lick and fall back), ten pictures a second (19 November 2026; five back and forth before). */
const ORDER = [0, 1, 2, 3, 4, 5, 6, 7], STEP = 100;

/**
 * Ardent's whole body moves with his fire (owner, 19 November 2026: « je veux qu'il ait plein de mouvement et que ses flammes
 * bougent vraiment »), both drawings: the flames breathe (taller and thinner, then lower and wider), he sways from side to side,
 * and every few seconds the fire flares up: a quick rise, stretched tall, then a soft fall back. `t` in seconds, already offset
 * by the rabbit's own phase; asleep he only breathes, slowly. Factors on the rabbit's pose (squash 1 = unchanged, lift in
 * world units, rotation in radians).
 */
export function ardentSway(t: number, asleep = false): {squashX: number; squashY: number; rotation: number; lift: number} {
  if (asleep) { const b = Math.sin(t * 1.6) * .025; return {squashX: 1 - b * .5, squashY: 1 + b, rotation: 0, lift: 0}; }
  const breath = Math.sin(t * 6.3) * .045 + Math.sin(t * 10.9) * .02, sway = Math.sin(t * 2.7) * .05 + Math.sin(t * 7.1) * .015;
  // A flare every 3.4 s: 0.55 s up and stretched, then back.
  const u = (t % 3.4) / .55, flare = u < 1 ? Math.sin(u * Math.PI) : 0;
  return {squashX: 1 - breath * .55 - flare * .07, squashY: 1 + breath + flare * .16, rotation: sway - flare * .05, lift: flare * 5};
}
/** Which frame a given Ardent shows: its own phase, so two Ardent never move together; the first frame with reduced motion. */
export function ardentFrame(id: string, time: number, reducedMotion = false): number {
  if (reducedMotion) return 0;
  const offset = rabbitFaceSeed(id) % (ORDER.length * STEP);
  return ORDER[Math.floor((time + offset) / STEP) % ORDER.length];
}
