import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {decode} from '../scripts/png-rgba.mjs';
describe('assets du Magicien',()=>it('fournit cercle et étoile transparents aux dimensions prévues',()=>{
  for(const [file,limit] of [['circle.png',192],['star.png',48]]){
    const image=decode(readFileSync(`public/assets/effects/magicien/${file}`));
    expect(image.width).toBeLessThanOrEqual(limit); expect(image.height).toBeLessThanOrEqual(limit);
    expect(image.rgba.some((_,i)=>i%4===3&&image.rgba[i]===0)).toBe(true);
    // The painting fills its picture: a crop widened by stray glow once left a star of a few pixels.
    let opaque=0; for(let i=3;i<image.rgba.length;i+=4) if(image.rgba[i]>128) opaque++;
    expect(opaque/(image.width*image.height)).toBeGreaterThan(.2);
    expect(image.rgba.some((_,i)=>i%4===3&&image.rgba[i]>0)).toBe(true);
  }
}));
