// Prepares approved rabbit designs as RGBA masters in assets-source/rabbits/<id>/sprite.png. Node built-ins only.
// Usage: node scripts/prepare-rabbit-masters.mjs "<Design des lapins folder>" [id ...]
// Opaque designs are cut out by a flood fill from the border, then every master is cropped to its opaque bounds plus a margin.
// The masters are the approved source of scripts/derive-rabbit-art.mjs; this script only runs when a design is (re)delivered.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {encodePng} from './derive-nursery-overlays.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
/** `light`: white background; `checker`: a transparency checkerboard printed into the picture (two neutral greys);
 * `corner`: a flat colour sampled on the border; absent: already transparent. */
export const DESIGNS = [
  {id: 'boudinet', file: 'Rare/Boudinet/Boudinet.png', background: 'light'},
  {id: 'dinono', file: 'Rare/Dinono/Dinono.png'},
  {id: 'egiiipte', file: 'Rare/Egiiipte/Egiiipte.png', background: 'light'},
  {id: 'piment', file: 'Rare/Piment/Piment.png'},
  {id: 'tunini', file: 'Rare/Tunini/Tunini.png', background: 'checker'},
  {id: 'bretonette', file: 'Rare/Bretonnette/Bretonette.png', background: 'checker'},
  {id: 'dadi', file: 'Epic/Dadi/Dadi.png', background: 'corner'},
  {id: 'maxou', file: 'Epic/Maxou/Maxou.png'},
  {id: 'magicien', file: 'Epic/Magicien/Magicien.png'},
  {id: 'dragon', file: 'légendaire/Dragon/Dragon.png', background: 'light'},
  {id: 'requin', file: 'légendaire/Requin/Requin.png'},
];
const MARGIN = 8, LIGHT_MIN = 200, LIGHT_SPREAD = 26, CHECKER_MIN = 130, CHECKER_SPREAD = 14, CORNER_TOLERANCE = 56;

/** 8-bit RGB or RGBA, non-interlaced; returns RGBA. */
export function decodeRgbPng(file) {
  let width = 0, height = 0, channels = 0; const parts = [];
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at), type = file.toString('latin1', at + 4, at + 8), data = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
      if (data[8] !== 8 || !channels || data[12] !== 0) throw Error('Only 8-bit RGB/RGBA, non-interlaced PNGs are supported');
    }
    if (type === 'IDAT') parts.push(data);
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(parts)), stride = width * channels, rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), out = rows.subarray(y * stride, (y + 1) * stride), up = y ? rows.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0, b = up ? up[x] : 0, c = up && x >= channels ? up[x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a; else if (filter === 2) predictor = b; else if (filter === 3) predictor = (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[x] = (line[x] + predictor) & 255;
    }
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    for (let k = 0; k < 3; k++) pixels[i * 4 + k] = rows[i * channels + k];
    pixels[i * 4 + 3] = channels === 4 ? rows[i * channels + 3] : 255;
  }
  return {width, height, pixels};
}

function cutOut({width, height, pixels}, mode) {
  const at = i => [pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]];
  let reference = [0, 0, 0];
  if (mode === 'corner') {
    const border = [];
    for (let x = 0; x < width; x++) border.push(at(x), at((height - 1) * width + x));
    for (let y = 0; y < height; y++) border.push(at(y * width), at(y * width + width - 1));
    reference = [0, 1, 2].map(k => border.map(c => c[k]).sort((a, b) => a - b)[border.length >> 1]);
  }
  // Distance to "background", 0 inside it; the anti-aliased rim gets a proportional alpha.
  const distance = i => {
    const [r, g, b] = at(i);
    if (mode === 'light') return Math.max(0, LIGHT_MIN - Math.min(r, g, b), Math.max(r, g, b) - Math.min(r, g, b) - LIGHT_SPREAD);
    if (mode === 'checker') return Math.max(0, CHECKER_MIN - Math.min(r, g, b), Math.max(r, g, b) - Math.min(r, g, b) - CHECKER_SPREAD);
    return Math.max(0, Math.hypot(r - reference[0], g - reference[1], b - reference[2]) - CORNER_TOLERANCE);
  };
  const removed = new Uint8Array(width * height), queue = [];
  const seed = i => { if (!removed[i] && distance(i) === 0) { removed[i] = 1; queue.push(i); } };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (queue.length) {
    const i = queue.pop(), x = i % width, y = (i - x) / width;
    if (x > 0) seed(i - 1); if (x < width - 1) seed(i + 1); if (y > 0) seed(i - width); if (y < height - 1) seed(i + width);
  }
  const background = mode === 'light' ? [255, 255, 255] : mode === 'checker' ? [200, 200, 200] : reference;
  for (let i = 0; i < width * height; i++) {
    if (removed[i]) { pixels[i * 4 + 3] = 0; continue; }
    const x = i % width, y = (i - x) / width;
    const rim = (x > 0 && removed[i - 1]) || (x < width - 1 && removed[i + 1]) || (y > 0 && removed[i - width]) || (y < height - 1 && removed[i + width]);
    if (!rim) continue;
    // Rim pixels mix the drawing with the background: recover a partial alpha and un-mix the colour.
    const alpha = Math.min(1, distance(i) / 48);
    if (alpha <= 0.05) { pixels[i * 4 + 3] = 0; continue; }
    for (let k = 0; k < 3; k++) pixels[i * 4 + k] = Math.max(0, Math.min(255, Math.round((pixels[i * 4 + k] - (1 - alpha) * background[k]) / alpha)));
    pixels[i * 4 + 3] = Math.round(alpha * 255);
  }
}

function crop({width, height, pixels}) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] >= 16) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const left = Math.max(0, minX - MARGIN), top = Math.max(0, minY - MARGIN);
  const right = Math.min(width - 1, maxX + MARGIN), bottom = Math.min(height - 1, maxY + MARGIN);
  const w = right - left + 1, h = bottom - top + 1, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) pixels.copy(out, y * w * 4, ((top + y) * width + left) * 4, ((top + y) * width + left + w) * 4);
  // Fully transparent pixels carry no colour, so the master does not depend on hidden glow data.
  for (let i = 3; i < out.length; i += 4) if (out[i] === 0) out[i - 3] = out[i - 2] = out[i - 1] = 0;
  return {width: w, height: h, pixels: out};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [folder, ...only] = process.argv.slice(2);
  if (!folder) throw Error('Usage: node scripts/prepare-rabbit-masters.mjs "<Design des lapins folder>" [id ...]');
  for (const design of DESIGNS.filter(d => !only.length || only.includes(d.id))) {
    const image = decodeRgbPng(readFileSync(join(folder, design.file)));
    if (design.background) cutOut(image, design.background);
    const master = crop(image);
    mkdirSync(`assets-source/rabbits/${design.id}`, {recursive: true});
    writeFileSync(`assets-source/rabbits/${design.id}/sprite.png`, encodePng(master));
    console.log(`${design.id}: ${image.width}x${image.height} -> ${master.width}x${master.height}`);
  }
}
