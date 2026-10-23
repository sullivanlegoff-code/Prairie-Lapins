import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {cumulativeLevelXp, requiredHabitatUpgradeLevel} from '../src/simulation/progression';
import {HABITAT_LEVELS, HABITAT_TYPES, habitatLevel, type HabitatType} from '../src/config/habitats';
import {quoteComplement} from '../src/simulation/actions';
import {habitatStats} from '../src/simulation/habitats';

/** Written out here, independently of the configuration it checks: capacity and price of each upgrade. */
const COINS_LEVEL_2 = {universal: 200, paille: 300, neige: 300, terre: 300, feu: 300, metal: 300, vol: 300} as const;
const CAPACITY = [3, 5, 7], HEARTS_LEVEL_3 = 10;
const game = (type: HabitatType, level: 1 | 2, pattes: number, hearts: number) => {
  const s = createGame(0); s.buildings[0].habitat = {type, level}; s.rabbits = []; /* residents of other types would make a typed habitat invalid */ s.pattes = pattes; s.hearts = hearts;
  const player = requiredHabitatUpgradeLevel(type, 3); s.progression = {totalXp: cumulativeLevelXp(player), rewardedThroughLevel: player}; return s;
};
const upgrade = (fromLevel: 1 | 2 | 3) => ({type: 'upgradeHabitat' as const, id: 'building-1', fromLevel});

describe('upgrading an enclosure: coins to level 2, exactly ten hearts to level 3', () => {
  it('declares the price and its currency in the habitat configuration', () => {
    for (const type of HABITAT_TYPES) {
      expect([1, 2, 3].map(level => habitatLevel(type, level as 1 | 2 | 3).capacity)).toEqual(CAPACITY);
      expect(habitatLevel(type, 2)).toMatchObject({cost: COINS_LEVEL_2[type], currency: 'pattes'});
      expect(habitatLevel(type, 3)).toMatchObject({cost: HEARTS_LEVEL_3, currency: 'hearts'});
      expect(habitatLevel(type, 1).currency).toBe('pattes');
    }
    expect(HABITAT_LEVELS.universal[2].cap).toBe(1200); expect(HABITAT_LEVELS.specialized[2].cap).toBe(2100);
  });

  it.each(HABITAT_TYPES.map(type => [type]))('%s: level 2 costs coins only, level 3 costs exactly ten hearts and no coin', type => {
    const start = game(type, 1, 5000, 40), level2 = act(start, upgrade(1), 0);
    if (!level2.ok) throw Error(level2.reason);
    expect(level2.state.pattes).toBe(5000 - COINS_LEVEL_2[type]); expect(level2.state.hearts).toBe(40);
    expect(habitatStats(level2.state.buildings[0]).capacity).toBe(5);
    const level3 = act(level2.state, upgrade(2), 0);
    if (!level3.ok) throw Error(level3.reason);
    expect(level3.state.hearts).toBe(30); expect(level3.state.pattes).toBe(level2.state.pattes);
    expect(level3.state.buildings[0].habitat).toEqual({type, level: 3}); expect(habitatStats(level3.state.buildings[0]).capacity).toBe(7);
    const reloaded = decodeGame(encodeGame(level3.state)); expect(reloaded).toEqual({ok: true, state: level3.state});
  });

  it('accepts exactly ten hearts, even with no coin at all, and leaves the balance at zero', () => {
    const s = game('universal', 2, 0, 10), result = act(s, upgrade(2), 0);
    if (!result.ok) throw Error(result.reason);
    expect(result.state.hearts).toBe(0); expect(result.state.pattes).toBe(0); expect(result.state.buildings[0].habitat!.level).toBe(3);
  });

  it.each([0, 1, 9])('refuses atomically with %i hearts, whatever the coins: no debit, no level change', hearts => {
    for (const type of ['universal', 'feu'] as const) {
      const s = game(type, 2, 1_000_000, hearts), before = structuredClone(s);
      expect(act(s, upgrade(2), 0)).toEqual({ok: false, state: before, reason: 'NOT_ENOUGH_HEARTS'}); expect(s).toEqual(before);
    }
  });

  it('has no coin complement or quote for the heart-priced level, and no stale, repeated or over-maximum payment', () => {
    const s = game('metal', 2, 0, 50), command = upgrade(2);
    expect(act(s, {type: 'payWithHearts', action: command, maxHearts: 1000, maxPattes: 0}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE', state: s});
    expect(quoteComplement(s, command, 0)).toEqual({ok: false, reason: 'INVALID_CHOICE'});
    const paid = act(s, command, 0); if (!paid.ok) throw Error(paid.reason);
    // The same confirmation again, from the stale level: nothing more is taken.
    expect(act(paid.state, command, 0)).toMatchObject({ok: false, reason: 'STALE_ACTION', state: paid.state});
    expect(act(paid.state, upgrade(3), 0)).toMatchObject({ok: false, reason: 'MAX_HABITAT_LEVEL', state: paid.state});
    expect(paid.state.hearts).toBe(40);
  });

  it('does not charge an enclosure already at level 3, on load or afterwards', () => {
    const s = game('universal', 2, 100, 3); s.buildings[0].habitat = {type: 'universal', level: 3};
    const decoded = decodeGame(encodeGame(s)); expect(decoded).toEqual({ok: true, state: s});
    if (decoded.ok) { expect(decoded.state.hearts).toBe(3); expect(decoded.state.pattes).toBe(100); }
  });

  it('keeps the progression threshold of the level-3 upgrade', () => {
    const s = game('universal', 2, 1000, 50); s.progression = {totalXp: cumulativeLevelXp(requiredHabitatUpgradeLevel('universal', 3) - 1), rewardedThroughLevel: requiredHabitatUpgradeLevel('universal', 3) - 1};
    expect(act(s, upgrade(2), 0)).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED', state: s});
  });
});

