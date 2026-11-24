import {describe, expect, it, vi} from 'vitest';
import {lazyActivity, type ActivityHandle} from '../src/ui/lazyActivity';

const fake = () => { const a = {active: false, open: vi.fn((..._: unknown[]) => { a.active = true; }), close: vi.fn(() => { a.active = false; }), dispose: vi.fn()}; return a; };

describe('a mini-game downloaded at its first opening (plan 5.4)', () => {
  it('downloads nothing at start, once on demand, then opens with the chosen rabbits', async () => {
    const game = fake(), load = vi.fn(async () => game as ActivityHandle<[string]>);
    const lazy = lazyActivity(load);
    expect(load).not.toHaveBeenCalled(); expect(lazy.active).toBe(false); lazy.close();
    lazy.prepare(); lazy.open('trio'); lazy.open('trio');
    expect(load).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(game.open).toHaveBeenCalledWith('trio'));
    expect(lazy.active).toBe(true); lazy.close(); expect(game.close).toHaveBeenCalled(); expect(lazy.active).toBe(false);
  });
  it('tries again after a failed download, and never shows a game that arrives after the island is gone', async () => {
    const game = fake();
    const load = vi.fn<() => Promise<ActivityHandle<[]>>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(game);
    const lazy = lazyActivity(load);
    lazy.open(); await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1)); await Promise.resolve();
    lazy.open(); await vi.waitFor(() => expect(game.open).toHaveBeenCalledTimes(1)); expect(load).toHaveBeenCalledTimes(2);
    const late = fake(), gone = lazyActivity(async () => late);
    gone.open(); gone.dispose(); await vi.waitFor(() => expect(late.dispose).toHaveBeenCalled()); expect(late.open).not.toHaveBeenCalled();
  });
});
