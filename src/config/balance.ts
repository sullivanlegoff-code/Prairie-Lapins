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
// Cushions dear in Hearts since the Christmas update (owner, 5 November 2026; 10 / 25 / 50 before); every save goes back to 2 at most.
export const NURSERY = {initialCapacity: 1, maxCapacity: 4, unlockHearts: {1: 40, 2: 120, 3: 250}} as const;
/**
 * The islet of the Epics (owner, 5 November 2026): a small islet floating south of the island (moved on 6 November), off the land grid, bought once
 * for `hearts` Hearts from player level `unlockLevel`. Its nest runs a second breeding at the same time as the island's, with
 * the chances of the Epics, the Legendaries and Benny multiplied by `bonus` (+10 %); the nursery keeps its cushions.
 * `cell`: the islet nest's top-left fine cell (a 4 × 4 nest), below the start island beyond the south edge of the land grid,
 * so the island's growth never reaches it.
 */
/**
 * « Le vol de Benny » (owner, 5 November 2026: Benny only, from a building of the main island, rewards of my choice): the
 * perch needs Benny on the island. The first `rewardedGamesPerCycle` games of a day pay `pattesPerColumn` per hay column
 * passed (at most `maxPattes`); the very first one also gives a Heart at `heartColumns` columns. Never XP.
 */
export const BENNY_FLIGHT = {rewardedGamesPerCycle: 3, pattesPerColumn: 3, maxPattes: 60, heartColumns: 20, maxColumns: 500} as const;
/**
 * The Ultra neige habitat (owner, 6 November 2026: « un tout nouvel habitat neige […] s'acheter niveau 1 et […] s'améliorer jusqu'au
 * niveau 3 en payant en sucre d'orge »): a snow enclosure of its own, sold at the Christmas market at level 1, then upgraded to levels
 * 2 and 3, every step paid in sucres d'orge only (no pattes, no Hearts, no XP). It keeps the snow habitat's places and footprints, and
 * stays after Christmas. In all 500 sucres d'orge, about twenty days of Christmas challenges.
 */
export const ULTRA_SNOW = {candies: {1: 100, 2: 150, 3: 250}} as const;
export const EPIC_ISLET = {unlockLevel: 18, hearts: 400, bonus: 1.1, cell: {x: 6, y: 70}} as const;
/** Paille's free gift: 3 Hearts every 24 h (2 before the Hearts / pattes balance of 3 November 2026), three gifts kept at most. */
export const HEARTS = {
  initial: 12, gift: 3, maximumGifts: 3, giftInterval: 24 * HOUR,
  accelerationStep: 5 * MINUTE, pattesPerHeart: 25,
};
// The species registry lives in ./species; the public names stay available from here.
export {SPECIES, SPECIES_IDS, LEGACY_SPECIES_IDS};
export type {SpeciesId, RabbitType, Rarity};
export type BuildingKind = 'enclosure' | 'farm' | 'nest' | 'nursery' | 'kitchen' | 'statue' | 'agency' | 'salon' | 'forest' | 'perch';
/** Every building kind, in the order the save validates them. */
export const BUILDING_KINDS = ['enclosure', 'farm', 'nest', 'nursery', 'kitchen', 'statue', 'agency', 'salon', 'forest', 'perch'] as const satisfies readonly BuildingKind[];
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
    forest: {price: 10000, maximum: 1}, // The Forêt de Brocéliande: see FOREST.
    perch: {price: 50000, maximum: 1}, // Benny's perch, for « Le vol de Benny »: see BENNY_FLIGHT.
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
/**
 * Upgrading (level 2, and level 3 which keeps it) shortens new crops by 20%, level 4 by 30%; already running crops retain
 * their frozen duration.
 */
export const farmDuration = (duration: number, farmLevel?: 2 | 3 | 4): number => farmLevel === 4 ? Math.ceil(duration * 0.7) : farmLevel ? Math.ceil(duration * 0.8) : duration;
/**
 * Farm upgrades, one farm at a time. Level 2 (30 Hearts, player level 9) opens the five crops from `fanes` on; level 3
 * (owner, 2 November 2026: 60 000 pattes, player level 20) opens the four fancy crops and keeps every level 2 advantage. Level 4 (8 November 2026: 100 000 pattes, player level 25)
 * opens three richer crops and makes every crop 30 % faster.
 */
export const FARM_UPGRADES = {2: {level: 9, hearts: 30}, 3: {level: 20, pattes: 60_000}, 4: {level: 25, pattes: 100_000}} as const;
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
/** 1 to 5 Hearts, more for a longer trip (owner, 5 November 2026; 1 to 3 before): 3–4 h 1, 5–6 h 2, 7–8 h 3, 9 h 4, 10 h 5. */
export const tripHearts = (hours: number): number => hours <= 4 ? 1 : hours <= 6 ? 2 : hours <= 8 ? 3 : hours <= 9 ? 4 : 5;
/** One draw picks both: destination index and length in hours. */
export function drawTrip(roll: number): {destination: Destination; hours: number} {
  const count = TRAVEL.destinations.length, lengths = TRAVEL.maxHours - TRAVEL.minHours + 1, n = Math.floor(roll * count * lengths);
  return {destination: TRAVEL.destinations[n % count], hours: TRAVEL.minHours + Math.floor(n / count)};
}
// Crop prices doubled for the Christmas update (owner, 5 November 2026). The hay keeps its 10 pattes: it is the guided first
// crop whose price Paille's guide quotes (her lines are never changed). On 8 November 2026 the owner asked for ×2.5: applied
// to the fancy crops only for now, because ×2.5 on every crop puts level 22 near day 43 in the simulation (owner to decide).
export const ORDERS = {
  foin: {name: 'Foin', level: 1, cost: 10, grass: 20, duration: 5 * MINUTE},
  pissenlit: {name: 'Pissenlit', level: 1, cost: 36, grass: 40, duration: 15 * MINUTE},
  trefle: {name: 'Trèfle', level: 3, cost: 60, grass: 70, duration: 30 * MINUTE},
  persil: {name: 'Persil', level: 5, cost: 100, grass: 120, duration: HOUR},
  laitue: {name: 'Laitue romaine', level: 7, cost: 160, grass: 200, duration: 2 * HOUR},
  fanes: {name: 'Fanes de carotte', level: 9, cost: 240, grass: 290, duration: 3 * HOUR},
  fenouil: {name: 'Fenouil', level: 11, cost: 320, grass: 380, duration: 4 * HOUR},
  pomme: {name: 'Pomme', level: 13, cost: 480, grass: 560, duration: 6 * HOUR},
  fraise: {name: 'Fraise', level: 16, cost: 660, grass: 760, duration: 8 * HOUR},
  banane: {name: 'Banane', level: 19, cost: 900, grass: 1000, duration: 10 * HOUR},
  // The fancy crops (owner, 2 November 2026; ×2.5 on 8 November 2026): same food stock, only in a level 3 farm (FANCY_ORDER_IDS).
  trefleDore: {name: 'Trèfle doré', level: 20, cost: 3000, grass: 1400, duration: 10 * HOUR},
  carotteArcEnCiel: {name: 'Carotte arc-en-ciel', level: 22, cost: 4000, grass: 1800, duration: 12 * HOUR},
  fraiseEtoilee: {name: 'Fraise étoilée', level: 24, cost: 5000, grass: 2200, duration: 14 * HOUR},
  pommeAmour: {name: 'Pomme d’amour', level: 26, cost: 6000, grass: 2700, duration: 16 * HOUR},
  // The level 4 farm crops (owner, 8 November 2026: a level 4 farm must pay off in the long run). More food per patte
  // (about 1.7 pattes per food against 2.2 for the fancy crops) and per hour than any level 3 crop.
  citrouilleDoree: {name: 'Citrouille dorée', level: 25, cost: 5000, grass: 2900, duration: 8 * HOUR},
  melonLune: {name: 'Melon de lune', level: 27, cost: 7000, grass: 4200, duration: 12 * HOUR},
  cerisesCristal: {name: 'Cerises de cristal', level: 29, cost: 9000, grass: 5600, duration: 16 * HOUR},
};
/** The fancy crops, reserved for a level 3 farm (and above). */
export const FANCY_ORDER_IDS = ['trefleDore', 'carotteArcEnCiel', 'fraiseEtoilee', 'pommeAmour'] as const;
/** The crops reserved for a level 4 farm. */
export const GRAND_ORDER_IDS = ['citrouilleDoree', 'melonLune', 'cerisesCristal'] as const;
export type FarmLevel = 1 | 2 | 3 | 4;
/** Farm level a crop needs: 4 for the level 4 crops, 3 for the fancy crops, 2 from the carrot tops on, 1 otherwise. */
export function orderFarmLevel(recipe: keyof typeof ORDERS): FarmLevel {
  if ((GRAND_ORDER_IDS as readonly string[]).includes(recipe)) return 4;
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
  unlockLevel: 22, // 12 before the Christmas update (owner, 5 November 2026).
  fullPrice: {common: 300, rare: 800, epic: 2000, legendary: 3500, mythic: 5000},
  // 3 November 2026: the bath is the quick, cheap care; the massage the long, dear one that gives the most XP (brush in between).
  // 5 November 2026: the first `heartCaresPerCycle` cares started in a daily cycle also bring back `hearts` Hearts.
  cares: {bath: {hours: 1, share: 0.5, xp: 10, hearts: 1}, brush: {hours: 2, share: 1, xp: 25, hearts: 1}, massage: {hours: 3, share: 1.5, xp: 45, hearts: 2}},
  heartCaresPerCycle: 2,
} as const satisfies {unlockLevel: number; fullPrice: Record<Rarity, number>; cares: Record<string, {hours: number; share: number; xp: number; hearts: number}>; heartCaresPerCycle: number};
export type CareKind = keyof typeof SALON.cares;
export const CARE_KINDS = Object.keys(SALON.cares) as CareKind[];
export const carePrice = (species: SpeciesId, care: CareKind): number => Math.round(SALON.fullPrice[SPECIES[species].rarity] * SALON.cares[care].share);
/**
 * The Forêt de Brocéliande (owner, 3 November 2026): one building, 10 000 pattes, from player level 20. Once built, the player
 * lets the player choose freely and for free between the evolved and old drawing of rabbits that have already evolved. Purely
 * cosmetic: no income, XP, affection or draw.
 */
// 20 before the Christmas update (owner, 5 November 2026). `changeMs`: since 6 November 2026 a change of drawing takes 7 hours, both ways.
export const FOREST = {unlockLevel: 25, changeMs: 7 * 3_600_000} as const;
/**
 * The jump-rope islet (owner, 4 November 2026): a small isolated islet left of the start island, with the kiosk on it, bought as
 * one building for `price` pattes from player level `unlockLevel`, one per game. Three rabbits of the player play: two carriers
 * turn the rope and the athlete jumps (looks only: no effect on difficulty or rewards). Tap when the rope passes under the athlete's
 * feet; the rope turns faster at every jump; one miss ends the game (`lives`), and the player may replay at will. The first
 * `rewardedGamesPerCycle` games of a daily cycle with at least one jump pay `pattesPerJump` pattes per jump, `maxPattes` at most,
 * and the first game of the cycle, only it (owner, 5 November 2026), gives one Heart if it reaches `heartJumps` jumps and the
 * challenge's Hearts if it meets the challenge. No XP, no affection. Later games beat the record.
 * A precise tap (within `perfectShare` of the window) is « Parfait ! »: looks and sound only.
 */
export const JUMP_ROPE = {
  unlockLevel: 20, price: 75_000, rewardedGamesPerCycle: 3, pattesPerJump: 2, maxPattes: 60, heartJumps: 30, lives: 1, maxScore: 999,
  /** Rope timing, in milliseconds: first turn, fastest turn, factor after each jump, half tap window (share of the turn, floor). */
  leadIn: 1600, startPeriod: 1250, minPeriod: 540, speedUp: 0.965, windowShare: 0.24, minWindow: 120, perfectShare: 0.4,
  /** Every `milestone` jumps, a bigger cheer. */
  milestone: 10,
  /** Record medals (owner, 4 November 2026): one hangs on the kiosk for each step the record reaches. */
  medals: [10, 25, 50, 100],
  /**
   * The challenge of the day (owner, 4 November 2026): drawn from the daily cycle alone (no network), reach `jumps` jumps,
   * sometimes with an athlete of one rabbit type; `hearts` Hearts once a cycle, on top of the other rewards.
   */
  challenge: {hearts: 2, jumps: [15, 20, 25], types: ['paille', 'neige', 'feu', 'metal', 'vol']},
} as const;
/** The picnic: from player level 8, one a day in all, in one enclosure; paid and rewarded per rabbit present. */
// 10 XP per rabbit present since 3 November 2026 (5 before).
export const PICNIC = {unlockLevel: 8, pricePerRabbit: 300, xpPerRabbit: 10} as const;
/**
 * The Statues de l'Affection, in purchase order (hearts only, sold among the buildings). Statue n is sold from player level
 * `level` for `heartPrice` Hearts; without it, affection stops at `cap`. The second one has its own painting (src/config/statueArt.ts).
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
