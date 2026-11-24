import {describe, expect, it} from 'vitest';
import type {SpeciesId} from '../src/config/balance';
import {EVOLUTION_CHALLENGES, evolutionChallengeLabel, evolutionChallengeTarget, evolutionChallengesComplete} from '../src/config/evolutionChallenges';
import {createGame, decodeGame, encodeGame, recordEvolutionAmount} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {buildingPlacementReason} from '../src/simulation/placement';
import type {GameState} from '../src/state/types';

// Owner, 24 November 2026: Peintre « Récolter 1000 pièces en jouant à Benny Rampage », Flocon de cristal « Faire 50 colonnes dans
// le perchoir de Benny ». Benny plays, so the amounts add up, game after game, for every rabbit of these species.
/** A universal level-3 enclosure (building-101) holding the given species at affection 30 (rabbit-110, rabbit-111, ...). */
function island(...species: SpeciesId[]): GameState {
  const s = createGame(0);
  const free = () => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y, undefined, 'enclosure')) return {x, y}; throw Error('No space'); };
  const c = free(); s.buildings.push(emptyBuilding('building-101', 'enclosure', c.x, c.y)); s.buildings.at(-1)!.habitat = {type: 'universal', level: 3};
  species.forEach((id, k) => { s.rabbits.push({id: `rabbit-${110 + k}`, species: id, affection: 30, enclosureId: 'building-101'}); if (!s.discovered.includes(id)) s.discovered.push(id); });
  s.nextId = 200; return s;
}
const progress = (s: GameState, id: string) => s.rabbits.find(r => r.id === id)!.evolution?.challenges ?? {};

describe('the Benny evolution challenges of Peintre and Flocon de cristal', () => {
  it('replaces one challenge of each, with the owner’s wording and targets', () => {
    expect(EVOLUTION_CHALLENGES.peintre).toEqual(['voyage', 'piquenique', 'rampage:1000']);
    expect(EVOLUTION_CHALLENGES['flocon-cristal']).toEqual(['soin', 'perchoir:50', 'parent']);
    expect(evolutionChallengeLabel('rampage:1000')).toBe('Récolter 1000 pièces en jouant à Benny Rampage');
    expect(evolutionChallengeLabel('perchoir:50')).toBe('Faire 50 colonnes dans le perchoir de Benny');
    expect(evolutionChallengeTarget('peintre', 'rampage:1000')).toBe(1000);
    expect(evolutionChallengeTarget('flocon-cristal', 'perchoir:50')).toBe(50);
  });
  it('adds the coins and columns of every game up to the target, for every rabbit of the species only', () => {
    const s = island('peintre', 'peintre', 'flocon-cristal', 'paille');
    recordEvolutionAmount(s, 'rampage', 600); recordEvolutionAmount(s, 'perchoir', 30);
    expect(progress(s, 'rabbit-110')).toEqual({'rampage:1000': 600});
    expect(progress(s, 'rabbit-111')).toEqual({'rampage:1000': 600});
    expect(progress(s, 'rabbit-112')).toEqual({'perchoir:50': 30});
    expect(progress(s, 'rabbit-113')).toEqual({});
    recordEvolutionAmount(s, 'rampage', 700); recordEvolutionAmount(s, 'perchoir', 25); recordEvolutionAmount(s, 'perchoir', 0);
    expect(progress(s, 'rabbit-110')).toEqual({'rampage:1000': 1000});
    expect(progress(s, 'rabbit-112')).toEqual({'perchoir:50': 50});
    const saved = decodeGame(encodeGame(s));
    expect(saved.ok && saved.state.rabbits.find(r => r.id === 'rabbit-110')!.evolution?.challenges).toEqual({'rampage:1000': 1000});
  });
  it('counts the amount only towards the target: the other challenges still have to be done', () => {
    expect(evolutionChallengesComplete('peintre', {'rampage:1000': 1000})).toBe(false);
    expect(evolutionChallengesComplete('peintre', {voyage: 1, piquenique: 1, 'rampage:1000': 999})).toBe(false);
    expect(evolutionChallengesComplete('peintre', {voyage: 1, piquenique: 1, 'rampage:1000': 1000})).toBe(true);
  });
  it('loads an older save: the replaced challenges are dropped, an evolved rabbit stays evolved', () => {
    const s = island('peintre', 'flocon-cristal', 'peintre');
    const raw = JSON.parse(encodeGame(s)), byId = (id: string) => raw.rabbits.find((r: {id: string}) => r.id === id);
    byId('rabbit-110').evolution = {challenges: {voyage: 1, quotidien: 1}};
    byId('rabbit-111').evolution = {done: true, challenges: {soin: 1, 'corde:20': 1, parent: 1}};
    byId('rabbit-112').evolution = {done: true, challenges: {voyage: 1, piquenique: 1, quotidien: 1}};
    const loaded = decodeGame(JSON.stringify(raw));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.rabbits.find(r => r.id === 'rabbit-110')!.evolution).toEqual({challenges: {voyage: 1}});
    expect(loaded.state.rabbits.find(r => r.id === 'rabbit-111')!.evolution).toEqual({done: true, challenges: {soin: 1, 'perchoir:50': 50, parent: 1}});
    expect(loaded.state.rabbits.find(r => r.id === 'rabbit-112')!.evolution).toEqual({done: true, challenges: {voyage: 1, piquenique: 1, 'rampage:1000': 1000}});
  });
  it('refuses a progress beyond the target', () => {
    const s = island('flocon-cristal');
    const raw = JSON.parse(encodeGame(s));
    raw.rabbits.find((r: {id: string}) => r.id === 'rabbit-110').evolution = {challenges: {'perchoir:50': 51}};
    expect(decodeGame(JSON.stringify(raw)).ok).toBe(false);
  });
});
