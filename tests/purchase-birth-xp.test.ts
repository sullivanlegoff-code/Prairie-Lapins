import {describe,expect,it} from 'vitest';
import {act,advance,encodeGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {PROGRESSION} from '../src/config/progression';
import {SPECIES,type SpeciesId} from '../src/config/balance';
import {GameController} from '../src/application/GameController';
import {quoteComplement} from '../src/simulation/actions';
import {SAVE_KEY} from '../src/persistence/storage';
import type {Command,GameState} from '../src/state/types';
import {setBaby, welcomeOf} from './nursery-baby';
function rich(){const s=createCentreStartGame(0);delete s.levelAccessTransition;s.pattes=10000;s.purchaseUnlocks=['universal','feu','volant'];s.buildings[0].habitat!.type='universal';return s;}
function run(s:GameState,c:Command,t=s.lastSimulatedAt){const r=act(s,c,t,()=>.99);if(!r.ok)throw Error(r.reason);return r;}
function baby(species:SpeciesId){const s=rich();setBaby(s.buildings.find(b=>b.kind==='nursery')!, {birth:{id:'birth-6',species,guaranteed:false,reservedDiscovery:false},startedAt:0,readyAt:0});s.nextId=7;return s;}
function controller(s:GameState){const data=new Map([[SAVE_KEY,encodeGame(s)]]),flag={fail:false},events:unknown[]=[];const c=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(flag.fail)throw Error('quota');data.set(k,v);}},()=>0);c.onProgressionGain(g=>events.push(g));return{c,data,flag,events};}
describe('purchase and birth XP in the same candidate',()=>{
 it.each(['paille','neige','feu','belier-gris','volant'] as SpeciesId[])('purchases %s once with purchase-only XP',species=>{
  const s=rich(),r=run(s,{type:'buyRabbit',species,enclosureId:'building-1'});expect(r.state.progression.totalXp).toBe(PROGRESSION.xp.commonPurchase);expect(r.progressionGain?.xpGained).toBe(PROGRESSION.xp.commonPurchase);expect(r.state.pattes).toBe(s.pattes-SPECIES[species].price!);expect(s.rabbits).toHaveLength(1);
 });
 it.each(['universal','neige','farm'] as const)('pays and creates %s with catalogue XP',kind=>{
  const s=rich(),r=run(s,kind==='farm'?{type:'buyBuilding',kind,x:18,y:24}:{type:'buyBuilding',kind:'enclosure',habitatType:kind,x:18,y:24});
  expect(r.state.progression.totalXp).toBe(kind==='farm'?PROGRESSION.xp.construction.farm:kind==='universal'?PROGRESSION.xp.construction.universalHabitat:PROGRESSION.xp.construction.specializedHabitat);expect(r.state.buildings).toHaveLength(4);
 });
 it.each(['paille','lunettes','bouee','magicien','dragon'] as SpeciesId[])('welcomes an existing pending %s for its real rarity, once',species=>{
  const s=baby(species),r=run(s, welcomeOf(s, 'building-1'));expect(r.state.progression.totalXp).toBe(PROGRESSION.xp.birth[SPECIES[species].rarity]);expect(r.state.rabbits.at(-1)?.id).toBe('birth-6');expect(r.state.missions.events.welcome).toBe(1);expect(r.state.discovered).toContain(species);const again=act(r.state, welcomeOf(r.state, 'building-1'),0);expect(again.ok).toBe(false);expect(again.state).toEqual(r.state);
 });
 it.each([{type:'buyRabbit',species:'neige',enclosureId:'building-1'},{type:'buyBuilding',kind:'enclosure',habitatType:'neige',x:18,y:24},{type:'buyBuilding',kind:'farm',x:18,y:24}] as Command[])('heart complement grants the same XP once for $type',cmd=>{
  const normal=run(rich(),cmd),s=rich();s.pattes=0;s.hearts=100;const q=quoteComplement(s,cmd as Parameters<typeof quoteComplement>[1],0);if(!q.ok)throw Error(q.reason);
  expect(q.hearts).toBeGreaterThan(0);expect(s.progression.totalXp).toBe(0);const r=run(s,{type:'payWithHearts',action:cmd as Parameters<typeof quoteComplement>[1],maxHearts:q.hearts,maxPattes:q.pattes});expect(r.progressionGain?.xpGained).toBe(normal.progressionGain?.xpGained);expect(r.state.hearts).toBe(100-q.hearts+r.progressionGain!.heartsGranted);
 });
 it('pays before rewarding a level and cannot finance its own purchase with future hearts',()=>{
  const s=rich();s.progression.totalXp=30;s.pattes=0;s.hearts=3;const command={type:'payWithHearts',action:{type:'buyRabbit',species:'neige',enclosureId:'building-1'},maxHearts:4,maxPattes:0} as const;
  const denied=act(s,command,0);expect(denied).toEqual({ok:false,state:s,reason:'NOT_ENOUGH_HEARTS'});s.hearts=4;const r=run(s,command);expect(r.state.pattes).toBe(0);expect(r.state.hearts).toBe(1);expect(r.progressionGain).toEqual({xpGained:20,rewardedLevels:[2],heartsGranted:1});
 });
 it.each([{type:'buyRabbit',species:'neige',enclosureId:'building-1'},{type:'buyBuilding',kind:'farm',x:18,y:24},{type:'welcome',enclosureId:'building-1',birthId:'birth-6'}] as Command[])('XP/heart overflow refuses the entire $type candidate',command=>{
  for(const overflow of ['xp','hearts']){const s=baby('paille');if(overflow==='xp')s.progression.totalXp=Number.MAX_SAFE_INTEGER;else{s.progression.totalXp=49;s.hearts=Number.MAX_SAFE_INTEGER;}const before=structuredClone(s),r=act(s,command,0);expect(r.ok).toBe(false);expect(r.state).toEqual(before);expect(s).toEqual(before);}
 });
 it.each(['full','incompatible','collision','poor'] as const)('refuses %s without XP',reason=>{
  const s=rich();let cmd:Command={type:'buyRabbit',species:'neige',enclosureId:'building-1'};
  if(reason==='full'){s.rabbits.push({id:'rabbit-6',species:'paille',affection:1,enclosureId:'building-1'},{id:'rabbit-7',species:'paille',affection:1,enclosureId:'building-1'});s.nextId=8;}
  if(reason==='incompatible')s.buildings[0].habitat!.type='paille';if(reason==='poor')s.pattes=0;if(reason==='collision')cmd={type:'buyBuilding',kind:'farm',x:22,y:24};const r=act(s,cmd,0);expect(r.ok).toBe(false);expect(r.state).toEqual(s);
 });
 it.each([{type:'buyRabbit',species:'neige',enclosureId:'building-1'},{type:'buyBuilding',kind:'farm',x:18,y:24},{type:'welcome',enclosureId:'building-1',birthId:'birth-6'}] as Command[])('write failure and retry commits exactly one complete $type candidate',command=>{
  const s=baby('paille'),m=controller(s),before=m.c.getSnapshot().state;m.flag.fail=true;expect(m.c.perform(command)).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});expect(m.c.getSnapshot().state).toEqual(before);expect(m.events).toHaveLength(0);m.flag.fail=false;expect(m.c.perform(command).ok).toBe(true);expect(m.events).toHaveLength(1);const committed=m.c.getSnapshot().state;m.c.dispose();const restored=new GameController({getItem:k=>m.data.get(k)??null,setItem:(k,v)=>{m.data.set(k,v);}},()=>0);expect(restored.getSnapshot().state).toEqual(committed);restored.dispose();
 });
 it('offered buildings, movement and birth delays add no XP beyond meal, mission and launch',()=>{
  let s=rich();expect(s.progression.totalXp).toBe(0);s.buildings=s.buildings.filter(b=>b.kind!=='nest');let r=run(s,{type:'placeStarterBuilding',kind:'nest',x:18,y:20});s=r.state;expect(s.progression.totalXp).toBe(0);
  s=run(s,{type:'moveBuilding',id:'building-1',x:22,y:25}).state;s=run(s,{type:'moveRabbit',id:'rabbit-2',enclosureId:'building-1'}).state;s=run(s,{type:'feed',id:'rabbit-2'}).state;s=run(s,{type:'claimMainMission',id:'first-meal'}).state;
  s.rabbits.push({id:'rabbit-7',species:'neige',affection:2,enclosureId:'building-1'});s.discovered.push('neige');s.nextId=8;s=run(s,{type:'breed',parents:['rabbit-2','rabbit-7']}).state;s=advance(s,1200000);const n=s.buildings.find(b=>b.kind==='nest')!;s=run(s,{type:'transferBirth',id:n.id,birthId:n.breeding!.birth.id}).state;s=advance(s,7200000);expect(s.progression.totalXp).toBe(PROGRESSION.xp.foodMultiplier*2+PROGRESSION.xp.breedingLaunch+PROGRESSION.xp.claims.main);
 });
 it('a distinct later purchase is a new action, not a duplicated birth reward',()=>{
  let s=rich();s=run(s,{type:'buyRabbit',species:'paille',enclosureId:'building-1'}).state;s=run(s,{type:'buyRabbit',species:'paille',enclosureId:'building-1'}).state;expect(s.progression.totalXp).toBe(2*PROGRESSION.xp.commonPurchase);expect(new Set(s.rabbits.map(r=>r.id)).size).toBe(3);
 });
});
