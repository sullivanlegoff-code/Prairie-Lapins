import {afterEach, describe, expect, it, vi} from 'vitest';
import {VISUAL} from '../src/config/visual';
import {rabbitOffset} from '../src/display/rabbitLayout';
import {allowedBox, canSalto, createRabbitMotion, rabbitPose, retargetRabbitMotion, stepRabbitMotion, triggerFedReaction, type RabbitMotion} from '../src/display/rabbitMotion';

const roam = VISUAL.rabbit.roam, salto = roam.salto, TAU = Math.PI * 2;
const config = roam.salto as {chance: number};
const defaultChance = salto.chance;
afterEach(() => { config.chance = defaultChance; vi.restoreAllMocks(); });
const rabbit = (id = 'rabbit-2', count = 3, index = 0) => createRabbitMotion(id, rabbitOffset(index, count), count);
const startSalto = (m: RabbitMotion) => { m.mode = 'salto'; m.elapsed = 0; m.duration = salto.duration * 1000; };
/** Smallest angular difference, since a full turn and no turn look the same. */
const turnBetween = (a: number, b: number) => Math.abs(((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI);

describe('occasional somersaults', () => {
  it.each(['rabbit-2', 'rabbit-3', 'rabbit-9'])('%s does them now and then, always from a pause, and far less often than walks and hops', id => {
    const m = rabbit(id); let saltos = 0, walks = 0, hops = 0, previous = m.mode;
    for (let t = 0; t < 3_600_000; t += 33) {
      stepRabbitMotion(m, 33);
      if (m.mode !== previous) {
        if (m.mode === 'salto') { saltos++; expect(previous).toBe('rest'); } if (m.mode === 'walk') walks++; if (m.mode === 'hop') hops++;
        previous = m.mode;
      }
    }
    expect(saltos).toBeGreaterThanOrEqual(3); expect(saltos * 4).toBeLessThan(walks); expect(saltos * 3).toBeLessThan(hops);
  });

  it('turns once, smoothly, about the body, and lands exactly upright and flat on the ground', () => {
    const m = rabbit(); startSalto(m); m.facing = 1;
    expect(rabbitPose(m)).toMatchObject({rotation: 0, lift: 0, squashY: 1 - roam.squash});
    m.elapsed = m.duration / 2; expect(rabbitPose(m).rotation).toBeCloseTo(Math.PI, 9); expect(rabbitPose(m).lift).toBeCloseTo(salto.height, 9);
    m.elapsed = 0; let previous = 0, travelled = 0, peak = 0;
    for (let t = 0; t + 4 < m.duration; t += 4) {
      stepRabbitMotion(m, 4); expect(m.mode).toBe('salto'); const pose = rabbitPose(m);
      expect(pose.facing).toBe(1); expect(pose.rotation).toBeGreaterThanOrEqual(0);
      travelled += turnBetween(pose.rotation, previous); previous = pose.rotation; peak = Math.max(peak, pose.lift);
    }
    stepRabbitMotion(m, 20);
    expect(travelled).toBeGreaterThan(TAU * .95); expect(travelled).toBeLessThan(TAU * 1.05); expect(peak).toBeGreaterThan(salto.height * .95);
    expect(m.mode).toBe('rest'); expect(rabbitPose(m)).toEqual({lift: 0, squashX: 1, squashY: 1, facing: 1, rotation: 0});
  });

  it('keeps the mirror and turns in the facing direction', () => {
    for (const facing of [1, -1] as const) {
      const m = rabbit(); startSalto(m); m.facing = facing;
      for (let t = 0; t < m.duration - 1; t += 8) { stepRabbitMotion(m, 8); const pose = rabbitPose(m); expect(pose.facing).toBe(facing); expect(Math.sign(pose.rotation) * facing).toBeGreaterThanOrEqual(0); }
      expect(m.facing).toBe(facing);
    }
  });

  it('stays on the same ground point and moves smoothly at any frame step', () => {
    for (const dt of [8, 16, 33, 100]) {
      const m = rabbit('rabbit-4', 7, 3), ground = {...m.local}; startSalto(m); m.facing = -1;
      let pose = rabbitPose(m);
      for (let t = 0; t < salto.duration * 1000; t += dt) {
        stepRabbitMotion(m, dt); expect(m.local).toEqual(ground); const next = rabbitPose(m);
        expect(turnBetween(next.rotation, pose.rotation)).toBeLessThanOrEqual(TAU * 1.5 / (.7 * salto.duration) * dt / 1000 * 1.05 + 1e-9);
        expect(Math.abs(next.lift - pose.lift)).toBeLessThanOrEqual(salto.height * 4 / (salto.duration * 1000) * dt * 1.05 + 1e-9);
        pose = next;
      }
      expect(m.local).toEqual(ground);
    }
  });

  it('is deferred, never forced, near the edge of the zone or close to a neighbour', () => {
    config.chance = 1; const {hard} = roam;
    const watch = (setup: (m: RabbitMotion) => void, others: {x: number; y: number}[]) => {
      const m = rabbit(); setup(m); let saltos = 0, previous = m.mode;
      for (let t = 0; t < 60_000; t += 33) { stepRabbitMotion(m, 33, others); if (m.mode === 'salto' && previous !== 'salto') saltos++; previous = m.mode; if (m.mode === 'walk') { m.mode = 'rest'; m.wait = 10; m.local = {...m.from}; } }
      return saltos;
    };
    const edge = (x: number, y: number) => (m: RabbitMotion) => { m.local = {x, y}; m.from = {x, y}; m.mode = 'rest'; m.wait = 0; };
    expect(canSalto(Object.assign(rabbit(), {local: {x: 0, y: 10}}), [])).toBe(true);
    expect(canSalto(Object.assign(rabbit(), {local: {x: hard.minX + 1, y: 10}}), [])).toBe(false);
    expect(canSalto(Object.assign(rabbit(), {local: {x: hard.maxX - 1, y: 10}}), [])).toBe(false);
    expect(canSalto(Object.assign(rabbit(), {local: {x: 0, y: hard.minY + 1}}), [])).toBe(false);
    expect(canSalto(Object.assign(rabbit(), {local: {x: 0, y: hard.maxY - 1}}), [])).toBe(false);
    expect(canSalto(Object.assign(rabbit(), {local: {x: 0, y: 10}}), [{x: salto.clearance - 1, y: 10}])).toBe(false);
    expect(watch(edge(hard.maxX - 1, 10), [])).toBe(0);
    expect(watch(edge(0, 10), [{x: 3, y: 10}])).toBe(0);
    expect(watch(edge(0, 10), [])).toBeGreaterThan(5);
  });

  it('gives each individual its own rhythm and never touches the shared random generator', () => {
    config.chance = .5; const random = vi.spyOn(Math, 'random');
    const first = Array.from({length: 7}, (_, index) => {
      const m = rabbit(`rabbit-${index + 2}`, 7, index);
      for (let t = 0; t < 120_000; t += 20) { stepRabbitMotion(m, 20); if ((m.mode as string) === 'salto') return t; }
      return -1;
    });
    expect(first.every(time => time >= 0)).toBe(true); expect(new Set(first).size).toBeGreaterThanOrEqual(5); expect(random).not.toHaveBeenCalled();
  });

  it('lands before a feeding reaction starts, without any change in the pose at the moment of feeding', () => {
    const m = rabbit(); startSalto(m); m.facing = 1; stepRabbitMotion(m, 100);
    const before = rabbitPose(m); triggerFedReaction(m);
    expect(m.mode).toBe('salto'); expect(rabbitPose(m)).toEqual(before);
    let previous = before.rotation;
    for (let t = 0; t < salto.duration * 1000; t += 8) {
      if (m.mode !== 'salto') break; stepRabbitMotion(m, 8);
      if (m.mode === 'salto') { expect(turnBetween(rabbitPose(m).rotation, previous)).toBeLessThan(.13); previous = rabbitPose(m).rotation; }
    }
    // The reaction begins right at the landing: upright, with only the first instants of its own hop.
    expect(m.mode).toBe('fed'); expect(rabbitPose(m)).toMatchObject({rotation: 0, squashY: 1}); expect(rabbitPose(m).lift).toBeLessThan(1); expect(m.fedQueued).toBe(false);
  });

  it('is not interrupted by a change of slot: it lands, then walks back if it ended outside the new zone', () => {
    const m = rabbit(); const place = {...m.local}; startSalto(m); stepRabbitMotion(m, 300);
    retargetRabbitMotion(m, rabbitOffset(6, 7), 7);
    expect(m.mode).toBe('salto'); expect(m.local).toEqual(place);
    for (let t = 0; t < 2000 && m.mode === 'salto'; t += 10) stepRabbitMotion(m, 10);
    const box = allowedBox(rabbitOffset(6, 7), 7), outside = place.x < box.minX || place.x > box.maxX || place.y < box.minY || place.y > box.maxY;
    expect(m.mode).toBe(outside ? 'walk' : 'rest');
  });

  it('advances at most one capped step after a long gap', () => {
    const m = rabbit(); startSalto(m); stepRabbitMotion(m, 3_600_000);
    expect(m.mode).toBe('salto'); expect(m.elapsed).toBeLessThanOrEqual(roam.maxStep * 1000 + 1e-9);
  });
});
