// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import {bindAppViewport} from '../src/display/appViewport';
import html from '../index.html?raw';

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; document.documentElement.removeAttribute('style'); });

function setup() {
  vi.useFakeTimers();
  document.body.innerHTML = '<input><button>Fermer</button>';
  const viewport = Object.assign(new EventTarget(), {width: 844, height: 390, scale: 1});
  const frames = new Map<number, FrameRequestCallback>(); let next = 0;
  const host = Object.assign(new EventTarget(), {
    visualViewport: viewport, innerWidth: 844, innerHeight: 390, scrollX: 0, scrollY: 0,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
    setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
    scrollTo: vi.fn(() => { host.scrollX = 0; host.scrollY = 0; }),
  });
  const resize = vi.fn();
  const dispose = bindAppViewport(resize, host as unknown as Window, document);
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); };
  return {host, viewport, resize, dispose, flush, style: document.documentElement.style};
}

it('uses the visible viewport and catches late rotation / pageshow sizes without a window resize', () => {
  const s = setup(); s.flush();
  expect(s.style.getPropertyValue('--app-height')).toBe('390px');
  s.host.dispatchEvent(new Event('orientationchange'));
  s.viewport.width = 390; s.viewport.height = 844;
  vi.advanceTimersByTime(350); s.flush();
  expect(s.style.getPropertyValue('--app-width')).toBe('390px');
  expect(s.style.getPropertyValue('--app-height')).toBe('844px');
  s.viewport.height = 760; s.viewport.dispatchEvent(new Event('resize')); s.flush();
  expect(s.style.getPropertyValue('--app-height')).toBe('760px');
  s.host.dispatchEvent(new Event('pageshow')); s.viewport.height = 844;
  vi.advanceTimersByTime(700); s.flush();
  expect(s.style.getPropertyValue('--app-height')).toBe('844px');
  s.dispose();
});

it('does not fight keyboard / page zoom, then repairs document scroll after editing ends', () => {
  const s = setup(); s.flush();
  document.querySelector('input')!.focus(); s.host.scrollY = 160; s.viewport.height = 180;
  s.viewport.dispatchEvent(new Event('resize')); s.flush();
  expect(s.style.getPropertyValue('--app-height')).toBe('390px'); expect(s.host.scrollTo).not.toHaveBeenCalled();
  document.querySelector('button')!.focus(); s.viewport.height = 390; s.flush();
  expect(s.host.scrollTo).toHaveBeenCalledWith(0, 0);
  s.viewport.scale = 2; s.viewport.height = 195; s.host.scrollY = 30;
  s.viewport.dispatchEvent(new Event('scroll')); s.flush();
  expect(s.style.getPropertyValue('--app-height')).toBe('390px'); expect(s.host.scrollTo).toHaveBeenCalledTimes(1);
  s.dispose();
});

it('removes pending frames, settle timers and listeners, with a matching cream browser theme', () => {
  const s = setup(); s.flush(); const calls = s.resize.mock.calls.length;
  s.host.dispatchEvent(new Event('orientationchange')); s.dispose();
  vi.advanceTimersByTime(2000); s.viewport.dispatchEvent(new Event('resize')); s.host.dispatchEvent(new Event('pageshow')); s.flush();
  expect(s.resize).toHaveBeenCalledTimes(calls); expect(vi.getTimerCount()).toBe(0);
  expect(s.style.getPropertyValue('--app-height')).toBe('');
  expect(html).toContain('name="theme-color" content="#fffdf5"');
});

function installedHost(inner: {width: number; height: number}, screen: {width: number; height: number}, standalone: boolean) {
  vi.useFakeTimers();
  const viewport = Object.assign(new EventTarget(), {...inner, scale: 1});
  const frames = new Map<number, FrameRequestCallback>(); let next = 0;
  const host = Object.assign(new EventTarget(), {
    visualViewport: viewport, innerWidth: inner.width, innerHeight: inner.height, scrollX: 0, scrollY: 0, screen,
    navigator: {standalone}, matchMedia: () => ({matches: false}),
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
    setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window), scrollTo: vi.fn(),
  });
  const dispose = bindAppViewport(() => {}, host as unknown as Window, document);
  [...frames.values()].forEach(callback => callback(0)); frames.clear();
  const style = document.documentElement.style;
  return {size: [style.getPropertyValue('--app-width'), style.getPropertyValue('--app-height')], dispose};
}
it('opened from the home screen, fills a status-bar-sized gap so no strip shows; Safari and split view keep their size', () => {
  // iPhone 14 screen 390 × 844 (iOS reports it in portrait whatever the rotation).
  for (const [inner, standalone, expected] of [
    [{width: 844, height: 343}, true, ['844px', '390px']], // landscape, one status bar short
    [{width: 390, height: 797}, true, ['390px', '844px']], // portrait, one status bar short
    [{width: 844, height: 390}, true, ['844px', '390px']], // already exact
    [{width: 844, height: 343}, false, ['844px', '343px']], // ordinary Safari: its bars are real
    [{width: 600, height: 390}, true, ['600px', '390px']], // a window much narrower than the screen (iPad split view)
  ] as const) {
    const s = installedHost(inner, {width: 390, height: 844}, standalone);
    expect(s.size).toEqual(expected); s.dispose();
  }
});
