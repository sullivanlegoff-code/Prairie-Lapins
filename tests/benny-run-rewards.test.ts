import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BALANCE, BENNY_LAIR} from '../src/config/balance';
import {MISSION_CYCLE_DURATION} from '../src/config/missions';
import {BENNY_RUN} from '../src/simulation/bennyRun';
import {bennyRunDay, bennyRunReward} from '../src/simulation/bennyRunRewards';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {SAVE_VERSION} from '../src/persistence/json';
import type {GameState} from '../src/state/types';

/** A player who may play « Cours cours Benny ! »: the Antre du dragon built, Benny on the island. */
function game(): GameState {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(BENNY_LAIR.unlockLevel), rewardedThroughLevel: BENNY_LAIR.unlockLevel}; s.pattes = 100_000;
  s.rabbits.push({id: `rabbit-${s.nextId++}`, species: 'benny', affection: 5, enclosureId: s.buildings.find(b => b.kind === 'enclosure')!.id}); s.discovered.push('benny');
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const r = act(s, {type: 'buyBuilding', kind: 'lair', x, y}, s.lastSimulatedAt); if (r.ok) return r.state; }
  throw Error('no place for the lair');
}
/** One finished run paying `coins`, at `now`. */
function finish(s: GameState, coins: number, now: number = s.lastSimulatedAt, hearts = 0) {
  const r = act(s, {type: 'finishBennyRun', score: 1000, metres: 500, coins, hearts}, now); if (!r.ok) throw Error(r.reason); return r;
}

describe('the coins of « Cours cours Benny ! » are pattes', () => {
  it('pays one patte per coin of the run', () => {
    const s = game(); const before = s.pattes; const r = finish(s, 40);
    expect(r.state.pattes).toBe(before + 40); expect(r.value).toBe(40);
    expect(r.state.progression.totalXp).toBe(s.progression.totalXp);
  });
  it('pays at most maxPattes a run', () => {
    const s = game(); const r = finish(s, BENNY_RUN.maxPattes + 200);
    expect(r.state.pattes).toBe(s.pattes + BENNY_RUN.maxPattes); expect(r.value).toBe(BENNY_RUN.maxPattes);
  });
  it('pays for the first rewardedRunsPerCycle runs of the day, then keeps only the record', () => {
    let s = game(); const start = s.pattes;
    for (let i = 0; i < BENNY_RUN.rewardedRunsPerCycle; i++) s = finish(s, 10).state;
    expect(s.pattes).toBe(start + 10 * BENNY_RUN.rewardedRunsPerCycle);
    const extra = finish(s, 100); expect(extra.state.pattes).toBe(s.pattes); expect(extra.value).toBe(0);
    expect(extra.state.bennyRun?.best).toBe(1000); expect(extra.state.bennyRun?.day).toEqual({cycle: expect.any(Number), rewarded: BENNY_RUN.rewardedRunsPerCycle, hearts: 0});
  });
  it('starts again the next day', () => {
    let s = game();
    for (let i = 0; i < BENNY_RUN.rewardedRunsPerCycle; i++) s = finish(s, 10).state;
    const tomorrow = s.lastSimulatedAt + MISSION_CYCLE_DURATION;
    expect(bennyRunDay(s, tomorrow).rewardedLeft).toBe(BENNY_RUN.rewardedRunsPerCycle);
    const next = finish(s, 25, tomorrow); expect(next.value).toBe(25); expect(next.state.bennyRun?.day?.rewarded).toBe(1);
  });
  it('pays nothing for a run without coins', () => {
    const s = game(); const r = finish(s, 0); expect(r.state.pattes).toBe(s.pattes); expect(r.state.bennyRun?.day).toBeUndefined();
  });
  it('refuses coins a run cannot have', () => {
    const s = game();
    expect(act(s, {type: 'finishBennyRun', score: 1, metres: 1, coins: BENNY_RUN.maxCoins + 1}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    expect(act(s, {type: 'finishBennyRun', score: 1, metres: 1, coins: -1}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    expect(act(s, {type: 'finishBennyRun', score: 1, metres: 1, coins: 1.5}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
  });
  it('needs the lair and Benny, as before', () => {
    const s = createGame(0); s.pattes = 0;
    expect(act(s, {type: 'finishBennyRun', score: 1, metres: 1, coins: 5}, 0)).toMatchObject({ok: false, reason: 'NOT_FOUND'});
  });
  it('saves the day, and refuses a day from a future cycle', () => {
    const s = game(); const done = finish(s, 30).state;
    const decoded = decodeGame(encodeGame(done)); expect(decoded.ok && decoded.state.bennyRun?.day).toEqual(done.bennyRun?.day);
    const raw = JSON.parse(encodeGame(done)); expect(raw.version).toBe(SAVE_VERSION);
    const future = JSON.parse(encodeGame(done)); future.bennyRun.day.cycle = 999999;
    expect(decodeGame(JSON.stringify(future)).ok).toBe(false);
  });
  it('pays the Hearts won on the road, at most maxHeartsPerRun a run and heartsPerCycle a day', () => {
    let s = game(); const hearts = s.hearts;
    s = finish(s, 5, s.lastSimulatedAt, BENNY_RUN.maxHeartsPerRun).state;
    expect(s.hearts).toBe(hearts + BENNY_RUN.maxHeartsPerRun);
    // The day's Hearts are used up in the second run if it takes more than what is left.
    s = finish(s, 5, s.lastSimulatedAt, BENNY_RUN.maxHeartsPerRun).state;
    expect(s.hearts).toBe(hearts + BENNY_RUN.heartsPerCycle); expect(s.bennyRun?.day?.hearts).toBe(BENNY_RUN.heartsPerCycle);
    s = finish(s, 5, s.lastSimulatedAt, 1).state;
    expect(s.hearts).toBe(hearts + BENNY_RUN.heartsPerCycle);
  });
  it('refuses more Hearts in a run than the road can give', () => {
    const s = game();
    expect(act(s, {type: 'finishBennyRun', score: 1, metres: 1, hearts: BENNY_RUN.maxHeartsPerRun + 1}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
  });
  it('counts whole coins only, from the rules', () => {
    const s = game();
    expect(bennyRunReward(s, 12.9, 0, s.lastSimulatedAt)).toEqual({pattes: 12, hearts: 0, rewarded: true});
    expect(BALANCE.buildings.lair.price).toBe(100_000);
  });
});
