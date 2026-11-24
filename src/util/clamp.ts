/** `v` kept between `low` and `high` (0 and 1 by default); `low` wins if the bounds cross (plan 6.2: one copy instead of five). */
export const clamp = (v: number, low = 0, high = 1): number => Math.max(low, Math.min(high, v));
