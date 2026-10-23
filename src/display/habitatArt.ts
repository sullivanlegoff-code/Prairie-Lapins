import type Phaser from 'phaser';
import {HABITATS, type HabitatType, type HabitatLevel} from '../config/habitats';

/** World units added to each side of the original ground rectangle; all zero reproduces today's artwork exactly. */
export interface HabitatGrowth {x: number; top: number; bottom: number}
const NO_GROWTH: HabitatGrowth = {x: 0, top: 0, bottom: 0};

/** Original vector artwork. Presentation only: no game state, random draws or assets. */
export function drawHabitat(g: Phaser.GameObjects.Graphics, x: number, y: number, type: HabitatType, level: HabitatLevel, growth: HabitatGrowth = NO_GROWTH): void {
  const palette = HABITATS[type], gx = growth.x, gt = growth.top, gb = growth.bottom;
  // Positions are written for the original size. Items hugging a side keep their distance to it when the ground grows (X, Y);
  // items spread over the ground follow its proportions (Xs).
  const X = (dx: number) => dx < -20 ? dx - gx : dx > 20 ? dx + gx : dx;
  const Y = (dy: number) => dy < -10 ? dy - gt : dy > 20 ? dy + gb : dy;
  const Xs = (dx: number) => dx * (80 + gx) / 80;
  const wide = 2 * gx, tall = gt + gb;
  // A low raised bed, shared proportions and a pale rim tie the seven variants together.
  g.fillStyle(0x50684b, .12); g.fillEllipse(x + 6, y + 29 + (gb - gt) / 2, 176 + wide, 92 + tall);
  g.fillStyle(palette.fence, .8); g.fillRoundedRect(x - 82 - gx, y - 36 - gt, 164 + wide, 104 + tall, 20);
  g.fillStyle(palette.ground); g.fillRoundedRect(x - 80 - gx, y - 44 - gt, 160 + wide, 103 + tall, 19);
  g.fillStyle(0xfffcdf, .16); g.fillEllipse(x - 21, y - 10 + (gb - gt) / 2, 112 + wide * .7, 55 + tall * .5);
  g.lineStyle(2, 0xfff6dd, .6); g.strokeRoundedRect(x - 77 - gx, y - 41 - gt, 154 + wide, 97 + tall, 17);
  // Ground textures sit below the residents; large motifs stay along the edges.
  const motifs = Math.round(13 * (160 + wide) / 160 * (103 + tall) / 103);
  for (let i = 0; i < motifs; i++) {
    const dx = -65 - gx + (i * 37) % (131 + wide), dy = -30 - gt + (i * 23) % (75 + tall);
    g.fillStyle(type === 'neige' ? 0xffffff : palette.fence, type === 'neige' ? .45 : .13);
    g.fillEllipse(x + dx, y + dy, 9 + i % 3 * 3, 3);
  }
  if (type === 'neige') {
    for (const [dx, dy, width] of [[-51, -34, 53], [49, 40, 45], [60, -25, 29]]) {
      g.fillStyle(0xfcffff, .9); g.fillEllipse(x + X(dx), y + Y(dy), width, 14);
    }
  } else if (type === 'metal') {
    g.lineStyle(1, 0x8d9e9d, .25);
    for (const dy of [-23, 4, 31]) g.lineBetween(x + X(-65), y + Y(dy), x + X(65), y + Y(dy));
    for (const dx of [-38, 0, 38]) g.lineBetween(x + Xs(dx), y + Y(-29), x + Xs(dx), y + Y(40));
  }
  // Back rail and posts. The centre remains open and the approved rabbit scale is kept.
  g.lineStyle(6, palette.fence); g.beginPath(); g.moveTo(x + X(-79), y + Y(47));
  g.lineTo(x + X(-79), y + Y(-27)); g.arc(x + X(-63), y + Y(-27), 16, Math.PI, Math.PI * 1.5);
  g.lineTo(x + X(63), y + Y(-43)); g.arc(x + X(63), y + Y(-27), 16, -Math.PI * .5, 0);
  g.lineTo(x + X(79), y + Y(47)); g.strokePath();
  g.lineStyle(2, 0xfff2d5, .75); g.lineBetween(x + X(-61), y + Y(-45), x + X(61), y + Y(-45));

  switch (type) {
    case 'universal':
      shrub(g, x + X(-67), y + Y(-38), 0x86aa70); flower(g, x + X(-63), y + Y(-43), 0xe7abb7);
      shrub(g, x + X(68), y + Y(39), 0x8aad73); flower(g, x + X(71), y + Y(32), 0xffe7ae);
      break;
    case 'paille':
      g.fillStyle(0xc5a25e); g.fillRoundedRect(x + X(-75), y + Y(-54), 39, 23, 6);
      g.fillStyle(0xf1d28a); g.fillRoundedRect(x + X(-74), y + Y(-57), 37, 20, 5);
      g.lineStyle(2, 0xbb9255); for (const dx of [-64, -48]) g.lineBetween(x + X(dx), y + Y(-56), x + X(dx), y + Y(-36));
      g.lineStyle(1, 0xffedbb); g.lineBetween(x + X(-69), y + Y(-50), x + X(-42), y + Y(-50));
      wheat(g, x + X(64), y + Y(-39)); wheat(g, x + X(73), y + Y(43));
      break;
    case 'neige':
      g.fillStyle(0xa4cbdc); g.fillTriangle(x + X(43), y + Y(-33), x + X(56), y + Y(-66), x + X(71), y + Y(-33));
      g.fillStyle(0xd9f1f7); g.fillTriangle(x + X(43), y + Y(-33), x + X(56), y + Y(-66), x + X(58), y + Y(-33));
      g.fillStyle(0xeaf9fc); g.fillTriangle(x + X(58), y + Y(-34), x + X(70), y + Y(-54), x + X(77), y + Y(-34));
      g.lineStyle(2, 0xffffff); g.lineBetween(x + X(-63), y + Y(-50), x + X(-63), y + Y(-37));
      g.lineBetween(x + X(-69), y + Y(-43), x + X(-57), y + Y(-43)); g.lineBetween(x + X(-67), y + Y(-48), x + X(-59), y + Y(-39));
      break;
    case 'feu':
      for (const dx of [-61, 61]) {
        g.fillStyle(0xa48378); g.fillEllipse(x + X(dx), y + Y(-37), 30, 16);
        g.fillStyle(0xc09a87); g.fillEllipse(x + X(dx), y + Y(-40), 26, 12);
        g.fillStyle(0xf7d69b); g.fillEllipse(x + X(dx), y + Y(-47), 17, 17);
        g.fillStyle(0xeaa178); g.fillEllipse(x + X(dx), y + Y(-49), 10, 11);
        g.fillStyle(0xffe8b8); g.fillCircle(x + X(dx) - 2, y + Y(-52), 3);
      }
      shrub(g, x + X(-67), y + Y(40), 0xb09b72); flower(g, x + X(-69), y + Y(31), 0xe3a086);
      break;
    case 'metal':
      for (const dx of [-70, 70]) {
        g.fillStyle(0x8696a4); g.fillRoundedRect(x + X(dx) - 9, y + Y(-54), 18, 22, 4);
        g.fillStyle(0xd9e3e6); g.fillRoundedRect(x + X(dx) - 8, y + Y(-57), 16, 19, 4);
        g.fillStyle(0x97a7b2); g.fillCircle(x + X(dx), y + Y(-47), 4);
        g.fillStyle(0xf5f8eb); g.fillCircle(x + X(dx) - 2, y + Y(-50), 2);
      }
      g.fillStyle(0xabb9c0); g.fillRoundedRect(x + X(49), y + Y(39), 23, 10, 3);
      g.lineStyle(2, 0xeaf1e9); g.lineBetween(x + X(53), y + Y(39), x + X(67), y + Y(39));
      break;
    case 'vol':
      g.lineStyle(3, 0x9aafbd); g.lineBetween(x + X(-64), y + Y(-36), x + X(-64), y + Y(-68));
      g.fillStyle(0xe6b4c5); g.fillTriangle(x + X(-63), y + Y(-66), x + X(-39), y + Y(-60), x + X(-63), y + Y(-53));
      g.fillStyle(0xf7e4b8); g.fillTriangle(x + X(-63), y + Y(-55), x + X(-46), y + Y(-48), x + X(-63), y + Y(-44));
      cloud(g, x + X(61), y + Y(-41)); cloud(g, x + X(-65), y + Y(41));
      break;
  }
  // A larger enclosure repeats a small version of its edge motif along the back and front rails, between the corner pieces.
  if (gx > 0) edgeMotifs(g, x, y, type, Math.round(gx / 44), X, Y);
  // Low front rail leaves faces visible; tiny medallions indicate the level.
  g.lineStyle(5, palette.fence); g.lineBetween(x + X(-78), y + Y(54), x + X(78), y + Y(54));
  g.lineStyle(2, 0xfff0d1, .75); g.lineBetween(x + X(-77), y + Y(51), x + X(77), y + Y(51));
  for (const dx of [-79, 79]) {
    g.fillStyle(palette.fence); g.fillRoundedRect(x + X(dx) - 4, y + Y(38), 8, 25, 3);
    g.fillStyle(0xf7e4bf); g.fillEllipse(x + X(dx), y + Y(38), 9, 4);
  }
  g.fillStyle(palette.fence); g.fillRoundedRect(x - 20, y + Y(49), 40, 12, 5);
  for (let n = 0; n < level; n++) { g.fillStyle(0xffe7a5); g.fillCircle(x + (n - (level - 1) / 2) * 10, y + Y(55), 3); }
}

/** Only for enlarged ground: `count` small motifs per rail, evenly spread between the two corner pieces. */
function edgeMotifs(g: Phaser.GameObjects.Graphics, x: number, y: number, type: HabitatType, count: number, X: (dx: number) => number, Y: (dy: number) => number): void {
  const left = X(-30), right = X(30);
  for (let k = 1; k <= count * 2; k++) {
    const px = x + left + (right - left) * k / (count * 2 + 1), back = k % 2 === 1, py = y + (back ? Y(-40) : Y(46));
    switch (type) {
      case 'universal': flower(g, px, py, back ? 0xe7abb7 : 0xffe7ae); break;
      case 'paille': wheat(g, px, py + 2); break;
      case 'neige': g.fillStyle(back ? 0xd9f1f7 : 0xeaf9fc); g.fillTriangle(px - 6, py + 3, px, py - 14, px + 7, py + 3); break;
      case 'feu': g.fillStyle(0xc09a87); g.fillEllipse(px, py, 18, 9); g.fillStyle(0xeaa178); g.fillEllipse(px, py - 6, 9, 9); break;
      case 'metal': g.fillStyle(0xd9e3e6); g.fillRoundedRect(px - 7, py - 10, 14, 15, 3); g.fillStyle(0x97a7b2); g.fillCircle(px, py - 4, 3); break;
      case 'vol': cloud(g, px, py); break;
    }
  }
}

function shrub(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  g.fillStyle(color); g.fillEllipse(x, y, 25, 11); g.fillCircle(x - 6, y - 3, 7); g.fillCircle(x + 4, y - 5, 8);
  g.fillStyle(0xd0df9c, .4); g.fillEllipse(x - 5, y - 7, 10, 4);
}
function flower(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  g.fillStyle(color); for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) g.fillCircle(x + dx, y + dy, 2.5);
  g.fillStyle(0xfff1c0); g.fillCircle(x, y, 2);
}
function wheat(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(2, 0xab985d); g.lineBetween(x, y + 4, x + 3, y - 16);
  g.fillStyle(0xf2d38b); for (let n = 0; n < 3; n++) { g.fillEllipse(x - 1 + n, y - 7 - n * 4, 6, 4); g.fillEllipse(x + 6 + n, y - 9 - n * 4, 6, 4); }
}
function cloud(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x9fbdc0, .25); g.fillEllipse(x + 2, y + 4, 34, 12);
  g.fillStyle(0xf5f8eb); g.fillEllipse(x, y, 34, 13); g.fillCircle(x - 7, y - 4, 8); g.fillCircle(x + 4, y - 6, 9);
}
