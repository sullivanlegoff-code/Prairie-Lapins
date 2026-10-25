import {describe, expect, it} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {quoteAcceleration} from '../src/simulation/hearts';
import {buildingPlacementReason} from '../src/simulation/placement';
import {nurserySlotStates, nurseryUnlockQuote} from '../src/simulation/nursery';
import {HEART_COMPLEMENT_COMMANDS} from '../src/simulation/actions';
import {NURSERY, growthDuration} from '../src/config/balance';
import type {Command, GameState, NurseryCapacity} from '../src/state/types';

const run = (s: GameState, command: Command, now = s.lastSimulatedAt): GameState => {
  const r = act(s, command, now, () => .5); if (!r.ok) throw Error(`${command.type}: ${r.reason}`); return r.state;
};
const refuses = (s: GameState, command: Command, reason: string) => {
  const before = structuredClone(s), r = act(s, command, s.lastSimulatedAt, () => .5);
  expect(r).toMatchObject({ok: false, reason}); expect(r.state).toEqual(before); expect(s).toEqual(before);
};
const nursery = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
const nest = (s: GameState) => s.buildings.find(b => b.kind === 'nest')!;
const capacity = (s: GameState) => nursery(s).nursery!.capacity;
/**
 * Expected prices come straight from the balance table, never from the function under test, so retuning
 * `NURSERY.unlockHearts` needs no change here. `PRICE[c]` is the cost of the step c → c + 1.
 */
const PRICE = NURSERY.unlockHearts;
const TOTAL = PRICE[1] + PRICE[2] + PRICE[3];
/** The command the panel sends for the next cushion, with the configured price of the current capacity. */
function unlock(s: GameState): Extract<Command, {type: 'unlockNurserySlot'}> {
  const from = capacity(s); if (from >= NURSERY.maxCapacity) throw Error('no unlock');
  return {type: 'unlockNurserySlot', fromCapacity: from, expectedCost: PRICE[from as 1 | 2 | 3]};
}
const rich = (hearts = TOTAL + 1000) => { const s = createGame(0); s.hearts = hearts; return s; };
/** Only the nursery capacity and the Heart balance may differ. */
function expectOnlyUpgrade(before: GameState, after: GameState, hearts: number) {
  const expected = structuredClone(before); expected.hearts -= hearts; nursery(expected).nursery!.capacity = (capacity(before) + 1) as NurseryCapacity;
  expect(after).toEqual(expected);
}

describe('authoritative unlock prices', () => {
  it('quotes the configured price of each step, one step at a time, and nothing at capacity 4', () => {
    // Structure only: one positive whole-Heart price for each of the three steps; the values stay tunable.
    expect(Object.keys(PRICE).map(Number)).toEqual([1, 2, 3]);
    for (const c of [1, 2, 3] as const) expect(Number.isInteger(PRICE[c]) && PRICE[c] > 0).toBe(true);
    const s = rich();
    for (const c of [1, 2, 3] as const) { nursery(s).nursery!.capacity = c; expect(nurseryUnlockQuote(nursery(s))).toEqual({fromCapacity: c, toCapacity: c + 1, hearts: PRICE[c]}); }
    nursery(s).nursery!.capacity = 4; expect(nurseryUnlockQuote(nursery(s))).toBeNull();
    expect(nurseryUnlockQuote(undefined)).toBeNull();
  });
});

describe('unlockNurserySlot', () => {
  it('starts a new game at capacity 1, then 1 → 2 → 3 → 4 spends exactly the configured price of each step and changes nothing else', () => {
    let s = rich(TOTAL + 5); expect(capacity(s)).toBe(1);
    for (const [hearts, to] of [[PRICE[1], 2], [PRICE[2], 3], [PRICE[3], 4]] as const) {
      const before = structuredClone(s), r = act(s, unlock(s), s.lastSimulatedAt);
      if (!r.ok) throw Error(r.reason);
      expect(r.value).toBe(to); expectOnlyUpgrade(before, r.state, hearts); s = r.state;
    }
    expect([capacity(s), s.hearts, s.pattes]).toEqual([4, 5, createGame(0).pattes]);
  });
  it('refuses beyond 4 with MAX_NURSERY_CAPACITY and never skips a level', () => {
    const s = rich(); nursery(s).nursery!.capacity = 4;
    refuses(s, {type: 'unlockNurserySlot', fromCapacity: 4, expectedCost: PRICE[3]} as unknown as Command, 'MAX_NURSERY_CAPACITY');
    const one = rich();
    refuses(one, {type: 'unlockNurserySlot', fromCapacity: 2, expectedCost: PRICE[2]}, 'STALE_ACTION');
    refuses(one, {type: 'unlockNurserySlot', fromCapacity: 3, expectedCost: PRICE[3]}, 'STALE_ACTION');
    expect(capacity(run(one, unlock(one)))).toBe(2);
  });
  it('refuses atomically without a nursery, with too few Hearts, a stale capacity or a changed price', () => {
    const none = rich(); none.buildings = none.buildings.filter(b => b.kind !== 'nursery');
    refuses(none, {type: 'unlockNurserySlot', fromCapacity: 1, expectedCost: PRICE[1]}, 'MISSING_BUILDING');
    const short = rich(PRICE[1] - 1); refuses(short, unlock(short), 'NOT_ENOUGH_HEARTS');
    const last = rich(PRICE[3] - 1); nursery(last).nursery!.capacity = 3; refuses(last, unlock(last), 'NOT_ENOUGH_HEARTS');
    // Deliberately wrong prices, derived from the configured one: one less, one more.
    refuses(rich(), {type: 'unlockNurserySlot', fromCapacity: 1, expectedCost: PRICE[1] - 1}, 'PRICE_CHANGED');
    refuses(rich(), {type: 'unlockNurserySlot', fromCapacity: 1, expectedCost: PRICE[1] + 1}, 'PRICE_CHANGED');
    const exact = rich(PRICE[1]); expect(capacity(run(exact, unlock(exact)))).toBe(2);
  });
  it('a double click spends once and upgrades once; the repeated command is stale', () => {
    const s = rich(PRICE[1] + 7), command = unlock(s), once = run(s, command);
    expect([capacity(once), once.hearts]).toEqual([2, 7]);
    refuses(once, command, 'STALE_ACTION');
  });
  it('spends Hearts only: never Pattes, never through the Pattes heart complement', () => {
    const s = rich(PRICE[1]); s.pattes = 0;
    const after = run(s, unlock(s)); expect([after.pattes, after.hearts]).toEqual([0, 0]);
    expect((HEART_COMPLEMENT_COMMANDS as readonly string[]).includes('unlockNurserySlot')).toBe(false);
    refuses(s, {type: 'payWithHearts', action: unlock(s), maxHearts: PRICE[1], maxPattes: 0} as unknown as Command, 'INVALID_CHOICE');
  });
});

describe('unlocking with babies present', () => {
  /** Two babies growing in slots 0 and 1 of a two-cushion nursery (real breeding, Heart-ended reproductions). */
  function twoBabies() {
    let s = createGame(0); s.pattes = 100_000; s.hearts = 500; s.grass = 1000;
    for (let y = 32; y <= 44 && s.buildings.length < 4; y++) for (let x = 0; x <= 12 && s.buildings.length < 4; x++) if (!buildingPlacementReason(s, x, y)) s = run(s, {type: 'buyBuilding', kind: 'enclosure', habitatType: 'neige', x, y});
    const snowHome = s.buildings.at(-1)!.id;
    s = run(s, {type: 'buyRabbit', species: 'neige', enclosureId: snowHome}); const snow = s.rabbits.at(-1)!.id;
    s = run(s, {type: 'feed', id: 'rabbit-2'}); s = run(s, {type: 'feed', id: snow});
    s = run(s, unlock(s));
    for (let i = 0; i < 2; i++) {
      s = run(s, {type: 'breed', parents: ['rabbit-2', snow]});
      const q = quoteAcceleration(s, nest(s).id, 'breeding', s.lastSimulatedAt); if (!q.ok) throw Error(q.reason);
      s = run(s, {type: 'accelerate', id: nest(s).id, stage: 'breeding', jobKey: q.jobKey, maxHearts: q.hearts});
      s = run(s, {type: 'transferBirth', id: nest(s).id, birthId: nest(s).breeding!.birth.id});
    }
    return s;
  }
  it('keeps every baby, slot, timer and ready state byte for byte; only the new cushion becomes free', () => {
    let s = twoBabies(); expect(nursery(s).nursery!.babies.map(b => b.slot)).toEqual([0, 1]);
    const before = structuredClone(s); s = run(s, unlock(s));
    expectOnlyUpgrade(before, s, PRICE[2]);
    expect(nursery(s).nursery!.babies).toEqual(nursery(before).nursery!.babies);
    expect(nurserySlotStates(nursery(s), s.lastSimulatedAt)).toEqual(['growing', 'growing', 'empty', 'locked']);
    // A ready baby stays ready, the nest is untouched, and the next birth takes the new cushion.
    let ready = advance(before, before.lastSimulatedAt + growthDuration('neige'));
    const states = nurserySlotStates(nursery(ready), ready.lastSimulatedAt); ready = run(ready, unlock(ready));
    expect(nurserySlotStates(nursery(ready), ready.lastSimulatedAt)).toEqual([...states.slice(0, 2), 'empty', 'locked']);
    expect(nest(ready)).toEqual(nest(before));
  });
});

describe('persistence', () => {
  it('keeps the unlocked capacity across save/load, still in v13 with no new field', () => {
    let s = rich(); s = run(s, unlock(s)); s = run(s, unlock(s));
    const json = encodeGame(s), raw = JSON.parse(json);
    expect(raw.version).toBe(17); expect(raw.buildings.find((b: {kind: string}) => b.kind === 'nursery').nursery).toEqual({capacity: 3, babies: []});
    expect(decodeGame(json)).toEqual({ok: true, state: s});
  });
});
