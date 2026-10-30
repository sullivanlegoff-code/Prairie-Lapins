import {endRabbitActivity, KISS_MS, motionZone, startRabbitActivity, triggerWelcomeSalto, type RabbitMotion} from './rabbitMotion';
import type {Point} from '../ui/gestures';

export type InteractionKind = 'play' | 'cuddle' | 'read';
/** A visitor stays inside its own fence, independent of all simulation randomness. */
export function interactionTarget(motion: RabbitMotion, relativeObject: Point): Point {
  const z = motionZone(motion);
  return {x: Math.max(z.minX + 4, Math.min(z.maxX - 4, relativeObject.x)), y: Math.max(z.minY + 4, Math.min(z.maxY - 4, relativeObject.y))};
}
export class CozyInteraction {
  active: {id: string; objectId: string; motion: RabbitMotion; kind: InteractionKind; phase: 'approach' | 'enjoy'; elapsed: number} | null = null;
  start(id: string, objectId: string, motion: RabbitMotion, target: Point, kind: InteractionKind): boolean {
    if (this.active || !['rest', 'walk'].includes(motion.mode)) return false;
    startRabbitActivity(motion, 'meet', interactionTarget(motion, target));
    this.active = {id, objectId, motion, kind, phase: 'approach', elapsed: 0}; return true;
  }
  reset(): void {
    if (this.active && ['meet', 'kiss'].includes(this.active.motion.mode)) endRabbitActivity(this.active.motion);
    this.active = null;
  }
  step(dt: number, enabled: boolean, present: boolean, reduced: boolean): void {
    const a = this.active; if (!a) return;
    if (!present || reduced || !['meet', 'kiss', 'salto'].includes(a.motion.mode)) { this.reset(); return; }
    if (!enabled || dt < 0 || dt > 1000) return;
    a.elapsed += dt;
    if (a.phase === 'approach' && a.motion.elapsed >= a.motion.duration) {
      a.phase = 'enjoy'; a.elapsed = 0;
      if (a.kind === 'play') triggerWelcomeSalto(a.motion, false);
      else startRabbitActivity(a.motion, a.kind === 'cuddle' ? 'kiss' : 'meet');
    }
    if (a.elapsed >= (a.phase === 'approach' ? 20000 : a.kind === 'cuddle' ? KISS_MS : 4000)) this.reset();
  }
}
