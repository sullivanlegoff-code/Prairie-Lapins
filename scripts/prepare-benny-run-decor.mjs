// « Cours cours Benny ! »: the painted decor of the track (13 November 2026, concept C, the floating isles): the textures of the
// planks, the grass, the two kinds of wall (earth and grass to run on, grey stone) and the isles' cliff at the edge of the void,
// and the painted sky, reduced and encoded in WebP with an installed Playwright (like scripts/prepare-benny-run-art.mjs).
//
//   PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-benny-run-decor.mjs [--sources <folder>] [--sky <png>] (default: fond-ciel.png in the sources)
//
// The sources (default output/imagegen/course-decor-final-v1, ignored by Git) are square paintings that tile from left to right
// (and from top to bottom for the planks and the grass).
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const argument = name => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : undefined; };
const SOURCES = argument('--sources') ?? 'output/imagegen/course-decor-final-v1';
const SKY = argument('--sky') ?? `${SOURCES}/fond-ciel.png`;
const TARGET = 'public/assets/benny-run';

/** Each texture: its painting, the rows of white left at its top to drop, and its side once reduced (px). */
export const TEXTURES = {
  'decor-planches': {source: 'planches.png', size: 256},
  // The road itself (14 Nov.): a meadow path of big pale slabs; the planks stay for stairs and platforms.
  'decor-dalles': {source: 'dalles.png', size: 384},
  // The same path in the other two worlds: basalt over lava (the bridge), stone in the snow (the mountain path).
  'decor-dalles-lave': {source: 'dalles-lave.png', size: 384},
  'decor-dalles-neige': {source: 'dalles-neige.png', size: 384},
  // Cut out: nine things standing beside the road, in a grid of 3 × 3.
  'decor-bord': {source: 'bord.png', size: 768},
  'decor-herbe': {source: 'herbe.png', size: 256},
  'decor-mur-terre': {source: 'mur-terre.png', size: 256},
  'decor-mur-pierre': {source: 'mur-pierre.png', size: 256},
  'decor-mur-racines': {source: 'mur-racines.png', size: 256},
  // Cut out (transparent): vines hanging from a wall's top, grass and flowers at its foot.
  'decor-lianes': {source: 'lianes.png', size: 256},
  'decor-touffes': {source: 'touffes.png', size: 256},
  'decor-falaise': {source: 'falaise.png', size: 256, top: 14},
};

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch();
mkdirSync(TARGET, {recursive: true});
const sizes = {};
try {
  const page = await browser.newPage();
  const encode = (png, crop) => page.evaluate(async ({png, crop}) => {
    const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], {type: 'image/png'}));
    const {top = 0, width = bitmap.width, height = bitmap.height - top, quality} = crop;
    // Reduced in halving steps (each one an average of four pixels), so the fine lines stay clean.
    let source = bitmap, sw = bitmap.width, sh = bitmap.height - top, sy = top;
    while (sw / 2 >= width && sh / 2 >= height) { const half = new OffscreenCanvas(Math.round(sw / 2), Math.round(sh / 2)), k = half.getContext('2d');
      k.imageSmoothingQuality = 'high'; k.drawImage(source, 0, sy, sw, sh, 0, 0, half.width, half.height); source = half; sw = half.width; sh = half.height; sy = 0; }
    const canvas = new OffscreenCanvas(width, height), k = canvas.getContext('2d'); k.imageSmoothingQuality = 'high';
    k.drawImage(source, 0, sy, sw, sh, 0, 0, width, height);
    const blob = await canvas.convertToBlob({type: 'image/webp', quality}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
    for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    return btoa(text);
  }, {png, crop});
  for (const [name, t] of Object.entries(TEXTURES)) {
    const webp = Buffer.from(await encode(readFileSync(`${SOURCES}/${t.source}`).toString('base64'), {top: t.top ?? 0, width: t.size, height: t.size, quality: .86}), 'base64');
    writeFileSync(`${TARGET}/${name}.webp`, webp); sizes[name] = webp.length;
  }
  // The sky keeps its painted size (1024 × 1536), only in WebP.
  const sky = Buffer.from(await encode(readFileSync(SKY).toString('base64'), {quality: .84}), 'base64');
  writeFileSync(`${TARGET}/fond-ciel.webp`, sky); sizes['fond-ciel'] = sky.length;
} finally { await browser.close(); }
console.log(JSON.stringify(sizes));
