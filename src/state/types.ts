import type {HistoricalLevelRight} from '../simulation/levelAccess';
import type {PurchaseUnlockId} from '../config/purchaseUnlocks';
import type {IslandStart, ParcelId} from '../config/land';
import type {HabitatType, HabitatLevel} from '../config/habitats';
import type {MainMissionId, DailyMissionId, MainEvent} from '../config/missions';
import type {BuildingKind, Destination, OrderId, SpeciesId} from '../config/balance';
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
  farmLevel?: 2; agencyLevel?: 2 | 3;
  id: string; kind: BuildingKind; x: number; y: number;
  /** Exact numerator: one patte = HOUR units. Never round each update. */
  incomeUnits: number;
  habitat: {type: HabitatType; level: HabitatLevel} | null;
  /** Footprint actually acquired (enclosures only): 1 = 4 × 4, 2 = 6 × 5, 3 = 8 × 6 fine cells. Absent = 1, whatever the level. Anchored at x, y. */
  footprintTier?: HabitatLevel;
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
export interface Rabbit { id: string; species: SpeciesId; affection: number; enclosureId: string; name?: string }
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
  version: 19;
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
}
export interface Trip {grass?: number; rabbitId: string; destination: Destination; startedAt: number; endsAt: number; hearts: number}
export type Refusal = 'LEVEL_REQUIRED' | 'NO_BREEDING_RESULT' | 'PURCHASE_LOCKED' | 'DECORATION_LIMIT' | 'DECORATION_OVERLAP' | 'DECORATION_BLOCKS_BUILDING' | 'INVALID_TIME' | 'INVALID_RANDOM' | 'INVALID_CHOICE' | 'NOT_FOUND' |
  'NOT_ENOUGH_PATTES' | 'NOT_ENOUGH_GRASS' | 'INVALID_CELL' | 'CELL_OCCUPIED' |
  'BUILDING_LIMIT' | 'CAPACITY_FULL' | 'BUSY' | 'NOT_READY' | 'MAX_AFFECTION' |
  'SAME_PARENT' | 'AFFECTION_TOO_LOW' | 'MISSING_BUILDING' | 'ALREADY_EXPANDED' | 'PARCEL_UNAVAILABLE' |
  'LAST_OF_SPECIES' | 'PARENT_BUSY' | 'NOT_ENOUGH_HEARTS' | 'ACTION_FINISHED' |
  'STALE_ACTION' | 'PRICE_CHANGED' | 'NO_MISSING_PATTES' | 'ALREADY_CLAIMED' | 'CYCLE_EXPIRED' | 'RESOURCE_LIMIT' | 'TYPE_INCOMPATIBLE' | 'MAX_HABITAT_LEVEL' | 'RECIPE_KNOWN' | 'MAX_NURSERY_CAPACITY' |
  'UPGRADE_BLOCKED_BUILDING' | 'UPGRADE_BLOCKED_DECORATION' | 'UPGRADE_BLOCKED_LAND' | 'INVALID_NAME' | 'MARKET_LIMIT' | 'STATUE_REQUIRED' | 'TRAVELING';
export interface CuisineReward {pattes: number; grass: number; /** True for one of the cycle's full-reward slots, false for a tip. */ fullReward: boolean; affectionGranted: boolean; affectionAtCap: boolean; affectionStatueRequired: boolean; heartGranted: boolean}
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
  | {type: 'startOrder'; id: string; recipe: OrderId}
  | {type: 'collectOrder'; id: string}
  | {type: 'feed'; id: string}
  | {type: 'breed'; parents: [string, string]}
  /** Welcomes this exact ready baby; another one is never substituted. */
  | {type: 'welcome'; enclosureId: string; birthId: string}
  | {type: 'upgradeHabitat'; id: string; fromLevel: HabitatLevel}
  | {type: 'expand'; parcelId: ParcelId; expectedCost: number}
  | {type: 'release'; id: string}
  | {type: 'renameRabbit'; id: string; name: string};
export type PattesCommand = Extract<BaseCommand, {type: 'buyBuilding' | 'buyRabbit' | 'expand' | 'startOrder' | 'upgradeHabitat'}>;
export type TimedStage = 'order' | 'breeding' | 'growth';
export type Command = BaseCommand
  | {type: 'rewardCuisine'; rabbitId: Rabbit['id']; recipeId: 'salad' | 'chicken'}
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
  | {type: 'welcomeAgency'} | {type: 'startTrip'; rabbitId: string} | {type: 'claimTrip'; rabbitId: string} | {type: 'upgradeFarm'; id: string} | {type: 'upgradeAgency'; id: string; fromLevel: 1 | 2 | 3}
  /** `birthId` names the nursery baby; required for growth, ignored otherwise. */
  | {type: 'initiationAid'; id: string; stage: TimedStage; jobKey: string; birthId?: string}
  | {type: 'accelerate'; id: string; stage: TimedStage; jobKey: string; maxHearts: number; birthId?: string}
  | {type: 'payWithHearts'; action: PattesCommand; maxHearts: number; maxPattes: number};
