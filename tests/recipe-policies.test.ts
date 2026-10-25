import {expect, it} from 'vitest';
import {SPECIES, SPECIES_IDS, recipeOf, type Acquisition} from '../src/config/species';
import {deriveRecipePolicies} from '../src/config/recipePolicies';
import {GIFTED_RECIPES, RECIPE_PRICES} from '../src/config/recipes';
import {GUARANTEE_SPECIES} from '../src/config/balance';
import {validateSpeciesEntries} from '../src/config/validateSpecies';
import {createCentreStartGame} from '../src/state/initial';
import {breedingDistributionWeights, breedingPool} from '../src/simulation/breeding';

it('keeps the independent six prices, no starting gift (Brumelin is gone) and ordered four guarantee entries', () => {
  expect(RECIPE_PRICES).toEqual({bouee:150,'feu-glace':180,lunettes:220,perroquet:250,magicien:450,dragon:900});
  expect(GIFTED_RECIPES).toEqual([]);
  expect(GUARANTEE_SPECIES).toEqual(['lunettes','perroquet','feu-glace','bouee',...SPECIES_IDS.slice(11)]);
  expect(createCentreStartGame(0).recipeBook).toEqual([]);
});
it('derives policies from isolated sources; absence/false grant no policy, zero is a valid sale price', () => {
  const entries: {id: string; acquisition: Acquisition[]}[] = [
    {id:'plain',acquisition:[{kind:'recipe',requiredTypes:['feu'],minAffection:2}]},
    {id:'sold',acquisition:[{kind:'recipe',requiredTypes:['feu'],minAffection:2,knowledgePrice:0,guaranteeEligible:true}]},
    {id:'gift',acquisition:[{kind:'recipe',requiredTypes:['feu'],minAffection:2,giftedAtStart:true,guaranteeEligible:true}]},
    {id:'false-flags',acquisition:[{kind:'recipe',requiredTypes:['feu'],minAffection:2,giftedAtStart:false,guaranteeEligible:false}]},
    {id:'shop',acquisition:[{kind:'shop',price:80}]},
  ];
  const before=structuredClone(entries);
  expect(deriveRecipePolicies(entries)).toEqual({prices:{sold:0},gifted:['gift'],guaranteed:['sold','gift']});
  expect(entries).toEqual(before);
});
it('keeps policy fields out of every compatibility recipe, including special probabilities', () => {
  const source: Acquisition = {kind:'recipe',requiredTypes:['vol','feu'],parents:['perroquet','feu'],minAffection:10,probability:2,knowledgePrice:900,giftedAtStart:false,guaranteeEligible:false};
  expect(recipeOf([source])).toEqual({requiredTypes:['vol','feu'],parents:['perroquet','feu'],minAffection:10,probability:2});
  for(const id of SPECIES_IDS) for(const field of ['knowledgePrice','giftedAtStart','guaranteeEligible'])
    if(SPECIES[id].recipe) expect(SPECIES[id].recipe).not.toHaveProperty(field);
});
it('does not let knowledge policy affect any pair, including historical low affection and a pending guarantee', () => {
  const originals=SPECIES_IDS.map(id=>[id,SPECIES[id].acquisition] as const);
  const distributions=()=>SPECIES_IDS.flatMap(a=>SPECIES_IDS.flatMap(b=>[1,4,10].map(affection=>breedingDistributionWeights(a,b,affection,affection))));
  const before=distributions(),s=createCentreStartGame(0);s.pityFailures=7;
  const guaranteed=breedingPool(s,'paille','neige',2,2);
  try {
    for(const id of SPECIES_IDS) SPECIES[id].acquisition=SPECIES[id].acquisition.map(source=>source.kind==='recipe'?{...source,knowledgePrice:12345,giftedAtStart:false}:source);
    expect(distributions()).toEqual(before);
    expect(breedingPool(s,'paille','neige',2,2)).toEqual(guaranteed);
  } finally {for(const [id,acquisition]of originals) SPECIES[id].acquisition=acquisition;}
});

const fixture=(policy:object)=>({id:'synthetic',name:'Synthetic',rarity:'rare',types:['feu'],progression:{unlockLevel:1},
  art:{kind:'procedural',coat:{body:'#fff',patch:'#123456'}},acquisition:[{kind:'recipe',requiredTypes:['neige'],minAffection:2,...policy}]});
it.each([-1,1.5,NaN,Infinity])('rejects invalid knowledge price %s with a source field diagnostic',knowledgePrice=>{
  expect(validateSpeciesEntries([fixture({knowledgePrice})])).toContainEqual(expect.objectContaining({species:'synthetic',field:'acquisition.0.knowledgePrice'}));
});
it.each([
  [{giftedAtStart:'yes'},'giftedAtStart'], [{guaranteeEligible:1},'guaranteeEligible'],
  [{knowledgePrice:0,giftedAtStart:true},'knowledgePrice'], [{probability:5,guaranteeEligible:true},'guaranteeEligible'],
])('rejects invalid or conflicting policy %j', (policy,field)=>{
  expect(validateSpeciesEntries([fixture(policy)])).toContainEqual(expect.objectContaining({species:'synthetic',field:'acquisition.0.'+field}));
});
it('allows no policies, sold ordinary recipes, gifts, and sold specials outside the guarantee',()=>{
  for(const policy of [{},{knowledgePrice:0,guaranteeEligible:true},{giftedAtStart:true,guaranteeEligible:true},{knowledgePrice:50,probability:5,guaranteeEligible:false,giftedAtStart:false}])
    expect(validateSpeciesEntries([fixture(policy)])).toEqual([]);
});
