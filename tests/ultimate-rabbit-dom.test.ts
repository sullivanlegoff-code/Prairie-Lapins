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
afterEach(() => { cleanup.splice(0).forEach(fn => fn()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(affection: number, customize: (s: GameState) => void = () => {}) {
  const s: GameState = createGame(0); s.rabbits.push({id: 'rabbit-3', species: 'paille', affection, enclosureId: 'building-1'});
  customize(s);
  const data = new Map([[SAVE_KEY, encodeGame(s)]]);
  const controller = new GameController({getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }}, () => 0);
  const prefs = new PreferenceStore('test-ultimate-rabbit'); prefs.set({tutorial: false});
  const ui = new GameUI(controller, {setRabbitPurchase: vi.fn(), setPlacement: vi.fn(), setDecorationSelection: vi.fn(), setPhoto: vi.fn(), setArrangement: vi.fn(), setExpansion: vi.fn(), setDecorationGhost: vi.fn(), setDecorationPlacement: vi.fn(), recenter: vi.fn(), reactToFeed: vi.fn()} as unknown as MeadowScene, () => 0, prefs);
  cleanup.push(() => { ui.dispose(); controller.dispose(); });
  ui.open({kind: 'rabbit', id: 'rabbit-3'});
  return {ui, controller};
}
const gamePanel = () => document.getElementById('game-panel')!;
const content = () => document.getElementById('panel-content')!;
const buttons = () => [...content().querySelectorAll<HTMLButtonElement>('button')].map(b => b.textContent);
const crownButton = () => content().querySelector<HTMLButtonElement>('button[data-focus="crown"]');

describe('the card of a lapin ultime', () => {
  it('wears the golden frame, the « Lapin ultime » title, the crowned portrait and the crown button at 50', () => {
    setup(50);
    expect(gamePanel().hasAttribute('data-ultimate')).toBe(true);
    expect(gamePanel().style.getPropertyValue('--ultimate-frame')).toContain('assets/ui/ultimate/cadre.webp');
    const frame = gamePanel().querySelector(':scope > .ultimate-frame')!;
    expect(frame.getAttribute('aria-hidden')).toBe('true');
    expect(frame.querySelector('img.ultimate-frame-crown')!.getAttribute('src')).toContain('assets/ui/ultimate/couronne-cadre.webp');
    expect(content().querySelector('[data-ultimate-title]')!.textContent).toBe('Lapin ultime');
    const portrait = content().querySelector('.rabbit-overview .portrait.large')!;
    expect(portrait.hasAttribute('data-crowned')).toBe(true);
    expect(portrait.querySelector('.ultimate-figure img.ultimate-crown')!.getAttribute('src')).toContain('assets/effects/couronne.png');
    expect(crownButton()!.textContent).toBe('Enlever la couronne');
    // The rest of the card is unchanged and usable.
    expect(buttons()).toEqual(expect.arrayContaining(['Affection maximale', 'Déplacer']));
  });
  it('takes the crown off and puts it back from the card', () => {
    const {controller} = setup(50);
    let clock = 10_000; vi.spyOn(performance, 'now').mockImplementation(() => clock); // Past the double-tap guard between the two taps.
    crownButton()!.click();
    expect(controller.getSnapshot().state!.rabbits.find(r => r.id === 'rabbit-3')!.crownHidden).toBe(true);
    expect(crownButton()!.textContent).toBe('Mettre la couronne');
    expect(content().querySelector('.ultimate-crown')).toBeNull();
    expect(gamePanel().hasAttribute('data-ultimate')).toBe(true); // Still an ultimate card without its crown.
    clock += 1000; crownButton()!.click();
    expect(controller.getSnapshot().state!.rabbits.find(r => r.id === 'rabbit-3')!.crownHidden).toBeUndefined();
    expect(crownButton()!.textContent).toBe('Enlever la couronne');
    expect(content().querySelector('.ultimate-crown')).not.toBeNull();
  });
  it('leaves the card of a rabbit at 49 as it was', () => {
    setup(49);
    expect(gamePanel().hasAttribute('data-ultimate')).toBe(false);
    expect(gamePanel().querySelector('.ultimate-frame')).toBeNull();
    expect(content().querySelector('[data-ultimate-title], [data-crowned], .ultimate-crown')).toBeNull();
    expect(crownButton()).toBeNull();
  });
  it('removes the golden frame when another card opens', () => {
    const {ui} = setup(50);
    ui.open({kind: 'rabbit', id: 'rabbit-2'});
    expect(gamePanel().hasAttribute('data-ultimate')).toBe(false);
    expect(gamePanel().querySelector('.ultimate-frame')).toBeNull();
    expect(gamePanel().style.getPropertyValue('--ultimate-frame')).toBe('');
  });
});
