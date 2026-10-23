// Small dependency-free codec for our non-interlaced 8-bit RGB/RGBA artwork.
// Recoloring operates on original straight RGB, preserving every alpha byte.
import {inflateSync, deflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
export function decode(buffer) {
  assert.ok(buffer.subarray(0,8).equals(signature));
  let width,height,channels;const chunks=[];
  for(let at=8;at<buffer.length;){const length=buffer.readUInt32BE(at),type=buffer.toString('ascii',at+4,at+8),data=buffer.subarray(at+8,at+8+length);at+=length+12;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.equal(data[12],0);assert.ok([2,6].includes(data[9]));channels=data[9]===6?4:3;}
    if(type==='IDAT')chunks.push(data);
  }
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,rows=Buffer.alloc(stride*height),rgba=Buffer.alloc(width*height*4);
  assert.equal(raw.length,(stride+1)*height);
  for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];assert.ok(filter<=4);for(let x=0;x<stride;x++){
    const at=y*stride+x,a=x>=channels?rows[at-channels]:0,b=y?rows[at-stride]:0,c=y&&x>=channels?rows[at-stride-channels]:0;
    const prediction=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];rows[at]=(raw[y*(stride+1)+x+1]+prediction)&255;
  }}
  for(let i=0;i<width*height;i++){rows.copy(rgba,i*4,i*channels,i*channels+3);rgba[i*4+3]=channels===4?rows[i*channels+3]:255;}
  return {width,height,rgba};
}
function crc32(data){let c=0xffffffff;for(const byte of data){c^=byte;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([name,data])),out.length-4);return out;}
export function encode({width,height,rgba}) {
  const stride=width*4,raw=Buffer.alloc((stride+1)*height);
  for(let y=0;y<height;y++){
    let best,score=Infinity,bestFilter=0;
    for(let filter=0;filter<=4;filter++){const row=Buffer.alloc(stride);let cost=0;
      for(let x=0;x<stride;x++){const at=y*stride+x,a=x>=4?rgba[at-4]:0,b=y?rgba[at-stride]:0,c=y&&x>=4?rgba[at-stride-4]:0;
        row[x]=(rgba[at]-[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;cost+=Math.min(row[x],256-row[x]);}
      if(cost<score){score=cost;best=row;bestFilter=filter;}
    }
    raw[y*(stride+1)]=bestFilter;best.copy(raw,y*(stride+1)+1);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  return Buffer.concat([signature,chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
