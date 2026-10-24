import {describe, expect, it} from 'vitest';
import {placementGrid} from '../src/display/placementGrid';
import {buildingFootprint, decorationFootprint} from '../src/simulation/placement';
import {acquiredFootprint} from '../src/config/land';
import {createGame} from '../src/state/initial';

describe('contextual placement grid', () => {
  const fresh = createGame(1);
  it('leaves the world clean until there is an active footprint', () => {
    expect(placementGrid(fresh, null)).toEqual([]);
  });
  it('shows three cells around the whole building, not a viewport-sized grid', () => {
    const lines = placementGrid(fresh, buildingFootprint({x: 5, y: 37}));
    const points = lines.flatMap(l => [l.from, l.to]);
    expect(Math.min(...points.map(p => p.x))).toBe(2);
    expect(Math.max(...points.map(p => p.x))).toBe(12);
    expect(Math.min(...points.map(p => p.y))).toBe(34);
    expect(Math.max(...points.map(p => p.y))).toBe(44);
    // 10 × 10 cells, each shared line once: no doubled opacity on internal borders.
    expect(lines).toHaveLength(220);
    expect(new Set(lines.map(l => JSON.stringify(l))).size).toBe(lines.length);
  });
  it('keeps the context proportional to a 1 × 1 decoration and a fixed 2 × 1 object', () => {
    const bounds = (width: number, height: number) => {
      const points = placementGrid(fresh, {x: 5, y: 37, width, height}).flatMap(l => [l.from, l.to]);
      return {width: Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)),
        height: Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))};
    };
    expect(bounds(1, 1)).toEqual({width: 7, height: 7});
    const rotated = decorationFootprint('large-bookcase', 0);
    expect(bounds(rotated.width, rotated.height)).toEqual({width: 8, height: 7});
  });
  it('clips the context at the front-left map edges without changing the candidate', () => {
    const candidate = buildingFootprint({x: 0, y: 44}), original = {...candidate};
    const points = placementGrid(fresh, candidate).flatMap(l => [l.from, l.to]);
    expect(points.every(p => p.x >= 0 && p.x <= 7 && p.y >= 41 && p.y <= 48)).toBe(true);
    expect(points.some(p => p.x === 0 && p.y === 48)).toBe(true);
    expect(candidate).toEqual(original);
  });
  it('never draws context over sky, including an L bay and detached legacy land', () => {
    for (const acquiredParcels of [['southwest'], ['southwest', 'west', 'south'], ['northwest', 'southeast']] as const) {
      const s = {acquiredParcels: [...acquiredParcels]};
      for (const active of [{x: 14, y: 30, width: 4, height: 4}, {x: 12, y: 12, width: 4, height: 4}]) {
        for (const {from: a, to: b} of placementGrid(s, active)) {
          expect(Number.isInteger(a.x) && Number.isInteger(a.y)).toBe(true);
          expect(Math.abs(b.x - a.x) + Math.abs(b.y - a.y)).toBe(1);
          // Each segment bounds at least one owned fine cell; gaps remain empty.
          expect(b.x > a.x ? acquiredFootprint(s, a.x, a.y, 1, 1) || acquiredFootprint(s, a.x, a.y - 1, 1, 1) :
            acquiredFootprint(s, a.x, a.y, 1, 1) || acquiredFootprint(s, a.x - 1, a.y, 1, 1)).toBe(true);
        }
      }
    }
  });
  it('keeps invalid destinations local, even outside owned land', () => {
    const lines = placementGrid(fresh, {x: 18, y: 40, width: 4, height: 4});
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every(l => l.from.x === 15 || l.from.x === 16)).toBe(true);
    expect(placementGrid(fresh, {x: 30, y: 1, width: 4, height: 4})).toEqual([]);
  });
});
