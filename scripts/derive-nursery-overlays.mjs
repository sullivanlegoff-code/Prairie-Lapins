// Derives the reduced-resolution Nursery v2 overlay textures from the approved 1254 × 1254 sources, by downscaling only.
// Built-in Node modules only (fs, path, zlib, crypto); no image library, no personal path.
//
//   node scripts/derive-nursery-overlays.mjs           write public/assets/buildings/nursery-v2-<name>-<size>.png
//   node scripts/derive-nursery-overlays.mjs --check   re-derive and compare the decoded pixels with the committed files
//
// The sources are the committed approved PNGs (public/assets/buildings/nursery-v2-<name>.png): their blob SHA-1 must match the
// approved images before anything is derived, and they are never modified.
//
// Resampling is an exact area average done in integer arithmetic on alpha-premultiplied colour, so the result is identical on
// every machine and Node version, and fully transparent neighbours never bleed a dark fringe into the edges. Each derived canvas
// keeps the square, proportional frame of its source, so every normalised origin and the artistic frame stay valid unchanged.
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {deflateSync, inflateSync} from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), dir = join(root, 'public/assets/buildings');
/** Texture sizes follow the largest on-screen size measured in the game (the framebuffer is in CSS pixels): see src/config/nurseryArt.ts. */
export const OVERLAYS = {
  baby: {size: 192, sourceSha1: '345a98f9efc3ef73c27306c7d1d319f3bdc84dd0'},
  veil: {size: 192, sourceSha1: '9b463845a2097e47ec0f26864571013b93258ad8'},
  lock: {size: 96, sourceSha1: 'e4b25a0a4e24003e2302abc01893f21b76515dd3'},
};
export const derivedName = (name) => `nursery-v2-${name}-${OVERLAYS[name].size}.png`;

const SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const crcTable = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buffer) => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/** Decodes an 8-bit RGBA, non-interlaced PNG. */
export function decodePng(file) {
  if (!file.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG');
  let width = 0, height = 0; const parts = [];
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at), type = file.toString('latin1', at + 4, at + 8), data = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('Only 8-bit RGBA, non-interlaced PNGs are supported'); }
    if (type === 'IDAT') parts.push(data);
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(parts)), stride = width * 4, pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), out = pixels.subarray(y * stride, (y + 1) * stride), up = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[x - 4] : 0, b = up ? up[x] : 0, c = up && x >= 4 ? up[x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a; else if (filter === 2) predictor = b; else if (filter === 3) predictor = (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[x] = (line[x] + predictor) & 255;
    }
  }
  return {width, height, pixels};
}

/** Encodes 8-bit RGBA with the Sub filter on every row and maximum deflate: valid, compact, and stable for a given zlib. */
export function encodePng({width, height, pixels}) {
  const stride = width * 4, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (stride + 1)] = 1; for (let x = 0; x < stride; x++) raw[y * (stride + 1) + 1 + x] = (pixels[y * stride + x] - (x >= 4 ? pixels[y * stride + x - 4] : 0)) & 255; }
  const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type, 'latin1'), data]), length = Buffer.alloc(4), crc = Buffer.alloc(4); length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body)); return Buffer.concat([length, body, crc]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

/** Overlap, in 1/size source-pixel units, of every output pixel's span with every source pixel it touches: [{j, w}] per output index. */
function spans(from, to) {
  return Array.from({length: to}, (_, i) => { const lo = i * from, hi = (i + 1) * from, list = [];
    for (let j = Math.floor(lo / to); j * to < hi && j < from; j++) { const w = Math.min(hi, (j + 1) * to) - Math.max(lo, j * to); if (w > 0) list.push({j, w}); }
    return list; });
}

/** Exact area-average downscale of a square RGBA image to `size` × `size`, on premultiplied colour, in integer arithmetic. */
export function downscale({width, height, pixels}, size) {
  if (width !== height || size > width) throw new Error('Square sources and downscaling only');
  const columns = spans(width, size), rows = spans(height, size), total = width * width;
  // Horizontal pass: per source row and output column, Σw·a and Σw·a·c (all integers, far below 2^53).
  const hA = new Float64Array(height * size), hC = new Float64Array(height * size * 3);
  for (let y = 0; y < height; y++) for (let i = 0; i < size; i++) { let a = 0, r = 0, g = 0, b = 0;
    for (const {j, w} of columns[i]) { const k = (y * width + j) * 4, alpha = pixels[k + 3]; a += w * alpha; r += w * alpha * pixels[k]; g += w * alpha * pixels[k + 1]; b += w * alpha * pixels[k + 2]; }
    hA[y * size + i] = a; hC[(y * size + i) * 3] = r; hC[(y * size + i) * 3 + 1] = g; hC[(y * size + i) * 3 + 2] = b; }
  const out = Buffer.alloc(size * size * 4);
  for (let v = 0; v < size; v++) for (let i = 0; i < size; i++) { let a = 0, r = 0, g = 0, b = 0;
    for (const {j, w} of rows[v]) { a += w * hA[j * size + i]; r += w * hC[(j * size + i) * 3]; g += w * hC[(j * size + i) * 3 + 1]; b += w * hC[(j * size + i) * 3 + 2]; }
    const k = (v * size + i) * 4; out[k + 3] = Math.floor((2 * a + total) / (2 * total));
    if (a > 0) { out[k] = Math.floor((2 * r + a) / (2 * a)); out[k + 1] = Math.floor((2 * g + a) / (2 * a)); out[k + 2] = Math.floor((2 * b + a) / (2 * a)); } }
  return {width: size, height: size, pixels: out};
}

const blobSha1 = (file) => createHash('sha1').update('blob ' + file.length + '\0').update(file).digest('hex');
function derive(name) {
  const file = readFileSync(join(dir, `nursery-v2-${name}.png`));
  if (blobSha1(file) !== OVERLAYS[name].sourceSha1) throw new Error(`nursery-v2-${name}.png is not the approved source`);
  return downscale(decodePng(file), OVERLAYS[name].size);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let failed = false;
  for (const name of Object.keys(OVERLAYS)) {
    const derived = derive(name), target = join(dir, derivedName(name));
    if (check) {
      const stored = decodePng(readFileSync(target)), same = stored.width === derived.width && stored.height === derived.height && stored.pixels.equals(derived.pixels);
      console.log(`${same ? 'ok     ' : 'DIFFERS'} ${derivedName(name)} ${derived.width}×${derived.height}`); if (!same) failed = true;
    } else { const png = encodePng(derived); writeFileSync(target, png); console.log(`wrote ${derivedName(name)} ${derived.width}×${derived.height} ${png.length} bytes, blob SHA-1 ${blobSha1(png)}`); }
  }
  if (failed) process.exitCode = 1;
}
