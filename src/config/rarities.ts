/**
 * Canonical rarities: the one ordered list of what depends on a species' rarity alone (its label, how long a newborn grows,
 * and the XP of a birth). Pure data, independent of balance, progression, the UI and the simulation, which read their values from
 * here. The order is the display order (filters, catalogue). Recipe affection thresholds are breeding rules, not rarity data.
 */
const REGISTRY = [
  {id: 'common', label: 'Commun', growthMinutes: 5, birthXp: 30},
  {id: 'uncommon', label: 'Peu commun', growthMinutes: 15, birthXp: 45},
  {id: 'rare', label: 'Rare', growthMinutes: 30, birthXp: 70},
  {id: 'epic', label: 'Épique', growthMinutes: 60, birthXp: 110},
  {id: 'legendary', label: 'Légendaire', growthMinutes: 120, birthXp: 180},
] as const;

export type Rarity = typeof REGISTRY[number]['id'];
export interface RarityDefinition {label: string; growthMinutes: number; birthXp: number}

/** The rarities in display order. */
export const RARITY_IDS: readonly Rarity[] = REGISTRY.map(entry => entry.id);
/** A record over every rarity, in order, from a pure projection of its definition (the one assertion: `fromEntries` is untyped by key). */
export function mapRarities<T>(project: (definition: RarityDefinition) => T): Record<Rarity, T> {
  return Object.fromEntries(REGISTRY.map(({id, ...definition}) => [id, project(definition)])) as Record<Rarity, T>;
}
/** Lookup by rarity. */
export const RARITIES = mapRarities(definition => definition);
