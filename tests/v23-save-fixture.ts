import {encodeGame} from '../src/persistence/json';
import type {GameState} from '../src/state/types';

/**
 * The JSON a v23 client would have written for this state: the same fields, enclosures at their sizes before the enlargement
 * (4 × 4, 6 × 5, 8 × 6), without the `formerFootprint` mark that v24 adds and with version 23.
 */
export function asV23Json(state: GameState): string {
  const marked = structuredClone(state);
  for (const b of marked.buildings) if (b.kind === 'enclosure') b.formerFootprint = true;
  const raw = JSON.parse(encodeGame(marked));
  for (const b of raw.buildings) delete b.formerFootprint;
  raw.version = 23;
  return JSON.stringify(raw);
}
