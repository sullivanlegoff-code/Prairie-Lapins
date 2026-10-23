import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {HABITAT_TYPES} from '../src/config/habitats';
import {PAILLE_LEVEL2_ART as art,PAILLE_LEVEL2_LAYOUT as layout,PAILLE_LEVEL3_ART,NEIGE_LEVEL3_ART,FEU_LEVEL3_ART,METAL_LEVEL3_ART,VOL_LEVEL3_ART,NEIGE_LEVEL2_ART,FEU_LEVEL2_ART,METAL_LEVEL2_ART,VOL_LEVEL2_ART,UNIVERSAL_LEVEL2_ART,UNIVERSAL_LEVEL3_ART,HABITAT_LEVEL1_ART,HABITAT_ART_LIST,habitatArtFor,habitatArtLayout} from '../src/config/habitatArt';
import {HABITAT_SIZE_PROPOSAL} from '../src/config/habitatSizes';
import {VISUAL} from '../src/config/visual';
import {allowedBox,createRabbitMotion,stepRabbitMotion} from '../src/display/rabbitMotion';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {SOURCE_DIR,HABITAT_SOURCES,sourceName,cropAndHalve} from '../scripts/derive-habitat-art.mjs';

const image=decodePng(readFileSync(new URL('../public/assets/habitats/habitat-paille-level2.png',import.meta.url)));

it('selects the approved Paille v2 only at level 2 / tier 2, keeping level 1, level 3, compact habitats and every other fallback',()=>{
  for(const type of HABITAT_TYPES)for(const level of [1,2,3])for(const tier of [undefined,1,2,3]){
    const level2={paille:art,neige:NEIGE_LEVEL2_ART,feu:FEU_LEVEL2_ART,metal:METAL_LEVEL2_ART,vol:VOL_LEVEL2_ART,universal:UNIVERSAL_LEVEL2_ART}[type]??null;
    const level3={paille:PAILLE_LEVEL3_ART,neige:NEIGE_LEVEL3_ART,feu:FEU_LEVEL3_ART,metal:METAL_LEVEL3_ART,vol:VOL_LEVEL3_ART,universal:UNIVERSAL_LEVEL3_ART}[type]??null;
    expect(habitatArtFor({type,level},tier)).toBe(level===3&&tier===3?level3:level===2&&tier===2?level2:level===1&&(tier??1)===1?HABITAT_LEVEL1_ART[type]:null);
  }
  expect(HABITAT_ART_LIST.filter(a=>a===art)).toHaveLength(1);
  expect(habitatArtLayout(art)).toBe(layout);
  expect(art.texture).toBe('habitat-level2-paille');
  expect(art.url).toBe(`${import.meta.env.BASE_URL}assets/habitats/habitat-paille-level2.png`);
});

it('ships an exact half-size crop of the approved transparent v2 source, at scale 560/1254 and its measured courtyard anchor',()=>{
  const source=readFileSync(join(SOURCE_DIR,sourceName('pailleLevel2'))),original=decodePng(source);
  expect(createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex')).toBe('e095fd58be42cba52044981239cdb737339c5681');
  expect([original.width,original.height]).toEqual([1254,1254]);
  expect(art.source.file).toBe('habitat-paille-level2-transparent-v2.png');
  expect(art.source.crop).toEqual(HABITAT_SOURCES.pailleLevel2.crop);
  expect(image.pixels.equals(cropAndHalve(original,art.source.crop).pixels)).toBe(true);
  expect([image.width,image.height,art.width,art.height]).toEqual([627,471,627,471]);
  expect(art.anchor).toEqual({x:627/2,y:(800-174)/2});
  expect(art.worldWidth).toBe(280);
  expect(art.worldWidth/art.width).toBeCloseTo(560/1254,10);
  expect(art.source.crop.x).toBe(0);expect(art.source.crop.width).toBe(original.width);
  for(let x=0;x<image.width;x++)for(const y of [0,image.height-1])expect(image.pixels[(y*image.width+x)*4+3]).toBeLessThanOrEqual(8);
  for(const [x,y]of [[0,0],[image.width-1,0],[0,image.height-1],[image.width-1,image.height-1]])expect(image.pixels[(y*image.width+x)*4+3]).toBe(0);
});

it('keeps all five places and complete walking boxes on the courtyard, below the buildings/cart and above planted borders and gate',()=>{
  expect(layout.slots).toHaveLength(5);
  expect(new Set(layout.slots.map(p=>`${p.x},${p.y}`)).size).toBe(5);
  expect(HABITAT_SIZE_PROPOSAL[2].footprint).toEqual({width:6,depth:5});
  expect(layout.roamScale).toBe(HABITAT_SIZE_PROPOSAL[2].roamScale);
  expect(VISUAL.rabbit.scale).toBe(1.3);
  const median=(px,py)=>{const c=[[],[],[]];for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
    const i=((py+dy)*image.width+px+dx)*4;for(let j=0;j<3;j++)c[j].push(image.pixels[i+j]);
  }return c.map(v=>v.sort((a,b)=>a-b)[60]);};
  // This source has dark grass tufts, sparse daisies and bare earth, all within the measured courtyard.
  // Median sampling ignores isolated petals; colour distance covers this source's measured ground palette.
  const lawn=median(314,313),k=art.worldWidth/art.width;
  for(const slot of layout.slots){const box=allowedBox(slot,5,layout);
    for(let y=box.minY;y<=box.maxY;y+=2)for(let x=box.minX;x<=box.maxX;x+=2){
      const px=Math.round(art.anchor.x+x/k),py=Math.round(art.anchor.y+y/k);
      expect(px*2).toBeGreaterThanOrEqual(slot.y<0?320:410);expect(px*2).toBeLessThanOrEqual(slot.y<0?935:840);
      expect(py*2+174).toBeGreaterThanOrEqual(slot.y<0?680:820);expect(py*2+174).toBeLessThanOrEqual(slot.y<0?760:905);
      expect(image.pixels[(py*image.width+px)*4+3]).toBeGreaterThanOrEqual(224);
      const c=median(px,py);
      expect(Math.hypot(...c.map((v,i)=>v-lawn[i])),`courtyard at ${px},${py}`).toBeLessThan(110);
      expect(c[1]).toBeGreaterThan(100);expect(c[1]-c[2]).toBeGreaterThan(35);
    }
  }
});

it('lets all five residents walk inside their courtyard boxes for five simulated minutes',()=>{
  const motions=layout.slots.map((slot,i)=>createRabbitMotion(`rabbit-${i+10}`,slot,5,layout)),walks=motions.map(()=>0);
  for(let t=0;t<300_000;t+=100)for(const [i,m]of motions.entries()){
    const previous=m.mode;
    stepRabbitMotion(m,100,motions.filter(o=>o!==m).flatMap(o=>o.mode==='walk'?[o.local,o.to]:[o.local]));
    if(m.mode==='walk'&&previous!=='walk')walks[i]++;
    const b=allowedBox(m.home,5,layout);
    expect(m.local.x).toBeGreaterThanOrEqual(b.minX);expect(m.local.x).toBeLessThanOrEqual(b.maxX);
    expect(m.local.y).toBeGreaterThanOrEqual(b.minY);expect(m.local.y).toBeLessThanOrEqual(b.maxY);
  }
  for(const count of walks)expect(count).toBeGreaterThan(0);
});
