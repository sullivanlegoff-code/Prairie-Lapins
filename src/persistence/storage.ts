/** setItem must be atomic on failure, like Web Storage: old contents stay intact. */
export interface SaveStorage {
  readonly scope?: 'normal' | 'laboratory';
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  /** External changes only; returns a listener cleanup. */
  onChange?(key: string, listener: () => void): () => void;
}
export const SAVE_KEY = 'prairie-lapins.save.v1';
/** The save as it was at the last start where it could be read (plan 1.7): offered back when the save becomes unreadable. */
export const PREVIOUS_SAVE_KEY = 'prairie-lapins.save.previous.v1';
/** An unreadable save, kept as it was before the previous copy replaced it. */
export const UNREADABLE_SAVE_KEY = 'prairie-lapins.save.unreadable.v1';
