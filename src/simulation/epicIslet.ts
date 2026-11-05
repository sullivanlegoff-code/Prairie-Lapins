import {EPIC_ISLET} from '../config/balance';
import {playerLevel} from './affection';
import type {Building, GameState, Refusal} from '../state/types';

/** The nest of the islet of the Epics, once bought (owner, 5 November 2026). */
export const epicIsletNest = (s: Pick<GameState, 'buildings'>): Building | undefined => s.buildings.find(b => b.islet);
/** Why the islet of the Epics cannot be bought now, or null. */
export function epicIsletReason(s: GameState): Refusal | null {
  if (epicIsletNest(s)) return 'BUILDING_LIMIT';
  if (playerLevel(s) < EPIC_ISLET.unlockLevel) return 'LEVEL_REQUIRED';
  return s.hearts < EPIC_ISLET.hearts ? 'NOT_ENOUGH_HEARTS' : null;
}
