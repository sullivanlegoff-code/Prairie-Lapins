// Reduce approved cropped RGBA masters on the same pixel grid as the published sprite. Node built-ins only.
// Placement and approved hashes live beside each master in blink.json.
// --check is read-only and verifies the complete reproducible manifest and all bytes.
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {decodePng, encodePng} from './derive-nursery-overlays.mjs';
import {resizeRegion} from './resize-rgba.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const sha1 = bytes => createHash('sha1').update(bytes).digest('hex');
const registry = readFileSync(join(root, 'src/config/species.ts'), 'utf8'), evolvedRegistry = readFileSync(join(root, 'src/config/evolvedArt.ts'), 'utf8');
// Every illustrated species whose folder holds a blink.json. Its top level places the first drawing's patches on sprite.png;
// its optional « evolution » section places the evolved drawing's on <id>-evolution-sprite.png (7 November 2026: the
// evolutions blink too). Either may hold one kind only (Bouée keeps her sunglasses: a nose, no eyelids) or none (Ardent's
// first drawing moves through painted frames instead). Benny has her own painted blink and nose.
const species = [...registry.matchAll(/\{id: '([^']+)'[^\n]+?art: \{kind: 'static-sprite', file: '([^']+)'/g)]
  .filter(([, id]) => existsSync(join(root, 'assets-source/rabbits', id, 'blink.json')));
const evolvedFile = id => evolvedRegistry.match(new RegExp(`\{id: '${id}',[^\n]*?file: '([^']+)'`))?.[1];
const manifest = {};
let failed = false;
/** One drawing: its served sprite, its master, and the patches placed on the master grid (`prefix` names the master files). */
function derive(key, id, spriteFile, masterFile, placement, prefix) {
  const sourceDir = join(root, 'assets-source/rabbits', id);
  const sprite = readFileSync(join(root, 'public', spriteFile));
  const master = readFileSync(join(sourceDir, masterFile));
  const original = decodePng(master), loaded = decodePng(sprite);
  if (sha1(master) !== placement.spriteSha1) throw Error('original sprite SHA-1 differs');
  const entry = {sprite: spriteFile, spriteSha1: sha1(sprite), spriteWidth: loaded.width, spriteHeight: loaded.height};
  const kinds = ['eyes-closed', 'nose-twitch'].filter(kind => placement[kind]);
  if (!kinds.length) return;
  for (const kind of kinds) {
    const source = `assets-source/rabbits/${id}/${prefix}${kind}.png`;
    const bytes = readFileSync(join(root, source));
    const patch = decodePng(bytes);
    const {x, y, sourceSha1} = placement[kind];
    if (sha1(bytes) !== sourceSha1) throw Error(`${kind}: approved source SHA-1 differs`);
    if (![x, y].every(Number.isInteger) || x < 0 || y < 0 || x + patch.width > original.width || y + patch.height > original.height)
      throw Error(`${kind}: patch outside original sprite`);
    if (!patch.pixels.some((v, i) => i % 4 === 3 && v > 0)) throw Error(`${kind}: empty patch`);
    const resized = resizeRegion(patch, original.width, original.height, loaded.width, loaded.height, x, y);
    const derived = encodePng(resized);
    const file = `assets/rabbits/${id}/${key}-${kind}.png`;
    entry[kind] = {file, x: resized.x, y: resized.y, width: resized.width, height: resized.height, source, sourceSha1: sha1(bytes), derivedSha1: sha1(derived)};
    if (check) {
      if (!readFileSync(join(root, 'public', file)).equals(derived)) throw Error(`${kind}: derivative differs`);
    } else {
      mkdirSync(dirname(join(root, 'public', file)), {recursive: true});
      writeFileSync(join(root, 'public', file), derived);
    }
  }
  manifest[key] = entry;
}
for (const [, id, spriteFile] of species) {
  try {
    const placement = JSON.parse(readFileSync(join(root, 'assets-source/rabbits', id, 'blink.json'), 'utf8'));
    derive(id, id, spriteFile, 'sprite.png', placement, '');
    if (placement.evolution) {
      const file = evolvedFile(id);
      if (!file) throw Error('evolution patches without an evolved drawing');
      derive(`${id}-evolution`, id, file, `${id}-evolution-sprite.png`, placement.evolution, 'evolution-');
    }
    console.log(`ok ${id}`);
  } catch (error) { console.error(`${id}: ${error.message}`); failed = true; }
}
if (!failed) {
  const path = join(root, 'src/config/rabbitBlinkArt.json');
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  if (check) {
    // Catalogue order may change without changing any art. Compare every entry, independently of top-level key order and CRLF.
    const orderedEntries = value => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    if (orderedEntries(JSON.parse(readFileSync(path, 'utf8'))) !== orderedEntries(manifest)) { console.error('Manifest differs'); failed = true; }
  } else writeFileSync(path, bytes);
}
if (failed) process.exitCode = 1;
