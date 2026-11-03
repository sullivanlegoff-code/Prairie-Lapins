import type {HistoricalLevelRight} from '../simulation/levelAccess';
import type {PurchaseUnlockId} from '../config/purchaseUnlocks';
import type {IslandStart, ParcelId} from '../config/land';
import type {HabitatType, HabitatLevel} from '../config/habitats';
import type {MainMissionId, DailyMissionId, MainEvent} from '../config/missions';
import type {BuildingKind, CareKind, Destination, OrderId, SpeciesId} from '../config/balance';
import type {DecorationId} from '../config/decorations';

export type DecorationLocation = {kind: 'inventory'} | {kind: 'outside'; x: number; y: number; rotation: 0 | 1};
export interface OwnedDecoration {paidHearts?: number; paidPrice?: number; id: string; catalogId: DecorationId; location: DecorationLocation; /** Absent on historical exemplars: already processed. */ placementXpProcessed?: boolean}

export interface Birth {
  id: string;
  species: SpeciesId;
  guaranteed: boolean;
  reservedDiscovery: boolean;
}
/** x/y: integer fine-grid top-left; footprint 4 × 4. */
export interface Building {
  /** Absent = level 1. */
  farmLevel?: 2 | 3; agencyLevel?: 2 | 3;
  id: string; kind: BuildingKind; x: number; y: number;
  /** Exact numerator: one patte = HOUR units. Never round each update. */
  incomeUnits: number;
  habitat: {type: HabitatType; level: HabitatLevel} | null;
  /** Footprint actually acquired (enclosures only): 1 = 5 × 4, 2 = 8 × 5, 3 = 10 × 6 fine cells. Absent = 1, whatever the level. Anchored at x, y. */
  footprintTier?: HabitatLevel;
  /**
   * Enclosures only: still keeps its tier's size from before the enlargement of 3 November 2026 (4 × 4, 6 × 5, 8 × 6), because a
   * save written before it had no room around it. Removed as soon as it can grow at load, or when it is upgraded.
   */
  formerFootprint?: true;
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
 * classicLook: a rabbit of affection 30 or more, of a species with an evolved drawing, that the player put back in its old drawing at
 * the Forêt de Brocéliande; absent = evolved drawing. Never on another rabbit, never without the forest.
 */
export interface Rabbit { incomeRoll?: number; id: string; species: SpeciesId; affection: number; enclosureId: string; name?: string; crownHidden?: true; classicLook?: true }
export interface MissionState {
  nightOrderStarted?: boolean;
  events: Record<MainEvent, number>;
  completed: MainMissionId[]; claimed: MainMissionId[];
  daily: {referenceAt: number; cycleIndex: number; progress: Record<DailyMissionId, number>; claimed: DailyMissionId[]; bonusClaimed: boolean; nextAt?: number};
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
  version: 24;
  /** Benny, the Mythic (v22): when her power is usable again, and whether she is flying in the sky. Absent until first used. */
  benny?: {powerReadyAt: number; inSky: boolean};
  rewardedDecorationModels?: DecorationId[]; decorations: OwnedDecoration[]; missions: MissionState; lastSimulatedAt: number; nextId: number;
  hearts: number; nextHeartGiftAt: number;
  pattes: number; grass: number; acquiredParcels: ParcelId[];
  buildings: Building[]; rabbits: Rabbit[]; discovered: SpeciesId[];
  /** Recipes bought or gifted. Discovered species are known without an entry here. Never affects a draw. */
  recipeBook: SpeciesId[];
  pityFailures: number;
  /** Paille's counter: exchanges made in daily cycle `cycle`. Absent until the first exchange. */
  market?: {cycle: number; pattes: number; grass: number};
  /** The travel agency: Coco's first welcome given, and the trips under way (ready to welcome back once `endsAt <= now`). */
  travel?: {welcomed: boolean; trips: Trip[]};
  /** The care under way at the Salon de soins (one rabbit at a time, back once `endsAt <= now`); absent when the salon is free. */
  care?: Care;
  /** Daily cycle of each rabbit's last affection gift (a care or a picnic), keyed by rabbit ID. Absent until the first gift. */
  affectionGifts?: Record<string, number>;
  /** Daily cycle of the last picnic (one a day in all). Absent until the first picnic. */
  picnicCycle?: number;
}
export interface Trip {grass?: number; rabbitId: string; destination: Destination; startedAt: number; endsAt: number; hearts: number}
/** Paid at the start; the gift of the day is reserved then, the affection and the XP are given when the player welcomes it back. */
export interface Care {rabbitId: string; care: CareKind; startedAt: number; endsAt: number}
export type Refusal = 'LEVEL_REQUIRED' | 'NO_BREEDING_RESULT' | 'PURCHASE_LOCKED' | 'DECORATION_LIMIT' | 'DECORATION_OVERLAP' | 'DECORATION_BLOCKS_BUILDING' | 'INVALID_TIME' | 'INVALID_RANDOM' | 'INVALID_CHOICE' | 'NOT_FOUND' |
  'NOT_ENOUGH_PATTES' | 'NOT_ENOUGH_GRASS' | 'INVALID_CELL' | 'CELL_OCCUPIED' |
  'BUILDING_LIMIT' | 'HABITAT_NOT_EMPTY' | 'LAST_HABITAT' | 'CAPACITY_FULL' | 'BUSY' | 'NOT_READY' | 'MAX_AFFECTION' |
  'SAME_PARENT' | 'AFFECTION_TOO_LOW' | 'MISSING_BUILDING' | 'ALREADY_EXPANDED' | 'PARCEL_UNAVAILABLE' |
  'LAST_OF_SPECIES' | 'PARENT_BUSY' | 'NOT_ENOUGH_HEARTS' | 'ACTION_FINISHED' |
  'STALE_ACTION' | 'PRICE_CHANGED' | 'NO_MISSING_PATTES' | 'ALREADY_CLAIMED' | 'CYCLE_EXPIRED' | 'RESOURCE_LIMIT' | 'TYPE_INCOMPATIBLE' | 'MAX_HABITAT_LEVEL' | 'RECIPE_KNOWN' | 'MAX_NURSERY_CAPACITY' |
  'UPGRADE_BLOCKED_BUILDING' | 'UPGRADE_BLOCKED_DECORATION' | 'UPGRADE_BLOCKED_LAND' | 'INVALID_NAME' | 'MARKET_LIMIT' | 'STATUE_REQUIRED' | 'SECOND_STATUE_REQUIRED' | 'TRAVELING' |
  'BENNY_RECHARGING' | 'NO_WAITING_BABY' | 'BENNY_KEPT' |
  'AT_SALON' | 'GIFT_TODAY' | 'AFFECTION_WALL' | 'PICNIC_TODAY' | 'EMPTY_ENCLOSURE' | 'NO_GIFT_POSSIBLE' |
  'NO_EVOLVED_ART' | 'EVOLUTION_AFFECTION';
export interface CuisineReward {pattes: number; grass: number; /** True for one of the cycle's full-reward slots, false for a tip. */ fullReward: boolean; affectionGranted: boolean; affectionAtCap: boolean; affectionStatueRequired: boolean; heartGranted: boolean; /** The rabbit the affection reward was drawn for. */ affectionRabbitId: string}
export type ActionResult = {ok: true; state: GameState; value?: string | number; progressionGain?: ProgressionGain; cuisineReward?: CuisineReward} |
  {ok: false; state: GameState; reason: Refusal};
export type BaseCommand =
  | {type: 'buyBuilding'; kind: BuildingKind; x: number; y: number; habitatType?: HabitatType}
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
  | {type: 'breed'; parents: [string, string]}
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
  /** Forêt de Brocéliande: a rabbit of affection 30 or more goes back to its old drawing, or to its evolved one; free and cosmetic. */
  | {type: 'toggleClassicLook'; rabbitId: string}
  /** Benny's power: every baby of the nursery is ready now; then it recharges for 48 hours. */
  | {type: 'bennyPower'}
  /** Benny flies above the island, or comes back to her enclosure. Her income and enclosure are unchanged. */
  | {type: 'bennySky'; inSky: boolean};
export type PattesCommand = Extract<BaseCommand, {type: 'buyBuilding' | 'buyRabbit' | 'expand' | 'startOrder' | 'upgradeHabitat'}>;
export type TimedStage = 'order' | 'breeding' | 'growth';
export type Command = BaseCommand
  | {type:'claimDiscovery'; id:string}
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
  | {type: 'exchangeForHeart'; resource: 'pattes' | 'grass'; expectedCost: number}
  /** Salon de soins: one care for this rabbit, paid now; `claimCare` welcomes it back once the care is over. */
  | {type: 'startCare'; rabbitId: string; care: CareKind} | {type: 'claimCare'; rabbitId: string}
  /** Today's picnic in this enclosure, at the quoted price (300 pattes per rabbit present): a changed price refuses. */
  | {type: 'picnic'; enclosureId: string; expectedCost: number}
  | {type: 'welcomeAgency'} | {type: 'startTrip'; rabbitId: string} | {type: 'claimTrip'; rabbitId: string} | {type: 'upgradeFarm'; id: string; /** Level reached; absent = 2 (older callers). A farm not one level below is a stale action. */ toLevel?: 2 | 3} | {type: 'upgradeAgency'; id: string; fromLevel: 1 | 2 | 3}
  /** `birthId` names the nursery baby; required for growth, ignored otherwise. */
  | {type: 'initiationAid'; id: string; stage: TimedStage; jobKey: string; birthId?: string}
  | {type: 'accelerate'; id: string; stage: TimedStage; jobKey: string; maxHearts: number; birthId?: string}
  | {type: 'payWithHearts'; action: PattesCommand; maxHearts: number; maxPattes: number};
