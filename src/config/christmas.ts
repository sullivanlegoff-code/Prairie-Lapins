import {LABORATORY_BUILD} from './runtime';

/**
 * The Christmas event (owner, 4 November 2026): from the launch of the version that carries it and until further notice. It is
 * switched off by a new version setting `active` to false; nothing in a save depends on it being on.
 */
export const CHRISTMAS_EVENT = {active: true} as const;

/** Laboratory only: the test buttons can switch the event off or force the hour of the day, never in the normal game. */
export interface ChristmasLabOverride {off?: boolean; hour?: number; snow?: 'none' | 'light' | 'heavier'}
export const CHRISTMAS_LAB_EVENT = 'prairie-christmas-lab';
const LAB_STORAGE = 'prairie-lab-christmas';
function readLabOverride(): ChristmasLabOverride {
  if (!LABORATORY_BUILD) return {};
  try { const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(LAB_STORAGE) : null; return raw ? JSON.parse(raw) as ChristmasLabOverride : {}; } catch { return {}; }
}
let labOverride: ChristmasLabOverride = readLabOverride();
/** Kept for the tab's session, so switching the island art (chosen when the meadow loads) survives the page reload. */
export function setChristmasLabOverride(next: ChristmasLabOverride): void {
  if (!LABORATORY_BUILD) return;
  labOverride = {...next};
  try { sessionStorage.setItem(LAB_STORAGE, JSON.stringify(labOverride)); } catch { /* private mode: this tab only */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHRISTMAS_LAB_EVENT));
}
export const christmasLabOverride = (): ChristmasLabOverride => LABORATORY_BUILD ? labOverride : {};

/** Whether the island shows the Christmas event now. */
export const christmasActive = (): boolean => CHRISTMAS_EVENT.active && !christmasLabOverride().off;

/** The local hour of the day, with minutes as a fraction (the laboratory can force it). */
export function localHour(date: Date): number {
  const forced = christmasLabOverride().hour;
  if (forced !== undefined && Number.isFinite(forced)) return ((forced % 24) + 24) % 24;
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}
