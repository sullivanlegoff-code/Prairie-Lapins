import {AudioEngine, clampVolume} from '../audio/audioEngine';
/** UI preferences, stored per environment (game, laboratory), never in the game save. `muted` = Bruitages off. */
export interface Preferences {pailleScenes: number[]; pailleNamed: boolean; muted: boolean; music: boolean; musicVolume: number; effectsVolume: number; tutorial: boolean; intro: boolean; tutorialDone: boolean; guideConfigured: boolean; guideCamera: boolean; guideCollection: boolean; guideRecipe: boolean}
export class PreferenceStore {
  value: Preferences = {pailleScenes: [], pailleNamed: false, muted: false, music: true, musicVolume: .5, effectsVolume: .8, tutorial: true, intro: false, tutorialDone: false, guideConfigured: false, guideCamera: false, guideCollection: false, guideRecipe: false};
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
  dispose(): void { this.ownEngine?.dispose(); }
}
