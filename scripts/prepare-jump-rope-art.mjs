// Terrain de corde à sauter art (3 November 2026: concept B « Kiosque à sauter », chosen because the game is played outdoors,
// the rope held between two posts in front of the kiosk). An imagegen painting on a pure white backdrop (1254 x 1254 RGB),
// kept outside the repository. Cut out and cropped like the other buildings; master in assets-source/buildings/, served 512 px
// copy in public/assets/buildings/.
// Usage: node scripts/prepare-jump-rope-art.mjs "<folder holding concept-b.png>"
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut, crop} from './prepare-rabbit-masters.mjs';
import {encodePng, downscale} from './derive-nursery-overlays.mjs';
import {square} from './prepare-food-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const JUMP_ROPE_ART_SOURCE = {source: 'concept-b', master: 'assets-source/buildings/kiosque-corde.png', served: 'public/assets/buildings/kiosque-corde.png', size: 512};
/** The white backdrop seen through the kiosk's back arch is not connected to the border: seed that pocket only. */
export const JUMP_ROPE_BACKGROUND_SEEDS = [[625, 430]];
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-jump-rope-art.mjs "<folder with the painting>"');
  const {source, master: masterPath, served, size} = JUMP_ROPE_ART_SOURCE;
  const image = decodeRgbPng(readFileSync(`${folder}/${source}.png`));
  cutOut(image, 'light', JUMP_ROPE_BACKGROUND_SEEDS);
  const master = crop(image);
  writeFileSync(masterPath, encodePng(master));
  writeFileSync(served, encodePng(crop(downscale(square(master), size))));
  console.log(`jump rope: ${master.width}x${master.height} -> ${served}`);
}
