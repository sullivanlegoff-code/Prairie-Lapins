import Phaser from 'phaser';
import {BENNY_FLIGHT, BENNY_FLIGHT_ATLAS, BENNY_FLIGHT_EFFECTS, BENNY_MASTER_WIDTH, FAR_WING_TINT} from '../config/bennyFlightArt';
import {rabbitArt} from '../config/rabbitArt';
import {VISUAL} from '../config/visual';
import type {Point} from '../ui/gestures';
import {ALTITUDE, BennyFlightClock, type FlightFrame, type FlightGeometry, type FlightView} from './bennyFlight';

/** Depths in the scene: the soft shadow on the ground under every rabbit, the flight above every rabbit and building, below the bubbles. */
export const FLIGHT_SHADOW_DEPTH = 1.95, FLIGHT_DEPTH = 2.6;
/** Height of the flying body's centre above her ground point when she stands in her enclosure (scene units, about A1's middle). */
export const GROUND_LIFT = 23;
// Owner (1 November 2026): « plus de poussière d’étoile » during her power, so a large pool, still made once and reused.
const SPARKS = 320, FEATHERS = 12, STILL_STARS = 12;
const SPARK_TEXTURES = [BENNY_FLIGHT_EFFECTS.star, BENNY_FLIGHT_EFFECTS.twinkle, BENNY_FLIGHT_EFFECTS.starFive, BENNY_FLIGHT_EFFECTS.stardust, BENNY_FLIGHT_EFFECTS.star];

/** One drawing of Benny in the air: far wings, body, near wings. All its images are made once and only change frame. */
class Rig {
  readonly container: Phaser.GameObjects.Container;
  private readonly behind: Phaser.GameObjects.Image[];
  private readonly body: Phaser.GameObjects.Image;
  private readonly front: Phaser.GameObjects.Image[];
  constructor(scene: Phaser.Scene) {
    const make = () => scene.add.image(0, 0, BENNY_FLIGHT_ATLAS.texture, 'body-profil-1').setVisible(false);
    this.behind = [make(), make()]; this.body = make().setVisible(true); this.front = [make(), make()];
    this.container = scene.add.container(0, 0, [...this.behind, this.body, ...this.front]).setVisible(false);
  }
  /** Lays out one view at one wing picture; `back` fades the far wing(s). */
  pose(view: FlightView, frame: FlightFrame): void {
    const rig = BENNY_FLIGHT.views[view], {series, frame: n, back} = frame.wing, k = BENNY_FLIGHT.scale;
    this.body.setFrame(rig.bodies[frame.body - 1]);
    const place = (image: Phaser.GameObjects.Image, name: string, shoulder: readonly number[], mirror = false) =>
      image.setFrame(name).setPosition((shoulder[0] - BENNY_FLIGHT.body.source / 2) * k, (shoulder[1] - BENNY_FLIGHT.body.source / 2) * k).setScale(mirror ? -1 : 1, 1).setVisible(true);
    for (const image of [...this.behind, ...this.front]) image.setVisible(false);
    if (series !== 'beat') {
      // The appearance and disappearance are painted in profile only: one wing at the near shoulder.
      place(this.front[0], `${series === 'appear' ? BENNY_FLIGHT.transition.appear : BENNY_FLIGHT.transition.disappear}-${n}`, BENNY_FLIGHT.transition.shoulder).clearTint().setAlpha(1);
      return;
    }
    let b = 0, f = 0;
    for (const wing of rig.wings) {
      const image = wing.layer === 'behind' ? this.behind[b++] : this.front[f++];
      place(image, `${wing.series}-${n}`, wing.shoulder, wing.mirror);
      if (wing.darken) image.setTint(FAR_WING_TINT); else image.clearTint();
      // The far wing of a side view fades in after the wings appear; the face's and back's pairs are both near enough to stay.
      image.setAlpha(wing.darken ? back : 1);
    }
  }
}

interface Particle {image: Phaser.GameObjects.Image; age: number; life: number; vx: number; vy: number; spin: number; size: number; sway: number; fade: 'twinkle' | 'fall'}

/**
 * Benny in the air (Mythic rabbit): two rigs for the cross-fade of a turn, her soft shadow on the island, and a small pool of
 * sparkles and feathers made once and reused (nothing is created per frame). The clock decides everything; this only draws it.
 */
export class BennyFlightView {
  readonly clock = new BennyFlightClock();
  private readonly layer: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly rigs: [Rig, Rig];
  private readonly sparks: Particle[] = [];
  private readonly feathers: Particle[] = [];
  private readonly nurseryGlow: Phaser.GameObjects.Image;
  private readonly still: Phaser.GameObjects.Container;
  private next = 0;
  private dustDue = 0;
  private featherDue = 0;
  private seed = 1;
  /** The last frame drawn, for the taps and for the meadow (her enclosure picture is hidden while she flies). */
  last: FlightFrame | null = null;
  private centre: Point = {x: 0, y: 0};
  private size = 1;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, BENNY_FLIGHT_EFFECTS.glow.texture).setTint(0x2c2a44).setDepth(FLIGHT_SHADOW_DEPTH).setVisible(false);
    this.rigs = [new Rig(scene), new Rig(scene)];
    this.nurseryGlow = scene.add.image(0, 0, BENNY_FLIGHT_EFFECTS.glow.texture).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    const stars = Array.from({length: STILL_STARS}, (_, k) => {
      const a = k / STILL_STARS * Math.PI * 2;
      return scene.add.image(Math.cos(a) * 22, Math.sin(a) * 14 - 4, SPARK_TEXTURES[k % 3].texture).setScale(.5).setBlendMode(Phaser.BlendModes.ADD);
    });
    this.still = scene.add.container(0, 0, [scene.add.image(0, 0, BENNY_FLIGHT_EFFECTS.glow.texture).setScale(.45).setBlendMode(Phaser.BlendModes.ADD), ...stars]).setVisible(false);
    const particle = (texture: string, fade: Particle['fade']): Particle => ({image: scene.add.image(0, 0, texture).setVisible(false), age: 0, life: 0, vx: 0, vy: 0, spin: 0, size: 1, sway: 0, fade});
    for (let k = 0; k < SPARKS; k++) { const p = particle(SPARK_TEXTURES[k % SPARK_TEXTURES.length].texture, 'twinkle'); p.image.setBlendMode(Phaser.BlendModes.ADD); this.sparks.push(p); }
    for (let k = 0; k < FEATHERS; k++) this.feathers.push(particle(BENNY_FLIGHT_EFFECTS.feathers[k % BENNY_FLIGHT_EFFECTS.feathers.length].texture, 'fall'));
    // Dust behind her, the rigs, then sparkles and feathers in front.
    this.layer = scene.add.container(0, 0, [this.nurseryGlow, ...this.sparks.slice(0, SPARKS / 2).map(p => p.image), this.rigs[0].container, this.rigs[1].container,
      ...this.sparks.slice(SPARKS / 2).map(p => p.image), ...this.feathers.map(p => p.image), this.still]).setDepth(FLIGHT_DEPTH);
  }

  /** A small visual-only sequence (never the game's random generator). */
  private random(): number { this.seed = (this.seed * 16807) % 2147483647; return (this.seed - 1) / 2147483646; }

  /** Scene units per atlas pixel of the rig at size 1: A1's own scale (48 units for the 466-pixel master) in the meadow. */
  private static unit(): number { const a1 = rabbitArt('benny'); return (a1?.worldWidth ?? 48) / BENNY_MASTER_WIDTH / BENNY_FLIGHT.scale * VISUAL.rabbit.scale; }

  /** One frame: steps the clock and draws it. `roof` is the top of the nursery's picture, where the dust rains. */
  update(step: {dt: number; sky: boolean; reduced: boolean; geometry: FlightGeometry; roof: number | null}): FlightFrame {
    const frame = this.clock.step(step), {dt} = step;
    this.last = frame;
    const size = BennyFlightView.unit() * frame.scale, lift = GROUND_LIFT * frame.scale;
    const x = frame.x, y = frame.y - lift - frame.altitude - frame.bob;
    this.centre = {x, y}; this.size = frame.scale;
    // The two rigs: the new view below at full opacity, the old one above it, fading out.
    const [current, old] = this.rigs, sign = (mirror: boolean) => mirror ? -1 : 1;
    current.container.setVisible(frame.shown).setPosition(x, y).setScale(size * sign(frame.mirror), size).setRotation(frame.tilt);
    if (frame.shown) current.pose(frame.view, frame);
    // On the ground the flight body takes over from A1 by a cross-fade.
    current.container.setAlpha(frame.phase === 'wake' || frame.phase === 'settle' ? 1 - frame.ground : 1);
    old.container.setVisible(frame.shown && !!frame.previous);
    if (frame.shown && frame.previous) {
      old.container.setPosition(x, y).setScale(size * sign(frame.previous.mirror), size).setRotation(frame.tilt).setAlpha(Math.max(0, frame.previous.k));
      old.pose(frame.previous.view, frame);
    }
    this.layer.bringToTop(old.container);
    // A soft, small, blurred shadow following on the island, fainter and wider as she rises.
    const up = Math.min(1, frame.altitude / ALTITUDE);
    this.shadow.setVisible(frame.shown && frame.altitude > 2).setPosition(frame.x, frame.y + 6).setScale((.32 + .12 * up) * frame.scale, (.12 + .04 * up) * frame.scale).setAlpha(.38 - .18 * up);

    // Stardust trail behind her during her power, a few sparkles around her as her wings come and go.
    if (frame.dust) {
      this.dustDue -= dt;
      while (this.dustDue <= 0) {
        this.dustDue += 12;
        const back = frame.mirror ? 1 : -1;
        this.emit(this.sparks, x + back * 18 * frame.scale + (this.random() - .5) * 26, y + (this.random() - .3) * 22, {life: 1800 + this.random() * 1000, vx: (this.random() - .5) * 14, vy: 5 + this.random() * 12, size: .3 + this.random() * .55});
      }
      // A glittering aura around her as she flies.
      if (this.random() < dt / 35) {
        const a = this.random() * Math.PI * 2, r = 16 + this.random() * 20;
        this.emit(this.sparks, x + Math.cos(a) * r, y + Math.sin(a) * r * .7, {life: 600 + this.random() * 400, vx: Math.cos(a) * 6, vy: -4 - this.random() * 6, size: .25 + this.random() * .35});
      }
    } else this.dustDue = 0;
    if (frame.sparkle > 0 && this.random() < frame.sparkle * dt / 45) {
      const a = this.random() * Math.PI * 2, r = 14 + this.random() * 22;
      this.emit(this.sparks, x + Math.cos(a) * r, y + Math.sin(a) * r * .7, {life: 700 + this.random() * 400, vx: Math.cos(a) * 8, vy: -6 - this.random() * 8, size: .3 + this.random() * .4});
    }
    // The rain of dust above the nursery, from her to the roof, with a soft glow on the building.
    const nursery = step.geometry.nursery;
    if (frame.rain > 0 && nursery && step.roof !== null) {
      for (let k = 0; k < 4; k++) if (this.random() < frame.rain * dt / 22) {
        const spread = 40 + this.random() * 24, sx = nursery.x + (this.random() - .5) * spread * 2, sy = y + 8 + this.random() * 10, fall = Math.max(30, step.roof + 30 - sy);
        this.emit(this.sparks, sx, sy, {life: 1100 + this.random() * 400, vx: (this.random() - .5) * 6, vy: fall / 1.2, size: .3 + this.random() * .35});
      }
    }
    this.nurseryGlow.setVisible(frame.rain > 0 && !!nursery && step.roof !== null);
    if (nursery && step.roof !== null) this.nurseryGlow.setPosition(nursery.x, (nursery.y + step.roof) / 2).setScale(1.1, .8).setAlpha(frame.rain * .55);
    // Feathers falling gently from her wings during her power.
    if (frame.feathers) {
      this.featherDue -= dt;
      if (this.featherDue <= 0) { this.featherDue = 420 + this.random() * 380; this.emit(this.feathers, x + (this.random() - .5) * 24, y + 4, {life: 2600, vx: (this.random() - .5) * 8, vy: 14, size: .16 + this.random() * .06, spin: (this.random() - .5) * 1.6, sway: 8 + this.random() * 8}); }
    } else this.featherDue = 300;
    // Reduced motion's power: a still glow with a few stars, on her, then on the nursery.
    const glow = frame.glow, home = step.geometry.home;
    this.still.setVisible(!!glow && glow.alpha > 0);
    if (glow) {
      const at = glow.at === 'nursery' && nursery ? {x: nursery.x, y: step.roof !== null ? (nursery.y + step.roof) / 2 : nursery.y - 30} : {x: home.x, y: home.y - GROUND_LIFT};
      this.still.setPosition(at.x, at.y).setAlpha(glow.alpha);
    }
    this.stepParticles(this.sparks, dt); this.stepParticles(this.feathers, dt);
    return frame;
  }

  private emit(pool: Particle[], x: number, y: number, o: {life: number; vx: number; vy: number; size: number; spin?: number; sway?: number}): void {
    // The oldest particle is reused when the pool is full.
    let p = pool.find(q => !q.image.visible);
    if (!p) { p = pool[this.next % pool.length]; this.next++; }
    p.age = 0; p.life = o.life; p.vx = o.vx; p.vy = o.vy; p.size = o.size; p.spin = o.spin ?? (this.random() - .5) * 2; p.sway = o.sway ?? 0;
    p.image.setPosition(x, y).setScale(o.size).setRotation(this.random() * Math.PI).setAlpha(0).setVisible(true);
  }
  private stepParticles(pool: Particle[], dt: number): void {
    for (const p of pool) {
      if (!p.image.visible) continue;
      p.age += dt; const u = p.age / p.life;
      if (u >= 1) { p.image.setVisible(false); continue; }
      const s = dt / 1000;
      p.image.x += p.vx * s + (p.sway ? Math.cos(p.age / 420) * p.sway * s : 0); p.image.y += p.vy * s; p.image.rotation += p.spin * s;
      if (p.fade === 'twinkle') p.image.setAlpha(Math.min(1, u * 8) * (1 - u) * (.75 + .25 * Math.sin(p.age / 60))).setScale(p.size * (1 - .4 * u));
      else p.image.setAlpha(Math.min(1, u * 6) * Math.min(1, (1 - u) * 3));
    }
  }

  /** Whether a scene point touches her in the air. */
  hit(world: Point): boolean {
    const f = this.last; if (!f?.shown || f.ground > .5) return false;
    const r = 34 * this.size * VISUAL.rabbit.scale;
    return Math.hypot((world.x - this.centre.x) / r, (world.y - this.centre.y) / (r * .8)) <= 1;
  }
  /** Benny is not in the meadow (a trip, the nest, gone): nothing stays in the air. */
  hide(): void {
    this.clock.reset(); this.last = null;
    for (const rig of this.rigs) rig.container.setVisible(false);
    this.shadow.setVisible(false); this.nurseryGlow.setVisible(false); this.still.setVisible(false);
    for (const p of [...this.sparks, ...this.feathers]) p.image.setVisible(false);
  }
  destroy(): void { this.layer.destroy(true); this.shadow.destroy(); }
}
