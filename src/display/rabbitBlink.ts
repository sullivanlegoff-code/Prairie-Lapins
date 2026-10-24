/** Stateless schedules in scene milliseconds: no timers, random generator or dependence on frame rate. */
export function rabbitFaceSeed(id: string): number {
  let seed = 2166136261;
  for (let i = 0; i < id.length; i++) seed = Math.imul(seed ^ id.charCodeAt(i), 16777619);
  return seed >>> 0;
}
function unit(seed: number, cycle: number, salt: number): number {
  let h = seed ^ Math.imul(cycle, 0x9e3779b1) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
export function rabbitFaceEvent(seed: number, cycle: number, nose = false) {
  // Independent period and initial phase per rabbit, with bounded jitter for each successive event.
  const period = nose ? 4400 + unit(seed, 0, 1) * 5200 : 2800 + unit(seed, 0, 2) * 2700;
  const jitter = nose ? 200 : 150;
  return {start: cycle * period + unit(seed, 0, nose ? 3 : 4) * period + unit(seed, cycle, 5) * jitter * 2,
    duration: nose ? 80 + unit(seed, cycle, 6) * 30 : 110 + unit(seed, cycle, 7) * 50,
    gap: 80 + unit(seed, cycle, 8) * 30,
    count: nose ? (unit(seed, cycle, 9) < .5 ? 2 : 3) : (unit(seed, cycle, 10) < .2 ? 2 : 1), period};
}
function active(seed: number, time: number, nose: boolean): boolean {
  const period = nose ? 4400 + unit(seed, 0, 1) * 5200 : 2800 + unit(seed, 0, 2) * 2700;
  const cycle = Math.floor(time / period);
  // An event may straddle its time slot; only these two slots can intersect the current instant.
  for (let i = cycle - 1; i <= cycle; i++) {
    const event = rabbitFaceEvent(seed, i, nose), elapsed = time - event.start;
    if (elapsed >= 0 && elapsed < event.count * (event.duration + event.gap) && elapsed % (event.duration + event.gap) < event.duration) return true;
  }
  return false;
}
/** Bit 0: eyes closed; bit 1: nose wrinkled. Nose bursts are reserved for resting residents. */
export function rabbitFaceState(seed: number, time: number, resting = true): number {
  return (active(seed, time, false) ? 1 : 0) | (resting && active(seed, time, true) ? 2 : 0);
}
