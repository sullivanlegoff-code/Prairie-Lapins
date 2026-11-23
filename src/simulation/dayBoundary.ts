import {HOUR} from '../config/balance';

const DAY = 24 * HOUR;

/**
 * The game's day changes at 4 a.m., local time (owner, 23 November 2026, decision D4): the night belongs to the day before.
 * Days are counted on the player's local calendar, so a change to or from summer time never moves the hour.
 */
export const DAY_START_HOUR = 4;
/** The number of the game day `t` falls in: the local date, minus one before 4 a.m. */
export function gameDay(t: number): number {
  const d = new Date(t);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY) - (d.getHours() < DAY_START_HOUR ? 1 : 0);
}
/** The moment game day `day` starts: 4 a.m. local time on its date. */
export function gameDayStart(day: number): number {
  const d = new Date(day * DAY);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), DAY_START_HOUR).getTime();
}
/** The first 4 a.m. strictly after `t`. */
export const nextDayStart = (t: number): number => gameDayStart(gameDay(t) + 1);
