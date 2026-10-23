import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {SPECIES, SPECIES_IDS} from '../src/config/species';

it('matches the actual PNG headers for all registered sprites', () => {
    for (const id of SPECIES_IDS) {
      const art = SPECIES[id].art;
      if (art.kind !== 'static-sprite') continue;
      const png = readFileSync(new URL(`../public/${art.file}`, import.meta.url));
      expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
      expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([art.width,art.height]);
    }
  });
