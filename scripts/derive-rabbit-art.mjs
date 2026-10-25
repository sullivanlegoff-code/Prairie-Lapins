// Node built-ins only. Approved masters, useful DPR-3 dimensions, reproducible SHA-1.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodePng, encodePng} from './derive-nursery-overlays.mjs';
import {resizeRegion} from './resize-rgba.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const check = process.argv.includes('--check');
const manifestPath = 'scripts/rabbit-art-manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
export const sha1 = bytes => createHash('sha1').update(bytes).digest('hex');
let failed = false;
const registryPath = 'src/config/species.ts';
let registry = readFileSync(registryPath, 'utf8');
for (const [id, entry] of Object.entries(manifest)) {
  try {
    const bytes = readFileSync(`assets-source/rabbits/${id}/sprite.png`);
    if (sha1(bytes) !== entry.sourceSha1) throw Error('source SHA-1 differs');
    const source = decodePng(bytes);
    if (source.width !== entry.sourceWidth || source.height !== entry.sourceHeight) throw Error('source dimensions differ');
    // 150x140 portrait, including 4px padding on each side; world squash max 1.06.
    const usefulWidth = Math.max(entry.worldWidth * 1.3 * 1.06 * 1.65 * 3, Math.min(142 * 3, 132 * 3 * source.width / source.height));
    const width = Math.min(source.width, Math.ceil(usefulWidth * 1.08));
    const height = Math.min(source.height, Math.round(source.height * width / source.width));
    const derived = encodePng(resizeRegion(source, source.width, source.height, width, height));
    if (entry.width !== width || entry.height !== height) throw Error('dimensions differ from useful-resolution calculation');
    const pattern = new RegExp(`(\\{id: '${id}'[^\\n]+?width: )\\d+(, height: )\\d+(, worldWidth: )([\\d.]+)`);
    const metadata = registry.match(pattern);
    if (!metadata || Number(metadata[4]) !== entry.worldWidth) throw Error('registry world width differs');
    const updated = registry.replace(pattern, `$1${width}$2${height}$3${entry.worldWidth}`);
    if (check && updated !== registry) throw Error('registry dimensions differ');
    registry = updated;
    const target = `public/${entry.file}`;
    if (check) {
      if (sha1(derived) !== entry.derivedSha1 || !readFileSync(target).equals(derived)) throw Error('derived SHA-1 / bytes differ');
    } else { writeFileSync(target, derived); entry.derivedSha1 = sha1(derived); }
    console.log(`ok ${id} ${source.width}x${source.height} -> ${width}x${height}`);
  } catch (error) { console.error(`${id}: ${error.message}`); failed = true; }
}
if (!check && !failed) {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(registryPath, registry);
}
if (failed) process.exitCode = 1;
