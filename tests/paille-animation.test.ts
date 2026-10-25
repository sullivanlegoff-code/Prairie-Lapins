// @vitest-environment happy-dom
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {pailleAnimation, pailleLines} from '../src/ui/onboarding';
import {PailleDialogue} from '../src/ui/PailleDialogue';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame} from '../src/simulation';

const task = vi.hoisted(() => ({scene: 1}));
vi.mock('../src/ui/onboarding', async importOriginal => {
  const original = await importOriginal<typeof import('../src/ui/onboarding')>();
  return {...original, onboardingTask: (...args: Parameters<typeof original.onboardingTask>) => ({
    ...original.onboardingTask(...args), scene: task.scene,
  })};
});
let dialogue: PailleDialogue;
let motion: MediaQueryList;
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); task.scene = 1;
  motion = Object.assign(new EventTarget(), {matches: false}) as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => motion));
  HTMLDialogElement.prototype.show = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { dialogue?.dispose(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function show(scene = 1) {
  task.scene = scene;
  dialogue = new PailleDialogue(new PreferenceStore('animation-test'), () => true, vi.fn(), vi.fn(), vi.fn());
  const state = createGame(0);
  dialogue.update(state, true);
  return state;
}
const actor = () => dialogue.element.querySelector('.slot-paille .paille-motion')!;

it.each([
  [1, 0, 'Bienvenue', {gesture: 'hop'}],
  [1, 1, 'Ici, tu vas pouvoir', {gesture: 'hop'}],
  [1, 3, 'Miel, c’est un très joli prénom', {gesture: 'flip'}],
  [1, 4, 'Je m’ennuie ici', {hearts: true}],
  [2, 0, 'J’ai une folle envie d’herbe à grignoter', {gesture: 'dizzy'}],
  [3, 0, 'La ferme permet', {hearts: true}],
  [4, 0, 'Une fois bien nourris', {gesture: 'hop'}],
  [5, 0, 'Viens, on fait nos bails', {gesture: 'flip', hearts: true, neigeReply: true}],
  [6, 1, 'Quand il est prêt', {gesture: 'hop'}],
  [7, 0, 'Je suis né d’un amour très fort', {gesture: 'flip', hearts: true}],
  [10, 0, 'Plus tu nous nourris', {hearts: true}],
] as const)('maps scene %s line %s beside its exact script', (scene, line, text, animation) => {
  expect(pailleLines(scene, 'Miel')[line]).toContain(text);
  expect(pailleAnimation(scene, line)).toEqual(animation);
});
it('leaves unlisted lines with idle only', () => {
  for (const [scene, line] of [[1, 2], [6, 0], [7, 1], [8, 0], [9, 0], [11, 0], [99, 0]]) {
    expect(pailleAnimation(scene, line)).toEqual({});
  }
});
it.each([[1, 'hop'], [2, 'dizzy'], [4, 'hop'], [5, 'flip'], [7, 'flip']] as const)(
  'applies the gesture on displaying scene %s, with the image flip on a separate element', (scene, gesture) => {
    const state = show(scene);
    expect(actor().classList.contains(`paille-${gesture}`)).toBe(true);
    expect(actor().querySelector('.actor-paille')).toBeTruthy();
    vi.advanceTimersByTime(900);
    expect(actor().className).toBe('paille-motion');
    dialogue.update(state, true); // A game refresh is not a new line.
    expect(actor().className).toBe('paille-motion');
  },
);
it('responds with Neige and removes all hearts after their staggered animation', () => {
  show(5);
  expect(dialogue.element.querySelector('.slot-neige .paille-hop')).toBeTruthy();
  expect(dialogue.element.querySelectorAll('.slot-paille .paille-heart')).toHaveLength(4);
  expect(dialogue.element.querySelectorAll('.slot-neige .paille-heart')).toHaveLength(1);
  vi.advanceTimersByTime(1770);
  expect(dialogue.element.querySelector('.paille-heart')).toBeNull();
  expect(vi.getTimerCount()).toBe(1); // Only the rare spontaneous hop remains.
});
it('interrupts the current animation immediately when advancing, including the naming flip', () => {
  show(); const first = actor(); dialogue.element.click();
  expect(first.className).toBe('paille-motion'); expect(first.isConnected).toBe(false);
  expect(actor().classList.contains('paille-hop')).toBe(true);
  dialogue.element.click(); expect(actor().className).toBe('paille-motion');
  dialogue.element.querySelector('input')!.value = 'Miel';
  dialogue.element.querySelector('form')!.dispatchEvent(new Event('submit', {cancelable: true}));
  expect(actor().classList.contains('paille-flip')).toBe(true);
  dialogue.element.click();
  expect(actor().className).toBe('paille-motion');
  expect(dialogue.element.querySelectorAll('.paille-heart')).toHaveLength(4);
  dialogue.close(); expect(dialogue.element.querySelector('.paille-heart')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
it.each([[0, 6000], [.5, 9000], [.999, 11994]])('plans a rare hop with random=%s then cancels on close', (random, delay) => {
  vi.spyOn(Math, 'random').mockReturnValue(random); show(8);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(delay - 1); expect(actor().className).toBe('paille-motion');
  vi.advanceTimersByTime(1); expect(actor().classList.contains('paille-hop')).toBe(true);
  vi.advanceTimersByTime(800); expect(actor().className).toBe('paille-motion');
  expect(vi.getTimerCount()).toBe(1);
  dialogue.close(); expect(vi.getTimerCount()).toBe(0);
  vi.advanceTimersByTime(24000); expect(actor().className).toBe('paille-motion');
});
it('creates neither gestures, hearts nor timers with reduced motion', () => {
  Object.assign(motion, {matches: true}); show(5);
  expect(actor().className).toBe('paille-motion');
  expect(dialogue.element.querySelector('.paille-heart, .paille-hop')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
it('cancels active effects when reduced motion is enabled while open and removes the listener on disposal', () => {
  const remove = vi.spyOn(motion, 'removeEventListener'); show(5);
  Object.assign(motion, {matches: true}); motion.dispatchEvent(new Event('change'));
  expect(actor().className).toBe('paille-motion');
  expect(dialogue.element.querySelector('.paille-heart')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  dialogue.dispose(); expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
});
