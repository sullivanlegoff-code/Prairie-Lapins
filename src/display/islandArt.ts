import type Phaser from 'phaser';
import {VISUAL} from '../config/visual';
import type {Point} from '../ui/gestures';

/** Original vector artwork, adapted to the unchanged aerial projection.
 * All detail is deterministic presentation data; no simulation RNG or hit areas. */
export const ISLAND_PALETTE = {
  background: '#fffdf5', grass: 0xcbd785, sunlight: 0xe6df95,
  grassShade: 0xabc779, lip: 0x9db66c, earth: 0xc98e62,
  earthShade: 0xad7558, sand: 0xeed5a2, water: 0x91d3ce,
} as const;

/** Catmull–Rom samples keep the silhouette rounded without rotating/shearing the map. */
function curve(anchors: Point[], closed = false): Point[] {
  const points: Point[] = [];
  const at = (i: number) => anchors[closed ? (i + anchors.length) % anchors.length : Math.max(0, Math.min(anchors.length - 1, i))];
  for (let i = 0; i < (closed ? anchors.length : anchors.length - 1); i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
    for (let n = 0; n < 10; n++) {
      const t = n / 10, t2 = t * t, t3 = t2 * t;
      const sample = (a: number, b: number, c: number, d: number) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      points.push({x: sample(a.x, b.x, c.x, d.x), y: sample(a.y, b.y, c.y, d.y)});
    }
  }
  if (!closed) points.push(anchors.at(-1)!);
  return points;
}
/** Keep adjacent spans comparable so larger extensions cannot pull corners into spikes. */
function evenlySpacedOutline(anchors: Point[]): Point[] {
  return anchors.flatMap((a, i) => {
    const b = anchors[(i + 1) % anchors.length];
    const spans = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 96);
    return Array.from({length: spans}, (_, n) => ({x: a.x + (b.x - a.x) * n / spans, y: a.y + (b.y - a.y) * n / spans}));
  });
}
function ribbon(points: Point[], width: number): Point[] {
  const side = (sign: number) => points.map((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    const taper = Math.min(1, i / 7, (points.length - 1 - i) / 9);
    return {x: p.x - (b.y - a.y) / length * width / 2 * taper * sign, y: p.y + (b.x - a.x) / length * width / 2 * taper * sign};
  });
  return [...side(1), ...side(-1).reverse()];
}
function wash(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, color: number, alpha: number): void {
  for (let band = 6; band >= 1; band--) {
    g.fillStyle(color, alpha / 6); g.fillEllipse(x, y, width * band / 6, height * band / 6);
  }
}
const shift = (points: Point[], x: number, y: number) => points.map(p => ({x: p.x + x, y: p.y + y}));

export function drawIslandTerrain(g: Phaser.GameObjects.Graphics, unlocked: number, visible: number): void {
  const p = ISLAND_PALETTE, grid = VISUAL.grid;
  const left = grid.originX, top = grid.originY, right = left + unlocked * grid.width, bottom = top + grid.rows * grid.depth;
  // A safety apron surrounds the complete rectangular placement envelope, even its corners.
  const shore = curve(evenlySpacedOutline([
    {x: left + 1, y: top - 26}, {x: left + 96, y: top - 32},
    {x: right - 88, y: top - 29}, {x: right + 22, y: top - 16},
    {x: right + 30, y: top + 50}, {x: right + 28, y: bottom - 24},
    {x: right + 12, y: bottom + 19}, {x: right - 69, y: bottom + 24},
    {x: left + 99, y: bottom + 25}, {x: left - 22, y: bottom + 12},
    {x: left - 32, y: bottom - 55}, {x: left - 28, y: top + 35},
  ]), true);

  // The next extension is an explicitly reserved sketch, rather than more playable lawn.
  if (visible > unlocked) {
    const x = right + 45, w = (visible - unlocked) * grid.width - 64;
    g.fillStyle(0xeee9d5, .36); g.fillRoundedRect(x, top + 5, w, grid.rows * grid.depth - 12, 44);
    g.lineStyle(2, 0xd8d4ba, .72);
    for (let n = 0; n < w - 50; n += 26) {
      g.lineBetween(x + 28 + n, top + 12 + Math.sin(n / 80) * 3, x + 40 + n, top + 12 + Math.sin(n / 80) * 3);
      g.lineBetween(x + 28 + n, bottom - 15 + Math.sin(n / 94) * 3, x + 40 + n, bottom - 15 + Math.sin(n / 94) * 3);
    }
    for (let i = 0; i < 8; i++) {
      const tx = x + 30 + (i * 67 % Math.max(1, w - 65)), ty = top + 80 + i % 3 * 52;
      g.lineStyle(2, 0xb6bea1, .38); g.lineBetween(tx, ty, tx - 3, ty - 7); g.lineBetween(tx, ty, tx + 4, ty - 5);
    }
  }

  // A small calm cove hugs only the lower-left rim, entirely outside logical cells.
  const water = curve([
    {x: left - 58, y: bottom - 98}, {x: left - 12, y: bottom - 101},
    {x: left + 35, y: bottom - 56}, {x: left + 115, y: bottom + 41},
    {x: left + 78, y: bottom + 71}, {x: left - 22, y: bottom + 63},
    {x: left - 78, y: bottom + 21}, {x: left - 85, y: bottom - 39},
  ], true);
  g.fillStyle(0x80a396, .10); g.fillPoints(shift(water, 10, 9), true);
  g.fillStyle(p.water); g.fillPoints(water, true);
  const sand = curve([
    {x: left - 35, y: bottom - 82}, {x: left + 4, y: bottom - 77},
    {x: left + 37, y: bottom - 32}, {x: left + 105, y: bottom + 40},
    {x: left + 50, y: bottom + 47}, {x: left - 22, y: bottom + 21},
    {x: left - 50, y: bottom - 25},
  ], true);
  g.fillStyle(p.sand); g.fillPoints(sand, true);
  g.lineStyle(2.4, 0xf6f8df, .65);
  for (const anchors of [
    [{x: left - 66, y: bottom - 45}, {x: left - 65, y: bottom - 20}, {x: left - 56, y: bottom - 3}],
    [{x: left - 52, y: bottom + 30}, {x: left - 29, y: bottom + 44}, {x: left - 2, y: bottom + 49}],
    [{x: left + 33, y: bottom + 57}, {x: left + 60, y: bottom + 61}, {x: left + 80, y: bottom + 54}],
  ]) g.strokePoints(curve(anchors), false);

  // Warm cel shading: modest vertical depth, light from the upper left.
  g.fillStyle(0x667454, .09); g.fillPoints(shift(shore, 11, 36), true);
  g.fillStyle(0x667454, .04); g.fillPoints(shift(shore, 18, 44), true);
  g.fillStyle(p.earthShade); g.fillPoints(shift(shore, 0, 29), true);
  g.fillStyle(p.earth); g.fillPoints(shift(shore, -2, 19), true);
  for (let x = left + 8; x < right; x += 67) {
    g.fillStyle(0xe3ad77, .46); g.fillEllipse(x, bottom + 20, 34, 27);
    g.fillStyle(0xa97557, .20); g.fillEllipse(x + 35, bottom + 25, 24, 20);
  }
  g.fillStyle(p.lip); g.fillPoints(shift(shore, 0, 5), true);
  g.fillStyle(p.grass); g.fillPoints(shore, true);

  // Broad, low-contrast washes; scale the geometry, never stretch an image or a texture.
  for (let x = left + 94; x < right - 30; x += 215) {
    wash(g, x, top + 74, 235, 130, p.sunlight, .18);
    wash(g, x + 37, bottom - 68, 260, 110, p.grassShade, .12);
    wash(g, x + 18, top + 158, 215, 106, 0xf1e7a8, .10);
  }
  // One peripheral path. It always lies below buildings and keeps the middle clear.
  const path: Point[] = [{x: left - 12, y: bottom - 60}, {x: left + 15, y: bottom - 51}];
  for (let x = left + 44; x < right - 22; x += 24) path.push({x, y: bottom - 59 + Math.sin((x - left - 25) / 160) * 19 + Math.sin((x - left) / 370) * 8});
  const road = curve(path);
  for (const [width, alpha] of [[31, .06], [26, .09], [22, .15], [17, .62]] as const) {
    g.fillStyle(0xebd5a1, alpha); g.fillPoints(ribbon(road, width), true);
  }
  // Sparse, small tufts stay in the rim apron. No flowers/accessories across the centre.
  for (let x = left + 28, i = 0; x < right - 12; x += 45, i++) {
    for (const y of [top - 8 + Math.sin(i * 2) * 4, bottom + 5 + Math.sin(i * 1.7) * 3]) {
      g.lineStyle(1.5, 0x8fa65d, .57);
      g.lineBetween(x, y, x - 4, y - 6); g.lineBetween(x, y, x + 1, y - 8); g.lineBetween(x + 1, y, x + 5, y - 4);
      g.lineStyle(1.2, 0xedebad, .64); g.lineBetween(x - 2, y - 1, x - 3, y - 5);
    }
    if (i % 5 === 2) {
      g.fillStyle(0xfff9d9, .85); g.fillCircle(x + 14, top + 23, 1.7);
      g.fillCircle(x + 20, top + 27, 1.2);
    }
  }
  // The side rim uses small rounded grass tongues, rather than a noisy spiky outline.
  for (const x of [left - 24, right + 20]) for (let y = top + 56; y < bottom - 12; y += 38) {
    g.fillStyle(p.grass, .95); g.fillEllipse(x, y, 13, 17);
    g.lineStyle(1.4, 0x95af68, .48); g.lineBetween(x, y + 2, x - 2, y - 4);
  }
}
