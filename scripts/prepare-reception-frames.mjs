// Painted frames of a ready baby's reception card, one per first type (owner, 2 November 2026: « pour tous les lapins je veux
// que la fiche de réception du lapin soit stylisée en fonction du type 1 du lapin »). Concept A of output/imagegen/reception-v1,
// approved by the owner. Node built-ins only, plus an installed Playwright for the WebP encoding, like
// scripts/prepare-legendary-effects.mjs.
//
//   PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-reception-frames.mjs [--sources <folder>]
//
// The sources (default output/imagegen/reception-v1, ignored by Git) are cadre-<type>.png, 1536 x 1024: a cream card with rounded
// corners, its painted wreath, an empty banner at the top, a light meadow in the middle and a ribbon bow at the bottom.
// 1. paille and neige come with a real transparent background. feu, metal and vol come with a painted (opaque) grey and white
//    checkerboard around the card: it is flood-filled from the picture's edges over light, unsaturated pixels, stopped by the
//    card's orange rim; the rim's last pixels are then un-mixed (their colour taken from the card one pixel further in) and
//    feathered over two pixels, so there is no white halo. The card's inside is checked to be untouched, byte for byte.
// 2. Every card is cropped to its painted pixels, its nearly opaque inside made fully opaque, reduced by the exact area filter
//    to WIDTH pixels and encoded as WebP (with alpha) in public/assets/ui/reception/<type>.webp.
// The sizes printed at the end are the ones src/config/receptionArt.ts declares.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {decode, encode} from './png-rgba.mjs';
import {resizeRegion} from './resize-rgba.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const at = process.argv.indexOf('--sources');
const SOURCES = at > 0 ? process.argv[at + 1] : 'output/imagegen/reception-v1';
const TARGET = 'public/assets/ui/reception';
export const TYPES = ['paille', 'neige', 'feu', 'metal', 'vol'];
/** Served width: twice the largest card the page draws (about 600 CSS pixels wide). */
export const WIDTH = 1200;
/** Checkerboard pixel: light and grey (its squares are about 210 and 250, with faint painted smudges). */
const checker = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) <= 22 && Math.min(r, g, b) >= 160;
/** Rim pixels mixed with the checkerboard, one or two pixels deep: still rather grey. */
const greyish = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) <= 48 && Math.min(r, g, b) >= 140;
/** Depth of the rim that is un-mixed and feathered. */
const RIM = 3;
/** No pixel this far inside the picture's edges may ever be removed (the card starts about 38 pixels in). */
const INSIDE = 110;

function removeChecker({width, height, rgba}) {
  const removed = new Uint8Array(width * height), queue = new Int32Array(width * height); let head = 0, tail = 0;
  const seed = i => { if (removed[i]) return; const k = i * 4; if (!checker(rgba[k], rgba[k + 1], rgba[k + 2])) return; removed[i] = 1; queue[tail++] = i; };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (head < tail) { const i = queue[head++], x = i % width, y = (i - x) / width;
    if (x > 0) seed(i - 1); if (x < width - 1) seed(i + 1); if (y > 0) seed(i - width); if (y < height - 1) seed(i + width); }
  // The rim's mixed pixels: at most two more steps, only into greyish pixels.
  for (let step = 0; step < 2; step++) {
    const grow = [];
    for (let i = 0; i < width * height; i++) { if (removed[i]) continue; const x = i % width, k = i * 4;
      const touches = (x > 0 && removed[i - 1]) || (x < width - 1 && removed[i + 1]) || removed[i - width] || removed[i + width];
      if (touches && greyish(rgba[k], rgba[k + 1], rgba[k + 2])) grow.push(i); }
    for (const i of grow) removed[i] = 1;
  }
  // Distance (4-neighbour steps, up to RIM) of every kept pixel from the removed background.
  const depth = new Uint8Array(width * height).fill(255);
  let front = [];
  for (let i = 0; i < width * height; i++) if (removed[i]) { depth[i] = 0; front.push(i); }
  for (let d = 1; d <= RIM; d++) { const next = [];
    for (const i of front) { const x = i % width;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) if (j >= 0 && j < width * height && depth[j] === 255) { depth[j] = d; next.push(j); } }
    front = next; }
  const before = Buffer.from(rgba);
  // Un-mix: a rim pixel takes the average colour of its neighbours one step further in, from the inside out.
  for (let d = RIM - 1; d >= 1; d--) for (let i = 0; i < width * height; i++) if (depth[i] === d) {
    const x = i % width; let r = 0, g = 0, b = 0, n = 0;
    for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) if (j >= 0 && j < width * height && depth[j] === d + 1) { r += rgba[j * 4]; g += rgba[j * 4 + 1]; b += rgba[j * 4 + 2]; n++; }
    if (n) { rgba[i * 4] = Math.round(r / n); rgba[i * 4 + 1] = Math.round(g / n); rgba[i * 4 + 2] = Math.round(b / n); }
  }
  const FEATHER = [0, 110, 210];
  for (let i = 0; i < width * height; i++) { if (depth[i] === 0) rgba.fill(0, i * 4, i * 4 + 4); else if (depth[i] < RIM) rgba[i * 4 + 3] = FEATHER[depth[i]]; }
  // Checks: nothing removed deep inside, and every pixel at RIM or more from the background is the source's, byte for byte.
  let changed = 0, deep = 0;
  for (let i = 0; i < width * height; i++) { const x = i % width, y = (i - x) / width;
    if (depth[i] < RIM && x >= INSIDE && x < width - INSIDE && y >= INSIDE && y < height - INSIDE) deep++;
    if (depth[i] >= RIM && depth[i] !== 0) for (let c = 0; c < 4; c++) if (rgba[i * 4 + c] !== before[i * 4 + c]) { changed++; break; } }
  if (deep) throw Error(`${deep} pixels removed inside the card`);
  if (changed) throw Error(`${changed} pixels of the card's inside changed`);
  return removed.reduce((sum, v) => sum + v, 0);
}

/** Bounding box of the painted pixels. */
function bounds({width, height, rgba}) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (rgba[(y * width + x) * 4 + 3] > 8) {
    if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
  return {left, top, width: right - left + 1, height: bottom - top + 1};
}

const prepared = [];
for (const type of TYPES) {
  const image = decode(readFileSync(`${SOURCES}/cadre-${type}.png`));
  const opaque = image.rgba[3] === 255 && image.rgba[(image.width * image.height - 1) * 4 + 3] === 255;
  const removed = opaque ? removeChecker(image) : 0;
  // The paintings with a real transparent background keep their inside at alpha 249 to 253: made fully opaque.
  for (let i = 3; i < image.rgba.length; i += 4) if (image.rgba[i] >= 240) image.rgba[i] = 255;
  const box = bounds(image), pixels = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y++) image.rgba.copy(pixels, y * box.width * 4, ((box.top + y) * image.width + box.left) * 4, ((box.top + y) * image.width + box.left + box.width) * 4);
  const height = Math.round(box.height * WIDTH / box.width);
  const small = resizeRegion({width: box.width, height: box.height, pixels}, box.width, box.height, WIDTH, height);
  prepared.push({type, removed, box, png: encode({width: small.width, height: small.height, rgba: small.pixels}), width: small.width, height: small.height});
}

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch();
try {
  const page = await browser.newPage(); mkdirSync(TARGET, {recursive: true});
  for (const art of prepared) {
    const data = await page.evaluate(async ({png}) => {
      const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), image = await createImageBitmap(new Blob([bytes], {type: 'image/png'}));
      const canvas = new OffscreenCanvas(image.width, image.height); canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await canvas.convertToBlob({type: 'image/webp', quality: .86}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
      for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      return btoa(text);
    }, {png: art.png.toString('base64')});
    const webp = Buffer.from(data, 'base64'); writeFileSync(`${TARGET}/${art.type}.webp`, webp);
    console.log(`${art.type}: card ${art.box.width}x${art.box.height} at (${art.box.left}, ${art.box.top}), checkerboard ${art.removed} px, served ${art.width}x${art.height}, ${webp.length} bytes`);
  }
} finally { await browser.close(); }
