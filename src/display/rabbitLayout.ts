import {VISUAL} from '../config/visual';
import type {Point} from '../ui/gestures';

export interface RabbitHitTarget {id: string; point: Point; depth: number; radius?: number}

/** Each capacity gets a balanced arrangement; the three original slots remain unchanged. */
export function rabbitOffset(index: number, count: number): Point {
  const layout = count <= 3 ? VISUAL.rabbit.offsets : count === 4 ? VISUAL.rabbit.fourOffsets :
    count === 5 ? VISUAL.rabbit.fiveOffsets : count === 6 ? VISUAL.rabbit.sixOffsets : VISUAL.rabbit.crowdedOffsets;
  if (!Number.isInteger(count) || count < 1 || count > 7 || !Number.isInteger(index) || index < 0 || index >= count)
    throw new RangeError('Rabbit display slot outside habitat capacity');
  return {...layout[index]};
}

/** Scene time is milliseconds. Keep drift small so adjacent bodies remain distinguishable. */
export function rabbitPosition(base: Point, time: number, phase: number, fedUntil: number): Point {
  const t = time / 1000 + phase, motion = VISUAL.rabbit.motion;
  return {
    x: base.x + Math.sin(t * .5) * motion.x,
    y: base.y + Math.sin(t * .65) * motion.y - (fedUntil > time ? Math.abs(Math.sin(t * 14)) * motion.hop : 0),
  };
}

/** Nest parents stay on their oscillating spot; only the hop after feeding lifts the body, never the ground point. */
export function rabbitFedLift(time: number, phase: number, fedUntil: number): number {
  return fedUntil > time ? Math.abs(Math.sin((time / 1000 + phase) * 14)) * VISUAL.rabbit.motion.hop : 0;
}

/** Hit targets follow the animated face/body, independently of decorative ears and wings. */
export function rabbitHitPoint(position: Point, lift = 0): Point {
  return {x: position.x, y: position.y - (7 + lift) * VISUAL.rabbit.scale};
}

/** Nearest body wins; only an equal-distance overlap favors the rabbit drawn in front. */
export function rabbitHit(screen: Point, targets: readonly RabbitHitTarget[]): RabbitHitTarget | null {
  let best: RabbitHitTarget | null = null, bestDistance = Infinity;
  for (const target of targets) {
    const distance = (target.point.x - screen.x) ** 2 + (target.point.y - screen.y) ** 2;
    if (distance > (target.radius ?? VISUAL.rabbit.hitRadius) ** 2) continue;
    if (distance < bestDistance || (Math.abs(distance - bestDistance) < 1e-6 && (!best || target.depth > best.depth))) {
      best = target; bestDistance = distance;
    }
  }
  return best;
}
