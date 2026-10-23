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
  // Hand-written expectations: Neige × Feu (union feu,neige) holds two Commons at 40 and the recipes of Feu Glacé (needs affection 4), Wat Wat and Glassofeu at 20.
  it('controls: the current tables give the historical weights, in order', () => {
    expect(breedingWeights('neige', 'feu', 4, 4)).toEqual({neige:40,feu:40,'feu-glace':20,'wat-wat':20,glassofeu:20}); expect(Object.keys(breedingWeights('neige', 'feu', 4, 4))).toEqual(['neige','feu','feu-glace','wat-wat','glassofeu']);
    expect(breedingWeights('paille', 'feu', 4, 4)).toEqual({paille: 40, feu: 40, bouee: 20, ardent: 20, snk: 20}); expect(breedingOdds('belier-gris', 'volant', 6, 6)).toEqual({'belier-gris': 47.5, volant: 47.5, magicien: 5});
  });
  it('excludes a species made shop-only from a historical table, keeping the others in order and weight', () => {
    shopOnly('feu-glace'); expect(breedingWeights('neige', 'feu', 4, 4)).toEqual({neige:40,feu:40,'wat-wat':20,glassofeu:20}); expect(Object.keys(breedingWeights('neige', 'feu', 4, 4))).toEqual(['neige','feu','wat-wat','glassofeu']);
    shopOnly('neige'); expect(breedingWeights('neige', 'feu', 4, 4)).toEqual({feu:40,'wat-wat':20,glassofeu:20}); expect(breedingWeights('neige', 'neige')).toEqual({});
  });
  it('excludes it on the generic path too, for the historical rule and for recipes', () => {
    shopOnly('feu'); expect(breedingWeights('paille', 'feu', 4, 4)).toEqual({paille: 40, bouee: 20, ardent: 20, snk: 20});
    shopOnly('bouee'); expect(breedingWeights('paille', 'feu', 4, 4)).toEqual({paille: 40, ardent: 20, snk: 20});
  });
  it('excludes a special recipe whose source is no longer declared, and does not reserve its probability', () => {
    shopOnly('magicien'); expect(breedingOdds('belier-gris', 'volant', 6, 6)).toEqual({'belier-gris': 50, volant: 50});
    shopOnly('dragon'); expect(breedingOdds('perroquet', 'feu', 10, 10).dragon).toBeUndefined();
  });
  it('keeps a species without breeding source out of the guarantee, and the guarantee still works for the others', () => {
    const s = game('feu', 'neige', 4); s.pityFailures = 9;
    expect(breedingPool(s, 'feu', 'neige', 4, 4).missing).toEqual(['feu-glace']); expect(breedingPool(s, 'feu', 'neige', 4, 4).guaranteed).toBe(true);
    shopOnly('feu-glace'); const pool = breedingPool(s, 'feu', 'neige', 4, 4);
    expect(pool.missing).toEqual([]); expect(pool.eligible).toBe(false); expect(pool.guaranteed).toBe(false); expect(pool.weights).toEqual({neige:40,feu:40,'wat-wat':20,glassofeu:20});
  });
  it('refuses a breed with no result atomically: empty pool, no roll, no state change', () => {
    const s = game('paille', 'paille', 2), before = structuredClone(s);
    shopOnly('paille'); expect(breedingPool(s, 'paille', 'paille')).toMatchObject({weights: {}, total: 0});
    const rng = vi.fn(() => .5), result = act(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']}, 0, rng);
    expect(result).toMatchObject({ok: false, reason: 'NO_BREEDING_RESULT'}); expect(rng).not.toHaveBeenCalled(); expect(s).toEqual(before);
    if (!result.ok) expect(result.state).toEqual(before);
  });
  it('restores every override: the registry is back to the current sources', () => {
    shopOnly('paille'); shopOnly('feu-glace');
    for (const id of original.keys()) expect(SPECIES[id].acquisition).toEqual([{kind: 'shop', price: 80}]);
  });
});
describe('after the overrides are restored', () => {
  it('the engine gives the historical results again', () => { expect(breedingWeights('neige', 'feu', 4, 4)).toEqual({neige:40,feu:40,'feu-glace':20,'wat-wat':20,glassofeu:20}); expect(SPECIES.paille.acquisition).toEqual([{kind: 'shop', price: 80}, {kind: 'historical-breeding'}]); });
});
