import {describe, expect, it} from 'vitest';
import {advanceBennyRun, BENNY_RUN as C, comboMultiplier, dragonVisible, inAir, reach, runHeight, runInput, runnableAt, runSummary, startBennyRun, takeRunEvents,
  type BennyRun, type RunEntity, type RunKind} from '../src/simulation/bennyRun';

/** A run with nothing laid out by chance: the test places what it needs, `z` metres ahead of Benny. */
function quiet(seed = 7, lanes = 3): BennyRun {
  const g = startBennyRun(0, seed, lanes); g.entities = []; g.nextSpawnZ = Infinity; g.nextSettingAt = Infinity;
  for (const w of g.walls) w.runnable = true; g.wallsTo = {left: 1e9, right: 1e9}; g.walls.push({side: 'left', from: 0, to: 1e9, runnable: true}, {side: 'right', from: 0, to: 1e9, runnable: true});
  return g;
}
const place = (g: BennyRun, kind: RunKind, lane: number, ahead: number, extra: Partial<RunEntity> = {}) => {
  const e: RunEntity = {id: g.nextId++, kind, lane, z: g.distance + ahead, ...extra}; g.entities.push(e); return e;
};
/** Runs until `ms` of game time have passed. */
const run = (g: BennyRun, ms: number) => advanceBennyRun(g, g.at + ms);
const types = (g: BennyRun) => takeRunEvents(g).map(e => e.type);

/** « Cours cours Benny ! » (owner, 11 November 2026). */
describe('Cours cours Benny ! rules', () => {
  it('strikes a creature with the wand only when changing lanes towards it, and bumps into one met straight on', () => {
    const g = quiet();
    place(g, 'dragonnet', 0, 5);
    runInput(g, g.at, 'left');
    expect(g).toMatchObject({lane: 0, foes: 1, score: C.points.foe, combo: 1});
    expect(g.entities).toHaveLength(0);
    place(g, 'chest', 0, 5); run(g, 1000);
    expect(types(g)).toContain('bump');
    expect(g.lastBumpAt).not.toBeNull(); expect(g.foes).toBe(1);
  });
  it('lets the Dragon catch Benny on a second bump within 10 s, but flies off after that', () => {
    const g = quiet();
    expect(dragonVisible(g)).toBe(true); run(g, C.introMs + 10); expect(dragonVisible(g)).toBe(false);
    place(g, 'pillar', 1, 3); run(g, 1000);
    expect(dragonVisible(g)).toBe(true); expect(g.over).toBe(false);
    run(g, C.dragonMs); expect(dragonVisible(g)).toBe(false);
    place(g, 'pillar', 1, 3); run(g, 1000); expect(g.over).toBe(false);
    place(g, 'ember', 1, 3); run(g, 1000);
    expect(g.over).toBe(true); expect(takeRunEvents(g).at(-1)?.type).toBe('caught');
  });
  it('breaks a pot met straight on for no points and no bump', () => {
    const g = quiet(); place(g, 'pot', 1, 3); run(g, 1000);
    expect(types(g)).toEqual(['crash']); expect(g).toMatchObject({score: 0, pots: 0, lastBumpAt: null});
  });
  it('clears a barrier by jumping, a beam by sliding, and bumps into them otherwise', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'barrier', 1, 3); runInput(g, g.at, 'up'); run(g, 400);
    place(g, 'beam', 1, 4); run(g, 300); runInput(g, g.at, 'down'); run(g, 500);
    expect(types(g)).toEqual(['cleared', 'cleared']);
    place(g, 'beam', 1, 3); runInput(g, g.at, 'up'); run(g, 400);
    expect(types(g)).toEqual(['bump']);
  });
  it('strikes with a slide (swipe down) what is ahead in the lane, and what it slides into', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'chest', 1, 5); runInput(g, g.at, 'down');
    expect(g).toMatchObject({foes: 1, lastBumpAt: null}); expect(g.entities).toHaveLength(0);
    run(g, 800); place(g, 'ember', 1, 9); run(g, 300); runInput(g, g.at, 'down'); run(g, 600);
    expect(g).toMatchObject({foes: 2, lastBumpAt: null});
    place(g, 'pot', 1, 3); runInput(g, g.at, 'down'); expect(g.pots).toBe(1);
  });
  it('is struck by a creature she passes without striking it: in her lane even when jumping, in the next lane, not two lanes away nor from a wall', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'dragonnet', 1, 3); runInput(g, g.at, 'up'); run(g, 500);
    expect(takeRunEvents(g).map(e => e.type)).toContain('bump');
    run(g, C.dragonMs);
    place(g, 'chest', 0, 4); run(g, 800);
    expect(types(g)).toEqual(['bump']);
    run(g, C.dragonMs);
    runInput(g, g.at, 'right'); place(g, 'ember', 0, 4); run(g, 800);
    expect(types(g)).toEqual([]);
    runInput(g, g.at, 'right'); expect(g.wall?.side).toBe('right');
    place(g, 'dragonnet', 2, 4); run(g, 800);
    expect(types(g)).toEqual(['wallStart']); expect(g.foes).toBe(0);
  });
  it('climbs a wall in the middle of a jump, and leaves it by a jump or by swiping away from it', () => {
    const g = quiet(); runInput(g, g.at, 'left'); runInput(g, g.at, 'up'); run(g, 200);
    runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    run(g, 300); runInput(g, g.at, 'up');
    expect(g).toMatchObject({wall: null, lane: 0, wallRuns: 1}); expect(g.airUntil).toBeGreaterThan(g.at);
    run(g, C.jumpMs); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    runInput(g, g.at, 'right'); expect(g).toMatchObject({wall: null, lane: 0, wallRuns: 2});
  });
  it('leaves a wall with a ground charge whose shock wave strikes every lane around her; a charge from a jump does not', () => {
    const g = quiet(); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); run(g, 300);
    const near = [place(g, 'pot', 0, 3), place(g, 'dragonnet', 1, 4), place(g, 'chest', 2, 2)], far = place(g, 'pot', 2, 14);
    runInput(g, g.at, 'down'); run(g, 300);
    const events = takeRunEvents(g);
    expect(events.map(e => e.type)).toContain('shockwave');
    expect(events.filter(e => e.type === 'strike').map(e => e.type === 'strike' && e.by)).toEqual(['shock', 'shock', 'shock']);
    expect(g.entities).toEqual([far]); expect(near.every(e => !g.entities.includes(e))).toBe(true);
    expect(g).toMatchObject({wall: null, lane: 0, pots: 1, foes: 2, lastBumpAt: null});
    const h = quiet(); runInput(h, h.at, 'up'); run(h, 300); place(h, 'pot', 0, 2); place(h, 'pot', 1, 2.5); runInput(h, h.at, 'down'); run(h, 300);
    expect(types(h)).not.toContain('shockwave'); expect(h.pots).toBe(1);
  });
  it('spins and strikes both creatures when one waits on each side of her', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'chest', 0, 4); place(g, 'dragonnet', 2, 4.5); runInput(g, g.at, 'left');
    const strikes = takeRunEvents(g).filter(e => e.type === 'strike').map(e => e.type === 'strike' && e.by);
    expect(strikes).toEqual(['lane', 'spin']); expect(g).toMatchObject({lane: 0, foes: 2}); expect(g.entities).toHaveLength(0);
    // Moving away from a lone creature does not strike it.
    place(g, 'ember', 0, 6); runInput(g, g.at, 'right'); expect(g).toMatchObject({lane: 1, foes: 2});
  });
  it('strikes a little flying monster by swiping towards it: sideways, up or with a slide', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'flyer', 2, 5); runInput(g, g.at, 'right'); expect(g.foes).toBe(1);
    place(g, 'flyer', 2, 5); runInput(g, g.at, 'up'); expect(g.foes).toBe(2);
    run(g, C.jumpMs + 50);
    place(g, 'flyer', 2, 5); runInput(g, g.at, 'down'); expect(g.foes).toBe(3);
    expect(g.lastBumpAt).toBeNull();
  });
  it('lets a flying monster reach Benny on a wall, from the edge lane, and swiping off the wall strikes it', () => {
    const g = quiet(); run(g, C.introMs); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    place(g, 'chest', 0, 3); run(g, 500); expect(g.lastBumpAt).toBeNull(); // A creature on the ground does not reach the wall.
    place(g, 'flyer', 0, 3); run(g, 500); expect(g.lastBumpAt).not.toBeNull();
    run(g, C.dragonMs); runInput(g, g.at, 'right'); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    place(g, 'flyer', 0, 4); runInput(g, g.at, 'right');
    expect(g).toMatchObject({wall: null, lane: 0}); expect(g.entities.some(e => e.kind === 'flyer')).toBe(false);
  });
  it('takes any number of lanes: five lanes, Benny in the middle, walls past the edges', () => {
    const g = quiet(7, 5); expect(g).toMatchObject({lanes: 5, lane: 2});
    for (let i = 0; i < 3; i++) runInput(g, g.at, 'right');
    expect(g).toMatchObject({lane: 4, wall: {side: 'right'}});
    place(g, 'wallCoin', 5, 3); run(g, 400); expect(g.coins).toBe(1);
    const h = startBennyRun(0, 11, 5);
    for (let t = 0; t < 120_000; t += 250) { h.entities = h.entities.filter(e => e.z > h.distance + 20); advanceBennyRun(h, t); for (const e of h.entities) expect(e.lane).toBeGreaterThanOrEqual(-1), expect(e.lane).toBeLessThanOrEqual(5); }
  });
  it('jumps off a wall from the wall’s height, and a ground charge from up there sends a shock wave', () => {
    const g = quiet(); run(g, C.introMs); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); run(g, 200);
    runInput(g, g.at, 'up'); expect(g).toMatchObject({wall: null, lane: 0});
    run(g, 20); expect(runHeight(g)).toBeGreaterThan(C.wallRunHeight * .95);
    for (const lane of [0, 1, 2]) place(g, 'dragonnet', lane, 3);
    runInput(g, g.at, 'down'); run(g, 400);
    expect(types(g)).toContain('shockwave'); expect(g).toMatchObject({foes: 3, lastBumpAt: null});
    // From the ground, the same jump stays low: no shock wave.
    const h = quiet(); runInput(h, h.at, 'up'); run(h, 300); runInput(h, h.at, 'down'); run(h, 300); expect(types(h)).not.toContain('shockwave');
  });
  it('swiping away from the wall strikes a creature waiting in the lane she lands in', () => {
    const g = quiet(); run(g, C.introMs); runInput(g, g.at, 'right'); runInput(g, g.at, 'right'); expect(g.wall?.side).toBe('right');
    place(g, 'chest', 2, 4); runInput(g, g.at, 'left');
    expect(g).toMatchObject({wall: null, lane: 2, foes: 1}); run(g, 800); expect(g.lastBumpAt).toBeNull();
  });
  it('keeps a jump asked for just before landing and does it on landing', () => {
    const g = quiet(); runInput(g, g.at, 'up'); run(g, C.jumpMs - 100);
    runInput(g, g.at, 'up'); run(g, 150);
    expect(inAir(g)).toBe(true); expect(g.airFrom).toBeGreaterThan(C.jumpMs - 100);
    // Asked for too early, it is forgotten.
    const h = quiet(); runInput(h, h.at, 'up'); run(h, 50); runInput(h, h.at, 'up'); run(h, C.jumpMs + 50); expect(inAir(h)).toBe(false);
  });
  it('lets the wand reach farther as the speed rises, for the same time to react', () => {
    const g = quiet(); const slow = reach(g); expect(slow / g.speed).toBeGreaterThan(.6);
    run(g, C.speedRampMs); expect(reach(g)).toBeGreaterThan(slow + 3); expect(reach(g) / g.speed).toBeGreaterThan(.45);
    place(g, 'chest', 0, reach(g) - .5); runInput(g, g.at, 'left'); expect(g.foes).toBe(1);
  });
  it('lays the road out in varied patterns: pot slaloms, rows of creatures, coin arcs over barriers, and always a way through', () => {
    const g = startBennyRun(0, 3), seen = new Map<number, RunEntity>();
    for (let t = 0; t < 200_000; t += 250) { for (const e of g.entities) seen.set(e.id, e); g.entities = g.entities.filter(e => e.z > g.distance + 20); advanceBennyRun(g, t); }
    const all = [...seen.values()], kinds = new Set(all.map(e => e.kind));
    for (const kind of ['coin', 'pot', 'barrier', 'beam', 'pillar', 'dragonnet', 'chest', 'ember', 'flyer', 'power'] as const) expect(kinds).toContain(kind);
    expect(all.some(e => e.kind === 'coin' && (e.up ?? 0) > 1)).toBe(true); // A coin arc.
    // Every row of pillars leaves a lane free, or has a runnable wall beside it (the wall pattern).
    const rows = new Map<number, number[]>(); for (const e of all) if (e.kind === 'pillar') rows.set(e.z, [...(rows.get(e.z) ?? []), e.lane]);
    for (const [z, lanes] of rows) if (lanes.length >= g.lanes) expect(g.walls.length >= 0 && all.some(e => e.kind === 'wallCoin' && Math.abs(e.z - z) < 8)).toBe(true);
    // Never two creatures side by side in the same row but for the spin pair (one on each side of the middle lane).
    const foeRows = new Map<number, number[]>(); for (const e of all) if (['dragonnet', 'chest', 'ember', 'flyer'].includes(e.kind)) foeRows.set(e.z, [...(foeRows.get(e.z) ?? []), e.lane]);
    for (const lanes of foeRows.values()) if (lanes.length > 1) expect(lanes.sort()).toEqual([0, 2]);
  });
  it('charges the ground from the air and breaks the pot ahead', () => {
    const g = quiet(); runInput(g, g.at, 'up'); run(g, 150);
    place(g, 'pot', 1, 2.5); runInput(g, g.at, 'down'); run(g, 200);
    expect(types(g)).toEqual(['pound', 'coin', 'strike']); expect(g).toMatchObject({pots: 1, coins: C.potCoins});
  });
  it('runs on a runnable wall past three pillars, collects the wall coins and scores the wall run', () => {
    const g = quiet(); runInput(g, g.at, 'left'); expect(g.lane).toBe(0);
    runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    for (const lane of [0, 1, 2]) place(g, 'pillar', lane, 6);
    place(g, 'wallCoin', -1, 4);
    run(g, C.wallMs + 50);
    expect(g).toMatchObject({wall: null, lane: 0, wallRuns: 1, coins: 1, lastBumpAt: null, score: C.points.wallRun});
  });
  it('does not climb a wall that is not runnable', () => {
    const g = quiet(); for (const w of g.walls) if (w.side === 'right') w.runnable = false;
    runInput(g, g.at, 'right'); runInput(g, g.at, 'right');
    expect(runnableAt(g, 'right', g.distance)).toBe(false); expect(g).toMatchObject({lane: 2, wall: null});
  });
  it('multiplies the score while strikes follow each other quickly (combos)', () => {
    expect([1, 3, 4, 6, 7, 30].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, C.comboMax]);
    const g = quiet();
    for (let i = 0; i < 4; i++) { const lane = g.lane === 1 ? 0 : 1; place(g, 'pot', lane, 5); runInput(g, g.at, lane < g.lane ? 'left' : 'right'); run(g, 500); }
    expect(g).toMatchObject({pots: 4, combo: 4, score: 10 + 10 + 10 + 20});
    run(g, C.comboMs + 10); place(g, 'pot', g.lane === 1 ? 0 : 1, 5); runInput(g, g.at, g.lane === 1 ? 'left' : 'right');
    expect(g.combo).toBe(1);
  });
  it('uses a power as soon as Benny runs over it, without a touch: the rainbow bubble takes one bump', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'power', 0, 3, {power: 'bubble'}); run(g, 500);
    expect(g.active).toBeNull(); // Not in Benny's lane: it stays on the road.
    place(g, 'power', 1, 3, {power: 'bubble'}); run(g, 500);
    expect(g.active?.power).toBe('bubble');
    place(g, 'pillar', 1, 3); run(g, 1000);
    expect(types(g)).toEqual(['power', 'shield']); expect(g).toMatchObject({lastBumpAt: null, active: null});
  });
  it('picks up a power while jumping, and a new power replaces the one under way', () => {
    const g = quiet(); place(g, 'power', 1, 3, {power: 'magnet'}); runInput(g, g.at, 'up'); run(g, 500);
    expect(g.active?.power).toBe('magnet');
    place(g, 'coin', 0, 3); run(g, 500); expect(g.coins).toBe(1); // The magnet brings the coins of the other lanes.
    place(g, 'power', 1, 3, {power: 'flight'}); run(g, 500);
    expect(g.active?.power).toBe('flight');
    place(g, 'pillar', 1, 3); run(g, 500); expect(g.lastBumpAt).toBeNull(); // Flying over everything.
    run(g, C.powers.flight); expect(g.active).toBeNull();
  });
  it('speeds up to its top speed in about two and a half minutes', () => {
    const g = quiet(); run(g, 1000); expect(g.speed).toBeCloseTo(C.speedStart, 0);
    run(g, C.speedRampMs); expect(g.speed).toBe(C.speedMax);
  });
  it('lays out a fair road: never three pillars in a row without a runnable wall beside them, and replays the same', () => {
    /** Lays out four minutes of road; Benny passes everything unharmed (what is near is cleared away): only the layout is checked. */
    const lay = (seed: number) => {
      const g = startBennyRun(0, seed), pillars = new Map<number, Set<number>>(), walls = new Map<string, boolean>();
      let triples = 0;
      for (let t = 0; t < 240_000; t += 250) {
        for (const e of g.entities) if (e.kind === 'pillar') pillars.set(e.z, (pillars.get(e.z) ?? new Set()).add(e.lane));
        for (const w of g.walls) walls.set(`${w.side}:${w.from}`, w.runnable);
        g.entities = g.entities.filter(e => e.z > g.distance + 20);
        advanceBennyRun(g, t);
      }
      for (const [z, row] of pillars) if (row.size === 3) {
        triples++;
        const runnable = (['left', 'right'] as const).some(side => [z - 25, z, z + 5].every(at => walls.get(`${side}:${Math.floor(at / C.wallSegment) * C.wallSegment}`)));
        expect(runnable).toBe(true);
      }
      return {g, triples};
    };
    const a = lay(5), b = lay(5);
    expect(runSummary(b.g)).toEqual(runSummary(a.g)); expect(a.g.distance).toBeGreaterThan(4000); expect(a.g.over).toBe(false);
    expect([1, 2, 3, 99].reduce((n, seed) => n + lay(seed).triples, a.triples)).toBeGreaterThan(0);
  });
});
