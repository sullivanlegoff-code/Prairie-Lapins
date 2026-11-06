// Forêt de Brocéliande art (owner's choice, 3 November 2026): an imagegen painting on a pure white backdrop (1254 x 1254 RGB),
// kept outside the repository. Cut out and cropped like the other buildings (scripts/prepare-food-art.mjs); master in
// assets-source/buildings/, served 512 px copy in public/assets/buildings/.
// Usage: node scripts/prepare-forest-art.mjs "<folder holding final-broceliande.png>"
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut, crop} from './prepare-rabbit-masters.mjs';
import {encodePng, downscale} from './derive-nursery-overlays.mjs';
import {square} from './prepare-food-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const FOREST_ART_SOURCE = {source: 'final-broceliande', master: 'assets-source/buildings/foret-broceliande.png', served: 'public/assets/buildings/foret-broceliande.png', size: 512};
/** The white backdrop seen through the canopy, between leaves and branches, is not connected to the border: seed those pockets only. */
export const FOREST_BACKGROUND_SEEDS = [[341, 380], [454, 415], [852, 443], [1037, 482]];
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-forest-art.mjs "<folder with the painting>"');
  const {source, master: masterPath, served, size} = FOREST_ART_SOURCE;
  const image = decodeRgbPng(readFileSync(`${folder}/${source}.png`));
  cutOut(image, 'light', FOREST_BACKGROUND_SEEDS);
  const master = crop(image);
  writeFileSync(masterPath, encodePng(master));
  writeFileSync(served, encodePng(crop(downscale(square(master), size))));
  console.log(`forest: ${master.width}x${master.height} -> ${served}`);
}
