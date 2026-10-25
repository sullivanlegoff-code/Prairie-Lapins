import {afterEach, describe, expect, it} from 'vitest';
import {SPECIES, SPECIES_IDS, BREEDING_ODDS, type SpeciesId, type Odds} from '../src/config/balance';
import {recipeOf, type Acquisition, type Recipe} from '../src/config/species';
import {breedingDistributionWeights, breedingOdds, recipeMatches} from '../src/simulation/breeding';
import {recipeBook} from '../src/ui/models';
import {regressionStart} from './regression-start';
import {rareAdditions} from './rabbit-art-fixtures';

const saved = new Map<SpeciesId, typeof SPECIES[SpeciesId]>();
function override(id: SpeciesId, recipe: Recipe) {
  if (!saved.has(id)) saved.set(id, SPECIES[id]);
  const acquisition: Acquisition[] = [{kind: 'recipe', ...recipe}];
  SPECIES[id] = {...SPECIES[id], acquisition, recipe};
}
afterEach(() => {for (const [id, definition] of saved) SPECIES[id] = definition; saved.clear();});

/** Frozen historical recipe requirements, independent of displayed result types. */
const historical = {
  lunettes: {types: ['metal', 'paille'], affection: 4}, perroquet: {types: ['vol', 'feu'], affection: 4},
  'feu-glace': {types: ['feu', 'neige'], affection: 4}, bouee: {types: ['paille', 'feu'], affection: 4},
  magicien: {types: ['paille', 'metal'], affection: 6},
};
/** Fixed-probability specials, in catalogue order: element recipes (Epics) and exact parents (Legendaries), approved 25 October 2026. */
const SPECIALS: {id: SpeciesId; probability: number; affection: number; types?: string[]; parents?: [SpeciesId, SpeciesId]}[] = [
  {id: 'magicien', probability: 5, affection: 6, types: ['paille', 'metal']}, {id: 'dragon', probability: 2, affection: 10, parents: ['dadi', 'phoenix']},
  {id: 'dadi', probability: 5, affection: 6, types: ['neige', 'vol']}, {id: 'maxou', probability: 5, affection: 6, types: ['neige', 'vol']},
  {id: 'orange', probability: 5, affection: 6, types: ['paille', 'neige']}, {id: 'requin', probability: 2, affection: 10, parents: ['maxou', 'wat-wat']},
];
function historicalWeights(a: SpeciesId, b: SpeciesId, x: number, y: number): Odds {
  const types = new Set([...SPECIES[a].types, ...SPECIES[b].types]), key = [...types].sort().join(',');
  const matches = (id: keyof typeof historical) => historical[id].types.every(t => types.has(t as never)) && Math.min(x,y) >= historical[id].affection;
  const ordinary: Odds = {...BREEDING_ODDS[key]};
  if (!Object.hasOwn(BREEDING_ODDS, key)) for (const id of SPECIES_IDS) {
    if (['paille','neige','feu','belier-gris','volant'].includes(id) && SPECIES[id].types.every(t => types.has(t))) ordinary[id] = 30;
    else if (id in historical && id !== 'magicien' && matches(id as keyof typeof historical)) ordinary[id] = 30;
  }
  // Approved additions: ordinary weight 20 each, only when both required elements and both affection thresholds hold.
  Object.assign(ordinary, rareAdditions(types, x, y));
  const pool: Odds = key === 'neige,paille' ? (Math.min(x,y) >= 2 ? {frisket:30,icy:30} : {}) : ordinary;
  const specials: Odds = {};
  for (const special of SPECIALS) if (Math.min(x,y) >= special.affection && (special.types ? special.types.every(t => types.has(t as never))
    : a === special.parents![0] && b === special.parents![1] || a === special.parents![1] && b === special.parents![0]))
    // Half-percent units; every special is epic or legendary, so both parents at 10 (15) multiply it by 1.5 (2).
    specials[special.id] = special.probability * 2 * (Math.min(x,y) >= 15 ? 2 : Math.min(x,y) >= 10 ? 1.5 : 1);
  if (!Object.keys(specials).length) return pool;
  const total = Object.values(pool).reduce((s,w) => s+w,0);
  if (!total) return {};
  const remaining = 200 - Object.values(specials).reduce((s,w) => s+w,0);
  return Object.fromEntries([...Object.entries(pool).map(([id,w]) => [id,w*remaining]), ...Object.entries(specials).map(([id,w]) => [id,w*total])]);
}
describe('explicit recipe requirements', () => {
  it('preserves all other unions and applies the exact starting Rare pool in every ordered integer distribution', () => {
    for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) for (const x of [1,2,3,4,5,6,9,10,20]) for (const y of [1,2,3,4,5,6,9,10,20]) {
      expect(Object.entries(breedingDistributionWeights(a,b,x,y))).toEqual(Object.entries(historicalWeights(a,b,x,y)));
    }
  }, 30_000); // Exhaustive comparison with the hand-written oracle: close to the default 5 s when the whole suite runs in parallel.
  it('uses independent elements instead of the displayed types, in the engine and known book pairs', () => {
    override('bouee', {requiredTypes: ['neige','metal'], minAffection: 4});
    expect(recipeMatches('bouee','paille','feu')).toBe(false);
    expect(recipeMatches('bouee','neige','belier-gris')).toBe(true);
    expect(breedingOdds('neige','belier-gris',4,4).bouee).toBe(100 * 30 / (90 + 30 * Object.keys(rareAdditions(['neige', 'metal'], 4, 4)).length));
    const s = regressionStart(0); s.rabbits[0].species='neige'; s.rabbits[1].species='belier-gris';
    s.discovered.push('bouee');
    expect(recipeBook(s,0).find(r => r.species === 'bouee')!.pairs).toHaveLength(1);
    s.discovered = s.discovered.filter(id => id !== 'bouee');
    const hidden = recipeBook(s,0).find(r => r.species === 'bouee')!;
    expect(hidden.pairs).toEqual([]); expect(hidden).not.toHaveProperty('requiredTypes'); expect(hidden).not.toHaveProperty('minAffection'); expect(hidden).not.toHaveProperty('parents');
  });
  it('accepts four elements contributed by two dual-type parents', () => {
    override('bouee', {requiredTypes: ['paille','neige','metal','vol'], minAffection: 4});
    expect(recipeMatches('bouee','frisket','bretonette')).toBe(true);
    expect(recipeMatches('bouee','frisket','volant')).toBe(false);
    expect(breedingOdds('frisket','bretonette',4,4).bouee).toBeGreaterThan(0);
  });
  it('combines exact parents and elements with AND, symmetrically', () => {
    override('dragon', {parents: ['perroquet','feu'], requiredTypes: ['vol','feu'], minAffection: 10, probability: 2});
    expect(recipeMatches('dragon','perroquet','feu')).toBe(true); expect(recipeMatches('dragon','feu','perroquet')).toBe(true);
    expect(recipeMatches('dragon','volant','feu')).toBe(false);
    override('dragon', {parents: ['perroquet','feu'], requiredTypes: ['neige'], minAffection: 10, probability: 2});
    expect(recipeMatches('dragon','perroquet','feu')).toBe(false); expect(recipeMatches('dragon','feu','perroquet')).toBe(false);
    expect(breedingOdds('perroquet','feu',20,20).dragon).toBeUndefined();
  });
  it.each([undefined, []])('rejects a conditionless recipe (%s), without any result-type fallback', requiredTypes => {
    const recipe = {minAffection: 4, requiredTypes};
    expect(() => recipeOf([{kind: 'recipe', ...recipe}])).toThrow(RangeError);
    override('bouee', recipe);
    expect(() => recipeMatches('bouee','paille','feu')).toThrow(RangeError);
  });
});
