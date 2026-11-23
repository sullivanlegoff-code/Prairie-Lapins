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
import {BENNY_CARESS_IDLE_MS, BENNY_CARESS_HAND, BENNY_CARESS_MOVES, BENNY_CARESS_NAMES, BENNY_CARESS_SETTLE_MS, nextBennyMove, resetBennyCaressAtlas, type BennyMoveName} from '../src/ui/bennyCaress';
import {BENNY_REVEAL_POSES} from '../src/config/bennyArt';

// Benny's caress in her sheet (owner, 20 November 2026): several moments of joy that go on while the finger rubs and stop when it
// stops, picked at random one after the other (never one of the last two again); every other rabbit keeps its caress.
const cleanups: (() => void)[] = [];
let clock = 0;
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  clock = 10_000; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
  resetBennyCaressAtlas(true);
  // The first draw picks her kiss (the first of her moments), so the checks below know where she starts.
  vi.spyOn(Math, 'random').mockReturnValue(0);
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
const pointer = (target: Element, type: string, x: number, y = 20) => target.dispatchEvent(new PointerEvent(type, {pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true}));
/** A small random-number sequence that always gives the same draws. */
function seeded(seed: number) { let v = seed; return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646; }; }
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
  const draw = seeded(7); let first = true;
  vi.spyOn(Math, 'random').mockImplementation(() => { if (first) { first = false; return 0; } return draw(); });
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
  for (let k = 1; k < seen.length; k++) { expect(seen[k]).not.toBe(seen[k - 1]); expect(seen[k]).not.toBe(seen[k - 2]); }
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
    expect(css).toContain(`.portrait[data-benny-caress="${move.name}"] .bc-figure.bc-moving { animation: bc-dance-${move.name} `);
  }
  // Ten moments: the five first ones and the five new ones of 20 November 2026, one of them hopping on the spot.
  expect(BENNY_CARESS_NAMES).toHaveLength(10);
  expect(BENNY_CARESS_NAMES).toEqual(expect.arrayContaining(['kiss', 'hops', 'cuddle', 'twirl', 'roll', 'bounce', 'ears', 'rays', 'cloud', 'groom']));
  expect(BENNY_CARESS_MOVES.bounce.cues.filter(([, cue]) => cue === 'jump')).toHaveLength(4);
});

it('her next moment is drawn at random, never one of the last two, and every moment comes up', () => {
  const draw = seeded(11), played: BennyMoveName[] = [], counts = new Map<BennyMoveName, number>();
  for (let k = 0; k < 3000; k++) {
    const next = nextBennyMove(played, draw);
    expect(played.slice(-2)).not.toContain(next);
    played.push(next); counts.set(next, (counts.get(next) ?? 0) + 1);
  }
  for (const name of BENNY_CARESS_NAMES) expect(counts.get(name)!).toBeGreaterThan(200);
  // Not always the same order: two caresses with other draws start differently.
  const order = (seed: number) => { const d = seeded(seed), list: BennyMoveName[] = []; for (let k = 0; k < 6; k++) list.push(nextBennyMove(list, d)); return list.join(); };
  expect(new Set([1, 2, 3, 4, 5].map(order)).size).toBeGreaterThan(1);
  // Its edges stay inside the list.
  expect(BENNY_CARESS_NAMES).toContain(nextBennyMove([], () => .9999999));
  expect(nextBennyMove([], () => 0)).toBe('kiss');
});

it('Benny is easier to caress: rubbing up and down or slantwise works too, and the page does not scroll under the finger', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false);
  const {portrait} = sheet('benny');
  expect(portrait.dataset.petBenny).toBe('');
  expect(readFileSync('src/display/benny-caress.css', 'utf8') as string).toContain('.portrait.pettable[data-pet-benny] { touch-action: none; }');
  // A short stroke straight down is enough.
  pointer(portrait, 'pointerdown', 30, 20); pointer(portrait, 'pointermove', 30, 48);
  expect(portrait.dataset.bennyCaress).toBe('kiss');
  // Going on up and down keeps her moments going.
  for (let k = 0; k < 30; k++) { pointer(portrait, 'pointermove', 30 + (k % 2) * 8, k % 2 ? 20 : 50); advance(60); }
  expect(portrait.dataset.bennyCaress).not.toBe('settle'); expect(portrait.dataset.bennyCaress).toBeDefined();
  // A little painted glove strokes her where the finger is, leaning the way it goes.
  const hand = portrait.querySelector<HTMLImageElement>('.bc-fingers .bc-hand')!;
  expect(hand.getAttribute('src')).toBe(BENNY_CARESS_HAND!.url); expect(hand.getAttribute('src')).toContain('assets/effects/benny/hand.webp');
  expect(hand.classList.contains('bc-hand-on')).toBe(true);
  const box = portrait.getBoundingClientRect();
  pointer(portrait, 'pointermove', 52, 33);
  expect(hand.style.left).toBe(`${(52 - box.left).toFixed(0)}px`); expect(hand.style.top).toBe(`${(33 - box.top).toFixed(0)}px`);
  expect(hand.style.getPropertyValue('--lean')).toMatch(/^\d+deg$/);
  pointer(portrait, 'pointermove', 30, 33); expect(hand.style.getPropertyValue('--lean')).toMatch(/^-\d+deg$/);
  // Many finger hearts never push the hand out.
  keepRubbing(portrait, 3000); expect(portrait.querySelectorAll('.bc-hand')).toHaveLength(1);
  pointer(portrait, 'pointerup', 30, 20);
  // It fades with her settling, and goes with the caress.
  expect(readFileSync('src/display/benny-caress.css', 'utf8') as string).toContain('.portrait[data-benny-caress="settle"] .bc-fingers .bc-hand { opacity: 0;');
  advance(BENNY_CARESS_SETTLE_MS + 20); expect(portrait.querySelector('.bc-hand')).toBeNull();
});

it('other rabbits still need a sideways stroke', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false);
  const {portrait} = sheet('paille');
  expect(portrait.dataset.petBenny).toBeUndefined();
  pointer(portrait, 'pointerdown', 30, 20); pointer(portrait, 'pointermove', 30, 70); pointer(portrait, 'pointermove', 31, 20);
  expect(portrait.dataset.petting).toBeUndefined();
  pointer(portrait, 'pointerup', 31, 20);
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

it('measures her portrait once per finger move, even when a heart rises (plan 3.7)', () => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); reducedMotion(false);
  const {portrait} = sheet('benny'); rub(portrait);
  const measure = vi.spyOn(portrait, 'getBoundingClientRect');
  for (let i = 0; i < 20; i++) { advance(200); measure.mockClear(); pointer(portrait, 'pointermove', i % 2 ? 22 : 60); expect(measure.mock.calls.length).toBeLessThanOrEqual(1); }
  expect(portrait.querySelectorAll('.bc-finger-heart').length).toBeGreaterThan(0); // The heart branch did run.
});
