import {RECIPE_SPECIES, SPECIES_IDS, SPECIES} from '../src/config/balance';
import type {GameState} from '../src/state/types';
/** Display precondition for odds/notebook assertions written before recipe privacy; never changes a draw. */
export function knowRecipes<T extends GameState>(s: T): T { s.recipeBook = [...RECIPE_SPECIES]; return s; }
/** Also discovers the commons: commons are outside the guarantee, so their discovery never changes a pool. */
export function knowEveryResult<T extends GameState>(s: T): T {
  knowRecipes(s); for (const id of SPECIES_IDS) if (SPECIES[id].recipe === null && !s.discovered.includes(id)) s.discovered.push(id); return s;
}
