import {historicalIncomeRoll} from '../simulation/time';
import {MAX_APPLIED_ADJUSTMENTS} from '../simulation/adjustments';
import {cumulativeLevelXp, nextLevelCost, xpAfterSlowdown} from '../simulation/progression';
import {establishHistoricalLevelRights} from '../simulation/levelRights';
import {isUltimate} from '../simulation/affection';
import {classicLookReason} from '../simulation/forest';
import {PURCHASE_UNLOCK_IDS} from '../config/purchaseUnlocks';
import {RECIPE_BOOK_SPECIES} from '../config/recipes';
import {updateMissions} from '../simulation/missions';
import {buildingPlacementReason, footprintPlacementReason} from '../simulation/placement';
import {debrisFootprint} from '../simulation/debris';
import {growFormerEnclosures} from '../simulation/enclosureGrowth';
import {ENCLOSURE_SIZE_ERA} from '../config/habitatSizes';
import {normalizeRabbitName} from '../simulation/rabbitNames';
import {PARCEL_IDS, startParcel} from '../config/land';
import {type HabitatType, HABITAT_TYPES, HABITAT_LEVELS, habitatLevel} from '../config/habitats';
import {MAIN_MISSION_IDS, DAILY_MISSION_IDS, DAILY_MISSIONS, DAILY_PICK_COUNT} from '../config/missions';
import {cycleIndexAt} from '../simulation/missions';
import {z} from 'zod';
import {BALANCE, FOREST, BUILDING_KINDS, CARE_KINDS, SALON, JUMP_ROPE, LEGACY_BREEDING_DURATION, EPIC_ISLET, BENNY_FLIGHT, CUISINE_FULL_REWARDS_PER_CYCLE, HOUR, LEGACY_ORDER_CROPS, TRAVEL, tripHearts, NURSERY, ORDERS, type OrderId, SHOP_SPECIES, SPECIES, SPECIES_IDS, GUARANTEE_SPECIES, growthDuration, orderFarmLevel, type SpeciesId} from '../config/balance';
import type {GameState} from '../state/types';
import {ALL_DECORATION_IDS, DECORATION_IDS, RETIRED_DECORATION_IDS, MAX_DECORATIONS, isChristmasDecoration} from '../config/decorations';
import {CHRISTMAS_CHALLENGES, CHRISTMAS_CHALLENGE_IDS, CHRISTMAS_PICK_COUNT, COIN_BUBBLE_CANDIES, MAX_CANDIES, SKY_GIFTS} from '../config/christmasEvent';
import {decorationPlacementReason} from '../simulation/decorations';
import {ISLAND} from '../config/islandGeometry';
import {EVOLUTION_CHALLENGES, EVOLUTION_CHALLENGE_IDS, evolutionChallengeTarget, evolutionChallengesComplete, type EvolutionChallenge} from '../config/evolutionChallenges';
import {EVOLUTION_AFFECTION, hasEvolvedArt} from '../config/evolvedArt';

/**
 * The current format is v27 (the Christmas update's economy: Paille's counter removed, the nursery back to 2 cushions at
 * most, 1 to 5 Hearts a trip and the Salon's Hearts, see `migrateV26`), after v26 (the Christmas event: the sucres d'orge, the Christmas challenges of the cycle, the snowman of the
 * day, the mini-game « Les cadeaux du ciel » and the Christmas market's decorations with their receipt in sucres d'orge, all
 * optional; nothing to convert, see `migrateV25`), after v25 (the evolution challenges « commis », « goûteur » and « quotidien », the daily streak, the daily missions drawn at the start of the cycle and the rabbits caressed in it, see `migrateV24`), after v24 (larger enclosures: an enclosure may keep its former footprint, see `migrateV23`; enlarged again on 6 November 2026 within v27, see `migrateEnclosureSizes`), after v23 (affection up to 50, a second Statue de l'Affection, the Salon de soins and the picnic, a lapin ultime's taken-off crown, the Forêt de Brocéliande and a rabbit's old drawing put back, the Terrain de corde à sauter, all optional; nothing to convert), after v22 (Benny's power and sky mode, optional), v21 (friendships and memories), v20 (catalogue conversion) and v19 (farm and agency levels, concurrent trips, Heart receipts), migrated through v18 and v17 from v16 (economy migration). Version 16 was the catalogue boundary of the development saves: the species Terre, Mottelin, Géant and
 * Brumelin and the Terre habitat were removed, and saves before that catalogue boundary are not converted. Versions 1 to 15 are refused as incompatible
 * (the controller then starts a new game); they are never read, migrated or restored.
 */
export const SAVE_VERSION = 27;
/** Types a species had before the owner changed them: a rabbit already housed under its old types may stay where it is. */
const LEGACY_TYPES: Partial<Record<SpeciesId, readonly HabitatType[]>> = {magicien: ['metal', 'vol'], bouee: ['paille', 'feu'], dadi: ['neige', 'vol']};
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const offGridCell = z.number().int().min(-64).max(Number.MAX_SAFE_INTEGER);
// Rebasing a clock may move historical dates before the Unix epoch. Resources stay nonnegative.
const timestamp = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const identity = z.string().regex(/^(building|rabbit|birth)-[1-9]\d*$/);
const species = z.enum(SPECIES_IDS);
const birth = z.object({id: identity, species, guaranteed: z.boolean(), reservedDiscovery: z.boolean()}).strict();
// An enclosure may store the footprint tier it has acquired (1 = 6 × 5, 2 = 10 × 6, 3 = 12 × 7 fine cells). With `formerFootprint`,
// it keeps the size of a former era: 1 = before 3 November 2026 (4 × 4, 6 × 5, 8 × 6), 2 = from 3 November 2026 (5 × 4, 8 × 5,
// 10 × 6); saves v24 to v26, and v27 saves without `enclosureSizes`, wrote `true` for era 1 (see `migrateEnclosureSizes`).
// Absent tier means tier 1 at any level.
const footprintTier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const nurseryBaby = z.object({slot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), birth, startedAt: timestamp, readyAt: timestamp}).strict();
const nurseryPayload = z.object({capacity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), babies: z.array(nurseryBaby).max(NURSERY.maxCapacity)}).strict();
const building = z.object({
  // x, y: a fine cell; only the islet's nest (off the land grid, checked below) may sit at a negative one.
  id: identity, kind: z.enum(BUILDING_KINDS), x: offGridCell, y: offGridCell, incomeUnits: integer,
  habitat: z.object({type: z.enum(HABITAT_TYPES), level: z.union([z.literal(1), z.literal(2), z.literal(3)]), ultra: z.literal(true).optional()}).strict().nullable(),
  farmLevel: z.union([z.literal(2), z.literal(3)]).optional(), agencyLevel: z.union([z.literal(2), z.literal(3)]).optional(),
  footprintTier: footprintTier.optional(), formerFootprint: z.union([z.literal(1), z.literal(2)]).optional(), islet: z.literal(true).optional(),
  order: z.object({recipe: z.enum(Object.keys(ORDERS) as [OrderId, ...OrderId[]]), startedAt: timestamp, endsAt: timestamp, grass: integer.optional(), duration: integer.positive().optional()}).strict().nullable(),
  breeding: z.object({parents: z.tuple([identity, identity]), startedAt: timestamp, endsAt: timestamp, birth}).strict().nullable(),
  nursery: nurseryPayload.nullable(),
}).strict();
// A rabbit may carry the personal name its owner gave it: canonical text (trimmed, at most 32 characters, no control
// character), absent when unnamed. Names are individual: they are never inherited and never belong to the species.
const rabbitName = z.string().refine(name => name !== '' && normalizeRabbitName(name) === name, 'Invalid rabbit name');
const evolution = z.object({done: z.literal(true).optional(), challenges: z.record(z.enum(EVOLUTION_CHALLENGE_IDS as [typeof EVOLUTION_CHALLENGE_IDS[number], ...typeof EVOLUTION_CHALLENGE_IDS[number][]]), integer.max(2)).optional()}).strict().optional();
const rabbit = z.object({incomeRoll: z.number().int().min(0).max(10000).optional(), id: identity, species, affection: z.number().int().min(BALANCE.minAffection).max(BALANCE.maxAffection), enclosureId: identity, name: rabbitName.optional(), crownHidden: z.literal(true).optional(), classicLook: z.literal(true).optional(), lookChange: z.object({endsAt: timestamp}).strict().optional(), evolution}).strict().superRefine((value, context) => {
  const challenges = EVOLUTION_CHALLENGES[value.species] ?? [];
  for (const [key, progress] of Object.entries(value.evolution?.challenges ?? {})) {
    if (!challenges.includes(key as EvolutionChallenge) || progress > evolutionChallengeTarget(value.species, key as EvolutionChallenge))
      context.addIssue({code: z.ZodIssueCode.custom, message: 'Invalid evolution challenge progress'});
  }
  if (value.evolution?.done && (!hasEvolvedArt(value.species) || value.species === 'benny' || value.affection < EVOLUTION_AFFECTION || !evolutionChallengesComplete(value.species, value.evolution.challenges)))
    context.addIssue({code: z.ZodIssueCode.custom, message: 'Invalid completed evolution'});
});
const missions = z.object({
  nightOrderStarted: z.boolean().optional(),
  events: z.object({collectOrder: integer.max(20), breed: integer.max(1), transferBirth: integer.max(1), welcome: integer.max(1), placeDecoration: integer.max(1)}).strict(),
  completed: z.array(z.enum(MAIN_MISSION_IDS)).max(MAIN_MISSION_IDS.length),
  claimed: z.array(z.enum(MAIN_MISSION_IDS)).max(MAIN_MISSION_IDS.length),
  daily: z.object({referenceAt: timestamp, cycleIndex: integer,
    // Saves from before the pool of six read missing keys as 0.
    // The missions added in v25 read as 0 too.
    progress: z.object(Object.fromEntries(DAILY_MISSION_IDS.map(id => [id, integer.default(0)])) as Record<typeof DAILY_MISSION_IDS[number], z.ZodDefault<typeof integer>>).strict(),
    claimed: z.array(z.enum(DAILY_MISSION_IDS)).max(DAILY_PICK_COUNT), bonusClaimed: z.boolean(), nextAt: timestamp.optional(),
    // v25: the three missions drawn at the start of the cycle, and the rabbits caressed in it (at most the mission's target).
    picked: z.array(z.enum(DAILY_MISSION_IDS)).length(DAILY_PICK_COUNT).refine(ids => new Set(ids).size === ids.length).optional(),
    petted: z.array(identity).max(DAILY_MISSIONS['pet-rabbits'].target).refine(ids => new Set(ids).size === ids.length).optional(),
  }).strict(),
  // v25: the daily cycles in a row ending with the bonus claimed (the `quotidien` evolution challenge).
  streak: z.object({count: integer.positive().max(9999), lastCycle: integer}).strict().optional(),
}).strict();
const decoration = z.object({paidHearts: integer.positive().optional(), paidPrice: integer.optional(), paidCandies: integer.positive().max(MAX_CANDIES).optional(), id: z.string().regex(/^decoration-[1-9]\d*$/), catalogId: z.enum(ALL_DECORATION_IDS), placementXpProcessed: z.boolean().optional(),
  location: z.discriminatedUnion('kind', [
    z.object({kind: z.literal('inventory')}).strict(),
    z.object({kind: z.literal('outside'), x: integer, y: integer, rotation: z.union([z.literal(0), z.literal(1)])}).strict(),
  ])}).strict();
const aidStage = z.enum(['order', 'breeding', 'growth']);
// The Christmas event (v26, optional): the sucres d'orge, the challenges of `cycle`, today's snowman and the mini-game.
const christmasId = z.enum(CHRISTMAS_CHALLENGE_IDS);
const christmas = z.object({
  candies: integer.max(MAX_CANDIES), cycle: integer.optional(),
  picked: z.array(christmasId).length(CHRISTMAS_PICK_COUNT).refine(ids => new Set(ids).size === ids.length).optional(),
  progress: z.object(Object.fromEntries(CHRISTMAS_CHALLENGE_IDS.map(id => [id, integer.optional()])) as Record<typeof CHRISTMAS_CHALLENGE_IDS[number], z.ZodOptional<typeof integer>>).strict().optional(),
  claimed: z.array(christmasId).max(CHRISTMAS_PICK_COUNT).refine(ids => new Set(ids).size === ids.length).optional(),
  bonusClaimed: z.literal(true).optional(),
  snowman: z.object({cycle: integer, enclosureId: identity}).strict().optional(),
  skyGifts: z.object({cycle: integer, rewarded: integer.max(SKY_GIFTS.rewardedGamesPerCycle), best: integer.max(SKY_GIFTS.maxCaught)}).strict().optional(),
  bubbles: z.object({cycle: integer, earned: integer.max(COIN_BUBBLE_CANDIES.maxPerCycle)}).strict().optional(),
}).strict();
const historicalTarget = z.discriminatedUnion('family', [
  z.object({family: z.literal('species'), id: species, action: z.enum(['purchase', 'breedingResult'])}).strict(),
  z.object({family: z.literal('habitatPurchase'), id: z.enum(HABITAT_TYPES)}).strict(),
]);
const levelAccessTransition = z.object({version: z.literal(1), rights: z.array(z.object({target: historicalTarget, source: z.enum(['legacy-purchase', 'legacy-discovery', 'purchaseUnlocks:feu', 'purchaseUnlocks:volant', 'purchaseUnlocks:universal'])}).strict()).max(SPECIES_IDS.length + SHOP_SPECIES.length + HABITAT_TYPES.length)}).strict().superRefine((transition, ctx) => {
  const seen = new Set<string>();
  for (const right of transition.rights) {
    const t = right.target, key = JSON.stringify(t);
    const validSource = right.source === 'legacy-discovery' ? t.family === 'species' && t.action === 'breedingResult'
      : right.source === 'legacy-purchase' ? t.family === 'habitatPurchase' && t.id !== 'universal' || t.family === 'species' && t.action === 'purchase' && ['paille', 'neige', 'belier-gris'].includes(t.id)
      : right.source === 'purchaseUnlocks:universal' ? t.family === 'habitatPurchase' && t.id === 'universal'
      : t.family === 'species' && t.action === 'purchase' && right.source === `purchaseUnlocks:${t.id}`;
    if (!validSource || seen.has(key)) ctx.addIssue({code: 'custom', message: 'Invalid or duplicate historical level right'});
    seen.add(key);
  }
});
const current = z.object({
  // Parents may be bought (rabbit-N) or born in the meadow (birth-N).
  lastBreedingParents: z.tuple([identity, identity]).refine(([a, b]) => a !== b && [a, b].every(id => /^(rabbit|birth)-/.test(id))).optional(),
  appliedAdjustments: z.array(z.string().uuid()).max(MAX_APPLIED_ADJUSTMENTS).optional(),
  plannedBirth: species.optional(),
  evolvedSpecies: z.array(species).max(SPECIES_IDS.length).optional(),
  cozy: z.object({
    bonds: z.array(z.object({a: identity,b: identity,duration: integer.max(6*HOUR),celebrated:z.boolean()}).strict()).max(512),
    album: z.array(z.object({key:z.string().min(1).max(200),at:integer,kind:z.enum(['birth','friendship','travel','discovery','event']),text:z.string().max(300)}).strict()).max(80),
    souvenirs:z.array(z.object({destination:z.enum(TRAVEL.destinations),visits:integer.max(9999)}).strict()).max(TRAVEL.destinations.length),
  }).optional(),
  version: z.literal(SAVE_VERSION), lastSimulatedAt: integer, nextId: integer.positive(), pattes: integer, grass: integer, hearts: integer, nextHeartGiftAt: timestamp,
  buildings: z.array(building).max(ISLAND.maxArea),
  rabbits: z.array(rabbit).max(ISLAND.maxArea * HABITAT_LEVELS.universal[2].capacity),
  discovered: z.array(species).max(SPECIES_IDS.length),
  pityFailures: integer.max(BALANCE.guaranteeAttempt - 1),
  benny: z.object({powerReadyAt: timestamp, inSky: z.boolean()}).strict().optional(),
  travel: z.object({welcomed: z.boolean(), trips: z.array(z.object({grass: integer.optional(), rabbitId: identity, destination: z.enum(TRAVEL.destinations), startedAt: timestamp, endsAt: timestamp, hearts: integer}).strict()).max(3)}).strict().optional(),
  // The Salon de soins and the picnic (v23, optional): the care under way, each rabbit's last gift cycle and the last picnic cycle.
  care: z.object({rabbitId: identity, care: z.enum(CARE_KINDS as [typeof CARE_KINDS[number], ...typeof CARE_KINDS]), startedAt: timestamp, endsAt: timestamp, hearts: integer.positive().optional()}).strict().optional(),
  // v27: the cares that brought Hearts in the cycle.
  salonHearts: z.object({cycle: integer, cares: integer.positive().max(SALON.heartCaresPerCycle)}).strict().optional(),
  // v27: the debris of the parcels bought since the Christmas update, and « Le vol de Benny ».
  debris: z.array(z.object({id: z.string().regex(/^debris-[1-9]\d*$/), kind: z.enum(['rocher', 'buisson', 'herbes']), x: integer, y: integer, price: integer.positive()}).strict()).max(512).optional(),
  bennyFlight: z.object({cycle: integer, rewarded: integer.max(BENNY_FLIGHT.rewardedGamesPerCycle), heart: z.literal(true).optional(), best: integer.max(BENNY_FLIGHT.maxColumns)}).strict().optional(),
  affectionGifts: z.record(identity, integer).optional(),
  picnicCycle: integer.optional(),
  // The Terrain de corde à sauter (v23, optional): the last rewarded cycle, its rewarded games and Heart, and the record.
  jumpRope: z.object({cycle: integer, rewarded: integer.max(JUMP_ROPE.rewardedGamesPerCycle), heart: z.literal(true).optional(), best: integer.max(JUMP_ROPE.maxScore),
    team: z.object({carriers: z.tuple([identity, identity]), athlete: identity}).strict().optional(), challenge: z.literal(true).optional(),
    athleteBest: z.record(identity, integer.max(JUMP_ROPE.maxScore)).optional()}).strict().optional(),
  jumpIsland: z.literal(true).optional(),
  christmas: christmas.optional(),
  missions, decorations: z.array(decoration).max(MAX_DECORATIONS),
  rewardedDecorationModels: z.array(z.enum(DECORATION_IDS)).max(DECORATION_IDS.length).refine(ids => new Set(ids).size === ids.length).optional(),
  acquiredParcels: z.array(z.enum(PARCEL_IDS)).min(1).max(9),
  islandStart: z.literal('southwest').optional(),
  startCourse: z.literal('paille-solo').optional(),
  purchaseUnlocks: z.array(z.enum(PURCHASE_UNLOCK_IDS)).max(PURCHASE_UNLOCK_IDS.length).refine(ids => new Set(ids).size === ids.length).optional(),
  initiation: z.object({order: z.string().max(500).nullable(), breeding: z.string().max(500).nullable(), growth: z.string().max(500).nullable(), birthId: identity.nullable(), closed: z.array(aidStage).max(3), used: z.array(aidStage).max(3)}).strict().optional(),
  levelAccessTransition: levelAccessTransition.optional(), presentationId: z.string().uuid().optional(),
  // The era of the enclosure sizes the save was written with (6 November 2026, still v27): absent before, see `migrateEnclosureSizes`.
  enclosureSizes: z.literal(ENCLOSURE_SIZE_ERA).optional(),
  progression: z.object({totalXp: integer, rewardedThroughLevel: integer.positive()}).strict(),
  recipeBook: z.array(species).max(RECIPE_BOOK_SPECIES.length),
  cuisine: z.object({affectionCycles: z.record(z.string().min(1), integer), heartCycle: integer.nullable().optional(), fullRuns: z.object({cycle: integer, used: integer.max(CUISINE_FULL_REWARDS_PER_CYCLE)}).strict().optional()}).strict(),
}).strict();
const schema = current.superRefine((s, context) => {
  const issue = (message: string) => context.addIssue({code: z.ZodIssueCode.custom, message});
  if (s.cozy) {
    const c=s.cozy;
    if (new Set(c.bonds.map(b=>`${b.a}:${b.b}`)).size!==c.bonds.length || c.bonds.some(b=>b.a>=b.b || b.celebrated && b.duration<6*HOUR)) issue('Invalid friendship');
    if (new Set(c.album.map(m=>m.key)).size!==c.album.length || new Set(c.souvenirs.map(m=>m.destination)).size!==c.souvenirs.length) issue('Duplicate cozy entry');
  }
  if (new Set(s.recipeBook).size !== s.recipeBook.length || s.recipeBook.some(id => !RECIPE_BOOK_SPECIES.includes(id))) issue('Invalid recipe book');
  if (s.decorations.some(d => d.placementXpProcessed === false && d.location.kind !== 'inventory')) issue('Unused placement XP on a placed decoration');
  if (s.initiation) {
    const a = s.initiation;
    if (new Set(a.closed).size !== a.closed.length || new Set(a.used).size !== a.used.length || a.used.some(stage => !a.closed.includes(stage))) issue('Invalid initiation authorization');
  }
  // A stage is either complete or, once finished, shortened; it never starts in the future.
  const durationValid = (start: number, end: number, normal: number) => start <= s.lastSimulatedAt &&
    end >= start && end - start <= normal && (end - start === normal || end <= s.lastSimulatedAt);
  const m = s.missions, d = m.daily;
  if (new Set(m.completed).size !== m.completed.length || new Set(m.claimed).size !== m.claimed.length ||
    m.claimed.some(id => !m.completed.includes(id))) issue('Main mission claims');
  if (d.cycleIndex !== cycleIndexAt(d.referenceAt, s.lastSimulatedAt)) issue('Daily cycle');
  if (new Set(d.claimed).size !== d.claimed.length || d.claimed.some(id => d.progress[id] < DAILY_MISSIONS[id].target) ||
    (d.bonusClaimed && d.claimed.length !== DAILY_PICK_COUNT) || (d.picked && d.claimed.some(id => !d.picked!.includes(id)))) issue('Daily claims');
  if (m.streak && m.streak.lastCycle > d.cycleIndex) issue('Future daily streak');
  if (s.salonHearts && s.salonHearts.cycle > d.cycleIndex) issue('Future salon cycle');
  if (s.bennyFlight && s.bennyFlight.cycle > d.cycleIndex) issue('Future flight cycle');
  {
    const seen = new Set<string>();
    for (const item of s.debris ?? []) {
      if (!item.id.startsWith('debris-') || seen.has(item.id)) issue('Debris identity'); seen.add(item.id);
      const others = {...s, debris: (s.debris ?? []).filter(other => other.id !== item.id)};
      if (footprintPlacementReason(others, debrisFootprint(item))) issue('Debris place');
    }
  }
  if (d.referenceAt > s.lastSimulatedAt && (Object.values(d.progress).some(n => n !== 0) || d.claimed.length || d.bonusClaimed)) issue('Future cycle progress');
  if ([...Object.values(s.cuisine.affectionCycles), s.cuisine.heartCycle ?? 0, s.cuisine.fullRuns?.cycle ?? 0].some(cycle => cycle > s.missions.daily.cycleIndex)) issue('Future Cuisine cycle');
  const ids: string[] = [];
  const cells = new Set<string>();
  if (!s.acquiredParcels.includes(startParcel(s)) || new Set(s.acquiredParcels).size !== s.acquiredParcels.length) issue('Invalid acquired parcels');
  const nursery = s.buildings.find(b => b.kind === 'nursery');
  for (const b of s.buildings) {
    ids.push(b.id);
    if ((b.kind === 'enclosure') !== (b.habitat !== null)) issue('Habitat payload');
    if (b.habitat && b.incomeUnits > habitatLevel(b.habitat.type, b.habitat.level).cap * HOUR) issue('Habitat storage');
    if ((b.farmLevel !== undefined && b.kind !== 'farm') || (b.agencyLevel !== undefined && b.kind !== 'agency')) issue('Building level');
    if (b.order && (b.farmLevel ?? 1) < orderFarmLevel(b.order.recipe)) issue('Farm level');
    if (b.footprintTier !== undefined && (b.kind !== 'enclosure' || !b.habitat || b.footprintTier > b.habitat.level)) issue('Footprint tier');
    if (b.formerFootprint && b.kind !== 'enclosure') issue('Former footprint');
    // The islet of the Epics (v27): one nest at its fixed place off the land grid, never on it.
    if (b.islet && (b.kind !== 'nest' || b.x !== EPIC_ISLET.cell.x || b.y !== EPIC_ISLET.cell.y)) issue('Islet nest');
    if (b.habitat?.ultra && b.habitat.type !== 'neige') issue('Ultra neige habitat');
    if (!b.id.startsWith('building-')) issue('Building identity');
    if (!b.islet && (buildingPlacementReason(s, b.x, b.y, b.id) || cells.has(`${b.x},${b.y}`))) issue('Invalid or occupied cell');
    cells.add(`${b.x},${b.y}`);
    if ((b.kind !== 'enclosure' && b.incomeUnits !== 0) || (b.kind !== 'farm' && b.order) || (b.kind !== 'nest' && b.breeding)) issue('Building payload mismatch');
    if ((b.kind === 'nursery') !== (b.nursery !== null)) issue('Nursery payload');
    const slots = b.nursery?.babies.map(baby => baby.slot) ?? [];
    if (b.nursery && (new Set(slots).size !== slots.length || slots.length > b.nursery.capacity || slots.some(slot => slot >= b.nursery!.capacity))) issue('Nursery slots');
    if (b.order && ((b.order.grass === undefined) !== (b.order.duration === undefined))) issue('Incomplete frozen order');
    if (b.order && (!durationValid(b.order.startedAt, b.order.endsAt, (b.order.duration ?? ORDERS[b.order.recipe].duration)))) issue('Order timestamps');
    if (b.breeding) {
      const job = b.breeding;
      const jobValid = durationValid(job.startedAt, job.endsAt, growthDuration(job.birth.species)) || durationValid(job.startedAt, job.endsAt, LEGACY_BREEDING_DURATION);
      if (!nursery || !jobValid || job.parents[0] === job.parents[1]) issue('Breeding timestamps or parents');
      if (job.endsAt > s.lastSimulatedAt && job.parents.some(id => !s.rabbits.some(r => r.id === id && r.affection >= BALANCE.breedingAffection))) issue('Missing active parent');
      // Completed jobs may reference parents that were moved or entrusted: the birth and the surviving individuals are preserved.
    }
    const babies = b.nursery?.babies ?? [];
    // A Dinono already growing before v20 keeps its former Rare duration through later saves.
    for (const baby of babies) if (!durationValid(baby.startedAt, baby.readyAt, growthDuration(baby.birth.species)) &&
      !(baby.birth.species === 'dinono' && durationValid(baby.startedAt, baby.readyAt, 30 * 60_000))) issue('Growth timestamps');
    for (const newborn of [...babies.map(baby => baby.birth), b.breeding?.birth]) if (newborn) {
      ids.push(newborn.id);
      if (!newborn.id.startsWith('birth-') || (newborn.guaranteed && !newborn.reservedDiscovery) ||
        (newborn.reservedDiscovery && !GUARANTEE_SPECIES.includes(newborn.species))) issue('Birth reservation');
    }
  }
  for (const kind of BUILDING_KINDS) {
    const maximum = BALANCE.buildings[kind].maximum;
    if (maximum !== null && s.buildings.filter(b => b.kind === kind && !b.islet).length > maximum) issue('Building limit');
  }
  if (s.buildings.filter(b => b.islet).length > 1) issue('Islet limit');
  if (s.travel && (s.travel.trips.length > (s.buildings.find(b => b.kind === 'agency')?.agencyLevel ?? 1) || new Set(s.travel.trips.map(t => t.rabbitId)).size !== s.travel.trips.length)) issue('Trip capacity');
  for (const trip of s.travel?.trips ?? []) {
    const hours = (trip.endsAt - trip.startedAt) / HOUR;
    if (!s.buildings.some(b => b.kind === 'agency') || !s.rabbits.some(r => r.id === trip.rabbitId) || !Number.isInteger(hours) || hours < TRAVEL.minHours || hours > TRAVEL.maxHours
      || (trip.grass !== undefined && (trip.grass !== hours * 25 || !s.buildings.some(b => b.kind === 'agency' && b.agencyLevel))) || trip.hearts !== tripHearts(hours) || trip.startedAt > s.lastSimulatedAt
      || s.buildings.some(b => b.breeding?.parents.includes(trip.rabbitId))) issue('Trip');
  }
  if (s.care) {
    // One rabbit at a time, in the salon, for the exact length of its care, with today's gift reserved; never also on a trip or at the nest.
    const c = s.care;
    if (!s.buildings.some(b => b.kind === 'salon') || !s.rabbits.some(r => r.id === c.rabbitId) || c.endsAt - c.startedAt !== SALON.cares[c.care].hours * HOUR
      || (c.hearts !== undefined && c.hearts !== SALON.cares[c.care].hearts) || c.startedAt > s.lastSimulatedAt || s.affectionGifts?.[c.rabbitId] === undefined || s.travel?.trips.some(t => t.rabbitId === c.rabbitId)
      || s.buildings.some(b => b.breeding?.parents.includes(c.rabbitId))) issue('Care');
  }
  if (Object.values(s.affectionGifts ?? {}).some(cycle => cycle > d.cycleIndex) || (s.picnicCycle ?? 0) > d.cycleIndex || (s.jumpRope?.cycle ?? 0) > d.cycleIndex) issue('Future gift cycle');
  if (s.christmas) {
    const c = s.christmas;
    if ([c.cycle ?? 0, c.snowman?.cycle ?? 0, c.skyGifts?.cycle ?? 0, c.bubbles?.cycle ?? 0].some(cycle => cycle > d.cycleIndex)) issue('Future gift cycle');
    if (c.cycle === undefined && (c.picked || c.progress || c.claimed || c.bonusClaimed)) issue('Christmas cycle');
    const claimed = c.claimed ?? [];
    if (claimed.some(id => (c.progress?.[id] ?? 0) < CHRISTMAS_CHALLENGES[id].target || (c.picked && !c.picked.includes(id))) ||
      (c.bonusClaimed && claimed.length !== CHRISTMAS_PICK_COUNT)) issue('Christmas claims');
  }
  if (new Set(s.discovered).size !== s.discovered.length) issue('Duplicate discoveries');
  // Only one Benny per game, owned or on her way.
  if ([...s.rabbits.map(r => r.species), ...s.buildings.flatMap(b => [b.breeding?.birth.species, ...(b.nursery?.babies ?? []).map(baby => baby.birth.species)])]
    .filter(id => id === 'benny').length > 1) issue('Second Benny');
  if (s.benny && s.benny.powerReadyAt > s.lastSimulatedAt + 48 * HOUR) issue('Benny power recharge');
  for (const r of s.rabbits) {
    ids.push(r.id);
    if (r.id.startsWith('building-') || !s.discovered.includes(r.species) ||
      !s.buildings.some(b => b.kind === 'enclosure' && b.id === r.enclosureId)) issue('Rabbit identity or enclosure or discovery');
    const home = s.buildings.find(b => b.id === r.enclosureId);
    if (home?.habitat) { const type: HabitatType = home.habitat.type; if (type !== 'universal' && !SPECIES[r.species].types.includes(type) && !SPECIES[r.species].types.includes('arc-en-ciel') && !LEGACY_TYPES[r.species]?.includes(type)) issue('Incompatible rabbit'); }
  }
  for (const b of s.buildings) {
    const capacity = b.habitat ? habitatLevel(b.habitat.type, b.habitat.level).capacity : BALANCE.enclosureCapacity;
    if (s.rabbits.filter(r => r.enclosureId === b.id).length > capacity) issue('Enclosure capacity');
  }
  for (const d of s.decorations) {
    if (d.paidHearts !== undefined && (d.catalogId !== 'robot-statue' || d.paidHearts !== 80 || d.paidPrice !== undefined)) issue('Decoration receipt');
    // A Christmas decoration is paid in sucres d'orge only, and only a Christmas decoration is.
    if (d.paidCandies !== undefined && (!isChristmasDecoration(d.catalogId) || d.paidPrice !== undefined || d.paidHearts !== undefined) ||
      isChristmasDecoration(d.catalogId) && (d.paidPrice !== undefined || d.paidHearts !== undefined)) issue('Decoration receipt');
    ids.push(d.id);
    if (decorationPlacementReason(s, d.id, d.location)) issue('Invalid decoration placement or reference');
  }
  if (new Set(ids).size !== ids.length || ids.some(id => !Number.isSafeInteger(Number(id.split('-')[1])) || Number(id.split('-')[1]) >= s.nextId)) issue('Duplicate identity or invalid nextId');
});

/** Historical order payload: yields and normal durations are frozen at launch, including accelerated jobs. */
const LEGACY_ORDERS = {small: {grass: 20, duration: 300000}, medium: {grass: 40, duration: 900000}, large: {grass: 100, duration: 3600000}} as const;
const legacyOrder = z.object({recipe: z.enum(['small', 'medium', 'large']), startedAt: timestamp, endsAt: timestamp}).strict().nullable();
const oldTravel = z.object({welcomed: z.boolean(), trip: z.object({rabbitId: identity, destination: z.enum(TRAVEL.destinations), startedAt: timestamp, endsAt: timestamp, hearts: integer}).strict().nullable()}).strict().optional();
const legacySchema = current.omit({rewardedDecorationModels: true}).extend({version: z.literal(16), travel: oldTravel, pityFailures: integer.max(9), buildings: z.array(building.extend({order: legacyOrder})).max(ISLAND.maxArea)});
/** Only v16 crosses the economy boundary. No action, clock advancement or random draw is performed. */
function migrateV16(raw: unknown): unknown {
  const parsed = legacySchema.safeParse(raw);
  if (!parsed.success) return raw;
  const old = parsed.data;
  const legacyCost = (n: number) => Math.round(50 * n ** 1.6);
  let level = 1, previousThreshold = 0;
  while (level < 30 && old.progression.totalXp >= previousThreshold + legacyCost(level)) previousThreshold += legacyCost(level++);
  const fraction = (old.progression.totalXp - previousThreshold) / legacyCost(level);
  const totalXp = cumulativeLevelXp(level) + (level === 30 ? old.progression.totalXp - previousThreshold : Math.floor(fraction * nextLevelCost(level)!));
  const models = [...new Set(old.decorations.filter(d => d.location.kind === 'outside' || d.placementXpProcessed !== false).map(d => d.catalogId))];
  const daily = old.missions.daily;
  // A completed but unclaimed affection goal stays claimable; partial work can now finish with one breeding.
  daily.progress['gain-affection'] = daily.progress['gain-affection'] >= 3 || daily.claimed.includes('gain-affection') ? 1 : 0;
  return {...old, version: 17, pityFailures: Math.min(old.pityFailures, 7), rewardedDecorationModels: models,
    progression: {...old.progression, totalXp}, buildings: old.buildings.map(b => ({...b, order: b.order ? {...b.order, ...LEGACY_ORDERS[b.order.recipe]} : null}))};
}
/** The four productions of v17, before the ten crops: what a job launched then still yields, and how long it lasts. */
const V17_ORDERS = {small: {grass: 20, duration: 300000}, medium: {grass: 60, duration: 1800000}, large: {grass: 180, duration: 4 * HOUR}, night: {grass: 360, duration: 10 * HOUR}} as const;
const v17Order = z.object({recipe: z.enum(['small', 'medium', 'large', 'night']), startedAt: timestamp, endsAt: timestamp, grass: integer.optional(), duration: integer.positive().optional()}).strict().nullable();
const v17Schema = current.extend({version: z.literal(17), travel: oldTravel, buildings: z.array(building.extend({kind: z.enum(['enclosure', 'farm', 'nest', 'nursery', 'kitchen']), order: v17Order})).max(ISLAND.maxArea)});
/** v17 → v18: a running production becomes the crop that shows it, its yield and duration frozen as launched. */
function migrateV17(raw: unknown): unknown {
  const parsed = v17Schema.safeParse(raw);
  if (!parsed.success) return raw;
  const old = parsed.data;
  return {...old, version: 18, buildings: old.buildings.map(b => ({...b, order: b.order ? {...b.order, recipe: LEGACY_ORDER_CROPS[b.order.recipe],
    grass: b.order.grass ?? V17_ORDERS[b.order.recipe].grass, duration: b.order.duration ?? V17_ORDERS[b.order.recipe].duration} : null}))};
}

const v18Schema = current.extend({version: z.literal(18), travel: oldTravel, buildings: z.array(building.omit({farmLevel: true, agencyLevel: true})).max(ISLAND.maxArea)});
function migrateV18(raw: unknown): unknown {
  const parsed = v18Schema.safeParse(raw); if (!parsed.success) return raw;
  const old = parsed.data;
  return {...old, version: 19, buildings: old.buildings.map(b => b.kind === 'farm' ? {...b, farmLevel: 2} : b),
    ...(old.travel ? {travel: {welcomed: old.travel.welcomed, trips: old.travel.trip ? [old.travel.trip] : []}} : {})};
}

/** Only known retired IDs are converted before the older schemas validate against the current catalogue. */
const RETIRED_SPECIES = {lunettes: 'boudinet', 'feu-glace': 'glassofeu', perroquet: 'phoenix'} as const;
/** Knowledge prices of the retired recipes when they were sold: a player who bought one gets the pattes back. */
const RETIRED_RECIPE_PRICES: Record<keyof typeof RETIRED_SPECIES, number> = {lunettes: 220, 'feu-glace': 180, perroquet: 250};
function migrateRetiredSpecies(raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  const save = raw as Record<string, unknown>;
  if (![16, 17, 18, 19].includes(save.version as number)) return;
  const replacement = (id: unknown): SpeciesId | undefined => typeof id === 'string' && Object.hasOwn(RETIRED_SPECIES, id)
    ? RETIRED_SPECIES[id as keyof typeof RETIRED_SPECIES] : undefined;
  const converted: SpeciesId[] = [];
  const convert = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const rabbit = value as Record<string, unknown>, id = replacement(rabbit.species);
    if (id) rabbit.species = id;
    // Dinono's former ordinary reservation cannot guarantee an Epic. Keep the birth and its dates.
    if (rabbit.species === 'dinono') { rabbit.guaranteed = false; rabbit.reservedDiscovery = false; }
  };
  if (Array.isArray(save.rabbits)) for (const rabbit of save.rabbits) {
    // Adults have no reservation fields.
    if (rabbit && typeof rabbit === 'object') {
      const id = replacement(rabbit.species);
      if (id) { rabbit.species = id; converted.push(id); }
    }
  }
  if (Array.isArray(save.buildings)) for (const b of save.buildings) {
    if (!b || typeof b !== 'object') continue;
    convert(b.breeding?.birth);
    if (Array.isArray(b.nursery?.babies)) for (const baby of b.nursery.babies) convert(baby?.birth);
  }
  // Travellers reference the converted adults by ID, so their trips remain unchanged.
  if (Array.isArray(save.recipeBook) && Number.isSafeInteger(save.pattes)) for (const id of save.recipeBook)
    if (replacement(id)) save.pattes = (save.pattes as number) + RETIRED_RECIPE_PRICES[id as keyof typeof RETIRED_SPECIES];
  for (const key of ['discovered', 'recipeBook']) if (Array.isArray(save[key]))
    save[key] = save[key].filter(id => !replacement(id));
  if (Array.isArray(save.discovered)) for (const id of converted) if (!save.discovered.includes(id)) save.discovered.push(id);
  const transition = save.levelAccessTransition as {rights?: {target?: {family?: string; id?: string}}[]} | undefined;
  if (Array.isArray(transition?.rights)) transition.rights = transition.rights.filter(right => right?.target?.family !== 'species' || !replacement(right.target.id));
}

/**
 * Settle only stock allowed by a published historical cap. Move whole coins to the wallet,
 * including one coin for a fractional excess, subtracting exactly the same units from stock.
 * This preserves every fractional unit and is idempotent after the normalized save is written.
 */
const FORMER_CAPS = {1: 2400, 2: 4000, 3: 5600} as const;
const FORMER_TYPED_CAPS: Record<1 | 2, Record<HabitatType, number>> = {
  1: {paille: 1300, neige: 1500, feu: 1800, universal: 2100, metal: 2500, vol: 2900},
  2: {paille: 2600, neige: 3000, feu: 3400, universal: 3800, metal: 4300, vol: 4800},
};
function settleStorageCaps(raw: unknown): void {
  if (!raw || typeof raw !== 'object' || !('buildings' in raw) || !Array.isArray(raw.buildings) || !('pattes' in raw) || !Number.isSafeInteger(raw.pattes)) return;
  const save = raw as {pattes: number; buildings: unknown[]};
  for (const b of save.buildings) {
    if (!b || typeof b !== 'object') continue;
    const {habitat, incomeUnits} = b as {habitat?: {type?: unknown; level?: unknown} | null; incomeUnits?: unknown};
    if (!habitat || !HABITAT_TYPES.includes(habitat.type as HabitatType) || ![1, 2, 3].includes(habitat.level as number) || !Number.isSafeInteger(incomeUnits)) continue;
    const cap = habitatLevel(habitat.type as HabitatType, habitat.level as 1 | 2 | 3).cap * HOUR, units = incomeUnits as number;
    const level = habitat.level as 1 | 2 | 3;
    const formerCap = Math.max(FORMER_CAPS[level], level === 3 ? 5600 : FORMER_TYPED_CAPS[level][habitat.type as HabitatType]);
    if (units <= cap || units > formerCap * HOUR) continue;
    const coins = Math.ceil((units - cap) / HOUR);
    if (!Number.isSafeInteger(save.pattes + coins)) continue; // Keep the invalid excess: schema refuses overflow without loss.
    save.pattes += coins; (b as {incomeUnits: number}).incomeUnits = units - coins * HOUR;
  }
}

/**
 * v23 → v24, the enlarged enclosures. Every enclosure of an older save keeps, for now, exactly the footprint it had
 * (`formerFootprint`), so the save validates with the very same rules as before: no refusal, no building removed, no rabbit
 * moved out. Right after validation, `growFormerEnclosures` gives the enlarged size to each one that has room for it.
 */
function migrateV23(raw: object): void {
  const save = raw as {version: number; buildings?: unknown};
  if (Array.isArray(save.buildings)) for (const b of save.buildings)
    if (b && typeof b === 'object' && (b as {kind?: unknown}).kind === 'enclosure') (b as {formerFootprint?: true}).formerFootprint = true;
  save.version = 24;
}

/**
 * v24 → v25, the new evolution challenges (owner, 4 November 2026). A rabbit's `cuisine:<recette>` progress becomes
 * `commis:<recette>` when its species' new list has it, and is forgotten otherwise; a challenge its species no longer has is
 * dropped and a value above the new target is capped. A rabbit that has already evolved stays evolved whatever happens: its
 * progress is filled up to the new list's targets. The cycle under way keeps the three missions it showed in v24: a cycle
 * without a stored draw shows the draw among the first six missions (`dailyMissionsOf`).
 */
function migrateV24(raw: object): void {
  const save = raw as {version: number; rabbits?: unknown};
  if (Array.isArray(save.rabbits)) for (const rabbit of save.rabbits) {
    if (!rabbit || typeof rabbit !== 'object') continue;
    const r = rabbit as {species?: unknown; evolution?: {done?: unknown; challenges?: unknown}};
    if (!r.evolution || typeof r.evolution !== 'object' || !SPECIES_IDS.includes(r.species as SpeciesId)) continue;
    const species = r.species as SpeciesId, list = EVOLUTION_CHALLENGES[species] ?? [], next: Partial<Record<EvolutionChallenge, number>> = {};
    const old = r.evolution.challenges && typeof r.evolution.challenges === 'object' ? r.evolution.challenges as Record<string, unknown> : {};
    for (const [key, value] of Object.entries(old)) {
      const challenge = (key.startsWith('cuisine:') ? `commis:${key.slice('cuisine:'.length)}` : key) as EvolutionChallenge;
      if (!list.includes(challenge) || !Number.isSafeInteger(value) || (value as number) < 0) continue;
      next[challenge] = Math.min(evolutionChallengeTarget(species, challenge), Math.max(next[challenge] ?? 0, value as number));
    }
    if (r.evolution.done === true) for (const challenge of list) next[challenge] = evolutionChallengeTarget(species, challenge);
    if (Object.keys(next).length) r.evolution.challenges = next; else delete r.evolution.challenges;
  }
  save.version = 25;
}

/** v25 → v26, the Christmas event (owner, 4 November 2026): every new field is optional, nothing to convert. */
function migrateV25(raw: object): void {
  (raw as {version: number}).version = 26;
}

/**
 * v26 → v27, the Christmas update's economy (owner, 5 November 2026). Paille's counter is gone (`market`, dropped before any
 * migration). Every nursery goes back to 2 cushions at most, with no refund; a cushion still holding a baby is kept, so nothing
 * is lost. A trip under way brings the Hearts of the new 1–5 scale. The player keeps the level reached: the slow-down above level 20
 * applies from there on.
 */
function migrateV26(raw: object, xpOnCurrentCurve: boolean): void {
  const save = raw as {version: number; buildings?: unknown; travel?: {trips?: unknown}; progression?: {totalXp?: unknown}};
  const xp = save.progression && typeof save.progression === 'object' ? save.progression.totalXp : null;
  if (!xpOnCurrentCurve && typeof xp === 'number' && Number.isSafeInteger(xp) && xp >= 0) save.progression!.totalXp = xpAfterSlowdown(xp);
  if (Array.isArray(save.buildings)) for (const b of save.buildings) {
    const n = b && typeof b === 'object' ? (b as {nursery?: {capacity?: unknown; babies?: unknown}}).nursery : null;
    if (!n || typeof n.capacity !== 'number' || !Array.isArray(n.babies)) continue;
    const used = Math.max(0, ...n.babies.map(baby => baby && typeof baby === 'object' && typeof (baby as {slot?: unknown}).slot === 'number' ? (baby as {slot: number}).slot + 1 : 0));
    n.capacity = Math.min(n.capacity, Math.max(2, used));
  }
  if (save.travel && typeof save.travel === 'object' && Array.isArray(save.travel.trips)) for (const t of save.travel.trips) {
    const trip = t as {startedAt?: unknown; endsAt?: unknown; hearts?: unknown};
    if (trip && typeof trip.startedAt === 'number' && typeof trip.endsAt === 'number') trip.hearts = tripHearts(Math.round((trip.endsAt - trip.startedAt) / HOUR));
  }
  save.version = SAVE_VERSION;
}

/**
 * The enclosures enlarged again (owner, 6 November 2026), within v27, which was not yet published: a save that does not say the
 * era of its sizes (`enclosureSizes`: every older version, and v27 saves written before that day) had the sizes of 3 November
 * for its unmarked enclosures. Each enclosure keeps, for now, exactly the footprint it had: `formerFootprint: true` (era 1, set
 * by v24 or by `migrateV23`) becomes 1 and an unmarked one becomes 2, so the save validates with the very same rules as before.
 * Right after validation, `growFormerEnclosures` gives each one the largest size that has room.
 */
function migrateEnclosureSizes(raw: object): void {
  const save = raw as {buildings?: unknown; enclosureSizes?: number};
  if (Array.isArray(save.buildings)) for (const b of save.buildings) {
    if (!b || typeof b !== 'object' || (b as {kind?: unknown}).kind !== 'enclosure') continue;
    const e = b as {formerFootprint?: unknown};
    if (e.formerFootprint === true) e.formerFootprint = 1; else if (e.formerFootprint === undefined) e.formerFootprint = 2;
  }
  save.enclosureSizes = ENCLOSURE_SIZE_ERA;
}

/**
 * `INCOMPATIBLE_CATALOG`: a save written before the catalogue boundary (versions 1 to 15). It is not read further; it is neither
 * converted nor restored. `UNSUPPORTED_VERSION`: any other version this client does not know (for instance a newer one).
 */
export type DecodeResult = {ok: true; state: GameState} | {ok: false; reason: 'INVALID_JSON' | 'INVALID_STATE' | 'UNSUPPORTED_VERSION' | 'INCOMPATIBLE_CATALOG' | 'FILE_TOO_LARGE'};
export const MAX_JSON_LENGTH = 1_000_000;
export function decodeGame(json: string): DecodeResult {
  if (json.length > MAX_JSON_LENGTH) return {ok: false, reason: 'FILE_TOO_LARGE'};
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return {ok: false, reason: 'INVALID_JSON'}; }
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version !== SAVE_VERSION && raw.version !== 26 && raw.version !== 25 && raw.version !== 24 && raw.version !== 23 && raw.version !== 22 && raw.version !== 21 && raw.version !== 20 && raw.version !== 19 && raw.version !== 18 && raw.version !== 17 && raw.version !== 16)
    return {ok: false, reason: Number.isInteger(raw.version) && (raw.version as number) >= 1 && (raw.version as number) <= 15 ? 'INCOMPATIBLE_CATALOG' : 'UNSUPPORTED_VERSION'};
  // Only the explicitly retired catalogue entries are removed; unknown IDs still fail validation.
  if (raw && typeof raw === 'object' && 'decorations' in raw && Array.isArray(raw.decorations)) {
    raw.decorations = raw.decorations.filter(d => !d || typeof d !== 'object' ||
      !RETIRED_DECORATION_IDS.some(id => id === d.catalogId));
  }
  migrateRetiredSpecies(raw);
  moveKioskToIsland(raw);
  // Paille's counter is removed at v27 (owner, 5 November 2026): its daily record is dropped from every older save.
  if (raw && typeof raw === 'object' && 'version' in raw && (raw.version as number) < 27) delete (raw as {market?: unknown}).market;
  // Only a v27 save may say the era of its enclosure sizes: an older one had the sizes of its own time, whatever it carries.
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version !== SAVE_VERSION) delete (raw as {enclosureSizes?: unknown}).enclosureSizes;
  // `migrateV16` already converts its XP to the current curve, level and share kept.
  const fromV16 = !!raw && typeof raw === 'object' && 'version' in raw && raw.version === 16;
  if (fromV16) raw = migrateV16(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 17) raw = migrateV17(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 18) raw = migrateV18(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && (raw.version === 19 || raw.version === 20 || raw.version === 21 || raw.version === 22)) raw.version = 23;
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 23) migrateV23(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 24) migrateV24(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 25) migrateV25(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 26) migrateV26(raw, fromV16);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === SAVE_VERSION && !('enclosureSizes' in raw)) migrateEnclosureSizes(raw);
  settleStorageCaps(raw);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return {ok: false, reason: 'INVALID_STATE'};
  const {presentationId: _presentationId, enclosureSizes: _enclosureSizes, ...stored} = parsed.data;
  const state: GameState = {...stored, cuisine: {...stored.cuisine, heartCycle: stored.cuisine.heartCycle ?? null}};
  for (const rabbit of state.rabbits) if (SPECIES[rabbit.species].rarity !== 'common') rabbit.incomeRoll ??= historicalIncomeRoll(rabbit);
  for (const rabbit of state.rabbits) if (rabbit.evolution?.done && (rabbit.species === 'benny' || !hasEvolvedArt(rabbit.species) || rabbit.affection < EVOLUTION_AFFECTION || !evolutionChallengesComplete(rabbit.species, rabbit.evolution.challenges))) delete rabbit.evolution.done;
  // The evolutions already discovered stay discovered (audit, 4 November 2026): the list is completed from the evolved rabbits.
  const evolvedSpecies = [...new Set([...(state.evolvedSpecies ?? []), ...state.rabbits.filter(r => r.evolution?.done).map(r => r.species)])]
    .filter(id => id !== 'benny' && hasEvolvedArt(id));
  if (evolvedSpecies.length) state.evolvedSpecies = evolvedSpecies; else delete state.evolvedSpecies;
  // A taken-off crown only means something on an ultimate rabbit: elsewhere it is dropped, never a reason to refuse the save.
  for (const rabbit of state.rabbits) if (rabbit.crownHidden && !isUltimate(rabbit)) delete rabbit.crownHidden;
  // The old drawing put back at the Forêt de Brocéliande is dropped without the forest or on a rabbit that has not evolved,
  // never a reason to refuse the save.
  for (const rabbit of state.rabbits) if (classicLookReason(state, rabbit)) { delete rabbit.classicLook; delete rabbit.lookChange; }
  // A damaged or edited file never blocks the forest: at most one change, and never longer than a change lasts.
  let lookChangeSeen = false;
  for (const rabbit of state.rabbits) if (rabbit.lookChange) {
    if (lookChangeSeen) delete rabbit.lookChange;
    else { lookChangeSeen = true; rabbit.lookChange.endsAt = Math.min(rabbit.lookChange.endsAt, state.lastSimulatedAt + FOREST.changeMs); }
  }
  const rabbitIds = new Set(state.rabbits.map(rabbit => rabbit.id));
  // A released rabbit's entry is kept for the day it was spent (the Cuisine gives one affection a day), then dropped.
  // At most one such entry, and none when a rabbit still on the island already holds today's: a bloated file stays small.
  const today = state.cuisine.affectionCycles, cycleNow = state.missions.daily.cycleIndex;
  let spentToday = Object.entries(today).some(([id, cycle]) => rabbitIds.has(id) && cycle === cycleNow);
  for (const [id, cycle] of Object.entries(today)) {
    if (rabbitIds.has(id)) continue;
    if (!spentToday && cycle === cycleNow) spentToday = true; else delete today[id];
  }
  for (const id of Object.keys(state.affectionGifts ?? {})) if (!rabbitIds.has(id)) delete state.affectionGifts![id];
  for (const id of Object.keys(state.jumpRope?.athleteBest ?? {})) if (!rabbitIds.has(id)) delete state.jumpRope!.athleteBest![id];
  // Today's snowman stays recorded even if its enclosure is gone (`snowmanToday` hides it): one snowman a day, never a second.
  // Enclosures that still keep their former size grow wherever there is room (never a reason to refuse the save).
  growFormerEnclosures(state);
  establishHistoricalLevelRights(state);
  updateMissions(state, state.lastSimulatedAt);
  return {ok: true, state};
}
/**
 * The jump-rope kiosk was first a 1 500-pattes building on the land grid (never published, only on test saves). It now stands
 * on its own islet: a save holding the old kiosk gets the islet for free (nothing lost, the record and the day are kept) and
 * the kiosk leaves the grid, freeing its cells.
 */
function moveKioskToIsland(raw: unknown): void {
  if (!raw || typeof raw !== 'object' || !('buildings' in raw) || !Array.isArray(raw.buildings)) return;
  const kept = raw.buildings.filter(b => !b || typeof b !== 'object' || (b as {kind?: unknown}).kind !== 'jumprope');
  if (kept.length === raw.buildings.length) return;
  raw.buildings = kept; (raw as {jumpIsland?: true}).jumpIsland = true;
}
export function encodeGame(state: GameState, presentationId?: string): string {
  const parsed = schema.parse({...state, enclosureSizes: ENCLOSURE_SIZE_ERA, ...(presentationId ? {presentationId} : {})});
  return JSON.stringify(parsed);
}

/** Optional presentation metadata, separate from simulation state. Call after validating the save. */
export function readPresentationId(json: string): string | undefined {
  try { const raw = JSON.parse(json); const id = z.string().uuid().safeParse(raw.presentationId); return [SAVE_VERSION, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16].includes(raw.version) && id.success ? id.data : undefined; }
  catch { return undefined; }
}
