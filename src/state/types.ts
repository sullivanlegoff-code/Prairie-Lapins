import type {HistoricalLevelRight} from '../simulation/levelAccess';
import type {PurchaseUnlockId} from '../config/purchaseUnlocks';
import type {IslandStart, ParcelId} from '../config/land';
import type {HabitatType, HabitatLevel} from '../config/habitats';
import type {MainMissionId, DailyMissionId, MainEvent} from '../config/missions';
import type {BuildingKind, CareKind, Destination, OrderId, SpeciesId} from '../config/balance';
import type {DecorationId} from '../config/decorations';
import type {FormerFootprintEra} from '../config/habitatSizes';
import type {EvolutionChallenge} from '../config/evolutionChallenges';
import type {ChristmasChallengeId} from '../config/christmasEvent';

export type DecorationLocation = {kind: 'inventory'} | {kind: 'outside'; x: number; y: number; rotation: 0 | 1};
export interface OwnedDecoration {paidHearts?: number; paidPrice?: number; /** v26: sucres d'orge paid at the Christmas market (never resold). */ paidCandies?: number; id: string; catalogId: DecorationId; location: DecorationLocation; /** Absent on historical exemplars: already processed. */ placementXpProcessed?: boolean}

export interface Birth {
  id: string;
  species: SpeciesId;
  guaranteed: boolean;
  reservedDiscovery: boolean;
}
/** x/y: integer fine-grid top-left; footprint 4 × 4. */
export type DebrisKind = 'rocher' | 'buisson' | 'herbes';
/** One rock, bush or patch of weeds on 2 × 2 fine cells from its top-left cell (`x`, `y`); `price`: pattes to clear it. */
export interface Debris {id: string; kind: DebrisKind; x: number; y: number; price: number}
export interface Building {
  /** Absent = level 1. */
  farmLevel?: 2 | 3 | 4; agencyLevel?: 2 | 3;
  id: string; kind: BuildingKind; x: number; y: number;
  /** Exact numerator: one patte = HOUR units. Never round each update. */
  incomeUnits: number;
  /** `ultra`: the Ultra neige habitat, a snow enclosure bought at the Christmas market (v27, its own pictures; it stays). */
  habitat: {type: HabitatType; level: HabitatLevel; ultra?: true} | null;
  /** Footprint actually acquired (enclosures only): 1 = 6 × 5, 2 = 10 × 6, 3 = 12 × 7 fine cells. Absent = 1, whatever the level. Anchored at x, y. */
  footprintTier?: HabitatLevel;
  /**
   * Enclosures only: still keeps its tier's size of a former era (`ENCLOSURE_SIZE_ERA` in config/habitatSizes), because a save
   * written then had no room around it: 1 = before 3 November 2026 (4 × 4, 6 × 5, 8 × 6), 2 = from 3 November 2026 (5 × 4,
   * 8 × 5, 10 × 6). Raised or removed as soon as it can grow at load, removed when it is upgraded.
   * Also the Salon de soins (v28, only 1): it keeps the former 4 × 4 until it has room for the spa's 6 × 6.
   */
  formerFootprint?: FormerFootprintEra;
  /**
   * The nest of the islet of the Epics (v27, owner, 5 November 2026): a second nest, floating off the land grid at
   * EPIC_ISLET.cell, bought once for Hearts; its births have ×1.1 chances of Epics, Legendaries and Benny. Never moved or stored.
   */
  islet?: true;
  order: {recipe: OrderId; startedAt: number; endsAt: number; grass?: number; duration?: number} | null;
  breeding: {parents: [string, string]; startedAt: number; endsAt: number; birth: Birth} | null;
  /** Present exactly on the nursery. */
  nursery: Nursery | null;
}
export type NurseryCapacity = 1 | 2 | 3 | 4;
export type NurserySlot = 0 | 1 | 2 | 3;
/** Ready once `readyAt <= now`; never stored. `slot` is the persistent cushion position, always below capacity. */
export interface NurseryBaby {slot: NurserySlot; birth: Birth; startedAt: number; readyAt: number}
export interface Nursery {capacity: NurseryCapacity; babies: NurseryBaby[]}
/** `name` is the individual's own, set by the player; absent = unnamed. Never inherited, never tied to the species. */
/**
 * incomeRoll: one permanent individual draw, from 0 to 10000. Missing on historical saves.
 * crownHidden: an ultimate rabbit (affection 50) whose crown the player took off; absent = crown worn. Never on another rabbit.
 * evolution: optional progress earned by this individual after the update; `done` records its explicit evolution.
 * classicLook: an evolved rabbit that the player put back in its old drawing at the Forêt de Brocéliande. Never on another rabbit,
 * never before its evolution, and never without the forest.
 */
export interface Rabbit { incomeRoll?: number; id: string; species: SpeciesId; affection: number; enclosureId: string; name?: string; crownHidden?: true; classicLook?: true; /** The Forêt de Brocéliande is changing its drawing: `classicLook` flips at `endsAt` (7 hours). */ lookChange?: {endsAt: number}; evolution?: {done?: true; challenges?: Partial<Record<EvolutionChallenge, number>>} }
export interface MissionState {
  nightOrderStarted?: boolean;
  events: Record<MainEvent, number>;
  completed: MainMissionId[]; claimed: MainMissionId[];
  /**
   * daily.picked (v25): the three missions drawn at the start of the cycle among what the player could do then; absent, the
   * draw among the base missions (`dailyMissionsOf`). daily.petted (v25): the rabbits caressed in this cycle, at most three.
   */
  daily: {referenceAt: number; cycleIndex: number; progress: Record<DailyMissionId, number>; claimed: DailyMissionId[]; bonusClaimed: boolean; nextAt?: number; picked?: DailyMissionId[]; petted?: string[]};
  /** v25: the daily cycles in a row ending with the bonus claimed, and the last one (the `quotidien` evolution challenge). */
  streak?: {count: number; lastCycle: number};
}
export interface Initiation {
  order: string | null; breeding: string | null; growth: string | null;
  birthId: string | null; closed: TimedStage[]; used: TimedStage[];
}
export interface SavedProgression {totalXp: number; rewardedThroughLevel: number}
export interface ProgressionGain {xpGained: number; rewardedLevels: number[]; heartsGranted: number}
export interface GameState {
  /** Last successfully launched pair; independent from the UI's draft selection. */
  lastBreedingParents?: [string, string];
  /** Owner corrections already applied to this save (see simulation/adjustments.ts). */
  appliedAdjustments?: string[];
  /** Owner's planned birth: the next breeding that fulfils this species' recipe gives it, then the field is removed. */
  plannedBirth?: import('../config/balance').SpeciesId;
  /** Species of which one of the player's rabbits has evolved, kept even once that rabbit is released (optional, v25). */
  evolvedSpecies?: import('../config/balance').SpeciesId[];
  cozy?: import('../simulation/cozy').CozyState;
  /** Present only on islands started on the southwest parcel (top/right expansion); absent = legacy centre start. */
  islandStart?: IslandStart;
  /** Last canonical mission cycle consumed, keyed by the exact individual rabbit ID. */
  /**
   * affectionCycles/heartCycle: last canonical mission cycle consumed. fullRuns: full-reward completions already paid in
   * `cycle` (saturating at the quota). Absent on saves written before it existed: nothing used, a new cycle starts again.
   */
  cuisine: {affectionCycles: Record<string, number>; heartCycle: number | null; fullRuns?: {cycle: number; used: number}};
  progression: SavedProgression;
  /** Absent only before the one-time level-access transition. */
  levelAccessTransition?: {version: 1; rights: HistoricalLevelRight[]};
  /** Missing on existing games: keep their original guide and reward eligibility. */
  startCourse?: 'paille-solo';
  purchaseUnlocks?: PurchaseUnlockId[];
  initiation?: Initiation;
  version: 28;
  /** The Christmas event (v26, optional; absent until its first use): see `ChristmasState`. */
  christmas?: ChristmasState;
  /** Benny, the Mythic (v22): when her power is usable again, and whether she is flying in the sky. Absent until first used. */
  benny?: {powerReadyAt: number; inSky: boolean};
  rewardedDecorationModels?: DecorationId[]; decorations: OwnedDecoration[]; missions: MissionState; lastSimulatedAt: number; nextId: number;
  hearts: number; nextHeartGiftAt: number;
  pattes: number; grass: number; acquiredParcels: ParcelId[];
  buildings: Building[]; rabbits: Rabbit[]; discovered: SpeciesId[];
  /** Recipes bought or gifted. Discovered species are known without an entry here. Never affects a draw. */
  recipeBook: SpeciesId[];
  pityFailures: number;
  /** The travel agency: Coco's first welcome given, and the trips under way (ready to welcome back once `endsAt <= now`). */
  travel?: {welcomed: boolean; trips: Trip[]};
  /** The care under way at the Salon de soins (one rabbit at a time, back once `endsAt <= now`); absent when the salon is free. */
  care?: Care;
  /** The cares that brought Hearts in daily cycle `cycle` (at most SALON.heartCaresPerCycle, v27). Absent until the first. */
  salonHearts?: {cycle: number; cares: number};
  /** What clutters the parcels bought since the Christmas update (v27, src/simulation/debris.ts); absent or empty: none. */
  debris?: Debris[];
  /** « Le vol de Benny » (v27): the daily cycle of the last rewarded game, the rewarded games of that cycle, whether its Heart was won, and the record. */
  bennyFlight?: {cycle: number; rewarded: number; heart?: true; best: number};
  /** Daily cycle of each rabbit's last affection gift (a care or a picnic), keyed by rabbit ID. Absent until the first gift. */
  affectionGifts?: Record<string, number>;
  /** Daily cycle of the last picnic (one a day in all). Absent until the first picnic. */
  picnicCycle?: number;
  /**
   * The jump-rope game (v23, optional): the daily cycle of the last rewarded game, the rewarded games played in it (at most
   * JUMP_ROPE.rewardedGamesPerCycle) and whether its Heart was won; `best` is the player's record; `team` the last trio chosen
   * (two carriers, one athlete; optional, its rabbits may since have left). Absent until the first game.
   */
  jumpRope?: {cycle: number; rewarded: number; heart?: true; best: number; team?: JumpRopeTeam;
    /** The challenge of the day won in this cycle (optional). */
    challenge?: true;
    /** Each rabbit's best score as the athlete, keyed by rabbit ID (optional; for future evolution challenges). */
    athleteBest?: Record<string, number>};
  /** The jump-rope islet, bought (optional, absent = not bought): it floats left of the start island, off the land grid. */
  jumpIsland?: true;
}
/**
 * The Christmas event (v26). `candies`: the sucres d'orge balance, kept after the event. `cycle`: the daily cycle the challenges
 * below belong to (`picked` drawn at its start, `progress`, `claimed`, `bonusClaimed`); another cycle shows none of them.
 * `snowman`: the one snowman of `cycle`, standing in `enclosureId` until the end of that cycle. `skyGifts`: the rewarded games of
 * « Les cadeaux du ciel » played in `cycle` and the player's record (`best`, gifts caught in one game).
 */
export interface ChristmasState {
  candies: number; cycle?: number; picked?: ChristmasChallengeId[]; progress?: Partial<Record<ChristmasChallengeId, number>>;
  claimed?: ChristmasChallengeId[]; bonusClaimed?: true;
  snowman?: {cycle: number; enclosureId: string};
  skyGifts?: {cycle: number; rewarded: number; best: number};
  /** Sucres d'orge earned from coin bubbles in gift cycle `cycle` (at most COIN_BUBBLE_CANDIES.maxPerCycle). */
  bubbles?: {cycle: number; earned: number};
}
/** Two rabbits turn the rope, the athlete jumps. */
export interface JumpRopeTeam {carriers: [string, string]; athlete: string}
export interface Trip {grass?: number; rabbitId: string; destination: Destination; startedAt: number; endsAt: number; hearts: number}
/** Paid at the start; the gift of the day is reserved then, the affection and the XP are given when the player welcomes it back. */
/** `hearts` (v27): the Hearts this care brings back, fixed at its start (absent when the day's rewarded cares were used). */
export interface Care {rabbitId: string; care: CareKind; startedAt: number; endsAt: number; hearts?: number}
export type Refusal = 'LEVEL_REQUIRED' | 'NO_BREEDING_RESULT' | 'PURCHASE_LOCKED' | 'DECORATION_LIMIT' | 'DECORATION_OVERLAP' | 'DECORATION_BLOCKS_BUILDING' | 'INVALID_TIME' | 'INVALID_RANDOM' | 'INVALID_CHOICE' | 'NOT_FOUND' |
  'NOT_ENOUGH_PATTES' | 'NOT_ENOUGH_GRASS' | 'INVALID_CELL' | 'CELL_OCCUPIED' |
  'LOOK_CHANGING' | 'BUILDING_LIMIT' | 'HABITAT_NOT_EMPTY' | 'LAST_HABITAT' | 'CAPACITY_FULL' | 'BUSY' | 'NOT_READY' | 'MAX_AFFECTION' |
  'SAME_PARENT' | 'AFFECTION_TOO_LOW' | 'MISSING_BUILDING' | 'ALREADY_EXPANDED' | 'PARCEL_UNAVAILABLE' |
  'LAST_OF_SPECIES' | 'PARENT_BUSY' | 'NOT_ENOUGH_HEARTS' | 'ACTION_FINISHED' |
  'STALE_ACTION' | 'PRICE_CHANGED' | 'NO_MISSING_PATTES' | 'ALREADY_CLAIMED' | 'CYCLE_EXPIRED' | 'RESOURCE_LIMIT' | 'TYPE_INCOMPATIBLE' | 'MAX_HABITAT_LEVEL' | 'RECIPE_KNOWN' | 'MAX_NURSERY_CAPACITY' |
  'UPGRADE_BLOCKED_BUILDING' | 'UPGRADE_BLOCKED_DECORATION' | 'UPGRADE_BLOCKED_DEBRIS' | 'UPGRADE_BLOCKED_LAND' | 'INVALID_NAME' | 'STATUE_REQUIRED' | 'SECOND_STATUE_REQUIRED' | 'TRAVELING' |
  'BENNY_RECHARGING' | 'NO_WAITING_BABY' | 'BENNY_KEPT' |
  'AT_SALON' | 'GIFT_TODAY' | 'AFFECTION_WALL' | 'PICNIC_TODAY' | 'EMPTY_ENCLOSURE' | 'NO_GIFT_POSSIBLE' |
  'NO_EVOLVED_ART' | 'EVOLUTION_AFFECTION' | 'EVOLUTION_CHALLENGES' | 'EVOLUTION_REQUIRED' |
  'EVENT_OVER' | 'SNOWMAN_TODAY' | 'NOT_ENOUGH_CANDIES' | 'DEBRIS_IN_THE_WAY' | 'BENNY_REQUIRED';
export interface CuisineReward {pattes: number; grass: number; /** True for one of the cycle's full-reward slots, false for a tip. */ fullReward: boolean; affectionGranted: boolean; affectionAtCap: boolean; affectionStatueRequired: boolean; /** The rabbit stops at 30 until it evolves (owner, 4 November 2026). */ affectionEvolutionRequired?: boolean; heartGranted: boolean; /** The rabbit the affection reward was drawn for. */ affectionRabbitId: string}
export type ActionResult = {ok: true; state: GameState; value?: string | number; progressionGain?: ProgressionGain; cuisineReward?: CuisineReward; jumpRopeReward?: import('../simulation/jumpRope').JumpRopeReward} |
  {ok: false; state: GameState; reason: Refusal};
export type BaseCommand =
  /** `ultra`: the Ultra neige habitat (a snow enclosure, `habitatType` 'neige'), paid in sucres d'orge at the Christmas market. */
  | {type: 'buyBuilding'; kind: BuildingKind; x: number; y: number; habitatType?: HabitatType; ultra?: true}
  | {type: 'moveBuilding'; id: string; x: number; y: number}
  | {type: 'placeStarterBuilding'; kind: 'nest' | 'nursery'; x: number; y: number}
  | {type: 'transferBirth'; id: string; birthId: string}
  | {type: 'buyRabbit'; species: SpeciesId; enclosureId: string}
  | {type: 'moveRabbit'; id: string; enclosureId: string}
  | {type: 'collectIncome'; id: string}
  | {type: 'removeHabitat'; id: string}
  | {type: 'startOrder'; id: string; recipe: OrderId}
  | {type: 'collectOrder'; id: string}
  | {type: 'feed'; id: string}
  | {type: 'breed'; parents: [string, string]; /** The nest used (absent: the island's nest); the islet's nest is the second one. */ nestId?: string}
  /** Welcomes this exact ready baby; another one is never substituted. */
  | {type: 'welcome'; enclosureId: string; birthId: string}
  /** Releases this exact ready baby from the nursery for pattes: no habitat, no XP, no discovery. */
  | {type: 'releaseBaby'; birthId: string}
  | {type: 'upgradeHabitat'; id: string; fromLevel: HabitatLevel}
  | {type: 'expand'; parcelId: ParcelId; expectedCost: number}
  | {type: 'release'; id: string}
  | {type: 'renameRabbit'; id: string; name: string}
  /** An ultimate rabbit (affection 50) takes off or puts back its crown; free and purely cosmetic. */
  | {type: 'toggleCrown'; rabbitId: string}
  /** Forêt de Brocéliande: an evolved rabbit switches between drawings; free and cosmetic. */
  | {type: 'toggleClassicLook'; rabbitId: string}
  /** A caress on the rabbit's portrait in its sheet, just for fun: it only counts for the « Des caresses » daily mission. */
  | {type: 'petRabbit'; rabbitId: string}
  /** Confirme l’évolution de ce lapin après affection 30 et ses défis. */
  | {type: 'evolveRabbit'; rabbitId: string}
  /** Benny's power: every baby of the nursery is ready now; then it recharges for 48 hours. */
  | {type: 'bennyPower'}
  /** Benny flies above the island, or comes back to her enclosure. Her income and enclosure are unchanged. */
  | {type: 'bennySky'; inSky: boolean};
export type PattesCommand = Extract<BaseCommand, {type: 'buyBuilding' | 'buyRabbit' | 'expand' | 'startOrder' | 'upgradeHabitat'}>;
export type TimedStage = 'order' | 'breeding' | 'growth';
export type Command = BaseCommand
  | {type:'translateDecorations'; ids:string[]; dx:number; dy:number}
  /** `rabbitId` is the commis; `tasterId` the optional second rabbit (taster). With two, the affection goes to one of them, drawn at random. */
  | {type: 'rewardCuisine'; rabbitId: Rabbit['id']; tasterId?: Rabbit['id']; recipeId: import('../config/balance').CuisineRecipeId}
  | {type: 'buyDecoration'; catalogId: DecorationId; location?: Extract<DecorationLocation, {kind: 'outside'}>}
  | {type: 'placeDecoration'; id: string; location: DecorationLocation}
  | {type: 'sellDecoration'; id: string}
  | {type: 'storeDecorationsInCell'; x: number; y: number}
  | {type: 'claimMainMission'; id: MainMissionId}
  | {type: 'claimDailyMission'; id: DailyMissionId; cycleStart: number}
  | {type: 'claimDailyBonus'; cycleStart: number}
  | {type: 'claimHearts'}
  /** One permanent cushion, Hearts only. `fromCapacity` and `expectedCost` make a repeated or stale request refuse. */
  | {type: 'unlockNurserySlot'; fromCapacity: NurseryCapacity; expectedCost: number}
  | {type: 'buyRecipe'; species: SpeciesId}
  /** One Heart from Paille's counter, at the quoted price: a stale or changed price refuses. */
  /** Salon de soins: one care for this rabbit, paid now; `claimCare` welcomes it back once the care is over. */
  | {type: 'startCare'; rabbitId: string; care: CareKind} | {type: 'claimCare'; rabbitId: string}
  /** Today's picnic in this enclosure, at the quoted price (300 pattes per rabbit present): a changed price refuses. */
  | {type: 'picnic'; enclosureId: string; expectedCost: number}
  /** A finished jump-rope game: `score` jumps by this trio (remembered for the next game); pays within the daily limit (JUMP_ROPE). */
  | {type: 'rewardJumpRope'; team: JumpRopeTeam; score: number}
  /** The jump-rope islet, for JUMP_ROPE.price pattes from JUMP_ROPE.unlockLevel, once. */
  | {type: 'buyJumpIsland'} | {type: 'buyEpicIslet'} | {type: 'clearDebris'; id: string} | {type: 'rewardBennyFlight'; passed: number}
  /** Christmas: today's snowman in this enclosure (free, one a day in all, a rabbit present, from level 2). */
  | {type: 'buildSnowman'; enclosureId: string}
  /** Christmas: a finished game of « Les cadeaux du ciel », the basket carried by this rabbit; pays within SKY_GIFTS' daily limit. */
  | {type: 'rewardSkyGifts'; rabbitId: string; caught: number}
  /** Christmas: the sucres d'orge of a claimed challenge, or of the cycle bonus, in the cycle starting at `cycleStart`. */
  | {type: 'claimChristmasChallenge'; id: ChristmasChallengeId; cycleStart: number}
  | {type: 'claimChristmasBonus'; cycleStart: number}
  /** Christmas market: a Christmas decoration for its sucres d'orge, placed now or kept in the inventory. */
  | {type: 'buyChristmasDecoration'; catalogId: DecorationId; location?: Extract<DecorationLocation, {kind: 'outside'}>}
  | {type: 'buyChristmasRabbit'; species: import('../config/balance').SpeciesId; enclosureId: string}
  | {type: 'welcomeAgency'} | {type: 'startTrip'; rabbitId: string} | {type: 'claimTrip'; rabbitId: string} | {type: 'upgradeFarm'; id: string; /** Level reached; absent = 2 (older callers). A farm not one level below is a stale action. */ toLevel?: 2 | 3 | 4} | {type: 'upgradeAgency'; id: string; fromLevel: 1 | 2 | 3}
  /** `birthId` names the nursery baby; required for growth, ignored otherwise. */
  | {type: 'initiationAid'; id: string; stage: TimedStage; jobKey: string; birthId?: string}
  | {type: 'accelerate'; id: string; stage: TimedStage; jobKey: string; maxHearts: number; birthId?: string}
  | {type: 'payWithHearts'; action: PattesCommand; maxHearts: number; maxPattes: number};
