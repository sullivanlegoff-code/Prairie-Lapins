// Lapin Dragon with its mouth open, for its fire breath (owner's request of 31 October 2026; painting edited with ChatGPT).
// Only the snout is taken from the edit, registered on the approved master; everything else stays the original picture.
// Usage: node scripts/prepare-dragon-mouth.mjs output/imagegen/legendaires-v1/dragon-bouche-1.png
// Writes assets-source/rabbits/dragon/mouth-open.png (master frame, PAD columns wider); scripts/prepare-legendary-parts.mjs derives the game picture.
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decode, encode} from './png-rgba.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
/** Registration found on the head, horns and wing (mouth excluded): master point p lies at p × SCALE + OFFSET in the edit. */
const SCALE = 2.497983870967742, OFFSET = {x: -.5, y: .5};
/** Snout box in master pixels; feathered on its left and top sides, where it meets the original face. */
const BOX = {x0: 398, y0: 138, x1: 496, y1: 300}, FEATHER = 10;
/** Below the dropped jaw the original lop ear hangs on: where the edit is background, the original stays, fading in over EAR_FADE rows. */
const EAR_ROW = 258, EAR_FADE = 14, EAR_COLUMN = 462;
/** The open snout reaches beyond the master's right edge: the picture gains this many transparent columns on the right. */
export const PAD = 28;

const master = decode(readFileSync('assets-source/rabbits/dragon/sprite.png')), edit = decode(readFileSync(process.argv[2]));
const at = (img, x, y) => (y * img.width + x) * 4;
/** Bilinear sample of the edit, its white background turned into transparency. */
function editPixel(x, y) {
  const sx = x * SCALE + OFFSET.x, sy = y * SCALE + OFFSET.y, x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
  const out = [0, 0, 0, 0];
  for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const px = Math.min(edit.width - 1, Math.max(0, x0 + dx)), py = Math.min(edit.height - 1, Math.max(0, y0 + dy)), i = at(edit, px, py);
    const [r, g, b] = edit.rgba.subarray(i, i + 3), alpha = Math.max(0, Math.min(1, (250 - Math.min(r, g, b)) / 45));
    // Unmixed from the white background, so the antialiased outline leaves no pale fringe.
    const unmix = v => alpha > 0 ? Math.max(0, Math.min(255, (v - (1 - alpha) * 255) / alpha)) : 0;
    out[0] += w * alpha * unmix(r); out[1] += w * alpha * unmix(g); out[2] += w * alpha * unmix(b); out[3] += w * alpha;
  }
  return out[3] > 0 ? [out[0] / out[3], out[1] / out[3], out[2] / out[3], out[3] * 255] : [0, 0, 0, 0];
}
const W = master.width + PAD, result = Buffer.alloc(W * master.height * 4);
for (let y = 0; y < master.height; y++) master.rgba.copy(result, y * W * 4, y * master.width * 4, (y + 1) * master.width * 4);
for (let y = BOX.y0; y < Math.min(BOX.y1, master.height); y++) for (let x = BOX.x0; x < W; x++) {
  const i = (y * W + x) * 4, base = x < master.width ? [...result.subarray(i, i + 4)] : [0, 0, 0, 0], top = editPixel(x, y);
  // Under the dropped jaw, the chest fur is the original's alone: only the red lower lip of the edit comes down over it.
  if (y >= EAR_ROW + 4 && x < EAR_COLUMN && !(top[3] >= 200 && top[0] > top[2] + 25)) continue;
  // Where the edit is background, the red ear (never the lavender chin) shows again, its top rising towards its outer edge
  // as if it passed behind the dropped jaw, and fading in rather than being cut.
  if (top[3] < 128 && base[0] > base[2] + 25) {
    const earTop = EAR_ROW + 4 - Math.max(0, x - 430) * .9;
    if (y >= earTop - EAR_FADE) { result[i + 3] = Math.round(base[3] * Math.min(1, (y - earTop + EAR_FADE) / EAR_FADE)); continue; }
  }
  // Weight of the edit: 1 inside, fading to 0 on the left and top seams.
  const weight = Math.min(1, (x - BOX.x0) / FEATHER, (y - BOX.y0) / FEATHER);
  const a = top[3] * weight + base[3] * (1 - weight);
  if (a <= 0) { result.fill(0, i, i + 4); continue; }
  for (let c = 0; c < 3; c++) result[i + c] = Math.round((top[c] * top[3] * weight + base[c] * base[3] * (1 - weight)) / a);
  result[i + 3] = Math.round(a);
}
writeFileSync('assets-source/rabbits/dragon/mouth-open.png', encode({width: W, height: master.height, rgba: result}));
console.log(`mouth-open ${W}x${master.height}`);
