import type {DropTarget, KitchenSnapshot} from './engine';
import type {Point} from './recipes';
export const WORLD = {width: 1000, height: 440};
export const MIN_TOUCH = 48;
export interface Rect {left: number; top: number; width: number; height: number}
export interface View extends Rect {scale: number; offsetX: number; offsetY: number}
export function fitScene(rect: Rect): View {
  const scale = Math.max(.01, Math.min(rect.width / WORLD.width, rect.height / WORLD.height));
  const width = WORLD.width * scale, height = WORLD.height * scale;
  const offsetX = (rect.width - width) / 2, offsetY = (rect.height - height) / 2;
  return {left: rect.left + offsetX, top: rect.top + offsetY, width, height, scale, offsetX, offsetY};
}
export const toWorld = (point: Point, view: View): Point => ({x: (point.x - view.left) / view.scale, y: (point.y - view.top) / view.scale});
export const toClient = (point: Point, view: View): Point => ({x: point.x * view.scale + view.left, y: point.y * view.scale + view.top});
export function hitBox(anchor: Point, width: number, height: number, view: View): Rect {
  const at = toClient(anchor, view), w = Math.max(MIN_TOUCH, width * view.scale), h = Math.max(MIN_TOUCH, height * view.scale);
  return {left: at.x - w / 2, top: at.y - h / 2, width: w, height: h};
}
export const contains = (rect: Rect, p: Point): boolean => p.x >= rect.left && p.x <= rect.left + rect.width && p.y >= rect.top && p.y <= rect.top + rect.height;
/** Explicit hit testing: event.target under pointer capture is never a drop destination.
 * Among the visible items under the point, one the engine accepts wins (a knife over the food lying on the board),
 * then foods and small objects before containers and fixtures, then the nearest centre. */
export function resolveDrop(point: Point, itemId: string, snapshot: KitchenSnapshot, view: View, accepts: (target: DropTarget) => boolean = () => false): DropTarget | null {
  if (!contains(view, point)) return null;
  const rank = {food: 0, tool: 1, bottle: 1, container: 2, fixture: 3} as const;
  const distance = (anchor: Point) => Math.hypot(point.x - toClient(anchor, view).x, point.y - toClient(anchor, view).y);
  const candidates = snapshot.items
    .filter(i => i.id !== itemId && i.visible && contains(hitBox(i.anchor, i.width, i.height, view), point))
    .sort((a, b) => rank[a.kind] - rank[b.kind] || distance(a.anchor) - distance(b.anchor) || a.id.localeCompare(b.id))
    .map(i => ({kind: 'item', id: i.id}) as DropTarget);
  return candidates.find(accepts) ?? candidates[0] ?? null;
}
