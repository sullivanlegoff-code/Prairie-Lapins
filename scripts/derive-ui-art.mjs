// The painted interface kit (owner, 6 November 2026: concept B « Pierre et parchemin »). Each painted sheet in
// assets-source/ui/kit/ has its pieces on flat magenta; this cuts every piece out (magenta keyed to transparency, colour
// unmixed at the soft edges), trims it, scales it and writes public/assets/ui/kit/<piece>.webp (WebP keeps the alpha), with a manifest.
// Usage: PLAYWRIGHT_MODULE=<installed playwright module> node scripts/derive-ui-art.mjs [--check]
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
/** Each sheet: its pieces in reading order (top to bottom, then left to right), each with its final height in pixels.
 * `tile` sheets have no magenta: the whole image is scaled to `size` (a seamless texture). Magenta inside a piece (a frame's
 * empty middle) is keyed too. */
export const KIT = JSON.parse(readFileSync('scripts/ui-kit.json', 'utf8'));
const check = process.argv.includes('--check');
const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const browser = await chromium.launch(), manifest = {}, problems = [];
try {
  const page = await browser.newPage();
  mkdirSync('public/assets/ui/kit', {recursive: true});
  for (const [sheet, spec] of Object.entries(KIT)) {
    const source = `assets-source/ui/kit/${sheet}.png`, bytes = readFileSync(source);
    const pieces = await page.evaluate(async ({data, spec}) => {
      const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
      const image = await createImageBitmap(new Blob([bytes], {type: 'image/png'}));
      const W = image.width, H = image.height, canvas = new OffscreenCanvas(W, H), ctx = canvas.getContext('2d', {willReadFrequently: true});
      ctx.drawImage(image, 0, 0);
      const encode = async (c) => { const blob = await c.convertToBlob({type: 'image/webp', quality: .9}); const b = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
      const scaleTo = (src, w, h) => { const out = new OffscreenCanvas(w, h), o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(src, 0, 0, w, h); return out; };
      if (spec.tile) {
        // A mirrored 2 × 2 mosaic of the painting always repeats without a seam.
        const half = scaleTo(canvas, spec.size / 2, spec.size / 2), out = new OffscreenCanvas(spec.size, spec.size), o = out.getContext('2d');
        for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          o.save(); o.translate(sx < 0 ? spec.size : 0, sy < 0 ? spec.size : 0); o.scale(sx, sy); o.drawImage(half, 0, 0); o.restore();
        }
        return [{name: spec.pieces[0].name, width: spec.size, height: spec.size, data: await encode(out)}];
      }
      const img = ctx.getImageData(0, 0, W, H), px = img.data;
      // Magenta key: distance from #ff00ff, soft between two thresholds; the colour is unmixed from the magenta.
      const alpha = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) {
        const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
        const magenta = Math.min(r, b) - g; // high for magenta, low for everything else
        const a = Math.max(0, Math.min(1, (200 - magenta) / 120));
        alpha[i] = a;
      }
      // The background is the magenta connected to the border; a frame's middle is kept magenta only if `inner`.
      const background = new Uint8Array(W * H), stack = [];
      const push = i => { if (!background[i] && alpha[i] < .5) { background[i] = 1; stack.push(i); } };
      for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
      while (stack.length) { const i = stack.pop(), x = i % W, y = (i / W) | 0; if (x) push(i - 1); if (x < W - 1) push(i + 1); if (y) push(i - W); if (y < H - 1) push(i + W); }
      // Pieces: connected regions of solid pixels (8-way), small specks dropped.
      const label = new Int32Array(W * H).fill(-1), boxes = [];
      for (let start = 0; start < W * H; start++) {
        if (label[start] !== -1 || background[start] || alpha[start] < .5) continue;
        const id = boxes.length, box = {x0: W, y0: H, x1: 0, y1: 0, n: 0}; boxes.push(box);
        label[start] = id; stack.push(start);
        while (stack.length) {
          const i = stack.pop(), x = i % W, y = (i / W) | 0; box.n++;
          if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x; if (y < box.y0) box.y0 = y; if (y > box.y1) box.y1 = y;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const j = ny * W + nx; if (label[j] === -1 && !background[j] && alpha[j] >= .5) { label[j] = id; stack.push(j); }
          }
        }
      }
      // Merge boxes that overlap (a piece cut in two by a thin magenta line), then keep the big ones.
      let merged = boxes.filter(b => b.n > (spec.minPixels ?? 400));
      for (let changed = true; changed;) {
        changed = false;
        outer: for (let i = 0; i < merged.length; i++) for (let j = i + 1; j < merged.length; j++) {
          const a = merged[i], b = merged[j], m = spec.mergeGap ?? 6;
          if (a.x0 - m <= b.x1 && b.x0 - m <= a.x1 && a.y0 - m <= b.y1 && b.y0 - m <= a.y1) {
            merged[i] = {x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), n: a.n + b.n};
            merged.splice(j, 1); changed = true; break outer;
          }
        }
      }
      merged = merged.filter(b => b.n > (spec.minPiece ?? 4000));
      // Reading order: rows of boxes whose vertical centres are close, left to right inside a row.
      merged.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
      const rows = [];
      for (const b of merged) { const row = rows.find(r => Math.abs((r[0].y0 + r[0].y1) / 2 - (b.y0 + b.y1) / 2) < (b.y1 - b.y0) / 2); if (row) row.push(b); else rows.push([b]); }
      const ordered = rows.flatMap(r => r.sort((a, b) => a.x0 - b.x0));
      if (ordered.length !== spec.pieces.length) return {error: `${ordered.length} pieces found, ${spec.pieces.length} expected: ${JSON.stringify(ordered.map(b => [b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0]))}`};
      const out = [];
      for (const [k, box] of ordered.entries()) {
        const piece = spec.pieces[k], pad = 2;
        const x0 = Math.max(0, box.x0 - pad), y0 = Math.max(0, box.y0 - pad), w = Math.min(W - 1, box.x1 + pad) - x0 + 1, h = Math.min(H - 1, box.y1 + pad) - y0 + 1;
        const cut = new OffscreenCanvas(w, h), c = cut.getContext('2d'), data = c.createImageData(w, h), d = data.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y0 + y) * W + x0 + x, o = (y * w + x) * 4;
          // Every magenta pixel is keyed, the background and a frame's empty middle alike (pieces stand 60 px apart).
          const a = alpha[i];
          if (a <= .02) { d[o + 3] = 0; continue; }
          // Unmix: observed = a * colour + (1 - a) * magenta.
          const un = (v, m) => Math.max(0, Math.min(255, (v - (1 - a) * m) / a));
          let r = un(px[i * 4], 255), g = un(px[i * 4 + 1], 0), b = un(px[i * 4 + 2], 255);
          // Grey stone painted on magenta picks up a violet cast: `saturation` below 1 pulls it back towards neutral grey
          // (the painted pieces' own colours, such as green or red, use 1).
          const s = piece.saturation ?? 1;
          if (s !== 1) { const l = .3 * r + .59 * g + .11 * b; r = l + (r - l) * s; g = l + (g - l) * s; b = l + (b - l) * s; }
          // `brightness` (default 1) darkens or lightens the painted colour, like the red-brown title plank.
          const k = piece.brightness ?? 1; r *= k; g *= k; b *= k;
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(a * 255);
        }
        c.putImageData(data, 0, 0);
        const height = piece.height, width = Math.round(w * height / h);
        out.push({name: piece.name, width, height, box: [x0, y0, w, h], data: await encode(scaleTo(cut, width, height))});
      }
      return out;
    }, {data: bytes.toString('base64'), spec});
    if (!Array.isArray(pieces)) { problems.push(`${sheet}: ${pieces.error}`); continue; }
    for (const piece of pieces) {
      // `skip`: a painted piece the game no longer uses (the glossy buttons, replaced by the coloured stone on 7 November).
      if (spec.pieces.find(p => p.name === piece.name)?.skip) continue;
      const target = `public/assets/ui/kit/${piece.name}.webp`, png = Buffer.from(piece.data, 'base64');
      if (check) { if (!existsSync(target) || sha256(readFileSync(target)) !== sha256(png)) problems.push(`${target} differs from its source`); }
      else writeFileSync(target, png);
      manifest[piece.name] = {source, box: piece.box, width: piece.width, height: piece.height, sourceSha256: sha256(bytes), derivedSha256: sha256(png), bytes: png.length};
    }
  }
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
  else if (!check) { writeFileSync('assets-source/ui/kit/manifest.json', JSON.stringify(manifest, null, 2) + '\n'); console.log(JSON.stringify(manifest, null, 1)); }
  else console.log('UI kit up to date');
} finally { await browser.close(); }
