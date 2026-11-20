// « Cours cours Benny ! »: the painted decor of the track (13 November 2026, concept C, the floating isles): the textures of the
// planks, the grass, the two kinds of wall (earth and grass to run on, grey stone) and the isles' cliff at the edge of the void,
// and the painted skies, reduced and encoded in WebP with an installed Playwright (like scripts/prepare-benny-run-art.mjs).
//
//   PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-benny-run-decor.mjs [--sources <folder>] [--sky <png>] (default: fond-ciel.png in the sources) [--only-sides]
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
  // The stones of the walls in the middle of the road and of the stairs (16 Nov.): a raspberry base with arches, cream blocks, ochre rock.
  'decor-socle-framboise': {source: 'socle-framboise.png', size: 384},
  'decor-corps-creme': {source: 'corps-creme.png', size: 384},
  'decor-corps-ocre': {source: 'corps-ocre.png', size: 384},
  // The stone and the verges of those two worlds: smooth stone or ice, ash or snow underfoot.
  'decor-lave-pierre': {source: 'lave-pierre.png', size: 256},
  'decor-lave-sol': {source: 'lave-sol.png', size: 256},
  'decor-neige-pierre': {source: 'neige-pierre.png', size: 256},
  'decor-neige-sol': {source: 'neige-sol.png', size: 256},
  // The same on the lava bridge and on the mountain path (16 Nov.): dark basalt with glowing arches or chalet wood; basalt blocks or
  // volcanic rock, grey-blue stone or snowy rock.
  'decor-lave-socle-sombre': {source: 'lave-socle-sombre.png', size: 384},
  'decor-lave-corps-basalte': {source: 'lave-corps-basalte.png', size: 384},
  'decor-lave-corps-roche': {source: 'lave-corps-roche.png', size: 384},
  'decor-neige-socle-bois': {source: 'neige-socle-bois.png', size: 384},
  'decor-neige-corps-pierre': {source: 'neige-corps-pierre.png', size: 384},
  'decor-neige-corps-roche': {source: 'neige-corps-roche.png', size: 384},
  // Cut out: nine things standing beside the road, in a grid of 3 × 3.
  'decor-bord': {source: 'bord.png', size: 768},
  // The same for the lava bridge and the mountain path (16 Nov.): basalt, crystals, embers; snowy rocks, pines, a lantern.
  'decor-bord-lave': {source: 'bord-lave.png', size: 768},
  'decor-bord-neige': {source: 'bord-neige.png', size: 768},
  // Cut out: the arch across the road where a new world starts (16 Nov.), its panel left blank for the world's name.
  'decor-arche-prairie': {source: 'arche-prairie.png', size: 768},
  'decor-arche-lave': {source: 'arche-lave.png', size: 768},
  'decor-arche-neige': {source: 'arche-neige.png', size: 768},
  'decor-herbe': {source: 'herbe.png', size: 256},
  // Cut out (transparent): ash and small flames, snow drifts, the tall grass of the lava bridge and of the mountain path.
  'decor-touffes-lave': {source: 'touffes-lave.png', size: 256},
  'decor-touffes-neige': {source: 'touffes-neige.png', size: 256},
  'decor-falaise': {source: 'falaise.png', size: 256, top: 14},
};

// (The meadow's thirty big painted walls, 17 Nov., left the run on 19 Nov.: fences and tall grass line the road now.)

/** The painted strips of the sides of the road (owner's picks, 20 Nov.: the green meadow of tall grass, the honey-wood fence, the
 *  wall of cream stones on light blue slabs), cut out of their paintings into tracked masters (assets-source/benny-run/<name>.png,
 *  which repeat end to end), and their width once encoded (px; the height keeps the proportions). `--only-sides` encodes only them. */
export const SIDE_STRIPS = {'cotes-herbe': 1024, 'cotes-barriere': 890, 'cotes-mur': 1184};
const ONLY_SIDES = process.argv.includes('--only-sides');

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
  for (const [name, width] of Object.entries(SIDE_STRIPS)) {
    const png = readFileSync(`assets-source/benny-run/${name}.png`), height = Math.round(width * png.readUInt32BE(20) / png.readUInt32BE(16));
    const webp = Buffer.from(await encode(png.toString('base64'), {width, height, quality: .88}), 'base64');
    writeFileSync(`${TARGET}/${name}.webp`, webp); sizes[name] = webp.length;
  }
  for (const [name, t] of ONLY_SIDES ? [] : Object.entries(TEXTURES)) {
    const webp = Buffer.from(await encode(readFileSync(`${SOURCES}/${t.source}`).toString('base64'), {top: t.top ?? 0, width: t.size, height: t.size, quality: .86}), 'base64');
    writeFileSync(`${TARGET}/${name}.webp`, webp); sizes[name] = webp.length;
  }
  // The skies keep their painted size (1024 × 1536), only in WebP: the meadow's, the lava's (smoke, a red glow), the snow's (cold).
  for (const [name, source] of ONLY_SIDES ? [] : [['fond-ciel', SKY], ['fond-ciel-lave', `${SOURCES}/fond-ciel-lave.png`], ['fond-ciel-neige', `${SOURCES}/fond-ciel-neige.png`]]) {
    const sky = Buffer.from(await encode(readFileSync(source).toString('base64'), {quality: .84}), 'base64');
    writeFileSync(`${TARGET}/${name}.webp`, sky); sizes[name] = sky.length;
  }
} finally { await browser.close(); }
console.log(JSON.stringify(sizes));
