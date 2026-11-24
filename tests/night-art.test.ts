// Fusion Nucléaire lights up at night (owner, 24 November 2026: « la forme allumée la nuit et le jour la forme éteinte »).
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {NIGHT_ART_SPECIES, nightArtFor} from '../src/config/nightArt';
import {evolvedRabbitArt, rabbitArt} from '../src/config/rabbitArt';
import {SPECIES_IDS} from '../src/config/species';

const size = (url: string) => {
  const png = readFileSync(`public/${url.replace(/^\//, '').replace(/^.*?assets\//, 'assets/')}`);
  return {width: png.readUInt32BE(16), height: png.readUInt32BE(20)};
};

describe('rabbits that light up at night', () => {
  it('are Fusion Nucléaire only, at both stages', () => {
    expect(NIGHT_ART_SPECIES).toEqual(['fusion-nucleaire']);
    for (const species of SPECIES_IDS) {
      const base = rabbitArt(species), evolved = evolvedRabbitArt(species);
      expect(!!(base && nightArtFor(base)), species).toBe(species === 'fusion-nucleaire');
      if (evolved) expect(!!nightArtFor(evolved), species).toBe(species === 'fusion-nucleaire');
    }
  });

  it('have a lit drawing and its lights alone, each exactly the size of the day drawing it lies on', () => {
    for (const art of [rabbitArt('fusion-nucleaire')!, evolvedRabbitArt('fusion-nucleaire')!]) {
      const lit = nightArtFor(art)!;
      expect(lit.texture).toBe(`${art.texture}-night`);
      expect(lit.glow.texture).toBe(`${art.texture}-glow`);
      expect(size(lit.url)).toEqual({width: art.width, height: art.height});
      expect(size(lit.glow.url)).toEqual({width: art.width, height: art.height});
    }
  });
});
