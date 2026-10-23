import {describe, expect, it} from 'vitest';
import {createGame} from '../src/simulation';
import {nurserySlotStates} from '../src/simulation/nursery';
import {NURSERY_ART, NURSERY_OVERLAY_ART, NURSERY_ROW_SCALE, NURSERY_SLOT_ANCHORS} from '../src/config/nurseryArt';
import {BASE_PIXEL, baseToWorld, slotOverlays, slotPlacement} from '../src/display/nurseryOverlayModel';
import {VISUAL} from '../src/config/visual';
import type {Building, GameState, NurseryBaby, NurseryCapacity, NurserySlot} from '../src/state/types';

const nursery = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
const baby = (slot: NurserySlot, readyAt: number, id = `birth-${10 + slot}`): NurseryBaby =>
  ({slot, birth: {id, species: 'paille', guaranteed: false, reservedDiscovery: false}, startedAt: 0, readyAt});
function withNursery(capacity: NurseryCapacity, babies: NurseryBaby[]): Building {
  const s = createGame(0); nursery(s).nursery = {capacity, babies}; return nursery(s);
}

describe('cushion state of each slot', () => {
  it('a new game: one empty cushion, three locked', () => {
    expect(nurserySlotStates(nursery(createGame(0)), 0)).toEqual(['empty', 'locked', 'locked', 'locked']);
  });
  it('locks exactly the slots beyond the capacity, for every capacity', () => {
    for (const capacity of [1, 2, 3, 4] as const) expect(nurserySlotStates(withNursery(capacity, []), 0)).toEqual(
      [0, 1, 2, 3].map(slot => slot < capacity ? 'empty' : 'locked'));
  });
  it('a baby is growing until readyAt <= now, then ready, with no other input', () => {
    const b = withNursery(2, [baby(0, 1000), baby(1, 2000)]);
    expect(nurserySlotStates(b, 999)).toEqual(['growing', 'growing', 'locked', 'locked']);
    expect(nurserySlotStates(b, 1000)).toEqual(['ready', 'growing', 'locked', 'locked']);
    expect(nurserySlotStates(b, 5000)).toEqual(['ready', 'ready', 'locked', 'locked']);
  });
  it('follows the stored slot, never the array order, and keeps holes', () => {
    const b = withNursery(4, [baby(3, 0), baby(0, 9e9), baby(2, 0)]);
    expect(nurserySlotStates(b, 100)).toEqual(['growing', 'empty', 'ready', 'ready']);
    expect(nurserySlotStates({...b, nursery: {capacity: 4, babies: [...b.nursery!.babies].reverse()}}, 100)).toEqual(['growing', 'empty', 'ready', 'ready']);
  });
  it('never reads the species: the same states for any species', () => {
    const a = withNursery(2, [baby(0, 0), baby(1, 9e9)]), b = structuredClone(a); b.nursery!.babies.forEach(x => { x.birth.species = 'dragon'; x.birth.reservedDiscovery = false; });
    expect(nurserySlotStates(b, 10)).toEqual(nurserySlotStates(a, 10));
  });
});

describe('which overlays a cushion shows', () => {
  it('empty: none; locked: veil + lock; growing: baby; ready: baby + halo', () => {
    expect(slotOverlays('empty')).toEqual({veil: false, lock: false, baby: false, halo: false});
    expect(slotOverlays('locked')).toEqual({veil: true, lock: true, baby: false, halo: false});
    expect(slotOverlays('growing')).toEqual({veil: false, lock: false, baby: true, halo: false});
    expect(slotOverlays('ready')).toEqual({veil: false, lock: false, baby: true, halo: true});
  });
});

/** Measured on the approved base PNG: the mint hollow of each cushion, [left, top, right, bottom] in PNG pixels. */
const HOLLOWS = [[236, 432, 598, 614], [661, 432, 1021, 611], [292, 256, 604, 409], [653, 256, 964, 409]] as const;
/** The visible pixels (alpha > 8) of each approved sprite, [left, top, right, bottom], measured on the files. */
const VISIBLE = {baby: [297, 158, 963, 1100], veil: [41, 333, 1212, 939], lock: [234, 210, 1019, 1051]} as const;
const rect = (a: readonly number[]) => ({l: a[0], t: a[1], r: a[2], b: a[3]});
const intersects = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
/** An overlay's visible box in base-PNG pixels: anchor + offset, scaled by its fraction and the row scale, rotated about its origin. */
function box(slot: 0 | 1 | 2 | 3, kind: 'baby' | 'veil' | 'lock') {
  const art = NURSERY_OVERLAY_ART[kind], a = NURSERY_SLOT_ANCHORS[slot], f = art.scale * NURSERY_ROW_SCALE[a.row], v = VISIBLE[kind];
  const angle = kind === 'baby' ? NURSERY_OVERLAY_ART.baby.angle * Math.PI / 180 : 0, ox = art.originX * 1254, oy = art.originY * 1254;
  const pts = [[v[0], v[1]], [v[2], v[1]], [v[2], v[3]], [v[0], v[3]]].map(([x, y]) => { const dx = x - ox, dy = y - oy;
    return [a.x + (dx * Math.cos(angle) - dy * Math.sin(angle)) * f, a.y + art.dy + (dx * Math.sin(angle) + dy * Math.cos(angle)) * f]; });
  return {l: Math.min(...pts.map(p => p[0])), r: Math.max(...pts.map(p => p[0])), t: Math.min(...pts.map(p => p[1])), b: Math.max(...pts.map(p => p[1]))};
}

describe('overlay geometry on the approved base', () => {
  it('four distinct anchors, each inside its own measured hollow; slots fill the front row first, left to right', () => {
    expect(new Set(NURSERY_SLOT_ANCHORS.map(a => `${a.x},${a.y}`)).size).toBe(4);
    NURSERY_SLOT_ANCHORS.forEach((a, slot) => { const h = rect(HOLLOWS[slot]); expect(a.x > h.l && a.x < h.r && a.y > h.t && a.y < h.b, `slot ${slot} anchor in its hollow`).toBe(true); });
    expect(NURSERY_SLOT_ANCHORS.map(a => a.row)).toEqual(['front', 'front', 'back', 'back']);
    expect(NURSERY_SLOT_ANCHORS[0].x).toBeLessThan(NURSERY_SLOT_ANCHORS[1].x); expect(NURSERY_SLOT_ANCHORS[2].x).toBeLessThan(NURSERY_SLOT_ANCHORS[3].x);
  });
  it('no overlay of a cushion reaches a neighbouring hollow or the door', () => {
    const door = {l: 490, t: 770, r: 760, b: 1058};
    for (const slot of [0, 1, 2, 3] as const) for (const kind of ['baby', 'veil', 'lock'] as const) {
      const own = box(slot, kind);
      HOLLOWS.forEach((h, other) => { if (other !== slot) expect(intersects(own, rect(h)), `slot ${slot} ${kind} vs hollow ${other}`).toBe(false); });
      expect(intersects(own, door), `slot ${slot} ${kind} vs the door`).toBe(false);
    }
  });
  it('the veil covers its own hollow; the lock sits on the veil; the baby stays within its hollow band', () => {
    for (const slot of [0, 1, 2, 3] as const) {
      const h = rect(HOLLOWS[slot]), veil = box(slot, 'veil'), lock = box(slot, 'lock'), babyBox = box(slot, 'baby');
      expect((veil.r - veil.l) / (h.r - h.l), `slot ${slot} veil covers most of the hollow width`).toBeGreaterThan(.9);
      expect(Math.abs((veil.l + veil.r) / 2 - (h.l + h.r) / 2), `slot ${slot} veil centred on the hollow`).toBeLessThan(20);
      expect(lock.l >= veil.l && lock.r <= veil.r && lock.t >= veil.t && lock.b <= veil.b, `slot ${slot} lock on the veil`).toBe(true);
      expect(babyBox.l >= h.l - 30 && babyBox.r <= h.r + 30, `slot ${slot} baby within the hollow width`).toBe(true);
    }
  });
  it('back cushions shrink with their hollow; every placement is the same sprite and scale rule for any state', () => {
    const front = slotPlacement(0), back = slotPlacement(2);
    for (const kind of ['baby', 'veil', 'lock'] as const) expect(back[kind].scale / front[kind].scale).toBeCloseTo(NURSERY_ROW_SCALE.back, 6);
    expect(slotPlacement(1).baby.scale).toBe(front.baby.scale); expect(slotPlacement(3).baby.scale).toBe(back.baby.scale);
  });
  it('is expressed in the base frame: world offsets are base pixels times the base scale, independent of any camera', () => {
    expect(BASE_PIXEL).toBe(NURSERY_ART.worldWidth / NURSERY_ART.width);
    const a = NURSERY_SLOT_ANCHORS[0], p = slotPlacement(0);
    expect(p.baby.x).toBeCloseTo((a.x - 627) * BASE_PIXEL, 9); expect(p.baby.y).toBeCloseTo(baseToWorld(a.x, a.y + NURSERY_OVERLAY_ART.baby.dy).y, 9);
    expect(p.halo.x).toBe(p.baby.x); expect(p.halo.y).toBe(p.baby.y);
  });
});

// Presence in public/: the approved sources stay untouched, and the reduced copies are what the game loads.
const shipped = Object.keys(import.meta.glob('../public/assets/buildings/nursery-v2-*.png', {eager: true, query: '?url'}));
describe('approved overlay sprites in public/assets', () => {
  for (const name of ['baby', 'veil', 'lock'] as const) it(`${name}: the source is kept and the game loads its reduced copy under the configured texture`, () => {
    const art = NURSERY_OVERLAY_ART[name];
    expect(shipped).toContain(`../public/assets/buildings/nursery-v2-${name}.png`);
    expect(art.url.endsWith(`/assets/buildings/nursery-v2-${name}-${art.width}.png`)).toBe(true);
    expect(shipped).toContain(`../public/assets/buildings/nursery-v2-${name}-${art.width}.png`);
    expect(art.url.endsWith(`nursery-v2-${name}.png`), 'never the 1254² source').toBe(false);
    expect(art.texture).toBe(`nursery-v2-${name}`);
  });
});

describe('reduced overlay textures keep the artistic frame', () => {
  const kinds = ['baby', 'veil', 'lock'] as const;
  it('texture size is independent of the 1254² frame; origins and scales stay expressed in that frame', () => {
    for (const kind of kinds) { const art = NURSERY_OVERLAY_ART[kind]; expect(art.sourceSize).toBe(1254); expect(art.width).toBe(art.height); expect(art.width).toBeLessThan(art.sourceSize); }
  });
  it('a reduced texture is drawn so that its visible pixels land exactly where the source\'s did', () => {
    for (const slot of [0, 1, 2, 3] as const) for (const kind of kinds) {
      const art = NURSERY_OVERLAY_ART[kind], a = NURSERY_SLOT_ANCHORS[slot], p = slotPlacement(slot)[kind];
      // Displayed size of the whole texture in world units = the source frame (1254 px) at its source-frame scale.
      expect(p.scale * art.width).toBeCloseTo(art.scale * NURSERY_ROW_SCALE[a.row] * BASE_PIXEL * art.sourceSize, 9);
    }
  });
  it('sizes follow the measured on-screen size: at least 2× the maximal display (no upscaling), never wastefully larger', () => {
    for (const kind of kinds) for (const slot of [0, 2] as const) {
      const art = NURSERY_OVERLAY_ART[kind], displayed = art.width * slotPlacement(slot)[kind].scale * VISUAL.camera.maxZoom; // framebuffer = CSS px
      expect(art.width / displayed, `${kind} slot ${slot}`).toBeGreaterThanOrEqual(2); expect(art.width / displayed, `${kind} slot ${slot}`).toBeLessThanOrEqual(4);
    }
  });
  it('the three textures weigh at most a fifth of the 1254² originals in RGBA memory (at most 20%, here about 2%)', () => {
    const rgba = (n: number) => n * n * 4, original = 3 * rgba(1254), reduced = rgba(NURSERY_OVERLAY_ART.baby.width) + rgba(NURSERY_OVERLAY_ART.veil.width) + rgba(NURSERY_OVERLAY_ART.lock.width);
    expect(reduced / original).toBeLessThan(.2);
  });
});
