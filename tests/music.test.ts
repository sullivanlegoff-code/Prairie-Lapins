import {describe, it, expect, vi} from 'vitest';
import {AudioEngine} from '../src/audio/audioEngine';
import {MusicPlayer, probeTrack, type MusicElement} from '../src/audio/musicPlayer';
import {PreferenceStore, Sounds} from '../src/ui/preferences';

class FakeElement implements MusicElement {
  src: string; preload = 'none'; volume = 1; paused = true; plays = 0; loads = 0; failPlay = false;
  private listeners: Record<string, (() => void)[]> = {};
  constructor(src: string) { this.src = src; }
  play() { this.plays++; if (this.failPlay) return Promise.reject(new Error('NotAllowedError')); this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() { this.loads++; }
  removeAttribute() { this.src = ''; this.emit('error'); }
  addEventListener(type: string, listener: () => void) { (this.listeners[type] ??= []).push(listener); }
  removeEventListener(type: string, listener: () => void) { this.listeners[type] = (this.listeners[type] ?? []).filter(l => l !== listener); }
  get listenerCount() { return Object.values(this.listeners).flat().length; }
  emit(type: string) { for (const l of this.listeners[type] ?? []) l(); }
}
class FakeGain { gain = {value: 1, setValueAtTime: (v: number) => { this.gain.value = v; }}; connected: unknown[] = []; connect(n: unknown) { this.connected.push(n); return n; } }
class FakeContext {
  state = 'running'; currentTime = 0; destination = {}; gains: FakeGain[] = []; sources: unknown[] = []; resumed = 0; suspended = 0; oscillators = 0;
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  createMediaElementSource(element: unknown) { this.sources.push(element); return {connect: () => {}}; }
  createOscillator() { this.oscillators++; const target: unknown[] = []; return {type: '', frequency: {setValueAtTime() {}, exponentialRampToValueAtTime() {}}, connect: (n: {connect?: unknown}) => { target.push(n); return n; }, start() {}, stop() {}, disconnect() {}, onended: null as null | (() => void), target}; }
  resume() { this.resumed++; return Promise.resolve(); }
  suspend() { this.suspended++; return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
const tracks = ['a.mp3', 'b.mp3', 'c.mp3', 'd.mp3'];
function setup(random: () => number = Math.random, probe: (url: string) => Promise<boolean> = async () => true) {
  const elements: FakeElement[] = [], context = new FakeContext();
  const engine = new AudioEngine(() => context as unknown as AudioContext);
  const player = new MusicPlayer({tracks, engine, random, probe, createElement: url => { const e = new FakeElement(url); elements.push(e); return e; }});
  return {player, engine, elements, context};
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const playing = (elements: FakeElement[]) => elements.filter(e => !e.paused);

describe('background music', () => {
  it('cancels a full response when the server ignores Range instead of downloading the track', async () => {
    const cancel = vi.fn(async () => {}), arrayBuffer = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, status: 200, body: {cancel}, arrayBuffer})));
    try { expect(await probeTrack('a.mp3')).toBe(true); expect(cancel).toHaveBeenCalledOnce(); expect(arrayBuffer).not.toHaveBeenCalled(); }
    finally { vi.unstubAllGlobals(); }
  });
  it('chooses the initial track from the random value', async () => {
    for (let i = 0; i < tracks.length; i++) {
      const {player, elements} = setup(() => (i + .1) / tracks.length);
      await player.prepare(); expect(elements[0].src).toBe(tracks[i]); player.dispose();
    }
  });
  it('a late failed probe cannot discard the playing element or cause double playback', async () => {
    let resolve!: (ok: boolean) => void;
    const {player, elements} = setup(() => 0, () => new Promise(r => { resolve = r; }));
    const preparation = player.prepare(); await flush(); player.start(); await flush();
    resolve(false); await preparation; player.setEnabled(true); await flush();
    expect(playing(elements)).toEqual([elements[0]]);
    player.dispose(); expect(elements.every(e => e.listenerCount === 0)).toBe(true);
    elements[0].emit('ended'); player.start(); expect(playing(elements)).toEqual([]);
  });
  it('disposing during a probe prevents late callbacks from changing the stopped state', async () => {
    let resolve!: (ok: boolean) => void;
    const {player, elements} = setup(() => 0, () => new Promise(r => { resolve = r; }));
    const preparation = player.prepare(); await flush(); player.dispose(); resolve(false); await preparation;
    expect(player.state).toBe('stopped'); expect(elements[0].listenerCount).toBe(0);
    player.setEnabled(true); expect(playing(elements)).toEqual([]);
  });
  it('makes no sound before the « Jouer » gesture, then plays exactly one track', async () => {
    const {player, elements, context, engine} = setup();
    expect(await player.prepare()).toBe(true);
    expect(elements).toHaveLength(1); expect(elements[0].plays).toBe(0); expect(elements[0].preload).toBe('none');
    expect(engine.unlocked).toBe(false); expect(context.resumed).toBe(0);
    player.start(); await flush();
    expect(engine.unlocked).toBe(true); expect(playing(elements)).toHaveLength(1); expect(player.state).toBe('playing');
    expect(context.sources).toEqual([elements[0]]);
  });
  it('loads only the first track before playing, then just the next one while it plays', async () => {
    const {player, elements} = setup();
    await player.prepare(); expect(elements.map(e => e.loads)).toEqual([0]);
    player.start(); await flush();
    expect(elements).toHaveLength(2); expect(elements[1].preload).toBe('auto'); expect(elements[1].plays).toBe(0);
  });
  it('chains random tracks at the end, never the same twice in a row', async () => {
    let seed = 7; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const {player, elements} = setup(random);
    await player.prepare(); player.start(); await flush();
    for (let n = 0; n < 200; n++) { const active = playing(elements); expect(active).toHaveLength(1); active[0].emit('ended'); await flush(); }
    expect(player.history.length).toBeGreaterThan(150);
    for (let i = 1; i < player.history.length; i++) expect(player.history[i]).not.toBe(player.history[i - 1]);
    expect(new Set(player.history)).toEqual(new Set(tracks));
  });
  it('even a random source stuck at the previous index cannot repeat it', async () => {
    const {player, elements} = setup(() => 0);
    await player.prepare(); player.start(); await flush();
    for (let n = 0; n < 6; n++) { playing(elements)[0].emit('ended'); await flush(); }
    for (let i = 1; i < player.history.length; i++) expect(player.history[i]).not.toBe(player.history[i - 1]);
  });
  it('pauses in the background and resumes the same element, never a second one', async () => {
    const {player, elements, context} = setup();
    await player.prepare(); player.start(); await flush();
    const first = playing(elements)[0];
    player.pauseForBackground(); expect(playing(elements)).toHaveLength(0); expect(context.suspended).toBe(1);
    player.pauseForBackground(); player.resumeFromBackground(); player.resumeFromBackground(); await flush();
    expect(playing(elements)).toEqual([first]); expect(context.resumed).toBeGreaterThanOrEqual(2);
  });
  it('a track error skips to another one; all tracks failing stops music without throwing', async () => {
    const {player, elements} = setup(() => .1);
    await player.prepare(); player.start(); await flush();
    for (let n = 0; n < 8 && player.state !== 'unavailable'; n++) { const active = playing(elements)[0]; if (!active) break; active.emit('error'); await flush(); }
    expect(player.state).toBe('unavailable'); expect(playing(elements)).toHaveLength(0);
    expect(() => { player.setEnabled(true); player.resumeFromBackground(); player.start(); }).not.toThrow();
  });
  it('reuses the buffered successor after an error and never repeats it at its end', async () => {
    const {player, elements} = setup(() => 0);
    await player.prepare(); player.start(); await flush();
    const buffered = elements[1]; elements[0].emit('error'); await flush();
    expect(playing(elements)).toEqual([buffered]); buffered.emit('ended'); await flush();
    expect(playing(elements)).toHaveLength(1);
    expect(playing(elements)[0].src).not.toBe(buffered.src);
    expect(player.history).toEqual(['a.mp3', 'b.mp3', 'c.mp3']);
  });
  it('a missing first track does not block: another track plays, or no music at all', async () => {
    const one = setup(() => 0, async url => url !== 'a.mp3');
    expect(await one.player.prepare()).toBe(false); one.player.start(); await flush();
    expect(playing(one.elements).map(e => e.src)).toEqual(['b.mp3']);
    const none = setup(() => 0, async () => false);
    expect(await none.player.prepare()).toBe(false);
    expect(() => none.player.start()).not.toThrow(); await flush();
    // The probe failure only excluded the first track; the others are still tried, and errors skip on.
    for (let n = 0; n < 6 && none.player.state === 'playing'; n++) { playing(none.elements)[0]?.emit('error'); await flush(); }
    expect(none.player.state).toBe('unavailable');
  });
  it('a refused play() (no gesture yet) keeps the track and plays it on the next start', async () => {
    const {player, elements} = setup();
    await player.prepare(); elements[0].failPlay = true; player.start(); await flush();
    expect(player.state).toBe('paused'); elements[0].failPlay = false; player.start(); await flush();
    expect(playing(elements)).toEqual([elements[0]]);
  });
  it('switching Musique off pauses, on resumes the same track', async () => {
    const {player, elements} = setup();
    await player.prepare(); player.start(); await flush();
    player.setEnabled(false); expect(playing(elements)).toHaveLength(0);
    player.setEnabled(true); await flush(); expect(playing(elements)).toEqual([elements[0]]);
  });
});

describe('audio channels', () => {
  it('keeps Musique and Bruitages separate, with their own enable and volume', () => {
    const context = new FakeContext(), engine = new AudioEngine(() => context as unknown as AudioContext);
    engine.unlock(); const [music, effects] = context.gains;
    engine.configure('music', {enabled: true, volume: .3}); engine.configure('effects', {enabled: true, volume: .9});
    expect([music.gain.value, effects.gain.value]).toEqual([.3, .9]);
    engine.configure('music', {enabled: false, volume: .3}); expect([music.gain.value, effects.gain.value]).toEqual([0, .9]);
    engine.configure('effects', {enabled: false, volume: .9}); expect(engine.effectsOutput()).toBeNull();
    engine.configure('effects', {enabled: true, volume: 2}); expect(engine.level('effects')).toBe(1);
    engine.configure('music', {enabled: true, volume: Number.NaN}); expect(engine.level('music')).toBe(0);
  });
  it('without Web Audio, the music element volume follows the Musique level', async () => {
    const elements: FakeElement[] = [], engine = new AudioEngine(() => null);
    engine.configure('music', {enabled: true, volume: .25});
    const player = new MusicPlayer({tracks, engine, probe: async () => true, createElement: url => { const e = new FakeElement(url); elements.push(e); return e; }});
    await player.prepare(); player.start(); await flush();
    expect(elements[0].volume).toBe(.25);
  });
  it('the existing confirmation ping uses only the Bruitages channel and its switch', () => {
    const context = new FakeContext(), engine = new AudioEngine(() => context as unknown as AudioContext), prefs = new PreferenceStore('test-sounds');
    const sounds = new Sounds(prefs, engine);
    prefs.set({muted: true}); sounds.ping(); expect(context.oscillators).toBe(0);
    prefs.set({muted: false, effectsVolume: .4, music: false, musicVolume: 0}); sounds.ping();
    expect(context.oscillators).toBe(1); const [music, effects] = context.gains;
    expect(effects.gain.value).toBe(.4); expect(music.gain.value).toBe(.5);
  });
});
