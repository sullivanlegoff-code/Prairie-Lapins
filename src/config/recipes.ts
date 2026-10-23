import {RECIPE_POLICIES} from './recipePolicies';
import {RECIPE_SPECIES, type SpeciesId} from './balance';

/** Coin prices only; buying reveals conditions and never changes a breeding draw. */
export const RECIPE_PRICES: Readonly<Partial<Record<SpeciesId, number>>> = RECIPE_POLICIES.prices;
/** Starting gifts from current recipe sources; historical migrations use their own fixed grant. */
export const GIFTED_RECIPES: readonly SpeciesId[] = RECIPE_POLICIES.gifted;
/** Species whose recipe can be recorded in a save: every non-common recipe. */
export const RECIPE_BOOK_SPECIES: readonly SpeciesId[] = RECIPE_SPECIES;
