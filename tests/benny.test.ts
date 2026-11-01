// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {HOUR, MINUTE, SPECIES, SPECIES_IDS, growthDuration, type SpeciesId} from '../src/config/balance';
import {RARITIES} from '../src/config/rarities';
import {HABITAT_TYPES} from '../src/config/habitats';
import {PROGRESSION} from '../src/config/progression';
import {act, advance, decodeGame, encodeGame} from '../src/simulation';
import {breedingPool, chooseBirth} from '../src/simulation/breeding';
import {BENNY_STAND_INS, bennyClaimed} from '../src/simulation/benny';
import {habitatAccepts} from '../src/simulation/habitats';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {emptyBuilding, createGame} from '../src/state/initial';
import {oddsTexts, oddsView} from '../src/ui/models';
import {SAVE_KEY} from '../src/persistence/storage';
import {regressionStart} from './regression-start';
import {sendToNursery} from './manual-transfer';
import type {MeadowScene} from '../src/display/MeadowScene';
import type {Command, GameState, NurseryBaby} from '../src/state/types';

const LEGENDARIES: SpeciesId[] = ['dragon', 'requin', 'ankylosaure'];
const PAIRS: [SpeciesId, SpeciesId][] = LEGENDARIES.flatMap((a, i) => LEGENDARIES.slice(i).map(b => [a, b] as [SpeciesId, SpeciesId]));
const sequence = (...values: number[]) => { const queue = [...values]; return vi.fn(() => { const value = queue.shift(); if (value === undefined) throw Error('no more draws'); return value; }); };

/** Two parents (rabbit-2, rabbit-3) at level 14, with a nest and a nursery placed. */
function game(a: SpeciesId, b: SpeciesId, affection: number): GameState {
  let s = regressionStart(0); s.progression = {totalXp: cumulativeLevelXp(14), rewardedThroughLevel: 14};
  s.rabbits[0].species = a; s.rabbits[1].species = b; s.rabbits.forEach(r => r.affection = affection); s.discovered = [...new Set([a, b])];
  for (const [kind, x] of [['nest', 22], ['nursery', 26]] as const) s = run(s, {type: 'placeStarterBuilding', kind, x, y: 20});
  return s;
}
function run(s: GameState, command: Command, now = s.lastSimulatedAt, rng: () => number = () => .5): GameState {
  const r = act(s, command, now, rng); if (!r.ok) throw Error(r.reason); return r.state;
}
const chance = (s: GameState, a: SpeciesId, b: SpeciesId, affection: number) => {
  const pool = breedingPool(s, a, b, affection, affection); return (pool.weights.benny ?? 0) * 100 / pool.total;
};
const nursery = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
const baby = (id: string, species: SpeciesId, startedAt: number, slot: 0 | 1 | 2 | 3 = 0): NurseryBaby =>
  ({slot, birth: {id, species, guaranteed: false, reservedDiscovery: false}, startedAt, readyAt: startedAt + growthDuration(species)});

describe('Benny, the one Mythic', () => {
  it('is a Mythic of the exclusive rainbow type, 24 h in the nest and 24 h in the nursery, worth 360 birth XP', () => {
    expect(RARITIES.mythic).toEqual({label: 'Mythique', growthMinutes: 1440, birthXp: 360});
    expect(SPECIES.benny).toMatchObject({name: 'Benny', rarity: 'mythic', types: ['arc-en-ciel'], price: null, progression: {unlockLevel: 14},
      recipe: {parentRarity: 'legendary', minAffection: 10, probability: 10}});
    expect(SPECIES.benny.acquisition).toEqual([{kind: 'recipe', parentRarity: 'legendary', minAffection: 10, probability: 10}]);
    expect(SPECIES_IDS.filter(id => SPECIES[id].types.includes('arc-en-ciel'))).toEqual(['benny']);
    expect(growthDuration('benny')).toBe(24 * HOUR); expect(PROGRESSION.xp.birth.mythic).toBe(360);
    for (const type of HABITAT_TYPES) expect(habitatAccepts(emptyBuilding('building-9', 'enclosure', 0, 0, type), 'benny'), type).toBe(true);
    expect(BENNY_STAND_INS).toEqual(['paille', 'neige', 'feu', 'belier-gris', 'volant']);
  });
  it.each(PAIRS)('is born of %s × %s (either order): 15 percent at affection 10, 20 percent at affection 15', (a, b) => {
    const s = game(a, b, 10);
    for (const [x, y] of [[a, b], [b, a]] as const) {
      expect(chance(s, x, y, 10)).toBeCloseTo(15, 12); expect(chance(s, x, y, 15)).toBeCloseTo(20, 12); expect(chance(s, x, y, 20)).toBeCloseTo(20, 12);
    }
  });
  it('is never born below affection 10 on either parent, nor with a parent that is not Legendary', () => {
    const s = game('dragon', 'requin', 10);
    for (const [x, y] of [[9, 9], [9, 15], [15, 9]] as const) expect(breedingPool(s, 'dragon', 'requin', x, y).weights.benny).toBeUndefined();
    for (const a of SPECIES_IDS) for (const b of SPECIES_IDS) if (SPECIES[a].rarity !== 'legendary' || SPECIES[b].rarity !== 'legendary')
      expect(breedingPool(s, a, b, 20, 20).weights.benny, `${a} × ${b}`).toBeUndefined();
  });
  it('lands in the nest for 24 h, in the nursery for 24 h, and is welcomed in any enclosure', () => {
    let s = game('dragon', 'requin', 15);
    s = run(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']}, 0, () => .9999);
    const job = s.buildings.find(b => b.kind === 'nest')!.breeding!; expect(job.birth.species).toBe('benny'); expect(job.endsAt - job.startedAt).toBe(24 * HOUR);
    expect(bennyClaimed(s)).toBe(true);
    s = sendToNursery(advance(s, 24 * HOUR)); const grown = nursery(s).nursery!.babies[0]; expect(grown.readyAt - grown.startedAt).toBe(24 * HOUR);
    s = advance(s, 48 * HOUR); const xp = s.progression.totalXp;
    s = run(s, {type: 'welcome', enclosureId: 'building-1', birthId: grown.birth.id});
    expect(s.rabbits.filter(r => r.species === 'benny')).toHaveLength(1); expect(s.progression.totalXp - xp).toBeGreaterThanOrEqual(360);
    expect(decodeGame(encodeGame(s))).toMatchObject({ok: true});
  });
});

describe('only one Benny per game', () => {
  const place = (s: GameState, where: 'owned' | 'nest' | 'nursery') => {
    const birth = {id: 'birth-90', species: 'benny' as const, guaranteed: false, reservedDiscovery: false};
    if (where === 'owned') { s.rabbits.push({id: 'rabbit-90', species: 'benny', affection: 1, enclosureId: 'building-1'}); s.discovered.push('benny'); }
    else if (where === 'nest') s.buildings.find(b => b.kind === 'nest')!.breeding = {parents: ['rabbit-2', 'rabbit-3'], startedAt: 0, endsAt: 24 * HOUR, birth};
    else nursery(s).nursery!.babies.push({...baby('birth-90', 'benny', 0)});
    return s;
  };
  it.each(['owned', 'nest', 'nursery'] as const)('leaves every result once she is %s, in the draw and in the odds shown', where => {
    const s = place(game('dragon', 'requin', 15), where);
    expect(bennyClaimed(s)).toBe(true); expect(breedingPool(s, 'dragon', 'requin', 15, 15).weights.benny).toBeUndefined();
    expect(breedingPool(s, 'dragon', 'requin', 15, 15).excluded.map(e => e.species)).not.toContain('benny');
    s.discovered.push('benny'); expect(oddsView(s, 'dragon', 'requin', 15, 15).entries.map(e => e.name)).not.toContain('Benny');
    // The highest roll, which gave Benny before, now gives an ordinary result.
    expect(chooseBirth(s, 'dragon', 'requin', .9999, 15, 15).species).not.toBe('benny');
  });
  it('ignores an owner-planned Benny once she is claimed', () => {
    const s = place(game('dragon', 'requin', 15), 'owned'); s.plannedBirth = 'benny';
    const next = run(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']}, 0, () => .1);
    expect(next.buildings.find(b => b.kind === 'nest')!.breeding!.birth.species).not.toBe('benny');
  });
  it('refuses a save holding two Bennys', () => {
    const s = place(place(game('dragon', 'requin', 10), 'owned'), 'nursery');
    expect(() => encodeGame(s)).toThrow();
  });
});

describe('Benny as a parent', () => {
  it('stands in for a Common drawn with the game random source, with her own affection', () => {
    for (const [index, common] of BENNY_STAND_INS.entries()) {
      const s = game('benny', 'paille', 10), draw = (index + .5) / BENNY_STAND_INS.length, rng = sequence(draw, .37);
      const next = run(s, {type: 'breed', parents: ['rabbit-2', 'rabbit-3']}, 0, rng);
      expect(rng).toHaveBeenCalledTimes(2);
      expect(next.buildings.find(b => b.kind === 'nest')!.breeding!.birth.species).toBe(chooseBirth(s, common, 'paille', .37, 10, 10).species);
    }
    const asPaille = run(game('paille', 'benny', 4), {type: 'breed', parents: ['rabbit-2', 'rabbit-3']}, 0, sequence(0, .5));
    expect(asPaille.buildings.find(b => b.kind === 'nest')!.breeding!.birth.species).toBe('paille');
  });
  it('shows in the nest the exact odds averaged over the possible Commons, with a sentence', () => {
    const s = game('benny', 'neige', 10); s.discovered = [...SPECIES_IDS];
    const view = oddsView(s, 'benny', 'neige', 10, 10), expected = new Map<string, number>();
    for (const common of BENNY_STAND_INS) {
      const pool = breedingPool(s, common, 'neige', 10, 10);
      for (const [id, weight] of Object.entries(pool.weights)) expected.set(SPECIES[id as SpeciesId].name, (expected.get(SPECIES[id as SpeciesId].name) ?? 0) + weight! * 100 / pool.total / BENNY_STAND_INS.length);
    }
    expect(view.standIn).toBe(true); expect(view.possible).toBe(true);
    expect(view.entries.map(e => e.name).sort()).toEqual([...expected.keys()].sort());
    for (const entry of view.entries) expect(entry.weight, entry.name).toBeCloseTo(expected.get(entry.name)!, 9);
    expect(view.entries.reduce((sum, e) => sum + e.weight, 0)).toBeCloseTo(100, 9);
    expect(oddsTexts(view).standIn).toBe('Benny prend la place d’un lapin commun tiré au hasard à chaque reproduction. Les chances affichées sont la moyenne sur les lapins communs possibles.');
    expect(oddsTexts(oddsView(s, 'paille', 'neige', 10, 10))).not.toHaveProperty('standIn');
  });
});

describe('Benny can never be lost', () => {
  it('refuses to entrust the last (and only) Benny', () => {
    const s = game('benny', 'paille', 2), before = structuredClone(s);
    expect(act(s, {type: 'release', id: 'rabbit-2'}, 0)).toEqual({ok: false, state: before, reason: 'LAST_OF_SPECIES'});
  });
  it('refuses to release a ready Benny baby from the nursery', () => {
    const s = game('dragon', 'requin', 10); nursery(s).nursery!.babies.push(baby('birth-90', 'benny', 0));
    const later = advance(s, 24 * HOUR);
    expect(act(later, {type: 'releaseBaby', birthId: 'birth-90'}, 24 * HOUR)).toMatchObject({ok: false, reason: 'BENNY_KEPT'});
  });
});

describe('Benny\'s power', () => {
  function withBabies(): GameState {
    const s = game('benny', 'paille', 2); nursery(s).nursery!.capacity = 3;
    nursery(s).nursery!.babies.push(baby('birth-80', 'frisket', 0, 0), baby('birth-81', 'dadi', 0, 1));
    s.buildings.find(b => b.kind === 'nest')!.breeding = {parents: ['rabbit-2', 'rabbit-3'], startedAt: 0, endsAt: 20 * MINUTE, birth: {id: 'birth-82', species: 'icy', guaranteed: false, reservedDiscovery: false}};
    return s;
  }
  it('makes every waiting nursery baby ready at once, leaves the nest alone, then recharges for 48 h', () => {
    const s = withBabies(), now = 5 * MINUTE, next = run(s, {type: 'bennyPower'}, now);
    expect(nursery(next).nursery!.babies.map(b => b.readyAt)).toEqual([now, now]);
    expect(next.buildings.find(b => b.kind === 'nest')!.breeding!.endsAt).toBe(20 * MINUTE);
    expect(next.benny).toEqual({powerReadyAt: now + 48 * HOUR, inSky: false});
    const welcomed = run(next, {type: 'welcome', enclosureId: 'building-1', birthId: 'birth-80'}, now); expect(welcomed.rabbits.some(r => r.id === 'birth-80')).toBe(true);
  });
  it('refuses before the recharge, with an empty nursery, and without Benny', () => {
    const used = run(withBabies(), {type: 'bennyPower'}, 0);
    const again = structuredClone(used); nursery(again).nursery!.babies = [baby('birth-83', 'frisket', 60 * MINUTE, 0)];
    expect(act(again, {type: 'bennyPower'}, 47 * HOUR)).toMatchObject({ok: false, reason: 'BENNY_RECHARGING'});
    nursery(again).nursery!.babies = [baby('birth-83', 'dadi', 47 * HOUR, 0)];
    expect(act(again, {type: 'bennyPower'}, 48 * HOUR)).toMatchObject({ok: true});
    const empty = game('benny', 'paille', 2);
    expect(act(empty, {type: 'bennyPower'}, 0)).toMatchObject({ok: false, reason: 'NO_WAITING_BABY'});
    nursery(empty).nursery!.babies.push(baby('birth-84', 'frisket', 0)); // Already ready: nothing is waiting.
    expect(act(empty, {type: 'bennyPower'}, growthDuration('frisket'))).toMatchObject({ok: false, reason: 'NO_WAITING_BABY'});
    const without = game('dragon', 'paille', 2); nursery(without).nursery!.babies.push(baby('birth-85', 'frisket', 0));
    expect(act(without, {type: 'bennyPower'}, 0)).toMatchObject({ok: false, reason: 'NOT_FOUND'});
  });
});

describe('Benny\'s sky mode', () => {
  it('saves whether she flies above the island, keeping her enclosure and income', () => {
    const s = game('benny', 'paille', 2), up = run(s, {type: 'bennySky', inSky: true});
    expect(up.benny).toEqual({powerReadyAt: 0, inSky: true}); expect(up.rabbits[0].enclosureId).toBe(s.rabbits[0].enclosureId);
    const decoded = decodeGame(encodeGame(up)); expect(decoded.ok && decoded.state.benny).toEqual({powerReadyAt: 0, inSky: true});
    const down = run(up, {type: 'bennySky', inSky: false}); expect(down.benny).toEqual({powerReadyAt: 0, inSky: false});
    expect(act(game('dragon', 'paille', 2), {type: 'bennySky', inSky: true}, 0)).toMatchObject({ok: false, reason: 'NOT_FOUND'});
  });
});

describe('save format v22', () => {
  it('migrates a v21 save without loss and keeps Benny\'s state across a round trip', () => {
    const s = game('benny', 'paille', 2), raw = JSON.parse(encodeGame(s));
    expect(raw.version).toBe(22); raw.version = 21;
    // A v21 save loads exactly as the same game written in v22.
    const migrated = decodeGame(JSON.stringify(raw)); expect(migrated).toEqual(decodeGame(encodeGame(s)));
    expect(migrated.ok && migrated.state.version).toBe(22); expect(migrated.ok && migrated.state.benny).toBeUndefined();
    expect(migrated.ok && migrated.state.rabbits.map(r => r.species)).toEqual(['benny', 'paille']);
    // Benny's saved state survives a round trip.
    const used = run(s, {type: 'bennySky', inSky: true}), back = decodeGame(encodeGame(used)); expect(back.ok && back.state.benny).toEqual({powerReadyAt: 0, inSky: true});
  });
  it('refuses a recharge further than 48 h ahead', () => {
    const s = game('benny', 'paille', 2); s.benny = {powerReadyAt: s.lastSimulatedAt + 48 * HOUR + 1, inSky: false};
    expect(() => encodeGame(s)).toThrow();
  });
});

describe('Benny\'s sheet (simulated DOM, not a browser)', () => {
  const cleanup: (() => void)[] = [];
  beforeEach(() => {
    document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
    document.getElementById('loading-screen')!.hidden = true; document.getElementById('app')!.inert = false;
    vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => { cleanup.splice(0).forEach(fn => fn()); vi.unstubAllGlobals(); });
  function setup(customize: (s: GameState) => void, now = 0) {
    const s = createGame(0); s.rabbits.push({id: 'rabbit-3', species: 'benny', affection: 1, enclosureId: 'building-1'}); s.discovered.push('benny');
    s.nextId = 100; customize(s);
    const data = new Map([[SAVE_KEY, encodeGame(s)]]);
    const controller = new GameController({getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }}, () => now);
    const prefs = new PreferenceStore('test-benny'); prefs.set({tutorial: false});
    const ui = new GameUI(controller, {setRabbitPurchase: vi.fn(), setPlacement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), setArrangement: vi.fn(), setExpansion: vi.fn(), setDecorationGhost: vi.fn(), setDecorationPlacement: vi.fn(), recenter: vi.fn(), reactToFeed: vi.fn()} as unknown as MeadowScene, () => now, prefs);
    cleanup.push(() => { ui.dispose(); controller.dispose(); });
    ui.open({kind: 'rabbit', id: 'rabbit-3'});
    return {ui, controller};
  }
  const panel = () => document.getElementById('panel-content')!;
  const box = () => panel().querySelector<HTMLElement>('[data-benny-powers]')!;
  const button = (text: string) => [...box().querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === text) ?? (() => { throw new Error(`Button missing: ${text}\n${box().textContent}`); })();
  const reasonOf = (b: HTMLButtonElement) => document.getElementById(b.getAttribute('aria-describedby') ?? '')?.textContent;

  it('disables the power with its reason when no baby waits, and offers to fly', () => {
    setup(() => {});
    expect(box()).not.toBeNull(); expect(box().textContent).toContain('Pouvoir prêt.');
    const power = button('Utiliser le pouvoir'); expect(power.disabled).toBe(true); expect(reasonOf(power)).toBe('Aucun lapereau n’attend dans la nurserie.');
    expect(box().textContent).toContain('Benny est dans son enclos.'); expect(button('Faire voler Benny').disabled).toBe(false);
  });
  it('uses the power on a waiting baby, then shows the time left before recharge', () => {
    const {controller} = setup(s => { s.buildings.find(b => b.kind === 'nursery')!.nursery!.babies.push(baby('birth-80', 'frisket', 0)); });
    const power = button('Utiliser le pouvoir'); expect(power.disabled).toBe(false); power.click();
    const state = controller.getSnapshot().state!;
    expect(state.benny).toEqual({powerReadyAt: 48 * HOUR, inSky: false}); expect(state.buildings.find(b => b.kind === 'nursery')!.nursery!.babies[0].readyAt).toBe(0);
    expect(box().querySelector('[data-benny-recharge]')!.textContent).toBe('Recharge : encore 48 h 0 min');
    expect(reasonOf(button('Utiliser le pouvoir'))).toBe('Le pouvoir de Benny se recharge encore.');
  });
  it('switches the sky mode both ways from the sheet', () => {
    const {controller} = setup(() => {});
    button('Faire voler Benny').click(); expect(controller.getSnapshot().state!.benny?.inSky).toBe(true);
    expect(box().textContent).toContain('Benny tourne dans le ciel au-dessus de l’île.');
    button('Ramener Benny dans l’enclos').click(); expect(controller.getSnapshot().state!.benny?.inSky).toBe(false);
  });
  it('is absent from the sheet of any other rabbit', () => {
    const {ui} = setup(() => {}); ui.open({kind: 'rabbit', id: 'rabbit-2'}); expect(panel().querySelector('[data-benny-powers]')).toBeNull();
  });
});
