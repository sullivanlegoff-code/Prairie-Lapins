import {cumulativeLevelXp,requiredExtensionLevel} from '../src/simulation/progression';
import {regressionStart as createGame} from './regression-start';
import {describe,it,expect} from 'vitest';
import {act,decodeGame,encodeGame} from '../src/simulation';
import {buildingPlacementReason,buildingFootprint,overlaps} from '../src/simulation/placement';
import {decorationPlacementReason} from '../src/simulation/decorations';
import {scenarioState} from '../src/dev/scenarios';
import type {Command,GameState} from '../src/state/types';
const run=(s:GameState,c:Command)=>{const r=act(s,c,s.lastSimulatedAt);if(!r.ok)throw Error(r.reason);return r.state;};
function rich(){const s=createGame(0);const level=requiredExtensionLevel(2);s.progression={totalXp:cumulativeLevelXp(level),rewardedThroughLevel:level};s.pattes=10000;s.buildings[0].x=26;s.buildings[0].y=28;return s;}
function decoration(s:GameState,x:number,y:number){s=run(s,{type:'buyDecoration',catalogId:'wildflowers'});return run(s,{type:'placeDecoration',id:s.decorations.at(-1)!.id,location:{kind:'outside',x,y,rotation:0}});}
describe('fine building footprints v7',()=>{
 it.each(['enclosure','farm','nest','nursery','kitchen'] as const)('buys and moves %s by one fine square across old coarse boundaries',kind=>{
  let s=rich();const before=s.pattes;s=run(s,kind==='nest'||kind==='nursery'?{type:'placeStarterBuilding',kind,x:19,y:22}:{type:'buyBuilding',kind,x:19,y:22});const b=s.buildings.at(-1)!;
  expect(b).toMatchObject({kind,x:19,y:22});if(kind==='nest'||kind==='nursery')expect(s.pattes).toBe(before);else expect(s.pattes).toBeLessThan(before);
  const payload=structuredClone(b),rabbits=structuredClone(s.rabbits),money=s.pattes;
  s=run(s,{type:'moveBuilding',id:b.id,x:20,y:22});s=run(s,{type:'moveBuilding',id:b.id,x:20,y:23});
  expect(s.buildings.at(-1)).toEqual({...payload,x:20,y:23});expect(s.rabbits).toEqual(rabbits);expect(s.pattes).toBe(money);
  expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
 });
 it('requires every fine square to be acquired, including both sides of a parcel boundary',()=>{
  let s=rich();expect(buildingPlacementReason(s,30,21)).toBe('INVALID_CELL');
  s=run(s,{type:'expand',parcelId:'east',expectedCost:500});s=run(s,{type:'buyBuilding',kind:'farm',x:30,y:21});
  expect(s.buildings.at(-1)).toMatchObject({x:30,y:21});expect(buildingPlacementReason(s,19,14)).toBe('INVALID_CELL');
  s=run(s,{type:'expand',parcelId:'north',expectedCost:1000});expect(buildingPlacementReason(s,19,14)).toBeNull();
  expect(buildingPlacementReason(s,46,21)).toBe('INVALID_CELL');expect(buildingPlacementReason(s,19,-1)).toBe('INVALID_CELL');
 });
 it('allows edge contact and excludes only the moving building, including its old overlap',()=>{
  let s=run(rich(),{type:'buyBuilding',kind:'farm',x:18,y:20});s=run(s,{type: 'placeStarterBuilding',kind:'nest',x:22,y:20});
  const farm=s.buildings.find(b=>b.kind==='farm')!;
  expect(buildingPlacementReason(s,18,21,farm.id)).toBeNull();expect(buildingPlacementReason(s,19,20,farm.id)).toBe('CELL_OCCUPIED');
  expect(buildingPlacementReason(s,18,20)).toBe('CELL_OCCUPIED');expect(buildingPlacementReason(s,18,20,'absent')).toBe('NOT_FOUND');
  expect(overlaps(buildingFootprint({x:18,y:20}),buildingFootprint({x:22,y:20}))).toBe(false);
 });
 it('blocks reciprocal building/decoration overlaps and allows their edge contact',()=>{
  let s=decoration(rich(),22,22),id=s.decorations[0].id;expect(buildingPlacementReason(s,19,22)).toBe('DECORATION_BLOCKS_BUILDING');
  expect(buildingPlacementReason(s,18,22)).toBeNull();s=run(s,{type:'buyBuilding',kind:'farm',x:18,y:22});
  expect(decorationPlacementReason(s,id,{kind:'outside',x:21,y:22,rotation:0})).toBe('CELL_OCCUPIED');
  expect(decorationPlacementReason(s,id,{kind:'outside',x:22,y:22,rotation:0})).toBeNull();
  const before=structuredClone(s);expect(act(s,{type:'moveBuilding',id:s.buildings.at(-1)!.id,x:19,y:22},0)).toMatchObject({ok:false,reason:'DECORATION_BLOCKS_BUILDING',state:before});expect(s).toEqual(before);
 });
 it('checks destination only, without requiring a route around obstacles',()=>{
  let s=rich();s.acquiredParcels.push('east');s=run(s,{type:'buyBuilding',kind:'farm',x:34,y:20});s=run(s,{type: 'placeStarterBuilding',kind:'nest',x:26,y:20});
  const farm=s.buildings.find(b=>b.kind==='farm')!;s=run(s,{type:'moveBuilding',id:farm.id,x:19,y:20});expect(s.buildings.find(b=>b.id===farm.id)).toMatchObject({x:19,y:20});
 });
 it.each([[19.5,22],[19,22.5],[NaN,22],[Infinity,22],[-1,22],[48,22]])('refuses invalid fine destination %j without paying or moving', (x,y)=>{
  const s=rich(),before=structuredClone(s);expect(act(s,{type:'buyBuilding',kind:'farm',x,y},0)).toMatchObject({ok:false,reason:'INVALID_CELL',state:before});expect(s).toEqual(before);
 });
 it('keeps occupants, work and income when moving; the lab presents all four kinds and a border crossing',()=>{
  let s=scenarioState('fineBuildings',0);const old=structuredClone(s),farm=s.buildings.find(b=>b.kind==='farm')!;
  expect(old.rabbits.filter(r=>r.enclosureId==='building-1')).toHaveLength(7);expect(farm.order).not.toBeNull();
  s=run(s,{type:'moveBuilding',id:farm.id,x:31,y:23});expect(s.buildings.find(b=>b.id===farm.id)).toEqual({...farm,x:31,y:23});
  s=run(s,{type:'moveBuilding',id:'building-1',x:18,y:22});expect(s.rabbits).toEqual(old.rabbits);expect(s.buildings[0]).toEqual({...old.buildings[0],x:18,y:22});
 });
});
describe('imported saves keep the fine building footprints',()=>{
 it('rejects overlaps and unacquired extents in imported saves',()=>{
  const s=rich();s.buildings.push({...s.buildings[0],id:'building-4',x:27,y:28});s.nextId=5;
  expect(decodeGame(JSON.stringify(s))).toEqual({ok:false,reason:'INVALID_STATE'});s.buildings[1].x=31;s.buildings[1].y=20;expect(decodeGame(JSON.stringify(s))).toEqual({ok:false,reason:'INVALID_STATE'});
 });
});
