/** Avoid image/canvas callouts without intercepting touch, wheel or form events. */
export function bindAppInteractions(root: Document): () => void {
  const preventImageMenu = (event: Event) => {
    if (event.target instanceof Element && event.target.closest('img, canvas')) event.preventDefault();
  };
  root.addEventListener('contextmenu', preventImageMenu);
  root.addEventListener('dragstart', preventImageMenu);
  // Native :active is inconsistent on touch browsers. Only these opt-in navigation
  // buttons get a visual press; no capture, preventDefault or synthetic click.
  let pressed: {button: HTMLButtonElement; pointerId: number} | null = null;
  const release = () => { pressed?.button.classList.remove('is-pressed'); pressed = null; };
  const press = (event: PointerEvent) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('#meadow-actions button.meadow-nav, #hud nav button.meadow-tool') : null;
    if (!button || button.disabled || event.button !== 0 || pressed) return;
    pressed = {button, pointerId: event.pointerId}; button.classList.add('is-pressed');
  };
  const end = (event: PointerEvent) => { if (event.pointerId === pressed?.pointerId) release(); };
  const leave = (event: PointerEvent) => {
    if (event.pointerId === pressed?.pointerId && !(event.relatedTarget instanceof Node && pressed.button.contains(event.relatedTarget))) release();
  };
  const background = () => { if (root.hidden) release(); };
  root.addEventListener('pointerdown', press);
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('pointerout', leave);
  root.addEventListener('visibilitychange', background);
  root.defaultView?.addEventListener('blur', release);
  return () => {
    release();
    root.removeEventListener('pointerdown', press);
    root.removeEventListener('pointerup', end);
    root.removeEventListener('pointercancel', end);
    root.removeEventListener('pointerout', leave);
    root.removeEventListener('visibilitychange', background);
    root.defaultView?.removeEventListener('blur', release);
    root.removeEventListener('contextmenu', preventImageMenu);
    root.removeEventListener('dragstart', preventImageMenu);
  };
}
