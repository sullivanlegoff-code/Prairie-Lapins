import {afterEach, describe, expect, it} from 'vitest';
import {BREEDING_ODDS, SPECIES, SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {recipeOf, type Acquisition, type Recipe} from '../src/config/species';
import {breedingWeights, chooseBirth} from '../src/simulation/breeding';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {regressionStart} from './regression-start';
import {rareAdditions} from './rabbit-art-fixtures';

const originals = new Map<SpeciesId, typeof SPECIES[SpeciesId]>();
function override(id: SpeciesId, recipe: Recipe) {
  if (!originals.has(id)) originals.set(id, SPECIES[id]);
  const acquisition: Acquisition[] = [{kind: 'recipe', ...recipe}];
  SPECIES[id] = {...SPECIES[id], acquisition, recipe: recipeOf(acquisition)};
}
afterEach(() => {for (const [id, definition] of originals) SPECIES[id] = definition; originals.clear();});

describe('catalogue candidates with historical weighting', () => {
  it('preserves historical weights outside the replaced starting pool, including affection-1 compatibility', () => {
    const s = regressionStart(0);
    s.progression = {totalXp: cumulativeLevelXp(14), rewardedThroughLevel: 14};
    s.discovered = [...SPECIES_IDS];
    for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) {
      const key = [...new Set([...SPECIES[a].types, ...SPECIES[b].types])].sort().join(',');
      const historical = BREEDING_ODDS[key];
      if (!historical) continue;
      for (const affection of [1,2]) {
        const expected = key === 'neige,paille' ? (affection >= 2 ? {frisket:30,icy:30} : {}) : {...historical, ...rareAdditions(key.split(','), affection, affection)};
        expect(Object.entries(breedingWeights(a,b,affection,affection))).toEqual(Object.entries(expected));
        const total = Object.values(expected).reduce((sum,w) => sum+w,0);
        let cursor = 0;
        for (const [id,w] of Object.entries(expected)) {
          for (const roll of [cursor/total, (cursor+w/2)/total, (cursor+w-0.000001)/total])
            expect(chooseBirth(s,a,b,roll,affection,affection).species).toBe(id);
          cursor += w;
        }
      }
    }
  });
  it('automatically admits two Rare recipes sharing a historical union, in catalogue order and in either parent order', () => {
    for (const id of ['lunettes','perroquet'] as const) override(id, {requiredTypes: ['paille','neige'], minAffection: 4});
    const expected = [['lunettes',30],['perroquet',30],['frisket',30],['icy',30]];
    expect(Object.entries(breedingWeights('paille','neige',4,4))).toEqual(expected);
    expect(Object.entries(breedingWeights('neige','paille',4,4))).toEqual(expected);
    // New recipes do not inherit the legacy affection exception.
    expect(breedingWeights('paille','neige',1,1)).toEqual({});
  });
  it.each([
    {requiredTypes: ['feu'] as const, minAffection: 4},
    {requiredTypes: ['paille','neige'] as const, parents: ['frisket','neige'] as const, minAffection: 4},
    {requiredTypes: ['paille','neige'] as const, minAffection: 5},
  ])('keeps new candidate requirements effective: %j', recipe => {
    override('lunettes', recipe);
    expect(breedingWeights('paille','neige',4,4).lunettes).toBeUndefined();
    expect(breedingWeights('neige','paille',4,4).lunettes).toBeUndefined();
  });
  // The affection exception of the two removed Uncommon species (Brumelin, Mottelin) is gone with them: no remaining recipe is admitted below its threshold.
  it('admits no recipe below its affection threshold in any union', () => {
    for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) for (const affection of [1, 2, 3]) {
      for (const id of Object.keys(breedingWeights(a, b, affection, affection)) as SpeciesId[]) {
        const recipe = SPECIES[id].recipe;
        if (recipe) expect(affection, `${id} from ${a} x ${b}`).toBeGreaterThanOrEqual(recipe.minAffection);
      }
    }
  });
});
