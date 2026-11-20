import {describe, expect, it} from 'vitest';
import {advanceBennyRun, BENNY_RUN as C, holeAt, runInput, startBennyRun, takeRunEvents, wallLook, type WallSegment} from '../src/simulation/bennyRun';
import {RUN_SIDE_FILES, RUN_SIDES, type RunSidePicture} from '../src/config/bennyRunSides';
import {BENNY_RUN_DECOR} from '../src/ui/BennyRunActivity';

/** « Benny Rampage », the sides of the road (owner, 19 Nov. 2026): tall grass left and right, the old walls gone, fences along the
 *  track and now and then a wall Benny can run on. */
function road(seed: number, ms = 180_000) {
  const g = startBennyRun(0, seed), first = new Map<string, WallSegment>(), last = new Map<string, WallSegment>();
  // Each wall as it is laid (before a pattern makes the walls it needs runnable): its list is replaced now and then, each new one
  // watched as it comes.
  const key = (w: WallSegment) => `${w.side}:${w.from}`;
  for (const w of g.walls) first.set(key(w), {...w});
  const watch = (list: WallSegment[]) => { const push = list.push.bind(list); list.push = (...ws: WallSegment[]) => { for (const w of ws) if (!first.has(key(w))) first.set(key(w), {...w}); return push(...ws); }; return list; };
  let walls = watch(g.walls);
  Object.defineProperty(g, 'walls', {get: () => walls, set: (list: WallSegment[]) => { walls = watch(list); }, configurable: true});
  for (let t = 0; t < ms; t += 250) {
    for (const w of g.walls) last.set(key(w), {...w});
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
  it('draws the tall grass, the fence and the wall to run on from the painted strips the owner chose (20 Nov.)', () => {
    for (const side of [RUN_SIDES.grass, RUN_SIDES.fence, RUN_SIDES.wall]) for (const picture of Object.values(side.picture) as RunSidePicture[]) {
      expect(files).toContain(picture.file); expect(RUN_SIDE_FILES).toContain(picture.file);
      if (picture.crop) { expect(picture.crop[0]).toBeGreaterThanOrEqual(0); expect(picture.crop[1]).toBeLessThanOrEqual(1); expect(picture.crop[0]).toBeLessThan(picture.crop[1]); }
    }
    expect(RUN_SIDES.grass.picture.grotte.file).toBe('cotes-herbe');
    for (const world of ['grotte', 'pont', 'montagne'] as const) { expect(RUN_SIDES.fence.picture[world].file).toBe('cotes-barriere'); expect(RUN_SIDES.wall.picture[world].file).toBe('cotes-mur'); }
    // The old stand-ins are gone from the run and its files.
    for (const old of ['decor-socle-bleu', 'decor-mur-terre', 'decor-barriere', 'decor-crete', 'decor-lianes', 'decor-touffes']) { expect(BENNY_RUN_DECOR).not.toContain(old); expect(files).not.toContain(old); }
  });
  it('keeps its tracked masters for the strips', () => {
    const masters = Object.keys(import.meta.glob('../assets-source/benny-run/*.png')).map(path => path.replace('../assets-source/benny-run/', '').replace('.png', ''));
    for (const file of RUN_SIDE_FILES.filter(f => f.startsWith('cotes-'))) expect(masters).toContain(file);
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
