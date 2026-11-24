// The Peintre's shows (owner, 24 November 2026: five meadow shows, one of them a great brush stroke and one ten seconds long where
// he sets a canvas on an easel and paints Van Gogh's Almond Blossom, and a painted first appearance). Paintings made with the
// image model outside the repository (output/imagegen/peintre-v1/, ignored), on flat magenta unless said otherwise:
// - v1-<pose>.png and v2-<pose>.png: his two approved drawings (Peintre, Peintre Aguerri) redrawn in four poses (swing, carry,
//   paint, admire);
// - effets.png: a 4 × 2 sheet (brush stroke, star, swirl, sunflower / bud, yellow splat, blue splat, drop);
// - chevalet.png: an empty easel; cadre.png: an empty gilded frame;
// - toile.png: his canvas, the Almond Blossom (Van Gogh, 1890, public domain), edge to edge; ciel.png: a starry sky, edge to edge.
// Every pose is keyed, scaled so that its body has the drawing's size (square root of the opaque areas) and placed on one canvas
// per drawing: bottom on the drawing's ground line, the lower body's centre on the drawing's, so the game only swaps the sprite's
// texture. The canvas is painted in CANVAS_STEPS steps, stroke by stroke (the strokes' order is fixed by a seeded generator).
// Writes the kept paintings (assets-source/rabbits/peintre/show/), the served pictures (public/) and src/config/peintreShow.json.
// Then run scripts/make-webp-twins.mjs.
//   node scripts/prepare-peintre-show.mjs output/imagegen/peintre-v1
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import {keyMagenta, resize} from './prepare-noel-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const source = process.argv[2];
if (!source) throw Error('Usage: node scripts/prepare-peintre-show.mjs <folder>');
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
/** Horizontal centre of the lowest third of the opaque pixels (the paws). */
const baseCentre = img => { const b = box(img); let s = 0, n = 0; for (let y = b.y + Math.floor(b.height * 2 / 3); y < b.y + b.height; y++) for (let x = 0; x < img.width; x++) if (opaque(img, x, y)) { s += x; n++; } return s / n; };
const fit = (img, width) => resize(img, width, Math.max(1, Math.round(img.height * width / img.width)));
const keyed = name => keyMagenta(decodeRgbPng(readFileSync(`${source}/${name}.png`)));
const show = {versions: {}, effects: {}};

// ---------- poses ----------
const POSES = ['swing', 'carry', 'paint', 'admire'];
/** The brush's tip: the top right of the swing (the brush is raised high to the right), the far right of the painting arm. */
const TIP = {
  swing: img => { let best = null; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (opaque(img, x, y, 120) && (!best || y - .35 * x < best.y - .35 * best.x)) best = {x, y}; return best; },
  paint: img => { let best = null; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (opaque(img, x, y, 120) && (!best || x > best.x)) best = {x, y}; return best; },
};
for (const version of ['v1', 'v2']) {
  const sprite = decodeRgbPng(readFileSync(`public/assets/rabbits/peintre/peintre-${version}.png`));
  const spriteBox = box(sprite), spriteArea = area(sprite), spriteCentre = baseCentre(sprite), bottomGap = sprite.height - (spriteBox.y + spriteBox.height);
  const poses = POSES.map(name => {
    const raw = keyed(`${version}-${name}`), cut = crop(raw, box(raw, 8));
    write(`assets-source/rabbits/peintre/show/${version}-${name}.png`, encodePng(cut));
    const scale = Math.sqrt(spriteArea / area(cut));
    return {name, img: resize(cut, Math.round(cut.width * scale), Math.round(cut.height * scale))};
  });
  const sides = poses.map(p => { const c = baseCentre(p.img); return Math.max(c, p.img.width - c); });
  const halfW = Math.ceil(Math.max(sprite.width / 2, ...sides.map(s => s + Math.abs(spriteCentre - sprite.width / 2))));
  const W = 2 * halfW, H = Math.max(sprite.height, ...poses.map(p => p.img.height + bottomGap));
  const tips = {};
  for (const p of poses) {
    const out = Buffer.alloc(W * H * 4), ox = Math.round(halfW + (spriteCentre - sprite.width / 2) - baseCentre(p.img)), oy = H - bottomGap - p.img.height;
    for (let y = 0; y < p.img.height; y++) for (let x = 0; x < p.img.width; x++) {
      const tx = x + ox, ty = y + oy; if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      p.img.pixels.copy(out, (ty * W + tx) * 4, (y * p.img.width + x) * 4, (y * p.img.width + x) * 4 + 4);
    }
    const canvas = {width: W, height: H, pixels: out};
    if (TIP[p.name]) tips[p.name] = TIP[p.name](canvas);
    write(`public/assets/rabbits/peintre/peintre-${version}-pose-${p.name}.png`, encodePng(canvas));
  }
  show.versions[version] = {canvas: {width: W, height: H}, tips};
  console.log(version, 'poses', W, H, JSON.stringify(tips));
}

// ---------- effects sheet ----------
/** The painted pieces of a sheet: its opaque islands (8-connected), the largest `count`, in reading order (rows, then columns). */
function pieces(img, count) {
  const w = img.width, h = img.height, label = new Int32Array(w * h).fill(-1), found = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] >= 0 || img.pixels[start * 4 + 3] <= 40) continue;
    const id = found.length, stack = [start]; label[start] = id; let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i - x) / w; n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (label[j] < 0 && img.pixels[j * 4 + 3] > 40) { label[j] = id; stack.push(j); }
      }
    }
    found.push({id, n, box: {x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1}});
  }
  const big = found.sort((a, b) => b.n - a.n).slice(0, count);
  const rowOf = p => Math.floor((p.box.y + p.box.height / 2) / (h / 2));
  big.sort((a, b) => rowOf(a) - rowOf(b) || a.box.x - b.box.x);
  // Each piece alone: the pixels of its own island (a neighbour's spill never comes along).
  return big.map(p => { const c = crop(img, p.box); for (let y = 0; y < p.box.height; y++) for (let x = 0; x < p.box.width; x++) if (label[(p.box.y + y) * w + p.box.x + x] !== p.id) c.pixels[(y * p.box.width + x) * 4 + 3] = 0; return c; });
}
const EFFECTS = [['stroke', 256], ['star', 96], ['swirl', 96], ['sunflower', 128], ['bud', 64], ['splat-yellow', 96], ['splat-blue', 96], ['drop', 32]];
const sheet = keyed('effets');
pieces(sheet, EFFECTS.length).forEach((piece, k) => {
  const [name, width] = EFFECTS[k], out = fit(piece, width);
  write(`public/assets/effects/peintre/${name}.png`, encodePng(out)); show.effects[name] = {width: out.width, height: out.height};
});

// ---------- easel, frame, sky ----------
const easelRaw = keyed('chevalet'), easel = fit(crop(easelRaw, box(easelRaw, 8)), 256);
write('public/assets/effects/peintre/easel.png', encodePng(easel)); show.effects.easel = {width: easel.width, height: easel.height};
const frameRaw = keyed('cadre'), frame = fit(crop(frameRaw, box(frameRaw, 8)), 640);
write('public/assets/effects/peintre/frame.png', encodePng(frame)); show.effects.frame = {width: frame.width, height: frame.height};
const skyRaw = decodeRgbPng(readFileSync(`${source}/ciel.png`)), skyH = Math.round(skyRaw.width * 853 / 1280);
const sky = resize(crop(skyRaw, {x: 0, y: Math.max(0, Math.floor((skyRaw.height - skyH) / 2)), width: skyRaw.width, height: Math.min(skyH, skyRaw.height)}), 1280, 853);
write('public/assets/effects/peintre/sky.png', encodePng(sky)); show.effects.sky = {width: 1280, height: 853};
for (const name of ['effets', 'chevalet', 'cadre', 'ciel', 'toile']) write(`assets-source/rabbits/peintre/show/${name}.png`, readFileSync(`${source}/${name}.png`));

// ---------- the canvas, stroke by stroke ----------
export const CANVAS_STEPS = 6;
const toile = fit(decodeRgbPng(readFileSync(`${source}/toile.png`)), 320), cw = toile.width, ch = toile.height;
let seed = 24112026; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
// Each pixel's moment (0 → 1): many short strokes laid along the branches' slant, the first ones low on the left, the last ones top
// right, with some disorder; a pixel no stroke covers comes with the last touch.
const when = new Float32Array(cw * ch).fill(1);
const strokes = Array.from({length: 520}, () => {
  const x = random() * cw, y = random() * ch, slant = -.6 + (random() - .5) * .7;
  return {x, y, slant, length: 14 + random() * 34, width: 4 + random() * 7, t: Math.min(.98, .62 * ((x / cw) * .55 + (1 - y / ch) * .45) + .36 * random())};
}).sort((a, b) => a.t - b.t);
for (const s of strokes) {
  const c = Math.cos(s.slant), d = Math.sin(s.slant), r = s.length / 2 + s.width;
  for (let y = Math.max(0, Math.floor(s.y - r)); y < Math.min(ch, s.y + r); y++) for (let x = Math.max(0, Math.floor(s.x - r)); x < Math.min(cw, s.x + r); x++) {
    const u = (x - s.x) * c + (y - s.y) * d, v = -(x - s.x) * d + (y - s.y) * c;
    if ((u / (s.length / 2)) ** 2 + (v / (s.width / 2)) ** 2 <= 1 && when[y * cw + x] > s.t) when[y * cw + x] = s.t;
  }
}
/** The bare canvas: its own light primed linen, a little uneven. */
const bare = (x, y) => { const n = Math.sin(x * 1.7) * Math.sin(y * 2.3) * 4 + ((x * 7 + y * 13) % 5); return [244 + n, 238 + n, 224 + n]; };
for (let k = 0; k <= CANVAS_STEPS; k++) {
  const limit = k / CANVAS_STEPS, out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = y * cw + x, painted = k === CANVAS_STEPS || when[i] <= limit, b = bare(x, y);
    for (let c = 0; c < 3; c++) out[i * 4 + c] = painted ? toile.pixels[i * 4 + c] : Math.round(b[c]);
    out[i * 4 + 3] = 255;
  }
  write(`public/assets/effects/peintre/canvas-${k}.png`, encodePng({width: cw, height: ch, pixels: out}));
}
show.effects.canvas = {width: cw, height: ch, steps: CANVAS_STEPS};
writeFileSync('src/config/peintreShow.json', JSON.stringify(show, null, 2) + '\n');
console.log('effects', JSON.stringify(show.effects));
