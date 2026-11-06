/**
 * The Christmas island's day, night and snow (owner, 4 November 2026). Pure functions of the time, so every device shows the
 * same sky at the same moment and nothing is saved.
 * - The evening turns into night (17:30 → 19:00), the night ends with the morning (6:30 → 8:00).
 * - The garlands light up at 20:00 and go out in the morning, with the daylight (7:30).
 * - The snow is light and not all the time: half-hour slots, most without snow, some with tiny flakes, a few with a slightly
 *   heavier fall; each change is a slow fade.
 */
const smooth = (u: number) => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };

/** 0 by day, 1 at night. */
export function nightLevel(hour: number): number {
  if (hour >= 17.5 && hour < 19) return smooth((hour - 17.5) / 1.5);
  if (hour >= 19 || hour < 6.5) return 1;
  if (hour < 8) return 1 - smooth((hour - 6.5) / 1.5);
  return 0;
}

/** 0 off, 1 lit: on from 20:00 (a two-minute glow) until 7:30 (they fade out over half an hour). */
export function garlandLevel(hour: number): number {
  if (hour >= 20) return smooth((hour - 20) * 30);
  if (hour < 7.5) return 1;
  if (hour < 8) return 1 - smooth((hour - 7.5) * 2);
  return 0;
}

export type SnowKind = 'none' | 'light' | 'heavier';
export const SNOW_SLOT_MS = 30 * 60_000;
/** Slot weights: no snow most of the time, sometimes tiny flakes, rarely a slightly heavier fall. */
export const SNOW_ODDS = {none: .55, light: .35, heavier: .10} as const;
/** How many flakes fall at once for each kind (the layer scales it to the screen size). */
export const SNOW_DENSITY: Record<SnowKind, number> = {none: 0, light: .35, heavier: 1};

const hash = (n: number) => { let h = (n ^ 0x9e3779b9) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** The kind of snow of the half-hour slot holding this moment (the same on every device). */
export function snowKind(time: number): SnowKind {
  const u = hash(Math.floor(time / SNOW_SLOT_MS));
  return u < SNOW_ODDS.none ? 'none' : u < SNOW_ODDS.none + SNOW_ODDS.light ? 'light' : 'heavier';
}

/** Flake density now, between 0 and 1: each slot starts with a five-minute fade from the previous one. */
export function snowDensity(time: number): number {
  const slot = Math.floor(time / SNOW_SLOT_MS), into = time - slot * SNOW_SLOT_MS, fade = 5 * 60_000;
  const now = SNOW_DENSITY[snowKind(time)], before = SNOW_DENSITY[snowKind(time - SNOW_SLOT_MS)];
  return into >= fade ? now : before + (now - before) * smooth(into / fade);
}

/** Multiply colour of the deepest night: a soft blue in which the island and the rabbits stay readable (concept C1), lighter
 * since 5 November 2026 (owner: « dans la nuit il n'y a pas assez de lumière »): still a blue night, about 30 % brighter. */
export const NIGHT_TINT = {r: 0x9a, g: 0xa6, b: 0xd8};
/** The night's colour for a level from 0 (day) to 1 (night), as a Phaser colour. */
export function nightColor(level: number): number {
  const mix = (day: number, night: number) => Math.round(day + (night - day) * Math.max(0, Math.min(1, level)));
  return (mix(255, NIGHT_TINT.r) << 16) | (mix(255, NIGHT_TINT.g) << 8) | mix(255, NIGHT_TINT.b);
}

