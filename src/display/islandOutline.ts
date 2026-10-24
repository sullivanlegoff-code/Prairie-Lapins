import {PARCELS, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';

export interface OutlinePoint {x: number; y: number}
export interface OutlineEdge {a: OutlinePoint; b: OutlinePoint; normal: OutlinePoint}
export interface IslandLoop {points: OutlinePoint[]; edges: OutlineEdge[]; hole: boolean}
export interface IslandComponent {ids: ParcelId[]; loops: IslandLoop[]}
export const parcelSetKey = (ids: readonly ParcelId[]): string => [...new Set(ids)].sort().join('|');
const key = (p: OutlinePoint) => `${p.x},${p.y}`;
const delta = (a: OutlinePoint, b: OutlinePoint) => ({x: b.x - a.x, y: b.y - a.y});
const cross = (a: OutlinePoint, b: OutlinePoint) => a.x * b.y - a.y * b.x;
export const signedArea = (p: readonly OutlinePoint[]): number => p.reduce((s, a, i) => s + cross(a, p[(i + 1) % p.length]), 0) / 2;

/** Owned land is always on the right of an oriented edge (screen-like, downward Y).
 * Opposite shared edges cancel; right turns disambiguate a corner touching a hole.
 * Pure presentation geometry: no dependence on Phaser, coastal rendering or a worker. */
export function islandOutline(ids: readonly ParcelId[]): IslandComponent[] {
  const remaining = new Set(parcelSetKey(ids).split('|').filter(Boolean) as ParcelId[]), result: IslandComponent[] = [];
  while (remaining.size) {
    const group = [remaining.values().next().value!]; remaining.delete(group[0]);
    for (let i = 0; i < group.length; i++) for (const q of remaining) {
      const p = PARCELS[group[i]], r = PARCELS[q];
      if (Math.abs(p.x - r.x) + Math.abs(p.y - r.y) === ISLAND.parcelCells) {remaining.delete(q); group.push(q);}
    }
    group.sort();
    const exposed = new Map<string, {a: OutlinePoint; b: OutlinePoint}>();
    for (const id of group) {
      const parcel = PARCELS[id], x = ISLAND.originX + parcel.x * ISLAND.cellWidth, y = ISLAND.originY + parcel.y * ISLAND.cellDepth;
      const p = [{x, y}, {x: x + ISLAND.parcelWidth, y}, {x: x + ISLAND.parcelWidth, y: y + ISLAND.parcelDepth}, {x, y: y + ISLAND.parcelDepth}];
      p.forEach((a, i) => {const b = p[(i + 1) % 4], reverse = `${key(b)}>${key(a)}`;
        if (exposed.has(reverse)) exposed.delete(reverse); else exposed.set(`${key(a)}>${key(b)}`, {a, b});});
    }
    const loops: IslandLoop[] = [];
    while (exposed.size) {
      let edge = exposed.values().next().value!;
      const points: OutlinePoint[] = [], start = key(edge.a);
      do {
        points.push(edge.a); exposed.delete(`${key(edge.a)}>${key(edge.b)}`);
        if (key(edge.b) === start) break;
        const direction = delta(edge.a, edge.b);
        const choices = [...exposed.values()].filter(e => key(e.a) === key(edge.b));
        const rank = (e: typeof edge) => {const c = cross(direction, delta(e.a, e.b)); return c > 0 ? 0 : c === 0 ? 1 : 2;};
        choices.sort((a, b) => rank(a) - rank(b));
        if (!choices.length) throw Error('Unclosed island boundary');
        edge = choices[0];
      } while (true);
      for (let i = points.length - 1; i >= 0; i--) {
        if (cross(delta(points[(i + points.length - 1) % points.length], points[i]), delta(points[i], points[(i + 1) % points.length])) === 0) points.splice(i, 1);
      }
      loops.push({points, hole: signedArea(points) < 0, edges: points.map((a, i) => {
        const b = points[(i + 1) % points.length], d = delta(a, b), length = Math.hypot(d.x, d.y);
        return {a, b, normal: {x: d.y / length, y: -d.x / length}};
      })});
    }
    result.push({ids: group, loops});
  }
  return result;
}

/** Presentation-only rounded boundary, in ground coordinates. Quadratic fillets soften
 * both turns; a small continuous wave leaves parcel joins invisible. */
export function organicLoop(loop: IslandLoop): OutlinePoint[] {
  const radius = 58, result: OutlinePoint[] = [];
  const lerp = (a: OutlinePoint, b: OutlinePoint, t: number) => ({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  const cut = (a: OutlinePoint, b: OutlinePoint) => lerp(a,b,Math.min(radius/Math.hypot(b.x-a.x,b.y-a.y),.22));
  for (let i=0;i<loop.points.length;i++) {
    const a=loop.points[i], prev=loop.points[(i+loop.points.length-1)%loop.points.length], b=loop.points[(i+1)%loop.points.length];
    const entry=cut(a,prev), exit=cut(a,b), next=cut(b,a);
    for(let j=0;j<9;j++) {const t=j/9;result.push(lerp(lerp(entry,a,t),lerp(a,exit,t),t));}
    const length=Math.hypot(next.x-exit.x,next.y-exit.y), count=Math.ceil(length/18);
    for(let j=0;j<count;j++) {
      const t=j/count,p=lerp(exit,next,t), wave=Math.sin(t*Math.PI)**2*(Math.sin(p.x/53+p.y/71)*7+Math.sin(p.x/21-p.y/37)*2.2);
      result.push({x:p.x+(b.y-a.y)/Math.hypot(b.x-a.x,b.y-a.y)*wave,y:p.y-(b.x-a.x)/Math.hypot(b.x-a.x,b.y-a.y)*wave});
    }
  }
  return result;
}
