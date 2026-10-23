import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {HABITAT_TYPES} from '../src/config/habitats';
import {UNIVERSAL_LEVEL3_ART as art,UNIVERSAL_LEVEL3_LAYOUT as layout,UNIVERSAL_LEVEL2_ART,PAILLE_LEVEL2_ART,PAILLE_LEVEL3_ART,NEIGE_LEVEL3_ART,FEU_LEVEL3_ART,METAL_LEVEL3_ART,VOL_LEVEL3_ART,NEIGE_LEVEL2_ART,FEU_LEVEL2_ART,METAL_LEVEL2_ART,VOL_LEVEL2_ART,HABITAT_LEVEL1_ART,HABITAT_ART_LIST,habitatArtFor,habitatArtLayout} from '../src/config/habitatArt';
import {HABITAT_SIZE_PROPOSAL} from '../src/config/habitatSizes';
import {VISUAL} from '../src/config/visual';
import {allowedBox,createRabbitMotion,stepRabbitMotion} from '../src/display/rabbitMotion';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {SOURCE_DIR,HABITAT_SOURCES,sourceName,cropAndHalve} from '../scripts/derive-habitat-art.mjs';

const image=decodePng(readFileSync(new URL('../public/assets/habitats/habitat-universal-level3.png',import.meta.url)));

it('selects the universal garden estate only at level 3 / tier 3, preserving level 1, level 2 and every compact fallback',()=>{
  for(const type of HABITAT_TYPES)for(const level of [1,2,3])for(const tier of [undefined,1,2,3]){
    const level2={universal:UNIVERSAL_LEVEL2_ART,paille:PAILLE_LEVEL2_ART,neige:NEIGE_LEVEL2_ART,feu:FEU_LEVEL2_ART,metal:METAL_LEVEL2_ART,vol:VOL_LEVEL2_ART}[type]??null;
    const level3={universal:art,paille:PAILLE_LEVEL3_ART,neige:NEIGE_LEVEL3_ART,feu:FEU_LEVEL3_ART,metal:METAL_LEVEL3_ART,vol:VOL_LEVEL3_ART}[type]??null;
    expect(habitatArtFor({type,level},tier)).toBe(level===3&&tier===3?level3:level===2&&tier===2?level2:level===1&&(tier??1)===1?HABITAT_LEVEL1_ART[type]:null);
  }
  expect(HABITAT_ART_LIST.filter(a=>a===art)).toHaveLength(1);expect(habitatArtLayout(art)).toBe(layout);
  expect(art.texture).toBe('habitat-level3-universal');expect(art.url).toBe(`${import.meta.env.BASE_URL}assets/habitats/habitat-universal-level3.png`);
});

it('ships the untouched generated source as an exact half-size crop with native alpha, scale 704/1254 and measured anchor',()=>{
  const bytes=readFileSync(join(SOURCE_DIR,sourceName('universalLevel3'))),original=decodePng(bytes);
  expect(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')).toBe('10ee83c110e0f4b04faa13cca97065545e1aa9e4');
  expect([original.width,original.height]).toEqual([1254,1254]);expect(art.source.crop).toEqual(HABITAT_SOURCES.universalLevel3.crop);
  expect(image.pixels.equals(cropAndHalve(original,art.source.crop).pixels)).toBe(true);
  expect([image.width,image.height,art.width,art.height]).toEqual([627,497,627,497]);
  expect(art.anchor).toEqual({x:627/2,y:(780-136)/2});expect(art.worldWidth/art.width).toBeCloseTo(704/1254,10);
  expect(art.worldWidth).toBe(352);
  for(let x=0;x<image.width;x++)for(const y of [0,image.height-1])expect(image.pixels[(y*image.width+x)*4+3]).toBeLessThanOrEqual(8);
  for(const [x,y]of [[0,0],[626,0],[0,496],[626,496]])expect(image.pixels[(y*image.width+x)*4+3]).toBe(0);
});

it('uses seven spaced places and full walking boxes on lawn, away from the rear estate, pergola, trees and front gate',()=>{
  expect(layout.slots).toHaveLength(7);expect(new Set(layout.slots.map(p=>`${p.x},${p.y}`)).size).toBe(7);
  expect(HABITAT_SIZE_PROPOSAL[3].footprint).toEqual({width:8,depth:6});expect(VISUAL.rabbit.scale).toBe(1.3);
  expect(layout.roamScale).toBe(HABITAT_SIZE_PROPOSAL[3].roamScale);
  const median=(px,py)=>{const c=[[],[],[]];for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
    const i=((py+dy)*image.width+px+dx)*4;for(let j=0;j<3;j++)c[j].push(image.pixels[i+j]);
  }return c.map(v=>v.sort((a,b)=>a-b)[60]);};
  const k=art.worldWidth/art.width;
  for(const [index,slot]of layout.slots.entries()){
    for(const other of layout.slots.slice(index+1))expect(Math.hypot(slot.x-other.x,slot.y-other.y)).toBeGreaterThanOrEqual(52);
    const box=allowedBox(slot,7,layout);
    for(let y=box.minY;y<=box.maxY;y+=2)for(let x=box.minX;x<=box.maxX;x+=2){
      const px=Math.round(art.anchor.x+x/k),py=Math.round(art.anchor.y+y/k);
      expect(px*2).toBeGreaterThanOrEqual(slot.y<0?300:240);expect(px*2).toBeLessThanOrEqual(slot.y<0?950:1015);
      expect(py*2+136).toBeGreaterThanOrEqual(slot.y<0?640:820);expect(py*2+136).toBeLessThanOrEqual(slot.y<0?710:885);
      expect(image.pixels[(py*image.width+px)*4+3]).toBeGreaterThanOrEqual(224);
      const [r,g,b]=median(px,py);expect(r).toBeGreaterThan(90);expect(g).toBeGreaterThan(110);expect(b).toBeGreaterThan(20);
      expect(g-r).toBeGreaterThan(-35);expect(g-b).toBeGreaterThan(30);
    }
  }
});

it('lets all seven residents walk inside their courtyard boxes for five simulated minutes',()=>{
  const motions=layout.slots.map((slot,i)=>createRabbitMotion(`rabbit-${i+10}`,slot,7,layout)),walks=motions.map(()=>0);
  for(let t=0;t<300_000;t+=100)for(const [i,m]of motions.entries()){
    const previous=m.mode;stepRabbitMotion(m,100,motions.filter(o=>o!==m).flatMap(o=>o.mode==='walk'?[o.local,o.to]:[o.local]));
    if(m.mode==='walk'&&previous!=='walk')walks[i]++;const b=allowedBox(m.home,7,layout);
    expect(m.local.x).toBeGreaterThanOrEqual(b.minX);expect(m.local.x).toBeLessThanOrEqual(b.maxX);
    expect(m.local.y).toBeGreaterThanOrEqual(b.minY);expect(m.local.y).toBeLessThanOrEqual(b.maxY);
  }for(const count of walks)expect(count).toBeGreaterThan(0);
});
