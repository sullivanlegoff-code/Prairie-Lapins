import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,encodeGame,decodeGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {GameController} from '../src/application/GameController';
import * as progression from '../src/simulation/progression';
import {SAVE_KEY} from '../src/persistence/storage';
import type {Command,GameState,DecorationLocation} from '../src/state/types';
const outside:DecorationLocation={kind:'outside',x:18,y:28,rotation:0};
function run(s:GameState,c:Command){const r=act(s,c,s.lastSimulatedAt);if(!r.ok)throw Error(r.reason);return r;}
function eligible(){const s=createCentreStartGame(0),level=progression.requiredDecorationLevel('birthday-candle');s.progression={totalXp:progression.cumulativeLevelXp(level),rewardedThroughLevel:level};return s;}
function inventory(){return run(eligible(),{type:'buyDecoration',catalogId:'birthday-candle'}).state;}
afterEach(()=>vi.restoreAllMocks());
describe('per-model first decoration pose XP',()=>{
 it('buys and poses atomically, then repeated confirmations give no new gain',()=>{
  const s=eligible(),r=run(s,{type:'buyDecoration',catalogId:'birthday-candle',location:outside});const d=r.state.decorations[0];expect(d.placementXpProcessed).toBe(true);expect(r.state.pattes).toBe(300);expect(r.state.progression.totalXp).toBe(s.progression.totalXp+progression.firstDecorationPlacementXp(d.catalogId));
  expect(run(r.state,{type:'placeDecoration',id:d.id,location:outside}).state.progression).toEqual(r.state.progression);
 });
 it('inventory purchase, export/import and reload retain unused explicit false until the first pose',()=>{
  const s=inventory();expect(s.progression.totalXp).toBe(eligible().progression.totalXp);expect(s.decorations[0].placementXpProcessed).toBe(false);const r=decodeGame(encodeGame(s));if(!r.ok)throw Error(r.reason);expect(r.state).toEqual(s);
  const state=run(r.state,{type:'placeDecoration',id:s.decorations[0].id,location:outside}).state;expect(state.decorations[0].placementXpProcessed).toBe(true);expect(state.progression.totalXp).toBe(s.progression.totalXp+progression.firstDecorationPlacementXp('birthday-candle'));
 });
 it('move, grouped storage and repose keep XP and the marker',()=>{
  let s=inventory(),id=s.decorations[0].id;s=run(s,{type:'placeDecoration',id,location:outside}).state;const xp=s.progression.totalXp;
  s=run(s,{type:'placeDecoration',id,location:{kind:'outside',x:20,y:28,rotation:0}}).state;
  s=run(s,{type:'storeDecorationsInCell',x:5,y:7}).state;expect(s.decorations[0].location.kind).toBe('inventory');expect(s.decorations[0].placementXpProcessed).toBe(true);
  s=run(s,{type:'placeDecoration',id,location:outside}).state;s=run(s,{type:'placeDecoration',id,location:{kind:'inventory'}}).state;s=run(s,{type:'placeDecoration',id,location:outside}).state;expect(s.progression.totalXp).toBe(xp);
 });
 it('same catalogue, distinct exemplars: only the first model pose gains XP, including after resale',()=>{
  let s=run(createCentreStartGame(0),{type:'buyDecoration',catalogId:'bush',location:outside}).state;s=run(s,{type:'buyDecoration',catalogId:'bush'}).state;const id=s.decorations[1].id;s=run(s,{type:'placeDecoration',id,location:{kind:'outside',x:20,y:28,rotation:0}}).state;const xp=progression.firstDecorationPlacementXp('bush');expect(s.progression.totalXp).toBe(xp);
  s=run(s,{type:'sellDecoration',id}).state;expect(s.progression.totalXp).toBe(xp);s=run(s,{type:'buyDecoration',catalogId:'bush'}).state;const fresh=s.decorations.at(-1)!;expect(fresh.id).not.toBe(id);expect(fresh.placementXpProcessed).toBe(false);s=run(s,{type:'placeDecoration',id:fresh.id,location:{kind:'outside',x:20,y:28,rotation:0}}).state;expect(s.progression.totalXp).toBe(xp);
 });
 it.each(['inventory','outside'] as const)('historical %s with absent marker has no retroactive right',kind=>{
  const s=createCentreStartGame(0);s.decorations=[{id:'decoration-6',catalogId:'bush',location:kind==='inventory'?{kind}:outside}];s.nextId=7;
  const decoded=decodeGame(encodeGame(s));if(!decoded.ok)throw Error(decoded.reason);const r=run(decoded.state,{type:'placeDecoration',id:'decoration-6',location:outside});expect(r.state.progression.totalXp).toBe(0);expect(r.progressionGain).toBeUndefined();
 });
 it('rejects nonboolean markers and explicit false on an already placed object',()=>{
  const s=inventory();for(const marker of [0,'false',null]){const raw=JSON.parse(encodeGame(s));raw.decorations[0].placementXpProcessed=marker;expect(decodeGame(JSON.stringify(raw))).toEqual({ok:false,reason:'INVALID_STATE'});}
  s.decorations[0].location=outside;expect(()=>encodeGame(s)).toThrow();
 });
 it.each(['collision','overflow','hearts'] as const)('%s refuses purchase/pose without payment or marker changes',reason=>{
  for(const mode of ['buy','pose']){const s=mode==='pose'?inventory():createCentreStartGame(0);let location=outside;if(reason==='collision')location={kind:'outside',x:22,y:24,rotation:0};if(reason==='overflow')s.progression.totalXp=Number.MAX_SAFE_INTEGER;if(reason==='hearts'){s.progression.totalXp=89;s.progression.rewardedThroughLevel=1;s.hearts=Number.MAX_SAFE_INTEGER;}
  const command:Command=mode==='buy'?{type:'buyDecoration',catalogId:'bush',location}:{type:'placeDecoration',id:s.decorations[0].id,location};const before=structuredClone(s),r=act(s,command,0);expect(r.ok).toBe(false);expect(r.state).toEqual(before);expect(s).toEqual(before);}
 });
 it.each([false,true])('write failure with zeroGain=%s retains the unprocessed inventory object, then retries once',zero=>{
  if(zero)vi.spyOn(progression,'firstDecorationPlacementXp').mockReturnValue(0);
  const s=inventory(),data=new Map([[SAVE_KEY,encodeGame(s)]]),flags={fail:false},events:unknown[]=[];const c=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(flags.fail)throw Error('quota');data.set(k,v);}},()=>0);c.onProgressionGain(g=>events.push(g));const command:Command={type:'placeDecoration',id:s.decorations[0].id,location:outside};flags.fail=true;
  expect(c.perform(command)).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(s);expect(events).toHaveLength(0);flags.fail=false;expect(c.perform(command).ok).toBe(true);expect(c.getSnapshot().state!.decorations[0].placementXpProcessed).toBe(true);expect(c.getSnapshot().state!.progression.totalXp).toBe(s.progression.totalXp+(zero?0:progression.firstDecorationPlacementXp('birthday-candle')));expect(events).toHaveLength(zero?0:1);expect(c.perform(command).ok).toBe(true);expect(events).toHaveLength(zero?0:1);c.dispose();
 });
 it('posed purchase write failure preserves wallet and identities',()=>{
  const s=createCentreStartGame(0),data=new Map([[SAVE_KEY,encodeGame(s)]]);let fail=false;const c=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');data.set(k,v);}},()=>0);fail=true;expect(c.perform({type:'buyDecoration',catalogId:'bush',location:outside})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});expect(c.getSnapshot().state).toEqual(s);fail=false;expect(c.perform({type:'buyDecoration',catalogId:'bush',location:outside}).ok).toBe(true);expect(c.getSnapshot().state!.decorations).toHaveLength(1);c.dispose();
 });
});
