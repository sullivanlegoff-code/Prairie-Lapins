/**
 * The tables of « Benny Rampage » (lot 2.8, 23 Nov. 2026: the screen's file cut up, without changing anything): the paintings' names
 * and timings, the camera's and the road's sizes, the decor and its sides, the fog, the skies and the arches, the run's words.
 * The screen itself (drawing, gestures, cards) is src/ui/BennyRunActivity.ts.
 */
import {BENNY_RUN_SETTING_SHORT, type ChallengeKind, type RunPower, type RunSetting} from '../simulation/bennyRun';
import {RUN_SIDES, type RunSidePicture} from '../config/bennyRunSides';
/** The paintings' frames (scripts/prepare-benny-run-art.mjs): Benny's square stands her on its bottom, the Dragon's is centred on her body. */
export type PaintedName = 'benny' | 'benny-moves' | 'benny-strike' | 'benny-roll' | AnimSheet | 'dragon' | 'creatures' | 'creatures-lave' | 'creatures-neige' | 'attaques' | 'chests' | 'objets' | 'pieces' | 'obstacles' | 'eclats';
/** Benny's detailed animation (17 Nov.): her gallop, her wall-run, her leans, her actions (see scripts/prepare-benny-run-art.mjs). */
export type AnimSheet = 'benny-galop' | 'benny-saut' | 'benny-coup' | 'benny-mur-a' | 'benny-mur-b' | 'benny-actions' | 'benny-actions2';
export const ANIM: AnimSheet[] = ['benny-galop', 'benny-saut', 'benny-coup', 'benny-mur-a', 'benny-mur-b', 'benny-actions', 'benny-actions2'];
export const PAINTED: PaintedName[] = [...ANIM, 'benny', 'benny-moves', 'benny-strike', 'benny-roll', 'dragon', 'creatures', 'creatures-lave', 'creatures-neige', 'attaques', 'chests', 'objets', 'pieces', 'obstacles', 'eclats'];
/** The run's coin (owner, 17 Nov.: « similaire à celle du jeu de lapin mais adapté »): the game's paw coin, turning once every
 *  `COIN_SPIN_MS`, each coin at its own point of the turn. */
export const COIN_SPIN_MS = 760;
export const coinFrame = (at: number, id: number) => `spin-${Math.floor(((at / COIN_SPIN_MS + id * .37) % 1 + 1) % 1 * 8) + 1}`;
/** Each world's creatures (17 Nov.): the same dragonnet, ember and flyer, in basalt and magma on the lava, in ice and snow on the mountain. */
export const FOE_SHEETS = {grotte: 'creatures', pont: 'creatures-lave', montagne: 'creatures-neige'} as const satisfies Record<RunSetting, PaintedName>;
/** Painted Benny's square, in Benny's sizes (her shape was one size tall): the drawing, ears up, fills about four fifths of it. */
export const PAINTED_BENNY = 1.85;
/** How long each struck creature takes to melt away (ms); a chest stays broken open a little longer. */
/** How long Benny's passing poses last (ms), checked frame by frame in slow motion on 13 Nov.: the wind-up only just before the
 *  swing (the strike's points and rainbow sweep are already there), the swing as long as its sweep (220 ms), the push off onto a
 *  wall while she tips towards it. */
export const POSE_MS = {windup: 40, strike: 200, push: 180};
/** The landing pose lasts half a stride (a stride every 1.6 m: 73 ms at the start, 33 at top speed), three frames at least, so her
 *  paws never stop while the road runs on. */
export const landHold = (g: {speed: number}) => Math.max(50, .8 / Math.max(1, g.speed) * 1000);
/** The lane strike as a little hop (owner, 13 Nov.: « un mini saut avec un peu d'inertie pour vraiment mettre un coup de bâton
 *  au monstre »), each painted pose until (ms): the spring, the bound with the wand raised, the blow, the landing. The blow lands
 *  on the creature at `HOP_MS.bound`: its shards, its ring and the freeze wait until then, and it starts to vanish only then. */
export const HOP_MS = {spring: 40, bound: 90, blow: 200, land: 320};
/** How high the hop goes (m), and how far past her lane she is carried by the blow before she settles (lanes). */
export const HOP_HEIGHT = .55, HOP_CARRY = .1;
/** A whole forward roll (about, ms): four painted quarters, the wand held over her head going round with her. A roll is a whole
 *  number of turns (its turn stretched to fit), so that she always ends it getting up (the fourth quarter). */
export const ROLL_TURN = 300;
/** Benny's glide between lanes: a spring a touch under-damped, so that she is carried a little past her lane and settles. */
export const GLIDE = {pull: 900, damp: 48};
/** The wall run: Benny's body tips over (rad, about the lean of a lane runner's hero on a wall) until her paws are on the wall's
 *  light blue base, and she runs there stride after stride, earth flying from her paws. The camera does not move for it: no roll,
 *  no shift towards the wall (owner, 16 Nov.), so the wall's face stays wide open and she is seen on it. */
export const WALL_TILT = .6;
/** Her wings in flight: beats a second (as on the island) and how long they take to open out or fold away. */
export const WING_FPS = 11, WING_CHANGE_MS = 520;
/** Her run: eight pictures every `GALLOP_M` metres (one sheet). Formerly her gallop: eight pictures (push off a paw, paws gathered, flight, landing, then off the other paw, the stretch, the long
 *  flight, the tuck), four every `GALLOP_M` metres run, so her paws go quicker
 *  as she speeds up; on a wall, four strides every `WALL_STRIDE_M`. Her wall pictures are painted already lying onto the wall:
 *  only a little more tilt (`WALL_TILT_PAINTED`). A lane change leans her in (`TURN_SPEED`: lanes a second for the first and the
 *  strong lean). How long the climb onto a wall, the landing on the wall after a bound, the jump off a wall, the impact of a
 *  ground charge, the bump and a big landing are shown (ms). */
export const GALLOP_M = 2.4, WALL_STRIDE_M = 2, WALL_TILT_PAINTED = .12, TURN_SPEED = [2.2];
export const ANIM_MS = {climb: 230, catch: 150, down: 260, impact: 200, bump: 280, crouch: 170};
/** Which of four pictures of a cycle `length` metres long she is in, `distance` metres into her run (1 to 4). */
export const cycleFrame = (distance: number, length: number, count = 4) => Math.floor(((distance / length) % 1 + 1) % 1 * count) + 1;
export const GHOST_MS: Partial<Record<string, number>> = {chest: 520, dragonnet: 420, ember: 380, flyer: 400};
/** A dragonnet wakes up this close to Benny (m). */
export const DRAGONNET_WAKES = 7;
/** The creatures go for Benny (17 Nov., owner: « les ennemis doivent bouger et attaquer Benny sauf si Benny les attaque avant ou qu'ils
 *  sont trop loin »): in her lane or the next, from `AIM_FROM` m they wake, hop and lean towards her; from `LUNGE_FROM` m they pounce
 *  (their attack pose), and one she passed without striking it lands on her (the rules' bump beside her). Two lanes away: too far. */
export const AIM_FROM = 16, LUNGE_FROM = 4.5;
/** How long a creature that struck Benny stays on her, pouncing, ms. */
export const POUNCE_MS = 340;
/** The Dragon's flight from behind: her two wing beats, each held this long. */
export const WING_BEAT = 120;

/**
 * « Benny Rampage » (src/simulation/bennyRun.ts holds the rules): a full-screen layer like « Le vol de Benny ». This is the
 * grey prototype the owner tunes the feel with (11 November 2026): plain shapes on a canvas, the road seen from behind Benny in
 * perspective, until the painted art he chose (Benny seen from behind, the « conte doré » settings, the rainbow-ribbon wand, the
 * dragonnets, greedy chests and embers) replaces them. Swipes: up jump, down slide (it strikes) or ground charge, sideways lane or wall;
 * a power works as soon as Benny runs over it. The arrow keys do the same. The island's Phaser loop sleeps while the run is open.
 * Played with the iPhone upright only (owner, 11 November 2026): turned sideways, the run pauses behind a « tourne ton iPhone » card.
 */
export const HORIZON = .21, LANE_WIDTH = 2.2, CAMERA_BACK = 12, WALL_HEIGHT = 4.5, BENNY_SIZE = 2, FAR = 90, NEAR = -(CAMERA_BACK - .6);
// The new decor (concept C, owner's pick): meadow and wooden planks over a cloud sky. All three settings share it for now; their
// records stay as they are.
export const SKY_COLOURS = {sky: '#f6c9a2', ground: '#8fc25a', lane: '#c69a5e', wall: '#b8895a', wallOff: '#6e7480', side: '#f5cdb0', hole: '#8a5ba8', holeEdge: '#ffd6a8'};
export const SETTING_COLOURS: Record<RunSetting, typeof SKY_COLOURS> = {grotte: SKY_COLOURS, pont: SKY_COLOURS, montagne: SKY_COLOURS};
/** Until each setting has its own painting, a light wash over the painted world (not the characters) tells them apart: gold in the
 *  cave, lava red on the bridge, cool blue on the mountain path; it fades from one to the next with the sky. */
// (16 Nov.: each world has its painted sky, ground, walls and things now; only a breath of it is left, to tie the characters in.)
export const SETTING_WASH: Record<RunSetting, [number, number, number, number]> = {grotte: [255, 196, 90, .05], pont: [255, 84, 40, .06], montagne: [120, 170, 255, .05]};
/** The weather of each world, drawn over the track (not over the characters): embers rising over the lava, light snowflakes on the
 *  mountain path, `WEATHER` of them. */
export const WEATHER = {pont: 22, montagne: 46} as const;
/** The painted square textures of the track (scripts/prepare-benny-run-decor.mjs): planks, slabs, the verges, the isles' cliff at the
 *  edge of the void, the stones of the stairs and of the walls in the middle of the road, the lava's and the snow's grass tufts, the
 *  things beside the road and the gates. */
/** The pictures the painted floor needs (the rest is drawn from its own picture when it has loaded). */
export const FLOOR_DECOR = ['decor-herbe', 'decor-dalles'] as const;
/** The field of tall grass on both sides (RUN_SIDES.grass.field). */
export const FIELD = RUN_SIDES.grass.field, BLADES = RUN_SIDES.grass.blades, FLOOR_RATIO = 1.5;
/** How far ahead the fence's back face is drawn (m): farther, too thin on the screen to be seen behind its front. */
export const FENCE_BACK_NEAR = 25;
/** The things along the road's sides (the painted things on the verges, the fences): set aside for now (owner, 21 Nov. 2026: « supprime
 *  pour le moment tous les objets à droite à gauche, on les remettra ensuite »; the fence came back in volume). True brings them back. */
export const SIDE_THINGS = false;
/** The paintings of the ground drawn by the graphics card: the meadow, the road's slabs, a bridge's planks. */
export const FLOOR_PICTURES: readonly DecorName[] = ['decor-herbe', 'decor-dalles', 'decor-planches', 'decor-champ', 'decor-brins'];
export const DECOR = ['decor-planches', 'decor-herbe', 'decor-falaise', 'decor-dalles', 'decor-dalles-lave', 'decor-dalles-neige', 'decor-socle-framboise', 'decor-corps-creme', 'decor-corps-ocre', 'decor-lave-pierre', 'decor-lave-sol', 'decor-neige-pierre', 'decor-neige-sol', 'decor-lave-socle-sombre', 'decor-lave-corps-basalte', 'decor-lave-corps-roche', 'decor-neige-socle-bois', 'decor-neige-corps-pierre', 'decor-neige-corps-roche', 'decor-bord', 'decor-bord-lave', 'decor-bord-neige', 'decor-arche-prairie', 'decor-arche-lave', 'decor-arche-neige', 'decor-champ', 'decor-brins'] as const;
export type DecorName = typeof DECOR[number];
/** The run's decor tiles (for the tests). */
export const BENNY_RUN_DECOR: readonly string[] = DECOR;
/** A painted strip of the sides of the road (RUN_SIDES), three copies end to end, at its size, then at a half, a quarter and an eighth
 *  of it (`w` × `h` px a copy): each column is drawn from the one nearest its size on the screen, so it stays smooth, not grainy. */
export type StripLevel = {el: CanvasImageSource; w: number; h: number};
export type StripPicture = StripLevel[];
export const STRIP_LEVELS = 4;
export const stripKey = (p: RunSidePicture) => `${p.file}:${p.crop ?? ''}`;
export const SIDE_PICTURES = [...new Map([RUN_SIDES.grass, RUN_SIDES.fence, RUN_SIDES.wall].flatMap(s => Object.values(s.picture) as RunSidePicture[]).map(p => [stripKey(p), p])).values()];
/**
 * What is prepared for a run (lot 2.4, 23 Nov. 2026: about 100 MB prepared, much of it never drawn): a decor picture drawn whole (the
 * arches, the sheets of the things on the verges, the field's top and blades, which only the graphics card draws) gets no tiled near
 * and far copies; the sheets of the things on the verges are not even loaded while those are set aside (SIDE_THINGS); the strips of
 * tall grass are not prepared where the graphics card draws the field.
 */
export const WHOLE_DECOR: ReadonlySet<string> = new Set(['decor-bord', 'decor-bord-lave', 'decor-bord-neige', 'decor-arche-prairie', 'decor-arche-lave', 'decor-arche-neige', 'decor-champ', 'decor-brins']);
export const VERGE_SHEETS: ReadonlySet<string> = new Set(['decor-bord', 'decor-bord-lave', 'decor-bord-neige']);
export const GRASS_STRIPS: ReadonlySet<string> = new Set((Object.values(RUN_SIDES.grass.picture) as RunSidePicture[]).map(stripKey));
/** Whether a decor picture is loaded for a run, and whether it gets tiled copies. */
export const decorLoaded = (name: string): boolean => SIDE_THINGS || !VERGE_SHEETS.has(name);
export const decorTiled = (name: string): boolean => decorLoaded(name) && !WHOLE_DECOR.has(name);
/** The side strips prepared for a run: all of them, but the tall grass's where the graphics card draws the field. */
export const stripsPrepared = (withFloor: boolean): string[] => SIDE_PICTURES.map(stripKey).filter(k => !withFloor || !GRASS_STRIPS.has(k));
/** The near copy of a strip is at most this many pixels high (a wall is never drawn much taller on a phone). */
export const STRIP_HIGH = 480;
/** How many metres one texture covers: planks across the road and along it, the grass both ways, a wall along it (its height is
 *  the wall's), the cliff across. The grass verge past the road's edge (m), the cliff's depth below it (m). */
/** Pixels per point of the painted ground's layer. */
export const GROUND_RATIO = 1;
/** The detail of the painted track, finest first (a device that cannot keep up steps down, see watchFrames): how wide (screen
 *  points) a painted wall's column is, and how high a row of the ground is at the horizon and how much more at the bottom of the
 *  screen (near, the ground's perspective hardly changes across a row: taller rows there do not show). */
/** A frame that takes longer than this to draw (ms) counts as slow (see watchFrames). */
export const SLOW_DRAW_MS = 11;
export const DETAIL = [{column: 16, band: 5, grow: 10}, {column: 24, band: 6, grow: 14}, {column: 32, band: 8, grow: 18}] as const;
/** A wall to run on (owner, 13 Nov., after Blade of Brim) is one lane thick. */
export const WALL_THICK = LANE_WIDTH;
/** The wand's streak to a thing struck more than `STREAK_FROM` m ahead lasts `STREAK_MS`. */
export const STREAK_FROM = 3, STREAK_MS = 180;
/** A gap in the road shows a shaded band at least `GAP_MIN_PX` px high, however far: it reads as a gap long before Benny is there. */
export const GAP_MIN_PX = 7, GAP_SHADE = 'rgba(52,26,62,.62)';
/** The close camera follows Benny across: `CAM_LANE` of the way to her lane (on a tall wall, it stays where the edge lane
 *  put it). */
/** How far aside the far end of the road is drawn at the most, in metres. */
export const BEND = 9;
/** The road's slabs: one painted tile is `SLAB_TILE` m. Things stand beside the road every `PROP_EVERY` m or so on each side (not along
 *  a wall Benny can run on): [column, row] in the painted grid, height in metres. */
export const SLAB_TILE = 6.6, PROP_EVERY = 9;
/** Sizes after Blade of Brim (owner, 16 Nov.: « ils paraissent trop petits et pas adaptés à la caméra »): there a jar beside the hero
 *  stands about as tall as she is, a monster a head taller, a coin as wide as her head, and the things beside the path pass close by
 *  the lens, big and cut by the screen's edge. Each thing is drawn this much bigger than its old size (the rules keep theirs);
 *  the things beside the road `PROP_GROW` bigger, and they go on until they pass the camera. The barrier, the beam and the
 *  springboard a fifth bigger (16 Nov.), a little over their lane, still under the top of a jump. */
export const GROW: Partial<Record<string, number>> = {pot: 1.6, coin: 1.7, wallCoin: 1.7, dragonnet: 1.55, ember: 1.6, flyer: 1.35, chest: 1.5, power: 1.3, barrier: 1.2, beam: 1.2, spring: 1.3};
export const PROP_GROW = 1.6;
/** A struck thing melts away at least this far ahead of her (m), shrinking back to its old size, so that it does not hide her. */
export const GHOST_AHEAD = 2;
/** Each world's painted sky (scripts/prepare-benny-run-decor.mjs), and the last tone at its foot, down to the bottom of the screen. */
/** The skies (owner, 21 Nov. 2026: « je veux plus qu'on soit dans le ciel »): over the meadow, the painted day sky of « Le vol de
 *  Benny », its top part only (`crop`: down to the share of its height above its sea of clouds), its foot on the horizon. */
export const SKY_FILES = {grotte: {url: 'assets/benny-envol/fond-envol.webp', crop: .575}, pont: {url: 'assets/benny-run/fond-ciel-lave.webp', crop: 0}, montagne: {url: 'assets/benny-run/fond-ciel-neige.webp', crop: 0}} as const;
/** The gate into a new world (16 Nov., after Blade of Brim: a real scene instead of a fade): a painted arch across the road where the
 *  next world starts, its name on its panel, a short bridge of planks `GATE_BRIDGE` m long before it, and a flash of light as Benny
 *  runs under it (`GATE_FLASH` ms). Each arch: its file, its width (m, the pillars just outside the verges), and its panel (shares of
 *  the picture: left, top, right, bottom). */
export const GATES: Record<RunSetting, {name: DecorName; wide: number; panel: [number, number, number, number]}> = {
  grotte: {name: 'decor-arche-prairie', wide: 16.8, panel: [.3, .11, .7, .24]},
  pont: {name: 'decor-arche-lave', wide: 15, panel: [.3, .13, .7, .27]},
  montagne: {name: 'decor-arche-neige', wide: 14.5, panel: [.26, .22, .74, .35]},
};
export const GATE_BRIDGE = 12, GATE_FLASH = 650;
/** How long one world's sky takes to fade into the next (ms). */
export const SKY_FADE = 1400;
export const SKY_FOOT: Record<RunSetting, string> = {grotte: '252,190,140', pont: '198,85,86', montagne: '205,222,252'};
export const ROAD_GROUND = {grotte: 'decor-dalles', pont: 'decor-dalles-lave', montagne: 'decor-dalles-neige'} as const;
/** Each world's ground past the road's edge. */
export const VERGE_GROUND = {grotte: 'decor-herbe', pont: 'decor-lave-sol', montagne: 'decor-neige-sol'} as const;
/** The meadow all around the road (owner, 20 Nov. 2026): its painted grass, how many metres one tile covers, its flat green while it
 *  loads, and the dark of a hole in the road. */
export const MEADOW = VERGE_GROUND.grotte, MEADOW_TILE = 3.3, MEADOW_GREEN = '#6fa83e', HOLE_DARK = '#2e1c12', HOLE_RGB = [46 / 255, 28 / 255, 18 / 255] as const;
/** The meadow's things in three bands out from the road's edge (m): one spot every `every` m on each side, `keep` of them used,
 *  `grow` times the size of the things beside the road. */
export const MEADOW_BANDS = [{out: [9, 17], every: 11, keep: .5, grow: 1.25}, {out: [20, 34], every: 15, keep: .5, grow: 1.6}, {out: [40, 70], every: 18, keep: .6, grow: 2.2}] as const;
/** How far past the outer lanes' edge the road's slabs go (m): under the fence. */
export const ROAD_EDGE = .25;
/** Each world's sheet of things beside the road (16 Nov.: the meadow's roses and pumpkins, the lava's basalt, crystals and brazier,
 *  the snow's rocks, pines and lantern), and their heights. */
export const PROP_SHEET = {grotte: 'decor-bord', pont: 'decor-bord-lave', montagne: 'decor-bord-neige'} as const;
export const PROPS: Record<RunSetting, readonly [number, number, number][]> = {
  grotte: [[0, 0, 1.7], [1, 0, 1.9], [2, 0, 1.6], [0, 1, 2.3], [1, 1, 3.2], [2, 1, 3.3], [0, 2, 1.8], [1, 2, 3.8], [2, 2, 1.6]],
  pont: [[0, 0, 1.8], [1, 0, 2.4], [2, 0, 2], [0, 1, 2.3], [1, 1, 2.7], [2, 1, 2.2], [0, 2, 1.9], [1, 2, 3.4], [2, 2, 1.7]],
  montagne: [[0, 0, 1.8], [1, 0, 2.9], [2, 0, 1.8], [0, 1, 2.1], [1, 1, 2.7], [2, 1, 3.1], [0, 2, 1.7], [1, 2, 3.6], [2, 2, 1.7]],
};
export const ROAD_FILL = 1.04, BENNY_AT = .76, CAM_LANE = .55;
/** The blocks of a wall in the middle of the road (owner, 16 Nov.), in each world: its base and its body of blocks, its top of rock, and
 *  their colours while they load. */
export const BASE_TILE = 8;
export type MidLook = {base: DecorName; blocks: DecorName; flat: {base: string; blocks: string; rock: string}};
export const MID_LOOK: Record<RunSetting, MidLook> = {
  grotte: {base: 'decor-socle-framboise', blocks: 'decor-corps-creme', flat: {base: '#c8475f', blocks: '#e8d3a6', rock: '#c98a52'}},
  pont: {base: 'decor-lave-socle-sombre', blocks: 'decor-lave-corps-basalte', flat: {base: '#4a3040', blocks: '#7a6460', rock: '#9a4c3a'}},
  montagne: {base: 'decor-neige-socle-bois', blocks: 'decor-neige-corps-pierre', flat: {base: '#7a4434', blocks: '#b8c4d4', rock: '#8a8098'}},
};
/** The morning fog (owner, 21 Nov. 2026: « une brume blanche laiteuse de matin », like Blade of Brim's): clear up to `FOG_FROM` m, then
 *  thicker and thicker, white from `FOG_TO` m on. The things of the run come out of it from 90 m (FAR), faint, and are clear by about
 *  60 m; past them the ground melts into it and the horizon is gone: nothing far to draw. */
export const FOG_FROM = 40, FOG_TO = 115, FOG_RGB = [240, 243, 240] as const;
export const FOG = `${FOG_RGB[0]},${FOG_RGB[1]},${FOG_RGB[2]}`;
export const hash01 = (n: number) => { let t = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0; t ^= t >>> 15; t = Math.imul(t, 2246822519) >>> 0; t ^= t >>> 13; return (t >>> 0) / 4294967296; };
/** How thick the fog is `z` m ahead (0 to 1). */
export const hazeAt = (z: number) => { const t = Math.min(1, Math.max(0, (z - FOG_FROM) / (FOG_TO - FOG_FROM))); return t * t * (3 - 2 * t); };
export const PLANK_ALONG = 3, CLIFF_TILE = 4, VERGE = .6, CLIFF_DEPTH = 4;
/** The colours of the painted decor where shapes still stand: the clouds of the void, the isles' rock and grass lip, the tops
 *  and sides of platforms and stairs. */
export const PAINTED_LOOK = {cloudTop: '#f2c2c4', cloudBottom: '#fcc495', rock: '#9c6c55', rockDark: '#6d4a4f', lip: '#5f8f2f', top: '#e8955a', side: '#995f52', joint: 'rgba(90,40,14,.55)', lane: 'rgba(255,255,255,.2)'};

export {BENNY_RUN_SETTING_SHORT};
export const SETTING_NAMES: Record<RunSetting, string> = {grotte: 'La grotte dorée', pont: 'Le pont sur la lave', montagne: 'Le sentier de montagne'};
/** A challenge said to the player (tutoiement). */
export const CHALLENGE_TEXT: Record<ChallengeKind, (goal: number) => string> = {
  pots: n => `frappe ${n} pots`, coins: n => `ramasse ${n} pièces`, foes: n => `frappe ${n} créatures`, walls: n => `cours sur ${n} murs`, combo: n => `fais un combo de ${n}`,
  clean: n => `cours ${n} m sans choc`, dodges: n => `saute ou passe dessous ${n} fois`,
  leaps: n => `bondis ${n} fois d’un mur à l’autre`,
};
/** How far ahead (m) the magnet starts pulling the coins of the other lanes towards Benny. */
export const MAGNET_PULL = 10;
/** The points shown on a strike or a dodge last `FLASH_MS`; a coin flies to the counter in `COIN_FLIGHT` ms (at most `COIN_FLIGHTS`
 *  at once); coins less than `TALLY_GAP` ms apart are a series, its tally stays `TALLY_MS` after the last. */
export const FLASH_MS = 820, COIN_FLIGHT = 380, COIN_FLIGHTS = 14, TALLY_GAP = 500, TALLY_MS = 900;
/** A power's last moments (ms): its line and its aura blink. */
export const POWER_ENDING = 1000;
/** The obstacles' words (« saute », « roulade ») stay until she has got past that kind this many times in the run. */
export const LABEL_UNTIL = 3;
/** A hint the first time each newer obstacle comes into sight (once per device). */
export const HINTS = {
  rock: 'Éboulement ! Saute les rochers ou prends le couloir libre.', geyser: 'Geysers de lave : on ne les saute pas, contourne-les !',
  fire: 'Boules de feu : saute-les ou écarte-toi !', snow: 'Boules de neige : saute-les ou écarte-toi !', cart: 'Wagonnets fous : trop hauts, écarte-toi !',
  pit: 'Le sol craque ! Saute la fosse ou change de couloir.', spring: 'Un tremplin ! Passe dessus pour bondir par-dessus les piliers.', gold: 'Un pot doré ! Frappe-le : il vaut cinq pots.', platform: 'Une plateforme : atterris dessus depuis le tremplin pour monter !',
  edge: 'Plus de mur : ne glisse pas dans le vide ! En sautant, tu peux passer au-dessus.',
} as const;
export type HintKind = keyof typeof HINTS;
export const HINTS_KEY = 'prairie-lapins:benny-run-hints';
export const POWER_NAMES: Record<RunPower, string> = {magnet: 'Aimant', bubble: 'Bulle arc-en-ciel', double: 'Pièces doublées', flight: 'Envol', dash: 'Ruée'};
/** A swipe fires once the finger has moved this far; a quick flick lifted sooner still counts from `FLICK` px. */
export const SWIPE = 18, FLICK = 10;
export type RunSound = 'strike' | 'pot' | 'coin' | 'bump' | 'jump' | 'roll' | 'shock' | 'wall' | 'power' | 'caught' | 'dodge' | 'rumble' | 'whoosh' | 'land' | 'sizzle';
/**
 * Feedback: striking a creature freezes the game for `HIT_STOP` ms, at most once every `HIT_STOP_GAP` ms (a pot never: a roll through
 * a row of them stays smooth); shakes last their `ms` with this many pixels at most.
 */
/** A big moment (shock wave, spin, a flying pot bowling a creature over) plays in slow motion at this rate for a moment. */
export const SLOW_RATE = .35;
/** The longest stretch of the run's time one frame may catch up (ms): past it, a stall of the page is let go. */
export const CATCH_UP_MS = 100;
export const HIT_STOP = 40, HIT_STOP_GAP = 400, SHAKES = {strike: {ms: 90, px: 3}, bump: {ms: 260, px: 9}, shock: {ms: 320, px: 11}} as const;
export const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
