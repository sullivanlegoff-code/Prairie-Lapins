// Friends of « Le vol de Benny » (owner, 19 November 2026: « faire apparaître le lapin dragon de temps en temps qui vole
// derrière nous et le lapin volant »): the dragon rabbit and the flying rabbit seen from the side, flying right, each painted
// by the image model as two wing beats side by side on flat magenta (assets-source/benny-envol/ami-<kind>-planche.png).
// Each sheet is keyed, cut in its two halves, cropped to one common box (so the body stays put between beats), scaled to
// HEIGHT pixels, and written as a 2-frame strip public/assets/benny-envol/ami-<kind>.png. Prints each frame's aspect for
// BENNY_FLIGHT_FRIEND_ART (src/config/bennyFlightGameArt.ts).
//   node scripts/prepare-benny-flight-friends.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
import {keyMagenta, resize} from './prepare-noel-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const HEIGHT = 240;
const crop = (img, x0, y0, w, h) => { const out = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) img.pixels.copy(out, y * w * 4, ((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x0 + w) * 4); return {width: w, height: h, pixels: out}; };
for (const kind of ['dragon', 'volant']) {
  const sheet = keyMagenta(decodeRgbPng(readFileSync(`assets-source/benny-envol/ami-${kind}-planche.png`)));
  const half = Math.floor(sheet.width / 2), halves = [crop(sheet, 0, 0, half, sheet.height), crop(sheet, half, 0, half, sheet.height)];
  let x0 = half, y0 = sheet.height, x1 = -1, y1 = -1;
  for (const img of halves) for (let y = 0; y < img.height; y++) for (let x = 0; x < half; x++) if (img.pixels[(y * half + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const m = 4; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(half - 1, x1 + m); y1 = Math.min(sheet.height - 1, y1 + m);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, fw = Math.round(w * HEIGHT / h);
  const frames = halves.map(img => resize(crop(img, x0, y0, w, h), fw, HEIGHT));
  const strip = {width: fw * 2, height: HEIGHT, pixels: Buffer.alloc(fw * 2 * HEIGHT * 4)};
  frames.forEach((f, i) => { for (let y = 0; y < HEIGHT; y++) f.pixels.copy(strip.pixels, (y * strip.width + i * fw) * 4, y * fw * 4, (y + 1) * fw * 4); });
  writeFileSync(`public/assets/benny-envol/ami-${kind}.png`, encodePng(strip));
  console.log(kind, `${fw} × ${HEIGHT}`, 'aspect', (fw / HEIGHT).toFixed(2));
}
