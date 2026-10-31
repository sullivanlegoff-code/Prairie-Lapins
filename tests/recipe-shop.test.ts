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
import {SPECIES} from '../src/config/balance';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {REFUSALS} from '../src/ui/models';
import * as breeding from '../src/simulation/breeding';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import type {MeadowScene} from '../src/display/MeadowScene';
import type {GameState, PattesCommand} from '../src/state/types';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  // Production mounts GameUI after entering the game; focus is disabled while the loading overlay keeps app inert.
  document.getElementById('app')!.inert = false; document.getElementById('loading-screen')!.hidden = true;
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
const consult = (species: string) => card(species)?.querySelector<HTMLButtonElement>(`[data-consult-recipe="${species}"]`) ?? null;
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
    const initial = shop(); initial.recipeBook = ['magicien'];
    const {ui} = setup(initial); ui.open({kind: 'shop', tab: 'recipes'});
    expect(card('dragon').textContent).toContain('À découvrir');
    expect(buy('dragon')!.textContent).toBe('Acheter la recette · 900 pièces'); expect(buy('dragon')!.querySelector('img.coin-icon')).not.toBeNull();
    expect(buy('dragon')!.disabled).toBe(false); expect(buy('magicien')).toBeNull();
    expect(card('magicien').dataset.recipeKnown).toBe('true');
    expect(card('magicien').textContent).toContain('Dans ton carnet'); expect(consult('magicien')!.textContent).toBe('Consulter et préparer');
    expect([...panel().querySelectorAll<HTMLElement>('[data-recipe]')].map(c => c.dataset.recipe).sort()).toEqual(Object.keys(RECIPE_PRICES).sort());
    for (const species of Object.keys(RECIPE_PRICES).filter(species => species !== 'magicien')) expect(buy(species)).not.toBeNull();
    expect(panel().textContent).not.toMatch(/pattes?/); expect(panel().querySelector('.heart-spend')).toBeNull();
  });
  it('shows the level once and no active button below the required level', () => {
    const {ui} = setup(shop(13)); ui.open({kind: 'shop', tab: 'recipes'});
    const texts = [...card('dragon').querySelectorAll('p')].map(p => p.textContent);
    expect(texts).toContain('Niveau 14 requis'); expect(texts).toContain('Prix : 900 pièces');
    expect(texts.filter(t => t?.includes('14'))).toHaveLength(1); expect(buy('dragon')).toBeNull(); expect(buy('magicien')).not.toBeNull();
  });
  it('disables an unaffordable recipe with a clear reason and never offers hearts', () => {
    const {ui, controller} = setup(shop(14, 500)); ui.open({kind: 'shop', tab: 'recipes'});
    expect(buy('dinono')!.disabled).toBe(false); expect(buy('dragon')!.disabled).toBe(true);
    expect(card('dragon').querySelector('.reason')!.textContent).toBe('Solde insuffisant.');
    expect(state(controller).hearts).toBe(100); expect(panel().querySelector('.heart-spend')).toBeNull();
    buy('dragon')!.click(); expect(dialog().open).toBe(false); expect(state(controller).pattes).toBe(500);
  });
  it('keeps every shop card compact and private, and builds no pairs even for known recipes', () => {
    const initial = shop(); initial.recipeBook = Object.keys(RECIPE_PRICES) as GameState['recipeBook'];
    const {ui} = setup(initial), pool = vi.spyOn(breeding, 'breedingPool'); pool.mockClear();
    ui.open({kind: 'shop', tab: 'recipes'});
    expect(pool).not.toHaveBeenCalled();
    expect(panel().querySelectorAll('[data-recipe]')).toHaveLength(8);
    for (const element of panel().querySelectorAll<HTMLElement>('[data-recipe]')) {
      expect(element.classList.contains('compact-list-card')).toBe(true);
      expect(element.querySelector('details')).toBeNull(); expect(element.querySelector('.recipe-pair')).toBeNull();
      expect(element.textContent).not.toMatch(/Affection|Parents requis|garantie|\d+ %/);
    }
    expect(card('dragon').querySelector('img[src*="rabbits/dragon"]')).toBeNull();
    [...panel().querySelectorAll('button')].find(b => b.textContent === 'Ouvrir mon carnet')!.click();
    expect(document.getElementById('panel-title')!.textContent).toBe('Carnet de reproduction');
    expect(card('dragon').textContent).toContain('Parents requis : Dadi × Phoenix');
  });
  it('treats discovered recipes as known without charging for them or exposing other unknown conditions', () => {
    const initial = shop(); initial.discovered.push('dinono'); const {ui, controller} = setup(initial), before = state(controller);
    ui.open({kind: 'shop', tab: 'recipes'});
    expect(buy('dinono')).toBeNull(); expect(consult('dinono')).not.toBeNull();
    expect(card('dinono').querySelector('img[src*="rabbits/dinono"]')).not.toBeNull();
    for (const hidden of ['Dadi', 'Phoenix', 'Affection', 'Parents requis', 'garantie', 'paire possédée', `${(SPECIES.dragon.acquisition[0] as {probability: number}).probability} %`]) expect(card('dragon').textContent).not.toContain(hidden);
    expect(card('dragon').querySelector('details')).toBeNull(); expect(state(controller)).toEqual(before);
  });
});

describe('recipe purchase flow', () => {
  it('keeps card order, scroll and focus on the new consultation button after buying', () => {
    const {ui, controller} = setup(shop()); ui.open({kind: 'shop', tab: 'recipes'});
    const order = [...panel().querySelectorAll<HTMLElement>('[data-recipe]')].map(c => c.dataset.recipe);
    panel().scrollTop = 287; buy('dinono')!.focus(); buy('dinono')!.click(); confirmButton().click();
    expect([...panel().querySelectorAll<HTMLElement>('[data-recipe]')].map(c => c.dataset.recipe)).toEqual(order);
    expect(panel().scrollTop).toBe(287); expect(document.activeElement).toBe(consult('dinono'));
    controller.refresh(); expect(document.activeElement).toBe(consult('dinono')); expect(panel().scrollTop).toBe(287);
  });
  it.each(['button', 'escape'] as const)('restores purchase focus and scroll on cancellation by %s without paying', way => {
    const {ui, controller} = setup(shop()); ui.open({kind: 'shop', tab: 'recipes'}); const before = state(controller);
    panel().scrollTop = 213; buy('dragon')!.focus(); buy('dragon')!.click();
    if (way === 'button') [...dialog().querySelectorAll('button')].find(b => b.textContent === 'Annuler')!.click();
    else dialog().dispatchEvent(new Event('cancel', {cancelable: true}));
    expect(dialog().open).toBe(false); expect(document.activeElement).toBe(buy('dragon')); expect(panel().scrollTop).toBe(213);
    expect(state(controller)).toEqual(before);
  });
  it('consults the bought recipe and prepares its parents without breeding until the final press', () => {
    const {ui, controller} = setup(shop()); const perform = vi.spyOn(controller, 'perform');
    ui.open({kind: 'shop', tab: 'recipes'}); buy('dinono')!.click(); confirmButton().click(); const purchased = state(controller);
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    consult('dinono')!.click();
    const heading = card('dinono').querySelector('h3')!;
    expect(document.activeElement).toBe(heading); expect(scroll.mock.contexts).toContain(card('dinono'));
    const advanced = card('dinono').querySelector<HTMLDetailsElement>('.recipe-rules')!;
    expect(advanced.open).toBe(false); expect(advanced.querySelector('summary')!.textContent).toBe('En savoir plus');
    expect(advanced.textContent).toContain(`hors garantie ordinaire : ${(SPECIES.dinono.acquisition[0] as {probability: number}).probability} %`);
    advanced.open = true; advanced.dispatchEvent(new Event('toggle')); controller.refresh();
    expect(card('dinono').querySelector<HTMLDetailsElement>('.recipe-rules')!.open).toBe(true);
    const prepare = [...card('dinono').querySelectorAll('button')].find(b => b.textContent === 'Préparer cette paire au nid' && !b.disabled)!;
    expect(prepare).toBeDefined(); prepare.click();
    const breedingDialog = document.getElementById('breeding-dialog') as HTMLDialogElement;
    expect(breedingDialog.open).toBe(true); expect(breedingDialog.querySelectorAll('.breeding-row.selected')).toHaveLength(2);
    expect(perform.mock.calls.filter(([command]) => command.type === 'breed')).toHaveLength(0); expect(state(controller)).toEqual(purchased);
    [...breedingDialog.querySelectorAll('button')].find(b => b.textContent === 'Croiser')!.click();
    expect(perform.mock.calls.filter(([command]) => command.type === 'breed')).toHaveLength(1);
    expect(state(controller).buildings.find(b => b.kind === 'nest')!.breeding).not.toBeNull();
  });
  it('confirms, debits once on a rapid double press, reveals the card and updates the nest without reload', () => {
    const {ui, controller, data} = setup(shop());
    // The summary line now sits inside the odds block, before the probability lines.
    expect(nestOdds(ui, 'Lapin Bélier Gris', 'Lapin Feu')).toEqual(["Résultats possibles : inconnus.", "Résultats inconnus : 100 %"]);
    const before = state(controller); ui.open({kind: 'shop', tab: 'recipes'});
    buy('dinono')!.click(); buy('dinono')!.click();
    expect(dialog().open).toBe(true); expect(dialog().querySelector('h2')!.textContent).toBe('Acheter la recette : Dinono ?');
    expect(dialog().querySelector('p')!.textContent).toBe('450 pièces. Révèle les conditions d’obtention et les paires conseillées. Ne donne aucun lapin et ne garantit aucune naissance.');
    const confirm = confirmButton(); confirm.click(); confirm.click();
    const after = state(controller);
    expect(after.pattes).toBe(before.pattes - 450); expect(after.recipeBook).toEqual(['dinono']);
    expect(after.progression).toEqual(before.progression);
    expect(after.missions).toEqual({...before.missions, completed: [...before.missions.completed, 'first-paid-recipe']});
    expect(after.missions.completed.filter(id => id === 'first-paid-recipe')).toHaveLength(1); expect(after.rabbits).toEqual(before.rabbits);
    expect(document.getElementById('toast')?.textContent ?? '').toContain('Recette ajoutée au carnet.');
    expect(card('dinono').dataset.recipeKnown).toBe('true'); expect(buy('dinono')).toBeNull();
    expect(card('dinono').textContent).toContain('Dans ton carnet');
    expect(card('dinono').textContent).not.toContain('Affection');
    consult('dinono')!.click();
    expect(card('dinono').textContent).toContain('Affection 6 minimum pour chacun des deux parents.');
    expect(card('dinono').textContent).toMatch(/\d+ paires? possédées? compatibles? avec la recette/);
    const saved = decodeGame(data.get(SAVE_KEY)!); expect(saved.ok && saved.state.recipeBook).toEqual(['dinono']);
    expect(nestOdds(ui, 'Lapin Bélier Gris', 'Lapin Feu')).toEqual(["Résultats possibles : Dinono et des résultats inconnus.", "Dinono · feu + métal · Épique : 15 %", "Résultats inconnus : 85 %"]);
    ui.open({kind: 'collection'}); [...panel().querySelectorAll('button')].find(b => b.textContent === 'Carnet de reproduction')!.click();
    expect([...card('dinono').querySelectorAll('button')].some(b => b.textContent === 'Préparer cette paire au nid')).toBe(true);
  });
  it('keeps payment, recipe and card unchanged when the save fails, then buys once', () => {
    let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const {ui, controller, flags} = setup(shop()); ui.open({kind: 'shop', tab: 'recipes'});
    flags.fail = true; buy('dinono')!.click(); confirmButton().click();
    expect(document.getElementById('toast')?.textContent).toBe(REFUSALS.ACTION_NOT_SAVED);
    expect([state(controller).pattes, state(controller).recipeBook]).toEqual([5000, []]);
    expect(card('dinono').dataset.recipeKnown).toBe('false'); expect(buy('dinono')).not.toBeNull();
    expect(document.activeElement).toBe(buy('dinono'));
    flags.fail = false; buy('dinono')!.click(); confirmButton().click();
    expect(state(controller).pattes).toBe(5000); // Same command inside the 350 ms double-tap window: ignored.
    clock += 1000; buy('dinono')!.click(); confirmButton().click();
    expect([state(controller).pattes, state(controller).recipeBook]).toEqual([4550, ['dinono']]);
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
    expect(newlyPurchasableRecipes(s, levelUnlockContents(s, 4, 5))).toBe(0);
    expect(newlyPurchasableRecipes(s, levelUnlockContents(s, 1, 14))).toBe(7);
    expect(newlyPurchasableRecipes(s, levelUnlockContents(s, 1, 2))).toBe(0);
    s.discovered.push('dinono'); s.recipeBook.push('magicien');
    expect(newlyPurchasableRecipes(s, levelUnlockContents(s, 1, 14))).toBe(6);
  });
});
