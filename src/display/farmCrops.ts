import Phaser from 'phaser';
import {farmArtFor, type FarmArt} from '../config/farmArt';
import {buildingCenter} from '../ui/gestures';
import {toScreen} from '../ui/projection';
import type {GameState} from '../state/types';
import {CROP_IDS, CROP_TEXTURE, CROP_URL, SPROUT_TEXTURE, SPROUT_URL} from './food';

/** Plant points on a farm picture's furrows (the level 2 picture by default), as world offsets from the building point, back rows first. */
export function furrowPoints(art: FarmArt = farmArtFor(2)): {x: number; y: number}[] {
  const {T, L, R, rows, perRow, along} = art.furrows, k = art.worldWidth / art.width, points = [];
  for (let row = 0; row < rows; row++) for (let i = 0; i < perRow; i++) {
    const f = (row + .5) / rows, t = along[0] + (along[1] - along[0]) * i / (perRow - 1);
    const px = T[0] + f * (L[0] - T[0]) + t * (R[0] - T[0]), py = T[1] + f * (L[1] - T[1]) + t * (R[1] - T[1]);
    points.push({x: (px - art.width / 2) * k, y: (py - art.originY * art.height) * k});
  }
  return points.sort((a, b) => a.y - b.y);
}

/** What a farm shows on its furrows: nothing, sprouts while the crop grows, the crop itself once ready to harvest. */
export const furrowState = (b: GameState['buildings'][number], now: number): 'empty' | 'growing' | 'ripe' => !b.order ? 'empty' : b.order.endsAt <= now ? 'ripe' : 'growing';

/** The plants of every farm, created once per farm and only re-textured when its crop or stage changes. */
export class FarmCrops {
  private readonly views = new Map<string, {plants: Phaser.GameObjects.Image[]; signature: string}>();
  /** Plant points per farm picture (the level 4 windmill has its own, larger field). */
  private readonly points = new Map<string, {x: number; y: number}[]>();
  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Container) {}
  static preload(scene: Phaser.Scene): void {
    if (!scene.textures.exists(SPROUT_TEXTURE)) scene.load.image(SPROUT_TEXTURE, SPROUT_URL);
    for (const id of CROP_IDS) if (!scene.textures.exists(CROP_TEXTURE(id))) scene.load.image(CROP_TEXTURE(id), CROP_URL(id));
  }
  private pointsOf(art: FarmArt): {x: number; y: number}[] {
    let points = this.points.get(art.texture); if (!points) { points = furrowPoints(art); this.points.set(art.texture, points); } return points;
  }
  sync(s: GameState | null): void {
    const present = new Set<string>(); let changed = false;
    for (const b of s?.buildings.filter(b => b.kind === 'farm') ?? []) {
      present.add(b.id);
      const art = farmArtFor(b.farmLevel), points = this.pointsOf(art), k = art.worldWidth / art.width, {sproutSize, ripeSize} = art.furrows;
      const c = toScreen(buildingCenter(b)), stage = furrowState(b, s!.lastSimulatedAt), signature = JSON.stringify([c.x, c.y, stage, b.order?.recipe, art.texture]);
      let view = this.views.get(b.id);
      // A farm that changes picture (level 4) gets the plants of its new field.
      if (view && view.plants.length !== points.length) { for (const plant of view.plants) plant.destroy(); this.views.delete(b.id); view = undefined; }
      if (!view) { view = {plants: points.map(() => this.scene.add.image(0, 0, SPROUT_TEXTURE).setVisible(false)), signature: ''}; this.layer.add(view.plants); this.views.set(b.id, view); }
      if (view.signature === signature) continue;
      view.signature = signature; changed = true;
      view.plants.forEach((plant, i) => {
        if (stage === 'empty' || !b.order) { plant.setVisible(false); return; }
        const texture = stage === 'ripe' ? CROP_TEXTURE(b.order.recipe) : SPROUT_TEXTURE, size = (stage === 'ripe' ? ripeSize : sproutSize) * k;
        plant.setTexture(texture).setOrigin(.5, .85).setPosition(c.x + points[i].x, c.y + points[i].y);
        // Above the farm's own picture (depth c.y), each row in front of the one behind it, below anything standing further forward.
        plant.setScale(size / plant.width).setDepth(c.y + .01 + i * .001).setVisible(true);
      });
    }
    for (const [id, view] of this.views) if (!present.has(id)) { for (const plant of view.plants) plant.destroy(); this.views.delete(id); changed = true; }
    if (changed) this.layer.sort('depth');
  }
}
