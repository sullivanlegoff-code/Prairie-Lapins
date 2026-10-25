import {mountKitchen, type RecipeCompletion} from '../../cooktap-prototype/main';
import {finishedDishArt} from '../../cooktap-prototype/art';
import type {Rabbit} from '../state/types';
import {portrait} from './portraits';
import {SPECIES} from '../config/balance';
import {setCurrencyText} from '../display/currency';

export type CuisineRabbit = Readonly<Pick<Rabbit, 'id' | 'species'>>;

/** Stable activity layer, deliberately outside GameUI's rebuilt panel content. */
export function mountCuisineActivity(background: HTMLElement, options: {
  onRecipeCompleted?: (result: RecipeCompletion) => string | void;
  quotaText?: () => string;
  onExit?: () => void;
} = {}) {
  const dialog = document.createElement('dialog'); dialog.className = 'cuisine-activity';
  dialog.setAttribute('aria-label', 'Cuisine');
  const controls = document.createElement('div'); controls.className = 'cuisine-activity-controls';
  const companion = document.createElement('div'); companion.className = 'cuisine-companion'; companion.hidden = true;
  const quota = document.createElement('p'); quota.className = 'cuisine-quota'; quota.setAttribute('aria-live', 'polite'); controls.append(quota);
  const exit = document.createElement('button'); exit.type = 'button'; exit.dataset.cuisineExit = '';
  exit.textContent = 'Quitter Cuisine'; controls.append(companion, exit);
  const host = document.createElement('div'); host.className = 'cuisine-activity-host';
  dialog.append(controls, host); document.body.append(dialog);
  const abort = new AbortController();
  let activity: ReturnType<typeof mountKitchen> | null = null;
  let selectedRabbit: CuisineRabbit | null = null;
  const rewardFeedback = document.createElement('p'); rewardFeedback.className = 'cuisine-reward-feedback';
  const resultRabbit = document.createElement('p'); resultRabbit.className = 'cuisine-result-rabbit';
  /** One chip per reward (« +50 pattes · +3 nourriture · … »); a refusal stays a single notice. */
  function showRewards(message: string): void {
    rewardFeedback.replaceChildren(...message.split(' · ').map(part => {
      const chip = document.createElement('span'); chip.className = 'cuisine-reward-chip';
      chip.dataset.kind = /Cœur/.test(part) ? 'heart' : /Affection/.test(part) ? 'affection' : /nourriture/.test(part) ? 'herbs' : /pattes/.test(part) ? 'coins' : 'notice';
      setCurrencyText(chip, part); return chip;
    }));
  }
  let reactionTimer: ReturnType<typeof setTimeout> | undefined;
  /** The selected rabbit on its stool inside the kitchen world (host-owned node; the engine stays rabbit-agnostic). */
  let chef: HTMLElement | null = null;
  const STAND = '<svg viewBox="0 0 100 40" aria-hidden="true"><ellipse cx="50" cy="37" rx="44" ry="4" fill="#5a3a2a26"/><path d="M24 14L18 37M76 14L82 37M50 16V37" stroke="#6e4b3a" stroke-width="5" stroke-linecap="round"/><path d="M24 14L18 37M76 14L82 37M50 16V37" stroke="#a86a3e" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="50" cy="12" rx="40" ry="9" fill="#c4513f" stroke="#6e4b3a" stroke-width="2.5"/><ellipse cx="50" cy="10" rx="31" ry="5" fill="#e0604f"/></svg>';
  // End-of-recipe tasting around the in-scene rabbit: dish presented, hop, « Miam ! », hearts. The result card waits.
  const TASTING_MS = 2000, HEARTS = 5;
  let tasting: HTMLElement | null = null, tastingTimer: ReturnType<typeof setTimeout> | undefined;
  function stopTasting(): void {
    if (tastingTimer !== undefined) clearTimeout(tastingTimer);
    tastingTimer = undefined; tasting?.remove(); tasting = null;
    if (chef) delete chef.dataset.tasting;
    if (activity) delete activity.root.dataset.tasting;
  }
  function taste(recipeId: RecipeCompletion['recipeId']): void {
    stopTasting();
    const layer = document.createElement('span'); layer.className = 'cuisine-tasting'; layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = finishedDishArt(recipeId);
    const bubble = document.createElement('span'); bubble.className = 'cuisine-tasting-bubble'; bubble.textContent = 'Miam !';
    layer.append(bubble);
    for (let n = 0; n < HEARTS; n++) {
      const heart = document.createElement('span'); heart.className = 'cuisine-tasting-heart'; heart.textContent = '♥';
      heart.style.setProperty('--heart-index', String(n)); layer.append(heart);
    }
    if (!chef || !activity) return;
    chef.append(layer); tasting = layer; chef.dataset.tasting = recipeId; activity.root.dataset.tasting = recipeId;
    tastingTimer = setTimeout(stopTasting, TASTING_MS);
  }
  function react(state: 'idle' | 'positive' | 'mistake' | 'celebrate'): void {
    if (reactionTimer !== undefined) clearTimeout(reactionTimer);
    reactionTimer = undefined;
    if (state !== 'celebrate') stopTasting();
    companion.dataset.reaction = state; if (chef) chef.dataset.reaction = state;
    if (state === 'positive' || state === 'mistake') reactionTimer = setTimeout(() => {
      reactionTimer = undefined; companion.dataset.reaction = 'idle'; if (chef) chef.dataset.reaction = 'idle';
    }, 550);
  }
  let disposed = false, wasInert = false;
  let returnFocus: HTMLElement | null = null;
  function close(notify = true): void {
    if (!activity) return;
    stopTasting();
    activity.dispose(); activity = null; chef = null;
    selectedRabbit = null;
    react('idle');
    companion.replaceChildren(); companion.hidden = true;
    if (dialog.open) dialog.close();
    background.inert = wasInert;
    if (notify) { options.onExit?.(); if (returnFocus?.isConnected) returnFocus.focus(); }
    returnFocus = null;
  }
  exit.addEventListener('click', () => close(), {signal: abort.signal});
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, {signal: abort.signal});
  dialog.addEventListener('close', () => { if (!dialog.open) close(); }, {signal: abort.signal});
  return {
    get active() { return activity !== null; },
    get selectedRabbit() { return selectedRabbit; },
    open(rabbit: CuisineRabbit) {
      if (disposed || activity || document.querySelector('dialog[open]')) return;
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      wasInert = background.inert; background.inert = true;
      try {
        selectedRabbit = Object.freeze({id: rabbit.id, species: rabbit.species});
        const art = document.createElement('span'); art.className = 'cuisine-companion-art';
        art.setAttribute('aria-hidden', 'true'); art.innerHTML = portrait(rabbit.species);
        const name = document.createElement('span'); name.textContent = SPECIES[rabbit.species].name;
        companion.replaceChildren(art, name); companion.hidden = false;
        react('idle');
        quota.textContent = options.quotaText?.() ?? '';
        dialog.showModal();
        activity = mountKitchen(host, {onRecipeCompleted: result => {
          taste(result.recipeId);
          const message = options.onRecipeCompleted?.(result);
          quota.textContent = options.quotaText?.() ?? '';
          if (message && activity) {
            showRewards(message);
            const card = activity.root.querySelector('#result-screen .overlay-card')!;
            if (selectedRabbit) {
              const face = document.createElement('span'); face.className = 'cuisine-result-rabbit-art'; face.innerHTML = portrait(selectedRabbit.species);
              const words = document.createElement('span'); const name = document.createElement('b'); name.textContent = SPECIES[selectedRabbit.species].name;
              words.append(name, document.createElement('br'), '« Miam ! »');
              resultRabbit.replaceChildren(face, words); card.append(resultRabbit);
            }
            card.append(rewardFeedback);
          }
        }, onPresentationEvent: event => {
          if (event === 'reset') { rewardFeedback.remove(); resultRabbit.remove(); }
          react(({success: 'positive', invalid: 'mistake', reset: 'idle', complete: 'celebrate'} as const)[event]);
        }});
        chef = document.createElement('div'); chef.className = 'cuisine-chef'; chef.setAttribute('aria-hidden', 'true');
        chef.dataset.chefRabbit = rabbit.species; chef.dataset.reaction = 'idle';
        const stand = document.createElement('span'); stand.className = 'cuisine-chef-stand'; stand.innerHTML = STAND;
        const body = document.createElement('span'); body.className = 'cuisine-chef-rabbit'; body.innerHTML = portrait(rabbit.species);
        chef.append(stand, body);
        // Just above the worktop art, below every kitchen object: dragged items always pass in front of it.
        activity.root.querySelector('#kitchen-world .table-art')!.after(chef);
      } catch (error) {
        selectedRabbit = null; chef = null;
        react('idle');
        companion.replaceChildren(); companion.hidden = true;
        if (dialog.open) dialog.close();
        host.replaceChildren(); background.inert = wasInert;
        throw error;
      }
    },
    close,
    dispose() { if (disposed) return; disposed = true; close(false); abort.abort(); dialog.remove(); },
  };
}
