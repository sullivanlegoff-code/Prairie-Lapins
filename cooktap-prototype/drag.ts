import {KitchenEngine, type ActionResult} from './engine';
import {resolveDrop, toClient, toWorld} from './geometry';
import type {Point} from './recipes';
import type {KitchenScene} from './scene';

export const DRAG_THRESHOLD = 7; // CSS pixels, independent of scene scale.
export function bindKitchenDrag(surface: HTMLElement, engine: KitchenEngine, scene: KitchenScene, report: (result: ActionResult) => void) {
  const abort = new AbortController(), doc = surface.ownerDocument;
  const pointers = new Set<number>(); let multiBlocked = false, frame = 0;
  let active: {id: string; pointer: number; origin: Point; down: Point; offset: Point; moved: boolean; pending: Point | null; draggable: boolean} | null = null;
  let suppressNextPointerClick = false;
  const point = (e: PointerEvent): Point => ({x: e.clientX, y: e.clientY});
  const release = (pointer: number) => { try { if (surface.hasPointerCapture(pointer)) surface.releasePointerCapture(pointer); } catch { /* Already cancelled by browser. */ } };
  const clearFrame = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
  const effect = (result: ActionResult) => {
    if (!result.effect || !result.effectTargetId) return;
    if (result.effect === 'pour') { scene.playEffect('olive-oil', 'pour'); scene.playEffect('bowl', 'dressed'); }
    else if (result.effect === 'season') scene.playEffect(result.effectTargetId, 'season');
    else if (result.effect === 'oven') scene.playEffect('oven', 'oven');
    else if (result.effect === 'cut' || result.effect === 'peel') scene.playEffect(result.effectTargetId, result.effect);
  };
  function cancel(message = 'Manipulation annulée. L’objet retrouve sa place.'): void {
    if (!active) return;
    const drag = active; active = null; clearFrame(); release(drag.pointer);
    scene.finish(drag.id, engine.snapshot(), 'cancelled'); report({accepted: false, message});
  }
  const anchorAt = (p: Point): Point => { const local = toWorld(p, scene.getView()); return {x: local.x - active!.offset.x, y: local.y - active!.offset.y}; };
  function show(p: Point): void {
    if (!active?.moved) return;
    const anchor = anchorAt(p); scene.move(active.id, anchor);
    const target = resolveDrop(toClient(anchor, scene.getView()), active.id, engine.snapshot(), engine.zones, scene.getView());
    scene.hover(target, engine.preview(active.id, target).accepted);
  }
  // Count pointers on the whole document: a second finger outside the table also cancels.
  doc.addEventListener('pointerdown', e => { pointers.add(e.pointerId); if (pointers.size > 1) { multiBlocked = true; cancel('Deux doigts détectés : l’objet retrouve sa place.'); } }, {capture: true, signal: abort.signal});
  const untrack = (e: PointerEvent) => { pointers.delete(e.pointerId); if (!pointers.size) multiBlocked = false; };
  doc.addEventListener('pointerup', untrack, {capture: true, signal: abort.signal});
  doc.addEventListener('pointercancel', e => { untrack(e); if (active?.pointer === e.pointerId) cancel(); }, {capture: true, signal: abort.signal});
  surface.addEventListener('pointerdown', e => {
    if (active || multiBlocked || pointers.size !== 1 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const node = (e.target as Element).closest<HTMLElement>('[data-item]'), id = node?.dataset.item;
    if (!id || (!engine.canDrag(id) && !engine.canSelect(id))) return;
    const item = engine.snapshot().items.find(i => i.id === id)!, local = toWorld(point(e), scene.getView());
    active = {id, pointer: e.pointerId, origin: {...item.anchor}, down: point(e), offset: {x: local.x - item.anchor.x, y: local.y - item.anchor.y}, moved: false, pending: null, draggable: engine.canDrag(id)};
    try { surface.setPointerCapture(e.pointerId); } catch { /* Synthetic test events / browser interruption. */ }
  }, {signal: abort.signal});
  surface.addEventListener('pointermove', e => {
    if (!active || active.pointer !== e.pointerId) return;
    if (engine.paused) { cancel(); return; }
    const p = point(e);
    if (!active.moved && Math.hypot(p.x - active.down.x, p.y - active.down.y) < DRAG_THRESHOLD) return;
    if (!active.draggable) { active = null; release(e.pointerId); suppressNextPointerClick = true; scene.render(engine.snapshot()); return; }
    if (!active.moved) { active.moved = true; scene.begin(active.id); }
    active.pending = p;
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (active?.pending) show(active.pending); });
  }, {signal: abort.signal});
  surface.addEventListener('pointerup', e => {
    if (!active || active.pointer !== e.pointerId) return;
    if (engine.paused) { cancel(); return; }
    const drag = active; clearFrame();
    if (!drag.moved) {
      active = null; release(drag.pointer); suppressNextPointerClick = true;
      const result = engine.dispatch({type: 'select', itemId: drag.id});
      effect(result);
      scene.render(engine.snapshot()); report(result); return;
    }
    show(point(e));
    const target = resolveDrop(toClient(anchorAt(point(e)), scene.getView()), drag.id, engine.snapshot(), engine.zones, scene.getView());
    active = null; release(drag.pointer);
    const result = drag.id === 'knife' && target?.kind === 'item'
      ? engine.dispatch({type: 'use-tool', toolId: drag.id, targetId: target.id})
      : engine.dispatch({type: 'drop', itemId: drag.id, target});
    effect(result);
    scene.finish(drag.id, engine.snapshot(), result.accepted ? 'accepted' : 'rejected'); report(result);
  }, {signal: abort.signal});
  surface.addEventListener('lostpointercapture', e => { if (active?.pointer === e.pointerId) cancel(); }, {signal: abort.signal});
  // Native keyboard activation and pointer taps only select; application requires a drop.
  surface.addEventListener('click', e => {
    const id = (e.target as Element).closest<HTMLElement>('[data-item]')?.dataset.item;
    const item = engine.snapshot().items.find(i => i.id === id);
    if (e.detail > 0 && suppressNextPointerClick) { suppressNextPointerClick = false; return; }
    if (id && item && (e.detail === 0 || !item.draggable)) {
      const result = engine.dispatch({type: 'select', itemId: id});
      effect(result);
      scene.render(engine.snapshot()); report(result);
    }
  }, {signal: abort.signal});
  return {
    // OS interruptions may never deliver the old pointerup. Discard that stale pointer cohort.
    cancel() { cancel(); pointers.clear(); multiBlocked = false; },
    get activeId() { return active?.id ?? null; },
    dispose() { cancel(); clearFrame(); abort.abort(); pointers.clear(); },
  };
}
