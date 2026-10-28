import {describe, expect, it} from 'vitest';
import {RabbitLife, LIFE_TIMING, NAP_MS, NEST_KISS_MS, type LifeResident, type LifeTiming} from '../src/display/rabbitLife';
import {createRabbitMotion, KISS_MS, motionZone, rabbitPose, stepRabbitMotion, triggerFedReaction} from '../src/display/rabbitMotion';

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
  if (active) rabbits.filter(r => r.visible && (!r.nest || r.motion.mode !== 'rest' &&
    (!reduce || ['walk', 'salto', 'fed'].includes(r.motion.mode)))).forEach(r => stepRabbitMotion(r.motion, ms));
}

describe('visible rabbit life, independent of saves and gameplay random', () => {
  it('releases the global running lock when an enclosure runner leaves the screen', () => {
    const life = new RabbitLife(timing({zoomGap: [100, 100]})), rabbits = [rabbit('a'), rabbit('b', 0, 'other')];
    tick(life, rabbits);
    const runner = rabbits.find(r => r.motion.mode === 'zoom')!;
    const other = rabbits.find(r => r !== runner)!;
    runner.visible = false; tick(life, rabbits);
    expect(runner.motion.mode).not.toBe('zoom'); expect(other.motion.mode).toBe('zoom');
  });
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
  it('spreads early first naps between neighbours, with at most two sleepers', () => {
    const sleepy = new RabbitLife(), neighbours = ['rabbit-2','rabbit-3','rabbit-4'].map(id => rabbit(id));
    const starts = new Map<string,number>();
    for (let now = 1000; now <= 120_000 && starts.size < 3; now += 1000) {
      sleepy.step(1000, neighbours, true, true);
      neighbours.forEach(r => { if(r.motion.mode==='sleep'&&!starts.has(r.id))starts.set(r.id,now); });
      expect(neighbours.filter(r => r.motion.mode === 'sleep').length).toBeLessThanOrEqual(2);
    }
    expect(starts.size).toBe(3); expect(Math.max(...starts.values())-Math.min(...starts.values())).toBeGreaterThan(30_000);
    expect(Math.min(...starts.values())).toBeLessThanOrEqual(45_000);
  });
  it('starts zooms every ninety visible seconds from the first, even with a sleepy small group', () => {
    const life = new RabbitLife({...LIFE_TIMING, socialGap: [quiet, quiet]}), rabbits = [rabbit('solo')];
    const starts: number[] = []; let running = false;
    for (let now = 100; now <= 181_000; now += 100) {
      tick(life, rabbits);
      const zoom = rabbits[0].motion.mode === 'zoom';
      if (zoom && !running) starts.push(now); running = zoom;
    }
    expect(starts).toEqual([90_000, 180_000]);
  });
  it('offers enclosure kisses within a minute and does not let naps block both partners', () => {
    const life = new RabbitLife(), rabbits = [rabbit('a', -20), rabbit('b', 20)];
    const starts: number[] = []; let meeting = false;
    for (let now = 100; now <= 150_000; now += 100) {
      tick(life, rabbits);
      const meet = ['meet', 'kiss'].includes(rabbits[0].motion.mode);
      if (meet && !meeting) starts.push(now); meeting = meet;
    }
    expect(starts.length).toBeGreaterThanOrEqual(2);
    expect(starts[0]).toBeLessThanOrEqual(60_000);
    expect(starts.slice(1).every((start, i) => start - starts[i] <= 60_000)).toBe(true);
  });
  it('counts hidden sleepers toward the cap, releases removed rabbits and lets feeding wake one', () => {
    const life = new RabbitLife(timing({sleepGap: [100, 100]})), rabbits = [rabbit('a'), rabbit('b'), rabbit('c')];
    tick(life, rabbits); expect(rabbits.filter(r => r.motion.mode === 'sleep')).toHaveLength(2);
    rabbits[0].visible = false; tick(life, rabbits);
    expect(rabbits[2].motion.mode).not.toBe('sleep');
    rabbits.push(rabbit('newcomer')); tick(life, rabbits);
    expect(rabbits.filter(r => r.motion.mode === 'sleep')).toHaveLength(2);
    expect(rabbits[3].motion.mode).not.toBe('sleep');
    rabbits.shift(); tick(life, rabbits);
    expect(rabbits.slice(0, 2).every(r => r.motion.mode === 'sleep')).toBe(true);
    expect(rabbits[2].motion.mode).not.toBe('sleep');
    life.interrupt('b'); triggerFedReaction(rabbits[0].motion); tick(life, rabbits);
    expect(rabbits[0].motion.mode).toBe('fed');
  });
  it('makes nest parents meet every fifteen seconds, kiss for three seconds and return before new tricks', () => {
    const life = new RabbitLife(), parents = [rabbit('a', -52, 'nest'), rabbit('b', 68, 'nest')];
    parents.forEach(r => { r.nest = true; r.motion.layout = {zone: {minX: -80, maxX: 90, minY: -15, maxY: 20}, roamScale: 12}; });
    for (let i = 0; i < 100; i++) tick(life, parents, 100, false);
    expect(parents.every(r => r.motion.mode === 'rest')).toBe(true);
    const starts: number[] = []; let meeting = false, kissed = false, returned = false, kissFrames = 0;
    const modes = [new Set<string>(), new Set<string>()];
    for (let now = 100; now <= NEST_KISS_MS * 4; now += 100) {
      tick(life, parents);
      parents.forEach((r, i) => {
        modes[i].add(r.motion.mode);
        const p = r.motion.local, zone = motionZone(r.motion);
        expect(p.x >= zone.minX && p.x <= zone.maxX && p.y >= zone.minY && p.y <= zone.maxY).toBe(true);
      });
      const meet = ['meet', 'kiss'].includes(parents[0].motion.mode);
      if (meet && !meeting) starts.push(now); meeting = meet;
      if (parents[0].motion.mode === 'kiss') {
        kissed = true;
        kissFrames++;
        expect(Math.abs(parents[0].motion.local.x - parents[1].motion.local.x)).toBeLessThanOrEqual(28);
        expect(parents.every(r => r.motion.mode === 'kiss')).toBe(true);
      }
      if (kissed && !returned && !['kiss','meet'].includes(parents[0].motion.mode) && parents.some(r => r.motion.mode === 'walk' && r.motion.to.x === r.motion.home.x))
        expect(parents.every(r => !['salto','zoom'].includes(r.motion.mode))).toBe(true);
      if (kissed && parents.every(r => r.motion.mode === 'rest' && r.motion.local.x === r.motion.home.x)) returned = true;
    }
    expect(starts).toEqual([15_000, 30_000, 45_000, 60_000]); expect(kissed).toBe(true); expect(returned).toBe(true);
    expect(kissFrames).toBe(3 * KISS_MS / 100);
    modes.forEach(m => { expect(m.has('walk')).toBe(true); expect(m.has('salto')).toBe(true); });
    expect(modes.some(m => m.has('zoom'))).toBe(true);
    parents[1].visible = false; tick(life, parents);
    expect(parents.every(r => !['meet','kiss'].includes(r.motion.mode))).toBe(true);
    parents[1].visible = true;
    for (let i = 0; i < 400; i++) tick(life, parents, 100, true, true);
    expect(parents.every(r => !['meet','kiss','sleep','zoom'].includes(r.motion.mode))).toBe(true);
    life.reset();
  });
  it('shares the running lock with enclosures and pauses nest activity clocks and poses', () => {
    const life = new RabbitLife(timing({zoomGap: [100, 100]}));
    const parents = [rabbit('parent-a', -52, 'nest'), rabbit('parent-b', 68, 'nest')];
    parents.forEach(r => { r.nest = true; r.motion.layout = {zone: {minX: -80, maxX: 90, minY: -15, maxY: 20}, roamScale: 12}; });
    const rabbits = [...parents, rabbit('resident')];
    for (let frame = 0; frame < 800; frame++) {
      tick(life, rabbits);
      expect(rabbits.filter(r => r.motion.mode === 'zoom').length).toBeLessThanOrEqual(1);
    }
    const before = parents.map(r => ({mode:r.motion.mode, local:{...r.motion.local}, elapsed:r.motion.elapsed}));
    for (let i = 0; i < 100; i++) tick(life, rabbits, 100, false);
    expect(parents.map(r => ({mode:r.motion.mode, local:{...r.motion.local}, elapsed:r.motion.elapsed}))).toEqual(before);
    parents.splice(1, 1); tick(life, parents);
    expect(parents[0].motion.mode).not.toBe('kiss');
    life.reset();
  });
  it('ends both partners activities when one leaves the screen during a kiss', () => {
    const life = new RabbitLife(timing({socialGap: [100, 100]})), rabbits = [rabbit('a', -20), rabbit('b', 20)];
    for (let frame = 0; frame < 100 && rabbits[0].motion.mode !== 'kiss'; frame++) tick(life, rabbits);
    expect(rabbits.every(r => r.motion.mode === 'kiss')).toBe(true);
    rabbits[1].visible = false;
    tick(life, rabbits);
    expect(rabbits.every(r => !['meet', 'kiss'].includes(r.motion.mode))).toBe(true);
    for (let frame = 0; frame < 30; frame++) tick(life, rabbits);
    expect(rabbits[0].motion.mode).not.toBe('kiss');
  });
  it('waits one second before retrying a zoom or meeting without eligible residents', () => {
    const zoom = new RabbitLife(timing({zoomGap: [100, 100]})), solo = rabbit('runner');
    solo.motion.mode = 'fed'; zoom.step(100, [solo], true, false);
    solo.motion.mode = 'rest'; zoom.step(900, [solo], true, false);
    expect(solo.motion.mode).toBe('rest');
    zoom.step(100, [solo], true, false); expect(solo.motion.mode).toBe('zoom');

    const social = new RabbitLife(timing({socialGap: [100, 100]})), rabbits = [rabbit('a', -20)];
    social.step(100, rabbits, true, false);
    rabbits.push(rabbit('b', 20)); social.step(900, rabbits, true, false);
    expect(rabbits.every(r => r.motion.mode === 'rest')).toBe(true);
    social.step(100, rabbits, true, false);
    expect(rabbits.every(r => r.motion.mode === 'meet')).toBe(true);
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
