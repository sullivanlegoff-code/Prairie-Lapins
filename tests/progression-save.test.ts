import {afterEach, describe, expect, it, vi} from 'vitest';
import * as simulation from '../src/simulation';
import {advance, encodeGame, decodeGame} from '../src/simulation';
import {createCentreStartGame, createGame} from '../src/state/initial';
import {PROGRESSION} from '../src/config/progression';
import {cumulativeLevelXp, progressionFromXp} from '../src/simulation/progression';
import {applyProgressionGain} from '../src/simulation/progressionRewards';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {developmentEnvironment, TEST_PREFIX} from '../src/dev/tools';
import {HOUR} from '../src/config/balance';

const originalAct = simulation.act;
afterEach(() => vi.restoreAllMocks());
function memory(raw: string | null = null, scope: SaveStorage['scope'] = 'laboratory') {
  const data = new Map<string, string>(raw === null ? [] : [[SAVE_KEY, raw]]), flags = {fail: ''}, writes: string[] = [];
  const storage: SaveStorage = {scope, getItem: k => data.get(k) ?? null, setItem: (k,v) => {
    if (flags.fail === k) throw Error('quota'); data.set(k,v); writes.push(k);
  }};
  return {data, flags, writes, storage};
}
const read = (raw: string) => {const r = decodeGame(raw); if (!r.ok) throw Error(r.reason); return r.state;};

describe('v9 progression and level rewards', () => {
  it('starts at zero without altering resources or the current course', () => {
    const s = createCentreStartGame(0); expect(s.version).toBe(19);
    expect(s.progression).toEqual({totalXp: 0, rewardedThroughLevel: 1});
    expect(progressionFromXp(s.progression.totalXp).level).toBe(1);
    expect([s.pattes,s.grass,s.hearts]).toEqual([350,0,12]);
  });
  it('grants exact hearts for one and multiple levels; keeps derived values outside the save', () => {
    const s = createCentreStartGame(0);
    expect(applyProgressionGain(s,90)).toEqual({ok:true,gain:{xpGained:90,rewardedLevels:[2],heartsGranted:1}});
    expect(applyProgressionGain(s,600)).toEqual({ok:true,gain:{xpGained:600,rewardedLevels:[3,4],heartsGranted:2}});
    expect(s.hearts).toBe(15); expect(s.progression).toEqual({totalXp:690,rewardedThroughLevel:4});
    expect(JSON.parse(encodeGame(s)).progression).toEqual(s.progression);
  });
  it('retains surplus, rewards a raised maximum only on the next positive gain and never tops up older rewards', () => {
    const raised = {...PROGRESSION,curve:{...PROGRESSION.curve,maximumLevel:31}};
    const s=createCentreStartGame(0), total=cumulativeLevelXp(31,raised);
    expect(applyProgressionGain(s,total).ok).toBe(true);
    expect(s.hearts).toBe(41); expect(s.progression.rewardedThroughLevel).toBe(30);
    expect(progressionFromXp(total).maximum).toBe(true); expect(progressionFromXp(total,raised).level).toBe(31);
    const before=structuredClone(s);expect(applyProgressionGain(s,0,raised)).toEqual({ok:true,gain:{xpGained:0,rewardedLevels:[],heartsGranted:0}});expect(s).toEqual(before);
    expect(applyProgressionGain(s,1,raised)).toEqual({ok:true,gain:{xpGained:1,rewardedLevels:[31],heartsGranted:1}});
    const changedReward={...raised,rewards:{heartsPerLevel:3}};
    expect(applyProgressionGain(s,1,changedReward)).toEqual({ok:true,gain:{xpGained:1,rewardedLevels:[],heartsGranted:0}});expect(s.hearts).toBe(42);
  });
  it('marks a zero-heart level reward as processed',()=>{
    const s=createCentreStartGame(0);expect(applyProgressionGain(s,90,{...PROGRESSION,rewards:{heartsPerLevel:0}}).ok).toBe(true);
    expect(s.progression.rewardedThroughLevel).toBe(2);expect(applyProgressionGain(s,1).ok).toBe(true);expect(s.hearts).toBe(12);
  });
  it.each([-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('refuses invalid XP %s without mutation', amount=>{
    const s=createCentreStartGame(0),before=structuredClone(s);expect(applyProgressionGain(s,amount).ok).toBe(false);expect(s).toEqual(before);
  });
  it('refuses XP and heart overflows atomically; zero does not spend rights',()=>{
    const s=createCentreStartGame(0);s.progression.totalXp=Number.MAX_SAFE_INTEGER;
    let before=structuredClone(s);expect(applyProgressionGain(s,1)).toEqual({ok:false,reason:'RESOURCE_LIMIT'});expect(s).toEqual(before);
    s.progression.totalXp=0;s.hearts=Number.MAX_SAFE_INTEGER;before=structuredClone(s);
    expect(applyProgressionGain(s,90)).toEqual({ok:false,reason:'RESOURCE_LIMIT'});expect(s).toEqual(before);
    expect(applyProgressionGain(s,0).ok).toBe(true);expect(s).toEqual(before);
  });
  it('rejects malformed persisted progression and unknown derived fields',()=>{
    for(const progression of [undefined,{totalXp:-1,rewardedThroughLevel:1},{totalXp:0.2,rewardedThroughLevel:1},{totalXp:0,rewardedThroughLevel:0},{totalXp:0,rewardedThroughLevel:Infinity},{totalXp:0,rewardedThroughLevel:1,level:1}]){
      expect(decodeGame(JSON.stringify({...createCentreStartGame(0),progression}))).toEqual({ok:false,reason:'INVALID_STATE'});
    }
  });
  it('time advance adds no XP after a real meal',()=>{
    const s={...createCentreStartGame(0),grass:10},r=originalAct(s,{type:'feed',id:'rabbit-2'},0);expect(r.ok).toBe(true);
    if(!r.ok)throw Error(r.reason);expect(r.state.progression.totalXp).toBe(6);expect(r.state.hearts).toBe(12);
    expect(advance(r.state,HOUR).progression).toEqual(r.state.progression);
  });
});

describe('storage isolation of the laboratory XP',()=>{
  it('writes laboratory XP under the laboratory prefix only, leaving the normal save untouched',()=>{
    const raw=encodeGame(createCentreStartGame(0)),m=memory(raw,'normal');m.data.set(TEST_PREFIX+SAVE_KEY,raw);
    const dev=developmentEnvironment(m.storage),c=new GameController(dev.storage,()=>0);
    expect(c.grantLaboratoryXp(50).ok).toBe(true);expect(m.data.get(SAVE_KEY)).toBe(raw);expect(read(m.data.get(TEST_PREFIX+SAVE_KEY)!).progression.totalXp).toBe(50);c.dispose();
  });
});

describe('progression candidate persistence',()=>{
  it('refuses laboratory XP on a normal controller even when invoked directly',()=>{
    const m=memory(null,'normal'),c=new GameController(m.storage,()=>0),before=c.getSnapshot(),raw=m.data.get(SAVE_KEY);
    expect(c.grantLaboratoryXp(500)).toEqual({ok:false,reason:'NOT_TEST_SESSION'});expect(c.getSnapshot()).toEqual(before);expect(m.data.get(SAVE_KEY)).toBe(raw);c.dispose();
  });
  it('does not emit phantom gain on failure; retry grants once and preserves separately advanced time',()=>{
    const m=memory(),clock={now:0},c=new GameController(m.storage,()=>clock.now),raw=m.data.get(SAVE_KEY);m.flags.fail=SAVE_KEY;clock.now=HOUR;
    expect(c.grantLaboratoryXp(50)).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});
    expect(c.getSnapshot()).toMatchObject({status:'write-error',dirty:true,state:{progression:{totalXp:0,rewardedThroughLevel:1},hearts:12,lastSimulatedAt:HOUR}});
    expect(c.getSnapshot().state!.buildings[0].incomeUnits).toBe(10*HOUR);expect(m.data.get(SAVE_KEY)).toBe(raw);
    m.flags.fail='';expect(c.grantLaboratoryXp(50)).toMatchObject({ok:true,progressionGain:{xpGained:50,rewardedLevels:[],heartsGranted:0}});
    expect(read(m.data.get(SAVE_KEY)!)).toEqual(c.getSnapshot().state);c.dispose();
  });
  it('rolls back the whole normal action candidate if a future command changes progression',()=>{
    vi.spyOn(simulation,'act').mockImplementation((s,cmd,now,rng)=>{
      const r=originalAct(s,cmd,now,rng);if(r.ok){const g=applyProgressionGain(r.state,50);if(g.ok)r.progressionGain=g.gain;}return r;
    });
    const m=memory(encodeGame({...createGame(0),grass:10})),c=new GameController(m.storage,()=>0),before=c.getSnapshot().state;m.flags.fail=SAVE_KEY;
    expect(c.perform({type:'feed',id:'rabbit-2'})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(before);expect(c.getSnapshot().dirty).toBe(false);
    m.flags.fail='';expect(c.perform({type:'feed',id:'rabbit-2'})).toMatchObject({"ok":true,"progressionGain":{"heartsGranted":0}});
    expect(c.getSnapshot().state).toMatchObject({grass:8,hearts:12,progression:{totalXp:56,rewardedThroughLevel:1}});c.dispose();
  });
  it('restores entire exports without merging or automatically distributing rewards',()=>{
    const m=memory(),c=new GameController(m.storage,()=>0),old=c.exportGame();if(!old.ok)throw Error(old.reason);
    c.grantLaboratoryXp(500);const exported=c.exportGame();if(!exported.ok)throw Error(exported.reason);const s=c.getSnapshot().state;
    const p=c.prepareImport(exported.json);if(!p.ok)throw Error(p.reason);expect(c.confirmImport(p.token,true).ok).toBe(true);expect(c.getSnapshot().state).toEqual(s);
    c.dispose();const reloaded=new GameController(m.storage,()=>0);expect(reloaded.getSnapshot().state).toEqual(s);
    let q=reloaded.prepareImport(old.json);if(!q.ok)throw Error(q.reason);expect(reloaded.confirmImport(q.token,false).ok).toBe(false);expect(reloaded.getSnapshot().state).toEqual(s);
    q=reloaded.prepareImport(old.json);if(!q.ok)throw Error(q.reason);m.flags.fail=SAVE_KEY;expect(reloaded.confirmImport(q.token,true).ok).toBe(false);expect(reloaded.getSnapshot().state).toEqual(s);
    m.flags.fail='';expect(reloaded.confirmImport(q.token,true).ok).toBe(true);expect(reloaded.getSnapshot().state).toEqual(createGame(0));reloaded.dispose();
  });
  it('does not award levels merely demonstrated by an imported surplus and retains stale-tab protections',()=>{
    const s=createCentreStartGame(0);s.progression.totalXp=500;
    const m=memory(encodeGame(s)),c=new GameController(m.storage,()=>0);expect(c.getSnapshot().state!.hearts).toBe(12);expect(c.getSnapshot().state!.progression.rewardedThroughLevel).toBe(1);
    const p=c.prepareImport(encodeGame(s));if(!p.ok)throw Error(p.reason);expect(c.confirmImport(p.token,true).ok).toBe(true);expect(c.getSnapshot().state!.hearts).toBe(12);
    const other=new GameController(m.storage,()=>0);expect(other.grantLaboratoryXp(50).ok).toBe(true);
    expect(c.grantLaboratoryXp(50)).toEqual({ok:false,reason:'STORAGE_CHANGED'});expect(c.getSnapshot().state!.hearts).toBe(12);
    c.dispose();other.dispose();
  });
});
