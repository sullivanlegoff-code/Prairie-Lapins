import {EVOLUTION_CHALLENGES, evolutionChallengeTarget} from '../src/config/evolutionChallenges';
import type {Rabbit} from '../src/state/types';

/** A completed evolution, every challenge of the species done: the only kind a save accepts. */
export const completedEvolution = (species: Rabbit['species']): NonNullable<Rabbit['evolution']> =>
  ({done: true, challenges: Object.fromEntries([...new Set(EVOLUTION_CHALLENGES[species] ?? [])].map(c => [c, evolutionChallengeTarget(species, c)]))});
/** Tests of the statues and of affection 31 to 50: since 4 November 2026 a rabbit must have evolved to pass 30 (Benny aside). */
export function evolveAbove30<R extends Pick<Rabbit, 'species' | 'affection' | 'evolution'>>(rabbit: R): R {
  if (rabbit.affection >= 30 && EVOLUTION_CHALLENGES[rabbit.species]) rabbit.evolution = completedEvolution(rabbit.species);
  return rabbit;
}
