import type {LifecycleHost} from '../application/lifecycle';
export function browserLifecycle(): LifecycleHost {
  return {
    isVisible: () => document.visibilityState === 'visible',
    on(event, listener) {
      const target = event === 'visibilitychange' ? document : window;
      target.addEventListener(event, listener);
      return () => target.removeEventListener(event, listener);
    },
    every(milliseconds, listener) {
      const timer = window.setInterval(listener, milliseconds);
      return () => window.clearInterval(timer);
    },
  };
}
