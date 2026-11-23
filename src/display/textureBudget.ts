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

/** What the budget needs from Phaser's texture manager (a small fake stands in for it in the tests). */
export interface BudgetTextures {
  exists(key: string): boolean;
  get(key: string): {customData: object};
  remove(key: string): unknown;
  addImage(key: string, source: HTMLImageElement, dataSource?: unknown): unknown;
  addCanvas(key: string, canvas: HTMLCanvasElement): {customData: object} | null;
}

/** Where a texture keeps its ratio (Phaser's free `customData`). */
type Data = {budgetRatio?: number};

export class TextureBudget {
  private readonly widths = new Map<string, number>();
  private readonly addImage: BudgetTextures['addImage'];
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
  }
  dispose(): void { this.textures.addImage = this.addImage; }
  /** This texture, `worldWidth` wide in the world, is kept within its budget from its next arrival on. */
  want(key: string, worldWidth: number): void { if (worldWidth > 0 && !this.widths.has(key)) this.widths.set(key, budgetWidth(worldWidth)); }
  /** This texture (a night glow) gets the same width as `like` (its building), so both keep the same pixels. */
  wantLike(key: string, like: string): void { const width = this.widths.get(like); if (width && !this.widths.has(key)) this.widths.set(key, width); }
  has(key: string): boolean { return this.widths.has(key); }
  /** Painted pixels for one texture pixel: 1 for an untouched picture. */
  ratio(key: string): number {
    if (!this.textures.exists(key)) return 1;
    const ratio = (this.textures.get(key).customData as Data).budgetRatio;
    return typeof ratio === 'number' && ratio > 0 ? ratio : 1;
  }
  /** The listed textures that are loaded now, among `keys`. */
  loaded(keys: Iterable<string> = this.widths.keys()): string[] { return [...keys].filter(key => this.widths.has(key) && this.textures.exists(key)); }
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
}
