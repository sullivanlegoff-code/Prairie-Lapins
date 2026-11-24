/**
 * Plan 5.3 (23 November 2026): the island is drawn at 30 images a second once the player has not touched the screen for a few
 * seconds (battery, warmth), and at full rate again at the first touch. Phaser's loop runs every frame when its limit is 0; at
 * 30 ms it draws every second frame of a 60 Hz screen (a little under 33 ms, so a late frame never skips one more).
 * The loop must have been created with a frame limit (`fps: {limit}`), so that it uses its limited step at all.
 */
export const IDLE_AFTER_MS = 5000;
export const IDLE_FRAME_MS = 30;
type LimitedLoop = {_limitRate: number};
const INPUT_EVENTS = ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'] as const;

export function slowWhenIdle(loop: LimitedLoop, target: EventTarget, options: {signal?: AbortSignal} = {}): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const idle = () => { timer = null; loop._limitRate = IDLE_FRAME_MS; };
  const active = () => {
    loop._limitRate = 0;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(idle, IDLE_AFTER_MS);
  };
  for (const type of INPUT_EVENTS) target.addEventListener(type, active, {passive: true, capture: true, signal: options.signal});
  active();
  return active;
}
