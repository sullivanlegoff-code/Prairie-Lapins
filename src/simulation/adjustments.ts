import type {GameState} from '../state/types';
import type {SpeciesId} from '../config/balance';

/** Corrections decided by the owner in Supabase (table prairie_adjustments), applied by the game itself
 * to whichever save is current: the device's latest progress, a recovered online save or an imported file.
 * Each identifier is remembered in the save, so a correction is applied exactly once per save. */
export const ADJUSTMENT_KINDS = ['set_pattes', 'add_pattes', 'add_hearts', 'add_grass', 'plan_birth'] as const;
export type AdjustmentKind = typeof ADJUSTMENT_KINDS[number];
/** `plan_birth`: the next breeding that fulfils `species`' recipe gives that species, once (amount unused). */
export interface Adjustment {id: string; kind: AdjustmentKind; amount: number; species?: SpeciesId}
export const MAX_APPLIED_ADJUSTMENTS = 200;
export const ADJUSTMENT_LIMIT = 1_000_000_000;

export function pendingAdjustments(state: Pick<GameState, 'appliedAdjustments'>, list: readonly Adjustment[]): Adjustment[] {
  const done = new Set(state.appliedAdjustments ?? []);
  return list.filter(a => !done.has(a.id));
}
/** Pure: returns a new state, or the same one when nothing is pending. Resources never become negative. */
export function applyAdjustments(state: GameState, list: readonly Adjustment[]): GameState {
  const pending = pendingAdjustments(state, list);
  if (!pending.length) return state;
  const s = structuredClone(state);
  const clamp = (n: number) => Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, n));
  for (const a of pending) {
    if (a.kind === 'set_pattes') s.pattes = clamp(a.amount);
    else if (a.kind === 'add_pattes') s.pattes = clamp(s.pattes + a.amount);
    else if (a.kind === 'add_hearts') s.hearts = clamp(s.hearts + a.amount);
    else if (a.kind === 'plan_birth') { if (a.species) s.plannedBirth = a.species; }
    else s.grass = clamp(s.grass + a.amount);
  }
  s.appliedAdjustments = [...(s.appliedAdjustments ?? []), ...pending.map(a => a.id)].slice(-MAX_APPLIED_ADJUSTMENTS);
  return s;
}
