/** Pure laboratory transactions. This module is reachable only through the existing dev import. */
import {BALANCE, HOUR, ORDERS, SPECIES_IDS, growthDuration, type BuildingKind, type SpeciesId} from '../config/balance';
import {HABITAT_TYPES, habitatLevel, type HabitatLevel, type HabitatType} from '../config/habitats';
import {DECORATION_IDS, MAX_DECORATIONS} from '../config/decorations';
import {PARCEL_IDS, purchasableParcels} from '../config/land';
import {ISLAND} from '../config/islandGeometry';
import {DAILY_MISSIONS, DAILY_MISSION_IDS, MAIN_MISSION_IDS, MISSION_CYCLE_DURATION} from '../config/missions';
import {GIFTED_RECIPES, RECIPE_BOOK_SPECIES} from '../config/recipes';
import {emptyBuilding, createGame} from '../state/initial';
import type {Building, GameState, NurseryCapacity} from '../state/types';
import {buildingFootprint, footprintPlacementReason} from '../simulation/placement';
import {habitatEntryReason} from '../simulation/habitats';
import {cumulativeLevelXp} from '../simulation/progression';
import {updateMissions, emptyDailyProgress} from '../simulation/missions';
import {establishHistoricalLevelRights} from '../simulation/levelRights';

export type LabAction =
  | {type: 'resource'; resource: 'pattes' | 'grass' | 'hearts'; value: number; add?: boolean}
  | {type: 'level'; level: number}
  | {type: 'finishTimers'}
  | {type: 'rabbit'; species: SpeciesId; affection: number}
  | {type: 'allRabbits'; affection: number}
  | {type: 'recipes'; known: boolean}
  | {type: 'affection'; rabbitId?: string; value: number}
  | {type: 'build'; kind: BuildingKind; habitatType?: HabitatType}
  | {type: 'buildingLevel'; id: string; level: number}
  | {type: 'nursery'; capacity: NurseryCapacity}
  | {type: 'extensions' | 'mainMissions' | 'dailyMissions' | 'dailyCycle' | 'coco' | 'heartGift' | 'market' | 'decorations'};

function integer(value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Choisis un entier entre ${min} et ${max}.`);
  return value;
}

/** Find a free rectangle, buying only the extensions needed. Never move existing objects. */
function place(s: GameState, b: Building): void {
  for (;;) {
    for (let y = 0; y < ISLAND.mapFine; y++) for (let x = 0; x < ISLAND.mapFine; x++) {
      if (!footprintPlacementReason(s, buildingFootprint({...b, x, y}), {buildingId: b.id})) { b.x = x; b.y = y; return; }
    }
    const parcel = purchasableParcels(s)[0];
    if (!parcel) throw new Error('L’île est pleine : libère de la place pour cette empreinte.');
    s.acquiredParcels.push(parcel);
  }
}
function build(s: GameState, kind: BuildingKind, habitatType: HabitatType = 'universal', level: HabitatLevel = 1): Building {
  const max = BALANCE.buildings[kind].maximum;
  if (max !== null && s.buildings.filter(b => b.kind === kind).length >= max) throw new Error('Tu possèdes déjà le maximum de ce bâtiment.');
  if (!HABITAT_TYPES.includes(habitatType)) throw new Error('Habitat inconnu.');
  const b = emptyBuilding(`building-${s.nextId++}`, kind, 0, 0, habitatType);
  if (b.habitat) { b.habitat.level = level; b.footprintTier = level; }
  place(s, b); s.buildings.push(b); return b;
}
function addRabbit(s: GameState, species: SpeciesId, affection: number): void {
  integer(affection, 1, 20);
  if (!(SPECIES_IDS as readonly string[]).includes(species)) throw new Error('Espèce inconnue.');
  const home = s.buildings.find(b => b.kind === 'enclosure' && !habitatEntryReason(s, b, species)) ?? build(s, 'enclosure', 'universal', 3);
  s.rabbits.push({id: `rabbit-${s.nextId++}`, species, affection, enclosureId: home.id});
  if (!s.discovered.includes(species)) s.discovered.push(species);
}
function finishTimers(s: GameState): void {
  const now = s.lastSimulatedAt;
  for (const b of s.buildings) {
    if (b.order) b.order.endsAt = Math.min(now, b.order.endsAt);
    if (b.breeding) b.breeding.endsAt = Math.min(now, b.breeding.endsAt);
    for (const baby of b.nursery?.babies ?? []) baby.readyAt = Math.min(now, baby.readyAt);
  }
  // Keep the whole-hour duration (and the frozen reward) required by the travel schema.
  for (const trip of s.travel?.trips ?? []) if (trip.endsAt > now) {
    trip.startedAt -= trip.endsAt - now; trip.endsAt = now;
  }
  s.nextHeartGiftAt = Math.min(now, s.nextHeartGiftAt);
  if (s.missions.daily.nextAt !== undefined) s.missions.daily.nextAt = Math.min(now, s.missions.daily.nextAt);
}
function canonical(s: GameState): GameState { establishHistoricalLevelRights(s); updateMissions(s, s.lastSimulatedAt); return s; }

/** Never mutates the input; refusal throws before any controller transaction. */
export function labAction(state: GameState, action: LabAction): GameState {
  const s = structuredClone(state);
  switch (action.type) {
    case 'resource': s[action.resource] = integer(action.value + (action.add ? s[action.resource] : 0), 0, Number.MAX_SAFE_INTEGER); break;
    case 'level': { const level = integer(action.level, 1, 30); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; break; }
    case 'finishTimers': finishTimers(s); break;
    case 'rabbit': addRabbit(s, action.species, action.affection); break;
    case 'allRabbits': for (const species of SPECIES_IDS) addRabbit(s, species, action.affection); break;
    case 'recipes': s.recipeBook = [...(action.known ? RECIPE_BOOK_SPECIES : GIFTED_RECIPES)]; break;
    case 'affection': {
      integer(action.value, 1, 20);
      const rabbits = s.rabbits.filter(r => !action.rabbitId || r.id === action.rabbitId);
      if (!rabbits.length) throw new Error('Choisis un lapin présent.');
      for (const r of rabbits) r.affection = action.value;
      // A ready birth may reference parents below breeding affection; an active one may not.
      if (action.value < BALANCE.breedingAffection) for (const b of s.buildings) {
        if (b.breeding?.parents.some(id => rabbits.some(r => r.id === id))) b.breeding.endsAt = Math.min(b.breeding.endsAt, s.lastSimulatedAt);
      }
      break;
    }
    case 'build': build(s, action.kind, action.habitatType); break;
    case 'buildingLevel': {
      const b = s.buildings.find(b => b.id === action.id);
      if (!b || !['farm', 'agency', 'enclosure'].includes(b.kind)) throw new Error('Choisis une ferme, une agence ou un habitat.');
      const level = integer(action.level, 1, b.kind === 'farm' ? 2 : 3);
      if (b.kind === 'farm') {
        if (level === 1 && b.order && ORDERS[b.order.recipe].level >= ORDERS.fanes.level) throw new Error('Récolte cette culture avant de revenir au niveau 1.');
        if (level === 1) delete b.farmLevel; else b.farmLevel = 2;
      } else if (b.kind === 'agency') {
        if ((s.travel?.trips.length ?? 0) > level) throw new Error('Accueille les voyageurs avant de réduire la capacité de l’agence.');
        if (level === 1) delete b.agencyLevel; else b.agencyLevel = level as 2 | 3;
      } else {
        const target = level as HabitatLevel;
        if (s.rabbits.filter(r => r.enclosureId === b.id).length > habitatLevel(b.habitat!.type, target).capacity) throw new Error('Déplace des lapins avant de réduire cet habitat.');
        if (b.incomeUnits > habitatLevel(b.habitat!.type, target).cap * HOUR) throw new Error('Récolte les pièces de cet habitat avant de réduire son stockage.');
        b.habitat!.level = target; b.footprintTier = target;
        if (footprintPlacementReason(s, buildingFootprint(b), {buildingId: b.id})) place(s, b);
      }
      break;
    }
    case 'nursery': {
      integer(action.capacity, 1, 4);
      const n = s.buildings.find(b => b.nursery)?.nursery;
      if (!n) throw new Error('Construis une nurserie.');
      if (n.babies.some(b => b.slot >= action.capacity)) throw new Error('Accueille les lapereaux des coussins à retirer.');
      n.capacity = action.capacity; break;
    }
    case 'extensions': s.acquiredParcels = [...PARCEL_IDS]; break;
    case 'mainMissions': s.missions.completed = [...MAIN_MISSION_IDS]; break;
    case 'dailyMissions':
      for (const id of DAILY_MISSION_IDS) s.missions.daily.progress[id] = DAILY_MISSIONS[id].target;
      if (s.missions.daily.nextAt !== undefined) s.missions.daily.nextAt = s.lastSimulatedAt;
      break;
    case 'dailyCycle': {
      const d = s.missions.daily;
      d.cycleIndex++; d.referenceAt = s.lastSimulatedAt - d.cycleIndex * MISSION_CYCLE_DURATION;
      d.progress = emptyDailyProgress(); d.claimed = []; d.bonusClaimed = false; delete d.nextAt; break;
    }
    case 'coco': s.travel = {...s.travel, welcomed: false, trips: s.travel?.trips ?? []}; break;
    case 'heartGift': s.nextHeartGiftAt = s.lastSimulatedAt; break;
    case 'market': delete s.market; break;
    case 'decorations':
      if (s.decorations.length + DECORATION_IDS.length > MAX_DECORATIONS) throw new Error('Libère de la place dans ton inventaire de décorations.');
      for (const catalogId of DECORATION_IDS) s.decorations.push({id: `decoration-${s.nextId++}`, catalogId, location: {kind: 'inventory'}, placementXpProcessed: false});
      break;
  }
  return canonical(s);
}

/** A fresh deterministic fixture, with manual collection/welcome still available. */
export function completeLaboratory(now: number): GameState {
  let s = labAction(createGame(now), {type: 'extensions'});
  s = labAction(s, {type: 'level', level: 30});
  // Varied level-3 habitats; every species enters a compatible free home.
  s = labAction(s, {type: 'buildingLevel', id: s.buildings[0].id, level: 3});
  for (const habitatType of HABITAT_TYPES) { const b = build(s, 'enclosure', habitatType, 3); b.incomeUnits = HOUR * 100; }
  // Keep exactly one individual per species, including the starting Paille.
  for (const species of SPECIES_IDS) if (!s.rabbits.some(r => r.species === species)) addRabbit(s, species, 2);
  s.rabbits.forEach((r, i) => { r.affection = [2, 10, 15, 20][i % 4]; });
  for (let i = 0; i < 2; i++) {
    const b = build(s, 'farm'); b.farmLevel = 2;
    const recipe = i === 0 ? 'foin' : 'banane'; const crop = ORDERS[recipe];
    b.order = {recipe, startedAt: i === 0 ? now - crop.duration : now, endsAt: i === 0 ? now : now + crop.duration, grass: crop.grass, duration: crop.duration};
  }
  build(s, 'kitchen'); build(s, 'statue'); build(s, 'agency').agencyLevel = 3;
  s.travel = {welcomed: true, trips: s.rabbits.slice(2, 4).map((r, i) => ({rabbitId: r.id, destination: i === 0 ? 'Paris' : 'Vannes', startedAt: i === 0 ? now - 3 * HOUR : now, endsAt: i === 0 ? now : now + 3 * HOUR, hearts: 1, grass: 75}))};
  const birth = () => ({id: `birth-${s.nextId++}`, species: 'paille' as const, guaranteed: false, reservedDiscovery: false});
  s.buildings.find(b => b.kind === 'nursery')!.nursery = {capacity: 4, babies: [{slot: 0, birth: birth(), startedAt: now - growthDuration('paille'), readyAt: now}]};
  s.buildings.find(b => b.kind === 'nest')!.breeding = {parents: [s.rabbits[0].id, s.rabbits[1].id], startedAt: now - growthDuration('paille'), endsAt: now, birth: birth()};
  for (const resource of ['pattes', 'grass', 'hearts'] as const) s = labAction(s, {type: 'resource', resource, value: 1_000_000});
  for (const action of [{type: 'recipes', known: true}, {type: 'mainMissions'}, {type: 'dailyMissions'}, {type: 'decorations'}] as const) s = labAction(s, action);
  return canonical(s);
}
