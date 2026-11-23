import {describe, expect, it} from 'vitest';
import {HEART_CALENDAR_DAYS, heartCalendar, heartShoppingList, rampageHeartsPerDay, simulatedLevel} from '../src/simulation/heartCalendar';
import {BENNY_RUN} from '../src/simulation/bennyRun';
import {AGENCY_UPGRADE_HEARTS, BENNY_LAIR, EPIC_ISLET, HEARTS, NURSERY, tripHearts} from '../src/config/balance';
import {DAILY_BONUS} from '../src/config/missions';
import {PROGRESSION} from '../src/config/progression';

// Owner's rule (8 November 2026): playing every day, without hurrying anything, everything sold for Hearts is paid in 15 days.
describe('Hearts calendar', () => {
  const total = heartShoppingList().reduce((sum, item) => sum + item.hearts, 0), calendar = heartCalendar();

  it('earns enough Hearts for every Heart purchase by the end of day 15, not long before', () => {
    expect(calendar).toHaveLength(HEART_CALENDAR_DAYS);
    expect(calendar.at(-1)!.earned).toBeGreaterThanOrEqual(total);
    expect(calendar.at(-1)!.earned).toBeLessThan(total * 1.15);
    expect(calendar.at(-3)!.earned).toBeLessThan(total);
  });

  it('keeps the rebalanced prices and daily sources of 8 November 2026', () => {
    expect(total).toBe(760);
    expect({gift: HEARTS.gift, bonus: DAILY_BONUS[0], level: PROGRESSION.rewards.heartsPerLevel, agency: AGENCY_UPGRADE_HEARTS, nursery: NURSERY.unlockHearts, islet: EPIC_ISLET.hearts})
      .toEqual({gift: 10, bonus: {resource: 'hearts', amount: 5}, level: 3, agency: {1: 30, 2: 60}, nursery: {1: 30, 2: 60, 3: 80}, islet: 200});
    expect([3, 4, 5, 6, 7, 8, 9, 10].map(tripHearts)).toEqual([3, 3, 5, 5, 7, 7, 9, 12]);
  });

  it('counts only sources open before day 15, travel first, without hurrying', () => {
    const sources = calendar.at(-1)!.bySource;
    expect(Object.keys(sources).sort()).toEqual(['bonus du jour', 'cadeau', 'cuisine', 'initial', 'missions', 'niveaux', 'voyages']);
    expect(simulatedLevel(HEART_CALENDAR_DAYS)).toBeLessThan(15);
    expect(calendar.findIndex(d => (d.bySource.voyages ?? 0) > 0)).toBeGreaterThan(0);
  });

  it('counts « Benny Rampage » from level 25, within its daily limit, and nothing of it by day 15 (decision D7)', () => {
    expect(calendar.at(-1)!.bySource['Benny Rampage']).toBeUndefined();
    const long = heartCalendar(90), opens = long.findIndex(d => (d.bySource['Benny Rampage'] ?? 0) > 0);
    expect(opens).toBeGreaterThan(HEART_CALENDAR_DAYS); expect(long[opens].level).toBeGreaterThanOrEqual(BENNY_LAIR.unlockLevel);
    const perDay = (long.at(-1)!.bySource['Benny Rampage'] ?? 0) - (long.at(-2)!.bySource['Benny Rampage'] ?? 0);
    expect(perDay).toBe(rampageHeartsPerDay()); expect(perDay).toBeLessThanOrEqual(BENNY_RUN.heartsPerCycle); expect(perDay).toBe(12);
  });
});
