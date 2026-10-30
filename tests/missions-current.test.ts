// HISTORICAL: previousStart reproduces the retired centre-start layout; current economy rules apply.
import {previousStart as createGame} from './regression-start';
import {welcomeOf} from './nursery-baby';
import {describe,it,expect} from 'vitest';
import {act,advance,encodeGame,decodeGame} from '../src/simulation';
import {activeMainMissions,emptyMainEvents} from '../src/simulation/missions';
import {DAILY_MISSIONS,INITIAL_MISSION_IDS,MAIN_MISSIONS} from '../src/config/missions';
import {MINUTE,HOUR,SPECIES} from '../src/config/balance';
import {habitatPrice} from '../src/config/habitats';
import {buildingPlacementReason} from '../src/simulation/placement';
import {progressionFromXp} from '../src/simulation/progression';
import {dailyCycleStart,dailyMissionsOf} from '../src/simulation/missions';
import type {Command,GameState} from '../src/state/types';
const run=(s:GameState,c:Command,at=s.lastSimulatedAt,roll=.9)=>{const r=act(s,c,at,()=>roll);if(!r.ok)throw Error(`${c.type}: ${r.reason}`);return r.state;};
const reload=(s:GameState)=>{const r=decodeGame(encodeGame(s));if(!r.ok)throw Error(r.reason);return r.state;};
function earlyJourney(roll:number){
 let s=createGame(0);s=run(s,{type:'feed',id:'rabbit-2'});s=run(s,{type:'feed',id:'rabbit-3'});
 s=run(s,{type:'buyBuilding',kind:'farm',x:22,y:20});const farm=s.buildings.at(-1)!;
 s=run(s,{type:'startOrder',id:farm.id,recipe: 'foin'});s=reload(s);s=run(s,{type:'collectOrder',id:farm.id},5*MINUTE);
 s=run(s,{type:'breed',parents:['rabbit-2','rabbit-3']},5*MINUTE,roll);s=reload(s);
 const birth=s.buildings.find(b=>b.kind==='nest')!.breeding!.birth;
 s=run(s,{type:'transferBirth',id:'building-4',birthId:birth.id},25*MINUTE);s=reload(s);
 s=run(s, welcomeOf(s, 'building-1'),55*MINUTE);return reload(s);
}
describe('current mission journey',()=>{
 it('funds the Fire habitat and rabbit from the final reward alone in both courses',()=>{
  expect(INITIAL_MISSION_IDS.at(-1)).toBe('first-birth');
  expect(MAIN_MISSIONS['first-birth'].reward.resource).toBe('pattes');
  expect(MAIN_MISSIONS['first-birth'].reward.amount).toBeGreaterThanOrEqual(habitatPrice('feu')+SPECIES.feu.price!);
 });
 it.each([.1,.65])('banks every early successful action and unlocks independent branches after claims (roll %s, tests only)',roll=>{
  let s=earlyJourney(roll);expect([s.pattes,s.grass,s.hearts]).toEqual([280,26,14]);expect(s.missions.events).toEqual({collectOrder:20,breed:1,transferBirth:1,welcome:1,placeDecoration:0});
  for(const id of INITIAL_MISSION_IDS){expect(activeMainMissions(s)).toEqual([id]);expect(s.missions.completed).toContain(id);s=run(s,{type:'claimMainMission',id});s=reload(s);expect(act(s,{type:'claimMainMission',id},s.lastSimulatedAt)).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});}
  expect([s.pattes,s.grass,s.hearts]).toEqual([990,76,15]);expect(activeMainMissions(s)).toEqual(['varied-family','level-five','growing-collection']);
  // Terre and Brumelin were removed with their missions: no objective names them.
  for(const id of ['discover-brumelin','discover-terre'])expect(Object.hasOwn(MAIN_MISSIONS,id),id).toBe(false);
  s=run(s,{type:'claimMainMission',id:'varied-family'});
  expect(progressionFromXp(s.progression.totalXp).level).toBe(4);
  // Existing normal games can reach level 5 through daily income claims, without buying or discovering Feu.
  for(let day=1;day<=3;day++){
   s=run(s,{type:'collectIncome',id:'building-1'},day*24*HOUR);
   // Whichever of the three shown missions comes first, one claim a day is what grants the XP checked here; its progress is
   // set by hand, as the food top-up is: this journey checks the XP of the claims, not each mission's economy.
   const id=dailyMissionsOf(s)[0];
   s.missions.daily.progress[id]=DAILY_MISSIONS[id].target;
   s=run(s,{type:'claimDailyMission',id,cycleStart:dailyCycleStart(s)});
  }
  expect(progressionFromXp(s.progression.totalXp).level).toBe(5);
  const spot=Array.from({length:48*48},(_,i)=>({x:i%48,y:Math.floor(i/48)})).find(p=>!buildingPlacementReason(s,p.x,p.y))!;
  const before=s.pattes;
  s=run(s,{type:'buyBuilding',kind:'enclosure',habitatType:'feu',...spot});
  s=run(s,{type:'buyRabbit',species:'feu',enclosureId:s.buildings.at(-1)!.id});
  expect(s.pattes).toBe(before-habitatPrice('feu')-SPECIES.feu.price!);
  expect(s.discovered).toContain('feu');expect(s.acquiredParcels).toHaveLength(1);
 });
 it('pays the new reward on an unclaimed saved mission and never tops up an old claim',()=>{
  const unclaimed=earlyJourney(.1),before=unclaimed.pattes;
  let pending=reload(unclaimed);
  for(const id of INITIAL_MISSION_IDS)pending=run(pending,{type:'claimMainMission',id});
  expect(pending.pattes).toBe(before+80+MAIN_MISSIONS['first-birth'].reward.amount);
  // Reproduce a save paid at the former 50-patte rate, without changing its saved mission history.
  pending.pattes-=MAIN_MISSIONS['first-birth'].reward.amount-50;
  const old=reload(pending),saved=encodeGame(old);
  expect(old.pattes).toBe(410);
  expect(act(old,{type:'claimMainMission',id:'first-birth'},old.lastSimulatedAt)).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});
  expect(encodeGame(advance(old,old.lastSimulatedAt))).toBe(saved);
 });
 it('does not count purchased rabbits, inventories, time, refused harvests or early transfers as events',()=>{
  let s=createGame(0);s.pattes=1000;s=run(s,{type:'buyRabbit',species:'belier-gris',enclosureId:'building-1'});s=run(s,{type:'buyDecoration',catalogId:'bush'});
  expect(s.missions.events).toEqual(emptyMainEvents());expect(s.missions.completed).toContain('varied-family');expect(s.missions.completed).not.toContain('first-birth');
  expect(act(s,{type:'collectOrder',id:'building-4'},0).ok).toBe(false);expect(advance(s,HOUR).missions.events).toEqual(emptyMainEvents());
  s=run(s,{type:'placeDecoration',id:s.decorations[0].id,location:{kind:'outside',x:18,y:28,rotation:0}});expect(s.missions.events.placeDecoration).toBe(1);
  s=run(s,{type:'placeDecoration',id:s.decorations[0].id,location:{kind:'inventory'}});expect(s.missions.completed).toContain('first-decoration');
 });
 it('retired unclaimed nest/nursery/rare objectives never pay',()=>{const s=createGame(0);for(const id of ['cozy-nest','welcome-babies','first-rare'] as const){s.missions.completed.push(id);expect(act(s,{type:'claimMainMission',id},0)).toMatchObject({ok:false,reason:'NOT_READY'});}});
});
