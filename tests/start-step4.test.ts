// @vitest-environment happy-dom
import {describe,it,expect} from 'vitest';
import {act,advance,createGame,decodeGame,encodeGame} from '../src/simulation';
import {SOLO_INITIAL_MISSION_IDS} from '../src/config/missions';
import {activeMainMissions} from '../src/simulation/missions';
import {guidedStep} from '../src/ui/guidance';
import {PreferenceStore} from '../src/ui/preferences';
import {buildingPlacementReason} from '../src/simulation/placement';
import {previousStart} from './regression-start';
import type {Command,TimedStage} from '../src/state/types';
import {babyOf, welcomeOf} from './nursery-baby';
describe('Paille-only course: real commands and existing economy',()=>{
 it.each([true,false])('aided=%s, Frisket and Icy, explicit claims and resumes',aided=>{
  for(const roll of [.1,.65]){
   let s=createGame(0),now=0;const p=new PreferenceStore('step4-'+aided+roll);p.set({intro:true,guideCamera:true});
   const run=(c:Command)=>{const r=act(s,c,now,()=>roll);expect(r.ok,c.type).toBe(true);if(!r.ok)throw Error(r.reason);s=r.state;};
   const resume=()=>{const d=decodeGame(encodeGame(s));expect(d.ok).toBe(true);if(!d.ok)throw Error(d.reason);s=advance(d.state,now);};
   const claim=(id:typeof SOLO_INITIAL_MISSION_IDS[number])=>{run({type:'claimMainMission',id});expect(activeMainMissions(s)).not.toContain(id);const before=encodeGame(s);expect(act(s,{type:'claimMainMission',id},now).ok).toBe(false);expect(encodeGame(s)).toBe(before);};
   const finish=(id:string,stage:TimedStage)=>{if(aided)run({type:'initiationAid',id,stage,jobKey:s.initiation![stage]!,...(stage==='growth'?{birthId:s.initiation!.birthId!}:{})});else{const b=s.buildings.find(b=>b.id===id)!;now=stage==='order'?b.order!.endsAt:stage==='breeding'?b.breeding!.endsAt:babyOf(b)!.readyAt;resume();}};
   expect([s.pattes,s.grass,s.hearts]).toEqual([300,10,12]);expect(s.rabbits).toEqual([{id:'rabbit-2',species:'paille',affection:1,enclosureId:'building-1'}]);expect(s.discovered).toEqual(['paille']);expect(s.buildings[0].habitat).toEqual({type:'paille',level:1});expect(s.acquiredParcels).toEqual(['southwest']);
   expect(buildingPlacementReason(s,2,40)).toBeNull();expect(buildingPlacementReason(s,6,36)).toBeNull();
   expect(guidedStep(s,p.value,now).id).toBe('snowShop');
   run({type:'buyBuilding',kind:'enclosure',habitatType:'neige',x:2,y:40});const snow=s.buildings.at(-1)!.id;claim('snow-habitat');resume();expect(s.pattes).toBe(100);
   expect(guidedStep(s,p.value,now).id).toBe('rabbitShop');run({type:'buyRabbit',species:'neige',enclosureId:snow});const neige=s.rabbits.at(-1)!.id;expect(s.pattes).toBe(20);expect(s.missions.events.welcome).toBe(0);
   expect(guidedStep(s,p.value,now).id).toBe('snowReward');claim('welcome-snow');expect(s.pattes).toBe(80);resume();
   run({type:'feed',id:'rabbit-2'});claim('first-meal');run({type:'feed',id:neige});claim('parents-ready');expect(guidedStep(s,p.value,now).id).toBe('breed');expect(p.value.guideRecipe).toBe(false);run({type:'breed',parents:['rabbit-2',neige]});claim('at-nest');resume();
   expect(s.rabbits.map(r=>r.enclosureId)).toEqual(['building-1',snow]);expect(guidedStep(s,p.value,now).id).toBe('farmShop');
   run({type:'buyBuilding',kind:'farm',x:6,y:36});const farm=s.buildings.at(-1)!.id;claim('first-farm');run({type:'startOrder',id:farm,recipe:'small'});expect(s.pattes).toBe(30);p.set({guideCollection:true});resume();finish(farm,'order');run({type:'collectOrder',id:farm});claim('first-harvest');
   finish('building-4','breeding');expect(babyOf(s.buildings.find(b=>b.kind==='nursery')!)).toBeNull();expect(guidedStep(s,p.value,now).id).toBe('transfer');run({type:'transferBirth',id:'building-4',birthId:s.initiation!.birthId!});claim('to-nursery');expect(s.buildings.find(b=>b.kind==='nest')!.breeding).toBeNull();expect(s.rabbits.map(r=>r.enclosureId)).toEqual(['building-1',snow]);resume();finish('building-5','growth');
   // Both Rares can enter either specialized home.
   run(welcomeOf(s, roll===.65?snow:'building-1'));claim('first-birth');resume();expect(guidedStep(s,p.value,now).done).toBe(true);
   expect(s.rabbits.at(-1)!.species).toBe(roll===.1?'frisket':'icy');expect([s.pattes,s.grass,s.hearts]).toEqual([140,76,14]);expect(s.missions.claimed).toEqual([...SOLO_INITIAL_MISSION_IDS]);expect(s.initiation!.used).toEqual(aided?['order','breeding','growth']:[]);expect(s.missions.completed).toContain('two-habitats');expect(s.missions.claimed).not.toContain('two-habitats');
  }
 });
 it('old games retain homes, rabbits, claims and rights without retroactive welcome reward',()=>{
  const old=previousStart(0);old.missions.claimed=['first-meal'];old.missions.completed.push('first-meal');old.initiation!.closed=['order'];old.initiation!.used=['order'];
  const d=decodeGame(encodeGame(old));expect(d.ok).toBe(true);if(!d.ok)return;expect(d.state.startCourse).toBeUndefined();expect(d.state.buildings).toEqual(old.buildings);expect(d.state.rabbits).toEqual(old.rabbits);expect(d.state.initiation).toEqual(old.initiation);expect(activeMainMissions(d.state)).toEqual(['first-farm']);
  d.state.missions.completed.push('welcome-snow');expect(act(d.state,{type:'claimMainMission',id:'welcome-snow'},0)).toMatchObject({ok:false,reason:'NOT_READY'});
 });
 it('minimum budget needs neither income nor other rewards',()=>{
  let s=createGame(0);const run=(c:Command)=>{const r=act(s,c,0);if(!r.ok)throw Error(r.reason);s=r.state;};run({type:'buyBuilding',kind:'enclosure',habitatType:'neige',x:2,y:40});run({type:'buyRabbit',species:'neige',enclosureId:s.buildings.at(-1)!.id});run({type:'claimMainMission',id:'welcome-snow'});expect(s.pattes).toBe(80);run({type:'buyBuilding',kind:'farm',x:6,y:36});run({type:'startOrder',id:s.buildings.at(-1)!.id,recipe:'small'});expect([s.pattes,s.hearts]).toEqual([10,13]);
 });
});
