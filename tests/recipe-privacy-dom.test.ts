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
/** Perroquet and Feu at affection 10, in the new game's universal habitat, with its nest and nursery. */
function couple(level: number, recipes: GameState['recipeBook'] = []) {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level};
  s.buildings[0].habitat!.type = 'universal'; s.nextId = 7; s.discovered = ['perroquet', 'feu']; s.recipeBook = [...recipes];
  s.rabbits = [{id: 'rabbit-2', species: 'perroquet', affection: 10, enclosureId: 'building-1'}, {id: 'rabbit-6', species: 'feu', affection: 10, enclosureId: 'building-1'}];
  return s;
}
const card = (species: string) => panel().querySelector<HTMLElement>(`[data-recipe="${species}"]`)!;
function nestWithParents(ui: GameUI) {
  ui.select({kind: 'building', id: 'building-4'});
  const parent = (name: string) => [...panel().querySelectorAll('article')].find(c => c.querySelector('h3')?.textContent === name)!;
  button('Parent A', parent('Lapin Perroquet')).click(); button('Parent B', parent('Lapin Feu')).click();
}

describe('notebook recipe privacy', () => {
  it('shows only public information and the coin price for an unknown recipe', () => {
    const {ui} = setup(couple(14)); ui.open({kind: 'recipes'});
    const dragon = card('dragon');
    expect(dragon.dataset.recipeKnown).toBe('false');
    expect(dragon.textContent).toContain('Lapin Dragon'); expect(dragon.textContent).toContain('vol + feu · Légendaire');
    expect(dragon.textContent).toContain('Recette inconnue · niveau 14 atteint · 900 pièces');
    expect(dragon.textContent).toContain('Conditions détaillées et paires conseillées visibles une fois la recette connue.');
    expect(dragon.querySelector('img.coin-icon')).not.toBeNull(); expect(dragon.textContent).not.toMatch(/pattes?/);
    for (const hidden of ['Perroquet', 'Affection', '2 %', 'Parents requis', 'garantie', 'paire possédée']) expect(dragon.textContent).not.toContain(hidden);
    // Step 3: the purchase button is the only action; no shortcut before the recipe is known.
    expect(buttons(dragon).map(b => b.textContent)).toEqual(['Acheter · 900 pièces']);
    expect(panel().textContent).not.toContain('Lapin Perroquet × Lapin Feu');
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
    expect(dragon.textContent).toContain('Parents requis : Lapin Perroquet × Lapin Feu. Les types seuls ne suffisent pas.');
    expect(dragon.textContent).toContain('Affection 10 minimum pour chacun des deux parents.');
    expect(dragon.textContent).toContain('hors garantie ordinaire : 2 %');
    expect(button('Préparer cette paire au nid', dragon).disabled).toBe(false);
  });
});

describe('nest odds privacy', () => {
  it('groups unknown results, hides the Dragon and keeps the launch available', () => {
    const {ui} = setup(couple(14)); nestWithParents(ui);
    const details = panel().querySelector('details')!;
    expect([...details.querySelectorAll('p')].map(p => p.textContent)).toEqual(['Lapin Feu · feu · Commun : 49/150 (≈ 32,67 %)', 'Lapin Perroquet · vol + feu · Rare : 49/300 (≈ 16,33 %)', 'Résultats inconnus : 51 %']);
    expect(panel().textContent).toContain('Résultats possibles : Lapin Feu, Lapin Perroquet et des résultats inconnus.');
    for (const hidden of ['Dragon', 'Volant', 'Légendaire', 'Perroquet et Feu']) expect(panel().textContent).not.toContain(hidden);
    expect(panel().textContent).toContain('Chaque recette possède ses propres conditions');
    expect(panel().textContent).not.toContain('Recettes rares : affection 4');
    expect(button('Lancer la reproduction · gratuit').disabled).toBe(false);
  });
  it('names a known Dragon and groups an unknown level exclusion', () => {
    const known = setup(couple(14, ['dragon'])); nestWithParents(known.ui);
    expect(panel().querySelector('details')!.textContent).toContain('Lapin Dragon · vol + feu · Légendaire : 2 %');
    cleanups.splice(0).reverse().forEach(cleanup => cleanup());
    const locked = setup(couple(13)); nestWithParents(locked.ui);
    expect(panel().textContent).toContain('Certains résultats demandent un niveau supérieur · exclus du tirage actuel.');
    expect(panel().textContent).not.toContain('Dragon');
  });
});
