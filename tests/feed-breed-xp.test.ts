import {describe,expect,it} from 'vitest';
import {welcomeOf} from './nursery-baby';
import {act,advance,createGame,encodeGame} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import {foodXp} from '../src/simulation/progression';
import {PROGRESSION} from '../src/config/progression';
import {jobKey} from '../src/simulation/initiation';
import {SAVE_KEY} from '../src/persistence/storage';
import type {Command,GameState} from '../src/state/types';
function parents(){const s=createGame(0);s.grass=10;s.buildings[0].habitat!.type='universal';s.rabbits[0].affection=2;s.rabbits.push({id:'rabbit-3',species:'neige',affection:2,enclosureId:'building-1'});s.discovered.push('neige');return s;}
const breed:Command={type:'breed',parents:['rabbit-2','rabbit-3']};
function run(s:GameState,c:Command,t=s.lastSimulatedAt){const r=act(s,c,t,()=>.1);if(!r.ok)throw Error(r.reason);return r;}
describe('food and launch XP candidates',()=>{
 it.each([1,2,19])('affection %i → next: actual herb cost and configured XP',affection=>{
  const s=createGame(0);s.grass=100;s.rabbits[0].affection=affection;const r=run(s,{type:'feed',id:'rabbit-2'});
  expect(r.state.grass).toBe(100-2*affection);expect(r.state.rabbits[0].affection).toBe(affection+1);expect(r.state.progression.totalXp).toBe(foodXp(affection+1));expect(r.progressionGain?.xpGained).toBe(foodXp(affection+1));expect(s.rabbits[0].affection).toBe(affection);
 });
 it.each(['empty','maximum'])('refuses %s food without any change',reason=>{const s=createGame(0);if(reason==='empty')s.grass=0;else s.rabbits[0].affection=20;const r=act(s,{type:'feed',id:'rabbit-2'},0);expect(r.ok).toBe(false);expect(r.state).toEqual(s);});
 it('legitimate successive meals gain each XP, while a refused launch gives nothing',()=>{let s=createGame(0);s.grass=10;s=run(s,{type:'feed',id:'rabbit-2'}).state;s=run(s,{type:'feed',id:'rabbit-2'}).state;expect(s.progression.totalXp).toBe(foodXp(2)+foodXp(3));const r=act(s,breed,0);expect(r.ok).toBe(false);expect(r.state).toEqual(s);});
 it('launches once with the actual draw, reservation, missions and occupied parents',()=>{
  const s=parents(),r=run(s,breed);expect(r.state.progression.totalXp).toBe(PROGRESSION.xp.breedingLaunch);expect(r.state.missions.events.breed).toBe(1);expect(r.state.buildings.find(b=>b.kind==='nest')!.breeding?.parents).toEqual(['rabbit-2','rabbit-3']);expect(act(r.state,breed,0)).toEqual({ok:false,state:r.state,reason:'BUSY'});
 });
 it.each(['missing','low','same'])('invalid %s parents give no XP',why=>{const s=parents();if(why==='low')s.rabbits[1].affection=1;const command:Command={type:'breed',parents:why==='same'?['rabbit-2','rabbit-2']:why==='missing'?['rabbit-2','rabbit-99']:['rabbit-2','rabbit-3']};expect(act(s,command,0)).toMatchObject({ok:false,state:s});});
 it.each(['feed','breed'] as const)('%s crosses a level with exact rewards and refuses resource overflow atomically',type=>{
  const s=parents();s.progression.totalXp=49;const c:Command=type==='breed'?breed:{type:'feed',id:'rabbit-2'};const r=run(s,c);expect(r.state.hearts).toBe(13);expect(r.progressionGain?.rewardedLevels).toEqual([2]);expect(r.state.progression.totalXp).toBe(49+(type==='breed'?PROGRESSION.xp.breedingLaunch:foodXp(3)));
  s.hearts=Number.MAX_SAFE_INTEGER;expect(act(s,c,0)).toEqual({ok:false,state:s,reason:'RESOURCE_LIMIT'});
 });
 it.each(['feed','breed'] as const)('%s failed save discards the entire candidate, then retries once',type=>{
  const data=new Map([[SAVE_KEY,encodeGame(parents())]]),flags={fail:false},events:unknown[]=[];const c=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(flags.fail)throw Error('quota');data.set(k,v);}},()=>0,()=>.1);c.onProgressionGain(g=>events.push(g));const before=c.getSnapshot().state,command:Command=type==='breed'?breed:{type:'feed',id:'rabbit-2'};flags.fail=true;
  expect(c.perform(command)).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(before);expect(events).toHaveLength(0);flags.fail=false;expect(c.perform(command).ok).toBe(true);expect(events).toHaveLength(1);const saved=c.getSnapshot().state;c.dispose();const reload=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}},()=>0);expect(reload.getSnapshot().state).toEqual(saved);reload.dispose();
 });
 it('paid acceleration ends only the delay, with no extra XP',()=>{
  let s=run(parents(),breed).state;const nest=s.buildings.find(b=>b.kind==='nest')!;const before=s.progression.totalXp;
  s=run(s,{type:'accelerate',id:nest.id,stage:'breeding',jobKey:jobKey(nest,'breeding')!,maxHearts:4}).state;
  expect(s.progression.totalXp).toBe(before);expect(s.hearts).toBe(8);expect(s.buildings.find(b=>b.kind==='nest')!.breeding!.endsAt).toBe(0);
 });
 it.each(['feed','breed'] as const)('%s XP overflow rolls back herbs, draw and work',type=>{
  const s=parents();s.progression.totalXp=Number.MAX_SAFE_INTEGER;const r=act(s,type==='breed'?breed:{type:'feed',id:'rabbit-2'},0,()=>.1);expect(r).toEqual({ok:false,state:s,reason:'RESOURCE_LIMIT'});
 });
 it('aid, time, transfer and growth do not add launch XP again',()=>{
  let s=run(parents(),breed).state;const nest=s.buildings.find(b=>b.kind==='nest')!;s=run(s,{type:'initiationAid',id:nest.id,stage:'breeding',jobKey:jobKey(nest,'breeding')!}).state;s=run(s,{type:'transferBirth',id:nest.id,birthId:s.initiation!.birthId!}).state;s=advance(s,1800000);expect(s.progression.totalXp).toBe(PROGRESSION.xp.breedingLaunch);s=run(s, welcomeOf(s, 'building-1')).state;expect(s.progression.totalXp).toBe(PROGRESSION.xp.breedingLaunch+PROGRESSION.xp.birth.rare);
 });
});
