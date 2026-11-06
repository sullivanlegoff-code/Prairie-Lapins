/** Keep the game shell and canvas in sync when mobile browser chrome settles late.
 * Native page zoom and the keyboard keep their own viewport; never fight either.
 */
/** Largest gap (CSS px) between the reported viewport and the screen that an installed app fills: status bar plus home bar. */
export const MAX_INSTALLED_GAP = 80;
export function bindAppViewport(onResize: () => void, host: Window = window, root: Document = document): () => void {
  const style = root.documentElement.style, viewport = host.visualViewport;
  const previous = ['--app-width', '--app-height'].map(name => style.getPropertyValue(name));
  let frame = 0, alive = true;
  const timers = new Set<number>();
  const editing = () => root.activeElement?.matches('input:not([type=range]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable]:not([contenteditable=false])') ?? false;
  // Opened from the home screen there is no browser bar at all, but iOS may still report a viewport one status bar short
  // (the area under the translucent bar, or after a rotation), which would leave a cream strip below the game.
  const installed = () => (host.navigator as {standalone?: boolean} | undefined)?.standalone === true
    || !!host.matchMedia?.('(display-mode: standalone)').matches || !!host.matchMedia?.('(display-mode: fullscreen)').matches;
  /** Only a gap the size of a status bar or home indicator is filled: an iPad window in split view stays its own size. */
  const fill = (size: number, screenSize: number) => screenSize > size && screenSize - size <= MAX_INSTALLED_GAP ? screenSize : size;
  const apply = () => {
    frame = 0;
    if (!alive || root.visibilityState === 'hidden' || editing() || (viewport && Math.abs(viewport.scale - 1) > .01)) return;
    let width = viewport?.width ?? host.innerWidth, height = viewport?.height ?? host.innerHeight;
    if (installed() && host.screen?.width && host.screen?.height) {
      const long = Math.max(host.screen.width, host.screen.height), short = Math.min(host.screen.width, host.screen.height);
      const landscape = width > height;
      width = fill(width, landscape ? long : short); height = fill(height, landscape ? short : long);
    }
    if (!(width > 0 && height > 0)) return;
    style.setProperty('--app-width', `${width}px`);
    style.setProperty('--app-height', `${height}px`);
    // The page itself has no scrollable content. iOS can retain a document scroll
    // after dismissing its keyboard; do this only after editing/zoom have ended.
    if (host.scrollX || host.scrollY) host.scrollTo(0, 0);
    onResize();
  };
  const schedule = () => { if (alive && !frame) frame = host.requestAnimationFrame(apply); };
  const settle = () => {
    for (const timer of timers) host.clearTimeout(timer);
    timers.clear(); schedule();
    // A rotation/pageshow may precede the final visual viewport by several frames.
    for (const delay of [120, 350, 700]) {
      const timer = host.setTimeout(() => { timers.delete(timer); schedule(); }, delay);
      timers.add(timer);
    }
  };
  const shown = () => { if (root.visibilityState !== 'hidden') settle(); };
  host.addEventListener('resize', schedule);
  host.addEventListener('orientationchange', settle);
  host.addEventListener('pageshow', settle);
  root.addEventListener('visibilitychange', shown);
  root.addEventListener('focusout', settle);
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  settle();
  return () => {
    alive = false;
    host.cancelAnimationFrame(frame);
    for (const timer of timers) host.clearTimeout(timer);
    host.removeEventListener('resize', schedule);
    host.removeEventListener('orientationchange', settle);
    host.removeEventListener('pageshow', settle);
    root.removeEventListener('visibilitychange', shown);
    root.removeEventListener('focusout', settle);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    ['--app-width', '--app-height'].forEach((name, index) => previous[index] ? style.setProperty(name, previous[index]) : style.removeProperty(name));
  };
}
