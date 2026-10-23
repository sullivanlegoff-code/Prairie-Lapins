import {previousStart as createGame} from './regression-start';
import {describe,it,expect,vi} from 'vitest';
import {act,advance,decodeGame,encodeGame,rabbitIncome} from '../src/simulation';
import {growthDuration,MINUTE,HOUR} from '../src/config/balance';
import {buildingPlacementReason} from '../src/simulation/placement';
import {nestForParent} from '../src/simulation/breeding';
import {quoteAcceleration} from '../src/simulation/hearts';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY,type SaveStorage} from '../src/persistence/storage';
import {emptyBuilding} from '../src/state/initial';
import {scenarioState} from '../src/dev/scenarios';
import type {Command,GameState} from '../src/state/types';
import {babyOf, setBaby, welcomeOf} from './nursery-baby';
const nest=(s:GameState)=>s.buildings.find(b=>b.kind==='nest')!;
const nursery=(s:GameState)=>s.buildings.find(b=>b.kind==='nursery')!;
const breed:Command={type:'breed',parents:['rabbit-2','rabbit-3']};
function run(s:GameState,c:Command,now=s.lastSimulatedAt){const r=act(s,c,now,()=>.9);if(!r.ok)throw Error(`${c.type}: ${r.reason}`);return r.state;}
function prepared(){const s=createGame(0);delete s.initiation;s.rabbits.forEach(r=>r.affection=2);s.pattes=0;s.hearts=0;return s;}
function transfer(s:GameState,now=s.lastSimulatedAt){return run(s,{type:'transferBirth',id:nest(s).id,birthId:nest(s).breeding!.birth.id},now);}
function decode(raw:string){const r=decodeGame(raw);if(!r.ok)throw Error(r.reason);return r.state;}
function memory(raw:string){const data=new Map([[SAVE_KEY,raw]]),flags={fail:false};const storage:SaveStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(flags.fail&&k===SAVE_KEY)throw Error('quota');data.set(k,v)}};return {data,flags,storage};}
describe('manual breeding v8',()=>{
 it('starts with three collision-free buildings, unchanged resources and retired possession rewards preserved but unavailable',()=>{
  let s=createGame(0);expect([s.pattes,s.grass,s.hearts]).toEqual([300,10,12]);expect(s.buildings.map(b=>b.kind)).toEqual(['enclosure','nest','nursery']);
  for(const b of s.buildings)expect(buildingPlacementReason(s,b.x,b.y,b.id)).toBeNull();
  expect(s.missions.completed).toEqual(expect.arrayContaining(['cozy-nest','welcome-babies']));
  for(const id of ['cozy-nest','welcome-babies'] as const){expect(act(s,{type:'claimMainMission',id},0)).toMatchObject({ok:false,reason:'NOT_READY'});}
 });
 it('launches at zero resources, rolls once and retains homes, capacity and full income',()=>{
  const before=prepared(),rng=vi.fn(()=>.9),result=act(before,breed,0,rng);expect(result.ok).toBe(true);if(!result.ok)return;
  const s=result.state;expect(rng).toHaveBeenCalledTimes(1);expect([s.pattes,s.hearts]).toEqual([0,0]);expect(s.rabbits).toEqual(before.rabbits);
  expect(s.rabbits.every(r=>nestForParent(s,r.id)?.id===nest(s).id)).toBe(true);
  const later=advance(s,HOUR);expect(later.buildings[0].incomeUnits).toBe(2*rabbitIncome(2)*HOUR);expect(babyOf(nursery(later))).toBeNull();
  expect(act(later,{type:'moveRabbit',id:'rabbit-2',enclosureId:'building-1'},HOUR)).toMatchObject({ok:false,reason:'PARENT_BUSY'});
  expect(act(later,breed,HOUR)).toMatchObject({ok:false,reason:'BUSY'});
 });
 it.each(['same','different'] as const)('reserves places and keeps the income of parents from %s habitats, even after the deadline',mode=>{
  let s=prepared();s.pattes=1000;s=run(s,{type:'buyBuilding',kind:'enclosure',habitatType:'neige',x:18,y:24});const second=s.buildings.at(-1)!;
  if(mode==='different')s=run(s,{type:'moveRabbit',id:'rabbit-3',enclosureId:second.id});
  s=run(s,{type:'buyRabbit',species:'paille',enclosureId:'building-1'});if(mode==='different')s=run(s,{type:'buyRabbit',species:'belier-gris',enclosureId:'building-1'});
  const homes=s.rabbits.map(r=>r.enclosureId);s=run(s,breed);s=advance(s,HOUR);
  expect(act(s,{type:'buyRabbit',species:'paille',enclosureId:'building-1'},HOUR)).toMatchObject({ok:false,reason:'CAPACITY_FULL'});
  expect(act(s,{type:'release',id:'rabbit-2'},HOUR)).toMatchObject({ok:false,reason:'PARENT_BUSY'});
  for(const b of s.buildings.filter(b=>b.kind==='enclosure'))expect(b.incomeUnits).toBe(s.rabbits.filter(r=>r.enclosureId===b.id).reduce((sum,r)=>sum+rabbitIncome(r.affection)*HOUR,0));
  s=transfer(s);expect(s.rabbits.map(r=>r.enclosureId)).toEqual(homes);expect(nest(s).breeding).toBeNull();
 });
 it('waits offline and across reload; transfer alone starts a full growth at the click time',()=>{
  const started=run(prepared(),breed),birth=nest(started).breeding!.birth;
  let s=decode(encodeGame(advance(started,48*HOUR)));expect(nest(s).breeding!.birth).toEqual(birth);expect(babyOf(nursery(s))).toBeNull();
  s=transfer(s,48*HOUR+MINUTE);expect(babyOf(nursery(s))).toEqual({slot:0,birth,startedAt:48*HOUR+MINUTE,readyAt:48*HOUR+MINUTE+growthDuration(birth.species)});
  expect(decode(encodeGame(s))).toEqual(s);expect(s.discovered).not.toContain('brumelin');
 });
 it('does not transfer when an occupied nursery is freed, and rejects early/stale/double clicks without loss',()=>{
  let s=run(prepared(),breed),job=nest(s).breeding!;const cmd:Command={type:'transferBirth',id:nest(s).id,birthId:job.birth.id};
  expect(act(s,cmd,0)).toMatchObject({ok:false,reason:'NOT_READY',state:s});
  setBaby(nursery(s), {birth:{id:`birth-${s.nextId++}`,species:'paille',guaranteed:false,reservedDiscovery:false},startedAt:0,readyAt:15*MINUTE});
  s=advance(s,25*MINUTE);expect(act(s,cmd)).toMatchObject({ok:false,reason:'BUSY',state:s});
  s=run(s, welcomeOf(s, 'building-1'));expect(babyOf(nursery(s))).toBeNull();expect(nest(s).breeding!.birth).toEqual(job.birth);
  s=advance(s,HOUR);expect(babyOf(nursery(s))).toBeNull();expect(act(s,{...cmd,birthId:'birth-999'})).toMatchObject({ok:false,reason:'STALE_ACTION',state:s});
  s=run(s,cmd);const stable=encodeGame(s);expect(act(s,cmd)).toMatchObject({ok:false,reason:'NOT_READY',state:s});expect(encodeGame(s)).toBe(stable);
 });
 it('accelerates only the breeding deadline and keeps parents locked until transfer',()=>{
  let s=prepared();s.hearts=10;s=run(s,breed);const birth=nest(s).breeding!.birth;
  const q=quoteAcceleration(s,nest(s).id,'breeding',MINUTE);if(!q.ok)throw Error(q.reason);
  s=run(s,{type:'accelerate',id:nest(s).id,stage:'breeding',jobKey:q.jobKey,maxHearts:q.hearts},MINUTE);
  expect(nest(s).breeding).toMatchObject({birth,endsAt:MINUTE});expect(babyOf(nursery(s))).toBeNull();expect(nestForParent(s,'rabbit-2')).toBeTruthy();
  s=transfer(s);expect(babyOf(nursery(s))!.startedAt).toBe(MINUTE);expect(s.hearts).toBe(10-q.hearts);
 });
 it('allows buildings to move during the wait, preserving occupants, work and return destinations',()=>{
  let s=run(prepared(),breed);s=run(s,{type:'moveBuilding',id:nest(s).id,x:18,y:21});s=run(s,{type:'moveBuilding',id:'building-1',x:23,y:25});
  const homes=structuredClone(s.rabbits);s=transfer(advance(s,20*MINUTE));expect(s.rabbits).toEqual(homes);expect(s.buildings[0]).toMatchObject({x:23,y:25});expect(nest(s)).toMatchObject({x:18,y:21});
 });
 it('commits the transfer and its saved result together; write failure and retry never split parents from baby',()=>{
  const s=advance(run(prepared(),breed),20*MINUTE),m=memory(encodeGame(s)),c=new GameController(m.storage,()=>20*MINUTE);
  const cmd:Command={type:'transferBirth',id:nest(s).id,birthId:nest(s).breeding!.birth.id};m.flags.fail=true;
  expect(c.perform(cmd)).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});expect(nest(c.getSnapshot().state!).breeding).toEqual(nest(s).breeding);expect(babyOf(nursery(c.getSnapshot().state!))).toBeNull();
  m.flags.fail=false;expect(c.perform(cmd).ok).toBe(true);expect(c.perform(cmd).ok).toBe(false);
  const restored=new GameController(m.storage,()=>HOUR);expect(nest(restored.getSnapshot().state!).breeding).toBeNull();expect(babyOf(nursery(restored.getSnapshot().state!))!.birth).toEqual(nest(s).breeding!.birth);c.dispose();restored.dispose();
 });
 it('retires direct and indirect purchases and permits one free placement per missing equipment',()=>{
  let s=prepared();s.buildings=s.buildings.filter(b=>b.kind==='enclosure');
  for(const kind of ['nest','nursery'] as const){const cmd:Command={type:'buyBuilding',kind,x:18,y:20};expect(act(s,cmd)).toMatchObject({ok:false,reason:'INVALID_CHOICE',state:s});expect(act(s,{type:'payWithHearts',action:cmd,maxHearts:100,maxPattes:0})).toMatchObject({ok:false,reason:'INVALID_CHOICE',state:s});s=run(s,{type:'placeStarterBuilding',kind,x:kind==='nest'?18:26,y:20});expect(act(s,{type:'placeStarterBuilding',kind,x:18,y:28})).toMatchObject({ok:false,reason:'BUILDING_LIMIT',state:s});}
  expect([s.pattes,s.hearts]).toEqual([0,0]);
 });
 it.each(['moved','entrusted'] as const)('preserves an old waiting result whose parent was %s and never recreates an individual',mode=>{
  let old=advance(run(prepared(),breed),20*MINUTE);old.buildings.push(emptyBuilding(`building-${old.nextId++}`,'enclosure',18,24));
  if(mode==='moved')old.rabbits[0].enclosureId=old.buildings.at(-1)!.id;else old.rabbits=old.rabbits.filter(r=>r.id!=='rabbit-2');
  const savedRabbits=structuredClone(old.rabbits),birth=nest(old).breeding!.birth;let s=decode(encodeGame(old));expect(s.rabbits).toEqual(savedRabbits);expect(nest(s).breeding!.birth).toEqual(birth);
  s=transfer(s);expect(s.rabbits).toEqual(savedRabbits);expect(babyOf(nursery(s))!.birth).toEqual(birth);expect(s.rabbits).toHaveLength(savedRabbits.length);
 });
 it('leaves a pre-existing nursery baby and its exact growth timestamps in place',()=>{
  const old=transfer(advance(run(prepared(),breed),20*MINUTE));const s=decode(encodeGame(old));expect(nursery(s)).toEqual(nursery(old));expect(nest(s).breeding).toBeNull();expect(s.rabbits).toEqual(old.rabbits);
 });
 it('validates the dedicated laboratory scenario with two homes, a running free reproduction and an occupied nursery',()=>{
  const s=scenarioState('manualBreeding',HOUR);expect([s.pattes,s.hearts]).toEqual([0,0]);expect(nest(s).breeding?.parents).toEqual(['rabbit-2','rabbit-3']);expect(new Set(s.rabbits.map(r=>r.enclosureId)).size).toBe(2);expect(babyOf(nursery(s))).toBeTruthy();expect(decode(encodeGame(s))).toEqual(s);
 });
});
