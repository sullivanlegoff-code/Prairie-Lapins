import {describe, expect, it} from 'vitest';
import {BREEDING_ODDS, GUARANTEE_SPECIES, RECIPE_SPECIES, SHOP_SPECIES, SPECIES, SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {RABBIT_TYPES, recipeSource} from '../src/config/species';
import {HABITAT_TYPES, HABITATS} from '../src/config/habitats';
import {BRANCH_MISSION_IDS, MAIN_MISSIONS, MAIN_MISSION_IDS} from '../src/config/missions';
import {PURCHASE_UNLOCK_IDS} from '../src/config/purchaseUnlocks';
import {GIFTED_RECIPES, RECIPE_BOOK_SPECIES, RECIPE_PRICES} from '../src/config/recipes';
import {PROGRESSION} from '../src/config/progression';
import {RABBIT_ART} from '../src/config/rabbitArt';
import {COATS} from '../src/config/rabbitCoats';
import {SCENARIOS, scenarioState, type ScenarioId} from '../src/dev/scenarios';
import {createGame} from '../src/simulation';
import {breedingDistributionWeights, breedingOdds, breedingWeights} from '../src/simulation/breeding';
import {collectionView, recipeBook} from '../src/ui/models';

const REMOVED = ['terre', 'mottelin', 'geant', 'brumelin'];
const REMOVED_WORDS = /Terre|Mottelin|Brumelin|Lapin Géant|terre|mottelin|brumelin|geant/;

describe('Terre, Mottelin, Géant and Brumelin are gone from every catalogue', () => {
  it('no registry, type, habitat, art, coat, mission, unlock, recipe or progression table names them', () => {
    for (const id of REMOVED) {
      expect(SPECIES_IDS as readonly string[], id).not.toContain(id); expect(Object.hasOwn(SPECIES, id), id).toBe(false);
      expect(SHOP_SPECIES as readonly string[]).not.toContain(id); expect(RECIPE_SPECIES as readonly string[]).not.toContain(id);
      expect(GUARANTEE_SPECIES as readonly string[]).not.toContain(id); expect(GIFTED_RECIPES as readonly string[]).not.toContain(id); expect(RECIPE_BOOK_SPECIES as readonly string[]).not.toContain(id);
      expect(Object.keys(RECIPE_PRICES)).not.toContain(id); expect(Object.keys(PROGRESSION.requirements.species)).not.toContain(id);
      expect(RABBIT_ART.map(art => art.species as string)).not.toContain(id); expect(Object.keys(COATS)).not.toContain(id);
      expect(Object.keys(BREEDING_ODDS).join('|')).not.toContain(id); expect(JSON.stringify(Object.values(BREEDING_ODDS))).not.toContain(id);
      expect(PURCHASE_UNLOCK_IDS as readonly string[]).not.toContain(id);
    }
    expect(RABBIT_TYPES as readonly string[]).not.toContain('terre'); expect(HABITAT_TYPES as readonly string[]).not.toContain('terre');
    expect(Object.keys(HABITATS)).not.toContain('terre'); expect(Object.keys(PROGRESSION.requirements.habitatCommons)).not.toContain('terre');
    expect(MAIN_MISSION_IDS as readonly string[]).not.toContain('discover-terre'); expect(MAIN_MISSION_IDS as readonly string[]).not.toContain('discover-brumelin');
    expect(BRANCH_MISSION_IDS as readonly string[]).not.toContain('discover-terre'); expect(BRANCH_MISSION_IDS as readonly string[]).not.toContain('discover-brumelin');
    expect(JSON.stringify(MAIN_MISSIONS)).not.toMatch(REMOVED_WORDS);
    for (const id of SPECIES_IDS) {
      const recipe = SPECIES[id].recipe; expect(JSON.stringify([SPECIES[id].types, recipe?.requiredTypes, recipe?.parents]), id).not.toMatch(REMOVED_WORDS);
    }
  });

  it('the kept species survive, with their levels, prices and acquisition untouched', () => {
    for (const id of ['paille', 'neige', 'feu', 'belier-gris', 'volant', 'frisket', 'icy', 'magicien', 'dragon'] as const) expect(SPECIES_IDS).toContain(id);
    expect(SHOP_SPECIES).toEqual(['paille', 'neige', 'feu', 'belier-gris', 'volant']);
    expect([SPECIES.feu.progression.unlockLevel, SPECIES['belier-gris'].progression.unlockLevel, SPECIES.volant.progression.unlockLevel, SPECIES.magicien.progression.unlockLevel, SPECIES.dragon.progression.unlockLevel]).toEqual([5, 7, 9, 11, 14]);
    expect(RECIPE_PRICES).toEqual({bouee: 150, 'feu-glace': 180, lunettes: 220, perroquet: 250, magicien: 450, dragon: 900});
  });

  it('a new game offers no recipe at the start and its collection, notebook and odds never name a removed species', () => {
    const s = createGame(0);
    expect(s.recipeBook).toEqual([]); expect(JSON.stringify(recipeBook(s, 0))).not.toMatch(REMOVED_WORDS);
    expect(JSON.stringify(collectionView(s))).not.toMatch(REMOVED_WORDS);
    expect(recipeBook(s, 0).map(r => r.species).sort()).toEqual([...RECIPE_SPECIES].sort());
    expect(JSON.stringify(s)).not.toMatch(REMOVED_WORDS);
  });

  it.each(Object.keys(SCENARIOS) as ScenarioId[])('the laboratory scenario %s names none of them', id => {
    expect(JSON.stringify(scenarioState(id, 3_600_000))).not.toMatch(REMOVED_WORDS);
  }, 60_000);
});

describe('what stays reachable', () => {
  /** Static reachability: sold species, then every recipe whose exact parents or required elements the species already reachable can provide. */
  function reachable() {
    const have = new Set<SpeciesId>(SHOP_SPECIES); let changed = true;
    while (changed) {
      changed = false;
      for (const id of SPECIES_IDS) {
        if (have.has(id)) continue;
        const source = recipeSource(SPECIES[id].acquisition); if (!source) continue;
        const owned = [...have], pairs = owned.flatMap((a, i) => owned.slice(i).map(b => [a, b] as const));
        const ok = pairs.some(([a, b]) => {
          const parentsOk = !source.parents || (a === source.parents[0] && b === source.parents[1]) || (a === source.parents[1] && b === source.parents[0]);
          const types = new Set([...SPECIES[a].types, ...SPECIES[b].types]);
          return parentsOk && (source.requiredTypes ?? []).every(type => types.has(type));
        });
        if (ok) { have.add(id); changed = true; }
      }
    }
    return have;
  }
  it('every remaining species can be obtained (sold, or bred from species that can be obtained) within the level range', () => {
    const have = reachable(); expect([...SPECIES_IDS].filter(id => !have.has(id))).toEqual([]);
    for (const id of SPECIES_IDS) expect(PROGRESSION.requirements.species[id], id).toBeLessThanOrEqual(PROGRESSION.curve.maximumLevel);
  });
  it('the remaining collection objectives (3, 5 and 7 species, one rare) and their purchase rights fit inside what can be obtained', () => {
    const count = reachable().size;
    for (const id of BRANCH_MISSION_IDS) {
      const condition = MAIN_MISSIONS[id].condition;
      if (condition.kind === 'discoveries') expect(condition.target, id).toBeLessThanOrEqual(count);
    }
    expect(MAIN_MISSIONS['seven-species'].condition).toMatchObject({kind: 'discoveries', target: 7});
    // Seven species without Volant, the species the 7th discovery unlocks: five Commons minus Volant, plus Frisket, Icy and more Rares by breeding.
    expect([...reachable()].filter(id => id !== 'volant').length).toBeGreaterThanOrEqual(7);
    expect([...reachable()].some(id => SPECIES[id].rarity === 'rare')).toBe(true);
  });
  it('the opening still leads to the two Rares: Paille + Neige is a 50/50 of Frisket and Icy, whatever the guarantee', () => {
    expect(breedingOdds('paille', 'neige')).toEqual({frisket: 50, icy: 50});
    expect(breedingDistributionWeights('paille', 'neige')).toEqual({frisket: 20, icy: 20});
  });
});

describe('distributions: only the removals and their renormalisation', () => {
  // Hand-written raw weights (Commons 40 when all their elements are present, each admissible recipe 20) of the unions that used to contain Brumelin.
  it.each([
    [['paille', 'feu-glace'], 2, 2, {paille: 40, neige: 40, feu: 40, frisket: 20, icy: 20, ardent: 20, snk: 20, 'wat-wat': 20, glassofeu: 20}],
    [['paille', 'feu-glace'], 4, 4, {paille: 40, neige: 40, feu: 40, 'feu-glace': 20, bouee: 20, frisket: 20, icy: 20, ardent: 20, snk: 20, 'wat-wat': 20, glassofeu: 20}],
    [['lunettes', 'feu-glace'], 4, 4, {paille: 40, neige: 40, feu: 40, 'belier-gris': 40, lunettes: 20, 'feu-glace': 20, bouee: 20, frisket: 20, icy: 20, ardent: 20, snk: 20, amethyste: 20, 'princesse-neige': 20, fluffy: 20, roukette: 20, 'wat-wat': 20, glassofeu: 20}],
  ] as const)('%j at affection %i/%i keeps its raw weights, with no Brumelin and nothing redistributed', (pair, a, b, expected) => {
    expect(breedingWeights(pair[0], pair[1], a, b)).toEqual(expected);
    const total = Object.values(expected).reduce((n, w) => n + w, 0);
    expect(breedingOdds(pair[0], pair[1], a, b)).toEqual(Object.fromEntries(Object.entries(expected).map(([id, w]) => [id, w * 100 / total])));
  });
  it('the unions that held Terre no longer exist, and Magicien and Dragon keep their probabilities', () => {
    expect(breedingOdds('belier-gris', 'volant', 6, 6)).toEqual({'belier-gris': 47.5, volant: 47.5, magicien: 5});
    expect(breedingOdds('perroquet', 'feu', 10, 10).dragon).toBe(2); expect(breedingOdds('magicien', 'belier-gris', 6, 6).magicien).toBe(5);
    expect(breedingOdds('paille', 'paille')).toEqual({paille: 100}); expect(breedingOdds('neige', 'neige')).toEqual({neige: 100});
  });
});
