import {describe, expect, it} from 'vitest';
import {advanceBennyRun, BENNY_RUN as C, challengeGoal, comboMultiplier, dragonVisible, holeAt, lanesAt, inAir, reach, runHeight, runInput, tutorialStep, runnableAt, runSummary, settingAt, startBennyRun, takeRunEvents,
  type BennyRun, type RunEntity, type RunKind} from '../src/simulation/bennyRun';

/** A run with nothing laid out by chance: the test places what it needs, `z` metres ahead of Benny. */
function quiet(seed = 7, lanes = 3): BennyRun {
  const g = startBennyRun(0, seed, lanes); g.entities = []; g.nextSpawnZ = Infinity; g.nextSettingAt = Infinity; g.nextChallengeAt = Infinity;
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
  it('clears a barrier by jumping, a beam by sliding (a few points each, the combo untouched), and bumps into them otherwise', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'barrier', 1, 3); runInput(g, g.at, 'up'); run(g, 400);
    place(g, 'beam', 1, 4); run(g, 300); runInput(g, g.at, 'down'); run(g, 500);
    expect(types(g)).toEqual(['cleared', 'cleared']); expect(g).toMatchObject({score: 2 * C.points.dodge, combo: 0});
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
  it('spares Benny from a creature she only comes beside at the last moment: she had no time to strike it', () => {
    const g = quiet();
    runInput(g, g.at, 'left'); place(g, 'chest', 2, 6);
    // Two lanes away until it is almost level, then Benny steps next to it.
    run(g, Math.round((6 - 1.2) / g.speed * 1000));
    runInput(g, g.at, 'right'); run(g, 600);
    expect(g.lastBumpAt).toBeNull();
    // Beside it from afar, without striking: it strikes back.
    place(g, 'chest', 2, 8); run(g, 1200);
    expect(g.lastBumpAt).not.toBeNull();
  });
  it('ends a ground charge in a short roll, so a swipe down in the air still gets Benny under a beam', () => {
    const g = quiet();
    runInput(g, g.at, 'up'); run(g, 300);
    place(g, 'beam', 1, g.speed * .55); runInput(g, g.at, 'down'); run(g, 800);
    expect(types(g)).toEqual(['pound', 'cleared']); expect(g.lastBumpAt).toBeNull();
  });
  it('forgives a hair: in the air at all clears a barrier, and a beam just after a roll ends still passes over', () => {
    const g = quiet();
    runInput(g, g.at, 'up'); run(g, C.jumpMs - 30);
    // Landing on a barrier with a jump asked for: off again at once, over it.
    place(g, 'barrier', 1, .9); runInput(g, g.at, 'up'); run(g, 300);
    expect(types(g)).toEqual(['cleared']);
    run(g, 1000); runInput(g, g.at, 'down');
    place(g, 'beam', 1, g.speed * (C.slideMs + 100) / 1000); run(g, C.slideMs + 300);
    expect(types(g)).toEqual(['cleared']); expect(g.lastBumpAt).toBeNull();
  });
  it('jumps a short gap; running into one is a bump and she hops out', () => {
    const g = quiet(); for (const w of g.walls) w.runnable = false;
    g.holes.push({from: g.distance + 3, to: g.distance + 7}); runInput(g, g.at, 'up'); run(g, 900);
    expect(g.lastBumpAt).toBeNull(); expect(holeAt(g)).toBeUndefined();
    g.holes.push({from: g.distance + 3, to: g.distance + 7}); run(g, 1200);
    expect(types(g)).toContain('fall'); expect(g.lastBumpAt).not.toBeNull(); expect(g.over).toBe(false); expect(g.distance).toBeGreaterThan(g.holes[0].to);
  });
  it('crosses a long gap on the walls: the wall run does not run out over it, and swiping across leaps to the other wall', () => {
    const g = quiet(); runInput(g, g.at, 'left'); runInput(g, g.at, 'left');
    expect(g.wall?.side).toBe('left');
    g.holes.push({from: g.distance + 2, to: g.distance + 2 + g.speed * (C.wallMs + 1500) / 1000});
    run(g, C.wallMs + 200); expect(g.wall?.side).toBe('left'); // Past its usual time, still on the wall over the gap.
    takeRunEvents(g); runInput(g, g.at, 'right');
    expect(g.wall?.side).toBe('right'); expect(types(g)).toEqual(['wallLeap']); expect(g.score).toBe(C.points.wallLeap);
    runInput(g, g.at, 'up'); expect(g.wall?.side).toBe('left'); // Up over a gap leaps too.
    expect(g.score).toBe(2 * C.points.wallLeap + C.points.leapChain); // The 2nd leap in a row is worth more.
    expect(g.leaps).toBe(2); expect(challengeGoal('leaps', 0)).toBe(2); expect(C.challengeOrder).toContain('leaps');
    runInput(g, g.at, 'down'); expect(g.wall?.side).toBe('left'); // No charge into the void.
    run(g, 2000); expect(holeAt(g)).toBeUndefined(); expect(g.lastBumpAt).toBeNull();
  });
  it('catches the nearer wall when Benny runs into a long gap', () => {
    const g = quiet(); runInput(g, g.at, 'right');
    g.holes.push({from: g.distance + 3, to: g.distance + 30}); run(g, 600);
    expect(types(g)).toContain('fall'); expect(g.wall?.side).toBe('right'); expect(g.over).toBe(false);
  });
  it('breaks a struck pot where it stands: nothing flies on, what stood behind it is still there', () => {
    const g = quiet();
    const pot = place(g, 'pot', 0, 4), chest = place(g, 'chest', 0, 14), next = place(g, 'pot', 0, 20);
    runInput(g, g.at, 'left'); run(g, 50);
    const strikes = takeRunEvents(g).filter(e => e.type === 'strike');
    expect(strikes.map(e => e.type === 'strike' && e.by)).toEqual(['lane']); expect(g).toMatchObject({pots: 1, foes: 0, combo: 1});
    expect(g.entities).not.toContain(pot); expect(g.entities).toContain(chest); expect(g.entities).toContain(next);
    expect(g.entities.every(e => ['pot', 'chest'].includes(e.kind))).toBe(true);
  });
  it('rolls on through a row: each thing broken while rolling keeps the roll going', () => {
    const g = quiet(); place(g, 'pot', 1, 2); place(g, 'chest', 1, 8); place(g, 'pot', 1, 14); place(g, 'dragonnet', 1, 20);
    runInput(g, g.at, 'down'); run(g, 2000);
    expect(g).toMatchObject({pots: 2, foes: 2, lastBumpAt: null}); expect(g.bestCombo).toBe(4);
    expect(takeRunEvents(g).flatMap(e => e.type === 'strike' ? [e.roll] : [])).toEqual([1, 2, 3, 4]);
  });
  it('changes the setting ahead of Benny: it comes into sight, then she runs into it', () => {
    const g = startBennyRun(0, 11); g.entities = []; g.nextSpawnZ = Infinity; g.lastBumpAt = null;
    run(g, g.nextSettingAt - g.at + 10);
    const next = g.upcoming!; expect(next.setting).not.toBe(g.setting); expect(next.z - g.distance).toBeCloseTo(C.settingAhead, 0);
    expect(settingAt(g, g.distance + 10)).toBe(g.setting); expect(settingAt(g, next.z + 1)).toBe(next.setting);
    takeRunEvents(g); g.entities = []; run(g, (next.z - g.distance) / g.speed * 1000 + 50);
    expect(g.setting).toBe(next.setting); expect(g.upcoming).toBeNull(); expect(takeRunEvents(g).some(e => e.type === 'setting')).toBe(true);
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
    const g = startBennyRun(0, 3), seen = new Map<number, RunEntity>(), width = new Map<number, number>(); let wide = false;
    for (let t = 0; t < 200_000; t += 250) { for (const e of g.entities) { seen.set(e.id, e); width.set(e.z, lanesAt(g, e.z)); } g.entities = g.entities.filter(e => e.z > g.distance + 20); g.pits = g.pits.filter(p => p.from > g.distance + 20); g.holes = g.holes.filter(h => h.from > g.distance + 20); advanceBennyRun(g, t); }
    // More runs for the rarer things (the powers, the flying monsters).
    for (const seed of [4, 5]) { const g2 = startBennyRun(0, seed); for (let t = 0; t < 200_000; t += 250) { for (const e of g2.entities) seen.set(-e.id - seed * 1e6, {...e, z: -1e7 - e.id - seed * 1e6}); g2.entities = g2.entities.filter(e => e.z > g2.distance + 20); g2.pits = g2.pits.filter(p => p.from > g2.distance + 20); g2.holes = g2.holes.filter(h => h.from > g2.distance + 20); advanceBennyRun(g2, t); if (g2.zones.length) wide = true; } }
    const all = [...seen.values()], kinds = new Set(all.map(e => e.kind));
    for (const kind of ['coin', 'pot', 'barrier', 'beam', 'pillar', 'dragonnet', 'chest', 'ember', 'flyer', 'power'] as const) expect(kinds).toContain(kind);
    expect(all.some(e => e.kind === 'coin' && (e.up ?? 0) > 1)).toBe(true); // A coin arc.
    // Every row of pillars leaves a lane free, or has a runnable wall beside it (the wall pattern).
    const rows = new Map<number, number[]>(); for (const e of all) if (e.kind === 'pillar') rows.set(e.z, [...(rows.get(e.z) ?? []), e.lane]);
    for (const [z, lanes] of rows) if (lanes.length >= (width.get(z) ?? g.lanes)) expect(g.walls.length >= 0 && all.some(e => e.kind === 'wallCoin' && Math.abs(e.z - z) < 8)).toBe(true);
    // Never two creatures side by side in the same row but for the spin pair (one on each side of the middle lane).
    const foeRows = new Map<number, number[]>(); for (const e of all) if (['dragonnet', 'chest', 'ember', 'flyer'].includes(e.kind)) foeRows.set(e.z, [...(foeRows.get(e.z) ?? []), e.lane]);
    for (const [z, lanes] of foeRows) if (lanes.length > 1) { const middle = Math.floor((width.get(z) ?? 3) / 2); expect(lanes.sort()).toEqual([middle - 1, middle + 1]); }
    // The road widens to five lanes now and then.
    expect(wide || [...width.values()].includes(5)).toBe(true);
  });
  it('teaches one gesture at a time on the first run, lays a missed step out again, and never lets the Dragon catch Benny meanwhile', () => {
    const g = startBennyRun(0, 7, 3, true); for (const w of g.walls) w.runnable = true;
    /** Runs until the step's thing is `at` m ahead (the nearest of them). */
    const until = (at: number) => { for (let i = 0; i < 2000 && g.entities.every(e => e.z - g.distance > at); i++) run(g, 10); };
    expect(tutorialStep(g)).toBe('pot'); expect(g.entities).toHaveLength(1);
    until(-2); run(g, 200); // Missed: it comes back.
    expect(takeRunEvents(g).some(e => e.type === 'tutorial' && e.again)).toBe(true); expect(tutorialStep(g)).toBe('pot');
    until(5); runInput(g, g.at, g.entities[0].lane < g.lane ? 'left' : 'right'); run(g, 20); expect(tutorialStep(g)).toBe('jump');
    until(3); runInput(g, g.at, 'up'); run(g, 500); expect(tutorialStep(g)).toBe('roll');
    until(4); runInput(g, g.at, 'down'); run(g, 500); expect(tutorialStep(g)).toBe('front');
    until(-1); run(g, 300); expect(g.over).toBe(false); expect(g.lastBumpAt).toBeNull(); expect(tutorialStep(g)).toBe('front'); // A bump: no Dragon.
    until(5); runInput(g, g.at, 'down'); run(g, 20); expect(tutorialStep(g)).toBe('flyer');
    until(5); const flyer = g.entities.find(e => e.kind === 'flyer')!; runInput(g, g.at, flyer.lane < g.lane ? 'left' : 'right'); run(g, 20);
    expect(tutorialStep(g)).toBe('wall');
    const side = g.lane < 1.5 ? 'left' : 'right'; while (g.lane !== (side === 'left' ? 0 : 2)) runInput(g, g.at, side === 'left' ? 'left' : 'right');
    runInput(g, g.at, side); expect(g.wall).not.toBeNull(); run(g, 2500); // Climbing at once, the wall run lasts past the pillars.
    expect(g.tutorial).toBeNull(); expect(g.lastBumpAt).toBeNull(); expect(g.speed).toBeCloseTo(C.speedStart, 0);
    run(g, 3000); expect(g.entities.length).toBeGreaterThan(0); // The road fills up again.
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
    run(g, C.speedRampMs - 1000); expect(g.speed).toBeCloseTo(C.speedMax, 5);
  });
  it('lays out a fair road: never three pillars in a row without both walls runnable beside them, and replays the same', () => {
    /** Lays out four minutes of road; Benny passes everything unharmed (what is near is cleared away): only the layout is checked. */
    const lay = (seed: number) => {
      const g = startBennyRun(0, seed), pillars = new Map<number, Set<number>>(), walls = new Map<string, boolean>(), width = new Map<number, number>();
      let triples = 0; const holes: {from: number; to: number}[] = [];
      for (let t = 0; t < 240_000; t += 250) {
        for (const e of g.entities) if (e.kind === 'pillar') { pillars.set(e.z, (pillars.get(e.z) ?? new Set()).add(e.lane)); width.set(e.z, lanesAt(g, e.z)); }
        for (const w of g.walls) walls.set(`${w.side}:${w.from}`, w.runnable);
        for (const h of g.holes) if (!holes.some(o => o.from === h.from)) holes.push({...h});
        g.entities = g.entities.filter(e => e.z > g.distance + 20);
        advanceBennyRun(g, t); g.lastBumpAt = null; // Falls into gaps are not the point here.
      }
      for (const [z, row] of pillars) if (row.size === width.get(z)) {
        triples++;
        // Both walls, so the nearer one is a way on from any lane.
        const runnable = (['left', 'right'] as const).every(side => [z - 25, z, z + 5].every(at => walls.get(`${side}:${Math.floor(at / C.wallSegment) * C.wallSegment}`)));
        expect(runnable).toBe(true);
      }
      // Every long gap has both walls runnable over it.
      for (const h of holes) if (h.to - h.from > 10) for (const side of ['left', 'right'] as const) for (let at = h.from - 20; at <= h.to + 5; at += 4) expect(walls.get(`${side}:${Math.floor(at / C.wallSegment) * C.wallSegment}`)).toBe(true);
      holeCount += holes.length;
      return {g, triples};
    };
    let holeCount = 0;
    const a = lay(5), b = lay(5);
    expect(runSummary(b.g)).toEqual(runSummary(a.g)); expect(a.g.distance).toBeGreaterThan(4000); expect(a.g.over).toBe(false);
    expect([1, 2, 3, 99].reduce((n, seed) => n + lay(seed).triples, a.triples)).toBeGreaterThan(0);
    expect(holeCount).toBeGreaterThan(0);
  });
  it('gives short challenges one after the other, each one done worth more points, and none during the tutorial', () => {
    const g = quiet(); g.nextChallengeAt = g.at + C.challengeFirstMs;
    run(g, C.challengeFirstMs - 100); expect(g.challenge).toBeNull();
    run(g, 200); expect(g.challenge).toMatchObject({kind: 'pots', goal: challengeGoal('pots', 0), count: 0});
    expect(takeRunEvents(g)).toContainEqual({type: 'challenge', kind: 'pots', goal: 6});
    // Pots struck before the challenge do not count; those after do.
    for (let i = 0; i < 6; i++) { const side = g.lane === 0 ? 1 : g.lane - 1; place(g, 'pot', side, 3); runInput(g, g.at, side < g.lane ? 'left' : 'right'); run(g, 400); }
    const before = g.score - C.challengePoints; run(g, 20);
    expect(g.challengesDone).toBe(1); expect(g.challenge).toBeNull(); expect(before).toBeGreaterThan(0);
    expect(takeRunEvents(g)).toContainEqual(expect.objectContaining({type: 'challenge', kind: 'pots', points: C.challengePoints}));
    run(g, C.challengeGapMs + 50); expect(g.challenge).toMatchObject({kind: 'coins', goal: challengeGoal('coins', 1)});
    expect(challengeGoal('combo', 99)).toBe(40);
    expect(runSummary(g).challenges).toBe(1);
    const t = startBennyRun(0, 7, 3, true); run(t, 8000); expect(t.challenge).toBeNull();
  });
  it('brings rows of pillars (a wall to run on) while the « run on walls » challenge is on', () => {
    const rows = (challenge: boolean) => {
      const g = startBennyRun(0, 11); g.nextChallengeAt = Infinity; g.active = {power: 'flight', until: Infinity};
      if (challenge) g.challenge = {kind: 'walls', goal: 99, from: 0, count: 0};
      const seen = new Set<number>(); let n = 0;
      for (let t = 0; t < 30_000; t += 500) { run(g, 500); for (const e of g.entities) if (e.kind === 'pillar' && !seen.has(Math.round(e.z))) { seen.add(Math.round(e.z)); n++; } }
      return n;
    };
    const on = rows(true), off = rows(false); expect(on).toBeGreaterThanOrEqual(off + 4);
  });
  it('widens the road to five lanes in a wide hall (the middle stays the middle), then narrows it back', () => {
    const g = quiet(); g.zones.push({from: g.distance + 10, to: g.distance + 40});
    expect(lanesAt(g, g.distance + 20)).toBe(5); expect(g.lanes).toBe(3);
    run(g, 1000); expect(g).toMatchObject({lanes: 5, lane: 2}); expect(takeRunEvents(g)).toContainEqual({type: 'lanes', lanes: 5, shift: 1});
    runInput(g, g.at, 'right'); runInput(g, g.at + 200, 'right'); expect(g.lane).toBe(4);
    run(g, 2500); expect(g).toMatchObject({lanes: 3, lane: 2});
  });
  it('climbs a platform by its ramp, runs over what is below, steps off it aside or at its end, and cannot step onto it from beside', () => {
    const g = quiet(); run(g, C.introMs); const z = g.distance;
    g.platforms.push({lane: 1, from: z + 12, to: z + 50});
    run(g, 1600); expect(g.raised).not.toBeNull(); expect(runHeight(g)).toBeCloseTo(C.platformHeight, 1);
    expect(types(g)).toContain('platformUp');
    place(g, 'pillar', 2, 6); place(g, 'coin', 1, 4); run(g, 600);
    expect(g.lastBumpAt).toBeNull(); expect(g.coins).toBe(1);
    // Aside: a jump down from up there, into the next lane; from there, no way back up but by a ramp.
    runInput(g, g.at, 'right'); expect(g.raised).toBeNull(); expect(g.lane).toBe(2); expect(inAir(g)).toBe(true);
    run(g, 800); expect(runHeight(g)).toBe(0);
    runInput(g, g.at, 'left'); expect(g.lane).toBe(2);
    expect(types(g)).toContain('blocked');
    run(g, 3000); expect(g.platforms.every(p => p.to > g.distance - 10)).toBe(true); expect(g.raised).toBeNull();
  });
  it('lets an awake dragonnet waddle across the road from far off, turning back at the edge, and stop when Benny is near', () => {
    const g = quiet(); const e = place(g, 'dragonnet', 1, 60, {cross: 1, crossAt: g.at});
    run(g, C.crossMs * .5); expect(e.lane).toBe(2);
    run(g, C.crossMs); expect(e.lane).toBe(1);
    run(g, (e.z - g.distance - C.crossStill + 2) / g.speed * 1000); const still = e.lane;
    run(g, C.crossMs * 1.5); expect(e.lane).toBe(still);
  });
  it('opens a pit where cracked slabs give way as Benny comes: over it unharmed, into it a bump and a scramble out', () => {
    const g = quiet(); run(g, C.introMs); const z = g.distance;
    g.pits.push({lane: 1, from: z + 30, to: z + 34, open: false});
    run(g, 200); expect(g.pits[0].open).toBe(false);
    run(g, (30 - C.crumbleAt) / g.speed * 1000 + 100); expect(g.pits[0].open).toBe(true); expect(types(g)).toContain('crumble');
    // Over it with a jump: unharmed.
    while (g.pits[0].from - g.distance > 1.2) run(g, 10); runInput(g, g.at, 'up'); run(g, 800); expect(g.lastBumpAt).toBeNull();
    // Into the next one: a bump, then out of it.
    g.pits.push({lane: 1, from: g.distance + 3, to: g.distance + 7, open: true}); run(g, 400);
    expect(g.lastBumpAt).not.toBeNull(); expect(g.over).toBe(false);
  });
  it('drops rocks from the cave ceiling when Benny comes near: a boulder to jump over', () => {
    const g = quiet(); run(g, C.introMs); const z = g.distance;
    g.entities.push({id: 70001, kind: 'barrier', lane: 1, z: z + 40, rock: 'up'});
    run(g, 200); expect(g.entities[0].rock).toBe('up');
    run(g, (40 - C.rockLand) / g.speed * 1000 + 100); expect(g.entities[0].rock).toBe('down'); expect(types(g)).toContain('rockfall');
    while (g.entities[0].z - g.distance > 1.2) run(g, 10); runInput(g, g.at, 'up'); run(g, 800); expect(g.lastBumpAt).toBeNull();
  });
  it('bursts a lava geyser out of a vent on the bridge as Benny comes: a column she cannot jump', () => {
    const g = quiet(); run(g, C.introMs); const z = g.distance;
    g.entities.push({id: 70002, kind: 'pillar', lane: 1, z: z + 45, geyser: 'idle'});
    run(g, 200); expect(g.entities[0].geyser).toBe('idle');
    run(g, (45 - C.geyserAt) / g.speed * 1000 + 100); expect(g.entities[0].geyser).toBe('up'); expect(types(g)).toContain('geyser');
    while (g.entities[0].z - g.distance > 1.2) run(g, 10); runInput(g, g.at, 'up'); run(g, 800); expect(g.lastBumpAt).not.toBeNull();
  });
  it('lays geysers only on the lava bridge, never in all lanes at once', () => {
    let total = 0;
    for (const seed of [3, 4, 5]) {
      const g = startBennyRun(0, seed, 3); g.setting = 'pont'; let seen = 0;
      for (let t = 0; t < 200_000 && !g.over; t += 1000) { g.entities = g.entities.filter(e => e.z > g.distance + 40); g.pits = []; g.holes = g.holes.filter(h => h.from > g.distance + 40); run(g, 1000);
        const vents = g.entities.filter(e => e.geyser); seen += vents.length;
        for (const e of vents) expect(settingAt(g, e.z)).toBe('pont');
        const byZ = new Map<number, number>(); for (const e of vents) byZ.set(e.z, (byZ.get(e.z) ?? 0) + 1);
        for (const [vz, n] of byZ) expect(n).toBeLessThan(lanesAt(g, vz));
      }
      total += seen; expect(g.over).toBe(false);
    }
    expect(total).toBeGreaterThan(0);
  });
  it('announces a gust of wind on the mountain, then blows Benny one lane downwind (not off the road, not off a wall)', () => {
    const g = quiet(); run(g, C.introMs); const z = g.distance;
    g.gusts.push({z: z + 40, dir: 1, warned: false}, {z: z + 80, dir: 1, warned: false});
    run(g, 200); expect(types(g)).not.toContain('gust');
    run(g, (40 - C.gustWarn) / g.speed * 1000 + 100); expect(takeRunEvents(g).find(e => e.type === 'gust')).toMatchObject({warn: true, dir: 1});
    expect(g.lane).toBe(1);
    while (g.gusts.length > 1) run(g, 10);
    expect(g.lane).toBe(2);
    // At the edge already: it cannot blow her off the road.
    while (g.gusts.length) run(g, 10);
    expect(g.lane).toBe(2); expect(g.over).toBe(false);
  });
  it('keeps getting faster past the ramp, a new pace announced every while, up to a ceiling', () => {
    const g = quiet(); run(g, C.speedRampMs - 1000); const top = C.speedMax; expect(g.speed).toBeLessThan(top + .01);
    takeRunEvents(g); run(g, 2000); expect(takeRunEvents(g).filter(e => e.type === 'faster')).toEqual([{type: 'faster', pace: 1}]);
    run(g, C.overtimeMs); expect(g.speed).toBeGreaterThan(top + C.overtimeSpeed * .9); expect(g.pace).toBe(2);
    run(g, C.overtimeMs * 6); expect(g.pace).toBe(C.overtimeMax); expect(g.speed).toBeCloseTo(top + C.overtimeSpeed * C.overtimeMax, 1);
  });
  it('slides all the way through a long tunnel of logs with a single roll', () => {
    const g = quiet(); run(g, C.introMs); const z = g.distance + 20;
    for (let k = 0; k <= 30; k += C.burrowStep) g.entities.push({id: 71000 + k * 2, kind: 'beam', lane: 1, z: z + k});
    while (z - g.distance > 1.5) run(g, 10);
    runInput(g, g.at, 'down'); while (g.distance < z + 31) run(g, 10);
    expect(g.lastBumpAt).toBeNull();
    // Without the tunnel, a roll ends after its usual time.
    runInput(g, g.at, 'down'); run(g, C.slideMs + 50); expect(g.at < g.slideUntil).toBe(false);
  });
  it('shares the points out between the settings they were won in', () => {
    const g = quiet(); run(g, C.introMs); g.score += 40; run(g, 50);
    g.setting = 'pont'; g.score += 25; run(g, 50); g.score += 5;
    expect(runSummary(g).bySetting).toEqual({grotte: 40, pont: 30, montagne: 0});
  });
  it('runs a « no bump » challenge that starts again at a bump, and counts the barriers jumped', () => {
    const g = quiet(); run(g, C.introMs);
    g.challenge = {kind: 'clean', goal: 60, from: Math.floor(g.distance), count: 0};
    run(g, 1500); const counted = g.challenge.count; expect(counted).toBeGreaterThan(10);
    g.entities.push({id: 72001, kind: 'pillar', lane: g.lane, z: g.distance + 1}); run(g, 200);
    expect(g.lastBumpAt).not.toBeNull(); expect(g.challenge!.count).toBeLessThan(counted);
    g.lastBumpAt = null; g.stumbleUntil = 0; takeRunEvents(g);
    while (g.challenge) run(g, 50);
    expect(takeRunEvents(g).some(e => e.type === 'challenge' && e.kind === 'clean' && e.points)).toBe(true);
    // Barriers jumped count for the « jump or roll under » challenge.
    const before = g.dodges; g.entities.push({id: 72002, kind: 'barrier', lane: g.lane, z: g.distance + 3});
    while (g.entities.some(e => e.id === 72002) && g.entities[0].z - g.distance > 1.2) run(g, 10); runInput(g, g.at, 'up'); run(g, 700);
    expect(g.dodges).toBe(before + 1); expect(challengeGoal('dodges', 0)).toBe(4);
  });
  it('gives a few points for stepping out of the way at the last moment', () => {
    const g = quiet(); g.lane = 1; for (const w of g.walls) w.runnable = false;
    g.entities.push({id: 73001, kind: 'pillar', lane: 1, z: g.distance + 3});
    while (g.entities[0].z - g.distance > g.speed * .15) run(g, 10);
    const score = g.score; takeRunEvents(g); runInput(g, g.at, 'left'); run(g, 400);
    expect(types(g)).toContain('close'); expect(g.score).toBe(score + C.points.close); expect(g.lastBumpAt).toBeNull();
    // Long before it: nothing.
    g.entities.push({id: 73002, kind: 'pillar', lane: 0, z: g.distance + 12}); runInput(g, g.at, 'right'); run(g, 1200);
    expect(types(g)).not.toContain('close');
  });
  it('rewards each kilometre, a little more each time', () => {
    const g = quiet(); g.distance = 999; g.walls.forEach(w => { w.from = 0; }); takeRunEvents(g); const score = g.score;
    run(g, 500); expect(takeRunEvents(g).filter(e => e.type === 'km')).toEqual([{type: 'km', km: 1, points: C.points.km}]); expect(g.score).toBe(score + C.points.km);
    g.distance = 1999.5; run(g, 300); expect(g.kms).toBe(2); expect(g.score).toBe(score + 3 * C.points.km);
  });
  it('breaks the pots hanging on a wall by running along it, and leaves them be from the road', () => {
    const g = quiet(); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    place(g, 'pot', -1, 3, {up: 1.5}); place(g, 'pot', g.lanes, 3, {up: 1.5}); takeRunEvents(g);
    run(g, 600);
    const strikes = takeRunEvents(g).filter(e => e.type === 'strike');
    expect(strikes.map(e => e.type === 'strike' && e.by)).toEqual(['wall']); expect(g.pots).toBe(1);
    expect(g.lastBumpAt).toBeNull();
  });
  it('bounces high off a springboard, over a row of pillars and a creature, and lands on the road', () => {
    const g = quiet(); g.lane = 1; for (const w of g.walls) w.runnable = false;
    place(g, 'spring', 1, 2); for (const l of [0, 1, 2]) place(g, 'pillar', l, 8); place(g, 'chest', 1, 10);
    run(g, 600); expect(types(g)).toContain('bounce'); expect(runHeight(g)).toBeGreaterThan(C.overHeight);
    run(g, 1500); expect(g.lastBumpAt).toBeNull(); expect(inAir(g)).toBe(false); expect(g.entities.some(e => e.kind === 'pillar' && e.z > g.distance)).toBe(false);
  });
  it('glides down at the end of a flight, onto a clear spot', () => {
    const g = quiet(); run(g, C.introMs); g.active = {power: 'flight', until: g.at + 300};
    run(g, 200); place(g, 'pillar', 1, 8); place(g, 'coin', 1, 9);
    run(g, 150); expect(g.active).toBeNull(); expect(runHeight(g)).toBeGreaterThan(2); expect(types(g)).toContain('landing');
    expect(g.entities.some(e => e.kind === 'pillar')).toBe(false); expect(g.entities.some(e => e.kind === 'coin')).toBe(true);
    run(g, 2000); expect(g.lastBumpAt).toBeNull(); expect(runHeight(g)).toBe(0);
  });
  it('gives a bonus for a trail of coins picked up all along one wall run', () => {
    const g = quiet(); run(g, C.introMs); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    for (let k = 0; k < 7; k++) place(g, 'wallCoin', -1, 2 + k * 2.5);
    takeRunEvents(g); while (g.wall) run(g, 20);
    const end = takeRunEvents(g).find(e => e.type === 'wallEnd');
    expect(end).toMatchObject({trail: 7, points: C.points.wallRun + 7 * C.points.wallTrail});
  });
  it('charges with the « Ruée »: faster, smashing all in her lane, leaping gaps', () => {
    const g = quiet(); run(g, C.introMs); const plain = g.speed;
    place(g, 'power', 1, 2, {power: 'dash'}); run(g, 300); expect(g.active?.power).toBe('dash'); expect(g.speed).toBeCloseTo(plain * C.dashSpeed, 0);
    place(g, 'pillar', 1, 4); place(g, 'chest', 1, 8); place(g, 'barrier', 1, 12); g.holes.push({from: g.distance + 16, to: g.distance + 19});
    const score = g.score; run(g, 1500);
    expect(g.lastBumpAt).toBeNull(); expect(g.foes).toBe(1); expect(g.score).toBeGreaterThan(score + 2 * C.dashSmash);
    run(g, C.powers.dash); expect(g.active).toBeNull();
  });
  it('rolls fireballs towards Benny once she is near: jumped, unharmed; met on the ground, a bump', () => {
    const g = quiet(); run(g, C.introMs);
    const ball = place(g, 'fireball', 1, 60); run(g, 300); expect(ball.rolling).toBeUndefined();
    while (ball.z - g.distance > C.fireFrom) run(g, 10);
    const z0 = ball.z; run(g, 200); expect(ball.z).toBeLessThan(z0);
    while (ball.z - g.distance > 1.5) run(g, 10); runInput(g, g.at, 'up'); run(g, 800); expect(g.lastBumpAt).toBeNull();
    place(g, 'fireball', 1, 20); run(g, 1500); expect(g.lastBumpAt).not.toBeNull();
  });
  it('rolls mine carts down the cave: too tall to jump, a step aside gets past', () => {
    const g = quiet(); run(g, C.introMs);
    const cart = place(g, 'fireball', 1, 30, {cart: true});
    while (cart.z - g.distance > 1.5) run(g, 10); runInput(g, g.at, 'up'); run(g, 800); expect(g.lastBumpAt).not.toBeNull();
    g.lastBumpAt = null; g.stumbleUntil = 0;
    const next = place(g, 'fireball', 1, 30, {cart: true});
    while (next.z - g.distance > 6) run(g, 10); runInput(g, g.at, 'left'); run(g, 1500); expect(g.lastBumpAt).toBeNull();
  });
  it('lays rockfalls only in the cave, always leaving one lane free', () => {
    let total = 0;
    for (const seed of [3, 4, 5]) {
      const g = startBennyRun(0, seed, 3); let seen = 0;
      for (let t = 0; t < 200_000 && !g.over; t += 1000) { g.entities = g.entities.filter(e => e.z > g.distance + 40); g.pits = []; g.holes = g.holes.filter(h => h.from > g.distance + 40); run(g, 1000);
        const rocks = g.entities.filter(e => e.rock); seen += rocks.length;
        for (const e of rocks) expect(settingAt(g, e.z)).toBe('grotte');
        const byZ = new Map<number, number>(); for (const e of rocks) byZ.set(e.z, (byZ.get(e.z) ?? 0) + 1);
        for (const [rz, n] of byZ) expect(n).toBeLessThan(lanesAt(g, rz));
      }
      total += seen; expect(g.over).toBe(false);
    }
    expect(total).toBeGreaterThan(0);
  });
});
