import {describe, expect, it} from 'vitest';
import {act, createGame} from '../src/simulation';
import {growthDuration, BALANCE, MINUTE, SPECIES, type SpeciesId} from '../src/config/balance';
import {nurseryBuilding} from '../src/simulation/nursery';
import type {Command, GameState} from '../src/state/types';

const NOW = 10 * MINUTE;
const birth = (id: string) => ({id, species: 'paille' as const, guaranteed: false, reservedDiscovery: false});
/** A nursery with one baby in its first cushion; `readyAt` decides whether it is ready at NOW. */
function withBaby(readyAt: number): GameState {
  const s = createGame(0), nursery = nurseryBuilding(s)!;
  nursery.nursery!.babies = [{slot: 0, birth: birth('birth-7'), startedAt: readyAt - growthDuration('paille'), readyAt}];
  return s;
}
const release = (s: GameState, birthId: string) => act(s, {type: 'releaseBaby', birthId} as Command, NOW, () => .5);

describe('confier un lapereau prêt depuis la nurserie', () => {
  it('pays pattes and removes the ready baby, with no enclosure, XP, discovery or new rabbit', () => {
    const s = withBaby(NOW - 1), before = structuredClone(s);
    const r = release(s, 'birth-7');
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.pattes).toBe(before.pattes + BALANCE.releaseBabyPattes.common);
    expect(nurseryBuilding(r.state)!.nursery!.babies).toEqual([]);
    expect(r.state.rabbits).toEqual(before.rabbits);
    expect(r.state.discovered).toEqual(before.discovered);
    expect(r.state.progression).toEqual(before.progression);
    expect(s).toEqual(before);
  });
  it('refuses a baby still growing, and leaves the state untouched', () => {
    const s = withBaby(NOW + MINUTE), before = structuredClone(s);
    const r = release(s, 'birth-7');
    expect(r).toMatchObject({ok: false, reason: 'NOT_READY'});
    expect(r.state).toEqual(before);
  });
  it('refuses an unknown birth instead of substituting the baby present', () => {
    const s = withBaby(NOW - 1), before = structuredClone(s);
    const r = release(s, 'birth-404');
    expect(r).toMatchObject({ok: false, reason: 'STALE_ACTION'});
    expect(r.state).toEqual(before);
  });
  it.each([['rare', 100], ['epic', 500], ['legendary', 1000]] as const)('pays %s babies %i pattes', (rarity, price) => {
    const species = (Object.keys(SPECIES) as SpeciesId[]).find(id => SPECIES[id].rarity === rarity)!;
    const s = withBaby(NOW - 1); nurseryBuilding(s)!.nursery!.babies[0].birth.species = species;
    const r = release(s, 'birth-7');
    expect(r.ok && r.state.pattes - s.pattes).toBe(price);
  });
});
