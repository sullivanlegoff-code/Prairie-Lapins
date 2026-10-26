// @vitest-environment happy-dom
import {describe, expect, it, vi} from 'vitest';
import {DadiReactions, DADI_BREEDING, DADI_IDLE, DADI_INTERVAL, DADI_SPEECH_DURATION, DADI_WELCOME} from '../src/display/dadiReactions';
import {DadiSpeech, dadiHeadVisible} from '../src/display/dadiSpeech';
import {createRabbitMotion, rabbitPose, stepRabbitMotion, triggerWelcomeSalto} from '../src/display/rabbitMotion';
import {GameController} from '../src/application/GameController';
import {encodeGame} from '../src/simulation';
import {SAVE_KEY} from '../src/persistence/storage';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {previousStart} from './regression-start';
import type {Command, GameState} from '../src/state/types';

function resident(): GameState {
  const s = previousStart(0); delete s.initiation;
  s.progression = {totalXp: cumulativeLevelXp(11), rewardedThroughLevel: 11};
  s.rabbits[0].species = 'dadi'; s.discovered.push('dadi'); s.rabbits.forEach(r => r.affection = 6);
  return s;
}
function tick(dadi: DadiReactions, duration: number, visible = ['rabbit-2']) {
  let result = dadi.step(0, true, visible);
  for (let t = 0; t < duration; t += 250) result = dadi.step(Math.min(250, duration - t), true, visible);
  return result;
}
function bind(s: GameState, rng = vi.fn(() => .9)) {
  let value = encodeGame(s), failWrite = false;
  const storage = {getItem: (key: string) => key === SAVE_KEY ? value : null, setItem: (_key: string, v: string) => { if (failWrite) throw Error('quota'); value = v; }};
  const controller = new GameController(storage, () => 0, rng), dadi = new DadiReactions(() => 0);
  const stopState = controller.subscribe(snapshot => dadi.sync(snapshot.state, snapshot.generation));
  const stopCommand = controller.onConfirmedCommand(command => dadi.confirmed(command));
  return {controller, dadi, rng, fail: () => {failWrite = true;}, dispose: () => {stopState(); stopCommand(); controller.dispose();}};
}

describe('Dadi reacts only to confirmed commands', () => {
  it('welcomes a real nursery baby once and never repeats it on refresh or reload', () => {
    const s = previousStart(0); delete s.initiation;
    s.progression = {totalXp: cumulativeLevelXp(11), rewardedThroughLevel: 11};
    const babyId = `birth-${s.nextId++}`;
    s.buildings.find(b => b.kind === 'nursery')!.nursery!.babies.push({slot: 0, birth: {id: babyId, species: 'dadi', guaranteed: false, reservedDiscovery: false}, startedAt: 0, readyAt: 0});
    const f = bind(s);
    expect(f.controller.perform({type: 'welcome', birthId: babyId, enclosureId: 'building-1'}).ok).toBe(true);
    expect(f.dadi.step(0, true, [babyId]).started).toEqual({id: babyId, text: DADI_WELCOME, salto: true});
    f.controller.refresh();
    expect(f.dadi.step(0, true, [babyId]).started).toBeNull();
    expect(f.controller.perform({type: 'welcome', birthId: babyId, enclosureId: 'building-1'}).ok).toBe(false);
    tick(f.dadi, DADI_SPEECH_DURATION, [babyId]);
    expect(f.dadi.step(0, true, [babyId]).speech).toBeNull();
    const reloaded = bind(f.controller.getSnapshot().state!);
    expect(reloaded.dadi.step(0, true, [babyId]).speech).toBeNull();
    expect(f.rng).not.toHaveBeenCalled(); f.dispose(); reloaded.dispose();
  });
  it('speaks at the nest only if Dadi is a parent; failed and unsaved commands produce no reaction', () => {
    const f = bind(resident());
    const breed: Command = {type: 'breed', parents: ['rabbit-2', 'rabbit-3']};
    expect(f.controller.perform({...breed, parents: ['rabbit-2', 'missing']}).ok).toBe(false);
    expect(f.dadi.step(0, true, ['rabbit-2']).speech).toBeNull();
    f.fail(); expect(f.controller.perform(breed)).toMatchObject({ok: false, reason: 'ACTION_NOT_SAVED'});
    expect(f.dadi.step(0, true, ['rabbit-2']).speech).toBeNull(); f.dispose();
    const saved = bind(resident());
    expect(saved.controller.perform(breed).ok).toBe(true);
    expect(saved.dadi.step(0, true, ['rabbit-2']).started).toEqual({id: 'rabbit-2', text: DADI_BREEDING, salto: false});
    expect(saved.rng).toHaveBeenCalledTimes(1); saved.dispose();
    const other = resident(); other.rabbits[0].species = 'paille';
    const absent = bind(other); expect(absent.controller.perform(breed).ok).toBe(true);
    expect(absent.dadi.step(0, true, ['rabbit-2']).speech).toBeNull(); absent.dispose();
  });
  it('isolates broken presentation listeners and disposes/unsubscribes them', () => {
    const f = bind(resident()), listener = vi.fn(() => {throw Error('display');});
    const stop = f.controller.onConfirmedCommand(listener);
    expect(f.controller.perform({type: 'feed', id: 'rabbit-2'}).ok).toBe(false); // Not enough food.
    expect(listener).not.toHaveBeenCalled();
    expect(f.controller.perform({type: 'breed', parents: ['rabbit-2', 'rabbit-3']}).ok).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1); stop(); f.dispose();
    expect(f.controller.perform({type: 'claimHearts'})).toMatchObject({ok: false, reason: 'DISPOSED'});
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('Dadi session timing and lifecycle', () => {
  it.each([0, .9])('draws one of the two lines every ten active minutes (roll %s)', roll => {
    const dadi = new DadiReactions(() => roll); dadi.sync(resident(), 0);
    expect(tick(dadi, DADI_INTERVAL - 250).speech).toBeNull();
    const line = dadi.step(250, true, ['rabbit-2']);
    expect(line.started).toEqual({id: 'rabbit-2', text: DADI_IDLE[roll < .5 ? 0 : 1], salto: false});
    expect(tick(dadi, DADI_SPEECH_DURATION).speech).toBeNull();
  });
  it('does not consume hidden time, catch up long frames, or speak for a rabbit at the nest/on a trip', () => {
    const dadi = new DadiReactions(() => 0), s = resident(); dadi.sync(s, 0);
    expect(dadi.step(24 * 60 * 60_000, false, ['rabbit-2']).speech).toBeNull();
    expect(dadi.step(DADI_INTERVAL, true, ['rabbit-2']).speech).toBeNull();
    s.travel = {welcomed: true, trips: [{rabbitId: 'rabbit-2', destination: 'Paris', startedAt: 0, endsAt: 3 * 3_600_000, hearts: 1}]};
    dadi.sync(s, 0); expect(tick(dadi, DADI_INTERVAL).speech).toBeNull();
    delete s.travel; s.buildings.find(b => b.kind === 'nest')!.breeding = {parents: ['rabbit-2', 'rabbit-3'], startedAt: 0, endsAt: 20 * 60_000, birth: {id: 'birth-6', species: 'neige', guaranteed: false, reservedDiscovery: false}};
    dadi.sync(s, 0); expect(tick(dadi, DADI_INTERVAL).speech).toBeNull();
  });
  it('waits for the visible sprite/menu closure, then clears speech on hiding and game replacement', () => {
    const dadi = new DadiReactions(), s = resident(); dadi.sync(s, 0);
    dadi.confirmed({type: 'welcome', birthId: 'rabbit-2', enclosureId: 'building-1'});
    expect(dadi.step(0, true, []).speech).toBeNull();
    expect(tick(dadi, 30_000, []).speech).toBeNull(); // An image request or offscreen habitat may take time: keep the welcome.
    for (let n = 0; n < 100; n++) expect(dadi.step(0, true, []).speech).toBeNull(); // Open menu: pause without consuming the event.
    const first = dadi.step(0, true, ['rabbit-2']); expect(first.started?.text).toBe(DADI_WELCOME);
    dadi.step(0, false, []); expect(dadi.step(0, true, ['rabbit-2']).speech).toBeNull();
    dadi.confirmed({type: 'welcome', birthId: 'rabbit-2', enclosureId: 'building-1'});
    dadi.sync(s, 1); expect(dadi.step(0, true, ['rabbit-2']).speech).toBeNull();
    dadi.confirmed({type: 'welcome', birthId: 'rabbit-2', enclosureId: 'building-1'});
    dadi.reset(); expect(dadi.step(0, true, ['rabbit-2']).speech).toBeNull();
  });
  it('stops a bubble when the rabbit leaves, without replaying it on return', () => {
    const dadi = new DadiReactions(), s = resident(); dadi.sync(s, 0);
    dadi.confirmed({type: 'welcome', birthId: 'rabbit-2', enclosureId: 'building-1'});
    expect(dadi.step(0, true, ['rabbit-2']).speech).not.toBeNull();
    s.rabbits = s.rabbits.filter(r => r.id !== 'rabbit-2'); dadi.sync(s, 0);
    expect(dadi.step(0, true, ['rabbit-2']).speech).toBeNull();
  });
  it('keeps an arrival pending when only the feet are visible, and pauses its speech while the head is hidden', () => {
    const dadi = new DadiReactions(); dadi.sync(resident(), 0);
    const bounds = {width: 390, height: 844, top: 80};
    const visible = (headY: number) => dadiHeadVisible({x: 100, y: headY}, bounds) ? ['rabbit-2'] : [];
    dadi.confirmed({type: 'welcome', birthId: 'rabbit-2', enclosureId: 'building-1'});
    // Feet y=110 are in the meadow, but the head y=40 is behind the HUD.
    expect(tick(dadi, 20_000, visible(40)).speech).toBeNull();
    expect(dadi.step(0, true, visible(140)).started?.text).toBe(DADI_WELCOME);
    expect(tick(dadi, 2_000, visible(140)).speech?.text).toBe(DADI_WELCOME);
    expect(tick(dadi, 30_000, visible(40)).speech?.text).toBe(DADI_WELCOME);
    expect(tick(dadi, DADI_SPEECH_DURATION - 2_000 - 250, visible(140)).speech?.text).toBe(DADI_WELCOME);
    expect(dadi.step(250, true, visible(140)).speech).toBeNull();
  });
});

describe('Dadi bubble and welcome somersault', () => {
  it('shows a legible accessible bubble that follows its rabbit and disappears outside the meadow', () => {
    const host = document.createElement('div'); document.body.append(host);
    const bubble = new DadiSpeech(host), speech = {id: 'rabbit-2', text: DADI_WELCOME, salto: true};
    bubble.show(speech, {x: 100, y: 160}, {width: 390, height: 844, top: 80});
    expect(bubble.element.hidden).toBe(false); expect(bubble.element.textContent).toBe(DADI_WELCOME);
    expect(bubble.element.getAttribute('role')).toBe('status'); expect(bubble.element.style.left).toBe('100px');
    bubble.show(speech, {x: 200, y: 180}, {width: 390, height: 844, top: 80});
    expect(bubble.element.style.left).toBe('200px');
    bubble.show(speech, {x: -10, y: 180}, {width: 390, height: 844, top: 80}); expect(bubble.element.hidden).toBe(true);
    bubble.destroy(); expect(host.children.length).toBe(0); host.remove();
  });
  it('uses the existing full somersault and lands upright; reduced motion keeps the rabbit on the ground', () => {
    const motion = createRabbitMotion('rabbit-2', {x: 0, y: 0}, 1), original = structuredClone(motion);
    triggerWelcomeSalto(motion, true); expect(motion).toEqual(original);
    triggerWelcomeSalto(motion, false); expect(motion.mode).toBe('salto');
    const duration = motion.duration;
    for (let t = 0; t < duration / 2; t += 10) stepRabbitMotion(motion, 10);
    expect(rabbitPose(motion).lift).toBeGreaterThan(0); expect(Math.abs(rabbitPose(motion).rotation)).toBeGreaterThan(1);
    for (let t = 0; t < duration; t += 10) stepRabbitMotion(motion, 10);
    expect(motion.mode).toBe('rest'); expect(rabbitPose(motion).rotation).toBe(0); expect(motion.local).toEqual(original.local);
  });
});
