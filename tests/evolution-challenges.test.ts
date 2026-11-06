import {describe, expect, it} from 'vitest';
import {SPECIES, SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {EVOLVED_ART} from '../src/config/evolvedArt';
import {EVOLUTION_CHALLENGES, expectedEvolutionChallengeCount} from '../src/config/evolutionChallenges';
import {MAIN_MISSIONS} from '../src/config/missions';
import {act, createGame, decodeGame, encodeGame, recordJumpRopeScore} from '../src/simulation';
import {showsEvolvedArt} from '../src/config/evolvedArt';

describe('evolution challenge catalogue', () => {
  it('uses the selected heart rewards for the two evolution milestones', () => {
    expect(MAIN_MISSIONS['evolve-first'].reward).toEqual({resource: 'hearts', amount: 3});
    expect(MAIN_MISSIONS['evolve-five'].reward).toEqual({resource: 'hearts', amount: 10});
  });
  it('covers exactly the 48 evolved species with 1, 2 or 3 challenges for each rarity', () => {
    const evolved = EVOLVED_ART.map(entry => entry.id).sort();
    expect(evolved).toHaveLength(48);
    expect(EVOLVED_ART.every(entry => entry.name.trim().length > 0)).toBe(true);
    expect(Object.keys(EVOLUTION_CHALLENGES).sort()).toEqual(evolved);
    for (const species of SPECIES_IDS) {
      const challenges = EVOLUTION_CHALLENGES[species];
      if (!challenges) continue;
      const expected = expectedEvolutionChallengeCount(SPECIES[species].rarity);
      expect(expected).not.toBeNull();
      if (expected !== null) expect(challenges).toHaveLength(expected);
      expect(challenges.length).toBeGreaterThanOrEqual(1);
      expect(challenges.length).toBeLessThanOrEqual(3);
    }
    // The owner's distribution of 4 November 2026 (checked in full in lot-b-evolution-missions.test.ts).
    expect(EVOLUTION_CHALLENGES.snk).toEqual(['voyage', 'quotidien']);
    expect(EVOLUTION_CHALLENGES.virvoletant).toEqual(['voyage', 'gouteur:chicken']);
    expect(EVOLUTION_CHALLENGES.egiiipte).toEqual(['voyage', 'voyage']);
  });

  it('records only qualifying jump-rope scores for the selected athlete', () => {
    const state = createGame(0);
    const athlete = {id: `rabbit-${state.nextId++}`, species: 'roukette' as SpeciesId, affection: 30, enclosureId: 'building-1'};
    const other = {id: `rabbit-${state.nextId++}`, species: 'paille' as const, affection: 30, enclosureId: 'building-1'};
    state.rabbits.push(athlete, other);
    expect(recordJumpRopeScore(state, athlete.id, 19)).toBe(true);
    expect(state.rabbits.find(rabbit => rabbit.id === athlete.id)?.evolution).toBeUndefined();
    expect(recordJumpRopeScore(state, athlete.id, 20)).toBe(true);
    expect(state.rabbits.find(rabbit => rabbit.id === athlete.id)?.evolution?.challenges?.['corde:20']).toBe(1);
    expect(state.rabbits.find(rabbit => rabbit.id === other.id)?.evolution).toBeUndefined();
    const before = structuredClone(state);
    expect(recordJumpRopeScore(state, athlete.id, 20.5)).toBe(false);
    expect(recordJumpRopeScore(state, 'rabbit-404', 20)).toBe(false);
    expect(state).toEqual(before);
  });

  it('only evolves an eligible rabbit after its own trip has been claimed', () => {
    const state = createGame(0), rabbitId = `rabbit-${state.nextId++}`;
    state.rabbits.push({id: rabbitId, species: 'paille', affection: 30, enclosureId: 'building-1'});
    const legacy = decodeGame(encodeGame(state));
    expect(legacy.ok && legacy.state.rabbits.find(rabbit => rabbit.id === rabbitId)?.evolution).toBeUndefined();
    expect(showsEvolvedArt(state.rabbits.find(rabbit => rabbit.id === rabbitId)!)).toBe(false);
    const refused = act(state, {type: 'evolveRabbit', rabbitId}, 0);
    expect(refused).toMatchObject({ok: false, reason: 'EVOLUTION_CHALLENGES'});
    state.travel = {welcomed: true, trips: [{rabbitId, destination: 'Paris', startedAt: -10, endsAt: 0, hearts: 1}]};
    const returned = act(state, {type: 'claimTrip', rabbitId}, 0);
    if (!returned.ok) throw Error(returned.reason);
    expect(returned.state.rabbits.find(rabbit => rabbit.id === rabbitId)?.evolution?.challenges?.voyage).toBe(1);
    const evolved = act(returned.state, {type: 'evolveRabbit', rabbitId}, 0);
    if (!evolved.ok) throw Error(evolved.reason);
    expect(evolved.state.rabbits.find(rabbit => rabbit.id === rabbitId)?.evolution?.done).toBe(true);
    const saved = decodeGame(encodeGame(evolved.state));
    expect(saved.ok && saved.state.rabbits.find(rabbit => rabbit.id === rabbitId)?.evolution).toEqual({done: true, challenges: {voyage: 1}});
    expect(saved.ok && showsEvolvedArt(saved.state.rabbits.find(rabbit => rabbit.id === rabbitId)!)).toBe(true);
  });
});
