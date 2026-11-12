import '../display/benny-run.css';
import {FULLSCREEN_ACTIVITY_EVENT} from '../config/bennyFlightGameArt';
import {advanceBennyRun, BENNY_RUN, floorHeight, lanesAt, reach, settingAt, wallLane, comboMultiplier, dragonVisible, inAir, powerActive, runHeight, runInput, runSummary, sliding, startBennyRun, takeRunEvents,
  type BennyRun, type ChallengeKind, type RunEntity, type RunInput, type RunPower, type RunSetting, type RunSummary, type TutorialStep} from '../simulation/bennyRun';
import {pausableClock, settleCard} from './activityPause';

/**
 * « Cours cours Benny ! » (src/simulation/bennyRun.ts holds the rules): a full-screen layer like « Le vol de Benny ». This is the
 * grey prototype the owner tunes the feel with (11 November 2026): plain shapes on a canvas, the road seen from behind Benny in
 * perspective, until the painted art he chose (Benny seen from behind, the « conte doré » settings, the rainbow-ribbon wand, the
 * dragonnets, greedy chests and embers) replaces them. Swipes: up jump, down slide (it strikes) or ground charge, sideways lane or wall;
 * a power works as soon as Benny runs over it. The arrow keys do the same. The island's Phaser loop sleeps while the run is open.
 * Played with the iPhone upright only (owner, 11 November 2026): turned sideways, the run pauses behind a « tourne ton iPhone » card.
 */
const HORIZON = .15, LANE_WIDTH = 2.2, CAMERA_BACK = 14, WALL_HEIGHT = 4.5, BENNY_SIZE = 1.35, FAR = 90, NEAR = -(CAMERA_BACK - .6);
const SETTING_COLOURS: Record<RunSetting, {sky: string; ground: string; lane: string; wall: string; wallOff: string; side: string; hole: string; holeEdge: string}> = {
  grotte: {sky: '#3a2a1c', ground: '#9a7a52', lane: '#b8956a', wall: '#c9a26a', wallOff: '#5c4630', side: '#e2b450', hole: '#1c120b', holeEdge: '#5a3d22'},
  pont: {sky: '#4a2420', ground: '#8d8378', lane: '#a39a8e', wall: '#b5aa9a', wallOff: '#55493f', side: '#f07a2a', hole: '#ff6a1a', holeEdge: '#ffd27a'},
  montagne: {sky: '#f2a77a', ground: '#a88a66', lane: '#c2a37c', wall: '#cdb48e', wallOff: '#6b5844', side: '#c9d8e8', hole: '#5d7894', holeEdge: '#eef4fa'},
};
export const BENNY_RUN_SETTING_SHORT: Record<RunSetting, string> = {grotte: 'Grotte', pont: 'Pont', montagne: 'Montagne'};
const SETTING_NAMES: Record<RunSetting, string> = {grotte: 'La grotte dorée', pont: 'Le pont sur la lave', montagne: 'Le sentier de montagne'};
/** A challenge said to the player (tutoiement). */
const CHALLENGE_TEXT: Record<ChallengeKind, (goal: number) => string> = {
  pots: n => `frappe ${n} pots`, coins: n => `ramasse ${n} pièces`, foes: n => `frappe ${n} créatures`, walls: n => `cours sur ${n} murs`, combo: n => `fais un combo de ${n}`,
  clean: n => `cours ${n} m sans choc`, dodges: n => `saute ou passe dessous ${n} fois`,
  leaps: n => `bondis ${n} fois d’un mur à l’autre`,
};
/** A hint the first time each newer obstacle comes into sight (once per device). */
const FLASH_READ = 550;
/** How far ahead (m) the magnet starts pulling the coins of the other lanes towards Benny. */
const MAGNET_PULL = 10;
/** A power's last moments (ms): its line and its aura blink. */
const POWER_ENDING = 1000;
/** The obstacles' words (« saute », « roulade ») stay until she has got past that kind this many times in the run. */
const LABEL_UNTIL = 3;
const HINTS = {
  rock: 'Éboulement ! Saute les rochers ou prends le couloir libre.', geyser: 'Geysers de lave : on ne les saute pas, contourne-les !',
  fire: 'Boules de feu : saute-les ou écarte-toi !', snow: 'Boules de neige : saute-les ou écarte-toi !', cart: 'Wagonnets fous : trop hauts, écarte-toi !',
  pit: 'Le sol craque ! Saute la fosse ou change de couloir.', spring: 'Un tremplin ! Passe dessus pour bondir par-dessus les piliers.', gold: 'Un pot doré ! Frappe-le : il vaut cinq pots.', platform: 'Une plateforme : monte par la rampe !',
} as const;
type HintKind = keyof typeof HINTS;
const HINTS_KEY = 'prairie-lapins:benny-run-hints';
const POWER_NAMES: Record<RunPower, string> = {magnet: 'Aimant', bubble: 'Bulle arc-en-ciel', double: 'Pièces doublées', flight: 'Envol', dash: 'Ruée'};
/** A swipe fires once the finger has moved this far; a quick flick lifted sooner still counts from `FLICK` px. */
const SWIPE = 18, FLICK = 10;
/** Without lifting the finger, the same swipe again needs this many times the swipe distance. */
const SAME_AGAIN = 3;
export type RunSound = 'strike' | 'pot' | 'coin' | 'bump' | 'jump' | 'roll' | 'shock' | 'wall' | 'power' | 'caught' | 'dodge' | 'rumble' | 'whoosh' | 'land' | 'sizzle';
/** Feedback: a strike freezes the game for `HIT_STOP` ms; shakes last their `ms` with this many pixels at most. */
/** A big moment (shock wave, spin, a flying pot bowling a creature over) plays in slow motion at this rate for a moment. */
const SLOW_RATE = .35;
const HIT_STOP = 45, SHAKES = {strike: {ms: 90, px: 3}, bump: {ms: 260, px: 9}, shock: {ms: 320, px: 11}} as const;
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function mountBennyRunActivity(host: HTMLElement, options: {
  /** Records a finished run (the record); returns a line for the end card, if any. */
  onFinished?: (summary: RunSummary) => string | void;
  /** The best score kept by the game, read before each run. */
  best?: () => number;
  /** The longest run kept by the game (m): a banner stands across the road there. */
  bestMetres?: () => number;
  /** A short sound for an action (the game's Bruitages channel); silent when absent. */
  sound?: (kind: RunSound, pitch?: number) => void;
  onExit?: () => void; clock?: () => number; frame?: (step: () => void) => number;
} = {}) {
  const time = pausableClock(options.clock ?? (() => performance.now())), clock = time.now, frame = options.frame ?? (step => requestAnimationFrame(step));
  const layer = document.createElement('div'); layer.className = 'benny-run-activity'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Cours cours Benny !');
  layer.innerHTML = `<div class="benny-run-top"><p class="benny-run-score" aria-live="polite"></p><p class="benny-run-combo"></p><div class="benny-run-combo-bar" aria-hidden="true"><span></span></div><p class="benny-run-metres"></p><p class="benny-run-coins"></p>
<p class="benny-run-power"></p><button type="button" data-benny-run-pause aria-label="Pause">❚❚</button><button type="button" data-benny-run-exit aria-label="Quitter">✕</button><p class="benny-run-danger" hidden></p><p class="benny-run-challenge"></p></div>
<canvas class="benny-run-canvas" data-benny-run-canvas></canvas>
<p class="benny-run-pop" aria-hidden="true"></p>
<p class="benny-run-coach" aria-live="polite" hidden></p>
<div class="benny-run-card" data-benny-run-card></div>
<div class="benny-run-turn" data-benny-run-turn hidden><div class="benny-run-phone" aria-hidden="true"></div><p>Tourne ton iPhone à la verticale pour jouer à Cours cours Benny !</p></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const canvas = $<HTMLCanvasElement>('[data-benny-run-canvas]'), card = $<HTMLElement>('[data-benny-run-card]'), pop = $<HTMLElement>('.benny-run-pop');
  const score = $<HTMLElement>('.benny-run-score'), combo = $<HTMLElement>('.benny-run-combo'), metres = $<HTMLElement>('.benny-run-metres'), coins = $<HTMLElement>('.benny-run-coins');
  const challengeLine = $<HTMLElement>('.benny-run-challenge');
  const coach = $<HTMLElement>('.benny-run-coach'), danger = $<HTMLElement>('.benny-run-danger'), comboBar = $<HTMLElement>('.benny-run-combo-bar'), comboFill = $<HTMLElement>('.benny-run-combo-bar span');
  const powerLine = $<HTMLElement>('.benny-run-power'), turn = $<HTMLElement>('[data-benny-run-turn]');
  const sideways = () => window.innerWidth > window.innerHeight;
  const context = canvas.getContext('2d');
  const abort = new AbortController();
  let game: BennyRun | null = null, running = false, best = 0, viewLane = 1, lastDrawAt = 0, popTimer: ReturnType<typeof setTimeout> | undefined;
  /** Screen-space bits flying out of a pot or a creature, coin sparkles, and the present shake. */
  let bits: {x: number; y: number; vx: number; vy: number; at: number; life: number; colour: string; size: number}[] = [];
  let shake: {at: number; ms: number; px: number} | null = null, hurtAt: number | null = null, lastCoinSound = 0, stopTimer: ReturnType<typeof setTimeout> | undefined;
  const sound = (kind: RunSound, pitch = 1) => { try { options.sound?.(kind, pitch); } catch { /* Sound is optional. */ } };
  function burst(x: number, y: number, colours: readonly string[], count: number, speed: number): void {
    const at = clock();
    for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, v = speed * (.4 + Math.random() * .8);
      bits.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * .6, at, life: 380 + Math.random() * 260, colour: colours[i % colours.length], size: 3 + Math.random() * 4}); }
    if (bits.length > 160) bits = bits.slice(-160);
  }
  /** A short freeze on a strike, so that the hit lands (the game clock stops, the drawing goes on). */
  function hitStop(ms = HIT_STOP): void {
    if (!running) return;
    time.pause(); clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { if (running) time.resume(); }, ms);
  }
  /** The game's own time: the clock, less what the slow motions have held back. */
  let slowLost = 0, slowUntil = 0, lastLoopAt = 0;
  const gameTime = () => clock() - slowLost;
  const slowMo = (ms: number) => { const now = clock(); if (now > slowUntil + 900) slowUntil = now + ms; };
  const shakeFor = (kind: keyof typeof SHAKES) => { const s = SHAKES[kind]; if (!shake || shake.px <= s.px || clock() - shake.at > shake.ms) shake = {at: clock(), ...s}; };
  let rings: {x: number; y: number; at: number; size: number}[] = [];
  /** Coins picked up close together climb in pitch (back down after a pause). */
  let coinRun = 0;
  let swing: {at: number; lane: number} | null = null, shock: number | null = null, flashes: {at: number; text: string; x: number}[] = [];
  let width = 0, height = 0;
  /** The road's lanes (3 for now; zones of up to 5 later) and the walls' distance from its middle. */
  let lanes = 3, viewLanes = 3, frameDt = 0;
  /** The lane each thing is drawn in (it glides to its lane). */
  const shownLanes = new Map<number, number>();
  const wallX = () => lanes / 2 * LANE_WIDTH + .35;
  /** How wide the road is drawn `ahead` m in front of Benny (in lanes): it opens over 6 m into a wide hall and closes over
   * 6 m past its end. */
  function lanesDrawn(g: BennyRun, ahead: number): number {
    const z = g.distance + ahead; let wide = 0;
    for (const w of g.zones) wide = Math.max(wide, z >= w.from && z < w.to ? Math.min(1, (z - w.from) / 6) : z >= w.to ? Math.max(0, 1 - (z - w.to) / 6) : 0);
    return g.baseLanes + (BENNY_RUN.wideLanes - g.baseLanes) * wide;
  }
  const halfAt = (g: BennyRun, ahead: number) => lanesDrawn(g, ahead) / 2 * LANE_WIDTH;
  const wallXAt = (g: BennyRun, ahead: number) => halfAt(g, ahead) + .35;
  /** Where along the road to cut it for drawing: finer near Benny and around the edges of a wide hall. */
  function cuts(g: BennyRun, from: number, to: number): number[] {
    const list = [from, to];
    for (let z = from; z < to; z += z < 30 ? 3 : 8) list.push(z);
    for (const w of g.zones) for (const edge of [w.from, w.to]) for (let k = 0; k <= 6; k += 1.5) { const z = edge - g.distance + k; if (z > from && z < to) list.push(z); }
    return [...new Set(list)].sort((a, b) => a - b);
  }
  /** A strip of the road between `from` and `to` m ahead, `x0`..`x1` as shares of each side's half-width (-1 to 1). */
  function strip(c: CanvasRenderingContext2D, g: BennyRun, from: number, to: number, colour: string, up = 0, x0 = -1, x1 = 1): void {
    const zs = cuts(g, from, to); c.fillStyle = colour; c.beginPath();
    zs.forEach((z, i) => { const p = project(x0 * halfAt(g, z), z, up); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
    for (const z of [...zs].reverse()) { const p = project(x1 * halfAt(g, z), z, up); c.lineTo(p.x, p.y); }
    c.closePath(); c.fill();
  }

  const button = (label: string, action: () => void, key: string) => {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.dataset[key] = '';
    element.addEventListener('click', event => { event.stopPropagation(); action(); }); return element;
  };
  const paragraph = (text: string, className: string) => { const p = document.createElement('p'); p.className = className; p.textContent = text; return p; };
  function showCard(...children: HTMLElement[]): void { card.replaceChildren(...children); card.hidden = false; }
  /**
   * Two messages at the same moment (a record and a kilometre, a leap and a challenge): the second waits for the first to be read,
   * `FLASH_READ` ms (at most two waiting; the countdown's big numbers never wait). An `urgent` one (a record) shows at once,
   * and the message it cut short comes back after it.
   */
  let flashFree = 0, flashWaiting = 0;
  function flash(text: string, big = false, urgent = false): void {
    const now = performance.now(), wait = flashFree - now;
    if (urgent && wait > 0 && !big && pop.textContent && flashWaiting < 2) {
      const cut = pop.textContent; flashWaiting++; setTimeout(() => { flashWaiting--; if (running) show(cut, false); }, FLASH_READ);
      flashFree = now + 2 * FLASH_READ; show(text, false); return;
    }
    if (!big && !urgent && wait > 0) {
      if (flashWaiting >= 2) return;
      flashWaiting++; flashFree += FLASH_READ; setTimeout(() => { flashWaiting--; if (running || !card.hidden) show(text, false); }, wait); return;
    }
    flashFree = now + FLASH_READ; show(text, big);
  }
  function show(text: string, big: boolean): void { pop.textContent = text; pop.classList.toggle('benny-run-count', big); pop.classList.remove('show'); void pop.offsetWidth; pop.classList.add('show'); clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('show'), 900); }
  /**
   * The canvas resolution, at most 2 pixels per point: on a device that cannot keep up (more than half the frames of the last
   * 60 slower than 50 per second), it steps down by a quarter (by half when most were slower than 30 per second), to 1.25 at
   * the least: a little softer, but smooth.
   */
  let ratioCap = 2, sampled = 0, slowSampled = 0, verySlow = 0, lastFrameAt = 0;
  function watchFrames(now: number): void {
    const gap = now - lastFrameAt; lastFrameAt = now;
    if (gap <= 0 || gap > 200) return; // A pause or a hidden tab: not a measure.
    sampled++; if (gap > 20) slowSampled++; if (gap > 33) verySlow++;
    if (sampled < 60) return;
    if (slowSampled > sampled / 2 && ratioCap > 1.25 && (window.devicePixelRatio || 1) > 1.25) { ratioCap = Math.max(1.25, ratioCap - (verySlow > sampled / 2 ? .5 : .25)); measure(); }
    sampled = 0; slowSampled = 0; verySlow = 0;
  }
  function measure(): void {
    const ratio = Math.min(ratioCap, window.devicePixelRatio || 1), box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  /** The record when this run started, whether it is beaten yet, and the last 500 m reached. */
  /** How many times each kind of obstacle has been got past this run. */
  const cleared = new Map<string, number>();
  let runBest = 0, beaten = false, milestone = 0, metresBest = 0, metresBeaten = false;
  /** The hints already given on this device. */
  const hinted = (() => { try { return new Set<string>(JSON.parse(localStorage.getItem(HINTS_KEY) ?? '[]')); } catch { return new Set<string>(); } })();
  function hints(g: BennyRun): void {
    if (g.tutorial) return;
    const near = (z: number) => z - g.distance > 0 && z - g.distance < 38;
    const kinds: HintKind[] = [];
    for (const e of g.entities) if (near(e.z)) kinds.push(...(e.rock ? ['rock'] : e.geyser ? ['geyser'] : e.cart ? ['cart'] : e.snow ? ['snow'] : e.kind === 'fireball' ? ['fire'] : e.kind === 'spring' ? ['spring'] : e.gold ? ['gold'] : []) as HintKind[]);
    if (g.pits.some(p => near(p.from))) kinds.push('pit');
    if (g.platforms.some(p => near(p.from - BENNY_RUN.rampLen))) kinds.push('platform');
    const kind = kinds.find(k => !hinted.has(k)); if (!kind) return;
    hinted.add(kind); flash(HINTS[kind]);
    try { localStorage.setItem(HINTS_KEY, JSON.stringify([...hinted])); } catch { /* Only for this session. */ }
  }
  function hud(): void {
    const g = game; if (!g) return;
    hints(g);
    const multiplier = g.at <= g.comboUntil ? comboMultiplier(g.combo) : 1;
    score.textContent = `${g.score}`;
    // Beating the record during the run: said at once, with confetti, and the score turns gold.
    if (!beaten && runBest > 0 && g.score > runBest && !g.tutorial) {
      beaten = true; score.classList.add('benny-run-beaten'); flash('Nouveau record !', false, true); sound('power');
      burst(width / 2, height * .3, ['#ff6b6b', '#ffb84d', '#ffe66b', '#7be08a', '#6bb8ff', '#b07bff'], 40, 420);
    }
    // The challenge under way and how far along it is.
    const ch = g.challenge; challengeLine.textContent = ch ? `Défi · ${CHALLENGE_TEXT[ch.kind](ch.goal)} · ${ch.count}/${ch.goal}` : '';
    // Every 500 m.
    const reached = Math.floor(g.distance / 500) * 500;
    if (metresBest > 0 && !metresBeaten && g.distance > metresBest) { metresBeaten = true; flash('Plus loin que jamais !', false, true); sound('power', 1.2); }
    if (reached > milestone && !g.tutorial && reached % 1000) { milestone = reached; flash(`${reached} m !`); sound('coin', 1.5); }
    // Hidden while the tutorial's advice is up (they would overlap).
    combo.textContent = coach.hidden && g.combo > 1 && g.at <= g.comboUntil ? `${g.combo} coups${multiplier > 1 ? ` · ×${multiplier}` : ''}${g.combo >= BENNY_RUN.seriesMin ? ` · +${g.combo * BENNY_RUN.seriesPoints} en jeu` : ''}` : '';
    // The series bonus waiting at the end of the combo (banked if no bump).
    combo.classList.toggle('benny-run-series', g.combo >= BENNY_RUN.seriesMin);
    // The time left to keep the combo going.
    comboBar.hidden = !combo.textContent; if (combo.textContent) comboFill.style.width = `${Math.max(0, Math.min(1, (g.comboUntil - g.at) / BENNY_RUN.comboMs)) * 100}%`;
    metres.textContent = `${Math.floor(g.distance)} m`; coins.textContent = `${g.coins}`; coins.setAttribute('aria-label', plural(g.coins, 'pièce'));
    const active = g.active && g.at < g.active.until ? g.active : null;
    powerLine.textContent = active ? `${POWER_NAMES[active.power]} · ${Math.ceil((active.until - g.at) / 1000)} s` : '';
    // Its last second: the line blinks (and Benny's aura too), so its end is no surprise.
    powerLine.classList.toggle('benny-run-ending', !!active && active.until - g.at < POWER_ENDING);
    // After a bump: how long the Dragon stays on Benny's tail (a second bump meanwhile ends the run).
    const left = g.lastBumpAt === null || g.tutorial ? 0 : BENNY_RUN.dragonMs - (g.at - g.lastBumpAt);
    danger.hidden = left <= 0 || g.over;
    if (left > 0) danger.textContent = `La Dragon te talonne ! Encore ${Math.ceil(left / 1000)} s sans choc`;
  }

  // Perspective: a point `x` metres across, `ahead` metres in front of Benny and `up` metres high.
  // Upright screen: the three lanes and the walls fill the width, and the camera rises so that Benny runs low on the screen.
  const scale0 = () => Math.min(width * .86, height * .62) / (viewLanes * LANE_WIDTH + 2.6);
  const cameraHeight = () => Math.min(24, Math.max(2.2, (height * .74 - height * HORIZON) / scale0()));
  const project = (x: number, ahead: number, up: number) => {
    const horizon = height * HORIZON, s = scale0() * CAMERA_BACK / (Math.max(-CAMERA_BACK + .5, ahead) + CAMERA_BACK);
    return {x: width / 2 + (x - camX) * s, y: horizon + (cameraHeight() + camUp - up) * s, s};
  };
  /** The camera follows Benny a little: towards a wall she runs on (and up with her), up with her onto a platform. */
  let camX = 0, camUp = 0;
  const laneX = (lane: number) => (lane - (lanes - 1) / 2) * LANE_WIDTH;
  function quad(c: CanvasRenderingContext2D, points: {x: number; y: number}[], fill: string): void {
    c.beginPath(); c.moveTo(points[0].x, points[0].y); for (const p of points.slice(1)) c.lineTo(p.x, p.y); c.closePath(); c.fillStyle = fill; c.fill();
  }
  /** When the setting last changed under Benny's feet (the sky fades over), and what it was before. */
  let settingSince = -1e9, settingBefore: RunSetting = 'grotte', shownSetting: RunSetting = 'grotte';
  /** The scenery beside the road, every few metres beyond the walls: gold heaps and crystals in the cave, lava bubbles and chain
   * posts on the bridge, pines and snowy rocks on the mountain path. Shapes for now, until the painted settings. */
  function scenery(c: CanvasRenderingContext2D, g: BennyRun): void {
    const first = Math.floor((g.distance + NEAR) / 7), last = Math.floor((g.distance + FAR) / 7);
    for (let k = last; k >= first; k--) for (const dir of [-1, 1]) {
      const z = k * 7 + ((k * 37 + (dir > 0 ? 3 : 0)) % 5), ahead = z - g.distance; if (ahead < NEAR || ahead > FAR) continue;
      const kind = (k * 13 + (dir > 0 ? 7 : 0)) % 3, x = dir * (wallXAt(g, ahead) + 1.6 + ((k * 29) % 7) * .45), p = project(x, ahead, 0), s = p.s;
      switch (settingAt(g, z)) {
        case 'grotte':
          if (kind === 0) { c.fillStyle = '#f4c430'; c.beginPath(); c.moveTo(p.x - s * 1.1, p.y); c.lineTo(p.x, p.y - s * .9); c.lineTo(p.x + s * 1.1, p.y); c.fill(); c.fillStyle = '#ffe58a'; c.beginPath(); c.arc(p.x - s * .2, p.y - s * .45, s * .14, 0, Math.PI * 2); c.fill(); }
          else if (kind === 1) { c.fillStyle = '#7fd6e8'; c.beginPath(); c.moveTo(p.x, p.y - s * 1.8); c.lineTo(p.x + s * .35, p.y - s * .6); c.lineTo(p.x, p.y); c.lineTo(p.x - s * .35, p.y - s * .6); c.fill(); }
          else { c.fillStyle = '#7a5a36'; c.beginPath(); c.ellipse(p.x, p.y - s * .3, s * .7, s * .35, 0, 0, Math.PI * 2); c.fill(); }
          break;
        case 'pont':
          if (kind === 2) { c.fillStyle = '#4a3a30'; c.fillRect(p.x - s * .12, p.y - s * 2.2, s * .24, s * 2.2); c.strokeStyle = '#8a7a6a'; c.lineWidth = Math.max(1, s * .06); c.beginPath(); c.moveTo(p.x, p.y - s * 2); c.lineTo(p.x - dir * s * 1.5, p.y - s * 1.2); c.stroke(); }
          else { const r = s * (.25 + .15 * Math.abs(Math.sin(g.at / 300 + k))); c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(p.x, p.y - r * .5, r, 0, Math.PI * 2); c.fill(); }
          break;
        case 'montagne':
          if (kind === 2) { c.fillStyle = '#e9eef4'; c.beginPath(); c.ellipse(p.x, p.y - s * .35, s * .8, s * .45, 0, 0, Math.PI * 2); c.fill(); }
          else if (p.x + s > 0 && p.x - s < width) { c.fillStyle = '#3f7a4a'; c.beginPath(); for (const [w, y] of [[1, .6], [.8, 1.2], [.55, 1.75]]) { c.moveTo(p.x - s * w, p.y - s * (y - .6)); c.lineTo(p.x, p.y - s * (y + .7)); c.lineTo(p.x + s * w, p.y - s * (y - .6)); } c.fill(); c.fillStyle = '#6b4a2a'; c.fillRect(p.x - s * .1, p.y - s * .2, s * .2, s * .25); }
          break;
      }
    }
  }
  /** Above the horizon: the cave's ceiling with its stalactites and a gold glow far off; the lava's red glow with rocks and
   * rising sparks; the mountain sky with two rows of snowy peaks and drifting clouds (shapes until the painted settings). */
  /** The still parts of the settings' skies, painted once into images (per setting, screen size and horizon). */
  const layers = new Map<string, HTMLCanvasElement | null>();
  function skyLayer(key: string, h: number, paint: (k: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
    const id = `${key}|${width}|${Math.round(h)}`; if (layers.has(id)) return layers.get(id)!;
    const ratio = Math.min(2, window.devicePixelRatio || 1), el = document.createElement('canvas'); el.width = Math.max(1, Math.ceil(width * ratio)); el.height = Math.max(1, Math.ceil((h + 1) * ratio));
    const k = el.getContext('2d'); if (k) { k.scale(ratio, ratio); paint(k); }
    if (layers.size > 16) layers.clear(); layers.set(id, k ? el : null); return k ? el : null;
  }
  /** Above the horizon: the cave's ceiling with its stalactites and a gold glow far off; the lava's red glow with rocks and
   * rising sparks; the mountain sky with two rows of snowy peaks and drifting clouds (shapes until the painted settings). */
  function backdrop(c: CanvasRenderingContext2D, setting: RunSetting): void {
    const horizon = project(0, FAR, 0).y, now = clock(), alpha = c.globalAlpha;
    const sky = (k: CanvasRenderingContext2D, top: string, bottom: string) => { const grad = k.createLinearGradient(0, 0, 0, horizon); grad.addColorStop(0, top); grad.addColorStop(1, bottom); k.fillStyle = grad; k.fillRect(0, 0, width, horizon + 1); };
    const glow = (k: CanvasRenderingContext2D, colour: string, r: number) => { const grad = k.createRadialGradient(width / 2, horizon, 0, width / 2, horizon, r); grad.addColorStop(0, colour); grad.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = grad; k.fillRect(0, 0, width, horizon + 1); };
    const ridge = (k: CanvasRenderingContext2D, colour: string, base: number, peaks: number, rise: number, seed: number, snow?: string) => {
      const points: [number, number][] = [];
      for (let i = 0; i <= peaks * 2; i++) points.push([(i + (i % 2 ? (((i * seed) % 7) - 3) * .12 : 0)) / (peaks * 2) * width, base - (i % 2 ? rise * (.55 + ((i * seed) % 9) / 18) : rise * ((i * seed) % 5) / 14)]);
      k.fillStyle = colour; k.beginPath(); k.moveTo(0, horizon + 1); for (const [x, y] of points) k.lineTo(x, y); k.lineTo(width, horizon + 1); k.fill();
      if (snow) { k.fillStyle = snow; for (let i = 1; i < points.length; i += 2) { const [x, y] = points[i], [lx, ly] = points[i - 1], [rx, ry] = points[i + 1];
        const q = .3; k.beginPath(); k.moveTo(x, y); k.lineTo(x + (rx - x) * q, y + (ry - y) * q); k.lineTo(x, y + (ry - y) * q * .7); k.lineTo(x + (lx - x) * q, y + (ly - y) * q); k.fill(); } }
    };
    // A still layer drawn from its image (only from `from` of the way down, where it has something), or straight onto the screen.
    const still = (key: string, paint: (k: CanvasRenderingContext2D) => void, from = 0) => { const el = skyLayer(setting + key, horizon, paint); if (!el) { paint(c); return; }
      const top = Math.floor(horizon * from), k = el.height / (horizon + 1); c.drawImage(el, 0, top * k, el.width, el.height - top * k, 0, top, width, horizon + 1 - top); };
    switch (setting) {
      case 'grotte':
        still('', k => {
          sky(k, '#1a110a', '#5e4122'); glow(k, 'rgba(255,214,120,.45)', width * .45);
          k.fillStyle = '#2b1d11';
          for (let i = 0; i < 16; i++) { const x = (i + .5) / 16 * width + (((i * 37) % 11) - 5) * 2, w = width / 34 * (1 + ((i * 17) % 3) * .35), len = horizon * (.22 + ((i * 53) % 7) / 16);
            k.beginPath(); k.moveTo(x - w, 0); k.lineTo(x + w, 0); k.lineTo(x, len); k.fill(); }
        });
        break;
      case 'pont':
        still('', k => { sky(k, '#230b08', '#b5381a'); glow(k, 'rgba(255,150,60,.5)', width * .55); ridge(k, '#3a1712', horizon, 7, horizon * .28, 13); });
        for (let i = 0; i < 18; i++) { const x = ((i * 97) % 100) / 100 * width, y = horizon - ((now / 18 + i * 61) % (horizon * 1.1)), r = 1.5 + (i % 3);
          c.globalAlpha = alpha * Math.max(0, Math.min(1, y / horizon)); c.fillStyle = i % 2 ? '#ffb04a' : '#ffd27a'; c.beginPath(); c.arc(x + Math.sin(now / 400 + i) * 6, y, r, 0, Math.PI * 2); c.fill(); }
        c.globalAlpha = alpha;
        break;
      case 'montagne':
        still('-sky', k => sky(k, '#79b4e4', '#f6c9a2'));
        for (let i = 0; i < 4; i++) { const x = ((now / 90 + i * width * .37) % (width * 1.4)) - width * .2, y = horizon * (.18 + i * .13);
          c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(x, y, width * .09, horizon * .06, 0, 0, Math.PI * 2); c.ellipse(x + width * .06, y - horizon * .03, width * .06, horizon * .05, 0, 0, Math.PI * 2); c.fill(); }
        still('-peaks', k => { ridge(k, '#9fb0cc', horizon - horizon * .05, 4, horizon * .55, 5, '#f4f8fc'); ridge(k, '#7d93b2', horizon, 6, horizon * .3, 11, '#e6eef6'); }, .35);
        break;
    }
  }
  function road(c: CanvasRenderingContext2D, g: BennyRun, colours: typeof SETTING_COLOURS[RunSetting]): void {
    // The sky fades from the last setting's over 800 ms.
    const fade = Math.min(1, (clock() - settingSince) / 800);
    if (fade < 1) { backdrop(c, settingBefore); c.globalAlpha = fade; }
    backdrop(c, g.setting); c.globalAlpha = 1;
    const horizon = project(0, FAR, 0).y, edge = lanes / 2 * LANE_WIDTH;
    // The next setting, from its start onwards: drawn beyond a line across the whole ground.
    const border = g.upcoming ? Math.max(NEAR, Math.min(FAR, g.upcoming.z - g.distance)) : FAR, next = g.upcoming ? SETTING_COLOURS[g.upcoming.setting] : colours;
    c.fillStyle = colours.side; c.fillRect(0, horizon, width, height - horizon);
    if (border < FAR) { const b = project(0, border, 0).y; c.fillStyle = next.side; c.fillRect(0, horizon, width, Math.max(0, b - horizon)); }
    scenery(c, g);
    strip(c, g, NEAR, border, colours.ground);
    if (border < FAR) strip(c, g, border, FAR, next.ground);
    // Lane stripes that scroll with the distance, so the speed reads.
    for (let k = 0; k < 40; k++) {
      const z0 = NEAR + k * 4 - (g.distance % 4), z1 = z0 + 2;
      if (z0 > FAR) break;
      // The stripes of the lanes there (none where the road is opening or closing).
      const n0 = lanesDrawn(g, z0), n1 = lanesDrawn(g, z1); if (n0 !== n1 || n0 % 1) continue;
      for (const x of Array.from({length: n0 - 1}, (_, i) => (i + 1 - n0 / 2) * LANE_WIDTH)) quad(c, [project(x - .06, z0, 0), project(x + .06, z0, 0), project(x + .06, z1, 0), project(x - .06, z1, 0)], z0 < border ? colours.lane : next.lane);
    }
    // Gaps in the road: a chasm (lava on the bridge), with a bright lip on its near and far edges.
    for (const h of g.holes) {
      const from = Math.max(NEAR, h.from - g.distance), to = Math.min(FAR, h.to - g.distance); if (to <= from) continue;
      const look = SETTING_COLOURS[settingAt(g, h.from)];
      strip(c, g, from, to, look.hole);
      if (settingAt(g, h.from) === 'pont') for (let k = 0; k < 3; k++) { const z = from + ((g.at / 400 + k / 3) % 1) * (to - from), a = project(-edge * .6, z, 0), b = project(edge * .6, z, 0); c.strokeStyle = 'rgba(255,230,140,.5)'; c.lineWidth = Math.max(1, a.s * .08); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      for (const z of [from, to]) if (z > NEAR && z < FAR) strip(c, g, z - .25, z + .25, look.holeEdge);
    }
    // Cracked slabs in a lane (thin dark cracks), then the pit once they gave way (with a lip like a gap's).
    for (const p of g.pits) {
      const from = Math.max(NEAR, p.from - g.distance), to = Math.min(FAR, p.to - g.distance); if (to <= from) continue;
      const n = lanesAt(g, p.from), x = (p.lane - (n - 1) / 2) * LANE_WIDTH, x0 = x - LANE_WIDTH * .48, x1 = x + LANE_WIDTH * .48, look = SETTING_COLOURS[settingAt(g, p.from)];
      if (p.open) { quad(c, [project(x0, from, 0), project(x1, from, 0), project(x1, to, 0), project(x0, to, 0)], look.hole);
        for (const z of [from, to]) if (z > NEAR) quad(c, [project(x0, z - .2, 0), project(x1, z - .2, 0), project(x1, z + .2, 0), project(x0, z + .2, 0)], look.holeEdge); }
      else {
        quad(c, [project(x0, from, 0), project(x1, from, 0), project(x1, to, 0), project(x0, to, 0)], 'rgba(40,24,12,.25)');
        c.strokeStyle = 'rgba(30,18,10,.8)'; const a = project(x, from, 0); c.lineWidth = Math.max(1, a.s * .06); c.beginPath();
        for (let k = 0; k < 4; k++) { const z0 = from + (to - from) * k / 4, z1 = from + (to - from) * (k + 1) / 4, p0 = project(x + (k % 2 ? .5 : -.5), z0, 0), p1 = project(x + (k % 2 ? -.4 : .4), z1, 0); if (!k) c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); }
        c.stroke();
      }
    }
    // The walls, in their segments: runnable ones are lit and striped, the others dark.
    for (const w of g.walls) for (const [lo, hi, look] of [[NEAR, border, colours], [border, FAR, next]] as const) {
      const from = Math.max(lo, w.from - g.distance), to = Math.min(hi, w.to - g.distance); if (to <= from) continue;
      const dir = w.side === 'left' ? -1 : 1, zs = cuts(g, from, to);
      c.fillStyle = w.runnable ? look.wall : look.wallOff; c.beginPath();
      zs.forEach((z, i) => { const p = project(dir * wallXAt(g, z), z, 0); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
      for (const z of [...zs].reverse()) { const p = project(dir * wallXAt(g, z), z, WALL_HEIGHT); c.lineTo(p.x, p.y); }
      c.closePath(); c.fill();
      if (w.runnable) for (let z = Math.ceil(from / 6) * 6; z < to; z += 6) {
        const x = dir * wallXAt(g, z), a = project(x, z, .3), b = project(x, z, WALL_HEIGHT - .3);
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(1, a.s * .05); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
    }
  }
  /** The raised platforms: stone sides, a lighter top with a path, the ramp up to it (shapes until the painted settings). */
  function platforms(c: CanvasRenderingContext2D, g: BennyRun): void {
    const top = BENNY_RUN.platformHeight, ramp = BENNY_RUN.rampLen;
    for (const p of [...g.platforms].sort((a, b) => b.from - a.from)) {
      const start = Math.max(NEAR, p.from - ramp - g.distance), from = Math.max(NEAR, p.from - g.distance), to = Math.min(FAR, p.to - g.distance); if (to <= start) continue;
      const n = lanesAt(g, p.from), x = (p.lane - (n - 1) / 2) * LANE_WIDTH, x0 = x - LANE_WIDTH * .47, x1 = x + LANE_WIDTH * .47;
      const look = SETTING_COLOURS[settingAt(g, p.from)], height = (z: number) => z < p.from - g.distance ? top * Math.max(0, (z - (p.from - ramp - g.distance)) / ramp) : top;
      // Its shadow on the road beside it, the two sides (the one facing the middle shows), then the ramp and the top.
      for (const [sx, dx] of [[x0, -.5], [x1, .5]] as const) quad(c, [project(sx, from, 0), project(sx + dx, from, 0), project(sx + dx, to, 0), project(sx, to, 0)], 'rgba(0,0,0,.22)');
      for (const sx of [x0, x1]) { c.fillStyle = look.wallOff; c.beginPath(); c.moveTo(project(sx, start, 0).x, project(sx, start, 0).y);
        for (const z of [from, to]) { const q = project(sx, z, height(z)); c.lineTo(q.x, q.y); } const e = project(sx, to, 0); c.lineTo(e.x, e.y); c.closePath(); c.fill(); }
      quad(c, [project(x0, start, height(start)), project(x1, start, height(start)), project(x1, from, top), project(x0, from, top)], look.wall);
      if (to > from) { quad(c, [project(x0, from, top), project(x1, from, top), project(x1, to, top), project(x0, to, top)], look.wall);
        quad(c, [project(x0, from, top), project(x1, from, top), project(x1, to, top), project(x0, to, top)], 'rgba(255,255,255,.22)'); }
      // Dark edges along the top and the ramp, so its height reads from behind.
      c.strokeStyle = 'rgba(40,24,12,.75)';
      for (const sx of [x0, x1]) { const a = project(sx, start, height(start)), b = project(sx, from, top), e = project(sx, to, top); c.lineWidth = Math.max(1.5, b.s * .09); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.stroke(); }
      if (to > from) { const a = project(x, from, top), b = project(x, to, top); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = Math.max(1, a.s * .1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    }
  }
  /** The wind as a gust comes and blows: white streaks across the path, the way it blows. */
  function wind(c: CanvasRenderingContext2D, g: BennyRun, now: number): void {
    const w = g.gusts.find(o => o.warned) ?? (gustAt !== null && now - gustAt.at < 700 ? {dir: gustAt.dir, z: g.distance} : null); if (!w) return;
    const strength = gustAt && now - gustAt.at < 700 ? 1 - (now - gustAt.at) / 700 : .5 + .5 * Math.max(0, 1 - (w.z - g.distance) / BENNY_RUN.gustWarn);
    c.strokeStyle = `rgba(255,255,255,${.45 * strength})`; c.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const p = ((now / 600 + k * .37) % 1), y = height * (.3 + ((k * 53) % 50) / 100), len = width * (.12 + .1 * strength), x = w.dir > 0 ? -len + p * (width + len * 2) : width + len - p * (width + len * 2);
      c.lineWidth = 2 + 2 * strength; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - w.dir * len * .5, y - 6, x - w.dir * len, y); c.stroke();
    }
  }
  /** A banner across the road at the longest run so far: two poles and a ribbon « Ton record · N m ». */
  function recordBanner(c: CanvasRenderingContext2D, g: BennyRun): void {
    const ahead = metresBest - g.distance; if (metresBest <= 0 || ahead < NEAR || ahead > FAR) return;
    const half = wallXAt(g, ahead) - .2, top = 3.4, l = project(-half, ahead, 0), r = project(half, ahead, 0), lt = project(-half, ahead, top), rt = project(half, ahead, top), band = project(0, ahead, top - .7);
    c.fillStyle = '#5c3e24'; for (const [a, b] of [[l, lt], [r, rt]]) c.fillRect(a.x - Math.max(1, a.s * .06), b.y, Math.max(2, a.s * .12), a.y - b.y);
    c.fillStyle = '#d94a3a'; c.fillRect(lt.x, lt.y, rt.x - lt.x, band.y - lt.y);
    c.fillStyle = '#fff'; c.font = `800 ${Math.round(Math.max(8, (band.y - lt.y) * .62))}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(`Ton record · ${metresBest} m`, (lt.x + rt.x) / 2, (lt.y + band.y) / 2); c.textBaseline = 'alphabetic';
  }
  /** The last gust that blew (for the streaks to fade). */
  let gustAt: {at: number; dir: -1 | 1} | null = null;
  /** When each geyser burst out (it rises over a moment). */
  const geysersUp = new Map<number, number>();
  /** When each rock hit the road (its fall is drawn over a moment). */
  const rocksDown = new Map<number, number>();
  const SHAPES: Record<string, {colour: string; w: number; h: number; up?: number; round?: boolean; label?: string}> = {
    coin: {colour: '#f4c430', w: .45, h: .45, up: .5, round: true}, power: {colour: '#b07bff', w: 1.25, h: 1.25, up: .5, round: true}, wallCoin: {colour: '#f4c430', w: .45, h: .45, up: 1.6, round: true},
    pot: {colour: '#c96b3a', w: .9, h: .9, round: true}, barrier: {colour: '#7a5a3a', w: 2, h: .6, label: 'saute'},
    spring: {colour: '#4fb06a', w: 1.4, h: .3, label: 'tremplin'},
    beam: {colour: '#7a5a3a', w: 2, h: .45, up: 1.1, label: 'roulade'}, pillar: {colour: '#8a8a8a', w: 1.6, h: 3},
    dragonnet: {colour: '#8e3a5a', w: 1.1, h: .8, round: true}, chest: {colour: '#6e3b2e', w: 1.3, h: .9},
    ember: {colour: '#ff9a2a', w: .9, h: .9, up: .4, round: true},
    flyer: {colour: '#7b4fc9', w: .8, h: .7, round: true},
    fireball: {colour: '#ff6a1a', w: 1.3, h: 1.3, up: .1, round: true, label: 'saute'},
  };
  function thing(c: CanvasRenderingContext2D, g: BennyRun, e: RunEntity): void {
    const shape = SHAPES[e.kind], ahead = e.z - g.distance; if (!shape || ahead > FAR || ahead < -3) return;
    // A creature changing lanes (an ember hopping, a dragonnet crossing) slides over rather than jumps.
    let shown = shownLanes.get(e.id) ?? e.lane; shown += (e.lane - shown) * Math.min(1, frameDt * 12); if (Math.abs(e.lane - shown) < .01) shown = e.lane; shownLanes.set(e.id, shown);
    const n = lanesAt(g, e.z); let x = e.lane < 0 ? -wallXAt(g, ahead) + .4 : e.lane > n - 1 ? wallXAt(g, ahead) - .4 : (shown - (n - 1) / 2) * LANE_WIDTH;
    // The little flying monster keeps to Benny's height, a little above her head.
    let up = e.kind === 'flyer' ? bennyHeight(g) + .9 + Math.sin(g.at / 180 + e.id) * .08 : e.up ?? shape.up ?? 0;
    // The magnet: the coins of the other lanes fly over to Benny in her last metres before them.
    if (e.kind === 'coin' && e.lane !== g.lane && powerActive(g, 'magnet') && ahead < MAGNET_PULL) {
      const pull = (1 - Math.max(0, ahead) / MAGNET_PULL) ** 2; x += (laneX(viewLane) - x) * pull; up += .5 * Math.sin(Math.PI * pull);
    }
    // A rock up under the ceiling (its shadow on the road grows as it shakes loose), then falling fast.
    if (e.rock) {
      const fell = rocksDown.get(e.id), drop = e.rock === 'up' ? 1 : fell === undefined ? 0 : Math.max(0, 1 - (clock() - fell) / 160);
      if (drop > 0) { const g0 = project(x, ahead, 0), r = BENNY_RUN.rockLand / Math.max(BENNY_RUN.rockLand, ahead); c.fillStyle = `rgba(0,0,0,${.12 + .25 * r})`; c.beginPath(); c.ellipse(g0.x, g0.y, g0.s * .9 * r, g0.s * .25 * r, 0, 0, Math.PI * 2); c.fill(); }
      up = 7 * drop * drop + (e.rock === 'up' ? Math.sin(g.at / 40 + e.id) * .05 : 0);
    }
    const base = project(x, ahead, up), w = shape.w * base.s, h = shape.h * base.s;
    if (!figure(c, e, base.x, base.y, w, h, g.at)) {
      c.fillStyle = shape.colour;
      if (shape.round) { c.beginPath(); c.ellipse(base.x, base.y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); }
      else c.fillRect(base.x - w / 2, base.y - h, w, h);
    }
    if (e.kind === 'power' && e.power && base.s > 14) { c.fillStyle = '#fff'; c.font = `800 ${Math.round(Math.max(10, base.s * .3))}px system-ui`; c.textAlign = 'center'; c.fillText(POWER_NAMES[e.power], base.x, base.y - h - 4); }
    // A creature that will strike Benny unless she strikes it first (beside her or straight ahead, 1.4 s away at most): a red « ! ».
    if (threatening(g, e)) { const r = Math.max(9, base.s * .32) * (1 + .12 * Math.sin(g.at / 90)), y = base.y - h - r * 1.6;
      c.fillStyle = '#d93a3a'; c.beginPath(); c.arc(base.x, y, r, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = `900 ${Math.round(r * 1.5)}px system-ui`; c.textAlign = 'center'; c.fillText('!', base.x, y + r * .52); return; }
    // In a tunnel of logs, only the first one says « roulade ».
    const inTunnel = e.kind === 'beam' && g.entities.some(o => o.kind === 'beam' && o.lane === e.lane && o.z < e.z && e.z - o.z <= BENNY_RUN.burrowKeep);
    // The word fades away once she has got past that obstacle a few times this run (it comes back after a bump on it).
    const label = e.cart ? 'écarte-toi' : shape.label, passed = cleared.get(e.cart ? 'cart' : e.kind) ?? 0;
    if (label && base.s > 18 && !inTunnel && passed < LABEL_UNTIL) { c.fillStyle = '#fff'; c.font = `700 ${Math.round(Math.max(10, base.s * .28))}px system-ui`; c.textAlign = 'center'; c.fillText(label, base.x, base.y - h - 4); }
  }
  /** Shapes that say what each thing is, standing on (`x`, `y`), `w` × `h` px; false for those still drawn as a plain block. */
  function figure(c: CanvasRenderingContext2D, e: RunEntity, x: number, y: number, w: number, h: number, at: number): boolean {
    const ellipse = (cx: number, cy: number, rx: number, ry: number, colour: string) => { c.fillStyle = colour; c.beginPath(); c.ellipse(cx, cy, Math.max(.5, rx), Math.max(.5, ry), 0, 0, Math.PI * 2); c.fill(); };
    const eyes = (cx: number, cy: number, gap: number, r: number, closed = false) => {
      for (const dir of [-1, 1]) if (closed) { c.strokeStyle = '#2a1a12'; c.lineWidth = Math.max(1, r * .5); c.beginPath(); c.arc(cx + dir * gap, cy - r * .3, r, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
      else { ellipse(cx + dir * gap, cy, r, r * 1.15, '#fff'); ellipse(cx + dir * gap, cy + r * .15, r * .5, r * .6, '#2a1a12'); }
    };
    switch (e.kind) {
      case 'pot': {
        // A clay jar.
        c.save(); c.translate(x, y - h * .5);
        // A golden one shines: a halo, a gold body, a glint.
        if (e.gold) { c.globalAlpha = .35 + .2 * Math.sin(at / 120 + e.id); ellipse(0, 0, w * .8, h * .7, '#fff3a0'); c.globalAlpha = 1; }
        ellipse(0, h * .06, w * .5, h * .42, e.gold ? '#e8b923' : '#c96b3a'); c.fillStyle = e.gold ? '#c9961a' : '#a8542a'; c.fillRect(-w * .22, -h * .5, w * .44, h * .2);
        ellipse(0, -h * .5, w * .28, h * .07, '#7a3a1c'); c.fillStyle = '#f4c430'; c.fillRect(-w * .45, h * .02, w * .9, h * .08);
        ellipse(-w * .2, -h * .08, w * .08, h * .14, 'rgba(255,255,255,.35)');
        // A turning four-point sparkle above a golden one.
        if (e.gold) { const r = w * (.28 + .06 * Math.sin(at / 90 + e.id)); c.translate(w * .3, -h * .75); c.rotate(at / 400); c.fillStyle = '#fff'; c.beginPath();
          for (let i = 0; i < 8; i++) { const k = i % 2 ? r * .25 : r; c.lineTo(Math.cos(i * Math.PI / 4) * k, Math.sin(i * Math.PI / 4) * k); } c.fill(); }
        c.restore(); return true;
      }
      case 'chest': {
        // The greedy chest: its lid chomps, teeth and eyes in the gap.
        const open = (.15 + .25 * Math.abs(Math.sin(at / 160 + e.id))) * h, lid = h * .38;
        c.fillStyle = '#6e3b2e'; c.fillRect(x - w / 2, y - h * .55, w, h * .55);
        c.fillStyle = '#2a120c'; c.fillRect(x - w * .46, y - h * .55 - open, w * .92, open);
        c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const tx = x - w * .4 + i * w * .2; c.beginPath(); c.moveTo(tx - w * .07, y - h * .55); c.lineTo(tx + w * .07, y - h * .55); c.lineTo(tx, y - h * .55 - open * .5); c.fill(); }
        eyes(x, y - h * .55 - open * .55, w * .18, Math.max(1.5, open * .22));
        c.fillStyle = '#8a4a36'; c.beginPath(); c.moveTo(x - w / 2, y - h * .55 - open); c.lineTo(x + w / 2, y - h * .55 - open); c.lineTo(x + w * .44, y - h * .55 - open - lid); c.lineTo(x - w * .44, y - h * .55 - open - lid); c.fill();
        c.fillStyle = '#f4c430'; c.fillRect(x - w * .06, y - h * .55 - open - lid * .7, w * .12, lid * .5); c.fillRect(x - w / 2, y - h * .3, w, h * .07); return true;
      }
      case 'dragonnet': {
        // A little dragon asleep, curled up, with a Z floating up.
        for (const dir of [-1, 1]) { c.fillStyle = '#c47a9a'; c.beginPath(); c.moveTo(x + dir * w * .1, y - h * .7); c.lineTo(x + dir * w * .5, y - h * 1.05); c.lineTo(x + dir * w * .35, y - h * .55); c.fill(); }
        ellipse(x, y - h * .4, w * .5, h * .4, '#8e3a5a'); ellipse(x, y - h * .62, w * .26, h * .24, '#a3476a');
        // Awake and waddling across: eyes open, and an arrow the way it goes.
        if (e.cross) {
          eyes(x, y - h * .62, w * .1, Math.max(1, w * .06));
          const ax = x + e.cross * w * .75, ay = y - h * .5, r = Math.max(4, w * .2); c.fillStyle = '#ffe36b';
          c.beginPath(); c.moveTo(ax + e.cross * r, ay); c.lineTo(ax - e.cross * r * .4, ay - r * .8); c.lineTo(ax - e.cross * r * .4, ay + r * .8); c.fill();
          return true;
        }
        eyes(x, y - h * .62, w * .1, Math.max(1, w * .05), true);
        const z = (at / 900 + e.id * .3) % 1; c.globalAlpha = 1 - z; c.fillStyle = '#fff'; c.font = `800 ${Math.round(Math.max(8, h * .4))}px system-ui`; c.textAlign = 'center'; c.fillText('z', x + w * .35, y - h * (1 + z * .6)); c.globalAlpha = 1;
        return true;
      }
      case 'ember': {
        // A living flame that flickers.
        const f = 1 + .08 * Math.sin(at / 70 + e.id);
        c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(x, y - h * 1.15 * f); c.quadraticCurveTo(x + w * .6, y - h * .5, x, y); c.quadraticCurveTo(x - w * .6, y - h * .5, x, y - h * 1.15 * f); c.fill();
        c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(x, y - h * .8 * f); c.quadraticCurveTo(x + w * .32, y - h * .3, x, y - h * .05); c.quadraticCurveTo(x - w * .32, y - h * .3, x, y - h * .8 * f); c.fill();
        eyes(x, y - h * .38, w * .12, Math.max(1, w * .07)); return true;
      }
      case 'flyer': {
        const flap = Math.abs(Math.sin(at / 90 + e.id)); c.fillStyle = '#b89af0';
        for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(x + dir * w * .3, y - h * .6); c.lineTo(x + dir * w * 1.1, y - h * (.6 + .7 * flap)); c.lineTo(x + dir * w * .9, y - h * .2); c.fill(); }
        ellipse(x, y - h / 2, w / 2, h / 2, '#7b4fc9'); eyes(x, y - h * .55, w * .17, Math.max(1, w * .1));
        c.fillStyle = '#fff'; for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(x + dir * w * .12, y - h * .25); c.lineTo(x + dir * w * .04, y - h * .25); c.lineTo(x + dir * w * .08, y - h * .1); c.fill(); }
        return true;
      }
      case 'barrier': if (e.rock) {
        // A boulder: grey-brown, a lighter side, a crack.
        ellipse(x, y - h * 1.05, w * .36, h * 1.1, '#6f6258'); ellipse(x - w * .1, y - h * 1.4, w * .18, h * .5, '#8d8075');
        c.strokeStyle = '#4a3f37'; c.lineWidth = Math.max(1, w * .03); c.beginPath(); c.moveTo(x + w * .08, y - h * 1.7); c.lineTo(x + w * .16, y - h * 1.1); c.lineTo(x + w * .06, y - h * .6); c.stroke(); return true;
      } else {
        // A wooden fence: two posts and two planks.
        c.fillStyle = '#5c3e24'; c.fillRect(x - w * .45, y - h, w * .08, h); c.fillRect(x + w * .37, y - h, w * .08, h);
        c.fillStyle = '#8a6440'; c.fillRect(x - w / 2, y - h * .9, w, h * .3); c.fillRect(x - w / 2, y - h * .45, w, h * .3); return true;
      }
      case 'beam': {
        // A log held up across the lane on two posts: roll under it.
        c.fillStyle = '#5c3e24'; c.fillRect(x - w * .48, y - h, w * .06, h * 3.4); c.fillRect(x + w * .42, y - h, w * .06, h * 3.4);
        c.fillStyle = '#8a6440'; c.fillRect(x - w / 2, y - h, w, h); ellipse(x + w / 2, y - h / 2, h * .25, h / 2, '#c49a6a');
        c.strokeStyle = '#6b4a2a'; c.lineWidth = Math.max(1, h * .08); c.beginPath(); c.moveTo(x - w * .3, y - h * .5); c.lineTo(x + w * .2, y - h * .5); c.stroke(); return true;
      }
      case 'pillar': if (e.geyser) {
        // A vent in the road (dark, glowing, bubbling), then a column of lava rising out of it.
        ellipse(x, y, w * .42, w * .12, '#2a0e06'); ellipse(x, y, w * .3, w * .08, '#ff6a1a');
        const rose = geysersUp.get(e.id), grow = e.geyser === 'idle' ? 0 : rose === undefined ? 1 : Math.min(1, (clock() - rose) / 220);
        if (!grow) { const b = (at / 160 + e.id) % 1; ellipse(x + w * .1, y - b * h * .2, w * .05, w * .05, '#ffb03a'); return true; }
        const top = y - h * grow * (1 + .04 * Math.sin(at / 60 + e.id)), half = w * .36;
        const lava = c.createLinearGradient(x - half, 0, x + half, 0); lava.addColorStop(0, '#c2300c'); lava.addColorStop(.5, '#ffb03a'); lava.addColorStop(1, '#c2300c');
        c.fillStyle = lava; c.beginPath(); c.moveTo(x - half, y); c.quadraticCurveTo(x - half * .7, (y + top) / 2, x - half * .9, top); c.lineTo(x + half * .9, top); c.quadraticCurveTo(x + half * .7, (y + top) / 2, x + half, y); c.fill();
        for (let k = 0; k < 3; k++) { const a = at / 120 + k * 2.1 + e.id; ellipse(x + Math.sin(a) * half * 1.2, top - Math.abs(Math.cos(a)) * h * .15, half * .35, half * .35, k ? '#ff6a1a' : '#ffe36b'); }
        return true;
      } else {
        c.fillStyle = '#8a8a8a'; c.fillRect(x - w * .4, y - h, w * .8, h);
        c.fillStyle = '#a4a4a4'; for (const k of [-.2, .1]) c.fillRect(x + k * w, y - h, w * .08, h);
        c.fillStyle = '#6e6e6e'; c.fillRect(x - w / 2, y - h, w, h * .08); c.fillRect(x - w / 2, y - h * .08, w, h * .08); return true;
      }
      case 'power': {
        // A glowing bubble that bobs, with the power's sign inside: a magnet, a rainbow, « ×2 », a pair of wings.
        const cy = y - h / 2 + Math.sin(at / 200 + e.id) * h * .08, r = w / 2;
        const glow = c.createRadialGradient(x, cy, r * .2, x, cy, r * 1.4); glow.addColorStop(0, 'rgba(255,255,255,.9)'); glow.addColorStop(.6, 'rgba(200,170,255,.55)'); glow.addColorStop(1, 'rgba(200,170,255,0)');
        c.fillStyle = glow; c.beginPath(); c.arc(x, cy, r * 1.4, 0, Math.PI * 2); c.fill();
        c.lineWidth = Math.max(1.5, r * .16);
        switch (e.power) {
          case 'magnet':
            c.strokeStyle = '#d93a3a'; c.beginPath(); c.arc(x, cy, r * .45, Math.PI, 0, true); c.stroke();
            c.fillStyle = '#e8e8e8'; c.fillRect(x - r * .45 - c.lineWidth / 2, cy - r * .5, c.lineWidth, r * .3); c.fillRect(x + r * .45 - c.lineWidth / 2, cy - r * .5, c.lineWidth, r * .3); break;
          case 'bubble':
            ['#ff6b6b', '#ffb84d', '#7be08a', '#6bb8ff', '#b07bff'].forEach((colour, i) => { c.strokeStyle = colour; c.lineWidth = Math.max(1, r * .08); c.beginPath(); c.arc(x, cy + r * .25, r * (.7 - i * .1), Math.PI, 0); c.stroke(); }); break;
          case 'double':
            c.fillStyle = '#f4c430'; c.beginPath(); c.arc(x, cy, r * .55, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#7a4a10'; c.font = `900 ${Math.round(Math.max(8, r * .6))}px system-ui`; c.textAlign = 'center'; c.fillText('×2', x, cy + r * .2); break;
          case 'dash':
            c.strokeStyle = '#ff8a2a'; c.lineWidth = Math.max(2, r * .16); for (const dx of [-.3, .1]) { c.beginPath(); c.moveTo(x + dx * r, cy - r * .4); c.lineTo(x + (dx + .3) * r, cy); c.lineTo(x + dx * r, cy + r * .4); c.stroke(); } break;
          case 'flight':
            c.fillStyle = '#fff'; for (const dir of [-1, 1]) { c.beginPath(); c.ellipse(x + dir * r * .3, cy, r * .35, r * .18, dir * -.5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x + dir * r * .35, cy + r * .2, r * .25, r * .12, dir * -.3, 0, Math.PI * 2); c.fill(); } break;
        }
        return true;
      }
      case 'fireball': {
        const turn = at / 60 + e.id;
        // On the mountain, a snowball rolling down, a spray of snow behind it.
        if (e.cart) {
          // A wooden mine cart heaped with gold, its wheels turning.
          c.fillStyle = '#3a2a1c'; for (const dx of [-.3, .3]) { c.beginPath(); c.arc(x + dx * w, y - h * .12, w * .12, 0, Math.PI * 2); c.fill(); }
          c.fillStyle = '#7a5634'; c.beginPath(); c.moveTo(x - w * .5, y - h * 1.1); c.lineTo(x + w * .5, y - h * 1.1); c.lineTo(x + w * .4, y - h * .2); c.lineTo(x - w * .4, y - h * .2); c.fill();
          c.fillStyle = '#5c3e24'; c.fillRect(x - w * .5, y - h * .75, w, h * .08);
          ellipse(x, y - h * 1.1, w * .42, h * .2, '#f4c430'); ellipse(x - w * .15, y - h * 1.18, w * .12, h * .08, '#fff6c8');
          return true;
        }
        if (e.snow) {
          for (let k = 3; k > 0; k--) ellipse(x + Math.sin(turn + k) * w * .1, y - h * (.45 + k * .16), w * (.3 - k * .06), h * (.22 - k * .04), 'rgba(255,255,255,.75)');
          ellipse(x, y - h / 2, w / 2, h / 2, '#f4f8fc'); ellipse(x - w * .14, y - h * .62, w * .16, h * .14, '#ffffff'); ellipse(x + Math.cos(turn) * w * .18, y - h / 2 + Math.sin(turn) * h * .18, w * .1, h * .1, '#c9d6e6');
          return true;
        }
        // A rolling ball of fire, flames trailing behind it (away from Benny).
        for (let k = 3; k > 0; k--) ellipse(x, y - h * (.5 + k * .18), w * (.32 - k * .06), h * (.3 - k * .05), k % 2 ? '#ffb03a' : '#ff6a1a');
        ellipse(x, y - h / 2, w / 2, h / 2, '#e8461a'); ellipse(x + Math.cos(turn) * w * .15, y - h / 2 + Math.sin(turn) * h * .15, w * .22, h * .22, '#ffd24a');
        return true;
      }
      case 'coin': case 'wallCoin': {
        // While coins count double: a white halo that pulses around each one.
        if (game && powerActive(game, 'double')) { const k = .5 + .5 * Math.sin(at / 110 + e.id); ellipse(x, y - h / 2, w * (.62 + .1 * k), h * (.62 + .1 * k), `rgba(255,255,255,${.35 + .3 * k})`); }
        ellipse(x, y - h / 2, w / 2, h / 2, '#f4c430'); ellipse(x, y - h / 2, w * .32, h * .32, '#e0a81e'); ellipse(x - w * .14, y - h * .66, w * .1, h * .1, '#fff6c8'); return true;
      }
      default: return false;
    }
  }
  let leapArc = 0;
  const FOES = new Set(['dragonnet', 'chest', 'ember', 'flyer']);
  function threatening(g: BennyRun, e: RunEntity): boolean {
    const ahead = e.z - g.distance, across = g.wall ? wallLane(g, g.wall.side) : g.lane;
    if (!FOES.has(e.kind) || ahead <= 0 || ahead > Math.max(reach(g), g.speed * 1.4) || powerActive(g, 'flight') || powerActive(g, 'dash')) return false;
    return g.wall ? e.kind === 'flyer' && Math.abs(e.lane - across) === 1 : Math.abs(e.lane - across) <= 1;
  }
  /** Benny's landings: when she last touched down (a squash and a puff of dust), and whether she was in the air last frame. */
  let landedAt = -1e9, wasUp = false;
  const bennyHeight = (g: BennyRun) => g.wall ? BENNY_RUN.wallRunHeight + Math.sin(leapArc * Math.PI) * 1.4 : runHeight(g);
  function benny(c: CanvasRenderingContext2D, g: BennyRun, now: number): void {
    const wall = g.wall, x = laneX(viewLane);
    const up = bennyHeight(g), p = project(x, 0, up), s = p.s * BENNY_SIZE;
    // Rolling, she curls up into a ball that turns.
    const flat = sliding(g), w = (flat ? .75 : .8) * s, h = (flat ? .75 : 1) * s;
    // Running: a stride every 1.6 m, so the faster she runs the quicker her paws go; she bobs, her ears flop, she leans into a lane change.
    const stride = g.distance / 1.6 * Math.PI * 2, grounded = !flat && !inAir(g) && !powerActive(g, 'flight');
    const bob = grounded ? Math.abs(Math.sin(stride)) * .07 * s : 0, lean = Math.max(-.3, Math.min(.3, (g.lane - viewLane) * .35));
    // Touching down: a squash for a moment and a puff of dust at her feet; taking off and rising: a stretch.
    const up2 = inAir(g) && !wall && !powerActive(g, 'flight');
    if (wasUp && !up2 && !wall && !flat) { landedAt = now; const ground = project(x, 0, floorHeight(g)); burst(ground.x, ground.y, ['rgba(230,215,190,.9)', 'rgba(200,180,150,.8)'], 7, 110); sound('land', .9 + Math.random() * .2); }
    wasUp = up2;
    const land = Math.max(0, 1 - (now - landedAt) / 150), rising = up2 && g.at - g.airFrom < 220 ? 1 - (g.at - g.airFrom) / 220 : 0;
    const squash = 1 - .2 * land + .1 * rising;
    c.save(); c.translate(p.x, p.y - h / 2 - bob + h / 2 * (1 - squash));
    if (flat) c.rotate((g.slideUntil - g.at) / 90);
    else if (wall) c.rotate(wall.side === 'left' ? -1.1 : 1.1);
    // Off a springboard: a whole somersault at the top of the bounce (not once a ground charge has started).
    else if (inAir(g) && g.airUntil === g.bounceUntil && !g.pound) { const k = (g.at - g.airFrom) / (g.airUntil - g.airFrom); c.rotate(lean + Math.PI * 2 * Math.min(1, Math.max(0, (k - .15) / .6))); }
    else c.rotate(lean);
    if (!flat) c.scale(1 / Math.sqrt(squash), squash);
    if (g.at < g.stumbleUntil && Math.floor(now / 80) % 2) c.globalAlpha = .45;
    if (!flat) {
      // Back paws, one up as the other pushes (tucked in the air).
      c.fillStyle = '#c4834a';
      for (const side of [-1, 1]) { const lift = grounded ? Math.max(0, Math.sin(stride + (side > 0 ? Math.PI : 0))) * .16 * s : .08 * s;
        c.beginPath(); c.ellipse(side * w * .26, h * .5 - lift, w * .14, h * .11, 0, 0, Math.PI * 2); c.fill(); }
      // The wand in her right paw: a rainbow star at its tip.
      const tip = {x: w * .62, y: -h * .2 + Math.sin(stride) * .05 * s};
      c.strokeStyle = '#8a5a2b'; c.lineWidth = Math.max(2, s * .06); c.beginPath(); c.moveTo(w * .36, h * .12); c.lineTo(tip.x, tip.y); c.stroke();
      c.fillStyle = `hsl(${(now / 6) % 360} 90% 65%)`; c.beginPath();
      for (let i = 0; i < 10; i++) { const r = (i % 2 ? .06 : .14) * s, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r); }
      c.fill();
    }
    c.fillStyle = '#d99a5b'; c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
    if (!flat) {
      // Long ears, swept back by the wind and flopping with each stride. In a jump they trail low on the way up and fly up and
      // out on the way down; with the Dragon at her heels they lie flat back, a little shorter.
      const jump = inAir(g) && !wall && !powerActive(g, 'flight') && g.airUntil > g.airFrom ? Math.min(1, (g.at - g.airFrom) / (g.airUntil - g.airFrom)) : -1;
      const fly = jump < 0 ? 0 : jump < .5 ? -.12 * (1 - jump * 2) : .5 * (jump - .5) * 2, scared = dragonVisible(g) && !wall;
      for (const side of [-1, 1]) { const flop = side * (.18 + fly + (scared ? .35 : 0)) + Math.sin(stride + side) * (grounded ? .12 : .04);
        c.save(); c.translate(side * w * .2, -h * .38); c.rotate(flop); if (scared) c.scale(1, .8);
        c.fillStyle = '#d99a5b'; c.beginPath(); c.ellipse(0, -.28 * s, w * .11, .3 * s, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f2b8a0'; c.beginPath(); c.ellipse(0, -.26 * s, w * .05, .22 * s, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    } else { c.fillStyle = '#7d6a5a'; c.fillRect(-w * .28, -h / 2 - .2 * s, w * .14, .25 * s); c.fillRect(w * .14, -h / 2 - .2 * s, w * .14, .25 * s); }
    c.fillStyle = '#fff8ee'; c.beginPath(); c.arc(0, h * .3, w * .14, 0, Math.PI * 2); c.fill();
    const fading = g.active !== null && g.active.until - g.at < POWER_ENDING && Math.floor(now / 90) % 2 === 1;
    // Charging: a fiery aura that flickers.
    if (powerActive(g, 'dash') && !fading) { c.strokeStyle = `rgba(255,${120 + Math.floor(Math.sin(now / 40) * 40)},40,.85)`; c.lineWidth = 5; c.beginPath(); c.ellipse(0, h * .1, w * .8, h * .7, 0, 0, Math.PI * 2); c.stroke(); }
    if (powerActive(g, 'bubble') && !fading) { c.strokeStyle = 'rgba(180,140,255,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, w * .85, 0, Math.PI * 2); c.stroke(); }
    c.restore();
    if (!inAir(g) && !wall && !powerActive(g, 'flight')) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(p.x, project(x, 0, floorHeight(g)).y, w * .55, s * .12, 0, 0, Math.PI * 2); c.fill(); }
    // The shock wave: a golden ring spreading on the road around her.
    if (shock !== null && now - shock < 450) {
      const k = Math.max(0, (now - shock) / 450), ground = project(x, 0, 0), r = (BENNY_RUN.shockReach * .9) * k;
      c.save(); c.globalAlpha = 1 - k; c.strokeStyle = '#ffd86b'; c.lineWidth = 6 * (1 - k) + 2;
      c.beginPath(); c.ellipse(ground.x, ground.y, r * ground.s, r * ground.s * .35, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
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
    const side = viewLane > (lanes - 1) / 2 ? -1 : 1, x = laneX(viewLane) + side * 1.2, ahead = -3 - (1 - out) * 3;
    const p = project(x, ahead, 2.2 + Math.sin(g.at / 260) * .15), size = .85 * p.s;
    c.save(); c.globalAlpha = out;
    c.fillStyle = '#b58ad1';
    for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(p.x + dir * size * .6, p.y); c.lineTo(p.x + dir * size * 1.6, p.y - size * .8 * Math.abs(Math.sin(g.at / 120))); c.lineTo(p.x + dir * size * .3, p.y - size * .3); c.fill(); }
    // Seen from behind: a tail swinging below, the body, a row of spines, the head with two horns (shapes until her painting).
    const swing = Math.sin(g.at / 180) * size * .35;
    c.strokeStyle = '#9c2f3c'; c.lineWidth = size * .16; c.lineCap = 'round';
    c.beginPath(); c.moveTo(p.x, p.y + size * .4); c.quadraticCurveTo(p.x + swing, p.y + size * .9, p.x - swing * .6, p.y + size * 1.2); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = '#9c2f3c'; c.beginPath(); c.ellipse(p.x, p.y, size * .7, size * .55, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f4c430';
    for (const k of [-.25, .05, .35]) { const y = p.y + k * size; c.beginPath(); c.moveTo(p.x - size * .09, y); c.lineTo(p.x, y - size * .18); c.lineTo(p.x + size * .09, y); c.fill(); }
    const head = p.y - size * .62;
    c.fillStyle = '#f2e3c4'; for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(p.x + dir * size * .18, head - size * .1); c.lineTo(p.x + dir * size * .42, head - size * .52); c.lineTo(p.x + dir * size * .3, head - size * .02); c.fill(); }
    c.fillStyle = '#b23a48'; c.beginPath(); c.ellipse(p.x, head, size * .38, size * .3, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function draw(now: number): void {
    const c = context, g = game; if (!c || !g) return;
    const dt = Math.min(.05, Math.max(0, (now - lastDrawAt) / 1000)); lastDrawAt = now;
    // The lanes under Benny now; the camera pulls back gently in a wide hall.
    frameDt = dt; if (shownLanes.size > 200) for (const id of shownLanes.keys()) if (!g.entities.some(e => e.id === id)) shownLanes.delete(id);
    lanes = g.lanes; viewLanes += (lanesDrawn(g, 8) - viewLanes) * Math.min(1, dt * 2.5);
    // Benny glides between lanes, and onto and off a wall (drawn just inside it), instead of jumping there.
    const onWall = (wallX() - .45 - laneX(lanes - 1)) / LANE_WIDTH, target = g.wall ? (g.wall.side === 'left' ? -onWall : lanes - 1 + onWall) : g.lane;
    viewLane += (target - viewLane) * Math.min(1, dt * 24);
    { const side = g.wall ? (g.wall.side === 'left' ? -1 : 1) : 0, toX = side ? side * wallX() * .35 : laneX(viewLane) * .12, toUp = g.wall ? bennyHeight(g) * .45 : floorHeight(g) * .4;
      camX += (toX - camX) * Math.min(1, dt * 5); camUp += (toUp - camUp) * Math.min(1, dt * 4); }
    // Crossing from one wall to the other: a bound through the air.
    leapArc = g.wall ? Math.min(1, Math.abs(target - viewLane) / (lanes - 1 + 2 * onWall)) : 0;
    c.save();
    if (shake) { const k = (now - shake.at) / shake.ms; if (k >= 1) shake = null; else { const a = shake.px * (1 - k); c.translate((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a); } }
    road(c, g, SETTING_COLOURS[g.setting]);
    speedLines(c, g, now);
    platforms(c, g);
    recordBanner(c, g);
    wind(c, g, now);
    const ahead = [...g.entities].sort((a, b) => b.z - a.z);
    for (const e of ahead) if (e.z - g.distance > 0) thing(c, g, e);
    // During the end scene, Benny and the Dragon are in the scene, not on the road.
    if (!ending) benny(c, g, now);
    for (const e of ahead) if (e.z - g.distance <= 0) thing(c, g, e);
    if (!ending) dragon(c, g);
    // Shards and sparkles.
    // Impact rings: a white circle that opens and fades where a strike lands.
    rings = rings.filter(r => now - r.at < 260);
    for (const r of rings) { const k = (now - r.at) / 260; c.strokeStyle = `rgba(255,255,255,${.9 * (1 - k)})`; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.arc(r.x, r.y, r.size * (.4 + k), 0, Math.PI * 2); c.stroke(); }
    bits = bits.filter(b => now - b.at < b.life);
    for (const b of bits) { const t = (now - b.at) / 1000; c.globalAlpha = 1 - (now - b.at) / b.life; c.fillStyle = b.colour;
      c.fillRect(b.x + b.vx * t - b.size / 2, b.y + b.vy * t + 900 * t * t - b.size / 2, b.size, b.size); }
    c.globalAlpha = 1;
    c.restore();
    // A bump: the screen's edges flush red for a moment.
    if (hurtAt !== null && now - hurtAt < 400) {
      const k = 1 - (now - hurtAt) / 400, grad = c.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .3, width / 2, height / 2, Math.max(width, height) * .7);
      grad.addColorStop(0, 'rgba(200,40,40,0)'); grad.addColorStop(1, `rgba(200,40,40,${.45 * k})`); c.fillStyle = grad; c.fillRect(0, 0, width, height);
    }
    flashes = flashes.filter(f => now - f.at < 700);
    for (const f of flashes) { c.globalAlpha = 1 - (now - f.at) / 700; c.fillStyle = '#fff'; c.font = '800 22px system-ui'; c.textAlign = 'center'; c.fillText(f.text, f.x, height * .55 - (now - f.at) * .05); }
    c.globalAlpha = 1;
  }
  /** The tutorial's advice, one per step (tutoiement). */
  const COACH: Record<TutorialStep, string> = {
    pot: 'Un pot à côté de toi : glisse vers lui pour le frapper avec ton bâton !',
    jump: 'Une barrière : glisse vers le haut pour sauter !',
    roll: 'Une poutre : glisse vers le bas pour passer dessous en roulade !',
    front: 'Un coffre glouton droit devant : fais une roulade dedans pour le frapper !',
    flyer: 'Un petit monstre volant : glisse vers lui pour le frapper !',
    wall: 'Des piliers partout : glisse vers le mur pour courir dessus !',
  };
  function showCoach(step: TutorialStep | null, again = false): void {
    if (!step) { coach.textContent = 'Bravo ! Maintenant, cours aussi loin que tu peux !'; coach.hidden = false; setTimeout(() => { if (game && !game.tutorial) coach.hidden = true; }, 2600); return; }
    coach.textContent = (again ? 'Encore une fois ! ' : '') + COACH[step]; coach.hidden = false;
  }
  /** Where a thing is drawn on screen now (for the shards). */
  const screenOf = (g: BennyRun, e: RunEntity) => { const n = lanesAt(g, e.z), ahead = e.z - g.distance, x = e.lane < 0 ? -wallXAt(g, ahead) + .4 : e.lane > n - 1 ? wallXAt(g, ahead) - .4 : (e.lane - (n - 1) / 2) * LANE_WIDTH;
    return project(x, Math.max(.3, e.z - g.distance), e.kind === 'flyer' ? bennyHeight(g) + .9 : .5); };
  function react(): void {
    const g = game; if (!g) return;
    for (const event of takeRunEvents(g)) switch (event.type) {
      case 'strike': {
        if (event.by === 'spin') { flash('Coup tournoyant !'); slowMo(260); }
        swing = {at: clock(), lane: g.lane};
        // Three things or more broken in one roll: it is said.
        if (event.roll && event.roll >= 3) flash(`Roulade en chaîne ×${event.roll} !`);
        const p = screenOf(g, event.entity);
        flashes.push({at: clock(), text: `+${event.points}`, x: p.x});
        // Each strike of a combo a semitone higher (up to an octave); a new multiplier is announced.
        const pitch = 2 ** (Math.min(12, event.combo - 1) / 12);
        if (event.entity.gold) { burst(p.x, p.y, ['#fff3a0', '#f4c430', '#ffffff'], 26, 380); flash(`Pot doré ! +${event.points}`); }
        if (event.entity.kind === 'pot') { burst(p.x, p.y, ['#c96b3a', '#e08a52', '#8a4a26', '#a8542a', '#f4c430'], 22, 320); burst(p.x, p.y, ['rgba(220,180,140,.8)'], 6, 90); sound('pot', pitch); }
        else { burst(p.x, p.y, ['#fff', '#e7d1ff', '#ffb3c8', '#ffe36b'], 12, 220); sound('strike', pitch); }
        if (event.multiplier > 1 && event.combo === (event.multiplier - 1) * BENNY_RUN.comboStep + 1) { flash(`Combo ×${event.multiplier} !`); sound('power'); }
        // A creature lands harder than a pot: a longer freeze, a bigger ring.
        rings.push({x: p.x, y: p.y - p.s * .4, at: clock(), size: p.s * (event.entity.kind === 'pot' ? .9 : 1.4)});
        shakeFor('strike'); hitStop(event.entity.kind === 'pot' ? HIT_STOP : HIT_STOP + 30); break;
      }
      case 'crash': { const p = screenOf(g, event.entity); burst(p.x, p.y, ['#c96b3a', '#8a4a26'], 8, 180); sound('pot'); break; }
      case 'coin': if (clock() - lastCoinSound > 60) { coinRun = clock() - lastCoinSound < 450 ? Math.min(12, coinRun + 1) : 0; lastCoinSound = clock(); sound('coin', 2 ** (coinRun / 24)); } break;
      case 'bump': cleared.set(event.entity.cart ? 'cart' : event.entity.kind, 0); if (event.entity.kind !== 'hole') flash('Aïe ! La Dragon arrive !'); hurtAt = clock(); shakeFor('bump'); sound('bump'); break;
      case 'shield': flash('La bulle te protège !'); burst(width / 2, height * .7, ['#e7d1ff', '#b07bff', '#fff'], 16, 260); sound('power'); break;
      case 'power': flash(`${POWER_NAMES[event.power]} !`); sound('power'); break;
      case 'wallStart': sound('wall', event.side === 'left' ? .94 : 1.06); break;
      case 'cleared': { const k = event.entity.cart ? 'cart' : event.entity.kind; cleared.set(k, (cleared.get(k) ?? 0) + 1); }
        if (event.points) { const p = screenOf(g, event.entity); flashes.push({at: clock(), text: `+${event.points}`, x: p.x}); burst(p.x, p.y - 10, ['#fff', '#ffe66b'], 6, 160); sound('dodge', .95 + Math.random() * .1); }
        break;
      case 'wallEnd': flashes.push({at: clock(), text: `Mur +${event.points}`, x: width / 2}); if (event.trail) { flash(`Traînée parfaite : ${event.trail} pièces !`); sound('power', 1.1); } break;
      case 'wallLeap': flashes.push({at: clock(), text: `Saut de mur +${event.points}`, x: width / 2}); sound('wall', 1 + .06 * Math.min(6, event.chain - 1));
        if (event.chain >= 2) flash(event.chain === 2 ? 'Double bond !' : event.chain === 3 ? 'Triple bond !' : `Bonds ×${event.chain} !`); shakeFor('strike'); break;
      case 'fall': flash(event.onto ? 'Ouf ! Benny se rattrape au mur !' : 'Ouf ! Benny ressort du trou !'); break;
      case 'shockwave': shock = clock(); slowMo(380); flash('Onde de choc !'); shakeFor('shock'); sound('shock'); break;
      case 'challenge':
        if (event.points === undefined) flash(`Défi : ${CHALLENGE_TEXT[event.kind](event.goal)}`);
        else { flash(`Défi réussi ! +${event.points}`); sound('power'); burst(width / 2, height * .3, ['#7be08a', '#ffe66b', '#fff'], 24, 360); }
        break;
      case 'gust':
        if (event.warn) { flash(event.dir > 0 ? 'Coup de vent → !' : '← Coup de vent !'); sound('whoosh'); }
        else { gustAt = {at: clock(), dir: event.dir}; if (event.pushed) { sound('whoosh', 1.3); shakeFor('strike'); } }
        break;
      case 'geyser': { geysersUp.set(event.entity.id, clock()); const p = screenOf(g, event.entity); burst(p.x, p.y, ['#ff6a1a', '#ffb03a', '#ffe36b'], 8, 220);
        if (Math.abs(event.entity.lane - g.lane) <= 1) sound('sizzle', .9 + Math.random() * .2); break; }
      case 'rockfall': { rocksDown.set(event.entity.id, clock()); { const p = screenOf(g, event.entity); burst(p.x, p.y, ['#6f6258', '#8d8075', '#4a3f37'], 6, 160); }
        if (event.entity.lane === g.lane || Math.abs(event.entity.lane - g.lane) === 1) { sound('rumble'); shakeFor('strike'); } break; }
      case 'crumble': { const n = lanesAt(g, event.pit.from), x = (event.pit.lane - (n - 1) / 2) * LANE_WIDTH, p = project(x, event.pit.from - g.distance + 1, 0);
        burst(p.x, p.y, ['#5a3d22', '#8a6440', '#3a2a1c'], 10, 200); if (event.pit.from - g.distance < 30) sound('rumble', 1.3); break; }
      case 'platformUp': sound('jump', 1.2); break;
      case 'blocked': sound('bump', .8); shakeFor('strike'); flash('Monte par la rampe !'); break;
      case 'lanes':
        viewLane += event.shift;
        if (event.shift > 0) flash('La salle s’élargit : cinq couloirs !');
        break;
      case 'close': flashes.push({at: clock(), text: `De justesse ! +${event.points}`, x: width / 2}); sound('dodge', 1.3); break;
      case 'km': milestone = event.km * 1000; flash(`${event.km} km ! +${event.points}`); sound('power', 1.15); break;
      case 'bounce': { sound('jump', 1.4); shakeFor('strike'); const ground = project(laneX(viewLane), .5, 0); burst(ground.x, ground.y, ['#7be08a', '#4fb06a', '#fff'], 10, 200);
        flashes.push({at: clock(), text: 'Boing !', x: width / 2}); break; }
      case 'series': flash(`Série de ${event.length} ! +${event.points}`); sound('power', 1.05); break;
      case 'landing': flash('Atterrissage en douceur !'); sound('land'); break;
      case 'faster': flash(event.pace === 1 ? 'Vitesse de croisière… et ça accélère encore !' : `Plus vite ! Allure ${event.pace}`); sound('power', 1.3); break;
      case 'setting': flash(SETTING_NAMES[event.setting]); settingBefore = shownSetting; shownSetting = event.setting; settingSince = clock(); break;
      case 'tutorial': showCoach(event.step, event.again); break;
      case 'caught': finish(); break;
      default: break;
    }
  }
  /** The first gaps of a run are announced as they come into sight. */
  let holesAnnounced = 0, lastHoleSeen = -1;
  function announceHoles(g: BennyRun): void {
    const next = g.holes.find(h => h.from > g.distance && h.from - g.distance < 45);
    if (!next || next.from === lastHoleSeen || holesAnnounced >= 2) return;
    lastHoleSeen = next.from; holesAnnounced++;
    flash(next.to - next.from > 10 ? 'Un grand gouffre : cours sur le mur et saute d’un mur à l’autre !' : 'Un trou : saute par-dessus !');
  }
  function loop(): void {
    if (!running || !game) return;
    const now = clock();
    if (now < slowUntil) slowLost += Math.min(50, Math.max(0, now - lastLoopAt)) * (1 - SLOW_RATE);
    lastLoopAt = now; watchFrames(now); advanceBennyRun(game, gameTime()); react(); announceHoles(game); hud(); drawAhead(now);
    if (running) frame(loop);
  }
  /**
   * The rules move in steps of 1/120 s, the screen at its own pace: a frame drawn at the last step would move the road by one,
   * two or three steps (a jolt of up to half the speed, every few frames, worse on a 120 Hz screen). So the picture is drawn
   * where the run is at this very moment: the time and the road carried on by what is left over (under a step), then put back.
   */
  function drawAhead(now: number): void {
    const g = game; if (!g) return;
    const lead = g.over ? 0 : Math.min(BENNY_RUN.step, Math.max(0, gameTime() - g.at)), at = g.at, distance = g.distance;
    g.at += lead; g.distance += g.speed * lead / 1000;
    try { draw(now); } finally { g.at = at; g.distance = distance; }
  }
  function input(gesture: RunInput): void {
    if (!running || !game || sideways()) return;
    const g = game, wasAir = inAir(g), wasRolling = sliding(g);
    runInput(g, gameTime(), gesture);
    if (gesture === 'up' && inAir(g) && g.airFrom === g.at && !wasAir) sound('jump', .96 + Math.random() * .08);
    if (gesture === 'down' && sliding(g) && !wasRolling) sound('roll');
    react(); hud();
  }
  /** Streaks along the screen's sides that thicken with the speed. */
  function speedLines(c: CanvasRenderingContext2D, g: BennyRun, now: number): void {
    const k = Math.max(0, (g.speed - BENNY_RUN.speedStart - 4) / (BENNY_RUN.speedMax - BENNY_RUN.speedStart - 4)); if (k <= 0) return;
    c.save(); c.strokeStyle = `rgba(255,250,235,${.12 + .2 * k})`; c.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const seed = (i * 97 + Math.floor(now / 70) * 31) % 100 / 100, left = i % 2 === 0, x = left ? seed * width * .18 : width - seed * width * .18;
      const y = height * (.25 + ((i * 0.137 + now / 600) % 1) * .75), len = 30 + 70 * k;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (left ? -1 : 1) * len * .25, y + len); c.stroke();
    }
    c.restore();
  }
  /**
   * The end: a short gentle scene before the card (owner: « une scène douce où Benny et le Dragon se chamaillent »). The Dragon
   * lands beside Benny, they tug at the treasure bag between them, puffs of smoke and little hearts, then a laugh. Shapes for now,
   * until the painted scene; a tap skips it.
   */
  const SQUABBLE_MS = 3400;
  const SQUABBLE_LINES: [number, 'dragon' | 'benny', string][] = [
    [300, 'dragon', 'Rends-moi mon trésor !'], [1300, 'benny', 'Juste une petite pièce…'], [2300, 'dragon', 'Bon… on refait la course ?'],
  ];
  let ending: {at: number; done: () => void} | null = null;
  function squabble(c: CanvasRenderingContext2D, now: number): void {
    const t = now - ending!.at, cx = width / 2, ground = height * .66, unit = Math.min(width, height) * .12;
    c.fillStyle = 'rgba(40,24,14,.55)'; c.fillRect(0, 0, width, height);
    c.fillStyle = 'rgba(255,240,210,.18)'; c.beginPath(); c.ellipse(cx, ground + unit * .3, unit * 3.4, unit * .7, 0, 0, Math.PI * 2); c.fill();
    // The Dragon lands from above in the first half-second.
    const land = Math.min(1, t / 500), tug = Math.sin(Math.max(0, t - 500) / 140) * unit * .18 * (t < 2400 ? 1 : Math.max(0, 1 - (t - 2400) / 400));
    const dx = cx + unit * 1.4, dy = ground - unit * .7 - (1 - land) * height * .5;
    c.fillStyle = '#b58ad1';
    for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(dx + dir * unit * .4, dy - unit * .2); c.lineTo(dx + dir * unit * 1.2, dy - unit * (.9 + .3 * Math.abs(Math.sin(t / 110)))); c.lineTo(dx + dir * unit * .2, dy + unit * .1); c.fill(); }
    c.fillStyle = '#9c2f3c'; c.beginPath(); c.ellipse(dx, dy, unit * .75, unit * .65, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(dx - unit * .25, dy - unit * .15, unit * .1, 0, Math.PI * 2); c.fill();
    // Benny, on the left, pulling the other way.
    const bx = cx - unit * 1.4 + tug * .5, by = ground - unit * .5;
    c.fillStyle = '#d99a5b'; c.beginPath(); c.ellipse(bx, by, unit * .55, unit * .6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7d6a5a'; c.fillRect(bx - unit * .3, by - unit * 1.05, unit * .14, unit * .5); c.fillRect(bx + unit * .12, by - unit * 1.05, unit * .14, unit * .5);
    // The treasure bag between them, tugged one way then the other.
    const sx = cx + tug, sy = ground - unit * .45;
    c.strokeStyle = '#6e4a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(bx + unit * .4, by); c.lineTo(sx, sy); c.lineTo(dx - unit * .6, dy + unit * .1); c.stroke();
    c.fillStyle = '#c79a4a'; c.beginPath(); c.ellipse(sx, sy, unit * .42, unit * .38, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f4c430'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(sx - unit * .2 + i * unit * .2, sy - unit * .38, unit * .09, 0, Math.PI * 2); c.fill(); }
    // Puffs of smoke while they tug, then little hearts.
    for (let i = 0; i < 6; i++) {
      const k = ((t / 700 + i / 6) % 1), a = i * 1.7;
      if (t > 500 && t < 2600) { c.globalAlpha = .5 * (1 - k); c.fillStyle = '#f2e6d8'; c.beginPath(); c.arc(sx + Math.cos(a) * unit * (.5 + k), sy - unit * .2 - k * unit, unit * (.15 + .2 * k), 0, Math.PI * 2); c.fill(); }
      if (t > 2400) { c.globalAlpha = Math.max(0, 1 - k); c.fillStyle = '#ff8fb1'; c.font = `${Math.round(unit * .4)}px system-ui`; c.textAlign = 'center'; c.fillText('♥', sx + (i - 2.5) * unit * .4, sy - unit * (.6 + k * 1.4)); }
    }
    c.globalAlpha = 1;
    // Speech bubbles.
    const said = SQUABBLE_LINES.filter(([at]) => t >= at).at(-1);
    if (said) {
      const [, who, text] = said, x = who === 'dragon' ? dx : bx, y = (who === 'dragon' ? dy : by) - unit * 1.5;
      c.font = `800 ${Math.round(Math.max(14, unit * .28))}px system-ui`; const w = Math.min(width - 24, c.measureText(text).width + 24), left = Math.max(12, Math.min(width - 12 - w, x - w / 2));
      c.fillStyle = '#fff8e8'; c.strokeStyle = '#6b5a3a'; c.lineWidth = 2; c.beginPath(); c.roundRect(left, y - unit * .45, w, unit * .7, 12); c.fill(); c.stroke();
      c.fillStyle = '#3b3326'; c.textAlign = 'center'; c.fillText(text, left + w / 2, y);
    }
    c.fillStyle = 'rgba(255,248,232,.8)'; c.font = '700 14px system-ui'; c.textAlign = 'center'; c.fillText('Touche l’écran pour passer', cx, height - 28);
  }
  function endLoop(): void {
    if (!ending || !game) return;
    const now = performance.now(); draw(clock()); const c = context; if (c) squabble(c, now);
    if (now - ending.at >= SQUABBLE_MS) { const done = ending.done; ending = null; done(); return; }
    frame(endLoop);
  }
  function finish(): void {
    if (!game) return;
    clearTimeout(stopTimer); time.resume(); sound('caught');
    running = false; danger.hidden = true; coach.hidden = true;
    ending = {at: performance.now(), done: showEnd}; frame(endLoop);
  }
  function showEnd(): void {
    if (!game) return;
    const s = runSummary(game), record = s.score > best && s.score > 0, previous = best; best = Math.max(best, s.score);
    const line = options.onFinished?.(s);
    hud(); draw(clock()); // The run as it stood, without the scene's words.
    const again = button('Rejouer', () => start(), 'bennyRunAgain');
    // The score big, then the run's figures two by two.
    const stats = document.createElement('ul'); stats.className = 'benny-run-stats';
    for (const line of [`${s.metres} m`, plural(s.coins, 'pièce'), plural(s.pots, 'pot') + (s.goldPots ? ` (${plural(s.goldPots, 'doré')})` : ''), plural(s.foes, 'créature'), plural(s.wallRuns, 'mur'), plural(s.leaps, 'bond'), plural(s.dodges, 'esquive'), plural(s.challenges, 'défi'),
      `combo max ${s.bestCombo}`, `${Math.floor(s.seconds / 60)} min ${String(s.seconds % 60).padStart(2, '0')} s`]) { const li = document.createElement('li'); li.textContent = line; stats.append(li); }
    // The points won in each setting crossed (the best one first).
    const parts = (Object.keys(s.bySetting) as RunSetting[]).filter(k => s.bySetting[k] > 0).sort((a, b) => s.bySetting[b] - s.bySetting[a]);
    const bySetting = parts.length > 1 ? [paragraph(parts.map(k => `${BENNY_RUN_SETTING_SHORT[k]} ${s.bySetting[k]}`).join(' · '), 'benny-run-rules')] : [];
    showCard(paragraph('La Dragon a rattrapé Benny !', 'benny-run-title'), paragraph(`${s.score} points`, 'benny-run-big'), stats, ...bySetting,
      ...(record ? [paragraph(previous ? `Nouveau record ! L’ancien était de ${previous}.` : 'Ton premier record !', 'benny-run-record')] : best ? [paragraph(`Ton record : ${best}`, 'benny-run-rules')] : []),
      ...(line ? [paragraph(line, 'benny-run-rules')] : []),
      again, button('Quitter', close, 'bennyRunQuit'));
    settleCard(card); again.focus();
  }
  function start(withTutorial = false): void {
    if (sideways()) { orientation(); return; }
    clearTimeout(stopTimer); time.resume();
    best = Math.max(best, options.best?.() ?? 0);
    // The first run (no record yet) starts with the tutorial; it can be asked for again from the start card.
    coach.hidden = true;
    slowLost = 0; slowUntil = 0; lastLoopAt = clock(); settingSince = -1e9; shownSetting = 'grotte';
    runBest = best; beaten = false; milestone = 0; metresBest = options.bestMetres?.() ?? 0; metresBeaten = false; score.classList.remove('benny-run-beaten');
    game = startBennyRun(gameTime(), undefined, 3, withTutorial || best === 0); lanes = game.lanes; viewLanes = lanes; viewLane = game.lane; camX = 0; camUp = 0; landedAt = -1e9; wasUp = false; swing = null; shock = null; cleared.clear(); flashes = []; bits = []; rings = []; coinRun = 0; shake = null; hurtAt = null; running = true; card.hidden = true; lastDrawAt = clock();
    holesAnnounced = 0; lastHoleSeen = -1;
    hud(); flash('Cours cours Benny !'); frame(loop);
  }
  function intro(): void {
    game = startBennyRun(clock()); lanes = game.lanes; viewLane = game.lane; running = false; measure(); hud(); draw(clock());
    const learn = button('Revoir le tutoriel', () => start(true), 'bennyRunTutorial'), record = Math.max(best, options.best?.() ?? 0);
    // Short: the tutorial teaches the gestures on the first run; the full rules wait behind « Comment jouer ? ».
    const rules = document.createElement('div'); rules.className = 'benny-run-how'; rules.hidden = true;
    const how = button('Comment jouer ?', () => { rules.hidden = !rules.hidden; how.textContent = rules.hidden ? 'Comment jouer ?' : 'Cacher les règles'; }, 'bennyRunHow');
    rules.append(
      paragraph('Glisse vers le haut pour sauter, sur le côté pour changer de couloir, vers le bas pour faire une roulade (en l’air : charge au sol).', 'benny-run-rules'),
      paragraph('Frappe les pots et les créatures avec ton bâton : de face avec une roulade, sur le côté en glissant vers leur couloir, vers le haut pour un petit monstre volant (il reste à ta hauteur). Une créature de chaque côté ? Ton bâton tournoie et frappe les deux. Une créature que tu dépasses sans la frapper t’attaque !', 'benny-run-rules'),
      paragraph('Au bord, glisse vers le mur (même en sautant) pour courir dessus. Pour descendre : saute depuis le mur, glisse vers l’autre côté pour frapper ce qui t’attend en bas, ou charge au sol pour faire une onde de choc. Passe sur un pouvoir pour l’utiliser tout de suite.', 'benny-run-rules'),
      paragraph('Au-dessus d’un grand gouffre, glisse vers l’autre mur pour bondir dessus.', 'benny-run-rules'),
      paragraph('Prototype en formes simples : les vrais dessins arrivent ensuite.', 'benny-run-rules'));
    showCard(paragraph('Cours cours Benny !', 'benny-run-title'),
      paragraph('Benny a chipé un peu du trésor de la Dragon : cours, frappe tout ce qui bouge, et ne te fais pas rattraper !', 'benny-run-rules'),
      ...(record > 0 ? [paragraph(`Ton record : ${record}`, 'benny-run-record')] : []),
      button('C’est parti !', () => start(), 'bennyRunStart'), ...(record > 0 ? [learn] : []), how, rules);
  }
  function close(): void {
    if (layer.hidden) return;
    ending = null;
    clearTimeout(stopTimer); clearTimeout(countdown); countdown = undefined;
    running = false; time.resume(); game = null; layer.hidden = true; clearTimeout(popTimer);
    window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: false})); options.onExit?.();
  }
  /** The 3, 2, 1 before the run goes on after a pause. */
  let countdown: ReturnType<typeof setTimeout> | undefined;
  function pause(): void {
    if (!running && !countdown) return;
    if (countdown) { clearTimeout(countdown); countdown = undefined; } else time.pause();
    running = false;
    const ch = game?.challenge;
    showCard(paragraph('Partie en pause', 'benny-run-title'), ...(ch ? [paragraph(`Défi : ${CHALLENGE_TEXT[ch.kind](ch.goal)} (${ch.count}/${ch.goal})`, 'benny-run-rules')] : []),
      button('Reprendre', resume, 'bennyRunResume'), button('Quitter', close, 'bennyRunQuit'));
  }
  function resume(): void {
    if (sideways() || running || countdown || !game) return;
    card.hidden = true; draw(clock());
    // Time to put a thumb back on the screen: 3, 2, 1, then the run goes on.
    let n = 3;
    const next = () => {
      if (n === 0) { countdown = undefined; time.resume(); running = true; lastDrawAt = clock(); lastLoopAt = clock(); frame(loop); return; }
      flash(String(n), true); sound('coin', n === 1 ? 1.5 : 1); n--; countdown = setTimeout(next, 500);
    };
    next();
  }

  // Gestures: a swipe fires as soon as the finger has moved far enough. Without lifting it, another swipe can follow from there
  // (left then up in one stroke); the same way again only after a much longer stroke, so one long swipe never counts twice.
  let touch: {x: number; y: number; id: number; last: RunInput | null; run: number} | null = null;
  const way = (dx: number, dy: number): RunInput => Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  canvas.addEventListener('pointerdown', event => {
    // A tap skips the end scene.
    if (ending) { event.preventDefault(); const done = ending.done; ending = null; done(); return; }
    event.preventDefault(); touch = {x: event.clientX, y: event.clientY, id: event.pointerId, last: null, run: 0}; }, {signal: abort.signal});
  canvas.addEventListener('pointermove', event => {
    if (!touch || touch.id !== event.pointerId) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y, far = Math.max(Math.abs(dx), Math.abs(dy)), dir = way(dx, dy);
    // Going on the same way: the start follows the finger (so a turn is seen from there), counting the way gone.
    if (dir === touch.last) { touch.run += far; touch.x = event.clientX; touch.y = event.clientY; if (touch.run < SWIPE * SAME_AGAIN) return; }
    else if (far < SWIPE) return;
    touch = {x: event.clientX, y: event.clientY, id: touch.id, last: dir, run: 0}; input(dir);
  }, {signal: abort.signal});
  canvas.addEventListener('pointerup', event => {
    // A short flick lifted before reaching the swipe distance still counts.
    if (touch && touch.id === event.pointerId && touch.last === null) {
      const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= FLICK) input(way(dx, dy));
    }
    touch = null;
  }, {signal: abort.signal});
  canvas.addEventListener('pointercancel', () => { touch = null; }, {signal: abort.signal});
  $<HTMLButtonElement>('[data-benny-run-exit]').addEventListener('click', () => close(), {signal: abort.signal});
  $<HTMLButtonElement>('[data-benny-run-pause]').addEventListener('click', () => pause(), {signal: abort.signal});
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, {signal: abort.signal});
  function orientation(): void {
    if (layer.hidden) return;
    const wrong = sideways(); turn.hidden = !wrong;
    if (wrong) pause();
  }
  window.addEventListener('resize', () => { if (!layer.hidden) { orientation(); measure(); if (game) draw(clock()); } }, {signal: abort.signal});
  window.addEventListener('orientationchange', () => setTimeout(() => { orientation(); measure(); if (game) draw(clock()); }, 200), {signal: abort.signal});
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
      intro(); orientation(); $<HTMLButtonElement>('[data-benny-run-start]').focus();
    },
    close, input,
    dispose() { close(); abort.abort(); layer.remove(); },
  };
}
