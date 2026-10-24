import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import manifest from '../src/config/islandStageArt.json';

// Integrity only: the full re-derivation (`node scripts/derive-island-stages.mjs --check`) decodes about 70 MB of
// masters and is kept out of the parallel suite.
const sha1 = url => createHash('sha1').update(readFileSync(new URL(url, import.meta.url))).digest('hex');
const webp = file => {const b = readFileSync(new URL(`../public/assets/island/stages/${file}`, import.meta.url)); return b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';};

describe('painted island stages production files', () => {
  it('ship exactly the recorded files, unaltered', () => {
    const files = readdirSync(new URL('../public/assets/island/stages/', import.meta.url)).sort();
    expect(files).toEqual(Object.keys(manifest.files).sort());
    for (const [file, digest] of Object.entries(manifest.files)) {
      expect(webp(file), file).toBe(true);
      expect(sha1(`../public/assets/island/stages/${file}`), file).toBe(digest);
    }
  });
  it('were derived from the retained masters', () => {
    for (const stage of manifest.stages) expect(sha1(`../assets-source/island/stages/stage-${stage.stage}.png`)).toBe(stage.source);
    expect(sha1('../assets-source/island/stages/grass-tile.png')).toBe(manifest.grass.source);
  });
});
