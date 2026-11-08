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
/** Something that can stand in front of a lit picture (a rabbit): where it stands, the glow is erased. */
export type GlowOccluder = Phaser.GameObjects.Container;

export class NightGlows {
  private glows = new Map<Phaser.GameObjects.Image, {glow: Phaser.GameObjects.Image; pool: Phaser.GameObjects.Image | null}>();
  /**
   * The glows sit above the night shade, so drawn one by one they would light a rabbit standing in front of a window (iPhone,
   * 8 November 2026). They are drawn each night frame into one screen-sized picture, every rabbit overlapping a lit picture is
   * erased from it, and that picture is added over the shade. The rabbits are drawn above every building and decoration (their
   * layer is above both), so a rabbit over a lit picture is always in front of it (owner, 8 November 2026: the light of an
   * enclosure was over a rabbit standing in front of it, because the depths of two different layers were compared).
   */
  private layer: Phaser.GameObjects.RenderTexture | null = null;
  constructor(private readonly scene: Phaser.Scene, private readonly ready: (texture: string, url: string) => boolean) {
    scene.events.once('shutdown', () => this.clear());
  }
  /** Each frame: `level` 0 by day to 1 at night; `sources` the pictures shown now; `occluders` the rabbits on the island. */
  update(level: number, sources: readonly GlowSource[], occluders: readonly GlowOccluder[] = []): void {
    if (level <= .001) { this.clear(); return; }
    const seen = new Set<Phaser.GameObjects.Image>();
    for (const {image, url, pool} of sources) {
      const glowArt = nightGlowOf(url);
      if (!glowArt || !image.active || !image.visible || image.alpha < .99 || !this.ready(glowArt.texture, glowArt.url)) continue;
      seen.add(image);
      let entry = this.glows.get(image);
      if (!entry) {
        const glow = this.scene.make.image({x: 0, y: 0, key: glowArt.texture}, false).setBlendMode(Phaser.BlendModes.ADD);
        const halo = pool && this.scene.textures.exists('noel-halo') ? this.scene.make.image({x: 0, y: 0, key: 'noel-halo'}, false).setBlendMode(Phaser.BlendModes.ADD) : null;
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
    this.paint(occluders);
  }
  private paint(occluders: readonly GlowOccluder[]): void {
    if (!this.glows.size) { this.layer?.setVisible(false); return; }
    const camera = this.scene.cameras.main, w = Math.max(1, Math.ceil(camera.width)), h = Math.max(1, Math.ceil(camera.height)), z = camera.zoom;
    if (!this.layer) this.layer = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setScrollFactor(0).setDepth(NIGHT_GLOW_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
    const layer = this.layer.setVisible(true);
    if (layer.width !== w || layer.height !== h) layer.setSize(w, h);
    // Under the main camera's zoom, this screen-space picture covers the screen pixel for pixel; it draws with the same view.
    layer.setPosition(w / 2 - w / 2 / z, h / 2 - h / 2 / z).setScale(1 / z);
    layer.camera.setScroll(camera.scrollX, camera.scrollY).setZoom(z);
    const entries = [...this.glows.values()];
    layer.clear(); layer.draw([...entries.flatMap(e => e.pool ? [e.pool] : []), ...entries.map(e => e.glow)]);
    const lit = [...this.glows.values()].map(({glow}) => glow.getBounds()), front: GlowOccluder[] = [];
    for (const rabbit of occluders) {
      if (!rabbit.active || !rabbit.visible || rabbit.alpha <= 0) continue;
      const near = lit.filter(l => rabbit.x > l.left - 160 && rabbit.x < l.right + 160 && rabbit.y > l.top - 160 && rabbit.y < l.bottom + 220);
      if (!near.length) continue;
      const box = rabbit.getBounds();
      if (near.some(l => Phaser.Geom.Rectangle.Overlaps(l, box))) front.push(rabbit);
    }
    if (front.length) layer.erase(front);
  }
  clear(): void {
    for (const entry of this.glows.values()) { entry.glow.destroy(); entry.pool?.destroy(); } this.glows.clear();
    this.layer?.destroy(); this.layer = null;
  }
}
