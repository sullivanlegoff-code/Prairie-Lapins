import type Phaser from 'phaser';
import type {Building} from '../state/types';
import {drawHabitat} from './habitatArt';
/** Existing habitat artwork; the other buildings use shared preloaded PNGs. */
export function drawBuildingArt(g: Phaser.GameObjects.Graphics, x: number, y: number, b: Pick<Building, 'kind' | 'habitat'>): void {
  if (b.kind === 'jumprope') { drawProvisionalJumpRope(g, x, y); return; }
  if (b.kind !== 'enclosure') return;
  g.fillStyle(0x506b42, .13); g.fillEllipse(x + 5, y + 30, 150, 65);
  drawHabitat(g, x, y, b.habitat?.type ?? 'universal', b.habitat?.level ?? 1);
}
/**
 * PROVISIONAL, waiting for the owner's choice among the painted concepts (output/imagegen/corde-a-sauter-v1/): a bare diamond
 * with a dashed edge, two posts and a rope, so the Terrain de corde à sauter can be built and tested. Never the final art.
 */
function drawProvisionalJumpRope(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  const diamond = [{x: x - 88, y}, {x, y: y - 44}, {x: x + 88, y}, {x, y: y + 44}];
  g.fillStyle(0x9fcf7a, 1); g.fillPoints(diamond, true);
  for (let i = 0; i < 4; i++) {
    const a = diamond[i], b = diamond[(i + 1) % 4];
    for (let t = 0; t < 1; t += .1) {
      g.lineStyle(3, 0xd98f2b, 1); g.lineBetween(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.x + (b.x - a.x) * (t + .05), a.y + (b.y - a.y) * (t + .05));
    }
  }
  g.fillStyle(0x8a5a32, 1); g.fillRect(x - 46, y - 46, 7, 50); g.fillRect(x + 39, y - 46, 7, 50);
  g.lineStyle(3, 0xe8506a, 1); g.beginPath(); g.moveTo(x - 42, y - 40);
  for (let t = 0; t <= 1.001; t += .1) g.lineTo(x - 42 + 84 * t, y - 40 + Math.sin(Math.PI * t) * 30);
  g.strokePath();
}
