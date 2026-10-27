import {BALANCE, BREEDING_WEIGHTS, ORDINARY_POOL_POLICIES, HISTORICAL_COMMON_WEIGHTS, GUARANTEE_SPECIES, SPECIES, SPECIES_IDS, type Odds, type SpeciesId} from '../config/balance';
import {breedable, breedsHistorically, hasRecipe} from '../config/species';
import {stateLevelAccessChecker} from './levelRights';
import {rareBirthFactor} from './affection';
import type {GameState} from '../state/types';

/** Shared recipe identity/types; no inspection of a pending birth. */
export function recipeMatches(id: SpeciesId, a: SpeciesId, b: SpeciesId): boolean {
  const recipe = SPECIES[id].recipe;
  if (!recipe) return false;
  if (!recipe.parents && !recipe.requiredTypes?.length) throw new RangeError('Recipe needs requiredTypes or exact parents');
  if (recipe.parents) {
    const [first, second] = recipe.parents;
    if (!(a === first && b === second || a === second && b === first)) return false;
  }
  const types = new Set([...SPECIES[a].types, ...SPECIES[b].types]);
  return (recipe.requiredTypes ?? []).every(type => types.has(type));
}
export function recipeAdmissible(id: SpeciesId, a: SpeciesId, b: SpeciesId, affectionA: number, affectionB: number): boolean {
  return recipeMatches(id, a, b) && affectionA >= SPECIES[id].recipe!.minAffection && affectionB >= SPECIES[id].recipe!.minAffection;
}
/** Shared structural pool selection, including known recipe-book pairs before feeding. */
export function ordinaryPoolAllows(id: SpeciesId, a: SpeciesId, b: SpeciesId): boolean {
  const key = [...new Set([...SPECIES[a].types, ...SPECIES[b].types])].sort().join(',');
  return ordinaryPolicyAllows(id, ORDINARY_POOL_POLICIES[key]);
}
function ordinaryPolicyAllows(id: SpeciesId, policy: typeof ORDINARY_POOL_POLICIES[string] | undefined): boolean {
  return !policy || hasRecipe(SPECIES[id]) && SPECIES[id].rarity === policy.recipeRarity;
}
/** Owner decision of 27 October 2026: two common parents never give a common rabbit. */
export const bothCommon = (a: SpeciesId, b: SpeciesId): boolean => SPECIES[a].rarity === 'common' && SPECIES[b].rarity === 'common';
/** Catalogue eligibility is independent of weight selection; catalogue order also defines cumulative draw order. */
export function breedingWeights(a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2): Odds {
  const types = new Set([...SPECIES[a].types, ...SPECIES[b].types]);
  const key = [...types].sort().join(',');
  const policy = ORDINARY_POOL_POLICIES[key];
  const commonParents = bothCommon(a, b);
  const weights: Odds = {};
  for (const id of SPECIES_IDS) {
    const species = SPECIES[id];
    if (commonParents && species.rarity === 'common') continue;
    if (!ordinaryPolicyAllows(id, policy)) continue;
    const historical = !policy && breedsHistorically(species) && species.types.every(type => types.has(type));
    const recipe = !historical && hasRecipe(species) && species.recipe!.probability === undefined
      && recipeAdmissible(id, a, b, affectionA, affectionB);
    if (!historical && !recipe) continue;
    weights[id] = historical ? HISTORICAL_COMMON_WEIGHTS[key] ?? BREEDING_WEIGHTS.common : BREEDING_WEIGHTS.recipe;
  }
  return weights;
}
/** Exact integer ratios: reserve specials once, then scale ordinary results. */
export function breedingDistributionWeights(a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2, allowed: (id: SpeciesId) => boolean = () => true): Odds {
  const ordinary = Object.fromEntries(Object.entries(breedingWeights(a, b, affectionA, affectionB)).filter(([id]) => allowed(id as SpeciesId))) as Odds;
  const specials = SPECIES_IDS.filter(id => hasRecipe(SPECIES[id]) && SPECIES[id].recipe?.probability !== undefined && recipeAdmissible(id, a, b, affectionA, affectionB) && allowed(id));
  if (!specials.length) return ordinary;
  const total = Object.values(ordinary).reduce((sum, weight) => sum + weight, 0);
  if (!total) return {}; // No ordinary mass can be distributed while preserving fixed special probabilities.
  // In half-percent units, so the ×1.5 affection step of epic and legendary chances stays an exact integer.
  const chance = (id: SpeciesId) => SPECIES[id].recipe!.probability! * 2 * rareBirthFactor(id, affectionA, affectionB);
  const remaining = 200 - specials.reduce((sum, id) => sum + chance(id), 0);
  const weights: Odds = Object.fromEntries(Object.entries(ordinary).map(([id, weight]) => [id, weight * remaining]));
  for (const id of specials) weights[id] = chance(id) * total;
  return weights;
}
export function breedingOdds(a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2): Odds {
  const weights = breedingDistributionWeights(a, b, affectionA, affectionB);
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return Object.fromEntries(Object.entries(weights).map(([id, weight]) => [id, weight * 100 / total]));
}
/** Shared by all previews and simulation. Specials never join the guarantee. */
export function breedingPool(state: GameState, a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2) {
  const check=stateLevelAccessChecker(state),cache=new Map<SpeciesId, ReturnType<typeof check>>();
  const access = (id: SpeciesId) => {if(!cache.has(id))cache.set(id,check({family:'species',id,action:'breedingResult'}));return cache.get(id)!;};
  const ordinary = Object.fromEntries(Object.entries(breedingWeights(a,b,affectionA,affectionB)).filter(([id]) => access(id as SpeciesId).accessible)) as Odds;
  const unfiltered = breedingDistributionWeights(a,b,affectionA,affectionB);
  const excluded = (Object.keys(unfiltered) as SpeciesId[]).filter(id => access(id).locked).map(id => ({species:id,requiredLevel:access(id).requiredLevel}));
  const missing = (Object.keys(ordinary) as SpeciesId[]).filter(id => GUARANTEE_SPECIES.includes(id) && breedable(SPECIES[id]) && !state.discovered.includes(id));
  const eligible = missing.length > 0;
  const guaranteed = eligible && state.pityFailures >= BALANCE.guaranteeAttempt - 1;
  const weights: Odds = guaranteed ? Object.fromEntries(missing.map(id => [id, 1])) : breedingDistributionWeights(a, b, affectionA, affectionB, id => access(id).accessible);
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return {weights, total, missing, eligible, guaranteed, excluded};
}
export function chooseBirth(state: GameState, a: SpeciesId, b: SpeciesId, random: number, affectionA = 2, affectionB = 2) {
  const {weights, total, missing, eligible, guaranteed} = breedingPool(state, a, b, affectionA, affectionB);
  if (!total) throw new RangeError('No admissible breeding result');
  const entries = Object.entries(weights) as [SpeciesId, number][];
  let cursor = random * total;
  let species = entries[entries.length - 1][0];
  for (const [candidate, weight] of entries) {
    if (cursor < weight) { species = candidate; break; }
    cursor -= weight;
  }
  const reservedDiscovery = eligible && missing.includes(species);
  const pityFailures = reservedDiscovery ? 0 : eligible ? state.pityFailures + 1 : state.pityFailures;
  return {species, guaranteed, reservedDiscovery, pityFailures};
}

/** A parent remains in its original habitat data (capacity and income), until explicit transfer. */
export function nestForParent(state: Pick<GameState, 'buildings'>, rabbitId: string) {
  return state.buildings.find(b => b.kind === 'nest' && b.breeding?.parents.includes(rabbitId));
}
