import {sendToNursery} from './manual-transfer';
import {establishHistoricalLevelRights} from '../src/simulation/levelRights';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {regressionStart as legacyGame} from './regression-start';
import {createMissions} from '../src/simulation/missions';
import {emptyBuilding} from '../src/state/initial';
import {describe, expect, it, vi} from 'vitest';
import {BALANCE, BREEDING_WEIGHTS, HISTORICAL_COMMON_WEIGHTS, LEGACY_SPECIES_IDS, MINUTE, RECIPE_SPECIES, SHOP_SPECIES, SPECIES, SPECIES_IDS, growthDuration, type SpeciesId} from '../src/config/balance';
import {act, advance,  decodeGame, encodeGame, pendingDiscoveries, rabbitIncome} from '../src/simulation';
import {breedingOdds, breedingPool, breedingWeights, chooseBirth} from '../src/simulation/breeding';
import {quoteAcceleration} from '../src/simulation/hearts';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {collectionView, nurseryView, oddsView, probabilityLabel, recipeBook} from '../src/ui/models';
import {knowEveryResult, knowRecipes} from './recipe-knowledge';
import {COATS, portrait} from '../src/ui/portraits';
import type {Command, GameState} from '../src/state/types';
import {stateBaby, welcomeOf} from './nursery-baby';
import {EXPECTED_IDS, EXPECTED_RECIPE_IDS, rareAdditions, shareLabel} from './rabbit-art-fixtures';

// These recipe/economy fixtures isolate non-level conditions; level filtering has its dedicated suite.
function createGame(now=0){const s=legacyGame(now);s.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};return s;}
const rares = [
  ['boudinet', 'paille', 'belier-gris'], ['phoenix', 'volant', 'feu'], ['glassofeu', 'feu', 'neige'],
] as const;
function run(s: GameState, command: Command, now = s.lastSimulatedAt, random = .99): GameState {
  const result = act(s, command, now, () => random); if (!result.ok) throw Error(result.reason); return result.state;
}
function couple(a: SpeciesId, b: SpeciesId, affectionA = 4, affectionB = 4): GameState {
  let s = createGame(0); s.pattes = 2000; s.grass = 200;
  s.rabbits[0].species = a; s.rabbits[1].species = b;
  s.rabbits[0].affection = affectionA; s.rabbits[1].affection = affectionB;
  s.discovered = [...new Set([a, b])];
  s = run(s, {type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20});
  return run(s, {type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20});
}
const breed: Command = {type: 'breed', parents: ['rabbit-2', 'rabbit-3']};
function memory(raw: string) {
  const data = new Map([[SAVE_KEY, raw]]);
  const storage: SaveStorage = {getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }};
  return {data, storage};
}

describe('species catalogue and acquisition', () => {
  it('contains five base types, five shop commons and the expected reproduction recipes, without rainbow nor Terre', () => {
    expect(SPECIES_IDS).toHaveLength(EXPECTED_IDS.length); expect(SHOP_SPECIES).toHaveLength(5); expect(RECIPE_SPECIES).toHaveLength(EXPECTED_RECIPE_IDS.length);
    expect(new Set(SPECIES_IDS.flatMap(id => SPECIES[id].types))).toEqual(new Set(['paille', 'neige', 'feu', 'metal', 'vol']));
    expect(SHOP_SPECIES.map(id=>SPECIES[id].price)).toEqual([80,80,180,350,600]);
  });
  it.each(['feu', 'belier-gris', 'volant'] as const)('purchases %s for 80 with immediate enclosure welcome and discovery', species => {
    const initial=createGame(0);initial.pattes=2000;const s = run(initial, {type: 'buyRabbit', species, enclosureId: 'building-1'});
    expect(s).toMatchObject({pattes: 2000-SPECIES[species].price!, hearts: 12});
    expect(s.rabbits[2]).toMatchObject({species, affection: 1, enclosureId: 'building-1'});
    expect(s.discovered).toContain(species);
    expect(decodeGame(encodeGame(s))).toEqual({ok: true, state: s});
  });
  it.each(rares)('refuses to buy %s without spending', (species) => {
    const s = createGame(0);
    expect(act(s, {type: 'buyRabbit', species, enclosureId: 'building-1'}, 0)).toEqual({ok: false, reason: 'INVALID_CHOICE', state: s});
  });
  it('keeps affection, income, building capacities, costs and established growth times', () => {
    expect(BALANCE).toMatchObject({minAffection: 1, maxAffection: 20, enclosureCapacity: 3, enclosureCap: BALANCE.enclosureCap, breedingCost: 0, breedingDuration: 20 * MINUTE});
    expect([rabbitIncome(1), rabbitIncome(20)]).toEqual([10, 29]);
    for (const id of SHOP_SPECIES) expect(growthDuration(id)).toBe(5 * MINUTE);
  });
});

describe('exact breeding pools', () => {
  it('keeps historical weights and adds the approved Rares to matching unions', () => {
    for (const a of LEGACY_SPECIES_IDS) for (const b of LEGACY_SPECIES_IDS) {
      const key = [...new Set([...SPECIES[a].types, ...SPECIES[b].types])].sort().join(',');
      // Same-type legacy pairs keep their historical common result; a mixed pair of commons gives no common result.
      expect(breedingWeights(a, b, 4, 20)).toEqual(key === 'neige,paille' ? {frisket:30,icy:30} : {[a]: HISTORICAL_COMMON_WEIGHTS[a]});
      expect(breedingOdds(a, b, 4, 20)).toEqual(breedingOdds(a, b, 2, 2));
    }
  });
  it('checks every unordered species pair at four affection combinations for symmetry, total and admissible draws', () => {
    for (let i = 0; i < SPECIES_IDS.length; i++) for (let j = i; j < SPECIES_IDS.length; j++) {
      const a = SPECIES_IDS[i], b = SPECIES_IDS[j];
      for (const [levelA, levelB] of [[2, 2], [2, 4], [4, 2], [4, 4]]) {
        const weights = breedingWeights(a, b, levelA, levelB), odds = breedingOdds(a, b, levelA, levelB);
        expect(weights).toEqual(breedingWeights(b, a, levelB, levelA));
        expect(odds).toEqual(breedingOdds(b, a, levelB, levelA));
        const sameCommon = SPECIES[a].rarity === 'common' && a === b;
        expect(Object.values(odds).reduce((x, y) => x + y, 0)).toBeCloseTo(Object.keys(weights).length ? 100 : 0, 12);
        if (sameCommon) expect(weights[a]).toBe(HISTORICAL_COMMON_WEIGHTS[a] ?? BREEDING_WEIGHTS.common);
        const total = Object.values(weights).reduce((x, y) => x + y, 0); let cursor = 0;
        for (const [id, weight] of Object.entries(weights)) {
          const roll = (cursor + weight / 2) / total;
          expect(chooseBirth(createGame(0), a, b, roll, levelA, levelB).species).toBe(id);
          expect(SPECIES[id as SpeciesId].types.every(t => [...SPECIES[a].types, ...SPECIES[b].types].includes(t))).toBe(true);
          cursor += weight;
        }
      }
    }
  }, 30000);
  it.each(rares)('admits %s only when both parents have affection 2', (rare, a, b) => {
    // Two common parents give only the matching non-common recipes; affection below 2 still excludes them.
    const elements = [...SPECIES[a].types, ...SPECIES[b].types];
    const expectOdds = (actual: Record<string, number>, weights: Record<string, number>) => {
      const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
      expect(Object.keys(actual).sort()).toEqual(Object.keys(weights).sort());
      for (const [id, w] of Object.entries(weights)) expect(actual[id]).toBeCloseTo(w * 100 / total, 10);
    };
    expectOdds(breedingOdds(a, b, 2, 2), rareAdditions(elements, 2, 2));
    expectOdds(breedingOdds(a, b, 4, 3), rareAdditions(elements, 4, 3));
    expectOdds(breedingOdds(a, b, 4, 4), {[rare]: 30, ...rareAdditions(elements, 4, 4)});
    const low = run(couple(a, b, 2, 2), breed, 0, rare === 'phoenix' ? .999 : 0);
    expect(low.buildings.find(x => x.breeding)!.breeding!.birth.species).not.toBe(rare);
    expect(low.pityFailures).toBe(0); expect(low.buildings.find(x => x.breeding)!.breeding!.birth.reservedDiscovery).toBe(true);
    expect(breedingWeights(a, b, 2, 1)[rare]).toBeUndefined();
  });
  it('normalizes a four-type pool while retaining eligible historical hybrids', () => {
    // A mixed pair of commons gives no common result: only the standard Rares of the union remain, all at weight 30.
    const rares = rareAdditions(['metal', 'paille', 'feu', 'neige'], 4, 4), total = 30 * Object.keys(rares).length;
    expect(breedingWeights('boudinet', 'glassofeu', 4, 4)).toEqual({...rares});
    expect(breedingWeights('boudinet', 'glassofeu', 2, 4)).toEqual({...rares});
    const odds = oddsView(knowEveryResult(createGame(0)), 'boudinet', 'glassofeu', 4, 4);
    expect(odds.entries.filter(e => e.weight === 100 * 30 / total)).toHaveLength(Object.keys(rares).length);
    expect(odds.entries.find(e => e.description === 'feu + neige · Rare')?.probability).toBe(shareLabel(30, total));
    expect(probabilityLabel(40, 180)).toBe('2/9 (≈ 22,22 %)');
  });
});

describe('extended guarantee and persisted rare births', () => {
  it.each(rares)('guarantees and reserves %s on the eighth eligible attempt, without discovering before welcome', (rare, a, b) => {
    // A mixed pair gives no Common, so each failure is a discovered Rare of the same pool (30-minute growth), which the guarantee does not reserve.
    const knownRare = {boudinet: 'roukette', phoenix: 'piment', glassofeu: 'wat-wat'} as const;
    const firstCommon = SPECIES_IDS.find(id => id === a || id === b)!;
    // As in every current save, a non-Common parent carries its saved income roll (decoding would otherwise add one).
    let s = couple(firstCommon, knownRare[rare]);s.rabbits.forEach(r => { if (SPECIES[r.species].rarity !== 'common') r.incomeRoll = 5000; });s.discovered.push(...SPECIES_IDS.filter(id=>SPECIES[id].rarity==='rare'&&id!==rare&&!s.discovered.includes(id)));
    for (let i = 0; i < 7; i++) {
      s = run(s, breed, s.lastSimulatedAt, rare === 'phoenix' ? .999 : 0);
      expect(s.pityFailures).toBe(i + 1);
      s = sendToNursery(s,s.lastSimulatedAt+20*MINUTE);
      s = run(s, welcomeOf(s, 'building-1'), s.lastSimulatedAt + growthDuration(knownRare[rare]));
      const duplicate = s.rabbits[2].id; s = run(s, {type: 'release', id: duplicate});
    }
    s = run(s, breed, s.lastSimulatedAt, 0);
    const birth = s.buildings.find(x => x.breeding)!.breeding!.birth;
    expect(birth).toMatchObject({species: rare, guaranteed: true, reservedDiscovery: true});
    expect(s.pityFailures).toBe(0); expect(s.discovered).not.toContain(rare); expect(pendingDiscoveries(s)).toEqual([rare]);
    const stored = memory(encodeGame(s)), rng = vi.fn(() => 0);
    const c = new GameController(stored.storage, () => s.lastSimulatedAt, rng);
    expect(c.getSnapshot().state).toEqual(s); expect(rng).not.toHaveBeenCalled();
    const growing = sendToNursery(advance(s, s.lastSimulatedAt + 20 * MINUTE));
    const baby = stateBaby(growing)!;
    expect(baby.birth).toEqual(birth); expect(baby.readyAt - baby.startedAt).toBe(30 * MINUTE);
    const q = quoteAcceleration(growing, 'building-5', 'growth', growing.lastSimulatedAt, stateBaby(growing)?.birth.id);
    expect(q).toMatchObject({ok: true, hearts: 6}); if (!q.ok) return;
    const ready = run(growing, {type: 'accelerate', id: 'building-5', stage: 'growth', jobKey: q.jobKey, maxHearts: 6, birthId: stateBaby(growing)!.birth.id});
    expect(ready.hearts).toBe(growing.hearts - q.hearts); expect(ready.rabbits).toHaveLength(2); expect(ready.discovered).not.toContain(rare);
    expect(stateBaby(ready)!.birth).toEqual(birth);
    expect(decodeGame(encodeGame(ready))).toEqual({ok: true, state: ready});
    ready.pityFailures = 5;
    const welcomed = run(ready, welcomeOf(ready, 'building-1'));
    expect(welcomed.discovered).toContain(rare); expect(welcomed.pityFailures).toBe(0);
    expect(welcomed.rabbits[2]).toMatchObject({id: birth.id, species: rare, affection: 1});
  });
  it('does not advance or consume a guarantee when rare recipes are excluded by affection', () => {
    let s = couple('feu', 'neige', 4, 3); s.discovered.push('wat-wat', 'glassofeu');s.pityFailures = 7;
    s = run(s, breed);
    expect(s.pityFailures).toBe(7); expect(s.buildings.find(b => b.breeding)!.breeding!.birth.guaranteed).toBe(false);
    expect(pendingDiscoveries(s)).toEqual([]);
  });
  it('splits a theoretical pool of three undiscovered recipes equally after affection filtering', () => {
    const s = createGame(0); s.discovered.push(...SPECIES_IDS.filter(id => !['boudinet', 'glassofeu', 'bouee'].includes(id) && !s.discovered.includes(id)));s.pityFailures = 7;
    const pool = breedingPool(s, 'boudinet', 'glassofeu', 4, 4);
    expect(pool.weights).toEqual({boudinet: 1, 'glassofeu': 1, bouee: 1}); expect(pool.total).toBe(3);
    expect([1/6, 3/6, 5/6].map(roll => chooseBirth(s, 'boudinet', 'glassofeu', roll, 4, 4).species)).toEqual(['glassofeu', 'boudinet', 'bouee']);
    // Below affection 2 on one parent no recipe of the guarantee is admissible: the guarantee does not apply.
    expect(breedingPool(s, 'boudinet', 'glassofeu', 4, 1)).toMatchObject({missing: [], eligible: false, guaranteed: false});
    const odds = oddsView(knowRecipes(s), 'boudinet', 'glassofeu', 4, 4); expect(odds.entries).toHaveLength(3); expect(odds.unknown).toBeNull();
    expect(odds.entries.every(e => e.probability === shareLabel(1, 3))).toBe(true);
  });
  it('starts the full rare growth only when an occupied nursery becomes available', () => {
    let s = sendToNursery(advance(run(couple('feu', 'neige'), breed),20 * MINUTE));
    s = run(s, breed); const waitingBirth = s.buildings.find(b => b.breeding)!.breeding!.birth;
    s = advance(s, 120 * MINUTE);
    expect(s.buildings.find(b => b.breeding)!.breeding!.birth).toEqual(waitingBirth);
    s = run(s, welcomeOf(s, 'building-1'));
    expect(stateBaby(s)).toBeNull();s=sendToNursery(s);
    expect(stateBaby(s)).toEqual({slot: 0, birth: waitingBirth, startedAt: 120 * MINUTE, readyAt: 150 * MINUTE});
  });
});

describe('catalogue, notebook, visuals and compatibility', () => {
  it('shows every entry and recipe without revealing an unknown portrait or pending outcome', () => {
    const s = couple('feu', 'neige');
    const a = run(s, breed, 0, 0), b = run(s, breed, 0, .99);
    expect(a.buildings.find(x => x.breeding)!.breeding!.birth.species).not.toBe(b.buildings.find(x => x.breeding)!.breeding!.birth.species);
    expect(collectionView(a)).toEqual(collectionView(b)); expect(collectionView(a)).toHaveLength(EXPECTED_IDS.length);
    // Equal public progression gives the same notebook whatever the secret birth.
    a.pityFailures = b.pityFailures;
    expect(recipeBook(a, 0)).toEqual(recipeBook(b, 0)); expect(recipeBook(a, 0)).toHaveLength(EXPECTED_RECIPE_IDS.length);
    const growing = sendToNursery(advance(b, 20 * MINUTE));
    expect(nurseryView(growing, 20 * MINUTE).babies).toEqual([{slot: 0, birthId: expect.any(String), stage: 'growing', startedAt: expect.any(Number), readyAt: 50 * MINUTE}]);
    // The last roll draws the last candidate of the Feu + Neige pool: the latest standard Rare of that union, else Feu Glacé.
    expect(nurseryView(growing, 50 * MINUTE).babies).toMatchObject([{stage: 'ready', species: Object.keys(rareAdditions(['feu', 'neige'], 4, 4)).at(-1) ?? 'glassofeu'}]);
  });
  it('explains feeding, compatible distinct parents, availability and possible versus guaranteed results', () => {
    const s = knowRecipes(couple('feu', 'neige', 1, 4));
    let recipe = recipeBook(s, 0).find(r => r.species === 'glassofeu')!;
    expect(recipe.pairs).toEqual([{parents: ['rabbit-2', 'rabbit-3'], feeding: ['rabbit-2'], busy: false, blocked:true, probability: '0 %', guaranteed: false, certain: false, possible: false}]);
    s.rabbits[0].affection = 4; recipe = recipeBook(s, 0).find(r => r.species === 'glassofeu')!;
    expect(recipe.pairs[0]).toMatchObject({probability: shareLabel(30, 30 * Object.keys(rareAdditions(['feu', 'neige'], 4, 4)).length), guaranteed: false, possible: true});
    s.discovered.push('wat-wat');s.pityFailures = 7; recipe = recipeBook(s, 0).find(r => r.species === 'glassofeu')!;
    expect(recipe.pairs[0]).toMatchObject({probability: '100 %', guaranteed: true, certain: true});
    const busy = run(s, breed);
    expect(recipeBook(busy, 0).find(r => r.species === 'glassofeu')!.pairs[0]).toMatchObject({busy: true, possible: false});
    expect(recipeBook(createGame(0), 0).find(r => r.species === 'boudinet')!.pairs).toEqual([]);
  });
  it('defines distinct original portraits and the six requested visual markers', () => {
    expect(new Set(SPECIES_IDS.map(id => portrait(id))).size).toBe(EXPECTED_IDS.length);
    expect(COATS.feu.flame).toBe(true); expect(COATS['belier-gris']).toMatchObject({lop: true, metal: true});
    expect(COATS.volant.wings).toBe(true); expect(SPECIES.boudinet.art.kind).toBe('static-sprite');
    expect(SPECIES.phoenix.art.kind).toBe('static-sprite'); expect(SPECIES.glassofeu.art.kind).toBe('static-sprite');
    expect(portrait()).not.toContain('feu'); expect(portrait()).toContain('>?</text>');
  });
  it('imports and exports a full current collection without new hearts or changed identifiers', () => {
    const complete = createGame(0);
    const pens = complete.buildings.filter(b => b.kind === 'enclosure');
    for (const pen of pens) pen.habitat!.level = 3;
    // Level-3 enclosures hold seven: add valid ones, on free cells, until the whole catalogue fits one rabbit per species.
    for (const [x, y] of [18, 22, 26, 30, 34, 38].flatMap(x => [28, 32, 16, 12].map(y => [x, y] as const))) {
      if (pens.length * 7 >= SPECIES_IDS.length) break;
      const home = emptyBuilding(`building-${complete.nextId++}`, 'enclosure', x, y); home.habitat!.level = 3; complete.buildings.push(home);
      try { encodeGame(complete); pens.push(home); } catch { complete.buildings.pop(); complete.nextId--; }
    }
    expect(pens.length * 7).toBeGreaterThanOrEqual(SPECIES_IDS.length);
    // Non-Common individuals carry their saved income roll, as every current save does (decoding would otherwise add one).
    complete.rabbits = SPECIES_IDS.map((species, index) => ({id: `rabbit-${complete.nextId++}`, species, affection: 1, enclosureId: pens[index % pens.length].id, ...(SPECIES[species].rarity === 'common' ? {} : {incomeRoll: 5000})}));
    complete.discovered = [...SPECIES_IDS]; complete.hearts = 7; complete.pityFailures = 0; complete.missions = createMissions(complete, complete.lastSimulatedAt);
    Object.assign(complete, advance(complete, complete.lastSimulatedAt)); // Bank the newly observable catalogue, with no resource/XP reward on import.
    const current = advance(createGame(complete.lastSimulatedAt), complete.lastSimulatedAt);establishHistoricalLevelRights(current);const saved = memory(encodeGame(current));
    const c = new GameController(saved.storage, () => complete.lastSimulatedAt);
    const preview = c.prepareImport(encodeGame(complete)); if (!preview.ok) throw Error(preview.reason);
    expect(c.getSnapshot().state).toEqual(current);
    expect(c.confirmImport(preview.token, true)).toEqual({ok: true});
    expect(c.getSnapshot().state).toEqual(complete);
    expect(decodeGame(encodeGame(c.getSnapshot().state!))).toEqual({ok: true, state: complete});
    const reloaded = new GameController(saved.storage, () => complete.lastSimulatedAt);
    expect(reloaded.getSnapshot().state).toEqual(complete); expect(collectionView(complete).every(e => e.known)).toBe(true);
  });
});
