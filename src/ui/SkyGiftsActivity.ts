import {artForRabbit, rabbitArt} from '../config/rabbitArt';
import {SPECIES} from '../config/balance';
import {setCurrencyText} from '../display/currency';
import type {CuisineRabbit} from './CuisineActivity';
import {portrait} from './portraits';
import {SKY_GIFTS_ART} from '../config/winterArt';
import {advanceSkyGifts, aimSkyGifts, skyGiftsLeft, sleighAt, startSkyGifts, SKY_GIFTS_GAME, type SkyGiftsGame} from '../simulation/skyGiftsGame';

/**
 * « Les cadeaux du ciel » (src/simulation/skyGiftsGame.ts holds the rules): a full-screen layer like the jump rope. The finger
 * slides the rabbit and its basket along the snow (or the arrow keys); the sleigh crosses the night sky and drops presents.
 * `onFinished` records the game and returns the reward line; `best` reads the record before the game.
 */
export function mountSkyGiftsActivity(host: HTMLElement, options: {
  onFinished: (rabbit: CuisineRabbit, caught: number) => string;
  quotaText?: () => string;
  best?: () => number;
  cheer?: () => void;
  onExit?: () => void;
  clock?: () => number;
  frame?: (step: () => void) => number;
}) {
  const clock = options.clock ?? (() => performance.now()), frame = options.frame ?? (step => requestAnimationFrame(step));
  const art = SKY_GIFTS_ART;
  const layer = document.createElement('div'); layer.className = 'sky-gifts-activity'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Les cadeaux du ciel');
  layer.innerHTML = `<div class="sky-gifts-top"><p class="sky-gifts-score" aria-live="polite"></p><p class="sky-gifts-lives" aria-hidden="true"></p><p class="sky-gifts-time"></p><p class="sky-gifts-quota"></p><button type="button" data-sky-gifts-exit>Quitter</button></div>
<div class="sky-gifts-stage" data-sky-gifts-stage style="background-image:url('${art.background}')">
<img class="sky-gifts-sleigh" alt="" aria-hidden="true" draggable="false" src="${art.sleigh}">
<div class="sky-gifts-falling" aria-hidden="true"></div>
<span class="sky-gifts-rabbit"><img class="sky-gifts-basket" alt="" aria-hidden="true" draggable="false" src="${art.basket}"><span class="sky-gifts-figure"></span></span>
<p class="sky-gifts-pop" aria-hidden="true"></p>
<div class="sky-gifts-blasts" aria-hidden="true"></div>
</div>
<div class="sky-gifts-card" data-sky-gifts-card></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const stage = $<HTMLElement>('[data-sky-gifts-stage]'), card = $<HTMLElement>('[data-sky-gifts-card]'), falling = $<HTMLElement>('.sky-gifts-falling');
  const score = $<HTMLElement>('.sky-gifts-score'), lives = $<HTMLElement>('.sky-gifts-lives'), time = $<HTMLElement>('.sky-gifts-time'), quota = $<HTMLElement>('.sky-gifts-quota');
  const blasts = $<HTMLElement>('.sky-gifts-blasts');
  const sleigh = $<HTMLImageElement>('.sky-gifts-sleigh'), rabbitBox = $<HTMLElement>('.sky-gifts-rabbit'), figure = $<HTMLElement>('.sky-gifts-figure'), pop = $<HTMLElement>('.sky-gifts-pop');
  const abort = new AbortController(), views = new Map<number, HTMLImageElement>();
  let rabbit: CuisineRabbit | null = null, game: SkyGiftsGame | null = null, running = false, previousBest = 0, popTimer: ReturnType<typeof setTimeout> | undefined;
  const nameOf = (r: CuisineRabbit) => r.name || SPECIES[r.species].name;
  const gifts = (n: number) => `${n} cadeau${n > 1 ? 'x' : ''}`;
  const button = (label: string, action: () => void, key: string) => {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.dataset[key] = '';
    element.addEventListener('click', event => { event.stopPropagation(); action(); }); return element;
  };
  const paragraph = (text: string, className: string) => { const p = document.createElement('p'); p.className = className; p.textContent = text; return p; };
  function showCard(...children: HTMLElement[]): void { card.replaceChildren(...children); card.hidden = false; }
  function hud(): void {
    score.textContent = gifts(game?.caught ?? 0);
    const left = SKY_GIFTS_GAME.misses - (game?.missed ?? 0); lives.textContent = '❄'.repeat(Math.max(0, left));
    time.textContent = game ? `${skyGiftsLeft(game)} s` : '';
    quota.textContent = options.quotaText?.() ?? '';
  }
  function flash(text: string, kind: 'catch' | 'miss' | 'record' | 'ready' | 'trap'): void {
    pop.textContent = text; pop.dataset.kind = kind; pop.classList.remove('shown'); void pop.offsetWidth; pop.classList.add('shown');
    clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('shown'), kind === 'ready' ? 900 : 480);
  }
  function draw(now: number): void {
    if (!game) return;
    const s = sleighAt(game, now);
    sleigh.style.left = `${s.x * 100}%`; sleigh.style.top = `${SKY_GIFTS_GAME.sleighY * 100}%`; sleigh.dataset.facing = String(s.facing);
    rabbitBox.style.left = `${game.basketX * 100}%`;
    const seen = new Set<number>();
    for (const gift of game.gifts) {
      seen.add(gift.id);
      let view = views.get(gift.id);
      if (!view) { view = document.createElement('img'); view.alt = ''; view.draggable = false; view.className = 'sky-gifts-gift'; view.dataset.kind = gift.kind; view.src = gift.kind === 'gift' ? art.gifts[gift.colour] : art.traps[gift.kind]; falling.append(view); views.set(gift.id, view); }
      view.style.left = `${gift.x * 100}%`; view.style.top = `${gift.y * 100}%`;
    }
    for (const [id, view] of views) if (!seen.has(id)) { view.remove(); views.delete(id); }
  }
  function update(): void {
    if (!game) return;
    const now = clock(); advanceSkyGifts(game, now);
    if (game.events.caught.length) { rabbitBox.classList.remove('catch'); void rabbitBox.offsetWidth; rabbitBox.classList.add('catch');
      const n = game.caught;
      if (previousBest > 0 && n === previousBest + 1) { flash('Nouveau record !', 'record'); options.cheer?.(); }
      else if (n % 10 === 0) { flash(`${n} cadeaux !`, 'catch'); options.cheer?.(); } else flash('Attrapé !', 'catch'); }
    if (game.events.missed.length) flash('Plouf !', 'miss');
    // A trap in the basket: a splash of poison or a blast where it landed, the rabbit shakes, and a life is lost.
    for (const trap of game.events.trapped) {
      if (trap.kind === 'gift') continue;
      const blast = document.createElement('img'); blast.alt = ''; blast.draggable = false; blast.className = 'sky-gifts-blast'; blast.dataset.kind = trap.kind;
      blast.src = art.trapHits[trap.kind]; blast.style.left = `${game.basketX * 100}%`; blast.style.top = `${SKY_GIFTS_GAME.catchTop * 100}%`;
      blast.addEventListener('animationend', () => blast.remove()); blasts.append(blast);
      rabbitBox.classList.remove('hurt'); void rabbitBox.offsetWidth; rabbitBox.classList.add('hurt');
      flash(trap.kind === 'bomb' ? 'Boum !' : `Beurk ! −${SKY_GIFTS_GAME.poisonGifts} cadeaux`, 'trap');
      if (trap.kind === 'bomb') layer.classList.add('exploded');
    }
    draw(now); hud();
    if (game.over && running) finish();
  }
  function loop(): void { if (!running) return; update(); frame(loop); }
  /** The rabbit follows the finger anywhere on the stage. */
  function aim(event: PointerEvent): void {
    if (!game || !running) return;
    const box = stage.getBoundingClientRect(); if (!box.width) return;
    aimSkyGifts(game, (event.clientX - box.left) / box.width);
  }
  function finish(): void {
    running = false; const final = game!.caught, who = rabbit!, record = final > previousBest && final > 0;
    const reward = options.onFinished(who, final);
    const chips = document.createElement('p'); chips.className = 'sky-gifts-rewards';
    for (const part of reward ? reward.split(' · ') : []) { const chip = document.createElement('span'); chip.className = 'cuisine-reward-chip'; setCurrencyText(chip, part); chips.append(chip); }
    hud();
    const again = button('Rejouer', start, 'skyGiftsAgain');
    const blown = game!.exploded;
    showCard(paragraph(final ? `${nameOf(who)} a attrapé ${gifts(final)} !` : `${nameOf(who)} n’a rien attrapé cette fois.`, 'sky-gifts-title'),
      ...(blown ? [paragraph('Boum ! Une bombe dans la hotte a arrêté la partie.', 'sky-gifts-rules')] : []),
      ...(record ? [paragraph(previousBest ? `Nouveau record ! L’ancien était de ${previousBest}.` : 'Ton premier record !', 'sky-gifts-record')] : previousBest ? [paragraph(`Ton record : ${gifts(previousBest)}`, 'sky-gifts-rules')] : []),
      chips, again, button('Quitter', close, 'skyGiftsQuit'));
    again.focus();
  }
  function start(): void {
    previousBest = options.best?.() ?? 0;
    for (const view of views.values()) view.remove(); views.clear(); blasts.replaceChildren(); rabbitBox.classList.remove('hurt'); layer.classList.remove('exploded');
    game = startSkyGifts(clock()); running = true; card.hidden = true;
    hud(); draw(game.now); flash('Prêt ?', 'ready'); frame(loop);
  }
  function intro(): void {
    game = startSkyGifts(clock()); running = false; previousBest = options.best?.() ?? 0; draw(game.now); hud(); time.textContent = '';
    showCard(paragraph(`${nameOf(rabbit!)} attrape les cadeaux du ciel !`, 'sky-gifts-title'),
      paragraph(`Le traîneau passe dans le ciel et lâche des cadeaux. Fais glisser ton doigt pour déplacer ${nameOf(rabbit!)} et sa hotte. ${SKY_GIFTS_GAME.ms / 1000} secondes. Attention aux pièges : un cadeau empoisonné t’enlève ${SKY_GIFTS_GAME.poisonGifts} cadeaux, et une bombe explose et arrête la partie ! Trois cadeaux tombés dans la neige arrêtent aussi la partie. Rejoue autant que tu veux !`, 'sky-gifts-rules'),
      button('C’est parti !', start, 'skyGiftsStart'));
  }
  function close(): void {
    if (layer.hidden) return;
    running = false; game = null; rabbit = null; layer.hidden = true; clearTimeout(popTimer); options.onExit?.();
  }
  stage.addEventListener('pointerdown', event => { event.preventDefault(); aim(event); }, {signal: abort.signal});
  stage.addEventListener('pointermove', event => { if (event.pointerType !== 'mouse' || event.buttons || running) aim(event); }, {signal: abort.signal});
  $<HTMLButtonElement>('[data-sky-gifts-exit]').addEventListener('click', () => close(), {signal: abort.signal});
  document.addEventListener('keydown', event => {
    if (layer.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && game && running) { event.preventDefault(); aimSkyGifts(game, game.targetX + (event.key === 'ArrowLeft' ? -.12 : .12)); }
  }, {signal: abort.signal});
  return {
    get active() { return !layer.hidden; },
    get playing() { return running; },
    get game() { return game; },
    element: layer,
    open(chosen: CuisineRabbit) {
      rabbit = chosen;
      const look = chosen.affection === undefined ? rabbitArt(chosen.species) : artForRabbit({species: chosen.species, affection: chosen.affection, classicLook: chosen.classicLook, evolution: chosen.evolution});
      figure.innerHTML = portrait(chosen.species, look);
      layer.hidden = false; intro(); $<HTMLButtonElement>('[data-sky-gifts-start]').focus();
    },
    close, update,
    dispose() { close(); abort.abort(); layer.remove(); },
  };
}
