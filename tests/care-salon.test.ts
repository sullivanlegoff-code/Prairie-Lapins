import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {BALANCE, HOUR, SALON, carePrice, type SpeciesId} from '../src/config/balance';
import {MISSION_CYCLE_DURATION} from '../src/config/missions';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {atSalon, away, giftReason} from '../src/simulation/care';
import {emptyBuilding} from '../src/state/initial';
import type {Command, GameState} from '../src/state/types';
import {evolveAbove30} from './evolved';

function run(s: GameState, command: Command, now = s.lastSimulatedAt) {
  const r = act(s, command, now, () => 0); if (!r.ok) throw Error(r.reason); return r.state;
}
function refused(s: GameState, c: Command, reason: string, now = s.lastSimulatedAt) {
  expect(act(s, c, now, () => 0)).toEqual({ok: false, state: s, reason});
}
/** A free place for a building of `kind` (the salon is 6 × 6 since 10 November 2026; others default to 4 × 4). */
function freeCell(s: GameState, kind?: 'enclosure' | 'salon') {
  // The starting parcel has no room for the 6 × 6 spa next to the other buildings: the salon goes on the south parcel, cleared.
  if (kind === 'salon' && !s.acquiredParcels.includes('south')) { s.acquiredParcels.push('south'); s.debris = []; }
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, undefined, kind)) return {x, y};
  throw Error('No space');
}
const atLevel = (s: GameState, level: number) => { s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s; };
/** Level 25, two statues, a bought salon and a universal level 3 enclosure holding one rabbit of each given species. */
function setup(species: SpeciesId[] = ['paille'], affection = 20, statues = 2) {
  let s = atLevel(createGame(0), 25); s.pattes = 1_000_000;
  for (let i = 0; i < statues; i++) { const c = freeCell(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'statue', c.x, c.y)); }
  // A level 3 universal enclosure (nine places) kept on the 4 × 4 footprint.
  const c = freeCell(s, 'enclosure'), home = emptyBuilding(`building-${s.nextId++}`, 'enclosure', c.x, c.y); home.habitat = {type: 'universal', level: 3};
  s.buildings.push(home);
  s = run(s, {type: 'buyBuilding', kind: 'salon', ...freeCell(s, 'salon')});
  const ids = species.map(sp => { const id = `rabbit-${s.nextId++}`; s.rabbits.push({id, species: sp, affection, enclosureId: home.id}); if (!s.discovered.includes(sp)) s.discovered.push(sp); return id; });
  s.rabbits.forEach(evolveAbove30);
  return {s, ids, home: home.id, salon: s.buildings.find(b => b.kind === 'salon')!.id};
}

describe('Salon de soins: the building', () => {
  it('costs 5 000 pattes from player level 22 (12 before the Christmas update), one at most', () => {
    expect(BALANCE.buildings.salon).toEqual({price: 5000, maximum: 1});
    const low = atLevel(createGame(0), 21); low.pattes = 10_000;
    refused(low, {type: 'buyBuilding', kind: 'salon', ...freeCell(low, 'salon')}, 'LEVEL_REQUIRED');
    const poor = atLevel(createGame(0), 22); poor.pattes = 4_999;
    refused(poor, {type: 'buyBuilding', kind: 'salon', ...freeCell(poor, 'salon')}, 'NOT_ENOUGH_PATTES');
    const ok = atLevel(createGame(0), 22); ok.pattes = 12_000;
    const bought = run(ok, {type: 'buyBuilding', kind: 'salon', ...freeCell(ok, 'salon')});
    expect(bought.pattes).toBe(7_000); expect(bought.buildings.filter(b => b.kind === 'salon')).toHaveLength(1);
    refused(bought, {type: 'buyBuilding', kind: 'salon', ...freeCell(bought, 'salon')}, 'BUILDING_LIMIT');
  });
  it('refuses a care without a salon', () => {
    const s = atLevel(createGame(0), 12);
    refused(s, {type: 'startCare', rabbitId: 'rabbit-2', care: 'bath'}, 'MISSING_BUILDING');
  });
});

describe('Salon de soins: the cares', () => {
  it('prices each care by rarity: 50 %, full and 150 % (3 November 2026)', () => {
    const full = {paille: 300, frisket: 800, magicien: 2000, dragon: 3500, benny: 5000} as const;
    for (const [species, price] of Object.entries(full) as [SpeciesId, number][]) {
      expect(carePrice(species, 'bath')).toBe(price * 0.5);
      expect(carePrice(species, 'brush')).toBe(price);
      expect(carePrice(species, 'massage')).toBe(price * 1.5);
    }
  });
  for (const [care, hours, xp] of [['bath', 1, 10], ['brush', 2, 25], ['massage', 3, 45]] as const) {
    it(`${care}: paid at the start, ${hours} h away, +1 affection and ${xp} XP on return`, () => {
      const {s, ids: [id]} = setup(['frisket'], 20);
      const started = run(s, {type: 'startCare', rabbitId: id, care});
      expect(started.pattes).toBe(s.pattes - carePrice('frisket', care));
      expect(started.care).toEqual({rabbitId: id, care, startedAt: 0, endsAt: hours * HOUR, hearts: SALON.cares[care].hearts});
      expect(started.affectionGifts).toEqual({[id]: 0});
      expect(started.rabbits.find(r => r.id === id)!.affection).toBe(20);
      expect(atSalon(started, id) && away(started, id)).toBe(true);
      refused(started, {type: 'claimCare', rabbitId: id}, 'NOT_READY', hours * HOUR - 1);
      const back = run(started, {type: 'claimCare', rabbitId: id}, hours * HOUR);
      expect(back.rabbits.find(r => r.id === id)!.affection).toBe(21);
      expect(back.progression.totalXp - started.progression.totalXp).toBe(xp);
      expect(back.care).toBeUndefined(); expect(away(back, id)).toBe(false);
      expect(SALON.cares[care]).toMatchObject({hours, xp});
    });
  }
  it('takes one rabbit at a time', () => {
    const {s, ids: [a, b]} = setup(['paille', 'neige']);
    const started = run(s, {type: 'startCare', rabbitId: a, care: 'bath'});
    refused(started, {type: 'startCare', rabbitId: b, care: 'bath'}, 'BUSY');
  });
  it('keeps the rabbit away: no meal, trip, move, release, breeding or Cuisine while in care', () => {
    const {s, ids: [a, b]} = setup(['paille', 'paille']);
    const agency = freeCell(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'agency', agency.x, agency.y));
    const kitchen = freeCell(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'kitchen', kitchen.x, kitchen.y));
    s.grass = 100_000;
    const started = run(s, {type: 'startCare', rabbitId: a, care: 'massage'});
    refused(started, {type: 'feed', id: a}, 'AT_SALON');
    refused(started, {type: 'startTrip', rabbitId: a}, 'AT_SALON');
    refused(started, {type: 'moveRabbit', id: a, enclosureId: 'building-1'}, 'AT_SALON');
    refused(started, {type: 'release', id: a}, 'AT_SALON');
    refused(started, {type: 'breed', parents: [a, b]}, 'AT_SALON');
    refused(started, {type: 'rewardCuisine', rabbitId: a, recipeId: 'moelleux'}, 'AT_SALON');
    // The other rabbit stays free.
    expect(run(started, {type: 'feed', id: b}).rabbits.find(r => r.id === b)!.affection).toBe(21);
  });
  it('refuses a traveller or a parent at the nest', () => {
    const {s, ids: [a, b]} = setup(['paille', 'neige']);
    const agency = freeCell(s); s.buildings.push(emptyBuilding(`building-${s.nextId++}`, 'agency', agency.x, agency.y));
    const away = run(s, {type: 'startTrip', rabbitId: a});
    refused(away, {type: 'startCare', rabbitId: a, care: 'bath'}, 'TRAVELING');
    const nest = run(s, {type: 'breed', parents: [a, b]});
    refused(nest, {type: 'startCare', rabbitId: a, care: 'bath'}, 'PARENT_BUSY');
  });
  it('refuses a second gift the same day, then accepts it on the next daily cycle', () => {
    const {s, ids: [id]} = setup(['paille'], 20);
    const back = run(run(s, {type: 'startCare', rabbitId: id, care: 'bath'}), {type: 'claimCare', rabbitId: id}, HOUR);
    refused(back, {type: 'startCare', rabbitId: id, care: 'bath'}, 'GIFT_TODAY', 2 * HOUR);
    expect(giftReason(back, back.rabbits[1], 2 * HOUR)).toBe('GIFT_TODAY');
    const tomorrow = MISSION_CYCLE_DURATION;
    expect(giftReason(back, back.rabbits[1], tomorrow)).toBeNull();
    const again = run(back, {type: 'startCare', rabbitId: id, care: 'bath'}, tomorrow);
    expect(again.affectionGifts![id]).toBe(1);
  });
  it('refuses at the walls 14, 29 and 49: those steps are won by feeding', () => {
    for (const wall of [14, 29, 49]) {
      const {s, ids: [id]} = setup(['paille'], wall);
      refused(s, {type: 'startCare', rabbitId: id, care: 'bath'}, 'AFFECTION_WALL');
    }
    for (const open of [13, 15, 28, 30, 48]) {
      const {s, ids: [id]} = setup(['paille'], open);
      expect(run(s, {type: 'startCare', rabbitId: id, care: 'bath'}).care?.rabbitId).toBe(id);
    }
  });
  it('respects the statues and the maximum of 50', () => {
    const none = setup(['paille'], 14, 0); refused(none.s, {type: 'startCare', rabbitId: none.ids[0], care: 'bath'}, 'STATUE_REQUIRED');
    const first = setup(['paille'], 30, 1); refused(first.s, {type: 'startCare', rabbitId: first.ids[0], care: 'bath'}, 'SECOND_STATUE_REQUIRED');
    const max = setup(['paille'], 50); refused(max.s, {type: 'startCare', rabbitId: max.ids[0], care: 'bath'}, 'MAX_AFFECTION');
  });
  it('refuses without enough pattes, and nothing changes', () => {
    const {s, ids: [id]} = setup(['dragon']); s.pattes = 3_499;
    refused(s, {type: 'startCare', rabbitId: id, care: 'brush'}, 'NOT_ENOUGH_PATTES');
    expect(run(s, {type: 'startCare', rabbitId: id, care: 'bath'}).pattes).toBe(3_499 - 1_750);
  });
  it('is not paid with Hearts', () => {
    const {s, ids: [id]} = setup(['paille']);
    refused(s, {type: 'payWithHearts', action: {type: 'startCare', rabbitId: id, care: 'bath'} as never, maxHearts: 999, maxPattes: s.pattes}, 'INVALID_CHOICE');
  });
  it('Benny, the Mythic, follows the same rules', () => {
    const {s, ids: [id]} = setup(['benny'], 20);
    const started = run(s, {type: 'startCare', rabbitId: id, care: 'massage'});
    expect(s.pattes - started.pattes).toBe(7_500);
    expect(run(started, {type: 'claimCare', rabbitId: id}, 3 * HOUR).rabbits.find(r => r.id === id)!.affection).toBe(21);
  });
});

describe('Salon de soins: the save', () => {
  it('keeps a care under way through a save round trip, and resumes it', () => {
    const {s, ids: [id]} = setup(['frisket']);
    const started = run(s, {type: 'startCare', rabbitId: id, care: 'brush'});
    const decoded = decodeGame(encodeGame(started)); if (!decoded.ok) throw Error(decoded.reason);
    expect(decoded.state.care).toEqual(started.care); expect(decoded.state.affectionGifts).toEqual({[id]: 0});
    expect(run(decoded.state, {type: 'claimCare', rabbitId: id}, 2 * HOUR).rabbits.find(r => r.id === id)!.affection).toBe(21);
  });
  it('refuses an inconsistent care: wrong length, no salon, no reserved gift, also travelling', () => {
    const {s, ids: [id]} = setup(['frisket']);
    const started = run(s, {type: 'startCare', rabbitId: id, care: 'brush'});
    const bad = (change: (raw: GameState) => void) => { const raw = JSON.parse(encodeGame(started)); change(raw); return decodeGame(JSON.stringify(raw)); };
    expect(bad(raw => { raw.care!.endsAt += HOUR; })).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(bad(raw => { raw.buildings = raw.buildings.filter(b => b.kind !== 'salon'); })).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(bad(raw => { delete raw.affectionGifts; })).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(bad(raw => { raw.affectionGifts![id] = 5; })).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(bad(raw => { raw.care!.rabbitId = 'rabbit-999'; })).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(bad(raw => { raw.buildings.push({...raw.buildings.find(b => b.kind === 'salon')!, id: 'building-998', x: 0, y: 0}); })).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(bad(raw => { raw.picnicCycle = 3; })).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
  it('loads a v22 save without the new fields', () => {
    const {s} = setup(['paille']);
    const raw = JSON.parse(encodeGame(s)); raw.version = 22; raw.buildings = raw.buildings.filter((b: {kind: string}) => b.kind !== 'salon');
    const decoded = decodeGame(JSON.stringify(raw)); if (!decoded.ok) throw Error(decoded.reason);
    expect(decoded.state.version).toBe(28);
    expect(decoded.state.care).toBeUndefined(); expect(decoded.state.affectionGifts).toBeUndefined(); expect(decoded.state.picnicCycle).toBeUndefined();
  });
  it('a released rabbit leaves no gift entry', () => {
    const {s, ids: [a]} = setup(['paille', 'paille']);
    const back = run(run(s, {type: 'startCare', rabbitId: a, care: 'bath'}), {type: 'claimCare', rabbitId: a}, HOUR);
    expect(run(back, {type: 'release', id: a}).affectionGifts).toEqual({});
  });
});
