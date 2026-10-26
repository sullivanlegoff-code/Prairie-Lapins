import {cumulativeLevelXp,requiredExtensionLevel,requiredDecorationLevel} from '../src/simulation/progression';
import {regressionStart as createGame} from './regression-start';
import {describe, expect, it, vi} from 'vitest';
import {act, advance,  decodeGame, encodeGame} from '../src/simulation';
import {DECORATIONS, DECORATION_IDS, DECORATION_RESALE_RATE, decorationResalePrice, MAX_DECORATIONS, type DecorationId} from '../src/config/decorations';
import {decorationsInCell, footprint} from '../src/simulation/decorations';
import type {Command, DecorationLocation, GameState} from '../src/state/types';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {DECORATIONS_PREVIEW_PREFIX, developmentEnvironment, TEST_PREFIX} from '../src/dev/tools';
import {scenarioState} from '../src/dev/scenarios';
import {HOUR} from '../src/config/balance';

import {toV11} from './island-remap';
function rich() {const s = createGame(0);const level=Math.max(...DECORATION_IDS.map(id=>requiredDecorationLevel(id)));s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level}; s.pattes = 100_000; s.hearts = 1000; return s;}
function run(s: GameState, command: Command) {const r = act(s, command, s.lastSimulatedAt); if (!r.ok) throw Error(r.reason); return r.state;}
function buy(s: GameState, catalogId: DecorationId = 'bush') {return run(s, {type: 'buyDecoration', catalogId});}
function pose(s: GameState, location: DecorationLocation, id = s.decorations.at(-1)!.id) {return run(s, {type: 'placeDecoration', id, location});}
// Former strip coordinates → v10 fine cell → v11 fine cell (same arrangement, enlarged parcels).
const outside = (x = 4, y = 0, rotation: 0 | 1 = 0): DecorationLocation => ({kind: 'outside', x:toV11(x<24?x+12:x-24,'x'), y:toV11(y+12,'y'), rotation});
function refused(s: GameState, command: Command, reason: string) {
  const before = structuredClone(s), r = act(s, command, s.lastSimulatedAt);
  expect(r).toEqual({ok: false, state: before, reason}); expect(s).toEqual(before);
}
function memory(raw?: string) {
  const values = new Map<string, string>(raw ? [[SAVE_KEY, raw]] : []), fail = {key: ''};
  const reads: string[] = [], writes: string[] = [];
  const storage: SaveStorage = {getItem: key => {reads.push(key); return values.get(key) ?? null;}, setItem: (key, value) => {writes.push(key); if (key === fail.key) throw Error('quota'); values.set(key, value);}};
  return {values, storage, fail, reads, writes};
}

describe('decoration ownership and atomic commands', () => {
  it('buys and places atomically, records the pose, and rejects occupied or changed destinations without payment', () => {
    const s=rich(), location={kind:'outside' as const,x:25,y:23,rotation:0 as const};
    const result=act(s,{type:'buyDecoration',catalogId:'bush',location},0);
    expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.state.pattes).toBe(s.pattes-20);expect(result.state.decorations).toHaveLength(1);
    expect(result.state.decorations[0].location).toEqual(location);expect(result.state.missions.events.placeDecoration).toBe(1);
    refused(result.state,{type:'buyDecoration',catalogId:'bush',location},'DECORATION_OVERLAP');
    refused(s,{type:'buyDecoration',catalogId:'bush',location:{...location,x:18,y:20}},'CELL_OCCUPIED');
    refused(s,{type:'buyDecoration',catalogId:'bush',location:{...location,x:32}},'INVALID_CELL');
    const poor={...s,pattes:19};refused(poor,{type:'buyDecoration',catalogId:'bush',location},'NOT_ENOUGH_PATTES');
    expect(decodeGame(encodeGame(result.state))).toEqual({ok:true,state:result.state});
  });
  it('rolls back purchases when saving fails, then commits one copy on retry', () => {
    const m=memory(encodeGame(rich())),c=new GameController(m.storage,()=>0), before=c.getSnapshot().state!;
    m.fail.key=SAVE_KEY;
    expect(c.perform({type:'buyDecoration',catalogId:'bush',location:{kind:'outside',x:25,y:23,rotation:0}})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});
    expect(c.getSnapshot().state).toEqual(before);
    m.fail.key='';expect(c.perform({type:'buyDecoration',catalogId:'bush',location:{kind:'outside',x:25,y:23,rotation:0}}).ok).toBe(true);
    const loaded=new GameController(m.storage,()=>0);expect(loaded.getSnapshot().state!.decorations).toHaveLength(1);c.dispose();loaded.dispose();
  });
  it.each(DECORATION_IDS)('buys %s at its configured currency price without bonuses or birth RNG', id => {
    const s = rich(), rng = vi.fn(() => {throw Error('No birth draw');}), r = act(s, {type: 'buyDecoration', catalogId: id}, 0, rng);
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state).toEqual({...s, pattes: s.pattes - (DECORATIONS[id].heartPrice ? 0 : DECORATIONS[id].price), hearts: s.hearts - (DECORATIONS[id].heartPrice ?? 0), nextId: 5, decorations: [{id: 'decoration-4', catalogId: id, ...(DECORATIONS[id].heartPrice ? {paidHearts: DECORATIONS[id].heartPrice} : {paidPrice: DECORATIONS[id].price}), location: {kind: 'inventory'}, placementXpProcessed: false}]});
    expect(r.value).toBe('decoration-4'); expect(rng).not.toHaveBeenCalled(); expect(s.decorations).toEqual([]);
    expect(decodeGame(encodeGame(r.state))).toEqual({ok: true, state: r.state});
  });
  it('permits separate copies, spends nothing on insufficiency, and never offers a hearts payment', () => {
    let s = buy(buy(rich())); expect(s.decorations.map(d => d.id)).toEqual(['decoration-4', 'decoration-5']);
    s.pattes = 19; refused(s, {type: 'buyDecoration', catalogId: 'bush'}, 'NOT_ENOUGH_PATTES');
    refused(s, {type: 'payWithHearts', action: {type: 'buyDecoration', catalogId: 'bush'}, maxHearts: 99, maxPattes: 99} as unknown as Command, 'INVALID_CHOICE');
    refused(s, {type: 'buyDecoration', catalogId: 'missing' as DecorationId}, 'INVALID_CHOICE');
  });
  it('bounds inventories without deleting old exemplars', () => {
    const s = rich(); s.decorations = Array.from({length: MAX_DECORATIONS}, (_, i) => ({id: `decoration-${i + 4}`, catalogId: 'bush', location: {kind: 'inventory'}})); s.nextId = MAX_DECORATIONS + 4;
    expect(decodeGame(encodeGame(s)).ok).toBe(true); refused(s, {type: 'buyDecoration', catalogId: 'bush'}, 'DECORATION_LIMIT');
  });
  it('stores and re-places the same exemplar for free, without duplication', () => {
    let s = pose(buy(rich()), outside()), original = structuredClone(s);
    s = pose(s, outside(6, 2)); expect(s.decorations).toHaveLength(1); expect(s.decorations[0].id).toBe(original.decorations[0].id);
    s = pose(s, {kind: 'inventory'}); s = pose(s, outside(5, 3));
    expect(s.pattes).toBe(original.pattes); expect(s.nextId).toBe(original.nextId); expect(s.decorations).toHaveLength(1);
  });
  it.each([outside(-1, 0), outside(12, 0), outside(4, 12), outside(4.5, 0)])('refuses exterior outside the unlocked fine grid: %j', location => {
    const s = buy(rich()); refused(s, {type: 'placeDecoration', id: 'decoration-4', location}, 'INVALID_CELL');
  });
  it('refuses building footprints and other objects but allows crossing two free logical cells', () => {
    let s = buy(rich()); refused(s, {type: 'placeDecoration', id: 'decoration-4', location: outside(1, 1)}, 'CELL_OCCUPIED');
    s = pose(s, outside(4, 0)); s = buy(s); refused(s, {type: 'placeDecoration', id: 'decoration-5', location: outside(4, 0)}, 'DECORATION_OVERLAP');
    s = buy(s, 'large-bookcase'); s = pose(s, {kind: 'outside', x: 27, y: 22, rotation: 0});
    expect(decorationsInCell(s, 6, 5)).toContain('decoration-6'); expect(decorationsInCell(s, 7, 5)).toEqual(['decoration-6']);
  });
  it.each(['large-bookcase', 'birthday-candle'] as const)('refuses rotation of %s and validates its complete fixed footprint at parcel edges', catalogId => {
    let s = buy(rich(), catalogId);
    expect(footprint(catalogId, 0)).toEqual({width: 2, height: DECORATIONS[catalogId].height});
    const edge = {kind: 'outside', x: 31, y: 16, rotation: 0} as const;
    refused(s, {type: 'placeDecoration', id: 'decoration-4', location: edge}, 'INVALID_CELL');
    refused(s, {type: 'placeDecoration', id: 'decoration-4', location: {...edge,rotation:1}}, 'INVALID_CHOICE');
    s = run(s, {type:'expand',parcelId:'east',expectedCost:600});s=pose(s,edge);
    expect(s.decorations[0].location).toEqual(edge);
    expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
  });
  it('refuses arbitrary rotations and exterior/interior mix-ups', () => {
    let s = buy(rich()); refused(s, {type: 'placeDecoration', id: 'decoration-4', location: outside(4, 0, 1)}, 'INVALID_CHOICE');
    refused(s, {type: 'placeDecoration', id: 'decoration-4', location: {kind: 'habitat', habitatId: 'building-1', slot: 0} as unknown as import('../src/state/types').DecorationLocation}, 'INVALID_CHOICE');
    s = pose(buy(s, 'bunny-slippers'), outside(5, 0));
  });
  it('blocks both buying and moving buildings before payment and stores blockers only on an explicit command', () => {
    let s = pose(buy(rich(), 'large-bookcase'), outside(7, 2));
    refused(s, {type: 'buyBuilding', kind: 'farm', x: 22, y: 20}, 'DECORATION_BLOCKS_BUILDING');
    refused(s, {type: 'moveBuilding', id: 'building-1', x: 26, y: 20}, 'DECORATION_BLOCKS_BUILDING');
    const original = structuredClone(s); s = run(s, {type: 'storeDecorationsInCell', x: 6, y: 5});
    expect(s.pattes).toBe(original.pattes); expect(s.buildings).toEqual(original.buildings); expect(s.decorations[0].location).toEqual({kind: 'inventory'});
    expect(run(s, {type: 'buyBuilding', kind: 'farm', x: 22, y: 20}).buildings).toHaveLength(2);
  });
  it('unlocks 12×8, 24×8 and 36×8 while keeping building coordinates unchanged', () => {
    let s = buy(rich());const level=requiredExtensionLevel(2);s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level}; refused(s, {type: 'placeDecoration', id: 'decoration-4', location: outside(12, 0)}, 'INVALID_CELL');
    s = run(s, {type:'expand',parcelId:'east',expectedCost:600}); s = pose(s, outside(23, 7));
    refused(s, {type: 'placeDecoration', id: 'decoration-4', location: outside(24, 0)}, 'INVALID_CELL');
    s = run(s, {type:'expand',parcelId:'west',expectedCost:1800}); s = pose(s, outside(35, 7)); expect(s.buildings[0]).toMatchObject({x: 18, y: 20});
  });
  it('leaves income, affection, gifts, missions and birth RNG behavior unchanged', () => {
    let plain = rich(); plain.grass = 100; plain = run(plain, {type: 'feed', id: 'rabbit-2'}); plain = run(plain, {type: 'feed', id: 'rabbit-3'});
    plain = run(plain, {type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20}); plain = run(plain, {type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20});
    const decorated = pose(buy(plain), outside(1, 6));
    expect(advance(decorated, HOUR).buildings).toEqual(advance(plain, HOUR).buildings); expect(decorated.missions.daily).toEqual(plain.missions.daily);expect(decorated.missions.events.placeDecoration).toBe(1);expect(decorated.missions.completed).toContain('first-decoration');
    const a = vi.fn(() => .57), b = vi.fn(() => .57), command: Command = {type: 'breed', parents: ['rabbit-2', 'rabbit-3']};
    const x = act(plain, command, 0, a), y = act(decorated, command, 0, b); expect(a).toHaveBeenCalledTimes(1); expect(b).toHaveBeenCalledTimes(1);
    if (!x.ok || !y.ok) throw Error('Breeding failed');
    const birth = (s: GameState) => {const {id: _id, ...fields} = s.buildings.find(b => b.kind === 'nest')!.breeding!.birth; return fields;};
    expect(birth(x.state)).toEqual(birth(y.state)); expect(x.state.pityFailures).toBe(y.state.pityFailures); expect(x.state.hearts).toBe(y.state.hearts);
  });
});

describe('saves and four-route boundaries', () => {
  it.each(['decorationDemo', 'decoratedHabitat', 'decorationDense'] as const)('validates and restores the prepared %s scenario', id => {
    const s = scenarioState(id, 0); const placed = s.decorations.filter(d => d.location.kind !== 'inventory');
    expect(new Set(placed.map(d => d.catalogId))).toEqual(new Set(DECORATION_IDS));
    if (id === 'decorationDense') {expect(s.decorations).toHaveLength(MAX_DECORATIONS); expect(placed.length).toBeGreaterThan(100);}
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
    if (id === 'decoratedHabitat' || id === 'decorationDense') expect(s.rabbits.filter(r => r.enclosureId === 'building-1')).toHaveLength(7);
    const m = memory(encodeGame(s)), c = new GameController(m.storage, () => 0), exported = c.exportGame();
    if (!exported.ok) throw Error(exported.reason); expect(JSON.parse(exported.json).version).toBe(19);
    expect(c.restart(true).ok).toBe(true); const p = c.prepareImport(exported.json); if (!p.ok) throw Error(p.reason);
    expect(c.confirmImport(p.token, true).ok).toBe(true); expect(new GameController(m.storage, () => 0).getSnapshot().state).toEqual(s);
  }, 20000);
  it.each(['duplicate', 'catalog', 'next-id', 'overlap', 'bounds', 'building', 'rotation', 'missing-home', 'slot', 'slot-overlap', 'quantity', 'extra-location'] as const)('rejects malformed %s imports without replacing the current save', fault => {
    const s = pose(buy(rich()), outside());
    if (fault === 'duplicate') s.decorations.push(structuredClone(s.decorations[0]));
    if (fault === 'catalog') s.decorations[0].catalogId = 'bad-id' as DecorationId;
    if (fault === 'next-id') s.nextId = 4;
    if (fault === 'overlap') {s.decorations.push({...s.decorations[0], id: 'decoration-5'}); s.nextId = 6;}
    if (fault === 'bounds') s.decorations[0].location = outside(40, 30);
    if (fault === 'building') s.decorations[0].location = outside(0, 0);
    if (fault === 'rotation') s.decorations[0].location = outside(4, 0, 1);

    if (['missing-home', 'slot', 'slot-overlap'].includes(fault)) {s.decorations[0].catalogId = 'bunny-slippers'; s.decorations[0].location = {kind: 'habitat', habitatId: fault === 'missing-home' ? 'building-999' : 'building-1', slot: fault === 'slot' ? 3 : 0} as unknown as import('../src/state/types').DecorationLocation;}
    if (fault === 'slot-overlap') {s.decorations.push({...s.decorations[0], id: 'decoration-5'}); s.nextId = 6;}
    if (fault === 'quantity') {s.decorations = Array.from({length: 513}, (_, i) => ({id: `decoration-${i + 4}`, catalogId: 'bush', location: {kind: 'inventory'}})); s.nextId = 517;}
    if (fault === 'extra-location') Object.assign(s.decorations[0].location, {habitatId: 'building-1'});
    const m = memory(), c = new GameController(m.storage, () => 0), before = m.values.get(SAVE_KEY);
    expect(c.prepareImport(JSON.stringify(s))).toEqual({ok: false, reason: 'INVALID_STATE'}); expect(m.values.get(SAVE_KEY)).toBe(before);
  });
  it('prefixes every preview access, including clock, resource tools and resets, preserving three other routes', () => {
    const current = encodeGame(createGame(0)), m = memory(current); m.values.set(TEST_PREFIX + SAVE_KEY, 'laboratory-marker'); m.values.set('prairie-lapins.preview.accounts.' + SAVE_KEY, 'accounts-marker'); m.values.set('prairie-lapins.ui.v1', 'normal-prefs'); m.values.set('prairie-lapins.backup.before-v4', 'normal-backup');
    const original = new Map(m.values), env = developmentEnvironment(m.storage, {decorationPreview: true}), c = new GameController(env.storage, () => 0);
    expect(env.preferenceKey).toBe(DECORATIONS_PREVIEW_PREFIX + 'ui'); expect(env.policy.onlineServicesAllowed).toBe(false);
    const p = c.prepareImport(current); if (!p.ok) throw Error(p.reason); expect(c.confirmImport(p.token, true).ok).toBe(true);
    expect(env.grant(c, 'pattes', 1000).ok).toBe(true); expect(env.advanceTime(c, 60).ok).toBe(true); expect(env.loadScenario(c, 'decoratedHabitat').ok).toBe(true); expect(c.restart(true).ok).toBe(true);
    for (const [key, value] of original) expect(m.values.get(key)).toBe(value);
    expect(m.reads.every(key => key.startsWith(DECORATIONS_PREVIEW_PREFIX))).toBe(true); expect(m.writes.every(key => key.startsWith(DECORATIONS_PREVIEW_PREFIX))).toBe(true);
  });
});

describe('atomic decoration resale', () => {
  it.each(DECORATION_IDS)('sells exactly one inventory %s with the configured pattes refund only', catalogId => {
    const s = buy(buy(rich(), catalogId), catalogId), before = structuredClone(s);
    if (DECORATIONS[catalogId].heartPrice) { refused(s, {type: 'sellDecoration', id: s.decorations[0].id}, 'INVALID_CHOICE'); expect(s).toEqual(before); return; }
    const sold = run(s, {type: 'sellDecoration', id: s.decorations[0].id});
    expect(sold).toEqual({...before, pattes: before.pattes + decorationResalePrice(catalogId), decorations: [before.decorations[1]]});
    expect(s).toEqual(before);
    expect(decodeGame(encodeGame(sold))).toEqual({ok: true, state: sold});
    refused(sold, {type: 'sellDecoration', id: before.decorations[0].id}, 'NOT_FOUND');
  });
  it('floors the central rate, including an odd purchase price', () => {
    expect(DECORATION_RESALE_RATE).toBe(.5);
    const price = DECORATIONS.bush.price;
    try {DECORATIONS.bush.price = 21; expect(decorationResalePrice('bush')).toBe(10);}
    finally {DECORATIONS.bush.price = price;}
  });
  it.each([outside(), outside(5,1)] as DecorationLocation[])('frees the placed destination %j without changing rabbits or buildings', location => {
    const catalogId = location.kind === 'outside' ? 'bush' : 'bunny-slippers';
    const s = pose(buy(buy(rich(), catalogId), catalogId), location, 'decoration-4');
    const sold = run(s, {type: 'sellDecoration', id: 'decoration-4'});
    expect(sold.decorations).toEqual([s.decorations[1]]);
    expect(pose(sold, location, 'decoration-5').decorations[0].location).toEqual(location);
    expect(sold.buildings).toEqual(s.buildings); expect(sold.rabbits).toEqual(s.rabbits);
  });
  it('refuses absent exemplars, other entity IDs, overflow and hearts wrappers atomically', () => {
    const s = buy(rich(), 'large-bookcase');
    for (const id of ['missing', 'building-1', 'rabbit-2']) refused(s, {type: 'sellDecoration', id}, 'NOT_FOUND');
    refused(s, {type: 'payWithHearts', action: {type: 'sellDecoration', id: 'decoration-4'}, maxHearts: 99, maxPattes: 99} as unknown as Command, 'INVALID_CHOICE');
    s.pattes = Number.MAX_SAFE_INTEGER - (decorationResalePrice('large-bookcase') - 1);
    refused(s, {type: 'sellDecoration', id: 'decoration-4'}, 'RESOURCE_LIMIT');
    s.pattes--; expect(run(s, {type: 'sellDecoration', id: 'decoration-4'}).pattes).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('saves the entire sale once and a second controller reloads the same result', () => {
    const s = pose(buy(rich(), 'large-bookcase'), outside()), m = memory(encodeGame(s)), c = new GameController(m.storage, () => 0);
    m.writes.length = 0;
    expect(c.perform({type: 'sellDecoration', id: 'decoration-4'}).ok).toBe(true);
    const result = c.getSnapshot().state!;
    expect(result.pattes).toBe(s.pattes + decorationResalePrice('large-bookcase')); expect(result.decorations).toEqual([]);
    expect(m.writes).toEqual([SAVE_KEY]);
    expect(c.perform({type: 'sellDecoration', id: 'decoration-4'}).ok).toBe(false);
    expect(m.writes).toEqual([SAVE_KEY]); expect(c.getSnapshot().state).toEqual(result);
    expect(new GameController(m.storage, () => 0).getSnapshot().state).toEqual(result);
  });
  it.each(['quota', 'conflict', 'read'] as const)('keeps both object and payment on %s save refusal, and retries cannot replay a sale', fault => {
    const s = pose(buy(rich(), 'large-bookcase'), outside()), m = memory(encodeGame(s)), c = new GameController(m.storage, () => 0), raw = m.values.get(SAVE_KEY)!;
    if (fault === 'quota') m.fail.key = SAVE_KEY;
    if (fault === 'conflict') m.values.set(SAVE_KEY, encodeGame({...s, grass: s.grass + 1}));
    const spy = fault === 'read' ? vi.spyOn(m.storage, 'getItem').mockImplementation(() => {throw Error('read');}) : null;
    expect(c.perform({type: 'sellDecoration', id: 'decoration-4'})).toEqual({ok: false, reason: 'ACTION_NOT_SAVED'});
    expect(c.getSnapshot().state).toEqual(s);
    expect(JSON.parse(m.values.get(SAVE_KEY)!).decorations).toEqual(s.decorations);
    expect(JSON.parse(m.values.get(SAVE_KEY)!).pattes).toBe(s.pattes);
    if (fault === 'conflict') expect(c.retrySave().ok).toBe(false);
    m.fail.key = ''; spy?.mockRestore(); m.values.set(SAVE_KEY, raw);
    expect(c.retrySave()).toEqual({ok: true}); expect(c.getSnapshot().state).toEqual(s);
    expect(c.perform({type: 'sellDecoration', id: 'decoration-4'}).ok).toBe(true);
    expect(c.getSnapshot().state!.pattes).toBe(s.pattes + decorationResalePrice('large-bookcase'));
    expect(c.retrySave()).toEqual({ok: true}); expect(c.getSnapshot().state!.pattes).toBe(s.pattes + decorationResalePrice('large-bookcase'));
  });
});
