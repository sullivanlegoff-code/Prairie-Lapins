import type {MusicPlayer} from './musicPlayer';

export type MusicPlace = 'meadow' | 'kitchen';

/**
 * One music heard at a time: the meadow music everywhere, the kitchen music only while the kitchen
 * is open, and a rabbit's theme played once to its end over the meadow. The silent ones wait paused
 * at their position and resume there; a theme always starts from its beginning.
 */
export class MusicDirector {
  private enabled = true;
  private place: MusicPlace = 'meadow';
  private theme: MusicPlayer | null = null;
  constructor(readonly meadow: MusicPlayer, readonly kitchen: MusicPlayer, private themes: Readonly<Record<string, MusicPlayer>> = {}) { this.apply(); }
  /** Only the meadow music is checked before « Jouer »: it is the one heard first. */
  prepare(): Promise<boolean> { return this.meadow.prepare(); }
  start(): void { this.apply(); for (const player of this.players()) player.start(); }
  setEnabled(enabled: boolean): void { this.enabled = enabled; this.apply(); }
  /** Called inside the gesture that opens or leaves the kitchen, so iOS accepts the new sound. The kitchen interrupts a theme. */
  setPlace(place: MusicPlace): void {
    if (place === this.place) return;
    this.place = place;
    if (place === 'kitchen') this.endTheme();
    this.apply();
  }
  get current(): MusicPlace { return this.place; }
  get playingTheme(): string | null { return Object.keys(this.themes).find(name => this.themes[name] === this.theme) ?? null; }
  /** Inside a gesture: plays the theme from its beginning, unless it is already playing. Ignored in the kitchen. */
  playTheme(name: string): void {
    const player = this.themes[name];
    if (!player || this.place === 'kitchen' || this.theme === player) return;
    this.endTheme();
    this.theme = player;
    this.apply();
  }
  refreshVolume(): void { for (const player of this.players()) player.refreshVolume(); }
  retryAfterGesture(): void { this.active().retryAfterGesture(); }
  pauseForBackground(): void { for (const player of this.players()) player.pauseForBackground(); }
  resumeFromBackground(): void { for (const player of this.players()) player.resumeFromBackground(); }
  dispose(): void { for (const player of this.players()) player.dispose(); }
  /** A theme reached its end (or could not play): the place's music resumes. */
  themeFinished(player: MusicPlayer): void { if (this.theme === player) { this.theme = null; this.apply(); } }
  private endTheme(): void { if (this.theme) { this.theme.setEnabled(false); this.theme.rewind(); this.theme = null; } }
  private players(): MusicPlayer[] { return [this.meadow, this.kitchen, ...Object.values(this.themes)]; }
  private active(): MusicPlayer { return this.theme ?? (this.place === 'kitchen' ? this.kitchen : this.meadow); }
  // Pause the silent ones first: never two tracks at once.
  private apply(): void {
    const active = this.active();
    for (const player of this.players()) if (player !== active) player.setEnabled(false);
    active.setEnabled(this.enabled);
  }
}
