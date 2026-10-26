import Phaser from 'phaser';
import type {ProgressBar} from './progressBars';

/** Passive overlay below the ready bubbles. One retained Graphics per building/activity or cushion. */
export class ProgressBarViews {
  private views = new Map<string, {graphics: Phaser.GameObjects.Graphics; signature: string}>();
  constructor(private scene: Phaser.Scene) {}

  sync(bars: readonly ProgressBar[], buildingIds: readonly string[]): void {
    const present = new Set(buildingIds), visible = new Set(bars.map(bar => bar.key));
    for (const [key, view] of this.views) {
      if (!present.has(view.graphics.name)) { view.graphics.destroy(); this.views.delete(key); }
      else if (!visible.has(key)) view.graphics.setVisible(false);
    }
    for (const bar of bars) {
      let view = this.views.get(bar.key);
      if (!view) {
        view = {graphics: this.scene.add.graphics().setDepth(2.5).setName(bar.buildingId), signature: ''};
        this.views.set(bar.key, view);
      }
      const g = view.graphics;
      g.setVisible(true).setPosition(bar.x, bar.y);
      const signature = `${bar.width}:${bar.height}:${bar.fraction}`;
      if (signature === view.signature) continue;
      view.signature = signature;
      const w = bar.width, h = bar.height, inset = 1, fill = (w - 2 * inset) * bar.fraction;
      g.clear();
      g.fillStyle(0x354b36, .18).fillRoundedRect(-w / 2, -h / 2 + 1.2, w, h, h / 2);
      g.fillStyle(0xfff7dc, .96).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      g.fillStyle(0xd4dfbd, 1).fillRoundedRect(-w / 2 + inset, -h / 2 + inset, w - 2 * inset, h - 2 * inset, (h - 2 * inset) / 2);
      if (fill > 0) g.fillStyle(0x73945b, 1).fillRoundedRect(-w / 2 + inset, -h / 2 + inset, fill, h - 2 * inset, Math.min(fill, h - 2 * inset) / 2);
    }
  }
  destroy(): void { for (const view of this.views.values()) view.graphics.destroy(); this.views.clear(); }
}
