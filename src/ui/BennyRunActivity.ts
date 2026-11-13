import '../display/benny-run.css';
import {FULLSCREEN_ACTIVITY_EVENT} from '../config/bennyFlightGameArt';
import {advanceBennyRun, BENNY_RUN, wallAt, wallLook, floorHeight, ledgeHeight, platformAt, lanesAt, reach, settingAt, wallLane, dragonVisible, inAir, powerActive, runHeight, runInput, runSummary, sliding, startBennyRun, takeRunEvents,
  type BennyRun, type ChallengeKind, type RunEntity, type RunInput, type RunPower, type RunSetting, type RunSummary, type TutorialStep} from '../simulation/bennyRun';
import {pausableClock, settleCard} from './activityPause';
import RUN_ART from '../config/bennyRunArt.json';

/** The paintings' frames (scripts/prepare-benny-run-art.mjs): Benny's square stands her on its bottom, the Dragon's is centred on her body. */
type PaintedName = 'benny' | 'benny-moves' | 'benny-strike' | 'benny-roll' | 'dragon' | 'creatures' | 'chests' | 'objets';
const PAINTED: PaintedName[] = ['benny', 'benny-moves', 'benny-strike', 'benny-roll', 'dragon', 'creatures', 'chests', 'objets'];
/** Painted Benny's square, in Benny's sizes (her shape was one size tall): the drawing, ears up, fills about four fifths of it. */
const PAINTED_BENNY = 1.85;
/** How long each struck creature takes to melt away (ms); a chest stays broken open a little longer. */
/** How long Benny's passing poses last (ms), checked frame by frame in slow motion on 13 Nov.: the wind-up only just before the
 *  swing (the strike's points and rainbow sweep are already there), the swing as long as its sweep (220 ms), the push off onto a
 *  wall while she tips towards it. */
const POSE_MS = {windup: 40, strike: 200, push: 180};
/** The landing pose lasts half a stride (a stride every 1.6 m: 73 ms at the start, 33 at top speed), three frames at least, so her
 *  paws never stop while the road runs on. */
const landHold = (g: {speed: number}) => Math.max(50, .8 / Math.max(1, g.speed) * 1000);
/** The lane strike as a little hop (owner, 13 Nov.: « un mini saut avec un peu d'inertie pour vraiment mettre un coup de bâton
 *  au monstre »), each painted pose until (ms): the spring, the bound with the wand raised, the blow, the landing. The blow lands
 *  on the creature at `HOP_MS.bound`: its shards, its ring and the freeze wait until then, and it starts to vanish only then. */
const HOP_MS = {spring: 40, bound: 90, blow: 200, land: 320};
/** How high the hop goes (m), and how far past her lane she is carried by the blow before she settles (lanes). */
const HOP_HEIGHT = .55, HOP_CARRY = .1;
/** A whole forward roll (about, ms): four painted quarters, the wand held over her head going round with her. A roll is a whole
 *  number of turns (its turn stretched to fit), so that she always ends it getting up (the fourth quarter). */
const ROLL_TURN = 300;
/** Benny's glide between lanes: a spring a touch under-damped, so that she is carried a little past her lane and settles. */
const GLIDE = {pull: 900, damp: 48};
/** The wall run (owner, 13 Nov.: « améliore la course sur les murs »): the camera rolls towards the wall (rad), Benny's body tips
 *  over until her paws are on it (rad) and she runs there stride after stride, earth flying from her paws. The roll turns the
 *  ground about a point low on the screen, a little zoomed in so that its corners stay covered. */
const WALL_ROLL = .22, WALL_TILT = 1.05, WALL_ZOOM = 1.12;
const GHOST_MS: Partial<Record<string, number>> = {chest: 520, dragonnet: 420, ember: 380, flyer: 400};
/** A dragonnet wakes up this close to Benny (m). */
const DRAGONNET_WAKES = 7;
/** The Dragon's flight from behind: her two wing beats, each held this long. */
const WING_BEAT = 120;

/**
 * « Cours cours Benny ! » (src/simulation/bennyRun.ts holds the rules): a full-screen layer like « Le vol de Benny ». This is the
 * grey prototype the owner tunes the feel with (11 November 2026): plain shapes on a canvas, the road seen from behind Benny in
 * perspective, until the painted art he chose (Benny seen from behind, the « conte doré » settings, the rainbow-ribbon wand, the
 * dragonnets, greedy chests and embers) replaces them. Swipes: up jump, down slide (it strikes) or ground charge, sideways lane or wall;
 * a power works as soon as Benny runs over it. The arrow keys do the same. The island's Phaser loop sleeps while the run is open.
 * Played with the iPhone upright only (owner, 11 November 2026): turned sideways, the run pauses behind a « tourne ton iPhone » card.
 */
const HORIZON = .21, LANE_WIDTH = 2.2, CAMERA_BACK = 12, WALL_HEIGHT = 4.5, BENNY_SIZE = 1.6, FAR = 90, NEAR = -(CAMERA_BACK - .6);
// The new decor (concept C, owner's pick): meadow and wooden planks over a cloud sky. All three settings share it for now; their
// records stay as they are.
const SKY_COLOURS = {sky: '#f6c9a2', ground: '#8fc25a', lane: '#c69a5e', wall: '#b8895a', wallOff: '#6e7480', side: '#f5cdb0', hole: '#8a5ba8', holeEdge: '#ffd6a8'};
const SETTING_COLOURS: Record<RunSetting, typeof SKY_COLOURS> = {grotte: SKY_COLOURS, pont: SKY_COLOURS, montagne: SKY_COLOURS};
/** Until each setting has its own painting, a light wash over the painted world (not the characters) tells them apart: gold in the
 *  cave, lava red on the bridge, cool blue on the mountain path; it fades from one to the next with the sky. */
const SETTING_WASH: Record<RunSetting, [number, number, number, number]> = {grotte: [255, 196, 90, .14], pont: [255, 84, 40, .17], montagne: [120, 170, 255, .15]};
/** The painted textures of the track (13 Nov., concept C): planks, grass, the earth-and-grass wall to run on, the grey stone
 *  wall, and the isles' cliff at the edge of the void (scripts/prepare-benny-run-decor.mjs). */
const DECOR = ['decor-planches', 'decor-herbe', 'decor-mur-terre', 'decor-mur-pierre', 'decor-mur-racines', 'decor-falaise', 'decor-lianes', 'decor-touffes'] as const;
type DecorName = typeof DECOR[number];
/** How many metres one texture covers: planks across the road and along it, the grass both ways, a wall along it (its height is
 *  the wall's), the cliff across. The grass verge past the road's edge (m), the cliff's depth below it (m). */
/** Pixels per point of the painted ground's layer. */
const GROUND_RATIO = 1;
/** How far out the cliff's foot leans beyond the edge of the road (m). */
const VOID_LIP = .5;
/** Walls after Blade of Brim (owner, 13 Nov.): a tall one rises past the top of the screen, a low one stands at a jump's height
 * (her height running on it), a fence a little lower; a wall is one lane thick. */
const TALL_HEIGHT = 30, LOW_HEIGHT = 1.1, FENCE_HEIGHT = 1.15, WALL_THICK = LANE_WIDTH;
/** How big the painted wall tile is on a face (m): big enough that its stones and flowers read. */
const FACE_TILE = 7;
/** A tall wall is built of blocks (owner, 14 Nov., after the walls of lane runners): each 9 to 16 m long, `BLOCK_LOW` to `TALL_HEIGHT`
 * m high, a stone one set back by up to half a metre; vines hang from their tops (`VINE_TILE` m tile, `VINE_DROP` m of it), grass
 * and flowers grow at their feet (`TUFT_TILE` m tile, its painted bottom `TUFT_PART`, never above nine tenths of a low wall) near
 * Benny; far off, a warm haze. */
/** The wand's streak to a thing struck more than `STREAK_FROM` m ahead lasts `STREAK_MS`. */
const STREAK_FROM = 3, STREAK_MS = 180;
const BLOCK_LOW = 13, VINE_TILE = 6, VINE_DROP = 3, TUFT_TILE = 4.5, TUFT_PART = 3 / 8, TUFT_NEAR = 50, HAZE_FROM = 22, HAZE_SPAN = 70, HAZE_MAX = .55;
const hash01 = (n: number) => { let t = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0; t ^= t >>> 15; t = Math.imul(t, 2246822519) >>> 0; t ^= t >>> 13; return (t >>> 0) / 4294967296; };
const hazeAt = (z: number) => Math.min(1, Math.max(0, (z - HAZE_FROM) / HAZE_SPAN)) * HAZE_MAX;
const PLANK_ACROSS = 3.3, PLANK_ALONG = 3, GRASS_TILE = 3.3, CLIFF_TILE = 4, VERGE = .6, CLIFF_DEPTH = 4;
/** The colours of the painted decor where shapes still stand: the clouds of the void, the isles' rock and grass lip, the tops
 *  and sides of platforms and stairs. */
const PAINTED_LOOK = {cloudTop: '#f2c2c4', cloudBottom: '#fcc495', rock: '#9c6c55', rockDark: '#6d4a4f', lip: '#5f8f2f', top: '#e8955a', side: '#995f52', joint: 'rgba(90,40,14,.55)', lane: 'rgba(70,40,18,.28)'};

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
  pit: 'Le sol craque ! Saute la fosse ou change de couloir.', spring: 'Un tremplin ! Passe dessus pour bondir par-dessus les piliers.', gold: 'Un pot doré ! Frappe-le : il vaut cinq pots.', platform: 'Une plateforme : atterris dessus depuis le tremplin pour monter !',
  edge: 'Plus de mur : ne glisse pas dans le vide ! En sautant, tu peux passer au-dessus.',
} as const;
type HintKind = keyof typeof HINTS;
const HINTS_KEY = 'prairie-lapins:benny-run-hints';
const POWER_NAMES: Record<RunPower, string> = {magnet: 'Aimant', bubble: 'Bulle arc-en-ciel', double: 'Pièces doublées', flight: 'Envol', dash: 'Ruée'};
/** A swipe fires once the finger has moved this far; a quick flick lifted sooner still counts from `FLICK` px. */
const SWIPE = 18, FLICK = 10;
export type RunSound = 'strike' | 'pot' | 'coin' | 'bump' | 'jump' | 'roll' | 'shock' | 'wall' | 'power' | 'caught' | 'dodge' | 'rumble' | 'whoosh' | 'land' | 'sizzle';
/**
 * Feedback: striking a creature freezes the game for `HIT_STOP` ms, at most once every `HIT_STOP_GAP` ms (a pot never: a roll through
 * a row of them stays smooth); shakes last their `ms` with this many pixels at most.
 */
/** A big moment (shock wave, spin, a flying pot bowling a creature over) plays in slow motion at this rate for a moment. */
const SLOW_RATE = .35;
const HIT_STOP = 40, HIT_STOP_GAP = 400, SHAKES = {strike: {ms: 90, px: 3}, bump: {ms: 260, px: 9}, shock: {ms: 320, px: 11}} as const;
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
  layer.innerHTML = `<div class="benny-run-top"><p class="benny-run-score" aria-live="polite"></p><p class="benny-run-combo"></p><p class="benny-run-metres"></p><p class="benny-run-coins"></p><p class="benny-run-hearts" hidden></p>
<p class="benny-run-power"></p><button type="button" data-benny-run-pause aria-label="Pause">❚❚</button><button type="button" data-benny-run-exit aria-label="Quitter">✕</button><p class="benny-run-danger" hidden></p></div>
<div class="benny-run-quest" hidden><p class="benny-run-challenge"></p><div class="benny-run-quest-bar" aria-hidden="true"><span></span></div></div>
<canvas class="benny-run-canvas" data-benny-run-canvas></canvas>
<p class="benny-run-pop" aria-hidden="true"></p>
<p class="benny-run-coach" aria-live="polite" hidden></p>
<div class="benny-run-card" data-benny-run-card></div>
<div class="benny-run-turn" data-benny-run-turn hidden><div class="benny-run-phone" aria-hidden="true"></div><p>Tourne ton iPhone à la verticale pour jouer à Cours cours Benny !</p></div>`;
  host.append(layer);
  const $ = <T extends Element>(selector: string) => layer.querySelector<T>(selector)!;
  const canvas = $<HTMLCanvasElement>('[data-benny-run-canvas]'), card = $<HTMLElement>('[data-benny-run-card]'), pop = $<HTMLElement>('.benny-run-pop');
  const score = $<HTMLElement>('.benny-run-score'), combo = $<HTMLElement>('.benny-run-combo'), metres = $<HTMLElement>('.benny-run-metres'), coins = $<HTMLElement>('.benny-run-coins'), hearts = $<HTMLElement>('.benny-run-hearts');
  const challengeLine = $<HTMLElement>('.benny-run-challenge'), quest = $<HTMLElement>('.benny-run-quest'), questFill = $<HTMLElement>('.benny-run-quest-bar span');
  const coach = $<HTMLElement>('.benny-run-coach'), danger = $<HTMLElement>('.benny-run-danger');
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
  /** Effects waiting for the blow of a hop to land (see HOP_MS). */
  let pending: {at: number; run: () => void}[] = [];
  const later = (ms: number, run: () => void) => { if (ms <= 0) run(); else pending.push({at: clock() + ms, run}); };
  /** A short freeze on a strike, so that the hit lands (the game clock stops, the drawing goes on). */
  let lastStopAt = -1e9;
  function hitStop(ms = HIT_STOP): void {
    if (!running || performance.now() - lastStopAt < HIT_STOP_GAP) return;
    lastStopAt = performance.now();
    time.pause(); clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { if (running) time.resume(); }, ms);
  }
  /** The game's own time: the clock, less what the slow motions have held back. */
  let slowLost = 0, slowUntil = 0, lastLoopAt = 0;
  const gameTime = () => clock() - slowLost;
  // The paintings (owner's picks of 12 November 2026: Benny A seen from behind, the evolved Dragon A): drawn once loaded, the shapes
  // stand in until then (and in tests, where no picture loads).
  const art = Object.fromEntries(PAINTED.map(name => [name, {image: null, ready: false}])) as Record<PaintedName, {image: HTMLImageElement | null; ready: boolean}>;
  // The painted sky of the new decor (the floating isles at sunset), shown above the horizon in every setting.
  const skyPicture: {image: HTMLImageElement | null; ready: boolean} = {image: null, ready: false};
  // The textures, repeated into a strip of five by two (so a row of the road never wraps round), sharp near and softened far off.
  const decor = Object.fromEntries(DECOR.map(name => [name, {image: null, near: null, far: null}])) as Record<DecorName, {image: HTMLImageElement | null; near: CanvasImageSource | null; far: CanvasImageSource | null}>;
  const NEAR_SIDE = 256, FAR_SIDE = 32;
  function tiled(image: CanvasImageSource, side: number): HTMLCanvasElement | null {
    const el = document.createElement('canvas'); el.width = side * 5; el.height = side * 2; const k = el.getContext('2d'); if (!k) return null;
    k.imageSmoothingQuality = 'high';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) k.drawImage(image, i * side, j * side, side, side);
    return el;
  }
  function softened(image: HTMLImageElement): HTMLCanvasElement | null {
    const half = document.createElement('canvas'); half.width = half.height = 96; const k = half.getContext('2d'); if (!k) return null;
    k.imageSmoothingQuality = 'high'; k.drawImage(image, 0, 0, 96, 96); return tiled(half, FAR_SIDE);
  }
  /** Set on a device too slow for the painted track, even at its softest picture (see watchFrames). */
  let plainGround = false;
  const decorReady = () => !plainGround && DECOR.every(name => decor[name].near && decor[name].far);
  function loadArt(): void {
    if (!skyPicture.image) { const image = new Image(); image.decoding = 'async'; image.onload = () => { skyPicture.ready = true; }; image.src = `${import.meta.env.BASE_URL}assets/benny-run/fond-ciel.webp`; skyPicture.image = image; }
    for (const name of DECOR) {
      if (decor[name].image) continue;
      const image = new Image(); image.decoding = 'async'; image.onload = () => {
        // As bitmaps where the browser has them: drawn from many times a frame, they stay ready on the graphics card.
        const near = tiled(image, NEAR_SIDE), far = softened(image);
        if (typeof createImageBitmap !== 'function' || !near || !far) { decor[name].near = near; decor[name].far = far; return; }
        void Promise.all([createImageBitmap(near), createImageBitmap(far)]).then(([n, f]) => { decor[name].near = n; decor[name].far = f; }, () => { decor[name].near = near; decor[name].far = far; });
      };
      image.src = `${import.meta.env.BASE_URL}assets/benny-run/${name}.webp`; decor[name].image = image;
    }
    for (const name of PAINTED) {
      if (art[name].image) continue;
      const image = new Image(); image.decoding = 'async'; image.onload = () => { art[name].ready = true; };
      image.src = `${import.meta.env.BASE_URL}${RUN_ART[name].image}`; art[name].image = image;
    }
  }
  /** One frame of a painting, its anchor (Benny's feet, the Dragon's body) at (x, y), `side` wide, mirrored if asked. */
  function paint(c: CanvasRenderingContext2D, name: PaintedName, frame: string, x: number, y: number, side: number, mirror = false): void {
    const image = art[name].image, at = (RUN_ART[name].frames as Record<string, number[]>)[frame], size = RUN_ART[name].size; if (!image || !at) return;
    c.save(); c.translate(x, y); if (mirror) c.scale(-1, 1);
    c.drawImage(image, at[0], at[1], size, size, -side / 2, RUN_ART[name].anchor === 'feet' ? -side * .97 : -side / 2, side, side); c.restore();
  }
  /** One fitted drawing (a creature, an object) set on (x, bottom), `w` wide and `h` tall (its own proportions if `h` is left out);
   *  false while its painting has not loaded. */
  function fitted(c: CanvasRenderingContext2D, name: 'creatures' | 'chests' | 'objets', frame: string, x: number, bottom: number, w: number, h?: number): boolean {
    const image = art[name].image, at = (RUN_ART[name].frames as Record<string, number[]>)[frame], size = RUN_ART[name].size;
    if (!art[name].ready || !image || !at) return false;
    const sideX = w / at[2], sideY = h === undefined ? sideX : h / at[3];
    c.drawImage(image, at[0], at[1], size, size, x - sideX / 2, bottom - sideY * .98, sideX, sideY); return true;
  }
  const slowMo = (ms: number) => { const now = clock(); if (now > slowUntil + 900) slowUntil = now + ms; };
  const shakeFor = (kind: keyof typeof SHAKES) => { const s = SHAKES[kind]; if (!shake || shake.px <= s.px || clock() - shake.at > shake.ms) shake = {at: clock(), ...s}; };
  let rings: {x: number; y: number; at: number; size: number; ground?: boolean}[] = [];
  /** A strike that lands a few metres ahead: a rainbow streak from Benny's wand to what it strikes, so the blow reads as reaching it. */
  let streaks: {x0: number; y0: number; x1: number; y1: number; at: number}[] = [];
  /** Coins picked up close together climb in pitch (back down after a pause). */
  let coinRun = 0;
  /** Creatures struck: each melts away in its own way where it was (a chest breaks open, see GHOST_MS). */
  let ghosts: {e: RunEntity; at: number; ahead: number}[] = [];
  /** While a struck creature's last moment is drawn: how far through it is (0 to 1), null otherwise. */
  let vanishing: number | null = null;
  /** How far ahead of Benny the thing being drawn is (m). */
  let thingAhead = 99;
  let swing: {at: number; lane: number; hop: number; far?: boolean} | null = null, shock: number | null = null, flashes: {at: number; text: string; x: number; big?: boolean; row?: number}[] = [];
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
  /** A setting's colours, the tops and sides of stairs and platforms in wood and rock once the decor is painted. */
  const paintedLook = (setting: RunSetting) => decorReady() ? {...SETTING_COLOURS[setting], wall: PAINTED_LOOK.top, wallOff: PAINTED_LOOK.side} : SETTING_COLOURS[setting];
  const posmod = (a: number, m: number) => ((a % m) + m) % m;
  /** The painted ground, row by row of the screen (each row is one depth): the grass of the isle, the planks of the road over it;
   *  nothing over a gap (the clouds of the void show). */
  function paintedFloor(c: CanvasRenderingContext2D, g: BennyRun): void {
    const horizon = height * HORIZON, H = cameraHeight() + camUp, k = scale0() * CAMERA_BACK, BAND = 4;
    const aheadAt = (y: number) => k * H / Math.max(.01, y - horizon) - CAMERA_BACK;
    const row = (name: DecorName, x0: number, x1: number, a0: number, a1: number, across: number, along: number, y: number, s: number) => {
      const far = a0 > 30, t = decor[name], el = far ? t.far : t.near, side = far ? FAR_SIDE : NEAR_SIDE; if (!el) return;
      const sw = Math.min(side * 4, (x1 - x0) / across * side), sh = Math.max(.5, Math.min(side, (a0 - a1) / along * side));
      c.drawImage(el, posmod(x0, across) / across * side, posmod(-(g.distance + a0), along) / along * side, sw, sh, width / 2 + (x0 - camX) * s, y, (x1 - x0) * s, BAND + .5);
    };
    for (let y = Math.max(0, Math.floor(project(0, FAR, 0).y)); y < height; y += BAND) {
      const a0 = Math.min(FAR, aheadAt(y)), a1 = Math.max(NEAR, aheadAt(y + BAND)); if (a1 >= FAR || a0 <= NEAR) continue;
      const mid = (a0 + a1) / 2, z = g.distance + mid; if (g.holes.some(h => z >= h.from && z < h.to)) continue;
      const half = halfAt(g, mid), s = project(0, mid, 0).s;
      // The grass only on the verges (the planks cover the rest): half as much to paint.
      row('decor-herbe', -half - VERGE, -half + .05, a0, a1, GRASS_TILE, GRASS_TILE, y, s);
      row('decor-herbe', half - .05, half + VERGE, a0, a1, GRASS_TILE, GRASS_TILE, y, s);
      row('decor-planches', -half, half, a0, a1, PLANK_ACROSS, PLANK_ALONG, y, s);
    }
  }
  /** The cliff of an isle facing Benny, `ahead` m in front, from `x0` to `x1` m across, seen only inside the opening `hole` (a path). */
  function cliffFace(c: CanvasRenderingContext2D, ahead: number, x0: number, x1: number, hole: () => void): void {
    const t = decor['decor-falaise'], el = ahead > 30 ? t.far : t.near, side = ahead > 30 ? FAR_SIDE : NEAR_SIDE; if (!el || ahead >= FAR) return;
    c.save(); hole(); c.clip();
    const top = project(x0, ahead, 0), s = top.s;
    for (let x = Math.floor(x0 / CLIFF_TILE) * CLIFF_TILE; x < x1; x += CLIFF_TILE) {
      const a = Math.max(x, x0), b = Math.min(x + CLIFF_TILE, x1);
      c.drawImage(el, posmod(a, CLIFF_TILE) / CLIFF_TILE * side, 0, (b - a) / CLIFF_TILE * side, side, width / 2 + (a - camX) * s, top.y, (b - a) * s, CLIFF_DEPTH * s);
    }
    // Deeper down, the isle fades into the clouds.
    const grad = c.createLinearGradient(0, top.y + CLIFF_DEPTH * s * .5, 0, top.y + CLIFF_DEPTH * s);
    grad.addColorStop(0, 'rgba(252,196,149,0)'); grad.addColorStop(1, PAINTED_LOOK.cloudBottom);
    c.fillStyle = grad; c.fillRect(width / 2 + (x0 - camX) * s, top.y + CLIFF_DEPTH * s * .5, (x1 - x0) * s, CLIFF_DEPTH * s * .5 + 1);
    c.restore();
  }
  /** Where no tall wall stands, the isle's edge over the void: its grass lip, then its rock going down and away under it (past a low
   *  wall, from the wall's outer side; past a fence or nothing, from the verge). */
  function voidEdges(c: CanvasRenderingContext2D, g: BennyRun): void {
    for (const dir of [-1, 1]) {
      const side = dir < 0 ? 'left' : 'right', segs = g.walls.filter(w => w.side === side).map(w => ({a: w.from - g.distance, b: w.to - g.distance, look: w.void ? 'void' : wallLook(w)})).sort((x, y) => x.a - y.a);
      const open: {from: number; to: number; low: boolean}[] = []; let at = NEAR;
      for (const s of segs) { if (s.b <= at) continue; if (s.a > at) open.push({from: at, to: Math.min(s.a, FAR), low: false}); if (s.look !== 'tall') open.push({from: Math.max(at, s.a), to: Math.min(s.b, FAR), low: s.look === 'low'}); at = Math.max(at, s.b); if (at >= FAR) break; }
      if (at < FAR) open.push({from: at, to: FAR, low: false});
      for (const {from, to, low} of open) {
        if (to - from < .05) continue;
        const zs = cuts(g, from, to), edge = (z: number) => dir * (low ? wallXAt(g, z) + WALL_THICK : halfAt(g, z) + VERGE);
        c.beginPath(); zs.forEach((z, i) => { const p = project(edge(z), z, 0); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
        // The isle's cliff drops nearly straight down from the edge and fades into the clouds: past it, only the void (owner, 13 Nov.).
        for (const z of [...zs].reverse()) { const p = project(edge(z) + dir * VOID_LIP, z, -CLIFF_DEPTH); c.lineTo(p.x, p.y); }
        c.closePath(); const p0 = project(edge(from), Math.max(from, 0), 0), p1 = project(edge(from) + dir * VOID_LIP, Math.max(from, 0), -CLIFF_DEPTH);
        const grad = c.createLinearGradient(p0.x, p0.y, p1.x, p1.y); grad.addColorStop(0, PAINTED_LOOK.rock); grad.addColorStop(.55, PAINTED_LOOK.rockDark); grad.addColorStop(1, 'rgba(109,74,79,0)');
        c.fillStyle = grad; c.fill();
        // The grass lip: a thick line along the edge, so the end of the ground reads on a small screen.
        c.strokeStyle = PAINTED_LOOK.lip; c.lineJoin = 'round'; c.beginPath();
        zs.forEach((z, i) => { const p = project(edge(z), z, 0); c.lineWidth = Math.max(2, p.s * .14); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }); c.stroke();
      }
    }
  }
  /** One face of a wall along the road (x = `dir` × its inner side), from the ground up to `top` m: its colour, then the painted
   *  tile column by column, a tile high per tier (a low wall shows the top of one tile). */
  function wallFace(c: CanvasRenderingContext2D, g: BennyRun, dir: number, from: number, to: number, top: number, runnable: boolean, out = 0, vines = false): void {
    const x = (z: number) => dir * (wallXAt(g, z) + out), zs = cuts(g, from, to), t = decor[wallTexture(runnable, top)], vine = decor['decor-lianes'], tuft = decor['decor-touffes'];
    c.save(); c.beginPath();
    zs.forEach((z, i) => { const p = project(x(z), z, 0); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
    for (const z of [...zs].reverse()) { const p = project(x(z), z, top); c.lineTo(p.x, p.y); }
    c.closePath();
    // Higher up, the face darkens a little (the light comes from the road).
    const z0 = Math.max(from, 0), g0 = project(x(z0), z0, 0), g1 = project(x(z0), z0, top);
    const grad = c.createLinearGradient(0, g0.y, 0, g1.y); grad.addColorStop(0, runnable ? '#d97a3c' : '#b98488'); grad.addColorStop(1, runnable ? '#a85a2c' : '#8a6068');
    c.fillStyle = grad; c.fill(); c.clip();
    const tiers = Math.ceil(top / FACE_TILE - 1e-6);
    for (let z = to; z > from;) {
      const a = project(x(z), z, 0), probe = project(x(z - .1), z - .1, 0), perMetre = Math.abs(a.x - probe.x) / .1;
      const z1 = Math.max(from, z - Math.min(3, Math.max(.03, 6 / Math.max(.001, perMetre)))), b = project(x(z1), z1, 0);
      const far = z > 30, el = far ? t.far : t.near, side = far ? FAR_SIDE : NEAR_SIDE;
      if (el) for (let k = 0; k < tiers; k++) {
        const h0 = k * FACE_TILE, h1 = Math.min(top, h0 + FACE_TILE), ta = project(x(z), z, h1), tb = project(x(z1), z1, h1), ba = project(x(z), z, h0), bb = project(x(z1), z1, h0);
        const yTop = Math.min(ta.y, tb.y), yBot = Math.max(ba.y, bb.y); if (yBot < 0) break;
        c.drawImage(el, posmod(g.distance + z1, FACE_TILE) / FACE_TILE * side, 0, Math.max(.5, Math.min(side, (z - z1) / FACE_TILE * side)), side * (h1 - h0) / FACE_TILE, Math.min(a.x, b.x) - .5, yTop, Math.abs(a.x - b.x) + 1, yBot - yTop);
      }
      const left = Math.min(a.x, b.x) - .5, across = Math.abs(a.x - b.x) + 1;
      // Vines hanging from the top of a tall block.
      const vEl = far ? vine.far : vine.near;
      if (vines && vEl) { const ta = project(x(z), z, top), tb = project(x(z1), z1, top), va = project(x(z), z, top - VINE_DROP), y0 = Math.min(ta.y, tb.y), h = va.y - ta.y;
        if (y0 + h > 0) c.drawImage(vEl, posmod(g.distance + z1, VINE_TILE) / VINE_TILE * side, 0, Math.max(.5, Math.min(side, (z - z1) / VINE_TILE * side)), side * VINE_DROP / VINE_TILE, left, y0, across, h); }
      // Grass and flowers at its foot, near Benny.
      const tEl = far ? tuft.far : tuft.near;
      if (tEl && z < TUFT_NEAR) { const th = Math.min(top * .9, TUFT_TILE * TUFT_PART), part = th / TUFT_TILE, ty = project(x(z), z, th).y, by = Math.max(a.y, b.y);
        c.drawImage(tEl, posmod(g.distance + z1, TUFT_TILE) / TUFT_TILE * side, side * (1 - part), Math.max(.5, Math.min(side, (z - z1) / TUFT_TILE * side)), side * part, left, ty, across, by - ty); }
      // Far off, the warm haze of the evening.
      const haze = hazeAt(z); if (haze > .02) { const ty = Math.max(0, project(x(z), z, top).y); c.fillStyle = `rgba(250,198,166,${haze.toFixed(3)})`; c.fillRect(left, ty, across, Math.max(a.y, b.y) - ty); }
      z = z1;
    }
    // The face's top edge, darker, so its height reads.
    c.strokeStyle = runnable ? 'rgba(80,120,40,.85)' : 'rgba(90,50,60,.8)'; c.beginPath();
    zs.forEach((z, i) => { const p = project(x(z), z, top); c.lineWidth = Math.max(1.5, p.s * .1); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }); c.stroke();
    c.restore();
  }
  /** The walls (owner, 13 Nov., after Blade of Brim): tall ones up past the top of the screen, hiding the void; low ones a lane
   *  thick, their grassy top seen and the void over them; wooden fences. Their end facing Benny shows their thickness: one lane. */
  function paintedWalls(c: CanvasRenderingContext2D, g: BennyRun): void {
    for (const w of [...g.walls].sort((a, b) => b.from - a.from)) {
      if (w.void) continue;
      const from = Math.max(NEAR, w.from - g.distance), to = Math.min(FAR, w.to - g.distance); if (to <= from) continue;
      const dir = w.side === 'left' ? -1 : 1, look = wallLook(w), x = (z: number) => dir * wallXAt(g, z);
      if (look === 'fence') { fence(c, g, dir, from, to); continue; }
      footShadow(c, g, dir, from, to);
      if (look === 'tall') {
        for (const b of blocksOf(w).reverse()) {
          const bf = Math.max(NEAR, b.from - g.distance), bt = Math.min(FAR, b.to - g.distance); if (bt <= bf) continue;
          if (bf > 0 && bf === b.from - g.distance) endFace(c, x(bf) + dir * b.out, x(bf) + dir * (b.out + WALL_THICK), bf, b.top, w.runnable);
          wallFace(c, g, dir, bf, bt, b.top, w.runnable, b.out, true);
        }
        continue;
      }
      const top = LOW_HEIGHT;
      // Its end facing Benny, when it begins ahead of her (after a tall wall it is hidden behind that one).
      const before = g.walls.find(v => v.side === w.side && v.to === w.from), hidden = !!before && !before.void && wallLook(before) === 'tall';
      if (from > 0 && from === w.from - g.distance && !hidden) endFace(c, x(from), x(from) + dir * WALL_THICK, from, top, w.runnable);
      if (look === 'low') {
        const zs = cuts(g, from, to); c.beginPath();
        zs.forEach((z, i) => { const p = project(x(z), z, top); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
        for (const z of [...zs].reverse()) { const p = project(x(z) + dir * WALL_THICK, z, top); c.lineTo(p.x, p.y); }
        c.closePath(); const grass = decor['decor-herbe'].near, pattern = grass ? c.createPattern(grass, 'repeat') : null; c.fillStyle = pattern ?? '#7fae3e'; c.fill();
      }
      wallFace(c, g, dir, from, to, top, w.runnable);
    }
  }
  /** A tall wall's blocks, from its start: lengths, heights and how far a stone one is set back, the same every time it is drawn.
   *  (A wall to run on stays flush: Benny runs against it.) */
  function blocksOf(w: {side: string; from: number; to: number; runnable: boolean}): {from: number; to: number; top: number; out: number}[] {
    const seed = Math.floor(w.from) * 2 + (w.side === 'left' ? 0 : 1), list: {from: number; to: number; top: number; out: number}[] = [];
    for (let at = w.from, k = 0; at < w.to - .01; k++) {
      let len = 9 + hash01(seed * 7 + k) * 7; if (w.to - at - len < 5) len = w.to - at;
      list.push({from: at, to: at + len, top: BLOCK_LOW + hash01(seed * 7 + k + 101) * (TALL_HEIGHT - BLOCK_LOW), out: w.runnable ? 0 : hash01(seed * 7 + k + 211) * .5});
      at += len;
    }
    return list;
  }
  /** The shadow at a wall's foot on the ground: it sits the wall on the road. */
  function footShadow(c: CanvasRenderingContext2D, g: BennyRun, dir: number, from: number, to: number): void {
    const zs = cuts(g, from, to), x = (z: number) => dir * wallXAt(g, z); c.beginPath();
    zs.forEach((z, i) => { const p = project(x(z), z, 0); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
    for (const z of [...zs].reverse()) { const p = project(x(z) - dir * .9, z, 0); c.lineTo(p.x, p.y); }
    c.closePath(); c.fillStyle = 'rgba(70,30,20,.2)'; c.fill();
  }
  /** A tall wall to run on is earth with roots; a low one, earth and flowers; one not to run on, stone. */
  const wallTexture = (runnable: boolean, top: number): DecorName => !runnable ? 'decor-mur-pierre' : top > LOW_HEIGHT + .01 ? 'decor-mur-racines' : 'decor-mur-terre';
  /** A wall's end facing Benny: square to the camera, so its painted tile is laid flat, a little shaded (the light comes from the road). */
  function endFace(c: CanvasRenderingContext2D, x0: number, x1: number, z: number, top: number, runnable: boolean): void {
    const a = project(x0, z, 0), b = project(x1, z, top), left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), bottom = a.y, up = Math.max(0, b.y);
    if (right < 0 || left > width || bottom <= up) return;
    c.save(); c.beginPath(); c.rect(left, up, right - left, bottom - up); c.clip();
    c.fillStyle = runnable ? '#c86a32' : '#a87a80'; c.fillRect(left, up, right - left, bottom - up);
    const t = decor[wallTexture(runnable, top)], el = z > 30 ? t.far : t.near, tile = Math.max(4, FACE_TILE * a.s);
    if (el) for (let y = bottom - tile; y + tile > up; y -= tile) for (let xx = left; xx < right; xx += tile) c.drawImage(el, xx, y, tile, tile);
    c.fillStyle = 'rgba(60,30,30,.22)'; c.fillRect(left, up, right - left, bottom - up);
    const haze = hazeAt(z); if (haze > .02) { c.fillStyle = `rgba(250,198,166,${haze.toFixed(3)})`; c.fillRect(left, up, right - left, bottom - up); }
    c.restore();
  }
  /** A wooden fence along the road (not run on): posts every two metres and two rails, the void seen through it. */
  function fence(c: CanvasRenderingContext2D, g: BennyRun, dir: number, from: number, to: number): void {
    const x = (z: number) => dir * (halfAt(g, z) + .3), zs = cuts(g, from, to);
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (const [h, colour] of [[.45, '#7a4a24'], [.95, '#a0683a']] as const) {
      c.strokeStyle = colour; c.beginPath();
      zs.forEach((z, i) => { const p = project(x(z), z, h); c.lineWidth = Math.max(2, p.s * .2); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }); c.stroke();
    }
    for (let k = Math.floor((g.distance + to) / 2) * 2; k >= g.distance + from; k -= 2) {
      const z = k - g.distance, a = project(x(z), z, 0), b = project(x(z), z, FENCE_HEIGHT), w = Math.max(1.5, a.s * .18);
      c.fillStyle = '#6b4223'; c.fillRect(a.x - w / 2, b.y, w, a.y - b.y); c.fillStyle = '#b97a45'; c.fillRect(a.x - w / 2, b.y, w, Math.max(1, w * .5));
    }
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
  /** A long hint stays up long enough to be read (about 45 ms a letter, 0.9 s at least, 2.6 s at most). */
  function show(text: string, big: boolean): void { const ms = big ? 900 : Math.min(2600, Math.max(900, text.length * 45));
    pop.textContent = text; pop.classList.toggle('benny-run-count', big); pop.style.animationDuration = `${ms}ms`; pop.classList.remove('show'); void pop.offsetWidth; pop.classList.add('show'); clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('show'), ms); }
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
    // Still too slow at the softest picture: the track goes back to flat colours (smooth before pretty).
    else if (slowSampled > sampled / 2) plainGround = true;
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
    if (g.platforms.some(p => near(p.from))) kinds.push('platform');
    // The first stretch with no wall (no pit in it): the void at the side.
    if (g.walls.some(w => w.void && near(w.from)) && !g.pits.some(p => p.open && near(p.from))) kinds.push('edge');
    const kind = kinds.find(k => !hinted.has(k)); if (!kind) return;
    hinted.add(kind); flash(HINTS[kind]);
    try { localStorage.setItem(HINTS_KEY, JSON.stringify([...hinted])); } catch { /* Only for this session. */ }
  }
  function hud(): void {
    const g = game; if (!g) return;
    hints(g);
    score.textContent = `${g.score}`;
    // Beating the record during the run: said at once, with confetti, and the score turns gold.
    if (!beaten && runBest > 0 && g.score > runBest && !g.tutorial) {
      beaten = true; score.classList.add('benny-run-beaten'); flash('Nouveau record !', false, true); sound('power');
      burst(width / 2, height * .3, ['#ff6b6b', '#ffb84d', '#ffe66b', '#7be08a', '#6bb8ff', '#b07bff'], 40, 420);
    }
    // The challenge under way and how far along it is.
    // The challenge under way, in a panel at the bottom with its progress bar.
    const ch = g.challenge; challengeLine.textContent = ch ? `Défi : ${CHALLENGE_TEXT[ch.kind](ch.goal)} · ${ch.count}/${ch.goal}` : '';
    quest.hidden = !ch || !coach.hidden || !running; if (ch) questFill.style.width = `${Math.min(1, ch.count / ch.goal) * 100}%`;
    // Every 500 m.
    const reached = Math.floor(g.distance / 500) * 500;
    if (metresBest > 0 && !metresBeaten && g.distance > metresBest) { metresBeaten = true; flash('Plus loin que jamais !', false, true); sound('power', 1.2); }
    if (reached > milestone && !g.tutorial && reached % 1000) { milestone = reached; flash(`${reached} m !`); sound('coin', 1.5); }
    // Hidden while the tutorial's advice is up (they would overlap).
    // A combo shows only its count of hits (owner: no bar, nothing else).
    combo.textContent = coach.hidden && g.combo > 1 && g.at <= g.comboUntil ? `${g.combo} coups` : '';
    metres.textContent = `${Math.floor(g.distance)} m`; coins.textContent = `${g.coins}`; coins.setAttribute('aria-label', plural(g.coins, 'pièce'));
    // The Hearts won so far in this run, shown once there is one.
    hearts.hidden = g.hearts === 0; hearts.textContent = `${g.hearts}`; hearts.setAttribute('aria-label', plural(g.hearts, 'cœur'));
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
  const cameraHeight = () => Math.min(24, Math.max(2.2, (height * .78 - height * HORIZON) / scale0()));
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
    // The painted sky: its top part, at the right proportions, down to the horizon.
    if (skyPicture.ready && skyPicture.image) { const img = skyPicture.image, h = horizon + 1; c.drawImage(img, 0, 0, img.width, Math.min(img.height, img.width * h / width), 0, 0, width, h); return; }
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
    // On a wall the whole world rolls towards it, sky included, a little zoomed in: everything after this is drawn rolled, until
    // draw() restores. The sky is spread out from the horizon so that it still fills the screen's top corners.
    let spread = 1;
    if (wallTilt) { const k = Math.abs(wallTilt), cx = width / 2, cy = height * .72; { const horizon = project(0, FAR, 0).y, grad = c.createLinearGradient(0, horizon * .6, 0, height); grad.addColorStop(0, PAINTED_LOOK.cloudTop); grad.addColorStop(1, PAINTED_LOOK.cloudBottom); c.fillStyle = grad; c.fillRect(0, 0, width, height); }
      c.translate(cx, cy); c.rotate(wallTilt * WALL_ROLL); c.scale(1 + (WALL_ZOOM - 1) * k, 1 + (WALL_ZOOM - 1) * k); c.translate(-cx, -cy); spread = 1 + .7 * k; }
    const sky = (setting: RunSetting) => { if (spread === 1) { backdrop(c, setting); return; }
      const horizon = project(0, FAR, 0).y; c.save(); c.translate(width / 2, horizon); c.scale(spread, spread); c.translate(-width / 2, -horizon); backdrop(c, setting); c.restore(); };
    if (fade < 1) { sky(settingBefore); c.globalAlpha = fade; }
    sky(g.setting); c.globalAlpha = 1;
    // Painted, the ground of the track (floor, walls, gaps) is drawn on its own layer at a softer resolution, then laid on the
    // screen in one go: the textures are soft anyway, and it is four times less to paint (the characters stay sharp).
    const layer = decorReady() ? groundLayer() : null;
    if (layer) { layer.k.clearRect(0, 0, width, height); ground(layer.k, g, colours); c.drawImage(layer.el, 0, 0, layer.el.width, layer.el.height, 0, 0, width, height); }
    else ground(c, g, colours);
    // The setting's wash, blended from the last one's.
    if (decorReady()) { const a = SETTING_WASH[fade < 1 ? settingBefore : g.setting], b = SETTING_WASH[g.setting], k = fade < 1 ? fade : 1, mix = (i: number) => a[i] + (b[i] - a[i]) * k;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(${mix(0) | 0},${mix(1) | 0},${mix(2) | 0},${(mix(3) * 1.3).toFixed(3)})`; c.fillRect(0, 0, c.canvas.width, c.canvas.height); c.restore(); }
  }
  let layerEl: HTMLCanvasElement | null = null, layerK: CanvasRenderingContext2D | null = null;
  function groundLayer(): {el: HTMLCanvasElement; k: CanvasRenderingContext2D} | null {
    if (!layerEl) { layerEl = document.createElement('canvas'); layerK = layerEl.getContext('2d'); }
    if (!layerK) return null;
    const ratio = Math.min(GROUND_RATIO, ratioCap, window.devicePixelRatio || 1), w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    if (layerEl.width !== w || layerEl.height !== h) { layerEl.width = w; layerEl.height = h; }
    layerK.setTransform(ratio, 0, 0, ratio, 0, 0); return {el: layerEl, k: layerK};
  }
  /** The ground of the track under the sky: the floor, its stripes, the gaps and pits, the walls. */
  /** Below the horizon, around the isle: the rest of the painted sky (the islands' feet, then the sea of clouds), at the same
   *  scale as the sky above so the two meet, then its last warm tone down to the bottom of the screen. */
  function voidSky(c: CanvasRenderingContext2D, horizon: number): void {
    const img = skyPicture.ready ? skyPicture.image : null;
    let to = horizon;
    if (img) { const k = width / img.width, from = horizon / k, rest = img.height - from;
      if (rest > 0) { const h = Math.min(rest * k, height - horizon + 1); c.drawImage(img, 0, from, img.width, h / k, 0, horizon, width, h); to = horizon + h; } }
    if (to >= height) return;
    // The picture's bottom edge blends into its last tone (a soft band, no seam).
    const grad = c.createLinearGradient(0, to - 40, 0, height); grad.addColorStop(0, 'rgba(252,190,140,0)'); grad.addColorStop(.25, 'rgb(252,190,140)'); grad.addColorStop(1, PAINTED_LOOK.cloudBottom);
    c.fillStyle = grad; c.fillRect(0, Math.max(horizon, to - 40), width, height - Math.max(horizon, to - 40));
  }
  function ground(c: CanvasRenderingContext2D, g: BennyRun, colours: typeof SETTING_COLOURS[RunSetting]): void {
    const horizon = project(0, FAR, 0).y, edge = lanes / 2 * LANE_WIDTH;
    // The next setting, from its start onwards: drawn beyond a line across the whole ground.
    const border = g.upcoming ? Math.max(NEAR, Math.min(FAR, g.upcoming.z - g.distance)) : FAR, next = g.upcoming ? SETTING_COLOURS[g.upcoming.setting] : colours;
    // Painted (concept C): the isle's track over a sea of clouds; the textures stand in for the flat colours once loaded.
    const painted = decorReady();
    if (painted) {
      voidSky(c, horizon);
      voidEdges(c, g); paintedFloor(c, g);
    } else {
      c.fillStyle = colours.side; c.fillRect(0, horizon, width, height - horizon);
      if (border < FAR) { const b = project(0, border, 0).y; c.fillStyle = next.side; c.fillRect(0, horizon, width, Math.max(0, b - horizon)); }
      scenery(c, g);
      strip(c, g, NEAR, border, colours.ground);
      if (border < FAR) strip(c, g, border, FAR, next.ground);
    }
    // Lane stripes that scroll with the distance, so the speed reads.
    for (let k = 0; k < 40; k++) {
      const z0 = NEAR + k * 4 - (g.distance % 4), z1 = z0 + 2;
      if (z0 > FAR) break;
      // The stripes of the lanes there (none where the road is opening or closing).
      const n0 = lanesDrawn(g, z0), n1 = lanesDrawn(g, z1); if (n0 !== n1 || n0 % 1) continue;
      for (const x of Array.from({length: n0 - 1}, (_, i) => (i + 1 - n0 / 2) * LANE_WIDTH)) quad(c, [project(x - .06, z0, 0), project(x + .06, z0, 0), project(x + .06, z1, 0), project(x - .06, z1, 0)], painted ? PAINTED_LOOK.lane : z0 < border ? colours.lane : next.lane);
    }
    // Gaps in the road: a chasm (lava on the bridge), with a bright lip on its near and far edges.
    for (const h of g.holes) {
      const from = Math.max(NEAR, h.from - g.distance), to = Math.min(FAR, h.to - g.distance); if (to <= from) continue;
      const look = SETTING_COLOURS[settingAt(g, h.from)];
      // Painted: the clouds far below, the next isle's cliff facing Benny, and a shadow under the lip she would fall from.
      if (painted) {
        const wide = (z: number) => halfAt(g, z) + VERGE;
        cliffFace(c, to, -wide(to), wide(to), () => { c.beginPath(); const a = project(-wide(from), from, 0), b = project(wide(from), from, 0), e = project(wide(to), to, 0), f = project(-wide(to), to, 0); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.lineTo(f.x, f.y); c.closePath(); });
        if (from > NEAR) { strip(c, g, from - .35, from, 'rgba(60,36,20,.45)'); const a = project(-wide(from), from, 0), b = project(wide(from), from, 0); c.strokeStyle = PAINTED_LOOK.lip; c.lineWidth = Math.max(2, a.s * .14); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        continue;
      }
      strip(c, g, from, to, look.hole);
      if (settingAt(g, h.from) === 'pont') for (let k = 0; k < 3; k++) { const z = from + ((g.at / 400 + k / 3) % 1) * (to - from), a = project(-edge * .6, z, 0), b = project(edge * .6, z, 0); c.strokeStyle = 'rgba(255,230,140,.5)'; c.lineWidth = Math.max(1, a.s * .08); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      for (const z of [from, to]) if (z > NEAR && z < FAR) strip(c, g, z - .25, z + .25, look.holeEdge);
    }
    // Cracked slabs in a lane (thin dark cracks), then the pit once they gave way (with a lip like a gap's).
    for (const p of g.pits) {
      const from = Math.max(NEAR, p.from - g.distance), to = Math.min(FAR, p.to - g.distance); if (to <= from) continue;
      const n = lanesAt(g, p.from), x = (p.lane - (n - 1) / 2) * LANE_WIDTH, x0 = x - LANE_WIDTH * .48, x1 = x + LANE_WIDTH * .48, look = SETTING_COLOURS[settingAt(g, p.from)];
      if (p.open && painted) {
        // Painted: the clouds through the open lane, the cliff at its far end, the grass lip at its near end.
        const opening = [project(x0, from, 0), project(x1, from, 0), project(x1, to, 0), project(x0, to, 0)];
        quad(c, opening, PAINTED_LOOK.cloudTop);
        cliffFace(c, to, x0, x1, () => { c.beginPath(); c.moveTo(opening[0].x, opening[0].y); for (const q of opening.slice(1)) c.lineTo(q.x, q.y); c.closePath(); });
        if (from > NEAR) { const a = project(x0, from, 0), b = project(x1, from, 0); c.strokeStyle = PAINTED_LOOK.lip; c.lineWidth = Math.max(2, a.s * .14); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      } else if (p.open) { quad(c, [project(x0, from, 0), project(x1, from, 0), project(x1, to, 0), project(x0, to, 0)], look.hole);
        for (const z of [from, to]) if (z > NEAR) quad(c, [project(x0, z - .2, 0), project(x1, z - .2, 0), project(x1, z + .2, 0), project(x0, z + .2, 0)], look.holeEdge); }
      else {
        quad(c, [project(x0, from, 0), project(x1, from, 0), project(x1, to, 0), project(x0, to, 0)], 'rgba(40,24,12,.25)');
        c.strokeStyle = 'rgba(30,18,10,.8)'; const a = project(x, from, 0); c.lineWidth = Math.max(1, a.s * .06); c.beginPath();
        for (let k = 0; k < 4; k++) { const z0 = from + (to - from) * k / 4, z1 = from + (to - from) * (k + 1) / 4, p0 = project(x + (k % 2 ? .5 : -.5), z0, 0), p1 = project(x + (k % 2 ? -.4 : .4), z1, 0); if (!k) c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); }
        c.stroke();
      }
    }
    // The walls, in their segments: runnable ones are lit and striped, the others dark (painted: earth and grass, or stone).
    if (painted) { paintedWalls(c, g); return; }
    for (const w of g.walls) for (const [lo, hi] of [[NEAR, border], [border, FAR]] as const) {
      if (w.void) continue; // The void beside the road: nothing to see but the dark.
      const from = Math.max(lo, w.from - g.distance), to = Math.min(hi, w.to - g.distance); if (to <= from) continue;
      const dir = w.side === 'left' ? -1 : 1, zs = cuts(g, from, to);
      // A wall Benny can run on is earth with grass (it reads as ground); the others are grey stone.
      c.fillStyle = w.runnable ? '#7d9b4c' : '#6e7480'; c.beginPath();
      zs.forEach((z, i) => { const p = project(dir * wallXAt(g, z), z, 0); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
      for (const z of [...zs].reverse()) { const p = project(dir * wallXAt(g, z), z, WALL_HEIGHT); c.lineTo(p.x, p.y); }
      c.closePath(); c.fill();
      if (w.runnable) for (let z = Math.ceil(from / 6) * 6; z < to; z += 6) {
        const x = dir * wallXAt(g, z), a = project(x, z, .3), b = project(x, z, WALL_HEIGHT - .3);
        c.strokeStyle = 'rgba(90,60,30,.45)'; c.lineWidth = Math.max(1, a.s * .05); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
    }
  }
  /** The raised platforms: stone sides, a lighter top with a path, the ramp up to it (shapes until the painted settings). */
  /** The stairs: a raised stretch of road along one lane, its top drawn step by step up and back down (shapes, like the platforms). */
  function ledges(c: CanvasRenderingContext2D, g: BennyRun): void {
    for (const l of [...g.ledges].sort((a, b) => b.from - a.from)) {
      const from = Math.max(NEAR, l.from - g.distance), to = Math.min(FAR, l.to - g.distance); if (to <= from) continue;
      const n = lanesAt(g, l.from), x = (l.lane - (n - 1) / 2) * LANE_WIDTH, x0 = x - LANE_WIDTH * .47, x1 = x + LANE_WIDTH * .47;
      const look = paintedLook(settingAt(g, l.from));
      for (let z = from; z < to; z += 1) {
        const z1 = Math.min(to, z + 1), h = ledgeHeight(g, l.lane, g.distance + z), h1 = ledgeHeight(g, l.lane, g.distance + z1);
        quad(c, [project(x0, z, h), project(x1, z, h), project(x1, z1, h1), project(x0, z1, h1)], look.wall);
        // Painted: one plank per step, its joint drawn.
        if (decorReady()) { const a = project(x0, z, h), b = project(x1, z, h); c.strokeStyle = PAINTED_LOOK.joint; c.lineWidth = Math.max(1, a.s * .05); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        quad(c, [project(x0, z, 0), project(x0, z1, 0), project(x0, z1, h1), project(x0, z, h)], look.wallOff);
        quad(c, [project(x1, z, 0), project(x1, z1, 0), project(x1, z1, h1), project(x1, z, h)], look.wallOff);
      }
    }
  }
  function platforms(c: CanvasRenderingContext2D, g: BennyRun): void {
    const top = BENNY_RUN.platformHeight;
    for (const p of [...g.platforms].sort((a, b) => b.from - a.from)) {
      const start = Math.max(NEAR, p.from - g.distance), from = Math.max(NEAR, p.from - g.distance), to = Math.min(FAR, p.to - g.distance); if (to <= start) continue;
      const n = lanesAt(g, p.from), x = (p.lane - (n - 1) / 2) * LANE_WIDTH, x0 = x - LANE_WIDTH * .47, x1 = x + LANE_WIDTH * .47;
      const look = paintedLook(settingAt(g, p.from)), height = (_z: number) => top;
      // Its shadow on the road beside it, the two sides (the one facing the middle shows), then the ramp and the top.
      for (const [sx, dx] of [[x0, -.5], [x1, .5]] as const) quad(c, [project(sx, from, 0), project(sx + dx, from, 0), project(sx + dx, to, 0), project(sx, to, 0)], 'rgba(0,0,0,.22)');
      for (const sx of [x0, x1]) { c.fillStyle = look.wallOff; c.beginPath(); c.moveTo(project(sx, start, 0).x, project(sx, start, 0).y);
        for (const z of [from, to]) { const q = project(sx, z, height(z)); c.lineTo(q.x, q.y); } const e = project(sx, to, 0); c.lineTo(e.x, e.y); c.closePath(); c.fill(); }
      quad(c, [project(x0, start, height(start)), project(x1, start, height(start)), project(x1, from, top), project(x0, from, top)], look.wall);
      if (to > from) { quad(c, [project(x0, from, top), project(x1, from, top), project(x1, to, top), project(x0, to, top)], look.wall);
        // Painted: planks like the road's, their joints every half metre; otherwise a lighter top.
        if (decorReady()) { c.strokeStyle = PAINTED_LOOK.joint;
          for (let z = from + posmod(-(g.distance + from), PLANK_ALONG / 6); z < to; z += PLANK_ALONG / 6) { const a = project(x0, z, top), b = project(x1, z, top); c.lineWidth = Math.max(1, a.s * .05); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } }
        else quad(c, [project(x0, from, top), project(x1, from, top), project(x1, to, top), project(x0, to, top)], 'rgba(255,255,255,.22)'); }
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
    // (A coin out over the void, beside the road, is a lane's width out: where Benny floats when she jumps out there.)
    const n = lanesAt(g, e.z); let x = e.kind === 'coin' || (e.lane >= 0 && e.lane <= n - 1) ? (shown - (n - 1) / 2) * LANE_WIDTH : e.lane < 0 ? -wallXAt(g, ahead) + .4 : wallXAt(g, ahead) - .4;
    // On a low wall, things sit on its top, in its middle.
    const lowSide = e.kind === 'coin' || (e.lane >= 0 && e.lane <= n - 1) ? null : e.lane < 0 ? 'left' as const : 'right' as const, low = !!lowSide && lowAt(g, lowSide, e.z);
    if (low) x = (lowSide === 'left' ? -1 : 1) * (wallXAt(g, ahead) + WALL_THICK / 2);
    // The little flying monster hovers at a jump's height over the road (it is struck only by jumping through it).
    // Things on the road sit on its height here: stairs and a platform's top.
    const ground = e.kind === 'flyer' ? 0 : ledgeHeight(g, e.lane, e.z) + (platformAt(g, e.lane, e.z) ? BENNY_RUN.platformHeight : 0);
    let up = e.kind === 'flyer' ? BENNY_RUN.flyerHeight + .5 + Math.sin(g.at / 180 + e.id) * .08 : low ? LOW_HEIGHT + (e.kind === 'wallCoin' ? .5 : 0) : ground + (e.up ?? shape.up ?? 0);
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
    thingAhead = ahead;
    if (!figure(c, e, base.x, base.y, w, h, g.at, project(x, ahead, 0).y)) {
      c.fillStyle = shape.colour;
      if (shape.round) { c.beginPath(); c.ellipse(base.x, base.y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); }
      else c.fillRect(base.x - w / 2, base.y - h, w, h);
    }
    if (vanishing !== null) return; // A struck creature melting away: no warning, no word.
    if (e.kind === 'power' && e.power && base.s > 14) { c.fillStyle = '#fff'; c.font = `800 ${Math.round(Math.max(10, base.s * .3))}px system-ui`; c.textAlign = 'center'; c.fillText(POWER_NAMES[e.power], base.x, base.y - h - 4); }
    // A creature that will strike Benny unless she strikes it first (beside her or straight ahead, 1.4 s away at most): a red « ! ».
    // Over a chest struck once, higher: its dizzy stars show beneath.
    if (threatening(g, e)) { const r = Math.max(9, base.s * .32) * (1 + .12 * Math.sin(g.at / 90)), y = base.y - h - r * (e.kind === 'chest' && e.hp === 1 ? 3 : 1.6);
      c.fillStyle = '#d93a3a'; c.beginPath(); c.arc(base.x, y, r, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = `900 ${Math.round(r * 1.5)}px system-ui`; c.textAlign = 'center'; c.fillText('!', base.x, y + r * .52); return; }
    // In a tunnel of logs, only the first one says « roulade ».
    const inTunnel = e.kind === 'beam' && g.entities.some(o => o.kind === 'beam' && o.lane === e.lane && o.z < e.z && e.z - o.z <= BENNY_RUN.burrowKeep);
    // The word fades away once she has got past that obstacle a few times this run (it comes back after a bump on it).
    const label = e.cart ? 'écarte-toi' : shape.label, passed = cleared.get(e.cart ? 'cart' : e.kind) ?? 0;
    if (label && base.s > 18 && !inTunnel && passed < LABEL_UNTIL) { c.fillStyle = '#fff'; c.font = `700 ${Math.round(Math.max(10, base.s * .28))}px system-ui`; c.textAlign = 'center'; c.fillText(label, base.x, base.y - h - 4); }
  }
  /** A struck creature's last moment, `k` from 0 to 1 where it was: the chest breaks open and its lid hops, the dragonnet is
   *  thrown up spinning and shrinks, the ember flares up tall and goes out, the flyer tumbles away upwards. */
  function vanish(c: CanvasRenderingContext2D, g: BennyRun, e: RunEntity, k: number): void {
    const p = screenOf(g, e), s = Math.max(.01, p.s);
    const fade = e.kind === 'chest' ? 1 - Math.max(0, (k - .55) / .45) : 1 - k;
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, fade)); vanishing = k;
    c.translate(p.x, p.y);
    switch (e.kind) {
      case 'chest': { const hop = Math.sin(Math.min(1, k * 2.2) * Math.PI) * s * .25; c.translate(0, -hop); c.scale(1 + .08 * Math.sin(k * Math.PI), 1 - .06 * Math.sin(k * Math.PI)); break; }
      case 'dragonnet': c.translate(k * s * .5, -Math.sin(k * Math.PI) * s * .9 - k * s * .4); c.rotate(k * Math.PI * .8); c.scale(1 - k * .5, 1 - k * .5); break;
      case 'ember': c.translate(0, -k * s * .7); c.scale(1 + k * .5, 1 + k * .5); break;
      case 'flyer': c.translate(k * s * .8, -k * s * 1.6); c.rotate(k * Math.PI * 2); c.scale(1 - k * .6, 1 - k * .6); break;
    }
    c.translate(-p.x, -p.y);
    thing(c, g, e); vanishing = null; c.restore();
  }
  /** Shapes that say what each thing is, standing on (`x`, `y`), `w` × `h` px; false for those still drawn as a plain block. */
  function figure(c: CanvasRenderingContext2D, e: RunEntity, x: number, y: number, w: number, h: number, at: number, ground = y): boolean {
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
        // Painted: the clay pot or the golden one (owner-approved objects board), standing on the road.
        if (fitted(c, 'objets', e.gold ? 'pot-gold' : 'pot', 0, h * .5, w * .95)) {} else {
        ellipse(0, h * .06, w * .5, h * .42, e.gold ? '#e8b923' : '#c96b3a'); c.fillStyle = e.gold ? '#c9961a' : '#a8542a'; c.fillRect(-w * .22, -h * .5, w * .44, h * .2);
        ellipse(0, -h * .5, w * .28, h * .07, '#7a3a1c'); c.fillStyle = '#f4c430'; c.fillRect(-w * .45, h * .02, w * .9, h * .08);
        ellipse(-w * .2, -h * .08, w * .08, h * .14, 'rgba(255,255,255,.35)'); }
        // A turning four-point sparkle above a golden one.
        if (e.gold) { const r = w * (.28 + .06 * Math.sin(at / 90 + e.id)); c.translate(w * .3, -h * .75); c.rotate(at / 400); c.fillStyle = '#fff'; c.beginPath();
          for (let i = 0; i < 8; i++) { const k = i % 2 ? r * .25 : r; c.lineTo(Math.cos(i * Math.PI / 4) * k, Math.sin(i * Math.PI / 4) * k); } c.fill(); }
        c.restore(); return true;
      }
      case 'chest': {
        // The greedy chest: its lid chomps, teeth and eyes in the gap.
        const open = (.15 + .25 * Math.abs(Math.sin(at / 160 + e.id))) * h, lid = h * .38;
        // Painted (13 Nov.): whole and smiling, rocking on its feet; struck once, thrown along the road and tumbling over; struck
        // again (or against decor), broken open on its coins.
        if (art.chests.ready) {
          if (vanishing !== null) return fitted(c, 'chests', 'broken', x, y, w * 1.05);
          // Struck once, it shows it until the second blow: cracked, bandaged, dizzy; tumbling while it flies, then swaying, dazed.
          const hurt = e.hp === 1, turn = hurt ? (e.knock ? Math.sin(at / 60 + e.id) * .4 - .2 : Math.sin(at / 160 + e.id) * .14) : Math.sin(at / 220 + e.id) * .06;
          c.save(); c.translate(x, y - h * .45); c.rotate(turn); fitted(c, 'chests', hurt ? 'damaged' : 'intact', 0, h * .45, w * 1.05); c.restore(); return true;
        }
        c.fillStyle = '#6e3b2e'; c.fillRect(x - w / 2, y - h * .55, w, h * .55);
        c.fillStyle = '#2a120c'; c.fillRect(x - w * .46, y - h * .55 - open, w * .92, open);
        c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const tx = x - w * .4 + i * w * .2; c.beginPath(); c.moveTo(tx - w * .07, y - h * .55); c.lineTo(tx + w * .07, y - h * .55); c.lineTo(tx, y - h * .55 - open * .5); c.fill(); }
        eyes(x, y - h * .55 - open * .55, w * .18, Math.max(1.5, open * .22));
        c.fillStyle = '#8a4a36'; c.beginPath(); c.moveTo(x - w / 2, y - h * .55 - open); c.lineTo(x + w / 2, y - h * .55 - open); c.lineTo(x + w * .44, y - h * .55 - open - lid); c.lineTo(x - w * .44, y - h * .55 - open - lid); c.fill();
        c.fillStyle = '#f4c430'; c.fillRect(x - w * .06, y - h * .55 - open - lid * .7, w * .12, lid * .5); c.fillRect(x - w / 2, y - h * .3, w, h * .07); return true;
      }
      case 'dragonnet': {
        // A little dragon asleep, curled up, with a Z floating up.
        // Painted: asleep on its coins (the creatures stay where they are).
        // Struck, it tumbles dizzy; a few metres before Benny it wakes up with a start.
        if (art.creatures.ready) {
          fitted(c, 'creatures', vanishing !== null ? 'dragonnet-hit' : thingAhead < DRAGONNET_WAKES ? 'dragonnet-awake' : 'dragonnet-sleep', x, y, w * 1.15);
          if (vanishing !== null || thingAhead < DRAGONNET_WAKES) return true;
          const z = (at / 900 + e.id * .3) % 1; c.globalAlpha = 1 - z; c.fillStyle = '#fff'; c.font = `800 ${Math.round(Math.max(8, h * .4))}px system-ui`; c.textAlign = 'center'; c.fillText('z', x + w * .4, y - h * (1.1 + z * .6)); c.globalAlpha = 1;
          return true;
        }
        for (const dir of [-1, 1]) { c.fillStyle = '#c47a9a'; c.beginPath(); c.moveTo(x + dir * w * .1, y - h * .7); c.lineTo(x + dir * w * .5, y - h * 1.05); c.lineTo(x + dir * w * .35, y - h * .55); c.fill(); }
        ellipse(x, y - h * .4, w * .5, h * .4, '#8e3a5a'); ellipse(x, y - h * .62, w * .26, h * .24, '#a3476a');
        eyes(x, y - h * .62, w * .1, Math.max(1, w * .05), true);
        const z = (at / 900 + e.id * .3) % 1; c.globalAlpha = 1 - z; c.fillStyle = '#fff'; c.font = `800 ${Math.round(Math.max(8, h * .4))}px system-ui`; c.textAlign = 'center'; c.fillText('z', x + w * .35, y - h * (1 + z * .6)); c.globalAlpha = 1;
        return true;
      }
      case 'ember': {
        // A living flame that flickers.
        const f = 1 + .08 * Math.sin(at / 70 + e.id);
        // Struck, it goes out in a puff of smoke.
        if (fitted(c, 'creatures', vanishing !== null ? 'ember-smoke' : Math.floor(at / 110 + e.id) % 2 ? 'ember-2' : 'ember-1', x, y, w * 1.05)) return true;
        c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(x, y - h * 1.15 * f); c.quadraticCurveTo(x + w * .6, y - h * .5, x, y); c.quadraticCurveTo(x - w * .6, y - h * .5, x, y - h * 1.15 * f); c.fill();
        c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(x, y - h * .8 * f); c.quadraticCurveTo(x + w * .32, y - h * .3, x, y - h * .05); c.quadraticCurveTo(x - w * .32, y - h * .3, x, y - h * .8 * f); c.fill();
        eyes(x, y - h * .38, w * .12, Math.max(1, w * .07)); return true;
      }
      case 'flyer': {
        // Painted: wings up, wings down.
        if (fitted(c, 'creatures', vanishing !== null ? 'flyer-hit' : Math.floor(at / 90 + e.id) % 2 ? 'flyer-2' : 'flyer-1', x, y, w * 2)) return true;
        const flap = Math.abs(Math.sin(at / 90 + e.id)); c.fillStyle = '#b89af0';
        for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(x + dir * w * .3, y - h * .6); c.lineTo(x + dir * w * 1.1, y - h * (.6 + .7 * flap)); c.lineTo(x + dir * w * .9, y - h * .2); c.fill(); }
        ellipse(x, y - h / 2, w / 2, h / 2, '#7b4fc9'); eyes(x, y - h * .55, w * .17, Math.max(1, w * .1));
        c.fillStyle = '#fff'; for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(x + dir * w * .12, y - h * .25); c.lineTo(x + dir * w * .04, y - h * .25); c.lineTo(x + dir * w * .08, y - h * .1); c.fill(); }
        return true;
      }
      case 'barrier': if (e.rock) {
        // A boulder: grey-brown, a lighter side, a crack.
        if (fitted(c, 'objets', 'rock', x, y, w * .78)) return true;
        ellipse(x, y - h * 1.05, w * .36, h * 1.1, '#6f6258'); ellipse(x - w * .1, y - h * 1.4, w * .18, h * .5, '#8d8075');
        c.strokeStyle = '#4a3f37'; c.lineWidth = Math.max(1, w * .03); c.beginPath(); c.moveTo(x + w * .08, y - h * 1.7); c.lineTo(x + w * .16, y - h * 1.1); c.lineTo(x + w * .06, y - h * .6); c.stroke(); return true;
      } else {
        // A wooden fence: two posts and two planks.
        if (fitted(c, 'objets', 'barrier', x, y, w, h * 1.15)) return true;
        c.fillStyle = '#5c3e24'; c.fillRect(x - w * .45, y - h, w * .08, h); c.fillRect(x + w * .37, y - h, w * .08, h);
        c.fillStyle = '#8a6440'; c.fillRect(x - w / 2, y - h * .9, w, h * .3); c.fillRect(x - w / 2, y - h * .45, w, h * .3); return true;
      }
      case 'beam': {
        // A log held up across the lane on two posts: roll under it. Painted: the log's top where the log is, its posts on the road.
        if (fitted(c, 'objets', 'beam', x, ground, w * 1.04, ground - (y - h))) return true;
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
        if (fitted(c, 'objets', 'pillar', x, y, w * .85, h)) return true;
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
          if (fitted(c, 'objets', 'cart', x, y, w * 1.05)) return true;
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
      case 'heart': {
        // A Heart floating above the road, bobbing: red, with a white shine.
        // Bigger than a coin: a Heart is worth more and must be seen from far off on a phone.
        const cy = y - h / 2 + Math.sin(at / 180 + e.id) * h * .08, r = w * .4;
        c.beginPath(); c.moveTo(x, cy + r * 1.1);
        c.bezierCurveTo(x - r * 2.2, cy + r * .2, x - r * 1.2, cy - r * 1.6, x, cy - r * .5);
        c.bezierCurveTo(x + r * 1.2, cy - r * 1.6, x + r * 2.2, cy + r * .2, x, cy + r * 1.1);
        c.closePath(); c.fillStyle = '#ff4d6d'; c.fill(); c.strokeStyle = '#7a0f2b'; c.lineWidth = Math.max(1, r * .18); c.stroke();
        ellipse(x - r * .7, cy - r * .3, r * .28, r * .2, 'rgba(255,255,255,.85)'); return true;
      }
      case 'coin': case 'wallCoin': {
        // While coins count double: a white halo that pulses around each one.
        if (game && powerActive(game, 'double')) { const k = .5 + .5 * Math.sin(at / 110 + e.id); ellipse(x, y - h / 2, w * (.62 + .1 * k), h * (.62 + .1 * k), `rgba(255,255,255,${.35 + .3 * k})`); }
        if (fitted(c, 'objets', 'coin', x, y, w)) return true;
        ellipse(x, y - h / 2, w / 2, h / 2, '#f4c430'); ellipse(x, y - h / 2, w * .32, h * .32, '#e0a81e'); ellipse(x - w * .14, y - h * .66, w * .1, h * .1, '#fff6c8'); return true;
      }
      default: return false;
    }
  }
  /** -1 on a wall to her left, 1 to her right, eased in and out (the roll and her tilt follow it). */
  let wallTilt = 0, lastStride = 0;
  let leapArc = 0, laneSpeed = 0, rollFrom = -1e9, wasFlat = false;
  const FOES = new Set(['dragonnet', 'chest', 'ember', 'flyer']);
  function threatening(g: BennyRun, e: RunEntity): boolean {
    const ahead = e.z - g.distance, across = g.wall ? wallLane(g, g.wall.side) : g.lane;
    if (!FOES.has(e.kind) || ahead <= 0 || ahead > Math.max(reach(g), g.speed * 1.4) || powerActive(g, 'flight') || powerActive(g, 'dash')) return false;
    return g.wall ? e.kind === 'flyer' && Math.abs(e.lane - across) === 1 : Math.abs(e.lane - across) <= 1;
  }
  /** Benny's landings: when she last touched down (a squash and a puff of dust), and whether she was in the air last frame. */
  let landedAt = -1e9, wasUp = false, saidBlocked = false;
  /** Running on a low wall: on its top, upright, not tipped onto its face. */
  const lowAt = (g: BennyRun, side: 'left' | 'right', z: number) => { const w = wallAt(g, side, z); return !!w && !w.void && wallLook(w) === 'low'; };
  const onLow = (g: BennyRun) => !!g.wall && lowAt(g, g.wall.side, g.distance);
  const bennyHeight = (g: BennyRun) => onLow(g) ? LOW_HEIGHT : g.wall ? BENNY_RUN.wallRunHeight + Math.sin(leapArc * Math.PI) * 1.4 : runHeight(g);
  /** The void: Benny drops, and the Dragon rises from below in its catch pose, and she lands on its back. */
  function fallCatch(c: CanvasRenderingContext2D, g: BennyRun, now: number): void {
    if (g.fallFrom === null) return;
    const t = Math.min(1, (g.at - g.fallFrom) / BENNY_RUN.fallMs), side = Math.min(width, height) * .6;
    // The Dragon swoops up from below the screen, then holds her.
    const rise = Math.min(1, t / .6), x = width / 2, feet = height * (1.22 - .42 * rise);
    if (art.dragon.ready) paint(c, 'dragon', 'catch', x, feet, side);
    // Its painting holds Benny already (in its arms): she is not drawn a second time.
    void now;
  }
  function benny(c: CanvasRenderingContext2D, g: BennyRun, now: number): void {
    // Falling into the void she is out of sight once the Dragon has her (see fallCatch).
    if (g.fallFrom !== null && (g.at - g.fallFrom) / BENNY_RUN.fallMs > .45) return;
    const wall = g.wall, flat = sliding(g);
    // A lane strike's hop: up and down over its whole length, carried past her lane by the blow, then back.
    const hopK = swing?.hop && !wall && !flat && !inAir(g) && now - swing.at < HOP_MS.land ? (now - swing.at) / HOP_MS.land : -1, hopDir = swing?.hop ?? 0;
    const hopUp = hopK < 0 ? 0 : HOP_HEIGHT * Math.sin(Math.PI * Math.max(0, (hopK - .1) / .9)) ** .8;
    const carry = hopK < 0 ? 0 : hopDir * HOP_CARRY * (swing?.far ? 4.5 : 1) * LANE_WIDTH * Math.sin(Math.PI * Math.min(1, Math.max(0, (hopK - .2) / .8)));
    const x = laneX(viewLane) + carry;
    const up = bennyHeight(g) + hopUp, p = project(x, 0, up), s = p.s * BENNY_SIZE;
    // Over the void she drops out of sight, faster and faster, smaller as she goes down (the Dragon dives after her).
    const drop = g.fallFrom === null ? 0 : Math.min(1, (g.at - g.fallFrom) / BENNY_RUN.fallMs / .45);
    if (drop > 0) { p.y += drop * drop * s * 1.6; c.save(); c.globalAlpha = 1 - drop * drop; c.translate(p.x, p.y); c.scale(1 - drop * .35, 1 - drop * .35); c.translate(-p.x, -p.y); }
    // Rolling, she curls up into a ball that turns.
    if (flat && !wasFlat) rollFrom = g.at;
    wasFlat = flat;
    const w = (flat ? .75 : .8) * s, h = (flat ? .75 : 1) * s;
    // Each stride on a wall kicks a little earth and grass off it, from her paws (on the wall's side).
    { const st = Math.sign(Math.sin(g.distance / 1.6 * Math.PI * 2)); if (wall && st !== lastStride && Math.abs(wallTilt) > .7 && !(leapArc > .06 && leapArc < .94)) {
      const side = wall.side === 'left' ? -1 : 1; burst(p.x + side * h * .45, p.y - h * .35, ['rgba(150,100,60,.9)', 'rgba(110,160,60,.9)', 'rgba(200,170,120,.8)'], 4, 90); } lastStride = st; }
    // Running: a stride every 1.6 m, so the faster she runs the quicker her paws go; she bobs, her ears flop, she leans into a lane change.
    const stride = g.distance / 1.6 * Math.PI * 2, grounded = !flat && !inAir(g) && !powerActive(g, 'flight');
    // Her lean follows how fast she glides across (inertia: into the move, then back as she settles).
    const bob = grounded && hopK < 0 ? Math.abs(Math.sin(stride)) * .07 * s : 0, lean = Math.max(-.3, Math.min(.3, laneSpeed * .045));
    // Touching down: a squash for a moment and a puff of dust at her feet; taking off and rising: a stretch.
    const up2 = inAir(g) && !wall && !powerActive(g, 'flight');
    if (wasUp && !up2 && !wall && !flat) { landedAt = now; const ground = project(x, 0, floorHeight(g)); burst(ground.x, ground.y, ['rgba(230,215,190,.9)', 'rgba(200,180,150,.8)'], 7, 110); sound('land', .9 + Math.random() * .2); }
    wasUp = up2;
    const land = Math.max(0, 1 - (now - landedAt) / 150), rising = up2 && g.at - g.airFrom < 220 ? 1 - (g.at - g.airFrom) / 220 : 0;
    // The hop: crouched on the spring, stretched on the bound, squashed on landing.
    const hopMs = hopK < 0 ? -1 : now - swing!.at;
    const hopSquash = hopMs < 0 ? 0 : hopMs < HOP_MS.spring ? -.12 : hopMs < HOP_MS.bound ? .08 : hopMs > HOP_MS.land - 70 ? -.1 * Math.sin(Math.PI * (hopMs - HOP_MS.land + 70) / 70) : 0;
    const squash = 1 - .2 * land + .1 * rising + hopSquash;
    c.save(); c.translate(p.x, p.y - h / 2 - bob + h / 2 * (1 - squash));
    if (flat) { if (!art['benny-roll'].ready) c.rotate((g.slideUntil - g.at) / 90); }
    // The hop: she leans back on the spring, then into the blow, and comes back upright as she lands.
    // (A blow to her right is turned anticlockwise: the wand's tip comes up, ahead, onto the creature in front of her.)
    else if (hopMs >= 0) c.rotate(hopDir * (hopMs < HOP_MS.spring ? .1 : hopMs < HOP_MS.bound ? 0 : hopMs < HOP_MS.blow ? -.3 : -.3 * (1 - (hopMs - HOP_MS.blow) / (HOP_MS.land - HOP_MS.blow))));
    // On a wall: tipped over until her paws are on it (eased in on the push off the ground, through upright on a bound across).
    else if (wall || wallTilt) c.rotate(art.benny.ready ? -wallTilt * WALL_TILT : wall ? (wall.side === 'left' ? -1.1 : 1.1) : 0);
    // Off a springboard: a whole somersault at the top of the bounce (not once a ground charge has started).
    else if (inAir(g) && g.airUntil === g.bounceUntil && !g.pound) { const k = (g.at - g.airFrom) / (g.airUntil - g.airFrom); c.rotate(lean + Math.PI * 2 * Math.min(1, Math.max(0, (k - .15) / .6))); }
    else c.rotate(lean);
    if (!flat) c.scale(1 / Math.sqrt(squash), squash);
    if (g.at < g.stumbleUntil && Math.floor(now / 80) % 2) c.globalAlpha = .45;
    // Painted: her pose for the moment (the wall pose leans onto a wall on her right, mirrored for the left one; the strike swings
    // her wand the way she moved), standing on her feet.
    // The lane strike's hop and the forward roll have their own painted poses (sheets of 13 Nov.): the blow drawn to her right,
    // mirrored for a strike to her left; the roll's four quarters, the wand going round with her, a little bounce on each.
    const turns = Math.max(1, Math.round((g.slideUntil - rollFrom) / ROLL_TURN)), rolled = flat ? Math.min(.999, (g.at - rollFrom) / (g.slideUntil - rollFrom)) * turns * 4 : 0;
    const roll = flat && art['benny-roll'].ready ? Math.floor(rolled) % 4 : -1;
    if (hopMs >= 0 && art['benny-strike'].ready) {
      const frame = hopMs < HOP_MS.spring ? 'hop-1' : hopMs < HOP_MS.bound ? 'hop-2' : hopMs < HOP_MS.blow ? 'hop-3' : 'hop-4';
      paint(c, 'benny-strike', frame, 0, h / 2, s * PAINTED_BENNY, hopDir < 0);
    } else if (roll >= 0) {
      const quarter = rolled % 1, hopRoll = Math.sin(Math.PI * quarter) * .06 * s;
      // (Getting up she is nearly standing: drawn nearly at her running size, so that the run goes on without a jump in size.)
      paint(c, 'benny-roll', `roll-${roll + 1}`, 0, h * .45 - hopRoll, s * PAINTED_BENNY * (roll === 3 ? .95 : .8));
    } else if (art.benny.ready) {
      // On a wall she runs stride after stride (her running poses, tipped over onto the wall); bounding across to the other wall,
      // her jump.
      const leaping = !!wall && leapArc > .06 && leapArc < .94;
      const pose = flat ? 'roll' : wall ? (leaping ? 'jump' : Math.sin(stride) > 0 ? 'run-1' : 'run-2') : inAir(g) || powerActive(g, 'flight') ? 'jump' : swing && now - swing.at < POSE_MS.strike ? 'strike' : Math.sin(stride) > 0 ? 'run-1' : 'run-2';
      const mirror = pose === 'strike' && !wall && g.lane < g.laneFrom;
      // The wind-up of a strike, the landing and the fall have their own painted poses (sheet of 13 Nov.).
      // On the way down from a plain jump (after its top), her falling pose: ears up, paws reaching for the ground.
      const coming = inAir(g) && !wall && !g.pound && g.airUntil !== g.bounceUntil && !powerActive(g, 'flight') && g.airUntil > g.airFrom && (g.at - g.airFrom) / (g.airUntil - g.airFrom) > .62;
      const moves: string | null = g.fallFrom !== null || coming ? 'fall' : wall && g.at - (wall.since ?? g.at) < POSE_MS.push ? 'push' : swing && now - swing.at < POSE_MS.windup && !wall && !flat && !inAir(g) ? 'windup' : now - landedAt < landHold(g) && !wall && !flat && !inAir(g) ? 'land' : null;
      // Pushing off onto a wall she tips over towards it, into her wall-running lean.
      if (moves) paint(c, 'benny-moves', moves, 0, h / 2, s * PAINTED_BENNY, mirror);
      else paint(c, 'benny', pose, 0, flat ? h * .45 : h / 2, s * PAINTED_BENNY * (flat ? .8 : 1), mirror);
    } else {
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
    }
    const fading = g.active !== null && g.active.until - g.at < POWER_ENDING && Math.floor(now / 90) % 2 === 1;
    // Charging: a fiery aura that flickers.
    if (powerActive(g, 'dash') && !fading) { c.strokeStyle = `rgba(255,${120 + Math.floor(Math.sin(now / 40) * 40)},40,.85)`; c.lineWidth = 5; c.beginPath(); c.ellipse(0, h * .1, w * .8, h * .7, 0, 0, Math.PI * 2); c.stroke(); }
    if (powerActive(g, 'bubble') && !fading) { c.strokeStyle = 'rgba(180,140,255,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, w * .85, 0, Math.PI * 2); c.stroke(); }
    c.restore();
    if (!inAir(g) && !wall && !powerActive(g, 'flight')) { const k = 1 - hopUp / HOP_HEIGHT * .35; c.fillStyle = `rgba(0,0,0,${.18 * k})`; c.beginPath(); c.ellipse(p.x, project(x, 0, floorHeight(g)).y, w * .55 * k, s * .12 * k, 0, 0, Math.PI * 2); c.fill(); }
    // The shock wave: a golden ring spreading on the road around her.
    if (shock !== null && now - shock < 450) {
      const k = Math.max(0, (now - shock) / 450), ground = project(x, 0, 0), r = (BENNY_RUN.shockReach * .9) * k;
      c.save(); c.globalAlpha = 1 - k; c.strokeStyle = '#ffd86b'; c.lineWidth = 6 * (1 - k) + 2;
      c.beginPath(); c.ellipse(ground.x, ground.y, r * ground.s, r * ground.s * .35, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    // The wand's rainbow sweep for a moment after a strike.
    const sweepAt = swing ? swing.at + (swing.hop ? HOP_MS.bound : 0) : 0;
    if (swing && now >= sweepAt && now - sweepAt < 220) {
      const k = (now - sweepAt) / 220, colours = ['#ff6b6b', '#ffb84d', '#ffe66b', '#7be08a', '#6bb8ff', '#b07bff'];
      colours.forEach((colour, i) => { c.strokeStyle = colour; c.globalAlpha = 1 - k; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y - h * .6, s * (.9 + i * .07), Math.PI * (1.1 + k * .2), Math.PI * (1.9 + k * .2)); c.stroke(); });
      c.globalAlpha = 1;
    }
    if (drop > 0) c.restore();
  }
  function dragon(c: CanvasRenderingContext2D, g: BennyRun): void {
    if (!dragonVisible(g)) return;
    // Behind Benny (between her and the camera), on her outer side, low on the screen: she swoops in from below, then hovers.
    const since = g.lastBumpAt === null ? g.at - g.startedAt : g.at - g.lastBumpAt, left = g.lastBumpAt === null ? BENNY_RUN.introMs : BENNY_RUN.dragonMs;
    const out = Math.min(1, since / 450, Math.max(0, (left - since) / 450));
    const side = viewLane > (lanes - 1) / 2 ? -1 : 1, x = laneX(viewLane) + side * 1.2, ahead = -3 - (1 - out) * 3;
    const p = project(x, ahead, 2.2 + Math.sin(g.at / 260) * .15), size = .85 * p.s;
    c.save(); c.globalAlpha = out;
    // Painted: her flight seen from behind, wings up then down.
    if (art.dragon.ready) { paint(c, 'dragon', Math.floor(g.at / WING_BEAT) % 2 ? 'fly-2' : 'fly-1', p.x, p.y, size * 4.4); c.restore(); return; }
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
    // (Her paws on the wall's face: she is drawn close against it, tipped over onto it.)
    const onWall = (wallX() - (art.benny.ready ? .25 : .45) - laneX(lanes - 1)) / LANE_WIDTH, lowTop = (wallX() + WALL_THICK / 2 - laneX(lanes - 1)) / LANE_WIDTH, target = g.wall ? (onLow(g) ? (g.wall.side === 'left' ? -lowTop : lanes - 1 + lowTop) : g.wall.side === 'left' ? -onWall : lanes - 1 + onWall) : g.overVoid ? (g.overVoid === 'left' ? -1 : lanes) : g.lane;
    // A spring: she is carried a little past her lane and settles; onto a wall, straight there (no swing through the wall).
    if (g.wall || Math.abs(target - viewLane) > lanes) { viewLane += (target - viewLane) * Math.min(1, dt * 24); laneSpeed = 0; }
    else { for (let left = dt; left > 0; left -= 1 / 240) { const h = Math.min(left, 1 / 240); laneSpeed += ((target - viewLane) * GLIDE.pull - laneSpeed * GLIDE.damp) * h; viewLane += laneSpeed * h; } }
    // On a wall, she tips over onto it and the world rolls (eased).
    { const to = g.wall && !onLow(g) ? (g.wall.side === 'left' ? -1 : 1) : 0; wallTilt += (to - wallTilt) * Math.min(1, dt * 9); if (Math.abs(wallTilt) < .002 && !to) wallTilt = 0; }
    // The blow's pending effects.
    if (pending.length) { const due = pending.filter(e => e.at <= now); pending = pending.filter(e => e.at > now); for (const e of due) e.run(); }
    { const side = g.wall ? (g.wall.side === 'left' ? -1 : 1) : 0, toX = side ? side * wallX() * .35 : laneX(viewLane) * .12, toUp = g.wall ? bennyHeight(g) * .45 : floorHeight(g) * .4;
      camX += (toX - camX) * Math.min(1, dt * 5); camUp += (toUp - camUp) * Math.min(1, dt * 4); }
    // Crossing from one wall to the other: a bound through the air.
    leapArc = g.wall ? Math.min(1, Math.abs(target - viewLane) / (lanes - 1 + 2 * onWall)) : 0;
    c.save();
    if (shake) { const k = (now - shake.at) / shake.ms; if (k >= 1) shake = null; else { const a = shake.px * (1 - k); c.translate((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a); } }
    road(c, g, SETTING_COLOURS[g.setting]);
    speedLines(c, g, now);
    platforms(c, g); ledges(c, g);
    recordBanner(c, g);
    wind(c, g, now);
    const ahead = [...g.entities].sort((a, b) => b.z - a.z);
    for (const e of ahead) if (e.z - g.distance > 0) thing(c, g, e);
    // During the end scene, Benny and the Dragon are in the scene, not on the road.
    if (!ending) benny(c, g, now);
    for (const e of ahead) if (e.z - g.distance <= 0) thing(c, g, e);
    // A creature struck melts away: its picture fades out where it was, over a short moment.
    ghosts = ghosts.filter(gh => now - gh.at < (GHOST_MS[gh.e.kind] ?? 240));
    // Carried on by the blow, it keeps its distance in front of Benny while it goes.
    for (const gh of ghosts) vanish(c, g, {...gh.e, z: g.distance + Math.max(.8, gh.ahead)}, Math.max(0, (now - gh.at) / (GHOST_MS[gh.e.kind] ?? 240)));
    c.globalAlpha = 1;
    if (!ending) dragon(c, g);
    if (!ending) fallCatch(c, g, now);
    // Shards and sparkles.
    // Impact rings: a white circle that opens and fades where a strike lands.
    streaks = streaks.filter(s => now - s.at < STREAK_MS);
    for (const s of streaks) { if (now < s.at) continue; const k = (now - s.at) / STREAK_MS, grad = c.createLinearGradient(s.x0, s.y0, s.x1, s.y1);
      grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(.35, `rgba(255,179,200,${.8 * (1 - k)})`); grad.addColorStop(.7, `rgba(231,209,255,${.9 * (1 - k)})`); grad.addColorStop(1, `rgba(255,255,255,${1 - k})`);
      c.strokeStyle = grad; c.lineCap = 'round'; c.lineWidth = 9 * (1 - k) + 2; c.beginPath(); c.moveTo(s.x0 + (s.x1 - s.x0) * k * .6, s.y0 + (s.y1 - s.y0) * k * .6); c.lineTo(s.x1, s.y1); c.stroke(); c.lineCap = 'butt'; }
    rings = rings.filter(r => now - r.at < 260);
    for (const r of rings) { const k = (now - r.at) / 260; c.strokeStyle = r.ground ? `rgba(120,235,255,${.9 * (1 - k)})` : `rgba(255,255,255,${.9 * (1 - k)})`; c.lineWidth = 6 * (1 - k) + 1; c.beginPath();
      if (r.ground) c.ellipse(r.x, r.y, r.size * (.5 + k), r.size * (.5 + k) * .32, 0, 0, Math.PI * 2); else c.arc(r.x, r.y, r.size * (.4 + k), 0, Math.PI * 2); c.stroke(); }
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
    // Points spring out (a strike's big, popping in), outlined to read on any ground, and float up.
    c.textAlign = 'center'; c.lineJoin = 'round';
    for (const f of flashes) { const k = (now - f.at) / 700, pop = 1 + .45 * Math.max(0, 1 - k * 6), y = height * (f.big ? .7 : .55) - (now - f.at) * .06 - (f.row ?? 0) * 34;
      c.globalAlpha = 1 - k * k; c.font = `800 ${Math.round((f.big ? 30 : 22) * pop)}px system-ui`; c.lineWidth = 5; c.strokeStyle = 'rgba(59,36,20,.85)'; c.strokeText(f.text, f.x, y); c.fillStyle = f.big ? '#fff6c8' : '#fff'; c.fillText(f.text, f.x, y); }
    c.globalAlpha = 1;
  }
  /** The tutorial's advice, one per step (tutoiement). */
  const COACH: Record<TutorialStep, string> = {
    pot: 'Un pot à côté de toi : glisse vers lui pour le frapper avec ton bâton !',
    jump: 'Une barrière : glisse vers le haut pour sauter !',
    roll: 'Une poutre : glisse vers le bas pour passer dessous en roulade !',
    front: 'Un coffre glouton droit devant : roule dedans pour le frapper ; il faut deux coups !',
    flyer: 'Un petit monstre volant : glisse vers lui pour le frapper !',
    wall: 'Des piliers partout : glisse vers le mur pour courir dessus !',
  };
  function showCoach(step: TutorialStep | null, again = false): void {
    if (!step) { coach.textContent = 'Bravo ! Maintenant, cours aussi loin que tu peux !'; coach.hidden = false; setTimeout(() => { if (game && !game.tutorial) coach.hidden = true; }, 2600); return; }
    coach.textContent = (again ? 'Encore une fois ! ' : '') + COACH[step]; coach.hidden = false;
  }
  /** Where a thing is drawn on screen now (for the shards). */
  const screenOf = (g: BennyRun, e: RunEntity) => { const n = lanesAt(g, e.z), ahead = e.z - g.distance, x = e.lane < 0 ? -wallXAt(g, ahead) + .4 : e.lane > n - 1 ? wallXAt(g, ahead) - .4 : (e.lane - (n - 1) / 2) * LANE_WIDTH;
    return project(x, Math.max(.3, e.z - g.distance), e.kind === 'flyer' ? BENNY_RUN.flyerHeight + .5 : .5); };
  function react(): void {
    const g = game; if (!g) return;
    for (const event of takeRunEvents(g)) switch (event.type) {
      case 'strike': {
        if (event.by === 'spin') { flash('Coup tournoyant !'); slowMo(260); }
        if (event.by === 'kick' && event.entity.kind === 'chest') { flash('Coup de pied !'); slowMo(120); }
        // A chest struck the first time is still on the road (thrown): only its last strike leaves it broken open.
        // A lane change strikes with a hop (to the side she moved to): the blow lands a moment later.
        const hopping = (event.by === 'lane' || event.by === 'far' || event.by === 'spin') && !g.wall && !inAir(g) && !sliding(g);
        if (hopping && !(swing?.hop && clock() - swing.at < HOP_MS.bound)) swing = {at: clock(), lane: g.lane, hop: Math.sign(g.lane - g.laneFrom) || 1};
        // The long blow, into the lane after hers: she lunges much further over, towards it, before she settles in her lane.
        if (event.by === 'far' && swing) swing.far = true;
        else if (!hopping) swing = {at: clock(), lane: g.lane, hop: 0};
        const delay = hopping && swing ? Math.max(0, swing.at + HOP_MS.bound - clock()) : 0;
        if (event.entity.kind !== 'pot' && g.entities.every(o => o.id !== event.entity.id)) ghosts.push({e: {...event.entity}, at: clock() + delay, ahead: event.entity.z - g.distance});
        // Three things or more broken in one roll: it is said.
        if (event.roll && event.roll >= 3) flash(`Roulade en chaîne ×${event.roll} !`);
        const p = screenOf(g, event.entity);
        // Struck from afar (more than a few metres ahead): the streak of the wand reaching it.
        if (event.by !== 'shock' && event.by !== 'chest' && event.entity.z - g.distance > STREAK_FROM) { const b = project(laneX(viewLane), .3, bennyHeight(g) + .6); streaks.push({x0: b.x, y0: b.y, x1: p.x, y1: p.y - p.s * .4, at: clock() + delay}); }
        later(delay, () => {
        // The chest's first blow pays nothing yet (it is thrown on): « Bam ! » rather than « +0 ».
        // Two blows at once (a chest knocked then broken, a double strike): the second rises above the first instead of over it.
        { const t = clock(), row = flashes.filter(f => f.big && t - f.at < 300).length;
          flashes.push({at: t, text: event.points ? `+${event.points}` : 'Bam !', x: (p.x + width / 2) / 2, big: true, row}); }
        // A glowing ring opens on the ground under Benny with each strike.
        { const b = project(laneX(viewLane), 0, bennyHeight(g)); rings.push({x: b.x, y: b.y, at: clock(), size: b.s * 1.2, ground: true}); }
        // Each strike of a combo a semitone higher (up to an octave); a new multiplier is announced.
        const pitch = 2 ** (Math.min(12, event.combo - 1) / 12);
        if (event.entity.gold) { burst(p.x, p.y, ['#fff3a0', '#f4c430', '#ffffff'], 26, 380); flash(`Pot doré ! +${event.points}`); }
        if (event.entity.kind === 'pot') { burst(p.x, p.y, ['#c96b3a', '#e08a52', '#8a4a26', '#a8542a', '#f4c430'], 22, 320); burst(p.x, p.y, ['rgba(220,180,140,.8)'], 6, 90); sound('pot', pitch); }
        else { burst(p.x, p.y, ['#fff', '#e7d1ff', '#ffb3c8', '#ffe36b'], 12, 220); sound('strike', pitch); }
        // A creature lands harder than a pot: a longer freeze, a bigger ring.
        rings.push({x: p.x, y: p.y - p.s * .4, at: clock(), size: p.s * (event.entity.kind === 'pot' ? .9 : 1.4)});
        // A shock wave's strikes ring and score but neither freeze nor shake the run.
        if (event.by !== 'shock') { shakeFor('strike'); if (event.entity.kind !== 'pot') hitStop(); }
        }); break;
      }
      case 'crash': { if (event.entity.kind === 'chest') ghosts.push({e: {...event.entity}, at: clock(), ahead: event.entity.z - g.distance}); const p = screenOf(g, event.entity); burst(p.x, p.y, ['#c96b3a', '#8a4a26'], 8, 180); sound('pot'); break; }
      case 'coin': if (clock() - lastCoinSound > 60) { coinRun = clock() - lastCoinSound < 450 ? Math.min(12, coinRun + 1) : 0; lastCoinSound = clock(); sound('coin', 2 ** (coinRun / 24)); } break;
      case 'bump': cleared.set(event.entity.cart ? 'cart' : event.entity.kind, 0); if (event.entity.kind !== 'hole') flash('Aïe ! La Dragon arrive !'); hurtAt = clock(); shakeFor('bump'); sound('bump'); break;
      case 'shield': flash('La bulle te protège !'); burst(width / 2, height * .7, ['#e7d1ff', '#b07bff', '#fff'], 16, 260); sound('power'); break;
      case 'power': flash(`${POWER_NAMES[event.power]} !`); sound('power'); break;
      case 'frenzy': flash('Frénésie ! Les pièces viennent à toi'); burst(width / 2, height * .62, ['#ffe36b', '#ffb3c8', '#e7d1ff', '#fff'], 24, 360); sound('power', 1.25); shakeFor('strike'); break;
      case 'heart': flash('+1 Cœur !'); burst(width / 2, height * .7, ['#ff4d6d', '#ffd1dc', '#fff'], 14, 240); sound('power', 1.5); break;
      case 'wallStart': sound('wall', event.side === 'left' ? .94 : 1.06); break;
      case 'cleared': { const k = event.entity.cart ? 'cart' : event.entity.kind; cleared.set(k, (cleared.get(k) ?? 0) + 1); }
        if (event.points) { const p = screenOf(g, event.entity); flashes.push({at: clock(), text: `+${event.points}`, x: p.x}); burst(p.x, p.y - 10, ['#fff', '#ffe66b'], 6, 160); sound('dodge', .95 + Math.random() * .1); }
        break;
      case 'wallEnd': flashes.push({at: clock(), text: `Mur +${event.points}`, x: width / 2}); if (event.trail) { flash(`Traînée parfaite : ${event.trail} pièces !`); sound('power', 1.1); } break;
      case 'wallLeap': flashes.push({at: clock(), text: `Saut de mur +${event.points}`, x: width / 2}); sound('wall', 1 + .06 * Math.min(6, event.chain - 1));
        shakeFor('strike'); break;
      case 'fall': flash('Oh non, le vide !'); sound('bump', .7); break;
      case 'saved': flash('Ouf, de justesse !'); break;
      // Out over the void in a jump: back onto the road before landing!
      case 'overVoid': flash('Au-dessus du vide : reviens sur la piste !', false, true); sound('jump', .8); break;
      // The shock wave: a ring and a sound only, no slow motion and no shake (it must not slow the run down).
      case 'shockwave': shock = clock(); flash('Onde de choc !'); sound('shock'); break;
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
      case 'blocked':
        if (!event.side) { sound('bump', .8); flash('Trop haut : monte les marches !'); break; }
        // Against a wall she cannot run on: a little bounce off it, towards it then back.
        sound('bump', .6); laneSpeed += (event.side === 'left' ? -1 : 1) * 3.2;
        if (!saidBlocked) { saidBlocked = true; flash('Pas sur la pierre ni la barrière : cours sur la terre et l’herbe !'); }
        break;
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
    // Painted: the Dragon holding Benny (one picture), its middle at `centre`, dropping in from above.
    const painted = art.dragon.ready, side = Math.min(width * .95, unit * 6.2), centre = ground + unit * .4 - (1 - land) * height * .5 - side / 2;
    const dx = painted ? cx - unit * .5 : cx + unit * 1.4, dy = (painted ? ground - unit * 2.1 : ground - unit * .7) - (1 - land) * height * .5;
    if (painted) {
      c.save(); c.translate(cx, centre + side / 2); c.rotate(tug / unit * .08); paint(c, 'dragon', 'catch', 0, -side / 2, side); c.restore();
    } else {
    c.fillStyle = '#b58ad1';
    for (const dir of [-1, 1]) { c.beginPath(); c.moveTo(dx + dir * unit * .4, dy - unit * .2); c.lineTo(dx + dir * unit * 1.2, dy - unit * (.9 + .3 * Math.abs(Math.sin(t / 110)))); c.lineTo(dx + dir * unit * .2, dy + unit * .1); c.fill(); }
    c.fillStyle = '#9c2f3c'; c.beginPath(); c.ellipse(dx, dy, unit * .75, unit * .65, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(dx - unit * .25, dy - unit * .15, unit * .1, 0, Math.PI * 2); c.fill();
    }
    // Benny, on the left, pulling the other way.
    const bx = cx - unit * 1.4 + tug * .5, by = ground - unit * .5;
    const speaker = (who: 'dragon' | 'benny') => painted ? (who === 'dragon' ? {x: cx - side * .1, y: centre - side * .35} : {x: cx + side * .3, y: centre - side * .02}) : (who === 'dragon' ? {x: dx, y: dy} : {x: bx, y: by});
    if (!painted) { c.fillStyle = '#d99a5b'; c.beginPath(); c.ellipse(bx, by, unit * .55, unit * .6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7d6a5a'; c.fillRect(bx - unit * .3, by - unit * 1.05, unit * .14, unit * .5); c.fillRect(bx + unit * .12, by - unit * 1.05, unit * .14, unit * .5); }
    // The treasure bag between them, tugged one way then the other.
    const sx = cx + tug, sy = ground - unit * .45;
    if (!painted) {
    c.strokeStyle = '#6e4a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(bx + unit * .4, by); c.lineTo(sx, sy); c.lineTo(dx - unit * .6, dy + unit * .1); c.stroke();
    c.fillStyle = '#c79a4a'; c.beginPath(); c.ellipse(sx, sy, unit * .42, unit * .38, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f4c430'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(sx - unit * .2 + i * unit * .2, sy - unit * .38, unit * .09, 0, Math.PI * 2); c.fill(); }
    }
    // Puffs of smoke while they tug, then little hearts.
    for (let i = 0; i < 6; i++) {
      const k = ((t / 700 + i / 6) % 1), a = i * 1.7;
      if (t > 500 && t < 2600 && !painted) { c.globalAlpha = .5 * (1 - k); c.fillStyle = '#f2e6d8'; c.beginPath(); c.arc(sx + Math.cos(a) * unit * (.5 + k), sy - unit * .2 - k * unit, unit * (.15 + .2 * k), 0, Math.PI * 2); c.fill(); }
      if (t > 2400) { c.globalAlpha = Math.max(0, 1 - k); c.fillStyle = '#ff8fb1'; c.font = `${Math.round(unit * .4)}px system-ui`; c.textAlign = 'center'; c.fillText('♥', (painted ? cx + side * .28 : sx) + (i - 2.5) * unit * .4, (painted ? centre - side * .05 : sy) - unit * (.6 + k * 1.4)); }
    }
    c.globalAlpha = 1;
    // Speech bubbles.
    const said = SQUABBLE_LINES.filter(([at]) => t >= at).at(-1);
    if (said) {
      const [, who, text] = said, x = speaker(who).x, y = speaker(who).y - unit * 1.5;
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
    for (const line of [`${s.metres} m`, plural(s.coins, 'pièce'), ...(s.hearts ? [plural(s.hearts, 'cœur')] : []), plural(s.pots, 'pot') + (s.goldPots ? ` (${plural(s.goldPots, 'doré')})` : ''), plural(s.foes, 'créature'), plural(s.wallRuns, 'mur'), plural(s.leaps, 'bond'), plural(s.dodges, 'esquive'), plural(s.challenges, 'défi'),
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
    game = startBennyRun(gameTime(), undefined, 3, withTutorial || best === 0); lanes = game.lanes; viewLanes = lanes; viewLane = game.lane; camX = 0; camUp = 0; landedAt = -1e9; wasUp = false; swing = null; pending = []; wallTilt = 0; laneSpeed = 0; rollFrom = -1e9; wasFlat = false; shock = null; cleared.clear(); flashes = []; bits = []; rings = []; streaks = []; coinRun = 0; shake = null; hurtAt = null; running = true; card.hidden = true; lastDrawAt = clock();
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

  // Gestures, like arrows: one finger down is one move at most (owner: « un glissement = un déplacement, on ne doit pas pouvoir
  // jouer en laissant le doigt enfoncé »). The move fires as soon as the finger has moved far enough; after that, nothing more
  // counts until the finger is lifted, turns included.
  let touch: {x: number; y: number; id: number; moved: boolean} | null = null;
  const way = (dx: number, dy: number): RunInput => Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  canvas.addEventListener('pointerdown', event => {
    // A tap skips the end scene.
    if (ending) { event.preventDefault(); const done = ending.done; ending = null; done(); return; }
    event.preventDefault(); touch = {x: event.clientX, y: event.clientY, id: event.pointerId, moved: false}; }, {signal: abort.signal});
  canvas.addEventListener('pointermove', event => {
    if (!touch || touch.id !== event.pointerId || touch.moved) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y, far = Math.max(Math.abs(dx), Math.abs(dy));
    if (far < SWIPE) return;
    touch.moved = true; input(way(dx, dy));
  }, {signal: abort.signal});
  canvas.addEventListener('pointerup', event => {
    // A short flick lifted before reaching the swipe distance still counts.
    if (touch && touch.id === event.pointerId && !touch.moved) {
      const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= FLICK) input(way(dx, dy));
    }
    touch = null;
  }, {signal: abort.signal});
  canvas.addEventListener('pointercancel', () => { touch = null; }, {signal: abort.signal});
  $<HTMLButtonElement>('[data-benny-run-exit]').addEventListener('click', () => close(), {signal: abort.signal});
  $<HTMLButtonElement>('[data-benny-run-pause]').addEventListener('click', () => pause(), {signal: abort.signal});
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); }, {signal: abort.signal});
  // The control centre or a call over the game (the page stays visible but loses the focus): paused too.
  window.addEventListener('blur', () => pause(), {signal: abort.signal}); window.addEventListener('pagehide', () => pause(), {signal: abort.signal});
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
      layer.hidden = false; window.dispatchEvent(new CustomEvent(FULLSCREEN_ACTIVITY_EVENT, {detail: true})); loadArt();
      intro(); orientation(); $<HTMLButtonElement>('[data-benny-run-start]').focus();
    },
    close, input,
    dispose() { close(); abort.abort(); layer.remove(); },
  };
}
