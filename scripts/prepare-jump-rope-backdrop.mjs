// Backdrop of the jump-rope game (owner's choice, 3 November 2026: the painted island of decor v3 « Ciel dégagé », in front of
// the game's real sky). The painting (1536 x 1024 RGB, kept in assets-source/jump-rope/ile-kiosque.png) is split in two layers:
//  - island: the lawn and front cliff, sky removed above the horizon; the kiosk's footprint is filled with the lawn painted
//    1000 px to its right, so the kiosk can be scaled on its own on short screens;
//  - kiosk: the Kiosque à sauter cut out of the same painting (sky and lawn around it removed).
// The sky itself is drawn at runtime with the meadow's clouds (src/display/skyLayer.ts).
// Usage: `PLAYWRIGHT_MODULE=<installed playwright module> node scripts/prepare-jump-rope-backdrop.mjs` (WebP encoding in Chromium).
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng} from './prepare-rabbit-masters.mjs';
import {encodePng} from './derive-nursery-overlays.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const JUMP_ROPE_BACKDROP = {
  painting: 'assets-source/jump-rope/ile-kiosque.png', masters: 'assets-source/jump-rope', served: 'public/assets/jump-rope',
  /** First painting row kept in the island layer (above every horizon point). */
  islandTop: 470,
  /** Painting columns covered by the kiosk, and the offset of the lawn copied over them. */
  kioskColumns: [55, 470], patchOffset: 1000, patchBottom: 595,
  /** Box of the kiosk in the painting, before trimming. */
  kioskBox: {x0: 45, x1: 480, y0: 40, y1: 600},
  /** A point of the sky seen through the kiosk's back arch. */
  archSeeds: [[255, 300]],
};

const at = (image, x, y) => (y * image.width + x) * 4;
const green = (p, i) => p[i + 1] > p[i] + 8 && p[i + 1] > p[i + 2] + 25;
const grassy = (p, i) => p[i + 1] > p[i] + 2 && p[i + 1] > p[i + 2] + 18;
/** Blue sky, or the pale peach haze near the horizon. */
const skyLike = (p, i, y, height) => (p[i + 2] > p[i] + 12 && p[i + 2] >= p[i + 1] - 6) || (y > height * .38 && p[i] > 215 && p[i + 1] > 200 && p[i + 2] > 195);

export function islandLayer(image) {
  const {width, height, pixels: p} = image, {islandTop, kioskColumns: [k0, k1], patchOffset, patchBottom} = JUMP_ROPE_BACKDROP;
  const inKiosk = x => x >= k0 && x <= k1;
  // Horizon: first run of four green pixels per column (lower third downwards), median-smoothed.
  const raw = Array.from({length: width}, (_, x) => {
    if (inKiosk(x)) return height;
    for (let y = Math.round(height * .3); y < height - 4; y++) if ([0, 1, 2, 3].every(d => green(p, at(image, x, y + d)))) return y;
    return height;
  });
  const horizon = raw.map((_, x) => { const v = raw.slice(Math.max(0, x - 6), x + 7).sort((a, b) => a - b); return v[v.length >> 1]; });
  const out = Buffer.from(p);
  for (let x = 0; x < width; x++) {
    if (inKiosk(x)) continue;
    const near = horizon.slice(Math.max(0, x - 40), x + 41), top = Math.min(...near), bottom = Math.max(...near.filter(v => v < height)) + 4;
    for (let y = 0; y < bottom; y++) {
      const i = at(image, x, y);
      if (y < top - 2 || (!grassy(p, i) && (y === 0 || out[i - width * 4 + 3] === 0))) out[i + 3] = 0;
    }
  }
  // The kiosk's footprint: the lawn painted patchOffset columns to the right, shifted so its horizon follows a straight line
  // between the two sides of the kiosk, blended over 12 px at each side and at the bottom.
  const left = horizon[k0 - 13], right = horizon[k1 + 13], line = x => left + (right - left) * (x - (k0 - 13)) / (k1 - k0 + 26);
  const copy = Buffer.from(out);
  for (let x = k0 - 12; x <= k1 + 12; x++) {
    const shift = horizon[x + patchOffset] - Math.round(line(x));
    for (let y = 0; y < patchBottom + 12; y++) {
      const w = Math.min(1, (x - (k0 - 12)) / 12, ((k1 + 12) - x) / 12, (patchBottom + 12 - y) / 12);
      if (w <= 0) continue;
      const i = at(image, x, y), sy = Math.min(height - 1, Math.max(0, y + shift)), j = at(image, x + patchOffset, sy);
      for (let c = 0; c < 4; c++) out[i + c] = Math.round(copy[i + c] * (1 - w) + copy[j + c] * w);
    }
  }
  const rows = height - islandTop;
  return {width, height: rows, pixels: out.subarray(islandTop * width * 4)};
}

export function kioskLayer(image) {
  const {pixels: p, height} = image, {x0, x1, y0, y1} = JUMP_ROPE_BACKDROP.kioskBox, w = x1 - x0 + 1, h = y1 - y0 + 1;
  const alpha = new Uint8Array(w * h).fill(255), seen = new Uint8Array(w * h);
  const flood = (seeds, accept) => {
    const stack = [...seeds];
    while (stack.length) {
      const [x, y] = stack.pop(); if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const k = y * w + x; if (seen[k]) continue;
      if (!accept(at(image, x + x0, y + y0), y + y0)) continue;
      seen[k] = 1; alpha[k] = 0; stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  };
  const border = [];
  for (let x = 0; x < w; x++) border.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) border.push([0, y], [w - 1, y]);
  flood(border, (i, y) => y < 520 && skyLike(p, i, y, height));
  flood(border, (i, y) => y > 440 && grassy(p, i));
  // The sky painted through the back arch, then only the kiosk itself (largest opaque piece): no stray grass blades or haze.
  flood(JUMP_ROPE_BACKDROP.archSeeds.map(([x, y]) => [x - x0, y - y0]), (i, y) => skyLike(p, i, y, height));
  const label = new Int32Array(w * h).fill(-1), sizes = [];
  for (let k = 0; k < w * h; k++) {
    if (!alpha[k] || label[k] >= 0) continue;
    const id = sizes.length, stack = [k]; let size = 0; label[k] = id;
    while (stack.length) {
      const q = stack.pop(), x = q % w, y = (q - x) / w; size++;
      for (const n of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1])
        if (n >= 0 && alpha[n] && label[n] < 0) { label[n] = id; stack.push(n); }
    }
    sizes.push(size);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  for (let k = 0; k < w * h; k++) if (label[k] !== keep) alpha[k] = 0;
  // Trim to the painted kiosk.
  let left = w, right = 0, top = h, bottom = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[y * w + x]) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const cw = right - left + 1, ch = bottom - top + 1, pixels = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = at(image, x + left + x0, y + top + y0), o = (y * cw + x) * 4;
    p.copy(pixels, o, i, i + 3); pixels[o + 3] = alpha[(y + top) * w + x + left];
  }
  return {width: cw, height: ch, pixels, left: left + x0, top: top + y0};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const {painting, masters, served} = JUMP_ROPE_BACKDROP, image = decodeRgbPng(readFileSync(painting));
  mkdirSync(masters, {recursive: true}); mkdirSync(served, {recursive: true});
  const layers = {island: islandLayer(image), kiosk: kioskLayer(image)};
  for (const [name, layer] of Object.entries(layers)) writeFileSync(`${masters}/${name}.png`, encodePng(layer));
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const name of Object.keys(layers)) {
      const data = await page.evaluate(async png => {
        const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], {type: 'image/png'}));
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const buffer = new Uint8Array(await (await canvas.convertToBlob({type: 'image/webp', quality: .86})).arrayBuffer()); let text = '';
        for (let i = 0; i < buffer.length; i += 0x8000) text += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
        return btoa(text);
      }, readFileSync(`${masters}/${name}.png`).toString('base64'));
      writeFileSync(`${served}/${name}.webp`, Buffer.from(data, 'base64'));
    }
  } finally { await browser.close(); }
  const {kiosk, island} = layers;
  console.log(`island ${island.width}x${island.height} from row ${JUMP_ROPE_BACKDROP.islandTop}; kiosk ${kiosk.width}x${kiosk.height} at (${kiosk.left}, ${kiosk.top}), bottom row ${kiosk.top + kiosk.height}`);
}
