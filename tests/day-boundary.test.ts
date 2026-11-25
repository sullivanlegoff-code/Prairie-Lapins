import {describe, expect, it} from 'vitest';
import {HOUR} from '../src/config/balance';
import {createGame} from '../src/state/initial';
import {advance} from '../src/simulation/time';
import {cycleIndexAt, dailyCycleEnd} from '../src/simulation/missions';
import {gameDay, nextDayStart} from '../src/simulation/dayBoundary';
import {decodeGame, encodeGame} from '../src/persistence/json';

// Local times, whatever the machine's time zone: the day changes at 4 a.m. on the player's own clock (decision D4).
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();

describe('the day changes at 4 a.m.', () => {
  it('counts the night with the day before, also across summer time', () => {
    expect(gameDay(at(24, 3, 59))).toBe(gameDay(at(23, 4)));
    expect(gameDay(at(24, 4))).toBe(gameDay(at(23, 4)) + 1);
    expect(nextDayStart(at(23, 15))).toBe(at(24, 4));
    expect(nextDayStart(at(24, 3))).toBe(at(24, 4));
    expect(nextDayStart(at(24, 4))).toBe(at(25, 4));
    // The nights the clocks change (Europe, 2026): still 4 a.m. the next morning.
    expect(nextDayStart(new Date(2026, 2, 28, 22).getTime())).toBe(new Date(2026, 2, 29, 4).getTime());
    expect(nextDayStart(new Date(2026, 9, 24, 22).getTime())).toBe(new Date(2026, 9, 25, 4).getTime());
  });

  it('a new game\'s first day ends at the next 4 a.m., then each day lasts until the following one', () => {
    const s = createGame(at(23, 15));
    expect(dailyCycleEnd(s)).toBe(at(24, 4));
    const night = advance(s, at(24, 3, 59));
    expect(night.missions.daily.cycleIndex).toBe(0);
    const morning = advance(night, at(24, 4));
    expect(morning.missions.daily.cycleIndex).toBe(1);
    expect(dailyCycleEnd(morning)).toBe(at(25, 4));
    // Three nights away: three more days, and the cycle ends at the next 4 a.m.
    const back = advance(morning, at(27, 10));
    expect(back.missions.daily.cycleIndex).toBe(4);
    expect(dailyCycleEnd(back)).toBe(at(28, 4));
    expect(cycleIndexAt(back.missions.daily, at(28, 4))).toBe(5);
  });

  /** A v29 save, as the published game writes it: cycles of 24 hours from the start of the game, no end stored. */
  function v29Save(start: number, now: number) {
    const raw = JSON.parse(encodeGame(createGame(start)));
    raw.version = 29; delete raw.missions.daily.endsAt; raw.lastSimulatedAt = now;
    raw.missions.daily.cycleIndex = Math.floor((now - start) / (24 * HOUR));
    return raw;
  }

  it('an old save keeps its day: it ends at the first 4 a.m. not earlier than its old end', () => {
    // Started at 15:00: the old day ended at 15:00. At 10:00 on the 25th, the next 4 a.m. (26th) is later: the day ends then.
    const later = v29Save(at(23, 15), at(25, 10));
    const progress = {...later.missions.daily.progress, 'feed-rabbit': 1};
    later.missions.daily.progress = progress;
    const a = decodeGame(JSON.stringify(later));
    if (!a.ok) throw Error(a.reason);
    expect(a.state.version).toBe(31);
    expect(a.state.missions.daily.cycleIndex).toBe(1);
    expect(a.state.missions.daily.progress).toEqual(progress);
    expect(dailyCycleEnd(a.state)).toBe(at(26, 4));
    // Started at 5:00: at 3:00 on the 25th the old day ends at 5:00, after the 4 a.m. coming first. The day lasts until the 26th, 4 a.m.
    const earlier = v29Save(at(23, 5), at(25, 3));
    const b = decodeGame(JSON.stringify(earlier));
    if (!b.ok) throw Error(b.reason);
    expect(b.state.missions.daily.cycleIndex).toBe(1);
    expect(dailyCycleEnd(b.state)).toBe(at(26, 4));
    expect(advance(b.state, at(25, 6)).missions.daily.cycleIndex).toBe(1);
    expect(advance(b.state, at(26, 4)).missions.daily.cycleIndex).toBe(2);
  });

  it('still refuses an old save whose day does not match its clock, and an end too far ahead', () => {
    const wrong = v29Save(at(23, 15), at(25, 10));
    wrong.missions.daily.cycleIndex = 5;
    expect(decodeGame(JSON.stringify(wrong))).toEqual({ok: false, reason: 'INVALID_STATE'});
    const s = advance(createGame(at(23, 15)), at(23, 16));
    const far = JSON.parse(encodeGame(s));
    far.missions.daily.endsAt = at(26, 4);
    expect(decodeGame(JSON.stringify(far))).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
});
