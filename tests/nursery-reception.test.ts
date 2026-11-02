// @vitest-environment happy-dom
// Reception of a ready baby (owner, 2 November 2026): a touch on the baby opens its own card, « Accueillir » steps back over the
// island with arrows on the compatible habitats, « Prêt ! » only shows the nursery. HISTORICAL layout: previousStart.
import html from '../index.html?raw';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {REFUSALS} from '../src/ui/models';
import type {MeadowScene} from '../src/display/MeadowScene';
import {encodeGame} from '../src/simulation';
import {establishHistoricalLevelRights} from '../src/simulation/levelRights';
import {welcomeDestinations} from '../src/simulation/habitats';
import {releaseBabyPattesFor} from '../src/simulation/actions';
import {habitatStats} from '../src/simulation/habitats';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {SPECIES, type SpeciesId} from '../src/config/balance';
import {BABY_TOUCH_RADIUS, nurseryBabyHit, slotPlacement} from '../src/display/nurseryOverlayModel';
import {createGame} from '../src/simulation';
import type {Building, GameState, NurseryBaby, NurserySlot} from '../src/state/types';
import {previousStart} from './regression-start';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false;
  document.getElementById('loading-screen')!.hidden = true;
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const birth = (id: string, species: SpeciesId) => ({id, species, guaranteed: false, reservedDiscovery: false});
const nurseryOf = (s: GameState) => s.buildings.find(b => b.kind === 'nursery')!;
/** Two ready babies (slots 0 and 2) and one growing (slot 1). */
function game(species: SpeciesId = 'paille', other: SpeciesId = 'paille'): GameState {
  const s = previousStart(0);
  nurseryOf(s).nursery = {capacity: 3, babies: [
    {slot: 0, birth: birth('birth-6', species), startedAt: 0, readyAt: 0},
    {slot: 2, birth: birth('birth-7', other), startedAt: 0, readyAt: 0},
    {slot: 1, birth: birth('birth-8', 'paille'), startedAt: 0, readyAt: 5 * 60_000},
  ]};
  // Not the guided first birth, whose « Bienvenue, petit lapin ! » is kept (covered in tests/ui-dom.test.ts).
  s.missions.events.welcome = 1; s.nextId = 9; return s;
}
function setup(initial: GameState) {
  establishHistoricalLevelRights(initial);
  const data = new Map<string, string>([[SAVE_KEY, encodeGame(initial)]]);
  const storage: SaveStorage = {scope: 'normal', getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }};
  const clock = {now: 0}, controller = new GameController(storage, () => clock.now, () => .65);
  const scene = {focusTutorialCell: vi.fn(), setTutorialCell: vi.fn(), setTutorialTarget: vi.fn(), setRabbitPurchase: vi.fn(), overview: vi.fn(), focusDecoration: vi.fn(),
    setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn(),
    focusBuilding: vi.fn(), zoomForRabbitMove: vi.fn(), setRabbitDropTargets: vi.fn()};
  const prefs = new PreferenceStore('test-reception'); prefs.set({muted: true, tutorial: false});
  const ui = new GameUI(controller, scene as unknown as MeadowScene, () => clock.now, prefs);
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  return {ui, controller, scene, state: () => controller.getSnapshot().state!};
}
const card = () => document.getElementById('reception-dialog') as HTMLDialogElement;
const gameDialog = () => document.getElementById('game-dialog') as HTMLDialogElement;
const banner = () => document.getElementById('nursery-welcome-banner')!;
const panel = () => document.getElementById('panel-content')!;
function button(text: string, scope: ParentNode): HTMLButtonElement {
  const result = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === text);
  if (!result) throw new Error(`Button missing: ${text}\n${scope.textContent}`); return result;
}
const releaseButton = () => card().querySelector<HTMLButtonElement>('[data-reception="release"]')!;
/** Fills every habitat that could take this species. */
function fill(s: GameState, species: SpeciesId): void {
  for (const b of welcomeDestinations(s, species)) {
    while (s.rabbits.filter(r => r.enclosureId === b.id).length < habitatStats(b).capacity) s.rabbits.push({id: `rabbit-${s.nextId++}`, species: 'paille', affection: 1, enclosureId: b.id});
  }
}

describe('touching a baby on its cushion', () => {
  it('opens the reception card of that very baby, and not of another', () => {
    const {ui} = setup(game('paille', 'neige'));
    ui.select({kind: 'nurseryBaby', id: 'birth-7'});
    expect(card().open).toBe(true); expect(card().dataset.birthId).toBe('birth-7');
    expect(card().querySelector('.reception-name')!.textContent).toBe(SPECIES.neige.name);
    expect(card().textContent).not.toContain(SPECIES.paille.name);
    expect(card().querySelector('.portrait.large.reception-portrait')).not.toBeNull();
    expect(card().dataset.type).toBe(SPECIES.neige.types[0]); expect(card().classList.contains(`reception-type-${SPECIES.neige.types[0]}`)).toBe(true);
    expect(card().querySelector('.reception-frame')).not.toBeNull();
    expect(card().textContent).toContain('Ton lapereau est prêt !');
  });
  it('a growing baby opens the nursery, never a reception', () => {
    const {ui, state} = setup(game());
    ui.select({kind: 'nurseryBaby', id: 'birth-8'});
    expect(card().open).toBe(false); expect(document.getElementById('panel-title')!.textContent).toBe('Nurserie');
    expect(state().buildings.find(b => b.kind === 'nursery')!.nursery!.babies).toHaveLength(3);
  });
  it('« Prêt ! » centres the camera on the nursery and opens its panel, with no reception', () => {
    const {ui, scene, state} = setup(game());
    const id = nurseryOf(state()).id; ui.select({kind: 'nurseryBubble', id});
    expect(scene.focusBuilding).toHaveBeenCalledWith(id); expect(card().open).toBe(false);
    expect(document.getElementById('panel-title')!.textContent).toBe('Nurserie');
    // The panel keeps one button per ready baby, opening the same card (keyboard and VoiceOver).
    const buttons = [...panel().querySelectorAll<HTMLButtonElement>('button[data-reception]')];
    expect(buttons.map(b => [b.dataset.reception, b.textContent])).toEqual([['birth-6', `Accueillir ${SPECIES.paille.name}`], ['birth-7', `Accueillir ${SPECIES.paille.name}`]]);
    buttons[1].click(); expect(card().open).toBe(true); expect(card().dataset.birthId).toBe('birth-7');
  });
  it('shows « Nouvelle espèce » only for a species not yet discovered', () => {
    const s = game('paille', 'boudinet'); expect(s.discovered).toContain('paille'); expect(s.discovered).not.toContain('boudinet');
    const {ui} = setup(s);
    ui.select({kind: 'nurseryBaby', id: 'birth-6'}); expect(card().querySelector('.reception-new')).toBeNull();
    button('×', card()).click(); expect(card().open).toBe(false);
    ui.select({kind: 'nurseryBaby', id: 'birth-7'}); expect(card().querySelector('.reception-new')!.textContent).toBe('Nouvelle espèce');
  });
});

describe('Accueillir: arrows over the island', () => {
  it('steps back, points at welcomeDestinations, and names the baby in the banner', () => {
    const {ui, scene, state} = setup(game());
    ui.select({kind: 'nurseryBaby', id: 'birth-6'});
    const welcome = button('Accueillir', card()); expect(welcome.disabled).toBe(false); welcome.click();
    expect(card().open).toBe(false); expect(scene.zoomForRabbitMove).toHaveBeenCalledTimes(1);
    const expected = welcomeDestinations(state(), 'paille').map(b => b.id); expect(expected.length).toBeGreaterThan(0);
    expect(scene.setRabbitDropTargets).toHaveBeenLastCalledWith(expected);
    expect(banner().hidden).toBe(false); expect(banner().textContent).toContain(`Choisis un habitat pour ${SPECIES.paille.name}`);
    expect(document.getElementById('game-panel')!.hidden).toBe(true);
  });
  it('Annuler removes the arrows and changes nothing', () => {
    const {ui, scene, state, controller} = setup(game());
    const before = encodeGame(state());
    ui.select({kind: 'nurseryBaby', id: 'birth-6'}); button('Accueillir', card()).click();
    button('Annuler', banner()).click();
    expect(scene.setRabbitDropTargets).toHaveBeenLastCalledWith(null); expect(banner().hidden).toBe(true);
    expect(encodeGame(state())).toBe(before);
    // A habitat touched afterwards is an ordinary selection again, not a welcome.
    ui.select({kind: 'building', id: 'building-1'}); expect(document.getElementById('game-panel')!.dataset.view).toBe('building');
    expect(encodeGame(controller.getSnapshot().state!)).toBe(before);
    expect(nurseryOf(state()).nursery!.babies.map(b => b.birth.id).sort()).toEqual(['birth-6', 'birth-7', 'birth-8']);
  });
  it('Escape cancels the choice as well', () => {
    const {ui, state} = setup(game());
    const before = encodeGame(state());
    ui.select({kind: 'nurseryBaby', id: 'birth-6'}); button('Accueillir', card()).click();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}));
    expect(banner().hidden).toBe(true); expect(encodeGame(state())).toBe(before);
  });
  it('touching a target habitat welcomes exactly that baby there, without a second window', () => {
    const {ui, scene, state} = setup(game('paille', 'neige'));
    ui.select({kind: 'nurseryBaby', id: 'birth-7'}); button('Accueillir', card()).click();
    const target = vi.mocked(scene.setRabbitDropTargets).mock.calls.at(-1)![0]![0];
    ui.select({kind: 'building', id: target});
    const newborn = state().rabbits.find(r => r.id === 'birth-7')!;
    expect(newborn).toMatchObject({species: 'neige', enclosureId: target});
    expect(nurseryOf(state()).nursery!.babies.map(b => b.birth.id).sort()).toEqual(['birth-6', 'birth-8']);
    expect(document.getElementById('toast')!.textContent).toBe('Lapereau accueilli !');
    expect(banner().hidden).toBe(true); expect(scene.setRabbitDropTargets).toHaveBeenLastCalledWith(null);
    expect(gameDialog().open).toBe(false); expect(card().open).toBe(false);
  });
  it('a newly discovered species is welcomed without the former « Nouvelle découverte » window', () => {
    const {ui, scene, state} = setup(game('paille', 'boudinet'));
    ui.select({kind: 'nurseryBaby', id: 'birth-7'}); button('Accueillir', card()).click();
    ui.select({kind: 'building', id: vi.mocked(scene.setRabbitDropTargets).mock.calls.at(-1)![0]![0]});
    expect(state().discovered).toContain('boudinet');
    expect(gameDialog().open).toBe(false); expect(gameDialog().textContent).not.toContain('Nouvelle découverte');
    expect(document.querySelector('dialog.legendary-reveal, dialog.benny-reveal')).toBeNull();
  });
  it('a habitat that is not a target welcomes nothing', () => {
    const s = game('neige'); const {ui, state} = setup(s);
    const before = encodeGame(state());
    const targets = welcomeDestinations(state(), 'neige').map(b => b.id), refused = state().buildings.find(b => b.kind === 'enclosure' && !targets.includes(b.id));
    ui.select({kind: 'nurseryBaby', id: 'birth-6'}); button('Accueillir', card()).click();
    ui.select({kind: 'building', id: nurseryOf(state()).id});
    if (refused) ui.select({kind: 'building', id: refused.id});
    expect(encodeGame(state())).toBe(before); expect(banner().hidden).toBe(false);
  });
  it('the list fallback welcomes the chosen baby into the chosen habitat', () => {
    const {ui, state} = setup(game());
    ui.select({kind: 'nurseryBaby', id: 'birth-7'}); button('Accueillir', card()).click();
    button('Choisir dans une liste', banner()).click();
    expect(document.getElementById('panel-title')!.textContent).toBe('Accueillir');
    const destination = welcomeDestinations(state(), 'paille')[0];
    const choice = [...panel().querySelectorAll<HTMLButtonElement>('button')].find(b => !b.disabled && b.textContent!.includes(' · '))!;
    choice.click();
    expect(state().rabbits.find(r => r.id === 'birth-7')!.enclosureId).toBe(destination.id);
    expect(document.getElementById('game-panel')!.hidden).toBe(true);
  });
});

describe('no compatible place', () => {
  it('greys Accueillir with a clear sentence and leads to the habitat shop', () => {
    const s = game('neige'); fill(s, 'neige'); expect(welcomeDestinations(s, 'neige')).toHaveLength(0);
    const {ui, scene} = setup(s);
    ui.select({kind: 'nurseryBaby', id: 'birth-6'});
    const welcome = button('Accueillir', card()); expect(welcome.disabled).toBe(true);
    const reason = document.getElementById(welcome.getAttribute('aria-describedby')!)!;
    expect(reason.textContent).toBe('Aucun habitat compatible n’a de place libre. Ton lapereau reste en sécurité dans la nurserie.');
    welcome.click(); expect(scene.setRabbitDropTargets).not.toHaveBeenCalledWith(expect.any(Array));
    button('Voir les habitats compatibles', card()).click();
    expect(card().open).toBe(false); expect(document.getElementById('game-panel')!.dataset.view).toBe('shop');
    expect(panel().textContent).toContain(`Habitats achetables compatibles avec ${SPECIES.neige.name}`);
  });
});

describe('Confier', () => {
  it('keeps its confirmation with the pattes, then releases that baby only', () => {
    const {ui, state} = setup(game());
    const pattes = releaseBabyPattesFor('paille'), wallet = state().pattes;
    ui.select({kind: 'nurseryBaby', id: 'birth-7'});
    // « pattes » is shown with the coin icon, read as « pièces ».
    const release = releaseButton(); expect(release.textContent).toBe(`Confier · +${pattes} pièces`); expect(release.classList.contains('action-danger')).toBe(true);
    release.click(); expect(card().open).toBe(false);
    expect(gameDialog().open).toBe(true); expect(gameDialog().textContent).toContain(`Tu reçois ${pattes} pièces`);
    expect(state().pattes).toBe(wallet);
    button('Confirmer', gameDialog()).click();
    expect(state().pattes).toBe(wallet + pattes);
    expect(nurseryOf(state()).nursery!.babies.map(b => b.birth.id).sort()).toEqual(['birth-6', 'birth-8']);
  });
  it('cancelling the confirmation keeps the baby', () => {
    const {ui, state} = setup(game()); const before = encodeGame(state());
    ui.select({kind: 'nurseryBaby', id: 'birth-6'}); releaseButton().click(); button('Annuler', gameDialog()).click();
    expect(encodeGame(state())).toBe(before);
  });
  it('is never active for Benny', () => {
    const {ui} = setup(game('benny'));
    ui.select({kind: 'nurseryBaby', id: 'birth-6'});
    const release = releaseButton(); expect(release.disabled).toBe(true);
    expect(document.getElementById(release.getAttribute('aria-describedby')!)!.textContent).toBe(REFUSALS.BENNY_KEPT);
    expect(card().dataset.type).toBe('arc-en-ciel');
  });
});

describe('touch target of a ready baby', () => {
  const nursery = (babies: NurseryBaby[]): Building => { const s = createGame(0), b = nurseryOf(s); b.nursery = {capacity: 4, babies}; return b; };
  const baby = (slot: NurserySlot, readyAt: number): NurseryBaby => ({slot, birth: birth(`birth-${slot}`, 'paille'), startedAt: 0, readyAt});
  const center = {x: 100, y: 200};
  const at = (slot: NurserySlot, dx = 0, dy = 0) => ({x: center.x + slotPlacement(slot).baby.x + dx, y: center.y + slotPlacement(slot).baby.y + dy});
  it('finds the touched ready baby and not its neighbour', () => {
    const b = nursery([baby(0, 0), baby(1, 0), baby(2, 0), baby(3, 0)]);
    for (const slot of [0, 1, 2, 3] as const) expect(nurseryBabyHit(b, 10, center, at(slot), 1.6)).toBe(`birth-${slot}`);
  });
  it('ignores a growing baby and an empty cushion', () => {
    const b = nursery([baby(0, 100), baby(2, 0)]);
    expect(nurseryBabyHit(b, 10, center, at(0), 1.6)).toBeNull();
    expect(nurseryBabyHit(b, 10, center, at(1), 1.6)).toBeNull();
    expect(nurseryBabyHit(b, 100, center, at(0), 1.6)).toBe('birth-0');
  });
  it('stays at least 52 screen pixels wide when zoomed out', () => {
    const b = nursery([baby(0, 0)]), zoom = .3, reach = (BABY_TOUCH_RADIUS - 1) / zoom;
    expect(BABY_TOUCH_RADIUS * 2).toBeGreaterThanOrEqual(44);
    expect(nurseryBabyHit(b, 0, center, at(0, reach, 0), zoom)).toBe('birth-0');
    expect(nurseryBabyHit(b, 0, center, at(0, 0, -reach), zoom)).toBe('birth-0');
    expect(nurseryBabyHit(b, 0, center, at(0, (BABY_TOUCH_RADIUS + 2) / zoom, (BABY_TOUCH_RADIUS + 2) / zoom), zoom)).toBeNull();
  });
});
