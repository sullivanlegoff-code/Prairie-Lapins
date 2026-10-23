// Deliberately small and blocking: install guards before the Phaser bundle loads.
// No service worker, persistent state, or application hooks.
(() => {
  // randomUUID is secure-context-only, but getRandomValues also works on LAN HTTP.
  // Preserve the same CSPRNG UUID v4 format; never substitute Math.random.
  if (window.crypto && typeof window.crypto.randomUUID !== 'function' && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.randomUUID = () => {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    };
  }
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) return;
  const original = viewport.content;
  const locked = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  const media = window.matchMedia('(display-mode: standalone)');
  const standalone = () => window.navigator.standalone === true || media.matches;
  const update = () => {
    const active = standalone();
    viewport.content = active ? locked : original;
    document.documentElement.classList.toggle('standalone', active);
  };
  const gesture = event => {
    // Safari outside the canvas keeps its page accessibility zoom. On the canvas,
    // only native gestures are canceled; Phaser continues to use PointerEvents.
    if (standalone() || event.target?.closest?.('#game canvas')) event.preventDefault();
  };
  const multiTouch = event => {
    // Do not cancel one-finger panel scrolling, pointer events, or synthetic clicks.
    if (standalone() && event.touches.length > 1) event.preventDefault();
  };
  for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, gesture, {capture:true, passive:false});
  for (const type of ['touchstart', 'touchmove']) document.addEventListener(type, multiTouch, {capture:true, passive:false});
  window.addEventListener('pageshow', update);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') update(); });
  media.addEventListener('change', update);
  update();
})();
