import {afterEach, describe, expect, it, vi} from 'vitest';
import {IDLE_AFTER_MS, IDLE_FRAME_MS, slowWhenIdle} from '../src/display/idleFrameRate';

describe('the island at 30 images a second while nothing is touched (plan 5.3)', () => {
  afterEach(() => { vi.useRealTimers(); });
  it('draws every frame after a touch, then every second frame after a few quiet seconds', () => {
    vi.useFakeTimers();
    const loop = {_limitRate: 1000 / 60}, target = new EventTarget(), stop = new AbortController();
    const wake = slowWhenIdle(loop, target, {signal: stop.signal});
    expect(loop._limitRate).toBe(0);
    vi.advanceTimersByTime(IDLE_AFTER_MS - 1); expect(loop._limitRate).toBe(0);
    vi.advanceTimersByTime(1); expect(loop._limitRate).toBe(IDLE_FRAME_MS);
    target.dispatchEvent(new Event('pointerdown')); expect(loop._limitRate).toBe(0);
    vi.advanceTimersByTime(IDLE_AFTER_MS - 100); target.dispatchEvent(new Event('wheel'));
    vi.advanceTimersByTime(IDLE_AFTER_MS - 1); expect(loop._limitRate).toBe(0);
    vi.advanceTimersByTime(1); expect(loop._limitRate).toBe(IDLE_FRAME_MS);
    wake(); expect(loop._limitRate).toBe(0);
    // A 60 Hz screen runs a frame every 16.7 ms: two of them always pass the idle limit, one never does.
    expect(2 * 1000 / 60).toBeGreaterThan(IDLE_FRAME_MS); expect(1000 / 60).toBeLessThan(IDLE_FRAME_MS);
    stop.abort();
  });
});
