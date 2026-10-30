/** Called inside the Play gesture. Browser permission/support decides whether this succeeds.
 * Installed iPhone apps use their Apple metadata instead; no error may interrupt entry.
 */
export function requestMobileFullscreen(root: Document = document, host: Window = window): void {
  if (!host.matchMedia('(pointer: coarse)').matches || root.fullscreenElement || !root.fullscreenEnabled) return;
  try { void root.documentElement.requestFullscreen({navigationUI: 'hide'}).catch(() => {}); }
  catch { /* Unsupported options or denied requests keep the game playable. */ }
}
