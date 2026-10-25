import {describe, it, expect} from 'vitest';
import {act, createGame, decodeGame, encodeGame} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {PARCEL_IDS, PARCELS, acquiredCell, acquiredFootprint, expansionTarget, extensionPrice, purchasableParcels, type ParcelId} from '../src/config/land';
import {FINE_GRID} from '../src/config/decorations';
import {buildingPlacementReason} from '../src/simulation/placement';
import {cumulativeLevelXp, requiredExtensionLevel} from '../src/simulation/progression';
import type {GameState} from '../src/state/types';
import meadowSource from '../src/display/MeadowScene.ts?raw';

/** Every extension rank unlocked and enough coins: only the island rule decides. */
const rich = (s: GameState) => {const level = requiredExtensionLevel(8); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; s.pattes = 500_000; return s;};
const expand = (s: GameState, parcelId: ParcelId) => act(s, {type: 'expand', parcelId, expectedCost: extensionPrice(s)}, 0);
const buy = (s: GameState, parcelId: ParcelId) => {const r = expand(s, parcelId); if (!r.ok) throw Error(`${parcelId}: ${r.reason}`); return r.state;};
const start = PARCELS.southwest;

describe('southwest start for new games', () => {
  it('starts on the southwest parcel, with the starter buildings valid on it', () => {
    const s = createGame(0);
    expect(s.islandStart).toBe('southwest');
    expect(s.acquiredParcels).toEqual(['southwest']);
    expect(s.buildings.map(b => [b.kind, b.x, b.y])).toEqual([['enclosure', 6, 40], ['nest', 2, 36], ['nursery', 10, 36]]);
    for (const b of s.buildings) {
      expect(acquiredFootprint(s, b.x, b.y, FINE_GRID, FINE_GRID)).toBe(true);
      expect(buildingPlacementReason(s, b.x, b.y, b.id)).toBeNull();
    }
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it('offers only the next parcel of the fixed order: first the right-hand neighbour', () => {
    const s = createGame(0);
    expect(purchasableParcels(s)).toEqual(['south']);
    expect(PARCELS.south).toEqual({...PARCELS.south, x: start.x + 4, y: start.y});
  });
  it('then grows toward the top', () => {
    const s = buy(buy(rich(createGame(0)), 'south'), 'west');
    expect(s.acquiredParcels).toEqual(['southwest', 'south', 'west']);
    expect(PARCELS.west).toEqual({...PARCELS.west, x: start.x, y: start.y - 4});
  });
  it('refuses any parcel out of order atomically, even a valid neighbour', () => {
    const s = rich(createGame(0));
    expect(expand(s, 'west')).toEqual({ok: false, state: s, reason: 'PARCEL_UNAVAILABLE'});
    expect(expand(s, 'center')).toEqual({ok: false, state: s, reason: 'PARCEL_UNAVAILABLE'});
    expect(expand(s, 'northeast')).toEqual({ok: false, state: s, reason: 'PARCEL_UNAVAILABLE'});
    expect(buy(s, 'south').acquiredParcels).toEqual(['southwest', 'south']);
  });
  it('never offers land left of or below the start: its left and front edges stay the island edges', () => {
    // The southwest parcel is the map's bottom-left corner, so these directions hold no parcel at all.
    let s = rich(createGame(0)), rank = 0;
    while (purchasableParcels(s).length) {
      for (const id of purchasableParcels(s)) expect(PARCELS[id].x >= start.x && PARCELS[id].y <= start.y).toBe(true);
      expect(extensionPrice(s)).toBe([600,1800,4500,9000,16000,26000,40000,60000][rank++]);
      s = buy(s, purchasableParcels(s).at(-1)!);
    }
    expect([...s.acquiredParcels].sort()).toEqual([...PARCEL_IDS].sort());
    for (let y = 0; y < 12; y++) expect(acquiredCell(s, -1, y)).toBe(false);
    for (let x = 0; x < 12; x++) expect(acquiredCell(s, x, 12)).toBe(false);
  });
  it('still applies the existing level gate to a valid neighbour', () => {
    const s = createGame(0); s.pattes = 5_000;
    expect(expand(s, 'south')).toMatchObject({ok: false, reason: 'LEVEL_REQUIRED'});
  });
});

describe('legacy centre-start islands', () => {
  it('keep the former any-direction purchases, including detached parcels', () => {
    const s = rich(createCentreStartGame(0));
    expect(s.islandStart).toBeUndefined();
    expect(purchasableParcels(s)).toEqual(PARCEL_IDS.filter(id => id !== 'center'));
    const detached = buy(buy(s, 'northwest'), 'southeast');
    expect(detached.acquiredParcels).toEqual(['center', 'northwest', 'southeast']);
    expect(buy(s, 'west').acquiredParcels).toEqual(['center', 'west']);
  });
  it('keep the legacy rule after a save without the marker', () => {
    const legacy = createCentreStartGame(0);
    const reloaded = decodeGame(encodeGame(legacy));
    if (!reloaded.ok) throw Error(reloaded.reason);
    expect(reloaded.state.islandStart).toBeUndefined();
    expect(buy(rich(reloaded.state), 'southwest').acquiredParcels).toEqual(['center', 'southwest']);
  });
});

describe('island start marker in saves', () => {
  it('round-trips and is validated against the owned parcels', () => {
    const s = createGame(0), raw = JSON.parse(encodeGame(s));
    expect(raw.islandStart).toBe('southwest');
    expect(decodeGame(JSON.stringify({...raw, acquiredParcels: ['center']}))).toEqual({ok: false, reason: 'INVALID_STATE'});
    expect(decodeGame(JSON.stringify({...raw, islandStart: 'north'}))).toEqual({ok: false, reason: 'INVALID_STATE'});
    const {islandStart: _start, ...unmarked} = raw;
    expect(decodeGame(JSON.stringify(unmarked))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
});

describe('Meadow expansion markers and taps', () => {
  it('select only purchasable parcels', () => {
    const s = createGame(0);
    expect(expansionTarget(s, 0, 4)).toBeNull();
    expect(expansionTarget(s, 4, 8)).toBe('south');
    expect(expansionTarget(s, 4, 4)).toBeNull();
    expect(expansionTarget(s, 8, 0)).toBeNull();
    expect(expansionTarget(s, 0, 8)).toBeNull();
    expect(expansionTarget(s, -1, 8)).toBeNull();
    expect(expansionTarget(createCentreStartGame(0), 0, 0)).toBe('northwest');
  });
  it('draws markers and resolves taps through the shared rule only', () => {
    expect(meadowSource).toContain('for (const id of purchasableParcels(this.current))');
    expect(meadowSource).toContain('expansionTarget(this.current,cell.x,cell.y)');
    expect(meadowSource).not.toContain('PARCEL_IDS.filter(id => !this.current!.acquiredParcels.includes(id))');
  });
});
