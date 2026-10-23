/** Presentation only. Save fields and transactions still use the stable `pattes` key. */
export const COIN_URL = `${import.meta.env.BASE_URL}assets/currency/coin.png`;
export const COIN_TEXTURE = 'currency-coin';
const numbers = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 0});
export function formatCoinAmount(amount: number): string { return numbers.format(amount); }

// Existing message templates stay plain text. Only this renderer interprets currency
// units; imported names and messages are always appended as text, never HTML.
const currency = /((?:[+−-]\s*)?\d(?:[\d \u00a0\u202f]*\d)?(?:\s*\/\s*\d(?:[\d \u00a0\u202f]*\d)?)?\s+)?\bpatte(?:s)?\b/gi;
function amountLabel(raw: string): string {
  return raw.trim().split(/\s*\/\s*/).map(part => {
    const sign = part.match(/^([+−-]\s*)/)?.[0] ?? '';
    const value = Number(part.slice(sign.length).replace(/[ \u00a0\u202f]/g, ''));
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
export function setCurrencyText(host: HTMLElement, text: string): void {
  const fragments: (string | Node)[] = []; let offset = 0;
  for (const match of text.matchAll(currency)) {
    fragments.push(text.slice(offset, match.index), coinAmount(match[1]?.trim() || undefined));
    offset = match.index! + match[0].length;
  }
  fragments.push(text.slice(offset)); host.replaceChildren(...fragments);
}
/** Accessible equivalent for plain-text consumers (e.g. a browser test name). */
export function currencyAccessibleText(text: string): string {
  return text.replace(currency, (_match, amount: string | undefined) => amount?.trim() ? `${amountLabel(amount)} pièces` : 'pièces');
}
