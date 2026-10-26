/** Presentation only. Save fields and transactions still use the stable `pattes` and `grass` keys. */
export const COIN_URL = `${import.meta.env.BASE_URL}assets/currency/coin.png`;
export const HEART_URL = `${import.meta.env.BASE_URL}assets/currency/heart.png`;
export const HEART_TEXTURE = 'currency-heart';
export const COIN_TEXTURE = 'currency-coin';
/** The food logo (owner, 25 October 2026): a tied hay bale with a clover sprig, shown wherever food is named. */
export const FOOD_URL = `${import.meta.env.BASE_URL}assets/food/logo.png`;
export const FOOD_TEXTURE = 'food-logo';
const numbers = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 0});
export function formatCoinAmount(amount: number): string { return numbers.format(amount); }

// Existing message templates stay plain text. Only this renderer interprets currency
// units; imported names and messages are always appended as text, never HTML.
// « 12 pattes » becomes 12 and the coin; « 12 nourriture » becomes 12 and the food logo; a bare « nourriture » keeps its word after the logo.
const currency = /((?:[+−-]\s*)?\d(?:[\d   ]*\d)?(?:\s*\/\s*\d(?:[\d   ]*\d)?)?\s+)?\b(patte(?:s)?|nourriture|cœur(?:s)?)(?=$|[^\p{L}])/giu;
const isFood = (unit: string) => unit.toLowerCase() === 'nourriture';
function amountLabel(raw: string): string {
  return raw.trim().split(/\s*\/\s*/).map(part => {
    const sign = part.match(/^([+−-]\s*)/)?.[0] ?? '';
    const value = Number(part.slice(sign.length).replace(/[   ]/g, ''));
    return sign + formatCoinAmount(value);
  }).join(' / ');
}
export function coinAmount(amount?: number | string): HTMLSpanElement {
  const group = document.createElement('span'); group.className = 'coin-amount';
  if (amount !== undefined) group.append(document.createTextNode(typeof amount === 'number' ? formatCoinAmount(amount) : amountLabel(amount)));
  const icon = document.createElement('img'); icon.className = 'coin-icon'; icon.src = COIN_URL; icon.alt = ''; icon.setAttribute('aria-hidden', 'true'); icon.width = 20; icon.height = 20;
  const label = document.createElement('span'); label.className = 'sr-only'; label.textContent = amount === undefined ? 'pièces' : ' pièces';
  group.append(icon, label); return group;
}
export function heartIcon(): HTMLImageElement {
  const icon = document.createElement('img'); icon.className = 'heart-icon'; icon.src = HEART_URL; icon.alt = ''; icon.setAttribute('aria-hidden', 'true'); icon.width = 20; icon.height = 20; return icon;
}
export function heartCurrencyAmount(amount: string, word = 'cœurs'): HTMLSpanElement {
  const group = document.createElement('span'); group.className = 'heart-amount';
  const label = document.createElement('span'); label.className = 'sr-only'; label.textContent = ' ' + word;
  group.append(document.createTextNode(amountLabel(amount)), heartIcon(), label); return group;
}
function foodIcon(): HTMLImageElement {
  const icon = document.createElement('img'); icon.className = 'food-icon'; icon.src = FOOD_URL; icon.alt = ''; icon.setAttribute('aria-hidden', 'true'); icon.width = 20; icon.height = 20;
  return icon;
}
/** An amount of food: the number and the logo, the word kept for screen readers. */
export function foodAmount(amount: number | string): HTMLSpanElement {
  const group = document.createElement('span'); group.className = 'food-amount';
  group.append(document.createTextNode(typeof amount === 'number' ? formatCoinAmount(amount) : amountLabel(amount)), foodIcon());
  const label = document.createElement('span'); label.className = 'sr-only'; label.textContent = ' nourriture';
  group.append(label); return group;
}
/** The word « nourriture » inside a sentence: the logo, then the word. */
function foodWord(word: string): HTMLSpanElement {
  const group = document.createElement('span'); group.className = 'food-word'; group.append(foodIcon(), document.createTextNode(word)); return group;
}
export function setCurrencyText(host: HTMLElement, text: string): void {
  const fragments: (string | Node)[] = []; let offset = 0;
  for (const match of text.matchAll(currency)) {
    const amount = match[1]?.trim() || undefined;
    fragments.push(text.slice(offset, match.index), match[2].toLowerCase().startsWith('cœur') ? (amount ? heartCurrencyAmount(amount, match[2]) : match[2]) : isFood(match[2]) ? (amount ? foodAmount(amount) : foodWord(match[2])) : coinAmount(amount));
    offset = match.index! + match[0].length;
  }
  fragments.push(text.slice(offset)); host.replaceChildren(...fragments);
}
/** Accessible equivalent for plain-text consumers (e.g. a browser test name). */
export function currencyAccessibleText(text: string): string {
  return text.replace(currency, (_match, amount: string | undefined, unit: string) =>
    unit.toLowerCase().startsWith('cœur') ? (amount?.trim() ? `${amountLabel(amount)} ${unit}` : unit) : isFood(unit) ? (amount?.trim() ? `${amountLabel(amount)} nourriture` : unit) : amount?.trim() ? `${amountLabel(amount)} pièces` : 'pièces');
}
