// Benny's painted meadow animations (Mythic rabbit, poses approved by the owner on 1 November 2026). Node built-ins only,
// plus an installed Playwright for the WebP encoding, like scripts/prepare-legendary-effects.mjs.
//
//   PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-benny-frames.mjs [--sources <folder>] [--board <file.png>]
//
// The sources (default output/imagegen/benny-enclos-final-v1, ignored by Git) are 900 × 900 paintings on pure white, all in one
// frame: Benny at the exact size of design A1, the ground line at y = 837, the hop's height already painted in.
// 1. Every painting is cut out of its white background (same flood fill and rim un-mixing as the approved sprite).
// 2. The 29 full poses kept (hop, flop, scratch, groom, stretch) are recoloured onto A1: they came back a little too orange and
//    with a lighter grey mask (owner's decision). The fur's colour statistics (CIELAB) are moved onto A1's, and the grey-brown
//    mask is darkened to A1's. The 8 face pictures (blink, nose, ears) are A1 outside their moving part and are left untouched.
// 3. Every picture is resampled on the pixel grid of the game sprite public/assets/rabbits/benny/benny-v1.png (same exact area
//    filter and same scale), inside one larger common frame: the rest pose lands on benny-v1.png pixel for pixel (checked).
// 4. Blink and nose are only small patches laid over the sprite; the other frames are whole bodies. Everything is trimmed and packed
//    into one WebP atlas (Phaser JSON hash with trim data, so every frame keeps the common frame and ground anchor).
// hop-8 and stretch-5 are not shipped: a hop or a stretch ends straight on the rest sprite A1 (owner's decision).
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut} from './prepare-rabbit-masters.mjs';
import {decodePng, encodePng} from './derive-nursery-overlays.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const argument = name => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : undefined; };
const SOURCES = argument('--sources') ?? 'output/imagegen/benny-enclos-final-v1';
const BOARD = argument('--board') ?? `${SOURCES}/recalage-couleurs.png`;
const TARGET = 'public/assets/rabbits/benny/frames', CONFIG = 'src/config/bennyFrames.json';
const SPRITE = 'public/assets/rabbits/benny/benny-v1.png', MASTER = 'assets-source/rabbits/benny/sprite.png';
/** World width of Benny (src/config/species.ts): converts picture pixels into meadow units for the shadow. */
const WORLD_WIDTH = 48;
/** Margins of the common frame around the sprite, in sprite pixels: room for the long flop and stretch, and the hop's top. */
export const PAD = {left: 106, top: 28, right: 66, bottom: 6};

/** face: untouched patch over the sprite; whole: untouched whole body; pose: recoloured whole body. */
export const FRAMES = [
  ...['blink-1', 'blink-2', 'nose-1', 'nose-2', 'nose-3'].map(name => ({name, kind: 'patch'})),
  ...['ears-1', 'ears-2', 'ears-3'].map(name => ({name, kind: 'whole'})),
  ...[...range('hop', 7), ...range('flop', 6), ...range('scratch', 6), ...range('groom', 6), ...range('stretch', 4)].map(name => ({name, kind: 'pose'})),
];
function range(name, count) { return Array.from({length: count}, (_, k) => `${name}-${k + 1}`); }

// ---------- colour ----------
const toLinear = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const toSrgb = c => { c = c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055; return Math.max(0, Math.min(255, Math.round(c * 255))); };
const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
const fInv = t => t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27);
function lab(r, g, b) {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b);
  const x = (.4124 * R + .3576 * G + .1805 * B) / .95047, y = .2126 * R + .7152 * G + .0722 * B, z = (.0193 * R + .1192 * G + .9505 * B) / 1.08883;
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function rgb(L, A, Bv) {
  const fy = (L + 16) / 116, x = fInv(fy + A / 500) * .95047, y = fInv(fy), z = fInv(fy - Bv / 200) * 1.08883;
  return [toSrgb(3.2406 * x - 1.5372 * y - .4986 * z), toSrgb(-.9689 * x + 1.8758 * y + .0415 * z), toSrgb(.0557 * x - .2040 * y + 1.0570 * z)];
}
const smoothstep = (low, high, v) => { const t = Math.max(0, Math.min(1, (v - low) / (high - low))); return t * t * (3 - 2 * t); };
/** Fur: the saturated golden fawn. Mask: the grey-brown of the muzzle, ear backs and shading (low chroma, neither white nor black). */
const furWeight = (L, C) => smoothstep(20, 30, C) * smoothstep(25, 35, L);
const maskWeight = (L, C) => (1 - smoothstep(16, 24, C)) * smoothstep(18, 26, L) * (1 - smoothstep(70, 78, L));
function stats({pixels}) {
  const sum = {fur: [0, 0, 0, 0, 0, 0, 0], mask: [0, 0, 0, 0]};
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 250) continue;
    const [L, A, B] = lab(pixels[i], pixels[i + 1], pixels[i + 2]), C = Math.hypot(A, B);
    if (furWeight(L, C) > .5) { const s = sum.fur; s[0]++; s[1] += L; s[2] += A; s[3] += B; s[4] += L * L; s[5] += A * A; s[6] += B * B; }
    if (maskWeight(L, C) > .5) { const s = sum.mask; s[0]++; s[1] += L; s[2] += A; s[3] += B; }
  }
  const [n, l, a, b, ll, aa, bb] = sum.fur, mean = [l / n, a / n, b / n], sd = [ll / n - mean[0] ** 2, aa / n - mean[1] ** 2, bb / n - mean[2] ** 2].map(Math.sqrt);
  const [m, ml, ma, mb] = sum.mask;
  return {fur: {mean, sd, count: n}, mask: {mean: [ml / m, ma / m, mb / m], count: m}};
}
/** Moves the fur's mean and spread (L, a, b) onto A1's, and the mask's lightness and tint onto A1's; whites and outlines keep theirs. */
export function recolour(image, reference) {
  const own = stats(image), {pixels} = image;
  const ratio = [0, 1, 2].map(k => Math.max(.8, Math.min(1.25, reference.fur.sd[k] / own.fur.sd[k])));
  const each = change => {
    for (let i = 0; i < pixels.length; i += 4) {
      if (!pixels[i + 3]) continue;
      const [L, A, B] = lab(pixels[i], pixels[i + 1], pixels[i + 2]), C = Math.hypot(A, B), out = change(L, A, B, C);
      if (out) [pixels[i], pixels[i + 1], pixels[i + 2]] = rgb(...out);
    }
  };
  // The fur: its mean and spread onto A1's, in proportion to how surely the pixel is fur.
  each((L, A, B, C) => {
    const wf = furWeight(L, C); if (wf <= 0) return null;
    return [L, A, B].map((v, k) => v + ((v - own.fur.mean[k]) * ratio[k] + reference.fur.mean[k] - v) * wf);
  });
  // The grey-brown mask: darkened and tinted towards A1's in a few passes (a darker pixel may leave or join the class).
  for (let pass = 0; pass < 4; pass++) {
    const current = stats(image), shift = [0, 1, 2].map(k => reference.mask.mean[k] - current.mask.mean[k]);
    if (Math.abs(shift[0]) < .5) break;
    each((L, A, B, C) => { const wm = maskWeight(L, C) * (1 - furWeight(L, C)); return wm > 0 ? [L, A, B].map((v, k) => v + shift[k] * wm) : null; });
  }
  return {before: own, after: stats(image)};
}

// ---------- geometry ----------
/** Sub-pixel steps of the alignment: the paintings place A1 on a quarter-pixel grid of the master. */
const STEP = 4;
/**
 * Where master pixel (0, 0) sits in the paintings, to a quarter of a pixel: the cut-out A1 reference is matched against the sprite
 * master (same scale) by bilinear sampling. The delivery placed A1 half a pixel off the master's grid, so whole pixels are not enough.
 */
function locate(reference, master) {
  const bbox = image => { let x0 = 1e9, y0 = 1e9; for (let i = 0; i < image.width * image.height; i++) if (image.pixels[i * 4 + 3] >= 16) { x0 = Math.min(x0, i % image.width); y0 = Math.min(y0, Math.floor(i / image.width)); } return [x0, y0]; };
  const [rx, ry] = bbox(reference), [mx, my] = bbox(master);
  const sample = (x, y, k) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, p = (u, v) => reference.pixels[(v * reference.width + u) * 4 + k];
    return p(x0, y0) * (1 - fx) * (1 - fy) + p(x0 + 1, y0) * fx * (1 - fy) + p(x0, y0 + 1) * (1 - fx) * fy + p(x0 + 1, y0 + 1) * fx * fy;
  };
  let best = null;
  for (let dy = -2 * STEP; dy <= 2 * STEP; dy++) for (let dx = -2 * STEP; dx <= 2 * STEP; dx++) {
    const ox = rx - mx + dx / STEP, oy = ry - my + dy / STEP; let error = 0, n = 0;
    for (let y = 0; y < master.height; y += 3) for (let x = 0; x < master.width; x += 3) {
      const m = (y * master.width + x) * 4;
      if (master.pixels[m + 3] < 255) continue;
      for (let k = 0; k < 3; k++) error += Math.abs(master.pixels[m + k] - sample(x + ox, y + oy, k)); n += 3;
    }
    if (!best || error / n < best.error) best = {x: ox, y: oy, error: error / n};
  }
  return best;
}
/**
 * Exact area-average resampling, on premultiplied colour, onto the sprite's own grid (sprite pixel i spans [i·SW/TW, (i+1)·SW/TW]
 * master pixels), extended by `PAD`: the arithmetic of scripts/resize-rgba.mjs, with the painting's sub-pixel offset, so A1 lands
 * on benny-v1.png. Units: 1/(STEP·TW) master pixel horizontally (1/(STEP·TH) vertically), all integers.
 */
function resample(image, origin, master, sprite, canvas) {
  const SW = master.width, SH = master.height, TW = sprite.width, TH = sprite.height, out = Buffer.alloc(canvas.width * canvas.height * 4);
  const spans = (count, pad, from, to, offset, limit) => Array.from({length: count}, (_, i) => {
    // Output i covers master [(i - pad)·from/to, (i - pad + 1)·from/to]; painting pixel s covers master [s - offset, s + 1 - offset].
    const lo = (i - pad) * from * STEP + Math.round(offset * STEP) * to, hi = lo + from * STEP, unit = to * STEP, list = [];
    for (let s = Math.floor(lo / unit); s * unit < hi; s++) { if (s < 0 || s >= limit) continue; const w = Math.min(hi, (s + 1) * unit) - Math.max(lo, s * unit); if (w > 0) list.push([s, w]); }
    return list;
  });
  const columns = spans(canvas.width, PAD.left, SW, TW, origin.x, image.width), rows = spans(canvas.height, PAD.top, SH, TH, origin.y, image.height);
  const area = SW * SH * STEP * STEP;
  for (let j = 0; j < canvas.height; j++) for (let i = 0; i < canvas.width; i++) {
    let a = 0, r = 0, g = 0, b = 0;
    for (const [sy, wy] of rows[j]) for (const [sx, wx] of columns[i]) {
      const k = (sy * image.width + sx) * 4, alpha = image.pixels[k + 3], weight = wx * wy;
      a += weight * alpha; r += weight * alpha * image.pixels[k]; g += weight * alpha * image.pixels[k + 1]; b += weight * alpha * image.pixels[k + 2];
    }
    const k = (j * canvas.width + i) * 4;
    out[k + 3] = Math.round(a / area);
    if (a) { out[k] = Math.round(r / a); out[k + 1] = Math.round(g / a); out[k + 2] = Math.round(b / a); }
  }
  return {width: canvas.width, height: canvas.height, pixels: out};
}
function bounds({width, height, pixels}, test = i => pixels[i * 4 + 3] > 0) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (test(y * width + x)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return x1 < 0 ? null : {x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1};
}
function crop({width, pixels}, {x, y, w, h}) {
  const out = Buffer.alloc(w * h * 4);
  for (let j = 0; j < h; j++) pixels.copy(out, j * w * 4, ((y + j) * width + x) * 4, ((y + j) * width + x + w) * 4);
  return {width: w, height: h, pixels: out};
}
/**
 * How well two same-size RGBA pictures overlay: silhouette overlap (alpha ≥ 128) at every shift of up to 2 pixels (the best must be
 * no shift at all), and the mean colour difference where both are opaque (the paintings were re-rendered, so the rim and a slight
 * softness differ a little).
 */
function compare(a, b) {
  const {width, height} = a, solid = (image, x, y) => x >= 0 && y >= 0 && x < width && y < height && image.pixels[(y * width + x) * 4 + 3] >= 128;
  const overlap = (dx, dy) => { let both = 0, either = 0; for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const p = solid(a, x + dx, y + dy), q = solid(b, x, y); both += p && q; either += p || q; } return both / either; };
  let best = {dx: 0, dy: 0, iou: overlap(0, 0)};
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const iou = overlap(dx, dy); if (iou > best.iou) best = {dx, dy, iou}; }
  let total = 0, n = 0;
  for (let i = 0; i < a.pixels.length; i += 4) if (a.pixels[i + 3] === 255 && b.pixels[i + 3] === 255) { for (let k = 0; k < 3; k++) total += Math.abs(a.pixels[i + k] - b.pixels[i + k]); n += 3; }
  return {silhouette: +overlap(0, 0).toFixed(4), bestShift: [best.dx, best.dy], colour: +(total / n).toFixed(3)};
}

// ---------- preparation ----------
const read = name => { const image = decodeRgbPng(readFileSync(`${SOURCES}/${name}.png`)); if (image.width !== 900 || image.height !== 900) throw Error(`${name}: 900 × 900 expected`); cutOut(image, 'light'); return image; };
if (!existsSync(`${SOURCES}/A1-reference.png`)) throw Error(`Missing ${SOURCES}/A1-reference.png: give the folder of the approved paintings with --sources`);
const master = decodePng(readFileSync(MASTER)), sprite = decodePng(readFileSync(SPRITE));
const canvas = {width: PAD.left + sprite.width + PAD.right, height: PAD.top + sprite.height + PAD.bottom};
const reference = read('A1-reference'), origin = locate(reference, master);
if (origin.error > 3) throw Error(`A1 reference does not match the sprite master (mean error ${origin.error.toFixed(2)})`);
const referenceStats = stats(reference);
const toCanvas = image => resample(image, origin, master, sprite, canvas);
const rest = toCanvas(reference);
const restCheck = compare(crop(rest, {x: PAD.left, y: PAD.top, w: sprite.width, h: sprite.height}), sprite);
if (restCheck.silhouette < .98 || restCheck.bestShift.some(Boolean) || restCheck.colour > 4) throw Error(`The rest pose does not overlay benny-v1.png: ${JSON.stringify(restCheck)}`);
/** Meadow units per sprite pixel. */
const unit = WORLD_WIDTH / sprite.width;
const restBox = bounds(rest, i => rest.pixels[i * 4 + 3] >= 128);
const prepared = [], board = [];
for (const frame of FRAMES) {
  const painting = read(frame.name);
  let colour = null;
  if (frame.kind === 'pose') {
    const before = toCanvas({...painting, pixels: Buffer.from(painting.pixels)});
    colour = recolour(painting, referenceStats);
    board.push({name: frame.name, before});
  }
  const image = toCanvas(painting);
  if (board.at(-1)?.name === frame.name) board.at(-1).after = image;
  let rect = bounds(image), kind = frame.kind;
  if (kind === 'patch') {
    // Only what differs from A1, with a margin of A1 itself; it must lie inside the opaque body so the sprite below never shows through.
    // A change that reaches the outline (the nose tip is on the profile) makes a whole body instead.
    const changed = bounds(image, i => { for (let k = 0; k < 4; k++) if (Math.abs(image.pixels[i * 4 + k] - rest.pixels[i * 4 + k]) > 2) return true; return false; });
    rect = {x: changed.x - 3, y: changed.y - 3, w: changed.w + 6, h: changed.h + 6};
    let inside = true;
    for (let y = rect.y; y < rect.y + rect.h; y++) for (let x = rect.x; x < rect.x + rect.w; x++)
      if (rest.pixels[(y * canvas.width + x) * 4 + 3] < 255 || image.pixels[(y * canvas.width + x) * 4 + 3] < 255) inside = false;
    if (!inside) { kind = 'whole'; rect = bounds(image); }
  }
  // Painted height above A1's paws (the hop), and the body's span and centre against A1's, for the shadow: in meadow units.
  const body = bounds(image, i => image.pixels[i * 4 + 3] >= 128);
  const lift = Math.max(0, (restBox.y + restBox.h) - (body.y + body.h)) * unit;
  prepared.push({...frame, kind, rect, image, colour, shadow: {lift: +lift.toFixed(2), width: +(body.w / restBox.w).toFixed(3), x: +((body.x + body.w / 2 - (restBox.x + restBox.w / 2)) * unit).toFixed(2)}});
}

// ---------- atlas ----------
const GAP = 2, MAX_WIDTH = 2048;
const order = [...prepared].sort((a, b) => b.rect.h - a.rect.h || a.name.localeCompare(b.name));
let x = 0, y = 0, shelf = 0, width = 0;
for (const frame of order) {
  if (x + frame.rect.w > MAX_WIDTH) { x = 0; y += shelf + GAP; shelf = 0; }
  frame.at = {x, y}; x += frame.rect.w + GAP; shelf = Math.max(shelf, frame.rect.h); width = Math.max(width, x - GAP);
}
const atlas = {width, height: y + shelf, pixels: null};
atlas.pixels = Buffer.alloc(atlas.width * atlas.height * 4);
for (const frame of prepared) {
  const piece = crop(frame.image, frame.rect);
  for (let j = 0; j < piece.height; j++) piece.pixels.copy(atlas.pixels, ((frame.at.y + j) * atlas.width + frame.at.x) * 4, j * piece.width * 4, (j + 1) * piece.width * 4);
}
// Fully transparent pixels carry no colour: the encoder never keeps hidden white.
for (let i = 3; i < atlas.pixels.length; i += 4) if (!atlas.pixels[i]) atlas.pixels[i - 3] = atlas.pixels[i - 2] = atlas.pixels[i - 1] = 0;

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch();
let webp;
try {
  const page = await browser.newPage();
  const encodeWebp = async (image, quality) => Buffer.from(await page.evaluate(async ({png, quality}) => {
    const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], {type: 'image/png'}), {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); canvas.getContext('2d').drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({type: 'image/webp', quality}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
    for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    return btoa(text);
  }, {png: encodePng(image).toString('base64'), quality}), 'base64');
  webp = await encodeWebp(atlas, .9);
  // The before/after board of the recolouring, for the owner (ignored folder): A1, then each pose before and after.
  if (board.length) {
    const url = image => `data:image/png;base64,${encodePng(image).toString('base64')}`;
    const figure = (image, caption, tone = '') => `<figure class="${tone}"><img src="${url(image)}"><figcaption>${caption}</figcaption></figure>`;
    const cells = board.map(entry => `<div class="pair">${figure(entry.before, `${entry.name} avant`)}${figure(entry.after, `${entry.name} après`, 'after')}</div>`).join('');
    await page.setViewportSize({width: 1700, height: 900});
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      body{margin:0;padding:20px;background:#fbf8f1;font:15px Georgia,serif;color:#4a3426}h1{font-size:26px;margin:0 0 4px}p{margin:0 0 14px}
      .grid{display:flex;flex-wrap:wrap;gap:10px}.pair{display:flex;gap:2px;background:#efe6d6;padding:4px;border-radius:8px}
      figure{margin:0;width:190px;text-align:center;background:#fff}figure.after{background:#fffdf6}img{width:190px;height:${Math.round(190 * canvas.height / canvas.width)}px;display:block}
      figcaption{font-size:13px;padding:2px 0 4px}.ref{display:flex;gap:16px;align-items:center;margin-bottom:14px}.ref figure{outline:2px solid #b89a6a}
    </style><h1>Benny — recalage des couleurs sur A1</h1>
    <p>Les 29 poses complètes : pelage ramené sur les couleurs de A1 (moins orangé), masque gris du museau assombri comme sur A1. Clignement, truffe et oreilles ne sont pas touchés.</p>
    <div class="ref">${figure(rest, 'A1 (référence)')}<p>Moyennes CIELAB du pelage de A1 : L ${referenceStats.fur.mean.map(v => v.toFixed(1)).join(' / ')} ; masque L ${referenceStats.mask.mean[0].toFixed(1)}.</p></div>
    <div class="grid">${cells}</div>`);
    writeFileSync(BOARD, await page.screenshot({fullPage: true}));
  }
} finally { await browser.close(); }

mkdirSync(TARGET, {recursive: true});
writeFileSync(`${TARGET}/benny-frames.webp`, webp);
const frames = {};
for (const frame of prepared) frames[frame.name] = {frame: {x: frame.at.x, y: frame.at.y, w: frame.rect.w, h: frame.rect.h}, rotated: false, trimmed: true,
  spriteSourceSize: {x: frame.rect.x, y: frame.rect.y, w: frame.rect.w, h: frame.rect.h}, sourceSize: {w: canvas.width, h: canvas.height}};
writeFileSync(`${TARGET}/benny-frames.json`, JSON.stringify({frames, meta: {image: 'benny-frames.webp', format: 'RGBA8888', size: {w: atlas.width, h: atlas.height}, scale: '1'}}, null, 1) + '\n');
const config = {
  note: 'Generated by scripts/prepare-benny-frames.mjs; do not edit by hand.',
  canvas: {width: canvas.width, height: canvas.height},
  /** Sprite (benny-v1.png) top-left corner in the common frame: the sprite's ground anchor (bottom centre) is at anchor. */
  sprite: {x: PAD.left, y: PAD.top, width: sprite.width, height: sprite.height},
  anchor: {x: PAD.left + sprite.width / 2, y: PAD.top + sprite.height},
  atlas: {width: atlas.width, height: atlas.height, bytes: webp.length, sha256: createHash('sha256').update(webp).digest('hex')},
  restCheck, origin: {x: origin.x, y: origin.y},
  frames: Object.fromEntries(prepared.map(frame => [frame.name, {kind: frame.kind, ...frame.shadow}])),
};
writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
console.log(`origin ${origin.x},${origin.y} (error ${origin.error.toFixed(2)}), rest vs benny-v1: ${JSON.stringify(restCheck)}`);
console.log(`atlas ${atlas.width}x${atlas.height}, ${webp.length} bytes`);
for (const frame of prepared) if (frame.colour) {
  const {before, after} = frame.colour, show = s => `fur L${s.fur.mean[0].toFixed(1)} a${s.fur.mean[1].toFixed(1)} b${s.fur.mean[2].toFixed(1)} mask L${s.mask.mean[0].toFixed(1)}`;
  console.log(`${frame.name}: ${show(before)} -> ${show(after)}`);
}
console.log(`A1: fur L${referenceStats.fur.mean.map(v => v.toFixed(1)).join(' ')} mask L${referenceStats.mask.mean[0].toFixed(1)}`);
