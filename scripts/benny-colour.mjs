// Benny's colour recalibration onto design A1 (CIELAB), shared by scripts/prepare-benny-frames.mjs (meadow poses) and
// scripts/prepare-benny-flight.mjs (flight bodies). Node built-ins only; no side effect on import.
const toLinear = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const toSrgb = c => { c = c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055; return Math.max(0, Math.min(255, Math.round(c * 255))); };
const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
const fInv = t => t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27);
export function lab(r, g, b) {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b);
  const x = (.4124 * R + .3576 * G + .1805 * B) / .95047, y = .2126 * R + .7152 * G + .0722 * B, z = (.0193 * R + .1192 * G + .9505 * B) / 1.08883;
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export function rgb(L, A, Bv) {
  const fy = (L + 16) / 116, x = fInv(fy + A / 500) * .95047, y = fInv(fy), z = fInv(fy - Bv / 200) * 1.08883;
  return [toSrgb(3.2406 * x - 1.5372 * y - .4986 * z), toSrgb(-.9689 * x + 1.8758 * y + .0415 * z), toSrgb(.0557 * x - .2040 * y + 1.0570 * z)];
}
const smoothstep = (low, high, v) => { const t = Math.max(0, Math.min(1, (v - low) / (high - low))); return t * t * (3 - 2 * t); };
/** Fur: the saturated golden fawn. Mask: the grey-brown of the muzzle, ear backs and shading (low chroma, neither white nor black). */
const furWeight = (L, C) => smoothstep(20, 30, C) * smoothstep(25, 35, L);
const maskWeight = (L, C) => (1 - smoothstep(16, 24, C)) * smoothstep(18, 26, L) * (1 - smoothstep(70, 78, L));
export function stats({pixels}) {
  const sum = {fur: [0, 0, 0, 0, 0, 0, 0], mask: [0, 0, 0, 0]};
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 250) continue;
    const [L, A, B] = lab(pixels[i], pixels[i + 1], pixels[i + 2]), C = Math.hypot(A, B);
    if (furWeight(L, C) > .5) { const s = sum.fur; s[0]++; s[1] += L; s[2] += A; s[3] += B; s[4] += L * L; s[5] += A * A; s[6] += B * B; }
    if (maskWeight(L, C) > .5) { const s = sum.mask; s[0]++; s[1] += L; s[2] += A; s[3] += B; }
  }
  const [n, l, a, b, ll, aa, bb] = sum.fur, mean = [l / n, a / n, b / n], sd = [ll / n - mean[0] ** 2, aa / n - mean[1] ** 2, bb / n - mean[2] ** 2].map(Math.sqrt);
  const [m, ml, ma, mb] = sum.mask;
  return {fur: {mean, sd, count: n}, mask: {mean: [ml / m, ma / m, mb / m], count: m}};
}
/** Moves the fur's mean and spread (L, a, b) onto A1's, and the mask's lightness and tint onto A1's; whites and outlines keep theirs. */
export function recolour(image, reference) {
  const own = stats(image), {pixels} = image;
  const ratio = [0, 1, 2].map(k => Math.max(.8, Math.min(1.25, reference.fur.sd[k] / own.fur.sd[k])));
  const each = change => {
    for (let i = 0; i < pixels.length; i += 4) {
      if (!pixels[i + 3]) continue;
      const [L, A, B] = lab(pixels[i], pixels[i + 1], pixels[i + 2]), C = Math.hypot(A, B), out = change(L, A, B, C);
      if (out) [pixels[i], pixels[i + 1], pixels[i + 2]] = rgb(...out);
    }
  };
  // The fur: its mean and spread onto A1's, in proportion to how surely the pixel is fur.
  each((L, A, B, C) => {
    const wf = furWeight(L, C); if (wf <= 0) return null;
    return [L, A, B].map((v, k) => v + ((v - own.fur.mean[k]) * ratio[k] + reference.fur.mean[k] - v) * wf);
  });
  // The grey-brown mask: darkened and tinted towards A1's in a few passes (a darker pixel may leave or join the class).
  for (let pass = 0; pass < 4; pass++) {
    const current = stats(image), shift = [0, 1, 2].map(k => reference.mask.mean[k] - current.mask.mean[k]);
    if (Math.abs(shift[0]) < .5) break;
    each((L, A, B, C) => { const wm = maskWeight(L, C) * (1 - furWeight(L, C)); return wm > 0 ? [L, A, B].map((v, k) => v + shift[k] * wm) : null; });
  }
  return {before: own, after: stats(image)};
}

