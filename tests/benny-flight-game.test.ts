import {describe, expect, it} from 'vitest';
import {advanceBennyFlight, bennyFlightPace, flapBennyFlight, startBennyFlight, BENNY_FLIGHT_GAME} from '../src/simulation/bennyFlightGame';

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
  // Owner, 19 November 2026: as easy as now at the start, then faster, with smaller gaps that vary more in height.
  it('stays easy for the first columns, then speeds up and closes the gaps, down to a hardest pace', () => {
    const g = BENNY_FLIGHT_GAME;
    expect(bennyFlightPace(0)).toEqual(bennyFlightPace(g.easyColumns));
    expect(bennyFlightPace(0)).toMatchObject({level: 0, speed: g.speed, gap: g.gap, margin: g.margin});
    const mid = bennyFlightPace(g.easyColumns + 10), hard = bennyFlightPace(g.easyColumns + g.rampColumns);
    expect(mid.speed).toBeGreaterThan(g.speed); expect(mid.gap).toBeLessThan(g.gap);
    expect(hard).toMatchObject({level: 1}); expect(hard.speed).toBeCloseTo(g.fastSpeed); expect(hard.gap).toBeCloseTo(g.minGap); expect(hard.margin).toBeCloseTo(g.minMargin);
    expect(bennyFlightPace(1000)).toEqual(hard);
    expect(g.minGap).toBeGreaterThan(2 * g.halfHeight * 3);
  });
  it('keeps the columns evenly spaced and two gaps in a row within reach, even at the hardest pace', () => {
    const g = BENNY_FLIGHT_GAME, game = startBennyFlight(0, 7);
    flapBennyFlight(game, 0); game.passed = 200;
    // Benny is held in the middle of the next gap by hand: only the columns matter here.
    const seen: {gapY: number; gap: number}[] = [];
    for (let t = 0; t < 60_000; t += g.step) { const ahead = game.columns.find(c => c.x + g.columnWidth > g.x - g.halfWidth); game.y = ahead ? ahead.gapY : .5; game.vy = 0; advanceBennyFlight(game, t); for (const c of game.columns) if (!seen.includes(c)) seen.push(c); }
    expect(game.over).toBe(false);
    expect(seen.length).toBeGreaterThan(30);
    for (let i = 1; i < seen.length; i++) expect(Math.abs(seen[i].gapY - seen[i - 1].gapY)).toBeLessThanOrEqual(g.maxShift + 1e-9);
    for (const c of seen) { expect(c.gapY - c.gap / 2).toBeGreaterThanOrEqual(g.minMargin - 1e-9); expect(c.gapY + c.gap / 2).toBeLessThanOrEqual(1 - g.minMargin + 1e-9); }
    expect(game.distance).toBeGreaterThan(0);
  });
});
