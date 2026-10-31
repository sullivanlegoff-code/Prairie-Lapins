// @vitest-environment happy-dom
import html from '../index.html?raw';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {establishHistoricalLevelRights} from '../src/simulation/levelRights';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {createGame, encodeGame} from '../src/simulation';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import type {MeadowScene} from '../src/display/MeadowScene';
import type {GameState} from '../src/state/types';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(initial: GameState) {
  establishHistoricalLevelRights(initial);
  const data = new Map<string, string>([[SAVE_KEY, encodeGame(initial)]]);
  const storage: SaveStorage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }};
  const controller = new GameController(storage, () => 0, () => .9);
  const scene = {setRabbitPurchase: vi.fn(), overview: vi.fn(), focusDecoration: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('test-recipes'); prefs.set({muted: true, tutorial: false});
  const ui = new GameUI(controller, scene, () => 0, prefs);
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  return {ui, controller};
}
const panel = () => document.getElementById('panel-content')!;
const buttons = (scope: ParentNode = panel()) => [...scope.querySelectorAll<HTMLButtonElement>('button')];
function button(text: string, scope: ParentNode = panel()) {
  const found = buttons(scope).find(b => b.textContent === text); if (!found) throw new Error(`Button missing: ${text}\n${scope.textContent}`); return found;
}
/** Dadi and Phoenix, the Dragon parents, at affection 10, in the new game's universal habitat, with its nest and nursery. */
function couple(level: number, recipes: GameState['recipeBook'] = []) {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  s.buildings[0].habitat!.type = 'universal'; s.nextId = 7; s.discovered = ['dadi', 'phoenix']; s.recipeBook = [...recipes];
  s.rabbits = [{id: 'rabbit-2', species: 'dadi', affection: 10, enclosureId: 'building-1'}, {id: 'rabbit-6', species: 'phoenix', affection: 10, enclosureId: 'building-1'}];
  return s;
}
const card = (species: string) => panel().querySelector<HTMLElement>(`[data-recipe="${species}"]`)!;
const breeding = () => document.getElementById('breeding-dialog') as HTMLDialogElement;
/** Opens the pairing window from the nest, picks Dadi on the left and Phoenix on the right, and shows the odds. */
function nestWithParents(ui: GameUI) {
  ui.select({kind: 'building', id: 'building-4'}); button('Croiser').click();
  const row = (slot: number, name: string) => [...breeding().querySelectorAll('.breeding-column')[slot].querySelectorAll<HTMLButtonElement>('button.breeding-row')].find(r => r.querySelector('strong')?.textContent?.startsWith(name))!;
  row(0, 'Dadi').click(); row(1, 'Phoenix').click(); button('Probabilités', breeding()).click();
}
const odds = () => [...breeding().querySelectorAll('.breeding-odds p:not(.badge)')].map(p => p.textContent);

describe('notebook recipe privacy', () => {
  it('shows only public information and the coin price for an unknown recipe', () => {
    const {ui} = setup(couple(14)); ui.open({kind: 'recipes'});
    const dragon = card('dragon');
    expect(dragon.dataset.recipeKnown).toBe('false');
    expect(dragon.textContent).toContain('Lapin Dragon'); expect(dragon.textContent).toContain('feu + vol · Légendaire');
    expect(dragon.textContent).toContain('Recette inconnue · niveau 14 atteint · 900 pièces');
    expect(dragon.textContent).toContain('Conditions détaillées et paires conseillées visibles une fois la recette connue.');
    expect(dragon.querySelector('img.coin-icon')).not.toBeNull(); expect(dragon.textContent).not.toMatch(/pattes?/);
    for (const hidden of ['Phoenix', 'Affection', '2 %', 'Parents requis', 'garantie', 'paire possédée']) expect(dragon.textContent).not.toContain(hidden);
    // Step 3: the purchase button is the only action; no shortcut before the recipe is known.
    expect(buttons(dragon).map(b => b.textContent)).toEqual(['Acheter la recette · 900 pièces']);
    expect(panel().textContent).not.toContain('Dadi × Phoenix');
    for (const old of ['Géant, Magicien et Dragon', 'recettes ordinaires inconnues']) expect(panel().textContent).not.toContain(old);
  });
  it('shows the level lock on an unknown recipe below its level', () => {
    const {ui} = setup(couple(13)); ui.open({kind: 'recipes'});
    expect(card('dragon').querySelector('.reason')?.textContent).toBe('Niveau 14 requis · exclu des nouvelles reproductions.');
  });
  it('reveals exact parents, conditions and the pair shortcut once the recipe is known', () => {
    const {ui} = setup(couple(14, ['dragon'])); ui.open({kind: 'recipes'});
    const dragon = card('dragon');
    expect(dragon.dataset.recipeKnown).toBe('true');
    expect(dragon.textContent).toContain('Parents requis : Dadi × Phoenix. Les types seuls ne suffisent pas.');
    expect(dragon.textContent).toContain('Affection 10 minimum pour chacun des deux parents.');
    expect(dragon.textContent).toContain('hors garantie ordinaire : 7 %');
    expect(button('Préparer cette paire au nid', dragon).disabled).toBe(false);
  });
});

describe('nest odds privacy', () => {
  it('groups unknown results, hides the Dragon and keeps the launch available', () => {
    const {ui} = setup(couple(14)); nestWithParents(ui);
    expect(odds()).toEqual(["Résultats possibles : Phoenix, Dadi et des résultats inconnus.","Phoenix · feu + vol · Rare : 179/1350 (≈ 13,26 %)","Dadi · feu + métal · Épique : 179/3600 (≈ 4,97 %)","Résultats inconnus : 8831/10800 (≈ 81,77 %)"]);
    expect(breeding().textContent).toContain('Résultats possibles : Phoenix, Dadi et des résultats inconnus.');
    for (const hidden of ['Dragon', 'Volant', 'Légendaire', 'Maxou']) { expect(panel().textContent).not.toContain(hidden); expect(breeding().textContent).not.toContain(hidden); }
    expect(panel().textContent).toContain('Chaque recette possède ses propres conditions');
    expect(panel().textContent).not.toContain('Recettes rares : affection 4');
    expect(button('Croiser', breeding()).disabled).toBe(false);
  });
  it('names a known Dragon and groups an unknown level exclusion', () => {
    const known = setup(couple(14, ['dragon'])); nestWithParents(known.ui);
    expect(odds()).toContain('Lapin Dragon · feu + vol · Légendaire : 10,5 %');
    cleanups.splice(0).reverse().forEach(cleanup => cleanup());
    const locked = setup(couple(13)); nestWithParents(locked.ui);
    expect(breeding().textContent).toContain('Certains résultats demandent un niveau supérieur · exclus du tirage actuel.');
    expect(breeding().textContent).not.toContain('Dragon');
  });
});
