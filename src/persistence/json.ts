import {establishHistoricalLevelRights} from '../simulation/levelRights';
import {PURCHASE_UNLOCK_IDS} from '../config/purchaseUnlocks';
import {RECIPE_BOOK_SPECIES} from '../config/recipes';
import {updateMissions} from '../simulation/missions';
import {buildingPlacementReason} from '../simulation/placement';
import {normalizeRabbitName} from '../simulation/rabbitNames';
import {PARCEL_IDS, startParcel} from '../config/land';
import {type HabitatType, HABITAT_TYPES, HABITAT_LEVELS, habitatLevel} from '../config/habitats';
import {MAIN_MISSION_IDS, DAILY_MISSION_IDS, DAILY_MISSIONS} from '../config/missions';
import {cycleIndexAt} from '../simulation/missions';
import {z} from 'zod';
import {BALANCE, CUISINE_FULL_REWARDS_PER_CYCLE, HOUR, NURSERY, ORDERS, SHOP_SPECIES, SPECIES, SPECIES_IDS, GUARANTEE_SPECIES, growthDuration} from '../config/balance';
import type {GameState} from '../state/types';
import {DECORATION_IDS, RETIRED_DECORATION_IDS, MAX_DECORATIONS} from '../config/decorations';
import {decorationPlacementReason} from '../simulation/decorations';
import {ISLAND} from '../config/islandGeometry';

/**
 * The one save format. Version 16 is the catalogue boundary of the development saves: the species Terre, Mottelin, Géant and
 * Brumelin and the Terre habitat were removed, and no older save is converted. Versions 1 to 15 are refused as incompatible
 * (the controller then starts a new game); they are never read, migrated or restored.
 */
export const SAVE_VERSION = 16;
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identity = z.string().regex(/^(building|rabbit|birth)-[1-9]\d*$/);
const species = z.enum(SPECIES_IDS);
const birth = z.object({id: identity, species, guaranteed: z.boolean(), reservedDiscovery: z.boolean()}).strict();
// An enclosure may store the footprint tier it has acquired (1 = 4 × 4, 2 = 6 × 5, 3 = 8 × 6 fine cells). Absent means 4 × 4 at any level.
const footprintTier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const nurseryBaby = z.object({slot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), birth, startedAt: integer, readyAt: integer}).strict();
const nurseryPayload = z.object({capacity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), babies: z.array(nurseryBaby).max(NURSERY.maxCapacity)}).strict();
const building = z.object({
  id: identity, kind: z.enum(['enclosure', 'farm', 'nest', 'nursery', 'kitchen']), x: integer, y: integer, incomeUnits: integer,
  habitat: z.object({type: z.enum(HABITAT_TYPES), level: z.union([z.literal(1), z.literal(2), z.literal(3)])}).strict().nullable(),
  footprintTier: footprintTier.optional(),
  order: z.object({recipe: z.enum(['small', 'medium', 'large']), startedAt: integer, endsAt: integer}).strict().nullable(),
  breeding: z.object({parents: z.tuple([identity, identity]), startedAt: integer, endsAt: integer, birth}).strict().nullable(),
  nursery: nurseryPayload.nullable(),
}).strict();
// A rabbit may carry the personal name its owner gave it: canonical text (trimmed, at most 32 characters, no control
// character), absent when unnamed. Names are individual: they are never inherited and never belong to the species.
const rabbitName = z.string().refine(name => name !== '' && normalizeRabbitName(name) === name, 'Invalid rabbit name');
const rabbit = z.object({id: identity, species, affection: z.number().int().min(BALANCE.minAffection).max(BALANCE.maxAffection), enclosureId: identity, name: rabbitName.optional()}).strict();
const missions = z.object({
  events: z.object({collectOrder: integer.max(20), breed: integer.max(1), transferBirth: integer.max(1), welcome: integer.max(1), placeDecoration: integer.max(1)}).strict(),
  completed: z.array(z.enum(MAIN_MISSION_IDS)).max(MAIN_MISSION_IDS.length),
  claimed: z.array(z.enum(MAIN_MISSION_IDS)).max(MAIN_MISSION_IDS.length),
  daily: z.object({referenceAt: integer, cycleIndex: integer,
    progress: z.object({'collect-pattes': integer, 'collect-grass': integer, 'gain-affection': integer}).strict(),
    claimed: z.array(z.enum(DAILY_MISSION_IDS)).max(DAILY_MISSION_IDS.length), bonusClaimed: z.boolean(),
  }).strict(),
}).strict();
const decoration = z.object({id: z.string().regex(/^decoration-[1-9]\d*$/), catalogId: z.enum(DECORATION_IDS), placementXpProcessed: z.boolean().optional(),
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
const v16 = z.object({
  version: z.literal(SAVE_VERSION), lastSimulatedAt: integer, nextId: integer.positive(), pattes: integer, grass: integer, hearts: integer, nextHeartGiftAt: integer,
  buildings: z.array(building).max(ISLAND.maxArea),
  rabbits: z.array(rabbit).max(ISLAND.maxArea * HABITAT_LEVELS.universal[2].capacity),
  discovered: z.array(species).max(SPECIES_IDS.length),
  pityFailures: integer.max(BALANCE.guaranteeAttempt - 1),
  missions, decorations: z.array(decoration).max(MAX_DECORATIONS),
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
const schema = v16.superRefine((s, context) => {
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
    if (b.footprintTier !== undefined && (b.kind !== 'enclosure' || !b.habitat || b.footprintTier > b.habitat.level)) issue('Footprint tier');
    if (!b.id.startsWith('building-')) issue('Building identity');
    if (buildingPlacementReason(s, b.x, b.y, b.id) || cells.has(`${b.x},${b.y}`)) issue('Invalid or occupied cell');
    cells.add(`${b.x},${b.y}`);
    if ((b.kind !== 'enclosure' && b.incomeUnits !== 0) || (b.kind !== 'farm' && b.order) || (b.kind !== 'nest' && b.breeding)) issue('Building payload mismatch');
    if ((b.kind === 'nursery') !== (b.nursery !== null)) issue('Nursery payload');
    const slots = b.nursery?.babies.map(baby => baby.slot) ?? [];
    if (b.nursery && (new Set(slots).size !== slots.length || slots.length > b.nursery.capacity || slots.some(slot => slot >= b.nursery!.capacity))) issue('Nursery slots');
    if (b.order && (!durationValid(b.order.startedAt, b.order.endsAt, ORDERS[b.order.recipe].duration))) issue('Order timestamps');
    if (b.breeding) {
      const job = b.breeding;
      if (!nursery || !durationValid(job.startedAt, job.endsAt, BALANCE.breedingDuration) || job.parents[0] === job.parents[1]) issue('Breeding timestamps or parents');
      if (job.endsAt > s.lastSimulatedAt && job.parents.some(id => !s.rabbits.some(r => r.id === id && r.affection >= BALANCE.breedingAffection))) issue('Missing active parent');
      // Completed jobs may reference parents that were moved or entrusted: the birth and the surviving individuals are preserved.
    }
    const babies = b.nursery?.babies ?? [];
    for (const baby of babies) if (!durationValid(baby.startedAt, baby.readyAt, growthDuration(baby.birth.species))) issue('Growth timestamps');
    for (const newborn of [...babies.map(baby => baby.birth), b.breeding?.birth]) if (newborn) {
      ids.push(newborn.id);
      if (!newborn.id.startsWith('birth-') || (newborn.guaranteed && !newborn.reservedDiscovery) ||
        (newborn.reservedDiscovery && !GUARANTEE_SPECIES.includes(newborn.species))) issue('Birth reservation');
    }
  }
  for (const kind of ['enclosure', 'farm', 'nest', 'nursery', 'kitchen'] as const) {
    const maximum = BALANCE.buildings[kind].maximum;
    if (maximum !== null && s.buildings.filter(b => b.kind === kind).length > maximum) issue('Building limit');
  }
  if (new Set(s.discovered).size !== s.discovered.length) issue('Duplicate discoveries');
  for (const r of s.rabbits) {
    ids.push(r.id);
    if (r.id.startsWith('building-') || !s.discovered.includes(r.species) ||
      !s.buildings.some(b => b.kind === 'enclosure' && b.id === r.enclosureId)) issue('Rabbit identity or enclosure or discovery');
    const home = s.buildings.find(b => b.id === r.enclosureId);
    if (home?.habitat) { const type: HabitatType = home.habitat.type; if (type !== 'universal' && !SPECIES[r.species].types.includes(type)) issue('Incompatible rabbit'); }
  }
  for (const b of s.buildings) {
    const capacity = b.habitat ? habitatLevel(b.habitat.type, b.habitat.level).capacity : BALANCE.enclosureCapacity;
    if (s.rabbits.filter(r => r.enclosureId === b.id).length > capacity) issue('Enclosure capacity');
  }
  for (const d of s.decorations) {
    ids.push(d.id);
    if (decorationPlacementReason(s, d.id, d.location)) issue('Invalid decoration placement or reference');
  }
  if (new Set(ids).size !== ids.length || ids.some(id => !Number.isSafeInteger(Number(id.split('-')[1])) || Number(id.split('-')[1]) >= s.nextId)) issue('Duplicate identity or invalid nextId');
});

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
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version !== SAVE_VERSION)
    return {ok: false, reason: Number.isInteger(raw.version) && (raw.version as number) >= 1 && (raw.version as number) < SAVE_VERSION ? 'INCOMPATIBLE_CATALOG' : 'UNSUPPORTED_VERSION'};
  // Only the explicitly retired catalogue entries are removed; unknown IDs still fail validation.
  if (raw && typeof raw === 'object' && 'decorations' in raw && Array.isArray(raw.decorations)) {
    raw.decorations = raw.decorations.filter(d => !d || typeof d !== 'object' ||
      !RETIRED_DECORATION_IDS.some(id => id === d.catalogId));
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return {ok: false, reason: 'INVALID_STATE'};
  const {presentationId: _presentationId, ...stored} = parsed.data;
  const state: GameState = {...stored, cuisine: {...stored.cuisine, heartCycle: stored.cuisine.heartCycle ?? null}};
  establishHistoricalLevelRights(state);
  updateMissions(state, state.lastSimulatedAt);
  return {ok: true, state};
}
export function encodeGame(state: GameState, presentationId?: string): string {
  const parsed = schema.parse({...state, ...(presentationId ? {presentationId} : {})});
  return JSON.stringify(parsed, null, 2);
}

/** Optional presentation metadata, separate from simulation state. Call after validating the save. */
export function readPresentationId(json: string): string | undefined {
  try { const raw = JSON.parse(json); const id = z.string().uuid().safeParse(raw.presentationId); return raw.version === SAVE_VERSION && id.success ? id.data : undefined; }
  catch { return undefined; }
}
