// @vitest-environment happy-dom
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync} from 'node:fs';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame, encodeGame} from '../src/simulation';
import {SAVE_KEY} from '../src/persistence/storage';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';
import {BENNY_CARESS_IDLE_MS, BENNY_CARESS_MOVES, BENNY_CARESS_ORDER, BENNY_CARESS_SETTLE_MS, resetBennyCaressAtlas} from '../src/ui/bennyCaress';
import {BENNY_REVEAL_POSES} from '../src/config/bennyArt';

// Benny's caress in her sheet (owner, 20 November 2026): several moments of joy that go on while the finger rubs and stop when it
// stops; every other rabbit keeps its caress.
const cleanups: (() => void)[] = [];
let clock = 0;
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  clock = 10_000; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
  resetBennyCaressAtlas(true);
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); resetBennyCaressAtlas(); });
function reducedMotion(on: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({matches: on && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}}));
}
function sheet(species: 'benny' | 'paille') {
  const s: GameState = createGame(0);
  s.missions.daily.picked = ['pet-rabbits', 'collect-pattes', 'gain-affection'];
  let id = s.rabbits[0]!.id;
  if (species === 'benny') { id = 'rabbit-90'; s.rabbits.push({id, species: 'benny', affection: 6, enclosureId: s.buildings[0]!.id}); s.discovered.push('benny'); s.nextId = 100; }
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), playPicnic: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('pet'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => 0, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); });
  ui.select({kind: 'rabbit', id});
  const portrait = document.querySelector<HTMLElement>(`#panel-content [data-pet-rabbit="${id}"]`)!;
  return {controller, portrait, id};
}
const pointer = (target: Element, type: string, x: number) => target.dispatchEvent(new PointerEvent(type, {pointerId: 1, clientX: x, clientY: 20, bubbles: true, cancelable: true}));
const rub = (portrait: HTMLElement) => { pointer(portrait, 'pointerdown', 20); pointer(portrait, 'pointermove', 45); pointer(portrait, 'pointermove', 22); };

/** Time goes by for the page clock and the timers together, in small steps. */
function advance(ms: number) { for (let t = 0; t < ms; t += 10) { clock += 10; vi.advanceTimersByTime(10); } }
/** Keeps rubbing sideways for `ms`, one move every 60 ms, and notes the moments she plays. */
function keepRubbing(portrait: HTMLElement, ms: number, seen: string[] = []) {
  let x = 22;
  for (let t = 0; t < ms; t += 60) {
    x = x === 22 ? 60 : 22; pointer(portrait, 'pointermove', x); advance(60);
    const now = portrait.dataset.bennyCaress; if (now && seen.at(-1) !== now) seen.push(now);
  }
  return seen;
}

it('caressing Benny goes on as long as the finger rubs, through several different moments of joy, never twice the same in a row', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false);
  const {controller, portrait, id} = sheet('benny'); const perform = vi.spyOn(controller, 'perform');
  rub(portrait);
  expect(portrait.dataset.petting).toBe('benny'); expect(portrait.dataset.bennyCaress).toBe('kiss');
  expect(perform).toHaveBeenCalledWith({type: 'petRabbit', rabbitId: id}); expect(perform).toHaveBeenCalledTimes(1);
  expect(portrait.querySelector('.pet-hearts')).toBeNull();
  // The kiss: her paw at her mouth, then a big painted heart flying at the player.
  expect([...portrait.querySelectorAll<HTMLElement>('.bc-poses .bc-pose')].map(p => p.dataset.pose)).toEqual(BENNY_CARESS_MOVES.kiss.poses.map(([name]) => name));
  expect(portrait.querySelector('.bc-kiss-heart')?.getAttribute('src')).toContain('assets/effects/spa/coeur');
  const seen = keepRubbing(portrait, 9000, ['kiss']);
  expect(new Set(seen).size).toBeGreaterThanOrEqual(4);
  for (let k = 1; k < seen.length; k++) expect(seen[k]).not.toBe(seen[k - 1]);
  expect(seen.slice(0, 4)).toEqual(BENNY_CARESS_ORDER.slice(0, 4));
  expect(portrait.dataset.petting).toBe('benny');
  // Counted like a caress: at the start, then again every few seconds while it goes on.
  expect(perform.mock.calls.length).toBeGreaterThanOrEqual(3); expect(perform.mock.calls.length).toBeLessThanOrEqual(4);
  // Hearts rise where the finger rubs.
  expect(portrait.querySelectorAll('.bc-fingers .bc-finger-heart').length).toBeGreaterThan(0);
  // Painted pictures only.
  for (const img of portrait.querySelectorAll<HTMLImageElement>('.bc-back img, .bc-front img, .bc-fingers img')) expect(img.getAttribute('src')).toMatch(/assets\/(effects\/(benny|spa)|currency)\//);
  expect(portrait.querySelector('canvas, svg')).toBeNull();
  pointer(portrait, 'pointerup', 22);
});

it('her caress stops when the finger stops rubbing, and when it lifts; she settles back softly', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false);
  const {portrait} = sheet('benny');
  rub(portrait); keepRubbing(portrait, 2500);
  expect(portrait.dataset.bennyCaress).not.toBe('settle');
  // The finger rests on her without moving: the moment stops.
  advance(BENNY_CARESS_IDLE_MS + 20);
  expect(portrait.dataset.bennyCaress).toBe('settle');
  advance(BENNY_CARESS_SETTLE_MS + 20);
  expect(portrait.dataset.bennyCaress).toBeUndefined(); expect(portrait.dataset.petting).toBeUndefined();
  expect(portrait.querySelector('.bc-back, .bc-front, .bc-poses, .bc-fingers')).toBeNull();
  // Rubbing again starts a new caress, with her kiss; lifting the finger stops it at once.
  pointer(portrait, 'pointermove', 70); pointer(portrait, 'pointermove', 20);
  expect(portrait.dataset.bennyCaress).toBe('kiss');
  keepRubbing(portrait, 600);
  pointer(portrait, 'pointerup', 20);
  expect(portrait.dataset.bennyCaress).toBe('settle');
  advance(BENNY_CARESS_SETTLE_MS + 20);
  expect(portrait.dataset.bennyCaress).toBeUndefined();
});

it('her moments are long enough, their poses fit inside them and exist in her atlas; each has its own dance', () => {
  const css = readFileSync('src/display/benny-caress.css', 'utf8') as string;
  for (const move of Object.values(BENNY_CARESS_MOVES)) {
    expect(move.ms).toBeGreaterThanOrEqual(1200);
    for (const [name, from, until] of move.poses) { expect(BENNY_REVEAL_POSES.poses[name]).toBeDefined(); expect(from).toBeLessThan(until); expect(until * 1000).toBeLessThanOrEqual(move.ms); }
    for (const [at] of move.cues) expect(at * 1000).toBeLessThan(move.ms);
    expect(css).toContain(`@keyframes bc-dance-${move.name} `);
  }
  expect(BENNY_CARESS_ORDER[0]).toBe('kiss');
  for (let k = 0; k < BENNY_CARESS_ORDER.length; k++) expect(BENNY_CARESS_ORDER[k]).not.toBe(BENNY_CARESS_ORDER[(k + 1) % BENNY_CARESS_ORDER.length]);
  expect(new Set(BENNY_CARESS_ORDER).size).toBe(Object.keys(BENNY_CARESS_MOVES).length);
});

it('without her atlas yet, Benny still plays her moments with her rest picture (no empty pose over her)', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false); resetBennyCaressAtlas(false);
  const {portrait} = sheet('benny');
  rub(portrait);
  expect(portrait.dataset.bennyCaress).toBe('kiss');
  expect(portrait.querySelectorAll('.bc-pose')).toHaveLength(0);
  expect(portrait.querySelector('.bc-has-poses')).toBeNull();
  expect(portrait.querySelector('.bc-kiss-heart')).not.toBeNull();
  pointer(portrait, 'pointerup', 22);
});

it('with reduced motion, Benny shows her kiss pose, a heart and the rainbow while she is caressed, nothing moving', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(true);
  const {portrait} = sheet('benny');
  rub(portrait);
  expect(portrait.dataset.petting).toBe('benny-still'); expect(portrait.dataset.bennyCaress).toBe('still');
  expect([...portrait.querySelectorAll<HTMLElement>('.bc-pose')].map(p => p.className)).toEqual(['br-pose bc-pose bc-pose-still']);
  expect(portrait.querySelectorAll('.bc-rainbow-frame')).toHaveLength(1);
  keepRubbing(portrait, 3000);
  expect(portrait.dataset.bennyCaress).toBe('still');
  expect(portrait.querySelector('.bc-heart, .bc-spark, .bc-ring, .bc-swirl, .bc-feather, .bc-finger-heart')).toBeNull();
  pointer(portrait, 'pointerup', 22); advance(BENNY_CARESS_SETTLE_MS + 20);
  expect(portrait.dataset.bennyCaress).toBeUndefined();
});

it('every other rabbit keeps exactly its short caress', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false);
  const {controller, portrait} = sheet('paille'); const perform = vi.spyOn(controller, 'perform');
  rub(portrait);
  expect(portrait.dataset.petting).toBe('wiggle'); expect(portrait.dataset.bennyCaress).toBeUndefined();
  expect(portrait.querySelectorAll('.pet-hearts .heart-icon')).toHaveLength(5);
  expect(portrait.querySelector('.bc-back, .bc-front, .bc-poses, .bc-pose')).toBeNull();
  // Still one caress every 1.5 s and 1.4 s of show.
  clock += 1600; pointer(portrait, 'pointermove', 70);
  expect(perform).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(1410);
  expect(portrait.dataset.petting).toBeUndefined();
  pointer(portrait, 'pointerup', 70);
});
