import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BENNY_FLIGHT, ULTRA_SNOW} from '../src/config/balance';
import {ULTRA_SNOW_ART, habitatArtFor} from '../src/config/habitatArt';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {bennyFlightDay} from '../src/simulation/bennyFlight';
import {buildingPlacementReason, upgradeFootprintReason} from '../src/simulation/placement';
import {emptyBuilding} from '../src/state/initial';
import {PARCEL_IDS} from '../src/config/land';
import type {Command, GameState} from '../src/state/types';

/** The Ultra neige habitat and Benny's perch (owner, 5 November 2026). */
function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => .3); if (!r.ok) throw Error(r.reason); return r.state;
}
function game(): GameState {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(25), rewardedThroughLevel: 25}; s.pattes = 100_000; s.hearts = 100;
  s.christmas = {...(s.christmas ?? {}), candies: 1000};
  return s;
}
function withSnowHabitat(s: GameState, level: 1 | 2 | 3 = 3) {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, undefined, 'enclosure')) {
    const b = emptyBuilding(`building-${s.nextId++}`, 'enclosure', x, y); b.habitat = {type: 'neige', level}; s.buildings.push(b); return b.id;
  }
  throw Error('No space');
}
function placePerch(s: GameState) {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const r = act(s, {type: 'buyBuilding', kind: 'perch', x, y}, s.lastSimulatedAt); if (r.ok) return r.state; }
  throw Error('No place for the perch');
}

describe('the Ultra neige habitat', () => {
  function placeUltra(s: GameState) {
    s.acquiredParcels = [...PARCEL_IDS]; s.debris = [];
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const r = act(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'neige', ultra: true, x, y}, s.lastSimulatedAt, () => .3); if (r.ok && !upgradeFootprintReason(r.state, String(r.value), 3)) return {state: r.state, id: String(r.value)}; }
    throw Error('No place for the Ultra neige habitat');
  }
  it('is a new snow enclosure, bought at level 1 for sucres d’orge only (no pattes, no XP)', () => {
    const s = game(), {state, id} = placeUltra(s), b = state.buildings.find(b => b.id === id)!;
    expect(b.habitat).toEqual({type: 'neige', level: 1, ultra: true});
    expect(state.christmas!.candies).toBe(1000 - ULTRA_SNOW.candies[1]);
    expect(state.pattes).toBe(s.pattes); expect(state.progression.totalXp).toBe(s.progression.totalXp);
    const decoded = decodeGame(encodeGame(state));
    expect(decoded.ok && decoded.state.buildings.find(b => b.id === id)!.habitat!.ultra).toBe(true);
  });
  it('grows to levels 2 and 3 in sucres d’orge, then shows the icy palace', () => {
    let {state, id} = placeUltra(game());
    for (const level of [1, 2] as const) {
      const before = state.christmas!.candies, pattes = state.pattes;
      state = run(state, {type: 'upgradeHabitat', id, fromLevel: level});
      const b = state.buildings.find(b => b.id === id)!;
      expect(b.habitat).toEqual({type: 'neige', level: level + 1, ultra: true});
      expect(state.christmas!.candies).toBe(before - ULTRA_SNOW.candies[(level + 1) as 2 | 3]); expect(state.pattes).toBe(pattes);
    }
    const b = state.buildings.find(b => b.id === id)!;
    expect(habitatArtFor(b.habitat!, b.footprintTier)).toBe(ULTRA_SNOW_ART);
    expect(habitatArtFor({type: 'neige', level: 3}, 3)).not.toBe(ULTRA_SNOW_ART);
  });
  it('needs enough sucres d’orge, and is only a snow enclosure', () => {
    const {state: rich, id: placed} = placeUltra(game()), spot = rich.buildings.find(b => b.id === placed)!;
    const poor = game(); poor.acquiredParcels = [...PARCEL_IDS]; poor.debris = []; poor.christmas!.candies = ULTRA_SNOW.candies[1] - 1;
    expect(act(poor, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'neige', ultra: true, x: spot.x, y: spot.y}, 0, () => .3)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_CANDIES'});
    expect(act(game(), {type: 'buyBuilding', kind: 'enclosure', habitatType: 'feu', ultra: true, x: 0, y: 0}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    let {state, id} = placeUltra(game()); state.christmas!.candies = ULTRA_SNOW.candies[2] - 1;
    expect(act(state, {type: 'upgradeHabitat', id, fromLevel: 1}, state.lastSimulatedAt)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_CANDIES'});
  });
  it('refuses an Ultra mark on another kind of habitat in a save', () => {
    const s = game(), id = withSnowHabitat(s, 2); s.buildings.find(b => b.id === id)!.habitat = {type: 'feu', level: 2, ultra: true};
    expect(() => encodeGame(s)).toThrow(/Ultra neige habitat/);
  });
});

describe('Benny’s perch and « Le vol de Benny »', () => {
  it('can be built only with Benny on the island', () => {
    const s = game();
    expect(act(s, {type: 'buyBuilding', kind: 'perch', x: 0, y: 0}, 0)).toMatchObject({ok: false});
    let refused = false;
    for (let y = 0; y < 48 && !refused; y++) for (let x = 0; x < 48 && !refused; x++) { const r = act(s, {type: 'buyBuilding', kind: 'perch', x, y}, 0); if (!r.ok && r.reason === 'BENNY_REQUIRED') refused = true; }
    expect(refused).toBe(true);
  });
  it('pays pattes for three games a day and a Heart on the first one at 20 columns', () => {
    let s = game(); s.rabbits.push({id: `rabbit-${s.nextId++}`, species: 'benny', affection: 5, enclosureId: s.buildings.find(b => b.kind === 'enclosure')!.id}); s.discovered.push('benny');
    s = placePerch(s);
    const before = {pattes: s.pattes, hearts: s.hearts};
    s = run(s, {type: 'rewardBennyFlight', passed: BENNY_FLIGHT.heartColumns});
    expect(s.pattes - before.pattes).toBe(Math.min(BENNY_FLIGHT.maxPattes, BENNY_FLIGHT.heartColumns * BENNY_FLIGHT.pattesPerColumn));
    expect(s.hearts - before.hearts).toBe(1);
    s = run(s, {type: 'rewardBennyFlight', passed: 40});
    expect(s.hearts - before.hearts).toBe(1);
    s = run(s, {type: 'rewardBennyFlight', passed: 2});
    expect(bennyFlightDay(s, s.lastSimulatedAt)).toMatchObject({rewardedLeft: 0, heartLeft: false, best: 40});
    const pattes = s.pattes; s = run(s, {type: 'rewardBennyFlight', passed: 30});
    expect(s.pattes).toBe(pattes);
    const decoded = decodeGame(encodeGame(s));
    expect(decoded.ok && decoded.state.bennyFlight).toEqual(s.bennyFlight);
  });
  it('gives no Heart when the first game of the day stops before 20 columns', () => {
    let s = game(); s.rabbits.push({id: `rabbit-${s.nextId++}`, species: 'benny', affection: 5, enclosureId: s.buildings.find(b => b.kind === 'enclosure')!.id}); s.discovered.push('benny');
    s = placePerch(s); const hearts = s.hearts;
    s = run(s, {type: 'rewardBennyFlight', passed: 5}); s = run(s, {type: 'rewardBennyFlight', passed: 25});
    expect(s.hearts).toBe(hearts);
  });
});
