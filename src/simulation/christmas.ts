import {CHRISTMAS_EVENT} from '../config/christmas';
import {CHRISTMAS_CHALLENGES, CHRISTMAS_CHALLENGE_IDS, CHRISTMAS_PICK_COUNT, MAX_CANDIES, SKY_GIFTS, SNOWMAN, type ChristmasChallengeId, type ChristmasEventName} from '../config/christmasEvent';
import {DECORATIONS, MAX_DECORATIONS, isChristmasDecoration, type DecorationId} from '../config/decorations';
import {giftCycle, presentRabbits, rabbitAwayReason} from './care';
import {progressionFromXp} from './progression';
import type {ChristmasState, GameState, Rabbit, Refusal} from '../state/types';

/**
 * The Christmas event's simulation (owner, 4 November 2026). It follows `CHRISTMAS_EVENT.active` only, never the laboratory's
 * override (which changes the island's looks, not the rules). See src/config/christmasEvent.ts for the numbers.
 */
export const christmasEventActive = (): boolean => CHRISTMAS_EVENT.active;
export const candiesOf = (s: Pick<GameState, 'christmas'>): number => s.christmas?.candies ?? 0;

type AvailabilityState = Pick<GameState, 'buildings' | 'rabbits'> & Partial<Pick<GameState, 'progression'>>;
const level = (s: Partial<Pick<GameState, 'progression'>>) => progressionFromXp(s.progression?.totalXp ?? 0).level;
/**
 * A challenge is drawn only when the player can do it now: the snowman from level 2 with a rabbit in an enclosure, a farm for
 * the food, a nest and a nursery for a breeding, two rabbits to caress; the mini-game, the meals and the pattes always.
 */
export function christmasChallengeAvailable(s: AvailabilityState, id: ChristmasChallengeId): boolean {
  const built = (kind: GameState['buildings'][number]['kind']) => s.buildings.some(b => b.kind === kind);
  const housed = s.rabbits.some(r => s.buildings.some(b => b.kind === 'enclosure' && b.id === r.enclosureId));
  switch (id) {
    case 'snowman': return level(s) >= SNOWMAN.unlockLevel && housed;
    case 'sky-gifts': case 'catch-gifts': return s.rabbits.length > 0;
    case 'harvest': return built('farm');
    case 'breed': return built('nest') && built('nursery');
    case 'pet': return s.rabbits.length >= CHRISTMAS_CHALLENGES.pet.target;
    default: return true;
  }
}
/** Stable hash of cycle and challenge: a different order each cycle, the same on every device. */
const rank = (cycle: number, id: ChristmasChallengeId): number => {
  let h = 2166136261;
  for (const ch of `noel:${cycle}:${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};
/**
 * The three challenges of a cycle among `pool`: always exactly one « activity » (the snowman or the mini-game) when one is in the
 * pool, and the others not. The same cycle and pool always give the same three, in a stable order.
 */
export function christmasChallengesFor(cycleIndex: number, pool: readonly ChristmasChallengeId[] = CHRISTMAS_CHALLENGE_IDS): ChristmasChallengeId[] {
  const sorted = [...pool].sort((a, b) => rank(cycleIndex, a) - rank(cycleIndex, b));
  const activity = sorted.find(id => CHRISTMAS_CHALLENGES[id].activity);
  const others = sorted.filter(id => !CHRISTMAS_CHALLENGES[id].activity).slice(0, CHRISTMAS_PICK_COUNT - (activity ? 1 : 0));
  const chosen = new Set<ChristmasChallengeId>([...(activity ? [activity] : []), ...others]);
  return sorted.filter(id => chosen.has(id));
}
/** The draw stored at the start of a cycle: among what the player can do then. */
export const pickChristmasChallenges = (s: AvailabilityState, cycleIndex: number): ChristmasChallengeId[] =>
  christmasChallengesFor(cycleIndex, CHRISTMAS_CHALLENGE_IDS.filter(id => christmasChallengeAvailable(s, id)));

/** Whether the stored challenges belong to the current daily cycle. */
const currentDay = (s: Pick<GameState, 'christmas' | 'missions'>): ChristmasState | null =>
  s.christmas && s.christmas.cycle === s.missions.daily.cycleIndex ? s.christmas : null;
/**
 * The three challenges shown in the current cycle: the draw stored at its start, or (a cycle begun before the event, or before
 * any Christmas progress) the draw among what the player can do now, stored at the first progress.
 */
export function christmasChallengesOf(s: GameState): ChristmasChallengeId[] {
  return currentDay(s)?.picked ?? pickChristmasChallenges(s, s.missions.daily.cycleIndex);
}
export const christmasProgress = (s: GameState, id: ChristmasChallengeId): number => currentDay(s)?.progress?.[id] ?? 0;
export const christmasClaimed = (s: GameState): ChristmasChallengeId[] => currentDay(s)?.claimed ?? [];
export const christmasBonusClaimed = (s: GameState): boolean => !!currentDay(s)?.bonusClaimed;
/** A shown challenge whose target is reached and whose sucres d'orge are not yet claimed. */
export const christmasClaimable = (s: GameState, id: ChristmasChallengeId): boolean =>
  christmasEventActive() && christmasChallengesOf(s).includes(id) && !christmasClaimed(s).includes(id) && christmasProgress(s, id) >= CHRISTMAS_CHALLENGES[id].target;
/** The cycle bonus opens once the three shown challenges are claimed. */
export const christmasBonusReady = (s: GameState): boolean =>
  christmasEventActive() && christmasChallengesOf(s).every(id => christmasClaimed(s).includes(id));
/** Rewards waiting to be claimed (for a badge). */
export const availableChristmasRewards = (s: GameState): number => !christmasEventActive() ? 0 :
  christmasChallengesOf(s).filter(id => christmasClaimable(s, id)).length + Number(christmasBonusReady(s) && !christmasBonusClaimed(s));

/** Mutates the action/advance copy: the current cycle's challenges are stored, the balance, snowman and mini-game kept. */
export function startChristmasCycle(s: GameState): ChristmasState {
  const cycle = s.missions.daily.cycleIndex, old = s.christmas;
  if (old && old.cycle === cycle) return old;
  const next: ChristmasState = {candies: old?.candies ?? 0, cycle, picked: pickChristmasChallenges(s, cycle), progress: {}, claimed: [],
    ...(old?.snowman ? {snowman: old.snowman} : {}), ...(old?.skyGifts ? {skyGifts: old.skyGifts} : {})};
  s.christmas = next;
  return next;
}
/** Called by `updateMissions` when a new daily cycle starts: the draw is made then, while the event is on. */
export function rollChristmasCycle(s: GameState): void {
  if (christmasEventActive()) startChristmasCycle(s);
}
/**
 * Called once after a successful action, with the same event and amount as the daily missions (and the event's own ones).
 * Only while the event is on, only for a shown challenge not yet claimed. False when a counter would overflow.
 */
export function recordChristmasAction(s: GameState, event: ChristmasEventName, amount: number): boolean {
  if (!christmasEventActive() || !(amount > 0)) return true;
  const ids = christmasChallengesOf(s).filter(id => CHRISTMAS_CHALLENGES[id].event === event && !christmasClaimed(s).includes(id));
  if (!ids.length) return true;
  const day = startChristmasCycle(s), progress = {...day.progress};
  for (const id of ids) {
    const next = (progress[id] ?? 0) + amount;
    if (!Number.isSafeInteger(next)) return false;
    // Bounded at the target: nothing more is needed, and the save stays small.
    progress[id] = Math.min(next, CHRISTMAS_CHALLENGES[id].target);
  }
  day.progress = progress;
  return true;
}
/** Credits sucres d'orge within MAX_CANDIES; false (nothing credited) beyond it. */
export function creditCandies(s: GameState, amount: number): boolean {
  const day = startChristmasCycle(s), next = day.candies + amount;
  if (!Number.isSafeInteger(next) || next < 0 || next > MAX_CANDIES) return false;
  day.candies = next;
  return true;
}

/** The enclosure where today's snowman stands, or null (none today, its enclosure removed, or the event over). */
export function snowmanToday(s: Pick<GameState, 'christmas' | 'missions' | 'buildings'>, now: number): string | null {
  const snowman = s.christmas?.snowman;
  if (!christmasEventActive() || !snowman || snowman.cycle !== giftCycle(s, now)) return null;
  return s.buildings.some(b => b.kind === 'enclosure' && b.id === snowman.enclosureId) ? snowman.enclosureId : null;
}
export interface SnowmanQuote {guests: Rabbit[]; reason: Refusal | null}
/**
 * The rabbits present in the enclosure (the picnic's guests: not travelling, not at the salon, not at the nest) and why the
 * snowman is refused, or null. Free, no affection, no XP.
 */
export function snowmanQuote(s: GameState, enclosureId: string, now: number): SnowmanQuote {
  const enclosure = s.buildings.some(b => b.kind === 'enclosure' && b.id === enclosureId);
  const guests = enclosure ? presentRabbits(s, enclosureId) : [];
  const reason: Refusal | null = !christmasEventActive() ? 'EVENT_OVER' : !enclosure ? 'NOT_FOUND'
    : progressionFromXp(s.progression.totalXp).level < SNOWMAN.unlockLevel ? 'LEVEL_REQUIRED'
    : s.christmas?.snowman?.cycle === giftCycle(s, now) ? 'SNOWMAN_TODAY' : !guests.length ? 'EMPTY_ENCLOSURE' : null;
  return {guests, reason};
}
export const snowmanReason = (s: GameState, enclosureId: string, now: number): Refusal | null => snowmanQuote(s, enclosureId, now).reason;

/** Rewarded games left in the daily cycle at `now`, and the record. */
export function skyGiftsDay(s: Pick<GameState, 'christmas' | 'missions'>, now: number): {rewardedLeft: number; best: number} {
  const g = s.christmas?.skyGifts, day = g && g.cycle === giftCycle(s, now) ? g : null;
  return {rewardedLeft: Math.max(0, SKY_GIFTS.rewardedGamesPerCycle - (day?.rewarded ?? 0)), best: g?.best ?? 0};
}
/** What a finished game with `caught` gifts pays now: pattes within the daily limit, never XP. */
export function skyGiftsReward(s: Pick<GameState, 'christmas' | 'missions'>, caught: number, now: number): {pattes: number; rewarded: boolean} {
  const rewarded = skyGiftsDay(s, now).rewardedLeft > 0;
  return {pattes: rewarded ? Math.min(SKY_GIFTS.maxPattes, Math.max(0, Math.floor(caught)) * SKY_GIFTS.pattesPerGift) : 0, rewarded};
}
/** Why this rabbit cannot carry the basket now (missing, on a trip, at the salon), or null. */
export function skyGiftsRabbitReason(s: GameState, rabbitId: string): Refusal | null {
  if (!s.rabbits.some(r => r.id === rabbitId)) return 'NOT_FOUND';
  const away = rabbitAwayReason(s, rabbitId);
  return away === 'TRAVELING' || away === 'AT_SALON' ? away : null;
}

/** Why a Christmas decoration cannot be bought at the market now (placement aside), or null. */
export function christmasDecorationReason(s: GameState, catalogId: DecorationId): Refusal | null {
  if (!Object.hasOwn(DECORATIONS, catalogId) || !isChristmasDecoration(catalogId)) return 'INVALID_CHOICE';
  if (!christmasEventActive()) return 'EVENT_OVER';
  if (s.decorations.length >= MAX_DECORATIONS || !Number.isSafeInteger(s.nextId + 1)) return 'DECORATION_LIMIT';
  return candiesOf(s) < (DECORATIONS[catalogId].candyPrice ?? Infinity) ? 'NOT_ENOUGH_CANDIES' : null;
}
