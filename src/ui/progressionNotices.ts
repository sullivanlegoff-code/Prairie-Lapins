import {checkLevelAccess, type LevelAccessTarget} from '../simulation/levelAccess';
import {PROGRESSION} from '../config/progression';
import {SPECIES, SPECIES_IDS} from '../config/balance';
import {HABITAT_TYPES} from '../config/habitats';
import {PARCEL_IDS} from '../config/land';
import {DECORATION_IDS} from '../config/decorations';
export interface LevelNotice {fromLevel: number; toLevel: number; heartsGranted: number; unlocks?: LevelAccessTarget[]}
/** Optional presentation data only. Old pending notices contain no confirmed unlock payload. */
function confirmedTargets(raw:unknown):LevelAccessTarget[]{
  if(!Array.isArray(raw)||raw.length>(SPECIES_IDS.length+HABITAT_TYPES.length*3+DECORATION_IDS.length+PARCEL_IDS.length-1)*2)return [];
  const result=new Map<string,LevelAccessTarget>();
  for(const value of raw){
    try{
      const t=checkLevelAccess(0,value as LevelAccessTarget).target;
      if(t.family==='species' && (t.action==='purchase' && SPECIES[t.id].price!==null || t.action==='breedingResult' && SPECIES[t.id].recipe)){
        const target={family:'species',id:t.id,action:t.action} as const;result.set(JSON.stringify(target),target);
      }else if(t.family==='extension'){
        const target={family:'extension',rank:t.rank} as const;result.set(JSON.stringify(target),target);
      }else if(t.family==='decoration'){
        const target={family:'decoration',id:t.id} as const;result.set(JSON.stringify(target),target);
      }else if(t.family==='habitatUpgrade'){
        const target={family:'habitatUpgrade',id:t.id,toLevel:t.toLevel} as const;result.set(JSON.stringify(target),target);
      }else if(t.family==='habitatPurchase'){
        const target={family:'habitatPurchase',id:t.id} as const;result.set(JSON.stringify(target),target);
      }
    }catch{/* A corrupt optional announcement must never create access or suppress the level summary. */}
  }
  return [...result.values()];
}
export function mergeLevelNotices(a: LevelNotice | null, b: LevelNotice): LevelNotice {
  const unlocks=confirmedTargets([...(a?.unlocks??[]),...(b.unlocks??[])]);
  return a ? {fromLevel: Math.min(a.fromLevel,b.fromLevel), toLevel: Math.max(a.toLevel,b.toLevel), heartsGranted: a.heartsGranted+b.heartsGranted,unlocks} : {...b,unlocks};
}
/** One pending summary per presentation identity, stored with the mode's preferences. No reward rights. */
export class ProgressionNotices {
  private pending: LevelNotice | null = null;
  constructor(private key: string, readonly presentationId: string) {
    try {
      const r=JSON.parse(localStorage.getItem(key)??'null'),p=r?.pending;
      if(r?.presentationId===presentationId && p && [p.fromLevel,p.toLevel,p.heartsGranted].every(Number.isSafeInteger) && p.fromLevel>=1 && p.toLevel>=p.fromLevel && p.toLevel<=PROGRESSION.curve.maximumLevel && p.heartsGranted>=0) this.pending={fromLevel:p.fromLevel,toLevel:p.toLevel,heartsGranted:p.heartsGranted,unlocks:confirmedTargets(p.unlocks)};
    } catch { /* Optional presentation; never affects the game. */ }
  }
  private persist(pending: LevelNotice | null): boolean {
    try {localStorage.setItem(this.key,JSON.stringify({presentationId:this.presentationId,pending}));return true;} catch {return false;}
  }
  add(notice: LevelNotice): void {this.pending=mergeLevelNotices(this.pending,notice);this.persist(this.pending);}
  /** Consume before opening: a reload cannot repeat an already presented summary. */
  take(): LevelNotice | null {
    if(!this.pending || !this.persist(null))return null;
    const pending=this.pending;this.pending=null;return pending;
  }
}
