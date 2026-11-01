import Phaser from 'phaser';
import {LEGENDARY_EFFECTS as FX, LEGENDARY_PARTS, type EffectArt, type LegendaryShow} from '../config/legendaryArt';
import type {RabbitArt} from '../config/rabbitArt';
import type {Point} from '../ui/gestures';
import {motionZone, startSurf, type RabbitMotion} from './rabbitMotion';
import {ACT_MS, DIVE, LegendaryClock, SLAM, SURF_ENTRY_MS, SURF_SLIDE_MS, arc, breathFrame, diveFin, envelope, loopFrame, partAngle, smooth, surfPose,
  type ActState, type LegendaryAct} from './legendaryTimeline';

/** What the meadow gives each legendary: its ground container, its posed body and the approved sprite inside it. */
export interface LegendaryHost {object: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Image; art: RabbitArt; pivot: Point; motion?: RabbitMotion}
export interface LegendaryFrame {time: number; dt: number; active: boolean; reduced: boolean; asleep: boolean}
/** Ground contact under the feet, in the ground container (the shadow's centre). */
const GROUND_Y = 10;
const rand = (seed: number) => { const x = Math.sin(seed * 127.1) * 43758.5453; return x - Math.floor(x); };

/**
 * The visible show of one legendary (Lapin Dragon, Lapin Requin, Ankylosaure) in the meadow, rebuilt with its body; its clock lives on in
 * the scene so a rebuild never cuts a show short. Everything is decoration: no state, no input, no random generator.
 */
export class LegendaryView {
  /** Height added to the body's pose and lean (radians, already in the facing direction) for the current show. */
  lift = 0; lean = 0;
  /** The mouth is open (the nose-twitch patch must hide) or the body is under water (the face patches too). */
  mouthOpen = false; submerged = false;
  private readonly scale: number;
  private readonly part: Phaser.GameObjects.Image;
  private readonly mouth: Phaser.GameObjects.Image | null = null;
  private readonly back: Phaser.GameObjects.Container;
  private readonly front: Phaser.GameObjects.Container;
  private readonly fx: Phaser.GameObjects.Container;
  private pieces: Phaser.GameObjects.Image[] = [];
  private playing: ActState | null = null;
  private readonly phase: number;
  /** Reduced motion asked by the player: the slam then never shakes the camera. */
  private reduced = false;
  private shaken = false;

  constructor(private scene: Phaser.Scene, readonly id: string, readonly species: LegendaryShow, private host: LegendaryHost, readonly clock: LegendaryClock) {
    const {art, body, sprite, object} = host, parts = LEGENDARY_PARTS[species];
    this.scale = art.worldWidth / art.width;
    let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000; this.phase = h / 100;
    // The body is the approved picture without its part; the part, behind it, turns about its hidden root.
    sprite.setTexture(parts.body.texture);
    const anchor = this.point(parts.pivot.x, parts.pivot.y);
    this.part = scene.add.image(anchor.x, anchor.y, parts.part.texture).setOrigin(parts.pivot.x / art.width, parts.pivot.y / art.height).setScale(this.scale);
    // No golden halo in the meadow (owner, 31 October 2026): the shine belongs to the appearance and the rabbit's card.
    body.addAt(this.part, 0);
    if (parts.mouth) {
      // Same left edge and scale as the sprite; only its right side is wider, for the open snout.
      this.mouth = scene.add.image(0, art.groundY, parts.mouth.texture).setOrigin(art.width / 2 / parts.mouth.width, 1).setScale(this.scale).setVisible(false);
      body.addAt(this.mouth, body.getIndex(sprite) + 1);
    }
    this.fx = scene.add.container(0, 0); body.add(this.fx);
    this.back = scene.add.container(0, 0); this.front = scene.add.container(0, 0);
    object.addAt(this.back, 1); object.add(this.front);
  }
  /** A pixel of the sprite picture, in body space. */
  private point(x: number, y: number): Point { const {art} = this.host; return {x: (x - art.width / 2) * this.scale, y: art.groundY - (art.height - y) * this.scale}; }
  private get facing(): 1 | -1 { return this.host.body.scaleX < 0 ? -1 : 1; }
  private add(layer: Phaser.GameObjects.Container, art: EffectArt, width: number, origin: [number, number] = [.5, .5], additive = false): Phaser.GameObjects.Image {
    const image = this.scene.add.image(0, 0, art.texture).setOrigin(...origin).setScale(width / art.width);
    if (additive) image.setBlendMode(Phaser.BlendModes.ADD);
    layer.add(image); this.pieces.push(image); return image;
  }
  private clear(): void { for (const piece of this.pieces) piece.destroy(); this.pieces = []; this.mouthOpen = this.submerged = this.shaken = false; this.lift = this.lean = 0; }

  tap(): void { this.clock.tap(); }
  play(act: LegendaryAct): void { this.clock.play(act); }

  update(frame: LegendaryFrame): void {
    const {time, dt, active, reduced, asleep} = frame, motion = this.host.motion; this.reduced = reduced;
    const room = !!motion && motion.mode === 'rest' && this.surfTarget(motion) !== null;
    const idle = active && !reduced && !!motion && ['rest', 'walk', 'sleep'].includes(motion.mode);
    this.clock.step(dt, idle, asleep, room);
    const act = this.clock.act;
    // A surf that just began (spontaneous or from the laboratory) moves the rabbit along with its board.
    if (act?.act === 'surf' && act !== this.playing && motion && motion.mode !== 'surf') {
      const target = this.surfTarget(motion); if (target) startSurf(motion, target, SURF_ENTRY_MS, SURF_SLIDE_MS);
    }
    if (act !== this.playing) { this.clear(); this.playing = act; if (act) this.build(act); }
    this.part.setRotation(partAngle(this.species, time, this.phase, act, reduced));
    if (act) this.animate(act);
    this.host.sprite.setVisible(!this.mouthOpen && !this.submerged); this.mouth?.setVisible(this.mouthOpen && !this.submerged);
    this.part.setVisible(!this.submerged);
  }
  /** The surf goes 28 to 40 units sideways, towards the side with more room; none when the fence zone is too narrow. */
  private surfTarget(m: RabbitMotion): Point | null {
    const zone = motionZone(m), left = m.local.x - zone.minX, right = zone.maxX - m.local.x, room = Math.max(left, right);
    if (room < 22) return null;
    const distance = Math.min(40, room - 2);
    return {x: m.local.x + (right >= left ? distance : -distance), y: m.local.y};
  }

  private build({act}: ActState): void {
    const w = this.host.art.worldWidth;
    if (act === 'tap') {
      // The painted fire keeps its own colours (normal blending); only the small glowing bits are added light.
      this.add(this.fx, FX.breath[0], w * 1.25, [0, .5]);
      for (let k = 0; k < 8; k++) this.add(Math.sin(k / 8 * Math.PI * 2) < 0 ? this.back : this.front, FX.flame[0], w * .38, [.5, 1]);
      for (let k = 0; k < 10; k++) this.add(this.front, FX.ember, w * .1, [.5, .5], true);
    } else if (act === 'smoke') for (let k = 0; k < 3; k++) this.add(this.fx, FX.smoke, w * .32).setTint(0xc9c2bb);
    else if (act === 'hiccup') {
      this.add(this.fx, FX.flame[0], w * .3, [.5, .8]);
      for (let k = 0; k < 5; k++) this.add(this.fx, FX.ember, w * .08, [.5, .5], true);
    } else if (act === 'embers') for (let k = 0; k < 12; k++) this.add(this.front, k % 3 ? FX.ember : FX.spark, w * .1, [.5, .5], true);
    else if (act === 'dive' || act === 'splash') {
      this.add(this.back, FX.puddle, w * (act === 'dive' ? 1.15 : .8));
      if (act === 'dive') {
        // The fin alone circles in the puddle, turning about its root at the water line.
        const {part, pivot} = LEGENDARY_PARTS.requin, fin = this.scene.add.image(0, 0, part.texture).setOrigin(pivot.x / this.host.art.width, pivot.y / this.host.art.height);
        this.back.add(fin); this.pieces.push(fin);
      }
      this.add(this.front, FX.splash[0], w * .95, [.5, 1]);
    } else if (act === 'surf') {
      this.add(this.back, FX.surfwave[0], w * .8, [.5, 1]);
      this.add(this.back, FX.surfboard, w * 1.1);
      for (let k = 0; k < 2; k++) this.add(this.front, FX.splash[0], w * .55, [.5, 1]);
      for (let k = 0; k < 4; k++) this.add(this.back, FX.drop, w * .07);
    } else if (act === 'bubbles') for (let k = 0; k < 6; k++) this.add(this.front, FX.bubble, w * (.1 + rand(k) * .1));
    else if (act === 'slam') {
      // Where the club lands: a crack and a ring of dust on the ground, puffs of dust, stones and gravel thrown up.
      this.add(this.back, FX.crack, w * .9); this.add(this.back, FX.dustring, w * 1.15);
      for (let k = 0; k < 3; k++) this.add(this.front, FX.dust, w * .42);
      for (const [art, size] of [[FX.rock, .2], [FX.stone, .15], [FX.stone, .12], [FX.gravel, .13], [FX.gravel, .11], [FX.gravel, .12]] as const) this.add(this.front, art, w * size);
    } else if (act === 'rumble') {
      for (let k = 0; k < 2; k++) this.add(this.back, FX.dust, w * .3);
      for (let k = 0; k < 6; k++) this.add(this.front, k % 3 ? FX.gravel : FX.stone, w * (.1 + rand(k + 50) * .04));
    } else if (act === 'dig') {
      this.add(this.back, FX.mound, w * .62, [.5, 1]);
      for (let k = 0; k < 6; k++) this.add(this.front, k % 2 ? FX.clod : FX.gravel, w * (k % 2 ? .13 : .1));
    } else if (act === 'dust') for (let k = 0; k < 4; k++) this.add(this.front, FX.dust, w * .34);
  }

  private animate({act, elapsed: ms, duration}: ActState): void {
    const u = ms / duration, w = this.host.art.worldWidth, p = this.pieces, f = this.facing;
    const mouth = LEGENDARY_PARTS.dragon.mouth!.point, nose = this.point(mouth.x - 6, mouth.y - 14), lips = this.point(mouth.x, mouth.y);
    if (act === 'tap') {
      const open = ms > 90 && ms < duration - 300; this.mouthOpen = open;
      this.lean = -f * .07 * envelope(u, .1, .25);
      const breath = p[0], show = ms > 150 && ms < duration - 260;
      breath.setTexture(FX.breath[breathFrame(ms - 150, duration - 410)].texture).setPosition(lips.x - 1, lips.y).setVisible(show).setAlpha(show ? 1 : 0);
      const ring = envelope(u, .2, .25), rx = w * .62, ry = rx * .3;
      for (let k = 0; k < 8; k++) {
        const angle = k / 8 * Math.PI * 2, flame = p[1 + k], rise = smooth(Math.min(1, u * 4 - k * .06));
        flame.setTexture(FX.flame[loopFrame(ms, 6, 13, k * 1.7)].texture).setPosition(Math.cos(angle) * rx, GROUND_Y + 2 + Math.sin(angle) * ry)
          .setScale(w * .38 / FX.flame[0].width * ring * rise * (.85 + .3 * rand(k))).setAlpha(ring);
      }
      for (let k = 0; k < 10; k++) {
        const t = (u * 1.6 + rand(k + 20)) % 1, x = (rand(k + 40) * 2 - 1) * w * .7;
        p[9 + k].setPosition(x + Math.sin(t * 6 + k) * 3, GROUND_Y - t * w * .9).setAlpha(ring * Math.sin(t * Math.PI));
      }
    } else if (act === 'smoke') {
      for (let k = 0; k < 3; k++) {
        const t = Math.max(0, Math.min(1, (ms - k * 350) / 1200));
        p[k].setPosition(nose.x + t * 10, nose.y - t * 16 - k).setScale(w * .32 / FX.smoke.width * (.35 + t * .9)).setAlpha(t > 0 ? .75 * Math.sin(t * Math.PI) : 0);
      }
    } else if (act === 'hiccup') {
      this.lift = Math.max(0, Math.sin(Math.min(1, ms / 380) * Math.PI)) * 5;
      this.mouthOpen = ms > 160 && ms < 620;
      const t = Math.max(0, Math.min(1, (ms - 180) / 600));
      p[0].setTexture(FX.flame[loopFrame(ms, 6, 14)].texture).setPosition(lips.x + 4, lips.y + 2).setScale(w * .3 / FX.flame[0].width * Math.sin(t * Math.PI)).setRotation(Math.PI / 2.4)
        .setAlpha(t > 0 && t < 1 ? 1 : 0);
      for (let k = 1; k < p.length; k++) {
        const e = Math.max(0, Math.min(1, (ms - 300 - k * 40) / 700));
        p[k].setPosition(lips.x + 6 + e * (8 + k * 3), lips.y - e * (6 + k * 4)).setAlpha(e > 0 ? Math.sin(e * Math.PI) : 0);
      }
    } else if (act === 'embers') {
      for (let k = 0; k < p.length; k++) {
        const t = Math.max(0, Math.min(1, (u * 1.3 - rand(k) * .3))), x = (rand(k + 9) * 2 - 1) * w * .6;
        p[k].setPosition(x + Math.sin(t * 7 + k) * 4, GROUND_Y - 4 - t * w * 1.1).setAlpha(Math.sin(t * Math.PI) * (.6 + .4 * Math.sin(ms / 60 + k)));
      }
    } else if (act === 'dive' || act === 'splash') {
      const pool = act === 'dive' ? envelope(u, .12, .12) : envelope(u, .2, .35), side = act === 'dive' ? 0 : f * w * .55;
      p[0].setPosition(side, GROUND_Y + 1).setScale(w * (act === 'dive' ? 1.15 : .8) / FX.puddle.width * (.4 + .6 * pool)).setAlpha(pool);
      const splash = p.at(-1)!;
      const splashAt = (start: number) => Math.max(-1, Math.min(6, Math.floor((ms - start) / 75)));
      if (act === 'dive') {
        this.submerged = ms > DIVE.hideAt && ms < DIVE.showAt;
        const fin = diveFin(ms), rx = w * .3, ry = rx * .3, finImage = p[1];
        finImage.setVisible(fin.visible).setPosition(Math.cos(fin.angle) * rx, GROUND_Y - 2 + Math.sin(fin.angle) * ry)
          .setScale(this.scale * .9 * -Math.sign(Math.sin(fin.angle) || 1), this.scale * .9);
        this.lift = ms > DIVE.showAt ? Math.sin(Math.min(1, (ms - DIVE.showAt) / 420) * Math.PI) * 7 : 0;
        const frame = ms < 900 ? splashAt(DIVE.hideAt - 230) : splashAt(DIVE.showAt - 120);
        splash.setPosition(0, GROUND_Y + 3).setVisible(frame >= 0 && frame < 6).setTexture(FX.splash[Math.max(0, Math.min(5, frame))].texture);
      } else {
        const frame = splashAt(150);
        splash.setPosition(side, GROUND_Y + 3).setVisible(frame >= 0 && frame < 6).setTexture(FX.splash[Math.max(0, Math.min(5, frame))].texture);
      }
    } else if (act === 'surf') {
      const pose = surfPose(ms), [wave, board, splashA, splashB, ...drops] = p;
      this.lift = pose.lift; this.lean = f * pose.lean;
      board.setPosition(0, GROUND_Y + 1 - pose.lift * .6).setScale(f * w * 1.1 / FX.surfboard.width, w * 1.1 / FX.surfboard.width).setAlpha(pose.board).setRotation(f * pose.lean * .6);
      wave.setTexture(FX.surfwave[loopFrame(ms, 6, 12)].texture).setPosition(-f * w * .3, GROUND_Y + 4).setScale(f * w * .8 / FX.surfwave[0].width * pose.board, w * .8 / FX.surfwave[0].width * pose.board).setAlpha(pose.board * .95);
      const splashFrame = (start: number) => Math.floor((ms - start) / 70);
      for (const [image, start, x] of [[splashA, 0, 0], [splashB, ACT_MS.surf - SURF_ENTRY_MS - 120, f * w * .1]] as const) {
        const frame = splashFrame(start); image.setVisible(frame >= 0 && frame < 6).setTexture(FX.splash[Math.max(0, Math.min(5, frame))].texture).setPosition(x, GROUND_Y + 3);
      }
      drops.forEach((drop, k) => {
        const t = ((ms / 520) + k / drops.length) % 1;
        drop.setPosition(-f * (w * .45 + t * 10), GROUND_Y - 4 - Math.sin(t * Math.PI) * 9 - k).setAlpha(pose.board * Math.sin(t * Math.PI));
      });
    } else if (act === 'bubbles') {
      p.forEach((bubble, k) => {
        const t = Math.max(0, Math.min(1, u * 1.4 - rand(k + 3) * .4)), x = (rand(k + 7) * 2 - 1) * w * .4;
        bubble.setPosition(x + Math.sin(t * 9 + k) * 3, GROUND_Y - 8 - t * w * .9).setAlpha(t > 0 && t < .97 ? .9 : 0);
      });
    } else if (act === 'slam') this.slam(ms, w, f);
    else if (act === 'rumble') {
      const shake = envelope(u, .1, .2), [dustA, dustB, ...stones] = p;
      this.lean = f * Math.sin(ms / 28) * .025 * shake; this.lift = Math.abs(Math.sin(ms / 45)) * 1.2 * shake;
      [dustA, dustB].forEach((dust, k) => dust.setPosition((k ? 1 : -1) * w * .32, GROUND_Y - 2).setScale(w * .3 / FX.dust.width * (.7 + .25 * Math.sin(ms / 160 + k))).setAlpha(.55 * shake));
      stones.forEach((stone, k) => stone.setPosition((rand(k + 60) * 2 - 1) * w * .62, GROUND_Y + 2 - Math.abs(Math.sin(ms / 110 + k * 1.3)) * (3 + rand(k) * 3) * shake)
        .setRotation(Math.sin(ms / 90 + k) * .3).setAlpha(shake));
    } else if (act === 'dig') {
      const busy = envelope(u, .1, .15), [mound, ...clods] = p, behind = -f * w * .55;
      this.lean = f * .12 * busy; this.lift = Math.abs(Math.sin(ms / 70)) * 1.2 * busy;
      mound.setPosition(behind, GROUND_Y + 3).setScale(w * .62 / FX.mound.width * (.25 + .75 * smooth(u * 1.3))).setAlpha(envelope(u, .05, .15));
      clods.forEach((clod, k) => {
        // Each clod is thrown back between the hind legs, in turn, and lands on the growing heap.
        const t = (ms / 520 + k / clods.length) % 1, on = u > .08 && u < .82;
        clod.setPosition(f * w * .28 + (behind - f * w * .28) * t, GROUND_Y - 1 - arc(t) * (12 + rand(k) * 6)).setRotation(t * 5 * -f).setAlpha(on ? Math.min(1, Math.sin(t * Math.PI) * 3) : 0);
      });
    } else if (act === 'dust') {
      const landed = Math.max(0, ms - 300);
      this.lift = ms < 300 ? Math.sin(ms / 300 * Math.PI) * 4 : 0;
      p.forEach((dust, k) => {
        const t = Math.min(1, landed / 900), side = k % 2 ? 1 : -1, far = k < 2 ? .5 : .3;
        dust.setPosition(side * w * (.18 + far * smooth(t)), GROUND_Y - 2 - t * (k < 2 ? 6 : 12)).setScale(w * .34 / FX.dust.width * (.4 + .7 * t)).setAlpha(landed > 0 ? .85 * (1 - t) : 0);
      });
    }
  }
  /** The club tail strikes at `SLAM.impact`: the ground cracks, a ring of dust spreads, stones fly and the meadow shakes a little. */
  private slam(ms: number, w: number, f: 1 | -1): void {
    const [crack, ring, ...rest] = this.pieces, puffs = rest.slice(0, 3), stones = rest.slice(3), t = ms - SLAM.impact;
    const strike = LEGENDARY_PARTS.ankylosaure.strike!, x = f * this.point(strike.x, strike.y).x;
    if (t < 0) { for (const piece of this.pieces) piece.setAlpha(0); return; }
    if (!this.shaken) { this.shaken = true; if (!this.reduced) this.scene.cameras.main.shake(220, .004); }
    this.lift = t < 260 ? Math.sin(t / 260 * Math.PI) * 3 : 0;
    const fade = 1 - smooth((t - 650) / 450);
    crack.setPosition(x, GROUND_Y + 2).setScale(w * .9 / FX.crack.width * (.55 + .45 * smooth(t / 120))).setAlpha(fade);
    const k = Math.min(1, t / 600); ring.setPosition(x, GROUND_Y + 2).setScale(w * 1.15 / FX.dustring.width * (.3 + .9 * k)).setAlpha(.9 * (1 - k));
    puffs.forEach((puff, n) => {
      const d = Math.min(1, t / 900), dir = n - 1;
      puff.setPosition(x + dir * d * w * .35, GROUND_Y - 2 - d * (8 + (n === 1 ? 6 : 0))).setScale(w * .42 / FX.dust.width * (.45 + .6 * d)).setAlpha(.9 * (1 - d));
    });
    stones.forEach((stone, n) => {
      const flight = 520 + rand(n + 70) * 260, v = Math.min(1, t / flight), side = n % 2 ? 1 : -1;
      stone.setPosition(x + side * (8 + rand(n + 80) * w * .5) * v, GROUND_Y + 1 - arc(v) * (14 + rand(n + 90) * 16)).setRotation(v * side * 4).setAlpha(v < 1 ? 1 : 0);
    });
  }
  destroy(): void { this.clear(); for (const o of [this.part, this.mouth, this.back, this.front, this.fx]) o?.destroy(); }
}
