import {describe, expect, it} from 'vitest';
import {labAction, completeLaboratory, type LabAction} from '../src/dev/labActions';
import {scenarioState} from '../src/dev/scenarios';
import {createGame, encodeGame, decodeGame, act} from '../src/simulation';
import {BALANCE, SPECIES_IDS, SPECIES, HOUR, ORDERS} from '../src/config/balance';
import {HABITAT_TYPES, habitatLevel} from '../src/config/habitats';
import {DECORATION_IDS} from '../src/config/decorations';
import {GIFTED_RECIPES, RECIPE_BOOK_SPECIES} from '../src/config/recipes';
import {DAILY_MISSIONS, DAILY_MISSION_IDS, MAIN_MISSION_IDS} from '../src/config/missions';
import {cumulativeLevelXp, progressionFromXp} from '../src/simulation/progression';
import {historicalIncomeRoll} from '../src/simulation/time';
import {buildingFootprint, footprintPlacementReason} from '../src/simulation/placement';
import type {GameState} from '../src/state/types';

const now = 100 * HOUR;
/** Loading fills the missing income draw of non-common rabbits exactly as json.ts does; the laboratory creates them without one. */
function canonicalOnLoad(s: GameState): GameState {
  const canonical = structuredClone(s);
  for (const rabbit of canonical.rabbits) if (SPECIES[rabbit.species].rarity !== 'common') rabbit.incomeRoll ??= historicalIncomeRoll(rabbit);
  return canonical;
}
function roundTrip(s: GameState): GameState {
  expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: canonicalOnLoad(s)}); return s;
}
function run(s: GameState, action: LabAction): GameState {
  const before = structuredClone(s), next = labAction(s, action);
  expect(s).toEqual(before); return roundTrip(next);
}

describe('pure laboratory transactions', () => {
  it.each(['pattes', 'grass', 'hearts'] as const)('sets and adds exact %s without changing other balances', resource => {
    let s = createGame(now);
    for (const value of [0, 123, 1_000_000]) { s = run(s, {type: 'resource', resource, value}); expect(s[resource]).toBe(value); }
    for (const value of [1000, 10000]) { const before = s[resource]; s = run(s, {type: 'resource', resource, value, add: true}); expect(s[resource]).toBe(before + value); }
    for (const bad of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => labAction(s, {type: 'resource', resource, value: bad})).toThrow();
  });
  it('sets every player level to its total XP with no duplicated heart rewards', () => {
    let s = createGame(now); const hearts = s.hearts;
    for (const level of [30, ...Array.from({length: 30}, (_, i) => i + 1), 1]) {
      s = run(s, {type: 'level', level});
      expect(s.progression).toEqual({totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level});
      expect(progressionFromXp(s.progression.totalXp).level).toBe(level); expect(s.hearts).toBe(hearts);
    }
    expect(() => labAction(s, {type: 'level', level: 31})).toThrow();
  });
  it('adds every species individually and all 34 together, discovering them and creating compatible level-3 homes', () => {
    let s = createGame(now);
    for (const species of SPECIES_IDS) {
      s = run(s, {type: 'rabbit', species, affection: 20});
      expect(s.rabbits.at(-1)).toMatchObject({species, affection: 20});
    }
    expect(SPECIES_IDS).toHaveLength(34);
    const all = run(createGame(now), {type: 'allRabbits', affection: 15});
    expect(new Set(all.rabbits.map(r => r.species)).size).toBe(34); expect(all.discovered).toHaveLength(34);
    expect(all.acquiredParcels.length).toBeGreaterThan(1);
    for (const r of all.rabbits) {
      const b = all.buildings.find(b => b.id === r.enclosureId)!;
      expect(b.habitat!.type === 'universal' || SPECIES[r.species].types.includes(b.habitat!.type)).toBe(true);
    }
    for (const b of all.buildings.filter(b => !['building-1', 'building-4', 'building-5'].includes(b.id))) expect(b).toMatchObject({habitat: {type: 'universal', level: 3}, footprintTier: 3});
    expect(all.pattes).toBe(createGame(now).pattes);
  });
  it('knows all recipes and forgets only purchased recipes, preserving discoveries', () => {
    const known = run(createGame(now), {type: 'recipes', known: true}); expect(known.recipeBook).toEqual(RECIPE_BOOK_SPECIES);
    const forgotten = run(known, {type: 'recipes', known: false}); expect(forgotten.recipeBook).toEqual(GIFTED_RECIPES); expect(forgotten.discovered).toEqual(known.discovered);
  });
  it('sets selected and collective affection, including above 14 without a statue', () => {
    let s = run(createGame(now), {type: 'rabbit', species: 'neige', affection: 1});
    s = run(s, {type: 'affection', rabbitId: 'rabbit-2', value: 20}); expect(s.rabbits[1].affection).toBe(1);
    for (const value of [2, 10, 15, 20]) { s = run(s, {type: 'affection', value}); expect(s.rabbits.every(r => r.affection === value)).toBe(true); }
    expect(() => labAction(s, {type: 'affection', value: 21})).toThrow();
    // A lowering during breeding keeps a ready birth valid, rather than leaving invalid active parents.
    const full = completeLaboratory(now); const nest = full.buildings.find(b => b.breeding)!;
    nest.breeding!.startedAt = now; nest.breeding!.endsAt = now + 20 * 60000;
    const low = run(full, {type: 'affection', value: 1}); expect(low.buildings.find(b => b.breeding)!.breeding!.endsAt).toBe(now);
  });
  it('constructs all building kinds and habitat types for free and sets levels with their real footprints', () => {
    let s = createGame(now); const money = s.pattes;
    for (const kind of ['farm', 'farm', 'kitchen', 'agency', 'statue'] as const) { s = run(s, {type: 'build', kind}); expect(s.buildings.at(-1)!.kind).toBe(kind); }
    for (const habitatType of HABITAT_TYPES) { s = run(s, {type: 'build', kind: 'enclosure', habitatType}); expect(s.buildings.at(-1)!.habitat!.type).toBe(habitatType); }
    for (const b of [...s.buildings]) if (['farm', 'agency', 'enclosure'].includes(b.kind)) {
      for (const level of b.kind === 'farm' ? [2, 1] : [3, 2, 1]) {
        s = run(s, {type: 'buildingLevel', id: b.id, level});
        const actual = s.buildings.find(item => item.id === b.id)!;
        if (actual.habitat) { expect(actual.habitat.level).toBe(level); expect(actual.footprintTier).toBe(level); }
        else expect(actual.farmLevel ?? actual.agencyLevel ?? 1).toBe(level);
        expect(footprintPlacementReason(s, buildingFootprint(actual), {buildingId: actual.id})).toBeNull();
      }
    }
    for (const capacity of [1, 2, 3, 4] as const) { s = run(s, {type: 'nursery', capacity}); expect(s.buildings.find(b => b.nursery)!.nursery!.capacity).toBe(capacity); }
    s = run(s, {type: 'extensions'}); expect(s.acquiredParcels).toHaveLength(9); expect(s.pattes).toBe(money);
    // Fill the farms up to the configured maximum; one more must then be refused.
    while (s.buildings.filter(b => b.kind === 'farm').length < BALANCE.buildings.farm.maximum) s = run(s, {type: 'build', kind: 'farm'});
    expect(() => labAction(s, {type: 'build', kind: 'farm'})).toThrow();
    // The same construction action can restore a missing starter building.
    for (const kind of ['nest', 'nursery'] as const) { const missing = createGame(now); missing.buildings = missing.buildings.filter(b => b.kind !== kind); expect(run(missing, {type: 'build', kind}).buildings.some(b => b.kind === kind)).toBe(true); }
  });
  it('refuses unsafe reductions without modifying occupied homes, trips, babies or crops', () => {
    let s = completeLaboratory(now);
    const farm = s.buildings.find(b => b.order?.recipe === 'banane')!;
    expect(() => labAction(s, {type: 'buildingLevel', id: farm.id, level: 1})).toThrow(/culture/);
    expect(() => labAction(s, {type: 'buildingLevel', id: s.buildings.find(b => b.kind === 'agency')!.id, level: 1})).toThrow(/voyageurs/);
    const home = s.buildings.find(b => b.habitat && s.rabbits.filter(r => r.enclosureId === b.id).length > habitatLevel(b.habitat.type, 1).capacity)!;
    expect(() => labAction(s, {type: 'buildingLevel', id: home.id, level: 1})).toThrow(/lapins/);
    s.buildings.find(b => b.nursery)!.nursery!.babies[0].slot = 3;
    expect(() => labAction(s, {type: 'nursery', capacity: 1})).toThrow(/lapereaux/); roundTrip(s);
  });
  it('prepares missions, a new daily cycle, Coco, heart gift and Paille counter without paying rewards', () => {
    let s = createGame(now); const hearts = s.hearts, pattes = s.pattes;
    s = run(s, {type: 'mainMissions'}); expect(s.missions.completed).toEqual(MAIN_MISSION_IDS); expect(s.missions.claimed).toEqual([]);
    s = run(s, {type: 'dailyMissions'}); for (const id of DAILY_MISSION_IDS) expect(s.missions.daily.progress[id]).toBe(DAILY_MISSIONS[id].target);
    const previous = s.missions.daily.cycleIndex; s = run(s, {type: 'dailyCycle'}); expect(s.missions.daily.cycleIndex).toBe(previous + 1); expect(s.missions.daily.claimed).toEqual([]); expect(Object.values(s.missions.daily.progress)).toEqual(DAILY_MISSION_IDS.map(() => 0));
    s = run(s, {type: 'coco'}); expect(s.travel).toEqual({welcomed: false, trips: []});
    s = run(s, {type: 'heartGift'}); expect(s.nextHeartGiftAt).toBe(now);
    s.market = {cycle: s.missions.daily.cycleIndex, pattes: 2, grass: 2}; s = run(s, {type: 'market'}); expect(s.market).toBeUndefined();
    expect(s.hearts).toBe(hearts); expect(s.pattes).toBe(pattes);
  });
  it('adds each decoration to inventory including the robot with no cost', () => {
    const s = run(createGame(now), {type: 'decorations'});
    expect(s.decorations.map(d => d.catalogId)).toEqual(DECORATION_IDS); expect(s.decorations.some(d => d.catalogId === 'robot-statue')).toBe(true);
    expect(s.decorations.every(d => d.location.kind === 'inventory')).toBe(true); expect(s.hearts).toBe(createGame(now).hearts);
  });
  it('finishes all timers, preserving births, rewards, travellers and balances for manual collection', () => {
    let s = completeLaboratory(now);
    // Start every timed activity in the future-facing state.
    for (const b of s.buildings) {
      if (b.order) { b.order.startedAt = now; b.order.endsAt = now + ORDERS[b.order.recipe].duration; }
      if (b.breeding) { b.breeding.startedAt = now; b.breeding.endsAt = now + 20 * 60000; }
      for (const baby of b.nursery?.babies ?? []) { baby.startedAt = now; baby.readyAt = now + 5 * 60000; }
    }
    s.missions.daily.claimed = ['collect-pattes']; s.missions.daily.nextAt = now + 4 * HOUR;
    roundTrip(s); const finished = run(s, {type: 'finishTimers'});
    for (const b of finished.buildings) {
      if (b.order) expect(b.order.endsAt).toBeLessThanOrEqual(now);
      if (b.breeding) expect(b.breeding.endsAt).toBeLessThanOrEqual(now);
      for (const baby of b.nursery?.babies ?? []) expect(baby.readyAt).toBeLessThanOrEqual(now);
    }
    expect(finished.travel!.trips.every(t => t.endsAt <= now)).toBe(true);
    expect(finished.travel!.trips.map(t => t.hearts)).toEqual(s.travel!.trips.map(t => t.hearts));
    expect(finished.missions.daily.nextAt).toBe(now); expect(finished.nextHeartGiftAt).toBe(now);
    for (const key of ['pattes', 'grass', 'hearts', 'rabbits', 'discovered'] as const) expect(finished[key]).toEqual(s[key]);
    expect(finished.lastSimulatedAt).toBe(now);
    const farm = finished.buildings.find(b => b.order)!; expect(act(finished, {type: 'collectOrder', id: farm.id}, now).ok).toBe(true);
  });
  it.each([0, now])('provides a valid complete endgame and a fresh tutorial scenario at %s', clock => {
    const s = roundTrip(scenarioState('completeGame', clock)); expect(s.rabbits).toHaveLength(34); expect(s.discovered).toHaveLength(34);
    expect(s.progression.totalXp).toBe(cumulativeLevelXp(30)); expect(s.acquiredParcels).toHaveLength(9);
    expect(s.buildings.filter(b => b.farmLevel === 2)).toHaveLength(2);
    expect(s.buildings.filter(b => b.order && b.order.endsAt <= clock)).toHaveLength(1);
    expect(s.buildings.filter(b => b.order && b.order.endsAt > clock)).toHaveLength(1);
    expect(s.buildings.find(b => b.nursery)!.nursery).toMatchObject({capacity: 4, babies: [{readyAt: clock}]});
    expect(s.buildings.find(b => b.breeding)!.breeding!.endsAt).toBe(clock);
    expect(s.travel!.trips.filter(t => t.endsAt <= clock)).toHaveLength(1); expect(s.travel!.trips.filter(t => t.endsAt > clock)).toHaveLength(1);
    expect(s.buildings.filter(b => b.habitat).every(b => b.habitat!.level === 3 && b.footprintTier === 3)).toBe(true);
    expect(new Set(s.buildings.flatMap(b => b.habitat ? [b.habitat.type] : [])).size).toBe(6);
    expect(s.rabbits.map(r => r.affection)).toEqual(expect.arrayContaining([15, 20])); expect(s.recipeBook).toEqual(RECIPE_BOOK_SPECIES);
    expect(s.missions.completed).toEqual(MAIN_MISSION_IDS);
    expect(roundTrip(scenarioState('freshStart', clock))).toEqual(createGame(clock));
  });
});
