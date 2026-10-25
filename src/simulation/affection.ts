import {AFFECTION_STATUE, BALANCE, RARE_BIRTH_BONUS, SPECIES, feedCost, type SpeciesId} from '../config/balance';
import {progressionFromXp} from './progression';
import type {GameState} from '../state/types';

/** Affection 15 and above (owner, 25 October 2026): a reward that needs the Statue de l'Affection, built from level 15. */
export const playerLevel = (s: Pick<GameState, 'progression'>): number => progressionFromXp(s.progression.totalXp).level;
export const hasAffectionStatue = (s: Pick<GameState, 'buildings'>): boolean => s.buildings.some(b => b.kind === 'statue');
/** Highest affection a meal (or Cuisine) can reach; a rabbit already above it keeps its affection. */
export const affectionCap = (s: Pick<GameState, 'buildings'>): number => hasAffectionStatue(s) ? BALANCE.maxAffection : AFFECTION_STATUE.cap;
/** Why the next meal is refused, or null: the statue wall comes before the food. */
export function feedReason(s: Pick<GameState, 'buildings' | 'grass'>, affection: number): 'MAX_AFFECTION' | 'STATUE_REQUIRED' | 'NOT_ENOUGH_GRASS' | null {
  if (affection >= BALANCE.maxAffection) return 'MAX_AFFECTION';
  if (affection >= affectionCap(s)) return 'STATUE_REQUIRED';
  return s.grass < feedCost(affection) ? 'NOT_ENOUGH_GRASS' : null;
}
/** Epic or legendary chance multiplier for two parents: the step their LOWER affection reaches, 1 below every step. */
export function rareBirthFactor(species: SpeciesId, affectionA: number, affectionB: number): number {
  if (!['epic', 'legendary'].includes(SPECIES[species].rarity)) return 1;
  return RARE_BIRTH_BONUS.find(step => Math.min(affectionA, affectionB) >= step.affection)?.factor ?? 1;
}
