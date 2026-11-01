// Painted Cuisine art (food, utensils, containers, kitchen), generated with ChatGPT on 1 November 2026 with the owner's free hand.
// Stage 1 (only when the paintings are redelivered): `node scripts/prepare-cuisine-art.mjs --sources output/imagegen/cuisine-v1`
//   keys each magenta sprite sheet, splits it by grid cell (painted pieces grouped by their centre) and writes trimmed RGBA
//   masters in assets-source/cuisine/.
// Stage 2 (always): `PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-cuisine-art.mjs`
//   resizes the masters and encodes them as WebP (with alpha) in cooktap-prototype/art/, with a manifest.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decode, encode} from './png-rgba.mjs';
import {resizeRegion} from './resize-rgba.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const MASTERS = 'assets-source/cuisine', TARGET = 'cooktap-prototype/art';

/**
 * `grid`: [columns, rows] of the sheet; `names` in reading order (null: cell not used). `size`: runtime width in pixels.
 * `soft`: names keyed as translucent paint. `opaque`: a full painting kept with its background (the kitchen backdrop).
 */
export const SHEETS = [
  {source: 'ingredients.png', grid: [4, 3], size: 256, names: [
    'avocado-whole', 'avocado-cut', 'shallot-whole', 'shallot-cut',
    'bread-raw', 'bread-toasted', 'salmon', 'chocolate',
    'butter', 'eggs', 'sugar', 'flour']},
  {source: 'poulet-ustensiles.png', grid: [4, 3], size: 256, names: [
    'chicken-raw', 'chicken-cut', 'chicken-soy', 'chicken-glazed',
    'sweet-potato-whole', 'sweet-potato-peeled', 'sweet-potato-cut', 'soy',
    'honey', 'knife', 'peeler', 'whisk']},
  {source: 'saladier.png', grid: [4, 3], size: 320, names: [
    'bowl-empty', 'bowl-eggs', 'bowl-sugar', 'bowl-whisked',
    'bowl-chocolate', 'bowl-flour', 'bowl-batter', 'bowl-avocado',
    'bowl-honey', 'bowl-soy', 'bowl-shallot', 'bowl-mixed']},
  {source: 'recipients.png', grid: [4, 3], size: 320, names: [
    'saucepan-empty', 'saucepan-chocolate', 'saucepan-melted', 'pan-empty',
    'pan-bread', 'mould-empty', 'mould-batter', 'mould-baked',
    'dish-empty', 'dish-chicken', 'dish-sweet-potato', 'dish-both']},
  {source: 'assiettes.png', grid: [4, 3], size: 320, names: [
    'dish-cooked', 'plate-empty', 'plate-toast', 'plate-avocado',
    'plate-salmon', 'plate-moelleux', 'plate-chicken', 'cutting-board',
    'stove', 'oven', 'spoon', 'steam'], soft: ['steam']},
  {source: 'cuisine-fond.png', opaque: true, size: 1600, names: ['backdrop']},
];

/**
 * Magenta background (255, 0, 255). The smallest opacity that explains a pixel is max(g, 255 − r, 255 − b) / 255;
 * painted matter (cream, light wood, steel) is far above it, so anything past 45 % is kept opaque and untouched, and only
 * the soft edges in between are unmixed. `soft` keeps the plain unmixing for translucent paint (steam).
 */
function keyMagenta(rgba, soft = false) {
  for (let i = 0; i < rgba.length; i += 4) {
    const [r, g, b] = rgba.subarray(i, i + 3), least = Math.max(g, 255 - r, 255 - b) / 255;
    const alpha = Math.max(0, Math.min(1, soft ? (least * 255 - 24) / 200 : (least - .1) / .35));
    if (!alpha) { rgba.fill(0, i, i + 4); continue; }
    const unmix = (value, key) => Math.max(0, Math.min(255, Math.round((value - (1 - alpha) * key) / alpha)));
    rgba[i] = unmix(r, 255); rgba[i + 1] = unmix(g, 0); rgba[i + 2] = unmix(b, 255); rgba[i + 3] = Math.round(alpha * 255);
  }
}
/** Connected painted pieces (4-neighbour, alpha above a small threshold); specks under 40 pixels are dropped. */
function pieces({width, height, rgba}) {
  const label = new Int32Array(width * height).fill(-1), found = [], stack = [];
  for (let start = 0; start < width * height; start++) {
    if (label[start] !== -1 || rgba[start * 4 + 3] < 24) continue;
    const piece = {id: found.length, count: 0, sx: 0, sy: 0, left: width, top: height, right: 0, bottom: 0};
    label[start] = piece.id; stack.push(start);
    while (stack.length) {
      const at = stack.pop(), x = at % width, y = (at - x) / width;
      piece.count++; piece.sx += x; piece.sy += y;
      piece.left = Math.min(piece.left, x); piece.right = Math.max(piece.right, x); piece.top = Math.min(piece.top, y); piece.bottom = Math.max(piece.bottom, y);
      for (const next of [x > 0 && at - 1, x < width - 1 && at + 1, y > 0 && at - width, y < height - 1 && at + width]) {
        if (next === false || label[next] !== -1 || rgba[next * 4 + 3] < 24) continue;
        label[next] = piece.id; stack.push(next);
      }
    }
    found.push(piece);
  }
  return {label, found: found.filter(piece => piece.count >= 40)};
}
/** One trimmed sprite per grid cell: every piece whose centre falls in the cell, other cells' pixels cleared. */
function splitSheet(image, [columns, rows]) {
  const {label, found} = pieces(image), cells = Array.from({length: columns * rows}, () => []);
  for (const piece of found) {
    const column = Math.min(columns - 1, Math.floor(piece.sx / piece.count / image.width * columns));
    const row = Math.min(rows - 1, Math.floor(piece.sy / piece.count / image.height * rows));
    cells[row * columns + column].push(piece);
  }
  return cells.map(members => {
    if (!members.length) return null;
    const keep = new Set(members.map(piece => piece.id)), pad = 4;
    const left = Math.max(0, Math.min(...members.map(p => p.left)) - pad), top = Math.max(0, Math.min(...members.map(p => p.top)) - pad);
    const right = Math.min(image.width - 1, Math.max(...members.map(p => p.right)) + pad), bottom = Math.min(image.height - 1, Math.max(...members.map(p => p.bottom)) + pad);
    const width = right - left + 1, height = bottom - top + 1, rgba = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const from = (top + y) * image.width + left + x;
      if (keep.has(label[from])) image.rgba.copy(rgba, (y * width + x) * 4, from * 4, from * 4 + 4);
    }
    return {width, height, rgba};
  });
}

const sourceIndex = process.argv.indexOf('--sources');
if (sourceIndex > 0) {
  const folder = process.argv[sourceIndex + 1]; mkdirSync(MASTERS, {recursive: true});
  for (const sheet of SHEETS) {
    const image = decode(readFileSync(`${folder}/${sheet.source}`));
    if (sheet.opaque) { writeFileSync(`${MASTERS}/${sheet.names[0]}.png`, encode(image)); continue; }
    const original = Buffer.from(image.rgba); keyMagenta(image.rgba);
    const sprites = splitSheet(image, sheet.grid);
    sheet.names.forEach((name, k) => {
      if (!name) return;
      if (!sprites[k]) throw Error(`${sheet.source}: empty cell ${k} for ${name}`);
      if (sheet.soft?.includes(name)) {
        const again = {width: image.width, height: image.height, rgba: Buffer.from(original)}; keyMagenta(again.rgba, true);
        sprites[k] = splitSheet(again, sheet.grid)[k];
      }
      writeFileSync(`${MASTERS}/${name}.png`, encode(sprites[k]));
    });
  }
}

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch(), manifest = {};
try {
  const page = await browser.newPage(); mkdirSync(TARGET, {recursive: true});
  for (const sheet of SHEETS) for (const name of sheet.names.filter(Boolean)) {
    const file = `${MASTERS}/${name}.png`; if (!existsSync(file)) throw Error(`Missing master ${file}: run with --sources first`);
    const master = decode(readFileSync(file)), width = Math.min(sheet.size, master.width), height = Math.round(master.height * width / master.width);
    const small = resizeRegion({width: master.width, height: master.height, pixels: master.rgba}, master.width, master.height, width, height);
    const png = encode({width: small.width, height: small.height, rgba: small.pixels});
    const data = await page.evaluate(async ({png, opaque}) => {
      const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), image = await createImageBitmap(new Blob([bytes], {type: 'image/png'}));
      const canvas = new OffscreenCanvas(image.width, image.height); canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await canvas.convertToBlob({type: 'image/webp', quality: opaque ? .8 : .88}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
      for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      return btoa(text);
    }, {png: png.toString('base64'), opaque: !!sheet.opaque});
    const webp = Buffer.from(data, 'base64'); writeFileSync(`${TARGET}/${name}.webp`, webp);
    manifest[name] = {width: small.width, height: small.height, bytes: webp.length, masterSha256: createHash('sha256').update(readFileSync(file)).digest('hex')};
  }
} finally { await browser.close(); }
writeFileSync(`${MASTERS}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(Object.entries(manifest).map(([name, m]) => `${name} ${m.width}x${m.height} ${m.bytes}`).join('\n'));
