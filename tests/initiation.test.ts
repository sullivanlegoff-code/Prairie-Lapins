// HISTORICAL: previousStart reproduces the retired centre-start layout; current economy rules apply.
import {previousStart as createGame} from './regression-start';
import {describe,it,expect} from 'vitest';
import {act,advance,encodeGame,decodeGame} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {quoteAcceleration} from '../src/simulation/hearts';
import type {GameState,Command,TimedStage} from '../src/state/types';
import {babyOf, setBaby, welcomeOf} from './nursery-baby';
const run=(s:GameState,c:Command,t=s.lastSimulatedAt)=>{const r=act(s,c,t,()=>.1);if(!r.ok)throw Error(r.reason);return r.state;};
function ready(){let s=createGame(0);s=run(s,{type:'feed',id:'rabbit-2'});s=run(s,{type:'feed',id:'rabbit-3'});return s;}
function aid(s:GameState,id:string,stage:TimedStage):Command{return {type:'initiationAid',id,stage,jobKey:s.initiation![stage]!,...(stage==='growth'?{birthId:s.initiation!.birthId!}:{})};}
function breed(){return run(ready(),{type:'breed',parents:['rabbit-2','rabbit-3']});}
describe('initiation authorizations',()=>{
 it('only changes the exact timer, keeps resources, income, result and manual transfer',()=>{
  let s=breed();s=run(s,{type:'buyBuilding',kind:'farm',x:22,y:20});s=run(s,{type:'startOrder',id:'building-7',recipe: 'foin'});
  const before=structuredClone(s);const next=run(s,aid(s,'building-4','breeding'));
  expect(next.hearts).toBe(before.hearts);expect(next.pattes).toBe(before.pattes);expect(next.lastSimulatedAt).toBe(0);
  expect(next.buildings.find(b=>b.kind==='farm')).toEqual(before.buildings.find(b=>b.kind==='farm'));
  expect(next.buildings.find(b=>b.kind==='enclosure')).toEqual(before.buildings.find(b=>b.kind==='enclosure'));
  expect(next.buildings.find(b=>b.kind==='nest')!.breeding!.birth).toEqual(before.buildings.find(b=>b.kind==='nest')!.breeding!.birth);
  expect(babyOf(next.buildings.find(b=>b.kind==='nursery')!)).toBeNull();expect(next.initiation!.used).toEqual(['breeding']);
  expect(act(next,aid(before,'building-4','breeding'),0).ok).toBe(false);
 });
 it('persists use on reload and import; growth is tied to this birth',()=>{
  let s=breed();s=run(s,aid(s,'building-4','breeding'));s=run(s,{type:'transferBirth',id:'building-4',birthId:s.initiation!.birthId!});
  const reload=decodeGame(encodeGame(s));expect(reload.ok).toBe(true);if(!reload.ok)return;
  expect(reload.state.initiation).toEqual(s.initiation);
  let raw=encodeGame(s);const controller=new GameController({getItem:k=>k===SAVE_KEY?raw:null,setItem:(k,v)=>{if(k===SAVE_KEY)raw=v;}},()=>0);
  const imported=controller.prepareImport(raw);if(!imported.ok)throw Error(imported.reason);expect(controller.confirmImport(imported.token,true).ok).toBe(true);
  expect(controller.getSnapshot().state!.initiation).toEqual(s.initiation);
  s=run(reload.state,aid(s,'building-5','growth'));
  expect(s.initiation!.used).toEqual(['breeding','growth']);expect(s.rabbits).toHaveLength(2);
  s=run(s, welcomeOf(s, 'building-1'));s=run(s,{type:'breed',parents:['rabbit-2','rabbit-3']});
  expect(act(s,aid(s,'building-4','breeding'),0).ok).toBe(false);
 });
 it('natural waiting closes rights without using or shifting them',()=>{
  let s=breed();const key=s.initiation!.breeding!;s=advance(s,20*60_000);
  expect(s.initiation!.closed).toContain('breeding');expect(s.initiation!.used).toEqual([]);
  expect(act(s,{type:'initiationAid',id:'building-4',stage:'breeding',jobKey:key},s.lastSimulatedAt).ok).toBe(false);
  s=run(s,{type:'transferBirth',id:'building-4',birthId:s.initiation!.birthId!});s=advance(s,50*60_000);
  expect(s.initiation!.closed).toContain('growth');expect(s.initiation!.used).toEqual([]);
 });
 it('missing or replaced target refuses without consuming a right',()=>{
  const s=breed(), command=aid(s,'building-4','breeding');s.buildings.find(b=>b.kind==='nest')!.breeding!.birth.id='birth-99';
  const r=act(s,command,0);expect(r.ok).toBe(false);expect(r.state).toEqual(s);expect(s.initiation!.used).toEqual([]);
 });
 it('old v8 states have no rights, even if guidance is reopened',()=>{
  const s=breed();delete s.initiation;const decoded=decodeGame(encodeGame(s));expect(decoded.ok).toBe(true);
  const q=quoteAcceleration(s,'building-4','breeding',0);if(!q.ok)throw Error(q.reason);
  expect(act(s,{type:'initiationAid',id:'building-4',stage:'breeding',jobKey:q.jobKey},0).ok).toBe(false);
 });
 it('free authorization is atomic when storage fails',()=>{
  const s=breed();let raw=encodeGame(s),fail=false;
  const controller=new GameController({getItem:k=>k===SAVE_KEY?raw:null,setItem:(k,v)=>{if(fail)throw Error('denied');if(k===SAVE_KEY)raw=v;}},()=>0);
  fail=true;expect(controller.perform(aid(s,'building-4','breeding')).ok).toBe(false);
  expect(controller.getSnapshot().state!.initiation!.used).toEqual([]);expect(controller.getSnapshot().state!.buildings.find(b=>b.kind==='nest')!.breeding!.endsAt).toBe(20*60_000);
  fail=false;expect(controller.perform(aid(s,'building-4','breeding')).ok).toBe(true);
 });
 it('small production is one exact target and requires manual harvest',()=>{
  let s=ready();s=run(s,{type:'buyBuilding',kind:'farm',x:22,y:20});const id=s.buildings.at(-1)!.id;
  s=run(s,{type:'startOrder',id,recipe: 'foin'});const grass=s.grass,key=s.initiation!.order!;s=run(s,aid(s,id,'order'));
  expect(s.grass).toBe(grass);s=run(s,{type:'collectOrder',id});expect(s.grass).toBe(grass+20);
  s=run(s,{type:'startOrder',id,recipe: 'foin'});expect(act(s,{type:'initiationAid',id,stage:'order',jobKey:key},0).ok).toBe(false);
 });
 it('paid acceleration retains its price and closes associated free right',()=>{
  let s=breed();const q=quoteAcceleration(s,'building-4','breeding',0);if(!q.ok)throw Error(q.reason);
  s=run(s,{type:'accelerate',id:'building-4',stage:'breeding',jobKey:q.jobKey,maxHearts:q.hearts});
  expect(s.hearts).toBe(12-q.hearts);expect(s.initiation!.closed).toContain('breeding');expect(s.initiation!.used).toEqual([]);
 });
});
it('occupied nursery keeps the freely finished result and requires a successful manual transfer',()=>{
 let s=breed();const nursery=s.buildings.find(b=>b.kind==='nursery')!;
 setBaby(nursery, {startedAt:0,readyAt:300000,birth:{id:'birth-7',species:'paille',guaranteed:false,reservedDiscovery:false}});s.nextId=8;
 s=run(s,aid(s,'building-4','breeding'));const command:Command={type:'transferBirth',id:'building-4',birthId:s.initiation!.birthId!};
 expect(act(s,command,0)).toMatchObject({ok:false,reason:'BUSY'});expect(s.initiation!.growth).toBeNull();
 s=advance(s,300000);s=run(s, welcomeOf(s, 'building-1'));
 expect(s.buildings.find(b=>b.kind==='nest')!.breeding).not.toBeNull();
 s=run(s,command);expect(s.buildings.find(b=>b.kind==='nest')!.breeding).toBeNull();expect(s.initiation!.growth).not.toBeNull();expect(s.initiation!.closed).not.toContain('growth');
});
