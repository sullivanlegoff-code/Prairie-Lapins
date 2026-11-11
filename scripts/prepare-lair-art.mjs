// Antre du dragon art (owner's choice B, 11 November 2026): an imagegen painting on a pure white backdrop, kept outside the
// repository. Cut out and cropped like the Forêt de Brocéliande (scripts/prepare-forest-art.mjs); master in assets-source/buildings/,
// served 512 px copy in public/assets/buildings/. It also prints the grass diamond's span, for src/config/lairArt.ts.
// Usage: node scripts/prepare-lair-art.mjs "<folder holding final-antre.png>"
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut, crop} from './prepare-rabbit-masters.mjs';
import {encodePng, downscale} from './derive-nursery-overlays.mjs';
import {square} from './prepare-food-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const LAIR_ART_SOURCE = {source: 'final-antre', master: 'assets-source/buildings/antre-dragon.png', served: 'public/assets/buildings/antre-dragon.png', size: 512};
/** White pockets not connected to the border: between the weathervane's wing, its arrow and its mast. */
export const LAIR_BACKGROUND_SEEDS = [];
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-lair-art.mjs "<folder with the painting>"');
  const {source, master: masterPath, served, size} = LAIR_ART_SOURCE;
  const image = decodeRgbPng(readFileSync(`${folder}/${source}.png`));
  cutOut(image, 'light', LAIR_BACKGROUND_SEEDS);
  const master = crop(image);
  writeFileSync(masterPath, encodePng(master));
  const small = crop(downscale(square(master), size));
  writeFileSync(served, encodePng(small));
  // The grass diamond: its side corners are the lowest rows reaching farthest left and right.
  let left = small.width, right = 0, cornerY = 0;
  for (let y = Math.floor(small.height / 2); y < small.height; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < small.width; x++) if (small.pixels[(y * small.width + x) * 4 + 3] > 128) { if (l < 0) l = x; r = x; }
    if (l >= 0 && (l < left || r > right || (l <= left && r >= right))) { left = Math.min(left, l); right = Math.max(right, r); cornerY = y; }
  }
  console.log(`lair: ${master.width}x${master.height} -> ${served} ${small.width}x${small.height}, diamond x ${left}-${right}, side corners at y ${cornerY}`);
}
