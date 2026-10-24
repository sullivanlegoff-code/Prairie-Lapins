// Approved RGBA sources -> cropped, premultiplied area averages. Node built-ins only.
// --check verifies source AND derivative SHA-1 and reproducible bytes; never writes.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {decodePng, encodePng} from './derive-nursery-overlays.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'scripts/decoration-art-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const sha1 = bytes => createHash('sha1').update(bytes).digest('hex');
const check = process.argv.includes('--check');
const target = join(root, 'public/assets/decorations');
if (!check) mkdirSync(target, {recursive: true});
let failed = false;
for (const [id, entry] of Object.entries(manifest)) {
  try {
    const source = readFileSync(join(root, 'assets-source/decorations', `${id}.png`));
    if (sha1(source) !== entry.sourceSha1) throw Error('source SHA-1 differs');
    const image = decodePng(source);
    let left = image.width, top = image.height, right = -1, bottom = -1;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      if (image.pixels[(y * image.width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right < left) throw Error('empty source');
    left = Math.max(0, left - 2); top = Math.max(0, top - 2);
    right = Math.min(image.width - 1, right + 2); bottom = Math.min(image.height - 1, bottom + 2);
    const w = right - left + 1, h = bottom - top + 1;
    const ratio = Math.min(1, 320 / Math.max(w, h));
    const width = Math.round(w * ratio), height = Math.round(h * ratio), pixels = Buffer.alloc(width * height * 4);
    // Integer overlap weights: source coordinates are expressed in output-size units.
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let a = 0, r = 0, g = 0, b = 0;
      for (let sy = Math.floor(y * h / height); sy < Math.ceil((y + 1) * h / height); sy++) {
        const wy = Math.min((y + 1) * h, (sy + 1) * height) - Math.max(y * h, sy * height);
        for (let sx = Math.floor(x * w / width); sx < Math.ceil((x + 1) * w / width); sx++) {
          const wx = Math.min((x + 1) * w, (sx + 1) * width) - Math.max(x * w, sx * width);
          const k = ((top + sy) * image.width + left + sx) * 4, alpha = image.pixels[k + 3], weight = wx * wy;
          a += weight * alpha; r += weight * alpha * image.pixels[k]; g += weight * alpha * image.pixels[k + 1]; b += weight * alpha * image.pixels[k + 2];
        }
      }
      const k = (y * width + x) * 4;
      pixels[k + 3] = Math.round(a / (w * h));
      if (a) { pixels[k] = Math.round(r / a); pixels[k + 1] = Math.round(g / a); pixels[k + 2] = Math.round(b / a); }
    }
    const derived = encodePng({width, height, pixels}), path = join(target, `${id}.png`);
    if (check) {
      const stored = readFileSync(path);
      if (sha1(stored) !== entry.derivedSha1 || !stored.equals(derived)) throw Error('derived SHA-1 / reproducible bytes differ');
    } else { writeFileSync(path, derived); entry.derivedSha1 = sha1(derived); }
    console.log(`ok ${id} ${width}x${height}`);
  } catch (error) { console.error(`${id}: ${error.message}`); failed = true; }
}
if (!check && !failed) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
if (failed) process.exitCode = 1;
