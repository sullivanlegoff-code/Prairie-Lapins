import {describe, expect, it} from 'vitest';
import {createGame} from '../src/simulation';
import {breedingPool} from '../src/simulation/breeding';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {recipeKnown} from '../src/simulation/recipes';
import {RECIPE_SPECIES, SPECIES, SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {RARITY_NAMES, oddsTexts, oddsView, probabilityLabel, recipeBook, typeNames} from '../src/ui/models';
import type {GameState} from '../src/state/types';

const description = (id: SpeciesId) => `${typeNames(SPECIES[id].types)} · ${RARITY_NAMES[SPECIES[id].rarity]}`;
function game(level: number, pity: number, discovered: SpeciesId[], recipes: SpeciesId[]): GameState {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  s.pityFailures = pity; s.discovered = [...discovered]; s.recipeBook = [...recipes]; return s;
}
const knowledge: [string, SpeciesId[], SpeciesId[]][] = [
  ['no recipe', [], []],
  ['new game', ['paille'], []],
  ['mixed', ['paille', 'neige', 'feu', 'phoenix'], ['boudinet', 'magicien', 'dragon']],
];

describe('nest odds privacy over every pair', () => {
  it.each(knowledge)('%s: unknown results are summed exactly and never named or described', (_name, discovered, recipes) => {
    let checked = 0;
    for (const level of [5, 30]) for (const pity of [0, 9]) {
      const s = game(level, pity, discovered, recipes);
      for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) for (const affection of [2, 4, 6, 10]) {
        const pool = breedingPool(s, a, b, affection, affection), odds = oddsView(s, a, b, affection, affection), texts = oddsTexts(odds);
        const ids = Object.keys(pool.weights) as SpeciesId[], known = ids.filter(id => recipeKnown(s, id)), unknown = ids.filter(id => !recipeKnown(s, id));
        const unknownWeight = unknown.reduce((sum, id) => sum + pool.weights[id]!, 0);
        expect(known.reduce((sum, id) => sum + pool.weights[id]!, 0) + unknownWeight).toBe(pool.total);
        expect(odds.entries.map(e => e.name)).toEqual(known.map(id => SPECIES[id].name));
        expect(odds.unknown).toEqual(unknownWeight ? {weight: unknownWeight * 100 / pool.total, probability: probabilityLabel(unknownWeight, pool.total)} : null);
        expect(texts.lines).toEqual([...known.map(id => `${SPECIES[id].name} · ${description(id)} : ${probabilityLabel(pool.weights[id]!, pool.total)}`),
          ...(unknownWeight ? [`Résultats inconnus : ${probabilityLabel(unknownWeight, pool.total)}`] : [])]);
        const names = known.map(id => SPECIES[id].name).join(', ');
        expect(texts.summary).toBe(!pool.total ? texts.summary : `Résultats possibles : ${!unknownWeight ? names : names ? `${names} et des résultats inconnus` : 'inconnus'}.`);
        const hidden = [...unknown, ...pool.excluded.map(e => e.species).filter(id => !recipeKnown(s, id))];
        const all = [texts.summary, texts.guarantee, ...texts.excluded, ...texts.lines];
        for (const id of hidden) {
          // Two species may share a description (Lunettes and Boudinet are both "métal + paille · Rare"): a known line then shows it legitimately.
          if (!known.some(k => description(k) === description(id))) for (const text of all) expect(text).not.toContain(description(id));
          for (const text of texts.excluded) expect(text.startsWith(`${SPECIES[id].name} :`)).toBe(false);
        }
        expect(texts.excluded).toEqual([...pool.excluded.filter(e => recipeKnown(s, e.species)).map(e => `${SPECIES[e.species].name} : Niveau ${e.requiredLevel} requis · exclu du tirage actuel.`),
          ...(pool.excluded.some(e => !recipeKnown(s, e.species)) ? ['Certains résultats demandent un niveau supérieur · exclus du tirage actuel.'] : [])]);
        checked++;
      }
    }
    expect(checked).toBe(4 * SPECIES_IDS.length ** 2 * 4);
  }, 30000);
  it('matches the pre-privacy nest texts exactly when every result is known', () => {
    const s = game(5, 0, [...SPECIES_IDS], [...RECIPE_SPECIES]);
    for (const pity of [0, 9]) for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) for (const affection of [2, 4, 6, 10]) {
      s.pityFailures = pity;
      const pool = breedingPool(s, a, b, affection, affection), texts = oddsTexts(oddsView(s, a, b, affection, affection));
      // Former rendering: one line per drawn species, every exclusion named.
      expect(texts.lines).toEqual((Object.keys(pool.weights) as SpeciesId[]).map(id => `${SPECIES[id].name} · ${description(id)} : ${probabilityLabel(pool.weights[id]!, pool.total)}`));
      expect(texts.excluded).toEqual(pool.excluded.map(e => `${SPECIES[e.species].name} : Niveau ${e.requiredLevel} requis · exclu du tirage actuel.`));
      if (pool.total) expect(texts.summary).toBe(`Résultats possibles : ${[...new Set((Object.keys(pool.weights) as SpeciesId[]).map(id => SPECIES[id].name))].join(', ')}.`);
    }
  });
  it('gives a documented example: Dadi × Phoenix at affection 10', () => {
    const s = game(14, 0, ['dadi', 'phoenix'], []);
    expect(oddsTexts(oddsView(s, 'dadi', 'phoenix', 10, 10))).toEqual({"excluded":[],"guarantee":"Cette paire est admissible à la garantie.","lines":["Phoenix · feu + vol · Rare : 41/450 (≈ 9,11 %)","Dadi · neige + vol · Épique : 7,5 %","Résultats inconnus : 1501/1800 (≈ 83,39 %)"],"summary":"Résultats possibles : Phoenix, Dadi et des résultats inconnus."});
    s.recipeBook.push('dragon');
    expect(oddsTexts(oddsView(s, 'dadi', 'phoenix', 10, 10)).lines).toEqual(['Phoenix · feu + vol · Rare : 41/450 (≈ 9,11 %)', 'Lapin Dragon · feu + vol · Légendaire : 3 %', 'Dadi · neige + vol · Épique : 7,5 %', 'Résultats inconnus : 1447/1800 (≈ 80,39 %)']);
    const locked = game(13, 0, ['dadi', 'phoenix'], []);
    expect(oddsTexts(oddsView(locked, 'dadi', 'phoenix', 10, 10)).excluded).toEqual(['Certains résultats demandent un niveau supérieur · exclus du tirage actuel.']);
  });
});

describe('notebook model', () => {
  it('exposes conditions and compatible pairs only for known recipes', () => {
    const s = game(14, 0, ['dadi', 'phoenix'], []);
    s.buildings[0].habitat!.type = 'universal';
    s.rabbits = [{id: 'rabbit-2', species: 'dadi', affection: 10, enclosureId: 'building-1'}, {id: 'rabbit-6', species: 'phoenix', affection: 10, enclosureId: 'building-1'}]; s.nextId = 7;
    const dragon = () => recipeBook(s, 0).find(r => r.species === 'dragon')!;
    expect(dragon()).toMatchObject({known: false, discovered: false, price: 900, pairs: []}); expect(dragon()).not.toHaveProperty('minAffection');
    s.recipeBook.push('dragon');
    expect(dragon()).toMatchObject({known: true, discovered: false, price: 900, minAffection: 10}); expect(dragon().pairs).toHaveLength(1);
  });
});
