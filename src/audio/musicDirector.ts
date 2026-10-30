import type {MusicPlayer} from './musicPlayer';

export type MusicPlace = 'meadow' | 'kitchen';

/**
 * Two playlists, one heard at a time: the meadow music everywhere, the kitchen music only while
 * the kitchen is open. The silent one waits paused at its position and resumes there.
 */
export class MusicDirector {
  private enabled = true;
  private place: MusicPlace = 'meadow';
  constructor(readonly meadow: MusicPlayer, readonly kitchen: MusicPlayer) { this.apply(); }
  /** Only the meadow music is checked before « Jouer »: it is the one heard first. */
  prepare(): Promise<boolean> { return this.meadow.prepare(); }
  start(): void { this.apply(); this.meadow.start(); this.kitchen.start(); }
  setEnabled(enabled: boolean): void { this.enabled = enabled; this.apply(); }
  /** Called inside the gesture that opens or leaves the kitchen, so iOS accepts the new sound. */
  setPlace(place: MusicPlace): void { if (place !== this.place) { this.place = place; this.apply(); } }
  get current(): MusicPlace { return this.place; }
  refreshVolume(): void { this.meadow.refreshVolume(); this.kitchen.refreshVolume(); }
  retryAfterGesture(): void { this.active().retryAfterGesture(); }
  pauseForBackground(): void { this.meadow.pauseForBackground(); this.kitchen.pauseForBackground(); }
  resumeFromBackground(): void { this.meadow.resumeFromBackground(); this.kitchen.resumeFromBackground(); }
  dispose(): void { this.meadow.dispose(); this.kitchen.dispose(); }
  private active(): MusicPlayer { return this.place === 'kitchen' ? this.kitchen : this.meadow; }
  // Pause the silent one first: never two tracks at once.
  private apply(): void {
    (this.place === 'kitchen' ? this.meadow : this.kitchen).setEnabled(false);
    this.active().setEnabled(this.enabled);
  }
}
