import {describe, expect, it} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {HOUR} from '../src/config/balance';
import {PARCEL_IDS, purchasableParcels} from '../src/config/land';
import {ISLAND} from '../src/config/islandGeometry';
import {DECORATIONS, type DecorationId} from '../src/config/decorations';
import {buildingPlacementReason} from '../src/simulation/placement';
import {cumulativeLevelXp} from '../src/simulation/progression';
import type {Command, GameState, Refusal} from '../src/state/types';

function fixture() {
  const s = createGame(0);
  s.acquiredParcels = [...PARCEL_IDS];
  s.progression = {totalXp: cumulativeLevelXp(30), rewardedThroughLevel: 30};
  s.pattes = 10000;
  s.buildings.push(emptyBuilding('building-90', 'enclosure', 0, 0, 'paille'));
  s.nextId = 100;
  return s;
}
function run(s: GameState, command: Command) {
  const r = act(s, command, s.lastSimulatedAt);
  if (!r.ok) throw Error(r.reason);
  return r.state;
}
function refuse(s: GameState, id: string, reason: Refusal) {
  const before = structuredClone(s);
  expect(act(s, {type: 'removeHabitat', id}, s.lastSimulatedAt)).toEqual({ok: false, state: before, reason});
  expect(s).toEqual(before);
}

describe('removeHabitat', () => {
  it('refuses a resident, a reserved parent and a traveller, including a trip ready to return', () => {
    const s = fixture(), rabbit = s.rabbits[0];
    refuse(s, rabbit.enclosureId, 'HABITAT_NOT_EMPTY');
    const nest = s.buildings.find(b => b.kind === 'nest')!;
    s.rabbits.push({...rabbit, id: 'rabbit-91'});
    nest.breeding = {parents: [rabbit.id, 'rabbit-91'], startedAt: 0, endsAt: HOUR,
      birth: {id: 'birth-92', species: 'paille', guaranteed: false, reservedDiscovery: false}};
    refuse(s, rabbit.enclosureId, 'HABITAT_NOT_EMPTY');
    nest.breeding = null;
    s.travel = {welcomed: true, trips: [{rabbitId: rabbit.id, destination: 'Paris', startedAt: 0, endsAt: HOUR, hearts: 1}]};
    refuse(s, rabbit.enclosureId, 'HABITAT_NOT_EMPTY');
    s.lastSimulatedAt = HOUR;
    refuse(s, rabbit.enclosureId, 'HABITAT_NOT_EMPTY');
  });

  it('refuses the last empty habitat, other buildings and missing IDs', () => {
    const s = createGame(0); s.rabbits = [];
    refuse(s, s.buildings[0].id, 'LAST_HABITAT');
    s.buildings.push(emptyBuilding('building-90', 'farm', 0, 0));
    refuse(s, 'building-90', 'NOT_FOUND');
    refuse(s, 'missing', 'NOT_FOUND');
  });

  it('credits only whole stock, preserves missions and decorations, frees the footprint and round-trips', () => {
    let s = fixture();
    const b = s.buildings.at(-1)!;
    b.habitat!.level = 3; b.footprintTier = 3; b.incomeUnits = 17 * HOUR + 123;
    const catalogId = Object.keys(DECORATIONS)[0] as DecorationId;
    s.decorations = [
      {id: 'decoration-93', catalogId, location: {kind: 'outside', x: 6, y: 0, rotation: 0}},
      {id: 'decoration-94', catalogId, location: {kind: 'inventory'}},
    ];
    s = advance(s, 0);
    expect(s.missions.completed).toContain('two-habitats');
    const before = structuredClone(s), r = act(s, {type: 'removeHabitat', id: b.id}, 0);
    expect(r.ok).toBe(true); if (!r.ok) return;
    s = r.state;
    expect(r.value).toBe(17);
    expect(s.pattes).toBe(before.pattes + 17);
    expect(s.hearts).toBe(before.hearts);
    expect(s.buildings.some(other => other.id === b.id)).toBe(false);
    expect(s.missions.completed).toContain('two-habitats');
    expect(s.decorations).toEqual(before.decorations.map(d => ({...d, location: {kind: 'inventory'}})));
    expect(buildingPlacementReason(s, 0, 0)).toBeNull();
    expect(buildingPlacementReason(s, 4, 0)).toBeNull();
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    s = run(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'neige', x: 0, y: 0});
    expect(s.buildings.at(-1)!.habitat!.type).toBe('neige');
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });

  it('unblocks a completely saturated island with no extension left', () => {
    let s = fixture(); s.rabbits = []; s.buildings = [];
    for (let y = 0; y < ISLAND.mapFine; y += 4) for (let x = 0; x < ISLAND.mapFine; x += 4)
      s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'enclosure', x, y, 'paille'));
    expect(purchasableParcels(s)).toEqual([]);
    for (let y = 0; y < ISLAND.mapFine; y++) for (let x = 0; x < ISLAND.mapFine; x++)
      expect(buildingPlacementReason(s, x, y)).not.toBeNull();
    const buy: Command = {type: 'buyBuilding', kind: 'enclosure', habitatType: 'neige', x: 0, y: 0};
    expect(act(s, buy, 0)).toMatchObject({ok: false, reason: 'CELL_OCCUPIED'});
    s = run(s, {type: 'removeHabitat', id: s.buildings[0].id});
    s = run(s, buy);
    expect(s.buildings.at(-1)).toMatchObject({x: 0, y: 0, habitat: {type: 'neige'}});
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
});
