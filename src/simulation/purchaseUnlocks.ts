import {PURCHASE_UNLOCK_IDS,PURCHASE_UNLOCKS,type PurchaseUnlockId} from '../config/purchaseUnlocks';
import type {SpeciesId} from '../config/balance';
import type {HabitatType} from '../config/habitats';
import type {GameState} from '../state/types';
import {checkLevelAccess} from './levelAccess';
import {mainProgress} from './missions';
export function purchaseUnlockProgress(s:GameState,id:PurchaseUnlockId) {
  return mainProgress(s,PURCHASE_UNLOCKS[id].mission);
}
export function hasPurchaseUnlock(s:GameState,id:PurchaseUnlockId):boolean {
  if(s.levelAccessTransition)return checkLevelAccess(s.progression.totalXp,id==='universal'?{family:'habitatPurchase',id:'universal'}:{family:'species',id,action:'purchase'},s.levelAccessTransition.rights).accessible;
  if(s.purchaseUnlocks?.includes(id))return true;
  const p=purchaseUnlockProgress(s,id);
  if(p.value>=p.target)return true;
  const mission=PURCHASE_UNLOCKS[id].mission;
  if(s.missions.completed.includes(mission) || s.missions.claimed.includes(mission))return true;
  // A discovered common proves a historical right, not a reproduction event.
  if(s.purchaseUnlocks!==undefined)return false;
  return id==='universal' ? s.buildings.filter(b=>b.kind==='enclosure' && b.habitat?.type==='universal').length>1 : s.discovered.includes(id);
}
export function unlockedPurchases(s:GameState):PurchaseUnlockId[] {return PURCHASE_UNLOCK_IDS.filter(id=>hasPurchaseUnlock(s,id));}
/** Monotonic registry, including demonstrated historical rights; no rewards or synthetic events. */
export function settlePurchaseUnlocks(s:GameState):void {
  if(s.levelAccessTransition)return; // Historical registry is frozen; missions no longer create purchase rights.
  const ids=unlockedPurchases(s);
  s.purchaseUnlocks=ids;
}
export function rabbitPurchaseUnlock(species:SpeciesId):PurchaseUnlockId|null {return species==='feu'||species==='volant'?species:null;}
export function habitatPurchaseUnlock(type:HabitatType):PurchaseUnlockId|null {return type==='universal'?'universal':null;}
