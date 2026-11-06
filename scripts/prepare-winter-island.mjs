// The Christmas island (concept noel-v1 C « Village de Noël », owner's choice of 4 November 2026): snowy versions of the nine
// painted island stages and of the meadow tile, aligned on the very same geometry as the normal ones.
//
// The snowy paintings are made with the image model outside the repository (output/imagegen/, ignored). A large stage is
// painted in several overlapping parts so that it stays as sharp as the original (the model paints about 1 500 px at most).
//   node scripts/prepare-winter-island.mjs parts "<folder>"    writes each part to paint: stage-<n>-p<i>.png (transparent),
//                                                              and parts.json (where each part sits in its stage)
//   (the image model paints each part as stage-<n>-p<i>-neige.png, same framing, on a flat magenta #FF00FF background,
//    and the meadow tile as grass-neige.png)
//   node scripts/prepare-winter-island.mjs compose "<folder>"  aligns every painted part on its original (small shift and
//                                                              scale search), blends the overlaps, keeps the original
//                                                              silhouette exactly, then writes assets-source/noel/island/
//   node scripts/derive-island-stages.mjs --winter             cuts the game tiles (public/assets/noel/island/)
import {mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import STAGES from '../src/config/islandStageArt.json' with {type: 'json'};
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

/** Largest side of a part, and the overlap between two neighbouring parts (pixels of the stage master). */
export const PART = {max: 1800, overlap: 160};
const SOURCE = n => `assets-source/island/stages/stage-${n}.png`;

/** The parts of a stage: a regular grid, each part at most PART.max wide/high; parts with nothing shown are left out. */
export function stageParts(n) {
  const {size: [w, h], tiles} = STAGES.stages[n - 1];
  const cols = Math.ceil((w - PART.overlap) / (PART.max - PART.overlap)), rows = Math.ceil((h - PART.overlap) / (PART.max - PART.overlap));
  const pw = Math.ceil((w + (cols - 1) * PART.overlap) / cols), ph = Math.ceil((h + (rows - 1) * PART.overlap) / rows), parts = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = Math.min(w - pw, c * (pw - PART.overlap)), y = Math.min(h - ph, r * (ph - PART.overlap));
    // Only where the game shows something: the shipped tiles (the lawn inside is the repeated meadow tile).
    if (tiles.some(t => t.x < x + pw && t.x + t.width > x && t.y < y + ph && t.y + t.height > y)) parts.push({name: `stage-${n}-p${parts.length}`, x, y, width: pw, height: ph});
  }
  return parts;
}

function cropImage(img, {x, y, width, height}) {
  const out = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++) img.pixels.copy(out, row * width * 4, ((y + row) * img.width + x) * 4, ((y + row) * img.width + x + width) * 4);
  return {width, height, pixels: out};
}
/** Bilinear colour of an image at a real position (clamped to its edges). */
function sample(img, fx, fy) {
  const x = Math.max(0, Math.min(img.width - 1.001, fx)), y = Math.max(0, Math.min(img.height - 1.001, fy));
  const x0 = Math.floor(x), y0 = Math.floor(y), ax = x - x0, ay = y - y0, out = [0, 0, 0, 0];
  for (const [dx, dy, k] of [[0, 0, (1 - ax) * (1 - ay)], [1, 0, ax * (1 - ay)], [0, 1, (1 - ax) * ay], [1, 1, ax * ay]]) {
    const i = ((y0 + dy) * img.width + x0 + dx) * 4;
    for (let c = 0; c < 4; c++) out[c] += img.pixels[i + c] * k;
  }
  return out;
}
const isMagenta = (r, g, b) => r > 170 && b > 170 && g < 120 && r - g > 80 && b - g > 80;
/** A pink fringe left by the magenta background on an edge (snow and stones are never pink). */
const isSpill = (r, g, b) => r - g > 55 && b - g > 45 && Math.abs(r - b) < 70;

/** Position of the painted part over its original: generated pixel for an original one, with shift (dx, dy) and scale s. */
const mapper = (part, painted, {dx, dy, s}) => (x, y) => [((x - part.width / 2) * s + part.width / 2 + dx) * painted.width / part.width, ((y - part.height / 2) * s + part.height / 2 + dy) * painted.height / part.height];
/** How well the painted silhouette covers the original one (intersection over union, sampled every `step` pixels). */
function overlap(original, part, painted, t, step) {
  const at = mapper(part, painted, t); let inter = 0, union = 0;
  for (let y = 0; y < part.height; y += step) for (let x = 0; x < part.width; x += step) {
    const a = original.pixels[((part.y + y) * original.width + part.x + x) * 4 + 3] > 128;
    const [gx, gy] = at(x, y), ix = Math.round(gx), iy = Math.round(gy);
    let b = false;
    if (ix >= 0 && iy >= 0 && ix < painted.width && iy < painted.height) { const i = (iy * painted.width + ix) * 4; b = !isMagenta(painted.pixels[i], painted.pixels[i + 1], painted.pixels[i + 2]); }
    if (a && b) inter++; if (a || b) union++;
  }
  return union ? inter / union : 0;
}
/** Coarse then fine search of the small shift and scale the image model introduced. */
export function align(original, part, painted) {
  let best = {dx: 0, dy: 0, s: 1, score: overlap(original, part, painted, {dx: 0, dy: 0, s: 1}, 6)};
  const search = (dxs, dys, ss, step) => { const centre = best;
    for (const s of ss) for (const dx of dxs) for (const dy of dys) {
      const t = {dx: centre.dx + dx, dy: centre.dy + dy, s: centre.s + s}, score = overlap(original, part, painted, t, step);
      if (score > best.score) best = {...t, score};
    } };
  const range = (n, k) => Array.from({length: 2 * n + 1}, (_, i) => (i - n) * k);
  search(range(8, 5), range(8, 5), range(4, .01), 6);
  search(range(4, 1.25), range(4, 1.25), range(2, .004), 3);
  return best;
}

/** A square tile that repeats without a visible seam: blended with its half-shifted copy towards the edges. */
export function seamless(img) {
  const {width: n} = img, out = Buffer.alloc(n * n * 4), half = n / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ex = Math.min(x, n - 1 - x) / half, ey = Math.min(y, n - 1 - y) / half, a = Math.min(1, Math.min(ex, ey) * 2.2);
    const k = a * a * (3 - 2 * a), i = (y * n + x) * 4, j = (((y + half) % n) * n + (x + half) % n) * 4;
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(img.pixels[i + c] * k + img.pixels[j + c] * (1 - k));
    out[i + 3] = 255;
  }
  return {width: n, height: n, pixels: out};
}
function resize(img, size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = sample(img, (x + .5) * img.width / size - .5, (y + .5) * img.height / size - .5), i = (y * size + x) * 4;
    out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255;
  }
  return {width: size, height: size, pixels: out};
}

export function writeParts(folder) {
  mkdirSync(folder, {recursive: true}); const all = {};
  for (let n = 1; n <= 9; n++) {
    const original = decodeRgbPng(readFileSync(SOURCE(n))); all[n] = stageParts(n);
    for (const part of all[n]) writeFileSync(`${folder}/${part.name}.png`, encodePng(cropImage(original, part)));
  }
  writeFileSync(`${folder}/parts.json`, JSON.stringify(all, null, 1));
  return all;
}

export function compose(folder) {
  mkdirSync('assets-source/noel/island', {recursive: true}); const report = {};
  for (let n = 1; n <= 9; n++) {
    const parts = stageParts(n), painted = parts.map(p => `${folder}/${p.name}-neige.png`);
    if (!painted.every(existsSync)) { report[n] = 'missing parts'; continue; }
    const original = decodeRgbPng(readFileSync(SOURCE(n))), {width: w, height: h} = original;
    const sum = new Float64Array(w * h * 3), weight = new Float64Array(w * h), scores = [];
    parts.forEach((part, k) => {
      const art = decodeRgbPng(readFileSync(painted[k])), t = align(original, part, art), at = mapper(part, art, t); scores.push(+t.score.toFixed(3));
      for (let y = 0; y < part.height; y++) for (let x = 0; x < part.width; x++) {
        const gi = (part.y + y) * w + part.x + x; if (original.pixels[gi * 4 + 3] === 0) continue;
        const [gx, gy] = at(x, y), c = sample(art, gx, gy);
        if (isMagenta(c[0], c[1], c[2]) || isSpill(c[0], c[1], c[2])) continue;
        // Feathered towards the inner edges of the part, so neighbouring parts blend over their overlap.
        const edge = Math.min(part.x ? x : PART.overlap, part.y ? y : PART.overlap, part.x + part.width < w ? part.width - 1 - x : PART.overlap, part.y + part.height < h ? part.height - 1 - y : PART.overlap);
        const k = Math.max(.001, Math.min(1, edge / PART.overlap));
        sum[gi * 3] += c[0] * k; sum[gi * 3 + 1] += c[1] * k; sum[gi * 3 + 2] += c[2] * k; weight[gi] += k;
      }
    });
    // The original silhouette, exactly; where the painting left a hole on the very edge, the original pixel stays.
    const out = Buffer.from(original.pixels);
    for (let i = 0; i < w * h; i++) if (weight[i] > 0) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(sum[i * 3 + c] / weight[i]);
    writeFileSync(`assets-source/noel/island/stage-${n}.png`, encodePng({width: w, height: h, pixels: out}));
    report[n] = scores;
  }
  if (existsSync(`${folder}/grass-neige.png`)) {
    writeFileSync('assets-source/noel/island/grass-tile.png', encodePng(seamless(resize(decodeRgbPng(readFileSync(`${folder}/grass-neige.png`)), 1024))));
    report.grass = 'ok';
  }
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [mode, folder] = process.argv.slice(2);
  if (!folder || !['parts', 'compose'].includes(mode)) throw Error('Usage: node scripts/prepare-winter-island.mjs parts|compose "<folder>"');
  console.log(JSON.stringify(mode === 'parts' ? Object.fromEntries(Object.entries(writeParts(folder)).map(([k, v]) => [k, v.map(p => p.name)])) : compose(folder)));
}
