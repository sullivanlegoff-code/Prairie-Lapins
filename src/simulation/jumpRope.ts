import {JUMP_ROPE} from '../config/balance';
import {giftCycle, rabbitAwayReason} from './care';
import type {GameState} from '../state/types';

/**
 * The Terrain de corde à sauter (see JUMP_ROPE): the game itself is pure and driven by the caller's clock, in milliseconds.
 * The rope passes under the rabbit's feet at `nextPassAt`; a tap within `halfWindow` of it is a jump and the rope turns a little
 * faster. A pass with no tap, or a tap too far from any pass (the rabbit lands before the rope), is a miss; `JUMP_ROPE.lives`
 * misses end the game. A missed pass is consumed: the next target is the following one.
 */
export interface JumpRopeGame {
  score: number; misses: number; over: boolean;
  /** Current turn length; the rope's previous and next passes under the feet. */
  period: number; lastPassAt: number; nextPassAt: number;
  /** The last tap that made the rabbit jump, for the animation. */
  lastJumpAt: number | null;
}
export type JumpRopeTap = 'jump' | 'miss' | 'ignored';

export const halfWindow = (period: number): number => Math.max(JUMP_ROPE.minWindow, period * JUMP_ROPE.windowShare);
/** How long the rabbit stays in the air after a jump (also the animation's length). */
export const airTime = (period: number): number => period * 0.45;
export function startJumpRope(now: number): JumpRopeGame {
  return {score: 0, misses: 0, over: false, period: JUMP_ROPE.startPeriod, lastPassAt: now + JUMP_ROPE.leadIn - JUMP_ROPE.startPeriod, nextPassAt: now + JUMP_ROPE.leadIn, lastJumpAt: null};
}
function pass(game: JumpRopeGame, jumped: boolean): void {
  if (jumped) { game.score = Math.min(JUMP_ROPE.maxScore, game.score + 1); game.period = Math.max(JUMP_ROPE.minPeriod, game.period * JUMP_ROPE.speedUp); }
  else game.misses++;
  game.lastPassAt = game.nextPassAt; game.nextPassAt += game.period;
  if (game.misses >= JUMP_ROPE.lives || game.score >= JUMP_ROPE.maxScore) game.over = true;
}
/** Settles every pass the rope made without a tap before `now`. Returns the misses it counted. */
export function advanceJumpRope(game: JumpRopeGame, now: number): number {
  let missed = 0;
  while (!game.over && now > game.nextPassAt + halfWindow(game.period)) { pass(game, false); missed++; }
  return missed;
}
/** One tap at `now`: a jump within the window of the next pass, a miss otherwise; ignored once the game is over. */
export function tapJumpRope(game: JumpRopeGame, now: number): JumpRopeTap {
  advanceJumpRope(game, now);
  if (game.over) return 'ignored';
  if (game.lastJumpAt !== null && now - game.lastJumpAt < airTime(game.period)) return 'ignored'; // Still in the air: a double tap costs nothing.
  const jumped = Math.abs(now - game.nextPassAt) <= halfWindow(game.period);
  if (jumped) game.lastJumpAt = now;
  pass(game, jumped);
  return jumped ? 'jump' : 'miss';
}
/** Where the rope is in its turn at `now`, from 0 (under the feet) through 0.5 (above the head) back to 1. */
export function ropePhase(game: JumpRopeGame, now: number): number {
  const length = game.nextPassAt - game.lastPassAt;
  return length > 0 ? Math.min(1, Math.max(0, (now - game.lastPassAt) / length)) : 0;
}

export const jumpRopeBuilding = (s: Pick<GameState, 'buildings'>) => s.buildings.find(b => b.kind === 'jumprope');
/** Rewarded games already played in the daily cycle at `now`, and whether its Heart is still to win. */
export function jumpRopeDay(s: Pick<GameState, 'missions' | 'jumpRope'>, now: number): {rewardedLeft: number; heartLeft: boolean} {
  const cycle = giftCycle(s, now), day = s.jumpRope?.cycle === cycle ? s.jumpRope : null;
  return {rewardedLeft: Math.max(0, JUMP_ROPE.rewardedGamesPerCycle - (day?.rewarded ?? 0)), heartLeft: !day?.heart};
}
export interface JumpRopeReward {pattes: number; hearts: number; rewarded: boolean}
/** What a finished game of `score` jumps pays now (before it is recorded). */
export function jumpRopeReward(s: Pick<GameState, 'missions' | 'jumpRope'>, score: number, now: number): JumpRopeReward {
  const day = jumpRopeDay(s, now), rewarded = score > 0 && day.rewardedLeft > 0;
  return {pattes: rewarded ? Math.min(JUMP_ROPE.maxPattes, score * JUMP_ROPE.pattesPerJump) : 0, hearts: day.heartLeft && score >= JUMP_ROPE.heartJumps ? 1 : 0, rewarded};
}
/** Why this rabbit cannot skip rope now, or null: it must be at home (not on a trip, at the salon or at the nest). */
export const jumpRopeRabbitReason = (s: GameState, rabbitId: string) => !s.rabbits.some(r => r.id === rabbitId) ? 'NOT_FOUND' as const : rabbitAwayReason(s, rabbitId);
