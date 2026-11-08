import {farmLimit, farmDuration} from '../config/balance';
import type {LegendaryAct} from '../display/legendaryTimeline';
import {bestFriend} from '../simulation/cozy';
import {DECORATION_COLLECTIONS,TRAVEL_STORIES} from '../config/cozyContent';
import {translatedDecorations} from '../simulation/cozyActivities';
import {rabbitDropTargets} from './rabbitDropTargets';
import {showLegendaryReveal, type RevealText} from './legendaryReveal';
import {showBennyReveal} from './bennyReveal';
import {clearLegendaryCard, decorateLegendaryCard, legendaryPortrait} from './legendaryCard';
import {clearUltimateCard, crownPortrait, decorateUltimateCard} from './ultimateCard';
import {isLegendaryShow} from '../config/legendaryArt';
import {preloadReceptionFrame, receptionFrame} from '../config/receptionArt';
import {accountKnown} from '../cloud/accountState';
import {cloudConfig} from '../cloud/config';
import {AccountReminder} from './accountReminder';
import {decorateRabbitText, rabbitTheme, clearRabbitTheme} from '../display/rabbitPresentation';
import {heartIcon} from '../display/currency';
import {cuisineQuotaText, heartGift, recipeHint, orderReadyText} from './economyFeedback';
import type {AudioEngine} from '../audio/audioEngine';
import {mountCuisineActivity} from './CuisineActivity';
import {mountJumpRopeActivity} from './JumpRopeActivity';
import {jumpIslandReason, jumpRopeChallenge, jumpRopeDay, jumpRopeMedals, jumpRopeRabbitReason, rememberedJumpRopeTeam} from '../simulation/jumpRope';
import type {RecipeCompletion} from '../../cooktap-prototype/main';
import {missionClaimXp} from '../simulation/progression';
import {PROGRESSION} from '../config/progression';
import {RABBIT_STORIES} from '../config/rabbitStories';
import {recipeKnown, recipePrice} from '../simulation/recipes';
import {stateLevelAccess} from '../simulation/levelRights';
import type {LevelAccessTarget} from '../simulation/levelAccess';
import {mountLevelLock} from '../display/LevelLock';
import {PARCELS, PARCEL_IDS, extensionPrice, purchasableParcels, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';
import {setCurrencyText} from '../display/currency';
import {CROP_IDS, cropDuration, cropIcon, statueThumbnail} from '../display/food';
import {COCO_WELCOME, HOST_NAME, agencyThumbnail, cocoPortrait, forestThumbnail, fromPlace, jumpRopeThumbnail, salonThumbnail, toPlace} from '../display/agency';
import {atSalon, away, giftReason, picnicQuote, rabbitAwayReason, salonHeartCaresLeft} from '../simulation/care';
import {travelling} from '../simulation/travel';
import {BENNY, BENNY_POWER_RECHARGE, bennyInSky, bennyPowerReadyAt, bennyPowerReason} from '../simulation/benny';
import {affectionStatueCount, capReason, feedReason, nextAffectionStatue, playerLevel, rabbitAffectionCap, waitsForEvolution, wearsCrown} from '../simulation/affection';
import type {Building, Rabbit} from '../state/types';
import {MAX_RABBIT_NAME_LENGTH, normalizeRabbitName} from '../simulation/rabbitNames';
import {HABITATS, HABITAT_TYPES, habitatLevel, habitatPrice, type HabitatType} from '../config/habitats';
import {buildingSize, habitatFootprint} from '../config/habitatSizes';
import {habitatThumbnail} from './habitatThumbnails';
import {FARM_ART, farmArtFor} from '../config/farmArt';
import {NEST_ART} from '../config/nestArt';
import {NURSERY_ART} from '../config/nurseryArt';
import {KITCHEN_ART} from '../config/kitchenArt';
import {hasRoomFor, upgradeFootprintReason} from '../simulation/placement';
import {habitatStats, habitatName, habitatEntryReason, habitatAccepts, welcomeDestinations, removeHabitatReason} from '../simulation/habitats';
import {MAIN_MISSIONS, DAILY_MISSIONS, DAILY_BONUS, DAILY_PICK_COUNT, type Reward} from '../config/missions';
import {initialMissionIds, activeMainMissions, visibleMainMissions, mainCatalogueUnlocked, availableMissionRewards, mainProgress, dailyCycleStart, dailyCycleEnd, cycleIndexAt, dailyBonusReady, dailyClaimable, dailyMissionsOf, dailyProgress} from '../simulation/missions';
import type {GameController, Snapshot} from '../application/GameController';
import {AFFECTION_STATUE, BALANCE, CARE_KINDS, FARM_UPGRADES, PICNIC, SALON, FOREST, JUMP_ROPE, carePrice, isAffectionWall, orderFarmLevel, SECOND_AFFECTION_STATUE, NURSERY, ORDERS, RARE_BIRTH_BONUS, TRAVEL, feedCost, type Destination, SPECIES, SPECIES_IDS, SHOP_SPECIES, growthDuration, type BuildingKind, type SpeciesId, type RabbitType} from '../config/balance';
import {JUMP_MEDAL_ART} from '../config/jumpIslandArt';
import {EPIC_ISLET_ART} from '../config/epicIsletArt';
import {ISLAND_COVER_EVENT, PERCH_ART, type IslandCover} from '../config/bennyFlightGameArt';
import {EPIC_ISLET, BENNY_FLIGHT, ULTRA_SNOW} from '../config/balance';
import {epicIsletReason} from '../simulation/epicIslet';
/** The islet of the Epics' name and its one rule, as the shop and its nest show them. */
const EPIC_ISLET_NAME = 'Îlot des Épiques';
const EPIC_ISLET_TEXT = 'Sur son nid, les chances d’un Épique, d’un Légendaire ou de Benny sont un peu plus grandes.';
import type {Command, DecorationLocation, GameState, PattesCommand, TimedStage} from '../state/types';
import {CHRISTMAS_DECORATION_IDS, DECORATIONS, DECORATION_IDS, FINE_GRID, isChristmasDecoration, ownedDecorationResalePrice, type DecorationId} from '../config/decorations';
import {CHRISTMAS_MARKET_OPEN_EVENT, christmasActive} from '../config/christmas';
import {CHRISTMAS_BONUS_CANDIES, CHRISTMAS_CHALLENGES, CHRISTMAS_PICK_COUNT, CHRISTMAS_RABBIT_CANDY_PRICE, SKY_GIFTS, SNOWMAN} from '../config/christmasEvent';
import {CANDY_ICON_URL, SKY_GIFTS_ART} from '../config/winterArt';
import {SKY_GIFTS_GAME} from '../simulation/skyGiftsGame';
import {CHRISTMAS_MARKET_ART} from '../config/christmasMarketArt';
import {availableChristmasRewards, candiesOf, christmasBonusClaimed, christmasBonusReady, christmasChallengesOf, christmasClaimable, christmasClaimed, christmasDecorationReason, christmasProgress, CHRISTMAS_RABBIT_IDS, christmasRabbitReason, skyGiftsDay, skyGiftsRabbitReason, snowmanQuote} from '../simulation/christmas';
import {mountSkyGiftsActivity} from './SkyGiftsActivity';
import {mountBennyFlightActivity} from './BennyFlightActivity';
import {bennyFlightDay, bennyFlightReason} from '../simulation/bennyFlight';
import {DEBRIS_NAMES} from '../simulation/debris';
import {catalogDecorationPlacementReason, purchaseDecorationReason} from '../simulation/decorations';
import {decorationUrl} from '../display/decorationArt';
import {quoteComplement, releaseBabyPattesFor, releaseGrass} from '../simulation/actions';
import {initiationAvailable} from '../simulation/initiation';
import {automaticNurseryTransfer, babyInNursery, firstNurseryBaby, nurseryBuilding, nurseryFull, nurseryUnlockQuote} from '../simulation/nursery';
import {accelerationCost, quoteAcceleration} from '../simulation/hearts';
import {rabbitIncome, individualIncomeRoll} from '../simulation/time';
import type {MeadowScene, MeadowSelection} from '../display/MeadowScene';
import {ActionGate} from './gestures';
import {portrait, rabbitPortrait} from './portraits';
import {EVOLUTION_AFFECTION, EVOLVED_ART, canEvolve, showsEvolvedArt, type LookRabbit} from '../config/evolvedArt';
import {DAILY_STREAK_TARGET, EVOLUTION_CHALLENGES, evolutionChallengeLabel, evolutionChallengeTarget, evolutionChallengesComplete} from '../config/evolutionChallenges';
import {evolvedRabbitArt, rabbitArt} from '../config/rabbitArt';
import {rabbitBlinkArt} from '../config/rabbitBlinkArt';
import {evolutionRevealed, forestRabbits, isEvolved, lookChanging} from '../simulation/forest';
import {PreferenceStore, Sounds} from './preferences';
import {onboardingTask} from './onboarding';
import {PailleDialogue} from './PailleDialogue';
import {mountPhotoControls} from './photoControls';
import {guidedStep, type GuideStep} from './guidance';
import {BUILDING_NAMES, CARE_NAMES, REFUSALS, RARITY_NAMES, busyReason, TYPE_NAMES, typeNames, recipeBook, recipePairs, buildingReason, collectionSpeciesView, collectionView, incomeWhole, moneyReason, nurseryView, occupants, oddsView, placementReason, rabbitAvailability, parentBusy, releaseReason, timeLeft, type Placement, type CollectionFilter} from './models';

/** One show button per legendary sheet: Anky's tail strike, the Dragon's fire breath, the Requin's surf. */
const LEGENDARY_SHOW_BUTTONS: Partial<Record<SpeciesId, {label: string; act: LegendaryAct}>> = {
  ankylosaure: {label: 'Coup de queue', act: 'slam'}, dragon: {label: 'Souffle de feu', act: 'tap'}, requin: {label: 'Surf', act: 'surf'},
};
type ShopTab = 'home' | 'recipes' | 'rabbits' | 'habitats' | 'buildings' | 'decorations';
type View = {kind:'album'|'decorationGroup'} | {kind: 'welcomeBaby'; birthId: string} | {kind:'levelRequirement';target:LevelAccessTarget} | {kind: 'missions'; tab: 'main' | 'daily'} | {kind: 'shop'; tab: ShopTab} | {kind: 'building' | 'rabbit' | 'moveRabbit' | 'decoration' | 'debris'; id: string} | {kind: 'jumpIsland'} | {kind: 'christmasMarket'; tab?: ChristmasMarketTab} |
  {kind: 'buyRabbit' | 'species'; species: SpeciesId; candies?: true} | {kind:'extension';parcelId?:ParcelId} | {kind: 'cuisineRabbit'; commis?: string} | {kind: 'collection' | 'settings' | 'placement' | 'hearts' | 'recipes' | 'arrange' | 'decorationPlacement'} | null;
/** Views drawn as a centred card over the dimmed meadow. Placement, purchase, extension and arrangement views keep the side sheet: they need the island visible. */
/** The three tabs of the full-screen Christmas market (owner, 5 November 2026). */
type ChristmasMarketTab = 'missions' | 'rewards' | 'gifts';
const CHRISTMAS_MARKET_TABS: readonly [ChristmasMarketTab, string, string][] = [
  ['missions', 'Missions de Noël', CANDY_ICON_URL], ['rewards', 'Récompenses spéciales', decorationUrl('christmas-tree')], ['gifts', 'Récupérer les cadeaux', SKY_GIFTS_ART.gifts[0]],
];
const CENTER_CARD_VIEWS: readonly NonNullable<View>['kind'][] = ['album','decorationGroup','rabbit', 'moveRabbit', 'welcomeBaby', 'building', 'jumpIsland', 'missions', 'collection', 'recipes', 'hearts', 'species', 'levelRequirement'];
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag); setCurrencyText(element, text); decorateRabbitText(element); element.className = className; return element;
}
const rewardLabel = (r: Reward) => r.resource==='none' ? 'Objectif de collection accompli' : `${r.amount} ${{pattes: 'pattes', grass: 'nourriture', hearts: r.amount === 1 ? 'cœur' : 'cœurs'}[r.resource]}`;
const heartAmount = (n: number) => `${n} ${n === 1 ? 'cœur' : 'cœurs'}`;
/** The rare birth steps, lowest first: « … l’affection 10 : ×1,15 · 15 : ×1,3 · 30 : ×1,5 · 50 : ×2. » */
/** A wall meal (14 → 15, 29 → 30, 49 → 50) costs more than the meals on either side. */
/** The painted heart of the HUD, as the affection emblem: affection is there from the first meal. */
function heartEmblem(): HTMLImageElement { return heartIcon(); }

/** A species shows its own drawing (catalogue, shop); one rabbit shows its evolution only after the explicit action. */
type Subject = SpeciesId | LookRabbit;
const subjectSpecies = (subject?: Subject): SpeciesId | undefined => typeof subject === 'object' ? subject.species : subject;
function avatar(subject?: Subject, large = false): HTMLElement {
  const species = subjectSpecies(subject);
  const element = node('span', '', large ? 'portrait large' : 'portrait'); element.innerHTML = typeof subject === 'object' ? rabbitPortrait(subject) : portrait(species); if (species) rabbitTheme(element, species); return element;
}
export class GameUI {
  private photoControls: ReturnType<typeof mountPhotoControls>;
  private decorationCollection='';
  private decorationGroup=new Set<string>();
  private groupOffset={x:0,y:0};
  private accountReminder: AccountReminder;
  private pailleDialogue: PailleDialogue;
  private get stagedOnboarding(): boolean { return this.controller.storageScope !== 'laboratory'; }
  private get onboardingActive(): boolean { const s = this.snapshot.state; return this.stagedOnboarding && s?.startCourse === 'paille-solo' && !mainCatalogueUnlocked(s) && this.preferences.value.tutorial && !this.preferences.value.tutorialDone && !s.missions.events.welcome; }
  private shopHabitatSpecies: SpeciesId | null = null;
  private view: View = null;
  private purchaseReturn: {view: NonNullable<View>; history: NonNullable<View>[]} | null = null;
  private rabbitDestination: string | null = null;
  private shopRabbitIssue: SpeciesId | null = null;
  private savePurchaseOrigin(): void {
    if (this.view?.kind !== 'shop' && this.view?.kind !== 'christmasMarket') return;
    this.rememberView(); this.purchaseReturn = {view: {...this.view}, history: [...this.history]};
  }
  private cancelPurchase(): void {
    const origin = this.purchaseReturn; this.purchaseReturn = null;
    this.rabbitDestination = null; this.scene.setRabbitPurchase(null);
    if (origin) { this.open(origin.view, 'back'); this.history = origin.history; this.render(); }
    else this.close();
  }
  private finishPurchase(kind: 'building' | 'rabbit' | 'decoration', id: string): void {
    this.purchaseReturn = null; this.shopReturn = null; this.history = [];
    this.placement = null; this.scene.setPlacement(null); this.decorationDraft = null;
    this.rabbitDestination = null; this.scene.setRabbitPurchase(null);
    const before = this.view;
    this.open({kind, id}, 'root');
    // The guided start may refuse the new view: the finished purchase never stays on screen behind Paille.
    if (this.view === before && this.onboardingActive) { this.view = null; this.syncArrangement(); this.render(); }
  }
  private movingRabbit: string | null = null;
  private moveBanner = node('div', '', 'rabbit-move-banner');
  /** The ready baby whose habitat is being chosen on the island (birthId), with its banner. */
  private welcoming: string | null = null;
  private welcomeBanner = node('div', '', 'rabbit-move-banner nursery-welcome-banner');
  /** The reception card of one ready baby: its own dialog, so Confier can still ask its confirmation in #game-dialog. */
  private reception = document.getElementById('reception-dialog') as HTMLDialogElement;
  /** A legendary's or Benny's show standing in for the reception card (created and removed by the show itself). */
  private receptionShow: HTMLDialogElement | null = null;
  private placement: Placement | null = null;
  private parents: [string | null, string | null] = [null, null];
  private snapshot: Snapshot;
  private unsubscribe: () => void;
  private panel = document.getElementById('game-panel')!;
  private content = document.getElementById('panel-content')!;
  private title = document.getElementById('panel-title')!;
  private settings = document.getElementById('settings-content')!;
  private toast = document.getElementById('toast')!;
  private tutorial = document.getElementById('tutorial')!;
  private dialog = document.getElementById('game-dialog') as HTMLDialogElement;
  private breedingDialog = document.getElementById('breeding-dialog') as HTMLDialogElement;
  private breedingNestId: string | null = null;
  private parentSearch = '';
  private parentElement: RabbitType | '' = '';
  private parentsAvailableOnly = false;
  private lastFarmCrop = new Map<string, NonNullable<Building['order']>['recipe']>();
  private gate = new ActionGate();
  private sounds: Sounds;
  private toastTimer = 0;
  private evolutionTimer = 0;
  private frame = 0;
  private abort = new AbortController();
  /** The control focused when a menu opened from the meadow; it gets the focus back when that menu closes. */
  private returnFocus: HTMLElement | null = null;
  private collectionFilter: CollectionFilter = {};
  private recipeDetails = new Set<SpeciesId>();
  private recipeClosed = new Set<SpeciesId>();
  private recipeExpanded = new Set<SpeciesId>();
  private missionFilter: 'all' | 'ready' | 'pending' | 'claimed' = 'all';
  private placedListOpen = false;
  private history: NonNullable<View>[] = [];
  private scrollPositions = new Map<string, number>();
  private requestedScroll: number | null = null;
  private requestedFocus: string | null = null;
  private requestedRecipeFocus: SpeciesId | null = null;
  private shopReturn: {view: View; history: NonNullable<View>[]; arranging: boolean} | null = null;
  private shopResources = node('div', '', 'shop-resources');
  private interactionPointers = new Set<number>();
  private pendingRender = false;
  /** A caress under way on a rabbit's portrait: the sheet is not rebuilt until it ends, so the animation is never cut. */
  private petting = false;
  private petTimer = 0;
  private petCooldownUntil = -Infinity;
  /** The name being typed in a rabbit's sheet: kept here, not in the DOM, so a refresh never loses the text, the caret or the focus. */
  private rename: {id: string; text: string; caret: number; error: string | null} | null = null;
  /** Which bubble of Coco's first welcome is shown (interface only: the welcome itself is saved once finished). */
  private agencyWelcomeStep = 0;
  /** The rabbit chosen at the Salon de soins, before choosing its care. */
  private salonRabbit: string | null = null;
  private reasonId = 0;
  private lastSecond = -1;
  private confirmationGeneration = 0;
  private arranging = false;
  private decorationDraft: {id: string; catalogId?: DecorationId; location: DecorationLocation | null; rotation: 0 | 1;} | null = null;
  private photo = false;
  private cuisine: ReturnType<typeof mountCuisineActivity>;
  private jumpRope: ReturnType<typeof mountJumpRopeActivity>;
  /** Christmas: « Les cadeaux du ciel », and whether the market shows its rabbit choice for it. */
  private skyGifts: ReturnType<typeof mountSkyGiftsActivity>;
  private bennyFlight: ReturnType<typeof mountBennyFlightActivity>;
  private heartsBeforeFlight: number | null = null;
  /** Whether the full-screen shop or market currently covers the island (its Phaser loop sleeps meanwhile). */
  private shopCovering = false;
  private skyGiftsPick = false;
  /** The jump-rope trio being chosen (two carriers, then the athlete) and the slot whose rabbit is being picked. */
  private jumpRopeSlots: (string | null)[] | null = null;
  private jumpRopePick: number | null = null;
  private readonly onRabbitSheet?: (species: SpeciesId) => void;
  constructor(private controller: GameController, private scene: MeadowScene, private clock: () => number, private preferences: PreferenceStore, audio?: AudioEngine,
    activityOptions: {onlineServicesAllowed?: boolean; accountKnown?: () => boolean; onCuisineCompleted?: (result: RecipeCompletion) => void; onCuisineActive?: (active: boolean) => void; onRabbitSheet?: (species: SpeciesId) => void} = {}) {
    this.onRabbitSheet = activityOptions.onRabbitSheet;
    this.snapshot = controller.getSnapshot(); this.sounds = audio ? new Sounds(preferences, audio) : new Sounds(preferences);
    this.photoControls=mountPhotoControls(document.getElementById('app')!,()=>this.scene.capturePhoto());
    this.pailleDialogue = new PailleDialogue(preferences, (id, name) => controller.perform({type: 'renameRabbit', id, name}).ok,
      () => { const s = this.snapshot.state; if (!s) return; const task = onboardingTask(s,this.preferences.value,this.now()); if (task.step.done) this.preferences.set({tutorialDone:true}); this.guide(task.step); this.render(); },
      () => { this.renderPreferences(); this.render(); }, () => this.open({kind:'settings'}, 'root'));
    this.cuisine = mountCuisineActivity(document.getElementById('app')!, {onRecipeCompleted: result => {
      const rabbit = this.cuisine.selectedRabbit, taster = this.cuisine.taster;
      const granted = rabbit ? this.controller.perform({type: 'rewardCuisine', rabbitId: rabbit.id, ...(taster ? {tasterId: taster.id} : {}), recipeId: result.recipeId}) : {ok: false as const, reason: 'NOT_FOUND' as const};
      activityOptions.onCuisineCompleted?.(result);
      if (!granted.ok) return `Récompense non enregistrée : ${REFUSALS[granted.reason]}`;
      const reward = granted.cuisineReward!, lucky = granted.state.rabbits.find(r => r.id === reward.affectionRabbitId), luckyName = taster && lucky ? ` pour ${lucky.name || SPECIES[lucky.species].name}` : '';
      if (taster) this.cuisine.showAffection(reward.affectionRabbitId);
      return `+${reward.pattes} pattes · +${reward.grass} nourriture${reward.affectionGranted ? ` · +1 Affection${luckyName}` : reward.affectionAtCap ? ` · Affection maximale${luckyName}` : reward.affectionEvolutionRequired ? ` · Fais évoluer ${lucky ? (lucky.name || SPECIES[lucky.species].name) : 'ce lapin'} pour dépasser 30.` : reward.affectionStatueRequired ? (affectionStatueCount(granted.state) === 0 ? ` · La Statue de l’Affection permet de dépasser ${AFFECTION_STATUE.cap}.` : ` · Une deuxième Statue de l’Affection permet de dépasser ${SECOND_AFFECTION_STATUE.cap}.`) : ' · Affection du jour déjà gagnée en cuisine'}${reward.heartGranted ? ' · +1 Cœur' : ''}`;
    }, quotaText: () => { const state = this.controller.getSnapshot().state; return state ? cuisineQuotaText(state, this.now()) : ''; }, onExit: () => this.render(), onActiveChange: activityOptions.onCuisineActive});
    this.jumpRope = mountJumpRopeActivity(document.getElementById('app')!, {onFinished: (team, score) => {
      const granted = this.controller.perform({type: 'rewardJumpRope', team: {carriers: [team.carriers[0].id, team.carriers[1].id], athlete: team.athlete.id}, score});
      if (!granted.ok) return `Récompense non enregistrée : ${REFUSALS[granted.reason]}`;
      const reward = granted.jumpRopeReward!, parts = [...(reward.challenge ? ['Défi du jour réussi !'] : []), ...(reward.pattes ? [`+${reward.pattes} pattes`] : []), ...(reward.hearts ? [`+${reward.hearts} Cœur${reward.hearts > 1 ? 's' : ''}`] : [])];
      return parts.length ? parts.join(' · ') : score ? 'Partie pour le plaisir : plus de récompense aujourd’hui' : '';
    }, quotaText: () => { const state = this.controller.getSnapshot().state; return state ? jumpRopeQuotaText(state, this.now()) : ''; },
    best: () => this.controller.getSnapshot().state?.jumpRope?.best ?? 0, cheer: () => this.sounds.ping(), tick: () => this.sounds.tick(),
    challengeText: () => { const state = this.controller.getSnapshot().state; return state ? jumpRopeChallengeText(state, this.now()) : ''; }, onExit: () => this.render()});
    this.skyGifts = mountSkyGiftsActivity(document.getElementById('app')!, {onFinished: (rabbit, caught) => {
      const before = this.controller.getSnapshot().state, granted = this.controller.perform({type: 'rewardSkyGifts', rabbitId: rabbit.id, caught});
      if (!granted.ok) return `Récompense non enregistrée : ${REFUSALS[granted.reason]}`;
      const candies = before ? candiesOf(granted.state) - candiesOf(before) : 0;
      const parts = [...(Number(granted.value) > 0 ? [`+${granted.value} pattes`] : []), ...(candies > 0 ? [`+${candyAmount(candies)}`] : [])];
      return parts.length ? parts.join(' · ') : caught ? 'Partie pour le plaisir : plus de récompense aujourd’hui' : '';
    }, quotaText: () => { const state = this.controller.getSnapshot().state; return state ? skyGiftsQuotaText(state, this.now()) : ''; },
    best: () => this.controller.getSnapshot().state?.christmas?.skyGifts?.best ?? 0, cheer: () => this.sounds.ping(), onExit: () => this.render()});
    this.bennyFlight = mountBennyFlightActivity(document.getElementById('app')!, {onFinished: passed => {
      const granted = this.controller.perform({type: 'rewardBennyFlight', passed});
      if (!granted.ok) return `Récompense non enregistrée : ${REFUSALS[granted.reason]}`;
      const won = granted.state.hearts - (this.heartsBeforeFlight ?? granted.state.hearts); this.heartsBeforeFlight = granted.state.hearts;
      const parts = [...(Number(granted.value) > 0 ? [`+${granted.value} pattes`] : []), ...(won > 0 ? [`+${won} Cœur`] : [])];
      return parts.length ? parts.join(' · ') : passed ? 'Partie pour le plaisir : plus de récompense aujourd’hui' : '';
    }, quotaText: () => { const state = this.controller.getSnapshot().state; return state ? bennyFlightQuotaText(state, this.now()) : ''; },
    best: () => this.controller.getSnapshot().state?.bennyFlight?.best ?? 0, onExit: () => this.render()});
    this.moveBanner.id = 'rabbit-move-banner'; this.moveBanner.hidden = true;
    this.moveBanner.setAttribute('role', 'region'); this.moveBanner.setAttribute('aria-label', 'Déplacer un lapin');
    const moveLabel = node('span'); moveLabel.setAttribute('role', 'status'); this.moveBanner.append(moveLabel);
    this.button(this.moveBanner, 'Choisir dans une liste', () => {
      const id = this.movingRabbit; if (!id) return;
      this.clearRabbitMove(); this.open({kind: 'moveRabbit', id}, 'root');
      this.content.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }, null, true);
    this.button(this.moveBanner, 'Annuler', () => this.cancelRabbitMove(), null, true);
    document.getElementById('app')!.append(this.moveBanner);
    this.welcomeBanner.id = 'nursery-welcome-banner'; this.welcomeBanner.hidden = true;
    this.welcomeBanner.setAttribute('role', 'region'); this.welcomeBanner.setAttribute('aria-label', 'Accueillir un lapereau');
    const welcomeLabel = node('span'); welcomeLabel.setAttribute('role', 'status'); this.welcomeBanner.append(welcomeLabel);
    this.button(this.welcomeBanner, 'Choisir dans une liste', () => {
      const birthId = this.welcoming; if (!birthId) return;
      this.clearWelcome(); this.open({kind: 'welcomeBaby', birthId}, 'root');
      this.content.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }, null, true);
    this.button(this.welcomeBanner, 'Annuler', () => this.cancelWelcome(), null, true);
    document.getElementById('app')!.append(this.welcomeBanner);
    // A closing reception card (Escape, cross, a choice) empties itself unless it was reopened meanwhile.
    this.reception.addEventListener('close', () => { if (!this.reception.open) this.reception.replaceChildren(); });
    const options = {signal: this.abort.signal};
    const skip = node('button','Passer le tutoriel','onboarding-skip'); skip.id='onboarding-skip';
    skip.onclick=()=>{this.preferences.set({tutorial:false});this.pailleDialogue.close();this.renderPreferences();this.render();};
    document.getElementById('app')!.append(skip);
    document.addEventListener('click', event => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('button, a, input, select');
      if (this.onboardingActive && target && !this.onboardingAllowed(target)) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, {...options, capture:true});
    document.getElementById('open-arrange')!.addEventListener('click', () => this.open({kind: 'arrange'}), options);
    // The laboratory's « Ouvrir le Marché de Noël » button; ignored outside laboratory storage.
    window.addEventListener(CHRISTMAS_MARKET_OPEN_EVENT, () => { if (this.controller.storageScope === 'laboratory' && christmasActive()) this.open({kind: 'christmasMarket'}, 'root'); }, options);
    document.getElementById('exit-arrange')!.addEventListener('click', () => this.close(), options);
    document.getElementById('open-photo')!.addEventListener('click', () => this.setPhoto(true), options);
    document.getElementById('photo-return')!.addEventListener('click', () => this.setPhoto(false), options);
    document.getElementById('open-missions')!.addEventListener('click', () => this.open({kind: 'missions', tab: 'main'}), options);
    document.getElementById('recenter-view')!.addEventListener('click', () => { this.scene.recenter(); if (preferences.value.tutorial) preferences.set({intro: true, guideCamera: true}); this.renderTutorial(); }, options);
    document.getElementById('open-hearts')!.addEventListener('click', () => this.open({kind: 'hearts'}), options);
    document.getElementById('open-shop')!.addEventListener('click', () => this.open({kind: 'shop', tab: 'home'}, 'root'), options);
    document.getElementById('open-collection')!.addEventListener('click', () => this.open({kind: 'collection'}, 'root'), options);
    document.getElementById('open-settings')!.addEventListener('click', () => this.open({kind: 'settings'}, 'root'), options);
    document.getElementById('save-warning')!.addEventListener('click', () => this.open({kind: 'settings'}), options);
    document.getElementById('cloud-warning')?.addEventListener('click', () => { this.open({kind: 'settings'}, 'root'); document.getElementById('account-content')?.scrollIntoView?.({block: 'start'}); }, options);
    document.getElementById('close-panel')!.addEventListener('click', () => this.close(), options);
    document.getElementById('panel-backdrop')?.addEventListener('click', () => this.close(), options);
    document.getElementById('panel-back')!.addEventListener('click', () => this.back(), options);
    // Escape closes the open menu like its cross; fields and dialogs that handle Escape themselves have already consumed it.
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (this.movingRabbit) { event.preventDefault(); this.cancelRabbitMove(); return; }
      if (this.welcoming) { event.preventDefault(); this.cancelWelcome(); return; }
      if (this.view) { event.preventDefault(); this.close(); }
    }, options);
    // Keep native selectors and a gesture's original controls alive during passive saves.
    this.shopResources.setAttribute('aria-label', 'Ressources');
    this.shopResources.hidden = true; this.panel.querySelector('.panel-header')!.insertBefore(this.shopResources, document.getElementById('close-panel'));
    this.panel.addEventListener('pointerdown', event => this.interactionPointers.add(event.pointerId), options);
    this.tutorial.addEventListener('pointerdown', event => this.interactionPointers.add(event.pointerId), options);
    const release = (event: PointerEvent) => { this.interactionPointers.delete(event.pointerId); requestAnimationFrame(() => this.flushRender()); };
    window.addEventListener('pointerup', release, options); window.addEventListener('pointercancel', release, options);
    this.panel.addEventListener('focusout', () => requestAnimationFrame(() => this.flushRender()), options);
    window.addEventListener('blur', () => { this.interactionPointers.clear(); this.flushRender(); }, options);
    document.getElementById('tutorial-toggle')!.addEventListener('click', () => { preferences.set({tutorial: !preferences.value.tutorial || preferences.value.tutorialDone, tutorialDone: false, guideConfigured: true}); this.renderPreferences(); this.render(); }, options);
    this.dialog.addEventListener('cancel', () => { this.dialog.replaceChildren(); }, options);
    this.breedingDialog.addEventListener('close', () => { this.breedingNestId = null; this.breedingDialog.replaceChildren(); if(this.onboardingActive){this.pailleDialogue.invite();this.renderTutorial();} }, options);
    let firstSnapshot = true;
    this.unsubscribe = controller.subscribe(snapshot => {
      const unchanged = !firstSnapshot && snapshot.viewRevision === this.snapshot.viewRevision && snapshot.status === this.snapshot.status &&
        snapshot.issue === this.snapshot.issue && snapshot.generation === this.snapshot.generation;
      firstSnapshot = false;
      const replaced = this.snapshot && snapshot.generation !== this.snapshot.generation;
      this.snapshot = snapshot;
      if (replaced) this.onReplacement();
      if (!snapshot.state) this.view = {kind: 'settings'};
      const warning = document.getElementById('save-warning')!;
      warning.hidden = snapshot.status === 'saved';
      warning.textContent = snapshot.state ? 'Sauvegarde non enregistrée · Paramètres' : 'Partie non chargée · Paramètres';
      // Every baby's painted reception frame loads while it grows, so its card never opens empty.
      if (snapshot.state) for (const baby of nurseryBuilding(snapshot.state)?.nursery?.babies ?? []) preloadReceptionFrame(SPECIES[baby.birth.species].types[0]);
      if (!unchanged) { this.render(true); this.renderTutorial(); }
    });
    this.accountReminder = new AccountReminder(preferences,
      () => activityOptions.onlineServicesAllowed !== false && controller.storageScope !== 'laboratory' &&
        new URLSearchParams(location.search).get('dev') !== '1' && !!cloudConfig() && !(activityOptions.accountKnown ?? accountKnown)(),
      // Only Paille's guided start postpones it; the optional guide card may stay visible all game long.
      () => this.onboardingActive,
      () => {
        this.open({kind: 'settings'}, 'root');
        const account = document.getElementById('account-content');
        if (account) {
          account.dataset.createAccount = 'true';
          account.dispatchEvent(new Event('create-account'));
          account.scrollIntoView?.({block: 'start'});
          account.querySelector<HTMLInputElement>('[name=email]')?.focus({preventScroll: true});
        }
      });
    this.renderPreferences();
    // Countdown text is a projection of timestamps; the controller alone advances the simulation.
    // A quarter-second check, not a 60 Hz frame loop: the countdowns change once a second (audit of 7 November 2026).
    const tick = () => {
      const second = Math.floor(this.clock() / 1000);
      if (second !== this.lastSecond && !document.hidden) { this.lastSecond = second; this.updateTimers(); this.accountReminder.flush(); }
    };
    this.frame = window.setInterval(tick, 250);
  }
  private now(): number { return Math.max(this.clock(), this.snapshot.state?.lastSimulatedAt ?? 0); }
  private renderPreferences(): void {
    document.getElementById('tutorial-toggle')!.textContent = this.preferences.value.tutorial && !this.preferences.value.tutorialDone ? 'Quitter le guidage' : 'Reprendre le guidage';
  }
  private notice(message: string): void {
    if (!message) return; // Nothing to say (the island shows the reward itself).
    if (!this.toast.hidden && this.toast.dataset.message === message) return;
    this.toast.classList.remove('mission-reward');
    this.toast.dataset.message = message; setCurrencyText(this.toast, message); this.toast.hidden = false; window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { this.toast.hidden = true; }, 4300);
  }
  private button(parent: HTMLElement, label: string, action: () => void, reason: string | null = null, secondary = false): HTMLButtonElement {
    const button = node('button', label, secondary ? 'secondary action-secondary' : 'action-primary'); button.type = 'button'; button.disabled = !!reason;
    button.onclick = action; parent.append(button);
    if (reason) { const explanation = node('p', reason, 'reason'); explanation.id = `action-reason-${++this.reasonId}`; button.setAttribute('aria-describedby', explanation.id); parent.append(explanation); }
    return button;
  }
  /**
   * A habitat's coins, and at Christmas the sucres d'orge its coin bubble held. From the bubble (`bubble`), the amounts rise above
   * the habitat instead of a message (owner, 7 November 2026); from the habitat's sheet, the message stays.
   */
  private collectIncome(id: string, bubble = false): void {
    const before = this.snapshot.state ? candiesOf(this.snapshot.state) : 0;
    this.execute({type: 'collectIncome', id}, value => {
      const after = this.controller.getSnapshot().state, candies = after ? candiesOf(after) - before : 0;
      if (bubble) { this.scene.playIncomeCollect?.(id, Number(value), candies); return ''; }
      return `+ ${value} pattes${candies > 0 ? ` · +${candyAmount(candies)}` : ''}`;
    });
  }
  private execute(command: Command, success: string | ((value?: string | number) => string), after?: (value?: string | number) => void): void {
    this.gate.run(JSON.stringify(command), () => {
      const fireBreeding = command.type === 'breed' && command.parents.some(id => this.snapshot.state?.rabbits.some(r => r.id === id && r.species === 'feu'));
      const crop = command.type === 'collectOrder' ? this.snapshot.state?.buildings.find(b => b.id === command.id)?.order?.recipe : undefined;
      const result = this.controller.perform(command);
      if (!result.ok) { this.notice(REFUSALS[result.reason]); this.render(); return; }
      if (command.type === 'collectOrder' && crop) this.lastFarmCrop.set(command.id, crop);
      if (command.type === 'startOrder') this.lastFarmCrop.set(command.id, command.recipe);
      this.sounds.ping(); const message=typeof success === 'function' ? success(result.value) : success;
      this.notice(message); after?.(result.value); this.render();
      if (fireBreeding) this.accountReminder.request();
    });
  }
  /**
   * Caressing a rabbit in its sheet, just for fun (owner, 4 November 2026): rubbing the portrait with a finger or the mouse
   * (pressed, then about 40 px of movement or a few small back-and-forths; a simple touch does nothing) closes its eyes, sends
   * up a few hearts, wiggles the portrait gently and plays the soft confirmation sound. At most one caress every 1.5 s. The
   * command only counts for the « Des caresses » daily mission.
   */
  private attachCaress(portraitElement: HTMLElement, rabbit: Rabbit): void {
    portraitElement.classList.add('pettable'); portraitElement.dataset.petRabbit = rabbit.id;
    portraitElement.title = 'Frotte doucement pour caresser';
    let rub: {pointer: number; x: number; y: number; distance: number; reversals: number; direction: string} | null = null;
    portraitElement.addEventListener('pointerdown', event => {
      rub = {pointer: event.pointerId, x: event.clientX, y: event.clientY, distance: 0, reversals: 0, direction: ''};
      try { portraitElement.setPointerCapture?.(event.pointerId); } catch { /* Capture is a comfort only. */ }
    });
    portraitElement.addEventListener('pointermove', event => {
      if (!rub || event.pointerId !== rub.pointer) return;
      const dx = event.clientX - rub.x, dy = event.clientY - rub.y; if (!dx && !dy) return;
      rub.x = event.clientX; rub.y = event.clientY;
      // Only a sideways rub caresses (audit, 4 November 2026): an up or down slide scrolls the sheet (touch-action: pan-y).
      if (Math.abs(dx) <= Math.abs(dy)) return;
      rub.distance += Math.abs(dx);
      const direction = `x${Math.sign(dx)}`;
      if (rub.direction && rub.direction !== direction) rub.reversals++;
      rub.direction = direction; event.preventDefault();
      if (rub.distance >= 40 || (rub.reversals >= 3 && rub.distance >= 12)) { rub.distance = 0; rub.reversals = 0; this.caress(portraitElement, rabbit); }
    });
    const stop = (event: PointerEvent) => { if (rub?.pointer === event.pointerId) rub = null; };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) portraitElement.addEventListener(type, stop);
  }
  private caress(portraitElement: HTMLElement, rabbit: Rabbit): void {
    const now = performance.now(); if (now < this.petCooldownUntil) return;
    this.petCooldownUntil = now + 1500;
    // Nothing to win and nothing to refuse: a stale sheet simply shows its caress.
    this.controller.perform({type: 'petRabbit', rabbitId: rabbit.id});
    this.sounds.ping();
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.endCaress(portraitElement);
    this.petting = true; portraitElement.dataset.petting = reduced ? 'still' : 'wiggle';
    // Closed eyes: the « eyes-closed » patch over the drawing shown, the first one or the evolved one (each has its own eyelids).
    const picture = portraitElement.querySelector<HTMLImageElement>('img[data-rabbit-art]'), evolved = !!picture?.hasAttribute('data-evolved');
    const art = evolved ? evolvedRabbitArt(rabbit.species) : rabbitArt(rabbit.species);
    const patch = rabbitBlinkArt(rabbit.species, evolved)?.patches.find(item => item.kind === 'eyes-closed');
    if (picture && art && patch && picture.getAttribute('src') === art.url) {
      let figure = picture.parentElement?.classList.contains('ultimate-figure') || picture.parentElement?.classList.contains('pet-figure') ? picture.parentElement : null;
      if (!figure) {
        figure = node('span', '', 'pet-figure'); figure.style.setProperty('--ratio', String(art.width / art.height));
        picture.replaceWith(figure); figure.append(picture); portraitElement.dataset.petFigure = '';
      }
      const lid = document.createElement('img'); lid.className = 'pet-eyelid'; lid.src = patch.url; lid.alt = ''; lid.draggable = false; lid.setAttribute('aria-hidden', 'true');
      lid.style.left = `${patch.x / art.width * 100}%`; lid.style.top = `${patch.y / art.height * 100}%`; lid.style.width = `${patch.width / art.width * 100}%`;
      figure.append(lid);
    }
    const hearts = node('span', '', 'pet-hearts'); hearts.setAttribute('aria-hidden', 'true'); if (reduced) hearts.dataset.reduced = '';
    for (let k = 0; k < 5; k++) { const heart = heartEmblem(); heart.style.setProperty('--i', String(k)); hearts.append(heart); }
    portraitElement.append(hearts);
    this.petTimer = window.setTimeout(() => { this.endCaress(portraitElement); requestAnimationFrame(() => this.flushRender()); }, 1400);
  }
  private endCaress(portraitElement?: HTMLElement): void {
    window.clearTimeout(this.petTimer); this.petTimer = 0; this.petting = false;
    if (!portraitElement) return;
    delete portraitElement.dataset.petting;
    portraitElement.querySelectorAll('.pet-eyelid, .pet-hearts').forEach(element => element.remove());
  }
  /** A short painted reveal shown only after the explicit evolution action has been saved. */
  private showEvolutionMoment(rabbit: Rabbit): void {
    this.dismissEvolutionMoment();
    const art = EVOLVED_ART.find(entry => entry.id === rabbit.species);
    const oldArt = rabbitArt(rabbit.species), newArt = evolvedRabbitArt(rabbit.species);
    if (!art || !oldArt || !newArt) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const root = node('div', '', 'evolution-moment'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `Évolution : ${art.name}`); root.dataset.reducedMotion = String(reduced);
    root.style.setProperty('--evolution-background', `url("${import.meta.env.BASE_URL}assets/effects/evolution/evolution-background.png")`);
    const artBox = node('div', '', 'evolution-moment-art');
    const before = document.createElement('img'); before.src = oldArt.url; before.alt = ''; before.className = 'evolution-before'; before.draggable = false;
    const after = document.createElement('img'); after.src = newArt.url; after.alt = ''; after.className = 'evolution-after'; after.draggable = false;
    const sparkles = document.createElement('img'); sparkles.src = `${import.meta.env.BASE_URL}assets/effects/evolution/evolution-sparkles.png`; sparkles.alt = ''; sparkles.className = 'evolution-sparkles'; sparkles.draggable = false;
    artBox.append(before, after, sparkles);
    const title = node('h1', art.name, 'evolution-moment-title');
    const hint = node('p', reduced ? 'Ton lapin a évolué.' : 'Touche pour passer', 'evolution-moment-hint');
    const close = node('button', 'Continuer', 'evolution-moment-close'); close.type = 'button';
    root.append(artBox, title, hint, close); document.body.append(root);
    let ended = false;
    const finish = () => { if (ended) return; ended = true; this.dismissEvolutionMoment(); };
    this.abort.signal.addEventListener('abort', finish, {once: true});
    root.addEventListener('click', finish); close.addEventListener('click', event => { event.stopPropagation(); finish(); });
    root.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') { event.preventDefault(); finish(); } });
    close.focus();
    if (!reduced) this.evolutionTimer = window.setTimeout(finish, 2500);
  }
  private dismissEvolutionMoment(): void {
    window.clearTimeout(this.evolutionTimer); this.evolutionTimer = 0;
    document.querySelector('.evolution-moment')?.remove();
  }
  private levelAction(card:HTMLElement, action:HTMLButtonElement | readonly HTMLButtonElement[], s:GameState, target:LevelAccessTarget):void {
    const access=stateLevelAccess(s,target);
    mountLevelLock(card,action).update(access);
    card.dataset.levelTarget=target.family==='extension'?String(target.rank):target.id;
    this.button(card,'Consulter la fiche',()=>this.open({kind:'levelRequirement',target}),null,true);
  }
  private renderLevelRequirement(s:GameState,target:LevelAccessTarget):void {
    const access=stateLevelAccess(s,target);
    this.title.textContent='Niveau du joueur';
    if(target.family==='species') {
      const info=SPECIES[target.id];this.content.append(this.card(info.name,`${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`,target.id));
      if(info.recipe)this.button(this.content,'Consulter la recette',()=>this.openRecipe(target.id),null,true);
    } else if(target.family==='decoration'){
      const d=DECORATIONS[target.id];
      this.content.append(this.decorationCard(target.id,`${d.heartPrice !== undefined ? heartAmount(d.heartPrice) : `${d.price} pattes`} · empreinte ${d.width} × ${d.height}${d.rotates?' · rotation possible':''}`));
      this.content.append(node('p','Les exemplaires déjà possédés restent utilisables. Le niveau limite uniquement les nouveaux achats.','small'));
    } else if(target.family==='habitatPurchase')this.content.append(this.card(HABITATS[target.id].name,HABITATS[target.id].accepted));
    this.content.append(node('p',`Niveau du joueur : ${access.currentLevel} · Niveau ${access.requiredLevel} requis`,'badge'),...(access.accessible&&!access.historicalException?[]:[node('p',access.historicalException?'Droit historique conservé pour cette action.':'Progresse en jouant et en réclamant tes récompenses de missions.','small')]));
    this.button(this.content,'Voir les missions',()=>this.open({kind:'missions',tab:'main'}),null,true);
  }
  private compatibleHabitats(species:SpeciesId):void {
    this.shopHabitatSpecies=species;this.open({kind:'shop',tab:'habitats'});
  }
  private card(title: string, description = '', subject?: Subject): HTMLElement {
    const species = subjectSpecies(subject);
    const card = node('article', '', 'card'); if (species) rabbitTheme(card, species);
    const heading = node('div', '', 'card-heading'); if (subject) heading.append(avatar(subject));
    const text = node('div'); text.append(node('h3', title)); if (description) text.append(node('p', description)); heading.append(text); card.append(heading);
    return card;
  }
  private stats(values: [string, string][]): HTMLElement {
    const group = node('div', '', 'stats');
    for (const [label, value] of values) {
      const stat = node('div', '', 'stat');
      const emblem = node('span', '', 'stat-emblem'); emblem.setAttribute('aria-hidden', 'true');
      if (label === 'Occupants') emblem.append(avatar('paille'));
      else if (label === 'Affection') emblem.append(heartEmblem());
      else {
        const image = node('img'); image.alt = ''; image.draggable = false;
        image.src = `${import.meta.env.BASE_URL}assets/currency/coin.png`;
        emblem.append(image);
      }
      const amount = node('strong', value);
      if (label === 'Stock' || label === 'Revenu') amount.querySelectorAll('.coin-icon').forEach(icon => icon.remove());
      stat.append(emblem, node('span', `${label} `), amount); group.append(stat);
    }
    return group;
  }
  /** Decorative identity only; the panel's accessible title remains the original text. */
  private menuPortrait(image: HTMLElement): void {
    image.classList.add('menu-identity'); image.setAttribute('aria-hidden', 'true');
    if (image instanceof HTMLImageElement) image.alt = '';
    image.querySelectorAll('img').forEach(child => child.alt = '');
    this.panel.querySelector('.panel-header')!.insertBefore(image, this.title);
  }
  private workState(state: 'free' | 'running' | 'ready' | 'blocked', next: string): void {
    const box = node('div', '', 'work-state'); box.dataset.state = state;
    box.append(node('strong', {free: 'Libre', running: 'En cours', ready: 'Prêt', blocked: 'Bloqué'}[state]), node('p', next)); this.content.append(box);
  }
  private viewKey(view: NonNullable<View>): string { return JSON.stringify(view); }
  private rememberView(): void {
    if (this.view) this.scrollPositions.set(this.viewKey(this.view), this.view.kind === 'settings' ? this.settings.scrollTop : this.content.scrollTop);
  }
  private openCuisine(): void {
    if (!this.snapshot.state || this.cuisine.active || this.view?.kind === 'cuisineRabbit') return;
    this.open({kind: 'cuisineRabbit'});
  }
  /** Cuisine is played by two rabbits: first the commis (cooks, wears the toque), then the taster (bib, tastes the dish). */
  private renderCuisineRabbits(s: GameState, commisId?: string): void {
    const commis = commisId ? s.rabbits.find(r => r.id === commisId && !away(s, r.id)) : undefined;
    this.title.textContent = commis ? 'Choisis ton goûteur' : 'Choisis ton commis';
    if (window.innerHeight > window.innerWidth) this.content.append(node('p', 'La Cuisine se joue en paysage : tourne ton téléphone.', 'reason'));
    this.content.append(node('p', cuisineQuotaText(s, this.now()), 'cuisine-quota'));
    if (!s.rabbits.length) { this.content.append(node('p', 'Tu as besoin d’un lapin pour cuisiner.')); return; }
    const start = (commisId: string, tasterId?: string) => {
      if (this.view?.kind !== 'cuisineRabbit' || this.cuisine.active) return;
      const now = this.controller.getSnapshot().state!, pick = (id?: string) => id === undefined ? undefined : now.rabbits.find(r => r.id === id && !away(now, r.id));
      const cook = pick(commisId), taster = pick(tasterId);
      if (!cook || (tasterId !== undefined && !taster)) { this.render(); return; }
      while (this.view?.kind === 'cuisineRabbit') this.back();
      this.cuisine.open({id: cook.id, species: cook.species, name: cook.name, affection: cook.affection, classicLook: cook.classicLook, evolution: cook.evolution}, taster && {id: taster.id, species: taster.species, name: taster.name, affection: taster.affection, classicLook: taster.classicLook, evolution: taster.evolution});
    };
    if (!commis) {
      this.content.append(node('p', s.rabbits.length > 1 ? 'Ton commis cuisine avec toi. Ensuite, tu choisiras le goûteur, qui goûtera le plat.' : 'Ton lapin sera à la fois commis et goûteur.', 'cuisine-pick-intro'));
      for (const rabbit of s.rabbits) {
        const card = this.rabbitCard(s, rabbit.id);
        const choose = this.button(card, s.rabbits.length > 1 ? 'Choisir comme commis' : 'Cuisiner avec ce lapin', () => {
          if (this.view?.kind !== 'cuisineRabbit' || this.view.commis || this.cuisine.active) return;
          const now = this.controller.getSnapshot().state!, current = now.rabbits.find(r => r.id === rabbit.id);
          if (!current || away(now, current.id)) { this.render(); return; }
          if (now.rabbits.length < 2) start(current.id); else this.open({kind: 'cuisineRabbit', commis: current.id});
        }, travelling(s, rabbit.id) ? REFUSALS.TRAVELING : atSalon(s, rabbit.id) ? REFUSALS.AT_SALON : null);
        choose.dataset.cuisineRabbit = rabbit.id;
        this.content.append(card);
      }
      return;
    }
    const chosen = node('div', '', 'cuisine-pick-commis');
    chosen.append(node('p', `Commis : ${commis.name || SPECIES[commis.species].name}`));
    this.button(chosen, 'Changer de commis', () => this.back(), null, true).dataset.cuisineChangeCommis = '';
    this.content.append(chosen, node('p', 'Le goûteur attend à côté et goûte le plat à la fin. Un des deux lapins, tiré au sort, gagne l’affection.', 'cuisine-pick-intro'));
    const others = s.rabbits.filter(r => r.id !== commis.id);
    for (const rabbit of others) {
      const card = this.rabbitCard(s, rabbit.id);
      this.button(card, 'Choisir comme goûteur', () => start(commis.id, rabbit.id), travelling(s, rabbit.id) ? REFUSALS.TRAVELING : atSalon(s, rabbit.id) ? REFUSALS.AT_SALON : null).dataset.cuisineTaster = rabbit.id;
      this.content.append(card);
    }
    // Every other rabbit is away: the commis cooks and tastes alone rather than blocking the Cuisine.
    if (others.every(r => away(s, r.id))) this.button(this.content, 'Cuisiner sans goûteur', () => start(commis.id)).dataset.cuisineAlone = '';
  }
  private back(): void {
    let previous = this.history.pop();
    // A completed or canceled preview has no draft to restore.
    while (previous && ((previous.kind === 'placement' && !this.placement) || (previous.kind === 'decorationPlacement' && !this.decorationDraft))) previous = this.history.pop();
    if (previous) this.open(previous, 'back'); else if (this.view?.kind === 'shop' && this.view.tab !== 'home') this.open({kind: 'shop', tab: 'home'}, 'back'); else this.close();
  }
  private interactionActive(): boolean {
    // A field being typed in keeps the keyboard open: passive refreshes wait until it loses the focus.
    return this.petting || this.interactionPointers.size > 0 || ((document.activeElement instanceof HTMLSelectElement || document.activeElement instanceof HTMLInputElement) && this.panel.contains(document.activeElement));
  }
  private flushRender(): void { if (this.pendingRender && !this.interactionActive()) this.render(); }
  open(view: NonNullable<View>, navigation: 'push' | 'root' | 'tab' | 'back' = 'push'): void {
    if (view.kind === 'settings' || this.snapshot.state && mainCatalogueUnlocked(this.snapshot.state)) this.pailleDialogue.close();
    if (this.onboardingActive && !this.onboardingViewAllowed(view)) return;
    if (this.cuisine.active || this.jumpRope.active || this.skyGifts.active || this.bennyFlight.active || this.pailleDialogue.element.open) return;
    if (this.dialog.open || (document.getElementById('import-dialog') as HTMLDialogElement).open) return;
    if (view.kind !== 'christmasMarket') this.skyGiftsPick = false;
    if(view.kind==='buyRabbit' && !view.candies) {
      const state=this.controller.getSnapshot().state,target={family:'species',id:view.species,action:'purchase'} as const;
      if(state && stateLevelAccess(state,target).locked){this.open({kind:'levelRequirement',target});return;}
    }
    if(view.kind==='shop' && view.tab==='home')this.shopHabitatSpecies=null;
    if (view.kind === 'buyRabbit' && this.view?.kind !== 'buyRabbit') {
      const state = this.controller.getSnapshot().state;
      if (state && !state.buildings.some(b => !habitatEntryReason(state,b,view.species))) {
        // A Christmas rabbit of the market: no shop to send the player to, only the reason.
        if (view.candies) { this.notice('Il te faut un habitat compatible avec une place libre pour l’accueillir.'); return; }
        this.shopRabbitIssue = view.species;
        if (this.view?.kind !== 'shop') this.open({kind:'shop',tab:'rabbits'});
        else this.render();
        return;
      }
      this.savePurchaseOrigin();
      this.purchaseReturn ??= {view:{kind:'shop',tab:'rabbits'},history:[{kind:'shop',tab:'home'}]};
      this.rabbitDestination = null;
    }
    if (!['placement','decorationPlacement','buyRabbit'].includes(view.kind) && this.view && ['placement','decorationPlacement','buyRabbit'].includes(this.view.kind)) this.purchaseReturn = null;
    if (view.kind !== 'buyRabbit') this.scene.setRabbitPurchase(null);
    // Opening a rabbit's sheet (not coming back to it) may start that rabbit's own music.
    if (view.kind === 'rabbit' && navigation !== 'back' && !(this.view?.kind === 'rabbit' && this.view.id === view.id)) {
      const species = this.snapshot.state?.rabbits.find(r => r.id === view.id)?.species;
      if (species) this.onRabbitSheet?.(species);
    }
    this.clearRabbitMove(); this.clearWelcome();
    this.rememberView();
    const enteringShop = view.kind === 'shop' && this.view?.kind !== 'shop' && navigation !== 'back';
    if (enteringShop) this.shopReturn = {view: this.view, history: [...this.history], arranging: this.arranging};
    if (view.kind !== 'shop' && navigation === 'root') this.shopReturn = null;
    if (navigation === 'root') this.history = [];
    else if (navigation === 'push' && this.view && this.viewKey(view) !== this.viewKey(this.view)) {
      const previous = this.history.map(item => this.viewKey(item)).lastIndexOf(this.viewKey(view));
      if (previous >= 0) this.history = this.history.slice(0, previous);
      else this.history.push({...this.view});
    }
    if (enteringShop && view.kind === 'shop') this.history = view.tab === 'home' ? [] : [{kind: 'shop', tab: 'home'}];
    if (this.placement && view.kind !== 'placement') { this.placement = null; this.scene.setPlacement(null); }
    const decorationView = ['arrange', 'decorationPlacement', 'decoration','placement'].includes(view.kind);
    if (!decorationView) { this.arranging = false; this.decorationDraft = null; }
    else if (view.kind !== 'decoration') this.arranging = true;
    if (view.kind !== 'decorationPlacement') this.decorationDraft = null;
    this.requestedScroll = this.scrollPositions.get(this.viewKey(view)) ?? 0;
    if (view.kind === 'settings') this.settings.scrollTop = this.scrollPositions.get(this.viewKey(view)) ?? 0;

    if (!this.view && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) this.returnFocus = document.activeElement;
    if (view.kind === 'collection') this.preferences.set({guideCollection: true});
    const entersSheet = ['placement','decorationPlacement','buyRabbit'].includes(view.kind) && this.view?.kind !== view.kind;
    this.view = view; this.syncArrangement(); this.controller.refresh(); this.render();
    if (entersSheet && !this.onboardingActive) this.scene.fitAboveSheet?.();
    this.scene.setExpansion(view.kind==='extension',view.kind==='extension'?view.parcelId:undefined);
  }
  close(): void {
    if (this.movingRabbit) { this.cancelRabbitMove(); return; }
    if (this.welcoming) { this.cancelWelcome(); return; }
    if (this.onboardingActive) {
      this.purchaseReturn=null;this.shopReturn=null;this.history=[];this.view=null;this.placement=null;this.arranging=false;
      this.scene.setPlacement(null);this.scene.setTutorialCell(null);this.scene.setRabbitPurchase(null);
      this.pailleDialogue.invite();this.syncArrangement();this.render();return;
    }
    if (this.cuisine.active) { this.cuisine.close(); return; }
    if (this.jumpRope.active) { this.jumpRope.close(); return; }
    if (this.skyGifts.active) { this.skyGifts.close(); return; }
    if (this.bennyFlight.active) { this.bennyFlight.close(); return; }
    this.skyGiftsPick = false;
    if (this.dialog.open || (document.getElementById('import-dialog') as HTMLDialogElement).open) return;
    if (this.purchaseReturn) { this.cancelPurchase(); return; }
    this.scene.setRabbitPurchase(null); this.rabbitDestination = null;
    const previous = this.view?.kind === 'shop' ? this.shopReturn : null;
    this.shopReturn = null;
    this.rememberView(); this.history = []; this.interactionPointers.clear();
    this.scene.setExpansion(false); this.view = null; this.placement = null; this.arranging = false; this.decorationDraft = null; this.scene.setPlacement(null);
    if (previous) { this.view = previous.view; this.history = previous.history; this.arranging = previous.arranging; if (this.view) this.requestedScroll = this.scrollPositions.get(this.viewKey(this.view)) ?? 0; }
    this.pailleDialogue.invite(); this.syncArrangement(); this.render();
    // Back to the control that opened the menu (Settings, Missions…), for keyboards and screen readers.
    if (!this.view && this.returnFocus?.isConnected) this.returnFocus.focus({preventScroll: true});
    if (!this.view) this.returnFocus = null;
  }
  onReplacement(fresh = false): void {
    this.clearRabbitMove(); this.clearWelcome(); this.closeReception();
    this.pailleDialogue.close();
    this.cuisine.close(false); this.jumpRope.close(); this.skyGifts.close(); this.bennyFlight.close(); this.skyGiftsPick = false;
    this.history = []; this.scrollPositions.clear(); this.interactionPointers.clear(); this.pendingRender = false;
    this.shopHabitatSpecies=null;
    this.purchaseReturn = null; this.rabbitDestination = null; this.shopRabbitIssue = null; this.scene.setRabbitPurchase(null);
    this.collectionFilter = {}; this.recipeDetails.clear(); this.recipeClosed.clear(); this.recipeExpanded.clear(); this.requestedFocus = null; this.requestedRecipeFocus = null; this.missionFilter = 'all'; this.placedListOpen = false; this.shopReturn = null; this.content.scrollTop = 0; this.settings.scrollTop = 0;
    this.content.replaceChildren();
    this.scene.setExpansion(false);
    if (fresh) this.preferences.restartGuidance();
    this.renderPreferences();
    this.confirmationGeneration++;
    this.arranging = false; this.decorationDraft = null; this.setPhoto(false); this.syncArrangement();
    this.parents = [null, null]; this.placement = null; this.scene.setPlacement(null);
    this.lastFarmCrop.clear(); this.parentSearch = ''; this.parentElement = ''; this.parentsAvailableOnly = false;
    this.decorationGroup.clear();this.groupOffset={x:0,y:0};this.decorationCollection='';
    if (this.dialog.open) this.dialog.close(); this.dialog.replaceChildren();
    this.view = {kind: 'settings'}; this.syncArrangement(); this.render();
  }
  select(selection: MeadowSelection): void {
    if (this.onboardingActive) {
      const s = this.snapshot.state!, task = onboardingTask(s,this.preferences.value,this.now());
      const expected = task.step.target;
      const building = 'id' in selection ? s.buildings.find(b => b.id === selection.id) : null;
      const rabbit = 'id' in selection ? s.rabbits.find(r => r.id === selection.id) : null;
      const allowed = selection.kind === 'empty' || this.placement && ['fineCell','cell'].includes(selection.kind) ||
        this.view?.kind === 'buyRabbit' && building?.habitat?.type === 'neige' ||
        selection.kind === 'grass' && task.step.id === 'harvest' && !task.waiting ||
        selection.kind === 'birth' && task.step.id === 'transfer' && !task.waiting ||
        !!this.welcoming && selection.kind === 'building' ||
        selection.kind === 'nurseryBubble' && building?.kind === expected ||
        selection.kind === 'nurseryBaby' && task.step.id === 'welcomeBirth' && !task.waiting ||
        selection.kind === 'building' && building?.kind === expected ||
        selection.kind === 'rabbit' && rabbit?.species === expected;
      if (!allowed) return;
    }
    if (this.cuisine.active || this.pailleDialogue.element.open) return;
    if (this.photo || this.view?.kind === 'shop') return;
    if (this.dialog.open || (document.getElementById('import-dialog') as HTMLDialogElement).open) return;
    if (this.movingRabbit) {
      if (selection.kind === 'building') this.dropRabbit(this.movingRabbit, selection.id);
      return;
    }
    if (this.welcoming) {
      if (selection.kind === 'building') this.dropWelcome(this.welcoming, selection.id);
      return;
    }
    if (this.view?.kind === 'buyRabbit') {
      const state = this.controller.getSnapshot().state, species = this.view.species;
      if (state && selection.kind === 'building' && state.buildings.some(b => b.id === selection.id && !habitatEntryReason(state,b,species))) {
        this.chooseRabbitHabitat(selection.id);
      }
      return;
    }
    if (this.placement || this.decorationDraft) {
      if (selection.kind === 'fineCell' || selection.kind === 'cell') {
        if (this.placement) { this.placement.cell = {x:selection.x,y:selection.y}; this.scene.setPlacement(this.placement); this.render(); }
        else this.selectDecoration(selection);
      }
      return;
    }
    if (selection.kind === 'income') { this.collectIncome(selection.id, true); return; }
    if (selection.kind === 'grass') { this.execute({type: 'collectOrder', id: selection.id}, value => `+ ${value} nourriture`); return; }
    if (selection.kind === 'birth') { this.sendBirth(selection.id); return; }
    // « Prêt ! » is a signal only: it shows the nursery and its panel; each baby is welcomed from its own card.
    if (selection.kind === 'nurseryBubble') { this.scene.focusBuilding?.(selection.id); this.open({kind: 'building', id: selection.id}); return; }
    if (selection.kind === 'nurseryBaby') { this.openReception(selection.id); return; }
    // A ready nursery bubble opens its ordinary actions, including during arrangement.
    if (this.arranging && selection.kind === 'building' && this.snapshot.state?.buildings.find(b => b.id === selection.id)?.kind !== 'enclosure') {
      this.open({kind: 'building', id: selection.id}); return;
    }
    if (this.arranging) { this.selectDecoration(selection); return; }
    if (selection.kind === 'decoration') { this.open({kind: 'decoration', id: selection.id}); return; }
    if (selection.kind === 'fineCell' || selection.kind === 'cell') {
      return;
    }
    if (selection.kind === 'empty') { this.close(); return; }
    if (selection.kind === 'extension') this.open({kind: 'extension',parcelId:selection.parcelId});
    else if (selection.kind === 'jumpIsland') this.open({kind: 'jumpIsland'});
    else if (selection.kind === 'debris') this.open({kind: 'debris', id: selection.id});
    else if (selection.kind === 'christmasMarket') { if (christmasActive()) this.open({kind: 'christmasMarket'}); }
    else if (selection.kind === 'building' || selection.kind === 'rabbit') this.open({kind: selection.kind, id: selection.id});
  }
  private render(passive = false): void {
    if (passive && this.interactionActive()) { this.pendingRender = true; return; }
    this.pendingRender = false;
    this.syncRabbitMove(); this.syncWelcome();
    this.renderTutorial();
    this.applyOnboardingLock();
    if (this.breedingDialog.open) this.renderBreeding();
    // The Christmas challenges waiting to be claimed count with the missions (their panel leads to the market).
    const available = this.snapshot.state ? availableMissionRewards(this.snapshot.state) + (christmasActive() ? availableChristmasRewards(this.snapshot.state) : 0) : 0;
    const badge = document.getElementById('missions-badge')!;
    badge.hidden = !available; badge.textContent = String(available);
    document.getElementById('open-missions')!.setAttribute('aria-label', available ? `Missions · ${available} récompense${available > 1 ? 's' : ''} disponible${available > 1 ? 's' : ''}` : 'Missions');
    const scroll = this.requestedScroll ?? this.content.scrollTop;
    this.requestedScroll = null;
    const placedListOpen = this.content.querySelector<HTMLDetailsElement>('[data-placed-list]')?.open ?? this.placedListOpen;
    this.placedListOpen = placedListOpen;
    if (this.rename && !(this.view?.kind === 'rabbit' && this.view.id === this.rename.id)) this.rename = null;
    const focusId = this.requestedFocus ?? (document.activeElement as HTMLElement | null)?.dataset.focus;
    this.requestedFocus = null;
    this.panel.hidden = !this.view;
    document.body.classList.toggle('panel-open', !!this.view);
    // The shop, and the Christmas market (owner, 5 November 2026: « ça doit ressembler au fonctionnement de la boutique »), fill the screen.
    const market = this.view?.kind === 'christmasMarket' && christmasActive();
    const fullShop = market || this.view?.kind === 'shop' || this.view?.kind==='levelRequirement' && this.view.target.family==='decoration' && this.history.some(view=>view.kind==='shop');
    this.panel.classList.toggle('shop-fullscreen', fullShop);
    if (fullShop !== this.shopCovering) { this.shopCovering = fullShop; window.dispatchEvent(new CustomEvent<IslandCover>(ISLAND_COVER_EVENT, {detail: {source: 'shop', covered: fullShop}})); }
    this.panel.classList.toggle('christmas-market', market);
    document.body.classList.toggle('shop-open', fullShop);
    this.shopResources.hidden = !fullShop;
    if (fullShop && this.snapshot.state) {
      const s = this.snapshot.state;
      if (market) {
        const candies = node('span', candyAmount(candiesOf(s)), 'christmas-resource'), icon = document.createElement('img');
        icon.src = CANDY_ICON_URL; icon.alt = ''; icon.width = 18; icon.height = 18; icon.onerror = () => { icon.hidden = true; }; candies.prepend(icon);
        this.shopResources.replaceChildren(candies, node('span', `${s.pattes} pattes`));
      } else this.shopResources.replaceChildren(node('span', `${s.pattes} pattes`), node('span', `${s.grass} nourriture`), node('span', heartAmount(s.hearts)));
    }
    this.panel.dataset.view = this.view?.kind ?? '';
    // Settings, the list menus, a rabbit's card and a building's menu open in the middle of the screen, over the dimmed meadow, with
    // the full height to scroll (a phone in landscape left the side panel about 240 px). The guided start keeps the side panel, except Settings.
    const card = !!this.view && (this.view.kind === 'settings' || (!this.onboardingActive && CENTER_CARD_VIEWS.includes(this.view.kind)));
    clearRabbitTheme(this.panel); clearLegendaryCard(this.panel); clearUltimateCard(this.panel);
    this.panel.classList.toggle('center-card', card); document.body.classList.toggle('center-card-open', card);
    const backdrop = document.getElementById('panel-backdrop'); if (backdrop) backdrop.hidden = !card;
    document.getElementById('panel-back')!.hidden = !this.history.length && !fullShop;
    this.settings.hidden = this.view?.kind !== 'settings'; this.content.hidden = this.view?.kind === 'settings';
    this.content.replaceChildren(); if (!this.view) return;
    this.panel.querySelector('.menu-identity')?.remove();
    if (this.view.kind === 'settings') { this.title.textContent = 'Paramètres'; return; }
    const s = this.snapshot.state; if (!s) { this.title.textContent = 'Partie indisponible'; return; }
    switch (this.view.kind) {
      case 'album': this.renderAlbum(s);break;
      case 'decorationGroup': this.renderDecorationGroup(s);break;
      case 'cuisineRabbit': this.renderCuisineRabbits(s, this.view.commis); break;
      case 'missions': this.renderMissions(s, this.view.tab); break;
      case 'hearts': this.renderHearts(s); break;
      case 'shop': this.renderShop(s, this.view.tab); break;
      case 'building': this.renderBuilding(s, this.view.id); break;
      case 'jumpIsland': this.renderJumpIsland(s); break;
      case 'debris': this.renderDebris(s, this.view.id); break;
      case 'christmasMarket': this.renderChristmasMarket(s, this.view.tab ?? 'missions'); break;
      case 'rabbit': this.renderRabbit(s, this.view.id); break;
      case 'moveRabbit': this.renderDestinations(s, this.view.id); break;
      case 'welcomeBaby': this.renderWelcomeDestinations(s, this.view.birthId); break;
      case 'levelRequirement':this.renderLevelRequirement(s,this.view.target);break;
      case 'buyRabbit': if (this.view.candies) this.renderBuyChristmasRabbit(s, this.view.species); else this.renderBuyRabbit(s, this.view.species); break;
      case 'recipes': this.renderRecipes(s); break;
      case 'collection': this.renderCollection(s); break;
      case 'species': this.renderSpecies(s, this.view.species); break;
      case 'extension': this.renderExtension(s); break;
      case 'placement': this.renderPlacement(s); break;
      case 'arrange': this.renderInventory(s); break;
      case 'decoration': this.renderDecoration(s, this.view.id); break;
      case 'decorationPlacement': this.renderDecorationPlacement(s); break;
    }
    const buildingView = this.view?.kind === 'building' ? this.view : null;
    if (this.view && (['shop', 'collection', 'recipes', 'missions'].includes(this.view.kind) || (buildingView && s.buildings.some(b => b.id === buildingView.id && b.kind === 'farm' && !b.order)))) {
      const grid = node('div', '', 'menu-grid'); grid.append(...this.content.childNodes); this.content.append(grid);
    }
    const placedList = this.content.querySelector<HTMLDetailsElement>('[data-placed-list]');
    if (placedList) placedList.open = placedListOpen;
    this.content.scrollTop = scroll;
    if (focusId) {
      const target = [...this.content.querySelectorAll<HTMLElement>('[data-focus]')].find(el => el.dataset.focus === focusId);
      if (target && !(target instanceof HTMLButtonElement && target.disabled)) target.focus({preventScroll: true});
      else if (focusId.startsWith('recipe-action-')) this.content.querySelector<HTMLElement>(`[data-focus="recipe-title-${focusId.slice('recipe-action-'.length)}"]`)?.focus({preventScroll: true});
      else if (this.view?.kind === 'missions') this.content.querySelector<HTMLElement>(`[data-mission-filter="${this.missionFilter}"]`)?.focus({preventScroll: true});
    }
    if (this.requestedRecipeFocus && this.view.kind === 'recipes') {
      const target = this.content.querySelector<HTMLElement>(`[data-recipe="${this.requestedRecipeFocus}"]`);
      this.requestedRecipeFocus = null;
      target?.scrollIntoView?.({block: 'start'});
      target?.querySelector<HTMLElement>('[data-focus]')?.focus({preventScroll: true});
    }
    if (this.rename && focusId === 'rabbit-name') this.content.querySelector<HTMLInputElement>('input[data-focus="rabbit-name"]')?.setSelectionRange(this.rename.caret, this.rename.caret);
    this.updateTimers(); this.highlightGuideTarget();
  }
  private renderShop(s: GameState, tab: ShopTab): void {
    this.title.textContent = 'Boutique';
    if (tab === 'home') {
      for (const [category, title, description] of [
        ['recipes', 'Recettes de lapins', 'Achète et consulte les recettes de reproduction.'],
        ['rabbits', 'Lapins', `Les ${SHOP_SPECIES.filter(id => SPECIES[id].rarity === 'common').length} espèces communes à accueillir.`],
        ['habitats', 'Habitats', 'Des places adaptées à tous les types.'],
        ['buildings', 'Bâtiments et décorations', 'Production et objets pour aménager la prairie.']
      ] as const) {
        const card = this.card(title, description); card.classList.add('shop-category');
        const art = category === 'rabbits' ? avatar('paille') : category === 'habitats' ? habitatThumbnail('universal') : node('img');
        if (art instanceof HTMLImageElement && category !== 'habitats') { art.src = category === 'buildings' ? FARM_ART.url : NEST_ART.url; art.alt = ''; art.draggable = false; }
        art.classList.add('category-art'); art.setAttribute('aria-hidden', 'true'); art.querySelectorAll('img').forEach(image => image.alt = '');
        card.querySelector('.card-heading')!.prepend(art);
        this.button(card, title, () => this.open({kind: 'shop', tab: category})); this.content.append(card);
      }
      const island = this.card('Île', 'Agrandir l’île.'); island.classList.add('shop-category');
      this.button(island, 'Île', () => this.open({kind: 'extension'})); this.content.append(island);
      return;
    }
    if (tab === 'recipes') { this.renderRecipeShop(s); return; }
    this.content.append(node('h3', {rabbits: 'Lapins', habitats: 'Habitats', buildings: 'Bâtiments et décorations', decorations: 'Bâtiments et décorations'}[tab]));
    if (tab === 'buildings' || tab === 'decorations') {
      const tabs = node('div', '', 'tabs');
      for (const [key, label] of [['buildings', 'Bâtiments'], ['decorations', 'Décorations']] as const) {
        const button = this.button(tabs, label, () => this.open({kind: 'shop', tab: key}, 'tab'), null, tab !== key);
        button.setAttribute('aria-pressed', String(tab === key));
      }
      this.content.append(tabs);
    }
    if (tab === 'decorations') { this.renderDecorationShop(s); return; }
    if (tab === 'habitats' || tab === 'buildings') {
      const basic = habitatLevel('universal', 1);
      const utility: Record<BuildingKind, string> = {enclosure: `${basic.capacity} places · tous les types · stocke ${basic.cap} pattes`, farm: `Ferme niveau 1 : 5 cultures \u00b7 maximum ${farmLimit(playerLevel(s))} actuellement \u00b7 3 au niveau 12, 4 au niveau 15`, kitchen: 'Cuisine - maximum 1', statue: `Ouvre l’affection ${AFFECTION_STATUE.cap + 1} à ${SECOND_AFFECTION_STATUE.cap}, puis ${SECOND_AFFECTION_STATUE.cap + 1} à ${BALANCE.maxAffection} avec la deuxième · maximum 2`, agency: 'Fait voyager tes lapins · des cœurs au retour · maximum 1', salon: 'Bain, brossage ou massage · +1 d’affection au retour · maximum 1', forest: 'Change gratuitement le dessin des lapins déjà évolués · maximum 1', nest: 'Deux parents · maximum 1', nursery: 'Une place pour grandir · maximum 1', perch: 'Le vol de Benny · maximum 1'};
      if (tab === 'habitats') {
      const universal = this.card(HABITATS.universal.name, `${utility.enclosure} · empreinte 4 × 4`); universal.prepend(habitatThumbnail('universal'));
      if(!this.shopHabitatSpecies || stateLevelAccess(s,{family:'habitatPurchase',id:'universal'}).accessible) {
      const target={family:'habitatPurchase',id:'universal'} as const;
      const action=this.button(universal, `Placer · ${habitatPrice('universal')} pattes`, () => this.beginPlacement('enclosure'), stateLevelAccess(s,target).locked?null:buildingReason(s, 'enclosure', true));
      this.levelAction(universal,action,s,target);this.content.append(universal);}
      if(this.shopHabitatSpecies)this.content.append(node('p',`Habitats achetables compatibles avec ${SPECIES[this.shopHabitatSpecies].name}`,'badge'));
      this.content.append(node('h3', 'Habitats spécialisés'));
      for (const type of HABITAT_TYPES.filter(type => type !== 'universal' && (!this.shopHabitatSpecies || SPECIES[this.shopHabitatSpecies].types.includes(type) && stateLevelAccess(s,{family:'habitatPurchase',id:type}).accessible))) {
        const stats = habitatLevel(type, 1), card = this.card(HABITATS[type].name, `${HABITATS[type].accepted} · ${stats.capacity} places · stocke ${stats.cap} pattes · empreinte 4 × 4`); card.prepend(habitatThumbnail(type));
        const target={family:'habitatPurchase',id:type} as const;
        const action=this.button(card, `Placer · ${stats.cost} pattes`, () => this.beginPlacement('enclosure', undefined, type), stateLevelAccess(s,target).locked?null:buildingReason(s, 'enclosure', true, type));
        this.levelAction(card,action,s,target);this.content.append(card);
      }
      } else {
      this.content.append(node('p', 'Le nid et la nurserie sont offerts et ne sont pas vendus.', 'small'));
      for (const kind of ['farm', 'kitchen', 'agency', 'salon', 'forest', 'perch', 'statue'] as const) {
        const card = this.card(BUILDING_NAMES[kind], `${utility[kind]} · empreinte 4 × 4`);
        if (kind === 'agency') { card.classList.add('statue-offer'); card.querySelector('.card-heading')!.prepend(agencyThumbnail()); card.append(node('p', `Dès le niveau ${TRAVEL.unlockLevel}, ${HOST_NAME} envoie tes lapins en vacances : voyages de 3 à 10 heures, cœurs en souvenir au retour.`, 'small')); }
        if (kind === 'salon') { card.classList.add('statue-offer'); card.querySelector('.card-heading')!.prepend(salonThumbnail()); card.append(node('p', `Dès le niveau ${SALON.unlockLevel}, offre un soin à un lapin : un bain, un brossage ou un massage. Il revient avec +1 d’affection et de l’XP, et tes ${SALON.heartCaresPerCycle} premiers soins du jour rapportent aussi des cœurs.`, 'small')); }
        if (kind === 'forest') { card.classList.add('statue-offer'); card.querySelector('.card-heading')!.prepend(forestThumbnail()); card.append(node('p', `Dès le niveau ${FOREST.unlockLevel}, choisis pour chaque lapin déjà évolué entre son nouveau dessin et l’ancien. C’est gratuit, et chaque changement prend 7 heures.`, 'small')); }
        if (kind === 'statue') { card.classList.add('statue-offer'); card.querySelector('.card-heading')!.prepend(statueThumbnail(affectionStatueCount(s) >= 1)); card.append(node('p', affectionStatueCount(s) === 0 ? `La Statue de l’Affection récompense tes soins : sans elle, l’affection s’arrête à ${AFFECTION_STATUE.cap}. Avec elle, chaque lapin peut atteindre ${SECOND_AFFECTION_STATUE.cap}. Une deuxième statue, dès le niveau ${SECOND_AFFECTION_STATUE.level}, ouvre l’affection ${SECOND_AFFECTION_STATUE.cap + 1} à ${BALANCE.maxAffection} à tes lapins évolués.` : `Ta deuxième Statue de l’Affection ouvre l’affection ${SECOND_AFFECTION_STATUE.cap + 1} à ${BALANCE.maxAffection} à tes lapins évolués. Dès le niveau ${SECOND_AFFECTION_STATUE.level}.`, 'small')); }
        if (kind === 'perch') { card.classList.add('statue-offer'); const image = node('img'); image.src = PERCH_ART.url; image.alt = ''; image.className = 'statue-thumbnail'; image.width = 72; image.height = 72; card.querySelector('.card-heading')!.prepend(image); card.append(node('p', `Avec Benny sur ton île, joue au vol de Benny : touche le ciel pour qu’elle batte des ailes et passe entre les colonnes de bottes de foin. Tes ${BENNY_FLIGHT.rewardedGamesPerCycle} premières parties du jour rapportent des pattes, et la toute première un cœur si Benny franchit ${BENNY_FLIGHT.heartColumns} colonnes.`, 'small')); }
        if (kind === 'statue') card.append(node('p', `Ton solde : ${heartAmount(s.hearts)}. Économise tes cœurs pour la construire.`, 'small'));
        const price = kind === 'statue' ? heartAmount((nextAffectionStatue(s) ?? SECOND_AFFECTION_STATUE).heartPrice) : `${BALANCE.buildings[kind].price} pattes`;
        this.button(card, `Placer · ${price}`, () => this.beginPlacement(kind), buildingReason(s, kind, true)); this.content.append(card);
      }
      this.content.append(this.jumpIslandOffer(s));
      this.content.append(this.epicIsletOffer(s));
      }
    } else for (const species of SHOP_SPECIES) {
      const card = this.card(SPECIES[species].name, `${typeNames(SPECIES[species].types)} · ${RARITY_NAMES[SPECIES[species].rarity]} · affection 1 · ${rabbitIncome(1, species)} pattes / h`, species);
      const full = !s.buildings.some(b => b.kind === 'enclosure' && !habitatEntryReason(s, b, species));
      const target={family:'species',id:species,action:'purchase'} as const;
      const action=this.button(card, `Choisir un habitat · ${SPECIES[species].price} pattes`, () => this.open({kind: 'buyRabbit', species}));
      this.levelAction(card,action,s,target);
      if(stateLevelAccess(s,target).locked){this.content.append(card);continue;}
      if (full && this.shopRabbitIssue === species) this.rabbitNoRoom(card,s,species);
      this.content.append(card);
    }
  }
  private beginPlacement(kind: BuildingKind, movingId?: string, habitatType?: HabitatType, starter = false, ultra = false): void {
    if (!movingId && (kind==='nest'||kind==='nursery') && !starter) return;
    const state=this.controller.getSnapshot().state,target={family:'habitatPurchase',id:habitatType??'universal'} as const;
    if(!movingId && !starter && kind==='enclosure' && state && stateLevelAccess(state,target).locked){this.open({kind:'levelRequirement',target});return;}
    this.savePurchaseOrigin();
    this.arranging=true;this.decorationDraft=null;this.syncArrangement();
    this.placement = {kind, movingId, habitatType, starter, ...(ultra ? {ultra: true as const} : {}), cell: null};
    if (this.onboardingActive && state) {
      const cell = this.onboardingFreeCell(state, this.placement);
      if (kind === 'enclosure') this.placement.cell = cell;
      this.scene.setTutorialCell(kind === 'farm' ? cell : null);
      this.scene.recenter();
    }
    this.scene.setPlacement(this.placement); this.open({kind: 'placement'});
    if(this.onboardingActive && state) {const cell=this.placement?.cell ?? this.onboardingFreeCell(state,{kind,cell:null});if(cell)this.scene.focusTutorialCell(cell);}
  }
  private renderPlacement(s: GameState): void {
    const p = this.placement; if (!p) { this.close(); return; }
    const moving = s.buildings.find(b => b.id === p.movingId);
    const price = p.ultra ? candyAmount(ULTRA_SNOW.candies[1]) : p.kind === 'statue' ? heartAmount((nextAffectionStatue(s) ?? SECOND_AFFECTION_STATUE).heartPrice) : `${p.kind === 'enclosure' ? habitatPrice(p.habitatType ?? 'universal') : BALANCE.buildings[p.kind].price} pattes`;
    const name = p.ultra || moving?.habitat?.ultra ? 'Enclos Ultra neige' : p.kind === 'enclosure' ? HABITATS[p.habitatType ?? moving?.habitat?.type ?? 'universal'].name : BUILDING_NAMES[p.kind];
    this.title.textContent = `${p.movingId ? 'Déplacer' : 'Placer'} : ${name}`;
    if (p.kind === 'statue' && !p.movingId) this.content.append(node('p', `Prix : ${price} · ton solde : ${heartAmount(s.hearts)}`, 'small'));
    if (p.ultra) this.content.append(node('p', `Prix : ${price} · ton solde : ${candyAmount(candiesOf(s))}`, 'small'));
    // The footprint shown is the building's real one: an enlarged enclosure keeps its tier when it moves.
    const size = buildingSize(s.buildings.find(b => b.id === p.movingId) ?? {kind: p.kind}), footprint = `${size.width} × ${size.depth}`;
    this.content.append(node('p', `Touche un petit carré pour choisir le coin de l’empreinte ${footprint}. Déplacement par pas d’un carré. Glisse ou pince pour ajuster la vue.`));
    this.content.append(node('p', p.cell ? `Grille fine : (${p.cell.x}, ${p.cell.y}) · empreinte ${footprint}` : 'Aucune case sélectionnée.', 'badge'));
    // No square anywhere for a new building: say so at once, instead of leaving the player looking for one.
    if (!p.movingId && !p.starter && !hasRoomFor(s, p.kind)) this.content.append(node('p', `Plus aucune place de ${footprint} sur ton île. Achète une parcelle dans l’onglet Île de la boutique, ou déplace un bâtiment avec Aménager. Rien n’est payé.`, 'placement-invalid'));
    const reason = placementReason(s, p);
    this.content.append(node('p', !p.cell ? 'Choisis une destination.' : reason ? `× ${reason}` : `✓ Emplacement valide · empreinte ${footprint}`, !p.cell ? 'placement-pending' : reason ? 'placement-invalid' : 'placement-valid'));
    this.button(this.content, p.movingId ? 'Confirmer le déplacement · gratuit' : p.starter ? 'Placer gratuitement' : this.onboardingActive ? `Confirmer · ${price}` : `Acheter et placer · ${price}`, () => {
      if (this.placement !== p || !p.cell) return;
      const cmd: Command = p.movingId ? {type: 'moveBuilding', id: p.movingId, ...p.cell} : p.starter && (p.kind==='nest'||p.kind==='nursery') ? {type:'placeStarterBuilding',kind:p.kind,...p.cell} : {type: 'buyBuilding', kind: p.kind, habitatType: p.habitatType, ...(p.ultra ? {ultra: true as const} : {}), ...p.cell};
      this.execute(cmd, p.movingId ? 'Bâtiment déplacé.' : `${name} construit.`, value => this.finishPurchase('building', p.movingId ?? String(value)));
    }, placementReason(s, p) ?? (p.ultra && !p.movingId && candiesOf(s) < ULTRA_SNOW.candies[1] ? REFUSALS.NOT_ENOUGH_CANDIES : null));
    if (p.kind !== 'statue' && !p.ultra && !p.movingId && !p.starter && p.cell) this.complement(this.content, s, {type: 'buyBuilding', kind: p.kind, habitatType: p.habitatType, ...p.cell},
      `Acheter et placer : ${name} (grille fine ${p.cell.x}, ${p.cell.y})`, `${name} construit.`,
      value => this.finishPurchase('building', p.movingId ?? String(value)));
    this.button(this.content, 'Annuler · aucun coût', () => this.cancelPurchase(), null, true);
  }
  private syncArrangement(): void {
    document.getElementById('arrange-banner')!.hidden = !this.arranging || !!this.placement;
    document.body.classList.toggle('arranging', this.arranging);
    this.scene.setArrangement(this.arranging, this.decorationDraft ? {id: this.decorationDraft.id, location: this.decorationDraft.location, ...(this.decorationDraft.catalogId ? {catalogId:this.decorationDraft.catalogId} : {})} : null);
    this.scene.setDecorationSelection(this.view?.kind === 'decoration' ? this.view.id : this.view?.kind === 'decorationPlacement' ? this.decorationDraft?.id ?? null : null);
  }
  private setPhoto(active: boolean): void {
    if (this.photo === active) return;
    if (active && document.querySelector('dialog[open]')) return;
    if (active) this.close();
    this.photo = active; document.body.classList.toggle('photo-mode', active);
    document.getElementById('photo-return')!.hidden = !active; this.scene.setPhoto(active); this.photoControls.setVisible(active);
  }
  private decorationCard(id: DecorationId, description = ''): HTMLElement {
    const card = this.card(DECORATIONS[id].name, description), icon = node('span', '', 'decoration-icon');
    const img = document.createElement('img'); img.src = decorationUrl(id); img.alt = DECORATIONS[id].name; img.onerror = () => { img.hidden = true; }; icon.append(img); card.querySelector('.card-heading')!.prepend(icon); return card;
  }
  private renderAlbum(s:GameState):void {
    this.title.textContent='Album et souvenirs';
    this.button(this.content,'Prendre une photo',()=>{this.close();this.setPhoto(true);},null,true);
    this.content.append(node('h3','Tes moments partagés'));
    const memories=[...(s.cozy?.album??[])].reverse();
    if(!memories.length)this.content.append(node('p','Les prochaines naissances, amitiés et aventures trouveront leur place ici.'));
    for(const memory of memories){const card=this.card(new Date(memory.at).toLocaleDateString('fr-FR'),memory.text);card.dataset.memory=memory.key;this.content.append(card);}
    this.content.append(node('h3','Cartes de voyage'));
    for(const destination of TRAVEL.destinations){const visits=s.cozy?.souvenirs.find(v=>v.destination===destination)?.visits??0;
      const card=this.card(destination,`${Math.min(3,visits)}/3 souvenirs · ${visits} visite${visits>1?'s':''}`);
      TRAVEL_STORIES[destination].forEach((story,i)=>card.append(node('p',visits>i?story:`Souvenir ${i+1} · à découvrir lors d’un retour de voyage`,'small')));this.content.append(card);
    }
  }
  private renderDecorationGroup(s:GameState):void {
    this.title.textContent='Déplacer un ensemble';
    this.content.append(node('p','Choisis jusqu’à 64 objets posés. Les flèches préparent le déplacement ; Confirmer déplace tout ensemble gratuitement.'));
    const placed=s.decorations.filter(d=>d.location.kind==='outside');
    this.decorationGroup=new Set([...this.decorationGroup].filter(id=>placed.some(d=>d.id===id)));
    for(const d of placed){const button=this.button(this.content,`${this.decorationGroup.has(d.id)?'✓ ':''}${DECORATIONS[d.catalogId].name} · #${d.id.split('-')[1]}`,()=>{if(this.decorationGroup.has(d.id))this.decorationGroup.delete(d.id);else if(this.decorationGroup.size<64)this.decorationGroup.add(d.id);this.render();},null,true);button.setAttribute('aria-pressed',String(this.decorationGroup.has(d.id)));}
    const controls=node('div','','mission-filters');for(const [label,x,y]of [['←',-1,0],['↑',0,-1],['↓',0,1],['→',1,0]] as const)this.button(controls,label,()=>{this.groupOffset.x+=x;this.groupOffset.y+=y;this.render();});this.content.append(controls);
    const selected=placed.filter(d=>this.decorationGroup.has(d.id));
    const preview=node('div','','cozy-group-preview');preview.setAttribute('aria-label','Aperçu des positions après déplacement');
    if(selected.length){const locations=selected.map(d=>d.location as Extract<DecorationLocation,{kind:'outside'}>);const minX=Math.min(...locations.map(l=>l.x)),minY=Math.min(...locations.map(l=>l.y));const width=Math.max(...locations.map((l,i)=>l.x+DECORATIONS[selected[i].catalogId].width))-minX,height=Math.max(...locations.map((l,i)=>l.y+DECORATIONS[selected[i].catalogId].height))-minY;
      preview.style.aspectRatio=`${Math.max(width,1)} / ${Math.max(height,1)}`;
      selected.forEach((d,i)=>{const l=locations[i],definition=DECORATIONS[d.catalogId],img=node('img');img.src=decorationUrl(d.catalogId);img.alt=`${definition.name} : ${l.x+this.groupOffset.x}, ${l.y+this.groupOffset.y}`;img.style.cssText=`position:absolute;left:${(l.x-minX)/width*100}%;top:${(l.y-minY)/height*100}%;width:${definition.width/width*100}%;height:${definition.height/height*100}%;object-fit:contain`;preview.append(img);});
    }this.content.append(preview,node('p',`Décalage : ${this.groupOffset.x}, ${this.groupOffset.y} cases fines · ${selected.length} objets`));
    const command={type:'translateDecorations' as const,ids:[...this.decorationGroup],dx:this.groupOffset.x,dy:this.groupOffset.y};
    const result=translatedDecorations(s,command.ids,command.dx,command.dy);
    this.button(this.content,'Confirmer le déplacement',()=>this.execute(command,'Ensemble déplacé.',()=>{this.groupOffset={x:0,y:0};}),result.reason?REFUSALS[result.reason]:null);
    this.button(this.content,'Annuler',()=>{this.decorationGroup.clear();this.groupOffset={x:0,y:0};this.open({kind:'arrange'});},null,true);
  }
  private renderDecorationShop(s: GameState): void {
    const filters=node('div','','mission-filters');
    for(const collection of [{id:'',name:'Toutes'},...DECORATION_COLLECTIONS])this.button(filters,collection.name,()=>{this.decorationCollection=collection.id;this.render();},null,this.decorationCollection!==collection.id);
    this.content.append(filters);
    const selected=DECORATION_COLLECTIONS.find(c=>c.id===this.decorationCollection);
    if(selected){this.content.append(node('p',`${selected.description} · ${selected.items.filter(id=>s.decorations.some(d=>d.catalogId===id)).length}/${selected.items.length} modèles possédés`));}
    this.content.append(node('h3', 'Décorations extérieures'));
      for (const id of DECORATION_IDS) {
        if(selected&&!selected.items.includes(id))continue;
        const d = DECORATIONS[id], count = s.decorations.filter(owned => owned.catalogId === id).length;
        const card = this.decorationCard(id, `${d.width} × ${d.height} cases fines${d.rotates ? ' · peut tourner' : ''} · ${count} possédé${count > 1 ? 's' : ''}`);
        card.dataset.catalog = id;
        const target={family:'decoration',id} as const,access=stateLevelAccess(s,target);
        const reason = access.locked ? null : purchaseDecorationReason(s, id);
        const buy=this.button(card, `Acheter · ${d.heartPrice !== undefined ? heartAmount(d.heartPrice) : `${d.price} pattes`}`, () => {
          this.savePurchaseOrigin(); this.placement = null; this.scene.setPlacement(null);
          this.decorationDraft = {id:'purchase-preview',catalogId:id,location:null,rotation:0};
          this.open({kind:'decorationPlacement'});
        }, reason ? REFUSALS[reason] : null);
        const inventory=this.button(card, `Acheter pour l’inventaire · ${d.heartPrice !== undefined ? heartAmount(d.heartPrice) : `${d.price} pattes`}`, () => this.confirm(`Acheter : ${d.name} ?`, `${d.heartPrice !== undefined ? heartAmount(d.heartPrice) : `${d.price} pattes`}. Achat immédiat pour l’inventaire, sans placement.`, () => this.execute({type:'buyDecoration',catalogId:id}, 'Objet acheté et conservé dans ton inventaire.')), reason ? REFUSALS[reason] : null, true);
        this.levelAction(card,[buy,inventory],s,target);
        this.content.append(card);
      }
    this.button(this.content, 'Ouvrir mon inventaire', () => this.open({kind: 'arrange'}), null, true);
  }
  private renderInventory(s: GameState): void {
    this.button(this.content,'Déplacer un ensemble',()=>{this.decorationGroup.clear();this.groupOffset={x:0,y:0};this.open({kind:'decorationGroup'});},null,true);
    this.title.textContent = 'Aménager · inventaire';
    for (const kind of ['nest','nursery'] as const) if (!s.buildings.some(b=>b.kind===kind)) {
      const card=this.card(`${BUILDING_NAMES[kind]} offert`, 'Libère une empreinte 4 × 4 sur le terrain acquis, puis place gratuitement cet équipement. Aucun objet ne sera déplacé automatiquement.');
      this.button(card,`Placer gratuitement : ${BUILDING_NAMES[kind]}`,()=>this.beginPlacement(kind,undefined,undefined,true));this.content.append(card);
    }
    this.content.append(node('p', 'Touche directement un objet posé pour le déplacer, le ranger ou le vendre.', 'small'));
    this.button(this.content, 'Acheter des décorations', () => this.open({kind: 'shop', tab: 'decorations'}));
    const inventory = s.decorations.filter(d => d.location.kind === 'inventory');
    this.content.append(node('h3', `En réserve · ${inventory.length}`));
    if (!inventory.length) this.content.append(node('p', 'Ton inventaire est vide. Les objets rangés réapparaissent ici.', 'small'));
    for (const d of inventory) {
      const card = this.decorationCard(d.catalogId, `Exemplaire ${d.id.split('-')[1]} · pose gratuite`); card.dataset.decoration = d.id;
      this.button(card, 'Placer cet exemplaire', () => this.beginDecorationPlacement(d.id));
      this.button(card, 'Actions de cet exemplaire', () => this.open({kind: 'decoration', id: d.id}), null, true); this.content.append(card);
    }
    const placed = s.decorations.filter(d => d.location.kind !== 'inventory');
    const details = node('details'); details.dataset.placedList = ''; details.append(node('summary', `Objets posés · ${placed.length}`));
    for (const d of placed) this.button(details, `${DECORATIONS[d.catalogId].name} · #${d.id.split('-')[1]}`, () => {this.scene.focusDecoration(d.id);this.open({kind: 'decoration', id: d.id});}, null, true);
    this.content.append(details);
    this.button(this.content, 'Quitter le mode Aménagement', () => this.close(), null, true);
  }
  private renderDecoration(s: GameState, id: string): void {
    const d = s.decorations.find(d => d.id === id); if (!d) { this.finishDecorationAction(); return; }
    this.title.textContent = DECORATIONS[d.catalogId].name;
    this.content.append(this.decorationCard(d.catalogId, `Exemplaire ${id.split('-')[1]} · déplacements gratuits`));
    this.content.append(node('p', d.location.kind === 'inventory' ? 'Possédé · en réserve dans l’inventaire' : 'Possédé · posé dans la prairie', 'badge'));
    this.button(this.content, 'Déplacer', () => this.beginDecorationPlacement(id));
    if(d.location.kind==='outside'&&['hay-bale','otter-plush','bunny-slippers','small-bookcase','large-bookcase'].includes(d.catalogId))this.button(this.content,'Appeler un lapin',()=>{const ok=this.scene.interactionDecoration?.(id);if(ok)this.close();else this.notice('Place cet objet près d’un habitat avec un lapin disponible.');},null,true);
    if (DECORATIONS[d.catalogId].rotates && d.location.kind === 'outside') this.button(this.content, 'Tourner de 90°', () => { this.beginDecorationPlacement(id); this.rotateDecoration(); }, null, true);
    this.button(this.content, 'Ranger dans l’inventaire', () => this.execute({type: 'placeDecoration', id, location: {kind: 'inventory'}}, 'Objet rangé, toujours possédé.', () => this.finishDecorationAction()), d.location.kind === 'inventory' ? 'Cet objet est déjà dans l’inventaire.' : null, true);
    const resale = ownedDecorationResalePrice(d);
    this.button(this.content, `Vendre · ${resale} pattes`, () => this.confirm(
      `Vendre ${DECORATIONS[d.catalogId].name} pour ${resale} pattes ?`,
      'Cet exemplaire sera retiré définitivement. Aucun remboursement en cœurs.',
      () => this.execute({type: 'sellDecoration', id}, value => `Objet vendu · + ${value} pattes.`, () => this.finishDecorationAction())
    ), d.paidHearts !== undefined ? 'Objet précieux : il ne se revend pas.' : isChristmasDecoration(d.catalogId) ? 'Décoration de Noël : elle reste à toi.' : Number.isSafeInteger(s.pattes + resale) ? null : REFUSALS.RESOURCE_LIMIT, true).classList.add('action-danger');
    this.button(this.content, 'Mon inventaire', () => this.open({kind: 'arrange'}), null, true);
  }
  private finishDecorationAction(): void {
    if (this.arranging) this.open({kind: 'arrange'}); else this.close();
  }
  private beginDecorationPlacement(id: string): void {
    const d = this.controller.getSnapshot().state?.decorations.find(d => d.id === id); if (!d) return;
    this.arranging = true; this.placement = null; this.scene.setPlacement(null);
    this.decorationDraft = {id, location: d.location.kind === 'inventory' ? null : structuredClone(d.location), rotation: d.location.kind === 'outside' ? d.location.rotation : 0};
    this.open({kind: 'decorationPlacement'});
  }
  private rotateDecoration(): void {
    const draft = this.decorationDraft, d = this.snapshot.state?.decorations.find(d => d.id === draft?.id) ?? (draft?.catalogId ? {catalogId:draft.catalogId} : null);
    if (!draft || !d || !DECORATIONS[d.catalogId].rotates) return;
    draft.rotation = draft.rotation === 0 ? 1 : 0;
    if (draft.location?.kind === 'outside') draft.location.rotation = draft.rotation;
    this.syncArrangement(); this.render();
  }
  private selectDecoration(selection: MeadowSelection): void {
    const draft = this.decorationDraft;
    if (draft) {
      if (selection.kind === 'fineCell') draft.location = {kind: 'outside', x: selection.x, y: selection.y, rotation: draft.rotation};
      this.syncArrangement(); this.render(); return;
    }
    if (selection.kind === 'decoration') this.open({kind: 'decoration', id: selection.id});
    else if (selection.kind === 'building') this.open({kind: 'building', id: selection.id});
    else if (selection.kind === 'empty') { this.rememberView(); this.history = []; this.view = null; this.syncArrangement(); this.render(); }
  }
  private renderDecorationPlacement(s: GameState): void {
    const draft = this.decorationDraft, d = s.decorations.find(d => d.id === draft?.id) ?? (draft?.catalogId ? {id:draft.id,catalogId:draft.catalogId,location:{kind:'inventory' as const}} : null);
    if (!draft || !d) { this.open({kind: 'arrange'}); return; }
    this.title.textContent = `Placer : ${DECORATIONS[d.catalogId].name}`;
    this.content.append(node('p', 'Aperçu · aucun changement avant confirmation', 'badge'));
    this.content.append(node('p', 'Touche une destination, puis confirme. Glisse ou pince pour explorer sans poser.', 'small'));
    if (DECORATIONS[d.catalogId].rotates) this.button(this.content, `Tourner de 90° · orientation ${draft.rotation ? 'verticale' : 'horizontale'}`, () => this.rotateDecoration(), null, true);
    const definition = DECORATIONS[d.catalogId], christmas = !!draft.catalogId && isChristmasDecoration(d.catalogId);
    const price = christmas ? candyAmount(definition.candyPrice ?? 0) : definition.heartPrice !== undefined ? heartAmount(definition.heartPrice) : `${definition.price} pattes`;
    this.content.append(node('p', `${definition.width} × ${definition.height} cases fines · ${draft.catalogId ? price : 'pose gratuite'}`, 'badge'));
    const reason = draft.location ? catalogDecorationPlacementReason(s, d.catalogId, draft.location, draft.catalogId ? undefined : d.id) ?? (draft.catalogId ? (christmas ? christmasDecorationReason(s, d.catalogId) : purchaseDecorationReason(s,d.catalogId)) : null) : null;
    const actions = node('div', '', 'decoration-placement-actions');
    const status = node('p', !draft.location ? 'Choisis une destination · aucun objet posé' : reason ? `× ${REFUSALS[reason]}` : draft.catalogId ? '✓ Emplacement valide · paiement à la validation' : '✓ Emplacement valide · pose gratuite', !draft.location ? 'placement-pending' : reason ? 'placement-invalid' : 'placement-valid');
    status.setAttribute('role', 'status'); actions.append(status);
    const choices = node('div', '', 'placement-choices'); actions.append(choices);
    const confirm = this.button(choices, draft.catalogId ? `Acheter et placer · ${price}` : 'Confirmer la pose · gratuit', () => {
      if (this.decorationDraft !== draft || !draft.location || draft.location.kind !== 'outside') return;
      const command: Command = draft.catalogId ? {type: christmas ? 'buyChristmasDecoration' : 'buyDecoration',catalogId:d.catalogId,location:structuredClone(draft.location)} : {type:'placeDecoration',id:d.id,location:structuredClone(draft.location)};
      this.execute(command, 'Décoration installée.', value => draft.catalogId ? this.finishPurchase('decoration',String(value)) : this.open({kind:'arrange'}));
    });
    confirm.disabled = !draft.location || !!reason;
    status.id = `action-reason-${++this.reasonId}`; confirm.setAttribute('aria-describedby', status.id);
    this.button(choices, 'Annuler le placement', () => draft.catalogId ? this.cancelPurchase() : this.open({kind:'arrange'}), null, true);
    this.content.append(actions);
  }
  private enclosureName(s: GameState, id: string): string {
    const b = s.buildings.find(b => b.id === id)!;
    return `${b.habitat?.type === 'universal' ? 'Enclos' : habitatName(b)} ${s.buildings.filter(b => b.kind === 'enclosure').findIndex(b => b.id === id) + 1}`;
  }
  private entryReason(s: GameState, b: Building, species: SpeciesId): string | null {
    const reason = habitatEntryReason(s, b, species); return reason ? REFUSALS[reason] : null;
  }
  private rabbitCard(s: GameState, id: string): HTMLElement {
    const r = s.rabbits.find(r => r.id === id)!;
    const card = this.card(r.name || SPECIES[r.species].name, `${r.name ? SPECIES[r.species].name + ' · ' : ''}${this.enclosureName(s, r.enclosureId)} · Affection ${r.affection} · ${rabbitIncome(r.affection, r.species, individualIncomeRoll(r))} pattes / h`, r);
    card.classList.add('compact-list-card'); return card;
  }
  private renderBuilding(s: GameState, id: string): void {
    const b = s.buildings.find(b => b.id === id); if (!b) { this.close(); return; }
    this.title.textContent = b.kind === 'enclosure' ? this.enclosureName(s, id) : b.islet ? EPIC_ISLET_NAME : BUILDING_NAMES[b.kind];
    if (b.kind === 'enclosure') this.menuPortrait(habitatThumbnail(b.habitat!.type));
    else if (b.kind === 'agency') this.menuPortrait(agencyThumbnail());
    else if (b.kind === 'salon') this.menuPortrait(salonThumbnail());
    else if (b.kind === 'forest') this.menuPortrait(forestThumbnail());
    else if (b.kind === 'statue') this.menuPortrait(statueThumbnail(s.buildings.filter(x => x.kind === 'statue').findIndex(x => x.id === b.id) >= 1));
    else {
      const image = node('img'); image.src = b.islet ? EPIC_ISLET_ART.url : {farm: farmArtFor(b.farmLevel).url, nest: NEST_ART.url, nursery: NURSERY_ART.url, perch: PERCH_ART.url, kitchen: KITCHEN_ART.url}[b.kind];
      this.menuPortrait(image);
    }
    if (b.kind === 'enclosure') {
      const residents = occupants(s, id), income = incomeWhole(b.incomeUnits), stats = habitatStats(b);
      this.content.append(node('p', `${habitatName(b)} · ${HABITATS[b.habitat!.type].accepted} · niveau ${b.habitat!.level}`, 'badge'));
      this.content.append(this.stats([['Occupants', `${residents.length} / ${stats.capacity} places`], ['Stock', `${income} / ${stats.cap} pattes`], ['Revenu', `${residents.reduce((sum, r) => sum + rabbitIncome(r.affection, r.species, individualIncomeRoll(r)), 0)} pattes / h`]]));
      if (income >= stats.cap) this.content.append(node('p', 'Stock plein : récolte pour relancer les revenus.', 'reason'));
      this.button(this.content, `Récolter ${income} pattes`, () => this.collectIncome(id), income < 1 ? 'La récolte sera disponible à partir d’une pièce.' : null);
      this.renderPicnic(s, id);
      if (christmasActive()) this.renderSnowman(s, id);
      if (b.habitat!.level < 3) {
        const level=b.habitat!.level,targetLevel=(level+1) as 2|3,next=habitatLevel(b.habitat!.type,targetLevel);
        const target={family:'habitatUpgrade',id:b.habitat!.type,toLevel:targetLevel} as const,access=stateLevelAccess(s,target);
        const command:PattesCommand={type:'upgradeHabitat',id,fromLevel:level};
        // The upgrade also acquires the larger footprint, anchored at the same top-left cell; it needs the room before any payment.
        const from=buildingSize(b),to=habitatFootprint(targetLevel),room=upgradeFootprintReason(s,id,targetLevel);
        const description=`Niveau de l’habitat ${level} → ${targetLevel} : places ${stats.capacity} → ${next.capacity} · stockage ${stats.cap} → ${next.cap} pattes · emprise ${from.width} × ${from.depth} → ${to.width} × ${to.depth} cases, vers la droite et vers le bas. Occupants, emplacement et stock actuel conservés.`;
        const card=this.card('Amélioration de l’habitat',description);card.dataset.upgradeHabitat=id;
        const ultra=!!b.habitat!.ultra,inHearts=!ultra&&next.currency==='hearts',candies=ULTRA_SNOW.candies[targetLevel];
        const action=ultra ?
          this.button(card,`Améliorer · ${candyAmount(candies)}`,()=>this.confirm('Améliorer cet habitat ?',`${description} Paiement : ${candyAmount(candies)}.`,()=>this.execute(command,'Habitat amélioré.')),
            access.locked?null:room?REFUSALS[room]:!christmasActive()?REFUSALS.EVENT_OVER:candiesOf(s)<candies?REFUSALS.NOT_ENOUGH_CANDIES:null,true) :
          inHearts ?
          this.button(card,`Améliorer · ${heartAmount(next.cost)}`,()=>{
            // Re-read at confirmation: a stale view or a changed balance never leads to a payment.
            this.controller.refresh();const current=this.controller.getSnapshot().state;if(!current)return;
            const fresh=current.buildings.find(x=>x.id===id);
            if(!fresh?.habitat||fresh.habitat.level!==level){this.notice(REFUSALS.STALE_ACTION);this.render();return;}
            if(current.hearts<next.cost){this.notice(REFUSALS.NOT_ENOUGH_HEARTS);return;}
            this.confirm('Améliorer cet habitat ?',`${description} Paiement : ${heartAmount(next.cost)} · solde : ${current.hearts} cœurs. Aucune pièce n’est dépensée.`,()=>this.execute(command,'Habitat amélioré.'));
          },access.locked?null:room?REFUSALS[room]:s.hearts<next.cost?REFUSALS.NOT_ENOUGH_HEARTS:null,true) :
          this.button(card,`Améliorer · ${next.cost} pattes`,()=>this.confirm('Améliorer cet habitat ?',`${description} Paiement : ${next.cost} pattes.`,()=>this.execute(command,'Habitat amélioré.')),access.locked?null:room?REFUSALS[room]:moneyReason(s,next.cost),true);
        if(inHearts)action.classList.add('heart-spend');
        mountLevelLock(card,action).update(access);
        if(access.accessible&&!inHearts&&!ultra&&!room)this.complement(card,s,command,`Améliorer : ${description}`,'Habitat amélioré.');
        this.content.append(card);
      } else this.content.append(node('p', 'Niveau maximal atteint.', 'badge'));
      const removalReason = removeHabitatReason(s, id);
      this.button(this.content, 'Retirer cet habitat', () => {
        this.controller.refresh();
        const current = this.controller.getSnapshot().state; if (!current) return;
        const reason = removeHabitatReason(current, id);
        if (reason) { this.notice(REFUSALS[reason]); this.render(); return; }
        const removed = current.buildings.find(b => b.id === id)!, stock = incomeWhole(removed.incomeUnits);
        this.confirm('Retirer cet habitat ?', `Tu récoltes ${stock} pattes. Le prix d'achat et les améliorations ne sont pas remboursés.${removed.habitat?.ultra && !christmasActive() ? ' Attention : Noël est fini, tu ne pourras plus racheter cet enclos.' : ''}`,
          () => this.execute({type: 'removeHabitat', id}, 'Habitat retiré.', () => this.close()));
      }, removalReason ? REFUSALS[removalReason] : null, true).classList.add('action-danger');
      for (const r of residents) { const card = this.rabbitCard(s, r.id); this.button(card, 'Voir ce lapin', () => this.open({kind: 'rabbit', id: r.id}), null, true); this.content.append(card); }
      if (residents.length < stats.capacity) this.button(this.content, 'Acheter un lapin', () => this.open({kind: 'shop', tab: 'rabbits'}), null, true);
    } else if (b.kind === 'farm') {
      const farmLevel = b.farmLevel ?? 1;
      this.content.append(node('p', `Ferme niveau ${farmLevel}`, 'badge farm-level'));
      if (b.order) {
        const crop = ORDERS[b.order.recipe], amount = b.order.grass ?? crop.grass, growing = b.order.endsAt > this.now();
        const heading = this.card(crop.name, growing ? `${amount} nourriture en culture. Récolte après le délai.` : `${amount} nourriture prête. Touche Récolter.`);
        heading.classList.add('farm-crop'); heading.querySelector('.card-heading')!.prepend(cropIcon(b.order.recipe)); this.content.append(heading);
        this.workState(growing ? 'running' : 'ready', growing ? 'Les pousses grandissent dans les sillons de la ferme.' : 'La récolte attend dans les sillons de la ferme.'); this.timer(b.order.startedAt, b.order.endsAt);
        if (growing) this.content.append(node('p', orderReadyText(b.order.endsAt), 'order-ready-time'));
        this.button(this.content, `Récolter ${amount} nourriture`, () => this.execute({type: 'collectOrder', id}, value => `+ ${value} nourriture`), growing ? 'Culture en cours.' : null);
        this.acceleration(s, id, 'order');
      } else {
        this.workState('free', 'Choisis une culture. Plus les lapins l’aiment, plus elle coûte et dure, et plus elle donne de nourriture. Le prix est payé au lancement ; la récolte reste manuelle.');
        const choices = node('div', '', 'farm-orders'); this.content.append(choices); const level = playerLevel(s);
        const previous = this.lastFarmCrop.get(id);
        if (previous) {
          const crop = ORDERS[previous];
          const reason = farmLevel < orderFarmLevel(previous) ? `Ferme niveau ${orderFarmLevel(previous)} requis.` : level < crop.level ? `Niveau ${crop.level} requis.` : moneyReason(s, crop.cost);
          const replant = this.button(choices, `Replanter ${crop.name.toLowerCase()} · ${crop.cost} pattes`, () => this.execute({type: 'startOrder', id, recipe: previous}, 'Culture relancée.'), reason);
          replant.dataset.replant = previous;
        }
        for (const recipe of CROP_IDS) {
          const order = ORDERS[recipe], card = this.card(order.name, `${cropDuration(farmDuration(order.duration, b.farmLevel))} · ${order.grass} nourriture par récolte`); card.classList.add('compact-list-card');
          card.classList.add('farm-order'); card.dataset.crop = recipe; card.querySelector('.card-heading')!.prepend(cropIcon(recipe));
          if (farmLevel < orderFarmLevel(recipe)) { card.classList.add('farm-order-locked'); card.append(node('p', `Ferme niveau ${orderFarmLevel(recipe)}`, 'badge')); choices.append(card); continue; }
          if (level < order.level) { card.classList.add('farm-order-locked'); card.append(node('p', `Niveau ${order.level} requis`, 'badge')); choices.append(card); continue; }
          this.button(card, `Cultiver · ${order.cost} pattes`, () => this.execute({type: 'startOrder', id, recipe}, 'Culture lancée.'), moneyReason(s, order.cost));
          this.complement(card, s, {type: 'startOrder', id, recipe}, `Cultiver ${order.name.toLowerCase()} : ${order.grass} nourriture`, 'Culture lancée.'); choices.append(card);
        }
      }
      if (farmLevel === 1) this.heartUpgrade(s, 'Agrandir la ferme', 'Des cultures 20 % plus rapides, le moulin et cinq nouvelles cultures : fanes de carotte, fenouil, pomme, fraise et banane.', FARM_UPGRADES[2].hearts, {type: 'upgradeFarm', id, toLevel: 2}, playerLevel(s) < FARM_UPGRADES[2].level ? `Niveau ${FARM_UPGRADES[2].level} requis` : null);
      else if (farmLevel === 2 || farmLevel === 3) this.farmPattesUpgrade(s, id, farmLevel + 1 as 3 | 4);
    } else if (b.kind === 'nest') this.renderNest(s, id);
    else if (b.kind === 'nursery') this.renderNursery(s);
    else if (b.kind === 'kitchen') this.button(this.content, 'Entrer dans la Cuisine', () => this.openCuisine());
    else if (b.kind === 'agency') this.renderAgency(s);
    else if (b.kind === 'salon') this.renderSalon(s);
    else if (b.kind === 'forest') this.renderForest(s);
    else if (b.kind === 'perch') this.renderPerch(s);
    else if (b.kind === 'statue') this.content.append(node('p', affectionStatueCount(s) >= 2 ? `Tes deux statues veillent sur la prairie : tes lapins évolués peuvent atteindre l’affection ${BALANCE.maxAffection}.` : `La statue veille sur la prairie : tes lapins peuvent dépasser l’affection ${AFFECTION_STATUE.cap} et atteindre ${SECOND_AFFECTION_STATUE.cap}. Une deuxième statue, dès le niveau ${SECOND_AFFECTION_STATUE.level}, ouvre l’affection ${SECOND_AFFECTION_STATUE.cap + 1} à ${BALANCE.maxAffection}.`, 'badge'));
    this.button(this.content, 'Déplacer ce bâtiment', () => this.beginPlacement(b.kind, id), null, true);
  }
  /** Coco speaks in a bubble beside its portrait; the first visit is a short guided welcome, later visits are not guided. */
  private agencyHost(line: string): HTMLElement {
    const box = node('div', '', 'agency-host'), bubble = node('div', '', 'agency-bubble');
    bubble.append(node('p', line)); box.append(cocoPortrait(), bubble); this.content.append(box); return bubble;
  }
  private renderAgency(s: GameState): void {
    this.button(this.content,'Souvenirs de voyage',()=>this.open({kind:'album'}),null,true);
    if (!s.travel?.welcomed) {
      const step = Math.min(this.agencyWelcomeStep, COCO_WELCOME.length - 1), last = step === COCO_WELCOME.length - 1;
      const bubble = this.agencyHost(COCO_WELCOME[step]); bubble.append(node('p', `${HOST_NAME} · ${step + 1} / ${COCO_WELCOME.length}`, 'small agency-step'));
      this.button(bubble, last ? 'C’est parti !' : 'Suivant', () => {
        if (!last) { this.agencyWelcomeStep = step + 1; this.render(); return; }
        this.agencyWelcomeStep = 0; this.execute({type: 'welcomeAgency'}, `${HOST_NAME} t’ouvre son agence !`);
      }).dataset.focus = 'agency-next';
      return;
    }
    const now = this.now(), agency = s.buildings.find(b => b.kind === 'agency')!, level = agency.agencyLevel ?? 1;
    const onlyTrip = s.travel.trips.length === 1 ? s.travel.trips[0] : undefined;
    const onlyRabbit = onlyTrip ? s.rabbits.find(r => r.id === onlyTrip.rabbitId) : undefined;
    const onlyName = onlyRabbit ? onlyRabbit.name || SPECIES[onlyRabbit.species].name : '';
    this.agencyHost(onlyTrip ? onlyTrip.endsAt <= now ? `De retour ${fromPlace(onlyTrip.destination)} : voici ${onlyName} ! Viens l’accueillir.` : `${onlyName} profite de ses vacances ${toPlace(onlyTrip.destination)}. Un souvenir t’attend au retour !` : 'Où partons-nous aujourd’hui ? Choisis un voyageur : la destination reste une surprise !');
    this.content.append(node('p', `Agence niveau ${level} : ${level} voyage${level > 1 ? 's' : ''} à la fois, de 3 à 10 heures. Le voyageur garde sa place et ses revenus.${level >= 2 ? ' Chaque voyage rapporte aussi 25 nourriture par heure.' : ''}`, 'small'));
    for (const trip of s.travel.trips) {
      const traveller = s.rabbits.find(r => r.id === trip.rabbitId)!, name = traveller.name || SPECIES[traveller.species].name;
      const food = trip.grass ? ` et ${trip.grass} nourriture` : '';
      if (trip.endsAt <= now) {
        const card = node('article', '', 'card agency-return'); card.dataset.trip = 'ready';
        const words = node('div', '', 'agency-bubble traveller-bubble'); words.append(node('p', `Ces vacances ${toPlace(trip.destination)} étaient super ! Je t’ai rapporté ${heartAmount(trip.hearts)}${food} en souvenir.`));
        const heading = node('div', '', 'card-heading'); heading.append(avatar(traveller), words); card.append(heading);
        this.button(card, `Accueillir · + ${heartAmount(trip.hearts)}${food}`, () => this.execute({type: 'claimTrip', rabbitId: trip.rabbitId}, `+ ${heartAmount(trip.hearts)}${food} rapportés ${fromPlace(trip.destination)} !`)).classList.add('heart-gift');
        this.content.append(card);
      } else {
        const card = this.card(`${name} · en voyage`, `${trip.destination} · souvenir prévu : ${heartAmount(trip.hearts)}${food}`, traveller); card.dataset.trip = 'away'; this.content.append(card);
        this.timer(trip.startedAt, trip.endsAt); this.content.append(node('p', orderReadyText(trip.endsAt).replace('Prête', 'Retour'), 'order-ready-time'));
      }
    }
    if (s.travel.trips.length < level) {
      this.content.append(node('p', 'Jusqu’à son retour, le voyageur ne pourra ni manger, ni aller au nid, ni cuisiner, ni déménager.', 'small'));
      const list = node('div', '', 'agency-travellers'); this.content.append(list);
      for (const r of [...s.rabbits].filter(r => !travelling(s, r.id)).sort((a, b) => b.affection - a.affection)) {
        const card = this.card(r.name || SPECIES[r.species].name, `${r.name ? SPECIES[r.species].name + ' · ' : ''}${RARITY_NAMES[SPECIES[r.species].rarity]} · affection ${r.affection}`, r); card.dataset.traveller = r.id; card.classList.add('compact-list-card');
        this.button(card, 'Partir en voyage', () => this.execute({type: 'startTrip', rabbitId: r.id}, value => `${r.name || SPECIES[r.species].name} part en vacances ${toPlace(value as Destination)} !`), parentBusy(s, r.id, now) ? busyReason(s, r.id) : null); list.append(card);
      }
    }
    if (level < 3) this.heartUpgrade(s, 'Agrandir l’agence', level === 1 ? 'Deux voyages à la fois et 25 nourriture par heure de voyage.' : 'Trois voyages à la fois, avec la nourriture au retour.', level === 1 ? 40 : 120, {type: 'upgradeAgency', id: agency.id, fromLevel: level});
  }
  /** The Salon de soins: one rabbit at a time; first the rabbit, then its care. Paid at the start, welcomed back by the player. */
  private renderSalon(s: GameState): void {
    const now = this.now(), care = s.care;
    this.content.append(node('p', 'Un lapin à la fois. Il revient avec +1 d’affection et de l’XP. Un seul cadeau par lapin et par jour : un soin ou un pique-nique.', 'small'));
    if (care) {
      const r = s.rabbits.find(x => x.id === care.rabbitId)!, name = r.name || SPECIES[r.species].name, kind = CARE_NAMES[care.care];
      if (care.endsAt <= now) {
        const card = this.card(`${name} · soin terminé`, `${kind} terminé : ${name} revient tout doux, avec +1 d’affection et ${SALON.cares[care.care].xp} XP${care.hearts ? ` et ${heartAmount(care.hearts)}` : ''}.`, r); card.dataset.care = 'ready';
        this.button(card, 'Aller le chercher', () => this.execute({type: 'claimCare', rabbitId: r.id}, value => `${name} rentre à l’enclos · affection ${value} !`)).classList.add('heart-gift');
        this.content.append(card);
      } else {
        const card = this.card(`${name} · au salon`, `${kind} en cours · +1 d’affection et ${SALON.cares[care.care].xp} XP${care.hearts ? ` et ${heartAmount(care.hearts)}` : ''} au retour.`, r); card.dataset.care = 'away'; this.content.append(card);
        this.timer(care.startedAt, care.endsAt); this.content.append(node('p', orderReadyText(care.endsAt).replace('Prête', 'Retour'), 'order-ready-time'));
      }
      return;
    }
    const chosen = this.salonRabbit ? s.rabbits.find(r => r.id === this.salonRabbit) : undefined;
    const reasonOf = (r: Rabbit) => { const reason = rabbitAwayReason(s, r.id) ?? giftReason(s, r, now); return reason ? REFUSALS[reason] : null; };
    if (!chosen || reasonOf(chosen)) {
      this.salonRabbit = null;
      this.content.append(node('p', 'Choisis le lapin à chouchouter.', 'small'));
      const list = node('div', '', 'agency-travellers'); this.content.append(list);
      for (const r of [...s.rabbits].sort((a, b) => Number(!!reasonOf(a)) - Number(!!reasonOf(b)) || b.affection - a.affection)) {
        const card = this.card(r.name || SPECIES[r.species].name, `${r.name ? SPECIES[r.species].name + ' · ' : ''}${RARITY_NAMES[SPECIES[r.species].rarity]} · affection ${r.affection}`, r); card.dataset.salonRabbit = r.id; card.classList.add('compact-list-card');
        this.button(card, 'Choisir ce lapin', () => { this.salonRabbit = r.id; this.render(); }, reasonOf(r)); list.append(card);
      }
      return;
    }
    const name = chosen.name || SPECIES[chosen.species].name;
    const head = this.card(name, `${RARITY_NAMES[SPECIES[chosen.species].rarity]} · ${chosen.affection >= rabbitAffectionCap(s, chosen) && capReason(s, chosen) === 'EVOLUTION_REQUIRED' ? `affection ${chosen.affection}, sans gain avant son évolution (le soin compte pour ses défis)` : `affection ${chosen.affection} → ${chosen.affection + 1} au retour`}`, chosen); this.content.append(head);
    this.button(head, 'Changer de lapin', () => { this.salonRabbit = null; this.render(); }, null, true);
    const heartCares = salonHeartCaresLeft(s, now);
    this.content.append(node('p', heartCares ? `Encore ${heartCares} soin${heartCares > 1 ? 's' : ''} avec des cœurs aujourd’hui.` : 'Les soins avec des cœurs sont finis pour aujourd’hui : reviens demain.', 'small'));
    for (const kind of CARE_KINDS) {
      const care = SALON.cares[kind], price = carePrice(chosen.species, kind);
      const card = this.card(CARE_NAMES[kind], `${care.hours} h · +1 d’affection et ${care.xp} XP${heartCares ? ` et ${heartAmount(care.hearts)}` : ''} au retour`); card.dataset.care = kind; card.classList.add('compact-list-card');
      this.button(card, `${CARE_NAMES[kind]} · ${price} pattes`, () => this.execute({type: 'startCare', rabbitId: chosen.id, care: kind}, `${name} arrive au salon pour ${kind === 'bath' ? 'son bain' : kind === 'brush' ? 'son brossage' : 'son massage'} !`, () => { this.salonRabbit = null; }), moneyReason(s, price));
      this.content.append(card);
    }
  }
  /** Forêt de Brocéliande: rabbit by rabbit, the evolved drawing or the old one, for free, both ways, in 7 hours. */
  /** The jump-rope islet in the shop: one building, sold whole, floating left of the start island. */
  private jumpIslandOffer(s: GameState): HTMLElement {
    const card = this.card(JUMP_ISLAND_NAME, 'Une petite île à côté de la tienne · maximum 1'); card.dataset.jumpIslandOffer = '';
    card.classList.add('statue-offer'); card.querySelector('.card-heading')!.prepend(jumpRopeThumbnail());
    card.append(node('p', `Dès le niveau ${JUMP_ROPE.unlockLevel}, une petite île avec le kiosque flotte à gauche de la tienne. Deux de tes lapins font tourner la corde et un troisième saute : un raté et la partie s’arrête, rejoue autant que tu veux. Tes ${JUMP_ROPE.rewardedGamesPerCycle} premières parties du jour rapportent des pattes ; la toute première donne un cœur si tu atteins ${JUMP_ROPE.heartJumps} sauts, et deux de plus si elle réussit le défi du jour.`, 'small'));
    const reason = jumpIslandReason(s), text = reason === 'LEVEL_REQUIRED' ? `Niveau ${JUMP_ROPE.unlockLevel} requis` : reason === 'BUILDING_LIMIT' ? 'Tu as déjà l’île : touche-la dans la prairie.' : reason ? REFUSALS[reason] : null;
    this.button(card, `Acheter · ${JUMP_ROPE.price} pattes`, () => this.execute({type: 'buyJumpIsland'}, 'L’île de la corde à sauter flotte à côté de la tienne !', () => { this.open({kind: 'jumpIsland'}, 'root'); }), text);
    return card;
  }
  /** Benny's perch: today's rewards, the record, then the game (Benny only). */
  private renderPerch(s: GameState): void {
    const day = bennyFlightDay(s, this.now()), reason = bennyFlightReason(s);
    this.content.append(node('p', bennyFlightQuotaText(s, this.now()), 'badge'));
    if (day.best) this.content.append(node('p', `Ton record : ${day.best} colonne${day.best > 1 ? 's' : ''}`, 'small'));
    this.button(this.content, 'Jouer avec Benny', () => {
      const state = this.controller.getSnapshot().state, benny = state?.rabbits.find(r => r.species === 'benny'); if (!state || !benny) return;
      this.heartsBeforeFlight = state.hearts; this.close(); this.bennyFlight.open(benny);
    }, reason ? REFUSALS[reason] : null);
  }
  /** A rock, a bush or weeds on a parcel bought since the Christmas update: cleared for its price. */
  private renderDebris(s: GameState, id: string): void {
    const debris = (s.debris ?? []).find(d => d.id === id); if (!debris) { this.close(); return; }
    this.title.textContent = DEBRIS_NAMES[debris.kind];
    this.content.append(node('p', 'Il encombre ce coin de ta nouvelle parcelle : rien ne peut s’y poser tant qu’il est là.', 'small'));
    this.button(this.content, `Enlever · ${debris.price} pattes`, () => this.execute({type: 'clearDebris', id}, `${DEBRIS_NAMES[debris.kind]} : enlevé !`, () => this.close()), moneyReason(s, debris.price));
  }
  /** The islet of the Epics in the shop: a second nest on its own islet, for Hearts (owner, 5 November 2026). */
  private epicIsletOffer(s: GameState): HTMLElement {
    const card = this.card(EPIC_ISLET_NAME, 'Un second nid sur une petite île au sud · maximum 1'); card.dataset.epicIsletOffer = '';
    card.classList.add('statue-offer'); const image = node('img'); image.src = EPIC_ISLET_ART.url; image.alt = ''; image.className = 'statue-thumbnail'; image.width = 72; image.height = 72; card.querySelector('.card-heading')!.prepend(image);
    card.append(node('p', `Dès le niveau ${EPIC_ISLET.unlockLevel}, une petite île flotte au sud de ton île de départ, avec son propre nid. Lance une deuxième reproduction en même temps que celle de ton nid. ${EPIC_ISLET_TEXT}`, 'small'));
    const reason = epicIsletReason(s), text = reason === 'LEVEL_REQUIRED' ? `Niveau ${EPIC_ISLET.unlockLevel} requis` : reason === 'BUILDING_LIMIT' ? 'Tu as déjà l’îlot : touche-le dans la prairie, au sud.' : reason ? REFUSALS[reason] : null;
    this.button(card, `Acheter · ${heartAmount(EPIC_ISLET.hearts)}`, () => this.execute({type: 'buyEpicIslet'}, 'L’îlot des Épiques flotte au sud de ton île !', value => { this.open({kind: 'building', id: String(value)}, 'root'); }), text);
    return card;
  }
  /** The islet's menu: today's rewards, the record, the trio (two carriers, one athlete), then the game. */
  private renderJumpIsland(s: GameState): void {
    if (!s.jumpIsland) { this.close(); return; }
    this.title.textContent = JUMP_ISLAND_NAME; this.menuPortrait(jumpRopeThumbnail());
    const now = this.now(), available = (id: string | null) => !!id && !jumpRopeRabbitReason(s, id);
    this.content.append(node('p', 'Deux lapins font tourner la corde, ton athlète saute. Touche l’écran quand la corde passe sous lui : elle tourne de plus en plus vite. Un raté et la partie s’arrête. Rejoue autant que tu veux !', 'small'));
    this.content.append(node('p', jumpRopeQuotaText(s, now), 'badge'));
    this.content.append(node('p', jumpRopeChallengeText(s, now), 'badge jump-rope-challenge-badge'));
    if (s.jumpRope?.best) this.content.append(node('p', `Ton record : ${s.jumpRope.best} saut${s.jumpRope.best > 1 ? 's' : ''}`, 'small'));
    const medals = jumpRopeMedals(s), next = JUMP_ROPE.medals.find(step => !medals.includes(step));
    if (medals.length) {
      const row = node('div', '', 'jump-rope-medals');
      for (const step of medals) { const img = document.createElement('img'); img.src = JUMP_MEDAL_ART.url(step); img.alt = `Médaille ${step} sauts`; img.dataset.jumpRopeMedal = String(step); row.append(img); }
      this.content.append(row);
    }
    this.content.append(node('p', `${medals.length ? `Médailles sur le kiosque : ${medals.join(', ')} sauts.` : 'Pas encore de médaille sur le kiosque.'}${next ? ` Prochaine médaille à ${next} sauts.` : ' Toutes les médailles sont gagnées !'}`, 'small'));
    // The trio: the one being chosen, else the last one played, else the three most affectionate rabbits at home.
    const free = [...s.rabbits].filter(r => available(r.id)).sort((a, b) => b.affection - a.affection).map(r => r.id);
    let slots = this.jumpRopeSlots ?? (() => { const t = rememberedJumpRopeTeam(s); return t ? [t.carriers[0], t.carriers[1], t.athlete] : [free[1] ?? null, free[2] ?? null, free[0] ?? null]; })();
    slots = slots.map(id => available(id) ? id : null);
    for (let i = 0; i < 3; i++) if (!slots[i]) slots[i] = free.find(id => !slots.includes(id)) ?? null;
    this.jumpRopeSlots = slots;
    const nameOf = (r: Rabbit) => r.name || SPECIES[r.species].name;
    if (this.jumpRopePick !== null) {
      const slot = this.jumpRopePick, role = slot === 2 ? 'l’athlète, qui saute' : 'un porteur, qui fait tourner la corde';
      this.content.append(node('p', `Choisis ${role}.`, 'small'));
      const list = node('div', '', 'agency-travellers'); this.content.append(list);
      const reasonOf = (r: Rabbit) => { const reason = jumpRopeRabbitReason(s, r.id); return reason ? REFUSALS[reason] : null; };
      for (const r of [...s.rabbits].sort((a, b) => Number(!!reasonOf(a)) - Number(!!reasonOf(b)) || b.affection - a.affection)) {
        const card = this.card(nameOf(r), `${r.name ? SPECIES[r.species].name + ' · ' : ''}affection ${r.affection}`, r); card.dataset.jumpRopeRabbit = r.id; card.classList.add('compact-list-card');
        const current = slots.indexOf(r.id);
        this.button(card, current === slot ? 'Déjà à cette place' : 'Choisir', () => {
          const next = [...this.jumpRopeSlots!]; if (current >= 0) next[current] = next[slot]; next[slot] = r.id;
          this.jumpRopeSlots = next; this.jumpRopePick = null; this.render();
        }, reasonOf(r) ?? (current === slot ? 'Il a déjà cette place.' : null)); list.append(card);
      }
      this.button(this.content, 'Retour', () => { this.jumpRopePick = null; this.render(); }, null, true);
      return;
    }
    const team = node('div', '', 'agency-travellers jump-rope-team'); this.content.append(team);
    slots.forEach((id, slot) => {
      const r = s.rabbits.find(r => r.id === id), role = slot === 2 ? 'Athlète' : 'Porteur';
      const card = r ? this.card(`${role} : ${nameOf(r)}`, slot === 2 ? 'Il saute' : 'Il fait tourner la corde', r) : this.card(role, 'Personne pour l’instant');
      card.dataset.jumpRopeSlot = String(slot); card.classList.add('compact-list-card');
      this.button(card, r ? 'Changer' : 'Choisir', () => { this.jumpRopePick = slot; this.render(); }, null, true); team.append(card);
    });
    const ready = slots.every(Boolean), rabbits = slots.map(id => s.rabbits.find(r => r.id === id)!);
    const toActivity = (r: Rabbit) => ({id: r.id, species: r.species, name: r.name, affection: r.affection, classicLook: r.classicLook, evolution: r.evolution});
    this.button(this.content, 'Jouer', () => this.jumpRope.open({carriers: [toActivity(rabbits[0]), toActivity(rabbits[1])], athlete: toActivity(rabbits[2])}),
      ready ? null : 'Il te faut trois lapins à la maison : deux porteurs et un athlète.').dataset.jumpRopePlay = '';
  }
  private renderForest(s: GameState): void {
    this.content.append(node('p', 'Dans la forêt, change le dessin des lapins déjà évolués d’affection 30 ou plus : le nouveau ou l’ancien. C’est gratuit, et chaque changement prend 7 heures, un seul lapin à la fois. Ton lapin reste chez lui pendant ce temps.', 'small'));
    const rabbits = forestRabbits(s);
    if (!rabbits.length) { this.content.append(node('p', 'Aucun de tes lapins n’a encore évolué. Réussis les défis d’un lapin d’affection 30, puis lance son évolution depuis sa fiche.', 'small')); return; }
    const list = node('div', '', 'agency-travellers'); this.content.append(list);
    for (const r of rabbits) {
      const evolved = showsEvolvedArt(r), name = r.name || SPECIES[r.species].name;
      const card = this.card(name, `${r.name ? SPECIES[r.species].name + ' · ' : ''}affection ${r.affection} · ${evolved ? 'nouveau dessin' : 'ancien dessin'}`, r);
      if (r.lookChange) {
        card.dataset.forestRabbit = r.id; card.dataset.look = evolved ? 'evolved' : 'classic'; card.classList.add('compact-list-card');
        const change = node('p', `${evolved ? 'Retour à l’ancien dessin' : 'Retour au nouveau dessin'} dans `, 'small'); change.dataset.lookChange = r.id;
        const left = node('span', timeLeft(r.lookChange.endsAt, this.now()), 'timer'); left.dataset.end = String(r.lookChange.endsAt); change.append(left);
        card.append(change); list.append(card); continue;
      }
      card.dataset.forestRabbit = r.id; card.dataset.look = evolved ? 'evolved' : 'classic'; card.classList.add('compact-list-card');
      const hours = Math.round(FOREST.changeMs / 3_600_000);
      this.button(card, evolved ? 'Remettre l’ancien dessin' : 'Remettre le nouveau dessin', () => this.confirm(evolved ? 'Remettre l’ancien dessin ?' : 'Remettre le nouveau dessin ?', `${name} changera de dessin dans ${hours} heures. C’est gratuit, mais tu ne pourras pas l’annuler.`,
        () => this.execute({type: 'toggleClassicLook', rabbitId: r.id}, `${name} changera de dessin dans ${hours} heures.`)), lookChanging(s) ? REFUSALS.LOOK_CHANGING : null, true);
      list.append(card);
    }
  }
  /** Today's picnic, in this enclosure: the price and the rabbits that will gain affection are shown before paying. */
  private renderPicnic(s: GameState, id: string): void {
    const level = playerLevel(s), quote = picnicQuote(s, id, this.now(), level), gain = quote.winners.length, present = quote.guests.length;
    const winners = `${gain} lapin${gain > 1 ? 's' : ''} sur ${present} gagner${gain > 1 ? 'ont' : 'a'} +1 d’affection`;
    const card = this.card('Pique-nique', level < PICNIC.unlockLevel ? `Un pique-nique par jour, dès le niveau ${PICNIC.unlockLevel} : +1 d’affection pour les lapins de l’enclos.`
      : `${winners} · ${quote.xp} XP. Un seul pique-nique par jour.`); card.dataset.picnic = id;
    const reason = level < PICNIC.unlockLevel ? `Niveau ${PICNIC.unlockLevel} requis` : quote.reason ? REFUSALS[quote.reason] : moneyReason(s, quote.price);
    this.button(card, `Pique-niquer · ${quote.price} pattes`, () => this.confirm('Faire un pique-nique ?', `${winners}. Prix : ${quote.price} pattes (${PICNIC.pricePerRabbit} pattes par lapin présent).`,
      () => this.execute({type: 'picnic', enclosureId: id, expectedCost: quote.price}, value => `Pique-nique ! +1 d’affection pour ${value} lapin${Number(value) > 1 ? 's' : ''}.`, () => { this.close(); this.scene.playPicnic?.(id); })), reason);
    this.content.append(card);
  }
  /** Christmas: today's snowman, free, in this enclosure (one a day in all, a rabbit present). */
  private renderSnowman(s: GameState, id: string): void {
    const quote = snowmanQuote(s, id, this.now());
    const card = this.card('Bonhomme de neige', 'Gratuit · un seul bonhomme de neige par jour. Il reste debout dans l’enclos jusqu’à demain.'); card.dataset.snowman = id;
    this.button(card, 'Faire un bonhomme de neige', () => this.execute({type: 'buildSnowman', enclosureId: id}, 'Un bonhomme de neige tout neuf !', () => { this.close(); this.scene.playSnowman?.(id); }),
      quote.reason === 'LEVEL_REQUIRED' ? `Niveau ${SNOWMAN.unlockLevel} requis` : quote.reason ? REFUSALS[quote.reason] : null);
    this.content.append(card);
  }
  /**
   * The Christmas market islet (owner, 4 November 2026), full screen like the shop since 5 November 2026, in three tabs:
   * « Missions de Noël » (the challenges and their bonus), « Récompenses spéciales » (the eight decorations, for sucres d'orge)
   * and « Récupérer les cadeaux » (the mini-game « Les cadeaux du ciel »). Closed as soon as the event is off.
   */
  private renderChristmasMarket(s: GameState, tab: ChristmasMarketTab): void {
    if (!christmasActive()) { this.close(); return; }
    this.title.textContent = 'Marché de Noël';
    const now = this.now(), candies = candiesOf(s), rabbitName = (r: Rabbit) => r.name || SPECIES[r.species].name;
    // The painted market and the balance, then the three tabs.
    const banner = node('div', '', 'christmas-banner'), picture = document.createElement('img');
    picture.src = CHRISTMAS_MARKET_ART.url; picture.alt = ''; picture.draggable = false; picture.onerror = () => { picture.hidden = true; };
    const words = node('div', '', 'christmas-banner-text');
    const balance = node('p', '', 'christmas-candies'); balance.dataset.christmasCandies = String(candies);
    const icon = document.createElement('img'); icon.className = 'candy-icon'; icon.src = CANDY_ICON_URL; icon.alt = 'Sucre d’orge'; icon.width = 24; icon.height = 24; icon.onerror = () => { icon.hidden = true; };
    balance.append(icon, document.createTextNode(` ${candyAmount(candies)}`));
    words.append(node('p', 'Bienvenue au marché ! Gagne des sucres d’orge avec les défis de Noël, les bulles de pièces de tes enclos et les cadeaux du ciel, puis échange-les contre des récompenses spéciales.', 'christmas-banner-lead'), balance);
    banner.append(picture, words); this.content.append(banner);
    const tabs = node('div', '', 'tabs christmas-tabs'); tabs.setAttribute('role', 'tablist');
    for (const [key, label, art] of CHRISTMAS_MARKET_TABS) {
      const button = this.button(tabs, label, () => { this.skyGiftsPick = false; this.open({kind: 'christmasMarket', tab: key}, 'tab'); }, null, tab !== key);
      const image = document.createElement('img'); image.src = art; image.alt = ''; image.width = 28; image.height = 28; image.onerror = () => { image.hidden = true; }; button.prepend(image);
      button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(tab === key)); button.dataset.christmasTab = key;
    }
    this.content.append(tabs);
    const page = node('div', '', 'christmas-page'); page.dataset.christmasPage = tab; this.content.append(page);
    const add = (...children: HTMLElement[]) => page.append(...children);
    if (tab === 'gifts') {
      if (this.skyGiftsPick) {
        add(node('p', 'Choisis le lapin qui porte la hotte.', 'small'));
        const list = node('div', '', 'agency-travellers'); add(list);
        const reasonOf = (r: Rabbit) => { const reason = skyGiftsRabbitReason(s, r.id); return reason ? REFUSALS[reason] : null; };
        for (const r of [...s.rabbits].sort((a, b) => Number(!!reasonOf(a)) - Number(!!reasonOf(b)) || b.affection - a.affection)) {
          const card = this.card(rabbitName(r), `${r.name ? SPECIES[r.species].name + ' · ' : ''}affection ${r.affection}`, r); card.dataset.skyGiftsRabbit = r.id; card.classList.add('compact-list-card');
          this.button(card, 'Choisir', () => {
            this.skyGiftsPick = false; this.render();
            this.skyGifts.open({id: r.id, species: r.species, name: r.name, affection: r.affection, classicLook: r.classicLook, evolution: r.evolution});
          }, reasonOf(r)); list.append(card);
        }
        this.button(page, 'Retour', () => { this.skyGiftsPick = false; this.render(); }, null, true);
        return;
      }
      // « Les cadeaux du ciel »: one rabbit carries the basket; poisoned presents and bombs must be let fall.
      const day = skyGiftsDay(s, now), game = node('article', '', 'card christmas-game');
      game.style.setProperty('--christmas-game-art', `url('${SKY_GIFTS_ART.background}')`);
      const traps = node('div', '', 'christmas-traps');
      for (const [url, text] of [[SKY_GIFTS_ART.gifts[1], 'À attraper'], [SKY_GIFTS_ART.traps.poison, `Empoisonné : −${SKY_GIFTS_GAME.poisonGifts} cadeaux`], [SKY_GIFTS_ART.traps.bomb, 'Bombe : fin de partie']] as const) {
        const item = node('span', text), img = document.createElement('img'); img.src = url; img.alt = ''; img.width = 44; img.height = 44; img.onerror = () => { img.hidden = true; }; item.prepend(img); traps.append(item);
      }
      game.append(node('h3', 'Les cadeaux du ciel'),
        node('p', `Le traîneau lâche des cadeaux : attrape-les avec la hotte de ton lapin, mais laisse tomber les cadeaux empoisonnés et les bombes ! Tes ${SKY_GIFTS.rewardedGamesPerCycle} premières parties du jour rapportent des pattes et des sucres d’orge (1 tous les ${SKY_GIFTS.giftsPerCandy} cadeaux).`),
        traps, node('p', skyGiftsQuotaText(s, now), 'badge'));
      if (day.best) game.append(node('p', `Ton record : ${day.best} cadeau${day.best > 1 ? 'x' : ''}`, 'small'));
      this.button(game, 'Jouer aux cadeaux du ciel', () => { this.skyGiftsPick = true; this.render(); }, s.rabbits.length ? null : 'Il te faut un lapin pour porter la hotte.').dataset.skyGiftsPlay = '';
      add(game);
      return;
    }
    if (tab === 'missions') {
      add(node('p', 'Chaque jour, trois défis de Noël et un bonus rapportent des sucres d’orge.', 'small christmas-intro'));
      // The Christmas challenges, like the daily missions: three a cycle, then the bonus. Small cards side by side, so a phone
      // held sideways shows them all at once (owner, 7 November 2026): a bar and its count, then the reward until it can be claimed.
      const cycleStart = dailyCycleStart(s), shown = christmasChallengesOf(s), claimed = christmasClaimed(s);
      const grid = node('div', '', 'christmas-missions'); add(grid);
      const mission = (key: string, title: string, text: string, value: number, target: number, status: 'claimed' | 'ready' | 'pending', reward: number,
        claimLabel: string, claimedLabel: string, claim: () => void, bonus = false) => {
        const card = node('article', '', `card christmas-mission mission-day-card${bonus ? ' mission-bonus' : ''}`); card.dataset.christmasChallenge = key; card.dataset.missionStatus = status;
        const bar = node('progress'); bar.max = target; bar.value = value; bar.setAttribute('aria-label', `Progression : ${value} sur ${target}`);
        const meter = node('div', '', 'christmas-mission-meter'); meter.append(bar, node('span', `${value} / ${target}`));
        card.append(node('h3', title), node('p', text), meter);
        if (status === 'pending') {
          const chip = node('p', ` +${candyAmount(reward)}`, 'christmas-mission-reward'), icon = document.createElement('img');
          icon.src = CANDY_ICON_URL; icon.alt = ''; icon.width = 18; icon.height = 18; icon.onerror = () => { icon.hidden = true; }; chip.prepend(icon); card.append(chip);
        } else {
          const button = this.button(card, status === 'claimed' ? claimedLabel : claimLabel, claim, null); button.classList.add('mission-claim');
          if (status === 'claimed') button.disabled = true;
        }
        grid.append(card);
      };
      for (const id of shown) {
        const challenge = CHRISTMAS_CHALLENGES[id], value = Math.min(christmasProgress(s, id), challenge.target), done = claimed.includes(id), ready = christmasClaimable(s, id);
        mission(id, challenge.title, challenge.description, value, challenge.target, done ? 'claimed' : ready ? 'ready' : 'pending', challenge.candies,
          `Réclamer · +${candyAmount(challenge.candies)}`, 'Récompense réclamée', () => this.execute({type: 'claimChristmasChallenge', id, cycleStart}, `+${candyAmount(challenge.candies)} !`));
      }
      const bonusDone = christmasBonusClaimed(s), bonusReady = christmasBonusReady(s) && !bonusDone, count = shown.filter(id => claimed.includes(id)).length;
      mission('bonus', 'Bonus des trois défis', 'Réclame les trois défis de Noël.', count, CHRISTMAS_PICK_COUNT, bonusDone ? 'claimed' : bonusReady ? 'ready' : 'pending', CHRISTMAS_BONUS_CANDIES,
        `Réclamer · +${candyAmount(CHRISTMAS_BONUS_CANDIES)}`, 'Bonus réclamé', () => this.execute({type: 'claimChristmasBonus', cycleStart}, `Bonus de Noël : +${candyAmount(CHRISTMAS_BONUS_CANDIES)} !`), true);
      return;
    }
    // The Christmas rabbits: born only during the event, and also sold here, dearly (owner, 5 November 2026).
    add(node('h3', 'Lapins de Noël'));
    add(node('p', `Ils ne naissent au nid que pendant Noël, et restent à toi ensuite. Tu peux aussi en adopter un ici pour ${candyAmount(CHRISTMAS_RABBIT_CANDY_PRICE)}.`, 'small'));
    for (const id of CHRISTMAS_RABBIT_IDS) {
      const species = SPECIES[id], count = s.rabbits.filter(r => r.species === id).length;
      const card = this.card(species.name, `${typeNames(species.types)} · ${RARITY_NAMES[species.rarity]} · ${count} sur ton île`, id); card.dataset.christmasRabbit = id;
      const reason = christmasRabbitReason(s, id);
      this.button(card, `Adopter · ${candyAmount(CHRISTMAS_RABBIT_CANDY_PRICE)}`, () => { this.rabbitDestination = null; this.open({kind: 'buyRabbit', species: id, candies: true}); }, reason ? REFUSALS[reason] : null);
      add(card);
    }
    // The Ultra neige habitat (owner, 6 November 2026): a snow enclosure of its own, bought at level 1 and grown to level 3 in
    // sucres d'orge (its card's « Améliorer » button); it stays after Christmas.
    add(node('h3', 'Enclos Ultra neige'));
    add(node('p', `Un enclos tout en glace pour tes lapins de neige. Son niveau 1 coûte ${candyAmount(ULTRA_SNOW.candies[1])}, puis il s’améliore en sucres d’orge : niveau 2 pour ${candyAmount(ULTRA_SNOW.candies[2])}, niveau 3 (le palais de glace) pour ${candyAmount(ULTRA_SNOW.candies[3])}. Il reste à toi après Noël.`, 'small'));
    {
      const stats = habitatLevel('neige', 1), card = this.card('Enclos Ultra neige', `${HABITATS.neige.accepted} · ${stats.capacity} places · stocke ${stats.cap} pattes`); card.dataset.ultraSnow = '';
      const reason = buildingReason(s, 'enclosure', true, 'neige') ?? (candiesOf(s) < ULTRA_SNOW.candies[1] ? REFUSALS.NOT_ENOUGH_CANDIES : null);
      this.button(card, `Placer · ${candyAmount(ULTRA_SNOW.candies[1])}`, () => this.beginPlacement('enclosure', undefined, 'neige', false, true), reason);
      add(card);
    }
    add(node('h3', 'Décorations'));
    // The market's eight decorations, for sucres d'orge only; placed now (preview, paid at the confirmed placement) or kept.
    add(node('p', 'Elles restent à toi après Noël.', 'small'));
    for (const id of CHRISTMAS_DECORATION_IDS) {
      const d = DECORATIONS[id], price = candyAmount(d.candyPrice ?? 0), count = s.decorations.filter(owned => owned.catalogId === id).length;
      const card = this.decorationCard(id, `${d.width} × ${d.height} cases fines · ${price} · ${count} possédé${count > 1 ? 's' : ''}`); card.dataset.christmasCatalog = id;
      const reason = christmasDecorationReason(s, id), text = reason ? REFUSALS[reason] : null;
      this.button(card, `Acheter · ${price}`, () => {
        this.rememberView(); this.purchaseReturn = {view: {kind: 'christmasMarket', tab: 'rewards'}, history: [...this.history]};
        this.placement = null; this.scene.setPlacement(null);
        this.decorationDraft = {id: 'purchase-preview', catalogId: id, location: null, rotation: 0};
        this.open({kind: 'decorationPlacement'});
      }, text);
      this.button(card, `Acheter pour l’inventaire · ${price}`, () => this.confirm(`Acheter : ${d.name} ?`, `${price}. Achat immédiat pour l’inventaire, sans placement.`,
        () => this.execute({type: 'buyChristmasDecoration', catalogId: id}, 'Elle t’attend dans ton inventaire : pose-la depuis Aménager.')), text, true);
      add(card);
    }
  }
  /** Farm level 2 → 3 and 3 → 4: pattes only, never a Heart complement; re-read at confirmation so a stale view never pays. */
  private farmPattesUpgrade(s: GameState, id: string, toLevel: 3 | 4): void {
    const {level, pattes} = FARM_UPGRADES[toLevel], title = 'Améliorer la ferme';
    const description = toLevel === 3
      ? 'Quatre nourritures fantaisie : trèfle doré, carotte arc-en-ciel, fraise étoilée et pomme d’amour. Tes cultures restent 20 % plus rapides.'
      : 'Un moulin encore plus beau et trois cultures plus généreuses : citrouille dorée, melon de lune et cerises de cristal. Toutes tes cultures deviennent 30 % plus rapides.';
    const card = this.card(title, description); card.dataset.upgradeFarm = String(toLevel);
    this.button(card, `Améliorer · ${pattes} pattes`, () => {
      this.controller.refresh(); const fresh = this.controller.getSnapshot().state; if (!fresh) return;
      if ((fresh.buildings.find(x => x.id === id)?.farmLevel ?? 1) !== toLevel - 1) { this.notice(REFUSALS.STALE_ACTION); this.render(); return; }
      if (fresh.pattes < pattes) { this.notice(REFUSALS.NOT_ENOUGH_PATTES); return; }
      this.confirm(`${title} ?`, `${description} Paiement : ${pattes} pattes.`, () => this.execute({type: 'upgradeFarm', id, toLevel}, `Ta ferme passe au niveau ${toLevel}.`));
    }, playerLevel(s) < level ? `Niveau ${level} requis` : moneyReason(s, pattes), true);
    this.content.append(card);
  }
  private heartUpgrade(s: GameState, title: string, description: string, cost: number, command: Command, reason: string | null = null): void {
    const card = this.card(title, description);
    this.button(card, `Améliorer · ${heartAmount(cost)}`, () => {
      this.controller.refresh(); const fresh = this.controller.getSnapshot().state; if (!fresh) return;
      if (fresh.hearts < cost) { this.notice(REFUSALS.NOT_ENOUGH_HEARTS); return; }
      this.confirm(`${title} ?`, `${description} Paiement : ${heartAmount(cost)} · solde : ${fresh.hearts} cœurs.`, () => this.execute(command, 'Amélioration terminée.'));
    }, reason ?? (s.hearts < cost ? REFUSALS.NOT_ENOUGH_HEARTS : null), true).classList.add('heart-spend'); this.content.append(card);
  }
  private renderRabbit(s: GameState, id: string): void {
    const r = s.rabbits.find(r => r.id === id); if (!r) { this.close(); return; }
    rabbitTheme(this.panel, r.species); const legendary = decorateLegendaryCard(this.panel, r.species);
    // Lapin ultime (affection 50): the golden card, its title, and the crown on the portrait unless the player took it off.
    const ultimate = decorateUltimateCard(this.panel, r);
    const species = SPECIES[r.species]; this.title.textContent = species.name;
    this.menuPortrait(avatar(r));
    if (ultimate) { const title = node('p', 'Lapin ultime', 'ultimate-title'); title.dataset.ultimateTitle = ''; this.content.append(title); }
    const friend=s.rabbits.find(other=>other.id===bestFriend(s,r.id));
    if(friend)this.button(this.content,`Complice : ${friend.name??SPECIES[friend.species].name}`,()=>this.open({kind:'rabbit',id:friend.id}),null,true);
    const overview = node('div', '', 'rabbit-overview'), essential = node('div');
    essential.append(this.stats([['Affection', `${r.affection} / ${waitsForEvolution(r) ? EVOLUTION_AFFECTION : BALANCE.maxAffection}`], ['Revenu', `${rabbitIncome(r.affection, r.species, individualIncomeRoll(r))} pattes / h`]]));
    const large = wearsCrown(r) ? crownPortrait(avatar(r, true), r) : avatar(r, true);
    overview.append(legendary ? legendaryPortrait(large, r.species) : large, essential); this.content.append(overview);
    this.attachCaress(large, r);
    const cost = feedCost(r.affection), onTrip = travelling(s, id), inCare = atSalon(s, id), reason = onTrip ? 'TRAVELING' as const : inCare ? 'AT_SALON' as const : feedReason(s, r);
    if (onTrip) essential.append(node('p', `En voyage ${toPlace(s.travel!.trips.find(t => t.rabbitId === id)!.destination)} · retour à l’agence`, 'badge rabbit-away'));
    if (inCare) essential.append(node('p', `Au salon de soins · ${CARE_NAMES[s.care!.care].toLowerCase()} en cours`, 'badge rabbit-away'));
    if (!inCare && playerLevel(s) >= PICNIC.unlockLevel) { const gift = giftReason(s, r, this.now()); if (gift === 'GIFT_TODAY') essential.append(node('p', 'Cadeau du jour reçu.', 'small')); }
    if (reason === 'EVOLUTION_REQUIRED') essential.append(node('p', 'Ton lapin a atteint l’affection 30 : fais-le évoluer pour aller plus loin.', 'small rabbit-milestone'));
    if (isAffectionWall(r.affection) && reason !== 'MAX_AFFECTION' && reason !== 'EVOLUTION_REQUIRED' && reason !== 'STATUE_REQUIRED' && reason !== 'SECOND_STATUE_REQUIRED') essential.append(node('p', `Le grand repas de l’affection ${r.affection + 1} : un vrai festin, à la hauteur de la récompense.`, 'small rabbit-milestone'));
    this.button(essential, reason === 'MAX_AFFECTION' ? 'Affection maximale' : `Nourrir · ${cost} nourriture`, () => this.execute({type: 'feed', id}, `Affection ${r.affection + 1} !`, () => this.scene.reactToFeed(id)), reason && REFUSALS[reason]).dataset.focus = 'feed';
    // The legendary's show, from its sheet (owner, 4 November 2026): the sheet closes so that the show can be seen.
    const show = LEGENDARY_SHOW_BUTTONS[r.species];
    if (show) this.button(essential, show.label, () => { this.close(); if (!this.scene.playLegendaryAct(id, show.act)) this.notice('Ton lapin finit son numéro : réessaie dans un instant.'); }, onTrip ? REFUSALS.TRAVELING : inCare ? REFUSALS.AT_SALON : null).dataset.legendaryShow = show.act;
    if (ultimate) {
      const crowned = wearsCrown(r);
      this.button(essential, crowned ? 'Enlever la couronne' : 'Mettre la couronne', () => this.execute({type: 'toggleCrown', rabbitId: id}, crowned ? 'Couronne enlevée.' : 'Couronne mise !'), null, true).dataset.focus = 'crown';
    }
    // The owner's description of the species: only here, on the rabbit's own sheet (owner, 5 November 2026), to the right of
    // the name in the same frame, as a quote (owner's choice « B · Citation », 7 November 2026).
    this.renderNickname(r, RABBIT_STORIES[r.species]);
    const evolution = EVOLVED_ART.find(entry => entry.id === r.species);
    if (evolution) {
      const section = node('section', '', 'rabbit-evolution'); section.dataset.rabbitEvolution = r.id;
      section.append(node('h3', 'Défis d’évolution'));
      const challenges = EVOLUTION_CHALLENGES[r.species] ?? [];
      const uniqueChallenges = [...new Set(challenges)];
      const list = node('ul', '', 'evolution-challenge-list');
      for (const challenge of uniqueChallenges) {
        const target = evolutionChallengeTarget(r.species, challenge), value = Math.min(target, r.evolution?.challenges?.[challenge] ?? 0);
        let label = evolutionChallengeLabel(challenge);
        if (challenge === 'voyage') label = target === 1 ? 'voyage' : 'voyages';
        else if (challenge === 'soin') label = target === 1 ? 'soin' : 'soins';
        else if (challenge === 'piquenique') label = target === 1 ? 'pique-nique' : 'pique-niques';
        else if (challenge === 'parent' || challenge.startsWith('commis:') || challenge.startsWith('gouteur:')) label = `${evolutionChallengeLabel(challenge)} \u00b7 ${value} / ${target}`;
        else if (challenge === 'quotidien') {
          // The streak still alive: its last claimed bonus is this cycle's or the previous one's.
          const streak = s.missions.streak, alive = streak && streak.lastCycle >= s.missions.daily.cycleIndex - 1 ? streak.count : 0;
          label = `${evolutionChallengeLabel(challenge)} \u00b7 ${value} / ${target}${value >= target ? '' : ` (série : ${Math.min(alive, DAILY_STREAK_TARGET)} / ${DAILY_STREAK_TARGET})`}`;
        } else if (challenge.startsWith('corde:')) label = `${target === 1 ? 'manche' : 'manches'} de corde à sauter (au moins ${challenge.slice(6)} sauts)`;
        const li = node('li', '', value >= target ? 'is-complete' : ''); li.dataset.challenge = challenge;
        const full = challenge === 'parent' || challenge === 'quotidien' || challenge.startsWith('commis:') || challenge.startsWith('gouteur:');
        li.append(node('span', full ? label : `${value} / ${target} ${label}`));
        list.append(li);
      }
      section.append(list);
      const looks = node('div', '', 'evolution-looks');
      for (const [kind, art, name] of [['ancien', rabbitArt(r.species), SPECIES[r.species].name], ['évolué', evolvedRabbitArt(r.species), evolution.name]] as const) {
        // Owner, 4 November 2026: the evolution is a surprise until a rabbit of this species has evolved (no drawing, no name).
        const secret = kind === 'évolué' && !evolutionRevealed(s, r.species);
        const card = node('figure', '', `evolution-look ${kind === 'évolué' && r.evolution?.done !== true ? 'is-locked' : ''}`);
        if (secret) { card.dataset.evolutionSecret = ''; card.append(node('span', '?', 'evolution-mystery'), node('figcaption', 'évolué · surprise !')); looks.append(card); continue; }
        const image = document.createElement('img'); image.src = art?.url ?? ''; image.alt = '';
        card.append(image, node('figcaption', `${kind} · ${name}`)); looks.append(card);
      }
      section.append(looks);
      if (r.evolution?.done === true) {
        section.append(node('p', `${r.name ?? species.name} a évolué : ${evolution.name}.`, 'badge'));
      } else {
        const ready = canEvolve(r);
        const reason = r.affection < 30 ? 'Affection 30 nécessaire.' : !evolutionChallengesComplete(r.species, r.evolution?.challenges) ? 'Termine les défis ci-dessus.' : null;
        const evolve = this.button(section, 'Faire évoluer', () => this.execute({type: 'evolveRabbit', rabbitId: id}, `${r.name ?? species.name} devient ${evolution.name} !`, () => this.showEvolutionMoment(r)), ready ? null : reason ?? 'Évolution indisponible.');
        evolve.dataset.evolveRabbit = id;
      }
      this.content.append(section);
    }
    const factors = [1, ...RARE_BIRTH_BONUS.map(step => step.factor)].sort((a, b) => a - b);
    const factor = RARE_BIRTH_BONUS.find(step => r.affection >= step.affection)?.factor ?? 1;
    const tier = factors.indexOf(factor);
    const chance = node('div', '', 'rabbit-birth-chance badge');
    chance.append(node('span', 'Chance de reproduction'), node('strong', ['Normale', 'Légèrement meilleure', 'Meilleure', 'Bien meilleure', 'Excellente'][tier]));
    const indicator = node('span', '', 'birth-chance-indicator'); indicator.setAttribute('aria-hidden', 'true');
    for (let notch = 0; notch < factors.length; notch++) indicator.append(node('span', '', notch <= tier ? 'is-active' : ''));
    chance.append(indicator); this.content.append(chance);
    if (r.species === BENNY) this.renderBenny(s);
    if (parentBusy(s,id,this.now()) && !away(s, id)) this.content.append(node('p','Au nid · place réservée dans son habitat · revenus conservés','badge'));
    this.content.append(node('p', `${typeNames(species.types)} · ${RARITY_NAMES[species.rarity]}`, 'badge'));
    this.content.append(node('h3', 'Autres actions'));
    const hasDestination = rabbitDropTargets(s, id, this.now()).length > 0;
    this.button(this.content, 'Déplacer', () => this.beginRabbitMove(id), parentBusy(s,id,this.now()) ? busyReason(s, id) : hasDestination ? null : 'Aucun autre habitat compatible avec une place libre.', true);
    const food = releaseGrass(r.species);
    this.button(this.content, 'Confier ce lapin', () => this.confirm('Confier ce lapin ?', `Ce lapin quittera définitivement ta prairie. Tu reçois ${food} nourriture en remerciement.`, () => this.execute({type: 'release', id}, `Lapin confié · +${food} nourriture`, () => { this.view = {kind: 'building', id: r.enclosureId}; })), releaseReason(s, id, this.now()), true).classList.add('action-danger');
  }
  /** Benny's power and sky mode (owner, 1 November 2026). The card closes so the player sees her fly (src/display/bennyFlight.ts). */
  private renderBenny(s: GameState): void {
    const now = this.now(), box = node('section', '', 'benny-powers'); box.dataset.bennyPowers = '';
    box.append(node('h3', 'Pouvoir de Benny'), node('p', `Benny termine tout de suite l’attente de tous les lapereaux de la nurserie. Son pouvoir se recharge ensuite pendant ${BENNY_POWER_RECHARGE / 3_600_000} h.`, 'small'));
    const readyAt = bennyPowerReadyAt(s), recharge = node('p', readyAt > now ? `Recharge : encore ${timeLeft(readyAt, now)}` : 'Pouvoir prêt.', 'badge');
    recharge.dataset.bennyRecharge = ''; box.append(recharge);
    const reason = bennyPowerReason(s, now);
    this.button(box, 'Utiliser le pouvoir', () => this.execute({type: 'bennyPower'}, 'Tous les lapereaux de la nurserie sont prêts !', () => this.close()), reason && REFUSALS[reason]).dataset.focus = 'benny-power';
    const sky = bennyInSky(s);
    box.append(node('p', sky ? 'Benny tourne dans le ciel au-dessus de l’île. Elle reste rattachée à son enclos.' : 'Benny est dans son enclos.', 'small'));
    this.button(box, sky ? 'Ramener Benny dans l’enclos' : 'Faire voler Benny', () => this.execute({type: 'bennySky', inSky: !sky}, sky ? 'Benny est revenue dans son enclos.' : 'Benny s’envole dans le ciel !', () => this.close()), null, true).dataset.focus = 'benny-sky';
    this.content.append(box);
  }
  /** The personal name, in a box after the feeding action: the species stays in the title and the badge. Text only, never HTML. */
  private renderNickname(r: Rabbit, story?: string): void {
    const box = node('section', '', 'rabbit-nickname'), identity = node('div', '', 'rabbit-nickname-id'); box.dataset.rabbitNickname = r.id;
    identity.append(node('p', 'Nom personnel', 'small'), node('p', r.name ?? 'Sans nom', r.name ? 'rabbit-nickname-name' : 'rabbit-nickname-name empty'));
    box.append(identity);
    if (story) { const p = node('p', story, 'rabbit-story'); p.dir = 'auto'; p.dataset.rabbitStory = r.species; box.append(p); box.classList.add('with-story'); }
    const draft = this.rename?.id === r.id ? this.rename : null;
    if (!draft) {
      this.button(identity, r.name ? 'Modifier le nom' : 'Donner un nom', () => {
        this.rename = {id: r.id, text: r.name ?? '', caret: (r.name ?? '').length, error: null}; this.render();
        this.content.querySelector<HTMLInputElement>('input[data-focus="rabbit-name"]')?.focus();
      }, null, true);
      this.content.append(box); return;
    }
    const form = node('form', '', 'rabbit-name-form'); form.noValidate = true; form.onsubmit = event => event.preventDefault();
    const input = node('input'), count = node('p', '', 'small'), problem = node('p', '', 'reason');
    input.type = 'text'; input.value = draft.text; input.autocomplete = 'off'; input.enterKeyHint = 'done'; input.setAttribute('aria-label', 'Nom du lapin'); input.dataset.focus = 'rabbit-name';
    const refreshHints = () => {
      count.textContent = `${Array.from(draft.text.trim()).length} / ${MAX_RABBIT_NAME_LENGTH} caractères`; problem.textContent = draft.error ?? ''; problem.hidden = !draft.error;
    };
    const save = () => {
      const name = normalizeRabbitName(draft.text);
      if (name === null) { draft.error = REFUSALS.INVALID_NAME; refreshHints(); return; }
      this.rename = null; this.execute({type: 'renameRabbit', id: r.id, name}, name ? 'Nom enregistré.' : 'Nom effacé.');
    };
    const cancel = () => { this.rename = null; this.render(); };
    input.addEventListener('input', () => { draft.text = input.value; draft.caret = input.selectionStart ?? input.value.length; draft.error = null; refreshHints(); });
    input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); save(); } else if (event.key === 'Escape') { event.preventDefault(); cancel(); } });
    input.addEventListener('select', () => { draft.caret = input.selectionStart ?? draft.caret; });
    refreshHints(); form.append(input, count, problem);
    this.button(form, 'Enregistrer', save); this.button(form, 'Annuler', cancel, null, true);
    identity.append(form); this.content.append(box);
  }
  private beginRabbitMove(id: string): void {
    const s = this.controller.getSnapshot().state;
    if (!s || this.onboardingActive || this.pailleDialogue.element.open || this.cuisine.active || this.photo ||
      this.placement || this.decorationDraft || this.arranging || document.querySelector('dialog[open]') ||
      !rabbitDropTargets(s, id, this.now()).length) return;
    this.close(); this.movingRabbit = id; this.history = []; this.render();
    this.scene.zoomForRabbitMove?.();
    this.moveBanner.querySelector<HTMLButtonElement>('button')?.focus({preventScroll: true});
  }
  private clearRabbitMove(): void {
    this.movingRabbit = null; this.moveBanner.hidden = true; this.scene.setRabbitDropTargets?.(null);
  }
  private cancelRabbitMove(message?: string): void {
    const id = this.movingRabbit; if (!id) return;
    this.clearRabbitMove();
    if (this.snapshot.state?.rabbits.some(r => r.id === id)) this.open({kind: 'rabbit', id}, 'root');
    else this.render();
    this.content.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll: true});
    if (message) this.notice(message);
  }
  private syncRabbitMove(): void {
    const id = this.movingRabbit; if (!id) return;
    const s = this.snapshot.state, rabbit = s?.rabbits.find(r => r.id === id);
    if (!s || !rabbit || parentBusy(s, id, this.now()) || this.onboardingActive || this.pailleDialogue.element.open) {
      this.cancelRabbitMove(s && rabbit ? busyReason(s, id) : 'Ce lapin n’est plus disponible.'); return;
    }
    this.moveBanner.hidden = false;
    this.moveBanner.querySelector('span')!.textContent = `Choisis un habitat pour ${rabbit.name || SPECIES[rabbit.species].name}`;
    this.scene.setRabbitDropTargets?.(rabbitDropTargets(s, id, this.now()));
  }
  private dropRabbit(id: string, enclosureId: string): void {
    this.controller.refresh();
    if (this.view?.kind !== 'moveRabbit' && this.movingRabbit !== id) return;
    const s = this.controller.getSnapshot().state, rabbit = s?.rabbits.find(r => r.id === id);
    if (!s || !rabbit) return;
    if (parentBusy(s, id, this.now())) { this.notice(busyReason(s, id)); return; }
    if (!rabbitDropTargets(s, id, this.now()).includes(enclosureId)) {
      const b = s.buildings.find(b => b.id === enclosureId);
      if (b?.kind === 'enclosure') this.notice(`Cet habitat ne peut pas accueillir ce lapin. ${b.id === rabbit.enclosureId ? 'Habitat actuel.' : this.entryReason(s, b, rabbit.species) ?? ''}`);
      return;
    }
    this.execute({type: 'moveRabbit', id, enclosureId}, 'Lapin déplacé.', () => {
      this.clearRabbitMove(); this.view = {kind: 'rabbit', id};
    });
  }
  private destinations(s: GameState, choose: (id: string) => void, species: SpeciesId, currentId?: string, price?: number): void {
    for (const b of s.buildings.filter(b => b.kind === 'enclosure')) {
      const count = occupants(s, b.id).length;
      this.content.append(node('p', HABITATS[b.habitat!.type].accepted, 'small'));
      this.button(this.content, `${this.enclosureName(s, b.id)} · ${count}/${habitatStats(b).capacity}${price !== undefined ? ` · acheter ${price} pattes` : ''}`, () => choose(b.id),
        b.id === currentId ? 'Habitat actuel.' : this.entryReason(s, b, species) ?? (price !== undefined ? moneyReason(s, price) : null), true);
    }
  }
  private renderDestinations(s: GameState, id: string): void {
    const r = s.rabbits.find(r => r.id === id); if (!r) { this.close(); return; }
    this.title.textContent = 'Déplacer';
    this.content.append(this.rabbitCard(s, id));
    if(parentBusy(s,id,this.now())) {this.content.append(node('p',busyReason(s, id),'reason'));return;}
    this.destinations(s, enclosureId => this.dropRabbit(id, enclosureId), r.species, r.enclosureId);
  }
  /** The ready baby of this birth, or null (growing, gone, or another game). */
  private readyBaby(s: GameState | null, birthId: string) {
    const baby = s ? babyInNursery(nurseryBuilding(s), birthId) : null;
    return baby && baby.readyAt <= this.now() ? baby : null;
  }
  /**
   * The single way into a ready baby's reception (owner, 2 November 2026): a touch on its cushion, its button in the nursery
   * panel, or the guide. The legendaries and Benny first play their own full-screen show, at every birth, and their choices
   * appear at its end (owner: « ça mette l'animation, puis ensuite on décide »). Returns whether a reception is showing.
   */
  private openReception(birthId: string): boolean {
    this.controller.refresh();
    const s = this.controller.getSnapshot().state; if (!s) return false;
    const baby = this.readyBaby(s, birthId), nursery = nurseryBuilding(s);
    // A baby still growing (or already gone) answers like the nursery itself.
    if (!baby) { if (nursery) this.open({kind: 'building', id: nursery.id}); return false; }
    if (this.receptionShow?.isConnected) return true;
    if (this.cuisine.active || this.pailleDialogue.element.open || this.photo || this.placement || this.decorationDraft) return false;
    if (this.dialog.open || this.breedingDialog.open || (document.getElementById('import-dialog') as HTMLDialogElement | null)?.open) return false;
    this.clearRabbitMove(); this.clearWelcome();
    const species = baby.birth.species;
    if (isLegendaryShow(species) || species === BENNY) { this.closeReception(); this.openReceptionShow(s, birthId); return true; }
    this.renderReception(s, birthId);
    if (!this.reception.open) this.reception.showModal();
    this.reception.querySelector<HTMLButtonElement>('.reception-actions button:not(:disabled)')?.focus({preventScroll: true});
    return true;
  }
  /** Closes the reception card and the legendaries' or Benny's show, whichever is open: the baby stays in its cushion. */
  private closeReception(): void {
    if (this.reception.open) this.reception.close();
    this.reception.replaceChildren();
    const show = this.receptionShow; this.receptionShow = null;
    if (show) { if (show.open) show.close(); show.remove(); }
  }
  /** A legendary's or Benny's show, whose calm end carries the same choices as the reception card. */
  private openReceptionShow(s: GameState, birthId: string): void {
    const species = this.readyBaby(s, birthId)!.birth.species, info = SPECIES[species];
    const text: RevealText = {
      title: 'Ton lapereau est prêt !', name: info.name, details: `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`, button: 'Plus tard',
      isNew: !s.discovered.includes(species), choices: host => this.receptionChoices(host, s, birthId, species),
    };
    let show: HTMLDialogElement | null = null;
    const onClose = () => { if (show && this.receptionShow === show) this.receptionShow = null; };
    show = isLegendaryShow(species) ? showLegendaryReveal(species, text, onClose) : showBennyReveal(text, onClose);
    show.classList.add('reception-show'); show.dataset.birthId = birthId;
    this.receptionShow = show;
  }
  /**
   * The reception card, painted after the baby's first type (owner, 2 November 2026: « pour tous les lapins je veux que la fiche
   * de réception du lapin soit stylisée en fonction du type 1 du lapin »), laid out like concept A: the title in the banner, the
   * baby large on the meadow, its name, types and rarity below it, then Accueillir and Confier inside the wreath.
   */
  private renderReception(s: GameState, birthId: string): void {
    const baby = this.readyBaby(s, birthId)!, species = baby.birth.species, info = SPECIES[species], card = this.reception, type = info.types[0];
    card.replaceChildren(); clearRabbitTheme(card); rabbitTheme(card, species);
    card.className = `reception-card reception-type-${type}`; card.dataset.type = type; card.dataset.birthId = birthId;
    const art = receptionFrame(type);
    if (art) { preloadReceptionFrame(type); card.style.setProperty('--reception-frame', `url("${art.url}")`); card.style.setProperty('--reception-ratio', (art.width / art.height).toFixed(4)); }
    else { card.style.removeProperty('--reception-frame'); card.style.removeProperty('--reception-ratio'); }
    const sheet = node('div', '', 'reception-sheet'), frame = node('div', '', 'reception-frame'); frame.setAttribute('aria-hidden', 'true');
    const close = node('button', '×', 'reception-close'); close.type = 'button'; close.setAttribute('aria-label', 'Fermer'); close.onclick = () => this.closeReception();
    const banner = node('div', '', 'reception-banner'); banner.append(node('p', 'Ton lapereau est prêt !', 'reception-kicker'));
    const portraitArt = avatar(species, true); portraitArt.classList.add('reception-portrait');
    const artBox = node('div', '', 'reception-art'); artBox.append(portraitArt);
    const body = node('div', '', 'reception-body'), title = node('h2', info.name, 'reception-name'); title.id = 'reception-title';
    const details = node('p', '', 'reception-details'); details.append(node('span', `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`));
    if (!s.discovered.includes(species)) details.append(node('span', 'Nouvelle espèce', 'badge reception-new'));
    body.append(title, details);
    sheet.append(frame, banner, artBox, body);
    const actions = node('div', '', 'reception-actions');
    this.receptionChoices(actions, s, birthId, species);
    card.classList.toggle('reception-no-place', !welcomeDestinations(s, species).length);
    card.append(sheet, actions, close);
  }
  /** Accueillir and Confier, on the reception card or at the end of a legendary's or Benny's show. */
  private receptionChoices(actions: HTMLElement, s: GameState, birthId: string, species: SpeciesId): void {
    const places = welcomeDestinations(s, species).length;
    const welcome = this.button(actions, 'Accueillir', () => this.beginWelcome(birthId), places ? null : 'Aucun habitat compatible n’a de place libre. Ton lapereau reste en sécurité dans la nurserie.');
    welcome.dataset.reception = 'welcome'; if (this.onboardingActive && places) welcome.classList.add('guide-target');
    if (!places) this.button(actions, 'Voir les habitats compatibles', () => { this.closeReception(); this.compatibleHabitats(species); }, null, true).dataset.reception = 'shop';
    // Benny can never be lost: her Confier stays refused, with its reason.
    if (species === BENNY) this.button(actions, 'Confier', () => undefined, REFUSALS.BENNY_KEPT, true).dataset.reception = 'release';
    else {
      const pattes = releaseBabyPattesFor(species);
      const release = this.button(actions, `Confier · +${pattes} pattes`, () => {
        this.closeReception();
        this.confirm('Confier ce lapereau ?', `Ce lapereau quittera la nurserie et ne rejoindra pas ta prairie. Tu reçois ${pattes} pattes.`, () => this.execute({type: 'releaseBaby', birthId}, `Lapereau confié · +${pattes} pattes`));
      }, null, true);
      release.classList.add('action-danger'); release.dataset.reception = 'release';
    }
  }
  /** « Accueillir » steps back over the island and points arrows at every compatible habitat with a free place. */
  private beginWelcome(birthId: string): void {
    this.controller.refresh();
    const s = this.controller.getSnapshot().state, baby = this.readyBaby(s, birthId);
    if (!s || !baby) { this.closeReception(); return; }
    if (!welcomeDestinations(s, baby.birth.species).length) return;
    this.closeReception(); this.clearRabbitMove();
    // Not close(): during the guided start it would call Paille back over the island.
    this.rememberView(); this.purchaseReturn = null; this.shopReturn = null; this.history = []; this.view = null; this.arranging = false; this.syncArrangement();
    this.welcoming = birthId; this.render();
    this.scene.zoomForRabbitMove?.();
    this.welcomeBanner.querySelector<HTMLButtonElement>('button')?.focus({preventScroll: true});
  }
  private clearWelcome(): void {
    if (!this.welcoming) return;
    this.welcoming = null; this.welcomeBanner.hidden = true; this.scene.setRabbitDropTargets?.(null);
  }
  /** Annuler: nothing changes, the baby stays in its cushion. */
  private cancelWelcome(message?: string): void {
    if (!this.welcoming) return;
    this.clearWelcome();
    if (this.onboardingActive) this.pailleDialogue.invite();
    this.render();
    if (message) this.notice(message);
  }
  private syncWelcome(): void {
    const birthId = this.welcoming; if (!birthId) return;
    const s = this.snapshot.state, baby = this.readyBaby(s, birthId);
    // Gone (welcomed, entrusted, another game): its own action already said so.
    if (!s || !baby) { this.clearWelcome(); return; }
    const places = welcomeDestinations(s, baby.birth.species);
    if (!places.length || this.pailleDialogue.element.open) { this.clearWelcome(); if (!places.length) this.notice('Aucun habitat compatible n’a de place libre. Ton lapereau reste en sécurité dans la nurserie.'); return; }
    this.welcomeBanner.hidden = false;
    this.welcomeBanner.querySelector('span')!.textContent = `Choisis un habitat pour ${SPECIES[baby.birth.species].name}`;
    this.scene.setRabbitDropTargets?.(places.map(b => b.id));
  }
  private dropWelcome(birthId: string, enclosureId: string): void {
    this.controller.refresh();
    if (this.welcoming !== birthId && !(this.view?.kind === 'welcomeBaby' && this.view.birthId === birthId)) return;
    const s = this.controller.getSnapshot().state, baby = this.readyBaby(s, birthId);
    if (!s || !baby) return;
    const species = baby.birth.species;
    if (!welcomeDestinations(s, species).some(b => b.id === enclosureId)) {
      const b = s.buildings.find(b => b.id === enclosureId);
      if (b?.kind === 'enclosure') this.notice(`Cet habitat ne peut pas accueillir ce lapereau. ${this.entryReason(s, b, species) ?? ''}`.trim());
      return;
    }
    const discovery = !s.discovered.includes(species), first = s.missions.events.welcome === 0 && !!s.initiation;
    this.execute({type: 'welcome', enclosureId, birthId}, 'Lapereau accueilli !', () => {
      this.clearWelcome();
      if (this.view?.kind === 'welcomeBaby') { this.view = null; this.history = []; }
      // The reception (card, or the legendaries' and Benny's show) was the discovery: only the guided first birth follows it.
      if (first) this.firstBirth(species, discovery);
    });
  }
  /** The list fallback of the island arrows, like a rabbit's move. */
  private renderWelcomeDestinations(s: GameState, birthId: string): void {
    const baby = this.readyBaby(s, birthId); if (!baby) { this.close(); return; }
    const species = baby.birth.species, info = SPECIES[species];
    this.title.textContent = 'Accueillir';
    this.content.append(this.card(info.name, `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`, species));
    this.destinations(s, enclosureId => this.dropWelcome(birthId, enclosureId), species);
  }
  private openRecipe(species: SpeciesId): void {
    this.recipeDetails.add(species); this.requestedRecipeFocus = species; this.open({kind:'recipes'});
  }
  private chooseRabbitHabitat(id: string): void {
    this.rabbitDestination=id;this.render();
    this.content.querySelector<HTMLElement>('[data-confirm-purchase]')?.scrollIntoView?.({block:'nearest'});
  }
  private rabbitNoRoom(host: HTMLElement, s: GameState, species: SpeciesId): void {
    const compatible = s.buildings.filter(b => habitatAccepts(b,species));
    host.append(node('p',compatible.length ? 'Tous les habitats compatibles sont pleins' : 'Aucun habitat compatible','reason'));
    this.button(host,'Voir les habitats compatibles',()=>{
      this.compatibleHabitats(species);
    },null,true);
    const candidates=compatible.filter(b=>b.habitat!.level<3);
    const access=(b:Building)=>stateLevelAccess(s,{family:'habitatUpgrade',id:b.habitat!.type,toLevel:(b.habitat!.level+1) as 2|3});
    const upgrade=candidates.find(b=>access(b).accessible)??candidates[0];
    const duplicate = s.rabbits.find(r => compatible.some(b => b.id === r.enclosureId) && s.rabbits.filter(other => other.species === r.species).length > 1 && !releaseReason(s, r.id, this.now()));
    if (!upgrade && duplicate) this.button(host, `Confier un doublon : ${duplicate.name || SPECIES[duplicate.species].name}`, () => this.open({kind:'rabbit', id:duplicate.id}), null, true);
    if (!upgrade && !duplicate) host.append(node('p', 'Achète un habitat compatible pour créer une place.', 'small'));
    if(upgrade){
      if(access(upgrade).locked)host.append(node('p',`Amélioration : niveau du joueur ${access(upgrade).requiredLevel} requis. Consulte les habitats compatibles achetables pour créer de la place.`,'reason'));
      this.button(host,`${access(upgrade).locked?'Voir l’amélioration de':'Améliorer'} ${this.enclosureName(s,upgrade.id)}`,()=>this.open({kind:'building',id:upgrade.id}),null,true);
    }
  }
  private renderBuyRabbit(s: GameState, species: SpeciesId): void {
    if(stateLevelAccess(s,{family:'species',id:species,action:'purchase'}).locked){this.renderLevelRequirement(s,{family:'species',id:species,action:'purchase'});return;}
    this.title.textContent = `Acheter : ${SPECIES[species].name}`; this.content.append(avatar(species),node('p',`${SPECIES[species].price} pattes · paiement à la confirmation`,'badge'));
    const eligible=s.buildings.filter(b=>!habitatEntryReason(s,b,species));
    this.scene.setRabbitPurchase(species,this.rabbitDestination);
    this.content.append(node('p','Choisis un habitat','badge'));
    for (const b of eligible) {
      const free=habitatStats(b).capacity-occupants(s,b.id).length;
      const button=this.button(this.content,`${this.enclosureName(s,b.id)} · ${free} place${free>1?'s':''} libre${free>1?'s':''}`,()=>this.chooseRabbitHabitat(b.id),null,true);
      button.setAttribute('aria-pressed',String(b.id===this.rabbitDestination));
    }
    const enclosure=s.buildings.find(b=>b.id===this.rabbitDestination);
    if (!eligible.length) this.rabbitNoRoom(this.content,s,species);
    if (enclosure) {
      const command:PattesCommand={type:'buyRabbit',species,enclosureId:enclosure.id};
      const after=(value?:string|number)=>{this.finishPurchase('rabbit',String(value)); if(!s.discovered.includes(species))this.discovery(species);};
      this.content.append(node('p',`Destination : ${this.enclosureName(s,enclosure.id)}`,'badge'));
      this.button(this.content,`Confirmer l’achat · ${SPECIES[species].price} pattes`,()=>{
        if(this.view?.kind==='buyRabbit' && this.view.species===species && this.rabbitDestination===enclosure.id)this.execute(command,'Lapin acheté et accueilli.',after);
      },this.entryReason(s,enclosure,species) ?? moneyReason(s,SPECIES[species].price!)).dataset.confirmPurchase='';
      this.complement(this.content,s,command,`${SPECIES[species].name} → ${this.enclosureName(s,enclosure.id)}`,'Lapin acheté et accueilli.',after);
    } else this.button(this.content,`Confirmer l’achat · ${SPECIES[species].price} pattes`,()=>{},'Choisis d’abord un habitat.');
    this.button(this.content,'Annuler · aucun coût',()=>this.cancelPurchase(),null,true);
  }
  /** A Christmas rabbit bought at the market, for sucres d'orge: the same habitat choice as the shop, no level needed. */
  private renderBuyChristmasRabbit(s: GameState, species: SpeciesId): void {
    const price = candyAmount(CHRISTMAS_RABBIT_CANDY_PRICE);
    this.title.textContent = `Acheter : ${SPECIES[species].name}`; this.content.append(avatar(species), node('p', `${price} · paiement à la confirmation`, 'badge'));
    const eligible = s.buildings.filter(b => !habitatEntryReason(s, b, species));
    this.scene.setRabbitPurchase(species, this.rabbitDestination);
    this.content.append(node('p', 'Choisis un habitat', 'badge'));
    for (const b of eligible) {
      const free = habitatStats(b).capacity - occupants(s, b.id).length;
      const button = this.button(this.content, `${this.enclosureName(s, b.id)} · ${free} place${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}`, () => this.chooseRabbitHabitat(b.id), null, true);
      button.setAttribute('aria-pressed', String(b.id === this.rabbitDestination));
    }
    if (!eligible.length) this.content.append(node('p', 'Il te faut un habitat compatible avec une place libre pour l’accueillir.', 'reason'));
    const enclosure = s.buildings.find(b => b.id === this.rabbitDestination), reason = christmasRabbitReason(s, species);
    if (enclosure) {
      this.content.append(node('p', `Destination : ${this.enclosureName(s, enclosure.id)}`, 'badge'));
      this.button(this.content, `Confirmer l’achat · ${price}`, () => {
        if (this.view?.kind === 'buyRabbit' && this.view.candies && this.view.species === species && this.rabbitDestination === enclosure.id)
          this.execute({type: 'buyChristmasRabbit', species, enclosureId: enclosure.id}, 'Lapin de Noël acheté et accueilli.', value => { this.finishPurchase('rabbit', String(value)); if (!s.discovered.includes(species)) this.discovery(species); });
      }, this.entryReason(s, enclosure, species) ?? (reason ? REFUSALS[reason] : null)).dataset.confirmPurchase = '';
    } else this.button(this.content, `Confirmer l’achat · ${price}`, () => {}, 'Choisis d’abord un habitat.');
    this.button(this.content, 'Annuler · aucun coût', () => this.cancelPurchase(), null, true);
  }
  private renderNest(s: GameState, id: string): void {
    const nest = s.buildings.find(b => b.id === id)!;
    if (nest.breeding) {
      const job=nest.breeding;
      const nursery = s.buildings.find(b => b.kind === 'nursery'), finished = job.endsAt <= this.now(), automatic = automaticNurseryTransfer(s);
      const reason = !nursery ? 'Place gratuitement la nurserie depuis Aménagement.' : nurseryFull(nursery) ? 'La nurserie est pleine. Accueille un lapereau prêt pour libérer une place ; parents et lapereau attendent au nid.' : null;
      this.workState(!finished ? 'running' : reason ? 'blocked' : 'ready', !finished ? (automatic ? 'À la fin du délai, le lapereau rejoindra seul la nurserie si un couchage est libre, et commencera à grandir.' : 'À la fin du délai, envoie manuellement le lapereau dans la nurserie.') : reason ?? 'Le lapereau est prêt à rejoindre la nurserie. Sa croissance commencera à ta confirmation.');
      this.timer(job.startedAt, job.endsAt);
      if (!finished) this.acceleration(s, id, 'breeding');
      else this.button(this.content, 'Envoyer dans la nurserie', () => this.execute({type:'transferBirth', id, birthId:job.birth.id}, 'Lapereau envoyé dans la nurserie. Les parents retrouvent leurs habitats.'), reason);
      for(const parentId of job.parents) {
        const parent=s.rabbits.find(r=>r.id===parentId);
        if(parent) {const card=this.rabbitCard(s,parentId);card.append(node('p','Au nid · '+this.enclosureName(s,parent.enclosureId),'badge'));this.button(card,'Voir ce parent',()=>this.open({kind:'rabbit',id:parentId}),null,true);this.content.append(card);}
      }
      return;
    }
    if (!s.buildings.some(b => b.kind === 'nursery')) { this.workState('blocked', 'Place la nurserie offerte avant de lancer une reproduction.'); this.button(this.content, 'Placer gratuitement la nurserie', () => this.beginPlacement('nursery',undefined,undefined,true)); return; }
    this.workState('free', 'Choisis deux parents distincts, chacun d’affection 2 minimum. Le lancement est gratuit.');
    if (nest.islet) this.content.append(node('p', EPIC_ISLET_TEXT, 'badge'));
    if (s.lastBreedingParents) {
      const pair = s.lastBreedingParents.map(parentId => s.rabbits.find(r => r.id === parentId));
      const reason = pair.some(r => !r) ? 'Un parent du dernier croisement n’est plus dans ta prairie.' :
        rabbitAvailability(s, pair[0]!.id, this.now()) ?? rabbitAvailability(s, pair[1]!.id, this.now());
      this.button(this.content, 'Refaire le dernier croisement', () => {
        this.parents = [...s.lastBreedingParents!]; this.parentSearch = ''; this.parentElement = ''; this.parentsAvailableOnly = false;
        this.openBreeding(id);
      }, reason, true);
      this.content.append(node('p', pair.map(r => r ? r.name ?? SPECIES[r.species].name : 'Parent absent').join(' × '), 'small'));
    }
    this.button(this.content, 'Croiser', () => this.openBreeding(id));
    // The nest time depends on the hidden result: announce the real range, not a fixed duration.
    const minutes = SPECIES_IDS.map(id => growthDuration(id) / 60_000), span = (m: number) => m < 60 ? `${m} minutes` : `${m / 60} heure${m >= 120 ? 's' : ''}`;
    const nestTime = `reproduction de ${span(Math.min(...minutes))} à ${span(Math.max(...minutes))} selon le lapereau`;
    this.content.append(node('p', automaticNurseryTransfer(s) ? `Gratuit · ${nestTime}, puis il rejoint seul un couchage libre de la nurserie et grandit pendant ton absence.` : `Gratuit · ${nestTime}, puis transfert manuel et croissance en nurserie.`));
    this.button(this.content, 'Carnet de reproduction', () => this.open({kind: 'recipes'}), null, true);
    if (s.buildings.some(b => nurseryFull(b))) this.content.append(node('p', 'La nurserie est pleine : le prochain lapereau attendra au nid si nécessaire.', 'small'));
  }
  /** Heart bubble over a finished nest: the baby goes straight to the nursery and the camera follows it there. */
  private sendBirth(nestId: string): void {
    const s = this.snapshot.state, job = s?.buildings.find(b => b.id === nestId)?.breeding, nursery = s?.buildings.find(b => b.kind === 'nursery');
    if (!s || !job) return;
    // Anything that would refuse the transfer is explained in the nest panel instead.
    if (!nursery || nurseryFull(nursery) || job.endsAt > this.now()) { this.open({kind: 'building', id: nestId}); return; }
    this.execute({type: 'transferBirth', id: nestId, birthId: job.birth.id}, 'Lapereau envoyé dans la nurserie. Les parents retrouvent leurs habitats.', () => this.scene.focusBuilding(nursery.id));
  }
  /** Two large independent lists, compact shared tools and a pinned confirmation. */
  private openBreeding(nestId: string): void {
    if (this.onboardingActive) this.parents = ['paille','neige'].map(species => this.snapshot.state!.rabbits.find(r => r.species === species)?.id ?? null) as [string|null,string|null];
    this.breedingNestId = nestId; this.renderBreeding();
    if (!this.breedingDialog.open) this.breedingDialog.showModal();
    this.breedingDialog.querySelectorAll<HTMLElement>('.breeding-list').forEach(list => {
      const selected = list.querySelector<HTMLElement>('.selected');
      if (selected) list.scrollTop = Math.max(0, selected.offsetTop - list.offsetTop - (list.clientHeight - selected.offsetHeight) / 2);
    });
  }
  private closeBreeding(): void {
    this.breedingNestId = null;
    if (this.breedingDialog.open) this.breedingDialog.close();
    this.breedingDialog.replaceChildren();
    if(this.onboardingActive) {this.pailleDialogue.invite();this.renderTutorial();}
  }
  private renderBreeding(): void {
    const s = this.snapshot.state, nest = s?.buildings.find(b => b.id === this.breedingNestId && b.kind === 'nest');
    if (!s || !nest || nest.breeding) { this.closeBreeding(); return; }
    for (let i = 0; i < 2; i++) if (this.parents[i] && !s.rabbits.some(r => r.id === this.parents[i])) this.parents[i] = null;
    const selected = this.parents.map(id => s.rabbits.find(r => r.id === id));
    const focused = this.breedingDialog.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    const focusKey = focused?.dataset.focus;
    const caret = focused instanceof HTMLInputElement && focused.type === 'search' ? [focused.selectionStart, focused.selectionEnd] as const : null;
    const dialogScroll = this.breedingDialog.scrollTop;
    const scroll = [...this.breedingDialog.querySelectorAll<HTMLElement>('.breeding-list')].map(list => list.scrollTop);
    const header = node('div', '', 'breeding-header');
    header.append(node('h2', 'Choisir les parents', 'breeding-badge'));
    header.lastElementChild!.id = 'breeding-title';
    const close = this.button(header, '×', () => this.closeBreeding(), null, true); close.classList.add('icon', 'breeding-close'); close.setAttribute('aria-label', 'Fermer le croisement');
    close.dataset.focus = 'breeding-close';
    const filters = node('div', '', 'breeding-filters');
    const search = node('input'); search.type = 'search'; search.placeholder = 'Nom ou espèce'; search.setAttribute('aria-label', 'Rechercher un parent par nom ou espèce');
    search.value = this.parentSearch; search.dataset.focus = 'parent-search';
    search.addEventListener('input', () => { this.parentSearch = search.value; this.renderBreeding(); });
    const element = node('select'); element.setAttribute('aria-label', 'Élément des parents'); element.dataset.focus = 'parent-element';
    const all = node('option', 'Tous les éléments'); all.value = ''; element.append(all);
    for (const type of Object.keys(TYPE_NAMES) as RabbitType[]) { const option = node('option', TYPE_NAMES[type]); option.value = type; element.append(option); }
    element.value = this.parentElement;
    element.addEventListener('change', () => { this.parentElement = element.value as RabbitType | ''; this.renderBreeding(); });
    const available = this.button(filters, 'Disponibles', () => { this.parentsAvailableOnly = !this.parentsAvailableOnly; this.renderBreeding(); }, null, true);
    available.dataset.focus = 'parent-available'; available.setAttribute('aria-pressed', String(this.parentsAvailableOnly));
    filters.prepend(search, element);
    if (this.parentSearch || this.parentElement || this.parentsAvailableOnly) {
      const reset = this.button(filters, '↺', () => {
        this.parentSearch = ''; this.parentElement = ''; this.parentsAvailableOnly = false; this.renderBreeding();
      }, null, true);
      reset.setAttribute('aria-label', 'Réinitialiser les filtres');
      reset.dataset.focus = 'parent-reset';
    }
    const searchable = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
    const query = searchable(this.parentSearch.trim());
    const columns = node('div', '', 'breeding-columns');
    const column = (slot: 0 | 1) => {
      const box = node('section', '', 'breeding-column'), list = node('div', '', 'breeding-list');
      box.append(node('h3', `Lapin ${slot + 1}`));
      for (const r of s.rabbits) {
        const busy = rabbitAvailability(s, r.id, this.now()), other = this.parents[1 - slot] === r.id, chosen = this.parents[slot] === r.id;
        if (!chosen && (query && !searchable(`${r.name ?? ''} ${SPECIES[r.species].name}`).includes(query) ||
          this.parentElement && !(SPECIES[r.species].types as readonly RabbitType[]).includes(this.parentElement) || this.parentsAvailableOnly && (!!busy || other))) continue;
        const row = node('button', '', `breeding-row${chosen ? ' selected' : ''}`); row.type = 'button';
        row.dataset.focus = `breeding-parent-${slot}-${r.id}`;
        row.disabled = !!busy || other; row.setAttribute('aria-pressed', String(chosen));
        const text = node('span', '', 'breeding-row-text');
        text.append(node('strong', r.name ?? SPECIES[r.species].name), node('span', r.name ? `${SPECIES[r.species].name} · affection ${r.affection}` : `Affection ${r.affection}`));
        text.append(node('small', other ? `Déjà choisi comme lapin ${2 - slot}` : busy ?? `${this.enclosureName(s, r.enclosureId)} · affection ${r.affection}`));
        if (row.disabled) text.lastElementChild!.classList.add('breeding-unavailable-reason');
        row.append(avatar(r), text);
        row.addEventListener('click', () => { if (row.disabled) return; this.parents[slot] = chosen ? null : r.id; this.renderBreeding(); });
        list.append(row);
      }
      if (!list.childElementCount) list.append(node('p', 'Aucun lapin pour ces filtres.', 'small'));
      box.append(list); return box;
    };
    const tools = node('div', '', 'breeding-tools');
    this.button(tools, 'Carnet', () => { this.closeBreeding(); this.open({kind: 'recipes'}); }, null, true);
    columns.append(column(0), column(1));
    const toolbar = node('div', '', 'breeding-toolbar'); toolbar.append(filters, tools);
    const footer = node('div', '', 'breeding-footer');
    const confirmation = node('p', selected.map(r => r ? r.name ?? SPECIES[r.species].name : 'Choisis un parent').join(' × '), 'breeding-confirmation');
    footer.append(confirmation);
    let reason: string | null = selected[0] && selected[1] ? (rabbitAvailability(s, selected[0].id, this.now()) ?? rabbitAvailability(s, selected[1].id, this.now())) : 'Choisis un lapin dans chaque liste.';
    if (selected[0] && selected[1]) {
      const odds = oddsView(s, selected[0].species, selected[1].species, selected[0].affection, selected[1].affection, !!nest.islet);
      if (!odds.possible) reason = REFUSALS.NO_BREEDING_RESULT;
    }
    if (this.parents[0] && this.parents[0] === this.parents[1]) reason = REFUSALS.SAME_PARENT;
    const launch = this.button(footer, 'Croiser', () => {
      if (this.parents[0] && this.parents[1]) this.execute({type: 'breed', parents: [this.parents[0], this.parents[1]], ...(nest.islet ? {nestId: nest.id} : {})}, 'Reproduction lancée. Le résultat reste une surprise !', () => this.closeBreeding());
    }, reason);
    launch.classList.add('breeding-launch');
    if (reason) {
      const explanation = footer.querySelector<HTMLElement>('.reason');
      confirmation.textContent = selected[0] && selected[1] ? `${confirmation.textContent} — ${reason}` : reason;
      if (explanation) { confirmation.id = explanation.id; explanation.remove(); }
    }
    if (this.onboardingActive) launch.classList.add('guide-target');
    if(this.onboardingActive) {
      const escape=node('div','','onboarding-escape');
      this.button(escape,'Paramètres',()=>{this.closeBreeding();this.open({kind:'settings'});},null,true);
      this.button(escape,'Passer le tutoriel',()=>{this.preferences.set({tutorial:false});this.closeBreeding();this.render();},null,true);
      footer.append(escape);
    }
    this.breedingDialog.replaceChildren(header, toolbar, columns, footer);
    this.applyOnboardingLock();
    if (focused) {
      const equivalent = [...this.breedingDialog.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('[data-focus]')].find(control => control.dataset.focus === focusKey && !control.disabled);
      (equivalent ?? (!launch.disabled ? launch : this.breedingDialog.querySelector<HTMLButtonElement>('button:not(:disabled)')))?.focus({preventScroll: true});
      if (equivalent instanceof HTMLInputElement && caret && caret[0] !== null && caret[1] !== null) equivalent.setSelectionRange(caret[0], caret[1]);
    }
    this.breedingDialog.querySelectorAll<HTMLElement>('.breeding-list').forEach((list, i) => { list.scrollTop = scroll[i] ?? 0; });
    this.breedingDialog.scrollTop = dialogScroll;
  }
  private renderNursery(s: GameState): void {
    const view = nurseryView(s, this.now()), nurseryId = s.buildings.find(b => b.kind === 'nursery')!.id;
    if (!view.babies.length) { this.workState('free', 'La nurserie est libre. Lance une reproduction dans le nid.'); const nest = s.buildings.find(b => b.kind === 'nest'); this.button(this.content, 'Voir le nid', () => { if (nest) this.open({kind: 'building', id: nest.id}); else this.open({kind:'arrange'}); }, null, true); }
    // Several cushions: one section per baby, each with its own timer and actions. One cushion keeps the former panel.
    const sections = view.capacity > 1;
    for (const baby of view.babies) {
      if (sections) this.content.append(node('h3', `Couchage ${baby.slot + 1}`));
      if (baby.stage === 'growing') {
        this.workState('running', 'Après croissance, choisis un habitat pour accueillir le lapereau.');
        this.content.append(node('p', 'Un petit lapin grandit au chaud… Son espèce reste secrète.'));
        this.timer(baby.startedAt, baby.readyAt);
        this.content.append(avatar(undefined, true));
        this.acceleration(s, nurseryId, 'growth', baby.birthId); continue;
      }
      const species = baby.species, full = !welcomeDestinations(s, species).length, name = SPECIES[species].name;
      this.workState(full ? 'blocked' : 'ready', full ? 'Aucun habitat compatible avec une place libre. Le lapereau reste en sécurité ici.' : 'Ton lapereau est prêt. Touche-le sur son couchage ou ouvre sa fiche pour l’accueillir.');
      this.content.append(avatar(species, true), node('h3', name));
      // The keyboard and VoiceOver way to the same reception card as a touch on the cushion.
      this.button(this.content, full ? `Voir la fiche de ${name}` : `Accueillir ${name}`, () => this.openReception(baby.birthId)).dataset.reception = baby.birthId;
      if (full) this.rabbitNoRoom(this.content, s, species);
    }
    // After the babies: their timers stay visible without scrolling in landscape.
    this.content.append(node('p', `Couchages : ${view.capacity} / ${NURSERY.maxCapacity}`, 'badge'));
    this.nurseryUnlock(s);
  }
  /** Only the next cushion is offered; prices come from `nurseryUnlockQuote`, re-read at confirmation. */
  private nurseryUnlock(s: GameState): void {
    const next = nurseryUnlockQuote(nurseryBuilding(s));
    if (!next) { this.content.append(node('p', 'Capacité maximale : les quatre couchages sont débloqués.', 'badge')); return; }
    this.button(this.content, `Débloquer un couchage · ${heartAmount(next.hearts)}`, () => {
      this.controller.refresh(); const current = this.controller.getSnapshot().state; if (!current) return;
      const fresh = nurseryUnlockQuote(nurseryBuilding(current));
      if (!fresh || fresh.fromCapacity !== next.fromCapacity) { this.notice(REFUSALS.STALE_ACTION); this.render(); return; }
      if (current.hearts < fresh.hearts) { this.notice(REFUSALS.NOT_ENOUGH_HEARTS); return; }
      this.confirm('Débloquer un couchage ?', `${heartAmount(fresh.hearts)} · solde : ${current.hearts} cœurs. La nurserie passera définitivement de ${fresh.fromCapacity} à ${fresh.toCapacity} couchages. Aucune patte n’est dépensée ; les lapereaux restent à leur place.`,
        () => this.execute({type: 'unlockNurserySlot', fromCapacity: fresh.fromCapacity, expectedCost: fresh.hearts}, `Couchage débloqué · ${fresh.toCapacity} / ${NURSERY.maxCapacity}.`));
    }, s.hearts < next.hearts ? REFUSALS.NOT_ENOUGH_HEARTS : null, true).classList.add('heart-spend');
  }
  private renderCollection(s: GameState): void {
    this.button(this.content,'Album et souvenirs',()=>this.open({kind:'album'}),null,true);
    this.title.textContent = `Collection · ${s.discovered.length}/${SPECIES_IDS.length}`;
    const evolvedSpecies = new Set([...(s.evolvedSpecies ?? []), ...s.rabbits.filter(isEvolved).map(rabbit => rabbit.species)]).size;
    this.content.append(node('p', `${evolvedSpecies} / ${EVOLVED_ART.length} évolutions`, 'badge collection-evolution-count'));
    const toolbar = node('div', '', 'menu-toolbar');
    this.button(toolbar, 'Carnet de reproduction', () => this.open({kind: 'recipes'}), null, true); this.content.append(toolbar);
    const controls = node('div', '', 'collection-filters');
    const select = (label: string, key: keyof CollectionFilter, choices: Record<string, string>) => {
      const field = node('label', label), input = node('select'); input.setAttribute('aria-label', label); input.dataset.focus = `collection-filter-${key}`;
      for (const [value, text] of Object.entries(choices)) { const option = node('option', text); option.value = value; input.append(option); }
      input.value = this.collectionFilter[key] ?? '';
      input.addEventListener('change', () => { this.collectionFilter = {...this.collectionFilter, [key]: input.value || undefined}; this.render(); });
      field.append(input); controls.append(field);
    };
    select('Type', 'type', {'': 'Tous les types', ...Object.fromEntries(Object.entries(TYPE_NAMES).filter(([type]) => SPECIES_IDS.some(id => SPECIES[id].types.includes(type as RabbitType))))});
    select('Rareté', 'rarity', {'': 'Toutes les raretés', ...RARITY_NAMES});
    select('Découverte', 'discovery', {'': 'Toutes', known: 'Découvertes', unknown: 'À découvrir'});
    this.content.append(controls);
    const entries = collectionView(s, this.collectionFilter), speciesIds = collectionSpeciesView(s, this.collectionFilter);
    toolbar.append(node('p', `${entries.length} espèce${entries.length > 1 ? 's' : ''} affichée${entries.length > 1 ? 's' : ''}`, 'small'));
    if (!entries.length) this.content.append(node('p', 'Aucune espèce ne correspond à ces filtres.'));
    if (Object.values(this.collectionFilter).some(Boolean)) this.button(this.content, 'Réinitialiser les filtres', () => { this.collectionFilter = {}; this.render(); }, null, true);
    for (const [index, entry] of entries.entries()) {
      const speciesId = entry.known ? entry.species : speciesIds[index]!;
      const info = entry.known ? SPECIES[entry.species] : null, card = this.card(entry.name, entry.known && info ? `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]} · Découverte` : 'Silhouette · à découvrir');
      card.querySelector('.card-heading')!.prepend(avatar(entry.known ? entry.species : undefined));
      const evolvedSpecies = speciesId;
      const evolvedArt = evolvedSpecies && EVOLVED_ART.find(art => art.id === evolvedSpecies);
      // An undiscovered species keeps its secret: no evolution shape before it is found.
      if (entry.known && evolvedSpecies && evolvedArt) {
        const revealed = evolutionRevealed(s, evolvedSpecies);
        const evolvedCell = node('div', '', `collection-evolution ${revealed ? 'is-unlocked' : 'is-locked'}`);
        evolvedCell.dataset.collectionEvolution = evolvedSpecies;
        // Owner, 4 November 2026: no shape nor name of the evolution before a rabbit of this species has evolved.
        if (revealed) {
          const art = evolvedRabbitArt(evolvedSpecies), image = document.createElement('img');
          image.src = art?.url ?? ''; image.alt = evolvedArt.name;
          evolvedCell.append(image, node('p', `Évolution · ${evolvedArt.name}`, 'small'));
        } else evolvedCell.append(node('span', '?', 'evolution-mystery'), node('p', 'Évolution · surprise à découvrir', 'small'));
        card.append(evolvedCell);
      }
      const hint = entry.known ? recipeHint(entry.species) : entry.hint; if (hint) card.append(node('p', hint, 'recipe-hint'));
      if (entry.known) this.button(card, 'Consulter l’espèce', () => this.open({kind: 'species', species: entry.species}), null, true);
      else card.append(node('p', 'À découvrir', 'small'));
      this.content.append(card);
    }
  }
  private renderRecipeShop(s: GameState): void {
    this.title.textContent = 'Recettes de lapins';
    const intro = node('section', '', 'recipe-shop-intro');
    intro.append(node('p', 'Une recette révèle les parents et leurs conditions. Le lapin reste à obtenir au nid.'));
    this.button(intro, 'Ouvrir mon carnet', () => this.open({kind: 'recipes'}), null, true);
    this.content.append(intro);
    // Catalogue order stays stable after a purchase; the shop never builds or inspects parent pairs.
    for (const species of SPECIES_IDS.filter(id => recipePrice(id) !== null)) {
      const info = SPECIES[species], known = recipeKnown(s, species), price = recipePrice(species)!;
      const access = stateLevelAccess(s, {family: 'species', id: species, action: 'breedingResult'});
      const card = this.card(info.name, `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`);
      card.classList.add('compact-list-card', 'recipe-shop-card');
      card.dataset.recipe = species; card.dataset.recipeKnown = String(known);
      card.dataset.recipeState = known ? 'known' : access.locked ? 'locked' : 'available';
      card.querySelector('.card-heading')!.prepend(avatar(s.discovered.includes(species) ? species : undefined));
      if (known) {
        card.append(node('p', 'Dans ton carnet', 'badge'));
        const consult = this.button(card, 'Consulter et préparer', () => this.openRecipe(species), null, true);
        consult.dataset.consultRecipe = species; consult.dataset.focus = `recipe-action-${species}`;
      } else if (access.locked) {
        card.append(node('p', `Niveau ${access.requiredLevel} requis`, 'reason'), node('p', `Prix : ${price} pattes`, 'small'));
      } else {
        card.append(node('p', 'À découvrir', 'badge'));
        this.recipePurchase(card, s, species, price);
      }
      this.content.append(card);
    }
  }
  private renderRecipes(s: GameState): void {
    this.title.textContent = 'Carnet de reproduction';
    this.content.append(node('p', 'Les types nécessaires doivent être réunis par deux individus distincts. Une recette possible reste un tirage aléatoire.'));
    if (!this.history.length) this.button(this.content, 'Retour à la collection', () => this.open({kind: 'collection'}), null, true);
    const nest = s.buildings.find(b => b.kind === 'nest'), nursery = s.buildings.find(b => b.kind === 'nursery');
    const setupReason = !nest || !nursery ? 'Place les équipements offerts depuis Aménagement.' : nest.breeding ? 'Le nid est occupé.' : null;
    if (setupReason) this.content.append(node('p', setupReason, 'reason'));
    for (const recipe of recipeBook(s, this.now())) {
      const info = SPECIES[recipe.species];
      const card = this.card(info.name, `${typeNames(recipe.types)} · ${RARITY_NAMES[info.rarity]}`);
      const hint = recipeHint(recipe.species); if (hint) card.append(node('p', hint, 'recipe-hint'));
      card.dataset.recipe = recipe.species; card.dataset.recipeKnown = String(recipe.known);
      const heading = card.querySelector<HTMLElement>('h3')!;
      heading.tabIndex = -1; heading.dataset.focus = `recipe-title-${recipe.species}`;
      card.querySelector('.card-heading')!.prepend(avatar(recipe.discovered ? recipe.species : undefined));
      if(recipe.levelAccess.locked)card.append(node('p',`Niveau ${recipe.levelAccess.requiredLevel} requis · exclu des nouvelles reproductions.`,'reason'));
      if (!recipe.known) {
        const price = recipe.price, priced = price === null ? '' : ` · ${price} pattes`;
        // A locked level is stated once, by the reason line above.
        card.append(node('p', recipe.levelAccess.locked ? `Recette inconnue${priced}` : `Recette inconnue · niveau ${recipe.levelAccess.requiredLevel} atteint${priced}`));
        if (price !== null && recipe.levelAccess.accessible) this.recipePurchase(card, s, recipe.species, price);
        this.content.append(card); continue;
      }
      card.append(node('p', `Affection ${recipe.minAffection} minimum pour chacun des deux parents. Croissance : ${growthDuration(recipe.species) / 60_000} min.`));
      if (info.recipe?.parents) card.append(node('p', `Parents requis : ${info.recipe.parents.map(id => SPECIES[id].name).join(' × ')}. Les types seuls ne suffisent pas.`));
      if (info.recipe?.parentRarity) card.append(node('p', `Parents requis : deux lapins de rareté ${RARITY_NAMES[info.recipe.parentRarity]}, de n’importe quelle espèce. ${info.name} est unique : une seule par partie.`));
      if (!recipe.pairCount) card.append(node('p', info.recipe?.parents ? 'Possède les deux espèces requises pour préparer cette paire.' : info.recipe?.parentRarity ? `Possède deux lapins de rareté ${RARITY_NAMES[info.recipe.parentRarity]} pour préparer cette paire.` : 'Aucune paire possédée n’est admissible à cette recette.', 'small'));
      else {
        const details = node('details'); details.open = this.recipeDetails.has(recipe.species) || (!this.recipeClosed.has(recipe.species) && recipe.pairCount <= 3);
        details.append(node('summary', `${recipe.pairCount} paire${recipe.pairCount > 1 ? 's' : ''} possédée${recipe.pairCount > 1 ? 's' : ''} compatible${recipe.pairCount > 1 ? 's' : ''} avec la recette`));
        let populated = false;
        const populate = (all = false) => {
          if (populated && !all) return;
          populated = true;
          details.querySelectorAll('.recipe-pair, [data-more-pairs]').forEach(el => el.remove());
          const pairs = recipePairs(s, recipe.species, this.now(), all ? Infinity : 3);
          for (const pair of pairs) {
            const names = pair.parents.map(id => {
              const r = s.rabbits.find(r => r.id === id)!;
              return `${r.name || SPECIES[r.species].name}${r.name ? ' · ' + SPECIES[r.species].name : ''} (${this.enclosureName(s, r.enclosureId)}, affection ${r.affection})`;
            });
            const block = node('div', '', 'recipe-pair'); block.append(node('p', names.join(' × ')));
            if (pair.feeding.length) {
              block.append(node('p', `À nourrir : affection ${recipe.minAffection} nécessaire chez les deux parents. Recette exclue actuellement.`, 'reason'));
              for (const id of pair.feeding) {
                const parent = s.rabbits.find(r => r.id === id)!;
                this.button(block, `Nourrir ${parent.name || SPECIES[parent.species].name} · ${this.enclosureName(s, parent.enclosureId)}`, () => this.open({kind: 'rabbit', id}), null, true);
              }
            } else {
              // Owner, 7 November 2026: no odds shown to the player; only what blocks the pair.
              const label = pair.blocked ? 'Aucun résultat ordinaire accessible à ce niveau' : recipe.levelAccess.locked ? `Niveau ${recipe.levelAccess.requiredLevel} requis` : null;
              if (label) block.append(node('p', label, 'badge'));
              if (pair.busy) block.append(node('p', 'Un parent est occupé ; attends sa disponibilité.', 'reason'));
            }
            this.button(block, 'Préparer cette paire au nid', () => {
              if (!nest) return;
              this.parents = [...pair.parents]; this.open({kind: 'building', id: nest.id}); if (!nest.breeding) this.openBreeding(nest.id);
            }, pair.feeding.length ? 'Nourris les parents requis.' : pair.busy ? 'Parent occupé.' : setupReason ?? (!pair.possible ? 'Cette recette n’est pas dans le tirage actuel.' : null), true);
            details.append(block);
          }
          if (!all && recipe.pairCount > pairs.length) this.button(details, 'Voir plus', () => { this.recipeExpanded.add(recipe.species); populate(true); }, null, true).dataset.morePairs = '';
        };
        details.addEventListener('toggle', () => { if (details.isConnected) {
          if (details.open) { this.recipeClosed.delete(recipe.species); this.recipeDetails.add(recipe.species); populate(this.recipeExpanded.has(recipe.species)); }
          else { this.recipeDetails.delete(recipe.species); this.recipeClosed.add(recipe.species); }
        } });
        if (details.open) populate(this.recipeExpanded.has(recipe.species));
        card.append(details);
      }
      this.content.append(card);
    }
  }
  /** Same confirmation model as the other direct card purchases; coins only, never a heart complement. */
  private recipePurchase(card: HTMLElement, s: GameState, species: SpeciesId, price: number): void {
    const name = SPECIES[species].name, focus = `recipe-action-${species}`;
    const buy = this.button(card, `Acheter la recette · ${price} pattes`, () => this.confirm(`Acheter la recette : ${name} ?`,
      `${price} pattes. Révèle les conditions d’obtention et les paires conseillées. Ne donne aucun lapin et ne garantit aucune naissance.`,
      () => this.execute({type: 'buyRecipe', species}, 'Recette ajoutée au carnet.', () => this.recipeDetails.add(species)), focus), moneyReason(s, price));
    buy.dataset.buyRecipe = species; buy.dataset.focus = focus;
  }
  private renderSpecies(s: GameState, species: SpeciesId): void {
    if (!s.discovered.includes(species)) { this.view = {kind: 'collection'}; this.renderCollection(s); return; }
    const info = SPECIES[species]; this.title.textContent = info.name;
    const legendary = decorateLegendaryCard(this.panel, species);
    this.content.append(legendary ? legendaryPortrait(avatar(species, true), species) : avatar(species, true), node('p', `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`),
      node('p', `${s.rabbits.filter(r => r.species === species).length} lapin${s.rabbits.filter(r => r.species === species).length > 1 ? 's' : ''} dans la prairie.`), node('p', info.price === null ? 'Obtention : reproduction.' : 'Obtention : boutique ou reproduction.'), node('p', `Croissance : ${growthDuration(species) / 60_000} minutes.`));
    if (info.recipe) this.button(this.content, 'Consulter la recette', () => this.openRecipe(species), null, true);
    if (isLegendaryShow(species) || species === BENNY) this.button(this.content, 'Revoir l’apparition', () => this.legendaryReveal(species, info.name, 'Fermer'), null, true).dataset.replayReveal = species;
    if (!this.history.length) this.button(this.content, 'Retour à la collection', () => this.open({kind: 'collection'}), null, true);
  }
  private renderExtension(s: GameState): void {
    this.title.textContent='Agrandir l’île';
    if(s.acquiredParcels.length===PARCEL_IDS.length){this.content.append(node('p',`Île entièrement agrandie · ${ISLAND.maxArea} cases.`));return;}
    const rank=s.acquiredParcels.length,access=stateLevelAccess(s,{family:'extension',rank});
    const cost=extensionPrice(s),selected=this.view?.kind==='extension'?this.view.parcelId:undefined;
    this.content.append(node('p',s.islandStart?'Ton île s’agrandit toujours dans le même ordre : la prochaine parcelle est indiquée au bord de l’île et dans la liste. Chaque achat ajoute seize cases sans déplacer tes objets.':'Choisis librement une parcelle au bord de l’île ou dans la liste. Chaque achat ajoute seize cases sans déplacer tes objets.'));
    this.content.append(node('p',`Prochaine extension : ${rank} · ${cost} pattes`));
    if(access.locked)this.content.append(node('p',`Niveau ${access.requiredLevel} requis · niveau du joueur actuel : ${access.currentLevel}`,'reason'));
    const purchasable=purchasableParcels(s);
    for(const id of purchasable)this.button(this.content,`Voir ${PARCELS[id].name}`,()=>this.open({kind:'extension',parcelId:id}),null,true);
    if(!selected||!purchasable.includes(selected))return;
    const command:PattesCommand={type:'expand',parcelId:selected,expectedCost:cost},description=`${PARCELS[selected].name} · + ${ISLAND.parcelArea} cases · ${cost} pattes.`;
    const card=node('section','','card');this.content.append(card);card.append(node('p',description,'parcel-preview'));
    const purchase=this.button(card,`Acheter ${PARCELS[selected].name} · ${cost} pattes`,()=>this.confirm(`Acheter la parcelle ${PARCELS[selected].name} ?`,description,()=>this.execute(command,'Parcelle acquise.',()=>this.open({kind:'extension'}))),moneyReason(s,cost));
    mountLevelLock(card,purchase).update(access);
    if(access.accessible)this.complement(card,s,command,`Acheter ${PARCELS[selected].name}`,'Parcelle acquise.',()=>this.open({kind:'extension'}));
    this.button(this.content,'Annuler l’agrandissement',()=>this.close(),null,true);
  }
  private renderMissions(s: GameState, tab: 'main' | 'daily'): void {
    this.title.textContent = 'Missions';
    const tabs = node('div', '', 'tabs');
    for (const [key, label] of [['main', 'Principales'], ['daily', 'Quotidiennes']] as const) {
      const b = this.button(tabs, label, () => this.open({kind: 'missions', tab: key}, 'tab'), null, tab !== key);
      b.setAttribute('aria-pressed', String(tab === key));
    }
    if (tab === 'main' && s.missions.claimed.includes('first-birth')) this.button(tabs, 'Consulter le carnet', () => this.open({kind: 'recipes'}), null, true);
    tabs.classList.add('mission-tabs');
    this.content.append(tabs);
    const claim = (card: HTMLElement, command: Command, reward: Reward, ready: boolean, claimed: boolean, extraRewards: readonly Reward[] = []) => {
      const stage = claimed ? 'Réclamée' : ready ? 'À réclamer' : 'En cours';
      const xp = command.type === 'claimMainMission' ? missionClaimXp('main',command.id) : command.type === 'claimDailyMission' ? missionClaimXp('daily',command.id) : PROGRESSION.xp.claims.dailyBonus;
      const resources = [reward, ...extraRewards].filter(r => r.resource !== 'none' && r.amount > 0);
      const resourceText = resources.map(rewardLabel).join(' · + ');
      const xpOnly = command.type === 'claimMainMission' && MAIN_MISSIONS[command.id].claimXp !== undefined && !resources.length && xp > 0;
      const message = resources.length ? `Récompense reçue · + ${resourceText}${xp > 0 ? ` · + ${xp} XP` : ''}` : xpOnly ? `Récompense reçue · + ${xp} XP` : 'Objectif validé.';
      card.append(node('p', (resources.length ? `Gratuit · Récompense : + ${resourceText}` : xp > 0 ? 'Récompense :' : 'Objectif de collection · sans récompense supplémentaire') + (xp > 0 ? ` ${resources.length ? '· ' : ''}${xp} XP` : ''), 'small'), node('p', stage, 'badge'));
      const generation = this.confirmationGeneration;
      const button = this.button(card, claimed ? 'Récompense réclamée' : xpOnly ? `Réclamer · ${xp} XP` : resources.length ? `Réclamer · + ${resourceText}` : 'Valider l’objectif', () => {
        if (!button.isConnected || generation !== this.confirmationGeneration) return;
        this.execute(command, message, () => {
          if (command.type === 'claimMainMission' && !mainCatalogueUnlocked(this.snapshot.state!) && (initialMissionIds(this.snapshot.state!) as readonly string[]).includes(command.id)) this.content.scrollTop = 0;
          void this.toast.offsetWidth; this.toast.classList.add('mission-reward');
        });
      }, claimed ? 'Déjà réclamée.' : !ready ? 'Objectif à compléter.' : null);
      button.classList.add('mission-claim');
      button.dataset.focus = `mission-claim-${'id' in command ? command.id : 'daily-bonus'}`;
    };
    const progress = (card: HTMLElement, value: number, target: number) => {
      const bar = node('progress'); bar.max = target; bar.value = Math.min(value, target); bar.setAttribute('aria-label', `Progression : ${value} sur ${target}`);
      card.append(node('p', `Progression : ${value} / ${target}`), bar);
    };
    const shortcut = (card: HTMLElement, kind: BuildingKind | 'collection' | 'affection' | 'extension' | 'arrange' | 'jumpIsland' | 'pet') => {
      if (kind === 'jumpIsland') { this.button(card, 'Aller sur ta petite île', () => this.open({kind: 'jumpIsland'}), null, true); return; }
      if (kind === 'pet') {
        // The first rabbit not caressed yet in this cycle: its sheet opens on the portrait to rub.
        const petted = s.missions.daily.petted ?? [], rabbit = s.rabbits.find(r => !petted.includes(r.id)) ?? s.rabbits[0];
        if (rabbit) this.button(card, 'Caresser un lapin', () => this.open({kind: 'rabbit', id: rabbit.id}), null, true);
        return;
      }
      if(kind==='extension' && s.acquiredParcels.length<PARCEL_IDS.length){const access=stateLevelAccess(s,{family:'extension',rank:s.acquiredParcels.length});if(access.locked)card.append(node('p',`Extension ${s.acquiredParcels.length} · Niveau ${access.requiredLevel} requis`,'reason'));}
      this.button(card, kind === 'collection' ? 'Voir la collection' : kind === 'affection' ? 'Voir un lapin' : kind === 'extension' ? 'Voir l’extension' : kind === 'arrange' ? 'Aménager la prairie' : 'Voir le bâtiment ou la boutique', () => {
        if (kind === 'arrange') this.open({kind:'arrange'});
        else if (kind === 'extension') { this.open({kind:'shop',tab:'home'}, 'root'); this.open({kind:'extension'}); }
        else if (kind === 'collection') this.open({kind});
        else if (kind === 'affection') {
          const rabbit = [...s.rabbits].filter(r => r.affection < BALANCE.maxAffection).sort((a, b) => b.affection - a.affection)[0] ?? s.rabbits[0];
          if (rabbit) this.open({kind: 'rabbit', id: rabbit.id});
        } else {
          const b = s.buildings.find(b => b.kind === kind);
          this.open(b ? {kind: 'building', id: b.id} : {kind: 'shop', tab: kind === 'enclosure' ? 'habitats' : 'buildings'});
        }
      }, null, true);
    };
    if (tab === 'main') {
      const unlocked = mainCatalogueUnlocked(s);
      this.content.append(node('p', unlocked ? 'Tes récompenses et objectifs en progression passent en premier.' : s.missions.claimed.includes('first-birth') ? 'Choisis librement tes objectifs. Toutes les missions seront visibles au niveau 7.' : 'Réclame pour continuer. Les actions anticipées comptent.', 'small mission-intro'));
      const catalogue = !unlocked && this.onboardingActive && onboardingTask(s,this.preferences.value,this.now()).step.id === 'snowReward' ? ['welcome-snow'] as const : visibleMainMissions(s);
      const status = (id: typeof catalogue[number]) => s.missions.claimed.includes(id) ? 'claimed' : s.missions.completed.includes(id) ? 'ready' : 'pending';
      if (unlocked) {
        const filters = node('div', '', 'mission-filters'); filters.setAttribute('aria-label', 'Filtrer les missions principales');
        for (const [filter, label] of [['all', 'Toutes'], ['ready', 'À réclamer'], ['pending', 'En cours'], ['claimed', 'Terminées']] as const) {
          const count = filter === 'all' ? catalogue.length : catalogue.filter(id => status(id) === filter).length;
          const b = this.button(filters, `${label} (${count})`, () => { this.missionFilter = filter; this.render(); }, null, filter !== this.missionFilter);
          b.dataset.missionFilter = filter; b.dataset.focus = `mission-filter-${filter}`; b.setAttribute('aria-pressed', String(filter === this.missionFilter));
        }
        this.content.append(filters);
      }
      const active = [...(unlocked && this.missionFilter !== 'all' ? catalogue.filter(id => status(id) === this.missionFilter) : catalogue)];
      if (unlocked) {
        const rank = (id: typeof catalogue[number]) => status(id) === 'ready' ? 0 : status(id) === 'claimed' ? 3 : mainProgress(s, id).value > 0 ? 1 : 2;
        active.sort((a, b) => rank(a) - rank(b));
      }
      if (!active.length) this.content.append(node('p', unlocked ? 'Aucune mission dans cette sélection.' : 'Toutes les missions principales ont été récompensées. Profite de ta prairie.', 'small'));
      for (const id of active) {
        const mission = MAIN_MISSIONS[id], acquired = s.missions.completed.includes(id), claimed = s.missions.claimed.includes(id);
        const p = mainProgress(s, id), card = this.card(mission.title, mission.description); card.dataset.mission = id;
        card.dataset.missionStatus = status(id);
        card.classList.add('compact-list-card');
        if (unlocked && !acquired && !claimed && mainProgress(s, id).value > 0) card.classList.add('mission-progressing');
        progress(card, acquired ? p.target : Math.min(p.value, p.target), p.target);
        if (acquired) card.append(node('p', 'Condition acquise', 'small'));
        claim(card, {type: 'claimMainMission', id}, mission.reward, acquired, claimed, mission.extraRewards);
        if (!acquired) {
          const c = mission.condition;
          if (id === 'snow-habitat') this.button(card,'Voir les habitats Neige',()=>{this.shopHabitatSpecies='neige';this.open({kind:'shop',tab:'habitats'});},null,true);
          else if (id === 'welcome-snow') this.button(card,'Voir Neige',()=>this.open({kind:'shop',tab:'rabbits'}),null,true);
          else if (c.kind === 'event' && c.event === 'placeDecoration') this.button(card, 'Voir les décorations', () => this.open({kind:'shop',tab:'decorations'}), null, true);
          else if (c.kind === 'parents') {
            const parent = s.rabbits.find(r => r.affection < 2);
            this.button(card, parent ? 'Voir le parent à nourrir' : 'Voir les lapins', () => this.open(parent ? {kind:'rabbit',id:parent.id} : {kind:'shop',tab:'rabbits'}), null, true);
          }
          else if (c.kind === 'level') card.append(node('p', 'Prends soin de tes lapins et explore la prairie.'));
          else if (c.kind === 'nightOrder') shortcut(card, 'farm');
          else if (c.kind === 'jumpRopeGame') this.button(card, 'Aller sur ta petite île', () => this.open({kind: 'jumpIsland'}), null, true);
          else if (c.kind === 'habitatLevel') shortcut(card, 'enclosure');
          else if (c.kind === 'extensions') shortcut(card, 'extension');
          else if (c.kind === 'ordinaryRares') shortcut(card, 'collection');
          else if (c.kind === 'decoration') this.button(card, 'Voir les décorations', () => this.open({kind: 'shop', tab: 'decorations'}), null, true);
          else if (c.kind === 'buildingLevel') shortcut(card, c.building);
          else if (c.kind === 'paidRecipe') this.button(card, 'Voir les recettes de la boutique', () => this.open({kind: 'shop', tab: 'recipes'}), null, true);
          else if (c.kind === 'evolutions') shortcut(card, 'collection');
          else shortcut(card, c.kind === 'building' ? c.building : c.kind === 'event' ? c.event === 'collectOrder' ? 'farm' : c.event === 'breed' ? 'nest' : 'nursery' : c.kind === 'discoveries' || c.kind === 'rare' || c.kind === 'species' ? 'collection' : c.kind);
        }
        this.content.append(card);
      }
    } else {
      const daily = s.missions.daily, cycleStart = dailyCycleStart(s), shown = dailyMissionsOf(s), done = shown.filter(id => daily.claimed.includes(id)).length;
      // Three missions, all open from the start, to do in any order. The cycle bonus follows the three claims.
      const intro = node('section', '', 'mission-day-intro');
      intro.append(node('p', 'Trois missions aujourd’hui, dans l’ordre que tu veux.', 'mission-day-lead'), node('p', 'Renouvellement dans :', 'small'));
      const timer = node('p', '', 'timer'); timer.dataset.end = String(dailyCycleEnd(s)); intro.append(timer);
      intro.append(node('p', 'À réclamer avant le renouvellement.', 'small'));
      this.content.append(intro);
      for (const id of shown) {
        const mission = DAILY_MISSIONS[id], value = dailyProgress(s, id), claimed = daily.claimed.includes(id), ready = dailyClaimable(s, id);
        const card = this.card(mission.title, mission.description); card.dataset.mission = id; card.dataset.missionStatus = claimed ? 'claimed' : ready ? 'ready' : 'pending';
        card.classList.add('mission-day-card');
        progress(card, Math.min(value, mission.target), mission.target);
        claim(card, {type: 'claimDailyMission', id, cycleStart}, mission.reward, ready, claimed);
        if (!claimed && !ready) shortcut(card, mission.place);
        this.content.append(card);
      }
      const bonus = this.card('Bonus du cycle', 'Réclame les trois missions pour recevoir ce bonus.'); bonus.dataset.mission = 'daily-bonus'; bonus.classList.add('mission-day-card', 'mission-bonus');
      progress(bonus, done, DAILY_PICK_COUNT);
      claim(bonus, {type: 'claimDailyBonus', cycleStart}, DAILY_BONUS[0], dailyBonusReady(s), daily.bonusClaimed, DAILY_BONUS.slice(1));
      this.content.append(bonus);
      // Christmas: the challenges and their sucres d'orge are at the market (they count in the Missions badge).
      if (christmasActive()) {
        const waiting = availableChristmasRewards(s), noel = this.card('Défis de Noël', waiting ? `${waiting} récompense${waiting > 1 ? 's' : ''} de Noël à réclamer au marché.` : 'Trois défis de Noël chaque jour, au Marché de Noël.');
        noel.dataset.mission = 'christmas'; noel.classList.add('mission-day-card');
        this.button(noel, 'Aller au Marché de Noël', () => this.open({kind: 'christmasMarket'}), null, true); this.content.append(noel);
      }

    }
  }
  private renderHearts(s: GameState): void {
    this.title.textContent = 'Les cœurs';
    const giftInfo = heartGift(s, this.now());
    this.content.append(node('p', `${s.hearts} cœurs disponibles`, 'badge'),
      node('p', 'Termine un délai ou complète un paiement insuffisant. Chaque dépense demande ta confirmation. Les cœurs ne remplacent pas la nourriture.'),
      node('p', 'Tu peux développer ta prairie sans cœurs. Aucun achat réel ni publicité.'),
      node('h3', 'Ton cadeau gratuit'),
      node('p', 'Trois cœurs toutes les 24 heures, jusqu’à trois cadeaux en réserve.'),
      node('p', giftInfo.text, 'heart-gift-count'));
    const gift = this.button(this.content, giftInfo.gifts ? `Réclamer · ${giftInfo.text}` : 'Réclamer', () => this.execute({type: 'claimHearts'}, value => `+ ${value} cœurs gratuits`));
    gift.disabled = !giftInfo.gifts;
    gift.className = 'heart-gift'; gift.dataset.giftAt = String(s.nextHeartGiftAt);
    if (!giftInfo.gifts) {
      this.content.append(node('p', 'Prochain cadeau dans :'));
      const wait = node('p', '', 'timer'); wait.dataset.end = String(s.nextHeartGiftAt); this.content.append(wait);
      wait.id = `action-reason-${++this.reasonId}`; gift.setAttribute('aria-describedby', wait.id);
    }
  }
  private complement(host: HTMLElement, s: GameState, action: PattesCommand, title: string, success: string, after?: (value?: string | number) => void): void {
    const quote = quoteComplement(s, action, this.now()); if (!quote.ok) return;
    const placement = this.placement, species = this.view?.kind === 'buyRabbit' ? this.view.species : null;
    this.button(host, `Compléter · ${quote.pattes} pattes + ${heartAmount(quote.hearts)}`, () => {
      if (action.type === 'buyBuilding' && (this.placement !== placement || placement?.cell?.x !== action.x || placement?.cell?.y !== action.y)) return;
      if (action.type === 'buyRabbit' && (this.view?.kind !== 'buyRabbit' || this.view.species !== species || this.rabbitDestination !== action.enclosureId)) return;
      this.controller.refresh(); const current = this.controller.getSnapshot().state; if (!current) return;
      const fresh = quoteComplement(current, action, this.now());
      if (!fresh.ok) { this.notice(REFUSALS[fresh.reason]); return; }
      if (current.hearts < fresh.hearts) { this.notice(REFUSALS.NOT_ENOUGH_HEARTS); return; }
      this.confirm(title, `Paiement : ${fresh.pattes} pattes + ${heartAmount(fresh.hearts)} pour couvrir ${fresh.missing} pattes manquantes, sans monnaie supplémentaire. Solde disponible : ${current.pattes} pattes et ${current.hearts} cœurs.`,
        () => this.execute({type: 'payWithHearts', action, maxHearts: fresh.hearts, maxPattes: fresh.pattes}, success, after));
    }, s.hearts < quote.hearts ? REFUSALS.NOT_ENOUGH_HEARTS : null, true).classList.add('heart-spend');
  }
  /** `birthId` names the nursery baby for growth: every quote and command targets that baby only. */
  private acceleration(s: GameState, id: string, stage: TimedStage, birthId?: string): void {
    const target = birthId === undefined ? {} : {birthId};
    const quote = quoteAcceleration(s, id, stage, this.now(), birthId);
    // Growth refuses CAPACITY_FULL when no habitat could welcome this lapereau now (type and free place).
    const noHome = 'Aucun habitat compatible n’a de place libre : accélération indisponible, aucun cœur dépensé. Le lapereau continue de grandir ; prépare une place pour l’accueillir.';
    if (!quote.ok) {
      if (quote.reason === 'CAPACITY_FULL') this.content.append(node('p', noHome, 'reason'));
      return;
    }
    if (this.preferences.value.tutorial && !this.preferences.value.tutorialDone && initiationAvailable(s,id,stage,quote.jobKey)) {
      const aid=node('div', '', 'initiation-aid'); aid.dataset.aidEnd=String(quote.endsAt);
      this.content.append(aid);
      this.button(aid, 'Terminer gratuitement — découverte du jeu', () => this.execute({type:'initiationAid',id,stage,jobKey:quote.jobKey,...target}, 'Délai terminé gratuitement. La prochaine action reste manuelle.'));
      aid.append(node('p', 'Aide facultative, une seule fois pour ce travail. Tu peux toujours attendre.'));
    }
    this.content.append(node('p', 'Les cœurs permettent aussi de terminer certains délais. Tu peux toujours attendre.'));
    const host = node('div', '', 'paid-acceleration'); host.dataset.accelerateEnd = String(quote.endsAt); this.content.append(host);
    this.button(host, `Terminer · ${heartAmount(quote.hearts)}`, () => {
      this.controller.refresh(); const current = this.controller.getSnapshot().state; if (!current) return;
      const fresh = quoteAcceleration(current, id, stage, this.now(), birthId);
      if (!fresh.ok) { this.notice(fresh.reason === 'CAPACITY_FULL' ? noHome : REFUSALS[fresh.reason]); this.render(); return; }
      if (fresh.jobKey !== quote.jobKey) { this.notice(REFUSALS.STALE_ACTION); return; }
      if (current.hearts < fresh.hearts) { this.notice(REFUSALS.NOT_ENOUGH_HEARTS); return; }
      const names = {order: 'cette production', breeding: 'cette reproduction', growth: 'cette croissance'};
      const effect = stage === 'order' ? 'La récolte reste manuelle.' : stage === 'growth' ? 'L’accueil reste manuel.' :
        automaticNurseryTransfer(current) ? 'Le délai se termine seulement. Le lapereau rejoindra seul la nurserie dès qu’un couchage sera libre.' : 'Le délai se termine seulement. Le transfert dans la nurserie restera manuel, dès qu’elle sera libre.';
      this.confirm(`Terminer ${names[stage]} ?`, `${heartAmount(fresh.hearts)} maximum · solde : ${current.hearts} cœurs. Le prix sera recalculé à la confirmation et pourra diminuer, jamais augmenter. ${effect}`,
        () => this.execute({type: 'accelerate', id, stage, jobKey: fresh.jobKey, maxHearts: fresh.hearts, ...target}, value => `Étape terminée · ${heartAmount(Number(value))} dépensé${Number(value) > 1 ? 's' : ''}.`));
    }, s.hearts < quote.hearts ? REFUSALS.NOT_ENOUGH_HEARTS : null, true).classList.add('heart-spend');
  }
  private timer(start: number, end: number): void {
    const progress = node('progress'); progress.max = 1; progress.dataset.start = String(start); progress.dataset.end = String(end);
    const label = node('p', '', 'timer'); label.dataset.end = String(end); this.content.append(progress, label);
  }
  private updateTimers(): void {
    const state = this.snapshot.state;
    const heartsButton = document.getElementById('open-hearts')!;
    const hasGift = !!state && heartGift(state, this.now()).gifts > 0;
    heartsButton.classList.toggle('has-heart-gift', hasGift);
    heartsButton.setAttribute('aria-label', hasGift ? 'Cœurs · cadeau disponible' : 'Cœurs');
    const due = (end: number) => !!state && state.lastSimulatedAt < end && end <= this.now();
    if (state && (cycleIndexAt(state.missions.daily.referenceAt, this.now()) > state.missions.daily.cycleIndex ||
      due(state.nextHeartGiftAt) || (state.travel?.trips.some(t => due(t.endsAt)) ?? false) || state.rabbits.some(r => !!r.lookChange && due(r.lookChange.endsAt)) || state.buildings.some(b =>
        !!b.order && due(b.order.endsAt) || !!b.breeding && due(b.breeding.endsAt) || b.nursery?.babies.some(baby => due(baby.readyAt))))) {
      this.controller.refresh(); return;
    }
    for (const aid of this.content.querySelectorAll<HTMLElement>('[data-aid-end]')) aid.hidden=Number(aid.dataset.aidEnd)<=this.now();
    for (const gift of this.content.querySelectorAll<HTMLButtonElement>('[data-gift-at]')) {
      if (!state) continue;
      const info = heartGift(state, this.now());
      gift.disabled = !info.gifts;
      gift.textContent = info.gifts ? `Réclamer · ${info.text}` : 'Réclamer';
      const count = this.content.querySelector('.heart-gift-count');
      if (count) count.textContent = info.text;
    }
    for (const host of this.content.querySelectorAll<HTMLElement>('[data-accelerate-end]')) {
      const remaining = Number(host.dataset.accelerateEnd) - this.now(); host.hidden = remaining <= 0;
      const button = host.querySelector('button')!;
      button.textContent = `Terminer · ${heartAmount(accelerationCost(remaining))}`;
      button.disabled = (this.snapshot.state?.hearts ?? 0) < accelerationCost(remaining);
      const reason = host.querySelector<HTMLElement>('.reason'); if (reason) reason.hidden = !button.disabled;
    }
    for (const label of this.content.querySelectorAll<HTMLElement>('.timer')) label.textContent = timeLeft(Number(label.dataset.end), this.now());
    for (const progress of this.content.querySelectorAll<HTMLProgressElement>('progress[data-start][data-end]')) progress.value = this.now() >= Number(progress.dataset.end) ? 1 : Math.max(0, Math.min(1, (this.now() - Number(progress.dataset.start)) / Math.max(1, Number(progress.dataset.end) - Number(progress.dataset.start))));
  }
  private confirm(title: string, message: string, action: () => void, returnFocus?: string): void {
    if (this.dialog.open) return;
    const generation = ++this.confirmationGeneration; let used = false;
    const restore = () => { if (returnFocus) { this.requestedFocus = returnFocus; this.render(); } };
    const cleanup = () => { this.dialog.removeEventListener('cancel', cancel); this.dialog.removeEventListener('close', cleanup); };
    const cancel = (event?: Event) => {
      if (used || generation !== this.confirmationGeneration) return;
      event?.preventDefault(); used = true; cleanup(); this.dialog.close(); restore();
    };
    this.dialog.replaceChildren(node('h2', title), node('p', message));
    this.button(this.dialog, 'Confirmer', () => {
      if (used || !this.dialog.open || generation !== this.confirmationGeneration) return;
      used = true; cleanup(); this.dialog.close();
      if (returnFocus) this.requestedFocus = returnFocus;
      action(); restore();
    }); this.button(this.dialog, 'Annuler', () => cancel(), null, true);
    this.dialog.addEventListener('cancel', cancel); this.dialog.addEventListener('close', cleanup, {once: true});
    this.dialog.showModal();
  }
  private firstBirth(species: SpeciesId, discovered: boolean): void {
    if (this.pailleDialogue.element.open) return;
    const info=SPECIES[species], art=avatar(species,true); art.classList.add('first-birth-art');
    this.dialog.replaceChildren(node('h2', 'Bienvenue, petit lapin !','first-birth-title'), art, node('h3',info.name,'first-birth-name'));
    if(discovered) this.dialog.append(node('p','Nouvelle espèce', 'badge first-birth-details'));
    this.dialog.append(node('p', `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`,'first-birth-details'));
    this.button(this.dialog,'Bienvenue dans la prairie',()=>this.dialog.close());
    this.dialog.showModal();
  }
  private discovery(species: SpeciesId): void {
    if (this.onboardingActive || this.pailleDialogue.element.open) return;
    if (isLegendaryShow(species) || species === BENNY) { this.legendaryReveal(species, 'Nouvelle découverte !', 'Bienvenue dans la prairie'); return; }
    const info = SPECIES[species]; this.dialog.replaceChildren(node('h2', 'Nouvelle découverte !'), avatar(species, true), node('h3', info.name), node('p', `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`));
    this.button(this.dialog, 'Bienvenue dans la prairie', () => this.dialog.close()); this.dialog.showModal();
  }
  /** The legendaries and Benny (Mythic): their full-screen first appearance, replayed from the Collection on request. */
  private legendaryReveal(species: SpeciesId, title: string, button: string): void {
    const info = SPECIES[species], text = {title, name: info.name, details: `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`, button};
    if (isLegendaryShow(species)) showLegendaryReveal(species, text); else showBennyReveal(text);
  }
  private guide(step: GuideStep): void {
    const s = this.snapshot.state; if (!s) return;
    if(this.onboardingActive && step.id === 'transfer' && !onboardingTask(s,this.preferences.value,this.now()).waiting) {
      // « Rejoindre la nurserie » does what it says: the same transfer as the heart bubble, then the camera follows the baby.
      const nest=s.buildings.find(b=>b.kind==='nest');
      this.view=null;this.history=[];this.render();if(nest)this.sendBirth(nest.id);return;
    }
    if (step.id === 'welcomeBirth') {
      // « Accueillir » opens the ready baby's own reception card, as a touch on its cushion would.
      const baby = firstNurseryBaby(nurseryBuilding(s));
      if (baby && baby.readyAt <= this.now()) { this.view = null; this.history = []; this.render(); if (this.openReception(baby.birth.id)) return; }
    }
    if (step.target === 'camera') { this.scene.recenter(); this.preferences.set({intro: true, guideCamera: true}); this.renderTutorial(); return; }
    if (step.target === 'snowShop') { this.shopHabitatSpecies='neige'; this.open({kind:'shop',tab:'habitats'}); return; }
    if (step.target === 'rabbitShop') { this.open({kind:'shop',tab:'rabbits'}); return; }
    if (step.target === 'reward') { this.open({kind:'missions',tab:'main'}); return; }
    if (step.target === 'collection') { this.collectionFilter = {}; this.open({kind: 'collection'}); return; }
    if (step.target === 'goals') { this.open({kind: 'missions', tab: 'main'}); return; }
    if (step.target === 'paille' || step.target === 'neige') {
      const r = s.rabbits.find(r => r.species === step.target); if (r) this.open({kind: 'rabbit', id: r.id}); return;
    }
    const kind = step.target === 'farmShop' ? 'farm' : step.target;
    const b = step.buildingId ? s.buildings.find(b=>b.id===step.buildingId) : s.buildings.find(b => b.kind === kind);
    if (b && step.target !== 'farmShop') this.open({kind: 'building', id: b.id});
    else if (kind === 'nest' || kind === 'nursery') this.open({kind: 'arrange'});
    else this.open({kind: 'shop', tab: 'buildings'});
  }
  private onboardingViewAllowed(view: NonNullable<View>): boolean {
    const s = this.snapshot.state!, step = onboardingTask(s,this.preferences.value,this.now()).step;
    if (view.kind === 'settings') return true;
    if (view.kind === 'placement') return !!this.placement;
    if (view.kind === 'shop') return view.tab === ({snowShop:'habitats',rabbitShop:'rabbits',farmShop:'buildings'} as Record<string,string>)[step.id];
    if (view.kind === 'buyRabbit') return step.id === 'rabbitShop' && view.species === 'neige';
    if (view.kind === 'missions') return step.id === 'snowReward' && view.tab === 'main';
    if (view.kind === 'welcomeBaby') return step.id === 'welcomeBirth';
    if (view.kind === 'rabbit') return s.rabbits.find(r => r.id === view.id)?.species === step.target;
    if (view.kind === 'building') return s.buildings.find(b => b.id === view.id)?.kind === step.target;
    return false;
  }
  private onboardingAllowed(element: HTMLElement): boolean {
    if (element.closest('#paille-dialogue, #nursery-welcome-banner') || ['open-settings','save-warning','cloud-warning','recenter-view','close-panel','panel-back','tutorial-toggle','onboarding-skip','continue-portrait'].includes(element.id)) return true;
    if (element.closest('#settings-content') && this.view?.kind === 'settings') return true;
    // Modal interruptions (level reached, confirmation, level details, import) must always be closable: their content is
    // only reachable while open, and they may open between two renders. Only the pairing window keeps the guided rule.
    const dialog = element.closest('dialog');
    if (dialog && dialog.id !== 'breeding-dialog') return true;
    return element.classList.contains('guide-target') || !!element.closest('.breeding-close, .onboarding-escape');
  }
  private applyOnboardingLock(): void {
    const leaving = document.body.classList.contains('onboarding-locked') && !this.onboardingActive;
    document.body.classList.toggle('onboarding-locked', this.onboardingActive);
    if(leaving) { this.scene.setTutorialTarget?.(null); this.scene.setTutorialCell?.(null); }
    if(this.onboardingActive || this.pailleDialogue.element.open) document.body.classList.add('portrait-dismissed');
    const skip=document.getElementById('onboarding-skip'); if(skip)skip.hidden=!this.onboardingActive;
    document.querySelectorAll<HTMLElement>('button, a, input, select').forEach(element => {
      const locked = this.onboardingActive && !this.onboardingAllowed(element);
      element.classList.toggle('onboarding-unavailable', locked);
      if (locked) element.setAttribute('aria-disabled','true');
      else if (element.classList.contains('onboarding-was-locked')) element.removeAttribute('aria-disabled');
      element.classList.toggle('onboarding-was-locked',locked);
    });
  }
  private onboardingFreeCell(s: GameState, placement: Placement): {x:number;y:number}|null {
    // Stable scan of the starting parcel; the ordinary placement validator owns overlap and land rules.
    const origin=PARCELS[s.islandStart ?? 'center'], size=ISLAND.parcelCells*FINE_GRID;
    for (let y=origin.y*FINE_GRID;y<origin.y*FINE_GRID+size;y++) for(let x=origin.x*FINE_GRID;x<origin.x*FINE_GRID+size;x++) if (!placementReason(s,{...placement,cell:{x,y}})) return {x,y};
    return null;
  }
  private highlightOnboarding(): void {
    const s = this.snapshot.state!, task = onboardingTask(s,this.preferences.value,this.now());
    const buttons = [...this.content.querySelectorAll<HTMLButtonElement>('button')];
    let target: HTMLButtonElement | undefined;
    // Until a cell is chosen the confirmation stays disabled: the hand points at the yellow square on the island instead (scene).
    if (this.view?.kind === 'placement') target = buttons.find(b => !b.disabled && /^(Acheter et placer|Confirmer)/.test(b.textContent ?? ''));
    else if (this.view?.kind === 'buyRabbit') target = this.rabbitDestination ? buttons.find(b => b.hasAttribute('data-confirm-purchase')) : buttons.find(b => /Jardin enneigé/.test(b.textContent ?? ''));
    else if (this.view?.kind === 'shop') {
      const title = ({snowShop:'Jardin enneigé',rabbitShop:SPECIES.neige.name,farmShop:'Ferme'} as Record<string,string>)[task.step.id];
      target = [...this.content.querySelectorAll('.card')].find(card => card.querySelector('h3')?.textContent === title)?.querySelector<HTMLButtonElement>('button') ?? undefined;
    } else if (task.step.id === 'snowReward') target = this.content.querySelector<HTMLButtonElement>('[data-mission="welcome-snow"] .mission-claim') ?? undefined;
    else if (task.waiting) target = this.content.querySelector<HTMLButtonElement>('.initiation-aid button') ?? this.content.querySelector<HTMLButtonElement>('.paid-acceleration button') ?? undefined;
    else if (task.step.id === 'welcomeBirth') target = buttons.find(b => !b.disabled && (/ · \d+\//.test(b.textContent ?? '') || b.dataset.reception !== undefined));
    else {
      const pattern = ({production:/^Cultiver · 10/,harvest:/^Récolter 20/,paille:/^Nourrir/,neige:/^Nourrir/,breed:/^Croiser$/,transfer:/^Envoyer dans la nurserie/} as Record<string,RegExp>)[task.step.id];
      target = buttons.find(b => pattern?.test(b.textContent ?? ''));
    }
    target?.classList.add('guide-target');
    target?.scrollIntoView?.({block:'nearest',behavior:'instant'});
    if (this.view && this.view.kind !== 'settings' && !this.pailleDialogue.element.open) this.content.prepend(node('p', task.step.text, 'paille-task'));
    this.scene.setTutorialTarget(task.step.id === 'transfer' && !task.waiting ? 'birth' : null);
    this.applyOnboardingLock();
  }
  private highlightGuideTarget(): void {
    this.content.querySelectorAll('.guide-target').forEach(el => el.classList.remove('guide-target'));
    this.content.querySelector('.paille-task')?.remove();
    if (this.onboardingActive) { this.highlightOnboarding(); return; }
    if (!this.preferences.value.tutorial || this.preferences.value.tutorialDone || !this.snapshot.state) return;
    const step = guidedStep(this.snapshot.state, this.preferences.value, this.now(), this.stagedOnboarding);
    const labels: Record<string, RegExp> = {paille: /^Nourrir/, neige: /^Nourrir/, farmShop: /^Placer · 60/, production: /^Cultiver · 10/, harvest: /^Récolter 20/, breed: /^Croiser$/, transfer: /^Envoyer dans la nurserie/, welcomeBirth: /^Accueillir/};
    const pattern = labels[step.id];
    let target = pattern ? [...this.content.querySelectorAll('button')].find(b => pattern.test(b.textContent ?? '')) : null;
    if (this.stagedOnboarding && this.snapshot.state.startCourse === 'paille-solo') {
      if (step.id === 'snowShop' || step.id === 'rabbitShop') {
        const title = step.id === 'snowShop' ? 'Jardin enneigé' : 'Neige';
        target = [...this.content.querySelectorAll('.card')].find(card => card.querySelector('h3')?.textContent === title)?.querySelector('button');
      } else if (step.id === 'snowReward') target = this.content.querySelector<HTMLButtonElement>('[data-mission="welcome-snow"] .mission-claim') ?? undefined;
      if (this.view && !this.pailleDialogue.element.open && !step.done) this.content.prepend(node('p', step.text, 'paille-task'));
    }
    target?.classList.add('guide-target');
  }
  private renderTutorial(): void {
    if (this.interactionPointers.size) return;
    const s = this.snapshot.state, preferences = this.preferences.value;
    const speaking = this.pailleDialogue.update(s, this.stagedOnboarding, this.now(), this.view?.kind !== 'settings' && !(s && mainCatalogueUnlocked(s) && this.view));
    if (s?.startCourse === 'paille-solo' && this.stagedOnboarding && preferences.tutorial && !preferences.tutorialDone) { this.tutorial.hidden = true; return; }
    this.tutorial.replaceChildren(); this.tutorial.hidden = !s || speaking || !!this.view || !preferences.tutorial || preferences.tutorialDone;
    if (this.tutorial.hidden || !s) return;
    const step = guidedStep(s, preferences, this.now(), this.stagedOnboarding); this.tutorial.dataset.step = step.id;
    const missionId = activeMainMissions(s).find(id => s.missions.completed.includes(id));
    this.tutorial.append(node('strong', missionId ? MAIN_MISSIONS[missionId].title : step.title), node('p', step.text));
    this.button(this.tutorial, 'Me guider', () => this.guide(step));
    if (missionId) {
      const mission = MAIN_MISSIONS[missionId];
      const xp = missionClaimXp('main',missionId);
      const resources = [mission.reward, ...(mission.extraRewards ?? [])].filter(r => r.resource !== 'none' && r.amount > 0).map(rewardLabel).join(' · ');
      const xpOnly = !resources && mission.claimXp !== undefined && xp > 0;
      const label = resources || (xpOnly ? `${xp} XP` : '');
      this.button(this.tutorial, label ? `Réclamer · ${label}` : 'Valider l’objectif', () => this.execute({type: 'claimMainMission', id: missionId}, label ? `Récompense : ${label}` : 'Objectif validé.'));
      this.tutorial.append(node('p', mission.title, 'small'));
      if (resources || xp > 0) this.tutorial.append(node('p', `Récompense : ${resources}${resources && xp > 0 ? ' · ' : ''}${xp > 0 ? `${xp} XP` : ''}`, 'small'));
    }
    const income = s.buildings.find(b => b.kind === 'enclosure' && incomeWhole(b.incomeUnits) >= 1);
    if (income) this.button(this.tutorial, 'Pattes disponibles', () => this.open({kind: 'building', id: income.id}), null, true);
    if (step.done) this.button(this.tutorial, 'Terminer le guidage', () => { this.preferences.set({tutorialDone: true}); this.renderPreferences(); this.renderTutorial(); }, null, true);
    this.button(this.tutorial, 'Masquer', () => { this.preferences.set({tutorial: false}); this.renderPreferences(); this.renderTutorial(); }, null, true);
  }
  dispose(): void { this.photoControls.dispose(); this.clearRabbitMove(); this.moveBanner.remove(); this.clearWelcome(); this.welcomeBanner.remove(); this.closeReception(); this.accountReminder.dispose(); document.getElementById('onboarding-skip')?.remove(); this.pailleDialogue.dispose(); this.cuisine.dispose(); this.jumpRope.dispose(); this.skyGifts.dispose(); this.bennyFlight.dispose(); this.confirmationGeneration++; if (this.dialog.open) this.dialog.close(); this.dialog.replaceChildren(); this.unsubscribe(); this.abort.abort(); clearInterval(this.frame); clearTimeout(this.toastTimer); this.endCaress(); this.sounds.dispose(); }
}

const JUMP_ISLAND_NAME = 'Île de la corde à sauter';
/** The challenge of the day at the jump-rope islet, or that it is won. */
function jumpRopeChallengeText(s: GameState, now: number): string {
  if (!jumpRopeDay(s, now).challengeLeft) return s.jumpRope?.challenge ? 'Défi du jour réussi : reviens demain pour le suivant.' : 'Le défi se tente à la première partie du jour : reviens demain pour le suivant.';
  const c = jumpRopeChallenge(s, now);
  return `Défi du jour, à ta première partie : ${c.jumps} sauts${c.type ? ` avec un lapin ${TYPE_NAMES[c.type]} comme athlète` : ''} · +${JUMP_ROPE.challenge.hearts} cœurs`;
}
/** « 12 sucres d’orge », « 1 sucre d’orge » (the Christmas market's currency). */
const candyAmount = (n: number) => `${n} sucre${n > 1 ? 's' : ''} d’orge`;
/** Today's rewarded games of « Les cadeaux du ciel ». */
function skyGiftsQuotaText(s: GameState, now: number): string {
  return `Parties récompensées : ${SKY_GIFTS.rewardedGamesPerCycle - skyGiftsDay(s, now).rewardedLeft}/${SKY_GIFTS.rewardedGamesPerCycle}`;
}
/** Today's rewarded games of « Le vol de Benny », and its Heart. */
function bennyFlightQuotaText(s: GameState, now: number): string {
  const day = bennyFlightDay(s, now), games = day.rewardedLeft;
  const rewards = games ? `Encore ${games} partie${games > 1 ? 's' : ''} récompensée${games > 1 ? 's' : ''} aujourd’hui` : 'Parties récompensées finies pour aujourd’hui : reviens demain';
  return `${rewards}${day.heartLeft ? ` · première partie : un cœur à ${BENNY_FLIGHT.heartColumns} colonnes` : ''}`;
}
/** Today's rewarded games at the jump-rope islet, and its Heart. */
function jumpRopeQuotaText(s: GameState, now: number): string {
  const day = jumpRopeDay(s, now), games = day.rewardedLeft;
  const rewards = games ? `Encore ${games} partie${games > 1 ? 's' : ''} récompensée${games > 1 ? 's' : ''} aujourd’hui` : 'Parties récompensées finies pour aujourd’hui : reviens demain';
  return `${rewards}${day.heartLeft ? ` · première partie : un cœur à ${JUMP_ROPE.heartJumps} sauts` : ''}`;
}
