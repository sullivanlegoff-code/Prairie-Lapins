// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync, readFileSync} from 'node:fs';
import html from '../index.html?raw';
import {itAll} from './cases';

const script = html.match(/<script id="loading-scene">([\s\S]*?)<\/script>/)![1];
/** Runs the shipped classic script as the build would write it (event switch and laboratory substituted). */
function run(hour: number, minute: number, christmas = true, lab = false): {scene?: string; href?: string} {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 11, 24, hour, minute));
  delete document.documentElement.dataset.loadingScene;
  document.head.querySelectorAll('link[rel=preload]').forEach(link => link.remove());
  new Function(script.replaceAll('%PRAIRIE_CHRISTMAS%', String(christmas)).replaceAll('%PRAIRIE_LAB%', String(lab)).replaceAll('%BASE_URL%', '/base/'))();
  return {scene: document.documentElement.dataset.loadingScene, href: document.head.querySelector<HTMLLinkElement>('link[rel=preload]')?.getAttribute('href') ?? undefined};
}
afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });

itAll([
  [0, 0, 'noel-nuit'], [6, 29, 'noel-nuit'], [6, 30, 'noel-crepuscule'], [8, 59, 'noel-crepuscule'], [9, 0, 'noel-jour'],
  [12, 0, 'noel-jour'], [16, 59, 'noel-jour'], [17, 0, 'noel-crepuscule'], [18, 59, 'noel-crepuscule'], [19, 0, 'noel-nuit'], [23, 30, 'noel-nuit'],
] as const)('Christmas loading landscape by the time of day: A by day, B at dawn and dusk, C at night', (hour, minute, scene) => {
  expect(run(hour, minute)).toEqual({scene, href: `/base/assets/loading/${scene}.webp`});
});

it('keeps the morning path when the event is off, at any hour', () => {
  for (const hour of [3, 7, 12, 18, 22]) expect(run(hour, 0, false)).toEqual({scene: 'matin', href: '/base/assets/loading/morning-path.webp'});
});

it('follows the laboratory override only in the laboratory', () => {
  sessionStorage.setItem('prairie-lab-christmas', JSON.stringify({hour: 22}));
  expect(run(12, 0, true, true).scene).toBe('noel-nuit');
  expect(run(12, 0, true, false).scene).toBe('noel-jour');
  sessionStorage.setItem('prairie-lab-christmas', JSON.stringify({off: true}));
  expect(run(12, 0, true, true).scene).toBe('matin');
});

it('ships a landscape and a style for every scene, and the build can read the event switch', () => {
  const css = readFileSync('src/display/loading-screen.css', 'utf8');
  for (const name of ['noel-jour', 'noel-crepuscule', 'noel-nuit']) {
    expect(existsSync(`public/assets/loading/${name}.webp`)).toBe(true);
    expect(css).toContain(`html[data-loading-scene='${name}'] #loading-screen { background-image: url('/assets/loading/${name}.webp');`);
  }
  expect(readFileSync('src/config/christmas.ts', 'utf8')).toMatch(/CHRISTMAS_EVENT = \{active: (true|false)\}/);
  expect(html).not.toContain('href="%BASE_URL%assets/loading/morning-path.webp"');
});
