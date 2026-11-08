// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {UpdateNews} from '../src/ui/updateNews';
import {GameController} from '../src/application/GameController';
import type {MeadowScene} from '../src/display/MeadowScene';
import {previousStart} from './regression-start';
import {encodeGame} from '../src/persistence/json';
import {SAVE_KEY} from '../src/persistence/storage';
import {NEWS_PAGES, NEW_SPECIES, NEWS_SPECIES_COUNT_BEFORE, UPDATE_NEWS_ID} from '../src/config/updateNews';
import {SPECIES} from '../src/config/balance';
import {EVOLVED_ART} from '../src/config/evolvedArt';
import {CHRISTMAS_EVENT} from '../src/config/christmas';

/** Owner (8 November 2026): a page of the update's news that welcomes the player once, then opens with a button under the settings while the Christmas event lasts. */
const cleanups: (() => void)[] = [];
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false;
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.restoreAllMocks(); vi.unstubAllGlobals(); (CHRISTMAS_EVENT as {active: boolean}).active = true; });

function news(busy = false) {
  const prefs = new PreferenceStore('test-news'); let guided = busy;
  const page = new UpdateNews(prefs, () => guided);
  cleanups.push(() => page.dispose());
  return {prefs, page, dialog: page.dialog, release: () => { guided = false; }};
}
const next = (d: HTMLDialogElement) => d.querySelector<HTMLButtonElement>('.un-next')!;

describe('the news page', () => {
  it('welcomes the player once per device, then stays closed at the next starts', () => {
    const first = news();
    first.page.request();
    expect(first.dialog.open).toBe(true);
    expect(first.prefs.value.newsSeen).toBe(UPDATE_NEWS_ID);
    first.page.close(); first.page.dispose();
    const again = news(); again.page.request();
    expect(again.dialog.open).toBe(false);
  });

  it('waits for Paille’s guided start and for any other open window', () => {
    const {page, dialog, release} = news(true);
    const other = document.createElement('dialog'); document.body.append(other); other.showModal();
    page.request(); expect(dialog.open).toBe(false);
    release(); page.flush(); expect(dialog.open).toBe(false);
    other.close(); page.flush(); expect(dialog.open).toBe(true);
  });

  it('opens nothing by itself once the Christmas event is over', () => {
    (CHRISTMAS_EVENT as {active: boolean}).active = false;
    const {page, dialog} = news(); page.request();
    expect(dialog.open).toBe(false);
    expect(page.available).toBe(false);
  });

  it('shows three posters to swipe through, « Suivant » then « C’est parti ! » to close', () => {
    const {page, dialog} = news(); page.open();
    expect(dialog.querySelectorAll('.un-slide')).toHaveLength(3);
    expect([...dialog.querySelectorAll('.un-card h2')].map(h => h.textContent)).toEqual(NEWS_PAGES.map(p => p.title));
    expect(next(dialog).textContent).toBe('Suivant');
    next(dialog).click(); next(dialog).click();
    expect(next(dialog).textContent).toBe('C’est parti !');
    expect(dialog.querySelectorAll('.un-dots .is-current')).toHaveLength(1);
    expect(dialog.querySelectorAll('.un-dots button')[2].classList.contains('is-current')).toBe(true);
    next(dialog).click();
    expect(dialog.open).toBe(false);
  });

  it('closes with its cross and with Escape', () => {
    const {page, dialog} = news(); page.open();
    dialog.querySelector<HTMLButtonElement>('.un-close')!.click(); expect(dialog.open).toBe(false);
    page.open(); dialog.dispatchEvent(new Event('cancel', {cancelable: true})); expect(dialog.open).toBe(false);
  });
});

describe('the button under the settings', () => {
  function game() {
    const state = previousStart(0); delete state.initiation;
    localStorage.setItem(SAVE_KEY, encodeGame(state));
    const storage = {scope: 'normal' as const, getItem: (k: string) => localStorage.getItem(k), setItem: (k: string, v: string) => localStorage.setItem(k, v)};
    const controller = new GameController(storage, () => 0);
    const scene = new Proxy({}, {get: () => vi.fn()}) as MeadowScene;
    const prefs = new PreferenceStore('test-news-game'); prefs.set({muted: true, tutorial: false});
    const ui = new GameUI(controller, scene, () => 0, prefs, undefined, {onlineServicesAllowed: false});
    cleanups.push(() => { ui.dispose(); controller.dispose(); });
    return {ui, prefs};
  }
  const newsDialog = () => document.querySelector<HTMLDialogElement>('dialog.update-news')!;

  it('sits right after the settings and opens the page while Christmas lasts', () => {
    const {prefs} = game();
    const button = document.getElementById('open-news') as HTMLButtonElement;
    expect(button.previousElementSibling?.id).toBe('open-settings');
    expect(button.hidden).toBe(false);
    expect(newsDialog().open).toBe(false); // Never by itself inside the interface: main.ts asks once at the start.
    button.click();
    expect(newsDialog().open).toBe(true);
    expect(prefs.value.newsSeen).toBe(UPDATE_NEWS_ID);
  });

  it('opens by itself at the start of a game that has not seen it', () => {
    const {ui} = game();
    ui.welcomeNews();
    expect(newsDialog().open).toBe(true);
  });
});

describe('the words of the news', () => {
  const words = NEWS_PAGES.flatMap(p => [p.title, ...p.lines]).join(' ');
  it('lists the species of the update that really exist, and the 36 of the published game', () => {
    for (const id of NEW_SPECIES) expect(SPECIES[id], id).toBeDefined();
    expect(NEWS_SPECIES_COUNT_BEFORE).toBe(36);
    expect(NEWS_PAGES[1].title).toBe(`${NEW_SPECIES.length} nouveaux lapins`);
  });
  it('keeps evolutions a surprise and talks to the player with « tu »', () => {
    for (const evolved of EVOLVED_ART) expect(words).not.toContain(evolved.name);
    expect(words).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
    expect(words).not.toMatch(/herbe/i);
  });
  it('points each poster to its painted picture', () => {
    expect(NEWS_PAGES.map(p => p.poster.split('/').pop())).toEqual(['affiche-1.webp', 'affiche-2.webp', 'affiche-3.webp']);
    const painted = Object.keys(import.meta.glob('../public/assets/news/noel-2026/*.webp')).map(path => path.split('/').pop());
    expect(painted.sort()).toEqual(['affiche-1.webp', 'affiche-2.webp', 'affiche-3.webp']);
  });
});
