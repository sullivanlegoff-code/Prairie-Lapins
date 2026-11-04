import {EVOLUTION_CHALLENGES, evolutionChallengeTarget, type EvolutionChallenge} from '../config/evolutionChallenges';
import type {GameState} from '../state/types';

/** Adds one real in-game event to only the rabbit that performed it. Values are capped at the species requirement. */
export function recordEvolutionChallenge(state: GameState, rabbitId: string, challenge: EvolutionChallenge): void {
  const rabbit = state.rabbits.find(item => item.id === rabbitId);
  const challenges = rabbit && EVOLUTION_CHALLENGES[rabbit.species];
  if (!rabbit || !challenges?.includes(challenge)) return;
  const target = evolutionChallengeTarget(rabbit.species, challenge);
  const progress = rabbit.evolution?.challenges ?? {};
  const current = progress[challenge] ?? 0;
  if (current >= target) return;
  rabbit.evolution = {...rabbit.evolution, challenges: {...progress, [challenge]: current + 1}};
}

/** Integration point for the jump-rope branch: record the best completed score for this athlete. */
export function recordJumpRopeScore(state: GameState, rabbitId: string, jumps: number): boolean {
  if (!Number.isSafeInteger(jumps) || jumps < 0 || jumps > 10000) return false;
  const rabbit = state.rabbits.find(item => item.id === rabbitId);
  if (!rabbit) return false;
  const challenges = EVOLUTION_CHALLENGES[rabbit.species] ?? [];
  for (const challenge of new Set(challenges.filter((item): item is Extract<EvolutionChallenge, `corde:${number}`> => item.startsWith('corde:')))) {
    const threshold = Number(challenge.slice('corde:'.length));
    if (jumps >= threshold) recordEvolutionChallenge(state, rabbitId, challenge);
  }
  return true;
}
