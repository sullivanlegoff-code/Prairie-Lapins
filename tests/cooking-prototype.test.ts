// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import html from '../cooktap-prototype/index.html?raw';
import kitchenCSS from '../cooktap-prototype/style.css?raw';
import {KitchenEngine} from '../cooktap-prototype/engine';
import {ITEMS, RECIPES, RECIPE_IDS, allSteps, recipe, type RecipeId} from '../cooktap-prototype/recipes';
import {ART_URLS, artKey, finishedDishArt} from '../cooktap-prototype/art';
import {fitScene, hitBox, resolveDrop, toClient} from '../cooktap-prototype/geometry';
import {mountKitchen, type RecipeCompletion} from '../cooktap-prototype/main';
import {CUISINE_REWARDS} from '../src/config/balance';

const cleanups: (() => void)[] = [];
let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  frames = []; vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => { cleanups.splice(0).forEach(dispose => dispose()); vi.useRealTimers(); vi.unstubAllGlobals(); });

/** Every drag of each recipe, in a valid order; `cook` lets the active clock run. */
const PLAYS: Record<RecipeId, readonly (readonly [string, string] | readonly ['cook', number])[]> = {
  'avocado-toast': [['avocado', 'cutting-board'], ['knife', 'avocado'], ['avocado', 'bowl'], ['honey', 'bowl'], ['soy', 'bowl'],
    ['shallot', 'cutting-board'], ['knife', 'shallot'], ['shallot', 'bowl'], ['spoon', 'bowl'], ['bread', 'pan'], ['cook', 3000], ['bowl', 'plate'], ['salmon', 'plate']],
  moelleux: [['chocolate', 'saucepan'], ['butter', 'saucepan'], ['eggs', 'bowl'], ['sugar', 'bowl'], ['whisk', 'bowl'],
    ['saucepan', 'bowl'], ['flour', 'bowl'], ['whisk', 'bowl'], ['bowl', 'mould'], ['mould', 'oven'], ['cook', 5000]],
  chicken: [['chicken', 'cutting-board'], ['knife', 'chicken'], ['soy', 'chicken'], ['honey', 'chicken'], ['chicken', 'baking-dish'],
    ['sweet-potato', 'cutting-board'], ['peeler', 'sweet-potato'], ['knife', 'sweet-potato'], ['sweet-potato', 'baking-dish'], ['baking-dish', 'oven'], ['cook', 5000]],
};
const drop = (engine: KitchenEngine, itemId: string, id: string) => engine.dispatch({type: 'drop', itemId, target: {kind: 'item', id}});
const item = (engine: KitchenEngine, id: string) => engine.snapshot().items.find(i => i.id === id)!;
function play(engine: KitchenEngine, id: RecipeId, until = Infinity) {
  PLAYS[id].slice(0, until).forEach(([actor, target]) => {
    if (actor === 'cook') { engine.advance(target as number); return; }
    expect(drop(engine, actor, target as string), `${actor} → ${target}`).toMatchObject({accepted: true});
  });
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
  const at = (id: string) => toClient(kitchen.engine.snapshot().items.find(i => i.id === id)!.anchor, kitchen.scene.getView());
  const move = (point: {x: number; y: number}, pointer = 1) => { event(surface, 'pointermove', point, pointer); for (const callback of frames.splice(0)) callback(0); };
  const begin = (id: RecipeId) => root.querySelector<HTMLButtonElement>(`#recipe-${id}`)!.click();
  return {...kitchen, root, surface, node, event, at, move, begin,
    rotate(value: boolean) { portrait = value; query.dispatchEvent(new Event('change')); },
    dragItem(id: string, target: {x: number; y: number}, pointer = 1) { event(node(id), 'pointerdown', at(id), pointer); move(target, pointer); event(surface, 'pointerup', target, pointer); },
    dragTo(id: string, target: string, pointer = 1) { this.dragItem(id, at(target), pointer); },
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
    kitchen.root.querySelector<HTMLButtonElement>('#recipe-moelleux')!.click();
    expect(kitchen.engine.snapshot()).toMatchObject({recipe: 'moelleux', phase: 'playing'});
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
    const k = mount(); k.begin('chicken'); play(k.engine, 'chicken', 10); k.refresh();
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
    const fresh = mount(); fresh.begin('chicken');
    expect(fresh.engine.snapshot()).toMatchObject({phase: 'playing', activeTimeMs: 0, cookingRemainingMs: 0, invalidActions: 0});
    expect(fresh.node('chicken').dataset.state).toBe('raw');
  });
  it('cancels an in-flight pointer, animation frame, effects and feedback timers on disposal', () => {
    const k = mount(); k.begin('avocado-toast');
    k.dragTo('avocado', 'cutting-board'); k.dragTo('knife', 'avocado');
    k.dragTo('honey', 'plate'); // Rejection schedules UI feedback cleanup.
    const capture = vi.fn(() => true), release = vi.fn();
    k.surface.hasPointerCapture = capture; k.surface.releasePointerCapture = release;
    k.event(k.node('honey'), 'pointerdown', k.at('honey'));
    k.event(k.surface, 'pointermove', k.at('bowl')); // Leave the frame pending.
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
    const outside = document.createElement('div'); outside.innerHTML = '<button>Prairie</button><h1>Prairie</h1><nav>Menu</nav><small>Info</small><img alt="">';
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

describe('recipe book', () => {
  it('offers avocado toast, moelleux and chicken, without the salad, each paid by the game', () => {
    expect(RECIPE_IDS).toEqual(['avocado-toast', 'moelleux', 'chicken']);
    expect(RECIPES.map(r => r.id).sort()).toEqual(Object.keys(CUISINE_REWARDS).sort());
    for (const gone of ['salad', 'mozzarella', 'tomato', 'cucumber', 'olive-oil']) {
      expect(RECIPES.some(r => r.id === gone)).toBe(false); expect(ITEMS.some(i => i.id === gone)).toBe(false);
    }
  });
  it('follows the owner’s avocado toast exactly: avocado, cut, honey and soy, cut shallot, mix, toast, spread, smoked salmon', () => {
    const steps = allSteps(recipe('avocado-toast')).map(s => `${s.actor}>${s.target}`);
    expect(steps).toEqual(['avocado>cutting-board', 'knife>avocado', 'avocado>bowl', 'honey>bowl', 'soy>bowl',
      'shallot>cutting-board', 'knife>shallot', 'shallot>bowl', 'spoon>bowl', 'bread>pan', 'bowl>plate', 'salmon>plate']);
    expect(recipe('avocado-toast').chains).toHaveLength(1); // One strict order.
  });
  it('bakes a real moelleux: melted chocolate and butter, eggs whisked with sugar, chocolate, flour, mould, oven', () => {
    const r = recipe('moelleux');
    expect(r.chains.map(c => c.map(s => `${s.actor}>${s.target}`))).toEqual([['chocolate>saucepan', 'butter>saucepan'], ['eggs>bowl', 'sugar>bowl', 'whisk>bowl']]);
    expect(r.finale.map(s => `${s.actor}>${s.target}`)).toEqual(['saucepan>bowl', 'flour>bowl', 'whisk>bowl', 'bowl>mould', 'mould>oven']);
    expect(r.finale.at(-1)!.cook).toMatchObject({ms: 5000, heater: 'oven', container: 'mould', set: {mould: 'baked'}});
  });
  it('has a painted picture for every object state any recipe can reach, and for every finished dish', () => {
    for (const r of RECIPES) {
      const seen = new Map(ITEMS.filter(i => r.layout[i.id]).map(i => [i.id, new Set([i.state])]));
      for (const s of allSteps(r)) for (const changes of [s.set, s.cook?.set]) for (const [id, change] of Object.entries(changes ?? {}))
        for (const state of typeof change === 'string' ? [change] : Object.values(change)) seen.get(id)!.add(state);
      for (const [id, states] of seen) for (const state of states) {
        const def = ITEMS.find(i => i.id === id)!, key = state ? `${def.art}-${state}` : def.art;
        expect(ART_URLS[key], `${r.id}: ${key}`).toBeTruthy(); expect(artKey({art: def.art, state})).toBe(key);
      }
      expect(ART_URLS[r.dish], r.dish).toBeTruthy();
      expect(finishedDishArt(r.id)).toContain(`data-dish="${r.id}"`);
    }
    expect(ART_URLS.backdrop).toBeTruthy(); expect(ART_URLS.steam).toBeTruthy();
  });
  it('lays out every recipe inside the 1000 × 440 table, clear of the chef rabbit and of each other’s anchors', () => {
    for (const r of RECIPES) {
      const placed = ITEMS.filter(i => r.layout[i.id]);
      for (const i of placed) {
        const {x, y} = r.layout[i.id];
        expect(x - i.width / 2, `${r.id}:${i.id}`).toBeGreaterThanOrEqual(110); expect(x + i.width / 2).toBeLessThanOrEqual(1000);
        expect(y - i.height / 2, `${r.id}:${i.id}`).toBeGreaterThanOrEqual(20); expect(y + i.height / 2).toBeLessThanOrEqual(440);
      }
      for (const s of allSteps(r)) { expect(r.layout[s.actor], `${r.id}:${s.actor}`).toBeDefined(); expect(r.layout[s.target], `${r.id}:${s.target}`).toBeDefined(); }
    }
  });
});

describe('step engine', () => {
  it.each(RECIPE_IDS)('plays %s from start to finish and reports completion once', id => {
    const e = new KitchenEngine();
    expect(e.dispatch({type: 'start-recipe', recipeId: id})).toMatchObject({accepted: true});
    expect(e.snapshot().items.filter(i => i.visible).map(i => i.id).sort()).toEqual(Object.keys(recipe(id).layout).sort());
    play(e, id);
    expect(e.snapshot()).toMatchObject({phase: 'completed', invalidActions: 0, cookingRemainingMs: 0, doneSteps: allSteps(recipe(id)).length, current: -1});
  });
  it('refuses early or misplaced drops with the next instruction, counts them, and changes nothing', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'avocado-toast'});
    const before = e.snapshot().items;
    expect(drop(e, 'salmon', 'plate')).toEqual({accepted: false, message: 'Pas encore : pose l’avocat sur la planche.'});
    expect(drop(e, 'avocado', 'bowl')).toEqual({accepted: false, message: 'Pas ici : pose l’avocat sur la planche.'});
    expect(e.dispatch({type: 'drop', itemId: 'avocado', target: null})).toMatchObject({accepted: false});
    expect(e.snapshot()).toMatchObject({invalidActions: 3, doneSteps: 0});
    expect(e.snapshot().items).toEqual(before);
  });
  it('keeps the owner’s order: no honey before the avocado is cut and in the bowl, no toast before the mix', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'avocado-toast'});
    play(e, 'avocado-toast', 2);
    expect(drop(e, 'honey', 'bowl').accepted).toBe(false);
    expect(drop(e, 'avocado', 'bowl').accepted).toBe(true);
    expect(drop(e, 'soy', 'bowl').accepted).toBe(false); // Honey first.
    expect(drop(e, 'honey', 'bowl').accepted).toBe(true); expect(item(e, 'bowl').state).toBe('honey');
    expect(drop(e, 'soy', 'bowl').accepted).toBe(true); expect(item(e, 'bowl').state).toBe('soy');
    expect(drop(e, 'bread', 'pan').accepted).toBe(false);
    for (const [a, b] of [['shallot', 'cutting-board'], ['knife', 'shallot'], ['shallot', 'bowl']]) expect(drop(e, a, b).accepted).toBe(true);
    expect(drop(e, 'bread', 'pan').accepted).toBe(false); // Mix first.
    expect(drop(e, 'spoon', 'bowl')).toMatchObject({accepted: true, effect: 'mix'});
    expect(item(e, 'bowl').state).toBe('mixed');
  });
  it('toasts the bread for three active seconds on the stove, then sets it on the plate', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'avocado-toast'});
    play(e, 'avocado-toast', 10);
    expect(e.snapshot()).toMatchObject({cookingRemainingMs: 3000, cookingHeater: 'stove', cookingContainer: 'pan'});
    expect(item(e, 'pan')).toMatchObject({state: 'bread', visible: true}); expect(item(e, 'bread').visible).toBe(false);
    expect(e.canDrag('bowl')).toBe(false); // Nothing moves while it cooks.
    expect(drop(e, 'bowl', 'plate')).toMatchObject({accepted: false});
    expect(e.snapshot().invalidActions).toBe(0);
    e.setPaused('portrait', true); e.advance(5000); expect(e.snapshot().cookingRemainingMs).toBe(3000);
    e.setPaused('portrait', false); expect(e.advance(2999)).toBeNull();
    expect(e.advance(1)).toEqual({accepted: true, message: 'Tartines dorées, posées sur l’assiette !', effect: 'cooked', effectTargetId: 'pan'});
    expect(item(e, 'pan').state).toBe('empty'); expect(item(e, 'plate').state).toBe('toast');
    expect(drop(e, 'bowl', 'plate')).toMatchObject({accepted: true, effect: 'spread'});
    expect([item(e, 'bowl').state, item(e, 'plate').state]).toEqual(['empty', 'avocado']);
    expect(drop(e, 'salmon', 'plate').accepted).toBe(true);
    expect(e.snapshot()).toMatchObject({phase: 'completed'}); expect(item(e, 'plate').state).toBe('salmon');
  });
  it('lets the moelleux chains interleave, but waits for both before the melted chocolate', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'moelleux'});
    expect(drop(e, 'eggs', 'bowl').accepted).toBe(true);
    expect(drop(e, 'chocolate', 'saucepan').accepted).toBe(true);
    expect(drop(e, 'sugar', 'bowl').accepted).toBe(true);
    expect(drop(e, 'butter', 'saucepan')).toMatchObject({accepted: true, effect: 'melt'});
    expect(item(e, 'saucepan').state).toBe('melted');
    expect(drop(e, 'saucepan', 'bowl').accepted).toBe(false); // Whisk the eggs and sugar first.
    expect(drop(e, 'whisk', 'bowl').accepted).toBe(true); expect(item(e, 'bowl').state).toBe('whisked');
    expect(drop(e, 'saucepan', 'bowl').accepted).toBe(true);
    expect([item(e, 'saucepan').state, item(e, 'bowl').state, item(e, 'saucepan').location]).toEqual(['empty', 'chocolate', 'home']);
    for (const [a, b] of [['flour', 'bowl'], ['whisk', 'bowl'], ['bowl', 'mould']]) expect(drop(e, a, b).accepted).toBe(true);
    expect(drop(e, 'mould', 'oven')).toMatchObject({accepted: true, effect: 'oven'});
    expect(item(e, 'mould')).toMatchObject({location: 'heating', state: 'batter'});
    e.advance(5000);
    expect(item(e, 'mould')).toMatchObject({location: 'home', state: 'baked', visible: true});
    expect(e.snapshot().phase).toBe('completed');
  });
  it('accepts either chicken chain first, keeps one food on the board, and fills the dish in either order', () => {
    for (const first of ['chicken', 'sweet-potato'] as const) {
      const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'chicken'});
      const other = first === 'chicken' ? 'sweet-potato' : 'chicken';
      expect(drop(e, first, 'cutting-board').accepted).toBe(true);
      expect(drop(e, other, 'cutting-board').message).toMatch(/^La planche est occupée/);
      const chain = (id: string) => id === 'chicken' ? [['knife', 'chicken'], ['soy', 'chicken'], ['honey', 'chicken'], ['chicken', 'baking-dish']] : [['peeler', 'sweet-potato'], ['knife', 'sweet-potato'], ['sweet-potato', 'baking-dish']];
      for (const [a, b] of chain(first)) expect(drop(e, a, b).accepted).toBe(true);
      expect(item(e, 'baking-dish').state).toBe(first);
      expect(drop(e, 'baking-dish', 'oven').accepted).toBe(false);
      expect(drop(e, other, 'cutting-board').accepted).toBe(true);
      for (const [a, b] of chain(other)) expect(drop(e, a, b).accepted).toBe(true);
      expect(item(e, 'baking-dish').state).toBe('both');
      expect(drop(e, 'baking-dish', 'oven').accepted).toBe(true);
      e.advance(5000); expect(item(e, 'baking-dish').state).toBe('cooked'); expect(e.snapshot().phase).toBe('completed');
    }
  });
  it('requires soy before honey and peeling before cutting, with the next instruction', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'chicken'});
    drop(e, 'chicken', 'cutting-board');
    expect(drop(e, 'soy', 'chicken').message).toBe('Pas encore : coupe le poulet avec le couteau.');
    drop(e, 'knife', 'chicken');
    expect(drop(e, 'honey', 'chicken').accepted).toBe(false);
    expect(drop(e, 'soy', 'chicken')).toMatchObject({accepted: true, effect: 'season'}); expect(item(e, 'chicken').state).toBe('soy');
    expect(drop(e, 'honey', 'chicken').accepted).toBe(true); expect(item(e, 'chicken').state).toBe('glazed');
    drop(e, 'chicken', 'baking-dish'); drop(e, 'sweet-potato', 'cutting-board');
    expect(drop(e, 'knife', 'sweet-potato').accepted).toBe(false);
    expect(drop(e, 'peeler', 'sweet-potato')).toMatchObject({accepted: true, effect: 'peel'});
  });
  it('replay resets every object, state, error and time; choosing hides the table', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'moelleux'});
    drop(e, 'flour', 'bowl'); play(e, 'moelleux', 5); e.advance(1200);
    e.dispatch({type: 'reset-recipe'});
    expect(e.snapshot()).toMatchObject({phase: 'playing', recipe: 'moelleux', invalidActions: 0, activeTimeMs: 0, doneSteps: 0});
    expect(item(e, 'bowl').state).toBe('empty'); expect(item(e, 'eggs').visible).toBe(true);
    e.dispatch({type: 'choose-recipe'});
    expect(e.snapshot()).toMatchObject({phase: 'choosing', recipe: null}); expect(e.snapshot().items.every(i => !i.visible)).toBe(true);
  });
  it('measures elapsed active time only while playing in landscape and foreground', () => {
    const e = new KitchenEngine(); e.advance(500); e.dispatch({type: 'start-recipe', recipeId: 'chicken'}); e.advance(250);
    e.setPaused('portrait', true); e.advance(1000); e.setPaused('portrait', false); e.setPaused('hidden', true); e.advance(1000); e.setPaused('hidden', false); e.advance(250);
    expect(e.snapshot().activeTimeMs).toBe(500);
  });
});

describe('geometry', () => {
  it.each([[667, 270], [844, 300], [1400, 700]])('fits %sx%s and keeps every movable object at least 48 px', (width, height) => {
    const view = fitScene({left: 17, top: 30, width, height}); expect(view.width).toBeLessThanOrEqual(width); expect(view.height).toBeLessThanOrEqual(height);
    for (const r of RECIPES) for (const i of ITEMS.filter(i => r.layout[i.id] && i.draggable)) {
      const box = hitBox(r.layout[i.id], i.width, i.height, view); expect(box.width).toBeGreaterThanOrEqual(48); expect(box.height).toBeGreaterThanOrEqual(48);
    }
  });
  it('resolves the knife over the food lying on the board, and the board for a food', () => {
    const e = new KitchenEngine(); e.dispatch({type: 'start-recipe', recipeId: 'avocado-toast'}); const view = fitScene({left: 0, top: 0, width: 1000, height: 440});
    const board = recipe('avocado-toast').layout['cutting-board'];
    expect(resolveDrop(board, 'avocado', e.snapshot(), view, t => e.preview('avocado', t).accepted)).toEqual({kind: 'item', id: 'cutting-board'});
    drop(e, 'avocado', 'cutting-board');
    expect(resolveDrop(item(e, 'avocado').anchor, 'knife', e.snapshot(), view, t => e.preview('knife', t).accepted)).toEqual({kind: 'item', id: 'avocado'});
    expect(resolveDrop({x: -5, y: 10}, 'knife', e.snapshot(), view)).toBeNull();
  });
});

describe('DOM, Pointer Events and UI', () => {
  it('starts at the recipe cards, then shows only the chosen recipe’s objects with the guide', () => {
    const k = mount(); expect(k.root.querySelector<HTMLElement>('#recipe-screen')!.hidden).toBe(false);
    expect([...k.root.querySelectorAll<HTMLElement>('.menu-recipe')].map(b => b.id)).toEqual(['recipe-avocado-toast', 'recipe-moelleux', 'recipe-chicken']);
    expect(k.root.querySelector('#recipe-salad')).toBeNull();
    k.begin('avocado-toast');
    expect(k.root.querySelector<HTMLElement>('#recipe-screen')!.hidden).toBe(true); expect(k.node('chicken').hidden).toBe(true); expect(k.node('avocado').hidden).toBe(false);
    expect(k.root.querySelector('#kitchen-title')!.textContent).toBe('Avocado toast');
    expect(k.root.querySelector('#guide-hint')!.textContent).toBe('Pose l’avocat sur la planche');
    expect(k.root.querySelector('#guide-count')!.textContent).toBe('Étape 1 sur 12');
    expect(k.root.querySelectorAll('#guide-steps li')).toHaveLength(12);
    expect(k.root.querySelector('.guide-thumb img')!.getAttribute('src')).toBe(ART_URLS['avocado-whole']);
    expect(k.node('avocado').dataset.hint).toBe('actor'); expect(k.node('cutting-board').dataset.hint).toBe('target');
    expect(k.root.querySelector<HTMLElement>('#recipe-guide')!.getAttribute('aria-label')).toContain('ajoute la tranche de saumon fumé');
  });
  it('drags with down → move → up, changes the painted state, returns the knife and plays effects', () => {
    const k = mount(); k.begin('avocado-toast');
    k.dragTo('avocado', 'cutting-board'); expect(k.node('avocado').dataset.location).toBe('cutting-board');
    expect(k.node('avocado').querySelector('img')!.getAttribute('src')).toBe(ART_URLS['avocado-whole']);
    k.dragItem('knife', k.at('avocado'));
    expect(k.node('avocado').dataset.state).toBe('cut');
    expect(k.node('avocado').querySelector('img')!.getAttribute('src')).toBe(ART_URLS['avocado-cut']);
    expect(k.node('avocado').dataset.effect).toBe('cut');
    expect(k.engine.snapshot().items.find(i => i.id === 'knife')!.anchor).toEqual(recipe('avocado-toast').layout.knife);
    k.dragTo('avocado', 'bowl');
    expect(k.node('avocado').hidden).toBe(true); expect(k.node('bowl').dataset.accessibleName).toBe('Saladier, avec l’avocat coupé');
    expect(k.root.querySelector('#guide-count')!.textContent).toBe('Étape 4 sur 12');
    expect([...k.root.querySelectorAll<HTMLElement>('#guide-steps li')].map(li => li.dataset.step).slice(0, 5)).toEqual(['done', 'done', 'done', 'next', 'todo']);
  });
  it('shows the cooking on the stove and finishes the toast through real drags', () => {
    const completed = vi.fn(); const k = mount(false, completed); k.begin('avocado-toast');
    play(k.engine, 'avocado-toast', 9); k.refresh();
    k.dragTo('bread', 'pan');
    expect(k.node('stove').dataset.cooking).toBe('true'); expect(k.node('pan').dataset.cooking).toBe('true');
    expect(k.node('pan').hidden).toBe(false);
    expect(k.root.querySelector('#guide-hint')!.textContent).toBe('Ça cuit…');
    vi.advanceTimersByTime(1500);
    expect(k.node('stove').style.getPropertyValue('--cook-progress')).toBe('180deg');
    vi.advanceTimersByTime(1600);
    expect(k.node('stove').dataset.cooking).toBe('false'); expect(k.node('plate').dataset.state).toBe('toast');
    expect(k.node('pan').dataset.effect).toBe('cooked');
    expect(k.root.querySelector('#kitchen-message')!.textContent).toBe('Tartines dorées, posées sur l’assiette !');
    k.dragTo('bowl', 'plate'); k.dragTo('salmon', 'plate');
    expect(completed).toHaveBeenCalledOnce();
    expect(completed.mock.calls[0][0]).toMatchObject({recipeId: 'avocado-toast', invalidActions: 0});
    expect(k.root.querySelector<HTMLElement>('#result-screen')!.hidden).toBe(false);
    expect(k.root.querySelector('#result-title')!.textContent).toBe('Avocado toast réussi !');
    expect(k.root.querySelector('.result-art [data-dish="avocado-toast"] img')!.getAttribute('src')).toBe(ART_URLS['plate-salmon']);
  });
  it('counts invalid drops but not pointercancel, a second finger, or rotation', () => {
    const k = mount(); k.begin('moelleux'); k.dragTo('flour', 'bowl'); expect(k.engine.snapshot().invalidActions).toBe(1);
    expect(k.root.querySelector('#kitchen-message')!.textContent).toMatch(/^Pas encore/);
    k.event(k.node('eggs'), 'pointerdown', k.at('eggs')); k.move(k.at('bowl')); k.event(k.surface, 'pointercancel', k.at('bowl'));
    k.event(k.node('butter'), 'pointerdown', k.at('butter')); k.move(k.at('saucepan')); k.event(document.body, 'pointerdown', {x: 1, y: 1}, 2);
    expect(k.engine.snapshot().invalidActions).toBe(1); k.rotate(true); expect(k.engine.snapshot().invalidActions).toBe(1);
    expect(k.engine.snapshot().doneSteps).toBe(0);
  });
  it('selects on tap without moving anything, and tells what the object is for', () => {
    const k = mount(); k.begin('chicken');
    k.tapItem('chicken');
    expect(k.engine.snapshot()).toMatchObject({selectedId: 'chicken', invalidActions: 0, doneSteps: 0});
    expect(k.root.querySelector('#kitchen-message')!.textContent).toBe('Poulet : pose le poulet sur la planche.');
    expect(k.node('chicken').dataset.selected).toBe('true');
  });
  it('blocks every action in portrait and keeps the recipe through the landscape return', () => {
    const k = mount(); k.begin('chicken'); k.rotate(true); expect(k.engine.canDrag('chicken')).toBe(false);
    expect(k.root.querySelector<HTMLElement>('#orientation-screen')!.hidden).toBe(false); k.node('soy').click(); expect(k.engine.snapshot().invalidActions).toBe(0);
    k.rotate(false); expect(k.root.querySelector<HTMLElement>('#orientation-screen')!.hidden).toBe(true);
    k.dragTo('chicken', 'cutting-board'); expect(k.node('chicken').dataset.location).toBe('cutting-board');
  });
  it('replays through the result card and returns to a fresh recipe; the chooser lists the recipes again', () => {
    const k = mount(); k.begin('moelleux'); play(k.engine, 'moelleux'); k.refresh();
    expect(k.root.querySelector<HTMLElement>('#result-screen')!.hidden).toBe(false);
    expect(k.root.querySelector('#result-title')!.textContent).toBe('Moelleux réussi !');
    k.root.querySelector<HTMLButtonElement>('#recipe-replay')!.click();
    expect(k.engine.snapshot()).toMatchObject({phase: 'playing', recipe: 'moelleux', activeTimeMs: 0, invalidActions: 0});
    expect(k.node('mould').dataset.state).toBe('empty'); expect(k.root.querySelector<HTMLElement>('#result-screen')!.hidden).toBe(true);
    play(k.engine, 'moelleux'); k.refresh();
    k.root.querySelector<HTMLButtonElement>('#recipe-choose')!.click();
    expect(k.root.querySelector<HTMLElement>('#recipe-screen')!.hidden).toBe(false); expect(k.engine.snapshot().recipe).toBeNull();
  });
});
