/** Longest personal name, in Unicode characters (code points). */
export const MAX_RABBIT_NAME_LENGTH = 32;
/** Control characters, line breaks included, and the Unicode line/paragraph separators. */
const FORBIDDEN = /[\p{Cc}\p{Zl}\p{Zp}]/u;
/**
 * The one rule for a personal name, shared by the command, the save and the form. Returns the name to store (surrounding
 * spaces removed; accents, inner spaces and punctuation kept), `''` for "no name", or `null` when the entry is invalid.
 * The raw text is checked before trimming, so a trailing line break is refused instead of silently removed.
 */
export function normalizeRabbitName(raw: unknown): string | null {
  if (typeof raw !== 'string' || FORBIDDEN.test(raw)) return null;
  const name = raw.trim();
  return Array.from(name).length <= MAX_RABBIT_NAME_LENGTH ? name : null;
}
