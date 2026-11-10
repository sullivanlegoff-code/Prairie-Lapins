// The Salon de soins turned into a spa (owner, 10 November 2026: concept B « Thermes aux sources chaudes », left to my choice, with
// « un petit endroit pour chacun des soins »). Paintings made with the image model outside the repository
// (output/imagegen/spa-salon-v1/, ignored), on a flat magenta background unless said otherwise:
// - vide.png: the spa, empty, its three care corners ready (brushing stool on the left, wooden tub in front, massage kiosk on the right);
// - vide-neige.png (optional): its snowy copy, same framing, aligned on the served day picture like every Christmas building;
// - accessoires.png: a 4 × 2 sheet (foam crown, brush, towel turban, cucumber slice / towel blanket, bubble, tuft of fur, heart);
// - scene-bain.png, scene-brossage.png, scene-massage.png: the three menu scenes, full frame (no magenta), served as WebP.
// Writes the masters (assets-source/), the served pictures (public/assets/), the tub's front (drawn over the rabbit in its bath,
// day and snow) and adds the snowy pictures to src/config/winterBuildingFiles.json. Then run scripts/derive-night-lights.mjs and
// scripts/make-webp-twins.mjs.
//   PLAYWRIGHT_MODULE=… node scripts/prepare-spa-art.mjs output/imagegen/spa-salon-v1
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import {keyMagenta, resize, winterCopy} from './prepare-noel-art.mjs';
import {encodeWebp} from './derive-island-stages.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const write = (path, bytes) => { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, bytes); };
/** Served width of the spa: drawn about 265 world pixels wide, × 3 on a phone at the closest zoom. */
export const SPA_SERVED_WIDTH = 768;
/** The tub's water in the painting (1254 px): an ellipse; everything of the tub below its front arc is drawn over the rabbit. */
export const TUB = {cx: 742, cy: 860, rx: 152, ry: 56, left: 572, right: 914, bottom: 1022};

function opaqueBox(img, margin = 4) {
  const {width: w, height: h} = img; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (img.pixels[(y * w + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.max(0, x0 - margin); y0 = Math.max(0, y0 - margin); x1 = Math.min(w - 1, x1 + margin); y1 = Math.min(h - 1, y1 + margin);
  return {x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1};
}
function cropTo(img, box) {
  const out = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y++) img.pixels.copy(out, y * box.width * 4, ((box.y + y) * img.width + box.x) * 4, ((box.y + y) * img.width + box.x + box.width) * 4);
  return {width: box.width, height: box.height, pixels: out};
}
const clear = img => { for (let i = 3; i < img.pixels.length; i += 4) if (!img.pixels[i]) img.pixels[i - 3] = img.pixels[i - 2] = img.pixels[i - 1] = 0; return img; };
/** The tub's front, cut from a served spa picture: only its pixels below the water's front arc, the rest transparent. */
export function tubFront(served, box) {
  const k = served.width / box.width, out = Buffer.alloc(served.pixels.length);
  for (let y = 0; y < served.height; y++) for (let x = 0; x < served.width; x++) {
    const px = box.x + x / k, py = box.y + y / k;
    if (px < TUB.left || px > TUB.right || py > TUB.bottom) continue;
    const u = (px - TUB.cx) / TUB.rx, arc = TUB.cy + TUB.ry * Math.sqrt(Math.max(0, 1 - u * u));
    if (py < arc) continue;
    const i = (y * served.width + x) * 4; served.pixels.copy(out, i, i, i + 4);
  }
  return {width: served.width, height: served.height, pixels: out};
}
/** A sheet cell, cut out of magenta and cropped, centred in a transparent square of `size`. */
function cell(keyed, c, r, columns, rows, size) {
  const cw = Math.floor(keyed.width / columns), ch = Math.floor(keyed.height / rows);
  const part = cropTo(keyed, {x: c * cw, y: r * ch, width: cw, height: ch}), tight = cropTo(part, opaqueBox(part, 2));
  const side = Math.max(tight.width, tight.height), pad = Buffer.alloc(side * side * 4), ox = (side - tight.width) >> 1, oy = (side - tight.height) >> 1;
  for (let y = 0; y < tight.height; y++) tight.pixels.copy(pad, ((oy + y) * side + ox) * 4, y * tight.width * 4, (y + 1) * tight.width * 4);
  return clear(resize({width: side, height: side, pixels: pad}, size, size));
}
export const SPA_ACCESSORIES = [['mousse', 0, 0, 192], ['brosse', 1, 0, 160], ['turban', 2, 0, 160], ['concombre', 3, 0, 64], ['couverture', 0, 1, 192], ['bulle', 1, 1, 64], ['touffe', 2, 1, 64], ['coeur', 3, 1, 64]];

export async function prepareSpaArt(folder) {
  const report = {};
  const painting = decodeRgbPng(readFileSync(`${folder}/vide.png`)), keyed = keyMagenta(painting), box = opaqueBox(keyed);
  const master = clear(cropTo(keyed, box)); write('assets-source/buildings/salon-soins.png', encodePng(master));
  const height = Math.round(master.height * SPA_SERVED_WIDTH / master.width), day = clear(resize(master, SPA_SERVED_WIDTH, height));
  write('public/assets/buildings/salon-soins.png', encodePng(day));
  write('public/assets/buildings/salon-baquet.png', encodePng(tubFront(day, box)));
  report.box = box; report.served = [day.width, day.height];
  const winterFiles = JSON.parse(readFileSync('src/config/winterBuildingFiles.json', 'utf8'));
  if (existsSync(`${folder}/vide-neige.png`)) {
    const {image, score} = winterCopy(day, decodeRgbPng(readFileSync(`${folder}/vide-neige.png`)));
    report.snow = score;
    if (score >= .9) {
      write('assets-source/noel/buildings/salon-soins.png', encodePng(image)); write('public/assets/noel/buildings/salon-soins.png', encodePng(image));
      write('public/assets/noel/buildings/salon-baquet.png', encodePng(tubFront(image, box)));
      for (const name of ['buildings/salon-soins.png', 'buildings/salon-baquet.png']) if (!winterFiles.includes(name)) winterFiles.push(name);
    }
  }
  writeFileSync('src/config/winterBuildingFiles.json', JSON.stringify(winterFiles.sort(), null, 1) + '\n');
  if (existsSync(`${folder}/accessoires.png`)) {
    const sheet = keyMagenta(decodeRgbPng(readFileSync(`${folder}/accessoires.png`)));
    for (const [name, c, r, size] of SPA_ACCESSORIES) write(`public/assets/effects/spa/${name}.png`, encodePng(cell(sheet, c, r, 4, 2, size)));
    report.accessories = SPA_ACCESSORIES.length;
  }
  const scenes = [];
  for (const name of ['bain', 'brossage', 'massage']) {
    if (!existsSync(`${folder}/scene-${name}.png`)) continue;
    const scene = decodeRgbPng(readFileSync(`${folder}/scene-${name}.png`)), w = 960, h = Math.round(scene.height * w / scene.width), img = resize(scene, w, h);
    for (let i = 3; i < img.pixels.length; i += 4) img.pixels[i] = 255;
    scenes.push({name: `public/assets/salon/scene-${name}.webp`, ...img}); report[`scene-${name}`] = [w, h];
  }
  if (scenes.length) for (const [name, bytes] of await encodeWebp(scenes)) write(name, bytes);
  return report;
}
/** A point of the 1254-px painting, as fractions of the served spa picture (for src/config/salonArt.ts). */
export const spaFraction = (box, x, y) => [+((x - box.x) / box.width).toFixed(4), +((y - box.y) / box.height).toFixed(4)];

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-spa-art.mjs "<folder with the paintings>"');
  const report = await prepareSpaArt(folder);
  console.log(JSON.stringify(report));
  for (const [name, x, y] of [['bath', 735, 878], ['brush', 282, 772], ['massage', 1010, 640], ['diamondLeft', 0, 0]]) console.log(name, spaFraction(report.box, x, y));
}
