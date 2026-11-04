import {mountKitchen, type RecipeCompletion} from '../../cooktap-prototype/main';
import {ART_URLS, finishedDishArt} from '../../cooktap-prototype/art';
import {artForRabbit, rabbitArt} from '../config/rabbitArt';
import {cuisineAnchors} from '../config/cuisineAnchors';
import {commisMood, createKitchenTalk, type KitchenTalk, type TalkLine, type TalkState} from './cuisineTalk';
import type {Rabbit} from '../state/types';
import {portrait} from './portraits';
import type {RabbitArt} from '../config/rabbitArt';
import {SPECIES} from '../config/balance';
import {setCurrencyText} from '../display/currency';

/** `evolution.done` and `classicLook` choose the drawing the rabbit currently shows; absent evolution data, use its species' own. */
export type CuisineRabbit = Readonly<Pick<Rabbit, 'id' | 'species'> & {name?: string; affection?: number; classicLook?: true; evolution?: Rabbit['evolution']}>;
const cookArt = (rabbit: CuisineRabbit): RabbitArt | undefined => rabbit.affection === undefined ? rabbitArt(rabbit.species) : artForRabbit({species: rabbit.species, affection: rabbit.affection, classicLook: rabbit.classicLook, evolution: rabbit.evolution});
export {commisMood, type CommisMood} from './cuisineTalk';
/** The rabbit's sprite with its accessory (toque or bib) and the paws used to cover its eyes, all on the same anchors. */
export function dressedRabbit(rabbit: CuisineRabbit, role: 'commis' | 'taster', faceRight: boolean): HTMLElement {
  const art = cookArt(rabbit), facing = art?.facing ?? 1, anchors = cuisineAnchors(rabbit.species, facing, !!art?.evolved);
  const box = document.createElement('span'); box.className = 'cuisine-cook-rabbit';
  if (art) box.style.aspectRatio = `${art.width} / ${art.height}`;
  const figure = document.createElement('span'); figure.className = 'cuisine-cook-figure';
  if ((facing === 1) !== faceRight) figure.dataset.mirrored = '';
  figure.innerHTML = portrait(rabbit.species, art);
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
  /** The cooks' words (src/ui/cuisineTalk.ts): a bubble's text changes only with the line, and pops again when the line is said again. */
  let talk: KitchenTalk | null = null;
  function bubble(node: HTMLElement | null, line: TalkLine | null): void {
    const element = node?.querySelector<HTMLElement>('.cuisine-cook-bubble'); if (!element) return;
    const text = line?.text ?? '';
    if (element.textContent !== text) element.textContent = text;
    if (!line) { delete element.dataset.kind; delete element.dataset.key; return; }
    element.dataset.kind = line.kind;
    if (element.dataset.key !== String(line.key)) { element.dataset.key = String(line.key); element.classList.remove('cuisine-cook-bubble-pop'); void element.offsetWidth; element.classList.add('cuisine-cook-bubble-pop'); }
  }
  function speak(state: TalkState | undefined): void { if (state) { bubble(chef, state.commis); bubble(taster, state.taster); } }
  const STAND = '<svg viewBox="0 0 100 40" aria-hidden="true"><ellipse cx="50" cy="37" rx="44" ry="4" fill="#5a3a2a26"/><path d="M24 14L18 37M76 14L82 37M50 16V37" stroke="#6e4b3a" stroke-width="5" stroke-linecap="round"/><path d="M24 14L18 37M76 14L82 37M50 16V37" stroke="#a86a3e" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="50" cy="12" rx="40" ry="9" fill="#c4513f" stroke="#6e4b3a" stroke-width="2.5"/><ellipse cx="50" cy="10" rx="31" ry="5" fill="#e0604f"/></svg>';
  // End-of-recipe meal (owner, 1 November 2026: « au moins 3 secondes et amélioré »): the dish is served to the eater, who leans
  // in and takes bites, chewing, while the plate empties and crumbs fall; then « Miam ! » and hearts. The result card waits
  // until the end, a tap on the kitchen skips. With reduced motion: a short, calm version, the empty plate and « Miam ! ».
  const HEARTS = 5, CRUMBS = 3;
  /** Bites as ellipses of the dish picture (x, y, half-width, half-height in %), for an eater on the dish's right. The last
   *  one clears the middle of the plate; the painted rim stays, the empty plate shows through. */
  const BITES = [[80, 40, 15, 19], [72, 62, 17, 21], [57, 36, 19, 23], [44, 60, 21, 25], [50, 48, 40, 38]] as const;
  const MEAL = {serveMs: 700, biteMs: 650, miamMs: 3900, endMs: 5000} as const;
  const CALM_MEAL = {miamMs: 300, endMs: 1600} as const;
  let tasting: HTMLElement | null = null, tastingTimers: ReturnType<typeof setTimeout>[] = [];
  function stopTasting(): void {
    for (const timer of tastingTimers) clearTimeout(timer);
    tastingTimers = []; tasting?.remove(); tasting = null; if (chef) delete chef.dataset.cheering;
    for (const node of [chef, taster]) if (node) { delete node.dataset.tasting; delete node.dataset.meal; delete node.dataset.chomp; }
    if (activity) delete activity.root.dataset.tasting;
  }
  /** The dish with `count` bites taken; `fromLeft` mirrors them for an eater on the dish's left. */
  function bitten(food: HTMLElement, count: number, fromLeft: boolean): void {
    const holes = BITES.slice(0, count).flatMap(([x, y, w, h]) => {
      const at = fromLeft ? 100 - x : x;
      // A bite is a round mouthful with two smaller ones on its edge: a scalloped, toothy outline.
      return [[at, y, w, h], [at + (fromLeft ? w : -w) * .55, y - h * .6, w * .45, h * .45], [at + (fromLeft ? w : -w) * .55, y + h * .6, w * .45, h * .45]];
    }).map(([x, y, w, h]) => `radial-gradient(ellipse ${w.toFixed(1)}% ${h.toFixed(1)}% at ${x.toFixed(1)}% ${y.toFixed(1)}%, transparent 97%, #000 100%)`);
    const mask = holes.join(', ') || 'none';
    food.style.setProperty('mask-image', mask); food.style.setProperty('-webkit-mask-image', mask);
    food.style.setProperty('mask-composite', 'intersect'); food.style.setProperty('-webkit-mask-composite', 'source-in');
  }
  function crumbs(dish: HTMLElement, bite: number, fromLeft: boolean): void {
    const [x, y] = BITES[bite];
    for (let n = 0; n < CRUMBS; n++) {
      const crumb = document.createElement('span'); crumb.className = 'cuisine-crumb';
      crumb.style.left = `${(fromLeft ? 100 - x : x) + (n - 1) * 6}%`; crumb.style.top = `${y + (n % 2) * 8}%`;
      crumb.style.setProperty('--crumb-index', String(n)); crumb.style.setProperty('--crumb-side', fromLeft ? '-1' : '1');
      dish.append(crumb);
    }
  }
  function taste(recipeId: RecipeCompletion['recipeId']): void {
    stopTasting();
    const layer = document.createElement('span'); layer.className = 'cuisine-tasting'; layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = finishedDishArt(recipeId);
    const dish = layer.querySelector<HTMLElement>('.cuisine-dish')!, food = dish.querySelector<HTMLElement>('img')!;
    // The empty plate under the dish shows through each bite.
    const plate = document.createElement('img'); plate.className = 'cuisine-dish-plate'; plate.src = ART_URLS['plate-empty'] ?? '';
    plate.alt = ''; plate.draggable = false; food.before(plate);
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
    const fromLeft = eater === chef && !taster; // the commis eats from the left of its dish, the taster from the right
    const later = (ms: number, step: () => void) => tastingTimers.push(setTimeout(() => { if (tasting === layer) step(); }, ms));
    const meal = (phase: 'serve' | 'eating' | 'miam') => { layer.dataset.meal = phase; eater.dataset.meal = phase; };
    const commis = chef;
    const miam = () => { bitten(food, BITES.length, fromLeft); meal('miam'); if (taster) { delete commis.dataset.cheering; void commis.offsetWidth; commis.dataset.cheering = ''; } };
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      layer.dataset.calm = ''; meal('serve'); later(CALM_MEAL.miamMs, miam); later(CALM_MEAL.endMs, stopTasting); return;
    }
    meal('serve');
    BITES.forEach((_, bite) => later(MEAL.serveMs + bite * MEAL.biteMs, () => {
      meal('eating'); bitten(food, bite + 1, fromLeft); if (bite < BITES.length - 1) crumbs(dish, bite, fromLeft);
      // One chomp per bite, on top of the chewing rhythm.
      delete eater.dataset.chomp; void eater.offsetWidth; eater.dataset.chomp = '';
    }));
    later(MEAL.miamMs, miam); later(MEAL.endMs, stopTasting);
  }
  /** Tapping the kitchen during the meal skips straight to the result card. */
  function skipTasting(): boolean { if (!tasting) return false; stopTasting(); return true; }
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
    activity.dispose(); activity = null; chef = null; taster = null; talk = null;
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
        art.setAttribute('aria-hidden', 'true'); art.innerHTML = portrait(rabbit.species, cookArt(rabbit));
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
              const face = document.createElement('span'); face.className = 'cuisine-result-rabbit-art'; face.innerHTML = portrait(eater.species, cookArt(eater));
              const words = document.createElement('span'); const name = document.createElement('b'); name.textContent = eater.name || SPECIES[eater.species].name;
              words.append(name, document.createElement('br'), '« Miam ! »');
              resultRabbit.replaceChildren(face, words); card.append(resultRabbit);
            }
            card.append(rewardFeedback);
          }
        }, onPresentationEvent: event => {
          const now = Date.now();
          if (talk && activity) speak(event === 'success' ? talk.success(activity.engine.snapshot(), now) : event === 'invalid' ? talk.action(now) : talk.reset(now));
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
        talk = createKitchenTalk(!!taster);
        // Touching the kitchen is an action: the hint goes away and the 2-second wait starts again.
        activity.root.addEventListener('pointerdown', () => { if (!skipTasting()) speak(talk?.action(Date.now())); }, {capture: true});
        moodTimer = setInterval(() => {
          if (!activity || !talk || !chef) return;
          const snapshot = activity.engine.snapshot(); chef.dataset.mood = commisMood(snapshot); speak(talk.tick(snapshot, Date.now()));
        }, 200);
        options.onActiveChange?.(true);
      } catch (error) {
        selectedRabbit = null; tasterRabbit = null; chef = null; taster = null; talk = null;
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
