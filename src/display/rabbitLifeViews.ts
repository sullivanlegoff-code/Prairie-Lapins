import type Phaser from 'phaser';
import {HEART_TEXTURE} from './currency';
import {KISS_MS} from './rabbitMotion';

/** Small, passive signs over the head. No bubble, DOM overlay or gameplay reward. */
export class RabbitLifeViews {
  private views = new Map<string, {sleep?: Phaser.GameObjects.Text; hearts?: Phaser.GameObjects.Image[]}>();
  constructor(private scene: Phaser.Scene) {}
  begin(ids: readonly string[]): void {
    const present = new Set(ids);
    for (const [id, view] of this.views) {
      view.sleep?.setVisible(false); view.hearts?.forEach(heart => heart.setVisible(false));
      if (!present.has(id)) { view.sleep?.destroy(); view.hearts?.forEach(heart => heart.destroy()); this.views.delete(id); }
    }
  }
  show(id: string, mode: 'sleep' | 'kiss', x: number, y: number, elapsed: number, zoom: number): void {
    let view = this.views.get(id);
    if (!view) { view = {}; this.views.set(id, view); }
    const scale = Math.min(1.8, Math.max(1, 1 / zoom));
    if (mode === 'sleep') {
      view.sleep ??= this.scene.add.text(0, 0, 'Zz…', {fontFamily: 'Georgia, serif', fontSize: '15px', color: '#46526a', stroke: '#fff9ee', strokeThickness: 2}).setOrigin(.5, 1).setDepth(3.2);
      view.sleep.setPosition(x + 9 * scale, y - 3 * scale).setScale(scale).setVisible(true);
    } else {
      view.hearts ??= [-1, 1].map(() => this.scene.add.image(0, 0, HEART_TEXTURE).setDisplaySize(12, 12).setDepth(3.2));
      const u = Math.min(1, elapsed / KISS_MS);
      view.hearts.forEach((heart, index) => heart.setPosition(x + (index ? 8 : -8) * scale, y - (5 + u * 10 + index * 5) * scale)
        .setDisplaySize(12 * scale, 12 * scale).setAlpha(Math.min(1, (1 - u) * 4)).setVisible(true));
    }
  }
  destroy(): void {
    for (const view of this.views.values()) { view.sleep?.destroy(); view.hearts?.forEach(heart => heart.destroy()); }
    this.views.clear();
  }
}
