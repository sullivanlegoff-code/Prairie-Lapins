import {FINE_GRID} from '../config/decorations';
import {buildingSize} from '../config/habitatSizes';
import {VISUAL} from '../config/visual';
import {screenBounds, toScreen} from './projection';
export interface Point {x: number; y: number}
export type Gesture = {type: 'pan'; dx: number; dy: number} | {type: 'zoom'; factor: number; at: Point; dx: number; dy: number} | {type: 'tap'; at: Point};
/** Coordinates and threshold are CSS pixels. No selection after any drag or multi-touch. */
export class Gestures {
  private points = new Map<number, Point>();
  private start: Point | null = null;
  private suppressed = false;
  get active(): boolean { return this.points.size > 0; }
  down(id: number, point: Point): void {
    if (!this.points.size) { this.start = point; this.suppressed = false; }
    this.points.set(id, point);
    if (this.points.size > 1) this.suppressed = true;
  }
  move(id: number, point: Point): Gesture | null {
    const old = this.points.get(id); if (!old) return null;
    const before = [...this.points.values()]; this.points.set(id, point);
    if (this.points.size >= 2) {
      const after = [...this.points.values()];
      const distance = (p: Point[]) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const middle = (p: Point[]) => ({x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2});
      const a = middle(before), b = middle(after);
      return {type: 'zoom', factor: distance(after) / Math.max(1, distance(before)), at: b, dx: b.x - a.x, dy: b.y - a.y};
    }
    if (this.start && Math.hypot(point.x - this.start.x, point.y - this.start.y) > 8) this.suppressed = true;
    return this.suppressed ? {type: 'pan', dx: point.x - old.x, dy: point.y - old.y} : null;
  }
  up(id: number, point: Point): Gesture | null {
    if (!this.points.has(id)) return null;
    const tap = !this.suppressed && this.points.size === 1 && this.start && Math.hypot(point.x - this.start.x, point.y - this.start.y) <= 8;
    this.points.delete(id); if (!this.points.size) this.start = null;
    return tap ? {type: 'tap', at: point} : null;
  }
  cancel(): void { this.points.clear(); this.start = null; this.suppressed = true; }
}
const grid = VISUAL.grid, camera = VISUAL.camera;
/** Regular aerial projection: horizontal columns, compressed depth, no shear or roll. */
export const gridPoint = (x: number, y: number): Point => ({x: grid.originX + x * grid.width, y: grid.originY + y * grid.depth});
/** Explicit fine-grid ↔ world conversion; camera remains in world coordinates. */
export const finePoint=(x:number,y:number):Point=>gridPoint(x/FINE_GRID,y/FINE_GRID);
/** Centre of the building's effective footprint (an enclosure's tier and size, any other kind 4 × 4), anchored at its top-left cell. */
export const buildingCenter=(b:Point&{kind:string;footprintTier?:number;formerFootprint?:number}):Point=>{const size=buildingSize(b);return finePoint(b.x+size.width/2,b.y+size.depth/2);};
export function fineCell(point:Point):Point{return {x:Math.floor((point.x-grid.originX)/(grid.width/FINE_GRID)),y:Math.floor((point.y-grid.originY)/(grid.depth/FINE_GRID))};}
export function gridCell(point: Point): Point {
  return {x: Math.floor((point.x - grid.originX) / grid.width), y: Math.floor((point.y - grid.originY) / grid.depth)};
}
export interface WorldBounds {left: number; right: number; top: number; bottom: number}
/** Ground rectangle of the cells [x0, x1) × [y0, y1). Project it with screenBounds before camera use. */
export const cellsBounds = (x0: number, y0: number, x1: number, y1: number): WorldBounds =>
  ({left: gridPoint(x0, 0).x, right: gridPoint(x1, 0).x, top: gridPoint(0, y0).y, bottom: gridPoint(0, y1).y});
/** Projected full map of `columns` × all rows, as the camera sees it. */
const islandScreen = (columns: number): WorldBounds => screenBounds(cellsBounds(0, 0, columns, grid.rows));
const envelope = (r: WorldBounds): WorldBounds => ({left: r.left - camera.marginX, right: r.right + camera.marginX, top: r.top - camera.marginY, bottom: r.bottom + camera.marginY});
export interface ViewInsets {left: number; right: number; top: number; bottom: number}
export class MeadowCamera {
  x: number = toScreen(gridPoint(camera.focusX, camera.focusY)).x;
  y: number = toScreen(gridPoint(camera.focusX, camera.focusY)).y;
  zoom: number = camera.initialZoom;
  width = 900; height = 500;
  private insets: ViewInsets | null = null;
  private pendingInsets: ViewInsets | null | undefined;
  private interacting = false;
  private pendingSize: Point | null = null;
  private pendingColumns: number | null = null;
  private columns: number = grid.columns;
  private visibleRegions: WorldBounds[] | null = null;
  private pendingRegions: WorldBounds[] | null | undefined;
  get resizing(): boolean { return this.pendingSize !== null; }
  /** Projected map with an outer margin; it grows with the habitat columns. */
  readonly bounds = envelope(islandScreen(grid.columns));
  private get viewport() {
    const pad = camera.overviewPadding;
    const hud = this.width < this.height && this.width <= 980 ? camera.portraitHudHeight : this.height <= 450 ? camera.compactHudHeight : camera.hudHeight;
    const i = this.insets ?? {left: pad, right: pad, top: hud + pad, bottom: pad};
    return {x: i.left, y: i.top, width: Math.max(1, this.width - i.left - i.right), height: Math.max(1, this.height - i.top - i.bottom)};
  }
  private fullIsland(): WorldBounds {
    const r = islandScreen(this.columns), m = VISUAL.ground.visualMargin, rim = VISUAL.ground.floatingRim;
    return {left: r.left - m.left - rim, right: r.right + m.right + rim, top: r.top - m.top - rim,
      bottom: r.bottom + m.bottom + VISUAL.ground.floatingDepth + rim};
  }
  private fitZoom(rect: WorldBounds): number {
    const v = this.viewport, margin = camera.overviewMargin;
    return Math.min(v.width / (rect.right - rect.left + 2 * margin), v.height / (rect.bottom - rect.top + 2 * margin));
  }
  /** .4 on large screens; smaller when necessary to fit the full map with its outer margin. */
  get minimumZoom(): number {return Math.min(camera.minZoom, this.fitZoom(this.fullIsland()));}
  setInsets(insets: ViewInsets | null): void {
    if (this.interacting) {this.pendingInsets=insets;return;}
    this.insets = insets;
  }
  /** Camera position showing `point` at the centre of the visible viewport (below the HUD), at the current zoom. */
  centered(point: Point): Point {
    const v = this.viewport;
    return {x: point.x - (v.x + v.width / 2 - this.width / 2) / this.zoom, y: point.y - (v.y + v.height / 2 - this.height / 2) / this.zoom};
  }
  get busy(): boolean { return this.interacting; }
  overview(rect: WorldBounds): void {
    if (this.interacting) return;
    const v = this.viewport;
    this.zoom = Math.max(this.minimumZoom, Math.min(camera.maxZoom, this.fitZoom(rect)));
    this.x = (rect.left + rect.right) / 2 - (v.x + v.width / 2 - this.width / 2) / this.zoom;
    this.y = (rect.top + rect.bottom) / 2 - (v.y + v.height / 2 - this.height / 2) / this.zoom;
    this.clamp();
  }
  interaction(active: boolean): void {
    this.interacting = active;
    if (!active && this.pendingInsets !== undefined) {this.insets=this.pendingInsets;this.pendingInsets=undefined;}
    if (!active && this.pendingRegions !== undefined) {this.visibleRegions=this.pendingRegions;this.pendingRegions=undefined;this.clamp();}
    if (!active && this.pendingColumns !== null) { const columns = this.pendingColumns; this.pendingColumns = null; this.setColumns(columns); }
    if (!active && this.pendingSize) { const size = this.pendingSize; this.pendingSize = null; this.resize(size.x, size.y); }
  }
  /** Actual owned parcels, or null while previewing all potential extensions. */
  setVisibleRegions(regions: WorldBounds[] | null): void {
    if (this.interacting) { this.pendingRegions = regions; return; }
    this.visibleRegions = regions; this.clamp();
  }
  setColumns(columns: number): void {
    if (this.interacting) { this.pendingColumns = columns; return; }
    const next = envelope(islandScreen(columns));
    this.columns = columns;
    if (next.left === this.bounds.left && next.right === this.bounds.right && next.top === this.bounds.top && next.bottom === this.bounds.bottom) return;
    Object.assign(this.bounds, next); this.clamp();
  }
  resize(width: number, height: number): void {
    if (this.interacting) { this.pendingSize = {x: width, y: height}; return; }
    this.width = width; this.height = height; this.clamp();
  }
  recenter(): void {
    if (this.interacting) return;
    this.zoom = camera.initialZoom;
    const hud = this.width < this.height && this.width <= 980 ? camera.portraitHudHeight : this.height <= 450 ? camera.compactHudHeight : camera.hudHeight;
    const focus = toScreen(gridPoint(camera.focusX, camera.focusY));
    this.x = focus.x; this.y = focus.y - hud / (2 * this.zoom); this.clamp();
  }
  /** Zoom that fits a world rectangle in the current viewport, never above the initial zoom. */
  frameZoom(rect: WorldBounds): number {
    const v = this.viewport, m = camera.frameMargin;
    return Math.max(this.minimumZoom, Math.min(camera.initialZoom, (v.width - 2 * m) / (rect.right - rect.left), (v.height - 2 * m) / (rect.bottom - rect.top)));
  }
  /** Centres a world rectangle in the viewport at frameZoom, then applies the usual land clamp. */
  frame(rect: WorldBounds): void {
    if (this.interacting) return;
    const v = this.viewport;
    this.zoom = this.frameZoom(rect);
    this.x = (rect.left + rect.right) / 2 - (v.x + v.width / 2 - this.width / 2) / this.zoom;
    this.y = (rect.top + rect.bottom) / 2 - (v.y + v.height / 2 - this.height / 2) / this.zoom;
    this.clamp();
  }
  /** Zoom that fits an island rectangle in the current viewport (frame margin included, no limit applied). */
  islandFitZoom(rect: WorldBounds): number {
    const v = this.viewport, m = camera.frameMargin;
    return Math.min((v.width - 2 * m) / (rect.right - rect.left), (v.height - 2 * m) / (rect.bottom - rect.top));
  }
  /**
   * Frames an island: fitted when that zoom reaches `floor`; otherwise at `floor`, showing the island's
   * left and front (bottom) edges first, then shifted just enough to keep `keep` (its buildings) in view.
   * Never above the initial zoom nor below the minimum; the usual land clamp applies.
   */
  frameIsland(island: WorldBounds, keep: WorldBounds, floor: number): void {
    if (this.interacting) return;
    const v = this.viewport;
    this.zoom = Math.max(this.minimumZoom, Math.min(camera.initialZoom, Math.max(this.islandFitZoom(island), floor)));
    const axis = (low: number, high: number, keepLow: number, keepHigh: number, size: number, fromHigh: boolean) => {
      if (high - low <= size) return (low + high) / 2;
      let start = fromHigh ? high - size : low;
      if (keepHigh - keepLow <= size) start = Math.min(Math.max(start, keepHigh - size), keepLow);
      return start + size / 2;
    };
    const x = axis(island.left, island.right, keep.left, keep.right, v.width / this.zoom, false);
    const y = axis(island.top, island.bottom, keep.top, keep.bottom, v.height / this.zoom, true);
    this.x = x - (v.x + v.width / 2 - this.width / 2) / this.zoom;
    this.y = y - (v.y + v.height / 2 - this.height / 2) / this.zoom;
    this.clamp();
  }
  world(point: Point): Point { return {x: this.x + (point.x - this.width / 2) / this.zoom, y: this.y + (point.y - this.height / 2) / this.zoom}; }
  screen(point: Point): Point { return {x: (point.x - this.x) * this.zoom + this.width / 2, y: (point.y - this.y) * this.zoom + this.height / 2}; }
  pan(dx: number, dy: number): void {
    const wantX = this.x - dx / this.zoom, wantY = this.y - dy / this.zoom;
    this.x = wantX; this.y = wantY; this.clamp();
    // Between two islands (the market islet, the jump-rope islet, a detached parcel) the way through can sit a little higher
    // or lower: a straight drag stops at the corner. The movement held back then slides the camera along the edge towards the
    // island that lies further in that direction (iPhone, 7 November 2026: stuck on the market islet after « Les cadeaux du ciel »).
    const lostX = wantX - this.x, lostY = wantY - this.y;
    if (Math.abs(lostX) > 1e-6 && Math.abs(lostX) >= Math.abs(lostY)) this.glide('x', lostX);
    else if (Math.abs(lostY) > 1e-6) this.glide('y', lostY);
  }
  /** Slides the other axis by up to `lost` towards the nearest land region that lets the camera go further along `axis`. */
  private glide(axis: 'x' | 'y', lost: number): void {
    const {boxes, dx, dy} = this.allowed(); if (boxes.length < 2) return;
    const cx = this.x + dx, cy = this.y + dy, along = axis === 'x' ? cx : cy, across = axis === 'x' ? cy : cx, ahead = Math.sign(lost) * 1e-3;
    let target: number | null = null, gap = Infinity;
    for (const b of boxes) {
      const [from, to, low, high] = axis === 'x' ? [b.left, b.right, b.top, b.bottom] : [b.top, b.bottom, b.left, b.right];
      if (along + ahead < from || along + ahead > to || (across >= low && across <= high)) continue;
      const edge = across < low ? low : high, distance = Math.abs(edge - across);
      if (distance < gap) { gap = distance; target = edge; }
    }
    if (target === null) return;
    const step = Math.sign(target - across) * Math.min(Math.abs(lost), gap);
    if (axis === 'x') this.y += step; else this.x += step;
    this.clamp();
  }
  scale(factor: number, at: Point, dx = 0, dy = 0): void {
    // One clamp for the entire pinch: the old midpoint follows the moving fingers.
    const anchor = this.world({x: at.x - dx, y: at.y - dy});
    // A retained zoom after orientation must not jump upward on a zoom-out gesture.
    this.zoom = Math.max(Math.min(this.minimumZoom, this.zoom), Math.min(camera.maxZoom, this.zoom * factor));
    const after = this.world(at); this.x += anchor.x - after.x; this.y += anchor.y - after.y; this.clamp();
  }
  /** Where the centre of the visible viewport may stand, one box per land region, and the viewport centre's offset. */
  private allowed(): {boxes: WorldBounds[]; dx: number; dy: number} {
    const v = this.viewport, dx = (v.x + v.width / 2 - this.width / 2) / this.zoom, dy = (v.y + v.height / 2 - this.height / 2) / this.zoom;
    const halfX = v.width / this.zoom / 2, halfY = v.height / this.zoom / 2;
    // Keep at least panKeep of the viewport of one land region (owned parcel with its rim) visible on each
    // axis, or the whole region when it is smaller: the open sky never fills most of the screen. A viewport
    // larger than the island is not recentred, and pinch anchors survive down to the minimum zoom.
    const boxes = (this.visibleRegions?.length ? this.visibleRegions : [this.fullIsland()]).map(region => {
      const keepX = Math.min(camera.panKeep * halfX * 2, region.right - region.left, halfX * 2);
      const keepY = Math.min(camera.panKeep * halfY * 2, region.bottom - region.top, halfY * 2);
      return {left: region.left + keepX - halfX, right: region.right - keepX + halfX, top: region.top + keepY - halfY, bottom: region.bottom - keepY + halfY};
    });
    return {boxes, dx, dy};
  }
  clamp(): void {
    const {boxes, dx, dy} = this.allowed(), x = this.x + dx, y = this.y + dy;
    let nearest: Point | null = null, distance = Infinity;
    for (const b of boxes) {
      const candidate = {x: Math.max(b.left, Math.min(b.right, x)), y: Math.max(b.top, Math.min(b.bottom, y))};
      const delta = (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
      if (delta < distance) { distance = delta; nearest = candidate; }
    }
    // A no-op clamp must leave the position bit-for-bit unchanged (no floating drift).
    if (nearest!.x !== x) this.x = nearest!.x - dx;
    if (nearest!.y !== y) this.y = nearest!.y - dy;
  }
}
/** A click-only command gate guards re-entrancy and accidental double clicks/taps. */
export class ActionGate {
  private last = new Map<string, number>();
  private running = false;
  constructor(private clock: () => number = () => performance.now()) {}
  run(key: string, action: () => void): boolean {
    const now = this.clock();
    if (this.running || now - (this.last.get(key) ?? -Infinity) < 350) return false;
    // Entries only matter during the double-tap window, not for the whole session.
    for (const [previous, at] of this.last) if (now - at >= 350) this.last.delete(previous);
    this.running = true; this.last.set(key, now);
    try { action(); } finally { this.running = false; }
    return true;
  }
}
