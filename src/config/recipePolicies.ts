import {SPECIES_ENTRIES, recipeSource, type Acquisition} from './species';

/** Pure projection from declared recipe sources, usable with isolated catalogues. No matching or draw rules live here. */
export function deriveRecipePolicies<Id extends string>(entries: readonly {readonly id: Id; readonly acquisition: readonly Acquisition[]}[]) {
  const prices: Partial<Record<Id, number>> = {}, gifted: Id[] = [], guaranteed: Id[] = [];
  for (const {id, acquisition} of entries) {
    const source = recipeSource(acquisition);
    if (!source) continue;
    if (source.knowledgePrice !== undefined) prices[id] = source.knowledgePrice;
    if (source.giftedAtStart === true) gifted.push(id);
    if (source.guaranteeEligible === true) guaranteed.push(id);
  }
  return {prices, gifted, guaranteed};
}
/** One projection of the canonical entries, in catalogue order. */
export const RECIPE_POLICIES = deriveRecipePolicies(SPECIES_ENTRIES);
