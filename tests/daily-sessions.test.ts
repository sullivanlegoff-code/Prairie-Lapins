import {describe, expect, it} from 'vitest';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {regressionStart as createGame} from './regression-start';
import {DAILY_MISSION_GAP} from '../src/config/missions';
import {HOUR, MINUTE} from '../src/config/balance';
import {availableMissionRewards, currentDailyMission, dailyOpensAt} from '../src/simulation/missions';
import type {Command, GameState} from '../src/state/types';

// Target player: three 5-minute sessions a day. The daily missions open one at a time, one per session.
const DAY = 24 * HOUR;
const run = (s: GameState, c: Command, now = s.lastSimulatedAt) => { const r = act(s, c, now, () => .9); if (!r.ok) throw Error(`${c.type}: ${r.reason}`); return r.state; };
function morning() {
  let s = createGame(0); s.grass = 100;
  s = run(s, {type: 'buyBuilding', kind: 'farm', x: 22, y: 20});
  s = run(s, {type: 'collectIncome', id: 'building-1'}, 5 * HOUR);
  return s;
}
const farm = (s: GameState) => s.buildings.filter(b => b.kind === 'farm').at(-1)!.id;
function harvest(s: GameState, recipe: 'small' | 'medium', at: number) {
  s = run(s, {type: 'startOrder', id: farm(s), recipe}, at);
  return run(s, {type: 'collectOrder', id: farm(s)}, at + (recipe === 'small' ? 5 : 30) * MINUTE);
}
describe('daily missions spread over the sessions of a day', () => {
  it('opens only the first mission and ignores the actions made for the others', () => {
    let s = morning();
    expect(currentDailyMission(s)).toBe('collect-pattes');
    s = harvest(s, 'small', s.lastSimulatedAt);
    expect(s.missions.daily.progress['collect-grass']).toBe(0);
    expect(act(s, {type: 'claimDailyMission', id: 'collect-grass', cycleStart: 0}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'NOT_READY'});
    expect(availableMissionRewards(s)).toBe(1);
  });
  it('opens the next mission four hours after the claim, then counts its progress', () => {
    let s = run(morning(), {type: 'claimDailyMission', id: 'collect-pattes', cycleStart: 0});
    const claimedAt = s.lastSimulatedAt;
    expect(currentDailyMission(s)).toBe('collect-grass'); expect(dailyOpensAt(s)).toBe(claimedAt + DAILY_MISSION_GAP);
    // Still in the same session: the harvest does not count yet.
    s = harvest(s, 'small', claimedAt);
    expect(s.missions.daily.progress['collect-grass']).toBe(0);
    s = harvest(s, 'medium', claimedAt + DAILY_MISSION_GAP);
    expect(s.missions.daily.progress['collect-grass']).toBe(60);
    s = run(s, {type: 'claimDailyMission', id: 'collect-grass', cycleStart: 0});
    expect(currentDailyMission(s)).toBe('gain-affection');
  });
  it('a new cycle restarts at the first mission, open at once, and saves keep the opening time', () => {
    let s = run(morning(), {type: 'claimDailyMission', id: 'collect-pattes', cycleStart: 0});
    const decoded = decodeGame(encodeGame(s)); expect(decoded.ok && decoded.state.missions.daily.nextAt).toBe(s.missions.daily.nextAt);
    const opening = `"nextAt": ${s.missions.daily.nextAt}`, raw = encodeGame(s);
    expect(raw).toContain(opening);
    expect(decodeGame(raw.replace(opening, `"nextAt": ${s.lastSimulatedAt + DAILY_MISSION_GAP + 1}`)).ok).toBe(false);
    s = advance(s, DAY);
    expect(s.missions.daily.nextAt).toBeUndefined(); expect(currentDailyMission(s)).toBe('collect-pattes');
  });
});
