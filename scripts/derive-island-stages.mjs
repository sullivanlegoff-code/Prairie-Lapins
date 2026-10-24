// Node built-ins only. Derives the nine painted island stages and the grass tile.
// Each master (assets-source/island/stages/stage-<n>.png, 1.5 px per screen-world unit, aligned on the stage canvas)
// keeps its rim, cliff and underside; inside the playable grass its alpha fades from 8 to 40 units in, so the
// painted lawn melts into the game's grass tile. Results are cut into 500 px tiles (not a power of two: clamped,
// never wrapped, so no seam); fully transparent tiles are dropped.
// --check re-derives everything in memory and fails on any missing or different byte.
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, dirname, join} from 'node:path';
import {inflateSync} from 'node:zlib';

/** Decodes an 8-bit non-interlaced RGB or RGBA PNG to RGBA (RGB becomes opaque). */
function decodePng(file) {
  let width = 0, height = 0, channels = 0; const parts = [];
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at), type = file.toString('latin1', at + 4, at + 8), data = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
      if (data[8] !== 8 || !channels || data[12] !== 0) throw Error('Only 8-bit RGB or RGBA, non-interlaced PNGs are supported');
    }
    if (type === 'IDAT') parts.push(data);
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(parts)), stride = width * channels, rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = rows.subarray(y * stride, (y + 1) * stride), up = y ? rows.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0, b = up ? up[x] : 0, c = up && x >= channels ? up[x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a; else if (filter === 2) predictor = b; else if (filter === 3) predictor = (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[x] = (line[x] + predictor) & 255;
    }
  }
  if (channels === 4) return {width, height, pixels: rows};
  const pixels = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < width * height; i++) rows.copy(pixels, i * 4, i * 3, i * 3 + 3);
  return {width, height, pixels};
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = join(root, 'assets-source/island/stages'), TARGET = join(root, 'public/assets/island/stages');
const MANIFEST = join(root, 'src/config/islandStageArt.json');
// Same values as src/config/islandGeometry.ts, src/config/visual.ts and src/config/islandStages.ts (checked by tests).
const ORIGIN = 120, PARCEL_W = 704, PARCEL_D = 592, Q = .78, PIVOT_Y = ORIGIN + 12 * 148 / 2;
export const PX_PER_UNIT = 1.5, TILE = 500, FADE = {opaque: 8, clear: 40}, MARGIN = {left: 96, right: 96, top: 96, bottom: 580};
export const GRASS = {source: 'grass-tile.png', file: 'grass-tile.webp', size: 1024, worldUnits: 352};
const WEBP_QUALITY = .86;
export const ORDER = ['southwest', 'south', 'west', 'center', 'southeast', 'east', 'northwest', 'north', 'northeast'];
const CELL = {northwest: [0, 0], north: [1, 0], northeast: [2, 0], west: [0, 1], center: [1, 1], east: [2, 1], southwest: [0, 2], south: [1, 2], southeast: [2, 2]};
const sy = y => PIVOT_Y + Q * (y - PIVOT_Y);
const sha1 = buffer => createHash('sha1').update(buffer).digest('hex');
const round = v => Math.round(v * 1000) / 1000;

export function stageGeometry(n) {
  const parcels = ORDER.slice(0, n);
  const rects = parcels.map(id => {const [c, r] = CELL[id]; return {left: ORIGIN + PARCEL_W * c, right: ORIGIN + PARCEL_W * (c + 1), top: round(sy(ORIGIN + PARCEL_D * r)), bottom: round(sy(ORIGIN + PARCEL_D * (r + 1)))};});
  const left = Math.min(...rects.map(r => r.left)) - MARGIN.left, top = round(Math.min(...rects.map(r => r.top)) - MARGIN.top);
  const right = Math.max(...rects.map(r => r.right)) + MARGIN.right, bottom = round(Math.max(...rects.map(r => r.bottom)) + MARGIN.bottom);
  const width = round(right - left), height = round(bottom - top);
  return {parcels, rects, canvas: {left, top, width, height}, size: [Math.round(Math.round(width) * PX_PER_UNIT), Math.round(Math.round(height) * PX_PER_UNIT)]};
}

/** Distance (in screen-world units) from each pixel inside the playable union to the nearest pixel outside it; -1 outside. */
function insideDistance(geometry) {
  const [w, h] = geometry.size, {canvas, rects} = geometry, inside = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ux = canvas.left + (x + .5) / PX_PER_UNIT, uy = canvas.top + (y + .5) / PX_PER_UNIT;
    if (rects.some(r => ux >= r.left && ux < r.right && uy >= r.top && uy < r.bottom)) inside[y * w + x] = 1;
  }
  // Two-pass chamfer (3, 4) transform: within about 8 % of the Euclidean distance, ample for a soft fade.
  const big = 1e9, d = new Float64Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = inside[i] ? big : 0;
  const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4); }
  const out = new Float64Array(w * h);
  for (let i = 0; i < d.length; i++) out[i] = inside[i] ? d[i] / 3 / PX_PER_UNIT : -1;
  return out;
}

function deriveStage(n) {
  const geometry = stageGeometry(n), file = join(SOURCES, `stage-${n}.png`);
  if (!existsSync(file)) throw Error(`Missing source ${file}`);
  const bytes = readFileSync(file), master = decodePng(bytes), [w, h] = geometry.size;
  if (master.width !== w || master.height !== h) throw Error(`stage-${n}.png is ${master.width}x${master.height}, expected ${w}x${h}`);
  const distance = insideDistance(geometry), pixels = Buffer.from(master.pixels);
  // Preserve connected rim features, including their green contours. Isolated yellow lawn tips
  // must not survive the fade as bright specks. Flood from the exterior through stone/olive pixels.
  const feature = new Uint8Array(w * h), queue = new Int32Array(w * h); let head = 0, tail = 0;
  const isFeature = i => {
    const p = i * 4;
    return master.pixels[p + 3] > 100 && (master.pixels[p + 1] <= master.pixels[p] * 1.25 || master.pixels[p + 1] <= master.pixels[p + 2] * 1.5);
  };
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    // Pale limestone can be detached from the rim (small stones sitting in the lawn).
    const stone = master.pixels[p] > master.pixels[p + 1] * .95 && master.pixels[p + 2] > master.pixels[p + 1] * .65;
    if (distance[i] < 48 && (distance[i] < 0 || stone) && isFeature(i)) {feature[i] = 1; queue[tail++] = i;}
  }
  while (head < tail) {
    const i = queue[head++];
    for (const j of [i % w ? i - 1 : -1, i % w < w - 1 ? i + 1 : -1, i - w, i + w])
      if (j >= 0 && j < w * h && !feature[j] && distance[j] < 48 && isFeature(j)) {feature[j] = 1; queue[tail++] = j;}
  }
  // Feather the six-pixel contour instead of retaining a hard emerald outline around stones.
  const protectedRim = new Float32Array(feature);
  for (let i = 0; i < w * h; i++) if (feature[i] && distance[i] >= -4 && distance[i] < 48) {
    const x = i % w, y = Math.floor(i / w);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++)
      if (dx * dx + dy * dy <= 36 && x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) {
        const j = (y + dy) * w + x + dx;
        protectedRim[j] = Math.max(protectedRim[j], 1 - Math.sqrt(dx * dx + dy * dy) / 7);
      }
  }
  for (let i = 0; i < w * h; i++) {
    const dist = distance[i];
    if (dist < 0) continue; // Never touch the exterior rim, ivy, cliff or underside.
    const at = i * 4, r = pixels[at], g = pixels[at + 1], b = pixels[at + 2];
    if (feature[i]) continue;
    {
      // Compress blade contrast into B's warm meadow palette; keep a little taller turf at the stones.
      const light = .2126 * r + .7152 * g + .0722 * b;
      pixels[at] = Math.round(151 + (light - 130) * .24);
      pixels[at + 1] = Math.round(177 + (light - 130) * .28);
      pixels[at + 2] = Math.round(91 + (light - 130) * .18);
    }
    if (dist < FADE.opaque) continue;
    const keep = Math.max(protectedRim[i], dist >= FADE.clear ? 0 : 1 - (dist - FADE.opaque) / (FADE.clear - FADE.opaque));
    pixels[i * 4 + 3] = Math.round(pixels[i * 4 + 3] * keep);
  }
  const tiles = [], outputs = [];
  for (let ty = 0; ty < h; ty += TILE) for (let tx = 0; tx < w; tx += TILE) {
    const tw = Math.min(TILE, w - tx), th = Math.min(TILE, h - ty), tile = Buffer.alloc(tw * th * 4);
    let any = false;
    for (let y = 0; y < th; y++) { pixels.copy(tile, y * tw * 4, ((ty + y) * w + tx) * 4, ((ty + y) * w + tx + tw) * 4);
      if (!any) for (let x = 0; x < tw; x++) if (tile[(y * tw + x) * 4 + 3]) { any = true; break; } }
    if (!any) continue;
    const name = `stage-${n}-${ty / TILE}-${tx / TILE}.webp`;
    outputs.push({name, width: tw, height: th, pixels: tile});
    tiles.push({file: name, x: tx, y: ty, width: tw, height: th});
  }
  return {entry: {stage: n, parcels: geometry.parcels, canvas: geometry.canvas, size: geometry.size, source: sha1(bytes), tiles}, outputs};
}

function deriveGrass() {
  const file = join(SOURCES, GRASS.source); if (!existsSync(file)) throw Error(`Missing source ${file}`);
  const bytes = readFileSync(file), img = decodePng(bytes);
  if (img.width !== GRASS.size || img.height !== GRASS.size) throw Error(`${GRASS.source} must be ${GRASS.size}x${GRASS.size}`);
  for (let i = 3; i < img.pixels.length; i += 4) if (img.pixels[i] !== 255) throw Error(`${GRASS.source} must be fully opaque`);
  return {entry: {file: GRASS.file, size: GRASS.size, worldUnits: GRASS.worldUnits, source: sha1(bytes)}, outputs: [{name: GRASS.file, ...img}]};
}

/**
 * Lossy WebP with alpha, encoded by Chromium (Playwright): the painted tiles weigh about a tenth of their PNG.
 * PLAYWRIGHT_MODULE may point to a playwright installation, as for the docs/*-check.cjs scripts.
 */
async function encodeWebp(outputs) {
  const {createRequire} = await import('node:module');
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch(), page = await browser.newPage(), encoded = new Map();
  try {
    for (const o of outputs) {
      const base64 = await page.evaluate(async ({width, height, data, quality}) => {
        const bytes = Uint8ClampedArray.from(atob(data), c => c.charCodeAt(0)), canvas = new OffscreenCanvas(width, height);
        canvas.getContext('2d').putImageData(new ImageData(bytes, width, height), 0, 0);
        const blob = await canvas.convertToBlob({type: 'image/webp', quality});
        const buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
        for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
        return btoa(text);
      }, {width: o.width, height: o.height, data: o.pixels.toString('base64'), quality: WEBP_QUALITY});
      encoded.set(o.name, Buffer.from(base64, 'base64'));
    }
  } finally { await browser.close(); }
  return encoded;
}

export async function deriveIslandStages({check = false} = {}) {
  const grass = deriveGrass(), stages = ORDER.map((_, i) => deriveStage(i + 1));
  const outputs = [grass, ...stages].flatMap(s => s.outputs);
  const layout = {pxPerUnit: PX_PER_UNIT, tile: TILE, fade: FADE, margin: MARGIN, grass: grass.entry, stages: stages.map(s => s.entry)};
  if (check) {
    // Encoding is lossy and browser-made: check the sources, the layout, and the integrity of every shipped file.
    const problems = [], stored = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;
    if (!stored) problems.push('src/config/islandStageArt.json is missing');
    else {
      const {files, ...rest} = stored;
      if (JSON.stringify(rest) !== JSON.stringify(layout)) problems.push('src/config/islandStageArt.json does not match the sources');
      for (const {name} of outputs) { const target = join(TARGET, name);
        if (!existsSync(target) || sha1(readFileSync(target)) !== files?.[name]) problems.push(`${name} missing or altered`); }
      if (Object.keys(files ?? {}).length !== outputs.length) problems.push('Unexpected file list');
    }
    const expected = new Set(outputs.map(o => o.name));
    if (existsSync(TARGET)) for (const name of readdirSync(TARGET)) if (!expected.has(name)) problems.push(`${name} is not a derivative`);
    if (problems.length) throw Error('Island stages check failed:\n' + problems.join('\n'));
    return {checked: outputs.length};
  }
  const encoded = await encodeWebp(outputs), files = {};
  if (existsSync(TARGET)) rmSync(TARGET, {recursive: true});
  mkdirSync(TARGET, {recursive: true});
  for (const [name, bytes] of encoded) { writeFileSync(join(TARGET, name), bytes); files[name] = sha1(bytes); }
  writeFileSync(MANIFEST, JSON.stringify({...layout, files}, null, 2) + '\n');
  const diskBytes = [...encoded.values()].reduce((sum, b) => sum + b.length, 0);
  const stageDisk = stages.map(s => s.entry.tiles.reduce((sum, t) => sum + encoded.get(t.file).length, 0));
  const gpuBytes = layout.stages.map(s => s.tiles.reduce((sum, t) => sum + t.width * t.height * 4, 0));
  return {diskBytes, stageDisk, grassGpuBytes: GRASS.size ** 2 * 4, maxStageGpuBytes: Math.max(...gpuBytes), tiles: layout.stages.map(s => s.tiles.length)};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await deriveIslandStages({check: process.argv.includes('--check')})));
