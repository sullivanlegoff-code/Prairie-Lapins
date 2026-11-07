import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {itAll} from './cases';
import {SPECIES_ENTRIES} from '../src/config/species';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';

import {EVOLVED_ART} from '../src/config/evolvedArt';

// 7 November 2026: every first drawing and every evolution has its painted eyelids and nose, except Ardent's first drawing
// (painted frames), sunglasses (Bouée's two drawings, Dadi's and Fantôme's evolutions: a nose only) and Benny (her own painted blink and nose).
const FIRST = SPECIES_ENTRIES.filter(entry => entry.art.kind === 'static-sprite' && !['ardent', 'benny'].includes(entry.id)).map(entry => entry.id);
const GLASSES = ['bouee', 'bouee-evolution', 'dadi-evolution', 'fantome-evolution'];
const kinds = key => GLASSES.includes(key) ? ['nose-twitch'] : ['eyes-closed', 'nose-twitch'];
// The October 2026 masters of the first 18 species were cut on the patch's own alpha: they are checked by the derivation only.
const LEGACY = new Set(['amethyste eyes-closed', 'feu eyes-closed', 'phoenix eyes-closed', 'roukette nose-twitch', 'wat-wat eyes-closed',
  ...['belier-gris', 'fluffy', 'frisket', 'glassofeu', 'icy', 'neige', 'paille', 'pic-pic', 'plume', 'princesse-neige', 'snk', 'virvoletant', 'volant']
    .flatMap(id => [`${id} eyes-closed`, `${id} nose-twitch`])]);
const MASTERS = [...FIRST.flatMap(id => kinds(id).filter(kind => !LEGACY.has(`${id} ${kind}`)).map(kind => [id, kind, ''])), ...EVOLVED_ART.flatMap(({id}) => kinds(`${id}-evolution`).map(kind => [id, kind, 'evolution-']))];

describe('rabbit blink artwork', () => {
  it('derives a reproducible manifest for every first drawing and every evolution', () => {
    execFileSync(process.execPath, ['scripts/derive-rabbit-art.mjs', '--check'], {stdio: 'pipe'});
    execFileSync(process.execPath, ['scripts/derive-rabbit-blinks.mjs', '--check'], {stdio: 'pipe'});
    const manifest = JSON.parse(readFileSync('src/config/rabbitBlinkArt.json', 'utf8'));
    expect(Object.keys(manifest).sort()).toEqual([...FIRST, ...EVOLVED_ART.map(({id}) => `${id}-evolution`)].sort());
    for (const entry of Object.values(manifest)) {
      for (const kind of ['eyes-closed', 'nose-twitch']) {
        const patch = entry[kind];
        if (!patch) continue;
        expect(Number.isInteger(patch.x) && Number.isInteger(patch.y)).toBe(true);
        expect(patch.x).toBeGreaterThanOrEqual(0);
        expect(patch.y).toBeGreaterThanOrEqual(0);
        expect(patch.width).toBeGreaterThan(0);
        expect(patch.height).toBeGreaterThan(0);
        expect(patch.x + patch.width).toBeLessThanOrEqual(entry.spriteWidth);
        expect(patch.y + patch.height).toBeLessThanOrEqual(entry.spriteHeight);
      }
    }
    for (const key of GLASSES) expect(manifest[key]['eyes-closed']).toBeUndefined();
  }, 60000);

  itAll(MASTERS)('%s %s (%s) keeps master alpha and an unchanged crop border around its local edit', (id, kind, prefix) => {
    const sourceDir = `assets-source/rabbits/${id}`;
    const master = decodePng(readFileSync(prefix ? `${sourceDir}/${id}-evolution-sprite.png` : `${sourceDir}/sprite.png`));
    const blink = JSON.parse(readFileSync(`${sourceDir}/blink.json`, 'utf8')), placement = prefix ? blink.evolution : blink;
    const patch = decodePng(readFileSync(`${sourceDir}/${prefix}${kind}.png`));
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
  });
});
