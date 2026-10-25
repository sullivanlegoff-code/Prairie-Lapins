import {afterEach, expect, it, vi} from 'vitest';
import {createGame} from '../src/simulation';
import {recipeBook, recipePairs} from '../src/ui/models';
import * as breeding from '../src/simulation/breeding';

afterEach(() => vi.restoreAllMocks());
it('counts 1,225 pairs without calculating odds, then calculates only the requested three', () => {
  const s = createGame(0); s.recipeBook.push('frisket');
  s.rabbits = Array.from({length: 50}, (_, i) => ({...s.rabbits[0], id: `rabbit-${i + 2}`, species: 'frisket', affection: i < 2 ? 1 : 4}));
  const pool = vi.spyOn(breeding, 'breedingPool');
  const entry = recipeBook(s, 0).find(r => r.species === 'frisket')!;
  expect(entry.pairCount).toBe(1225); expect(pool).not.toHaveBeenCalled();
  const preview = recipePairs(s, 'frisket', 0, 3);
  expect(preview).toHaveLength(3); expect(pool).toHaveBeenCalledTimes(3);
  expect(preview.every(p => !p.feeding.length && !p.busy)).toBe(true);
  const all = entry.pairs;
  expect(all).toHaveLength(1225); expect(all.slice(0, 3)).toEqual(preview);
  expect(new Set(all.map(p => p.parents.join(':'))).size).toBe(1225);
  const calls = pool.mock.calls.length; expect(entry.pairs).toBe(all); expect(pool).toHaveBeenCalledTimes(calls);
});
