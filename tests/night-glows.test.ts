// @vitest-environment happy-dom
import type Phaser from 'phaser';
import {describe, expect, it, vi} from 'vitest';
vi.mock('phaser', () => ({default: {BlendModes: {ADD: 1}, Geom: {Rectangle: {Overlaps: (a: {left: number; right: number; top: number; bottom: number}, b: typeof a) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top}}}}));
import {NightGlows} from '../src/display/nightGlows';

// iPhone, 8 November 2026: the window glows were drawn over the rabbits standing in front of the house. They are now drawn into
// one picture, and every rabbit over a lit picture is erased from it.
function stub(bounds: {x: number; y: number; w: number; h: number}) {
  const self: Record<string, unknown> = {x: 0, y: 0, depth: 0, mask: null, texture: {key: ''}, destroy: vi.fn()};
  for (const name of ['setBlendMode', 'setOrigin', 'setScale', 'setFlipX', 'setAlpha', 'setTexture']) self[name] = vi.fn(() => self);
  self.setPosition = vi.fn((x: number, y: number) => { self.x = x; self.y = y; return self; });
  self.getBounds = () => ({left: bounds.x, right: bounds.x + bounds.w, top: bounds.y, bottom: bounds.y + bounds.h, x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h});
  return self;
}
function setup() {
  const layer = {width: 0, height: 0, camera: {setScroll: vi.fn(() => layer.camera), setZoom: vi.fn(() => layer.camera)}, draw: vi.fn(), erase: vi.fn(), clear: vi.fn(), destroy: vi.fn()} as Record<string, any>;
  for (const name of ['setOrigin', 'setScrollFactor', 'setDepth', 'setBlendMode', 'setVisible', 'setPosition', 'setScale']) layer[name] = vi.fn(() => layer);
  layer.setSize = vi.fn((w: number, h: number) => { layer.width = w; layer.height = h; return layer; });
  const scene = {events: {once: vi.fn()}, textures: {exists: () => false}, cameras: {main: {width: 844, height: 390, zoom: 1, scrollX: 0, scrollY: 0}},
    make: {image: vi.fn(() => stub({x: 0, y: 0, w: 200, h: 150}))}, add: {renderTexture: vi.fn(() => layer)}} as unknown as Phaser.Scene;
  const glows = new NightGlows(scene, () => true);
  const house = {active: true, visible: true, alpha: 1, depth: 1, x: 100, y: 75, originX: .5, originY: .5, scaleX: 1, scaleY: 1, flipX: false, texture: {key: 'h'}} as unknown as Phaser.GameObjects.Image;
  const rabbit = (depth: number, x: number) => ({active: true, visible: true, alpha: 1, depth, x, y: 100, getBounds: () => ({left: x - 20, right: x + 20, top: 80, bottom: 120, x: x - 20, y: 80, width: 40, height: 40})}) as unknown as Phaser.GameObjects.Container;
  return {glows, layer, house, rabbit};
}
const url = 'https://x/assets/noel/buildings/farm-level-1.png';
describe('the Christmas night glows and the rabbits', () => {
  // Owner (8 November 2026): the light of an enclosure was drawn over a rabbit standing in front of it. The rabbits' layer is
  // above every building and decoration, so a rabbit over a lit picture is in front of it whatever its depth inside its layer.
  it('erases every rabbit over a lit house from the glows, whatever its depth in its own layer, never one far away', () => {
    const {glows, layer, house, rabbit} = setup();
    const front = rabbit(2, 100), lowDepth = rabbit(.5, 120), far = rabbit(2, 900);
    glows.update(1, [{image: house, url}], [front, lowDepth, far]);
    expect(layer.draw).toHaveBeenCalledOnce();
    expect(layer.erase).toHaveBeenCalledWith([front, lowDepth]);
  });
  it('draws nothing and erases nothing by day', () => {
    const {glows, layer, house, rabbit} = setup();
    glows.update(0, [{image: house, url}], [rabbit(2, 100)]);
    expect(layer.draw).not.toHaveBeenCalled(); expect(layer.erase).not.toHaveBeenCalled();
  });
});
