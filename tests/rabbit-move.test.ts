// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../index.html?raw';
import {GameUI} from '../src/ui/GameUI';
import {PreferenceStore} from '../src/ui/preferences';
import {GameController} from '../src/application/GameController';
import type {MeadowScene} from '../src/display/MeadowScene';
import type {GameState} from '../src/state/types';
import {previousStart} from './regression-start';
import {encodeGame} from '../src/persistence/json';
import {SAVE_KEY} from '../src/persistence/storage';
import {rabbitDropTargets} from '../src/ui/rabbitDropTargets';
import {buildingPlacementReason} from '../src/simulation/placement';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.getElementById('app')!.inert = false;
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanups.splice(0).reverse().forEach(f => f()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

/** The neige rabbit lives in the universal home; a snow garden has room, a fire glade does not accept it. */
function game(): GameState {
  const s = previousStart(0); delete s.initiation;
  const home = s.buildings[0]; s.nextId = Math.max(s.nextId, 10);
  for (const [id, type] of [['building-8', 'neige'], ['building-9', 'feu']] as const) {
    const building = {...structuredClone(home), id, habitat: {...home.habitat!, type}, incomeUnits: 0};
    const spot = (() => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (!buildingPlacementReason(s, x, y)) return {x, y}; throw Error('no room'); })();
    s.buildings.push({...building, ...spot});
  }
  return s;
}
function setup() {
  localStorage.setItem(SAVE_KEY, encodeGame(game()));
  const storage = {scope: 'normal' as const, getItem: (k: string) => localStorage.getItem(k), setItem: (k: string, v: string) => localStorage.setItem(k, v)};
  const controller = new GameController(storage, () => 0);
  const calls = new Map<PropertyKey, ReturnType<typeof vi.fn>>();
  const scene = new Proxy({}, {get: (_, key) => { if (!calls.has(key)) calls.set(key, vi.fn()); return calls.get(key); }}) as MeadowScene;
  const prefs = new PreferenceStore('test-move'); prefs.set({muted: true, tutorial: false});
  const ui = new GameUI(controller, scene, () => 0, prefs);
  cleanups.push(() => { ui.dispose(); controller.dispose(); });
  return {ui, controller, scene: calls};
}
const banner = () => document.getElementById('rabbit-move-banner')!;
const panelButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(b => b.textContent === label)!;
const bannerButton = (label: string) => [...banner().querySelectorAll('button')].find(b => b.textContent === label)!;

describe('rabbit drop targets', () => {
  it('lists compatible homes with room, never the current, a full or an incompatible one', () => {
    const s = game();
    expect(rabbitDropTargets(s, 'rabbit-3', 0)).toEqual(['building-8']);
    for (let i = 0; i < 6; i++) s.rabbits.push({id: `extra-${i}`, species: 'neige', affection: 1, enclosureId: 'building-8'});
    expect(rabbitDropTargets(s, 'rabbit-3', 0)).toEqual([]);
    expect(rabbitDropTargets(s, 'missing', 0)).toEqual([]);
  });
});

describe('moving a rabbit on the island', () => {
  it('« Déplacer » closes the card, steps the camera back and shows arrows and the banner', () => {
    const {ui, scene} = setup();
    ui.open({kind: 'rabbit', id: 'rabbit-3'}); panelButton('Déplacer').click();
    expect(document.getElementById('game-panel')!.hidden).toBe(true);
    expect(document.getElementById('panel-backdrop')!.hidden).toBe(true);
    expect(banner().hidden).toBe(false); expect(banner().textContent).toContain('Choisis un habitat pour');
    expect(scene.get('zoomForRabbitMove')).toHaveBeenCalledOnce();
    expect(scene.get('setRabbitDropTargets')).toHaveBeenLastCalledWith(['building-8']);
  });
  it('touching an arrowed home moves the rabbit and reopens its card', () => {
    const {ui, controller, scene} = setup();
    ui.open({kind: 'rabbit', id: 'rabbit-3'}); panelButton('Déplacer').click();
    ui.select({kind: 'building', id: 'building-8'});
    expect(controller.getSnapshot().state!.rabbits.find(r => r.id === 'rabbit-3')!.enclosureId).toBe('building-8');
    expect(document.getElementById('toast')!.textContent).toContain('Lapin déplacé');
    expect(banner().hidden).toBe(true); expect(scene.get('setRabbitDropTargets')).toHaveBeenLastCalledWith(null);
    expect(document.getElementById('panel-title')!.textContent).toBeTruthy(); expect(document.getElementById('game-panel')!.hidden).toBe(false);
  });
  it('an incompatible home changes nothing and explains why', () => {
    const {ui, controller} = setup();
    ui.open({kind: 'rabbit', id: 'rabbit-3'}); panelButton('Déplacer').click();
    ui.select({kind: 'building', id: 'building-9'});
    expect(controller.getSnapshot().state!.rabbits.find(r => r.id === 'rabbit-3')!.enclosureId).toBe('building-1');
    expect(document.getElementById('toast')!.textContent).toContain('Cet habitat ne peut pas accueillir ce lapin.');
    expect(banner().hidden).toBe(false);
  });
  it.each(['Annuler', 'Escape'])('%s leaves the mode and reopens the card', how => {
    const {ui, scene} = setup();
    ui.open({kind: 'rabbit', id: 'rabbit-3'}); panelButton('Déplacer').click();
    if (how === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}));
    else bannerButton('Annuler').click();
    expect(banner().hidden).toBe(true); expect(scene.get('setRabbitDropTargets')).toHaveBeenLastCalledWith(null);
    expect(document.getElementById('game-panel')!.hidden).toBe(false);
    expect(panelButton('Déplacer')).toBeTruthy();
  });
  it('the list fallback still moves the rabbit', () => {
    const {ui, controller} = setup();
    ui.open({kind: 'rabbit', id: 'rabbit-3'}); panelButton('Déplacer').click(); bannerButton('Choisir dans une liste').click();
    expect(banner().hidden).toBe(true);
    [...document.querySelectorAll<HTMLButtonElement>('#panel-content button')].find(b => !b.disabled && b.textContent!.includes('Jardin'))!.click();
    expect(controller.getSnapshot().state!.rabbits.find(r => r.id === 'rabbit-3')!.enclosureId).toBe('building-8');
  });
});
