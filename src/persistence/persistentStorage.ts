/**
 * Asks the browser to keep this site's storage (plan 1.6): without it, Safari on iPhone may clear a game after seven days without
 * a visit in the browser tab. A refusal or a missing API changes nothing; this never throws. Resolves whether storage is kept.
 */
export async function requestPersistentStorage(nav: {storage?: {persisted?: () => Promise<boolean>; persist?: () => Promise<boolean>}} = navigator): Promise<boolean> {
  try {
    const storage = nav.storage;
    if (!storage?.persist) return false;
    if (await storage.persisted?.()) return true;
    return await storage.persist();
  } catch { return false; }
}
/**
 * Whether the game runs in a Safari tab on iPhone or iPad rather than from the home screen: only iOS Safari defines
 * `navigator.standalone`, false in a tab. There, the browser may clear the game; from the home screen, it does not.
 */
export function inIosSafariTab(nav: {standalone?: boolean} = navigator as Navigator & {standalone?: boolean}): boolean {
  return nav.standalone === false;
}
