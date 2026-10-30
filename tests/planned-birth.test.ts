import {describe, expect, it} from 'vitest';
import {act, decodeGame, encodeGame} from '../src/simulation';
import {scenarioState} from '../src/dev/scenarios';
import {applyAdjustments, type Adjustment} from '../src/simulation/adjustments';
import {adjustmentRows} from '../src/cloud/gateway';
import {breedingOdds} from '../src/simulation/breeding';
import type {SpeciesId} from '../src/config/balance';
import type {GameState} from '../src/state/types';

const PLAN: Adjustment = {id: '33333333-3333-4333-8333-333333333333', kind: 'plan_birth', amount: 0, species: 'dadi'};
const NOW = 1_790_000_000_000;
function pair(a: SpeciesId, b: SpeciesId): {state: GameState; parents: [string, string]} {
  const state = scenarioState('reproduction', NOW);
  const [x, y] = state.rabbits.filter(r => r.affection >= 2);
  x.species = a; y.species = b; x.affection = y.affection = 10;
  for (const id of [a, b]) if (!state.discovered.includes(id)) state.discovered.push(id);
  return {state, parents: [x.id, y.id]};
}
function breed(state: GameState, parents: [string, string], roll: number) {
  const r = act(state, {type: 'breed', parents}, NOW, () => roll);
  if (!r.ok) throw new Error(r.reason);
  return {state: r.state, species: r.state.buildings.find(b => b.kind === 'nest')!.breeding!.birth.species};
}

describe('naissance programmée par le propriétaire', () => {
  it('le prochain croisement Feu + Métal donne Dadi, une seule fois', () => {
    const {state, parents} = pair('amethyste', 'paille');
    // Without the plan, this roll never gives Dadi for this pair.
    const odds = breedingOdds('amethyste', 'paille', 10, 10);
    expect(odds.dadi).toBeGreaterThan(0); expect(breed(state, parents, 0).species).not.toBe('dadi');
    const planned = applyAdjustments(state, [PLAN]);
    expect(planned.plannedBirth).toBe('dadi');
    const first = breed(planned, parents, 0);
    expect(first.species).toBe('dadi'); expect(first.state.plannedBirth).toBeUndefined();
    const nest = first.state.buildings.find(b => b.kind === 'nest')!.breeding!.birth;
    expect([nest.guaranteed, nest.reservedDiscovery]).toEqual([false, false]);
    // Applying the same correction again changes nothing: the plan was used.
    expect(applyAdjustments(first.state, [PLAN])).toBe(first.state);
    const decoded = decodeGame(encodeGame(first.state)); expect(decoded.ok).toBe(true);
  });
  it('un croisement sans Feu et Métal ne consomme pas le plan', () => {
    const {state, parents} = pair('paille', 'neige');
    const planned = applyAdjustments(state, [PLAN]);
    const r = breed(planned, parents, 0);
    expect(r.species).not.toBe('dadi'); expect(r.state.plannedBirth).toBe('dadi');
  });
  it('le plan survit à la sauvegarde, et une espèce inconnue est refusée', () => {
    const planned = applyAdjustments(pair('feu', 'belier-gris').state, [PLAN]);
    const decoded = decodeGame(encodeGame(planned));
    expect(decoded.ok && decoded.state.plannedBirth).toBe('dadi');
    expect(decodeGame(JSON.stringify({...planned, plannedBirth: 'licorne'})).ok).toBe(false);
  });
  it('le jeu ne lit que des plans valides venus de Supabase', () => {
    expect(adjustmentRows([
      {id: PLAN.id, owner_id: 'p', kind: 'plan_birth', amount: 0, species: 'dadi'},
      {id: '44444444-4444-4444-8444-444444444444', owner_id: 'p', kind: 'plan_birth', amount: 0, species: 'licorne'},
      {id: '55555555-5555-4555-8555-555555555555', owner_id: 'p', kind: 'plan_birth', amount: 0, species: 'paille'},
      {id: '66666666-6666-4666-8666-666666666666', owner_id: 'p', kind: 'plan_birth', amount: 0},
    ], 'p')).toEqual([PLAN]);
  });
});
