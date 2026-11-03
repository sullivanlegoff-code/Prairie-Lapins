import {AFFECTION_STATUES, BALANCE, RARE_BIRTH_BONUS, SPECIES, feedCost, type SpeciesId} from '../config/balance';
import {progressionFromXp} from './progression';
import type {GameState, Rabbit} from '../state/types';

/**
 * Affection 15 and above (owner, 25 October 2026) needs the Statue de l'Affection, built from level 15; affection 31 and above
 * (2 November 2026) needs a second statue, built from level 22 (3 November 2026, first level 25).
 */
export const playerLevel = (s: Pick<GameState, 'progression'>): number => progressionFromXp(s.progression.totalXp).level;
export const affectionStatueCount = (s: Pick<GameState, 'buildings'>): number => s.buildings.filter(b => b.kind === 'statue').length;
export const hasAffectionStatue = (s: Pick<GameState, 'buildings'>): boolean => affectionStatueCount(s) > 0;
/** The next statue for sale (price, level, wall it lifts), or null once both are built. */
export const nextAffectionStatue = (s: Pick<GameState, 'buildings'>) => AFFECTION_STATUES[affectionStatueCount(s)] ?? null;
/** Highest affection a meal (or Cuisine) can reach; a rabbit already above it keeps its affection. */
export const affectionCap = (s: Pick<GameState, 'buildings'>): number => nextAffectionStatue(s)?.cap ?? BALANCE.maxAffection;
/** The statue refusal for a rabbit stopped by `affectionCap`: the first statue, or the second one. */
export const statueReason = (s: Pick<GameState, 'buildings'>): 'STATUE_REQUIRED' | 'SECOND_STATUE_REQUIRED' =>
  affectionStatueCount(s) === 0 ? 'STATUE_REQUIRED' : 'SECOND_STATUE_REQUIRED';
/** Why the next meal is refused, or null: the statue wall comes before the food. */
export function feedReason(s: Pick<GameState, 'buildings' | 'grass'>, affection: number): 'MAX_AFFECTION' | 'STATUE_REQUIRED' | 'SECOND_STATUE_REQUIRED' | 'NOT_ENOUGH_GRASS' | null {
  if (affection >= BALANCE.maxAffection) return 'MAX_AFFECTION';
  if (affection >= affectionCap(s)) return statueReason(s);
  return s.grass < feedCost(affection) ? 'NOT_ENOUGH_GRASS' : null;
}
/** Epic, legendary or mythic chance multiplier for two parents: the step their LOWER affection reaches, 1 below every step. */
export function rareBirthFactor(species: SpeciesId, affectionA: number, affectionB: number): number {
  if (!['epic', 'legendary', 'mythic'].includes(SPECIES[species].rarity)) return 1;
  return RARE_BIRTH_BONUS.find(step => Math.min(affectionA, affectionB) >= step.affection)?.factor ?? 1;
}
/**
 * Lapin ultime (owner, 2 November 2026): a rabbit at the highest affection (50). A title and a golden crown only: no other rule
 * (its breeding bonus at 50 already comes from RARE_BIRTH_BONUS).
 */
export const isUltimate = (rabbit: Pick<Rabbit, 'affection'>): boolean => rabbit.affection >= BALANCE.maxAffection;
/** The crown is worn by default once the rabbit is ultimate; the player may take it off (`crownHidden`) and put it back. */
export const wearsCrown = (rabbit: Pick<Rabbit, 'affection' | 'crownHidden'>): boolean => isUltimate(rabbit) && !rabbit.crownHidden;
