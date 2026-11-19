/**
 * What « Benny Rampage » says to the player, kept off the middle of the screen (like the lane runners the owner plays: the
 * road stays clear). Two channels:
 * - tips: one sentence at a time, on a full label under the top bar; the others wait their turn in a short queue (a tip that
 *   waited too long is dropped: the obstacle it spoke of is gone). The tutorial's advice holds the label until its step is done.
 * - words: a short, big word for a moment (« 3 coups », « Frénésie ! », « 500 m ! »); a more important one is never cut by a
 *   smaller one, and the smaller one is simply left out (it is brief by nature).
 * Pure: the caller gives the time (ms) and draws what `tick` / `word` return.
 */
/** At most this many tips wait; one waiting longer than `TIP_STALE` ms is dropped; `TIP_GAP` ms of empty label between two. */
export const TIP_QUEUE = 3, TIP_STALE = 5000, TIP_GAP = 180;
/** How long a tip stays up: long enough to be read (about 55 ms a letter), 1.6 s at least, 3.4 s at most. */
export const tipMs = (text: string) => Math.min(3400, Math.max(1600, text.length * 55));

export class RunTips {
  private shown: {text: string; until: number; held: boolean} | null = null;
  private queue: {text: string; at: number}[] = [];
  private freeAt = 0;
  /** A tip; `urgent` shows at once (the one it cuts short comes back first after it). */
  say(text: string, now: number, urgent = false): void {
    if (this.shown?.text === text || this.queue.some(q => q.text === text)) return;
    if (urgent && !this.shown?.held) {
      if (this.shown) this.queue.unshift({text: this.shown.text, at: now});
      this.shown = {text, until: now + tipMs(text), held: false}; this.trim(); return;
    }
    if (urgent) this.queue.unshift({text, at: now}); else this.queue.push({text, at: now});
    this.trim();
  }
  /** The tutorial's advice: it stays until replaced or let go (`null`); the queue waits behind it. */
  hold(text: string | null, now: number): void {
    if (text !== null) { this.shown = {text, until: Infinity, held: true}; return; }
    if (this.shown?.held) { this.shown = null; this.freeAt = now + TIP_GAP; }
  }
  get held(): boolean { return !!this.shown?.held; }
  /** The tip to show now, or null. */
  tick(now: number): string | null {
    if (this.shown && !this.shown.held && now >= this.shown.until) { this.shown = null; this.freeAt = now + TIP_GAP; }
    if (!this.shown?.held) this.queue = this.queue.filter(q => now - q.at < TIP_STALE);
    if (!this.shown && now >= this.freeAt) {
      const next = this.queue.shift();
      if (next) this.shown = {text: next.text, until: now + tipMs(next.text), held: false};
    }
    return this.shown?.text ?? null;
  }
  get waiting(): number { return this.queue.length; }
  clear(): void { this.shown = null; this.queue = []; this.freeAt = 0; }
  private trim(): void { while (this.queue.length > TIP_QUEUE) this.queue.splice(this.queue.length - 1, 1); }
}

/** A word's weight: a combo's count, an ordinary cheer, a big moment (kilometre, frenzy), the record (at once), the 3, 2, 1. */
export const WORD = {combo: 0, cheer: 1, big: 2, record: 3, count: 4} as const;
export type WordRank = typeof WORD[keyof typeof WORD];
export type RunWord = {text: string; sub?: string; at: number; ms: number; rank: WordRank};
/** How long a word stays (ms): brief. */
export const wordMs = (rank: WordRank) => rank === WORD.count ? 500 : rank === WORD.combo ? 700 : rank >= WORD.big ? 1300 : 1000;

export class RunWords {
  shown: RunWord | null = null;
  /** A big moment that came while another was showing: it follows it (one at most). */
  private next: RunWord | null = null;
  /** Says a word; returns it when it shows now (null: left out, or waiting for the big one before it). */
  say(text: string, now: number, rank: WordRank = WORD.cheer, sub?: string): RunWord | null {
    const word: RunWord = {text, sub, at: now, ms: wordMs(rank), rank};
    const live = this.current(now);
    if (live && live.rank > rank) return null;
    // Two big moments together: the second waits for the first to be read (for half of its time at least).
    if (live && rank === WORD.big && live.rank === WORD.big && now - live.at < live.ms / 2) { this.next = word; return null; }
    this.shown = word; return word;
  }
  /** The word up now; a waiting big moment takes over once the one before it has been read. */
  current(now: number): RunWord | null {
    if (this.shown && now - this.shown.at >= this.shown.ms) this.shown = null;
    if (this.next && (!this.shown || now - this.shown.at >= this.shown.ms / 2) && now - this.next.at < 1500) { this.shown = {...this.next, at: now}; this.next = null; return this.shown; }
    if (this.next && now - this.next.at >= 1500) this.next = null;
    return this.shown;
  }
  clear(): void { this.shown = null; this.next = null; }
}
