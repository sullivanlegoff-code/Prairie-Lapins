import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decode,encode} from './png-rgba.mjs';
const sourcePath='public/assets/buildings/nest-garden-v2.png',sourceBytes=readFileSync(sourcePath),source=decode(sourceBytes);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function hsv([r,g,b]){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d)h=60*(max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4);return [h,max?d/max:0,max];}
function rgb([h,s,v]){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const a=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return a.map(n=>(n+m)*255);}
const hex=a=>'#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const sha=b=>createHash('sha256').update(b).digest('hex');
const samples={
  grass:[540,540,75,65],trees:[77,270,35,55],treeShadow:[14,240,70,90],dome:[320,240,50,35],domeLight:[320,135,80,55],water:[160,625,30,40],path:[500,775,24,20],
  pinkFlower:[300,475,370,280],yellowFlower:[254,369,13,12],entranceShadow:[365,352,35,25],
};
function palette(image){return Object.fromEntries(Object.entries(samples).map(([name,[x,y,w,h]])=>{const colors=[];for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const p=(yy*image.width+xx)*4,color=[...image.rgba.subarray(p,p+3)],[h,s,v]=hsv([...source.rgba.subarray(p,p+3)]);if(image.rgba[p+3]>200&&(name!=='pinkFlower'||(h>340||h<12)&&s>.25&&v>.7)&&(name!=='treeShadow'||h>120&&h<180&&v<.7))colors.push(color);}const median=[0,1,2].map(c=>colors.map(p=>p[c]).sort((a,b)=>a-b)[Math.floor(colors.length/2)]);return [name,{sample:[x,y,w,h],median:hex(median),hsv:hsv(median).map((v,i)=>+(i?v*100:v).toFixed(2))}];}));}
const report={source:sourcePath,sourceSha256:sha(sourceBytes),sourceBytes:sourceBytes.length,width:source.width,height:source.height,original:palette(source),variants:{}};
if(process.argv.includes('--analyse')){console.log(JSON.stringify(report,null,2));process.exit(0);}
// Soft color-family membership, no hard-edged masks, resampling or alpha edits.
for(const [name,strength] of [['light',.45],['medium',.72],['strong',1]]){
  const rgba=Buffer.from(source.rgba);
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
    const p=(y*source.width+x)*4,original=[...source.rgba.subarray(p,p+3)];if(!rgba[p+3])continue;
    const [h,s,v]=hsv(original);let result=original;
    const green=smooth(52,65,h)*(1-smooth(160,180,h))*smooth(.08,.26,s);
    const grass=green*(1-smooth(93,120,h));
    const tree=green*(1-grass);
    const water=smooth(174,192,h)*(1-smooth(220,242,h))*smooth(.07,.24,s);
    const warm=(1-smooth(42,60,h))*smooth(.04,.18,s);
    const edgeDistance=Math.min(x,source.width-1-x,y>=218?y-218:1000,source.height-1-y);
    const edge=(1-smooth(0,64,edgeDistance))*smooth(200,240,y);
    // Ground target is the actual island base #cbd785; retain painted luminance variation.
    if(grass){const target=rgb([mix(h,69,.8),mix(s,.38,.85),mix(v,.843+(v-.86)*.36,.85)]);result=result.map((c,i)=>mix(c,target[i],grass*strength));
      // All variants share a stronger but gradual grass-only boundary match.
      const boundary=[203,215,133].map(c=>c+(v-.86)*25);result=result.map((c,i)=>mix(c,boundary[i],edge*grass*.92));}
    if(tree){const target=rgb([mix(h,94,.62),mix(s,.30,.55),.72+(v-.73)*.76]);result=result.map((c,i)=>mix(c,target[i],tree*strength));}
    if(water){const target=rgb([mix(h,175,.9),mix(s,.31,.75),.827+(v-.83)*.55]);result=result.map((c,i)=>mix(c,target[i],water*strength));}
    if(warm){const dome=1-smooth(26,42,h);const target=rgb([mix(h,dome?15:43,.32),s*(dome?.72:.68),.80+(v-.80)*.88]);result=result.map((c,i)=>mix(c,target[i],warm*strength));}
    // Subtle common restraint on flowers/purple stones, while retaining dark outlines.
    if(h>245&&h<355)result=result.map(c=>mix(c,.2126*original[0]+.7152*original[1]+.0722*original[2],strength*.16));
    // Two-unit RGB grid: <=1 byte quantisation error; exact 8-bit alpha is untouched.
    for(let c=0;c<3;c++)rgba[p+c]=clamp(Math.round(result[c]/2)*2,0,255);
  }
  const image={width:source.width,height:source.height,rgba},bytes=encode(image),decoded=decode(bytes);
  assert.deepEqual(decoded.rgba,rgba,'PNG roundtrip is lossless');let changed=0;
  for(let p=0;p<rgba.length;p+=4){assert.equal(rgba[p+3],source.rgba[p+3]);if(rgba[p]!==source.rgba[p]||rgba[p+1]!==source.rgba[p+1]||rgba[p+2]!==source.rgba[p+2])changed++;}
  const file=`public/assets/buildings/nest-garden-${name}.png`;writeFileSync(file,bytes);
  report.variants[name]={file,strength,bytes:bytes.length,savedPercent:+(100*(1-bytes.length/sourceBytes.length)).toFixed(2),sha256:sha(bytes),alphaChanged:0,changedRGBPixels:changed,palette:palette(image)};
}
writeFileSync('docs/nest-palette-data.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
