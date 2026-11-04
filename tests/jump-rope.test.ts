import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {HOUR, JUMP_ROPE} from '../src/config/balance';
import {MISSION_CYCLE_DURATION} from '../src/config/missions';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {advanceJumpRope, airTime, halfWindow, jumpRopeChallenge, jumpRopeDay, jumpRopeMedals, jumpRopeReward, meetsJumpRopeChallenge, ropePhase, rememberedJumpRopeTeam, startJumpRope, tapJumpRope} from '../src/simulation/jumpRope';
import {SPECIES} from '../src/config/balance';
import {visibleMainMissions, mainProgress} from '../src/simulation/missions';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState, JumpRopeTeam} from '../src/state/types';

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
/** Level 20, the islet bought, and three paille rabbits at home in a universal enclosure. */
function setup() {
  let s = atLevel(createGame(0), JUMP_ROPE.unlockLevel); s.pattes = 100_000;
  const c = freeCell(s), home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); s.buildings.push(home);
  s = run(s, {type: 'buyJumpIsland'}).state;
  const ids = [0, 1, 2].map(() => { const id = `rabbit-${s.nextId++}`; s.rabbits.push({id, species: 'paille', affection: 3, enclosureId: home.id}); return id; });
  const team: JumpRopeTeam = {carriers: [ids[0], ids[1]], athlete: ids[2]};
  return {s, team, ids, home: home.id};
}

describe('Jump-rope islet: the building', () => {
  it('costs 75 000 pattes from player level 20, once, off the land grid, and gives no XP', () => {
    expect(JUMP_ROPE).toMatchObject({price: 75_000, unlockLevel: 20, lives: 1});
    const low = atLevel(createGame(0), JUMP_ROPE.unlockLevel - 1); low.pattes = 100_000;
    refused(low, {type: 'buyJumpIsland'}, 'LEVEL_REQUIRED');
    const poor = atLevel(createGame(0), JUMP_ROPE.unlockLevel); poor.pattes = 74_999;
    refused(poor, {type: 'buyJumpIsland'}, 'NOT_ENOUGH_PATTES');
    const rich = atLevel(createGame(0), JUMP_ROPE.unlockLevel); rich.pattes = 75_000;
    const bought = run(rich, {type: 'buyJumpIsland'});
    expect(bought.state.pattes).toBe(0); expect(bought.state.jumpIsland).toBe(true);
    expect(bought.state.buildings).toEqual(rich.buildings); expect(bought.state.progression.totalXp).toBe(rich.progression.totalXp);
    bought.state.pattes = 100_000; refused(bought.state, {type: 'buyJumpIsland'}, 'BUILDING_LIMIT');
  });
});

describe('Jump-rope islet: the game', () => {
  it('counts a tap near the pass as a jump and turns the rope faster, never below the fastest turn', () => {
    const game = startJumpRope(0);
    expect(game.nextPassAt).toBe(JUMP_ROPE.leadIn); expect(ropePhase(game, 0)).toBe(0); expect(ropePhase(game, game.nextPassAt - game.period / 2)).toBeCloseTo(0.5);
    expect(tapJumpRope(game, game.nextPassAt - halfWindow(game.period) + 1)).toBe('jump');
    expect(game.score).toBe(1); expect(game.period).toBeCloseTo(JUMP_ROPE.startPeriod * JUMP_ROPE.speedUp);
    for (let i = 0; i < 200; i++) tapJumpRope(game, game.nextPassAt);
    expect(game.score).toBe(201); expect(game.period).toBe(JUMP_ROPE.minPeriod); expect(game.misses).toBe(0);
  });
  it('calls a precise tap « parfait » and counts the streak, which a merely good jump breaks', () => {
    const game = startJumpRope(0);
    expect(tapJumpRope(game, game.nextPassAt)).toBe('perfect'); expect(tapJumpRope(game, game.nextPassAt + 1)).toBe('perfect'); expect(game.combo).toBe(2);
    expect(tapJumpRope(game, game.nextPassAt + halfWindow(game.period) - 1)).toBe('jump'); expect(game.combo).toBe(0); expect(game.score).toBe(3);
  });
  it('ends the game at the first miss: a tap far from the rope, or a pass with no tap', () => {
    const early = startJumpRope(0);
    expect(tapJumpRope(early, 10)).toBe('miss'); expect(early.misses).toBe(1); expect(early.over).toBe(true);
    expect(tapJumpRope(early, early.nextPassAt)).toBe('ignored'); expect(early.score).toBe(0);
    const late = startJumpRope(0); tapJumpRope(late, late.nextPassAt);
    expect(advanceJumpRope(late, late.nextPassAt + halfWindow(late.period) + 1)).toBe(1);
    expect(late.over).toBe(true); expect(late.score).toBe(1);
  });
  it('ignores a double tap while the rabbit is still in the air', () => {
    const game = startJumpRope(0), at = game.nextPassAt;
    expect(tapJumpRope(game, at)).toBe('perfect');
    expect(tapJumpRope(game, at + airTime(game.period) - 1)).toBe('ignored');
    expect(game.misses).toBe(0); expect(game.score).toBe(1);
  });
  it('keeps the tap window fair at the fastest turn', () => {
    expect(halfWindow(JUMP_ROPE.startPeriod)).toBeCloseTo(JUMP_ROPE.startPeriod * JUMP_ROPE.windowShare);
    expect(halfWindow(JUMP_ROPE.minPeriod)).toBeGreaterThanOrEqual(JUMP_ROPE.minWindow);
  });
});

describe('Jump-rope islet: rewards, the daily limit and the trio', () => {
  it('pays 2 pattes a jump, 60 at most, for the first three games of the day with a jump; then nothing until the next cycle', () => {
    let {s, team} = setup();
    expect(jumpRopeReward(s, 0, s.lastSimulatedAt)).toEqual({pattes: 0, hearts: 0, rewarded: false});
    const blank = run(s, {type: 'rewardJumpRope', team, score: 0});
    expect(blank.state.pattes).toBe(s.pattes); expect(jumpRopeDay(blank.state, s.lastSimulatedAt).rewardedLeft).toBe(3); // No jump: the slot is kept.
    s = blank.state;
    const paid: number[] = [];
    for (const score of [12, 100, 5, 20]) { const before = s.pattes, r = run(s, {type: 'rewardJumpRope', team, score}); paid.push(r.state.pattes - before); expect(r.value).toBe(paid.at(-1)); s = r.state; }
    expect(paid).toEqual([24, JUMP_ROPE.maxPattes, 10, 0]);
    expect(jumpRopeDay(s, s.lastSimulatedAt)).toMatchObject({rewardedLeft: 0, heartLeft: false});
    expect(s.jumpRope?.best).toBe(100);
    // The next daily cycle opens three rewarded games again; the record stays.
    const tomorrow = s.lastSimulatedAt + MISSION_CYCLE_DURATION, next = run(s, {type: 'rewardJumpRope', team, score: 8}, tomorrow);
    expect(next.state.pattes - s.pattes).toBe(16); expect(next.state.jumpRope).toMatchObject({cycle: next.state.missions.daily.cycleIndex, rewarded: 1, best: 100, team}); expect(next.state.jumpRope?.heart).toBeUndefined();
  });
  it('gives one Heart a day, for the first game reaching 30 jumps, even after the rewarded games', () => {
    let {s, team} = setup(); const hearts = s.hearts + JUMP_ROPE.challenge.hearts; // The 29 jumps also win the challenge of the day.
    for (const score of [29, 1, 2]) s = run(s, {type: 'rewardJumpRope', team, score}).state;
    expect(s.hearts).toBe(hearts);
    const won = run(s, {type: 'rewardJumpRope', team, score: JUMP_ROPE.heartJumps});
    expect(won.jumpRopeReward).toEqual({pattes: 0, hearts: 1, rewarded: false}); expect(won.state.hearts).toBe(hearts + 1);
    expect(run(won.state, {type: 'rewardJumpRope', team, score: 50}).state.hearts).toBe(hearts + 1);
  });
  it('caps a day at 180 pattes, one Heart and the challenge Hearts, and never gives XP or affection', () => {
    let {s, team} = setup(); const start = {pattes: s.pattes, hearts: s.hearts, xp: s.progression.totalXp, affection: s.rabbits.map(r => r.affection)};
    for (let i = 0; i < 10; i++) s = run(s, {type: 'rewardJumpRope', team, score: JUMP_ROPE.maxScore}).state;
    expect(s.pattes - start.pattes).toBe(180); expect(s.hearts - start.hearts).toBe(1 + JUMP_ROPE.challenge.hearts);
    expect(s.progression.totalXp).toBe(start.xp); expect(s.rabbits.map(r => r.affection)).toEqual(start.affection);
  });
  it('remembers the last trio, and forgets it while one of its rabbits is away', () => {
    const {s, team} = setup(), played = run(s, {type: 'rewardJumpRope', team, score: 4}).state;
    expect(rememberedJumpRopeTeam(played)).toEqual(team);
    const away = structuredClone(played); away.buildings.push(emptyBuilding('building-900', 'agency', freeCell(away).x, freeCell(away).y));
    away.travel = {welcomed: true, trips: [{rabbitId: team.athlete, destination: 'Paris', startedAt: s.lastSimulatedAt, endsAt: s.lastSimulatedAt + 3 * HOUR, hearts: 1}]};
    expect(rememberedJumpRopeTeam(away)).toBeNull();
  });
  it('refuses without the islet, an impossible score, the same rabbit twice, or a rabbit away from home', () => {
    const {s, team, ids} = setup();
    const bare = structuredClone(s); delete bare.jumpIsland;
    refused(bare, {type: 'rewardJumpRope', team, score: 3}, 'MISSING_BUILDING');
    for (const score of [-1, 1.5, JUMP_ROPE.maxScore + 1, Number.NaN]) refused(s, {type: 'rewardJumpRope', team, score}, 'INVALID_CHOICE');
    refused(s, {type: 'rewardJumpRope', team: {carriers: [ids[0], ids[0]], athlete: ids[2]}, score: 3}, 'INVALID_CHOICE');
    refused(s, {type: 'rewardJumpRope', team: {carriers: [ids[0], ids[1]], athlete: 'rabbit-404'}, score: 3}, 'NOT_FOUND');
    const away = structuredClone(s); away.buildings.push(emptyBuilding('building-900', 'agency', freeCell(away).x, freeCell(away).y));
    away.travel = {welcomed: true, trips: [{rabbitId: ids[1], destination: 'Paris', startedAt: s.lastSimulatedAt, endsAt: s.lastSimulatedAt + 3 * HOUR, hearts: 1}]};
    refused(away, {type: 'rewardJumpRope', team, score: 3}, 'TRAVELING');
  });
});

describe('Jump-rope islet: challenge of the day, medals, athlete records and the mission', () => {
  it('draws the same challenge for the same day, changes it over the days, and never asks for a type the player lacks', () => {
    const {s} = setup(), day = MISSION_CYCLE_DURATION, seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const at = s.lastSimulatedAt + i * day, c = jumpRopeChallenge(s, at);
      expect(jumpRopeChallenge(structuredClone(s), at)).toEqual(c); // Deterministic: the cycle alone decides.
      expect(JUMP_ROPE.challenge.jumps).toContain(c.jumps); expect(c.type === null || c.type === 'paille').toBe(true); // Only paille rabbits here.
      seen.add(JSON.stringify(c));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
  it('pays the challenge Hearts once a day, on top of the other rewards, only when the athlete meets it', () => {
    let {s, team} = setup(); const c = jumpRopeChallenge(s, s.lastSimulatedAt), hearts = s.hearts;
    expect(meetsJumpRopeChallenge(s, c, team.athlete, c.jumps - 1)).toBe(false);
    const missed = run(s, {type: 'rewardJumpRope', team, score: c.jumps - 1});
    expect(missed.jumpRopeReward?.challenge).toBeUndefined(); expect(missed.state.hearts).toBe(hearts); s = missed.state;
    const won = run(s, {type: 'rewardJumpRope', team, score: c.jumps});
    expect(won.jumpRopeReward).toMatchObject({challenge: true, hearts: JUMP_ROPE.challenge.hearts}); expect(won.state.hearts).toBe(hearts + JUMP_ROPE.challenge.hearts);
    expect(jumpRopeDay(won.state, s.lastSimulatedAt).challengeLeft).toBe(false); expect(jumpRopeDay(won.state, s.lastSimulatedAt).heartLeft).toBe(true);
    const again = run(won.state, {type: 'rewardJumpRope', team, score: c.jumps});
    expect(again.state.hearts).toBe(won.state.hearts);
    const tomorrow = s.lastSimulatedAt + MISSION_CYCLE_DURATION, next = jumpRopeChallenge(again.state, tomorrow);
    expect(jumpRopeDay(again.state, tomorrow).challengeLeft).toBe(true);
    expect(run(again.state, {type: 'rewardJumpRope', team, score: next.jumps}, tomorrow).jumpRopeReward?.challenge).toBe(true);
  });
  it('asks the athlete to be of the drawn type', () => {
    const {s, ids} = setup(); s.rabbits.find(r => r.id === ids[0])!.species = 'feu'; s.discovered.push('feu');
    const typed = Array.from({length: 40}, (_, i) => s.lastSimulatedAt + i * MISSION_CYCLE_DURATION).map(at => jumpRopeChallenge(s, at)).find(c => c.type === 'feu')!;
    expect(typed).toBeDefined(); expect(SPECIES.feu.types).toContain('feu');
    expect(meetsJumpRopeChallenge(s, typed, ids[2], typed.jumps)).toBe(false); // A paille athlete.
    expect(meetsJumpRopeChallenge(s, typed, ids[0], typed.jumps)).toBe(true);
  });
  it('hangs a medal for each record step, and keeps each athlete’s own best', () => {
    let {s, team, ids} = setup(); expect(jumpRopeMedals(s)).toEqual([]);
    s = run(s, {type: 'rewardJumpRope', team, score: 26}).state; expect(jumpRopeMedals(s)).toEqual([10, 25]);
    s = run(s, {type: 'rewardJumpRope', team: {carriers: [ids[2], ids[1]], athlete: ids[0]}, score: 12}).state;
    s = run(s, {type: 'rewardJumpRope', team, score: 7}).state;
    expect(s.jumpRope?.athleteBest).toEqual({[ids[2]]: 26, [ids[0]]: 12}); expect(s.jumpRope?.best).toBe(26);
    s.jumpRope!.best = 100; expect(jumpRopeMedals(s)).toEqual([10, 25, 50, 100]);
    // A rabbit that has left the meadow loses its line when the save is read.
    const gone = structuredClone(s); gone.rabbits = gone.rabbits.filter(r => r.id !== ids[0]); gone.jumpRope!.team = undefined;
    const decoded = decodeGame(encodeGame(gone)); expect(decoded.ok && decoded.state.jumpRope?.athleteBest).toEqual({[ids[2]]: 26});
  });
  it('shows the « Premiers sauts » mission once the islet is bought, done after the first game', () => {
    const before = atLevel(createGame(0), JUMP_ROPE.unlockLevel);
    expect(visibleMainMissions(before)).not.toContain('first-jump-rope');
    const {s, team} = setup();
    expect(visibleMainMissions(s)).toContain('first-jump-rope'); expect(mainProgress(s, 'first-jump-rope')).toEqual({value: 0, target: 1});
    const played = run(s, {type: 'rewardJumpRope', team, score: 0}).state;
    expect(played.missions.completed).toContain('first-jump-rope');
  });
});

describe('Jump-rope islet: the save', () => {
  it('keeps the islet, the day, the record and the trio through a save, and refuses a future or impossible day', () => {
    const {s, team} = setup(), played = run(s, {type: 'rewardJumpRope', team, score: 31}).state;
    const decoded = decodeGame(encodeGame(played));
    expect(decoded.ok && decoded.state.jumpRope).toEqual({cycle: played.missions.daily.cycleIndex, rewarded: 1, heart: true, challenge: true, best: 31, team, athleteBest: {[team.athlete]: 31}});
    expect(decoded.ok && decoded.state.jumpIsland).toBe(true);
    const future = structuredClone(played); future.jumpRope!.cycle = played.missions.daily.cycleIndex + 1;
    expect(decodeGame(JSON.stringify({...JSON.parse(encodeGame(played)), jumpRope: future.jumpRope}))).toMatchObject({ok: false});
    expect(decodeGame(JSON.stringify({...JSON.parse(encodeGame(played)), jumpRope: {cycle: 0, rewarded: 4, best: 3}}))).toMatchObject({ok: false});
  });
  it('reads a v23 save written before the islet existed', () => {
    const {s} = setup(), old = JSON.parse(encodeGame(s)); delete old.jumpRope; delete old.jumpIsland;
    const decoded = decodeGame(JSON.stringify(old));
    expect(decoded.ok).toBe(true); expect(decoded.ok && decoded.state.jumpRope).toBeUndefined(); expect(decoded.ok && decoded.state.jumpIsland).toBeUndefined();
  });
  it('moves a test save’s old 1 500-pattes kiosk onto the islet for free, keeping the record and freeing its cells', () => {
    const {s, home} = setup(), old = JSON.parse(encodeGame(s)); delete old.jumpIsland;
    old.jumpRope = {cycle: s.missions.daily.cycleIndex, rewarded: 2, best: 17};
    const c = freeCell(s); old.buildings.push({...emptyBuilding('building-950', 'farm', c.x, c.y), kind: 'jumprope'});
    const decoded = decodeGame(JSON.stringify(old));
    expect(decoded.ok).toBe(true); if (!decoded.ok) return;
    expect(decoded.state.jumpIsland).toBe(true); expect(decoded.state.pattes).toBe(s.pattes);
    expect(decoded.state.buildings.map(b => b.id)).toEqual(s.buildings.map(b => b.id)); expect(decoded.state.buildings.some(b => b.id === home)).toBe(true);
    expect(decoded.state.jumpRope).toEqual({cycle: s.missions.daily.cycleIndex, rewarded: 2, best: 17});
    expect(buildingPlacementReason(decoded.state, c.x, c.y)).toBeNull();
  });
});
