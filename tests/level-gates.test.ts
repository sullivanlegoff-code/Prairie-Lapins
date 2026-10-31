import {describe,it,expect,vi} from 'vitest';
import {act,advance,decodeGame,encodeGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {emptyBuilding} from '../src/state/initial';
import {cumulativeLevelXp,progressionFromXp} from '../src/simulation/progression';
import {stateLevelAccess,establishHistoricalLevelRights,levelUnlockContents} from '../src/simulation/levelRights';
import {checkLevelAccess} from '../src/simulation/levelAccess';
import {breedingPool, chooseBirth} from '../src/simulation/breeding';
import {quoteComplement} from '../src/simulation/actions';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {SPECIES, SPECIES_IDS,type SpeciesId} from '../src/config/balance';
import {PROGRESSION} from '../src/config/progression';
import type {Command,GameState} from '../src/state/types';
import {setBaby, welcomeOf} from './nursery-baby';
const at=(level:number)=>{const s=createCentreStartGame(0);s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};s.buildings[0].habitat!.type='universal';s.pattes=10000;s.grass=10000;return s;};
const run=(s:GameState,c:Command,t=0)=>{const r=act(s,c,t,()=>.99);if(!r.ok)throw Error(r.reason);return r.state;};
const reload=(s:GameState)=>{const d=decodeGame(encodeGame(s));if(!d.ok)throw Error(d.reason);return d.state;};
const odds=(level:number,a:SpeciesId,b:SpeciesId)=>{const pool=breedingPool(at(level),a,b,10,10);return Object.fromEntries(Object.entries(pool.weights).map(([id,w])=>[id,w!*100/pool.total]));};
describe('active species and habitat level gates',()=>{
 it('new start has no historical exemptions and required early purchases remain possible',()=>{
  const s=createCentreStartGame(0);expect(s.levelAccessTransition).toEqual({version:1,rights:[]});
  expect(s.discovered).toEqual(['paille']);expect(s.pattes).toBe(350);
  let next=run(s,{type:'buyBuilding',kind:'enclosure',habitatType:'neige',x:18,y:24});const enclosureId=next.buildings.at(-1)!.id;
  next=run(next,{type:'buyRabbit',species:'neige',enclosureId});next=run(next,{type:'claimMainMission',id:'welcome-snow'});
  expect(next.pattes).toBe(120);next=run(next,{type:'buyBuilding',kind:'farm',x:22,y:20});expect(next.pattes).toBe(60);
  expect(stateLevelAccess(next,{family:'habitatPurchase',id:'paille'}).accessible).toBe(true);
 });
 it.each([['feu',5],['belier-gris',7],['volant',9]] as const)('purchase %s checks the pre-action level, including heart complements', (species,level)=>{
  const command={type:'buyRabbit',species,enclosureId:'building-1'} as const;
  const before=at(level-1);before.progression.totalXp=cumulativeLevelXp(level)-1;
  expect(act(before,command,0)).toEqual({ok:false,state:before,reason:'LEVEL_REQUIRED'});
  expect(before.progression.totalXp).toBe(cumulativeLevelXp(level)-1);
  const poor={...before,pattes:0,hearts:100};expect(quoteComplement(poor,command,0)).toEqual({ok:false,reason:'LEVEL_REQUIRED'});
  expect(act(poor,{type:'payWithHearts',action:command,maxHearts:100,maxPattes:0},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED',state:poor});
  const s=at(level);expect(run(s,command).pattes).toBe(10000-SPECIES[species].price!);
  const hearts={...s,pattes:0,hearts:100};const accepted=run(hearts,{type:'payWithHearts',action:command,maxHearts:Math.ceil(SPECIES[species].price!/25),maxPattes:0});expect(accepted.hearts).toBe(100-Math.ceil(SPECIES[species].price!/25));expect(accepted.progression.totalXp-s.progression.totalXp).toBe(70);
 });
 it.each([['universal',6],['feu',5],['vol',9]] as const)('habitat %s revalidates its level on final purchase', (habitatType,level)=>{
  const command={type:'buyBuilding',kind:'enclosure',habitatType,x:18,y:24} as const;
  expect(act(at(level-1),command,0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});
  const s=at(level);expect(run(s,command).buildings.at(-1)!.habitat?.type).toBe(habitatType);
  const poor={...at(level-1),pattes:0,hearts:100};expect(quoteComplement(poor,command,0)).toEqual({ok:false,reason:'LEVEL_REQUIRED'});
 });
 it('mission progress and claims no longer bypass gates, and inactive families stay unchanged',()=>{
  const s=at(1);s.discovered=[...SPECIES_IDS];s.missions.events.welcome=1;s.missions.completed=['first-birth','varied-family','growing-collection','seven-species'];
  const next=run(s,{type:'claimMainMission',id:'seven-species'});
  expect(next.levelAccessTransition!.rights).toEqual([]);expect(next.purchaseUnlocks).toEqual([]);
  expect(stateLevelAccess(next,{family:'species',id:'volant',action:'purchase'}).locked).toBe(true);
  expect(act(next,{type:'upgradeHabitat',id:'building-1',fromLevel:1},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});
  expect(PROGRESSION.activeLevelFamilies).toEqual({species:true,habitatPurchase:true,habitatUpgrade:true,decoration:true,extension:true});
 });
 it('keeps v9, captures only provable historical purchases and discovered breeding rights once',()=>{
  const s=at(1);delete s.levelAccessTransition;s.purchaseUnlocks=['feu'];s.discovered=['paille','neige','magicien'];s.missions.events.welcome=1;
  const migrated=reload(s);const rights=structuredClone(migrated.levelAccessTransition);
  expect(migrated.version).toBe(21);expect(stateLevelAccess(migrated,{family:'species',id:'feu',action:'purchase'}).accessible).toBe(true);expect(stateLevelAccess(migrated,{family:'species',id:'volant',action:'purchase'}).locked).toBe(true);
  expect(stateLevelAccess(migrated,{family:'species',id:'belier-gris',action:'purchase'}).accessible).toBe(true);
  expect(stateLevelAccess(migrated,{family:'habitatPurchase',id:'vol'}).accessible).toBe(true);
  expect(stateLevelAccess(migrated,{family:'habitatPurchase',id:'universal'}).locked).toBe(false); // three discoveries already proved the old milestone
  expect(stateLevelAccess(migrated,{family:'species',id:'magicien',action:'breedingResult'}).accessible).toBe(true);
  expect(stateLevelAccess(migrated,{family:'species',id:'volant',action:'purchase'}).locked).toBe(true);
  expect(checkLevelAccess(0,{family:'habitatUpgrade',id:'universal',toLevel:2},migrated.levelAccessTransition!.rights,{...PROGRESSION,activeLevelFamilies:{...PROGRESSION.activeLevelFamilies,habitatUpgrade:true}}).locked).toBe(true);
  migrated.discovered=[...SPECIES_IDS];migrated.missions.completed.push('seven-species');const again=reload(advance(migrated,100));
  expect(again.levelAccessTransition).toEqual(rights);expect(stateLevelAccess(again,{family:'species',id:'volant',action:'purchase'}).locked).toBe(true);
 });
 it('a lone old universal grants no universal purchase; a second old universal does',()=>{
  const s=at(1);delete s.levelAccessTransition;delete s.purchaseUnlocks;
  expect(stateLevelAccess(reload(s),{family:'habitatPurchase',id:'universal'}).locked).toBe(true);
  s.buildings.push(emptyBuilding('building-6','enclosure',18,24));s.nextId=7;
  expect(stateLevelAccess(reload(s),{family:'habitatPurchase',id:'universal'}).accessible).toBe(true);
 });
 it('old pending result remains welcomeable without fabricating a new historical right',()=>{
  const s=at(1);delete s.levelAccessTransition;setBaby(s.buildings.find(b=>b.kind==='nursery')!, {birth:{id:'birth-6',species:'dragon',guaranteed:false,reservedDiscovery:false},startedAt:0,readyAt:0});s.nextId=7;
  const migrated=reload(s),rights=structuredClone(migrated.levelAccessTransition);
  const next=reload(run(migrated, welcomeOf(migrated, 'building-1')));
  expect(next.discovered).toContain('dragon');expect(next.levelAccessTransition).toEqual(rights);
  expect(stateLevelAccess(next,{family:'species',id:'dragon',action:'breedingResult'}).locked).toBe(true);
 });
 it('rejects malformed, duplicate or overbroad persisted historical rights',()=>{
  for(const target of [{family:'species',id:'dragon',action:'purchase'},{family:'habitatUpgrade',id:'universal',toLevel:3}]){
   const raw={...at(1),levelAccessTransition:{version:1,rights:[{target,source:'legacy-purchase'}]}};expect(decodeGame(JSON.stringify(raw))).toEqual({ok:false,reason:'INVALID_STATE'});
  }
  const s=at(1);delete s.levelAccessTransition;establishHistoricalLevelRights(s);s.levelAccessTransition!.rights.push(s.levelAccessTransition!.rights[0]);expect(decodeGame(JSON.stringify(s)).ok).toBe(false);
 });
 it('announces actual purchase and recipe operations once; excludes historical grants',()=>{
  const s=at(1),contents=levelUnlockContents(s,1,14);
  expect(contents).toContainEqual({family:'species',id:'volant',action:'purchase'});expect(contents).toContainEqual({family:'species',id:'dragon',action:'breedingResult'});
  expect(contents.some(t=>!['species','habitatPurchase','habitatUpgrade','decoration','extension'].includes(t.family))).toBe(false);
  expect(new Set(contents.map(t=>JSON.stringify(t))).size).toBe(contents.length);
  const old=at(1);delete old.levelAccessTransition;old.purchaseUnlocks=['universal','feu','volant'];old.discovered=[...SPECIES_IDS];establishHistoricalLevelRights(old);expect(levelUnlockContents(old,1,14).every(t=>t.family==='decoration'||t.family==='habitatUpgrade'||t.family==='extension')).toBe(true);
 });
});
describe('pre-launch result filtering and unchanged fixed probabilities',()=>{
 it('preserves Paille × Neige and filters the guarantee by level',()=>{
  expect(odds(1,'paille','neige')).toEqual({frisket:50,icy:50});
  const s=at(1);s.pityFailures=7;s.discovered=['paille','neige','feu','wat-wat','glassofeu'];let pool=breedingPool(s,'feu','neige',4,4);expect(pool.guaranteed).toBe(false);expect(pool.weights).toEqual({'wat-wat':30,glassofeu:30});
  s.discovered=s.discovered.filter(id=>id!=='glassofeu');s.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6};pool=breedingPool(s,'feu','neige',4,4);expect(pool.guaranteed).toBe(true);expect(pool.weights).toEqual({'glassofeu':1});
 });
 it('reserves only currently admissible specials and normalizes ordinary results',()=>{
  expect(odds(10,'paille','belier-gris')).toEqual({roukette:50,boudinet:50});expect(odds(11,'paille','belier-gris')).toEqual({roukette:1200*100/3300,boudinet:1200*100/3300,magicien:450*100/3300,calinou:450*100/3300}); // Both parents at affection 10: the epic chance ×1.5.
  expect(odds(13,'dadi','phoenix').dragon).toBeUndefined();expect(odds(13,'dadi','phoenix').dadi).toBe(450*100/8100);
  const pair=odds(14,'dadi','phoenix');expect(pair.dragon).toBe(10.5);for(const id of ['dadi','dinono'])expect(pair[id]).toBeCloseTo(89.5*450/8100,10);expect(Object.keys(pair)).toHaveLength(9);for(const id of ['amethyste','phoenix','bouee','egiiipte','piment','bretonette'])expect(pair[id]).toBeCloseTo(89.5*1200/8100,10);
  for(let level=1;level<=14;level++)for(const a of SPECIES_IDS)for(const b of SPECIES_IDS){const result=odds(level,a,b),total=Object.values(result).reduce((n,w)=>n+w,0);if(total)expect(total).toBeCloseTo(100,10);}
 },20000);
 it('launch XP cannot alter this birth, even if it crosses a threshold',()=>{
  // Paille × Ardent is a mixed pair: its Common (Feu) gives no result, so only Ardent and SNK remain, before and after the launch XP.
  const s=at(4);s.progression.totalXp=cumulativeLevelXp(5)-1;s.rabbits.push({id:'rabbit-6',species:'ardent',affection:4,enclosureId:'building-1'});s.rabbits[0].affection=4;s.discovered.push('ardent');s.nextId=7;
  const launched=act(s,{type:'breed',parents:['rabbit-2','rabbit-6']},0,()=>.5);if(!launched.ok)throw Error(launched.reason);const next=launched.state;
  expect(progressionFromXp(next.progression.totalXp).level).toBe(5);expect(next.buildings.find(b=>b.kind==='nest')!.breeding!.birth.species).toBe(chooseBirth(s,'paille','ardent',.5,4,4).species);
  expect(reload(next).buildings.find(b=>b.kind==='nest')!.breeding).toEqual(next.buildings.find(b=>b.kind==='nest')!.breeding);
 });
 it('with no ordinary fallback, refuses before RNG, XP or work, even for a historically discovered special',()=>{
  // Every union of the catalogue now holds a level-1 result: withdraw the Paille-Metal ones here to recreate a pool without ordinary fallback.
  const saved=(['paille','roukette','boudinet'] as const).map(id=>[id,SPECIES[id].acquisition] as const);
  for(const [id] of saved)SPECIES[id].acquisition=[{kind:'shop',price:80}];
  try {
  const s=at(1);s.discovered.push('magicien');s.rabbits=[{id:'rabbit-2',species:'magicien',affection:6,enclosureId:'building-1'},{id:'rabbit-6',species:'magicien',affection:6,enclosureId:'building-1'}];s.nextId=7;delete s.levelAccessTransition;establishHistoricalLevelRights(s);
  const rng=vi.fn(()=>.99),r=act(s,{type:'breed',parents:['rabbit-2','rabbit-6']},0,rng);expect(r).toEqual({ok:false,state:s,reason:'NO_BREEDING_RESULT'});expect(rng).not.toHaveBeenCalled();expect(s.progression.totalXp).toBe(0);
  s.progression={totalXp:cumulativeLevelXp(7),rewardedThroughLevel:7};const pool=breedingPool(s,'magicien','magicien',6,6);expect(pool.total).toBe(0); expect(pool.weights).toEqual({}); // No ordinary result: nothing to reserve the 5 % against (the old check divided by zero).
  } finally {for(const [id,acquisition] of saved)SPECIES[id].acquisition=acquisition;}
 });
 it('write failure leaves purchase refused and no XP, then permits a single retry',()=>{
  const s=at(5),values=new Map([[SAVE_KEY,encodeGame(s)]]);let fail=false;const c=new GameController({getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');values.set(k,v);}},()=>0);const events=vi.fn();c.onProgressionGain(events);
  const before=c.getSnapshot().state;fail=true;expect(c.perform({type:'buyRabbit',species:'feu',enclosureId:'building-1'})).toMatchObject({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(before);expect(events).not.toHaveBeenCalled();
  fail=false;expect(c.perform({type:'buyRabbit',species:'feu',enclosureId:'building-1'}).ok).toBe(true);expect(events).toHaveBeenCalledTimes(1);c.dispose();
 });
});
