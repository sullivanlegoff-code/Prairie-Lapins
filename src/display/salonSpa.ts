import Phaser from 'phaser';
import type {CareKind} from '../config/balance';
import {BENNY_FLIGHT_EFFECTS} from '../config/bennyFlightArt';
import {salonScale} from '../config/habitatSizes';
import {artForRabbit, type RabbitArt} from '../config/rabbitArt';
import {rabbitBlinkArt, rabbitPatchPlacement} from '../config/rabbitBlinkArt';
import {SALON_ART, SPA_PIECES} from '../config/salonArt';
import {VISUAL} from '../config/visual';
import {buildingCenter} from '../ui/gestures';
import {toScreen} from '../ui/projection';
import type {Building, GameState} from '../state/types';
import {GLOW_MS, glowStrength, spaLayout, waterLine, type SpaLayout} from './salonSpaLayout';

/** Pictures the spa needs once a salon stands on the island (the rabbits' own pictures are loaded with the residents). */
export const salonSpaArt = (): {texture: string; url: string}[] => [SALON_ART.tub, ...Object.values(SPA_PIECES), BENNY_FLIGHT_EFFECTS.glow, BENNY_FLIGHT_EFFECTS.twinkle, BENNY_FLIGHT_EFFECTS.star];
/** A soft white puff for the massage's steam, drawn once. */
const STEAM_TEXTURE = 'spa-steam';
function steamTexture(scene: Phaser.Scene): string {
  if (!scene.textures.exists(STEAM_TEXTURE)) {
    const size = 64, canvas = scene.textures.createCanvas(STEAM_TEXTURE, size, size)!, g = canvas.getContext();
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,.85)'); gradient.addColorStop(.6, 'rgba(255,255,255,.3)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gradient; g.fillRect(0, 0, size, size); canvas.refresh();
  }
  return STEAM_TEXTURE;
}
/** One small piece that loops over `period` ms from its phase: bubbles, tufts of fur, steam, hearts. */
interface Drift {image: Phaser.GameObjects.Image; phase: number; period: number; from: {x: number; y: number}; rise: number; sway: number; size: number}
interface CareView {
  key: string; care: CareKind; rabbitId: string; layer: Phaser.GameObjects.Container; rabbit: Phaser.GameObjects.Container; layout: SpaLayout;
  brush?: Phaser.GameObjects.Image; brushAt?: {x: number; y: number}; drifts: Drift[];
}
interface GlowView {until: number; layer: Phaser.GameObjects.Container; halo: Phaser.GameObjects.Image; stars: Phaser.GameObjects.Image[]}

/**
 * The Salon de soins at work in the meadow (owner, 10 November 2026): the rabbit in care sits in its corner of the spa, in the
 * tub up to its chest under a crown of foam with bubbles rising (bath), on the stool under a brush that combs its back with tufts
 * of fur flying (brush), or lying on the massage table under a towel, a turban on its head, cucumber slices on its eyes and steam
 * rising (massage). Its eyes are closed and little hearts float up. A rabbit welcomed back shines in its enclosure for a while.
 * Everything is presentation: nothing here is saved, nothing changes the game.
 */
export class SalonSpaView {
  private readonly layer: Phaser.GameObjects.Container;
  private view: CareView | null = null;
  private glows = new Map<string, GlowView>();
  /** The rabbit that was at the salon in the last state seen, and whether its care was over. */
  private last: {rabbitId: string; ready: boolean} | null = null;
  constructor(private readonly scene: Phaser.Scene) {
    // Above the residents (depth 2), below the bubbles (3) and the night's lights.
    this.layer = scene.add.container(0, 0).setDepth(2.05);
  }
  /** Rebuilds the rabbit in care when the salon, the rabbit, its care or its picture changes; notices a rabbit welcomed back. */
  sync(state: GameState | null, now: number): void {
    const care = state?.care, salon = state?.buildings.find(b => b.kind === 'salon');
    // A rabbit that leaves the salon after its care, and is still on the island, shines in its enclosure.
    if (this.last && this.last.ready && care?.rabbitId !== this.last.rabbitId && state?.rabbits.some(r => r.id === this.last!.rabbitId)) this.welcome(this.last.rabbitId, now);
    this.last = care ? {rabbitId: care.rabbitId, ready: care.endsAt <= now} : null;
    const rabbit = care && salon ? state!.rabbits.find(r => r.id === care.rabbitId) : undefined, art = rabbit ? artForRabbit(rabbit) : undefined;
    const ready = !!art && [art.texture, SALON_ART.tub.texture, ...Object.values(SPA_PIECES).map(p => p.texture)].every(t => this.scene.textures.exists(t));
    const key = ready ? JSON.stringify([salon!.id, salon!.x, salon!.y, salon!.formerFootprint ?? 0, rabbit!.id, care!.care, art!.texture]) : '';
    if (key === (this.view?.key ?? '')) return;
    this.view?.layer.destroy(); this.view = null;
    if (ready) this.view = this.build(key, salon!, rabbit!.id, care!.care, art!, rabbit!.species === art!.species && !!art!.evolved);
  }
  private build(key: string, salon: Building, rabbitId: string, care: CareKind, art: RabbitArt, evolved: boolean): CareView {
    const scene = this.scene, k = salonScale(salon), c = toScreen(buildingCenter(salon)), s = SALON_ART.worldWidth / SALON_ART.width * k;
    const point = (f: {x: number; y: number}) => ({x: c.x + (f.x - .5) * SALON_ART.width * s, y: c.y + (f.y - SALON_ART.originY) * SALON_ART.height * s});
    const station = point(SALON_ART.stations[care]), size = VISUAL.rabbit.scale * SALON_ART.rabbitScale * SALON_ART.careScale[care] * k, layout = spaLayout(art, care);
    const layer = scene.add.container(0, 0); this.layer.add(layer);
    // The rabbit's body: its picture (mirrored to look towards the spa's middle) with its eyes closed, then the spa's pieces.
    const picture = scene.add.container(0, 0).setScale(layout.flip, 1);
    const sprite = scene.add.image(0, art.groundY, art.texture).setOrigin(.5, 1).setScale(art.worldWidth / art.width);
    if (layout.keep < 1) sprite.setCrop(0, 0, art.width, Math.round(art.height * layout.keep));
    picture.add(sprite);
    const eyes = rabbitBlinkArt(art.species, evolved)?.patches.find(p => p.kind === 'eyes-closed');
    if (eyes && scene.textures.exists(eyes.texture)) { const at = rabbitPatchPlacement(art, eyes); picture.add(scene.add.image(at.x, at.y, eyes.texture).setOrigin(0, 0).setScale(at.scale)); }
    const rabbit = scene.add.container(0, 0, [picture]).setScale(size);
    const piece = (p: {texture: string; size: number}, x: number, y: number, width: number, originY = .5) => scene.add.image(x, y, p.texture).setOrigin(.5, originY).setScale(width / p.size);
    const drifts: Drift[] = [];
    const drift = (texture: string, count: number, period: number, from: (i: number) => {x: number; y: number}, rise: number, sway: number, size: number) => {
      for (let i = 0; i < count; i++) {
        const image = scene.add.image(0, 0, texture).setVisible(false); rabbit.add(image);
        drifts.push({image, phase: i / count, period, from: from(i), rise, sway, size});
      }
    };
    const view: CareView = {key, care, rabbitId, layer, rabbit, layout, drifts};
    const head = layout.head, w = layout.width;
    if (care === 'bath') {
      // The water line sits on the tub's water: the body below it is cut away, the tub's front is drawn over it.
      const line = waterLine(art, layout);
      rabbit.setPosition(station.x, station.y - line * size);
      // A thin ring of foam on the water around the body, a small crown of shampoo on the skull: the face stays in sight.
      const ring = piece(SPA_PIECES.foam, layout.chest.x * .3, line + 3, w * 1.1, .6); rabbit.add(ring.setScale(ring.scaleX, ring.scaleY * .38));
      rabbit.add(piece(SPA_PIECES.foam, head.x, head.y + 2, Math.max(head.w * 1.25, w * .32), .85).setAngle(head.angle));
      drift(SPA_PIECES.bubble.texture, 7, 2600, i => ({x: (i % 2 ? 1 : -1) * w * (.18 + (i * .13) % .35), y: line - 2}), 34, 5, 9);
      layer.add(rabbit);
      layer.add(scene.add.image(c.x, c.y, SALON_ART.tub.texture).setOrigin(.5, SALON_ART.originY).setScale(s));
    } else if (care === 'brush') {
      rabbit.setPosition(station.x, station.y - art.groundY * size);
      // The brush combs the back, behind the head (the rabbit looks right, so its back is on the left).
      view.brushAt = {x: layout.chest.x - w * .48, y: layout.chest.y + (layout.chest.y - head.y) * .25};
      view.brush = piece(SPA_PIECES.brush, view.brushAt.x, view.brushAt.y, w * .5).setAngle(-25);
      rabbit.add(view.brush);
      drift(SPA_PIECES.tuft.texture, 5, 2200, () => ({x: view.brushAt!.x, y: view.brushAt!.y}), 22, 12, 7);
      layer.add(rabbit);
    } else {
      rabbit.setPosition(station.x, station.y - art.groundY * size);
      // A towel over its lap, below the chest: the face, the turban and the cucumbers stay in sight.
      const towel = piece(SPA_PIECES.blanket, layout.chest.x * .4, layout.chest.y + 2, w * .95, 0); rabbit.add(towel.setScale(towel.scaleX, towel.scaleY * .6));
      rabbit.add(piece(SPA_PIECES.turban, head.x, head.y + 4, Math.max(head.w * 1.6, w * .42), .8).setAngle(head.angle));
      const slice = Math.max(4, layout.eyes.w * .42), gap = layout.eyes.w * .22;
      for (const dx of [-gap, gap]) rabbit.add(piece(SPA_PIECES.cucumber, layout.eyes.x + dx, layout.eyes.y, slice));
      drift(steamTexture(scene), 5, 3600, i => ({x: (i - 2) * w * .18, y: layout.chest.y}), 40, 6, 16);
      layer.add(rabbit);
    }
    // Little hearts above the head, for every care.
    drift(SPA_PIECES.heart.texture, 2, 3400, i => ({x: head.x + (i ? 6 : -6), y: head.y - 6}), 26, 3, 7);
    return view;
  }
  /** The rabbit welcomed back shines for GLOW_MS (presentation only). */
  welcome(rabbitId: string, now: number): void {
    this.glows.get(rabbitId)?.layer.destroy();
    const scene = this.scene, ok = [BENNY_FLIGHT_EFFECTS.glow, BENNY_FLIGHT_EFFECTS.twinkle, BENNY_FLIGHT_EFFECTS.star].every(e => scene.textures.exists(e.texture));
    if (!ok) return;
    const halo = scene.add.image(0, 0, BENNY_FLIGHT_EFFECTS.glow.texture).setBlendMode(Phaser.BlendModes.ADD).setScale(.42);
    const stars = Array.from({length: 6}, (_, i) => scene.add.image(0, 0, (i % 2 ? BENNY_FLIGHT_EFFECTS.twinkle : BENNY_FLIGHT_EFFECTS.star).texture).setBlendMode(Phaser.BlendModes.ADD).setScale(.22));
    const layer = scene.add.container(0, 0, [halo, ...stars]).setVisible(false); this.layer.add(layer);
    this.glows.set(rabbitId, {until: now + GLOW_MS, layer, halo, stars});
  }
  glowing(rabbitId: string): boolean { return this.glows.has(rabbitId); }
  /** Every frame: the care's little movements, and the glows following their rabbits (`rabbits`: the residents drawn now). */
  update(time: number, now: number, reduced: boolean, rabbits: readonly {id: string; object: Phaser.GameObjects.Container}[]): void {
    const v = this.view;
    if (v) {
      const breathe = reduced ? 0 : Math.sin(time / 900) * .012;
      v.rabbit.setScale(Math.abs(v.rabbit.scaleX), Math.abs(v.rabbit.scaleX) * (1 + breathe));
      if (v.brush && v.brushAt) {
        const t = reduced ? 0 : Math.sin(time / 260);
        v.brush.setPosition(v.brushAt.x + t * 2, v.brushAt.y + t * v.layout.height * .12).setAngle(-25 + t * 14);
      }
      for (const d of v.drifts) {
        if (reduced) { d.image.setVisible(false); continue; }
        const p = ((time / d.period) + d.phase) % 1;
        d.image.setVisible(true).setPosition(d.from.x + Math.sin((p + d.phase) * Math.PI * 2) * d.sway, d.from.y - p * d.rise)
          .setScale((d.size / Math.max(1, d.image.width)) * (.6 + p * .6)).setAlpha(p < .15 ? p / .15 : 1 - (p - .15) / .85);
      }
    }
    for (const [id, g] of this.glows) {
      const strength = glowStrength(g.until, now), view = rabbits.find(r => r.id === id);
      if (strength <= 0) { g.layer.destroy(); this.glows.delete(id); continue; }
      g.layer.setVisible(!!view);
      if (!view) continue;
      const pulse = reduced ? .5 : .5 + .5 * Math.sin(time / 420);
      g.layer.setPosition(view.object.x, view.object.y - 22);
      g.halo.setAlpha(strength * (.35 + .25 * pulse));
      g.stars.forEach((star, i) => {
        const a = (i / g.stars.length) * Math.PI * 2 + (reduced ? 0 : time / 1600), twinkle = reduced ? .7 : .5 + .5 * Math.sin(time / 300 + i * 1.7);
        star.setPosition(Math.cos(a) * 26, Math.sin(a) * 16).setAlpha(strength * twinkle).setScale(.14 + .1 * twinkle);
      });
    }
  }
  destroy(): void { this.view?.layer.destroy(); this.view = null; for (const g of this.glows.values()) g.layer.destroy(); this.glows.clear(); this.layer.destroy(); }
}
