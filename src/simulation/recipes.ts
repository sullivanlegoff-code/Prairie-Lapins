import {SPECIES, type SpeciesId} from '../config/balance';
import {RECIPE_PRICES} from '../config/recipes';
import {stateLevelAccess} from './levelRights';
import {seasonAllows} from './season';
import type {LevelAccessTarget} from './levelAccess';
import type {GameState, Refusal} from '../state/types';

/** Display knowledge only: a discovery reveals its recipe for free; commons are known once discovered. */
export function recipeKnown(s: Pick<GameState, 'discovered' | 'recipeBook'>, species: SpeciesId): boolean {
  return s.discovered.includes(species) || SPECIES[species].recipe !== null && s.recipeBook.includes(species);
}
/** A seasonal rabbit's recipe is sold only during its event, the only time it can be born (5 November 2026). */
export function recipePrice(species: SpeciesId): number | null {
  return seasonAllows(species) ? RECIPE_PRICES[species] ?? null : null;
}
/** Level announcement: unknown, sold recipes among the species unlocked for breeding. Counts only; never a condition. */
export function newlyPurchasableRecipes(s: GameState, unlocked: readonly LevelAccessTarget[]): number {
  return new Set(unlocked.filter(t => t.family === 'species' && t.action === 'breedingResult' && recipePrice(t.id) !== null && !recipeKnown(s, t.id))
    .map(t => t.family === 'species' ? t.id : '')).size;
}
/** Every non-monetary condition of a recipe purchase, shared by the action and the shop. */
export function recipePurchaseReason(s: GameState, species: SpeciesId): Refusal | null {
  if (!Object.hasOwn(SPECIES, species) || recipePrice(species) === null) return 'INVALID_CHOICE';
  if (recipeKnown(s, species)) return 'RECIPE_KNOWN';
  if (!stateLevelAccess(s, {family: 'species', id: species, action: 'breedingResult'}).accessible) return 'LEVEL_REQUIRED';
  return null;
}
