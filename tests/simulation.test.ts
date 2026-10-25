import {cumulativeLevelXp} from '../src/simulation/progression';
import {sendToNursery} from './manual-transfer';
import {regressionStart as legacyGame} from './regression-start';
import {describe, expect, it} from 'vitest';
import {HOUR, MINUTE, ORDERS, BREEDING_ODDS, SPECIES, LEGACY_SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {act, advance,  decodeGame, encodeGame, pendingDiscoveries, rabbitIncome} from '../src/simulation';
import {breedingOdds, chooseBirth} from '../src/simulation/breeding';
import type {Command, GameState, Refusal} from '../src/state/types';
import {babyOf, welcomeOf} from './nursery-baby';

// Isolate recipe/economy rules; active low-level filtering is covered in level-gates.test.ts.
function createGame(now=0){const s=legacyGame(now);s.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};return s;}
const enclosure = 'building-1';
function run(s: GameState, command: Command, now = s.lastSimulatedAt, roll = 0): GameState {
  const result = act(s, command, now, () => roll);
  if (!result.ok) throw new Error(`${command.type}: ${result.reason}`);
  return result.state;
}
function refuses(s: GameState, command: Command, reason: Refusal, now = s.lastSimulatedAt, roll = 0) {
  const snapshot = JSON.stringify(s);
  const result = act(s, command, now, () => roll);
  expect(result.ok).toBe(false);
  if (!result.ok) { expect(result.reason).toBe(reason); expect(result.state).toBe(s); }
  expect(JSON.stringify(s)).toBe(snapshot);
}
function setup(): GameState {
  let s = createGame(0); s.pattes = 10_000;
  s = run(s, {type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20});
  s = run(s, {type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20});
  s = run(s, {type: 'buyBuilding', kind: 'enclosure', x: 18, y: 24});
  s = run(s, {type: 'feed', id: 'rabbit-2'}); s = run(s, {type: 'feed', id: 'rabbit-3'});
  return s;
}
const breed: Command = {type: 'breed', parents: ['rabbit-2', 'rabbit-3']};
const nursery = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
const nest = (s: GameState) => s.buildings.find(b => b.kind === 'nest')!;
const secondEnclosure = (s: GameState) => s.buildings.filter(b => b.kind === 'enclosure')[1].id;

describe('initial state, costs and atomic refusals', () => {
  it('creates the validated starting game', () => {
    const s = createGame(123); expect(s.pattes).toBe(350); expect(s.grass).toBe(10);
    expect(s.rabbits.map(r => r.species)).toEqual(['paille', 'neige']);
    expect(s.discovered).toEqual(['paille', 'neige']); expect(s.lastSimulatedAt).toBe(123);
  });
  it('buys and moves a building without moving any resident identifiers', () => {
    let s = run(createGame(0), {type: 'buyBuilding', kind: 'farm', x: 22, y: 20});
    expect(s.pattes).toBe(290);
    s = run(s, {type: 'moveBuilding', id: enclosure, x: 26, y: 24});
    expect(s.buildings[0].x).toBe(26); expect(s.rabbits[0].enclosureId).toBe(enclosure);
  });
  it('refuses occupied and invalid cells, including fractional coordinates', () => {
    const s = createGame(0);
    refuses(s, {type: 'buyBuilding', kind: 'farm', x: 18, y: 20}, 'CELL_OCCUPIED', HOUR);
    for (const x of [-1, 3, 0.5, NaN]) refuses(s, {type: 'buyBuilding', kind: 'farm', x: x * 4, y: 4}, 'INVALID_CELL');
  });
  it('refuses costs without advancing time or spending anything', () => {
    const s = createGame(0); s.pattes = 0;
    refuses(s, {type: 'buyBuilding', kind: 'farm', x: 22, y: 20}, 'NOT_ENOUGH_PATTES', HOUR);
    refuses(s, {type: 'buyRabbit', species: 'neige', enclosureId: enclosure}, 'NOT_ENOUGH_PATTES');
    refuses(s, {type:'expand',parcelId:'east',expectedCost:600}, 'NOT_ENOUGH_PATTES');
  });
  it('enforces building limits', () => {
    let s = setup();
    refuses(s, {type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 24}, 'BUILDING_LIMIT');
    refuses(s, {type: 'placeStarterBuilding', kind: 'nursery', x: 22, y: 24}, 'BUILDING_LIMIT');
    s = run(s, {type: 'buyBuilding', kind: 'farm', x: 22, y: 24});
    s = run(s, {type: 'buyBuilding', kind: 'farm', x: 26, y: 24});
    refuses(s, {type: 'buyBuilding', kind: 'farm', x: 18, y: 20}, 'BUILDING_LIMIT');
  });
  it('buys the extension once and unlocks the new cells', () => {
    let s = createGame(0); s.pattes = 800;
    refuses(s, {type: 'buyBuilding', kind: 'farm', x: 34, y: 20}, 'INVALID_CELL');
    s = run(s, {type:'expand',parcelId:'east',expectedCost:600}); expect(s.pattes).toBe(200);
    s = run(s, {type: 'buyBuilding', kind: 'farm', x: 42, y: 24});
    refuses(s, {type:'expand',parcelId:'east',expectedCost:600}, 'ALREADY_EXPANDED');
  });
  it('rejects invalid times and random samples atomically', () => {
    const s = setup(); refuses(s, breed, 'INVALID_TIME', NaN);
    for (const roll of [-1, 1, Infinity, NaN]) refuses(s, breed, 'INVALID_RANDOM', 0, roll);
  });
});

describe('income and time', () => {
  it('computes income, caps it and collects only whole pattes', () => {
    let s = advance(createGame(0), HOUR); expect(s.buildings[0].incomeUnits).toBe(20*HOUR);
    s = run(s, {type: 'collectIncome', id: enclosure}); expect(s.pattes).toBe(370);
    s = advance(s, 1000 * HOUR); expect(s.buildings[0].incomeUnits).toBe(2400 * HOUR);
    s = run(s, {type: 'collectIncome', id: enclosure}); expect(s.pattes).toBe(2770);
  });
  it('preserves fractional income through repeated advances and collections', () => {
    const original = createGame(0); let split = original;
    for (let t = 1; t <= 100; t++) split = run(split, {type: 'collectIncome', id: enclosure}, t);
    const once = advance(original, 100);
    expect(split.buildings[0].incomeUnits).toBe(once.buildings[0].incomeUnits);
    expect(split.buildings[0].incomeUnits).toBe(2000);
  });
  it('settles the old affection before feeding', () => {
    const s = run(createGame(0), {type: 'feed', id: 'rabbit-2'}, HOUR);
    expect(s.buildings[0].incomeUnits).toBe(20*HOUR);
    expect(advance(s, 2 * HOUR).buildings[0].incomeUnits).toBe(41 * HOUR);
  });
  it('does not produce income retroactively for purchases', () => {
    const s = run(createGame(0), {type: 'buyRabbit', species: 'neige', enclosureId: enclosure}, HOUR);
    expect(s.buildings[0].incomeUnits).toBe(20*HOUR);
    expect(advance(s, 2 * HOUR).buildings[0].incomeUnits).toBe(50 * HOUR);
  });
  it('settles both enclosures before moving a rabbit', () => {
    let s = setup(); const target = secondEnclosure(s);
    s = run(s, {type: 'moveRabbit', id: 'rabbit-2', enclosureId: target}, HOUR);
    expect(s.buildings[0].incomeUnits).toBe(22 * HOUR);
    s = advance(s, 2 * HOUR);
    expect(s.buildings[0].incomeUnits).toBe(33 * HOUR);
    expect(s.buildings.find(b => b.id === target)!.incomeUnits).toBe(11 * HOUR);
  });
  it('ignores a reversed clock and never counts an interval twice', () => {
    let s = advance(createGame(0), HOUR);
    expect(advance(s, HOUR - MINUTE)).toEqual(s);
    s = run(s, {type: 'collectIncome', id: enclosure}, HOUR - MINUTE);
    expect(s.lastSimulatedAt).toBe(HOUR);
    expect(advance(s, HOUR).buildings[0].incomeUnits).toBe(0);
    expect(advance(s, 2 * HOUR).buildings[0].incomeUnits).toBe(20*HOUR);
  });
  it('anchors new timers to the monotonic time when the clock reverses', () => {
    let s = advance(setup(), HOUR); s = run(s, breed, HOUR - MINUTE);
    expect(nest(s).breeding!.startedAt).toBe(HOUR);
    expect(nest(s).breeding!.endsAt).toBe(HOUR + 20 * MINUTE);
  });
  it('matches one long absence to many shorter resumes, exactly', () => {
    const original = run(setup(), breed, 0, 0.9);
    let split = original;
    for (let t = MINUTE; t <= 48 * HOUR; t += MINUTE) split = advance(split, t);
    expect(split).toEqual(advance(original, 48 * HOUR));
    expect(babyOf(nursery(split))).toBeNull();expect(nest(split).breeding).not.toBeNull();
  });
});

describe('farming and affection', () => {
  it.each(Object.keys(ORDERS) as (keyof typeof ORDERS)[])('runs exactly one %s farm order', recipe => {
    let s = run(createGame(0), {type: 'buyBuilding', kind: 'farm', x: 22, y: 20}); const id = s.buildings[1].id;
    s = run(s, {type: 'startOrder', id, recipe}); expect(s.pattes).toBe(290 - ORDERS[recipe].cost);
    refuses(s, {type: 'startOrder', id, recipe}, 'BUSY');
    refuses(s, {type: 'collectOrder', id}, 'NOT_READY', ORDERS[recipe].duration - 1);
    s = run(s, {type: 'collectOrder', id}, 100 * HOUR);
    expect(s.grass).toBe(10 + ORDERS[recipe].grass); expect(s.buildings[1].order).toBeNull();
    refuses(s, {type: 'collectOrder', id}, 'NOT_READY');
  });
  it('refuses an unaffordable order', () => {
    const s = run(createGame(0), {type: 'buyBuilding', kind: 'farm', x: 22, y: 20}); s.pattes = 0;
    refuses(s, {type: 'startOrder', id: s.buildings[1].id, recipe: 'small'}, 'NOT_ENOUGH_PATTES');
  });
  it('requires 380 grass to reach affection 20, then refuses more food', () => {
    let s = createGame(0); s.grass = 380;
    for (let affection = 1; affection < 20; affection++) {
      const before = s.grass; s = run(s, {type: 'feed', id: 'rabbit-2'});
      expect(before - s.grass).toBe(2 * affection);
    }
    expect(s.grass).toBe(0); expect(s.rabbits[0].affection).toBe(20); expect(rabbitIncome(20)).toBe(29);
    refuses(s, {type: 'feed', id: 'rabbit-2'}, 'MAX_AFFECTION');
    refuses(s, {type: 'feed', id: 'rabbit-3'}, 'NOT_ENOUGH_GRASS');
  });
});

describe('breeding probabilities and pity', () => {
  it('matches the approved probability tables that remain (Terre, Mottelin and Brumelin were removed)', () => {
    expect(breedingOdds('paille', 'paille')).toEqual({paille: 100});
    expect(breedingOdds('neige', 'neige')).toEqual({neige: 100});
    expect(breedingOdds('paille', 'neige')).toEqual({frisket:50,icy:50});
  });
  it('covers all 3 unordered pairs of the remaining historical species, with exact weights and symmetric rules', () => {
    for (let i = 0; i < LEGACY_SPECIES_IDS.length; i++) for (let j = i; j < LEGACY_SPECIES_IDS.length; j++) {
      const a = LEGACY_SPECIES_IDS[i], b = LEGACY_SPECIES_IDS[j]; const odds = breedingOdds(a, b);
      expect(odds).toEqual(breedingOdds(b, a));
      const key = [...new Set([...SPECIES[a].types, ...SPECIES[b].types])].sort().join(',');
      const expected = key === 'neige,paille' ? {frisket:30,icy:30} : {...BREEDING_ODDS[key], ...(key.includes('paille') && key.includes('neige') ? {frisket:30, icy:30} : {})};
      const total = Object.values(expected).reduce((sum,w) => sum+w,0);
      expect(odds).toEqual(Object.fromEntries(Object.entries(expected).map(([id,w]) => [id,w*100/total])));
      const counts: Partial<Record<SpeciesId, number>> = {};
      for (let point = 0; point < total; point++) {
        const chosen = chooseBirth(createGame(0), a, b, (point + 0.5) / total).species;
        counts[chosen] = (counts[chosen] ?? 0) + 1;
      }
      expect(counts).toEqual(expected);
    }
  });
  it('respects exact probability boundaries', () => {
    const s = createGame(0);
    expect(chooseBirth(s, 'paille', 'neige', 0).species).toBe('frisket');
    expect(chooseBirth(s, 'paille', 'neige', .5-Number.EPSILON).species).toBe('frisket');
    expect(chooseBirth(s, 'paille', 'neige', .5).species).toBe('icy');
  });
  it('checks distinct parents, affection, costs and buildings', () => {
    const s = createGame(0);
    refuses(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-2']}, 'SAME_PARENT');
    refuses(s, breed, 'AFFECTION_TOO_LOW');
    const fed = run(run(s, {type: 'feed', id: 'rabbit-2'}), {type: 'feed', id: 'rabbit-3'});
    refuses(fed, breed, 'MISSING_BUILDING');
    const ready = setup(); ready.pattes=0;ready.hearts=0;expect(run(ready,breed).pattes).toBe(0);
  });
  it('does not count ineligible attempts, including already discovered hybrids', () => {
    const s = createGame(0); s.pityFailures = 7;
    expect(chooseBirth(s, 'neige', 'neige', 0).pityFailures).toBe(7);
    s.discovered.push('frisket','icy'); expect(chooseBirth(s, 'paille', 'neige', 0).pityFailures).toBe(7);
  });
  it('guarantees the tenth eligible attempt after nine actual failures', () => {
    let s = setup(); s.rabbits[0].species='feu'; s.discovered.push('feu','wat-wat','glassofeu'); s.rabbits.forEach(r => r.affection = 4);
    for (let attempt = 1; attempt <= 7; attempt++) {
      s = run(s, breed, s.lastSimulatedAt, 0); expect(s.pityFailures).toBe(attempt);
      s=sendToNursery(s,s.lastSimulatedAt+20*MINUTE);s = run(s, welcomeOf(s, secondEnclosure(s)), s.lastSimulatedAt + 5 * MINUTE);
      s = run(s, {type: 'release', id: s.rabbits.at(-1)!.id});
    }
    let calls = 0;
    const result = act(s, breed, s.lastSimulatedAt, () => { calls++; return 0; });
    expect(result.ok).toBe(true); if (!result.ok) return;
    s = result.state; expect(calls).toBe(1);
    expect(nest(s).breeding!.birth).toMatchObject({species: 'feu-glace', guaranteed: true, reservedDiscovery: true});
    expect(s.pityFailures).toBe(0); expect(s.discovered).not.toContain('feu-glace');
    expect(pendingDiscoveries(s)).toEqual(['feu-glace']);
    const decoded = decodeGame(encodeGame(s)); expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(advance(decoded.state, s.lastSimulatedAt + 35 * MINUTE)).toEqual(advance(s, s.lastSimulatedAt + 35 * MINUTE));
      const deadline=s.lastSimulatedAt+20*MINUTE;s=sendToNursery(decoded.state,deadline);s = run(s, welcomeOf(s, secondEnclosure(s)), deadline+30*MINUTE);
    }
    expect(s.discovered).toContain('feu-glace'); expect(pendingDiscoveries(s)).toEqual([]); expect(s.pityFailures).toBe(0);
  });
  it('splits a guarantee equally between two unknown eligible hybrids', () => {
    const s = createGame(0);s.discovered.push('frisket','icy','ardent','snk','wat-wat','glassofeu'); s.pityFailures = 7;
    expect(chooseBirth(s, 'feu-glace', 'paille', 0.499, 4, 4).species).toBe('feu-glace');
    expect(chooseBirth(s, 'feu-glace', 'paille', 0.5, 4, 4).species).toBe('bouee');
  });
  it('reserves a random new hybrid without marking it discovered', () => {
    const s = setup(); s.rabbits[0].species='feu'; s.discovered.push('feu','wat-wat','glassofeu'); s.rabbits.forEach(r => r.affection = 4); s.pityFailures = 6;
    const next = run(s, breed, 0, 0.5); expect(next.pityFailures).toBe(0);
    expect(next.discovered).not.toContain('feu-glace'); expect(pendingDiscoveries(next)).toEqual(['feu-glace']);
    expect(nest(next).breeding!.birth.guaranteed).toBe(false);
  });
  it('keeps a guaranteed result and its counter coherent while another birth waits', () => {
    let s = setup(); s.rabbits[0].species='feu'; s.discovered.push('feu','wat-wat','glassofeu'); s.rabbits.forEach(r => r.affection = 4); s.pityFailures = 7;
    s = run(s, breed, 0, 0); s = sendToNursery(advance(s, 20 * MINUTE));
    expect(babyOf(nursery(s))!.birth.guaranteed).toBe(true);
    s = run(s, breed, 20 * MINUTE, 0);
    expect(nest(s).breeding!.birth.guaranteed).toBe(false); expect(s.pityFailures).toBe(1);
    s = advance(s, HOUR);
    const decoded = decodeGame(encodeGame(s)); expect(decoded).toEqual({ok: true, state: s});
    s = run(s, welcomeOf(s, secondEnclosure(s)), HOUR);
    expect(s.pityFailures).toBe(0); expect(s.discovered).toContain('feu-glace');
    expect(babyOf(nursery(s))).toBeNull();s=sendToNursery(s);expect(babyOf(nursery(s))!.birth.species).toBe('neige');
  });
});

describe('nursery, capacity and release', () => {
  it('holds a second birth at the nest and starts growth exactly when space is freed', () => {
    let s = run(setup(), breed); s = sendToNursery(advance(s, 20 * MINUTE));
    s = run(s, breed, 20 * MINUTE, 0.65);
    const blocked = advance(s, 2 * HOUR);
    expect(babyOf(nursery(blocked))!.startedAt).toBe(20 * MINUTE);
    expect(nest(blocked).breeding!.endsAt).toBe(40 * MINUTE);
    let split = s; for (let t = 21 * MINUTE; t <= 2 * HOUR; t += MINUTE) split = advance(split, t);
    expect(split).toEqual(blocked);
    s = run(blocked, welcomeOf(blocked, secondEnclosure(blocked)), 2 * HOUR);
    expect(babyOf(nursery(s))).toBeNull();s=sendToNursery(s);expect(nest(s).breeding).toBeNull(); expect(babyOf(nursery(s))!.startedAt).toBe(2 * HOUR);
    expect(babyOf(nursery(s))!.readyAt).toBe(2 * HOUR + 30 * MINUTE);
  });
  it('refuses welcoming early and avoids retroactive income after a late welcome', () => {
    let s = run(setup(), breed);
    refuses(s, welcomeOf(s, secondEnclosure(s)), 'NOT_READY', 24 * MINUTE);
    s=sendToNursery(s,20*MINUTE);s = run(s, welcomeOf(s, secondEnclosure(s)), HOUR);
    expect(s.buildings.find(b => b.id === secondEnclosure(s))!.incomeUnits).toBe(0);
    expect(advance(s, 2 * HOUR).buildings.find(b => b.id === secondEnclosure(s))!.incomeUnits).toBe(14*HOUR);
  });
  it('enforces enclosure capacity for purchases, transfers and welcomes', () => {
    let s = run(setup(), {type: 'buyRabbit', species: 'neige', enclosureId: enclosure});
    refuses(s, {type: 'buyRabbit', species: 'paille', enclosureId: enclosure}, 'CAPACITY_FULL');
    s = run(s, {type: 'buyRabbit', species: 'paille', enclosureId: secondEnclosure(s)});
    refuses(s, {type: 'moveRabbit', id: s.rabbits.at(-1)!.id, enclosureId: enclosure}, 'CAPACITY_FULL');
    s = run(s, breed);s=sendToNursery(s,20*MINUTE); refuses(s, welcomeOf(s, enclosure), 'CAPACITY_FULL', 50 * MINUTE);
    expect(babyOf(nursery(s))).not.toBeNull();
  });
  it('protects last representatives, retains discoveries and settles income before release', () => {
    let s = createGame(0); refuses(s, {type: 'release', id: 'rabbit-2'}, 'LAST_OF_SPECIES');
    s = run(s, {type: 'buyRabbit', species: 'paille', enclosureId: enclosure});
    const duplicate = s.rabbits.at(-1)!.id;
    s = run(s, {type: 'release', id: duplicate}, HOUR);
    expect(s.buildings[0].incomeUnits).toBe(30 * HOUR); expect(s.discovered).toContain('paille');
    expect(advance(s, 2 * HOUR).buildings[0].incomeUnits).toBe(50 * HOUR);
    refuses(s, {type: 'release', id: 'rabbit-2'}, 'LAST_OF_SPECIES');
  });
  it('protects an active parent even when a duplicate exists', () => {
    let s = run(setup(), {type: 'buyRabbit', species: 'paille', enclosureId: secondEnclosure(setup())});
    s = run(s, breed); refuses(s, {type: 'release', id: 'rabbit-2'}, 'PARENT_BUSY');
    refuses(s,{type:'release',id:'rabbit-2'},'PARENT_BUSY',20*MINUTE);s=sendToNursery(s,20*MINUTE);
    s = run(s, {type: 'release', id: 'rabbit-2'}, 20 * MINUTE);
    expect(s.rabbits.some(r => r.id === 'rabbit-2')).toBe(false);
  });
});

describe('JSON format', () => {
  it('never mutates the caller on successful actions or resumes', () => {
    const s = setup(); const before = structuredClone(s);
    run(s, breed, HOUR, 0.9); advance(s, 48 * HOUR);
    expect(s).toEqual(before);
  });
  it('round-trips initial state and a state with fractions, a farm order and a saved result', () => {
    expect(decodeGame(encodeGame(createGame(42)))).toEqual({ok: true, state: createGame(42)});
    let s = run(setup(), {type: 'buyBuilding', kind: 'farm', x: 22, y: 24});
    s = run(s, {type: 'startOrder', id: s.buildings.at(-1)!.id, recipe: 'large'});
    s = run(s, breed, 17, 0.9); expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it('rejects malformed files, unsupported versions and corrupt cross references', () => {
    expect(decodeGame('{')).toEqual({ok: false, reason: 'INVALID_JSON'});
    expect(decodeGame('{"version":99}')).toEqual({ok: false, reason: 'UNSUPPORTED_VERSION'});
    const s = createGame(0); s.rabbits[0].enclosureId = 'building-999';
    expect(decodeGame(JSON.stringify(s))).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(decodeGame(' '.repeat(1_000_001))).toEqual({ok: false, reason: 'FILE_TOO_LARGE'});
  });
  it('rejects invalid capacities, counters, identities, timestamps and reservations', () => {
    const mutations: ((s: GameState) => void)[] = [
      s => { s.pityFailures = 8; }, s => { s.nextId = 1; },
      s => { s.buildings[1].x = 0; }, s => { s.rabbits[0].affection = 21; },
      s => { nest(s).breeding!.endsAt++; }, s => { nest(s).breeding!.birth.guaranteed = true; nest(s).breeding!.birth.reservedDiscovery=false; },
      s => { s.discovered = []; }, s => { s.rabbits.push({...s.rabbits[0]}); },
    ];
    for (const mutate of mutations) { const s = run(setup(), breed); mutate(s); expect(decodeGame(JSON.stringify(s)).ok).toBe(false); }
  });
});
