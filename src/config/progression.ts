import type {Rarity, SpeciesId} from './balance';
import {mapSpecies} from './species';
import {mapRarities} from './rarities';
import type {HabitatType, HabitatLevel} from './habitats';
import type {MainMissionId, DailyMissionId} from './missions';

export const LEVEL_ACCESS_FAMILIES = ['species', 'habitatPurchase', 'habitatUpgrade', 'decoration', 'extension'] as const;
export type LevelAccessFamily = typeof LEVEL_ACCESS_FAMILIES[number];

export type SpecializedHabitat = Exclude<HabitatType, 'universal'>;
/** Central progression configuration; each family has an explicit activation switch. */
export interface ProgressionConfig {
  readonly activeLevelFamilies: Readonly<Record<LevelAccessFamily, boolean>>;
  readonly curve: {readonly initialLevel: 1; readonly maximumLevel: number; readonly base: number; readonly exponent: number};
  readonly rewards: {readonly heartsPerLevel: number};
  readonly xp: {
    readonly commonPurchase: number;
    readonly discovery: {readonly common: number; readonly rare: number};
    readonly construction: {readonly specializedHabitat: number; readonly universalHabitat: number; readonly farm: number};
    readonly birth: Readonly<Record<Rarity, number>>;
    readonly foodMultiplier: number;
    readonly breedingLaunch: number;
    readonly firstDecorationPlacement: {readonly minimum: number; readonly priceDivisor: number};
    readonly claims: {readonly main: number; readonly daily: number; readonly dailyBonus: number;
      readonly mainExceptions: Readonly<Partial<Record<MainMissionId, number>>>;
      readonly dailyExceptions: Readonly<Partial<Record<DailyMissionId, number>>>};
  };
  readonly requirements: {
    readonly species: Readonly<Record<SpeciesId, number>>;
    /** Resolve specialized habitats through their existing common species, not a second catalogue. */
    readonly habitatCommons: Readonly<Record<SpecializedHabitat, SpeciesId>>;
    readonly universalHabitat: number;
    readonly habitatUpgradeOffsets: Readonly<Record<Exclude<HabitatLevel, 1>, number>>;
    readonly decorations: readonly {readonly minimumPrice: number; readonly level: number}[];
    readonly extensions: readonly number[];
    readonly buildings: {readonly farm: number; readonly nest: number; readonly nursery: number};
  };
}
export const PROGRESSION: ProgressionConfig = {
  activeLevelFamilies: {species: true, habitatPurchase: true, habitatUpgrade: true, decoration: true, extension: true},
  curve: {initialLevel: 1, maximumLevel: 30, base: 90, exponent: 1.15},
  rewards: {heartsPerLevel: 1},
  xp: {
    commonPurchase: 10, discovery: {common: 60, rare: 250},
    construction: {specializedHabitat: 30, universalHabitat: 40, farm: 20},
    // Default birth XP comes from the rarities data; a custom configuration still supplies its own record.
    birth: mapRarities(definition => definition.birthXp),
    foodMultiplier: 5, breedingLaunch: 5,
    firstDecorationPlacement: {minimum: 10, priceDivisor: 10},
    claims: {main: 40, daily: 50, dailyBonus: 0, mainExceptions: {}, dailyExceptions: {}},
  },
  requirements: {
    // Default levels come from each species' own definition; a custom configuration still supplies its own record.
    species: mapSpecies(definition => definition.progression.unlockLevel),
    habitatCommons: {paille: 'paille', neige: 'neige', feu: 'feu', metal: 'belier-gris', vol: 'volant'},
    universalHabitat: 6, habitatUpgradeOffsets: {2: 2, 3: 5},
    decorations: [{minimumPrice: 0, level: 1}, {minimumPrice: 60, level: 3}, {minimumPrice: 100, level: 5}],
    extensions: [4, 6, 8, 10, 12, 15, 18, 22],
    buildings: {farm: 1, nest: 1, nursery: 1},
  },
};
