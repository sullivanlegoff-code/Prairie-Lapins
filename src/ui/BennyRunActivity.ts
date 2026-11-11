import '../display/benny-run.css';
import {FULLSCREEN_ACTIVITY_EVENT} from '../config/bennyFlightGameArt';
import {advanceBennyRun, BENNY_RUN, comboMultiplier, dragonVisible, inAir, powerActive, runHeight, runInput, runSummary, sliding, startBennyRun, takeRunEvents,
  type BennyRun, type RunEntity, type RunInput, type RunPower, type RunSetting} from '../simulation/bennyRun';
import {pausableClock, settleCard} from './activityPause';

/**
 * « Cours cours Benny ! » (src/simulation/bennyRun.ts holds the rules): a full-screen layer like « Le vol de Benny ». This is the
 * grey prototype the owner tunes the feel with (11 November 2026): plain shapes on a canvas, the road seen from behind Benny in
 * perspective, until the painted art he chose (Benny seen from behind, the « conte doré » settings, the rainbow-ribbon wand, the
 * dragonnets, greedy chests and embers) replaces them. Swipes: up jump, down slide or ground charge, sideways lane or wall; a power
 * works as soon as Benny runs over it. The arrow keys do the same. The island's Phaser loop sleeps while the run is open.
 */
const LANE_WIDTH = 2.2, CAMERA_BACK = 8, CAMERA_HEIGHT = 2.2, WALL_X = 1.5 * LANE_WIDTH + .35, WALL_HEIGHT = 3.2, FAR = 90, NEAR = -(CAMERA_BACK - .6);
const SETTING_COLOURS: Record<RunSetting, {sky: string; ground: string; lane: string; wall: string; wallOff: string; side: string}> = {
  grotte: {sky: '#3a2a1c', ground: '#9a7a52', lane: '#b8956a', wall: '#c9a26a', wallOff: '#5c4630', side: '#e2b450'},
  pont: {sky: '#4a2420', ground: '#8d8378', lane: '#a39a8e', wall: '#b5aa9a', wallOff: '#55493f', side: '#f07a2a'},
  montagne: {sky: '#f2a77a', ground: '#a88a66', lane: '#c2a37c', wall: '#cdb48e', wallOff: '#6b5844', side: '#c9d8e8'},
};
const SETTING_NAMES: Record<RunSetting, string> = {grotte: 'La grotte dorée', pont: 'Le pont sur la lave', montagne: 'Le sentier de montagne'};
const POWER_NAMES: Record<RunPower, string> = {magnet: 'Aimant', bubble: 'Bulle arc-en-ciel', double: 'Pièces doublées', flight: 'Envol'};
const SWIPE = 24;
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function mountBennyRunActivity(host: HTMLElement, options: {onExit?: () => void; clock?: () => number; frame?: (step: () => void) => number} = {}) {
  const time = pausableClock(options.clock ?? (() => performance.now())), clock = time.now, frame = options.frame ?? (step => requestAnimationFrame(step));
  const layer = document.createElement('div'); layer.className = 'benny-run-activity'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Cours cours Benny !');
  layer.innerHTML = `<div class="benny-run-top"><p class="benny-run-score" aria-live="polite"></p><p class="benny-run-combo"></p><p class="benny-run-metres"></p><p class="benny-run-coins"></p>
<p class="benny-run-power"></p><button type="button" data-benny-run-exit>Quitter</button></div>
<canvas class="benny-run-canvas" data-benny-run-canvas></canvas>
<p class="benny-run-pop" aria-hidden="true"></p>
<div class="benny-run-card" data-benny-run-card></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const canvas = $<HTMLCanvasElement>('[data-benny-run-canvas]'), card = $<HTMLElement>('[data-benny-run-card]'), pop = $<HTMLElement>('.benny-run-pop');
  const score = $<HTMLElement>('.benny-run-score'), combo = $<HTMLElement>('.benny-run-combo'), metres = $<HTMLElement>('.benny-run-metres'), coins = $<HTMLElement>('.benny-run-coins');
  const powerLine = $<HTMLElement>('.benny-run-power');
  const context = canvas.getContext('2d');
  const abort = new AbortController();
  let game: BennyRun | null = null, running = false, best = 0, viewLane = 1, lastDrawAt = 0, popTimer: ReturnType<typeof setTimeout> | undefined;
  let swing: {at: number; lane: number} | null = null, flashes: {at: number; text: string; x: number}[] = [];
  let width = 0, height = 0;

  const button = (label: string, action: () => void, key: string) => {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.dataset[key] = '';
    element.addEventListener('click', event => { event.stopPropagation(); action(); }); return element;
  };
  const paragraph = (text: string, className: string) => { const p = document.createElement('p'); p.className = className; p.textContent = text; return p; };
  function showCard(...children: HTMLElement[]): void { card.replaceChildren(...children); card.hidden = false; }
  function flash(text: string): void { pop.textContent = text; pop.classList.remove('show'); void pop.offsetWidth; pop.classList.add('show'); clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('show'), 900); }
  function measure(): void {
    const ratio = Math.min(2, window.devicePixelRatio || 1), box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function hud(): void {
    const g = game; if (!g) return;
    const multiplier = g.at <= g.comboUntil ? comboMultiplier(g.combo) : 1;
    score.textContent = `${g.score}`;
    combo.textContent = multiplier > 1 ? `Combo ×${multiplier}` : g.combo > 1 && g.at <= g.comboUntil ? `${g.combo} coups` : '';
    metres.textContent = `${Math.floor(g.distance)} m`; coins.textContent = plural(g.coins, 'pièce');
    const active = g.active && g.at < g.active.until ? g.active : null;
    powerLine.textContent = active ? `${POWER_NAMES[active.power]} · ${Math.ceil((active.until - g.at) / 1000)} s` : '';
  }

  // Perspective: a point `x` metres across, `ahead` metres in front of Benny and `up` metres high.
  const project = (x: number, ahead: number, up: number) => {
    const horizon = height * .3, scale0 = width * .62 / (3 * LANE_WIDTH + 1), s = scale0 * CAMERA_BACK / (Math.max(-CAMERA_BACK + .5, ahead) + CAMERA_BACK);
    return {x: width / 2 + x * s, y: horizon + (CAMERA_HEIGHT - up) * s, s};
  };
  const laneX = (lane: number) => (lane - 1) * LANE_WIDTH;
  function quad(c: CanvasRenderingContext2D, points: {x: number; y: number}[], fill: string): void {
    c.beginPath(); c.moveTo(points[0].x, points[0].y); for (const p of points.slice(1)) c.lineTo(p.x, p.y); c.closePath(); c.fillStyle = fill; c.fill();
  }
  function road(c: CanvasRenderingContext2D, g: BennyRun, colours: typeof SETTING_COLOURS[RunSetting]): void {
    c.fillStyle = colours.sky; c.fillRect(0, 0, width, height);
    const horizon = project(0, FAR, 0).y;
    c.fillStyle = colours.side; c.fillRect(0, horizon, width, height - horizon);
    const edge = 1.5 * LANE_WIDTH;
    quad(c, [project(-edge, NEAR, 0), project(edge, NEAR, 0), project(edge, FAR, 0), project(-edge, FAR, 0)], colours.ground);
    // Lane stripes that scroll with the distance, so the speed reads.
    for (let k = 0; k < 40; k++) {
      const z0 = NEAR + k * 4 - (g.distance % 4), z1 = z0 + 2;
      if (z0 > FAR) break;
      for (const x of [-LANE_WIDTH / 2, LANE_WIDTH / 2]) quad(c, [project(x - .06, z0, 0), project(x + .06, z0, 0), project(x + .06, z1, 0), project(x - .06, z1, 0)], colours.lane);
    }
    // The walls, in their segments: runnable ones are lit and striped, the others dark.
    for (const w of g.walls) {
      const from = Math.max(NEAR, w.from - g.distance), to = Math.min(FAR, w.to - g.distance); if (to <= from) continue;
      const x = w.side === 'left' ? -WALL_X : WALL_X;
      quad(c, [project(x, from, 0), project(x, to, 0), project(x, to, WALL_HEIGHT), project(x, from, WALL_HEIGHT)], w.runnable ? colours.wall : colours.wallOff);
      if (w.runnable) for (let z = Math.ceil(from / 6) * 6; z < to; z += 6) {
        const a = project(x, z, .3), b = project(x, z, WALL_HEIGHT - .3);
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(1, a.s * .05); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
    }
  }
  const SHAPES: Record<string, {colour: string; w: number; h: number; up?: number; round?: boolean; label?: string}> = {
    coin: {colour: '#f4c430', w: .45, h: .45, up: .5, round: true}, power: {colour: '#b07bff', w: .8, h: .8, up: .6, round: true}, wallCoin: {colour: '#f4c430', w: .45, h: .45, up: 1.6, round: true},
    pot: {colour: '#c96b3a', w: .9, h: .9, round: true, label: 'pot'}, barrier: {colour: '#7a5a3a', w: 2, h: .6, label: 'saute'},
    beam: {colour: '#7a5a3a', w: 2, h: .45, up: 1.1, label: 'glisse'}, pillar: {colour: '#8a8a8a', w: 1.6, h: 3},
    dragonnet: {colour: '#8e3a5a', w: 1.1, h: .8, round: true, label: 'zzz'}, chest: {colour: '#6e3b2e', w: 1.3, h: .9, label: 'coffre'},
    ember: {colour: '#ff9a2a', w: .9, h: .9, up: .4, round: true, label: 'braise'},
  };
  function thing(c: CanvasRenderingContext2D, g: BennyRun, e: RunEntity): void {
    const shape = SHAPES[e.kind], ahead = e.z - g.distance; if (!shape || ahead > FAR || ahead < -3) return;
    const x = e.lane < 0 ? -WALL_X + .4 : e.lane > 2 ? WALL_X - .4 : laneX(e.lane);
    const base = project(x, ahead, shape.up ?? 0), w = shape.w * base.s, h = shape.h * base.s;
    c.fillStyle = shape.colour;
    if (shape.round) { c.beginPath(); c.ellipse(base.x, base.y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); }
    else c.fillRect(base.x - w / 2, base.y - h, w, h);
    if (e.kind === 'power' && e.power && base.s > 14) { c.fillStyle = '#fff'; c.font = `800 ${Math.round(Math.max(10, base.s * .3))}px system-ui`; c.textAlign = 'center'; c.fillText(POWER_NAMES[e.power], base.x, base.y - h - 4); }
    if (shape.label && base.s > 18) { c.fillStyle = '#fff'; c.font = `700 ${Math.round(Math.max(10, base.s * .28))}px system-ui`; c.textAlign = 'center'; c.fillText(shape.label, base.x, base.y - h - 4); }
  }
  function benny(c: CanvasRenderingContext2D, g: BennyRun, now: number): void {
    const wall = g.wall, x = wall ? (wall.side === 'left' ? -WALL_X + .45 : WALL_X - .45) : laneX(viewLane);
    const up = wall ? 1.2 : runHeight(g), p = project(x, 0, up), s = p.s;
    const flat = sliding(g), w = (flat ? 1.1 : .8) * s, h = (flat ? .45 : 1) * s;
    c.save(); c.translate(p.x, p.y - h / 2);
    if (wall) c.rotate(wall.side === 'left' ? -1.1 : 1.1);
    if (g.at < g.stumbleUntil && Math.floor(now / 80) % 2) c.globalAlpha = .45;
    c.fillStyle = '#d99a5b'; c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7d6a5a'; c.fillRect(-w * .28, -h / 2 - .35 * s, w * .14, .4 * s); c.fillRect(w * .14, -h / 2 - .35 * s, w * .14, .4 * s);
    c.fillStyle = '#fff8ee'; c.beginPath(); c.arc(0, h * .3, w * .14, 0, Math.PI * 2); c.fill();
    if (powerActive(g, 'bubble')) { c.strokeStyle = 'rgba(180,140,255,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, w * .85, 0, Math.PI * 2); c.stroke(); }
    c.restore();
    if (!inAir(g) && !wall && !powerActive(g, 'flight')) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(p.x, project(x, 0, 0).y, w * .55, s * .12, 0, 0, Math.PI * 2); c.fill(); }
    // The wand's rainbow sweep for a moment after a strike.
    if (swing && now - swing.at < 220) {
      const k = (now - swing.at) / 220, colours = ['#ff6b6b', '#ffb84d', '#ffe66b', '#7be08a', '#6bb8ff', '#b07bff'];
      colours.forEach((colour, i) => { c.strokeStyle = colour; c.globalAlpha = 1 - k; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y - h * .6, s * (.9 + i * .07), Math.PI * (1.1 + k * .2), Math.PI * (1.9 + k * .2)); c.stroke(); });
      c.globalAlpha = 1;
    }
  }
  function dragon(c: CanvasRenderingContext2D, g: BennyRun): void {
    if (!dragonVisible(g)) return;
    // Behind Benny (between her and the camera), on her outer side, low on the screen: she swoops in from below, then hovers.
    const since = g.lastBumpAt === null ? g.at - g.startedAt : g.at - g.lastBumpAt, left = g.lastBumpAt === null ? BENNY_RUN.introMs : BENNY_RUN.dragonMs;
    const out = Math.min(1, since / 450, Math.max(0, (left - since) / 450));
    const side = viewLane > 1.5 ? -1 : 1, x = laneX(viewLane) + side * 1.1, ahead = -4.2 - (1 - out) * 2;
    const p = project(x, ahead, 1.1 + Math.sin(g.at / 260) * .1), size = .5 * p.s;
    c.save(); c.globalAlpha = out;
    c.fillStyle = '#b58ad1';
    for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(p.x + dir * size * .6, p.y); c.lineTo(p.x + dir * size * 1.6, p.y - size * .8 * Math.abs(Math.sin(g.at / 120))); c.lineTo(p.x + dir * size * .3, p.y - size * .3); c.fill(); }
    c.fillStyle = '#9c2f3c'; c.beginPath(); c.ellipse(p.x, p.y, size * .75, size * .55, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = `800 ${Math.round(size * .28)}px system-ui`; c.textAlign = 'center'; c.fillText('Dragon', p.x, p.y + size * .1);
    c.restore();
  }
  function draw(now: number): void {
    const c = context, g = game; if (!c || !g) return;
    const dt = Math.min(.05, Math.max(0, (now - lastDrawAt) / 1000)); lastDrawAt = now;
    viewLane += (g.lane - viewLane) * Math.min(1, dt * 18);
    road(c, g, SETTING_COLOURS[g.setting]);
    const ahead = [...g.entities].sort((a, b) => b.z - a.z);
    for (const e of ahead) if (e.z - g.distance > 0) thing(c, g, e);
    benny(c, g, now);
    for (const e of ahead) if (e.z - g.distance <= 0) thing(c, g, e);
    dragon(c, g);
    flashes = flashes.filter(f => now - f.at < 700);
    for (const f of flashes) { c.globalAlpha = 1 - (now - f.at) / 700; c.fillStyle = '#fff'; c.font = '800 22px system-ui'; c.textAlign = 'center'; c.fillText(f.text, f.x, height * .55 - (now - f.at) * .05); }
    c.globalAlpha = 1;
  }
  function react(): void {
    const g = game; if (!g) return;
    for (const event of takeRunEvents(g)) switch (event.type) {
      case 'strike': swing = {at: clock(), lane: g.lane}; flashes.push({at: clock(), text: `+${event.points}`, x: project(laneX(event.entity.lane), 0, 0).x}); break;
      case 'bump': flash('Aïe ! La Dragon arrive !'); break;
      case 'shield': flash('La bulle te protège !'); break;
      case 'power': flash(`${POWER_NAMES[event.power]} !`); break;
      case 'wallEnd': flashes.push({at: clock(), text: `Mur +${event.points}`, x: width / 2}); break;
      case 'setting': flash(SETTING_NAMES[event.setting]); break;
      case 'caught': finish(); break;
      default: break;
    }
  }
  function loop(): void {
    if (!running || !game) return;
    const now = clock(); advanceBennyRun(game, now); react(); hud(); draw(now);
    if (running) frame(loop);
  }
  function input(gesture: RunInput): void { if (!running || !game) return; runInput(game, clock(), gesture); react(); hud(); }
  function finish(): void {
    if (!game) return;
    running = false; const s = runSummary(game), record = s.score > best && s.score > 0, previous = best; best = Math.max(best, s.score);
    hud();
    const again = button('Rejouer', start, 'bennyRunAgain');
    showCard(paragraph('La Dragon a rattrapé Benny !', 'benny-run-title'),
      paragraph('Elles se chamaillent pour le trésor… (scène peinte à venir)', 'benny-run-rules'),
      paragraph(`Score ${s.score} · ${s.metres} m · ${plural(s.coins, 'pièce')} · ${plural(s.pots, 'pot')} · ${plural(s.foes, 'créature')} · ${plural(s.wallRuns, 'mur')} · meilleur combo ${s.bestCombo} · ${s.seconds} s`, 'benny-run-rules'),
      ...(record ? [paragraph(previous ? `Nouveau record ! L’ancien était de ${previous}.` : 'Ton premier record !', 'benny-run-record')] : best ? [paragraph(`Ton record : ${best}`, 'benny-run-rules')] : []),
      again, button('Quitter', close, 'bennyRunQuit'));
    settleCard(card); again.focus();
  }
  function start(): void {
    game = startBennyRun(clock()); viewLane = 1; swing = null; flashes = []; running = true; card.hidden = true; lastDrawAt = clock();
    hud(); flash('Cours cours Benny !'); frame(loop);
  }
  function intro(): void {
    game = startBennyRun(clock()); running = false; measure(); hud(); draw(clock());
    showCard(paragraph('Cours cours Benny !', 'benny-run-title'),
      paragraph('Benny a chipé un peu du trésor de la Dragon ! Glisse vers le haut pour sauter, vers le bas pour glisser (en l’air : charge au sol), sur le côté pour changer de couloir ou courir sur le mur. Change de couloir vers un pot ou une créature pour la frapper avec ton bâton. Passe sur un pouvoir pour l’utiliser tout de suite.', 'benny-run-rules'),
      paragraph('Prototype en formes grises : les vrais dessins arrivent ensuite.', 'benny-run-rules'),
      button('C’est parti !', start, 'bennyRunStart'));
  }
  function close(): void {
    if (layer.hidden) return;
    running = false; time.resume(); game = null; layer.hidden = true; clearTimeout(popTimer);
    window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: false})); options.onExit?.();
  }
  function pause(): void {
    if (!running) return;
    time.pause(); running = false;
    showCard(paragraph('Partie en pause', 'benny-run-title'), button('Reprendre', resume, 'bennyRunResume'), button('Quitter', close, 'bennyRunQuit'));
  }
  function resume(): void { time.resume(); running = true; card.hidden = true; lastDrawAt = clock(); frame(loop); }

  // Gestures: a swipe fires as soon as the finger has moved far enough.
  let touch: {x: number; y: number; id: number; fired: boolean} | null = null;
  canvas.addEventListener('pointerdown', event => { event.preventDefault(); touch = {x: event.clientX, y: event.clientY, id: event.pointerId, fired: false}; }, {signal: abort.signal});
  canvas.addEventListener('pointermove', event => {
    if (!touch || touch.id !== event.pointerId || touch.fired) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    touch.fired = true; input(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
  }, {signal: abort.signal});
  canvas.addEventListener('pointerup', () => { touch = null; }, {signal: abort.signal});
  canvas.addEventListener('pointercancel', () => { touch = null; }, {signal: abort.signal});
  $<HTMLButtonElement>('[data-benny-run-exit]').addEventListener('click', () => close(), {signal: abort.signal});
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, {signal: abort.signal});
  window.addEventListener('resize', () => { if (!layer.hidden) { measure(); if (game) draw(clock()); } }, {signal: abort.signal});
  const keys: Record<string, RunInput> = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'};
  document.addEventListener('keydown', event => {
    if (layer.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    const gesture = keys[event.key]; if (gesture && running) { event.preventDefault(); input(gesture); }
  }, {signal: abort.signal});

  return {
    get active() { return !layer.hidden; },
    get playing() { return running; },
    get game() { return game; },
    element: layer,
    open() {
      layer.hidden = false; window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: true}));
      intro(); $<HTMLButtonElement>('[data-benny-run-start]').focus();
    },
    close, input,
    dispose() { close(); abort.abort(); layer.remove(); },
  };
}
