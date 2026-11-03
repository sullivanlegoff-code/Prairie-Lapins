import {canEvolve, hasEvolvedArt, showsEvolvedArt} from '../config/evolvedArt';
import type {GameState, Rabbit} from '../state/types';

/**
 * The Forêt de Brocéliande (owner, 3 November 2026): once built, the player chooses freely and for free, rabbit by rabbit, between
 * the evolved drawing and the old one of every rabbit of affection 30 or more that has an evolved drawing, both ways, as often as
 * wanted. Without it, a rabbit of affection 30 or more always shows its evolved drawing.
 */
export const forestBuilding = (s: Pick<GameState, 'buildings'>) => s.buildings.find(b => b.kind === 'forest');
export type ClassicLookRefusal = 'MISSING_BUILDING' | 'NO_EVOLVED_ART' | 'EVOLUTION_AFFECTION';
/** Why this rabbit's drawing cannot be switched right now, or null. */
export function classicLookReason(s: Pick<GameState, 'buildings'>, rabbit: Pick<Rabbit, 'species' | 'affection'>): ClassicLookRefusal | null {
  if (!forestBuilding(s)) return 'MISSING_BUILDING';
  if (!hasEvolvedArt(rabbit.species)) return 'NO_EVOLVED_ART';
  return canEvolve(rabbit) ? null : 'EVOLUTION_AFFECTION';
}
/** The rabbits whose drawing the forest can switch, most loved first. */
export const forestRabbits = (s: Pick<GameState, 'rabbits'>): Rabbit[] =>
  s.rabbits.filter(canEvolve).sort((a, b) => b.affection - a.affection);
/** A rabbit shows its evolved drawing (affection 30 or more, an evolved drawing, not put back in its old one). */
export const isEvolved = (rabbit: Pick<Rabbit, 'species' | 'affection' | 'classicLook'>): boolean => showsEvolvedArt(rabbit);
