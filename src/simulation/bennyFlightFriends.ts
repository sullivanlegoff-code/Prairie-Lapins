/**
 * Friends of « Le vol de Benny » (owner, 19 November 2026: « faire apparaître le lapin dragon de temps en temps qui vole
 * derrière nous et le lapin volant »): now and then the dragon rabbit or the flying rabbit comes in from the left, flies a
 * little behind Benny, following her height, and drops back. Presentation only: they never touch the columns nor the score.
 * Pure: where a friend is depends only on the time since the start of the flight and the game's seed.
 * They come and go softly (owner, 19 November 2026: they appeared and disappeared all at once): each visit starts and ends
 * wholly off the stage, beyond its left edge whatever the friend's width, and fades in as it comes, out as it drops back.
 */
export const BENNY_FLIGHT_FRIENDS = {
  /** The first visit after this long (ms), then one every `every` plus up to `jitter` more. */
  first: 7000, every: 13000, jitter: 7000,
  /** One visit: coming in, flying along, dropping back (ms). */
  enter: 1400, stay: 5200, leave: 1600,
  /** Where it flies along (stage fraction across, behind Benny at x .26) and how far above her (stage fraction of the height). */
  x: .1, above: .07, bob: .025, sway: .02,
  /** The share of the coming in it takes to fade in (and of the dropping back to fade out). */
  fade: .45,
  /** Space kept between the friend and the stage's left edge (CSS pixels): wholly outside before and after, never cut while along. */
  edge: 6,
  kinds: ['dragon', 'volant'] as const,
} as const;
export type BennyFlightFriendKind = typeof BENNY_FLIGHT_FRIENDS.kinds[number];
/**
 * `x`, `y`: where it flies along (stage fractions, its middle); `arrival`: 0 wholly off the stage on the left, 1 in its place;
 * `opacity`: 0 to 1.
 */
export interface BennyFlightFriend {kind: BennyFlightFriendKind; x: number; y: number; visit: number; arrival: number; opacity: number}

const visitLength = () => BENNY_FLIGHT_FRIENDS.enter + BENNY_FLIGHT_FRIENDS.stay + BENNY_FLIGHT_FRIENDS.leave;
const unit = (seed: number, n: number) => { let s = (seed ^ (n * 2654435761)) >>> 0; s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0; return ((s ^ (s >>> 16)) >>> 0) / 4294967296; };
const ease = (u: number) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
/** When visit `n` (0, 1, 2 …) begins, in ms since the start of the flight. */
export function bennyFlightVisitStart(seed: number, n: number): number {
  const f = BENNY_FLIGHT_FRIENDS; let at = f.first;
  for (let k = 0; k < n; k++) at += visitLength() + f.every + unit(seed, k) * f.jitter;
  return at;
}
/**
 * The friend in the sky `elapsed` ms after the start of the flight (null between visits), given Benny's height (stage
 * fraction). Visits take turns: the dragon first, then the flying rabbit, and so on. `still` (the player asked for less
 * motion): it does not fly in nor out, it only fades in and out in its place.
 */
export function bennyFlightFriend(seed: number, elapsed: number, bennyY: number, still = false): BennyFlightFriend | null {
  const f = BENNY_FLIGHT_FRIENDS, length = visitLength();
  if (elapsed < f.first) return null;
  let n = 0; while (bennyFlightVisitStart(seed, n + 1) <= elapsed) n++;
  const t = elapsed - bennyFlightVisitStart(seed, n);
  if (t >= length) return null;
  // How far in (0 at the start of the visit, 1 once along) and how far from its end (0 at the very end, 1 still along).
  const coming = t / f.enter, going = (length - t) / f.leave;
  const arrival = still ? 1 : t < f.enter ? ease(coming) : t < f.enter + f.stay ? 1 : ease(going);
  const opacity = still ? Math.min(ease(coming), ease(going)) : Math.min(ease(coming / f.fade), ease(going / f.fade));
  // A slow sway, the same in every phase: no step where flying along turns into dropping back.
  const x = f.x + Math.sin(t / 900) * f.sway;
  const y = Math.max(.08, Math.min(.9, bennyY - f.above + Math.sin(t / 520) * f.bob));
  return {kind: f.kinds[n % f.kinds.length], x, y, visit: n, arrival, opacity};
}
/**
 * The friend's left edge on the stage (CSS pixels), for a stage `stageWidth` wide and a friend `width` wide: in its place along
 * (moved right on a narrow stage so the left edge never cuts it), and wholly beyond the left edge at `arrival` 0.
 */
export function bennyFlightFriendLeft(mate: Pick<BennyFlightFriend, 'x' | 'arrival'>, stageWidth: number, width: number): number {
  const f = BENNY_FLIGHT_FRIENDS, along = Math.max(f.edge, mate.x * stageWidth - width / 2), away = -width - f.edge;
  return away + (along - away) * mate.arrival;
}
