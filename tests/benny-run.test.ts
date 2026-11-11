import {describe, expect, it} from 'vitest';
import {advanceBennyRun, BENNY_RUN as C, comboMultiplier, dragonVisible, runInput, runnableAt, runSummary, startBennyRun, takeRunEvents,
  type BennyRun, type RunEntity, type RunKind} from '../src/simulation/bennyRun';

/** A run with nothing laid out by chance: the test places what it needs, `z` metres ahead of Benny. */
function quiet(seed = 7): BennyRun {
  const g = startBennyRun(0, seed); g.entities = []; g.nextSpawnZ = Infinity; g.nextSettingAt = Infinity;
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
