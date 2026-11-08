// Dadi « Superstar » on stage (owner, 6 November 2026): his poses and his standing microphone, painted from his approved evolved
// drawing on a flat magenta background (output/imagegen/noel-v5/, ignored): dadi-pose-<n>.png and dadi-micro.png.
// Each picture is cut out and brought to the evolved drawing's exact scale (public/assets/rabbits/dadi/dadi-v2.png): the height from
// the top of his red cap to the soles of his sneakers is the same in every picture, the soles sit as high above the bottom edge and the
// sneakers keep the same place from the picture's centre, so the meadow only swaps the texture (src/display/dadiStageView.ts).
// Writes public/assets/rabbits/dadi/stage/<name>.png and src/config/dadiStageFrames.json.
//   node scripts/prepare-dadi-stage.mjs "<folder>" [--check]
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, crop} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import {keyMagenta, resize} from './prepare-noel-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const REFERENCE = 'public/assets/rabbits/dadi/dadi-v2.png', OUT = 'public/assets/rabbits/dadi/stage', CONFIG = 'src/config/dadiStageFrames.json';
const isCapRed = (r, g, b, a) => a > 200 && r > 170 && g < 90 && b < 90;
/** Top of the red cap, soles (lowest opaque row) and the sneakers' centre (middle of the opaque pixels of the lowest 6 %). */
export function measure({width: w, height: h, pixels: p}) {
  let cap = h, sole = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (p[i + 3] > 16) sole = Math.max(sole, y);
    if (y < cap && isCapRed(p[i], p[i + 1], p[i + 2], p[i + 3])) cap = y;
  }
  const band = Math.max(2, Math.round((sole - cap) * .06)); let x0 = w, x1 = -1;
  for (let y = sole - band; y <= sole; y++) for (let x = 0; x < w; x++) if (p[(y * w + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  return {cap, sole, feet: (x0 + x1) / 2};
}
/** Places a cut-out picture on a transparent frame: soles `below` pixels above the bottom edge (as in the evolved drawing), sneakers
 * `offset` pixels right of the centre. */
function frame(img, m, offset, below) {
  const left = m.feet - offset, right = img.width - m.feet + offset, half = Math.ceil(Math.max(left, right)), width = half * 2, height = m.sole + 1 + below;
  const out = Buffer.alloc(width * height * 4), dx = Math.round(half + offset - m.feet);
  for (let y = 0; y < Math.min(height, img.height); y++) for (let x = 0; x < img.width; x++) {
    const u = x + dx; if (u < 0 || u >= width) continue;
    img.pixels.copy(out, (y * width + u) * 4, (y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
  }
  return {width, height, pixels: out};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2], check = process.argv.includes('--check');
  if (!folder) throw Error('Usage: node scripts/prepare-dadi-stage.mjs "<folder>" [--check]');
  const reference = decodeRgbPng(readFileSync(REFERENCE)), ref = measure(reference), height = ref.sole - ref.cap, offset = ref.feet - reference.width / 2, below = reference.height - 1 - ref.sole;
  const names = [...Array.from({length: 12}, (_, i) => `pose-${i + 1}`), 'micro'].filter(name => existsSync(`${folder}/dadi-${name}.png`));
  const config = {poses: {}, micro: null}, files = [];
  for (const name of names) {
    const cut = crop(keyMagenta(decodeRgbPng(readFileSync(`${folder}/dadi-${name}.png`)))), m = measure(cut), k = height / (m.sole - m.cap);
    const scaled = resize(cut, Math.max(1, Math.round(cut.width * k)), Math.max(1, Math.round(cut.height * k)));
    const placed = frame(scaled, measure(scaled), offset, below), size = {width: placed.width, height: placed.height};
    if (name === 'micro') config.micro = size; else config.poses[name] = size;
    files.push([`${OUT}/${name}.png`, placed]);
    console.log(`${name}: ${cut.width}x${cut.height} × ${k.toFixed(3)} -> ${placed.width}x${placed.height}`);
  }
  const text = JSON.stringify(config, null, 1) + '\n';
  if (check) { if (!existsSync(CONFIG) || readFileSync(CONFIG, 'utf8').replace(/\r\n/g, '\n') !== text) { console.error(`${CONFIG} is stale`); process.exit(1); } }
  else { mkdirSync(OUT, {recursive: true}); for (const [path, img] of files) writeFileSync(path, encodePng(img)); writeFileSync(CONFIG, text); }
}
