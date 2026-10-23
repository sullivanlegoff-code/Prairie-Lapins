import {PARCELS, type LandState, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';

/** Presentation geometry only; no collider, placement or save consumes these polygons. */
export interface EdgePoint {x: number; y: number}
export interface PlateauRect {id: ParcelId; left: number; top: number; right: number; bottom: number}
export type EdgePolygon = EdgePoint[];
export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';
export const EDGE_LAYERS = ['water', 'foam', 'sand', 'earth', 'soilHighlight', 'soilBand', 'lip', 'grass'] as const;
type EdgeLayer = typeof EDGE_LAYERS[number];
export interface EdgePaint {poly: EdgePolygon; color: number}
export interface EdgeRun {a: EdgePoint; b: EdgePoint; side: EdgeSide; temporary: boolean}
export interface EdgeAccent {id: string; side: EdgeSide; temporary: boolean; kind: 'bush' | 'stone' | 'grass' | 'mound'; paint: EdgePaint[]}
export interface TerrainEdges {
  rects: PlateauRect[]; runs: EdgeRun[]; layers: Record<EdgeLayer, EdgePolygon[]>;
  accents: EdgeAccent[]; strata: EdgePaint[];
}
const cross = (a: EdgePoint, b: EdgePoint) => a.x * b.y - a.y * b.x;
const sub = (a: EdgePoint, b: EdgePoint): EdgePoint => ({x: a.x - b.x, y: a.y - b.y});
const key = (p: EdgePoint) => `${p.x},${p.y}`;
export const terrainHash = (x: number, y: number) => {const a = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return a - Math.floor(a);};
export const plateauRect = (id: ParcelId): PlateauRect => {
  const p = PARCELS[id], left = ISLAND.originX + p.x * ISLAND.cellWidth, top = ISLAND.originY + p.y * ISLAND.cellDepth;
  return {id, left, top, right: left + ISLAND.parcelWidth, bottom: top + ISLAND.parcelDepth};
};
export const edgeEllipse = (x: number, y: number, rx: number, ry: number, n = 22): EdgePolygon => Array.from({length: n}, (_, i) =>
  ({x: x + Math.cos(i / n * Math.PI * 2) * rx, y: y + Math.sin(i / n * Math.PI * 2) * ry}));

/** Exact clipping, also used to keep patches on their rectangular playable top. */
export function clipToRect(poly: EdgePolygon, r: Omit<PlateauRect, 'id'>): EdgePolygon {
  let out = poly;
  for (const [axis, edge, sign] of [['x', r.left, 1], ['x', r.right, -1], ['y', r.top, 1], ['y', r.bottom, -1]] as const) {
    const input = out; out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length], da = sign * (a[axis] - edge), db = sign * (b[axis] - edge);
      if (da >= 0) out.push(a);
      if ((da < 0) !== (db < 0)) {const t = da / (da - db); out.push({x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y)});}
    }
  }
  return out;
}
export const polygonArea = (poly: EdgePolygon) => Math.abs(poly.reduce((sum, p, i) => sum + cross(p, poly[(i + 1) % poly.length]), 0)) / 2;
export function containsEdgePoint(poly: EdgePolygon, p: EdgePoint): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
const outsideOwned = (poly: EdgePolygon, rects: PlateauRect[]) => rects.every(r =>
  poly.every(p => p.x <= r.left) || poly.every(p => p.x >= r.right) || poly.every(p => p.y <= r.top) || poly.every(p => p.y >= r.bottom) ||
  polygonArea(clipToRect(poly, r)) < 1e-7);

/** Side-connected components; sorted inputs make contours independent of purchase order. */
function components(ids: readonly ParcelId[]): ParcelId[][] {
  const left = new Set([...ids].sort()), out: ParcelId[][] = [];
  while (left.size) {
    const group: ParcelId[] = [], queue = [left.values().next().value!]; left.delete(queue[0]);
    while (queue.length) {
      const id = queue.shift()!, p = PARCELS[id]; group.push(id);
      for (const q of left) if (Math.abs(PARCELS[q].x - p.x) + Math.abs(PARCELS[q].y - p.y) === ISLAND.parcelCells) {left.delete(q); queue.push(q);}
    }
    out.push(group.sort());
  }
  return out;
}
/** Cancel shared edges, trace oriented loops (including holes), then merge collinear edges. */
function boundary(ids: ParcelId[]): EdgePoint[][] {
  const edges = new Map<string, {a: EdgePoint; b: EdgePoint}>();
  for (const id of ids) {
    const r = plateauRect(id), p = [{x: r.left, y: r.top}, {x: r.right, y: r.top}, {x: r.right, y: r.bottom}, {x: r.left, y: r.bottom}];
    for (let i = 0; i < 4; i++) {const a = p[i], b = p[(i + 1) % 4], reverse = key(b) + '>' + key(a);
      if (edges.has(reverse)) edges.delete(reverse); else edges.set(key(a) + '>' + key(b), {a, b});}
  }
  const loops: EdgePoint[][] = [];
  while (edges.size) {
    let e = edges.values().next().value!; const loop: EdgePoint[] = [];
    while (true) {
      loop.push(e.a); edges.delete(key(e.a) + '>' + key(e.b));
      const choices = [...edges.values()].filter(q => key(q.a) === key(e.b)); if (!choices.length) break;
      const d = sub(e.b, e.a), rank = (q: typeof e) => {const c = cross(d, sub(q.b, q.a)); return c > 0 ? 0 : c === 0 ? 1 : 2;};
      choices.sort((a, b) => rank(a) - rank(b)); e = choices[0];
    }
    let changed = true;
    while (changed && loop.length > 3) {changed = false;
      for (let i = 0; i < loop.length; i++) if (cross(sub(loop[i], loop[(i + loop.length - 1) % loop.length]), sub(loop[(i + 1) % loop.length], loop[i])) === 0) {
        loop.splice(i, 1); changed = true; break;
      }
    }
    loops.push(loop);
  }
  return loops;
}

const wave = (t: number) => .64 * Math.sin(t / 157 + .4) + .25 * Math.sin(t / 293 + 1.2) + .11 * Math.sin(t / 69 - .5);
/** Approved B profiles in ground-world units. Grass lip stays narrow; relief is outside the rectangles. */
export function edgeProfile(side: EdgeSide, t: number): Record<EdgeLayer, number> {
  const n = wave(t), m = Math.sin(t / 229 + 1.8);
  if (side === 'bottom') {const grass = 5.5 + 1.5 * n, earth = 41 + 11 * n, sand = earth + 42 + 19 * m;
    return {grass, lip: grass + 1.5, earth, soilHighlight: earth - 5, soilBand: grass + (earth - grass) * .38, sand, foam: sand + 3, water: sand + 19};}
  if (side === 'left') {const grass = 4 + 1.2 * n, earth = 23 + 4 * n, sand = earth + 29 + 10 * m;
    return {grass, lip: grass + 1, earth, soilHighlight: earth - 3, soilBand: grass + (earth - grass) * .44, sand, foam: sand + 2.5, water: sand + 14};}
  const grass = side === 'top' ? 3 + n : 4 + n, earth = grass + 2, sand = earth + 1;
  return {grass, lip: grass + .7, earth, soilHighlight: earth, soilBand: earth, sand, foam: sand + 1, water: sand + 5};
}

function accentPaint(kind: EdgeAccent['kind'], c: EdgePoint, scale: number): EdgePaint[] {
  const paint: EdgePaint[] = [], add = (poly: EdgePolygon, color: number) => paint.push({poly, color});
  if (kind === 'bush') {
    add(edgeEllipse(c.x, c.y + 8, 30 * scale, 9 * scale), 0xa3ba77);
    for (const [dx, dy, rx, ry] of [[-17, 0, 14, 12], [0, -9, 20, 18], [19, 2, 14, 12]]) add(edgeEllipse(c.x + dx * scale, c.y + dy * scale, rx * scale, ry * scale), 0x86ad65);
    for (const [dx, dy, rx, ry] of [[-16, -3, 12, 9], [0, -12, 17, 13], [18, 0, 11, 9]]) add(edgeEllipse(c.x + dx * scale, c.y + dy * scale, rx * scale, ry * scale), 0xa2c57b);
    add(edgeEllipse(c.x - 5 * scale, c.y - 18 * scale, 10 * scale, 4 * scale), 0xcee0a2);
  } else if (kind === 'stone') {
    add(edgeEllipse(c.x, c.y + 3, 16 * scale, 7 * scale), 0xc8b88e);
    add([{x: c.x - 14 * scale, y: c.y + 4 * scale}, {x: c.x - 10 * scale, y: c.y - 6 * scale}, {x: c.x + 2 * scale, y: c.y - 10 * scale},
      {x: c.x + 13 * scale, y: c.y - 2 * scale}, {x: c.x + 15 * scale, y: c.y + 5 * scale}], 0xbbb8a5);
    add(edgeEllipse(c.x - 3 * scale, c.y - 5 * scale, 6 * scale, 3 * scale), 0xe0dcca);
  } else if (kind === 'mound') {
    add(edgeEllipse(c.x, c.y + 3, 24 * scale, 9 * scale), 0xb9a77c); add(edgeEllipse(c.x, c.y, 24 * scale, 10 * scale), 0xabc37d);
    add(edgeEllipse(c.x - 5 * scale, c.y - 3 * scale, 13 * scale, 4 * scale), 0xc4d58d);
  } else {
    add(edgeEllipse(c.x, c.y + 2, 11 * scale, 4 * scale), 0xabc37d);
    add([{x: c.x - 10 * scale, y: c.y + 3 * scale}, {x: c.x - 6 * scale, y: c.y - 5 * scale}, {x: c.x - 2 * scale, y: c.y + scale},
      {x: c.x + 2 * scale, y: c.y - 7 * scale}, {x: c.x + 5 * scale, y: c.y + scale}, {x: c.x + 10 * scale, y: c.y - 3 * scale}, {x: c.x + 10 * scale, y: c.y + 3 * scale}], 0xa2bc75);
  }
  return paint;
}

export function terrainEdges(state: Pick<LandState, 'acquiredParcels'>): TerrainEdges {
  const rects = [...state.acquiredParcels].sort().map(plateauRect);
  const layers: TerrainEdges['layers'] = {water: [], foam: [], sand: [], earth: [], soilHighlight: [], soilBand: [], lip: [], grass: []};
  const accents: EdgeAccent[] = [], runs: EdgeRun[] = [], strata: EdgePaint[] = [];
  const occupied = (p: EdgePoint) => rects.some(r => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom);
  for (const ids of components(state.acquiredParcels)) for (const loop of boundary(ids)) {
    const edges = loop.map((a, i) => {const b = loop[(i + 1) % loop.length], d = sub(b, a), length = Math.hypot(d.x, d.y);
      return {a, b, length, n: {x: d.y / length, y: -d.x / length}, side: (d.x > 0 ? 'top' : d.x < 0 ? 'bottom' : d.y > 0 ? 'right' : 'left') as EdgeSide};});
    const convex = edges.map((e, i) => {const prev = edges[(i + edges.length - 1) % edges.length];
      return cross(sub(prev.b, prev.a), sub(e.b, e.a)) > 0 && !occupied({x: e.a.x + (prev.n.x + e.n.x) * .1, y: e.a.y + (prev.n.y + e.n.y) * .1});});
    const width = (e: typeof edges[number], i: number, t: number, layer: EdgeLayer) => {
      const at = e.a.x === e.b.x ? e.a.y + (e.b.y - e.a.y) * t : e.a.x + (e.b.x - e.a.x) * t;
      let v = edgeProfile(e.side, at)[layer];
      // A concavity or diagonal contact pinches the entire collar, not the playable rectangle.
      if (!convex[i]) v = Math.min(v, .43 * t * e.length);
      if (!convex[(i + 1) % edges.length]) v = Math.min(v, .43 * (1 - t) * e.length);
      return Math.max(0, v);
    };
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i], point = (t: number, d: number): EdgePoint => ({x: e.a.x + (e.b.x - e.a.x) * t + e.n.x * d, y: e.a.y + (e.b.y - e.a.y) * t + e.n.y * d});
      const count = Math.ceil(e.length / 8); runs.push({a: e.a, b: e.b, side: e.side, temporary: e.side === 'top' || e.side === 'right'});
      for (const layer of EDGE_LAYERS) layers[layer].push([e.a, e.b, ...Array.from({length: count + 1}, (_, j) => point(j / count, width(e, i, j / count, layer))).reverse()]);
      if (convex[i]) {
        const previous = (i + edges.length - 1) % edges.length, prev = edges[previous];
        for (const layer of EDGE_LAYERS) {const d1 = width(prev, previous, 1, layer), d2 = width(e, i, 0, layer);
          layers[layer].push([e.a, ...Array.from({length: 25}, (_, j) => {const a = j / 24 * Math.PI / 2;
            return {x: e.a.x + prev.n.x * d1 * Math.cos(a) + e.n.x * d2 * Math.sin(a), y: e.a.y + prev.n.y * d1 * Math.cos(a) + e.n.y * d2 * Math.sin(a)};})]);}
      }
      const horizontal = e.a.y === e.b.y, from = Math.min(horizontal ? e.a.x : e.a.y, horizontal ? e.b.x : e.b.y), to = Math.max(horizontal ? e.a.x : e.a.y, horizontal ? e.b.x : e.b.y);
      const strong = e.side === 'bottom' || e.side === 'left', spacing = strong ? horizontal ? 205 : 240 : 330, phase = horizontal ? 87 : 113;
      for (let station = Math.ceil((from + 40 - phase) / spacing); phase + station * spacing < to - 40; station++) {
        const pos = phase + station * spacing, t = (pos - (horizontal ? e.a.x : e.a.y)) / (horizontal ? e.b.x - e.a.x : e.b.y - e.a.y);
        const kind = strong ? (['bush', 'stone', 'bush', 'mound'] as const)[((station + (horizontal ? 0 : 1)) % 4 + 4) % 4] : 'grass';
        const earth = width(e, i, t, 'earth'); if (strong ? earth < 20 : earth < 5) continue;
        const d = strong ? kind === 'stone' ? earth + 9 : kind === 'mound' ? earth * .40 : Math.max(earth * .82, 37) : earth * .9;
        const paint = accentPaint(kind, point(t, d), strong ? .85 + .3 * terrainHash(station, horizontal ? 1 : 3) : .42);
        if (paint.every(p => outsideOwned(p.poly, rects))) accents.push({id: `${e.side}:${horizontal ? e.a.y : e.a.x}:${pos}`, side: e.side, temporary: !strong, kind, paint});
      }
    }
  }
  // Reject the prototype's mineral marks where a concave bay pinches the earth slice.
  for (const run of runs.filter(r => r.side === 'bottom' || r.side === 'left')) {
    const horizontal = run.side === 'bottom', from = Math.min(horizontal ? run.a.x : run.a.y, horizontal ? run.b.x : run.b.y), to = Math.max(horizontal ? run.a.x : run.a.y, horizontal ? run.b.x : run.b.y);
    for (let station = Math.ceil((from + 65) / 310); station * 310 < to - 65; station++) {
      const t = station * 310, depth = edgeProfile(run.side, t).earth * .65;
      const poly = horizontal ? edgeEllipse(t, run.a.y + depth, 34, 3) : edgeEllipse(run.a.x - depth, t, 2, 28);
      if (outsideOwned(poly, rects) && poly.every(p => layers.earth.some(surface => containsEdgePoint(surface, p)))) strata.push({poly, color: 0xc4ae84});
    }
  }
  return {rects, runs, layers, accents, strata};
}
