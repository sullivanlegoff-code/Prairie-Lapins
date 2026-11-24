import Phaser from 'phaser';
import {LEGENDARY_EFFECTS as FX, arkokoCrystalForArt, crystalCentre, legendaryPartsForArt, type EffectArt, type LegendaryShow} from '../config/legendaryArt';
import {EASEL_REST, PEINTRE_FX as PFX, PEINTRE_POSES, peintreVersion, type PeintrePoses} from '../config/peintreArt';
import type {RabbitArt} from '../config/rabbitArt';
import type {Point} from '../ui/gestures';
import {motionZone, startSurf, type RabbitMotion} from './rabbitMotion';
import {ACT_MS, DIVE, EASEL, LegendaryClock, SLAM, SURF_ENTRY_MS, SURF_SLIDE_MS, arc, arkokoHop, breathFrame, brushWork, canvasProgress, crystalFlare, diveFin, easelPresence, envelope,
  loopFrame, partAngle, peintrePose, rainbowStep, smooth, stillAct, surfPose, type ActState, type LegendaryAct, type PeintrePose} from './legendaryTimeline';

/** What the meadow gives each legendary: its ground container, its posed body and the approved sprite inside it. */
export interface LegendaryHost {object: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Image; art: RabbitArt; pivot: Point; motion?: RabbitMotion}
export interface LegendaryFrame {time: number; dt: number; active: boolean; reduced: boolean; asleep: boolean}
/** Ground contact under the feet, in the ground container (the shadow's centre). */
const GROUND_Y = 10;
const rand = (seed: number) => { const x = Math.sin(seed * 127.1) * 43758.5453; return x - Math.floor(x); };

/**
 * The visible show of one legendary (Lapin Dragon, Lapin Requin, Ankylosaure, Arkoko) in the meadow, rebuilt with its body; its clock lives on in
 * the scene so a rebuild never cuts a show short. Everything is decoration: no state, no input, no random generator.
 */
export class LegendaryView {
  /** Height added to the body's pose and lean (radians, already in the facing direction) for the current show. */
  lift = 0; lean = 0;
  /** Arkoko's body squash for its little hops and its twirl (a negative width shows it turning about itself); 1 at rest. */
  squashX = 1; squashY = 1;
  /** The mouth is open (the nose-twitch patch must hide) or the body is under water (the face patches too). */
  mouthOpen = false; submerged = false;
  /** The Peintre shows one of his painted poses (his drawing's face patches and crown must hide). */
  posing: PeintrePose | null = null;
  /** The Peintre paints, plants or flicks his brush where he stands: the meadow keeps him in place. */
  get still(): boolean { return this.species === 'peintre' && stillAct(this.clock.act?.act); }
  private readonly poses: PeintrePoses | null = null;
  private readonly scale: number;
  private readonly part: Phaser.GameObjects.Image | null = null;
  private readonly mouth: Phaser.GameObjects.Image | null = null;
  /** Arkoko: its crystal's original glow and the crystal as added light, over the drawing, hidden at rest. */
  private readonly glow: Phaser.GameObjects.Image | null = null;
  private readonly light: Phaser.GameObjects.Image | null = null;
  private readonly crystal: Point = {x: 0, y: 0};
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
    const {art, body, sprite, object} = host, parts = legendaryPartsForArt(species, art);
    this.scale = art.worldWidth / art.width;
    let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000; this.phase = h / 100;
    if (species === 'peintre') this.poses = PEINTRE_POSES[peintreVersion(art)];
    else if (!parts) {
      // Arkoko keeps its whole drawing; the crystal's glow and light sit just over it, under the eyelids, and scale about the crystal.
      const crystal = arkokoCrystalForArt(art), centre = crystalCentre(crystal), at = this.point(centre.x, centre.y);
      this.crystal = at;
      const over = (piece: {texture: string; x: number; y: number; width: number; height: number}) => scene.add.image(at.x, at.y, piece.texture)
        .setOrigin((centre.x - piece.x) / piece.width, (centre.y - piece.y) / piece.height).setScale(this.scale).setVisible(false).setAlpha(0);
      if (crystal.glow) { this.glow = over(crystal.glow); body.addAt(this.glow, body.getIndex(sprite) + 1); }
      this.light = over(crystal.crystal).setBlendMode(Phaser.BlendModes.ADD); body.addAt(this.light, body.getIndex(this.glow ?? sprite) + 1);
    } else {
      // The body is the approved picture without its part; the part, behind it, turns about its hidden root.
      sprite.setTexture(parts.body.texture);
      const anchor = this.point(parts.pivot.x, parts.pivot.y);
      this.part = scene.add.image(anchor.x, anchor.y, parts.part.texture).setOrigin(parts.pivot.x / art.width, parts.pivot.y / art.height).setScale(this.scale);
      // No golden halo in the meadow (owner, 31 October 2026): the shine belongs to the appearance and the rabbit's card.
      body.addAt(this.part, 0);
    }
    if (parts?.mouth) {
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
  private clear(): void { for (const piece of this.pieces) piece.destroy(); this.pieces = []; this.mouthOpen = this.submerged = this.shaken = false; this.lift = this.lean = 0; this.squashX = this.squashY = 1; }

  tap(): void { this.clock.tap(); }
  play(act: LegendaryAct): void { this.clock.play(act); }
  /** From the sheet's show button: true when the show starts. */
  request(act: LegendaryAct): boolean { return !!this.clock.request(act); }

  update(frame: LegendaryFrame): void {
    const {time, dt, active, reduced, asleep} = frame, motion = this.host.motion; this.reduced = reduced;
    const room = !!motion && motion.mode === 'rest' && this.surfTarget(motion) !== null;
    // The Peintre starts a show only once he has stopped (his shows keep him in place).
    const idle = active && !reduced && !!motion && (this.species === 'peintre' ? ['rest', 'sleep'] : ['rest', 'walk', 'sleep']).includes(motion.mode);
    this.clock.step(dt, idle, asleep, room);
    const act = this.clock.act;
    // A surf that just began (spontaneous or from the laboratory) moves the rabbit along with its board.
    if (act?.act === 'surf' && act !== this.playing && motion && motion.mode !== 'surf') {
      const target = this.surfTarget(motion); if (target) startSurf(motion, target, SURF_ENTRY_MS, SURF_SLIDE_MS);
    }
    // The Peintre sets his easel up on the side of the enclosure with more room (never against the fence).
    if (act?.act === 'easel' && act !== this.playing && motion) {
      const zone = motionZone(motion), left = motion.local.x - zone.minX, right = zone.maxX - motion.local.x;
      motion.facing = right >= left ? 1 : -1;
    }
    if (act !== this.playing) { this.clear(); this.playing = act; if (act) this.build(act); }
    this.part?.setRotation(partAngle(this.species, time, this.phase, act, reduced));
    this.shine(0, 0, 1);
    if (act) this.animate(act);
    if (this.poses) this.pose(act ? peintrePose(act.act, act.elapsed) : null);
    this.host.sprite.setVisible(!this.mouthOpen && !this.submerged); this.mouth?.setVisible(this.mouthOpen && !this.submerged);
    this.part?.setVisible(!this.submerged);
  }
  /** Arkoko's crystal: its original glow (0 = the toned-down drawing), the crystal's added light, and the glow's size about the crystal. */
  private shine(glow: number, light: number, scale: number): void {
    this.glow?.setAlpha(glow).setVisible(glow > .004).setScale(this.scale * scale);
    this.light?.setAlpha(light).setVisible(light > .004);
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
        const {part, pivot} = legendaryPartsForArt('requin', this.host.art), fin = this.scene.add.image(0, 0, part.texture).setOrigin(pivot.x / this.host.art.width, pivot.y / this.host.art.height);
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
    else if (act === 'flare') {
      // A burst of rainbow light opens on the crystal, and a few stars fly out of it.
      this.add(this.fx, FX.prism, w * 1.05, [.5, .5], true);
      for (let k = 0; k < 10; k++) this.add(this.fx, k % 2 ? FX.star : FX.starFive, w * (.17 + rand(k + 110) * .08), [.5, .5], true);
    } else if (act === 'stars') {
      for (let k = 0; k < 12; k++) this.add(k % 3 ? this.front : this.back, [FX.twinkle, FX.star, FX.starFive][k % 3], w * (k % 3 ? .22 : .42), [.5, .5], true);
    } else if (act === 'rainbow') {
      // Big enough to arch over the whole rabbit; it stays put (in the ground container) while the rabbit hops under it.
      this.add(this.back, FX.rainbow[0], w * 2.3, [.5, 1]);
      for (let k = 0; k < 6; k++) this.add(this.front, k % 2 ? FX.star : FX.starFive, w * .18, [.5, .5], true);
    } else if (act === 'stroke') {
      // A great crescent of paint drawn by his brush, and drops thrown off its end.
      this.add(this.fx, PFX.stroke, w * .8);
      for (let k = 0; k < 6; k++) this.add(this.fx, PFX.drop, w * (.07 + rand(k + 200) * .04));
      for (let k = 0; k < 3; k++) this.add(this.fx, k % 2 ? PFX.splatBlue : PFX.splatYellow, w * .22);
    } else if (act === 'splatter') {
      for (let k = 0; k < 10; k++) this.add(this.fx, PFX.drop, w * (.06 + rand(k + 300) * .05));
      for (let k = 0; k < 10; k++) this.add(this.fx, k % 2 ? PFX.splatBlue : PFX.splatYellow, w * (.2 + rand(k + 310) * .12));
    } else if (act === 'sunflowers') {
      // Five sunflowers around him: three behind, two in front at his sides; each one a bud first, then the flower.
      for (let k = 0; k < 5; k++) { const layer = k < 3 ? this.back : this.front; this.add(layer, PFX.bud, w * .26, [.5, 1]); this.add(layer, PFX.sunflower, w * .5, [.5, 1]); }
    } else if (act === 'starry') {
      for (let k = 0; k < 5; k++) this.add(this.back, k % 2 ? PFX.swirl : PFX.star, w * (k % 2 ? .34 : .4));
    } else if (act === 'easel') {
      // The easel stands behind him, on the side he faces; the canvas rests on it, in two layers (a step and the next one fading in).
      this.add(this.back, PFX.easel, w * .8, [.5, 1]);
      for (let k = 0; k < 2; k++) this.add(this.back, PFX.canvas[0], w * .8 * EASEL_REST.width, [.5, 1]);
      for (let k = 0; k < 4; k++) this.add(this.back, PFX.star, w * .2);
    } else if (act === 'trail') {
      // The trail flies once around the rabbit: behind it on the far side, in front on the near side; stardust follows.
      this.add(this.back, FX.trail, w * 1.5); this.add(this.front, FX.trail, w * 1.5);
      for (let k = 0; k < 2; k++) this.add(k ? this.front : this.back, FX.stardust, w * .6, [.5, .5], true);
      for (let k = 0; k < 6; k++) this.add(this.front, k % 2 ? FX.twinkle : FX.star, w * .16, [.5, .5], true);
    }
  }

  private animate({act, elapsed: ms, duration}: ActState): void {
    const u = ms / duration, w = this.host.art.worldWidth, p = this.pieces, f = this.facing;
    const mouth = legendaryPartsForArt('dragon', this.host.art).mouth!.point, nose = this.point(mouth.x - 6, mouth.y - 14), lips = this.point(mouth.x, mouth.y);
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
    else if (act === 'flare' || act === 'stars' || act === 'rainbow' || act === 'trail') this.arkoko(act, ms, u, w);
    else if (act === 'stroke' || act === 'splatter' || act === 'sunflowers' || act === 'starry' || act === 'easel') this.peintre(act, ms, u, w);
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
  /** Arkoko's shows: the crystal's flare, twinkling stars, a small rainbow over its head, a rainbow trail flying around it. */
  private arkoko(act: LegendaryAct, ms: number, u: number, w: number): void {
    const p = this.pieces, c = this.crystal, still = this.reduced;
    if (act === 'flare') {
      // A happy jump as the crystal lights up: it crouches, springs up while the light bursts out, and lands with a little squash.
      const flare = crystalFlare(ms), [burst, ...stars] = p;
      this.shine(flare.glow, flare.light, flare.scale);
      if (!still) { const hop = arkokoHop(ms, 60, 520, 7); this.lift = hop.lift; this.squashX = hop.squashX; this.squashY = hop.squashY; }
      burst.setPosition(c.x, c.y).setScale(w * 1.05 / FX.prism.width * flare.burstScale).setAlpha(flare.burst).setRotation(ms / 1400);
      stars.forEach((star, k) => {
        const t = Math.max(0, Math.min(1, (ms - 60 - k * 30) / 850)), angle = -Math.PI / 2 + (k / (stars.length - 1) - .5) * Math.PI * 1.5, far = w * (.45 + rand(k + 120) * .35);
        star.setPosition(c.x + Math.cos(angle) * far * smooth(t), c.y + Math.sin(angle) * far * smooth(t) + t * t * 6).setAlpha(t > 0 && t < 1 ? Math.sin(t * Math.PI) : 0).setRotation(t * 3);
      });
    } else if (act === 'stars') {
      // The crystal glimmers while stars light up in turn around the rabbit; it looks up at them, swaying a little.
      const soft = envelope(u, .2, .3); this.shine(.35 * soft * (.6 + .4 * Math.sin(ms / 180)), .3 * soft, 1);
      if (!still) { this.lean = -this.facing * .06 * soft * Math.sin(ms / 420); this.lift = 1.2 * soft * (1 + Math.sin(ms / 300)); }
      p.forEach((star, k) => {
        const t = (u * 1.5 + rand(k + 130)) % 1, x = (rand(k + 140) * 2 - 1) * w * .7, y = GROUND_Y - 6 - rand(k + 150) * w * 1.05;
        star.setPosition(x, y - t * 8).setAlpha(soft * Math.sin(t * Math.PI)).setScale(w * (k % 3 ? .22 : .42) / FX.star.width * (.6 + .6 * Math.sin(t * Math.PI))).setRotation(t * 1.6);
      });
    } else if (act === 'rainbow') {
      // The rainbow draws itself over the rabbit, which hops three times under it for joy; stars twinkle along its arch.
      const step = rainbowStep(ms), [rainbow, ...stars] = p;
      if (!still) {
        const hop = [arkokoHop(ms, 250, 460, 6), arkokoHop(ms, 800, 460, 7), arkokoHop(ms, 1350, 520, 9)].find(h => h.on) ?? arkokoHop(-1e4, 0, 1, 0);
        this.lift = hop.lift; this.squashX = hop.squashX; this.squashY = hop.squashY;
      }
      rainbow.setTexture(FX.rainbow[step.frame].texture).setPosition(0, GROUND_Y - 2).setAlpha(step.alpha * .95);
      stars.forEach((star, k) => {
        const t = Math.max(0, Math.min(1, (ms - 500 - k * 230) / 800)), x = (k / (stars.length - 1) - .5) * w * 1.9;
        star.setPosition(x, GROUND_Y - w * (.9 + .5 * Math.sin((k / (stars.length - 1)) * Math.PI)) - Math.sin(t * Math.PI) * 6).setAlpha(step.alpha * Math.sin(t * Math.PI));
      });
    } else {
      // The trail flies once around the rabbit (behind it on the far side, in front on the near side); halfway it twirls once
      // about itself, its cape flying out, then lands; stardust and sparkles follow the trail.
      const [back, front, dustBack, dustFront, ...sparkles] = p, fade = envelope(u, .12, .2), rx = w * .72, ry = w * .24, size = w * 1.5 / FX.trail.width;
      const orbit = (v: number) => { const angle = Math.PI + v * Math.PI * 2.2; return {x: Math.cos(angle) * rx, y: GROUND_Y - w * .55 + Math.sin(angle) * ry, near: Math.sin(angle) > 0, angle}; };
      const head = orbit(u), tail = orbit(u - .06);
      for (const [image, shown] of [[back, !head.near], [front, head.near]] as const)
        image.setPosition(head.x, head.y).setScale(size * (Math.sin(head.angle) <= 0 ? 1 : -1), size).setRotation(Math.cos(head.angle) * .25).setAlpha(shown ? fade : 0);
      for (const [image, shown] of [[dustBack, !tail.near], [dustFront, tail.near]] as const) image.setPosition(tail.x, tail.y).setAlpha(shown ? fade * .85 : 0);
      sparkles.forEach((sparkle, k) => {
        const at = orbit(u - .04 - k * .025), t = (ms / 400 + k / sparkles.length) % 1;
        sparkle.setPosition(at.x, at.y + t * 6).setAlpha(at.near ? fade * (1 - t) : 0).setRotation(t * 2);
      });
      if (!still) {
        const spin = smooth(Math.max(0, Math.min(1, (u - .3) / .4)));
        this.squashX = Math.cos(spin * Math.PI * 2); this.lift = Math.sin(spin * Math.PI) * 6;
        // Never edge-on: it keeps a quarter of its width, so it reads as turning rather than as a thin line.
        if (Math.abs(this.squashX) < .25) this.squashX = this.squashX < 0 ? -.25 : .25;
      }
      this.shine(.25 * fade, .25 * fade, 1);
    }
  }
  /** The Peintre's painted pose of the moment, in place of his drawing (same origin and scale); null gives his drawing back. */
  private pose(pose: PeintrePose | null): void {
    const texture = pose ? this.poses!.poses[pose].texture : this.host.art.texture;
    if (this.host.sprite.texture.key !== texture && this.scene.textures.exists(texture)) this.host.sprite.setTexture(texture);
    this.posing = pose && this.host.sprite.texture.key === texture ? pose : null;
  }
  /** A pixel of one of his pose canvases, in body space (the canvas shares the drawing's ground, centre and scale). */
  private posePoint(at: Point): Point { const c = this.poses!.canvas; return {x: (at.x - c.width / 2) * this.scale, y: this.host.art.groundY - (c.height - at.y) * this.scale}; }
  /** The brush's tip in a pose (body space), or a point beside his head when the painting gave none. */
  private tip(pose: PeintrePose): Point {
    const at = this.poses?.poses[pose].tip;
    return at ? this.posePoint(at) : {x: this.host.art.worldWidth * .35, y: this.host.art.groundY - this.host.art.worldWidth * 1.1};
  }
  /**
   * The Peintre's shows: the great brush stroke, the flick that spatters paint, the sunflowers, the starry sky over his head and the
   * easel where he paints the Almond Blossom (src/display/legendaryTimeline.ts says when each pose and piece comes).
   */
  private peintre(act: LegendaryAct, ms: number, u: number, w: number): void {
    const p = this.pieces, f = this.facing, still = this.reduced, ground = this.host.art.groundY;
    if (act === 'stroke') {
      // A crouch, then a hop as he swings: the stroke opens from the brush's tip and turns with it, drops fly off and land as splats.
      if (!still) { const hop = arkokoHop(ms, 120, 620, 5); this.lift = hop.lift; this.squashX = hop.squashX; this.squashY = hop.squashY; }
      const tip = this.tip('swing'), [stroke, ...rest] = p, drops = rest.slice(0, 6), splats = rest.slice(6);
      const open = smooth((ms - 220) / 520), fade = 1 - smooth((ms - 1350) / 600);
      stroke.setPosition(tip.x - w * .3, tip.y + w * .1).setScale(w * .8 / PFX.stroke.width * (.35 + .65 * open)).setRotation(-.6 + .6 * open).setAlpha(ms < 220 ? 0 : open * fade);
      drops.forEach((drop, k) => {
        const t = Math.max(0, Math.min(1, (ms - 420 - k * 60) / 700)), dx = w * (.25 + rand(k + 210) * .55);
        drop.setPosition(tip.x + dx * t, tip.y + (ground - tip.y) * t * t - Math.sin(t * Math.PI) * w * .25).setAlpha(t > 0 && t < 1 ? 1 : 0).setRotation(t * 4);
      });
      splats.forEach((splat, k) => {
        const landed = ms - (1120 + k * 120), size = w * .22 / PFX.splatYellow.width * smooth(landed / 160);
        splat.setPosition(tip.x + w * (.25 + rand(k * 2 + 210) * .55), ground - 1).setScale(size, size * .45).setAlpha(landed < 0 ? 0 : 1 - smooth((landed - 500) / 400));
      });
    } else if (act === 'splatter') {
      // A flick of the brush: drops burst out of its tip on all sides, fall and spread into splats around him, which then fade.
      if (!still) this.lean = -f * .08 * envelope(ms / 1100, .2, .4);
      const tip = this.tip('swing'), drops = p.slice(0, 10), splats = p.slice(10);
      drops.forEach((drop, k) => {
        const flight = 520 + rand(k + 320) * 300, t = Math.max(0, Math.min(1, (ms - 330) / flight)), landX = (rand(k + 330) * 2 - 1) * w * .95;
        drop.setPosition(tip.x + (landX - tip.x) * t, tip.y + (ground - tip.y) * t * t - Math.sin(t * Math.PI) * w * (.3 + rand(k) * .3)).setAlpha(t > 0 && t < 1 ? 1 : 0).setRotation(t * 5);
        const landed = ms - 330 - flight, size = w * (.2 + rand(k + 310) * .12) / PFX.splatYellow.width * smooth(landed / 140);
        splats[k].setPosition(landX, ground - 1 + rand(k + 340) * 3).setScale(size, size * .45).setAlpha(landed < 0 ? 0 : 1 - smooth((ms - 1500) / 450));
      });
    } else if (act === 'sunflowers') {
      // Three little hops, a touch of the brush each: a bud pushes out of the ground, opens into a sunflower that sways; at the end he
      // admires them and they shrink back into the grass.
      if (!still) {
        const hop = [arkokoHop(ms, 150, 380, 4), arkokoHop(ms, 650, 380, 4), arkokoHop(ms, 1150, 380, 5)].find(h => h.on);
        if (hop) { this.lift = hop.lift; this.squashX = hop.squashX; this.squashY = hop.squashY; } else { this.lift = 0; this.squashX = this.squashY = 1; }
      }
      const spots = [[-.85, -5], [-.25, -9], [.5, -7], [-.7, 6], [.8, 5]] as const, gone = 1 - smooth((ms - 2550) / 450);
      spots.forEach(([sx, sy], k) => {
        const bud = p[k * 2], flower = p[k * 2 + 1], born = ms - (250 + k * 260), x = sx * w * f, y = GROUND_Y + sy;
        const grow = smooth(born / 380), open = smooth((born - 380) / 260), sway = Math.sin(ms / 340 + k) * .08;
        bud.setPosition(x, y).setScale(w * .26 / PFX.bud.width * grow * (1 - open)).setAlpha(born < 0 ? 0 : (1 - open) * gone).setRotation(sway);
        const pop = open < 1 ? 1 + Math.sin(open * Math.PI) * .2 : 1;
        flower.setPosition(x, y).setScale(w * .5 / PFX.sunflower.width * open * pop * gone).setAlpha(open * gone).setRotation(sway);
      });
    } else if (act === 'starry') {
      // He looks up at a starry night turning slowly over his head: stars and little spirals of wind, glowing as they pass.
      const soft = envelope(u, .2, .3);
      if (!still) { this.lean = -f * .07 * soft; this.lift = 1.5 * soft * (1 + Math.sin(ms / 320)); }
      p.forEach((piece, k) => {
        const angle = Math.PI + (k / p.length) * Math.PI + ms / 1400, x = Math.cos(angle) * w * .8, y = GROUND_Y - w * 1.3 + Math.sin(angle) * w * .22;
        const size = (k % 2 ? .34 : .4) * w / (k % 2 ? PFX.swirl.width : PFX.star.width), pulse = 1 + .12 * Math.sin(ms / 220 + k * 1.7);
        piece.setPosition(x, y).setScale(size * pulse * (.6 + .4 * soft)).setRotation(ms / (k % 2 ? -500 : 900) + k).setAlpha(soft);
      });
    } else this.easel(ms, w, f);
  }
  /** The ten-second painting: the easel rises, he lifts the canvas onto it, paints it step by step, admires it, and all fades away. */
  private easel(ms: number, w: number, f: 1 | -1): void {
    const [easel, lower, upper, ...twinkles] = this.pieces, presence = easelPresence(ms), tip = this.tip('paint');
    const easelWidth = w * .8, canvasWidth = easelWidth * EASEL_REST.width, scale = easelWidth / PFX.easel.width, easelHeight = PFX.easel.height * scale;
    // The canvas's near edge comes just past the brush's tip, so he paints on it.
    const x = f * (tip.x + canvasWidth / 2 - w * .06), y = GROUND_Y - 1 + (1 - presence) * 5;
    easel.setPosition(x, y).setScale(scale, scale * (.9 + .1 * presence)).setAlpha(presence);
    const rest = {x: x + f * (EASEL_REST.x - .5) * easelWidth, y: y - easelHeight * (1 - EASEL_REST.y)}, placed = smooth((ms - EASEL.place) / 180) * presence;
    const progress = canvasProgress(ms) * (PFX.canvas.length - 1), step = Math.min(PFX.canvas.length - 2, Math.floor(progress)), part = progress - step;
    const canvasScale = canvasWidth / PFX.canvas[0].width;
    lower.setTexture(PFX.canvas[step].texture).setPosition(rest.x, rest.y).setScale(canvasScale).setAlpha(placed);
    upper.setTexture(PFX.canvas[step + 1].texture).setPosition(rest.x, rest.y).setScale(canvasScale).setAlpha(placed * part);
    if (!this.reduced) this.lean = f * .035 * brushWork(ms);
    // Admiring it: a few stars twinkle around the finished painting.
    const admire = ms > EASEL.admire ? envelope((ms - EASEL.admire) / (EASEL.fade - EASEL.admire + 500), .2, .3) * presence : 0;
    const canvasHeight = PFX.canvas[0].height * canvasScale;
    twinkles.forEach((star, k) => {
      const angle = k / twinkles.length * Math.PI * 2 + ms / 900;
      star.setPosition(rest.x + Math.cos(angle) * canvasWidth * .62, rest.y - canvasHeight / 2 + Math.sin(angle) * canvasHeight * .7)
        .setScale(w * .2 / PFX.star.width * (.7 + .3 * Math.sin(ms / 180 + k))).setAlpha(admire).setRotation(ms / 600 + k);
    });
  }
  /** The club tail strikes at `SLAM.impact`: the ground cracks, a ring of dust spreads, stones fly and the meadow shakes a little. */
  private slam(ms: number, w: number, f: 1 | -1): void {
    const [crack, ring, ...rest] = this.pieces, puffs = rest.slice(0, 3), stones = rest.slice(3), t = ms - SLAM.impact;
    const strike = legendaryPartsForArt('ankylosaure', this.host.art).strike!, x = f * this.point(strike.x, strike.y).x;
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
  destroy(): void { this.clear(); for (const o of [this.part, this.mouth, this.glow, this.light, this.back, this.front, this.fx]) o?.destroy(); }
}
