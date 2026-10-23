import {describe, it, expect} from 'vitest';
import {createProjection, PROJECTION, screenBounds, toGround, toScreen} from '../src/ui/projection';
import {VISUAL} from '../src/config/visual';
import {MeadowCamera, cellsBounds, fineCell, finePoint, gridPoint} from '../src/ui/gestures';

const pivot = {x: 120 + 12 * 176 / 2, y: 120 + 12 * 148 / 2};

describe('ground ↔ screen projection', () => {
  it('keeps an exact identity, bit for bit', () => {
    const identity = createProjection(0, 1, pivot);
    expect(identity.identity).toBe(true);
    for (const p of [{x: 0.1 + 0.2, y: 1e-9}, gridPoint(6, 6), finePoint(13, 41), {x: -3.7, y: 2232.25}]) {
      expect(identity.toScreen(p)).toEqual(p); expect(identity.toGround(p)).toEqual(p);
    }
    const r = cellsBounds(0, 8, 4, 12); expect(identity.screenBounds(r)).toEqual(r);
  });
  it('uses the chosen oblique view in the game, pivoting on the map centre', () => {
    expect(VISUAL.projection).toEqual({theta: 4, q: .84});
    expect(PROJECTION.identity).toBe(false);
    expect(toScreen(pivot)).toEqual(pivot);
    for (const p of [gridPoint(0, 8), finePoint(13, 41)]) { const back = toGround(toScreen(p)); expect(back.x).toBeCloseTo(p.x, 9); expect(back.y).toBeCloseTo(p.y, 9); }
    // The camera envelope is the projected map with its water margins.
    const map = screenBounds(cellsBounds(0, 0, 12, 12));
    expect(new MeadowCamera().bounds).toEqual({left: map.left - 300, right: map.right + 300, top: map.top - 160, bottom: map.bottom + 160});
  });
  it('round-trips and keeps fine cells exact for the active oblique view (θ = 4°, q = .84)', () => {
    const p = PROJECTION;
    expect(p.identity).toBe(false);
    for (let y = 0; y < 48; y += 5) for (let x = 0; x < 48; x += 7) {
      const centre = finePoint(x + .5, y + .5), back = p.toGround(p.toScreen(centre));
      expect(back.x).toBeCloseTo(centre.x, 9); expect(back.y).toBeCloseTo(centre.y, 9);
      expect(fineCell(p.toGround(p.toScreen(centre)))).toEqual({x, y});
    }
  });
  it('tilts the ground as measured on the reference: rows rise to the right, columns lean right, depth .84', () => {
    const p = PROJECTION, a = p.toScreen(gridPoint(0, 0)), right = p.toScreen(gridPoint(1, 0)), down = p.toScreen(gridPoint(0, 1));
    expect(Math.atan2(a.y - right.y, right.x - a.x) * 180 / Math.PI).toBeCloseTo(4, 9);
    expect(down.x - a.x).toBeGreaterThan(0);
    expect(Math.hypot(down.x - a.x, down.y - a.y)).toBeCloseTo(148 * .84, 9);
    expect(p.toScreen(pivot)).toEqual(pivot);
  });
  it('bounds contain every projected corner, and ground bounds of a view cover its cells', () => {
    const p = createProjection(3.5, .86, pivot), r = cellsBounds(4, 4, 12, 12), b = p.screenBounds(r);
    for (const c of [{x: r.left, y: r.top}, {x: r.right, y: r.top}, {x: r.left, y: r.bottom}, {x: r.right, y: r.bottom}]) {
      const s = p.toScreen(c); expect(s.x >= b.left - 1e-9 && s.x <= b.right + 1e-9 && s.y >= b.top - 1e-9 && s.y <= b.bottom + 1e-9).toBe(true);
    }
    const g = p.groundBounds(b);
    expect(g.left <= r.left + 1e-9 && g.right >= r.right - 1e-9 && g.top <= r.top + 1e-9 && g.bottom >= r.bottom - 1e-9).toBe(true);
  });
  it('gives the ground layer a Phaser transform that maps its local points exactly like toScreen', () => {
    // Phaser's container transform: x' = cos(r)·sx·x − sin(r)·sy·y + tx, y' = sin(r)·sx·x + cos(r)·sy·y + ty.
    const phaser = (t: {x: number; y: number; rotation: number; scaleX: number; scaleY: number}, p: {x: number; y: number}) =>
      ({x: Math.cos(t.rotation) * t.scaleX * p.x - Math.sin(t.rotation) * t.scaleY * p.y + t.x, y: Math.sin(t.rotation) * t.scaleX * p.x + Math.cos(t.rotation) * t.scaleY * p.y + t.y});
    expect(createProjection(0, 1, pivot).groundTransform).toEqual({x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1});
    for (const projection of [PROJECTION, createProjection(0, 1, pivot), createProjection(3.5, .86, pivot), createProjection(-2, .9, {x: 0, y: 0})])
      for (const p of [gridPoint(0, 0), gridPoint(12, 12), finePoint(7, 43), {x: -50, y: 2000}]) {
        const a = phaser(projection.groundTransform, p), b = projection.toScreen(p);
        expect(a.x).toBeCloseTo(b.x, 9); expect(a.y).toBeCloseTo(b.y, 9);
      }
  });
  it('refuses a degenerate projection', () => {
    for (const [theta, q] of [[0, 0], [3, -1], [Number.NaN, 1], [0, Infinity]]) expect(() => createProjection(theta, q, pivot)).toThrow(RangeError);
  });
});
