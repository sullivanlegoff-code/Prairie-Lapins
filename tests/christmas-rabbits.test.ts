// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {act, createGame, encodeGame} from '../src/simulation';
import {SPECIES, SPECIES_IDS} from '../src/config/species';
import {CHRISTMAS_EVENT} from '../src/config/christmas';
import {CHRISTMAS_RABBIT_CANDY_PRICE} from '../src/config/christmasEvent';
import {CHRISTMAS_RABBIT_IDS, christmasRabbitReason} from '../src/simulation/christmas';
import {breedingOdds, breedingPool, seasonAllows} from '../src/simulation/breeding';
import {recipePrice} from '../src/simulation/recipes';
import {catalogueMainMissionIds} from '../src/simulation/missions';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {SAVE_KEY} from '../src/persistence/storage';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const event = CHRISTMAS_EVENT as {active: boolean};
const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false; document.getElementById('loading-screen')!.hidden = true;
  localStorage.clear(); vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.unstubAllGlobals(); event.active = true; });

/** Level 14: every Epic and Legendary may be born. */
function game(): GameState {
  const s = createGame(0); s.progression = {totalXp: cumulativeLevelXp(14), rewardedThroughLevel: 14};
  return s;
}

describe('the Christmas rabbits (owner, 5 November 2026)', () => {
  it('are Yetiti, Rennes, Susucre, Pain d’épice and Flocon de cristal, five Epics of the Christmas event', () => {
    expect(CHRISTMAS_RABBIT_IDS).toEqual(['yetiti', 'rennes', 'susucre', 'pain-epice', 'flocon-cristal']);
    expect(SPECIES_IDS.filter(id => SPECIES[id].event)).toEqual(['yetiti', 'rennes', 'susucre', 'pain-epice', 'flocon-cristal']);
    for (const id of CHRISTMAS_RABBIT_IDS) expect(SPECIES[id].rarity).toBe('epic');
    expect([SPECIES.yetiti.types, SPECIES.rennes.types, SPECIES.susucre.types, SPECIES['pain-epice'].types, SPECIES['flocon-cristal'].types]).toEqual([['neige', 'paille'], ['vol', 'metal'], ['paille', 'feu'], ['feu', 'paille'], ['neige', 'vol']]);
  });

  it('are born by normal breeding during the event only, and their recipe is sold only then', () => {
    const s = game();
    expect(breedingOdds('paille', 'neige', 6, 6)).toMatchObject({yetiti: 10});
    expect(breedingPool(s, 'paille', 'neige', 6, 6).weights.yetiti).toBeGreaterThan(0);
    expect(recipePrice('yetiti')).toBe(450);
    event.active = false;
    for (const id of CHRISTMAS_RABBIT_IDS) { expect(seasonAllows(id)).toBe(false); expect(recipePrice(id)).toBeNull(); }
    expect(Object.keys(breedingPool(s, 'paille', 'neige', 6, 6).weights)).toEqual(['frisket', 'icy', 'orange']);
    expect(breedingPool(s, 'paille', 'neige', 6, 6).excluded.map(e => e.species)).not.toContain('yetiti');
    // The other new rabbits are not seasonal.
    for (const id of ['vantablack', 'gigi-rarafe', 'arkoko', 'lapin-de-sulli', 'fantome', 'bouyoyo', 'nuage', 'champignon'] as const) { expect(seasonAllows(id)).toBe(true); }
    expect(recipePrice('gigi-rarafe')).toBe(450);
  });

  it('hide their discovery goal outside the event, unless already discovered', () => {
    const s = game();
    expect(catalogueMainMissionIds(s)).toContain('discover-yetiti');
    event.active = false;
    expect(catalogueMainMissionIds(s)).not.toContain('discover-yetiti');
    expect(catalogueMainMissionIds(s)).toContain('discover-gigi-rarafe');
    s.discovered.push('yetiti');
    expect(catalogueMainMissionIds(s)).toContain('discover-yetiti');
  });

  it('can be bought at the market for sucres d’orge, during the event only', () => {
    const s = game(); s.christmas = {candies: CHRISTMAS_RABBIT_CANDY_PRICE - 1};
    const home = s.rabbits[0].enclosureId;
    expect(christmasRabbitReason(s, 'yetiti')).toBe('NOT_ENOUGH_CANDIES');
    expect(act(s, {type: 'buyChristmasRabbit', species: 'yetiti', enclosureId: home}, 0)).toMatchObject({ok: false, reason: 'NOT_ENOUGH_CANDIES'});
    s.christmas = {candies: CHRISTMAS_RABBIT_CANDY_PRICE + 5};
    expect(act(s, {type: 'buyChristmasRabbit', species: 'paille', enclosureId: home}, 0)).toMatchObject({ok: false, reason: 'INVALID_CHOICE'});
    const bought = act(s, {type: 'buyChristmasRabbit', species: 'yetiti', enclosureId: home}, 0);
    expect(bought.ok).toBe(true);
    expect(bought.state.christmas!.candies).toBe(5);
    expect(bought.state.pattes).toBe(s.pattes);
    expect(bought.state.rabbits.at(-1)).toMatchObject({species: 'yetiti', affection: 1, enclosureId: home});
    expect(bought.state.discovered).toContain('yetiti');
    event.active = false;
    expect(act(s, {type: 'buyChristmasRabbit', species: 'yetiti', enclosureId: home}, 0)).toMatchObject({ok: false, reason: 'EVENT_OVER'});
  });
});

describe('Arkoko, the owner’s rainbow Legendary', () => {
  it('is born of Câlinou géant × Orange, in either order, with a Legendary’s fixed chance', () => {
    expect(SPECIES.arkoko).toMatchObject({rarity: 'legendary', types: ['arc-en-ciel'], recipe: {parents: ['calinou', 'orange'], minAffection: 10, probability: 10}});
    expect(breedingOdds('calinou', 'orange', 10, 10).arkoko).toBe(11.5);
    expect(breedingOdds('orange', 'calinou', 10, 10).arkoko).toBe(11.5);
    expect(breedingOdds('calinou', 'orange', 9, 10).arkoko).toBeUndefined();
    expect(breedingOdds('calinou', 'calinou', 10, 10).arkoko).toBeUndefined();
  });
});

describe('the market’s Christmas rabbits', () => {
  function mount(s: GameState) {
    const values = new Map([[SAVE_KEY, encodeGame(s)]]);
    const controller = new GameController({getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }}, () => 0);
    const scene = {setRabbitPurchase: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(),
      recenter: vi.fn(), focusBuilding: vi.fn(), fitAboveSheet: vi.fn()} as unknown as MeadowScene;
    const prefs = new PreferenceStore('christmas-rabbits'); prefs.set({tutorial: false, muted: true});
    const ui = new GameUI(controller, scene, () => 0, prefs); cleanups.push(() => { ui.dispose(); controller.dispose(); });
    return {ui, state: () => controller.getSnapshot().state!};
  }
  const panel = () => document.getElementById('panel-content')!;
  const buttonIn = (root: ParentNode, start: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.replace(/\s+/g, ' ').trim().startsWith(start));

  it('lists the five, refuses them without enough sucres d’orge, and welcomes one in a chosen habitat', () => {
    const s = game(); s.christmas = {candies: CHRISTMAS_RABBIT_CANDY_PRICE + 50};
    const {ui, state} = mount(s); ui.open({kind: 'christmasMarket', tab: 'rewards'});
    expect([...panel().querySelectorAll<HTMLElement>('[data-christmas-rabbit]')].map(c => c.dataset.christmasRabbit)).toEqual(['yetiti', 'rennes', 'susucre', 'pain-epice', 'flocon-cristal']);
    const card = panel().querySelector('[data-christmas-rabbit="yetiti"]')!;
    expect(card.textContent).toContain('Épique');
    buttonIn(card, 'Adopter')!.click();
    expect(document.getElementById('panel-title')!.textContent).toBe('Acheter : Yetiti');
    panel().querySelector<HTMLButtonElement>('button[aria-pressed]')!.click(); // The first compatible habitat with room.
    buttonIn(panel(), 'Confirmer l’achat')!.click();
    expect(state().rabbits.filter(r => r.species === 'yetiti')).toHaveLength(1);
    expect(state().christmas!.candies).toBe(50);
  });

  it('shows the price refusal when the sucres d’orge are missing', () => {
    const s = game(); s.christmas = {candies: 10};
    const {ui} = mount(s); ui.open({kind: 'christmasMarket', tab: 'rewards'});
    expect(buttonIn(panel().querySelector('[data-christmas-rabbit="rennes"]')!, 'Adopter')!.disabled).toBe(true);
  });
});
