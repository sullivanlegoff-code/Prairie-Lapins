import {hasEvolvedArt} from '../config/evolvedArt';
import type {GameState, Rabbit} from '../state/types';

/**
 * The Forêt de Brocéliande (owner, 3 November 2026): once built, the player chooses freely and for free, rabbit by rabbit, between
 * the evolved drawing and the old one of every rabbit that has already evolved, both ways, as often as wanted.
 */
export const forestBuilding = (s: Pick<GameState, 'buildings'>) => s.buildings.find(b => b.kind === 'forest');
export type ClassicLookRefusal = 'MISSING_BUILDING' | 'NO_EVOLVED_ART' | 'EVOLUTION_AFFECTION' | 'EVOLUTION_REQUIRED';
/** Why this rabbit's drawing cannot be switched right now, or null. */
export function classicLookReason(s: Pick<GameState, 'buildings'>, rabbit: Pick<Rabbit, 'species' | 'affection' | 'evolution' | 'classicLook'>): ClassicLookRefusal | null {
  if (!forestBuilding(s)) return 'MISSING_BUILDING';
  if (!hasEvolvedArt(rabbit.species)) return 'NO_EVOLVED_ART';
  return rabbit.affection < 30 ? 'EVOLUTION_AFFECTION' : rabbit.evolution?.done === true ? null : 'EVOLUTION_REQUIRED';
}
/** The rabbits whose drawing the forest can switch, most loved first. */
export const forestRabbits = (s: Pick<GameState, 'rabbits'>): Rabbit[] =>
  s.rabbits.filter(rabbit => rabbit.evolution?.done === true && rabbit.affection >= 30 && hasEvolvedArt(rabbit.species)).sort((a, b) => b.affection - a.affection);
/** Whether this rabbit has completed its evolution, even if the forest currently shows its old drawing. */
export const isEvolved = (rabbit: Pick<Rabbit, 'species' | 'affection' | 'classicLook' | 'evolution'>): boolean => rabbit.evolution?.done === true && hasEvolvedArt(rabbit.species) && rabbit.affection >= 30;
