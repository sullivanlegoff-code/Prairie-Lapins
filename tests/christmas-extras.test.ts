import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BENNY_FLIGHT, ULTRA_SNOW} from '../src/config/balance';
import {ULTRA_SNOW_ART, habitatArtFor} from '../src/config/habitatArt';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {bennyFlightDay} from '../src/simulation/bennyFlight';
import {buildingPlacementReason} from '../src/simulation/placement';
import {emptyBuilding} from '../src/state/initial';
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
  it('turns a level 3 snow habitat into the icy palace for sucres d’orge, once', () => {
    const s = game(), id = withSnowHabitat(s), bought = run(s, {type: 'buyUltraSnow', enclosureId: id});
    expect(bought.christmas!.candies).toBe(1000 - ULTRA_SNOW.candies);
    expect(bought.buildings.find(b => b.id === id)!.habitat).toEqual({type: 'neige', level: 3, ultra: true});
    expect(act(bought, {type: 'buyUltraSnow', enclosureId: id}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    const decoded = decodeGame(encodeGame(bought));
    expect(decoded.ok && decoded.state.buildings.find(b => b.id === id)!.habitat!.ultra).toBe(true);
  });
  it('needs a level 3 snow habitat and enough sucres d’orge', () => {
    const low = game(), id = withSnowHabitat(low, 2);
    expect(act(low, {type: 'buyUltraSnow', enclosureId: id}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    const poor = game(), other = withSnowHabitat(poor); poor.christmas!.candies = ULTRA_SNOW.candies - 1;
    expect(act(poor, {type: 'buyUltraSnow', enclosureId: other}, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_CANDIES'});
  });
  it('shows the palace only on a grown level 3 habitat', () => {
    expect(habitatArtFor({type: 'neige', level: 3, ultra: true}, 3)).toBe(ULTRA_SNOW_ART);
    expect(habitatArtFor({type: 'neige', level: 3}, 3)).not.toBe(ULTRA_SNOW_ART);
  });
  it('refuses an Ultra mark on another habitat in a save', () => {
    const s = game(), id = withSnowHabitat(s, 2); s.buildings.find(b => b.id === id)!.habitat = {type: 'neige', level: 2, ultra: true};
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
