import {mountKitchen, type RecipeCompletion} from '../../cooktap-prototype/main';
import {ART_URLS, finishedDishArt} from '../../cooktap-prototype/art';
import type {KitchenSnapshot} from '../../cooktap-prototype/engine';
import {rabbitArt} from '../config/rabbitArt';
import {cuisineAnchors} from '../config/cuisineAnchors';
import type {Rabbit} from '../state/types';
import {portrait} from './portraits';
import {SPECIES} from '../config/balance';
import {setCurrencyText} from '../display/currency';

export type CuisineRabbit = Readonly<Pick<Rabbit, 'id' | 'species'> & {name?: string}>;
/** What the commis is doing, read from the kitchen's own state (the engine stays rabbit-agnostic). */
export type CommisMood = 'idle' | 'teary' | 'sniff' | 'impatient';
export function commisMood(snapshot: KitchenSnapshot): CommisMood {
  if (snapshot.phase !== 'playing') return 'idle';
  if (snapshot.cookingRemainingMs > 0) return snapshot.cookingHeater === 'oven' ? 'impatient' : 'sniff';
  const item = (id: string) => snapshot.items.find(i => i.id === id && i.visible);
  const next = snapshot.steps.filter(s => s.next);
  // Cutting a shallot stings the eyes: from the moment it lies on the board until it leaves it.
  if (item('shallot')?.location === 'cutting-board') return 'teary';
  // Chocolate smells good: the bar, the melting pan and the chocolate batter.
  if (next.some(s => s.actor === 'chocolate' || s.actor === 'butter' || s.actor === 'saucepan') || item('saucepan')?.state === 'melted') return 'sniff';
  return 'idle';
}
/** The rabbit's sprite with its accessory (toque or bib) and the paws used to cover its eyes, all on the same anchors. */
export function dressedRabbit(rabbit: CuisineRabbit, role: 'commis' | 'taster', faceRight: boolean): HTMLElement {
  const art = rabbitArt(rabbit.species), facing = art?.facing ?? 1, anchors = cuisineAnchors(rabbit.species, facing);
  const box = document.createElement('span'); box.className = 'cuisine-cook-rabbit';
  if (art) box.style.aspectRatio = `${art.width} / ${art.height}`;
  const figure = document.createElement('span'); figure.className = 'cuisine-cook-figure';
  if ((facing === 1) !== faceRight) figure.dataset.mirrored = '';
  figure.innerHTML = portrait(rabbit.species);
  const place = (node: HTMLElement, x: number, y: number, w: number, r = 0) => {
    node.style.left = `${x * 100}%`; node.style.top = `${y * 100}%`; node.style.width = `${w * 100}%`; node.style.setProperty('--tilt', `${r}deg`); figure.append(node);
  };
  const accessory = role === 'commis' ? ART_URLS.toque : ART_URLS.bavoir;
  if (accessory) {
    const image = document.createElement('img'); image.className = 'cuisine-accessory'; image.dataset.accessory = role === 'commis' ? 'toque' : 'bavoir';
    image.alt = ''; image.draggable = false; image.src = accessory;
    if (role === 'commis') place(image, anchors.hat.x, anchors.hat.y, anchors.hat.w, anchors.hat.r); else place(image, anchors.bib.x, anchors.bib.y, anchors.bib.w);
  }
  if (role === 'commis') {
    const paws = document.createElement('span'); paws.className = 'cuisine-paws';
    paws.innerHTML = '<span class="cuisine-paw"></span><span class="cuisine-paw"></span>';
    place(paws, anchors.eyes.x, anchors.eyes.y, anchors.eyes.w);
  }
  box.append(figure); return box;
}

/** Stable activity layer, deliberately outside GameUI's rebuilt panel content. */
export function mountCuisineActivity(background: HTMLElement, options: {
  onRecipeCompleted?: (result: RecipeCompletion) => string | void;
  quotaText?: () => string;
  onExit?: () => void;
  /** The kitchen opens (true) or closes (false), whatever the reason. */
  onActiveChange?: (active: boolean) => void;
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
  let selectedRabbit: CuisineRabbit | null = null, tasterRabbit: CuisineRabbit | null = null;
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
  /** The commis on its stool and the taster beside the table, inside the kitchen world (host-owned nodes). */
  let chef: HTMLElement | null = null, taster: HTMLElement | null = null, moodTimer: ReturnType<typeof setInterval> | undefined;
  const BUBBLES: Record<CommisMood, string> = {idle: '', teary: 'Ça pique les yeux !', sniff: 'Mmh, ça sent bon !', impatient: 'C’est bientôt prêt ?'};
  function setMood(mood: CommisMood): void {
    if (!chef || chef.dataset.mood === mood) return;
    chef.dataset.mood = mood; chef.querySelector('.cuisine-cook-bubble')!.textContent = BUBBLES[mood];
  }
  const STAND = '<svg viewBox="0 0 100 40" aria-hidden="true"><ellipse cx="50" cy="37" rx="44" ry="4" fill="#5a3a2a26"/><path d="M24 14L18 37M76 14L82 37M50 16V37" stroke="#6e4b3a" stroke-width="5" stroke-linecap="round"/><path d="M24 14L18 37M76 14L82 37M50 16V37" stroke="#a86a3e" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="50" cy="12" rx="40" ry="9" fill="#c4513f" stroke="#6e4b3a" stroke-width="2.5"/><ellipse cx="50" cy="10" rx="31" ry="5" fill="#e0604f"/></svg>';
  // End-of-recipe tasting around the in-scene rabbit: dish presented, hop, « Miam ! », hearts. The result card waits.
  const TASTING_MS = 2000, HEARTS = 5;
  let tasting: HTMLElement | null = null, tastingTimer: ReturnType<typeof setTimeout> | undefined;
  function stopTasting(): void {
    if (tastingTimer !== undefined) clearTimeout(tastingTimer);
    tastingTimer = undefined; tasting?.remove(); tasting = null; if (chef) delete chef.dataset.cheering;
    if (chef) delete chef.dataset.tasting;
    if (taster) delete taster.dataset.tasting;
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
    // The taster tastes; cooking alone, the commis tastes its own dish.
    const eater = taster ?? chef;
    if (!eater || !chef || !activity) return;
    eater.append(layer); tasting = layer; eater.dataset.tasting = recipeId; if (taster) chef.dataset.cheering = ''; activity.root.dataset.tasting = recipeId;
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
    if (moodTimer !== undefined) clearInterval(moodTimer); moodTimer = undefined;
    activity.dispose(); activity = null; chef = null; taster = null;
    selectedRabbit = null; tasterRabbit = null;
    react('idle');
    companion.replaceChildren(); companion.hidden = true;
    if (dialog.open) dialog.close();
    background.inert = wasInert;
    options.onActiveChange?.(false);
    if (notify) { options.onExit?.(); if (returnFocus?.isConnected) returnFocus.focus(); }
    returnFocus = null;
  }
  exit.addEventListener('click', () => close(), {signal: abort.signal});
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, {signal: abort.signal});
  dialog.addEventListener('close', () => { if (!dialog.open) close(); }, {signal: abort.signal});
  return {
    get active() { return activity !== null; },
    get selectedRabbit() { return selectedRabbit; },
    get taster() { return tasterRabbit; },
    /** The rabbit the affection was drawn for: a floating « +1 » over it. */
    showAffection(id: string) {
      for (const node of [chef, taster]) if (node) delete node.dataset.lucky;
      const lucky = selectedRabbit?.id === id ? chef : tasterRabbit?.id === id ? taster : null;
      if (lucky) lucky.dataset.lucky = '';
    },
    /** The commis cooks (toque); the optional taster (bib) waits beside the table and tastes the dish. */
    open(rabbit: CuisineRabbit, second?: CuisineRabbit) {
      if (disposed || activity || document.querySelector('dialog[open]')) return;
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      wasInert = background.inert; background.inert = true;
      try {
        selectedRabbit = Object.freeze({id: rabbit.id, species: rabbit.species});
        tasterRabbit = second && second.id !== rabbit.id ? Object.freeze({id: second.id, species: second.species}) : null;
        const art = document.createElement('span'); art.className = 'cuisine-companion-art';
        art.setAttribute('aria-hidden', 'true'); art.innerHTML = portrait(rabbit.species);
        const name = document.createElement('span'); name.textContent = rabbit.name || SPECIES[rabbit.species].name;
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
            const eater = tasterRabbit && second ? second : selectedRabbit && rabbit;
            if (eater) {
              const face = document.createElement('span'); face.className = 'cuisine-result-rabbit-art'; face.innerHTML = portrait(eater.species);
              const words = document.createElement('span'); const name = document.createElement('b'); name.textContent = eater.name || SPECIES[eater.species].name;
              words.append(name, document.createElement('br'), '« Miam ! »');
              resultRabbit.replaceChildren(face, words); card.append(resultRabbit);
            }
            card.append(rewardFeedback);
          }
        }, onPresentationEvent: event => {
          if (event === 'reset') { rewardFeedback.remove(); resultRabbit.remove(); for (const node of [chef, taster]) if (node) delete node.dataset.lucky; }
          react(({success: 'positive', invalid: 'mistake', reset: 'idle', complete: 'celebrate'} as const)[event]);
        }});
        const cook = (role: 'commis' | 'taster', who: CuisineRabbit, faceRight: boolean) => {
          const node = document.createElement('div'); node.className = `cuisine-chef cuisine-${role}`; node.setAttribute('aria-hidden', 'true');
          node.dataset.chefRabbit = who.species; node.dataset.role = role; node.dataset.reaction = 'idle';
          const stand = document.createElement('span'); stand.className = 'cuisine-chef-stand'; stand.innerHTML = STAND;
          const body = dressedRabbit(who, role, faceRight); body.classList.add('cuisine-chef-rabbit');
          const bubble = document.createElement('span'); bubble.className = 'cuisine-cook-bubble';
          const plus = document.createElement('span'); plus.className = 'cuisine-cook-affection'; plus.textContent = '+1 ♥';
          node.append(stand, body, bubble, plus); return node;
        };
        chef = cook('commis', rabbit, true); chef.dataset.mood = 'idle';
        taster = tasterRabbit && second ? cook('taster', second, false) : null;
        // Just above the worktop art, below every kitchen object: dragged items always pass in front of them.
        activity.root.querySelector('#kitchen-world .table-art')!.after(...[chef, taster].filter((n): n is HTMLDivElement => !!n));
        moodTimer = setInterval(() => { if (activity) setMood(commisMood(activity.engine.snapshot())); }, 200);
        options.onActiveChange?.(true);
      } catch (error) {
        selectedRabbit = null; tasterRabbit = null; chef = null; taster = null;
        if (moodTimer !== undefined) clearInterval(moodTimer); moodTimer = undefined;
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
