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
import {BENNY_CARESS_LANDINGS, BENNY_CARESS_MS, BENNY_CARESS_POSES, BENNY_CARESS_POSES_END, BENNY_CARESS_REDUCED_MS, resetBennyCaressAtlas} from '../src/ui/bennyCaress';
import {BENNY_REVEAL_POSES} from '../src/config/bennyArt';

// Benny's caress in her sheet (owner, 20 November 2026): a kiss, then a big moment of joy; every other rabbit keeps its caress.
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

it('caressing Benny plays her kiss and her joy, in her paintings, and counts like any caress', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false);
  const {controller, portrait, id} = sheet('benny'); const perform = vi.spyOn(controller, 'perform');
  rub(portrait);
  expect(perform).toHaveBeenCalledWith({type: 'petRabbit', rabbitId: id});
  expect(portrait.dataset.petting).toBe('benny'); expect(portrait.dataset.bennyCaress).toBe('show');
  // Not the short caress of the others.
  expect(portrait.querySelector('.pet-hearts')).toBeNull();
  // The kiss: her paw at her mouth, eyes closed, then a big painted heart that flies at the player.
  const poses = [...portrait.querySelectorAll<HTMLElement>('.bc-poses .bc-pose')].map(p => p.dataset.pose);
  expect(poses).toEqual(BENNY_CARESS_POSES.map(([name]) => name));
  expect(poses).toContain('groom-5'); expect(poses.filter(p => p === 'hop-4')).toHaveLength(2); expect(poses).toContain('flop-1');
  expect(portrait.querySelector('.bc-kiss-heart')?.getAttribute('src')).toContain('assets/effects/spa/coeur');
  // Her joy: rainbow, prisms, glow, swirl, hearts, stars at each landing, rings, twinkles, feathers.
  expect(portrait.querySelectorAll('.bc-rainbow-frame')).toHaveLength(8);
  expect(portrait.querySelectorAll('.bc-prism')).toHaveLength(2);
  expect(portrait.querySelectorAll('.bc-heart').length).toBeGreaterThanOrEqual(10);
  expect(portrait.querySelectorAll('.bc-ring')).toHaveLength(BENNY_CARESS_LANDINGS.length);
  expect(portrait.querySelectorAll('.bc-spark').length).toBeGreaterThanOrEqual(12);
  for (const selector of ['.bc-glow', '.bc-swirl', '.bc-trail', '.bc-stardust', '.bc-twinkle', '.bc-feather']) expect(portrait.querySelector(selector), selector).not.toBeNull();
  // Painted pictures only: every image is one of the game's painted files, no canvas, no SVG.
  for (const img of portrait.querySelectorAll<HTMLImageElement>('.bc-back img, .bc-front img')) expect(img.getAttribute('src')).toMatch(/assets\/(effects\/(benny|spa)|currency)\//);
  expect(portrait.querySelector('canvas, svg')).toBeNull();
  // Long enough to be a real show, and rubbing on does not cut it.
  expect(BENNY_CARESS_MS).toBeGreaterThanOrEqual(2500);
  clock += 2000; pointer(portrait, 'pointermove', 70); pointer(portrait, 'pointermove', 10);
  expect(perform).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(BENNY_CARESS_MS - 10);
  expect(portrait.dataset.bennyCaress).toBe('show');
  vi.advanceTimersByTime(20);
  expect(portrait.dataset.bennyCaress).toBeUndefined(); expect(portrait.dataset.petting).toBeUndefined();
  expect(portrait.querySelector('.bc-back, .bc-front, .bc-poses')).toBeNull();
  pointer(portrait, 'pointerup', 10);
});

it('her poses follow one another without a gap and stop before the end; they exist in her atlas', () => {
  for (let k = 1; k < BENNY_CARESS_POSES.length; k++) expect(BENNY_CARESS_POSES[k]![1]).toBeCloseTo(BENNY_CARESS_POSES[k - 1]![2], 5);
  expect(BENNY_CARESS_POSES[0]![1]).toBe(0);
  expect(BENNY_CARESS_POSES.at(-1)![2]).toBeCloseTo(BENNY_CARESS_POSES_END, 5);
  expect(BENNY_CARESS_POSES_END * 1000).toBeLessThan(BENNY_CARESS_MS);
  for (const [name] of BENNY_CARESS_POSES) expect(BENNY_REVEAL_POSES.poses[name]).toBeDefined();
  const css = readFileSync('src/display/benny-caress.css', 'utf8') as string;
  expect(css).toContain(`bc-hidden ${BENNY_CARESS_POSES_END}s`);
  for (const name of ['bc-dance', 'bc-kiss', 'bc-heart', 'bc-spark', 'bc-ring', 'bc-prism']) expect(css).toContain(`@keyframes ${name} `);
});

it('without her atlas yet, Benny still plays her show with her rest picture (no empty pose over her)', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false); resetBennyCaressAtlas(false);
  const {portrait} = sheet('benny');
  rub(portrait);
  expect(portrait.dataset.bennyCaress).toBe('show');
  expect(portrait.querySelectorAll('.bc-pose')).toHaveLength(0);
  expect(portrait.querySelector('.bc-has-poses')).toBeNull();
  expect(portrait.querySelector('.bc-kiss-heart')).not.toBeNull();
  pointer(portrait, 'pointerup', 22);
});

it('with reduced motion, Benny only shows her kiss pose, a heart and the rainbow, briefly', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(true);
  const {portrait} = sheet('benny');
  rub(portrait);
  expect(portrait.dataset.petting).toBe('benny-still'); expect(portrait.dataset.bennyCaress).toBe('still');
  expect([...portrait.querySelectorAll<HTMLElement>('.bc-pose')].map(p => p.className)).toEqual(['br-pose bc-pose bc-pose-still']);
  expect(portrait.querySelector('.bc-kiss-heart')).not.toBeNull();
  expect(portrait.querySelectorAll('.bc-rainbow-frame')).toHaveLength(1);
  expect(portrait.querySelector('.bc-heart, .bc-spark, .bc-ring, .bc-swirl, .bc-feather')).toBeNull();
  expect(BENNY_CARESS_REDUCED_MS).toBeLessThan(BENNY_CARESS_MS);
  vi.advanceTimersByTime(BENNY_CARESS_REDUCED_MS + 10);
  expect(portrait.dataset.bennyCaress).toBeUndefined();
  pointer(portrait, 'pointerup', 22);
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
