import {describe, expect, it} from 'vitest';
import {SPECIES, SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {EVOLUTION_CHALLENGES, evolutionChallengeLabel, expectedEvolutionChallengeCount} from '../src/config/evolutionChallenges';
import {DAILY_MISSIONS, DAILY_MISSION_IDS, LEGACY_DAILY_MISSION_IDS, type DailyMissionId} from '../src/config/missions';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {recordDailyStreak} from '../src/simulation/evolution';
import {availableDailyMissions, dailyMissionsFor, dailyMissionsOf, pickDailyMissions, updateMissions} from '../src/simulation/missions';
import {MISSION_CYCLE_DURATION as MISSION_DAY} from '../src/config/missions';
import {emptyBuilding} from '../src/state/initial';
import {buildingPlacementReason} from '../src/simulation/placement';
import {cumulativeLevelXp} from '../src/simulation/progression';
import type {GameState} from '../src/state/types';

/** A universal level-3 enclosure (building-101) holding the given species at affection 30 (rabbit-110, rabbit-111, ...). */
function game(species: SpeciesId[] = [], extra: ('kitchen' | 'salon' | 'agency' | 'forest')[] = []): GameState {
  const s = createGame(0);
  if (extra.includes('salon')) { s.acquiredParcels.push('south'); s.debris = []; } // Room for the 6 × 6 spa.
  const free = (kind?: 'enclosure' | 'salon') => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, undefined, kind)) return {x, y}; throw Error('No space'); };
  let c = free('enclosure'); s.buildings.push(emptyBuilding('building-101', 'enclosure', c.x, c.y)); s.buildings.at(-1)!.habitat = {type: 'universal', level: 3};
  extra.forEach((kind, k) => { c = free(kind === 'salon' ? kind : undefined); s.buildings.push(emptyBuilding(`building-${102 + k}`, kind, c.x, c.y)); });
  species.forEach((id, k) => { s.rabbits.push({id: `rabbit-${110 + k}`, species: id, affection: 30, enclosureId: 'building-101'}); if (!s.discovered.includes(id)) s.discovered.push(id); });
  s.nextId = 200; return s;
}
const rabbit = (s: GameState, id: string) => s.rabbits.find(r => r.id === id)!;
const ok = (result: ReturnType<typeof act>) => { if (!result.ok) throw Error(result.reason); return result.state; };

describe('evolution challenges, owner distribution of 4 November 2026', () => {
  it('is exactly the requested list, with one challenge per Common, two per Rare and three per Epic or Legendary', () => {
    expect(EVOLUTION_CHALLENGES).toEqual({
      paille: ['voyage'], neige: ['soin'], feu: ['commis:chicken'], 'belier-gris': ['piquenique'], volant: ['quotidien'],
      frisket: ['piquenique', 'soin'], icy: ['soin', 'gouteur:moelleux'], ardent: ['commis:chicken', 'voyage'], snk: ['voyage', 'quotidien'],
      'pic-pic': ['voyage', 'piquenique'], amethyste: ['soin', 'parent'], 'princesse-neige': ['soin', 'gouteur:avocado-toast'], fluffy: ['piquenique', 'parent'],
      virvoletant: ['voyage', 'gouteur:chicken'], phoenix: ['voyage', 'commis:chicken'], roukette: ['corde:20', 'voyage'], 'wat-wat': ['piquenique', 'voyage'],
      glassofeu: ['commis:avocado-toast', 'soin'], plume: ['voyage', 'piquenique'], boudinet: ['commis:moelleux', 'gouteur:chicken'], bouee: ['voyage', 'piquenique'],
      egiiipte: ['voyage', 'voyage'], piment: ['gouteur:chicken', 'piquenique'], tunini: ['voyage', 'soin'], bretonette: ['commis:moelleux', 'voyage'],
      dadi: ['voyage', 'corde:20', 'soin'], maxou: ['voyage', 'quotidien', 'parent'], orange: ['soin', 'gouteur:moelleux', 'piquenique'],
      dinono: ['parent', 'piquenique', 'corde:10'], dinenette: ['parent', 'soin', 'commis:moelleux'], calinou: ['soin', 'piquenique', 'quotidien'],
      magicien: ['commis:avocado-toast', 'voyage', 'soin'], dragon: ['commis:chicken', 'voyage', 'corde:20'], requin: ['voyage', 'corde:20', 'piquenique'],
      ankylosaure: ['parent', 'corde:20', 'quotidien'],
      // The Christmas update's rabbits (5 and 6 November 2026).
      vantablack: ['voyage', 'corde:10'], fantome: ['piquenique', 'quotidien'], bouyoyo: ['soin', 'gouteur:moelleux'], nuage: ['voyage', 'soin'],
      champignon: ['piquenique', 'commis:moelleux'], 'gigi-rarafe': ['voyage', 'piquenique', 'corde:20'], yetiti: ['soin', 'piquenique', 'parent'],
      rennes: ['voyage', 'corde:20', 'quotidien'], susucre: ['commis:moelleux', 'gouteur:moelleux', 'soin'], 'lapin-de-sulli': ['gouteur:chicken', 'voyage', 'quotidien'],
      'pain-epice': ['commis:moelleux', 'gouteur:avocado-toast', 'piquenique'], 'flocon-cristal': ['soin', 'corde:20', 'parent'], arkoko: ['parent', 'voyage', 'quotidien'],
    });
    const byRarity: Record<string, number> = {};
    for (const species of SPECIES_IDS) {
      const list = EVOLUTION_CHALLENGES[species]; if (!list) continue;
      expect(list).toHaveLength(expectedEvolutionChallengeCount(SPECIES[species].rarity)!);
      byRarity[SPECIES[species].rarity] = (byRarity[SPECIES[species].rarity] ?? 0) + 1;
    }
    expect(byRarity).toEqual({common: 5, rare: 25, epic: 14, legendary: 4});
    expect(Object.values(EVOLUTION_CHALLENGES).flat().some(item => item?.startsWith('cuisine:'))).toBe(false);
  });
  it('labels the new challenges in the second person', () => {
    expect(evolutionChallengeLabel('commis:chicken')).toBe('Commis : cuisiner le poulet');
    expect(evolutionChallengeLabel('gouteur:moelleux')).toBe('Goûteur : goûter le moelleux');
    expect(evolutionChallengeLabel('commis:avocado-toast')).toBe('Commis : cuisiner l’avocado toast');
    expect(evolutionChallengeLabel('quotidien')).toBe('Réussir les missions du jour 3 jours de suite');
    expect(evolutionChallengeLabel('parent')).toBe('Devenir parent d’un lapereau');
  });
  it('counts a recipe for the commis challenge of the cook only, and for the taster challenge of the taster only', () => {
    // Boudinet: commis:moelleux and gouteur:chicken; Icy: gouteur:moelleux; Feu: commis:chicken.
    const s = game(['boudinet', 'icy', 'feu'], ['kitchen']);
    let next = ok(act(s, {type: 'rewardCuisine', rabbitId: 'rabbit-111', tasterId: 'rabbit-110', recipeId: 'moelleux'}, 0, () => 0));
    expect(rabbit(next, 'rabbit-110').evolution?.challenges ?? {}).toEqual({}); // Boudinet tasted the moelleux: not its commis challenge.
    expect(rabbit(next, 'rabbit-111').evolution?.challenges ?? {}).toEqual({}); // Icy cooked it: not its taster challenge.
    next = ok(act(next, {type: 'rewardCuisine', rabbitId: 'rabbit-110', tasterId: 'rabbit-111', recipeId: 'moelleux'}, 0, () => 0));
    expect(rabbit(next, 'rabbit-110').evolution?.challenges).toEqual({'commis:moelleux': 1});
    expect(rabbit(next, 'rabbit-111').evolution?.challenges).toEqual({'gouteur:moelleux': 1});
    next = ok(act(next, {type: 'rewardCuisine', rabbitId: 'rabbit-110', tasterId: 'rabbit-112', recipeId: 'chicken'}, 0, () => 0));
    expect(rabbit(next, 'rabbit-112').evolution?.challenges ?? {}).toEqual({}); // Feu tasted the chicken: its challenge is to cook it.
    expect(rabbit(next, 'rabbit-110').evolution?.challenges).toEqual({'commis:moelleux': 1}); // Boudinet cooked the chicken, not tasted it.
    next = ok(act(next, {type: 'rewardCuisine', rabbitId: 'rabbit-112', tasterId: 'rabbit-110', recipeId: 'chicken'}, 0, () => 0));
    expect(rabbit(next, 'rabbit-112').evolution?.challenges).toEqual({'commis:chicken': 1});
    expect(rabbit(next, 'rabbit-110').evolution?.challenges).toEqual({'commis:moelleux': 1, 'gouteur:chicken': 1});
    expect(decodeGame(encodeGame(next)).ok).toBe(true);
  });
});

describe('« Réussir les missions du jour 3 jours de suite »', () => {
  it('starts again after a missed day, validates on the third day in a row, and later for a rabbit that arrives meanwhile', () => {
    const s = game(['volant', 'paille']);
    recordDailyStreak(s, 4); recordDailyStreak(s, 5);
    expect(s.missions.streak).toEqual({count: 2, lastCycle: 5});
    recordDailyStreak(s, 7); // Cycle 6 was missed: the streak starts again.
    expect(s.missions.streak).toEqual({count: 1, lastCycle: 7});
    recordDailyStreak(s, 8); expect(rabbit(s, 'rabbit-110').evolution).toBeUndefined();
    recordDailyStreak(s, 9);
    expect(s.missions.streak).toEqual({count: 3, lastCycle: 9});
    expect(rabbit(s, 'rabbit-110').evolution?.challenges).toEqual({quotidien: 1});
    expect(rabbit(s, 'rabbit-111').evolution).toBeUndefined(); // Paille has no such challenge.
    s.rabbits.push({id: 'rabbit-150', species: 'maxou', affection: 10, enclosureId: 'building-101'}); s.discovered.push('maxou');
    recordDailyStreak(s, 10);
    expect(rabbit(s, 'rabbit-150').evolution?.challenges).toEqual({quotidien: 1});
    s.rabbits.push({id: 'rabbit-151', species: 'calinou', affection: 10, enclosureId: 'building-101'}); s.discovered.push('calinou');
    recordDailyStreak(s, 12); // A gap again: the late rabbit waits for a new streak.
    expect(rabbit(s, 'rabbit-151').evolution).toBeUndefined();
  });
  it('counts a day when the cycle bonus is claimed', () => {
    let s = game(['volant']);
    for (let day = 0; day < 3; day++) {
      s = advance(s, day * MISSION_DAY + 1000);
      const shown = dailyMissionsOf(s);
      for (const id of shown) s.missions.daily.progress[id] = DAILY_MISSIONS[id].target;
      for (const id of shown) s = ok(act(s, {type: 'claimDailyMission', id, cycleStart: day * MISSION_DAY}, day * MISSION_DAY + 1000));
      if (day < 2) expect(rabbit(s, 'rabbit-110').evolution).toBeUndefined();
      s = ok(act(s, {type: 'claimDailyBonus', cycleStart: day * MISSION_DAY}, day * MISSION_DAY + 1000));
      expect(s.missions.streak).toEqual({count: day + 1, lastCycle: day});
    }
    expect(rabbit(s, 'rabbit-110').evolution?.challenges).toEqual({quotidien: 1});
    const saved = decodeGame(encodeGame(s));
    expect(saved.ok && saved.state.missions.streak).toEqual({count: 3, lastCycle: 2});
  });
});

describe('save v24 → v25', () => {
  it('keeps a Cuisine progress as commis when the new list has it, forgets it otherwise, and keeps evolved rabbits evolved', () => {
    const s = game(['feu', 'icy', 'snk', 'boudinet', 'paille'], ['kitchen']);
    const raw = JSON.parse(encodeGame(s));
    expect(raw.version).toBe(28);
    raw.version = 24; delete raw.missions.daily.picked;
    raw.rabbits[1].evolution = {challenges: {'cuisine:chicken': 1}}; // Feu: commis:chicken now.
    raw.rabbits[2].evolution = {challenges: {'cuisine:moelleux': 1, soin: 1}}; // Icy: its moelleux is a taster challenge now.
    raw.rabbits[3].evolution = {done: true, challenges: {voyage: 2}}; // Snk evolved with two trips: now voyage + quotidien.
    raw.rabbits[4].evolution = {challenges: {'cuisine:moelleux': 1, 'cuisine:chicken': 1}}; // Boudinet: commis:moelleux kept.
    raw.rabbits[5].evolution = {challenges: {voyage: 1}};
    const decoded = decodeGame(JSON.stringify(raw));
    if (!decoded.ok) throw Error(decoded.reason);
    const loaded = decoded.state;
    expect(loaded.version).toBe(28);
    expect(rabbit(loaded, 'rabbit-110').evolution).toEqual({challenges: {'commis:chicken': 1}});
    expect(rabbit(loaded, 'rabbit-111').evolution).toEqual({challenges: {soin: 1}});
    expect(rabbit(loaded, 'rabbit-112').evolution).toEqual({done: true, challenges: {voyage: 1, quotidien: 1}});
    expect(rabbit(loaded, 'rabbit-113').evolution).toEqual({challenges: {'commis:moelleux': 1}});
    expect(rabbit(loaded, 'rabbit-114').evolution).toEqual({challenges: {voyage: 1}});
    // Nothing else is lost: the same buildings, rabbits, resources and progression.
    for (const key of ['pattes', 'grass', 'hearts', 'buildings', 'discovered', 'progression', 'decorations', 'nextId', 'acquiredParcels'] as const) expect(loaded[key]).toEqual(s[key]);
    // Only a rare's permanent income draw is added on load, as for every save (`historicalIncomeRoll`).
    expect(loaded.rabbits.map(({evolution: _e, incomeRoll: _i, ...r}) => r)).toEqual(s.rabbits.map(({evolution: _e, incomeRoll: _i, ...r}) => r));
    // The cycle under way keeps the three missions it showed in v24.
    expect(loaded.missions.daily.picked).toBeUndefined();
    expect(dailyMissionsOf(loaded)).toEqual(dailyMissionsFor(0, LEGACY_DAILY_MISSION_IDS));
  });
  it('loads a complete v24 save mid-cycle with its claimed daily mission and its bonus still possible', () => {
    let s = game(['paille', 'neige'], ['kitchen', 'salon']);
    s = advance(s, MISSION_DAY * 3 + 5000);
    const legacy = dailyMissionsFor(3, LEGACY_DAILY_MISSION_IDS);
    const raw = JSON.parse(encodeGame(s));
    raw.version = 24; delete raw.missions.daily.picked; delete raw.missions.daily.petted; delete raw.missions.streak;
    for (const id of DAILY_MISSION_IDS) if (!(LEGACY_DAILY_MISSION_IDS as readonly string[]).includes(id)) delete raw.missions.daily.progress[id];
    raw.missions.daily.progress[legacy[0]] = DAILY_MISSIONS[legacy[0]].target; raw.missions.daily.claimed = [legacy[0]];
    const decoded = decodeGame(JSON.stringify(raw));
    if (!decoded.ok) throw Error(decoded.reason);
    expect(dailyMissionsOf(decoded.state)).toEqual(legacy);
    expect(decoded.state.missions.daily.claimed).toEqual([legacy[0]]);
    expect(decoded.state.missions.daily.progress['pet-rabbits']).toBe(0);
  });
});

describe('caresses', () => {
  it('give nothing but the progress of « Des caresses », once per different rabbit', () => {
    let s = game(['paille', 'neige', 'feu', 'volant']);
    s.missions.daily.picked = ['pet-rabbits', 'collect-pattes', 'gain-affection'];
    const before = structuredClone(s);
    for (const id of ['rabbit-110', 'rabbit-110', 'rabbit-110']) s = ok(act(s, {type: 'petRabbit', rabbitId: id}, 0));
    expect(s.missions.daily.progress['pet-rabbits']).toBe(1);
    for (const key of ['pattes', 'grass', 'hearts', 'progression', 'rabbits'] as const) expect(s[key]).toEqual(before[key]);
    s = ok(act(s, {type: 'petRabbit', rabbitId: 'rabbit-111'}, 0));
    s = ok(act(s, {type: 'petRabbit', rabbitId: 'rabbit-112'}, 0));
    s = ok(act(s, {type: 'petRabbit', rabbitId: 'rabbit-113'}, 0));
    expect(s.missions.daily.progress['pet-rabbits']).toBe(3);
    expect(s.missions.daily.petted).toEqual(['rabbit-110', 'rabbit-111', 'rabbit-112']);
    for (const key of ['pattes', 'grass', 'hearts', 'progression', 'rabbits'] as const) expect(s[key]).toEqual(before[key]);
    expect(act(s, {type: 'petRabbit', rabbitId: 'rabbit-404'}, 0)).toMatchObject({ok: false, reason: 'NOT_FOUND'});
    expect(decodeGame(encodeGame(s)).ok).toBe(true);
    // A new cycle forgets who was caressed.
    s = advance(s, MISSION_DAY + 1);
    expect(s.missions.daily.petted).toBeUndefined();
  });
});

describe('daily missions offered by what the player can do', () => {
  const extras = ['cook-recipe', 'offer-care', 'short-trip', 'picnic', 'jump-rope', 'forest-walk'] as const satisfies readonly DailyMissionId[];
  it('offers each new mission only when it can be done', () => {
    const s = game(['paille']);
    expect(availableDailyMissions(s).filter(id => (extras as readonly string[]).includes(id))).toEqual([]);
    // The caresses need three rabbits (audit, 4 November 2026): this game has fewer.
    expect(s.rabbits.length).toBeLessThan(3); expect(availableDailyMissions(s)).not.toContain('pet-rabbits');
    const all = game(['paille'], ['kitchen', 'salon', 'agency', 'forest']);
    all.progression = {totalXp: cumulativeLevelXp(20), rewardedThroughLevel: 20}; all.jumpIsland = true;
    expect(availableDailyMissions(all).filter(id => (extras as readonly string[]).includes(id))).toEqual(['cook-recipe', 'offer-care', 'short-trip', 'picnic', 'jump-rope']);
    all.rabbits[1].evolution = {done: true, challenges: {voyage: 1}};
    expect(availableDailyMissions(all)).toContain('forest-walk');
    all.progression = {totalXp: cumulativeLevelXp(7), rewardedThroughLevel: 7};
    expect(availableDailyMissions(all)).not.toContain('picnic'); // Picnics open at level 8.
  });
  it('draws the three missions at the start of the cycle and keeps them even when a building is added', () => {
    let s = game(['paille']);
    // A cycle whose draw with a kitchen would show the recipe mission.
    const withKitchen = game(['paille'], ['kitchen']);
    let cycle = 1; while (!pickDailyMissions(withKitchen, cycle).includes('cook-recipe')) cycle++;
    s = advance(s, cycle * MISSION_DAY + 1);
    const drawn = dailyMissionsOf(s);
    expect(drawn).toEqual(pickDailyMissions(game(['paille']), cycle));
    expect(drawn).not.toContain('cook-recipe');
    s.buildings.push({...withKitchen.buildings.find(b => b.kind === 'kitchen')!});
    updateMissions(s, cycle * MISSION_DAY + 2000);
    expect(dailyMissionsOf(s)).toEqual(drawn);
    const reloaded = decodeGame(encodeGame(s)); if (!reloaded.ok) throw Error(reloaded.reason);
    expect(dailyMissionsOf(reloaded.state)).toEqual(drawn);
    // The next cycle draws with the kitchen.
    s = advance(s, (cycle + 1) * MISSION_DAY + 1);
    expect(dailyMissionsOf(s)).toEqual(pickDailyMissions(withKitchen, cycle + 1));
  });
  it('keeps the three missions varied and makes every new mission progress on its own action', () => {
    for (let cycle = 0; cycle < 60; cycle++) {
      const picked = pickDailyMissions({...game(['paille'], ['kitchen', 'salon', 'agency']), jumpIsland: true}, cycle);
      expect(picked).toHaveLength(3);
      expect(new Set(picked.map(id => DAILY_MISSIONS[id].category)).size).toBe(3);
    }
    let s = game(['paille', 'neige', 'feu'], ['kitchen', 'salon']);
    s.missions.daily.picked = ['cook-recipe', 'offer-care', 'collect-pattes'];
    s = ok(act(s, {type: 'rewardCuisine', rabbitId: 'rabbit-110', recipeId: 'chicken'}, 0, () => 0));
    expect(s.missions.daily.progress['cook-recipe']).toBe(1);
    s.pattes = 100_000;
    s = ok(act(s, {type: 'startCare', rabbitId: 'rabbit-111', care: 'bath'}, 0));
    expect(s.missions.daily.progress['offer-care']).toBe(1);
    expect(DAILY_MISSIONS['pet-rabbits']).toMatchObject({title: 'Des caresses', target: 3, place: 'pet', category: 'care'});
    for (const id of extras) expect(DAILY_MISSIONS[id].reward.amount).toBeGreaterThanOrEqual(30);
    for (const id of extras) expect(DAILY_MISSIONS[id].reward.amount).toBeLessThanOrEqual(40);
  });
});
