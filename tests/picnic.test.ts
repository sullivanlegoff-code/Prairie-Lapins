import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {HOUR, PICNIC, type SpeciesId} from '../src/config/balance';
import {MISSION_CYCLE_DURATION} from '../src/config/missions';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {picnicQuote} from '../src/simulation/care';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState} from '../src/state/types';

function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r.state;
}
function refused(s: GameState, c: Command, reason: string, now = s.lastSimulatedAt) {
  expect(act(s, c, now, () => 0)).toEqual({ok: false, state: s, reason});
}
function freeCell(s: GameState) {
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y};
  throw Error('No space');
}
/** Player level `level`, two statues, a salon, and a universal level 3 enclosure with these rabbits (species, affection). */
function setup(rabbits: [SpeciesId, number][], level = 8) {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; s.pattes = 100_000;
  for (const kind of ['statue', 'statue', 'salon'] as const) { const c = freeCell(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, kind, c.x, c.y)); }
  const c = freeCell(s), home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); home.habitat = {type: 'universal', level: 3}; s.buildings.push(home);
  const ids = rabbits.map(([species, affection]) => { const id = `rabbit-${s.nextId++}`; s.rabbits.push({id, species, affection, enclosureId: home.id}); if (!s.discovered.includes(species)) s.discovered.push(species); return id; });
  return {s, ids, home: home.id};
}
const affection = (s: GameState, id: string) => s.rabbits.find(r => r.id === id)!.affection;

describe('picnic', () => {
  it('opens at player level 8', () => {
    expect(PICNIC).toEqual({unlockLevel: 8, pricePerRabbit: 300, xpPerRabbit: 10});
    const {s, home} = setup([['paille', 5]], 7);
    refused(s, {type: 'picnic', enclosureId: home, expectedCost: 300}, 'LEVEL_REQUIRED');
  });
  it('costs 300 pattes and gives 10 XP per rabbit present, +1 affection to each one that may receive a gift', () => {
    const {s, ids: [a, b, c], home} = setup([['paille', 5], ['frisket', 20], ['magicien', 33]]);
    const done = run(s, {type: 'picnic', enclosureId: home, expectedCost: 900});
    expect(s.pattes - done.pattes).toBe(900);
    expect(done.progression.totalXp - s.progression.totalXp).toBe(30);
    expect([affection(done, a), affection(done, b), affection(done, c)]).toEqual([6, 21, 34]);
    expect(done.picnicCycle).toBe(0); expect(done.affectionGifts).toEqual({[a]: 0, [b]: 0, [c]: 0});
  });
  it('only eligible rabbits gain: walls, a missing statue, 50 and today’s gift are skipped, and they keep their gift', () => {
    const {s, ids, home} = setup([['paille', 14], ['paille', 29], ['paille', 49], ['paille', 50], ['neige', 10], ['feu', 10]]);
    s.buildings = s.buildings.filter(b => b.kind !== 'statue' || b.id !== s.buildings.find(x => x.kind === 'statue')!.id); // One statue: 30 is a cap.
    s.rabbits.push({id: `rabbit-${s.nextId++}`, species: 'volant', affection: 30, enclosureId: home}); s.discovered.push('volant');
    // The `feu` rabbit had a care this morning.
    const cared = run(run(s, {type: 'startCare', rabbitId: ids[5], care: 'bath'}), {type: 'claimCare', rabbitId: ids[5]}, HOUR);
    const quote = picnicQuote(cared, home, HOUR, 8);
    expect(quote.guests).toHaveLength(7); expect(quote.winners.map(r => r.id)).toEqual([ids[4]]); expect(quote.price).toBe(2100);
    const done = run(cared, {type: 'picnic', enclosureId: home, expectedCost: 2100}, HOUR);
    expect(done.rabbits.filter(r => r.enclosureId === home).map(r => r.affection)).toEqual([14, 29, 49, 50, 11, 11, 30]);
    expect(Object.keys(done.affectionGifts!).sort()).toEqual([ids[4], ids[5]].sort());
  });
  it('is one a day in all, whatever the enclosure, and comes back on the next daily cycle', () => {
    const {s, ids: [a], home} = setup([['paille', 5]]);
    const done = run(s, {type: 'picnic', enclosureId: home, expectedCost: 300});
    refused(done, {type: 'picnic', enclosureId: 'building-1', expectedCost: 300}, 'PICNIC_TODAY');
    refused(done, {type: 'picnic', enclosureId: home, expectedCost: 300}, 'PICNIC_TODAY', MISSION_CYCLE_DURATION - 1);
    const tomorrow = run(done, {type: 'picnic', enclosureId: home, expectedCost: 300}, MISSION_CYCLE_DURATION);
    expect(affection(tomorrow, a)).toBe(7); expect(tomorrow.picnicCycle).toBe(1);
  });
  it('refuses when no rabbit can gain, or the enclosure is empty, or the price changed, or pattes are missing', () => {
    const wall = setup([['paille', 14]]);
    refused(wall.s, {type: 'picnic', enclosureId: wall.home, expectedCost: 300}, 'NO_GIFT_POSSIBLE');
    const empty = setup([]);
    refused(empty.s, {type: 'picnic', enclosureId: empty.home, expectedCost: 0}, 'EMPTY_ENCLOSURE');
    const two = setup([['paille', 5], ['neige', 5]]);
    refused(two.s, {type: 'picnic', enclosureId: two.home, expectedCost: 300}, 'PRICE_CHANGED');
    two.s.pattes = 599;
    refused(two.s, {type: 'picnic', enclosureId: two.home, expectedCost: 600}, 'NOT_ENOUGH_PATTES');
  });
  it('a rabbit away at the salon or on a trip is not a guest and does not pay', () => {
    const {s, ids: [a, b], home} = setup([['paille', 5], ['neige', 5]]);
    const care = run(s, {type: 'startCare', rabbitId: a, care: 'massage'});
    expect(picnicQuote(care, home, 0, 8)).toMatchObject({price: 300, xp: 10});
    const done = run(care, {type: 'picnic', enclosureId: home, expectedCost: 300});
    expect(affection(done, b)).toBe(6); expect(affection(done, a)).toBe(5);
  });
  it('after a picnic, the salon refuses the same rabbit today', () => {
    const {s, ids: [a], home} = setup([['paille', 5]]);
    const done = run(s, {type: 'picnic', enclosureId: home, expectedCost: 300});
    refused(done, {type: 'startCare', rabbitId: a, care: 'bath'}, 'GIFT_TODAY');
  });
  it('round-trips through the save', () => {
    const {s, home} = setup([['paille', 5]]);
    const done = run(s, {type: 'picnic', enclosureId: home, expectedCost: 300});
    const decoded = decodeGame(encodeGame(done)); if (!decoded.ok) throw Error(decoded.reason);
    expect(decoded.state.picnicCycle).toBe(0);
    refused(decoded.state, {type: 'picnic', enclosureId: home, expectedCost: 300}, 'PICNIC_TODAY');
  });
});
