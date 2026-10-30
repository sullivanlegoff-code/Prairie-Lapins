import {expect, it} from 'vitest';
import {BALANCE, SPECIES, SPECIES_IDS} from '../src/config/balance';
import {RARITY_IDS} from '../src/config/rarities';
import {breedingOdds} from '../src/simulation/breeding';

// Owner rule (31 October 2026): a common rabbit never appears, except from two common parents of the same type,
// which always give that common (Feu × Feu = Feu).
it('a common is born only from two commons of its own type, at every affection', () => {
  const commons = SPECIES_IDS.filter(id => SPECIES[id].rarity === 'common');
  for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) for (const affection of [2, 10, 15, 20]) {
    const odds = breedingOdds(a, b, affection, affection);
    const born = commons.filter(id => (odds[id] ?? 0) > 0);
    if (a === b && commons.includes(a)) expect(odds).toEqual({[a]: 100});
    else expect(born, `${a} × ${b}`).toEqual([]);
  }
});
it('has no Uncommon rarity, and a released common baby is worth 20', () => {
  expect(RARITY_IDS).toEqual(['common', 'rare', 'epic', 'legendary']);
  expect(BALANCE.releaseBabyPattes).toEqual({common: 20, rare: 100, epic: 500, legendary: 1000});
});
