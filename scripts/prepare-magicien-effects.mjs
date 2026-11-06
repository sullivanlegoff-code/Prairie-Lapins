// Crops and resizes the approved Magician effect paintings with Node built-ins only.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {decode, encode} from './png-rgba.mjs';
import {resizeRegion} from './resize-rgba.mjs';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const target = 'public/assets/effects/magicien'; mkdirSync(target, {recursive: true});
function prepare(source, name, size) {
  const image = decode(readFileSync(`assets-source/effects/magicien/${source}`));
  // The star source has a white matte; key only near-white pixels, preserving painted highlights.
  if (source === 'etoile-violette.png') for (let i=0;i<image.rgba.length;i+=4) {
    const [r,g,b] = image.rgba.subarray(i,i+3), low=Math.min(r,g,b), spread=Math.max(r,g,b)-low;
    if (low > 248 && spread < 8) image.rgba.fill(0,i,i+4);
  }
  let minX=image.width,minY=image.height,maxX=-1,maxY=-1;
  for(let y=0;y<image.height;y++) for(let x=0;x<image.width;x++) if(image.rgba[(y*image.width+x)*4+3]>48){ // Faint stray glow pixels far from the painting do not widen the crop.
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  if(maxX<minX) throw Error(`${source}: no visible content`);
  const width=maxX-minX+1,height=maxY-minY+1, pixels=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++) image.rgba.copy(pixels,y*width*4,((minY+y)*image.width+minX)*4,((minY+y)*image.width+minX+width)*4);
  const scale=size/Math.max(width,height), outW=Math.max(1,Math.round(width*scale)),outH=Math.max(1,Math.round(height*scale));
  const resized=resizeRegion({width,height,pixels},width,height,outW,outH);
  writeFileSync(join(target,name),encode({width:resized.width,height:resized.height,rgba:resized.pixels}));
  console.log(`${name}: ${width}x${height} → ${resized.width}x${resized.height}`);
}
prepare('cercle-magique.png','circle.png',192); prepare('etoile-violette.png','star.png',48);
