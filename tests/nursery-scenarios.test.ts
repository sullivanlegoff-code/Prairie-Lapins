import {describe, expect, it} from 'vitest';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {welcomeDestinations} from '../src/simulation/habitats';
import {quoteAcceleration} from '../src/simulation/hearts';
import {nurserySlotStates} from '../src/simulation/nursery';
import {SCENARIOS, scenarioState} from '../src/dev/scenarios';
import {MINUTE, NURSERY, growthDuration} from '../src/config/balance';
import type {Command, GameState} from '../src/state/types';

const NOW = 1_700_000_000_000;
const run = (s: GameState, command: Command, at = s.lastSimulatedAt): GameState => { const r = act(s, command, at, () => .5); if (!r.ok) throw Error(`${command.type}: ${r.reason}`); return r.state; };
const nursery = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
const nest = (s: GameState) => s.buildings.find(b => b.kind === 'nest')!;
const slots = (s: GameState) => Object.fromEntries(nursery(s).nursery!.babies.map(b => [b.slot, b.birth.id]));
const PRICES = NURSERY.unlockHearts, TOTAL = PRICES[1] + PRICES[2] + PRICES[3];
const unlock = (s: GameState): Command => { const from = nursery(s).nursery!.capacity as 1 | 2 | 3; return {type: 'unlockNurserySlot', fromCapacity: from, expectedCost: PRICES[from]}; };
const home = (s: GameState, type: 'paille' | 'neige') => s.buildings.find(b => b.kind === 'enclosure' && b.habitat!.type === type)!;
/** Every identity in the save, which the validator requires to be unique and below nextId. */
const identities = (s: GameState) => [...s.buildings.map(b => b.id), ...s.rabbits.map(r => r.id), ...s.buildings.flatMap(b => [b.breeding?.birth.id, ...(b.nursery?.babies.map(x => x.birth.id) ?? [])].filter((x): x is string => !!x))];

describe('laboratory scenarios for the nursery', () => {
  it('are offered by the existing selector under their names', () => {
    expect(SCENARIOS.nurseryUnlocks).toBe('Nurserie — déblocages'); expect(SCENARIOS.nurseryStates).toBe('Nurserie — quatre états');
  });
  it.each(['nurseryUnlocks', 'nurseryStates'] as const)('%s: valid v13 save, unique identities below nextId, a single nursery, usable nest and homes', id => {
    const s = scenarioState(id, NOW);
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s}); expect(s.version).toBe(21);
    const ids = identities(s); expect(new Set(ids).size).toBe(ids.length); expect(ids.every(x => Number(x.split('-')[1]) < s.nextId)).toBe(true);
    expect(s.buildings.filter(b => b.kind === 'nursery')).toHaveLength(1); expect(s.buildings.filter(b => b.kind === 'nest')).toHaveLength(1);
    expect(home(s, 'paille')).toBeTruthy(); expect(home(s, 'neige')).toBeTruthy();
    expect(s.initiation).toBeUndefined(); expect(s.startCourse).toBeUndefined();
    expect(s.rabbits.every(r => r.affection >= 2)).toBe(true);
  });
});

describe('Nurserie — déblocages', () => {
  const start = () => scenarioState('nurseryUnlocks', NOW);
  it('capacity 1, empty, with exactly the Hearts of the three unlocks', () => {
    const s = start(); expect(nursery(s).nursery).toEqual({capacity: 1, babies: []}); expect(s.hearts).toBe(TOTAL); expect(nest(s).breeding).toBeNull();
    expect(nurserySlotStates(nursery(s), s.lastSimulatedAt)).toEqual(['empty', 'locked', 'locked', 'locked']);
  });
  it('three real purchases, one level at a time, spend exactly the three prices; the fourth is refused', () => {
    let s = start();
    for (const [price, capacity] of [[PRICES[1], 2], [PRICES[2], 3], [PRICES[3], 4]] as const) { const before = s.hearts; s = run(s, unlock(s)); expect([nursery(s).nursery!.capacity, s.hearts]).toEqual([capacity, before - price]); }
    expect(s.hearts).toBe(0); expect(act(s, {type: 'unlockNurserySlot', fromCapacity: 4, expectedCost: PRICES[3]} as unknown as Command, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'MAX_NURSERY_CAPACITY'});
  });
  it('the nest is usable: its two parents can start a reproduction', () => { const s = start(); expect(run(s, {type: 'breed', parents: ['rabbit-2', s.rabbits.find(r => r.species === 'neige')!.id]}).buildings.find(b => b.kind === 'nest')!.breeding).not.toBeNull(); });
});

describe('Nurserie — quatre états', () => {
  const start = () => scenarioState('nurseryStates', NOW);
  it('capacity 3: ready baby (0), baby incubating for about two more minutes (1), empty (2), locked (3)', () => {
    const s = start(), n = nursery(s).nursery!;
    expect(n.capacity).toBe(3); expect(nurserySlotStates(nursery(s), s.lastSimulatedAt)).toEqual(['ready', 'growing', 'empty', 'locked']);
    const [ready, growing] = [0, 1].map(slot => n.babies.find(b => b.slot === slot)!);
    expect(ready.readyAt).toBeLessThanOrEqual(s.lastSimulatedAt); expect(growing.readyAt - s.lastSimulatedAt).toBe(2 * MINUTE);
    for (const b of n.babies) expect(b.readyAt - b.startedAt).toBe(growthDuration(b.birth.species));
  });
  it('a finished birth waits in the nest; the Hearts cover the last unlock and an acceleration; every baby has a compatible home with room', () => {
    const s = start(); expect(nest(s).breeding!.endsAt).toBeLessThanOrEqual(s.lastSimulatedAt); expect(s.hearts).toBeGreaterThan(PRICES[3]);
    for (const baby of [...nursery(s).nursery!.babies, {birth: nest(s).breeding!.birth}]) expect(welcomeDestinations(s, baby.birth.species).length).toBeGreaterThan(0);
    const room = (type: 'paille' | 'neige') => 3 - s.rabbits.filter(r => r.enclosureId === home(s, type).id).length; expect(room('paille')).toBeGreaterThanOrEqual(2); expect(room('neige')).toBeGreaterThanOrEqual(1);
  });
  it('real commands: the birth enters the free slot 2; unlock the last cushion; welcome the ready baby; accelerate and welcome the second', () => {
    let s = start(); const [ready, growing] = [slots(s)[0], slots(s)[1]], birth = nest(s).breeding!.birth.id;
    s = run(s, {type: 'transferBirth', id: nest(s).id, birthId: birth}); expect(slots(s)).toEqual({0: ready, 1: growing, 2: birth}); expect(nest(s).breeding).toBeNull();
    const hearts = s.hearts; s = run(s, unlock(s)); expect([nursery(s).nursery!.capacity, s.hearts]).toEqual([4, hearts - PRICES[3]]);
    s = run(s, {type: 'welcome', enclosureId: home(s, 'paille').id, birthId: ready}); expect(slots(s)).toEqual({1: growing, 2: birth});
    const quote = quoteAcceleration(s, nursery(s).id, 'growth', s.lastSimulatedAt, growing); if (!quote.ok) throw Error(quote.reason);
    expect(quote.hearts).toBeLessThanOrEqual(s.hearts);
    s = run(s, {type: 'accelerate', id: nursery(s).id, stage: 'growth', jobKey: quote.jobKey, maxHearts: quote.hearts, birthId: growing}); expect(s.hearts).toBeGreaterThanOrEqual(0);
    s = run(s, {type: 'welcome', enclosureId: home(s, 'paille').id, birthId: growing}); expect(slots(s)).toEqual({2: birth});
    s = advance(s, s.lastSimulatedAt + growthDuration('neige')); s = run(s, {type: 'welcome', enclosureId: home(s, 'neige').id, birthId: birth}); expect(slots(s)).toEqual({});
  });
  it('after welcoming the ready baby, the next arrival fills the hole at slot 0', () => {
    let s = start(); const ready = slots(s)[0], birth = nest(s).breeding!.birth.id;
    s = run(s, {type: 'welcome', enclosureId: home(s, 'paille').id, birthId: ready}); s = run(s, {type: 'transferBirth', id: nest(s).id, birthId: birth});
    expect(Object.keys(slots(s)).sort()).toEqual(['0', '1']); expect(slots(s)[0]).toBe(birth);
  });
});
