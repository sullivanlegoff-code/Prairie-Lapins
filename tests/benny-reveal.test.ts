// @vitest-environment happy-dom
import html from '../index.html?raw';
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {existsSync, readFileSync} from 'node:fs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {BENNY_EFFECTS} from '../src/config/bennyArt';
import {showBennyReveal} from '../src/ui/bennyReveal';
import {decorateLegendaryCard, clearLegendaryCard, legendaryPortrait} from '../src/ui/legendaryCard';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import type {MeadowScene} from '../src/display/MeadowScene';
import {encodeGame} from '../src/simulation';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {establishHistoricalLevelRights} from '../src/simulation/levelRights';
import {regressionStart} from './regression-start';

const text = {title: 'Nouvelle découverte !', name: 'Benny', details: 'Arc-en-ciel · Mythique', button: 'Bienvenue dans la prairie'};
const publicFile = (url: string) => 'public/' + url.replace(/^.*?assets\//, 'assets/');
/** Canvas size of a WebP (VP8X, VP8L or VP8 chunk). */
function webpSize(b: Uint8Array): [number, number] {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to)), u24 = (at: number) => b[at] | b[at + 1] << 8 | b[at + 2] << 16;
  expect(ascii(0, 4)).toBe('RIFF'); expect(ascii(8, 12)).toBe('WEBP');
  const chunk = ascii(12, 16), view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (chunk === 'VP8X') return [1 + u24(24), 1 + u24(27)];
  if (chunk === 'VP8L') { const bits = view.getUint32(21, true); return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]; }
  return [view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff];
}
const reducedMotion = (reduce: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}}));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { document.querySelectorAll('dialog').forEach(d => d.remove()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Benny pictures', () => {
  it.each(Object.values(BENNY_EFFECTS).flat().map(art => [art.url, art] as const))('%s is a light WebP of its declared size', (_url, art) => {
    const file = publicFile(art.url); expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file); expect(webpSize(bytes)).toEqual([art.width, art.height]); expect(bytes.length).toBeLessThan(60_000);
  });
  it('keeps the eight steps of the clouds and of the rainbow, and the six rays', () => {
    expect(BENNY_EFFECTS.cloud).toHaveLength(8); expect(BENNY_EFFECTS.rainbow).toHaveLength(8); expect(BENNY_EFFECTS.rays).toHaveLength(6);
  });
});

describe('Benny first appearance', () => {
  it('opens on clouds, rainbow, rays and stardust, then Benny and the Mythic words', () => {
    reducedMotion(false); let closed = 0;
    const dialog = showBennyReveal(text, () => closed++);
    expect(dialog.open).toBe(true); expect(dialog.classList.contains('benny-reveal')).toBe(true); expect(dialog.classList.contains('is-final')).toBe(false);
    expect(dialog.querySelectorAll('.br-clouds .br-cloud-frame')).toHaveLength(8);
    expect(dialog.querySelectorAll('.br-rainbow .br-rainbow-frame')).toHaveLength(8);
    expect(dialog.querySelectorAll('.br-prism')).toHaveLength(2);
    expect(dialog.querySelectorAll('.br-rays .br-ray-frame')).toHaveLength(6);
    expect(dialog.querySelector('.br-swirl')).not.toBeNull(); expect(dialog.querySelectorAll('.br-dust').length).toBeGreaterThan(0);
    expect(dialog.querySelectorAll('.br-feather').length).toBeGreaterThan(0); expect(dialog.querySelectorAll('.br-star').length).toBeGreaterThan(0);
    expect(dialog.querySelector('.br-wave')).not.toBeNull(); expect(dialog.querySelector('.br-glow')).not.toBeNull();
    // Each step crossfades at its own time; only the last one of a sequence stays.
    expect(dialog.querySelectorAll('.br-cloud-frame.br-last, .br-rainbow-frame.br-last')).toHaveLength(2);
    expect(dialog.querySelector<HTMLElement>('.br-cloud-frame')!.style.getPropertyValue('--at')).toBe('0.6s');
    const rabbit = dialog.querySelector<HTMLImageElement>('.br-rabbit')!;
    expect(rabbit.alt).toBe('Benny'); expect(rabbit.getAttribute('src')).toContain('benny-v1.png');
    expect(dialog.querySelector('.br-badge')!.textContent).toBe('Mythique'); expect(dialog.textContent).not.toContain('Légendaire');
    expect(dialog.getAttribute('aria-labelledby')).toBe('benny-reveal-title'); expect(dialog.querySelector('#benny-reveal-title')!.textContent).toBe('Nouvelle découverte !');
    for (const layer of dialog.querySelectorAll('.br-night, .br-stars, .br-clouds, .br-rainbow, .br-rays, .br-fall, .br-glow, .br-swirl')) expect(layer.getAttribute('aria-hidden')).toBe('true');
    const button = [...dialog.querySelectorAll('button')].find(b => b.textContent === 'Bienvenue dans la prairie')!;
    expect(document.activeElement).toBe(button);
    dialog.querySelector<HTMLElement>('.br-night')!.click(); expect(dialog.classList.contains('is-final')).toBe(true); expect(dialog.open).toBe(true);
    button.click(); expect(closed).toBe(1); expect(document.querySelector('dialog.benny-reveal')).toBeNull();
    button.click(); expect(closed).toBe(1);
  });
  it('brings no fire, no water and no earth: none of the legendary paintings', () => {
    reducedMotion(false);
    const dialog = showBennyReveal(text);
    expect(dialog.querySelector('.lr-wall, .lr-fire, .lr-wave, .lr-foam, .lr-bubble, .lr-rift, .lr-rock, .lr-dustwall, .lr-ember')).toBeNull();
    expect(dialog.classList.contains('legendary-reveal')).toBe(false);
    for (const img of dialog.querySelectorAll('img')) {
      expect(img.getAttribute('src')).not.toMatch(/effects\/legendary\//);
      expect(img.getAttribute('src')).not.toMatch(/firewall|wave|foam|rift|dustwall|ember|bubble|rock/);
    }
    dialog.dispatchEvent(new Event('cancel', {cancelable: true})); expect(document.querySelector('dialog.benny-reveal')).toBeNull();
  });
  it('shows the calm end at once with reduced motion', () => {
    reducedMotion(true);
    const dialog = showBennyReveal(text);
    expect(dialog.classList.contains('is-final')).toBe(true);
    expect(dialog.querySelector<HTMLImageElement>('.br-rabbit')!.alt).toBe('Benny'); expect(dialog.querySelector('.br-badge')!.textContent).toBe('Mythique');
    // The calm end only fades: the reduced rules keep the open clouds, the rainbow, Benny and the words, without movement.
    const css = readFileSync('src/display/benny-reveal.css', 'utf8') as string, reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.br-cloud-frame:nth-child(7)'); expect(reduced).toContain('.br-rainbow-frame.br-last'); expect(reduced).toContain('.br-benny');
    const block = reduced.slice(0, reduced.indexOf('\n}\n'));
    for (const name of block.matchAll(/animation: (br-[\w-]+)/g)) expect(['br-fade-in', 'br-fade-in-to']).toContain(name[1]);
    dialog.dispatchEvent(new Event('cancel', {cancelable: true}));
  });
});

describe('Benny in the game', () => {
  const cleanups: (() => void)[] = [];
  beforeEach(() => {
    document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
    document.getElementById('app')!.inert = false; document.getElementById('loading-screen')!.hidden = true;
    localStorage.clear(); reducedMotion(false);
    vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });
  function setup() {
    const initial = regressionStart(0); establishHistoricalLevelRights(initial); initial.discovered.push('benny');
    const data = new Map<string, string>([[SAVE_KEY, encodeGame(initial)]]);
    const storage: SaveStorage = {scope: 'normal', getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }};
    const controller = new GameController(storage, () => 0, () => .65);
    const scene = new Proxy({}, {get: () => vi.fn()}) as unknown as MeadowScene;
    const prefs = new PreferenceStore('test-benny'); prefs.set({muted: true, tutorial: false});
    const ui = new GameUI(controller, scene, () => 0, prefs);
    cleanups.push(() => { ui.dispose(); controller.dispose(); });
    return ui;
  }
  it('opens this appearance, not a legendary one nor the plain card, when Benny is discovered', () => {
    const ui = setup();
    (ui as unknown as {discovery(species: string): void}).discovery('benny');
    const reveal = document.querySelector<HTMLDialogElement>('dialog.benny-reveal')!;
    expect(reveal).not.toBeNull(); expect(reveal.open).toBe(true); expect(document.querySelector('dialog.legendary-reveal')).toBeNull();
    expect(reveal.textContent).toContain('Nouvelle découverte !'); expect(reveal.textContent).toContain('Mythique');
    expect(reveal.querySelector('.br-details')!.textContent).toContain('Mythique');
    expect([...document.querySelectorAll<HTMLDialogElement>('dialog')].filter(d => d.open && d !== reveal)).toHaveLength(0);
    [...reveal.querySelectorAll('button')].find(b => b.textContent === 'Bienvenue dans la prairie')!.click();
    expect(document.querySelector('dialog.benny-reveal')).toBeNull();
  });
  it('themes Benny’s card in the Mythic colours and replays her appearance', () => {
    const ui = setup(), panel = document.getElementById('game-panel')!;
    ui.open({kind: 'species', species: 'benny'});
    expect(panel.dataset.legendary).toBe('benny'); expect(panel.style.getPropertyValue('--legendary-banner')).toContain('effects/benny/rainbow-6.webp');
    expect(panel.querySelector('.mythic-portrait .legendary-portrait-halo')!.getAttribute('src')).toContain('effects/benny/glow.webp');
    const replay = [...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(b => b.textContent === 'Revoir l’apparition')!;
    replay.click(); expect(document.querySelector('dialog.benny-reveal')).not.toBeNull();
  });
});

describe('Mythic card', () => {
  it('dresses Benny in pastel sky and rainbow, with stars and feathers, never gold fire or water', () => {
    const panel = document.createElement('section');
    expect(decorateLegendaryCard(panel, 'benny')).toBe(true);
    expect(panel.dataset.legendary).toBe('benny');
    expect(panel.style.getPropertyValue('--legendary-banner')).toContain('effects/benny/rainbow-6.webp');
    const motes = [...panel.querySelectorAll<HTMLImageElement>('.legendary-ambient .legendary-mote')];
    expect(motes.length).toBe(9); expect(motes.every(m => /effects\/benny\/(star|star-five|feather-\d)\.webp/.test(m.getAttribute('src')!))).toBe(true);
    expect(panel.querySelector('.legendary-ambient')!.getAttribute('aria-hidden')).toBe('true');
    const portrait = legendaryPortrait(document.createElement('img'), 'benny');
    expect(portrait.classList.contains('mythic-portrait')).toBe(true);
    expect(portrait.querySelector('.legendary-portrait-halo')!.getAttribute('src')).toContain('effects/benny/glow.webp');
    expect(portrait.querySelector('.mythic-portrait-ring')).not.toBeNull();
    expect([...portrait.querySelectorAll('img')].some(img => /effects\/legendary\//.test(img.getAttribute('src') ?? ''))).toBe(false);
    clearLegendaryCard(panel); expect(panel.dataset.legendary).toBeUndefined(); expect(panel.querySelector('.legendary-ambient')).toBeNull();
    // The legendaries keep their own golden halo, and an ordinary rabbit gets nothing.
    expect(legendaryPortrait(document.createElement('img'), 'dragon').classList.contains('mythic-portrait')).toBe(false);
    expect(decorateLegendaryCard(panel, 'paille')).toBe(false);
  });
  it('gives the Mythic card rainbow edges and a pastel sky, not the legendaries’ gold', () => {
    const css = readFileSync('src/display/legendary-card.css', 'utf8') as string;
    const mythic = css.slice(css.indexOf('#game-panel[data-legendary="benny"]'));
    expect(mythic).toContain('border-image: linear-gradient(90deg, #ffb0c8'); expect(mythic).not.toContain('#e9a23b');
  });
});
