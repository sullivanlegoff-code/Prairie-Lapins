import {describe, expect, it} from 'vitest';
import {SPECIES, SPECIES_IDS, HOUR, MINUTE, GUARANTEE_SPECIES, TRAVEL} from '../src/config/balance';
import {recipeSource} from '../src/config/species';
import {decodeGame, encodeGame, SAVE_VERSION} from '../src/persistence/json';
import {createGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {buildingPlacementReason} from '../src/simulation/placement';
import {habitatAccepts} from '../src/simulation/habitats';
import {scenarioState} from '../src/dev/scenarios';
import {mainProgress} from '../src/simulation/missions';

describe('catalogue v20', () => {
  it('aligns Dinono with type-recipe Epics while preserving its own level and art', () => {
    expect(SPECIES.dinono).toMatchObject({rarity: 'epic', types: ['feu', 'metal'], progression: {unlockLevel: 1}, art: {kind: 'static-sprite', file: 'assets/rabbits/dinono/dinono-v1.png'}});
    expect(recipeSource(SPECIES.dinono.acquisition)).toEqual({kind: 'recipe', requiredTypes: ['feu', 'metal'], knowledgePrice: 450, minAffection: 6, probability: 5});
    expect(GUARANTEE_SPECIES).not.toContain('dinono');
    expect(SPECIES_IDS.indexOf('dinono')).toBe(SPECIES_IDS.indexOf('orange') + 1);
  });
  it('puts rare Fire/Metal Bouee in the former Dinono slot', () => {
    expect(SPECIES.bouee).toMatchObject({types: ['feu', 'metal'], rarity: 'rare', progression: {unlockLevel: 1}, art: {kind: 'static-sprite', file: 'assets/rabbits/bouee/bouee-v1.png'}});
    expect(recipeSource(SPECIES.bouee.acquisition)).toEqual({kind: 'recipe', requiredTypes: ['feu', 'metal'], minAffection: 2, guaranteeEligible: true});
    const index = SPECIES_IDS.indexOf('bouee');
    expect(SPECIES_IDS.slice(index - 1, index + 2)).toEqual(['boudinet', 'bouee', 'egiiipte']);
    const s = createGame(0); s.discovered = [...GUARANTEE_SPECIES];
    expect(mainProgress(s, 'all-ordinary-rares')).toEqual({value: 20, target: 20});
    expect(mainProgress(s, 'first-rare')).toEqual({value: 1, target: 1});
  });
  it.each([16, 17, 18, 19])('converts retired species before validating the v%i migration chain', version => {
    const raw = JSON.parse(encodeGame(createGame(HOUR))); raw.version = version;
    if (version === 16) delete raw.rewardedDecorationModels;
    raw.rabbits[0].species = 'lunettes'; raw.discovered = ['lunettes']; raw.recipeBook = ['lunettes'];
    const result = decodeGame(JSON.stringify(raw));
    expect(result.ok).toBe(true); if (!result.ok) throw Error(result.reason);
    // Non-Common individuals receive their saved income roll on decode (json.ts), so it is compared separately.
    expect(result.state.rabbits[0]).toEqual({...raw.rabbits[0], species: 'boudinet', incomeRoll: expect.any(Number)});
    expect(result.state.discovered).toEqual(['boudinet']); expect(result.state.recipeBook).toEqual([]);
    expect(result.state.pattes).toBe(raw.pattes + 220);
    expect(decodeGame(encodeGame(result.state))).toEqual(result);
  });
  it.each(['lunettes', 'feu-glace', 'perroquet'])('keeps a converted pending %s discovery hidden', species => {
    const raw = JSON.parse(encodeGame(scenarioState('nurseryStates', HOUR))); raw.version = 19;
    const baby = raw.buildings.find((b: {kind: string}) => b.kind === 'nursery').nursery.babies[1];
    baby.birth = {...baby.birth, species, guaranteed: true, reservedDiscovery: true};
    baby.startedAt = HOUR; baby.readyAt = HOUR + 30 * MINUTE;
    const result = decodeGame(JSON.stringify(raw));
    expect(result.ok).toBe(true); if (!result.ok) throw Error(result.reason);
    expect(result.state.discovered).toEqual(raw.discovered);
    expect(decodeGame(encodeGame(result.state))).toEqual(result);
  });
  it('still rejects unknown species and retired IDs written in the current format', () => {
    for (const version of [19, 20]) for (const species of version === 19 ? ['unknown-rabbit'] : ['unknown-rabbit', 'lunettes']) {
      const raw = JSON.parse(encodeGame(createGame(0))); raw.version = version; raw.rabbits[0].species = species;
      expect(decodeGame(JSON.stringify(raw))).toEqual({ok: false, reason: 'INVALID_STATE'});
    }
  });
  it('converts owned rabbits, a traveller, nest and nursery births without losing their data', () => {
    const s = scenarioState('collection', HOUR);
    const free = () => {
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y};
      throw Error('no free cell');
    };
    const pos = free(), agency = emptyBuilding(`building-${s.nextId++}`, 'agency', pos.x, pos.y);
    s.buildings.push(agency);
    const old = JSON.parse(encodeGame(s)); old.version = 19;
    const mapping = [['lunettes', 'boudinet'], ['feu-glace', 'glassofeu'], ['perroquet', 'phoenix']] as const;
    const before = mapping.map(([retired, replacement], i) => {
      const rabbit = old.rabbits.find((r: {species: string}) => r.species === replacement);
      rabbit.species = retired; rabbit.name = `Ami ${i}`; rabbit.affection = 7 + i;
      return {...rabbit, species: replacement};
    });
    const traveller = before[2];
    old.travel = {welcomed: true, trips: [{rabbitId: traveller.id, destination: TRAVEL.destinations[0], startedAt: HOUR, endsAt: 4 * HOUR, hearts: 1}]};
    old.discovered = [...old.discovered.filter((id: string) => !mapping.some(([, replacement]) => id === replacement)), ...mapping.map(([id]) => id)];
    old.recipeBook.push(...mapping.map(([id]) => id));
    old.levelAccessTransition.rights.push(...mapping.map(([id]) => ({target: {family: 'species', id, action: 'breedingResult'}, source: 'legacy-discovery'})));
    const nest = old.buildings.find((b: {kind: string}) => b.kind === 'nest');
    const nursery = old.buildings.find((b: {kind: string}) => b.kind === 'nursery');
    nest.breeding = {parents: before.slice(0, 2).map(r => r.id), startedAt: HOUR, endsAt: HOUR + 20 * MINUTE, birth: {id: `birth-${old.nextId++}`, species: 'lunettes', guaranteed: true, reservedDiscovery: true}};
    nursery.nursery = {capacity: 3, babies: mapping.slice(1).map(([id], slot) => ({slot, birth: {id: `birth-${old.nextId++}`, species: id, guaranteed: true, reservedDiscovery: true}, startedAt: HOUR, readyAt: HOUR + 30 * MINUTE}))};
    const result = decodeGame(JSON.stringify(old));
    expect(result.ok).toBe(true); if (!result.ok) throw Error(result.reason);
    expect(result.state.version).toBe(SAVE_VERSION);
    expect(result.state.travel).toEqual(old.travel);
    for (const rabbit of before) expect(result.state.rabbits.find(r => r.id === rabbit.id)).toEqual(rabbit);
    for (const [retired, replacement] of mapping) {
      expect(result.state.discovered).not.toContain(retired); expect(result.state.discovered).toContain(replacement);
      expect(result.state.recipeBook).not.toContain(retired);
    }
    expect(result.state.buildings.find(b => b.kind === 'nest')!.breeding!.birth).toEqual({...nest.breeding.birth, species: 'boudinet'});
    expect(result.state.buildings.find(b => b.kind === 'nursery')!.nursery!.babies.map(b => b.birth.species)).toEqual(['glassofeu', 'phoenix']);
    expect(JSON.stringify(result.state.levelAccessTransition)).not.toMatch(/lunettes|feu-glace|perroquet/);
    expect(decodeGame(encodeGame(result.state))).toEqual(result);
  });
  it.each([0, 1])('keeps Bouee in its Paille home and an existing Dinono growth (slot %i)', slot => {
    const s = scenarioState('nurseryStates', HOUR), raw = JSON.parse(encodeGame(s)); raw.version = 19;
    raw.rabbits[0].species = 'bouee'; raw.discovered.push('bouee');
    const baby = raw.buildings.find((b: {kind: string}) => b.kind === 'nursery').nursery.babies[slot];
    baby.startedAt = baby.readyAt - 30 * MINUTE;
    baby.birth = {...baby.birth, species: 'dinono', guaranteed: true, reservedDiscovery: true};
    const result = decodeGame(JSON.stringify(raw));
    expect(result.ok).toBe(true); if (!result.ok) throw Error(result.reason);
    expect(result.state.rabbits[0]).toEqual({...raw.rabbits[0], incomeRoll: expect.any(Number)});
    const home = result.state.buildings.find(b => b.id === raw.rabbits[0].enclosureId)!;
    expect(habitatAccepts(home, 'bouee')).toBe(false);
    expect(result.state.buildings.find(b => b.kind === 'nursery')!.nursery!.babies[slot]).toEqual({...baby, birth: {...baby.birth, guaranteed: false, reservedDiscovery: false}});
    expect(decodeGame(encodeGame(result.state))).toEqual(result);
  });
  it('keeps every supported checked-in test save readable without editing the files', () => {
    const files = import.meta.glob('../docs/test-saves/**/*.json', {query: '?raw', import: 'default', eager: true}) as Record<string, string>;
    for (const [file, json] of Object.entries(files)) {
      const version = JSON.parse(json).version;
      if ([16, 17, 18, 19, 20].includes(version)) expect(decodeGame(json).ok, file).toBe(true);
      else expect(decodeGame(json), file).toEqual({ok: false, reason: 'INCOMPATIBLE_CATALOG'});
    }
  });
});
