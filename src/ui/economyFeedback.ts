import {CUISINE_FULL_REWARDS_PER_CYCLE, CUISINE_TIP, HEARTS, SPECIES, type SpeciesId} from '../config/balance';
import type {GameState} from '../state/types';
import {cycleIndexAt} from '../simulation/missions';

export function cuisineRemaining(s: GameState, now: number): number {
  const used = s.cuisine.fullRuns?.cycle === cycleIndexAt(s.missions.daily.referenceAt, now) ? s.cuisine.fullRuns.used : 0;
  return Math.max(0, CUISINE_FULL_REWARDS_PER_CYCLE - used);
}
export function cuisineQuotaText(s: GameState, now: number): string {
  const left = cuisineRemaining(s, now);
  return left ? `Encore ${left} récompense${left > 1 ? 's' : ''} complète${left > 1 ? 's' : ''} aujourd’hui`
    : `Récompense complète épuisée : pourboire de ${CUISINE_TIP.pattes} pattes et ${CUISINE_TIP.grass} nourriture jusqu’à demain`;
}
export function heartGift(s: Pick<GameState, 'nextHeartGiftAt'>, now: number) {
  const gifts = now < s.nextHeartGiftAt ? 0 : Math.min(HEARTS.maximumGifts, 1 + Math.floor((now - s.nextHeartGiftAt) / HEARTS.giftInterval));
  return {gifts, amount: gifts * HEARTS.gift, text: gifts ? `${gifts} cadeau${gifts > 1 ? 'x' : ''} · ${gifts * HEARTS.gift} cœurs` : 'Aucun cadeau prêt'};
}
/** Only the fourteen illustrated ordinary rares have a free type hint. */
export function recipeHint(id: SpeciesId): string | null {
  const info = SPECIES[id];
  if (info.rarity !== 'rare' || info.art.kind !== 'static-sprite' || info.acquisition.some(a => a.kind === 'recipe' && a.knowledgePrice !== undefined)) return null;
  const names = {paille:'Paille',neige:'Neige',feu:'Feu',metal:'Métal',vol:'Vol', 'arc-en-ciel':'Arc-en-ciel'};
  return info.recipe?.requiredTypes ? `Indice : ${info.recipe.requiredTypes.map(t => names[t]).join(' × ')}` : null;
}
export function orderReadyText(endsAt: number): string {
  const date = new Date(endsAt);
  return `Prête vers ${date.getHours()} h ${String(date.getMinutes()).padStart(2, '0')}`;
}
