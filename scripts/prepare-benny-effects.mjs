// Painted effects of Benny's first appearance (Mythic rabbit), ChatGPT paintings approved by the owner on 1 November 2026:
// clouds opening on a golden light, a pastel rainbow drawing itself, rays, halos, bursts, stardust and feathers, on pure black.
// Stage 1 (only when the paintings are redelivered): `node scripts/prepare-benny-effects.mjs --sources output/imagegen/benny-anim-v2`
//   cuts each cell of the four labelled boards (without its label), turns the black background into opacity and writes RGBA
//   masters in assets-source/effects/benny/.
// Stage 2 (always): `PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-benny-effects.mjs`
//   resizes the masters and encodes them as WebP (with alpha) in public/assets/effects/benny/, with a manifest.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decode, encode} from './png-rgba.mjs';
import {resizeRegion} from './resize-rgba.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const MASTERS = 'assets-source/effects/benny', TARGET = 'public/assets/effects/benny';

/** Equal cells of a labelled row: `count` columns over the board width, the label line left out. */
const row = (count, y, height, width = 1774) => Array.from({length: count}, (_, k) => [Math.round(k * width / count), y, Math.round((k + 1) * width / count) - Math.round(k * width / count), height]);

/**
 * `boxes`: [x, y, width, height] of each cell in the board (one master each, numbered when there are several).
 * `knee`: brightness that becomes fully opaque (lower keeps the shaded side of a cloud solid instead of see-through).
 * `size`: runtime width in pixels (never wider than the painted cell).
 */
export const EFFECTS = [
  // 11-nuages: clouds gather, part and open on a golden light (1 to 7), then drift apart into small clouds (8).
  {name: 'cloud', source: '11-nuages.png', boxes: [...row(4, 20, 340), ...row(4, 455, 340)], knee: 190, size: 443},
  // 12-arc-en-ciel: the rainbow drawing itself from the left cloud to the right one.
  {name: 'rainbow', source: '12-arc-en-ciel.png', boxes: [...row(4, 45, 300), ...row(4, 457, 300)], knee: 220, size: 443},
  // 13-rayons-halos-eclats
  {name: 'rays', source: '13-rayons-halos-eclats.png', boxes: row(6, 80, 278), knee: 255, size: 296},
  {name: 'ring', source: '13-rayons-halos-eclats.png', boxes: [[22, 550, 300, 150]], knee: 255, size: 256},
  {name: 'ring-sparkles', source: '13-rayons-halos-eclats.png', boxes: [[326, 532, 296, 170]], knee: 255, size: 256},
  {name: 'glow', source: '13-rayons-halos-eclats.png', boxes: [[640, 480, 250, 256]], knee: 255, size: 192},
  {name: 'twinkle', source: '13-rayons-halos-eclats.png', boxes: [[950, 525, 162, 162]], knee: 255, size: 96},
  {name: 'burst', source: '13-rayons-halos-eclats.png', boxes: [[1143, 452, 308, 300]], knee: 255, size: 224},
  {name: 'prism', source: '13-rayons-halos-eclats.png', boxes: [[1460, 452, 302, 300]], knee: 255, size: 224},
  // 14-poussiere-plumes
  {name: 'star', source: '14-poussiere-plumes.png', boxes: [[106, 172, 90, 90]], knee: 255, size: 32},
  {name: 'star-five', source: '14-poussiere-plumes.png', boxes: [[334, 158, 120, 120]], knee: 255, size: 40},
  {name: 'star-big', source: '14-poussiere-plumes.png', boxes: [[538, 92, 230, 236]], knee: 255, size: 96},
  {name: 'stardust', source: '14-poussiere-plumes.png', boxes: [[812, 112, 246, 206]], knee: 255, size: 128},
  {name: 'trail', source: '14-poussiere-plumes.png', boxes: [[1080, 128, 310, 182]], knee: 255, size: 192},
  {name: 'swirl', source: '14-poussiere-plumes.png', boxes: [[1418, 40, 345, 312]], knee: 255, size: 256},
  {name: 'feather', source: '14-poussiere-plumes.png', boxes: [[60, 442, 172, 316], [306, 510, 230, 210], [600, 550, 186, 155], [858, 510, 186, 214], [1118, 456, 246, 268]], knee: 235, size: 96},
];

/**
 * Black background to opacity: the brightest channel, from `floor` (the painting's black) to `knee`, is the opacity; the colour
 * is unmixed from black without changing its hue, so a cloud or a glow over the night sky looks as it did over black.
 */
function keyBlack(rgba, knee, floor = 10) {
  for (let i = 0; i < rgba.length; i += 4) {
    const peak = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]), alpha = Math.max(0, Math.min(1, (peak - floor) / (knee - floor)));
    if (!alpha) { rgba.fill(0, i, i + 4); continue; }
    const scale = Math.min(255 / Math.max(peak, 1), 1 / alpha);
    for (let c = 0; c < 3; c++) rgba[i + c] = Math.min(255, Math.round(rgba[i + c] * scale));
    rgba[i + 3] = Math.round(alpha * 255);
  }
}
/** Crops a cell and softens its last pixels, so a glow cut by the cell border never ends on a straight line. */
function crop({width, rgba}, [x, y, w, h], feather = 14) {
  const pixels = Buffer.alloc(w * h * 4);
  for (let j = 0; j < h; j++) rgba.copy(pixels, j * w * 4, ((y + j) * width + x) * 4, ((y + j) * width + x + w) * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const edge = Math.min(i, j, w - 1 - i, h - 1 - j); if (edge >= feather) continue;
    const k = (j * w + i) * 4 + 3; pixels[k] = Math.round(pixels[k] * edge / feather);
  }
  return {width: w, height: h, pixels};
}
const masterNames = effect => effect.boxes.map((_, k) => effect.boxes.length === 1 ? effect.name : `${effect.name}-${k + 1}`);

const sourceIndex = process.argv.indexOf('--sources');
if (sourceIndex > 0) {
  const folder = process.argv[sourceIndex + 1]; mkdirSync(MASTERS, {recursive: true});
  for (const effect of EFFECTS) {
    const board = decode(readFileSync(`${folder}/${effect.source}`)); keyBlack(board.rgba, effect.knee);
    masterNames(effect).forEach((name, k) => {
      const piece = crop(board, effect.boxes[k]);
      writeFileSync(`${MASTERS}/${name}.png`, encode({width: piece.width, height: piece.height, rgba: piece.pixels}));
    });
  }
}

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch(), manifest = {};
try {
  const page = await browser.newPage(); mkdirSync(TARGET, {recursive: true});
  for (const effect of EFFECTS) for (const name of masterNames(effect)) {
    const file = `${MASTERS}/${name}.png`; if (!existsSync(file)) throw Error(`Missing master ${file}: run with --sources first`);
    const master = decode(readFileSync(file)), width = Math.min(effect.size, master.width), height = Math.round(master.height * width / master.width);
    const small = width === master.width ? {width, height: master.height, pixels: master.rgba}
      : resizeRegion({width: master.width, height: master.height, pixels: master.rgba}, master.width, master.height, width, height);
    const png = encode({width: small.width, height: small.height, rgba: small.pixels});
    const data = await page.evaluate(async ({png}) => {
      const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), image = await createImageBitmap(new Blob([bytes], {type: 'image/png'}), {premultiplyAlpha: 'none'});
      const canvas = new OffscreenCanvas(image.width, image.height); canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await canvas.convertToBlob({type: 'image/webp', quality: .86}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
      for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      return btoa(text);
    }, {png: png.toString('base64')});
    const webp = Buffer.from(data, 'base64'); writeFileSync(`${TARGET}/${name}.webp`, webp);
    manifest[name] = {width: small.width, height: small.height, bytes: webp.length, masterSha256: createHash('sha256').update(readFileSync(file)).digest('hex')};
  }
} finally { await browser.close(); }
writeFileSync(`${MASTERS}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
const total = Object.values(manifest).reduce((sum, m) => sum + m.bytes, 0);
console.log(Object.entries(manifest).map(([name, m]) => `${name} ${m.width}x${m.height} ${m.bytes}`).join('\n') + `\ntotal ${total}`);
