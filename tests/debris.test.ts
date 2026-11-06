import {describe, expect, it} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {EXTENSION_PRICES, purchasableParcels, extensionPrice} from '../src/config/land';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {DEBRIS, parcelDebris} from '../src/simulation/debris';
import type {Command, GameState} from '../src/state/types';

/** Debris on the parcels bought from the Christmas update on (owner, 5 November 2026). */
function run(s: GameState, command: Command, now = s.lastSimulatedAt, rng = () => .3) {
  const r = act(s, command, now, rng); if (!r.ok) throw Error(r.reason); return r.state;
}
function expanded() {
  const s = createGame(0); s.pattes = 1_000_000; s.progression = {totalXp: cumulativeLevelXp(25), rewardedThroughLevel: 25};
  const parcelId = purchasableParcels(s)[0], price = extensionPrice(s);
  return {before: s, s: run(s, {type: 'expand', parcelId, expectedCost: price}), parcelId, price};
}

describe('debris on a newly bought parcel', () => {
  it('puts six debris on it, two of each kind, worth about half its price', () => {
    const {before, s, price} = expanded();
    expect(before.debris ?? []).toEqual([]);
    expect(s.debris).toHaveLength(DEBRIS.perParcel);
    expect(new Set(s.debris!.map(d => d.kind))).toEqual(new Set(['rocher', 'buisson', 'herbes']));
    const total = s.debris!.reduce((sum, d) => sum + d.price, 0);
    expect(Math.abs(total - price * DEBRIS.share)).toBeLessThanOrEqual(DEBRIS.perParcel);
    expect(price).toBe(EXTENSION_PRICES[0]);
  });
  it('blocks the building placement on its cells until it is cleared for its price', () => {
    const {s} = expanded(), d = s.debris![0];
    expect(buildingPlacementReason(s, d.x, d.y)).toBe('DEBRIS_IN_THE_WAY');
    const cleared = run(s, {type: 'clearDebris', id: d.id});
    expect(cleared.pattes).toBe(s.pattes - d.price);
    expect(cleared.debris!.some(x => x.id === d.id)).toBe(false);
    expect(act(cleared, {type: 'clearDebris', id: d.id}, 0).ok).toBe(false);
  });
  it('spreads the debris without overlap inside the parcel', () => {
    const {s, parcelId} = expanded();
    const keys = new Set(s.debris!.map(d => `${d.x},${d.y}`)); expect(keys.size).toBe(DEBRIS.perParcel);
    let i = 0; const again = parcelDebris(parcelId, 1000, () => .99, () => `d${i++}`);
    expect(new Set(again.map(d => `${d.x},${d.y}`)).size).toBe(again.length);
  });
  it('survives a save', () => {
    const {s} = expanded(), decoded = decodeGame(encodeGame(s));
    expect(decoded.ok && decoded.state.debris).toEqual(s.debris);
  });
});
