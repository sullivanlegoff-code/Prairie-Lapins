import {it} from 'vitest';

/**
 * One test for a whole table (owner, 6 November 2026: « 3368 tests c'est trop »): every row is still checked, in order, and a failure
 * names its row, but the table counts as one test instead of one per row. Written and typed like `it.each`. Rows share one test, so
 * `beforeEach` does not run between them: a table whose rows need a fresh state stays with `it.each`.
 */
export const itAll = ((rows: readonly unknown[]) => (name: string, test: (...args: unknown[]) => unknown, timeout?: number) => {
  if (!rows.length) return;
  it(name.replace(/\s*(?:%[sdifjoO]|\$[\w.]+)/g, '').replace(/^[\s:]+/, ''), async () => {
    for (const row of rows) {
      try { await test(...(Array.isArray(row) ? row : [row])); } catch (error) {
        if (error instanceof Error) error.message = `[${label(row)}] ${error.message}`;
        throw error;
      }
    }
    // Each row keeps the time a test of its own would have had.
  }, (timeout ?? 30_000) * rows.length);
}) as unknown as typeof it.each;

function label(row: unknown): string {
  const text = typeof row === 'string' ? row : JSON.stringify(row) ?? String(row);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}
