import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,advance,createGame,encodeGame,decodeGame} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import * as progression from '../src/simulation/progression';
import {PROGRESSION} from '../src/config/progression';
import {MAIN_MISSIONS,DAILY_MISSIONS,DAILY_BONUS,MISSION_CYCLE_DURATION} from '../src/config/missions';
import {dailyCycleStart} from '../src/simulation/missions';
import {SAVE_KEY} from '../src/persistence/storage';
import type {Command,GameState} from '../src/state/types';
function ready(){const s=createGame(0);s.rabbits[0].affection=2;s.missions.daily.progress={'collect-pattes':100,'collect-grass':40,'gain-affection':3};return advance(s,0);}
const main:Command={type:'claimMainMission',id:'first-meal'};
const daily:Command={type:'claimDailyMission',id:'collect-pattes',cycleStart:0};
function run(s:GameState,c:Command){const r=act(s,c,s.lastSimulatedAt);if(!r.ok)throw Error(r.reason);return r;}
afterEach(()=>vi.restoreAllMocks());
describe('mission claim XP, not completion XP',()=>{
 it('completion and loading alone grant nothing; main claim adds exact grass and XP',()=>{
  const s=ready();expect(s.missions.completed).toContain('first-meal');expect(s.progression.totalXp).toBe(0);const decoded=decodeGame(encodeGame(s));expect(decoded.ok&&decoded.state.progression.totalXp).toBe(0);
  const r=run(s,main);expect(r.state.grass).toBe(s.grass+MAIN_MISSIONS['first-meal'].reward.amount);expect(r.state.progression.totalXp).toBe(progression.missionClaimXp('main','first-meal'));expect(r.state.missions.claimed).toContain('first-meal');expect(act(r.state,main,0)).toMatchObject({ok:false,reason:'ALREADY_CLAIMED',state:r.state});
 });
 it('daily claim adds its currency and configured XP once, and cannot claim a different cycle',()=>{
  const s=ready(),r=run(s,daily);expect(r.state.pattes).toBe(s.pattes+DAILY_MISSIONS['collect-pattes'].reward.amount);expect(r.state.progression.totalXp).toBe(progression.missionClaimXp('daily','collect-pattes'));expect(act(r.state,daily,0)).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});
  const next=advance(r.state,MISSION_CYCLE_DURATION);next.missions.daily.progress['collect-pattes']=100;expect(act(next,daily,next.lastSimulatedAt)).toMatchObject({ok:false,reason:'CYCLE_EXPIRED'});const again=run(next,{type:'claimDailyMission',id:'collect-pattes',cycleStart:dailyCycleStart(next)});expect(again.state.progression.totalXp).toBe(2*progression.missionClaimXp('daily','collect-pattes'));
 });
 it.each([0,7])('respects configured main and daily identifier exceptions, including %i',xp=>{
  const original=progression.missionClaimXp,c={...PROGRESSION,xp:{...PROGRESSION.xp,claims:{...PROGRESSION.xp.claims,mainExceptions:{'first-meal':xp},dailyExceptions:{'collect-pattes':xp}}}};
  vi.spyOn(progression,'missionClaimXp').mockImplementation((kind,id)=>original(kind,id,c));
  for(const command of [main,daily]){const r=run(ready(),command);expect(r.state.progression.totalXp).toBe(xp);expect(r.progressionGain?.xpGained).toBe(xp);}
 });
 it('main without money still earns XP on claim',()=>{
  const s=ready();s.buildings[0].habitat!.type='neige';s.rabbits[0].species='neige';s.discovered=['neige'];const r=run(s,{type:'claimMainMission',id:'snow-habitat'});expect(r.state.pattes).toBe(s.pattes);expect(r.state.grass).toBe(s.grass);expect(r.state.progression.totalXp).toBe(progression.missionClaimXp('main','snow-habitat'));
 });
 it('bonus keeps its actual hearts and zero XP, even after the daily claims cross a level',()=>{
  let s=ready();s.progression.totalXp=89;for(const id of ['collect-pattes','collect-grass','gain-affection'] as const)s=run(s,{type:'claimDailyMission',id,cycleStart:0}).state;expect(s.hearts).toBe(13);
  const xp=s.progression.totalXp,r=run(s,{type:'claimDailyBonus',cycleStart:0});expect(r.state.progression.totalXp).toBe(xp);expect(r.state.hearts).toBe(s.hearts+DAILY_BONUS.amount);expect(r.state.missions.daily.bonusClaimed).toBe(true);expect(r.progressionGain?.xpGained).toBe(0);
 });
 it.each(['main','daily','bonus'] as const)('%s failed write preserves claimability and all rewards, then reload/import gives no second gain',kind=>{
  const s=ready();if(kind==='bonus')s.missions.daily.claimed=['collect-pattes','collect-grass','gain-affection'];const command:Command=kind==='main'?main:kind==='daily'?daily:{type:'claimDailyBonus',cycleStart:0};const data=new Map([[SAVE_KEY,encodeGame(s)]]),flags={fail:false},events:unknown[]=[];const c=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(flags.fail)throw Error('quota');data.set(k,v);}},()=>0);c.onProgressionGain(g=>events.push(g));const before=c.getSnapshot().state;flags.fail=true;expect(c.perform(command)).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(before);expect(events).toHaveLength(0);flags.fail=false;expect(c.perform(command).ok).toBe(true);expect(events).toHaveLength(kind==='bonus'?0:1);
  const exported=c.exportGame();if(!exported.ok)throw Error(exported.reason);const p=c.prepareImport(exported.json);if(!p.ok)throw Error(p.reason);c.confirmImport(p.token,true);expect(c.perform(command).ok).toBe(false);expect(events).toHaveLength(kind==='bonus'?0:1);c.dispose();
 });
 it.each([main,daily,{type:'claimDailyBonus',cycleStart:0}] as Command[])('overflow refuses the entire $type reward',command=>{
  const s=ready();s.missions.daily.claimed=command.type==='claimDailyBonus'?['collect-pattes','collect-grass','gain-affection']:[];
  if(command.type==='claimDailyBonus')s.hearts=Number.MAX_SAFE_INTEGER;else{s.progression.totalXp=Number.MAX_SAFE_INTEGER;}
  const before=structuredClone(s),r=act(s,command,0);expect(r.ok).toBe(false);expect(r.state).toEqual(before);expect(s).toEqual(before);
 });
 it('a level earned by a heart-paying main mission credits both rewards once',()=>{
  const s=ready();s.rabbits[0].affection=5;s.progression.totalXp=89;const r=run(s,{type:'claimMainMission',id:'strong-bonds'});expect(r.ok).toBe(true);expect(r.state.hearts).toBe(14);expect(r.state.progression.rewardedThroughLevel).toBe(2);
 });
});
