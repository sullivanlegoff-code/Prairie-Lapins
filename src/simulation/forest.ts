import {hasEvolvedArt} from '../config/evolvedArt';
import type {GameState, Rabbit} from '../state/types';
import type {SpeciesId} from '../config/balance';

/**
 * The Forêt de Brocéliande (owner, 3 November 2026; 7 hours per change since 6 November): once built, the player chooses for free, rabbit by rabbit, between
 * the evolved drawing and the old one of every rabbit that has already evolved, both ways. The rabbit stays at home meanwhile and
 * keeps its drawing until the change ends (`lookChange`).
 */
export const forestBuilding = (s: Pick<GameState, 'buildings'>) => s.buildings.find(b => b.kind === 'forest');
export type ClassicLookRefusal = 'MISSING_BUILDING' | 'NO_EVOLVED_ART' | 'EVOLUTION_AFFECTION' | 'EVOLUTION_REQUIRED';
/** Why this rabbit's drawing cannot be switched right now, or null. */
export function classicLookReason(s: Pick<GameState, 'buildings'>, rabbit: Pick<Rabbit, 'species' | 'affection' | 'evolution' | 'classicLook'>): ClassicLookRefusal | null {
  if (!forestBuilding(s)) return 'MISSING_BUILDING';
  if (!hasEvolvedArt(rabbit.species)) return 'NO_EVOLVED_ART';
  return rabbit.affection < 30 ? 'EVOLUTION_AFFECTION' : rabbit.evolution?.done === true ? null : 'EVOLUTION_REQUIRED';
}
/** Ends every change of drawing due by `now`. */
export function settleLookChanges(s: Pick<GameState, 'rabbits'>, now: number): void {
  for (const rabbit of s.rabbits) if (rabbit.lookChange && rabbit.lookChange.endsAt <= now) {
    delete rabbit.lookChange;
    if (rabbit.classicLook) delete rabbit.classicLook; else rabbit.classicLook = true;
  }
}
/** The rabbits whose drawing the forest can switch, most loved first. */
export const forestRabbits = (s: Pick<GameState, 'rabbits'>): Rabbit[] =>
  s.rabbits.filter(rabbit => rabbit.evolution?.done === true && rabbit.affection >= 30 && hasEvolvedArt(rabbit.species)).sort((a, b) => b.affection - a.affection);
/** Whether this rabbit has completed its evolution, even if the forest currently shows its old drawing. */
export const isEvolved = (rabbit: Pick<Rabbit, 'species' | 'affection' | 'classicLook' | 'evolution'>): boolean => rabbit.evolution?.done === true && hasEvolvedArt(rabbit.species) && rabbit.affection >= 30;
/**
 * The evolution of a species is shown (drawing and name, in a sheet or the collection) once one of the player's rabbits of that
 * species has evolved (owner, 4 November 2026: it is discovered when the rabbit evolves, never before). It stays shown once
 * that rabbit is released (`evolvedSpecies`).
 */
export const evolutionRevealed = (s: Pick<GameState, 'rabbits' | 'evolvedSpecies'>, species: SpeciesId): boolean =>
  s.evolvedSpecies?.includes(species) === true || s.rabbits.some(r => r.species === species && r.evolution?.done === true);
