/** Painted Cuisine art (ChatGPT, 1 November 2026), prepared by scripts/prepare-cuisine-art.mjs and bundled with the activity. */
import {recipe, type ItemDefinition, type RecipeId} from './recipes';

const FILES = import.meta.glob<string>('./art/*.webp', {eager: true, query: '?url', import: 'default'});
export const ART_URLS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(FILES).map(([path, url]) => [path.slice(6, -5), url]));
/** Picture key of an item in a state: `${art}-${state}` when painted, otherwise the item's single picture. */
export const artKey = (item: Pick<ItemDefinition, 'art' | 'state'>): string => item.state && ART_URLS[`${item.art}-${item.state}`] ? `${item.art}-${item.state}` : item.art;
export const artImage = (key: string, className = 'art-img'): string => `<img class="${className}" src="${ART_URLS[key] ?? ''}" alt="" draggable="false" decoding="async">`;
/** The finished dish of a recipe, as a small self-contained picture (rabbit-agnostic: hosts may reuse it). */
export function finishedDishArt(recipeId: RecipeId): string {
  return `<span class="cuisine-dish" data-dish="${recipeId}">${artImage(recipe(recipeId).dish)}</span>`;
}
export const BACKDROP_URL = ART_URLS.backdrop ?? '';
