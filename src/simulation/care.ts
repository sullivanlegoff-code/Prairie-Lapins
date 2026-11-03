import {BALANCE, PICNIC, isAffectionWall} from '../config/balance';
import {affectionCap, statueReason} from './affection';
import {nestForParent} from './breeding';
import {cycleIndexAt} from './missions';
import {travelling} from './travel';
import type {GameState, Rabbit, Refusal} from '../state/types';

/**
 * Affection gifts (owner, 2 November 2026): a care at the Salon de soins or a picnic. One gift per rabbit and per daily cycle,
 * +1 affection, never across a wall (14 → 15, 29 → 30, 49 → 50: those steps are won by feeding) and within the statues' cap.
 */
export type GiftRefusal = 'MAX_AFFECTION' | 'GIFT_TODAY' | 'STATUE_REQUIRED' | 'SECOND_STATUE_REQUIRED' | 'AFFECTION_WALL';

export const salonBuilding = (s: Pick<GameState, 'buildings'>) => s.buildings.find(b => b.kind === 'salon');
/** The rabbit is at the Salon de soins (away from its enclosure until the player welcomes it back). */
export const atSalon = (s: Pick<GameState, 'care'>, rabbitId: string): boolean => s.care?.rabbitId === rabbitId;
export const careReady = (s: Pick<GameState, 'care'>, now: number): boolean => !!s.care && s.care.endsAt <= now;
/** Away from its enclosure: on a trip or at the salon. */
export const away = (s: Pick<GameState, 'travel' | 'care'>, rabbitId: string): boolean => travelling(s, rabbitId) || atSalon(s, rabbitId);
/** Why a rabbit cannot leave for something else right now (trip, salon, nest), or null. */
export function rabbitAwayReason(s: GameState, rabbitId: string): 'TRAVELING' | 'AT_SALON' | 'PARENT_BUSY' | null {
  return travelling(s, rabbitId) ? 'TRAVELING' : atSalon(s, rabbitId) ? 'AT_SALON' : nestForParent(s, rabbitId) ? 'PARENT_BUSY' : null;
}
/** The daily cycle at `now`, the same one as the daily missions, even on a snapshot not yet advanced. */
export const giftCycle = (s: Pick<GameState, 'missions'>, now: number): number =>
  Math.max(s.missions.daily.cycleIndex, cycleIndexAt(s.missions.daily.referenceAt, now));
/** Why +1 affection from a gift would be refused, whatever the day: the maximum, a statue, or a wall. */
export function giftAffectionReason(s: Pick<GameState, 'buildings'>, affection: number): Exclude<GiftRefusal, 'GIFT_TODAY'> | null {
  if (affection >= BALANCE.maxAffection) return 'MAX_AFFECTION';
  if (affection >= affectionCap(s)) return statueReason(s);
  return isAffectionWall(affection) ? 'AFFECTION_WALL' : null;
}
/** The single rule shared by the salon, the picnic and the interface: null when this rabbit may receive a gift now. */
export function giftReason(s: Pick<GameState, 'buildings' | 'missions' | 'affectionGifts'>, rabbit: Pick<Rabbit, 'id' | 'affection'>, now: number): GiftRefusal | null {
  if (rabbit.affection >= BALANCE.maxAffection) return 'MAX_AFFECTION';
  if (s.affectionGifts?.[rabbit.id] === giftCycle(s, now)) return 'GIFT_TODAY';
  return giftAffectionReason(s, rabbit.affection);
}
/** Rabbits present in this enclosure (not travelling, not at the salon, not at the nest): the picnic's guests. */
export const presentRabbits = (s: GameState, enclosureId: string): Rabbit[] =>
  s.rabbits.filter(r => r.enclosureId === enclosureId && !rabbitAwayReason(s, r.id));
export interface PicnicQuote {guests: Rabbit[]; winners: Rabbit[]; price: number; xp: number; reason: Refusal | null}
/** Price, XP and the rabbits that will gain affection, before paying; `reason` is why the picnic is refused (money aside). */
export function picnicQuote(s: GameState, enclosureId: string, now: number, level: number): PicnicQuote {
  const guests = presentRabbits(s, enclosureId), winners = guests.filter(r => !giftReason(s, r, now));
  const price = guests.length * PICNIC.pricePerRabbit, xp = guests.length * PICNIC.xpPerRabbit;
  const reason: Refusal | null = level < PICNIC.unlockLevel ? 'LEVEL_REQUIRED' : s.picnicCycle === giftCycle(s, now) ? 'PICNIC_TODAY'
    : !guests.length ? 'EMPTY_ENCLOSURE' : !winners.length ? 'NO_GIFT_POSSIBLE' : null;
  return {guests, winners, price, xp, reason};
}
