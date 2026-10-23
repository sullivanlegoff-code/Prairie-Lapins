import {ISLAND} from '../config/islandGeometry';
import {acquiredFootprint} from '../config/land';
import type {GameState} from '../state/types';
import type {Footprint} from '../simulation/placement';

export const PLACEMENT_GRID = {radius: 3, opacity: .18} as const;
type CellPoint = {x: number; y: number};
export type GridLine = {from: CellPoint; to: CellPoint};

/** Fine-grid coordinates only: projection remains the ground layer's responsibility.
 * Shared edges are emitted once so their opacity does not double. No grid on water.
 */
export function placementGrid(s: Pick<GameState, 'acquiredParcels'>, active: Footprint | null): GridLine[] {
  if (!active) return [];
  const r = PLACEMENT_GRID.radius, lines = new Map<string, GridLine>();
  const add = (x: number, y: number, horizontal: boolean) => {
    lines.set(`${x}:${y}:${horizontal}`, {from: {x, y}, to: {x: x + Number(horizontal), y: y + Number(!horizontal)}});
  };
  for (let y = Math.max(0, active.y - r); y < Math.min(ISLAND.mapFine, active.y + active.height + r); y++) {
    for (let x = Math.max(0, active.x - r); x < Math.min(ISLAND.mapFine, active.x + active.width + r); x++) {
      if (!acquiredFootprint(s, x, y, 1, 1)) continue;
      add(x, y, true); add(x, y + 1, true); add(x, y, false); add(x + 1, y, false);
    }
  }
  return [...lines.values()];
}
