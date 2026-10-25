// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {createGame} from '../src/state/initial';
import {encodeGame} from '../src/persistence/json';
import {SAVE_KEY} from '../src/persistence/storage';
import type {MeadowScene} from '../src/display/MeadowScene';
import type {GameState} from '../src/state/types';

const cleanup: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('loading-screen')!.hidden = true; document.getElementById('app')!.inert = false;
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => { cleanup.splice(0).forEach(fn => fn()); vi.unstubAllGlobals(); });
/** Two Paille rabbits in the same habitat, so that two individuals of one species can be told apart. */
function setup(customize: (s: GameState) => void = () => {}) {
  const s: GameState = createGame(0); s.rabbits.push({id: 'rabbit-3', species: 'paille', affection: 1, enclosureId: 'building-1'});
  customize(s);
  const data = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }}, () => 0);
  const prefs = new PreferenceStore('test-rabbit-names'); prefs.set({tutorial: false});
  const ui = new GameUI(controller, {setRabbitPurchase: vi.fn(), setPlacement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), setArrangement: vi.fn(), setExpansion: vi.fn(), setDecorationGhost: vi.fn(), setDecorationPlacement: vi.fn(), recenter: vi.fn(), reactToFeed: vi.fn()} as unknown as MeadowScene, () => 0, prefs);
  cleanup.push(() => { ui.dispose(); controller.dispose(); });
  return {ui, controller};
}
const panel = () => document.getElementById('panel-content')!;
const state = (c: GameController) => c.getSnapshot().state!;
const button = (text: string) => [...panel().querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === text) ?? (() => { throw new Error(`Button missing: ${text}\n${panel().textContent}`); })();
const box = () => panel().querySelector<HTMLElement>('[data-rabbit-nickname]')!;
const field = () => panel().querySelector<HTMLInputElement>('input[data-focus="rabbit-name"]')!;
function type(text: string) { const input = field(); input.value = text; input.setSelectionRange(text.length, text.length); input.dispatchEvent(new Event('input', {bubbles: true})); }

describe('the personal name in the rabbit sheet', () => {
  it('shows the name box after the feeding action, "Sans nom" by default, with the species kept in the title', () => {
    const {ui} = setup(); ui.select({kind: 'rabbit', id: 'rabbit-2'});
    expect(box().textContent).toContain('Sans nom'); expect(document.getElementById('panel-title')!.textContent).toBe('Lapin Paille');
    const overview = panel().querySelector('.rabbit-overview')!; expect(overview.compareDocumentPosition(box()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button('Nourrir · 2 nourriture').compareDocumentPosition(box()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(overview.querySelector('[data-rabbit-art], svg, img')).not.toBeNull(); expect(button('Donner un nom')).toBeTruthy();
  });

  it('names, renames, clears and cancels: each individual on its own, nothing else changing', () => {
    const {ui, controller} = setup(); ui.select({kind: 'rabbit', id: 'rabbit-2'});
    const before = structuredClone(state(controller));
    button('Donner un nom').click(); expect(document.activeElement).toBe(field()); type('  Éloïse 🐰 '); button('Enregistrer').click();
    expect(state(controller).rabbits.find(r => r.id === 'rabbit-2')!.name).toBe('Éloïse 🐰'); expect(box().textContent).toContain('Éloïse 🐰'); expect(button('Modifier le nom')).toBeTruthy();
    expect(state(controller).rabbits.find(r => r.id === 'rabbit-3')!.name).toBeUndefined();
    expect({...state(controller), rabbits: state(controller).rabbits.map(({name: _n, ...r}) => r)}).toMatchObject({pattes: before.pattes, grass: before.grass, hearts: before.hearts});
    // Cancel: the draft is dropped and nothing is saved.
    button('Modifier le nom').click(); expect(field().value).toBe('Éloïse 🐰'); type('Autre'); button('Annuler').click();
    expect(state(controller).rabbits.find(r => r.id === 'rabbit-2')!.name).toBe('Éloïse 🐰'); expect(panel().querySelector('input')).toBeNull();
    // The same name for the second individual is allowed.
    ui.select({kind: 'rabbit', id: 'rabbit-3'}); button('Donner un nom').click(); type('Éloïse 🐰'); button('Enregistrer').click();
    expect(state(controller).rabbits.map(r => r.name)).toEqual(['Éloïse 🐰', 'Éloïse 🐰']);
    // Clearing goes back to "Sans nom".
    button('Modifier le nom').click(); type('   '); button('Enregistrer').click();
    expect(state(controller).rabbits.find(r => r.id === 'rabbit-3')!.name).toBeUndefined(); expect(box().textContent).toContain('Sans nom');
    ui.select({kind: 'rabbit', id: 'rabbit-2'}); expect(box().textContent).toContain('Éloïse 🐰');
  });

  it('saves with Enter, cancels with Escape, and refuses an invalid entry inline without any change', () => {
    const {ui, controller} = setup(); ui.select({kind: 'rabbit', id: 'rabbit-2'});
    button('Donner un nom').click(); type('Mimi'); field().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    expect(state(controller).rabbits[0].name).toBe('Mimi');
    button('Modifier le nom').click(); type('a'.repeat(33)); button('Enregistrer').click();
    expect(panel().textContent).toContain('Nom refusé'); expect(state(controller).rabbits[0].name).toBe('Mimi'); expect(field().value).toBe('a'.repeat(33));
    // A text field cannot hold a line break (the browser removes it); a control character such as a tab can be typed or pasted.
    type('a\tb'); button('Enregistrer').click(); expect(panel().textContent).toContain('Nom refusé'); expect(state(controller).rabbits[0].name).toBe('Mimi');
    type('Pomme'); expect(panel().textContent).not.toContain('Nom refusé');
    field().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); expect(state(controller).rabbits[0].name).toBe('Mimi'); expect(panel().querySelector('input')).toBeNull();
  });

  it('shows the name as text, never as markup', () => {
    const {ui, controller} = setup(); ui.select({kind: 'rabbit', id: 'rabbit-2'});
    button('Donner un nom').click(); type('<b onclick="x()">Hé</b> & <i>'); button('Enregistrer').click();
    expect(state(controller).rabbits[0].name).toBe('<b onclick="x()">Hé</b> & <i>');
    expect(box().querySelector('b, i')).toBeNull(); expect(box().textContent).toContain('<b onclick="x()">Hé</b> & <i>');
  });

  it('keeps the draft, the caret and the focus through refreshes of the interface', () => {
    const {ui, controller} = setup(); ui.select({kind: 'rabbit', id: 'rabbit-2'});
    button('Donner un nom').click(); type('Mimosa'); field().setSelectionRange(3, 3); field().dispatchEvent(new Event('select'));
    const typed = field();
    // A refresh while the field has the focus is held back: same element, same text, same caret, keyboard still open.
    controller.refresh(); controller.perform({type: 'feed', id: 'rabbit-3'});
    expect(field()).toBe(typed); expect(document.activeElement).toBe(typed); expect(typed.value).toBe('Mimosa'); expect(typed.selectionStart).toBe(3);
    // Even when the panel is rebuilt (an action of the same sheet), the draft comes back and the form stays open.
    typed.blur(); ui.select({kind: 'rabbit', id: 'rabbit-2'}); expect(field().value).toBe('Mimosa');
    field().focus(); type('Mimosa 2'); button('Nourrir · 2 nourriture').click();
    expect(field().value).toBe('Mimosa 2'); expect(state(controller).rabbits[0].name).toBeUndefined();
    button('Enregistrer').click(); expect(state(controller).rabbits[0].name).toBe('Mimosa 2');
  });

  it('drops the draft when the sheet is left, and shows personal names in individual lists', () => {
    const {ui, controller} = setup(); ui.select({kind: 'rabbit', id: 'rabbit-2'});
    button('Donner un nom').click(); type('Brouillon'); ui.select({kind: 'rabbit', id: 'rabbit-3'}); expect(panel().querySelector('input')).toBeNull();
    ui.select({kind: 'rabbit', id: 'rabbit-2'}); expect(panel().querySelector('input')).toBeNull();
    button('Donner un nom').click(); type('Secret'); button('Enregistrer').click(); expect(state(controller).rabbits[0].name).toBe('Secret');
    ui.select({kind: 'building', id: 'building-1'}); expect(panel().querySelector('.compact-list-card .card-heading h3')!.textContent).toBe('Secret');
    expect(panel().querySelector('.compact-list-card .card-heading p')!.textContent).toContain('Lapin Paille');
    ui.open({kind: 'collection'}); expect(panel().textContent).not.toContain('Secret');
    ui.open({kind: 'species', species: 'paille'}); expect(panel().textContent).not.toContain('Secret');
    ui.open({kind: 'recipes'}); expect(panel().textContent).not.toContain('Secret');
    ui.select({kind: 'building', id: 'building-4'}); expect(panel().textContent).not.toContain('Secret');
  });
});


describe('audit corrections in individual lists and habitat actions', () => {
  it('creates the claim button disabled before any timer update', () => {
    const {ui} = setup();
    vi.spyOn(ui as unknown as {updateTimers(): void}, 'updateTimers').mockImplementation(() => {});
    ui.open({kind:'hearts'});
    expect(panel().querySelector<HTMLButtonElement>('[data-gift-at]')!.disabled).toBe(true);
  });

  it('disables claiming immediately without a gift and enables it when a gift is ready', () => {
    const {ui, controller} = setup(s => { s.nextHeartGiftAt = 0; });
    ui.open({kind:'hearts'});
    expect(panel().querySelector<HTMLButtonElement>('[data-gift-at]')!.disabled).toBe(false);
    expect(document.getElementById('open-hearts')!.classList.contains('has-heart-gift')).toBe(true);
    panel().querySelector<HTMLButtonElement>('[data-gift-at]')!.click();
    expect(state(controller).nextHeartGiftAt).toBeGreaterThan(0);
    expect(panel().querySelector<HTMLButtonElement>('[data-gift-at]')!.disabled).toBe(true);
    expect(document.getElementById('open-hearts')!.classList.contains('has-heart-gift')).toBe(false);
    ui.close(); ui.open({kind:'hearts'});
    expect(panel().querySelector<HTMLButtonElement>('[data-gift-at]')!.disabled).toBe(true);
  });
  it('places the upgrade after collection and before occupants, with a clear empty-stock reason', () => {
    const {ui} = setup(); ui.select({kind:'building',id:'building-1'});
    const upgrade = panel().querySelector('[data-upgrade-habitat]')!;
    const collect = [...panel().querySelectorAll('button')].find(b => b.textContent!.startsWith('Récolter'))!;
    const resident = [...panel().querySelectorAll('.card')].find(c => c.textContent!.includes('Voir ce lapin'))!;
    expect(collect.disabled).toBe(true);
    expect(document.getElementById(collect.getAttribute('aria-describedby')!)!.textContent).toBe('La récolte sera disponible à partir d’une pièce.');
    expect(collect.compareDocumentPosition(upgrade) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(upgrade.compareDocumentPosition(resident) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const tile of panel().querySelectorAll('.stat')) {
      if (/Stock|Revenu/.test(tile.textContent!)) {
        expect(tile.querySelectorAll('img')).toHaveLength(1);
        expect(tile.querySelector('.sr-only')!.textContent).toContain('pièces');
      }
    }
  });
  it.each(['cuisineRabbit','moveRabbit','building'] as const)('shows personal name, species and habitat without technical ids in %s', kind => {
    const {ui} = setup(s => { s.rabbits[0].name = 'Mimosa'; });
    if (kind === 'moveRabbit') ui.open({kind,id:'rabbit-2'}); else if (kind === 'building') ui.open({kind,id:'building-1'}); else ui.open({kind});
    const card = panel().querySelector('.compact-list-card')!;
    expect(card.querySelector('h3')!.textContent).toBe('Mimosa');
    expect(card.querySelector('.card-heading p')!.textContent).toContain('Lapin Paille');
    expect(card.textContent).toContain('Prairie de paille');
    expect(panel().textContent).not.toMatch(/rabbit-\d+|building-\d+/);
  });
});
