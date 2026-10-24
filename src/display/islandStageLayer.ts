import type Phaser from 'phaser';
import {STAGE_PX_PER_UNIT, stageArt, type StageArt} from '../config/islandStages';

/** Queues the tiles of one stage that are not loaded yet; returns true when some had to be queued. */
export function queueStage(scene: Phaser.Scene, art: StageArt): boolean {
  let queued = false;
  for (const tile of art.tiles) if (!scene.textures.exists(tile.key)) { scene.load.image(tile.key, tile.url); queued = true; }
  return queued;
}

/**
 * The painted island of the current stage: over the grass tiles (its lawn fades into them near the rim) and below
 * every upright layer. Only one stage is resident: the next one is loaded on demand, shown once complete, then the
 * previous textures are released. No frame or camera listener.
 */
export class IslandStageLayer {
  readonly root: Phaser.GameObjects.Container;
  private shown: {stage: number; view: Phaser.GameObjects.Container} | null = null;
  private wanted: number | null = null;
  private disposed = false;
  constructor(private readonly scene: Phaser.Scene) {
    // Ground (grass) is at 0 and buildings at .1.
    this.root = scene.add.container(0, 0).setDepth(.05);
    scene.events.once('shutdown', this.destroy, this);
    this.root.once('destroy', () => {
      this.disposed = true; if (this.shown) this.release(this.shown.stage); this.shown = null;
      scene.events.off('shutdown', this.destroy, this);
    });
  }
  get stage(): number | null { return this.shown?.stage ?? null; }
  /** Shows `stage` as soon as its tiles are available; `ready` runs once it is visible. */
  request(stage: number, ready?: () => void): void {
    if (this.disposed) return;
    this.wanted = stage;
    if (this.shown?.stage === stage) { ready?.(); return; }
    const art = stageArt(stage);
    if (!queueStage(this.scene, art)) { this.show(art); ready?.(); return; }
    const loader = this.scene.load, complete = () => {
      if (this.disposed || this.wanted !== stage) return;
      if (art.tiles.every(t => this.scene.textures.exists(t.key))) { this.show(art); ready?.(); }
    };
    loader.once('complete', complete);
    if (!loader.isLoading()) loader.start();
  }
  /** Hides the painting (shape outside the fixed order) and releases its textures. */
  clear(): void {
    this.wanted = null;
    if (!this.shown) return;
    this.shown.view.destroy(); this.release(this.shown.stage); this.shown = null;
  }
  destroy(): void { if (!this.disposed) this.root.destroy(); }
  private show(art: StageArt): void {
    const view = this.scene.add.container(art.canvas.left, art.canvas.top);
    for (const tile of art.tiles) view.add(this.scene.add.image(tile.x / STAGE_PX_PER_UNIT, tile.y / STAGE_PX_PER_UNIT, tile.key).setOrigin(0).setScale(1 / STAGE_PX_PER_UNIT));
    this.root.add(view);
    const old = this.shown; this.shown = {stage: art.stage, view};
    if (old) { old.view.destroy(); this.release(old.stage); }
  }
  private release(stage: number): void {
    for (const tile of stageArt(stage).tiles) if (this.scene.textures.exists(tile.key)) this.scene.textures.remove(tile.key);
  }
}
