import {VISUAL} from '../config/visual';

/**
 * The meadow's large pictures kept at about twice their largest size on screen (plan 5.1, 23 November 2026). A farm is painted
 * 1254 px wide for about 340 px on screen at the closest zoom, and Safari may reload a page that holds too many such pictures.
 * When one of the listed pictures arrives, it is redrawn smaller before it becomes a texture; the painted files are untouched.
 * The configs keep their painted sizes: what draws a picture multiplies by `ratio(key)` (1 for an untouched picture), and the
 * touch tests read the texture's own pixels, so nothing moves nor changes size on screen.
 */
/** Texture pixels for one screen pixel at the closest zoom: 2, sharp on a Retina screen. */
export const TEXTURE_DENSITY = 2;
/** A picture is only redrawn when it is clearly larger than its budget (10 % margin). */
const MARGIN = 1.1;

/** The width a picture this wide in the world needs (pixels), at the closest zoom. */
export const budgetWidth = (worldWidth: number, maxZoom: number = VISUAL.camera.maxZoom): number => Math.ceil(worldWidth * maxZoom * TEXTURE_DENSITY - 1e-6); // (180 × 2.2 × 2 is 792.0000000001 in floating point)

/** The reduced size of a `width` × `height` picture for a budget, or null when it already fits. */
export function shrinkSize(width: number, height: number, budget: number): {width: number; height: number; ratio: number} | null {
  if (!(width > 0 && height > 0 && budget > 0) || width <= budget * MARGIN) return null;
  return {width: budget, height: Math.max(1, Math.round(height * budget / width)), ratio: width / budget};
}

/** A frame of a Phaser JSON-hash atlas (TexturePacker format). */
export interface AtlasFrame {
  frame: {x: number; y: number; w: number; h: number}; rotated?: boolean; trimmed?: boolean;
  spriteSourceSize?: {x: number; y: number; w: number; h: number}; sourceSize?: {w: number; h: number};
}
export interface AtlasData {frames: Record<string, AtlasFrame>; meta?: Record<string, unknown>}
/** Space left around each repacked frame, so that no frame bleeds into its neighbour once filtered. */
const ATLAS_GAP = 2;
/**
 * An atlas shrunk by `ratio`: every frame is redrawn `ratio` times smaller and the frames are laid again in rows, with a margin
 * (a plain resize would let neighbouring frames touch). Trims and source sizes are divided too, so each frame keeps its place in
 * its full canvas. Pure: `place` lists where each frame is copied from and to.
 */
export function shrinkAtlas(data: AtlasData, width: number, ratio: number): {width: number; height: number; data: AtlasData; place: {from: AtlasFrame['frame']; to: AtlasFrame['frame']}[]} {
  const k = 1 / ratio, sheet = Math.max(1, Math.ceil(width * k)), frames: Record<string, AtlasFrame> = {}, place: {from: AtlasFrame['frame']; to: AtlasFrame['frame']}[] = [];
  let x = ATLAS_GAP, y = ATLAS_GAP, row = 0;
  // Tallest first keeps the rows tight; the names keep their own order in the data.
  const order = Object.entries(data.frames).sort((a, b) => b[1].frame.h - a[1].frame.h);
  for (const [name, f] of order) {
    const w = Math.max(1, Math.round(f.frame.w * k)), h = Math.max(1, Math.round(f.frame.h * k));
    if (x + w + ATLAS_GAP > sheet && x > ATLAS_GAP) { x = ATLAS_GAP; y += row + ATLAS_GAP; row = 0; }
    const to = {x, y, w, h}; place.push({from: f.frame, to});
    const trim = f.spriteSourceSize ?? {x: 0, y: 0, w: f.frame.w, h: f.frame.h}, source = f.sourceSize ?? {w: f.frame.w, h: f.frame.h};
    frames[name] = {...f, frame: to, spriteSourceSize: {x: trim.x * k, y: trim.y * k, w: trim.w * k, h: trim.h * k}, sourceSize: {w: source.w * k, h: source.h * k}};
    x += w + ATLAS_GAP; row = Math.max(row, h);
  }
  const ordered: Record<string, AtlasFrame> = {}; for (const name of Object.keys(data.frames)) ordered[name] = frames[name];
  return {width: sheet, height: y + row + ATLAS_GAP, data: {...data, frames: ordered}, place};
}

/** What the budget needs from Phaser's texture manager (a small fake stands in for it in the tests). */
export interface BudgetTextures {
  exists(key: string): boolean;
  get(key: string): {customData: object};
  remove(key: string): unknown;
  addImage(key: string, source: HTMLImageElement, dataSource?: unknown): unknown;
  addCanvas(key: string, canvas: HTMLCanvasElement): {customData: object} | null;
  addAtlas(key: string, source: HTMLImageElement, data: object, dataSource?: undefined): {customData: object} | null;
}
/** Painted pixels for one pixel of this texture: more than 1 for a picture the budget redrew smaller, else 1. */
export function textureRatio(textures: Pick<BudgetTextures, 'exists' | 'get'>, key: string): number {
  if (!textures.exists(key)) return 1;
  const ratio = (textures.get(key).customData as Data).budgetRatio;
  return typeof ratio === 'number' && ratio > 0 ? ratio : 1;
}

/** Where a texture keeps its ratio (Phaser's free `customData`). */
type Data = {budgetRatio?: number};

export class TextureBudget {
  private readonly widths = new Map<string, number>();
  /** Atlases shrunk by a given ratio (that of the drawing their frames are aligned with). */
  private readonly atlasRatios = new Map<string, number>();
  private readonly addImage: BudgetTextures['addImage'];
  private readonly addAtlas: BudgetTextures['addAtlas'];
  /**
   * The loader hands each decoded picture to `addImage`: a listed one too large goes in as a smaller canvas instead, so the full
   * picture never reaches the graphics card (it is freed with the loader's file).
   */
  constructor(private readonly textures: BudgetTextures, private readonly canvas: () => HTMLCanvasElement = () => document.createElement('canvas')) {
    const original = this.addImage = textures.addImage;
    textures.addImage = (key, source, dataSource) => {
      const smaller = dataSource ? null : this.smaller(key, source);
      if (!smaller) return original.call(textures, key, source, dataSource);
      const texture = textures.addCanvas(key, smaller.canvas);
      if (texture) (texture.customData as Data).budgetRatio = smaller.ratio;
      return texture;
    };
    const atlas = this.addAtlas = textures.addAtlas;
    textures.addAtlas = (key, source, data, dataSource) => {
      const smaller = dataSource ? null : this.smallerAtlas(key, source, data as AtlasData);
      if (!smaller) return atlas.call(textures, key, source, data, dataSource);
      // Phaser's types name only images, but its textures are made from a canvas the same way (TextureSource reads both).
      const texture = atlas.call(textures, key, smaller.canvas as unknown as HTMLImageElement, smaller.data);
      if (texture) (texture.customData as Data).budgetRatio = smaller.ratio;
      return texture;
    };
  }
  dispose(): void { this.textures.addImage = this.addImage; this.textures.addAtlas = this.addAtlas; }
  /** This texture, `worldWidth` wide in the world, is kept within its budget from its next arrival on. */
  want(key: string, worldWidth: number): void { if (worldWidth > 0 && !this.widths.has(key)) this.widths.set(key, budgetWidth(worldWidth)); }
  /** This texture (a night glow) gets the same width as `like` (its building), so both keep the same pixels. */
  wantLike(key: string, like: string): void { const width = this.widths.get(like); if (width && !this.widths.has(key)) this.widths.set(key, width); }
  /** This atlas is shrunk by `ratio` from its next arrival on (Benny's frames, aligned pixel for pixel with her drawing). */
  wantAtlas(key: string, ratio: number): void { if (ratio > 1 && !this.atlasRatios.has(key)) this.atlasRatios.set(key, ratio); }
  has(key: string): boolean { return this.widths.has(key) || this.atlasRatios.has(key); }
  /** Painted pixels for one texture pixel: 1 for an untouched picture. */
  ratio(key: string): number { return textureRatio(this.textures, key); }
  /** The listed textures that are loaded now, among `keys`. */
  loaded(keys: Iterable<string> = [...this.widths.keys(), ...this.atlasRatios.keys()]): string[] { return [...keys].filter(key => this.has(key) && this.textures.exists(key)); }
  /** Frees the listed textures not in `keep` (pictures no longer shown); a later need loads them again. */
  release(keep: ReadonlySet<string>, only?: (key: string) => boolean): string[] {
    const freed = this.loaded().filter(key => !keep.has(key) && (!only || only(key)));
    for (const key of freed) this.textures.remove(key);
    return freed;
  }
  /** The smaller copy of a listed picture larger than its budget, or null to keep it as it is. */
  private smaller(key: string, source: HTMLImageElement): {canvas: HTMLCanvasElement; ratio: number} | null {
    const budget = this.widths.get(key); if (!budget) return null;
    const size = shrinkSize(source?.width ?? 0, source?.height ?? 0, budget); if (!size) return null;
    const canvas = this.canvas(); canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d'); if (!context) return null; // No canvas: the full picture stays, nothing breaks.
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, size.width, size.height);
    return {canvas, ratio: size.ratio};
  }
  private smallerAtlas(key: string, source: HTMLImageElement, data: AtlasData): {canvas: HTMLCanvasElement; data: AtlasData; ratio: number} | null {
    const ratio = this.atlasRatios.get(key); if (!ratio || !data?.frames || Array.isArray(data.frames) || !(source?.width > 0)) return null;
    if (Object.values(data.frames).some(f => f.rotated)) return null; // Rotated frames are never made here; kept as they are.
    const packed = shrinkAtlas(data, source.width, ratio);
    const canvas = this.canvas(); canvas.width = packed.width; canvas.height = packed.height;
    const context = canvas.getContext('2d'); if (!context) return null;
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    for (const {from, to} of packed.place) context.drawImage(source, from.x, from.y, from.w, from.h, to.x, to.y, to.w, to.h);
    return {canvas, data: packed.data, ratio};
  }
}
