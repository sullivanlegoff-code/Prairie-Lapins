import {afterEach, describe, expect, it, vi} from 'vitest';
import {SPECIES, type SpeciesId} from '../src/config/balance';
import type {Acquisition} from '../src/config/species';
import {act} from '../src/simulation';
import {breedingOdds, breedingPool, breedingWeights} from '../src/simulation/breeding';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {regressionStart as legacyGame} from './regression-start';
import type {GameState} from '../src/state/types';

/** Isolated, restored overrides of declared sources on the real registry objects (no production species is added, no file is touched). */
const original = new Map<SpeciesId, readonly Acquisition[]>();
function declare(id: SpeciesId, acquisition: readonly Acquisition[]) { if (!original.has(id)) original.set(id, SPECIES[id].acquisition); SPECIES[id].acquisition = acquisition; }
const shopOnly = (id: SpeciesId) => declare(id, [{kind: 'shop', price: 80}]);
afterEach(() => { for (const [id, acquisition] of original) SPECIES[id].acquisition = acquisition; original.clear(); });

function game(a: SpeciesId, b: SpeciesId, affection: number): GameState {
  const s = legacyGame(0); s.progression = {totalXp: cumulativeLevelXp(14), rewardedThroughLevel: 14};
  s.pattes = 2000; s.grass = 1000; s.rabbits[0].species = a; s.rabbits[1].species = b; s.rabbits.forEach(r => r.affection = affection); s.discovered = [...new Set([a, b])];
  for (const [kind, x] of [['nest', 22], ['nursery', 26]] as const) { const r = act(s, {type: 'placeStarterBuilding', kind, x, y: 20}, 0, () => .5); if (!r.ok) throw Error(r.reason); Object.assign(s, r.state); }
  return s;
}

describe('the breeding engine honours the declared acquisition sources', () => {
  it('controls: two commons omit common results, while mixed parents keep historical weights in order', () => {
    expect(breedingWeights('neige', 'feu', 4, 4)).toEqual({'wat-wat':30,glassofeu:30}); expect(Object.keys(breedingWeights('neige', 'feu', 4, 4))).toEqual(['wat-wat','glassofeu']);
    expect(breedingWeights('neige', 'glassofeu', 4, 4)).toEqual({'wat-wat':30,glassofeu:30});
    expect(breedingWeights('paille', 'feu', 4, 4)).toEqual({ardent: 30, snk: 30}); expect(breedingOdds('paille', 'belier-gris', 6, 6)).toEqual({roukette: 47.5, boudinet: 47.5, magicien: 5});
  });
  it('excludes a species made shop-only from a historical table, keeping the others in order and weight', () => {
    shopOnly('wat-wat'); expect(breedingWeights('neige', 'glassofeu', 4, 4)).toEqual({glassofeu:30}); expect(Object.keys(breedingWeights('neige', 'glassofeu', 4, 4))).toEqual(['glassofeu']);
    shopOnly('neige'); expect(breedingWeights('neige', 'glassofeu', 4, 4)).toEqual({glassofeu:30}); expect(breedingWeights('neige', 'neige')).toEqual({});
  });
  it('excludes it on the generic path too, for the historical rule and for recipes', () => {
    shopOnly('feu'); expect(breedingWeights('paille', 'ardent', 4, 4)).toEqual({ardent: 30, snk: 30});
    shopOnly('ardent'); expect(breedingWeights('paille', 'ardent', 4, 4)).toEqual({snk: 30});
  });
  it('excludes a special recipe whose source is no longer declared, and does not reserve its probability', () => {
    shopOnly('magicien'); expect(breedingOdds('paille', 'belier-gris', 6, 6)).toEqual({roukette: 50, boudinet: 50});
    shopOnly('dragon'); expect(breedingOdds('dadi', 'phoenix', 10, 10).dragon).toBeUndefined();
  });
  it('keeps a species without breeding source out of the guarantee, and the guarantee still works for the others', () => {
    const s = game('feu', 'neige', 4); s.pityFailures = 7;
    expect(breedingPool(s, 'feu', 'neige', 4, 4).missing).toEqual(["wat-wat","glassofeu"]); expect(breedingPool(s, 'feu', 'neige', 4, 4).guaranteed).toBe(true);
    shopOnly('wat-wat'); const pool = breedingPool(s, 'feu', 'neige', 4, 4);
    expect(pool.missing).toEqual(["glassofeu"]); expect(pool.eligible).toBe(true); expect(pool.guaranteed).toBe(true); expect(pool.weights).toEqual({glassofeu:1});
  });
  it('refuses a breed with no result atomically: empty pool, no roll, no state change', () => {
    const s = game('paille', 'paille', 2), before = structuredClone(s);
    shopOnly('paille'); expect(breedingPool(s, 'paille', 'paille')).toMatchObject({weights: {}, total: 0});
    const rng = vi.fn(() => .5), result = act(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']}, 0, rng);
    expect(result).toMatchObject({ok: false, reason: 'NO_BREEDING_RESULT'}); expect(rng).not.toHaveBeenCalled(); expect(s).toEqual(before);
    if (!result.ok) expect(result.state).toEqual(before);
  });
  it('restores every override: the registry is back to the current sources', () => {
    shopOnly('paille'); shopOnly('wat-wat');
    for (const id of original.keys()) expect(SPECIES[id].acquisition).toEqual([{kind: 'shop', price: 80}]);
  });
});
describe('after the overrides are restored', () => {
  it('the engine gives the mixed-parent historical results again', () => { expect(breedingWeights('neige', 'glassofeu', 4, 4)).toEqual({'wat-wat':30,glassofeu:30}); expect(SPECIES.paille.acquisition).toEqual([{kind: 'shop', price: 80}, {kind: 'historical-breeding'}]); });
});
