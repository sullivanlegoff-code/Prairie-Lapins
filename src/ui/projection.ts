import {VISUAL} from '../config/visual';
import type {Point, WorldBounds} from './gestures';

/**
 * Ground plane ↔ screen-world projection, the single path between logical geometry and what the camera shows.
 * Ground points are today's world coordinates (gridPoint, finePoint, buildingCenter): logical cells stay
 * axis-aligned there. The camera, taps and framing work on projected points:
 *   S = C + A · (P − C), with A = R(θ) · diag(1, q) = [[cos θ, q·sin θ], [−sin θ, q·cos θ]]
 * (a Phaser container with rotation −θ and scaleY q). A is invertible for q > 0, so taps stay exact.
 * The identity (θ = 0, q = 1) returns its inputs unchanged, bit for bit.
 */
/** Phaser transform (position, rotation, scale) that maps a ground-plane container's local points like toScreen. */
export interface GroundTransform {readonly x: number; readonly y: number; readonly rotation: number; readonly scaleX: number; readonly scaleY: number}
export interface Projection {
  readonly identity: boolean;
  /** For the ground layer: Phaser applies x' = cos(r)·sx·x − sin(r)·sy·y + tx, y' = sin(r)·sx·x + cos(r)·sy·y + ty. */
  readonly groundTransform: GroundTransform;
  /** Ground point → projected screen-world point. */
  toScreen(point: Point): Point;
  /** Projected screen-world point → ground point (exact inverse of toScreen). */
  toGround(point: Point): Point;
  /** Bounding box of a projected ground rectangle (its four corners). */
  screenBounds(rect: WorldBounds): WorldBounds;
  /** Bounding box, on the ground, of a projected rectangle such as the visible view. */
  groundBounds(rect: WorldBounds): WorldBounds;
}

const box = (points: Point[]): WorldBounds => ({left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
  top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y))});
const corners = (r: WorldBounds): Point[] => [{x: r.left, y: r.top}, {x: r.right, y: r.top}, {x: r.left, y: r.bottom}, {x: r.right, y: r.bottom}];

export function createProjection(thetaDegrees: number, q: number, pivot: Point): Projection {
  if (!Number.isFinite(thetaDegrees) || !Number.isFinite(q) || q <= 0) throw new RangeError('Invalid projection');
  if (thetaDegrees === 0 && q === 1) {
    const same = (p: Point): Point => ({x: p.x, y: p.y}), rect = (r: WorldBounds): WorldBounds => ({left: r.left, right: r.right, top: r.top, bottom: r.bottom});
    return {identity: true, groundTransform: {x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1}, toScreen: same, toGround: same, screenBounds: rect, groundBounds: rect};
  }
  const t = thetaDegrees * Math.PI / 180, cos = Math.cos(t), sin = Math.sin(t);
  const toScreen = (p: Point): Point => {const dx = p.x - pivot.x, dy = p.y - pivot.y; return {x: pivot.x + cos * dx + q * sin * dy, y: pivot.y - sin * dx + q * cos * dy};};
  const toGround = (p: Point): Point => {const dx = p.x - pivot.x, dy = p.y - pivot.y; return {x: pivot.x + cos * dx - sin * dy, y: pivot.y + (sin * dx + cos * dy) / q};};
  // Rotation −θ and scale (1, q) give A; the position is S(0, 0) = C − A·C.
  const origin = toScreen({x: 0, y: 0});
  return {identity: false, groundTransform: {x: origin.x, y: origin.y, rotation: -t, scaleX: 1, scaleY: q},
    toScreen, toGround, screenBounds: r => box(corners(r).map(toScreen)), groundBounds: r => box(corners(r).map(toGround))};
}

const grid = VISUAL.grid;
/** The game's projection, pivoting on the centre of the full 12 × 12 map. */
export const PROJECTION = createProjection(VISUAL.projection.theta, VISUAL.projection.q,
  {x: grid.originX + grid.columns * grid.width / 2, y: grid.originY + grid.rows * grid.depth / 2});
export const {toScreen, toGround, screenBounds, groundBounds, groundTransform} = PROJECTION;
