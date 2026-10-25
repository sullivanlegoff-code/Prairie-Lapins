import {expect, it, vi} from 'vitest';
import {portrait, COATS} from '../src/ui/portraits';
import {SPECIES, SPECIES_IDS, proceduralCoat, type SpeciesArt, type SpeciesDefinition} from '../src/config/species';
import {EXPECTED_ART} from './rabbit-art-fixtures';

it('preserves the four remaining historical procedural SVG portraits and the unknown portrait byte for byte', () => {
  for (const id of ['lunettes','perroquet','feu-glace','bouee',undefined] as const)
    expect(portrait(id)).toMatchSnapshot(id ?? 'unknown');
});

it('reads each procedural coat from the independent historical expectation, shared with the compatibility view', () => {
  for (const id of SPECIES_IDS) {
    const expected = EXPECTED_ART[id];
    if (expected.kind !== 'procedural') continue;
    expect(proceduralCoat(SPECIES[id].art)).toEqual(expected.coat);
    expect(Object.entries(COATS).find(([key]) => key === id)?.[1]).toBe(proceduralCoat(SPECIES[id].art));
  }
});
it('rejects incomplete procedural data in types and at runtime, without a generic portrait fallback', () => {
  // @ts-expect-error Procedural definitions must carry their own appearance.
  const absent: SpeciesArt = {kind: 'procedural'};
  // @ts-expect-error Both required colours must be present.
  const partial: SpeciesArt = {kind: 'procedural', coat: {body: '#123456'}};
  const original = SPECIES.lunettes.art;
  try {
    for (const art of [absent, partial]) {
      expect(() => proceduralCoat(art)).toThrow(RangeError);
      SPECIES.lunettes.art = art;
      expect(() => portrait('lunettes')).toThrow(RangeError);
    }
  } finally { SPECIES.lunettes.art = original; }
});
it('renders an isolated static-sprite definition without any coat or compatibility entry', async () => {
  const art = {kind: 'static-sprite', file: 'assets/rabbits/paille/paille-v1.png', texture: 'synthetic-static',
    width: 350, height: 495, worldWidth: 40, groundY: 12, preloadOrder: 6} as const satisfies SpeciesArt;
  const synthetic: SpeciesDefinition = {...SPECIES.dragon, art};
  expect(synthetic.art).not.toHaveProperty('coat');
  vi.resetModules();
  vi.doMock('../src/config/species', async importOriginal => {
    const actual = await importOriginal<typeof import('../src/config/species')>();
    return {...actual, SPECIES: {...actual.SPECIES, dragon: synthetic}};
  });
  try {
    const isolated = await import('../src/ui/portraits');
    expect(isolated.COATS).not.toHaveProperty('dragon');
    expect(isolated.portrait('dragon')).toContain('data-rabbit-art="dragon"');
    expect(isolated.portrait('dragon')).toContain(`src="${import.meta.env.BASE_URL}${art.file}"`);
  } finally {vi.doUnmock('../src/config/species'); vi.resetModules();}
});
