import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {EXPECTED_ART, EXPECTED_IDS, EXPECTED_RECIPE_IDS, HISTORICAL_LEVELS, NEW_RARES, STANDARD_RARE} from './rabbit-art-fixtures';
import * as balance from '../src/config/balance';
import * as registry from '../src/config/species';
import {PROGRESSION, type ProgressionConfig} from '../src/config/progression';
import {requiredHabitatLevel, requiredSpeciesLevel, validateProgressionConfig} from '../src/simulation/progression';

/** The catalogue as it was before the registry extraction, written out here independently of the code it checks. */
const IDS = [...EXPECTED_IDS];
/** Where each species can be obtained, as the game offered it before sources were declared (written out independently). */
const SHOP = {kind: 'shop', price: 80}, HISTORICAL = {kind: 'historical-breeding'};
const HISTORICAL_ACQUISITION: Record<string, unknown> = {
  paille: [SHOP, HISTORICAL], neige: [SHOP, HISTORICAL], feu: [{kind:'shop',price:180}, HISTORICAL], 'belier-gris': [{kind:'shop',price:350}, HISTORICAL], volant: [{kind:'shop',price:600}, HISTORICAL],
  'lunettes': [{kind: 'recipe', knowledgePrice: 220, guaranteeEligible: true, requiredTypes: ['metal', 'paille'], minAffection: 4}],
  'perroquet': [{kind: 'recipe', knowledgePrice: 250, guaranteeEligible: true, requiredTypes: ['vol', 'feu'], minAffection: 4}],
  'feu-glace': [{kind: 'recipe', knowledgePrice: 180, guaranteeEligible: true, requiredTypes: ['feu', 'neige'], minAffection: 4}],
  'bouee': [{kind: 'recipe', knowledgePrice: 150, guaranteeEligible: true, requiredTypes: ['paille', 'feu'], minAffection: 4}],
  'magicien': [{kind: 'recipe', knowledgePrice: 450, requiredTypes: ['metal', 'vol'], minAffection: 6, probability: 5}],
  dragon: [{kind: 'recipe', knowledgePrice: 900, minAffection: 10, parents: ['perroquet', 'feu'], probability: 2}],
};

/** Each new Rare is a reproduction-only recipe of its two required elements, with no price, gift, guarantee or fixed percentage. */
const ACQUISITION: Record<string, unknown> = {...HISTORICAL_ACQUISITION, ...Object.fromEntries(NEW_RARES.map(r => [r.id, [{kind: 'recipe', guaranteeEligible: true, requiredTypes: [...r.requiredTypes], minAffection: STANDARD_RARE.minAffection}]]))};

const HISTORICAL_DEFINITIONS = {
  paille: {art: EXPECTED_ART['paille'], name: 'Lapin Paille', types: ['paille'], rarity: 'common', price: 80, recipe: null, acquisition: ACQUISITION['paille'], progression: {unlockLevel: 1}},
  neige: {art: EXPECTED_ART['neige'], name: 'Lapin Neige', types: ['neige'], rarity: 'common', price: 80, recipe: null, acquisition: ACQUISITION['neige'], progression: {unlockLevel: 1}},
  feu: {art: EXPECTED_ART['feu'], name: 'Lapin Feu', types: ['feu'], rarity: 'common', price: 180, recipe: null, acquisition: ACQUISITION['feu'], progression: {unlockLevel: 5}},
  'belier-gris': {art: EXPECTED_ART['belier-gris'], name: 'Lapin Bélier Gris', types: ['metal'], rarity: 'common', price: 350, recipe: null, acquisition: ACQUISITION['belier-gris'], progression: {unlockLevel: 7}},
  volant: {art: EXPECTED_ART['volant'], name: 'Lapin Volant', types: ['vol'], rarity: 'common', price: 600, recipe: null, acquisition: ACQUISITION['volant'], progression: {unlockLevel: 9}},
  lunettes: {art: EXPECTED_ART['lunettes'], name: 'Lapin à Lunettes', types: ['metal', 'paille'], rarity: 'rare', price: null, recipe: {requiredTypes: ['metal', 'paille'], minAffection: 4}, acquisition: ACQUISITION['lunettes'], progression: {unlockLevel: 8}},
  perroquet: {art: EXPECTED_ART['perroquet'], name: 'Lapin Perroquet', types: ['vol', 'feu'], rarity: 'rare', price: null, recipe: {requiredTypes: ['vol', 'feu'], minAffection: 4}, acquisition: ACQUISITION['perroquet'], progression: {unlockLevel: 9}},
  'feu-glace': {art: EXPECTED_ART['feu-glace'], name: 'Lapin Feu Glacé', types: ['feu', 'neige'], rarity: 'rare', price: null, recipe: {requiredTypes: ['feu', 'neige'], minAffection: 4}, acquisition: ACQUISITION['feu-glace'], progression: {unlockLevel: 6}},
  bouee: {art: EXPECTED_ART['bouee'], name: 'Lapin en Bouée', types: ['paille', 'feu'], rarity: 'rare', price: null, recipe: {requiredTypes: ['paille', 'feu'], minAffection: 4}, acquisition: ACQUISITION['bouee'], progression: {unlockLevel: 5}},
  magicien: {art: EXPECTED_ART['magicien'], name: 'Lapin Magicien', types: ['metal', 'vol'], rarity: 'epic', price: null, recipe: {requiredTypes: ['metal', 'vol'], minAffection: 6, probability: 5}, acquisition: ACQUISITION['magicien'], progression: {unlockLevel: 11}},
  dragon: {art: EXPECTED_ART['dragon'], name: 'Lapin Dragon', types: ['vol', 'feu'], rarity: 'legendary', price: null, recipe: {minAffection: 10, parents: ['perroquet', 'feu'], probability: 2}, acquisition: ACQUISITION['dragon'], progression: {unlockLevel: 14}},
};
const DEFINITIONS = {...HISTORICAL_DEFINITIONS, ...Object.fromEntries(NEW_RARES.map(r => [r.id, {name: r.name, description: r.description, types: [...r.types], rarity: 'rare', price: null,
  recipe: {requiredTypes: [...r.requiredTypes], minAffection: STANDARD_RARE.minAffection}, acquisition: ACQUISITION[r.id], progression: {unlockLevel: STANDARD_RARE.unlockLevel}, art: r.art}]))};

describe('canonical species registry', () => {
  it('lists every id in historical order followed by the approved Rares (catalogue and cumulative draw)', () => {
    expect([...registry.SPECIES_IDS]).toEqual(IDS); expect(registry.SPECIES_IDS).toHaveLength(EXPECTED_IDS.length);
  });
  it('keeps every definition exactly: names, types, rarities, prices, recipes, parents, probabilities, acquisition sources, unlock levels and art', () => {
    expect(registry.SPECIES).toEqual(DEFINITIONS); expect(Object.keys(registry.SPECIES)).toEqual(IDS);
  });
  it('keeps the rules the design relies on: Terre, Mottelin, Géant and Brumelin are gone; belier-gris is a common Metal and volant a common Vol', () => {
    for (const removed of ['terre', 'mottelin', 'geant', 'brumelin']) expect(Object.hasOwn(registry.SPECIES, removed), removed).toBe(false);
    expect(registry.RABBIT_TYPES).not.toContain('terre');
    expect(registry.SPECIES['belier-gris']).toMatchObject({rarity: 'common', types: ['metal']}); expect(registry.SPECIES.volant).toMatchObject({rarity: 'common', types: ['vol']});
    expect(registry.SPECIES.magicien.rarity).toBe('epic');
  });
  it('keeps the derived lists and their exact order', () => {
    expect(balance.SHOP_SPECIES).toEqual(['paille', 'neige', 'feu', 'belier-gris', 'volant']);
    expect(balance.RECIPE_SPECIES).toEqual(EXPECTED_RECIPE_IDS);
    expect(balance.GUARANTEE_SPECIES).toEqual(["lunettes","perroquet","feu-glace","bouee","frisket","icy","ardent","snk","pic-pic","amethyste","princesse-neige","fluffy","virvoletant","phoenix","roukette","wat-wat","glassofeu","plume"]);
  });
  it('keeps LEGACY_SPECIES_IDS as the historical list: the first two ids, in order', () => {
    expect([...registry.LEGACY_SPECIES_IDS]).toEqual(IDS.slice(0, 2));
  });
  it('is still re-exported by balance.ts, as the very same objects', () => {
    expect(balance.SPECIES).toBe(registry.SPECIES); expect(balance.SPECIES_IDS).toBe(registry.SPECIES_IDS); expect(balance.LEGACY_SPECIES_IDS).toBe(registry.LEGACY_SPECIES_IDS);
  });
  it('still feeds z.enum: every id parses and anything else is rejected', () => {
    const schema = z.enum(registry.SPECIES_IDS);
    for (const id of IDS) expect(schema.parse(id)).toBe(id);
    expect(schema.safeParse('arc-en-ciel').success).toBe(false); expect(schema.safeParse('').success).toBe(false);
  });
  it('gives each definition its own mutable type list, as before', () => {
    const first = registry.SPECIES.lunettes.types, second = registry.SPECIES.perroquet.types;
    expect(first).not.toBe(second); expect(Array.isArray(first)).toBe(true);
  });
});

/** The table `PROGRESSION.requirements.species` held by hand before the levels moved into the registry, written out independently. */
const LEVELS_BEFORE = Object.fromEntries(EXPECTED_IDS.map((id, i) => [id, i < HISTORICAL_LEVELS.length ? HISTORICAL_LEVELS[i] : STANDARD_RARE.unlockLevel])) as Record<registry.SpeciesId, number>;
describe('acquisition is declared, not deduced', () => {
  const sourcesOf = (id: string) => registry.SPECIES[id as registry.SpeciesId].acquisition;
  it('gives the five Commons a shop and the transitional historical breeding, and every other species a recipe', () => {
    for (const id of IDS) expect(sourcesOf(id), id).toEqual(ACQUISITION[id]);
    expect(IDS.filter(id => sourcesOf(id).some(source => source.kind === 'shop'))).toEqual(['paille', 'neige', 'feu', 'belier-gris', 'volant']);
    expect(IDS.filter(id => sourcesOf(id).some(source => source.kind === 'historical-breeding'))).toEqual(['paille', 'neige', 'feu', 'belier-gris', 'volant']);
    expect(IDS.filter(id => sourcesOf(id).some(source => source.kind === 'recipe'))).toEqual(EXPECTED_RECIPE_IDS);
  });
  it('derives price and recipe from the sources, without a second copy', () => {
    for (const id of IDS) {
      const sources = sourcesOf(id), shop = sources.find(source => source.kind === 'shop'), recipe = sources.find(source => source.kind === 'recipe');
      expect(registry.SPECIES[id as registry.SpeciesId].price, id).toBe(shop ? ({paille:80,neige:80,feu:180,'belier-gris':350,volant:600} as Record<string,number>)[id] : null);
      expect(registry.SPECIES[id as registry.SpeciesId].recipe === null, id).toBe(!recipe);
    }
    expect(registry.shopPrice([{kind: 'shop', price: 123}])).toBe(123); expect(registry.shopPrice([{kind: 'historical-breeding'}])).toBeNull();
    expect(registry.recipeOf([{kind: 'recipe', requiredTypes: ['feu'], minAffection: 3}])).toEqual({requiredTypes: ['feu'], minAffection: 3}); expect(registry.recipeOf([{kind: 'shop', price: 1}])).toBeNull();
  });
  it('does not let the absence of a recipe stand for ordinary breeding', () => {
    const none = {acquisition: []}, shopOnly = {acquisition: [{kind: 'shop', price: 80}]} as const, recipeOnly = {acquisition: [{kind: 'recipe', minAffection: 2}]} as const, historical = {acquisition: [{kind: 'historical-breeding'}]} as const;
    for (const definition of [none, shopOnly, recipeOnly]) expect(registry.breedsHistorically(definition)).toBe(false);
    expect(registry.breedsHistorically(historical)).toBe(true);
    expect(registry.hasRecipe(none)).toBe(false); expect(registry.hasRecipe(recipeOnly)).toBe(true); expect(registry.isSold(none)).toBe(false); expect(registry.isSold(shopOnly)).toBe(true);
  });
  it('keeps the shop and recipe lists the sources produce', () => {
    expect(balance.SHOP_SPECIES).toEqual(IDS.filter(id => sourcesOf(id).some(source => source.kind === 'shop')));
    expect(balance.RECIPE_SPECIES).toEqual(IDS.filter(id => sourcesOf(id).some(source => source.kind === 'recipe')));
  });
});

describe('required levels live in the registry and feed the default progression', () => {
  it('derives exactly the former table, with no second manual table', () => {
    expect(PROGRESSION.requirements.species).toEqual(LEVELS_BEFORE); expect(Object.keys(PROGRESSION.requirements.species)).toEqual(IDS);
    for (const id of IDS) { expect(requiredSpeciesLevel(id as keyof typeof LEVELS_BEFORE)).toBe(LEVELS_BEFORE[id as keyof typeof LEVELS_BEFORE]); expect(registry.SPECIES[id as keyof typeof LEVELS_BEFORE].progression.unlockLevel).toBe(LEVELS_BEFORE[id as keyof typeof LEVELS_BEFORE]); }
  });
  it('keeps the levels that habitats depend on (a specialised habitat opens with its common species)', () => {
    expect([requiredHabitatLevel('paille'), requiredHabitatLevel('neige'), requiredHabitatLevel('feu'), requiredHabitatLevel('metal'), requiredHabitatLevel('vol'), requiredHabitatLevel('universal')]).toEqual([1, 1, 5, 7, 9, 6]);
  });
  it('lets a custom configuration keep its own levels, for species and for the habitats that read them', () => {
    const custom: ProgressionConfig = {...structuredClone(PROGRESSION), requirements: {...structuredClone(PROGRESSION.requirements), species: {...LEVELS_BEFORE, dragon: 20, feu: 2, volant: 4}}};
    validateProgressionConfig(custom);
    expect(requiredSpeciesLevel('dragon', custom)).toBe(20); expect(requiredSpeciesLevel('feu', custom)).toBe(2); expect(requiredSpeciesLevel('paille', custom)).toBe(1);
    expect([requiredHabitatLevel('feu', custom), requiredHabitatLevel('vol', custom)]).toEqual([2, 4]);
    // The registry and the default configuration are untouched by it.
    expect(requiredSpeciesLevel('dragon')).toBe(14); expect(registry.SPECIES.dragon.progression.unlockLevel).toBe(14); expect(PROGRESSION.requirements.species.feu).toBe(5);
  });
  it('still rejects a configuration that omits a species', () => {
    const missing = structuredClone(PROGRESSION); Reflect.deleteProperty(missing.requirements.species, 'dragon'); expect(() => validateProgressionConfig(missing)).toThrow(RangeError);
  });
});

describe('the registry stays pure data', () => {
  const sources = import.meta.glob('../src/config/{species,rarities}.ts', {query: '?raw', import: 'default', eager: true}) as Record<string, string>;
  const code = (name: string) => sources[`../src/config/${name}.ts`].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // comments may name what the registry avoids
  const importedModules = (name: string) => [...code(name).matchAll(/^\s*import[^;]*?from\s*['"]([^'"]+)['"]/gm)].map(match => match[1]);
  it('species.ts imports only the rarities data module: no balance, Phaser, DOM, UI, persistence, progression or simulation module', () => {
    expect(sources['../src/config/species.ts']).toBeDefined(); expect(importedModules('species')).toEqual(['./rarities']);
    expect(code('species')).not.toMatch(/^\s*import\s+['"]/m); expect(code('species')).not.toMatch(/(document|window|localStorage|Phaser)/);
  });
  it('rarities.ts imports nothing at all', () => {
    expect(sources['../src/config/rarities.ts']).toBeDefined(); expect(code('rarities')).not.toMatch(/^\s*import/m); expect(code('rarities')).not.toMatch(/(document|window|localStorage|Phaser)/);
  });
});
