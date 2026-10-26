import type {SaveStorage} from '../persistence/storage';

/** Account knowledge only: this module never imports the auth SDK. */
export const CLOUD_KEY = 'prairie-lapins.cloud.v1';
const sessions = new Set<object>();
export function setAccountSession(panel: object, connected: boolean): void {
  if (connected) sessions.add(panel); else sessions.delete(panel);
}
export function accountKnown(storage?: Pick<SaveStorage, 'getItem'>): boolean {
  if (sessions.size) return true;
  try { return (storage ?? localStorage).getItem(CLOUD_KEY) !== null; } catch { return false; }
}
