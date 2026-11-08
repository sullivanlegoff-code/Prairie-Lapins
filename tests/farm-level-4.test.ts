import {describe, expect, it} from 'vitest';
import {itAll} from './cases';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {FANCY_ORDER_IDS, FARM_UPGRADES, GRAND_ORDER_IDS, HOUR, ORDERS, farmDuration, orderFarmLevel} from '../src/config/balance';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import type {Command, GameState} from '../src/state/types';

function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r.state;
}
function refused(s: GameState, c: Command, reason: string, now = s.lastSimulatedAt) {
  expect(act(s, c, now, () => 0)).toEqual({ok: false, state: s, reason});
}
/** A new game at `level` with one bought farm at `farmLevel`, plenty of pattes and Hearts. */
function setup(level: number, farmLevel: 1 | 2 | 3 | 4 = 3) {
  let s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; s.pattes = 200_000; s.hearts = 200;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) {
    s = run(s, {type: 'buyBuilding', kind: 'farm', x, y}); const farm = s.buildings.at(-1)!;
    if (farmLevel > 1) farm.farmLevel = farmLevel as 2 | 3 | 4;
    return {s, id: farm.id};
  }
  throw Error('No space');
}
const perPatte = (id: keyof typeof ORDERS) => ORDERS[id].grass / ORDERS[id].cost;
const perHour = (id: keyof typeof ORDERS) => ORDERS[id].grass / (ORDERS[id].duration / HOUR);

describe('farm level 4', () => {
  it('costs 100 000 pattes from player level 25', () => {
    expect(FARM_UPGRADES[4]).toEqual({level: 25, pattes: 100_000});
  });
  it('is refused below player level 25, without the pattes, on a level 2 farm, and once done', () => {
    let {s, id} = setup(24); refused(s, {type: 'upgradeFarm', id, toLevel: 4}, 'LEVEL_REQUIRED');
    ({s, id} = setup(25)); s.pattes = 99_999; refused(s, {type: 'upgradeFarm', id, toLevel: 4}, 'NOT_ENOUGH_PATTES');
    refused(s, {type: 'payWithHearts', action: {type: 'upgradeFarm', id, toLevel: 4} as never, maxHearts: 999, maxPattes: s.pattes}, 'INVALID_CHOICE');
    ({s, id} = setup(25, 2)); refused(s, {type: 'upgradeFarm', id, toLevel: 4}, 'STALE_ACTION');
    ({s, id} = setup(25, 4)); refused(s, {type: 'upgradeFarm', id, toLevel: 4}, 'STALE_ACTION');
  });
  it('debits exactly 100 000 pattes, keeps the Hearts and a running crop', () => {
    let {s, id} = setup(26); s = run(s, {type: 'startOrder', id, recipe: 'pommeAmour'});
    const up = run(s, {type: 'upgradeFarm', id, toLevel: 4});
    expect(up.pattes).toBe(s.pattes - 100_000); expect(up.hearts).toBe(s.hearts);
    expect(up.buildings.at(-1)).toMatchObject({farmLevel: 4, order: s.buildings.at(-1)!.order});
  });
});

describe('level 4 crops', () => {
  it('are three crops reserved for a level 4 farm', () => {
    expect(GRAND_ORDER_IDS.map(id => [ORDERS[id].name, ORDERS[id].level])).toEqual([['Citrouille dorée', 25], ['Melon de lune', 27], ['Cerises de cristal', 29]]);
    for (const id of GRAND_ORDER_IDS) expect(orderFarmLevel(id)).toBe(4);
  });
  it('give more food per patte and per hour than every level 3 crop (a level 4 farm pays off)', () => {
    for (const grand of GRAND_ORDER_IDS) for (const fancy of FANCY_ORDER_IDS) {
      expect(perPatte(grand)).toBeGreaterThan(perPatte(fancy)); expect(perHour(grand)).toBeGreaterThan(perHour(fancy));
    }
  });
  itAll(GRAND_ORDER_IDS)('%s is refused on a level 3 farm and below its player level', recipe => {
    let {s, id} = setup(30, 3); refused(s, {type: 'startOrder', id, recipe}, 'INVALID_CHOICE');
    ({s, id} = setup(ORDERS[recipe].level - 1, 4)); refused(s, {type: 'startOrder', id, recipe}, 'LEVEL_REQUIRED');
  });
  itAll(GRAND_ORDER_IDS)('%s grows 30 %% faster on a level 4 farm and fills the food stock', recipe => {
    let {s, id} = setup(ORDERS[recipe].level, 4); const pattes = s.pattes, grass = s.grass;
    s = run(s, {type: 'startOrder', id, recipe});
    const duration = Math.ceil(ORDERS[recipe].duration * 0.7);
    expect(farmDuration(ORDERS[recipe].duration, 4)).toBe(duration);
    expect(s.pattes).toBe(pattes - ORDERS[recipe].cost);
    expect(s.buildings.at(-1)!.order).toMatchObject({recipe, duration, grass: ORDERS[recipe].grass});
    s = run(s, {type: 'collectOrder', id}, s.lastSimulatedAt + duration);
    expect(s.grass).toBe(grass + ORDERS[recipe].grass);
  });
  it('a level 4 farm grows every earlier crop 30 % faster', () => {
    let {s, id} = setup(26, 4); s = run(s, {type: 'startOrder', id, recipe: 'pommeAmour'});
    expect(s.buildings.at(-1)!.order!.duration).toBe(Math.ceil(ORDERS.pommeAmour.duration * 0.7));
  });
  it('a level 4 farm with its crop survives a save, and that crop is refused on a level 3 farm save', () => {
    let {s, id} = setup(29, 4); s = run(s, {type: 'startOrder', id, recipe: 'cerisesCristal'});
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    const raw = JSON.parse(encodeGame(s)); raw.buildings.find((b: {id: string}) => b.id === id).farmLevel = 3;
    expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
});
