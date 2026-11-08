// Before every build of the site: each WebP twin listed in src/config/webpTwins.json must exist and be made from the PNG that is
// there now (same SHA-256 as in scripts/webp-twin-hashes.json). Otherwise the game would show an old picture: run scripts/make-webp-twins.mjs again.
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const listed = JSON.parse(readFileSync('src/config/webpTwins.json', 'utf8')), twins = JSON.parse(readFileSync('scripts/webp-twin-hashes.json', 'utf8')), problems = [];
if (JSON.stringify([...listed].sort()) !== JSON.stringify(Object.keys(twins).sort())) problems.push('la liste des WebP et celle de leurs PNG diffèrent');
for (const [key, hash] of Object.entries(twins)) {
  const png = `public/${key}`, webp = png.replace(/\.png$/, '.webp');
  if (!existsSync(png)) problems.push(`${key} : le PNG n'existe plus`);
  else if (createHash('sha256').update(readFileSync(png)).digest('hex') !== hash) problems.push(`${key} : le PNG a changé depuis son WebP`);
  if (!existsSync(webp)) problems.push(`${key} : le WebP manque`);
}
if (problems.length) {
  console.error(problems.join('\n') + '\nRelance : PLAYWRIGHT_MODULE=<playwright> node scripts/make-webp-twins.mjs');
  process.exit(1);
}
console.log(`WebP twins checked: ${Object.keys(twins).length} pictures, each made from its current PNG.`);
