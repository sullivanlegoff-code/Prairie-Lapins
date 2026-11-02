import Phaser from 'phaser';
import {BENNY_ATLAS, BENNY_FRAMES, BENNY_ORIGIN, type BennyFrameName} from '../config/bennyArt';
import type {RabbitArt} from '../config/rabbitArt';
import type {Point} from '../ui/gestures';
import {endPerform, motionZone, startPerform, type RabbitMotion} from './rabbitMotion';
import {BennyClock, bennyBody, bennyShadow, hopTravel, type BennyAct, type BennyActState} from './bennyTimeline';

/** What the meadow gives Benny: her ground container and shadow, her posed body and the approved sprite A1 inside it. */
export interface BennyHost {object: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; art: RabbitArt; motion?: RabbitMotion}
export interface BennyFrameInput {dt: number; time: number; active: boolean; reduced: boolean}
/** Length of one hop across the enclosure (meadow units), and the sideways drift allowed with it. */
export const HOP_STEP = 9, HOP_DRIFT = 3;

/**
 * Benny's painted animations in the meadow (Mythic rabbit). Two images are made once with her body and only change frame: the
 * whole painted pose (the sprite A1 is hidden meanwhile) and a small patch over A1 for the blink. Purely decoration: no state,
 * no input, no game random generator. Her clock lives on in the scene, so a rebuild of her body never cuts an act short.
 * Her flight (sky mode and power) is drawn apart by BennyFlightView, which hides this enclosure body while she is in the air.
 */
export class BennyView {
  /** Squash and stretch to multiply into the body's pose. */
  squashX = 1; squashY = 1;
  private readonly pose: Phaser.GameObjects.Image;
  private readonly patch: Phaser.GameObjects.Image;
  private readonly shadow: {x: number; y: number; scaleX: number; scaleY: number; alpha: number};
  private shown: BennyFrameName | null = null;
  private facing = 1;
  private playing: BennyActState | null = null;
  /** The act asked by the laboratory, started at the next frame (when the body is free). */
  private queued: {act: BennyAct; hops: number} | null = null;

  constructor(scene: Phaser.Scene, readonly id: string, private host: BennyHost, readonly clock: BennyClock) {
    const {art, body, sprite, shadow} = host, scale = art.worldWidth / art.width;
    const make = () => scene.add.image(0, art.groundY, BENNY_ATLAS.texture, 'hop-1').setOrigin(BENNY_ORIGIN.x, BENNY_ORIGIN.y).setScale(scale).setVisible(false);
    this.pose = make(); this.patch = make();
    body.addAt(this.pose, body.getIndex(sprite) + 1); body.addAt(this.patch, body.getIndex(this.pose) + 1);
    this.shadow = {x: shadow.x, y: shadow.y, scaleX: shadow.scaleX, scaleY: shadow.scaleY, alpha: shadow.alpha};
    // A rebuilt body takes over the act in progress (its clock lives on in the scene).
    if (clock.act && host.motion?.mode === 'perform') this.playing = clock.act;
  }

  /** A touch: one joyful hop in place. */
  tap(): void { if (this.free()) this.begin(this.clock.tap(), false); }
  /** Laboratory: one act, as soon as she is free (a hop button plays a series of two). */
  play(act: BennyAct): void { this.queued = {act, hops: act === 'hop' ? 2 : 1}; }

  /** Standing or walking on the ground: an act may take over the body. */
  private free(): boolean { const m = this.host.motion; return !m || m.mode === 'rest' || m.mode === 'walk' || m.mode === 'hop'; }
  /** The motion follows a started act: in place, or across the enclosure for a hop series. */
  private begin(act: BennyActState | null, travel: boolean): void {
    const m = this.host.motion; if (!act || !m) return;
    let target: Point = {...m.local};
    if (travel && act.hops) {
      const zone = motionZone(m), want = HOP_STEP * act.hops, ahead = m.facing === 1 ? zone.maxX - m.local.x : m.local.x - zone.minX, behind = m.facing === 1 ? m.local.x - zone.minX : zone.maxX - m.local.x;
      // Forwards if there is room, else turned round; a narrow pen keeps her hopping on the spot.
      const direction = ahead >= want || ahead >= behind ? m.facing : -m.facing as 1 | -1, room = Math.max(ahead, behind);
      const distance = Math.min(want, Math.max(0, room - 2)), drift = ((act.duration * 7) % 11 / 11 * 2 - 1) * HOP_DRIFT;
      target = {x: m.local.x + direction * distance, y: Math.min(zone.maxY, Math.max(zone.minY, m.local.y + drift))};
    }
    startPerform(m, target, act.duration);
    this.playing = act;
  }

  update({dt, time, active, reduced}: BennyFrameInput): void {
    const m = this.host.motion, asleep = m?.mode === 'sleep';
    // The meadow's own little hop becomes a painted one, in place.
    if (m?.mode === 'hop' && !this.clock.act && !reduced) this.begin(this.clock.play('hop'), false);
    if (this.queued && this.free() && !this.clock.act) { const {act, hops} = this.queued; this.queued = null; this.begin(this.clock.play(act, hops, act === 'hop'), act === 'hop'); }
    else if (this.queued && reduced) this.queued = null;
    const started = this.clock.step(dt, {active, idle: active && m?.mode === 'rest', asleep, reduced});
    if (started && started.act !== 'nap') this.begin(started, started.travel);
    const act = this.clock.act;
    if (m && act && act.act !== 'nap') {
      // Something else took the body (fed, somersault, nap, a walk back…): the act stops on A1.
      if (m.mode !== 'perform' || this.playing !== act) { this.clock.cancel(); this.playing = null; }
      else if (act.travel) { const u = hopTravel(act); m.local = {x: m.from.x + (m.to.x - m.from.x) * u, y: m.from.y + (m.to.y - m.from.y) * u}; }
    }
    // Over (or stopped): she stays where her hops took her.
    if (m?.mode === 'perform' && !this.clock.act) { endPerform(m, false); this.playing = null; }
    this.show(this.clock.frame(asleep), time);
  }

  private show(frame: BennyFrameName | null, time: number): void {
    const kind = frame ? BENNY_FRAMES.frames[frame].kind : null, act = this.clock.act, facing = this.host.body.scaleX < 0 ? -1 : 1;
    if (frame !== this.shown || facing !== this.facing) {
      this.shown = frame; this.facing = facing;
      this.pose.setVisible(kind === 'whole' || kind === 'pose'); this.patch.setVisible(kind === 'patch');
      if (frame && kind === 'patch') this.patch.setFrame(frame); else if (frame) this.pose.setFrame(frame);
      this.host.sprite.setVisible(kind !== 'whole' && kind !== 'pose');
      const s = bennyShadow(frame);
      this.host.shadow.setPosition(this.shadow.x + facing * s.x, this.shadow.y).setScale(this.shadow.scaleX * s.scaleX, this.shadow.scaleY * s.scaleY).setAlpha(this.shadow.alpha * s.alpha);
    }
    ({squashX: this.squashX, squashY: this.squashY} = bennyBody(act, time));
  }

  destroy(): void { this.pose.destroy(); this.patch.destroy(); }
}
