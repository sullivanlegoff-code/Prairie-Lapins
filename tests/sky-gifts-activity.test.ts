// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import {mountSkyGiftsActivity} from '../src/ui/SkyGiftsActivity';
import {SKY_GIFTS_GAME} from '../src/simulation/skyGiftsGame';

const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).forEach(f => f()); vi.restoreAllMocks(); });
function mount(extra: Partial<Parameters<typeof mountSkyGiftsActivity>[1]> = {}) {
  let t = 0; const host = document.createElement('div'); document.body.append(host);
  const quotaText = vi.fn(() => 'Parties récompensées : 0/3');
  const activity = mountSkyGiftsActivity(host, {onFinished: () => '', quotaText, best: () => 0, clock: () => t, frame: () => 0, ...extra});
  cleanups.push(() => { activity.dispose(); host.remove(); });
  activity.open({id: 'rabbit-1', species: 'paille', affection: 3});
  activity.element.querySelector<HTMLButtonElement>('[data-sky-gifts-start]')!.click();
  return {activity, quotaText, at: (ms: number) => { t = ms; }};
}
it('reads today’s rewards only at the start and the end of a game, never every frame (plan 3.1)', () => {
  const {activity, quotaText, at} = mount();
  const calls = quotaText.mock.calls.length, quota = activity.element.querySelector('.sky-gifts-quota')!;
  for (let i = 0; i < 120; i++) { at(i * 16); activity.update(); }
  expect(quotaText.mock.calls.length).toBe(calls); expect(quota.textContent).toBe('Parties récompensées : 0/3');
  at(SKY_GIFTS_GAME.ms + 60_000); activity.update(); // The time is up (or the misses): the game ends.
  expect(activity.playing).toBe(false); expect(quotaText.mock.calls.length).toBe(calls + 1);
});
