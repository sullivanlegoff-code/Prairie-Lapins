import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {HOUR, NURSERY, ORDERS, SALON, FOREST, JUMP_ROPE, tripHearts, type SpeciesId} from '../src/config/balance';
import {PROGRESSION} from '../src/config/progression';
import {MISSION_CYCLE_DURATION} from '../src/config/missions';
import {cumulativeLevelXp, nextLevelCost} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {jumpRopeDay, jumpRopeReward} from '../src/simulation/jumpRope';
import {salonHeartCaresLeft} from '../src/simulation/care';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState} from '../src/state/types';
import {evolveAbove30} from './evolved';

/** The economy of the Christmas update (owner, 5 November 2026). */
function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r.state;
}
function freeCell(s: GameState) {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y};
  throw Error('No space');
}
const atLevel = (s: GameState, level: number) => { s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s; };
function salonGame(species: SpeciesId[]) {
  let s = atLevel(createGame(0), 25); s.pattes = 1_000_000;
  for (let i = 0; i < 2; i++) { const c = freeCell(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'statue', c.x, c.y)); }
  const c = freeCell(s), home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); home.habitat = {type: 'universal', level: 3};
  s.buildings.push(home);
  s = run(s, {type: 'buyBuilding', kind: 'salon', ...freeCell(s)});
  const ids = species.map(sp => { const id = `rabbit-${s.nextId++}`; s.rabbits.push({id, species: sp, affection: 20, enclosureId: home.id}); if (!s.discovered.includes(sp)) s.discovered.push(sp); return id; });
  s.rabbits.forEach(evolveAbove30);
  return {s, ids};
}

describe('Christmas update economy: unlocks and prices', () => {
  it('opens the Salon at level 22, the Forest at 25, keeps the jump rope at 20 and doubles the crops', () => {
    expect(SALON.unlockLevel).toBe(22); expect(FOREST.unlockLevel).toBe(25); expect(JUMP_ROPE.unlockLevel).toBe(20);
    expect(ORDERS.foin.cost).toBe(10); expect(ORDERS.pissenlit.cost).toBe(36); expect(ORDERS.trefle.cost).toBe(60);
  });
  it('prices the nursery cushions 40, 120 and 250 Hearts', () => {
    expect(NURSERY.unlockHearts).toEqual({1: 40, 2: 120, 3: 250});
  });
  it('slows the levels after 20 only: every level up to 20 keeps its cost', () => {
    const plain = (level: number) => Math.round(PROGRESSION.curve.base * level ** PROGRESSION.curve.exponent);
    for (let level = 1; level <= 20; level++) expect(nextLevelCost(level)).toBe(plain(level));
    expect(nextLevelCost(21)).toBe(Math.round(plain(21) * 1.25));
    expect(nextLevelCost(29)).toBe(Math.round(plain(29) * 3.25));
    expect(nextLevelCost(30)).toBeNull();
  });
});

describe('Christmas update economy: Hearts', () => {
  it('gives 1 to 5 Hearts a trip, more for a longer one', () => {
    expect([3, 4, 5, 6, 7, 8, 9, 10].map(tripHearts)).toEqual([1, 1, 2, 2, 3, 3, 4, 5]);
  });
  it('gives Hearts for the first two cares of the day only (bath and brush 1, massage 2)', () => {
    const {s, ids: [a, b, c]} = salonGame(['paille', 'neige', 'feu']);
    expect(SALON.heartCaresPerCycle).toBe(2);
    let t = run(s, {type: 'startCare', rabbitId: a, care: 'massage'});
    expect(t.care!.hearts).toBe(2);
    t = run(t, {type: 'claimCare', rabbitId: a}, 3 * HOUR); expect(t.hearts).toBe(s.hearts + 2);
    t = run(t, {type: 'startCare', rabbitId: b, care: 'bath'}, 3 * HOUR); expect(t.care!.hearts).toBe(1);
    t = run(t, {type: 'claimCare', rabbitId: b}, 4 * HOUR); expect(t.hearts).toBe(s.hearts + 3);
    expect(salonHeartCaresLeft(t, 4 * HOUR)).toBe(0);
    t = run(t, {type: 'startCare', rabbitId: c, care: 'massage'}, 4 * HOUR); expect(t.care!.hearts).toBeUndefined();
    t = run(t, {type: 'claimCare', rabbitId: c}, 7 * HOUR); expect(t.hearts).toBe(s.hearts + 3);
    // A care under way with its Hearts survives a save.
    const again = run(t, {type: 'startCare', rabbitId: a, care: 'brush'}, MISSION_CYCLE_DURATION);
    expect(again.care!.hearts).toBe(1);
    const decoded = decodeGame(encodeGame(again)); expect(decoded.ok && decoded.state.care).toEqual(again.care);
  });
  it('gives the jump-rope Hearts on the first game of the day only', () => {
    const s = atLevel(createGame(0), 20);
    expect(jumpRopeDay(s, 0)).toMatchObject({heartLeft: true, challengeLeft: true});
    expect(jumpRopeReward(s, JUMP_ROPE.heartJumps, 0).hearts).toBe(1);
    // A first game, even without a jump, uses the day's Hearts.
    s.jumpRope = {cycle: s.missions.daily.cycleIndex, rewarded: 0, best: 0};
    expect(jumpRopeDay(s, 0)).toMatchObject({heartLeft: false, challengeLeft: false, rewardedLeft: JUMP_ROPE.rewardedGamesPerCycle});
    expect(jumpRopeReward(s, 40, 0)).toMatchObject({hearts: 0, rewarded: true});
  });
});

describe('Christmas update save (v27)', () => {
  it('drops Paille’s counter, keeps nurseries at 2 cushions at most', () => {
    const s = atLevel(createGame(0), 20);
    const nursery = s.buildings.find(b => b.kind === 'nursery')!;
    const old = JSON.parse(encodeGame(s));
    old.version = 26; old.market = {cycle: 0, pattes: 3, grass: 1};
    old.buildings.find((b: {id: string}) => b.id === nursery.id).nursery.capacity = 4;
    const decoded = decodeGame(JSON.stringify(old));
    expect(decoded.ok).toBe(true); if (!decoded.ok) return;
    expect(decoded.state.version).toBe(27);
    expect('market' in decoded.state).toBe(false);
    expect(decoded.state.buildings.find(b => b.id === nursery.id)!.nursery!.capacity).toBe(2);
  });
});
