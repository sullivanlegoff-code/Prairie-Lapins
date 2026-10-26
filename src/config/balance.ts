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
  initial: 12, gift: 2, maximumGifts: 3, giftInterval: 24 * HOUR,
  accelerationStep: 5 * MINUTE, pattesPerHeart: 25,
};
/** Paille's counter (late game): one Heart for pattes or grass; each exchange of a daily cycle costs 25 % more, 30 at most per resource. */
export const MARKET = {unlockLevel: 10, base: {pattes: 250, grass: 100}, growth: 1.25, maximumPerCycle: 30} as const;
// The species registry lives in ./species; the public names stay available from here.
export {SPECIES, SPECIES_IDS, LEGACY_SPECIES_IDS};
export type {SpeciesId, RabbitType, Rarity};
export type BuildingKind = 'enclosure' | 'farm' | 'nest' | 'nursery' | 'kitchen' | 'statue' | 'agency';
export const BREEDING_WEIGHTS = {common: 30, recipe: 30};
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
  initialPattes: 350, initialGrass: 0, initialWidth: 3, height: 2, extendedWidth: 6,
  extensionCost: 600, enclosureCapacity: 3, enclosureCap: 2100,
  minAffection: 1, maxAffection: 20, breedingAffection: 2,
  incomeBase: 10, incomeRareBase: 14, incomePerLevel: 1,
  releaseGrass: {common: 10, rare: 25},
  breedingCost: 0, breedingDuration: 20 * MINUTE,
  commonGrowth: RARITIES.common.growthMinutes * MINUTE, hybridGrowth: RARITIES.uncommon.growthMinutes * MINUTE, rareGrowth: RARITIES.rare.growthMinutes * MINUTE, guaranteeAttempt: 8,
  buildings: {
    enclosure: {price: 350, maximum: null}, farm: {price: 60, maximum: 2},
    nest: {price: 100, maximum: 1}, nursery: {price: 80, maximum: 1},
    kitchen: {price: 100, maximum: 1}, // Provisional building-only integration price.
    statue: {price: 30000, maximum: 1}, // The Statue de l'Affection: see AFFECTION_STATUE.
    agency: {price: 1000, maximum: 1}, // The travel agency: see TRAVEL.
  } satisfies Record<BuildingKind, {price: number; maximum: number | null}>,
};
/**
 * The farm's ten crops (owner, 25 October 2026), from the least to the best liked by rabbits. Every crop yields food
 * (the single `grass` stock); a better-liked crop costs more, takes longer, opens later and yields more per harvest,
 * so the long ones fill the gaps between the three daily sessions. `level` is the player level that opens it.
 */
/**
 * Hourly income at affection 1 (owner, 25 October 2026): rares no longer all earn the same. Nine surviving species from the twelve drawn once
 * on that day earn the higher rare base; epics and legendaries earn more still. Each affection point adds `incomePerLevel`.
 */
export const RARE_INCOME_BONUS_SPECIES: readonly SpeciesId[] = ['amethyste', 'boudinet', 'bretonette', 'egiiipte', 'frisket', 'princesse-neige', 'roukette', 'virvoletant', 'wat-wat'];
export const INCOME_BASES = {common: 10, rare: 14, rareBonus: 17, epic: 20, legendary: 26} as const;
/**
 * The travel agency (owner, 25 October 2026), sold among the buildings from player level 8. One rabbit travels at a time,
 * to a destination drawn at random, for 3 to 10 whole hours (drawn with it); it brings back Hearts, more for a longer trip.
 * The traveller keeps its place and its income at home, but cannot be fed, bred, moved or entrusted while away.
 */
export const TRAVEL = {
  unlockLevel: 8, minHours: 3, maxHours: 10,
  destinations: ['Londres', 'Vannes', 'Le Caire', 'Hammamet', 'Le Lavandou', 'Bandol', 'Lille', 'Paris', 'Marrakech'],
} as const;
export type Destination = typeof TRAVEL.destinations[number];
export const tripHearts = (hours: number): number => hours <= 4 ? 1 : hours <= 7 ? 2 : 3;
/** One draw picks both: destination index and length in hours. */
export function drawTrip(roll: number): {destination: Destination; hours: number} {
  const count = TRAVEL.destinations.length, lengths = TRAVEL.maxHours - TRAVEL.minHours + 1, n = Math.floor(roll * count * lengths);
  return {destination: TRAVEL.destinations[n % count], hours: TRAVEL.minHours + Math.floor(n / count)};
}
export const ORDERS = {
  foin: {name: 'Foin', level: 1, cost: 10, grass: 20, duration: 5 * MINUTE},
  pissenlit: {name: 'Pissenlit', level: 1, cost: 18, grass: 40, duration: 15 * MINUTE},
  trefle: {name: 'Trèfle', level: 3, cost: 30, grass: 70, duration: 30 * MINUTE},
  persil: {name: 'Persil', level: 5, cost: 50, grass: 120, duration: HOUR},
  laitue: {name: 'Laitue romaine', level: 7, cost: 80, grass: 200, duration: 2 * HOUR},
  fanes: {name: 'Fanes de carotte', level: 9, cost: 120, grass: 290, duration: 3 * HOUR},
  fenouil: {name: 'Fenouil', level: 11, cost: 160, grass: 380, duration: 4 * HOUR},
  pomme: {name: 'Pomme', level: 13, cost: 240, grass: 560, duration: 6 * HOUR},
  fraise: {name: 'Fraise', level: 16, cost: 330, grass: 760, duration: 8 * HOUR},
  banane: {name: 'Banane', level: 19, cost: 450, grass: 1000, duration: 10 * HOUR},
};
/** Production ids of saves before the ten crops, mapped to the crop that shows them; their amount and duration stay frozen. */
export const LEGACY_ORDER_CROPS = {small: 'foin', medium: 'trefle', large: 'fenouil', night: 'banane'} as const;
/**
 * Food needed to raise a rabbit's affection from `a` to `a + 1` (index a). The step 14 → 15 is a deliberate wall:
 * affection 15 and above also needs the Statue de l'Affection.
 */
export const FEED_COSTS: readonly number[] = [0, 2, 4, 8, 14, 22, 32, 45, 60, 80, 110, 140, 180, 230, 1500, 400, 480, 570, 670, 800];
export const feedCost = (affection: number): number => FEED_COSTS[affection] ?? Infinity;
/** Affection above `cap` needs the statue, sold among the buildings from player level `level`. */
export const AFFECTION_STATUE = {level: 15, cap: 14} as const;
/** Epic and legendary recipe chances, multiplied when BOTH parents reach the affection (highest step applies). */
export const RARE_BIRTH_BONUS: readonly {readonly affection: number; readonly factor: number}[] = [{affection: 15, factor: 2}, {affection: 10, factor: 1.5}];
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
