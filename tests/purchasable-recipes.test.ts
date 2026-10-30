import {describe, expect, it} from 'vitest';
import {act, advance} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {decodeGame, encodeGame} from '../src/persistence/json';
import {breedingPool, chooseBirth} from '../src/simulation/breeding';
import {recipeKnown, recipePurchaseReason} from '../src/simulation/recipes';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {GIFTED_RECIPES, RECIPE_PRICES} from '../src/config/recipes';
import {PROGRESSION} from '../src/config/progression';
import {RECIPE_SPECIES, SPECIES, SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import type {Command, GameState} from '../src/state/types';
import {NEW_RARES} from './rabbit-art-fixtures';

const atLevel = (s: GameState, level: number) => { s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; return s; };
const buy = (species: SpeciesId): Command => ({type: 'buyRecipe', species});
function memory(raw: string | null = null) {
  const data = new Map<string, string>(raw === null ? [] : [[SAVE_KEY, raw]]), flags = {fail: ''}, writes: string[] = [];
  const storage: SaveStorage = {getItem: k => data.get(k) ?? null, setItem: (k, v) => { if (flags.fail === k) throw Error('quota'); data.set(k, v); writes.push(k); }};
  return {data, flags, writes, storage};
}

describe('recipe catalogue', () => {
  it('preserves the seven sold special recipes and unpriced Rares, with no gifted recipe (Brumelin is gone)', () => {
    expect(RECIPE_PRICES).toEqual({magicien: 450, dragon: 900, dadi: 450, maxou: 450, orange: 450, dinono: 450, requin: 900});
    expect(GIFTED_RECIPES).toEqual([]);
    for (const id of SPECIES_IDS) {
      const priced = RECIPE_PRICES[id] !== undefined, gifted = GIFTED_RECIPES.includes(id);
      if (SPECIES[id].recipe === null) expect([priced, gifted]).toEqual([false, false]);
      else if (id === 'bouee' || NEW_RARES.some(rare => rare.id === id)) expect([priced, gifted]).toEqual([false, false]);
      else expect(priced !== gifted).toBe(true);
    }
  });
  it('starts a new game knowing Paille by discovery only', () => {
    const s = createCentreStartGame(0);
    expect(s.recipeBook).toEqual([]);
    expect(SPECIES_IDS.filter(id => recipeKnown(s, id))).toEqual(['paille']);
  });
  it('reveals a discovered species for free and treats commons as known only once discovered', () => {
    const s = createCentreStartGame(0); s.discovered.push('boudinet', 'neige');
    expect(recipeKnown(s, 'boudinet')).toBe(true); expect(recipeKnown(s, 'neige')).toBe(true); expect(recipeKnown(s, 'feu')).toBe(false);
    s.recipeBook.push('feu'); expect(recipeKnown(s, 'feu')).toBe(false);
  });
});

describe('buyRecipe', () => {
  it('debits coins once, completes only the notebook milestone and records ownership without rabbit, birth, discovery or XP', () => {
    const s = advance(atLevel(createCentreStartGame(0), 11), 0); s.pattes = 1000; const before = structuredClone(s);
    const r = act(s, buy('magicien'), 0); if (!r.ok) throw Error(r.reason);
    expect(r.state.pattes).toBe(before.pattes - 450); expect(r.state.recipeBook).toEqual(['magicien']);
    expect(r.progressionGain).toBeUndefined(); expect(r.value).toBeUndefined();
    const {pattes: _p, recipeBook: _b, ...rest} = r.state, {pattes: _p0, recipeBook: _b0, ...restBefore} = before;
    expect(rest).toEqual({...restBefore, missions: {...before.missions, completed: [...before.missions.completed, 'first-paid-recipe']}});
    expect(r.state.missions.completed.filter(id => id === 'first-paid-recipe')).toHaveLength(1); expect(s).toEqual(before);
    const again = act(r.state, buy('magicien'), 0);
    expect(again).toEqual({ok: false, state: r.state, reason: 'RECIPE_KNOWN'}); expect(again.state.pattes).toBe(before.pattes - 450);
  });
  it.each<[string, (s: GameState) => void, Command, string]>([
    ['level below the species requirement', s => atLevel(s, 10), buy('magicien'), 'LEVEL_REQUIRED'],
    ['insufficient coins', s => { atLevel(s, 14); s.pattes = 899; }, buy('dragon'), 'NOT_ENOUGH_PATTES'],
    ['a recipe that is not sold', s => atLevel(s, 30), buy('frisket'), 'INVALID_CHOICE'],
    ['a discovered species', s => { atLevel(s, 30); s.discovered.push('magicien'); }, buy('magicien'), 'RECIPE_KNOWN'],
    ['a common', s => atLevel(s, 30), buy('neige'), 'INVALID_CHOICE'],
    ['an unknown identifier', s => atLevel(s, 30), buy('licorne' as SpeciesId), 'INVALID_CHOICE'],
    ['a heart complement', s => { atLevel(s, 30); s.pattes = 0; }, {type: 'payWithHearts', action: buy('magicien') as never, maxHearts: 99, maxPattes: 0}, 'INVALID_CHOICE'],
  ])('refuses %s without any change', (_name, prepare, command, reason) => {
    const s = createCentreStartGame(0); prepare(s); const before = structuredClone(s);
    expect(act(s, command, 0)).toEqual({ok: false, state: before, reason});
  });
  it('shares the purchase reason with the action and uses each species breeding level', () => {
    for (const id of RECIPE_SPECIES) if (RECIPE_PRICES[id] !== undefined) {
      const level = PROGRESSION.requirements.species[id];
      if (level > 1) expect(recipePurchaseReason(atLevel(createCentreStartGame(0), level - 1), id)).toBe('LEVEL_REQUIRED');
      expect(recipePurchaseReason(atLevel(createCentreStartGame(0), level), id)).toBeNull();
    }
  });
});

describe('breeding draw is independent of recipe knowledge', () => {
  it('produces identical pools and births with no recipe or every recipe owned', () => {
    for (const pity of [0, 9]) {
      const none = atLevel(createCentreStartGame(0), 30), all = atLevel(createCentreStartGame(0), 30);
      none.recipeBook = []; all.recipeBook = [...RECIPE_SPECIES]; none.pityFailures = all.pityFailures = pity;
      for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) for (const affection of [2, 4, 6, 10]) {
        const pool = breedingPool(none, a, b, affection, affection);
        expect(breedingPool(all, a, b, affection, affection)).toEqual(pool);
        if (pool.total) for (const roll of [0, 0.13, 0.5, 0.87, 0.999]) expect(chooseBirth(all, a, b, roll, affection, affection)).toEqual(chooseBirth(none, a, b, roll, affection, affection));
      }
    }
  }, 30000);
});

describe('recipe knowledge and the recipe book of a save', () => {
  it('keeps discoveries as free recipes without writing them into the book', () => {
    const s = createCentreStartGame(0); s.discovered.push('boudinet');
    expect(s.recipeBook).toEqual([]); expect(recipeKnown(s, 'boudinet')).toBe(true);
    expect(recipePurchaseReason(atLevel(s, 30), 'boudinet')).toBe('INVALID_CHOICE');
    const r = decodeGame(encodeGame(s)); if (!r.ok) throw Error(r.reason); expect(r.state.recipeBook).toEqual([]);
  });
  it.each([[['boudinet', 'boudinet']], [['paille']], [['licorne']], [['terre']], [['brumelin']], [[...RECIPE_SPECIES, 'mottelin']]])('rejects an invalid recipe book %j', recipeBook => {
    expect(decodeGame(JSON.stringify({...createCentreStartGame(0), recipeBook}))).toEqual({ok: false, reason: 'INVALID_STATE'});
  });
});

describe('controller purchase, reload and import', () => {
  const start = () => { const s = atLevel(createCentreStartGame(0), 11); s.pattes = 1000; return memory(encodeGame(s)); };
  it('persists payment and ownership together; a second press is refused without a second debit', () => {
    const m = start(), c = new GameController(m.storage, () => 0);
    const r = c.perform(buy('magicien')); expect(r.ok).toBe(true);
    expect(c.perform(buy('magicien'))).toMatchObject({ok: false, reason: 'RECIPE_KNOWN'});
    const saved = decodeGame(m.data.get(SAVE_KEY)!); if (!saved.ok) throw Error(saved.reason);
    expect([saved.state.pattes, saved.state.recipeBook]).toEqual([550,["magicien"]]); c.dispose();
    const reloaded = new GameController(m.storage, () => 0);
    expect([reloaded.getSnapshot().state!.pattes, reloaded.getSnapshot().state!.recipeBook]).toEqual([550,["magicien"]]); reloaded.dispose();
  });
  it('adopts neither payment nor ownership when the save fails, then permits one purchase', () => {
    const m = start(), c = new GameController(m.storage, () => 0); m.flags.fail = SAVE_KEY;
    expect(c.perform(buy('magicien'))).toEqual({ok: false, reason: 'ACTION_NOT_SAVED'});
    expect([c.getSnapshot().state!.pattes, c.getSnapshot().state!.recipeBook]).toEqual([1000,[]]);
    m.flags.fail = ''; expect(c.perform(buy('magicien')).ok).toBe(true);
    expect([c.getSnapshot().state!.pattes, c.getSnapshot().state!.recipeBook]).toEqual([550,["magicien"]]); c.dispose();
  });
  it('imports an export with its recipes and no repeated payment', () => {
    const source = new GameController(start().storage, () => 0); expect(source.perform(buy('magicien')).ok).toBe(true);
    const exported = source.exportGame(); if (!exported.ok) throw Error(exported.reason); source.dispose();
    const target = new GameController(memory().storage, () => 0), prepared = target.prepareImport(exported.json);
    if (!prepared.ok) throw Error(prepared.reason); expect(target.confirmImport(prepared.token, true)).toEqual({ok: true});
    expect([target.getSnapshot().state!.pattes, target.getSnapshot().state!.recipeBook]).toEqual([550,["magicien"]]); target.dispose();
  });
});
