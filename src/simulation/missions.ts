import {settlePurchaseUnlocks} from './purchaseUnlocks';
import {progressionFromXp} from './progression';
import {HOUR, ORDERS, SPECIES, SPECIES_IDS} from '../config/balance';
import {DAILY_MISSIONS, DAILY_MISSION_IDS, MAIN_MISSIONS, MAIN_MISSION_IDS, NEW_MAIN_MISSION_IDS, DURABLE_MISSION_IDS, MISSION_CYCLE_DURATION, DAILY_PICK_COUNT, INITIAL_MISSION_IDS, SOLO_INITIAL_MISSION_IDS, BRANCH_MISSION_IDS, MAIN_EVENT_IDS, type MainMissionId, type DailyMissionId} from '../config/missions';
import {RECIPE_PRICES} from '../config/recipes';
import type {GameState, MissionState} from '../state/types';

type ObservableState = Pick<GameState, 'rabbits' | 'discovered'> & Partial<Pick<GameState, 'progression' | 'decorations' | 'rewardedDecorationModels' | 'recipeBook'>> & {acquiredParcels?: GameState['acquiredParcels']; expanded?: boolean} & Pick<GameState, 'startCourse'> & {missions?: Pick<MissionState, 'events' | 'nightOrderStarted'>} & {buildings: (Pick<GameState['buildings'][number], 'kind'> & Partial<Pick<GameState['buildings'][number], 'habitat' | 'farmLevel' | 'agencyLevel' | 'nursery'>>)[]};
export function mainProgress(state: ObservableState, id: MainMissionId): {value: number; target: number} {
  const c = MAIN_MISSIONS[id].condition;
  switch (c.kind) {
    case 'level': return {value: progressionFromXp(state.progression?.totalXp ?? 0).level, target:c.target};
    case 'extensions': return {value:Math.max(0,(state.acquiredParcels?.length ?? 1)-1),target:c.target};
    case 'habitatLevel': return {value:Math.max(0,...state.buildings.map(b=>b.habitat?.level ?? 0)),target:c.target};
    case 'buildingLevel': return {value: Math.max(0, ...state.buildings.filter(b => b.kind === c.building).map(b => c.building === 'farm' ? b.farmLevel ?? 1 : c.building === 'agency' ? b.agencyLevel ?? 1 : b.nursery?.capacity ?? 1)), target: c.target};
    case 'decoration': return {value: Number(state.rewardedDecorationModels?.includes(c.model) || state.decorations?.some(d => d.catalogId === c.model && (d.location.kind === 'outside' || d.placementXpProcessed === true || state.rewardedDecorationModels === undefined && d.placementXpProcessed !== false))), target: 1};
    case 'paidRecipe': return {value: Number(state.recipeBook?.some(id => RECIPE_PRICES[id] !== undefined)), target: 1};
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
  return Object.fromEntries(DAILY_MISSION_IDS.map(id => [id, 0])) as MissionState['daily']['progress'];
}
export function createMissions(state: ObservableState, referenceAt: number): MissionState {
  return {events: emptyMainEvents(), completed: MAIN_MISSION_IDS.filter(id => { if ((DURABLE_MISSION_IDS as readonly string[]).includes(id) || (NEW_MAIN_MISSION_IDS as readonly string[]).includes(id)) return false; if ((id === 'snow-habitat' || id === 'welcome-snow') && state.startCourse !== 'paille-solo') return false; const p = mainProgress({...state, missions: undefined}, id); return p.value >= p.target; }), claimed: [],
    daily: {referenceAt, cycleIndex: 0, progress: emptyDailyProgress(), claimed: [], bonusClaimed: false}};
}
export const cycleIndexAt = (referenceAt: number, now: number) => Math.floor(Math.max(0, now - referenceAt) / MISSION_CYCLE_DURATION);
export const dailyCycleStart = (s: GameState) => s.missions.daily.referenceAt + s.missions.daily.cycleIndex * MISSION_CYCLE_DURATION;
export const dailyCycleEnd = (s: GameState) => dailyCycleStart(s) + MISSION_CYCLE_DURATION;
/** Mutates only the transaction/advance copy; never reconstructs absent action history. */
export function updateMissions(state: GameState, now: number): void {
  const m = state.missions, d = m.daily;
  // The « longer crop » mission: any crop of an hour or more (formerly the night production).
  if (state.buildings.some(b => b.order && (b.order.duration ?? ORDERS[b.order.recipe].duration) >= HOUR)) m.nightOrderStarted = true;
  const cycle = cycleIndexAt(d.referenceAt, now);
  if (cycle > d.cycleIndex) {
    d.cycleIndex = cycle; d.progress = emptyDailyProgress(); d.claimed = []; d.bonusClaimed = false; delete d.nextAt;
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
type MainMissionState = Pick<GameState, 'startCourse' | 'missions'> & Partial<Pick<GameState, 'progression'>>;
export const mainCatalogueUnlocked = (s: Partial<Pick<GameState, 'progression'>>): boolean => progressionFromXp(s.progression?.totalXp ?? 0).level >= 7;
/** Initial rewards belong to their original course; a normal legacy start never gains the solo Neige rewards. */
export const catalogueMainMissionIds = (s: Pick<GameState, 'startCourse'>): MainMissionId[] => [...initialMissionIds(s), ...BRANCH_MISSION_IDS, ...DURABLE_MISSION_IDS, ...NEW_MAIN_MISSION_IDS];
/** Includes finished objectives for browsing; retired identifiers are never part of this catalogue. */
export function visibleMainMissions(s: MainMissionState): readonly MainMissionId[] {
  return mainCatalogueUnlocked(s) ? catalogueMainMissionIds(s) : activeMainMissions(s);
}
export function eligibleMainMissionIds(s: MainMissionState): readonly MainMissionId[] {
  if (mainCatalogueUnlocked(s)) return catalogueMainMissionIds(s);
  return [...initialMissionIds(s), ...BRANCH_MISSION_IDS, ...activeMainMissions(s).filter(id => (DURABLE_MISSION_IDS as readonly string[]).includes(id))];
}
export function activeMainMissions(s: MainMissionState): MainMissionId[] {
  if (mainCatalogueUnlocked(s)) return catalogueMainMissionIds(s).filter(id => !s.missions.claimed.includes(id));
  const next = initialMissionIds(s).find(id => !s.missions.claimed.includes(id));
  if (next) return [next];
  // Every claimable branch stays visible; the durable chain always keeps its slot, then one branch still in progress.
  const branches = BRANCH_MISSION_IDS.filter(id => !s.missions.claimed.includes(id));
  const durable = DURABLE_MISSION_IDS.find(id => !s.missions.claimed.includes(id));
  const ready = branches.filter(id => s.missions.completed.includes(id)), pending = branches.find(id => !s.missions.completed.includes(id));
  return [...ready, ...(durable ? [durable] : []), ...(pending ? [pending] : [])];
}
/** Stable hash of cycle and mission: orders the pool differently each cycle, the same way on every device. */
const missionRank = (cycle: number, id: DailyMissionId): number => {
  let h = 2166136261;
  for (const ch of `${cycle}:${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};
/**
 * The three daily missions of a cycle, one per category so they stay varied. Nothing is stored: the same cycle always
 * shows the same three, and all three are open from the start, to be done in any order.
 */
export function dailyMissionsFor(cycleIndex: number): DailyMissionId[] {
  const picked: DailyMissionId[] = [], categories = new Set<string>();
  for (const id of [...DAILY_MISSION_IDS].sort((a, b) => missionRank(cycleIndex, a) - missionRank(cycleIndex, b))) {
    if (picked.length === DAILY_PICK_COUNT) break;
    if (categories.has(DAILY_MISSIONS[id].category)) continue;
    picked.push(id); categories.add(DAILY_MISSIONS[id].category);
  }
  return picked;
}
export const dailyMissionsOf = (s: Pick<GameState, 'missions'>): DailyMissionId[] => dailyMissionsFor(s.missions.daily.cycleIndex);
export const dailyProgress = (s: Pick<GameState, 'missions'>, id: DailyMissionId): number => s.missions.daily.progress[id] ?? 0;
/** A shown mission whose target is reached and whose reward is not yet claimed. */
export const dailyClaimable = (s: Pick<GameState, 'missions'>, id: DailyMissionId): boolean =>
  dailyMissionsOf(s).includes(id) && !s.missions.daily.claimed.includes(id) && dailyProgress(s, id) >= DAILY_MISSIONS[id].target;
/** The cycle bonus opens once every shown mission has been claimed. */
export const dailyBonusReady = (s: Pick<GameState, 'missions'>): boolean =>
  dailyMissionsOf(s).every(id => s.missions.daily.claimed.includes(id));
/** Called once after a successful simulation action; rewards/imports are not events. */
export function recordMissionAction(s: GameState, action: string, amount: number, placedOutside = true): boolean {
  if ((MAIN_EVENT_IDS as readonly string[]).includes(action) && (action !== 'placeDecoration' || placedOutside)) {
    const event = action as keyof MissionState['events'];
    // Counters need only represent these objectives; bounded values avoid overflow.
    s.missions.events[event] = Math.min(event === 'collectOrder' ? 20 : 1, s.missions.events[event] + (event === 'collectOrder' ? amount : 1));
  }
  // Every shown daily mission progresses on its own event, in any order; a decoration only counts when placed outside.
  for (const id of dailyMissionsOf(s)) {
    if (DAILY_MISSIONS[id].event !== action || s.missions.daily.claimed.includes(id) || (action === 'placeDecoration' && !placedOutside)) continue;
    const next = dailyProgress(s, id) + amount;
    if (!Number.isSafeInteger(next)) return false;
    s.missions.daily.progress[id] = next;
  }
  return true;
}
export function availableMissionRewards(s: GameState): number {
  return activeMainMissions(s).filter(id => s.missions.completed.includes(id)).length +
    dailyMissionsOf(s).filter(id => dailyClaimable(s, id)).length +
    Number(dailyBonusReady(s) && !s.missions.daily.bonusClaimed);
}
