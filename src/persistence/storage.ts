/** setItem must be atomic on failure, like Web Storage: old contents stay intact. */
export interface SaveStorage {
  readonly scope?: 'normal' | 'laboratory';
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  /** External changes only; returns a listener cleanup. */
  onChange?(key: string, listener: () => void): () => void;
}
export const SAVE_KEY = 'prairie-lapins.save.v1';
