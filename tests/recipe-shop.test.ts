// @vitest-environment happy-dom
import html from '../index.html?raw';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {act, decodeGame, encodeGame} from '../src/simulation';
import {quoteComplement} from '../src/simulation/actions';
import {newlyPurchasableRecipes} from '../src/simulation/recipes';
import {levelUnlockContents} from '../src/simulation/levelRights';
import {scenarioState} from '../src/dev/scenarios';
import {RECIPE_PRICES} from '../src/config/recipes';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {REFUSALS} from '../src/ui/models';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import type {MeadowScene} from '../src/display/MeadowScene';
import type {GameState, PattesCommand} from '../src/state/types';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(initial: GameState, data = new Map<string, string>([[SAVE_KEY, encodeGame(initial)]])) {
  const flags = {fail: false};
  const storage: SaveStorage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => { if (flags.fail && key === SAVE_KEY) throw Error('quota'); data.set(key, value); }};
  const controller = new GameController(storage, () => 0, () => .9);
  const scene = {setRabbitPurchase: vi.fn(), overview: vi.fn(), focusDecoration: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('test-recipe-shop'); prefs.set({muted: true, tutorial: false});
  const ui = new GameUI(controller, scene, () => 0, prefs);
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  return {ui, controller, data, flags};
}
const shop = (level = 14, pattes = 5000) => { const s = scenarioState('recipeShop', 0); s.progression = {totalXp: cumulativeLevelXp(level), rewardedThroughLevel: level}; s.pattes = pattes; return s; };
const panel = () => document.getElementById('panel-content')!;
const dialog = () => document.getElementById('game-dialog') as HTMLDialogElement;
const card = (species: string) => panel().querySelector<HTMLElement>(`[data-recipe="${species}"]`)!;
const buy = (species: string) => card(species)?.querySelector<HTMLButtonElement>(`[data-buy-recipe="${species}"]`) ?? null;
const confirmButton = () => [...dialog().querySelectorAll('button')].find(b => b.textContent === 'Confirmer')!;
const state = (c: GameController) => c.getSnapshot().state!;
/** Opens the pairing window from the nest, picks `a` on the left and `b` on the right, and reads the odds. */
function nestOdds(ui: GameUI, a: string, b: string) {
  document.getElementById('close-panel')!.click(); ui.select({kind: 'building', id: 'building-4'});
  [...panel().querySelectorAll('button')].find(x => x.textContent === 'Croiser')!.click();
  const window = document.getElementById('breeding-dialog')!;
  const row = (slot: number, name: string) => [...window.querySelectorAll('.breeding-column')[slot].querySelectorAll<HTMLButtonElement>('button.breeding-row')].find(r => r.querySelector('strong')?.textContent?.startsWith(name))!;
  // A remembered pair stays selected; a second click would clear it.
  for (const [slot, name] of [[0, a], [1, b]] as const) if (!row(slot, name).classList.contains('selected')) row(slot, name).click();
  const odds = window.querySelector('.breeding-odds');
  if (!odds) [...window.querySelectorAll('button')].find(x => x.textContent === 'Probabilités')!.click();
  const lines = [...window.querySelectorAll('.breeding-odds p:not(.badge)')].map(p => p.textContent);
  (document.getElementById('breeding-dialog') as HTMLDialogElement).close();
  return lines;
}

describe('recipe purchase buttons', () => {
  it('offers a coin-only button on unknown recipes whose level is reached, never on known ones', () => {
    // No recipe is gifted any more: a bought recipe is the known one here.
    const initial = shop(); initial.recipeBook = ['lunettes'];
    const {ui} = setup(initial); ui.open({kind: 'shop', tab: 'recipes'});
    expect(card('dragon').textContent).toContain('Recette inconnue · niveau 14 atteint · 900 pièces');
    expect(buy('dragon')!.textContent).toBe('Acheter · 900 pièces'); expect(buy('dragon')!.querySelector('img.coin-icon')).not.toBeNull();
    expect(buy('dragon')!.disabled).toBe(false); expect(buy('lunettes')).toBeNull();
    expect(card('lunettes').dataset.recipeKnown).toBe('true');
    for (const species of Object.keys(RECIPE_PRICES).filter(species => species !== 'lunettes')) expect(buy(species)).not.toBeNull();
    expect(panel().textContent).not.toMatch(/pattes?/); expect(panel().querySelector('.heart-spend')).toBeNull();
  });
  it('shows the level once and no active button below the required level', () => {
    const {ui} = setup(shop(13)); ui.open({kind: 'shop', tab: 'recipes'});
    const texts = [...card('dragon').querySelectorAll('p')].map(p => p.textContent);
    expect(texts).toContain('Niveau 14 requis · exclu des nouvelles reproductions.'); expect(texts).toContain('Recette inconnue · 900 pièces');
    expect(texts.filter(t => t?.includes('14'))).toHaveLength(1); expect(buy('dragon')).toBeNull(); expect(buy('magicien')).not.toBeNull();
  });
  it('disables an unaffordable recipe with a clear reason and never offers hearts', () => {
    const {ui, controller} = setup(shop(14, 160)); ui.open({kind: 'shop', tab: 'recipes'});
    expect(buy('bouee')!.disabled).toBe(false); expect(buy('feu-glace')!.disabled).toBe(true);
    expect(card('feu-glace').querySelector('.reason')!.textContent).toBe('Solde insuffisant.');
    expect(state(controller).hearts).toBe(100); expect(panel().querySelector('.heart-spend')).toBeNull();
    buy('feu-glace')!.click(); expect(dialog().open).toBe(false); expect(state(controller).pattes).toBe(160);
  });
});

describe('recipe purchase flow', () => {
  it('confirms, debits once on a rapid double press, reveals the card and updates the nest without reload', () => {
    const {ui, controller, data} = setup(shop());
    expect(nestOdds(ui, 'Lapin Paille', 'Lapin Feu')).toEqual(['Lapin Paille · paille · Commun : 2/7 (≈ 28,57 %)', 'Lapin Feu · feu · Commun : 2/7 (≈ 28,57 %)', 'Résultats inconnus : 3/7 (≈ 42,86 %)']);
    const before = state(controller); ui.open({kind: 'shop', tab: 'recipes'});
    buy('bouee')!.click(); buy('bouee')!.click();
    expect(dialog().open).toBe(true); expect(dialog().querySelector('h2')!.textContent).toBe('Acheter la recette : Lapin en Bouée ?');
    expect(dialog().querySelector('p')!.textContent).toBe('150 pièces. Révèle les conditions d’obtention et les paires conseillées. Ne donne aucun lapin et ne garantit aucune naissance.');
    const confirm = confirmButton(); confirm.click(); confirm.click();
    const after = state(controller);
    expect(after.pattes).toBe(before.pattes - 150); expect(after.recipeBook).toEqual(['bouee']);
    expect(after.progression).toEqual(before.progression); expect(after.missions).toEqual(before.missions); expect(after.rabbits).toEqual(before.rabbits);
    expect(document.getElementById('toast')?.textContent ?? '').toContain('Recette ajoutée au carnet.');
    expect(card('bouee').dataset.recipeKnown).toBe('true'); expect(buy('bouee')).toBeNull();
    expect(card('bouee').textContent).toContain('Affection 4 minimum pour chacun des deux parents.');
    expect(card('bouee').textContent).toContain('paire(s) possédée(s) compatible(s)');
    const saved = decodeGame(data.get(SAVE_KEY)!); expect(saved.ok && saved.state.recipeBook).toEqual(['bouee']);
    expect(nestOdds(ui, 'Lapin Paille', 'Lapin Feu')).toEqual(['Lapin Paille · paille · Commun : 2/7 (≈ 28,57 %)', 'Lapin Feu · feu · Commun : 2/7 (≈ 28,57 %)', 'Lapin en Bouée · paille + feu · Rare : 1/7 (≈ 14,29 %)', 'Résultats inconnus : 2/7 (≈ 28,57 %)']);
    ui.open({kind: 'collection'}); [...panel().querySelectorAll('button')].find(b => b.textContent === 'Carnet de reproduction')!.click();
    expect([...card('bouee').querySelectorAll('button')].some(b => b.textContent === 'Préparer cette paire au nid')).toBe(true);
  });
  it('keeps payment, recipe and card unchanged when the save fails, then buys once', () => {
    let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const {ui, controller, flags} = setup(shop()); ui.open({kind: 'shop', tab: 'recipes'});
    flags.fail = true; buy('bouee')!.click(); confirmButton().click();
    expect(document.getElementById('toast')?.textContent).toBe(REFUSALS.ACTION_NOT_SAVED);
    expect([state(controller).pattes, state(controller).recipeBook]).toEqual([5000, []]);
    expect(card('bouee').dataset.recipeKnown).toBe('false'); expect(buy('bouee')).not.toBeNull();
    flags.fail = false; buy('bouee')!.click(); confirmButton().click();
    expect(state(controller).pattes).toBe(5000); // Same command inside the 350 ms double-tap window: ignored.
    clock += 1000; buy('bouee')!.click(); confirmButton().click();
    expect([state(controller).pattes, state(controller).recipeBook]).toEqual([4850, ['bouee']]);
  });
  it('keeps the purchase on reload and on import, without a second payment', () => {
    const first = setup(shop()); first.ui.open({kind: 'shop', tab: 'recipes'}); buy('dragon')!.click(); confirmButton().click();
    const exported = first.controller.exportGame(); if (!exported.ok) throw Error(exported.reason);
    const data = first.data; cleanups.splice(0).reverse().forEach(f => f());
    const reloaded = setup(shop(), data); expect([state(reloaded.controller).pattes, state(reloaded.controller).recipeBook]).toEqual([4100, ['dragon']]);
    reloaded.ui.open({kind: 'shop', tab: 'recipes'}); expect(buy('dragon')).toBeNull();
    const target = setup(shop()), prepared = target.controller.prepareImport(exported.json); if (!prepared.ok) throw Error(prepared.reason);
    target.controller.confirmImport(prepared.token, true); expect([state(target.controller).pattes, state(target.controller).recipeBook]).toEqual([4100, ['dragon']]);
  });
});

describe('no heart path for recipes', () => {
  it('refuses heart complements in the command and in the quote', () => {
    const s = shop(14, 0), command = {type: 'buyRecipe', species: 'dragon'} as unknown as PattesCommand;
    expect(act(s, {type: 'payWithHearts', action: command, maxHearts: 100, maxPattes: 0}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    expect(quoteComplement(s, command, 0)).toEqual({ok: false, reason: 'INVALID_CHOICE'});
    const {ui} = setup(s); ui.open({kind: 'shop', tab: 'recipes'}); expect(panel().querySelector('.heart-spend')).toBeNull();
  });
});

describe('level announcement count', () => {
  it('counts unknown sold recipes newly purchasable, excluding bought or discovered ones', () => {
    const s = shop(1);
    expect(newlyPurchasableRecipes(s, levelUnlockContents(s, 4, 5))).toBe(1);
    expect(newlyPurchasableRecipes(s, levelUnlockContents(s, 1, 14))).toBe(6);
    expect(newlyPurchasableRecipes(s, levelUnlockContents(s, 1, 2))).toBe(0);
    s.discovered.push('bouee'); s.recipeBook.push('lunettes');
    expect(newlyPurchasableRecipes(s, levelUnlockContents(s, 1, 14))).toBe(4);
  });
});
