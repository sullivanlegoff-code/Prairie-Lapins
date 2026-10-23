import {describe, expect, it} from 'vitest';
import {PROGRESSION, LEVEL_ACCESS_FAMILIES, type ProgressionConfig} from '../src/config/progression';
import {SPECIES_IDS} from '../src/config/balance';
import {HABITAT_TYPES} from '../src/config/habitats';
import {DECORATION_IDS} from '../src/config/decorations';
import {checkLevelAccess, historicalPurchaseLevelRights, newlyAccessibleContents, type LevelAccessTarget} from '../src/simulation/levelAccess';
import {cumulativeLevelXp, validateProgressionConfig} from '../src/simulation/progression';
const inactive: ProgressionConfig={...PROGRESSION,activeLevelFamilies:{species:false,habitatPurchase:false,habitatUpgrade:false,decoration:false,extension:false}};
const active: ProgressionConfig = {...PROGRESSION, activeLevelFamilies: {species:true,habitatPurchase:true,habitatUpgrade:true,decoration:true,extension:true}};
const targets: LevelAccessTarget[] = [
  ...SPECIES_IDS.map(id => ({family:'species', id, action:'purchase'} as const)),
  ...HABITAT_TYPES.flatMap(id => [{family:'habitatPurchase', id} as const, ...([2,3] as const).map(toLevel => ({family:'habitatUpgrade', id, toLevel} as const))]),
  ...DECORATION_IDS.map(id => ({family:'decoration',id} as const)),
  ...Array.from({length:8},(_,i) => ({family:'extension', rank:i+1} as const)),
];
describe('level requirements without active gameplay restrictions', () => {
  it.each(targets)('checks before/at/after $family', target => {
    const required = checkLevelAccess(0,target,[],active).requiredLevel;
    if(required>1) expect(checkLevelAccess(cumulativeLevelXp(required-1),target,[],active).locked).toBe(true);
    for(const level of [required,required+1]) expect(checkLevelAccess(cumulativeLevelXp(level),target,[],active).accessible).toBe(true);
    expect(checkLevelAccess(0,target,[],inactive).accessible).toBe(true);
    expect(checkLevelAccess(0,target,[],inactive).activated).toBe(false);
  });
  it('all five families are activated; an inactive registry announces nothing', () => {
    expect(LEVEL_ACCESS_FAMILIES.filter(f=>PROGRESSION.activeLevelFamilies[f])).toEqual(['species','habitatPurchase','habitatUpgrade','decoration','extension']);
    expect(newlyAccessibleContents(1,30,targets,[],inactive)).toEqual([]);
  });
  it('historical purchases are exact and never grant upgrades, welcome or breeding', () => {
    const rights=historicalPurchaseLevelRights(['feu','universal','feu']);
    expect(rights).toHaveLength(2);
    expect(checkLevelAccess(0,{family:'species',id:'feu',action:'purchase'},rights,active).historicalException?.source).toBe('purchaseUnlocks:feu');
    for(const action of ['welcome','breedingResult'] as const) expect(checkLevelAccess(0,{family:'species',id:'feu',action},rights,active).locked).toBe(true);
    expect(checkLevelAccess(0,{family:'species',id:'volant',action:'purchase'},rights,active).locked).toBe(true);
    expect(checkLevelAccess(0,{family:'habitatPurchase',id:'universal'},rights,active).accessible).toBe(true);
    expect(checkLevelAccess(0,{family:'habitatUpgrade',id:'universal',toLevel:2},rights,active).locked).toBe(true);
  });
  it('groups crossed levels, only enabled families, excludes historical rights, no duplicates', () => {
    const c={...active,activeLevelFamilies:{...inactive.activeLevelFamilies,species:true}};
    const rights=historicalPurchaseLevelRights(['feu']);
    const result=newlyAccessibleContents(1,14,[...targets,...targets],rights,c);
    expect(new Set(result.map(t=>JSON.stringify(t))).size).toBe(result.length);
    expect(result.every(t=>t.family==='species')).toBe(true);
    expect(result).not.toContainEqual({family:'species',id:'feu',action:'purchase'});
    expect(result).toContainEqual({family:'species',id:'dragon',action:'purchase'});
    expect(newlyAccessibleContents(5,5,targets,[],active)).toEqual([]);
  });
  it.each([
    {family:'species',id:'missing',action:'purchase'}, {family:'species',id:'feu',action:'unknown'},
    {family:'habitatPurchase',id:'missing'}, {family:'habitatUpgrade',id:'universal',toLevel:1},
    {family:'decoration',id:'missing'}, ...[0,9,1.5,NaN].map(rank=>({family:'extension',rank})), {family:'unknown'},
  ])('rejects invalid targets even with inactive family: %j', target => {
    expect(()=>checkLevelAccess(0,target as LevelAccessTarget)).toThrow(RangeError);
  });
  it('rejects invalid rights, intervals and registry', () => {
    expect(()=>historicalPurchaseLevelRights(['unknown' as never])).toThrow(RangeError);
    expect(()=>newlyAccessibleContents(2,1,targets)).toThrow(RangeError);
    expect(()=>validateProgressionConfig({...PROGRESSION, activeLevelFamilies:{...PROGRESSION.activeLevelFamilies,species:undefined as never}})).toThrow(RangeError);
    expect(()=>checkLevelAccess(0,targets[0],[{target:targets[0],source:''}])).toThrow(RangeError);
  });
});
