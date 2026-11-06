// @vitest-environment happy-dom
// @ts-expect-error -- the browser tsconfig has no Node types; Vitest runs this file in Node.
import {readFileSync} from 'node:fs';
import {afterEach, describe, expect, it} from 'vitest';
import {mountBennyFlightActivity} from '../src/ui/BennyFlightActivity';
import {BENNY_FLAPPY} from '../src/config/bennyFlightGameArt';

// Owner, 6 November 2026: « quand on clique on dirait que Benny dash en avant. ça doit être plus plus smooth ».
const STEP = 1000 / 60;
function mount() {
  let now = 1000;
  const activity = mountBennyFlightActivity(document.body, {onFinished: () => '', clock: () => now, frame: () => 0});
  activity.open({id: 'benny'} as never);
  document.querySelector<HTMLElement>('[data-benny-flight-start]')!.click();
  const benny = document.querySelector<HTMLElement>('.benny-flight-benny')!;
  const read = () => {
    const match = /translate3d\(([\d.-]+)px, ([\d.-]+)px.*rotate\(([\d.-]+)deg/.exec(benny.style.transform)!;
    return {x: +match[1], y: +match[2], tilt: +match[3], wing: parseFloat(benny.style.backgroundPositionX || '0')};
  };
  return {activity, benny, read, tick() { now += STEP; activity.update(); }};
}
afterEach(() => { document.body.innerHTML = ''; });

describe('Benny’s wing beat', () => {
  it('never pushes her forward, never jumps her tilt, and keeps her wings going', () => {
    const {activity, benny, read, tick} = mount();
    activity.flap(); for (let k = 0; k < 20; k++) tick();
    const before = read(), wingStep = 100 / (BENNY_FLAPPY.frames - 1);
    let previous = before, biggestTurn = 0;
    activity.flap();
    for (let k = 0; k < 12; k++) {
      tick(); const shown = read();
      expect(shown.x).toBe(before.x);
      biggestTurn = Math.max(biggestTurn, Math.abs(shown.tilt - previous.tilt));
      // One frame further at most (or round to the first): the wings never restart from their top.
      const moved = shown.wing - previous.wing;
      expect(moved === 0 || Math.abs(moved - wingStep) < .01 || shown.wing === 0).toBe(true);
      previous = shown;
    }
    expect(biggestTurn).toBeLessThan(3);
    expect(benny.classList.contains('flap')).toBe(false);
    activity.dispose();
  });
  it('glides her drawn height towards the rules, without changing them', () => {
    const {activity, read, tick} = mount();
    activity.flap(); for (let k = 0; k < 20; k++) tick();
    const before = read().y; activity.flap(); tick();
    const first = read().y - before;
    // The test's stage is 1 px high, so her drawn height is in stage heights here.
    expect(Math.abs(first)).toBeLessThan(.01); // Barely moved on the first frame after the touch…
    for (let k = 0; k < 6; k++) tick();
    expect(read().y).toBeLessThan(before - .03); // …and well on her way up shortly after.
    activity.dispose();
  });
  it('has no stretch left in the style sheet', () => {
    const css = readFileSync('src/display/benny-flight.css', 'utf8') as string;
    expect(css).not.toContain('benny-flight-flap');
  });
});
