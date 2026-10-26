import {foodXp, firstDecorationPlacementXp, missionClaimXp} from './progression';
import {PROGRESSION} from '../config/progression';
import {CUISINE_REWARDS, CUISINE_TIP, CUISINE_FULL_REWARDS_PER_CYCLE} from '../config/balance';
import {applyProgressionGain} from './progressionRewards';
import {eligibleMainMissionIds} from './missions';
import {stateLevelAccess} from './levelRights';
import {jobKey, initiationAvailable, settleInitiation} from './initiation';
import {buildingPlacementReason, buildingFootprint, decorationsInFootprint, upgradeFootprintReason} from './placement';
import {normalizeRabbitName} from './rabbitNames';
import {acquiredCell, PARCEL_IDS, extensionPrice, purchasableParcels} from '../config/land';
import {HABITAT_TYPES, habitatLevel, habitatPrice, type HabitatLevel} from '../config/habitats';
import {habitatEntryReason, removeHabitatReason} from './habitats';
import {DAILY_MISSIONS, DAILY_MISSION_GAP, DAILY_MISSION_IDS, MAIN_MISSIONS, DAILY_BONUS, type Reward} from '../config/missions';
import {marketPrice, marketUnlocked} from './market';
import {affectionCap, playerLevel} from './affection';
import {agencyBuilding, travelling} from './travel';
import {currentDailyMission, dailyCycleStart, dailyOpensAt, openNextDailyMission, recordMissionAction} from './missions';
import {AFFECTION_STATUE, BALANCE, HEARTS, HOUR, TRAVEL, drawTrip, tripHearts, feedCost, growthDuration, ORDERS, SPECIES, GUARANTEE_SPECIES, type BuildingKind, type SpeciesId} from '../config/balance';
import {emptyBuilding} from '../state/initial';
import {babyInNursery, findNurseryBaby, firstFreeNurserySlot, nurseryBuilding, nurseryUnlockQuote, settleNestTransfers} from './nursery';
import type {ActionResult, Building, Command, GameState, PattesCommand, Refusal, ProgressionGain} from '../state/types';
import {chooseBirth, breedingPool, nestForParent} from './breeding';
import {recipePrice, recipePurchaseReason} from './recipes';
import {advance, validTime} from './time';
import {complementCost, quoteAcceleration} from './hearts';
import {DECORATIONS, ownedDecorationResalePrice} from '../config/decorations';
import {catalogDecorationPlacementReason, decorationPlacementReason, decorationsInCell, purchaseDecorationReason} from './decorations';

/** The only purchases a heart complement may cover. Recipes are never among them. */
export const HEART_COMPLEMENT_COMMANDS: readonly PattesCommand['type'][] = ['buyBuilding', 'buyRabbit', 'expand', 'startOrder', 'upgradeHabitat'];
class Quoted extends Error { constructor(public price: number) { super(); } }
class Denied extends Error { constructor(public reason: Refusal) { super(reason); } }
function requireRule(condition: unknown, reason: Refusal): asserts condition {
  if (!condition) throw new Denied(reason);
}
/** Atomic action: even elapsed time is discarded on refusal; call advance separately to resume. */
export function act(state: GameState, command: Command, now: number = Date.now(), rng: () => number = Math.random): ActionResult {
  return runAction(state, command, now, rng);
}
function runAction(state: GameState, requested: Command, now: number, rng: () => number, quoteOnly = false): ActionResult {
  const payment = requested.type === 'payWithHearts' ? requested : null;
  const command = requested.type === 'payWithHearts' ? requested.action : requested;
  if (payment && !(HEART_COMPLEMENT_COMMANDS as readonly string[]).includes(command.type)) return {ok: false, state, reason: 'INVALID_CHOICE'};
  if (!validTime(now)) return {ok: false, state, reason: 'INVALID_TIME'};
  const s = advance(state, now);
  const time = s.lastSimulatedAt;
  const allocation = () => requireRule(Number.isSafeInteger(s.nextId + 1), 'RESOURCE_LIMIT');
  const id = (prefix: string) => { allocation(); return `${prefix}-${s.nextId++}`; };
  const credit = (resource: 'pattes' | 'grass' | 'hearts', amount: number) => {
    requireRule(Number.isSafeInteger(s[resource] + amount), 'RESOURCE_LIMIT');
    s[resource] += amount;
  };
  const pay = (cost: number) => {
    if (quoteOnly) throw new Quoted(cost); // Every non-monetary condition has already been checked.
    if (!payment) { requireRule(s.pattes >= cost, 'NOT_ENOUGH_PATTES'); s.pattes -= cost; return; }
    const missing = Math.max(0, cost - s.pattes), hearts = complementCost(missing);
    requireRule(missing > 0, 'NO_MISSING_PATTES');
    requireRule(Number.isSafeInteger(payment.maxHearts) && payment.maxHearts >= hearts &&
      Number.isSafeInteger(payment.maxPattes) && payment.maxPattes >= s.pattes, 'PRICE_CHANGED');
    requireRule(s.hearts >= hearts, 'NOT_ENOUGH_HEARTS');
    s.pattes = 0; s.hearts -= hearts;
  };
  const building = (key: string, kind?: BuildingKind): Building => {
    const b = s.buildings.find(item => item.id === key && (!kind || item.kind === kind));
    requireRule(b, 'NOT_FOUND'); return b;
  };
  const room = (key: string, species: SpeciesId) => {
    const b = building(key, 'enclosure');
    const reason = habitatEntryReason(s, b, species); requireRule(!reason, reason ?? 'INVALID_CHOICE');
    return b;
  };
  const cell = (x: number, y: number, exclude?: string) => {
    const reason = buildingPlacementReason(s, x, y, exclude);
    requireRule(!reason, reason ?? 'INVALID_CELL');
  };
  const busy = (rabbitId: string) => !!nestForParent(s, rabbitId);
  const reward = (r: Reward) => {
    if (r.resource === 'none') return;
    credit(r.resource, r.amount); value = r.amount;
  };
  let value: string | number | undefined;
  let progressionGain: ProgressionGain | undefined;
  let cuisineReward: import('../state/types').CuisineReward | undefined;
  const gainXp = (amount: number) => {
    const result = applyProgressionGain(s, amount);
    requireRule(result.ok, result.ok ? 'INVALID_CHOICE' : result.reason);
    progressionGain = result.gain;
  };
  const discover = (species: SpeciesId) => {
    if (s.discovered.includes(species)) return 0;
    s.discovered.push(species);
    return SPECIES[species].rarity === 'common' ? PROGRESSION.xp.discovery.common : SPECIES[species].rarity === 'rare' ? PROGRESSION.xp.discovery.rare : 0;
  };
  const decorationXp = (catalogId: import('../config/decorations').DecorationId) => {
    s.rewardedDecorationModels ??= [...new Set(state.decorations.filter(d => d.placementXpProcessed !== false).map(d => d.catalogId))];
    if (s.rewardedDecorationModels.includes(catalogId)) return;
    s.rewardedDecorationModels.push(catalogId); gainXp(firstDecorationPlacementXp(catalogId));
  };
  try {
    switch (command.type) {
      case 'rewardCuisine': {
        requireRule(command.recipeId === 'salad' || command.recipeId === 'chicken', 'INVALID_CHOICE');
        requireRule(s.buildings.some(b => b.kind === 'kitchen'), 'MISSING_BUILDING'); // The Kitchen is where Cuisine is played.
        const rabbit = s.rabbits.find(r => r.id === command.rabbitId); requireRule(rabbit, 'NOT_FOUND'); requireRule(!travelling(s, rabbit.id), 'TRAVELING');
        const cycle = s.missions.daily.cycleIndex;
        // The full-reward slots are shared by every recipe and renew with the canonical daily cycle.
        const used = s.cuisine.fullRuns?.cycle === cycle ? s.cuisine.fullRuns.used : 0, fullReward = used < CUISINE_FULL_REWARDS_PER_CYCLE;
        const paid = fullReward ? CUISINE_REWARDS[command.recipeId] : CUISINE_TIP;
        credit('pattes', paid.pattes); credit('grass', paid.grass);
        if (fullReward) s.cuisine.fullRuns = {cycle, used: used + 1};
        const eligible = !Object.hasOwn(s.cuisine.affectionCycles, rabbit.id) || s.cuisine.affectionCycles[rabbit.id] !== cycle;
        const affectionGranted = eligible && rabbit.affection < affectionCap(s);
        if (eligible) {
          s.cuisine.affectionCycles = {...s.cuisine.affectionCycles, [rabbit.id]: cycle};
          if (affectionGranted) rabbit.affection++;
        }
        // One Heart per canonical cycle for Cuisine as a whole, whichever rabbit cooked.
        const heartGranted = s.cuisine.heartCycle !== cycle;
        if (heartGranted) { credit('hearts', 1); s.cuisine.heartCycle = cycle; }
        cuisineReward = {pattes: paid.pattes, grass: paid.grass, fullReward, affectionGranted, affectionAtCap: rabbit.affection === BALANCE.maxAffection, affectionStatueRequired: !affectionGranted && rabbit.affection >= AFFECTION_STATUE.cap && affectionCap(s) === AFFECTION_STATUE.cap, heartGranted};
        break;
      }
      case 'buyDecoration': {
        const reason = purchaseDecorationReason(s, command.catalogId); requireRule(!reason, reason ?? 'INVALID_CHOICE');
        if (command.location) {
          requireRule(command.location.kind === 'outside', 'INVALID_CHOICE');
          const placement = catalogDecorationPlacementReason(s, command.catalogId, command.location); requireRule(!placement, placement ?? 'INVALID_CHOICE');
        }
        const definition = DECORATIONS[command.catalogId];
        if (definition.heartPrice !== undefined) s.hearts -= definition.heartPrice; else pay(definition.price); value = id('decoration');
        s.decorations.push({id: value, catalogId: command.catalogId, ...(definition.heartPrice !== undefined ? {paidHearts: definition.heartPrice} : {paidPrice: definition.price}), location: command.location ? structuredClone(command.location) : {kind: 'inventory'}, placementXpProcessed: !!command.location});
        if (command.location) decorationXp(command.catalogId); break;
      }
      case 'sellDecoration': {
        const index = s.decorations.findIndex(d => d.id === command.id);
        requireRule(index >= 0, 'NOT_FOUND');
        requireRule(s.decorations[index].paidHearts === undefined, 'INVALID_CHOICE');
        const amount = ownedDecorationResalePrice(s.decorations[index]);
        credit('pattes', amount);
        s.decorations.splice(index, 1); value = amount; break;
      }
      case 'placeDecoration': {
        const reason = decorationPlacementReason(s, command.id, command.location); requireRule(!reason, reason ?? 'INVALID_CHOICE');
        const owned = s.decorations.find(d => d.id === command.id)!;
        requireRule(owned.placementXpProcessed !== false || owned.location.kind === 'inventory', 'INVALID_CHOICE');
        if (owned.placementXpProcessed === false && command.location.kind === 'outside') {
          decorationXp(owned.catalogId); owned.placementXpProcessed = true;
        }
        owned.location = structuredClone(command.location); break;
      }
      case 'storeDecorationsInCell': {
        requireRule(acquiredCell(s, command.x, command.y), 'INVALID_CELL');
        const blocking = decorationsInCell(s, command.x, command.y);
        for (const d of s.decorations) if (blocking.includes(d.id)) d.location = {kind: 'inventory'};
        value = blocking.length; break;
      }
      case 'claimMainMission': {
        requireRule(Object.hasOwn(MAIN_MISSIONS, command.id), 'INVALID_CHOICE');
        requireRule(!s.missions.claimed.includes(command.id), 'ALREADY_CLAIMED');
        requireRule((eligibleMainMissionIds(s) as readonly string[]).includes(command.id) && s.missions.completed.includes(command.id), 'NOT_READY');
        reward(MAIN_MISSIONS[command.id].reward); s.missions.claimed.push(command.id); gainXp(missionClaimXp('main',command.id)); break;
      }
      case 'claimDailyMission': {
        requireRule(Object.hasOwn(DAILY_MISSIONS, command.id), 'INVALID_CHOICE');
        requireRule(command.cycleStart === dailyCycleStart(s), 'CYCLE_EXPIRED');
        const daily = s.missions.daily;
        requireRule(!daily.claimed.includes(command.id), 'ALREADY_CLAIMED');
        requireRule(command.id === currentDailyMission(s) && time >= dailyOpensAt(s), 'NOT_READY');
        requireRule(daily.progress[command.id] >= DAILY_MISSIONS[command.id].target, 'NOT_READY');
        requireRule(Number.isSafeInteger(time + DAILY_MISSION_GAP), 'INVALID_TIME');
        reward(DAILY_MISSIONS[command.id].reward); daily.claimed.push(command.id); openNextDailyMission(s, time); gainXp(missionClaimXp('daily',command.id)); break;
      }
      case 'claimDailyBonus': {
        requireRule(command.cycleStart === dailyCycleStart(s), 'CYCLE_EXPIRED');
        requireRule(!s.missions.daily.bonusClaimed, 'ALREADY_CLAIMED');
        requireRule(s.missions.daily.claimed.length === DAILY_MISSION_IDS.length, 'NOT_READY');
        reward(DAILY_BONUS); s.missions.daily.bonusClaimed = true; gainXp(PROGRESSION.xp.claims.dailyBonus); break;
      }
      case 'welcomeAgency': {
        requireRule(agencyBuilding(s), 'MISSING_BUILDING');
        s.travel = {welcomed: true, trips: s.travel?.trips ?? []}; break;
      }
      case 'startTrip': {
        requireRule(agencyBuilding(s), 'MISSING_BUILDING'); requireRule((s.travel?.trips.length ?? 0) < (agencyBuilding(s)!.agencyLevel ?? 1), 'BUSY');
        const rabbit = s.rabbits.find(r => r.id === command.rabbitId); requireRule(rabbit, 'NOT_FOUND');
        requireRule(!travelling(s, rabbit.id), 'TRAVELING'); requireRule(!busy(rabbit.id), 'PARENT_BUSY');
        const roll = rng(); requireRule(Number.isFinite(roll) && roll >= 0 && roll < 1, 'INVALID_RANDOM');
        const {destination, hours} = drawTrip(roll); requireRule(Number.isSafeInteger(time + hours * HOUR), 'INVALID_TIME');
        s.travel = {welcomed: s.travel?.welcomed ?? false, trips: [...(s.travel?.trips ?? []), {rabbitId: rabbit.id, destination, startedAt: time, endsAt: time + hours * HOUR, hearts: tripHearts(hours), ...(agencyBuilding(s)!.agencyLevel ? {grass: hours * 25} : {})}]};
        value = destination; break;
      }
      case 'claimTrip': {
        const trip = s.travel?.trips.find(t => t.rabbitId === command.rabbitId); requireRule(trip && trip.endsAt <= time, 'NOT_READY');
        credit('hearts', trip.hearts); credit('grass', trip.grass ?? 0); s.travel!.trips = s.travel!.trips.filter(t => t.rabbitId !== command.rabbitId); value = trip.hearts; break;
      }
      case 'exchangeForHeart': {
        requireRule(command.resource === 'pattes' || command.resource === 'grass', 'INVALID_CHOICE');
        requireRule(marketUnlocked(s), 'LEVEL_REQUIRED');
        const price = marketPrice(s, command.resource); requireRule(price !== null, 'MARKET_LIMIT');
        requireRule(price === command.expectedCost, 'PRICE_CHANGED');
        if (command.resource === 'pattes') { requireRule(s.pattes >= price!, 'NOT_ENOUGH_PATTES'); s.pattes -= price!; }
        else { requireRule(s.grass >= price!, 'NOT_ENOUGH_GRASS'); s.grass -= price!; }
        credit('hearts', 1);
        const cycle = s.missions.daily.cycleIndex, counts = s.market?.cycle === cycle ? s.market : {cycle, pattes: 0, grass: 0};
        counts[command.resource]++; s.market = counts; value = price!; break;
      }
      case 'claimHearts': {
        requireRule(time >= s.nextHeartGiftAt, 'NOT_READY');
        requireRule(Number.isSafeInteger(time + HEARTS.giftInterval), 'INVALID_TIME');
        const gifts = Math.min(HEARTS.maximumGifts, 1 + Math.floor((time - s.nextHeartGiftAt) / HEARTS.giftInterval));
        credit('hearts', gifts * HEARTS.gift); s.nextHeartGiftAt += (1 + Math.floor((time - s.nextHeartGiftAt) / HEARTS.giftInterval)) * HEARTS.giftInterval; value = gifts * HEARTS.gift; break;
      }
      case 'unlockNurserySlot': {
        const nursery = nurseryBuilding(s); requireRule(nursery?.nursery, 'MISSING_BUILDING');
        requireRule(nursery.nursery.capacity === command.fromCapacity, 'STALE_ACTION');
        const next = nurseryUnlockQuote(nursery); requireRule(next, 'MAX_NURSERY_CAPACITY');
        requireRule(command.expectedCost === next.hearts, 'PRICE_CHANGED');
        requireRule(s.hearts >= next.hearts, 'NOT_ENOUGH_HEARTS');
        // Only the capacity and the Heart balance change: babies, slots and timers stay exactly as they are.
        s.hearts -= next.hearts; nursery.nursery.capacity = next.toCapacity; value = next.toCapacity; break;
      }
      case 'initiationAid':
      case 'accelerate': {
        const quote = quoteAcceleration(s, command.id, command.stage, time, command.birthId);
        requireRule(quote.ok, quote.ok ? 'INVALID_CHOICE' : quote.reason);
        requireRule(quote.jobKey === command.jobKey, 'STALE_ACTION');
        if (command.type === 'initiationAid') {
          requireRule(initiationAvailable(s, command.id, command.stage, quote.jobKey), 'STALE_ACTION');
        } else {
          requireRule(Number.isSafeInteger(command.maxHearts) && command.maxHearts >= quote.hearts, 'PRICE_CHANGED');
          requireRule(s.hearts >= quote.hearts, 'NOT_ENOUGH_HEARTS');
        }
        const b = building(command.id);
        if (command.stage === 'order') b.order!.endsAt = time;
        else if (command.stage === 'breeding') b.breeding!.endsAt = time;
        else babyInNursery(b, command.birthId)!.readyAt = time;
        if (command.type === 'initiationAid') { s.initiation!.used.push(command.stage); s.initiation!.closed.push(command.stage); value=0; }
        else { s.hearts -= quote.hearts; value = quote.hearts; }
        break;
      }
      case 'buyBuilding': {
        requireRule(Object.hasOwn(BALANCE.buildings, command.kind), 'INVALID_CHOICE');
        requireRule(command.kind !== 'nest' && command.kind !== 'nursery', 'INVALID_CHOICE');
        const config = BALANCE.buildings[command.kind];
        requireRule(config.maximum === null || s.buildings.filter(b => b.kind === command.kind).length < config.maximum, 'BUILDING_LIMIT');
        const habitatType = command.habitatType ?? 'universal';
        requireRule(HABITAT_TYPES.includes(habitatType) && (command.kind === 'enclosure' || command.habitatType === undefined), 'INVALID_CHOICE');
        requireRule(command.kind!=='enclosure' || stateLevelAccess(s,{family:'habitatPurchase',id:habitatType}).accessible,'LEVEL_REQUIRED');
        requireRule(command.kind!=='statue' || playerLevel(s)>=AFFECTION_STATUE.level,'LEVEL_REQUIRED');
        requireRule(command.kind!=='agency' || playerLevel(s)>=TRAVEL.unlockLevel,'LEVEL_REQUIRED');
        cell(command.x, command.y); allocation(); pay(command.kind === 'enclosure' ? habitatPrice(habitatType) : config.price);
        value = id('building'); s.buildings.push(emptyBuilding(value, command.kind, command.x, command.y, habitatType));
        if (command.kind === 'farm') gainXp(PROGRESSION.xp.construction.farm);
        else if (command.kind === 'enclosure') gainXp(habitatType === 'universal' ? PROGRESSION.xp.construction.universalHabitat : PROGRESSION.xp.construction.specializedHabitat);
        break;
      }
      case 'placeStarterBuilding': {
        requireRule(command.kind === 'nest' || command.kind === 'nursery', 'INVALID_CHOICE');
        requireRule(!s.buildings.some(b => b.kind === command.kind), 'BUILDING_LIMIT');
        cell(command.x, command.y); allocation(); value = id('building');
        s.buildings.push(emptyBuilding(value, command.kind, command.x, command.y)); break;
      }
      case 'transferBirth': {
        const nest = building(command.id, 'nest');
        requireRule(nest.breeding, 'NOT_READY');
        requireRule(nest.breeding.birth.id === command.birthId, 'STALE_ACTION');
        requireRule(nest.breeding.endsAt <= time, 'NOT_READY');
        const nursery = nurseryBuilding(s), slot = firstFreeNurserySlot(nursery);
        requireRule(nursery?.nursery, 'MISSING_BUILDING'); requireRule(slot !== null, 'BUSY');
        const birth = nest.breeding.birth, duration = growthDuration(birth.species);
        requireRule(Number.isSafeInteger(time + duration), 'INVALID_TIME');
        requireRule(!findNurseryBaby(s, birth.id), 'STALE_ACTION');
        // Lowest free usable cushion; babies already there never move.
        nursery.nursery.babies.push({slot, birth, startedAt: time, readyAt: time + duration});
        nest.breeding = null; value = birth.id; break;
      }
      case 'upgradeFarm': {
        const b = building(command.id, 'farm'); requireRule(!b.farmLevel, 'STALE_ACTION');
        requireRule(playerLevel(s) >= ORDERS.fanes.level, 'LEVEL_REQUIRED');
        requireRule(s.hearts >= 30, 'NOT_ENOUGH_HEARTS'); s.hearts -= 30; b.farmLevel = 2; break;
      }
      case 'upgradeAgency': {
        const b = building(command.id, 'agency'), level = b.agencyLevel ?? 1;
        requireRule(level === command.fromLevel, 'STALE_ACTION'); requireRule(level < 3, 'INVALID_CHOICE');
        const cost = level === 1 ? 40 : 120;
        requireRule(s.hearts >= cost, 'NOT_ENOUGH_HEARTS'); s.hearts -= cost; b.agencyLevel = level === 1 ? 2 : 3; break;
      }
      case 'upgradeHabitat': {
        const b = building(command.id, 'enclosure');
        requireRule(b.habitat && b.habitat.level === command.fromLevel, 'STALE_ACTION');
        requireRule(b.habitat.level < 3, 'MAX_HABITAT_LEVEL');
        const next = (b.habitat.level + 1) as HabitatLevel;
        requireRule(stateLevelAccess(s,{family:'habitatUpgrade',id:b.habitat.type,toLevel:next as 2|3}).accessible,'LEVEL_REQUIRED');
        // The enlarged footprint must fit before anything is paid; nothing is ever moved to make room.
        const room = upgradeFootprintReason(s, b.id, next); requireRule(!room, room ?? 'INVALID_CHOICE');
        const price = habitatLevel(b.habitat.type, next);
        if (price.currency === 'hearts') {
          // Paid in hearts only: no coin complement or quote applies, and a refusal leaves balance and level untouched.
          requireRule(!payment && !quoteOnly, 'INVALID_CHOICE');
          requireRule(s.hearts >= price.cost, 'NOT_ENOUGH_HEARTS'); s.hearts -= price.cost;
        } else pay(price.cost);
        b.habitat.level = next; b.footprintTier = next; break;
      }
      case 'moveBuilding': {
        const b = building(command.id); cell(command.x, command.y, b.id); b.x = command.x; b.y = command.y; break;
      }
      case 'buyRabbit': {
        requireRule(Object.hasOwn(SPECIES, command.species), 'INVALID_CHOICE');
        const price = SPECIES[command.species].price;
        requireRule(price !== null, 'INVALID_CHOICE');
        requireRule(stateLevelAccess(s,{family:'species',id:command.species,action:'purchase'}).accessible,'LEVEL_REQUIRED'); room(command.enclosureId, command.species); allocation(); pay(price);
        value = id('rabbit');
        s.rabbits.push({id: value, species: command.species, affection: BALANCE.minAffection, enclosureId: command.enclosureId});
        gainXp(PROGRESSION.xp.commonPurchase + discover(command.species));
        break;
      }
      case 'buyRecipe': {
        // Knowledge only: no rabbit, birth, XP, mission progress or change to any draw; coins only.
        const reason = recipePurchaseReason(s, command.species); requireRule(!reason, reason ?? 'INVALID_CHOICE');
        pay(recipePrice(command.species)!); s.recipeBook.push(command.species); break;
      }
      case 'moveRabbit': {
        const rabbit = s.rabbits.find(r => r.id === command.id); requireRule(rabbit, 'NOT_FOUND');
        requireRule(!travelling(s, rabbit.id), 'TRAVELING'); requireRule(!busy(rabbit.id), 'PARENT_BUSY');
        if (rabbit.enclosureId !== command.enclosureId) { room(command.enclosureId, rabbit.species); rabbit.enclosureId = command.enclosureId; }
        break;
      }
      case 'collectIncome': {
        const b = building(command.id, 'enclosure'); value = Math.floor(b.incomeUnits / HOUR);
        credit('pattes', value); b.incomeUnits -= value * HOUR; break;
      }
      case 'removeHabitat': {
        const b = building(command.id, 'enclosure');
        const reason = removeHabitatReason(s, b.id); requireRule(!reason, reason ?? 'INVALID_CHOICE');
        value = Math.floor(b.incomeUnits / HOUR); credit('pattes', value);
        const stored = new Set(decorationsInFootprint(s, buildingFootprint(b)));
        for (const d of s.decorations) if (stored.has(d.id)) d.location = {kind: 'inventory'};
        s.buildings = s.buildings.filter(other => other.id !== b.id);
        break;
      }
      case 'startOrder': {
        const b = building(command.id, 'farm'); requireRule(!b.order, 'BUSY');
        requireRule(Object.hasOwn(ORDERS, command.recipe), 'INVALID_CHOICE');
        const recipe = ORDERS[command.recipe]; requireRule(playerLevel(s) >= recipe.level, 'LEVEL_REQUIRED');
        requireRule(b.farmLevel === 2 || ORDERS[command.recipe].level < ORDERS.fanes.level, 'INVALID_CHOICE');
        requireRule(Number.isSafeInteger(time + recipe.duration), 'INVALID_TIME'); pay(recipe.cost);
        if (recipe.duration >= HOUR) s.missions.nightOrderStarted = true; // The « longer crop » main mission.
        b.order = {recipe: command.recipe, startedAt: time, endsAt: time + recipe.duration, grass: recipe.grass, duration: recipe.duration};
        if (s.initiation && !s.initiation.order && !s.initiation.closed.includes('order') && command.recipe === 'foin') s.initiation.order = jobKey(b,'order');
        break;
      }
      case 'collectOrder': {
        const b = building(command.id, 'farm'); requireRule(b.order && b.order.endsAt <= time, 'NOT_READY');
        value = b.order.grass ?? ORDERS[b.order.recipe].grass; credit('grass', value); b.order = null; break;
      }
      case 'feed': {
        const rabbit = s.rabbits.find(r => r.id === command.id); requireRule(rabbit, 'NOT_FOUND');
        requireRule(!travelling(s, rabbit.id), 'TRAVELING'); requireRule(rabbit.affection < BALANCE.maxAffection, 'MAX_AFFECTION');
        requireRule(rabbit.affection < affectionCap(s), 'STATUE_REQUIRED');
        const cost = feedCost(rabbit.affection);
        requireRule(s.grass >= cost, 'NOT_ENOUGH_GRASS'); s.grass -= cost; rabbit.affection++; gainXp(foodXp(rabbit.affection)); break;
      }
      case 'breed': {
        requireRule(command.parents[0] !== command.parents[1], 'SAME_PARENT');
        const parents = command.parents.map(key => s.rabbits.find(r => r.id === key));
        requireRule(parents[0] && parents[1], 'NOT_FOUND');
        requireRule(parents.every(r => r && !travelling(s, r.id)), 'TRAVELING');
        requireRule(parents.every(r => r && r.affection >= BALANCE.breedingAffection), 'AFFECTION_TOO_LOW');
        const nest = s.buildings.find(b => b.kind === 'nest');
        requireRule(nest && s.buildings.some(b => b.kind === 'nursery'), 'MISSING_BUILDING');
        requireRule(!nest.breeding, 'BUSY');
        requireRule(parents.every(r => r && !busy(r.id)), 'PARENT_BUSY');
        allocation();
        const longestGrowth = Math.max(...(Object.keys(SPECIES) as SpeciesId[]).map(growthDuration));
        requireRule(Number.isSafeInteger(time + BALANCE.breedingDuration + longestGrowth), 'INVALID_TIME');
        requireRule(breedingPool(s, parents[0].species, parents[1].species, parents[0].affection, parents[1].affection).total > 0,'NO_BREEDING_RESULT');
        // Free launch: no payment or heart-complement path.
        const roll = rng(); requireRule(Number.isFinite(roll) && roll >= 0 && roll < 1, 'INVALID_RANDOM');
        const result = chooseBirth(s, parents[0].species, parents[1].species, roll, parents[0].affection, parents[1].affection);
        s.pityFailures = result.pityFailures;
        value = id('birth');
        nest.breeding = {parents: [...command.parents], startedAt: time, endsAt: time + BALANCE.breedingDuration,
          birth: {id: value, species: result.species, guaranteed: result.guaranteed, reservedDiscovery: result.reservedDiscovery}};
        if (s.initiation && !s.initiation.birthId) { s.initiation.birthId=value; s.initiation.breeding=jobKey(nest,'breeding'); }
        gainXp(PROGRESSION.xp.breedingLaunch); break;
      }
      case 'welcome': {
        const nursery = nurseryBuilding(s);
        requireRule(nursery?.nursery, 'NOT_READY');
        // A birth still waiting in the nest is not ready yet; any other unknown birth is a stale request.
        const baby = babyInNursery(nursery, command.birthId);
        requireRule(baby || !s.buildings.some(b => b.breeding?.birth.id === command.birthId), 'NOT_READY');
        requireRule(baby, 'STALE_ACTION');
        requireRule(baby.readyAt <= time, 'NOT_READY'); room(command.enclosureId, baby.birth.species);
        const birth = baby.birth; value = birth.id;
        s.rabbits.push({id: birth.id, species: birth.species, affection: BALANCE.minAffection, enclosureId: command.enclosureId});
        if (!s.discovered.includes(birth.species)) {
          if (GUARANTEE_SPECIES.includes(birth.species)) s.pityFailures = 0;
        }
        gainXp(PROGRESSION.xp.birth[SPECIES[birth.species].rarity] + discover(birth.species));
        nursery.nursery.babies = nursery.nursery.babies.filter(other => other !== baby);
        if(s.initiation?.birthId === birth.id) for(const stage of ['order','breeding','growth'] as const) if(!s.initiation.closed.includes(stage)) s.initiation.closed.push(stage);
        break;
      }
      case 'expand': {
        requireRule(PARCEL_IDS.includes(command.parcelId), 'INVALID_CHOICE');
        requireRule(!s.acquiredParcels.includes(command.parcelId), 'ALREADY_EXPANDED');
        requireRule(purchasableParcels(s).includes(command.parcelId), 'PARCEL_UNAVAILABLE');
        requireRule(command.expectedCost === extensionPrice(s), 'PRICE_CHANGED');
        requireRule(stateLevelAccess(s,{family:'extension',rank:s.acquiredParcels.length}).accessible,'LEVEL_REQUIRED');
        pay(extensionPrice(s)); s.acquiredParcels.push(command.parcelId); break;
      }
      case 'release': {
        const rabbit = s.rabbits.find(r => r.id === command.id); requireRule(rabbit, 'NOT_FOUND');
        requireRule(!travelling(s, rabbit.id), 'TRAVELING'); requireRule(!busy(rabbit.id), 'PARENT_BUSY');
        requireRule(s.rabbits.filter(r => r.species === rabbit.species).length > 1, 'LAST_OF_SPECIES');
        credit('grass', SPECIES[rabbit.species].rarity === 'common' ? BALANCE.releaseGrass.common : SPECIES[rabbit.species].rarity === 'rare' ? BALANCE.releaseGrass.rare : 0); s.rabbits = s.rabbits.filter(r => r.id !== rabbit.id);
        delete s.cuisine.affectionCycles[rabbit.id];
        break;
      }
      case 'renameRabbit': {
        // Free and purely cosmetic: no resource, XP, mission or draw is involved. The command validates the name itself.
        const rabbit = s.rabbits.find(r => r.id === command.id); requireRule(rabbit, 'NOT_FOUND');
        const name = normalizeRabbitName(command.name); requireRule(name !== null, 'INVALID_NAME');
        if (name) rabbit.name = name; else delete rabbit.name;
        break;
      }
      default: throw new Denied('INVALID_CHOICE');
    }
    if (command.type === 'transferBirth' && s.initiation?.birthId === command.birthId && !s.initiation.growth && !s.initiation.closed.includes('growth')) {
      const nursery=s.buildings.find(b=>b.nursery?.babies.some(baby=>baby.birth.id===command.birthId)); if(nursery) s.initiation.growth=jobKey(nursery,'growth',command.birthId);
    }
    settleInitiation(s);
    // A welcome, a cushion unlock or a finished acceleration can free the way for a birth waiting at the nest.
    settleNestTransfers(s, time);
    // Compare individuals, so only actual gains count, regardless of their source.
    const affectionGained = s.rabbits.reduce((sum, rabbit) => {
      const before = state.rabbits.find(previous => previous.id === rabbit.id);
      return sum + (before ? Math.max(0, rabbit.affection - before.affection) : 0);
    }, 0);
    requireRule(recordMissionAction(s, 'gainAffection', affectionGained), 'RESOURCE_LIMIT');
    requireRule(recordMissionAction(s, command.type === 'buyDecoration' && command.location ? 'placeDecoration' : command.type, command.type === 'feed' || command.type === 'breed' ? 1 : typeof value === 'number' ? value : 0, command.type !== 'placeDecoration' || command.location.kind === 'outside'), 'RESOURCE_LIMIT');
    // In particular, a welcome frees the nursery at this action's timestamp.
    return {ok: true, state: advance(s, time), ...(value === undefined ? {} : {value}), ...(progressionGain ? {progressionGain} : {}), ...(cuisineReward ? {cuisineReward} : {})};
  } catch (error) {
    if (error instanceof Quoted) return {ok: true, state, value: error.price};
    if (error instanceof Denied) return {ok: false, state, reason: error.reason};
    throw error;
  }
}

export function pendingDiscoveries(state: GameState): SpeciesId[] {
  return [...new Set(state.buildings.flatMap(b => [b.breeding?.birth, ...(b.nursery?.babies ?? []).map(baby => baby.birth)])
    .filter(birth => birth?.reservedDiscovery && !state.discovered.includes(birth.species))
    .map(birth => birth!.species))];
}

export type ComplementQuote = {ok: true; cost: number; pattes: number; hearts: number; missing: number} | {ok: false; reason: Refusal};
/** Reuses the exact action validation, stopping at payment before any RNG or mutation. */
export function quoteComplement(state: GameState, command: PattesCommand, now: number): ComplementQuote {
  if (!(HEART_COMPLEMENT_COMMANDS as readonly string[]).includes((command as {type:string}).type)) return {ok:false,reason:'INVALID_CHOICE'};
  const result = runAction(state, command, now, () => { throw new Error('A quote must not draw a birth'); }, true);
  if (!result.ok) return {ok: false, reason: result.reason};
  const cost = result.value as number;
  const missing = Math.max(0, cost - state.pattes);
  if (!missing) return {ok: false, reason: 'NO_MISSING_PATTES'};
  return {ok: true, cost, pattes: state.pattes, hearts: complementCost(missing), missing};
}
