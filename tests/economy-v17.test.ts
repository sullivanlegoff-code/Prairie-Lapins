import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {rabbitIncome} from '../src/simulation/time';
import {describe,it,expect} from 'vitest';
import fixture from './fixtures/economy-v16.json';
import {decodeGame,encodeGame} from '../src/persistence/json';
import {act,advance} from '../src/simulation';
import {cumulativeLevelXp,progressionFromXp,nextLevelCost} from '../src/simulation/progression';
import {PROGRESSION} from '../src/config/progression';
import {GUARANTEE_SPECIES,HOUR,ORDERS} from '../src/config/balance';
import {habitatLevel,habitatPrice,HABITAT_TYPES} from '../src/config/habitats';
function migrated(raw:unknown=fixture){const d=decodeGame(JSON.stringify(raw));expect(d.ok).toBe(true);if(!d.ok)throw Error(d.reason);return d.state;}
describe('v16 → v17 economy migration (fixture encoded by the actual v16 writer)',()=>{
 it('preserves balances, individuals, stored income and exact pending births without a draw',()=>{
  const s=migrated();expect(s.version).toBe(17);for(const key of ['pattes','grass','hearts','rabbits','discovered','recipeBook','lastSimulatedAt','nextId','nextHeartGiftAt'] as const)expect(s[key]).toEqual(fixture[key]);
  expect(s.buildings.map(b=>({...b,order:null}))).toEqual(fixture.buildings.map(b=>({...b,order:null})));expect(s.pityFailures).toBe(7);
  expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
 });
 it('preserves level and fractional progress with at most one XP rounding; no loading Hearts',()=>{
  const old={...structuredClone(PROGRESSION),curve:{...PROGRESSION.curve,base:50,exponent:1.6}};
  for(const level of [1,2,5,15,29,30])for(const fraction of [0,0.25,0.99]){const raw=structuredClone(fixture);raw.progression.totalXp=cumulativeLevelXp(level,old)+Math.floor((nextLevelCost(level,old)??0)*fraction);const before=progressionFromXp(raw.progression.totalXp,old);const s=migrated(raw),after=progressionFromXp(s.progression.totalXp);expect(after.level).toBe(before.level);if(after.xpRequired)expect(Math.abs(after.progress-before.progress)).toBeLessThanOrEqual(1/after.xpRequired);expect(s.hearts).toBe(raw.hearts);expect(s.progression.rewardedThroughLevel).toBe(raw.progression.rewardedThroughLevel);}
 });
 it.each(['small','medium','large'] as const)('freezes historical %s yield and normal duration even after acceleration',recipe=>{
  const raw=structuredClone(fixture),job=raw.buildings.find(b=>b.order)!.order!,legacy={small:[20,300000],medium:[40,900000],large:[100,3600000]}[recipe];job.recipe=recipe;job.endsAt=job.startedAt+legacy[1];
  const s=migrated(raw),farm=s.buildings.find(b=>b.order)!;expect(farm.order).toMatchObject({grass:legacy[0],duration:legacy[1],endsAt:job.endsAt});const r=act(s,{type:'collectOrder',id:farm.id},Math.max(s.lastSimulatedAt,job.endsAt));expect(r.ok).toBe(true);expect(r.state.grass).toBe(raw.grass+legacy[0]);
  job.endsAt=raw.lastSimulatedAt;expect(migrated(raw).buildings.find(b=>b.order)!.order!.duration).toBe(legacy[1]);
 });
 it.each([0,1,2,3,20])('converts old affection progress %s and preserves claimed/earned rewards',progress=>{const raw=structuredClone(fixture);raw.missions.daily.progress['gain-affection']=progress;raw.missions.daily.claimed=[];expect(migrated(raw).missions.daily.progress['gain-affection']).toBe(progress>=3?1:0);const s=migrated();expect(s.missions.daily.claimed).toEqual(['gain-affection']);expect(act(s,{type:'claimDailyMission',id:'gain-affection',cycleStart:s.missions.daily.referenceAt},s.lastSimulatedAt)).toMatchObject({ok:false,reason:'ALREADY_CLAIMED'});});
 it('marks historically placed decoration models, including already stored exemplars',()=>{const raw=structuredClone(fixture) as unknown as Record<string,unknown>;raw.decorations=[{id:'decoration-10',catalogId:'bush',location:{kind:'inventory'},placementXpProcessed:true}];raw.nextId=11;expect(migrated(raw).rewardedDecorationModels).toEqual(['bush']);});
 it('still refuses versions 1–15, invalid v16 and future versions',()=>{for(let version=1;version<=15;version++)expect(decodeGame(JSON.stringify({version}))).toEqual({ok:false,reason:'INCOMPATIBLE_CATALOG'});expect(decodeGame('{"version":16}')).toEqual({ok:false,reason:'INVALID_STATE'});expect(decodeGame('{"version":18}')).toEqual({ok:false,reason:'UNSUPPORTED_VERSION'});});
});
describe('economy invariants',()=>{
 it('stores 24 hours of full rare income at every habitat level',()=>{for(const type of HABITAT_TYPES)for(const level of [1,2,3] as const){const h=habitatLevel(type,level);expect(h.cap).toBeGreaterThanOrEqual(h.capacity*33*24);expect(h.cap).toBe([2400,4000,5600][level-1]);if(level===2)expect(h.cost).toBe(habitatPrice(type)/2);}});
 it('guarantees all 18 ordinary rares and excludes specials',()=>{expect(GUARANTEE_SPECIES).toHaveLength(18);expect(GUARANTEE_SPECIES).not.toContain('dragon');expect(GUARANTEE_SPECIES).not.toContain('magicien');});
 it('accumulates gifts up to three and keeps the next clock boundary',()=>{const s=migrated();for(const days of [1,2,3,10]){const now=s.nextHeartGiftAt+(days-1)*24*HOUR+HOUR;const r=act(s,{type:'claimHearts'},now);expect(r.ok).toBe(true);expect(r.state.hearts).toBe(s.hearts+Math.min(3,days)*2);expect(r.state.nextHeartGiftAt).toBe(now+23*HOUR);expect(advance(r.state,now).hearts).toBe(r.state.hearts);}});
 it('has four orders covering short visits and the night',()=>{expect(Object.keys(ORDERS)).toEqual(['small','medium','large','night']);expect(ORDERS.night).toEqual({cost:100,grass:360,duration:10*HOUR});});
});

describe('persistent economy transactions',()=>{
 it('loads and rewrites a real v16 through the controller, with no reset or extra Hearts on repeated loads',()=>{
  const data=new Map([[SAVE_KEY,JSON.stringify(fixture)]]),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};
  const first=new GameController(storage,()=>fixture.lastSimulatedAt),state=first.getSnapshot().state!;
  expect(first.getSnapshot()).toMatchObject({status:'saved',catalogReset:false});expect(state.rabbits).toEqual(fixture.rabbits);expect(state.hearts).toBe(fixture.hearts);expect(JSON.parse(data.get(SAVE_KEY)!).version).toBe(17);first.dispose();
  const second=new GameController(storage,()=>fixture.lastSimulatedAt);expect(second.getSnapshot().state).toEqual(state);second.dispose();
 });
 it('pays herbs, never XP, for duplicate releases and retains both refusal rules',()=>{
  const busy=migrated();expect(act(busy,{type:'release',id:'rabbit-6'},busy.lastSimulatedAt)).toMatchObject({ok:false,reason:'PARENT_BUSY'});
  for(const rarity of ['common','rare'] as const){const s=migrated();s.buildings.find(b=>b.kind==='nest')!.breeding=null;if(rarity==='rare'){s.rabbits.forEach(r=>r.species='frisket');s.discovered.push('frisket');}
   const r=act(s,{type:'release',id:'rabbit-6'},s.lastSimulatedAt);expect(r.ok).toBe(true);expect(r.state.grass).toBe(s.grass+(rarity==='common'?10:25));expect(r.state.progression).toEqual(s.progression);expect(r.ok && r.progressionGain).toBeUndefined();expect(act(r.state,{type:'release',id:'rabbit-2'},s.lastSimulatedAt)).toMatchObject({ok:false,reason:'LAST_OF_SPECIES'});
  }
 });
 it('can complete the breeding daily when all individuals have affection 20',()=>{
  const s=migrated();s.buildings.find(b=>b.kind==='nest')!.breeding=null;s.rabbits.forEach(r=>r.affection=20);s.missions.daily.progress['gain-affection']=0;s.missions.daily.claimed=[];
  const r=act(s,{type:'breed',parents:['rabbit-2','rabbit-6']},s.lastSimulatedAt,()=>0);expect(r.ok).toBe(true);expect(r.state.missions.daily.progress['gain-affection']).toBe(1);
 });
 it('uses integer hourly income by rarity, including the provisional special-species fallback',()=>{
  for(const species of ['paille','neige','feu','belier-gris','volant'] as const)expect([rabbitIncome(1,species),rabbitIncome(20,species)]).toEqual([10,29]);
  for(const species of ['frisket','lunettes','magicien','dragon','rare'] as const)expect([rabbitIncome(1,species),rabbitIncome(20,species)]).toEqual([14,33]);
 });
});
