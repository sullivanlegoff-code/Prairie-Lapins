import {historicalIncomeRoll} from '../simulation/time';
import {cumulativeLevelXp, nextLevelCost} from '../simulation/progression';
import {establishHistoricalLevelRights} from '../simulation/levelRights';
import {PURCHASE_UNLOCK_IDS} from '../config/purchaseUnlocks';
import {RECIPE_BOOK_SPECIES} from '../config/recipes';
import {updateMissions} from '../simulation/missions';
import {buildingPlacementReason} from '../simulation/placement';
import {normalizeRabbitName} from '../simulation/rabbitNames';
import {PARCEL_IDS, startParcel} from '../config/land';
import {type HabitatType, HABITAT_TYPES, HABITAT_LEVELS, habitatLevel} from '../config/habitats';
import {MAIN_MISSION_IDS, DAILY_MISSION_GAP, DAILY_MISSION_IDS, DAILY_MISSIONS} from '../config/missions';
import {cycleIndexAt} from '../simulation/missions';
import {z} from 'zod';
import {BALANCE, MARKET, CUISINE_FULL_REWARDS_PER_CYCLE, HOUR, LEGACY_ORDER_CROPS, TRAVEL, tripHearts, NURSERY, ORDERS, type OrderId, SHOP_SPECIES, SPECIES, SPECIES_IDS, GUARANTEE_SPECIES, growthDuration, type SpeciesId} from '../config/balance';
import type {GameState} from '../state/types';
import {DECORATION_IDS, RETIRED_DECORATION_IDS, MAX_DECORATIONS} from '../config/decorations';
import {decorationPlacementReason} from '../simulation/decorations';
import {ISLAND} from '../config/islandGeometry';

/**
 * The current format is v20 (catalogue conversion), after v19 (farm and agency levels, concurrent trips, Heart receipts), migrated through v18 and v17 from v16 (economy migration). Version 16 was the catalogue boundary of the development saves: the species Terre, Mottelin, Géant and
 * Brumelin and the Terre habitat were removed, and saves before that catalogue boundary are not converted. Versions 1 to 15 are refused as incompatible
 * (the controller then starts a new game); they are never read, migrated or restored.
 */
export const SAVE_VERSION = 20;
/** Types a species had before the owner changed them: a rabbit already housed under its old types may stay where it is. */
const LEGACY_TYPES: Partial<Record<SpeciesId, readonly HabitatType[]>> = {magicien: ['metal', 'vol'], bouee: ['paille', 'feu'], dadi: ['neige', 'vol']};
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
// Rebasing a clock may move historical dates before the Unix epoch. Resources stay nonnegative.
const timestamp = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const identity = z.string().regex(/^(building|rabbit|birth)-[1-9]\d*$/);
const species = z.enum(SPECIES_IDS);
const birth = z.object({id: identity, species, guaranteed: z.boolean(), reservedDiscovery: z.boolean()}).strict();
// An enclosure may store the footprint tier it has acquired (1 = 4 × 4, 2 = 6 × 5, 3 = 8 × 6 fine cells). Absent means 4 × 4 at any level.
const footprintTier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const nurseryBaby = z.object({slot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), birth, startedAt: timestamp, readyAt: timestamp}).strict();
const nurseryPayload = z.object({capacity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), babies: z.array(nurseryBaby).max(NURSERY.maxCapacity)}).strict();
const building = z.object({
  id: identity, kind: z.enum(['enclosure', 'farm', 'nest', 'nursery', 'kitchen', 'statue', 'agency']), x: integer, y: integer, incomeUnits: integer,
  habitat: z.object({type: z.enum(HABITAT_TYPES), level: z.union([z.literal(1), z.literal(2), z.literal(3)])}).strict().nullable(),
  farmLevel: z.literal(2).optional(), agencyLevel: z.union([z.literal(2), z.literal(3)]).optional(),
  footprintTier: footprintTier.optional(),
  order: z.object({recipe: z.enum(Object.keys(ORDERS) as [OrderId, ...OrderId[]]), startedAt: timestamp, endsAt: timestamp, grass: integer.optional(), duration: integer.positive().optional()}).strict().nullable(),
  breeding: z.object({parents: z.tuple([identity, identity]), startedAt: timestamp, endsAt: timestamp, birth}).strict().nullable(),
  nursery: nurseryPayload.nullable(),
}).strict();
// A rabbit may carry the personal name its owner gave it: canonical text (trimmed, at most 32 characters, no control
// character), absent when unnamed. Names are individual: they are never inherited and never belong to the species.
const rabbitName = z.string().refine(name => name !== '' && normalizeRabbitName(name) === name, 'Invalid rabbit name');
const rabbit = z.object({incomeRoll: z.number().int().min(0).max(10000).optional(), id: identity, species, affection: z.number().int().min(BALANCE.minAffection).max(BALANCE.maxAffection), enclosureId: identity, name: rabbitName.optional()}).strict();
const missions = z.object({
  nightOrderStarted: z.boolean().optional(),
  events: z.object({collectOrder: integer.max(20), breed: integer.max(1), transferBirth: integer.max(1), welcome: integer.max(1), placeDecoration: integer.max(1)}).strict(),
  completed: z.array(z.enum(MAIN_MISSION_IDS)).max(MAIN_MISSION_IDS.length),
  claimed: z.array(z.enum(MAIN_MISSION_IDS)).max(MAIN_MISSION_IDS.length),
  daily: z.object({referenceAt: timestamp, cycleIndex: integer,
    progress: z.object({'collect-pattes': integer, 'collect-grass': integer, 'gain-affection': integer}).strict(),
    claimed: z.array(z.enum(DAILY_MISSION_IDS)).max(DAILY_MISSION_IDS.length), bonusClaimed: z.boolean(), nextAt: timestamp.optional(),
  }).strict(),
}).strict();
const decoration = z.object({paidHearts: integer.positive().optional(), paidPrice: integer.optional(),id: z.string().regex(/^decoration-[1-9]\d*$/), catalogId: z.enum(DECORATION_IDS), placementXpProcessed: z.boolean().optional(),
  location: z.discriminatedUnion('kind', [
    z.object({kind: z.literal('inventory')}).strict(),
    z.object({kind: z.literal('outside'), x: integer, y: integer, rotation: z.union([z.literal(0), z.literal(1)])}).strict(),
  ])}).strict();
const aidStage = z.enum(['order', 'breeding', 'growth']);
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
  version: z.literal(SAVE_VERSION), lastSimulatedAt: integer, nextId: integer.positive(), pattes: integer, grass: integer, hearts: integer, nextHeartGiftAt: timestamp,
  buildings: z.array(building).max(ISLAND.maxArea),
  rabbits: z.array(rabbit).max(ISLAND.maxArea * HABITAT_LEVELS.universal[2].capacity),
  discovered: z.array(species).max(SPECIES_IDS.length),
  pityFailures: integer.max(BALANCE.guaranteeAttempt - 1),
  market: z.object({cycle: integer, pattes: integer.max(MARKET.maximumPerCycle), grass: integer.max(MARKET.maximumPerCycle)}).strict().optional(),
  travel: z.object({welcomed: z.boolean(), trips: z.array(z.object({grass: integer.optional(), rabbitId: identity, destination: z.enum(TRAVEL.destinations), startedAt: timestamp, endsAt: timestamp, hearts: integer}).strict()).max(3)}).strict().optional(),
  missions, decorations: z.array(decoration).max(MAX_DECORATIONS),
  rewardedDecorationModels: z.array(z.enum(DECORATION_IDS)).max(DECORATION_IDS.length).refine(ids => new Set(ids).size === ids.length).optional(),
  acquiredParcels: z.array(z.enum(PARCEL_IDS)).min(1).max(9),
  islandStart: z.literal('southwest').optional(),
  startCourse: z.literal('paille-solo').optional(),
  purchaseUnlocks: z.array(z.enum(PURCHASE_UNLOCK_IDS)).max(PURCHASE_UNLOCK_IDS.length).refine(ids => new Set(ids).size === ids.length).optional(),
  initiation: z.object({order: z.string().max(500).nullable(), breeding: z.string().max(500).nullable(), growth: z.string().max(500).nullable(), birthId: identity.nullable(), closed: z.array(aidStage).max(3), used: z.array(aidStage).max(3)}).strict().optional(),
  levelAccessTransition: levelAccessTransition.optional(), presentationId: z.string().uuid().optional(),
  progression: z.object({totalXp: integer, rewardedThroughLevel: integer.positive()}).strict(),
  recipeBook: z.array(species).max(RECIPE_BOOK_SPECIES.length),
  cuisine: z.object({affectionCycles: z.record(z.string().min(1), integer), heartCycle: integer.nullable().optional(), fullRuns: z.object({cycle: integer, used: integer.max(CUISINE_FULL_REWARDS_PER_CYCLE)}).strict().optional()}).strict(),
}).strict();
const schema = current.superRefine((s, context) => {
  const issue = (message: string) => context.addIssue({code: z.ZodIssueCode.custom, message});
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
    (d.bonusClaimed && d.claimed.length !== DAILY_MISSION_IDS.length)) issue('Daily claims');
  if (s.market && s.market.cycle > d.cycleIndex) issue('Future market cycle');
  if (d.nextAt !== undefined && (!d.claimed.length || d.nextAt > s.lastSimulatedAt + DAILY_MISSION_GAP)) issue('Daily opening');
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
    if (b.order && !b.farmLevel && ORDERS[b.order.recipe].level >= ORDERS.fanes.level) issue('Farm level');
    if (b.footprintTier !== undefined && (b.kind !== 'enclosure' || !b.habitat || b.footprintTier > b.habitat.level)) issue('Footprint tier');
    if (!b.id.startsWith('building-')) issue('Building identity');
    if (buildingPlacementReason(s, b.x, b.y, b.id) || cells.has(`${b.x},${b.y}`)) issue('Invalid or occupied cell');
    cells.add(`${b.x},${b.y}`);
    if ((b.kind !== 'enclosure' && b.incomeUnits !== 0) || (b.kind !== 'farm' && b.order) || (b.kind !== 'nest' && b.breeding)) issue('Building payload mismatch');
    if ((b.kind === 'nursery') !== (b.nursery !== null)) issue('Nursery payload');
    const slots = b.nursery?.babies.map(baby => baby.slot) ?? [];
    if (b.nursery && (new Set(slots).size !== slots.length || slots.length > b.nursery.capacity || slots.some(slot => slot >= b.nursery!.capacity))) issue('Nursery slots');
    if (b.order && ((b.order.grass === undefined) !== (b.order.duration === undefined))) issue('Incomplete frozen order');
    if (b.order && (!durationValid(b.order.startedAt, b.order.endsAt, (b.order.duration ?? ORDERS[b.order.recipe].duration)))) issue('Order timestamps');
    if (b.breeding) {
      const job = b.breeding;
      if (!nursery || !durationValid(job.startedAt, job.endsAt, BALANCE.breedingDuration) || job.parents[0] === job.parents[1]) issue('Breeding timestamps or parents');
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
  for (const kind of ['enclosure', 'farm', 'nest', 'nursery', 'kitchen', 'statue', 'agency'] as const) {
    const maximum = BALANCE.buildings[kind].maximum;
    if (maximum !== null && s.buildings.filter(b => b.kind === kind).length > maximum) issue('Building limit');
  }
  if (s.travel && (s.travel.trips.length > (s.buildings.find(b => b.kind === 'agency')?.agencyLevel ?? 1) || new Set(s.travel.trips.map(t => t.rabbitId)).size !== s.travel.trips.length)) issue('Trip capacity');
  for (const trip of s.travel?.trips ?? []) {
    const hours = (trip.endsAt - trip.startedAt) / HOUR;
    if (!s.buildings.some(b => b.kind === 'agency') || !s.rabbits.some(r => r.id === trip.rabbitId) || !Number.isInteger(hours) || hours < TRAVEL.minHours || hours > TRAVEL.maxHours
      || (trip.grass !== undefined && (trip.grass !== hours * 25 || !s.buildings.some(b => b.kind === 'agency' && b.agencyLevel))) || trip.hearts !== tripHearts(hours) || trip.startedAt > s.lastSimulatedAt
      || s.buildings.some(b => b.breeding?.parents.includes(trip.rabbitId))) issue('Trip');
  }
  if (new Set(s.discovered).size !== s.discovered.length) issue('Duplicate discoveries');
  for (const r of s.rabbits) {
    ids.push(r.id);
    if (r.id.startsWith('building-') || !s.discovered.includes(r.species) ||
      !s.buildings.some(b => b.kind === 'enclosure' && b.id === r.enclosureId)) issue('Rabbit identity or enclosure or discovery');
    const home = s.buildings.find(b => b.id === r.enclosureId);
    if (home?.habitat) { const type: HabitatType = home.habitat.type; if (type !== 'universal' && !SPECIES[r.species].types.includes(type) && !LEGACY_TYPES[r.species]?.includes(type)) issue('Incompatible rabbit'); }
  }
  for (const b of s.buildings) {
    const capacity = b.habitat ? habitatLevel(b.habitat.type, b.habitat.level).capacity : BALANCE.enclosureCapacity;
    if (s.rabbits.filter(r => r.enclosureId === b.id).length > capacity) issue('Enclosure capacity');
  }
  for (const d of s.decorations) {
    if (d.paidHearts !== undefined && (d.catalogId !== 'robot-statue' || d.paidHearts !== 80 || d.paidPrice !== undefined)) issue('Decoration receipt');
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
 * `INCOMPATIBLE_CATALOG`: a save written before the catalogue boundary (versions 1 to 15). It is not read further; it is neither
 * converted nor restored. `UNSUPPORTED_VERSION`: any other version this client does not know (for instance a newer one).
 */
export type DecodeResult = {ok: true; state: GameState} | {ok: false; reason: 'INVALID_JSON' | 'INVALID_STATE' | 'UNSUPPORTED_VERSION' | 'INCOMPATIBLE_CATALOG' | 'FILE_TOO_LARGE'};
export const MAX_JSON_LENGTH = 1_000_000;
export function decodeGame(json: string): DecodeResult {
  if (json.length > MAX_JSON_LENGTH) return {ok: false, reason: 'FILE_TOO_LARGE'};
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return {ok: false, reason: 'INVALID_JSON'}; }
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version !== SAVE_VERSION && raw.version !== 19 && raw.version !== 18 && raw.version !== 17 && raw.version !== 16)
    return {ok: false, reason: Number.isInteger(raw.version) && (raw.version as number) >= 1 && (raw.version as number) <= 15 ? 'INCOMPATIBLE_CATALOG' : 'UNSUPPORTED_VERSION'};
  // Only the explicitly retired catalogue entries are removed; unknown IDs still fail validation.
  if (raw && typeof raw === 'object' && 'decorations' in raw && Array.isArray(raw.decorations)) {
    raw.decorations = raw.decorations.filter(d => !d || typeof d !== 'object' ||
      !RETIRED_DECORATION_IDS.some(id => id === d.catalogId));
  }
  migrateRetiredSpecies(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 16) raw = migrateV16(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 17) raw = migrateV17(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 18) raw = migrateV18(raw);
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 19) raw.version = SAVE_VERSION;
  settleStorageCaps(raw);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return {ok: false, reason: 'INVALID_STATE'};
  const {presentationId: _presentationId, ...stored} = parsed.data;
  const state: GameState = {...stored, cuisine: {...stored.cuisine, heartCycle: stored.cuisine.heartCycle ?? null}};
  for (const rabbit of state.rabbits) if (SPECIES[rabbit.species].rarity !== 'common') rabbit.incomeRoll ??= historicalIncomeRoll(rabbit);
  const rabbitIds = new Set(state.rabbits.map(rabbit => rabbit.id));
  for (const id of Object.keys(state.cuisine.affectionCycles))
    if (!rabbitIds.has(id)) delete state.cuisine.affectionCycles[id];
  establishHistoricalLevelRights(state);
  updateMissions(state, state.lastSimulatedAt);
  return {ok: true, state};
}
export function encodeGame(state: GameState, presentationId?: string): string {
  const parsed = schema.parse({...state, ...(presentationId ? {presentationId} : {})});
  return JSON.stringify(parsed);
}

/** Optional presentation metadata, separate from simulation state. Call after validating the save. */
export function readPresentationId(json: string): string | undefined {
  try { const raw = JSON.parse(json); const id = z.string().uuid().safeParse(raw.presentationId); return [SAVE_VERSION, 19, 18, 17, 16].includes(raw.version) && id.success ? id.data : undefined; }
  catch { return undefined; }
}
