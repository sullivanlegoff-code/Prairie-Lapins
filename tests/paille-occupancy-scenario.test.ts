import {expect, it} from 'vitest';
import {SCENARIOS, scenarioState} from '../src/dev/scenarios';
import {decodeGame, encodeGame} from '../src/simulation';
import {habitatAccepts, habitatEntryReason, habitatStats} from '../src/simulation/habitats';
import {buildingFootprint, buildingPlacementReason} from '../src/simulation/placement';

it('compares identical illustrated Paille homes with 1, 2 and 3 compatible adults in a valid save', () => {
  expect(SCENARIOS.pailleOccupancy).toBe('Paille — occupation de l’habitat illustré');
  const s = scenarioState('pailleOccupancy', 3_600_000);
  expect(s.buildings).toHaveLength(3);
  expect(s.rabbits).toHaveLength(6);
  expect(s.decorations).toEqual([]);
  for (const [index, home] of s.buildings.entries()) {
    expect(home.kind).toBe('enclosure');
    expect(home.habitat).toEqual({type: 'paille', level: 1});
    expect(buildingFootprint(home)).toEqual({x: 18 + index * 8, y: 24, width: 4, height: 4});
    expect(buildingPlacementReason(s, home.x, home.y, home.id)).toBeNull();
    const adults = s.rabbits.filter(r => r.enclosureId === home.id);
    expect(adults).toHaveLength(index + 1);
    expect(adults.every(r => r.species === 'paille' && r.affection === 2 && habitatAccepts(home, r.species))).toBe(true);
    expect(habitatStats(home).capacity).toBe(3);
    expect(habitatEntryReason(s, home, 'paille')).toBe(index === 2 ? 'CAPACITY_FULL' : null);
    expect(habitatEntryReason(s, home, 'neige')).toBe('TYPE_INCOMPATIBLE');
  }
  expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
});
