// Node built-ins only. Exact source SHA-1, chroma extraction, fringe decontamination,
// premultiplied integer 2x foundation reduction, and byte-for-byte derivative validation.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {decodePng,encodePng} from './derive-nursery-overlays.mjs';
import {inflateSync} from 'node:zlib';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const SOURCE_SHA1='c023d410093741dc5618e7ef10a826143f32c9ac';
export const FOUNDATION_SHA1='5cde054efe4b411762d3dffa7544fd436e0b83ee';
export const CROPS={cliff:[64,214,464,82],'chunk-wide':[602,74,420,384],'chunk-round':[1094,80,410,350],'chunk-deep':[145,485,300,460],'islet-wide':[590,565,400,360],'islet-small':[1110,585,360,310],foundation:[16,224,1504,608]};
const sha=b=>createHash('sha1').update(b).digest('hex');
// Built-in generator returns an RGB PNG on a key background; retain its original bytes.
function decodeSource(file) {
  if(file[25]===6)return decodePng(file);
  if(file[24]!==8||file[25]!==2||file[28]!==0)throw Error('Expected 8-bit noninterlaced RGB/RGBA PNG');
  const width=file.readUInt32BE(16),height=file.readUInt32BE(20),parts=[];
  for(let p=8;p<file.length;) {const n=file.readUInt32BE(p);if(file.toString('ascii',p+4,p+8)==='IDAT')parts.push(file.subarray(p+8,p+8+n));p+=n+12;}
  const data=inflateSync(Buffer.concat(parts)),stride=width*3,rgb=Buffer.alloc(stride*height),pixels=Buffer.alloc(width*height*4,255);
  for(let y=0;y<height;y++)for(let x=0;x<stride;x++) {
    const f=data[y*(stride+1)],v=data[y*(stride+1)+1+x],a=x>=3?rgb[y*stride+x-3]:0,b=y?rgb[(y-1)*stride+x]:0,c=y&&x>=3?rgb[(y-1)*stride+x-3]:0;
    const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
    const predictor=f===1?a:f===2?b:f===3?(a+b)>>1:f===4?(pa<=pb&&pa<=pc?a:pb<=pc?b:c):0;
    rgb[y*stride+x]=(v+predictor)&255;
  }
  for(let i=0;i<width*height;i++)for(let c=0;c<3;c++)pixels[i*4+c]=rgb[i*3+c];
  return {width,height,pixels};
}
function extract(img,[x0,y0,width,height],cliff,repairPale=false) {
  const pixels=Buffer.alloc(width*height*4),delta=(i)=>Math.max(255-img.pixels[i],img.pixels[i+1],255-img.pixels[i+2]);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const s=((y+y0)*img.width+x+x0)*4,d=(y*width+x)*4;
    const diff=delta(s);let a=diff<=6?0:1,edgeColor=-1;
    if(diff>6&&(diff<150||Math.min(img.pixels[s],img.pixels[s+2])-img.pixels[s+1]>16)) {
      let best=Infinity,near=-1;
      for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++) {
        const xx=x+x0+dx,yy=y+y0+dy;if(xx<0||yy<0||xx>=img.width||yy>=img.height)continue;
        const n=(yy*img.width+xx)*4,dist=dx*dx+dy*dy;
        if(delta(n)>=150&&Math.min(img.pixels[n],img.pixels[n+2])-img.pixels[n+1]<16&&dist<best){near=n;best=dist;}
      }
      if(near>=0) {
        edgeColor=near;
        const v=[img.pixels[near]-255,img.pixels[near+1],img.pixels[near+2]-255];
        a=Math.max(0,Math.min(1,((img.pixels[s]-255)*v[0]+img.pixels[s+1]*v[1]+(img.pixels[s+2]-255)*v[2])/(v[0]**2+v[1]**2+v[2]**2)));
      } else a=Math.min(img.pixels[s],img.pixels[s+2])-img.pixels[s+1]>32?0:Math.max(0,Math.min(1,(diff-6)/144));
    }
    pixels[d+3]=Math.round(a*255);
    if(a>0) for(let c=0;c<3;c++) pixels[d+c]=Math.max(0,Math.min(255,Math.round((img.pixels[s+c]-(c===1?0:255)*(1-a))/a)));
    // Propagate clean foreground colour into antialiased fringes; never retain saturated key spill.
    if(a>0&&edgeColor>=0&&a<.99)for(let c=0;c<3;c++)pixels[d+c]=img.pixels[edgeColor+c];
  }
  cleanRock({width,height,pixels},repairPale);
  if(cliff) {
    // Periodic crossfade makes the strip truly tileable, including decoded edge pixels.
    const overlap=64,w=width-overlap,out=Buffer.alloc(w*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++) {
      const t=x<overlap?x/(overlap-1):1;
      out[(y*w+x)*4+c]=Math.round(pixels[(y*width+x)*4+c]*t+pixels[(y*width+x+w)*4+c]*(1-t));
      if(x>=overlap)out[(y*w+x)*4+c]=pixels[(y*width+x)*4+c];
    }
    return {width:w,height,pixels:out};
  }
  return {width,height,pixels};
}
/** Recover rock colours from the nearest uncontaminated foreground, including
 * pale magenta baked into the source. Fill enclosed key holes, never the sky
 * connected to the crop boundary. No erosion of roots or silhouette. */
export function cleanRock({width,height,pixels},repairPale=false) {
  const count=width*height,nearest=new Int32Array(count).fill(-1),queue=new Int32Array(count);
  const adjacent=(i,visit)=>{const x=i%width;if(x)visit(i-1);if(x+1<width)visit(i+1);if(i>=width)visit(i-width);if(i+width<count)visit(i+width);};
  let head=0,tail=0;
  // The deep source contains an almost white lavender inclusion. Once stretched
  // under the cliff it reads as a sky hole; replace that inclusion with rock.
  const pale=p=>repairPale&&pixels[p]>225&&pixels[p+1]>210&&pixels[p+2]>210;
  for(let i=0;i<count;i++) {
    const p=i*4;
    if(pixels[p+3]>=250&&pixels[p+2]<=pixels[p+1]+8&&!pale(p)) {nearest[i]=i;queue[tail++]=i;}
  }
  while(head<tail) {const i=queue[head++];adjacent(i,n=>{if(nearest[n]<0){nearest[n]=nearest[i];queue[tail++]=n;}});}
  const exterior=new Uint8Array(count);head=0;tail=0;
  const sky=i=>{if(!exterior[i]&&pixels[i*4+3]<250){exterior[i]=1;queue[tail++]=i;}};
  for(let x=0;x<width;x++){sky(x);sky((height-1)*width+x);}
  for(let y=0;y<height;y++){sky(y*width);sky(y*width+width-1);}
  while(head<tail)adjacent(queue[head++],sky);
  for(let i=0;i<count;i++) {
    const p=i*4,n=nearest[i]*4;if(n<0)continue;
    const hole=!exterior[i]&&pixels[p+3]<250;
    const spill=pixels[p+2]>pixels[p+1]+8;
    if(hole||spill||pale(p)||pixels[p+3]<250)for(let c=0;c<3;c++)pixels[p+c]=pixels[n+c];
    if(hole)pixels[p+3]=255;
    if(!pixels[p+3])pixels.fill(0,p,p+4);
  }
}
// The deep source's inset crystal was malformed: opaque pink/dark horizontal
// bars and a pale glint. It is an inclusion in this piece, not a collar gap.
// Replace its complete local region with adjacent intact sandstone.
function repairDeepInclusion(img) {
 const {width,pixels}=img,original=Buffer.from(pixels);
 // Cover the complete generated crystal, including its horizontal bars and glint.
 // Sample the adjacent intact sandstone face; feather only inside the local oval.
 for(let y=149;y<250;y++)for(let x=80;x<144;x++) {
  const radius=Math.hypot((x-111)/30,(y-199)/49);if(radius>=1)continue;
  const weight=Math.min(1,(1-radius)*8),p=(y*width+x)*4;
  const sample=((y+7)*width+x+65)*4;
  for(let c=0;c<3;c++)pixels[p+c]=Math.round(original[p+c]*(1-weight)+original[sample+c]*weight);
  pixels[p+3]=255;
 }
 return img;
}
function halve(img) {
  const width=img.width/2,height=img.height/2,pixels=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    let a=0;const rgb=[0,0,0];
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++) {const s=((y*2+dy)*img.width+x*2+dx)*4,v=img.pixels[s+3];a+=v;for(let c=0;c<3;c++)rgb[c]+=img.pixels[s+c]*v;}
    const d=(y*width+x)*4;pixels[d+3]=Math.round(a/4);if(a)for(let c=0;c<3;c++)pixels[d+c]=Math.round(rgb[c]/a);
  }
  return {width,height,pixels};
}
export function deriveIsland() {
  const source=readFileSync(join(root,'assets-source/island/underside/kit-v2.png'));
  if(sha(source)!==SOURCE_SHA1)throw Error('Island source SHA-1 differs from approved generation');
  const foundation=readFileSync(join(root,'assets-source/island/underside/foundation-v3.png'));
  if(sha(foundation)!==FOUNDATION_SHA1)throw Error('Island foundation SHA-1 differs from approved generation');
  const foundationImage=decodeSource(foundation);
  const image=decodeSource(source),check=process.argv.includes('--check'),dir=join(root,'public/assets/island');
  if(!check)mkdirSync(dir,{recursive:true});
  let disk=0,gpu=0;
  for(const [name,crop] of Object.entries(CROPS)) {
    const raw=extract(name==='foundation'?foundationImage:image,crop,name==='cliff',name==='chunk-deep');
    if(name==='chunk-deep')repairDeepInclusion(raw);
    const derived=name==='foundation'?halve(raw):raw,png=encodePng(derived),file=join(dir,name+'.png');
    if(Math.max(derived.width,derived.height)>2048)throw Error('Island piece exceeds 2048px');
    if(check) {if(sha(readFileSync(file))!==sha(png))throw Error('Island derivative missing or altered: '+name);}
    else writeFileSync(file,png);
    disk+=png.length;gpu+=derived.width*derived.height*4;
    console.log(`${check?'ok':'wrote'} ${name}: ${derived.width}x${derived.height}, ${png.length} bytes, SHA-1 ${sha(png)}`);
  }
  // Leaves enough room for BOTH adaptive component caches during atomic replacement.
  if(disk>3*1024**2||gpu>4000000)throw Error('Island kit budget exceeded');
  console.log(JSON.stringify({diskBytes:disk,kitGpuBytes:gpu}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))deriveIsland();
