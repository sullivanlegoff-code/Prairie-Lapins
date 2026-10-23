import {expect,it} from 'vitest';
import kitchenPng from '../public/assets/buildings/kitchen-chef-lapin.png?inline';
import {act,decodeGame,encodeGame} from '../src/simulation';
import {buildingAt} from '../src/simulation/placement';
import {KITCHEN_ART} from '../src/config/kitchenArt';
import {ISLAND} from '../src/config/islandGeometry';
import {regressionStart} from './regression-start';

it('persists and locates Cuisine without habitat XP, and rejects duplicate ownership',()=>{
  const before=regressionStart(0);before.pattes=10000;before.buildings[0].x=26;before.buildings[0].y=28;
  const result=act(before,{type:'buyBuilding',kind:'kitchen',x:19,y:22},0);
  expect(result.ok).toBe(true);if(!result.ok)return;
  const s=result.state,b=s.buildings.at(-1)!;
  expect(b).toMatchObject({kind:'kitchen',habitat:null,order:null,breeding:null,nursery:null,incomeUnits:0});
  expect(buildingAt(s,{x:20,y:23})).toEqual(b);expect(s.progression).toEqual(before.progression);
  expect(decodeGame(encodeGame(s))).toEqual({ok:true,state:s});
  expect(act(s,{type:'buyBuilding',kind:'kitchen',x:23,y:22},0)).toMatchObject({ok:false,reason:'BUILDING_LIMIT'});
  const invalid=structuredClone(s);invalid.buildings.push({...b,id:'building-999',x:23,y:22});invalid.nextId=1000;
  expect(decodeGame(JSON.stringify(invalid))).toEqual({ok:false,reason:'INVALID_STATE'});
});

it('uses the Maison du Chef Lapin PNG with alpha, at the size its display constants assume',()=>{
  const png=Uint8Array.from(atob(kitchenPng.split(',')[1]),c=>c.charCodeAt(0)),header=new DataView(png.buffer);
  expect([...png.subarray(0,8)]).toEqual([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  expect([header.getUint32(16),header.getUint32(20)]).toEqual([KITCHEN_ART.width,KITCHEN_ART.height]);
  expect(png[25]).toBe(6); // RGBA: the flat backdrop is transparent
  // The grass diamond is drawn about as wide as the 176-unit 4 × 4 footprint.
  expect(KITCHEN_ART.worldWidth).toBeGreaterThanOrEqual(ISLAND.cellWidth);expect(KITCHEN_ART.worldWidth).toBeLessThan(ISLAND.cellWidth+4);
});
