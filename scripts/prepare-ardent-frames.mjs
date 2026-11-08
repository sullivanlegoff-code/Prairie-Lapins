// Ardent's living flames (owner, 7 November 2026: « 4 ou 5 frames avec du mouvement pour ses flammes », and a pose that does
// not always stay the same), for his first drawing only; his evolution stays like the other rabbits'.
// Input: one painted sheet of five frames on a row, flat magenta background (output/imagegen/ardent-v1/planche.png, ignored).
// Each frame is keyed, then all are scaled by one factor so that the first frame is as wide as the served sprite, and placed on
// one shared canvas, bottom-aligned on the paws and centred on the body's lower part (the rabbit stays lying in place).
// The canvas keeps the served sprite's bottom centre, so the game swaps textures with the same origin and scale.
// Writes assets-source/rabbits/ardent/frames/frame-<n>.png (masters) and public/assets/rabbits/ardent/ardent-frame-<n>.png,
// and prints the canvas size for src/config/ardentFrames.ts.
//   node scripts/prepare-ardent-frames.mjs "<sheet.png>"
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import {keyMagenta, resize} from './prepare-noel-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const FRAMES = 5;
const sheetPath = process.argv[2];
if (!sheetPath) throw Error('Usage: node scripts/prepare-ardent-frames.mjs "<sheet.png>"');
const sheet = keyMagenta(decodeRgbPng(readFileSync(sheetPath))), sprite = decodeRgbPng(readFileSync('public/assets/rabbits/ardent/ardent-v1.png'));
const opaque = (img, x, y) => img.pixels[(y * img.width + x) * 4 + 3] > 40;
// Frames: runs of columns holding opaque pixels, separated by empty columns.
const filled = Array.from({length: sheet.width}, (_, x) => { for (let y = 0; y < sheet.height; y++) if (opaque(sheet, x, y)) return true; return false; });
const runs = []; for (let x = 0; x < sheet.width; x++) if (filled[x] && (x === 0 || !filled[x - 1])) runs.push([x, x]); else if (filled[x]) runs[runs.length - 1][1] = x;
const frames = runs.filter(([a, b]) => b - a > sheet.width / 20);
if (frames.length !== FRAMES) throw Error(`Expected ${FRAMES} frames, found ${frames.length}`);
const cut = ([a, b]) => { let y0 = sheet.height, y1 = 0; for (let y = 0; y < sheet.height; y++) for (let x = a; x <= b; x++) if (opaque(sheet, x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = b - a + 1, h = y1 - y0 + 1, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) sheet.pixels.copy(out, y * w * 4, ((y + y0) * sheet.width + a) * 4, ((y + y0) * sheet.width + b + 1) * 4);
  return {width: w, height: h, pixels: out}; };
const pieces = frames.map(cut);
// The served sprite's opaque box: its width sets the scale, its bottom centre the anchor.
let sx0 = sprite.width, sx1 = 0, sy1 = 0; for (let y = 0; y < sprite.height; y++) for (let x = 0; x < sprite.width; x++) if (opaque(sprite, x, y)) { sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sy1 = Math.max(sy1, y); }
const scale = (sx1 - sx0 + 1) / pieces[0].width;
const scaled = pieces.map(p => resize(p, Math.round(p.width * scale), Math.round(p.height * scale)));
/** Horizontal centre of the lowest third (body and paws), which does not move between frames. */
const baseCentre = img => { let s = 0, n = 0; for (let y = Math.floor(img.height * 2 / 3); y < img.height; y++) for (let x = 0; x < img.width; x++) if (opaque(img, x, y)) { s += x; n++; } return s / n; };
const spriteCentre = (() => { let s = 0, n = 0; for (let y = Math.floor(sy1 - (sy1 * 1 / 3)); y <= sy1; y++) for (let x = 0; x < sprite.width; x++) if (opaque(sprite, x, y)) { s += x; n++; } return s / n; })();
// Shared canvas: as wide as needed on both sides of the sprite's centre line, as tall as the tallest frame; bottom = paws.
const halfW = Math.ceil(Math.max(sprite.width / 2, ...scaled.map(img => Math.max(baseCentre(img), img.width - baseCentre(img)) + Math.abs(spriteCentre - sprite.width / 2))));
const W = 2 * halfW, bottomGap = sprite.height - 1 - sy1, H = Math.max(sprite.height, ...scaled.map(img => img.height + bottomGap));
mkdirSync('assets-source/rabbits/ardent/frames', {recursive: true});
scaled.forEach((img, i) => {
  const out = Buffer.alloc(W * H * 4), ox = Math.round(halfW + (spriteCentre - sprite.width / 2) - baseCentre(img)), oy = H - bottomGap - img.height;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) { const tx = x + ox, ty = y + oy; if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue; img.pixels.copy(out, (ty * W + tx) * 4, (y * img.width + x) * 4, (y * img.width + x) * 4 + 4); }
  const png = encodePng({width: W, height: H, pixels: out});
  writeFileSync(`assets-source/rabbits/ardent/frames/frame-${i + 1}.png`, encodePng(pieces[i]));
  writeFileSync(`public/assets/rabbits/ardent/ardent-frame-${i + 1}.png`, png);
});
console.log(JSON.stringify({frames: FRAMES, width: W, height: H, sprite: [sprite.width, sprite.height]}));
