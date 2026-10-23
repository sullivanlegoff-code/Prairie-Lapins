import type {DropTarget, KitchenSnapshot} from './engine';
import type {Point, ZoneDefinition} from './recipes';
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
/** Explicit hit testing: event.target under pointer capture is never a drop destination. */
export function resolveDrop(point: Point, itemId: string, snapshot: KitchenSnapshot, zones: readonly ZoneDefinition[], view: View): DropTarget | null {
  if (!contains(view, point)) return null;
  const dragged = snapshot.items.find(i => i.id === itemId);
  if (dragged?.kind === 'bottle') {
    const food = snapshot.items.find(i => i.visible && i.interactive && i.kind === 'food' && contains(hitBox(i.anchor, i.width, i.height, view), point));
    if (food) return {kind: 'item', id: food.id};
  }
  if (dragged?.kind === 'tool') {
    const food = snapshot.items.find(i => i.visible && i.kind === 'food' && i.zoneId === 'cutting-board' && contains(hitBox(i.anchor, i.width, i.height, view), point));
    if (food) return {kind: 'item', id: food.id};
  }
  const candidates = zones.filter(z => {
    if (z.owner && !snapshot.items.find(i => i.id === z.owner)?.visible) return false;
    if (z.id === 'bowl' && snapshot.recipe !== 'salad') return false;
    if (['baking-dish', 'dish-rack', 'oven'].includes(z.id) && snapshot.recipe !== 'chicken') return false;
    return contains(hitBox(z.anchor, z.width, z.height, view), point);
  });
  candidates.sort((a, b) => b.priority - a.priority ||
    Math.hypot(point.x - toClient(a.anchor, view).x, point.y - toClient(a.anchor, view).y) - Math.hypot(point.x - toClient(b.anchor, view).x, point.y - toClient(b.anchor, view).y) || a.id.localeCompare(b.id));
  return candidates[0] ? {kind: 'zone', id: candidates[0].id} : null;
}
