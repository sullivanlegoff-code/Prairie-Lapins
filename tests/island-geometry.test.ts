import {describe,it,expect} from 'vitest';
import {ISLAND,LEGACY_ISLAND,parcelOrigin} from '../src/config/islandGeometry';
import {MAP_SIZE,PARCEL_SIZE,PARCELS,PARCEL_IDS,parcelAt,acquiredFootprint,type ParcelId} from '../src/config/land';
import {VISUAL} from '../src/config/visual';
import {screenBounds} from '../src/ui/projection';
import {FINE_GRID} from '../src/config/decorations';
import {terrainWidth,visibleColumns} from '../src/simulation/habitats';
import {gridPoint,MeadowCamera} from '../src/ui/gestures';

// docs/island-size-plan.md: 4 × 4-cell parcels (+33.3 % per axis), cells still 176 × 148.
describe('island geometry source (4 × 4 parcels)',()=>{
  it('derives 4 × 4 parcels and a 12 × 12 island from the unchanged cell size',()=>{
    expect(ISLAND).toMatchObject({parcelCells:4,parcelsPerSide:3,mapCells:12,parcelArea:16,maxArea:144,parcelFine:16,mapFine:48,
      cellWidth:176,cellDepth:148,originX:120,originY:120,parcelWidth:704,parcelDepth:592,mapWidth:2112,mapDepth:1776,focus:6});
    expect(ISLAND.parcelWidth/ISLAND.parcelDepth).toBeCloseTo(528/444,12);
    expect(Math.round(ISLAND.grassTuftsPerCell*ISLAND.parcelArea)).toBe(169);
    expect(ISLAND.parcelFine).toBe(ISLAND.parcelCells*FINE_GRID);
    expect([MAP_SIZE,PARCEL_SIZE,terrainWidth(),visibleColumns()]).toEqual([12,4,12,12]);
  });
  it('freezes the former 3 × 3 geometry for v1 to v10 saves only',()=>{
    expect(LEGACY_ISLAND).toMatchObject({parcelCells:3,mapCells:9,parcelArea:9,maxArea:81,parcelFine:12,mapFine:36,parcelWidth:528,parcelDepth:444,focus:4.5});
    expect(Math.round(LEGACY_ISLAND.grassTuftsPerCell*LEGACY_ISLAND.parcelArea)).toBe(95);
    expect(Object.isFrozen(ISLAND)&&Object.isFrozen(LEGACY_ISLAND)).toBe(true);
  });
  it('keeps the parcel arrangement with enlarged parcels, projection and camera focus',()=>{
    expect(PARCELS).toEqual({center:{name:'Centre',x:4,y:4},northwest:{name:'Nord-ouest',x:0,y:0},north:{name:'Nord',x:4,y:0},northeast:{name:'Nord-est',x:8,y:0},
      west:{name:'Ouest',x:0,y:4},east:{name:'Est',x:8,y:4},southwest:{name:'Sud-ouest',x:0,y:8},south:{name:'Sud',x:4,y:8},southeast:{name:'Sud-est',x:8,y:8}});
    expect(parcelOrigin(2,1)).toEqual({x:8,y:4});expect(parcelOrigin(2,1,LEGACY_ISLAND)).toEqual({x:6,y:3});
    expect(VISUAL.grid).toEqual({originX:120,originY:120,width:176,depth:148,columns:12,rows:12});
    expect([VISUAL.camera.focusX,VISUAL.camera.focusY]).toEqual([6,6]);
    expect(gridPoint(ISLAND.mapCells,ISLAND.mapCells)).toEqual({x:120+2112,y:120+1776});
    const camera=new MeadowCamera();
    expect([camera.x,camera.y]).toEqual([120+6*176,120+6*148]);
    const map=screenBounds({left:120,right:120+2112,top:120,bottom:120+1776});
    expect(camera.bounds).toEqual({left:map.left-300,right:map.right+300,top:map.top-160,bottom:map.bottom+160});
  });
  it('maps every cell to its 4 × 4 parcel, and legacy cells to their 3 × 3 parcel',()=>{
    const expected=(x:number,y:number,size:number):ParcelId|null=>{
      if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=3*size||y>=3*size)return null;
      const column=Math.floor(x/size),row=Math.floor(y/size);
      return (['northwest','north','northeast','west','center','east','southwest','south','southeast'] as const)[row*3+column];
    };
    for(let y=-2;y<=13;y++)for(let x=-2;x<=13;x++){expect(parcelAt(x,y)).toBe(expected(x,y,4));expect(parcelAt(x,y,LEGACY_ISLAND)).toBe(expected(x,y,3));}
    expect(parcelAt(1.5,2)).toBeNull();
    const centre={acquiredParcels:['center' as ParcelId]};
    expect(acquiredFootprint(centre,16,16,16,16)).toBe(true);expect(acquiredFootprint(centre,15,16,4,4)).toBe(false);expect(acquiredFootprint(centre,29,16,4,4)).toBe(false);
    expect(acquiredFootprint(centre,12,12,12,12,LEGACY_ISLAND)).toBe(true);expect(acquiredFootprint(centre,16,16,16,16,LEGACY_ISLAND)).toBe(false);
    const all={acquiredParcels:[...PARCEL_IDS]};
    expect(acquiredFootprint(all,44,44,4,4)).toBe(true);expect(acquiredFootprint(all,45,44,4,4)).toBe(false);
    expect(acquiredFootprint(all,32,32,4,4,LEGACY_ISLAND)).toBe(true);expect(acquiredFootprint(all,33,32,4,4,LEGACY_ISLAND)).toBe(false);
  });
});
