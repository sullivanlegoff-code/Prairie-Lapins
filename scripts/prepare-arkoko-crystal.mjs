// Arkoko's crystal (owner, 19 November 2026: « la pierre brille trop », and an animation where it lights up strongly, then calms down).
// The approved drawing is never redrawn: its glow was only toned down in assets-source/rabbits/arkoko/sprite.png, and the original
// glow is kept whole in crystal-glow.png; crystal.png and evolution-crystal.png are the crystals alone, cut from the two masters.
// This script shrinks those patches on the same pixel grid as the game's sprites (scripts/derive-rabbit-art.mjs), so each lands exactly
// on its drawing, and writes where in src/config/arkokoCrystal.json.
// Usage: node scripts/prepare-arkoko-crystal.mjs [--check]
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodePng, encodePng} from './derive-nursery-overlays.mjs';
import {resizeRegion} from './resize-rgba.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const check = process.argv.includes('--check');
const sha1 = bytes => createHash('sha1').update(bytes).digest('hex');
const SOURCE = 'assets-source/rabbits/arkoko', TARGET = 'public/assets/rabbits/arkoko', CONFIG = 'src/config/arkokoCrystal.json';
const cuts = JSON.parse(readFileSync(`${SOURCE}/crystal.json`, 'utf8'));
const manifest = JSON.parse(readFileSync('scripts/rabbit-art-manifest.json', 'utf8'));
const PATCHES = [
  {key: 'glow', cut: cuts.glow, art: manifest.arkoko, file: 'arkoko-v1-crystal-glow.png'},
  {key: 'crystal', cut: cuts.crystal, art: manifest.arkoko, file: 'arkoko-v1-crystal.png'},
  {key: 'evolutionCrystal', cut: cuts.evolutionCrystal, art: manifest['arkoko-evolution'], file: 'arkoko-v2-crystal.png'},
];
const config = {};
let failed = false;
for (const {key, cut, art, file} of PATCHES) {
  const master = readFileSync(`${SOURCE}/${cut.master}`);
  if (sha1(master) !== art.sourceSha1) { console.error(`${key}: ${cut.master} is not the master the game shows`); failed = true; continue; }
  const bytes = readFileSync(`${SOURCE}/${cut.file}`), image = decodePng(bytes);
  const derived = resizeRegion(image, art.sourceWidth, art.sourceHeight, art.width, art.height, cut.x, cut.y), png = encodePng(derived);
  config[key] = {file: `assets/rabbits/arkoko/${file}`, x: derived.x, y: derived.y, width: derived.width, height: derived.height, spriteWidth: art.width, spriteHeight: art.height, sha1: sha1(png)};
  if (check) {
    let stored = null; try { stored = readFileSync(`${TARGET}/${file}`); } catch { /* missing */ }
    if (!stored || !stored.equals(png)) { console.error(`${key}: ${file} differs`); failed = true; } else console.log(`ok ${file} ${derived.width}x${derived.height} at ${derived.x},${derived.y}`);
  } else { writeFileSync(`${TARGET}/${file}`, png); console.log(`wrote ${file} ${derived.width}x${derived.height} at ${derived.x},${derived.y}`); }
}
const text = `${JSON.stringify(config, null, 2)}\n`;
if (check) { if (!failed && readFileSync(CONFIG, 'utf8') !== text) { console.error(`${CONFIG} differs`); failed = true; } } else if (!failed) writeFileSync(CONFIG, text);
if (failed) process.exitCode = 1;
