// Heart icon, element icons and the level-1 farm (26 October 2026). Sources: Codex imagegen paintings on a pure white backdrop
// (prompts in docs/hearts-elements-farm.md), kept outside the repository. Usage: node scripts/prepare-icons-v3.mjs "<folder>"
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {decodeRgbPng, cutOut} from './prepare-rabbit-masters.mjs';
import {encodePng, downscale} from './derive-nursery-overlays.mjs';
import {prepareArt} from './prepare-food-art.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

export const ICONS = [
  {id: 'heart', source: 'coeur-b', master: 'assets-source/currency/heart.png', served: 'public/assets/currency/heart.png', size: 128},
  ...['paille', 'neige', 'feu', 'metal', 'vol'].map(id => ({id, source: `element-${id}`, master: `assets-source/elements/${id}.png`, served: `public/assets/elements/${id}.png`, size: 96})),
];
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const folder = process.argv[2];
  if (!folder) throw Error('Usage: node scripts/prepare-icons-v3.mjs "<folder>"');
  prepareArt(folder, ICONS);
  // The level-1 farm keeps the full 1254 × 1254 canvas of the level-2 farm, so its five furrows stay at the same pixels.
  const farm = decodeRgbPng(readFileSync(`${folder}/ferme-niveau-1.png`)); cutOut(farm, 'light');
  mkdirSync('assets-source/buildings', {recursive: true});
  writeFileSync('assets-source/buildings/farm-level-1.png', encodePng(farm));
  writeFileSync('public/assets/buildings/farm-level-1.png', encodePng(farm.width === 1254 ? farm : downscale(farm, 1254)));
  console.log(`farm-level-1: ${farm.width}x${farm.height}`);
}
