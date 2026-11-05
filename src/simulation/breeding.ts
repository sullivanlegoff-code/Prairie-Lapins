import {BALANCE, EPIC_ISLET, BREEDING_WEIGHTS, ORDINARY_POOL_POLICIES, HISTORICAL_COMMON_WEIGHTS, GUARANTEE_SPECIES, SPECIES, SPECIES_IDS, type Odds, type SpeciesId} from '../config/balance';
import {breedable, breedsHistorically, hasRecipe} from '../config/species';
import {stateLevelAccessChecker} from './levelRights';
import {rareBirthFactor} from './affection';
import {bennyAllows} from './benny';
import {seasonAllows} from './season';
import type {GameState} from '../state/types';

/** Shared recipe identity/types; no inspection of a pending birth. */
export function recipeMatches(id: SpeciesId, a: SpeciesId, b: SpeciesId): boolean {
  const recipe = SPECIES[id].recipe;
  if (!recipe) return false;
  if (!recipe.parents && !recipe.requiredTypes?.length && !recipe.parentRarity) throw new RangeError('Recipe needs requiredTypes, exact parents or a parent rarity');
  // Benny (Mythic): any two parents of this rarity, in any order, the same species included.
  if (recipe.parentRarity && (SPECIES[a].rarity !== recipe.parentRarity || SPECIES[b].rarity !== recipe.parentRarity)) return false;
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
/** Common results are allowed only for two Common, single-type parents of the same type. */
export const commonResultAllowed = (a: SpeciesId, b: SpeciesId): boolean =>
  SPECIES[a].rarity === 'common' && SPECIES[b].rarity === 'common'
  && SPECIES[a].types.length === 1 && SPECIES[b].types.length === 1 && SPECIES[a].types[0] === SPECIES[b].types[0];
/** Catalogue eligibility is independent of weight selection; catalogue order also defines cumulative draw order. */
export function breedingWeights(a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2): Odds {
  const types = new Set([...SPECIES[a].types, ...SPECIES[b].types]);
  const key = [...types].sort().join(',');
  const policy = ORDINARY_POOL_POLICIES[key];
  const allowCommon = commonResultAllowed(a, b);
  const weights: Odds = {};
  for (const id of SPECIES_IDS) {
    const species = SPECIES[id];
    if (!allowCommon && species.rarity === 'common') continue;
    if (!ordinaryPolicyAllows(id, policy)) continue;
    const historical = !policy && breedsHistorically(species) && species.types.every(type => types.has(type));
    const recipe = !historical && hasRecipe(species) && species.recipe!.probability === undefined
      && recipeAdmissible(id, a, b, affectionA, affectionB);
    if (!historical && !recipe) continue;
    weights[id] = historical ? HISTORICAL_COMMON_WEIGHTS[key] ?? BREEDING_WEIGHTS.common : BREEDING_WEIGHTS.recipe;
  }
  return weights;
}
/** An Epic's `probability` is its weight on the scale where an ordinary Rare weighs 40: 10 makes it a quarter of a Rare. */
const EPIC_WEIGHT_SCALE = 40;
/** Affection factors are multiples of 1/20 (1.15 = 23/20): weights are scaled by 20 to stay integers. */
const FACTOR_UNITS = 20;
/**
 * Owner's weight model (31 October 2026), in exact integer ratios. Every Epic of the pair weighs a quarter of a Rare
 * (×1.15 / ×1.3 / ×1.5 / ×2 with affection, RARE_BIRTH_BONUS) and is drawn with the ordinary results; all Epics together never exceed half of that draw.
 * Legendaries, exact-parent recipes, keep their fixed chance, reserved once outside the Epic cap; so does the Mythic (Benny).
 * `islet` (the nest of the islet of the Epics, 5 November 2026): every Epic weight and every Legendary or Mythic chance ×1.1,
 * counted in tenths (11 against 10) so the weights stay exact integers; without it the weights are unchanged.
 */
export function breedingDistributionWeights(a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2, allowed: (id: SpeciesId) => boolean = () => true, islet = false): Odds {
  const ordinary = Object.fromEntries(Object.entries(breedingWeights(a, b, affectionA, affectionB)).filter(([id]) => allowed(id as SpeciesId))) as Odds;
  const specials = SPECIES_IDS.filter(id => hasRecipe(SPECIES[id]) && SPECIES[id].recipe?.probability !== undefined && recipeAdmissible(id, a, b, affectionA, affectionB) && allowed(id));
  if (!specials.length) return ordinary;
  const total = Object.values(ordinary).reduce((sum, weight) => sum + weight, 0);
  if (!total) return {}; // Without an ordinary result, neither an Epic share nor a fixed Legendary chance can be kept.
  const reserved = (id: SpeciesId) => SPECIES[id].rarity === 'legendary' || SPECIES[id].rarity === 'mythic';
  const epics = specials.filter(id => !reserved(id)), legendaries = specials.filter(reserved);
  // Affection factors (×1.15, ×1.3, ×1.5, ×2) are counted in twentieths, so every weight stays an exact integer.
  const twentieths = (id: SpeciesId) => Math.round(rareBirthFactor(id, affectionA, affectionB) * FACTOR_UNITS);
  const unit = islet ? 10 : 1, boost = islet ? Math.round(EPIC_ISLET.bonus * 10) : 1;
  const epicWeight = (id: SpeciesId) => SPECIES[id].recipe!.probability! * BREEDING_WEIGHTS.recipe * twentieths(id) * boost;
  const ordinaryTotal = total * EPIC_WEIGHT_SCALE * FACTOR_UNITS * unit, epicTotal = epics.reduce((sum, id) => sum + epicWeight(id), 0);
  // Over the cap, the Epics share exactly the ordinary mass, keeping their ratios: both sides are scaled by the other's total.
  const capped = epicTotal > ordinaryTotal;
  const base: Odds = Object.fromEntries(Object.entries(ordinary).map(([id, weight]) => [id, weight * EPIC_WEIGHT_SCALE * FACTOR_UNITS * unit * (capped ? epicTotal : 1)]));
  for (const id of epics) base[id] = epicWeight(id) * (capped ? ordinaryTotal : 1);
  if (!legendaries.length) return base;
  // In fortieths of a percent (half-percents counted in twentieths), so every affection step of a Legendary chance stays an exact integer.
  const chance = (id: SpeciesId) => SPECIES[id].recipe!.probability! * 2 * twentieths(id) * boost;
  const remaining = 200 * FACTOR_UNITS * unit - legendaries.reduce((sum, id) => sum + chance(id), 0), baseTotal = Object.values(base).reduce((sum, weight) => sum + weight, 0);
  const weights: Odds = Object.fromEntries(Object.entries(base).map(([id, weight]) => [id, weight * remaining]));
  for (const id of legendaries) weights[id] = chance(id) * baseTotal;
  return weights;
}
export function breedingOdds(a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2, islet = false): Odds {
  const weights = breedingDistributionWeights(a, b, affectionA, affectionB, undefined, islet);
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return Object.fromEntries(Object.entries(weights).map(([id, weight]) => [id, weight * 100 / total]));
}
export {seasonAllows};
/** Shared by all previews and simulation. Specials never join the guarantee. A Benny already claimed is never a result, nor a seasonal rabbit out of its season. */
export function breedingPool(state: GameState, a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2, islet = false) {
  const check=stateLevelAccessChecker(state),cache=new Map<SpeciesId, ReturnType<typeof check>>();
  const access = (id: SpeciesId) => {if(!cache.has(id))cache.set(id,check({family:'species',id,action:'breedingResult'}));return cache.get(id)!;};
  const allowed = (id: SpeciesId) => access(id).accessible && bennyAllows(state, id) && seasonAllows(id);
  const ordinary = Object.fromEntries(Object.entries(breedingWeights(a,b,affectionA,affectionB)).filter(([id]) => access(id as SpeciesId).accessible)) as Odds;
  const unfiltered = breedingDistributionWeights(a,b,affectionA,affectionB);
  const excluded = (Object.keys(unfiltered) as SpeciesId[]).filter(id => access(id).locked && bennyAllows(state, id) && seasonAllows(id)).map(id => ({species:id,requiredLevel:access(id).requiredLevel}));
  const missing = (Object.keys(ordinary) as SpeciesId[]).filter(id => GUARANTEE_SPECIES.includes(id) && breedable(SPECIES[id]) && !state.discovered.includes(id));
  const eligible = missing.length > 0;
  const guaranteed = eligible && state.pityFailures >= BALANCE.guaranteeAttempt - 1;
  const weights: Odds = guaranteed ? Object.fromEntries(missing.map(id => [id, 1])) : breedingDistributionWeights(a, b, affectionA, affectionB, allowed, islet);
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return {weights, total, missing, eligible, guaranteed, excluded};
}
export function chooseBirth(state: GameState, a: SpeciesId, b: SpeciesId, random: number, affectionA = 2, affectionB = 2, islet = false) {
  const {weights, total, missing, eligible, guaranteed} = breedingPool(state, a, b, affectionA, affectionB, islet);
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
