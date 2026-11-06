// The Christmas pictures (concepts noel-v1 chosen by the owner on 4 November 2026), painted with the image model outside the
// repository (output/imagegen/noel-production/items/, ignored), each on a flat magenta background:
// - b-<building>-neige.png, h-<habitat>-neige.png: the snowy copy of a meadow picture, same framing. It is aligned on the
//   original (small shift and scale search) and keeps the original silhouette exactly, so the game's anchors, taps and
//   footprints stay right; served under public/assets/noel/buildings|habitats/ at the original's name;
//   since 6 November 2026 also the islet of the Epics, Benny's perch and the debris (originals from scripts/prepare-noel-extras-art.mjs),
//   and the snow habitat level 3 and the nest repainted with lit lanterns, so they glow at night;
// - marche-neige.png: the market islet (its night lights are taken from it);
// - deco-<id>-neige.png: the eight Christmas decorations; snowman-3-neige.png: the finished snowman (its two first steps are cut from it);
// - icons-neige.png: a 4 × 2 sheet (candy cane, snowball, puff, snowflake, four presents); hotte, traineau, fond-cadeaux;
// - pieges-neige.png: a 4 × 1 sheet of the mini-game's traps (poisoned present, bomb) and of their splash and blast.
// Masters go to assets-source/noel/, served copies to public/assets/noel/; the list of snowy meadow pictures is written to
// src/config/winterBuildingFiles.json.
//   PLAYWRIGHT_MODULE=… node scripts/prepare-noel-art.mjs "<items folder>"
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut, crop} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import {align} from './prepare-winter-island.mjs';
import {encodeWebp} from './derive-island-stages.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const isMagenta = (r, g, b) => r > 150 && b > 150 && g < 130 && r - g > 70 && b - g > 70;
const isSpill = (r, g, b) => r - g > 55 && b - g > 45 && Math.abs(r - b) < 70;
const write = (path, bytes) => { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, bytes); };

/** Bilinear colour at a real position (clamped). */
function sample(img, fx, fy) {
  const x = Math.max(0, Math.min(img.width - 1.001, fx)), y = Math.max(0, Math.min(img.height - 1.001, fy));
  const x0 = Math.floor(x), y0 = Math.floor(y), ax = x - x0, ay = y - y0, out = [0, 0, 0, 0];
  for (const [dx, dy, k] of [[0, 0, (1 - ax) * (1 - ay)], [1, 0, ax * (1 - ay)], [0, 1, (1 - ax) * ay], [1, 1, ax * ay]]) {
    const i = ((y0 + dy) * img.width + x0 + dx) * 4;
    for (let c = 0; c < 4; c++) out[c] += img.pixels[i + c] * k;
  }
  return out;
}
/** Area-averaged resize with premultiplied alpha (any size, downscaling). */
export function resize(img, width, height) {
  const out = Buffer.alloc(width * height * 4), sx = img.width / width, sy = img.height / height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let a = 0, r = 0, g = 0, b = 0, n = 0;
    const x0 = x * sx, x1 = (x + 1) * sx, y0 = y * sy, y1 = (y + 1) * sy;
    for (let v = Math.floor(y0); v < Math.ceil(y1); v++) for (let u = Math.floor(x0); u < Math.ceil(x1); u++) {
      const w = (Math.min(u + 1, x1) - Math.max(u, x0)) * (Math.min(v + 1, y1) - Math.max(v, y0)); if (w <= 0) continue;
      const i = (Math.min(img.height - 1, v) * img.width + Math.min(img.width - 1, u)) * 4, al = img.pixels[i + 3];
      a += w * al; r += w * al * img.pixels[i]; g += w * al * img.pixels[i + 1]; b += w * al * img.pixels[i + 2]; n += w;
    }
    const k = (y * width + x) * 4; out[k + 3] = Math.round(a / n);
    if (a > 0) { out[k] = Math.round(r / a); out[k + 1] = Math.round(g / a); out[k + 2] = Math.round(b / a); }
  }
  return {width, height, pixels: out};
}
const fit = (img, max) => { const s = Math.min(1, max / Math.max(img.width, img.height)); return s >= 1 ? img : resize(img, Math.max(1, Math.round(img.width * s)), Math.max(1, Math.round(img.height * s))); };

/** Removes the magenta background: from the edges, then any enclosed magenta, then the pink fringe. */
export function keyMagenta(img) {
  const copy = {width: img.width, height: img.height, pixels: Buffer.from(img.pixels)};
  cutOut(copy, 'corner');
  const p = copy.pixels;
  for (let i = 0; i < copy.width * copy.height; i++) {
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
    // Enclosed background (between a reindeer's legs…): only a near-pure magenta, so a purple present keeps its colour.
    if (r > 215 && b > 215 && g < 60) p[i * 4 + 3] = 0;
    else if (p[i * 4 + 3] && isSpill(r, g, b)) { const m = Math.round((r + b) / 2 * .5 + g * .5); p[i * 4] = Math.min(r, m + 20); p[i * 4 + 2] = Math.min(b, m + 20); p[i * 4 + 3] = Math.round(p[i * 4 + 3] * .6); }
  }
  return copy;
}
const cropTo = (img, box) => {
  const out = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y++) img.pixels.copy(out, y * box.width * 4, ((box.y + y) * img.width + box.x) * 4, ((box.y + y) * img.width + box.x + box.width) * 4);
  return {width: box.width, height: box.height, pixels: out};
};
/** Bounding box of the opaque pixels of several same-size images, with a small margin. */
function opaqueBox(images, margin = 4) {
  const {width: w, height: h} = images[0]; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (const img of images) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (img.pixels[(y * w + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.max(0, x0 - margin); y0 = Math.max(0, y0 - margin); x1 = Math.min(w - 1, x1 + margin); y1 = Math.min(h - 1, y1 + margin);
  return {x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1};
}

/** The snowy copy of a meadow picture, exactly on the original's silhouette. */
export function winterCopy(original, painted) {
  const part = {x: 0, y: 0, width: original.width, height: original.height}, t = align(original, part, painted);
  const out = Buffer.from(original.pixels), {width: w, height: h} = original;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (!original.pixels[i + 3]) continue;
    const gx = ((x - w / 2) * t.s + w / 2 + t.dx) * painted.width / w, gy = ((y - h / 2) * t.s + h / 2 + t.dy) * painted.height / h, c = sample(painted, gx, gy);
    if (isMagenta(c[0], c[1], c[2]) || isSpill(c[0], c[1], c[2])) continue;
    out[i] = Math.round(c[0]); out[i + 1] = Math.round(c[1]); out[i + 2] = Math.round(c[2]);
  }
  return {image: {width: w, height: h, pixels: out}, score: +t.score.toFixed(3)};
}

/** The picture centred in a transparent square, resized to size × size. */
function squareOf(img, size) {
  const s = Math.max(img.width, img.height), pad = Buffer.alloc(s * s * 4), ox = (s - img.width) >> 1, oy = (s - img.height) >> 1;
  for (let y = 0; y < img.height; y++) img.pixels.copy(pad, ((oy + y) * s + ox) * 4, y * img.width * 4, (y + 1) * img.width * 4);
  return resize({width: s, height: s, pixels: pad}, size, size);
}
const LOOSE_FRAMING = new Set(['b-debris-rocher', 'b-debris-herbes', 'b-debris-buisson', 'b-perchoir-benny']);
export async function prepareNoelArt(folder) {
  const report = {}, served = [], webp = [], winterFiles = [];
  const painted = name => existsSync(`${folder}/${name}-neige.png`) ? decodeRgbPng(readFileSync(`${folder}/${name}-neige.png`)) : null;
  // Snowy buildings and habitats.
  for (const file of readdirSync(folder).filter(f => /^[bh]-.*\.png$/.test(f) && !f.endsWith('-neige.png'))) {
    const name = file.slice(0, -4), art = painted(name); if (!art) continue;
    const kind = file.startsWith('b-') ? 'buildings' : 'habitats', base = name.slice(2) + '.png';
    const original = decodeRgbPng(readFileSync(`public/assets/${kind}/${base}`)), copy = winterCopy(original, art), {score} = copy;
    let {image} = copy;
    report[name] = score;
    // A small object whose snowy painting moved a little (debris, Benny's perch, 6 November 2026): its painted framing is kept,
    // its opaque box stretched on the original's (both are cropped on their opaque pixels), so its anchor stays close.
    if (score < .9 && LOOSE_FRAMING.has(name)) { image = resize(crop(keyMagenta(art)), original.width, original.height); report[name] = `${score} (painted framing kept)`; }
    else if (score < .9) { report[name] = `${score} (rejected: does not match the original)`; continue; }
    write(`assets-source/noel/${kind}/${base}`, encodePng(image)); served.push([`public/assets/noel/${kind}/${base}`, image]);
    winterFiles.push(`${kind}/${base}`);
  }
  // The market islet, day and night lights (same crop).
  const day = painted('marche');
  if (day) {
    const keyed = keyMagenta(day), box = opaqueBox([keyed]), img = fit(cropTo(keyed, box), 1024);
    write('assets-source/noel/marche.png', encodePng(cropTo(keyed, box))); served.push(['public/assets/noel/marche.png', img]);
    report.marche = [img.width, img.height];
    {
      // The lights by night, taken from the day painting itself (to spare the image model): its warm, bright pixels (bulbs,
      // lit windows, lanterns, the tree's star) on black, softly spread so they glow; drawn added over the night shade.
      const {width: w, height: h} = day, glow = new Float32Array(w * h * 3);
      for (let i = 0; i < w * h; i++) {
        const r = day.pixels[i * 4], g = day.pixels[i * 4 + 1], b = day.pixels[i * 4 + 2];
        if (keyed.pixels[i * 4 + 3] < 128 || !(r > 225 && g > 165 && b < 170 && r - b > 85)) continue;
        glow[i * 3] = r; glow[i * 3 + 1] = g; glow[i * 3 + 2] = b * .8;
      }
      const blur = (src, radius) => { const out = new Float32Array(src.length);
        for (let pass = 0; pass < 2; pass++) { const a = pass ? out.slice() : src, horizontal = !pass;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let sum = [0, 0, 0], n = 0;
            for (let d = -radius; d <= radius; d += 2) { const u = horizontal ? x + d : x, v = horizontal ? y : y + d; if (u < 0 || v < 0 || u >= w || v >= h) continue; const j = (v * w + u) * 3; sum[0] += a[j]; sum[1] += a[j + 1]; sum[2] += a[j + 2]; n++; }
            const j = (y * w + x) * 3; out[j] = sum[0] / n; out[j + 1] = sum[1] / n; out[j + 2] = sum[2] / n; } }
        return out; };
      const halo = blur(glow, 14), p = Buffer.alloc(w * h * 4);
      for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) p[i * 4 + c] = Math.min(255, Math.round(glow[i * 3 + c] * .9 + halo[i * 3 + c] * 2.2)), p[i * 4 + 3] = 255;
      const lights = fit(cropTo({width: w, height: h, pixels: p}, box), 1024);
      served.push(['public/assets/noel/marche-nuit.png', lights]); report['marche-nuit'] = 'ok';
    }
  }
  // Decorations.
  for (const file of readdirSync(folder).filter(f => /^deco-.*-neige\.png$/.test(f))) {
    const id = file.slice(5, -'-neige.png'.length), keyed = keyMagenta(decodeRgbPng(readFileSync(`${folder}/${file}`)));
    const master = crop(keyed); write(`assets-source/noel/decorations/${id}.png`, encodePng(master));
    const img = fit(master, 320); served.push([`public/assets/noel/decorations/${id}.png`, img]); report[`deco-${id}`] = [img.width, img.height];
  }
  // The snowman's three steps, one shared crop so they stay in place.
  // Only the finished snowman is painted (to spare the image model): steps 1 and 2 are its lower part, the rows above
  // being left out, so it grows from the snow in the same place.
  const snowman = painted('snowman-3');
  if (snowman) {
    const done = fit(crop(keyMagenta(snowman)), 256);
    [.34, .7, 1].forEach((share, i) => {
      const img = {width: done.width, height: done.height, pixels: Buffer.from(done.pixels)}, cut = Math.round(done.height * (1 - share)), soft = 6;
      for (let y = 0; y < Math.min(done.height, cut + soft); y++) for (let x = 0; x < done.width; x++) {
        const k = (y * done.width + x) * 4; img.pixels[k + 3] = y < cut ? 0 : Math.round(img.pixels[k + 3] * (y - cut) / soft);
      }
      served.push([`public/assets/noel/bonhomme-${i + 1}.png`, img]);
    });
    report.bonhomme = [done.width, done.height];
  }
  // The sheet of small pictures: 4 columns × 2 rows.
  const sheet = painted('icons');
  if (sheet) {
    const keyed = keyMagenta(sheet), cw = Math.floor(sheet.width / 4), ch = Math.floor(sheet.height / 2);
    const cell = (c, r) => crop(cropTo(keyed, {x: c * cw, y: r * ch, width: cw, height: ch}));
    const square = squareOf;
    served.push(['public/assets/noel/sucre-orge.png', square(cell(0, 0), 64)], ['public/assets/noel/boule-neige.png', square(cell(1, 0), 64)],
      ['public/assets/noel/boule-impact.png', square(cell(2, 0), 128)]);
    // The four flakes: the painted flake turned and mirrored, so the fall is not made of one identical shape.
    const flake = square(cell(3, 0), 32);
    for (let i = 0; i < 4; i++) {
      const out = Buffer.alloc(32 * 32 * 4);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const [u, v] = [[x, y], [31 - y, x], [31 - x, y], [y, 31 - x]][i];
        flake.pixels.copy(out, (y * 32 + x) * 4, (v * 32 + u) * 4, (v * 32 + u) * 4 + 4);
      }
      served.push([`public/assets/noel/flocon-${i}.png`, {width: 32, height: 32, pixels: out}]);
    }
    for (let i = 0; i < 4; i++) served.push([`public/assets/noel/minijeu/cadeau-${i}.png`, square(cell(i, 1), 128)]);
    report.icons = 'ok';
  }
  // The traps of « Les cadeaux du ciel » (owner, 5 November 2026): 4 columns × 1 row.
  const traps = painted('pieges');
  if (traps) {
    const keyed = keyMagenta(traps), cw = Math.floor(traps.width / 4);
    const cell = c => crop(cropTo(keyed, {x: c * cw, y: 0, width: cw, height: traps.height}));
    for (const [c, name] of [[0, 'piege-poison'], [1, 'piege-bombe'], [2, 'effet-poison'], [3, 'effet-boum']]) served.push([`public/assets/noel/minijeu/${name}.png`, squareOf(cell(c), c < 2 ? 128 : 192)]);
    report.pieges = 'ok';
  }
  for (const [name, max] of [['hotte', 384], ['traineau', 640]]) {
    const art = painted(name); if (!art) continue;
    const img = fit(crop(keyMagenta(art)), max); served.push([`public/assets/noel/minijeu/${name}.png`, img]); report[name] = [img.width, img.height];
  }
  const backdrop = painted('fond-cadeaux');
  if (backdrop) {
    const img = fit({...backdrop, pixels: Buffer.from(backdrop.pixels)}, 1600);
    for (let i = 3; i < img.pixels.length; i += 4) img.pixels[i] = 255;
    webp.push({name: 'public/assets/noel/minijeu/fond.webp', ...img}); report['fond-cadeaux'] = [img.width, img.height];
  }
  for (const [path, img] of served) write(path, encodePng(img));
  if (webp.length) for (const [name, bytes] of await encodeWebp(webp)) write(name, bytes);
  writeFileSync('src/config/winterBuildingFiles.json', JSON.stringify(winterFiles.sort(), null, 1) + '\n');
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-noel-art.mjs "<items folder>"');
  console.log(JSON.stringify(await prepareNoelArt(folder)));
}
