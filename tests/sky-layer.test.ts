import skySource from '../src/display/skyLayer.ts?raw';
import type Phaser from 'phaser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {SkyLayer, skyClouds, SKY_TEXTURES} from '../src/display/skyLayer';

function setup(reduced = false) {
  const media = {matches: reduced};
  vi.stubGlobal('window', {matchMedia: () => media});
  const listeners: {event: string; fn: (...args: number[]) => void; context: unknown; once: boolean}[] = [];
  const events = {
    on(event: string, fn: (...args: number[]) => void, context: unknown) {listeners.push({event, fn, context, once: false});},
    once(event: string, fn: (...args: number[]) => void, context: unknown) {listeners.push({event, fn, context, once: true});},
    off(event: string, fn: (...args: number[]) => void, context: unknown) {
      for (let i = listeners.length - 1; i >= 0; i--) {
        const l = listeners[i]; if (l.event === event && l.fn === fn && l.context === context) listeners.splice(i, 1);
      }
    },
    emit(event: string, ...args: number[]) {
      for (const l of [...listeners].filter(l => l.event === event)) {
        if (l.once) events.off(l.event, l.fn, l.context);
        l.fn.apply(l.context, args);
      }
    },
  };
  class Image {
    x = 0; y = 0; scale = 1; width = 0; height = 0; depth = 0; alpha = 1;
    destroy = vi.fn();
    setScrollFactor = vi.fn(() => this);
    setPosition(x: number, y: number) {this.x = x; this.y = y; return this;}
    setScale(scale: number) {this.scale = scale; return this;}
    setDisplaySize(width: number, height: number) {this.width = width; this.height = height; return this;}
    setDepth(depth: number) {this.depth = depth; return this;}
    setAlpha(alpha: number) {this.alpha = alpha; return this;}
  }
  const images: Image[] = [], textures = new Map<string, {width: number; height: number}>();
  const context = {beginPath() {}, moveTo() {}, bezierCurveTo() {}, closePath() {}, fill() {}, fillRect() {},
    ellipse() {}, stroke() {}, createLinearGradient: () => ({addColorStop() {}})};
  const createCanvas = vi.fn((key: string, width: number, height: number) => {
    textures.set(key, {width, height}); return {context, refresh: vi.fn()};
  });
  const remove = vi.fn((key: string) => textures.delete(key));
  const camera = {width: 852, height: 393, zoom: .6, scrollX: 1000, scrollY: 800};
  const scene = {events, cameras: {main: camera}, textures: {createCanvas, remove},
    add: {image: () => {const image = new Image(); images.push(image); return image;}}};
  const layer = new SkyLayer(scene as unknown as Phaser.Scene, {x: 1200, y: 1000});
  const screen = (image: Image) => ({x: camera.width / 2 + (image.x - camera.width / 2) * camera.zoom,
    y: camera.height / 2 + (image.y - camera.height / 2) * camera.zoom});
  return {layer, media, events, images, textures, createCanvas, remove, camera, screen, listeners};
}
afterEach(() => vi.unstubAllGlobals());

describe('procedural sky', () => {
  it('repeats the same layout for a seed without using the gameplay random source', () => {
    expect(skyClouds(42)).toEqual(skyClouds(42));
    expect(skyClouds(42)).not.toEqual(skyClouds(43));
    expect(skySource).not.toMatch(/Math\s*\.\s*random/);
  });

  it('budgets 18 clouds, four reusable variants and less than 4 MiB of RGBA textures', () => {
    const s = setup();
    expect(s.images).toHaveLength(19); expect(s.textures.size).toBe(5);
    expect(new Set(skyClouds().map(c => c.variant)).size).toBe(SKY_TEXTURES.variants);
    const bytes = [...s.textures.values()].reduce((sum, t) => sum + t.width * t.height * 4, 0);
    expect(bytes).toBeLessThan(4 * 1024 * 1024);
    expect(s.images.every(i => i.depth < 0)).toBe(true);
    expect(s.images.slice(15).every(i => i.alpha <= .4)).toBe(true);
  });

  it('covers resized viewports at every zoom without allocating or painting more textures', () => {
    const s = setup(), background = s.images[0];
    for (const [width, height, zoom] of [[393, 852, .3], [1800, 900, 2], [852, 393, 1]]) {
      Object.assign(s.camera, {width, height, zoom, scrollX: -500, scrollY: 4000}); s.events.emit('prerender');
      expect(s.screen(background)).toEqual({x: width / 2, y: height / 2});
      expect(background.width * zoom).toBeGreaterThanOrEqual(width);
      expect(background.height * zoom).toBeGreaterThanOrEqual(height);
      s.images.slice(15).forEach((image, i) => {
        const x = s.screen(image).x;
        if (i % 2 === 0) expect(x).toBeLessThanOrEqual(width * .025 + 1e-8);
        else expect(x).toBeGreaterThanOrEqual(width * .975 - 1e-8);
      });
    }
    expect(s.createCanvas).toHaveBeenCalledTimes(5);
  });

  it('moves nearer clouds more than distant ones on pan, with no zoom jump', () => {
    const s = setup(), before = s.images.map(s.screen);
    s.camera.scrollX += 100; s.events.emit('prerender');
    const shifts = s.images.map((image, i) => Math.abs(s.screen(image).x - before[i].x));
    expect(shifts[16]).toBeGreaterThan(shifts[1]);
    const panned = s.images.map(s.screen);
    s.camera.zoom = 2; s.events.emit('prerender');
    s.images.forEach((image, i) => expect(s.screen(image).x).toBeCloseTo(panned[i].x, 8));
  });

  it('drifts slowly, freezes for reduced motion and resumes without a jump', () => {
    const s = setup(), image = s.images[1], start = s.screen(image).x;
    for (let i = 0; i < 20; i++) s.events.emit('preupdate', i * 50, 50);
    s.events.emit('prerender'); const moved = s.screen(image).x;
    expect(Math.abs(moved - start)).toBeGreaterThan(0); expect(Math.abs(moved - start)).toBeLessThan(.2);
    s.media.matches = true;
    for (let i = 0; i < 20; i++) s.events.emit('preupdate', i * 50, 50);
    s.events.emit('prerender'); expect(s.screen(image).x).toBe(moved);
    const reduced = setup(true), x = reduced.screen(reduced.images[1]).x;
    reduced.events.emit('preupdate', 0, 50); reduced.events.emit('prerender');
    expect(reduced.screen(reduced.images[1]).x).toBe(x);
  });

  it('removes all textures, objects and event handlers on shutdown, exactly once', () => {
    const s = setup(); s.events.emit('shutdown'); s.layer.destroy();
    expect(s.textures.size).toBe(0); expect(s.remove).toHaveBeenCalledTimes(5);
    s.images.forEach(image => expect(image.destroy).toHaveBeenCalledTimes(1));
    expect(s.listeners).toHaveLength(0);
  });
});
