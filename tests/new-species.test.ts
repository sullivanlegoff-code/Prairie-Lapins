import {cumulativeLevelXp} from '../src/simulation/progression';
import {sendToNursery} from './manual-transfer';
import {regressionStart as legacyGame} from './regression-start';
import {describe, expect, it, vi} from 'vitest';
import {recipeOf} from '../src/config/species';
import {GUARANTEE_SPECIES, MINUTE, SPECIES, SPECIES_IDS, growthDuration, type SpeciesId} from '../src/config/balance';
import {commonResultAllowed, breedingOdds, breedingPool, chooseBirth, recipeMatches} from '../src/simulation/breeding';
import {act, advance,  decodeGame, encodeGame, pendingDiscoveries, rabbitIncome} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {collectionView, oddsView, recipeBook, nurseryView} from '../src/ui/models';
import {knowEveryResult, knowRecipes} from './recipe-knowledge';
import {habitatEntryReason} from '../src/simulation/habitats';
import {scenarioState} from '../src/dev/scenarios';
import type {GameState, Command} from '../src/state/types';
import {stateBaby, welcomeOf} from './nursery-baby';
import {EXPECTED_IDS} from './rabbit-art-fixtures';
// Isolate recipe/economy rules; active low-level filtering is covered in level-gates.test.ts.
function createGame(now=0){const s=legacyGame(now);s.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};return s;}
const rows = [
 ['bouee', 'belier-gris', 'feu', 2, 30],
 ['magicien', 'paille', 'belier-gris', 6, 180], ['dragon', 'dadi', 'phoenix', 10, 720],
] as const;
function run(s: GameState, command: Command, now=s.lastSimulatedAt, roll=.999) {
 const result=act(s,command,now,()=>roll); if(!result.ok)throw Error(result.reason);return result.state;
}
function couple(a: SpeciesId,b: SpeciesId,level:number) {
 let s=createGame(0);s.pattes=2000;s.grass=1000;s.rabbits[0].species=a;s.rabbits[1].species=b;
 s.rabbits.forEach(r=>r.affection=level);s.discovered=[...new Set([a,b])];
 s=run(s,{type: 'placeStarterBuilding',kind:'nest',x: 22, y: 20});return run(s,{type: 'placeStarterBuilding',kind:'nursery',x: 26, y: 20});
}
const breed:Command={type:'breed',parents:['rabbit-2','rabbit-3']};
describe('approved three-species rules',()=>{
 it.each(rows)('%s is gated per parent, not the breeding action, and is not purchasable',(id,a,b,level,minutes)=>{
  expect(SPECIES[id].price).toBeNull();expect(growthDuration(id)).toBe(minutes*MINUTE);
  expect(breedingOdds(a,b,level,level-1)[id]).toBeUndefined();expect(breedingOdds(a,b,level,level)[id]).toBeGreaterThan(0);
  const low=couple(a,b,2),before=structuredClone(low);const result=act(low,breed,0,()=>0);expect(result.ok).toBe(true);
  if(result.ok){expect(result.state.pattes).toBe(low.pattes);expect(result.state.buildings.find(x=>x.breeding)!.breeding!.birth.species).not.toBe(id)}
  expect(low).toEqual(before);expect(act(low,{type:'buyRabbit',species:id,enclosureId:'building-1'},0)).toMatchObject({ok:false,reason:'INVALID_CHOICE',state:low});
  expect(SPECIES[id].art.kind).toBe('static-sprite');
 });
 it('matches the three approved distributions exactly',()=>{
  // Different-type Common parents give only the Rares of the union and eligible specials.
  expect(breedingOdds('paille','feu',4,4)).toEqual({ardent:50,snk:50});
  expect(breedingOdds('paille','belier-gris',6,6)).toEqual({roukette:45,boudinet:45,magicien:10});
  // Dadi (Feu-Metal since 27 October) x Phoenix at affection 10: six ordinary results share 59,5 %, with fixed specials 10,5 %, 15 %, 15 % (10 % and 7 % chances, bonus x1,5 at affection 10).
  const pair=breedingOdds('dadi','phoenix',10,10);expect(pair).toMatchObject({dragon:10.5,dadi:15,dinono:15});
  // A mixed pair gives no Common result: feu, belier-gris and volant are absent from the pool.
  for(const id of ['feu','belier-gris','volant'] as const)expect(pair[id]).toBeUndefined();
  for(const id of ['bouee','egiiipte','piment','bretonette','phoenix','amethyste'] as const)expect(pair[id]).toBeCloseTo(59.5/6,10);
  expect(Object.keys(pair)).toHaveLength(9);
 });
 it('reserves a special once and allocates exactly the remainder to ordinary results',()=>{
  const odds=breedingOdds('magicien','belier-gris',6,6);expect(odds.magicien).toBe(10);
  expect(Object.entries(odds).filter(([id])=>id!=='magicien').reduce((n,[,p])=>n+p,0)).toBeCloseTo(90,10);
  const dragon=breedingOdds('dadi','phoenix',10,10);expect(dragon.dragon).toBe(10.5);
  expect(Object.entries(dragon).filter(([id])=>id!=='dragon').reduce((n,[,p])=>n+p,0)).toBeCloseTo(89.5,10);
 });
 it('still reserves simultaneous specials once each, with a synthetic second special',()=>{
  const original=SPECIES.boudinet;
  try {
   const acquisition=[{kind:'recipe' as const,requiredTypes:['metal','paille'] as ('metal'|'paille')[],minAffection:6,probability:3}];
   SPECIES.boudinet={...original,acquisition,recipe:recipeOf(acquisition)};
   const odds=breedingOdds('paille','belier-gris',6,6);expect(odds.magicien).toBe(10);expect(odds.boudinet).toBe(3);
   expect(Object.entries(odds).filter(([id])=>!['boudinet','magicien'].includes(id)).reduce((n,[,p])=>n+p,0)).toBeCloseTo(87,10);
  } finally {SPECIES.boudinet=original;}
 });
 it('requires exact Dragon species in either order, regardless of other type-compatible unions',()=>{
  expect(recipeMatches('dragon','dadi','phoenix')).toBe(true);expect(recipeMatches('dragon','phoenix','dadi')).toBe(true);
  for(const [a,b]of [['volant','feu'],['dadi','dadi'],['maxou','phoenix'],['dadi','piment'],['phoenix','feu']]as const){expect(breedingOdds(a,b,20,20).dragon).toBeUndefined();expect(recipeMatches('dragon',a,b)).toBe(false)}
  const s=couple('dadi','phoenix',10);expect(act(s,{type:'breed',parents:['rabbit-2','rabbit-2']},0)).toMatchObject({ok:false,reason:'SAME_PARENT',state:s});
 });
 it('checks symmetry, normalization, eligibility and actual midpoint draws for every pair at threshold boundaries',()=>{
  for(let i=0;i<SPECIES_IDS.length;i++)for(let j=i;j<SPECIES_IDS.length;j++)for(const levels of [[2,2],[4,3],[4,4],[6,5],[6,6],[10,9],[10,10],[20,20]]){
   const a=SPECIES_IDS[i],b=SPECIES_IDS[j],[x,y]=levels,s=createGame(0),pool=breedingPool(s,a,b,x,y);
   expect(pool.weights).toEqual(breedingPool(s,b,a,y,x).weights);expect(Object.values(breedingOdds(a,b,x,y)).reduce((n,p)=>n+p,0)).toBeCloseTo(100,12);
   if(!commonResultAllowed(a,b))expect(Object.keys(pool.weights).every(id=>SPECIES[id as SpeciesId].rarity!=='common')).toBe(true);
   let cursor=0;for(const [id,w]of Object.entries(pool.weights)){expect(chooseBirth(s,a,b,(cursor+w/2)/pool.total,x,y).species).toBe(id);cursor+=w}
  }
 },30000);
});
describe('ordinary guarantee excludes epic and legendary discoveries',()=>{
 it('keeps Bouee in the guarantee and Dinono outside it',()=>{
  expect(GUARANTEE_SPECIES).toEqual(["frisket","icy","ardent","snk","pic-pic","amethyste","princesse-neige","fluffy","virvoletant","phoenix","roukette","wat-wat","glassofeu","plume","boudinet","bouee","egiiipte","piment","tunini","bretonette"]);
  const s=couple('belier-gris','feu',4);s.discovered.push('amethyste');s.pityFailures=7;expect(chooseBirth(s,'belier-gris','feu',.999,4,4)).toMatchObject({"species":"bouee","guaranteed":true,"reservedDiscovery":true,"pityFailures":0});
 });
 it('guarantee entirely replaces special and ordinary draws',()=>{
  const s=couple('magicien','paille',6);s.discovered.push('roukette');s.pityFailures=7;const p=breedingPool(s,'magicien','paille',6,6);
  expect(p.weights).toEqual({boudinet:1});for(const roll of [0,.5,.999])expect(chooseBirth(s,'magicien','paille',roll,6,6)).toMatchObject({"species":"boudinet","guaranteed":true});
 });
 it('epic birth and welcome count as an eligible failure and do not reset the ordinary counter',()=>{
  let s=couple('magicien','paille',6);s.pityFailures=3;s=run(s,breed);
  expect(s.pityFailures).toBe(4);expect(s.buildings.find(b=>b.breeding)!.breeding!.birth).toMatchObject({species:'magicien',guaranteed:false,reservedDiscovery:false});expect(pendingDiscoveries(s)).toEqual([]);
  const magicienNest=growthDuration('magicien');s=sendToNursery(s,magicienNest);s=run(s, welcomeOf(s, 'building-1'),2*growthDuration('magicien'));expect(s.discovered).toContain('magicien');expect(s.pityFailures).toBe(4);
 });
 it('does not count a special-only eligible pair, even with a pending ordinary guarantee',()=>{
  const s=couple('paille','belier-gris',6);s.discovered.push('roukette','boudinet');s.pityFailures=7;expect(chooseBirth(s,'paille','belier-gris',.999,6,6)).toMatchObject({species:'magicien',guaranteed:false,reservedDiscovery:false,pityFailures:7});
 });
 it.each(['magicien','dragon']as const)('refuses a forged guarantee reservation for %s',id=>{
  const [_,a,b,level]=rows.find(r=>r[0]===id)!;const s=run(couple(a,b,level),breed);
  s.buildings.find(b=>b.breeding)!.breeding!.birth.reservedDiscovery=true;expect(decodeGame(JSON.stringify(s))).toMatchObject({ok:false});
 });
});
describe('saved births, delays, compatibility and collection',()=>{
 it.each(rows)('%s draws once, stays hidden, grows after transfer, and welcomes at affection one',(id,a,b,level,minutes)=>{
  const nest=growthDuration(id),ready=nest+minutes*MINUTE;const source=couple(a,b,level),rng=vi.fn(()=>id==='bouee' ? .999 : id==='dragon' ? .65 : .999),map=new Map([[SAVE_KEY,encodeGame(source)]]),storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)}};
  const c=new GameController(storage,()=>0,rng);expect(c.perform(breed).ok).toBe(true);expect(rng).toHaveBeenCalledTimes(1);
  const saved=c.getSnapshot().state!,birth=saved.buildings.find(b=>b.breeding)!.breeding!.birth;expect(birth.species).toBe(id);c.dispose();
  const noDraw=vi.fn(()=>0),reload=new GameController(storage,()=>0,noDraw);expect(reload.getSnapshot().state).toEqual(saved);expect(noDraw).not.toHaveBeenCalled();reload.dispose();
  const growing=sendToNursery(advance(saved,nest)),baby=stateBaby(growing)!;expect(baby.birth).toEqual(birth);expect(baby.readyAt-baby.startedAt).toBe(minutes*MINUTE);
  expect(nurseryView(growing,nest).babies).toEqual([{slot: 0, birthId: expect.any(String), stage: 'growing', startedAt: expect.any(Number), readyAt:ready}]);expect(collectionView(growing).filter(e=>e.known).map(e=>e.name)).not.toContain(SPECIES[id].name);
  expect(decodeGame(encodeGame(growing))).toEqual({ok:true,state:growing});
  expect(nurseryView(growing,ready).babies).toMatchObject([{stage:'ready',species:id}]);
  const welcomed=run(growing, welcomeOf(growing, 'building-1'),ready);expect(welcomed.rabbits.at(-1)).toMatchObject({species:id,affection:1});expect(rabbitIncome(1, id, 5000)).toBe({bouee: 15, magicien: 20, dragon: 23}[id]);
 });
 it('starts the full Dragon growth only after an occupied nursery is freed',()=>{
  // In the Dadi x Phoenix pool at affection 10, Dragon holds the draws in [0.595, 0.70) (its 10,5 % after the six ordinary results).
  const dadiNest=growthDuration('dadi'), dragonNest=growthDuration('dragon'), dragonStart=dadiNest+dragonNest;
  let s=sendToNursery(advance(run(couple('dadi','phoenix',10),breed,0,0),dadiNest));s=run(s,breed,s.lastSimulatedAt,.65);s=advance(s,dragonStart);
  expect(s.buildings.find(b=>b.breeding)!.breeding!.birth.species).toBe('dragon');s=run(s, welcomeOf(s, 'building-1'));expect(stateBaby(s)).toBeNull();s=sendToNursery(s);
  expect(stateBaby(s)).toMatchObject({startedAt:dragonStart,readyAt:dragonStart+dragonNest});
 });
 it.each(rows)('%s uses current habitat type compatibility',(id)=>{
  const s=couple('paille','neige',2),home=s.buildings[0];
  for(const type of ['universal','paille','neige','feu','metal','vol']as const){home.habitat!.type=type;expect(habitatEntryReason(s,home,id)).toBe(type==='universal'||SPECIES[id].types.includes(type)?null:'TYPE_INCOMPATIBLE')}
 });
 it('notebook shares actual odds, explains exact parents and suppresses specials under guarantee',()=>{
  const s=knowEveryResult(couple('dadi','phoenix',10)),entry=recipeBook(s,0).find(r=>r.species==='dragon')!;expect(entry.pairs).toHaveLength(1);expect(entry.pairs[0]).toMatchObject({probability:'10,5 %',possible:true,guaranteed:false});
  expect(oddsView(s,'dadi','phoenix',10,10).entries.map(e=>e.probability)).toEqual([...Array(6).fill('119/1200 (≈ 9,92 %)'),'10,5 %','15 %','15 %']);
  const wrong=couple('volant','feu',10);expect(recipeBook(wrong,0).find(r=>r.species==='dragon')!.pairs).toEqual([]);
  const guarantee=knowRecipes(couple('magicien','paille',6));guarantee.pityFailures=9;expect(recipeBook(guarantee,0).find(r=>r.species==='magicien')!.pairs[0]).toMatchObject({probability:'0 %',possible:false});
 });
 it('filters compose by type, rarity and public discoveries without reading pending births',()=>{
  const s=createGame(0);expect(collectionView(s)).toHaveLength(EXPECTED_IDS.length);expect(collectionView(s,{rarity:'epic'})).toHaveLength(6);
  expect(collectionView(s,{rarity:'epic',type:'vol'})).toEqual([{known:false,name:'???'},{known:false,name:'???'}]);expect(collectionView(s,{rarity:'epic',discovery:'known'})).toEqual([]);
  expect(collectionView(s,{type:'paille',discovery:'known'})).toEqual([{known:true,species:'paille',name:'Lapin Paille'}]);
 });
 it('prepares every species and actual parent pairs only in a validated explicit test scenario',()=>{
  const s=scenarioState('collection',0);expect(s.discovered).toHaveLength(EXPECTED_IDS.length);expect(s.rabbits.every(r=>r.affection===10)).toBe(true);expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
  for(const [id]of rows)expect(recipeBook(s,0).find(r=>r.species===id)!.pairs.some(p=>p.possible)).toBe(true);
 });
});
