/**
 * A full-screen mini-game downloaded only when it is first wanted (plan 5.4, 23 November 2026): the game starts lighter, as it
 * already did for « Benny Rampage ». `prepare` starts the download early (its menu is open); `open` waits for it. A failed
 * download (no network) is tried again at the next `prepare` or `open`.
 */
export type ActivityHandle<A extends unknown[]> = {readonly active: boolean; open(...args: A): void; close(): void; dispose(): void};
export type LazyActivity<A extends unknown[]> = ActivityHandle<A> & {prepare(): void};

export function lazyActivity<A extends unknown[]>(load: () => Promise<ActivityHandle<A>>): LazyActivity<A> {
  let activity: ActivityHandle<A> | null = null, loading: Promise<ActivityHandle<A> | null> | null = null, disposed = false;
  const get = () => loading ??= load().then(loaded => {
    if (disposed) { loaded.dispose(); return null; }
    return activity = loaded;
  }, () => { loading = null; return null; });
  return {
    get active() { return activity?.active ?? false; },
    prepare: () => { if (!disposed) void get(); },
    open: (...args: A) => { if (!disposed) void get().then(a => a?.open(...args)); },
    close: () => activity?.close(),
    dispose: () => { disposed = true; activity?.dispose(); },
  };
}
