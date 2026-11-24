/** The player's « reduce motion » setting, read when asked (plan 6.2: one copy instead of seven). The meadow keeps its own query,
 * read on every frame (MeadowScene.ts). */
export const prefersReducedMotion = (): boolean => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
