/**
 * Two independent output channels, Musique and Bruitages, each with its own gain.
 * iOS ignores HTMLMediaElement.volume, so music is routed through Web Audio when available.
 * Nothing is created before unlock(), which must run inside a user gesture (the « Jouer » tap).
 */
export interface ChannelSettings {enabled: boolean; volume: number}
type AudioSessionNavigator = Navigator & {audioSession?: {type: string}};

export class AudioEngine {
  private context: AudioContext | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private settings = {music: {enabled: true, volume: .5}, effects: {enabled: true, volume: .8}};
  constructor(private createContext: () => AudioContext | null = defaultContext) {}
  /** True once a user gesture created/resumed the shared context. */
  get unlocked(): boolean { return !!this.context; }
  get audioContext(): AudioContext | null { return this.context; }
  unlock(): void {
    try {
      // Mix with other apps and follow the ringer switch where Safari supports it (iOS 16.4+).
      const session = (navigator as AudioSessionNavigator).audioSession;
      if (session && session.type !== 'ambient') session.type = 'ambient';
    } catch { /* Optional platform hint. */ }
    try {
      this.context ??= this.createContext();
      if (!this.context) return;
      if (!this.music) { this.music = this.context.createGain(); this.music.connect(this.context.destination); }
      if (!this.effects) { this.effects = this.context.createGain(); this.effects.connect(this.context.destination); }
      this.apply();
      void this.context.resume().catch(() => {});
    } catch { this.context = null; this.music = null; this.effects = null; }
  }
  /** Resume after the app returns to the foreground; harmless if the browser refuses. */
  resume(): void { if (this.context) void this.context.resume().catch(() => {}); }
  suspend(): void { if (this.context) void this.context.suspend().catch(() => {}); }
  configure(channel: 'music' | 'effects', settings: ChannelSettings): void { this.settings[channel] = {enabled: settings.enabled, volume: clampVolume(settings.volume)}; this.apply(); }
  level(channel: 'music' | 'effects'): number { const s = this.settings[channel]; return s.enabled ? s.volume : 0; }
  /** Routes a music element into the Musique channel; false means "use element.volume instead". */
  attachMusic(element: HTMLMediaElement): boolean {
    if (!this.context || !this.music) return false;
    try { this.context.createMediaElementSource(element).connect(this.music); return true; } catch { return false; }
  }
  /** Destination for a short effect, or null when Bruitages is off or audio is unavailable. */
  effectsOutput(): {context: AudioContext; node: AudioNode} | null {
    if (!this.settings.effects.enabled || this.settings.effects.volume <= 0) return null;
    if (!this.context) this.unlock();
    return this.context && this.effects ? {context: this.context, node: this.effects} : null;
  }
  private apply(): void {
    const now = this.context?.currentTime ?? 0;
    this.music?.gain.setValueAtTime(this.level('music'), now);
    this.effects?.gain.setValueAtTime(this.level('effects'), now);
  }
  dispose(): void { if (this.context) void this.context.close().catch(() => {}); this.context = null; this.music = null; this.effects = null; }
}
export const clampVolume = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
function defaultContext(): AudioContext | null {
  const Context = (globalThis as {AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext}).AudioContext ?? (globalThis as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
  return Context ? new Context() : null;
}
