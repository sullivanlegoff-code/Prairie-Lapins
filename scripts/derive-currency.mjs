// Mechanical area downscale of the approved coin; no redrawing. Run with --check to compare decoded pixels.
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodePng, encodePng} from './derive-nursery-overlays.mjs';
import {resizeRegion} from './resize-rgba.mjs';

const source = decodePng(readFileSync(fileURLToPath(new URL('../assets-source/currency/coin.png', import.meta.url))));
const target = fileURLToPath(new URL('../public/assets/currency/coin.png', import.meta.url));
const derived = resizeRegion(source, source.width, source.height, 128, 128);
if (process.argv.includes('--check')) {
  const stored = decodePng(readFileSync(target));
  if (stored.width !== 128 || stored.height !== 128 || !stored.pixels.equals(derived.pixels)) throw new Error('Coin derivative differs');
  console.log('ok coin.png 128×128');
} else {
  const png = encodePng(derived); writeFileSync(target, png);
  console.log(`coin.png 128×128 ${png.length} bytes`);
}
