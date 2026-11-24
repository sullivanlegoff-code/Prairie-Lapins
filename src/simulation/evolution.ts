import {DAILY_STREAK_TARGET, EVOLUTION_CHALLENGES, evolutionChallengeTarget, isAmountChallenge, type EvolutionChallenge} from '../config/evolutionChallenges';
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

/**
 * Benny's games (owner, 24 November 2026): the coins collected in a « Benny Rampage » run (`rampage`) or the columns passed at
 * the Perchoir (`perchoir`) are added to every rabbit whose species has that challenge, capped at its target. Benny plays, so no
 * single rabbit performs them: like « quotidien », the whole island counts.
 */
export function recordEvolutionAmount(state: GameState, kind: 'rampage' | 'perchoir', amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) return;
  for (const rabbit of state.rabbits) {
    if (rabbit.evolution?.done) continue;
    for (const challenge of new Set((EVOLUTION_CHALLENGES[rabbit.species] ?? []).filter(item => isAmountChallenge(item) && item.startsWith(`${kind}:`)))) {
      const progress = rabbit.evolution?.challenges ?? {}, target = evolutionChallengeTarget(rabbit.species, challenge);
      const current = progress[challenge] ?? 0;
      if (current < target) rabbit.evolution = {...rabbit.evolution, challenges: {...progress, [challenge]: Math.min(target, current + amount)}};
    }
  }
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

/**
 * « Réussir les missions du jour 3 jours de suite » (owner, 4 November 2026). A day succeeded is a daily cycle whose bonus was
 * claimed: the streak grows when the previous cycle's bonus was claimed too, else it starts again at 1. As soon as it reaches
 * DAILY_STREAK_TARGET at a claimed bonus, every owned rabbit whose species has the `quotidien` challenge validates it (a rabbit
 * that arrives later validates it at the next claimed bonus, as long as the streak holds).
 */
export function recordDailyStreak(state: GameState, cycle: number): void {
  const previous = state.missions.streak;
  const count = previous && previous.lastCycle === cycle - 1 ? previous.count + 1 : previous && previous.lastCycle === cycle ? previous.count : 1;
  state.missions.streak = {count: Math.min(count, 9999), lastCycle: cycle};
  if (count < DAILY_STREAK_TARGET) return;
  for (const rabbit of state.rabbits) recordEvolutionChallenge(state, rabbit.id, 'quotidien');
}
