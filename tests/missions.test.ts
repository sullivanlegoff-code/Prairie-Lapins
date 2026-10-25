import {eligibleMainMissionIds} from '../src/simulation/missions';
import {regressionStart as createGame} from './regression-start';
import {describe, expect, it} from 'vitest';
import {act, advance,  decodeGame, encodeGame} from '../src/simulation';
import {HOUR, MINUTE} from '../src/config/balance';
import {MAIN_MISSIONS, MAIN_MISSION_IDS, DAILY_MISSION_IDS, MISSION_CYCLE_DURATION as DAY} from '../src/config/missions';
import {dailyCycleEnd, emptyDailyProgress, emptyMainEvents, mainProgress} from '../src/simulation/missions';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import type {Command, GameState} from '../src/state/types';

const run = (s: GameState, c: Command, now = s.lastSimulatedAt) => {
  const result = act(s, c, now, () => .9); if (!result.ok) throw Error(result.reason); return result.state;
};
function prepared() {
  let s = createGame(0); s.pattes = 5000; s.grass = 1000;
  for (const [kind, x, y] of [['farm',22,20], ['nest',26,20], ['nursery',18,24]] as const) s = run(s,kind==='nest'||kind==='nursery'?{type:'placeStarterBuilding',kind,x,y}:{type:'buyBuilding',kind,x,y});
  return s;
}
function read(raw: string, _now: number) {
  const result = decodeGame(raw); if (!result.ok) throw Error(result.reason); return result.state;
}
function memory(raw?: string) {
  const data = new Map<string,string>(raw === undefined ? [] : [[SAVE_KEY,raw]]), flags = {fail:''};
  const storage: SaveStorage = {getItem: key => data.get(key) ?? null, setItem: (key,value) => {if (key === flags.fail) throw Error('quota');data.set(key,value);}};
  return {data,flags,storage};
}
function dailyReady() {
  let s=prepared(); s=run(s,{type:'startOrder',id:'building-4',recipe:'medium'});
  s=run(s,{type:'collectIncome',id:'building-1'},5*HOUR);
  s=run(s,{type:'collectOrder',id:'building-4'});
  for(let i=0;i<3;i++)s=run(s,{type:'feed',id:'rabbit-2'});
  return s;
}
const state=(c:GameController)=>c.getSnapshot().state!;

describe('main missions and unique rewards',()=>{
  it('starts eight unclaimed visible objectives and a fresh 24-hour cycle without changing initial resources',()=>{
    const s=createGame(123);
    expect(MAIN_MISSION_IDS).toHaveLength(19);expect(s).toMatchObject({version: 16,pattes:300,grass:10,hearts:12});
    expect(s.missions).toEqual({events:emptyMainEvents(),completed:[],claimed:[],daily:{referenceAt:123,cycleIndex:0,progress:emptyDailyProgress(),claimed:[],bonusClaimed:false}});
    expect(dailyCycleEnd(s)).toBe(123+DAY);
  });
  it('recognizes affection and rare discovery from current state, never from a pending birth',()=>{
    let s=prepared();s.rabbits[0].affection=5;s.discovered.push('lunettes');
    s=read(encodeGame(s),HOUR);
    expect(s.missions.completed).toContain('strong-bonds');expect(mainProgress(s,'first-rare').value).toBe(1); // 'first-rare' is a retired objective: its condition is still read from the discoveries.
    // A rare result still waiting in the nest is not a discovery.
    let waiting=prepared();waiting.rabbits.forEach(r=>r.affection=2);waiting=run(waiting,{type:'breed',parents:['rabbit-2','rabbit-3']});
    const birth=waiting.buildings.find(b=>b.breeding)!.breeding!.birth;birth.species='lunettes';birth.reservedDiscovery=true;
    const loaded=read(encodeGame(waiting),HOUR);
    expect(mainProgress(loaded,'first-rare').value).toBe(0);expect(loaded.discovered).toEqual(waiting.discovered);
  });
  it('keeps an acquired affection condition after its only high-level rabbit is released',()=>{
    let s=createGame(0);s.grass=100;
    s=run(s,{type:'buyRabbit',species:'paille',enclosureId:'building-1'});
    for(let i=0;i<4;i++)s=run(s,{type:'feed',id:'rabbit-2'});
    s=run(s,{type:'release',id:'rabbit-2'});
    expect(s.rabbits.every(r=>r.affection<5)).toBe(true);expect(s.missions.completed).toContain('strong-bonds');
    const restored=read(encodeGame(s),DAY);expect(run(restored,{type:'claimMainMission',id:'strong-bonds'}).hearts).toBe(14);
  });
  it.each(eligibleMainMissionIds(createGame(0)))('claims %s once, credits its exact reward, and never counts the reward as daily work',id=>{
    const before=prepared(); before.missions.completed=[id];
    const s=run(before,{type:'claimMainMission',id}), reward=MAIN_MISSIONS[id].reward;
    if(reward.resource==='none')expect([s.pattes,s.grass,s.hearts]).toEqual([before.pattes,before.grass,before.hearts]);else expect(s[reward.resource]).toBe(before[reward.resource]+reward.amount);expect(s.missions.claimed).toEqual([id]);
    expect(s.missions.daily).toEqual(before.missions.daily);
    const result=act(s,{type:'claimMainMission',id},s.lastSimulatedAt);
    expect(result).toEqual({ok:false,state:s,reason:'ALREADY_CLAIMED'});
    expect(read(encodeGame(s),0)).toEqual(s);
  });
  it('refuses unmet, invalid and overflowing rewards without any partial claim or resource change',()=>{
    const s=createGame(0);
    expect(act(s,{type:'claimMainMission',id:'first-farm'},0)).toEqual({ok:false,state:s,reason:'NOT_READY'});
    expect(act(s,{type:'claimMainMission',id:'invented'} as unknown as Command,0)).toMatchObject({ok:false,state:s,reason:'INVALID_CHOICE'});
    s.missions.completed=['first-harvest'];s.pattes=Number.MAX_SAFE_INTEGER;
    expect(act(s,{type:'claimMainMission',id:'first-harvest'},0)).toEqual({ok:false,state:s,reason:'RESOURCE_LIMIT'});
  });
  it('acquires a building mission when bought with hearts but counts no daily action',()=>{
    const s=createGame(0);s.pattes=0;
    const bought=run(s,{type:'payWithHearts',action:{type:'buyBuilding',kind:'farm',x: 22, y: 20},maxHearts:3,maxPattes:0});
    expect(bought.missions.completed).toEqual(['first-farm']);expect(bought.missions.daily.progress).toEqual(emptyDailyProgress());
  });
});

describe('daily event accounting and fixed cycles',()=>{
  it('counts actual collected integer pattes, collected grass and gained levels exactly, once',()=>{
    const ready=dailyReady();expect(ready.missions.daily.progress).toEqual({'collect-pattes':120,'collect-grass':40,'gain-affection':3});
    const again=run(ready,{type:'collectIncome',id:'building-1'});
    expect(again.missions.daily.progress).toEqual(ready.missions.daily.progress);
    expect(act(again,{type:'collectOrder',id:'building-4'},again.lastSimulatedAt)).toMatchObject({ok:false,state:again});
  });
  it('does not count stored income, ready production, initial resources, quotes or refused actions',()=>{
    let s=prepared();s=run(s,{type:'startOrder',id:'building-4',recipe:'medium'});s=advance(s,5*HOUR);
    expect(s.buildings[0].incomeUnits).toBe(120*HOUR);expect(s.missions.daily.progress).toEqual(emptyDailyProgress());
    s.grass=0; expect(act(s,{type:'feed',id:'rabbit-2'},s.lastSimulatedAt)).toMatchObject({ok:false,state:s});
    expect(act(s,{type:'buyBuilding',kind:'farm',x: 18, y: 20},s.lastSimulatedAt)).toMatchObject({ok:false,state:s});
  });
  it('counts a production started and ready before renewal only when harvested in the new cycle',()=>{
    let s=prepared();s=run(s,{type:'startOrder',id:'building-4',recipe:'small'},DAY-20*MINUTE);
    s=advance(s,DAY);expect(s.missions.daily.progress).toEqual(emptyDailyProgress());
    s=run(s,{type:'collectOrder',id:'building-4'},DAY+1);
    expect(s.missions.daily.cycleIndex).toBe(1);expect(s.missions.daily.progress['collect-grass']).toBe(20);
  });
  it('assigns actions to the new cycle at the exact 24-hour boundary, not midnight',()=>{
    let s=createGame(12345);s.grass=100;
    s=run(s,{type:'feed',id:'rabbit-2'},12345+DAY-1);expect(s.missions.daily.progress['gain-affection']).toBe(1);
    s=run(s,{type:'feed',id:'rabbit-2'},12345+DAY);expect(s.missions.daily.progress['gain-affection']).toBe(1);
    expect(s.missions.daily).toMatchObject({referenceAt:12345,cycleIndex:1});expect(dailyCycleEnd(s)).toBe(12345+2*DAY);
  });
  it('expires unclaimed rewards and the unclaimed bonus and rejects a stale-cycle claim',()=>{
    let s=dailyReady();const claim:Command={type:'claimDailyMission',id:'collect-grass',cycleStart:0};
    const before=structuredClone(s);
    expect(act(s,claim,DAY)).toEqual({ok:false,state:before,reason:'CYCLE_EXPIRED'});
    for(const id of DAILY_MISSION_IDS)s=run(s,{type:'claimDailyMission',id,cycleStart:0});
    expect(s.missions.daily.bonusClaimed).toBe(false);const next=advance(s,DAY);
    expect(next.missions.daily).toMatchObject({cycleIndex:1,progress:emptyDailyProgress(),claimed:[],bonusClaimed:false});
    expect(next.hearts).toBe(13);expect(act(next,{type:'claimDailyBonus',cycleStart:0},DAY)).toMatchObject({ok:false,reason:'CYCLE_EXPIRED'});
  });
  it('skips absent cycles without reward stacking and matches repeated shorter resumes',()=>{
    const s=dailyReady();const long=advance(s,9*DAY+HOUR);
    let short=s;for(let n=1;n<=9;n++)short=advance(short,n*DAY);short=advance(short,9*DAY+HOUR);
    expect(short).toEqual(long);expect(long.missions.daily).toMatchObject({referenceAt:0,cycleIndex:9,progress:emptyDailyProgress()});
    expect(long.hearts).toBe(s.hearts);expect(long.pattes).toBe(s.pattes);expect(dailyCycleEnd(long)).toBe(10*DAY);
  });
  it('never reopens an old cycle when the clock moves backwards',()=>{
    const s=run(advance(prepared(),DAY),{type:'feed',id:'rabbit-2'},DAY);
    expect(advance(s,0).missions.daily).toEqual({...s.missions.daily,referenceAt:-DAY});expect(run(s,{type:'feed',id:'rabbit-3'},0).missions.daily).toMatchObject({cycleIndex:1,progress:{'gain-affection':2}});
    expect(act(s,{type:'claimDailyBonus',cycleStart:DAY},0)).toMatchObject({ok:false,reason:'CYCLE_EXPIRED'});
  });
  it('requires all three rewards claimed before a single bonus, without counting any rewards',()=>{
    let s=dailyReady();const progress=structuredClone(s.missions.daily.progress);
    expect(act(s,{type:'claimDailyBonus',cycleStart:0},s.lastSimulatedAt)).toMatchObject({ok:false,reason:'NOT_READY'});
    for(const id of DAILY_MISSION_IDS){s=run(s,{type:'claimDailyMission',id,cycleStart:0});expect(act(s,{type:'claimDailyMission',id,cycleStart:0},s.lastSimulatedAt)).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});}
    expect(s.missions.daily.progress).toEqual(progress);expect(s.hearts).toBe(13);
    s=run(s,{type:'claimDailyBonus',cycleStart:0});expect(s.hearts).toBe(15);expect(s.nextHeartGiftAt).toBe(DAY);
    expect(act(s,{type:'claimDailyBonus',cycleStart:0},s.lastSimulatedAt)).toMatchObject({ok:false,state:s,reason:'ALREADY_CLAIMED'});
    expect(run(s,{type:'claimHearts'},DAY).hearts).toBe(17);
  });
});

describe('mission persistence and controller',()=>{
  it('saves a claim and its reward together; write failure adopts neither reward nor claim, and retry grants once',()=>{
    const m=memory(encodeGame(prepared())),c=new GameController(m.storage,()=>0);const raw=m.data.get(SAVE_KEY),before=state(c);
    m.flags.fail=SAVE_KEY;expect(c.perform({type:'claimMainMission',id:'first-farm'})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});
    expect(state(c)).toEqual(before);expect(m.data.get(SAVE_KEY)).toBe(raw);
    expect(c.exportGame().ok).toBe(true);expect(c.perform({type:'claimMainMission',id:'first-farm'})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});
    m.flags.fail='';expect(c.perform({type:'claimMainMission',id:'first-farm'}).ok).toBe(true);expect(state(c).grass).toBe(before.grass+20);expect(c.perform({type:'claimMainMission',id:'first-farm'})).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});const loaded=new GameController(m.storage,()=>0);expect(state(loaded)).toEqual(state(c));
  });
  it('retains controller time rollover after a refused action',()=>{
    const m=memory(encodeGame(dailyReady()));let now=5*HOUR;const c=new GameController(m.storage,()=>now);
    now=DAY;expect(c.perform({type:'claimDailyMission',id:'collect-pattes',cycleStart:0})).toMatchObject({ok:false,reason:'CYCLE_EXPIRED'});
    expect(state(c).missions.daily.cycleIndex).toBe(1);expect(read(m.data.get(SAVE_KEY)!,now)).toEqual(state(c));
  });
  it('replaces rather than merging imported rewards and resources, with cancellation and write failure protection',()=>{
    const original=run(dailyReady(),{type:'claimDailyMission',id:'collect-pattes',cycleStart:0});
    const m=memory(encodeGame(original)),c=new GameController(m.storage,()=>5*HOUR);
    const incoming=createGame(5*HOUR);incoming.pattes=9000;incoming.grass=9000;incoming.hearts=7;
    let p=c.prepareImport(encodeGame(incoming));if(!p.ok)throw Error(p.reason);c.confirmImport(p.token,false);expect(state(c)).toEqual(original);
    p=c.prepareImport(encodeGame(incoming));if(!p.ok)throw Error(p.reason);m.flags.fail=SAVE_KEY;
    expect(c.confirmImport(p.token,true)).toMatchObject({ok:false,reason:'WRITE_FAILED'});expect(state(c)).toEqual(original);
    m.flags.fail='';expect(c.confirmImport(p.token,true).ok).toBe(true);expect(state(c)).toEqual(incoming);expect(state(c).missions.daily.progress).toEqual(emptyDailyProgress());
    const exported=c.exportGame();if(!exported.ok)throw Error(exported.reason);expect(read(exported.json,5*HOUR)).toEqual(incoming);
  });
  it.each(['unknown','duplicate','unearned','bonus','cycle','future'] as const)('rejects inconsistent mission state: %s',kind=>{
    const s=createGame(0), raw=JSON.parse(encodeGame(s));
    if(kind==='unknown')raw.missions.completed=['invented'];
    if(kind==='duplicate')raw.missions.completed=['first-farm','first-farm'];
    if(kind==='unearned')raw.missions.daily.claimed=['collect-pattes'];
    if(kind==='bonus')raw.missions.daily.bonusClaimed=true;
    if(kind==='cycle')raw.missions.daily.cycleIndex=1;
    if(kind==='future'){raw.missions.daily.referenceAt=DAY;raw.missions.daily.progress['gain-affection']=1;}
    expect(decodeGame(JSON.stringify(raw))).toEqual({ok:false,reason:'INVALID_STATE'});
  });
});
