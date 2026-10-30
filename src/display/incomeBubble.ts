import {INCOME_BUBBLE_THRESHOLD} from '../config/visual';

/** Presentation only: even a small full stock deserves a collection reminder. */
export function shouldShowIncomeBubble(amount: number, cap: number): boolean {
  return amount >= 1 && (amount >= INCOME_BUBBLE_THRESHOLD || amount >= cap);
}
