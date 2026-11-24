import {describe, expect, it} from 'vitest';
import {TextureBudget, budgetWidth, shrinkAtlas, shrinkSize, type AtlasData, type BudgetTextures} from '../src/display/textureBudget';
import {RABBIT_ART, rabbitArt} from '../src/config/rabbitArt';
import bennyAtlas from '../public/assets/rabbits/benny/frames/benny-frames.json';
import {FARM_ART, FARM_LEVEL_3_ART} from '../src/config/farmArt';
import {NEST_ART} from '../src/config/nestArt';
import {NURSERY_ART} from '../src/config/nurseryArt';
import {KITCHEN_ART} from '../src/config/kitchenArt';
import {EPIC_ISLET_ART} from '../src/config/epicIsletArt';
import {VISUAL} from '../src/config/visual';

/** Phaser's texture manager, reduced to what the budget uses: textures are plain sized sources. */
function fakeTextures() {
  const map = new Map<string, {source: {width: number; height: number}; customData: Record<string, unknown>}>();
  const textures: BudgetTextures & {load(key: string, width: number, height: number): void; size(key: string): {width: number; height: number} | undefined; images: string[]; atlases: Map<string, {source: {width: number; height: number}; data: object}>} = {
    images: [],
    exists: key => map.has(key),
    get: key => map.get(key)!,
    remove: key => map.delete(key),
    addImage(key, source) { this.images.push(key); const t = {source, customData: {}}; map.set(key, t); return t; },
    addCanvas: (key, canvas) => { const t = {source: canvas, customData: {}}; map.set(key, t); return t; },
    atlases: new Map<string, {source: {width: number; height: number}; data: object}>(),
    addAtlas(key, source, data) { const t = {source, customData: {}}; map.set(key, t); this.atlases.set(key, {source, data}); return t; },
    // What Phaser's loader does with a decoded picture.
    load(key, width, height) { this.addImage(key, {width, height} as HTMLImageElement); },
    size: key => map.get(key)?.source,
  };
  return textures;
}
/** A canvas whose drawing is recorded (happy-dom draws nothing). */
const fakeCanvas = (drawn: number[][]) => () => {
  const canvas = {width: 0, height: 0, getContext: () => ({imageSmoothingEnabled: false, imageSmoothingQuality: 'low', drawImage: (_s: unknown, ...args: number[]) => drawn.push(args)})};
  return canvas as unknown as HTMLCanvasElement;
};

describe('meadow pictures kept at twice their largest size on screen (plan 5.1)', () => {
  it('gives each large building picture a budget of twice its width at the closest zoom', () => {
    expect(VISUAL.camera.maxZoom).toBe(2.2);
    // The farm: 156 world units, 343 px on screen at the closest zoom, so 687 px instead of 1254.
    expect(budgetWidth(FARM_ART.worldWidth)).toBe(687);
    expect(shrinkSize(FARM_ART.width, FARM_ART.height, budgetWidth(FARM_ART.worldWidth))).toEqual({width: 687, height: 687, ratio: 1254 / 687});
    expect(shrinkSize(NEST_ART.width, NEST_ART.height, budgetWidth(NEST_ART.worldWidth))?.width).toBe(792);
    expect(shrinkSize(NURSERY_ART.width, NURSERY_ART.height, budgetWidth(NURSERY_ART.worldWidth))?.width).toBe(740);
    expect(shrinkSize(FARM_LEVEL_3_ART.width, FARM_LEVEL_3_ART.height, budgetWidth(FARM_LEVEL_3_ART.worldWidth))).toEqual({width: 860, height: 645, ratio: 1448 / 860});
    // Pictures already within their budget are kept as they are.
    expect(shrinkSize(KITCHEN_ART.width, KITCHEN_ART.height, budgetWidth(KITCHEN_ART.worldWidth))).toBeNull();
    expect(shrinkSize(EPIC_ISLET_ART.width, EPIC_ISLET_ART.height, budgetWidth(EPIC_ISLET_ART.worldWidth))).toBeNull();
  });
  it('replaces a listed texture by a smaller copy on arrival, with a ratio that keeps its size in the world', () => {
    const textures = fakeTextures(), drawn: number[][] = [], budget = new TextureBudget(textures, fakeCanvas(drawn));
    budget.want(FARM_ART.texture, FARM_ART.worldWidth);
    textures.load(FARM_ART.texture, 1254, 1254);
    expect(textures.size(FARM_ART.texture)).toMatchObject({width: 687, height: 687});
    expect(drawn).toEqual([[0, 0, 687, 687]]);
    // The full picture never became a texture (never sent to the graphics card).
    expect(textures.images).toEqual([]);
    const ratio = budget.ratio(FARM_ART.texture);
    expect(ratio).toBeCloseTo(1254 / 687, 10);
    // Display scale × texture pixels = the same width in the world as the full picture.
    expect(FARM_ART.worldWidth / FARM_ART.width * ratio * 687).toBeCloseTo(FARM_ART.worldWidth, 9);
    // 1254² → 687²: 70 % less memory for this picture.
    expect(1 - 687 ** 2 / 1254 ** 2).toBeGreaterThan(.69);
  });
  it('leaves unlisted and small textures untouched, with a ratio of 1', () => {
    const textures = fakeTextures(), drawn: number[][] = [], budget = new TextureBudget(textures, fakeCanvas(drawn));
    budget.want(KITCHEN_ART.texture, KITCHEN_ART.worldWidth);
    textures.load(KITCHEN_ART.texture, 768, 711);
    textures.load('rabbit-paille', 1254, 1254);
    expect(textures.size(KITCHEN_ART.texture)).toEqual({width: 768, height: 711});
    expect(textures.size('rabbit-paille')).toEqual({width: 1254, height: 1254});
    expect(drawn).toEqual([]);
    expect(budget.ratio(KITCHEN_ART.texture)).toBe(1);
    expect(budget.ratio('missing')).toBe(1);
  });
  it('gives a night glow the same pixels as its building', () => {
    const textures = fakeTextures(), budget = new TextureBudget(textures, fakeCanvas([]));
    budget.want(NEST_ART.texture, NEST_ART.worldWidth);
    budget.wantLike('noel-nuit:buildings/nest-cozy-refuge.png', NEST_ART.texture);
    textures.load(NEST_ART.texture, 1254, 1254); textures.load('noel-nuit:buildings/nest-cozy-refuge.png', 1254, 1254);
    expect(textures.size('noel-nuit:buildings/nest-cozy-refuge.png')).toMatchObject({width: 792, height: 792});
    expect(textures.size(NEST_ART.texture)).toMatchObject({width: 792, height: 792});
    // A glow of a building without budget gets none.
    budget.wantLike('noel-nuit:other', 'unknown'); expect(budget.has('noel-nuit:other')).toBe(false);
  });
  it('frees the listed pictures no longer shown, and only those', () => {
    const textures = fakeTextures(), budget = new TextureBudget(textures, fakeCanvas([]));
    for (const art of [FARM_ART, FARM_LEVEL_3_ART, NEST_ART]) { budget.want(art.texture, art.worldWidth); textures.load(art.texture, art.width, art.height); }
    textures.load('rabbit-paille', 512, 512);
    // The farm went up to level 3: its former picture is freed, the nest and the unlisted rabbit stay.
    expect(budget.release(new Set([FARM_LEVEL_3_ART.texture, NEST_ART.texture]))).toEqual([FARM_ART.texture]);
    expect(textures.exists(FARM_ART.texture)).toBe(false);
    expect(textures.exists('rabbit-paille')).toBe(true);
    // Loaded again later, it is shrunk again.
    textures.load(FARM_ART.texture, 1254, 1254); expect(textures.size(FARM_ART.texture)?.width).toBe(687);
  });
  it('keeps the full picture when no canvas can be drawn', () => {
    const textures = fakeTextures(), budget = new TextureBudget(textures, () => ({getContext: () => null}) as unknown as HTMLCanvasElement);
    budget.want(FARM_ART.texture, FARM_ART.worldWidth); textures.load(FARM_ART.texture, 1254, 1254);
    expect(textures.size(FARM_ART.texture)?.width).toBe(1254); expect(budget.ratio(FARM_ART.texture)).toBe(1);
  });
  it('stops listening once disposed', () => {
    const textures = fakeTextures(), budget = new TextureBudget(textures, fakeCanvas([]));
    budget.want(FARM_ART.texture, FARM_ART.worldWidth); budget.dispose();
    textures.load(FARM_ART.texture, 1254, 1254); expect(textures.size(FARM_ART.texture)?.width).toBe(1254);
  });
  it('gives every rabbit drawing a budget of twice its size on screen, Benny at 275 px instead of 354', () => {
    for (const art of RABBIT_ART) {
      const budget = budgetWidth(art.worldWidth * VISUAL.rabbit.scale), size = shrinkSize(art.width, art.height, budget);
      // Never below twice the screen size at the closest zoom.
      expect((size?.width ?? art.width) / (art.worldWidth * VISUAL.rabbit.scale * VISUAL.camera.maxZoom)).toBeGreaterThanOrEqual(2 - 1e-9);
    }
    const benny = rabbitArt('benny')!;
    expect(shrinkSize(benny.width, benny.height, budgetWidth(benny.worldWidth * VISUAL.rabbit.scale))).toMatchObject({width: 275, height: 338});
  });
  it("repacks Benny's atlas smaller without any frame touching another, each frame kept in its place", () => {
    const data = bennyAtlas as unknown as AtlasData, ratio = 354 / 275;
    const packed = shrinkAtlas(data, 2035, ratio);
    const rects = Object.values(packed.data.frames).map(f => f.frame);
    expect(Object.keys(packed.data.frames)).toEqual(Object.keys(data.frames));
    for (const r of rects) { expect(r.x).toBeGreaterThanOrEqual(2); expect(r.y).toBeGreaterThanOrEqual(2); expect(r.x + r.w).toBeLessThanOrEqual(packed.width - 2); expect(r.y + r.h).toBeLessThanOrEqual(packed.height - 2); }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j], gap = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
      expect(gap).toBeGreaterThanOrEqual(2);
    }
    for (const [name, f] of Object.entries(data.frames)) {
      const g = packed.data.frames[name];
      // Same place in the full frame, in the smaller pixels: once drawn `ratio` times bigger, within half a painted pixel.
      expect(g.spriteSourceSize!.x * ratio).toBeCloseTo(f.spriteSourceSize!.x, 9);
      expect(g.spriteSourceSize!.y * ratio).toBeCloseTo(f.spriteSourceSize!.y, 9);
      expect(g.sourceSize!.w * ratio).toBeCloseTo(f.sourceSize!.w, 9);
      expect(Math.abs(g.frame.w * ratio - f.frame.w)).toBeLessThanOrEqual(ratio / 2 + 1e-9);
      expect(packed.place.find(p => p.to === g.frame)?.from).toEqual(f.frame);
    }
    // 2035 × 2786 before; the repacked sheet is about 40 % lighter.
    expect(packed.width * packed.height).toBeLessThan(2035 * 2786 * .7);
  });
  it('hands a listed atlas to Phaser repacked, with its ratio, and leaves the others alone', () => {
    const textures = fakeTextures(), drawn: number[][] = [], budget = new TextureBudget(textures, fakeCanvas(drawn));
    budget.wantAtlas('benny-frames', 354 / 275);
    textures.addAtlas('benny-frames', {width: 2035, height: 2786} as HTMLImageElement, bennyAtlas);
    textures.addAtlas('other', {width: 2035, height: 2786} as HTMLImageElement, bennyAtlas);
    expect(budget.ratio('benny-frames')).toBeCloseTo(354 / 275, 10);
    expect(textures.atlases.get('benny-frames')!.source.width).toBe(Math.ceil(2035 * 275 / 354));
    expect(drawn).toHaveLength(Object.keys(bennyAtlas.frames).length);
    expect(textures.atlases.get('other')!.data).toBe(bennyAtlas); expect(budget.ratio('other')).toBe(1);
  });
});
