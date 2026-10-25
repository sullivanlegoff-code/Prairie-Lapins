import {settlePurchaseUnlocks} from './purchaseUnlocks';
import {progressionFromXp} from './progression';
import {SPECIES, SPECIES_IDS} from '../config/balance';
import {DAILY_MISSIONS, DAILY_MISSION_IDS, MAIN_MISSIONS, MAIN_MISSION_IDS, DURABLE_MISSION_IDS, MISSION_CYCLE_DURATION, INITIAL_MISSION_IDS, SOLO_INITIAL_MISSION_IDS, BRANCH_MISSION_IDS, MAIN_EVENT_IDS, type MainMissionId} from '../config/missions';
import type {GameState, MissionState} from '../state/types';

type ObservableState = Pick<GameState, 'rabbits' | 'discovered'> & Partial<Pick<GameState, 'progression'>> & {acquiredParcels?: GameState['acquiredParcels']; expanded?: boolean} & Pick<GameState, 'startCourse'> & {missions?: Pick<MissionState, 'events' | 'nightOrderStarted'>} & {buildings: (Pick<GameState['buildings'][number], 'kind'> & {habitat?: GameState['buildings'][number]['habitat']})[]};
export function mainProgress(state: ObservableState, id: MainMissionId): {value: number; target: number} {
  const c = MAIN_MISSIONS[id].condition;
  switch (c.kind) {
    case 'level': return {value: progressionFromXp(state.progression?.totalXp ?? 0).level, target:c.target};
    case 'extensions': return {value:Math.max(0,(state.acquiredParcels?.length ?? 1)-1),target:c.target};
    case 'habitatLevel': return {value:Math.max(0,...state.buildings.map(b=>b.habitat?.level ?? 0)),target:c.target};
    case 'nightOrder': return {value:Number(!!state.missions?.nightOrderStarted),target:1};
    case 'ordinaryRares': { const ids=SPECIES_IDS.filter(id=>SPECIES[id].rarity==='rare' && SPECIES[id].acquisition.some(a=>a.kind==='recipe' && a.guaranteeEligible)); return {value:ids.filter(id=>state.discovered.includes(id)).length,target:ids.length}; }
    case 'building': return {value: state.buildings.filter(b => b.kind === c.building && (!c.habitatType || b.habitat?.type === c.habitatType)).length, target: c.target ?? 1};
    case 'discoveries': return {value: state.discovered.length, target: c.target};
    case 'affection': return {value: Math.max(0, ...state.rabbits.map(r => r.affection)), target: c.target};
    case 'event': return {value: state.missions?.events[c.event] ?? 0, target: c.target};
    case 'parents': return {value: state.rabbits.filter(r => r.affection >= 2).length, target: c.target};
    case 'species': return {value: Number(state.discovered.includes(c.species)), target: 1};
    case 'extension': return {value: Number(state.acquiredParcels ? state.acquiredParcels.length > 1 : state.expanded), target: 1};
    case 'rare': return {value: Number(state.discovered.some(id => SPECIES[id].rarity === 'rare')), target: 1};
  }
}
export function emptyDailyProgress(): MissionState['daily']['progress'] {
  return {'collect-pattes': 0, 'collect-grass': 0, 'gain-affection': 0};
}
export function createMissions(state: ObservableState, referenceAt: number): MissionState {
  return {events: emptyMainEvents(), completed: MAIN_MISSION_IDS.filter(id => { if ((DURABLE_MISSION_IDS as readonly string[]).includes(id)) return false; if ((id === 'snow-habitat' || id === 'welcome-snow') && state.startCourse !== 'paille-solo') return false; const p = mainProgress({...state, missions: undefined}, id); return p.value >= p.target; }), claimed: [],
    daily: {referenceAt, cycleIndex: 0, progress: emptyDailyProgress(), claimed: [], bonusClaimed: false}};
}
export const cycleIndexAt = (referenceAt: number, now: number) => Math.floor(Math.max(0, now - referenceAt) / MISSION_CYCLE_DURATION);
export const dailyCycleStart = (s: GameState) => s.missions.daily.referenceAt + s.missions.daily.cycleIndex * MISSION_CYCLE_DURATION;
export const dailyCycleEnd = (s: GameState) => dailyCycleStart(s) + MISSION_CYCLE_DURATION;
/** Mutates only the transaction/advance copy; never reconstructs absent action history. */
export function updateMissions(state: GameState, now: number): void {
  const m = state.missions, d = m.daily;
  if (state.buildings.some(b => b.order?.recipe === 'night')) m.nightOrderStarted = true;
  const cycle = cycleIndexAt(d.referenceAt, now);
  if (cycle > d.cycleIndex) {
    d.cycleIndex = cycle; d.progress = emptyDailyProgress(); d.claimed = []; d.bonusClaimed = false;
  }
  for (const id of eligibleMainMissionIds(state)) {
    const p = mainProgress(state, id);
    if (p.value >= p.target && !m.completed.includes(id)) m.completed.push(id);
  }
  settlePurchaseUnlocks(state);
}
export const emptyMainEvents = (): MissionState['events'] => ({collectOrder: 0, breed: 0, transferBirth: 0, welcome: 0, placeDecoration: 0});
/** One initial goal at a time, then independent branches. Completed early goals remain banked. */
export function initialMissionIds(s: Pick<GameState, 'startCourse'>): readonly MainMissionId[] {
  return s.startCourse === 'paille-solo' ? SOLO_INITIAL_MISSION_IDS : INITIAL_MISSION_IDS;
}
export function eligibleMainMissionIds(s: Pick<GameState, 'startCourse' | 'missions'>): readonly MainMissionId[] {
  return [...initialMissionIds(s), ...BRANCH_MISSION_IDS, ...activeMainMissions(s).filter(id => (DURABLE_MISSION_IDS as readonly string[]).includes(id))];
}
export function activeMainMissions(s: Pick<GameState, 'missions' | 'startCourse'>): MainMissionId[] {
  const next = initialMissionIds(s).find(id => !s.missions.claimed.includes(id));
  if (next) return [next];
  // Every claimable branch stays visible; the durable chain always keeps its slot, then one branch still in progress.
  const branches = BRANCH_MISSION_IDS.filter(id => !s.missions.claimed.includes(id));
  const durable = DURABLE_MISSION_IDS.find(id => !s.missions.claimed.includes(id));
  const ready = branches.filter(id => s.missions.completed.includes(id)), pending = branches.find(id => !s.missions.completed.includes(id));
  return [...ready, ...(durable ? [durable] : []), ...(pending ? [pending] : [])];
}
/** Called once after a successful simulation action; rewards/imports are not events. */
export function recordMissionAction(s: GameState, action: string, amount: number, placedOutside = true): boolean {
  if ((MAIN_EVENT_IDS as readonly string[]).includes(action) && (action !== 'placeDecoration' || placedOutside)) {
    const event = action as keyof MissionState['events'];
    // Counters need only represent these objectives; bounded values avoid overflow.
    s.missions.events[event] = Math.min(event === 'collectOrder' ? 20 : 1, s.missions.events[event] + (event === 'collectOrder' ? amount : 1));
  }
  const id = DAILY_MISSION_IDS.find(id => DAILY_MISSIONS[id].event === action);
  if (!id) return true;
  const next = s.missions.daily.progress[id] + amount;
  if (!Number.isSafeInteger(next)) return false;
  s.missions.daily.progress[id] = next; return true;
}
export function availableMissionRewards(s: GameState): number {
  const d = s.missions.daily;
  return activeMainMissions(s).filter(id => s.missions.completed.includes(id)).length +
    DAILY_MISSION_IDS.filter(id => d.progress[id] >= DAILY_MISSIONS[id].target && !d.claimed.includes(id)).length +
    Number(d.claimed.length === DAILY_MISSION_IDS.length && !d.bonusClaimed);
}
