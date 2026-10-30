import {describe, expect, it} from 'vitest';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {regressionStart as createGame} from './regression-start';
import {setBaby, welcomeOf} from './nursery-baby';
import {DAILY_BONUS, DAILY_MISSIONS, DAILY_PICK_COUNT, MISSION_CYCLE_DURATION as DAY, type DailyMissionId} from '../src/config/missions';
import {PROGRESSION} from '../src/config/progression';
import {availableMissionRewards, dailyBonusReady, dailyClaimable, dailyMissionsFor, dailyMissionsOf, dailyProgress, emptyDailyProgress} from '../src/simulation/missions';
import type {Command, GameState} from '../src/state/types';

// Target player: three 5-minute sessions a day. The three shown daily missions are all open from the start, in any order.
const run = (s: GameState, c: Command, now = s.lastSimulatedAt) => { const r = act(s, c, now, () => .9); if (!r.ok) throw Error(`${c.type}: ${r.reason}`); return r.state; };
const claim = (s: GameState, id: DailyMissionId, cycleStart = 0, now = s.lastSimulatedAt) => act(s, {type: 'claimDailyMission', id, cycleStart}, now);
function prepared() {
  let s = createGame(0); s.pattes = 5000; s.grass = 1000;
  // Breeding needs affection 2 from both parents.
  s.rabbits.forEach(r => r.affection = 2);
  for (const [kind, x, y] of [['farm', 22, 20], ['nest', 26, 20], ['nursery', 18, 24]] as const) s = run(s, kind === 'nest' || kind === 'nursery' ? {type: 'placeStarterBuilding', kind, x, y} : {type: 'buyBuilding', kind, x, y});
  return s;
}
const feed = (s: GameState, times: number) => { for (let i = 0; i < times; i++) s = run(s, {type: 'feed', id: 'rabbit-2'}); return s; };
const breed = (s: GameState) => run(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']});
/** A birth already waiting in the nursery: welcoming it is the `welcome` event. */
function welcome(s: GameState) {
  setBaby(s.buildings.find(b => b.kind === 'nursery')!, {birth: {id: 'birth-99', species: 'paille', guaranteed: false, reservedDiscovery: false}, startedAt: 0, readyAt: 0});
  return run(s, welcomeOf(s, 'building-1'));
}
/** Daily rewards waiting to be claimed (the main objectives are counted separately by availableMissionRewards). */
const dailyRewards = (s: GameState) => dailyMissionsOf(s).filter(id => dailyClaimable(s, id)).length + Number(dailyBonusReady(s) && !s.missions.daily.bonusClaimed);
const bonusOf = (resource: 'hearts' | 'grass') => DAILY_BONUS.filter(r => r.resource === resource).reduce((sum, r) => sum + r.amount, 0);

describe('daily missions: three shown per cycle, all open at once', () => {
  it('shows three missions, one per category, all open from the start', () => {
    const s = prepared(), shown = dailyMissionsOf(s), base = availableMissionRewards(s);
    expect(shown).toEqual(dailyMissionsFor(0));
    expect(shown).toHaveLength(DAILY_PICK_COUNT);
    expect(new Set(shown.map(id => DAILY_MISSIONS[id].category)).size).toBe(DAILY_PICK_COUNT);
    for (const id of shown) expect(claim(s, id)).toMatchObject({ok: false, reason: 'NOT_READY'});
    expect(availableMissionRewards(s)).toBe(base);
  });
  it('counts each action for every shown mission of its event, and claims come in any order', () => {
    expect(dailyMissionsFor(0)).toEqual(expect.arrayContaining(['feed-rabbit', 'welcome-baby', 'gain-affection']));
    let s = prepared();
    s = breed(s);
    expect(dailyProgress(s, 'gain-affection')).toBe(1);
    s = welcome(s);
    expect(dailyProgress(s, 'welcome-baby')).toBe(1);
    s = feed(s, 3);
    expect(dailyProgress(s, 'feed-rabbit')).toBe(3);
    expect(dailyRewards(s)).toBe(3);
    const before = s.pattes;
    s = run(s, {type: 'claimDailyMission', id: 'gain-affection', cycleStart: 0});
    s = run(s, {type: 'claimDailyMission', id: 'welcome-baby', cycleStart: 0});
    s = run(s, {type: 'claimDailyMission', id: 'feed-rabbit', cycleStart: 0});
    expect(s.pattes).toBe(before + DAILY_MISSIONS['gain-affection'].reward.amount + DAILY_MISSIONS['welcome-baby'].reward.amount + DAILY_MISSIONS['feed-rabbit'].reward.amount);
    expect(s.missions.daily.claimed).toHaveLength(DAILY_PICK_COUNT);
    expect(claim(s, 'feed-rabbit').ok).toBe(false);
  });
  it('the cycle bonus opens only once the three shown missions are claimed, then pays once with its XP', () => {
    let s = prepared();
    const shown = dailyMissionsOf(s);
    expect(act(s, {type: 'claimDailyBonus', cycleStart: 0}, s.lastSimulatedAt)).toMatchObject({ok: false, reason: 'NOT_READY'});
    s = feed(s, 3); s = welcome(s); s = breed(s);
    expect(shown.every(id => dailyProgress(s, id) >= DAILY_MISSIONS[id].target)).toBe(true);
    expect(dailyBonusReady(s)).toBe(false);
    for (const id of shown) s = run(s, {type: 'claimDailyMission', id, cycleStart: 0});
    expect(dailyBonusReady(s)).toBe(true);
    expect(dailyRewards(s)).toBe(1);
    const before = {hearts: s.hearts, grass: s.grass, xp: s.progression.totalXp};
    const r = act(s, {type: 'claimDailyBonus', cycleStart: 0}, s.lastSimulatedAt);
    if (!r.ok) throw Error(r.reason);
    // A level crossed by the bonus XP pays its own hearts, reported in progressionGain.
    expect(r.state.hearts).toBe(before.hearts + bonusOf('hearts') + (r.progressionGain?.heartsGranted ?? 0));
    expect(r.progressionGain?.xpGained).toBe(PROGRESSION.xp.claims.dailyBonus);
    expect(r.state.grass).toBe(before.grass + bonusOf('grass'));
    expect(r.state.progression.totalXp).toBe(before.xp + PROGRESSION.xp.claims.dailyBonus);
    expect(r.state.missions.daily.bonusClaimed).toBe(true);
    expect(dailyRewards(r.state)).toBe(0);
    expect(act(r.state, {type: 'claimDailyBonus', cycleStart: 0}, r.state.lastSimulatedAt)).toMatchObject({ok: false, reason: 'ALREADY_CLAIMED'});
  });
  it('a claim is refused for a mission not shown this cycle', () => {
    const s = prepared(), hidden = (['collect-pattes', 'collect-grass', 'decorate'] as const).find(id => !dailyMissionsOf(s).includes(id))!;
    expect(hidden).toBeDefined();
    expect(claim(s, hidden)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
  });
  it('an expired cycle keeps unclaimed rewards and bonus out of reach, and no bonus is paid on its own', () => {
    let s = prepared();
    s = feed(s, 3); s = welcome(s); s = breed(s);
    for (const id of dailyMissionsOf(s)) s = run(s, {type: 'claimDailyMission', id, cycleStart: 0});
    const hearts = s.hearts;
    const next = advance(s, DAY);
    expect(next.missions.daily).toMatchObject({cycleIndex: 1, claimed: [], bonusClaimed: false});
    expect(next.missions.daily.progress).toEqual(emptyDailyProgress());
    expect(next.hearts).toBe(hearts);
    expect(claim(next, dailyMissionsOf(s)[0], 0, DAY)).toMatchObject({ok: false, reason: 'CYCLE_EXPIRED'});
    expect(act(next, {type: 'claimDailyBonus', cycleStart: 0}, DAY)).toMatchObject({ok: false, reason: 'CYCLE_EXPIRED'});
  });
  it('a new cycle shows its own three missions, all open from its start', () => {
    const s = advance(prepared(), DAY);
    expect(dailyMissionsOf(s)).toEqual(dailyMissionsFor(1));
    expect(dailyMissionsOf(s)).toHaveLength(DAILY_PICK_COUNT);
    for (const id of dailyMissionsOf(s)) expect(dailyProgress(s, id)).toBe(0);
  });
  it('saves keep progress for all six missions, write no opening time, and read older saves with zero progress', () => {
    const s = feed(prepared(), 3);
    const raw = JSON.parse(encodeGame(s));
    expect(Object.keys(raw.missions.daily.progress).sort()).toEqual(['collect-grass', 'collect-pattes', 'decorate', 'feed-rabbit', 'gain-affection', 'welcome-baby']);
    expect(raw.missions.daily).not.toHaveProperty('nextAt');
    const decoded = decodeGame(JSON.stringify(raw));
    expect(decoded.ok && decoded.state.missions.daily.progress['feed-rabbit']).toBe(3);
    delete raw.missions.daily.progress['feed-rabbit'];
    const older = decodeGame(JSON.stringify(raw));
    expect(older.ok && older.state.missions.daily.progress['feed-rabbit']).toBe(0);
    expect(older.ok && older.state.missions.daily.progress).toEqual({...emptyDailyProgress(), 'collect-pattes': 0, 'collect-grass': 0, 'gain-affection': 0, 'welcome-baby': 0, decorate: 0});
  });
});
