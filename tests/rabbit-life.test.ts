import {describe, expect, it} from 'vitest';
import {RabbitLife, NAP_MS, type LifeResident, type LifeTiming} from '../src/display/rabbitLife';
import {createRabbitMotion, motionZone, rabbitPose, stepRabbitMotion, triggerFedReaction} from '../src/display/rabbitMotion';

const quiet = 1e9;
function rabbit(id: string, x = 0, group = 'home'): LifeResident {
  const motion = createRabbitMotion(id, {x, y: 0}, 2);
  motion.wait = quiet; motion.turnWait = quiet;
  return {id, group, motion, visible: true};
}
function timing(overrides: Partial<LifeTiming> = {}): LifeTiming {
  return {zoomGap: [quiet, quiet], sleepGap: [quiet, quiet], socialGap: [quiet, quiet], ...overrides};
}
function tick(life: RabbitLife, rabbits: LifeResident[], ms = 100, active = true, reduce = false) {
  life.step(ms, rabbits, active, reduce);
  if (active) rabbits.filter(r => r.visible).forEach(r => stepRabbitMotion(r.motion, ms));
}

describe('visible rabbit life, independent of saves and gameplay random', () => {
  it('allows one zoomer globally, explores the whole fenced zone, and stays bounded', () => {
    const life = new RabbitLife(timing({zoomGap: [100, 100]}));
    const rabbits = [rabbit('a', -30), rabbit('b', 30), rabbit('c', 0, 'other')];
    let zooms = 0, widest = 0;
    for (let frame = 0; frame < 150; frame++) {
      tick(life, rabbits);
      const running = rabbits.filter(r => r.motion.mode === 'zoom');
      expect(running.length).toBeLessThanOrEqual(1); zooms += running.length;
      for (const r of rabbits) {
        const p = r.motion.local, zone = motionZone(r.motion);
        expect(p.x).toBeGreaterThanOrEqual(zone.minX); expect(p.x).toBeLessThanOrEqual(zone.maxX);
        expect(p.y).toBeGreaterThanOrEqual(zone.minY); expect(p.y).toBeLessThanOrEqual(zone.maxY);
        widest = Math.max(widest, Math.abs(p.x - r.motion.home.x));
      }
    }
    expect(zooms).toBeGreaterThan(0); expect(widest).toBeGreaterThan(32);
  });
  it('keeps a nap for sixty visible seconds, including low frame rates, then wakes in place', () => {
    const life = new RabbitLife(timing({sleepGap: [100, 100]})), rabbits = [rabbit('nap')];
    tick(life, rabbits); expect(rabbits[0].motion.mode).toBe('sleep');
    const position = {...rabbits[0].motion.local};
    for (let i = 0; i < NAP_MS / 500 - 1; i++) tick(life, rabbits, 500);
    expect(rabbits[0].motion.mode).toBe('sleep'); expect(rabbitPose(rabbits[0].motion).lift).toBe(0);
    tick(life, rabbits, 500); expect(rabbits[0].motion.mode).not.toBe('sleep');
    expect(rabbits[0].motion.local).toEqual(position);
  });
  it('pauses activity time behind menus, offscreen or after a suspended tab, and feeding wakes it', () => {
    const life = new RabbitLife(timing({sleepGap: [100, 100]})), rabbits = [rabbit('nap')];
    tick(life, rabbits);
    life.step(NAP_MS * 2, rabbits, true, false);
    for (let i = 0; i < 700; i++) tick(life, rabbits, 100, false);
    rabbits[0].visible = false; for (let i = 0; i < 700; i++) tick(life, rabbits);
    expect(rabbits[0].motion.mode).toBe('sleep');
    life.interrupt('nap'); triggerFedReaction(rabbits[0].motion);
    expect(rabbits[0].motion.mode).toBe('fed');
  });
  it('meets without teleporting and kisses only close partners in one enclosure', () => {
    const life = new RabbitLife(timing({socialGap: [100, 100]})), rabbits = [rabbit('a', -35), rabbit('b', 35), rabbit('c', 0, 'other')];
    tick(life, rabbits); expect(rabbits[0].motion.mode).toBe('meet');
    expect(rabbits[0].motion.local.x).toBeLessThan(-30);
    let kissed = false;
    for (let frame = 0; frame < 150; frame++) {
      tick(life, rabbits);
      if (rabbits[0].motion.mode === 'kiss') {
        kissed = true;
        expect(Math.hypot(rabbits[0].motion.local.x - rabbits[1].motion.local.x, rabbits[0].motion.local.y - rabbits[1].motion.local.y)).toBeLessThanOrEqual(28);
        expect(rabbits[1].motion.mode).toBe('kiss'); expect(rabbits[2].motion.mode).not.toBe('kiss');
        expect(rabbits[0].motion.facing).toBe(-rabbits[1].motion.facing);
        break;
      }
    }
    expect(kissed).toBe(true);
    rabbits.splice(1, 1); tick(life, rabbits); expect(rabbits[0].motion.mode).not.toBe('kiss');
  });
  it('waits for the social interval after landing and spreads first naps between neighbours', () => {
    const life = new RabbitLife(timing({socialGap: [1000, 1000]})), rabbits = [rabbit('a', -20), rabbit('b', 20)];
    let kissed = false, ended = false;
    for (let frame = 0; frame < 150; frame++) {
      tick(life, rabbits);
      if (rabbits[0].motion.mode === 'kiss') kissed = true;
      else if (kissed) { ended = true; break; }
    }
    expect(ended).toBe(true);
    for (let i = 0; i < 9; i++) { tick(life, rabbits); expect(rabbits.every(r => !['kiss','meet'].includes(r.motion.mode))).toBe(true); }
    const sleepy = new RabbitLife(timing({sleepGap:[300_000,600_000]})), neighbours = ['rabbit-2','rabbit-3','rabbit-4'].map(id => rabbit(id));
    const starts = new Map<string,number>();
    for (let now = 1000; now <= 240_000 && starts.size < 3; now += 1000) {
      sleepy.step(1000, neighbours, true, true);
      neighbours.forEach(r => { if(r.motion.mode==='sleep'&&!starts.has(r.id))starts.set(r.id,now); });
    }
    expect(starts.size).toBe(3); expect(Math.max(...starts.values())-Math.min(...starts.values())).toBeGreaterThan(30_000);
  });
  it('cancels a meeting when a partner changes enclosure, and reduced motion allows only calm naps', () => {
    const life = new RabbitLife(timing({zoomGap: [100, 100], socialGap: [100, 100], sleepGap: [500, 500]}));
    const rabbits = [rabbit('a', -20), rabbit('b', 20)];
    for (let i = 0; i < 10; i++) tick(life, rabbits, 100, true, true);
    expect(rabbits.map(r => r.motion.mode)).toEqual(['sleep', 'sleep']);
    life.reset(); expect(rabbits.every(r => !['sleep', 'zoom', 'kiss', 'meet'].includes(r.motion.mode))).toBe(true);
    const social = new RabbitLife(timing({socialGap: [100, 100]}));
    rabbits.forEach(r => { r.motion.mode = 'rest'; }); tick(social, rabbits);
    rabbits[1].group = 'other'; tick(social, rabbits);
    expect(rabbits.every(r => r.motion.mode !== 'kiss' && r.motion.mode !== 'meet')).toBe(true);
  });
});
