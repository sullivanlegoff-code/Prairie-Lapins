import Phaser from 'phaser';
import {LIGHTS_DEPTH} from './winterLayer';

/** A rabbit whose LEDs light up (src/config/nightArt.ts): its container in the meadow and its LED lights (not on the display list). */
export interface LedOwner {object: Phaser.GameObjects.Container; leds: readonly Phaser.GameObjects.Image[]}
/** A rabbit that can stand in front of a lit rabbit: where it stands, the LEDs behind it are erased. */
export type LedOccluder = Phaser.GameObjects.Container;

/** The rabbits drawn in front of `owner` (a greater depth: lower on the island) whose box meets the box of its shown LEDs. */
export function ledOccluders(owner: LedOwner, ledBox: Phaser.Geom.Rectangle, rabbits: readonly LedOccluder[]): LedOccluder[] {
  return rabbits.filter(rabbit => rabbit !== owner.object && rabbit.active && rabbit.visible && rabbit.alpha > 0 &&
    rabbit.depth > owner.object.depth && Phaser.Geom.Rectangle.Overlaps(ledBox, rabbit.getBounds()));
}

/**
 * Fusion Nucléaire's LEDs (owner, 24 November 2026: « vraiment des leds qui s'allument », in the yellow of the enclosures'
 * lights, with a big halo). Like those lights they sit above the Christmas night shade, so drawn one by one they would shine
 * over a rabbit passing in front of it (owner, 24 November 2026: « règle ce problème »). As src/display/nightGlows.ts does
 * for the windows, they are drawn each night frame into one screen-sized picture, and every rabbit standing in front of a lit
 * rabbit is erased from it, silhouette for silhouette.
 */
export class LedLights {
  private layer: Phaser.GameObjects.RenderTexture | null = null;
  constructor(private readonly scene: Phaser.Scene) {
    scene.events.once('shutdown', () => this.clear());
  }
  /** Each frame, after the LEDs are placed: the lit rabbits and every rabbit on the island. */
  update(owners: readonly LedOwner[], rabbits: readonly LedOccluder[]): void {
    const shown = owners.map(owner => ({owner, leds: owner.leds.filter(led => led.visible && led.alpha > .004)})).filter(o => o.leds.length);
    if (!shown.length) { this.layer?.setVisible(false); return; }
    const camera = this.scene.cameras.main, w = Math.max(1, Math.ceil(camera.width)), h = Math.max(1, Math.ceil(camera.height)), z = camera.zoom;
    // A new screen size: a new picture of the new size (as for the windows' glows).
    if (this.layer && (this.layer.width !== w || this.layer.height !== h)) { this.layer.destroy(); this.layer = null; }
    if (!this.layer) this.layer = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setScrollFactor(0).setDepth(LIGHTS_DEPTH);
    const layer = this.layer.setVisible(true);
    // Under the main camera's zoom, this screen-space picture covers the screen pixel for pixel; it draws with the same view.
    layer.setPosition(w / 2 - w / 2 / z, h / 2 - h / 2 / z).setScale(1 / z);
    layer.camera.setScroll(camera.scrollX, camera.scrollY).setZoom(z);
    layer.clear(); layer.draw(shown.flatMap(o => o.leds));
    const front = new Set<LedOccluder>();
    for (const {owner, leds} of shown) {
      const box = leds.map(led => led.getBounds()).reduce((all, b) => Phaser.Geom.Rectangle.Union(all, b, all), leds[0].getBounds());
      for (const rabbit of ledOccluders(owner, box, rabbits)) front.add(rabbit);
    }
    if (front.size) layer.erase([...front]);
  }
  clear(): void { this.layer?.destroy(); this.layer = null; }
}
