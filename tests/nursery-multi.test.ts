import {describe, expect, it} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {quoteAcceleration} from '../src/simulation/hearts';
import {habitatEntryReason} from '../src/simulation/habitats';
import {buildingPlacementReason} from '../src/simulation/placement';
import {firstFreeNurserySlot, freeNurserySlots, nurseryFull, readyNurseryBabies} from '../src/simulation/nursery';
import {jobKey} from '../src/simulation/initiation';
import {scenarioState} from '../src/dev/scenarios';
import {nurseryView} from '../src/ui/models';
import {MINUTE, growthDuration} from '../src/config/balance';
import type {HabitatType} from '../src/config/habitats';
import type {Command, GameState, NurseryCapacity} from '../src/state/types';

/** Real commands; rng .5 draws Neige and .1 Paille for Paille × Neige parents. */
const run = (s: GameState, command: Command, now = s.lastSimulatedAt, roll = .5): GameState => {
  const r = act(s, command, now, () => roll); if (!r.ok) throw Error(`${command.type}: ${r.reason}`); return r.state;
};
/** A refused command leaves the whole state untouched, Hearts included. */
const refuses = (s: GameState, command: Command, reason: string, now = s.lastSimulatedAt) => {
  const before = structuredClone(s), r = act(s, command, now, () => .5);
  expect(r).toMatchObject({ok: false, reason}); expect(r.state).toEqual(before); expect(s).toEqual(before);
};
const nursery = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
const nest = (s: GameState) => s.buildings.find(b => b.kind === 'nest')!;
const babies = (s: GameState) => nursery(s).nursery!.babies;
const slots = (s: GameState) => Object.fromEntries(babies(s).map(b => [b.slot, b.birth.id]));
const byId = (s: GameState, id: string) => babies(s).find(b => b.birth.id === id)!;
function habitat(s: GameState, type: HabitatType): GameState {
  for (let y = 32; y <= 44; y++) for (let x = 0; x <= 12; x++) if (!buildingPlacementReason(s, x, y)) return run(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: type, x, y});
  throw Error('no free cell');
}
/** Paille (building-1) and Neige (own habitat) parents at affection 2; the nursery has `capacity` usable cushions. */
function setup(capacity: NurseryCapacity) {
  let s = createGame(0); s.pattes = 100_000; s.hearts = 500; s.grass = 1000;
  s = habitat(s, 'neige'); const snowHome = s.buildings.at(-1)!.id;
  s = run(s, {type: 'buyRabbit', species: 'neige', enclosureId: snowHome}); const snow = s.rabbits.at(-1)!.id;
  s = run(s, {type: 'feed', id: 'rabbit-2'}); s = run(s, {type: 'feed', id: snow});
  nursery(s).nursery!.capacity = capacity;
  return {s, snowHome, snow};
}
/** One reproduction, ended with Hearts, left waiting in the nest. */
function bred(s: GameState, snow: string, roll = .5): GameState {
  s = run(s, {type: 'breed', parents: ['rabbit-2', snow]}, s.lastSimulatedAt, roll);
  // Explicit historical births keep the single-type capacity and short-growth regressions.
  nest(s).breeding!.birth.species = roll < .5 ? 'paille' : 'neige';nest(s).breeding!.birth.reservedDiscovery=false;nest(s).breeding!.birth.guaranteed=false;
  const q = quoteAcceleration(s, nest(s).id, 'breeding', s.lastSimulatedAt); if (!q.ok) throw Error(q.reason);
  return run(s, {type: 'accelerate', id: nest(s).id, stage: 'breeding', jobKey: q.jobKey, maxHearts: q.hearts});
}
const transfer = (s: GameState): Command => ({type: 'transferBirth', id: nest(s).id, birthId: nest(s).breeding!.birth.id});
/** A new birth sent to the nursery; returns the state and the birth id. */
function born(s: GameState, snow: string, roll = .5): [GameState, string] {
  s = bred(s, snow, roll); const id = nest(s).breeding!.birth.id; return [run(s, transfer(s)), id];
}
const growthQuote = (s: GameState, birthId: string) => quoteAcceleration(s, nursery(s).id, 'growth', s.lastSimulatedAt, birthId);
function speedUp(s: GameState, birthId: string): Command {
  const q = growthQuote(s, birthId); if (!q.ok) throw Error(q.reason);
  return {type: 'accelerate', id: nursery(s).id, stage: 'growth', jobKey: q.jobKey, maxHearts: q.hearts, birthId};
}
const welcome = (enclosureId: string, birthId: string): Command => ({type: 'welcome', enclosureId, birthId});

describe('slot allocation', () => {
  it('capacity 1 behaves as before: one baby in slot 0, then the next birth waits in the nest', () => {
    let {s, snow} = setup(1), a: string; [s, a] = born(s, snow);
    expect(slots(s)).toEqual({0: a}); expect(nurseryFull(nursery(s))).toBe(true);
    s = bred(s, snow); refuses(s, transfer(s), 'BUSY'); expect(nest(s).breeding).not.toBeNull();
  });
  it('capacity 2 accepts two babies; capacity 4 accepts four, in slots 0..3; the next one is refused', () => {
    let {s, snow} = setup(2); const two: string[] = [];
    for (let i = 0; i < 2; i++) { let id: string; [s, id] = born(s, snow); two.push(id); }
    expect(slots(s)).toEqual({0: two[0], 1: two[1]}); s = bred(s, snow); refuses(s, transfer(s), 'BUSY');
    const large = setup(4); let four = large.s; const ids: string[] = [];
    for (let i = 0; i < 4; i++) { let id: string; [four, id] = born(four, large.snow); ids.push(id); }
    expect(slots(four)).toEqual({0: ids[0], 1: ids[1], 2: ids[2], 3: ids[3]}); expect(freeNurserySlots(nursery(four))).toEqual([]);
    four = bred(four, large.snow); refuses(four, transfer(four), 'BUSY');
    expect(new Set(babies(four).map(b => b.birth.id)).size).toBe(4);
  });
  it('takes the lowest free slot, reuses holes and never moves a baby already there', () => {
    let {s, snow, snowHome} = setup(4); const ids: string[] = [];
    for (let i = 0; i < 3; i++) { let id: string; [s, id] = born(s, snow); ids.push(id); }
    s = advance(s, s.lastSimulatedAt + growthDuration('neige'));
    const kept = structuredClone(babies(s).filter(b => b.birth.id !== ids[1]));
    s = run(s, welcome(snowHome, ids[1]));
    expect(slots(s)).toEqual({0: ids[0], 2: ids[2]}); expect(firstFreeNurserySlot(nursery(s))).toBe(1);
    let next: string; [s, next] = born(s, snow);
    expect(slots(s)).toEqual({0: ids[0], 1: next, 2: ids[2]});
    for (const baby of kept) expect(byId(s, baby.birth.id)).toEqual(baby);
    let last: string; [s, last] = born(s, snow); expect(slots(s)[3]).toBe(last);
  });
});

describe('nest lifecycle', () => {
  it('transfers while one of several slots is free, waits when all are full, and resumes once a slot is freed', () => {
    let {s, snow, snowHome} = setup(3), a: string, b: string, c: string;
    [s, a] = born(s, snow); [s, b] = born(s, snow);
    expect(nurseryFull(nursery(s))).toBe(false); [s, c] = born(s, snow);
    s = bred(s, snow); const waiting = structuredClone(nest(s).breeding!);
    refuses(s, transfer(s), 'BUSY');
    s = advance(s, s.lastSimulatedAt + growthDuration('neige'));
    expect(nest(s).breeding).toEqual(waiting);
    s = run(s, welcome(snowHome, b));
    s = run(s, transfer(s)); expect(slots(s)).toEqual({0: a, 1: waiting.birth.id, 2: c}); expect(nest(s).breeding).toBeNull();
    expect(byId(s, waiting.birth.id).birth).toEqual(waiting.birth);
  });
});

describe('welcome targets one ready baby', () => {
  function three() {
    let {s, snow, snowHome} = setup(3), a: string, b: string, c: string;
    [s, a] = born(s, snow); [s, b] = born(s, snow); [s, c] = born(s, snow);
    return {s: advance(s, s.lastSimulatedAt + growthDuration('neige')), snow, snowHome, a, b, c};
  }
  it('welcomes B from slot 1 while A and C keep their slots and data; exactly that slot is freed', () => {
    const {s: start, snowHome, a, b, c} = three(), before = structuredClone(babies(start));
    const s = run(start, welcome(snowHome, b));
    expect(slots(s)).toEqual({0: a, 2: c}); expect(babies(s)).toEqual(before.filter(x => x.birth.id !== b));
    expect(s.rabbits.at(-1)).toMatchObject({id: b, enclosureId: snowHome}); expect(freeNurserySlots(nursery(s))).toEqual([1]);
  });
  it('welcomes A while B remains', () => {
    const {s: start, snowHome, a, b, c} = three(), s = run(start, welcome(snowHome, a));
    expect(slots(s)).toEqual({1: b, 2: c}); expect(s.rabbits.at(-1)!.id).toBe(a);
  });
  it('refuses a stale or unknown birth id without removing any other baby', () => {
    const {s: start, snowHome, b} = three(), s = run(start, welcome(snowHome, b));
    refuses(s, welcome(snowHome, b), 'STALE_ACTION'); refuses(s, welcome(snowHome, 'birth-999'), 'STALE_ACTION');
  });
  it('refuses a baby that is not ready even if another one is', () => {
    let {s, snow, snowHome} = setup(2), a: string, b: string;
    [s, a] = born(s, snow); s = advance(s, s.lastSimulatedAt + growthDuration('neige')); [s, b] = born(s, snow);
    expect(readyNurseryBabies(nursery(s), s.lastSimulatedAt).map(x => x.birth.id)).toEqual([a]);
    refuses(s, welcome(snowHome, b), 'NOT_READY');
    expect(slots(run(s, welcome(snowHome, a)))).toEqual({1: b});
  });
  it('keeps incompatible and full-habitat refusals atomic for the targeted baby', () => {
    let {s, snow, snowHome} = setup(2), neige: string, paille: string;
    [s, neige] = born(s, snow, .5); [s, paille] = born(s, snow, .1);
    s = advance(s, s.lastSimulatedAt + growthDuration('paille') + growthDuration('neige'));
    expect([byId(s, neige).birth.species, byId(s, paille).birth.species]).toEqual(['neige', 'paille']);
    refuses(s, welcome('building-1', neige), 'TYPE_INCOMPATIBLE');
    while (!habitatEntryReason(s, s.buildings.find(b => b.id === snowHome)!, 'neige')) s = run(s, {type: 'buyRabbit', species: 'neige', enclosureId: snowHome});
    refuses(s, welcome(snowHome, neige), 'CAPACITY_FULL');
    // The Paille baby still has its own legal home.
    expect(slots(run(s, welcome('building-1', paille)))).toEqual({0: neige});
  });
});

describe('growth acceleration targets one baby', () => {
  it('ends A only, with a cost from A’s own remaining time; B keeps its timers', () => {
    let {s, snow} = setup(2), a: string, b: string;
    [s, a] = born(s, snow, .1); s = advance(s, s.lastSimulatedAt + MINUTE); [s, b] = born(s, snow, .1);
    const qa = growthQuote(s, a), qb = growthQuote(s, b);
    expect(qa.ok && qb.ok && [qa.endsAt, qb.endsAt]).toEqual([byId(s, a).readyAt, byId(s, b).readyAt]);
    expect(qa.ok && qb.ok && qa.hearts <= qb.hearts && qa.jobKey !== qb.jobKey).toBe(true);
    const bBefore = structuredClone(byId(s, b)), hearts = s.hearts;
    s = run(s, speedUp(s, a));
    expect(byId(s, a).readyAt).toBe(s.lastSimulatedAt); expect(byId(s, b)).toEqual(bBefore);
    expect(s.hearts).toBe(hearts - (qa.ok ? qa.hearts : NaN));
  });
  it('refuses a growth quote or command without a target, and never substitutes another baby', () => {
    let {s, snow} = setup(2), a: string, b: string; [s, a] = born(s, snow); [s, b] = born(s, snow);
    expect(quoteAcceleration(s, nursery(s).id, 'growth', s.lastSimulatedAt)).toEqual({ok: false, reason: 'INVALID_CHOICE'});
    const forA = speedUp(s, a) as Extract<Command, {type: 'accelerate'}>, {birthId: _a, ...untargeted} = forA;
    refuses(s, untargeted, 'INVALID_CHOICE');
    refuses(s, {...forA, birthId: b}, 'STALE_ACTION');
    s = advance(s, s.lastSimulatedAt + growthDuration('neige'));
    refuses(s, forA, 'ACTION_FINISHED');
  });
  it('checks the compatible-home guard on the targeted baby’s species only, spending nothing on refusal', () => {
    let {s, snow, snowHome} = setup(2), neige: string, paille: string;
    [s, neige] = born(s, snow, .5); [s, paille] = born(s, snow, .1);
    const stale = speedUp(s, neige);
    while (!habitatEntryReason(s, s.buildings.find(b => b.id === snowHome)!, 'neige')) s = run(s, {type: 'buyRabbit', species: 'neige', enclosureId: snowHome});
    expect(growthQuote(s, neige)).toEqual({ok: false, reason: 'CAPACITY_FULL'});
    refuses(s, stale, 'CAPACITY_FULL');
    const before = structuredClone(byId(s, neige));
    s = run(s, speedUp(s, paille));
    expect(byId(s, paille).readyAt).toBe(s.lastSimulatedAt); expect(byId(s, neige)).toEqual(before);
    expect(JSON.stringify(growthQuote(s, neige))).not.toContain('neige');
  });
});

describe('initiation free aid follows its own birth', () => {
  /** The saved initiation baby A moved to slot 1 of a two-cushion nursery; baby B then takes the lower slot 0. */
  function shared() {
    let s = scenarioState('initiationSaved', 0); const a = s.initiation!.birthId!, key = s.initiation!.growth!;
    nursery(s).nursery!.capacity = 2; babies(s)[0].slot = 1; s.hearts = 100;
    const snow = s.rabbits.find(r => r.species === 'neige')!.id;
    s = run(s, {type: 'breed', parents: ['rabbit-2', snow]});
    const q = quoteAcceleration(s, nest(s).id, 'breeding', s.lastSimulatedAt); if (!q.ok) throw Error(q.reason);
    s = run(s, {type: 'accelerate', id: nest(s).id, stage: 'breeding', jobKey: q.jobKey, maxHearts: q.hearts});
    const b = nest(s).breeding!.birth.id; s = run(s, transfer(s));
    return {s, a, b, key};
  }
  it('keeps the aid on A when B enters a lower slot, and applies it to A only', () => {
    const {s: start, a, b, key} = shared();
    expect(slots(start)).toEqual({0: b, 1: a}); expect(start.initiation!.growth).toBe(key); expect(jobKey(nursery(start), 'growth', a)).toBe(key);
    expect(growthQuote(start, b).ok && growthQuote(start, b)).not.toMatchObject({jobKey: key});
    const bBefore = structuredClone(byId(start, b));
    const s = run(start, {type: 'initiationAid', id: nursery(start).id, stage: 'growth', jobKey: key, birthId: a});
    expect(byId(s, a).readyAt).toBe(s.lastSimulatedAt); expect(byId(s, b)).toEqual(bBefore);
    expect(s.initiation!.used).toContain('growth'); expect(s.hearts).toBe(start.hearts);
  });
  it('never lends the aid to another baby, whether named with A’s key or its own', () => {
    const {s, b, key} = shared(), bKey = jobKey(nursery(s), 'growth', b)!;
    refuses(s, {type: 'initiationAid', id: nursery(s).id, stage: 'growth', jobKey: key, birthId: b}, 'STALE_ACTION');
    refuses(s, {type: 'initiationAid', id: nursery(s).id, stage: 'growth', jobKey: bKey, birthId: b}, 'STALE_ACTION');
  });
  it('closes the aid once A has left; it can no longer apply to the baby left behind', () => {
    let {s, a, b, key} = shared();
    s = run(s, speedUp(s, a)); expect(s.initiation!.closed).toContain('growth');
    const home = s.buildings.find(x => x.kind === 'enclosure' && !habitatEntryReason(s, x, byId(s, a).birth.species))!;
    s = run(s, welcome(home.id, a)); expect(slots(s)).toEqual({0: b});
    refuses(s, {type: 'initiationAid', id: nursery(s).id, stage: 'growth', jobKey: key, birthId: a}, 'ACTION_FINISHED');
    refuses(s, {type: 'initiationAid', id: nursery(s).id, stage: 'growth', jobKey: key, birthId: b}, 'STALE_ACTION');
  });
});

describe('persistence and models', () => {
  it('round-trips several babies with their explicit slots and stored order', () => {
    let {s, snow, snowHome} = setup(4), a: string, b: string, c: string;
    [s, a] = born(s, snow); [s, b] = born(s, snow); [s, c] = born(s, snow);
    s = advance(s, s.lastSimulatedAt + growthDuration('neige')); s = run(s, welcome(snowHome, a)); [s] = born(s, snow);
    expect(babies(s).map(x => x.slot)).toEqual([1, 2, 0]);
    const loaded = decodeGame(encodeGame(s));
    expect(loaded).toEqual({ok: true, state: s});
    expect(loaded.ok && babies(loaded.state).map(x => [x.slot, x.birth.id])).toEqual(babies(s).map(x => [x.slot, x.birth.id]));
    expect(slots(s)[1]).toBe(b); expect(slots(s)[2]).toBe(c);
  });
  it('lists each baby once in slot order, hiding the species of growing ones', () => {
    let {s, snow} = setup(3), a: string, b: string;
    [s, a] = born(s, snow); s = advance(s, s.lastSimulatedAt + growthDuration('neige')); [s, b] = born(s, snow);
    babies(s).reverse();
    const view = nurseryView(s, s.lastSimulatedAt);
    expect(view).toMatchObject({capacity: 3, free: 1}); expect(view.babies.map(x => [x.slot, x.birthId, x.stage])).toEqual([[0, a, 'ready'], [1, b, 'growing']]);
    expect(JSON.stringify(view.babies[1])).not.toContain('neige');
  });
  it('a normal new game still has a single usable cushion', () => {
    expect(nursery(createGame(0)).nursery).toEqual({capacity: 1, babies: []});
  });
});
