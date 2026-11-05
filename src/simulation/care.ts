import {BALANCE, PICNIC, SALON, isAffectionWall} from '../config/balance';
import {affectionCap, capReason, rabbitAffectionCap, statueReason, type CappedRabbit} from './affection';
import {nestForParent} from './breeding';
import {cycleIndexAt} from './missions';
import {travelling} from './travel';
import type {GameState, Rabbit, Refusal} from '../state/types';

/**
 * Affection gifts (owner, 2 November 2026): a care at the Salon de soins or a picnic. One gift per rabbit and per daily cycle,
 * +1 affection, never across a wall (14 → 15, 29 → 30, 49 → 50: those steps are won by feeding) and within the statues' cap.
 */
export type GiftRefusal = 'MAX_AFFECTION' | 'GIFT_TODAY' | 'EVOLUTION_REQUIRED' | 'STATUE_REQUIRED' | 'SECOND_STATUE_REQUIRED' | 'AFFECTION_WALL';

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
/** The cares that may still bring Hearts in the daily cycle at `now` (owner, 5 November 2026: two a day). */
export const salonHeartCaresLeft = (s: Pick<GameState, 'missions' | 'salonHearts'>, now: number): number =>
  Math.max(0, SALON.heartCaresPerCycle - (s.salonHearts?.cycle === giftCycle(s, now) ? s.salonHearts.cares : 0));
export const giftCycle = (s: Pick<GameState, 'missions'>, now: number): number =>
  Math.max(s.missions.daily.cycleIndex, cycleIndexAt(s.missions.daily.referenceAt, now));
/** Why +1 affection from a gift would be refused, whatever the day: the maximum, a statue, or a wall. */
export function giftAffectionReason(s: Pick<GameState, 'buildings'>, rabbit: number | CappedRabbit): Exclude<GiftRefusal, 'GIFT_TODAY'> | null {
  const affection = typeof rabbit === 'number' ? rabbit : rabbit.affection;
  if (affection >= BALANCE.maxAffection) return 'MAX_AFFECTION';
  // The evolution wall at 30 (src/simulation/affection.ts) comes before the statues.
  if (typeof rabbit !== 'number' && affection >= rabbitAffectionCap(s, rabbit)) return capReason(s, rabbit);
  if (affection >= affectionCap(s)) return statueReason(s);
  return isAffectionWall(affection) ? 'AFFECTION_WALL' : null;
}
/** The single rule shared by the salon, the picnic and the interface: null when this rabbit may receive a gift now. */
export function giftReason(s: Pick<GameState, 'buildings' | 'missions' | 'affectionGifts'>, rabbit: Pick<Rabbit, 'id'> & CappedRabbit, now: number): GiftRefusal | null {
  if (rabbit.affection >= BALANCE.maxAffection) return 'MAX_AFFECTION';
  if (s.affectionGifts?.[rabbit.id] === giftCycle(s, now)) return 'GIFT_TODAY';
  // A rabbit waiting for its evolution still receives its care or picnic, without +1: both are evolution challenges.
  const reason = giftAffectionReason(s, rabbit);
  return reason === 'EVOLUTION_REQUIRED' ? null : reason;
}
/** Rabbits present in this enclosure (not travelling, not at the salon, not at the nest): the picnic's guests. */
export const presentRabbits = (s: GameState, enclosureId: string): Rabbit[] =>
  s.rabbits.filter(r => r.enclosureId === enclosureId && !rabbitAwayReason(s, r.id));
const picnicGuests = (s: GameState, enclosureId: string, now: number) => {
  const guests = presentRabbits(s, enclosureId);
  return {guests, open: guests.filter(r => !giftReason(s, r, now))};
};
export interface PicnicQuote {guests: Rabbit[]; winners: Rabbit[]; price: number; xp: number; reason: Refusal | null}
/** Price, XP and the rabbits that will gain affection, before paying; `reason` is why the picnic is refused (money aside). */
export function picnicQuote(s: GameState, enclosureId: string, now: number, level: number): PicnicQuote {
  // Winners gain +1; a guest waiting for its evolution gains nothing but may still come (the picnic is one of its challenges).
  const open = picnicGuests(s, enclosureId, now), guests = open.guests, winners = open.open.filter(r => !giftAffectionReason(s, r));
  const price = guests.length * PICNIC.pricePerRabbit, xp = guests.length * PICNIC.xpPerRabbit;
  const reason: Refusal | null = level < PICNIC.unlockLevel ? 'LEVEL_REQUIRED' : s.picnicCycle === giftCycle(s, now) ? 'PICNIC_TODAY'
    : !guests.length ? 'EMPTY_ENCLOSURE' : !open.open.length ? 'NO_GIFT_POSSIBLE' : null;
  return {guests, winners, price, xp, reason};
}
