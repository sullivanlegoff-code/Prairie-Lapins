// Deterministic premultiplied area filter, with a shared full-canvas pixel grid.
// A patch is sampled at its original offset, never resized on an independent grid.
export function resizeRegion(image, sourceWidth, sourceHeight, width, height, offsetX = 0, offsetY = 0) {
  const x = Math.floor(offsetX * width / sourceWidth), y = Math.floor(offsetY * height / sourceHeight);
  const right = Math.ceil((offsetX + image.width) * width / sourceWidth), bottom = Math.ceil((offsetY + image.height) * height / sourceHeight);
  const w = right - x, h = bottom - y, pixels = Buffer.alloc(w * h * 4);
  for (let j = y; j < bottom; j++) for (let i = x; i < right; i++) {
    let a = 0, r = 0, g = 0, b = 0;
    for (let sy = Math.floor(j * sourceHeight / height); sy < Math.ceil((j + 1) * sourceHeight / height); sy++) {
      if (sy < offsetY || sy >= offsetY + image.height) continue;
      const wy = Math.min((j + 1) * sourceHeight, (sy + 1) * height) - Math.max(j * sourceHeight, sy * height);
      for (let sx = Math.floor(i * sourceWidth / width); sx < Math.ceil((i + 1) * sourceWidth / width); sx++) {
        if (sx < offsetX || sx >= offsetX + image.width) continue;
        const wx = Math.min((i + 1) * sourceWidth, (sx + 1) * width) - Math.max(i * sourceWidth, sx * width);
        const k = ((sy - offsetY) * image.width + sx - offsetX) * 4, alpha = image.pixels[k + 3], weight = wx * wy;
        a += weight * alpha; r += weight * alpha * image.pixels[k]; g += weight * alpha * image.pixels[k + 1]; b += weight * alpha * image.pixels[k + 2];
      }
    }
    const k = ((j - y) * w + i - x) * 4;
    pixels[k + 3] = Math.round(a / (sourceWidth * sourceHeight));
    if (a) { pixels[k] = Math.round(r / a); pixels[k + 1] = Math.round(g / a); pixels[k + 2] = Math.round(b / a); }
  }
  return {x, y, width: w, height: h, pixels};
}
