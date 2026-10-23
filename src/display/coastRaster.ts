/** Approved E2 raster kernel. Keep mask math and compositing pixel-equivalent to the validated prototype. */
import { PARCELS, type LandState, type ParcelId } from '../config/land';
import { ISLAND } from '../config/islandGeometry';
/** Presentation geometry only; no collider, placement or save consumes these polygons. */
export interface EdgePoint {
    x: number;
    y: number;
}
export interface PlateauRect {
    id: ParcelId;
    left: number;
    top: number;
    right: number;
    bottom: number;
}
export type EdgePolygon = EdgePoint[];
export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';
export const EDGE_LAYERS = ['water', 'shallows', 'foam', 'sand', 'earth', 'soilHighlight', 'soilBand', 'lip', 'grass'] as const;
type EdgeLayer = typeof EDGE_LAYERS[number];
export interface EdgePaint {
    poly: EdgePolygon;
    color: number;
}
export interface EdgeRun {
    a: EdgePoint;
    b: EdgePoint;
    side: EdgeSide;
    temporary: boolean;
}
export interface EdgeAccent {
    id: string;
    side: EdgeSide;
    temporary: boolean;
    kind: 'stone' | 'wood' | 'dry' | 'pair';
    paint: EdgePaint[];
}
export interface TerrainEdges {
    rects: PlateauRect[];
    runs: EdgeRun[];
    layers: Record<EdgeLayer, EdgePolygon[]>;
    accents: EdgeAccent[];
    strata: EdgePaint[];
}
const cross = (a: EdgePoint, b: EdgePoint) => a.x * b.y - a.y * b.x;
const sub = (a: EdgePoint, b: EdgePoint): EdgePoint => ({ x: a.x - b.x, y: a.y - b.y });
const key = (p: EdgePoint) => `${p.x},${p.y}`;
export const terrainHash = (x: number, y: number) => { const a = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return a - Math.floor(a); };
export const plateauRect = (id: ParcelId): PlateauRect => {
    const p = PARCELS[id], left = ISLAND.originX + p.x * ISLAND.cellWidth, top = ISLAND.originY + p.y * ISLAND.cellDepth;
    return { id, left, top, right: left + ISLAND.parcelWidth, bottom: top + ISLAND.parcelDepth };
};
export const edgeEllipse = (x: number, y: number, rx: number, ry: number, n = 22): EdgePolygon => Array.from({ length: n }, (_, i) => ({ x: x + Math.cos(i / n * Math.PI * 2) * rx, y: y + Math.sin(i / n * Math.PI * 2) * ry }));
/** Exact clipping, also used to keep patches on their rectangular playable top. */
export function clipToRect(poly: EdgePolygon, r: Omit<PlateauRect, 'id'>): EdgePolygon {
    let out = poly;
    for (const [axis, edge, sign] of [['x', r.left, 1], ['x', r.right, -1], ['y', r.top, 1], ['y', r.bottom, -1]] as const) {
        const input = out;
        out = [];
        for (let i = 0; i < input.length; i++) {
            const a = input[i], b = input[(i + 1) % input.length], da = sign * (a[axis] - edge), db = sign * (b[axis] - edge);
            if (da >= 0)
                out.push(a);
            if ((da < 0) !== (db < 0)) {
                const t = da / (da - db);
                out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
            }
        }
    }
    return out;
}
export const polygonArea = (poly: EdgePolygon) => Math.abs(poly.reduce((sum, p, i) => sum + cross(p, poly[(i + 1) % poly.length]), 0)) / 2;
export function containsEdgePoint(poly: EdgePolygon, p: EdgePoint): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x)
            inside = !inside;
    }
    return inside;
}
const outsideOwned = (poly: EdgePolygon, rects: PlateauRect[]) => rects.every(r => poly.every(p => p.x <= r.left) || poly.every(p => p.x >= r.right) || poly.every(p => p.y <= r.top) || poly.every(p => p.y >= r.bottom) ||
    polygonArea(clipToRect(poly, r)) < 1e-7);
/** Side-connected components; sorted inputs make contours independent of purchase order. */
function components(ids: readonly ParcelId[]): ParcelId[][] {
    const left = new Set([...ids].sort()), out: ParcelId[][] = [];
    while (left.size) {
        const group: ParcelId[] = [], queue = [left.values().next().value!];
        left.delete(queue[0]);
        while (queue.length) {
            const id = queue.shift()!, p = PARCELS[id];
            group.push(id);
            for (const q of left)
                if (Math.abs(PARCELS[q].x - p.x) + Math.abs(PARCELS[q].y - p.y) === ISLAND.parcelCells) {
                    left.delete(q);
                    queue.push(q);
                }
        }
        out.push(group.sort());
    }
    return out;
}
/** Cancel shared edges, trace oriented loops (including holes), then merge collinear edges. */
function boundary(ids: ParcelId[]): EdgePoint[][] {
    const edges = new Map<string, {
        a: EdgePoint;
        b: EdgePoint;
    }>();
    for (const id of ids) {
        const r = plateauRect(id), p = [{ x: r.left, y: r.top }, { x: r.right, y: r.top }, { x: r.right, y: r.bottom }, { x: r.left, y: r.bottom }];
        for (let i = 0; i < 4; i++) {
            const a = p[i], b = p[(i + 1) % 4], reverse = key(b) + '>' + key(a);
            if (edges.has(reverse))
                edges.delete(reverse);
            else
                edges.set(key(a) + '>' + key(b), { a, b });
        }
    }
    const loops: EdgePoint[][] = [];
    while (edges.size) {
        let e = edges.values().next().value!;
        const loop: EdgePoint[] = [];
        while (true) {
            loop.push(e.a);
            edges.delete(key(e.a) + '>' + key(e.b));
            const choices = [...edges.values()].filter(q => key(q.a) === key(e.b));
            if (!choices.length)
                break;
            const d = sub(e.b, e.a), rank = (q: typeof e) => { const c = cross(d, sub(q.b, q.a)); return c > 0 ? 0 : c === 0 ? 1 : 2; };
            choices.sort((a, b) => rank(a) - rank(b));
            e = choices[0];
        }
        let changed = true;
        while (changed && loop.length > 3) {
            changed = false;
            for (let i = 0; i < loop.length; i++)
                if (cross(sub(loop[i], loop[(i + loop.length - 1) % loop.length]), sub(loop[(i + 1) % loop.length], loop[i])) === 0) {
                    loop.splice(i, 1);
                    changed = true;
                    break;
                }
        }
        loops.push(loop);
    }
    return loops;
}
/** Approved B profiles in ground-world units. Grass lip stays narrow; relief is outside the rectangles. */
// Irregularly spaced broad control stations with occasional held, nearly straight reaches.
function coastShape(t: number, seed: number, span: number): number {
    const knot = (i: number) => span * (i + .34 * terrainHash(i, seed + 51));
    let i = Math.floor(t / span);
    while (t < knot(i))
        i--;
    while (t > knot(i + 1))
        i++;
    const hold = .06 + .16 * terrainHash(i, seed + 91), u = Math.max(0, Math.min(1, ((t - knot(i)) / (knot(i + 1) - knot(i)) - hold) / (1 - 2 * hold)));
    const f = u * u * u * (u * (6 * u - 15) + 10), v = terrainHash(i, seed) * 2 - 1, w = terrainHash(i + 1, seed) * 2 - 1;
    return v + (w - v) * f;
}
export function edgeProfile(side: EdgeSide, t: number): Record<EdgeLayer, number> {
    const front = side === 'bottom';
    if (front || side === 'left') {
        const grass = front ? 2.5 : 2, earth = (front ? 25 : 18) + .65 * Math.sin(t / 293);
        const sand = (front ? 93 : 58) + (front ? 10 : 5) * coastShape(t, front ? 4 : 6, front ? 280 : 245);
        const foam = Math.min(sand + 8.5, Math.max(sand + .35, (front ? 99 : 64) + (front ? 6 : 4) * coastShape(t + 40, 11, 310)));
        const shallows = Math.max(foam + 1.5, (front ? 111 : 70) + (front ? 7 : 4) * coastShape(t, 17, 440));
        const water = Math.max(shallows + 1.5, (front ? 120 : 75) + (front ? 6 : 4) * coastShape(t + 90, 23, 530));
        return { grass, lip: grass + 1, earth, soilHighlight: earth - 3.5, soilBand: earth - 7, sand, foam, shallows, water };
    }
    const grass = side === 'top' ? 3 : 4, earth = grass + 2, sand = earth + 1;
    return { grass, lip: grass + .7, earth, soilHighlight: earth, soilBand: earth, sand, foam: sand + 1, shallows: sand + 3, water: sand + 5 };
}
function accentPaint(kind: string, c: EdgePoint, scale: number): EdgePaint[] {
    const p: EdgePaint[] = [], add = (poly: EdgePolygon, color: number) => p.push({ poly, color });
    const el = (dx: number, dy: number, rx: number, ry: number, color: number) => add(edgeEllipse(c.x + dx * scale, c.y + dy * scale, rx * scale, ry * scale, 12), color);
    const poly = (pts: number[][], color: number) => add(pts.map(([x, y]) => ({ x: c.x + x * scale, y: c.y + y * scale })), color);
    el(0, 4, 13, 4, 0xd9c18e);
    if (kind === 'stone') {
        poly([[-12, 3], [-8, -6], [2, -10], [10, -3], [12, 4]], 0x989e90);
        el(-2, -5, 6, 2.5, 0xcbd0b7);
        el(17, 5, 3.5, 2.5, 0xaba995);
        el(-17, 7, 2.7, 1.9, 0xb7ae94);
    }
    else if (kind === 'pair') {
        el(-4, 0, 3.8, 2.4, 0xa6a896);
        el(7, 3, 2.7, 1.8, 0xbab6a0);
    }
    else if (kind === 'wood') {
        poly([[-17, 1], [15, -7], [17, -3], [-15, 5]], 0x9e7650);
        poly([[-5, 0], [4, -10], [7, -9], [-1, 2]], 0xb38c5e);
        el(21, 6, 3, 2.2, 0xaaa996);
    }
    else {
        for (let j = -2; j <= 2; j++)
            poly([[-1, 3], [j * 4, -(8 + Math.abs(j) * 2)], [2, 3]], j % 2 ? 0xb49d61 : 0xd1bc78);
        el(13, 5, 4.5, 2.8, 0xb1af96);
    }
    return p;
}
function baseEdges(state: Pick<LandState, 'acquiredParcels'>): TerrainEdges {
    const rects = [...state.acquiredParcels].sort().map(plateauRect);
    const layers: TerrainEdges['layers'] = { water: [], shallows: [], foam: [], sand: [], earth: [], soilHighlight: [], soilBand: [], lip: [], grass: [] };
    const accents: EdgeAccent[] = [], runs: EdgeRun[] = [], strata: EdgePaint[] = [];
    const occupied = (p: EdgePoint) => rects.some(r => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom);
    for (const ids of components(state.acquiredParcels))
        for (const loop of boundary(ids)) {
            const edges = loop.map((a, i) => {
                const b = loop[(i + 1) % loop.length], d = sub(b, a), length = Math.hypot(d.x, d.y);
                return { a, b, length, n: { x: d.y / length, y: -d.x / length }, side: (d.x > 0 ? 'top' : d.x < 0 ? 'bottom' : d.y > 0 ? 'right' : 'left') as EdgeSide };
            });
            const convex = edges.map((e, i) => {
                const prev = edges[(i + edges.length - 1) % edges.length];
                return cross(sub(prev.b, prev.a), sub(e.b, e.a)) > 0 && !occupied({ x: e.a.x + (prev.n.x + e.n.x) * .1, y: e.a.y + (prev.n.y + e.n.y) * .1 });
            });
            const termination = { grass: 32, lip: 30, soilBand: 28, soilHighlight: 27, earth: 26, sand: 22, foam: 13, shallows: 5, water: 0 };
            const width = (e: typeof edges[number], i: number, t: number, layer: EdgeLayer) => {
                const at = e.a.x === e.b.x ? e.a.y + (e.b.y - e.a.y) * t : e.a.x + (e.b.x - e.a.x) * t;
                let v = edgeProfile(e.side, at)[layer];
                // A concavity or diagonal contact pinches the entire collar, not the playable rectangle.
                if (!convex[i])
                    v *= 1 - Math.exp(-Math.pow(Math.max(0, t * e.length - termination[layer]) / (2.2 * Math.max(edgeProfile(e.side, at).water, 1)), 2));
                if (!convex[(i + 1) % edges.length])
                    v *= 1 - Math.exp(-Math.pow(Math.max(0, (1 - t) * e.length - termination[layer]) / (2.2 * Math.max(edgeProfile(e.side, at).water, 1)), 2));
                return Math.max(0, v);
            };
            for (let i = 0; i < edges.length; i++) {
                const e = edges[i], point = (t: number, d: number): EdgePoint => ({ x: e.a.x + (e.b.x - e.a.x) * t + e.n.x * d, y: e.a.y + (e.b.y - e.a.y) * t + e.n.y * d });
                const count = Math.ceil(e.length / 8);
                runs.push({ a: e.a, b: e.b, side: e.side, temporary: e.side === 'top' || e.side === 'right' });
                for (const layer of EDGE_LAYERS) {
                    const lo = convex[i] ? 0 : termination[layer] / e.length, hi = convex[(i + 1) % edges.length] ? 1 : 1 - termination[layer] / e.length;
                    const line = Array.from({ length: count + 1 }, (_, j) => { const t = lo + (hi - lo) * j / count; return point(t, width(e, i, t, layer)); });
                    layers[layer].push([point(lo, 0), point(hi, 0), ...line.reverse()]);
                }
                if (convex[i]) {
                    const previous = (i + edges.length - 1) % edges.length, prev = edges[previous];
                    for (const layer of EDGE_LAYERS) {
                        const d1 = width(prev, previous, 1, layer), d2 = width(e, i, 0, layer);
                        layers[layer].push([e.a, ...Array.from({ length: 25 }, (_, j) => {
                                const a = j / 24 * Math.PI / 2;
                                return { x: e.a.x + prev.n.x * d1 * Math.cos(a) + e.n.x * d2 * Math.sin(a), y: e.a.y + prev.n.y * d1 * Math.cos(a) + e.n.y * d2 * Math.sin(a) };
                            })]);
                    }
                }
                const horizontal = e.a.y === e.b.y, from = Math.min(horizontal ? e.a.x : e.a.y, horizontal ? e.b.x : e.b.y), to = Math.max(horizontal ? e.a.x : e.a.y, horizontal ? e.b.x : e.b.y);
                const strong = e.side === 'bottom' || e.side === 'left';
                if (!strong)
                    continue;
                const spacing = horizontal ? 240 : 280, line = horizontal ? e.a.y : e.a.x;
                for (let station = Math.floor(from / spacing) - 1; station <= Math.ceil(to / spacing); station++) {
                    const seed = terrainHash(station, line), pos = (station + .2 + .6 * terrainHash(station + 11, line)) * spacing;
                    if (pos < from + 48 || pos > to - 48 || seed < (horizontal ? .03 : .15))
                        continue;
                    const t = (pos - (horizontal ? e.a.x : e.a.y)) / (horizontal ? e.b.x - e.a.x : e.b.y - e.a.y), earth = width(e, i, t, 'earth'), sand = width(e, i, t, 'sand');
                    if (sand - earth < 26)
                        continue;
                    const kind = seed < .60 ? 'stone' : seed < .78 ? 'wood' : seed < .93 ? 'dry' : 'pair';
                    const d = earth + (sand - earth) * (kind === 'pair' ? .83 : .43 + .16 * terrainHash(station + 5, line));
                    const scale = kind === 'stone' ? (horizontal ? 1.3 : .9) + .3 * terrainHash(station, line + 7) : .85 + .25 * terrainHash(station, line + 7);
                    const paint = accentPaint(kind, point(t, d), scale);
                    const safe = paint.every(p => outsideOwned(p.poly, rects) && p.poly.every(q => layers.sand.some(s => containsEdgePoint(s, q))));
                    if (safe)
                        accents.push({ id: e.side + ':' + line + ':' + pos, side: e.side, temporary: false, kind, paint });
                }
            }
        }
    // Reject the prototype's mineral marks where a concave bay pinches the earth slice.
    for (const run of runs.filter(r => r.side === 'bottom' || r.side === 'left')) {
        const horizontal = run.side === 'bottom', from = Math.min(horizontal ? run.a.x : run.a.y, horizontal ? run.b.x : run.b.y), to = Math.max(horizontal ? run.a.x : run.a.y, horizontal ? run.b.x : run.b.y);
        for (let station = Math.ceil((from + 65) / 310); station * 310 < to - 65; station++) {
            const t = station * 310, depth = edgeProfile(run.side, t).earth * .56;
            const poly = horizontal ? edgeEllipse(t, run.a.y + depth, 24, 1.1, 12) : edgeEllipse(run.a.x - depth, t, 1.1, 20, 12);
            if (outsideOwned(poly, rects) && poly.every(p => layers.earth.some(surface => containsEdgePoint(surface, p))))
                strata.push({ poly, color: 0xb48a59 });
        }
    }
    for (const name of EDGE_LAYERS)
        layers[name] = layers[name].map(poly => {
            const p = poly.filter((q, i) => i === 0 || Math.hypot(q.x - poly[i - 1].x, q.y - poly[i - 1].y) > 1e-8);
            if (p.length > 1 && Math.hypot(p[0].x - p[p.length - 1].x, p[0].y - p[p.length - 1].y) < 1e-8)
                p.pop();
            return p;
        }).filter(p => p.length >= 3 && polygonArea(p) > 1e-9);
    return { rects, runs, layers, accents, strata };
}
export const rasterScale = 1.5;
const margins = { top: 16, right: 16, bottom: 128, left: 80 };
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export function coastTiles(rects: PlateauRect[]) {
    const rooms = rects.map(r => ({ left: r.left - 80, right: r.right + 16, top: r.top - 16, bottom: r.bottom + 128 }));
    const xs = [...new Set([...rects, ...rooms].flatMap(r => [r.left, r.right]))].sort((a, b) => a - b), ys = [...new Set([...rects, ...rooms].flatMap(r => [r.top, r.bottom]))].sort((a, b) => a - b);
    const tiles: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    }[] = [], active = new Map<string, any>();
    for (let j = 0; j < ys.length - 1; j++) {
        const row: {
            left: number;
            right: number;
            top: number;
            bottom: number;
        }[] = [];
        for (let i = 0; i < xs.length - 1; i++) {
            const x = (xs[i] + xs[i + 1]) / 2, y = (ys[j] + ys[j + 1]) / 2, inside = (r: any) => x > r.left && x < r.right && y > r.top && y < r.bottom;
            if (!rooms.some(inside) || rects.some(inside))
                continue;
            const prev = row.at(-1);
            if (prev && prev.right === xs[i])
                prev.right = xs[i + 1];
            else
                row.push({ left: xs[i], right: xs[i + 1], top: ys[j], bottom: ys[j + 1] });
        }
        const next = new Map<string, any>();
        for (const r of row) {
            const k = r.left + ':' + r.right, prev = active.get(k);
            if (prev && prev.bottom === r.top) {
                prev.bottom = r.bottom;
                next.set(k, prev);
            }
            else {
                tiles.push(r);
                next.set(k, r);
            }
        }
        active.clear();
        for (const [k, v] of next)
            active.set(k, v);
    }
    return tiles;
}
export function createCoastModel(data: TerrainEdges) {
    const normals = { bottom: { x: 0, y: 1 }, top: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }, rects = data.rects;
    const occupied = (x: number, y: number) => rects.some(r => x > r.left && x < r.right && y > r.top && y < r.bottom);
    const width = (side: EdgeSide, t: number) => side === 'bottom' ? 94 + 11 * coastShape(t + 80, 31, 370) + 3 * coastShape(t, 44, 690) : side === 'left' ? 58 + 6 * coastShape(t + 70, 37, 410) : side === 'top' ? 6 : 7;
    const runs = data.runs.map(r => {
        const h = r.side === 'bottom' || r.side === 'top', lo = Math.min(h ? r.a.x : r.a.y, h ? r.b.x : r.b.y), hi = Math.max(h ? r.a.x : r.a.y, h ? r.b.x : r.b.y), line = h ? r.a.y : r.a.x, step = 4, table: number[][] = [];
        for (let s = lo; s <= hi + step; s += step)
            table.push([width(r.side, s), coastShape(s + 40, 61, 280), coastShape(s, 71, 470)]);
        const strokes: any[] = [];
        if (!r.temporary) {
            const spacing = h ? 202 : 270;
            for (let i = Math.floor(lo / spacing); i <= Math.ceil(hi / spacing); i++) {
                const c = (i + .2 + .6 * terrainHash(i, line + 13)) * spacing;
                if (c < lo + 25 || c > hi - 25 || terrainHash(i, line + 44) < (h ? .07 : .15))
                    continue;
                const half = 26 + 43 * terrainHash(i, line + 5);
                strokes.push({ lo: Math.max(lo + 8, c - half), hi: Math.min(hi - 8, c + half), offset: 2.2 + 4 * terrainHash(i, line + 9), radius: 2.6 + 1.5 * terrainHash(i, line + 11) });
                if (terrainHash(i, line + 90) > .74)
                    strokes.push({ lo: c - 18, hi: c + 17, offset: 11 + 3 * terrainHash(i, line + 91), radius: 1.4 });
            }
        }
        return { ...r, h, lo, hi, line, sign: r.side === 'bottom' || r.side === 'right' ? 1 : -1, step, table, strokes };
    });
    const corners: any[] = [], bays: any[] = [];
    for (const prev of data.runs)
        for (const next of data.runs)
            if (key(prev.b) === key(next.a)) {
                const p = next.a, u = normals[prev.side], v = normals[next.side], d = cross(sub(prev.b, prev.a), sub(next.b, next.a));
                if (occupied(p.x + (u.x + v.x) * .1, p.y + (u.y + v.y) * .1))
                    continue;
                if (d > 0)
                    corners.push({ p, u, v, ru: width(prev.side, prev.side === 'left' || prev.side === 'right' ? p.y : p.x), rv: width(next.side, next.side === 'left' || next.side === 'right' ? p.y : p.x) });
                if (d < 0) {
                    const temporary = prev.temporary && next.temporary;
                    bays.push(makeBay({ p, u, v, ru: temporary ? 30 : 94, rv: temporary ? 25 : 75, widthA: width(prev.side, prev.side === 'left' || prev.side === 'right' ? p.y : p.x), temporary }, prev.side, next.side));
                }
            }
    return { rects, runs, corners, bays, tiles: coastTiles(rects) };
}
/** Open, asymmetric recession field; no radial/elliptical bay fill. Only concave masks consume this. */
function makeBay(b: any, first: EdgeSide, second: EdgeSide) {
    const seed = terrainHash(b.p.x + 31 * b.u.x + 17 * b.u.y, b.p.y + 43 * b.v.x + 23 * b.v.y);
    const spanA = b.temporary ? 80 + 16 * seed : 122 + 12 * seed, spanC = b.temporary ? 81 + 16 * (1 - seed) : 127 + 12 * (1 - seed);
    const depth = b.widthA * (.98 + .12 * seed);
    // Broad shoulder on one arm, shallower and longer on the other. Coordinates, never parcel IDs.
    return { ...b, spanA, spanC, depth, seed, first, second };
}
function bayField(b: any, a: number, c: number) {
    if (a < 0 || c < 0 || a >= b.spanA || c >= b.spanC)
        return null;
    const u = c / b.spanC, k1 = 1, k2 = .10 + .08 * b.seed;
    const f = (1 - u) * (1 - u) * (1 - u) + 3 * (1 - u) * (1 - u) * u * k1 + 3 * (1 - u) * u * u * k2;
    const derivative = (-3 * (1 - u) * (1 - u) + 3 * ((1 - u) * (1 - u) - 2 * (1 - u) * u) * k1 + 3 * (2 * (1 - u) * u - u * u) * k2) / b.spanC;
    const cut = b.depth * f * (1 + .08 * coastShape(c + b.p.y * .21, 83, 70));
    const dist = (a - cut) / Math.sqrt(1 + Math.pow(b.depth * derivative, 2));
    const weight = (1 - smooth(b.spanA * .58, b.spanA, a)) * (1 - smooth(b.spanC * .55, b.spanC, c));
    return { dist, along: c + a * .24, weight };
}
function bayWash(b: any, along: number) { const n = along / b.spanC; return smooth(.12, .24, n) * (1 - smooth(.40, .52, n)) + .75 * smooth(.65, .74, n) * (1 - smooth(.90, .98, n)); }
function lookup(r: any, s: number) { const f = clamp((s - r.lo) / r.step, 0, r.table.length - 1), i = Math.min(r.table.length - 2, Math.floor(f)), t = f - i; return r.table[i].map((v: number, k: number) => v + (r.table[i + 1][k] - v) * t); }
/** Value-noise stamps blend into uneven surf; no capsule distance field or round stroke caps. */
function foamNoise(x: number, y: number, seed: number) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = terrainHash(ix + seed, iy + seed * .17), b = terrainHash(ix + 1 + seed, iy + seed * .17), c = terrainHash(ix + seed, iy + 1 + seed * .17), d = terrainHash(ix + 1 + seed, iy + 1 + seed * .17);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
function surfMask(s: number, delta: number, seed: number, scale = 1) {
    if (Math.abs(delta) > 15 * scale)
        return 0;
    const along = foamNoise(s / 21, 0, seed), broad = foamNoise(s / 67, 2, seed + 9), warp = (foamNoise(s / 30, 1, seed + 13) - .5) * 4 * scale;
    const width = (1.1 + 2.9 * along) * scale, edge = (foamNoise(s / 4.8, delta / (2.7 * scale), seed + 21) - .5) * 2.1 * scale;
    const body = (1 - smooth(-.65 * scale, .9 * scale, Math.abs(delta - warp) - width - edge)) * smooth(.21, .45, broad);
    const holes = smooth(.16, .39, foamNoise(s / 10.5, delta / (3.8 * scale), seed + 41));
    const wispOffset = warp + (3.8 + 2.2 * foamNoise(s / 24, 0, seed + 33)) * scale, wispWidth = (.45 + .7 * along) * scale;
    const wisp = (1 - smooth(-.2 * scale, .65 * scale, Math.abs(delta - wispOffset) - wispWidth)) * smooth(.48, .68, foamNoise(s / 19, 1, seed + 31));
    return Math.min(.96, body * holes * (.62 + .33 * foamNoise(s / 49, 0, seed + 51)) + wisp * .34);
}
/** Pure continuous mask evaluation; no reference pixels, lobe polygons or water ellipses. */
export function sampleCoast(model: ReturnType<typeof createCoastModel>, x: number, y: number) {
    const inside = model.rects.some(r => x >= r.left && x < r.right && y >= r.top && y < r.bottom);
    if (inside)
        return [0, 0, 0, 0, 0];
    if (!model.rects.some(r => x >= r.left - 80 && x < r.right + 16 && y >= r.top - 16 && y < r.bottom + 128))
        return [0, 0, 0, 0, 0];
    let sd = -10000, pale = 0, deep = 0, foam = 0;
    for (const r of model.runs) {
        const s = r.h ? x : y, d = r.sign * ((r.h ? y : x) - r.line);
        if (s < r.lo || s > r.hi || d < 0 || d > margins[r.side])
            continue;
        const [w, n, m] = lookup(r, s);
        sd = Math.max(sd, w - d);
        const fade = 1 - smooth(margins[r.side] - (r.temporary ? 4 : 14), margins[r.side], d);
        if (r.temporary) {
            pale = Math.max(pale, Math.exp(-Math.pow((d - 8) / 4, 2)) * .22 * fade);
            continue;
        }
        pale = Math.max(pale, Math.exp(-Math.pow((d - (w + 5 + 4 * n)) / (r.side === 'bottom' ? 20 : 12), 2)) * (.42 + .15 * m) * fade);
        deep = Math.max(deep, Math.exp(-Math.pow((d - (r.side === 'bottom' ? 111 + 7 * m : 70 + 4 * m)) / (r.side === 'bottom' ? 23 : 12), 2)) * (.25 + .1 * n) * fade);
        for (const stroke of r.strokes) {
            const center = (stroke.lo + stroke.hi) / 2, half = (stroke.hi - stroke.lo) * .72, begin = center - half, end = center + half;
            if (s < begin || s > end)
                continue;
            const v = lookup(r, s), path = v[0] + stroke.offset + 2.8 * v[1], envelope = smooth(begin, begin + 12, s) * (1 - smooth(end - 19, end, s));
            const detached = stroke.offset > 8;
            foam = Math.max(foam, surfMask(s, d - path, r.line + (r.h ? 61 : 117), detached ? .55 : 1) * envelope * (detached ? .6 : 1));
        }
    }
    for (const c of model.corners) {
        const dx = x - c.p.x, dy = y - c.p.y, a = dx * c.u.x + dy * c.u.y, b = dx * c.v.x + dy * c.v.y;
        if (a < 0 || b < 0 || a > c.ru + 30 || b > c.rv + 30)
            continue;
        const rho = Math.hypot(a / c.ru, b / c.rv), distance = (rho - 1) * Math.min(c.ru, c.rv);
        sd = Math.max(sd, -distance);
        const mod = .7 + .3 * terrainHash(c.p.x, c.p.y);
        pale = Math.max(pale, Math.exp(-Math.pow((distance - 4) / 17, 2)) * .46 * mod);
        deep = Math.max(deep, Math.exp(-Math.pow((distance - 18) / 22, 2)) * .2 * mod);
    }
    for (const b of model.bays) {
        const dx = x - b.p.x, dy = y - b.p.y, a = dx * b.u.x + dy * b.u.y, c = dx * b.v.x + dy * b.v.y, f = bayField(b, a, c);
        if (!f)
            continue;
        const blend = b.temporary ? 3 : 16, q = clamp(.5 + .5 * (f.dist - sd) / blend), cut = f.dist * (1 - q) + sd * q - blend * q * (1 - q);
        sd += (cut - sd) * f.weight;
        pale = Math.max(pale, Math.exp(-Math.pow((f.dist + 4) / (b.temporary ? 7 : 20), 2)) * .35 * f.weight);
        deep = Math.max(deep, Math.exp(-Math.pow((f.dist + 20) / 26, 2)) * .1 * f.weight);
        foam = Math.max(foam, surfMask(f.along + b.p.x * .23 + b.p.y * .11, f.dist - 1, b.p.x + b.p.y, b.temporary ? .55 : 1) * bayWash(b, f.along) * f.weight);
    }
    const sand = 1 - smooth(-.65, .65, -sd);
    // Layer masks composed in premultiplied form, then stored as standard RGBA.
    let alpha = 0, R = 0, G = 0, B = 0;
    const over = (r: number, g: number, b: number, a: number) => { if (a < .001)
        return; R = r * a + R * (1 - a); G = g * a + G * (1 - a); B = b * a + B * (1 - a); alpha = a + alpha * (1 - a); };
    over(102, 206, 201, deep);
    over(171, 231, 221, pale);
    over(255, 252, 239, foam);
    const grain = (terrainHash(Math.floor(x * 1.5), Math.floor(y * 1.5)) - .5) * 1.2;
    over(255, 233 + grain, 185 + grain, sand);
    return alpha < .003 ? [0, 0, 0, 0, sand] : [Math.round(R / alpha), Math.round(G / alpha), Math.round(B / alpha), Math.round(alpha * 255), sand];
}
export function terrainEdges(state: Pick<LandState, 'acquiredParcels'>): TerrainEdges & {
    rasterModel: ReturnType<typeof createCoastModel>;
} {
    const data = baseEdges(state), model = createCoastModel(data);
    for (const k of ['sand', 'foam', 'water', 'shallows'] as const)
        data.layers[k] = [];
    data.accents = data.accents.filter(a => a.paint.every(p => p.poly.every(q => approvedSampleCoast(model, q.x, q.y)[4] > .98)));
    return { ...data, rasterModel: model };
}
/** Exact 1.5 px/wu renderer: tile confinement is established once, not per texel. */
export function fillCoastPixels(model: ReturnType<typeof createCoastModel>, tile: any, w: number, h: number, bytes: Uint8ClampedArray) {
    if (!model.tiles.some(t => t.left === tile.left && t.right === tile.right && t.top === tile.top && t.bottom === tile.bottom))
        throw Error('Uncertified raster tile');
    const runs = model.runs.filter(r => { const a = r.sign * ((r.h ? tile.top : tile.left) - r.line), b = r.sign * ((r.h ? tile.bottom : tile.right) - r.line); return Math.max(a, b) >= 0 && Math.min(a, b) <= margins[r.side]; }).map(r => {
        const length = r.h ? w : h, table = new Float64Array(length * 12), valid = new Uint8Array(length), strokes: any[] = Array(length);
        for (let i = 0; i < length; i++) {
            const s = (r.h ? tile.left : tile.top) + (i + .5) / rasterScale;
            if (s < r.lo || s > r.hi)
                continue;
            valid[i] = 1;
            const p = lookup(r, s), n = i * 12;
            table[n] = p[0];
            table[n + 1] = p[1];
            table[n + 2] = p[2];
            table[n + 3] = s;
            if (r.temporary)
                continue;
            const contrib: number[] = [];
            for (const stroke of r.strokes) {
                const center = (stroke.lo + stroke.hi) / 2, half = (stroke.hi - stroke.lo) * .72, begin = center - half, end = center + half;
                if (s < begin || s > end)
                    continue;
                const path = p[0] + stroke.offset + 2.8 * p[1], envelope = smooth(begin, begin + 12, s) * (1 - smooth(end - 19, end, s)), detached = stroke.offset > 8;
                contrib.push(path, envelope, detached ? .55 : 1, detached ? .6 : 1);
            }
            if (!contrib.length)
                continue;
            strokes[i] = contrib;
            const seed = r.line + (r.h ? 61 : 117), along = foamNoise(s / 21, 0, seed);
            table[n + 4] = along;
            table[n + 5] = foamNoise(s / 67, 2, seed + 9);
            table[n + 6] = (foamNoise(s / 30, 1, seed + 13) - .5) * 4;
            table[n + 7] = 1.1 + 2.9 * along;
            table[n + 8] = 3.8 + 2.2 * foamNoise(s / 24, 0, seed + 33);
            table[n + 9] = .45 + .7 * along;
            table[n + 10] = smooth(.48, .68, foamNoise(s / 19, 1, seed + 31));
            table[n + 11] = .62 + .33 * foamNoise(s / 49, 0, seed + 51);
        }
        return { r, table, valid, strokes };
    });
    const cornerDistances = new Float64Array(model.corners.length), bayDistances = new Float64Array(model.bays.length), bayAngles = new Float64Array(model.bays.length);
    for (let py = 0; py < h; py++) {
        const y = tile.top + (py + .5) / rasterScale;
        for (let px = 0; px < w; px++) {
            const x = tile.left + (px + .5) / rasterScale, index = (py * w + px) * 4;
            let sd = -10000;
            for (const p of runs) {
                const { r, table, valid } = p, i = r.h ? px : py;
                if (!valid[i])
                    continue;
                const d = r.sign * ((r.h ? y : x) - r.line);
                if (d < 0 || d > margins[r.side])
                    continue;
                sd = Math.max(sd, table[i * 12] - d);
            }
            for (let i = 0; i < model.corners.length; i++) {
                const c = model.corners[i], dx = x - c.p.x, dy = y - c.p.y, a = dx * c.u.x + dy * c.u.y, b = dx * c.v.x + dy * c.v.y;
                cornerDistances[i] = NaN;
                if (a < 0 || b < 0 || a > c.ru + 30 || b > c.rv + 30)
                    continue;
                const rho = Math.hypot(a / c.ru, b / c.rv), distance = (rho - 1) * Math.min(c.ru, c.rv);
                cornerDistances[i] = distance;
                sd = Math.max(sd, -distance);
            }
            for (let i = 0; i < model.bays.length; i++) {
                const b = model.bays[i], dx = x - b.p.x, dy = y - b.p.y, a = dx * b.u.x + dy * b.u.y, c = dx * b.v.x + dy * b.v.y;
                bayDistances[i] = NaN;
                const f = bayField(b, a, c);
                if (!f)
                    continue;
                const blend = b.temporary ? 3 : 16, q = clamp(.5 + .5 * (f.dist - sd) / blend), cut = f.dist * (1 - q) + sd * q - blend * q * (1 - q);
                sd += (cut - sd) * f.weight;
                bayDistances[i] = f.dist;
                bayAngles[i] = f.along;
            }
            const sand = 1 - smooth(-.65, .65, -sd);
            if (sand === 1) {
                const grain = (terrainHash(Math.floor(x * 1.5), Math.floor(y * 1.5)) - .5) * 1.2;
                bytes[index] = 255;
                bytes[index + 1] = Math.round(233 + grain);
                bytes[index + 2] = Math.round(185 + grain);
                bytes[index + 3] = 255;
                continue;
            }
            let pale = 0, deep = 0, foam = 0;
            for (const p of runs) {
                const { r, table, valid, strokes } = p, i = r.h ? px : py;
                if (!valid[i])
                    continue;
                const d = r.sign * ((r.h ? y : x) - r.line);
                if (d < 0 || d > margins[r.side])
                    continue;
                const n = i * 12, s = table[n + 3], width = table[n], a = table[n + 1], b = table[n + 2];
                const fade = 1 - smooth(margins[r.side] - (r.temporary ? 4 : 14), margins[r.side], d);
                if (r.temporary) {
                    pale = Math.max(pale, Math.exp(-Math.pow((d - 8) / 4, 2)) * .22 * fade);
                    continue;
                }
                pale = Math.max(pale, Math.exp(-Math.pow((d - (width + 5 + 4 * a)) / (r.side === 'bottom' ? 20 : 12), 2)) * (.42 + .15 * b) * fade);
                deep = Math.max(deep, Math.exp(-Math.pow((d - (r.side === 'bottom' ? 111 + 7 * b : 70 + 4 * b)) / (r.side === 'bottom' ? 23 : 12), 2)) * (.25 + .1 * a) * fade);
                const contributions = strokes[i];
                if (!contributions)
                    continue;
                const seed = r.line + (r.h ? 61 : 117);
                for (let j = 0; j < contributions.length; j += 4) {
                    const delta = d - contributions[j], scale = contributions[j + 2];
                    if (Math.abs(delta) > 15 * scale)
                        continue;
                    const warp = table[n + 6] * scale, width = table[n + 7] * scale, edge = (foamNoise(s / 4.8, delta / (2.7 * scale), seed + 21) - .5) * 2.1 * scale;
                    const body = (1 - smooth(-.65 * scale, .9 * scale, Math.abs(delta - warp) - width - edge)) * smooth(.21, .45, table[n + 5]);
                    const holes = smooth(.16, .39, foamNoise(s / 10.5, delta / (3.8 * scale), seed + 41));
                    const wispOffset = warp + table[n + 8] * scale, wispWidth = table[n + 9] * scale, wisp = (1 - smooth(-.2 * scale, .65 * scale, Math.abs(delta - wispOffset) - wispWidth)) * table[n + 10];
                    const mask = Math.min(.96, body * holes * table[n + 11] + wisp * .34);
                    foam = Math.max(foam, mask * contributions[j + 1] * contributions[j + 3]);
                }
            }
            for (let i = 0; i < model.corners.length; i++) {
                const distance = cornerDistances[i];
                if (Number.isNaN(distance))
                    continue;
                const c = model.corners[i], mod = .7 + .3 * terrainHash(c.p.x, c.p.y);
                pale = Math.max(pale, Math.exp(-Math.pow((distance - 4) / 17, 2)) * .46 * mod);
                deep = Math.max(deep, Math.exp(-Math.pow((distance - 18) / 22, 2)) * .2 * mod);
            }
            for (let i = 0; i < model.bays.length; i++) {
                const dist = bayDistances[i];
                if (Number.isNaN(dist))
                    continue;
                const b = model.bays[i], along = bayAngles[i], dx = x - b.p.x, dy = y - b.p.y, a = dx * b.u.x + dy * b.u.y, c = dx * b.v.x + dy * b.v.y, weight = (1 - smooth(b.spanA * .58, b.spanA, a)) * (1 - smooth(b.spanC * .55, b.spanC, c));
                pale = Math.max(pale, Math.exp(-Math.pow((dist + 4) / (b.temporary ? 7 : 20), 2)) * .35 * weight);
                deep = Math.max(deep, Math.exp(-Math.pow((dist + 20) / 26, 2)) * .1 * weight);
                foam = Math.max(foam, surfMask(along + b.p.x * .23 + b.p.y * .11, dist - 1, b.p.x + b.p.y, b.temporary ? .55 : 1) * bayWash(b, along) * weight);
            }
            let alpha = 0, R = 0, G = 0, B = 0;
            if (deep >= .001) {
                R = 102 * deep;
                G = 206 * deep;
                B = 201 * deep;
                alpha = deep;
            }
            if (pale >= .001) {
                R = 171 * pale + R * (1 - pale);
                G = 231 * pale + G * (1 - pale);
                B = 221 * pale + B * (1 - pale);
                alpha = pale + alpha * (1 - pale);
            }
            if (foam >= .001) {
                R = 255 * foam + R * (1 - foam);
                G = 252 * foam + G * (1 - foam);
                B = 239 * foam + B * (1 - foam);
                alpha = foam + alpha * (1 - foam);
            }
            if (sand >= .001) {
                const grain = (terrainHash(Math.floor(x * 1.5), Math.floor(y * 1.5)) - .5) * 1.2;
                R = 255 * sand + R * (1 - sand);
                G = (233 + grain) * sand + G * (1 - sand);
                B = (185 + grain) * sand + B * (1 - sand);
                alpha = sand + alpha * (1 - sand);
            }
            if (alpha < .003) {
                bytes[index] = 0;
                bytes[index + 1] = 0;
                bytes[index + 2] = 0;
                bytes[index + 3] = 0;
            }
            else {
                bytes[index] = Math.round(R / alpha);
                bytes[index + 1] = Math.round(G / alpha);
                bytes[index + 2] = Math.round(B / alpha);
                bytes[index + 3] = Math.round(alpha * 255);
            }
        }
    }
    return runs.reduce((n, p) => n + p.table.byteLength + p.valid.byteLength, 0) + cornerDistances.byteLength + bayDistances.byteLength + bayAngles.byteLength;
}
/** Keep the approved pre-E2 prop eligibility mask: reshaping a bay must not reseed or remove its props. */
function approvedSampleCoast(model: ReturnType<typeof createCoastModel>, x: number, y: number) {
    const inside = model.rects.some(r => x >= r.left && x < r.right && y >= r.top && y < r.bottom);
    if (inside)
        return [0, 0, 0, 0, 0];
    if (!model.rects.some(r => x >= r.left - 80 && x < r.right + 16 && y >= r.top - 16 && y < r.bottom + 128))
        return [0, 0, 0, 0, 0];
    let sd = -10000, pale = 0, deep = 0, foam = 0;
    for (const r of model.runs) {
        const s = r.h ? x : y, d = r.sign * ((r.h ? y : x) - r.line);
        if (s < r.lo || s > r.hi || d < 0 || d > margins[r.side])
            continue;
        const [w, n, m] = lookup(r, s);
        sd = Math.max(sd, w - d);
        const fade = 1 - smooth(margins[r.side] - (r.temporary ? 4 : 14), margins[r.side], d);
        if (r.temporary) {
            pale = Math.max(pale, Math.exp(-Math.pow((d - 8) / 4, 2)) * .22 * fade);
            continue;
        }
        pale = Math.max(pale, Math.exp(-Math.pow((d - (w + 5 + 4 * n)) / (r.side === 'bottom' ? 20 : 12), 2)) * (.42 + .15 * m) * fade);
        deep = Math.max(deep, Math.exp(-Math.pow((d - (r.side === 'bottom' ? 111 + 7 * m : 70 + 4 * m)) / (r.side === 'bottom' ? 23 : 12), 2)) * (.25 + .1 * n) * fade);
        for (const stroke of r.strokes) {
            const center = (stroke.lo + stroke.hi) / 2, half = (stroke.hi - stroke.lo) * .72, begin = center - half, end = center + half;
            if (s < begin || s > end)
                continue;
            const v = lookup(r, s), path = v[0] + stroke.offset + 2.8 * v[1], envelope = smooth(begin, begin + 12, s) * (1 - smooth(end - 19, end, s));
            const detached = stroke.offset > 8;
            foam = Math.max(foam, surfMask(s, d - path, r.line + (r.h ? 61 : 117), detached ? .55 : 1) * envelope * (detached ? .6 : 1));
        }
    }
    for (const c of model.corners) {
        const dx = x - c.p.x, dy = y - c.p.y, a = dx * c.u.x + dy * c.u.y, b = dx * c.v.x + dy * c.v.y;
        if (a < 0 || b < 0 || a > c.ru + 30 || b > c.rv + 30)
            continue;
        const rho = Math.hypot(a / c.ru, b / c.rv), distance = (rho - 1) * Math.min(c.ru, c.rv);
        sd = Math.max(sd, -distance);
        const mod = .7 + .3 * terrainHash(c.p.x, c.p.y);
        pale = Math.max(pale, Math.exp(-Math.pow((distance - 4) / 17, 2)) * .46 * mod);
        deep = Math.max(deep, Math.exp(-Math.pow((distance - 18) / 22, 2)) * .2 * mod);
    }
    for (const b of model.bays) {
        const dx = x - b.p.x, dy = y - b.p.y, a = dx * b.u.x + dy * b.u.y, c = dx * b.v.x + dy * b.v.y;
        if (a < 0 || c < 0 || a > b.ru * 1.35 || c > b.rv * 1.35)
            continue;
        const angle = Math.atan2(c / b.rv, a / b.ru), shape = 1 + .11 * Math.sin(angle * 3 + .7) + .065 * Math.sin(angle * 5 + 1.5), rho = Math.hypot(a / b.ru, c / b.rv) / shape, dist = (rho - 1) * Math.min(b.ru, b.rv);
        const blend = b.temporary ? 4 : 16, h = clamp(.5 + .5 * (dist - sd) / blend);
        sd = dist * (1 - h) + sd * h - blend * h * (1 - h);
        pale = Math.max(pale, Math.exp(-Math.pow((dist + 4) / (b.temporary ? 9 : 20), 2)) * .35);
        deep = Math.max(deep, Math.exp(-Math.pow((dist + 20) / 26, 2)) * .1);
        const wash = (smooth(.05, .14, angle) * (1 - smooth(.55, .64, angle))) + (smooth(.86, .96, angle) * (1 - smooth(1.4, 1.5, angle)));
        foam = Math.max(foam, surfMask(angle * Math.min(b.ru, b.rv) + b.p.x * .23 + b.p.y * .11, dist - 1, b.p.x + b.p.y, b.temporary ? .55 : 1) * Math.min(1, wash));
    }
    const sand = 1 - smooth(-.65, .65, -sd);
    // Layer masks composed in premultiplied form, then stored as standard RGBA.
    let alpha = 0, R = 0, G = 0, B = 0;
    const over = (r: number, g: number, b: number, a: number) => { if (a < .001)
        return; R = r * a + R * (1 - a); G = g * a + G * (1 - a); B = b * a + B * (1 - a); alpha = a + alpha * (1 - a); };
    over(102, 206, 201, deep);
    over(171, 231, 221, pale);
    over(255, 252, 239, foam);
    const grain = (terrainHash(Math.floor(x * 1.5), Math.floor(y * 1.5)) - .5) * 1.2;
    over(255, 233 + grain, 185 + grain, sand);
    return alpha < .003 ? [0, 0, 0, 0, sand] : [Math.round(R / alpha), Math.round(G / alpha), Math.round(B / alpha), Math.round(alpha * 255), sand];
}
