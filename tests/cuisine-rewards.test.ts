import {describe,expect,it} from 'vitest';
import {act,createGame} from '../src/simulation';
import {CUISINE_REWARDS,CUISINE_TIP,CUISINE_FULL_REWARDS_PER_CYCLE} from '../src/config/balance';
import {MISSION_CYCLE_DURATION} from '../src/config/missions';
import {dailyCycleStart} from '../src/simulation/missions';
import type {Command,GameState} from '../src/state/types';
import {withKitchen} from './kitchen-fixture';

const SALAD=CUISINE_REWARDS.salad;
function reward(s:GameState,id=s.rabbits[0].id,now=s.lastSimulatedAt){
  const result=act(s,{type:'rewardCuisine',rabbitId:id,recipeId:'salad'},now);
  expect(result.ok).toBe(true);if(!result.ok)throw Error(result.reason);return result;
}

describe('Cuisine reward command',()=>{
  it('grants the global daily Heart once per canonical cycle whichever rabbit cooks, then again next cycle',()=>{
    const initial=withKitchen(createGame(1234567)),a=initial.rabbits[0];a.id='birth-101';
    initial.rabbits.push({...a,id:'birth-102'});initial.nextId=103;
    const first=reward(initial,'birth-101'),same=reward(first.state,'birth-101'),other=reward(same.state,'birth-102');
    expect(first.cuisineReward!.heartGranted).toBe(true);expect(first.state.hearts).toBe(initial.hearts+1);expect(first.state.cuisine.heartCycle).toBe(0);
    expect(same.cuisineReward!.heartGranted).toBe(false);expect(same.state.hearts).toBe(initial.hearts+1);
    expect(other.cuisineReward).toMatchObject({heartGranted:false,affectionGranted:true});expect(other.state.hearts).toBe(initial.hearts+1);
    expect(other.state.pattes).toBe(initial.pattes+3*SALAD.pattes);expect(other.state.grass).toBe(initial.grass+3*SALAD.grass);
    const boundary=dailyCycleStart(other.state)+MISSION_CYCLE_DURATION;
    const early=reward(other.state,'birth-102',boundary-1);expect(early.cuisineReward!.heartGranted).toBe(false);
    const next=reward(early.state,'birth-102',boundary);
    expect(next.cuisineReward!.heartGranted).toBe(true);expect(next.state.hearts).toBe(initial.hearts+2);expect(next.state.cuisine.heartCycle).toBe(1);
    expect(next.state.progression).toEqual(initial.progression);
  });
  it('keeps the Heart independent of affection, including a rabbit at the cap',()=>{
    const s=withKitchen(createGame(0));s.rabbits[0].affection=20;
    const r=reward(s);expect(r.cuisineReward).toMatchObject({affectionGranted:false,affectionAtCap:true,heartGranted:true});expect(r.state.hearts).toBe(s.hearts+1);
  });
  it('applies neither the Heart nor its marker when the transaction fails',()=>{
    const s=withKitchen(createGame(0));s.hearts=Number.MAX_SAFE_INTEGER;const before=structuredClone(s);
    expect(act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'salad'},0)).toMatchObject({ok:false,reason:'RESOURCE_LIMIT',state:before});
    expect(s).toEqual(before);expect(s.cuisine.heartCycle).toBeNull();
  });
  it.each(['salad','chicken'] as const)('credits both configured resources and first-cycle affection for %s and the daily Heart without XP',recipeId=>{
    const s=withKitchen(createGame(0)),before=structuredClone(s);
    const r=act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId},0);
    expect(r.ok).toBe(true);if(!r.ok)return;
    expect(r.state.pattes).toBe(before.pattes+CUISINE_REWARDS[recipeId].pattes);expect(r.state.grass).toBe(before.grass+CUISINE_REWARDS[recipeId].grass);
    expect(r.state.rabbits).toEqual(before.rabbits.map(r=>({...r,affection:r.affection+1})));
    expect(r.state.hearts).toBe(before.hearts+1);expect(r.state.cuisine.heartCycle).toBe(0);expect(r.state.progression).toEqual(before.progression);
    expect(r.cuisineReward).toEqual({...CUISINE_REWARDS[recipeId],fullReward:true,affectionGranted:true,affectionAtCap:false,heartGranted:true});
    expect(s).toEqual(before);
  });
  it('tracks same-species individuals by exact id and becomes eligible at the canonical cycle boundary',()=>{
    const initial=withKitchen(createGame(1234567)),a=initial.rabbits[0];a.id='birth-101';
    initial.rabbits.push({...a,id:'birth-102'});initial.nextId=103;
    const first=reward(initial,a.id),second=reward(first.state,a.id);
    expect(first.cuisineReward!.affectionGranted).toBe(true);expect(second.cuisineReward!.affectionGranted).toBe(false);
    expect(second.state.rabbits[0].affection).toBe(2);
    const other=reward(second.state,'birth-102');expect(other.state.rabbits.map(r=>r.affection)).toEqual([2,2]);
    expect(other.state.cuisine.affectionCycles).toEqual({'birth-101':0,'birth-102':0});
    const boundary=dailyCycleStart(other.state)+MISSION_CYCLE_DURATION;
    const early=reward(other.state,a.id,boundary-1);expect(early.cuisineReward!.affectionGranted).toBe(false);
    const next=reward(early.state,a.id,boundary);expect(next.cuisineReward!.affectionGranted).toBe(true);
    expect(next.state.rabbits[0].affection).toBe(3);expect(next.state.cuisine.affectionCycles[a.id]).toBe(1);
    expect(next.state.pattes).toBe(initial.pattes+5*SALAD.pattes);
    expect(next.state.grass).toBe(initial.grass+5*SALAD.grass);
    expect(next.state.hearts).toBe(initial.hearts+2);expect(next.state.progression).toEqual(initial.progression);
    expect(other.state.missions.daily.progress['gain-affection']).toBe(0);
    expect(early.state.missions.daily.progress['gain-affection']).toBe(0);
    expect(next.state.missions.daily.progress['gain-affection']).toBe(0);
  });
  it('consumes the opportunity even at the cap and never exceeds 20',()=>{
    const initial=withKitchen(createGame(0));initial.rabbits[0].affection=20;
    const first=reward(initial),second=reward(first.state);
    expect(second.state.missions.daily.progress['gain-affection']).toBe(0);
    expect(first.cuisineReward).toMatchObject({affectionGranted:false,affectionAtCap:true});
    expect(first.state.cuisine.affectionCycles[initial.rabbits[0].id]).toBe(0);
    expect(second.state.rabbits[0].affection).toBe(20);
    const lowered=structuredClone(second.state);lowered.rabbits[0].affection=19;
    expect(reward(lowered).state.rabbits[0].affection).toBe(19);
    const edge=withKitchen(createGame(0));edge.rabbits[0].affection=19;
    expect(reward(edge).state.rabbits[0].affection).toBe(20);
  });
  it.each(['pattes','grass'] as const)('rejects %s overflow atomically',resource=>{
    const s=withKitchen(createGame(0));s[resource]=Number.MAX_SAFE_INTEGER;const before=structuredClone(s);
    expect(act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'salad'},0)).toMatchObject({ok:false,reason:'RESOURCE_LIMIT',state:before});
    expect(s).toEqual(before);
  });
  it('rejects absent rabbits and unknown recipes without granting resources',()=>{
    const s=withKitchen(createGame(0));
    expect(act(s,{type:'rewardCuisine',rabbitId:'missing',recipeId:'salad'},0)).toMatchObject({ok:false,reason:'NOT_FOUND',state:s});
    expect(act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'unknown' as 'salad'},0)).toMatchObject({ok:false,reason:'INVALID_CHOICE',state:s});
  });
  describe('requires a Kitchen in the simulation itself',()=>{
    const bare=()=>{const s=createGame(1234567);s.rabbits[0].affection=3;return s;};
    it.each(['salad','chicken'] as const)('refuses %s without a Kitchen, with the state untouched and no Cuisine bookkeeping',recipeId=>{
      const s=bare(),before=structuredClone(s);
      expect(s.buildings.some(b=>b.kind==='kitchen')).toBe(false);
      const r=act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId},s.lastSimulatedAt);
      expect(r).toMatchObject({ok:false,reason:'MISSING_BUILDING'});expect(r.state).toBe(s);
      expect(s).toEqual(before);expect(s.cuisine).toEqual({affectionCycles:{},heartCycle:null});
      expect([s.pattes,s.grass,s.hearts,s.rabbits[0].affection]).toEqual([before.pattes,before.grass,before.hearts,3]);
    });
    it('checks the Kitchen before the rabbit, and stays refused in every cycle',()=>{
      const s=bare();
      expect(act(s,{type:'rewardCuisine',rabbitId:'missing',recipeId:'salad'},s.lastSimulatedAt)).toMatchObject({ok:false,reason:'MISSING_BUILDING'});
      const later=s.lastSimulatedAt+3*MISSION_CYCLE_DURATION;
      expect(act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'salad'},later)).toMatchObject({ok:false,reason:'MISSING_BUILDING'});
    });
    it('pays and records as before once a Kitchen is owned (rewards, affection, Heart, cycle bookkeeping)',()=>{
      const s=withKitchen(bare()),before=structuredClone(s),r=reward(s);
      expect(r.state.pattes).toBe(before.pattes+SALAD.pattes);expect(r.state.grass).toBe(before.grass+SALAD.grass);
      expect(r.state.rabbits[0].affection).toBe(4);expect(r.state.hearts).toBe(before.hearts+1);
      expect(r.state.cuisine).toEqual({affectionCycles:{[s.rabbits[0].id]:0},heartCycle:0,fullRuns:{cycle:0,used:1}});
      expect(r.cuisineReward).toEqual({...SALAD,fullReward:true,affectionGranted:true,affectionAtCap:false,heartGranted:true});
      const again=reward(r.state);expect(again.cuisineReward).toMatchObject({affectionGranted:false,heartGranted:false});
    });
  });
});

describe('full-reward quota: five per cycle, shared by every recipe',()=>{
  const FULL=CUISINE_FULL_REWARDS_PER_CYCLE,CHICKEN=CUISINE_REWARDS.chicken;
  const cook=(s:GameState,recipeId:'salad'|'chicken',id=s.rabbits[0].id,now=s.lastSimulatedAt)=>{
    const r=act(s,{type:'rewardCuisine',rabbitId:id,recipeId},now);if(!r.ok)throw Error(r.reason);return r;
  };
  const fresh=()=>withKitchen(createGame(1234567));
  it('pins the locked values',()=>{
    expect([FULL,CUISINE_REWARDS.salad,CHICKEN,CUISINE_TIP]).toEqual([5,{pattes:40,grass:3},{pattes:60,grass:3},{pattes:5,grass:1}]);
  });
  it('pays runs 1 to 5 in full and every later run only the tip',()=>{
    let s=fresh();const start=structuredClone(s);
    for(let n=1;n<=FULL+3;n++){
      const before=s,r=cook(s,'salad');s=r.state;
      const expected=n<=FULL?CUISINE_REWARDS.salad:CUISINE_TIP;
      expect(r.cuisineReward,'run '+n).toMatchObject({pattes:expected.pattes,grass:expected.grass,fullReward:n<=FULL});
      expect([s.pattes-before.pattes,s.grass-before.grass],'run '+n).toEqual([expected.pattes,expected.grass]);
    }
    expect(s.pattes).toBe(start.pattes+5*40+3*5);expect(s.grass).toBe(start.grass+5*3+3*1);
    expect(s.cuisine.fullRuns).toEqual({cycle:0,used:FULL}); // saturates: tips never push it further
  });
  it.each([
    ['salad',[200,250,325,475]],['chicken',[300,350,425,575]],['alternating',[240,290,365,515]],
  ] as const)('totals %s coins over 5 / 15 / 30 / 60 runs, with the 5 coin / 1 grass tip',(mode,totals)=>{
    [5,15,30,60].forEach((runs,i)=>{
      let s=fresh();const start=structuredClone(s);
      for(let n=0;n<runs;n++)s=cook(s,mode==='alternating'?(n%2?'chicken':'salad'):mode).state;
      expect(s.pattes-start.pattes,mode+' x'+runs).toBe(totals[i]);
      expect(s.grass-start.grass,mode+' grass x'+runs).toBe(3*Math.min(runs,5)+(runs>5?runs-5:0));
      expect(s.hearts-start.hearts).toBe(1);expect(s.rabbits[0].affection-start.rabbits[0].affection).toBe(1);
    });
  });
  it('pays salad 40 and chicken 60 coins in full, 3 grass each',()=>{
    for(const [recipe,coins] of [['salad',40],['chicken',60]] as const){
      const s=fresh(),r=cook(s,recipe);
      expect([r.state.pattes-s.pattes,r.state.grass-s.grass,r.cuisineReward!.fullReward]).toEqual([coins,3,true]);
    }
  });
  it('shares the five slots between recipes, whatever the order',()=>{
    let s=fresh();const start=s.pattes;
    for(const recipe of ['chicken','salad','salad','chicken','salad'] as const)s=cook(s,recipe).state;
    expect(s.pattes-start).toBe(3*40+2*60);expect(s.cuisine.fullRuns).toEqual({cycle:0,used:5});
    const tipSalad=cook(s,'salad'),tipChicken=cook(tipSalad.state,'chicken');
    for(const r of [tipSalad,tipChicken])expect(r.cuisineReward).toMatchObject({pattes:5,grass:1,fullReward:false});
    expect(tipChicken.state.pattes-s.pattes).toBe(10);
  });
  it('leaves affection and the Heart exactly as before: one each per cycle, whatever the pay tier',()=>{
    const a=fresh();a.rabbits[0].affection=3;let s=a;const start=s.hearts;
    for(let n=1;n<=7;n++){
      const r=cook(s,n%2?'salad':'chicken');s=r.state;
      expect(r.cuisineReward,'run '+n).toMatchObject({affectionGranted:n===1,heartGranted:n===1});
    }
    expect(s.rabbits[0].affection).toBe(4);expect(s.hearts).toBe(start+1);expect(s.cuisine).toMatchObject({heartCycle:0,affectionCycles:{[s.rabbits[0].id]:0}});
  });
  it('failed or refused runs never consume a slot',()=>{
    const s=fresh();
    const refusals:[Command,string][]=[
      [{type:'rewardCuisine',rabbitId:'missing',recipeId:'salad'},'NOT_FOUND'],
      [{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'unknown' as 'salad'},'INVALID_CHOICE'],
    ];
    for(const [command,reason] of refusals)expect(act(s,command,s.lastSimulatedAt)).toMatchObject({ok:false,reason,state:s});
    const noKitchen=createGame(1);expect(act(noKitchen,{type:'rewardCuisine',rabbitId:noKitchen.rabbits[0].id,recipeId:'salad'},1)).toMatchObject({ok:false,reason:'MISSING_BUILDING'});
    const full=fresh();full.pattes=Number.MAX_SAFE_INTEGER;
    expect(act(full,{type:'rewardCuisine',rabbitId:full.rabbits[0].id,recipeId:'salad'},0)).toMatchObject({ok:false,reason:'RESOURCE_LIMIT',state:full});
    expect(full.cuisine.fullRuns).toBeUndefined();expect(s.cuisine.fullRuns).toBeUndefined();
    // After all those refusals the five full slots are still there.
    let after=s;for(let n=0;n<FULL;n++)after=cook(after,'salad').state;
    expect(after.pattes-s.pattes).toBe(FULL*40);
  });
  it('renews the five slots with the canonical daily cycle, and not before',()=>{
    let s=fresh();for(let n=0;n<FULL+2;n++)s=cook(s,'salad').state;
    const boundary=dailyCycleStart(s)+MISSION_CYCLE_DURATION;
    const before=cook(s,'chicken',s.rabbits[0].id,boundary-1);
    expect(before.cuisineReward).toMatchObject({pattes:5,fullReward:false});expect(before.state.cuisine.fullRuns).toEqual({cycle:0,used:FULL});
    let next=cook(before.state,'chicken',s.rabbits[0].id,boundary).state;
    expect(next.cuisine.fullRuns).toEqual({cycle:1,used:1});expect(next.pattes-before.state.pattes).toBe(60);
    for(let n=1;n<FULL;n++)next=cook(next,'salad').state;
    expect(next.cuisine.fullRuns).toEqual({cycle:1,used:FULL});
    expect(cook(next,'salad').cuisineReward).toMatchObject({pattes:5,fullReward:false});
    // A later cycle, skipping days, also starts again.
    const skipped=cook(next,'salad',s.rabbits[0].id,boundary+5*MISSION_CYCLE_DURATION);
    expect(skipped.cuisineReward).toMatchObject({pattes:40,fullReward:true});expect(skipped.state.cuisine.fullRuns!.cycle).toBe(6);
  });
});
