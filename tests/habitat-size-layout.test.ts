import {describe, expect, it} from 'vitest';
import {VISUAL} from '../src/config/visual';
import {HABITAT_SIZE_PROPOSAL, habitatProposalGround, habitatSlots} from '../src/config/habitatSizes';
import {habitatLevel} from '../src/config/habitats';
import {allowedBox, createRabbitMotion, minSeparation, stepRabbitMotion, type MotionLayout, type RabbitMotion} from '../src/display/rabbitMotion';
import {decodeGame, encodeGame} from '../src/simulation';
import {scenarioState} from '../src/dev/scenarios';

const levels = [2, 3] as const;
const layoutOf = (level: 2 | 3): MotionLayout => ({zone: HABITAT_SIZE_PROPOSAL[level].zone, roamScale: HABITAT_SIZE_PROPOSAL[level].roamScale});
const groupOf = (level: 2 | 3) => HABITAT_SIZE_PROPOSAL[level].slots.map((slot, index) => createRabbitMotion(`rabbit-${index + 2}`, slot, HABITAT_SIZE_PROPOSAL[level].slots.length, layoutOf(level)));
function advance(motions: RabbitMotion[], dtMs: number) {
  for (const m of motions) stepRabbitMotion(m, dtMs, motions.flatMap(o => o === m ? [] : o.mode === 'walk' ? [o.local, o.to] : [o.local]));
}

describe('proposed enclosure sizes: resident places and wandering zones', () => {
  it.each(levels)('level %i has one slot per place of its capacity, inside its zone and its drawn ground, well apart', level => {
    const proposal = HABITAT_SIZE_PROPOSAL[level], ground = habitatProposalGround(level);
    expect(proposal.slots).toHaveLength(habitatLevel('universal', level).capacity);
    for (const [index, slot] of proposal.slots.entries()) {
      expect(slot.x).toBeGreaterThanOrEqual(proposal.zone.minX); expect(slot.x).toBeLessThanOrEqual(proposal.zone.maxX);
      expect(slot.y).toBeGreaterThanOrEqual(proposal.zone.minY); expect(slot.y).toBeLessThanOrEqual(proposal.zone.maxY);
      // A rabbit is about 34 units wide on each side of its place: the whole body stays above the ground rectangle's width.
      expect(Math.abs(slot.x) + 34).toBeLessThanOrEqual(ground.width / 2);
      for (const other of proposal.slots.slice(index + 1)) expect(Math.hypot(slot.x - other.x, slot.y - other.y)).toBeGreaterThanOrEqual(52);
    }
    expect(Math.abs(proposal.zone.maxX) + 20).toBeLessThanOrEqual(ground.width / 2);
  });

  it('keeps rabbits at their current size: the proposal defines no scale, only places and zones', () => {
    expect(Object.keys(HABITAT_SIZE_PROPOSAL[2]).sort()).toEqual(['footprint', 'growth', 'labelOffset', 'roamScale', 'slots', 'texture', 'zone']);
    expect(VISUAL.rabbit.scale).toBe(1.3);
  });

  it.each(levels)('level %i residents wander inside their own zone, regroup nothing, and never pile up', level => {
    const motions = groupOf(level), count = motions.length, walks = motions.map(() => 0), modes = motions.map(m => m.mode); let closest = Infinity;
    for (let t = 0; t < 300_000; t += 33) {
      advance(motions, 33);
      motions.forEach((m, index) => {
        const box = allowedBox(HABITAT_SIZE_PROPOSAL[level].slots[index], count, layoutOf(level)), zone = HABITAT_SIZE_PROPOSAL[level].zone;
        expect(m.local.x).toBeGreaterThanOrEqual(Math.max(box.minX, zone.minX) - 1e-9); expect(m.local.x).toBeLessThanOrEqual(Math.min(box.maxX, zone.maxX) + 1e-9);
        expect(m.local.y).toBeGreaterThanOrEqual(Math.max(box.minY, zone.minY) - 1e-9); expect(m.local.y).toBeLessThanOrEqual(Math.min(box.maxY, zone.maxY) + 1e-9);
        if (m.mode === 'walk' && modes[index] !== 'walk') walks[index]++; modes[index] = m.mode;
        for (const other of motions.slice(index + 1)) closest = Math.min(closest, Math.hypot(m.local.x - other.local.x, m.local.y - other.local.y));
      });
    }
    expect(closest).toBeGreaterThan(minSeparation(count)); for (const n of walks) expect(n).toBeGreaterThanOrEqual(12);
  }, 30_000); // Five simulated minutes of motion: close to the default 5 s when the whole suite runs in parallel.

  it('leaves level 1 and the production zones untouched: no layout is carried unless the preview supplies one', () => {
    expect(createRabbitMotion('rabbit-2', {x: 0, y: 0}, 3).layout).toBeUndefined();
    expect(HABITAT_SIZE_PROPOSAL[1].slots).toEqual([]); expect(HABITAT_SIZE_PROPOSAL[1].zone).toEqual(VISUAL.rabbit.roam.hard);
  });
});

describe('places for fewer residents than the capacity', () => {
  it.each(levels)('level %i: any group of 1 to its capacity sits in distinct places, nearest the middle, and the full group uses them all', level => {
    const all = HABITAT_SIZE_PROPOSAL[level].slots, key = (p: {x: number; y: number}) => `${p.x},${p.y}`;
    for (let count = 1; count <= all.length; count++) {
      const places = habitatSlots(level, count); expect(places).toHaveLength(count); expect(new Set(places.map(key)).size).toBe(count);
      for (const place of places) expect(all.map(key)).toContain(key(place));
      const worst = Math.max(...places.map(p => Math.hypot(p.x, p.y - 10))), unused = all.filter(p => !places.map(key).includes(key(p)));
      for (const other of unused) expect(Math.hypot(other.x, other.y - 10)).toBeGreaterThanOrEqual(worst - 1e-9);
    }
    expect(habitatSlots(level, all.length).map(key).sort()).toEqual(all.map(key).sort());
  });
  it('a single resident of the largest enclosure stands near its middle, not in a corner', () => {
    const [place] = habitatSlots(3, 1); expect(Math.abs(place.x)).toBeLessThanOrEqual(42); expect(place.y).toBeGreaterThan(0);
    expect(habitatSlots(3, 3).map(p => Math.abs(p.x)).sort((a, b) => a - b)).toEqual([0, 42, 42]);
  });
});

describe('laboratory scenario for the size comparison', () => {
  it('holds three enclosures of the same type at levels 1, 2 and 3, with 3, 5 and 7 residents, valid and saveable', () => {
    const s = scenarioState('enclosureSizes', 0), homes = s.buildings.filter(b => b.kind === 'enclosure');
    expect(homes.map(b => [b.habitat!.type, b.habitat!.level, s.rabbits.filter(r => r.enclosureId === b.id).length])).toEqual([['universal', 1, 3], ['universal', 2, 5], ['universal', 3, 7]]);
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    // Logical footprints are untouched (still 4 × 4 fine cells each): the proposal changes drawing only.
    const [a, b, c] = homes; expect([a.x, b.x, c.x]).toEqual([18, 25, 34]);
  });
});
