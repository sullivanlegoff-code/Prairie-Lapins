import type {ActionResult, Intention, KitchenSnapshot} from './engine';
import {ART_URLS, artImage, artKey, finishedDishArt} from './art';
import {RECIPES, recipe} from './recipes';

export function mountKitchenUI(root: HTMLElement, dispatch: (intent: Intention) => ActionResult) {
  const abort = new AbortController(), status = root.querySelector<HTMLElement>('#kitchen-message')!;
  const portrait = root.querySelector<HTMLElement>('#orientation-screen')!, shell = root.querySelector<HTMLElement>('#scene-shell')!;
  const picker = root.querySelector<HTMLElement>('#recipe-screen')!, result = root.querySelector<HTMLElement>('#result-screen')!;
  const guide = root.querySelector<HTMLElement>('#recipe-guide')!, thumb = guide.querySelector<HTMLElement>('.guide-thumb')!;
  const hint = root.querySelector<HTMLElement>('#guide-hint')!, count = root.querySelector<HTMLElement>('#guide-count')!, list = root.querySelector<HTMLElement>('#guide-steps')!;
  let clearMessage: ReturnType<typeof setTimeout> | undefined, currentHint = 'Choisis une recette.';
  let shownRecipe: string | undefined, shownThumb = '';
  // One card per recipe, built from the recipe data (no salad any more: avocado toast, moelleux, chicken).
  root.querySelector('#recipe-list')!.innerHTML = RECIPES.map(r => `<button id="recipe-${r.id}" class="menu-recipe" type="button" data-recipe="${r.id}"><span class="recipe-art" aria-hidden="true">${finishedDishArt(r.id)}</span><span class="recipe-words"><strong>${r.name}</strong><small>${r.summary}</small><span class="recipe-meta">${r.chains.flat().length + r.finale.length} étapes</span></span><span class="recipe-go" aria-hidden="true">›</span></button>`).join('');
  const report = (action: ActionResult) => {
    if (clearMessage) clearTimeout(clearMessage);
    status.textContent = action.message; status.dataset.tone = action.accepted ? 'ok' : 'notice';
    if (!action.accepted) clearMessage = setTimeout(() => { status.textContent = currentHint; delete status.dataset.tone; }, 2800);
  };
  const invoke = (intent: Intention) => { const action = dispatch(intent); report(action); return action; };
  for (const r of RECIPES) root.querySelector(`#recipe-${r.id}`)!.addEventListener('click', () => invoke({type: 'start-recipe', recipeId: r.id}), {signal: abort.signal});
  root.querySelector('#recipe-replay')!.addEventListener('click', () => invoke({type: 'reset-recipe'}), {signal: abort.signal});
  root.querySelector('#recipe-choose')!.addEventListener('click', () => invoke({type: 'choose-recipe'}), {signal: abort.signal});
  return {
    report,
    render(snapshot: KitchenSnapshot) {
      const rotated = snapshot.pauses.includes('portrait'), choosing = snapshot.phase === 'choosing', completed = snapshot.phase === 'completed';
      root.dataset.recipePhase = snapshot.phase; root.dataset.recipe = snapshot.recipe ?? '';
      portrait.hidden = !rotated; root.dataset.portrait = String(rotated);
      picker.hidden = !choosing; result.hidden = !completed;
      shell.inert = snapshot.pauses.length > 0 || choosing || completed;
      shell.setAttribute('aria-hidden', String(rotated || choosing || completed));
      const r = snapshot.recipe ? recipe(snapshot.recipe) : null;
      if (snapshot.recipe !== shownRecipe) {
        shownRecipe = snapshot.recipe ?? '';
        root.querySelector('#kitchen-title')!.textContent = r?.title ?? 'Choisis une recette';
        root.querySelector('.result-art')!.innerHTML = r ? finishedDishArt(r.id) : '';
        root.querySelector('#result-title')!.textContent = r?.resultTitle ?? '';
        root.querySelector('#result-copy')!.textContent = r?.resultCopy ?? '';
        guide.setAttribute('aria-label', r ? `${r.name} : ${snapshot.steps.map(s => s.hint.toLowerCase()).join(', ')}.` : '');
        list.innerHTML = snapshot.steps.map(s => `<li title="${s.chip}"></li>`).join('');
      }
      snapshot.steps.forEach((s, k) => { const dot = list.children[k] as HTMLElement | undefined; if (dot) dot.dataset.step = s.done ? 'done' : s.next ? 'next' : 'todo'; });
      // The current instruction: the next step's object, its sentence and the count; the oven or pan while it cooks.
      const next = snapshot.steps[snapshot.current];
      const cooking = snapshot.cookingRemainingMs > 0;
      currentHint = completed ? 'Recette terminée !' : cooking ? 'Ça cuit… patiente un instant.' : next ? `${next.hint}.` : 'Choisis une recette.';
      hint.textContent = completed ? 'Recette terminée !' : cooking ? 'Ça cuit…' : next?.hint ?? '';
      count.textContent = r ? `Étape ${Math.min(snapshot.doneSteps + 1, snapshot.totalSteps)} sur ${snapshot.totalSteps}` : '';
      const subject = cooking ? snapshot.items.find(i => i.id === snapshot.cookingContainer) : next ? snapshot.items.find(i => i.id === next.actor) : undefined;
      const key = subject ? artKey(subject) : completed && r ? r.dish : '';
      if (key !== shownThumb) { shownThumb = key; thumb.innerHTML = key && ART_URLS[key] ? artImage(key) : ''; }
      guide.dataset.cooking = String(cooking);
      if (completed) {
        root.querySelector('#result-time')!.textContent = `${(snapshot.activeTimeMs / 1000).toFixed(1).replace('.', ',')} s`;
        root.querySelector('#result-errors')!.textContent = String(snapshot.invalidActions);
      }
    },
    dispose() { abort.abort(); if (clearMessage) clearTimeout(clearMessage); },
  };
}
