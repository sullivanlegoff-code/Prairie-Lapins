import {describe,it,expect,vi,afterEach} from 'vitest';
import {SPECIES,MINUTE,type SpeciesId} from '../src/config/balance';
import {breedingWeights,breedingOdds,breedingPool,chooseBirth} from '../src/simulation/breeding';
import * as progressionQueries from '../src/simulation/progression';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {act,advance,encodeGame,decodeGame} from '../src/simulation';
import {recipeBook,oddsView} from '../src/ui/models';
import {regressionStart} from './regression-start';
import {sendToNursery} from './manual-transfer';
import {stateBaby,welcomeOf} from './nursery-baby';
const original=SPECIES.boudinet;
afterEach(()=>{SPECIES.boudinet=original;});
function prepared(){const s=regressionStart(0);s.rabbits.forEach(r=>r.affection=2);for(const [kind,x]of [['nest',22],['nursery',26]]as const){const r=act(s,{type:'placeStarterBuilding',kind,x,y:20},0);if(!r.ok)throw Error(r.reason);Object.assign(s,r.state);}return s;}
describe('exact starting element-union pool',()=>{
 it.each([['paille','neige'],['neige','paille'],['frisket','paille']]as const)('%s x %s stays Rare-only and guarantees a missing Rare after seven failures',(a,b)=>{
  expect(breedingWeights(a,b,2,2)).toEqual({frisket:30,icy:30});expect(breedingOdds(a,b,2,2)).toEqual({frisket:50,icy:50});
  const s=prepared();expect(breedingPool(s,a,b,2,2)).toMatchObject({missing:['frisket','icy'],eligible:true,guaranteed:false});
  expect(chooseBirth(s,a,b,0,2,2)).toMatchObject({species:'frisket',reservedDiscovery:true,pityFailures:0});
  s.discovered.push('frisket');s.pityFailures=7;expect(breedingPool(s,a,b,2,2)).toMatchObject({weights:{icy:1},total:1,guaranteed:true});
  expect(chooseBirth(s,a,b,0,2,2)).toMatchObject({species:'icy',guaranteed:true,reservedDiscovery:true});
 });
 it('has no fallback below affection 2 and rejects the action atomically without drawing',()=>{
  for(const [x,y]of [[1,2],[2,1],[1,1]]){expect(breedingWeights('paille','neige',x,y)).toEqual({});const s=prepared();s.rabbits[0].affection=x;s.rabbits[1].affection=y;const before=encodeGame(s),rng=vi.fn(()=>0);expect(act(s,{type:'breed',parents:['rabbit-2','rabbit-3']},0,rng).ok).toBe(false);expect(encodeGame(s)).toBe(before);expect(rng).not.toHaveBeenCalled();}
 });
 it('uses catalogue requirements and rarity, not a closed result list',()=>{
  const recipe={requiredTypes:['paille','neige']as ('paille'|'neige')[],minAffection:3};
  SPECIES.boudinet={...original,types:['paille','neige'],recipe,acquisition:[{kind:'recipe',...recipe},{kind:'historical-breeding'}]};
  expect(breedingWeights('paille','neige',2,2)).toEqual({frisket:30,icy:30});
  expect(breedingWeights('paille','neige',3,3)).toEqual({boudinet:30,frisket:30,icy:30});
  SPECIES.boudinet={...SPECIES.boudinet,rarity:'uncommon'};expect(breedingWeights('paille','neige',3,3)).toEqual({frisket:30,icy:30});
 });
 it('keeps result level filtering effective after pool selection',()=>{
  const s=prepared(),levels: Partial<Record<SpeciesId,number>>={};
  const required=progressionQueries.requiredSpeciesLevel;
  const query=vi.spyOn(progressionQueries,'requiredSpeciesLevel').mockImplementation((id,c)=>levels[id]??required(id,c));
  try {
   levels.frisket=6;
   expect(breedingPool(s,'paille','neige')).toMatchObject({weights:{icy:30},total:30,excluded:[{species:'frisket',requiredLevel:6}]});
   levels.icy=6;
   expect(breedingPool(s,'paille','neige')).toMatchObject({weights:{},total:0});
   expect(()=>chooseBirth(s,'paille','neige',0)).toThrow('No admissible breeding result');
  } finally {query.mockRestore();}
 });
 it('keeps third-element historical pools and their guarantee',()=>{
  // Paille x Feu Glacé: union feu,neige,paille, no special policy; raw weights 40 for the Commons, 20 for each admissible recipe.
  expect(Object.entries(breedingWeights('paille','glassofeu',2,2))).toEqual([['paille',30],['neige',30],['feu',30],['frisket',30],['icy',30],['ardent',30],['snk',30],['wat-wat',30],['glassofeu',30]]);
  const s=prepared();s.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};s.discovered.push('glassofeu');s.pityFailures=7;
  expect(breedingPool(s,'paille','glassofeu',4,4)).toMatchObject({weights:{frisket:1,icy:1,ardent:1,snk:1,'wat-wat':1},guaranteed:true});
 });
 it('shares the pool with preview and known book pairs without granting unknown recipes',()=>{
  const s=prepared();expect(recipeBook(s,0).find(r=>r.species==='boudinet')!.pairs).toEqual([]);
  expect(recipeBook(s,0).find(r=>r.species==='frisket')).toMatchObject({known:false,pairs:[]});
  expect(oddsView(s,'paille','neige')).toMatchObject({entries:[],unknown:{weight:100}});
  s.recipeBook.push('frisket','icy');for(const id of ['frisket','icy'])expect(recipeBook(s,0).find(r=>r.species===id)!.pairs).toMatchObject([{possible:true,probability:'50 %'}]);
 });
 it.each(['paille','boudinet']as const)('preserves a previously drawn %s through loading, transfer, growth and welcome',id=>{
  let s=prepared();const r=act(s,{type:'breed',parents:['rabbit-2','rabbit-3']},0,()=>0);if(!r.ok)throw Error(r.reason);s=r.state;
  const birth=s.buildings.find(b=>b.breeding)!.breeding!.birth;birth.species=id;birth.reservedDiscovery=id==='boudinet';
  const load=()=>{const d=decodeGame(encodeGame(s));expect(d.ok).toBe(true);if(!d.ok)throw Error(d.reason);expect(d.state).toEqual(s);s=d.state;};load();expect(s.buildings.find(b=>b.breeding)!.breeding!.birth).toEqual(birth);
  s=sendToNursery(advance(s,20*MINUTE));load();expect(stateBaby(s)!.birth).toEqual(birth);s=advance(s,stateBaby(s)!.readyAt);load();const welcome=act(s,welcomeOf(s,'building-1'),s.lastSimulatedAt);expect(welcome.ok).toBe(true);if(welcome.ok){s=welcome.state;expect(s.rabbits.at(-1)!.species).toBe(id);load();}
 });
});
