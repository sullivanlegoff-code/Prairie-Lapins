import {regressionStart as createGame} from './regression-start';
import {describe, expect, it, vi} from 'vitest';
import {act, advance, encodeGame, decodeGame} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {ActionGate} from '../src/ui/gestures';
import {BALANCE, HOUR, MINUTE, SPECIES_IDS, SPECIES, growthDuration, ORDERS} from '../src/config/balance';
import {DECORATIONS, DECORATION_IDS} from '../src/config/decorations';
import {PARCEL_IDS, extensionPrice} from '../src/config/land';
import {quoteAcceleration} from '../src/simulation/hearts';
import type {Command, GameState} from '../src/state/types';
import {babyOf, welcomeOf} from './nursery-baby';
import {EXPECTED_IDS} from './rabbit-art-fixtures';

function apply(s: GameState, command: Command, now = s.lastSimulatedAt): GameState {
 const result = act(s, command, now, () => .5);
 if (!result.ok) throw new Error(result.reason);
 return result.state;
}
function equipped(): GameState {
 let s = createGame(0); s.pattes = 100_000; s.grass = 100_000; s.hearts = 1000;
 for (const [kind, x, y] of [['farm',22,20], ['nest',26,20], ['nursery',18,24], ['enclosure',22,24]] as const)
  s = apply(s, kind==='nest'||kind==='nursery'?{type:'placeStarterBuilding',kind,x,y}:{type:'buyBuilding',kind,x,y});
 s = apply(s,{type:'feed',id:'rabbit-2'}); s = apply(s,{type:'feed',id:'rabbit-3'});
 return s;
}
function invariant(s: GameState) {
 const decoded = decodeGame(encodeGame(s));
 expect(decoded.ok).toBe(true);
 if (decoded.ok) expect(decoded.state).toEqual(s);
}
describe('technical foundation regressions', () => {
 it('refuses resource overflow without consuming income, harvest or gift', () => {
  let s = advance(equipped(), HOUR); s.pattes = Number.MAX_SAFE_INTEGER;
  expect(act(s,{type:'collectIncome',id:'building-1'},HOUR)).toEqual({ok:false,reason:'RESOURCE_LIMIT',state:s});
  s.pattes = 100; s = apply(s,{type:'startOrder',id:'building-4',recipe:'small'});
  s = advance(s, HOUR + ORDERS.small.duration); s.grass = Number.MAX_SAFE_INTEGER;
  expect(act(s,{type:'collectOrder',id:'building-4'},s.lastSimulatedAt)).toEqual({ok:false,reason:'RESOURCE_LIMIT',state:s});
  s.hearts = Number.MAX_SAFE_INTEGER; s = advance(s, 24*HOUR);
  expect(act(s,{type:'claimHearts'},s.lastSimulatedAt)).toEqual({ok:false,reason:'RESOURCE_LIMIT',state:s}); invariant(s);
 });
 it('refuses exhausted entity allocation before payment or random draw', () => {
  const s = equipped(); s.nextId = Number.MAX_SAFE_INTEGER; const rng = vi.fn(() => .2);
  for (const command of [{type:'buyBuilding',kind:'farm',x:26,y:24}, {type:'buyRabbit',species:'neige',enclosureId:'building-7'}, {type:'breed',parents:['rabbit-2','rabbit-3']}] as Command[]) {
   const before = structuredClone(s); expect(act(s,command,0,rng)).toEqual({ok:false,reason:'RESOURCE_LIMIT',state:s}); expect(s).toEqual(before);
  }
  expect(rng).not.toHaveBeenCalled(); invariant(s);
 });
 it('refuses unsafe job deadlines before payment or random draw', () => {
  const s = equipped(), now = Number.MAX_SAFE_INTEGER - 100; const rng = vi.fn(() => .2);
  for (const command of [{type:'startOrder',id:'building-4',recipe:'small'}, {type:'breed',parents:['rabbit-2','rabbit-3']}] as Command[])
   expect(act(s,command,now,rng)).toEqual({ok:false,reason:'INVALID_TIME',state:s});
  expect(rng).not.toHaveBeenCalled();
 });
 it('blocks a stale tab before spending or drawing; retains an exportable memory copy', () => {
  let raw = encodeGame(equipped()); const callbacks = new Set<() => void>();
  const storage: SaveStorage = {getItem:()=>raw,setItem:(_key,value)=>{raw=value;},onChange:(key,listener)=>{expect(key).toBe(SAVE_KEY);callbacks.add(listener);return()=>{callbacks.delete(listener);};}};
  const rng = vi.fn(() => .3), stale = new GameController(storage,()=>0,rng), winner = new GameController(storage,()=>0);
  const before = stale.getSnapshot().state; winner.perform({type:'feed',id:'rabbit-2'});
  for (const notify of callbacks) notify();
  expect(stale.getSnapshot().status).toBe('conflict');
  expect(stale.perform({type:'breed',parents:['rabbit-2','rabbit-3']})).toEqual({ok:false,reason:'STORAGE_CHANGED'});
  expect(stale.getSnapshot().state).toEqual(before); expect(rng).not.toHaveBeenCalled(); expect(stale.exportGame().ok).toBe(true);
  const saved = raw; expect(stale.retrySave().ok).toBe(false); expect(raw).toBe(saved);
  stale.dispose(); winner.dispose(); expect(callbacks.size).toBe(0);
 });
 it('retains recovery of an unreadable source after an external storage event', () => {
  let raw = '{bad'; let changed = () => {};
  const storage: SaveStorage = {getItem:()=>raw,setItem:(_key,value)=>{raw=value;},onChange:(_key,listener)=>{changed=listener;return()=>{};}};
  const c = new GameController(storage,()=>0); raw=encodeGame(createGame(0)); changed();
  expect(c.getSnapshot().status).toBe('invalid-save'); expect(c.getSnapshot().hasUnreadableBackup).toBe(true);
  expect(c.unreadableBackup()).toBe('{bad'); expect(c.restart(true)).toEqual({ok:false,reason:'STORAGE_CHANGED'}); c.dispose();
 });
 it('invalidates UI generations only after successful replacement', () => {
  let raw: string | null = null, fail = false;
  const storage: SaveStorage = {getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw new Error('quota');raw=value;}};
  const c = new GameController(storage,()=>0); expect(c.getSnapshot().generation).toBe(0);
  fail = true; expect(c.restart(true).ok).toBe(false); expect(c.getSnapshot().generation).toBe(0);
  fail = false; expect(c.restart(true).ok).toBe(true); expect(c.getSnapshot().generation).toBe(1);
  const imported = c.prepareImport(encodeGame(equipped())); expect(imported.ok).toBe(true);
  if(imported.ok) expect(c.confirmImport(imported.token,true).ok).toBe(true);
  expect(c.getSnapshot().generation).toBe(2); c.dispose();
 });
 it('expires the double-tap cache during long sessions and still prevents reentry', () => {
  let now = 0; const gate = new ActionGate(()=>now), action = vi.fn();
  for(let i=0;i<10_000;i++){now+=50;expect(gate.run(`object-${i}`,action)).toBe(true);}
  expect((gate as unknown as {last:Map<string,number>}).last.size).toBeLessThanOrEqual(7);
  expect(gate.run('object-9999',action)).toBe(false);
  expect(gate.run('outer',()=>{expect(gate.run('inner',action)).toBe(false);})).toBe(true);
 });
 it('validates stable catalogue references, safe costs, recipes and durations', () => {
  expect(new Set(SPECIES_IDS).size).toBe(EXPECTED_IDS.length); expect(new Set(DECORATION_IDS).size).toBe(12);
  for(const id of SPECIES_IDS){const species=SPECIES[id];expect(species.name).toBeTruthy();expect(growthDuration(id)).toBeGreaterThan(0);expect(Number.isSafeInteger(growthDuration(id))).toBe(true);
   if(species.price!==null)expect(Number.isSafeInteger(species.price)&&species.price>=0).toBe(true);
   if(species.recipe){expect(species.recipe.minAffection).toBeGreaterThanOrEqual(BALANCE.breedingAffection);expect(species.recipe.minAffection).toBeLessThanOrEqual(BALANCE.maxAffection);for(const parent of species.recipe.parents??[])expect(SPECIES_IDS).toContain(parent);}
  }
  for(const id of DECORATION_IDS)expect(Number.isSafeInteger(DECORATIONS[id].price)&&DECORATIONS[id].price>=0).toBe(true);
 });
});

describe('reproducible action traces', () => {
 it.each([17,104729,20261009])('keeps invariants and time equivalence for seed %i', seed => {
  let value=seed, s=equipped(), now=0; const trace:unknown[]=[];
  const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  const rng=vi.fn(random);
  try {
   for(let step=0;step<180;step++) {
    const beforeTime=s, delta=Math.floor(random()*40)*MINUTE; now+=delta;
    s=advance(s,now);
    expect(advance(advance(beforeTime, beforeTime.lastSimulatedAt+Math.floor(delta/2)),now)).toEqual(s);
    expect(advance(s,now)).toEqual(s); expect(advance(s,Math.max(0,now-MINUTE))).toEqual(s);
    const decoration=s.decorations[0], farm=s.buildings.find(b=>b.kind==='farm')!, nest=s.buildings.find(b=>b.kind==='nest')!, nursery=s.buildings.find(b=>b.kind==='nursery')!;
    const stage=nest.breeding?'breeding':babyOf(nursery)?'growth':'order'; const target=stage==='breeding'?nest:stage==='growth'?nursery:farm;
    const growing=stage==='growth'?babyOf(nursery)!.birth.id:undefined, quote=quoteAcceleration(s,target.id,stage,now,growing);
    const choices:Command[]=[
     {type:'buyDecoration',catalogId:'wildflowers'}, {type:'collectIncome',id:'building-1'}, {type:'feed',id:'rabbit-2'},
     {type:'startOrder',id:farm.id,recipe:'small'}, {type:'collectOrder',id:farm.id}, {type:'breed',parents:['rabbit-2','rabbit-3']},
     welcomeOf(s,'building-7'), {type:'claimHearts'}, {type:'claimMainMission',id:'first-farm'},
     {type:'expand',parcelId:PARCEL_IDS[Math.floor(random()*PARCEL_IDS.length)],expectedCost:extensionPrice(s)},
     {type:'buyRabbit',species:'neige',enclosureId:'building-7'},
     {type:'sellDecoration',id:decoration?.id??'absent'},
     {type:'placeDecoration',id:decoration?.id??'absent',location:{kind:'outside',x:25,y:23,rotation:0}},
     {type:'placeDecoration',id:decoration?.id??'absent',location:{kind:'inventory'}},
     quote.ok?{type:'accelerate',id:target.id,stage,jobKey:quote.jobKey,maxHearts:quote.hearts,...(growing?{birthId:growing}:{})}:{type:'collectOrder',id:'absent'}
    ];
    const command=choices[Math.floor(random()*choices.length)], before=structuredClone(s), draws=rng.mock.calls.length;
    const result=act(s,command,now,rng);trace.push({step,now,command,ok:result.ok,...(!result.ok?{reason:result.reason}:{})});
    expect(s).toEqual(before); if(result.ok)s=result.state;else expect(result.state).toBe(s);
    invariant(s);
    const loaded=decodeGame(encodeGame(s));if(loaded.ok)expect(advance(loaded.state,now)).toEqual(s);
    expect(rng.mock.calls.length-draws).toBe(command.type==='breed'&&result.ok?1:0);
   }
  } catch(error) {throw new Error(`seed=${seed}\n${JSON.stringify(trace)}\n${String(error)}`);}
 });
});
