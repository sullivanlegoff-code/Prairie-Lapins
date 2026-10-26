import {rabbitFaceSeed} from './rabbitBlink';

/** Bright warm pixels on the upper silhouette, or within 10 px of transparency.
 * A shared, full-size transparent texture preserves the sprite's origin and mirror. */
export function deriveArdentFlames(source: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(source.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, [r, g, b, a] = source.subarray(i, i + 4);
    if (a < 30 || r < 190 || g < 65 || g > r * .97 || b > g * .65 || r - b < 110) continue;
    const edge = [[-10, 0], [10, 0], [0, -10], [0, 10]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx < 0 || ny < 0 || nx >= width || ny >= height || source[(ny * width + nx) * 4 + 3] < 30;
    });
    if (y > height * .38 && !edge) continue;
    result.set([r, g, b, a], i);
  }
  return result;
}
/** Continuous, bounded and independent of frame rate; no timers or per-frame allocations of pixels. */
export function ardentFlamePose(id: string, time: number, reducedMotion = false) {
  if (reducedMotion) return {x: 0, stretch: 1, alpha: .24};
  const phase = rabbitFaceSeed(id) / 4294967296 * Math.PI * 2;
  const t = time / 1000;
  return {x: Math.sin(t * 1.7 + phase) * .45, stretch: 1.03 + Math.sin(t * 2.1 + phase) * .01,
    alpha: .24 + Math.sin(t * 2.7 + phase) * .06};
}
