import type Phaser from 'phaser';
import {HEART_TEXTURE} from './currency';
import {KISS_MS, KISS_PECKS} from './rabbitMotion';

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
      // One small heart pops at each little kiss and floats up for a moment.
      view.hearts ??= KISS_PECKS.map(() => this.scene.add.image(0, 0, HEART_TEXTURE).setDisplaySize(12, 12).setDepth(3.2));
      const u = Math.min(1, elapsed / KISS_MS);
      view.hearts.forEach((heart, index) => {
        const t = (u - KISS_PECKS[index]) / .25;
        if (t < 0 || t >= 1) return;
        const size = (8 + 5 * Math.min(1, t * 4)) * scale;
        heart.setPosition(x + (index - 1) * 6 * scale, y - (4 + t * 14) * scale).setDisplaySize(size, size).setAlpha(Math.min(1, (1 - t) * 2.5)).setVisible(true);
      });
    }
  }
  destroy(): void {
    for (const view of this.views.values()) { view.sleep?.destroy(); view.hearts?.forEach(heart => heart.destroy()); }
    this.views.clear();
  }
}
