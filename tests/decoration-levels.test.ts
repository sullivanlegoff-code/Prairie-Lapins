import {describe,it,expect} from 'vitest';
import {act,decodeGame,encodeGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {DECORATIONS,DECORATION_IDS,decorationResalePrice,type DecorationId} from '../src/config/decorations';
import {cumulativeLevelXp,requiredDecorationLevel,firstDecorationPlacementXp} from '../src/simulation/progression';
import {stateLevelAccess,levelUnlockContents} from '../src/simulation/levelRights';
import {PROGRESSION} from '../src/config/progression';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import type {Command,GameState} from '../src/state/types';
const location={kind:'outside',x:18,y:28,rotation:0} as const;
function at(level:number){const s=createCentreStartGame(0);s.pattes=20000;s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};return s;}
const run=(s:GameState,c:Command)=>{const r=act(s,c,0);if(!r.ok)throw Error(r.reason);return r.state;};
const reload=(s:GameState)=>{const r=decodeGame(encodeGame(s));if(!r.ok)throw Error(r.reason);return r.state;};
describe('level gates acquire new decoration exemplars only',()=>{
 it.each(DECORATION_IDS)('%s is refused below its catalogue threshold in both purchase modes, and allowed at it',id=>{
  const level=requiredDecorationLevel(id);
  for(const placed of [false,true]){
   const command:Command={type:'buyDecoration',catalogId:id,...(placed?{location}:{})};
   if(level>1){const s=at(level-1);s.progression.totalXp=cumulativeLevelXp(level)-1;const before=structuredClone(s);expect(act(s,command,0)).toEqual({ok:false,state:before,reason:'LEVEL_REQUIRED'});expect(s).toEqual(before);}
   const s=at(level),next=run(s,command);expect(next.pattes).toBe(s.pattes-DECORATIONS[id].price);expect(next.decorations).toHaveLength(1);
   expect(next.decorations[0].placementXpProcessed).toBe(placed);
   expect(next.progression.totalXp-s.progression.totalXp).toBe(placed?firstDecorationPlacementXp(id):0);
   if(placed)expect(run(next,{type:'placeDecoration',id:next.decorations[0].id,location}).progression).toEqual(next.progression);
  }
 });
 it('an old below-level inventory object keeps its one-time pose XP and every usage, without granting repurchase',()=>{
  let s=at(1);s.decorations=[{id:'decoration-6',catalogId:'birthday-candle',location:{kind:'inventory'},placementXpProcessed:false}];s.nextId=7;s=reload(s);
  const start=s.pattes;s=run(s,{type:'placeDecoration',id:'decoration-6',location});const xp=firstDecorationPlacementXp('birthday-candle');expect(s.progression.totalXp).toBe(xp);expect(s.pattes).toBe(start);
  expect(act(s,{type:'buyDecoration',catalogId:'birthday-candle'},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED',state:s});
  s=run(s,{type:'placeDecoration',id:'decoration-6',location:{...location,x:20,rotation:0}});s=run(s,{type:'placeDecoration',id:'decoration-6',location:{kind:'inventory'}});s=reload(s);s=run(s,{type:'placeDecoration',id:'decoration-6',location});s=reload(s);
  expect(s.progression.totalXp).toBe(xp);expect(s.decorations[0].placementXpProcessed).toBe(true);expect(s.pattes).toBe(start);
  s=run(s,{type:'sellDecoration',id:'decoration-6'});expect(s.progression.totalXp).toBe(xp);expect(s.pattes).toBe(start+decorationResalePrice('birthday-candle'));
 });
 it.each(['inventory','outside'] as const)('historical %s objects without a placement marker never gain retroactive XP',kind=>{
  let s=at(1);s.decorations=[{id:'decoration-6',catalogId:'large-bookcase',location:kind==='outside'?location:{kind:'inventory'}}];s.nextId=7;s=reload(s);
  s=run(s,{type:'placeDecoration',id:'decoration-6',location:{kind:'inventory'}});s=run(s,{type:'placeDecoration',id:'decoration-6',location});expect(s.progression.totalXp).toBe(0);expect(s.decorations[0].placementXpProcessed).toBeUndefined();
 });
 it('unlocks do not arise from ownership, sale price, wallets or purchase XP',()=>{
  const s=at(1);s.pattes=Number.MAX_SAFE_INTEGER;s.hearts=Number.MAX_SAFE_INTEGER;s.decorations=[{id:'decoration-6',catalogId:'coconut-palm',location:{kind:'inventory'},placementXpProcessed:true}];s.nextId=7;
  expect(stateLevelAccess(s,{family:'decoration',id:'coconut-palm'}).requiredLevel).toBe(requiredDecorationLevel('coconut-palm'));
  expect(act(s,{type:'buyDecoration',catalogId:'coconut-palm',location},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED',state:s});
  expect(act(s,{type:'payWithHearts',action:{type:'buyDecoration',catalogId:'coconut-palm'} as never,maxHearts:999,maxPattes:0},0)).toMatchObject({ok:false,reason:'INVALID_CHOICE',state:s});
 });
 it('gates final confirmations against a replacement party and saves eligible purchase atomically',()=>{
  const id:DecorationId='hay-bale',s=at(requiredDecorationLevel(id)),data=new Map([[SAVE_KEY,encodeGame(s)]]);let fail=false;
  const c=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');data.set(k,v);}},()=>0);const events:unknown[]=[];c.onProgressionGain(g=>events.push(g));
  const command:Command={type:'buyDecoration',catalogId:id,location};const before=c.getSnapshot().state;fail=true;expect(c.perform(command)).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(before);expect(events).toHaveLength(0);
  fail=false;expect(c.perform(command).ok).toBe(true);expect(events).toHaveLength(1);const fresh=c.prepareImport(encodeGame(at(1)));if(!fresh.ok)throw Error(fresh.reason);c.confirmImport(fresh.token,true);const replaced=c.getSnapshot().state;
  expect(c.perform(command)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});expect(c.getSnapshot().state).toEqual(replaced);expect(events).toHaveLength(1);c.dispose();
 });
 it('announces every configured higher tier, without duplicates or unrelated extension tiers',()=>{
  const s=at(1),tiers=[...new Set(DECORATION_IDS.map(id=>requiredDecorationLevel(id)))].filter(level=>level>1);
  for(const level of tiers){
   const contents=levelUnlockContents(s,level-1,level);const ids=contents.filter(t=>t.family==='decoration').map(t=>t.family==='decoration'?t.id:'');
   expect(ids).toEqual(DECORATION_IDS.filter(id=>requiredDecorationLevel(id)===level));expect(new Set(ids).size).toBe(ids.length);
   expect(contents.filter(t=>t.family==='extension').map(t=>t.family==='extension'?t.rank:0)).toEqual(PROGRESSION.requirements.extensions.flatMap((required,index)=>required===level?[index+1]:[]));
  }
  const all=levelUnlockContents(s,1,5);expect(new Set(all.map(t=>JSON.stringify(t))).size).toBe(all.length);
  expect(all).toContainEqual({family:'species',id:'feu',action:'purchase'});expect(all).toContainEqual({family:'habitatPurchase',id:'feu'});
  expect(PROGRESSION.activeLevelFamilies).toEqual({species:true,habitatPurchase:true,habitatUpgrade:true,decoration:true,extension:true});
 });
});
