import {describe, expect, it} from 'vitest';
import {ENCLOSURE_FOOTPRINTS, ENCLOSURE_SCALE, HABITAT_SIZE_PROPOSAL, buildingSize, enclosureScale} from '../src/config/habitatSizes';
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
import {asV23Json} from './v23-save-fixture';

const LEVELS = [1, 2, 3] as const;
const CELL = {x: ISLAND.cellWidth / FINE_GRID, y: ISLAND.cellDepth / FINE_GRID};
const area = (size: {width: number; depth: number}) => size.width * size.depth;

/** A fresh game owns the south-west parcel only: fine cells x 0–15, y 32–47. Nest (2, 36), nursery (10, 36), Paille (6, 40). */
function crowded(): GameState {
  const s = createGame(0); s.pattes = 10_000; s.hearts = 50; s.grass = 100;
  const level = requiredHabitatUpgradeLevel('paille', 3); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  return s;
}
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
  it('grows each level by a quarter to a third of ground, and keeps level 3 > level 2 > level 1', () => {
    expect(ENCLOSURE_FOOTPRINTS).toEqual({1: {width: 5, depth: 4}, 2: {width: 8, depth: 5}, 3: {width: 10, depth: 6}});
    for (const level of LEVELS) {
      const growth = area(ENCLOSURE_FOOTPRINTS[level]) / area(HABITAT_SIZE_PROPOSAL[level].footprint);
      expect(growth).toBeGreaterThanOrEqual(1.25); expect(growth).toBeLessThanOrEqual(1.34);
      expect(ENCLOSURE_SCALE[level] ** 2).toBeGreaterThanOrEqual(1.25); // drawn area
    }
    expect(area(ENCLOSURE_FOOTPRINTS[2])).toBeGreaterThan(area(ENCLOSURE_FOOTPRINTS[1]));
    expect(area(ENCLOSURE_FOOTPRINTS[3])).toBeGreaterThan(area(ENCLOSURE_FOOTPRINTS[2]));
    // Other buildings keep 4 × 4.
    for (const kind of ['farm', 'nest', 'nursery', 'kitchen', 'statue', 'agency', 'salon', 'forest'] as const) expect(buildingSize({kind})).toEqual({width: 4, depth: 4});
  });

  it('shows every painting larger with one uniform factor, its front and sides inside the new footprint, larger level by level', () => {
    for (const type of HABITAT_TYPES) {
      let previousWidth = 0;
      for (const level of LEVELS) {
        const art = habitatArtFor({type, level}, level)!; expect(art, `${type} ${level}`).not.toBeNull();
        const k = ENCLOSURE_SCALE[level] * art.worldWidth / art.width, size = ENCLOSURE_FOOTPRINTS[level];
        const halfWidth = size.width * CELL.x / 2, halfDepth = size.depth * CELL.y / 2;
        expect(art.anchor.x * k, `${type} ${level} left`).toBeLessThanOrEqual(halfWidth);
        expect((art.width - art.anchor.x) * k, `${type} ${level} right`).toBeLessThanOrEqual(halfWidth);
        expect((art.height - art.anchor.y) * k, `${type} ${level} front`).toBeLessThanOrEqual(halfDepth);
        expect(art.width * k).toBeGreaterThan(previousWidth); previousWidth = art.width * k;
        // Rabbit places and wandering zone spread with the painting and stay inside the footprint.
        const layout = habitatArtLayout(art), s = ENCLOSURE_SCALE[level];
        expect(Math.max(-layout.zone.minX, layout.zone.maxX) * s).toBeLessThan(halfWidth);
        expect(Math.max(-layout.zone.minY, layout.zone.maxY) * s).toBeLessThan(halfDepth);
      }
    }
  });

  it('scales an enclosure only once it has its enlarged footprint', () => {
    expect(enclosureScale({})).toBe(1.15); expect(enclosureScale({footprintTier: 3})).toBe(1.12); expect(enclosureScale({footprintTier: 3, formerFootprint: true})).toBe(1);
  });

  it('starts a new game with a valid 5 × 4 Paille enclosure, and buys new enclosures at 5 × 4', () => {
    const s = crowded(), paille = s.buildings.find(b => b.kind === 'enclosure')!;
    expect(buildingFootprint(paille)).toEqual({x: 6, y: 40, width: 5, height: 4}); expectNothingLost(s, load(encodeGame(s)));
    // 0..4 × 44..47 is free, 12..16 is off the parcel at 5 wide (while a 4-wide farm fits there).
    expect(act(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'universal', x: 12, y: 44}, 0)).toMatchObject({ok: false, reason: 'INVALID_CELL'});
    expect(act(s, {type: 'buyBuilding', kind: 'farm', x: 12, y: 44}, 0).ok).toBe(true);
    const bought = act(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'universal', x: 0, y: 44}, 0);
    expect(bought.ok).toBe(true); if (bought.ok) expect(buildingFootprint(bought.state.buildings.at(-1)!)).toMatchObject({width: 5, height: 4});
  });
});

describe('a v23 save loads without loss', () => {
  it('migrates to v24, keeps every building, rabbit and decoration, and grows an enclosure that has room', () => {
    const s = crowded(); s.rabbits.push({id: 'rabbit-20', species: 'paille', affection: 3, enclosureId: 'building-1'}); s.nextId = 21;
    const loaded = load(asV23Json(s));
    expect(loaded.version).toBe(25); expectNothingLost(s, loaded); expectNoOverlap(loaded);
    const paille = loaded.buildings.find(b => b.id === 'building-1')!;
    expect(paille.formerFootprint).toBeUndefined(); expect(buildingFootprint(paille)).toEqual({x: 6, y: 40, width: 5, height: 4});
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
    // A 16-cell row cannot hold four 5-cell enclosures, and there is no free place within reach: all stay at 4 × 4, where they were.
    const former = loaded.buildings.filter(b => b.formerFootprint);
    expect(former.length).toBe(8);
    for (const b of former) expect({x: b.x, y: b.y}).toEqual({x: s.buildings.find(o => o.id === b.id)!.x, y: s.buildings.find(o => o.id === b.id)!.y});
    for (const b of loaded.buildings.filter(item => item.kind === 'enclosure' && !item.formerFootprint)) {
      const was = s.buildings.find(o => o.id === b.id)!;
      expect(Math.abs(b.x - was.x)).toBeLessThanOrEqual(ENCLOSURE_GROWTH_REACH); expect(Math.abs(b.y - was.y)).toBeLessThanOrEqual(ENCLOSURE_GROWTH_REACH);
    }
    // Reading back what was written changes nothing more: same result every time.
    expect(load(encodeGame(loaded))).toEqual(loaded);
  });

  it('slides an enclosure at the island edge inwards rather than over the water, and keeps a tier-3 one valid', () => {
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
    expect(buildingFootprint(loaded.buildings.find(b => b.id === 'building-10')!)).toEqual({x: 11, y: 44, width: 5, height: 4});
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
    expect(kept).toMatchObject({x: 6, y: 40, formerFootprint: true}); expect(buildingFootprint(kept)).toMatchObject({width: 4, height: 4});
    // The player puts two bushes away: next load, it grows by itself, without moving anything else.
    const freed = structuredClone(loaded); for (const d of [freed.decorations[0], freed.decorations[2]]) d.location = {kind: 'inventory'};
    const later = load(encodeGame(freed)), grown = later.buildings.find(b => b.id === 'building-10')!;
    expect(grown.formerFootprint).toBeUndefined(); expect(buildingFootprint(grown)).toMatchObject({width: 5, height: 4}); expectNoOverlap(later);
    expect(later.decorations).toEqual(freed.decorations);
  });

  it('upgrades an enclosure that kept its former size straight to the enlarged footprint of the next level', () => {
    const s = crowded(); s.buildings = s.buildings.filter(b => b.kind !== 'enclosure');
    const level = requiredHabitatUpgradeLevel('universal', 2); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
    const home = enclosureAt(s, 'building-10', 0, 40); home.formerFootprint = true; s.rabbits = s.rabbits.map(r => ({...r, enclosureId: 'building-10'}));
    const result = act(s, {type: 'upgradeHabitat', id: 'building-10', fromLevel: 1}, 0, () => .99);
    if (!result.ok) throw Error(result.reason);
    const b = result.state.buildings.find(item => item.id === 'building-10')!;
    expect(b.formerFootprint).toBeUndefined(); expect(buildingFootprint(b)).toEqual({x: 0, y: 40, width: 8, height: 5});
  });

  it('grows nothing twice and moves nothing in a save written by this version', () => {
    const s = crowded(), before = structuredClone(s);
    expect(growFormerEnclosures(s)).toEqual([]); expect(s).toEqual(before);
  });

  it('refuses the former-size mark on anything but an enclosure', () => {
    const raw = JSON.parse(encodeGame(crowded())); raw.buildings.find((b: {kind: string}) => b.kind === 'nest').formerFootprint = true;
    expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
});
