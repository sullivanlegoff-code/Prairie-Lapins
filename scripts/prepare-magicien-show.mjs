// The evolved Magicien's magic shows (owner, 10 November 2026: « plus animé et capable de faire de la magie », full freedom).
// Paintings made with the image model outside the repository (output/imagegen/magicien-spectacle-v1/, ignored), flat magenta:
// - cast.png, point.png, twirl.png, float.png, bow.png: the evolved Magicien redrawn in five poses, one per picture;
// - effets.png: a 4 × 2 sheet (smoke, firework, comet, butterfly open / butterfly closed, an unused rune, twinkle, ribbon).
// Every pose (painted one by one from the approved drawing, its colours already the same) is keyed, scaled so that its body has the approved drawing's size (square root of the opaque areas, the wand and arms only a small part of it),
// and placed on one canvas per pose: bottom on the drawing's ground line, the lower body's centre on the drawing's, so the game
// swaps the sprite's texture with the same origin (.5, 1) and scale. The effects are cropped and resized.
// Writes the masters (assets-source/), the served pictures (public/assets/) and prints the wand tips for src/config/magicienArt.ts.
// Then run scripts/make-webp-twins.mjs.
//   node scripts/prepare-magicien-show.mjs output/imagegen/magicien-spectacle-v1
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import {keyMagenta, resize} from './prepare-noel-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const source = process.argv[2];
if (!source) throw Error('Usage: node scripts/prepare-magicien-show.mjs <folder>');
const write = (path, bytes) => { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, bytes); };
const opaque = (img, x, y, level = 40) => img.pixels[(y * img.width + x) * 4 + 3] > level;
function box(img, level = 40) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (opaque(img, x, y, level)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return {x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1};
}
function crop(img, b) {
  const out = Buffer.alloc(b.width * b.height * 4);
  for (let y = 0; y < b.height; y++) img.pixels.copy(out, y * b.width * 4, ((b.y + y) * img.width + b.x) * 4, ((b.y + y) * img.width + b.x + b.width) * 4);
  return {width: b.width, height: b.height, pixels: out};
}
const area = img => { let n = 0; for (let i = 3; i < img.pixels.length; i += 4) n += img.pixels[i] / 255; return n; };
/** Horizontal centre of the lowest third of the opaque pixels (the cape's hem and the paws). */
const baseCentre = img => { const b = box(img); let s = 0, n = 0; for (let y = b.y + Math.floor(b.height * 2 / 3); y < b.y + b.height; y++) for (let x = 0; x < img.width; x++) if (opaque(img, x, y)) { s += x; n++; } return s / n; };

// ---------- poses ----------
const POSES = ['cast', 'point', 'twirl', 'float', 'bow'];
const sprite = decodeRgbPng(readFileSync('public/assets/rabbits/magicien/magicien-v2.png'));
const spriteBox = box(sprite), spriteArea = area(sprite), spriteCentre = baseCentre(sprite), bottomGap = sprite.height - (spriteBox.y + spriteBox.height);
const poses = POSES.map(name => {
  const keyed = keyMagenta(decodeRgbPng(readFileSync(`${source}/${name}.png`)));
  const cut = crop(keyed, box(keyed, 8));
  const scale = Math.sqrt(spriteArea / area(cut));
  return {name, master: cut, img: resize(cut, Math.round(cut.width * scale), Math.round(cut.height * scale))};
});
const sides = poses.map(p => { const c = baseCentre(p.img); return Math.max(c, p.img.width - c); });
const halfW = Math.ceil(Math.max(sprite.width / 2, ...sides.map(s => s + Math.abs(spriteCentre - sprite.width / 2))));
const W = 2 * halfW, H = Math.max(sprite.height, ...poses.map(p => p.img.height + bottomGap));
const tips = {};
for (const p of poses) {
  const out = Buffer.alloc(W * H * 4), ox = Math.round(halfW + (spriteCentre - sprite.width / 2) - baseCentre(p.img)), oy = H - bottomGap - p.img.height;
  for (let y = 0; y < p.img.height; y++) for (let x = 0; x < p.img.width; x++) { const tx = x + ox, ty = y + oy; if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue; p.img.pixels.copy(out, (ty * W + tx) * 4, (y * p.img.width + x) * 4, (y * p.img.width + x) * 4 + 4); }
  const canvas = {width: W, height: H, pixels: out};
  // The wand's star: the brightest violet-white pixels (its painted glow), their centre.
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, [r, g, b, a] = out.subarray(i, i + 4); if (a > 200 && b > 200 && r > 170 && g > 140 && b >= r) { sx += x; sy += y; n++; } }
  tips[p.name] = n ? {x: Math.round(sx / n), y: Math.round(sy / n)} : null;
  write(`assets-source/rabbits/magicien/poses/${p.name}.png`, encodePng(p.master));
  write(`public/assets/rabbits/magicien/magicien-pose-${p.name}.png`, encodePng(canvas));
}
console.log(JSON.stringify({canvas: {width: W, height: H}, sprite: [sprite.width, sprite.height], tips}));

// ---------- effects ----------
const EFFECTS = [['smoke', 160], ['firework', 192], ['comet', 96], ['butterfly-open', 64], ['butterfly-closed', 64], null, ['twinkle', 40], ['ribbon', 128]];
const sheet = keyMagenta(decodeRgbPng(readFileSync(`${source}/effets.png`)));
const cw = sheet.width / 4, ch = sheet.height / 2;
EFFECTS.forEach((effect, k) => {
  if (!effect) return;
  const [name, size] = effect, cell = crop(sheet, {x: Math.floor((k % 4) * cw), y: Math.floor(Math.floor(k / 4) * ch), width: Math.floor(cw), height: Math.floor(ch)});
  const piece = crop(cell, box(cell, 24)), s = size / Math.max(piece.width, piece.height);
  write(`assets-source/effects/magicien/show/${name}.png`, encodePng(piece));
  write(`public/assets/effects/magicien/${name}.png`, encodePng(resize(piece, Math.max(1, Math.round(piece.width * s)), Math.max(1, Math.round(piece.height * s)))));
});
console.log('effects', EFFECTS.filter(Boolean).map(e => e[0]).join(' '));
