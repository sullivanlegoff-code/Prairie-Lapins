import type {ParcelId} from '../config/land';
import {VISUAL} from '../config/visual';
import {toScreen} from '../ui/projection';
import type {WorldBounds} from '../ui/gestures';
import {islandOutline, organicLoop, parcelSetKey, type OutlinePoint as Point} from './islandOutline';

export type IslandPaint = {kind: 'ellipse'; x: number; y: number; width: number; height: number; color: number; alpha: number}
  | {kind: 'line'; points: Point[]; width: number; color: number; alpha: number};
export interface RockPiece {name: string; x: number; y: number; width: number; height: number}
export interface RockCollar {upper: Point[]; lower: Point[]; hole: boolean}
export interface PaintedComponent {collars: RockCollar[]; pieces: RockPiece[]; bounds: WorldBounds}
export interface FloatingIslandArt {paint: IslandPaint[]; rim: IslandPaint[]; components: PaintedComponent[]; bounds: WorldBounds; bytes: number}
export const FLOATING_MARGIN = {left: VISUAL.ground.floatingRim, right: VISUAL.ground.floatingRim, top: VISUAL.ground.floatingRim, bottom: VISUAL.ground.floatingDepth} as const;
const mix = (a: Point, b: Point, t: number): Point => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});
const hash = (s: string) => {let n = 2166136261; for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0;};
const noise = (x: number, seed: number) => {const n = Math.sin(x * 127.1 + seed % 10007) * 43758.5453; return n - Math.floor(n);};
const envelope = (points: Point[]): WorldBounds => points.length ? {left: Math.min(...points.map(p=>p.x))-8,right: Math.max(...points.map(p=>p.x))+8,top: Math.min(...points.map(p=>p.y))-8,bottom: Math.max(...points.map(p=>p.y))+8} : {left:0,right:0,top:0,bottom:0};

/** Immutable layout, rebuilt only when the owned parcel set changes. Units are projected screen-world units. */
export function floatingIslandArt(ids: readonly ParcelId[]): FloatingIslandArt {
  const paint: IslandPaint[] = [], rim: IslandPaint[] = [], components: PaintedComponent[] = [];
  let target = paint;
  const ellipse = (x: number, y: number, width: number, height: number, color: number, alpha = 1) => target.push({kind: 'ellipse' as const, x, y, width, height, color, alpha});
  const line = (points: Point[], width: number, color: number, alpha = 1) => target.push({kind: 'line' as const, points, width, color, alpha});
  for (const component of islandOutline(ids)) {
    const seed=hash(parcelSetKey(component.ids)), all=component.loops.flatMap(l=>l.points.map(toScreen));
    const left=Math.min(...all.map(p=>p.x)),right=Math.max(...all.map(p=>p.x)),bottom=Math.max(...all.map(p=>p.y));
    const center=(left+right)/2,span=right-left,depth=Math.min(440,265+component.ids.length*20);
    const pieces: RockPiece[]=[],collars: RockCollar[]=[];
    const faces=component.loops.flatMap(l=>l.edges.map(e=>({...e,hole:l.hole,a:toScreen(e.a),b:toScreen(e.b)})))
      .filter(e=>e.b.x<e.a.x).sort((a,b)=>(a.a.y+a.b.y)-(b.a.y+b.b.y));
    for (const edge of faces) {
      if(edge.hole) continue;
      pieces.push({name:'foundation',x:edge.b.x+5,y:edge.b.y+26,width:edge.a.x-edge.b.x-10,height:depth*1.05});
      const count=3;
      for(let i=0;i<count;i++) {
        const p=mix(edge.a,edge.b,(i+.5)/count),central=Math.max(0,1-Math.abs(p.x-center)/(span/2));
        const width=(edge.a.x-edge.b.x)/count*1.45;
        const height=depth*(.40+.46*central)*(.91+noise(i+edge.a.y,seed)*.13);
        const x=Math.max(edge.b.x+5,Math.min(edge.a.x-width-5,p.x-width/2));
        pieces.push({name:['chunk-wide','chunk-round','chunk-deep'][(i+seed)%3],x,y:p.y+28,width,height});
      }
    }
    pieces.sort((a,b)=>b.height-a.height);
    const loops=component.loops.map(l=>({...l,rounded:organicLoop(l).map(toScreen)}));
    for(const l of loops) {
      const upper=l.rounded;
      const lower=upper.map((p,i)=>{
        const prev=upper[(i+upper.length-1)%upper.length],next=upper[(i+1)%upper.length];
        const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy);
        return {x:p.x+dy/len*25,y:p.y-dx/len*25+66};
      });
      collars.push({upper,lower,hole:l.hole});
      // Plush turf is drawn ABOVE the plateau but below all upright objects.
      target=rim;
      const closed=[...upper,upper[0]];
      line(closed.map(p=>({x:p.x,y:p.y+11})),30,0x536b38,.12);
      line(closed.map(p=>({x:p.x,y:p.y+7})),29,0x76b45b);
      line(closed,29,0xa7d46e);
      line(closed.map(p=>({x:p.x-2,y:p.y-3})),17,0xc7e58b);
      line(closed.map(p=>({x:p.x-3,y:p.y-6})),5,0xe5f1aa,.65);
      for(let i=0;i<upper.length;i++) {
        const p=upper[i],r=noise(p.x+p.y,seed);
        ellipse(p.x+Math.sin(p.y)*2,p.y+7+r*3,17+r*17,13+r*7,0xaad774);
        ellipse(p.x-2,p.y-1,15+r*14,10+r*5,0xc7e58b);
        if(i%6===0) {
          line([{x:p.x-5,y:p.y},{x:p.x-7,y:p.y-9},{x:p.x-1,y:p.y-3},{x:p.x+4,y:p.y-11}],2,0x70a95b);
          if(r>.40) {
            const color=r>.8?0xf4b5c5:r>.65?0xffdf87:0xfffbed;
            for(let j=0;j<5;j++) ellipse(p.x+Math.cos(j*Math.PI*.4)*3,p.y-6+Math.sin(j*Math.PI*.4)*3,4,4,color);
            ellipse(p.x,p.y-6,3,3,0xe6b855);
          }
        }
      }
      target=paint;
    }

    for(let i=0;i<2;i++) {
      const side=i===0?-1:1,width=42+i*12;
      pieces.push({name:i===0?'islet-wide':'islet-small',x:center+side*span*.36-width/2,y:bottom+depth*(.72+i*.17),width,height:width*.95});
    }
    const points=[...collars.flatMap(c=>[...c.upper,...c.lower]),...pieces.flatMap(p=>[{x:p.x,y:p.y},{x:p.x+p.width,y:p.y+p.height}])];
    components.push({collars,pieces,bounds:envelope(points)});
    for(let i=4;i>0;i--) ellipse(center,bottom+depth+22,span*(.36+i*.035),10+i*10,0xcde3df,.015);
  }
  const points=[...paint,...rim].flatMap(p=>p.kind==='ellipse'?[{x:p.x-p.width/2,y:p.y-p.height/2},{x:p.x+p.width/2,y:p.y+p.height/2}]:p.points);
  points.push(...components.flatMap(c=>[{x:c.bounds.left,y:c.bounds.top},{x:c.bounds.right,y:c.bounds.bottom}]));
  const bytes=[...paint,...rim].reduce((s,p)=>s+160+(p.kind==='ellipse'?32*16:p.points.length*64),0)
    +components.reduce((s,c)=>s+c.collars.reduce((n,l)=>n+l.upper.length*256,0)+c.pieces.length*128,0);
  return {paint,rim,components,bounds:envelope(points),bytes};
}
