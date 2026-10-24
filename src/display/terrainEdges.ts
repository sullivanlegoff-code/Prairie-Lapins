import {PARCELS, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';

/** Parcel-top drawing utilities; no collider, placement or save consumes these polygons. */
export interface EdgePoint {x: number; y: number}
export interface PlateauRect {id: ParcelId; left: number; top: number; right: number; bottom: number}
export type EdgePolygon = EdgePoint[];
export const terrainHash = (x: number, y: number) => {const a = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return a - Math.floor(a);};
export const plateauRect = (id: ParcelId): PlateauRect => {
  const p = PARCELS[id], left = ISLAND.originX + p.x * ISLAND.cellWidth, top = ISLAND.originY + p.y * ISLAND.cellDepth;
  return {id, left, top, right: left + ISLAND.parcelWidth, bottom: top + ISLAND.parcelDepth};
};

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
