// Second Statue de l'Affection, picnic cloth v2 and painted jump rope (4 November 2026, owner's iPhone feedback).
// Sources: imagegen paintings already on a transparent background, kept outside the repository (output/imagegen/, ignored):
//   statue-affection-2-v1/concept-a.png (two stone rabbits kissing under a flowered arch, carte blanche from the owner),
//   pique-nique-v2/concept-a.png (only its left part, the cloth with its basket, is used),
//   corde-v2/rope-tile@2x.png and corde-v2/rope-handle-96.png (cleaned, a whole number of twists so the tile repeats seamlessly).
// Usage: node scripts/prepare-statue-picnic-rope-art.mjs "<the imagegen folder>"
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, crop} from './prepare-rabbit-masters.mjs';
import {encodePng, downscale} from './derive-nursery-overlays.mjs';
import {square} from './prepare-food-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

/** The left part of the picnic painting: the cloth and its basket, without the spare basket on the right. */
export const PICNIC_CLOTH_WIDTH = 1280;

function write(path, image) { mkdirSync(path.slice(0, path.lastIndexOf('/')), {recursive: true}); writeFileSync(path, encodePng(image)); }

export function prepare(folder) {
  const statue = crop(decodeRgbPng(readFileSync(`${folder}/statue-affection-2-v1/concept-a.png`)));
  write('assets-source/buildings/statue-affection-2.png', statue);
  write('public/assets/buildings/statue-affection-2.png', crop(downscale(square(statue), 512)));

  const painting = decodeRgbPng(readFileSync(`${folder}/pique-nique-v2/concept-a.png`)), width = PICNIC_CLOTH_WIDTH;
  const left = {width, height: painting.height, pixels: Buffer.alloc(width * painting.height * 4)};
  for (let y = 0; y < painting.height; y++) painting.pixels.copy(left.pixels, y * width * 4, y * painting.width * 4, (y * painting.width + width) * 4);
  const cloth = crop(left);
  write('assets-source/effects/pique-nique-v2.png', cloth);
  write('public/assets/effects/pique-nique-v2.png', crop(downscale(square(cloth), 512)));

  mkdirSync('public/assets/jump-rope', {recursive: true});
  copyFileSync(`${folder}/corde-v2/rope-tile@2x.png`, 'public/assets/jump-rope/rope-tile.png');
  copyFileSync(`${folder}/corde-v2/rope-handle-96.png`, 'public/assets/jump-rope/rope-handle.png');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-statue-picnic-rope-art.mjs "<the imagegen folder>"');
  prepare(folder);
}
