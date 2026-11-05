import Phaser from 'phaser';
import {LIGHT_POOLS, NIGHT_GLOW_DEPTH, NIGHT_GLOW_STRENGTH, nightGlowOf} from '../config/nightLights';

export {LIGHT_POOLS};

/**
 * Christmas nights with more light (owner, 5 November 2026): once night falls, the lit windows and doors of the snowy buildings
 * and habitats, and the lanterns, bulbs and star of the Christmas decorations, glow. Each picture listed in
 * src/config/winterNightLights.json (made by scripts/derive-night-lights.mjs) has a glow picture of the same size under
 * assets/noel/nuit/, added (ADD blend) over the night shade at the picture's exact place. The lamp-like decorations also cast a
 * soft warm pool of light on the snow at their foot. Nothing is drawn while a glow picture is missing.
 */
export interface GlowSource {image: Phaser.GameObjects.Image; url: string | undefined; pool?: number}

export class NightGlows {
  private glows = new Map<Phaser.GameObjects.Image, {glow: Phaser.GameObjects.Image; pool: Phaser.GameObjects.Image | null}>();
  constructor(private readonly scene: Phaser.Scene, private readonly ready: (texture: string, url: string) => boolean) {
    scene.events.once('shutdown', () => this.clear());
  }
  /** Each frame: `level` 0 by day to 1 at night; `sources` the pictures shown now. */
  update(level: number, sources: readonly GlowSource[]): void {
    if (level <= .001) { this.clear(); return; }
    const seen = new Set<Phaser.GameObjects.Image>();
    for (const {image, url, pool} of sources) {
      const glowArt = nightGlowOf(url);
      if (!glowArt || !image.active || !image.visible || image.alpha < .99 || !this.ready(glowArt.texture, glowArt.url)) continue;
      seen.add(image);
      let entry = this.glows.get(image);
      if (!entry) {
        const glow = this.scene.add.image(0, 0, glowArt.texture).setDepth(NIGHT_GLOW_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
        const halo = pool && this.scene.textures.exists('noel-halo') ? this.scene.add.image(0, 0, 'noel-halo').setDepth(NIGHT_GLOW_DEPTH - .005).setBlendMode(Phaser.BlendModes.ADD) : null;
        entry = {glow, pool: halo}; this.glows.set(image, entry);
      }
      const {glow, pool: halo} = entry;
      if (glow.texture.key !== glowArt.texture) glow.setTexture(glowArt.texture);
      // Same place, anchor, size and mirror as the picture (its glow picture has the same pixels).
      glow.setPosition(image.x, image.y).setOrigin(image.originX, image.originY).setScale(image.scaleX, image.scaleY).setFlipX(image.flipX)
        .setAlpha(level * NIGHT_GLOW_STRENGTH);
      if (halo && pool) {
        const width = image.displayWidth * pool;
        halo.setPosition(image.x, image.y).setScale(width / halo.frame.realWidth, width * .42 / halo.frame.realHeight).setAlpha(level * .65);
      }
    }
    for (const [image, entry] of this.glows) if (!seen.has(image)) { entry.glow.destroy(); entry.pool?.destroy(); this.glows.delete(image); }
  }
  clear(): void { for (const entry of this.glows.values()) { entry.glow.destroy(); entry.pool?.destroy(); } this.glows.clear(); }
}
