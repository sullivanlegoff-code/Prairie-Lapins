/**
 * « Le vol de Benny » (owner, 5 November 2026: a game on the principle of Flappy Bird, with our own name and obstacles, Benny
 * only, played from Benny's perch): Benny flies right through the sky; each touch gives her a wing beat, gravity pulls her
 * down, and columns of hay bales come from both edges with a gap to fly through. One touch of a column or of the sea of clouds
 * ends the game; the sky's top only stops her climb (owner, 19 November 2026: « beaucoup plus simple »). Pure rules: positions are fractions of the stage (x of its width, y of its height), the clock
 * is in milliseconds and the game advances in fixed steps, so a game replays the same from the same touches.
 */
export const BENNY_FLIGHT_GAME = {
  /** Benny's place across the stage, and her half box (stage fractions; a little smaller than her picture: a brush is forgiven). */
  x: .26, halfWidth: .036, halfHeight: .048,
  /** Per second: gravity, the speed a wing beat gives upward, the fastest fall (19 November 2026: softer, 2.1, .72 and 1.15 before). */
  gravity: 1.4, flap: .58, maxFall: .8,
  /** Columns: width, horizontal speed per second, delay between two at that speed, first one after `firstDelay`. */
  columnWidth: .11, speed: .25, every: 2200, firstDelay: 1600,
  /** The gap's height, and the margins its middle stays within (19 November 2026: .36 and .16 before). */
  gap: .5, margin: .16,
  /**
   * It gets harder as Benny goes (owner, 19 November 2026: « un début aussi facile, puis le jeu accélère doucement et les passages
   * varient plus en hauteur »): as easy as at the start for `easyColumns` columns, then, over the next `rampColumns`, the speed
   * rises to `fastSpeed`, the gap closes to `minGap` and its middle may come as near the edges as `minMargin`. Two gaps in a row
   * are never more than `maxShift` apart in height, so a gap can always be reached. The columns keep the same spacing.
   */
  easyColumns: 15, rampColumns: 35, fastSpeed: .36, minGap: .34, minMargin: .09, maxShift: .34,
  step: 1000 / 120,
} as const;

export interface BennyFlightColumn {readonly id: number; x: number; readonly gapY: number; readonly gap: number; passed: boolean}
export interface BennyFlightGame {
  startedAt: number; at: number; y: number; vy: number;
  /** How far the sky has scrolled (stage widths): the speed changes, so the picture follows this, not the time. */
  distance: number;
  columns: BennyFlightColumn[]; nextColumnAt: number; nextId: number;
  passed: number; over: boolean; started: boolean;
  /** Seeded draw of the gaps (a game is reproducible). */
  seed: number;
}

const next = (game: BennyFlightGame) => { game.seed = (game.seed * 1103515245 + 12345) % 2147483648; return game.seed / 2147483648; };

export function startBennyFlight(now: number, seed = Math.floor(Math.random() * 2147483647)): BennyFlightGame {
  return {startedAt: now, at: now, y: .45, vy: 0, distance: 0, columns: [], nextColumnAt: now + BENNY_FLIGHT_GAME.firstDelay, nextId: 1, passed: 0, over: false, started: false, seed};
}
/** A wing beat (the first one also starts gravity and the columns). */
export function flapBennyFlight(game: BennyFlightGame, now: number): void {
  if (game.over) return;
  advanceBennyFlight(game, now);
  if (!game.started) { game.started = true; game.nextColumnAt = now + BENNY_FLIGHT_GAME.firstDelay; }
  game.vy = -BENNY_FLIGHT_GAME.flap;
}
/** How hard the game is after `passed` columns: 0 for the easy start, up to 1 at the hardest; and what that makes of the rules. */
export function bennyFlightPace(passed: number): {level: number; speed: number; gap: number; margin: number} {
  const g = BENNY_FLIGHT_GAME, level = Math.max(0, Math.min(1, (passed - g.easyColumns) / g.rampColumns));
  return {level, speed: g.speed + (g.fastSpeed - g.speed) * level, gap: g.gap + (g.minGap - g.gap) * level, margin: g.margin + (g.minMargin - g.margin) * level};
}
const hits = (game: BennyFlightGame, c: BennyFlightColumn) => {
  const g = BENNY_FLIGHT_GAME;
  if (g.x + g.halfWidth < c.x || g.x - g.halfWidth > c.x + g.columnWidth) return false;
  return game.y - g.halfHeight < c.gapY - c.gap / 2 || game.y + g.halfHeight > c.gapY + c.gap / 2;
};
export function advanceBennyFlight(game: BennyFlightGame, now: number): void {
  const g = BENNY_FLIGHT_GAME;
  while (!game.over && game.at + g.step <= now) {
    game.at += g.step;
    if (!game.started) continue; // Benny hovers until the first touch.
    const dt = g.step / 1000, pace = bennyFlightPace(game.passed);
    game.vy = Math.min(g.maxFall, game.vy + g.gravity * dt); game.y += game.vy * dt; game.distance += pace.speed * dt;
    if (game.at >= game.nextColumnAt) {
      const low = pace.margin + pace.gap / 2, high = 1 - pace.margin - pace.gap / 2, last = game.columns[game.columns.length - 1];
      let gapY = low + next(game) * Math.max(0, high - low);
      if (last) gapY = Math.max(last.gapY - g.maxShift, Math.min(last.gapY + g.maxShift, gapY));
      game.columns.push({id: game.nextId++, x: 1, gapY, gap: pace.gap, passed: false});
      // Same spacing between columns at any speed.
      game.nextColumnAt += g.every * g.speed / pace.speed;
    }
    for (const c of game.columns) {
      c.x -= pace.speed * dt;
      if (!c.passed && c.x + g.columnWidth < g.x - g.halfWidth) { c.passed = true; game.passed++; }
    }
    game.columns = game.columns.filter(c => c.x + g.columnWidth > -.05);
    // The sky's top holds her (she glides along it); the clouds below and the columns end the game.
    if (game.y - g.halfHeight < 0) { game.y = g.halfHeight; game.vy = Math.max(0, game.vy); }
    if (game.y + g.halfHeight > 1 || game.columns.some(c => hits(game, c))) game.over = true;
  }
}
