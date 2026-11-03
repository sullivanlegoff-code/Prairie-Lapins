import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BALANCE, HOUR, JUMP_ROPE} from '../src/config/balance';
import {MISSION_CYCLE_DURATION} from '../src/config/missions';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {advanceJumpRope, airTime, halfWindow, jumpRopeDay, jumpRopeReward, ropePhase, startJumpRope, tapJumpRope} from '../src/simulation/jumpRope';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState} from '../src/state/types';

function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r;
}
function refused(s: GameState, c: Command, reason: string, now = s.lastSimulatedAt) {
  expect(act(s, c, now, () => 0)).toEqual({ok: false, state: s, reason});
}
function freeCell(s: GameState) {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y};
  throw Error('No space');
}
const atLevel = (s: GameState, level: number) => { s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s; };
/** Level 6, the terrain bought, and one paille rabbit at home in a universal enclosure. */
function setup() {
  let s = atLevel(createGame(0), JUMP_ROPE.unlockLevel); s.pattes = 10_000;
  const c = freeCell(s), home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); s.buildings.push(home);
  s = run(s, {type: 'buyBuilding', kind: 'jumprope', ...freeCell(s)}).state;
  const id = `rabbit-${s.nextId++}`; s.rabbits.push({id, species: 'paille', affection: 3, enclosureId: home.id});
  return {s, id, home: home.id};
}

describe('Terrain de corde à sauter: the building', () => {
  it('costs 1 500 pattes from player level 6, one at most, and gives no XP', () => {
    expect(BALANCE.buildings.jumprope).toEqual({price: 1500, maximum: 1});
    const low = atLevel(createGame(0), JUMP_ROPE.unlockLevel - 1); low.pattes = 10_000;
    refused(low, {type: 'buyBuilding', kind: 'jumprope', ...freeCell(low)}, 'LEVEL_REQUIRED');
    const poor = atLevel(createGame(0), JUMP_ROPE.unlockLevel); poor.pattes = 1_499;
    refused(poor, {type: 'buyBuilding', kind: 'jumprope', ...freeCell(poor)}, 'NOT_ENOUGH_PATTES');
    const rich = atLevel(createGame(0), JUMP_ROPE.unlockLevel); rich.pattes = 1_500;
    const bought = run(rich, {type: 'buyBuilding', kind: 'jumprope', ...freeCell(rich)});
    expect(bought.state.pattes).toBe(0); expect(bought.state.progression.totalXp).toBe(rich.progression.totalXp);
    refused(bought.state, {type: 'buyBuilding', kind: 'jumprope', ...freeCell(bought.state)}, 'BUILDING_LIMIT');
  });
});

describe('Terrain de corde à sauter: the game', () => {
  it('counts a tap near the pass as a jump and turns the rope faster, never below the fastest turn', () => {
    const game = startJumpRope(0);
    expect(game.nextPassAt).toBe(JUMP_ROPE.leadIn); expect(ropePhase(game, 0)).toBe(0); expect(ropePhase(game, game.nextPassAt - game.period / 2)).toBeCloseTo(0.5);
    expect(tapJumpRope(game, game.nextPassAt - halfWindow(game.period) + 1)).toBe('jump');
    expect(game.score).toBe(1); expect(game.period).toBeCloseTo(JUMP_ROPE.startPeriod * JUMP_ROPE.speedUp);
    for (let i = 0; i < 200; i++) tapJumpRope(game, game.nextPassAt);
    expect(game.score).toBe(201); expect(game.period).toBe(JUMP_ROPE.minPeriod); expect(game.misses).toBe(0);
  });
  it('makes a tap far from the rope a miss, and a pass with no tap a miss; three misses end the game', () => {
    const game = startJumpRope(0);
    expect(tapJumpRope(game, 10)).toBe('miss'); expect(game.misses).toBe(1);
    // The missed pass is consumed: the next target is the following one.
    expect(game.nextPassAt).toBe(JUMP_ROPE.leadIn + JUMP_ROPE.startPeriod);
    expect(advanceJumpRope(game, game.nextPassAt + halfWindow(game.period) + 1)).toBe(1); expect(game.misses).toBe(2);
    expect(game.over).toBe(false);
    advanceJumpRope(game, game.nextPassAt + halfWindow(game.period) + 1);
    expect(game.misses).toBe(JUMP_ROPE.lives); expect(game.over).toBe(true);
    expect(tapJumpRope(game, game.nextPassAt)).toBe('ignored'); expect(game.score).toBe(0);
  });
  it('ignores a double tap while the rabbit is still in the air', () => {
    const game = startJumpRope(0), at = game.nextPassAt;
    expect(tapJumpRope(game, at)).toBe('jump');
    expect(tapJumpRope(game, at + airTime(game.period) - 1)).toBe('ignored');
    expect(game.misses).toBe(0); expect(game.score).toBe(1);
  });
  it('keeps the tap window fair at the fastest turn', () => {
    expect(halfWindow(JUMP_ROPE.startPeriod)).toBeCloseTo(JUMP_ROPE.startPeriod * JUMP_ROPE.windowShare);
    expect(halfWindow(JUMP_ROPE.minPeriod)).toBeGreaterThanOrEqual(JUMP_ROPE.minWindow);
  });
});

describe('Terrain de corde à sauter: rewards and the daily limit', () => {
  it('pays 2 pattes a jump, 60 at most, for the first three games of the day with a jump; then nothing until the next cycle', () => {
    let {s, id} = setup();
    expect(jumpRopeReward(s, 0, s.lastSimulatedAt)).toEqual({pattes: 0, hearts: 0, rewarded: false});
    const blank = run(s, {type: 'rewardJumpRope', rabbitId: id, score: 0});
    expect(blank.state.pattes).toBe(s.pattes); expect(jumpRopeDay(blank.state, s.lastSimulatedAt).rewardedLeft).toBe(3); // No jump: the slot is kept.
    s = blank.state;
    const paid: number[] = [];
    for (const score of [12, 100, 5, 20]) { const before = s.pattes, r = run(s, {type: 'rewardJumpRope', rabbitId: id, score}); paid.push(r.state.pattes - before); expect(r.value).toBe(paid.at(-1)); s = r.state; }
    expect(paid).toEqual([24, JUMP_ROPE.maxPattes, 10, 0]);
    expect(jumpRopeDay(s, s.lastSimulatedAt)).toEqual({rewardedLeft: 0, heartLeft: false});
    expect(s.jumpRope?.best).toBe(100);
    // The next daily cycle opens three rewarded games again; the record stays.
    const tomorrow = s.lastSimulatedAt + MISSION_CYCLE_DURATION, next = run(s, {type: 'rewardJumpRope', rabbitId: id, score: 8}, tomorrow);
    expect(next.state.pattes - s.pattes).toBe(16); expect(next.state.jumpRope).toEqual({cycle: next.state.missions.daily.cycleIndex, rewarded: 1, best: 100});
  });
  it('gives one Heart a day, for the first game reaching 30 jumps, even after the rewarded games', () => {
    let {s, id} = setup(); const hearts = s.hearts;
    for (const score of [29, 1, 2]) s = run(s, {type: 'rewardJumpRope', rabbitId: id, score}).state;
    expect(s.hearts).toBe(hearts);
    const won = run(s, {type: 'rewardJumpRope', rabbitId: id, score: JUMP_ROPE.heartJumps});
    expect(won.jumpRopeReward).toEqual({pattes: 0, hearts: 1, rewarded: false}); expect(won.state.hearts).toBe(hearts + 1);
    expect(run(won.state, {type: 'rewardJumpRope', rabbitId: id, score: 50}).state.hearts).toBe(hearts + 1);
  });
  it('caps a day at 180 pattes and one Heart, and never gives XP or affection', () => {
    let {s, id} = setup(); const start = {pattes: s.pattes, hearts: s.hearts, xp: s.progression.totalXp, affection: s.rabbits[0].affection};
    for (let i = 0; i < 10; i++) s = run(s, {type: 'rewardJumpRope', rabbitId: id, score: JUMP_ROPE.maxScore}).state;
    expect(s.pattes - start.pattes).toBe(JUMP_ROPE.rewardedGamesPerCycle * JUMP_ROPE.maxPattes);
    expect(s.pattes - start.pattes).toBe(180); expect(s.hearts - start.hearts).toBe(1);
    expect(s.progression.totalXp).toBe(start.xp); expect(s.rabbits[0].affection).toBe(start.affection);
  });
  it('refuses without the terrain, an impossible score, or a rabbit away from home', () => {
    const {s, id} = setup();
    const bare = structuredClone(s); bare.buildings = bare.buildings.filter(b => b.kind !== 'jumprope');
    refused(bare, {type: 'rewardJumpRope', rabbitId: id, score: 3}, 'MISSING_BUILDING');
    for (const score of [-1, 1.5, JUMP_ROPE.maxScore + 1, Number.NaN]) refused(s, {type: 'rewardJumpRope', rabbitId: id, score}, 'INVALID_CHOICE');
    refused(s, {type: 'rewardJumpRope', rabbitId: 'rabbit-404', score: 3}, 'NOT_FOUND');
    const away = structuredClone(s); away.buildings.push(emptyBuilding('building-900', 'agency', freeCell(away).x, freeCell(away).y));
    away.travel = {welcomed: true, trips: [{rabbitId: id, destination: 'Paris', startedAt: s.lastSimulatedAt, endsAt: s.lastSimulatedAt + 3 * HOUR, hearts: 1}]};
    refused(away, {type: 'rewardJumpRope', rabbitId: id, score: 3}, 'TRAVELING');
  });
});

describe('Terrain de corde à sauter: the save', () => {
  it('keeps the day and the record through a save, and refuses a future or impossible day', () => {
    const {s, id} = setup(), played = run(s, {type: 'rewardJumpRope', rabbitId: id, score: 31}).state;
    const decoded = decodeGame(encodeGame(played));
    expect(decoded.ok && decoded.state.jumpRope).toEqual({cycle: played.missions.daily.cycleIndex, rewarded: 1, heart: true, best: 31});
    expect(decoded.ok && decoded.state.buildings.some(b => b.kind === 'jumprope')).toBe(true);
    const future = structuredClone(played); future.jumpRope!.cycle = played.missions.daily.cycleIndex + 1;
    expect(decodeGame(JSON.stringify({...JSON.parse(encodeGame(played)), jumpRope: future.jumpRope}))).toMatchObject({ok: false});
    expect(decodeGame(JSON.stringify({...JSON.parse(encodeGame(played)), jumpRope: {cycle: 0, rewarded: 4, best: 3}}))).toMatchObject({ok: false});
  });
  it('reads a v23 save written before the terrain existed', () => {
    const {s} = setup(), old = JSON.parse(encodeGame(s)); delete old.jumpRope;
    old.buildings = old.buildings.filter((b: {kind: string}) => b.kind !== 'jumprope');
    const decoded = decodeGame(JSON.stringify(old));
    expect(decoded.ok).toBe(true); expect(decoded.ok && decoded.state.jumpRope).toBeUndefined();
  });
});
