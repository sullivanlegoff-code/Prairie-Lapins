import {describe, expect, it} from 'vitest';
import {advance, decodeGame, encodeGame} from '../src/simulation';
import {progressionFromXp} from '../src/simulation/progression';
import {PROGRESSION} from '../src/config/progression';

/**
 * Owner (8 November 2026), before the Christmas update goes out: « fais bien attention que les parties des joueurs actuelles ne
 * perdent pas leur progression ». These saves were written by the game published on GitHub Pages at that date (commit 8f1ae1b,
 * save format v22), from its own scenarios: the update must open them with everything the player had.
 * The one deliberate loss is the owner's decision of 5 November 2026: a nursery goes back to 2 cushions at most, no refund,
 * a cushion still holding a baby being kept.
 */
const files = import.meta.glob<string>('./fixtures/published-v22/*.json', {query: '?raw', import: 'default', eager: true});
const saves = Object.entries(files).map(([path, raw]) => ({name: path.split('/').pop()!, raw}));
const {slowdown: _new, ...publishedCurve} = PROGRESSION.curve;
const publishedLevel = (xp: number) => progressionFromXp(xp, {...PROGRESSION, curve: publishedCurve}).level;
type Saved = {pattes: number; grass: number; hearts: number; progression: {totalXp: number}; discovered: string[]; recipeBook: string[];
  acquiredParcels: string[]; rabbits: {id: string; species: string; affection?: number}[]; decorations: {id: string}[];
  buildings: {id: string; kind: string; nursery?: {capacity: number; babies: {slot: number}[]}}[]};

describe('saves of the game published before the Christmas update (v22)', () => {
  it('has the published saves to check', () => {
    expect(saves.length).toBeGreaterThanOrEqual(5);
    for (const {raw} of saves) expect(JSON.parse(raw).version).toBe(22);
  });

  for (const {name, raw} of saves) it(`opens ${name} with all of the player's progress`, () => {
    const old = JSON.parse(raw) as Saved, decoded = decodeGame(raw);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    const s = decoded.state;
    expect({pattes: s.pattes, grass: s.grass, hearts: s.hearts}).toEqual({pattes: old.pattes, grass: old.grass, hearts: old.hearts});
    expect(progressionFromXp(s.progression.totalXp).level).toBe(publishedLevel(old.progression.totalXp));
    expect(s.progression.totalXp).toBeGreaterThanOrEqual(old.progression.totalXp);
    expect(s.rabbits.map(r => [r.id, r.species, r.affection ?? 0])).toEqual(old.rabbits.map(r => [r.id, r.species, r.affection ?? 0]));
    expect([...s.discovered].sort()).toEqual([...old.discovered].sort());
    expect([...s.recipeBook].sort()).toEqual([...old.recipeBook].sort());
    expect([...s.acquiredParcels].sort()).toEqual([...old.acquiredParcels].sort());
    expect(s.decorations.map(d => d.id).sort()).toEqual(old.decorations.map(d => d.id).sort());
    expect(s.buildings.map(b => [b.id, b.kind])).toEqual(old.buildings.map(b => [b.id, b.kind]));
    for (const b of old.buildings) if (b.nursery) {
      const now = s.buildings.find(n => n.id === b.id)!.nursery!;
      expect(now.babies).toHaveLength(b.nursery.babies.length);
      expect(now.capacity).toBe(Math.min(b.nursery.capacity, Math.max(2, ...b.nursery.babies.map(baby => baby.slot + 1))));
    }
    // Played on: hours and days later, the game saves and reopens it without losing anything.
    for (const hours of [0, 8, 72]) {
      const later = advance(s, s.lastSimulatedAt + hours * 3_600_000), again = decodeGame(encodeGame(later));
      expect(again.ok).toBe(true);
      expect(later.rabbits.length).toBeGreaterThanOrEqual(s.rabbits.length);
      expect(later.progression.totalXp).toBeGreaterThanOrEqual(s.progression.totalXp);
    }
  });
});
