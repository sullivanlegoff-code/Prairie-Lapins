import {describe, expect, it} from 'vitest';
import {AudioEngine} from '../src/audio/audioEngine';
import {MusicDirector} from '../src/audio/musicDirector';
import {MusicPlayer, type MusicElement} from '../src/audio/musicPlayer';
import {KITCHEN_TRACKS, MEADOW_TRACKS, RABBIT_THEMES} from '../src/config/music';

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
  const meadow = new MusicPlayer({tracks: MEADOW_TRACKS, engine, random, probe: async () => true, createElement});
  const kitchen = new MusicPlayer({tracks: KITCHEN_TRACKS, engine, random, probe: async () => true, createElement});
  const themes: Record<string, MusicPlayer> = {};
  const music = new MusicDirector(meadow, kitchen, themes);
  const dadi: MusicPlayer = new MusicPlayer({tracks: [RABBIT_THEMES.dadi], engine, random, probe: async () => true, createElement, once: true, onFinished: () => music.themeFinished(dadi)});
  themes.dadi = dadi;
  return {music, elements, playing: () => elements.filter(e => !e.paused).map(e => e.src)};
}

const CHRISTMAS = /^noel-[1-7]\.mp3$/;
describe('musique : les sept musiques de Noël partout, Indian vibe en cuisine', () => {
  it('only the Christmas tracks play in the game (the chill theme is gone), the Indian vibe tracks only in the kitchen', async () => {
    expect([...MEADOW_TRACKS]).toEqual(['noel-1.mp3', 'noel-2.mp3', 'noel-3.mp3', 'noel-4.mp3', 'noel-5.mp3', 'noel-6.mp3', 'noel-7.mp3']);
    expect(MEADOW_TRACKS).not.toContain('dragon-chill.mp3');
    expect([...KITCHEN_TRACKS]).toEqual(['indian-vibe-1.mp3', 'indian-vibe-2.mp3', 'indian-vibe-3.mp3']);
    const {music, elements, playing} = setup();
    await music.prepare(); expect(playing()).toEqual([]);
    music.start(); await flush(); expect(playing()).toHaveLength(1); expect(playing()[0]).toMatch(CHRISTMAS);
    const meadowTrack = elements.find(e => !e.paused)!; meadowTrack.currentTime = 30;
    music.setPlace('kitchen'); await flush();
    expect(playing()).toHaveLength(1); expect(playing()[0]).toMatch(/^indian-vibe-[123]\.mp3$/);
    const kitchenTrack = elements.find(e => !e.paused)!;
    // Back from the kitchen: the same Christmas track resumes where it stopped.
    music.setPlace('meadow'); await flush(); expect(elements.filter(e => !e.paused)).toEqual([meadowTrack]); expect(meadowTrack.currentTime).toBe(30);
    // Back in the kitchen: the same Indian vibe resumes where it stopped.
    kitchenTrack.currentTime = 42; music.setPlace('kitchen'); await flush();
    expect(elements.filter(e => !e.paused)).toEqual([kitchenTrack]); expect(kitchenTrack.currentTime).toBe(42);
  });
  it('each launch starts one of the seven tracks drawn at random, from its beginning', async () => {
    for (let k = 0; k < 7; k++) {
      const {music, elements, playing} = setup(() => (k + .5) / 7);
      await music.prepare(); music.start(); await flush();
      expect(playing()).toEqual([`noel-${k + 1}.mp3`]);
      elements[0].metadata(); expect(elements[0].currentTime).toBe(0);
      music.dispose();
    }
  });
  it('then the tracks follow one another at random, never the same twice in a row, each from its beginning', async () => {
    let seed = 7; const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const {music, elements, playing} = setup(random);
    await music.prepare(); music.start(); await flush();
    const heard = [playing()[0]];
    for (let n = 0; n < 40; n++) {
      elements.find(e => !e.paused)!.emit('ended'); await flush();
      expect(playing()).toHaveLength(1); expect(playing()[0]).toMatch(CHRISTMAS);
      const now = elements.find(e => !e.paused)!; now.metadata(); expect(now.currentTime).toBe(0);
      heard.push(playing()[0]);
    }
    for (let i = 1; i < heard.length; i++) expect(heard[i]).not.toBe(heard[i - 1]);
    expect(new Set(heard).size).toBe(7);
  });
  it('switching Musique off silences the kitchen too, and back on plays only the current place', async () => {
    const {music, playing} = setup(() => 0);
    await music.prepare(); music.start(); await flush();
    music.setPlace('kitchen'); await flush(); music.setEnabled(false); expect(playing()).toEqual([]);
    music.setPlace('meadow'); await flush(); expect(playing()).toEqual([]);
    music.setEnabled(true); await flush(); expect(playing()).toEqual(['noel-1.mp3']);
    music.pauseForBackground(); expect(playing()).toEqual([]);
    music.resumeFromBackground(); await flush(); expect(playing()).toEqual(['noel-1.mp3']);
  });
  it('la musique de Dadi joue une fois jusqu’au bout depuis 1 min 38, puis la musique de Noël reprend', async () => {
    expect(RABBIT_THEMES.dadi).toBe('dadi.mp3');
    const {music, elements, playing} = setup(() => 0);
    await music.prepare(); music.start(); await flush();
    const christmas = elements[0]; christmas.currentTime = 100;
    music.playTheme('dadi'); await flush();
    expect(playing()).toEqual(['dadi.mp3']); expect(music.playingTheme).toBe('dadi');
    const theme = elements.find(e => e.src === 'dadi.mp3')!; expect(theme.currentTime).toBe(0);
    // Opening Dadi's sheet again while it plays does not restart it.
    theme.currentTime = 40; music.playTheme('dadi'); await flush();
    expect(elements.filter(e => e.src === 'dadi.mp3')).toHaveLength(1); expect(theme.currentTime).toBe(40);
    theme.emit('ended'); await flush();
    expect(playing()).toEqual(['noel-1.mp3']); expect(christmas.currentTime).toBe(100); expect(music.playingTheme).toBeNull();
    // Next time, from its beginning again.
    music.playTheme('dadi'); await flush();
    const again = elements.at(-1)!; expect(again).not.toBe(theme); expect(theme.src).toBe('');
    expect(playing()).toEqual(['dadi.mp3']); expect(again.currentTime).toBe(0);
  });
  it('la cuisine interrompt la musique de Dadi, qui ne joue pas en cuisine', async () => {
    const {music, playing} = setup(() => 0);
    await music.prepare(); music.start(); await flush();
    music.playTheme('dadi'); await flush(); expect(playing()).toEqual(['dadi.mp3']);
    music.setPlace('kitchen'); await flush(); expect(playing()).toHaveLength(1); expect(playing()[0]).toMatch(/^indian-vibe/);
    music.playTheme('dadi'); await flush(); expect(playing()[0]).toMatch(/^indian-vibe/);
    music.setPlace('meadow'); await flush(); expect(playing()).toEqual(['noel-1.mp3']);
  });
  it('une musique de Dadi introuvable rend la main à la musique de Noël', async () => {
    const {music, elements, playing} = setup(() => 0);
    await music.prepare(); music.start(); await flush();
    music.playTheme('dadi'); await flush();
    elements.find(e => e.src === 'dadi.mp3')!.emit('error'); await flush();
    expect(playing()).toEqual(['noel-1.mp3']); expect(music.playingTheme).toBeNull();
  });
  it('tells the meadow when Dadi’s song starts and ends, so the evolved Dadi sings at his microphone only meanwhile', async () => {
    const {music, elements} = setup(() => 0), told: [string | null, boolean][] = [];
    music.onThemeChange = (name, audible) => told.push([name, audible]);
    await music.prepare(); music.start(); await flush();
    music.playTheme('dadi'); await flush(); expect(told).toEqual([['dadi', true]]);
    music.playTheme('dadi'); await flush(); expect(told).toHaveLength(1);
    elements.find(e => e.src === 'dadi.mp3')!.emit('ended'); await flush(); expect(told.at(-1)).toEqual([null, true]);
    music.setEnabled(false); music.playTheme('dadi'); await flush(); expect(told.at(-1)).toEqual(['dadi', false]);
    // Music off, nothing is held: it never starts by itself when the music comes back, and another touch sings again.
    expect(music.playingTheme).toBeNull();
    music.setPlace('kitchen'); expect(told.at(-1)).toEqual([null, false]);
  });
});
