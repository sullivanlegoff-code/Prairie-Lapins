// The Christmas garlands lit at 20:00 (owner, 4 November 2026): finds the golden bulbs painted on each snowy island stage
// (assets-source/noel/island/stage-N.png) and writes their places, in stage-master pixels, to
// src/config/islandStageLightsWinter.json. The game draws a soft golden glow on each one at night.
// A bulb is a small warm, bright, golden blob; only bulbs in a garland (at least two neighbours nearby) are kept, so a
// sunlit leaf is never taken for a bulb.
//   node scripts/derive-winter-lights.mjs [--check]
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const LIGHTS_FILE = 'src/config/islandStageLightsWinter.json';
const isBulb = (r, g, b, a) => a > 200 && r > 235 && g > 180 && g < 235 && b < 160 && r - g > 18 && r - b > 100;

/** Centres of the bulbs of one painting, [x, y] in its pixels, top to bottom. */
export function findBulbs({width: w, height: h, pixels: p}, {min = 6, max = 400, chain = 40, neighbours = 2} = {}) {
  const hot = new Uint8Array(w * h), seen = new Uint8Array(w * h), blobs = [];
  for (let i = 0; i < w * h; i++) hot[i] = isBulb(p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3]) ? 1 : 0;
  for (let i = 0; i < w * h; i++) {
    if (!hot[i] || seen[i]) continue;
    const stack = [i]; seen[i] = 1; let n = 0, sx = 0, sy = 0;
    while (stack.length) {
      const j = stack.pop(), x = j % w, y = (j - x) / w; n++; sx += x; sy += y;
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (k >= 0 && k < w * h && hot[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
    }
    if (n >= min && n <= max) blobs.push([Math.round(sx / n), Math.round(sy / n)]);
  }
  return blobs.filter(([x, y]) => blobs.filter(([u, v]) => (u !== x || v !== y) && Math.hypot(u - x, v - y) <= chain).length >= neighbours)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export function deriveLights() {
  const out = {};
  for (let n = 1; n <= 9; n++) {
    const file = `assets-source/noel/island/stage-${n}.png`;
    if (existsSync(file)) out[n] = findBulbs(decodeRgbPng(readFileSync(file)));
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const lights = deriveLights(), text = JSON.stringify(lights) + '\n';
  if (process.argv.includes('--check')) {
    if (!existsSync(LIGHTS_FILE) || readFileSync(LIGHTS_FILE, 'utf8') !== text) { console.error(`${LIGHTS_FILE} is stale`); process.exit(1); }
  } else writeFileSync(LIGHTS_FILE, text);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(lights).map(([k, v]) => [k, v.length]))));
}
