import {KitchenEngine, type RecipeId} from './engine';
import {fitScene, type Rect} from './geometry';
import {createScene} from './scene';
import {bindKitchenDrag} from './drag';
import {mountKitchenUI} from './ui';
import kitchenCSS from './style.css?raw';
import shell from './shell.html?raw';

export interface RecipeCompletion {readonly recipeId: RecipeId; readonly activeTimeMs: number; readonly invalidActions: number}
export type KitchenPresentationEvent = 'success' | 'invalid' | 'reset' | 'complete';
export interface MountOptions {
  portraitQuery?: MediaQueryList; measureSurface?: () => Rect;
  onRecipeCompleted?: (result: RecipeCompletion) => void;
  onPresentationEvent?: (event: KitchenPresentationEvent) => void;
}
/** One active activity. The caller sizes the host; disposal removes only the owned subtree. */
export function mountKitchen(host: HTMLElement, options: MountOptions = {}) {
  const root = document.createElement('section'); root.className = 'cuisine-root'; root.lang = 'fr';
  const style = document.createElement('style'); style.textContent = kitchenCSS;
  root.innerHTML = shell; root.prepend(style); host.append(root);
  const abort = new AbortController(), engine = new KitchenEngine();
  let ui: ReturnType<typeof mountKitchenUI>;
  const surface = root.querySelector<HTMLElement>('#kitchen-surface')!, world = root.querySelector<HTMLElement>('#kitchen-world')!;
  const scene = createScene(world);
  let resetRequested = false;
  const dispatch = (intent: import('./engine').Intention) => {
    const result = engine.dispatch(intent);
    resetRequested = result.accepted && ['start-recipe', 'reset-recipe', 'choose-recipe'].includes(intent.type);
    if (intent.type === 'start-recipe' || intent.type === 'reset-recipe') previous = performance.now();
    if (intent.type === 'reset-recipe') scene.snap(engine.snapshot());
    render(); return result;
  };
  ui = mountKitchenUI(root, dispatch);
  const drag = bindKitchenDrag(surface, engine, scene, result => { ui.report(result); render(); });
  const portrait = options.portraitQuery ?? window.matchMedia('(orientation: portrait)');
  let disposed = false, completionReported = false, previous = performance.now();
  let presented = engine.snapshot();
  const render = () => {
    if (disposed) return;
    const snapshot = engine.snapshot(); scene.render(snapshot); ui.render(snapshot);
    // Observe committed state only: previews, selection and technical drag cancellation do not qualify.
    let event: KitchenPresentationEvent | undefined;
    if (snapshot.phase === 'completed' && presented.phase !== 'completed') event = 'complete';
    else if (resetRequested || snapshot.recipe !== presented.recipe || snapshot.phase !== presented.phase ||
      snapshot.invalidActions < presented.invalidActions || snapshot.activeTimeMs < presented.activeTimeMs) event = 'reset';
    else if (snapshot.invalidActions > presented.invalidActions) event = 'invalid';
    else if (snapshot.items.some(item => {
      const before = presented.items.find(old => old.id === item.id);
      return before && (item.preparation !== before.preparation ||
        Object.keys(item.flags).some(flag => item.flags[flag] !== before.flags[flag]) ||
        item.location !== before.location && ['bowl', 'baking-dish', 'oven'].includes(item.location));
    })) event = 'success';
    presented = snapshot;
    resetRequested = false;
    if (event) options.onPresentationEvent?.(event);
    if (snapshot.phase !== 'completed') completionReported = false;
    else if (!completionReported && snapshot.recipe) {
      completionReported = true;
      options.onRecipeCompleted?.({recipeId: snapshot.recipe, activeTimeMs: snapshot.activeTimeMs, invalidActions: snapshot.invalidActions});
    }
  };
  function refresh(): void {
    if (disposed) return;
    const next = fitScene(options.measureSurface?.() ?? surface.getBoundingClientRect()), old = scene.getView();
    const changed = !old || ['width', 'height', 'left', 'top'].some(key => Math.abs(next[key as keyof Rect] - old[key as keyof Rect]) > .5);
    if (changed || portrait.matches !== engine.snapshot().pauses.includes('portrait')) drag.cancel();
    engine.setPaused('portrait', portrait.matches);
    scene.setView(next); render(); previous = performance.now();
  }
  function visibility(): void { drag.cancel(); engine.setPaused('hidden', document.hidden); previous = performance.now(); render(); }
  const hide = () => { drag.cancel(); engine.setPaused('hidden', true); render(); };
  const show = () => { engine.setPaused('hidden', document.hidden); refresh(); };
  portrait.addEventListener('change', refresh);
  window.addEventListener('resize', refresh, {signal: abort.signal});
  window.visualViewport?.addEventListener('resize', refresh, {signal: abort.signal});
  window.visualViewport?.addEventListener('scroll', refresh, {signal: abort.signal});
  document.addEventListener('visibilitychange', visibility, {signal: abort.signal});
  window.addEventListener('pagehide', hide, {signal: abort.signal}); window.addEventListener('pageshow', show, {signal: abort.signal});
  const observer = new ResizeObserver(refresh); observer.observe(surface);
  // Foundation for future active-time cooking, never a countdown or a score.
  const clock = setInterval(() => { const now = performance.now(); engine.advance(now - previous); previous = now; if (engine.snapshot().recipe === 'chicken') render(); }, 100);
  engine.setPaused('hidden', document.hidden); refresh();
  return {root, engine, scene, drag, refresh, dispose() {
    if (disposed) return; disposed = true; clearInterval(clock); observer.disconnect(); abort.abort();
    portrait.removeEventListener('change', refresh); drag.dispose(); scene.dispose(); ui.dispose(); root.remove();
  }};
}
