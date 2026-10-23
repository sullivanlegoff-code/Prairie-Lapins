import type {SaveStorage} from './storage';
/** Access the property lazily: even window.localStorage may throw SecurityError. */
export function browserStorage(): SaveStorage {
  return {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    onChange: (key, listener) => {
      const changed = (event: StorageEvent) => {
        if (event.key !== null && event.key !== key) return;
        try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch { return; }
        listener();
      };
      window.addEventListener('storage', changed);
      return () => window.removeEventListener('storage', changed);
    },
  };
}
