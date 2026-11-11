// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {mountBennyRunActivity} from '../src/ui/BennyRunActivity';

/** The run's screen, driven by a hand clock and hand frames (no canvas drawing in happy-dom). */
function mount(best = 0) {
  let now = 1000; const frames: (() => void)[] = [], sounds: string[] = [], finished: unknown[] = [];
  const activity = mountBennyRunActivity(document.body, {clock: () => now, frame: step => frames.push(step), best: () => best,
    sound: kind => sounds.push(kind), onFinished: summary => { finished.push(summary); }});
  activity.open();
  const step = (ms: number) => { for (let t = 0; t < ms; t += 16) { now += 16; const pending = frames.splice(0); for (const f of pending) f(); } };
  return {activity, step, sounds, finished, key: (key: string) => document.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))};
}
const upright = (width: number, height: number) => { Object.defineProperty(window, 'innerWidth', {value: width, configurable: true}); Object.defineProperty(window, 'innerHeight', {value: height, configurable: true}); };
beforeEach(() => upright(390, 844));
afterEach(() => { document.body.innerHTML = ''; });

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
  it('pauses held sideways and refuses to start until the iPhone is upright again', () => {
    upright(844, 390);
    const {activity} = mount(50);
    window.dispatchEvent(new Event('resize'));
    expect(document.querySelector<HTMLElement>('[data-benny-run-turn]')!.hidden).toBe(false);
    document.querySelector<HTMLElement>('[data-benny-run-start]')?.click();
    expect(activity.playing).toBe(false);
  });
});
