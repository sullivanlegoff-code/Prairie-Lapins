// The Christmas update's new pictures (6 November 2026), painted with the image model outside the repository
// (output/imagegen/noel-batch2/, ignored), each on a flat magenta background except the flight backdrop:
// - ilot-epique.png: the islet of the Epics (its breeding nest on a small floating island, like the jump-rope islet);
// - perchoir-benny.png: Benny's perch, the building of the flight mini-game;
// - habitat-ultra-neige.png: the Ultra neige habitat, sold at the Christmas market (same footprint as a level 3 snow habitat;
//   its own picture is already icy, copied as its snowy copy so its lanterns glow at night);
// - debris-rocher.png, debris-herbes.png, debris-buisson.png: what clutters a newly bought parcel;
// - fond-envol.png (1536 × 1024, no magenta, loops horizontally) and obstacle-foin.png: Benny's flight mini-game.
// Masters go to assets-source/, served copies to public/assets/. The snowy copies (<name>-neige.png) are prepared by
// scripts/prepare-noel-art.mjs, like every other snowy picture: copy them into its items folder as b-<name>-neige.png.
//   node scripts/prepare-noel-extras-art.mjs "<folder>"
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, crop} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import {keyMagenta, resize} from './prepare-noel-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

/** `max`: the served copy's longest side, in pixels; `out`: the served name, when it differs. */
export const NOEL_EXTRAS = [
  {name: 'ilot-epique', kind: 'buildings', max: 512},
  {name: 'perchoir-benny', kind: 'buildings', max: 512},
  // Served as habitat-glace.png: a name ending in « -neige » would read as a snowy copy in scripts/prepare-noel-art.mjs.
  {name: 'habitat-ultra-neige', out: 'habitat-glace', kind: 'habitats', max: 627},
  // The Ultra neige habitat's levels 1 and 2 (painted 6 November 2026 in output/imagegen/noel-v5/, copied beside the others).
  // Already snowy (`snowy`): the same picture is also the Christmas one (public/assets/noel/), listed by scripts/prepare-noel-art.mjs.
  {name: 'ultra-neige-1', out: 'habitat-glace-1', kind: 'habitats', max: 627, snowy: true},
  {name: 'ultra-neige-2', out: 'habitat-glace-2', kind: 'habitats', max: 627, snowy: true},
  {name: 'debris-rocher', kind: 'buildings', max: 256},
  {name: 'debris-herbes', kind: 'buildings', max: 256},
  {name: 'debris-buisson', kind: 'buildings', max: 256},
  {name: 'obstacle-foin', kind: 'benny-envol', max: 768},
  {name: 'fond-envol', kind: 'benny-envol', max: 1024, opaque: true},
];
const write = (path, bytes) => { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, bytes); };
const fit = (img, max) => { const s = Math.min(1, max / Math.max(img.width, img.height)); return s >= 1 ? img : resize(img, Math.max(1, Math.round(img.width * s)), Math.max(1, Math.round(img.height * s))); };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-noel-extras-art.mjs "<folder>" [names…]');
  // Optional names after the folder: only those pictures are prepared again.
  const only = process.argv.slice(3);
  for (const item of NOEL_EXTRAS.filter(item => !only.length || only.includes(item.name))) {
    const painted = decodeRgbPng(readFileSync(`${folder}/${item.name}.png`));
    const master = item.opaque ? painted : crop(keyMagenta(painted)), served = fit(master, item.max);
    write(`assets-source/${item.kind}/${item.out ?? item.name}.png`, encodePng(master));
    write(`public/assets/${item.kind}/${item.out ?? item.name}.png`, encodePng(served));
    if (item.snowy) write(`public/assets/noel/${item.kind}/${item.out ?? item.name}.png`, encodePng(served));
    console.log(`${item.name}: ${master.width}x${master.height} -> ${served.width}x${served.height}`);
  }
}
