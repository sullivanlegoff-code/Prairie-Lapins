import {describe, expect, it} from 'vitest';
import {SPECIES, SPECIES_ENTRIES, SPECIES_IDS} from '../src/config/species';
import {validateSpeciesEntries} from '../src/config/validateSpecies';
import {RABBIT_ART, rabbitArt, SNOW_ART, STRAW_ART, LOP_ART, FIRE_ART, FLIGHT_ART} from '../src/config/rabbitArt';
import {portrait} from '../src/ui/portraits';
import {EXPECTED_ART, EXPECTED_IDS, type StaticArt} from './rabbit-art-fixtures';

describe('registry-owned art and URL adapter', () => {
  it('keeps every sprite definition and the explicit procedural modes', () => {
    expect(Object.fromEntries(SPECIES_IDS.map(id => [id, SPECIES[id].art]))).toEqual(EXPECTED_ART);
    expect(SPECIES_IDS.filter(id => SPECIES[id].art.kind === 'procedural')).toEqual(EXPECTED_IDS.filter(id => EXPECTED_ART[id].kind === 'procedural'));
  });
  it('preserves preload order and the complete public sprite objects, with deployment-relative URLs', () => {
    const ids = Object.entries(EXPECTED_ART).filter(([, art]) => art.kind === 'static-sprite').sort(([, a], [, b]) => (a as StaticArt).preloadOrder - (b as StaticArt).preloadOrder).map(([id]) => id);
    expect(RABBIT_ART).toEqual(ids.map(species => {
      const {kind, file, preloadOrder, facing, ...metadata} = EXPECTED_ART[species] as StaticArt; void kind; void preloadOrder;
      return {species, ...metadata, url: `${import.meta.env.BASE_URL}${file}`, facing: facing === 'left' ? -1 : 1};
    }));
    for (const [i, art] of [SNOW_ART,STRAW_ART,LOP_ART,FIRE_ART,FLIGHT_ART].entries()) {
      expect(art).toBe(RABBIT_ART[i]); expect(rabbitArt(ids[i])).toBe(art);
    }
    expect(rabbitArt('unknown')).toBeUndefined();
  });
  it('keeps original portrait markup for sprites and the historical SVG path for procedural species', () => {
    for (const id of SPECIES_IDS) {
      const art = rabbitArt(id);
      if (!art) {expect(portrait(id)).toMatch(/^<svg /); continue;}
      expect(portrait(id)).toBe(`<img src="${art.url}" alt="${SPECIES[id].name}" width="${art.width}" height="${art.height}" decoding="async" draggable="false" data-rabbit-art="${id}">`);
    }
  });
  it('carries the native direction of each picture: right by default, left only where the fixture says so, declarable without code', () => {
    for (const [id, art] of Object.entries(EXPECTED_ART)) if (art.kind === 'static-sprite') expect(rabbitArt(id)!.facing).toBe(art.facing === 'left' ? -1 : 1);
    expect(rabbitArt('paille')!.facing).toBe(-1); expect(rabbitArt('neige')!.facing).toBe(1);
    const entry = (facing?: string) => SPECIES_ENTRIES.map(e => e.id === 'neige' ? {...e, art: {...e.art, ...(facing ? {facing} : {})}} : e);
    expect(validateSpeciesEntries(entry('left') as never)).toEqual([]); expect(validateSpeciesEntries(entry('right') as never)).toEqual([]);
    expect(validateSpeciesEntries(entry('up') as never)).not.toEqual([]);
  });
});
