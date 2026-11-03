import {paintCloud, skyClouds, SKY_GRADIENT, SKY_TEXTURES} from './skyLayer';

let textures: HTMLCanvasElement[] | null = null;
function cloudTextures(): HTMLCanvasElement[] | null {
  if (textures) return textures;
  const list: HTMLCanvasElement[] = [];
  for (let variant = 0; variant < SKY_TEXTURES.variants; variant++) {
    const canvas = document.createElement('canvas'); canvas.width = SKY_TEXTURES.width; canvas.height = SKY_TEXTURES.height;
    const ctx = canvas.getContext('2d'); if (!ctx) return null;
    paintCloud(ctx, variant); list.push(canvas);
  }
  return textures = list;
}

/**
 * The meadow's sky behind the jump-rope game: the same gradient, cloud shapes, layout, opacity and screen-relative size as
 * SkyLayer (src/display/skyLayer.ts), at rest (no camera pan). Drawn on open and on resize.
 */
export function drawJumpRopeSky(canvas: HTMLCanvasElement): void {
  const w = canvas.clientWidth, h = canvas.clientHeight, ctx = canvas.getContext('2d'), clouds = cloudTextures();
  if (!w || !h || !ctx || !clouds) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of SKY_GRADIENT) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  const mobileScale = Math.min(1.25, Math.max(.6, w / 1000)), layout = skyClouds();
  for (const c of [...layout.filter(c => !c.near), ...layout.filter(c => c.near)]) {
    const scale = c.scale * mobileScale, cw = SKY_TEXTURES.width * scale, ch = SKY_TEXTURES.height * scale;
    ctx.globalAlpha = c.alpha; ctx.drawImage(clouds[c.variant], c.x * w - cw / 2, c.y * h - ch / 2, cw, ch);
  }
  ctx.globalAlpha = 1;
}
