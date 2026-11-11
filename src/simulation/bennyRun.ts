/**
 * « Cours cours Benny ! » (owner, 11 November 2026): Benny has pinched some of the Lapine Dragon's treasure and runs away down an
 * endless road of three lanes, seen from behind, that keeps speeding up. Only the Dragon chases her, flying behind: she shows at the
 * start and after a bump. Original game: the owner borrowed only gameplay ideas from lane runners (running on walls, breaking things).
 *
 * The owner's controls: swipe up to jump (from a wall, the jump starts at the wall's height); swipe down to roll (« une roulade »), or to charge the ground when already in the air; swipe sideways to
 * change lanes, or to run on the wall from an edge lane (most walls, not all), from the ground or in the middle of a jump. Off the
 * wall: a jump, a swipe away from the wall, or a ground charge (owner, 11 November 2026). A power lies on the road and works as soon as Benny runs
 * over it (owner, 11 November 2026: « qu'ils soient utilisés dès que l'on va dessus, pas en cliquant »). Benny holds a wand in
 * her mouth (a light wooden stick with a rainbow ribbon): she strikes a pot or a creature of the lair when she changes lanes towards
 * it (owner: « elle frappe les ennemis si elle change de voie vers un ennemi. Sinon elle prend un coup »), when she slides into it
 * (« si on glisse ça attaque l'ennemi »), or when she charges the ground on it. A creature she passes without striking it, in her
 * lane or the next one, strikes back: a bump (« quand on passe à côté d'un ennemi sans l'attaquer il doit nous attaquer »); only
 * on a wall or flying is she out of its reach. A ground charge from high up (from a wall for now; « plus tard plus de verticalité »)
 * sends a shock wave around her that strikes everything near, in every lane. When a lane change strikes a creature while another waits
 * in the lane on her other side, the wand spins and strikes both at once (owner: « quand il y a deux ennemis sur des voies à droite
 * ou à gauche, ça attaque les deux en même temps »). A little flying monster keeps to Benny's height, so that she can always strike it
 * by swiping towards it (sideways, up, or with a slide); it is the one creature that reaches her on a wall. A pot met straight on just
 * breaks, for no points and no bump (our decision). The road has three lanes for now; the rules take any number (owner: zones of up
 * to 5 lanes later).
 * First bump: Benny stumbles and the Dragon swoops in; a second bump within `dragonMs` and she is caught (the run ends); otherwise
 * the Dragon flies off again. The creatures are cosy, never hurt: a sleeping dragonnet wakes and flies off, a greedy chest snaps shut
 * and spits its coins, a mischievous ember goes out in a little heart of smoke. Score: pots, creatures and wall runs, multiplied for a
 * while by combos. Rewards are for later: these rules only count.
 *
 * Pure rules: distances in metres along the road, lanes 0 (left) to `lanes - 1` (right), the clock in milliseconds, fixed steps and a seeded
 * draw, so a run replays the same from the same inputs.
 */
export const BENNY_RUN = {
  step: 1000 / 120,
  /** Speed in metres per second: at the start, at most, and the time to reach the most (a good run lasts about 3 minutes). */
  speedStart: 11, speedMax: 24, speedRampMs: 150_000,
  /** The speed climbs quickly at first, then more and more gently (an ease-out of this power). */
  speedEase: 1.6,
  /** A jump: its time and its height (m); a slide; a ground charge comes down in `poundMs` and breaks what is ahead within `poundReach`. */
  jumpMs: 650, jumpHeight: 1.4, slideMs: 700, poundMs: 120, poundReach: 4,
  /** Height above which Benny clears a low thing (a barrier, a pot). */
  clearHeight: .5,
  /** Benny's height when running on a wall; a ground charge from `shockHeight` m or more sends a shock wave from `shockBehind` m
   * behind her to `shockReach` m ahead, in every lane. */
  wallRunHeight: 1.8, shockHeight: 1.6, shockBehind: 1.5, shockReach: 6,
  /** A wall run lasts `wallMs` at most; walls come in segments of `wallSegment` m, `wallRunnable` of them runnable. */
  wallMs: 2600, wallSegment: 36, wallRunnable: .7,
  /** A strike reaches the nearest pot or creature from `-hitHalf` m to `strikeReach` m plus `strikeLead` s of running ahead: the
   * faster Benny runs, the farther her wand reaches, so that the time to react stays fair (about 0.4 s at any speed). */
  strikeReach: 4, strikeLead: .32, hitHalf: .6,
  /** A creature strikes back only if Benny ran beside it while it was within the wand's reach and still this far ahead, in metres or
   * in time at the present speed (she had time to strike it). */
  besideFrom: 1.5, besideMs: 200,
  /** A ground charge ends in a roll this long (ms), so that a swipe down always gets Benny low. */
  poundRollMs: 450,
  /** A beam met this long (ms) after a roll has ended still passes over her: the roll does not stop a hair too early. */
  slideGraceMs: 150,
  /** A jump asked for just before landing is kept for `bufferMs` and done on landing. */
  bufferMs: 220,
  /** A bump: Benny slows for `stumbleMs`; the Dragon stays `dragonMs`; she also shows for `introMs` at the start. */
  stumbleMs: 900, stumbleSlow: .7, dragonMs: 10_000, introMs: 3000,
  /** Combo: strikes less than `comboMs` apart; the multiplier grows by one every `comboStep` strikes, up to `comboMax`. */
  comboMs: 2500, comboStep: 3, comboMax: 5,
  points: {pot: 10, foe: 25, wallRun: 50, wallLeap: 25, dodge: 5},
  /** Gaps in the road: short ones (m) to jump, long ones to cross on the walls, leaping from one wall to the other. */
  holeShort: [3.5, 5], holeLong: [14, 34],
  /** A pot struck flies on along its lane, this much faster than Benny (m/s) and this far (m), and knocks over all it meets. */
  throwSpeed: 18, throwRange: 30,
  /** Coins a pot spills. */
  potCoins: 3,
  /** The setting changes at random every 40 to 55 s. */
  settingMs: [40_000, 55_000],
  /** A new setting starts this far ahead (m): it comes into sight and Benny runs into it. */
  settingAhead: 80,
  /** Short challenges during the run, one after the other, in this order: the first after `challengeFirstMs`, the next
   * `challengeGapMs` after one is done. Each one done is worth `challengePoints` times its rank (at most `challengePointsMax`). */
  challengeOrder: ['pots', 'coins', 'foes', 'walls', 'combo'] as const, challengeFirstMs: 5000, challengeGapMs: 4000,
  challengePoints: 100, challengePointsMax: 500,
  /** Things are laid out to `spawnAhead` m ahead, the first at `firstAt` m, then every `gapStart` m down to `gapMin` m. */
  spawnAhead: 90, firstAt: 30, gapStart: 22, gapMin: 11,
  /** Share of coin lines carrying a power, and how long each power lasts once picked up (the bubble lasts until a bump, at most this). */
  powerChance: .25, powers: {magnet: 8000, bubble: 20_000, double: 10_000, flight: 6000},
  /** Share of the creatures that are little flying monsters, once the run is `flyerFrom` into its speed ramp. */
  flyerShare: .3, flyerFrom: .15,
  /** A mischievous ember hops to a neighbouring lane every `emberHopMs`, but only while farther than `emberStill` m. */
  emberHopMs: 1400, emberStill: 14,
  /** A run never pays: this only bounds what a run can count. */
  maxScore: 9_999_999,
} as const;

export type RunSetting = 'grotte' | 'pont' | 'montagne';
export const RUN_SETTINGS: readonly RunSetting[] = ['grotte', 'pont', 'montagne'];
export type RunPower = keyof typeof BENNY_RUN.powers;
export const RUN_POWERS = Object.keys(BENNY_RUN.powers) as RunPower[];
export type RunFoe = 'dragonnet' | 'chest' | 'ember' | 'flyer';
export type RunKind = 'coin' | 'wallCoin' | 'power' | 'pot' | 'barrier' | 'beam' | 'pillar' | 'hole' | 'thrownPot' | RunFoe;
/** The creatures on the ground; the little flying monster (`flyer`) comes on top. */
export const RUN_FOES: readonly RunFoe[] = ['dragonnet', 'chest', 'ember'];
export type RunInput = 'left' | 'right' | 'up' | 'down';
export type Side = 'left' | 'right';
export type StrikeKind = 'lane' | 'spin' | 'slide' | 'jump' | 'pound' | 'shock' | 'throw';

/** A thing on the road. `lane` is 0 to `lanes - 1`; a wall coin's lane is -1 (left wall) or `lanes` (right wall). */
/** A thing on the road; `up` is how high a coin floats (a coin arc over a barrier), for the drawing only. */
export interface RunEntity {id: number; kind: RunKind; lane: number; z: number; power?: RunPower; hopAt?: number; up?: number; beside?: boolean; flyTo?: number}
export interface WallSegment {side: Side; from: number; to: number; runnable: boolean}
export type RunEvent =
  | {type: 'strike'; entity: RunEntity; points: number; combo: number; multiplier: number; by: StrikeKind}
  | {type: 'crash'; entity: RunEntity}
  | {type: 'coin'; entity: RunEntity; amount: number}
  /** Passed over or under unharmed; `points` for a barrier jumped or a beam rolled under. */
  | {type: 'cleared'; entity: RunEntity; points?: number}
  | {type: 'bump'; entity: RunEntity}
  | {type: 'shield'; entity: RunEntity}
  | {type: 'caught'; entity: RunEntity}
  | {type: 'power'; power: RunPower}
  | {type: 'wallStart'; side: Side}
  | {type: 'wallEnd'; side: Side; points: number}
  /** From one wall to the other, over a gap in the road. */
  | {type: 'wallLeap'; side: Side; points: number; combo: number}
  /** Into a gap: a bump, then she catches a wall or hops out. */
  | {type: 'fall'; onto: Side | null}
  | {type: 'pound'}
  | {type: 'shockwave'}
  | {type: 'setting'; setting: RunSetting}
  /** A challenge given (`points` absent) or done. */
  | {type: 'challenge'; kind: ChallengeKind; goal: number; points?: number}
  | {type: 'tutorial'; step: TutorialStep | null; again?: boolean};

export type ChallengeKind = 'pots' | 'coins' | 'foes' | 'walls' | 'combo';
export interface BennyRun {
  seed: number; startedAt: number; at: number;
  distance: number; speed: number;
  /** How many lanes the road has (3 for now), and Benny's. */
  lanes: number; lane: number; laneChangedAt: number;
  /** In the air between `airFrom` and `airUntil`, a jump starting `jumpFrom` m high; `pound` once the ground charge has started,
   * from `poundFrom` m high. */
  airFrom: number; airUntil: number; jumpFrom: number; pound: boolean; poundFrom: number;
  slideUntil: number;
  wall: {side: Side; until: number} | null;
  entities: RunEntity[]; nextId: number; nextSpawnZ: number;
  walls: WallSegment[]; wallsTo: Record<Side, number>;
  /** Gaps in the road ahead, from `from` to `to` (m). */
  holes: {from: number; to: number}[];
  setting: RunSetting; nextSettingAt: number;
  /** The next setting, from `z` on, while Benny runs towards it. */
  upcoming: {setting: RunSetting; z: number} | null;
  stumbleUntil: number; lastBumpAt: number | null;
  /** The power under way (a new one replaces it). */
  active: {power: RunPower; until: number} | null;
  score: number; coins: number; pots: number; foes: number; wallRuns: number;
  combo: number; comboUntil: number; bestCombo: number;
  /** The challenge under way (`count` of `goal`, counted from `from`), how many are done, and when the next one comes. */
  challenge: {kind: ChallengeKind; goal: number; from: number; count: number} | null; challengesDone: number; nextChallengeAt: number;
  over: boolean;
  /** What happened since the display last took them (`takeRunEvents`). */
  events: RunEvent[];
  /** A jump asked for in the air, done on landing if it is still fresh. */
  queuedJumpUntil: number;
  /** Where the speed ramp counts from (it waits during the tutorial). */
  paceFrom: number;
  /** The tutorial of the first run: the present step, and the things placed for it. */
  tutorial: {step: number; ids: number[]; tries: number; struck: number} | null;
}

/**
 * The tutorial woven into the first seconds of the first run (no record yet), or asked for again: one gesture at a time, each
 * with one thing on the road and a line of advice; a step missed comes back. Meanwhile the road is otherwise empty, the speed
 * stays at its start and a bump only makes Benny stumble (the Dragon does not catch her).
 */
export type TutorialStep = 'pot' | 'jump' | 'roll' | 'front' | 'flyer' | 'wall';
export const TUTORIAL: readonly TutorialStep[] = ['pot', 'jump', 'roll', 'front', 'flyer', 'wall'];
/** How far ahead each step's thing is placed, and how far the road stays clear after the tutorial. */
const TUTORIAL_AHEAD = 30;
export const tutorialStep = (g: BennyRun): TutorialStep | null => g.tutorial ? TUTORIAL[g.tutorial.step] ?? null : null;
function placeTutorial(g: BennyRun): void {
  const t = g.tutorial!, step = TUTORIAL[t.step], z = g.distance + TUTORIAL_AHEAD, all = laneList(g);
  const side = g.lane > 0 ? g.lane - 1 : g.lane + 1;
  const placed: RunEntity[] = [];
  switch (step) {
    case 'pot': placed.push(add(g, 'pot', side, z)); break;
    case 'jump': for (const l of all) placed.push(add(g, 'barrier', l, z)); break;
    case 'roll': for (const l of all) placed.push(add(g, 'beam', l, z)); break;
    case 'front': placed.push(add(g, 'chest', g.lane, z)); break;
    case 'flyer': placed.push(add(g, 'flyer', side, z)); break;
    case 'wall': {
      // The nearer wall, made runnable all along the way to the pillars.
      const wallSide: Side = g.lane < g.lanes / 2 ? 'left' : 'right';
      for (const w of g.walls) if (w.side === wallSide && w.to > g.distance && w.from < z + 10) w.runnable = true;
      // Nearer than the other steps: climbing as soon as the advice shows, the wall run still lasts past the pillars.
      const pz = z - 8;
      for (const l of all) placed.push(add(g, 'pillar', l, pz));
      for (let i = 0; i < 4; i++) add(g, 'wallCoin', wallLane(g, wallSide), pz - 9 + i * 3);
      break;
    }
  }
  t.ids = placed.map(e => e.id); t.struck = g.pots + g.foes;
}
/** After a tick: a step passed moves on, a step missed is laid out again. */
function followTutorial(g: BennyRun, events: RunEvent[]): void {
  const t = g.tutorial; if (!t) return;
  const step = TUTORIAL[t.step], mine = (e: RunEntity) => t.ids.includes(e.id);
  const hurt = events.some(ev => (ev.type === 'bump' || ev.type === 'crash') && mine(ev.entity));
  const behind = g.entities.filter(mine).every(e => e.z < g.distance - 1);
  // The wall step is passed once the pillars are behind her without a bump (climbing too early lets the wall run end before them).
  // A strike may come from a swipe, between two ticks: it shows as one more pot or creature struck.
  const passed = !hurt && (step === 'wall' ? behind : (step === 'jump' || step === 'roll') ? events.some(ev => ev.type === 'cleared' && mine(ev.entity)) :
    g.pots + g.foes > t.struck && !g.entities.some(mine));
  const missed = !passed && (hurt || behind);
  if (passed) {
    g.entities = g.entities.filter(e => !mine(e) || e.kind === 'pillar'); t.step++; t.tries = 0;
    if (t.step >= TUTORIAL.length) { g.tutorial = null; g.nextSpawnZ = g.distance + TUTORIAL_AHEAD; g.events.push({type: 'tutorial', step: null}); return; }
    g.events.push({type: 'tutorial', step: TUTORIAL[t.step]}); placeTutorial(g);
  } else if (missed) {
    g.entities = g.entities.filter(e => !mine(e)); t.tries++;
    g.events.push({type: 'tutorial', step, again: true}); placeTutorial(g);
  }
}

const C = BENNY_RUN;
const random = (g: BennyRun) => { g.seed = (g.seed + 0x6D2B79F5) >>> 0; let t = g.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = <T>(g: BennyRun, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(random(g) * list.length))];

export function startBennyRun(now: number, seed = Math.floor(Math.random() * 2147483647), lanes = 3, tutorial = false): BennyRun {
  const g: BennyRun = {
    seed: (seed >>> 0) || 1, startedAt: now, at: now, distance: 0, speed: C.speedStart, lanes, lane: Math.floor(lanes / 2), laneChangedAt: -Infinity,
    airFrom: 0, airUntil: 0, jumpFrom: 0, pound: false, poundFrom: 0, slideUntil: 0, wall: null,
    entities: [], nextId: 1, nextSpawnZ: C.firstAt, walls: [], wallsTo: {left: 0, right: 0}, holes: [],
    setting: 'grotte', nextSettingAt: 0, upcoming: null, stumbleUntil: 0, lastBumpAt: null,
    active: null, score: 0, coins: 0, pots: 0, foes: 0, wallRuns: 0, combo: 0, comboUntil: 0, bestCombo: 0,
    challenge: null, challengesDone: 0, nextChallengeAt: now + C.challengeFirstMs,
    over: false, events: [], queuedJumpUntil: 0, paceFrom: now, tutorial: tutorial ? {step: 0, ids: [], tries: 0, struck: 0} : null,
  };
  g.nextSettingAt = now + settingDelay(g);
  layWalls(g);
  if (g.tutorial) { g.nextSpawnZ = Infinity; placeTutorial(g); g.events.push({type: 'tutorial', step: TUTORIAL[0]}); } else spawn(g);
  return g;
}

/** The setting at `z` (m along the road): the present one, or the next one past its start. */
export const settingAt = (g: BennyRun, z: number): RunSetting => g.upcoming && z >= g.upcoming.z ? g.upcoming.setting : g.setting;
const settingDelay = (g: BennyRun) => C.settingMs[0] + random(g) * (C.settingMs[1] - C.settingMs[0]);
/** How far into the speed ramp the run is, from 0 to 1. */
export const runDifficulty = (g: BennyRun) => Math.min(1, Math.max(0, g.at - g.paceFrom) / C.speedRampMs);
export const powerActive = (g: BennyRun, power: RunPower) => g.active?.power === power && g.at < g.active.until;
export const inAir = (g: BennyRun) => g.at < g.airUntil;
export const sliding = (g: BennyRun) => g.at < g.slideUntil && !inAir(g);
/** Benny's height above the road (m): a jump's arc, a quick drop when charging, high up while flying. */
export function runHeight(g: BennyRun): number {
  if (powerActive(g, 'flight')) return 3;
  if (!inAir(g)) return 0;
  const p = (g.at - g.airFrom) / (g.airUntil - g.airFrom);
  return g.pound ? g.poundFrom * (1 - p) : g.jumpFrom * (1 - p) + 4 * C.jumpHeight * p * (1 - p);
}
/** The Dragon shows at the start and for `dragonMs` after a bump. */
export const dragonVisible = (g: BennyRun) => g.at - g.startedAt < C.introMs || dragonNear(g);
const dragonNear = (g: BennyRun) => g.lastBumpAt !== null && g.at - g.lastBumpAt < C.dragonMs;
export const comboMultiplier = (combo: number) => Math.min(C.comboMax, 1 + Math.floor(Math.max(0, combo - 1) / C.comboStep));
export const wallAt = (g: BennyRun, side: Side, z: number) => g.walls.find(w => w.side === side && w.from <= z && z < w.to);
export const runnableAt = (g: BennyRun, side: Side, z: number) => !!wallAt(g, side, z)?.runnable;

function layWalls(g: BennyRun): void {
  for (const side of ['left', 'right'] as const) while (g.wallsTo[side] < g.distance + C.spawnAhead + C.wallSegment * 2) {
    const from = g.wallsTo[side];
    g.walls.push({side, from, to: from + C.wallSegment, runnable: from < C.firstAt + C.wallSegment || random(g) < C.wallRunnable});
    g.wallsTo[side] = from + C.wallSegment;
  }
  g.walls = g.walls.filter(w => w.to > g.distance - 10);
}

const add = (g: BennyRun, kind: RunKind, lane: number, z: number, extra: Partial<RunEntity> = {}) => {
  const e: RunEntity = {id: g.nextId++, kind, lane, z, ...extra};
  if (kind === 'ember') e.hopAt = g.at + C.emberHopMs;
  g.entities.push(e); return e;
};
const laneList = (g: BennyRun) => Array.from({length: g.lanes}, (_, i) => i);
/** The lane number of a wall: -1 on the left, `lanes` on the right. */
export const wallLane = (g: BennyRun, side: Side) => side === 'left' ? -1 : g.lanes;
/** Where Benny is across the road: her lane, or her wall's. */
const across = (g: BennyRun) => g.wall ? wallLane(g, g.wall.side) : g.lane;
const others = (g: BennyRun, n: number) => { const l = laneList(g); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(random(g) * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, n); };

export type RunPattern = 'coins' | 'arc' | 'slalom' | 'pots' | 'gauntlet' | 'pair' | 'tunnel' | 'barriers' | 'pillars' | 'wall' | 'flyers' | 'breather' | 'hole' | 'skittles';
/**
 * The road is laid out in short patterns rather than one thing at a time, so that it has a rhythm: a slalom of pots to chain
 * lane strikes into a combo, a row of creatures one side then the other, a pair of creatures on both sides for the spinning
 * wand, a tunnel of beams to roll under, barriers with an arc of coins over them, pillars with a way through, a stretch of
 * wall to run past three pillars, flying monsters, and breathers of coins. Each pattern leaves Benny a way through; the
 * patterns come more often and harder as the run speeds up. `weights` gives each pattern's share at the start and at the end.
 */
const PATTERNS: Record<RunPattern, [number, number]> = {
  coins: [4, 1.5], arc: [2, 2], slalom: [3, 3], pots: [3, 1.5], gauntlet: [1.5, 3.5], pair: [.5, 2.5], tunnel: [1, 2], barriers: [1, 2],
  pillars: [1.5, 2.5], wall: [0, 2], flyers: [0, 2.5], breather: [2, .8], hole: [0, 2.2], skittles: [1.5, 2],
};
function choosePattern(g: BennyRun, z: number): RunPattern {
  const d = runDifficulty(g), list = (Object.keys(PATTERNS) as RunPattern[]).filter(p => (p !== 'flyers' || d >= C.flyerFrom) && (p !== 'pair' || d >= .2) && (p !== 'hole' || d >= .08) &&
    (p !== 'wall' || (d > .25 && wallSide(g, z))));
  const weight = (p: RunPattern) => PATTERNS[p][0] + (PATTERNS[p][1] - PATTERNS[p][0]) * d;
  let roll = random(g) * list.reduce((n, p) => n + weight(p), 0);
  for (const p of list) { roll -= weight(p); if (roll < 0) return p; }
  return list[list.length - 1];
}
/** A side whose wall can be run on from 25 m before `z` to 5 m after: the way past three pillars. */
const wallSide = (g: BennyRun, z: number) => (['left', 'right'] as const).find(s => runnableAt(g, s, z - 25) && runnableAt(g, s, z) && runnableAt(g, s, z + 5));
/** Lays out one pattern from `z` and returns where it ends. */
function layPattern(g: BennyRun, pattern: RunPattern, z: number): number {
  const d = runDifficulty(g), all = laneList(g), any = () => pick(g, all), neighbour = (lane: number) => pick(g, all.filter(l => Math.abs(l - lane) === 1));
  const creature = () => d >= C.flyerFrom && random(g) < C.flyerShare * .6 ? 'flyer' as const : pick(g, RUN_FOES);
  const step = 7 + 3 * (1 - d);
  switch (pattern) {
    case 'coins': {
      const side = pick(g, ['left', 'right'] as const);
      if (random(g) < .3 && runnableAt(g, side, z) && runnableAt(g, side, z + 10)) { for (let i = 0; i < 6; i++) add(g, 'wallCoin', wallLane(g, side), z + i * 2); return z + 10; }
      // A line that drifts to the next lane halfway, sometimes with a power in the middle.
      const lane = any(), next = random(g) < .5 ? neighbour(lane) : lane, power = random(g) < C.powerChance ? pick(g, RUN_POWERS) : null;
      for (let i = 0; i < 6; i++) if (power && i === 2) add(g, 'power', lane, z + i * 2, {power}); else add(g, 'coin', i < 3 ? lane : next, z + i * 2);
      return z + 10;
    }
    case 'arc': {
      // A barrier with an arc of coins over it: jump through the coins.
      const lane = any(); add(g, 'barrier', lane, z + 6);
      for (let i = 0; i < 5; i++) add(g, 'coin', lane, z + 2 + i * 2, {up: .5 + Math.sin(Math.PI * i / 4) * 1.3});
      for (const other of all.filter(l => l !== lane)) if (random(g) < .5 + .4 * d) add(g, 'barrier', other, z + 6);
      return z + 10;
    }
    case 'slalom': {
      // Pots one lane then the next: each lane change strikes one, and the combo grows.
      let lane = any(); const count = 3 + Math.round(2 * d);
      // Coins along the way: after striking a pot Benny runs in its lane until the next one.
      for (let i = 0; i < count; i++) { add(g, 'pot', lane, z + i * step); if (i < count - 1) for (const k of [1, 2]) add(g, 'coin', lane, z + i * step + k * step / 3); lane = neighbour(lane); }
      return z + (count - 1) * step;
    }
    case 'pots': { for (const lane of others(g, 1 + (random(g) < .5 ? 1 : 0))) add(g, 'pot', lane, z); return z; }
    case 'gauntlet': {
      // Creatures one side then the other: strike each with a lane change (or roll into it).
      let lane = any(); const count = 2 + Math.round(2 * d);
      for (let i = 0; i < count; i++) { add(g, i === count - 1 ? creature() : pick(g, RUN_FOES), lane, z + i * (step + 2)); lane = neighbour(lane); }
      return z + (count - 1) * (step + 2);
    }
    case 'pair': {
      // A creature on each side of the middle lane: the spinning wand strikes both. A coin in the middle draws Benny there.
      const middle = Math.floor(g.lanes / 2); add(g, 'coin', middle, z - 4); add(g, 'coin', middle, z - 2);
      // Creatures that stay put (an ember would hop into the middle lane).
      const still = ['dragonnet', 'chest'] as const; add(g, pick(g, still), middle - 1, z + 2); add(g, pick(g, still), middle + 1, z + 2);
      return z + 2;
    }
    case 'tunnel': {
      // Beams across the road: roll under them, through a line of coins.
      const count = 1 + Math.round(random(g) * (1 + d)), lane = any();
      for (let i = 0; i < count; i++) { for (const l of all) add(g, 'beam', l, z + i * 5); add(g, 'coin', lane, z + i * 5 + 2.5); }
      return z + (count - 1) * 5;
    }
    case 'barriers': {
      const count = Math.min(g.lanes, 1 + Math.floor(random(g) * (2 + d * 1.5)));
      for (const lane of others(g, count)) add(g, 'barrier', lane, z);
      if (count === g.lanes) for (let i = 0; i < 3; i++) add(g, 'coin', any(), z - 2 + i * 2, {up: 1.4});
      return z;
    }
    case 'pillars': {
      // Pillars with a way through, where a pot or a creature may wait.
      const free = any();
      for (const lane of all) if (lane !== free && (Math.abs(lane - free) === 1 || random(g) < .5)) add(g, 'pillar', lane, z);
      if (random(g) < .3 + .4 * d) add(g, random(g) < .5 ? 'pot' : pick(g, RUN_FOES), free, z + 8);
      return z + 8;
    }
    case 'wall': {
      // Three pillars side by side: the way on is up the runnable wall, along its coins.
      const side = wallSide(g, z)!;
      // Both walls made runnable around the row, so the nearer wall is always a way on, whatever lane Benny comes from.
      for (const w of g.walls) if (w.to > z - 25 && w.from <= z + 5) w.runnable = true;
      for (const lane of all) add(g, 'pillar', lane, z);
      for (let i = 0; i < 4; i++) add(g, 'wallCoin', wallLane(g, side), z - 6 + i * 3);
      return z + 4;
    }
    case 'flyers': {
      // Flying monsters keep to Benny's height: swipe towards them.
      const count = 1 + Math.round(d), lane = any();
      for (let i = 0; i < count; i++) add(g, 'flyer', i % 2 ? neighbour(lane) : lane, z + i * (step + 3));
      return z + (count - 1) * (step + 3);
    }
    case 'breather': { const lane = any(); for (let i = 0; i < 4; i++) add(g, 'coin', lane, z + i * 2); return z + 6; }
    case 'skittles': {
      // A pot with creatures (or more pots) lined up behind it in the same lane: strike the pot and it bowls them over.
      const lane = any(), count = 2 + (random(g) < .3 + .4 * d ? 1 : 0);
      add(g, 'pot', lane, z);
      for (let i = 1; i <= count; i++) add(g, random(g) < .6 ? pick(g, ['dragonnet', 'chest'] as const) : 'pot', lane, z + 6 + i * 4);
      return z + 6 + count * 4;
    }
    case 'hole': {
      // A gap across the road. A short one is jumped (an arc of coins over it); a long one has both walls runnable over it, with
      // coins on one wall then the other, to leap across for.
      const long = random(g) < .35 + .45 * d, [min, max] = long ? C.holeLong : C.holeShort, len = min + random(g) * (max - min) * (long ? .4 + .6 * d : 1);
      // A run-up of clear road first (0.4 s), so that a gap never starts right where the jump over the last barrier lands.
      z += g.speed * .4;
      g.holes.push({from: z, to: z + len});
      if (long) {
        for (const w of g.walls) if (w.to > z - 25 && w.from <= z + len + 5) w.runnable = true;
        let side = pick(g, ['left', 'right'] as const);
        for (let at = z - 4; at < z + len; at += 3) { add(g, 'wallCoin', wallLane(g, side), at); if (at > z + 4 && (at - z) % 9 < 3) side = side === 'left' ? 'right' : 'left'; }
      } else { const lane = any(); for (let i = 0; i < 4; i++) add(g, 'coin', lane, z - 1 + i * (len + 2) / 3, {up: .6 + Math.sin(Math.PI * i / 3) * 1.1}); }
      return z + len;
    }
  }
}
/** Lays out what comes next on the road, from the seeded draw: patterns, then a gap that shrinks as the run speeds up. */
function spawn(g: BennyRun): void {
  layWalls(g);
  while (g.nextSpawnZ < g.distance + C.spawnAhead) {
    const z = g.nextSpawnZ, end = layPattern(g, choosePattern(g, z), z), d = runDifficulty(g);
    const gap = C.gapStart - (C.gapStart - C.gapMin) * d;
    g.nextSpawnZ = end + gap * (.85 + random(g) * .3);
  }
}

/** The gap Benny's feet are over (or the one at `z`), if any. */
export const holeAt = (g: BennyRun, z = g.distance) => g.holes.find(h => h.from <= z && z < h.to);
/** Into a gap: a bump; then she catches the nearer runnable wall, or (a short gap) hops out. */
function fall(g: BennyRun): void {
  const hole = holeAt(g)!, near: Side[] = g.lane < (g.lanes - 1) / 2 ? ['left', 'right'] : ['right', 'left'];
  const onto = near.find(side => runnableAt(g, side, g.distance) && runnableAt(g, side, hole.to)) ?? null;
  g.slideUntil = 0; g.pound = false;
  bump(g, {id: g.nextId++, kind: 'hole', lane: g.lane, z: g.distance});
  if (g.over) return;
  if (onto) { g.wall = {side: onto, until: g.at + C.wallMs}; g.airUntil = 0; }
  else { g.jumpFrom = 0; g.airFrom = g.at; g.airUntil = g.at + Math.max(C.jumpMs, (hole.to - g.distance) / Math.max(1, g.speed * C.stumbleSlow) * 1000 + 120); }
  g.events.push({type: 'fall', onto});
}
/** From one wall to the other over a gap: the run on the wall goes on, and it counts in the combo. */
function leap(g: BennyRun): void {
  const side: Side = g.wall!.side === 'left' ? 'right' : 'left';
  if (!runnableAt(g, side, g.distance)) return;
  g.wall = {side, until: g.at + C.wallMs};
  g.combo = g.at <= g.comboUntil ? g.combo + 1 : 1; g.comboUntil = g.at + C.comboMs; g.bestCombo = Math.max(g.bestCombo, g.combo);
  const points = C.points.wallLeap * comboMultiplier(g.combo); g.score = Math.min(C.maxScore, g.score + points);
  g.events.push({type: 'wallLeap', side, points, combo: g.combo});
}
const isFoe = (e: RunEntity) => e.kind === 'flyer' || RUN_FOES.includes(e.kind as RunFoe);
const strikable = (e: RunEntity) => e.kind === 'pot' || isFoe(e);
/** The nearest pot or creature (or only creature) in `lane`, from just behind Benny to `reach` m ahead. */
const nearest = (g: BennyRun, lane: number, reach: number, which: (e: RunEntity) => boolean = strikable) => g.entities
  .filter(e => e.lane === lane && which(e) && e.z - g.distance >= -C.hitHalf && e.z - g.distance <= reach).sort((a, b) => a.z - b.z)[0];
/** How far ahead the wand reaches at the present speed. */
export const reach = (g: BennyRun) => C.strikeReach + C.strikeLead * g.speed;
function strike(g: BennyRun, e: RunEntity, by: StrikeKind): void {
  g.entities = g.entities.filter(o => o !== e);
  g.combo = g.at <= g.comboUntil ? g.combo + 1 : 1; g.comboUntil = g.at + C.comboMs; g.bestCombo = Math.max(g.bestCombo, g.combo);
  const multiplier = comboMultiplier(g.combo), points = (e.kind === 'pot' ? C.points.pot : C.points.foe) * multiplier;
  g.score = Math.min(C.maxScore, g.score + points);
  if (e.kind === 'pot') {
    g.pots++;
    gainCoins(g, e, C.potCoins);
  } else { g.foes++; gainCoins(g, e, 2); }
  g.events.push({type: 'strike', entity: e, points, combo: g.combo, multiplier, by});
  // A pot struck flies on along its lane (not one broken by a ground charge or its shock wave, nor one a flying pot knocks over).
  if (e.kind === 'pot' && by !== 'pound' && by !== 'shock' && by !== 'throw') add(g, 'thrownPot', e.lane, Math.max(e.z, g.distance + .5), {flyTo: Math.max(e.z, g.distance) + C.throwRange});
}
/** The flying pots: like a bowling ball, each knocks over every pot and creature it reaches in its lane, then breaks at the end of its run. */
function flyPots(g: BennyRun, dt: number): void {
  for (const t of g.entities.filter(e => e.kind === 'thrownPot')) {
    if (!g.entities.includes(t)) continue;
    const from = t.z; t.z += (g.speed + C.throwSpeed) * dt;
    for (const hit of g.entities.filter(e => e !== t && e.lane === t.lane && strikable(e) && e.z > from - .3 && e.z <= t.z + .5).sort((a, b) => a.z - b.z)) strike(g, hit, 'throw');
    if (t.z >= (t.flyTo ?? 0)) { g.entities = g.entities.filter(e => e !== t); g.events.push({type: 'crash', entity: t}); }
  }
}
function gainCoins(g: BennyRun, e: RunEntity, amount: number): void {
  const n = amount * (powerActive(g, 'double') ? 2 : 1); g.coins += n; g.events.push({type: 'coin', entity: e, amount: n});
}
function usePower(g: BennyRun, power: RunPower): void {
  g.active = {power, until: g.at + C.powers[power]};
  if (power === 'flight') { g.wall = null; g.airUntil = 0; g.pound = false; g.slideUntil = 0; }
  g.events.push({type: 'power', power});
}
function bump(g: BennyRun, e: RunEntity): void {
  g.entities = g.entities.filter(o => o !== e);
  if (powerActive(g, 'bubble')) { g.active = null; g.events.push({type: 'shield', entity: e}); return; }
  g.combo = 0; g.comboUntil = 0;
  // During the tutorial a bump only makes her stumble.
  if (g.tutorial) { g.stumbleUntil = g.at + C.stumbleMs; g.slideUntil = 0; g.events.push({type: 'bump', entity: e}); return; }
  if (dragonNear(g)) { g.over = true; g.events.push({type: 'caught', entity: e}); return; }
  g.lastBumpAt = g.at; g.stumbleUntil = g.at + C.stumbleMs; g.slideUntil = 0;
  g.events.push({type: 'bump', entity: e});
}
/** A ground charge starting now, from Benny's present height (or `from` m when leaving a wall): the higher, the longer the fall. */
function startPound(g: BennyRun, from = runHeight(g)): void {
  g.poundFrom = Math.max(from, .3); g.pound = true; g.airFrom = g.at; g.airUntil = g.at + C.poundMs * Math.max(1, Math.sqrt(g.poundFrom / C.jumpHeight)); g.slideUntil = 0;
}
function endWall(g: BennyRun): void {
  const side = g.wall!.side; g.wall = null; g.lane = side === 'left' ? 0 : g.lanes - 1; g.laneChangedAt = g.at;
  g.wallRuns++;
  g.combo = g.at <= g.comboUntil ? g.combo + 1 : 1; g.comboUntil = g.at + C.comboMs; g.bestCombo = Math.max(g.bestCombo, g.combo);
  const points = C.points.wallRun * comboMultiplier(g.combo); g.score = Math.min(C.maxScore, g.score + points);
  g.events.push({type: 'wallEnd', side, points});
}

/** What happens when a thing reaches Benny without having been struck. */
function meet(g: BennyRun, e: RunEntity): void {
  if (e.kind === 'wallCoin') {
    if (g.wall && wallLane(g, g.wall.side) === e.lane) { g.entities = g.entities.filter(o => o !== e); gainCoins(g, e, 1); }
    return;
  }
  if (e.kind === 'power') {
    // Picked up on the ground, in the air or flying, never from a wall; it works at once.
    if (e.lane === g.lane && !g.wall && e.power) { g.entities = g.entities.filter(o => o !== e); usePower(g, e.power); }
    return;
  }
  if (e.kind === 'coin') {
    if (g.wall) return;
    if (e.lane === g.lane || powerActive(g, 'magnet')) { g.entities = g.entities.filter(o => o !== e); gainCoins(g, e, 1); }
    return;
  }
  if (e.lane !== g.lane || g.wall || powerActive(g, 'flight')) return;
  // In the air at all (even just taking off or about to land) clears a barrier or a pot.
  const high = inAir(g) || runHeight(g) > C.clearHeight;
  switch (e.kind) {
    case 'pot':
      if (sliding(g)) { strike(g, e, 'slide'); return; }
      if (high) { g.events.push({type: 'cleared', entity: e}); return; }
      g.entities = g.entities.filter(o => o !== e); g.events.push({type: 'crash', entity: e}); return;
    case 'barrier': if (high) dodge(g, e); else bump(g, e); return;
    case 'beam': if (sliding(g) || (!inAir(g) && g.at < g.slideUntil + C.slideGraceMs)) dodge(g, e); else bump(g, e); return;
    // A creature: sliding into it strikes it; otherwise, even jumping over it, it strikes Benny as she passes.
    case 'dragonnet': case 'chest': case 'ember': case 'flyer': if (sliding(g)) strike(g, e, 'slide'); else bump(g, e); return;
    case 'pillar': bump(g, e); return;
  }
}

function tick(g: BennyRun): void {
  const dt = C.step / 1000, eventsBefore = g.events.length;
  if (g.tutorial) { g.paceFrom += C.step; g.nextSettingAt += C.step; g.nextChallengeAt += C.step; }
  if (g.active && g.at >= g.active.until) g.active = null;
  const base = C.speedStart + (C.speedMax - C.speedStart) * (1 - (1 - runDifficulty(g)) ** C.speedEase);
  g.speed = base * (g.at < g.stumbleUntil ? C.stumbleSlow : 1);
  const before = g.distance; g.distance += g.speed * dt;
  // A new setting is chosen ahead, then reached.
  if (g.at >= g.nextSettingAt && !g.upcoming) {
    g.upcoming = {setting: pick(g, RUN_SETTINGS.filter(s => s !== g.setting)), z: g.distance + C.settingAhead}; g.nextSettingAt = g.at + settingDelay(g);
  }
  if (g.upcoming && g.distance >= g.upcoming.z) { g.setting = g.upcoming.setting; g.upcoming = null; g.events.push({type: 'setting', setting: g.setting}); }
  // Landing: a ground charge breaks the pots and creatures just ahead in Benny's lane; from high up, a shock wave strikes all around.
  if (g.pound && !inAir(g)) {
    g.pound = false; g.events.push({type: 'pound'}); g.slideUntil = g.at + C.poundRollMs;
    if (g.poundFrom >= C.shockHeight) {
      g.events.push({type: 'shockwave'});
      for (const e of g.entities.filter(o => strikable(o) && o.z - g.distance >= -C.shockBehind && o.z - g.distance <= C.shockReach)) strike(g, e, 'shock');
    } else for (const e of g.entities.filter(o => o.lane === g.lane && strikable(o) && o.z - g.distance >= -C.hitHalf && o.z - g.distance <= C.poundReach)) strike(g, e, 'pound');
  }
  // Over a gap, the run on a wall does not run out.
  if (g.wall && ((g.at >= g.wall.until && !holeAt(g)) || !runnableAt(g, g.wall.side, g.distance))) endWall(g);
  if (!g.wall && !inAir(g) && !powerActive(g, 'flight') && holeAt(g)) fall(g);
  if (g.over) return;
  // A jump asked for just before landing.
  if (g.queuedJumpUntil && !inAir(g) && !g.wall) { const fresh = g.at <= g.queuedJumpUntil; g.queuedJumpUntil = 0; if (fresh) runInput(g, g.at, 'up'); }
  flyPots(g, dt);
  for (const e of g.entities) if (e.kind === 'ember' && e.hopAt !== undefined && g.at >= e.hopAt) {
    e.hopAt = g.at + C.emberHopMs;
    if (e.z - g.distance > C.emberStill) e.lane = pick(g, [e.lane - 1, e.lane + 1].filter(l => l >= 0 && l < g.lanes));
  }
  for (const e of [...g.entities]) {
    if (g.over) break;
    if (e.z - before > C.hitHalf - 1e-9 && e.z - g.distance <= C.hitHalf) meet(g, e);
  }
  // A creature in the next lane that Benny has just passed without striking it strikes her (not flying). On a wall, only a flying
  // monster reaches her, from the edge lane: it keeps to her height.
  for (const e of g.entities) if (isFoe(e) && Math.abs(e.lane - across(g)) === 1 && e.z - g.distance >= Math.max(C.besideFrom, g.speed * C.besideMs / 1000) && e.z - g.distance <= reach(g)) e.beside = true;
  for (const e of [...g.entities]) {
    if (g.over) break;
    if (isFoe(e) && e.beside && Math.abs(e.lane - across(g)) === 1 && (!g.wall || e.kind === 'flyer') && e.z - before > -C.hitHalf - 1e-9 && e.z - g.distance <= -C.hitHalf && !powerActive(g, 'flight')) bump(g, e);
  }
  if (g.tutorial) followTutorial(g, g.events.slice(eventsBefore)); else followChallenge(g);
  g.entities = g.entities.filter(e => e.z > g.distance - 5);
  g.holes = g.holes.filter(h => h.to > g.distance - 5);
  // The walls go on being laid during the tutorial; the rest of the road waits for its end.
  if (g.tutorial) layWalls(g); else spawn(g);
}

/** A challenge's goal, the `n`th one of the run (from 0): a little more each time. */
export function challengeGoal(kind: ChallengeKind, n: number): number {
  switch (kind) {
    case 'pots': return 6 + 3 * n;
    case 'coins': return 30 + 15 * n;
    case 'foes': return 3 + 2 * n;
    case 'walls': return 2 + Math.floor(n / 5);
    case 'combo': return Math.min(40, 8 + 4 * n);
  }
}
const challengeCounter = (g: BennyRun, kind: ChallengeKind) =>
  kind === 'pots' ? g.pots : kind === 'coins' ? g.coins : kind === 'foes' ? g.foes : kind === 'walls' ? g.wallRuns : 0;
function followChallenge(g: BennyRun): void {
  if (!g.challenge) {
    if (g.at < g.nextChallengeAt) return;
    const n = g.challengesDone, kind = C.challengeOrder[n % C.challengeOrder.length], goal = challengeGoal(kind, n);
    g.challenge = {kind, goal, from: challengeCounter(g, kind), count: 0}; g.events.push({type: 'challenge', kind, goal});
    return;
  }
  const c = g.challenge;
  c.count = Math.min(c.goal, c.kind === 'combo' ? Math.max(c.count, g.combo) : challengeCounter(g, c.kind) - c.from);
  if (c.count < c.goal) return;
  const points = Math.min(C.challengePointsMax, C.challengePoints * (g.challengesDone + 1));
  g.score += points; g.challengesDone++; g.challenge = null; g.nextChallengeAt = g.at + C.challengeGapMs;
  g.events.push({type: 'challenge', kind: c.kind, goal: c.goal, points});
}

/** A barrier jumped or a beam rolled under: a few points (not a strike: the combo neither grows nor breaks). */
function dodge(g: BennyRun, e: RunEntity): void {
  const points = C.points.dodge; g.score += points; g.events.push({type: 'cleared', entity: e, points});
}

export function advanceBennyRun(g: BennyRun, now: number): void {
  while (!g.over && g.at + C.step <= now) { g.at += C.step; tick(g); }
}

/** One of the player's gestures, at `now`. */
export function runInput(g: BennyRun, now: number, input: RunInput): void {
  advanceBennyRun(g, now);
  if (g.over) return;
  switch (input) {
    case 'left': case 'right': {
      const step = input === 'left' ? -1 : 1, side: Side = input;
      // Off the wall by swiping away from it, striking on the way down what waits in the edge lane.
      if (g.wall && holeAt(g)) { if (g.wall.side !== side) leap(g); return; }
      if (g.wall) { if (g.wall.side !== side) { endWall(g); const hit = nearest(g, g.lane, reach(g)); if (hit) strike(g, hit, 'lane'); } return; }
      const target = g.lane + step;
      if (target < 0 || target > g.lanes - 1) {
        if (runnableAt(g, side, g.distance) && !powerActive(g, 'flight')) {
          // From the ground or in the middle of a jump.
          g.wall = {side, until: g.at + C.wallMs}; g.airUntil = 0; g.pound = false; g.slideUntil = 0;
          g.events.push({type: 'wallStart', side});
        }
        return;
      }
      const from = g.lane; g.lane = target; g.laneChangedAt = g.at;
      // The wand: changing lanes towards a pot or a creature strikes it; with a creature on her other side as well, she spins and
      // strikes both at once.
      const hit = nearest(g, target, reach(g)), behind = hit ? nearest(g, from - step, reach(g), isFoe) : undefined;
      if (hit) strike(g, hit, 'lane');
      if (behind && isFoe(hit!)) strike(g, behind, 'spin');
      return;
    }
    case 'up':
      if (powerActive(g, 'flight')) return;
      // Over a gap, a jump from the wall is a leap to the other wall.
      if (g.wall && holeAt(g)) { leap(g); return; }
      // Too early, in the air: kept a moment and done on landing.
      if (inAir(g) && !g.wall) { g.queuedJumpUntil = g.at + C.bufferMs; return; }
      // A jump, also off a wall: then it starts at the wall's height, lasts a little longer, and she lands in the edge lane.
      { const from = g.wall ? C.wallRunHeight : 0; if (g.wall) endWall(g);
        g.jumpFrom = from; g.airFrom = g.at; g.airUntil = g.at + C.jumpMs * (1 + from / (2 * C.jumpHeight)); g.pound = false; g.slideUntil = 0; }
      // A jump towards a flying monster just ahead strikes it: it keeps to her height.
      { const flyer = nearest(g, g.lane, reach(g), e => e.kind === 'flyer'); if (flyer) strike(g, flyer, 'jump'); }
      return;
    case 'down': {
      if (powerActive(g, 'flight')) return;
      // Off a wall with a ground charge: from that height, a shock wave.
      if (g.wall && holeAt(g)) return;
      if (g.wall) { endWall(g); startPound(g, C.wallRunHeight); return; }
      if (inAir(g)) { if (!g.pound) startPound(g); return; }
      // A roll (the owner's « roulade »): it strikes with the wand what is just ahead in the lane, and anything met while rolling; it
      // passes under a beam.
      g.slideUntil = g.at + C.slideMs;
      const hit = nearest(g, g.lane, reach(g));
      if (hit) strike(g, hit, 'slide');
      return;
    }
  }
}

/** The events since the last call, for the display (sounds, sparks, the score popping). */
export function takeRunEvents(g: BennyRun): RunEvent[] { const e = g.events; g.events = []; return e; }

/** The longest distance a saved run may claim: an hour at full speed, far beyond any real run. */
export const BENNY_RUN_MAX_METRES = 24 * 3600;
export interface RunSummary {score: number; metres: number; coins: number; pots: number; foes: number; wallRuns: number; bestCombo: number; seconds: number; challenges: number}
export const runSummary = (g: BennyRun): RunSummary => ({score: g.score, metres: Math.floor(g.distance), coins: g.coins, pots: g.pots, foes: g.foes,
  wallRuns: g.wallRuns, bestCombo: g.bestCombo, seconds: Math.floor((g.at - g.startedAt) / 1000), challenges: g.challengesDone});
