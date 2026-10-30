import type {AudioEngine} from './audioEngine';

/** The subset of HTMLAudioElement used here, so the player is testable without a browser. */
export interface MusicElement {
  src: string; preload: string; volume: number; paused: boolean;
  currentTime?: number; readonly duration?: number; readonly readyState?: number;
  play(): Promise<void> | void; pause(): void; load?(): void;
  addEventListener(type: 'ended' | 'error' | 'canplaythrough' | 'loadeddata' | 'loadedmetadata', listener: () => void): void;
  removeEventListener?(type: 'ended' | 'error', listener: () => void): void;
  removeAttribute?(name: string): void;
}
export interface MusicOptions {
  tracks: readonly string[];
  engine: AudioEngine;
  random?: () => number;
  createElement?: (url: string) => MusicElement;
  /** Availability probe of the first track before « Jouer » (a small ranged fetch by default). */
  probe?: (url: string) => Promise<boolean>;
  probeTimeout?: number;
  /** The first track played starts at the beginning of one of this many equal parts, chosen at random (default: from the start). */
  startSegments?: number;
}
export type MusicState = 'idle' | 'playing' | 'paused' | 'stopped' | 'unavailable';

/**
 * Background music: one track at a time, chosen at random without repeating the previous one,
 * the next one picked and preloaded only once the current one plays. Nothing sounds before
 * start(), which must run inside a user gesture. Errors skip to another track, then give up
 * silently: music never blocks or breaks the game.
 */
export class MusicPlayer {
  private current: {url: string; element: MusicElement} | null = null;
  private next: {url: string; element: MusicElement} | null = null;
  private failed = new Set<string>();
  private enabled = true;
  private backgrounded = false;
  private started = false;
  private generation = 0;
  private disposed = false;
  private startChosen = false;
  private listeners = new Map<MusicElement, {ended: () => void; error: () => void}>();
  state: MusicState = 'idle';
  readonly history: string[] = [];
  private readonly random: () => number;
  private readonly createElement: (url: string) => MusicElement;
  constructor(private options: MusicOptions) {
    this.random = options.random ?? Math.random;
    this.createElement = options.createElement ?? (url => { const a = new Audio(); a.preload = 'none'; a.src = url; return a; });
  }
  /** Picks the first track and checks it can be fetched. Never throws; false = continue without music. */
  async prepare(): Promise<boolean> {
    if (this.disposed || this.started || this.current) return !!this.current;
    const url = this.pick(null);
    if (!url) { this.state = 'unavailable'; return false; }
    const element = this.element(url);
    this.current = {url, element};
    const probe = this.options.probe ?? probeTrack;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ok = await Promise.race([Promise.resolve().then(() => probe(url)).catch(() => false), new Promise<boolean>(r => { timer = setTimeout(() => r(false), this.options.probeTimeout ?? 10_000); })]);
    clearTimeout(timer);
    // A late probe must never replace a track already started by « Jouer » or resurrect a disposed player.
    if (this.disposed || this.started || this.current?.element !== element) return ok;
    if (!ok) { this.failed.add(url); this.release(element); this.current = null; this.state = this.pick(null) ? 'idle' : 'unavailable'; }
    return ok;
  }
  /** Inside the « Jouer » gesture. Plays the prepared track (or another available one). */
  start(): void {
    if (this.disposed) return;
    this.started = true;
    this.options.engine.unlock();
    if (this.enabled && !this.backgrounded) this.playCurrent();
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) { this.current?.element.pause(); if (this.state === 'playing') this.state = 'paused'; return; }
    if (this.started && !this.backgrounded) this.playCurrent();
  }
  /** Volume applies through the engine's Musique gain, or the element when Web Audio is missing. */
  refreshVolume(): void { const level = this.options.engine.level('music'); for (const t of [this.current, this.next]) if (t && !this.routed.has(t.element)) t.element.volume = level; }
  /** A touch after a refused resume (iOS may require a new gesture) retries the same track. */
  retryAfterGesture(): void { if (this.started && this.enabled && !this.backgrounded && this.state === 'paused') this.start(); }
  /** App hidden (switch, lock): pause without losing the position. */
  pauseForBackground(): void {
    this.backgrounded = true;
    if (this.current && !this.current.element.paused) { this.current.element.pause(); this.state = 'paused'; }
    this.options.engine.suspend();
  }
  /** App visible again: resume the same element, never a second one. */
  resumeFromBackground(): void {
    if (!this.backgrounded) return;
    this.backgrounded = false;
    this.options.engine.resume();
    if (this.started && this.enabled) this.playCurrent();
  }
  dispose(): void { this.disposed = true; this.started = false; this.generation++; for (const t of [this.current, this.next]) if (t) this.release(t.element); this.current = this.next = null; this.state = 'stopped'; }

  private routed = new WeakSet<MusicElement>();
  /** Emptying a released element's source fires 'error': those events are ignored. */
  private released = new WeakSet<MusicElement>();
  private element(url: string): MusicElement {
    const element = this.createElement(url);
    const ended = () => { if (!this.released.has(element) && this.current?.element === element) this.advance(); };
    const error = () => { if (!this.released.has(element)) this.fail(element, url); };
    this.listeners.set(element, {ended, error});
    element.addEventListener('ended', ended); element.addEventListener('error', error);
    return element;
  }
  private playCurrent(): void {
    if (this.disposed) return;
    if (!this.current) { const url = this.pick(this.history.at(-1) ?? null); if (!url) { this.state = 'unavailable'; return; } this.current = {url, element: this.element(url)}; }
    const {element, url} = this.current, generation = ++this.generation;
    if (!this.routed.has(element) && this.options.engine.attachMusic(element as unknown as HTMLMediaElement)) this.routed.add(element);
    this.refreshVolume();
    if (element.preload !== 'auto') { element.preload = 'auto'; element.load?.(); }
    if (!this.startChosen) { this.startChosen = true; this.seekToRandomPart(element); }
    if (this.history.at(-1) !== url) this.history.push(url);
    try {
      const played = element.play();
      this.state = 'playing';
      if (played && typeof played.then === 'function') played.then(() => { if (generation === this.generation) this.prepareNext(); },
        // NotAllowedError (no gesture) keeps the track; a real failure is handled by the error event.
        error => { if (generation !== this.generation || this.state !== 'playing') return;
          if (error?.name === 'NotSupportedError') this.fail(element, url); else this.state = 'paused'; });
      else this.prepareNext();
    } catch { this.fail(element, url); }
  }
  /** Once, before the first sound: jump to the start of a random part. The length is known only from the metadata. */
  private seekToRandomPart(element: MusicElement): void {
    const parts = Math.floor(this.options.startSegments ?? 1);
    if (parts <= 1) return;
    const part = Math.min(parts - 1, Math.floor(this.random() * parts));
    if (!part) return;
    let done = false;
    const seek = () => {
      const duration = element.duration ?? NaN;
      if (done || this.released.has(element) || !Number.isFinite(duration) || duration <= 0) return;
      done = true;
      try { element.currentTime = duration * part / parts; } catch { /* plays from the start */ }
    };
    if ((element.readyState ?? 0) >= 1) seek(); else element.addEventListener('loadedmetadata', seek);
  }
  /** Chooses and starts buffering the following track only while the current one plays. */
  private prepareNext(): void {
    if (this.disposed || !this.enabled || this.backgrounded || this.next || !this.current) return;
    const url = this.pick(this.current.url);
    if (!url || url === this.current.url) return;
    const element = this.element(url); element.preload = 'auto'; element.load?.();
    this.next = {url, element};
  }
  private advance(): void {
    const finished = this.current; this.current = null;
    if (finished) this.release(finished.element);
    if (this.next && !this.failed.has(this.next.url)) { this.current = this.next; this.next = null; }
    if (this.enabled && !this.backgrounded) this.playCurrent(); else this.state = 'paused';
  }
  private fail(element: MusicElement, url: string): void {
    this.failed.add(url);
    if (this.next?.element === element) { this.release(element); this.next = null; return; }
    if (this.current?.element !== element) return;
    this.release(element); this.current = null;
    if (this.next && !this.failed.has(this.next.url)) { this.current = this.next; this.next = null; }
    if (!this.pick(url)) { this.state = 'unavailable'; return; }
    if (this.started && this.enabled && !this.backgrounded) this.playCurrent();
  }
  /** Random track other than `previous`, among those not known to fail. */
  private pick(previous: string | null): string | null {
    const candidates = this.options.tracks.filter(t => !this.failed.has(t) && t !== previous);
    if (!candidates.length) return previous && !this.failed.has(previous) ? previous : null;
    return candidates[Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))];
  }
  private release(element: MusicElement): void {
    this.released.add(element);
    const listeners = this.listeners.get(element);
    if (listeners) { element.removeEventListener?.('ended', listeners.ended); element.removeEventListener?.('error', listeners.error); this.listeners.delete(element); }
    try { element.pause(); element.removeAttribute?.('src'); element.load?.(); } catch { /* already gone */ }
  }
}
/** Ranged fetch of the first 64 KiB: proves the file is reachable without downloading it. */
export async function probeTrack(url: string): Promise<boolean> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {headers: {Range: 'bytes=0-65535'}, signal: controller.signal});
    // A server may ignore Range. Cancel its body rather than downloading a whole mobile track.
    if (!response.ok) { await response.body?.cancel(); return false; }
    if (response.status !== 206) { await response.body?.cancel(); return true; }
    await response.arrayBuffer();
    return true;
  } finally { clearTimeout(timer); }
}
