// Jump-rope islet art (4 November 2026). Two imagegen paintings kept outside the repository:
// - ilot-rond.png (concept I1 « Îlot rond »: the kiosk on a small round floating island, a sand circle in front), on a flat
//   sky-blue backdrop (1254 x 1254 RGB);
// - medailles-rubans.png (concept M1 « Rubans »: four record medals 10, 25, 50, 100 on mint and cream ribbons), on a flat cream
//   backdrop (1536 x 1024 RGB), split into one picture per medal.
// Cut out and cropped like the other buildings; masters in assets-source/buildings/, served copies in public/assets/buildings/.
// Usage: node scripts/prepare-jump-island-art.mjs "<folder holding the two paintings>"
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut, crop} from './prepare-rabbit-masters.mjs';
import {encodePng, downscale} from './derive-nursery-overlays.mjs';
import {square} from './prepare-food-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const JUMP_ISLAND_ART_SOURCE = {source: 'ilot-rond', master: 'assets-source/buildings/ilot-corde.png', served: 'public/assets/buildings/ilot-corde.png', size: 512};
export const JUMP_MEDAL_ART_SOURCE = {source: 'medailles-rubans', steps: [10, 25, 50, 100], master: step => `assets-source/buildings/medaille-corde-${step}.png`, served: step => `public/assets/buildings/medaille-corde-${step}.png`, size: 128};

/** The columns holding something opaque, grouped into runs (one run per medal). */
function columnRuns({width, height, pixels}) {
  const runs = []; let start = -1;
  for (let x = 0; x <= width; x++) {
    let filled = false;
    if (x < width) for (let y = 0; y < height && !filled; y++) filled = pixels[(y * width + x) * 4 + 3] > 16;
    if (filled && start < 0) start = x;
    if (!filled && start >= 0) { runs.push([start, x]); start = -1; }
  }
  return runs;
}
function columns(image, [from, to]) {
  const width = to - from, pixels = Buffer.alloc(width * image.height * 4);
  for (let y = 0; y < image.height; y++) image.pixels.copy(pixels, y * width * 4, (y * image.width + from) * 4, (y * image.width + to) * 4);
  return {width, height: image.height, pixels};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-jump-island-art.mjs "<folder with the paintings>"');
  const island = decodeRgbPng(readFileSync(`${folder}/${JUMP_ISLAND_ART_SOURCE.source}.png`));
  cutOut(island, 'corner');
  const master = crop(island);
  writeFileSync(JUMP_ISLAND_ART_SOURCE.master, encodePng(master));
  const served = crop(downscale(square(master), JUMP_ISLAND_ART_SOURCE.size));
  writeFileSync(JUMP_ISLAND_ART_SOURCE.served, encodePng(served));
  console.log(`jump island: ${master.width}x${master.height} -> ${served.width}x${served.height}`);
  const medals = decodeRgbPng(readFileSync(`${folder}/${JUMP_MEDAL_ART_SOURCE.source}.png`));
  cutOut(medals, 'corner');
  const runs = columnRuns(medals), {steps} = JUMP_MEDAL_ART_SOURCE;
  if (runs.length !== steps.length) throw Error(`Expected ${steps.length} medals, found ${runs.length}`);
  runs.forEach((run, i) => {
    const medal = crop(columns(medals, run));
    writeFileSync(JUMP_MEDAL_ART_SOURCE.master(steps[i]), encodePng(medal));
    const small = crop(downscale(square(medal), JUMP_MEDAL_ART_SOURCE.size));
    writeFileSync(JUMP_MEDAL_ART_SOURCE.served(steps[i]), encodePng(small));
    console.log(`medal ${steps[i]}: ${medal.width}x${medal.height} -> ${small.width}x${small.height}`);
  });
}
