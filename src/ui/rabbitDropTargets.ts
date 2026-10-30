import type {GameState} from '../state/types';
import {habitatEntryReason} from '../simulation/habitats';
import {parentBusy} from './models';

/** Read-only projection of the existing move rules, shared by the meadow and its list fallback. */
export function rabbitDropTargets(state: GameState, rabbitId: string, now: number): string[] {
  const rabbit = state.rabbits.find(r => r.id === rabbitId);
  if (!rabbit || parentBusy(state, rabbitId, now)) return [];
  return state.buildings.filter(b => b.kind === 'enclosure' && b.id !== rabbit.enclosureId &&
    !habitatEntryReason(state, b, rabbit.species)).map(b => b.id);
}
