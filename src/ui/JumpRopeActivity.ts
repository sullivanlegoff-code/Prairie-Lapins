import {artForRabbit, rabbitArt} from '../config/rabbitArt';
import {JUMP_ROPE, SPECIES} from '../config/balance';
import {airTime, advanceJumpRope, ropePhase, startJumpRope, tapJumpRope, type JumpRopeGame} from '../simulation/jumpRope';
import {setCurrencyText} from '../display/currency';
import type {CuisineRabbit} from './CuisineActivity';
import {portrait} from './portraits';
import {JUMP_ROPE_ISLAND_URL, JUMP_ROPE_KIOSK_URL} from '../display/agency';
import {drawJumpRopeSky} from '../display/jumpRopeSky';

/**
 * The Terrain de corde à sauter's game (src/simulation/jumpRope.ts holds the rules): a full-screen layer outside GameUI's rebuilt
 * panel, played with one tap anywhere (or the space bar). `onFinished` records the finished game and returns the reward line.
 */
export function mountJumpRopeActivity(host: HTMLElement, options: {
  onFinished: (rabbit: CuisineRabbit, score: number) => string;
  quotaText?: () => string;
  onExit?: () => void;
  /** Milliseconds, monotonic; performance.now() by default. Tests drive it and call `update()` themselves. */
  clock?: () => number;
  frame?: (step: () => void) => number;
}) {
  const clock = options.clock ?? (() => performance.now()), frame = options.frame ?? (step => requestAnimationFrame(step));
  const layer = document.createElement('div'); layer.className = 'jump-rope-activity'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Corde à sauter');
  layer.innerHTML = `<div class="jump-rope-top"><p class="jump-rope-score" aria-live="polite"></p><p class="jump-rope-lives"></p><p class="jump-rope-quota"></p><button type="button" data-jump-rope-exit>Quitter</button></div>
<div class="jump-rope-stage" data-jump-rope-stage>
<canvas class="jump-rope-sky" aria-hidden="true"></canvas>
<img class="jump-rope-island" alt="" aria-hidden="true" draggable="false" src="${JUMP_ROPE_ISLAND_URL}">
<img class="jump-rope-kiosk" alt="" aria-hidden="true" draggable="false" src="${JUMP_ROPE_KIOSK_URL}">
<span class="jump-rope-post" data-side="left"></span><span class="jump-rope-post" data-side="right"></span>
<svg class="jump-rope-rope" data-layer="back" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path/></svg>
<span class="jump-rope-rabbit"><span class="jump-rope-figure"></span><span class="jump-rope-shadow"></span></span>
<svg class="jump-rope-rope" data-layer="front" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path/></svg>
<p class="jump-rope-pop" aria-hidden="true"></p>
</div>
<div class="jump-rope-card" data-jump-rope-card></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const stage = $<HTMLElement>('[data-jump-rope-stage]'), card = $<HTMLElement>('[data-jump-rope-card]');
  const score = $<HTMLElement>('.jump-rope-score'), lives = $<HTMLElement>('.jump-rope-lives'), quota = $<HTMLElement>('.jump-rope-quota');
  const rabbitBox = $<HTMLElement>('.jump-rope-rabbit'), figure = $<HTMLElement>('.jump-rope-figure'), pop = $<HTMLElement>('.jump-rope-pop');
  const back = $<SVGPathElement>('[data-layer="back"] path'), front = $<SVGPathElement>('[data-layer="front"] path');
  const sky = $<HTMLCanvasElement>('.jump-rope-sky'), abort = new AbortController();
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (!layer.hidden) drawJumpRopeSky(sky); });
  resize?.observe(stage);
  let rabbit: CuisineRabbit | null = null, game: JumpRopeGame | null = null, running = false, popTimer: ReturnType<typeof setTimeout> | undefined;
  const name = () => rabbit ? rabbit.name || SPECIES[rabbit.species].name : '';
  const button = (label: string, action: () => void, key: string) => {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.dataset[key] = '';
    element.addEventListener('click', event => { event.stopPropagation(); action(); }); return element;
  };
  const paragraph = (text: string, className: string) => { const p = document.createElement('p'); p.className = className; p.textContent = text; return p; };
  function showCard(...children: HTMLElement[]): void { card.replaceChildren(...children); card.hidden = false; }
  function hud(): void {
    score.textContent = `${game?.score ?? 0} saut${(game?.score ?? 0) > 1 ? 's' : ''}`;
    const left = JUMP_ROPE.lives - (game?.misses ?? 0);
    lives.textContent = `Essais : ${'●'.repeat(Math.max(0, left))}${'○'.repeat(Math.min(JUMP_ROPE.lives, game?.misses ?? 0))}`;
    lives.setAttribute('aria-label', `${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`);
    quota.textContent = options.quotaText?.() ?? '';
  }
  /** The rope as a curve between the two posts: low (in front of the feet) near phase 0, high (behind the head) near 0.5. */
  function drawRope(phase: number): void {
    const height = Math.cos(2 * Math.PI * phase), y = 46 + 46 * height, path = `M8 46 Q50 ${2 * y - 46} 92 46`;
    const inFront = height > 0;
    front.setAttribute('d', inFront ? path : ''); back.setAttribute('d', inFront ? '' : path);
  }
  function flash(text: string, kind: 'jump' | 'miss'): void {
    pop.textContent = text; pop.dataset.kind = kind; pop.classList.remove('shown'); void pop.offsetWidth; pop.classList.add('shown');
    clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('shown'), 450);
  }
  function update(): void {
    if (!game) return;
    const now = clock(), missed = advanceJumpRope(game, now);
    if (missed) { flash('Oups !', 'miss'); rabbitBox.classList.remove('stumble'); void rabbitBox.offsetWidth; rabbitBox.classList.add('stumble'); }
    drawRope(ropePhase(game, now));
    const air = game.lastJumpAt === null ? 1 : (now - game.lastJumpAt) / airTime(game.period);
    rabbitBox.style.setProperty('--lift', air < 1 ? String(Math.sin(Math.PI * air)) : '0');
    hud();
    if (game.over && running) finish();
  }
  function loop(): void { if (!running) return; update(); frame(loop); }
  function tap(): void {
    if (!game || !running) return;
    const result = tapJumpRope(game, clock());
    if (result === 'jump') flash('Hop !', 'jump');
    else if (result === 'miss') { flash('Oups !', 'miss'); rabbitBox.classList.remove('stumble'); void rabbitBox.offsetWidth; rabbitBox.classList.add('stumble'); }
    update();
  }
  function finish(): void {
    running = false; const final = game!.score, who = rabbit!;
    const reward = options.onFinished(who, final);
    const chips = document.createElement('p'); chips.className = 'jump-rope-rewards';
    for (const part of reward ? reward.split(' · ') : []) { const chip = document.createElement('span'); chip.className = 'cuisine-reward-chip'; setCurrencyText(chip, part); chips.append(chip); }
    hud();
    showCard(paragraph(final ? `${name()} a fait ${final} saut${final > 1 ? 's' : ''} !` : `${name()} s’est emmêlé les pattes. Réessaie !`, 'jump-rope-title'), chips,
      button('Rejouer', start, 'jumpRopeAgain'), button('Quitter', close, 'jumpRopeQuit'));
  }
  function start(): void {
    game = startJumpRope(clock()); running = true; card.hidden = true; rabbitBox.classList.remove('stumble'); hud(); frame(loop);
  }
  function intro(): void {
    game = null; running = false; drawRope(0.5); hud();
    showCard(paragraph(`${name()} saute à la corde !`, 'jump-rope-title'),
      paragraph('Touche l’écran quand la corde passe sous ton lapin. Elle tourne de plus en plus vite. Trois ratés et la partie s’arrête.', 'jump-rope-rules'),
      button('C’est parti !', start, 'jumpRopeStart'));
  }
  function close(): void {
    if (layer.hidden) return;
    running = false; game = null; rabbit = null; layer.hidden = true; clearTimeout(popTimer); options.onExit?.();
  }
  stage.addEventListener('pointerdown', event => { event.preventDefault(); tap(); }, {signal: abort.signal});
  $<HTMLButtonElement>('[data-jump-rope-exit]').addEventListener('click', () => close(), {signal: abort.signal});
  document.addEventListener('keydown', event => {
    if (layer.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if ((event.key === ' ' || event.key === 'ArrowUp') && running) { event.preventDefault(); tap(); }
  }, {signal: abort.signal});
  return {
    get active() { return !layer.hidden; },
    get playing() { return running; },
    get rabbit() { return rabbit; },
    element: layer,
    open(chosen: CuisineRabbit) {
      rabbit = chosen;
      const art = chosen.affection === undefined ? rabbitArt(chosen.species) : artForRabbit({species: chosen.species, affection: chosen.affection, classicLook: chosen.classicLook});
      figure.innerHTML = portrait(chosen.species, art); if (art?.facing === -1) figure.dataset.mirrored = ''; else delete figure.dataset.mirrored;
      layer.hidden = false; drawJumpRopeSky(sky); intro(); $<HTMLButtonElement>('[data-jump-rope-start]').focus();
    },
    close, update, tap,
    dispose() { close(); abort.abort(); resize?.disconnect(); layer.remove(); },
  };
}
