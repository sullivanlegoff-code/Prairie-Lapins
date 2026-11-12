// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mountBennyRunActivity} from '../src/ui/BennyRunActivity';

/** The run's screen, driven by a hand clock and hand frames (no canvas drawing in happy-dom). */
function mount(best = 0) {
  let now = 1000; const frames: (() => void)[] = [], sounds: string[] = [], finished: unknown[] = [];
  const activity = mountBennyRunActivity(document.body, {clock: () => now, frame: step => frames.push(step), best: () => best,
    sound: kind => sounds.push(kind), onFinished: summary => { finished.push(summary); }});
  activity.open();
  const step = (ms: number) => { for (let t = 0; t < ms; t += 16) { now += 16; vi.advanceTimersByTime(16); const pending = frames.splice(0); for (const f of pending) f(); } };
  return {activity, step, sounds, finished, key: (key: string) => document.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))};
}
const upright = (width: number, height: number) => { Object.defineProperty(window, 'innerWidth', {value: width, configurable: true}); Object.defineProperty(window, 'innerHeight', {value: height, configurable: true}); };
beforeEach(() => { upright(390, 844); vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); });
afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers(); });

describe('« Cours cours Benny ! » screen', () => {
  it('starts the first run with the tutorial, answers the arrow keys at once, and plays a sound for a jump', () => {
    const {activity, step, sounds, key} = mount();
    document.querySelector<HTMLElement>('[data-benny-run-start]')!.click(); step(100);
    const g = activity.game!;
    expect(g.tutorial).not.toBeNull();
    expect(document.querySelector<HTMLElement>('.benny-run-coach')!.hidden).toBe(false);
    key('ArrowLeft'); expect(g.lane).toBe(0);
    key('ArrowUp'); expect(sounds).toContain('jump');
  });
  it('draws ahead of the last rule step but leaves the run itself on its steps', () => {
    const {activity, step} = mount(50);
    document.querySelector<HTMLElement>('[data-benny-run-start]')!.click(); step(100);
    const g = activity.game!, steps = (g.at - g.startedAt) / (1000 / 120);
    step(16 * 7);
    const after = (g.at - g.startedAt) / (1000 / 120);
    expect(Math.abs(after - Math.round(after))).toBeLessThan(1e-6); expect(Math.round(after - steps)).toBeGreaterThanOrEqual(13);
  });
  it('shows the Dragon’s countdown after a bump, then a short scene a tap skips, then the score card', () => {
    const {activity, step, finished} = mount(50);
    document.querySelector<HTMLElement>('[data-benny-run-start]')!.click(); step(100);
    const g = activity.game!;
    expect(g.tutorial).toBeNull();
    g.entities = [{id: 9001, kind: 'pillar', lane: g.lane, z: g.distance + 2}]; step(400);
    const danger = document.querySelector<HTMLElement>('.benny-run-danger')!;
    expect(danger.hidden).toBe(false); expect(danger.textContent).toMatch(/La Dragon te talonne/);
    g.entities = [{id: 9002, kind: 'pillar', lane: g.lane, z: g.distance + 2}]; step(400);
    expect(g.over).toBe(true);
    // The scene plays first: no card yet; a tap skips it.
    const card = document.querySelector<HTMLElement>('[data-benny-run-card]')!;
    expect(card.hidden).toBe(true); expect(finished).toHaveLength(0);
    document.querySelector('canvas')!.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
    expect(card.hidden).toBe(false); expect(card.textContent).toMatch(/La Dragon a rattrapé Benny/); expect(finished).toHaveLength(1);
  });
  it('plays a shock wave in slow motion for a moment, then at full pace again', () => {
    const {activity, step, key} = mount(50);
    document.querySelector<HTMLElement>('[data-benny-run-start]')!.click(); step(100);
    const g = activity.game!; g.entities = []; g.nextSpawnZ = Infinity; for (const w of g.walls) w.runnable = true;
    key('ArrowLeft'); key('ArrowLeft'); expect(g.wall).not.toBeNull();
    for (const lane of [0, 1, 2]) g.entities.push({id: 9100 + lane, kind: 'ember', lane, z: g.distance + 3});
    key('ArrowDown'); step(200);
    const before = g.at; step(160); const slow = g.at - before;
    step(900); const after = g.at; step(160); const full = g.at - after;
    expect(g.foes).toBe(3); expect(slow).toBeLessThan(full * .6); expect(full).toBeGreaterThan(140);
  });
  it('answers one move per finger down: a turn without lifting the finger does nothing, a new touch answers again', () => {
    const {activity, step} = mount(50);
    document.querySelector<HTMLElement>('[data-benny-run-start]')!.click(); step(100);
    const g = activity.game!, canvas = document.querySelector('canvas')!, lane = g.lane;
    const at = (type: string, x: number, y: number) => canvas.dispatchEvent(new PointerEvent(type, {bubbles: true, clientX: x, clientY: y, pointerId: 1}));
    at('pointerdown', 100, 300); at('pointermove', 125, 300); expect(g.lane).toBe(lane + 1);
    at('pointermove', 160, 300); expect(g.lane).toBe(lane + 1); // Still the same swipe, a little longer.
    at('pointermove', 160, 270); at('pointerup', 160, 270); expect(g.airUntil).toBeLessThanOrEqual(g.at); // Then up, without lifting: nothing.
    at('pointerdown', 200, 300); at('pointermove', 200, 260); at('pointerup', 200, 260); expect(g.airUntil).toBeGreaterThan(g.at); // A new touch: up.
  });
  it('moves one lane per swipe: holding the finger and going on the same way does not move her again', () => {
    const {activity, step} = mount(50);
    document.querySelector<HTMLElement>('[data-benny-run-start]')!.click(); step(100);
    const g = activity.game!, canvas = document.querySelector('canvas')!, lane = g.lane;
    const at = (type: string, x: number, y: number) => canvas.dispatchEvent(new PointerEvent(type, {bubbles: true, clientX: x, clientY: y, pointerId: 1}));
    at('pointerdown', 100, 300); at('pointermove', 125, 300); expect(g.lane).toBe(lane + 1);
    for (let x = 150; x <= 400; x += 25) at('pointermove', x, 300); // A long hold, the finger going on to the right.
    expect(g.lane).toBe(lane + 1); expect(g.wall).toBeNull(); // A second move would have taken her up the edge wall.
    at('pointerup', 400, 300);
  });
  it('says so at once when the run beats the record, and turns the score gold', () => {
    const {activity, step, sounds} = mount(50);
    document.querySelector<HTMLElement>('[data-benny-run-start]')!.click(); step(100);
    const g = activity.game!, score = document.querySelector<HTMLElement>('.benny-run-score')!;
    step(100); expect(score.classList.contains('benny-run-beaten')).toBe(false);
    g.score = 51; step(50);
    expect(score.classList.contains('benny-run-beaten')).toBe(true); expect(sounds).toContain('power');
    expect(document.querySelector('.benny-run-pop')?.textContent ?? '').toMatch(/Nouveau record/);
  });
  it('pauses on the button, then counts 3, 2, 1 before the run goes on', () => {
    const {activity, step} = mount(50);
    document.querySelector<HTMLElement>('[data-benny-run-start]')!.click(); step(100);
    const g = activity.game!;
    document.querySelector<HTMLElement>('[data-benny-run-pause]')!.click();
    const card = document.querySelector<HTMLElement>('[data-benny-run-card]')!, at = g.at;
    expect(card.hidden).toBe(false); expect(activity.playing).toBe(false);
    step(500); expect(g.at).toBe(at);
    document.querySelector<HTMLElement>('[data-benny-run-resume]')!.click();
    expect(card.hidden).toBe(true); expect(document.querySelector('.benny-run-pop')!.textContent).toBe('3');
    step(1000); expect(g.at).toBe(at); expect(activity.playing).toBe(false);
    step(600); expect(activity.playing).toBe(true); expect(g.at).toBeGreaterThan(at);
  });
  it('pauses held sideways and refuses to start until the iPhone is upright again', () => {
    upright(844, 390);
    const {activity} = mount(50);
    window.dispatchEvent(new Event('resize'));
    expect(document.querySelector<HTMLElement>('[data-benny-run-turn]')!.hidden).toBe(false);
    document.querySelector<HTMLElement>('[data-benny-run-start]')?.click();
    expect(activity.playing).toBe(false);
  });
});
