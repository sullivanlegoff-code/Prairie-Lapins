import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {decodePng} from '../scripts/derive-nursery-overlays.mjs';
import {cleanRock,deriveIsland} from '../scripts/derive-island-art.mjs';
import {ISLAND_ART} from '../src/config/islandArt';

const dimensions={cliff:[400,82],foundation:[752,304],'chunk-wide':[420,384],
  'chunk-round':[410,350],'chunk-deep':[300,460],'islet-wide':[400,360],'islet-small':[360,310]};
const kit=Object.fromEntries(Object.keys(dimensions).map(name=>[name,
  decodePng(readFileSync(new URL(`../public/assets/island/${name}.png`,import.meta.url)))]));

describe('painted underside production kit',()=>{
  it('ships all seven registered PNGs at their approved dimensions, below the shared GPU budget',()=>{
    expect(ISLAND_ART.map(a=>a.name).sort()).toEqual(Object.keys(dimensions).sort());
    let gpu=0;
    for(const [name,img] of Object.entries(kit)) {
      expect([img.width,img.height]).toEqual(dimensions[name]);
      gpu+=img.width*img.height*4;
      let spill=0;
      for(let p=0;p<img.pixels.length;p+=4) {
        if(img.pixels[p+3])spill=Math.max(spill,img.pixels[p+2]-img.pixels[p+1]);
      }
      expect(spill,name+' key spill').toBeLessThanOrEqual(8);
    }
    expect(gpu).toBe(3839152);expect(gpu).toBeLessThan(4000000);
  });
  it('reproduces every derivative byte for byte from the retained sources',()=>{
    process.argv.push('--check');try{deriveIsland();}finally{process.argv.pop();}
  },30000);
  it('repairs enclosed alpha holes and pale inclusions while preserving exterior alpha',()=>{
    const width=9,height=9,pixels=Buffer.alloc(width*height*4);
    for(let y=2;y<=6;y++)for(let x=2;x<=6;x++)pixels.set([180,120,60,255],(y*width+x)*4);
    pixels.set([255,0,255,0],(4*width+4)*4);
    pixels.set([254,248,253,255],(3*width+3)*4);
    pixels.set([230,120,210,100],(1*width+3)*4);
    cleanRock({width,height,pixels},true);
    expect([...pixels.subarray((4*width+4)*4,(4*width+4)*4+4)]).toEqual([180,120,60,255]);
    expect([...pixels.subarray((3*width+3)*4,(3*width+3)*4+4)]).toEqual([180,120,60,255]);
    expect([...pixels.subarray((1*width+3)*4,(1*width+3)*4+4)]).toEqual([180,120,60,100]);
    expect(pixels[3]).toBe(0);
  });
  it('removes the white-pink inclusion from the deep chunk',()=>{
    const {pixels}=kit['chunk-deep'];
    let pale=0;
    for(let p=0;p<pixels.length;p+=4)if(pixels[p+3]&&pixels[p]>225&&pixels[p+1]>210&&pixels[p+2]>210)pale++;
    expect(pale).toBe(0);
  });
});
