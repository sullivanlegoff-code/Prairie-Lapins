import type Phaser from 'phaser';
import type {Building} from '../state/types';
import {drawHabitat} from './habitatArt';
/** Existing habitat artwork; the other buildings use shared preloaded PNGs. */
export function drawBuildingArt(g: Phaser.GameObjects.Graphics, x: number, y: number, b: Pick<Building, 'kind' | 'habitat'>): void {
  if (b.kind !== 'enclosure') return;
  g.fillStyle(0x506b42, .13); g.fillEllipse(x + 5, y + 30, 150, 65);
  drawHabitat(g, x, y, b.habitat?.type ?? 'universal', b.habitat?.level ?? 1);
}
