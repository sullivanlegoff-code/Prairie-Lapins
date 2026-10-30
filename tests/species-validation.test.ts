import {describe, expect, it} from 'vitest';
import {SPECIES_ENTRIES, SPECIES_IDS} from '../src/config/species';
import {validateSpeciesEntries} from '../src/config/validateSpecies';

/** Independent fixtures, never edits of the production catalogue. */
const procedural = {kind: 'procedural', coat: {body: '#123456', patch: '#abc'}};
const sprite = {kind: 'static-sprite', file: 'assets/rabbits/sample/sample.png', texture: 'sample-texture',
  width: 100, height: 120, worldWidth: 40, groundY: 12, preloadOrder: 0};
const recipe = {kind: 'recipe', requiredTypes: ['feu'], minAffection: 4};
const entry = (id = 'sample') => ({id, name: 'Sample', rarity: 'common', types: ['paille'], progression: {unlockLevel: 1}, acquisition: [], art: procedural});
const invalid: [string, unknown, string][] = [
  ['missing object', null, 'entry'],
  ...['', ' ', 'Rabbit', 'two_words', '-leading', 'trailing-', 'two--hyphens', 'slash/id'].map(id => ['id '+id, {...entry(), id}, 'id'] as [string, unknown, string]),
  ['empty name', {...entry(), name: '  '}, 'name'],
  ['unknown rarity', {...entry(), rarity: 'mythic'}, 'rarity'],
  ['empty types', {...entry(), types: []}, 'types'],
  ['unknown type', {...entry(), types: ['water']}, 'types.0'],
  ['duplicate types', {...entry(), types: ['feu','feu']}, 'types'],
  ...[0,31,1.5,NaN,Infinity].map(unlockLevel => ['level '+unlockLevel, {...entry(), progression: {unlockLevel}}, 'progression.unlockLevel'] as [string, unknown, string]),
  ['unknown source', {...entry(), acquisition: [{kind: 'gift'}]}, 'acquisition.0.kind'],
  ...[-1,1.5,NaN,Infinity].map(price => ['price '+price, {...entry(), acquisition: [{kind: 'shop', price}]}, 'acquisition.0.price'] as [string, unknown, string]),
  ['conditionless recipe', {...entry(), acquisition: [{kind: 'recipe', minAffection: 2}]}, 'acquisition.0.requiredTypes'],
  ['empty requirements', {...entry(), acquisition: [{...recipe, requiredTypes: []}]}, 'acquisition.0.requiredTypes'],
  ['unknown requirement', {...entry(), acquisition: [{...recipe, requiredTypes: ['water']}]}, 'acquisition.0.requiredTypes.0'],
  ['duplicate requirements', {...entry(), acquisition: [{...recipe, requiredTypes: ['feu','feu']}]}, 'acquisition.0.requiredTypes'],
  ['five requirements', {...entry(), acquisition: [{...recipe, requiredTypes: ['paille','neige','feu','metal','vol']}]}, 'acquisition.0.requiredTypes'],
  ['one exact parent', {...entry(), acquisition: [{...recipe, parents: ['sample']}]}, 'acquisition.0.parents'],
  ['three exact parents', {...entry(), acquisition: [{...recipe, parents: ['sample','sample','sample']}]}, 'acquisition.0.parents'],
  ['unknown parent', {...entry(), acquisition: [{...recipe, parents: ['sample','absent']}]}, 'acquisition.0.parents.1'],
  ...[0,21,2.5,NaN,Infinity].map(minAffection => ['affection '+minAffection, {...entry(), acquisition: [{...recipe, minAffection}]}, 'acquisition.0.minAffection'] as [string, unknown, string]),
  ...[0,-1,100,NaN,Infinity].map(probability => ['probability '+probability, {...entry(), acquisition: [{...recipe, probability}]}, 'acquisition.0.probability'] as [string, unknown, string]),
  ['unknown art mode', {...entry(), art: {kind: 'atlas'}}, 'art.kind'],
  ...['/assets/rabbits/a.png', 'assets/other/a.png', 'https://example.test/a.png', 'assets/rabbits/../a.png', 'assets/rabbits/./a.png', 'assets/rabbits//a.png', 'assets/rabbits/%2e%2e/a.png', 'assets/rabbits/a.png?x=1', 'assets/rabbits/a.png#x', 'assets/rabbits/a\\b.png', 'assets/rabbits/'].map(file => ['path '+file, {...entry(), art: {...sprite, file}}, 'art.file'] as [string, unknown, string]),
  ['empty texture', {...entry(), art: {...sprite, texture: ' '}}, 'art.texture'],
  ...['width','height','worldWidth'].flatMap(field => [0,-1,NaN,Infinity].map(value => [field+' '+value, {...entry(), art: {...sprite, [field]: value}}, 'art.'+field] as [string, unknown, string])),
  ['fractional pixels', {...entry(), art: {...sprite, width: 1.5}}, 'art.width'],
  ['infinite anchor', {...entry(), art: {...sprite, groundY: Infinity}}, 'art.groundY'],
  ['NaN anchor', {...entry(), art: {...sprite, groundY: NaN}}, 'art.groundY'],
  ...[-1,1.5,NaN,Infinity].map(preloadOrder => ['order '+preloadOrder, {...entry(), art: {...sprite, preloadOrder}}, 'art.preloadOrder'] as [string, unknown, string]),
  ['missing coat', {...entry(), art: {kind: 'procedural'}}, 'art.coat'],
  ['missing body', {...entry(), art: {kind: 'procedural', coat: {patch: '#fff'}}}, 'art.coat.body'],
  ['missing patch', {...entry(), art: {kind: 'procedural', coat: {body: '#fff'}}}, 'art.coat.patch'],
  ...['red','123456','#12345g','#12345678',''].map(body => ['colour '+body, {...entry(), art: {kind: 'procedural', coat: {body, patch: '#fff'}}}, 'art.coat.body'] as [string, unknown, string]),
  ['invalid flag', {...entry(), art: {kind: 'procedural', coat: {...procedural.coat, wings: 'yes'}}}, 'art.coat.wings'],
];

describe('species catalogue validation', () => {
  it('accepts the real original entries without changing them or losing their order', () => {
    const before = structuredClone(SPECIES_ENTRIES);
    expect(validateSpeciesEntries(SPECIES_ENTRIES)).toEqual([]);
    expect(SPECIES_ENTRIES).toEqual(before);
    expect(SPECIES_ENTRIES.map(e => e.id)).toEqual(SPECIES_IDS);
  });
  it.each(invalid)('identifies the species and field for %s', (_name, fixture, field) => {
    const diagnostics = validateSpeciesEntries([fixture]);
    expect(diagnostics).toContainEqual(expect.objectContaining({index: 0, species: fixture && typeof fixture === 'object' && 'id' in fixture && fixture.id ? fixture.id : '<entry 0>', field}));
    expect(diagnostics.every(d => d.message.length > 0)).toBe(true);
  });
  it('detects duplicate ids in the raw list even when a lookup would overwrite them', () => {
    expect(validateSpeciesEntries([entry(), entry()])).toContainEqual({index: 1, species: 'sample', field: 'id', message: 'Duplicate species id'});
  });
  it.each([{kind: 'shop', price: 0}, {kind: 'historical-breeding'}, recipe])('rejects duplicate $kind sources', source => {
    expect(validateSpeciesEntries([{...entry(), acquisition: [source,source]}])).toContainEqual(expect.objectContaining({species: 'sample', field: 'acquisition.1.kind'}));
  });
  it('identifies duplicate textures and preload orders across distinct entries', () => {
    const diagnostics = validateSpeciesEntries([{...entry('first'), art: sprite}, {...entry('second'), art: sprite}]);
    for (const field of ['art.texture','art.preloadOrder']) expect(diagnostics).toContainEqual(expect.objectContaining({index: 1, species: 'second', field}));
  });
  it('allows two distinct species with identical elements and requirements independent of displayed types, combined with exact parents', () => {
    const acquisition = [{...recipe, requiredTypes: ['paille','neige','metal','vol'], parents: ['first','second']}];
    const entries = [{...entry('first'), types: ['feu'], acquisition}, {...entry('second'), types: ['feu'], acquisition}];
    expect(validateSpeciesEntries(entries)).toEqual([]);
  });
  it('allows one required element or exact parents alone, including two parents of the same species', () => {
    for (const source of [recipe, {kind: 'recipe', parents: ['sample','sample'], minAffection: 1, probability: .5}])
      expect(validateSpeciesEntries([{...entry(), acquisition: [source]}])).toEqual([]);
  });
  it('keeps historical elements, common historical breeding and current upper boundaries valid', () => {
    expect(validateSpeciesEntries([{...entry(), types: ['metal','arc-en-ciel'], acquisition: [{kind: 'shop', price: 0}, {kind: 'historical-breeding'}]},
      {...entry('legacy'), rarity: 'epic', progression: {unlockLevel: 30}, acquisition: [{...recipe, minAffection: 20, probability: 99.5}]}])).toEqual([]);
  });
  it('does not require a coat on a sprite, contiguous preload orders or a nonnegative anchor', () => {
    expect(validateSpeciesEntries([{...entry(), art: {...sprite, preloadOrder: 99, groundY: -2, worldWidth: .5}}])).toEqual([]);
  });
});
