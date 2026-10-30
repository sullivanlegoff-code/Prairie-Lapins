// HISTORICAL: previousStart reproduces the retired centre-start layout; current economy rules apply.
import {previousStart as createGame} from './regression-start';
import {describe,it,expect} from 'vitest';
import {act,advance,encodeGame,decodeGame} from '../src/simulation';
import {HOUR,MINUTE} from '../src/config/balance';
import {INITIAL_MISSION_IDS,DAILY_MISSIONS,MAIN_MISSIONS} from '../src/config/missions';
import {dailyCycleStart,dailyMissionsOf} from '../src/simulation/missions';
import {quoteAcceleration} from '../src/simulation/hearts';
import type {Command,TimedStage} from '../src/state/types';
import {babyOf, welcomeOf} from './nursery-baby';
const reports:unknown[]=[];
function journey(aided:boolean,roll:number){
 let s=createGame(0),now=0;const budget:unknown[]=[];
 const run=(c:Command)=>{const r=act(s,c,now,()=>roll);expect(r.ok,c.type).toBe(true);if(!r.ok)throw Error(r.reason);s=r.state;};
 const resume=()=>{const d=decodeGame(encodeGame(s));expect(d.ok).toBe(true);if(d.ok)s=advance(d.state,now);};
 const checkpoint=(step:string)=>budget.push({step,minutes:now/MINUTE,pattes:s.pattes,grass:s.grass,hearts:s.hearts});
 const claim=(id:typeof INITIAL_MISSION_IDS[number])=>run({type:'claimMainMission',id});
 const finish=(id:string,stage:TimedStage)=>{if(aided){const target=stage==='growth'?{birthId:s.initiation!.birthId!}:{};const q=quoteAcceleration(s,id,stage,now,target.birthId);if(!q.ok)throw Error(q.reason);run({type:'initiationAid',id,stage,jobKey:q.jobKey,...target});}else{const b=s.buildings.find(b=>b.id===id)!;now=stage==='order'?b.order!.endsAt:stage==='breeding'?b.breeding!.endsAt:babyOf(b)!.readyAt;resume();}};
 checkpoint('Départ');run({type:'feed',id:'rabbit-2'});claim('first-meal');checkpoint('Paille et récompense');
 run({type:'buyBuilding',kind:'farm',x:22,y:20});claim('first-farm');checkpoint('Ferme et récompense');const farm=s.buildings.at(-1)!;
 run({type:'startOrder',id:farm.id,recipe: 'foin'});checkpoint('Production lancée');resume();finish(farm.id,'order');run({type:'collectOrder',id:farm.id});claim('first-harvest');checkpoint('Herbe récoltée et récompense');
 run({type:'feed',id:'rabbit-3'});claim('parents-ready');checkpoint('Neige et récompense');run({type:'breed',parents:['rabbit-2','rabbit-3']});claim('at-nest');checkpoint('Reproduction et récompense');resume();finish('building-4','breeding');
 expect(babyOf(s.buildings.find(b=>b.kind==='nursery')!)).toBeNull();run({type:'transferBirth',id:'building-4',birthId:s.initiation!.birthId!});claim('to-nursery');checkpoint('Transfert et récompense');resume();finish('building-5','growth');run(welcomeOf(s, 'building-1'));claim('first-birth');checkpoint('Accueil et récompense');
 expect([s.pattes,s.grass,s.hearts]).toEqual([990,76,15]);expect(s.missions.claimed).toEqual([...INITIAL_MISSION_IDS]);
 expect(s.rabbits.at(-1)!.species).toBe(roll===.1?'frisket':'icy');expect(s.initiation!.used).toEqual(aided?['order','breeding','growth']:[]);
 return {s,now,run,resume,farmId:farm.id,budget,setTime:(t:number)=>{now=t;s=advance(s,t);},current:()=>s};
}
describe('initial budget and explicit 24h visit schedules',()=>{
 it.each([true,false])('real beginning, explicit rewards and interrupts, aided=%s',aided=>{
  for(const roll of [.1,.65]){const j=journey(aided,roll);reports.push({kind:'tutorial',aided,species:j.s.rabbits.at(-1)!.species,budget:j.budget,simulationMinutes:j.now/MINUTE});}
 });
 it.each([true,false])('24h continuation without grants, aided=%s',aided=>{
  for(const roll of [.1,.65])for(const visits of [[2,4,8,12,18,24],[8,24]]){
   const j=journey(aided,roll);const run=j.run,current=j.current;const birth=j.s.rabbits.at(-1)!.id;
   function claimBranches(){for(const id of ['varied-family','two-habitats','strong-bonds'] as const)if(current().missions.completed.includes(id)&&!current().missions.claimed.includes(id))run({type:'claimMainMission',id});}
   function claimDaily(){for(const id of dailyMissionsOf(current())){const s=current();if(s.missions.daily.progress[id]>=DAILY_MISSIONS[id].target&&!s.missions.daily.claimed.includes(id))run({type:'claimDailyMission',id,cycleStart:dailyCycleStart(s)});}if(current().missions.daily.claimed.length===3&&!current().missions.daily.bonusClaimed)run({type:'claimDailyBonus',cycleStart:dailyCycleStart(current())});}
   for(let n=0;n<4;n++)run({type:'feed',id:birth});
   run({type:'buyBuilding',kind:'enclosure',habitatType:'paille',x:26,y:24});const home=current().buildings.at(-1)!.id;run({type:'buyRabbit',species:'paille',enclosureId:home});claimBranches();claimDaily();
   const starting={pattes:current().pattes,grass:current().grass,hearts:current().hearts};expect([starting.pattes,starting.grass]).toEqual([870,98]); // Final tutorial reward increased by 580 pattes; four meals cost 28 food (2+4+8+14). The three shown daily claims pay 110 pattes (feed 30, welcome 40, affection 40) and the cycle bonus 20 food.
   run({type:'startOrder',id:j.farmId,recipe: 'pissenlit'});const snapshots:unknown[]=[];
   // Rare natural growth ends at minute 55; the next 15-minute farm order is ready at the 2h visit.
   for(const hour of visits){j.setTime(hour*HOUR);j.resume();for(const b of current().buildings.filter(b=>b.kind==='enclosure'))run({type:'collectIncome',id:b.id});run({type:'collectOrder',id:j.farmId});claimDaily();if(hour===24)run({type:'claimHearts'});else run({type:'startOrder',id:j.farmId,recipe: 'pissenlit'});snapshots.push({hour,pattes:current().pattes,grass:current().grass,hearts:current().hearts});}
   const end=current();expect(end.pattes).toBeGreaterThan(500);expect(end.hearts).toBeGreaterThanOrEqual(17);
   reports.push({kind:'24h',aided,species:roll===.1?'frisket':'icy',visits,starting,end:{pattes:end.pattes,grass:end.grass,hearts:end.hearts},snapshots,optionalExpansionNetCost:500-MAIN_MISSIONS['bigger-meadow'].reward.amount});
  }
  if(!aided) console.log('ECONOMY_REPORT '+JSON.stringify(reports));
 });
});
