import {readFileSync, readdirSync, statSync, unlinkSync, existsSync} from 'node:fs';
import {join, relative, extname, basename} from 'node:path';

/**
 * Plan 5.6 (23 November 2026): the published site no longer carries the PNG pictures the game never downloads. The game asks for
 * a picture's light WebP twin instead (`src/display/webpTwins.ts`, list in `src/config/webpTwins.json`); the PNG stays in `public/`
 * as the source. Every picture the scripts set (Phaser's loader, `img.src`, a CSS `url(...)` built in a script) asks for its twin
 * through `preferWebp`. A PNG is kept when its WebP is missing, for the app icons (iOS wants PNG), and whenever its file name is
 * written in a page, a style sheet, the manifest or a data file of the build: those are read as they are, without `preferWebp`.
 * Usage: node scripts/prune-png-twins.mjs <built site folder>
 */
const root = process.argv[2];
if (!root || !existsSync(join(root, 'index.html'))) throw new Error('Usage: prune-png-twins.mjs <built site folder>');
const twins = JSON.parse(readFileSync(new URL('../src/config/webpTwins.json', import.meta.url), 'utf8'));
// Not the scripts: they hold every picture's name (the twin list itself), and ask for the twins.
const TEXT = new Set(['.html', '.css', '.json', '.webmanifest', '.svg']);
const texts = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path); else if (TEXT.has(extname(name))) texts.push(readFileSync(path, 'utf8'));
  }
})(root);
const written = texts.join('\n');
let removed = 0, bytes = 0, kept = 0;
for (const twin of twins) {
  const png = join(root, twin), webp = png.slice(0, -4) + '.webp';
  if (!existsSync(png)) continue;
  if (twin.startsWith('assets/app/') || !existsSync(webp) || written.includes(basename(twin))) { kept++; continue; }
  bytes += statSync(png).size; unlinkSync(png); removed++;
}
console.log(`${relative(process.cwd(), root) || '.'}: ${removed} PNG removed (${(bytes / 1e6).toFixed(1)} MB), ${kept} kept`);
