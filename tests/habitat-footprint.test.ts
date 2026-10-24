import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {cumulativeLevelXp, requiredHabitatUpgradeLevel} from '../src/simulation/progression';
import {buildingAt, buildingFootprint, upgradeFootprintReason} from '../src/simulation/placement';
import {habitatFootprint} from '../src/config/habitatSizes';
import {buildingCenter} from '../src/ui/gestures';
import {quoteComplement} from '../src/simulation/actions';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState} from '../src/state/types';

/**
 * Independent expectations. A fresh game owns the south-west parcel (fine cells x 0–15, y 32–47) with the enclosure at
 * (6, 40), the nest at (2, 36) and the nursery at (10, 36), all 4 × 4.
 */
const SIZE = {1: [4, 4], 2: [6, 5], 3: [8, 6]} as const;
const start = (hearts = 50, pattes = 10_000) => {
  const s = createGame(0); s.hearts = hearts; s.pattes = pattes; s.grass = 100;
  const level = requiredHabitatUpgradeLevel('paille', 3); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s;
};
const upgrade = (fromLevel: 1 | 2 | 3) => ({type: 'upgradeHabitat' as const, id: 'building-1', fromLevel});
function run(s: GameState, command: Command) { const r = act(s, command, 0, () => .99); if (!r.ok) throw Error(r.reason); return r.state; }
const enclosure = (s: GameState) => s.buildings.find(b => b.id === 'building-1')!;
const grown = (level: 1 | 2 | 3) => { let s = start(); for (const from of [1, 2] as const) if (from < level) s = run(s, upgrade(from)); return s; };

describe('enclosure footprint tiers', () => {
  it('gives each tier its footprint, anchored at the top-left cell, and the compact 4 × 4 to everything else', () => {
    for (const [tier, [width, height]] of Object.entries(SIZE)) expect(buildingFootprint({x: 6, y: 40, footprintTier: Number(tier)})).toEqual({x: 6, y: 40, width, height});
    expect(buildingFootprint({x: 6, y: 40})).toEqual({x: 6, y: 40, width: 4, height: 4}); expect(habitatFootprint(undefined)).toEqual({width: 4, depth: 4});
    expect(habitatFootprint(7)).toEqual({width: 4, depth: 4});
    const s = grown(3); expect(buildingFootprint(enclosure(s))).toEqual({x: 6, y: 40, width: 8, height: 6});
    for (const other of s.buildings.filter(b => b.kind !== 'enclosure')) expect(buildingFootprint(other)).toEqual({x: other.x, y: other.y, width: 4, height: 4});
  });

  it('centres drawing and residents on the effective footprint, and selects on the whole enlarged area', () => {
    const s = grown(3), center = buildingCenter(enclosure(s)), compact = buildingCenter({x: 6, y: 40});
    expect(center).not.toEqual(compact);
    expect(buildingAt(s, {x: 13, y: 45})?.id).toBe('building-1'); expect(buildingAt(s, {x: 6, y: 40})?.id).toBe('building-1');
    expect(buildingAt(s, {x: 14, y: 40})).toBeUndefined(); expect(buildingAt(s, {x: 13, y: 46})).toBeUndefined();
    expect(buildingAt(grown(1), {x: 13, y: 45})).toBeUndefined();
  });
});

describe('upgrading with room', () => {
  it('changes level, footprint and payment together at each tier, and keeps every resident and position', () => {
    const before = start(), l2 = run(before, upgrade(1)), l3 = run(l2, upgrade(2));
    expect(enclosure(l2)).toMatchObject({x: 6, y: 40, footprintTier: 2, habitat: {type: 'paille', level: 2}}); expect(l2.pattes).toBe(before.pattes - 300); expect(l2.hearts).toBe(before.hearts);
    expect(enclosure(l3)).toMatchObject({x: 6, y: 40, footprintTier: 3, habitat: {type: 'paille', level: 3}}); expect(l3.hearts).toBe(before.hearts - 10); expect(l3.pattes).toBe(l2.pattes);
    expect(l3.rabbits).toEqual(before.rabbits); expect(l3.buildings.filter(b => b.id !== 'building-1')).toEqual(before.buildings.filter(b => b.id !== 'building-1'));
  });

  it('a legacy enclosure at level 2 on the compact footprint acquires the 8 × 6 footprint when it reaches level 3', () => {
    const s = start(); enclosure(s).habitat = {type: 'paille', level: 2};
    const next = run(s, upgrade(2)); expect(enclosure(next)).toMatchObject({footprintTier: 3, habitat: {level: 3}}); expect(next.hearts).toBe(s.hearts - 10);
  });
});

describe('upgrading without room: explicit refusal, no debit, no mutation, nothing moved', () => {
  const blockers: [string, (s: GameState) => GameState, string][] = [
    ['a building', s => { s.buildings.push(emptyBuilding('building-9', 'farm', 10, 40)); s.nextId = 10; return s; }, 'UPGRADE_BLOCKED_BUILDING'],
    ['a decoration', s => run(run(s, {type: 'buyDecoration', catalogId: 'bush'}), {type: 'placeDecoration', id: 'decoration-' + s.nextId, location: {kind: 'outside', x: 10, y: 41, rotation: 0}}), 'UPGRADE_BLOCKED_DECORATION'],
    ['land that is not owned', s => { enclosure(s).x = 12; return s; }, 'UPGRADE_BLOCKED_LAND'],
  ];
  it.each(blockers)('%s in the target footprint', (_name, block, reason) => {
    const s = block(start()), before = structuredClone(s);
    expect(upgradeFootprintReason(s, 'building-1', 2)).toBe(reason);
    expect(act(s, upgrade(1), 0)).toEqual({ok: false, state: before, reason}); expect(s).toEqual(before);
    // The coin complement is refused the same way, and no quote is offered.
    const poor = {...s, pattes: 0}; expect(act(poor, {type: 'payWithHearts', action: upgrade(1), maxHearts: 1000, maxPattes: 0}, 0)).toMatchObject({ok: false, reason});
    expect(quoteComplement(poor, upgrade(1), 0)).toEqual({ok: false, reason});
  });

  it('refuses the level-3 footprint beside a building even with enough hearts, and takes nothing', () => {
    const l2 = grown(2); l2.buildings.push(emptyBuilding('building-9', 'farm', 12, 40)); l2.nextId = 10; const before = structuredClone(l2);
    expect(act(l2, upgrade(2), 0)).toEqual({ok: false, state: before, reason: 'UPGRADE_BLOCKED_BUILDING'});
    expect(l2.hearts).toBe(50);
  });

  it('re-checks at the moment of payment: an obstacle that appeared since the offer blocks it, a cleared one allows it', () => {
    const s = start(), offered = upgradeFootprintReason(s, 'building-1', 2); expect(offered).toBeNull();
    const later = structuredClone(s); later.buildings.push(emptyBuilding('building-9', 'farm', 10, 40)); later.nextId = 10;
    expect(act(later, upgrade(1), 0)).toMatchObject({ok: false, reason: 'UPGRADE_BLOCKED_BUILDING', state: later});
    later.buildings = later.buildings.filter(b => b.id !== 'building-9'); expect(act(later, upgrade(1), 0).ok).toBe(true);
  });

  it('never double-charges, and refuses beyond level 3', () => {
    const l3 = grown(3);
    expect(act(l3, upgrade(2), 0)).toMatchObject({ok: false, reason: 'STALE_ACTION'}); expect(act(l3, upgrade(3), 0)).toMatchObject({ok: false, reason: 'MAX_HABITAT_LEVEL'});
  });
});

describe('collisions and moves between small and large buildings', () => {
  it('refuses a small building inside a large footprint, and a large one onto a small building or off the owned land', () => {
    const s = grown(3);
    expect(act(s, {type: 'buyBuilding', kind: 'farm', x: 12, y: 44}, 0)).toMatchObject({ok: false, reason: 'CELL_OCCUPIED'});
    expect(act(s, {type: 'moveBuilding', id: 'building-1', x: 2, y: 36}, 0)).toMatchObject({ok: false, reason: 'CELL_OCCUPIED'});
    expect(act(s, {type: 'moveBuilding', id: 'building-1', x: 10, y: 40}, 0)).toMatchObject({ok: false, reason: 'INVALID_CELL'});
    // The small nursery may not move onto the big one either (checked both ways).
    expect(act(s, {type: 'moveBuilding', id: 'building-5', x: 8, y: 41}, 0)).toMatchObject({ok: false, reason: 'CELL_OCCUPIED'});
  });

  it('moves a large enclosure to free ground with its footprint, level and residents intact, and lets the old place be used', () => {
    const s = grown(3), moved = run(s, {type: 'moveBuilding', id: 'building-1', x: 0, y: 40});
    expect(enclosure(moved)).toMatchObject({x: 0, y: 40, footprintTier: 3, habitat: {level: 3}}); expect(moved.rabbits).toEqual(s.rabbits);
    expect(act(moved, {type: 'moveBuilding', id: 'building-5', x: 8, y: 41}, 0).ok).toBe(true);
  });

  it('keeps decorations out of the enlarged footprint, and the enlarged footprint out of decorations', () => {
    const s = grown(3), inside = act(run(s, {type: 'buyDecoration', catalogId: 'bush'}), {type: 'placeDecoration', id: 'decoration-' + s.nextId, location: {kind: 'outside', x: 13, y: 45, rotation: 0}}, 0);
    expect(inside.ok).toBe(false);
  });
});

describe('saves: footprint tiers, and older games untouched', () => {
  it('writes and reads the tier of each enclosure exactly', () => {
    const s = grown(3), json = encodeGame(s); expect(JSON.parse(json).version).toBe(16);
    expect(JSON.parse(json).buildings.find((b: {id: string}) => b.id === 'building-1').footprintTier).toBe(3);
    expect(decodeGame(json)).toEqual({ok: true, state: s});
    const compact = encodeGame(grown(1)); expect(compact).not.toContain('footprintTier');
  });

  it('keeps a compact high-level enclosure as it is: levels and capacities kept, residents and places kept, 4 × 4 everywhere, no debit, no growth', () => {
    // Enclosures at level 2 and 3 packed against their neighbours on the compact footprint, with no stored tier.
    const old = start(); enclosure(old).habitat = {type: 'paille', level: 3};
    old.buildings.push({...emptyBuilding('building-9', 'enclosure', 10, 40, 'universal'), habitat: {type: 'universal', level: 2}}); old.nextId = 10;
    const decoded = decodeGame(encodeGame(old));
    if (!decoded.ok) throw Error(decoded.reason);
    expect(decoded.state.version).toBe(16);
    for (const key of ['buildings', 'rabbits', 'decorations', 'acquiredParcels', 'pattes', 'grass', 'hearts', 'discovered', 'nextId'] as const) expect(decoded.state[key], key).toEqual(old[key]);
    for (const b of decoded.state.buildings) { expect('footprintTier' in b).toBe(false); expect(buildingFootprint(b)).toMatchObject({width: 4, height: 4}); }
    expect(decoded.state.pattes).toBe(old.pattes); expect(decoded.state.hearts).toBe(old.hearts);
    // Reloading what was written changes nothing: no automatic enlargement.
    expect(decodeGame(encodeGame(decoded.state))).toEqual({ok: true, state: decoded.state});
    // And such an old enclosure cannot be enlarged by catching up: it is already at the top level.
    expect(act(decoded.state, upgrade(3), 0)).toMatchObject({ok: false, reason: 'MAX_HABITAT_LEVEL'});
  });

  it('rejects impossible tiers: above the level, on another building, or with an overlapping enlarged footprint', () => {
    const base = JSON.parse(encodeGame(grown(2)));
    const bad = (mutate: (json: {buildings: {id: string; footprintTier?: number}[]}) => void) => { const copy = structuredClone(base); mutate(copy); return decodeGame(JSON.stringify(copy)); };
    expect(bad(json => { json.buildings.find(b => b.id === 'building-1')!.footprintTier = 3; })).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(bad(json => { json.buildings.find(b => b.id === 'building-4')!.footprintTier = 1; })).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(bad(json => { json.buildings.find(b => b.id === 'building-1')!.footprintTier = 4; })).toEqual({ok: false, reason: 'INVALID_STATE'});
    const crowded = structuredClone(base); crowded.buildings.push({...structuredClone(crowded.buildings[0]), id: 'building-9', x: 10, y: 40, footprintTier: undefined, habitat: {type: 'universal', level: 1}}); crowded.nextId = 10;
    expect(decodeGame(JSON.stringify(crowded))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
});
