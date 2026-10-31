import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {SPECIES_ENTRIES} from '../src/config/species';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';

const ADDED_PATCH_SPECIES = ['ardent', 'boudinet', 'dinono', 'egiiipte', 'piment', 'tunini', 'bretonette',
  'dadi', 'maxou', 'magicien', 'dragon', 'requin', 'orange'];

describe('rabbit blink artwork', () => {
  it('has useful-resolution sprites and 31 aligned patch sets, excluding Bouee with sunglasses and Dinenette', () => {
    execFileSync(process.execPath, ['scripts/derive-rabbit-art.mjs', '--check'], {stdio: 'pipe'});
    execFileSync(process.execPath, ['scripts/derive-rabbit-blinks.mjs', '--check'], {stdio: 'pipe'});
    const eligible = SPECIES_ENTRIES.filter(entry => entry.art.kind === 'static-sprite' && entry.id !== 'bouee' && entry.id !== 'dinenette')
      .map(entry => entry.id).sort();
    const manifest = JSON.parse(readFileSync('src/config/rabbitBlinkArt.json', 'utf8'));
    expect(eligible).toEqual([
      'paille', 'neige', 'feu', 'belier-gris', 'volant', 'frisket', 'icy', 'snk', 'pic-pic',
      'amethyste', 'princesse-neige', 'fluffy', 'virvoletant', 'phoenix', 'roukette',
      'wat-wat', 'glassofeu', 'plume',
      ...ADDED_PATCH_SPECIES,
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

  it.each(ADDED_PATCH_SPECIES)('%s keeps master alpha and an unchanged crop border around each local edit', id => {
    const sourceDir = `assets-source/rabbits/${id}`;
    const master = decodePng(readFileSync(`${sourceDir}/sprite.png`));
    const placement = JSON.parse(readFileSync(`${sourceDir}/blink.json`, 'utf8'));
    for (const kind of ['eyes-closed', 'nose-twitch']) {
      const patch = decodePng(readFileSync(`${sourceDir}/${kind}.png`));
      const {x, y} = placement[kind];
      let changed = 0, alphaMatches = true, borderMatches = true;
      for (let row = 0; row < patch.height; row++) for (let col = 0; col < patch.width; col++) {
        const p = (row * patch.width + col) * 4, m = ((row + y) * master.width + col + x) * 4;
        if (patch.pixels[p + 3] !== master.pixels[m + 3]) alphaMatches = false;
        const same = patch.pixels.subarray(p, p + 4).equals(master.pixels.subarray(m, m + 4));
        if (!same) changed++;
        if ((row < 4 || col < 4 || row >= patch.height - 4 || col >= patch.width - 4) && !same) borderMatches = false;
      }
      expect(alphaMatches).toBe(true);
      expect(borderMatches).toBe(true);
      expect(changed).toBeGreaterThan(0);
      expect(changed).toBeLessThan(patch.width * patch.height);
    }
  });
});
