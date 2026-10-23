// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GameController} from '../src/application/GameController';
import {developmentEnvironment, TEST_PREFIX} from '../src/dev/tools';
import {BALANCE} from '../src/config/balance';
import {SPECIES, SPECIES_IDS} from '../src/config/species';
import {browserStorage} from '../src/persistence/browserStorage';
import {SAVE_KEY} from '../src/persistence/storage';
import {createGame, decodeGame, encodeGame} from '../src/simulation';
import {habitatEntryReason} from '../src/simulation/habitats';
import {EXPECTED_IDS} from './rabbit-art-fixtures';
import html from '../index.html?raw';

const controllers: GameController[] = [], dispose: (() => void)[] = [];
const normalSnapshot = () => [SAVE_KEY, 'unrelated-game'].map(key => localStorage.getItem(key));
beforeEach(() => {
  localStorage.clear(); vi.spyOn(Date, 'now').mockReturnValue(1_000_000); window.confirm = vi.fn(() => true);
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.setItem(SAVE_KEY, encodeGame(createGame(Date.now()))); localStorage.setItem('unrelated-game', 'protected');
});
afterEach(() => { dispose.splice(0).forEach(fn => fn()); controllers.splice(0).forEach(c => c.dispose()); vi.restoreAllMocks(); });
function setup() {
  const dev = developmentEnvironment(browserStorage()), controller = new GameController(dev.storage, dev.clock); controllers.push(controller);
  dispose.push(dev.mount(controller)); return {dev, controller};
}
const speciesSelect = () => document.getElementById('dev-rabbit-species') as HTMLSelectElement;
const homeSelect = () => document.getElementById('dev-rabbit-home') as HTMLSelectElement;
const addButton = () => document.getElementById('dev-add-rabbit') as HTMLButtonElement;
function choose(species: string, home?: string) {
  speciesSelect().value = species; speciesSelect().dispatchEvent(new Event('change'));
  if (home) homeSelect().value = home;
}
const stored = () => localStorage.getItem(TEST_PREFIX + SAVE_KEY);

describe('laboratory test rabbits', () => {
  it('lists the whole registry in registry order, derived from it', () => {
    setup();
    expect([...speciesSelect().options].map(o => o.value)).toEqual([...SPECIES_IDS]);
    expect(speciesSelect().options).toHaveLength(Object.keys(SPECIES).length);
    expect([...SPECIES_IDS]).toEqual(EXPECTED_IDS);
    expect(addButton().textContent).toBe('Ajouter à la partie de test');
  });
  it('adds a Rare and a Common as free adults with normal affection, discovery, unique ids and persistence, without touching the normal game', () => {
    const {dev, controller} = setup(); expect(dev.loadScenario(controller, 'picPic').ok).toBe(true);
    const before = controller.getSnapshot().state!, normal = normalSnapshot();
    const habitat = before.buildings.find(b => b.kind === 'enclosure')!;
    choose('princesse-neige', habitat.id); addButton().click();
    choose('paille', habitat.id); addButton().click();
    const s = controller.getSnapshot().state!, added = s.rabbits.slice(before.rabbits.length);
    expect(added.map(r => [r.species, r.affection, r.enclosureId])).toEqual([['princesse-neige', BALANCE.minAffection, habitat.id], ['paille', BALANCE.minAffection, habitat.id]]);
    expect(s.discovered).toEqual(expect.arrayContaining(['princesse-neige', 'paille']));
    expect(new Set(s.rabbits.map(r => r.id)).size).toBe(s.rabbits.length);
    for (const key of ['pattes', 'grass', 'hearts', 'recipeBook', 'progression', 'pityFailures'] as const) expect(s[key]).toEqual(before[key]);
    expect(decodeGame(stored()!)).toEqual({ok: true, state: s});
    const reloaded = new GameController(setup().dev.storage, Date.now); controllers.push(reloaded); expect(reloaded.getSnapshot().state).toEqual(s);
    expect(normalSnapshot()).toEqual(normal);
  });
  it('allows several individuals of one species with unique ids until capacity, then refuses atomically', () => {
    const {dev, controller} = setup(); const habitat = controller.getSnapshot().state!.buildings.find(b => b.kind === 'enclosure')!;
    const state = controller.getSnapshot().state!; state.buildings.find(b => b.id === habitat.id)!.habitat!.type = 'universal';
    expect(dev.addTestRabbit(controller, 'icy', habitat.id).ok).toBe(true); expect(dev.addTestRabbit(controller, 'icy', habitat.id).ok).toBe(true);
    const ids = controller.getSnapshot().state!.rabbits.filter(r => r.species === 'icy').map(r => r.id); expect(new Set(ids).size).toBe(2);
    let guard = 0; while (dev.addTestRabbit(controller, 'icy', habitat.id).ok && guard++ < 50);
    const full = controller.getSnapshot().state!, savedFull = stored();
    expect(dev.addTestRabbit(controller, 'icy', habitat.id)).toMatchObject({ok: false, reason: 'CAPACITY_FULL'});
    expect(controller.getSnapshot().state).toEqual(full); expect(stored()).toBe(savedFull);
  });
  it('refuses incompatible, unknown or missing destinations without any change, and offers only compatible homes with room', () => {
    const {dev, controller} = setup(); expect(dev.loadScenario(controller, 'habitats').ok).toBe(true);
    const before = controller.getSnapshot().state!, saved = stored(), homes = before.buildings.filter(b => b.kind === 'enclosure');
    const feu = homes.find(b => b.habitat!.type === 'feu')!;
    expect(dev.addTestRabbit(controller, 'neige', feu.id)).toMatchObject({ok: false, reason: 'TYPE_INCOMPATIBLE'});
    expect(dev.addTestRabbit(controller, 'neige', 'building-404')).toEqual({ok: false, reason: 'INVALID_TEST_VALUE'});
    expect(dev.addTestRabbit(controller, 'inconnu' as never, feu.id)).toEqual({ok: false, reason: 'INVALID_TEST_VALUE'});
    expect(controller.getSnapshot().state).toEqual(before); expect(stored()).toBe(saved);
    for (const species of SPECIES_IDS) {
      choose(species);
      const expected = homes.filter(b => !habitatEntryReason(before, b, species)).map(b => b.id);
      expect(homeSelect().disabled).toBe(!expected.length); expect(addButton().disabled).toBe(!expected.length);
      if (expected.length) expect([...homeSelect().options].map(o => o.value)).toEqual(expected);
    }
  });
  it('refuses any normal controller and leaves its game and storage untouched', () => {
    const dev = developmentEnvironment(browserStorage()), normal = new GameController(browserStorage()); controllers.push(normal);
    const before = normal.getSnapshot().state!, raw = localStorage.getItem(SAVE_KEY);
    const home = before.buildings.find(b => b.kind === 'enclosure')!;
    expect(dev.addTestRabbit(normal, 'paille', home.id)).toEqual({ok: false, reason: 'NOT_TEST_SESSION'});
    expect(() => dev.mount(normal)).toThrow(); expect(normal.getSnapshot().state).toEqual(before); expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
  });
});
