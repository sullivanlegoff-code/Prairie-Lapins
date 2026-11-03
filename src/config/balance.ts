import {RECIPE_POLICIES} from './recipePolicies';
import {SPECIES, SPECIES_IDS, LEGACY_SPECIES_IDS, hasRecipe, isSold, type SpeciesId, type RabbitType, type Rarity} from './species';
import {RARITIES} from './rarities';
export const HOUR = 3_600_000;
export const MINUTE = 60_000;
/** Cuisine pays full rewards for the first successful completions of each daily cycle, all recipes together. */
export const CUISINE_FULL_REWARDS_PER_CYCLE = 5;
/** Full reward by recipe: the chicken (oven and two preparations) pays more, the average stays 50 coins.
 * The salad was removed on 1 November 2026: no save stores a recipe id, only the shared slots of the cycle. */
export const CUISINE_REWARDS = {'avocado-toast': {pattes: 45, grass: 3}, moelleux: {pattes: 45, grass: 3}, chicken: {pattes: 60, grass: 3}} as const;
export type CuisineRecipeId = keyof typeof CUISINE_REWARDS;
/** Every completion after the full-reward slots of the cycle: replay stays possible, but it is only a tip. */
export const CUISINE_TIP = {pattes: 5, grass: 1} as const;
/**
 * The single nursery starts with one usable cushion; the asset has four (structural).
 * `unlockHearts[c]` is the Heart price of the permanent step c → c + 1: provisional balance values, not structural
 * constants, awaiting the owner's tuning. Hearts only; read them through `nurseryUnlockQuote`.
 */
export const NURSERY = {initialCapacity: 1, maxCapacity: 4, unlockHearts: {1: 10, 2: 25, 3: 50}} as const;
/** Paille's free gift: 3 Hearts every 24 h (2 before the Hearts / pattes balance of 3 November 2026), three gifts kept at most. */
export const HEARTS = {
  initial: 12, gift: 3, maximumGifts: 3, giftInterval: 24 * HOUR,
  accelerationStep: 5 * MINUTE, pattesPerHeart: 25,
};
/** Paille's counter (late game): one Heart for pattes or grass; each exchange of a daily cycle costs 25 % more, 30 at most per resource. */
export const MARKET = {unlockLevel: 10, base: {pattes: 250, grass: 100}, growth: 1.25, maximumPerCycle: 30} as const;
// The species registry lives in ./species; the public names stay available from here.
export {SPECIES, SPECIES_IDS, LEGACY_SPECIES_IDS};
export type {SpeciesId, RabbitType, Rarity};
export type BuildingKind = 'enclosure' | 'farm' | 'nest' | 'nursery' | 'kitchen' | 'statue' | 'agency' | 'salon';
/** Every building kind, in the order the save validates them. */
export const BUILDING_KINDS = ['enclosure', 'farm', 'nest', 'nursery', 'kitchen', 'statue', 'agency', 'salon'] as const satisfies readonly BuildingKind[];
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
  extensionCost: 600, enclosureCapacity: 3, enclosureCap: 200,
  minAffection: 1, maxAffection: 50, breedingAffection: 2,
  incomeBase: 10, incomeRareBase: 10, incomePerLevel: 1,
  releaseGrass: {common: 10, rare: 25},
  /** A ready baby released from the nursery, by rarity (common: 20, decided by the owner). */
  releaseBabyPattes: {common: 20, rare: 100, epic: 500, legendary: 1000, mythic: 1000}, // Benny is never released (BENNY_KEPT).
  breedingCost: 0,
  commonGrowth: RARITIES.common.growthMinutes * MINUTE, rareGrowth: RARITIES.rare.growthMinutes * MINUTE, guaranteeAttempt: 8,
  buildings: {
    enclosure: {price: 350, maximum: null}, farm: {price: 60, maximum: 4},
    nest: {price: 100, maximum: 1}, nursery: {price: 80, maximum: 1},
    kitchen: {price: 100, maximum: 1}, // Provisional building-only integration price.
    statue: {price: 60, currency: 'hearts', maximum: 2}, // Hearts only, never a coin purchase or complement; the second costs more (AFFECTION_STATUES).
    agency: {price: 1000, maximum: 1}, // The travel agency: see TRAVEL.
    salon: {price: 5000, maximum: 1}, // The Salon de soins: see SALON.
  } satisfies Record<BuildingKind, {price: number; currency?: 'hearts'; maximum: number | null}>,
};
/**
 * The farm's ten crops (owner, 25 October 2026), from the least to the best liked by rabbits. Every crop yields food
 * (the single `grass` stock); a better-liked crop costs more, takes longer, opens later and yields more per harvest,
 * so the long ones fill the gaps between the three daily sessions. `level` is the player level that opens it.
 */
/** Individual rare income uses a saved roll, not a species-wide bonus. */
export const RARE_INCOME_BONUS_SPECIES: readonly SpeciesId[] = [];
export const INCOME_BASES = {common: 10, rare: 10, rareBonus: 10, epic: 13, legendary: 15, mythic: 15} as const;
/** Keep the first two farms available; later slots follow player progression. */
export const farmLimit = (level: number): number => level >= 15 ? 4 : level >= 12 ? 3 : 2;
/** Upgrading (level 2, and level 3 which keeps it) shortens new crops by 20%; already running crops retain their frozen duration. */
export const farmDuration = (duration: number, farmLevel?: 2 | 3): number => farmLevel ? Math.ceil(duration * 0.8) : duration;
/**
 * Farm upgrades, one farm at a time. Level 2 (30 Hearts, player level 9) opens the five crops from `fanes` on; level 3
 * (owner, 2 November 2026: 60 000 pattes, player level 20) opens the four fancy crops and keeps every level 2 advantage.
 */
export const FARM_UPGRADES = {2: {level: 9, hearts: 30}, 3: {level: 20, pattes: 60_000}} as const;
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
  // The fancy crops (owner, 2 November 2026): same food stock, planted only in a level 3 farm (FANCY_ORDER_IDS).
  trefleDore: {name: 'Trèfle doré', level: 20, cost: 600, grass: 1400, duration: 10 * HOUR},
  carotteArcEnCiel: {name: 'Carotte arc-en-ciel', level: 22, cost: 800, grass: 1800, duration: 12 * HOUR},
  fraiseEtoilee: {name: 'Fraise étoilée', level: 24, cost: 1000, grass: 2200, duration: 14 * HOUR},
  pommeAmour: {name: 'Pomme d’amour', level: 26, cost: 1200, grass: 2700, duration: 16 * HOUR},
};
/** The fancy crops, reserved for a level 3 farm. */
export const FANCY_ORDER_IDS = ['trefleDore', 'carotteArcEnCiel', 'fraiseEtoilee', 'pommeAmour'] as const;
/** Farm level a crop needs: 3 for the fancy crops, 2 from the carrot tops on, 1 otherwise. */
export function orderFarmLevel(recipe: keyof typeof ORDERS): 1 | 2 | 3 {
  return (FANCY_ORDER_IDS as readonly string[]).includes(recipe) ? 3 : ORDERS[recipe].level >= ORDERS.fanes.level ? 2 : 1;
}
/** Production ids of saves before the ten crops, mapped to the crop that shows them; their amount and duration stay frozen. */
export const LEGACY_ORDER_CROPS = {small: 'foin', medium: 'trefle', large: 'fenouil', night: 'banane'} as const;
/**
 * Food needed to raise a rabbit's affection from `a` to `a + 1` (index a). The steps 14 → 15, 29 → 30 and 49 → 50 are deliberate
 * walls; affection 15 and above also needs the Statue de l'Affection, and 31 and above a second statue.
 */
export const FEED_COSTS: readonly number[] = [
  0, 2, 4, 8, 14, 22, 32, 45, 60, 80, 110, 140, 180, 230, 1500, 400, 480, 570, 670, 800,
  900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 6000,
  1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 10000,
];
export const feedCost = (affection: number): number => FEED_COSTS[affection] ?? Infinity;
/** A wall (14 → 15, 29 → 30, 49 → 50): a step dearer than both its neighbours. Only a meal crosses it, never a gift. */
export const isAffectionWall = (affection: number): boolean => affection > 0 && FEED_COSTS[affection] > FEED_COSTS[affection - 1] && FEED_COSTS[affection] > (FEED_COSTS[affection + 1] ?? 0);
/**
 * Affection gifts (owner, 2 November 2026): a care at the Salon de soins or a picnic gives +1 affection, at most one gift per
 * rabbit and per daily cycle (the missions' cycle), never across a wall and within the statues' cap.
 * The Salon de soins: one building (5 000 pattes, player level 12), one rabbit at a time, away from its enclosure like a
 * traveller. The full price depends on the rabbit's rarity; each care takes its share of it, lasts `hours` and gives `xp` at the return.
 */
export const SALON = {
  unlockLevel: 12,
  fullPrice: {common: 300, rare: 800, epic: 2000, legendary: 3500, mythic: 5000},
  // 3 November 2026: the bath is the quick, cheap care; the massage the long, dear one that gives the most XP (brush in between).
  cares: {bath: {hours: 1, share: 0.5, xp: 10}, brush: {hours: 2, share: 1, xp: 25}, massage: {hours: 3, share: 1.5, xp: 45}},
} as const satisfies {unlockLevel: number; fullPrice: Record<Rarity, number>; cares: Record<string, {hours: number; share: number; xp: number}>};
export type CareKind = keyof typeof SALON.cares;
export const CARE_KINDS = Object.keys(SALON.cares) as CareKind[];
export const carePrice = (species: SpeciesId, care: CareKind): number => Math.round(SALON.fullPrice[SPECIES[species].rarity] * SALON.cares[care].share);
/** The picnic: from player level 8, one a day in all, in one enclosure; paid and rewarded per rabbit present. */
// 10 XP per rabbit present since 3 November 2026 (5 before).
export const PICNIC = {unlockLevel: 8, pricePerRabbit: 300, xpPerRabbit: 10} as const;
/**
 * The Statues de l'Affection, in purchase order (hearts only, sold among the buildings). Statue n is sold from player level
 * `level` for `heartPrice` Hearts; without it, affection stops at `cap`. Both statues share the same painting.
 */
export const AFFECTION_STATUES = [
  {level: 15, cap: 14, heartPrice: BALANCE.buildings.statue.price},
  {level: 22, cap: 30, heartPrice: 100}, // 3 November 2026 (150 Hearts at level 25 before): affection 20 → 50 in about 30 days.
] as const;
/** The first statue: affection above `cap` needs it, sold from player level `level`. */
export const AFFECTION_STATUE = AFFECTION_STATUES[0];
/** The second statue: affection above `cap` (31 and more) needs it as well. */
export const SECOND_AFFECTION_STATUE = AFFECTION_STATUES[1];
/** Epic, legendary and mythic recipe chances, multiplied when BOTH parents reach the affection (highest step applies). */
export const RARE_BIRTH_BONUS: readonly {readonly affection: number; readonly factor: number}[] = [
  {affection: 50, factor: 2}, {affection: 30, factor: 1.5}, {affection: 15, factor: 1.3}, {affection: 10, factor: 1.15},
];
export type OrderId = keyof typeof ORDERS;
export type Odds = Partial<Record<SpeciesId, number>>;
// Historical compatibility reference for tests/consumers; production candidates come from the catalogue, never this result list.
// Sorted type unions; weights are percentages.
export const BREEDING_ODDS: Record<string, Odds> = {
  paille: {paille: 100}, neige: {neige: 100},
  'neige,paille': {paille: 40, neige: 40},
};

/**
 * Nursery growth, and since the owner's rule of 28 October 2026 the same time in the nest, per species. Each rare species has its
 * own fixed time (15, 20, 25 or 30 minutes); epic and legendary times come from RARITIES.
 */
const RARE_GROWTH_MINUTES: Partial<Record<SpeciesId, number>> = {
  frisket: 15, icy: 15, ardent: 15, snk: 15, 'pic-pic': 15,
  amethyste: 20, 'princesse-neige': 20, fluffy: 20, virvoletant: 20, phoenix: 20,
  roukette: 25, 'wat-wat': 25, glassofeu: 25, plume: 25, boudinet: 25,
  bouee: 30, egiiipte: 30, piment: 30, tunini: 30, bretonette: 30,
};
export function growthDuration(species: SpeciesId): number {
  return (RARE_GROWTH_MINUTES[species] ?? RARITIES[SPECIES[species].rarity].growthMinutes) * MINUTE;
}
/** Nest time of saves written before the per-species breeding time (20 minutes for every species): still accepted. */
export const LEGACY_BREEDING_DURATION = 20 * MINUTE;
