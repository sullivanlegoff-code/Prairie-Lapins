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
  /** Past the ramp, the run keeps hardening: every `overtimeMs` more, `overtimeSpeed` m/s faster and the gaps between
   * patterns `overtimeGap` m shorter, `overtimeMax` times at most (a new pace each time, announced). */
  overtimeMs: 75_000, overtimeSpeed: 1.5, overtimeGap: .4, overtimeMax: 4,
  /** A jump: its time and its height (m); a slide; a ground charge comes down in `poundMs` and breaks what is ahead within `poundReach`. */
  jumpMs: 650, jumpHeight: 1.4, slideMs: 700,
  /** Each pot or creature broken while rolling adds this much to the roll: a whole row in one roll. */
  rollChainMs: 550, poundMs: 120, poundReach: 4,
  /** Height above which Benny clears a low thing (a barrier, a pot). */
  clearHeight: .5,
  /** A springboard: a bounce `springHeight` m high lasting `springMs`; above `overHeight` m everything on the road passes beneath. */
  springHeight: 3.6, springMs: 1300, overHeight: 2.4,
  /** Benny's height when running on a wall; a ground charge from `shockHeight` m or more sends a shock wave from `shockBehind` m
   * behind her to `shockReach` m ahead, in every lane. */
  wallRunHeight: 1.8, shockHeight: 1.6, shockBehind: 1.5, shockReach: 6,
  /** A ground charge that falls on a creature's head (at most `headHeight` m up) breaks it, and Benny rebounds off it. */
  headHeight: 1.6,
  /** A wall run lasts `wallMs` at most; walls come in segments of `wallSegment` m, `wallRunnable` of them runnable. */
  wallMs: 2600, wallSegment: 36, wallRunnable: .3,
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
  /** A series of at least `seriesMin` strikes that ends by itself (not by a bump) is banked: `seriesPoints` per strike. */
  seriesMin: 5, seriesPoints: 5,
  points: {pot: 10, foe: 25, wallPerSecond: 40, wallLeap: 25, dodge: 5, wallTrail: 10, leapChain: 15, close: 15, km: 100},
  /** « De justesse » : an obstacle passing in the lane Benny left less than `closeMs` ago. */
  closeMs: 300,
  /** Coins picked up on one wall run for the « wall trail » bonus (`points.wallTrail` each). */
  wallTrailMin: 6,
  /** Gaps in the road: short ones (m) to jump, long ones to cross on the walls, leaping from one wall to the other. */
  holeShort: [3.5, 5], holeLong: [14, 34],
  /** A pot struck flies on along its lane, this much faster than Benny (m/s) and this far (m), and knocks over all it meets. */
  /** Coins a pot spills. */
  potCoins: 3,
  /** A chest takes two blows: the first throws it on along the road, `chestKnock` m at `chestFlyStep` m a tick, and the second breaks it. */
  // (Thrown four times as far since 13 Nov., owner: « quadruple la distance d'éjection des coffres ».)
  chestKnock: 28, chestFlyStep: .3,
  /** The long blow (owner, 13 Nov.): a lane change also strikes a creature in the lane after the one she moves into, when that lane
   *  has nothing to strike, or when what she strikes there stands on the same line as it (`farLine` m apart at most). */
  farLine: 1.5,
  // One pot in `goldEvery` (picked from its number, so the run's draws stay the same) is golden: worth `goldPot` times the points.
  goldEvery: 20, goldPot: 5,
  /** The setting changes at random every 40 to 55 s. */
  settingMs: [40_000, 55_000],
  /** A new setting starts this far ahead (m): it comes into sight and Benny runs into it. */
  settingAhead: 80,
  /** Short challenges during the run, one after the other, in this order: the first after `challengeFirstMs`, the next
   * `challengeGapMs` after one is done. Each one done is worth `challengePoints` times its rank (at most `challengePointsMax`). */
  challengeOrder: ['pots', 'coins', 'foes', 'clean', 'walls', 'dodges', 'combo', 'leaps'] as const, challengeFirstMs: 5000, challengeGapMs: 4000,
  challengePoints: 100, challengePointsMax: 500,
  /** While the « run on walls » challenge is on, the share of patterns that are a row of pillars (whatever the difficulty). */
  wallChallengeNudge: .5,
  /** Wide halls: the road widens to `wideLanes` lanes for `wideLen` m (from this far into the speed ramp); nothing is laid
   * within `wideClear` m before an edge of one, so that no thing straddles it. */
  wideLanes: 5, wideLen: [140, 220], wideFrom: .15, wideClear: 60,
  /** Raised platforms along one lane: this high (m). Benny gets up onto one only by landing on it from a springboard aimed at it
   * (owner: « uniquement en prenant un tremplin »); from the ground she runs on beneath. */
  platformHeight: 1.8,
  /** Stairs up and down along one lane: a step is `stairRise` m high and `stairTread` m long, the top is `stairTop` m (more with the
   * difficulty). Benny walks them, without a jump, and takes a step sideways only when it is at most `stepMax` m high. */
  stairRise: .4, stairTread: 1.4, stairTop: 1.2, stepMax: .5,
  /** Things are laid out to `spawnAhead` m ahead, the first at `firstAt` m, then every `gapStart` m down to `gapMin` m. */
  spawnAhead: 90, firstAt: 30, gapStart: 22, gapMin: 11,
  /** Share of coin lines carrying a power, and how long each power lasts once picked up (the bubble lasts until a bump, at most this). */
  powerChance: .25, powers: {magnet: 8000, bubble: 20_000, double: 10_000, flight: 6000, dash: 3500},
  /** The « Ruée »: Benny charges this much faster and smashes all in her lane (gaps leapt), a pillar or a fence worth `dashSmash` points. */
  dashSpeed: 1.4, dashSmash: 15,
  /** Share of the creatures that are little flying monsters, once the run is `flyerFrom` into its speed ramp. */
  flyerShare: .3, flyerFrom: .15,
  /** A flying monster hovers at this height (m), a jump's height: it is struck only by jumping through it (owner: « un saut au-
   * dessus de Benny »). Running under it does not hurt; on a wall it still reaches her. */
  flyerHeight: 1.1,
  /** Cracked slabs in one lane give way when Benny is `crumbleAt` m from them: a pit to jump or to go round. */
  crumbleAt: 16, pitLen: [3.5, 5],
  /** Falling into the void (a gap, an open pit, or the side of the road with no wall): a short fall of `fallMs` ms, `fallDepth` m deep, then
   * the Dragon catches her and the run is over. */
  fallMs: 700, fallDepth: 3,
  /** Stretches with no wall at all on one side or both (owner, 13 Nov.: « parfois vraiment seul face au vide »), the three lanes
   * whole: one every `edgeEvery` s or so of running (a random share more), the first past `edgeFrom` m, `edgeBoth` of them on both
   * sides, from one wall segment long up to `edgeSegments` with the difficulty. */
  edgeEvery: 20, edgeSpread: 10, edgeFrom: 160, edgeBoth: .45, edgeSegments: 3,
  /** In the cave, rocks hang from the ceiling (their shadow on the road) and fall when Benny is `rockLand` m away: then a
   * boulder to jump over, like a fence. */
  rockLand: 24,
  /** On the bridge over the lava, vents bubble in the road and burst into a lava geyser when Benny is `geyserAt` m away:
   * a column she cannot jump, to go round. */
  geyserAt: 30,
  /** On the mountain path, a gust of wind is announced `gustWarn` m ahead, then pushes Benny one lane downwind (not on a
   * wall or a platform); the road past it is clear, with coins downwind. */
  gustWarn: 18,
  /** On the lava bridge (fireballs) and the mountain path (snowballs), balls roll towards Benny at `fireSpeed` m/s once she is `fireFrom` m away: jump them or step aside. */
  fireSpeed: 7, fireFrom: 45,
  /** Mine carts in the cave roll slower (they cannot be jumped). */
  cartSpeed: 4,
  /** A long tunnel of logs: beams every `burrowStep` m; a roll under one goes on while another is within `burrowKeep` m
   * (one roll for the whole tunnel, a long slide). */
  burrowStep: 2.5, burrowKeep: 3,
  /** A run never pays points: this only bounds what a run can count. */
  maxScore: 9_999_999,
  /** The coins of a run are pattes (`pattesPerCoin` each), at most `maxPattes` a run, for the first `rewardedRunsPerCycle` runs of
   * the day (owner, 12 November 2026: « les pièces récoltées comptent pour les pièces du jeu principal »). Runs past that are for the record. */
  pattesPerCoin: 1, maxPattes: 150, rewardedRunsPerCycle: 3,
  /** Hearts on the road, now and then (owner, 12 November 2026: « de temps en temps on peut récolter des cœurs »): one pattern in
   * `heartEvery` may bring one, after `heartFrom` m. Measured: about 5 on the road in five minutes, so a good run of about five
   * minutes gives about 4. A run keeps at most `maxHeartsPerRun`; a day pays at most `heartsPerCycle` (owner: 20 a day). */
  heartFrom: 400, heartEvery: 40, maxHeartsPerRun: 8, heartsPerCycle: 20,
  /** The most coins a run can count (bounds what a save can claim). */
  maxCoins: 5000,
} as const;

export type RunSetting = 'grotte' | 'pont' | 'montagne';
export const RUN_SETTINGS: readonly RunSetting[] = ['grotte', 'pont', 'montagne'];
export type RunPower = keyof typeof BENNY_RUN.powers;
export const RUN_POWERS = Object.keys(BENNY_RUN.powers) as RunPower[];
export type RunFoe = 'dragonnet' | 'chest' | 'ember' | 'flyer';
export type RunKind = 'coin' | 'wallCoin' | 'heart' | 'power' | 'pot' | 'barrier' | 'beam' | 'pillar' | 'hole' | 'fireball' | 'spring' | RunFoe;
/** The creatures on the ground; the little flying monster (`flyer`) comes on top. */
export const RUN_FOES: readonly RunFoe[] = ['dragonnet', 'chest', 'ember'];
export type RunInput = 'left' | 'right' | 'up' | 'down';
export type Side = 'left' | 'right';
export type StrikeKind = 'lane' | 'far' | 'spin' | 'slide' | 'jump' | 'pound' | 'shock' | 'dash' | 'wall' | 'chest';

/** A thing on the road. `lane` is 0 to `lanes - 1`; a wall coin's lane is -1 (left wall) or `lanes` (right wall). */
/** A thing on the road; `up` is how high a coin floats (a coin arc over a barrier), for the drawing only. */
export interface RunEntity {id: number; kind: RunKind; lane: number; z: number; power?: RunPower; sky?: boolean; hp?: number; knock?: number; up?: number; beside?: boolean; rock?: 'up' | 'down'; geyser?: 'idle' | 'up'; rolling?: boolean; snow?: boolean; cart?: boolean; gold?: boolean}
export interface WallSegment {side: Side; from: number; to: number; runnable: boolean; void?: boolean}
export type RunEvent =
  | {type: 'strike'; entity: RunEntity; points: number; combo: number; multiplier: number; by: StrikeKind; roll?: number}
  | {type: 'crash'; entity: RunEntity}
  | {type: 'coin'; entity: RunEntity; amount: number}
  /** A Heart picked up on the road (`hearts` of the run now). */
  | {type: 'heart'; entity: RunEntity}
  /** Passed over or under unharmed; `points` for a barrier jumped or a beam rolled under. */
  | {type: 'cleared'; entity: RunEntity; points?: number}
  | {type: 'bump'; entity: RunEntity}
  | {type: 'shield'; entity: RunEntity}
  | {type: 'caught'; entity: RunEntity}
  | {type: 'power'; power: RunPower}
  | {type: 'wallStart'; side: Side}
  | {type: 'wallEnd'; side: Side; points: number; trail: number}
  /** From one wall to the other, over a gap in the road. */
  | {type: 'wallLeap'; side: Side; points: number; combo: number; chain: number}
  /** Into a gap: a bump, then she catches a wall or hops out. */
  | {type: 'fall'; onto: Side | null}
  | {type: 'overVoid'; side: Side}
  | {type: 'pound'}
  | {type: 'shockwave'}
  | {type: 'setting'; setting: RunSetting}
  /** The road widens or narrows under Benny's feet: `lanes` now, her lane number moved by `shift`. */
  | {type: 'lanes'; lanes: number; shift: number}
  /** Up onto a platform (landing from a springboard); off a platform (its end, or a step aside). */
  | {type: 'platformUp'} | {type: 'platformDown'} | {type: 'blocked'}
  /** Cracked slabs giving way ahead. */
  | {type: 'crumble'; pit: Pit}
  /** A rock fallen from the cave's ceiling onto the road. */
  | {type: 'rockfall'; entity: RunEntity}
  /** A vent on the lava bridge bursting into a geyser. */
  | {type: 'geyser'; entity: RunEntity}
  /** A gust of wind on the mountain: announced (`warn`), then blowing Benny one lane towards `dir` (`pushed` if she moved). */
  | {type: 'gust'; dir: -1 | 1; warn: boolean; pushed?: boolean}
  /** A new, faster pace past the ramp. */
  | {type: 'faster'; pace: number}
  /** The end of a flight: gliding down onto a clear spot. */
  | {type: 'landing'}
  /** A series of strikes ended by itself, banked. */
  | {type: 'series'; length: number; points: number}
  /** Up off a springboard. */
  | {type: 'bounce'}
  /** Another kilometre run. */
  | {type: 'km'; km: number; points: number}
  /** Out of the way of an obstacle at the last moment. */
  | {type: 'close'; entity: RunEntity; points: number}
  /** A challenge given (`points` absent) or done. */
  | {type: 'challenge'; kind: ChallengeKind; goal: number; points?: number}
  | {type: 'tutorial'; step: TutorialStep | null; again?: boolean};

export interface Platform {lane: number; from: number; to: number}
/** A stretch of stairs along one lane: up to `top` m, a flat top, and back down. */
export interface Ledge {lane: number; from: number; to: number; top: number}
/** A pit in one lane where cracked slabs gave way (`open`), or are about to. */
export interface Pit {lane: number; from: number; to: number; open: boolean}
export type ChallengeKind = 'pots' | 'coins' | 'foes' | 'walls' | 'combo' | 'clean' | 'dodges' | 'leaps';
export interface BennyRun {
  seed: number; startedAt: number; at: number;
  distance: number; speed: number;
  /** How many lanes the road has (3 for now), and Benny's. */
  lanes: number; lane: number; laneChangedAt: number;
  /** The lane she was in before her last lane change. */
  laneFrom: number;
  /** The pots and creatures broken in the present roll. */
  rollHits: number;
  /** The kilometres already rewarded (`points.km` × the kilometre: 100 at 1 km, 200 at 2 km…). */
  kms: number;
  /** The road's usual lanes, and the wide halls ahead (`wideLanes` lanes from `from` to `to` m). */
  baseLanes: number; zones: {from: number; to: number}[];
  /** Raised platforms ahead (one lane, from `from` to `to` m, their ramp before), and the one Benny is on. */
  platforms: Platform[]; raised: Platform | null; ledges: Ledge[];
  pits: Pit[];
  /** Gusts of wind ahead on the mountain path: where they blow, which way, and whether they were announced. */
  gusts: {z: number; dir: -1 | 1; warned: boolean}[];
  /** The pace announced last (past the ramp, one more each `overtimeMs`). */
  pace: number;
  /** The points won in each setting so far (`scored`: the score already shared out). */
  scoreBy: Record<RunSetting, number>; scored: number;
  /** In the air between `airFrom` and `airUntil`, a jump starting `jumpFrom` m high; `pound` once the ground charge has started,
   * from `poundFrom` m high. */
  airFrom: number; airUntil: number; jumpFrom: number; pound: boolean; poundFrom: number;
  /** The end of a springboard bounce (its jump is that much higher). */
  bounceUntil: number;
  /** The height of the platform a springboard bounce lands on (0 when it lands on the road). */
  landHeight: number;
  slideUntil: number;
  wall: {side: Side; until: number; since?: number; coins?: number; leaps?: number} | null;
  entities: RunEntity[]; nextId: number; nextSpawnZ: number;
  walls: WallSegment[]; wallsTo: Record<Side, number>;
  /** Gaps in the road ahead, from `from` to `to` (m). */
  holes: {from: number; to: number}[];
  /** When Benny fell into the void (null while on the road). */
  fallFrom: number | null;
  /** In the air over the void beside the road (she jumped, then swiped towards it): she falls unless she is back over the road when
   * the jump ends. */
  overVoid: Side | null;
  /** Where the next stretch with no wall begins (m), and the one being laid: its end and its open sides. */
  nextEdgeZ: number; edge: {to: number; sides: Side[]} | null;
  setting: RunSetting; nextSettingAt: number;
  /** The next setting, from `z` on, while Benny runs towards it. */
  upcoming: {setting: RunSetting; z: number} | null;
  stumbleUntil: number; lastBumpAt: number | null;
  /** The power under way (a new one replaces it). */
  active: {power: RunPower; until: number} | null;
  score: number; coins: number; hearts: number; pots: number; goldPots: number; foes: number; wallRuns: number;
  /** Barriers jumped and beams rolled under. */
  dodges: number;
  /** Leaps from one wall to the other. */
  leaps: number;
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
    seed: (seed >>> 0) || 1, startedAt: now, at: now, distance: 0, speed: C.speedStart, lanes, lane: Math.floor(lanes / 2), laneChangedAt: -Infinity, laneFrom: Math.floor(lanes / 2), rollHits: 0, kms: 0, baseLanes: lanes, zones: [], platforms: [], raised: null, ledges: [], pits: [], gusts: [], pace: 0, scoreBy: {grotte: 0, pont: 0, montagne: 0}, scored: 0,
    airFrom: 0, airUntil: 0, bounceUntil: -1, landHeight: 0, jumpFrom: 0, pound: false, poundFrom: 0, slideUntil: 0, wall: null,
    entities: [], nextId: 1, nextSpawnZ: C.firstAt, walls: [], wallsTo: {left: 0, right: 0}, holes: [], fallFrom: null, overVoid: null, nextEdgeZ: C.edgeFrom, edge: null,
    setting: 'grotte', nextSettingAt: 0, upcoming: null, stumbleUntil: 0, lastBumpAt: null,
    active: null, score: 0, coins: 0, hearts: 0, pots: 0, goldPots: 0, foes: 0, wallRuns: 0, dodges: 0, leaps: 0, combo: 0, comboUntil: 0, bestCombo: 0,
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
/** How far past the ramp the run is, in steps of `overtimeMs` (0 before it ends, `overtimeMax` at most; smooth in between). */
export const runOvertime = (g: BennyRun) => Math.min(C.overtimeMax, Math.max(0, g.at - g.paceFrom - C.speedRampMs) / C.overtimeMs);
export const powerActive = (g: BennyRun, power: RunPower) => g.active?.power === power && g.at < g.active.until;
export const inAir = (g: BennyRun) => g.at < g.airUntil;
export const sliding = (g: BennyRun) => g.at < g.slideUntil && !inAir(g);
/** Benny's height above the road (m): a jump's arc, a quick drop when charging, high up while flying. */
export function runHeight(g: BennyRun): number {
  if (powerActive(g, 'flight')) return 3;
  if (g.fallFrom !== null) return -C.fallDepth * Math.min(1, (g.at - g.fallFrom) / C.fallMs);
  return floorHeight(g) + airHeight(g);
}
/** How high Benny's jump or ground charge has taken her above what she runs on. */
function airHeight(g: BennyRun): number {
  if (!inAir(g)) return 0;
  const p = (g.at - g.airFrom) / (g.airUntil - g.airFrom);
  // A bounce that lands on a platform rises to its top as it comes down, so she stands on it without a jump of the floor.
  const landing = g.airUntil === g.bounceUntil ? g.landHeight : 0;
  return g.pound ? g.poundFrom * (1 - p) : g.jumpFrom * (1 - p) + landing * p + 4 * (g.airUntil === g.bounceUntil ? C.springHeight : C.jumpHeight) * p * (1 - p);
}
/** The height of what Benny runs on: a platform (or its ramp) she has climbed, else the road. */
export function floorHeight(g: BennyRun): number {
  return g.raised ? C.platformHeight : ledgeHeight(g, g.lane, g.distance);
}
/** The height of the stairs along `lane` at `z` (0 off them): a step per `stairTread` m, up to the top and back down. */
export function ledgeHeight(g: BennyRun, lane: number, z: number): number {
  const l = g.ledges.find(o => o.lane === lane && z >= o.from && z < o.to); if (!l) return 0;
  const steps = Math.round(l.top / C.stairRise), run = steps * C.stairTread;
  const up = z - l.from, down = l.to - z;
  const at = up < run ? Math.floor(up / C.stairTread) + 1 : down < run ? Math.floor(down / C.stairTread) + 1 : steps;
  return Math.min(steps, at) * C.stairRise;
}
/** The platform along `lane` at `z`, ramp included. */
export const platformAt = (g: BennyRun, lane: number, z: number) => g.platforms.find(p => p.lane === lane && z >= p.from && z < p.to);
/** Off a platform (its end, or a step aside): a jump down from its height, like one off a wall. */
function dropOff(g: BennyRun): void {
  const from = floorHeight(g); g.raised = null; g.events.push({type: 'platformDown'});
  if (g.pound) { g.poundFrom += from; return; }
  const rel = airHeight(g) + from;
  g.jumpFrom = rel; g.airFrom = g.at; g.airUntil = g.at + C.jumpMs * .7 * (1 + rel / (2 * C.jumpHeight)); g.slideUntil = 0;
}
/** Up a ramp met in her lane; off at the end. */
function followPlatform(g: BennyRun): void {
  if (!g.raised && !g.wall && !powerActive(g, 'flight')) {
    // Only just landed from a springboard aimed at a platform: she stands on it (from the ground, she runs on beneath).
    const p = g.landHeight > 0 && g.at >= g.bounceUntil && g.at - g.bounceUntil < C.springMs ? g.platforms.find(o => o.lane === g.lane && g.distance >= o.from && g.distance < o.to) : undefined;
    if (p) { g.raised = p; g.events.push({type: 'platformUp'}); }
  }
  if (g.raised && (g.distance >= g.raised.to || g.lane !== g.raised.lane || g.wall)) dropOff(g);
  g.platforms = g.platforms.filter(p => p.to > g.distance - 10);
  g.ledges = g.ledges.filter(l => l.to > g.distance - 10);
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
    // A stretch with no wall begins (both sides' segments start at the same places): which sides, how long.
    if (!g.edge && !g.tutorial && from >= g.nextEdgeZ) {
      const sides: Side[] = random(g) < C.edgeBoth ? ['left', 'right'] : [random(g) < .5 ? 'left' : 'right'];
      const length = C.wallSegment * Math.min(C.edgeSegments, 1 + Math.floor(runDifficulty(g) * (C.edgeSegments - 1) + random(g)));
      g.edge = {to: from + length, sides};
      g.nextEdgeZ = from + length + Math.max(C.speedStart, g.speed) * (C.edgeEvery + random(g) * C.edgeSpread);
    }
    const open = !!g.edge && from < g.edge.to && g.edge.sides.includes(side);
    g.walls.push({side, from, to: from + C.wallSegment, runnable: !open && (from < C.firstAt + C.wallSegment || random(g) < C.wallRunnable), ...(open ? {void: true} : {})});
    if (g.edge && side === 'right' && from + C.wallSegment >= g.edge.to) g.edge = null;
    g.wallsTo[side] = from + C.wallSegment;
  }
  g.walls = g.walls.filter(w => w.to > g.distance - 10);
}

/** Whether the pot with this number is golden (about one in `goldEvery`, spread out). */
export const isGoldenPot = (id: number) => Math.imul(id, 2654435761) >>> 0 < 2 ** 32 / C.goldEvery;
const add = (g: BennyRun, kind: RunKind, lane: number, z: number, extra: Partial<RunEntity> = {}) => {
  const e: RunEntity = {id: g.nextId++, kind, lane, z, ...extra};
  if (kind === 'pot' && isGoldenPot(e.id)) e.gold = true;
  if (kind === 'chest') e.hp = 2;
  g.entities.push(e); return e;
};
const laneList = (g: BennyRun) => Array.from({length: g.lanes}, (_, i) => i);
/** The lane number of a wall: -1 on the left, `lanes` on the right. */
export const wallLane = (g: BennyRun, side: Side) => side === 'left' ? -1 : g.lanes;
/** Where Benny is across the road: her lane, or her wall's. */
const across = (g: BennyRun) => g.wall ? wallLane(g, g.wall.side) : g.lane;
const others = (g: BennyRun, n: number) => { const l = laneList(g); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(random(g) * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, n); };

export type RunPattern = 'void' | 'stairs' | 'coins' | 'arc' | 'slalom' | 'pots' | 'gauntlet' | 'pair' | 'tunnel' | 'barriers' | 'pillars' | 'wall' | 'flyers' | 'breather' | 'hole' | 'skittles' | 'wide' | 'platform' | 'crumble' | 'rockfall' | 'geysers' | 'gust' | 'burrow' | 'wallTrail' | 'fireballs' | 'carts' | 'spring';
/**
 * The road is laid out in short patterns rather than one thing at a time, so that it has a rhythm: a slalom of pots to chain
 * lane strikes into a combo, a row of creatures one side then the other, a pair of creatures on both sides for the spinning
 * wand, a tunnel of beams to roll under, barriers with an arc of coins over them, pillars with a way through, a stretch of
 * wall to run past three pillars, flying monsters, and breathers of coins. Each pattern leaves Benny a way through; the
 * patterns come more often and harder as the run speeds up. `weights` gives each pattern's share at the start and at the end.
 */
const PATTERNS: Record<RunPattern, [number, number]> = {
  coins: [4, 1.5], stairs: [.6, 1.2], void: [.3, 1.2], arc: [2, 2], slalom: [3, 3], pots: [3, 1.5], gauntlet: [1.5, 3.5], pair: [.5, 2.5], tunnel: [1, 2], barriers: [1, 2],
  pillars: [1.5, 2.5], spring: [.5, 1.2], wall: [0, 2], flyers: [0, 2.5], breather: [2, .8], hole: [0, 2.2], skittles: [1.5, 2], wide: [0, 1.2], platform: [.4, 1.4], crumble: [.2, 1.1], rockfall: [1.5, 2.5], geysers: [1.2, 2], gust: [1.2, 1.8], burrow: [.2, .8], wallTrail: [.8, 1.4], fireballs: [.6, 1.6], carts: [.4, 1],
};
function choosePattern(g: BennyRun, z: number): RunPattern {
  const d = runDifficulty(g), list = (Object.keys(PATTERNS) as RunPattern[]).filter(p => (p !== 'flyers' || d >= C.flyerFrom) && (p !== 'pair' || d >= .2) && (p !== 'hole' || d >= .08) &&
    (p !== 'wall' || (d > .25 && wallSide(g, z))) &&
    (p !== 'void' || d >= .1) && (p !== 'platform' || d >= .1) && (p !== 'spring' || d >= .1) && (p !== 'crumble' || d >= .12) && (p !== 'burrow' || d >= .2) && (p !== 'carts' || (d >= .15 && settingAt(g, z) === 'grotte' && settingAt(g, z + 40) === 'grotte')) && (p !== 'fireballs' || (d >= .1 && (['pont', 'montagne'] as RunSetting[]).some(s => settingAt(g, z) === s && settingAt(g, z + 40) === s))) && (p !== 'wallTrail' || (d >= .05 && trailSide(g, z) !== undefined)) && (p !== 'gust' || (d >= .06 && settingAt(g, z) === 'montagne' && settingAt(g, z + 30) === 'montagne')) && (p !== 'geysers' || (d >= .06 && settingAt(g, z) === 'pont' && settingAt(g, z + 40) === 'pont')) && (p !== 'rockfall' || (d >= .06 && settingAt(g, z) === 'grotte' && settingAt(g, z + 40) === 'grotte')) && (p !== 'wide' || (d >= C.wideFrom && g.baseLanes < C.wideLanes && !g.zones.some(w => w.to > z - 100))));
  // The « run on walls » challenge: a row of pillars (the way on is up a wall) comes one time in two meanwhile.
  if (g.challenge?.kind === 'walls' && wallSide(g, z) && random(g) < C.wallChallengeNudge) return 'wall';
  const weight = (p: RunPattern) => PATTERNS[p][0] + (PATTERNS[p][1] - PATTERNS[p][0]) * d;
  let roll = random(g) * list.reduce((n, p) => n + weight(p), 0);
  for (const p of list) { roll -= weight(p); if (roll < 0) return p; }
  return list[list.length - 1];
}
/** How far a thing rolling at `speed` towards Benny comes from where it starts rolling until she meets it. */
const rollLead = (g: BennyRun, speed: number) => C.fireFrom * speed / (g.speed + speed);
/** A side whose wall can be run on all along a trail of coins from `z` (30 m). */
const trailSide = (g: BennyRun, z: number) => (['left', 'right'] as const).find(s => [0, 10, 20, 30].every(k => runnableAt(g, s, z + k)));
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
      // Two creatures in neighbouring lanes, side by side (never with a lane empty between them), and coins in the free lane that draw
      // Benny there.
      const a = pick(g, all.filter(l => l + 1 < g.lanes)), free = pick(g, all.filter(l => l !== a && l !== a + 1));
      add(g, 'coin', free, z - 4); add(g, 'coin', free, z - 2);
      // Creatures that stay put.
      const still = ['dragonnet', 'chest'] as const; add(g, pick(g, still), a, z + 2); add(g, pick(g, still), a + 1, z + 2);
      return z + 2;
    }
    case 'carts': {
      // Laid farther by what it will roll (it meets Benny where a still thing laid at `z` would).
      z += rollLead(g, C.cartSpeed);
      // Runaway mine carts rolling down the cave towards Benny, one or two lanes (never all), coins in a free lane.
      const two = g.lanes > 2 && random(g) < .3 + .4 * d, first = any(), lanes = two ? [first, neighbour(first)] : [first];
      for (const l of lanes) add(g, 'fireball', l, z, {cart: true});
      const free = pick(g, all.filter(l => !lanes.includes(l))); for (let k = 0; k < 4; k++) add(g, 'coin', free, z - 8 + k * 3);
      return z;
    }
    case 'fireballs': {
      const lead = rollLead(g, C.fireSpeed);
      z += lead;
      // Fireballs rolling down the lanes towards Benny, one after the other (never all lanes at once): jump them or step aside.
      const count = 2 + (random(g) < d ? 1 : 0); let lane = any();
      for (let i = 0; i < count; i++) {
        add(g, 'fireball', lane, z + i * 10, settingAt(g, z) === 'montagne' ? {snow: true} : {});
        // An arc of coins over where it will meet Benny: a reward for jumping it.
        for (let k = 0; k < 3; k++) add(g, 'coin', lane, z - lead + i * 10 - 2 + k * 2, {up: .9 + (k === 1 ? .6 : 0)});
        lane = pick(g, all.filter(l => l !== lane));
      }
      return z + (count - 1) * 10;
    }
    case 'wallTrail': {
      // A long trail of coins up a wall, and below it a slalom of pots and barriers: the wall is the way for the coins.
      const side = trailSide(g, z)!, edge = side === 'left' ? 0 : g.lanes - 1;
      // Two pots hang on the wall among the coins: running along it breaks them, and the combo climbs up there too.
      for (let k = 0; k <= 27; k += 3) add(g, k === 9 || k === 21 ? 'pot' : 'wallCoin', wallLane(g, side), z + k, k === 9 || k === 21 ? {up: 1.5} : {});
      for (let k = 6; k <= 24; k += 9) { add(g, 'pot', edge, z + k); for (const l of all) if (l !== edge && random(g) < .5) add(g, 'barrier', l, z + k + 4); }
      return z + 28;
    }
    case 'burrow': {
      // A long tunnel of logs over the whole road: one roll and Benny slides all the way, along coins that change lanes halfway.
      const len = 14 + Math.round(random(g) * 14 * d), first = any(), second = neighbour(first);
      for (let k = 0; k <= len; k += C.burrowStep) { for (const l of all) add(g, 'beam', l, z + k); add(g, 'coin', k < len / 2 ? first : second, z + k + C.burrowStep / 2); }
      return z + len;
    }
    case 'tunnel': {
      // Beams across the road: roll under them, through a line of coins.
      const count = 1 + Math.round(random(g) * (1 + d)), lane = any();
      for (let i = 0; i < count; i++) { for (const l of all) add(g, 'beam', l, z + i * 5); add(g, 'coin', lane, z + i * 5 + 2.5); }
      return z + (count - 1) * 5;
    }
    case 'barriers': {
      const count = Math.min(g.lanes, 1 + Math.floor(random(g) * (2 + d * 1.5)));
      const fenced = others(g, count);
      for (const lane of fenced) add(g, 'barrier', lane, z);
      // An arc of coins over one of the fences, along the jump: always when the whole road is fenced, else one time in two.
      if (count === g.lanes || random(g) < .5) { const lane = pick(g, fenced); [.8, 1.3, 1.5, 1.3, .8].forEach((up, i) => add(g, 'coin', lane, z - 4 + i * 2, {up})); }
      return z;
    }
    case 'spring': {
      // A springboard in one lane, and a row of pillars ahead: bounce over them, high up through an arc of coins. Or jump the
      // fence left in the lane farthest from it.
      const lane = any(), len = g.speed * C.springMs / 1000, top = z + len / 2, way = all.reduce((a, b) => Math.abs(b - lane) > Math.abs(a - lane) ? b : a, lane);
      add(g, 'spring', lane, z);
      for (const l of all) add(g, l === way && way !== lane ? 'barrier' : 'pillar', l, top);
      for (let k = 1; k < 8; k++) { const p = k / 8; add(g, 'coin', lane, z + len * p, {up: 4 * C.springHeight * p * (1 - p) + .3}); }
      // Often, pots across the road under the end of the bounce (she passes over them): a ground charge from up there breaks them all
      // with its shock wave.
      if (random(g) < .5 + .4 * d) for (const l of all) add(g, 'pot', l, z + len * .8);
      return z + len + 4;
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
      for (const w of g.walls) if (w.to > z - 25 && w.from <= z + 5) { w.runnable = true; w.void = false; }
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
    case 'gust': {
      // A gust across the path: nothing in the way for a while past it, coins in the lanes it blows towards.
      const dir: -1 | 1 = random(g) < .5 ? -1 : 1;
      g.gusts.push({z, dir, warned: false});
      for (const lane of all) if (lane !== (dir > 0 ? 0 : g.lanes - 1)) for (let k = 0; k < 4; k++) add(g, 'coin', lane, z + 3 + k * 3);
      return z + 16;
    }
    case 'geysers': {
      // Vents in a zigzag, one lane after another (two side by side later on, never all): weave between the geysers.
      let lane = any(), at = z;
      const rows = 3 + (random(g) < d ? 1 : 0);
      for (let r = 0; r < rows; r++) {
        add(g, 'pillar', lane, at, {geyser: 'idle'});
        const two = g.lanes > 2 && random(g) < .2 + .4 * d, other = two ? neighbour(lane) : -1;
        if (two) add(g, 'pillar', other, at, {geyser: 'idle'});
        const free = all.filter(l => l !== lane && l !== other); add(g, 'coin', pick(g, free), at);
        lane = pick(g, all.filter(l => l !== lane)); at += 14;
      }
      return at - 14;
    }
    case 'rockfall': {
      // Rocks fall in all lanes but one (two rows later on, the free lane changing): jump them or take the free lane.
      const rows = random(g) < .25 + .5 * d ? 2 : 1;
      for (let r = 0; r < rows; r++) {
        const free = any(), at = z + r * 14;
        for (const lane of all) if (lane !== free) add(g, 'barrier', lane, at, {rock: 'up'});
        for (let k = 0; k < 3; k++) add(g, 'coin', free, at - 3 + k * 2);
      }
      return z + (rows - 1) * 14;
    }
    case 'crumble': {
      // Cracked slabs in one or two lanes (never all): they give way as Benny comes. One lane after the other, a staircase.
      const count = Math.min(g.lanes - 1, 1 + (random(g) < .6 * d ? 1 : 0)), start = any();
      let lane = start, at = z;
      for (let i = 0; i < count; i++) {
        const len = C.pitLen[0] + random(g) * (C.pitLen[1] - C.pitLen[0]);
        g.pits.push({lane, from: at, to: at + len, open: false});
        add(g, 'coin', lane, at + len / 2, {up: 1.4});
        lane = lane + 1 < g.lanes ? lane + 1 : lane - 1; at += len + 6;
      }
      return at;
    }
    case 'void': {
      // A stretch with a lane open to the void (no road: a fall) and no wall at the sides; the road goes on in the other lanes.
      // Not beside pillars: a row of them needs its walls to run on (the way past), and the void would take them away.
      if (g.entities.some(e => e.kind === 'pillar' && e.z > z - 25 && e.z < z + 40) || g.holes.some(h => h.to > z - 25 && h.from < z + 40)) return z + 2;
      const lane = any(), from = z, to = from + 30 + d * 20;
      g.pits.push({lane, from, to, open: true});
      for (const w of g.walls) if (w.to > from && w.from < to) { w.void = true; w.runnable = false; }
      for (let k = from + 2; k < to - 2; k += 4) add(g, 'coin', pick(g, all.filter(l => l !== lane)), k);
      return to + 4;
    }
    case 'stairs': {
      // A stretch of stairs up along one lane, its flat top, and the stairs down: Benny walks them, no jump.
      const lane = any(), top = C.stairTop + d * .4, from = z, to = from + 2 * Math.round(top / C.stairRise) * C.stairTread + 10;
      g.ledges.push({lane, from, to, top});
      return to + 4;
    }
    case 'platform': {
      // A raised platform along one lane, coins on top; below it, rows of pillars in the other lanes: up from a springboard (or a wall).
      const lane = any(), from = z + g.speed * C.springMs / 1000 - 4, to = from + 26 + d * 20;
      add(g, 'spring', lane, z); // The springboard that lands her on it.
      g.platforms.push({lane, from, to});
      // Both walls runnable along it too: missing the ramp, a wall is still a way past the pillars.
      for (const w of g.walls) if (w.to > from - 25 && w.from <= to) w.runnable = true;
      for (let k = from - 2; k < to - 1; k += 3) add(g, 'coin', lane, k, {up: C.platformHeight + .5});
      for (const pz of [from + 9, from + 23].filter(p => p < to - 3)) for (const l of all) if (l !== lane) add(g, 'pillar', l, pz);
      return to + 4;
    }
    case 'wide': {
      // The road widens to five lanes a little way on (the edge clear of anything), for a long stretch.
      const from = z + 6, to = from + C.wideLen[0] + random(g) * (C.wideLen[1] - C.wideLen[0]);
      g.zones.push({from, to});
      return from + 4;
    }
    case 'skittles': {
      // A pot with creatures (or more pots) lined up behind it in the same lane: break them one after the other, for a combo.
      const lane = any(), count = 2 + (random(g) < .3 + .4 * d ? 1 : 0);
      add(g, 'pot', lane, z);
      for (let i = 1; i <= count; i++) add(g, random(g) < .6 ? pick(g, ['dragonnet', 'chest'] as const) : 'pot', lane, z + 2 + i * 6);
      return z + 2 + count * 6;
    }
    case 'hole': {
      // A gap across the road. A short one is jumped (an arc of coins over it); a long one has both walls runnable over it, with
      // coins on one wall then the other, to leap across for.
      const long = random(g) < .35 + .45 * d, [min, max] = long ? C.holeLong : C.holeShort, len = min + random(g) * (max - min) * (long ? .4 + .6 * d : 1);
      // A run-up of clear road first (0.4 s), so that a gap never starts right where the jump over the last barrier lands.
      z += g.speed * .4;
      g.holes.push({from: z, to: z + len});
      if (long) {
        for (const w of g.walls) if (w.to > z - 25 && w.from <= z + len + 5) { w.runnable = true; w.void = false; }
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
    const z = g.nextSpawnZ;
    // Nothing laid across an edge of a wide hall: the next thing starts just past it.
    const edge = g.zones.flatMap(w => [w.from, w.to]).find(b => b > z - 4 && b < z + C.wideClear);
    if (edge !== undefined) { g.nextSpawnZ = edge + 6; continue; }
    // Laid out with the lanes the road has there.
    const real = g.lanes; g.lanes = lanesAt(g, z);
    const end = layPattern(g, choosePattern(g, z), z), d = runDifficulty(g);
    // Now and then a Heart rides the road just past the pattern, in a lane of the road there. Worked out from where the pattern
    // ends, not drawn, so that the run's other draws (and the runs already tuned) stay the same.
    const tick = Math.floor(end * 10);
    if (z > C.heartFrom && tick % C.heartEvery === 0) add(g, 'heart', Math.floor(tick / C.heartEvery) % g.lanes, end + 1);
    g.lanes = real;
    const gap = C.gapStart - (C.gapStart - C.gapMin) * d - C.overtimeGap * runOvertime(g);
    g.nextSpawnZ = end + gap * (.85 + random(g) * .3);
  }
}

/** How many lanes the road has at `z` (m along it): five in a wide hall, else the usual. */
export const lanesAt = (g: BennyRun, z: number) => g.zones.some(w => w.from <= z && z < w.to) ? C.wideLanes : g.baseLanes;
/** Into or out of a wide hall: the lanes change under Benny's feet, her lane number with them (the middle stays the middle). */
function followLanes(g: BennyRun): void {
  const now = lanesAt(g, g.distance); if (now === g.lanes) return;
  const shift = (now - g.lanes) / 2; g.lanes = now; g.lane = Math.max(0, Math.min(now - 1, g.lane + shift));
  g.events.push({type: 'lanes', lanes: now, shift});
}
/** The gap Benny's feet are over (or the one at `z`), if any. */
export const holeAt = (g: BennyRun, z = g.distance) => g.holes.find(h => h.from <= z && z < h.to);
/** Into the void: a short fall, then the Dragon catches her and the run is over (see `tick`). */
function plunge(g: BennyRun): void {
  if (g.fallFrom !== null) return;
  g.fallFrom = g.at; g.slideUntil = 0; g.pound = false; g.wall = null; g.events.push({type: 'fall', onto: null});
}
/** Gusts on the mountain path: the warning as one comes, then the push when Benny reaches it. */
function followGusts(g: BennyRun): void {
  for (const w of g.gusts) {
    if (!w.warned && w.z - g.distance <= C.gustWarn) { w.warned = true; g.events.push({type: 'gust', dir: w.dir, warn: true}); }
    if (g.distance < w.z) continue;
    const to = g.lane + w.dir, pushed = !g.wall && !g.raised && to >= 0 && to < g.lanes;
    if (pushed) { g.lane = to; g.laneChangedAt = g.at; }
    g.events.push({type: 'gust', dir: w.dir, warn: false, pushed});
  }
  g.gusts = g.gusts.filter(w => g.distance < w.z);
}
/** The pit under Benny's feet, if any (one that has given way). */
export const pitAt = (g: BennyRun, lane = g.lane, z = g.distance) => g.pits.find(p => p.open && p.lane === lane && p.from <= z && z < p.to);
/** Slabs giving way as Benny comes; into one: a bump, then she scrambles out (a hop over the rest). */
function followPits(g: BennyRun): void {
  for (const p of g.pits) if (!p.open && p.from - g.distance <= C.crumbleAt) { p.open = true; g.events.push({type: 'crumble', pit: p}); }
  const pit = !g.wall && !g.raised && !inAir(g) && !powerActive(g, 'flight') && !powerActive(g, 'dash') ? pitAt(g) : undefined;
  if (pit) plunge(g);
  g.pits = g.pits.filter(p => p.to > g.distance - 10);
}
/** From one wall to the other over a gap: the run on the wall goes on, and it counts in the combo. */
function leap(g: BennyRun): void {
  const side: Side = g.wall!.side === 'left' ? 'right' : 'left';
  if (!runnableAt(g, side, g.distance)) return;
  // Leaps in a row without touching the ground: each one worth `leapChain` more than the last.
  const chain = (g.wall!.leaps ?? 0) + 1;
  g.wall = {side, until: g.at + C.wallMs, since: g.at, coins: g.wall!.coins, leaps: chain}; g.leaps++;
  g.combo = g.at <= g.comboUntil ? g.combo + 1 : 1; g.comboUntil = g.at + C.comboMs; g.bestCombo = Math.max(g.bestCombo, g.combo);
  const points = (C.points.wallLeap + C.points.leapChain * (chain - 1)) * comboMultiplier(g.combo); g.score = Math.min(C.maxScore, g.score + points);
  g.events.push({type: 'wallLeap', side, points, combo: g.combo, chain});
}
const isFoe = (e: RunEntity) => e.kind === 'flyer' || RUN_FOES.includes(e.kind as RunFoe);
const strikable = (e: RunEntity) => e.kind === 'pot' || isFoe(e);
/** The nearest pot or creature (or only creature) in `lane`, from just behind Benny to `reach` m ahead. */
const nearest = (g: BennyRun, lane: number, reach: number, which: (e: RunEntity) => boolean = strikable) => g.entities
  .filter(e => e.lane === lane && which(e) && lanesAt(g, e.z) === g.lanes && e.z - g.distance >= -C.hitHalf && e.z - g.distance <= reach).sort((a, b) => a.z - b.z)[0];
/** How far ahead the wand reaches at the present speed. */
export const reach = (g: BennyRun) => C.strikeReach + C.strikeLead * g.speed;
function strike(g: BennyRun, e: RunEntity, by: StrikeKind): void {
  // A chest takes two blows: the first throws it on along the road, the second breaks it.
  const first = e.kind === 'chest' && (e.hp ?? 2) > 1;
  if (first) e.hp = 1; else g.entities = g.entities.filter(o => o !== e);
  g.combo = g.at <= g.comboUntil ? g.combo + 1 : 1; g.comboUntil = g.at + C.comboMs; g.bestCombo = Math.max(g.bestCombo, g.combo);
  const multiplier = comboMultiplier(g.combo), points = first ? 0 : (e.kind === 'pot' ? C.points.pot * (e.gold ? C.goldPot : 1) : C.points.foe) * multiplier;
  g.score = Math.min(C.maxScore, g.score + points);
  if (first) { e.knock = C.chestKnock; g.events.push({type: 'strike', entity: e, points, combo: g.combo, multiplier, by}); return; }
  if (e.kind === 'pot') {
    g.pots++; if (e.gold) g.goldPots++;
    gainCoins(g, e, C.potCoins);
  } else { g.foes++; gainCoins(g, e, 2); }
  if (by === 'slide') { g.rollHits++; g.slideUntil = Math.max(g.slideUntil, g.at) + C.rollChainMs; }
  g.events.push({type: 'strike', entity: e, points, combo: g.combo, multiplier, by, ...(by === 'slide' ? {roll: g.rollHits} : {})});
}
function gainCoins(g: BennyRun, e: RunEntity, amount: number): void {
  const n = amount * (powerActive(g, 'double') ? 2 : 1); g.coins += n; g.events.push({type: 'coin', entity: e, amount: n});
}
/** A flight's road of coins up in the sky, winding from lane to lane, all along it. */
function skyTrail(g: BennyRun): void {
  g.entities = g.entities.filter(e => !e.sky);
  let lane = g.lane;
  for (let t = .6, k = 0; t < C.powers.flight / 1000 - .4; t += .2, k++) {
    if (k > 0 && k % 6 === 0) lane = pick(g, laneList(g).filter(l => Math.abs(l - lane) === 1));
    add(g, 'coin', lane, g.distance + g.speed * t, {up: 3.1, sky: true});
  }
}
/** The end of a flight: Benny glides down from its height, onto a clear spot (what stood just ahead of her is swept away). */
function landFromFlight(g: BennyRun): void {
  g.jumpFrom = 3; g.airFrom = g.at; g.airUntil = g.at + C.jumpMs * (1 + 3 / (2 * C.jumpHeight)); g.slideUntil = 0; g.pound = false;
  const clear = g.distance + g.speed * (g.airUntil - g.at) / 1000 + 4;
  // The sky's coins she has not reached are gone with the flight.
  g.entities = g.entities.filter(e => !e.sky && (e.kind === 'coin' || e.kind === 'wallCoin' || e.kind === 'power' || e.z < g.distance || e.z > clear));
  g.holes = g.holes.filter(h => h.to < g.distance || h.from > clear); g.pits = g.pits.filter(p => p.to < g.distance || p.from > clear);
  g.events.push({type: 'landing'});
}
function usePower(g: BennyRun, power: RunPower): void {
  // A new power picked up in flight: she glides down first.
  if (powerActive(g, 'flight') && power !== 'flight') landFromFlight(g);
  g.active = {power, until: g.at + C.powers[power]};
  if (power === 'flight') { g.wall = null; g.airUntil = 0; g.pound = false; g.slideUntil = 0; skyTrail(g); }
  g.events.push({type: 'power', power});
}
function bump(g: BennyRun, e: RunEntity): void {
  g.entities = g.entities.filter(o => o !== e);
  if (powerActive(g, 'bubble')) { g.active = null; g.events.push({type: 'shield', entity: e}); return; }
  g.combo = 0; g.comboUntil = 0;
  // « Run without a bump »: it starts again from here.
  if (g.challenge?.kind === 'clean') g.challenge.from = Math.floor(g.distance);
  // During the tutorial a bump only makes her stumble.
  if (g.tutorial) { g.stumbleUntil = g.at + C.stumbleMs; g.slideUntil = 0; g.events.push({type: 'bump', entity: e}); return; }
  if (dragonNear(g)) { g.over = true; g.events.push({type: 'caught', entity: e}); return; }
  g.lastBumpAt = g.at; g.stumbleUntil = g.at + C.stumbleMs; g.slideUntil = 0;
  g.events.push({type: 'bump', entity: e});
}
/** A ground charge starting now, from Benny's present height (or `from` m when leaving a wall): the higher, the longer the fall. */
/** A bounce off a creature in the air (struck from above, or on its head): a shorter jump from where she is, so that the next creature's
 * head or flying monster can be struck in the air too (combos in the air). */
function rebound(g: BennyRun): void {
  const from = airHeight(g);
  g.jumpFrom = from; g.airFrom = g.at; g.airUntil = g.at + C.jumpMs * .6 * (1 + from / (2 * C.jumpHeight));
  g.bounceUntil = -1; g.pound = false; g.slideUntil = 0;
}
function startPound(g: BennyRun, from = airHeight(g)): void {
  g.poundFrom = Math.max(from, .3); g.pound = true; g.airFrom = g.at; g.airUntil = g.at + C.poundMs * Math.max(1, Math.sqrt(g.poundFrom / C.jumpHeight)); g.slideUntil = 0;
}
function endWall(g: BennyRun): void {
  const side = g.wall!.side, trail = g.wall!.coins ?? 0, since = g.wall!.since ?? g.at; g.wall = null; g.lane = side === 'left' ? 0 : g.lanes - 1; g.laneChangedAt = g.at;
  // Down from the wall onto a platform along the edge lane: she lands on top of it.
  const p = platformAt(g, g.lane, g.distance); if (p && g.distance >= p.from) g.raised = p;
  g.wallRuns++;
  // Running on a wall adds no combo, but keeps the one under way; its points follow the time spent up there.
  if (g.combo) g.comboUntil = Math.max(g.comboUntil, g.at + C.comboMs);
  // A trail of coins picked up all along the wall: a bonus for each.
  const bonus = trail >= C.wallTrailMin ? trail * C.points.wallTrail : 0;
  const points = Math.round(C.points.wallPerSecond * (g.at - since) / 1000 * comboMultiplier(g.combo)) + bonus; g.score = Math.min(C.maxScore, g.score + points);
  g.events.push({type: 'wallEnd', side, points, trail: bonus ? trail : 0});
}

/** What happens when a thing reaches Benny without having been struck. */
function meet(g: BennyRun, e: RunEntity): void {
  // Over the void beside the road: nothing on the road reaches her.
  if (g.overVoid) return;
  // A pot on a wall: broken by running along that wall, otherwise left behind.
  if (e.kind === 'pot' && (e.lane < 0 || e.lane >= g.lanes)) { if (g.wall && wallLane(g, g.wall.side) === e.lane) strike(g, e, 'wall'); return; }
  if (e.kind === 'wallCoin') {
    if (g.wall && wallLane(g, g.wall.side) === e.lane) { g.entities = g.entities.filter(o => o !== e); gainCoins(g, e, 1); g.wall.coins = (g.wall.coins ?? 0) + 1; }
    return;
  }
  if (e.kind === 'power') {
    // Picked up on the ground, in the air or flying, never from a wall; it works at once.
    if (e.lane === g.lane && !g.wall && e.power) { g.entities = g.entities.filter(o => o !== e); usePower(g, e.power); }
    return;
  }
  if (e.kind === 'heart') {
    // A Heart on the road: picked up in her lane on the ground or in the air, never from a wall.
    if (e.lane === g.lane && !g.wall) { g.entities = g.entities.filter(o => o !== e); g.hearts++; g.events.push({type: 'heart', entity: e}); }
    return;
  }
  if (e.kind === 'coin') {
    if (g.wall) return;
    if (e.lane === g.lane || powerActive(g, 'magnet')) { g.entities = g.entities.filter(o => o !== e); gainCoins(g, e, 1); }
    return;
  }
  // Out of the way at the last moment: a few points.
  if (e.lane !== g.lane && e.lane === g.laneFrom && g.at - g.laneChangedAt <= C.closeMs && !g.wall && !g.raised && ['pillar', 'fireball', 'barrier', 'beam'].includes(e.kind)) {
    g.score = Math.min(C.maxScore, g.score + C.points.close); g.events.push({type: 'close', entity: e, points: C.points.close});
  }
  if (e.lane !== g.lane || g.wall || g.raised || powerActive(g, 'flight')) return;
  // Charging: pots and creatures struck, fences, logs and pillars smashed.
  if (powerActive(g, 'dash')) {
    if (e.kind === 'pot' || isFoe(e)) { strike(g, e, 'dash'); return; }
    g.entities = g.entities.filter(o => o !== e); g.score = Math.min(C.maxScore, g.score + C.dashSmash); g.events.push({type: 'cleared', entity: e, points: C.dashSmash}); return;
  }
  // Bounced high: everything on the road passes beneath.
  if (airHeight(g) > C.overHeight) return;
  // A springboard met on the ground (or rolling): up she goes.
  if (e.kind === 'spring') {
    if (!inAir(g)) {
      g.slideUntil = 0; g.jumpFrom = 0; g.airFrom = g.at; g.airUntil = g.bounceUntil = g.at + C.springMs; g.events.push({type: 'bounce'});
      g.landHeight = platformAt(g, e.lane, g.distance + g.speed * C.springMs / 1000) ? C.platformHeight : 0;
    }
    return;
  }
  // In the air at all (even just taking off or about to land) clears a barrier or a pot.
  const high = inAir(g) || runHeight(g) > C.clearHeight;
  switch (e.kind) {
    case 'pot':
      if (sliding(g)) { strike(g, e, 'slide'); return; }
      if (high) { g.events.push({type: 'cleared', entity: e}); return; }
      g.entities = g.entities.filter(o => o !== e); g.events.push({type: 'crash', entity: e}); return;
    case 'barrier': if (high) dodge(g, e); else bump(g, e); return;
    // A mine cart is too tall to jump: only stepping aside (or a charge) gets past it.
    case 'fireball': if (high && !e.cart) dodge(g, e); else bump(g, e); return;
    case 'beam': if (sliding(g) || (!inAir(g) && g.at < g.slideUntil + C.slideGraceMs)) dodge(g, e); else bump(g, e); return;
    // A creature: sliding into it strikes it; otherwise, even jumping over it, it strikes Benny as she passes.
    // A chest thrown on by this roll is not struck again by it: it is struck again only by a new blow.
    case 'dragonnet': case 'chest': case 'ember': if (e.knock) return; if (sliding(g)) strike(g, e, 'slide'); else bump(g, e); return;
    // A flying monster hovers over the road: jumping through its height strikes it; running under it does nothing; on a wall it
    // reaches her, and a slide strikes it.
    case 'flyer':
      if (sliding(g)) strike(g, e, 'slide');
      else if (g.wall) bump(g, e);
      else if (inAir(g) && runHeight(g) >= C.flyerHeight) { strike(g, e, 'jump'); rebound(g); }
      return;
    case 'pillar': bump(g, e); return;
  }
}

function tick(g: BennyRun): void {
  // Falling: the drop, then the Dragon catches her and the run is over.
  if (g.fallFrom !== null) { if (g.at - g.fallFrom >= C.fallMs) { g.over = true; g.events.push({type: 'caught', entity: {id: 0, kind: 'hole', lane: g.lane, z: g.distance}}); } return; }
  const dt = C.step / 1000, eventsBefore = g.events.length;
  if (g.tutorial) { g.paceFrom += C.step; g.nextSettingAt += C.step; g.nextChallengeAt += C.step; }
  if (g.active && g.at >= g.active.until) { if (g.active.power === 'flight') landFromFlight(g); g.active = null; }
  if (g.combo >= C.seriesMin && g.comboUntil > 0 && g.at > g.comboUntil) {
    const points = g.combo * C.seriesPoints; g.score = Math.min(C.maxScore, g.score + points); g.events.push({type: 'series', length: g.combo, points});
    g.combo = 0; g.comboUntil = 0;
  }
  const base = C.speedStart + (C.speedMax - C.speedStart) * (1 - (1 - runDifficulty(g)) ** C.speedEase) + C.overtimeSpeed * runOvertime(g);
  if (runDifficulty(g) >= 1 && g.pace < Math.min(C.overtimeMax, 1 + Math.floor(runOvertime(g)))) { g.pace++; g.events.push({type: 'faster', pace: g.pace}); }
  g.speed = base * (g.at < g.stumbleUntil ? C.stumbleSlow : 1) * (powerActive(g, 'dash') ? C.dashSpeed : 1);
  const before = g.distance; g.distance += g.speed * dt;
  // A new setting is chosen ahead, then reached.
  if (g.at >= g.nextSettingAt && !g.upcoming) {
    g.upcoming = {setting: pick(g, RUN_SETTINGS.filter(s => s !== g.setting)), z: g.distance + C.settingAhead}; g.nextSettingAt = g.at + settingDelay(g);
    // Rocks hang only from the cave's ceiling, vents only on the lava bridge, gusts only on the mountain: none past where they end.
    const end = g.upcoming.z; g.entities = g.entities.filter(e => !((e.rock || e.geyser || e.kind === 'fireball') && e.z >= end)); g.gusts = g.gusts.filter(w => w.z < end);
  }
  followLanes(g); followPlatform(g);
  // A combo waits while she rolls, is in the air or on a wall: it ends only when she runs on the track doing nothing.
  if (g.combo && (g.wall || inAir(g) || g.pound || g.at < g.slideUntil)) g.comboUntil = Math.max(g.comboUntil, g.at + C.comboMs);
  if (g.upcoming && g.distance >= g.upcoming.z) { g.setting = g.upcoming.setting; g.upcoming = null; g.events.push({type: 'setting', setting: g.setting}); }
  // Landing: a ground charge breaks the pots and creatures just ahead in Benny's lane; from high up, a shock wave strikes all around.
  // Falling onto a creature's head with a downward swipe: it breaks, and she rebounds off it.
  if (g.pound && inAir(g) && runHeight(g) <= C.headHeight) {
    const head = g.entities.find(o => isFoe(o) && o.lane === g.lane && lanesAt(g, o.z) === g.lanes && Math.abs(o.z - g.distance) <= C.hitHalf);
    if (head) { strike(g, head, 'pound'); rebound(g); }
  }
  if (g.pound && !inAir(g)) {
    g.pound = false; g.events.push({type: 'pound'}); g.slideUntil = g.at + C.poundRollMs; g.rollHits = 0;
    if (g.poundFrom >= C.shockHeight) {
      g.events.push({type: 'shockwave'});
      for (const e of g.entities.filter(o => strikable(o) && o.z - g.distance >= -C.shockBehind && o.z - g.distance <= C.shockReach)) strike(g, e, 'shock');
    } else for (const e of g.entities.filter(o => o.lane === g.lane && lanesAt(g, o.z) === g.lanes && strikable(o) && o.z - g.distance >= -C.hitHalf && o.z - g.distance <= C.poundReach)) strike(g, e, 'pound');
  }
  // Over the void beside the road when the jump ends: she falls, unless a wall has come back there (then she is back on the road).
  // (She stays drawn out over the void as she falls.)
  if (g.overVoid && !inAir(g)) { if (voidAt(g, g.overVoid)) plunge(g); else g.overVoid = null; }
  // Over a gap, the run on a wall does not run out.
  if (g.wall && ((g.at >= g.wall.until && !holeAt(g)) || !runnableAt(g, g.wall.side, g.distance))) endWall(g);
  if (!g.wall && !g.raised && !inAir(g) && !powerActive(g, 'flight') && !powerActive(g, 'dash') && holeAt(g)) plunge(g);
  if (!g.over) followPits(g);
  followGusts(g);
  if (!g.tutorial && g.distance >= (g.kms + 1) * 1000) { g.kms++; const points = C.points.km * g.kms; g.score = Math.min(C.maxScore, g.score + points); g.events.push({type: 'km', km: g.kms, points}); }
  // Under a tunnel of logs, a roll goes on while there is another log just ahead: one long slide.
  if (sliding(g) && g.slideUntil - g.at < 120 && g.entities.some(e => e.kind === 'beam' && e.lane === g.lane && e.z >= g.distance && e.z - g.distance <= C.burrowKeep)) g.slideUntil = g.at + 120;
  if (g.over) return;
  // A jump asked for just before landing.
  if (g.queuedJumpUntil && !inAir(g) && !g.wall) { const fresh = g.at <= g.queuedJumpUntil; g.queuedJumpUntil = 0; if (fresh) runInput(g, g.at, 'up'); }
  for (const e of g.entities) if (e.rock === 'up' && e.z - g.distance <= C.rockLand) { e.rock = 'down'; g.events.push({type: 'rockfall', entity: e}); }
  for (const e of g.entities) if (e.geyser === 'idle' && e.z - g.distance <= C.geyserAt) { e.geyser = 'up'; g.events.push({type: 'geyser', entity: e}); }
  // A chest struck once is thrown on along the road: it knocks down the creatures and pots it meets, and breaks against decor or in a hole.
  for (const e of [...g.entities]) if (e.kind === 'chest' && e.knock) {
    const move = Math.min(e.knock, C.chestFlyStep), left = e.knock - move; e.z += move; e.knock = left > 1e-9 ? left : undefined;
    const broken = () => { g.entities = g.entities.filter(o => o !== e); g.events.push({type: 'crash', entity: e}); };
    if (holeAt(g, e.z) || g.pits.some(p => p.open && p.lane === e.lane && e.z >= p.from && e.z < p.to)) { broken(); continue; }
    if (g.entities.some(o => o !== e && ['pillar', 'barrier', 'beam'].includes(o.kind) && o.lane === e.lane && Math.abs(o.z - e.z) < C.hitHalf)) { broken(); continue; }
    const met = g.entities.find(o => o !== e && o.lane === e.lane && Math.abs(o.z - e.z) < C.hitHalf && (o.kind === 'pot' || (isFoe(o) && o.kind !== 'chest')));
    if (met) strike(g, met, 'chest');
  }
  // Fireballs roll towards Benny once she is near (their way this tick counts for the meeting below).
  const roll = (e: RunEntity) => e.rolling ? (e.cart ? C.cartSpeed : C.fireSpeed) * dt : 0;
  for (const e of g.entities) if (e.kind === 'fireball' && e.z - g.distance < C.fireFrom) { e.rolling = true; e.z -= roll(e); }
  for (const e of [...g.entities]) {
    if (g.over) break;
    if (e.z + roll(e) - before > C.hitHalf - 1e-9 && e.z - g.distance <= C.hitHalf) meet(g, e);
  }
  // A creature in the next lane that Benny has just passed without striking it strikes her (not flying). On a wall, only a flying
  // monster reaches her, from the edge lane: it keeps to her height.
  for (const e of g.entities) if (isFoe(e) && lanesAt(g, e.z) === g.lanes && Math.abs(e.lane - across(g)) === 1 && e.z - g.distance >= Math.max(C.besideFrom, g.speed * C.besideMs / 1000) && e.z - g.distance <= reach(g)) e.beside = true;
  for (const e of [...g.entities]) {
    if (g.over) break;
    if (isFoe(e) && e.beside && Math.abs(e.lane - across(g)) === 1 && ((!g.wall && !g.raised) || e.kind === 'flyer') && e.z - before > -C.hitHalf - 1e-9 && e.z - g.distance <= -C.hitHalf && !powerActive(g, 'flight') && airHeight(g) <= C.overHeight) bump(g, e);
  }
  if (g.tutorial) followTutorial(g, g.events.slice(eventsBefore)); else followChallenge(g);
  g.entities = g.entities.filter(e => e.z > g.distance - 5);
  g.holes = g.holes.filter(h => h.to > g.distance - 5);
  g.zones = g.zones.filter(w => w.to > g.distance - 20);
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
    case 'clean': return Math.min(1500, 300 + 100 * n);
    case 'dodges': return 4 + n;
    case 'leaps': return 2 + Math.floor(n / 7);
  }
}
const challengeCounter = (g: BennyRun, kind: ChallengeKind) =>
  kind === 'pots' ? g.pots : kind === 'coins' ? g.coins : kind === 'foes' ? g.foes : kind === 'walls' ? g.wallRuns : kind === 'dodges' ? g.dodges : kind === 'leaps' ? g.leaps : kind === 'clean' ? Math.floor(g.distance) : 0;
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
  const points = C.points.dodge; g.score += points; g.dodges++; g.events.push({type: 'cleared', entity: e, points});
}

export function advanceBennyRun(g: BennyRun, now: number): void {
  while (!g.over && g.at + C.step <= now) { g.at += C.step; tick(g); shareScore(g); }
}
/** The points won since last time go to the setting Benny is in. */
function shareScore(g: BennyRun): void {
  if (g.score !== g.scored) { g.scoreBy[g.setting] += g.score - g.scored; g.scored = g.score; }
}

/** One of the player's gestures, at `now`. */
/** Benny lands in lane `target` (from `from`, with a step `step`): the wand strikes every pot or creature within reach in that lane (owner:
 * two creatures in the lane, both fall at once); with a creature on her other side as well, she spins and strikes it. */
/** The void beside the road on `side` where Benny is (no wall there). */
const voidAt = (g: BennyRun, side: Side) => g.walls.some(w => w.side === side && w.void && g.distance >= w.from && g.distance < w.to);
/** A lane change in the air (owner, 13 Nov.): she keeps her height, unless a creature or a pot waits in the new lane within reach:
 *  then she dives on it, strikes it and is back on the ground. */
function airMove(g: BennyRun, from: number, target: number, step: number): void {
  if (nearest(g, target, reach(g))) { g.airUntil = g.at; g.jumpFrom = 0; g.pound = false; if (g.raised) dropOff(g); arrive(g, from, target, step); return; }
  g.lane = target; g.laneChangedAt = g.at; g.laneFrom = from;
}
function arrive(g: BennyRun, from: number, target: number, step: number): void {
  g.lane = target; g.laneChangedAt = g.at; g.laneFrom = from;
  const first = nearest(g, target, reach(g)), behind = first ? nearest(g, from - step, reach(g), isFoe) : undefined;
  // The long blow (owner: « Benny est tout à gauche, un ennemi tout à droite : glisser une fois vers la droite attaque l'ennemi et
  // Benny se retrouve sur la voie du milieu » ; « un ennemi au milieu et un à droite : elle attaque les deux d'un coup, s'ils sont
  // sur la même ligne »).
  const beyond = target + step >= 0 && target + step < g.lanes ? nearest(g, target + step, reach(g), isFoe) : undefined;
  const far = beyond && (!first || Math.abs(beyond.z - first.z) <= C.farLine) ? beyond : undefined;
  // Each thing is struck once per move: a chest knocked by this blow flies on and waits for the next one (it takes two).
  const struck = new Set<number>();
  for (let hit = first; hit; hit = nearest(g, target, reach(g), e => strikable(e) && !struck.has(e.id))) { struck.add(hit.id); strike(g, hit, 'lane'); }
  if (far) strike(g, far, 'far');
  if (behind && isFoe(first!)) strike(g, behind, 'spin');
}
export function runInput(g: BennyRun, now: number, input: RunInput): void {
  advanceBennyRun(g, now);
  if (g.over || g.fallFrom !== null) return;
  switch (input) {
    case 'left': case 'right': {
      const step = input === 'left' ? -1 : 1, side: Side = input;
      // Off the wall by swiping away from it, striking on the way down what waits in the edge lane.
      if (g.wall && holeAt(g)) { if (g.wall.side !== side) leap(g); return; }
      // Off the wall by swiping away from it: she comes down into the next lane at once, striking what is there.
      if (g.wall) { if (g.wall.side !== side) { const from = g.lane; endWall(g); if (g.lane + step >= 0 && g.lane + step <= g.lanes - 1) arrive(g, from, g.lane + step, step); } return; }
      // Over the void: back towards the road, she is over her edge lane again (diving on what waits there); further out, nothing.
      if (g.overVoid) { if (g.overVoid !== side) { g.overVoid = null; airMove(g, g.lane - step, g.lane, step); } return; }
      const target = g.lane + step;
      if (target < 0 || target > g.lanes - 1) {
        if (runnableAt(g, side, g.distance) && !powerActive(g, 'flight')) {
          // From the ground or in the middle of a jump.
          g.wall = {side, until: g.at + C.wallMs, since: g.at}; g.airUntil = 0; g.pound = false; g.slideUntil = 0;
          g.events.push({type: 'wallStart', side});
        } else if (!powerActive(g, 'flight') && voidAt(g, side)) {
          // The void at the side: in the air she goes out over it (owner: « au-dessus donc il ne perd pas »), on the ground she falls.
          if (inAir(g)) { g.overVoid = side; g.laneFrom = g.lane; g.laneChangedAt = g.at; g.events.push({type: 'overVoid', side}); } else plunge(g);
        }
        return;
      }
      // Stairs: a step sideways only when the step is low enough; a higher ledge needs a jump (in the air, any lane is fine).
      if (!inAir(g) && ledgeHeight(g, target, g.distance) - floorHeight(g) > C.stepMax) { g.events.push({type: 'blocked'}); return; }
      if (inAir(g) && !powerActive(g, 'flight')) { airMove(g, g.lane, target, step); return; }
      if (g.raised) dropOff(g);
      const from = g.lane; arrive(g, from, target, step);
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
      g.slideUntil = g.at + C.slideMs; g.rollHits = 0;
      // The roll strikes only what touches Benny's own hit-box, not what is ahead of her.
      const hit = nearest(g, g.lane, C.hitHalf);
      if (hit) strike(g, hit, 'slide');
      return;
    }
  }
}

/** The events since the last call, for the display (sounds, sparks, the score popping). */
export function takeRunEvents(g: BennyRun): RunEvent[] { const e = g.events; g.events = []; return e; }

/** The longest distance a saved run may claim: an hour at full speed, far beyond any real run. */
export const BENNY_RUN_MAX_METRES = 24 * 3600;
export interface RunSummary {score: number; bySetting: Record<RunSetting, number>; metres: number; coins: number; hearts: number; pots: number; goldPots: number; foes: number; wallRuns: number; leaps: number; dodges: number; bestCombo: number; seconds: number; challenges: number}
export const runSummary = (g: BennyRun): RunSummary => ({score: g.score, bySetting: (shareScore(g), {...g.scoreBy}), metres: Math.floor(g.distance), coins: g.coins, hearts: g.hearts, pots: g.pots, goldPots: g.goldPots, foes: g.foes,
  wallRuns: g.wallRuns, leaps: g.leaps, dodges: g.dodges, bestCombo: g.bestCombo, seconds: Math.floor((g.at - g.startedAt) / 1000), challenges: g.challengesDone});
