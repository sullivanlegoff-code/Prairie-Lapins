// « Cours cours Benny ! »: Benny's and the Dragon's paintings for the run (owner's picks of 12 November 2026: Benny A, seen from
// behind, and Dragon A, the evolved Dragon « Écarlate Majestueux » with its big wings). Node built-ins plus an installed Playwright
// for the WebP encoding and the check board, like scripts/prepare-benny-flight.mjs.
//
//   PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-benny-run-art.mjs [--sources <folder>] [--reference <A1-reference.png>]
//
// The sources (default output/imagegen/course-benny-final-v1, ignored by Git) are two production sheets on pure white:
// - sheet-benny.png: six poses left to right (run 1, run 2, jump, roll, wall, strike);
// - sheet-dragon2.png (redone from the game's evolved Dragon itself at the owner's request): four pictures left to right (flight from behind wings up, wings down, face, the end scene).
// - sheet-creatures.png and sheet-objets.png: two rows of four (dragonnet asleep/awake, chest shut/open, ember x2, flyer x2;
//   pot, golden pot, barrier, beam, pillar, rock, mine cart, coin), each fitted to its own square, its size in it noted.
// 1. Each sheet is cut out of its white background (flood fill from the border, then white pockets closed in by the drawing).
// 2. Benny's sheet is recoloured onto the approved A1 reference as a whole (one same correction for every pose: no flicker).
// 3. The drawings are the sheet's big separate blots, left to right (specks dropped); each goes into a square: Benny standing on
//    the square's bottom, centred; the Dragon centred on her body (the two wing beats keep the very same body place).
// 4. Each square is reduced by the exact area filter and laid in a grid atlas per character (WebP), and
//    src/config/bennyRunArt.json gives every frame's place and the square size.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut} from './prepare-rabbit-masters.mjs';
import {downscale, encodePng} from './derive-nursery-overlays.mjs';
import {recolour, stats} from './benny-colour.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const argument = name => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1] : undefined; };
const SOURCES = argument('--sources') ?? 'output/imagegen/course-benny-final-v1';
const REFERENCE = argument('--reference') ?? 'output/imagegen/benny-enclos-final-v1/A1-reference.png';
const TARGET = 'public/assets/benny-run', CONFIG = 'src/config/bennyRunArt.json';

export const CHARACTERS = {
  benny: {sheet: 'sheet-benny.png', frames: ['run-1', 'run-2', 'jump', 'roll', 'wall', 'strike'], size: 320, columns: 3, standing: true},
  // Four more poses of Benny (owner's sheet of 13 Nov.): the wind-up of a strike, the landing, the fall, the push off the ground.
  'benny-moves': {sheet: 'sheet-benny-moves.png', frames: ['windup', 'land', 'fall', 'push'], size: 320, columns: 4, standing: true},
  dragon: {sheet: 'sheet-dragon2.png', frames: ['fly-1', 'fly-2', 'face', 'catch'], size: 420, columns: 2, standing: false},
  // Two rows of four, each drawing fitted to its own square (they differ in size), standing on its bottom; the two pictures of
  // one creature share one square so it keeps its size from one picture to the next.
  // Repainted in the style of the floating isles (13 Nov.): a grid of three by three, one creature per row (dragonnet asleep,
  // awake, struck; ember tall, low, gone out in smoke; flyer wings up, down, struck), the three pictures of a row in one square.
  creatures: {sheet: 'sheet-foes.png', frames: ['dragonnet-sleep', 'dragonnet-awake', 'dragonnet-hit', 'ember-1', 'ember-2', 'ember-smoke', 'flyer-1', 'flyer-2', 'flyer-hit'], size: 200, columns: 3, fit: true, cells: 3, rows: 3, group: 3, pocket: 6000},
  // (Its white pockets only from 6000 pixels: the whites of the eyes stay.)
  // The chest's three states (13 Nov.): one chest per cell of three equal cells, the pieces of a cell (sparkles, a lid knocked
  // off, loose coins) kept together as one drawing; all three in one same square, drawn at the shut chest's size.
  chests: {sheet: 'sheet-chests.png', frames: ['intact', 'knocked', 'broken'], size: 220, columns: 3, fit: true, cells: 3, shared: true},
  objets: {sheet: 'sheet-objets.png', frames: ['pot', 'pot-gold', 'barrier', 'beam', 'pillar', 'rock', 'cart', 'coin'], size: 200, columns: 4, rows: 2, fit: true},
};
/** A blot smaller than this share of the biggest one is a speck (a stray stroke, a crumb), not a drawing. */
const SPECK = .04;

const read = file => decodeRgbPng(readFileSync(file));

/** The game's own Benny (her island picture): each pose of the run is matched to her outline and cream, pose by pose (13 Nov.:
 *  measured against her, the run's outline was a lighter brown on every pose, and the landing's cream too white). */
const GAME_BENNY = 'public/assets/rabbits/benny/benny-v1.png';
const luma = (px, i) => .2126 * px[i] + .7152 * px[i + 1] + .0722 * px[i + 2];
const chroma = (px, i) => Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]);
/** The median colour of the visible pixels picked by `pick`. */
function median({pixels}, pick) {
  const chosen = [[], [], []];
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 200 && pick(pixels, i)) for (let k = 0; k < 3; k++) chosen[k].push(pixels[i + k]);
  return chosen.map(list => list.sort((a, b) => a - b)[list.length >> 1] ?? 0);
}
/** Its outline (the darkest 4 % of the visible pixels, and how dark they start) and its cream (light, nearly grey: tail, paws). */
function marks(image) {
  const lumas = []; for (let i = 0; i < image.pixels.length; i += 4) if (image.pixels[i + 3] > 200) lumas.push(luma(image.pixels, i));
  lumas.sort((a, b) => a - b); const dark = lumas[Math.floor(lumas.length * .04)], soft = lumas[Math.floor(lumas.length * .08)];
  return {dark, soft, line: median(image, (px, i) => luma(px, i) <= dark), cream: median(image, (px, i) => luma(px, i) > 205 && chroma(px, i) < 60)};
}
/** One pose matched to the game's Benny: its outline darkened (fading out over the next darkest pixels), its cream moved to hers. */
function matchBenny(image, game) {
  const own = marks(image), px = image.pixels, ratio = own.line.map((v, k) => v ? game.line[k] / v : 1), shift = own.cream.map((v, k) => game.cream[k] - v);
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const y = luma(px, i), w = y <= own.dark ? 1 : y >= own.soft ? 0 : (own.soft - y) / (own.soft - own.dark);
    if (w > 0) for (let k = 0; k < 3; k++) px[i + k] = Math.max(0, Math.min(255, Math.round(px[i + k] * (1 + w * (ratio[k] - 1)))));
    else if (y > 205 && chroma(px, i) < 60) for (let k = 0; k < 3; k++) px[i + k] = Math.max(0, Math.min(255, Math.round(px[i + k] + shift[k])));
  }
  return image;
}

/** Pure white pockets the drawing closes in (between the legs, under an arm) become background too. */
function clearPockets({width, height, pixels}, least = 250) {
  const seen = new Uint8Array(width * height), white = i => pixels[i * 4 + 3] === 255 && Math.min(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]) >= 247
    && Math.max(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]) - Math.min(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]) <= 5;
  let cleared = 0;
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !white(start)) continue;
    const pocket = [start]; seen[start] = 1;
    for (let k = 0; k < pocket.length; k++) { const i = pocket[k], x = i % width;
      for (const j of [i - width, i + width, x ? i - 1 : -1, x < width - 1 ? i + 1 : -1]) if (j >= 0 && j < width * height && !seen[j] && white(j)) { seen[j] = 1; pocket.push(j); } }
    if (pocket.length >= least) { for (const i of pocket) pixels[i * 4 + 3] = 0; cleared += pocket.length; }
  }
  return cleared;
}

/** The sheet's separate drawings (8-connected blots of visible pixels), left to right, specks dropped. */
function blots({width, height, pixels}, rows = 1, cells = 0) {
  const label = new Int32Array(width * height).fill(-1), found = [];
  for (let start = 0; start < width * height; start++) {
    if (label[start] >= 0 || pixels[start * 4 + 3] < 24) continue;
    const id = found.length, stack = [start]; label[start] = id; let x0 = width, y0 = height, x1 = 0, y1 = 0, count = 0;
    while (stack.length) { const i = stack.pop(), x = i % width, y = (i - x) / width; count++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy, j = ny * width + nx;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && label[j] < 0 && pixels[j * 4 + 3] >= 24) { label[j] = id; stack.push(j); } } }
    found.push({id, x0, y0, x1, y1, count});
  }
  const biggest = Math.max(...found.map(b => b.count));
  // One drawing per cell of equal width: every piece in a cell (but dust) belongs to it.
  if (cells) {
    const list = Array.from({length: cells * rows}, () => null);
    for (const b of found) { if (b.count < biggest * .002) continue;
      const k = Math.min(cells - 1, Math.floor((b.x0 + b.x1) / 2 / (width / cells))) + cells * Math.min(rows - 1, Math.floor((b.y0 + b.y1) / 2 / (height / rows))), m = list[k];
      list[k] = m ? {id: -2, ids: new Set([...m.ids, b.id]), x0: Math.min(m.x0, b.x0), y0: Math.min(m.y0, b.y0), x1: Math.max(m.x1, b.x1), y1: Math.max(m.y1, b.y1), count: m.count + b.count}
        : {...b, ids: new Set([b.id])}; }
    return {label, list: list.filter(Boolean)};
  }
  const kept = found.filter(b => b.count >= biggest * SPECK);
  // On a sheet of several rows: top row first (by the drawings' middle height), each row left to right.
  const byHeight = [...kept].sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1)), per = Math.ceil(kept.length / rows), list = [];
  for (let r = 0; r < rows; r++) list.push(...byHeight.slice(r * per, (r + 1) * per).sort((a, b) => a.x0 - b.x0));
  return {label, list};
}

/** One drawing alone (its own pixels only) in a square of `side`, its anchor at (ax, ay) of the square. */
function square(image, label, blot, side, ax, ay, anchorX, anchorY) {
  const out = {width: side, height: side, pixels: Buffer.alloc(side * side * 4)};
  for (let y = blot.y0; y <= blot.y1; y++) for (let x = blot.x0; x <= blot.x1; x++) {
    const i = y * image.width + x; if (blot.ids ? !blot.ids.has(label[i]) : label[i] !== blot.id) continue;
    const tx = Math.round(x - anchorX + ax), ty = Math.round(y - anchorY + ay);
    if (tx < 0 || ty < 0 || tx >= side || ty >= side) throw Error('A drawing does not fit its square');
    image.pixels.copy(out.pixels, (ty * side + tx) * 4, i * 4, i * 4 + 4);
  }
  // The blot keeps its soft rim: the faint pixels around it (below the blot threshold) next to it come too.
  for (let y = Math.max(0, blot.y0 - 2); y <= Math.min(image.height - 1, blot.y1 + 2); y++) for (let x = Math.max(0, blot.x0 - 2); x <= Math.min(image.width - 1, blot.x1 + 2); x++) {
    const i = y * image.width + x; if (label[i] >= 0 || !image.pixels[i * 4 + 3]) continue;
    const tx = Math.round(x - anchorX + ax), ty = Math.round(y - anchorY + ay);
    if (tx >= 0 && ty >= 0 && tx < side && ty < side) image.pixels.copy(out.pixels, (ty * side + tx) * 4, i * 4, i * 4 + 4);
  }
  return out;
}
/** The middle of the body: the mean column of the visible pixels in the lower 45 % of the blot (wings stay above it). */
function bodyCentre(image, label, blot) {
  let sx = 0, sy = 0, n = 0; const from = blot.y0 + (blot.y1 - blot.y0) * .3, to = blot.y0 + (blot.y1 - blot.y0) * .75;
  for (let y = Math.round(from); y <= to; y++) for (let x = blot.x0; x <= blot.x1; x++) if (label[y * image.width + x] === blot.id) { sx += x; sy += y; n++; }
  return {x: sx / n, y: sy / n};
}

if (!existsSync(REFERENCE)) throw Error(`Missing ${REFERENCE}: give the approved A1 reference with --reference`);
const reference = read(REFERENCE); cutOut(reference, 'light');
const referenceStats = stats(reference);
const gameMarks = marks(read(GAME_BENNY));
mkdirSync(TARGET, {recursive: true});
const config = {}, atlases = {};
for (const [name, character] of Object.entries(CHARACTERS)) {
  const sheet = read(`${SOURCES}/${character.sheet}`);
  cutOut(sheet, 'light'); const pockets = clearPockets(sheet, character.pocket);
  if (name === 'benny' || name === 'benny-moves') recolour(sheet, referenceStats);
  const {label, list} = blots(sheet, character.rows, character.cells);
  if (list.length !== character.frames.length) throw Error(`${character.sheet}: ${list.length} drawings found, ${character.frames.length} expected`);
  const extent = b => Math.max(b.x1 - b.x0, b.y1 - b.y0) + 1;
  // One square side per character, from its biggest drawing, with a margin; fitted sheets: per drawing (or per pair).
  const side = Math.ceil(Math.max(...list.map(extent)) * 1.08);
  const first = k => character.group ? k - k % character.group : k;
  const sideOf = k => !character.fit ? side : character.group ? Math.ceil(Math.max(...list.slice(first(k), first(k) + character.group).map(extent)) * 1.04) : character.shared ? Math.ceil(Math.max(...list.map(extent)) * 1.04) : Math.ceil((character.pairs ? Math.max(extent(list[k - k % 2]), extent(list[k - k % 2 + 1])) : extent(list[k])) * 1.04);
  const frames = list.map((blot, k) => {
    let image; const s = sideOf(k);
    if (character.standing || character.fit) image = square(sheet, label, blot, s, s / 2, s * (character.fit ? .98 : .97), (blot.x0 + blot.x1) / 2, blot.y1);
    else { const c = bodyCentre(sheet, label, blot); image = square(sheet, label, blot, s, s / 2, s / 2, c.x, c.y); }
    // A fitted drawing's width and height in its square (a pair takes its first picture's), to draw it at the thing's size.
    const ref = character.group ? list[first(k)] : character.shared ? list[0] : character.pairs ? list[k - k % 2] : blot, fit = character.fit ? [+((ref.x1 - ref.x0 + 1) / s).toFixed(3), +((ref.y1 - ref.y0 + 1) / s).toFixed(3)] : [];
    const small = downscale(image, character.size);
    return {name: character.frames[k], image: name === 'benny' || name === 'benny-moves' ? matchBenny(small, gameMarks) : small, fit};
  });
  const columns = character.columns, rows = Math.ceil(frames.length / columns), S = character.size;
  const atlas = {width: columns * S, height: rows * S, pixels: Buffer.alloc(columns * S * rows * S * 4)};
  frames.forEach((frame, k) => { const ox = (k % columns) * S, oy = Math.floor(k / columns) * S;
    for (let y = 0; y < S; y++) frame.image.pixels.copy(atlas.pixels, ((oy + y) * atlas.width + ox) * 4, y * S * 4, (y + 1) * S * 4); });
  for (let i = 3; i < atlas.pixels.length; i += 4) if (!atlas.pixels[i]) atlas.pixels[i - 3] = atlas.pixels[i - 2] = atlas.pixels[i - 1] = 0;
  atlases[name] = atlas;
  config[name] = {image: `assets/benny-run/${name}.webp`, size: S, frames: Object.fromEntries(frames.map((f, k) => [f.name, [(k % columns) * S, Math.floor(k / columns) * S, ...f.fit]])),
    anchor: character.standing || character.fit ? 'feet' : 'body', pockets};
}

const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const encoded = {};
  for (const [name, atlas] of Object.entries(atlases)) {
    encoded[name] = await page.evaluate(async ({png}) => {
      const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], {type: 'image/png'}), {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const blob = await canvas.convertToBlob({type: 'image/webp', quality: .88}), buffer = new Uint8Array(await blob.arrayBuffer()); let text = '';
      for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      return btoa(text);
    }, {png: encodePng(atlas).toString('base64')});
    writeFileSync(`${TARGET}/${name}.webp`, Buffer.from(encoded[name], 'base64'));
    config[name].bytes = Buffer.from(encoded[name], 'base64').length;
  }
  // The check board for the owner, next to the sources: every frame on the run's three grounds.
  await page.setViewportSize({width: 1400, height: 900});
  await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0"></body>');
  const board = await page.evaluate(async ({encoded, config}) => {
    const canvas = document.createElement('canvas'), cell = 200, names = Object.keys(config), columns = 8;
    canvas.width = columns * cell; canvas.height = names.length * 3 * cell; const g = canvas.getContext('2d');
    const grounds = ['#9a7a54', '#5a2a22', '#b9c4d2'];
    let row = 0;
    for (const name of names) {
      const image = new Image(); image.src = `data:image/webp;base64,${encoded[name]}`; await image.decode();
      for (const ground of grounds) { g.fillStyle = ground; g.fillRect(0, row * cell, canvas.width, cell);
        Object.values(config[name].frames).forEach(([x, y], k) => g.drawImage(image, x, y, config[name].size, config[name].size, k * cell + 6, row * cell + 6, cell - 12, cell - 12)); row++; }
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, {encoded, config});
  writeFileSync(`${SOURCES}/planche-atlas-course.png`, Buffer.from(board, 'base64'));
} finally { await browser.close(); }
writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(config).map(([k, v]) => [k, {bytes: v.bytes, pockets: v.pockets, frames: Object.keys(v.frames).length}]))));
