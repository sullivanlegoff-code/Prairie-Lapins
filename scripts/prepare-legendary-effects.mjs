// Painted legendary effects (Lapin Dragon, Lapin Requin, Ankylosaure), generated with ChatGPT on 31 October and 1 November 2026 with the owner's free hand.
// Stage 1 (only when the paintings are redelivered): `node scripts/prepare-legendary-effects.mjs --sources output/imagegen/legendaires-v1`
//   (fire and water) or `--sources output/imagegen/ankylosaure-effets-v1` (earth) keys each painting found in that folder
//   (black or magenta background) and crops it into RGBA masters in assets-source/effects/legendary/.
// Stage 2 (always): `PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-legendary-effects.mjs`
//   resizes the masters and encodes them as WebP (with alpha) in public/assets/effects/legendary/, with a manifest.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decode, encode} from './png-rgba.mjs';
import {resizeRegion} from './resize-rgba.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const MASTERS = 'assets-source/effects/legendary', TARGET = 'public/assets/effects/legendary';

/**
 * `key`: background removed (black: light becomes opacity, for fire and light; magenta: chroma key, for water; earth: magenta behind solid earth colours).
 * `box`: [x, y, width, height] in the painting. `frames`: equal cells of the box, as rows or columns.
 * `erase`: [x, y, width, height] of a neighbouring element to clear. `size`: runtime width in pixels. `opaque`: kept with its background (full-screen paintings the page blends with the screen).
 */
export const EFFECTS = [
  // Lapin Dragon
  {name: 'breath', source: 'souffle-anim.png', key: 'black', box: [0, 0, 1024, 1536], frames: {rows: 6}, size: 384},
  {name: 'flame', source: 'flamme-anim.png', key: 'black', box: [0, 300, 1536, 350], frames: {columns: 6}, size: 96},
  {name: 'ember', source: 'feu-planche.png', key: 'black', box: [740, 749, 61, 65], size: 24},
  {name: 'spark', source: 'feu-planche.png', key: 'black', box: [798, 820, 43, 43], size: 20},
  {name: 'smoke', source: 'feu-planche.png', key: 'black', box: [1140, 690, 258, 186], erase: [1290, 836, 110, 40], size: 96},
  {name: 'firewall', source: ['feu-mur-0.png', 'feu-mur-1.png', 'feu-mur-2.png', 'feu-mur-3.png', 'feu-mur-4.png'], key: 'black', box: [0, 0, 1536, 1024], size: 1280, opaque: true},
  // Both legendaries
  {name: 'halo', source: 'halo.png', key: 'black', box: [0, 0, 1254, 1254], size: 512},
  // Lapin Requin
  {name: 'wave', source: ['vague-0.png', 'vague-1.png', 'vague-2.png'], key: 'magenta', box: [0, 0, 1536, 1024], size: 1280},
  {name: 'foam', source: 'ecume-0.png', key: 'none', box: [0, 0, 1536, 1024], size: 1280, opaque: true},
  {name: 'surfboard', source: 'eau-planche.png', key: 'magenta', box: [40, 150, 1460, 295], size: 160},
  {name: 'puddle', source: 'eau-planche.png', key: 'magenta', box: [30, 690, 590, 235], size: 128},
  {name: 'bubble', source: 'eau-planche.png', key: 'magenta', box: [785, 615, 167, 165], size: 32},
  {name: 'drop', source: 'eau-planche.png', key: 'magenta', box: [1265, 616, 123, 133], size: 24},
  {name: 'surfwave', source: 'vaguette-anim.png', key: 'magenta', box: [0, 230, 2172, 250], frames: {columns: 6}, size: 128},
  {name: 'splash', source: 'eclabousse-anim.png', key: 'magenta', box: [0, 230, 2172, 300], frames: {columns: 6}, size: 112},
  // Ankylosaure
  {name: 'rock', source: 'terre-planche.png', key: 'earth', box: [24, 99, 385, 336], size: 64},
  {name: 'stone', source: 'terre-planche.png', key: 'earth', box: [513, 180, 237, 204], size: 40},
  {name: 'clod', source: 'terre-planche.png', key: 'earth', box: [876, 117, 305, 298], size: 44},
  {name: 'mound', source: 'terre-planche.png', key: 'earth', box: [1280, 182, 378, 193], size: 96},
  {name: 'crack', source: 'terre-planche.png', key: 'earth', box: [14, 621, 396, 193], size: 160},
  {name: 'dust', source: 'terre-planche.png', key: 'earth', box: [471, 556, 331, 276], size: 96},
  {name: 'dustring', source: 'terre-planche.png', key: 'earth', box: [851, 615, 417, 185], size: 192},
  {name: 'gravel', source: 'terre-planche.png', key: 'earth', box: [1367, 612, 225, 171], size: 40},
  {name: 'rift', source: 'faille.png', key: 'earth', box: [0, 0, 1536, 1024], size: 1280},
  {name: 'dustwall', source: 'poussiere-mur.png', key: 'earth', box: [0, 0, 1536, 1024], size: 1280},
  {name: 'strata', source: 'strates.png', key: 'none', box: [0, 0, 1536, 1024], size: 1280, opaque: true},
];

/** Black background: the brightest channel is the opacity, the colour is unmixed from black. */
function keyBlack(rgba) {
  for (let i = 0; i < rgba.length; i += 4) {
    const peak = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]), alpha = Math.max(0, Math.min(255, (peak - 10) * 255 / 245));
    if (!alpha) { rgba.fill(0, i, i + 4); continue; }
    for (let c = 0; c < 3; c++) rgba[i + c] = Math.min(255, Math.round(rgba[i + c] * 255 / Math.max(peak, 1)));
    rgba[i + 3] = Math.round(alpha);
  }
}
/** Magenta background (255, 0, 255): green and the missing red or blue tell the painting apart, then it is unmixed. */
function keyMagenta(rgba) {
  for (let i = 0; i < rgba.length; i += 4) {
    const [r, g, b] = rgba.subarray(i, i + 3), measure = Math.max(g, 255 - r, 255 - b);
    const alpha = Math.max(0, Math.min(1, (measure - 24) / 200));
    if (!alpha) { rgba.fill(0, i, i + 4); continue; }
    const unmix = (value, key) => Math.max(0, Math.min(255, Math.round((value - (1 - alpha) * key) / alpha)));
    rgba[i] = unmix(r, 255); rgba[i + 1] = unmix(g, 0); rgba[i + 2] = unmix(b, 255); rgba[i + 3] = Math.round(alpha * 255);
  }
}
/**
 * Magenta background behind solid earth colours (stone, soil, dust): earth never has more red and blue than green, so any
 * pixel that does is background mixed with painting. Its opacity comes from how magenta it is, and its colour is rebuilt as
 * a sandy tone from the green channel (magenta has none), so outlines stay dark and the painter's pink glows become dust.
 */
function keyEarth(rgba) {
  for (let i = 0; i < rgba.length; i += 4) {
    const [r, g, b] = rgba.subarray(i, i + 3), magenta = Math.min(r, b) - g;
    // Opaque pink (the painter's glow, redder than any soil and bluish): sandy dust of the same lightness.
    if (magenta <= 0 && r > g + 60 && b > g * .85) { const light = (r + g + b) / 3; rgba[i] = Math.min(255, light * 1.15); rgba[i + 1] = light; rgba[i + 2] = light * .78; continue; }
    if (magenta <= 0) continue;
    const alpha = Math.max(0, 1 - magenta / 80);
    if (!alpha) { rgba.fill(0, i, i + 4); continue; }
    const green = Math.min(255, g / alpha);
    rgba[i] = Math.min(255, Math.round(green * 1.15)); rgba[i + 1] = Math.round(green); rgba[i + 2] = Math.round(green * .78); rgba[i + 3] = Math.round(alpha * 255);
  }
}
function crop({width, rgba}, [x, y, w, h]) {
  const pixels = Buffer.alloc(w * h * 4);
  for (let j = 0; j < h; j++) rgba.copy(pixels, j * w * 4, ((y + j) * width + x) * 4, ((y + j) * width + x + w) * 4);
  return {width: w, height: h, pixels};
}
function cells(effect) {
  const [x, y, w, h] = effect.box, n = effect.frames?.rows ?? effect.frames?.columns ?? 1;
  return Array.from({length: n}, (_, k) => effect.frames?.rows ? [x, y + Math.round(k * h / n), w, Math.round((k + 1) * h / n) - Math.round(k * h / n)]
    : [x + Math.round(k * w / n), y, Math.round((k + 1) * w / n) - Math.round(k * w / n), h]);
}
const masterNames = effect => {
  const count = Array.isArray(effect.source) ? effect.source.length : effect.frames ? cells(effect).length : 1;
  return Array.from({length: count}, (_, k) => count === 1 ? effect.name : `${effect.name}-${k + 1}`);
};

const sourceIndex = process.argv.indexOf('--sources');
if (sourceIndex > 0) {
  const folder = process.argv[sourceIndex + 1]; mkdirSync(MASTERS, {recursive: true});
  for (const effect of EFFECTS) {
    const names = masterNames(effect);
    if (!existsSync(`${folder}/${[effect.source].flat()[0]}`)) continue;
    const pieces = Array.isArray(effect.source) ? effect.source.map(file => ({file, box: effect.box})) : cells(effect).map(box => ({file: effect.source, box}));
    pieces.forEach(({file, box}, k) => {
      const image = decode(readFileSync(`${folder}/${file}`));
      if (effect.key === 'black' && !effect.opaque) keyBlack(image.rgba); else if (effect.key === 'magenta') keyMagenta(image.rgba); else if (effect.key === 'earth') keyEarth(image.rgba);
      if (effect.erase) { const [ex, ey, ew, eh] = effect.erase; for (let y = ey; y < ey + eh; y++) image.rgba.fill(0, (y * image.width + ex) * 4, (y * image.width + ex + ew) * 4); }
      const piece = crop(image, box);
      writeFileSync(`${MASTERS}/${names[k]}.png`, encode({width: piece.width, height: piece.height, rgba: piece.pixels}));
    });
  }
}

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch(), manifest = {};
try {
  const page = await browser.newPage(); mkdirSync(TARGET, {recursive: true});
  for (const effect of EFFECTS) for (const name of masterNames(effect)) {
    const file = `${MASTERS}/${name}.png`; if (!existsSync(file)) throw Error(`Missing master ${file}: run with --sources first`);
    const master = decode(readFileSync(file)), height = Math.round(master.height * effect.size / master.width);
    const small = resizeRegion({width: master.width, height: master.height, pixels: master.rgba}, master.width, master.height, effect.size, height);
    const png = encode({width: small.width, height: small.height, rgba: small.pixels});
    const data = await page.evaluate(async ({png, opaque}) => {
      const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), image = await createImageBitmap(new Blob([bytes], {type: 'image/png'}));
      const canvas = new OffscreenCanvas(image.width, image.height); canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await canvas.convertToBlob({type: 'image/webp', quality: opaque ? .8 : .9}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
      for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      return btoa(text);
    }, {png: png.toString('base64'), opaque: !!effect.opaque});
    const webp = Buffer.from(data, 'base64'); writeFileSync(`${TARGET}/${name}.webp`, webp);
    manifest[name] = {width: small.width, height: small.height, bytes: webp.length, masterSha256: createHash('sha256').update(readFileSync(file)).digest('hex')};
  }
} finally { await browser.close(); }
writeFileSync(`${MASTERS}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(Object.entries(manifest).map(([name, m]) => `${name} ${m.width}x${m.height} ${m.bytes}`).join('\n'));
