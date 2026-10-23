import {RECIPE_POLICIES} from './recipePolicies';
import {SPECIES, SPECIES_IDS, LEGACY_SPECIES_IDS, hasRecipe, isSold, type SpeciesId, type RabbitType, type Rarity} from './species';
import {RARITIES} from './rarities';
export const HOUR = 3_600_000;
export const MINUTE = 60_000;
/** Cuisine pays full rewards for the first successful completions of each daily cycle, all recipes together. */
export const CUISINE_FULL_REWARDS_PER_CYCLE = 5;
/** Full reward by recipe: the longer recipe pays more, the average stays 50 coins. */
export const CUISINE_REWARDS = {salad: {pattes: 40, grass: 3}, chicken: {pattes: 60, grass: 3}} as const;
/** Every completion after the full-reward slots of the cycle: replay stays possible, but it is only a tip. */
export const CUISINE_TIP = {pattes: 5, grass: 1} as const;
/**
 * The single nursery starts with one usable cushion; the asset has four (structural).
 * `unlockHearts[c]` is the Heart price of the permanent step c → c + 1: provisional balance values, not structural
 * constants, awaiting the owner's tuning. Hearts only; read them through `nurseryUnlockQuote`.
 */
export const NURSERY = {initialCapacity: 1, maxCapacity: 4, unlockHearts: {1: 10, 2: 25, 3: 50}} as const;
export const HEARTS = {
  initial: 12, gift: 2, giftInterval: 24 * HOUR,
  accelerationStep: 5 * MINUTE, pattesPerHeart: 25,
};
// The species registry lives in ./species; the public names stay available from here.
export {SPECIES, SPECIES_IDS, LEGACY_SPECIES_IDS};
export type {SpeciesId, RabbitType, Rarity};
export type BuildingKind = 'enclosure' | 'farm' | 'nest' | 'nursery' | 'kitchen';
export const BREEDING_WEIGHTS = {common: 40, recipe: 20};
/** Exact element unions only; additional elements retain the historical pool.
 * Eligibility comes from catalogue recipes, never a fixed list of results. */
export const ORDINARY_POOL_POLICIES: Readonly<Record<string, {readonly recipeRarity: Rarity}>> = {
  'neige,paille': {recipeRarity: 'rare'},
};
/** Legacy union-specific raw weights, applied AFTER catalogue eligibility. No result ids or closed candidate lists.
 * Single-element legacy unions used 100 per historical common.
 * All other unions and all ordinary recipes keep BREEDING_WEIGHTS (these are weights, not normalised probabilities).
 */
export const HISTORICAL_COMMON_WEIGHTS: Readonly<Record<string, number>> = {
  paille: 100, neige: 100,
};
export const GUARANTEE_SPECIES: readonly SpeciesId[] = RECIPE_POLICIES.guaranteed;
export const SHOP_SPECIES = SPECIES_IDS.filter(id => isSold(SPECIES[id]));
export const RECIPE_SPECIES = SPECIES_IDS.filter(id => hasRecipe(SPECIES[id]));
export const BALANCE = {
  initialPattes: 300, initialGrass: 10, initialWidth: 3, height: 2, extendedWidth: 6,
  extensionCost: 500, enclosureCapacity: 3, enclosureCap: 600,
  minAffection: 1, maxAffection: 20, breedingAffection: 2,
  incomeBase: 12, incomePerLevel: 2, foodMultiplier: 2,
  breedingCost: 0, breedingDuration: 20 * MINUTE,
  commonGrowth: RARITIES.common.growthMinutes * MINUTE, hybridGrowth: RARITIES.uncommon.growthMinutes * MINUTE, rareGrowth: RARITIES.rare.growthMinutes * MINUTE, guaranteeAttempt: 10,
  buildings: {
    enclosure: {price: 120, maximum: null}, farm: {price: 60, maximum: 2},
    nest: {price: 100, maximum: 1}, nursery: {price: 80, maximum: 1},
    kitchen: {price: 100, maximum: 1}, // Provisional building-only integration price.
  } satisfies Record<BuildingKind, {price: number; maximum: number | null}>,
};
export const ORDERS = {
  small: {cost: 10, grass: 20, duration: 5 * MINUTE},
  medium: {cost: 18, grass: 40, duration: 15 * MINUTE},
  large: {cost: 40, grass: 100, duration: 60 * MINUTE},
};
export type OrderId = keyof typeof ORDERS;
export type Odds = Partial<Record<SpeciesId, number>>;
// Historical compatibility reference for tests/consumers; production candidates come from the catalogue, never this result list.
// Sorted type unions; weights are percentages.
export const BREEDING_ODDS: Record<string, Odds> = {
  paille: {paille: 100}, neige: {neige: 100},
  'neige,paille': {paille: 40, neige: 40},
};

export function growthDuration(species: SpeciesId): number {
  return RARITIES[SPECIES[species].rarity].growthMinutes * MINUTE;
}
