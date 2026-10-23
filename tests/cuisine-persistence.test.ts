import {describe,expect,it} from 'vitest';
import {act,decodeGame,encodeGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {withKitchen} from './kitchen-fixture';

describe('Cuisine affection in the save',()=>{
  it('roundtrips exact non-rabbit-prefixed individual markers and refuses malformed/future bookkeeping',()=>{
    const s=withKitchen(createCentreStartGame(0));s.rabbits[0].id='birth-101';s.nextId=102;
    const result=act(s,{type:'rewardCuisine',rabbitId:'birth-101',recipeId:'salad'},0);
    expect(result.ok).toBe(true);if(!result.ok)return;
    const loaded=decodeGame(encodeGame(result.state));
    expect(loaded).toEqual({ok:true,state:result.state});
    if(loaded.ok){
      const repeated=act(loaded.state,{type:'rewardCuisine',rabbitId:'birth-101',recipeId:'chicken'},0);
      expect(repeated.ok).toBe(true);if(repeated.ok)expect(repeated.cuisineReward!.affectionGranted).toBe(false);
    }
    for(const cuisine of [{affectionCycles:{'birth-101':-1},heartCycle:null},{affectionCycles:{},heartCycle:1},{affectionCycles:{},heartCycle:-1},{affectionCycles:{},heartCycle:0.5},{affectionCycles:{'birth-101':0.5}},{affectionCycles:{'birth-101':1}},{affectionCycles:{},extra:true}]){
      expect(decodeGame(JSON.stringify({...result.state,cuisine}))).toEqual({ok:false,reason:'INVALID_STATE'});
    }
  });
  it('preserves the Heart marker through a roundtrip and refuses the same Heart again in that cycle',()=>{
    const s=withKitchen(createCentreStartGame(0)),result=act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'salad'},0);
    expect(result.ok).toBe(true);if(!result.ok)return;
    const loaded=decodeGame(encodeGame(result.state));
    expect(loaded).toEqual({ok:true,state:result.state});
    if(!loaded.ok)return;expect(loaded.state.cuisine.heartCycle).toBe(0);
    const again=act(loaded.state,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId:'chicken'},0);
    expect(again.ok).toBe(true);if(again.ok){expect(again.cuisineReward!.heartGranted).toBe(false);expect(again.state.hearts).toBe(loaded.state.hearts);}
  });
  it('reads a v12 save written before the Heart marker as not yet claimed',()=>{
    const s=createCentreStartGame(0),raw=JSON.parse(encodeGame(s));delete raw.cuisine.heartCycle;
    const decoded=decodeGame(JSON.stringify(raw));
    expect(decoded.ok).toBe(true);if(decoded.ok)expect(decoded.state.cuisine).toEqual({affectionCycles:{},heartCycle:null});
  });
  it('persists currencies, affection and cycle marker together through the controller',()=>{
    const raw=encodeGame(withKitchen(createCentreStartGame(0))),values=new Map([[SAVE_KEY,raw]]);
    const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
    const c=new GameController(storage,()=>0);
    try{
      const rabbitId=c.getSnapshot().state!.rabbits[0].id;
      const empty=structuredClone(c.getSnapshot().state),write=storage.setItem,savedBefore=values.get(SAVE_KEY);
      storage.setItem=()=>{throw Error('quota');};
      expect(c.perform({type:'rewardCuisine',rabbitId,recipeId:'salad'})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});
      expect(c.getSnapshot().state).toEqual(empty);expect(values.get(SAVE_KEY)).toBe(savedBefore);
      storage.setItem=write;
      expect(c.perform({type:'rewardCuisine',rabbitId,recipeId:'salad'}).ok).toBe(true);
      expect(decodeGame(values.get(SAVE_KEY)!)).toEqual({ok:true,state:c.getSnapshot().state});
      const before=structuredClone(c.getSnapshot().state),saved=values.get(SAVE_KEY);
      storage.setItem=()=>{throw Error('quota');};
      expect(c.perform({type:'rewardCuisine',rabbitId,recipeId:'salad'})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});
      expect(c.getSnapshot().state).toEqual(before);expect(values.get(SAVE_KEY)).toBe(saved);
    }finally{c.dispose();}
  });
});

describe('Cuisine full-reward quota in the save',()=>{
  const cook=(s:ReturnType<typeof createCentreStartGame>,recipeId:'salad'|'chicken'='salad')=>{const r=act(s,{type:'rewardCuisine',rabbitId:s.rabbits[0].id,recipeId},s.lastSimulatedAt);if(!r.ok)throw Error(r.reason);return r.state;};
  it('round-trips the used count and keeps paying the remaining full slots after a reload',()=>{
    let s=withKitchen(createCentreStartGame(0));for(let n=0;n<3;n++)s=cook(s);
    expect(s.cuisine.fullRuns).toEqual({cycle:0,used:3});
    const loaded=decodeGame(encodeGame(s));expect(loaded).toEqual({ok:true,state:s});if(!loaded.ok)return;
    expect(loaded.state.cuisine.fullRuns).toEqual({cycle:0,used:3});
    let t=loaded.state;const start=t.pattes;for(let n=0;n<4;n++)t=cook(t,'chicken');
    expect(t.pattes-start).toBe(2*60+2*5);expect(t.cuisine.fullRuns).toEqual({cycle:0,used:5});
  });
  it('loads a v12 save written without the field as nothing used: five full runs are still available',()=>{
    const s=withKitchen(createCentreStartGame(0)),raw=JSON.parse(encodeGame(s));
    expect('fullRuns' in raw.cuisine).toBe(false);
    const decoded=decodeGame(JSON.stringify(raw));expect(decoded.ok).toBe(true);if(!decoded.ok)return;
    expect(decoded.state.cuisine).toEqual({affectionCycles:{},heartCycle:null});expect(decoded.state.cuisine.fullRuns?.used??0).toBe(0);
    let t=decoded.state;const start=t.pattes;for(let n=0;n<5;n++)t=cook(t);expect(t.pattes-start).toBe(5*40);
    expect(cook(t).pattes-t.pattes).toBe(5);
  });
  it('also loads a save with an explicit heartCycle only, with nothing used',()=>{
    const raw=JSON.parse(encodeGame(withKitchen(createCentreStartGame(0))));raw.cuisine.heartCycle=null;
    expect(decodeGame(JSON.stringify(raw)).ok).toBe(true);
  });
  it('refuses a malformed, future or over-quota counter',()=>{
    const s=withKitchen(createCentreStartGame(0));
    for(const fullRuns of [{cycle:1,used:1},{cycle:-1,used:1},{cycle:0,used:6},{cycle:0,used:-1},{cycle:0,used:0.5},{cycle:0},{used:1},{cycle:0,used:1,extra:true},[]]){
      expect(decodeGame(JSON.stringify({...s,cuisine:{...s.cuisine,fullRuns}})),JSON.stringify(fullRuns)).toEqual({ok:false,reason:'INVALID_STATE'});
    }
  });
  it('persists the count through the controller together with the reward, and not when the save fails',()=>{
    const raw=JSON.stringify({...JSON.parse(encodeGame(withKitchen(createCentreStartGame(0))))}),values=new Map([[SAVE_KEY,raw]]);
    const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
    const c=new GameController(storage,()=>0);
    try{
      const rabbitId=c.getSnapshot().state!.rabbits[0].id,write=storage.setItem,base=c.getSnapshot().state!.pattes;
      storage.setItem=()=>{throw Error('quota');};
      expect(c.perform({type:'rewardCuisine',rabbitId,recipeId:'chicken'})).toEqual({ok:false,reason:'ACTION_NOT_SAVED'});
      expect(c.getSnapshot().state!.cuisine.fullRuns).toBeUndefined();expect(c.getSnapshot().state!.pattes).toBe(base);
      storage.setItem=write;
      expect(c.perform({type:'rewardCuisine',rabbitId,recipeId:'chicken'})).toMatchObject({ok:true,cuisineReward:{pattes:60,fullReward:true}});
      expect(JSON.parse(values.get(SAVE_KEY)!).cuisine.fullRuns).toEqual({cycle:0,used:1});
    }finally{c.dispose();}
  });
});
