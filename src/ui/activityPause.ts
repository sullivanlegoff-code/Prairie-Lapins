/**
 * A game's own clock: it stands still while the game is paused, so the rules (absolute times in each game's state) never see the
 * time the phone spent locked or in another app.
 */
export function pausableClock(real: () => number) {
  let lost = 0, pausedAt: number | null = null;
  return {
    now: () => (pausedAt ?? real()) - lost,
    pause() { pausedAt ??= real(); },
    resume() { if (pausedAt !== null) { lost += real() - pausedAt; pausedAt = null; } },
  };
}
/** The end card ignores touches for a moment: a tap meant for the game never starts the next one unread. */
export function settleCard(card: HTMLElement, ms = 400): void {
  card.style.pointerEvents = 'none';
  setTimeout(() => { card.style.pointerEvents = ''; }, ms);
}
/**
 * Pauses a game whenever the player leaves the page: another app or tab (`visibilitychange`), or the page put away by Safari
 * (`pagehide`, which iOS may send without a visibility change). Shared by the arcade games (plan 3.9).
 */
export function pauseWhenLeft(pause: () => void, signal: AbortSignal): void {
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, {signal});
  window.addEventListener('pagehide', () => pause(), {signal});
}
