import {NURSERY_ART, NURSERY_OVERLAY_ART, NURSERY_ROW_SCALE, NURSERY_SLOT_ANCHORS} from '../config/nurseryArt';
import type {NurserySlotState} from '../simulation/nursery';
import type {Building} from '../state/types';

/** Pure nursery overlay layout: which overlays a cushion shows, and where, in world units from the building anchor. */
export interface SlotOverlays {veil: boolean; lock: boolean; baby: boolean; halo: boolean}
/** A growing or ready baby is the same shared sprite (no species is read); only a ready one has the halo; locked shows veil + lock. */
export const slotOverlays = (state: NurserySlotState): SlotOverlays => ({
  veil: state === 'locked', lock: state === 'locked', baby: state === 'growing' || state === 'ready', halo: state === 'ready',
});
/** World units per pixel of the base PNG: the same scale the base is drawn with. */
export const BASE_PIXEL = NURSERY_ART.worldWidth / NURSERY_ART.width;
/** A pixel of the base PNG as an offset from the building anchor (the point at the base's horizontal centre and `originY`). */
export const baseToWorld = (px: number, py: number) => ({x: (px - NURSERY_ART.width / 2) * BASE_PIXEL, y: (py - NURSERY_ART.originY * NURSERY_ART.height) * BASE_PIXEL});

export interface OverlayPlacement {x: number; y: number; scale: number}
export interface SlotPlacement {halo: {x: number; y: number; width: number; height: number}; baby: OverlayPlacement; veil: OverlayPlacement; lock: OverlayPlacement}
/** Placement of every overlay of a cushion: anchor, row scale (back cushions are smaller), per-sprite offsets and texture reduction. */
export function slotPlacement(slot: 0 | 1 | 2 | 3): SlotPlacement {
  const anchor = NURSERY_SLOT_ANCHORS[slot], row = NURSERY_ROW_SCALE[anchor.row], art = NURSERY_OVERLAY_ART;
  // `scale` is what Phaser applies per texture pixel: the source-frame fraction, widened by how much the texture was reduced.
  const at = (kind: 'baby' | 'veil' | 'lock'): OverlayPlacement => ({...baseToWorld(anchor.x, anchor.y + art[kind].dy), scale: art[kind].scale * row * BASE_PIXEL * (art[kind].sourceSize / art[kind].width)});
  const baby = at('baby');
  return {
    // The halo follows the baby, so it shares its position; its size is an ellipse in base pixels.
    halo: {x: baby.x, y: baby.y, width: 2 * art.halo.rx * row * BASE_PIXEL, height: 2 * art.halo.ry * row * BASE_PIXEL},
    baby, veil: at('veil'), lock: at('lock'),
  };
}

/** Half-size of a baby's touch target in screen pixels: a 52 px square at least, above the 44 px a small phone needs. */
export const BABY_TOUCH_RADIUS = 26;
/**
 * The ready baby touched on its cushion (owner, 2 November 2026: « cliquer sur le lapereau pour déclencher la naissance »), or
 * null. `center` is the nursery's anchor and `world` the touch, both in world units; `zoom` turns them into screen pixels. The
 * target is the halo's ellipse, never smaller than BABY_TOUCH_RADIUS; when two overlap, the nearest baby wins. A growing baby is
 * never a target (the nursery itself answers). Readiness uses `now`, the same simulation time the overlays are drawn with.
 */
export function nurseryBabyHit(b: Building, now: number, center: {x: number; y: number}, world: {x: number; y: number}, zoom: number): string | null {
  let best: string | null = null, distance = Infinity;
  for (const baby of b.nursery?.babies ?? []) {
    if (baby.readyAt > now) continue;
    const place = slotPlacement(baby.slot);
    const dx = (world.x - (center.x + place.baby.x)) * zoom, dy = (world.y - (center.y + place.baby.y)) * zoom;
    const rx = Math.max(BABY_TOUCH_RADIUS, place.halo.width / 2 * zoom), ry = Math.max(BABY_TOUCH_RADIUS, place.halo.height / 2 * zoom);
    if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1) continue;
    const d = dx * dx + dy * dy;
    if (d < distance) { best = baby.birth.id; distance = d; }
  }
  return best;
}
