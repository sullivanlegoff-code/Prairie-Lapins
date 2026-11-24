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
it('sounds a caught present, one lost in the snow, a poisoned present and a bomb (plan 3.3)', () => {
  const sound = vi.fn(), {activity, at} = mount({sound}), g = activity.game!, c = SKY_GIFTS_GAME;
  const drop = (kind: 'gift' | 'poison' | 'bomb', x: number, y: number) => g.gifts.push({id: 900 + g.gifts.length, x, y, speed: .5, sway: 0, colour: 0, kind});
  g.nextDropAt = Infinity;
  drop('gift', g.basketX, c.catchTop - .001); at(16); activity.update(); expect(sound).toHaveBeenLastCalledWith('catch');
  drop('gift', g.basketX > .5 ? .1 : .9, c.groundY - .001); at(32); activity.update(); expect(sound).toHaveBeenLastCalledWith('miss');
  drop('poison', g.basketX, c.catchTop - .001); at(48); activity.update(); expect(sound).toHaveBeenLastCalledWith('poison');
  drop('bomb', g.basketX, c.catchTop - .001); at(64); activity.update(); expect(sound).toHaveBeenLastCalledWith('bomb');
  expect(sound).toHaveBeenCalledTimes(4);
});
it('the three arcade games pause when Safari puts the page away (pagehide), not only when it is hidden (plan 3.9)', async () => {
  const {mountJumpRopeActivity} = await import('../src/ui/JumpRopeActivity');
  const {mountBennyFlightActivity} = await import('../src/ui/BennyFlightActivity');
  const sky = mount().activity;
  const host = document.createElement('div'); document.body.append(host);
  const rope = mountJumpRopeActivity(host, {onFinished: () => '', clock: () => 0, frame: () => 0}); cleanups.push(() => rope.dispose());
  const r = {id: 'rabbit-1', species: 'paille' as const, affection: 3};
  rope.open({carriers: [{...r, id: 'rabbit-2'}, {...r, id: 'rabbit-3'}], athlete: r});
  rope.element.querySelector<HTMLButtonElement>('[data-jump-rope-start]')!.click();
  const flight = mountBennyFlightActivity(host, {onFinished: () => '', clock: () => 0, frame: () => 0}); cleanups.push(() => flight.dispose());
  flight.open({id: 'rabbit-9', species: 'benny', affection: 3, enclosureId: 'building-1'}); flight.element.querySelector<HTMLButtonElement>('[data-benny-flight-start]')!.click();
  const before = {sky: sky.playing, rope: rope.playing, flight: flight.playing};
  window.dispatchEvent(new Event('pagehide'));
  expect(before).toEqual({sky: true, rope: true, flight: true});
  expect(sky.playing).toBe(false); expect(rope.playing).toBe(false); expect(flight.playing).toBe(false);
  expect(sky.element.textContent).toContain('Partie en pause'); expect(rope.element.textContent).toContain('Partie en pause');
});
