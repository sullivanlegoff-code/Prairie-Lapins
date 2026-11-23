import {afterEach, describe, expect, it, vi} from 'vitest';
import {clamp} from '../src/util/clamp';
import {prefersReducedMotion} from '../src/display/reducedMotion';

describe('the small shared helpers (plan 6.2)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('clamp keeps a value in its bounds, 0 to 1 by default, the lower bound winning if they cross (as the copies it replaces)', () => {
    expect([clamp(-1), clamp(.4), clamp(2), clamp(5, 1, 3), clamp(-5, 1, 3), clamp(2, 4, 1)]).toEqual([0, .4, 1, 3, 1, 4]);
  });
  it('reads the « reduce motion » setting at each call, and says no without a browser', () => {
    vi.stubGlobal('matchMedia', undefined); expect(prefersReducedMotion()).toBe(false);
    vi.stubGlobal('matchMedia', () => ({matches: true})); expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal('matchMedia', () => ({matches: false})); expect(prefersReducedMotion()).toBe(false);
  });
});
