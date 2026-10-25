import {describe, expect, it} from 'vitest';
import {regressionStart as createGame} from './regression-start';
import {stateBaby, welcomeOf} from './nursery-baby';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {BALANCE, HOUR, MINUTE, growthDuration} from '../src/config/balance';
import {INITIAL_MISSION_IDS} from '../src/config/missions';
import type {Command, GameState} from '../src/state/types';

// Playtest of 25 October 2026 (three 5-minute sessions a day): a birth started in one session must be ready to welcome
// at the next one, so the finished breeding joins a free nursery cushion by itself and grows during the absence.
const run = (s: GameState, c: Command, now = s.lastSimulatedAt) => { const r = act(s, c, now, () => .9); if (!r.ok) throw Error(`${c.type}: ${r.reason}`); return r.state; };
const nest = (s: GameState) => s.buildings.find(b => b.kind === 'nest')!;
function prepared(learned: boolean) {
  let s = createGame(0); s.pattes = 5000; s.grass = 1000;
  for (const [kind, x, y] of [['nest', 26, 20], ['nursery', 18, 24]] as const) s = run(s, {type: 'placeStarterBuilding', kind, x, y});
  for (const id of ['rabbit-2', 'rabbit-3']) s = run(s, {type: 'feed', id});
  if (learned) { s.missions.completed = [...new Set([...s.missions.completed, ...INITIAL_MISSION_IDS])]; s.missions.claimed = [...INITIAL_MISSION_IDS]; }
  return s;
}
describe('nest and nursery rhythm', () => {
  it('keeps the manual transfer while the player has not learned it', () => {
    let s = run(prepared(false), {type: 'breed', parents: ['rabbit-2', 'rabbit-3']});
    s = advance(s, s.lastSimulatedAt + 5 * HOUR);
    expect(nest(s).breeding).not.toBeNull(); expect(stateBaby(s)).toBeNull();
  });
  it('moves a finished birth to the nursery at the end of breeding, ready for the next session', () => {
    let s = prepared(true); const morning = s.lastSimulatedAt;
    s = run(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']});
    const birth = nest(s).breeding!.birth;
    s = advance(s, morning + 5 * HOUR);
    expect(nest(s).breeding).toBeNull();
    const baby = stateBaby(s)!;
    expect(baby).toMatchObject({birth, startedAt: morning + BALANCE.breedingDuration, readyAt: morning + BALANCE.breedingDuration + growthDuration(birth.species)});
    // Next session: welcome the baby and start another birth at once.
    s = run(s, welcomeOf(s, 'building-1'));
    s = run(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']});
    expect(nest(s).breeding).not.toBeNull();
    const decoded = decodeGame(encodeGame(s)); expect(decoded.ok).toBe(true);
  });
  it('a birth waiting for a full nursery joins it as soon as a welcome frees the cushion, and grows from then', () => {
    let s = run(prepared(true), {type: 'breed', parents: ['rabbit-2', 'rabbit-3']});
    s = advance(s, s.lastSimulatedAt + HOUR);
    s = run(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']});
    const waiting = nest(s).breeding!.birth;
    s = advance(s, s.lastSimulatedAt + 5 * HOUR);
    expect(nest(s).breeding?.birth).toEqual(waiting);
    const freedAt = s.lastSimulatedAt + 10 * MINUTE;
    s = run(s, welcomeOf(s, 'building-1'), freedAt);
    expect(nest(s).breeding).toBeNull();
    expect(stateBaby(s)).toMatchObject({birth: waiting, startedAt: freedAt, readyAt: freedAt + growthDuration(waiting.species)});
    expect(decodeGame(encodeGame(s)).ok).toBe(true);
  });
});
