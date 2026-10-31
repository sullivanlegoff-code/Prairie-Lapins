import {describe, expect, it} from 'vitest';
import {SPECIES_IDS} from '../src/config/balance';
import {breedingOdds, recipeMatches} from '../src/simulation/breeding';
import {decodeGame, encodeGame} from '../src/simulation';
import {habitatEntryReason} from '../src/simulation/habitats';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {regressionStart} from './regression-start';

/** Epics and Legendaries approved on 25 October 2026; their pictures are checked in special-rabbit-assets.test.js. */
describe('Epic and Legendary rabbits of 25 October 2026', () => {
  it('gives Requin only to Maxou × Wat Wat at affection 10, in either order, and Dragon only to Dadi × Phoenix', () => {
    expect(recipeMatches('requin', 'maxou', 'wat-wat')).toBe(true); expect(recipeMatches('requin', 'wat-wat', 'maxou')).toBe(true);
    expect(breedingOdds('maxou', 'wat-wat', 10, 10).requin).toBe(10.5); expect(breedingOdds('maxou', 'wat-wat', 10, 9).requin).toBeUndefined();
    for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) {
      const pair = [a, b].sort().join(' × ');
      if (pair !== 'maxou × wat-wat') expect(breedingOdds(a, b, 20, 20).requin, pair).toBeUndefined();
      if (pair !== 'dadi × phoenix') expect(breedingOdds(a, b, 20, 20).dragon, pair).toBeUndefined();
    }
  });
  it('draws the Epics from their two elements, with affection 6 on both parents, at a quarter of a Rare weight', () => {
    // Dadi is Feu-Metal since the 27 October economy (docs/economy-current.md); Maxou stays Neige-Vol.
    expect(breedingOdds('feu', 'belier-gris', 6, 6)).toMatchObject({dadi: 10, dinono: 10});
    expect(breedingOdds('neige', 'volant', 6, 6)).toMatchObject({maxou: 300 * 100 / 2700});
    expect(breedingOdds('paille', 'neige', 6, 6)).toEqual({frisket: 1200 * 100 / 2700, icy: 1200 * 100 / 2700, orange: 300 * 100 / 2700});
    expect(breedingOdds('paille', 'belier-gris', 6, 6).magicien).toBe(10);
    expect(breedingOdds('feu', 'belier-gris', 6, 5).dadi).toBeUndefined();
  });
});

describe('Magicien changed elements', () => {
  /** A Magicien already housed in a Vol habitat under its former Metal-Vol elements. */
  function housedInVol() {
    const s = regressionStart(0); s.progression = {totalXp: cumulativeLevelXp(14), rewardedThroughLevel: 14};
    s.buildings[0].habitat = {type: 'vol', level: 1};
    s.rabbits = [{id: 'rabbit-2', species: 'magicien', affection: 6, enclosureId: 'building-1'}]; s.discovered = ['magicien']; s.nextId = 7;
    return s;
  }
  it('keeps a saved Magicien where its former elements placed it', () => {
    const decoded = decodeGame(encodeGame(housedInVol()));
    expect(decoded.ok).toBe(true);
    // Non-Common individuals gain their saved income roll during decoding (json.ts), which is not part of the elements check.
    if (decoded.ok) expect(decoded.state.rabbits).toEqual([{id: 'rabbit-2', species: 'magicien', affection: 6, enclosureId: 'building-1', incomeRoll: expect.any(Number)}]);
  });
  it('places new Magiciens only under their current Paille-Metal elements', () => {
    const s = housedInVol(), home = s.buildings[0];
    expect(habitatEntryReason(s, home, 'magicien')).toBe('TYPE_INCOMPATIBLE');
    home.habitat = {type: 'paille', level: 1}; expect(habitatEntryReason(s, home, 'magicien')).not.toBe('TYPE_INCOMPATIBLE');
  });
});
