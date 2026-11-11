/**
 * « Cours cours Benny ! » (owner, 11 November 2026): Benny has pinched some of the Lapine Dragon's treasure and runs away down an
 * endless road of three lanes, seen from behind, that keeps speeding up. Only the Dragon chases her, flying behind: she shows at the
 * start and after a bump. Original game: the owner borrowed only gameplay ideas from lane runners (running on walls, breaking things).
 *
 * The owner's controls: swipe up to jump; swipe down to slide, or to charge the ground when already in the air; swipe sideways to
 * change lanes, or to run on the wall from an edge lane (most walls, not all), from the ground or in the middle of a jump. Off the
 * wall: a jump, a swipe away from the wall, or a ground charge (owner, 11 November 2026). A power lies on the road and works as soon as Benny runs
 * over it (owner, 11 November 2026: « qu'ils soient utilisés dès que l'on va dessus, pas en cliquant »). Benny holds a wand in
 * her mouth (a light wooden stick with a rainbow ribbon): she strikes a pot or a creature of the lair when she changes lanes towards
 * it (owner: « elle frappe les ennemis si elle change de voie vers un ennemi. Sinon elle prend un coup »), when she slides into it
 * (« si on glisse ça attaque l'ennemi »), or when she charges the ground on it. A creature she passes without striking it, in her
 * lane or the next one, strikes back: a bump (« quand on passe à côté d'un ennemi sans l'attaquer il doit nous attaquer »); only
 * on a wall or flying is she out of its reach. A ground charge from high up (from a wall for now; « plus tard plus de verticalité »)
 * sends a shock wave around her that strikes everything near, in every lane. A pot met straight on just breaks, for no points and
 * no bump (our decision).
 * First bump: Benny stumbles and the Dragon swoops in; a second bump within `dragonMs` and she is caught (the run ends); otherwise
 * the Dragon flies off again. The creatures are cosy, never hurt: a sleeping dragonnet wakes and flies off, a greedy chest snaps shut
 * and spits its coins, a mischievous ember goes out in a little heart of smoke. Score: pots, creatures and wall runs, multiplied for a
 * while by combos. Rewards are for later: these rules only count.
 *
 * Pure rules: distances in metres along the road, lanes 0 (left) to 2 (right), the clock in milliseconds, fixed steps and a seeded
 * draw, so a run replays the same from the same inputs.
 */
export const BENNY_RUN = {
  step: 1000 / 120,
  /** Speed in metres per second: at the start, at most, and the time to reach the most (a good run lasts about 3 minutes). */
  speedStart: 10, speedMax: 24, speedRampMs: 150_000,
  /** A jump: its time and its height (m); a slide; a ground charge comes down in `poundMs` and breaks what is ahead within `poundReach`. */
  jumpMs: 650, jumpHeight: 1.4, slideMs: 700, poundMs: 120, poundReach: 4,
  /** Height above which Benny clears a low thing (a barrier, a pot). */
  clearHeight: .5,
  /** Benny's height when running on a wall; a ground charge from `shockHeight` m or more sends a shock wave from `shockBehind` m
   * behind her to `shockReach` m ahead, in every lane. */
  wallRunHeight: 1.8, shockHeight: 1.6, shockBehind: 1.5, shockReach: 6,
  /** A wall run lasts `wallMs` at most; walls come in segments of `wallSegment` m, `wallRunnable` of them runnable. */
  wallMs: 2600, wallSegment: 36, wallRunnable: .7,
  /** A lane change strikes the nearest pot or creature of the new lane from `-hitHalf` to `strikeReach` m ahead. */
  strikeReach: 7, hitHalf: .6,
  /** A bump: Benny slows for `stumbleMs`; the Dragon stays `dragonMs`; she also shows for `introMs` at the start. */
  stumbleMs: 900, stumbleSlow: .7, dragonMs: 10_000, introMs: 3000,
  /** Combo: strikes less than `comboMs` apart; the multiplier grows by one every `comboStep` strikes, up to `comboMax`. */
  comboMs: 2500, comboStep: 3, comboMax: 5,
  points: {pot: 10, foe: 25, wallRun: 50},
  /** Coins a pot spills. */
  potCoins: 3,
  /** The setting changes at random every 40 to 55 s. */
  settingMs: [40_000, 55_000],
  /** Things are laid out to `spawnAhead` m ahead, the first at `firstAt` m, then every `gapStart` m down to `gapMin` m. */
  spawnAhead: 90, firstAt: 30, gapStart: 22, gapMin: 11,
  /** Share of coin lines carrying a power, and how long each power lasts once picked up (the bubble lasts until a bump, at most this). */
  powerChance: .25, powers: {magnet: 8000, bubble: 20_000, double: 10_000, flight: 6000},
  /** A mischievous ember hops to a neighbouring lane every `emberHopMs`, but only while farther than `emberStill` m. */
  emberHopMs: 1400, emberStill: 14,
  /** A run never pays: this only bounds what a run can count. */
  maxScore: 9_999_999,
} as const;

export type RunSetting = 'grotte' | 'pont' | 'montagne';
export const RUN_SETTINGS: readonly RunSetting[] = ['grotte', 'pont', 'montagne'];
export type RunPower = keyof typeof BENNY_RUN.powers;
export const RUN_POWERS = Object.keys(BENNY_RUN.powers) as RunPower[];
export type RunFoe = 'dragonnet' | 'chest' | 'ember';
export type RunKind = 'coin' | 'wallCoin' | 'power' | 'pot' | 'barrier' | 'beam' | 'pillar' | RunFoe;
export const RUN_FOES: readonly RunFoe[] = ['dragonnet', 'chest', 'ember'];
export type RunInput = 'left' | 'right' | 'up' | 'down';
export type Side = 'left' | 'right';
export type StrikeKind = 'lane' | 'slide' | 'pound' | 'shock';

/** A thing on the road. `lane` is 0 to 2; a wall coin's lane is -1 (left wall) or 3 (right wall). */
export interface RunEntity {id: number; kind: RunKind; lane: number; z: number; power?: RunPower; hopAt?: number}
export interface WallSegment {side: Side; from: number; to: number; runnable: boolean}
export type RunEvent =
  | {type: 'strike'; entity: RunEntity; points: number; combo: number; multiplier: number; by: StrikeKind}
  | {type: 'crash'; entity: RunEntity}
  | {type: 'coin'; entity: RunEntity; amount: number}
  | {type: 'cleared'; entity: RunEntity}
  | {type: 'bump'; entity: RunEntity}
  | {type: 'shield'; entity: RunEntity}
  | {type: 'caught'; entity: RunEntity}
  | {type: 'power'; power: RunPower}
  | {type: 'wallStart'; side: Side}
  | {type: 'wallEnd'; side: Side; points: number}
  | {type: 'pound'}
  | {type: 'shockwave'}
  | {type: 'setting'; setting: RunSetting};

export interface BennyRun {
  seed: number; startedAt: number; at: number;
  distance: number; speed: number;
  lane: number; laneChangedAt: number;
  /** In the air between `airFrom` and `airUntil`; `pound` once the ground charge has started, from `poundFrom` m high. */
  airFrom: number; airUntil: number; pound: boolean; poundFrom: number;
  slideUntil: number;
  wall: {side: Side; until: number} | null;
  entities: RunEntity[]; nextId: number; nextSpawnZ: number;
  walls: WallSegment[]; wallsTo: Record<Side, number>;
  setting: RunSetting; nextSettingAt: number;
  stumbleUntil: number; lastBumpAt: number | null;
  /** The power under way (a new one replaces it). */
  active: {power: RunPower; until: number} | null;
  score: number; coins: number; pots: number; foes: number; wallRuns: number;
  combo: number; comboUntil: number; bestCombo: number;
  over: boolean;
  /** What happened since the display last took them (`takeRunEvents`). */
  events: RunEvent[];
}

const C = BENNY_RUN;
const random = (g: BennyRun) => { g.seed = (g.seed + 0x6D2B79F5) >>> 0; let t = g.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = <T>(g: BennyRun, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(random(g) * list.length))];

export function startBennyRun(now: number, seed = Math.floor(Math.random() * 2147483647)): BennyRun {
  const g: BennyRun = {
    seed: (seed >>> 0) || 1, startedAt: now, at: now, distance: 0, speed: C.speedStart, lane: 1, laneChangedAt: -Infinity,
    airFrom: 0, airUntil: 0, pound: false, poundFrom: 0, slideUntil: 0, wall: null,
    entities: [], nextId: 1, nextSpawnZ: C.firstAt, walls: [], wallsTo: {left: 0, right: 0},
    setting: 'grotte', nextSettingAt: 0, stumbleUntil: 0, lastBumpAt: null,
    active: null, score: 0, coins: 0, pots: 0, foes: 0, wallRuns: 0, combo: 0, comboUntil: 0, bestCombo: 0,
    over: false, events: [],
  };
  g.nextSettingAt = now + settingDelay(g);
  layWalls(g); spawn(g);
  return g;
}

const settingDelay = (g: BennyRun) => C.settingMs[0] + random(g) * (C.settingMs[1] - C.settingMs[0]);
/** How far into the speed ramp the run is, from 0 to 1. */
export const runDifficulty = (g: BennyRun) => Math.min(1, (g.at - g.startedAt) / C.speedRampMs);
export const powerActive = (g: BennyRun, power: RunPower) => g.active?.power === power && g.at < g.active.until;
export const inAir = (g: BennyRun) => g.at < g.airUntil;
export const sliding = (g: BennyRun) => g.at < g.slideUntil && !inAir(g);
/** Benny's height above the road (m): a jump's arc, a quick drop when charging, high up while flying. */
export function runHeight(g: BennyRun): number {
  if (powerActive(g, 'flight')) return 3;
  if (!inAir(g)) return 0;
  const p = (g.at - g.airFrom) / (g.airUntil - g.airFrom);
  return g.pound ? g.poundFrom * (1 - p) : 4 * C.jumpHeight * p * (1 - p);
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
const lanes = [0, 1, 2] as const;
const others = (g: BennyRun, n: number) => { const l = [...lanes]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(random(g) * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, n); };

/** Lays out what comes next on the road, from the seeded draw; harder as the run goes on, never a wall of three pillars without a runnable wall beside it. */
function spawn(g: BennyRun): void {
  layWalls(g);
  while (g.nextSpawnZ < g.distance + C.spawnAhead) {
    const z = g.nextSpawnZ, d = runDifficulty(g), roll = random(g);
    const foeShare = .18 + .17 * d, obstacleShare = .3 + .1 * d;
    if (roll < .22) {
      // A line of coins, sometimes along a runnable wall.
      const side = pick(g, ['left', 'right'] as const);
      if (random(g) < .3 && runnableAt(g, side, z) && runnableAt(g, side, z + 10)) for (let i = 0; i < 6; i++) add(g, 'wallCoin', side === 'left' ? -1 : 3, z + i * 2);
      else {
        const lane = pick(g, lanes), power = random(g) < C.powerChance ? pick(g, RUN_POWERS) : null;
        for (let i = 0; i < 5; i++) if (power && i === 2) add(g, 'power', lane, z + i * 2, {power}); else add(g, 'coin', lane, z + i * 2);
      }
    } else if (roll < .22 + .2) {
      for (const lane of others(g, 1 + (random(g) < .4 ? 1 : 0))) add(g, 'pot', lane, z);
    } else if (roll < .42 + foeShare) {
      const foe = pick(g, RUN_FOES), lane = pick(g, lanes);
      add(g, foe, lane, z);
      // A second one a little farther, so that Benny has time to strike both.
      if (d > .4 && random(g) < .4) add(g, pick(g, RUN_FOES), (lane + 1 + Math.floor(random(g) * 2)) % 3, z + 8);
    } else if (roll < .42 + foeShare + obstacleShare) {
      const kind = pick(g, ['barrier', 'beam', 'pillar'] as const);
      const count = kind === 'pillar' ? 1 + (random(g) < .3 + .3 * d ? 1 : 0) : 1 + Math.floor(random(g) * (2 + d * 1.5));
      for (const lane of others(g, Math.min(3, count))) add(g, kind, lane, z);
      // Coins over a barrier or under a beam reward the right move.
      if (kind !== 'pillar' && random(g) < .5) add(g, 'coin', g.entities[g.entities.length - 1].lane, z);
    } else {
      // Three pillars side by side: the way on is up a runnable wall (only where there is one).
      const side = (['left', 'right'] as const).find(s => runnableAt(g, s, z - 25) && runnableAt(g, s, z) && runnableAt(g, s, z + 5));
      if (side && d > .25) { for (const lane of lanes) add(g, 'pillar', lane, z); for (let i = 0; i < 4; i++) add(g, 'wallCoin', side === 'left' ? -1 : 3, z - 6 + i * 3); }
      else for (const lane of others(g, 2)) add(g, 'pot', lane, z);
    }
    const gap = C.gapStart - (C.gapStart - C.gapMin) * d;
    g.nextSpawnZ = z + gap * (.85 + random(g) * .3);
  }
}

const isFoe = (e: RunEntity) => RUN_FOES.includes(e.kind as RunFoe);
const strikable = (e: RunEntity) => e.kind === 'pot' || isFoe(e);
/** The nearest pot or creature in `lane`, from just behind Benny to `reach` m ahead. */
const nearest = (g: BennyRun, lane: number, reach: number) => g.entities
  .filter(e => e.lane === lane && strikable(e) && e.z - g.distance >= -C.hitHalf && e.z - g.distance <= reach).sort((a, b) => a.z - b.z)[0];
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
  if (dragonNear(g)) { g.over = true; g.events.push({type: 'caught', entity: e}); return; }
  g.lastBumpAt = g.at; g.stumbleUntil = g.at + C.stumbleMs; g.slideUntil = 0;
  g.events.push({type: 'bump', entity: e});
}
/** A ground charge starting now, from Benny's present height (or `from` m when leaving a wall): the higher, the longer the fall. */
function startPound(g: BennyRun, from = runHeight(g)): void {
  g.poundFrom = Math.max(from, .3); g.pound = true; g.airFrom = g.at; g.airUntil = g.at + C.poundMs * Math.max(1, Math.sqrt(g.poundFrom / C.jumpHeight)); g.slideUntil = 0;
}
function endWall(g: BennyRun): void {
  const side = g.wall!.side; g.wall = null; g.lane = side === 'left' ? 0 : 2; g.laneChangedAt = g.at;
  g.wallRuns++;
  g.combo = g.at <= g.comboUntil ? g.combo + 1 : 1; g.comboUntil = g.at + C.comboMs; g.bestCombo = Math.max(g.bestCombo, g.combo);
  const points = C.points.wallRun * comboMultiplier(g.combo); g.score = Math.min(C.maxScore, g.score + points);
  g.events.push({type: 'wallEnd', side, points});
}

/** What happens when a thing reaches Benny without having been struck. */
function meet(g: BennyRun, e: RunEntity): void {
  if (e.kind === 'wallCoin') {
    if (g.wall && (g.wall.side === 'left' ? -1 : 3) === e.lane) { g.entities = g.entities.filter(o => o !== e); gainCoins(g, e, 1); }
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
  const high = runHeight(g) > C.clearHeight;
  switch (e.kind) {
    case 'pot':
      if (sliding(g)) { strike(g, e, 'slide'); return; }
      if (high) { g.events.push({type: 'cleared', entity: e}); return; }
      g.entities = g.entities.filter(o => o !== e); g.events.push({type: 'crash', entity: e}); return;
    case 'barrier': if (high) g.events.push({type: 'cleared', entity: e}); else bump(g, e); return;
    case 'beam': if (sliding(g)) g.events.push({type: 'cleared', entity: e}); else bump(g, e); return;
    // A creature: sliding into it strikes it; otherwise, even jumping over it, it strikes Benny as she passes.
    case 'dragonnet': case 'chest': case 'ember': if (sliding(g)) strike(g, e, 'slide'); else bump(g, e); return;
    case 'pillar': bump(g, e); return;
  }
}

function tick(g: BennyRun): void {
  const dt = C.step / 1000;
  if (g.active && g.at >= g.active.until) g.active = null;
  const base = C.speedStart + (C.speedMax - C.speedStart) * runDifficulty(g);
  g.speed = base * (g.at < g.stumbleUntil ? C.stumbleSlow : 1);
  const before = g.distance; g.distance += g.speed * dt;
  if (g.at >= g.nextSettingAt) {
    g.setting = pick(g, RUN_SETTINGS.filter(s => s !== g.setting)); g.nextSettingAt = g.at + settingDelay(g);
    g.events.push({type: 'setting', setting: g.setting});
  }
  // Landing: a ground charge breaks the pots and creatures just ahead in Benny's lane; from high up, a shock wave strikes all around.
  if (g.pound && !inAir(g)) {
    g.pound = false; g.events.push({type: 'pound'});
    if (g.poundFrom >= C.shockHeight) {
      g.events.push({type: 'shockwave'});
      for (const e of g.entities.filter(o => strikable(o) && o.z - g.distance >= -C.shockBehind && o.z - g.distance <= C.shockReach)) strike(g, e, 'shock');
    } else for (const e of g.entities.filter(o => o.lane === g.lane && strikable(o) && o.z - g.distance >= -C.hitHalf && o.z - g.distance <= C.poundReach)) strike(g, e, 'pound');
  }
  if (g.wall && (g.at >= g.wall.until || !runnableAt(g, g.wall.side, g.distance))) endWall(g);
  for (const e of g.entities) if (e.kind === 'ember' && e.hopAt !== undefined && g.at >= e.hopAt) {
    e.hopAt = g.at + C.emberHopMs;
    if (e.z - g.distance > C.emberStill) e.lane = e.lane === 1 ? pick(g, [0, 2]) : 1;
  }
  for (const e of [...g.entities]) {
    if (g.over) break;
    if (e.z - before > C.hitHalf - 1e-9 && e.z - g.distance <= C.hitHalf) meet(g, e);
  }
  // A creature in the next lane that Benny has just passed without striking it strikes her (not on a wall, not flying).
  for (const e of [...g.entities]) {
    if (g.over) break;
    if (isFoe(e) && Math.abs(e.lane - g.lane) === 1 && e.z - before > -C.hitHalf - 1e-9 && e.z - g.distance <= -C.hitHalf && !g.wall && !powerActive(g, 'flight')) bump(g, e);
  }
  g.entities = g.entities.filter(e => e.z > g.distance - 5);
  spawn(g);
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
      // Off the wall by swiping away from it.
      if (g.wall) { if (g.wall.side !== side) endWall(g); return; }
      const target = g.lane + step;
      if (target < 0 || target > 2) {
        if (runnableAt(g, side, g.distance) && !powerActive(g, 'flight')) {
          // From the ground or in the middle of a jump.
          g.wall = {side, until: g.at + C.wallMs}; g.airUntil = 0; g.pound = false; g.slideUntil = 0;
          g.events.push({type: 'wallStart', side});
        }
        return;
      }
      g.lane = target; g.laneChangedAt = g.at;
      // The wand: changing lanes towards a pot or a creature strikes it.
      const hit = nearest(g, target, C.strikeReach);
      if (hit) strike(g, hit, 'lane');
      return;
    }
    case 'up':
      if (powerActive(g, 'flight') || (inAir(g) && !g.wall)) return;
      // A jump, also off a wall (she lands in the edge lane).
      if (g.wall) endWall(g);
      g.airFrom = g.at; g.airUntil = g.at + C.jumpMs; g.pound = false; g.slideUntil = 0; return;
    case 'down': {
      if (powerActive(g, 'flight')) return;
      // Off a wall with a ground charge: from that height, a shock wave.
      if (g.wall) { endWall(g); startPound(g, C.wallRunHeight); return; }
      if (inAir(g)) { if (!g.pound) startPound(g); return; }
      // A slide that strikes with the wand what is just ahead in the lane, and anything met while sliding.
      g.slideUntil = g.at + C.slideMs;
      const hit = nearest(g, g.lane, C.strikeReach);
      if (hit) strike(g, hit, 'slide');
      return;
    }
  }
}

/** The events since the last call, for the display (sounds, sparks, the score popping). */
export function takeRunEvents(g: BennyRun): RunEvent[] { const e = g.events; g.events = []; return e; }

/** The longest distance a saved run may claim: an hour at full speed, far beyond any real run. */
export const BENNY_RUN_MAX_METRES = 24 * 3600;
export interface RunSummary {score: number; metres: number; coins: number; pots: number; foes: number; wallRuns: number; bestCombo: number; seconds: number}
export const runSummary = (g: BennyRun): RunSummary => ({score: g.score, metres: Math.floor(g.distance), coins: g.coins, pots: g.pots, foes: g.foes,
  wallRuns: g.wallRuns, bestCombo: g.bestCombo, seconds: Math.floor((g.at - g.startedAt) / 1000)});
