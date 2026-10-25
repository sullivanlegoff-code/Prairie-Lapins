// Reduce approved cropped RGBA masters on the same pixel grid as the published sprite. Node built-ins only.
// Placement and approved hashes live beside each master in blink.json.
// --check is read-only and verifies the complete reproducible manifest and all bytes.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {decodePng, encodePng} from './derive-nursery-overlays.mjs';
import {resizeRegion} from './resize-rgba.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const sha1 = bytes => createHash('sha1').update(bytes).digest('hex');
const registry = readFileSync(join(root, 'src/config/species.ts'), 'utf8');
const species = [...registry.matchAll(/\{id: '([^']+)'[^\n]+?art: \{kind: 'static-sprite', file: '([^']+)'/g)]
  // Ardent never blinks; sprites delivered later wait for their approved patches (blink.json beside the master).
  .filter(([, id]) => id !== 'ardent' && existsSync(join(root, 'assets-source/rabbits', id, 'blink.json')));
if (species.length !== 18) throw Error(`Expected 18 static sprites with blink masters, got ${species.length}`);
const manifest = {};
let failed = false;
for (const [, id, spriteFile] of species) {
  try {
    const sourceDir = join(root, 'assets-source/rabbits', id);
    const placement = JSON.parse(readFileSync(join(sourceDir, 'blink.json'), 'utf8'));
    const sprite = readFileSync(join(root, 'public', spriteFile));
    const master = readFileSync(join(sourceDir, 'sprite.png'));
    const original = decodePng(master), loaded = decodePng(sprite);
    if (sha1(master) !== placement.spriteSha1) throw Error('original sprite SHA-1 differs');
    const entry = {sprite: spriteFile, spriteSha1: sha1(sprite), spriteWidth: loaded.width, spriteHeight: loaded.height};
    for (const kind of ['eyes-closed', 'nose-twitch']) {
      const source = `assets-source/rabbits/${id}/${kind}.png`;
      const bytes = readFileSync(join(root, source));
      const patch = decodePng(bytes);
      const {x, y, sourceSha1} = placement[kind];
      if (sha1(bytes) !== sourceSha1) throw Error(`${kind}: approved source SHA-1 differs`);
      if (![x, y].every(Number.isInteger) || x < 0 || y < 0 || x + patch.width > original.width || y + patch.height > original.height)
        throw Error(`${kind}: patch outside original sprite`);
      if (!patch.pixels.some((v, i) => i % 4 === 3 && v > 0)) throw Error(`${kind}: empty patch`);
      const resized = resizeRegion(patch, original.width, original.height, loaded.width, loaded.height, x, y);
      const derived = encodePng(resized);
      const file = `assets/rabbits/${id}/${id}-${kind}.png`;
      entry[kind] = {file, x: resized.x, y: resized.y, width: resized.width, height: resized.height, source, sourceSha1: sha1(bytes), derivedSha1: sha1(derived)};
      if (check) {
        if (!readFileSync(join(root, 'public', file)).equals(derived)) throw Error(`${kind}: derivative differs`);
      } else {
        mkdirSync(dirname(join(root, 'public', file)), {recursive: true});
        writeFileSync(join(root, 'public', file), derived);
      }
    }
    manifest[id] = entry;
    console.log(`ok ${id}`);
  } catch (error) { console.error(`${id}: ${error.message}`); failed = true; }
}
if (!failed) {
  const path = join(root, 'src/config/rabbitBlinkArt.json');
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  if (check) {
    // A Windows checkout may turn the manifest's line endings into CRLF; only its content matters.
    if (readFileSync(path, 'utf8').replace(/\r\n/g, '\n') !== bytes.toString()) { console.error('Manifest differs'); failed = true; }
  } else writeFileSync(path, bytes);
}
if (failed) process.exitCode = 1;
