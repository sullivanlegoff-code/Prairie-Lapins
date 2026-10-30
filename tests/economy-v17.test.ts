import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {rabbitIncome} from '../src/simulation/time';
import {describe,it,expect} from 'vitest';
import fixture from './fixtures/economy-v16.json';
import {decodeGame,encodeGame} from '../src/persistence/json';
import {act,advance} from '../src/simulation';
import {emptyDailyProgress} from '../src/simulation/missions';
import {cumulativeLevelXp,progressionFromXp,nextLevelCost} from '../src/simulation/progression';
import {PROGRESSION} from '../src/config/progression';
import {GUARANTEE_SPECIES,HOUR,ORDERS,RARE_INCOME_BONUS_SPECIES,SPECIES,SPECIES_IDS} from '../src/config/balance';
import {habitatLevel,habitatPrice,HABITAT_CAPS,HABITAT_TYPES} from '../src/config/habitats';
function migrated(raw:unknown=fixture){const d=decodeGame(JSON.stringify(raw));expect(d.ok).toBe(true);if(!d.ok)throw Error(d.reason);return d.state;}
describe('v16 → v17 economy migration (fixture encoded by the actual v16 writer)',()=>{
 it('preserves balances, individuals, stored income and exact pending births without a draw',()=>{
  const s=migrated();expect(s.version).toBe(21);for(const key of ['pattes','grass','hearts','rabbits','discovered','recipeBook','lastSimulatedAt','nextId','nextHeartGiftAt'] as const)expect(s[key]).toEqual(fixture[key]);
  expect(s.buildings.map(b=>({...b,order:null}))).toEqual(fixture.buildings.map(b=>({...b,...(b.kind==='farm'?{farmLevel:2}:{}),order:null})));expect(s.pityFailures).toBe(7);
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
 it('still refuses versions 1–15, invalid v16 and future versions',()=>{for(let version=1;version<=15;version++)expect(decodeGame(JSON.stringify({version}))).toEqual({ok:false,reason:'INCOMPATIBLE_CATALOG'});expect(decodeGame('{"version":16}')).toEqual({ok:false,reason:'INVALID_STATE'});expect(decodeGame('{"version":22}')).toEqual({ok:false,reason:'UNSUPPORTED_VERSION'});});
});
describe('economy invariants',()=>{
 it('stores less in the first habitats at levels 1 and 2 (universal follows Vol), the same maximum at level 3',()=>{const order=['paille','neige','feu','metal','vol'] as const;for(const level of [1,2] as const){const caps=order.map(t=>habitatLevel(t,level).cap);for(let i=1;i<caps.length;i++)expect(caps[i]).toBeGreaterThan(caps[i-1]);expect(habitatLevel('universal',level).cap).toBe(habitatLevel('vol',level).cap);}expect(new Set(HABITAT_TYPES.map(t=>habitatLevel(t,3).cap))).toEqual(new Set([HABITAT_CAPS[3].paille]));expect(habitatLevel('vol',2).cap).toBeLessThan(habitatLevel('paille',3).cap);for(const type of HABITAT_TYPES)for(const level of [1,2,3] as const){const h=habitatLevel(type,level);expect(Number.isSafeInteger(h.cap)&&h.cap>0).toBe(true);if(level===2)expect(h.cost).toBe(habitatPrice(type)/2);}});
 it('guarantees all 20 ordinary rares and excludes specials',()=>{expect(GUARANTEE_SPECIES).toHaveLength(20);expect(GUARANTEE_SPECIES).not.toContain('dragon');expect(GUARANTEE_SPECIES).not.toContain('magicien');});
 it('accumulates gifts up to three and keeps the next clock boundary',()=>{const s=migrated();for(const days of [1,2,3,10]){const now=s.nextHeartGiftAt+(days-1)*24*HOUR+HOUR;const r=act(s,{type:'claimHearts'},now);expect(r.ok).toBe(true);expect(r.state.hearts).toBe(s.hearts+Math.min(3,days)*2);expect(r.state.nextHeartGiftAt).toBe(now+23*HOUR);expect(advance(r.state,now).hearts).toBe(r.state.hearts);}});
 it('has ten crops, from short visits to the night',()=>{expect(Object.keys(ORDERS)).toEqual(['foin','pissenlit','trefle','persil','laitue','fanes','fenouil','pomme','fraise','banane']);expect(ORDERS.foin).toMatchObject({cost:10,grass:20,duration:5*60000});expect(ORDERS.banane).toMatchObject({level:19,duration:10*HOUR});});
});

describe('persistent economy transactions',()=>{
 it('loads and rewrites a real v16 through the controller, with no reset or extra Hearts on repeated loads',()=>{
  const data=new Map([[SAVE_KEY,JSON.stringify(fixture)]]),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};
  const first=new GameController(storage,()=>fixture.lastSimulatedAt),state=first.getSnapshot().state!;
  expect(first.getSnapshot()).toMatchObject({status:'saved',catalogReset:false});expect(state.rabbits).toEqual(fixture.rabbits);expect(state.hearts).toBe(fixture.hearts);expect(JSON.parse(data.get(SAVE_KEY)!).version).toBe(21);first.dispose();
  const second=new GameController(storage,()=>fixture.lastSimulatedAt);expect(second.getSnapshot().state).toEqual(state);second.dispose();
 });
 it('pays herbs, never XP, for duplicate releases and retains both refusal rules',()=>{
  const busy=migrated();expect(act(busy,{type:'release',id:'rabbit-6'},busy.lastSimulatedAt)).toMatchObject({ok:false,reason:'PARENT_BUSY'});
  for(const rarity of ['common','rare'] as const){const s=migrated();s.buildings.find(b=>b.kind==='nest')!.breeding=null;if(rarity==='rare'){s.rabbits.forEach(r=>r.species='frisket');s.discovered.push('frisket');}
   const r=act(s,{type:'release',id:'rabbit-6'},s.lastSimulatedAt);expect(r.ok).toBe(true);expect(r.state.grass).toBe(s.grass+(rarity==='common'?10:25));expect(r.state.progression).toEqual(s.progression);expect(r.ok && r.progressionGain).toBeUndefined();expect(act(r.state,{type:'release',id:'rabbit-2'},s.lastSimulatedAt)).toMatchObject({ok:false,reason:'LAST_OF_SPECIES'});
  }
 });
 it('can complete the breeding daily when all individuals have affection 20',()=>{
  const s=migrated();s.buildings.find(b=>b.kind==='nest')!.breeding=null;s.rabbits.forEach(r=>r.affection=20);s.missions.daily.progress={...emptyDailyProgress()};s.missions.daily.claimed=[];delete s.missions.daily.nextAt;
  // A valid mixed pair keeps the daily test independent of the new refusal for two identical Commons.
  s.rabbits[1].species='frisket';s.discovered.push('frisket');
  const r=act(s,{type:'breed',parents:['rabbit-2','rabbit-6']},s.lastSimulatedAt,()=>0);expect(r.ok).toBe(true);expect(r.state.missions.daily.progress['gain-affection']).toBe(1);
 });
 it('uses integer hourly income by rarity: each rare has its own roll, epics and legendaries multiply it',()=>{
  for(const species of ['paille','neige','feu','belier-gris','volant'] as const)expect([rabbitIncome(1,species),rabbitIncome(20,species)]).toEqual([10,29]);
  // Rares: each has a saved individual roll from 0 to 9999 (docs/economy-current.md): 10 to 20 coins/h at affection 1, 70 to 100 at affection 10.
  for(const id of SPECIES_IDS.filter(id=>SPECIES[id].rarity==='rare'))expect([rabbitIncome(1,id,0),rabbitIncome(1,id,9999),rabbitIncome(10,id,0),rabbitIncome(10,id,9999)]).toEqual([10,20,70,100]);
  // Epics earn 1.3 times and legendaries 1.5 times the rare reference.
  expect([rabbitIncome(1,'magicien',0),rabbitIncome(1,'magicien',9999)]).toEqual([13,26]);expect([rabbitIncome(1,'dragon',0),rabbitIncome(1,'dragon',9999)]).toEqual([15,30]);
  const rares=SPECIES_IDS.filter(id=>SPECIES[id].rarity==='rare');expect(rares).toHaveLength(20);expect(RARE_INCOME_BONUS_SPECIES).toEqual([]);
 });
});
