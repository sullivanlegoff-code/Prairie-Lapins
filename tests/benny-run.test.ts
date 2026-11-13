import {describe, expect, it} from 'vitest';
import {advanceBennyRun, BENNY_RUN as C, isGoldenPot, challengeGoal, comboMultiplier, dragonVisible, holeAt, lanesAt, inAir, reach, runHeight, runInput, tutorialStep, runnableAt, runSummary, settingAt, startBennyRun, takeRunEvents,
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
  it('strikes every creature in the lane she moves into, within reach, in one move', () => {
    const g = quiet(); g.lane = 0;
    place(g, 'dragonnet', 1, 2); place(g, 'dragonnet', 1, 4);
    runInput(g, g.at, 'right');
    expect(g).toMatchObject({lane: 1, foes: 2, combo: 2});
    expect(g.entities.filter(e => e.lane === 1 && e.z > g.distance)).toHaveLength(0);
  });
  it('strikes a creature with the wand only when changing lanes towards it, and bumps into one met straight on', () => {
    const g = quiet();
    place(g, 'dragonnet', 0, 5);
    runInput(g, g.at, 'left');
    expect(g).toMatchObject({lane: 0, foes: 1, score: C.points.foe, combo: 1});
    expect(g.entities).toHaveLength(0);
    place(g, 'dragonnet', 0, 5); run(g, 1000);
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
  it('strikes with a slide (swipe down) only what touches the hit-box of Benny, and what it slides into', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'dragonnet', 1, 5); runInput(g, g.at, 'down'); expect(g).toMatchObject({foes: 0}); // Ahead, out of her hit-box: no strike.
    g.entities = [];
    run(g, 800); place(g, 'dragonnet', 1, 0.3); runInput(g, g.at, 'down');
    expect(g).toMatchObject({foes: 1, lastBumpAt: null});
    run(g, 800); place(g, 'ember', 1, 0.3); runInput(g, g.at, 'down'); run(g, 600);
    expect(g).toMatchObject({foes: 2, lastBumpAt: null});
    place(g, 'pot', 1, 0.3); runInput(g, g.at, 'down'); expect(g.pots).toBe(1);
  });
  it('is struck by a creature she passes without striking it: in her lane even when jumping, in the next lane, not two lanes away nor from a wall', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'dragonnet', 1, 3); runInput(g, g.at, 'up'); run(g, 500);
    expect(takeRunEvents(g).map(e => e.type)).toContain('bump');
    run(g, C.dragonMs);
    place(g, 'dragonnet', 0, 4); run(g, 800);
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
    runInput(g, g.at, 'right'); expect(g).toMatchObject({wall: null, lane: 1, wallRuns: 2}); // Down into the next lane, at once.
  });
  it('leaves a wall with a ground charge whose shock wave strikes every lane around her; a charge from a jump does not', () => {
    const g = quiet(); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); run(g, 300);
    const near = [place(g, 'pot', 0, 3), place(g, 'dragonnet', 1, 4), place(g, 'dragonnet', 2, 2)], far = place(g, 'pot', 2, 14);
    runInput(g, g.at, 'down'); run(g, 300);
    const events = takeRunEvents(g);
    expect(events.map(e => e.type)).toContain('shockwave');
    expect(events.filter(e => e.type === 'strike').map(e => e.type === 'strike' && e.by)).toEqual(['shock', 'shock', 'shock']);
    expect(g.entities).toEqual([far]); expect(near.every(e => !g.entities.includes(e))).toBe(true);
    expect(g).toMatchObject({wall: null, lane: 0, pots: 1, foes: 2, lastBumpAt: null});
    const h = quiet(); runInput(h, h.at, 'up'); run(h, 300); place(h, 'pot', 0, 2); place(h, 'pot', 1, 2.5); runInput(h, h.at, 'down'); run(h, 300);
    expect(types(h)).not.toContain('shockwave'); expect(h.pots).toBe(1);
  });
  it('strikes with a long blow a creature in the lane after the one she moves into (owner, 13 Nov.)', () => {
    // Nothing in the middle lane: the creature on the far right falls, and Benny ends in the middle.
    const g = quiet(); run(g, C.introMs); g.lane = 0;
    place(g, 'dragonnet', 2, 4); runInput(g, g.at, 'right');
    expect(takeRunEvents(g).filter(e => e.type === 'strike').map(e => e.type === 'strike' && e.by)).toEqual(['far']);
    expect(g).toMatchObject({lane: 1, foes: 1}); expect(g.entities).toHaveLength(0);
    // One in the middle and one on the right, on the same line: both at once.
    place(g, 'ember', 1, 4); place(g, 'flyer', 2, 4.8); g.lane = 0; runInput(g, g.at, 'right');
    expect(takeRunEvents(g).filter(e => e.type === 'strike').map(e => e.type === 'strike' && e.by)).toEqual(['lane', 'far']);
    expect(g).toMatchObject({lane: 1, foes: 3}); expect(g.entities).toHaveLength(0);
    // Not on the same line: only the one in the middle.
    place(g, 'dragonnet', 1, 3); const later = place(g, 'dragonnet', 2, 3 + C.farLine + 1); g.lane = 0; runInput(g, g.at, 'right');
    expect(g.foes).toBe(4); expect(g.entities).toEqual([later]);
    // A pot beyond is not struck from afar (only creatures).
    const h = quiet(); run(h, C.introMs); h.lane = 0; const pot = place(h, 'pot', 2, 3); runInput(h, h.at, 'right');
    expect(h.entities).toEqual([pot]);
  });
  it('throws a chest struck once four times as far as before (owner, 13 Nov.)', () => {
    const g = quiet(); run(g, C.introMs); const c = place(g, 'chest', g.lane, .5), z = c.z;
    runInput(g, g.at, 'down'); expect(c.knock).toBe(28); run(g, 3000);
    expect(c.knock).toBeUndefined(); expect(c.z - z).toBeCloseTo(28, 5); expect(c.hp).toBe(1);
  });
  it('spins and strikes both creatures when one waits on each side of her', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'dragonnet', 0, 4); place(g, 'dragonnet', 2, 4.5); runInput(g, g.at, 'left');
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
    place(g, 'flyer', 2, 0.3); runInput(g, g.at, 'down'); expect(g.foes).toBe(3);
    expect(g.lastBumpAt).toBeNull();
  });
  it('walks up stairs without a jump, and steps sideways only onto a low step', () => {
    const g = quiet(); run(g, C.introMs); const z = g.distance;
    g.ledges.push({lane: 1, from: z + 2, to: z + 60, top: 1.2});
    run(g, 2500); expect(inAir(g)).toBe(false); expect(runHeight(g)).toBeCloseTo(1.2, 1); // Up the stairs, on the flat top.
    const high = quiet(); run(high, C.introMs); high.lane = 0; const w = high.distance;
    high.ledges.push({lane: 1, from: w - 5, to: w + 60, top: 1.2}); // She is level with the stairs, already on their top: the next lane is a high step.
    runInput(high, high.at, 'right'); expect(high.lane).toBe(0); expect(types(high)).toContain('blocked'); // Too high a step.
    const low = quiet(); run(low, C.introMs); low.lane = 0; const v = low.distance;
    low.ledges.push({lane: 1, from: v - 5, to: v + 60, top: .4});
    runInput(low, low.at, 'right'); expect(low.lane).toBe(1);
  });
  it('never lays two creatures in one row with an empty lane between them: side by side only', () => {
    const kinds = ['dragonnet', 'chest', 'ember', 'flyer'];
    for (let seed = 1; seed <= 6; seed++) {
      const g = startBennyRun(0, seed * 104729); const rows = new Map<string, number[]>(); let t = 0;
      while (g.distance < 1500 && t < 1_000_000) {
        t += 16; advanceBennyRun(g, t); if (g.over) g.over = false; // Measured on a run that goes on.
        for (const e of g.entities) if (kinds.includes(e.kind)) rows.set(e.z.toFixed(1), [...(rows.get(e.z.toFixed(1)) ?? []), e.lane]);
      }
      for (const lanes of rows.values()) { const s = [...new Set(lanes)].sort((a, b) => a - b); expect(s.every((l, i) => i === 0 || l - s[i - 1] <= 1)).toBe(true); }
    }
  });
  it('swiping sideways in the air brings Benny down at once to strike the creature on the ground in the new lane', () => {
    const g = quiet(); run(g, C.introMs); runInput(g, g.at, 'left'); runInput(g, g.at, 'up'); run(g, 200); expect(inAir(g)).toBe(true);
    place(g, 'dragonnet', 1, 0.3); runInput(g, g.at, 'right');
    expect(g).toMatchObject({lane: 1, foes: 1}); expect(inAir(g)).toBe(false);
  });
  it('lets a flying monster hover over the road: running under it does nothing, only a jump through its height strikes it', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'flyer', g.lane, 1); run(g, 400); expect(g).toMatchObject({lastBumpAt: null, foes: 0}); // Passed under, on the ground.
    place(g, 'flyer', g.lane, 3); runInput(g, g.at, 'up'); run(g, C.jumpMs); expect(g.foes).toBe(1); // A jump strikes it (at the press, within reach).
  });
  it('lets a flying monster reach Benny on a wall, from the edge lane, and swiping off the wall strikes it', () => {
    const g = quiet(); run(g, C.introMs); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    place(g, 'dragonnet', 0, 3); run(g, 500); expect(g.lastBumpAt).toBeNull(); // A creature on the ground does not reach the wall.
    place(g, 'flyer', 0, 3); run(g, 500); expect(g.lastBumpAt).not.toBeNull();
    run(g, C.dragonMs); runInput(g, g.at, 'right'); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    place(g, 'flyer', 1, 4); runInput(g, g.at, 'right');
    expect(g).toMatchObject({wall: null, lane: 1}); expect(g.entities.some(e => e.kind === 'flyer')).toBe(false);
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
  it('swiping away from the wall comes down into the middle lane at once, and strikes what waits there', () => {
    const g = quiet(); run(g, C.introMs); runInput(g, g.at, 'right'); runInput(g, g.at, 'right'); expect(g.wall?.side).toBe('right');
    place(g, 'dragonnet', 1, 4); runInput(g, g.at, 'left');
    expect(g).toMatchObject({wall: null, lane: 1, foes: 1}); run(g, 800); expect(g.lastBumpAt).toBeNull();
  });
  it('spares Benny from a creature she only comes beside at the last moment: she had no time to strike it', () => {
    const g = quiet();
    runInput(g, g.at, 'left'); place(g, 'dragonnet', 2, 6);
    // Two lanes away until it is almost level, then Benny steps next to it.
    run(g, Math.round((6 - 1.2) / g.speed * 1000));
    runInput(g, g.at, 'right'); run(g, 600);
    expect(g.lastBumpAt).toBeNull();
    // Beside it from afar, without striking: it strikes back.
    place(g, 'dragonnet', 2, 8); run(g, 1200);
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
  it('jumps a short gap; running into one is a fall into the void, and the Dragon catches her: the run is over', () => {
    const g = quiet(); for (const w of g.walls) w.runnable = false;
    g.holes.push({from: g.distance + 3, to: g.distance + 7}); runInput(g, g.at, 'up'); run(g, 900);
    expect(g.lastBumpAt).toBeNull(); expect(holeAt(g)).toBeUndefined();
    g.holes.push({from: g.distance + 3, to: g.distance + 7}); run(g, 300);
    expect(types(g)).toContain('fall'); expect(g.over).toBe(false); // The drop first.
    run(g, C.fallMs + 50); expect(g.over).toBe(true); expect(types(g)).toContain('caught');
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
  it('falls into a long gap too, even with a wall beside it: the void ends the run', () => {
    const g = quiet(); runInput(g, g.at, 'right');
    g.holes.push({from: g.distance + 3, to: g.distance + 30}); run(g, 600);
    expect(types(g)).toContain('fall'); expect(g.wall).toBeNull(); run(g, C.fallMs + 50); expect(g.over).toBe(true);
  });
  it('breaks a struck pot where it stands: nothing flies on, what stood behind it is still there', () => {
    const g = quiet();
    const pot = place(g, 'pot', 0, 4), chest = place(g, 'dragonnet', 0, 14), next = place(g, 'pot', 0, 20);
    runInput(g, g.at, 'left'); run(g, 50);
    const strikes = takeRunEvents(g).filter(e => e.type === 'strike');
    expect(strikes.map(e => e.type === 'strike' && e.by)).toEqual(['lane']); expect(g).toMatchObject({pots: 1, foes: 0, combo: 1});
    expect(g.entities).not.toContain(pot); expect(g.entities).toContain(chest); expect(g.entities).toContain(next);
    expect(g.entities.every(e => ['pot', 'dragonnet'].includes(e.kind))).toBe(true);
  });
  it('rolls on through a row: each thing broken while rolling keeps the roll going', () => {
    const g = quiet(); place(g, 'pot', 1, 2); place(g, 'dragonnet', 1, 8); place(g, 'pot', 1, 14); place(g, 'dragonnet', 1, 20);
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
    place(g, 'dragonnet', 0, reach(g) - .5); runInput(g, g.at, 'left'); expect(g.foes).toBe(1);
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
    // Creatures in one row fill neighbouring lanes only: never a lane empty between two of them.
    const foeRows = new Map<number, number[]>(); for (const e of all) if (['dragonnet', 'chest', 'ember', 'flyer'].includes(e.kind)) foeRows.set(e.z, [...(foeRows.get(e.z) ?? []), e.lane]);
    for (const lanes of foeRows.values()) { const s = [...lanes].sort((x, y) => x - y); expect(s[s.length - 1] - s[0]).toBe(s.length - 1); }
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
    until(5); const chest = g.entities.find(e => e.kind === 'chest')!; chest.z = g.distance + C.hitHalf * .5; // Rolled into, at the body: the first blow throws it on.
    runInput(g, g.at, 'down'); run(g, 20); expect(tutorialStep(g)).toBe('front'); chest.z = g.distance + C.hitHalf * .5; // Rolled into again: the second blow breaks it.
    runInput(g, g.at, 'down'); run(g, 20); expect(tutorialStep(g)).toBe('flyer');
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
    expect(g).toMatchObject({wall: null, lane: 0, wallRuns: 1, coins: 1, lastBumpAt: null, combo: 0});
    expect(Math.abs(g.score - C.points.wallPerSecond * C.wallMs / 1000)).toBeLessThanOrEqual(C.points.wallPerSecond * .1); // By the time up there.
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
        advanceBennyRun(g, t); g.lastBumpAt = null; g.fallFrom = null; g.over = false; g.pits = g.pits.filter(p => !p.open); const gap = holeAt(g); if (gap) g.distance = gap.to; // Falls into the void are not the point here: she is carried past.
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
    const on = rows(true), off = rows(false); expect(on).toBeGreaterThanOrEqual(off); // Fewer runnable walls now (owner: too easy to keep the combo on them): the challenge only adds rows where a wall is runnable.
  });
  it('widens the road to five lanes in a wide hall (the middle stays the middle), then narrows it back', () => {
    const g = quiet(); g.zones.push({from: g.distance + 10, to: g.distance + 40});
    expect(lanesAt(g, g.distance + 20)).toBe(5); expect(g.lanes).toBe(3);
    run(g, 1000); expect(g).toMatchObject({lanes: 5, lane: 2}); expect(takeRunEvents(g)).toContainEqual({type: 'lanes', lanes: 5, shift: 1});
    runInput(g, g.at, 'right'); runInput(g, g.at + 200, 'right'); expect(g.lane).toBe(4);
    run(g, 2500); expect(g).toMatchObject({lanes: 3, lane: 2});
  });
  it('reaches a platform only by landing on it from a springboard, runs on beneath it from the ground, steps off it aside or at its end', () => {
    // From the ground, beneath it: no way up.
    const g = quiet(); run(g, C.introMs); const z = g.distance;
    g.platforms.push({lane: 1, from: z + 12, to: z + 50});
    run(g, 1600); expect(g.raised).toBeNull(); expect(runHeight(g)).toBe(0);
    // A springboard just before it, aimed at it: she bounces and lands on top.
    const h = quiet(); run(h, C.introMs); const w = h.distance, len = h.speed * C.springMs / 1000;
    place(h, 'spring', 1, 3); h.platforms.push({lane: 1, from: w + 3 + len - 4, to: w + 3 + len + 40});
    run(h, 2000); expect(h.raised).not.toBeNull(); expect(runHeight(h)).toBeCloseTo(C.platformHeight, 1);
    expect(types(h)).toContain('platformUp');
    place(h, 'pillar', 2, 6); place(h, 'coin', 1, 4); run(h, 600);
    expect(h.lastBumpAt).toBeNull(); expect(h.coins).toBe(1);
    // Aside: a jump down from up there, into the next lane.
    runInput(h, h.at, 'right'); expect(h.raised).toBeNull(); expect(h.lane).toBe(2); expect(inAir(h)).toBe(true);
    run(h, 800); expect(runHeight(h)).toBe(0);
    run(h, 3000); expect(h.platforms.every(p => p.to > h.distance - 10)).toBe(true); expect(h.raised).toBeNull();
  });  it('a chest takes two blows: the first throws it on along the road, the second breaks it', () => {
    const g = quiet(); run(g, C.introMs);
    const c = place(g, 'chest', g.lane, 0.3); runInput(g, g.at, 'down');
    expect(g.foes).toBe(0); expect(g.entities).toContain(c); expect(c.hp).toBe(1); expect(c.knock).toBeGreaterThan(0);
    run(g, 900); expect(c.knock).toBeUndefined(); expect(g.entities).toContain(c); // Thrown on (28 m, in about 0.8 s), and still there.
    c.z = g.distance + 0.3; runInput(g, g.at, 'down');
    expect(g.foes).toBe(1); expect(g.entities).not.toContain(c);
  });
  it('a sideways move into a chest strikes it once: it is thrown on, not broken at once', () => {
    const g = quiet(); run(g, C.introMs); g.lane = 1;
    const c = place(g, 'chest', 0, 3); runInput(g, g.at, 'left');
    expect(g.lane).toBe(0); expect(g.foes).toBe(0); expect(g.entities).toContain(c); expect(c.hp).toBe(1); expect(c.knock).toBeGreaterThan(0);
  });
  it('a thrown chest knocks down the creature it meets, and breaks against decor', () => {
    const g = quiet(); run(g, C.introMs); const lane = g.lane;
    const c = place(g, 'chest', lane, 0.5); runInput(g, g.at, 'down');
    place(g, 'dragonnet', lane, 3.5); run(g, 400);
    expect(g.foes).toBe(1); expect(g.entities.some(e => e.kind === 'dragonnet')).toBe(false); expect(g.entities).toContain(c);
    place(g, 'pillar', lane, c.z - g.distance + 2); c.knock = C.chestKnock; run(g, 300);
    expect(g.entities).not.toContain(c);
  });
  it('a lane open to the void drops Benny into it: the Dragon catches her and the run is over', () => {
    const g = quiet(); run(g, C.introMs);
    g.pits.push({lane: g.lane, from: g.distance + 2, to: g.distance + 12, open: true}); run(g, 400);
    expect(types(g)).toContain('fall'); expect(g.over).toBe(false); run(g, C.fallMs + 50); expect(g.over).toBe(true);
  });
  it('swiping off the road into a void side is a fall, not a wall', () => {
    const g = quiet(); run(g, C.introMs); g.lane = 0; const z = g.distance;
    for (const w of g.walls) w.runnable = false; // The quiet road has runnable walls: this side is the void only.
    g.walls.push({side: 'left', from: z - 5, to: z + 60, runnable: false, void: true});
    runInput(g, g.at, 'left'); expect(g.fallFrom).not.toBeNull(); expect(g.wall).toBeNull();
  });
  it('never moves a creature sideways: a dragonnet, an ember or any other stays in its lane', () => {
    const g = quiet(); const e = place(g, 'dragonnet', 1, 60); place(g, 'ember', 2, 30);
    run(g, 6000); expect(e.lane).toBe(1); expect(g.entities.filter(o => o.kind === 'ember').every(o => o.lane === 2)).toBe(true);
  });
  it('opens a pit where cracked slabs give way as Benny comes: over it unharmed, into it the void and the end of the run', () => {
    const g = quiet(); run(g, C.introMs); const z = g.distance;
    g.pits.push({lane: 1, from: z + 30, to: z + 34, open: false});
    run(g, 200); expect(g.pits[0].open).toBe(false);
    run(g, (30 - C.crumbleAt) / g.speed * 1000 + 100); expect(g.pits[0].open).toBe(true); expect(types(g)).toContain('crumble');
    // Over it with a jump: unharmed.
    while (g.pits[0].from - g.distance > 1.2) run(g, 10); runInput(g, g.at, 'up'); run(g, 800); expect(g.lastBumpAt).toBeNull();
    // Into the next one: a bump, then out of it.
    g.pits.push({lane: 1, from: g.distance + 3, to: g.distance + 7, open: true}); run(g, 400);
    expect(types(g)).toContain('fall'); run(g, C.fallMs + 50); expect(g.over).toBe(true);
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
    place(g, 'spring', 1, 2); for (const l of [0, 1, 2]) place(g, 'pillar', l, 8); place(g, 'dragonnet', 1, 10);
    run(g, 600); expect(types(g)).toContain('bounce'); expect(runHeight(g)).toBeGreaterThan(C.overHeight);
    run(g, 1500); expect(g.lastBumpAt).toBeNull(); expect(inAir(g)).toBe(false); expect(g.entities.some(e => e.kind === 'pillar' && e.z > g.distance)).toBe(false);
  });
  it('from a springboard bounce, a ground charge makes a shock wave that breaks the pots across the road', () => {
    const g = quiet(); g.lane = 1; place(g, 'spring', 1, 1); for (const l of [0, 1, 2]) place(g, 'pot', l, 1 + g.speed * C.springMs / 1000 * .8);
    run(g, 700); runInput(g, g.at, 'down'); run(g, 400);
    expect(types(g)).toContain('shockwave'); expect(g.pots).toBe(3); expect(g.lastBumpAt).toBeNull();
  });
  it('lays a road of coins in the sky for a flight, one lane step at a time, gone with the flight', () => {
    const g = quiet(); g.lane = 1; place(g, 'power', 1, 2, {power: 'flight'}); run(g, 300);
    const sky = g.entities.filter(e => e.sky).sort((a, b) => a.z - b.z); expect(sky.length).toBeGreaterThan(15);
    sky.forEach((e, i) => { if (i) expect(Math.abs(e.lane - sky[i - 1].lane)).toBeLessThanOrEqual(1); });
    const coins = g.coins; run(g, 2000); expect(g.coins).toBeGreaterThan(coins); // Picked up following them.
    g.active!.until = g.at; run(g, 20); expect(g.entities.some(e => e.sky)).toBe(false);
  });
  it('banks a long series of strikes once it ends by itself, but not one broken by a bump', () => {
    const g = quiet(); g.lane = 1; for (let i = 0; i < 6; i++) place(g, 'pot', 1, 0.3 + i * 2.5); // A row she rolls through.
    runInput(g, g.at, 'down'); run(g, 3300); expect(g.combo).toBe(6); takeRunEvents(g); const score = g.score;
    run(g, C.comboMs * 2); expect(takeRunEvents(g)).toContainEqual({type: 'series', length: 6, points: 6 * C.seriesPoints}); // The roll keeps the combo, then it ends.
    expect(g.score).toBe(score + 6 * C.seriesPoints); expect(g.combo).toBe(0);
    for (let i = 0; i < 5; i++) place(g, 'pot', 1, 0.3 + i * 2.5); runInput(g, g.at, 'down'); run(g, 2300); expect(g.combo).toBe(5);
    place(g, 'pillar', 1, 1); run(g, 300); run(g, C.comboMs); expect(takeRunEvents(g).some(e => e.type === 'series')).toBe(false);
  });
  it('glides down at the end of a flight, onto a clear spot', () => {
    const g = quiet(); run(g, C.introMs); g.active = {power: 'flight', until: g.at + 300};
    run(g, 200); place(g, 'pillar', 1, 8); place(g, 'coin', 1, 9);
    run(g, 150); expect(g.active).toBeNull(); expect(runHeight(g)).toBeGreaterThan(2); expect(types(g)).toContain('landing');
    expect(g.entities.some(e => e.kind === 'pillar')).toBe(false); expect(g.entities.some(e => e.kind === 'coin')).toBe(true);
    run(g, 2000); expect(g.lastBumpAt).toBeNull(); expect(runHeight(g)).toBe(0);
  });
  it('running on a wall adds no combo, keeps the one under way, and pays by the time spent up there', () => {
    const g = quiet(); run(g, C.introMs); g.combo = 3; g.comboUntil = g.at + 100;
    runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    run(g, C.wallMs - 300); expect(g.combo).toBe(3); expect(g.comboUntil).toBeGreaterThan(g.at); // The combo is kept alive on the wall.
    while (g.wall) run(g, 20);
    expect(g.combo).toBe(3); expect(g.score).toBeGreaterThan(0);
  });
  it('breaks a creature whose head a downward swipe falls on, and rebounds off it', () => {
    const g = quiet(); run(g, C.introMs);
    runInput(g, g.at, 'up'); run(g, 200); runInput(g, g.at, 'down'); expect(g.pound).toBe(true);
    place(g, 'dragonnet', g.lane, 0.3); run(g, 150);
    expect(g.foes).toBe(1); expect(inAir(g)).toBe(true); expect(g.pound).toBe(false); // Struck, and up again.
  });
  it('gives a bonus for a trail of coins picked up all along one wall run', () => {
    const g = quiet(); run(g, C.introMs); runInput(g, g.at, 'left'); runInput(g, g.at, 'left'); expect(g.wall?.side).toBe('left');
    for (let k = 0; k < 7; k++) place(g, 'wallCoin', -1, 2 + k * 2.5);
    takeRunEvents(g); while (g.wall) run(g, 20);
    const end = takeRunEvents(g).find(e => e.type === 'wallEnd');
    expect(end).toMatchObject({trail: 7}); expect((end as {points: number}).points).toBeGreaterThanOrEqual(7 * C.points.wallTrail);
  });
  it('charges with the « Ruée »: faster, smashing all in her lane, leaping gaps', () => {
    const g = quiet(); run(g, C.introMs); const plain = g.speed;
    place(g, 'power', 1, 2, {power: 'dash'}); run(g, 300); expect(g.active?.power).toBe('dash'); expect(g.speed).toBeCloseTo(plain * C.dashSpeed, 0);
    place(g, 'pillar', 1, 4); place(g, 'dragonnet', 1, 8); place(g, 'barrier', 1, 12); g.holes.push({from: g.distance + 16, to: g.distance + 19});
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

describe('golden pots', () => {
  it('makes about one laid pot in twenty golden', () => {
    const ids = Array.from({length: 4000}, (_, i) => i + 1), share = ids.filter(isGoldenPot).length / ids.length;
    expect(share).toBeGreaterThan(.04); expect(share).toBeLessThan(.06);
    // Never two golden pots side by side in a row of pots.
    expect(ids.some(id => isGoldenPot(id) && isGoldenPot(id + 1))).toBe(false);
    // The pots the game lays follow the rule.
    const g = startBennyRun(1, 1000); run(g, 30000);
    expect(g.entities.filter(e => e.kind === 'pot').every(e => !!e.gold === isGoldenPot(e.id))).toBe(true);
  });
  it('gives five times the points for a golden pot', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'pot', 1, 0.3, {gold: true}); runInput(g, g.at, 'down');
    expect(g.score).toBe(C.points.pot * C.goldPot); expect(g.pots).toBe(1); expect(runSummary(g).goldPots).toBe(1);
  });
  it('picks up a Heart in its lane, and passes one in another lane', () => {
    const g = quiet(); run(g, C.introMs);
    place(g, 'heart', g.lane, 3); run(g, 500);
    expect(g.hearts).toBe(1); expect(types(g)).toContain('heart'); expect(runSummary(g).hearts).toBe(1);
    place(g, 'heart', g.lane === 0 ? 1 : 0, 3); run(g, 500);
    expect(g.hearts).toBe(1);
  });
});
