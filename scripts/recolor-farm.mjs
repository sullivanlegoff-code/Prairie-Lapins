import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decode,encode} from './png-rgba.mjs';
// Color-only variants of the farm, aligned on the owner-approved "strong" nest palette.
const sourcePath='public/assets/buildings/farm-windmill.png',sourceBytes=readFileSync(sourcePath),source=decode(sourceBytes);
const nestPath='public/assets/buildings/nest-garden-strong.png',nest=decode(readFileSync(nestPath));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function hsv([r,g,b]){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d)h=60*(max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4);return [h,max?d/max:0,max];}
function rgb([h,s,v]){h=(h%360+360)%360;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const a=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return a.map(n=>(n+m)*255);}
const hex=a=>'#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const sha=b=>createHash('sha256').update(b).digest('hex');
// Median samples: [x,y,w,h] plus a filter on the ORIGINAL pixel, so every variant is measured on identical pixels.
const red=h=>h>330||h<12;
const samples={
  grass:[[0,700,600,450],(h,s,v)=>h>60&&h<115&&s>.25&&v>.75],
  grassShade:[[0,700,600,450],(h,s,v)=>h>60&&h<125&&s>.25&&v>.45&&v<.75],
  trees:[[560,160,300,160],(h,s,v)=>h>115&&h<170&&v>.75],
  treeShadow:[[120,300,520,420],(h,s,v)=>h>115&&h<175&&v>.4&&v<.72],
  roof:[[300,380,200,150],(h,s,v)=>red(h)&&s>.25&&v>.6],
  towerCream:[[300,720,70,60],(h,s,v)=>h>22&&h<50&&s<.4&&v>.88],
  towerBase:[[290,800,70,60],(h,s,v)=>h>8&&h<35&&s>.28&&v>.8],
  blades:[[690,300,140,120],(h,s,v)=>h>15&&h<45&&s>.2&&v>.75],
  soil:[[860,680,160,140],(h,s,v)=>h>5&&h<32&&s>.35&&v>.5&&v<.78],
  door:[[585,770,55,95],(h,s,v)=>h>5&&h<35&&s>.3&&v>.4&&v<.8],
  outline:[[0,0,1254,1254],(h,s,v)=>h<45&&s>.45&&v<.48],
  fence:[[960,560,260,320],(h,s,v)=>s<.15&&v>.85],
  head:[[600,520,70,40],(h,s,v)=>s<.15&&v>.9],
  innerEar:[[590,440,90,60],(h,s,v)=>(red(h)||h<30)&&s>.15&&v>.75],
};
function palette(image){return Object.fromEntries(Object.entries(samples).map(([name,[[x,y,w,h],keep]])=>{const colors=[];for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const p=(yy*image.width+xx)*4;if(source.rgba[p+3]>220&&keep(...hsv([...source.rgba.subarray(p,p+3)])))colors.push([...image.rgba.subarray(p,p+3)]);}
  const median=[0,1,2].map(c=>colors.map(p=>p[c]).sort((a,b)=>a-b)[Math.floor(colors.length/2)]);return [name,{sample:[x,y,w,h],pixels:colors.length,median:hex(median),hsv:hsv(median).map((v,i)=>+(i?v*100:v).toFixed(2))}];}));}
// Same-name families on the strong nest, for the comparison table only.
const nestSamples={grass:[540,540,75,65],trees:[77,270,35,55],treeShadow:[14,240,70,90],dome:[320,240,50,35],path:[500,775,24,20]};
const nestPalette=Object.fromEntries(Object.entries(nestSamples).map(([name,[x,y,w,h]])=>{const colors=[];for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const p=(yy*nest.width+xx)*4;if(nest.rgba[p+3]>200)colors.push([...nest.rgba.subarray(p,p+3)]);}const median=[0,1,2].map(c=>colors.map(p=>p[c]).sort((a,b)=>a-b)[Math.floor(colors.length/2)]);return [name,{median:hex(median),hsv:hsv(median).map((v,i)=>+(i?v*100:v).toFixed(2))}];}));
const report={source:sourcePath,sourceSha256:sha(sourceBytes),sourceBytes:sourceBytes.length,width:source.width,height:source.height,nestStrong:nestPalette,original:palette(source),variants:{}};
if(process.argv.includes('--analyse')){console.log(JSON.stringify(report,null,2));process.exit(0);}
// Chamfer distance (texture pixels) to the transparent outside, for a gradual grass-only edge match.
const W=source.width,H=source.height,dist=new Float32Array(W*H);
for(let i=0;i<W*H;i++)dist[i]=source.rgba[i*4+3]<128?0:1e9;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(x)dist[i]=Math.min(dist[i],dist[i-1]+1);if(y)dist[i]=Math.min(dist[i],dist[i-W]+1);if(x&&y)dist[i]=Math.min(dist[i],dist[i-W-1]+1.414);if(y&&x<W-1)dist[i]=Math.min(dist[i],dist[i-W+1]+1.414);}
for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;if(x<W-1)dist[i]=Math.min(dist[i],dist[i+1]+1);if(y<H-1)dist[i]=Math.min(dist[i],dist[i+W]+1);if(x<W-1&&y<H-1)dist[i]=Math.min(dist[i],dist[i+W+1]+1.414);if(y<H-1&&x)dist[i]=Math.min(dist[i],dist[i+W-1]+1.414);}
// The rabbit head at the hub is kept exactly. Only its own colors (white face, pale pink ears,
// dark eyes/outline) are protected inside a soft ellipse; foliage, roof and blades around it are
// recolored like everywhere else, so no untouched patch or halo appears.
const headRegion=(x,y)=>1-smooth(1,1.15,Math.hypot((x-636)/88,(y-532)/112));
const headColor=(h,s,v)=>Math.max((1-smooth(.15,.25,s))*smooth(.7,.8,v),(h<35||h>340?1:0)*(1-smooth(.36,.46,s))*smooth(.8,.88,v),1-smooth(.4,.55,v));
const protect=(x,y,[h,s,v])=>headRegion(x,y)*headColor(h,s,v);
for(const [name,strength] of [['light',.5],['nest',1]]){
  const rgba=Buffer.from(source.rgba);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const p=(y*W+x)*4,original=[...source.rgba.subarray(p,p+3)];if(!rgba[p+3])continue;
    const [h,s,v]=hsv(original),keep=1-protect(x,y,[h,s,v]);if(!keep)continue;let result=original;const k=strength*keep;
    const green=smooth(52,65,h)*(1-smooth(165,185,h))*smooth(.08,.26,s);
    const grass=green*(1-smooth(108,124,h));
    const tree=green*(1-grass);
    const roof=(smooth(318,334,h)+(1-smooth(6,16,h)))*smooth(.12,.25,s)*smooth(.35,.5,v);
    const warm=smooth(4,12,h)*(1-smooth(44,58,h))*smooth(.06,.2,s);
    const dark=(h<45||h>330?1:0)*smooth(.45,.6,s)*(1-smooth(.42,.6,v));
    const edge=(1-smooth(0,96,dist[y*W+x]))*smooth(560,640,y);
    // Grass: island base #cbd785 / nest strong #ccd982, painted luminance variation kept.
    if(grass){const target=rgb([mix(h,69,.8),mix(s,.38,.85),mix(v,.843+(v-.86)*.36,.85)]);result=result.map((c,i)=>mix(c,target[i],grass*k));
      const boundary=[203,215,133].map(c=>c+(v-.86)*25);result=result.map((c,i)=>mix(c,boundary[i],edge*grass*.92*keep));}
    // Trees: mint 142° to the nest's sage foliage (lit ~98-111°, shade ~125-140°).
    if(tree){const target=rgb([108+(h-142)*.55,mix(s,.34,.6),.74+(v-.80)*.65]);result=result.map((c,i)=>mix(c,target[i],tree*k));}
    // Roof and flag: raspberry to the nest's warm powder rose, outlines keep their darkness.
    if(roof){const hh=h>180?h-360:h;const target=rgb([mix(hh,8,.75),s*.74,mix(v,Math.min(1,v+.04),.8)]);result=result.map((c,i)=>mix(c,target[i],roof*(1-dark)*k));}
    // Wood, tower, soil, door: already close to the nest path; slight restraint only.
    if(warm){const target=rgb([mix(h,24,.2),s*(v>.8?.86:.84),v]);result=result.map((c,i)=>mix(c,target[i],warm*(1-dark)*k));}
    // Very saturated dark-brown outlines: same lowered saturation as the nest entrance, same darkness.
    if(dark){const hh=h>180?h-360:h;const target=rgb([mix(hh,14,.3),mix(s,.56,.7),v]);result=result.map((c,i)=>mix(c,target[i],dark*k));}
    // Small flowers (pink/purple/blue): subtle common restraint as on the nest.
    if(h>190&&h<318&&s>.15)result=result.map(c=>mix(c,.2126*original[0]+.7152*original[1]+.0722*original[2],k*.16));
    // Two-unit RGB grid: <=1 byte quantisation error; exact 8-bit alpha is untouched.
    for(let c=0;c<3;c++)rgba[p+c]=clamp(Math.round(result[c]/2)*2,0,255);
  }
  const image={width:W,height:H,rgba},bytes=encode(image),decoded=decode(bytes);
  assert.deepEqual(decoded.rgba,rgba,'PNG roundtrip is lossless');let changed=0,head=0;
  for(let p=0;p<rgba.length;p+=4){assert.equal(rgba[p+3],source.rgba[p+3]);const i=p/4;if(rgba[p]!==source.rgba[p]||rgba[p+1]!==source.rgba[p+1]||rgba[p+2]!==source.rgba[p+2]){changed++;if(protect(i%W,Math.floor(i/W),hsv([...source.rgba.subarray(p,p+3)]))===1)head++;}}
  assert.equal(head,0,'rabbit head pixels unchanged');
  const file=`public/assets/buildings/farm-windmill-${name}.png`;writeFileSync(file,bytes);
  report.variants[name]={file,strength,bytes:bytes.length,savedPercent:+(100*(1-bytes.length/sourceBytes.length)).toFixed(2),sha256:sha(bytes),alphaChanged:0,headPixelsChanged:0,changedRGBPixels:changed,palette:palette(image)};
}
writeFileSync('docs/farm-palette-data.json',JSON.stringify(report,null,2)+'\n');
for(const [n,v] of Object.entries(report.variants))console.log(n,v.bytes,v.savedPercent+'%',v.changedRGBPixels);
for(const key of Object.keys(samples))console.log(key.padEnd(12),report.original[key].median,report.variants.light.palette[key].median,report.variants.nest.palette[key].median,report.original[key].pixels);
console.log(nestPalette);
