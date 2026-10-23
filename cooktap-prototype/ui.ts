import type {ActionResult, Intention, KitchenSnapshot} from './engine';
import {finishedDishArt} from './art';
/** Short step chips for the header guide; the full sentence stays in its aria-label. */
const STEPS = {
  salad: [['Couper'], ['Saladier'], ['Huile']],
  chicken: [['Poulet', 'soja', 'miel'], ['Patate', 'éplucher'], ['Plat', 'four']],
} as const;
const chips = (recipe: 'salad' | 'chicken') => STEPS[recipe].map(([head, ...rest]) =>
  `<span class="guide-step"><b>${head}</b>${rest.map(step => ` › ${step}`).join('')}</span>`).join('<span class="guide-sep" aria-hidden="true">·</span>');
export function mountKitchenUI(root: HTMLElement, dispatch: (intent: Intention) => ActionResult) {
  const abort = new AbortController(), status = root.querySelector<HTMLElement>('#kitchen-message')!;
  const portrait = root.querySelector<HTMLElement>('#orientation-screen')!, shell = root.querySelector<HTMLElement>('#scene-shell')!;
  const picker = root.querySelector<HTMLElement>('#recipe-screen')!, result = root.querySelector<HTMLElement>('#result-screen')!;
  let clearMessage: ReturnType<typeof setTimeout> | undefined, activeRecipe: 'salad' | 'chicken' | null = null;
  let shownRecipe: string | undefined;
  for (const art of root.querySelectorAll<HTMLElement>('[data-recipe-art]')) art.innerHTML = finishedDishArt(art.dataset.recipeArt as 'salad' | 'chicken');
  const report = (action: ActionResult) => {
    if (clearMessage) clearTimeout(clearMessage);
    status.textContent = action.message; status.dataset.tone = action.accepted ? 'ok' : 'notice';
    if (!action.accepted) clearMessage = setTimeout(() => { status.textContent = activeRecipe === 'chicken' ? 'Prépare le poulet et la patate douce, puis place le plat complet au four.' : 'La planche accueille un ingrédient à la fois. Préparez les trois dans l’ordre de votre choix.'; delete status.dataset.tone; }, 2800);
  };
  const invoke = (intent: Intention) => { const action = dispatch(intent); report(action); return action; };
  root.querySelector('#recipe-salad')!.addEventListener('click', () => invoke({type: 'start-recipe', recipeId: 'salad'}), {signal: abort.signal});
  root.querySelector('#recipe-chicken')!.addEventListener('click', () => invoke({type: 'start-recipe', recipeId: 'chicken'}), {signal: abort.signal});
  root.querySelector('#recipe-replay')!.addEventListener('click', () => invoke({type: 'reset-recipe'}), {signal: abort.signal});
  root.querySelector('#recipe-choose')!.addEventListener('click', () => invoke({type: 'choose-recipe'}), {signal: abort.signal});
  return {
    report,
    render(snapshot: KitchenSnapshot) {
      const rotated = snapshot.pauses.includes('portrait'), choosing = snapshot.phase === 'choosing', completed = snapshot.phase === 'completed';
      activeRecipe = snapshot.recipe;
      root.dataset.recipePhase = snapshot.phase; root.dataset.recipe = snapshot.recipe ?? '';
      portrait.hidden = !rotated; root.dataset.portrait = String(rotated);
      picker.hidden = !choosing; result.hidden = !completed;
      shell.inert = snapshot.pauses.length > 0 || choosing || completed;
      shell.setAttribute('aria-hidden', String(rotated || choosing || completed));
      const guide = root.querySelector<HTMLElement>('#recipe-guide')!;
      if (snapshot.recipe !== shownRecipe) {
        shownRecipe = snapshot.recipe ?? '';
        guide.innerHTML = snapshot.recipe ? chips(snapshot.recipe) : '';
        root.querySelector('#kitchen-title')!.textContent = snapshot.recipe === 'chicken' ? 'Poulet soja-miel' : snapshot.recipe === 'salad' ? 'Salade fraîche' : 'Choisis une recette';
        root.querySelector('.result-art')!.innerHTML = snapshot.recipe ? finishedDishArt(snapshot.recipe) : '';
      }
      if (snapshot.recipe === 'chicken') { guide.setAttribute('aria-label', 'Poulet : couper, ajouter sauce soja puis miel. Patate douce : éplucher puis couper. Mettre les deux dans le plat et cuire au four.'); }
      else if (snapshot.recipe === 'salad') { guide.setAttribute('aria-label', 'Salade : couper mozzarella, tomate et concombre, mettre dans le saladier puis ajouter huile d’olive.'); }
      if (snapshot.recipe === 'chicken') { root.querySelector('#result-title')!.textContent = 'Poulet soja-miel réussi !'; root.querySelector('#result-copy')!.textContent = 'Le poulet et la patate douce sont cuits à point.'; }
      else { root.querySelector('#result-title')!.textContent = 'Salade réussie !'; root.querySelector('#result-copy')!.textContent = 'Une salade fraîche, préparée sur la table.'; }
      if (completed) {
        root.querySelector('#result-time')!.textContent = `${(snapshot.activeTimeMs / 1000).toFixed(1).replace('.', ',')} s`;
        root.querySelector('#result-errors')!.textContent = String(snapshot.invalidActions);
      }
    },
    dispose() { abort.abort(); if (clearMessage) clearTimeout(clearMessage); },
  };
}
