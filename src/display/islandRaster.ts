import type {PaintedComponent} from './floatingIslandArt';

/** Adaptive cache keeps the complete old + replacement island and shared kit below 12 MiB.
 * Only ownership changes invoke this; camera events transform the resulting image. */
export function islandCacheScale(components: readonly PaintedComponent[]): number {
  const area=components.reduce((s,c)=>s+(c.bounds.right-c.bounds.left)*(c.bounds.bottom-c.bounds.top),0);
  return Math.min(1,Math.sqrt(890000/Math.max(1,area)));
}
export function islandRaster(component: PaintedComponent, source: (name: string) => HTMLImageElement | HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const b=component.bounds,k=scale,canvas=document.createElement('canvas');
  canvas.width=Math.ceil((b.right-b.left)*k);canvas.height=Math.ceil((b.bottom-b.top)*k);
  if(canvas.width>2048||canvas.height>2048) throw Error('Island cache exceeds texture limit');
  const ctx=canvas.getContext('2d')!;
  ctx.scale(k,k);ctx.translate(-b.left,-b.top);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  // No chunk may occupy a hole or peek through the grassy surface of a concavity.
  ctx.save();ctx.beginPath();ctx.rect(b.left,b.top,b.right-b.left,b.bottom-b.top);
  for(const c of component.collars) {
    ctx.moveTo(c.upper[0].x,c.upper[0].y);
    for(const p of c.upper) ctx.lineTo(p.x,p.y);
    ctx.closePath();
  }
  ctx.clip('evenodd');
  for(const p of component.pieces) ctx.drawImage(source(p.name),p.x,p.y,p.width,p.height);
  ctx.restore();
  const cliff=source('cliff'),pattern=ctx.createPattern(cliff,'repeat')!;
  for(const c of component.collars) {
    let distance=0;
    for(let i=0;i<c.upper.length;i++) {
      const j=(i+1)%c.upper.length,a=c.upper[i],z=c.upper[j],d=c.lower[i],e=c.lower[j];
      const dx=z.x-a.x,dy=z.y-a.y,len=Math.hypot(dx,dy);
      // Overlap clips by two world units: adjacent antialiased Canvas clips otherwise leave hairlines.
      const ox=dx/len*2,oy=dy/len*2;
      ctx.save();ctx.beginPath();ctx.moveTo(a.x-ox,a.y-oy-1);ctx.lineTo(z.x+ox,z.y+oy-1);ctx.lineTo(e.x+ox,e.y+oy+1);ctx.lineTo(d.x-ox,d.y-oy+1);ctx.closePath();ctx.clip();
      // Continuous arclength UVs follow rounded corners without stamping individual rectangular rocks.
      const repeat=460,sy=cliff.height;
      ctx.transform(dx/len,dy/len,(d.x-a.x)/sy,(d.y-a.y)/sy,a.x,a.y);
      ctx.scale(repeat/cliff.width,1);ctx.translate(-distance*cliff.width/repeat,0);
      // A curved lower edge extends beyond the local affine rectangle: overdraw the clipped quad.
      ctx.fillStyle=pattern;ctx.fillRect(distance*cliff.width/repeat-32,-32,len*cliff.width/repeat+64,sy+96);
      ctx.restore();distance+=len;
    }
  }
  return canvas;
}
