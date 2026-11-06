/**
 * « Le vol de Benny » (owner, 5 November 2026: a game on the principle of Flappy Bird, with our own name and obstacles, Benny
 * only, played from Benny's perch): Benny flies right through the sky; each touch gives her a wing beat, gravity pulls her
 * down, and columns of hay bales come from both edges with a gap to fly through. One touch of a column, the sky's top or the
 * sea of clouds ends the game. Pure rules: positions are fractions of the stage (x of its width, y of its height), the clock
 * is in milliseconds and the game advances in fixed steps, so a game replays the same from the same touches.
 */
export const BENNY_FLIGHT_GAME = {
  /** Benny's place across the stage, and her half box (stage fractions). */
  x: .26, halfWidth: .045, halfHeight: .06,
  /** Per second: gravity, the speed a wing beat gives upward, the fastest fall. */
  gravity: 2.1, flap: .72, maxFall: 1.15,
  /** Columns: width, horizontal speed per second, delay between two, first one after `firstDelay`. */
  columnWidth: .11, speed: .3, every: 1750, firstDelay: 1300,
  /** The gap starts at `gap` and narrows by `narrowing` per column passed, down to `minGap`; its middle stays within the margins. */
  gap: .36, narrowing: .004, minGap: .26, margin: .14,
  step: 1000 / 120,
} as const;

export interface BennyFlightColumn {readonly id: number; x: number; readonly gapY: number; readonly gap: number; passed: boolean}
export interface BennyFlightGame {
  startedAt: number; at: number; y: number; vy: number;
  columns: BennyFlightColumn[]; nextColumnAt: number; nextId: number;
  passed: number; over: boolean; started: boolean;
  /** Seeded draw of the gaps (a game is reproducible). */
  seed: number;
}

const next = (game: BennyFlightGame) => { game.seed = (game.seed * 1103515245 + 12345) % 2147483648; return game.seed / 2147483648; };

export function startBennyFlight(now: number, seed = Math.floor(Math.random() * 2147483647)): BennyFlightGame {
  return {startedAt: now, at: now, y: .45, vy: 0, columns: [], nextColumnAt: now + BENNY_FLIGHT_GAME.firstDelay, nextId: 1, passed: 0, over: false, started: false, seed};
}
/** A wing beat (the first one also starts gravity and the columns). */
export function flapBennyFlight(game: BennyFlightGame, now: number): void {
  if (game.over) return;
  advanceBennyFlight(game, now);
  if (!game.started) { game.started = true; game.nextColumnAt = now + BENNY_FLIGHT_GAME.firstDelay; }
  game.vy = -BENNY_FLIGHT_GAME.flap;
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
    const dt = g.step / 1000;
    game.vy = Math.min(g.maxFall, game.vy + g.gravity * dt); game.y += game.vy * dt;
    if (game.at >= game.nextColumnAt) {
      const gap = Math.max(g.minGap, g.gap - g.narrowing * game.passed), room = 1 - 2 * g.margin - gap;
      game.columns.push({id: game.nextId++, x: 1, gapY: g.margin + gap / 2 + next(game) * Math.max(0, room), gap, passed: false});
      game.nextColumnAt += g.every;
    }
    for (const c of game.columns) {
      c.x -= g.speed * dt;
      if (!c.passed && c.x + g.columnWidth < g.x - g.halfWidth) { c.passed = true; game.passed++; }
    }
    game.columns = game.columns.filter(c => c.x + g.columnWidth > -.05);
    if (game.y - g.halfHeight < 0 || game.y + g.halfHeight > 1 || game.columns.some(c => hits(game, c))) game.over = true;
  }
}
