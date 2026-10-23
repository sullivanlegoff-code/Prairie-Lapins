import {Gestures, type MeadowCamera, type Point} from '../ui/gestures';
/** Only the canvas owns these listeners; sibling HTML panels never feed camera gestures. */
export function bindMeadowInput(canvas: HTMLCanvasElement, view: MeadowCamera, tap: (point: Point) => void,
  blocked: () => boolean, updateCamera: () => void): () => void {
  const abort = new AbortController(), gestures = new Gestures();
  const local = (event: PointerEvent | WheelEvent): Point => { const rect = canvas.getBoundingClientRect(); return {x: event.clientX - rect.left, y: event.clientY - rect.top}; };
  const options = {signal: abort.signal};
  canvas.addEventListener('pointerdown', event => {
    if (blocked()) return;
    event.preventDefault(); gestures.down(event.pointerId, local(event)); view.interaction(true); canvas.setPointerCapture(event.pointerId);
  }, options);
  canvas.addEventListener('pointermove', event => {
    if (blocked()) { gestures.cancel(); view.interaction(false); updateCamera(); return; }
    if (view.resizing) return; // Ignore coordinates from the new viewport until all fingers lift.
    const gesture = gestures.move(event.pointerId, local(event));
    if (gesture?.type === 'pan') view.pan(gesture.dx, gesture.dy);
    if (gesture?.type === 'zoom') { view.scale(gesture.factor, gesture.at, gesture.dx, gesture.dy); }
    updateCamera();
  }, options);
  canvas.addEventListener('pointerup', event => {
    const resized = view.resizing;
    const gesture = gestures.up(event.pointerId, local(event));
    view.interaction(gestures.active); updateCamera();
    if (gesture?.type === 'tap' && !resized && !blocked()) tap(gesture.at);
  }, options);
  canvas.addEventListener('pointercancel', () => { gestures.cancel(); view.interaction(false); updateCamera(); }, options);
  canvas.addEventListener('wheel', event => {
    if (blocked()) return;
    event.preventDefault(); view.scale(Math.exp(-event.deltaY * .001), local(event)); updateCamera();
  }, {...options, passive: false});
  return () => { abort.abort(); gestures.cancel(); view.interaction(false); };
}
