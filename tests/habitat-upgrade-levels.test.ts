import {describe,it,expect} from 'vitest';
import {createGame,act,advance,encodeGame,decodeGame} from '../src/simulation';
import {cumulativeLevelXp,requiredHabitatUpgradeLevel} from '../src/simulation/progression';
import {HABITAT_TYPES,habitatLevel,type HabitatType} from '../src/config/habitats';
import {HOUR} from '../src/config/balance';
import {quoteComplement} from '../src/simulation/actions';
import {establishHistoricalLevelRights,levelUnlockContents} from '../src/simulation/levelRights';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import type {Command,GameState} from '../src/state/types';
function state(type:HabitatType,from:1|2,player:number){const s=createGame(0);s.buildings[0].habitat={type,level:from};s.pattes=10000;s.hearts=1000;s.progression={totalXp:cumulativeLevelXp(player),rewardedThroughLevel:player};return s;}
const run=(s:GameState,c:Command,t=0)=>{const r=act(s,c,t);if(!r.ok)throw Error(r.reason);return r.state;};
const rows=HABITAT_TYPES.flatMap(type=>([2,3] as const).map(to=>({type,to,from:(to-1) as 1|2})));
describe('target-level habitat upgrades',()=>{
 it('matches the centrally configured table',()=>{
  const expected={paille:[3,6],neige:[3,6],terre:[5,8],feu:[7,10],universal:[8,11],metal:[9,12],vol:[11,14]};
  for(const type of HABITAT_TYPES)expect([requiredHabitatUpgradeLevel(type,2),requiredHabitatUpgradeLevel(type,3)]).toEqual(expected[type]);
 });
 it.each(rows)('$type to $to refuses before the threshold and allows normal/hearts payment at it',({type,to,from})=>{
  const level=requiredHabitatUpgradeLevel(type,to),s=state(type,from,level-1),command={type:'upgradeHabitat',id:'building-1',fromLevel:from} as const;
  s.buildings[0].incomeUnits=HOUR/2+17;const before=structuredClone(s);expect(act(s,command,0)).toEqual({ok:false,state:before,reason:'LEVEL_REQUIRED'});expect(s).toEqual(before);
  expect(quoteComplement({...s,pattes:0},command,0)).toEqual({ok:false,reason:'LEVEL_REQUIRED'});
  expect(act({...s,pattes:0},{type:'payWithHearts',action:command,maxHearts:1000,maxPattes:0},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});
  s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};const next=run(s,command);expect(next.pattes).toBe(to===3?s.pattes:s.pattes-habitatLevel(type,to).cost);expect(next.progression).toEqual(s.progression);expect(next.hearts).toBe(to===3?s.hearts-10:s.hearts);expect(next.rabbits).toEqual(s.rabbits);expect(next.buildings[0]).toEqual({...s.buildings[0],habitat:{type,level:to},footprintTier:to});
  const poor={...s,pattes:0};
  if(to===3){
   // Level 3 is paid in exactly ten hearts: no coin is needed, and no coin complement or quote exists for it.
   expect(run(poor,command).hearts).toBe(s.hearts-10);expect(run(poor,command).pattes).toBe(0);
   expect(act(poor,{type:'payWithHearts',action:command,maxHearts:1000,maxPattes:0},0)).toMatchObject({ok:false,reason:'INVALID_CHOICE'});
   expect(quoteComplement(poor,command,0)).toEqual({ok:false,reason:'INVALID_CHOICE'});
  } else {
   const q=quoteComplement(poor,command,0);if(!q.ok)throw Error(q.reason);const paid=run(poor,{type:'payWithHearts',action:command,maxHearts:q.hearts,maxPattes:0});expect(paid.hearts).toBe(s.hearts-q.hearts);expect(paid.progression).toEqual(s.progression);
  }
  expect(act(next,command,0)).toMatchObject({ok:false,reason:'STALE_ACTION',state:next});
 });
 it('does not grandfather the next upgrade from an old purchase or existing level 2',()=>{
  const s=state('universal',2,1);delete s.levelAccessTransition;s.purchaseUnlocks=['universal'];establishHistoricalLevelRights(s);
  const decoded=decodeGame(encodeGame(s));if(!decoded.ok)throw Error(decoded.reason);expect(decoded.state.buildings[0].habitat?.level).toBe(2);
  expect(act(decoded.state,{type:'upgradeHabitat',id:'building-1',fromLevel:2},0)).toMatchObject({ok:false,reason:'LEVEL_REQUIRED'});
  expect(act(state('paille',1,14),{type:'upgradeHabitat',id:'building-1',fromLevel:2},0)).toMatchObject({ok:false,reason:'STALE_ACTION'});
  expect(act(state('paille',2,14),{type:'upgradeHabitat',id:'building-1',fromLevel:3},0)).toMatchObject({ok:false,reason:'STALE_ACTION'});
 });
 it('keeps parents and fractional stock; a long absence caps at the old limit before upgrading',()=>{
  let s=state('paille',1,3);s.rabbits[0].affection=2;s.rabbits.push({id:'rabbit-6',species:'paille',affection:2,enclosureId:'building-1'});s.nextId=7;s=run(s,{type:'breed',parents:['rabbit-2','rabbit-6']});s.buildings[0].incomeUnits=HOUR/2+17;
  const command={type:'upgradeHabitat',id:'building-1',fromLevel:1} as const,next=run(s,command);expect(next.buildings[0].incomeUnits).toBe(HOUR/2+17);expect(next.rabbits).toEqual(s.rabbits);expect(next.buildings[1].breeding).toEqual(s.buildings[1].breeding);expect(next.progression).toEqual(s.progression);
  const absent=run(s,command,1000*HOUR);expect(absent.buildings[0].incomeUnits).toBe(habitatLevel('paille',1).cap*HOUR);expect(advance(absent,1001*HOUR).buildings[0].incomeUnits).toBe((habitatLevel('paille',1).cap+28)*HOUR);
 });
 it.each([false,true])('write refusal rolls back the upgrade and payment, hearts=%s',hearts=>{
  const s=state('paille',1,3);if(hearts)s.pattes=0;const data=new Map([[SAVE_KEY,encodeGame(s)]]);let fail=false;const c=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');data.set(k,v);}},()=>0);const events:unknown[]=[];c.onProgressionGain(g=>events.push(g));const command:Command=hearts?{type:'payWithHearts',action:{type:'upgradeHabitat',id:'building-1',fromLevel:1},maxHearts:1000,maxPattes:0}:{type:'upgradeHabitat',id:'building-1',fromLevel:1};
  fail=true;expect(c.perform(command)).toMatchObject({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(s);fail=false;expect(c.perform(command).ok).toBe(true);expect(events).toHaveLength(0);expect(c.getSnapshot().state?.progression).toEqual(s.progression);c.dispose();
 });
 it('announces each type/target once and never extensions, independent of owned exemplars',()=>{
  const s=createGame(0),contents=levelUnlockContents(s,1,30),upgrades=contents.filter(t=>t.family==='habitatUpgrade');expect(upgrades).toHaveLength(HABITAT_TYPES.length*2);expect(new Set(upgrades.map(t=>JSON.stringify(t))).size).toBe(upgrades.length);expect(contents.filter(t=>t.family==='extension')).toHaveLength(8);
  for(const {type,to} of rows){const level=requiredHabitatUpgradeLevel(type,to);expect(levelUnlockContents(s,level-1,level)).toContainEqual({family:'habitatUpgrade',id:type,toLevel:to});}
 });
});
