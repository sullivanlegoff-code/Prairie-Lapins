import {describe, expect, it} from 'vitest';
import {advanceBennyRun, BENNY_RUN as C, holeAt, runInput, startBennyRun, takeRunEvents, wallLook, type WallSegment} from '../src/simulation/bennyRun';
import {RUN_SIDES} from '../src/config/bennyRunSides';
import {BENNY_RUN_DECOR} from '../src/ui/BennyRunActivity';

/** « Benny Rampage », the sides of the road (owner, 19 Nov. 2026): tall grass left and right, the old walls gone, fences along the
 *  track and now and then a wall Benny can run on. */
function road(seed: number, ms = 180_000) {
  const g = startBennyRun(0, seed), first = new Map<string, WallSegment>(), last = new Map<string, WallSegment>();
  for (let t = 0; t < ms; t += 250) {
    for (const w of g.walls) { const key = `${w.side}:${w.from}`; if (!first.has(key)) first.set(key, {...w}); last.set(key, {...w}); }
    g.entities = g.entities.filter(e => e.z > g.distance + 20);
    advanceBennyRun(g, t); takeRunEvents(g); g.lastBumpAt = null; g.fallFrom = null; g.over = false; g.pits = g.pits.filter(p => !p.open);
    const gap = holeAt(g); if (gap) g.distance = gap.to;
  }
  return {g, first: [...first.values()], last: [...last.values()]};
}

describe('Benny Rampage: the sides of the road', () => {
  it('lines the road with fences on both sides, and lays a wall to run on now and then, never twice running nor on both sides', () => {
    let segments = 0, runnable = 0;
    for (const seed of [3, 17, 2024]) {
      const {first, last} = road(seed);
      // As laid (before a pattern makes the walls it needs runnable).
      const laid = first.filter(w => !w.void);
      segments += laid.length; runnable += laid.filter(w => w.runnable).length;
      for (const w of laid.filter(w => w.runnable)) {
        expect(laid.some(o => o.runnable && o.side === w.side && o.to === w.from), `${seed} ${w.side} ${w.from}`).toBe(false);
        expect(laid.some(o => o.runnable && o.side !== w.side && o.from === w.from), `${seed} ${w.from}`).toBe(false);
      }
      // Fences on both sides, most of the way.
      for (const side of ['left', 'right'] as const) {
        const mine = last.filter(w => w.side === side && !w.void);
        expect(mine.filter(w => wallLook(w) === 'fence').length / mine.length, `${seed} ${side}`).toBeGreaterThan(.5);
      }
    }
    expect(runnable / segments).toBeGreaterThan(.1); expect(runnable / segments).toBeLessThan(C.wallRunnable + .05);
  });
  it('has no tall or low walls any more: a side is a fence, a wall to run on, or the open void', () => {
    const {last} = road(5, 120_000);
    for (const w of last) {
      expect('tall' in w, `${w.side} ${w.from}`).toBe(false);
      expect(['wall', 'fence']).toContain(wallLook(w));
      if (w.void) expect(w.runnable).toBe(false);
    }
  });
  it('still runs on a wall to run on, and bounces off a fence', () => {
    const g = startBennyRun(0, 9); g.entities = []; g.nextSpawnZ = Infinity; g.nextSettingAt = Infinity; g.nextChallengeAt = Infinity; g.nextEdgeZ = Infinity;
    g.wallsTo = {left: 1e9, right: 1e9}; g.walls = [{side: 'left', from: 0, to: 1e9, runnable: false}, {side: 'right', from: 0, to: 1e9, runnable: true}];
    advanceBennyRun(g, C.introMs);
    g.lane = 0; runInput(g, g.at, 'left'); expect(g.wall).toBeNull(); expect(takeRunEvents(g).some(e => e.type === 'blocked')).toBe(true);
    g.lane = 2; runInput(g, g.at, 'right'); expect(g.wall?.side).toBe('right');
    advanceBennyRun(g, C.introMs + C.wallMs + 200); expect(g.wall).toBeNull(); expect(g.wallRuns).toBe(1);
  });
});

describe('Benny Rampage: the pictures of the sides', () => {
  const files = Object.keys(import.meta.glob('../public/assets/benny-run/*.webp')).map(path => path.replace('../public/assets/benny-run/', '').replace('.webp', ''));
  it('draws the tall grass, the fence and the wall to run on from painted decor tiles of the run', () => {
    const strips = [RUN_SIDES.grass, RUN_SIDES.fence, ...(RUN_SIDES.wall ? [RUN_SIDES.wall] : [])];
    for (const strip of strips) for (const name of Object.values(strip.name)) { expect(BENNY_RUN_DECOR).toContain(name); expect(files).toContain(name); }
    for (const strip of strips) { expect(strip.fit[0]).toBeGreaterThanOrEqual(0); expect(strip.fit[1]).toBeLessThanOrEqual(1); expect(strip.fit[0]).toBeLessThan(strip.fit[1]); }
  });
  it('stands the grass past the fence, farthest row first, on its ground', () => {
    const outs = RUN_SIDES.grass.rows.map(r => r.out);
    expect(outs).toEqual([...outs].sort((a, b) => b - a));
    expect(Math.min(...outs)).toBeGreaterThan(RUN_SIDES.fence.out);
    expect(Math.max(...outs)).toBeLessThan(RUN_SIDES.grass.ground);
  });
  it('no longer ships the big painted walls of the old scenery', () => {
    expect(files.filter(f => f.startsWith('grand-mur'))).toEqual([]);
  });
});
