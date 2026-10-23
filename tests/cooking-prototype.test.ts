// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../cooktap-prototype/index.html?raw';
import kitchenCSS from '../cooktap-prototype/style.css?raw';
import {KitchenEngine} from '../cooktap-prototype/engine';
import {ITEMS, ZONES} from '../cooktap-prototype/recipes';
import {fitScene, hitBox, resolveDrop, toClient} from '../cooktap-prototype/geometry';
import {mountKitchen, type RecipeCompletion} from '../cooktap-prototype/main';

const cleanups: (() => void)[] = [];
let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  frames = []; vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => { cleanups.splice(0).forEach(dispose => dispose()); vi.useRealTimers(); vi.unstubAllGlobals(); });
const zoneDrop = (engine: KitchenEngine, itemId: string, id: string) => engine.dispatch({type: 'drop', itemId, target: {kind: 'zone', id}});
const applyBottle = (engine: KitchenEngine, itemId: string, targetId: string) => engine.dispatch({type: 'drop', itemId, target: {kind: 'item', id: targetId}});
const startSalad = (engine: KitchenEngine) => engine.dispatch({type: 'start-recipe', recipeId: 'salad'});
function cut(engine: KitchenEngine, id: string) {
  expect(zoneDrop(engine, id, 'cutting-board').accepted).toBe(true);
  expect(engine.dispatch({type: 'use-tool', toolId: 'knife', targetId: id})).toMatchObject({accepted: true, effect: 'cut', effectTargetId: id});
  expect(engine.snapshot().items.find(item => item.id === id)?.preparation).toBe('cut');
}
function finishWithOil(engine: KitchenEngine, order: readonly string[]) {
  for (const id of order) { cut(engine, id); expect(zoneDrop(engine, id, 'bowl').accepted).toBe(true); }
  return applyBottle(engine, 'olive-oil', 'bowl');
}
function mount(initialPortrait = false, onRecipeCompleted?: (result: RecipeCompletion) => void) {
  let portrait = initialPortrait, rect = {left: 20, top: 60, width: 900, height: 396};
  const query = new EventTarget(); Object.defineProperty(query, 'matches', {get: () => portrait});
  const host = document.getElementById('cooking-app')!;
  const kitchen = mountKitchen(host, {portraitQuery: query as MediaQueryList, measureSurface: () => rect, onRecipeCompleted});
  cleanups.push(() => kitchen.dispose());
  const root = kitchen.root;
  const node = (id: string) => root.querySelector<HTMLElement>(`[data-item="${id}"]`)!;
  const surface = root.querySelector<HTMLElement>('#kitchen-surface')!;
  const event = (target: HTMLElement, type: string, point: {x: number; y: number}, pointerId = 1) => target.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId, pointerType: 'touch', clientX: point.x, clientY: point.y, button: 0, buttons: type === 'pointerup' ? 0 : 1}));
  const at = (id: string) => toClient(kitchen.engine.snapshot().items.find(item => item.id === id)!.anchor, kitchen.scene.getView());
  const move = (point: {x: number; y: number}, pointer = 1) => { event(surface, 'pointermove', point, pointer); for (const callback of frames.splice(0)) callback(0); };
  const toZone = (id: string) => toClient(ZONES.find(zone => zone.id === id)!.anchor, kitchen.scene.getView());
  const begin = () => root.querySelector<HTMLButtonElement>('#recipe-salad')!.click();
  const beginChicken = () => root.querySelector<HTMLButtonElement>('#recipe-chicken')!.click();
  return {...kitchen, root, surface, node, event, at, move, toZone, begin, beginChicken,
    rotate(value: boolean) { portrait = value; query.dispatchEvent(new Event('change')); },
    resize() { rect = {...rect, width: 700}; kitchen.refresh(); },
    dragItem(id: string, target: {x: number; y: number}, pointer = 1) { event(node(id), 'pointerdown', at(id), pointer); move(target, pointer); event(surface, 'pointerup', target, pointer); },
    dragToZone(id: string, zone: string, pointer = 1) { this.dragItem(id, this.toZone(zone), pointer); },
    tapItem(id: string, pointer = 1) { const p = at(id); event(node(id), 'pointerdown', p, pointer); event(surface, 'pointerup', p, pointer); },
  };
}

describe('reusable kitchen lifecycle', () => {
  it('does not mount or register activity work when imported outside test mode', async () => {
    document.body.replaceChildren();
    const timers = vi.getTimerCount(), resize = vi.spyOn(window, 'addEventListener');
    const visibility = vi.spyOn(document, 'addEventListener');
    vi.resetModules(); vi.stubEnv('MODE', 'development');
    try {
      await import('../cooktap-prototype/main');
      expect(document.body.children).toHaveLength(0);
      expect(document.querySelector('style')).toBeNull();
      expect(vi.getTimerCount()).toBe(timers);
      expect(resize).not.toHaveBeenCalled(); expect(visibility).not.toHaveBeenCalled();
    } finally { resize.mockRestore(); visibility.mockRestore(); vi.unstubAllEnvs(); }
  });
  it('owns its shell in an arbitrary host and preserves unrelated host content on dispose', () => {
    const host = document.createElement('div'), sibling = document.createElement('button');
    sibling.textContent = 'Prairie'; host.append(sibling); document.body.append(host);
    const query = new EventTarget(); Object.defineProperty(query, 'matches', {value: false});
    const kitchen = mountKitchen(host, {portraitQuery: query as MediaQueryList, measureSurface: () => ({left: 0, top: 0, width: 900, height: 396})});
    cleanups.push(() => kitchen.dispose());
    expect(kitchen.root.parentElement).toBe(host);
    expect(kitchen.root.querySelector('style')!.textContent).toBe(kitchenCSS);
    kitchen.root.querySelector<HTMLButtonElement>('#recipe-salad')!.click();
    expect(kitchen.engine.snapshot()).toMatchObject({recipe: 'salad', phase: 'playing'});
    kitchen.dispose(); kitchen.dispose();
    expect(Array.from(host.children)).toEqual([sibling]);
    expect(kitchen.root.isConnected).toBe(false);
  });
  it('stops cooking, observers and event handling after disposal, then mounts a fresh session', () => {
    const disconnected = vi.fn();
    let resizeCallback: (() => void) | undefined;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resizeCallback = callback; }
      observe() {} disconnect = disconnected;
    });
    const k = mount(); k.beginChicken(); finishChicken(k.engine); k.refresh();
    vi.advanceTimersByTime(1000);
    expect(k.engine.snapshot().cookingRemainingMs).toBe(4000);
    const surface = k.surface, soy = k.node('soy'), replay = k.root.querySelector<HTMLButtonElement>('#recipe-replay')!;
    k.dispose(); const frozen = k.engine.snapshot();
    expect(disconnected).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10000); k.rotate(true); resizeCallback!();
    window.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    replay.click(); soy.click(); k.event(surface, 'pointerdown', {x: 10, y: 10}); k.event(surface, 'pointerup', {x: 80, y: 80});
    expect(k.engine.snapshot()).toEqual(frozen);
    const fresh = mount(); fresh.beginChicken();
    expect(fresh.engine.snapshot()).toMatchObject({phase: 'playing', activeTimeMs: 0, cookingRemainingMs: 0, invalidActions: 0});
    expect(fresh.node('chicken').dataset.preparation).toBe('raw');
  });
  it('cancels an in-flight pointer, animation frame, effects and feedback timers on disposal', () => {
    const k = mount(); k.begin();
    k.dragToZone('tomato', 'cutting-board'); k.dragItem('knife', k.at('tomato'));
    k.dragToZone('olive-oil', 'bowl'); // Rejection schedules UI feedback cleanup.
    const point = k.at('olive-oil');
    const capture = vi.fn(() => true), release = vi.fn();
    k.surface.hasPointerCapture = capture; k.surface.releasePointerCapture = release;
    k.event(k.node('olive-oil'), 'pointerdown', point);
    k.event(k.surface, 'pointermove', k.toZone('bowl')); // Leave the frame pending.
    const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame');
    k.dispose(); const frozen = k.engine.snapshot();
    expect(release).toHaveBeenCalledWith(1); expect(cancelFrame).toHaveBeenCalled();
    expect(k.drag.activeId).toBeNull(); expect(vi.getTimerCount()).toBe(0);
    for (const callback of frames.splice(0)) callback(0);
    vi.advanceTimersByTime(10000);
    expect(k.engine.snapshot()).toEqual(frozen);
    cancelFrame.mockRestore();
  });
  it('scopes every presentation selector and leaves unrelated buttons and headings unchanged', () => {
    const outside = document.createElement('div'); outside.innerHTML = '<button>Prairie</button><h1>Prairie</h1><nav>Menu</nav><small>Info</small>';
    document.body.append(outside);
    const elements = Array.from(outside.children) as HTMLElement[];
    const before = elements.map(el => getComputedStyle(el).cssText);
    const k = mount();
    const sheet = k.root.querySelector('style')!.sheet!;
    const visit = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          for (const selector of rule.selectorText.split(',')) {
            expect(selector.trim().startsWith('.cuisine-root')).toBe(true);
            for (const el of elements) expect(el.matches(selector)).toBe(false);
          }
        } else if (rule instanceof CSSMediaRule) visit(rule.cssRules);
        else if (rule instanceof CSSKeyframesRule) expect(rule.name.startsWith('cuisine-')).toBe(true);
      }
    };
    visit(sheet.cssRules);
    expect(elements.map(el => getComputedStyle(el).cssText)).toEqual(before);
    k.dispose(); expect(document.querySelector('.cuisine-root')).toBeNull();
  });
});

describe('salad recipe engine', () => {
  it('offers Salad and Chicken, then shows only selected recipe objects', () => {
    const e = new KitchenEngine(); expect(e.snapshot().phase).toBe('choosing'); expect(e.snapshot().items.every(item => !item.visible)).toBe(true);
    expect(startSalad(e).accepted).toBe(true);
    const visible = e.snapshot().items.filter(item => item.visible).map(item => item.id).sort();
    expect(visible).toEqual(['bowl', 'cutting-board', 'cucumber', 'knife', 'mozzarella', 'olive-oil', 'tomato'].sort());
    e.dispatch({type: 'choose-recipe'}); expect(e.dispatch({type: 'start-recipe', recipeId: 'chicken'}).accepted).toBe(true);
    expect(e.snapshot().items.filter(item => item.visible).map(item => item.id).sort()).toEqual(['baking-dish', 'chicken', 'cutting-board', 'honey', 'knife', 'oven', 'peeler', 'soy', 'sweet-potato'].sort());
  });
  it.each(['mozzarella', 'tomato', 'cucumber'])('moves %s onto the free board and refuses another food while occupied', id => {
    const e = new KitchenEngine(); startSalad(e); expect(zoneDrop(e, id, 'cutting-board').accepted).toBe(true);
    const before = e.snapshot(); const other = ['mozzarella', 'tomato', 'cucumber'].find(food => food !== id)!;
    expect(zoneDrop(e, other, 'cutting-board')).toMatchObject({accepted: false, message: 'La planche est occupée.'});
    expect(e.snapshot().invalidActions).toBe(1); expect(e.snapshot().items.find(item => item.id === other)?.location).toBe('reserve');
    expect(e.snapshot().items.find(item => item.id === id)?.location).toBe('cutting-board'); expect(before.items.find(item => item.id === id)?.location).toBe('cutting-board');
  });
  it.each(['mozzarella', 'tomato', 'cucumber'])('knife cuts %s and returns to its support', id => {
    const e = new KitchenEngine(); startSalad(e); zoneDrop(e, id, 'cutting-board');
    expect(e.dispatch({type: 'use-tool', toolId: 'knife', targetId: id})).toMatchObject({accepted: true, effect: 'cut', effectTargetId: id});
    expect(e.snapshot().items.find(item => item.id === id)?.preparation).toBe('cut');
    expect(e.snapshot().items.find(item => item.id === 'knife')).toMatchObject({location: 'tool-rack', zoneId: 'tool-rack-knife'});
    expect(e.snapshot().invalidActions).toBe(0);
  });
  it('refuses knife on an empty board, the board surface, or an already cut ingredient', () => {
    const e = new KitchenEngine(); startSalad(e);
    expect(e.dispatch({type: 'drop', itemId: 'knife', target: {kind: 'zone', id: 'cutting-board'}}).accepted).toBe(false);
    cut(e, 'tomato');
    expect(e.dispatch({type: 'use-tool', toolId: 'knife', targetId: 'tomato'}).accepted).toBe(false);
    expect(e.snapshot().invalidActions).toBe(2);
  });
  it('requires cut food for the bowl, locks it there and shows contents from engine state', () => {
    const e = new KitchenEngine(); startSalad(e);
    expect(zoneDrop(e, 'tomato', 'bowl')).toMatchObject({accepted: false, message: 'Coupe-le d’abord.'});
    cut(e, 'tomato'); expect(zoneDrop(e, 'tomato', 'bowl').accepted).toBe(true);
    expect(e.snapshot().items.find(item => item.id === 'tomato')).toMatchObject({preparation: 'cut', location: 'bowl', draggable: false, interactive: false});
    expect(e.dispatch({type: 'drop', itemId: 'tomato', target: {kind: 'zone', id: 'reserve-tomato'}}).accepted).toBe(false);
  });
  it('returns a cut ingredient to its own reserve without changing preparation', () => {
    const e = new KitchenEngine(); startSalad(e); cut(e, 'cucumber');
    expect(zoneDrop(e, 'cucumber', 'reserve-cucumber').accepted).toBe(true);
    expect(e.snapshot().items.find(item => item.id === 'cucumber')).toMatchObject({location: 'reserve', preparation: 'cut'});
  });
  it.each([0, 1, 2])('refuses olive oil with %i ingredients in bowl', count => {
    const e = new KitchenEngine(); startSalad(e);
    for (const id of ['mozzarella', 'tomato', 'cucumber'].slice(0, count)) { cut(e, id); zoneDrop(e, id, 'bowl'); }
    expect(applyBottle(e, 'olive-oil', 'bowl')).toMatchObject({accepted: false, message: 'Ajoute d’abord les 3 ingrédients'});
    expect(e.snapshot().items.find(item => item.id === 'olive-oil')?.flags).toEqual({});
    expect(e.snapshot().phase).toBe('playing'); expect(e.snapshot().invalidActions).toBe(1);
  });
  it('accepts oil only after all three cut ingredients are in the bowl and completes the salad', () => {
    const e = new KitchenEngine(); startSalad(e); expect(finishWithOil(e, ['mozzarella', 'tomato', 'cucumber'])).toMatchObject({accepted: true, message: 'Salade réussie !', effect: 'pour', effectTargetId: 'bowl'});
    expect(e.snapshot()).toMatchObject({phase: 'completed', invalidActions: 0, items: expect.arrayContaining([expect.objectContaining({id: 'olive-oil', flags: {oliveOilAdded: true}})])});
    expect(e.advance(1000)).toBeUndefined();
  });
  it.each([
    ['mozzarella', 'tomato', 'cucumber'], ['mozzarella', 'cucumber', 'tomato'],
    ['tomato', 'mozzarella', 'cucumber'], ['tomato', 'cucumber', 'mozzarella'],
    ['cucumber', 'mozzarella', 'tomato'], ['cucumber', 'tomato', 'mozzarella'],
  ])('completes in preparation order %s → %s → %s', (...order) => {
    const e = new KitchenEngine(); startSalad(e); expect(finishWithOil(e, order)).toMatchObject({accepted: true}); expect(e.snapshot().phase).toBe('completed');
  });
  it('measures elapsed active time only while playing in landscape and foreground', () => {
    const e = new KitchenEngine(); e.advance(5000); expect(e.snapshot().activeTimeMs).toBe(0); startSalad(e); e.advance(1250);
    e.setPaused('portrait', true); e.advance(9000); e.setPaused('portrait', false); e.setPaused('hidden', true); e.advance(9000);
    e.setPaused('hidden', false); e.advance(750); expect(e.snapshot().activeTimeMs).toBe(2000);
  });
  it('replay resets every ingredient, flags, errors and elapsed time; chooser resets the recipe', () => {
    const e = new KitchenEngine(); startSalad(e); e.advance(3600); zoneDrop(e, 'tomato', 'bowl');
    expect(e.snapshot().invalidActions).toBe(1);
    e.dispatch({type: 'reset-recipe'}); expect(e.snapshot()).toMatchObject({phase: 'playing', recipe: 'salad', activeTimeMs: 0, invalidActions: 0});
    for (const id of ['mozzarella', 'tomato', 'cucumber']) expect(e.snapshot().items.find(item => item.id === id)).toMatchObject({preparation: 'whole', location: 'reserve', zoneId: `reserve-${id}`, visible: true});
    expect(e.snapshot().items.find(item => item.id === 'olive-oil')?.flags).toEqual({});
    e.dispatch({type: 'choose-recipe'}); expect(e.snapshot()).toMatchObject({phase: 'choosing', recipe: null}); expect(e.snapshot().items.every(item => !item.visible)).toBe(true);
  });
});

describe('draggable bottle applicators', () => {
  it.each(['soy', 'honey'])('%s only applies on a valid chicken drop and returns home', bottle => {
    const k = mount(); k.beginChicken();
    const node = k.node(bottle), home = node.style.transform;
    k.tapItem(bottle); node.click();
    expect(k.engine.snapshot().items.find(i => i.id === 'chicken')?.flags).toEqual({});
    expect(k.engine.snapshot().invalidActions).toBe(0);
    k.dragItem(bottle, k.at('chicken'));
    expect(k.engine.snapshot().invalidActions).toBe(1);
    expect(node.style.transform).toBe(home);
    k.dragToZone('chicken', 'cutting-board'); k.dragItem('knife', k.at('chicken'));
    k.tapItem(bottle); node.click();
    expect(k.engine.snapshot().items.find(i => i.id === 'chicken')?.flags).toEqual({});
    if (bottle === 'honey') {
      k.dragItem(bottle, k.at('chicken'));
      expect(k.engine.snapshot().invalidActions).toBe(2);
      k.dragItem('soy', k.at('chicken'));
    }
    const beforeTap = {...k.engine.snapshot().items.find(i => i.id === 'chicken')!.flags};
    k.tapItem(bottle); node.click();
    expect(k.engine.snapshot().items.find(i => i.id === 'chicken')?.flags).toEqual(beforeTap);
    k.event(node, 'pointerdown', k.at(bottle)); k.move(k.at('chicken'));
    expect(node.classList.contains('grabbed')).toBe(true);
    expect(node.style.transform).not.toBe(home);
    k.event(k.surface, 'pointerup', k.at('chicken'));
    const flag = bottle === 'soy' ? 'soyAdded' : 'honeyAdded';
    expect(k.engine.snapshot().items.find(i => i.id === 'chicken')?.flags[flag]).toBe(true);
    expect(node.style.transform).toBe(home);
    const errors = k.engine.snapshot().invalidActions;
    k.dragItem(bottle, k.at('chicken'));
    expect(k.engine.snapshot().invalidActions).toBe(errors + 1);
    expect(node.style.transform).toBe(home);
    k.event(node, 'pointerdown', k.at(bottle)); k.move(k.at('chicken'));
    k.event(k.surface, 'pointercancel', k.at('chicken'));
    expect(k.engine.snapshot().invalidActions).toBe(errors + 1);
    expect(node.style.transform).toBe(home);
  });
  it('rejects the wrong food without seasoning and returns the bottle', () => {
    const k = mount(); k.beginChicken(); const home = k.node('soy').style.transform;
    k.dragItem('soy', k.at('sweet-potato'));
    expect(k.engine.snapshot().invalidActions).toBe(1);
    expect(k.engine.snapshot().items.find(i => i.id === 'chicken')?.flags).toEqual({});
    expect(k.node('soy').style.transform).toBe(home);
  });
  it('oil follows the pointer, cancels without penalty, rejects an unready bowl and returns after completion', () => {
    const k = mount(); k.begin(); const oil = k.node('olive-oil'), home = oil.style.transform;
    k.tapItem('olive-oil'); oil.click();
    expect(k.engine.snapshot()).toMatchObject({phase: 'playing', invalidActions: 0});
    k.event(oil, 'pointerdown', k.at('olive-oil')); k.move(k.toZone('bowl'));
    expect(oil.style.transform).not.toBe(home);
    k.event(k.surface, 'pointercancel', k.toZone('bowl'));
    expect(k.engine.snapshot().invalidActions).toBe(0); expect(oil.style.transform).toBe(home);
    k.dragToZone('olive-oil', 'bowl'); expect(k.engine.snapshot().invalidActions).toBe(1);
    expect(oil.style.transform).toBe(home);
    for (const id of ['tomato', 'mozzarella', 'cucumber']) { cut(k.engine, id); zoneDrop(k.engine, id, 'bowl'); }
    k.scene.render(k.engine.snapshot());
    k.tapItem('olive-oil'); oil.click(); expect(k.engine.snapshot().phase).toBe('playing');
    expect(k.engine.snapshot().items.find(i => i.id === 'olive-oil')?.flags).toEqual({});
    k.dragToZone('olive-oil', 'bowl');
    expect(k.engine.snapshot().phase).toBe('completed'); expect(oil.style.transform).toBe(home);
    expect(k.engine.snapshot().items.find(i => i.id === 'olive-oil')?.flags.oliveOilAdded).toBe(true);
  });
});

describe('salad responsive geometry', () => {
  it.each([[667, 270], [844, 300], [1400, 700]])('fits %sx%s and preserves >=48px food/tool targets', (width, height) => {
    const view = fitScene({left: 17, top: 30, width, height}); expect(view.width).toBeLessThanOrEqual(width); expect(view.height).toBeLessThanOrEqual(height);
    for (const id of ['mozzarella', 'tomato', 'cucumber', 'knife', 'olive-oil']) { const item = ITEMS.find(i => i.id === id)!; const box = hitBox(item.anchor, item.width, item.height, view); expect(box.width).toBeGreaterThanOrEqual(48); expect(box.height).toBeGreaterThanOrEqual(48); }
  });
  it('resolves the knife target to the food on the board under pointer capture', () => {
    const e = new KitchenEngine(); startSalad(e); zoneDrop(e, 'tomato', 'cutting-board'); const view = fitScene({left: 0, top: 0, width: 1000, height: 440});
    expect(resolveDrop({x: 490, y: 238}, 'knife', e.snapshot(), ZONES, view)).toEqual({kind: 'item', id: 'tomato'});
  });
});

describe('salad DOM, Pointer Events and UI', () => {
  it('starts at recipe selection, hides chicken objects, then displays the table and guide', () => {
    const k = mount(); expect(k.root.querySelector<HTMLElement>('#recipe-screen')!.hidden).toBe(false); expect(k.root.querySelector<HTMLButtonElement>('#recipe-chicken')!.hasAttribute('disabled')).toBe(false);
    k.begin(); expect(k.root.querySelector<HTMLElement>('#recipe-screen')!.hidden).toBe(true); expect(k.node('chicken').hidden).toBe(true);
    expect(k.root.querySelector<HTMLElement>('#recipe-guide')!.getAttribute('aria-label')).toContain('couper');
  });
  it('executes drag down → move → up for food and knife, updates cut art and bowl contents, then completes by oil drop', () => {
    const completed = vi.fn(); const k = mount(false, completed); k.begin();
    k.dragToZone('tomato', 'cutting-board'); expect(k.node('tomato').dataset.location).toBe('cutting-board');
    const whole = k.node('tomato').querySelector('.object-art')!.innerHTML;
    k.dragItem('knife', k.at('tomato')); expect(k.node('tomato').dataset.preparation).toBe('cut');
    expect(k.node('tomato').querySelector('.object-art')!.innerHTML).not.toBe(whole);
    expect(k.node('knife').dataset.location).toBe('tool-rack');
    expect(k.node('tomato').dataset.effect).toBe('cut');
    k.dragToZone('tomato', 'bowl'); expect(k.node('bowl').dataset.accessibleName).toContain('Tomate');
    for (const id of ['mozzarella', 'cucumber']) { k.dragToZone(id, 'cutting-board'); k.dragItem('knife', k.at(id)); k.dragToZone(id, 'bowl'); }
    expect(k.root.querySelector('.bowl-content')!.innerHTML).toContain('#dc725d');
    k.tapItem('olive-oil'); k.node('olive-oil').click(); expect(k.engine.snapshot().phase).toBe('playing');
    k.dragToZone('olive-oil', 'bowl'); expect(k.engine.snapshot().phase).toBe('completed');
    expect(completed).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenLastCalledWith({recipeId: 'salad', activeTimeMs: 0, invalidActions: 0});
    expect(k.node('olive-oil').dataset.effect).toBe('pour');
    expect(k.root.querySelector<HTMLElement>('.bowl-content')!.dataset.effect).toBe('dressed');
    expect(k.root.querySelector<HTMLElement>('#result-screen')!.hidden).toBe(false); expect(k.root.querySelector<HTMLElement>('#result-title')!.textContent).toBe('Salade réussie !');
  });
  it('counts invalid drops but not pointercancel, second finger, or rotation', () => {
    const k = mount(); k.begin(); k.dragToZone('tomato', 'bowl'); expect(k.engine.snapshot().invalidActions).toBe(1);
    k.event(k.node('cucumber'), 'pointerdown', k.at('cucumber')); k.move(k.toZone('cutting-board')); k.event(k.surface, 'pointercancel', k.toZone('cutting-board'));
    k.event(k.node('tomato'), 'pointerdown', k.at('tomato')); k.move(k.toZone('cutting-board')); k.event(document.body, 'pointerdown', {x: 1, y: 1}, 2);
    expect(k.engine.snapshot().invalidActions).toBe(1); k.rotate(true); expect(k.engine.snapshot().invalidActions).toBe(1);
  });
  it('selects oil on tap without applying it and counts a deliberate irrelevant bottle drop', () => {
    const k = mount(); k.begin(); const origin = k.at('olive-oil');
    k.event(k.node('olive-oil'), 'pointerdown', origin); k.move({x: origin.x + 12, y: origin.y}); k.event(k.surface, 'pointerup', {x: origin.x + 12, y: origin.y});
    expect(k.engine.snapshot().items.find(item => item.id === 'olive-oil')?.flags).toEqual({});
    expect(k.engine.snapshot().invalidActions).toBe(1); k.tapItem('olive-oil'); expect(k.engine.snapshot().invalidActions).toBe(1);
  });
  it('blocks all recipe actions in portrait and preserves recipe state through landscape return', () => {
    const k = mount(); k.begin(); k.rotate(true); expect(k.engine.canDrag('tomato')).toBe(false);
    expect(k.root.querySelector<HTMLElement>('#orientation-screen')!.hidden).toBe(false); k.node('olive-oil').click(); expect(k.engine.snapshot().invalidActions).toBe(0);
    k.rotate(false); expect(k.root.querySelector<HTMLElement>('#orientation-screen')!.hidden).toBe(true); k.dragToZone('tomato', 'cutting-board'); expect(k.node('tomato').dataset.location).toBe('cutting-board');
  });
  it('replay through the result action clears progress and returns to a fresh salad', () => {
    const k = mount(); k.begin(); finishWithOil(k.engine, ['tomato', 'cucumber', 'mozzarella']); k.scene.render(k.engine.snapshot());
    k.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click();
    expect(k.engine.snapshot()).toMatchObject({phase: 'playing', activeTimeMs: 0, invalidActions: 0});
    expect(k.node('tomato').dataset.location).toBe('reserve'); expect(k.node('tomato').dataset.preparation).toBe('whole');
    expect(k.root.querySelector<HTMLElement>('#result-screen')!.hidden).toBe(true);
  });
});

function startChicken(engine: KitchenEngine) { return engine.dispatch({type: 'start-recipe', recipeId: 'chicken'}); }
function tool(engine: KitchenEngine, id: string, target: string) { return engine.dispatch({type: 'use-tool', toolId: id, targetId: target}); }
function chickenReady(engine: KitchenEngine) {
  zoneDrop(engine, 'chicken', 'cutting-board'); tool(engine, 'knife', 'chicken');
  applyBottle(engine, 'soy', 'chicken'); applyBottle(engine, 'honey', 'chicken');
  zoneDrop(engine, 'chicken', 'reserve-chicken');
}
function potatoReady(engine: KitchenEngine) {
  zoneDrop(engine, 'sweet-potato', 'cutting-board'); tool(engine, 'peeler', 'sweet-potato'); tool(engine, 'knife', 'sweet-potato');
  zoneDrop(engine, 'sweet-potato', 'reserve-sweet-potato');
}
function finishChicken(engine: KitchenEngine, order: 'chicken-first' | 'potato-first' = 'chicken-first') {
  const steps = order === 'chicken-first' ? [chickenReady, potatoReady] : [potatoReady, chickenReady];
  steps[0](engine); const first = order === 'chicken-first' ? 'chicken' : 'sweet-potato';
  expect(zoneDrop(engine, first, 'baking-dish').accepted).toBe(true);
  steps[1](engine); const second = order === 'chicken-first' ? 'sweet-potato' : 'chicken';
  expect(zoneDrop(engine, second, 'baking-dish').accepted).toBe(true);
  expect(engine.dispatch({type: 'drop', itemId: 'baking-dish', target: {kind: 'zone', id: 'oven'}})).toMatchObject({accepted: true, effect: 'oven'});
}

describe('chicken and roasted sweet potato engine', () => {
  it('requires cutting the raw chicken before soy, then honey after soy, and accepts seasoned chicken in the dish', () => {
    const e = new KitchenEngine(); startChicken(e);
    expect(applyBottle(e, 'soy', 'chicken')).toMatchObject({accepted: false, message: 'Coupe d’abord le poulet'});
    zoneDrop(e, 'chicken', 'cutting-board'); expect(tool(e, 'knife', 'chicken')).toMatchObject({accepted: true, effect: 'cut'});
    expect(applyBottle(e, 'honey', 'chicken')).toMatchObject({accepted: false, message: 'Ajoute d’abord la sauce soja'});
    expect(applyBottle(e, 'soy', 'chicken').accepted).toBe(true); expect(applyBottle(e, 'honey', 'chicken').accepted).toBe(true);
    expect(e.snapshot().items.find(i => i.id === 'chicken')?.flags).toEqual({soyAdded: true, honeyAdded: true});
    expect(zoneDrop(e, 'chicken', 'baking-dish').accepted).toBe(true);
  });
  it('requires peeling before knife-cutting the potato and changes it to peeled then cut', () => {
    const e = new KitchenEngine(); startChicken(e); zoneDrop(e, 'sweet-potato', 'cutting-board');
    expect(tool(e, 'knife', 'sweet-potato')).toMatchObject({accepted: false, message: 'Épluche-la d’abord.'});
    expect(e.snapshot().items.find(i => i.id === 'sweet-potato')?.preparation).toBe('whole');
    expect(tool(e, 'peeler', 'sweet-potato')).toMatchObject({accepted: true, effect: 'peel'});
    expect(e.snapshot().items.find(i => i.id === 'sweet-potato')?.preparation).toBe('peeled');
    expect(tool(e, 'knife', 'sweet-potato')).toMatchObject({accepted: true, effect: 'cut'});
    expect(e.snapshot().items.find(i => i.id === 'sweet-potato')?.preparation).toBe('cut');
  });
  it('keeps preparation when an ingredient returns to reserve and enforces one board occupant', () => {
    const e = new KitchenEngine(); startChicken(e); zoneDrop(e, 'chicken', 'cutting-board');
    expect(zoneDrop(e, 'sweet-potato', 'cutting-board')).toMatchObject({accepted: false, message: 'La planche est occupée.'});
    tool(e, 'knife', 'chicken'); applyBottle(e, 'soy', 'chicken'); applyBottle(e, 'honey', 'chicken');
    expect(zoneDrop(e, 'chicken', 'reserve-chicken').accepted).toBe(true);
    expect(e.snapshot().items.find(i => i.id === 'chicken')).toMatchObject({preparation: 'cut', location: 'reserve', flags: {soyAdded: true, honeyAdded: true}});
  });
  it('rejects incomplete foods and accepts either food order in the baking dish', () => {
    for (const order of ['chicken-first', 'potato-first'] as const) {
      const e = new KitchenEngine(); startChicken(e);
      expect(zoneDrop(e, 'chicken', 'baking-dish').accepted).toBe(false);
      expect(zoneDrop(e, 'sweet-potato', 'baking-dish').accepted).toBe(false);
      finishChicken(e, order); expect(e.snapshot().items.find(i => i.id === 'baking-dish')?.location).toBe('oven');
      expect(e.snapshot().items.filter(i => i.location === 'oven' && i.kind === 'food')).toHaveLength(2);
    }
  });
  it('requires a complete dish for the oven and cooks for exactly five active seconds', () => {
    const e = new KitchenEngine(); startChicken(e); chickenReady(e);
    expect(e.canDrag('baking-dish')).toBe(false);
    zoneDrop(e, 'chicken', 'baking-dish');
    expect(e.dispatch({type: 'drop', itemId: 'baking-dish', target: {kind: 'zone', id: 'oven'}}).accepted).toBe(false);
    potatoReady(e); zoneDrop(e, 'sweet-potato', 'baking-dish');
    e.dispatch({type: 'drop', itemId: 'baking-dish', target: {kind: 'zone', id: 'oven'}});
    e.advance(4999); expect(e.snapshot()).toMatchObject({phase: 'playing', cookingRemainingMs: 1});
    expect(e.snapshot().items.find(i => i.id === 'chicken')?.preparation).toBe('cut');
    e.setPaused('portrait', true); e.advance(2000); expect(e.snapshot().cookingRemainingMs).toBe(1);
    e.setPaused('portrait', false); e.setPaused('hidden', true); e.advance(2000); expect(e.snapshot().cookingRemainingMs).toBe(1);
    e.setPaused('hidden', false); e.advance(1);
    expect(e.snapshot()).toMatchObject({phase: 'completed', cookingRemainingMs: 0});
    expect(e.snapshot().items.filter(i => ['chicken', 'sweet-potato'].includes(i.id)).every(i => i.preparation === 'cooked')).toBe(true);
  });
  it('replays chicken with every item, seasoning, dish, oven, timer and error reset', () => {
    const e = new KitchenEngine(); startChicken(e); applyBottle(e, 'soy', 'chicken'); finishChicken(e); e.advance(1200);
    expect(e.snapshot().invalidActions).toBeGreaterThan(0);
    e.dispatch({type: 'reset-recipe'});
    expect(e.snapshot()).toMatchObject({phase: 'playing', recipe: 'chicken', activeTimeMs: 0, invalidActions: 0, cookingRemainingMs: 0});
    for (const id of ['chicken', 'sweet-potato']) expect(e.snapshot().items.find(i => i.id === id)).toMatchObject({location: 'reserve', draggable: true, interactive: true});
    expect(e.snapshot().items.find(i => i.id === 'sweet-potato')?.preparation).toBe('whole');
    expect(e.snapshot().items.find(i => i.id === 'chicken')?.flags).toEqual({});
    expect(e.snapshot().items.find(i => i.id === 'baking-dish')?.location).toBe('dish-rack');
  });
});

describe('chicken DOM, Pointer Events and result', () => {
  it('keeps the oven dish and progress renderable while contained foods stay hidden', () => {
    const style = document.createElement('style'); style.textContent = kitchenCSS; document.body.append(style);
    const k = mount(); k.beginChicken();
    chickenReady(k.engine); potatoReady(k.engine);
    zoneDrop(k.engine, 'chicken', 'baking-dish'); zoneDrop(k.engine, 'sweet-potato', 'baking-dish');
    k.scene.render(k.engine.snapshot()); k.dragToZone('baking-dish', 'oven');
    const dish = k.node('baking-dish');
    expect(k.engine.snapshot().cookingRemainingMs).toBe(5000);
    expect(dish.dataset.inDish).toBe('false');
    expect(dish.hidden).toBe(false);
    expect(getComputedStyle(dish).opacity).not.toBe('0');
    expect(getComputedStyle(dish).display).not.toBe('none');
    expect(getComputedStyle(dish).visibility).not.toBe('hidden');
    // happy-dom does not paint pseudo-elements: verify the matching CSS rule and its dimensions.
    const progressRule = Array.from(style.sheet!.cssRules).find(rule => 'selectorText' in rule && /:{1,2}after$/.test(String(rule.selectorText)) && dish.matches(String(rule.selectorText).replace(/:{1,2}after$/, ''))) as CSSStyleRule;
    expect(progressRule).toBeDefined();
    expect(progressRule.style.content).toBe('""');
    expect(progressRule.style.height).toBe('5px');
    expect(progressRule.style.background).toContain('var(--cook-progress)');
    expect(dish.style.getPropertyValue('--cook-progress')).toBe('0%');
    for (const id of ['chicken', 'sweet-potato']) {
      expect(k.node(id).dataset.inDish).toBe('true');
      expect(getComputedStyle(k.node(id)).opacity).toBe('0');
      expect(k.engine.canDrag(id)).toBe(false); expect(k.engine.canSelect(id)).toBe(false);
    }
    expect(k.root.querySelector<HTMLElement>('.dish-content')!.hidden).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(dish.dataset.progress).toBe('0.4');
    expect(dish.style.getPropertyValue('--cook-progress')).toBe('40%');
    expect(getComputedStyle(dish).opacity).not.toBe('0');
    vi.advanceTimersByTime(3000);
    expect(k.engine.snapshot()).toMatchObject({phase: 'completed', cookingRemainingMs: 0});
    expect(k.root.querySelector<HTMLElement>('#result-screen')!.hidden).toBe(false);
  });

  it('moves visible dish contents with the dish before committing the oven drop', () => {
    const k = mount(); k.beginChicken();
    chickenReady(k.engine); potatoReady(k.engine);
    zoneDrop(k.engine, 'chicken', 'baking-dish'); zoneDrop(k.engine, 'sweet-potato', 'baking-dish');
    k.scene.render(k.engine.snapshot());
    const dish = k.node('baking-dish'), contents = k.root.querySelector<HTMLElement>('.dish-content')!;
    const translation = (node: HTMLElement) => node.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/)!.slice(1).map(Number);
    const startDish = translation(dish), startContents = translation(contents);
    expect(contents.hidden).toBe(false);
    expect(contents.querySelector('path')).not.toBeNull();
    expect(contents.querySelector('g')).not.toBeNull();
    for (const id of ['chicken', 'sweet-potato']) {
      expect(k.engine.canDrag(id)).toBe(false); expect(k.engine.canSelect(id)).toBe(false);
    }
    const start = k.at('baking-dish'), oven = k.toZone('oven');
    k.event(dish, 'pointerdown', start);
    k.move({x: (start.x + oven.x) / 2, y: (start.y + oven.y) / 2});
    const movedDish = translation(dish), movedContents = translation(contents);
    expect(movedContents).not.toEqual(startContents);
    for (const axis of [0, 1]) expect(movedContents[axis] - startContents[axis]).toBeCloseTo(movedDish[axis] - startDish[axis]);
    expect(Number(contents.style.zIndex)).toBeGreaterThan(Number(dish.style.zIndex));
    expect(dish.dataset.location).toBe('dish-rack');
    vi.advanceTimersByTime(100); // Periodic rendering must not restore the old content position.
    expect(translation(contents)).toEqual(movedContents);
    k.move(oven); k.event(k.surface, 'pointerup', oven);
    expect(dish.dataset.location).toBe('oven');
    expect(k.engine.snapshot().cookingRemainingMs).toBe(5000);
    expect(contents.style.zIndex).toBe('');
  });

  it('keeps an incomplete dish stationary and tappable, then allows dragging the complete dish', () => {
    const k = mount(); k.beginChicken();
    const dish = k.node('baking-dish');
    const attemptIncompleteDrag = () => {
      expect(k.engine.canDrag('baking-dish')).toBe(false);
      const transform = dish.style.transform;
      k.event(dish, 'pointerdown', k.at('baking-dish'));
      k.move(k.toZone('oven'));
      expect(dish.style.transform).toBe(transform);
      expect(dish.classList.contains('grabbed')).toBe(false);
      expect(k.drag.activeId).toBeNull();
      k.event(k.surface, 'pointerup', k.toZone('oven'));
      expect(k.engine.snapshot().invalidActions).toBe(0);
      expect(dish.dataset.location).toBe('dish-rack');
      k.tapItem('baking-dish');
      expect(k.engine.snapshot().selectedId).toBe('baking-dish');
    };
    attemptIncompleteDrag();
    chickenReady(k.engine); zoneDrop(k.engine, 'chicken', 'baking-dish');
    k.scene.render(k.engine.snapshot());
    attemptIncompleteDrag();
    potatoReady(k.engine); zoneDrop(k.engine, 'sweet-potato', 'baking-dish');
    k.scene.render(k.engine.snapshot());
    expect(k.engine.canDrag('baking-dish')).toBe(true);
    const transform = dish.style.transform;
    k.event(dish, 'pointerdown', k.at('baking-dish'));
    k.move(k.toZone('oven'));
    expect(dish.classList.contains('grabbed')).toBe(true);
    expect(dish.style.transform).not.toBe(transform);
    expect(k.drag.activeId).toBe('baking-dish');
    k.event(k.surface, 'pointerup', k.toZone('oven'));
    expect(k.engine.snapshot()).toMatchObject({cookingRemainingMs: 5000, invalidActions: 0});
    expect(dish.dataset.location).toBe('oven');
  });

  it('completes chicken and potato using pointer drags, bottle drops, oven timing, and replay', () => {
    const completed = vi.fn(); const k = mount(false, completed); k.beginChicken();
    expect(k.node('chicken').hidden).toBe(false); expect(k.node('sweet-potato').hidden).toBe(false); expect(k.node('bowl').hidden).toBe(true);
    expect(k.node('chicken').querySelector('.object-label')!.textContent).toBe('Poulet cru');
    k.dragToZone('chicken', 'cutting-board'); k.dragItem('knife', k.at('chicken'));
    expect(k.node('chicken').dataset.preparation).toBe('cut');
    expect(k.node('chicken').querySelector('.object-label')!.textContent).toBe('Poulet coupé');
    k.dragItem('soy', k.at('chicken')); k.dragItem('honey', k.at('chicken')); expect(k.node('chicken').dataset.flags).toContain('honeyAdded');
    k.dragToZone('chicken', 'reserve-chicken');
    k.dragToZone('sweet-potato', 'cutting-board'); const whole = k.node('sweet-potato').querySelector('.object-art')!.innerHTML;
    k.dragItem('knife', k.at('sweet-potato')); expect(k.node('sweet-potato').dataset.preparation).toBe('whole');
    k.dragItem('peeler', k.at('sweet-potato')); expect(k.node('sweet-potato').dataset.preparation).toBe('peeled');
    expect(k.node('sweet-potato').querySelector('.object-label')!.textContent).toBe('Patate douce épluchée');
    expect(k.node('sweet-potato').querySelector('.object-art')!.innerHTML).not.toBe(whole);
    k.dragItem('knife', k.at('sweet-potato')); expect(k.node('sweet-potato').dataset.preparation).toBe('cut');
    k.dragToZone('sweet-potato', 'reserve-sweet-potato'); k.dragToZone('chicken', 'baking-dish'); k.dragToZone('sweet-potato', 'baking-dish');
    expect(k.node('baking-dish').dataset.accessibleName).toContain('Poulet');
    k.dragToZone('baking-dish', 'oven'); expect(k.node('baking-dish').dataset.cooking).toBe('true');
    vi.advanceTimersByTime(5000);
    expect(completed).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenLastCalledWith({recipeId: 'chicken', activeTimeMs: 5000, invalidActions: 1});
    vi.advanceTimersByTime(1000); expect(completed).toHaveBeenCalledOnce();
    expect(k.engine.snapshot().phase).toBe('completed'); expect(k.node('chicken').dataset.preparation).toBe('cooked');
    expect(k.root.querySelector('#result-title')!.textContent).toContain('Poulet soja-miel');
    k.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click();
    expect(k.engine.snapshot()).toMatchObject({phase: 'playing', activeTimeMs: 0, invalidActions: 0, cookingRemainingMs: 0});
    expect(k.node('sweet-potato').dataset.preparation).toBe('whole'); expect(k.node('baking-dish').dataset.location).toBe('dish-rack');
  });
});
