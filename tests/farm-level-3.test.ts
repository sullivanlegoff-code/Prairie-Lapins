import {describe, expect, it} from 'vitest';
import {itAll} from './cases';
import {xpAfterSlowdown} from '../src/simulation/progression';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {FANCY_ORDER_IDS, FARM_UPGRADES, HOUR, ORDERS, farmDuration, orderFarmLevel} from '../src/config/balance';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {mainProgress} from '../src/simulation/missions';
import type {Command, GameState} from '../src/state/types';

function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r.state;
}
function refused(s: GameState, c: Command, reason: string, now = s.lastSimulatedAt) {
  expect(act(s, c, now, () => 0)).toEqual({ok: false, state: s, reason});
}
/** A new game at `level` with one bought farm at `farmLevel`, plenty of pattes and Hearts. */
function setup(level: number, farmLevel: 1 | 2 | 3 = 2) {
  let s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; s.pattes = 100_000; s.hearts = 200;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) {
    s = run(s, {type: 'buyBuilding', kind: 'farm', x, y}); const farm = s.buildings.at(-1)!;
    if (farm.kind !== 'farm') throw Error('No farm');
    if (farmLevel > 1) farm.farmLevel = farmLevel as 2 | 3;
    return {s, id: farm.id};
  }
  throw Error('No space');
}

describe('farm level 3', () => {
  it('costs 60 000 pattes from player level 20', () => {
    expect(FARM_UPGRADES[3]).toEqual({level: 20, pattes: 60_000});
  });
  it('is refused below player level 20', () => {
    const {s, id} = setup(19); refused(s, {type: 'upgradeFarm', id, toLevel: 3}, 'LEVEL_REQUIRED');
  });
  it('is refused without 60 000 pattes, and never takes Hearts instead', () => {
    const {s, id} = setup(20); s.pattes = 59_999;
    refused(s, {type: 'upgradeFarm', id, toLevel: 3}, 'NOT_ENOUGH_PATTES');
    refused(s, {type: 'payWithHearts', action: {type: 'upgradeFarm', id, toLevel: 3} as never, maxHearts: 999, maxPattes: s.pattes}, 'INVALID_CHOICE');
  });
  it('is refused on a level 1 farm (stale) and once already done', () => {
    const {s, id} = setup(22, 1); refused(s, {type: 'upgradeFarm', id, toLevel: 3}, 'STALE_ACTION');
    const two = run(s, {type: 'upgradeFarm', id, toLevel: 2}); expect(two.buildings.at(-1)!.farmLevel).toBe(2);
    const three = run(two, {type: 'upgradeFarm', id, toLevel: 3}); expect(three.buildings.at(-1)!.farmLevel).toBe(3);
    refused(three, {type: 'upgradeFarm', id, toLevel: 3}, 'STALE_ACTION');
    refused(three, {type: 'upgradeFarm', id, toLevel: 2}, 'STALE_ACTION');
    refused(three, {type: 'upgradeFarm', id}, 'STALE_ACTION');
  });
  it('debits exactly 60 000 pattes, keeps the Hearts and a running crop, one farm at a time', () => {
    let {s, id} = setup(20); s = run(s, {type: 'startOrder', id, recipe: 'banane'});
    const second = run(s, {type: 'buyBuilding', kind: 'farm', ...freeCell(s)}), other = second.buildings.at(-1)!.id;
    second.buildings.at(-1)!.farmLevel = 2;
    const upgraded = run(second, {type: 'upgradeFarm', id, toLevel: 3});
    expect(upgraded.pattes).toBe(second.pattes - 60_000); expect(upgraded.hearts).toBe(second.hearts);
    expect(upgraded.buildings.find(b => b.id === id)).toMatchObject({farmLevel: 3, order: second.buildings.find(b => b.id === id)!.order});
    expect(upgraded.buildings.find(b => b.id === other)!.farmLevel).toBe(2);
    // The « farm level two » main mission still counts a level 3 farm.
    expect(mainProgress(upgraded, 'farm-level-two')).toEqual({value: 3, target: 2});
  });
});

describe('fancy crops', () => {
  it('are the four owner crops, above the banana', () => {
    expect(FANCY_ORDER_IDS.map(id => [ORDERS[id].name, ORDERS[id].level, ORDERS[id].cost, ORDERS[id].duration / HOUR, ORDERS[id].grass])).toEqual([
      ['Trèfle doré', 20, 2400, 5, 1400], ['Carotte arc-en-ciel', 22, 3200, 6, 1800],
      ['Fraise étoilée', 24, 4000, 7, 2200], ['Pomme d’amour', 26, 4800, 8, 2700],
    ]);
    for (const id of FANCY_ORDER_IDS) expect(orderFarmLevel(id)).toBe(3);
    expect([orderFarmLevel('foin'), orderFarmLevel('laitue'), orderFarmLevel('fanes'), orderFarmLevel('banane')]).toEqual([1, 1, 2, 2]);
  });
  itAll(FANCY_ORDER_IDS)('%s is refused on a level 1 or 2 farm', recipe => {
    for (const farmLevel of [1, 2] as const) { const {s, id} = setup(30, farmLevel); refused(s, {type: 'startOrder', id, recipe}, 'INVALID_CHOICE'); }
  });
  itAll(FANCY_ORDER_IDS)('%s is refused below its player level', recipe => {
    const {s, id} = setup(ORDERS[recipe].level - 1, 3); refused(s, {type: 'startOrder', id, recipe}, 'LEVEL_REQUIRED');
  });
  itAll(FANCY_ORDER_IDS)('%s grows 20 %% faster on a level 3 farm and fills the single food stock', recipe => {
    let {s, id} = setup(ORDERS[recipe].level, 3); const pattes = s.pattes, grass = s.grass;
    s = run(s, {type: 'startOrder', id, recipe});
    const duration = Math.ceil(ORDERS[recipe].duration * 0.8);
    expect(farmDuration(ORDERS[recipe].duration, 3)).toBe(duration);
    expect(s.pattes).toBe(pattes - ORDERS[recipe].cost);
    expect(s.buildings.at(-1)!.order).toMatchObject({recipe, duration, endsAt: s.lastSimulatedAt + duration, grass: ORDERS[recipe].grass});
    refused(s, {type: 'collectOrder', id}, 'NOT_READY', s.lastSimulatedAt + duration - 1);
    s = run(s, {type: 'collectOrder', id}, s.lastSimulatedAt + duration);
    expect(s.grass).toBe(grass + ORDERS[recipe].grass); expect(s.buildings.at(-1)!.order).toBeNull();
  });
  it('a level 3 farm still grows every earlier crop 20 % faster', () => {
    let {s, id} = setup(22, 3); s = run(s, {type: 'startOrder', id, recipe: 'banane'});
    expect(s.buildings.at(-1)!.order!.duration).toBe(farmDuration(ORDERS.banane.duration, 2));
  });
});

describe('farm level 3 saves', () => {
  it('reload a level 3 farm with a fancy crop', () => {
    let {s, id} = setup(26, 3); s = run(s, {type: 'startOrder', id, recipe: 'pommeAmour'});
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it('refuse a fancy crop on a level 2 or level 1 farm', () => {
    let {s, id} = setup(26, 3); s = run(s, {type: 'startOrder', id, recipe: 'trefleDore'});
    for (const farmLevel of [2, undefined]) {
      const raw = JSON.parse(encodeGame(s)); const farm = raw.buildings.find((b: {id: string}) => b.id === id);
      if (farmLevel) farm.farmLevel = farmLevel; else delete farm.farmLevel;
      expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
    }
  });
  it('refuse a farm level beyond 4', () => {
    const {s, id} = setup(22, 3); const raw = JSON.parse(encodeGame(s));
    raw.buildings.find((b: {id: string}) => b.id === id).farmLevel = 5;
    expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
  it('still load v22 saves and level 1 or 2 farms unchanged', () => {
    for (const farmLevel of [1, 2] as const) {
      let {s, id} = setup(22, farmLevel); s = run(s, {type: 'startOrder', id, recipe: farmLevel === 2 ? 'banane' : 'laitue'});
      expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
      const raw = JSON.parse(encodeGame(s)); raw.version = 22;
      // An older save's XP is on the curve without the slow-down: only that changes.
      expect(decodeGame(JSON.stringify(raw))).toEqual({ok: true, state: {...s, progression: {...s.progression, totalXp: xpAfterSlowdown(s.progression.totalXp)}}});
    }
  });
});

function freeCell(s: GameState) {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y};
  throw Error('No space');
}
