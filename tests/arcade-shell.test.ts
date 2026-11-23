// @vitest-environment happy-dom
import {afterEach, describe, expect, it} from 'vitest';
import {arcadeShell} from '../src/ui/arcadeShell';
import {pausableClock} from '../src/ui/activityPause';
import {FULLSCREEN_ACTIVITY_EVENT} from '../src/config/bennyFlightGameArt';
import {mountJumpRopeActivity} from '../src/ui/JumpRopeActivity';
import {mountSkyGiftsActivity} from '../src/ui/SkyGiftsActivity';
import {mountBennyFlightActivity} from '../src/ui/BennyFlightActivity';
import jumpRopeSource from '../src/ui/JumpRopeActivity.ts?raw';
import skyGiftsSource from '../src/ui/SkyGiftsActivity.ts?raw';
import flightSource from '../src/ui/BennyFlightActivity.ts?raw';

const aborts: AbortController[] = [];
afterEach(() => { for (const a of aborts.splice(0)) a.abort(); document.body.replaceChildren(); });
function setup() {
  let now = 0, running = false;
  const frames: (() => void)[] = [], abort = new AbortController(); aborts.push(abort);
  const layer = document.createElement('div'), card = document.createElement('div'); layer.append(card); document.body.append(layer); layer.hidden = true;
  const calls: string[] = [], time = pausableClock(() => now);
  const shell = arcadeShell({layer, card, signal: abort.signal, time, frame: step => frames.push(step),
    running: {get: () => running, set: value => { running = value; }}, names: {title: 'game-title', resume: 'gameResume', quit: 'gameQuit'},
    update: () => calls.push('update'), onResume: () => calls.push('resume'), onClose: () => calls.push('close'), onExit: () => calls.push('exit')});
  return {shell, layer, card, calls, frames, time, advance: (ms: number) => { now += ms; }, get running() { return running; }, set running(v: boolean) { running = v; }};
}

describe('one shell for the three arcade games (plan 3.9)', () => {
  it('shows the game full screen, runs one frame at a time, and stops the loop when the game stops', () => {
    const t = setup(), events: boolean[] = [];
    window.addEventListener(FULLSCREEN_ACTIVITY_EVENT, e => events.push((e as CustomEvent<boolean>).detail), {signal: aborts[0].signal});
    t.shell.show(); expect(t.layer.hidden).toBe(false); expect(events).toEqual([true]);
    t.running = true; t.shell.schedule(); t.shell.schedule(); expect(t.frames).toHaveLength(1);
    t.frames.shift()!(); expect(t.calls).toEqual(['update']); expect(t.frames).toHaveLength(1);
    t.running = false; t.frames.shift()!(); expect(t.calls).toEqual(['update']); expect(t.frames).toHaveLength(0);
  });
  it('pauses when Safari puts the page away, its clock frozen, and resumes where it was', () => {
    const t = setup(); t.shell.show(); t.running = true;
    t.advance(1000); window.dispatchEvent(new Event('pagehide'));
    expect(t.running).toBe(false); expect(t.card.hidden).toBe(false);
    expect(t.card.querySelector('.game-title')?.textContent).toBe('Partie en pause');
    expect(t.card.querySelector('[data-game-resume]')?.textContent).toBe('Reprendre');
    expect(t.card.querySelector('[data-game-quit]')?.textContent).toBe('Quitter');
    t.advance(60_000); expect(t.time.now()).toBe(1000);
    t.card.querySelector<HTMLButtonElement>('[data-game-resume]')!.click();
    expect(t.running).toBe(true); expect(t.card.hidden).toBe(true); expect(t.calls).toEqual(['resume']); expect(t.frames).toHaveLength(1);
    expect(t.time.now()).toBe(1000);
  });
  it('leaves once: the game forgets its round, the layer hides, the meadow comes back', () => {
    const t = setup(), events: boolean[] = [];
    window.addEventListener(FULLSCREEN_ACTIVITY_EVENT, e => events.push((e as CustomEvent<boolean>).detail), {signal: aborts[0].signal});
    t.shell.show(); t.running = true; t.shell.pause();
    t.card.querySelector<HTMLButtonElement>('[data-game-quit]')!.click();
    expect(t.running).toBe(false); expect(t.layer.hidden).toBe(true); expect(t.calls).toEqual(['close', 'exit']); expect(events).toEqual([true, false]);
    t.shell.close(); expect(t.calls).toEqual(['close', 'exit']);
  });
  it('is the one the three games use (their own pause code is gone)', () => {
    for (const source of [jumpRopeSource, skyGiftsSource, flightSource]) {
      expect(source).toContain('arcadeShell(');
      expect(source).not.toMatch(/function (pause|resume|close|loop|schedule|showCard)\(/);
    }
    expect([mountJumpRopeActivity, mountSkyGiftsActivity, mountBennyFlightActivity].every(f => typeof f === 'function')).toBe(true);
  });
});
