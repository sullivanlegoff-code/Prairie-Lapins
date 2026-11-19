/**
 * Friends of « Le vol de Benny » (owner, 19 November 2026: « faire apparaître le lapin dragon de temps en temps qui vole
 * derrière nous et le lapin volant »): now and then the dragon rabbit or the flying rabbit comes in from the left, flies a
 * little behind Benny, following her height, and drops back. Presentation only: they never touch the columns nor the score.
 * Pure: where a friend is depends only on the time since the start of the flight and the game's seed.
 */
export const BENNY_FLIGHT_FRIENDS = {
  /** The first visit after this long (ms), then one every `every` plus up to `jitter` more. */
  first: 7000, every: 13000, jitter: 7000,
  /** One visit: coming in, flying along, dropping back (ms). */
  enter: 1400, stay: 5200, leave: 1600,
  /** Where it flies along (stage fraction across, behind Benny at x .26) and how far above her (stage fraction of the height). */
  x: .1, above: .07, bob: .025,
  kinds: ['dragon', 'volant'] as const,
} as const;
export type BennyFlightFriendKind = typeof BENNY_FLIGHT_FRIENDS.kinds[number];
export interface BennyFlightFriend {kind: BennyFlightFriendKind; x: number; y: number; visit: number}

const visitLength = () => BENNY_FLIGHT_FRIENDS.enter + BENNY_FLIGHT_FRIENDS.stay + BENNY_FLIGHT_FRIENDS.leave;
const unit = (seed: number, n: number) => { let s = (seed ^ (n * 2654435761)) >>> 0; s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0; return ((s ^ (s >>> 16)) >>> 0) / 4294967296; };
/** When visit `n` (0, 1, 2 …) begins, in ms since the start of the flight. */
export function bennyFlightVisitStart(seed: number, n: number): number {
  const f = BENNY_FLIGHT_FRIENDS; let at = f.first;
  for (let k = 0; k < n; k++) at += visitLength() + f.every + unit(seed, k) * f.jitter;
  return at;
}
/**
 * The friend in the sky `elapsed` ms after the start of the flight (null between visits), given Benny's height (stage
 * fraction). Visits take turns: the dragon first, then the flying rabbit, and so on.
 */
export function bennyFlightFriend(seed: number, elapsed: number, bennyY: number): BennyFlightFriend | null {
  const f = BENNY_FLIGHT_FRIENDS, length = visitLength();
  if (elapsed < f.first) return null;
  let n = 0; while (bennyFlightVisitStart(seed, n + 1) <= elapsed) n++;
  const t = elapsed - bennyFlightVisitStart(seed, n);
  if (t >= length) return null;
  const ease = (u: number) => u * u * (3 - 2 * u);
  const x = t < f.enter ? -.18 + (f.x + .18) * ease(t / f.enter)
    : t < f.enter + f.stay ? f.x + Math.sin((t - f.enter) / 900) * .02
    : f.x - (f.x + .25) * ease((t - f.enter - f.stay) / f.leave);
  const y = Math.max(.08, Math.min(.9, bennyY - f.above + Math.sin(t / 520) * f.bob));
  return {kind: f.kinds[n % f.kinds.length], x, y, visit: n};
}
