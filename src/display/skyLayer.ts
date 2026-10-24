import type Phaser from 'phaser';

export const SKY_COLOR = '#91c9e8';
// RGBA allocation: 905,216 bytes, independent of viewport size / device pixel ratio.
export const SKY_TEXTURES = {width: 320, height: 176, variants: 4, skyWidth: 4, skyHeight: 256} as const;
export interface SkyCloud {
  x: number; y: number; variant: number; scale: number; alpha: number;
  parallax: number; phase: number; near: boolean;
}

/** Stable art layout; no saved state and no dependency on the gameplay random stream. */
export function skyClouds(seed = 0x51c10d): SkyCloud[] {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  return Array.from({length: 18}, (_, i) => {
    const near = i >= 14, side = i % 2;
    return {
      x: near ? (side ? 1.02 : -.02) : .04 + (i % 5) * .23 + random() * .08,
      y: near ? .26 + random() * .64 : .08 + Math.floor(i / 5) * .29 + random() * .13,
      variant: Math.floor(random() * SKY_TEXTURES.variants),
      scale: near ? .85 + random() * .3 : .26 + random() * .42,
      alpha: near ? .38 : .46 + random() * .28,
      parallax: near ? .075 : .018 + random() * .018,
      phase: random() * Math.PI * 2, near,
    };
  });
}

function paintCloud(ctx: CanvasRenderingContext2D, variant: number): void {
  // One continuous silhouette: no overlapping translucent circles or hard internal seams.
  const lift = [0, 9, -6, 5][variant];
  ctx.beginPath();
  ctx.moveTo(43, 139);
  ctx.bezierCurveTo(5, 136, 9, 93, 45, 89);
  ctx.bezierCurveTo(37, 56, 74, 37 + lift, 101, 57 + lift);
  ctx.bezierCurveTo(110, 4 + lift, 185, 0, 196, 57);
  ctx.bezierCurveTo(225, 26 - lift, 269, 51, 265, 88);
  ctx.bezierCurveTo(310, 83, 320, 133, 277, 143);
  ctx.bezierCurveTo(219, 159, 92, 158, 43, 139);
  ctx.closePath();
  const body = ctx.createLinearGradient(0, 25, 0, 158);
  body.addColorStop(0, '#fffef6'); body.addColorStop(.52, '#fffdf9');
  body.addColorStop(.78, '#e8edf9'); body.addColorStop(1, '#bccce8');
  ctx.fillStyle = body; ctx.fill();
  // A soft warm cap gives the lower lavender face a little volume.
  ctx.beginPath(); ctx.ellipse(151, 76, 45, 31, -.15, Math.PI, Math.PI * 1.88);
  ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff66'; ctx.lineCap = 'round'; ctx.stroke();
}

/** Screen-sized sky and a shallow world-relative cloud field, all below the ground.
 * Inverse camera zoom keeps the background fixed without changing the gameplay camera.
 */
export class SkyLayer {
  private readonly keys: string[] = [];
  private readonly background: Phaser.GameObjects.Image;
  private readonly clouds: {layout: SkyCloud; image: Phaser.GameObjects.Image}[];
  private readonly motion = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;
  private elapsed = 0;
  private destroyed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly anchor: {x: number; y: number}, seed?: number) {
    const make = (key: string, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
      const texture = scene.textures.createCanvas(key, width, height);
      if (!texture) throw new Error(`Cannot create sky texture: ${key}`);
      this.keys.push(key); paint(texture.context); texture.refresh();
      return key;
    };
    const sky = make('meadow-sky-gradient', SKY_TEXTURES.skyWidth, SKY_TEXTURES.skyHeight, ctx => {
      const gradient = ctx.createLinearGradient(0, 0, 0, SKY_TEXTURES.skyHeight);
      gradient.addColorStop(0, SKY_COLOR); gradient.addColorStop(.48, '#b8ddeb');
      gradient.addColorStop(.82, '#e6e9e4'); gradient.addColorStop(1, '#f9e8d7');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, SKY_TEXTURES.skyWidth, SKY_TEXTURES.skyHeight);
    });
    this.background = scene.add.image(0, 0, sky).setScrollFactor(0).setDepth(-100);
    const variants = Array.from({length: SKY_TEXTURES.variants}, (_, i) =>
      make(`meadow-sky-cloud-${i}`, SKY_TEXTURES.width, SKY_TEXTURES.height, ctx => paintCloud(ctx, i)));
    this.clouds = skyClouds(seed).map(layout => ({layout,
      image: scene.add.image(0, 0, variants[layout.variant]).setScrollFactor(0)
        .setDepth(layout.near ? -80 : -90).setAlpha(layout.alpha),
    }));
    scene.events.on('preupdate', this.tick, this);
    // Just before rendering: camera pan/zoom and scale resize have already been applied.
    scene.events.on('prerender', this.render, this);
    scene.events.once('shutdown', this.destroy, this);
    this.render();
  }

  private tick(_time: number, delta: number): void {
    if (!this.motion?.matches) this.elapsed += Math.min(delta, 50) / 1000;
  }

  private render(): void {
    const camera = this.scene.cameras.main, w = camera.width, h = camera.height, z = camera.zoom;
    const place = (image: Phaser.GameObjects.Image, x: number, y: number) =>
      image.setPosition(w / 2 + (x - w / 2) / z, h / 2 + (y - h / 2) / z);
    place(this.background, w / 2, h / 2);
    this.background.setDisplaySize((w + 2) / z, (h + 2) / z);
    const dx = camera.scrollX + w / 2 - this.anchor.x, dy = camera.scrollY + h / 2 - this.anchor.y;
    const mobileScale = Math.min(1.25, Math.max(.6, w / 1000));
    for (const {layout: c, image} of this.clouds) {
      const drift = 18 * (Math.sin(this.elapsed / 100 + c.phase) - Math.sin(c.phase));
      let x = c.x * w - Math.tanh(dx / 1400) * w * c.parallax + drift;
      // Close clouds stay at the outer margins even at the pan limits; no wrapping jumps.
      if (c.near) x = c.x < .5 ? Math.min(x, w * .025) : Math.max(x, w * .975);
      const y = c.y * h - Math.tanh(dy / 1400) * h * c.parallax;
      place(image, x, y); image.setScale(c.scale * mobileScale / z);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off('preupdate', this.tick, this);
    this.scene.events.off('prerender', this.render, this);
    this.scene.events.off('shutdown', this.destroy, this);
    this.background.destroy(); this.clouds.forEach(c => c.image.destroy());
    this.keys.forEach(key => this.scene.textures.remove(key));
  }
}
