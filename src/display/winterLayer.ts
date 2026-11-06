import Phaser from 'phaser';
import {christmasLabOverride, localHour} from '../config/christmas';
import {WINTER_ART} from '../config/winterArt';
import {nightColor, nightLevel, snowDensity, SNOW_DENSITY} from './winterClock';

/** Above the whole meadow (buildings, rabbits at most 2.6), below the bubbles and bars (3). */
export const NIGHT_DEPTH = 2.8, SNOW_DEPTH = 2.9;
/** Most flakes on screen at once (a heavier fall on a large screen); a light fall shows about a third. */
export const MAX_FLAKES = 70;

interface Flake {image: Phaser.GameObjects.Image; x: number; y: number; speed: number; sway: number; phase: number; size: number}

/**
 * The Christmas island's weather: the evening and night shade over the meadow, and the tiny snowflakes falling in front of
 * it (screen space, so the camera never changes their size). Nothing is saved; the time of day comes from the device clock.
 */
export class WinterLayer {
  private readonly night: Phaser.GameObjects.Rectangle;
  private readonly flakes: Flake[] = [];
  private seed = 0x5eed;
  private destroyed = false;
  constructor(private readonly scene: Phaser.Scene) {
    this.night = scene.add.rectangle(0, 0, 10, 10, 0xffffff).setScrollFactor(0).setDepth(NIGHT_DEPTH).setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);
    scene.events.once('shutdown', this.destroy, this);
  }
  private random(): number { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  /** The level of night shown now (0 by day), also used by the sky. */
  nightNow(date: Date): number { return nightLevel(localHour(date)); }

  /** Each frame. `active`: the event is on; `photo`: the snow keeps falling in a photo, the night stays. */
  update(dt: number, date: Date, active: boolean, reduced: boolean): void {
    if (this.destroyed) return;
    const camera = this.scene.cameras.main, w = camera.width, h = camera.height, z = camera.zoom;
    const level = active ? this.nightNow(date) : 0;
    this.night.setVisible(level > .001);
    if (level > .001) {
      this.night.setFillStyle(nightColor(level)).setPosition(w / 2 - w / 2 / z - 1, h / 2 - h / 2 / z - 1).setSize(w / z + 2, h / z + 2);
    }
    const forced = christmasLabOverride().snow;
    const density = !active || reduced ? 0 : forced ? SNOW_DENSITY[forced] : snowDensity(date.getTime());
    const textures = WINTER_ART.flakes.filter(f => this.scene.textures.exists(f.texture));
    const wanted = textures.length ? Math.round(MAX_FLAKES * density * Math.min(1.3, Math.max(.5, w * h / (1000 * 600)))) : 0;
    while (this.flakes.length < wanted) this.flakes.push(this.spawn(textures[this.flakes.length % textures.length].texture, w, h, true));
    // Flakes beyond the wanted count leave once they reach the bottom: the fall thins out, nothing disappears at once.
    const step = Math.max(0, Math.min(dt, 100)) / 1000;
    for (let i = this.flakes.length - 1; i >= 0; i--) {
      const f = this.flakes[i];
      f.y += f.speed * step; f.phase += step * .9;
      if (f.y > h + 8) {
        if (i >= wanted) { f.image.destroy(); this.flakes.splice(i, 1); continue; }
        f.y = -8 - this.random() * 30; f.x = this.random() * w;
      }
      const x = f.x + Math.sin(f.phase) * f.sway;
      f.image.setPosition(w / 2 + (x - w / 2) / z, h / 2 + (f.y - h / 2) / z).setScale(f.size / z).setAlpha(.82 - level * .22);
    }
  }
  private spawn(texture: string, w: number, h: number, anywhere: boolean): Flake {
    const art = WINTER_ART.flakes.find(f => f.texture === texture)!;
    const size = (2.2 + this.random() * 3.2) / art.width; // 2 to 5 screen pixels wide: tiny, never in the way.
    const image = this.scene.add.image(0, 0, texture).setScrollFactor(0).setDepth(SNOW_DEPTH).setRotation(this.random() * Math.PI);
    return {image, x: this.random() * w, y: anywhere ? this.random() * h : -8, speed: 16 + this.random() * 22, sway: 4 + this.random() * 10, phase: this.random() * Math.PI * 2, size};
  }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.night.destroy(); for (const f of this.flakes) f.image.destroy(); this.flakes.length = 0;
  }
}

/** Above the night shade, so the garland bulbs glow through it (the market islet's lights are at 2.85 too). */
export const LIGHTS_DEPTH = 2.86;
/** Glow drawn on each garland bulb found in the snowy island painting (scripts/derive-winter-lights.mjs), from 20:00. */
export class WinterLights {
  private images: Phaser.GameObjects.Image[] = [];
  private stage: number | null = null;
  constructor(private readonly scene: Phaser.Scene) {
    if (!scene.textures.exists('noel-halo')) {
      const size = 64, texture = scene.textures.createCanvas('noel-halo', size, size);
      if (texture) {
        const ctx = texture.context, g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255,236,170,1)'); g.addColorStop(.25, 'rgba(255,214,120,.55)'); g.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); texture.refresh();
      }
    }
    scene.events.once('shutdown', () => this.show(null));
  }
  /** The bulbs of this stage (master pixels at `pxPerUnit`, the painting's top left at `left, top`), or none. */
  show(stage: number | null, bulbs: readonly (readonly [number, number])[] = [], canvas = {left: 0, top: 0}, pxPerUnit = 1): void {
    if (stage === this.stage && (stage === null || this.images.length)) return;
    for (const image of this.images) image.destroy(); this.images = []; this.stage = stage;
    if (stage === null || !this.scene.textures.exists('noel-halo')) return;
    this.images = bulbs.map(([x, y], i) => this.scene.add.image(canvas.left + x / pxPerUnit, canvas.top + y / pxPerUnit, 'noel-halo')
      .setDepth(LIGHTS_DEPTH).setBlendMode(Phaser.BlendModes.ADD).setScale(.34 + (i % 3) * .03).setAlpha(0).setVisible(false));
  }
  /** 0 off, 1 lit; a gentle twinkle per bulb. */
  update(level: number, time: number): void {
    const on = level > .001;
    this.images.forEach((image, i) => {
      image.setVisible(on);
      if (on) image.setAlpha(level * (.72 + .18 * Math.sin(time / 700 + i * 1.7)));
    });
  }
}
