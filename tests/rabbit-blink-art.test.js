import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {SPECIES_ENTRIES} from '../src/config/species';

describe('rabbit blink artwork', () => {
  it('has useful-resolution sprites and exactly the 18 eligible aligned patch sets', () => {
    execFileSync(process.execPath, ['scripts/derive-rabbit-art.mjs', '--check'], {stdio: 'pipe'});
    execFileSync(process.execPath, ['scripts/derive-rabbit-blinks.mjs', '--check'], {stdio: 'pipe'});
    const eligible = SPECIES_ENTRIES.filter(entry => entry.art.kind === 'static-sprite' && entry.id !== 'ardent')
      .map(entry => entry.id).sort();
    const manifest = JSON.parse(readFileSync('src/config/rabbitBlinkArt.json', 'utf8'));
    expect(eligible).toEqual([
      'paille', 'neige', 'feu', 'belier-gris', 'volant', 'frisket', 'icy', 'snk', 'pic-pic',
      'amethyste', 'princesse-neige', 'fluffy', 'virvoletant', 'phoenix', 'roukette',
      'wat-wat', 'glassofeu', 'plume',
    ].sort());
    expect(Object.keys(manifest).sort()).toEqual(eligible);
    for (const entry of Object.values(manifest)) {
      for (const kind of ['eyes-closed', 'nose-twitch']) {
        const patch = entry[kind];
        expect(Number.isInteger(patch.x) && Number.isInteger(patch.y)).toBe(true);
        expect(patch.x).toBeGreaterThanOrEqual(0);
        expect(patch.y).toBeGreaterThanOrEqual(0);
        expect(patch.width).toBeGreaterThan(0);
        expect(patch.height).toBeGreaterThan(0);
        expect(patch.x + patch.width).toBeLessThanOrEqual(entry.spriteWidth);
        expect(patch.y + patch.height).toBeLessThanOrEqual(entry.spriteHeight);
      }
    }
  }, 30000);
});
