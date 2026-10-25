// Food art (25 October 2026): the food logo, the ten crop icons, the sprout and the Statue de l'Affection.
// Sources: Codex imagegen paintings on a pure white backdrop (prompts in docs/food-art.md), kept outside the repository.
// Masters (cut out, cropped, full resolution) go to assets-source/; the served copies, downscaled, to public/assets/.
// Usage: node scripts/prepare-food-art.mjs "<folder with the paintings>"
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut, crop} from './prepare-rabbit-masters.mjs';
import {encodePng, downscale} from './derive-nursery-overlays.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const CROP_IDS = ['foin', 'pissenlit', 'trefle', 'persil', 'laitue', 'fanes', 'fenouil', 'pomme', 'fraise', 'banane'];
/** Served square sizes: icons and the logo are drawn at most at 40 CSS px (×3 on a phone). */
export const FOOD_ART = [
  {id: 'logo', source: 'logo-a', master: 'assets-source/food/logo.png', served: 'public/assets/food/logo.png', size: 128},
  {id: 'pousse', source: 'pousse', master: 'assets-source/food/pousse.png', served: 'public/assets/food/pousse.png', size: 96},
  ...CROP_IDS.map(id => ({id, source: id, master: `assets-source/food/${id}.png`, served: `public/assets/food/${id}.png`, size: 128})),
  {id: 'statue', source: 'statue-b', master: 'assets-source/buildings/statue-affection.png', served: 'public/assets/buildings/statue-affection.png', size: 512, trim: true},
];

/** Centred in a transparent square, so a single exact area filter scales it. */
export function square(image) {
  const side = Math.max(image.width, image.height), pixels = Buffer.alloc(side * side * 4);
  const ox = (side - image.width) >> 1, oy = (side - image.height) >> 1;
  for (let y = 0; y < image.height; y++) image.pixels.copy(pixels, ((oy + y) * side + ox) * 4, y * image.width * 4, (y + 1) * image.width * 4);
  return {width: side, height: side, pixels};
}

/** Cut out, crop and write each master, then its served copy; a building (`trim`) keeps its own proportions. */
export function prepareArt(folder, list) {
  for (const art of list) {
    const image = decodeRgbPng(readFileSync(`${folder}/${art.source}.png`)); cutOut(image, 'light');
    const master = crop(image);
    for (const path of [art.master, art.served]) mkdirSync(path.slice(0, path.lastIndexOf('/')), {recursive: true});
    writeFileSync(art.master, encodePng(master));
    const served = downscale(square(master), art.size);
    writeFileSync(art.served, encodePng(art.trim ? crop(served) : served));
    console.log(`${art.id}: ${master.width}x${master.height} -> ${art.served}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-food-art.mjs "<folder with the paintings>"');
  prepareArt(folder, FOOD_ART);
}
