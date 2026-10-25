import {establishHistoricalLevelRights} from '../src/simulation/levelRights';
import {cumulativeLevelXp} from '../src/simulation/progression';
import * as progressionApi from '../src/simulation/progression';
import {foodXp} from '../src/simulation/progression';
import {PROGRESSION} from '../src/config/progression';
import {createGame as soloStart} from '../src/simulation';
import {createCentreStartGame} from '../src/state/initial';
import {previousStart as currentStart} from './regression-start';
import {regressionStart as createGame} from './regression-start';
// @vitest-environment happy-dom
import html from '../index.html?raw';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GameController} from '../src/application/GameController';
import {REFUSALS} from '../src/ui/models';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {mountSavePanel} from '../src/display/SavePanel';
import type {MeadowScene} from '../src/display/MeadowScene';
import {act, encodeGame, decodeGame} from '../src/simulation';
import {toV11} from './island-remap';
import type {Command, GameState} from '../src/state/types';
import {developmentEnvironment} from '../src/dev/tools';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {scenarioState} from '../src/dev/scenarios';
import {NURSERY, SPECIES} from '../src/config/balance';
import {babyOf, setBaby} from './nursery-baby';
import {EXPECTED_IDS, EXPECTED_RECIPE_IDS, rareAdditions, shareLabel} from './rabbit-art-fixtures';
import {emptyBuilding} from '../src/state/initial';

const cleanups: (() => void)[] = [];
it('buys, places and selects Cuisine without opening the cooking activity', () => {
  const initial=createGame(0);initial.buildings[0].x=26;initial.buildings[0].y=28;
  const {controller,ui}=setup(initial);
  document.getElementById('open-shop')!.click();button('Bâtiments et décorations').click();
  button('Placer · 100 pièces').click();ui.select({kind:'cell',x:19,y:22});
  button('Acheter et placer · 100 pièces').click();
  const kitchen=state(controller).buildings.find(b=>b.kind==='kitchen')!;
  expect(kitchen).toMatchObject({x:19,y:22});
  ui.select({kind:'building',id:kitchen.id});
  expect(document.getElementById('panel-title')!.textContent).toBe('Cuisine');
  expect(button('Entrer dans la Cuisine')).toBeDefined();
  expect(button('Déplacer ce bâtiment')).toBeDefined();
  expect(document.querySelector('.cuisine-root')).toBeNull();
  button('Déplacer ce bâtiment').click();
  ui.select({kind:'cell',x:20,y:22});button('Confirmer le déplacement · gratuit').click();
  expect(state(controller).buildings.find(b=>b.id===kitchen.id)).toMatchObject({kind:'kitchen',x:20,y:22});
});
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  // These tests mount GameUI directly, which production only does after « Jouer ».
  document.getElementById('app')!.inert = false;
  document.getElementById('loading-screen')!.hidden = true;
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(initial = createGame(0), laboratory = false) {
  establishHistoricalLevelRights(initial);
  const data = new Map<string, string>([[SAVE_KEY, encodeGame(initial)]]);
  const storage: SaveStorage = {scope:laboratory?'laboratory':'normal',getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }};
  const clock = {now: 0}; const controller = new GameController(storage, () => clock.now, () => .65);
  const scene = {focusTutorialCell:vi.fn(),setTutorialCell:vi.fn(),setTutorialTarget:vi.fn(),setRabbitPurchase: vi.fn(), overview: vi.fn(), focusDecoration: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn(), focusBuilding: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('test-ui'); prefs.set({muted: true, tutorial: false});
  const ui = new GameUI(controller, scene, () => clock.now, prefs);
  const disposeSave = mountSavePanel(controller, () => ui.onReplacement());
  cleanups.push(() => { disposeSave(); ui.dispose(); controller.dispose(); });
  return {controller, ui, clock, storage, data, scene, prefs};
}
const panel = () => document.getElementById('panel-content')!;
const breeding = () => document.getElementById('breeding-dialog') as HTMLDialogElement;
/** A row of the pairing window: slot 0 is Lapin 1 (left), slot 1 is Lapin 2 (right); `name` is a name prefix or an index. */
const breedingRow = (slot: 0 | 1, name: string | number) => {
  const rows = [...breeding().querySelectorAll('.breeding-column')[slot].querySelectorAll<HTMLButtonElement>('button.breeding-row')];
  return typeof name === 'number' ? rows[name] : rows.find(r => r.querySelector('strong')?.textContent?.startsWith(name))!;
};
/** Croiser in the nest panel, one rabbit in each list, then the red Croiser. */
function crossFromNest(a: string | number, b: string | number, launch = true) {
  button('Croiser').click(); breedingRow(0, a).click(); breedingRow(1, b).click();
  if (launch) button('Croiser', breeding()).click();
}
/**
 * Every Common but Terre bought and housed (Paille and Neige in the first enclosure, Bélier Gris, Feu and Volant in the second, the third and fourth empty), a farm,
 * a nest, a nursery, affection 2 everywhere and a pending guarantee: the state the retired docs/test-saves/collection-ready-v2.json described, written as v16 and without Terre.
 */
function collectionReady(): GameState {
  let s = createGame(0); s.pattes = 20_000; s.grass = 500; s.progression = {totalXp: cumulativeLevelXp(9), rewardedThroughLevel: 9};
  const step = (command: Command) => { const r = act(s, command, 0, () => .5); if (!r.ok) throw Error(command.type + ': ' + r.reason); s = r.state; };
  step({type: 'placeStarterBuilding', kind: 'nest', x: 22, y: 20}); step({type: 'placeStarterBuilding', kind: 'nursery', x: 26, y: 20}); step({type: 'buyBuilding', kind: 'farm', x: 22, y: 24});
  for (const [x, y] of [[18, 24], [26, 24], [18, 28]]) step({type: 'buyBuilding', kind: 'enclosure', x, y});
  const second = s.buildings.filter(b => b.kind === 'enclosure')[1].id;
  for (const species of ['belier-gris', 'feu', 'volant'] as const) step({type: 'buyRabbit', species, enclosureId: second});
  s.rabbits.forEach(r => r.affection = 2); s.hearts = 12; s.pityFailures = 9; return s;
}
describe('reproduction text follows current recipe data', () => {
  it('explains recipe-specific thresholds in the nest without revealing unknown conditions', () => {
    const {ui}=setup(scenarioState('guidedLegacy',0));
    ui.open({kind:'building',id:'building-4'});
    expect(panel().textContent).toContain('La reproduction est possible dès affection 2 chez chacun des deux parents.');
    expect(panel().textContent).toContain('Chaque recette possède ses propres conditions');
    expect(panel().textContent).toContain('résultats ordinaires explicitement éligibles à la garantie et admissibles à cette paire');
    expect(panel().textContent).not.toContain('Recettes rares : affection 4');
    for(const hidden of ['Frisket','Icy','épiques : 6','légendaires : 10']) expect(panel().textContent).not.toContain(hidden);
  });
  it.each(['frisket','icy'] as const)('known %s requires affection 2 and has no discovery guarantee', id => {
    const initial=createGame(0);initial.recipeBook.push(id);
    const {ui}=setup(initial);ui.open({kind:'recipes'});
    const card=panel().querySelector(`[data-recipe="${id}"]`)!;
    expect(card.getAttribute('data-recipe-known')).toBe('true');
    expect(card.textContent).toContain('Affection 2 minimum pour chacun des deux parents.');
    expect(card.textContent).toContain('Cette espèce ne bénéficie pas de la garantie de découverte.');
    expect(card.textContent).not.toContain('Cette espèce bénéficie de la garantie ordinaire');
    expect(panel().textContent).toContain('espèces explicitement éligibles à la garantie, non découvertes et admissibles à cette paire');
  });
  it('retains the historical guarantee indication for a known eligible recipe', () => {
    const known=createGame(0);known.recipeBook=['lunettes'];const {ui}=setup(known);ui.open({kind:'recipes'});
    expect(panel().querySelector('[data-recipe="lunettes"]')!.textContent).toContain('Cette espèce bénéficie de la garantie ordinaire si elle n’est pas encore découverte et reste admissible.');
  });
  it('reads explicit eligibility rather than inferring it from the absence of a fixed probability', () => {
    const original=SPECIES.lunettes.acquisition;
    try {
      SPECIES.lunettes.acquisition=original.map(source=>source.kind==='recipe'?{...source,guaranteeEligible:false}:source);
      const known=createGame(0);known.recipeBook=['lunettes'];const {ui}=setup(known);ui.open({kind:'recipes'});
      const card=panel().querySelector('[data-recipe="lunettes"]')!;
      expect(card.textContent).toContain('Cette espèce ne bénéficie pas de la garantie de découverte.');
      expect(card.textContent).not.toContain('Cette espèce bénéficie de la garantie ordinaire');
    } finally {SPECIES.lunettes.acquisition=original;}
  });
  it('keeps unknown recipe conditions hidden without exposing thresholds or guarantee policy', () => {
    const {ui}=setup();ui.open({kind:'recipes'});
    const card=panel().querySelector('[data-recipe="frisket"]')!;
    expect(card.getAttribute('data-recipe-known')).toBe('false');
    expect(card.querySelector('h3')!.textContent).toBe('Frisket'); // Existing notebook names are public; conditions are private.
    expect(card.textContent).toContain('Recette inconnue');
    for(const hidden of ['Affection 2 minimum','bénéficie','garantie de découverte'])expect(card.textContent).not.toContain(hidden);
    expect(card.querySelector('details')).toBeNull();
  });
});
it('opens the existing island expansion circuit from the shop without spending and returns to categories', () => {
  const {controller, scene} = setup();
  const before = encodeGame(state(controller));
  document.getElementById('open-shop')!.click(); button('Île').click();
  expect(document.getElementById('panel-title')!.textContent).toBe('Agrandir l’île');
  expect(scene.setExpansion).toHaveBeenLastCalledWith(true, undefined);
  expect(encodeGame(state(controller))).toBe(before);
  document.getElementById('panel-back')!.click();
  expect(panel().querySelectorAll('.shop-category')).toHaveLength(5);
  expect(encodeGame(state(controller))).toBe(before);
});
function button(text: string, scope: ParentNode = panel()): HTMLButtonElement {
  const result = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === text);
  if (!result) throw new Error(`Button missing: ${text}\n${scope.textContent}`); return result;
}
function state(controller: GameController): GameState { return controller.getSnapshot().state!; }
function place(ui: GameUI, kind: 'farm' | 'nest' | 'nursery' | 'enclosure', x: number, y: number) {
  // Former 3 × 3-parcel column/row, placed at its v11 fine cell (same arrangement, enlarged parcels).
  x=toV11((x<6?x+3:x-6)*4,'x');y=toV11((y+3)*4,'y');
  if(kind==='nest'||kind==='nursery'){document.getElementById('open-arrange')!.click();button(`Placer gratuitement : ${kind==='nest'?'Nid':'Nurserie'}`).click();ui.select({kind:'cell',x,y});button('Placer gratuitement').click();return;}
  document.getElementById('open-shop')!.click();
  button(kind === 'farm' ? 'Bâtiments et décorations' : 'Habitats').click();
  const prices = {farm: 60, nest: 100, nursery: 80, enclosure: 120};
  button(`Placer · ${prices[kind]} pièces`).click(); ui.select({kind: 'cell', x, y}); button(`Acheter et placer · ${prices[kind]} pièces`).click();
}

describe('decoration UI transactions (simulated DOM; Phaser verified separately)', () => {
  it('closes stale confirmations when the controller replaces the game directly', () => {
    const {controller} = setup(); document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Décorations').click();
    const card = panel().querySelector<HTMLElement>('[data-catalog="bush"]')!;
    button('Acheter pour l’inventaire · 20 pièces', card).click();
    const stale = button('Confirmer', document.getElementById('game-dialog')!);
    expect(controller.restart(true).ok).toBe(true);
    expect((document.getElementById('game-dialog') as HTMLDialogElement).open).toBe(false);
    stale.click(); expect(state(controller).pattes).toBe(300); expect(state(controller).decorations).toEqual([]);
  });

  const shop = () => {document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Décorations').click();};
  const catalog = (id: string) => panel().querySelector<HTMLElement>(`[data-catalog="${id}"]`)!;
  it('previews without payment, cancels to the same category and commits exactly one placed copy', () => {
    const {controller,ui}=setup(); shop(); panel().scrollTop=240;
    button('Acheter · 20 pièces',catalog('bush')).click();
    expect(state(controller).decorations).toEqual([]); expect(state(controller).pattes).toBe(300);
    ui.select({kind:'fineCell',x:25,y:23}); button('Annuler le placement').click();
    expect(panel().scrollTop).toBe(240); expect(panel().querySelectorAll('[data-catalog]')).toHaveLength(13);
    expect(state(controller).pattes).toBe(300);
    button('Acheter · 20 pièces',catalog('bush')).click();
    ui.select({kind:'fineCell',x:18,y:20}); expect(button('Acheter et placer · 20 pièces').disabled).toBe(true);
    ui.select({kind:'fineCell',x:25,y:23}); const confirm=button('Acheter et placer · 20 pièces');confirm.click();confirm.click();
    expect(state(controller).pattes).toBe(280);expect(state(controller).decorations).toHaveLength(1);
    expect(state(controller).decorations[0].location).toEqual({kind:'outside',x:25,y:23,rotation:0});
    expect(document.getElementById('game-panel')!.dataset.view).toBe('decoration');
  });
  it('shows a neutral pending destination and keeps the placed list open across autosave refreshes', () => {
    const {controller, ui, clock} = setup(); shop();
    button('Acheter pour l’inventaire · 20 pièces', catalog('bush')).click(); button('Confirmer', document.getElementById('game-dialog')!).click();
    document.getElementById('close-panel')!.click(); document.getElementById('open-arrange')!.click();button('Placer cet exemplaire').click();
    expect(panel().querySelector('.placement-pending')?.textContent).toContain('Choisissez une destination');
    expect(button('Confirmer la pose · gratuit').disabled).toBe(true);
    ui.select({kind: 'fineCell', x: 25, y: 23}); button('Confirmer la pose · gratuit').click();
    panel().querySelector<HTMLDetailsElement>('[data-placed-list]')!.open = true;
    clock.now = 5000; controller.refresh();
    expect(panel().querySelector<HTMLDetailsElement>('[data-placed-list]')!.open).toBe(true);
    expect(state(controller).decorations[0].location).toEqual({kind: 'outside', x: 25, y: 23, rotation: 0});
    ui.select({kind: 'decoration', id: state(controller).decorations[0].id});
    document.getElementById('panel-back')!.click();
    expect(panel().querySelector<HTMLDetailsElement>('[data-placed-list]')!.open).toBe(true);
  });
  it('refuses insufficient resources before confirmation and preserves every owned item', () => {
    const initial = createGame(0); initial.pattes = 19; const {controller} = setup(initial); shop();
    expect(button('Acheter · 20 pièces', catalog('bush')).disabled).toBe(true); expect(catalog('bush').textContent).toContain('Solde insuffisant');
    button('Acheter · 20 pièces', catalog('bush')).click(); expect((document.getElementById('game-dialog') as HTMLDialogElement).open).toBe(false); expect(state(controller)).toEqual(initial);
  });
  it('requires explicit confirmation to move; closing a panel preserves the old location and rotation', () => {
    const initial=createGame(0);initial.pattes=1000;initial.progression={totalXp:cumulativeLevelXp(12),rewardedThroughLevel:12};const {controller, ui, scene} = setup(initial); controller.perform({type: 'buyDecoration', catalogId: 'large-bookcase'});
    controller.perform({type: 'placeDecoration', id: 'decoration-4', location: {kind: 'outside', x: 25, y: 23, rotation: 0}});
    const original = state(controller); document.getElementById('open-arrange')!.click(); ui.select({kind: 'decoration', id: 'decoration-4'}); expect([...panel().querySelectorAll('button')].some(b=>b.textContent==='Tourner de 90°')).toBe(false);button('Déplacer').click();
    ui.select({kind: 'fineCell', x: 29, y: 20}); expect(panel().textContent).toContain('✓ Emplacement valide'); expect(state(controller)).toEqual(original);
    document.getElementById('close-panel')!.click(); expect(state(controller)).toEqual(original); expect(scene.setArrangement).toHaveBeenLastCalledWith(false, null);
    document.getElementById('open-arrange')!.click(); ui.select({kind: 'decoration', id: 'decoration-4'}); button('Déplacer').click(); ui.select({kind: 'fineCell', x: 25, y: 24});
    const confirm = button('Confirmer la pose · gratuit'); confirm.click(); confirm.click();
    expect(state(controller).decorations).toHaveLength(1); expect(state(controller).decorations[0].location).toEqual({kind: 'outside', x: 25, y: 24, rotation: 0}); expect(state(controller).pattes).toBe(original.pattes);
    ui.select({kind: 'decoration', id: 'decoration-4'}); button('Ranger dans l’inventaire').click(); expect(state(controller).decorations[0].location.kind).toBe('inventory');
  });
  it('shows overlap, building and bounds refusals without modifying the object', () => {
    const {controller, ui} = setup(); controller.perform({type: 'buyDecoration', catalogId: 'bush'});
    controller.perform({type: 'placeDecoration', id: 'decoration-4', location: {kind: 'outside', x: 25, y: 23, rotation: 0}}); controller.perform({type: 'buyDecoration', catalogId: 'bush'});
    document.getElementById('open-arrange')!.click(); button('Placer cet exemplaire').click(); const original = state(controller);
    for (const [x, y, reason] of [[25,23,'chevauche'],[18,20,'occupée'],[34,20,'disponible']] as const) {
      ui.select({kind: 'fineCell', x, y}); expect(button('Confirmer la pose · gratuit').disabled).toBe(true); expect(panel().textContent).toContain(reason); expect(state(controller)).toEqual(original);
    }
  });
  it('refuses blocking objects without automatically storing them; an explicit object action frees the footprint', () => {
    const {controller, ui}=setup();controller.perform({type:'buyDecoration',catalogId:'bush'});controller.perform({type:'placeDecoration',id:'decoration-4',location:{kind:'outside',x:25,y:23,rotation:0}});
    document.getElementById('open-shop')!.click();button('Bâtiments et décorations').click();button('Placer · 60 pièces').click();ui.select({kind:'fineCell',x:22,y:20});const original=state(controller);
    expect(button('Acheter et placer · 60 pièces').disabled).toBe(true);expect(panel().textContent).toContain('chevauche une décoration');expect(panel().textContent).not.toContain('Ranger les');expect(state(controller)).toEqual(original);
    button('Annuler · aucun coût').click();document.getElementById('close-panel')!.click();ui.select({kind:'decoration',id:'decoration-4'});button('Ranger dans l’inventaire').click();
    expect(state(controller).pattes).toBe(original.pattes);expect(state(controller).decorations[0].location.kind).toBe('inventory');
    document.getElementById('open-shop')!.click();button('Bâtiments et décorations').click();button('Placer · 60 pièces').click();ui.select({kind:'fineCell',x:22,y:20});button('Acheter et placer · 60 pièces').click();
    expect(state(controller).pattes).toBe(original.pattes-60);expect(state(controller).buildings).toHaveLength(2);
  });
  it('enters photo mode without changing the save, exits arrangement and returns controls', () => {
    const {controller, data, scene} = setup(); document.getElementById('open-arrange')!.click(); const before = data.get(SAVE_KEY), stateBefore = state(controller);
    document.getElementById('open-photo')!.click(); expect(document.body.classList.contains('photo-mode')).toBe(true); expect(scene.setPhoto).toHaveBeenLastCalledWith(true); expect(document.getElementById('arrange-banner')!.hidden).toBe(true);
    document.getElementById('photo-return')!.click(); expect(document.body.classList.contains('photo-mode')).toBe(false); expect(scene.setPhoto).toHaveBeenLastCalledWith(false); expect(data.get(SAVE_KEY)).toBe(before); expect(state(controller)).toEqual(stateBefore);
  });
});

describe('real HTML UI wired to the real controller (simulated DOM, not a browser)', () => {
  it('shows the next initial mission and removes each claimed card, preserving a stale-button guard', () => {
    const {controller,ui,data}=setup(); document.getElementById('open-missions')!.click();
    expect(panel().querySelectorAll('article')).toHaveLength(1);
    expect(panel().querySelector('[data-mission="first-meal"]')).not.toBeNull();
    expect(button('Réclamer · + 10 herbes').disabled).toBe(true);button('Voir un lapin').click();
    button('Nourrir · 2 herbes').click(); document.getElementById('open-missions')!.click();
    const old=button('Réclamer · + 10 herbes');panel().scrollTop=150;old.click();old.click();expect(panel().scrollTop).toBe(0);
    expect(state(controller).grass).toBe(18);expect(state(controller).missions.claimed).toEqual(['first-meal']);
    expect(panel().querySelector('[data-mission="first-meal"]')).toBeNull();
    expect(panel().querySelector('[data-mission="first-farm"]')).not.toBeNull();
    expect(decodeGame(data.get(SAVE_KEY)!)).toEqual({ok:true,state:state(controller)});ui.close();
  });
  it('the two-parent mission opens the parent below affection 2 without feeding the already-ready parent again', () => {
    const initial=createGame(0);initial.rabbits[0].affection=2;
    initial.missions.completed=['first-meal','first-farm','first-harvest'];initial.missions.claimed=[...initial.missions.completed];
    const {controller}=setup(initial);document.getElementById('open-missions')!.click();
    expect(panel().querySelector('[data-mission="parents-ready"]')).not.toBeNull();
    button('Voir le parent à nourrir').click();expect(document.getElementById('panel-title')!.textContent).toBe('Lapin Neige');
    button('Nourrir · 2 herbes').click();expect(state(controller).rabbits.map(r=>r.affection)).toEqual([2,2]);
    document.getElementById('open-missions')!.click();expect(button('Réclamer · + 20 pièces').disabled).toBe(false);
  });
  it('claims three daily rewards and the separate bonus through UI, then expires the cycle', () => {
    const initial=createGame(0);initial.grass=100;
    const {controller,ui,clock}=setup(initial);place(ui,'farm',1,0);
    controller.perform({type:'startOrder',id:'building-4',recipe:'medium'});
    clock.now=5*3600_000;controller.perform({type:'collectIncome',id:'building-1'});controller.perform({type:'collectOrder',id:'building-4'});
    for(let i=0;i<3;i++)controller.perform({type:'feed',id:'rabbit-2'});
    document.getElementById('open-missions')!.click();button('Quotidiennes').click();
    const card=(id:string)=>panel().querySelector<HTMLElement>(`[data-mission="${id}"]`)!;
    expect(panel().textContent).toContain('expirent');expect(panel().querySelector('.timer')!.textContent).toBe('19 h 0 min');
    expect(button('Réclamer · + 2 cœurs',card('daily-bonus')).disabled).toBe(true);
    for(const [id,label] of [['collect-pattes','30 pièces'],['collect-grass','10 herbes'],['gain-affection','20 pièces']])button(`Réclamer · + ${label}`,card(id)).click();
    expect(state(controller).missions.daily.progress).toEqual({'collect-pattes':120,'collect-grass':40,'gain-affection':3});
    const bonus=button('Réclamer · + 2 cœurs',card('daily-bonus'));bonus.click();bonus.click();
    expect(state(controller).hearts).toBe(15);expect(state(controller).nextHeartGiftAt).toBe(24*3600_000);
    expect(card('daily-bonus')).toBeNull();expect(panel().querySelectorAll('article')).toHaveLength(0);
    clock.now=24*3600_000;controller.refresh();bonus.click();
    expect(state(controller).hearts).toBe(15);expect(state(controller).missions.daily.cycleIndex).toBe(1);
    expect(card('collect-pattes').textContent).toContain('Progression : 0 / 100');
    expect(button('Réclamer · + 2 cœurs',card('daily-bonus')).disabled).toBe(true);
  });
  it('invalidates a mission claim button after replacement by import',()=>{
    const initial=createGame(0);initial.missions.completed=['first-farm','first-meal'];initial.missions.claimed=['first-meal'];
    const {controller,ui}=setup(initial);document.getElementById('open-missions')!.click();
    const old=button('Réclamer · + 20 herbes',panel().querySelector('[data-mission="first-farm"]')!);
    const replacement=createGame(0);replacement.missions.completed=['first-farm','first-meal'];replacement.missions.claimed=['first-meal'];replacement.grass=77;
    establishHistoricalLevelRights(replacement);const p=controller.prepareImport(encodeGame(replacement));if(!p.ok)throw Error(p.reason);
    controller.confirmImport(p.token,true);ui.onReplacement();old.click();expect(state(controller)).toEqual(replacement);
  });
  it('keeps mission rewards and cycle renewals isolated in development mode',()=>{
    const normal=encodeGame(createGame(0)), values=new Map([[SAVE_KEY,normal]]);
    const base:SaveStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}};
    const dev=developmentEnvironment(base), c=new GameController(dev.storage,dev.clock),dispose=dev.mount(c);
    // The laboratory plays its own fresh game: the southwest start, so the same spot inside it.
    expect(c.perform({type:'buyBuilding',kind:'farm',x: 6, y: 36}).ok).toBe(true);
    expect(c.perform({type:'claimMainMission',id:'first-farm'}).ok).toBe(true);
    expect(state(c).grass).toBe(20);button('+ 1440 min',document.getElementById('devtools')!).click();
    expect(state(c).missions.daily.cycleIndex).toBe(1);expect(state(c).missions.claimed).toEqual(['first-farm']);
    expect(values.get(SAVE_KEY)).toBe(normal);dispose();c.dispose();
  });
  it('recenters explicitly without changing the game or its placement', () => {
    const {controller, scene} = setup(); const perform = vi.spyOn(controller, 'perform');
    const before = state(controller); document.getElementById('recenter-view')!.click();
    expect(scene.recenter).toHaveBeenCalledOnce(); expect(perform).not.toHaveBeenCalled();
    expect(state(controller)).toEqual(before); expect(scene.setPlacement).not.toHaveBeenCalled();
  });
  it('cancels placement without executing a purchase or spending, then validates one purchase', () => {
    const {controller, ui, scene} = setup(); const perform = vi.spyOn(controller, 'perform');
    document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Placer · 60 pièces').click();
    ui.select({kind: 'cell', x: 22, y: 20}); button('Annuler · aucun coût').click();
    expect(perform).not.toHaveBeenCalled(); expect(state(controller).pattes).toBe(300); expect(scene.setPlacement).toHaveBeenLastCalledWith(null);
    place(ui, 'farm', 1, 0); expect(perform).toHaveBeenCalledOnce(); expect(state(controller).pattes).toBe(240);
    expect(document.getElementById('pattes')!.textContent).toBe('240');
  });
  it('disables invalid cells and insufficient resources with a readable reason', () => {
    const {ui, controller} = setup(); document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Placer · 60 pièces').click();
    ui.select({kind: 'cell', x: 18, y: 20}); expect(button('Acheter et placer · 60 pièces').disabled).toBe(true); expect(panel().textContent).toContain('occupée');
    ui.select({kind: 'cell', x: 34, y: 20}); expect(button('Acheter et placer · 60 pièces').disabled).toBe(true);
    expect(state(controller).pattes).toBe(300);
  });
  it('handles a stale enabled button through the controller without spending', () => {
    const {ui, controller} = setup(); document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Placer · 60 pièces').click();
    ui.select({kind: 'cell', x: 22, y: 20}); const stale = button('Acheter et placer · 60 pièces');
    const replacement = createGame(0); replacement.pattes = 0;
    const candidate = controller.prepareImport(encodeGame(replacement)); if (!candidate.ok) throw new Error(candidate.reason);
    controller.confirmImport(candidate.token, true); stale.click();
    expect(state(controller).buildings).toHaveLength(1); expect(state(controller).pattes).toBe(0);
  });
  it('a double pressure on Feed performs exactly one action and updates the view', () => {
    const {ui, controller, scene} = setup(); const perform = vi.spyOn(controller, 'perform');
    ui.select({kind: 'rabbit', id: 'rabbit-2'}); button('Nourrir · 2 herbes').click(); button('Nourrir · 4 herbes').click();
    expect(perform).toHaveBeenCalledOnce(); expect(state(controller).rabbits[0].affection).toBe(2);expect(state(controller).progression.totalXp).toBe(foodXp(2));
    expect(document.getElementById('grass')!.textContent).toBe('8'); expect(panel().textContent).toContain('Affection 2 / 20'); expect(scene.reactToFeed).toHaveBeenCalledWith('rabbit-2');
  });
  it('keeps incomplete saved species unknown in the collection', () => {
    const {ui} = setup(); ui.open({kind: 'collection'});
    expect(panel().textContent).not.toMatch(/Terre|Brumelin|Mottelin|Géant/);
    expect([...panel().querySelectorAll('h3')].filter(e => e.textContent === '???')).toHaveLength(EXPECTED_IDS.length - 2);
  });
  it.each(['feu', 'belier-gris', 'volant'] as const)('buys and welcomes %s from the five-common shop into the whole collection', species => {
    const {controller, ui} = setup(); ui.open({kind: 'shop', tab: 'rabbits'});
    expect(panel().querySelectorAll('article')).toHaveLength(5);
    expect(panel().textContent).not.toMatch(/Terre|Lapin à Lunettes|Lapin Perroquet|Lapin Feu Glacé/);
    const card = [...panel().querySelectorAll('article')].find(c => c.querySelector('h3')?.textContent === SPECIES[species].name)!;
    button('Choisir un habitat · 80 pièces', card).click(); ui.select({kind:'building',id:state(controller).buildings[0].id}); button('Confirmer l’achat · 80 pièces').click();
    expect(state(controller).pattes).toBe(220); expect(state(controller).rabbits.at(-1)?.species).toBe(species);
    const dialog = document.getElementById('game-dialog')!; expect(dialog.textContent).toContain(SPECIES[species].name);
    button('Bienvenue dans la prairie', dialog).click(); ui.open({kind: 'collection'});
    expect(document.getElementById('panel-title')!.textContent).toBe(`Collection · 3/${EXPECTED_IDS.length}`);
    expect(panel().textContent).toContain(SPECIES[species].name); expect(panel().querySelectorAll('article')).toHaveLength(EXPECTED_IDS.length);
  });
  it('explains feeding in the notebook, previews 50/50 then 40/40/20, and prepares parents without launching', () => {
    const initial = collectionReady();initial.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6}; initial.pityFailures = 0;
    initial.recipeBook.push('feu-glace'); // Bought recipe of a still undiscovered species.
    const {ui, controller} = setup(initial);
    const recipe = () => [...panel().querySelectorAll('article')].find(c => c.textContent?.includes('feu + neige · Rare'))!;
    ui.open({kind: 'collection'}); button('Carnet de reproduction').click();
    // Validated rule: recipe names are public in the notebook; the collection keeps its "???".
    expect(panel().querySelectorAll('article')).toHaveLength(EXPECTED_RECIPE_IDS.length); expect(recipe().dataset.recipeKnown).toBe('true');
    expect(recipe().textContent).toContain('Affection 4 minimum'); expect(recipe().textContent).toContain('À nourrir');
    expect(button('Préparer cette paire au nid', recipe()).disabled).toBe(true);
    button('Voir le parent n° 3 à nourrir', recipe()).click(); expect(panel().textContent).toContain('Affection 2 / 20');
    ui.select({kind: 'building', id: 'building-4'});
    crossFromNest('Lapin Feu', 'Lapin Neige', false);
    const odds = () => breeding().querySelector('.breeding-odds')!.textContent;
    expect(breeding().querySelector('.breeding-odds')).toBeNull(); button('Probabilités', breeding()).click();
    expect(odds()).toContain(`feu · Commun : ${shareLabel(40, 80 + 20 * Object.keys(rareAdditions(['feu', 'neige'], 2, 2)).length)}`);
    expect(odds()).not.toContain('feu + neige');
    for (const id of ['rabbit-3', 'rabbit-11']) for (let n = 0; n < 2; n++) expect(controller.perform({type: 'feed', id}).ok).toBe(true);
    expect(odds()).toContain(`feu + neige · Rare : ${shareLabel(20, 100 + 20 * Object.keys(rareAdditions(['feu', 'neige'], 4, 4)).length)}`);
    expect(odds()).toContain(`neige · Commun : ${shareLabel(40, 100 + 20 * Object.keys(rareAdditions(['feu', 'neige'], 4, 4)).length)}`);
    breeding().close(); ui.open({kind: 'recipes'}); expect(recipe().textContent).toContain(`Recette possible, résultat non garanti · ${shareLabel(20, 100 + 20 * Object.keys(rareAdditions(['feu', 'neige'], 4, 4)).length)}`);
    const before = state(controller), perform = vi.spyOn(controller, 'perform');
    button('Préparer cette paire au nid', recipe()).click(); expect(perform).not.toHaveBeenCalled(); expect(state(controller)).toEqual(before);
    // The shortcut opens the pairing window with the recipe's pair already chosen, nothing launched.
    expect(breeding().open).toBe(true); expect(button('Croiser', breeding()).disabled).toBe(false);
    expect(breedingRow(0, 'Lapin Neige').getAttribute('aria-pressed')).toBe('true'); expect(breedingRow(1, 'Lapin Feu').getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps a guaranteed new rare hidden through reproduction and growth, then discovers it on manual welcome', () => {
    const initial = collectionReady();initial.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6};
    for (const r of initial.rabbits) r.affection = 4;
    initial.recipeBook.push('feu-glace'); // The shortcut exists only for a known recipe; the species stays undiscovered.
    const {ui, controller, clock, data} = setup(initial); clock.now = initial.lastSimulatedAt;
    ui.open({kind: 'recipes'});
    const recipe = [...panel().querySelectorAll('article')].find(c => c.textContent?.includes('feu + neige · Rare'))!;
    expect(recipe.textContent).toContain('Résultat garanti pour cette recette · 100 %');
    button('Préparer cette paire au nid', recipe).click(); button('Croiser', breeding()).click();
    expect(breeding().open).toBe(false); expect(panel().textContent).not.toContain('Lapin Feu Glacé'); expect(state(controller).pityFailures).toBe(0);
    const saved = decodeGame(data.get(SAVE_KEY)!); expect(saved.ok && saved.state.buildings.find(b => b.breeding)?.breeding?.birth).toMatchObject({species: 'feu-glace', guaranteed: true, reservedDiscovery: true});
    clock.now += 20 * 60_000; controller.refresh();button('Envoyer dans la nurserie').click(); ui.select({kind: 'building', id: 'building-5'});
    expect(panel().textContent).not.toContain('Lapin Feu Glacé'); expect(panel().querySelector('.timer')!.textContent).toBe('30 min 0 s');
    button('Terminer · 6 cœurs').click(); const dialog = document.getElementById('game-dialog')!;
    expect(dialog.textContent).not.toContain('Lapin Feu Glacé'); button('Confirmer', dialog).click();
    expect(state(controller).hearts).toBe(6); expect(state(controller).discovered).not.toContain('feu-glace');
    expect(panel().textContent).toContain('Lapin Feu Glacé'); button('Enclos 3 · 0/3').click();
    expect(dialog.textContent).toContain('Nouvelle découverte'); expect(dialog.textContent).toContain('Lapin Feu Glacé');
    button('Bienvenue dans la prairie', dialog).click(); ui.open({kind: 'collection'});
    expect(document.getElementById('panel-title')!.textContent).toBe(`Collection · 6/${EXPECTED_IDS.length}`);
    expect(decodeGame(data.get(SAVE_KEY)!)).toEqual({ok: true, state: state(controller)});
  });
  it('completes the farming, breeding, revealing, welcoming and movement loop through UI controls', () => {
    const initial = createGame(0);initial.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6}; initial.pattes = 10_000; initial.grass = 500;
    const {ui, controller, clock, data} = setup(initial);
    ui.select({kind: 'rabbit', id: 'rabbit-2'}); button('Nourrir · 2 herbes').click();
    ui.select({kind: 'rabbit', id: 'rabbit-3'}); button('Nourrir · 2 herbes').click();
    place(ui, 'farm', 1, 0); place(ui, 'nest', 2, 0); place(ui, 'nursery', 0, 1); place(ui, 'enclosure', 1, 1);
    const find = (kind: string) => state(controller).buildings.find(b => b.kind === kind)!;
    ui.select({kind: 'building', id: find('farm').id}); button('Produire · 10 pièces').click();
    expect(button('Récolter 20 herbes').disabled).toBe(true); clock.now += 5 * 60_000; controller.refresh(); button('Récolter 20 herbes').click();
    expect(state(controller).grass).toBe(516);
    ui.select({kind: 'building', id: find('nest').id});
    crossFromNest('Lapin Paille', 'Lapin Neige'); expect(find('nest').breeding?.birth.species).toBe('icy'); expect(panel().textContent).not.toContain('Icy');
    clock.now += 20 * 60_000; controller.refresh();ui.select({kind:'building',id:find('nest').id});button('Envoyer dans la nurserie').click(); ui.select({kind: 'building', id: find('nursery').id});
    expect(panel().textContent).toContain('secrète'); expect(panel().textContent).not.toContain('Icy');
    ui.open({kind: 'collection'}); expect(panel().textContent).not.toContain('Icy');
    clock.now += 30 * 60_000; controller.refresh(); ui.select({kind: 'building', id: find('nursery').id});
    expect(panel().textContent).toContain('Icy'); expect(state(controller).discovered).not.toContain('icy');
    button('Enclos 2 · 0/3').click(); expect(state(controller).discovered).toContain('icy');
    const dialog = document.getElementById('game-dialog') as HTMLDialogElement; expect(dialog.open).toBe(true); expect(dialog.textContent).toContain('Nouvelle découverte');
    button('Bienvenue dans la prairie', dialog).click();
    const newborn = state(controller).rabbits.at(-1)!;
    ui.select({kind: 'rabbit', id: newborn.id}); expect(button('Confier ce lapin').disabled).toBe(true);
    button('Changer d’habitat').click(); button('Enclos 1 · 2/3').click(); expect(state(controller).rabbits.at(-1)!.enclosureId).toBe('building-1');
    ui.select({kind: 'extension', parcelId:'east'}); button('Acheter Est · 500 pièces').click(); button('Confirmer', document.getElementById('game-dialog')!).click(); expect(state(controller).acquiredParcels.includes('east')).toBe(true);
    ui.select({kind: 'building', id: find('farm').id}); button('Déplacer ce bâtiment').click(); ui.select({kind: 'cell', x: 42, y: 24}); button('Confirmer le déplacement · gratuit').click(); expect(find('farm').x).toBe(42);
    ui.open({kind: 'shop', tab: 'rabbits'});
    const earthCard = [...panel().querySelectorAll<HTMLElement>('.card')].find(c => c.querySelector('h3')?.textContent === 'Lapin Feu')!;
    button('Choisir un habitat · 80 pièces', earthCard).click(); ui.select({kind:'building',id:state(controller).buildings.filter(b=>b.kind==='enclosure')[1].id}); button('Confirmer l’achat · 80 pièces').click();
    expect(dialog.open).toBe(true); expect(dialog.textContent).toContain('Lapin Feu'); button('Bienvenue dans la prairie', dialog).click();
    expect(decodeGame(data.get(SAVE_KEY)!)).toEqual({ok: true, state: state(controller)});
  });
  it('requires confirmation to release an eligible duplicate and keeps the last representative', () => {
    const initial = createGame(0); initial.pattes = 1000;
    const {ui, controller} = setup(initial); document.getElementById('open-shop')!.click(); button('Lapins').click();
    const card = [...panel().querySelectorAll<HTMLElement>('.card')].find(c => c.textContent?.includes('Lapin Paille'))!;
    button('Choisir un habitat · 80 pièces', card).click(); ui.select({kind:'building',id:state(controller).buildings[0].id}); button('Confirmer l’achat · 80 pièces').click();
    const duplicate = state(controller).rabbits.at(-1)!; ui.select({kind: 'rabbit', id: duplicate.id}); button('Confier ce lapin').click();
    const dialog = document.getElementById('game-dialog') as HTMLDialogElement; button('Annuler', dialog).click(); expect(state(controller).rabbits).toHaveLength(3);
    button('Confier ce lapin').click(); button('Confirmer', dialog).click(); expect(state(controller).rabbits).toHaveLength(2);
    ui.select({kind: 'rabbit', id: 'rabbit-2'}); expect(button('Confier ce lapin').disabled).toBe(true);
  });
  it('retains persistent save warnings and the settings import/export controls', () => {
    const {controller, ui, storage, clock} = setup(); storage.setItem = () => { throw new Error('quota'); }; clock.now = 1000; controller.refresh();
    expect(document.getElementById('save-warning')!.hidden).toBe(false); ui.open({kind: 'settings'});
    expect(document.getElementById('settings-content')!.hidden).toBe(false); expect((document.getElementById('export-game') as HTMLButtonElement).disabled).toBe(false);
    expect(document.getElementById('save-status')!.textContent).toContain('ne sont pas sauvegardées');
  });
  it('refreshes active panels on a controller resume', () => {
    const {controller, ui, clock} = setup(); place(ui, 'farm', 1, 0);
    const farm = state(controller).buildings.find(b => b.kind === 'farm')!; ui.select({kind: 'building', id: farm.id}); button('Produire · 10 pièces').click();
    expect(button('Récolter 20 herbes').disabled).toBe(true); clock.now = 3600_000; controller.refresh();
    expect(button('Récolter 20 herbes').disabled).toBe(false); expect(panel().querySelector('.timer')!.textContent).toBe('Prêt');
  });
  it('imports through the file input with preview, cancellation and confirmed replacement', async () => {
    const {ui, controller, scene} = setup(); ui.open({kind: 'settings'});
    const imported = createGame(0); imported.pattes = 777;
    const file = new File([encodeGame(imported)], 'backup.json', {type: 'application/json'});
    const input = document.getElementById('import-file') as HTMLInputElement;
    const select = () => {
      document.getElementById('import-game')!.click();
      Object.defineProperty(input, 'files', {value: [file], configurable: true});
      input.dispatchEvent(new Event('change'));
    };
    select();
    const dialog = document.getElementById('import-dialog') as HTMLDialogElement;
    await vi.waitFor(() => expect(dialog.open).toBe(true));
    expect(document.getElementById('import-summary')!.textContent).toContain('777 pièces');
    expect(state(controller).pattes).toBe(300); document.getElementById('cancel-import')!.click(); expect(state(controller).pattes).toBe(300);
    select(); await vi.waitFor(() => expect(dialog.open).toBe(true)); document.getElementById('confirm-import')!.click();
    expect(state(controller).pattes).toBe(777); expect(document.getElementById('pattes')!.textContent).toBe('777');
    expect(scene.setPlacement).toHaveBeenLastCalledWith(null); expect(dialog.open).toBe(false);
  });
  it('opens the hearts counter and claims a free gift only once after 24 hours', () => {
    const {controller, clock} = setup(); document.getElementById('open-hearts')!.click();
    expect(document.getElementById('hearts')!.textContent).toBe('12');
    expect(button('Réclamer · +2 cœurs gratuits').disabled).toBe(true);
    clock.now = 24 * 3600_000; controller.refresh();
    const claim = button('Réclamer · +2 cœurs gratuits'); claim.click(); claim.click();
    expect(state(controller).hearts).toBe(14); expect(document.getElementById('hearts')!.textContent).toBe('14');
    expect(button('Réclamer · +2 cœurs gratuits').disabled).toBe(true);
  });
  it('defers building payment to final placement, supports both cancellations and confirms only once', () => {
    const initial = createGame(0); initial.pattes = 30; const {controller, ui} = setup(initial);
    document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Placer · 60 pièces').click();
    ui.select({kind: 'cell', x: 18, y: 20}); expect(panel().textContent).not.toContain('Compléter');
    ui.select({kind: 'cell', x: 22, y: 20}); button('Annuler · aucun coût').click();
    expect(state(controller)).toEqual(initial);
    document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Placer · 60 pièces').click(); ui.select({kind: 'cell', x: 22, y: 20});
    const oldComplement=button('Compléter · 30 pièces + 2 cœurs');
    ui.select({kind:'fineCell',x:26,y:20});oldComplement.click();
    expect((document.getElementById('game-dialog') as HTMLDialogElement).open).toBe(false);expect(state(controller)).toEqual(initial);
    ui.select({kind:'fineCell',x:22,y:20});button('Compléter · 30 pièces + 2 cœurs').click();
    const dialog = document.getElementById('game-dialog')!;
    expect(dialog.textContent).toContain('grille fine 22, 20'); expect(dialog.textContent).toContain('30 pièces manquantes');
    button('Annuler', dialog).click(); expect(state(controller)).toEqual(initial);
    button('Compléter · 30 pièces + 2 cœurs').click(); const confirm = button('Confirmer', dialog); confirm.click(); confirm.click();
    expect(state(controller)).toMatchObject({pattes: 0, hearts: 10}); expect(state(controller).buildings).toHaveLength(2);
  });
  it('confirms the actual lower acceleration price and ignores a duplicate confirmation', () => {
    const {controller, ui, clock} = setup(); place(ui, 'farm', 1, 0); ui.select({kind: 'building', id: 'building-4'});
    button('Produire · 18 pièces').click(); button('Terminer · 3 cœurs').click();
    const dialog = document.getElementById('game-dialog')!; expect(dialog.textContent).toContain('solde : 12');
    clock.now = 11 * 60_000; const confirm = button('Confirmer', dialog); confirm.click(); confirm.click();
    expect(state(controller).hearts).toBe(11); expect(state(controller).grass).toBe(10);
    expect(panel().textContent).not.toContain('Terminer ·'); expect(button('Récolter 40 herbes').disabled).toBe(false);
    expect(document.getElementById('toast')!.textContent).toContain('1 cœur');
  });
  it('does not spend after acceleration cancellation or normal completion before confirmation', () => {
    const {controller, ui, clock} = setup(); place(ui, 'farm', 1, 0); ui.select({kind: 'building', id: 'building-4'});
    button('Produire · 10 pièces').click(); button('Terminer · 1 cœur').click();
    const dialog = document.getElementById('game-dialog')!; button('Annuler', dialog).click(); expect(state(controller).hearts).toBe(12);
    button('Terminer · 1 cœur').click(); clock.now = 5 * 60_000; button('Confirmer', dialog).click();
    expect(state(controller).hearts).toBe(12); expect(document.getElementById('toast')!.textContent).toContain('aucun cœur');
  });
  it('explains insufficient hearts and never offers them for feeding', () => {
    const initial = createGame(0); initial.hearts = 0; initial.pattes = 30; initial.grass = 0;
    const {ui} = setup(initial); document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Placer · 60 pièces').click(); ui.select({kind: 'cell', x: 22, y: 20});
    expect(button('Compléter · 30 pièces + 2 cœurs').disabled).toBe(true); expect(panel().textContent).toContain('Pas assez de cœurs');
    document.getElementById('close-panel')!.click(); if(document.body.classList.contains('shop-open'))document.getElementById('close-panel')!.click(); ui.select({kind: 'rabbit', id: 'rabbit-2'});
    expect(button('Nourrir · 2 herbes').disabled).toBe(true); expect(panel().textContent).not.toContain('Compléter');
  });
  it('offers explicit complements for rabbits, extension, farm orders and breeding', () => {
    const initial = createGame(0);initial.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6}; initial.pattes = 0; initial.hearts = 100;
    const {ui, controller, clock} = setup(initial);
    const confirm = () => button('Confirmer', document.getElementById('game-dialog')!).click();
    ui.open({kind: 'buyRabbit', species: 'feu'}); ui.select({kind:'building',id:state(controller).buildings[0].id}); button('Compléter · 0 pièces + 4 cœurs').click(); confirm();
    expect(state(controller).rabbits).toHaveLength(3);
    button('Bienvenue dans la prairie', document.getElementById('game-dialog')!).click();
    ui.open({kind: 'extension',parcelId:'east'}); button('Compléter · 0 pièces + 20 cœurs').click(); confirm(); expect(state(controller).acquiredParcels.includes('east')).toBe(true);
    const build = (kind: 'farm' | 'nest' | 'nursery', price: number, hearts: number, x: number) => {
      x = toV11((x + 3) * 4, 'x'); const y = toV11(12, 'y');
      if(kind==='nest'||kind==='nursery'){document.getElementById('open-arrange')!.click();button(`Placer gratuitement : ${kind==='nest'?'Nid':'Nurserie'}`).click();ui.select({kind:'cell',x,y});button('Placer gratuitement').click();return;}
      document.getElementById('open-shop')!.click(); button(kind === 'farm' ? 'Bâtiments et décorations' : 'Habitats').click(); button(`Placer · ${price} pièces`).click(); ui.select({kind: 'cell', x, y});
      button(`Compléter · 0 pièces + ${hearts} cœurs`).click(); confirm();
      expect(state(controller).buildings.find(b => b.x === x && b.y === y)?.kind).toBe(kind);
    };
    build('farm', 60, 3, 1); build('nest', 100, 4, 2); build('nursery', 80, 4, 3);
    const farm = state(controller).buildings.find(b => b.kind === 'farm')!;
    ui.select({kind: 'building', id: farm.id}); button('Compléter · 0 pièces + 1 cœur').click(); confirm(); expect(state(controller).buildings.find(b => b.id === farm.id)!.order).not.toBeNull();
    controller.perform({type: 'feed', id: 'rabbit-2'}); controller.perform({type: 'feed', id: 'rabbit-3'});
    const nest = state(controller).buildings.find(b => b.kind === 'nest')!; ui.select({kind: 'building', id: nest.id});
    expect(panel().textContent).not.toContain('Compléter'); crossFromNest(0, 1);
    expect(state(controller).buildings.find(b => b.id === nest.id)!.breeding).not.toBeNull();
    button('Terminer · 4 cœurs').click(); confirm(); expect(panel().textContent).not.toMatch(/Frisket|Icy/);button('Envoyer dans la nurserie').click();
    clock.now = 1; const nursery = state(controller).buildings.find(b => b.kind === 'nursery')!;
    ui.select({kind: 'building', id: nursery.id}); expect(panel().textContent).not.toMatch(/Frisket|Icy/);
    expect(panel().textContent).not.toContain('Terminer ·'); // all three enclosure places are occupied
    expect(panel().textContent).toContain('Aucun habitat compatible n’a de place libre : accélération indisponible, aucun cœur dépensé.');
  });
  it('accelerates reproduction and growth separately without revealing the birth early or welcoming it', () => {
    const {ui, controller} = setup(); place(ui, 'nest', 1, 0); place(ui, 'nursery', 2, 0);
    controller.perform({type: 'feed', id: 'rabbit-2'}); controller.perform({type: 'feed', id: 'rabbit-3'});
    controller.perform({type: 'breed', parents: ['rabbit-2', 'rabbit-3']}); ui.select({kind: 'building', id: 'building-4'});
    const dialog = document.getElementById('game-dialog')!;
    button('Terminer · 4 cœurs').click(); expect(dialog.textContent).not.toContain('Icy'); button('Confirmer', dialog).click();expect(babyOf(state(controller).buildings.find(b=>b.kind==='nursery')!)).toBeNull();button('Envoyer dans la nurserie').click();
    ui.select({kind: 'building', id: 'building-5'}); expect(panel().textContent).not.toContain('Icy');
    expect(state(controller).hearts).toBe(8); button('Terminer · 6 cœurs').click(); button('Confirmer', dialog).click();
    expect(panel().textContent).toContain('Icy'); expect(state(controller).hearts).toBe(2);
    expect(state(controller).rabbits).toHaveLength(2); expect(state(controller).discovered).not.toContain('icy');
    button('Enclos 1 · 2/3').click(); expect(state(controller).discovered).toContain('icy');
  });
  it('invalidates a pending heart confirmation after a successful import', () => {
    const {controller, ui} = setup(); place(ui, 'farm', 1, 0); ui.select({kind: 'building', id: 'building-4'});
    button('Produire · 10 pièces').click(); button('Terminer · 1 cœur').click();
    const stale = button('Confirmer', document.getElementById('game-dialog')!);
    const replacement = createGame(0); replacement.hearts = 7;
    establishHistoricalLevelRights(replacement);const preview = controller.prepareImport(encodeGame(replacement)); if (!preview.ok) throw new Error(preview.reason);
    controller.confirmImport(preview.token, true); ui.onReplacement(); stale.click(); expect(state(controller)).toEqual(replacement);
  });
  it('isolates the development clock and saves from the normal game', () => {
    const values = new Map<string, string>([[SAVE_KEY, encodeGame(createGame(0))]]);
    const base: SaveStorage = {getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }};
    const before = values.get(SAVE_KEY), dev = developmentEnvironment(base);
    const controller = new GameController(dev.storage, dev.clock); const dispose = dev.mount(controller);
    const time = state(controller).lastSimulatedAt; button('+ 60 min', document.getElementById('devtools')!).click();
    expect(state(controller).lastSimulatedAt - time).toBeGreaterThanOrEqual(3600_000);
    button('+ 1440 min', document.getElementById('devtools')!).click();
    expect(controller.perform({type: 'claimHearts'}).ok).toBe(true); expect(state(controller).hearts).toBe(14);
    expect(values.get(SAVE_KEY)).toBe(before); expect(values.has('prairie-lapins.development.' + SAVE_KEY)).toBe(true);
    dispose(); controller.dispose();
  });
});

describe('habitat panels and controller transactions',()=>{
  const dialog=()=>document.getElementById('game-dialog')!;
  const card=(name:string)=>[...panel().querySelectorAll<HTMLElement>('.card')].find(c=>c.querySelector('h3')?.textContent===name)!;
  it('separates the shop categories and the habitats; canceled placements/heart confirmations spend nothing',()=>{
    const initial=createGame(0);initial.pattes=30;const {controller,ui}=setup(initial);
    const choose=()=>{ui.open({kind:'shop',tab:'habitats'});button('Placer · 200 pièces',card('Jardin des airs')).click();};
    ui.open({kind:'shop',tab:'habitats'});
    expect(panel().textContent).toContain('Enclos universel');expect(panel().textContent).toContain('Habitats spécialisés');expect(panel().textContent).not.toContain('Ferme');
    for(const name of ['Prairie de paille','Jardin enneigé','Clairière de feu','Atelier de métal','Jardin des airs']){
      expect(card(name).textContent).toContain('3 places · stocke 900 pièces');expect(button('Placer · 200 pièces',card(name)).disabled).toBe(false);
    }
    choose();ui.select({kind:'cell',x: 18, y: 20});expect(panel().textContent).not.toContain('Compléter');
    ui.select({kind:'cell',x: 22, y: 20});button('Annuler · aucun coût').click();expect(state(controller)).toEqual(initial);
    choose();ui.select({kind:'cell',x: 22, y: 20});button('Compléter · 30 pièces + 7 cœurs').click();
    button('Annuler',dialog()).click();expect(state(controller)).toEqual(initial);
    button('Compléter · 30 pièces + 7 cœurs').click();const confirmation=button('Confirmer',dialog());confirmation.click();confirmation.click();
    expect(state(controller)).toMatchObject({pattes:0,hearts:5});expect(state(controller).buildings[1].habitat).toEqual({type:'vol',level:1});
  });
  it('shows level, type, rate, capacities and upgrade details, with explicit cancellation and one-shot confirmation',()=>{
    const initial=createGame(0);initial.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};initial.pattes=2000;initial.hearts=25;const {controller,ui,scene}=setup(initial);
    const home=()=>state(controller).buildings[0];ui.select({kind:'building',id:home().id});
    expect(panel().textContent).toContain('Tous les types · niveau 1');expect(panel().textContent).toContain('24 pièces / h');
    expect(panel().textContent).toContain('2 / 3');expect(panel().textContent).toContain('0 / 600');expect(panel().textContent).toContain('Niveau de l’habitat 1 → 2 : places 3 → 5 · stockage 600 → 900 pièces');
    button('Améliorer · 200 pièces').click();button('Annuler',dialog()).click();expect(state(controller)).toEqual(initial);
    button('Améliorer · 200 pièces').click();const confirm=button('Confirmer',dialog());confirm.click();confirm.click();
    expect(home().habitat!.level).toBe(2);expect(state(controller).pattes).toBe(1800);expect(panel().textContent).toContain('2 / 5');expect(panel().textContent).toContain('0 / 900');
    // Level 3 is paid in exactly ten hearts, shown before confirmation; no coin is spent and no coin complement is offered.
    expect(panel().textContent).not.toContain('Compléter');expect(state(controller).hearts).toBe(25);
    button('Améliorer · 10 cœurs').click();expect(dialog().textContent).toContain('Paiement : 10 cœurs');expect(dialog().textContent).toContain('solde : 25 cœurs');expect(dialog().textContent).toContain('Aucune pièce n’est dépensée');
    button('Annuler',dialog()).click();expect(home().habitat!.level).toBe(2);expect(state(controller).hearts).toBe(25);
    button('Améliorer · 10 cœurs').click();const pay=button('Confirmer',dialog());pay.click();pay.click();
    expect(home().habitat!.level).toBe(3);expect(state(controller).pattes).toBe(1800);expect(state(controller).hearts).toBe(15);expect(panel().textContent).toContain('Niveau maximal atteint.');
    expect(panel().textContent).not.toContain('Améliorer ·');expect(scene.recenter).not.toHaveBeenCalled();
  });
  it('announces the larger footprint, and explains an upgrade that has no room without offering to pay',()=>{
    const free=createGame(0);free.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};free.pattes=2000;
    const open=setup(free);open.ui.select({kind:'building',id:'building-1'});
    expect(panel().textContent).toContain('emprise 4 × 4 → 6 × 5 cases, vers la droite et vers le bas');expect(button('Améliorer · 200 pièces').disabled).toBe(false);
    const blocked=createGame(0);blocked.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};blocked.pattes=2000;
    const home=blocked.buildings[0];blocked.buildings.push(emptyBuilding('building-9','farm',home.x+4,home.y));blocked.nextId=10;
    const shut=setup(blocked);shut.ui.select({kind:'building',id:'building-1'});
    expect(panel().textContent).toContain('Pas assez de place pour agrandir : un autre bâtiment occupe la zone voisine');
    const offer=button('Améliorer · 200 pièces');expect(offer.disabled).toBe(true);offer.click();expect(state(shut.controller).pattes).toBe(2000);expect(state(shut.controller).buildings[0]).toMatchObject({habitat:{level:1}});expect(state(shut.controller).buildings[0].footprintTier).toBeUndefined();expect(panel().textContent).not.toContain('Compléter');
  });
  it('names the real footprint while moving an enlarged enclosure, and the compact one for an ordinary building',()=>{
    const initial=createGame(0);initial.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};
    const home=initial.buildings[0];home.x=18;home.y=24;home.footprintTier=2;home.habitat!.level=2;initial.buildings.push(emptyBuilding('building-9','farm',26,20));initial.nextId=10;
    const {ui}=setup(initial);ui.select({kind:'building',id:home.id});button('Déplacer ce bâtiment').click();
    expect(panel().textContent).toContain('le coin de l’empreinte 6 × 5');expect(panel().textContent).not.toContain('4 × 4');
    ui.select({kind:'fineCell',x:18,y:24});expect(panel().textContent).toContain('Grille fine : (18, 24) · empreinte 6 × 5');expect(panel().textContent).toContain('Emplacement valide · empreinte 6 × 5');
    ui.close();const other=setup(initial);other.ui.select({kind:'building',id:'building-9'});button('Déplacer ce bâtiment').click();expect(panel().textContent).toContain('le coin de l’empreinte 4 × 4');
  });
  it.each([[9,true],[10,false]])('offers the ten-heart upgrade with %i hearts: disabled=%s, and a refused click spends nothing',(hearts,disabled)=>{
    const initial=createGame(0);initial.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};initial.buildings[0].habitat={type:'universal',level:2};initial.pattes=500;initial.hearts=hearts;
    const {controller,ui}=setup(initial);ui.select({kind:'building',id:state(controller).buildings[0].id});
    const offer=button('Améliorer · 10 cœurs');expect(offer.disabled).toBe(disabled);expect(panel().textContent).not.toContain('Compléter');
    if(disabled){offer.click();expect(state(controller)).toEqual(initial);expect(state(controller).hearts).toBe(9);}
    else{offer.click();button('Confirmer',dialog()).click();expect(state(controller)).toMatchObject({hearts:0,pattes:500});expect(state(controller).buildings[0].habitat!.level).toBe(3);}
  });
  it('explains incompatible and full destinations for purchases and moves while allowing a compatible choice',()=>{
    const initial=createGame(0);initial.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};initial.pattes=5000;const {controller,ui}=setup(initial);
    controller.perform({type:'buyBuilding',kind:'enclosure',habitatType:'feu',x: 22, y: 20});
    controller.perform({type:'buyBuilding',kind:'enclosure',habitatType:'neige',x: 26, y: 20});
    const snow=state(controller).buildings[2].id;
    for(let i=0;i<3;i++)controller.perform({type:'buyRabbit',species:'neige',enclosureId:snow});
    ui.open({kind:'buyRabbit',species:'neige'});
    expect(panel().textContent).not.toContain('Clairière de feu 2');expect(panel().textContent).not.toContain('Jardin enneigé 3');
    expect(button('Confirmer l’achat · 80 pièces').disabled).toBe(true);
    ui.select({kind:'building',id:snow});expect(button('Confirmer l’achat · 80 pièces').disabled).toBe(true);
    button('Annuler · aucun coût').click();expect(document.body.classList.contains('shop-open')).toBe(true);expect(panel().textContent).toContain('Lapins');document.getElementById('close-panel')!.click();
    controller.perform({type:'upgradeHabitat',id:snow,fromLevel:1});
    ui.select({kind:'rabbit',id:'rabbit-3'});button('Changer d’habitat').click();
    expect(panel().textContent).toContain('Feu');expect(button('Clairière de feu 2 · 0/3').disabled).toBe(true);
    button('Jardin enneigé 3 · 3/5').click();expect(state(controller).rabbits[1].enclosureId).toBe(snow);
  });
  it('pays specialized upgrades with an explicit heart complement and invalidates old confirmations after import',()=>{
    const initial=createGame(0);initial.progression={totalXp:cumulativeLevelXp(14),rewardedThroughLevel:14};initial.pattes=230;initial.hearts=50;const {controller,ui}=setup(initial);
    controller.perform({type:'buyBuilding',kind:'enclosure',habitatType:'metal',x: 22, y: 20});const home=state(controller).buildings[1].id;
    ui.select({kind:'building',id:home});expect(panel().textContent).toContain('Métal · niveau 1');
    button('Compléter · 30 pièces + 11 cœurs').click();expect(dialog().textContent).toContain('places 3 → 5 · stockage 900 → 1 500');button('Confirmer',dialog()).click();
    expect(state(controller)).toMatchObject({pattes:0,hearts:39});expect(state(controller).buildings[1].habitat!.level).toBe(2);
    expect(panel().textContent).not.toContain('Compléter');button('Améliorer · 10 cœurs').click();const old=button('Confirmer',dialog());
    const replacement=state(controller);establishHistoricalLevelRights(replacement);const p=controller.prepareImport(encodeGame(replacement));if(!p.ok)throw Error(p.reason);controller.confirmImport(p.token,true);ui.onReplacement();old.click();
    expect(state(controller)).toEqual(replacement);
  });
  it('confirms the second expansion, supports cancellation and keeps the first-extension mission claimed',()=>{
    const initial=createGame(0);initial.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6};initial.pattes=3000;const {controller,ui,scene}=setup(initial);
    controller.perform({type:'expand',parcelId:'east',expectedCost:500});controller.perform({type:'claimMainMission',id:'bigger-meadow'});const before=state(controller);
    ui.open({kind:'extension',parcelId:'west'});expect(panel().textContent).toContain('Ouest · + 16 cases · 1 000 pièces');
    button('Acheter Ouest · 1 000 pièces').click();button('Annuler',dialog()).click();expect(state(controller)).toEqual(before);
    button('Acheter Ouest · 1 000 pièces').click();const confirm=button('Confirmer',dialog());confirm.click();confirm.click();
    expect(state(controller).acquiredParcels.includes('west')).toBe(true);expect(state(controller).pattes).toBe(before.pattes-1000);expect(state(controller).missions).toEqual(before.missions);
    expect(scene.recenter).not.toHaveBeenCalled();ui.open({kind:'extension',parcelId:'west'});expect(panel().textContent).toContain('Choisissez librement');
  });
  it('uses the development storage and clock for new habitat actions without changing normal progression',()=>{
    const normal=encodeGame(createGame(0)),values=new Map([[SAVE_KEY,normal]]),base:SaveStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}};
    const dev=developmentEnvironment(base),c=new GameController(dev.storage,()=>0);cleanups.push(()=>c.dispose());
    expect(c.perform({type:'buyBuilding',kind:'enclosure',habitatType:'paille',x: 0, y: 40}).ok).toBe(true);
    expect(c.grantLaboratoryXp(500).ok).toBe(true);
    expect(c.perform({type:'payWithHearts',action:{type:'upgradeHabitat',id:'building-6',fromLevel:1},maxPattes:100,maxHearts:8}).ok).toBe(true);
    expect(state(c).buildings.find(b=>b.id==='building-6')!.habitat).toEqual({type:'paille',level:2});expect(values.get(SAVE_KEY)).toBe(normal);
    expect(JSON.parse(values.get('prairie-lapins.development.'+SAVE_KEY)!).version).toBe(16);
  });
});

describe('direct decoration selection and confirmed resale UI', () => {
  function decorated() {
    const s = createGame(0); s.pattes = 1000; s.nextId = 7;
    s.decorations = [
      {id: 'decoration-4', catalogId: 'large-bookcase', location: {kind: 'outside', x: 25, y: 23, rotation: 0}},
      {id: 'decoration-5', catalogId: 'bunny-slippers', location: {kind: 'outside',x:18,y:28,rotation:0}},
      {id: 'decoration-6', catalogId: 'large-bookcase', location: {kind: 'inventory'}},
    ]; return s;
  }
  it.each(['decoration-4', 'decoration-5'])('opens the selected %s actions in normal play and deselects on empty ground', id => {
    const {ui, scene, controller} = setup(decorated()), before = state(controller);
    ui.select({kind: 'decoration', id});
    expect(document.getElementById('game-panel')!.hidden).toBe(false);
    expect(scene.setDecorationSelection).toHaveBeenLastCalledWith(id);
    expect(scene.setArrangement).toHaveBeenLastCalledWith(false, null);
    expect(document.getElementById('panel-title')!.textContent).toBe(id === 'decoration-4' ? 'Grande bibliothèque' : 'Chaussons lapins');
    expect(button('Déplacer').disabled).toBe(false); expect(button('Ranger dans l’inventaire').disabled).toBe(false);
    expect([...panel().querySelectorAll('button')].some(b => b.textContent === 'Tourner de 90°')).toBe(false);
    ui.select({kind: 'empty'}); expect(document.getElementById('game-panel')!.hidden).toBe(true);
    expect(scene.setDecorationSelection).toHaveBeenLastCalledWith(null); expect(state(controller)).toEqual(before);
  });
  it('highlights a listed placed object and clears selection without exiting arrangement on empty ground', () => {
    const {ui, scene} = setup(decorated()); document.getElementById('open-arrange')!.click();
    button('Grande bibliothèque · #4').click(); expect(scene.setDecorationSelection).toHaveBeenLastCalledWith('decoration-4');
    ui.select({kind: 'empty'}); expect(document.getElementById('game-panel')!.hidden).toBe(true);
    expect(document.getElementById('arrange-banner')!.hidden).toBe(false);
    expect(scene.setDecorationSelection).toHaveBeenLastCalledWith(null); expect(scene.setArrangement).toHaveBeenLastCalledWith(true, null);
    ui.select({kind: 'decoration', id: 'decoration-5'}); expect(scene.setDecorationSelection).toHaveBeenLastCalledWith('decoration-5');
  });
  it('keeps photo mode observational and ignores decoration and harvest selection', () => {
    const {ui, controller, scene} = setup(decorated()), before = state(controller);
    ui.select({kind: 'decoration', id: 'decoration-4'}); document.getElementById('open-photo')!.click();
    ui.select({kind: 'decoration', id: 'decoration-5'}); ui.select({kind: 'income', id: 'building-1'});
    expect(document.getElementById('game-panel')!.hidden).toBe(true);
    expect(scene.setDecorationSelection).toHaveBeenLastCalledWith(null); expect(state(controller)).toEqual(before);
  });
  it('does not mutate a normal selection move until confirmation, cancellation and mode exit preserve the original', () => {
    const {ui, controller} = setup(decorated()), before = state(controller);
    ui.select({kind: 'decoration', id: 'decoration-4'}); button('Déplacer').click();
    ui.select({kind: 'fineCell', x: 26, y: 24}); expect(state(controller)).toEqual(before);
    button('Annuler le placement').click(); expect(state(controller)).toEqual(before);
    ui.select({kind: 'decoration', id: 'decoration-5'}); button('Déplacer').click();
    ui.select({kind: 'fineCell', x: 19, y: 28});
    document.getElementById('exit-arrange')!.click(); expect(state(controller)).toEqual(before);
  });
  it('asks the exact sale question, cancellation preserves everything, and double confirmation sells only the selected copy', () => {
    const {ui, controller, data, scene} = setup(decorated()), before = state(controller);
    ui.select({kind: 'decoration', id: 'decoration-4'}); button('Vendre · 200 pièces').click();
    const dialog = document.getElementById('game-dialog')!;
    expect(dialog.querySelector('h2')!.textContent).toBe('Vendre Grande bibliothèque pour 200 pièces ?');
    expect(dialog.textContent).toContain('Aucun remboursement en cœurs');
    button('Annuler', dialog).click(); expect(state(controller)).toEqual(before);
    button('Vendre · 200 pièces').click(); const confirm = button('Confirmer', dialog); confirm.click(); confirm.click();
    const after = state(controller);
    expect(after).toEqual({...before, pattes: before.pattes + 200, decorations: before.decorations.slice(1)});
    expect(JSON.parse(data.get(SAVE_KEY)!)).toEqual({...after, presentationId: controller.getSnapshot().presentationId});
    expect(document.getElementById('game-panel')!.hidden).toBe(true);
    expect(scene.setDecorationSelection).toHaveBeenLastCalledWith(null);
  });
  it('sells an inventory copy through its own actions and updates the arrangement list', () => {
    const {controller, scene} = setup(decorated()), before = state(controller);
    document.getElementById('open-arrange')!.click(); button('Actions de cet exemplaire', panel().querySelector('[data-decoration="decoration-6"]')!).click();
    expect(button('Ranger dans l’inventaire').disabled).toBe(true);
    button('Vendre · 200 pièces').click(); button('Confirmer', document.getElementById('game-dialog')!).click();
    expect(state(controller)).toEqual({...before, pattes: before.pattes + 200, decorations: before.decorations.slice(0, 2)});
    expect(panel().textContent).toContain('Votre inventaire est vide');
    expect(scene.setDecorationSelection).toHaveBeenLastCalledWith(null);
  });
  it('a stale sale confirmation cannot sell another exemplar or credit twice', () => {
    const {controller, ui} = setup(decorated());
    ui.select({kind: 'decoration', id: 'decoration-4'}); button('Vendre · 200 pièces').click();
    const confirm = button('Confirmer', document.getElementById('game-dialog')!);
    controller.perform({type: 'sellDecoration', id: 'decoration-4'}); const after = state(controller);
    confirm.click(); expect(state(controller)).toEqual(after);
    expect(state(controller).decorations.find(d => d.id === 'decoration-6')).toBeDefined();
  });
  it('a refused save leaves the object panel usable and reports that the sale did not happen', () => {
    const {controller, ui, storage} = setup(decorated()), before = state(controller);
    ui.select({kind: 'decoration', id: 'decoration-4'});
    vi.spyOn(storage, 'setItem').mockImplementation(() => {throw Error('quota');});
    button('Vendre · 200 pièces').click(); button('Confirmer', document.getElementById('game-dialog')!).click();
    expect(state(controller)).toEqual(before); expect(panel().textContent).toContain('Vendre · 200 pièces');
    expect(document.getElementById('toast')!.textContent).toContain('L’action n’a pas pu être sauvegardée');
  });
});

describe('bubble actions retain priority during arrangement', () => {
  it('collects income without selecting an object and a nursery bubble opens ordinary building actions', () => {
    const initial = createGame(0); initial.pattes = 1000; initial.buildings[0].incomeUnits = 10 * 3600000;
    const {controller, ui} = setup(initial);
    expect(controller.perform({type:'placeStarterBuilding',kind:'nursery',x:26,y:20}).ok).toBe(true);
    const before = state(controller).pattes;
    document.getElementById('open-arrange')!.click();
    ui.select({kind: 'income', id: 'building-1'});
    expect(state(controller).pattes).toBe(before + 10);
    expect(document.getElementById('arrange-banner')!.hidden).toBe(false);
    ui.select({kind: 'building', id: state(controller).buildings.find(b => b.kind === 'nursery')!.id});
    expect(document.getElementById('panel-title')!.textContent).toBe('Nurserie');
    expect(document.getElementById('arrange-banner')!.hidden).toBe(true);
    expect(panel().textContent).not.toContain('Trois emplacements');
  });
});


describe('new collection and exact-species recipe UI', () => {
  const change = (label: string, value: string) => {
    const select = panel().querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
    select.value = value; select.dispatchEvent(new Event('change'));
  };
  it('composes filters, keeps them across refresh and shows an actionable empty result', () => {
    const {controller, ui} = setup(scenarioState('collection', 0)); ui.open({kind: 'collection'});
    change('Rareté', 'epic'); expect(panel().querySelectorAll('article')).toHaveLength(1);
    expect(panel().textContent).not.toContain('Lapin Géant'); expect(panel().textContent).toContain('Lapin Magicien');
    change('Type', 'feu'); expect(panel().querySelectorAll('article')).toHaveLength(0);
    expect(panel().textContent).toContain('Aucune espèce'); controller.refresh();
    expect(panel().querySelector<HTMLSelectElement>('select[aria-label="Rareté"]')!.value).toBe('epic');
    button('Réinitialiser les filtres').click(); expect(panel().querySelectorAll('article')).toHaveLength(EXPECTED_IDS.length);
    change('Découverte', 'unknown'); expect(panel().querySelectorAll('article')).toHaveLength(0);
    button('Réinitialiser les filtres').click(); ui.close(); ui.open({kind: 'collection'});
    expect(panel().querySelectorAll('article')).toHaveLength(EXPECTED_IDS.length);
  });
  it('explains Dragon species, threshold, duration, exclusion from guarantee and real two-percent pairs', () => {
    const {controller,ui} = setup(scenarioState('collection',0)); const before = structuredClone(state(controller));
    ui.open({kind:'recipes'}); const card = [...panel().querySelectorAll('article')].find(c=>c.querySelector('h3')?.textContent==='Lapin Dragon')!;
    expect(card.textContent).toContain('Lapin Perroquet × Lapin Feu'); expect(card.textContent).toContain('Les types seuls ne suffisent pas');
    expect(card.textContent).toContain('Affection 10 minimum'); expect(card.textContent).toContain('120 min'); expect(card.textContent).toContain('ne bénéficie pas');
    expect(card.textContent).toContain('2 %'); expect(state(controller)).toEqual(before);
    button('Préparer cette paire au nid',card).click(); expect(document.getElementById('panel-title')!.textContent).toBe('Nid');
    expect(state(controller).buildings.find(b=>b.kind==='nest')!.breeding).toBeNull();
    expect(state(controller)).toEqual(before);
  });
});

describe('pairing window and heart bubble', () => {
  const nestOf = (s: GameState) => s.buildings.find(b => b.kind === 'nest')!;
  it('opens from Croiser with every rabbit on both sides and greys a pick in the other list', () => {
    const initial = scenarioState('reproduction', 0), {ui} = setup(initial);
    ui.select({kind: 'building', id: nestOf(initial).id}); button('Croiser').click();
    expect(breeding().open).toBe(true);
    for (const slot of [0, 1] as const) expect(breeding().querySelectorAll('.breeding-column')[slot].querySelectorAll('button.breeding-row')).toHaveLength(initial.rabbits.length);
    expect(button('Croiser', breeding()).disabled).toBe(true);
    breedingRow(0, 0).click();
    expect(breedingRow(0, 0).getAttribute('aria-pressed')).toBe('true'); expect(breedingRow(1, 0).disabled).toBe(true);
    expect(breedingRow(1, 0).textContent).toContain('Déjà choisi comme lapin 1');
    breedingRow(1, 1).click(); expect(breedingRow(0, 1).disabled).toBe(true); expect(button('Croiser', breeding()).disabled).toBe(false);
    // A second touch on a chosen rabbit releases it, in both lists.
    breedingRow(0, 0).click(); expect(breedingRow(0, 0).getAttribute('aria-pressed')).toBe('false'); expect(breedingRow(1, 0).disabled).toBe(false);
    expect(button('Croiser', breeding()).disabled).toBe(true);
    const close = breeding().querySelector<HTMLButtonElement>('button.breeding-close')!; expect(close.getAttribute('aria-label')).toBe('Fermer le croisement');
    close.click(); expect(breeding().open).toBe(false);
  });
  it('launches from the red Croiser, closes the window, then sends the baby with the heart and follows it', () => {
    const initial = scenarioState('reproduction', 0), {controller, ui, clock, scene} = setup(initial), nest = nestOf(initial);
    const nursery = initial.buildings.find(b => b.kind === 'nursery')!;
    ui.select({kind: 'building', id: nest.id}); crossFromNest(0, 1);
    expect(breeding().open).toBe(false); expect(nestOf(state(controller)).breeding).not.toBeNull();
    // Before the end the heart only opens the nest panel.
    ui.select({kind: 'birth', id: nest.id}); expect(nestOf(state(controller)).breeding).not.toBeNull(); expect(scene.focusBuilding).not.toHaveBeenCalled();
    clock.now += 20 * 60_000; controller.refresh();
    ui.select({kind: 'birth', id: nest.id});
    expect(nestOf(state(controller)).breeding).toBeNull(); expect(babyOf(state(controller).buildings.find(b => b.id === nursery.id)!)).not.toBeNull();
    expect(scene.focusBuilding).toHaveBeenCalledWith(nursery.id);
  });
  it('keeps the baby at the nest and explains why when the nursery is full', () => {
    const initial = scenarioState('manualBreeding', 3600000), {controller, ui, clock, scene} = setup(initial); clock.now = 7200000; controller.refresh();
    const nest = nestOf(initial); ui.select({kind: 'birth', id: nest.id});
    expect(nestOf(state(controller)).breeding).not.toBeNull(); expect(scene.focusBuilding).not.toHaveBeenCalled();
    expect(document.getElementById('panel-title')!.textContent).toBe('Nid'); expect(panel().textContent).toContain('nurserie est pleine');
  });
});

describe('manual nest UI and free equipment recovery',()=>{
 it('shows parents Au nid after the deadline, keeps moves locked and transfers only through the explicit button',()=>{
  const initial=scenarioState('reproduction',0);initial.pattes=0;initial.hearts=0;
  const {controller,ui,clock}=setup(initial);const nid=initial.buildings.find(b=>b.kind==='nest')!,nursery=initial.buildings.find(b=>b.kind==='nursery')!;
  controller.perform({type:'breed',parents:['rabbit-2','rabbit-3']});clock.now=3600000;controller.refresh();
  ui.select({kind:'rabbit',id:'rabbit-2'});expect(panel().textContent).toContain('Au nid');expect(button('Changer d’habitat').disabled).toBe(true);expect(button('Confier ce lapin').disabled).toBe(true);
  ui.select({kind:'building',id:nid.id});expect(button('Envoyer dans la nurserie').disabled).toBe(false);expect(babyOf(state(controller).buildings.find(b=>b.id===nursery.id)!)).toBeNull();
  const transfer=button('Envoyer dans la nurserie');transfer.click();transfer.click();expect(state(controller).buildings.find(b=>b.id===nid.id)!.breeding).toBeNull();expect(babyOf(state(controller).buildings.find(b=>b.id===nursery.id)!)!.startedAt).toBe(clock.now);expect(panel().textContent).not.toContain('Envoyer dans la nurserie');
 });
 it('explains an occupied nursery and offers a free placement outside the shop for missing equipment',()=>{
  const initial=scenarioState('manualBreeding',3600000),{controller,ui,clock}=setup(initial);clock.now=7200000;controller.refresh();
  ui.select({kind:'building',id:initial.buildings.find(b=>b.kind==='nest')!.id});expect(button('Envoyer dans la nurserie').disabled).toBe(true);expect(panel().textContent).toContain('nurserie est pleine');
  const missing=createGame(0);missing.pattes=0;missing.hearts=0;const second=setup(missing);document.getElementById('open-shop')!.click();expect(panel().textContent).not.toContain('Deux parents · maximum 1');
  document.getElementById('open-arrange')!.click();button('Placer gratuitement : Nid').click();second.ui.select({kind:'fineCell',x:22,y:20});expect(panel().textContent).not.toContain('Compléter');button('Annuler · aucun coût').click();expect(state(second.controller)).toEqual(missing);
  document.getElementById('open-arrange')!.click();button('Placer gratuitement : Nid').click();second.ui.select({kind:'fineCell',x:22,y:20});button('Placer gratuitement').click();expect(state(second.controller).buildings.some(b=>b.kind==='nest')).toBe(true);expect(state(second.controller).pattes).toBe(0);expect(state(second.controller).hearts).toBe(0);
 });
});


describe('guidance card uses existing controls and missions', () => {
  it('opens and closes a sheet, claims once, resumes without relying on an open panel', () => {
    const {ui,controller,prefs}=setup(scenarioState('guidedLegacy',0));
    prefs.restartGuidance(); ui.close();
    const card=document.getElementById('tutorial')!;
    expect(card.dataset.step).toBe('welcome'); button('Me guider',card).click(); expect(card.dataset.step).toBe('paille');
    button('Me guider',card).click(); expect(document.getElementById('panel-title')!.textContent).toBe('Lapin Paille');
    expect(panel().querySelector('.guide-target')?.textContent).toBe('Nourrir · 2 herbes');
    document.getElementById('close-panel')!.click(); expect(card.dataset.step).toBe('paille');
    button('Me guider',card).click();button('Nourrir · 2 herbes').click();document.getElementById('close-panel')!.click();
    const stale=button('Réclamer · 10 herbes',card);stale.click();stale.click(); expect(state(controller).grass).toBe(18);
    expect(card.dataset.step).toBe('farmShop');expect(card.textContent).not.toContain('Réclamer · 10 herbes');
    button('Masquer',card).click(); expect(card.hidden).toBe(true);document.getElementById('open-settings')!.click();document.getElementById('tutorial-toggle')!.click();ui.close();
    expect(card.dataset.step).toBe('farmShop');expect(state(controller).missions.claimed).toContain('first-meal');
    button('Me guider',card).click(); expect(document.getElementById('game-panel')!.classList.contains('shop-fullscreen')).toBe(true);
    expect(panel().textContent).toContain('Ferme'); expect(panel().textContent).not.toContain('Habitats spécialisés');
    expect(state(controller).pattes).toBe(300);
    document.getElementById('panel-back')!.click(); expect(panel().querySelectorAll('.shop-category')).toHaveLength(5);
  });
  it('consultations done outside guidance persist; income suggestion requires a real whole pièces', () => {
    const {ui,controller,prefs}=setup(scenarioState('guidedLegacy',0));prefs.restartGuidance();prefs.set({intro:true,guideCamera:true});
    document.getElementById('open-collection')!.click();ui.close();expect(prefs.value.guideCollection).toBe(true);
    expect(document.getElementById('tutorial')!.textContent).not.toContain('pièces disponibles');
    const s=state(controller);s.buildings[0].incomeUnits=3_600_000;
    const prepared=controller.prepareImport(encodeGame(s));if(!prepared.ok)throw Error(prepared.reason);controller.confirmImport(prepared.token,true);ui.close();
    expect(document.getElementById('tutorial')!.textContent).toContain('pièces disponibles');
    button('pièces disponibles',document.getElementById('tutorial')!).click();expect(state(controller).pattes).toBe(300);
  });
  it('does not impose guidance on import and starts it only for an explicit new game', () => {
    const {ui,controller,prefs}=setup(scenarioState('guidedLegacy',0));prefs.initializeGuidance(false);ui.close();
    expect(document.getElementById('tutorial')!.hidden).toBe(true);
    const prepared=controller.prepareImport(encodeGame(scenarioState('guidedLegacy',0)));if(!prepared.ok)throw Error(prepared.reason);
    controller.confirmImport(prepared.token,true);ui.close();expect(document.getElementById('tutorial')!.hidden).toBe(true);
    ui.onReplacement(true);ui.close();expect(document.getElementById('tutorial')!.dataset.step).toBe('welcome');
  });

  it('guides to transfer without requiring Brumelin consultation or running an action', () => {
    const {ui,controller,prefs}=setup(scenarioState('guidedLegacy',0));prefs.restartGuidance();prefs.set({intro:true,guideCamera:true});
    controller.perform({type:'feed',id:'rabbit-2'});controller.perform({type:'feed',id:'rabbit-3'});controller.perform({type:'breed',parents:['rabbit-2','rabbit-3']});ui.close();
    const before=encodeGame(state(controller));button('Me guider',document.getElementById('tutorial')!).click();
    expect(document.getElementById('panel-title')!.textContent).not.toBe('Carnet de reproduction');expect(panel().querySelector('[data-recipe="brumelin"]')).toBeNull();expect(encodeGame(state(controller))).toBe(before);
  });

});

describe('initiation presentation',()=>{
 it('shows the countdown then optional free action; closing and resuming preserves use',()=>{
  const s=scenarioState('initiationSaved',0),{ui,controller,prefs}=setup(s,true);prefs.restartGuidance();
  ui.open({kind:'building',id:'building-5'});
  expect(panel().textContent).toContain('espèce reste secrète');expect(panel().querySelector('progress')).not.toBeNull();
  const free=button('Terminer gratuitement — découverte du jeu');free.click();free.click();
  expect(state(controller).hearts).toBe(s.hearts);expect(state(controller).initiation!.used).toEqual(['breeding','growth']);
  expect(state(controller).rabbits).toHaveLength(2);ui.open({kind:'building',id:'building-5'});
  expect(panel().textContent).not.toContain('Terminer gratuitement');
 });
 it('celebrates a common first birth once, without calling it a discovery',()=>{
  const s=scenarioState('initiationSaved',0);const historical=babyOf(s.buildings.find(b=>b.kind==='nursery')!)!;historical.readyAt=0;historical.birth.species='paille'; // Previously drawn Common.
  const {ui,controller}=setup(s);ui.open({kind:'building',id:'building-5'});
  button('Prairie de paille 1 · 1/3').click();
  const dialog=document.getElementById('game-dialog') as HTMLDialogElement;
  expect(dialog.open).toBe(true);expect(dialog.textContent).toContain('Bienvenue, petit lapin');
  expect(dialog.textContent).not.toContain('Nouvelle espèce');expect(dialog.textContent).not.toContain('Consulter');
  button('Bienvenue dans la prairie',dialog).click();ui.onReplacement();expect(dialog.open).toBe(false);
  expect(state(controller).missions.events.welcome).toBe(1);
 });
});
it('labels an actual first discovery of a species at its first birth',()=>{
 const s=scenarioState('initiationSaved',0);const baby=babyOf(s.buildings.find(b=>b.kind==='nursery')!)!;baby.readyAt=0;baby.birth.species='lunettes';
 const {ui}=setup(s);ui.open({kind:'building',id:'building-5'});button('Prairie de paille 1 · 1/3').click();
 const dialog=document.getElementById('game-dialog')!;expect(dialog.textContent).toContain('Nouvelle espèce');expect(dialog.textContent).toContain('Lapin à Lunettes');expect(dialog.textContent).not.toContain('Consulter');
});
it('offers a notebook shortcut after guidance ends',()=>{
 const s=scenarioState('missionJourney',0);s.recipeBook=['lunettes'];s.progression={totalXp:cumulativeLevelXp(6),rewardedThroughLevel:6};s.missions.claimed=['first-meal','first-farm','first-harvest','parents-ready','at-nest','to-nursery','first-birth'];
 const {ui,prefs,controller}=setup(s);prefs.set({tutorialDone:true,tutorial:false});const wallet=state(controller).pattes;
 ui.open({kind:'missions',tab:'main'});button('Consulter le carnet').click();expect(state(controller).pattes).toBe(wallet);const recipe=panel().querySelector('[data-recipe="lunettes"]')!;expect(recipe.querySelector('h3')!.textContent).toBe('Lapin à Lunettes');expect(recipe.querySelector('details')).toBeNull();expect(recipe.textContent).toContain('Aucune paire possédée n’est admissible');
});

describe('mobile menu continuity', () => {
  it('returns through species and notebook to the filtered collection at its previous scroll position', () => {
    const {ui, controller} = setup(scenarioState('collection', 0));
    ui.open({kind: 'collection'});
    const select = panel().querySelector<HTMLSelectElement>('select[aria-label="Type"]')!;
    select.value = 'paille'; select.dispatchEvent(new Event('change'));
    panel().scrollTop = 180;
    const lunettes = [...panel().querySelectorAll<HTMLElement>('article')].find(card => card.querySelector('h3')?.textContent === 'Lapin à Lunettes')!;
    const before = encodeGame(state(controller));
    button('Consulter l’espèce', lunettes).click(); panel().scrollTop = 75;
    button('Consulter la recette').click();
    document.getElementById('panel-back')!.click();
    expect(document.getElementById('panel-title')!.textContent).toBe('Lapin à Lunettes'); expect(panel().scrollTop).toBe(75);
    document.getElementById('panel-back')!.click();
    expect(document.getElementById('panel-title')!.textContent).toBe(`Collection · ${EXPECTED_IDS.length}/${EXPECTED_IDS.length}`);
    expect(panel().querySelector<HTMLSelectElement>('select[aria-label="Type"]')!.value).toBe('paille'); expect(panel().scrollTop).toBe(180);
    expect(encodeGame(state(controller))).toBe(before);
  });

  it('keeps shop category and scroll after a decoration purchase and canceled building placement without extra spending', () => {
    const {ui, controller} = setup(); document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Décorations').click();
    panel().scrollTop = 240;
    const flowers = panel().querySelector<HTMLElement>('[data-catalog="bush"]')!;
    button('Acheter pour l’inventaire · 20 pièces', flowers).click(); button('Confirmer', document.getElementById('game-dialog')!).click();
    expect(document.getElementById('panel-title')!.textContent).toBe('Boutique');
    expect(panel().querySelectorAll('[data-catalog]')).toHaveLength(13); expect(panel().scrollTop).toBe(240);
    ui.close(); document.getElementById('open-shop')!.click(); button('Bâtiments et décorations').click(); button('Décorations').click();
    expect(panel().querySelectorAll('[data-catalog]')).toHaveLength(13); expect(panel().scrollTop).toBe(240);
    expect(state(controller).pattes).toBe(280); expect(state(controller).decorations).toHaveLength(1);
    expect(state(controller).decorations[0].location).toEqual({kind: 'inventory'});
    button('Bâtiments').click(); panel().scrollTop = 180; button('Placer · 60 pièces').click();
    ui.select({kind: 'fineCell', x: 22, y: 20}); button('Annuler · aucun coût').click();
    expect(panel().textContent).toContain('Ferme'); expect(panel().scrollTop).toBe(180);
    expect(state(controller).pattes).toBe(280); expect(state(controller).buildings).toHaveLength(1);
  });

  it('keeps native selects and pointer targets alive during passive refresh and renders the latest state after release', () => {
    const {ui, controller, clock, prefs} = setup(); ui.open({kind: 'collection'});
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return 0; });
    const flush = () => { for (const callback of frames.splice(0)) callback(0); };
    const select = panel().querySelector<HTMLSelectElement>('select[aria-label="Type"]')!;
    select.focus(); clock.now = 5000; controller.refresh();
    expect(panel().querySelector('select[aria-label="Type"]')).toBe(select); expect(select.isConnected).toBe(true);
    select.blur(); flush(); expect(panel().querySelector('select[aria-label="Type"]')).not.toBe(select);
    ui.open({kind: 'rabbit', id: 'rabbit-2'});
    const feed = button('Nourrir · 2 herbes');
    feed.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 7}));
    expect(controller.perform({type: 'feed', id: 'rabbit-2'}).ok).toBe(true); controller.refresh();
    expect(button('Nourrir · 2 herbes')).toBe(feed); expect(feed.isConnected).toBe(true);
    window.dispatchEvent(new PointerEvent('pointerup', {pointerId: 7})); flush();
    expect(panel().textContent).toContain('Affection 2 / 20'); expect(button('Nourrir · 4 herbes').isConnected).toBe(true);
    expect(state(controller).grass).toBe(8);
    prefs.restartGuidance(); ui.close();
    const tutorial = document.getElementById('tutorial')!, guide = button('Me guider', tutorial);
    expect(tutorial.dataset.step).toBe('welcome'); expect(tutorial.hidden).toBe(false);
    guide.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 8}));
    expect(controller.perform({type: 'claimMainMission', id: 'first-meal'}).ok).toBe(true); controller.refresh();
    expect(button('Me guider', tutorial)).toBe(guide); expect(guide.isConnected).toBe(true);
    window.dispatchEvent(new PointerEvent('pointerup', {pointerId: 8})); flush();
    expect(button('Me guider', tutorial)).not.toBe(guide);
    expect(tutorial.textContent).not.toContain('Réclamer · 10 herbes'); expect(state(controller).grass).toBe(18);
  });

  it('keeps a manually closed recipe pair list closed across passive saves and navigation', () => {
    const fixture=scenarioState('reproduction',0);fixture.recipeBook.push('frisket');const {ui, controller} = setup(fixture); ui.open({kind: 'recipes'});
    const pairs = () => panel().querySelector<HTMLDetailsElement>('[data-recipe="frisket"] details')!;
    expect(pairs().open).toBe(true); pairs().open = false; pairs().dispatchEvent(new Event('toggle'));
    controller.refresh(); expect(pairs().open).toBe(false);
    ui.close(); ui.open({kind: 'recipes'}); expect(pairs().open).toBe(false);
  });

  it('links unavailable actions to their reason and shows shared work states without changing timers or transfer rules', () => {
    const initial = createGame(0); initial.grass = 0;
    const {ui, controller, clock} = setup(initial); ui.open({kind: 'rabbit', id: 'rabbit-2'});
    const feed = button('Nourrir · 2 herbes'), reason = document.getElementById(feed.getAttribute('aria-describedby')!);
    expect(feed.disabled).toBe(true); expect(reason?.textContent).toContain('Pas assez d’herbe'); expect(reason?.hidden).toBe(false);
    expect(controller.perform({type: 'buyBuilding', kind: 'farm', x: 22, y: 20}).ok).toBe(true);
    const farm = state(controller).buildings.find(building => building.kind === 'farm')!;
    ui.open({kind: 'building', id: farm.id}); expect(panel().querySelector('.work-state')?.getAttribute('data-state')).toBe('free');
    expect(controller.perform({type: 'startOrder', id: farm.id, recipe: 'small'}).ok).toBe(true);
    expect(panel().querySelector('.work-state')?.getAttribute('data-state')).toBe('running');
    clock.now = 5 * 60_000; controller.refresh(); expect(panel().querySelector('.work-state')?.getAttribute('data-state')).toBe('ready');
    expect(state(controller).grass).toBe(0); button('Récolter 20 herbes').click();
    expect(panel().querySelector('.work-state')?.getAttribute('data-state')).toBe('free'); expect(state(controller).grass).toBe(20);
    clock.now = 3600_000;
    const occupied = scenarioState('manualBreeding', clock.now), prepared = controller.prepareImport(encodeGame(occupied));
    if (!prepared.ok) throw Error(prepared.reason); expect(controller.confirmImport(prepared.token, true).ok).toBe(true);
    clock.now = 7200_000; controller.refresh(); ui.open({kind: 'building', id: state(controller).buildings.find(building => building.kind === 'nest')!.id});
    expect(panel().querySelector('.work-state')?.getAttribute('data-state')).toBe('blocked'); expect(button('Envoyer dans la nurserie').disabled).toBe(true);
    expect(state(controller).buildings.find(building => building.kind === 'nest')!.breeding).not.toBeNull();
  });
});

 it('keeps the fullscreen shop read-only at home and recipes, rejects meadow selection and returns to the previous panel', () => {
   const {ui, controller} = setup(); const before = state(controller); const rabbit = before.rabbits[0];
   ui.open({kind:'rabbit',id:rabbit.id}); ui.open({kind:'shop',tab:'home'});
   expect(document.getElementById('game-panel')!.classList.contains('shop-fullscreen')).toBe(true);
   expect(panel().querySelectorAll('.shop-category')).toHaveLength(5);
   ui.select({kind:'income',id:before.buildings[0].id}); ui.select({kind:'empty'});
   expect(state(controller)).toEqual(before); expect(panel().querySelectorAll('.shop-category')).toHaveLength(5);
   button('Recettes de lapins').click(); expect(panel().querySelectorAll('[data-recipe]').length).toBeGreaterThan(0);
   expect(panel().textContent).not.toContain('Préparer cette paire au nid');
   document.getElementById('panel-back')!.click(); expect(panel().querySelectorAll('.shop-category')).toHaveLength(5);
   ui.close(); expect(document.getElementById('panel-title')!.textContent).toContain('Paille');
   expect(document.getElementById('game-panel')!.classList.contains('shop-fullscreen')).toBe(false);
   ui.open({kind:'arrange'}); button('Acheter des décorations').click(); ui.close();
   expect(document.getElementById('panel-title')!.textContent).toBe('Aménager · inventaire');
   expect(document.body.classList.contains('arranging')).toBe(true);
 });

 it('selects a rabbit destination on the island, ignores other actions, revalidates and cancels to the remembered shop',()=>{
   const initial=createGame(0);initial.pattes=1000;const {ui,controller,scene}=setup(initial);
   controller.perform({type:'buyBuilding',kind:'enclosure',x:22,y:20});
   ui.open({kind:'shop',tab:'rabbits'});panel().scrollTop=170;
   const speciesCard=[...panel().querySelectorAll<HTMLElement>('.card')].find(c=>c.querySelector('h3')?.textContent==='Lapin Neige')!;
   button('Choisir un habitat · 80 pièces',speciesCard).click();
   expect(button('Confirmer l’achat · 80 pièces').disabled).toBe(true);
   const before=state(controller);ui.select({kind:'income',id:before.buildings[0].id});ui.select({kind:'rabbit',id:before.rabbits[0].id});expect(state(controller)).toEqual(before);
   ui.select({kind:'building',id:before.buildings[1].id});expect(scene.setRabbitPurchase).toHaveBeenLastCalledWith('neige',before.buildings[1].id);
   button('Annuler · aucun coût').click();expect(panel().scrollTop).toBe(170);expect(state(controller)).toEqual(before);
   button('Choisir un habitat · 80 pièces', [...panel().querySelectorAll<HTMLElement>('.card')].find(c=>c.querySelector('h3')?.textContent==='Lapin Neige')!).click();
   ui.select({kind:'building',id:before.buildings[1].id});const confirm=button('Confirmer l’achat · 80 pièces');confirm.click();confirm.click();
   expect(state(controller).rabbits).toHaveLength(3);expect(state(controller).rabbits.at(-1)!.enclosureId).toBe(before.buildings[1].id);expect(state(controller).pattes).toBe(before.pattes-80);expect(state(controller).progression.totalXp).toBe(before.progression.totalXp+PROGRESSION.xp.commonPurchase);
 });
 it('keeps full parent places reserved and offers shop shortcuts without buying',()=>{
   const initial=scenarioState('manualBreeding',3600000);initial.pattes=5000;const {ui,controller,clock}=setup(initial);clock.now=3600000;
   // Complete its reserved capacity without moving either nest parent.
   for(const b of initial.buildings.filter(b=>b.kind==='enclosure')) {const count=initial.rabbits.filter(r=>r.enclosureId===b.id).length;for(let i=count;i<3;i++)expect(controller.perform({type:'buyRabbit',species:'paille',enclosureId:b.id}).ok).toBe(true);}
   const before=state(controller);ui.open({kind:'shop',tab:'rabbits'});
   const paille=[...panel().querySelectorAll<HTMLElement>('.card')].find(c=>c.querySelector('h3')?.textContent==='Lapin Paille')!;
   button('Choisir un habitat · 80 pièces',paille).click();
   expect(document.body.classList.contains('shop-open')).toBe(true);expect(panel().textContent).toContain('Tous les habitats compatibles sont pleins');expect(state(controller)).toEqual(before);
   expect(button('Voir les habitats compatibles').disabled).toBe(false);
 });

 it('shows level locks and information, blocks indirect shortcuts, and refreshes at the threshold',()=>{
   const initial=soloStart(0);initial.buildings[0].habitat!.type='universal';initial.grass=100;
   initial.progression={totalXp:cumulativeLevelXp(5)-10,rewardedThroughLevel:4};
   const {ui,controller}=setup(initial);ui.open({kind:'shop',tab:'rabbits'});
   const feu=()=>panel().querySelector<HTMLElement>('[data-level-target="feu"]')!;
   expect(feu().textContent).toContain('Niveau 5 requis');expect(button('Choisir un habitat · 80 pièces',feu()).disabled).toBe(true);
   button('Consulter la fiche',feu()).click();expect(panel().textContent).toContain('Niveau 5 requis');
   ui.open({kind:'buyRabbit',species:'belier-gris'});expect(document.getElementById('game-panel')!.dataset.view).toBe('levelRequirement');
   ui.open({kind:'shop',tab:'rabbits'});controller.perform({type:'feed',id:'rabbit-2'});
   expect(button('Choisir un habitat · 80 pièces',feu()).disabled).toBe(false);
   expect(feu().querySelector<HTMLElement>('.level-lock-message')!.hidden).toBe(true);
   ui.open({kind:'shop',tab:'habitats'});expect(panel().querySelector('[data-level-target="universal"]')!.textContent).toContain('Niveau 6 requis');
   const available=[...panel().querySelectorAll<HTMLButtonElement>('button')].filter(b=>b.textContent?.includes('Placer · 200')&&!b.disabled);expect(available).toHaveLength(3);
 });
it('new course mission shortcut uses Paille and preserves the budget',()=>{
 const {ui,controller,prefs}=setup(soloStart(0));prefs.restartGuidance();prefs.set({pailleNamed:true,intro:true,guideCamera:true});ui.close();
 button('Trouver un amoureux pour Paille',document.getElementById('paille-dialogue')!).click();expect(panel().textContent).toContain('Jardin enneigé');expect(state(controller).pattes).toBe(300);
});


describe('birth XP confirmation guard',()=>{
 it('a repeated nursery destination control welcomes and rewards the same birth once',()=>{
  const s=currentStart(0);setBaby(s.buildings.find(b=>b.kind==='nursery')!, {birth:{id:'birth-6',species:'paille',guaranteed:false,reservedDiscovery:false},startedAt:0,readyAt:0});s.nextId=7;
  const {ui,controller}=setup(s);ui.open({kind:'building',id:'building-5'});const welcome=button('Enclos 1 · 2/3');welcome.click();welcome.click();
  expect(state(controller).rabbits).toHaveLength(3);expect(state(controller).progression.totalXp).toBe(PROGRESSION.xp.birth.common);expect(babyOf(state(controller).buildings.find(b=>b.kind==='nursery')!)).toBeNull();
 });
});

describe('mission XP display and claim continuity',()=>{
 it('shows XP in guide and Missions; a failed claim remains visible and the successful next claim disappears',()=>{
  const initial=createGame(0);initial.rabbits[0].affection=2;const {ui,controller,prefs,storage,clock}=setup(initial);prefs.restartGuidance();ui.close();
  const guide=document.getElementById('tutorial')!;expect(guide.textContent).toContain('20 XP');const before=state(controller);
  const fail=vi.spyOn(storage,'setItem').mockImplementation(()=>{throw Error('quota');});button('Réclamer · 10 herbes',guide).click();expect(state(controller)).toEqual(before);expect(guide.textContent).toContain('20 XP');fail.mockRestore();clock.now=500;vi.spyOn(performance,'now').mockReturnValue(performance.now()+500);
  button('Réclamer · 10 herbes',guide).click();expect(state(controller).missions.claimed).toContain('first-meal');expect(state(controller).progression.totalXp).toBe(before.progression.totalXp+PROGRESSION.xp.claims.main);
  ui.open({kind:'missions',tab:'main'});expect(panel().querySelector('[data-mission="first-meal"]')).toBeNull();expect(panel().querySelector('[data-mission="first-farm"]')?.textContent).toContain('20 XP');ui.open({kind:'missions',tab:'daily'});expect(panel().querySelector('[data-mission="collect-pattes"]')?.textContent).toContain('10 XP');expect(panel().querySelector('[data-mission="daily-bonus"]')?.textContent).not.toContain('0 XP');
 });
});


describe('mission XP exceptions in reward display',()=>{
 it.each([0,7])('configured XP %i is displayed truthfully without zero text',xp=>{
  const original=progressionApi.missionClaimXp;
  const config={...PROGRESSION,xp:{...PROGRESSION.xp,claims:{...PROGRESSION.xp.claims,mainExceptions:{'first-meal':xp}}}};
  vi.spyOn(progressionApi,'missionClaimXp').mockImplementation((kind,id)=>original(kind,id,config));
  const s=createGame(0);s.rabbits[0].affection=2;const {ui,controller,prefs}=setup(s);prefs.restartGuidance();ui.close();
  const guide=document.getElementById('tutorial')!;expect(guide.textContent).not.toContain('0 XP');if(xp)expect(guide.textContent).toContain(`${xp} XP`);
  ui.open({kind:'missions',tab:'main'});const card=panel().querySelector('[data-mission="first-meal"]')!;expect(card.textContent).not.toContain('0 XP');if(xp)expect(card.textContent).toContain(`${xp} XP`);
  button('Réclamer · + 10 herbes',card).click();expect(state(controller).progression.totalXp).toBe(xp);expect(panel().querySelector('[data-mission="first-meal"]')).toBeNull();
 });
});


describe('decoration level acquisition UI',()=>{
 it('keeps both purchase actions locked, information accessible, scroll and navigation, and updates at level 3',()=>{
  const initial=soloStart(0);initial.grass=10;initial.progression={totalXp:cumulativeLevelXp(3)-10,rewardedThroughLevel:2};const {ui,controller}=setup(initial);
  ui.open({kind:'shop',tab:'decorations'});panel().scrollTop=160;const card=()=>panel().querySelector<HTMLElement>('[data-catalog="bunny-slippers"]')!;
  expect(button('Acheter · 30 pièces',card()).disabled).toBe(true);expect(button('Acheter pour l’inventaire · 30 pièces',card()).disabled).toBe(true);
  expect(card().querySelectorAll('.level-lock-message')).toHaveLength(1);const before=state(controller);
  button('Consulter la fiche',card()).click();expect(document.body.classList.contains('shop-open')).toBe(true);expect(panel().textContent).toContain('Chaussons lapins');expect(panel().textContent).toContain('Niveau 3 requis');expect(state(controller)).toEqual(before);
  document.getElementById('panel-back')!.click();expect(panel().scrollTop).toBe(160);
  controller.perform({type:'feed',id:'rabbit-2'});expect(button('Acheter · 30 pièces',card()).disabled).toBe(false);expect(button('Acheter pour l’inventaire · 30 pièces',card()).disabled).toBe(false);
  button('Acheter · 30 pièces',card()).click();ui.select({kind:'fineCell',x:18,y:28});button('Annuler le placement').click();expect(panel().scrollTop).toBe(160);expect(state(controller).decorations).toEqual([]);expect(state(controller).pattes).toBe(300);
 });
 it('invalidates an expensive inventory confirmation when replaced by a new below-level party',()=>{
  const initial=soloStart(0);initial.progression={totalXp:cumulativeLevelXp(3),rewardedThroughLevel:3};const {ui,controller}=setup(initial);
  ui.open({kind:'shop',tab:'decorations'});const card=panel().querySelector<HTMLElement>('[data-catalog="bunny-slippers"]')!;button('Acheter pour l’inventaire · 30 pièces',card).click();const stale=button('Confirmer',document.getElementById('game-dialog')!);
  controller.restart(true);const fresh=state(controller);stale.click();expect(state(controller)).toEqual(fresh);expect(state(controller).decorations).toEqual([]);expect(state(controller).pattes).toBe(300);
 });
});


describe('habitat upgrade level controls',()=>{
 it('keeps before/after details visible, blocks all payments and updates at the player threshold',()=>{
  const initial=soloStart(0);initial.grass=10;initial.progression={totalXp:cumulativeLevelXp(3)-10,rewardedThroughLevel:2};const {ui,controller}=setup(initial);ui.open({kind:'building',id:'building-1'});
  const card=()=>panel().querySelector<HTMLElement>('[data-upgrade-habitat]')!;expect(card().textContent).toContain('places 3 → 5');expect(card().textContent).toContain('stockage 900 → 1 500');expect(card().textContent).toContain('Niveau 3 requis');expect(button('Améliorer · 300 pièces',card()).disabled).toBe(true);expect(card().textContent).not.toContain('Compléter');
  controller.perform({type:'feed',id:'rabbit-2'});expect(button('Améliorer · 300 pièces',card()).disabled).toBe(false);const xp=state(controller).progression.totalXp;button('Améliorer · 300 pièces',card()).click();button('Confirmer',document.getElementById('game-dialog')!).click();expect(state(controller).buildings[0].habitat?.level).toBe(2);expect(state(controller).progression.totalXp).toBe(xp);expect(card().textContent).toContain('Niveau 6 requis');
 });
 it('explains a locked capacity upgrade and offers an actually buyable compatible habitat',()=>{
  const initial=soloStart(0);initial.rabbits.push({id:'rabbit-6',species:'paille',affection:1,enclosureId:'building-1'},{id:'rabbit-7',species:'paille',affection:1,enclosureId:'building-1'});initial.nextId=8;const {ui}=setup(initial);ui.open({kind:'shop',tab:'rabbits'});const card=panel().querySelector<HTMLElement>('[data-level-target="paille"]')!;button('Choisir un habitat · 80 pièces',card).click();expect(panel().textContent).toContain('niveau du joueur 3 requis');button('Voir les habitats compatibles').click();expect(panel().textContent).toContain('Prairie de paille');expect(panel().textContent).not.toContain('Enclos universel');expect(button('Placer · 200 pièces').disabled).toBe(false);
 });
});

describe('extension rank level controls',()=>{
 it('lists only the next parcel of the fixed order, then the following one',()=>{
  const initial=soloStart(0);initial.pattes=5000;initial.progression={totalXp:cumulativeLevelXp(4),rewardedThroughLevel:4};const {ui,controller}=setup(initial);
  const choices=()=>[...panel().querySelectorAll('button')].map(b=>b.textContent).filter(t=>t?.startsWith('Voir '));
  ui.open({kind:'extension'});expect(choices()).toEqual(['Voir Sud']);expect(panel().textContent).toContain('toujours dans le même ordre');
  ui.open({kind:'extension',parcelId:'west'});expect([...panel().querySelectorAll('button')].some(b=>b.textContent?.startsWith('Acheter'))).toBe(false);
  ui.open({kind:'extension',parcelId:'south'});button('Acheter Sud · 500 pièces').click();button('Confirmer',document.getElementById('game-dialog')!).click();
  expect(state(controller).acquiredParcels).toEqual(['southwest','south']);
  ui.open({kind:'extension'});expect(choices()).toEqual(['Voir Ouest']);
 });
 it('keeps geographic choices consultable and updates the next tier immediately without XP',()=>{
  const initial=createCentreStartGame(0);initial.grass=10;initial.pattes=5000;initial.progression={totalXp:cumulativeLevelXp(4)-10,rewardedThroughLevel:3};const {ui,controller}=setup(initial);
  ui.open({kind:'extension',parcelId:'northwest'});expect(button('Acheter Nord-ouest · 500 pièces').disabled).toBe(true);expect(panel().textContent).toContain('Niveau 4 requis');expect(button('Voir Sud-est').disabled).toBe(false);expect(panel().textContent).not.toContain('Compléter');
  controller.perform({type:'feed',id:'rabbit-2'});expect(button('Acheter Nord-ouest · 500 pièces').disabled).toBe(false);const before=state(controller);button('Acheter Nord-ouest · 500 pièces').click();button('Confirmer',document.getElementById('game-dialog')!).click();expect(state(controller).pattes).toBe(before.pattes-500);expect(state(controller).progression).toEqual(before.progression);expect(panel().textContent).toContain('Prochaine extension : 2');expect(panel().textContent).toContain('Niveau 6 requis');button('Voir Est').click();expect(button('Acheter Est · 1 000 pièces').disabled).toBe(true);
 });
 it('invalidates a confirmation when the party is replaced and handles the fully acquired island',()=>{
  const initial=createCentreStartGame(0);initial.pattes=5000;initial.progression={totalXp:cumulativeLevelXp(4),rewardedThroughLevel:4};const {ui,controller}=setup(initial);ui.open({kind:'extension',parcelId:'northwest'});button('Acheter Nord-ouest · 500 pièces').click();const stale=button('Confirmer',document.getElementById('game-dialog')!);controller.restart(true);const fresh=state(controller);stale.click();expect(state(controller)).toEqual(fresh);
  const full=scenarioState('islandFull',0),preview=controller.prepareImport(encodeGame(full));if(!preview.ok)throw Error(preview.reason);controller.confirmImport(preview.token,true);ui.open({kind:'extension'});expect(panel().textContent).toContain('Île entièrement agrandie');expect(panel().textContent).not.toContain('Niveau');expect(panel().querySelectorAll('button')).toHaveLength(0);
 });
});

describe('nursery panel with several cushions',()=>{
 it('gives each baby its own section and actions; welcoming the second ready baby leaves the others in their slots',()=>{
  const s=currentStart(0),n=s.buildings.find(b=>b.kind==='nursery')!,birth=(id:string)=>({id,species:'paille' as const,guaranteed:false,reservedDiscovery:false});
  n.nursery={capacity:3,babies:[{slot:0,birth:birth('birth-6'),startedAt:0,readyAt:0},{slot:2,birth:birth('birth-7'),startedAt:0,readyAt:0},{slot:1,birth:birth('birth-8'),startedAt:0,readyAt:5*60_000}]};s.nextId=9;
  const {ui,controller}=setup(s);ui.open({kind:'building',id:n.id});
  expect(panel().textContent).toContain('Couchages : 3 / 4');expect(panel().textContent).toContain('1 : prêt · 2 : occupé · 3 : prêt · 4 : verrouillé');
  expect([...panel().querySelectorAll('h3')].map(h=>h.textContent).filter(t=>t!.startsWith('Couchage'))).toEqual(['Couchage 1','Couchage 2','Couchage 3']);
  expect(panel().querySelectorAll('.work-state[data-state=running]')).toHaveLength(1);expect(panel().querySelectorAll('[data-accelerate-end]')).toHaveLength(1);
  const homes=[...panel().querySelectorAll<HTMLButtonElement>('button')].filter(b=>b.textContent==='Enclos 1 · 2/3');expect(homes).toHaveLength(2);
  homes[1].click();
  const after=state(controller).buildings.find(b=>b.kind==='nursery')!.nursery!;
  expect(after.babies.map(b=>[b.slot,b.birth.id]).sort()).toEqual([[0,'birth-6'],[1,'birth-8']]);
  expect(state(controller).rabbits.at(-1)!.id).toBe('birth-7');
 });
});

describe('nursery cushion unlock',()=>{
 const open=(capacity:1|2|3|4,hearts:number)=>{const s=soloStart(0);s.hearts=hearts;const n=s.buildings.find(b=>b.kind==='nursery')!;n.nursery!.capacity=capacity;const m=setup(s);m.ui.open({kind:'building',id:n.id});return {...m,id:n.id};};
 const unlocks=()=>[...panel().querySelectorAll<HTMLButtonElement>('button')].filter(b=>b.textContent!.startsWith('Débloquer'));
 // Expected prices come from the balance table (`PRICE[c]`: step c → c + 1), never from the code under test.
 const PRICE=NURSERY.unlockHearts,hearts=(n:number)=>`${n} ${n===1?'cœur':'cœurs'}`;
 it.each([1,2,3] as const)('capacity %i shows its cushions and only the next unlock, at its configured price',capacity=>{
  const price=hearts(PRICE[capacity]);open(capacity,PRICE[capacity]+100);
  expect(panel().textContent).toContain(`Couchages : ${capacity} / 4`);
  expect(panel().textContent).toContain(['1','2','3','4'].map((n,i)=>`${n} : ${i<capacity?'libre':'verrouillé'}`).join(' · '));
  expect(unlocks().map(b=>[b.textContent,b.disabled])).toEqual([[`Débloquer un couchage · ${price}`,false]]);
 });
 it('confirms the new capacity and price, then spends once and updates the panel immediately and after reload',()=>{
  const start=PRICE[1]+PRICE[2]-1,left=start-PRICE[1];// One Heart short of the next step.
  const {controller,data,id}=open(1,start),dialog=document.getElementById('game-dialog')!;
  unlocks()[0].click();expect(dialog.textContent).toContain(hearts(PRICE[1]));expect(dialog.textContent).toContain('de 1 à 2 couchages');
  const confirm=button('Confirmer',dialog);confirm.click();confirm.click();
  expect(state(controller).hearts).toBe(left);expect(state(controller).buildings.find(b=>b.id===id)!.nursery!.capacity).toBe(2);expect(state(controller).pattes).toBe(soloStart(0).pattes);
  expect(panel().textContent).toContain('Couchages : 2 / 4');expect(unlocks().map(b=>[b.textContent,b.disabled])).toEqual([[`Débloquer un couchage · ${hearts(PRICE[2])}`,true]]);
  const reloaded=new GameController({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}},()=>0);cleanups.push(()=>reloaded.dispose());
  expect(state(reloaded).buildings.find(b=>b.id===id)!.nursery!.capacity).toBe(2);expect(state(reloaded).hearts).toBe(left);
 });
 it('blocks the unlock with too few Hearts and spends nothing',()=>{
  const short=PRICE[2]-1,{controller}=open(2,short);const [only]=unlocks();
  expect(only.disabled).toBe(true);expect(panel().textContent).toContain(REFUSALS.NOT_ENOUGH_HEARTS);
  only.click();expect(state(controller).hearts).toBe(short);expect(state(controller).buildings.find(b=>b.kind==='nursery')!.nursery!.capacity).toBe(2);
 });
 it('shows the maximum state at capacity 4 with no unlock action',()=>{
  open(4,PRICE[3]+PRICE[2]);expect(panel().textContent).toContain('Couchages : 4 / 4');expect(panel().textContent).toContain('Capacité maximale');expect(unlocks()).toEqual([]);
 });
});
