import {setCurrencyText} from '../display/currency';
import {BENNY_FLIGHT_ART, BENNY_FLAPPY, FULLSCREEN_ACTIVITY_EVENT} from '../config/bennyFlightGameArt';
import {advanceBennyFlight, flapBennyFlight, startBennyFlight, BENNY_FLIGHT_GAME, type BennyFlightGame} from '../simulation/bennyFlightGame';
import type {Rabbit} from '../state/types';
import {pausableClock, settleCard} from './activityPause';

/**
 * « Le vol de Benny » (src/simulation/bennyFlightGame.ts holds the rules): a full-screen layer like « Les cadeaux du ciel ».
 * A touch anywhere on the sky (or the space bar) gives Benny a wing beat; the painted sky scrolls behind her and the hay
 * columns come from the right. `onFinished` records the game and returns the reward line; `best` reads the record before it.
 * Benny is her flapping sprite (scripts/prepare-benny-flappy.mjs): her wings speed up after a touch and calm down in between.
 * What is drawn glides towards the rules' state (owner, 6 November 2026: « on dirait que Benny dash en avant, ça doit être plus
 * smooth »): the wing beat gives her a new speed at once, but her height and her tilt follow it softly and her wings never skip.
 * Smooth on a phone (owner, 6 November 2026: « le jeu est laggy »): everything moves by `transform` only (no layout, no repaint of
 * the sky), the column pictures are sized once, and the island's Phaser loop sleeps while the game is open.
 */
export function mountBennyFlightActivity(host: HTMLElement, options: {
  onFinished: (passed: number) => string;
  quotaText?: () => string;
  best?: () => number;
  onExit?: () => void;
  clock?: () => number;
  frame?: (step: () => void) => number;
}) {
  const time = pausableClock(options.clock ?? (() => performance.now())), clock = time.now, frame = options.frame ?? (step => requestAnimationFrame(step));
  const art = BENNY_FLIGHT_ART;
  const layer = document.createElement('div'); layer.className = 'benny-flight-activity'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Le vol de Benny');
  layer.innerHTML = `<div class="benny-flight-top"><p class="benny-flight-score" aria-live="polite"></p><p class="benny-flight-quota"></p><button type="button" data-benny-flight-exit>Quitter</button></div>
<div class="benny-flight-stage" data-benny-flight-stage>
<div class="benny-flight-sky" aria-hidden="true" style="background-image:url('${art.background}')"></div>
<div class="benny-flight-columns" aria-hidden="true"></div>
<span class="benny-flight-benny" aria-hidden="true" style="background-image:url('${BENNY_FLAPPY.url}')"></span>
<p class="benny-flight-pop" aria-hidden="true"></p>
</div>
<div class="benny-flight-card" data-benny-flight-card></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const stage = $<HTMLElement>('[data-benny-flight-stage]'), card = $<HTMLElement>('[data-benny-flight-card]'), columns = $<HTMLElement>('.benny-flight-columns');
  const score = $<HTMLElement>('.benny-flight-score'), quota = $<HTMLElement>('.benny-flight-quota'), benny = $<HTMLElement>('.benny-flight-benny'), pop = $<HTMLElement>('.benny-flight-pop'), sky = $<HTMLElement>('.benny-flight-sky');
  const abort = new AbortController(), views = new Map<number, HTMLElement>();
  let game: BennyFlightGame | null = null, running = false, previousBest = 0, popTimer: ReturnType<typeof setTimeout> | undefined;
  // Stage size in CSS pixels, the sky picture's width at the stage's height, Benny's box; measured on open and on resize.
  let width = 1, height = 1, tile = 1, bennyWidth = 0, bennyHeight = 0, skyAspect = 1;
  const skyPicture = new Image(); skyPicture.onload = () => { skyAspect = skyPicture.naturalWidth / Math.max(1, skyPicture.naturalHeight); measure(); }; skyPicture.src = art.background;
  function measure(): void {
    const box = stage.getBoundingClientRect(); width = Math.max(1, box.width); height = Math.max(1, box.height);
    tile = Math.max(1, height * skyAspect); sky.style.width = `${Math.ceil(width + tile + 2)}px`;
    bennyWidth = benny.offsetWidth; bennyHeight = benny.offsetHeight;
    for (const view of views.values()) view.style.width = `${BENNY_FLIGHT_GAME.columnWidth * width}px`;
  }
  // What is drawn: a soft height and tilt, and a wing phase that only speeds up or slows down, never jumps back.
  let shownY = 0, shownTilt = 0, wingPhase = 0, wingRate = 1 / BENNY_FLAPPY.calmBeat, quickUntil = 0, shownBeat = -1, drawnAt = 0;
  function settleView(): void { shownY = game?.y ?? 0; shownTilt = 0; wingRate = 1 / BENNY_FLAPPY.calmBeat; quickUntil = 0; drawnAt = game?.at ?? 0; }
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
    const g = BENNY_FLIGHT_GAME, now = game.at;
    const dt = Math.max(0, now - drawnAt); drawnAt = now;
    const glide = (timeConstant: number) => 1 - Math.exp(-dt / timeConstant);
    shownY += (game.y - shownY) * glide(BENNY_FLAPPY.heightGlide);
    shownTilt += (Math.max(-BENNY_FLAPPY.tiltUp, Math.min(BENNY_FLAPPY.tiltDown, game.vy * BENNY_FLAPPY.tiltPerSpeed)) - shownTilt) * glide(BENNY_FLAPPY.tiltGlide);
    benny.style.transform = `translate3d(${g.x * width - bennyWidth / 2}px, ${shownY * height - bennyHeight / 2}px, 0) rotate(${shownTilt}deg)`;
    wingRate += (1 / (now < quickUntil ? BENNY_FLAPPY.quickBeat : BENNY_FLAPPY.calmBeat) - wingRate) * glide(BENNY_FLAPPY.wingGlide);
    wingPhase = (wingPhase + dt * wingRate) % BENNY_FLAPPY.frames;
    const beat = Math.floor(wingPhase);
    if (beat !== shownBeat) { shownBeat = beat; benny.style.backgroundPositionX = `${beat / (BENNY_FLAPPY.frames - 1) * 100}%`; }
    // The sky scrolls with the columns, slower (a little depth): one picture wide, then it starts again.
    const skyShift = (((now - game.startedAt) / 1000) * g.speed * .4 * width) % tile;
    sky.style.transform = `translate3d(${-skyShift}px, 0, 0)`;
    const seen = new Set<number>();
    for (const c of game.columns) {
      seen.add(c.id);
      let view = views.get(c.id);
      if (!view) {
        view = document.createElement('div'); view.className = 'benny-flight-column';
        for (const part of ['top', 'bottom']) { const img = document.createElement('img'); img.alt = ''; img.draggable = false; img.src = art.column; img.dataset.part = part; view.append(img); }
        // A column's gap never changes: its two pictures are sized once.
        (view.children[0] as HTMLElement).style.height = `${(c.gapY - c.gap / 2) * 100}%`;
        (view.children[1] as HTMLElement).style.top = `${(c.gapY + c.gap / 2) * 100}%`;
        view.style.width = `${g.columnWidth * width}px`;
        columns.append(view); views.set(c.id, view);
      }
      view.style.transform = `translate3d(${c.x * width}px, 0, 0)`;
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
  let scheduled = false;
  function schedule(): void { if (scheduled) return; scheduled = true; frame(() => { scheduled = false; loop(); }); }
  function loop(): void { if (!running) return; update(); if (running) schedule(); }
  function flap(): void {
    if (!game || !running) return;
    const now = clock(); flapBennyFlight(game, now);
    quickUntil = now + BENNY_FLAPPY.quickBeat * BENNY_FLAPPY.frames;
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
    settleCard(card); again.focus();
  }
  function start(): void {
    previousBest = options.best?.() ?? 0; shownPassed = 0;
    for (const view of views.values()) view.remove(); views.clear();
    game = startBennyFlight(clock()); running = true; card.hidden = true; settleView();
    hud(); draw(); flash('Touche pour voler !', 'ready'); schedule();
  }
  function intro(): void {
    game = startBennyFlight(clock()); running = false; previousBest = options.best?.() ?? 0; settleView(); draw(); hud();
    showCard(paragraph('Le vol de Benny', 'benny-flight-title'),
      paragraph('Touche le ciel pour que Benny batte des ailes, et passe entre les colonnes de bottes de foin. Une colonne touchée, le haut du ciel ou la mer de nuages, et Benny se pose. Rejoue autant que tu veux !', 'benny-flight-rules'),
      button('C’est parti !', start, 'bennyFlightStart'));
  }
  function close(): void {
    if (layer.hidden) return;
    running = false; time.resume(); game = null; layer.hidden = true; clearTimeout(popTimer);
    window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: false})); options.onExit?.();
  }
  /** The phone locked or another app opened: the game waits, frozen, instead of being lost to the time gone by. */
  function pause(): void {
    if (!running) return;
    time.pause(); running = false;
    showCard(paragraph('Partie en pause', 'benny-flight-title'), button('Reprendre', resume, 'bennyFlightResume'), button('Quitter', close, 'bennyFlightQuit'));
  }
  function resume(): void { time.resume(); running = true; card.hidden = true; schedule(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, {signal: abort.signal});
  window.addEventListener('resize', () => { if (!layer.hidden) measure(); }, {signal: abort.signal});
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
      void chosen; // Only Benny plays: her flapping sprite is the same for every Benny.
      layer.hidden = false; window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: true}));
      measure(); intro(); $<HTMLButtonElement>('[data-benny-flight-start]').focus();
    },
    close, update, flap,
    dispose() { close(); abort.abort(); layer.remove(); },
  };
}
