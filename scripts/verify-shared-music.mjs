// Runs automatically after the combined build; can also inspect any existing artifact.
import assert from 'node:assert/strict';
import {readdirSync, lstatSync, readFileSync} from 'node:fs';
import {resolve, join, relative} from 'node:path';

const root = resolve(process.argv[2] || 'netlify-site');
const names = ['indian-vibe-1.mp3', 'indian-vibe-2.mp3', 'indian-vibe-3.mp3', 'dragon-chill.mp3'];
const files = [];
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const file = join(directory, name), stat = lstatSync(file);
    assert.ok(!stat.isSymbolicLink(), `No symlinks in artifact: ${file}`);
    if (stat.isDirectory()) walk(file);
    else if (/\.mp3$/i.test(name)) files.push(file);
  }
}
walk(root);
assert.deepEqual(files.map(file => relative(root, file).replaceAll('\\', '/')).sort(),
  names.map(name => `assets/audio/music/${name}`).sort(), 'Exactly four shared MP3s, none under dev/');
let total = 0;
for (const name of names) {
  const bytes = readFileSync(join(root, 'assets/audio/music', name));
  assert.ok(bytes.equals(readFileSync(join('public/assets/audio/music', name))), `Music must remain unchanged: ${name}`);
  total += bytes.length;
}
console.log(`Shared music checked: ${files.length} MP3s, ${total} bytes, identical to public sources.`);
