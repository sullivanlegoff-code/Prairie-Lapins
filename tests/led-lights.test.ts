// @vitest-environment happy-dom
import type Phaser from 'phaser';
import {describe, expect, it, vi} from 'vitest';
type Box = {left: number; right: number; top: number; bottom: number};
vi.mock('phaser', () => ({default: {Geom: {Rectangle: {
  Overlaps: (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
  Union: (a: Box, b: Box, out: Box) => Object.assign(out, {left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom)}),
}}}}));
vi.mock('../src/display/winterLayer', () => ({LIGHTS_DEPTH: 2.86}));
import {LedLights} from '../src/display/ledLights';

// Owner (24 November 2026): Fusion Nucléaire's LEDs sit above the night shade, so they shone over a rabbit passing in front of
// it. They are now drawn into one picture, and every rabbit in front of a lit rabbit is erased from it.
const box = (x: number, y: number, w: number, h: number) => () => ({left: x, right: x + w, top: y, bottom: y + h});
function setup() {
  const layer = {width: 0, height: 0, camera: {setScroll: vi.fn(() => layer.camera), setZoom: vi.fn(() => layer.camera)}, draw: vi.fn(), erase: vi.fn(), clear: vi.fn(), destroy: vi.fn()} as Record<string, any>;
  for (const name of ['setOrigin', 'setScrollFactor', 'setDepth', 'setVisible', 'setPosition', 'setScale']) layer[name] = vi.fn(() => layer);
  const scene = {events: {once: vi.fn()}, cameras: {main: {width: 844, height: 390, zoom: 1, scrollX: 0, scrollY: 0}}, add: {renderTexture: vi.fn(() => { layer.width = 844; layer.height = 390; return layer; })}} as unknown as Phaser.Scene;
  const rabbit = (depth: number, x: number) => ({active: true, visible: true, alpha: 1, depth, getBounds: box(x - 20, 80, 40, 40)}) as unknown as Phaser.GameObjects.Container;
  const led = (x: number, visible = true) => ({visible, alpha: 1, getBounds: box(x - 4, 90, 8, 8)}) as unknown as Phaser.GameObjects.Image;
  return {lights: new LedLights(scene), layer, rabbit, led};
}

describe('Fusion Nucléaire LEDs and the rabbits in front of it', () => {
  it('erases only the rabbits in front of the lit rabbit over its LEDs, never one behind it, far away, nor itself', () => {
    const {lights, layer, rabbit, led} = setup();
    const fusion = rabbit(100, 100), front = rabbit(130, 110), behind = rabbit(60, 105), far = rabbit(200, 600);
    const leds = [led(90), led(110)];
    lights.update([{object: fusion, leds}], [fusion, front, behind, far]);
    expect(layer.draw).toHaveBeenCalledWith(leds);
    expect(layer.erase).toHaveBeenCalledWith([front]);
  });
  it('erases nothing when no rabbit stands in front', () => {
    const {lights, layer, rabbit, led} = setup();
    const fusion = rabbit(100, 100);
    lights.update([{object: fusion, leds: [led(100)]}], [fusion, rabbit(60, 100)]);
    expect(layer.draw).toHaveBeenCalledOnce(); expect(layer.erase).not.toHaveBeenCalled();
  });
  it('draws nothing by day (its LEDs hidden) and hides its picture', () => {
    const {lights, layer, rabbit, led} = setup();
    const fusion = rabbit(100, 100);
    lights.update([{object: fusion, leds: [led(100)]}], [fusion]);
    lights.update([{object: fusion, leds: [led(100, false)]}], [fusion, rabbit(130, 100)]);
    expect(layer.draw).toHaveBeenCalledOnce(); expect(layer.setVisible).toHaveBeenLastCalledWith(false);
  });
});
