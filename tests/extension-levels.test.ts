// @vitest-environment happy-dom
import {describe,it,expect} from 'vitest';
import {act,encodeGame,decodeGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {requiredExtensionLevel,cumulativeLevelXp} from '../src/simulation/progression';
import {PARCEL_IDS,extensionPrice} from '../src/config/land';
import {PROGRESSION} from '../src/config/progression';
import {levelUnlockContents} from '../src/simulation/levelRights';
import {quoteComplement} from '../src/simulation/actions';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {ProgressionNotices} from '../src/ui/progressionNotices';
function state(rank:number,level:number){const s=createCentreStartGame(0);s.acquiredParcels=PARCEL_IDS.slice(0,rank);s.pattes=5000000;s.hearts=10000;s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};return s;}
describe('rank-based extension level gates',()=>{
 it('activates all five central families',()=>expect(Object.values(PROGRESSION.activeLevelFamilies)).toEqual([true,true,true,true,true]));
 it.each([1,2,3,4,5,6,7,8])('rank %i revalidates level before normal/hearts payment',rank=>{
  const level=requiredExtensionLevel(rank);expect(level).toBe([4,6,8,10,12,15,18,22][rank-1]);
  const s=state(rank,level-1),command={type:'expand',parcelId:PARCEL_IDS[rank],expectedCost:extensionPrice(s)} as const,before=structuredClone(s);
  expect(act(s,command,0)).toEqual({ok:false,state:before,reason:'LEVEL_REQUIRED'});expect(s).toEqual(before);
  const poor={...s,pattes:0};expect(quoteComplement(poor,command,0)).toEqual({ok:false,reason:'LEVEL_REQUIRED'});expect(act(poor,{type:'payWithHearts',action:command,maxPattes:0,maxHearts:10000},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED',state:poor});
  s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};
  for(const hearts of [false,true]){
   const start={...s,pattes:hearts?0:s.pattes},q=quoteComplement(start,command,0);if(hearts&&!q.ok)throw Error(q.reason);
   const r=act(start,hearts?{type:'payWithHearts',action:command,maxPattes:0,maxHearts:q.ok?q.hearts:0}:command,0);if(!r.ok)throw Error(r.reason);
   expect(r.state.acquiredParcels).toEqual([...s.acquiredParcels,command.parcelId]);expect(r.state.pattes).toBe(hearts?0:s.pattes-command.expectedCost);expect(r.state.hearts).toBe(s.hearts-(hearts&&q.ok?q.hearts:0));expect(r.state.progression).toEqual(s.progression);expect(r.state.buildings).toEqual(s.buildings);
   expect(decodeGame(encodeGame(r.state))).toEqual({ok:true,state:r.state});expect(act(r.state,command,0)).toMatchObject({ok:false,reason:'ALREADY_EXPANDED',state:r.state});
  }
 });
 it('allows diagonal/free choices until the next threshold; stale prices never buy another rank',()=>{
  let s=state(1,8);for(const [i,parcelId] of (['southeast','northwest','south'] as const).entries()){const r=act(s,{type:'expand',parcelId,expectedCost:[600,1800,4500][i]},0);if(!r.ok)throw Error(r.reason);s=r.state;}
  expect(act(s,{type:'expand',parcelId:'east',expectedCost:600},0)).toMatchObject({ok:false,reason:'PRICE_CHANGED'});expect(act(s,{type:'expand',parcelId:'east',expectedCost:9000},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});
  expect(act(state(1,1),{type:'expand',parcelId:'bad' as never,expectedCost:600},0)).toMatchObject({ok:false,reason:'INVALID_CHOICE'});
 });
 it('keeps old partial/full terrain without invented rights and filters owned announcements',()=>{
  const partial=state(4,1);expect(levelUnlockContents(partial,1,30).filter(t=>t.family==='extension')).toEqual([4,5,6,7,8].map(rank=>({family:'extension',rank})));
  expect(act(partial,{type:'expand',parcelId:'west',expectedCost:9000},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});
  const full=state(9,1);const loaded=decodeGame(encodeGame(full));expect(loaded).toMatchObject({ok:true,state:{acquiredParcels:full.acquiredParcels,buildings:full.buildings,progression:full.progression}});expect(levelUnlockContents(full,1,30).some(t=>t.family==='extension')).toBe(false);
  const notices=new ProgressionNotices('extension-notices','test');notices.add({fromLevel:1,toLevel:30,heartsGranted:0,unlocks:levelUnlockContents(partial,1,30)});expect(new ProgressionNotices('extension-notices','test').take()?.unlocks?.filter(t=>t.family==='extension')).toHaveLength(5);
 });
 it.each([false,true])('write failure rejects parcel and payment, then one retry succeeds (hearts=%s)',hearts=>{
  const s=state(1,4);if(hearts)s.pattes=0;let raw=encodeGame(s),fail=false;const storage={getItem:(k:string)=>k===SAVE_KEY?raw:null,setItem:(k:string,v:string)=>{if(fail)throw Error('quota');if(k===SAVE_KEY)raw=v;}};
  const c=new GameController(storage,()=>0);const action={type:'expand',parcelId:'southeast',expectedCost:600} as const,q=quoteComplement(s,action,0);if(hearts&&!q.ok)throw Error(q.reason);const command=hearts?{type:'payWithHearts' as const,action,maxPattes:0,maxHearts:q.ok?q.hearts:0}:action;
  const before=c.getSnapshot().state,rawBefore=raw;fail=true;expect(c.perform(command)).toMatchObject({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(before);expect(raw).toBe(rawBefore);fail=false;expect(c.perform(command).ok).toBe(true);expect(c.perform(command).ok).toBe(false);expect(c.getSnapshot().state?.acquiredParcels).toEqual(['center','southeast']);c.dispose();
 });
});
