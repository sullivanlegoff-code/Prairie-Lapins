import Phaser from 'phaser';
import {NURSERY_OVERLAY_ART} from '../config/nurseryArt';
import {nurserySlotStates, type NurserySlotState} from '../simulation/nursery';
import {emptyBuilding} from '../state/initial';
import {buildingCenter} from '../ui/gestures';
import {toScreen} from '../ui/projection';
import type {Building, GameState} from '../state/types';
import {slotOverlays, slotPlacement} from './nurseryOverlayModel';

type Point = {x: number; y: number};
interface SlotViews {halo: Phaser.GameObjects.Image; baby: Phaser.GameObjects.Image; veil: Phaser.GameObjects.Image; lock: Phaser.GameObjects.Image}
/** How a set is drawn: the real nursery is opaque and untinted; the move preview shares its ghost base's opacity and tint. */
export interface CushionLook {alpha: number; tint: number | null}
const OPAQUE: CushionLook = {alpha: 1, tint: null};
/** Depth offsets above the base (halo behind the baby, lock in front of the veil), times the depth unit of the layer they live in. */
const LAYER = {halo: .1, baby: .2, veil: .3, lock: .4} as const;

/** One shared soft radial gradient, generated once and stretched per cushion. */
function haloTexture(scene: Phaser.Scene): string {
  const {texture, rgb, stops} = NURSERY_OVERLAY_ART.halo;
  if (!scene.textures.exists(texture)) {
    const size = 256, canvas = scene.textures.createCanvas(texture, size, size)!, g = canvas.getContext();
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [offset, alpha] of stops) gradient.addColorStop(offset, `rgba(${rgb},${alpha})`);
    g.fillStyle = gradient; g.fillRect(0, 0, size, size); canvas.refresh();
  }
  return texture;
}

/**
 * The sixteen objects of one nursery (four per cushion): the single place that turns four slot states into overlays, for the
 * real building and for its move preview alike. Objects are created once; `apply` only moves, toggles, tints and re-sorts them, and
 * does nothing when its inputs are unchanged.
 */
class CushionSet {
  readonly slots: SlotViews[];
  private signature = '';
  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container | null) {
    const art = NURSERY_OVERLAY_ART, halo = haloTexture(scene);
    const sprite = (a: typeof art.baby | typeof art.veil | typeof art.lock) => scene.add.image(0, 0, a.texture).setOrigin(a.originX, a.originY).setVisible(false);
    this.slots = [0, 1, 2, 3].map(() => {
      const views = {halo: scene.add.image(0, 0, halo).setVisible(false), baby: sprite(art.baby).setAngle(art.baby.angle), veil: sprite(art.veil), lock: sprite(art.lock)};
      layer?.add([views.halo, views.baby, views.veil, views.lock]); return views;
    });
  }
  /** Returns whether anything changed (the caller re-sorts its container then). */
  apply(states: readonly NurserySlotState[], c: Point, depth: number, unit: number, look: CushionLook): boolean {
    const signature = JSON.stringify([c.x, c.y, states, depth, unit, look.alpha, look.tint]);
    if (signature === this.signature) return false;
    this.signature = signature;
    states.forEach((state, slot) => {
      const show = slotOverlays(state), place = slotPlacement(slot as 0 | 1 | 2 | 3), v = this.slots[slot];
      const style = (image: Phaser.GameObjects.Image) => { image.setAlpha(look.alpha); if (look.tint === null) image.clearTint(); else image.setTint(look.tint); return image; };
      style(v.halo).setPosition(c.x + place.halo.x, c.y + place.halo.y).setDisplaySize(place.halo.width, place.halo.height).setDepth(depth + LAYER.halo * unit).setVisible(show.halo);
      style(v.baby).setPosition(c.x + place.baby.x, c.y + place.baby.y).setScale(place.baby.scale).setDepth(depth + LAYER.baby * unit).setVisible(show.baby);
      style(v.veil).setPosition(c.x + place.veil.x, c.y + place.veil.y).setScale(place.veil.scale).setDepth(depth + LAYER.veil * unit).setVisible(show.veil);
      style(v.lock).setPosition(c.x + place.lock.x, c.y + place.lock.y).setScale(place.lock.scale).setDepth(depth + LAYER.lock * unit).setVisible(show.lock);
    });
    return true;
  }
  hide(): void { this.signature = ''; for (const v of this.slots) for (const image of [v.halo, v.baby, v.veil, v.lock]) image.setVisible(false); }
  destroy(): void { for (const v of this.slots) for (const image of [v.halo, v.baby, v.veil, v.lock]) image.destroy(); }
}

/**
 * The four cushion states of the one nursery, as independent overlays on the base, with no per-cushion interaction. The real
 * building's set lives in the buildings layer; a second set, created on first use and then reused, accompanies the move
 * preview's ghost. Everything derives from the canonical state at the simulation time (`readyAt <= lastSimulatedAt`); no
 * species is ever read.
 */
export class NurseryOverlays {
  private real = new Map<string, CushionSet>();
  private ghostSet: CushionSet | null = null;
  private lastGhost: {states: NurserySlotState[]; center: Point; look: CushionLook} | null = null;
  constructor(private scene: Phaser.Scene, private layer: Phaser.GameObjects.Container) {}

  static preload(scene: Phaser.Scene): void {
    for (const art of [NURSERY_OVERLAY_ART.baby, NURSERY_OVERLAY_ART.veil, NURSERY_OVERLAY_ART.lock]) if (!scene.textures.exists(art.texture)) scene.load.image(art.texture, art.url);
  }
  /** Brings the real nursery's overlays in line with the state: creates, moves, toggles or destroys; never rebuilds what is unchanged. */
  sync(state: GameState | null): void {
    const present = new Set<string>(); let changed = false;
    for (const b of state?.buildings ?? []) {
      if (b.kind !== 'nursery' || !b.nursery) continue;
      present.add(b.id);
      let set = this.real.get(b.id);
      if (!set) { set = new CushionSet(this.scene, this.layer); this.real.set(b.id, set); }
      const c = toScreen(buildingCenter(b));
      if (set.apply(nurserySlotStates(b, state!.lastSimulatedAt), c, c.y, 1, OPAQUE)) changed = true;
    }
    for (const id of [...this.real.keys()]) if (!present.has(id)) { this.real.get(id)!.destroy(); this.real.delete(id); changed = true; }
    if (changed) this.layer.sort('depth');
  }
  /**
   * The move preview's overlays at the candidate cell: the states of the building being moved (a new nursery shows a fresh one:
   * one empty cushion, three locked), with the ghost base's own opacity and tint. `visible` is false in photo mode.
   */
  showGhost(state: GameState | null, moving: Building | null, center: Point, look: CushionLook, visible: boolean): void {
    this.lastGhost = {states: nurserySlotStates(moving ?? emptyBuilding('building-ghost', 'nursery', 0, 0), state?.lastSimulatedAt ?? 0), center, look};
    if (visible) this.applyGhost(); else this.ghostSet?.hide();
  }
  private applyGhost(): void {
    const g = this.lastGhost; if (!g) return;
    // The ghost base is a root object at depth 1.5: its overlays sit just above it, in the same order as on the real building.
    (this.ghostSet ??= new CushionSet(this.scene, null)).apply(g.states, g.center, 1.5, .01, g.look);
  }
  /** Photo mode: hide the preview, or restore the last one (only if a preview is still wanted). */
  setGhostVisible(visible: boolean): void { if (visible) this.applyGhost(); else this.ghostSet?.hide(); }
  /** No preview: cancelled, confirmed, another placement, or no candidate cell. The set is kept hidden for reuse. */
  hideGhost(): void { this.lastGhost = null; this.ghostSet?.hide(); }
  /** Scene shutdown: no orphaned objects, and the generated halo texture goes with them. */
  destroy(): void {
    for (const set of this.real.values()) set.destroy(); this.real.clear();
    this.ghostSet?.destroy(); this.ghostSet = null; this.lastGhost = null;
    if (this.scene.textures.exists(NURSERY_OVERLAY_ART.halo.texture)) this.scene.textures.remove(NURSERY_OVERLAY_ART.halo.texture);
  }
}
