// HISTORICAL: previousStart reproduces the retired centre-start layout; current economy rules apply.
import {describe, expect, it} from 'vitest';
import {GameController} from '../src/application/GameController';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {HOUR, MINUTE, growthDuration} from '../src/config/balance';
import {DAILY_MISSION_IDS, MAIN_MISSIONS} from '../src/config/missions';
import {extensionPrice} from '../src/config/land';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {dailyCycleEnd, dailyCycleStart} from '../src/simulation/missions';
import {rabbitIncome} from '../src/simulation/time';
import {initiationAvailable, jobKey} from '../src/simulation/initiation';
import {nurseryUnlockQuote} from '../src/simulation/nursery';
import type {Command, GameState} from '../src/state/types';
import {previousStart} from './regression-start';

const NOW = 1_790_000_000_000;
function ready(): GameState {
  const s = previousStart(NOW);
  s.buildings[0].x = 18; s.buildings[0].y = 20;
  s.buildings[1].x = 18; s.buildings[1].y = 16;
  s.buildings[2].x = 22; s.buildings[2].y = 16;
  s.pattes = 100_000; s.grass = 1000; s.hearts = 1000;
  s.progression = {totalXp: cumulativeLevelXp(22), rewardedThroughLevel: 22};
  s.nextId = 100;
  s.rabbits.forEach(r => r.affection = 3);
  s.rabbits.push({...s.rabbits[0], id: 'rabbit-9'});
  const farm = emptyBuilding('building-6', 'farm', 22, 20);
  farm.order = {recipe: 'small', startedAt: NOW - 5 * MINUTE, endsAt: NOW};
  const habitat = emptyBuilding('building-7', 'enclosure', 26, 24);
  const kitchen = emptyBuilding('building-8', 'kitchen', 26, 20);
  s.buildings.push(farm, habitat, kitchen);
  s.buildings[0].incomeUnits = 12 * HOUR;
  s.decorations.push({id: 'decoration-10', catalogId: 'bush', location: {kind: 'outside', x: 16, y: 28, rotation: 0}});
  s.nextHeartGiftAt = NOW;
  s.missions.completed.push('first-meal');
  s.missions.daily.progress = {'collect-pattes': 100, 'collect-grass': 40, 'gain-affection': 3};
  return advance(s, NOW);
}
function prepare(type: Command['type']): {state: GameState; command: Command} {
  const s = ready(), id = 'building-6';
  const command: Partial<Record<Command['type'], Command>> = {
    buyBuilding: {type: 'buyBuilding', kind: 'farm', x: 18, y: 24},
    moveBuilding: {type: 'moveBuilding', id, x: 18, y: 24},
    buyRabbit: {type: 'buyRabbit', species: 'paille', enclosureId: 'building-7'},
    moveRabbit: {type: 'moveRabbit', id: 'rabbit-2', enclosureId: 'building-7'},
    collectIncome: {type: 'collectIncome', id: 'building-1'},
    startOrder: {type: 'startOrder', id, recipe: 'small'},
    collectOrder: {type: 'collectOrder', id},
    feed: {type: 'feed', id: 'rabbit-2'},
    breed: {type: 'breed', parents: ['rabbit-2', 'rabbit-3']},
    release: {type: 'release', id: 'rabbit-9'},
    renameRabbit: {type: 'renameRabbit', id: 'rabbit-2', name: 'Paillette'},
    upgradeHabitat: {type: 'upgradeHabitat', id: 'building-7', fromLevel: 1},
    expand: {type: 'expand', parcelId: 'east', expectedCost: extensionPrice(s)},
    rewardCuisine: {type: 'rewardCuisine', rabbitId: 'rabbit-2', recipeId: 'salad'},
    buyDecoration: {type: 'buyDecoration', catalogId: 'bush'},
    placeDecoration: {type: 'placeDecoration', id: 'decoration-10', location: {kind: 'inventory'}},
    sellDecoration: {type: 'sellDecoration', id: 'decoration-10'},
    storeDecorationsInCell: {type: 'storeDecorationsInCell', x: 4, y: 7},
    claimMainMission: {type: 'claimMainMission', id: 'first-meal'},
    claimDailyMission: {type: 'claimDailyMission', id: 'gain-affection', cycleStart: dailyCycleStart(s)},
    claimDailyBonus: {type: 'claimDailyBonus', cycleStart: dailyCycleStart(s)},
    claimHearts: {type: 'claimHearts'},
    buyRecipe: {type: 'buyRecipe', species: 'dragon'},
    unlockNurserySlot: {type: 'unlockNurserySlot', fromCapacity: 1, expectedCost: nurseryUnlockQuote(s.buildings[2])!.hearts},
  };
  if (type === 'startOrder' || type === 'payWithHearts') s.buildings.find(b => b.id === id)!.order = null;
  if (type === 'claimDailyBonus') s.missions.daily.claimed = [...DAILY_MISSION_IDS];
  if (type === 'payWithHearts') {
    s.pattes = 0;
    return {state: s, command: {type, action: {type: 'startOrder', id, recipe: 'small'}, maxHearts: 100, maxPattes: 0}};
  }
  if (type === 'placeStarterBuilding') {
    s.buildings = s.buildings.filter(b => b.kind !== 'nest');
    return {state: s, command: {type, kind: 'nest', x: 18, y: 16}};
  }
  if (type === 'accelerate' || type === 'initiationAid') {
    const farm = s.buildings.find(b => b.id === id)!;
    farm.order = {recipe: 'small', startedAt: NOW, endsAt: NOW + 5 * MINUTE};
    const key = jobKey(farm, 'order')!; s.initiation!.order = key;
    return {state: s, command: type === 'accelerate' ? {type, id, stage: 'order', jobKey: key, maxHearts: 100} : {type, id, stage: 'order', jobKey: key}};
  }
  if (type === 'transferBirth' || type === 'welcome') {
    const birth = {id: 'birth-20', species: 'paille' as const, guaranteed: false, reservedDiscovery: false};
    if (type === 'transferBirth') {
      s.buildings[1].breeding = {parents: ['rabbit-2', 'rabbit-3'], startedAt: NOW - 20 * MINUTE, endsAt: NOW, birth};
      return {state: s, command: {type, id: 'building-4', birthId: birth.id}};
    }
    s.buildings[2].nursery!.babies.push({slot: 0, birth, startedAt: NOW - growthDuration('paille'), readyAt: NOW});
    return {state: s, command: {type, birthId: birth.id, enclosureId: 'building-7'}};
  }
  if (!command[type]) throw Error(type);
  return {state: s, command: command[type]!};
}
const commands = ['buyBuilding', 'moveBuilding', 'placeStarterBuilding', 'buyRabbit', 'moveRabbit', 'collectIncome', 'startOrder', 'collectOrder', 'feed', 'breed', 'transferBirth', 'welcome', 'release', 'renameRabbit', 'upgradeHabitat', 'expand', 'rewardCuisine', 'buyDecoration', 'placeDecoration', 'sellDecoration', 'storeDecorationsInCell', 'claimMainMission', 'claimDailyMission', 'claimDailyBonus', 'claimHearts', 'buyRecipe', 'unlockNurserySlot', 'accelerate', 'initiationAid', 'payWithHearts'] as const;

describe('all durable actions are saved before adoption', () => {
  it.each(commands)('%s refuses a failed write and preserves the previous state', type => {
    const {state, command} = prepare(type);
    expect(decodeGame(encodeGame(state)).ok, 'valid fixture').toBe(true);
    expect(act(state, command, NOW, () => .9).ok, 'action is otherwise valid').toBe(true);
    let raw = encodeGame(state), fail = false;
    const controller = new GameController({getItem: () => raw, setItem: (_key, value) => { if (fail) throw Error('quota'); raw = value; }}, () => NOW, () => .9);
    const before = controller.getSnapshot().state, storedBefore = raw;
    const gains: unknown[] = []; controller.onProgressionGain(gain => gains.push(gain));
    fail = true;
    expect(controller.perform(command)).toEqual({ok: false, reason: 'ACTION_NOT_SAVED'});
    expect(controller.getSnapshot()).toMatchObject({state: before, status: 'write-error', issue: 'WRITE_FAILED'});
    expect(raw).toBe(storedBefore); expect(gains).toEqual([]);
    fail = false; expect(controller.retrySave().ok).toBe(true);
    expect(controller.getSnapshot().state).toEqual(before);
    expect(controller.perform(command).ok).toBe(true);
    expect(decodeGame(raw)).toEqual({ok: true, state: controller.getSnapshot().state});
    controller.dispose();
  });
});

describe('clock recovery', () => {
  it('rebases all dates after a two-day reversal, without paying the reversed interval', () => {
    const future = NOW + 48 * HOUR, offset = NOW - future;
    let s = ready();
    s = advance(s, future);
    s.buildings[0].incomeUnits = 0; // income already collected at the future date
    const farm = s.buildings.find(b => b.kind === 'farm')!;
    farm.order = {recipe: 'small', startedAt: future - MINUTE, endsAt: future + 4 * MINUTE};
    const nest = s.buildings[1], nursery = s.buildings[2];
    nest.breeding = {parents: ['rabbit-2', 'rabbit-3'], startedAt: future - 5 * MINUTE, endsAt: future + 15 * MINUTE,
      birth: {id: 'birth-20', species: 'paille', guaranteed: false, reservedDiscovery: false}};
    nursery.nursery!.babies.push({slot: 0, startedAt: future - MINUTE, readyAt: future + growthDuration('paille') - MINUTE,
      birth: {id: 'birth-21', species: 'paille', guaranteed: false, reservedDiscovery: false}});
    s.nextHeartGiftAt = future + 3 * HOUR;
    s.initiation = {order: jobKey(farm, 'order'), breeding: jobKey(nest, 'breeding'), growth: jobKey(nursery, 'growth', 'birth-21'), birthId: 'birth-21', closed: [], used: []};
    s.missions.daily.progress['gain-affection'] = 2;
    s.cuisine = {affectionCycles: {'rabbit-2': 2}, heartCycle: 2, fullRuns: {cycle: 2, used: 3}};
    const original = structuredClone(s), n = advance(s, NOW);
    expect(s).toEqual(original); expect(n.lastSimulatedAt).toBe(NOW);
    expect([n.pattes, n.grass, n.hearts]).toEqual([s.pattes, s.grass, s.hearts]);
    expect(n.buildings[0].incomeUnits).toBe(0);
    expect(n.nextHeartGiftAt - NOW).toBe(3 * HOUR);
    expect(n.missions.daily.referenceAt).toBe(s.missions.daily.referenceAt + offset);
    expect(dailyCycleEnd(n) - NOW).toBe(dailyCycleEnd(s) - future);
    expect(n.missions.daily.progress).toEqual(s.missions.daily.progress); expect(n.cuisine).toEqual(s.cuisine);
    for (const [i, before] of s.buildings.entries()) {
      const after = n.buildings[i];
      for (const kind of ['order', 'breeding'] as const) if (before[kind]) {
        expect(after[kind]!.startedAt).toBe(before[kind]!.startedAt + offset);
        expect(after[kind]!.endsAt).toBe(before[kind]!.endsAt + offset);
      }
      for (const [j, baby] of (before.nursery?.babies ?? []).entries()) {
        expect(after.nursery!.babies[j].startedAt).toBe(baby.startedAt + offset);
        expect(after.nursery!.babies[j].readyAt - NOW).toBe(baby.readyAt - future);
      }
    }
    for (const [id, stage, birthId] of [['building-6', 'order', undefined], ['building-4', 'breeding', undefined], ['building-5', 'growth', 'birth-21']] as const) {
      expect(initiationAvailable(n, id, stage, n.initiation![stage]!), stage + JSON.stringify(n.initiation)).toBe(true);
      expect(n.initiation![stage]).toBe(jobKey(n.buildings.find(b => b.id === id)!, stage, birthId));
    }
    expect(decodeGame(encodeGame(n))).toEqual({ok: true, state: n});
    expect(advance(n, NOW)).toEqual(n);
    const resumed = advance(n, NOW + MINUTE);
    expect(resumed.buildings[0].incomeUnits).toBe(s.rabbits.reduce((sum, r) => sum + rabbitIncome(r.affection), 0) * MINUTE);
    expect(act(n, {type: 'rewardCuisine', rabbitId: 'rabbit-2', recipeId: 'salad'}, NOW)).toMatchObject({ok: true, cuisineReward: {affectionGranted: false, heartGranted: false}});
    expect(act(n, {type: 'collectOrder', id: farm.id}, NOW + 4 * MINUTE).ok).toBe(true);
    expect(act(n, {type: 'claimHearts'}, NOW)).toMatchObject({ok: false, reason: 'NOT_READY'});
  });
  it('keeps reversals up to five minutes monotonic, and rebases beyond that threshold', () => {
    const s = ready();
    expect(advance(s, NOW - 5 * MINUTE)).toEqual(s);
    expect(advance(s, NOW - 5 * MINUTE - 1).lastSimulatedAt).toBe(NOW - 5 * MINUTE - 1);
  });
  it('roundtrips historical dates shifted before the Unix epoch', () => {
    const s = ready(); s.missions.daily.referenceAt = 0;
    s.missions.daily.cycleIndex = Math.floor(NOW / (24 * HOUR));
    const n = advance(s, 0);
    expect(n.missions.daily.referenceAt).toBe(-NOW);
    expect(decodeGame(encodeGame(n))).toEqual({ok: true, state: n});
  });
});

it('retires the dead Volant reward while keeping historical claims and unlocks readable', () => {
  expect(MAIN_MISSIONS['seven-species'].reward).toEqual({resource: 'none', amount: 0});
  const s = ready(); s.purchaseUnlocks = ['volant'];
  s.missions.completed.push('seven-species'); s.missions.claimed.push('seven-species');
  const loaded = decodeGame(encodeGame(s));
  expect(loaded.ok).toBe(true);
  if (loaded.ok) {
    expect(loaded.state.purchaseUnlocks).toContain('volant');
    expect(loaded.state.missions.claimed).toContain('seven-species');
  }
});
