import {describe, expect, it} from 'vitest';
import {CHASE_DURATION, CHASE_GAP, CHASE_TRAIL, RabbitChaseClock, RabbitChases, chaseRunTarget, chaseTarget, type ChaseRunner} from '../src/display/rabbitChase';
import {createRabbitMotion, motionZone, stepRabbitMotion} from '../src/display/rabbitMotion';

const runner = (id: string, group = 'enclos-a', available = true, x = 0): ChaseRunner => {
  const motion = createRabbitMotion(id, {x, y: 0}, 3); motion.local = {x, y: 0};
  return {id, group, motion, available};
};
/** Plays the scene: the chases, then every motion, frame after frame. */
function play(chases: RabbitChases, runners: ChaseRunner[], ms: number, reduced = false): void {
  for (let t = 0; t < ms; t += 50) { chases.step(50, runners, true, reduced); for (const r of runners) stepRabbitMotion(r.motion, 50); }
}

describe('poursuites entre lapins', () => {
  it('tire un intervalle de 40 à 90 s par enclos, déterministe et différent d\'un enclos à l\'autre', () => {
    const a = new RabbitChaseClock('enclos-a'), b = new RabbitChaseClock('enclos-b');
    for (const clock of [a, b]) { expect(clock.remaining).toBeGreaterThanOrEqual(CHASE_GAP[0]); expect(clock.remaining).toBeLessThanOrEqual(CHASE_GAP[1]); }
    expect(new RabbitChaseClock('enclos-a').remaining).toBe(a.remaining);
    expect(a.remaining).not.toBe(b.remaining);
    expect(CHASE_GAP).toEqual([40_000, 90_000]); expect(CHASE_DURATION).toEqual([3000, 5000]);
  });
  it('lance une poursuite de 3 à 5 s : le meneur court, le second le suit de près, puis tous deux reprennent leur vie', () => {
    const chases = new RabbitChases(), runners = [runner('a', 'enclos-a', true, -10), runner('b', 'enclos-a', true, 10)];
    chases.step(16, runners, true, false, true);
    const chase = chases.active.get('enclos-a')!;
    expect(chase).toBeDefined(); expect(chase.duration).toBeGreaterThanOrEqual(3000); expect(chase.duration).toBeLessThanOrEqual(5000);
    expect(runners.every(r => r.motion.mode === 'zoom')).toBe(true);
    const [lead, follow] = [chase.lead, chase.follow].map(id => runners.find(r => r.id === id)!);
    play(chases, runners, 1500);
    const zone = motionZone(lead.motion);
    for (const r of runners) {
      expect(r.motion.local.x).toBeGreaterThanOrEqual(zone.minX); expect(r.motion.local.x).toBeLessThanOrEqual(zone.maxX);
      expect(r.motion.local.y).toBeGreaterThanOrEqual(zone.minY); expect(r.motion.local.y).toBeLessThanOrEqual(zone.maxY);
    }
    // The follower aims just behind the leader (where it stood one frame ago) and is close to it.
    const behind = chaseTarget(lead.motion.local, lead.motion.facing, zone);
    expect(Math.hypot(follow.motion.to.x - behind.x, follow.motion.to.y - behind.y)).toBeLessThan(5);
    expect(Math.hypot(follow.motion.local.x - lead.motion.local.x, follow.motion.local.y - lead.motion.local.y)).toBeLessThan(CHASE_TRAIL * 3);
    play(chases, runners, 4000);
    expect(chases.active.size).toBe(0);
    expect(runners.some(r => r.motion.mode === 'zoom')).toBe(false);
  });
  it('s\'arrête proprement si un lapin devient indisponible ou si le meneur est interrompu', () => {
    const chases = new RabbitChases(), runners = [runner('a', 'enclos-a', true, -10), runner('b', 'enclos-a', true, 10)];
    chases.step(16, runners, true, false, true); play(chases, runners, 500);
    runners[0].available = false; play(chases, runners, 100);
    expect(chases.active.size).toBe(0); expect(runners.some(r => r.motion.mode === 'zoom')).toBe(false);
  });
  it('ne fait rien sans deux lapins disponibles, ni en mouvement réduit', () => {
    const benny = runner('benny', 'enclos-a', false), alone = runner('a');
    const chases = new RabbitChases();
    chases.step(16, [benny, alone], true, false, true); expect(chases.active.size).toBe(0);
    const pair = [runner('c', 'enclos-b'), runner('d', 'enclos-b', true, 12)];
    chases.step(16, pair, true, true, true); expect(chases.active.size).toBe(0);
    const sleeper = runner('e', 'enclos-c'), other = runner('f', 'enclos-c', true, 12); sleeper.motion.mode = 'sleep';
    chases.step(16, [sleeper, other], true, false, true); expect(chases.active.size).toBe(0);
    // A chase already running stops at once when reduced motion is turned on.
    const running = [runner('g', 'enclos-d'), runner('h', 'enclos-d', true, 12)];
    chases.step(16, running, true, false, true); expect(chases.active.has('enclos-d')).toBe(true);
    chases.step(16, running, true, true); expect(chases.active.has('enclos-d')).toBe(false);
  });
  it('vise toujours un point de la zone de promenade', () => {
    const zone = {minX: -5, maxX: 5, minY: -4, maxY: 4};
    expect(chaseTarget({x: 0, y: 0}, 1, zone)).toEqual({x: -5, y: 0});
    expect(chaseTarget({x: 4, y: 9}, -1, zone)).toEqual({x: 5, y: 4});
    expect(chaseRunTarget({x: -4, y: -3}, zone)).toEqual({x: 2, y: 2});
  });
  it('ne se déclenche pas toute seule avant son heure, puis se déclenche dans l\'intervalle', () => {
    const chases = new RabbitChases(), runners = [runner('a', 'enclos-z'), runner('b', 'enclos-z', true, 12)];
    let started = -1;
    for (let t = 0; t <= CHASE_GAP[1] + 1000 && started < 0; t += 100) { chases.step(100, runners, true, false); if (chases.active.size) started = t; }
    expect(started).toBeGreaterThanOrEqual(CHASE_GAP[0] - 100); expect(started).toBeLessThanOrEqual(CHASE_GAP[1]);
  });
});
