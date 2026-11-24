// Fusion Nucléaire's night drawings (owner, 24 November 2026: « la forme allumée la nuit et le jour la forme éteinte »). His
// lit drawings are laid exactly over his day drawings: the lit master is scaled and moved so that its silhouette covers the day
// master's best (searched on reduced masks), then drawn at the size of the served day picture, on the same canvas. The meadow
// fades it in over the day picture as night falls. Each lit picture also gives its lights alone (`-glow`: its brightest points,
// the LEDs and the glints of the glass), added over the Christmas night shade so that the shade does not dim them.
// Its LEDs (owner, 24 November 2026: « vraiment des leds qui s'allument », like the lit enclosures) are found in each lit
// picture: the warm golden points brighter than their surroundings, away from the eye and the outline. Their places, in served
// picture pixels, go to src/config/fusionLeds.json; the meadow lights a little halo on each one at night.
//   node scripts/prepare-fusion-night.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const DIR = 'assets-source/rabbits/fusion-nucleaire', OUT = 'public/assets/rabbits/fusion-nucleaire';
const STAGES = [
  {day: `${DIR}/sprite.png`, night: `${DIR}/night-sprite.png`, served: `${OUT}/fusion-nucleaire-v1.png`, out: `${OUT}/fusion-nucleaire-v1-night.png`},
  {day: `${DIR}/fusion-nucleaire-evolution-sprite.png`, night: `${DIR}/evolution-night-sprite.png`, served: `${OUT}/fusion-nucleaire-v2.png`, out: `${OUT}/fusion-nucleaire-v2-night.png`},
];
const read = path => decodeRgbPng(readFileSync(path));
/** Most LEDs kept per drawing (the strongest), and their smallest spacing in served pixels. */
const MAX_LEDS = 44, LED_SPACING = 9;
/** Separable Gaussian blur of a single-channel picture. */
function blur(src, w, h, sigma) {
  const r = Math.ceil(sigma * 3), k = Array.from({length: 2 * r + 1}, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const sum = k.reduce((a, b) => a + b), tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let i = -r; i <= r; i++) v += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + r]; tmp[y * w + x] = v / sum; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let i = -r; i <= r; i++) v += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r]; out[y * w + x] = v / sum; }
  return out;
}
/** The LEDs of a lit picture: [x, y, strength 0 to 1], strongest first. */
function leds({width: w, height: h, pixels}) {
  const warm = new Float32Array(w * h), light = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2], a = pixels[i * 4 + 3] / 255;
    warm[i] = Math.max(0, (r + g) / 2 - b) * a; light[i] = (r + g + b) / 3 * a;
  }
  const near = blur(warm, w, h, 1), wide = blur(warm, w, h, 7), found = [];
  for (let y = 5; y < h - 5; y++) for (let x = 5; x < w - 5; x++) {
    const i = y * w + x, score = near[i] - wide[i];
    if (score <= 8 || pixels[i * 4 + 3] < 250 || light[i] < 180) continue;
    let peak = true, dark = false;
    for (let j = -4; j <= 4 && peak; j++) for (let k = -4; k <= 4; k++) {
      if (near[(y + j) * w + x + k] > near[i]) { peak = false; break; }
      if (Math.abs(j) <= 3 && Math.abs(k) <= 3 && light[(y + j) * w + x + k] < 110) dark = true;
    }
    if (peak && !dark) found.push([x, y, score]);
  }
  found.sort((a, b) => b[2] - a[2]);
  const kept = [];
  for (const led of found) if (kept.length < MAX_LEDS && kept.every(([x, y]) => (x - led[0]) ** 2 + (y - led[1]) ** 2 >= LED_SPACING ** 2)) kept.push(led);
  const top = kept[0]?.[2] ?? 1;
  return kept.map(([x, y, score]) => [x + .5, y + .5, Math.round(Math.min(1, score / top) * 100) / 100]);
}
const found = {};
const alpha = (img, x, y) => x < 0 || y < 0 || x >= img.width || y >= img.height ? 0 : img.pixels[(y * img.width + x) * 4 + 3];
/** Opaque mask reduced by `k` (mean alpha above one half). */
function mask(img, k) {
  const w = Math.ceil(img.width / k), h = Math.ceil(img.height / k), m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0, n = 0; for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) { sum += alpha(img, x * k + i, y * k + j); n++; }
    m[y * w + x] = sum / n > 128 ? 1 : 0;
  }
  return {w, h, m};
}
function box(m) {
  let x0 = m.w, y0 = m.h, x1 = -1, y1 = -1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.m[y * m.w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return {x0, y0, x1, y1};
}
/** Day master pixel = scale × night master pixel + (dx, dy): the best overlap of both silhouettes. */
function align(day, night) {
  const k = 4, a = mask(day, k), b = mask(night, k), ba = box(a), bb = box(b);
  const base = (ba.y1 - ba.y0) / (bb.y1 - bb.y0);
  let best = {iou: -1};
  for (let s = base * .96; s <= base * 1.04; s += base * .004) {
    const cx = (ba.x0 + ba.x1) / 2 - s * (bb.x0 + bb.x1) / 2, cy = ba.y1 - s * bb.y1;
    for (let oy = -4; oy <= 4; oy += .5) for (let ox = -4; ox <= 4; ox += .5) {
      const dx = cx + ox, dy = cy + oy; let inter = 0, union = 0;
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
        const nx = Math.round((x - dx) / s), ny = Math.round((y - dy) / s);
        const p = a.m[y * a.w + x], q = nx >= 0 && ny >= 0 && nx < b.w && ny < b.h ? b.m[ny * b.w + nx] : 0;
        if (p && q) inter++; if (p || q) union++;
      }
      if (inter / union > best.iou) best = {iou: inter / union, scale: s, dx: dx * k, dy: dy * k};
    }
  }
  return best;
}
/** Bilinear sample of premultiplied colour. */
function sample(img, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, out = [0, 0, 0, 0];
  for (const [i, j, w] of [[x0, y0, (1 - fx) * (1 - fy)], [x0 + 1, y0, fx * (1 - fy)], [x0, y0 + 1, (1 - fx) * fy], [x0 + 1, y0 + 1, fx * fy]]) {
    if (i < 0 || j < 0 || i >= img.width || j >= img.height || !w) continue;
    const at = (j * img.width + i) * 4, a = img.pixels[at + 3] / 255;
    out[0] += img.pixels[at] * a * w; out[1] += img.pixels[at + 1] * a * w; out[2] += img.pixels[at + 2] * a * w; out[3] += a * w;
  }
  return out;
}
for (const [index, stage] of STAGES.entries()) {
  const day = read(stage.day), night = read(stage.night), served = read(stage.served), fit = align(day, night);
  // Served pixel (u, v) covers day master pixels [u, u + 1) × day.width / served.width; 4 × 4 samples each.
  const kx = day.width / served.width, ky = day.height / served.height, n = 4, pixels = Buffer.alloc(served.width * served.height * 4);
  for (let v = 0; v < served.height; v++) for (let u = 0; u < served.width; u++) {
    const sum = [0, 0, 0, 0];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const dxm = (u + (i + .5) / n) * kx - .5, dym = (v + (j + .5) / n) * ky - .5, c = sample(night, (dxm - fit.dx) / fit.scale, (dym - fit.dy) / fit.scale);
      for (let c4 = 0; c4 < 4; c4++) sum[c4] += c[c4];
    }
    const a = sum[3] / (n * n), at = (v * served.width + u) * 4;
    if (a > 0) for (let c = 0; c < 3; c++) pixels[at + c] = Math.round(Math.min(255, sum[c] / sum[3]));
    pixels[at + 3] = Math.round(a * 255);
  }
  writeFileSync(stage.out, encodePng({width: served.width, height: served.height, pixels}));
  found[index ? 'evolved' : 'base'] = leds({width: served.width, height: served.height, pixels});
  const glow = Buffer.alloc(pixels.length);
  for (let at = 0; at < pixels.length; at += 4) {
    const light = .3 * pixels[at] + .55 * pixels[at + 1] + .15 * pixels[at + 2], keep = Math.max(0, Math.min(1, (light - 205) / 40));
    for (let c = 0; c < 3; c++) glow[at + c] = pixels[at + c];
    glow[at + 3] = Math.round(keep * pixels[at + 3]);
  }
  writeFileSync(stage.out.replace('-night.png', '-glow.png'), encodePng({width: served.width, height: served.height, pixels: glow}));
  console.log(stage.out, served.width + 'x' + served.height, 'overlap', fit.iou.toFixed(3), 'scale', fit.scale.toFixed(4), 'offset', fit.dx.toFixed(1), fit.dy.toFixed(1));
}
const text = JSON.stringify(found, null, 2).replace(/\[\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)\s+\]/g, '[$1, $2, $3]');
writeFileSync('src/config/fusionLeds.json', `${text}\n`);
console.log('LEDs', Object.entries(found).map(([key, list]) => `${key} ${list.length}`).join(', '));
