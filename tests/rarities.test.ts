import {describe, expect, it} from 'vitest';
import {BALANCE, MINUTE, SPECIES, growthDuration, type SpeciesId} from '../src/config/balance';
import {RARITIES, RARITY_IDS, mapRarities} from '../src/config/rarities';
import {PROGRESSION, type ProgressionConfig} from '../src/config/progression';
import {validateProgressionConfig} from '../src/simulation/progression';
import {RARITY_NAMES} from '../src/ui/models';
import {EXPECTED_IDS, EXPECTED_RARITIES} from './rabbit-art-fixtures';

/** What the game used before the rarity data moved into one module, written out here independently. */
const ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const LABELS = {common: 'Commun', uncommon: 'Peu commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire'};
const GROWTH_MINUTES = {common: 5, uncommon: 15, rare: 30, epic: 60, legendary: 120};
const BIRTH_XP = {common: 30, uncommon: 45, rare: 70, epic: 110, legendary: 180};
/** Each species' rarity, as recorded in the catalogue. */
const RARITY_OF = EXPECTED_RARITIES;

describe('canonical rarities', () => {
  it('are the five current rarities in display order', () => { expect([...RARITY_IDS]).toEqual(ORDER); expect(Object.keys(RARITIES)).toEqual(ORDER); });
  it('keep their exact labels, growth durations and birth XP', () => {
    for (const id of ORDER as (keyof typeof LABELS)[]) expect(RARITIES[id]).toEqual({label: LABELS[id], growthMinutes: GROWTH_MINUTES[id], birthXp: BIRTH_XP[id]});
  });
  it('projects in order through mapRarities', () => { expect(Object.keys(mapRarities(definition => definition.birthXp))).toEqual(ORDER); expect(mapRarities(definition => definition.label)).toEqual(LABELS); });
  it('still classify every species as the catalogue does', () => { for (const id of Object.keys(RARITY_OF) as SpeciesId[]) expect(SPECIES[id].rarity, id).toBe(RARITY_OF[id]); expect(Object.keys(SPECIES)).toEqual(EXPECTED_IDS); });
});

describe('consumers read the rarities module', () => {
  it('RARITY_NAMES keeps its labels and its order (the catalogue filter lists them in this order)', () => { expect(RARITY_NAMES).toEqual(LABELS); expect(Object.keys(RARITY_NAMES)).toEqual(ORDER); });
  it('growthDuration gives every species the growth of its rarity', () => {
    for (const id of Object.keys(RARITY_OF) as SpeciesId[]) expect(growthDuration(id), id).toBe(GROWTH_MINUTES[RARITY_OF[id] as keyof typeof GROWTH_MINUTES] * MINUTE);
    expect(growthDuration('paille')).toBe(5 * MINUTE); expect(growthDuration('lunettes')).toBe(30 * MINUTE);
    expect(growthDuration('magicien')).toBe(60 * MINUTE); expect(growthDuration('dragon')).toBe(120 * MINUTE);
  });
  it('BALANCE keeps its three growth fields', () => { expect([BALANCE.commonGrowth, BALANCE.hybridGrowth, BALANCE.rareGrowth]).toEqual([5 * MINUTE, 15 * MINUTE, 30 * MINUTE]); });
  it('the default progression pays the birth XP of each rarity', () => { expect(PROGRESSION.xp.birth).toEqual(BIRTH_XP); expect(Object.keys(PROGRESSION.xp.birth)).toEqual(ORDER); });
});

describe('a custom progression keeps its own birth XP', () => {
  const custom = (): ProgressionConfig => { const c = structuredClone(PROGRESSION); return {...c, xp: {...c.xp, birth: {common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5}}}; };
  it('is valid, keeps its values, and leaves the default and the rarities untouched', () => {
    const defaultBefore = structuredClone(PROGRESSION), raritiesBefore = structuredClone(RARITIES), c = custom();
    expect(() => validateProgressionConfig(c)).not.toThrow(); expect(c.xp.birth).toEqual({common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5});
    expect(PROGRESSION).toEqual(defaultBefore); expect(PROGRESSION.xp.birth.common).toBe(30); expect(RARITIES).toEqual(raritiesBefore);
  });
  it('still rejects a configuration without the birth XP of a rarity in use', () => {
    const c = custom(); Reflect.deleteProperty(c.xp.birth, 'epic'); expect(() => validateProgressionConfig(c)).toThrow(RangeError);
  });
});
