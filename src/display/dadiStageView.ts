import Phaser from 'phaser';
import {DADI_STAGE, type DadiStageFrame} from '../config/dadiStageArt';
import type {RabbitArt} from '../config/rabbitArt';

/**
 * The evolved Dadi's stage life in the meadow: the sprite (his approved evolved drawing) swaps texture to one of his painted poses
 * every few seconds, never the same twice in a row, and to the standing microphone while his song plays. Purely decoration:
 * no state, no game random generator (a small seeded one), and the same scale, origin and feet as the evolved drawing.
 */
export class DadiStageView {
  private seed: number;
  private timer: number;
  private shown: DadiStageFrame | null = null;
  constructor(private scene: Phaser.Scene, readonly id: string, private sprite: Phaser.GameObjects.Image, private art: RabbitArt) {
    let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    this.seed = h >>> 0; this.timer = this.hold();
  }
  private random(): number {
    this.seed = (this.seed + 0x6D2B79F5) >>> 0; let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  private hold(): number { const [low, high] = DADI_STAGE.hold; return low + (high - low) * this.random(); }
  /** `singing`: his song is playing; `active`: on screen and awake (a hidden Dadi keeps his pose). */
  update(dt: number, active: boolean, singing: boolean): void {
    const ready = (f: DadiStageFrame | null): f is DadiStageFrame => !!f && this.scene.textures.exists(f.texture);
    if (singing && ready(DADI_STAGE.micro)) { this.show(DADI_STAGE.micro); return; }
    if (this.shown === DADI_STAGE.micro) { this.show(null); this.timer = this.hold(); }
    if (!active) return;
    this.timer -= Math.min(dt, 100); if (this.timer > 0) return;
    this.timer = this.hold();
    const choices = [null, ...DADI_STAGE.poses.filter(ready)].filter(f => f !== this.shown);
    if (choices.length) this.show(choices[Math.floor(this.random() * choices.length)]);
  }
  /** null: back to the evolved drawing. */
  private show(frame: DadiStageFrame | null): void {
    if (frame === this.shown) return;
    this.shown = frame;
    this.sprite.setTexture(frame ? frame.texture : this.art.texture);
  }
  get singing(): boolean { return this.shown === DADI_STAGE.micro; }
  destroy(): void { this.show(null); }
}
