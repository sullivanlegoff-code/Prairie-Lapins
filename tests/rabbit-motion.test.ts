import {describe, expect, it, vi} from 'vitest';
import {VISUAL} from '../src/config/visual';
import {rabbitOffset} from '../src/display/rabbitLayout';
import {FED_MS, allowedBox, createRabbitMotion, minSeparation, rabbitPose, retargetRabbitMotion, stepRabbitMotion, triggerFedReaction, type RabbitMotion} from '../src/display/rabbitMotion';
import type {Point} from '../src/ui/gestures';

const roam = VISUAL.rabbit.roam;
/** Fastest ground speed: slowest tempo (.8) and the peak of the smoothstep (x1.5). */
const maxSpeed = roam.speed / .8 * 1.5;
const group = (count: number) => Array.from({length: count}, (_, index) => createRabbitMotion(`rabbit-${index + 2}`, rabbitOffset(index, count), count));
/** Advances a whole enclosure the way the scene does: each individual sees the others' places and destinations. */
function advance(motions: RabbitMotion[], dtMs: number) {
  for (const m of motions) stepRabbitMotion(m, dtMs, motions.flatMap(o => o === m ? [] : o.mode === 'walk' ? [o.local, o.to] : [o.local]));
}
const inside = (p: Point, box: ReturnType<typeof allowedBox>) => p.x >= box.minX - 1e-9 && p.x <= box.maxX + 1e-9 && p.y >= box.minY - 1e-9 && p.y <= box.maxY + 1e-9;

describe('rabbit wandering inside an enclosure', () => {
  it.each([1, 2, 3, 4, 5, 6, 7])('keeps every one of %i residents inside its safe zone, at every frame step', count => {
    for (const dt of [16, 100, 400]) {
      const motions = group(count);
      for (let t = 0; t < 120_000; t += dt) {
        advance(motions, dt);
        motions.forEach((m, index) => {
          expect(inside(m.local, allowedBox(rabbitOffset(index, count), count))).toBe(true);
          expect(inside(m.local, {minX: roam.hard.minX, maxX: roam.hard.maxX, minY: roam.hard.minY, maxY: roam.hard.maxY})).toBe(true);
        });
      }
    }
  });

  it('moves continuously: bounded ground speed, bounded height, never above the ground at rest', () => {
    const m = createRabbitMotion('rabbit-2', rabbitOffset(0, 3), 3); let previous = {...m.local}, walked = 0;
    for (let t = 0; t < 120_000; t += 16) {
      stepRabbitMotion(m, 16);
      expect(Math.hypot(m.local.x - previous.x, m.local.y - previous.y)).toBeLessThanOrEqual(maxSpeed * 16 / 1000 + 1e-9);
      previous = {...m.local}; if (m.mode === 'walk') walked++;
      const pose = rabbitPose(m);
      expect(pose.lift).toBeGreaterThanOrEqual(0); expect(pose.lift).toBeLessThanOrEqual(Math.max(roam.hopHeight, roam.walkBob, VISUAL.rabbit.motion.hop, roam.salto.height) + 1e-9);
      if (m.mode === 'rest') expect([pose.lift, pose.squashX, pose.squashY]).toEqual([0, 1, 1]);
    }
    expect(walked).toBeGreaterThan(100);
  });

  it('alternates rest, short walks and occasional hops, with a hop that peaks at its height and crouches at both ends', () => {
    const m = createRabbitMotion('rabbit-3', rabbitOffset(1, 3), 3), seen = new Set<string>(); let maxTravel = 0, from = {...m.local};
    for (let t = 0; t < 600_000; t += 20) {
      const before = m.mode; stepRabbitMotion(m, 20); seen.add(m.mode);
      if (before === 'walk' && m.mode !== 'walk') { maxTravel = Math.max(maxTravel, Math.hypot(m.local.x - from.x, m.local.y - from.y)); }
      if (before !== 'walk' && m.mode === 'walk') from = {...m.from};
    }
    expect([...seen].sort()).toEqual(['hop', 'rest', 'salto', 'walk']);
    expect(maxTravel).toBeGreaterThan(roam.minTravel - 1e-9); expect(maxTravel).toBeLessThanOrEqual(Math.hypot(2 * roam.radius.x, 2 * roam.radius.y) + 1e-9);
    const hop = createRabbitMotion('rabbit-4', {x: 0, y: 0}, 1); Object.assign(hop, {mode: 'hop', duration: roam.hopDuration * 1000});
    hop.elapsed = hop.duration / 2; expect(rabbitPose(hop)).toMatchObject({lift: roam.hopHeight, squashX: 1, squashY: 1});
    for (const u of [0, 1]) { hop.elapsed = hop.duration * u; expect(rabbitPose(hop)).toMatchObject({lift: 0, squashY: 1 - roam.squash}); }
  });

  it('turns round only on the ground, facing its way in a walk and turning by itself at rest, never too soon after the last turn', () => {
    const turn = roam.turn, motions = group(7), facing = motions.map(m => m.facing), last = motions.map(() => -1e9), restTurns = motions.map(() => [] as number[]), allTurns = motions.map(() => 0);
    let previousModes: string[] = motions.map(m => m.mode);
    // One-millisecond steps, so a turn at rest is never hidden by a hop or a walk that starts in the same step.
    for (let t = 0; t < 400_000; t++) {
      advance(motions, 1);
      motions.forEach((m, index) => {
        if (m.facing !== facing[index]) {
          // Only a walk that has just begun (towards its heading) or a rest on the ground may turn the body.
          expect(['walk', 'rest']).toContain(m.mode);
          if ((m.mode as string) === 'walk') { expect(previousModes[index]).not.toBe('walk'); expect(Math.sign(m.to.x - m.from.x)).toBe(m.facing); expect(Math.abs(m.to.x - m.from.x)).toBeGreaterThan(roam.turnThreshold); }
          else restTurns[index].push(t);
          expect(t - last[index]).toBeGreaterThanOrEqual(turn.minDelay * 1000 - 1);
          facing[index] = m.facing; last[index] = t; allTurns[index]++;
        }
      });
      previousModes = motions.map(m => m.mode);
    }
    for (let index = 0; index < 7; index++) {
      // Spontaneous turns at rest are observable, and spaced by at least the schedule's lower bound.
      expect(restTurns[index].length).toBeGreaterThanOrEqual(5);
      restTurns[index].slice(1).forEach((time, k) => expect(time - restTurns[index][k]).toBeGreaterThanOrEqual(turn.restGapMin * 1000 * .8 - 1));
      expect(allTurns[index]).toBeLessThanOrEqual(400 / turn.minDelay);
    }
  });

  it('keeps turns individual: staggered first turns, and never most of a group at once', () => {
    const motions = group(7), first = motions.map(() => -1), perWindow = new Map<number, number>(); let facing = motions.map(m => m.facing);
    for (let t = 0; t < 120_000; t += 20) {
      advance(motions, 20);
      motions.forEach((m, index) => {
        if (m.facing !== facing[index]) { if (first[index] < 0) first[index] = t; const window = Math.floor(t / 500); perWindow.set(window, (perWindow.get(window) ?? 0) + 1); }
      });
      facing = motions.map(m => m.facing);
    }
    expect(first.every(time => time >= 0)).toBe(true); expect(new Set(first).size).toBeGreaterThanOrEqual(5);
    // Independent rhythms: even by chance, the whole group never turns together.
    expect(Math.max(...perWindow.values())).toBeLessThanOrEqual(5);
  });

  it('never turns in the air or while reacting to food, even when a turn is due', () => {
    for (const mode of ['hop', 'salto', 'fed'] as const) {
      const m = createRabbitMotion('rabbit-8', rabbitOffset(0, 3), 3); const facing = m.facing;
      Object.assign(m, {mode, elapsed: 0, duration: 400, turnWait: 0, sinceTurn: 1e9});
      for (let t = 0; t < 300; t += 10) { stepRabbitMotion(m, 10); expect(m.mode).toBe(mode); expect(m.facing).toBe(facing); }
    }
    // The turn comes once the body is back on the ground and has settled.
    const landed = createRabbitMotion('rabbit-8', rabbitOffset(0, 3), 3); const before = landed.facing;
    Object.assign(landed, {mode: 'hop', elapsed: 0, duration: 400, turnWait: 0, sinceTurn: 1e9});
    for (let t = 0; t < 400; t += 10) stepRabbitMotion(landed, 10);
    expect(landed.mode).toBe('rest'); expect(landed.facing).toBe(before);
    for (let t = 0; t < roam.turn.settle * 1000 + 40; t += 10) stepRabbitMotion(landed, 10);
    expect(landed.facing).toBe(-before);
  });

  it('does not walk back against a turn made less than the minimum delay ago', () => {
    for (let seed = 0; seed < 40; seed++) {
      const m = createRabbitMotion(`rabbit-${seed + 20}`, rabbitOffset(1, 3), 3); m.mode = 'rest'; m.wait = 0; m.sinceTurn = 0; m.turnWait = 1e9; const facing = m.facing;
      stepRabbitMotion(m, 16);
      if ((m.mode as string) === 'walk' && Math.abs(m.to.x - m.from.x) > roam.turnThreshold) expect(Math.sign(m.to.x - m.from.x)).toBe(facing);
      expect(m.facing).toBe(facing);
    }
  });

  it('is the same whatever the frame step, and a long gap moves a resident by at most one capped step', () => {
    const finals = [10, 25, 100].map(dt => {
      const m = createRabbitMotion('rabbit-5', rabbitOffset(2, 3), 3);
      for (let t = 0; t < 90_000; t += dt) stepRabbitMotion(m, dt);
      return m.local;
    });
    for (const p of finals) { expect(p.x).toBeCloseTo(finals[0].x, 6); expect(p.y).toBeCloseTo(finals[0].y, 6); }
    const m = createRabbitMotion('rabbit-6', rabbitOffset(0, 3), 3); m.wait = 0; m.rng = 12345;
    const before = {...m.local}; stepRabbitMotion(m, 3_600_000);
    expect(Math.hypot(m.local.x - before.x, m.local.y - before.y)).toBeLessThanOrEqual(maxSpeed * roam.maxStep + 1e-9);
  });

  it('keeps crowded groups apart: destinations avoid the others and nobody stays on top of a neighbour', () => {
    for (const count of [5, 7]) {
      const motions = group(count); let overlapping = 0, frames = 0, closest = Infinity;
      for (let t = 0; t < 600_000; t += 33) {
        advance(motions, 33); frames++;
        let tooClose = false;
        for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
          const d = Math.hypot(motions[i].local.x - motions[j].local.x, motions[i].local.y - motions[j].local.y);
          closest = Math.min(closest, d); if (d < minSeparation(count) / 2) tooClose = true;
        }
        if (tooClose) overlapping++;
      }
      expect(overlapping / frames).toBeLessThan(.01);
      expect(closest).toBeGreaterThan(5);
    }
  });

  it.each([5, 6, 7])('keeps every one of %i crowded residents alive: each one walks regularly', count => {
    const motions = group(count), walks = motions.map(() => 0), modes = motions.map(m => m.mode);
    for (let t = 0; t < 300_000; t += 33) {
      advance(motions, 33);
      motions.forEach((m, index) => { if (m.mode === 'walk' && modes[index] !== 'walk') walks[index]++; modes[index] = m.mode; });
    }
    for (const n of walks) expect(n).toBeGreaterThanOrEqual(12);
  });
  it('reacts to feeding without stacking animations: stays in place, hops on the ground phase, then rests', () => {
    const m = createRabbitMotion('rabbit-7', rabbitOffset(0, 3), 3); m.wait = 0; stepRabbitMotion(m, 16);
    const place = {...m.local}; triggerFedReaction(m); triggerFedReaction(m);
    let peak = 0;
    for (let t = 0; t + 5 < FED_MS; t += 5) {
      stepRabbitMotion(m, 5); expect(m.mode).toBe('fed'); expect(m.local).toEqual(place);
      peak = Math.max(peak, rabbitPose(m).lift);
    }
    expect(peak).toBeGreaterThan(VISUAL.rabbit.motion.hop * .8); expect(peak).toBeLessThanOrEqual(VISUAL.rabbit.motion.hop + 1e-9);
    for (let t = 0; t < 20; t += 5) stepRabbitMotion(m, 5);
    expect(m.mode).toBe('rest'); expect(rabbitPose(m).lift).toBe(0);
  });

  it('never uses the shared random generator, and is deterministic per identifier', () => {
    const random = vi.spyOn(Math, 'random');
    const run = (id: string) => { const m = createRabbitMotion(id, rabbitOffset(0, 3), 3); for (let t = 0; t < 60_000; t += 16) stepRabbitMotion(m, 16); return m.local; };
    expect(run('rabbit-2')).toEqual(run('rabbit-2')); expect(run('rabbit-2')).not.toEqual(run('rabbit-3'));
    expect(random).not.toHaveBeenCalled(); random.mockRestore();
  });

  it('keeps an existing resident in place when its slot changes, then walks it back without a jump', () => {
    const m = createRabbitMotion('rabbit-2', rabbitOffset(0, 3), 3); const place = {...m.local};
    retargetRabbitMotion(m, rabbitOffset(2, 7), 7);
    expect(m.local).toEqual(place);
    const box = allowedBox(rabbitOffset(2, 7), 7); let previous = {...m.local};
    for (let t = 0; t < 30_000; t += 16) {
      stepRabbitMotion(m, 16); expect(Math.hypot(m.local.x - previous.x, m.local.y - previous.y)).toBeLessThanOrEqual(maxSpeed * 16 / 1000 + 1e-9); previous = {...m.local};
    }
    expect(inside(m.local, box)).toBe(true);
  });
});
