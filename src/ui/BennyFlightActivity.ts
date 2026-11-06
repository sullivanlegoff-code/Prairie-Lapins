import {setCurrencyText} from '../display/currency';
import {portrait} from './portraits';
import {artForRabbit} from '../config/rabbitArt';
import {BENNY_FLIGHT_ART} from '../config/bennyFlightGameArt';
import {advanceBennyFlight, flapBennyFlight, startBennyFlight, BENNY_FLIGHT_GAME, type BennyFlightGame} from '../simulation/bennyFlightGame';
import type {Rabbit} from '../state/types';

/**
 * « Le vol de Benny » (src/simulation/bennyFlightGame.ts holds the rules): a full-screen layer like « Les cadeaux du ciel ».
 * A touch anywhere on the sky (or the space bar) gives Benny a wing beat; the painted sky scrolls behind her and the hay
 * columns come from the right. `onFinished` records the game and returns the reward line; `best` reads the record before it.
 */
export function mountBennyFlightActivity(host: HTMLElement, options: {
  onFinished: (passed: number) => string;
  quotaText?: () => string;
  best?: () => number;
  onExit?: () => void;
  clock?: () => number;
  frame?: (step: () => void) => number;
}) {
  const clock = options.clock ?? (() => performance.now()), frame = options.frame ?? (step => requestAnimationFrame(step));
  const art = BENNY_FLIGHT_ART;
  const layer = document.createElement('div'); layer.className = 'benny-flight-activity'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Le vol de Benny');
  layer.innerHTML = `<div class="benny-flight-top"><p class="benny-flight-score" aria-live="polite"></p><p class="benny-flight-quota"></p><button type="button" data-benny-flight-exit>Quitter</button></div>
<div class="benny-flight-stage" data-benny-flight-stage style="background-image:url('${art.background}')">
<div class="benny-flight-columns" aria-hidden="true"></div>
<span class="benny-flight-benny" aria-hidden="true"></span>
<p class="benny-flight-pop" aria-hidden="true"></p>
</div>
<div class="benny-flight-card" data-benny-flight-card></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const stage = $<HTMLElement>('[data-benny-flight-stage]'), card = $<HTMLElement>('[data-benny-flight-card]'), columns = $<HTMLElement>('.benny-flight-columns');
  const score = $<HTMLElement>('.benny-flight-score'), quota = $<HTMLElement>('.benny-flight-quota'), benny = $<HTMLElement>('.benny-flight-benny'), pop = $<HTMLElement>('.benny-flight-pop');
  const abort = new AbortController(), views = new Map<number, HTMLElement>();
  let game: BennyFlightGame | null = null, running = false, previousBest = 0, popTimer: ReturnType<typeof setTimeout> | undefined;
  const bales = (n: number) => `${n} colonne${n > 1 ? 's' : ''}`;
  const button = (label: string, action: () => void, key: string) => {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.dataset[key] = '';
    element.addEventListener('click', event => { event.stopPropagation(); action(); }); return element;
  };
  const paragraph = (text: string, className: string) => { const p = document.createElement('p'); p.className = className; p.textContent = text; return p; };
  function showCard(...children: HTMLElement[]): void { card.replaceChildren(...children); card.hidden = false; }
  function hud(): void { score.textContent = bales(game?.passed ?? 0); quota.textContent = options.quotaText?.() ?? ''; }
  function flash(text: string, kind: 'pass' | 'record' | 'ready' | 'bump'): void {
    pop.textContent = text; pop.dataset.kind = kind; pop.classList.remove('shown'); void pop.offsetWidth; pop.classList.add('shown');
    clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('shown'), kind === 'ready' ? 900 : 520);
  }
  function draw(): void {
    if (!game) return;
    const g = BENNY_FLIGHT_GAME;
    benny.style.left = `${g.x * 100}%`; benny.style.top = `${game.y * 100}%`;
    benny.style.transform = `translate(-50%, -50%) rotate(${Math.max(-25, Math.min(40, game.vy * 40))}deg)`;
    // The sky scrolls with the columns, slower (a little depth).
    stage.style.backgroundPositionX = `${-((game.at - game.startedAt) / 1000) * g.speed * 40}%`;
    const seen = new Set<number>();
    for (const c of game.columns) {
      seen.add(c.id);
      let view = views.get(c.id);
      if (!view) {
        view = document.createElement('div'); view.className = 'benny-flight-column';
        for (const part of ['top', 'bottom']) { const img = document.createElement('img'); img.alt = ''; img.draggable = false; img.src = art.column; img.dataset.part = part; view.append(img); }
        columns.append(view); views.set(c.id, view);
      }
      view.style.left = `${c.x * 100}%`; view.style.width = `${g.columnWidth * 100}%`;
      (view.children[0] as HTMLElement).style.height = `${(c.gapY - c.gap / 2) * 100}%`;
      (view.children[1] as HTMLElement).style.top = `${(c.gapY + c.gap / 2) * 100}%`;
    }
    for (const [id, view] of views) if (!seen.has(id)) { view.remove(); views.delete(id); }
  }
  let shownPassed = 0;
  function update(): void {
    if (!game) return;
    advanceBennyFlight(game, clock());
    if (game.passed > shownPassed) {
      shownPassed = game.passed;
      if (previousBest > 0 && game.passed === previousBest + 1) flash('Nouveau record !', 'record');
      else if (game.passed % 10 === 0) flash(`${bales(game.passed)} !`, 'pass');
    }
    draw(); hud();
    if (game.over && running) finish();
  }
  function loop(): void { if (!running) return; update(); frame(loop); }
  function flap(): void {
    if (!game || !running) return;
    flapBennyFlight(game, clock());
    benny.classList.remove('flap'); void benny.offsetWidth; benny.classList.add('flap');
  }
  function finish(): void {
    running = false; const final = game!.passed, record = final > previousBest && final > 0;
    flash('Pouf !', 'bump');
    const reward = options.onFinished(final);
    const chips = document.createElement('p'); chips.className = 'benny-flight-rewards';
    for (const part of reward ? reward.split(' · ') : []) { const chip = document.createElement('span'); chip.className = 'cuisine-reward-chip'; setCurrencyText(chip, part); chips.append(chip); }
    hud();
    const again = button('Rejouer', start, 'bennyFlightAgain');
    showCard(paragraph(final ? `Benny a franchi ${bales(final)} !` : 'Benny s’est posée un peu trop tôt.', 'benny-flight-title'),
      ...(record ? [paragraph(previousBest ? `Nouveau record ! L’ancien était de ${previousBest}.` : 'Ton premier record !', 'benny-flight-record')] : previousBest ? [paragraph(`Ton record : ${bales(previousBest)}`, 'benny-flight-rules')] : []),
      chips, again, button('Quitter', close, 'bennyFlightQuit'));
    again.focus();
  }
  function start(): void {
    previousBest = options.best?.() ?? 0; shownPassed = 0;
    for (const view of views.values()) view.remove(); views.clear();
    game = startBennyFlight(clock()); running = true; card.hidden = true;
    hud(); draw(); flash('Touche pour voler !', 'ready'); frame(loop);
  }
  function intro(): void {
    game = startBennyFlight(clock()); running = false; previousBest = options.best?.() ?? 0; draw(); hud();
    showCard(paragraph('Le vol de Benny', 'benny-flight-title'),
      paragraph('Touche le ciel pour que Benny batte des ailes, et passe entre les colonnes de bottes de foin. Une colonne touchée, le haut du ciel ou la mer de nuages, et Benny se pose. Rejoue autant que tu veux !', 'benny-flight-rules'),
      button('C’est parti !', start, 'bennyFlightStart'));
  }
  function close(): void {
    if (layer.hidden) return;
    running = false; game = null; layer.hidden = true; clearTimeout(popTimer); options.onExit?.();
  }
  stage.addEventListener('pointerdown', event => { event.preventDefault(); flap(); }, {signal: abort.signal});
  $<HTMLButtonElement>('[data-benny-flight-exit]').addEventListener('click', () => close(), {signal: abort.signal});
  document.addEventListener('keydown', event => {
    if (layer.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if ((event.key === ' ' || event.key === 'ArrowUp') && running) { event.preventDefault(); flap(); }
  }, {signal: abort.signal});
  return {
    get active() { return !layer.hidden; },
    get playing() { return running; },
    get game() { return game; },
    element: layer,
    open(chosen: Rabbit) {
      benny.innerHTML = portrait(chosen.species, artForRabbit(chosen));
      layer.hidden = false; intro(); $<HTMLButtonElement>('[data-benny-flight-start]').focus();
    },
    close, update, flap,
    dispose() { close(); abort.abort(); layer.remove(); },
  };
}
