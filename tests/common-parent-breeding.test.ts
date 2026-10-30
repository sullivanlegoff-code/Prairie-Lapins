// @vitest-environment happy-dom
import html from '../index.html?raw';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {BALANCE, HISTORICAL_COMMON_WEIGHTS, HOUR, MINUTE, SPECIES, SPECIES_IDS, type SpeciesId} from '../src/config/balance';
import {createCentreStartGame} from '../src/state/initial';
import {act, decodeGame, encodeGame} from '../src/simulation';
import {breedingDistributionWeights, breedingPool, breedingWeights, chooseBirth, commonResultAllowed} from '../src/simulation/breeding';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {stateLevelAccess} from '../src/simulation/levelRights';
import {GameController} from '../src/application/GameController';
import {SAVE_KEY} from '../src/persistence/storage';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {oddsTexts, oddsView} from '../src/ui/models';
import type {Command, GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const COMMONS = ['paille', 'neige', 'feu', 'belier-gris', 'volant'] as const;
const command: Extract<Command, {type: 'breed'}> = {type: 'breed', parents: ['rabbit-2', 'rabbit-6']};
function parents(a: SpeciesId, b: SpeciesId, affection = 2, level = 30): GameState {
  const s = createCentreStartGame(0); s.buildings[0].habitat!.type = 'universal';
  s.rabbits = [{id: 'rabbit-2', species: a, affection, enclosureId: 'building-1'}, {id: 'rabbit-6', species: b, affection, enclosureId: 'building-1'}];
  s.nextId = 7; s.discovered = [...new Set([a, b])];
  s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  return s;
}
const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false; document.getElementById('loading-screen')!.hidden = true;
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Common results require two Common parents of the same single type', () => {
  it('excludes Commons for every other catalogue pair at every affection threshold', () => {
    for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) for (const affection of [2, 6, 10, 15, 20]) {
      const allowed = SPECIES[a].rarity === 'common' && SPECIES[b].rarity === 'common'
        && SPECIES[a].types.length === 1 && SPECIES[b].types.length === 1 && SPECIES[a].types[0] === SPECIES[b].types[0];
      expect(commonResultAllowed(a,b)).toBe(allowed);
      const commons = Object.keys(breedingWeights(a,b,affection,affection)).filter(id => SPECIES[id as SpeciesId].rarity === 'common');
      expect(commons).toEqual(allowed ? [a] : []);
    }
  });
  it('checks every Common pair, levels, affection bonuses, guarantee and actual cumulative interval boundaries', () => {
    expect(SPECIES_IDS.filter(id => SPECIES[id].rarity === 'common')).toEqual([...COMMONS]);
    let pairs = 0, draws = 0;
    for (let i = 0; i < COMMONS.length; i++) for (let j = i; j < COMMONS.length; j++)
      for (const level of [1, 5, 7, 9, 10, 11, 14, 15, 30]) for (const affection of [2, 6, 10, 15, 20]) for (const pity of [0, 7]) {
        const a = COMMONS[i], b = COMMONS[j], s = parents(a, b, affection, level); s.pityFailures = pity;
        const pool = breedingPool(s, a, b, affection, affection); pairs++;
        expect(pool.weights).toEqual(breedingPool(s, b, a, affection, affection).weights);
        const sameCommonAccessible = a === b && stateLevelAccess(s,{family:'species',id:a,action:'breedingResult'}).accessible;
        expect(Object.keys(pool.weights).some(id => SPECIES[id as SpeciesId].rarity === 'common')).toBe(sameCommonAccessible);
        if (a === b) {
          const weight = HISTORICAL_COMMON_WEIGHTS[a] ?? 30;
          if (!sameCommonAccessible) { expect(pool).toMatchObject({weights:{},total:0,eligible:false,guaranteed:false}); continue; }
          expect(pool).toMatchObject({weights: {[a]: weight}, total: weight, eligible: false, guaranteed: false});
          expect(chooseBirth(s,a,b,.99,affection,affection).species).toBe(a); continue;
        }
        expect(pool.total).toBeGreaterThan(0);
        let cursor = 0;
        for (const [id, weight] of Object.entries(pool.weights)) {
          // Midpoint of each weight and both extreme RNG values exercise real persisted births.
          const roll = (cursor + weight / 2) / pool.total;
          expect(chooseBirth(s, a, b, roll, affection, affection).species).toBe(id);
          for (const edge of [cursor / pool.total + 1e-12, (cursor + weight) / pool.total - 1e-12])
            expect(chooseBirth(s, a, b, edge, affection, affection).species).toBe(id);
          const result = act(s, command, 0, () => roll); if (!result.ok) throw Error(result.reason);
          expect(result.state.buildings.find(building => building.kind === 'nest')!.breeding!.birth.species).toBe(id); draws++;
          cursor += weight;
        }
        for (const roll of [0, 1 - Number.EPSILON]) {
          const result = act(s, command, 0, () => roll); if (!result.ok) throw Error(result.reason);
          expect(SPECIES[result.state.buildings.find(building => building.kind === 'nest')!.breeding!.birth.species].rarity).not.toBe('common');
        }
      }
    expect(pairs).toBe(15 * 9 * 5 * 2); expect(draws).toBeGreaterThan(1000);
  }, 30_000);
  it.each(COMMONS)('%s with another individual of the same element launches a real Common birth', species => {
    const initial = parents(species, species), stored = new Map([[SAVE_KEY, encodeGame(initial)]]), writes = vi.fn();
    const rng = vi.fn(() => .5), controller = new GameController({getItem: key => stored.get(key) ?? null, setItem: (key, value) => { writes(); stored.set(key, value); }}, () => 0, rng);
    const events = vi.fn(), gains = vi.fn(); controller.onConfirmedCommand(events); controller.onProgressionGain(gains);
    const before = controller.getSnapshot().state!, json = stored.get(SAVE_KEY); writes.mockClear();
    expect(controller.perform(command).ok).toBe(true);
    const after = controller.getSnapshot().state!;
    expect(after.buildings.find(b=>b.kind==='nest')!.breeding!.birth.species).toBe(species);
    expect(after.pattes).toBe(before.pattes); expect(after.grass).toBe(before.grass); expect(after.hearts).toBe(before.hearts);
    expect(stored.get(SAVE_KEY)).not.toBe(json);
    expect(rng).toHaveBeenCalledOnce(); expect(writes).toHaveBeenCalledOnce(); expect(events).toHaveBeenCalledOnce();
    expect(oddsTexts(oddsView(before, species, species, 2, 2)).summary).toContain('Résultats possibles');
    controller.dispose();
  });
  it('keeps exact fixed special chances at all affection bonus thresholds after removing common results', () => {
    for (const [affection, expected] of [[6, 5], [10, 7.5], [15, 10], [20, 10]] as const) {
      const s = parents('paille', 'belier-gris', affection); s.discovered.push('roukette', 'boudinet');
      const p = breedingPool(s, 'paille', 'belier-gris', affection, affection);
      expect(p.weights.magicien! * 100 / p.total).toBe(expected);
      expect(p.weights.roukette! * 100 / p.total).toBe((100 - expected) / 2);
      expect(p.weights.boudinet! * 100 / p.total).toBe((100 - expected) / 2);
      for (const [a, b, id] of [['dadi', 'phoenix', 'dragon'], ['maxou', 'wat-wat', 'requin']] as const) {
        const pool = breedingPool(s, a, b, Math.max(10, affection), Math.max(10, affection));
        expect(pool.weights[id]! * 100 / pool.total).toBe(affection >= 15 ? 4 : 3);
      }
    }
    // Removing every ordinary candidate cannot turn a fixed 5% special into a 100% result.
    expect(breedingDistributionWeights('paille', 'belier-gris', 6, 6, id => id === 'magicien')).toEqual({});
  });
  it('removes Common results from mixed pairs while preserving the exact Dragon reserve', () => {
    expect(breedingDistributionWeights('neige', 'pic-pic', 2, 2)).toEqual({'pic-pic': 30, tunini: 30});
    const s = parents('dadi', 'phoenix', 10), pool = breedingPool(s, 'dadi', 'phoenix', 10, 10);
    expect(pool.weights.dragon! * 100 / pool.total).toBe(3);
    for (const id of ['neige', 'feu', 'volant'] as const) expect(pool.weights[id]).toBeUndefined();
    expect(SPECIES[chooseBirth(s, 'dadi', 'phoenix', 0, 10, 10).species].rarity).not.toBe('common');
  });
  it.each(['nest', 'nursery'] as const)('welcomes a Common birth already saved in the %s without redrawing or converting it', stage => {
    const s = parents('paille', 'paille'), birth = {id: `birth-${s.nextId++}`, species: 'paille' as const, guaranteed: false, reservedDiscovery: false};
    const nest = s.buildings.find(b => b.kind === 'nest')!, nursery = s.buildings.find(b => b.kind === 'nursery')!;
    if (stage === 'nest') nest.breeding = {parents: [...command.parents], startedAt: 0, endsAt: BALANCE.breedingDuration, birth};
    else nursery.nursery!.babies.push({slot: 0, birth, startedAt: 0, readyAt: 5 * MINUTE});
    const json = encodeGame(s), rng = vi.fn(() => .99), data = new Map([[SAVE_KEY, json]]);
    const controller = new GameController({getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }}, () => HOUR, rng);
    if (stage === 'nest') expect(controller.perform({type: 'transferBirth', id: nest.id, birthId: birth.id}).ok).toBe(true);
    const growing = controller.getSnapshot().state!, baby = growing.buildings.find(b => b.kind === 'nursery')!.nursery!.babies[0];
    expect(baby.birth).toEqual(birth);
    const readyAt = Math.max(HOUR, baby.readyAt), decoded = decodeGame(encodeGame(growing)); if (!decoded.ok) throw Error(decoded.reason);
    const welcomed = act(decoded.state, {type: 'welcome', birthId: birth.id, enclosureId: 'building-1'}, readyAt, rng);
    if (!welcomed.ok) throw Error(welcomed.reason);
    expect(welcomed.state.rabbits.find(r => r.id === birth.id)).toMatchObject({species: 'paille', affection: 1, enclosureId: 'building-1'});
    expect(rng).not.toHaveBeenCalled(); expect(decodeGame(encodeGame(welcomed.state)).ok).toBe(true); controller.dispose();
  });
  it('allows two same-element Commons in the nest window and launches only on the final click', () => {
    const initial = parents('paille', 'paille'), data = new Map([[SAVE_KEY, encodeGame(initial)]]);
    const controller = new GameController({getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }}, () => 0);
    const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
    const prefs = new PreferenceStore('test-common-parent-breeding'); prefs.set({tutorial: false, muted: true});
    const ui = new GameUI(controller, scene, () => 0, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); });
    ui.open({kind: 'building', id: 'building-4'});
    [...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(button => button.textContent === 'Croiser')!.click();
    const dialog = document.getElementById('breeding-dialog') as HTMLDialogElement;
    for (const [slot, id] of [[0, 'rabbit-2'], [1, 'rabbit-6']] as const) dialog.querySelector<HTMLButtonElement>(`[data-focus="breeding-parent-${slot}-${id}"]`)!.click();
    // The possible results are shown only once the Probabilités panel is open (closed by default); opening it re-renders the dialog.
    [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Probabilités')!.click();
    expect(dialog.textContent).toContain('Résultats possibles');
    const launch = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Croiser')!;
    expect(launch.disabled).toBe(false);
    const perform = vi.spyOn(controller, 'perform'), before = controller.getSnapshot().state!; launch.click();
    expect(perform).toHaveBeenCalledOnce(); expect(before.buildings.find(b=>b.kind==='nest')!.breeding).toBeNull();
    expect(controller.getSnapshot().state!.buildings.find(b=>b.kind==='nest')!.breeding!.birth.species).toBe('paille');
  });
});
