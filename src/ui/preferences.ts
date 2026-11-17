import {AudioEngine, clampVolume} from '../audio/audioEngine';
/** UI preferences, stored per environment (game, laboratory), never in the game save. `muted` = Bruitages off. */
export interface Preferences {accountReminderShown: boolean; pailleScenes: number[]; pailleNamed: boolean; muted: boolean; music: boolean; musicVolume: number; effectsVolume: number; tutorial: boolean; intro: boolean; tutorialDone: boolean; guideConfigured: boolean; guideCamera: boolean; guideCollection: boolean; guideRecipe: boolean; newsSeen: string}
export class PreferenceStore {
  value: Preferences = {accountReminderShown: false, pailleScenes: [], pailleNamed: false, muted: false, music: true, musicVolume: .5, effectsVolume: .8, tutorial: true, intro: false, tutorialDone: false, guideConfigured: false, guideCamera: false, guideCollection: false, guideRecipe: false, newsSeen: ''};
  constructor(private key: string) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? '{}');
      if (Array.isArray(raw.pailleScenes)) this.value.pailleScenes = raw.pailleScenes.filter((n: unknown) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 11);
      for (const field of Object.keys(this.value) as (keyof Preferences)[]) if (field !== 'pailleScenes' && typeof raw[field] === typeof this.value[field] && (typeof raw[field] !== 'number' || Number.isFinite(raw[field]))) (this.value as unknown as Record<string, unknown>)[field] = typeof raw[field] === 'number' ? clampVolume(raw[field]) : raw[field];
    } catch { /* Optional preferences stay usable in memory. */ }
  }
  set(patch: Partial<Preferences>): void { Object.assign(this.value, patch); try { localStorage.setItem(this.key, JSON.stringify(this.value)); } catch { /* in-memory preference */ } }
  initializeGuidance(fresh: boolean): void {
    if (fresh) {
      const enabled = this.value.tutorial; this.restartGuidance();
      if (!enabled) this.set({tutorial: false}); // An explicit opt-out survives ordinary startup.
      return;
    }
    if (!this.value.guideConfigured) this.set({guideConfigured: true, tutorial: fresh, tutorialDone: false, intro: false});
  }
  restartGuidance(): void { this.set({pailleScenes: [], pailleNamed: false, guideConfigured: true, tutorial: true, tutorialDone: false, intro: false, guideCamera: false, guideCollection: false, guideRecipe: false}); }
}
/**
 * Bruitages: every short effect goes through the engine's Bruitages channel (its own switch and
 * volume, the stored `muted` flag meaning « Bruitages coupés »). Today there is one effect: the
 * confirmation ping after any successful action (purchases, placements, feeding, claims...).
 */
export class Sounds {
  private ownEngine: AudioEngine | null = null;
  private engine: AudioEngine;
  /** Without a shared engine (unit tests), a private one is created lazily on the first ping. */
  constructor(private preferences: PreferenceStore, engine?: AudioEngine) {
    this.engine = engine ?? (this.ownEngine = new AudioEngine());
    this.sync();
  }
  /** Copies the stored Bruitages settings into the engine (called after any settings change). */
  sync(): void { this.engine.configure('effects', {enabled: !this.preferences.value.muted, volume: this.preferences.value.effectsVolume}); }
  ping(): void {
    this.sync();
    const output = this.engine.effectsOutput(); if (!output) return;
    try {
      const {context, node} = output, oscillator = context.createOscillator(), gain = context.createGain(), time = context.currentTime;
      void context.resume().catch(() => {});
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(660, time); oscillator.frequency.exponentialRampToValueAtTime(880, time + .12);
      gain.gain.setValueAtTime(.035, time); gain.gain.exponentialRampToValueAtTime(.001, time + .18);
      oscillator.connect(gain).connect(node); oscillator.start(); oscillator.stop(time + .2);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Sound is optional. */ }
  }
  /**
   * « Benny Rampage »: one short synthesised effect per action, on the Bruitages channel (its switch and volume apply).
   * Tones only: a sweep from `from` to `to` Hz over `length` s, sometimes two in a row.
   */
  /** `pitch` raises the notes (1 = as written): the strikes of a combo climb a semitone each. */
  run(kind: 'strike' | 'pot' | 'coin' | 'bump' | 'jump' | 'roll' | 'shock' | 'wall' | 'power' | 'caught' | 'dodge' | 'rumble' | 'whoosh' | 'land' | 'sizzle', pitch = 1): void {
    this.sync();
    const output = this.engine.effectsOutput(); if (!output) return;
    const tones: Record<typeof kind, [OscillatorType, number, number, number, number, number?][]> = {
      strike: [['triangle', 620, 180, .08, .05]], pot: [['square', 900, 260, .09, .025], ['triangle', 1400, 700, .06, .02, .03]],
      coin: [['sine', 1320, 1760, .07, .025]], bump: [['sawtooth', 220, 70, .26, .04]], jump: [['sine', 320, 640, .11, .025]],
      roll: [['triangle', 300, 160, .12, .025]], shock: [['sine', 140, 38, .42, .07], ['triangle', 520, 120, .2, .03]],
      wall: [['triangle', 420, 560, .1, .025]], power: [['sine', 660, 660, .07, .03], ['sine', 880, 880, .07, .03, .08], ['sine', 1180, 1180, .1, .03, .16]],
      caught: [['triangle', 520, 260, .3, .04], ['triangle', 390, 200, .35, .035, .25]],
      // A barrier cleared: a light flick upwards. Falling rocks or ground giving way: a low rumble. A gust: a soft rush of air.
      dodge: [['sine', 760, 1150, .06, .02]], rumble: [['sawtooth', 90, 45, .32, .035], ['triangle', 160, 60, .25, .025, .05]],
      whoosh: [['triangle', 180, 520, .22, .015], ['sine', 520, 220, .18, .012, .14]], land: [['triangle', 200, 110, .08, .03]],
      sizzle: [['sawtooth', 1400, 600, .14, .012], ['triangle', 300, 520, .2, .02, .03]],
    };
    try {
      const {context, node} = output, now = context.currentTime;
      void context.resume().catch(() => {});
      for (const [type, from, to, length, volume, delay = 0] of tones[kind]) {
        const oscillator = context.createOscillator(), gain = context.createGain(), time = now + delay;
        oscillator.type = type; oscillator.frequency.setValueAtTime(from * pitch, time); oscillator.frequency.exponentialRampToValueAtTime(to * pitch, time + length);
        gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(.0005, time + length);
        oscillator.connect(gain).connect(node); oscillator.start(time); oscillator.stop(time + length + .02);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
    } catch { /* Sound is optional. */ }
  }
  /** The jump-rope rhythm « tac »: the same synthesised effect as the ping, much shorter and drier, on the Bruitages channel. */
  tick(): void {
    this.sync();
    const output = this.engine.effectsOutput(); if (!output) return;
    try {
      const {context, node} = output, oscillator = context.createOscillator(), gain = context.createGain(), time = context.currentTime;
      void context.resume().catch(() => {});
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(1200, time); oscillator.frequency.exponentialRampToValueAtTime(700, time + .04);
      gain.gain.setValueAtTime(.03, time); gain.gain.exponentialRampToValueAtTime(.001, time + .05);
      oscillator.connect(gain).connect(node); oscillator.start(); oscillator.stop(time + .06);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Sound is optional. */ }
  }
  /**
   * The Salon de soins' bubbles (owner, 10 November 2026: « bruit de bulles »): `count` little « bloop » in a row, each a sine
   * whose pitch rises quickly, like a bubble that pops at the surface; pitches and gaps vary a little so it sounds like water.
   */
  bubbles(count = 6): void {
    this.sync();
    const output = this.engine.effectsOutput(); if (!output) return;
    try {
      const {context, node} = output, start = context.currentTime;
      void context.resume().catch(() => {});
      for (let i = 0, at = start; i < count; i++, at += .07 + Math.random() * .11) {
        const oscillator = context.createOscillator(), gain = context.createGain(), pitch = 380 + Math.random() * 520, length = .05 + Math.random() * .04;
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(pitch, at); oscillator.frequency.exponentialRampToValueAtTime(pitch * 2.6, at + length);
        gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(.03, at + .008); gain.gain.exponentialRampToValueAtTime(.0005, at + length);
        oscillator.connect(gain).connect(node); oscillator.start(at); oscillator.stop(at + length + .02);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
    } catch { /* Sound is optional. */ }
  }
  dispose(): void { this.ownEngine?.dispose(); }
}
