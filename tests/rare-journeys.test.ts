import {describe, expect, it, vi} from 'vitest';
import {SPECIES, SPECIES_ENTRIES, SPECIES_IDS, type SpeciesId} from '../src/config/species';
import {validateSpeciesEntries} from '../src/config/validateSpecies';
import {GUARANTEE_SPECIES, MINUTE, growthDuration} from '../src/config/balance';
import {RECIPE_PRICES, GIFTED_RECIPES} from '../src/config/recipes';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {breedingWeights, breedingOdds, breedingPool, recipeMatches, chooseBirth} from '../src/simulation/breeding';
import {collectionView, nurseryView} from '../src/ui/models';
import {habitatEntryReason} from '../src/simulation/habitats';
import {regressionStart} from './regression-start';
import {sendToNursery} from './manual-transfer';
import {stateBaby} from './nursery-baby';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {NEW_RARES, STANDARD_RARE, type RareSheet} from './rabbit-art-fixtures';
import type {GameState, Command} from '../src/state/types';

/** One common species per element, written out here independently of the registry. */
const COMMON_OF: Record<string, SpeciesId> = {paille: 'paille', neige: 'neige', feu: 'feu', metal: 'belier-gris', vol: 'volant'};
function run(s: GameState, command: Command, now = 0) {const r = act(s, command, now, () => .99); if (!r.ok) throw Error(r.reason); return r.state;}
function reload(s: GameState) {const decoded = decodeGame(encodeGame(s)); expect(decoded).toEqual({ok: true, state: s}); if (!decoded.ok) throw Error(decoded.reason); return decoded.state;}
/** A nest and a nursery with two adult parents of the sheet's exact-union species, both at the standard minimum affection. */
function parentsOf(sheet: RareSheet) {
  let s = regressionStart(0); const [a, b] = sheet.exactUnion.parents;
  s.rabbits[0].species = a as SpeciesId; s.rabbits[1].species = b as SpeciesId; s.discovered = [a, b] as SpeciesId[];
  s.progression = {totalXp: cumulativeLevelXp(30), rewardedThroughLevel: 30}; s.rabbits.forEach(r => r.affection = STANDARD_RARE.minAffection);
  s = run(s, {type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20});
  return run(s, {type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20});
}
/** Cumulative-weight geometry of the exact pool: [id, start, end) on the unit interval, from the sheet only. */
function segments(sheet: RareSheet) {
  const total = sheet.exactUnion.weights.reduce((sum, [, w]) => sum + w, 0); let cursor = 0;
  return sheet.exactUnion.weights.map(([id, w]) => {const segment = {id, start: cursor / total, end: (cursor + w) / total}; cursor += w; return segment;});
}

it('keeps every new Rare entry valid in the registry', () => {
  expect(validateSpeciesEntries(SPECIES_ENTRIES)).toEqual([]);
});

describe.each(NEW_RARES.map(sheet => [sheet.id, sheet] as const))('approved Rare %s', (_id, sheet) => {
  const id = sheet.id as SpeciesId, [first, second] = sheet.requiredTypes;
  it('is a Rare reproduction recipe with standard growth, no price, gift, guarantee, coat or fixed percentage', () => {
    expect(SPECIES_IDS).toContain(id);
    expect(SPECIES[id]).toEqual({name: sheet.name, description: sheet.description, types: [...sheet.types], rarity: 'rare', price: null,
      progression: {unlockLevel: STANDARD_RARE.unlockLevel}, acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: [...sheet.requiredTypes], minAffection: STANDARD_RARE.minAffection}],
      recipe: {requiredTypes: [...sheet.requiredTypes], minAffection: STANDARD_RARE.minAffection}, art: sheet.art});
    expect([15, 20, 25, 30].map(minutes => minutes * MINUTE)).toContain(growthDuration(id)); expect(RECIPE_PRICES[id]).toBeUndefined();
    expect(GIFTED_RECIPES).not.toContain(id); expect(GUARANTEE_SPECIES).toContain(id);
    expect(act(parentsOf(sheet), {type: 'buyRabbit', species: id, enclosureId: 'building-1'}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
  });
  it('accepts both orders and both elements on one parent, checks both affection thresholds, and excludes missing elements', () => {
    for (const [a, b] of [[COMMON_OF[first], COMMON_OF[second]], [id, COMMON_OF.paille], [id, id]] as const) for (const [x, y] of [[a, b], [b, a]] as const) {
      expect(recipeMatches(id, x, y)).toBe(true); expect(breedingWeights(x, y, 2, 2)[id]).toBe(STANDARD_RARE.weight);
      expect(breedingWeights(x, y, 1, 2)[id]).toBeUndefined(); expect(breedingWeights(x, y, 2, 1)[id]).toBeUndefined();
    }
    for (const [a, b] of [[COMMON_OF[first], COMMON_OF[first]], [COMMON_OF[second], COMMON_OF[second]]] as const) {
      expect(recipeMatches(id, a, b)).toBe(false); expect(breedingWeights(a, b, 20, 20)[id]).toBeUndefined();
    }
    const s = parentsOf(sheet); s.rabbits[0].affection = 1; const before = encodeGame(s), rng = vi.fn(() => .99);
    expect(act(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']}, 0, rng).ok).toBe(false); expect(encodeGame(s)).toBe(before); expect(rng).not.toHaveBeenCalled();
  });
  it('gives the exact pool of its element union, with exact draw boundaries, and is never part of a guaranteed draw', () => {
    const s = parentsOf(sheet), expected = Object.fromEntries(sheet.exactUnion.weights), total = sheet.exactUnion.weights.reduce((sum, [, w]) => sum + w, 0);
    const [a, b] = sheet.exactUnion.parents;
    for (const [x, y] of [[a, b], [b, a]] as const) {
      expect(Object.entries(breedingWeights(x as SpeciesId, y as SpeciesId, 2, 2))).toEqual(sheet.exactUnion.weights);
      for (const [species, w] of sheet.exactUnion.weights) expect(breedingOdds(x as SpeciesId, y as SpeciesId, 2, 2)[species as SpeciesId]).toBeCloseTo(w * 100 / total, 10);
      expect(breedingPool(s, x as SpeciesId, y as SpeciesId, 2, 2)).toMatchObject({weights: expected, total, guaranteed: false});
      for (const {id: species, start, end} of segments(sheet)) for (const roll of [start, (start + end) / 2, end - Number.EPSILON]) expect(chooseBirth(s, x as SpeciesId, y as SpeciesId, roll, 2, 2).species).toBe(species);
    }
    s.pityFailures = 7;
    for (const x of SPECIES_IDS) for (const y of SPECIES_IDS) {
      const pool = breedingPool(s, x, y, 4, 4); if (pool.guaranteed && pool.missing.includes(id)) expect(pool.weights[id]).toBe(1);
    }
  });
  it('saves a single draw without rerolling, transfers, grows, welcomes compatibly and reveals the description only on discovery', () => {
    const nest = growthDuration(id), s = parentsOf(sheet), own = segments(sheet).find(segment => segment.id === id)!, roll = (own.start + own.end) / 2;
    s.recipeBook.push(id); expect(JSON.stringify(collectionView(s))).not.toContain(sheet.description);
    const rng = vi.fn(() => roll), data = new Map([[SAVE_KEY, encodeGame(s)]]), storage = {getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => {data.set(k, v);}};
    const controller = new GameController(storage, () => 0, rng); expect(controller.perform({type: 'breed', parents: ['rabbit-2', 'rabbit-3']}).ok).toBe(true);
    let born = controller.getSnapshot().state!; const birth = born.buildings.find(b => b.breeding)!.breeding!.birth;
    expect(birth).toMatchObject({species: id, guaranteed: false, reservedDiscovery: true}); expect(rng).toHaveBeenCalledTimes(1); controller.dispose();
    const noDraw = vi.fn(() => 0), reloaded = new GameController(storage, () => 0, noDraw); expect(reloaded.getSnapshot().state).toEqual(born); expect(noDraw).not.toHaveBeenCalled(); reloaded.dispose();
    expect(JSON.stringify(collectionView(born))).not.toContain(sheet.description); born = reload(sendToNursery(advance(born, nest)));
    const grown = nest + growthDuration(id);
    expect(stateBaby(born)).toEqual({slot: 0, birth, startedAt: nest, readyAt: grown});
    expect(nurseryView(born, nest).babies).toEqual([{slot: 0, birthId: birth.id, stage: 'growing', startedAt: nest, readyAt: grown}]);
    born = reload(advance(born, grown)); const home = born.buildings[0];
    for (const type of ['paille', 'feu', 'universal', 'neige', 'metal', 'vol'] as const) {
      home.habitat!.type = type; expect(habitatEntryReason(born, home, id)).toBe([...sheet.types, 'universal'].includes(type) ? null : 'TYPE_INCOMPATIBLE');
    }
    home.habitat!.type = 'universal'; const xp = born.progression.totalXp; born = reload(run(born, {type: 'welcome', enclosureId: home.id, birthId: birth.id}, grown));
    expect(born.rabbits.at(-1)).toMatchObject({species: id, affection: 1, enclosureId: home.id}); expect(born.progression.totalXp - xp).toBe(STANDARD_RARE.birthXp+250);
    expect(collectionView(born).find(e => e.known && e.species === id)).toEqual({known: true, species: id, name: sheet.name, description: sheet.description});
  });
});
