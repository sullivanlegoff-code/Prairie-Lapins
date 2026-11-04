import {artForRabbit, rabbitArt} from '../config/rabbitArt';
import {JUMP_ROPE, SPECIES} from '../config/balance';
import {airTime, advanceJumpRope, ropePhase, startJumpRope, tapJumpRope, type JumpRopeGame} from '../simulation/jumpRope';
import {setCurrencyText} from '../display/currency';
import type {CuisineRabbit} from './CuisineActivity';
import {portrait} from './portraits';
import {JUMP_ROPE_ISLAND_URL, JUMP_ROPE_KIOSK_URL} from '../display/agency';
import {drawJumpRopeSky} from '../display/jumpRopeSky';

/** Two carriers turn the rope, the athlete jumps (looks only). */
export interface JumpRopeTrio {carriers: [CuisineRabbit, CuisineRabbit]; athlete: CuisineRabbit}

/**
 * The jump-rope game on its islet (src/simulation/jumpRope.ts holds the rules): a full-screen layer outside GameUI's rebuilt
 * panel, played with one tap anywhere (or the space bar). One miss ends the game; « Rejouer » starts the next one at once.
 * `onFinished` records the finished game and returns the reward line; `best` reads the record before the game; `cheer` plays
 * the confirmation sound on a « Parfait ! » streak, a milestone and a new record; `tick` plays the rhythm « tac » each time the
 * rope passes under the athlete's feet; `challengeText` describes the challenge of the day. The carriers console the athlete
 * after a miss and applaud a new record.
 */
export function mountJumpRopeActivity(host: HTMLElement, options: {
  onFinished: (team: JumpRopeTrio, score: number) => string;
  quotaText?: () => string;
  best?: () => number;
  cheer?: () => void;
  tick?: () => void;
  challengeText?: () => string;
  onExit?: () => void;
  /** Milliseconds, monotonic; performance.now() by default. Tests drive it and call `update()` themselves. */
  clock?: () => number;
  frame?: (step: () => void) => number;
}) {
  const clock = options.clock ?? (() => performance.now()), frame = options.frame ?? (step => requestAnimationFrame(step));
  const layer = document.createElement('div'); layer.className = 'jump-rope-activity'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Corde à sauter');
  layer.innerHTML = `<div class="jump-rope-top"><p class="jump-rope-score" aria-live="polite"></p><p class="jump-rope-best"></p><p class="jump-rope-quota"></p><button type="button" data-jump-rope-exit>Quitter</button></div>
<div class="jump-rope-stage" data-jump-rope-stage>
<canvas class="jump-rope-sky" aria-hidden="true"></canvas>
<img class="jump-rope-island" alt="" aria-hidden="true" draggable="false" src="${JUMP_ROPE_ISLAND_URL}">
<img class="jump-rope-kiosk" alt="" aria-hidden="true" draggable="false" src="${JUMP_ROPE_KIOSK_URL}">
<span class="jump-rope-carrier" data-side="left"><span class="jump-rope-figure"></span><span class="jump-rope-handle"></span></span>
<span class="jump-rope-carrier" data-side="right"><span class="jump-rope-figure"></span><span class="jump-rope-handle"></span></span>
<svg class="jump-rope-rope" data-layer="back" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path/></svg>
<span class="jump-rope-rabbit"><span class="jump-rope-figure"></span><span class="jump-rope-shadow"></span></span>
<svg class="jump-rope-rope" data-layer="front" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path/></svg>
<span class="jump-rope-burst" aria-hidden="true"></span>
<p class="jump-rope-combo" aria-hidden="true"></p>
<p class="jump-rope-cheer" aria-hidden="true"></p>
<p class="jump-rope-pop" aria-hidden="true"></p>
</div>
<div class="jump-rope-card" data-jump-rope-card></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const stage = $<HTMLElement>('[data-jump-rope-stage]'), card = $<HTMLElement>('[data-jump-rope-card]');
  const score = $<HTMLElement>('.jump-rope-score'), bestLine = $<HTMLElement>('.jump-rope-best'), quota = $<HTMLElement>('.jump-rope-quota');
  const rabbitBox = $<HTMLElement>('.jump-rope-rabbit'), figure = $<HTMLElement>('.jump-rope-rabbit .jump-rope-figure'), pop = $<HTMLElement>('.jump-rope-pop');
  const combo = $<HTMLElement>('.jump-rope-combo'), burst = $<HTMLElement>('.jump-rope-burst'), cheerLine = $<HTMLElement>('.jump-rope-cheer');
  const carriers = [...layer.querySelectorAll<HTMLElement>('.jump-rope-carrier')];
  const back = $<SVGPathElement>('[data-layer="back"] path'), front = $<SVGPathElement>('[data-layer="front"] path');
  const sky = $<HTMLCanvasElement>('.jump-rope-sky'), abort = new AbortController();
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (!layer.hidden) drawJumpRopeSky(sky); });
  resize?.observe(stage);
  let team: JumpRopeTrio | null = null, game: JumpRopeGame | null = null, running = false, popTimer: ReturnType<typeof setTimeout> | undefined;
  let previousBest = 0, recordShown = false, tickedAt = -Infinity;
  const nameOf = (r: CuisineRabbit) => r.name || SPECIES[r.species].name;
  const name = () => team ? nameOf(team.athlete) : '';
  const jumps = (n: number) => `${n} saut${n > 1 ? 's' : ''}`;
  const button = (label: string, action: () => void, key: string) => {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.dataset[key] = '';
    element.addEventListener('click', event => { event.stopPropagation(); action(); }); return element;
  };
  const paragraph = (text: string, className: string) => { const p = document.createElement('p'); p.className = className; p.textContent = text; return p; };
  function showCard(...children: HTMLElement[]): void { card.replaceChildren(...children); card.hidden = false; }
  function hud(): void {
    score.textContent = jumps(game?.score ?? 0);
    const best = Math.max(previousBest, game?.score ?? 0); bestLine.textContent = best ? `Record : ${best}` : '';
    quota.textContent = options.quotaText?.() ?? '';
  }
  /** Draws one rabbit's portrait, turned toward `facing` (1 right, -1 left). */
  function paint(target: HTMLElement, rabbit: CuisineRabbit, facing: 1 | -1): void {
    const art = rabbit.affection === undefined ? rabbitArt(rabbit.species) : artForRabbit({species: rabbit.species, affection: rabbit.affection, classicLook: rabbit.classicLook});
    target.innerHTML = portrait(rabbit.species, art);
    if ((art?.facing ?? 1) !== facing) target.dataset.mirrored = ''; else delete target.dataset.mirrored;
  }
  /**
   * The rope between the carriers' paws: low in front of the athlete's feet near phase 0, high behind its head near 0.5. Its
   * ends circle a little with the turn, like the carriers' paws, and the carriers sway with it.
   */
  function drawRope(phase: number): void {
    const turn = Math.cos(2 * Math.PI * phase), end = 73 - 3 * turn, y = turn > 0 ? end + 25 * turn : end + 71 * turn;
    const path = `M8 ${end} Q50 ${2 * y - end} 92 ${end}`, inFront = turn > 0;
    front.setAttribute('d', inFront ? path : ''); back.setAttribute('d', inFront ? '' : path);
    for (const carrier of carriers) carrier.style.setProperty('--turn', String(turn));
  }
  function flash(text: string, kind: 'jump' | 'perfect' | 'miss' | 'milestone' | 'record' | 'ready'): void {
    pop.textContent = text; pop.dataset.kind = kind; pop.classList.remove('shown'); void pop.offsetWidth; pop.classList.add('shown');
    clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('shown'), kind === 'ready' ? 900 : 520);
  }
  function celebrate(): void { burst.classList.remove('shown'); void burst.offsetWidth; burst.classList.add('shown'); }
  function stumble(): void { rabbitBox.classList.remove('stumble'); void rabbitBox.offsetWidth; rabbitBox.classList.add('stumble'); }
  /** The carriers react: they lean in to console the athlete, or hop and clap for a record. */
  function react(kind: 'console' | 'applaud' | null, line = ''): void {
    for (const carrier of carriers) { carrier.classList.remove('console', 'applaud'); if (kind) { void carrier.offsetWidth; carrier.classList.add(kind); } }
    cheerLine.textContent = line; cheerLine.dataset.kind = kind ?? ''; cheerLine.classList.toggle('shown', !!line);
  }
  /** The rhythm « tac »: once per pass of the rope under the feet, when the clock crosses it. */
  function rhythm(now: number): void {
    if (!game || game.over) return;
    const pass = now >= game.nextPassAt ? game.nextPassAt : game.lastPassAt;
    if (pass > tickedAt && now >= pass) { tickedAt = pass; options.tick?.(); }
  }
  function update(): void {
    if (!game) return;
    const now = clock(); rhythm(now);
    const missed = advanceJumpRope(game, now);
    if (missed) { flash('Oups !', 'miss'); stumble(); }
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
    if (result === 'miss') { flash('Oups !', 'miss'); stumble(); }
    else if (result === 'jump' || result === 'perfect') {
      const n = game.score;
      if (previousBest > 0 && n === previousBest + 1 && !recordShown) { recordShown = true; flash('Nouveau record !', 'record'); celebrate(); options.cheer?.(); react('applaud', 'Bravo !'); }
      else if (n % JUMP_ROPE.milestone === 0) { flash(`${n} sauts !`, 'milestone'); celebrate(); options.cheer?.(); }
      else if (result === 'perfect') { flash('Parfait !', 'perfect'); if (game.combo >= 3 && game.combo % 3 === 0) options.cheer?.(); }
      else flash('Hop !', 'jump');
      combo.textContent = game.combo >= 2 ? `Parfait ×${game.combo}` : ''; combo.classList.toggle('shown', game.combo >= 2);
    }
    update();
  }
  function finish(): void {
    running = false; const final = game!.score, who = team!, record = final > previousBest && final > 0;
    const reward = options.onFinished(who, final);
    const chips = document.createElement('p'); chips.className = 'jump-rope-rewards';
    for (const part of reward ? reward.split(' · ') : []) { const chip = document.createElement('span'); chip.className = 'cuisine-reward-chip'; setCurrencyText(chip, part); chips.append(chip); }
    combo.classList.remove('shown'); hud();
    react(record ? 'applaud' : 'console', record ? 'Bravo !' : final >= 5 ? 'C’était super !' : 'Courage, on recommence !');
    const again = button('Rejouer', start, 'jumpRopeAgain');
    showCard(paragraph(final ? `${name()} a fait ${jumps(final)} !` : `${name()} s’est emmêlé les pattes !`, 'jump-rope-title'),
      ...(record ? [paragraph(previousBest ? `Nouveau record ! L’ancien était de ${previousBest}.` : 'Ton premier record !', 'jump-rope-record')] : previousBest ? [paragraph(`Ton record : ${jumps(previousBest)}`, 'jump-rope-rules')] : []),
      chips, again, button('Quitter', close, 'jumpRopeQuit'));
    again.focus();
  }
  function start(): void {
    previousBest = options.best?.() ?? 0; recordShown = false;
    game = startJumpRope(clock()); running = true; tickedAt = -Infinity; card.hidden = true; rabbitBox.classList.remove('stumble'); combo.classList.remove('shown'); react(null);
    hud(); flash('Prêt ?', 'ready'); frame(loop);
  }
  function intro(): void {
    game = null; running = false; previousBest = options.best?.() ?? 0; drawRope(0.5); hud(); react(null);
    const challenge = options.challengeText?.() ?? '';
    const [left, right] = team!.carriers;
    showCard(paragraph(`${name()} saute à la corde !`, 'jump-rope-title'),
      paragraph(`${nameOf(left)} et ${nameOf(right)} font tourner la corde. Touche l’écran quand elle passe sous ${name()}. Elle tourne de plus en plus vite. Un raté et la partie s’arrête : rejoue autant que tu veux !`, 'jump-rope-rules'),
      ...(challenge ? [paragraph(challenge, 'jump-rope-challenge')] : []),
      button('C’est parti !', start, 'jumpRopeStart'));
  }
  function close(): void {
    if (layer.hidden) return;
    running = false; game = null; team = null; layer.hidden = true; clearTimeout(popTimer); options.onExit?.();
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
    get team() { return team; },
    element: layer,
    open(chosen: JumpRopeTrio) {
      team = chosen;
      paint(figure, chosen.athlete, 1);
      paint(carriers[0].querySelector('.jump-rope-figure')!, chosen.carriers[0], 1);
      paint(carriers[1].querySelector('.jump-rope-figure')!, chosen.carriers[1], -1);
      layer.hidden = false; drawJumpRopeSky(sky); intro(); $<HTMLButtonElement>('[data-jump-rope-start]').focus();
    },
    close, update, tap,
    dispose() { close(); abort.abort(); resize?.disconnect(); layer.remove(); },
  };
}
