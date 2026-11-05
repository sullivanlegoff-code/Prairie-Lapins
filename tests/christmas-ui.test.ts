// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {GameController} from '../src/application/GameController';
import {PreferenceStore} from '../src/ui/preferences';
import {REFUSALS} from '../src/ui/models';
import {createGame, encodeGame} from '../src/simulation';
import {emptyBuilding} from '../src/state/initial';
import {SAVE_KEY} from '../src/persistence/storage';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {buildingPlacementReason} from '../src/simulation/placement';
import {CHRISTMAS_EVENT} from '../src/config/christmas';
import {CHRISTMAS_BONUS_CANDIES, CHRISTMAS_CHALLENGES} from '../src/config/christmasEvent';
import {CHRISTMAS_DECORATION_IDS, DECORATIONS} from '../src/config/decorations';
import {christmasChallengesOf} from '../src/simulation/christmas';
import {christmasMarketFrame} from '../src/config/christmasMarketArt';
import {jumpIslandFrame} from '../src/config/jumpIslandArt';
import {ownedRegions} from '../src/display/recenter';
import {PARCEL_IDS, PARCELS} from '../src/config/land';
import {ISLAND} from '../src/config/islandGeometry';
import {cellsBounds, type WorldBounds} from '../src/ui/gestures';
import {screenBounds} from '../src/ui/projection';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
const event = CHRISTMAS_EVENT as {active: boolean};
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false;
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); event.active = true; });

function mount(s: GameState) {
  const values = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
  const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(),
    playPicnic: vi.fn(), playSnowman: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn(), focusBuilding: vi.fn(), fitAboveSheet: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('christmas-ui'); prefs.set({tutorial: false, muted: true});
  const ui = new GameUI(controller, scene, () => 0, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); });
  return {ui, controller, scene, state: () => controller.getSnapshot().state!};
}
const panel = () => document.getElementById('panel-content')!;
const buttonIn = (root: ParentNode, label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.replace(/\s+/g, ' ').trim() === label);
/** Level 5, the start enclosure (building-1) with Paille, and an empty enclosure (building-100). */
function game(): GameState {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(5), rewardedThroughLevel: 5};
  const free = () => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('No space'); };
  const c = free(); s.buildings.push(emptyBuilding('building-100', 'enclosure', c.x, c.y)); s.nextId = 101;
  return s;
}

describe('Christmas market view', () => {
  it('fills the screen like the shop, with its three tabs', () => {
    const s = game(); s.christmas = {candies: 12};
    const {ui} = mount(s); ui.open({kind: 'christmasMarket'});
    const gamePanel = document.getElementById('game-panel')!;
    expect(gamePanel.classList.contains('shop-fullscreen')).toBe(true); expect(gamePanel.classList.contains('christmas-market')).toBe(true);
    expect(gamePanel.classList.contains('center-card')).toBe(false);
    expect(document.querySelector<HTMLElement>('.shop-resources')!.textContent).toContain('12 sucres d’orge');
    const tabs = () => [...panel().querySelectorAll<HTMLButtonElement>('[data-christmas-tab]')];
    expect(tabs().map(t => t.textContent)).toEqual(['Missions de Noël', 'Récompenses spéciales', 'Récupérer les cadeaux']);
    // The missions open first.
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(panel().querySelector('[data-christmas-challenge="bonus"]')).not.toBeNull(); expect(panel().querySelector('[data-christmas-catalog]')).toBeNull();
    tabs()[1].click();
    expect(panel().querySelectorAll('[data-christmas-catalog]').length).toBe(CHRISTMAS_DECORATION_IDS.length); expect(panel().querySelector('[data-christmas-challenge]')).toBeNull();
    tabs()[2].click();
    expect(panel().querySelector('[data-sky-gifts-play]')).not.toBeNull(); expect(panel().querySelector('[data-christmas-catalog]')).toBeNull();
    ui.close();
    expect(gamePanel.classList.contains('christmas-market')).toBe(false); expect(document.body.classList.contains('shop-open')).toBe(false);
  });
  it('shows the candies balance and the 8 Christmas decorations with their price in sucres d’orge', () => {
    const s = game(); s.christmas = {candies: 45};
    const {ui} = mount(s); ui.open({kind: 'christmasMarket', tab: 'rewards'});
    expect(document.getElementById('panel-title')!.textContent).toBe('Marché de Noël');
    expect(panel().querySelector('[data-christmas-candies]')!.textContent).toContain('45 sucres d’orge');
    expect(panel().querySelector<HTMLImageElement>('.christmas-candies img')!.alt).toBe('Sucre d’orge');
    const cards = [...panel().querySelectorAll<HTMLElement>('[data-christmas-catalog]')];
    expect(cards.map(c => c.dataset.christmasCatalog)).toEqual([...CHRISTMAS_DECORATION_IDS]);
    for (const card of cards) {
      const d = DECORATIONS[card.dataset.christmasCatalog as typeof CHRISTMAS_DECORATION_IDS[number]];
      expect(card.textContent).toContain(d.name);
      const buy = buttonIn(card, `Acheter · ${d.candyPrice} sucres d’orge`)!;
      expect(buy).toBeDefined();
      // 45 sucres d'orge: only the cheaper ones can be bought.
      expect(buy.disabled).toBe(d.candyPrice! > 45);
      if (d.candyPrice! > 45) expect(card.textContent).toContain(REFUSALS.NOT_ENOUGH_CANDIES);
    }
  });
  it('buys a decoration for the inventory with sucres d’orge, then the sell button refuses it', () => {
    const s = game(); s.christmas = {candies: 100};
    const {ui, state} = mount(s); ui.open({kind: 'christmasMarket', tab: 'rewards'});
    buttonIn(panel().querySelector('[data-christmas-catalog="gift-pile"]')!, 'Acheter pour l’inventaire · 40 sucres d’orge')!.click();
    buttonIn(document.getElementById('confirmation-dialog') ?? document, 'Confirmer')!.click();
    expect(state().christmas!.candies).toBe(60);
    const owned = state().decorations.find(d => d.catalogId === 'gift-pile')!;
    expect(owned).toMatchObject({paidCandies: 40, location: {kind: 'inventory'}});
    expect(document.getElementById('toast')!.textContent).toContain('pose-la depuis Aménager');
    ui.open({kind: 'decoration', id: owned.id}, 'root');
    const sell = [...panel().querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.startsWith('Vendre'))!;
    expect(sell.disabled).toBe(true);
    expect(panel().textContent).toContain('Décoration de Noël : elle reste à toi.');
  });
  it('buys and places a decoration through the placement preview, paid in sucres d’orge', () => {
    const s = game(); s.christmas = {candies: 100};
    const {ui, state} = mount(s); ui.open({kind: 'christmasMarket', tab: 'rewards'});
    buttonIn(panel().querySelector('[data-christmas-catalog="candy-cane"]')!, 'Acheter · 30 sucres d’orge')!.click();
    expect(document.getElementById('panel-title')!.textContent).toBe('Placer : Sucre d’orge géant');
    // A free fine cell on the start island.
    let placed = false;
    for (let y = 32; y < 48 && !placed; y++) for (let x = 0; x < 16 && !placed; x++) {
      ui.select({kind: 'fineCell', x, y});
      const confirm = buttonIn(panel(), 'Acheter et placer · 30 sucres d’orge')!;
      if (!confirm.disabled) { confirm.click(); placed = true; }
    }
    expect(placed).toBe(true);
    expect(state().christmas!.candies).toBe(70);
    expect(state().decorations.find(d => d.catalogId === 'candy-cane')!.location.kind).toBe('outside');
  });
  it('claims the Christmas challenges and their bonus from the market, and counts them in the Missions badge', () => {
    const s = game(), picked = christmasChallengesOf(s);
    s.christmas = {candies: 0, cycle: s.missions.daily.cycleIndex, picked, progress: Object.fromEntries(picked.map(id => [id, CHRISTMAS_CHALLENGES[id].target])), claimed: []};
    const {ui, state} = mount(s); ui.open({kind: 'christmasMarket'});
    const badge = document.getElementById('missions-badge')!;
    expect(Number(badge.textContent)).toBeGreaterThanOrEqual(picked.length);
    let expected = 0;
    for (const id of picked) {
      const card = panel().querySelector<HTMLElement>(`[data-christmas-challenge="${id}"]`)!, target = CHRISTMAS_CHALLENGES[id].target;
      expect(card.textContent).toContain(`Progression : ${target} / ${target}`);
      expected += CHRISTMAS_CHALLENGES[id].candies;
      buttonIn(card, `Réclamer · +${CHRISTMAS_CHALLENGES[id].candies} sucre${CHRISTMAS_CHALLENGES[id].candies > 1 ? 's' : ''} d’orge`)!.click();
      expect(state().christmas!.candies).toBe(expected);
    }
    const bonus = panel().querySelector<HTMLElement>('[data-christmas-challenge="bonus"]')!;
    expect(bonus.textContent).toContain(`Bonus des trois défis : +${CHRISTMAS_BONUS_CANDIES} sucres d’orge`);
    buttonIn(bonus, `Réclamer · +${CHRISTMAS_BONUS_CANDIES} sucres d’orge`)!.click();
    expect(state().christmas!.candies).toBe(expected + CHRISTMAS_BONUS_CANDIES);
    expect(buttonIn(panel().querySelector('[data-christmas-challenge="bonus"]')!, 'Bonus réclamé')!.disabled).toBe(true);
  });
  it('opens « Les cadeaux du ciel » with one chosen rabbit and shows today’s rewarded games', () => {
    const {ui} = mount(game()); ui.open({kind: 'christmasMarket', tab: 'gifts'});
    expect(panel().textContent).toContain('Parties récompensées : 0/3');
    expect(panel().textContent).toContain('laisse tomber les cadeaux empoisonnés et les bombes');
    panel().querySelector<HTMLButtonElement>('[data-sky-gifts-play]')!.click();
    const choice = panel().querySelector<HTMLElement>('[data-sky-gifts-rabbit="rabbit-2"]')!;
    buttonIn(choice, 'Choisir')!.click();
    expect(document.querySelector<HTMLElement>('.sky-gifts-activity')!.hidden).toBe(false);
  });
  it('closes when the event is off', () => {
    const {ui} = mount(game()); ui.open({kind: 'christmasMarket'});
    expect(document.getElementById('game-panel')!.hidden).toBe(false);
    event.active = false; ui.open({kind: 'christmasMarket'}, 'root');
    expect(document.getElementById('game-panel')!.hidden).toBe(true);
  });
});

describe('Snowman button in the enclosure sheet', () => {
  it('is shown only during the event, refuses an empty enclosure and builds today’s snowman', () => {
    const {ui, state, scene} = mount(game());
    ui.open({kind: 'building', id: 'building-100'}, 'root');
    const empty = panel().querySelector<HTMLElement>('[data-snowman="building-100"]')!;
    expect(buttonIn(empty, 'Faire un bonhomme de neige')!.disabled).toBe(true);
    expect(empty.textContent).toContain(REFUSALS.EMPTY_ENCLOSURE);
    ui.open({kind: 'building', id: 'building-1'}, 'root');
    buttonIn(panel().querySelector('[data-snowman="building-1"]')!, 'Faire un bonhomme de neige')!.click();
    expect(state().christmas!.snowman).toMatchObject({enclosureId: 'building-1'});
    expect(scene.playSnowman).toHaveBeenCalledWith('building-1');
    ui.open({kind: 'building', id: 'building-1'}, 'root');
    expect(panel().querySelector('[data-snowman="building-1"]')!.textContent).toContain(REFUSALS.SNOWMAN_TODAY);
    event.active = false; ui.open({kind: 'building', id: 'building-100'}, 'root');
    expect(panel().querySelector('[data-snowman]')).toBeNull();
    expect(panel().querySelector('[data-picnic]')).not.toBeNull();
  });
});

describe('Christmas market islet frame', () => {
  const overlap = (a: WorldBounds, b: WorldBounds) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  it('floats west of the island, apart from the jump-rope islet and every parcel', () => {
    // Beside the start island; above the jump-rope islet when the player owns it.
    expect(overlap(christmasMarketFrame(true), jumpIslandFrame())).toBe(false);
    const start = screenBounds(cellsBounds(PARCELS.southwest.x, PARCELS.southwest.y, PARCELS.southwest.x + ISLAND.parcelCells, PARCELS.southwest.y + ISLAND.parcelCells));
    for (const market of [christmasMarketFrame(), christmasMarketFrame(true)]) {
      for (const region of ownedRegions([...PARCEL_IDS])) expect(overlap(market, region)).toBe(false);
      for (const id of PARCEL_IDS) {
        const p = PARCELS[id];
        expect(overlap(market, screenBounds(cellsBounds(p.x, p.y, p.x + ISLAND.parcelCells, p.y + ISLAND.parcelCells)))).toBe(false);
      }
      expect(market.right).toBeLessThan(start.left);
    }
  });
});

describe('Laboratory sucres d’orge', () => {
  it('adds 50 sucres d’orge to the laboratory save only', async () => {
    const {developmentEnvironment} = await import('../src/dev/tools');
    const data = new Map<string, string>([[SAVE_KEY, encodeGame(game())]]);
    const base = {getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }};
    const normal = new GameController(base, () => 0), dev = developmentEnvironment(base), lab = new GameController(dev.storage, () => 0);
    cleanups.push(() => { normal.dispose(); lab.dispose(); });
    expect(dev.grantCandies(normal, 50)).toMatchObject({ok: false, reason: 'NOT_TEST_SESSION'});
    expect(dev.grantCandies(lab, 50).ok).toBe(true);
    expect(lab.getSnapshot().state!.christmas!.candies).toBe(50);
    expect(normal.getSnapshot().state!.christmas).toBeUndefined();
  });
});

describe('« Les cadeaux du ciel » traps on screen', () => {
  it('shows a poisoned present taking 3 presents away, then a bomb ending the game with its blast', async () => {
    const {mountSkyGiftsActivity} = await import('../src/ui/SkyGiftsActivity');
    const {SKY_GIFTS_GAME} = await import('../src/simulation/skyGiftsGame');
    let now = 0; const finished: number[] = [];
    const host = document.createElement('div'); document.body.append(host);
    const activity = mountSkyGiftsActivity(host, {onFinished: (_r, caught) => { finished.push(caught); return ''; }, clock: () => now, frame: () => 0});
    cleanups.push(() => { activity.dispose(); host.remove(); });
    activity.open({id: 'rabbit-1', species: 'paille'});
    activity.element.querySelector<HTMLButtonElement>('[data-sky-gifts-start]')!.click();
    const g = activity.game!, drop = (id: number, kind: 'poison' | 'bomb') => g.gifts.push({id, x: g.basketX, y: SKY_GIFTS_GAME.catchTop - .001, speed: .5, sway: 0, colour: 0, kind});
    g.caught = 5; drop(900, 'poison'); now += 32; activity.update();
    expect(g.caught).toBe(5 - SKY_GIFTS_GAME.poisonGifts);
    expect(activity.element.querySelector('.sky-gifts-pop')!.textContent).toBe(`Beurk ! −${SKY_GIFTS_GAME.poisonGifts} cadeaux`);
    expect(activity.element.querySelector('.sky-gifts-blast[data-kind="poison"]')).not.toBeNull();
    expect(activity.playing).toBe(true);
    drop(901, 'bomb'); now += 32; activity.update();
    expect(activity.playing).toBe(false); expect(finished).toEqual([2]);
    expect(activity.element.classList.contains('exploded')).toBe(true);
    expect(activity.element.querySelector('.sky-gifts-blast[data-kind="bomb"]')).not.toBeNull();
    expect(activity.element.querySelector('[data-sky-gifts-card]')!.textContent).toContain('Boum ! Une bombe dans la hotte a arrêté la partie.');
  });
});
