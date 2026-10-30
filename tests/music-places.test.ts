import {describe, expect, it} from 'vitest';
import {AudioEngine} from '../src/audio/audioEngine';
import {MusicDirector} from '../src/audio/musicDirector';
import {MusicPlayer, type MusicElement} from '../src/audio/musicPlayer';
import {KITCHEN_TRACKS, MEADOW_START_SEGMENTS, MEADOW_TRACKS} from '../src/config/music';

const LENGTH = 1220;
class FakeTrack implements MusicElement {
  src: string; preload = 'none'; volume = 1; paused = true; currentTime = 0; duration = NaN; readyState = 0;
  private listeners: Record<string, (() => void)[]> = {};
  constructor(src: string) { this.src = src; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
  removeAttribute() { this.src = ''; }
  addEventListener(type: string, listener: () => void) { (this.listeners[type] ??= []).push(listener); }
  removeEventListener(type: string, listener: () => void) { this.listeners[type] = (this.listeners[type] ?? []).filter(l => l !== listener); }
  /** The browser learns the length, then would start sound. */
  metadata() { this.duration = LENGTH; this.readyState = 1; for (const l of this.listeners.loadedmetadata ?? []) l(); }
  emit(type: string) { for (const l of this.listeners[type] ?? []) l(); }
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
function setup(random: () => number = Math.random) {
  const elements: FakeTrack[] = [];
  const engine = new AudioEngine(() => null);
  const createElement = (url: string) => { const e = new FakeTrack(url); elements.push(e); return e; };
  const meadow = new MusicPlayer({tracks: MEADOW_TRACKS, engine, random, probe: async () => true, createElement, startSegments: MEADOW_START_SEGMENTS});
  const kitchen = new MusicPlayer({tracks: KITCHEN_TRACKS, engine, random, probe: async () => true, createElement});
  return {music: new MusicDirector(meadow, kitchen), elements, playing: () => elements.filter(e => !e.paused).map(e => e.src)};
}

describe('musique : chill partout, Indian vibe en cuisine', () => {
  it('only the chill music plays in the game, the Indian vibe tracks only in the kitchen', async () => {
    expect([...MEADOW_TRACKS]).toEqual(['dragon-chill.mp3']);
    expect([...KITCHEN_TRACKS]).toEqual(['indian-vibe-1.mp3', 'indian-vibe-2.mp3', 'indian-vibe-3.mp3']);
    const {music, elements, playing} = setup();
    await music.prepare(); expect(playing()).toEqual([]);
    music.start(); await flush(); expect(playing()).toEqual(['dragon-chill.mp3']);
    music.setPlace('kitchen'); await flush();
    expect(playing()).toHaveLength(1); expect(playing()[0]).toMatch(/^indian-vibe-[123]\.mp3$/);
    const kitchenTrack = elements.find(e => !e.paused)!;
    music.setPlace('meadow'); await flush(); expect(playing()).toEqual(['dragon-chill.mp3']);
    // Back in the kitchen: the same Indian vibe resumes where it stopped.
    kitchenTrack.currentTime = 42; music.setPlace('kitchen'); await flush();
    expect(elements.filter(e => !e.paused)).toEqual([kitchenTrack]); expect(kitchenTrack.currentTime).toBe(42);
  });
  it('the chill music keeps playing alone, from the beginning again when it ends', async () => {
    const {music, elements, playing} = setup(() => .55);
    await music.prepare(); music.start(); await flush(); elements[0].metadata();
    for (let n = 0; n < 5; n++) {
      elements.find(e => !e.paused)!.emit('ended'); await flush();
      expect(playing()).toEqual(['dragon-chill.mp3']);
      const next = elements.at(-1)!; next.metadata(); expect(next.currentTime).toBe(0);
    }
  });
  it('starts the chill music at the beginning of one of its 10 parts, at random', async () => {
    const starts = new Set<number>();
    for (let part = 0; part < 10; part++) {
      const {music, elements} = setup(() => (part + .5) / 10);
      await music.prepare(); music.start(); await flush();
      expect(elements[0].currentTime).toBe(0);
      elements[0].metadata(); starts.add(elements[0].currentTime);
      expect(elements[0].currentTime).toBeCloseTo(LENGTH * part / 10);
      music.dispose();
    }
    expect(starts.size).toBe(10);
  });
  it('switching Musique off silences the kitchen too, and back on plays only the current place', async () => {
    const {music, playing} = setup();
    await music.prepare(); music.start(); await flush();
    music.setPlace('kitchen'); await flush(); music.setEnabled(false); expect(playing()).toEqual([]);
    music.setPlace('meadow'); await flush(); expect(playing()).toEqual([]);
    music.setEnabled(true); await flush(); expect(playing()).toEqual(['dragon-chill.mp3']);
    music.pauseForBackground(); expect(playing()).toEqual([]);
    music.resumeFromBackground(); await flush(); expect(playing()).toEqual(['dragon-chill.mp3']);
  });
});
