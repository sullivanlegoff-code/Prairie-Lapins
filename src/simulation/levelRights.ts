import {PARCEL_IDS} from '../config/land';
import {DECORATION_IDS} from '../config/decorations';
import {RECIPE_SPECIES, SHOP_SPECIES} from '../config/balance';
import {HABITAT_TYPES} from '../config/habitats';
import {checkLevelAccess, createLevelAccessChecker, historicalPurchaseLevelRights, newlyAccessibleContents, type LevelAccessTarget} from './levelAccess';
import {unlockedPurchases, rabbitPurchaseUnlock} from './purchaseUnlocks';
import type {GameState} from '../state/types';

/** Capture the old system BEFORE missions are settled, exactly once. New starts have an empty marker. */
export function establishHistoricalLevelRights(s: GameState): void {
  if (s.levelAccessTransition) return;
  const rights=historicalLevelRights(s);
  s.purchaseUnlocks=unlockedPurchases(s); // Freeze the old registry as evidence, never settle it again.
  s.levelAccessTransition = {version:1, rights};
}
function historicalLevelRights(s:GameState) {
  const rights = historicalPurchaseLevelRights(unlockedPurchases(s));
  for (const id of SHOP_SPECIES.filter(id => !rabbitPurchaseUnlock(id))) rights.push({target:{family:'species',id,action:'purchase'},source:'legacy-purchase'});
  for (const id of HABITAT_TYPES.filter(id => id !== 'universal')) rights.push({target:{family:'habitatPurchase',id},source:'legacy-purchase'});
  for (const id of s.discovered) rights.push({target:{family:'species',id,action:'breedingResult'},source:'legacy-discovery'});
  return rights;
}
export function stateLevelAccess(s: GameState, target: LevelAccessTarget) {
  return checkLevelAccess(s.progression.totalXp, target, s.levelAccessTransition?.rights ?? historicalLevelRights(s));
}
export function stateLevelAccessChecker(s: GameState) {
  return createLevelAccessChecker(s.progression.totalXp,s.levelAccessTransition?.rights ?? historicalLevelRights(s));
}
/** Activated operations still available to this state; purchased extension ranks are excluded. */
export function levelUnlockContents(s: GameState, fromLevel: number, toLevel: number): LevelAccessTarget[] {
  const targets: LevelAccessTarget[] = [
    ...SHOP_SPECIES.map(id => ({family:'species',id,action:'purchase'} as const)),
    ...RECIPE_SPECIES.map(id => ({family:'species',id,action:'breedingResult'} as const)),
    ...HABITAT_TYPES.map(id => ({family:'habitatPurchase',id} as const)),
    ...HABITAT_TYPES.flatMap(id => ([2,3] as const).map(toLevel=>({family:'habitatUpgrade',id,toLevel} as const))),
    ...PARCEL_IDS.slice(1).map((_,i)=>i+1).filter(rank=>rank>=s.acquiredParcels.length).map(rank=>({family:'extension',rank} as const)),
    ...DECORATION_IDS.map(id => ({family:'decoration',id} as const)),
  ];
  return newlyAccessibleContents(fromLevel,toLevel,targets,s.levelAccessTransition?.rights ?? historicalLevelRights(s));
}
