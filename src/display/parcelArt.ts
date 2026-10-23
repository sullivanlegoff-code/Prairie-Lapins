import type Phaser from 'phaser';
import type {ParcelId} from '../config/land';
import {clipToRect, edgeEllipse, plateauRect, terrainHash} from './terrainEdges';

/** The plateau stays exactly rectangular; world stations avoid a repeated per-parcel pattern. */
export function drawParcelTerrain(g: Phaser.GameObjects.Graphics, id: ParcelId): void {
  const r = plateauRect(id); g.fillStyle(0xcbd785); g.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
  for (let iy = Math.floor((r.top - 12) / 180); iy <= (r.bottom + 12) / 180; iy++) for (let ix = Math.floor((r.left - 50) / 210); ix <= (r.right + 50) / 210; ix++) {
    const x = ix * 210 + terrainHash(ix, iy) * 150, y = iy * 180 + terrainHash(iy, ix) * 140;
    const rx = 25 + terrainHash(ix + 2, iy) * 24, ry = 5 + terrainHash(ix, iy + 7) * 5;
    const patch = clipToRect(edgeEllipse(x, y, rx, ry), r); if (patch.length < 3) continue;
    const light = terrainHash(ix, iy) > .45; g.fillStyle(light ? 0xe6df95 : 0xabc779, light ? .19 : .17); g.fillPoints(patch, true);
    if (terrainHash(ix, iy + 4) > .83 && x - 3 >= r.left && x + 6 <= r.right && y - 6 >= r.top && y <= r.bottom) {
      g.lineStyle(1.3, 0x829e65, .35); g.lineBetween(x, y, x - 3, y - 6); g.lineBetween(x + 2, y, x + 6, y - 5);
    }
  }
}
