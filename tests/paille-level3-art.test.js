import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {HABITAT_TYPES} from '../src/config/habitats';
import {PAILLE_LEVEL3_ART as art, PAILLE_LEVEL3_LAYOUT as layout, NEIGE_LEVEL3_ART, FEU_LEVEL3_ART, METAL_LEVEL3_ART, VOL_LEVEL3_ART, NEIGE_LEVEL2_ART, FEU_LEVEL2_ART, METAL_LEVEL2_ART, VOL_LEVEL2_ART, PAILLE_LEVEL2_ART, UNIVERSAL_LEVEL2_ART, UNIVERSAL_LEVEL3_ART, HABITAT_LEVEL1_ART, HABITAT_ART_LIST, habitatArtFor, habitatArtLayout} from '../src/config/habitatArt';
import {HABITAT_SIZE_PROPOSAL} from '../src/config/habitatSizes';
import {VISUAL} from '../src/config/visual';
import {allowedBox, createRabbitMotion, stepRabbitMotion} from '../src/display/rabbitMotion';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {SOURCE_DIR, HABITAT_SOURCES, sourceName, cropAndHalve} from '../scripts/derive-habitat-art.mjs';

const image=decodePng(readFileSync(new URL('../public/assets/habitats/habitat-paille-level3.png',import.meta.url)));

it('selects Domaine des moissons only for Paille level 3 / tier 3, preserving the approved Paille level 2 and all other choices',()=>{
  for(const type of HABITAT_TYPES)for(const level of [1,2,3])for(const tier of [undefined,1,2,3]){
    const level2={neige:NEIGE_LEVEL2_ART,feu:FEU_LEVEL2_ART,metal:METAL_LEVEL2_ART,vol:VOL_LEVEL2_ART,paille:PAILLE_LEVEL2_ART,universal:UNIVERSAL_LEVEL2_ART}[type]??null;
    const level3={neige:NEIGE_LEVEL3_ART,feu:FEU_LEVEL3_ART,metal:METAL_LEVEL3_ART,vol:VOL_LEVEL3_ART,paille:art,universal:UNIVERSAL_LEVEL3_ART}[type]??null;
    expect(habitatArtFor({type,level},tier)).toBe(level===3&&tier===3?level3:level===2&&tier===2?level2:level===1&&(tier??1)===1?HABITAT_LEVEL1_ART[type]:null);
  }
  for(const tier of [undefined,1,2,3])expect(habitatArtFor({type:'paille',level:2},tier)).toBe(tier===2?PAILLE_LEVEL2_ART:null);
  expect(HABITAT_ART_LIST.filter(a=>a===art)).toHaveLength(1);
  expect(habitatArtLayout(art)).toBe(layout);
  expect(art.texture).toBe('habitat-level3-paille');
  expect(art.url).toBe(`${import.meta.env.BASE_URL}assets/habitats/habitat-paille-level3.png`);
});

it('ships the untouched approved source as an exact half-size crop at scale 704/1254 and the measured lawn anchor',()=>{
  const source=readFileSync(join(SOURCE_DIR,sourceName('pailleLevel3'))),original=decodePng(source);
  expect(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex')).toBe('02f3918b9f99b7cf5d7f2a6b41623dbd407fa343');
  expect([original.width,original.height]).toEqual([1254,1254]);
  expect(art.source.crop).toEqual(HABITAT_SOURCES.pailleLevel3.crop);
  expect(image.pixels.equals(cropAndHalve(original,art.source.crop).pixels)).toBe(true);
  expect([image.width,image.height,art.width,art.height]).toEqual([627,477,627,477]);
  expect(art.anchor).toEqual({x:627/2,y:(760-108)/2});
  expect(art.worldWidth).toBe(352);
  expect(art.worldWidth/art.width).toBeCloseTo(704/1254,10);
  expect(art.source.crop.x).toBe(0);expect(art.source.crop.width).toBe(original.width);
  for(let x=0;x<image.width;x++)for(const y of [0,image.height-1])expect(image.pixels[(y*image.width+x)*4+3]).toBeLessThanOrEqual(8);
});

it('keeps seven places and their entire walking boxes on courtyard lawn, below the buildings/cart and above the beds and gate',()=>{
  expect(layout.slots).toHaveLength(7);
  expect(new Set(layout.slots.map(p=>`${p.x},${p.y}`)).size).toBe(7);
  expect(HABITAT_SIZE_PROPOSAL[3].footprint).toEqual({width:8,depth:6});
  expect(layout.roamScale).toBe(HABITAT_SIZE_PROPOSAL[3].roamScale);
  expect(VISUAL.rabbit.scale).toBe(1.3);
  // As for level-1 lawn checks, median colour ignores small daisies drawn on the grass, not the border planting beds.
  const median=(px,py)=>{
    const channels=[[],[],[]];for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
      const i=((py+dy)*image.width+px+dx)*4;for(let c=0;c<3;c++)channels[c].push(image.pixels[i+c]);
    }return channels.map(v=>v.sort((a,b)=>a-b)[60]);
  };
  const k=art.worldWidth/art.width;
  for(const slot of layout.slots){const box=allowedBox(slot,7,layout);
    for(let y=box.minY;y<=box.maxY;y+=2)for(let x=box.minX;x<=box.maxX;x+=2){
      const px=Math.round(art.anchor.x+x/k),py=Math.round(art.anchor.y+y/k);
      // Conservative source rectangles inside the bare courtyard, away from the farmhouse, cart, gate and planted borders.
      expect(px*2).toBeGreaterThanOrEqual(slot.y<0?310:280);expect(px*2).toBeLessThanOrEqual(slot.y<0?945:1005);
      expect(py*2+108).toBeGreaterThanOrEqual(slot.y<0?665:795);expect(py*2+108).toBeLessThanOrEqual(slot.y<0?725:855);
      expect(image.pixels[(py*image.width+px)*4+3]).toBeGreaterThanOrEqual(224);
      const [r,g,b]=median(px,py);
      expect(r,`lawn at ${px},${py}`).toBeGreaterThan(110);expect(g).toBeGreaterThan(130);expect(b).toBeGreaterThan(50);
      expect(g-r).toBeGreaterThan(-20);expect(g-b).toBeGreaterThan(25);
    }
  }
});

it('lets all seven residents walk inside their lawn boxes for five simulated minutes',()=>{
  const motions=layout.slots.map((slot,i)=>createRabbitMotion(`rabbit-${i+10}`,slot,7,layout)),walks=motions.map(()=>0);
  for(let t=0;t<300_000;t+=100)for(const [i,m]of motions.entries()){
    const previous=m.mode;
    stepRabbitMotion(m,100,motions.filter(o=>o!==m).flatMap(o=>o.mode==='walk'?[o.local,o.to]:[o.local]));
    if(m.mode==='walk'&&previous!=='walk')walks[i]++;
    const b=allowedBox(m.home,7,layout);
    expect(m.local.x).toBeGreaterThanOrEqual(b.minX);expect(m.local.x).toBeLessThanOrEqual(b.maxX);
    expect(m.local.y).toBeGreaterThanOrEqual(b.minY);expect(m.local.y).toBeLessThanOrEqual(b.maxY);
  }
  for(const count of walks)expect(count).toBeGreaterThan(0);
});
