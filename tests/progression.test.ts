import {describe,it,expect} from 'vitest';
import {PROGRESSION,type ProgressionConfig} from '../src/config/progression';
import {SPECIES_IDS} from '../src/config/balance';
import {DECORATION_IDS} from '../src/config/decorations';
import {HABITAT_TYPES} from '../src/config/habitats';
import {addXp,cumulativeLevelXp,foodXp,firstDecorationPlacementXp,missionClaimXp,nextLevelCost,progressionFromXp,
  requiredDecorationLevel,requiredExtensionLevel,requiredHabitatLevel,requiredHabitatUpgradeLevel,requiredSpeciesLevel,validateProgressionConfig} from '../src/simulation/progression';
import {HISTORICAL_LEVELS, NEW_RARES, NEW_SPECIALS, STANDARD_RARE} from './rabbit-art-fixtures';
function configure(patch:Partial<ProgressionConfig>={}):ProgressionConfig{return {...structuredClone(PROGRESSION),...patch};}
describe('pure player progression v17',()=>{
 it('starts at one and uses rounded configured transition costs at every boundary',()=>{
  expect(progressionFromXp(0)).toMatchObject({level:1,xpInLevel:0,xpRequired:90});
  for(let n=1;n<30;n++){expect(nextLevelCost(n)).toBe(Math.round(90*n**0.85));const t=cumulativeLevelXp(n+1);expect(progressionFromXp(t).level).toBe(n+1);expect(progressionFromXp(t-1).level).toBe(n);}
 });
 it('crosses several levels exactly once',()=>{const t=cumulativeLevelXp(5),r=addXp(89,t-89);expect(r.progression).toMatchObject({totalXp:t,level:5,xpInLevel:0});expect(r.crossedLevels).toEqual([2,3,4,5]);expect(addXp(t,0).crossedLevels).toEqual([]);});
 it('caps the level and bar, keeps surplus, and recalculates after raising the maximum',()=>{
  const raised=configure({curve:{...PROGRESSION.curve,maximumLevel:40}}),xp=cumulativeLevelXp(31,raised);
  const capped=progressionFromXp(xp);expect(capped).toMatchObject({totalXp:xp,level:30,maximum:true,progress:1,xpRequired:null});
  expect(capped.xpInLevel).toBe(xp-cumulativeLevelXp(30));expect(nextLevelCost(30)).toBeNull();
  expect(addXp(xp,100).crossedLevels).toEqual([]);expect(addXp(xp,100).progression.totalXp).toBe(xp+100);
  expect(progressionFromXp(xp,raised)).toMatchObject({totalXp:xp,level:31,xpInLevel:0,maximum:false});
  expect(addXp(cumulativeLevelXp(29),xp).crossedLevels).toEqual([30]);
 });
 it('changes base/exponent through the configuration while retaining exact safe thresholds',()=>{
  const c=configure({curve:{...PROGRESSION.curve,base:25,exponent:0}});expect(cumulativeLevelXp(30,c)).toBe(725);expect(nextLevelCost(3,c)).toBe(25);
  const fractionalBase=configure({curve:{...PROGRESSION.curve,base:50.5}});expect(nextLevelCost(1,fractionalBase)).toBe(51);
  let previous=0;for(let level=2;level<=30;level++){const threshold=cumulativeLevelXp(level);expect(threshold).toBeGreaterThan(previous);expect(progressionFromXp(threshold).level).toBe(level);previous=threshold;}
 });
 it.each([-1,.5,NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1])('refuses invalid total or added XP %s',bad=>{
  expect(()=>progressionFromXp(bad)).toThrow(RangeError);expect(()=>addXp(bad,0)).toThrow(RangeError);expect(()=>addXp(0,bad)).toThrow(RangeError);
 });
 it('refuses sum overflow and level inputs outside the configuration',()=>{
  expect(progressionFromXp(Number.MAX_SAFE_INTEGER).totalXp).toBe(Number.MAX_SAFE_INTEGER);
  expect(addXp(Number.MAX_SAFE_INTEGER,0).progression.totalXp).toBe(Number.MAX_SAFE_INTEGER);
  expect(()=>addXp(Number.MAX_SAFE_INTEGER,1)).toThrow(RangeError);
  for(const level of [0,-1,1.5,31,NaN,Infinity]){expect(()=>nextLevelCost(level)).toThrow(RangeError);expect(()=>cumulativeLevelXp(level)).toThrow(RangeError);}
 });
 it('rejects invalid costs and overflowing curves before computing progression',()=>{
  for(const curve of [{base:0},{base:-1},{base:.1},{base:NaN},{base:Infinity},{base:Number.MAX_SAFE_INTEGER},
    {exponent:NaN},{exponent:Infinity},{exponent:-1},{exponent:1024},{maximumLevel:0},{maximumLevel:1.5},{maximumLevel:Infinity},{maximumLevel:Number.MAX_SAFE_INTEGER}]){
   const c=configure({curve:{...PROGRESSION.curve,...curve}});expect(()=>validateProgressionConfig(c)).toThrow(RangeError);expect(()=>progressionFromXp(0,c)).toThrow(RangeError);
  }
 });
 it('resolves all existing species, habitats, upgrades, decorative prices and extension ranks',()=>{
  expect(()=>validateProgressionConfig()).not.toThrow();expect(SPECIES_IDS.map(id=>requiredSpeciesLevel(id))).toEqual([...HISTORICAL_LEVELS, ...NEW_RARES.map(() => STANDARD_RARE.unlockLevel), ...NEW_SPECIALS.map(s => s.unlockLevel)]);
  expect(HABITAT_TYPES.map(type=>requiredHabitatLevel(type))).toEqual([6,1,1,5,7,9]);
  expect(requiredHabitatUpgradeLevel('neige',2)).toBe(3);expect(requiredHabitatUpgradeLevel('metal',3)).toBe(12);expect(requiredHabitatUpgradeLevel('universal',3)).toBe(11);
  expect(DECORATION_IDS.map(id=>requiredDecorationLevel(id))).toEqual([1,1,1,2,3,5,6,8,10,12,14,4,22]);
  expect(Array.from({length:8},(_,i)=>requiredExtensionLevel(i+1))).toEqual([4,6,8,10,12,15,18,22]);
  for(const rank of [0,9,1.5,NaN])expect(()=>requiredExtensionLevel(rank)).toThrow(RangeError);
 });
 it('holds the full requested gain schedule with ID exceptions and catalogue-derived decoration gains',()=>{
  expect(PROGRESSION.xp.commonPurchase).toBe(10);expect(PROGRESSION.xp.construction).toEqual({specializedHabitat:30,universalHabitat:40,farm:20});
  expect(PROGRESSION.xp.birth).toEqual({common:10,uncommon:45,rare:20,epic:110,legendary:180});expect(PROGRESSION.xp.breedingLaunch).toBe(5);
  expect(foodXp(0)).toBe(5);expect(foodXp(2)).toBe(5);expect(foodXp(10)).toBe(6);expect(foodXp(15)).toBe(30);expect(foodXp(20)).toBe(18);
  expect(DECORATION_IDS.map(id=>firstDecorationPlacementXp(id))).toEqual(DECORATION_IDS.map(()=>10));
  expect(missionClaimXp('main','first-birth')).toBe(40);expect(missionClaimXp('daily','collect-grass')).toBe(50);expect(PROGRESSION.xp.claims.dailyBonus).toBe(0);
  const c=configure({xp:{...PROGRESSION.xp,claims:{...PROGRESSION.xp.claims,mainExceptions:{'welcome-snow':0},dailyExceptions:{'collect-grass':15}}}});
  expect(missionClaimXp('main','welcome-snow',c)).toBe(0);expect(missionClaimXp('daily','collect-grass',c)).toBe(15);
 });
 it('rejects required levels out of bounds, missing ID mappings, invalid coefficients and tiers',()=>{
  const r=PROGRESSION.requirements,x=PROGRESSION.xp;
  const invalid:ProgressionConfig[]=[
   configure({requirements:{...r,species:{...r.species,dragon:31}}}),configure({requirements:{...r,universalHabitat:0}}),
   configure({requirements:{...r,habitatCommons:{...r.habitatCommons,metal:'volant'}}}),
   configure({requirements:{...r,habitatUpgradeOffsets:{2:2,3:30}}}),configure({requirements:{...r,extensions:[4]}}),
   configure({requirements:{...r,extensions:[4,6,8,10,12,15,18,31]}}),
   configure({requirements:{...r,decorations:[{minimumPrice:0,level:1},{minimumPrice:0,level:3}]}}),
   configure({requirements:{...r,buildings:{...r.buildings,farm:31}}}),
   configure({xp:{...x,commonPurchase:.5}}),configure({xp:{...x,foodMultiplier:Number.MAX_SAFE_INTEGER}}),
   configure({xp:{...x,firstDecorationPlacement:{minimum:2,priceDivisor:0}}}),configure({rewards:{heartsPerLevel:-1}}),
   configure({xp:{...x,claims:{...x.claims,mainExceptions:{'first-birth':-1}}}}),
  ];
  for(const c of invalid)expect(()=>validateProgressionConfig(c)).toThrow(RangeError);
  const missing=configure();Reflect.deleteProperty(missing.requirements.species,'dragon');expect(()=>validateProgressionConfig(missing)).toThrow(RangeError);
 });
});
