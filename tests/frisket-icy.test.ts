import {describe, expect, it, vi} from 'vitest';
import {SPECIES, SPECIES_IDS, MINUTE, GUARANTEE_SPECIES, growthDuration} from '../src/config/balance';
import {SPECIES_ENTRIES} from '../src/config/species';
import {validateSpeciesEntries} from '../src/config/validateSpecies';
import {RECIPE_PRICES, GIFTED_RECIPES} from '../src/config/recipes';
import {PROGRESSION} from '../src/config/progression';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {breedingWeights, breedingPool, recipeMatches} from '../src/simulation/breeding';
import {collectionView, nurseryView} from '../src/ui/models';
import {habitatEntryReason} from '../src/simulation/habitats';
import {regressionStart} from './regression-start';
import {sendToNursery} from './manual-transfer';
import {stateBaby} from './nursery-baby';
import type {Command, GameState} from '../src/state/types';
import {EXPECTED_IDS} from './rabbit-art-fixtures';

const descriptions = {
  frisket: 'Lapin très original, uniquement en neige et en branches. Oreilles faites en branches (pas beaucoup de branches), bout des pattes en branches, visage en neige avec les yeux bleu foncé profonds, il a une petite écharpe rouge.',
  icy: 'Lapin avec deux petits nœuds roses dans les cheveux. Les nœuds sont longs et fins. Lapin beige clair.',
};
function run(s:GameState, command:Command, now=0, random=()=>.1) {const r=act(s,command,now,random);if(!r.ok)throw Error(r.reason);return r.state;}
function reload(s:GameState) {const r=decodeGame(encodeGame(s));expect(r.ok).toBe(true);if(!r.ok)throw Error(r.reason);expect(r.state).toEqual(s);return r.state;}
function parents(){let s=regressionStart(0);s.rabbits.forEach(r=>r.affection=2);s=run(s,{type:'placeStarterBuilding',kind:'nest',x:22,y:20});return run(s,{type:'placeStarterBuilding',kind:'nursery',x:26,y:20});}

describe('approved Frisket and Icy content',()=>{
  it('appends only the approved Rares, preserves displayed type order and provides no undecided policies',()=>{
    expect(SPECIES_IDS.slice(7,9)).toEqual(['frisket','icy']);expect(SPECIES_IDS).toEqual(EXPECTED_IDS);
    expect(validateSpeciesEntries(SPECIES_ENTRIES)).toEqual([]);
    for(const [id,types] of [['frisket',['neige','paille']],['icy',['paille','neige']]] as const){
      expect(SPECIES[id]).toMatchObject({name:id==='icy'?'Icy':'Frisket',description:descriptions[id],types,rarity:'rare',price:null,progression:{unlockLevel:1},recipe:{requiredTypes:['paille','neige'],minAffection:2}});
      expect(SPECIES[id].acquisition).toEqual([{kind:'recipe',guaranteeEligible:true,requiredTypes:['paille','neige'],minAffection:2}]);
      expect(RECIPE_PRICES[id]).toBeUndefined();expect(GIFTED_RECIPES).not.toContain(id);expect(GUARANTEE_SPECIES).toContain(id);
      expect(growthDuration(id)).toBe(15*MINUTE);expect(PROGRESSION.xp.birth[SPECIES[id].rarity]).toBe(20);
      expect(SPECIES[id].art).not.toHaveProperty('coat');
      expect(act(parents(),{type:'buyRabbit',species:id,enclosureId:'building-1'},0)).toMatchObject({ok:false,reason:'INVALID_CHOICE'});
    }
  });
  it('uses the permanent Rare-only starting pool before the historical guarantee',()=>{
    const s=parents();expect(breedingWeights('paille','neige',2,2)).toEqual({frisket:30,icy:30});
    expect(breedingPool(s,'paille','neige',2,2)).toMatchObject({total:60,guaranteed:false,missing:['frisket','icy']});
    s.pityFailures=7;expect(breedingPool(s,'paille','neige',2,2)).toMatchObject({weights:{frisket:1,icy:1},total:2,guaranteed:true});
  });
  it.each(['frisket','icy'] as const)('%s matches either parent order and hybrid contributions, but not missing elements or affection',id=>{
    for(const [a,b] of [['paille','neige'],['frisket','paille'],['frisket','frisket'],['boudinet','glassofeu']] as const){
      expect(recipeMatches(id,a,b)).toBe(true);expect(recipeMatches(id,b,a)).toBe(true);
      expect(breedingWeights(a,b,2,2)[id]).toBe(30);expect(breedingWeights(b,a,2,2)[id]).toBe(30);
      expect(breedingWeights(a,b,1,2)[id]).toBeUndefined();expect(breedingWeights(a,b,2,1)[id]).toBeUndefined();
    }
    for(const [a,b]of [['paille','feu'],['neige','volant'],['feu','feu']] as const){expect(recipeMatches(id,a,b)).toBe(false);expect(breedingWeights(a,b,20,20)[id]).toBeUndefined();}
  });
  it.each([['frisket',.25],['icy',.95]] as const)('%s survives breeding, transfer, Rare growth, compatible welcome and reload at every stage', (id,roll)=>{
    const nest=growthDuration(id), ready=nest+growthDuration(id), rng=vi.fn(()=>roll);let s=run(parents(),{type:'breed',parents:['rabbit-2','rabbit-3']},0,rng);const birth=s.buildings.find(b=>b.kind==='nest')!.breeding!.birth;
    expect(birth).toEqual({id:birth.id,species:id,guaranteed:false,reservedDiscovery:true});expect(s.pityFailures).toBe(0);s=reload(s);
    expect(JSON.stringify(collectionView(s))).not.toContain(descriptions[id]);
    s=reload(sendToNursery(advance(s,nest)));expect(stateBaby(s)).toEqual({slot:0,birth,startedAt:nest,readyAt:ready});
    expect(nurseryView(s,nest).babies).toEqual([{slot:0,birthId:birth.id,stage:'growing',startedAt:nest,readyAt:ready}]);
    s=reload(advance(s,ready));const home=s.buildings.find(b=>b.kind==='enclosure')!;
    for(const type of ['paille','neige','universal','feu']as const){home.habitat!.type=type;expect(habitatEntryReason(s,home,id)).toBe(['paille','neige','universal'].includes(type)?null:'TYPE_INCOMPATIBLE');}
    home.habitat!.type='universal';const xp=s.progression.totalXp;
    s=reload(run(s,{type:'welcome',enclosureId:home.id,birthId:birth.id},ready,rng));
    expect(s.rabbits.at(-1)).toMatchObject({species:id,affection:1,enclosureId:home.id});expect(s.discovered).toContain(id);
    expect(s.progression.totalXp-xp).toBe(270);expect(s.pityFailures).toBe(0);expect(rng).toHaveBeenCalledTimes(2); // the breeding draw, then the welcome's own income roll for this Rare (drawIncomeRoll)
    expect(collectionView(s).find(e=>e.known&&e.species===id)).toEqual({known:true,species:id,name:SPECIES[id].name,description:descriptions[id]});
  });
  it('does not invent descriptions for existing species or reveal descriptions from recipe knowledge alone',()=>{
    const s=parents();s.recipeBook.push('frisket','icy');
    expect(JSON.stringify(collectionView(s))).not.toContain(descriptions.frisket);expect(JSON.stringify(collectionView(s))).not.toContain(descriptions.icy);
    // Magicien and Dragon received approved pictures, and with them a description of what they show.
    for(const id of SPECIES_IDS.slice(0,7).filter(id=>id!=='magicien'&&id!=='dragon'))expect(SPECIES[id]).not.toHaveProperty('description');
  });
  it('validates an optional description without accepting blank or non-text content',()=>{
    const original=SPECIES_ENTRIES[0];for(const description of ['', ' ', 42])expect(validateSpeciesEntries([{...original,description}])).toContainEqual(expect.objectContaining({species:'paille',field:'description'}));
  });
});
