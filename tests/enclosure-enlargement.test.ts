import {describe, expect, it} from 'vitest';
import {itAll} from './cases';
import {ENCLOSURE_FOOTPRINTS, ENCLOSURE_SCALE, FORMER_ENCLOSURE_FOOTPRINTS, FORMER_ENCLOSURE_SCALE, HABITAT_SIZE_PROPOSAL, buildingSize, enclosureScale} from '../src/config/habitatSizes';
import {habitatArtFor, habitatArtLayout} from '../src/config/habitatArt';
import {HABITAT_TYPES, type HabitatLevel} from '../src/config/habitats';
import {ISLAND} from '../src/config/islandGeometry';
import {FINE_GRID} from '../src/config/decorations';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {act, createGame} from '../src/simulation';
import {ENCLOSURE_GROWTH_REACH, growFormerEnclosures} from '../src/simulation/enclosureGrowth';
import {buildingFootprint, overlaps} from '../src/simulation/placement';
import {cumulativeLevelXp, requiredHabitatUpgradeLevel} from '../src/simulation/progression';
import {emptyBuilding} from '../src/state/initial';
import type {Building, GameState} from '../src/state/types';
import {asPreviousSizesJson, asV23Json} from './v23-save-fixture';

const LEVELS = [1, 2, 3] as const;
const CELL = {x: ISLAND.cellWidth / FINE_GRID, y: ISLAND.cellDepth / FINE_GRID};
const area = (size: {width: number; depth: number}) => size.width * size.depth;

/**
 * A fresh game owns the south-west parcel only: fine cells x 0–15, y 32–47. Nest (2, 36), nursery (10, 36), Paille (4, 40); in
 * saves written before 6 November 2026, Paille stood at (6, 40) (`oldIsland`).
 */
function crowded(): GameState {
  const s = createGame(0); s.pattes = 10_000; s.hearts = 50; s.grass = 100;
  const level = requiredHabitatUpgradeLevel('paille', 3); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  return s;
}
const oldIsland = (s: GameState) => { s.buildings.find(b => b.id === 'building-1')!.x = 6; return s; };
const enclosureAt = (s: GameState, id: string, x: number, y: number, level: HabitatLevel = 1, tier?: HabitatLevel): Building => {
  const b = emptyBuilding(id, 'enclosure', x, y, 'universal'); b.habitat!.level = level; if (tier) b.footprintTier = tier; s.buildings.push(b);
  s.nextId = Math.max(s.nextId, Number(id.split('-')[1]) + 1); return b;
};
const load = (json: string): GameState => { const r = decodeGame(json); if (!r.ok) throw Error(r.reason); return r.state; };
function expectNoOverlap(s: GameState) {
  for (const [i, a] of s.buildings.entries()) for (const b of s.buildings.slice(i + 1)) expect(overlaps(buildingFootprint(a), buildingFootprint(b)), `${a.id} / ${b.id}`).toBe(false);
  // The written save validates on its own: every footprint inside owned land, apart from every other one and from decorations.
  expect(decodeGame(encodeGame(s)).ok).toBe(true);
}
function expectNothingLost(before: GameState, after: GameState) {
  expect(after.buildings.map(b => b.id)).toEqual(before.buildings.map(b => b.id));
  expect(after.rabbits).toEqual(before.rabbits);
  for (const r of after.rabbits) expect(after.buildings.some(b => b.id === r.enclosureId && b.kind === 'enclosure')).toBe(true);
  expect(after.decorations).toEqual(before.decorations);
  for (const b of after.buildings) expect({...b, x: 0, y: 0, formerFootprint: undefined}).toEqual({...before.buildings.find(o => o.id === b.id)!, x: 0, y: 0, formerFootprint: undefined});
  for (const key of ['pattes', 'hearts', 'grass', 'nextId', 'acquiredParcels', 'progression'] as const) expect(after[key], key).toEqual(before[key]);
}

describe('the enlarged enclosure sizes', () => {
  it('grows each level again, clearly, over the 3 November sizes, and keeps level 3 > level 2 > level 1', () => {
    expect(ENCLOSURE_FOOTPRINTS).toEqual({1: {width: 6, depth: 5}, 2: {width: 10, depth: 6}, 3: {width: 12, depth: 7}});
    expect(FORMER_ENCLOSURE_FOOTPRINTS[2]).toEqual({1: {width: 5, depth: 4}, 2: {width: 8, depth: 5}, 3: {width: 10, depth: 6}});
    for (const level of LEVELS) {
      expect(FORMER_ENCLOSURE_FOOTPRINTS[1][level]).toEqual(HABITAT_SIZE_PROPOSAL[level].footprint);
      // Ground: +40 to +50 % over the 3 November size (which was +25 to +33 % over the first one).
      const growth = area(ENCLOSURE_FOOTPRINTS[level]) / area(FORMER_ENCLOSURE_FOOTPRINTS[2][level]);
      expect(growth).toBeGreaterThanOrEqual(1.4); expect(growth).toBeLessThanOrEqual(1.5);
      // Drawn area: at least a third more than on 3 November, and never smaller than the footprint growth's square root.
      expect((ENCLOSURE_SCALE[level] / FORMER_ENCLOSURE_SCALE[2][level]) ** 2).toBeGreaterThanOrEqual(1.33);
      expect(FORMER_ENCLOSURE_SCALE[2][level]).toBeGreaterThan(FORMER_ENCLOSURE_SCALE[1][level]);
    }
    expect(area(ENCLOSURE_FOOTPRINTS[2])).toBeGreaterThan(area(ENCLOSURE_FOOTPRINTS[1]));
    expect(area(ENCLOSURE_FOOTPRINTS[3])).toBeGreaterThan(area(ENCLOSURE_FOOTPRINTS[2]));
    // Other buildings keep 4 × 4.
    for (const kind of ['farm', 'nest', 'nursery', 'kitchen', 'statue', 'agency', 'salon', 'forest'] as const) expect(buildingSize({kind})).toEqual({width: 4, depth: 4});
  });

  it('shows every painting larger with one uniform factor, its front and sides inside the footprint, larger level by level, at every era', () => {
    const eras = [{name: 'current', sizes: ENCLOSURE_FOOTPRINTS, scales: ENCLOSURE_SCALE}, {name: 'era 2', sizes: FORMER_ENCLOSURE_FOOTPRINTS[2], scales: FORMER_ENCLOSURE_SCALE[2]}];
    for (const {name, sizes, scales} of eras) for (const type of HABITAT_TYPES) {
      let previousWidth = 0;
      for (const level of LEVELS) {
        const art = habitatArtFor({type, level}, level)!; expect(art, `${type} ${level}`).not.toBeNull();
        const k = scales[level] * art.worldWidth / art.width, size = sizes[level], label = `${name} ${type} ${level}`;
        const halfWidth = size.width * CELL.x / 2, halfDepth = size.depth * CELL.y / 2;
        expect(art.anchor.x * k, `${label} left`).toBeLessThanOrEqual(halfWidth);
        expect((art.width - art.anchor.x) * k, `${label} right`).toBeLessThanOrEqual(halfWidth);
        expect((art.height - art.anchor.y) * k, `${label} front`).toBeLessThanOrEqual(halfDepth);
        expect(art.width * k).toBeGreaterThan(previousWidth); previousWidth = art.width * k;
        // Rabbit places and wandering zone spread with the painting and stay inside the footprint.
        const layout = habitatArtLayout(art), s = scales[level];
        expect(Math.max(-layout.zone.minX, layout.zone.maxX) * s).toBeLessThan(halfWidth);
        expect(Math.max(-layout.zone.minY, layout.zone.maxY) * s).toBeLessThan(halfDepth);
      }
    }
  });

  it('keeps the Ultra neige paintings inside the current footprints, larger level by level', () => {
    let previousWidth = 0;
    for (const level of LEVELS) {
      const art = habitatArtFor({type: 'neige', level, ultra: true}, level)!, s = ENCLOSURE_SCALE[level], k = s * art.worldWidth / art.width, size = ENCLOSURE_FOOTPRINTS[level];
      const halfWidth = size.width * CELL.x / 2, halfDepth = size.depth * CELL.y / 2;
      expect(art.texture, `level ${level}`).toContain('habitat-glace');
      expect(art.anchor.x * k, `level ${level} left`).toBeLessThanOrEqual(halfWidth);
      expect((art.width - art.anchor.x) * k, `level ${level} right`).toBeLessThanOrEqual(halfWidth);
      expect((art.height - art.anchor.y) * k, `level ${level} front`).toBeLessThanOrEqual(halfDepth);
      expect(art.width * k).toBeGreaterThan(previousWidth); previousWidth = art.width * k;
      const layout = habitatArtLayout(art);
      expect(Math.max(-layout.zone.minX, layout.zone.maxX) * s).toBeLessThan(halfWidth);
      expect(Math.max(-layout.zone.minY, layout.zone.maxY) * s).toBeLessThan(halfDepth);
    }
  });

  it('draws an enclosure with the factor of the era whose footprint it has', () => {
    expect(enclosureScale({})).toBe(1.38); expect(enclosureScale({footprintTier: 2})).toBe(1.4); expect(enclosureScale({footprintTier: 3})).toBe(1.3);
    expect(enclosureScale({footprintTier: 3, formerFootprint: 2})).toBe(1.12); expect(enclosureScale({formerFootprint: 2})).toBe(1.15);
    expect(enclosureScale({footprintTier: 3, formerFootprint: 1})).toBe(1);
    expect(buildingSize({kind: 'enclosure', footprintTier: 2, formerFootprint: 2})).toEqual({width: 8, depth: 5});
    expect(buildingSize({kind: 'enclosure', footprintTier: 2, formerFootprint: 1})).toEqual({width: 6, depth: 5});
  });

  it('starts a new game with a valid 6 × 5 Paille enclosure, and buys new enclosures at 6 × 5', () => {
    const s = crowded(), paille = s.buildings.find(b => b.kind === 'enclosure')!;
    expect(buildingFootprint(paille)).toEqual({x: 4, y: 40, width: 6, height: 5}); expectNothingLost(s, load(encodeGame(s)));
    // Clear of the nest (2–5 × 36–39) and the nursery (10–13 × 36–39).
    for (const other of s.buildings.filter(b => b.kind !== 'enclosure')) expect(overlaps(buildingFootprint(paille), buildingFootprint(other))).toBe(false);
    // 10..15 × 43..47 is free; 12..17 is off the parcel at 6 wide (while a 4-wide farm fits there), and 10..15 × 44..48 too at 5 deep.
    expect(act(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'universal', x: 12, y: 43}, 0)).toMatchObject({ok: false, reason: 'INVALID_CELL'});
    expect(act(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'universal', x: 10, y: 44}, 0)).toMatchObject({ok: false, reason: 'INVALID_CELL'});
    expect(act(s, {type: 'buyBuilding', kind: 'farm', x: 12, y: 44}, 0).ok).toBe(true);
    const bought = act(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'universal', x: 10, y: 43}, 0);
    expect(bought.ok).toBe(true); if (bought.ok) {
      const b = bought.state.buildings.at(-1)!; expect(b.formerFootprint).toBeUndefined(); expect(buildingFootprint(b)).toMatchObject({width: 6, height: 5});
      expect(JSON.parse(encodeGame(bought.state)).enclosureSizes).toBe(3);
    }
  });

  it('grows a new island’s Paille enclosure in place up to level 3 on the starting parcel', () => {
    const l2 = act(crowded(), {type: 'upgradeHabitat', id: 'building-1', fromLevel: 1}, 0, () => .99); if (!l2.ok) throw Error(l2.reason);
    expect(buildingFootprint(l2.state.buildings.find(b => b.id === 'building-1')!)).toEqual({x: 4, y: 40, width: 10, height: 6});
    const l3 = act(l2.state, {type: 'upgradeHabitat', id: 'building-1', fromLevel: 2}, 0, () => .99); if (!l3.ok) throw Error(l3.reason);
    expect(buildingFootprint(l3.state.buildings.find(b => b.id === 'building-1')!)).toEqual({x: 4, y: 40, width: 12, height: 7});
    expectNoOverlap(l3.state);
  });

  it('upgrades an old island’s Paille enclosure (6, 40) to level 3 in place once the next parcel is bought', () => {
    // At (6, 40) a level 3 needs x up to 17: the south parcel (bought second) gives that room; without it, the refusal says why.
    const l2 = act(oldIsland(crowded()), {type: 'upgradeHabitat', id: 'building-1', fromLevel: 1}, 0, () => .99); if (!l2.ok) throw Error(l2.reason);
    expect(buildingFootprint(l2.state.buildings.find(b => b.id === 'building-1')!)).toEqual({x: 6, y: 40, width: 10, height: 6});
    expect(act(l2.state, {type: 'upgradeHabitat', id: 'building-1', fromLevel: 2}, 0)).toMatchObject({ok: false, reason: 'UPGRADE_BLOCKED_LAND'});
    const wider = structuredClone(l2.state); wider.acquiredParcels.push('south');
    const l3 = act(wider, {type: 'upgradeHabitat', id: 'building-1', fromLevel: 2}, 0, () => .99); if (!l3.ok) throw Error(l3.reason);
    expect(buildingFootprint(l3.state.buildings.find(b => b.id === 'building-1')!)).toEqual({x: 6, y: 40, width: 12, height: 7});
  });
});

describe('a v23 save loads without loss', () => {
  it('migrates to v24, keeps every building, rabbit and decoration, and grows an enclosure that has room', () => {
    const s = oldIsland(crowded()); s.rabbits.push({id: 'rabbit-20', species: 'paille', affection: 3, enclosureId: 'building-1'}); s.nextId = 21;
    const loaded = load(asV23Json(s));
    expect(loaded.version).toBe(27); expectNothingLost(s, loaded); expectNoOverlap(loaded);
    const paille = loaded.buildings.find(b => b.id === 'building-1')!;
    // It has room to the right and downwards: it grows where it stands, like an upgrade.
    expect(paille.formerFootprint).toBeUndefined(); expect(buildingFootprint(paille)).toEqual({x: 6, y: 40, width: 6, height: 5});
  });

  it('keeps enclosures packed side by side valid: the ones without room keep their former size, nothing overlaps', () => {
    // Two full rows of four 4 × 4 enclosures across the 16-cell parcel, right against the island edges, under the nest and nursery;
    // the second one of the top row is a compact level 2.
    const s = crowded(); s.buildings = s.buildings.filter(b => b.kind !== 'enclosure');
    for (const [i, x] of [0, 4, 8, 12].entries()) { enclosureAt(s, `building-${10 + i}`, x, 40, i === 1 ? 2 : 1); enclosureAt(s, `building-${20 + i}`, x, 44); }
    s.rabbits = s.rabbits.map(r => ({...r, enclosureId: 'building-11'}));
    for (const [i, home] of ['building-10', 'building-12', 'building-20', 'building-23'].entries()) s.rabbits.push({id: `rabbit-${30 + i}`, species: 'paille', affection: 1, enclosureId: home});
    s.nextId = 40;
    const loaded = load(asV23Json(s));
    expectNothingLost(s, loaded); expectNoOverlap(loaded);
    // A 16-cell row cannot hold four 5-cell (or 6-cell) enclosures, and there is no free place within reach: all stay at 4 × 4,
    // where they were.
    const former = loaded.buildings.filter(b => b.formerFootprint);
    expect(former.length).toBe(8); expect(former.every(b => b.formerFootprint === 1)).toBe(true);
    for (const b of former) expect({x: b.x, y: b.y}).toEqual({x: s.buildings.find(o => o.id === b.id)!.x, y: s.buildings.find(o => o.id === b.id)!.y});
    for (const b of loaded.buildings.filter(item => item.kind === 'enclosure' && !item.formerFootprint)) {
      const was = s.buildings.find(o => o.id === b.id)!;
      expect(Math.abs(b.x - was.x)).toBeLessThanOrEqual(ENCLOSURE_GROWTH_REACH); expect(Math.abs(b.y - was.y)).toBeLessThanOrEqual(ENCLOSURE_GROWTH_REACH);
    }
    // Reading back what was written changes nothing more: same result every time.
    expect(load(encodeGame(loaded))).toEqual(loaded);
  });

  it('slides an enclosure at the island edge inwards rather than over the water, and gives a tier-3 one the largest size that fits', () => {
    const s = crowded(); s.buildings = s.buildings.filter(b => b.kind !== 'enclosure');
    enclosureAt(s, 'building-10', 12, 44); // right and bottom edges of the parcel
    enclosureAt(s, 'building-11', 0, 42, 3, 3); // 8 × 6 against the left and bottom edges
    s.rabbits = s.rabbits.map(r => ({...r, enclosureId: 'building-11'})); s.nextId = 20;
    const loaded = load(asV23Json(s));
    expectNothingLost(s, loaded); expectNoOverlap(loaded);
    for (const b of loaded.buildings.filter(item => item.kind === 'enclosure' && !item.formerFootprint)) {
      const f = buildingFootprint(b); expect(f.x + f.width).toBeLessThanOrEqual(16); expect(f.y + f.height).toBeLessThanOrEqual(48); expect(f.x).toBeGreaterThanOrEqual(0);
    }
    expect(loaded.buildings.find(b => b.id === 'building-10')!.formerFootprint).toBeUndefined();
    expect(buildingFootprint(loaded.buildings.find(b => b.id === 'building-10')!)).toEqual({x: 10, y: 43, width: 6, height: 5});
    // No room left for 12 × 7 beside it: the tier 3 takes the 3 November size (10 × 6), which fits, and keeps that era.
    const big = loaded.buildings.find(b => b.id === 'building-11')!;
    expect(big.formerFootprint).toBe(2); expect(buildingFootprint(big)).toEqual({x: 0, y: 42, width: 10, height: 6}); expect(enclosureScale(big)).toBe(1.12);
  });

  it('never covers a decoration to grow, and grows at a later load once the room is freed', () => {
    const s = crowded(); s.buildings = s.buildings.filter(b => b.kind !== 'enclosure');
    enclosureAt(s, 'building-10', 6, 40); s.rabbits = s.rabbits.map(r => ({...r, enclosureId: 'building-10'})); s.nextId = 20;
    // Bushes all around the 4 × 4: on both sides and just below.
    const bushes = [[5, 40], [10, 40], [5, 43], [10, 43], [6, 44], [9, 44]];
    s.decorations = bushes.map(([x, y], i) => ({id: `decoration-${100 + i}`, catalogId: 'bush', location: {kind: 'outside', x, y, rotation: 0}}));
    s.nextId = 200;
    const loaded = load(asV23Json(s));
    expectNothingLost(s, loaded); expectNoOverlap(loaded);
    const kept = loaded.buildings.find(b => b.id === 'building-10')!;
    expect(kept).toMatchObject({x: 6, y: 40, formerFootprint: 1}); expect(buildingFootprint(kept)).toMatchObject({width: 4, height: 4});
    // The player puts two bushes away: next load, it grows by itself, without moving anything else, to the largest size that
    // fits (5 × 4, the 3 November one: 6 × 5 still meets a bush).
    const freed = structuredClone(loaded); for (const d of [freed.decorations[0], freed.decorations[2]]) d.location = {kind: 'inventory'};
    const later = load(encodeGame(freed)), grown = later.buildings.find(b => b.id === 'building-10')!;
    expect(grown.formerFootprint).toBe(2); expect(buildingFootprint(grown)).toMatchObject({width: 5, height: 4}); expectNoOverlap(later);
    expect(later.decorations).toEqual(freed.decorations);
    // Every bush put away: the next load gives it the current size.
    const cleared = structuredClone(later); for (const d of cleared.decorations) d.location = {kind: 'inventory'};
    const last = load(encodeGame(cleared)), current = last.buildings.find(b => b.id === 'building-10')!;
    expect(current.formerFootprint).toBeUndefined(); expect(buildingFootprint(current)).toMatchObject({width: 6, height: 5}); expectNoOverlap(last);
  });

  it('upgrades an enclosure that kept its former size straight to the enlarged footprint of the next level', () => {
    const s = crowded(); s.buildings = s.buildings.filter(b => b.kind !== 'enclosure');
    const level = requiredHabitatUpgradeLevel('universal', 2); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
    const home = enclosureAt(s, 'building-10', 0, 40); home.formerFootprint = 1; s.rabbits = s.rabbits.map(r => ({...r, enclosureId: 'building-10'}));
    const result = act(s, {type: 'upgradeHabitat', id: 'building-10', fromLevel: 1}, 0, () => .99);
    if (!result.ok) throw Error(result.reason);
    const b = result.state.buildings.find(item => item.id === 'building-10')!;
    expect(b.formerFootprint).toBeUndefined(); expect(buildingFootprint(b)).toEqual({x: 0, y: 40, width: 10, height: 6});
  });

  it('grows nothing twice and moves nothing in a save written by this version', () => {
    const s = crowded(), before = structuredClone(s);
    expect(growFormerEnclosures(s)).toEqual([]); expect(s).toEqual(before);
  });

  it('refuses the former-size mark on anything but an enclosure', () => {
    for (const mark of [true, 1, 2]) {
      const raw = JSON.parse(encodeGame(crowded())); raw.buildings.find((b: {kind: string}) => b.kind === 'nest').formerFootprint = mark;
      expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
    }
  });
});

describe('a save with the 3 November sizes (v24 to v26, and v27 before 6 November) loads without loss', () => {
  /** Enclosures as a client of 3 November placed them: 5 × 4, 8 × 5, 10 × 6, unmarked in its save. */
  const previous = (s: GameState) => { for (const b of s.buildings) if (b.kind === 'enclosure') b.formerFootprint ??= 2; return s; };

  itAll([24, 25, 26, 27] as const)('v%i: keeps every building, rabbit and decoration, and grows an enclosure that has room', version => {
    const s = previous(oldIsland(crowded())); s.rabbits.push({id: 'rabbit-20', species: 'paille', affection: 3, enclosureId: 'building-1'}); s.nextId = 21;
    expect(buildingFootprint(s.buildings.find(b => b.id === 'building-1')!)).toEqual({x: 6, y: 40, width: 5, height: 4});
    const loaded = load(asPreviousSizesJson(s, version));
    expect(loaded.version).toBe(27); expectNothingLost(s, loaded); expectNoOverlap(loaded);
    // It has room to the right and downwards: it grows where it stands.
    const paille = loaded.buildings.find(b => b.id === 'building-1')!;
    expect(paille.formerFootprint).toBeUndefined(); expect(buildingFootprint(paille)).toEqual({x: 6, y: 40, width: 6, height: 5}); expect(enclosureScale(paille)).toBe(1.38);
    // What is written says its era: reading it back changes nothing more.
    expect(JSON.parse(encodeGame(loaded)).enclosureSizes).toBe(3); expect(load(encodeGame(loaded))).toEqual(loaded);
  });

  it('keeps a v24–v27 mark of the first sizes (`true`) as era 1, and an unmarked enclosure as era 2, where none can grow', () => {
    const s = crowded(); s.buildings = s.buildings.filter(b => b.kind !== 'enclosure');
    // Packed so that none of them can grow: a 4 × 4 of era 1 and five 5 × 4 of era 2 across both rows.
    enclosureAt(s, 'building-10', 0, 40).formerFootprint = 1; enclosureAt(s, 'building-11', 4, 40).formerFootprint = 2;
    enclosureAt(s, 'building-12', 9, 40).formerFootprint = 2; enclosureAt(s, 'building-13', 0, 44).formerFootprint = 2;
    enclosureAt(s, 'building-14', 5, 44).formerFootprint = 2; enclosureAt(s, 'building-15', 10, 44).formerFootprint = 2;
    s.rabbits = s.rabbits.map(r => ({...r, enclosureId: 'building-11'})); s.nextId = 20;
    for (const version of [24, 26, 27] as const) {
      const loaded = load(asPreviousSizesJson(s, version));
      expectNothingLost(s, loaded); expectNoOverlap(loaded);
      for (const b of loaded.buildings.filter(item => item.kind === 'enclosure')) {
        const was = s.buildings.find(o => o.id === b.id)!;
        expect({x: b.x, y: b.y, formerFootprint: b.formerFootprint}, b.id).toEqual({x: was.x, y: was.y, formerFootprint: was.formerFootprint});
      }
      expect(enclosureScale(loaded.buildings.find(b => b.id === 'building-11')!)).toBe(1.15);
    }
  });

  it('never covers a decoration or a neighbour to grow, and grows at a later load once there is room', () => {
    const s = crowded(); s.buildings = s.buildings.filter(b => b.kind !== 'enclosure');
    // Two 3 November enclosures side by side under the nest and the nursery (5 + 5 cells of a 16-cell row), bushes below.
    enclosureAt(s, 'building-10', 0, 40).formerFootprint = 2; enclosureAt(s, 'building-11', 5, 40).formerFootprint = 2;
    s.decorations = [[0, 44], [5, 44], [10, 44], [15, 40]].map(([x, y], i) => ({id: `decoration-${100 + i}`, catalogId: 'bush', location: {kind: 'outside', x, y, rotation: 0}}));
    s.rabbits = s.rabbits.map(r => ({...r, enclosureId: 'building-10'})); s.nextId = 200;
    const loaded = load(asPreviousSizesJson(s));
    expectNothingLost(s, loaded); expectNoOverlap(loaded);
    for (const id of ['building-10', 'building-11']) expect(loaded.buildings.find(b => b.id === id)).toMatchObject({x: s.buildings.find(b => b.id === id)!.x, y: 40, formerFootprint: 2});
    // The bushes put away and the right-hand enclosure moved to the far side: both grow at the next load, nothing overlaps.
    const freed = structuredClone(loaded); for (const d of freed.decorations) d.location = {kind: 'inventory'};
    freed.buildings.find(b => b.id === 'building-11')!.x = 10;
    const later = load(encodeGame(freed)); expectNoOverlap(later);
    expect(buildingFootprint(later.buildings.find(b => b.id === 'building-10')!)).toEqual({x: 0, y: 40, width: 6, height: 5});
    expect(buildingFootprint(later.buildings.find(b => b.id === 'building-11')!)).toEqual({x: 10, y: 40, width: 6, height: 5});
    for (const b of later.buildings.filter(item => item.kind === 'enclosure')) expect(b.formerFootprint, b.id).toBeUndefined();
  });

  it('upgrades an enclosure of the 3 November size straight to the current footprint of the next level', () => {
    const s = crowded(); s.buildings = s.buildings.filter(b => b.kind !== 'enclosure');
    const level = requiredHabitatUpgradeLevel('universal', 3); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
    const home = enclosureAt(s, 'building-10', 0, 40, 2, 2); home.formerFootprint = 2; s.rabbits = s.rabbits.map(r => ({...r, enclosureId: 'building-10'}));
    expect(buildingFootprint(home)).toEqual({x: 0, y: 40, width: 8, height: 5});
    const result = act(s, {type: 'upgradeHabitat', id: 'building-10', fromLevel: 2}, 0, () => .99);
    if (!result.ok) throw Error(result.reason);
    const b = result.state.buildings.find(item => item.id === 'building-10')!;
    expect(b.formerFootprint).toBeUndefined(); expect(b.footprintTier).toBe(3); expect(buildingFootprint(b)).toEqual({x: 0, y: 40, width: 12, height: 7});
  });

  it('refuses an unknown era, or the v24 mark, in a save that says its era', () => {
    for (const mark of [true, 3, 0]) {
      const raw = JSON.parse(encodeGame(crowded())); raw.buildings.find((b: {kind: string}) => b.kind === 'enclosure').formerFootprint = mark;
      expect(decodeGame(JSON.stringify(raw)), String(mark)).toEqual({ok: false, reason: 'INVALID_STATE'});
    }
    const raw = JSON.parse(encodeGame(crowded())); raw.enclosureSizes = 2;
    expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
});
