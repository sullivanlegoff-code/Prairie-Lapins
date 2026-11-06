import {describe, expect, it} from 'vitest';
import {advanceBennyFlight, flapBennyFlight, startBennyFlight, BENNY_FLIGHT_GAME} from '../src/simulation/bennyFlightGame';

/** « Le vol de Benny » (owner, 5 November 2026): touches give wing beats, hay columns come with a gap to fly through. */
describe('Benny’s flight rules', () => {
  it('hovers until the first touch, then falls into the clouds without wing beats', () => {
    const game = startBennyFlight(0, 1);
    advanceBennyFlight(game, 5000);
    expect(game).toMatchObject({over: false, started: false, y: .45, columns: []});
    flapBennyFlight(game, 5000);
    advanceBennyFlight(game, 9000);
    expect(game.over).toBe(true);
    expect(game.y + BENNY_FLIGHT_GAME.halfHeight).toBeGreaterThan(1);
  });
  it('counts the columns passed by flying through their gaps, and replays the same from the same touches', () => {
    const play = () => {
      const game = startBennyFlight(0, 42);
      // A tiny pilot: beat the wings whenever Benny is below the next gap's middle.
      for (let t = 0; t < 30_000 && !game.over; t += BENNY_FLIGHT_GAME.step) {
        advanceBennyFlight(game, t);
        const next = game.columns.find(c => c.x + BENNY_FLIGHT_GAME.columnWidth > BENNY_FLIGHT_GAME.x - BENNY_FLIGHT_GAME.halfWidth);
        const target = next ? next.gapY + .04 : .45;
        if (!game.started || (game.y > target && game.vy > -.2)) flapBennyFlight(game, t);
      }
      return game;
    };
    const a = play(), b = play();
    expect(a.passed).toBeGreaterThanOrEqual(3);
    expect(b.passed).toBe(a.passed); expect(b.y).toBe(a.y);
  });
  it('narrows the gaps as Benny goes, never below the smallest gap', () => {
    const g = BENNY_FLIGHT_GAME;
    expect(Math.max(g.minGap, g.gap - g.narrowing * 1000)).toBe(g.minGap);
    expect(g.minGap).toBeGreaterThan(2 * g.halfHeight * 1.5);
  });
});
