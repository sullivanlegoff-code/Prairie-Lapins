// Benny's flight over the island (Mythic rabbit; paintings approved by the owner on 1 November 2026). Node built-ins only, plus an
// installed Playwright for the WebP encoding and the check board, like scripts/prepare-benny-frames.mjs.
//
//   PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-benny-flight.mjs [--sources <folder>] [--back-sources <folder>]
//     [--reference <A1-reference.png>]
//
// The sources (default output/imagegen/benny-vol-final-v1, ignored by Git) are drawn in layers:
// - 8 bodies without wings, 900 × 900 on pure white, at the scale of design A1 (profile, three-quarter front, face, back;
//   -1 and -2 only differ by the paws). The left profile is the mirror of the right one, at run time.
// - The back (the owner's concept B, 1 November 2026) has its own folder (default output/imagegen/benny-vol-dos-final-v1), laid out
//   the same way (bodies, wings/transparent, wings/anchors.json). Seen a little from above, it also serves both diagonals going away,
//   leaned by the game: the three-quarter back is no longer shipped.
// - wings already cut out (wings/transparent), 1200 × 1200, the shoulder (wing root) at the exact centre (600, 600); 8 beat
//   pictures per series, plus the profile's appearance and disappearance. wings/anchors.json gives each body's shoulders.
// 1. Bodies are cut out of their white background (the same flood fill and rim un-mixing as the approved sprite and meadow poses).
// 2. Their fur and grey mask are measured against A1 (CIELAB, scripts/benny-colour.mjs) and every body is recoloured onto A1: they drift
//    by up to 5 (fur) and 8.5 (mask) units, unevenly, and a pair -1 / -2 must never change colour when it alternates.
// 3. Every picture is reduced by the exact area filter to SCALE (bodies 900 → 360, wings 1200 → 480), trimmed, and packed into one
//    WebP atlas (Phaser JSON hash with trim data, so every frame keeps its full square and its centre: the body centre, the shoulder).
// 4. Duplicates are not shipped: the face's and back's right wings are the exact mirrors of the left ones (checked, drawn mirrored),
//    the profile's back wing is the three-quarter front's back wing (checked, shared).
// 5. src/config/bennyFlightFrames.json carries the atlas checks, the colour report and the rig: per view, the bodies, the wing
//    layers (behind or in front of the body), their shoulders in the 900 frame and whether they are darkened or mirrored.
// A board of every rig (beats 1, 3, 5, 7) on a dark and a sky background is written next to the sources, for the owner.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut} from './prepare-rabbit-masters.mjs';
import {downscale, encodePng} from './derive-nursery-overlays.mjs';
import {recolour, stats} from './benny-colour.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const argument = name => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : undefined; };
const SOURCES = argument('--sources') ?? 'output/imagegen/benny-vol-final-v1';
const BACK_SOURCES = argument('--back-sources') ?? 'output/imagegen/benny-vol-dos-final-v1';
const REFERENCE = argument('--reference') ?? 'output/imagegen/benny-enclos-final-v1/A1-reference.png';
const BOARD = `${SOURCES}/planche-atlas-vol.png`;
const TARGET = 'public/assets/rabbits/benny/flight', CONFIG = 'src/config/bennyFlightFrames.json';
/** Reduction of every source picture: the flying body comes out about 250 pixels wide, a little sharper than the meadow's A1. */
export const SCALE = .4;
export const BODY_SOURCE = 900, WING_SOURCE = 1200;
const BODY = Math.round(BODY_SOURCE * SCALE), WING = Math.round(WING_SOURCE * SCALE);

export const VIEWS = ['profil', '34devant', 'face', 'dos'];
const BEATS = 8;
const range = (name, count = BEATS) => Array.from({length: count}, (_, k) => `${name}-${k + 1}`);
/** Shipped wing series (the others are mirrors or copies of these). */
const WING_SERIES = ['wing-profil-front', 'wing-34devant-front', 'wing-34devant-back', 'wing-face-left', 'wing-dos-left', 'wing-appear', 'wing-disappear'];

// ---------- the rig ----------
const anchors = JSON.parse(readFileSync(`${SOURCES}/wings/anchors.json`, 'utf8'));
/** The back's bodies and wings come from its own folder, with its own shoulders. */
const folder = name => /^(body|wing)-dos-/.test(name) ? BACK_SOURCES : SOURCES;
anchors.dos = JSON.parse(readFileSync(`${BACK_SOURCES}/wings/anchors.json`, 'utf8')).dos;
/** The back's shoulders were placed by eye at (406, 352) and (495, 352): their middle fell 52 pixels left of the spine (x 502 at
 * that height, the middle of the back), the left wing on the flank. Moved right onto the shoulder blades, either side of the spine. */
export const BACK_SHOULDER_SHIFT = 52;
for (const wing of anchors.dos.wings) wing.shoulder = [wing.shoulder[0] + BACK_SHOULDER_SHIFT, wing.shoulder[1]];
/** Series name in anchors.json ("wing-profil-front-1..8") to the shipped series and whether it is drawn mirrored. */
const shipped = frames => {
  const series = frames.replace(/-1\.\.8$/, '');
  if (series === 'wing-profil-back') return {series: 'wing-34devant-back', mirror: false};
  if (/^wing-(face|dos)-right$/.test(series)) return {series: series.replace('-right', '-left'), mirror: true};
  return {series, mirror: false};
};
const rig = Object.fromEntries(VIEWS.map(view => [view, {
  bodies: anchors[view].bodies,
  wings: anchors[view].wings.map(wing => ({...shipped(wing.frames), shoulder: wing.shoulder, layer: wing.layer, darken: !!wing.tint})),
}]));
const transition = {shoulder: anchors.appear_disappear.shoulder, appear: 'wing-appear', disappear: 'wing-disappear'};

// ---------- preparation ----------
const read = file => decodeRgbPng(readFileSync(file));
const sha = image => createHash('sha256').update(image.pixels).digest('hex');
if (!existsSync(REFERENCE)) throw Error(`Missing ${REFERENCE}: give the approved A1 reference with --reference`);
const reference = read(REFERENCE); cutOut(reference, 'light');
const referenceStats = stats(reference);
const distance = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]));

/**
 * The back's pair is recoloured together (side by side, one same correction for both), twice: its two bodies share the same head
 * and back, so separate corrections made the fur shimmer as they alternate (1.6 ΔE on average over the shared top, against 0.8 left
 * by the paintings themselves); and it drifts further from A1 (5.4 to 6.3) than the other bodies, one pass leaving up to 1.9.
 */
const PAIR_PASSES = {dos: 2};
/** White background closed in by the drawing (not reached from the edges): between the back's gathered hind legs, under the tail. */
const BACKGROUND_SEEDS = {'body-dos-1': [[394, 693]]};
const pairOf = images => {
  const pair = {width: BODY_SOURCE * images.length, height: BODY_SOURCE, pixels: Buffer.alloc(BODY_SOURCE * images.length * BODY_SOURCE * 4)};
  const row = BODY_SOURCE * 4;
  for (let y = 0; y < BODY_SOURCE; y++) images.forEach((image, k) => image.pixels.copy(pair.pixels, (y * pair.width + k * BODY_SOURCE) * 4, y * row, (y + 1) * row));
  return {pair, split: () => images.forEach((image, k) => { for (let y = 0; y < BODY_SOURCE; y++) pair.pixels.copy(image.pixels, y * row, (y * pair.width + k * BODY_SOURCE) * 4, (y * pair.width + k * BODY_SOURCE) * 4 + row); })};
};
const prepared = [], colour = {};
for (const view of VIEWS) {
  const names = rig[view].bodies, images = names.map(name => {
    const image = read(`${folder(name)}/${name}.png`);
    if (image.width !== BODY_SOURCE || image.height !== BODY_SOURCE) throw Error(`${name}: ${BODY_SOURCE} × ${BODY_SOURCE} expected`);
    cutOut(image, 'light', BACKGROUND_SEEDS[name]);
    return image;
  });
  const before = images.map(image => stats(image));
  if (PAIR_PASSES[view]) { const {pair, split} = pairOf(images); for (let pass = 0; pass < PAIR_PASSES[view]; pass++) recolour(pair, referenceStats); split(); }
  else for (const image of images) recolour(image, referenceStats);
  names.forEach((name, k) => {
    const after = stats(images[k]);
    colour[name] = {furDrift: +distance(before[k].fur.mean, referenceStats.fur.mean).toFixed(2), maskDrift: +(before[k].mask.mean[0] - referenceStats.mask.mean[0]).toFixed(2),
      after: {fur: +distance(after.fur.mean, referenceStats.fur.mean).toFixed(2), mask: +(after.mask.mean[0] - referenceStats.mask.mean[0]).toFixed(2)}};
    prepared.push({name, image: downscale(images[k], BODY), size: BODY});
  });
}
const wingFile = name => `${folder(name)}/wings/transparent/${name}.png`;
for (const series of WING_SERIES) for (const name of range(series)) {
  const image = read(wingFile(name));
  if (image.width !== WING_SOURCE || image.height !== WING_SOURCE) throw Error(`${name}: ${WING_SOURCE} × ${WING_SOURCE} expected`);
  prepared.push({name, image: downscale(image, WING), size: WING});
}
// The pictures not shipped really are mirrors or copies of shipped ones.
for (const name of range('wing-profil-back')) if (sha(read(wingFile(name))) !== sha(read(wingFile(name.replace('profil', '34devant'))))) throw Error(`${name} is no longer the three-quarter front's back wing`);
for (const k of [1, 4, 8]) {
  const left = read(wingFile(`wing-face-left-${k}`)), right = read(wingFile(`wing-face-right-${k}`)), w = left.width;
  for (let y = 0; y < w; y += 7) for (let x = 0; x < w; x += 3) for (let c = 0; c < 4; c++)
    if (left.pixels[(y * w + x) * 4 + c] !== right.pixels[(y * w + w - 1 - x) * 4 + c]) throw Error(`wing-face-right-${k} is no longer the mirror of the left wing`);
}
// The back's right wings were cut out of their black background apart from the left ones: the mirror holds to a few levels on the
// cut-out rim only (at most 19 of 255 in premultiplied colour, on fewer than 20 pixels), so every pixel is compared within 24.
for (let k = 1; k <= BEATS; k++) {
  const left = read(wingFile(`wing-dos-left-${k}`)), right = read(wingFile(`wing-dos-right-${k}`)), w = left.width;
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const a = (y * w + x) * 4, b = (y * w + w - 1 - x) * 4;
    let d = Math.abs(left.pixels[a + 3] - right.pixels[b + 3]);
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(left.pixels[a + c] * left.pixels[a + 3] - right.pixels[b + c] * right.pixels[b + 3]) / 255);
    if (d > 24) throw Error(`wing-dos-right-${k} is no longer the mirror of the left wing`);
  }
}

// ---------- atlas ----------
function bounds({width, height, pixels}) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return x1 < 0 ? {x: 0, y: 0, w: 1, h: 1} : {x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1};
}
for (const frame of prepared) frame.rect = bounds(frame.image);
const GAP = 2, MAX_WIDTH = 2048;
// The narrowest square atlas that holds every frame on shelves (tallest first).
const pack = width => {
  let x = 0, y = 0, shelf = 0, used = 0;
  for (const frame of [...prepared].sort((a, b) => b.rect.h - a.rect.h || a.name.localeCompare(b.name))) {
    if (x + frame.rect.w > width) { x = 0; y += shelf + GAP; shelf = 0; }
    frame.at = {x, y}; x += frame.rect.w + GAP; shelf = Math.max(shelf, frame.rect.h); used = Math.max(used, x - GAP);
  }
  return {width: used, height: y + shelf};
};
let size = null;
for (let width = 1024; width <= MAX_WIDTH; width += 32) { const tried = pack(width); if (tried.height <= tried.width) { size = tried; break; } }
size ??= pack(MAX_WIDTH);
const atlas = {...size, pixels: Buffer.alloc(size.width * size.height * 4)};
for (const frame of prepared) {
  const {rect, image, at} = frame;
  for (let j = 0; j < rect.h; j++) image.pixels.copy(atlas.pixels, ((at.y + j) * atlas.width + at.x) * 4, ((rect.y + j) * image.width + rect.x) * 4, ((rect.y + j) * image.width + rect.x + rect.w) * 4);
}
// Fully transparent pixels carry no colour: the encoder never keeps hidden white.
for (let i = 3; i < atlas.pixels.length; i += 4) if (!atlas.pixels[i]) atlas.pixels[i - 3] = atlas.pixels[i - 2] = atlas.pixels[i - 1] = 0;
const atlasJson = {frames: Object.fromEntries(prepared.map(frame => [frame.name, {frame: {x: frame.at.x, y: frame.at.y, w: frame.rect.w, h: frame.rect.h}, rotated: false, trimmed: true,
  spriteSourceSize: {x: frame.rect.x, y: frame.rect.y, w: frame.rect.w, h: frame.rect.h}, sourceSize: {w: frame.size, h: frame.size}}])),
  meta: {image: 'benny-flight.webp', format: 'RGBA8888', size: {w: atlas.width, h: atlas.height}, scale: '1'}};

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch();
let webp;
try {
  const page = await browser.newPage();
  webp = Buffer.from(await page.evaluate(async ({png}) => {
    const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], {type: 'image/png'}), {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); canvas.getContext('2d').drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({type: 'image/webp', quality: .88}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
    for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    return btoa(text);
  }, {png: encodePng(atlas).toString('base64')}), 'base64');
  // The check board: every rig drawn from the encoded atlas exactly as the game lays it out (bodies centred, wings at the shoulders).
  const views = VIEWS.map(view => ({view, ...rig[view]}));
  await page.setViewportSize({width: 1500, height: 900});
  await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fbf8f1"></body>');
  const board = await page.evaluate(async ({webp, json, views, transition, BODY, SCALE}) => {
    const image = new Image(); image.src = `data:image/webp;base64,${webp}`; await image.decode();
    const cell = 300, rows = views.length * 2 + 2, columns = 5, canvas = document.createElement('canvas');
    canvas.width = columns * cell; canvas.height = rows * cell + 60; const g = canvas.getContext('2d');
    g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#4a3426'; g.font = 'bold 26px Georgia'; g.fillText('Benny en vol — atlas du jeu (ailes 1, 3, 5, 7 ; fond sombre puis ciel)', 16, 38);
    // Draws one frame with its square's centre at (x, y), mirrored or darkened if asked.
    const draw = (name, x, y, k, {mirror = false, darken = false} = {}) => {
      const f = json.frames[name]; if (!f) throw Error(name);
      g.save(); g.translate(x, y); g.scale(mirror ? -k : k, k);
      if (darken) g.filter = 'brightness(0.8) saturate(0.9)';
      g.drawImage(image, f.frame.x, f.frame.y, f.frame.w, f.frame.h, f.spriteSourceSize.x - f.sourceSize.w / 2, f.spriteSourceSize.y - f.sourceSize.h / 2, f.frame.w, f.frame.h);
      g.restore();
    };
    const k = cell / (BODY * 1.9);
    const rigAt = (view, beat, body, x, y) => {
      const at = shoulder => [x + (shoulder[0] - 450) * SCALE * k, y + (shoulder[1] - 450) * SCALE * k];
      for (const w of view.wings.filter(w => w.layer === 'behind')) draw(`${w.series}-${beat}`, ...at(w.shoulder), k, w);
      draw(view.bodies[body], x, y, k);
      for (const w of view.wings.filter(w => w.layer === 'front')) draw(`${w.series}-${beat}`, ...at(w.shoulder), k, w);
    };
    let row = 0;
    for (const background of ['#3b3550', '#bfe3f2']) for (const view of views) {
      const top = 60 + row * cell; g.fillStyle = background; g.fillRect(0, top, canvas.width, cell);
      g.fillStyle = background === '#3b3550' ? '#fff' : '#4a3426'; g.font = '18px Georgia'; g.fillText(view.view, 8, top + 22);
      [1, 3, 5, 7].forEach((beat, i) => rigAt(view, beat, i % 2, (i + .5) * cell, top + cell / 2));
      rigAt(view, 1, 0, 4.5 * cell, top + cell / 2); row++;
    }
    for (const series of [transition.appear, transition.disappear]) {
      const top = 60 + row * cell; g.fillStyle = '#3b3550'; g.fillRect(0, top, canvas.width, cell);
      [1, 3, 5, 7, 8].forEach((n, i) => { const x = (i + .5) * cell, y = top + cell / 2;
        draw('body-profil-1', x, y, k); draw(`${series}-${n}`, x + (transition.shoulder[0] - 450) * SCALE * k, y + (transition.shoulder[1] - 450) * SCALE * k, k); });
      row++;
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, {webp: webp.toString('base64'), json: atlasJson, views, transition, BODY, SCALE});
  writeFileSync(BOARD, Buffer.from(board, 'base64'));
} finally { await browser.close(); }

mkdirSync(TARGET, {recursive: true});
writeFileSync(`${TARGET}/benny-flight.webp`, webp);
writeFileSync(`${TARGET}/benny-flight.json`, JSON.stringify(atlasJson, null, 1) + '\n');
const config = {
  note: 'Generated by scripts/prepare-benny-flight.mjs; do not edit by hand.',
  /** Atlas pixels per source pixel; shoulders below are in the 900 body frame, whose centre (450, 450) is the body frame's centre. */
  scale: SCALE, body: {source: BODY_SOURCE, size: BODY}, wing: {source: WING_SOURCE, size: WING}, beats: BEATS,
  atlas: {width: atlas.width, height: atlas.height, bytes: webp.length, sha256: createHash('sha256').update(webp).digest('hex')},
  views: rig, transition,
  colour,
  frames: prepared.map(frame => frame.name),
};
writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
console.log(`atlas ${atlas.width}x${atlas.height}, ${prepared.length} frames, ${webp.length} bytes`);
for (const [name, report] of Object.entries(colour)) console.log(`${name}: fur drift ${report.furDrift}, mask ${report.maskDrift} -> recoloured: fur ${report.after.fur}, mask ${report.after.mask}`);
console.log(`board: ${BOARD}`);
