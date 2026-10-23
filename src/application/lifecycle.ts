/** Injectable event/timer wiring. Starts once, stops all callbacks on disposal. */
export interface LifecycleHost {
  isVisible(): boolean;
  on(event: 'visibilitychange' | 'pageshow' | 'pagehide', listener: () => void): () => void;
  every(milliseconds: number, listener: () => void): () => void;
}
export function bindLifecycle(controller: {refresh(): void}, host: LifecycleHost): {start(): void; stop(): void} {
  let cleanups: (() => void)[] = [];
  let running = false;
  const refresh = () => { if (running) controller.refresh(); };
  const visibleRefresh = () => { if (host.isVisible()) refresh(); };
  return {
    start() {
      if (running) return;
      running = true;
      cleanups = [host.on('visibilitychange', refresh), host.on('pageshow', visibleRefresh),
        host.on('pagehide', refresh), host.every(5_000, visibleRefresh)];
    },
    stop() { running = false; for (const cleanup of cleanups) cleanup(); cleanups = []; },
  };
}
