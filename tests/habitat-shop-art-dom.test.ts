// @vitest-environment happy-dom
import html from '../index.html?raw';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GameController} from '../src/application/GameController';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {habitatThumbnail} from '../src/ui/habitatThumbnails';
import {HABITATS, habitatLevel, habitatPrice} from '../src/config/habitats';
import {HABITAT_LEVEL1_ART} from '../src/config/habitatArt';
import {establishHistoricalLevelRights} from '../src/simulation/levelRights';
import {cumulativeLevelXp} from '../src/simulation/progression';
import {createGame as soloStart, encodeGame} from '../src/simulation';
import {SAVE_KEY, type SaveStorage} from '../src/persistence/storage';
import {regressionStart as createGame} from './regression-start';
import type {GameState} from '../src/state/types';
import type {MeadowScene} from '../src/display/MeadowScene';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('loading-screen')!.hidden = true; localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(initial: GameState) {
  establishHistoricalLevelRights(initial);
  const data = new Map<string, string>([[SAVE_KEY, encodeGame(initial)]]);
  const storage: SaveStorage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }};
  const controller = new GameController(storage, () => 0, () => .65);
  const scene = {setRabbitPurchase: vi.fn(), overview: vi.fn(), focusDecoration: vi.fn(), setExpansion: vi.fn(), setPlacement: vi.fn(), setArrangement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), reactToFeed: vi.fn(), recenter: vi.fn()} as unknown as MeadowScene;
  const prefs = new PreferenceStore('test-habitat-art'); prefs.set({muted: true, tutorial: false});
  const ui = new GameUI(controller, scene, () => 0, prefs);
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  return {controller, ui};
}
const SIX = ['universal', 'paille', 'neige', 'feu', 'metal', 'vol'] as const;
const cards = () => [...document.querySelectorAll<HTMLElement>('#panel-content article.card')].filter(card => card.querySelector('.habitat-thumb'));

describe('the shop thumbnails are made once and shared', () => {
  it('builds one image per type, then only clones it, whatever the number of shop refreshes', () => {
    const create = vi.spyOn(document, 'createElement');
    const first = habitatThumbnail('feu'), second = habitatThumbnail('feu');
    expect(create.mock.calls.filter(([tag]) => tag === 'img')).toHaveLength(1);
    expect(first).not.toBe(second); expect(first.src).toBe(second.src); expect(first.src).toContain('/assets/habitats/habitat-feu-level1.png');
    expect([first.width, second.width, first.height]).toEqual([HABITAT_LEVEL1_ART.feu.width, HABITAT_LEVEL1_ART.feu.width, HABITAT_LEVEL1_ART.feu.height]);
    expect(first.alt).toBe(''); expect(first.dataset.habitatArt).toBe('feu'); expect(first.getAttribute('draggable')).toBe('false');
  });
});

describe('the habitat shop', () => {
  it('shows the real level-1 illustration of every habitat on its card, whole, from the file the scene draws, with no rabbit and no generated drawing', () => {
    const {ui} = setup(createGame(0)); document.getElementById('open-shop')!.click(); ui.open({kind: 'shop', tab: 'habitats'});
    const shown = cards(); expect(shown.map(card => card.querySelector('.habitat-thumb')!.getAttribute('data-habitat-art'))).toEqual([...SIX]);
    for (const [index, type] of SIX.entries()) {
      const card = shown[index], image = card.querySelector<HTMLImageElement>('.habitat-thumb')!;
      expect(card.querySelector('h3')!.textContent).toBe(HABITATS[type].name);
      expect(image.getAttribute('src')).toBe(HABITAT_LEVEL1_ART[type].url);
      expect(card.firstElementChild).toBe(image); expect(card.querySelectorAll('.habitat-thumb')).toHaveLength(1); expect(card.querySelector('canvas, [data-rabbit-art]')).toBeNull();
      expect([image.width, image.height]).toEqual([HABITAT_LEVEL1_ART[type].width, HABITAT_LEVEL1_ART[type].height]);
    }
  });
  it('keeps prices, locks and the purchase action of every card', () => {
    const locked = setup(soloStart(0)); locked.ui.open({kind: 'shop', tab: 'habitats'});
    for (const [index, type] of SIX.entries()) {
      const card = cards()[index], price = type === 'universal' ? habitatPrice('universal') : habitatLevel(type, 1).cost;
      expect(card.textContent, type).toContain(`Placer · ${price}`);
      expect(card.querySelectorAll('button').length, type).toBeGreaterThanOrEqual(1);
    }
    // A new game has not reached every level: some cards are locked and say so, the others can be placed.
    expect(cards().some(card => /Niveau \d+ requis/.test(card.textContent ?? ''))).toBe(true);
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    const rich = createGame(0); rich.pattes = 50_000; rich.progression = {totalXp: cumulativeLevelXp(14), rewardedThroughLevel: 14};
    const open = setup(rich); open.ui.open({kind: 'shop', tab: 'habitats'});
    for (const [index, type] of SIX.entries()) {
      const place = [...cards()[index].querySelectorAll('button')].find(button => /^Placer · /.test(button.textContent ?? ''))!;
      expect(place, type).toBeDefined(); expect((place as HTMLButtonElement).disabled, type).toBe(false);
    }
    cards()[3].querySelector<HTMLButtonElement>('button')!.click();
  });
  it('still lists only the compatible habitats of a species, each with its illustration', () => {
    const {ui} = setup(createGame(0)); (ui as unknown as {compatibleHabitats(species: string): void}).compatibleHabitats('neige');
    const shown = cards().map(card => card.querySelector('.habitat-thumb')!.getAttribute('data-habitat-art'));
    expect(shown.length).toBeGreaterThanOrEqual(1); for (const type of shown) expect(SIX).toContain(type);
    expect(shown).not.toContain('feu'); expect(shown).not.toContain('vol');
  });
});
