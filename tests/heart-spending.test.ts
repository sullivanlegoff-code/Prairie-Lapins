import {describe, expect, it} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {HOUR, ORDERS, type OrderId} from '../src/config/balance';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {travelling, tripReady} from '../src/simulation/travel';
import {ownedDecorationResalePrice} from '../src/config/decorations';
import type {Command, GameState} from '../src/state/types';

function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r.state;
}
function setup(kind: 'farm' | 'agency', level = 22) {
  let s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; s.pattes = 10000; s.hearts = 200;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) {
    s = run(s, {type: 'buyBuilding', kind, x, y}); return s;
  }
  throw Error('No space');
}
function refused(s: GameState, c: Command, reason: string, now = s.lastSimulatedAt) {
  expect(act(s, c, now)).toEqual({ok: false, state: s, reason});
}

describe('permanent heart spending', () => {
  it.each(Object.keys(ORDERS) as OrderId[])('gates %s by farm level and preserves crop player levels', recipe => {
    const s = setup('farm'), b = s.buildings.at(-1)!;
    expect(b.farmLevel).toBeUndefined();
    if (ORDERS[recipe].level >= 9) refused(s, {type: 'startOrder', id: b.id, recipe}, 'INVALID_CHOICE');
    else expect(run(s, {type: 'startOrder', id: b.id, recipe}).buildings.at(-1)!.order!.recipe).toBe(recipe);
    const upgraded = run(s, {type: 'upgradeFarm', id: b.id});
    expect(run(upgraded, {type: 'startOrder', id: b.id, recipe}).buildings.at(-1)!.order!.recipe).toBe(recipe);
    upgraded.progression = {totalXp: 0, rewardedThroughLevel: 1};
    if (ORDERS[recipe].level > 1) refused(upgraded, {type: 'startOrder', id: b.id, recipe}, 'LEVEL_REQUIRED');
  });
  it('charges exactly 30 hearts from level 9, even during a crop, once', () => {
    const early = setup('farm', 8), id = early.buildings.at(-1)!.id;
    refused(early, {type: 'upgradeFarm', id}, 'LEVEL_REQUIRED');
    let s = setup('farm', 9); s.hearts = 29; refused(s, {type: 'upgradeFarm', id}, 'NOT_ENOUGH_HEARTS');
    s.hearts = 30; s = run(s, {type: 'startOrder', id, recipe: 'foin'});
    const upgraded = run(s, {type: 'upgradeFarm', id});
    expect(upgraded.hearts).toBe(0); expect(upgraded.pattes).toBe(s.pattes);
    expect(upgraded.buildings.at(-1)).toMatchObject({farmLevel: 2, order: s.buildings.at(-1)!.order});
    refused(upgraded, {type: 'upgradeFarm', id}, 'STALE_ACTION');
    expect(decodeGame(encodeGame(upgraded))).toEqual({ok: true, state: upgraded});
  });
  it('migrates v18 farms and the old traveller without changing their jobs or rewards', () => {
    let s = setup('farm'); const farm = s.buildings.at(-1)!; farm.farmLevel = 2;
    s = run(s, {type: 'startOrder', id: farm.id, recipe: 'banane'});
    const raw = JSON.parse(encodeGame(s)); raw.version = 18; delete raw.buildings.at(-1).farmLevel;
    const decoded = decodeGame(JSON.stringify(raw)); expect(decoded).toEqual({ok: true, state: s});
    let a = setup('agency'); a = run(a, {type: 'startTrip', rabbitId: a.rabbits[0].id});
    const old = JSON.parse(encodeGame(a)); old.version = 18; old.travel = {welcomed: false, trip: old.travel.trips[0]};
    expect(decodeGame(JSON.stringify(old))).toEqual({ok: true, state: a});
    expect(decodeGame('{"version":21}')).toEqual({ok: false, reason: 'UNSUPPORTED_VERSION'});
  });
  it('upgrades the agency for 40 then 120 hearts and freezes food at departure', () => {
    let s = setup('agency'); const id = s.buildings.at(-1)!.id;
    for (let i = 0; i < 2; i++) s.rabbits.push({...s.rabbits[0], id: `rabbit-${s.nextId++}`});
    s = run(s, {type: 'startTrip', rabbitId: s.rabbits[0].id});
    refused(s, {type: 'startTrip', rabbitId: s.rabbits[1].id}, 'BUSY');
    s.hearts = 39; refused(s, {type: 'upgradeAgency', id, fromLevel: 1}, 'NOT_ENOUGH_HEARTS'); s.hearts = 160;
    const coins = s.pattes; s = run(s, {type: 'upgradeAgency', id, fromLevel: 1}); expect(s.hearts).toBe(120);
    refused(s, {type: 'upgradeAgency', id, fromLevel: 1}, 'STALE_ACTION');
    refused(s, {type: 'startTrip', rabbitId: s.rabbits[0].id}, 'TRAVELING');
    s = run(s, {type: 'startTrip', rabbitId: s.rabbits[1].id});
    refused(s, {type: 'startTrip', rabbitId: s.rabbits[2].id}, 'BUSY');
    s.hearts = 119; refused(s, {type: 'upgradeAgency', id, fromLevel: 2}, 'NOT_ENOUGH_HEARTS'); s.hearts = 120;
    s = run(s, {type: 'upgradeAgency', id, fromLevel: 2}); expect(s.hearts).toBe(0); expect(s.pattes).toBe(coins);
    s = run(s, {type: 'startTrip', rabbitId: s.rabbits[2].id});
    expect(s.travel!.trips.map(t => t.grass)).toEqual([undefined, 75, 75]);
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    refused(s, {type: 'upgradeAgency', id, fromLevel: 3}, 'INVALID_CHOICE');
    refused(s, {type: 'claimTrip', rabbitId: s.rabbits[1].id}, 'NOT_READY');
    expect(travelling(s, s.rabbits[2].id)).toBe(true); expect(tripReady(s, 3 * HOUR)).toBe(true);
    for (const mutate of [
      (v: GameState) => { v.buildings.at(-1)!.agencyLevel = 2; },
      (v: GameState) => { v.travel!.trips[1].rabbitId = v.travel!.trips[0].rabbitId; },
      (v: GameState) => { v.travel!.trips[1].grass = 74; },
    ]) { const v = structuredClone(s); mutate(v); expect(decodeGame(JSON.stringify(v))).toEqual({ok: false, reason: 'INVALID_STATE'}); }
    const rebased = advance({...s, lastSimulatedAt: 10 * HOUR, travel: {...s.travel!, trips: s.travel!.trips.map(t => ({...t, startedAt: 10 * HOUR, endsAt: 13 * HOUR}))}}, HOUR);
    expect(rebased.travel!.trips.every(t => t.startedAt === HOUR && t.endsAt === 4 * HOUR)).toBe(true);
    for (const r of s.rabbits) s = run(s, {type: 'claimTrip', rabbitId: r.id}, 3 * HOUR);
    expect(s.hearts).toBe(3); expect(s.grass).toBe(150); expect(s.travel!.trips).toEqual([]);
    refused(s, {type: 'claimTrip', rabbitId: s.rabbits[0].id}, 'NOT_READY', 3 * HOUR);
  });
  it('buys the robot with 80 hearts, never resells it, and preserves historical receipts', () => {
    let s = setup('farm'); const buy = {type: 'buyDecoration', catalogId: 'robot-statue'} as const;
    s.hearts = 79; refused(s, buy, 'NOT_ENOUGH_HEARTS'); s.hearts = 80; s.pattes = 0;
    s = run(s, buy); expect(s.hearts).toBe(0); expect(s.pattes).toBe(0);
    const owned = s.decorations[0]; expect(owned.paidHearts).toBe(80); expect(owned.paidPrice).toBeUndefined();
    refused(s, {type: 'sellDecoration', id: owned.id}, 'INVALID_CHOICE'); expect(ownedDecorationResalePrice(owned)).toBe(0);
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    delete owned.paidHearts; owned.paidPrice = 15000;
    expect(run(s, {type: 'sellDecoration', id: owned.id}).pattes).toBe(7500);
    delete owned.paidPrice; expect(run(s, {type: 'sellDecoration', id: owned.id}).pattes).toBe(500);
  });
});
