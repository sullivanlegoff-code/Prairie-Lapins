import Phaser from 'phaser';
import {MAGICIEN_ART as ART, MAGICIEN_POSE_ART, POSE_CANVAS} from '../config/magicienArt';
import type {RabbitArt} from '../config/rabbitArt';
import type {MagicienAct, MagicienPose} from './magicienTimeline';
import {LEVITATION_LIFT, MagicienClock, SPELL_LIFT, TWINKLE_MS, magicienButterfly, magicienCircle, magicienFirework, magicienLevitation, magicienPose, magicienRune,
  magicienSmoke, magicienSparks, magicienSpell} from './magicienTimeline';

export interface MagicienHost {object: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; art: RabbitArt}
/** A friend resting in the same enclosure, who may be enchanted (the spell). */
export interface MagicienFriend {id: string; object: Phaser.GameObjects.Container; sprite?: Phaser.GameObjects.Image}
type Point = {x: number; y: number};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** The light violet of an enchantment, blended into a sprite's colours. */
const ENCHANTED = {r: 0xe4, g: 0xc8, b: 0xff};
const tintOf = (k: number) => ((Math.round(lerp(255, ENCHANTED.r, k)) << 16) | (Math.round(lerp(255, ENCHANTED.g, k)) << 8) | Math.round(lerp(255, ENCHANTED.b, k)));

/**
 * The evolved Magicien's shows on the meadow (src/display/magicienTimeline.ts says what each one does). Its sprite takes the painted
 * pose of the moment; the effects tied to his wand live in his body (mirrored and lifted with him), the circle in a layer under it
 * on the ground, the spell's flight in his container and the enchantment in the friend's.
 */
export class MagicienView {
  get busy(): boolean { return this.clock.act !== null; }
  /** How high he floats (scene units), the painted pose shown (or null), and where he faces during a spell (or null). */
  lift = 0;
  posing: MagicienPose | null = null;
  facing: 1 | -1 | null = null;
  /** The enchanted friend and how high it floats (scene units), during a spell. */
  enchanted: {id: string; lift: number} | null = null;
  private playing: MagicienAct | null = null;
  private floor: Phaser.GameObjects.Container;
  private parts: Phaser.GameObjects.Image[] = [];
  private named = new Map<string, Phaser.GameObjects.Image>();
  private friend: MagicienFriend | null = null;
  private friendParts: Phaser.GameObjects.Image[] = [];
  private rings: Phaser.GameObjects.Container[] = [];
  private idle?: Phaser.GameObjects.Image;
  private readonly shadow: {x: number; y: number; scaleX: number; scaleY: number; alpha: number};
  private readonly px: number;

  constructor(private scene: Phaser.Scene, readonly id: string, private host: MagicienHost, readonly clock: MagicienClock) {
    this.floor = scene.add.container(0, 0); host.object.addAt(this.floor, 0);
    this.shadow = {x: host.shadow.x, y: host.shadow.y, scaleX: host.shadow.scaleX, scaleY: host.shadow.scaleY, alpha: host.shadow.alpha};
    this.px = host.art.worldWidth / host.art.width;
  }
  /** The laboratory's buttons: a trick now (a spell only with a friend nearby). */
  play(act: MagicienAct, friend: MagicienFriend | null = null): void { if (this.clock.play(act, !!friend)) this.friend = act === 'spell' ? friend : null; }

  /** A point of the usual drawing, or of a pose's canvas, in the body's space. */
  private drawn(p: Point, pose: MagicienPose | null): Point {
    const {art} = this.host, w = pose ? POSE_CANVAS.width : art.width, h = pose ? POSE_CANVAS.height : art.height;
    return {x: (p.x - w / 2) * this.px, y: art.groundY - (h - p.y) * this.px};
  }
  private tip(pose: MagicienPose | null): Point { return this.drawn(pose ? MAGICIEN_POSE_ART[pose].tip : ART.wandTip, pose); }
  /** A point of the body's space in the container's (the body's mirror and lift, not its small squash). */
  private outOfBody(p: Point): Point { const b = this.host.body; return {x: b.x + p.x * b.scaleX, y: b.y + p.y * b.scaleY}; }
  private image(art: {texture: string; width: number}, size: number, into: Phaser.GameObjects.Container, name?: string): Phaser.GameObjects.Image {
    const image = this.scene.add.image(0, 0, art.texture).setScale(size / art.width).setAlpha(0);
    into.add(image); this.parts.push(image); if (name) this.named.set(name, image); return image;
  }

  /**
   * One frame. `active`: he may start a trick (resting, seen, nothing else to do); `friend`: the friend a spell would enchant.
   * Returns nothing; read `lift`, `posing`, `facing` and `enchanted`.
   */
  update(dt: number, active: boolean, reduced: boolean, friend: MagicienFriend | null = null): void {
    const started = this.clock.step(dt, active && this.host.art.evolved === true, reduced, !!friend);
    if (started?.act === 'spell') this.friend = friend;
    const act = this.clock.act;
    if (act?.act !== this.playing) {
      // The clean-up of the last trick forgets its friend: the spell's friend, chosen as it starts, is kept.
      const chosen = act?.act === 'spell' ? this.friend : null;
      this.clear(); this.friend = chosen; this.playing = act?.act ?? null; if (act) this.build(act.act);
    }
    this.updateIdle(reduced);
    const w = this.host.art.worldWidth;
    // The pose of the moment: the sprite changes texture (same origin and scale), its painted eyelids and nose are hidden.
    const pose = act ? magicienPose(act.act, act.elapsed) : null;
    const texture = pose ? MAGICIEN_POSE_ART[pose].texture : this.host.art.texture;
    if (this.host.sprite.texture.key !== texture && this.scene.textures.exists(texture)) this.host.sprite.setTexture(texture);
    this.posing = pose && this.host.sprite.texture.key === texture ? pose : null;
    const lev = act ? magicienLevitation(act.act, act.elapsed) : 0;
    this.lift = LEVITATION_LIFT * lev;
    this.host.shadow.setPosition(this.shadow.x, this.shadow.y).setScale(this.shadow.scaleX * (1 - .3 * lev), this.shadow.scaleY * (1 - .25 * lev)).setAlpha(this.shadow.alpha * (1 - .3 * lev));
    this.facing = null; this.enchanted = null;
    if (!act) return;
    const t = act.elapsed, tip = this.tip(this.posing);
    // The circle on the ground (circle trick, faintly under the levitation), and the runes rising from its edge.
    const circle = this.named.get('circle');
    if (circle) {
      const c = magicienCircle(act.act, t), width = w * 1.45 * c.size;
      // It turns flat on the ground: the drawing turns inside a ring squashed into perspective.
      circle.setScale(width / ART.circle.width).setRotation(c.turn).setAlpha(c.alpha);
      this.parts.filter(p => p.getData('rune') !== undefined).forEach(rune => {
        const r = magicienRune(t, rune.getData('rune'), 5);
        rune.setPosition(Math.cos(r.angle) * width / 2, this.shadow.y + Math.sin(r.angle) * width * .17 - r.rise).setAlpha(r.alpha).setRotation(t / 300);
      });
      this.host.sprite.setTint(tintOf(act.act === 'circle' ? .5 * c.alpha : .35 * lev));
    }
    if (act.act === 'sparks') this.parts.forEach((star, i) => {
      const p = magicienSparks(t, i, this.parts.length);
      star.setPosition(tip.x + p.x, tip.y + p.y).setAlpha(p.alpha).setScale(star.getData('size') * p.scale).setRotation(i * .8 + t / 400);
    });
    if (act.act === 'levitation') this.parts.filter(p => p.getData('dust') !== undefined).forEach(dust => {
      const k = dust.getData('dust') as number, u = ((t / 900) + k / 4) % 1;
      dust.setPosition(Math.sin(k * 2.1 + t / 500) * w * .3, this.host.art.groundY - this.lift + 4 + u * 10).setAlpha(lev * Math.sin(Math.PI * u)).setRotation(t / 250);
    });
    if (act.act === 'firework') {
      // It bursts just above his hat, where the zoomed-in camera still sees it.
      const f = magicienFirework(t), apex = {x: tip.x - w * .1, y: tip.y - w * .38};
      const ribbon = this.named.get('ribbon');
      ribbon?.setPosition(tip.x, tip.y).setRotation(t / 120).setAlpha(this.posing === 'twirl' ? .9 : 0);
      this.named.get('comet')?.setPosition(lerp(tip.x, apex.x, f.comet), lerp(tip.y, apex.y, f.comet)).setRotation(-.25).setAlpha(f.cometAlpha);
      const burst = this.named.get('burst');
      burst?.setPosition(apex.x, apex.y).setScale(w * 1.3 / ART.firework.width * f.burst).setAlpha(f.burstAlpha);
      this.parts.filter(p => p.getData('rain') !== undefined).forEach(star => {
        const k = star.getData('rain') as number, angle = -Math.PI / 2 + (k - 2.5) * .55;
        star.setPosition(apex.x + Math.cos(angle) * w * .55 * Math.min(1, f.rain * 2.2), apex.y + Math.sin(angle) * w * .35 + f.rain * f.rain * w * 1.1)
          .setAlpha(f.rain <= 0 ? 0 : 1 - f.rain).setRotation(t / 200 + k);
      });
    }
    if (act.act === 'butterflies') {
      const s = magicienSmoke(t), puff = {x: w * .62, y: this.host.art.groundY - w * .12};
      this.named.get('smoke')?.setPosition(puff.x, puff.y).setScale(w * .7 / ART.smoke.width * s.size).setAlpha(s.alpha);
      this.parts.filter(p => p.getData('wing') !== undefined).forEach(wing => {
        const [index, open] = wing.getData('wing') as [number, boolean], b = magicienButterfly(t, index);
        const x = puff.x + (index - 1.5) * w * .32 * b.u + w * .35 * b.u + Math.sin(t / 260 + index) * 4 * b.u, y = puff.y - w * 1.4 * b.u - Math.sin(Math.PI * b.u) * 6;
        wing.setPosition(x, y).setAlpha(b.open === open ? b.alpha : 0).setRotation(Math.sin(t / 300 + index) * .3);
      });
    }
    if (act.act === 'spell' && this.friend) this.cast(t, tip);
  }

  /** The spell: he faces the friend, a trail of twinkles flies from his wand to it, and it glows and floats among twinkles. */
  private cast(t: number, tip: Point): void {
    const friend = this.friend!, o = this.host.object, spell = magicienSpell(t);
    if (!friend.object.active) { this.friend = null; return; }
    const dx = (friend.object.x - o.x) / o.scaleX, dy = (friend.object.y - o.y) / o.scaleY;
    this.facing = dx >= 0 ? 1 : -1;
    const head = {x: dx, y: dy - (friend.sprite ? friend.sprite.displayHeight * .55 : 20) - SPELL_LIFT * spell.friend};
    const from = this.outOfBody(tip);
    this.parts.filter(p => p.getData('trail') !== undefined).forEach(dot => {
      const k = dot.getData('trail') as number, u = Math.max(0, Math.min(1, spell.flight * 1.25 - k * .05));
      dot.setPosition(lerp(from.x, head.x, u), lerp(from.y, head.y, u) - Math.sin(Math.PI * u) * 18).setAlpha(spell.flightAlpha * (u > 0 && u < 1 ? 1 : 0)).setRotation(t / 150 + k);
    });
    this.enchanted = {id: friend.id, lift: SPELL_LIFT * spell.friend};
    friend.sprite?.setTint(tintOf(.55 * spell.friend));
    const height = friend.sprite ? friend.sprite.displayHeight : 30;
    this.friendParts.forEach((twinkle, k) => {
      const angle = t / 420 + k * Math.PI * 2 / this.friendParts.length;
      twinkle.setPosition(Math.cos(angle) * height * .55, -height * .45 - SPELL_LIFT * spell.friend + Math.sin(angle) * height * .2 - Math.sin(t / 300 + k) * 3)
        .setAlpha(spell.friend).setRotation(t / 200 + k);
    });
  }

  /** Between tricks, now and then a twinkle at the tip of his wand. */
  private updateIdle(reduced: boolean): void {
    const k = this.clock.twinkle;
    if (k < 0 || reduced || this.clock.act) { this.idle?.setVisible(false); return; }
    if (!this.idle) {
      if (!this.scene.textures.exists(ART.twinkle.texture)) return;
      this.idle = this.scene.add.image(0, 0, ART.twinkle.texture); this.host.body.add(this.idle);
    }
    const tip = this.tip(null), u = k / TWINKLE_MS, size = this.host.art.worldWidth * .2 * Math.sin(Math.PI * u);
    this.idle.setVisible(true).setPosition(tip.x, tip.y).setScale(Math.max(.001, size / ART.twinkle.width)).setRotation(u * 1.2).setAlpha(1);
  }

  private build(act: MagicienAct): void {
    const w = this.host.art.worldWidth, body = this.host.body, o = this.host.object;
    const has = (art: {texture: string}) => this.scene.textures.exists(art.texture);
    if ((act === 'circle' || act === 'levitation') && has(ART.circle)) {
      const ring = this.scene.add.container(0, this.shadow.y).setScale(1, .34); this.floor.add(ring); this.rings.push(ring);
      this.image(ART.circle, w, ring, 'circle');
      if (act === 'circle' && has(ART.twinkle)) for (let i = 0; i < 5; i++) this.image(ART.twinkle, w * .16, this.floor).setData('rune', i);
    }
    if (act === 'sparks') for (let i = 0; i < 10; i++) {
      const art = i % 2 && has(ART.twinkle) ? ART.twinkle : ART.star, size = w * (art === ART.star ? .17 : .14);
      if (has(art)) this.image(art, size, body).setData('size', size / art.width);
    }
    if (act === 'levitation' && has(ART.twinkle)) for (let i = 0; i < 4; i++) this.image(ART.twinkle, w * .12, body).setData('dust', i);
    if (act === 'firework') {
      if (has(ART.ribbon)) this.image(ART.ribbon, w * .45, body, 'ribbon');
      if (has(ART.comet)) this.image(ART.comet, w * .3, body, 'comet');
      if (has(ART.firework)) this.image(ART.firework, w * 1.3, body, 'burst');
      if (has(ART.star)) for (let i = 0; i < 6; i++) this.image(ART.star, w * .13, body).setData('rain', i);
    }
    if (act === 'butterflies') {
      if (has(ART.smoke)) this.image(ART.smoke, w * .7, body, 'smoke');
      if (has(ART.butterflyOpen) && has(ART.butterflyClosed)) for (let i = 0; i < 4; i++) {
        this.image(ART.butterflyOpen, w * .26, body).setData('wing', [i, true]);
        this.image(ART.butterflyClosed, w * .12, body).setData('wing', [i, false]);
      }
    }
    if (act === 'spell' && this.friend) {
      if (has(ART.twinkle)) for (let i = 0; i < 7; i++) this.image(i % 3 === 1 && has(ART.star) ? ART.star : ART.twinkle, w * .15, o).setData('trail', i);
      if (has(ART.twinkle)) for (let i = 0; i < 5; i++) {
        const art = i % 2 && has(ART.star) ? ART.star : ART.twinkle, twinkle = this.scene.add.image(0, 0, art.texture).setScale(w * .13 / art.width).setAlpha(0);
        this.friend.object.add(twinkle); this.friendParts.push(twinkle);
      }
    }
  }
  private clear(): void {
    for (const part of [...this.parts, ...this.friendParts, ...this.rings]) part.destroy();
    this.parts = []; this.friendParts = []; this.rings = []; this.named.clear();
    this.friend?.sprite?.active && this.friend.sprite.clearTint();
    this.host.sprite.clearTint();
    if (this.host.sprite.texture.key !== this.host.art.texture && this.scene.textures.exists(this.host.art.texture)) this.host.sprite.setTexture(this.host.art.texture);
    this.friend = null; this.lift = 0; this.posing = null; this.facing = null; this.enchanted = null;
  }
  destroy(): void {
    this.clear(); this.idle?.destroy(); this.floor.destroy();
    this.host.shadow.setPosition(this.shadow.x, this.shadow.y).setScale(this.shadow.scaleX, this.shadow.scaleY).setAlpha(this.shadow.alpha);
  }
}
