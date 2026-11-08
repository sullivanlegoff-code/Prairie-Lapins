import {encodeGame} from '../src/persistence/json';
import type {GameState} from '../src/state/types';

/**
 * The JSON a v23 client would have written for this state: the same fields, enclosures at their sizes before the first
 * enlargement (4 × 4, 6 × 5, 8 × 6), without the `formerFootprint` mark that v24 adds, without the `enclosureSizes` era and with
 * version 23.
 */
export function asV23Json(state: GameState): string {
  const marked = structuredClone(state);
  for (const b of marked.buildings) if (b.kind === 'enclosure') b.formerFootprint = 1;
  const raw = JSON.parse(encodeGame(marked));
  for (const b of raw.buildings) delete b.formerFootprint;
  delete raw.enclosureSizes;
  raw.version = 23;
  return JSON.stringify(raw);
}

/**
 * The JSON a client of version 24 to 27 written before 6 November 2026 would have written for this state: every enclosure must
 * carry the era of the size it has in that save (`formerFootprint`: 1 = 4 × 4, 6 × 5, 8 × 6; 2 = 5 × 4, 8 × 5, 10 × 6, the
 * sizes such a client gave its enclosures). It writes era 1 as `formerFootprint: true` and era 2 unmarked, without the
 * `enclosureSizes` era.
 */
export function asPreviousSizesJson(state: GameState, version: 24 | 25 | 26 | 27 = 26): string {
  for (const b of state.buildings) if (b.kind === 'enclosure' && !b.formerFootprint) throw Error(`${b.id} has the current size`);
  const raw = JSON.parse(encodeGame(state));
  for (const b of raw.buildings) if (b.formerFootprint === 1) b.formerFootprint = true; else delete b.formerFootprint;
  delete raw.enclosureSizes;
  raw.version = version;
  return JSON.stringify(raw);
}
