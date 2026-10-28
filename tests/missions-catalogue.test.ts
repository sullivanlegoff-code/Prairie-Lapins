import {describe, expect, it} from 'vitest';
import {act, advance, createGame, decodeGame, encodeGame} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {SPECIES, SPECIES_IDS} from '../src/config/balance';
import {DECORATION_IDS} from '../src/config/decorations';
import {MAIN_MISSIONS, MAIN_MISSION_IDS, DISCOVERY_MISSION_IDS, DECORATION_MISSION_IDS, MILESTONE_MISSION_IDS, SOLO_INITIAL_MISSION_IDS, mainMissionRewards} from '../src/config/missions';
import {activeMainMissions, availableMissionRewards, catalogueMainMissionIds, eligibleMainMissionIds, mainProgress, visibleMainMissions} from '../src/simulation/missions';
import {cumulativeLevelXp, missionClaimXp} from '../src/simulation/progression';
import {completeLaboratory} from '../src/dev/labActions';
import {previousStart} from './regression-start';
import type {Command, GameState} from '../src/state/types';

function atLevel(level = 7): GameState {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  return advance(s, 0);
}
function run(s: GameState, command: Command): GameState {
  const result = act(s, command, s.lastSimulatedAt); if (!result.ok) throw Error(result.reason); return result.state;
}
function reload(s: GameState): GameState {
  const decoded = decodeGame(encodeGame(s)); if (!decoded.ok) throw Error(decoded.reason); return decoded.state;
}

describe('full main mission catalogue from level seven', () => {
  it('contains one stable identifier per current species and decoration, and exactly twenty new milestones', () => {
    expect(DISCOVERY_MISSION_IDS).toEqual(SPECIES_IDS.map(id => `discover-${id}`)); expect(DISCOVERY_MISSION_IDS).toHaveLength(32);
    expect(DECORATION_MISSION_IDS).toEqual(DECORATION_IDS.map(id => `decorate-${id}`)); expect(DECORATION_MISSION_IDS).toHaveLength(13);
    expect(MILESTONE_MISSION_IDS).toHaveLength(20); expect(MAIN_MISSION_IDS).toHaveLength(96); expect(new Set(MAIN_MISSION_IDS).size).toBe(96);
    for (const id of ['discover-terre', 'discover-mottelin', 'discover-geant', 'discover-brumelin']) expect(Object.hasOwn(MAIN_MISSIONS, id)).toBe(false);
  });
  it('keeps the original sequential start below seven, then exposes all objectives even with an unfinished guide', () => {
    const young = atLevel(6); expect(visibleMainMissions(young)).toEqual(['snow-habitat']);
    expect(eligibleMainMissionIds(young)).not.toContain('discover-paille');
    expect(act(young, {type: 'claimMainMission', id: 'discover-paille'}, 0)).toMatchObject({ok: false, reason: 'NOT_READY'});
    const s = atLevel(); expect(visibleMainMissions(s)).toEqual(catalogueMainMissionIds(s)); expect(visibleMainMissions(s)).toHaveLength(93);
    expect(visibleMainMissions(s)).toEqual(expect.arrayContaining(['level-thirty', 'discover-dragon', 'decorate-robot-statue', 'snow-habitat']));
    const claimed = run(s, {type: 'claimMainMission', id: 'discover-paille'});
    expect(visibleMainMissions(claimed)).toContain('discover-paille'); expect(activeMainMissions(claimed)).not.toContain('discover-paille');
    expect(availableMissionRewards(claimed)).toBe(availableMissionRewards(s) - 1);
    expect(activeMainMissions(claimed).every(id => !claimed.missions.claimed.includes(id))).toBe(true);
  });
  it('keeps initial rewards scoped to the historical course and retired goals unclaimable at every level', () => {
    const s = previousStart(0); s.progression = {totalXp: cumulativeLevelXp(30), rewardedThroughLevel: 30};
    const state = advance(s, 0); expect(visibleMainMissions(state)).toHaveLength(91);
    for (const id of ['snow-habitat', 'welcome-snow', 'cozy-nest', 'welcome-babies', 'first-rare'] as const) {
      state.missions.completed.push(id);
      expect(visibleMainMissions(state)).not.toContain(id);
      expect(act(state, {type: 'claimMainMission', id}, 0)).toMatchObject({ok: false, reason: 'NOT_READY'});
    }
  });
  it.each(SPECIES_IDS)('pays all discovery components exactly once for %s, without new mission XP', species => {
    const initial = atLevel(); initial.discovered = [...new Set([...initial.discovered, species])];
    const s = advance(initial, 0), id = `discover-${species}` as const, definition = MAIN_MISSIONS[id];
    const rarity = SPECIES[species].rarity, rank = rarity === 'legendary' ? 4 : rarity === 'epic' ? 3 : rarity === 'rare' ? 2 : 1;
    expect(mainMissionRewards(definition)).toEqual([{resource: 'pattes', amount: 20 * rank}, {resource: 'grass', amount: 10 * rank}, ...(rank > 2 ? [{resource: 'hearts', amount: rank - 2}] : [])]);
    const claimed = run(s, {type: 'claimMainMission', id});
    expect([claimed.pattes - s.pattes, claimed.grass - s.grass, claimed.hearts - s.hearts]).toEqual([20 * rank, 10 * rank, Math.max(0, rank - 2)]);
    expect(claimed.progression).toEqual(s.progression); expect(missionClaimXp('main', id)).toBe(0);
    const loaded = reload(claimed); expect(act(loaded, {type: 'claimMainMission', id}, 0)).toMatchObject({ok: false, reason: 'ALREADY_CLAIMED', state: loaded});
  });
  it.each(['pattes', 'grass', 'hearts'] as const)('refuses the entire composite claim if %s would overflow', resource => {
    const initial = atLevel(); initial.discovered.push('dadi'); initial[resource] = Number.MAX_SAFE_INTEGER;
    const s = advance(initial, 0), before = structuredClone(s);
    expect(act(s, {type: 'claimMainMission', id: 'discover-dadi'}, 0)).toEqual({ok: false, reason: 'RESOURCE_LIMIT', state: before});
    expect(s).toEqual(before);
  });
  it('saves all three resources and the claim together; failed save, reload and import never pay twice', () => {
    const initial = atLevel(); initial.discovered.push('dadi'); const s = advance(initial, 0);
    let value = encodeGame(s), fail = false;
    const controller = new GameController({getItem: key => key === SAVE_KEY ? value : null, setItem: (_key, v) => { if (fail) throw Error('quota'); value = v; }}, () => 0);
    const savedBefore = value;
    const command: Command = {type: 'claimMainMission', id: 'discover-dadi'}, before = controller.getSnapshot().state;
    fail = true; expect(controller.perform(command)).toEqual({ok: false, reason: 'ACTION_NOT_SAVED'}); expect(controller.getSnapshot().state).toEqual(before); expect(value).toBe(savedBefore);
    fail = false; expect(controller.perform(command).ok).toBe(true);
    const paid = controller.getSnapshot().state!; expect([paid.pattes, paid.grass, paid.hearts]).toEqual([s.pattes + 60, s.grass + 30, s.hearts + 1]);
    const prepared = controller.prepareImport(value); if (!prepared.ok) throw Error(prepared.reason);
    expect(controller.confirmImport(prepared.token, true).ok).toBe(true); expect(controller.perform(command)).toMatchObject({ok: false, reason: 'ALREADY_CLAIMED'});
    const loaded = reload(paid); expect(loaded).toEqual(paid); expect(act(loaded, command, 0)).toMatchObject({ok: false, reason: 'ALREADY_CLAIMED'}); controller.dispose();
  });
  it('recovers discoveries and recorded decoration models from an existing v20 game without paying on load', () => {
    const s = atLevel(); s.discovered.push('dadi'); s.rewardedDecorationModels = ['bush']; s.decorations = [];
    s.missions.claimed = [...SOLO_INITIAL_MISSION_IDS]; s.missions.completed = [...SOLO_INITIAL_MISSION_IDS];
    const before = {pattes: s.pattes, grass: s.grass, hearts: s.hearts, progression: {...s.progression}};
    const loaded = advance(reload(s), 0);
    expect(loaded.missions.completed).toEqual(expect.arrayContaining(['discover-dadi', 'decorate-bush']));
    expect({pattes: loaded.pattes, grass: loaded.grass, hearts: loaded.hearts, progression: loaded.progression}).toEqual(before);
    expect(loaded.missions.claimed).toEqual(s.missions.claimed); expect(loaded.version).toBe(21);
  });
  it('recovers historical placement markers, but an explicitly unplaced inventory copy does not complete its mission', () => {
    const s = atLevel(); delete s.rewardedDecorationModels;
    s.decorations = [{id: 'decoration-6', catalogId: 'bush', location: {kind: 'inventory'}}]; s.nextId = 7;
    expect(mainProgress(s, 'decorate-bush').value).toBe(1); // Existing convention: absent historical marker was already processed.
    s.decorations[0].placementXpProcessed = false; expect(mainProgress(s, 'decorate-bush').value).toBe(0);
    s.decorations[0].placementXpProcessed = true; expect(mainProgress(s, 'decorate-bush').value).toBe(1);
  });
  it.each(DECORATION_IDS)('remembers and rewards the historical first placement of %s exactly once', model => {
    const initial = atLevel(); initial.rewardedDecorationModels = [model];
    const s = advance(initial, 0), id = `decorate-${model}` as const;
    expect(MAIN_MISSIONS[id].condition).toEqual({kind: 'decoration', model}); expect(s.missions.completed).toContain(id);
    const paid = run(s, {type: 'claimMainMission', id});
    expect(paid.progression.totalXp - s.progression.totalXp).toBe(10); expect([paid.pattes, paid.grass, paid.hearts]).toEqual([s.pattes, s.grass, s.hearts]);
    expect(act(reload(paid), {type: 'claimMainMission', id}, 0)).toMatchObject({ok: false, reason: 'ALREADY_CLAIMED'});
  });
  it('grants ten mission XP once per model; moving, storing, selling and buying again never reopen the reward', () => {
    let s = atLevel(); s.pattes = 1000;
    s = run(s, {type: 'buyDecoration', catalogId: 'bush'}); const id = s.decorations[0].id;
    expect(s.missions.completed).not.toContain('decorate-bush');
    const xp = s.progression.totalXp;
    s = run(s, {type: 'placeDecoration', id, location: {kind: 'outside', x: 0, y: 44, rotation: 0}});
    expect(s.progression.totalXp - xp).toBe(10); expect(s.missions.completed).toContain('decorate-bush');
    s = run(s, {type: 'claimMainMission', id: 'decorate-bush'}); expect(s.progression.totalXp - xp).toBe(20);
    s = run(s, {type: 'placeDecoration', id, location: {kind: 'inventory'}});
    s = run(s, {type: 'placeDecoration', id, location: {kind: 'outside', x: 1, y: 44, rotation: 0}});
    s = run(s, {type: 'sellDecoration', id});
    s = run(s, {type: 'buyDecoration', catalogId: 'bush', location: {kind: 'outside', x: 0, y: 44, rotation: 0}});
    s = reload(s); expect(s.progression.totalXp - xp).toBe(20);
    expect(act(s, {type: 'claimMainMission', id: 'decorate-bush'}, 0)).toMatchObject({ok: false, reason: 'ALREADY_CLAIMED'});
  });
  it('observes all twenty milestones from their real saved state, credits twenty XP per claim and retains acquired conditions', () => {
    let s = completeLaboratory(0); s.missions.completed = s.missions.completed.filter(id => !MILESTONE_MISSION_IDS.includes(id as typeof MILESTONE_MISSION_IDS[number]));
    s = advance(s, 0); const xp = s.progression.totalXp;
    for (const id of MILESTONE_MISSION_IDS) {
      const p = mainProgress(s, id); expect(p.value, id).toBeGreaterThanOrEqual(p.target); expect(missionClaimXp('main', id), id).toBe(20);
      s = run(s, {type: 'claimMainMission', id});
    }
    expect(s.progression.totalXp - xp).toBe(400);
    s.rabbits.forEach(r => {r.affection = 2;}); s.buildings = s.buildings.filter(b => b.kind !== 'kitchen');
    expect(s.missions.completed).toContain('affection-twenty'); expect(s.missions.completed).toContain('build-kitchen');
  });
});
