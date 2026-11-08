/**
 * The Hearts calendar (owner, 8 November 2026): a player who plays every day, three sessions (08:00, 13:00, 20:00), and never
 * spends a Heart to hurry anything must have earned, by the end of day 15, enough Hearts to pay for everything sold for Hearts.
 * Player levels still gate some purchases (statues, epic islet, robot statue): the Hearts are ready and wait for the level.
 *
 * This is a model of the daily sources, built from the game's real values, not a replay of the whole game:
 * - the levels come from the progression simulation (`docs/progression-results.json`, `milestones`);
 * - the daily gift is claimed at the first session after it is ready, the daily bonus and one Cuisine dish every day from day 2;
 * - the agency is bought at level 8 and grown with Hearts as soon as they are in hand; every free slot gets a trip at every
 *   session, the lengths taking turns from 3 to 10 hours (the average of the random draw); a trip is welcomed at the first
 *   session after it ends;
 * - the main missions counted are only those the simulated player always reaches by day 15 (levels 5 and 10, 5 species,
 *   affection 5); salon, jump rope and Benny's flight open later and are not counted.
 */
import {AFFECTION_STATUES, AGENCY_UPGRADE_HEARTS, DAILY_HEART_SOURCES, EPIC_ISLET, FARM_UPGRADES, HEARTS, NURSERY, TRAVEL, tripHearts} from '../config/balance';
import {DECORATIONS, DECORATION_IDS} from '../config/decorations';
import {HABITAT_TYPES, habitatLevel} from '../config/habitats';
import {DAILY_BONUS, MAIN_MISSIONS, type MainMissionId} from '../config/missions';
import {PROGRESSION} from '../config/progression';

/** Day (from the first session) when the progression simulation reaches each level (8 November 2026 run). */
export const SIMULATED_LEVEL_DAYS: readonly (readonly [day: number, level: number])[] = [[0, 5], [7.5, 10], [19.5, 15], [35.2, 20], [42.2, 22], [62, 25]];
export const HEART_CALENDAR_DAYS = 15;
const COUNTED_MISSIONS: readonly [MainMissionId, (level: number, day: number) => boolean][] = [
  ['level-five', level => level >= 5], ['level-ten', level => level >= 10],
  ['growing-collection', (_level, day) => day >= 10], ['strong-bonds', (_level, day) => day >= 3],
];

export function simulatedLevel(day: number): number {
  const points = SIMULATED_LEVEL_DAYS;
  for (let k = 1; k < points.length; k++) if (day <= points[k][0]) {
    const [d0, l0] = points[k - 1], [d1, l1] = points[k];
    return Math.floor(l0 + (l1 - l0) * (day - d0) / (d1 - d0));
  }
  return points.at(-1)![1];
}

/** Everything sold for Hearts, once each (one level 3 upgrade per habitat type). */
export function heartShoppingList(): {item: string; hearts: number}[] {
  return [
    {item: 'Ferme niveau 2', hearts: FARM_UPGRADES[2].hearts},
    {item: 'Agence niveau 2', hearts: AGENCY_UPGRADE_HEARTS[1]}, {item: 'Agence niveau 3', hearts: AGENCY_UPGRADE_HEARTS[2]},
    ...([1, 2, 3] as const).map(c => ({item: `Nurserie ${c + 1}e place`, hearts: NURSERY.unlockHearts[c]})),
    ...AFFECTION_STATUES.map((s, k) => ({item: `Statue de l'Affection ${k + 1}`, hearts: s.heartPrice})),
    ...DECORATION_IDS.filter(id => DECORATIONS[id].heartPrice !== undefined).map(id => ({item: DECORATIONS[id].name, hearts: DECORATIONS[id].heartPrice!})),
    {item: 'Îlet épique', hearts: EPIC_ISLET.hearts},
    ...HABITAT_TYPES.map(type => ({item: `Habitat ${type} niveau 3`, hearts: habitatLevel(type, 3).cost})),
  ];
}

export interface HeartDay {day: number; level: number; earned: number; bySource: Record<string, number>}

/** Hearts earned by the end of each day (cumulative), by source. */
export function heartCalendar(days = HEART_CALENDAR_DAYS): HeartDay[] {
  const H = 1, bySource: Record<string, number> = {initial: HEARTS.initial};
  const add = (source: string, n: number) => { bySource[source] = (bySource[source] ?? 0) + n; balance += n; };
  let balance = HEARTS.initial, nextGift = 24 * H + 8, agency = 0, rewardedLevel = 1, lengthTurn = 0;
  const trips: {endsAt: number; hearts: number}[] = [], claimed = new Set<MainMissionId>(), result: HeartDay[] = [];
  const dailyBonus = DAILY_BONUS.filter(r => r.resource === 'hearts').reduce((a, r) => a + r.amount, 0);
  for (let day = 1; day <= days; day++) {
    for (const hour of [8, 13, 20]) {
      const t = (day - 1) * 24 + hour, level = simulatedLevel((t - 8) / 24);
      if (level > rewardedLevel) { add('niveaux', (level - rewardedLevel) * PROGRESSION.rewards.heartsPerLevel); rewardedLevel = level; }
      for (const [id, done] of COUNTED_MISSIONS) if (!claimed.has(id) && done(level, (t - 8) / 24)) {
        claimed.add(id); const r = MAIN_MISSIONS[id].reward; if (r.resource === 'hearts') add('missions', r.amount);
      }
      let gifts = 0; while (nextGift <= t && gifts < HEARTS.maximumGifts) { gifts++; nextGift += 24 * H; }
      if (gifts) add('cadeau', gifts * HEARTS.gift);
      if (hour === 8 && day >= 2) { add('bonus du jour', dailyBonus); add('cuisine', DAILY_HEART_SOURCES.cuisine); }
      for (const trip of trips.filter(trip => trip.endsAt <= t)) { add('voyages', trip.hearts); trips.splice(trips.indexOf(trip), 1); }
      if (!agency && level >= TRAVEL.unlockLevel) agency = 1;
      while (agency && agency < 3 && balance >= AGENCY_UPGRADE_HEARTS[agency as 1 | 2]) { balance -= AGENCY_UPGRADE_HEARTS[agency as 1 | 2]; agency++; }
      while (agency && trips.length < agency) {
        const hours = TRAVEL.minHours + lengthTurn++ % (TRAVEL.maxHours - TRAVEL.minHours + 1);
        trips.push({endsAt: t + hours, hearts: tripHearts(hours)});
      }
    }
    result.push({day, level: rewardedLevel, earned: Object.values(bySource).reduce((a, n) => a + n, 0), bySource: {...bySource}});
  }
  return result;
}
