import type {MainMissionId} from './missions';
export const PURCHASE_UNLOCK_IDS = ['universal','feu','volant'] as const;
export type PurchaseUnlockId = typeof PURCHASE_UNLOCK_IDS[number];
/** The corresponding mission owns the condition; claiming its reward is never required. */
export const PURCHASE_UNLOCKS: Record<PurchaseUnlockId,{name:string;mission:MainMissionId;condition:string}> = {
  universal:{name:'Habitat universel',mission:'varied-family',condition:'Découvrir 3 espèces distinctes'},
  feu:{name:'Lapin Feu',mission:'growing-collection',condition:'Découvrir 5 espèces distinctes'},
  volant:{name:'Lapin Volant',mission:'seven-species',condition:'Découvrir 7 espèces distinctes'},
};
