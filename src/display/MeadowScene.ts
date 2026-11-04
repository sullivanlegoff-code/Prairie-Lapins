import {deriveArdentFlames, ardentFlamePose} from './ardentFlames';
import {elementUrl} from './rabbitPresentation';
import {islandOutline, organicLoop, parcelSetKey} from './islandOutline';
import {nestForParent} from '../simulation/breeding';
import {artForRabbit, type RabbitArt} from '../config/rabbitArt';
import {rabbitBlinkArt, rabbitPatchPlacement} from '../config/rabbitBlinkArt';
import {rabbitFaceSeed, rabbitFaceState} from './rabbitBlink';
import {DadiReactions} from './dadiReactions';
import {LegendaryView} from './legendaryEffects';
import {LegendaryClock, type LegendaryAct} from './legendaryTimeline';
import {LEGENDARY_TEST_EVENT, isLegendaryShow, legendaryMeadowArt, shouldShowLegendaryView} from '../config/legendaryArt';
import {BennyView} from './bennyView';
import {BennyClock, type BennyAct} from './bennyTimeline';
import {BENNY_ATLAS, BENNY_ID, BENNY_TEST_EVENT, bennyMeadowArt} from '../config/bennyArt';
import {BENNY_FLIGHT_TEST_EVENT, bennyFlightArt} from '../config/bennyFlightArt';
import {BennyFlightView, GROUND_LIFT} from './bennyFlightView';
import {ALTITUDE, NURSERY_ALTITUDE, type FlightGeometry} from './bennyFlight';
import {bennyInSky} from '../simulation/benny';
import {DadiSpeech, dadiHeadVisible} from './dadiSpeech';
import {RabbitLife} from './rabbitLife';
import {RabbitLifeViews} from './rabbitLifeViews';
import {CozyInteraction, type InteractionKind} from './cozyInteraction';
import {bestFriend} from '../simulation/cozy';
import Phaser from 'phaser';
import {VISUAL} from '../config/visual';
import {shouldShowIncomeBubble} from './incomeBubble';
import type {GameController} from '../application/GameController';
import {drawBuildingArt} from './buildingArt';
import {drawHabitat} from './habitatArt';
import {HABITAT_SIZE_PROPOSAL, enclosureScale, habitatSlots} from '../config/habitatSizes';
import {habitatArtLayout, habitatArtFor, type HabitatArt} from '../config/habitatArt';
import {KITCHEN_ART} from '../config/kitchenArt';
import {statueArtFor} from '../config/statueArt';
import {AGENCY_ART} from '../config/agencyArt';
import {PICNIC_ART, SALON_ART} from '../config/salonArt';
import {FOREST_ART} from '../config/forestArt';
import {JUMP_ISLAND_ART, JUMP_MEDAL_ART, jumpIslandFrame, jumpIslandPoint, jumpMedalPoint} from '../config/jumpIslandArt';
import {jumpRopeMedals} from '../simulation/jumpRope';
import {showsEvolvedArt} from '../config/evolvedArt';
import {wearsCrown} from '../simulation/affection';
import {CROWN_ART, CROWN_SEAT, crownAnchor, crownPlacement} from '../config/ultimateArt';
import {away, careReady} from '../simulation/care';
import {tripReady} from '../simulation/travel';
import {FarmCrops} from './farmCrops';
import {FARM_ART, FARM_LEVEL_1_ART} from '../config/farmArt';
import {NEST_ART} from '../config/nestArt';
import {NURSERY_ART, NURSERY_OVERLAY_ART} from '../config/nurseryArt';
import {CROP_IDS, CROP_TEXTURE, CROP_URL, SPROUT_TEXTURE, SPROUT_URL} from './food';
import {NurseryOverlays} from './nurseryOverlays';
import {nurseryBabyHit} from './nurseryOverlayModel';
import {progressBars} from './progressBars';
import {ProgressBarViews} from './progressBarViews';
import {foodBubble} from './currencyPhaser';
import {buildingAt, buildingPlacementReason, buildingFootprint, type Footprint} from '../simulation/placement';
import {placementGrid, PLACEMENT_GRID} from './placementGrid';
import {readyNurseryBabies} from '../simulation/nursery';
import {FloatingIslandLayer} from './floatingIslandLayer';
import {ISLAND_ART} from '../config/islandArt';
import {grassTile, islandStage, stageArt, STAGE_PX_PER_UNIT, WINTER_STAGE_ART_LIST} from '../config/islandStages';
import {IslandStageLayer, queueStage} from './islandStageLayer';
import {SkyLayer, SKY_COLOR} from './skyLayer';
import {WinterLayer, WinterLights} from './winterLayer';
import WINTER_LIGHTS from '../config/islandStageLightsWinter.json';
import {WINTER_ART, winterUrl} from '../config/winterArt';
import {christmasActive, localHour} from '../config/christmas';
import {PARCELS, PARCEL_IDS, expansionTarget, purchasableParcels, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';
import {rabbitOffset, rabbitPosition, rabbitHit, rabbitFedLift} from './rabbitLayout';
import {createRabbitMotion, endRabbitActivity, motionZone, roamScale, retargetRabbitMotion, startRabbitActivity, stepRabbitMotion, triggerFedReaction, triggerWelcomeSalto, rabbitPose, type RabbitMotion} from './rabbitMotion';
import {habitatStats, habitatEntryReason, visibleColumns} from '../simulation/habitats';
import {HOUR, ORDERS, type SpeciesId} from '../config/balance';
import type {Building, DecorationLocation, GameState} from '../state/types';
import {FINE_GRID, type DecorationId} from '../config/decorations';
import {catalogDecorationPlacementReason, footprint} from '../simulation/decorations';
import {decorationTexture, decorationScale, decorationOrigin, decorationUrl, decorationLayerDepth} from './decorationArt';
import {MeadowCamera, cellsBounds, gridCell, fineCell, finePoint, buildingCenter, gridPoint, type Point} from '../ui/gestures';
import {groundTransform, screenBounds, toGround, toScreen} from '../ui/projection';
import type {Placement} from '../ui/models';
import {SPECIES, proceduralCoat} from '../config/species';
import {bindMeadowInput} from './meadowInput';
import {buildingFrame, ownedRegions, recenterCamera, type ScreenChrome} from './recenter';
import {COIN_TEXTURE, COIN_URL, FOOD_TEXTURE, FOOD_URL, HEART_TEXTURE, HEART_URL} from './currency';
import {coinBubble} from './currencyPhaser';
import {MAGICIEN_ART, MAGICIEN_TEST_EVENT} from '../config/magicienArt';
import {MagicienView} from './magicienEffects';
import {MagicienClock, magicienFree, type MagicienAct} from './magicienTimeline';
import {CHASE_EVENT, RabbitChases, type ChaseRunner} from './rabbitChase';
import {SNOWBALL_EVENT, SnowballFights, snowballPoint, type SnowballThrower} from './snowballFight';
import {CHRISTMAS_MARKET_ART, christmasMarketFrame, christmasMarketPoint} from '../config/christmasMarketArt';
import {SNOWBALL_ART, SNOWMAN_ART} from '../config/winterArt';
import {garlandLevel} from './winterClock';
import {isChristmasDecoration} from '../config/decorations';
import {snowmanToday} from '../simulation/christmas';

/** `nurseryBubble`: the « Prêt ! » bubble (id: the nursery). `nurseryBaby`: a ready baby touched on its cushion (id: its birthId). */
export type MeadowSelection = {kind: 'jumpIsland'} | {kind: 'christmasMarket'} | {kind: 'building' | 'rabbit' | 'income' | 'grass' | 'decoration' | 'birth' | 'nurseryBubble' | 'nurseryBaby'; id: string} | {kind: 'cell' | 'fineCell'; x: number; y: number} | {kind: 'extension'; parcelId?: ParcelId} | {kind: 'empty'};
export interface DecorationGhost {id: string; catalogId?: DecorationId; location: DecorationLocation | null}
/** `object` is the ground point (position, depth, scale); `body` carries the hop height, squash and mirror, apart from the shadow. */
interface VisualRabbit {id: string; object: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container; ears: Phaser.GameObjects.Ellipse[]; sprite?: Phaser.GameObjects.Image; art?: RabbitArt; base: Point; phase: number; fedUntil: number;
  flames?: Phaser.GameObjects.Image;
  /** The golden crown of an ultimate rabbit (affection 50) that wears it, on its head in the body. */
  crown?: Phaser.GameObjects.Image;
  face?: {seed: number; eyes: Phaser.GameObjects.Image; nose: Phaser.GameObjects.Image};
  /** Lapin Dragon and Lapin Requin: halo, moving wing or fin, and their shows. */
  legendary?: LegendaryView;
  /** Benny, the Mythic: her painted acts, blink, nose and ears. */
  benny?: BennyView;
  magicien?: MagicienView;
  center: Point; group: string; motion?: RabbitMotion; nest?: boolean; lift: number;
  /** Centre of the visible body in body space: the somersault turns about it, not about the feet or the picture centre. */
  pivot: Point; /** Mirror sign of the picture's native direction: -1 for art that looks left. */ native: 1 | -1}
/** Local y of the ground contact the body is compressed against, so its feet stay put. */
const BODY_PIVOT = 10;
export class MeadowScene extends Phaser.Scene {
  private current: GameState | null = null;
  private placement: Placement | null = null;
  private ground!: Phaser.GameObjects.Container;
  private animals!: Phaser.GameObjects.Container;
  private bubbles!: Phaser.GameObjects.Container;
  /** Flat overlays on the ground (cell highlights, grids, footprints, parcel outlines), in the ground layer. */
  private grid!: Phaser.GameObjects.Graphics;
  /** Ground layer above the sprites: holds `grid`, so it shares the ground transform yet keeps its draw order. */
  private groundOverlay!: Phaser.GameObjects.Container;
  /** Upright readable icons drawn over the overlay: expansion "+" badges, decoration ✓/✗ marks. */
  private markers!: Phaser.GameObjects.Graphics;
  private rabbitViews: VisualRabbit[] = [];
  private rabbitGroups = new Map<string, VisualRabbit[]>();
  private neighborPoints: Point[] = [];
  /** Visual-only walking state per resident, reused while the individual stays present. */
  private motions = new Map<string, {group: string; tier: number; center: Point; motion: RabbitMotion}>();
  private motionClock: number | null = null;
  private dadi = new DadiReactions();
  private dadiSpeech: DadiSpeech | null = null;
  /** Legendaries' show clocks, kept across rebuilds of their bodies like the motions. */
  private legendaryClocks = new Map<string, LegendaryClock>();
  /** Benny's clock, kept across rebuilds of her body like the motions. */
  private bennyClocks = new Map<string, BennyClock>();
  private magicienClocks = new Map<string, MagicienClock>();
  /** Two rabbits of one enclosure running after each other now and then (visual only). */
  private chases = new RabbitChases();
  private chaseTest = false;
  /** Christmas: two rabbits of one enclosure throwing tiny snowballs at each other now and then (visual only). */
  private snowballs = new SnowballFights();
  private snowballTest = false;
  private snowballViews = new Map<string, Phaser.GameObjects.Image>();
  /** Christmas pictures loaded on demand, never required: a missing one only means nothing is drawn (`optionalArt`). */
  private optionalPending = new Set<string>();
  private optionalFailed = new Set<string>();
  /** The Christmas market islet (west of the island) and its night lights; null while the event is off or its picture missing. */
  private marketImage: Phaser.GameObjects.Image | null = null;
  private marketLights: Phaser.GameObjects.Image | null = null;
  /** Today's snowman, standing at the back of its enclosure (null when none is drawn). */
  private snowman: {enclosureId: string; image: Phaser.GameObjects.Image} | null = null;
  /** The snowman being made (three steps), with its guests gathered in front of it, facing `spotX` (their local space). */
  private snowmanBuild: {enclosureId: string; elapsed: number; step: number; ids: string[]; spotX: number} | null = null;
  /** Benny's flight over the island: made once her flight art is loaded, it outlives every rebuild of her body. */
  private bennyFlight: BennyFlightView | null = null;
  /** Benny's id while she is up in the air (her enclosure picture is hidden, she is touched in the air). */
  private bennyAway: string | null = null;
  private flightIsland: {key: string; centre: Point; rx: number; ry: number} | null = null;
  private life = new RabbitLife();
  private cozyInteraction = new CozyInteraction();
  private friends = new Map<string,string|null>();
  private interactionIn = 45000;
  /** The picnic under way: its guests sit around the cloth (facing its middle, `midX` in their local space) until `left` runs out. */
  private picnicParty: {ids: string[]; left: number; midX: number} | null = null;
  private sky?: SkyLayer;
  private winter?: WinterLayer;
  private winterLights?: WinterLights;
  private picnicPieces = new Set<Phaser.GameObjects.Image | Phaser.GameObjects.Text>();
  private lifeViews: RabbitLifeViews | null = null;
  private lifeGeneration: number | null = null;
  private pivots = new Map<string, Point>();
  private bubbleHits: {point: Point; width: number; height: number; selection: MeadowSelection}[] = [];
  private layoutKey = '';
  private buildingsLayer!: Phaser.GameObjects.Container;
  /** The jump-rope islet, left of the start island (off the land grid); null until bought. */
  private jumpIslandImage: Phaser.GameObjects.Image | null = null;
  /** Its record medals (concept M1 « Rubans »), hung under the kiosk's roof. */
  private jumpIslandMedals: Phaser.GameObjects.Image[] = [];
  private buildingViews = new Map<string, Phaser.GameObjects.Image>();
  private nurseryOverlays: NurseryOverlays | null = null;
  private progressViews: ProgressBarViews | null = null;
  private simulationReceivedAt = 0;
  private progressUpdatedAt = -Infinity;
  private progressNow = 0;
  private farmCrops: FarmCrops | null = null;
  private focusTween: Phaser.Tweens.Tween | null = null;
  private buildingTextures = new Set<string>();
  private buildingGhost: Phaser.GameObjects.Image | null = null;
  private rabbitDrops: string[] | null = null;
  private dropArrows: Phaser.GameObjects.Graphics | null = null;
  private dropHits: {id: string; point: Point}[] = [];
  private purchase: {species: SpeciesId; selected: string | null} | null = null;
  private purchaseLabels: Phaser.GameObjects.Text[] = [];
  private arrangement = false;
  private ghost: DecorationGhost | null = null;
  private photo = false;
  private expanding = false;
  private expansionParcelId: ParcelId | undefined;
  private islandMaskGraphics: Phaser.GameObjects.Graphics | null = null;
  private islandMask: Phaser.Display.Masks.GeometryMask | null = null;
  private islandMaskKey = '';
  private floatingIslandLayer: FloatingIslandLayer | null = null;
  private islandStageLayer: IslandStageLayer | null = null;
  private decorationViews = new Map<string, Phaser.GameObjects.Image>();
  private ghostView: Phaser.GameObjects.Image | null = null;
  private floorDecorationsLayer!: Phaser.GameObjects.Container;
  private decorationsLayer!: Phaser.GameObjects.Container;
  private selectedDecorationId: string | null = null;
  private decorationSelection!: Phaser.GameObjects.Graphics;
  private decorationPixels = new Map<string, Uint8ClampedArray>();
  private unsubscribe: (() => void) | null = null;
  private artLoading = false;
  private failedArt = new Set<string>();
  private artComplete: (() => void) | null = null;
  private sceneReady = false;
  readonly view = new MeadowCamera();
  /** Optional start-up reporting for the loading screen (texture loader progress, errors, scene ready). */
  constructor(private controller: GameController, private select: (selection: MeadowSelection) => void, private blocked: () => boolean,
    private loading?: {progress(fraction: number): void; error(file: string): void; ready(): void; runtime?(status: 'loading' | 'failed' | 'ready', retry: () => void): void}) { super('Meadow'); }
  preload(): void {
    this.sceneReady = false;
    if (this.loading) {
      const l = this.loading;
      const progress = (v: number) => { if (!this.sceneReady) l.progress(v); };
      const error = (file: {key: string}) => { if (!this.sceneReady) l.error(file.key); };
      this.load.on('progress', progress); this.load.on('loaderror', error);
      this.events.once('shutdown', () => { this.load.off('progress', progress); this.load.off('loaderror', error); });
    }
    this.load.image(COIN_TEXTURE, COIN_URL);
    this.load.image(HEART_TEXTURE, HEART_URL);
    for (const type of ['paille', 'neige', 'feu', 'metal', 'vol'] as const) this.load.image(`element-${type}`, elementUrl(type));
    for (const art of ISLAND_ART) if (!this.textures.exists(art.texture)) this.load.image(art.texture, art.url);
    // Both lawns while the event is on: buying the next stage may change it.
    for (const grass of new Set([grassTile(null), grassTile(WINTER_STAGE_ART_LIST[0]?.stage ?? null)])) if (!this.textures.exists(grass.texture)) this.load.image(grass.texture, grass.url);
    // Only the painting of the current stage is loaded at start; a later stage loads when it is bought.
    const stage = islandStage(this.controller.getSnapshot().state?.acquiredParcels ?? []);
    if (stage) queueStage(this, stageArt(stage));
    if (!this.textures.exists(FOOD_TEXTURE)) this.load.image(FOOD_TEXTURE, FOOD_URL);
    for (const art of this.requiredArt(this.controller.getSnapshot().state))
      if (!this.textures.exists(art.texture)) this.loadArt(art);
  }
  create(): void {
    this.sceneReady = true;
    this.events.once('shutdown', () => {
      this.sceneReady = false;
      if (this.artComplete) this.load.off('complete', this.artComplete);
      this.artComplete = null; this.artLoading = false; this.failedArt.clear();
      this.loading?.runtime?.('ready', () => {});
    });
    this.cameras.main.setBackgroundColor(SKY_COLOR);
    // Owns its shutdown cleanup; independent of parcel ownership and ground projection.
    this.sky = new SkyLayer(this, toScreen(gridPoint(ISLAND.focus, ISLAND.focus)));
    this.winter = new WinterLayer(this); this.winterLights = new WinterLights(this);
    // Christmas: the tiny snowflakes, loaded after start (a missing picture only means no snow, never a blocked meadow).
    if (christmasActive()) for (const flake of WINTER_ART.flakes) this.optionalArt(flake.texture, flake.url);
    // Ground layer (flat on the island, drawn in ground coordinates, one shared projection transform):
    // terrain at depth 0 and the flat overlays at depth 1. Upright layer (untransformed, anchors through
    // toScreen): buildings .1, decorations .5, decoration selection .9, markers 1, ghosts 1.5, rabbits 2,
    // bubbles and availability texts 3. Depths are those of the former single-plane scene.
    this.ground = this.add.container(0, 0); this.buildingsLayer = this.add.container(0, 0).setDepth(.1); this.animals = this.add.container(0, 0).setDepth(2);
    this.nurseryOverlays = new NurseryOverlays(this, this.buildingsLayer);
    this.progressViews = new ProgressBarViews(this);
    this.events.once('shutdown', () => { this.progressViews?.destroy(); this.progressViews = null; });
    this.farmCrops = new FarmCrops(this, this.buildingsLayer);
    // Flat path paintings follow the ground compression, above terrain but below every upright object.
    this.floorDecorationsLayer = this.add.container(0, 0).setDepth(decorationLayerDepth('dirt-path'));
    this.decorationsLayer = this.add.container(0, 0).setDepth(.5);
    this.decorationSelection = this.add.graphics().setDepth(.9);
    this.grid = this.add.graphics(); this.groundOverlay = this.add.container(0, 0, [this.grid]).setDepth(1);
    this.markers = this.add.graphics().setDepth(1); this.bubbles = this.add.container(0, 0).setDepth(3);
    for (const layer of [this.ground, this.groundOverlay]) layer.setPosition(groundTransform.x, groundTransform.y).setRotation(groundTransform.rotation).setScale(groundTransform.scaleX, groundTransform.scaleY);
    this.resize();
    this.dadiSpeech = new DadiSpeech(this.game.canvas.parentElement!);
    this.lifeViews = new RabbitLifeViews(this);
    this.unsubscribe = this.controller.subscribe(snapshot => {
      if (this.lifeGeneration !== snapshot.generation) {
        this.cozyInteraction.reset(); this.interactionIn = 45000;
        this.failedArt.clear();
        this.life.reset(); this.lifeViews?.begin([]); this.motions.clear(); this.layoutKey = '';
        this.lifeGeneration = snapshot.generation;
      }
      this.dadi.sync(snapshot.state, snapshot.generation);
      this.current = snapshot.state; this.simulationReceivedAt = this.time.now;
      this.friends=new Map((snapshot.state?.rabbits??[]).map(r=>[r.id,bestFriend(snapshot.state!,r.id)]));
      this.progressNow = this.current?.lastSimulatedAt ?? 0; this.renderState();
    });
    const stopCommands = this.controller.onConfirmedCommand(command => {
      this.dadi.confirmed(command);
      // Benny's flight follows her commands; a reload or another save only finds her saved state (the flight clock reconciles it).
      if (command.type === 'bennySky') { if (command.inSky) this.bennyFlight?.clock.takeOff(); else this.bennyFlight?.clock.land(); }
      if (command.type === 'bennyPower') this.playBennyPower();
    });
    const clearDadi = () => { this.dadi.clearSpeech(); this.dadiSpeech?.hide(); };
    const dadiVisibility = () => { if (document.hidden) clearDadi(); };
    document.addEventListener('visibilitychange', dadiVisibility);
    window.addEventListener('pagehide', clearDadi);
    // Laboratory buttons replay one show on every legendary in the meadow; nothing in the normal game sends this event.
    const legendaryTest = (event: Event) => {
      const act = (event as CustomEvent<{act?: LegendaryAct}>).detail?.act;
      if (act) for (const rabbit of this.rabbitViews) rabbit.legendary?.play(act);
    };
    window.addEventListener(LEGENDARY_TEST_EVENT, legendaryTest);
    const magicienTest = (event: Event) => { const act=(event as CustomEvent<{act?:MagicienAct}>).detail?.act; if(act) for(const rabbit of this.rabbitViews) rabbit.magicien?.play(act); };
    window.addEventListener(MAGICIEN_TEST_EVENT,magicienTest);
    // Laboratory buttons play one of Benny's acts; nothing in the normal game sends this event either.
    const bennyTest = (event: Event) => {
      const act = (event as CustomEvent<{act?: BennyAct}>).detail?.act;
      if (act) for (const rabbit of this.rabbitViews) rabbit.benny?.play(act);
    };
    window.addEventListener(BENNY_TEST_EVENT, bennyTest);
    // The laboratory's power animation alone: the flight only, the game is not touched.
    const flightTest = () => this.playBennyPower();
    window.addEventListener(BENNY_FLIGHT_TEST_EVENT, flightTest);
    const chaseTest = () => { this.chaseTest = true; };
    window.addEventListener(CHASE_EVENT, chaseTest);
    // Laboratory only: a snowball fight in every enclosure that allows one (while the event is on).
    const snowballTest = () => { this.snowballTest = true; };
    window.addEventListener(SNOWBALL_EVENT, snowballTest);
    this.events.once('shutdown', () => {
      stopCommands(); this.dadi.reset(); this.dadiSpeech?.destroy(); this.dadiSpeech = null;
      this.cozyInteraction.reset();
      this.chases.reset(); this.snowballs.reset(); this.life.reset(); this.lifeViews?.destroy(); this.lifeViews = null;
      window.removeEventListener(SNOWBALL_EVENT, snowballTest);
      this.snowballViews.clear(); this.marketImage = null; this.marketLights = null; this.snowman = null; this.snowmanBuild = null;
      this.optionalPending.clear(); this.optionalFailed.clear();
      document.removeEventListener('visibilitychange', dadiVisibility); window.removeEventListener('pagehide', clearDadi);
      window.removeEventListener(LEGENDARY_TEST_EVENT, legendaryTest); window.removeEventListener(MAGICIEN_TEST_EVENT,magicienTest); window.removeEventListener(BENNY_TEST_EVENT, bennyTest); window.removeEventListener(BENNY_FLIGHT_TEST_EVENT, flightTest); window.removeEventListener(CHASE_EVENT, chaseTest);
      this.bennyFlight?.destroy(); this.bennyFlight = null; this.bennyAway = null; this.flightIsland = null;
    });
    this.recenter();
    this.scale.on('resize', this.resize, this);
    const disposeInput = bindMeadowInput(this.game.canvas, this.view, point => this.tap(point), this.blocked, () => this.applyCamera());
    this.events.once('shutdown', () => { this.jumpIslandImage = null; this.jumpIslandMedals = []; this.rabbitDrops = null; this.dropHits = []; this.dropArrows?.destroy(); this.dropArrows = null; this.unsubscribe?.(); disposeInput(); this.scale.off('resize', this.resize, this); this.buildingTextures.forEach(key=>this.textures.remove(key)); this.ground.clearMask(); this.islandMask?.destroy(); this.islandMaskGraphics?.destroy(); this.islandMask = null; this.islandMaskGraphics = null; this.floatingIslandLayer?.destroy(); this.floatingIslandLayer = null; this.islandStageLayer?.destroy(); this.islandStageLayer = null; this.nurseryOverlays?.destroy(); this.nurseryOverlays = null; this.motions.clear(); this.pivots.clear(); });
    this.loading?.ready();
  }
  /** Her power: the flight (or, with reduced motion, a glow), and the camera steps back gently so the island can be seen. */
  private playBennyPower(): void {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!this.bennyFlight) return;
    this.bennyFlight.clock.usePower(reduced);
    // Once the card has closed (the next frames), so the framing sees the whole meadow.
    if (!reduced) this.time.delayedCall(80, () => this.showIsland());
  }
  /** A soft move centring Benny's orbit, stepping back only as far as needed to see all of it (the player's own gesture always wins). */
  private showIsland(): void {
    const island = this.flightIsland;
    if (!island || !this.current || !this.cameras?.main || this.view.busy || !this.sceneReady) return;
    const from = {x: this.view.x, y: this.view.y, zoom: this.view.zoom}, insets = this.framingInsets();
    // The orbit with room for her wings and her height; never closer than the player was.
    const width = 2 * island.rx + 220, height = 2 * island.ry + 2 * (ALTITUDE + GROUND_LIFT + 50);
    const fit = Math.min((this.view.width - insets.left - insets.right) / width, (this.view.height - insets.top - insets.bottom) / height);
    this.view.zoom = Math.max(this.view.minimumZoom, Math.min(from.zoom, fit));
    this.view.x = island.centre.x; this.view.y = island.centre.y - (ALTITUDE / 2) + (insets.bottom - insets.top) / 2 / this.view.zoom; this.view.clamp();
    const to = {x: this.view.x, y: this.view.y, zoom: this.view.zoom};
    Object.assign(this.view, from); this.applyCamera();
    if (Math.abs(to.zoom - from.zoom) < .01 && Math.hypot(to.x - from.x, to.y - from.y) < 4) return;
    this.focusTween?.stop();
    this.focusTween = this.tweens.addCounter({from: 0, to: 1, duration: 1100, ease: 'Sine.easeInOut',
      onUpdate: tween => {
        if (this.view.busy) { tween.stop(); this.focusTween = null; return; }
        const u = tween.getValue() ?? 1;
        this.view.x = from.x + (to.x - from.x) * u; this.view.y = from.y + (to.y - from.y) * u; this.view.zoom = from.zoom + (to.zoom - from.zoom) * u;
        this.applyCamera();
      }, onComplete: () => { this.focusTween = null; }});
  }
  /** The island's orbit for Benny: an ellipse inside the owned land's top surface (cached until the land changes). */
  private bennyGeometry(home: Point, facing: 1 | -1): {geometry: FlightGeometry; roof: number | null} {
    const parcels = this.current?.acquiredParcels ?? [], key = parcels.join(',');
    if (this.flightIsland?.key !== key) {
      const rects = parcels.map(id => { const p = PARCELS[id]; return screenBounds(cellsBounds(p.x, p.y, p.x + ISLAND.parcelCells, p.y + ISLAND.parcelCells)); });
      const left = Math.min(...rects.map(r => r.left)), right = Math.max(...rects.map(r => r.right)), top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
      this.flightIsland = rects.length ? {key, centre: {x: (left + right) / 2, y: (top + bottom) / 2}, rx: (right - left) * .34, ry: (bottom - top) * .3} : {key, centre: home, rx: 120, ry: 60};
    }
    const nursery = this.current?.buildings.find(b => b.kind === 'nursery');
    const point = nursery ? toScreen(buildingCenter(nursery)) : null, roof = nursery ? buildingFrame(nursery).top : null;
    const {centre, rx, ry} = this.flightIsland;
    // Above the nursery's roof, whatever the building's height.
    const nurseryAltitude = point && roof !== null ? Math.max(NURSERY_ALTITUDE, point.y - roof + 12 - GROUND_LIFT) : undefined;
    return {geometry: {home, facing, centre, rx, ry, nursery: point, nurseryAltitude}, roof};
  }
  /** One frame of Benny's flight: hides her enclosure picture while she is in the air. */
  private stepBennyFlight(dt: number, reduced: boolean): void {
    const id = this.current?.rabbits.find(r => r.species === BENNY_ID)?.id;
    const rabbit = id ? this.rabbitViews.find(r => r.id === id && !r.nest && r.benny) : undefined;
    if (!this.bennyFlight && rabbit && bennyFlightArt().every(art => this.textures.exists(art.texture))) this.bennyFlight = new BennyFlightView(this);
    const flight = this.bennyFlight;
    if (!flight) { this.bennyAway = null; return; }
    if (!rabbit) { if (flight.last) flight.hide(); this.bennyAway = null; return; }
    const facing = ((rabbit.body.scaleX < 0 ? -1 : 1) * rabbit.native) as 1 | -1;
    const {geometry, roof} = this.bennyGeometry({x: rabbit.object.x, y: rabbit.object.y}, facing);
    const frame = flight.update({dt, sky: !!this.current && bennyInSky(this.current), reduced, geometry, roof});
    rabbit.object.setAlpha(frame.ground).setVisible(frame.ground > 0);
    this.bennyAway = frame.ground < .5 ? rabbit.id : null;
  }
  recenter(): void { if (!this.cameras?.main) return; recenterCamera(this.view, this.current, this.screenChrome()); this.applyCamera(); }
  /** Snapshot after the next rendered frame, so WebGL never exports an empty back buffer. */
  capturePhoto(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.sceneReady) { reject(new Error('La prairie est encore en préparation.')); return; }
      const generation = this.lifeGeneration;
      const timeout = window.setTimeout(() => reject(new Error('La photo n’a pas pu être prise. Réessaie.')), 5000);
      try {
        this.game.renderer.snapshot(image => {
          if (!this.sceneReady || generation !== this.lifeGeneration) { clearTimeout(timeout); reject(new Error('La partie a changé.')); return; }
          if (!(image instanceof HTMLImageElement)) { clearTimeout(timeout); reject(new Error('Photo indisponible.')); return; }
          const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth || image.width; canvas.height = image.naturalHeight || image.height;
          try { canvas.getContext('2d')!.drawImage(image, 0, 0); canvas.toBlob(blob => { clearTimeout(timeout); blob ? resolve(blob) : reject(new Error('Photo indisponible.')); }, 'image/png'); }
          catch (error) { clearTimeout(timeout); reject(error); }
        }, 'image/png');
      } catch (error) { clearTimeout(timeout); reject(error); }
    });
  }
  interactionDecoration(id: string): boolean {
    if (!this.current || this.cozyInteraction.active || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const d = this.current.decorations.find(d => d.id === id);
    const kinds: Partial<Record<DecorationId, InteractionKind>> = {'hay-bale':'play','otter-plush':'cuddle','bunny-slippers':'cuddle','small-bookcase':'read','large-bookcase':'read'};
    const kind = d && kinds[d.catalogId], point = d && this.decorationPoint(d.location, d.catalogId);
    if (!kind || !point) return false;
    const candidates = this.rabbitViews.filter(r => !r.nest && r.motion && ['rest','walk'].includes(r.motion.mode) &&
      Math.hypot(r.center.x - point.x, r.center.y - point.y) < 160 && !away(this.current!,r.id));
    candidates.sort((a,b) => Math.hypot(a.object.x-point.x,a.object.y-point.y)-Math.hypot(b.object.x-point.x,b.object.y-point.y));
    const rabbit = candidates[0]; if (!rabbit?.motion) return false;
    this.life.interrupt(rabbit.id);
    return this.cozyInteraction.start(rabbit.id,id,rabbit.motion,{x:point.x-rabbit.center.x,y:point.y-rabbit.center.y},kind);
  }
  /** CSS-pixel chrome measured from the DOM; the same reading is reproduced by the browser checks. */
  private screenChrome(): ScreenChrome {
    const visible = (id: string) => {const e = document.getElementById(id); return e && !e.hidden && getComputedStyle(e).display !== 'none' ? e.getBoundingClientRect() : null;};
    const columns = ['open-missions', 'meadow-actions'].map(visible).filter((r): r is DOMRect => !!r && r.width > 0);
    const footer = visible('dev-badge');
    return {width: this.scale.width, height: this.scale.height, hudBottom: document.getElementById('hud')?.getBoundingClientRect().bottom ?? 0,
      column: columns.length ? {right: Math.max(...columns.map(r => r.right)), bottom: Math.max(...columns.map(r => r.bottom))} : null, footerTop: footer ? footer.top : null};
  }
  private framingInsets() {
    const pad=VISUAL.camera.overviewPadding, panel=document.getElementById('game-panel'), hud=document.getElementById('hud');
    // A centred rabbit card floats over the meadow and leaves the framing alone.
    const rect=panel && !panel.hidden && !panel.classList.contains('center-card') ? panel.getBoundingClientRect() : null;
    const footer=document.getElementById('dev-badge');
    const footerBottom=footer && getComputedStyle(footer).display!=='none' ? this.scale.height-footer.getBoundingClientRect().top+pad : pad;
    // In portrait the panel is a bottom sheet spanning the width: it covers the bottom, not the right.
    const sheet=this.isSheet(rect);
    const bottom=sheet ? Math.max(footerBottom,this.scale.height-rect!.top+pad) : footerBottom;
    return {left:pad,right:rect && !sheet ? this.scale.width-rect.left+pad : pad,top:(hud?.getBoundingClientRect().bottom ?? 0)+pad,bottom};
  }
  /** Portrait bottom sheet: frame the island in the space left above it, so every free cell can be tapped. */
  fitAboveSheet(): void {
    const panel=document.getElementById('game-panel'), rect=panel && !panel.hidden ? panel.getBoundingClientRect() : null;
    if (this.isSheet(rect)) this.overview();
  }
  private isSheet(rect: DOMRect | null): boolean { return !!rect && rect.width>0 && rect.left<this.scale.width/3 && rect.top>this.scale.height/3; }
  overview(): void {
    if (!this.current || !this.cameras?.main) return;
    const ids=this.expanding ? PARCEL_IDS : this.current.acquiredParcels;
    const parcels=ids.map(id=>PARCELS[id]);
    this.view.setInsets(this.framingInsets());
    const rects=parcels.map(p=>screenBounds(cellsBounds(p.x,p.y,p.x+ISLAND.parcelCells,p.y+ISLAND.parcelCells)));
    // Extend downward AFTER projection: the rock hangs vertically in screen space.
    const owned = ownedRegions(this.current.acquiredParcels);
    rects.push(...owned);
    if (this.current.jumpIsland && !this.expanding) rects.push(jumpIslandFrame());
    if (christmasActive() && !this.expanding) rects.push(christmasMarketFrame());
    this.view.overview({left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))});
    this.applyCamera();
  }
  private updateDetails(): void {
    const fade=(low:number,high:number)=>Phaser.Math.Clamp((this.view.zoom-low)/(high-low),0,1);
    this.bubbles?.setAlpha(fade(.45,.7)).setVisible(!this.photo && this.view.zoom>.45);
  }
  private resize(): void { this.view.setInsets(this.framingInsets()); this.view.resize(this.scale.width, this.scale.height); this.applyCamera(); }
  private applyCamera(): void { this.cameras.main.setZoom(this.view.zoom).centerOn(this.view.x, this.view.y); this.drawDecorationSelection(); this.updateDetails(); }
  setExpansion(active:boolean, parcelId?:ParcelId):void {
    const was=this.expanding;this.expanding=active;this.expansionParcelId=active?parcelId:undefined;
    this.updateVisibleRegions();
    if(active&&!was)this.overview();
    else if(parcelId){const p=PARCELS[parcelId],point=toScreen(gridPoint(p.x+ISLAND.parcelCells/2,p.y+ISLAND.parcelCells/2));this.view.x=point.x;this.view.y=point.y;this.view.clamp();this.applyCamera();}
    else if(was&&!active)this.recenter();
    if(this.grid)this.drawGrid();
  }
  /** Steps back to show more of the island (about 30 % wider, at most the .55 overview); gesture camera limits still own the minimum. */
  zoomForRabbitMove(): void {
    if (!this.cameras?.main) return;
    this.focusTween?.stop(); this.focusTween = null;
    const from = this.view.zoom, to = Math.max(this.view.minimumZoom, Math.min(from * .7, .55));
    if (to >= from) return;
    const go = (t: number) => { this.view.zoom = from + (to - from) * t; this.view.clamp(); this.applyCamera(); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { go(1); return; }
    this.focusTween = this.tweens.addCounter({from: 0, to: 1, duration: 650, ease: 'Sine.easeInOut',
      onUpdate: tween => { if (this.view.busy) { tween.stop(); this.focusTween = null; return; } go(tween.getValue() ?? 1); },
      onComplete: () => { this.focusTween = null; }});
  }
  setRabbitDropTargets(ids: string[] | null): void {
    this.rabbitDrops = ids;
    if (!ids) { this.dropArrows?.clear(); this.dropHits = []; this.focusTween?.stop(); this.focusTween = null; }
  }
  private drawRabbitDrops(time: number): void {
    if (!this.rabbitDrops) return;
    const g = this.dropArrows ??= this.add.graphics().setDepth(10);
    g.clear(); this.dropHits = [];
    const k = 1 / this.view.zoom;
    const bounce = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.sin(time / 360) * 3;
    for (const id of this.rabbitDrops) {
      const b = this.current?.buildings.find(b => b.id === id); if (!b) continue;
      const frame = buildingFrame(b), x = toScreen(buildingCenter(b)).x, y = frame.top - (22 + bounce) * k;
      const points = [{x:-6,y:-13},{x:6,y:-13},{x:6,y:0},{x:13,y:0},{x:0,y:13},{x:-13,y:0},{x:-6,y:0}].map(p => ({x:x+p.x*k,y:y+p.y*k}));
      g.fillStyle(0xf4d58b); g.lineStyle(2*k, 0x396447); g.fillPoints(points, true); g.strokePoints(points, true);
      this.dropHits.push({id, point:{x,y}});
    }
  }
  setRabbitPurchase(species: SpeciesId | null, selected: string | null = null): void {
    this.purchase = species ? {species, selected} : null;
    if (this.grid) this.drawGrid();
  }
  private tutorialCell: {x:number;y:number}|null = null;
  private tutorialTarget: 'birth'|null = null;
  focusTutorialCell(cell: {x:number;y:number}): void {
    if(!this.cameras?.main)return;
    const point=toScreen(buildingCenter({kind:'farm',...cell}));
    const portrait=this.view.width<600;
    this.view.x=point.x+(portrait?0:this.view.width*.18)/this.view.zoom;
    this.view.y=point.y+(portrait?this.view.height*.2:0)/this.view.zoom;
    this.view.clamp();this.applyCamera();
  }
  setTutorialCell(cell: {x:number;y:number}|null): void { this.tutorialCell = cell; if(this.grid)this.drawGrid(); }
  private tutorialHand: Phaser.GameObjects.Graphics | null = null;
  /** The guide's arrow above the suggested cell while no cell is chosen: the yellow arrow of the rabbit move, without any emoji font. */
  private syncTutorialHand(): void {
    const cell = this.tutorialCell && this.placement && !this.placement.cell && !this.photo ? this.tutorialCell : null;
    if (!cell) { this.tutorialHand?.destroy(); this.tutorialHand = null; return; }
    const key = `${cell.x},${cell.y}`;
    if (this.tutorialHand?.getData('cell') === key) return;
    this.tutorialHand?.destroy();
    const p = toScreen(finePoint(cell.x + FINE_GRID / 2, cell.y + FINE_GRID / 2));
    const arrow = this.tutorialHand = this.add.graphics().setDepth(3).setData('cell', key).setData('anchor', p);
    const points = [{x:-9,y:-20},{x:9,y:-20},{x:9,y:0},{x:19,y:0},{x:0,y:19},{x:-19,y:0},{x:-9,y:0}];
    arrow.fillStyle(0xf4d58b).lineStyle(3, 0x396447).fillPoints(points, true).strokePoints(points, true);
    this.placeTutorialHand(this.time.now);
  }
  /** Constant on-screen size whatever the zoom, gently bouncing above the cell (still with reduced motion). */
  private placeTutorialHand(time: number): void {
    const arrow = this.tutorialHand; if (!arrow) return;
    const p = arrow.getData('anchor') as Point, k = 1 / this.view.zoom;
    const bounce = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.sin(time / 250) * 5;
    arrow.setScale(k).setPosition(p.x, p.y - (34 + bounce) * k);
  }
  setTutorialTarget(target: 'birth'|null): void { if(this.tutorialTarget === target)return; this.tutorialTarget = target; if(this.bubbles)this.drawBubbles(); }
  setPlacement(placement: Placement | null): void { this.placement = placement; if (this.grid) this.renderState(); }
  setArrangement(active: boolean, ghost: DecorationGhost | null = null): void {
    this.arrangement = active; this.ghost = ghost;
    if (this.grid) this.renderState();
  }
  focusDecoration(id: string): void {
    const d=this.current?.decorations.find(d=>d.id===id);if(!d)return;
    const p=this.decorationPoint(d.location,d.catalogId);if(!p)return;
    this.view.x=p.x+this.view.width*.15/this.view.zoom;this.view.y=p.y;this.view.clamp();this.applyCamera();
  }
  setDecorationSelection(id: string | null): void {
    this.selectedDecorationId = id; this.drawDecorationSelection();
  }
  private drawDecorationSelection(): void {
    if (!this.decorationSelection) return;
    this.decorationSelection.clear();
    const image = this.selectedDecorationId ? this.decorationViews.get(this.selectedDecorationId) : null;
    this.decorationSelection.setVisible(!!image && !this.photo);
    if (!image) return;
    const r = image.getBounds(), pad = 5 / this.view.zoom;
    this.decorationSelection.lineStyle(3 / this.view.zoom, 0xd19b39, 1);
    this.decorationSelection.strokeRoundedRect(r.x - pad, r.y - pad, r.width + 2 * pad, r.height + 2 * pad, 8);
  }
  /** Hit the drawn silhouette, including tall portions above the logical footprint.
   * Raster masks are cached per texture; only a tap samples pixels, never each frame. */
  private decorationAt(screen: Point): string | null {
    const world = this.view.world(screen), pad = Math.min(4 / this.view.zoom, 5);
    const images = [...this.decorationViews.entries()].reverse().sort((a, b) => (b[1].parentContainer.depth - a[1].parentContainer.depth) || b[1].depth - a[1].depth);
    for (const [id, image] of images) {
      const bounds = image.getBounds();
      if (world.x < bounds.left - pad || world.x > bounds.right + pad || world.y < bounds.top - pad || world.y > bounds.bottom + pad) continue;
      let pixels = this.decorationPixels.get(image.texture.key);
      const width = image.frame.realWidth, height = image.frame.realHeight;
      if (!pixels) {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        if (!context) continue;
        context.drawImage(image.texture.getSourceImage() as CanvasImageSource, 0, 0, width, height);
        pixels = context.getImageData(0, 0, width, height).data;
        this.decorationPixels.set(image.texture.key, pixels);
      }
      const matrix = image.getWorldTransformMatrix();
      for (const [dx, dy] of [[0, 0], [-pad, 0], [pad, 0], [0, -pad], [0, pad], [-pad, -pad], [-pad, pad], [pad, -pad], [pad, pad]]) {
        const local = matrix.applyInverse(world.x + dx, world.y + dy);
        const x = Math.floor(local.x + image.displayOriginX), y = Math.floor(local.y + image.displayOriginY);
        // Transparent margins and faint ground shadows do not capture empty-space taps.
        if (x >= 0 && y >= 0 && x < width && y < height && pixels[(y * width + x) * 4 + 3] > 48) return id;
      }
    }
    return null;
  }
  setPhoto(active: boolean): void {
    this.photo = active;
    if (active) this.loading?.runtime?.('ready', () => {});
    else this.ensureArt();
    if (active) { this.dadi.clearSpeech(); this.dadiSpeech?.hide(); this.lifeViews?.begin([]); }
    this.syncTutorialHand();
    this.syncProgressBars();
    this.drawDecorationSelection();
    for (const piece of this.picnicPieces) piece.setVisible(!active && piece.getData('shown') === true);
    this.bubbles?.setVisible(!active); this.grid?.setVisible(!active); this.markers?.setVisible(!active); this.ghostView?.setVisible(!active); this.buildingGhost?.setVisible(!active && !!this.placement?.cell); this.nurseryOverlays?.setGhostVisible(!active && this.placement?.kind==='nursery' && !!this.placement.cell); this.updateDetails();
  }
  /** The picnic (owner's concept A): the cloth pops into the enclosure, a few hearts rise, then it fades out. Presentation only. */
/** Length of the picnic scene (owner, 4 November 2026: 6 to 8 s). */
  static readonly PICNIC_MS = 7000;
  /**
   * The picnic (owner, 4 November 2026): the view comes to the enclosure, a big cloth with its basket appears, the guests walk to
   * sit around it, facing it, and hearts rise; after PICNIC_MS everyone goes back to roaming. Reduced motion: the cloth only.
   */
  playPicnic(enclosureId: string): void {
    const b = this.current?.buildings.find(x => x.id === enclosureId); if (!b) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.focusBuilding(enclosureId);
    this.snowballs.reset(this.snowballThrowers(new Set()));
    const guests = this.rabbitViews.filter(r => r.group === enclosureId && r.motion && !r.nest && !r.benny && !r.legendary?.clock.act && !r.magicien?.busy &&
      ['rest', 'walk', 'hop', 'sleep', 'zoom', 'meet', 'kiss'].includes(r.motion.mode));
    const first = this.rabbitViews.find(r => r.group === enclosureId && r.motion && !r.nest);
    const zone = first?.motion ? motionZone(first.motion) : VISUAL.rabbit.roam.hard;
    const mid = {x: (zone.minX + zone.maxX) / 2, y: (zone.minY + zone.maxY) / 2};
    const p = first ? {x: first.center.x + mid.x, y: first.center.y + mid.y} : toScreen(buildingCenter(b));
    const width = (zone.maxX - zone.minX) * .95;
    // The cloth is loaded the first time a picnic starts (audit, 4 November 2026), then laid out for what is left of it.
    const started = this.time.now;
    const lay = () => {
      const left = MeadowScene.PICNIC_MS - (this.time.now - started);
      if (!this.sceneReady || !this.textures.exists(PICNIC_ART.texture) || left < 1200) return;
      const scale = width / PICNIC_ART.width, cloth = this.picnicPiece(this.add.image(p.x, p.y, PICNIC_ART.texture).setOrigin(.5, PICNIC_ART.originY).setDepth(1.95), true);
      if (reduced) { cloth.setScale(scale); this.time.delayedCall(Math.min(4000, left), () => cloth.destroy()); }
      else {
        cloth.setScale(scale * .2).setAlpha(0);
        this.tweens.add({targets: cloth, scale, alpha: 1, duration: 450, ease: 'Back.easeOut'});
        this.tweens.add({targets: cloth, alpha: 0, delay: left - 600, duration: 600, onComplete: () => cloth.destroy()});
      }
    };
    if (this.textures.exists(PICNIC_ART.texture)) lay();
    else { this.load.once(`filecomplete-image-${PICNIC_ART.texture}`, lay); this.load.image(PICNIC_ART.texture, PICNIC_ART.url); this.load.start(); }
    if (reduced) return;
    // The guests sit on an oval around the cloth, the first one in front.
    const rx = (zone.maxX - zone.minX) / 2, ry = (zone.maxY - zone.minY) / 2;
    guests.forEach((rabbit, index) => {
      const motion = rabbit.motion!, angle = Math.PI / 2 + 2 * Math.PI * index / guests.length + (guests.length > 1 ? Math.PI / guests.length / 2 : 0);
      this.life.interrupt(rabbit.id); if (this.cozyInteraction.active?.id === rabbit.id) this.cozyInteraction.reset();
      startRabbitActivity(motion, 'meet', {x: mid.x + Math.cos(angle) * rx, y: mid.y + Math.sin(angle) * ry});
      motion.duration = Math.min(motion.duration, 1800);
    });
    this.picnicParty = guests.length ? {ids: guests.map(r => r.id), left: MeadowScene.PICNIC_MS, midX: mid.x} : null;
    for (let i = 0; i < 9; i++) {
      const heart = this.picnicPiece(this.add.text(p.x + ((i * 37) % 5 - 2) * width / 6, p.y - 16 - (i % 3) * 10, '♥', {fontSize: '22px', color: '#d9788d'}).setDepth(5).setOrigin(.5), false);
      this.tweens.add({targets: heart, alpha: 0, y: heart.y - 50, delay: 900 + i * 550, duration: 1300, ease: 'Sine.easeIn', onStart: () => { heart.setData('shown', true).setVisible(!this.photo); }, onComplete: () => heart.destroy()});
    }
  }
  /** A piece of the picnic (cloth, heart): never in a photo (audit, 4 November 2026); forgotten once destroyed. */
  private picnicPiece<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Text>(piece: T, shown: boolean): T {
    piece.setData('shown', shown).setVisible(shown && !this.photo); this.picnicPieces.add(piece);
    piece.once('destroy', () => this.picnicPieces.delete(piece)); return piece;
  }
  /** Each frame of the picnic: arrived guests face the cloth; at the end they all go back to roaming. */
  private stepPicnic(dt: number): void {
    const party = this.picnicParty; if (!party) return;
    party.left -= Number.isFinite(dt) && dt > 0 ? Math.min(dt, 1000) : 0;
    const guests = this.rabbitViews.filter(r => party.ids.includes(r.id) && r.motion);
    for (const rabbit of guests) {
      const motion = rabbit.motion!;
      if (motion.mode === 'meet' && motion.elapsed >= motion.duration && Math.abs(motion.local.x - party.midX) > 2) motion.facing = motion.local.x < party.midX ? 1 : -1;
    }
    if (party.left > 0 && guests.length) return;
    for (const rabbit of guests) if (rabbit.motion!.mode === 'meet') endRabbitActivity(rabbit.motion!);
    this.picnicParty = null;
  }
  private snowmanCheckedAt = -Infinity;
  /** Length of the snowman scene and the moments its three steps appear (ms). */
  static readonly SNOWMAN_MS = 6500;
  static readonly SNOWMAN_STEPS = [600, 2200, 3800] as const;
  /** A rabbit gathered somewhere now (the picnic, the snowman): it neither roams, chases, fights nor speaks. */
  private gathered(id: string): boolean { return !!this.picnicParty?.ids.includes(id) || !!this.snowmanBuild?.ids.includes(id); }
  /** An enclosure's roaming zone in its local space (same table as its rabbits' motions). */
  private enclosureZone(b: Building): {minX: number; maxX: number; minY: number; maxY: number} {
    const tier = b.footprintTier ?? 1, k = enclosureScale(b), illustrated = habitatArtFor(b.habitat ?? undefined, b.footprintTier);
    const zone = illustrated ? habitatArtLayout(illustrated).zone : tier > 1 ? HABITAT_SIZE_PROPOSAL[tier as 2 | 3].zone : VISUAL.rabbit.roam.hard;
    return {minX: zone.minX * k, maxX: zone.maxX * k, minY: zone.minY * k, maxY: zone.maxY * k};
  }
  /** Where the snowman stands: at the back of the enclosure, on the right (local space), so the rabbits play in front of it. */
  private snowmanSpot(b: Building): Point {
    const zone = this.enclosureZone(b);
    return {x: zone.minX + (zone.maxX - zone.minX) * .78, y: zone.minY};
  }
  /**
   * The snowman (owner, 4 November 2026): the view comes to the enclosure, the guests gather in front of the spot, facing it,
   * and the snowman appears in three steps; then it stays standing there until the end of the cycle (`syncSnowman`).
   * Reduced motion: the finished snowman at once. Presentation only.
   */
  playSnowman(enclosureId: string): void {
    const b = this.current?.buildings.find(x => x.id === enclosureId && x.kind === 'enclosure'); if (!b) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.focusBuilding(enclosureId);
    for (const step of SNOWMAN_ART.steps) this.optionalArt(step.texture, step.url);
    const spot = this.snowmanSpot(b), zone = this.enclosureZone(b);
    if (reduced) { this.snowmanBuild = null; this.syncSnowman(); return; }
    // A snowball fight under way stops: its rabbits join the others.
    this.snowballs.reset(this.snowballThrowers(new Set()));
    const guests = this.rabbitViews.filter(r => r.group === enclosureId && r.motion && !r.nest && !r.benny && !r.legendary?.clock.act && !r.magicien?.busy &&
      !this.picnicParty?.ids.includes(r.id) && !this.chases.isChasing(r.id) && ['rest', 'walk', 'hop', 'sleep', 'zoom', 'meet', 'kiss'].includes(r.motion.mode));
    // A half circle in front of the snowman, inside the fence.
    const rx = Math.min(46, (zone.maxX - zone.minX) / 3), ry = Math.min(26, (zone.maxY - zone.minY) / 2);
    guests.forEach((rabbit, index) => {
      const motion = rabbit.motion!, angle = Math.PI * (index + 1) / (guests.length + 1);
      this.life.interrupt(rabbit.id); if (this.cozyInteraction.active?.id === rabbit.id) this.cozyInteraction.reset();
      const x = Math.max(zone.minX, Math.min(zone.maxX, spot.x - Math.cos(angle) * rx)), y = Math.max(zone.minY, Math.min(zone.maxY, spot.y + 12 + Math.sin(angle) * ry));
      startRabbitActivity(motion, 'meet', {x, y});
      motion.duration = Math.min(motion.duration, 1600);
    });
    this.snowmanBuild = {enclosureId, elapsed: 0, step: 0, ids: guests.map(r => r.id), spotX: spot.x};
    this.snowman?.image.destroy(); this.snowman = null;
  }
  /** Each frame of the snowman scene: one more step at each moment, the guests face it; at the end they go back to roaming. */
  private stepSnowman(dt: number): void {
    const build = this.snowmanBuild; if (!build) return;
    build.elapsed += Number.isFinite(dt) && dt > 0 ? Math.min(dt, 1000) : 0;
    const step = MeadowScene.SNOWMAN_STEPS.filter(at => build.elapsed >= at).length;
    if (step !== build.step) {
      build.step = step;
      const shown = this.placeSnowman(build.enclosureId, step);
      if (shown && step > 0) { const scale = shown.scale; shown.setScale(scale * .8); this.tweens.add({targets: shown, scale, duration: 320, ease: 'Back.easeOut'}); }
    }
    const guests = this.rabbitViews.filter(r => build.ids.includes(r.id) && r.motion);
    for (const rabbit of guests) {
      const motion = rabbit.motion!;
      if (motion.mode === 'meet' && motion.elapsed >= motion.duration && Math.abs(motion.local.x - build.spotX) > 2) motion.facing = motion.local.x < build.spotX ? 1 : -1;
    }
    if (build.elapsed < MeadowScene.SNOWMAN_MS) return;
    for (const rabbit of guests) if (rabbit.motion!.mode === 'meet') endRabbitActivity(rabbit.motion!);
    this.snowmanBuild = null; this.syncSnowman();
  }
  /** Draws step `step` (1 to 3) of the snowman in that enclosure, or nothing (step 0, a missing picture). */
  private placeSnowman(enclosureId: string, step: number): Phaser.GameObjects.Image | null {
    const b = this.current?.buildings.find(x => x.id === enclosureId && x.kind === 'enclosure');
    const art = step > 0 ? SNOWMAN_ART.steps[step - 1] : null;
    if (!b || !art || !this.optionalArt(art.texture, art.url, () => this.syncSnowman())) {
      if (!b || !art || this.snowman?.enclosureId !== enclosureId) { this.snowman?.image.destroy(); this.snowman = null; }
      return null;
    }
    const center = toScreen(buildingCenter(b)), spot = this.snowmanSpot(b), x = center.x + spot.x, y = center.y + spot.y;
    if (this.snowman && this.snowman.enclosureId !== enclosureId) { this.snowman.image.destroy(); this.snowman = null; }
    // Like the picnic cloth: above the buildings, below the rabbits (depth 2), so the rabbits in front of it pass in front.
    const image = this.snowman?.image ?? this.add.image(x, y, art.texture).setDepth(1.95);
    image.setTexture(art.texture).setPosition(x, y).setOrigin(.5, SNOWMAN_ART.originY).setScale(SNOWMAN_ART.worldWidth / image.frame.realWidth);
    this.snowman = {enclosureId, image};
    return image;
  }
  /** Today's snowman, where `snowmanToday` names an enclosure (kept in photos: it is a nice subject). */
  private syncSnowman(): void {
    if (this.snowmanBuild) return;
    const id = this.current && christmasActive() ? snowmanToday(this.current, this.simulationNow()) : null;
    if (!id) { this.snowman?.image.destroy(); this.snowman = null; return; }
    if (this.snowman?.enclosureId === id && this.snowman.image.texture.key === SNOWMAN_ART.steps[2].texture) return;
    this.placeSnowman(id, 3);
  }
  /** Who may throw snowballs: the same rabbits as a chase, never a chaser. */
  private snowballThrowers(visible: ReadonlySet<string>, speaking?: string): SnowballThrower[] {
    return this.playfulRabbits(visible, speaking).map(r => ({...r, available: r.available && !this.chases.isChasing(r.id)}));
  }
  /** The snowballs in the air, from the thrower's paws to the other's body, and a puff on each hit (nothing without the pictures). */
  private drawSnowballs(): void {
    const art = SNOWBALL_ART, balls = this.snowballs.balls(), seen = new Set<string>();
    const ballReady = balls.length > 0 && this.optionalArt(art.ball.texture, art.ball.url);
    const paws = (rabbit: VisualRabbit) => (rabbit.art ? rabbit.art.height * rabbit.art.worldWidth / rabbit.art.width - rabbit.art.groundY : 45) * .45 * VISUAL.rabbit.scale;
    for (const ball of balls) {
      const from = this.rabbitViews.find(r => r.id === ball.from), to = this.rabbitViews.find(r => r.id === ball.to);
      if (!ballReady || !from?.motion || !to?.motion) continue;
      const p = snowballPoint(from.motion.local, to.motion.local, ball.u), height = paws(from) + (paws(to) - paws(from)) * ball.u;
      let view = this.snowballViews.get(ball.group);
      if (!view) { view = this.add.image(0, 0, art.ball.texture).setDepth(2.5); this.snowballViews.set(ball.group, view); }
      view.setPosition(from.center.x + p.x, from.center.y + p.y - p.lift - height).setScale(art.ballWorld / view.frame.realWidth).setVisible(true);
      seen.add(ball.group);
    }
    for (const [group, view] of this.snowballViews) if (!seen.has(group)) { view.destroy(); this.snowballViews.delete(group); }
    if (!this.snowballs.hits.length || !this.optionalArt(art.puff.texture, art.puff.url)) return;
    for (const hit of this.snowballs.hits) {
      const to = this.rabbitViews.find(r => r.id === hit.to); if (!to?.motion) continue;
      const puff = this.add.image(to.center.x + to.motion.local.x, to.center.y + to.motion.local.y - paws(to), art.puff.texture).setDepth(2.5);
      puff.setScale(art.puffWorld / puff.frame.realWidth);
      this.tweens.add({targets: puff, alpha: 0, duration: art.puffMs, onComplete: () => puff.destroy()});
    }
  }
  /** The show button of a legendary's sheet: the camera comes to this rabbit, which plays that show (false when it cannot now). */
  playLegendaryAct(id: string, act: LegendaryAct): boolean {
    const rabbit = this.rabbitViews.find(r => r.id === id); if (!rabbit?.legendary) return false;
    this.view.x = rabbit.object.x; this.view.y = rabbit.object.y - 20; this.view.clamp(); this.applyCamera();
    // The surf slides the body: never in reduced motion nor out of a rest or a walk (a nest, a kiss); the splash stays on the spot.
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches || !rabbit.motion || !['rest', 'walk'].includes(rabbit.motion.mode);
    return rabbit.legendary.request(act === 'surf' && still ? 'splash' : act);
  }
  reactToFeed(id: string): void {
    const rabbit = this.rabbitViews.find(r => r.id === id); if (!rabbit) return;
    this.life.interrupt(id);
    rabbit.fedUntil = this.time.now + 900; if (rabbit.motion) triggerFedReaction(rabbit.motion);
    const heart = this.add.text(rabbit.object.x, rabbit.object.y - 40, '♥', {fontSize: '28px', color: '#d9788d'}).setDepth(5).setOrigin(.5);
    this.tweens.add({targets: heart, y: heart.y - 45, alpha: 0, duration: 1000, onComplete: () => heart.destroy()});
  }
  private dadiHead(rabbit: VisualRabbit): Point {
    const height = rabbit.art ? rabbit.art.height * rabbit.art.worldWidth / rabbit.art.width - rabbit.art.groundY : 45;
    return this.view.screen({x: rabbit.object.x, y: rabbit.object.y - (height + rabbit.lift) * VISUAL.rabbit.scale});
  }
  private updateVisibleRegions(): void {
    // Owned plateaux and their hanging rock; clouds and extension sketches do not own pan regions.
    this.view.setVisibleRegions(this.expanding || !this.current ? null : [...ownedRegions(this.current.acquiredParcels), ...(this.current.jumpIsland ? [jumpIslandFrame()] : []), ...(christmasActive() ? [christmasMarketFrame()] : [])]);
  }
  /** DOM portraits use ordinary image requests; Phaser only decodes residents and the active habitat preview. */
  private requiredArt(state: GameState | null): {texture: string; url: string; atlas?: string}[] {
    const assets = new Map<string, {texture: string; url: string; atlas?: string}>();
    const add = (art: {texture: string; url: string; atlas?: string} | null | undefined) => { if (art) assets.set(art.texture, art); };
    for (const rabbit of state?.rabbits ?? []) {
      // The drawing this rabbit shows (its evolved one only after explicit evolution); blink and nose patches belong to the v1 only.
      const shown = artForRabbit(rabbit); add(shown);
      if (!shown?.evolved) for (const patch of rabbitBlinkArt(rabbit.species)?.patches ?? []) add(patch);
      if (isLegendaryShow(rabbit.species)) for (const art of legendaryMeadowArt(rabbit.species)) add(art);
      if (rabbit.species === BENNY_ID) for (const art of [...bennyMeadowArt(), ...bennyFlightArt()]) add(art);
      if (wearsCrown(rabbit)) add(CROWN_ART);
      // The magic circle and the stars, only for an evolved Magicien (audit, 4 November 2026).
      if (rabbit.species === 'magicien' && shown?.evolved) { add(MAGICIEN_ART.circle); add(MAGICIEN_ART.star); }
    }
    const buildingArt = (building: Pick<Building, 'kind' | 'habitat' | 'footprintTier' | 'farmLevel'> & {id?: string}) => {
      if (building.kind === 'enclosure') add(habitatArtFor(building.habitat ?? undefined, building.footprintTier)); // Same texture at every scale.
      else if (building.kind === 'farm') {
        add(building.farmLevel ? FARM_ART : FARM_LEVEL_1_ART);
        add({texture: SPROUT_TEXTURE, url: SPROUT_URL});
        for (const id of CROP_IDS) add({texture: CROP_TEXTURE(id), url: CROP_URL(id)});
      } else if (building.kind === 'nursery') {
        add(NURSERY_ART); add(NURSERY_OVERLAY_ART.baby); add(NURSERY_OVERLAY_ART.veil); add(NURSERY_OVERLAY_ART.lock);
      } else if (building.kind === 'statue') add(statueArtFor(state?.buildings ?? [], building.id));
      else add(({nest: NEST_ART, kitchen: KITCHEN_ART, agency: AGENCY_ART, salon: SALON_ART, forest: FOREST_ART})[building.kind]);
    };
    for (const building of state?.buildings ?? []) buildingArt(building);
    if (state?.jumpIsland) { add(JUMP_ISLAND_ART); for (const step of jumpRopeMedals(state)) add({texture: JUMP_MEDAL_ART.texture(step), url: JUMP_MEDAL_ART.url(step)}); }
    if (this.placement) {
      const moving = state?.buildings.find(b => b.id === this.placement?.movingId);
      buildingArt(moving ?? {kind: this.placement.kind, habitat: this.placement.kind === 'enclosure' ? {type: this.placement.habitatType ?? 'universal', level: 1} : null});
    }
    const decoration = (id: DecorationId, rotation: 0 | 1) => {
      // The Christmas decorations' pictures are optional (they may not be painted yet): `drawDecorations` loads them on demand.
      if (isChristmasDecoration(id)) return;
      add({texture: decorationTexture(id), url: decorationUrl(id)});
      if (rotation) add({texture: decorationTexture(id, rotation), url: decorationUrl(id)});
    };
    for (const d of state?.decorations ?? []) if (d.location.kind === 'outside') decoration(d.catalogId, d.location.rotation);
    const ghost = state?.decorations.find(d => d.id === this.ghost?.id)?.catalogId ?? this.ghost?.catalogId;
    if (ghost && this.ghost?.location?.kind === 'outside') decoration(ghost, this.ghost.location.rotation);
    return [...assets.values()];
  }
  /** A picture, or an atlas (picture and frames) such as Benny's animations. */
  private loadArt(art: {texture: string; url: string; atlas?: string}): void {
    const url = winterUrl(art.url, christmasActive());
    if (art.atlas) this.load.atlas(art.texture, url, art.atlas); else this.load.image(art.texture, url);
  }
  /**
   * A Christmas picture that may not exist yet (not painted): true once its texture is there. The first call queues it alone,
   * outside `requiredArt`, so a missing file never blocks the meadow nor its loading screen; a failed file is not asked again
   * in this scene. `ready` runs once it has loaded.
   */
  private optionalArt(texture: string, url: string, ready?: () => void): boolean {
    if (this.textures.exists(texture)) return true;
    if (!this.sceneReady || this.optionalPending.has(texture) || this.optionalFailed.has(texture)) return false;
    this.optionalPending.add(texture);
    const finish = (ok: boolean) => {
      this.load.off(`filecomplete-image-${texture}`, success); this.load.off('loaderror', failure);
      this.optionalPending.delete(texture);
      if (!ok || !this.textures.exists(texture)) { this.optionalFailed.add(texture); return; }
      if (this.sceneReady) ready?.();
    };
    const success = () => finish(true);
    const failure = (file: {key: string}) => { if (file.key === texture) finish(false); };
    this.load.once(`filecomplete-image-${texture}`, success); this.load.on('loaderror', failure);
    this.load.image(texture, url); this.load.start();
    return false;
  }
  private christmasDecorationReady(id: DecorationId, rotation: 0 | 1): boolean {
    return this.optionalArt(decorationTexture(id, rotation), decorationUrl(id), () => { if (this.current) this.renderState(); });
  }
  /**
   * The Christmas market islet, west of the island, for everyone while the event is on; its night lights (ADD blend, above the
   * night shade) glow with the garlands, from 20:00. Nothing is drawn while a picture is missing.
   */
  private syncChristmasMarket(date: Date): void {
    const art = CHRISTMAS_MARKET_ART, show = christmasActive() && !!this.current;
    if (!show) { this.marketImage?.destroy(); this.marketImage = null; this.marketLights?.destroy(); this.marketLights = null; return; }
    const p = christmasMarketPoint();
    if (!this.marketImage && this.optionalArt(art.texture, art.url)) {
      const image = this.marketImage = this.add.image(p.x, p.y, art.texture);
      // Sized by its world width whatever the prepared picture's pixels, like the jump-rope islet.
      image.setOrigin(art.originX, art.originY).setScale(art.worldWidth / image.frame.realWidth).setDepth(p.y);
      this.buildingsLayer.add(image); this.buildingsLayer.sort('depth');
    }
    if (!this.marketImage) return;
    const glow = garlandLevel(localHour(date));
    if (!this.marketLights && glow > 0 && this.optionalArt(art.night.texture, art.night.url)) {
      const lights = this.marketLights = this.add.image(p.x, p.y, art.night.texture);
      lights.setOrigin(art.originX, art.originY).setScale(art.worldWidth / lights.frame.realWidth).setDepth(2.85).setBlendMode(Phaser.BlendModes.ADD);
    }
    this.marketLights?.setAlpha(glow).setVisible(glow > .001);
  }
  /** Keep the previous complete scene during a batch, including when state changes again during the request. */
  private ensureArt(): boolean {
    const missing = this.requiredArt(this.current).filter(art => !this.textures.exists(art.texture));
    if (!missing.length) { this.loading?.runtime?.('ready', () => this.retryArt()); return true; }
    if (missing.some(art => this.failedArt.has(art.texture))) { if (!this.photo) this.loading?.runtime?.('failed', () => this.retryArt()); return false; }
    if (!this.photo) this.loading?.runtime?.('loading', () => this.retryArt());
    if (!this.artLoading) {
      this.artLoading = true;
      const generation = this.lifeGeneration;
      for (const art of missing) this.loadArt(art);
      this.artComplete = () => {
        this.artComplete = null;
        this.artLoading = false;
        if (!this.sceneReady) return;
        if (generation === this.lifeGeneration) for (const art of missing) if (!this.textures.exists(art.texture)) this.failedArt.add(art.texture);
        this.renderState();
      };
      this.load.once('complete', this.artComplete);
      this.load.start();
    }
    return false;
  }
  private retryArt(): void {
    if (this.artLoading || !this.sceneReady) return;
    this.failedArt.clear(); this.renderState();
  }
  private renderState(): void {
    if (!this.ensureArt()) return;
    const s = this.current;
    if (s) { this.view.setColumns(visibleColumns(s)); this.updateVisibleRegions(); this.applyCamera(); }
    const key = JSON.stringify([s?.jumpIsland, s ? jumpRopeMedals(s).length : 0, s?.acquiredParcels, s?.buildings.map(b => [b.id, b.kind, b.x, b.y, b.habitat, b.farmLevel, b.agencyLevel, b.breeding?.parents]), s?.rabbits.map(r => [r.id, r.species, r.enclosureId, wearsCrown(r), showsEvolvedArt(r)]), s?.travel?.trips.map(t => t.rabbitId), s?.care?.rabbitId]);
    if (key !== this.layoutKey) { this.layoutKey = key; this.drawGround(); this.drawBuildings(); this.drawAnimals(); }
    // The cushion overlays follow the canonical state and simulation time on every refresh (a no-op when nothing changed).
    this.nurseryOverlays?.sync(s);
    this.farmCrops?.sync(s);
    this.syncProgressBars();
    this.drawDecorations(); this.drawBubbles(); this.drawGrid(); this.drawGhost(); this.updateDetails();
  }
  private decorationPoint(location: DecorationLocation, catalogId: DecorationId): Point | null {
    if (location.kind === 'inventory') return null;
    if (location.kind === 'outside') {
      const size = footprint(catalogId, location.rotation);
      return toScreen(gridPoint((location.x + size.width / 2) / FINE_GRID, (location.y + size.height / 2) / FINE_GRID));
    }
    return null;
  }
  private drawDecorations(): void {
    const visible = new Set<string>();
    for (const d of this.current?.decorations ?? []) {
      const point = this.decorationPoint(d.location, d.catalogId); if (!point) continue;
      // A Christmas decoration whose picture is missing (not painted yet) is simply not drawn; it stays owned and placed.
      const rotation = d.location.kind === 'outside' ? d.location.rotation : 0;
      if (isChristmasDecoration(d.catalogId) && !this.christmasDecorationReady(d.catalogId, rotation)) continue;
      visible.add(d.id);
      let image = this.decorationViews.get(d.id);
      if (!image) { image = this.add.image(0, 0, decorationTexture(d.catalogId)); (d.catalogId === 'dirt-path' ? this.floorDecorationsLayer : this.decorationsLayer).add(image); this.decorationViews.set(d.id, image); }
      image.setTexture(decorationTexture(d.catalogId, d.location.kind === 'outside' ? d.location.rotation : 0));
      const scale = decorationScale(d.catalogId, image.frame.realWidth), anchor = decorationOrigin(d.catalogId);
      image.setPosition(point.x, point.y).setOrigin(anchor.x, anchor.y).setScale(scale, scale * (d.catalogId === 'dirt-path' ? VISUAL.projection.q : 1)).setDepth(point.y)
        .setAlpha(this.ghost?.id === d.id ? .35 : 1);
    }
    for (const [id, image] of this.decorationViews) if (!visible.has(id)) { image.destroy(); this.decorationViews.delete(id); }
    this.floorDecorationsLayer.sort('depth'); this.decorationsLayer.sort('depth'); this.drawDecorationSelection();
  }
  private drawGhost(): void {
    const d = this.current?.decorations.find(d => d.id === this.ghost?.id) ?? (this.ghost?.catalogId ? {id: this.ghost.id, catalogId: this.ghost.catalogId} : null);
    const point = d && this.ghost?.location ? this.decorationPoint(this.ghost.location, d.catalogId) : null;
    if (!d || !point || !this.ghost?.location) { this.ghostView?.setVisible(false); return; }
    const ghostRotation = this.ghost.location.kind === 'outside' ? this.ghost.location.rotation : 0;
    if (isChristmasDecoration(d.catalogId) && !this.christmasDecorationReady(d.catalogId, ghostRotation)) { this.ghostView?.setVisible(false); return; }
    if (!this.textures.exists(decorationTexture(d.catalogId)) || !this.textures.exists(decorationTexture(d.catalogId, ghostRotation))) { this.ghostView?.setVisible(false); return; }
    if (!this.ghostView) this.ghostView = this.add.image(0, 0, decorationTexture(d.catalogId)).setDepth(1.5).setAlpha(.65).setOrigin(.5, .87);
    const rotation = this.ghost.location.kind === 'outside' ? this.ghost.location.rotation : 0;
    this.ghostView.setTexture(decorationTexture(d.catalogId, rotation)).setPosition(point.x, point.y)
      .setOrigin(decorationOrigin(d.catalogId).x, decorationOrigin(d.catalogId).y)
      .setScale(decorationScale(d.catalogId, this.ghostView.frame.realWidth), decorationScale(d.catalogId, this.ghostView.frame.realWidth) * (d.catalogId === 'dirt-path' ? VISUAL.projection.q : 1)).setDepth(d.catalogId === 'dirt-path' ? .06 : 1.5)
      .setTint(catalogDecorationPlacementReason(this.current!, d.catalogId, this.ghost.location, d.id) ? 0xf3a6a1 : 0xe4ffb5).setVisible(!this.photo);
  }
  private drawGround(): void {
    // The painted stage (or, for an island grown outside the fixed order, the generated relief) changes only with
    // ownership and keeps the previous picture until the new one is ready. The grass tiles follow the parcels at once.
    this.ground.removeAll(true);
    if (!this.current) { this.floatingIslandLayer?.destroy(); this.floatingIslandLayer = null; this.islandStageLayer?.destroy(); this.islandStageLayer = null; return; }
    const ids = this.current.acquiredParcels, stage = islandStage(ids);
    if (stage) {
      if (!this.islandStageLayer) this.islandStageLayer = new IslandStageLayer(this);
      this.islandStageLayer.request(stage, () => { this.floatingIslandLayer?.destroy(); this.floatingIslandLayer = null; });
      // The garland bulbs of the snowy painting glow at night (only where that painting is shipped).
      const winterStage = christmasActive() ? WINTER_STAGE_ART_LIST.find(a => a.stage === stage) : undefined;
      this.winterLights?.show(winterStage ? stage : null, (WINTER_LIGHTS as unknown as Record<string, [number, number][]>)[stage] ?? [], winterStage?.canvas, STAGE_PX_PER_UNIT);
      // The painted rim covers the plateau edges itself.
      this.ground.clearMask(); this.islandMask?.destroy(); this.islandMaskGraphics?.destroy();
      this.islandMask = null; this.islandMaskGraphics = null; this.islandMaskKey = '';
    } else {
      this.islandStageLayer?.clear(); this.winterLights?.show(null);
      if (!this.floatingIslandLayer) this.floatingIslandLayer = new FloatingIslandLayer(this);
      this.floatingIslandLayer.request(ids);
      this.maskIsland(ids);
    }
    const grass = grassTile(stage), scale = grass.worldUnits / grass.size;
    for (const id of ids) {
      const parcel = PARCELS[id], x = VISUAL.grid.originX + parcel.x * VISUAL.grid.width, y = VISUAL.grid.originY + parcel.y * VISUAL.grid.depth;
      // Anchored on the world origin: neighbouring parcels continue the same pattern without a seam.
      this.ground.add(this.add.tileSprite(x, y, ISLAND.parcelWidth / scale, ISLAND.parcelDepth / scale, grass.texture)
        .setOrigin(0).setScale(scale).setTilePosition(x / scale, y / scale));
    }
  }
  /** Rounded plateau outline for the generated relief only. */
  private maskIsland(ids: readonly ParcelId[]): void {
    const maskKey = parcelSetKey(ids);
    if (maskKey !== this.islandMaskKey) {
      const graphics = this.make.graphics({x:0,y:0});
      graphics.fillStyle(0xffffff); graphics.beginPath();
      for (const component of islandOutline(ids)) {
        const loops = [...component.loops].sort((a,b)=>Number(a.hole)-Number(b.hole));
        const vertices: number[] = [], holes: number[] = [];
        for (const loop of loops) {
          if(loop.hole) holes.push(vertices.length/2);
          for(const p of organicLoop(loop).map(toScreen)) vertices.push(p.x,p.y);
        }
        const triangles = Phaser.Geom.Polygon.Earcut(vertices,holes,2);
        for(let i=0;i<triangles.length;i+=3) {
          const a=triangles[i]*2,b=triangles[i+1]*2,c=triangles[i+2]*2;
          graphics.moveTo(vertices[a],vertices[a+1]); graphics.lineTo(vertices[b],vertices[b+1]); graphics.lineTo(vertices[c],vertices[c+1]); graphics.closePath();
        }
      }
      graphics.fillPath();
      const mask=graphics.createGeometryMask();
      // Only the flat plateau is clipped. Upright art and interaction layers are independent.
      this.ground.setMask(mask); this.islandMask?.destroy(); this.islandMaskGraphics?.destroy();
      this.islandMask=mask; this.islandMaskGraphics=graphics; this.islandMaskKey=maskKey;
    }
    this.ground.setMask(this.islandMask!);
  }
  private buildingTexture(b: Pick<Building, 'kind' | 'habitat' | 'footprintTier' | 'farmLevel'> & {id?: string}): string {
    if (b.kind === 'farm') return b.farmLevel ? FARM_ART.texture : FARM_LEVEL_1_ART.texture;
    if (b.kind === 'nest') return NEST_ART.texture;
    if (b.kind === 'nursery') return NURSERY_ART.texture;
    if (b.kind === 'kitchen') return KITCHEN_ART.texture;
    if (b.kind === 'statue') return statueArtFor(this.current?.buildings ?? [], b.id).texture;
    if (b.kind === 'agency') return AGENCY_ART.texture;
    if (b.kind === 'salon') return SALON_ART.texture;
    if (b.kind === 'forest') return FOREST_ART.texture;
    if (b.kind === 'enclosure') { const illustrated = habitatArtFor(b.habitat ?? undefined, b.footprintTier); if (illustrated) return illustrated.texture; }
    // The drawing follows the footprint actually acquired (tier), not the capacity level: a legacy enclosure keeps its compact look.
    const sized = b.habitat && b.footprintTier && b.footprintTier > 1 ? HABITAT_SIZE_PROPOSAL[b.footprintTier] : null;
    const key = `meadow-building-${b.kind}-${b.habitat?.type ?? 'none'}-${b.habitat?.level ?? 0}${sized ? `-t${b.footprintTier}` : ''}`;
    if (sized && b.habitat && !this.textures.exists(key)) {
      const g = this.add.graphics();g.scaleCanvas(2,2);drawHabitat(g,sized.texture.width/2,sized.texture.height/2,b.habitat.type,b.habitat.level,sized.growth);
      g.generateTexture(key,sized.texture.width*2,sized.texture.height*2);g.destroy();this.buildingTextures.add(key);
    }
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();g.scaleCanvas(2,2);drawBuildingArt(g,128,128,b);
      g.generateTexture(key,512,512);g.destroy();this.buildingTextures.add(key);
    }
    return key;
  }
  /** The same registration is used for placed buildings and the placement/move ghost. */
  /** `enlarged`: an enclosure's uniform drawing factor (`enclosureScale`), the same on both axes so nothing is stretched. */
  private positionBuildingArt(image: Phaser.GameObjects.Image, x: number, y: number, kind: Building['kind'], illustrated: HabitatArt | null = null, enlarged = 1, id?: string): void {
    if (illustrated) { image.setPosition(x, y).setOrigin(illustrated.anchor.x / illustrated.width, illustrated.anchor.y / illustrated.height).setScale(enlarged * illustrated.worldWidth / illustrated.width); return; }
    const art = kind === 'farm' ? FARM_ART : kind === 'nest' ? NEST_ART : kind === 'nursery' ? NURSERY_ART : kind === 'kitchen' ? KITCHEN_ART : kind === 'statue' ? statueArtFor(this.current?.buildings ?? [], id) : kind === 'agency' ? AGENCY_ART : kind === 'salon' ? SALON_ART : kind === 'forest' ? FOREST_ART : null;
    image.setPosition(x, y).setOrigin(.5, art ? art.originY : .5)
      .setScale(art ? art.worldWidth / art.width : .5 * enlarged);
  }
  private drawBuildings(): void {
    const present = new Set<string>();
    for (const b of this.current?.buildings ?? []) {
      present.add(b.id);const p=toScreen(buildingCenter(b)),x=p.x,y=p.y;
      let image=this.buildingViews.get(b.id);
      if(!image){image=this.add.image(x,y,this.buildingTexture(b));this.buildingsLayer.add(image);this.buildingViews.set(b.id,image);}
      image.setTexture(this.buildingTexture(b)).setDepth(y);
      this.positionBuildingArt(image, x, y, b.kind, b.kind === 'enclosure' ? habitatArtFor(b.habitat ?? undefined, b.footprintTier) : null, b.kind === 'enclosure' ? enclosureScale(b) : 1, b.id);
    }
    for(const [id,image] of this.buildingViews)if(!present.has(id)){image.destroy();this.buildingViews.delete(id);}
    if (this.current?.jumpIsland) {
      const p = jumpIslandPoint(), art = JUMP_ISLAND_ART;
      if (!this.jumpIslandImage) { this.jumpIslandImage = this.add.image(p.x, p.y, art.texture); this.buildingsLayer.add(this.jumpIslandImage); }
      this.jumpIslandImage.setPosition(p.x, p.y).setOrigin(art.originX, art.originY).setScale(art.worldWidth / art.width).setDepth(p.y);
    } else { this.jumpIslandImage?.destroy(); this.jumpIslandImage = null; }
    const medals = this.current?.jumpIsland ? jumpRopeMedals(this.current) : [];
    while (this.jumpIslandMedals.length > medals.length) this.jumpIslandMedals.pop()!.destroy();
    medals.forEach((step, i) => {
      const at = jumpMedalPoint(i, medals.length), texture = JUMP_MEDAL_ART.texture(step);
      const image = this.jumpIslandMedals[i] ??= (() => { const created = this.add.image(at.x, at.y, texture); this.buildingsLayer.add(created); return created; })();
      image.setTexture(texture).setPosition(at.x, at.y).setOrigin(.5, 0).setScale(JUMP_MEDAL_ART.worldHeight / JUMP_MEDAL_ART.height).setDepth(jumpIslandPoint().y + 1);
    });
    this.buildingsLayer.sort('depth');
  }
  private drawAnimals(): void {
    this.animals.removeAll(true); this.rabbitViews = [];
    const walkers = new Set<string>();
    for (const enclosure of this.current?.buildings.filter(b => b.kind === 'enclosure' || b.kind==='nest' && b.breeding) ?? []) {
      const residents = enclosure.kind==='nest' ? enclosure.breeding!.parents.flatMap(id=>this.current!.rabbits.filter(r=>r.id===id)) : this.current!.rabbits.filter(r => r.enclosureId === enclosure.id);
      const center = toScreen(buildingCenter(enclosure));
      residents.forEach((rabbit, index) => {
        if(enclosure.kind==='enclosure' && (nestForParent(this.current!,rabbit.id) || away(this.current!,rabbit.id))) return; // At the nest, or away (a trip, the salon).
        // Nest parents keep their original independent illustrations in front of the doorway.
        const tier = enclosure.footprintTier ?? 1, proposed = enclosure.kind==='enclosure' && tier > 1 ? HABITAT_SIZE_PROPOSAL[tier] : null;
        const illustrated = enclosure.kind==='enclosure' ? habitatArtFor(enclosure.habitat ?? undefined, enclosure.footprintTier) : null;
        const illustratedLayout = illustrated ? habitatArtLayout(illustrated) : null;
        // An enlarged enclosure spreads the same places and zone by its drawing's factor; rabbits keep their size.
        const k = enclosure.kind==='enclosure' ? enclosureScale(enclosure) : 1;
        const spread = (p: {x: number; y: number}) => ({x: p.x * k, y: p.y * k});
        const spreadZone = (z: {minX: number; maxX: number; minY: number; maxY: number}) => ({minX: z.minX * k, maxX: z.maxX * k, minY: z.minY * k, maxY: z.maxY * k});
        const offset = enclosure.kind==='nest' ? NEST_ART.parentOffsets[index] : spread(illustratedLayout ? illustratedLayout.slots[Math.min(index, illustratedLayout.slots.length - 1)] : proposed ? habitatSlots(tier as 2 | 3, residents.length)[Math.min(index, residents.length - 1)] : rabbitOffset(index, residents.length));
        const layout = illustratedLayout ? {zone: spreadZone(illustratedLayout.zone), roamScale: illustratedLayout.roamScale} : proposed ? {zone: spreadZone(proposed.zone), roamScale: proposed.roamScale} : k !== 1 ? {zone: spreadZone(VISUAL.rabbit.roam.hard), roamScale: roamScale(residents.length)} : undefined;
        const base = {x: center.x + offset.x, y: center.y + offset.y};
        // Nest parents keep persistent motions for walks, tricks, races and kisses.
        let motion: RabbitMotion | undefined;
        {
          // Cover the whole nest zone, so a snapshot does not retarget a lively parent back to its slot.
          const motionLayout = enclosure.kind === 'nest' ? {zone: {minX: -80, maxX: 90, minY: -15, maxY: 20}, roamScale: 12} : layout;
          // Same enclosure: keep the individual's place (a resident added or removed only walks it back); another enclosure: start afresh at its slot.
          const known = this.motions.get(rabbit.id);
          if (known && known.group === enclosure.id) {
            motion = known.motion;
            if (known.tier !== tier || JSON.stringify(motion.layout?.zone) !== JSON.stringify(motionLayout?.zone)) this.life.interrupt(rabbit.id);
            // An upgrade moves the footprint's centre but not the ground: keep the rabbit where it stands, then it walks to its new place.
            if (known.tier !== tier) {
              const dx = known.center.x - center.x, dy = known.center.y - center.y;
              for (const point of [motion.local, motion.from, motion.to]) { point.x += dx; point.y += dy; }
            }
            retargetRabbitMotion(motion, offset, residents.length, motionLayout); known.tier = tier; known.center = center;
          } else { motion = createRabbitMotion(rabbit.id, offset, residents.length, motionLayout); this.motions.set(rabbit.id, {group: enclosure.id, tier, center, motion}); }
          walkers.add(rabbit.id);
        }
        const start = motion ? {x: center.x + motion.local.x, y: center.y + motion.local.y} : base;
        const object = this.add.container(start.x, start.y).setScale(VISUAL.rabbit.scale).setDepth(start.y);
        const body = this.add.container(0, 0), shadow = this.add.ellipse(0, 10, 35, 12, 0x6b7755, .16);
        object.add([shadow, body]);
        const art = artForRabbit(rabbit); // Its evolved drawing is already EVOLVED_SCALE bigger.
        const view = {object, body, center, group: enclosure.id, motion, nest: enclosure.kind === 'nest', lift: 0, pivot: art ? this.spritePivot(art) : {x: 0, y: -3}, native: art ? art.facing : 1 as const, base, phase: index * 2 + Number(rabbit.id.split('-')[1]), fedUntil: 0};
        if (art) {
          const sprite = this.add.image(0, art.groundY, art.texture).setOrigin(.5, 1);
          sprite.setScale(art.worldWidth / art.width); // Uniform scale preserves the original proportions.
          body.add(sprite);
          let flames: Phaser.GameObjects.Image | undefined;
          if (rabbit.species === 'ardent') {
            const key = 'ardent-flame-overlay';
            if (!this.textures.exists(key)) {
              const canvas = this.textures.createCanvas(key, art.width, art.height)!;
              const context = canvas.context;
              context.drawImage(this.textures.get(art.texture).getSourceImage() as HTMLImageElement, 0, 0);
              const pixels = context.getImageData(0, 0, art.width, art.height);
              pixels.data.set(deriveArdentFlames(pixels.data, art.width, art.height));
              context.putImageData(pixels, 0, 0); canvas.refresh();
            }
            flames = this.add.image(0, art.groundY, key).setOrigin(.5, 1).setScale(sprite.scaleX).setAlpha(.24);
            body.add(flames);
          }
          // No blink or nose patch on an evolved drawing: they were painted on the v1 head only.
          const blinkArt = art.evolved ? undefined : rabbitBlinkArt(rabbit.species);
          const patches = blinkArt?.patches.map(patch => {
            const placement = rabbitPatchPlacement(art, patch);
            const image = this.add.image(placement.x, placement.y, patch.texture).setOrigin(0, 0).setScale(placement.scale).setVisible(false);
            body.add(image); return image;
          });
          const face = patches ? {seed: rabbitFaceSeed(rabbit.id), eyes: patches[0], nose: patches[1]} : undefined;
          let crown: Phaser.GameObjects.Image | undefined;
          if (wearsCrown(rabbit) && this.textures.exists(CROWN_ART.texture)) {
            // On the per-species head anchor, in native picture space: the body mirrors, hops and squashes it with the sprite.
            const place = crownPlacement(art, crownAnchor(rabbit.species, art.facing, !!art.evolved));
            crown = this.add.image(place.x, place.y, CROWN_ART.texture).setOrigin(.5, CROWN_SEAT).setScale(place.scale).setAngle(place.angle);
            body.add(crown);
          }
          let legendary: LegendaryView | undefined;
          if (isLegendaryShow(rabbit.species) && shouldShowLegendaryView(rabbit.species, art) && legendaryMeadowArt(rabbit.species, art).every(a => this.textures.exists(a.texture))) {
            let clock = this.legendaryClocks.get(rabbit.id);
            if (!clock || clock.species !== rabbit.species) { clock = new LegendaryClock(rabbit.species, rabbit.id); this.legendaryClocks.set(rabbit.id, clock); }
            legendary = new LegendaryView(this, rabbit.id, rabbit.species, {object, body, sprite, art, pivot: view.pivot, motion}, clock);
          }
          let benny: BennyView | undefined;
          if (rabbit.species === BENNY_ID && this.textures.exists(BENNY_ATLAS.texture)) {
            let clock = this.bennyClocks.get(rabbit.id);
            if (!clock) { clock = new BennyClock(rabbit.id); this.bennyClocks.set(rabbit.id, clock); }
            benny = new BennyView(this, rabbit.id, {object, body, sprite, shadow, art, motion}, clock);
          }
          let magicien: MagicienView | undefined;
          if (rabbit.species === 'magicien' && art.evolved && this.textures.exists(MAGICIEN_ART.circle.texture) && this.textures.exists(MAGICIEN_ART.star.texture)) {
            let clock=this.magicienClocks.get(rabbit.id); if(!clock){clock=new MagicienClock(rabbit.id);this.magicienClocks.set(rabbit.id,clock);}
            magicien=new MagicienView(this,rabbit.id,{object,body,sprite,shadow,art},clock);
          }
          if (crown) body.bringToTop(crown); // Above a legendary's open snout or part.
          this.animals.add(object);
          this.rabbitViews.push({id: rabbit.id, ears: [], sprite, art, face, flames, crown, legendary, benny, magicien, ...view});
          return;
        }
        const coat = proceduralCoat(SPECIES[rabbit.species].art), color = Phaser.Display.Color.HexStringToColor(coat.body).color, patch = Phaser.Display.Color.HexStringToColor(coat.patch).color;
        const ears = coat.lop ? [this.add.ellipse(-19, -6, 10, 29, color), this.add.ellipse(19, -6, 10, 29, color)] :
          [this.add.ellipse(-7, -24, 8, 26, color), this.add.ellipse(7, -25, 8, 26, coat.frost ? patch : color)];
        if (coat.wings) {
          const wings = this.add.graphics(); wings.fillStyle(coat.plumage ? 0x86b9d0 : 0xfff9ee); wings.lineStyle(1.4, 0x8b9cb4);
          for (const side of [-1, 1]) {
            const points = [{x: 12, y: 0}, {x: 26, y: -17}, {x: 32, y: -11}, {x: 27, y: 6}, {x: 17, y: 9}].map(p => ({x: p.x * side, y: p.y}));
            wings.fillPoints(points, true); wings.strokePoints(points, true);
          }
          body.add(wings);
        }
        body.add([...ears,
          this.add.ellipse(0, 0, 33, 27, color), this.add.ellipse(8, 2, 13, 18, patch),
          this.add.circle(-6, -7, 2, 0x3e332b), this.add.circle(6, -7, 2, 0x3e332b), this.add.circle(0, 0, 2, 0xbc8990), this.add.circle(17, 5, 6, color)]);
        const details = this.add.graphics(); body.add(details);
        if (coat.flame) {
          details.fillStyle(0xda8469); details.fillPoints([{x: -6, y: -14}, {x: -7, y: -23}, {x: 0, y: -31}, {x: 1, y: -22}, {x: 6, y: -26}, {x: 7, y: -16}], true);
          details.fillStyle(0xffe1a3); details.fillTriangle(-3, -15, 0, -24, 4, -15);
        }
        if (coat.glasses) { details.lineStyle(2, 0x555b70); details.strokeCircle(-6, -7, 5); details.strokeCircle(6, -7, 5); details.lineBetween(-1, -7, 1, -7); details.lineBetween(-11, -8, -15, -10); details.lineBetween(11, -8, 15, -10); }
        if (coat.metal) { details.fillStyle(0xeef3f8); details.fillPoints([{x: 8, y: 7}, {x: 12, y: 3}, {x: 16, y: 7}, {x: 12, y: 11}], true); details.lineStyle(1, 0x6e7a91); details.lineBetween(8, 7, 12, 11); }
        if (coat.plumage) { details.fillStyle(0xedc87d); details.fillEllipse(-3, -17, 5, 14); details.fillStyle(0xd98e81); details.fillEllipse(3, -15, 5, 12); }
        if (coat.frost) { details.lineStyle(1.5, 0xeafdff); details.lineBetween(10, -19, 18, -19); details.lineBetween(14, -23, 14, -15); }
        this.animals.add(object); this.rabbitViews.push({id: rabbit.id, ears, ...view});
      });
    }
    for (const id of [...this.motions.keys()]) if (!walkers.has(id)) this.motions.delete(id);
    for (const id of [...this.legendaryClocks.keys()]) if (!this.rabbitViews.some(r => r.id === id && r.legendary)) this.legendaryClocks.delete(id);
    for (const id of [...this.bennyClocks.keys()]) if (!this.rabbitViews.some(r => r.id === id && r.benny)) this.bennyClocks.delete(id);
    for (const id of [...this.magicienClocks.keys()]) if (!this.rabbitViews.some(r => r.id === id && r.magicien)) this.magicienClocks.delete(id);
    this.rabbitGroups.clear();
    for (const rabbit of this.rabbitViews) {
      let group = this.rabbitGroups.get(rabbit.group);
      if (!group) { group = []; this.rabbitGroups.set(rabbit.group, group); }
      group.push(rabbit);
    }
    this.animals.sort('depth');
    // A rebuilt body starts in the pose of its state, never flat in the middle of a hop or somersault.
    for (const rabbit of this.rabbitViews) {
      const pose = rabbit.motion ? rabbitPose(rabbit.motion) : {lift: 0, squashX: 1, squashY: 1, facing: 1 as const, rotation: 0};
      rabbit.lift = pose.lift; this.poseBody(rabbit, pose);
    }
  }
  /** A point of the body (body space) in the scene, following hop, squash, mirror and rotation. */
  private bodyPoint(rabbit: VisualRabbit, x: number, y: number): Point {
    const world = rabbit.body.getWorldTransformMatrix().transformPoint(x, y); return {x: world.x, y: world.y};
  }
  /** Mean of the opaque pixels' bounding box, from a small copy of the picture (cheap, once per texture). */
  private spritePivot(art: RabbitArt): Point {
    const known = this.pivots.get(art.texture); if (known) return known;
    const scale = art.worldWidth / art.width; let pivot = {x: 0, y: art.groundY - art.height * scale / 2};
    try {
      const size = 64, canvas = document.createElement('canvas'); canvas.width = size; canvas.height = Math.max(1, Math.round(size * art.height / art.width));
      const context = canvas.getContext('2d', {willReadFrequently: true});
      if (context) {
        context.drawImage(this.textures.get(art.texture).getSourceImage() as CanvasImageSource, 0, 0, canvas.width, canvas.height);
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data; let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] >= 32) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        if (maxX >= 0) {
          const k = art.width / canvas.width, cx = (minX + maxX + 1) / 2 * k, cy = (minY + maxY + 1) / 2 * (art.height / canvas.height);
          pivot = {x: (cx - art.width / 2) * scale, y: art.groundY + (cy - art.height) * scale};
        }
      }
    } catch { /* the picture centre is an acceptable pivot */ }
    this.pivots.set(art.texture, pivot); return pivot;
  }
  /** Body pose: mirror, compression against the ground contact, height, and a rotation about the body centre that keeps that centre in place. */
  /** Who may run in a chase: never Benny, a legendary in its show, a Magician in his act, a rabbit being touched or talking. */
  private chaseRunners(visible: ReadonlySet<string>, speaking?: string): ChaseRunner[] {
    return this.playfulRabbits(visible, speaking).map(r => ({...r, available: r.available && !this.snowballs.isFighting(r.id)}));
  }
  /** The rabbits free for a chase or a snowball fight (a picnic or snowman guest is not). */
  private playfulRabbits(visible: ReadonlySet<string>, speaking?: string): ChaseRunner[] {
    const benny = this.current?.rabbits.find(r => r.species === BENNY_ID)?.id;
    return this.rabbitViews.flatMap(r => r.motion && !r.nest ? [{id: r.id, group: r.group, motion: r.motion,
      available: r.id !== benny && !r.benny && visible.has(r.id) && !r.legendary?.clock.act && !r.magicien?.busy && this.cozyInteraction.active?.id !== r.id && speaking !== r.id && !this.gathered(r.id)}] : []);
  }
  private poseBody(rabbit: VisualRabbit, pose: {lift: number; squashX: number; squashY: number; facing: 1 | -1; rotation: number; nuzzle?: number}): void {
    const scaleX = pose.facing * rabbit.native * pose.squashX, p = rabbit.pivot, c = Math.cos(pose.rotation), s = Math.sin(pose.rotation);
    const px = scaleX * p.x, py = pose.squashY * p.y;
    // The visible centre stays where the picture's own orientation puts it: turning mirrors the body about that centre
    // (asymmetric transparent margins cause no sideways jump), and the rotation of a somersault keeps it in place too.
    rabbit.body.setRotation(pose.rotation).setScale(scaleX, pose.squashY)
      .setPosition(pose.squashX * p.x - (c * px - s * py) + pose.facing * (pose.nuzzle ?? 0), BODY_PIVOT * (1 - pose.squashY) - pose.lift + py - (s * px + c * py));
  }
  /** A finished birth: a heart in a cream bubble; touching it sends the baby to the nursery. */
  private heartBubble(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0x6e4a3a, .25); g.fillRoundedRect(-25, -21, 50, 46, 16);
    g.fillStyle(0xfff7dc); g.lineStyle(2, 0xe7c9a4); g.fillRoundedRect(-25, -24, 50, 46, 16); g.strokeRoundedRect(-25, -24, 50, 46, 16);
    const icon = this.add.image(0, -3, HEART_TEXTURE).setDisplaySize(32, 32);
    return this.add.container(x, y, [g, icon]).setSize(50, 46);
  }
  /** Glides the camera to a building, zoom unchanged; instant when reduced motion is requested. */
  focusBuilding(id: string): void {
    const b = this.current?.buildings.find(b => b.id === id); if (!b || !this.cameras?.main) return;
    const from = {x: this.view.x, y: this.view.y}, to = this.view.centered(toScreen(buildingCenter(b)));
    const go = (t: number) => { this.view.x = from.x + (to.x - from.x) * t; this.view.y = from.y + (to.y - from.y) * t; this.view.clamp(); this.applyCamera(); };
    this.focusTween?.stop(); this.focusTween = null;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { go(1); return; }
    this.focusTween = this.tweens.addCounter({from: 0, to: 1, duration: 650, ease: 'Sine.easeInOut',
      // A pan or pinch by the player takes over at once.
      onUpdate: tween => { if (this.view.busy) { tween.stop(); this.focusTween = null; return; } go(tween.getValue() ?? 1); },
      onComplete: () => { this.focusTween = null; }});
  }
  private drawBubbles(now = this.simulationNow()): void {
    this.bubbles.removeAll(true); this.bubbleHits = [];
    for (const b of this.current?.buildings ?? []) {
      const amount = Math.floor(b.incomeUnits / HOUR);
      let text = '', kind: 'income' | 'grass' | 'building' = 'building';
      if (b.kind === 'enclosure' && shouldShowIncomeBubble(amount, habitatStats(b).cap)) { text = 'income'; kind = 'income'; }
      if (b.kind === 'farm' && b.order && b.order.endsAt <= now) { text = 'food'; kind = 'grass'; }
      if (b.kind==='nest' && b.breeding && b.breeding.endsAt<=now) text='birth';
      if (b.kind === 'nursery' && readyNurseryBabies(b, now).length) text = 'Prêt !';
      if (b.kind === 'salon' && careReady(this.current!, now)) text = 'trip'; // The care is over: the rabbit waits to be welcomed back.
      if (b.kind === 'agency' && tripReady(this.current!, now)) text = 'trip'; // A traveller is back: Coco waits with them. // One bubble for any ready baby.
      if (!text) continue;
      const p = toScreen(buildingCenter(b)); p.y += b.kind === 'farm' ? FARM_ART.harvestY : b.kind==='nest' ? NEST_ART.actionY : b.kind==='nursery' ? NURSERY_ART.actionY : b.kind==='agency' ? AGENCY_ART.actionY : b.kind==='salon' ? SALON_ART.actionY : b.kind==='forest' ? FOREST_ART.actionY : -72;
      const bubble = kind === 'income' ? coinBubble(this, p.x, p.y, amount, amount >= habitatStats(b).cap) : text === 'food' ? foodBubble(this, p.x, p.y, b.order!.grass ?? ORDERS[b.order!.recipe].grass) : text === 'birth' || text === 'trip' ? this.heartBubble(p.x, p.y) : this.add.text(p.x, p.y, text, {fontFamily: 'Arial', fontSize: '17px', color: '#3b4d2d', backgroundColor: '#fff7dc', padding: {x: 13, y: 10}}).setOrigin(.5);
      if (text === 'birth' && this.tutorialTarget === 'birth') {
        const halo=this.add.graphics().lineStyle(4,0xffcf55).strokeEllipse(p.x,p.y,bubble.width+12,bubble.height+12);this.bubbles.add(halo);
        const hand = this.add.text(p.x + 34,p.y - 28,'👇',{fontSize:'28px'}).setOrigin(.5); this.bubbles.add(hand);
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const tween=this.tweens.add({targets:hand,y:p.y-35,duration:500,yoyo:true,repeat:-1});hand.once('destroy',()=>tween.remove());
        }
      }
      this.bubbles.add(bubble); this.bubbleHits.push({point: p, width:bubble.width, height:bubble.height, selection: {kind: text === 'birth' ? 'birth' : b.kind === 'nursery' ? 'nurseryBubble' : kind, id: b.id}});
    }
  }
  private gridZoom = 0;
  /** Re-records the placement overlay from geometry computed by drawGrid; only its zoom-relative widths change. */
  private gridStroke: (() => void) | null = null;
  private placementLines(active: Footprint | null): [Point, Point][] {
    return this.current ? placementGrid(this.current, active).map(line => [finePoint(line.from.x, line.from.y), finePoint(line.to.x, line.to.y)]) : [];
  }
  private strokePlacementContext(lines: [Point, Point][]): void {
    this.grid.lineStyle(1 / this.view.zoom, 0x396447, PLACEMENT_GRID.opacity);
    for (const [a, b] of lines) this.grid.lineBetween(a.x, a.y, b.x, b.y);
  }
  /** Placement geometry depends on the state and the candidate, never on the camera: a zoom only re-strokes it. */
  private setGridStroke(stroke: () => void): void {
    this.gridStroke = () => { this.grid.clear(); this.gridZoom = this.view.zoom; stroke(); };
    this.gridStroke();
  }
  private drawGrid(): void {
    this.syncTutorialHand();
    this.grid.clear(); this.markers.clear(); this.buildingGhost?.setVisible(false); this.nurseryOverlays?.hideGhost(); this.gridZoom = this.view.zoom; this.gridStroke = null;
    this.purchaseLabels.splice(0).forEach(label => label.destroy());
    if (this.purchase && this.current) {
      for (const b of this.current.buildings.filter(b => !habitatEntryReason(this.current!, b, this.purchase!.species))) {
        const p = finePoint(b.x, b.y), selected = b.id === this.purchase.selected;
        this.grid.lineStyle(selected ? 4 : 2, selected ? 0xd99b32 : 0x396447);
        this.grid.fillStyle(selected ? 0xf4d58b : 0xe5ffd2, .25);
        this.grid.fillRect(p.x,p.y,VISUAL.grid.width,VISUAL.grid.depth);
        this.grid.strokeRect(p.x,p.y,VISUAL.grid.width,VISUAL.grid.depth);
        const free = habitatStats(b).capacity - this.current.rabbits.filter(r => r.enclosureId === b.id).length;
        const at = toScreen({x: p.x + VISUAL.grid.width / 2, y: p.y + VISUAL.grid.depth});
        this.purchaseLabels.push(this.add.text(at.x, at.y, `${free} place${free>1?'s':''} libre${free>1?'s':''}`, {fontSize:'14px', color:'#24462d',backgroundColor:'#fff9e9',padding:{x:4,y:3}}).setOrigin(.5,0).setDepth(3));
      }
      return;
    }
    if (this.expanding && this.current) {
      const available = purchasableParcels(this.current);
      for (const id of purchasableParcels(this.current)) {
        const parcel = PARCELS[id], point = gridPoint(parcel.x, parcel.y);
        const width = ISLAND.parcelWidth, height = ISLAND.parcelDepth;
        const selected = this.expansionParcelId === id;
        const sketch = selected || (!this.expansionParcelId && id === available[0]);
        if (sketch) {this.grid.fillStyle(0xeee9d5, .28); this.grid.fillRoundedRect(point.x + 3, point.y + 3, width - 6, height - 6, 10);}
        this.grid.lineStyle(selected ? 4 : 2, selected ? 0xf4d58b : 0xe5f3df, .8);
        this.grid.strokeRoundedRect(point.x + 3, point.y + 3, width - 6, height - 6, 10);
        const {x, y} = toScreen({x: point.x + width / 2, y: point.y + height / 2});
        this.markers.fillStyle(0xeef5d3, .85); this.markers.fillCircle(x, y, 17);
        this.markers.lineStyle(2, 0x577951); this.markers.lineBetween(x - 7, y, x + 7, y); this.markers.lineBetween(x, y - 7, x, y + 7);
        if (sketch) this.purchaseLabels.push(this.add.text(x, y + 32, 'Terrain réservé', {fontFamily:'Arial',fontSize:'20px',color:'#57735b',backgroundColor:'#f7f4e4',padding:{x:10,y:5}}).setOrigin(.5).setDepth(3));
      }
      return;
    }
    if(this.placement){this.drawBuildingGrid();return;}
    if(this.arrangement)this.drawDecorationGrid();
  }
  private drawBuildingGrid(): void {
    if(!this.current || !this.placement)return;
    const p=this.placement;
    const moving=this.current.buildings.find(b=>b.id===p.movingId), active=p.cell?{...p.cell,kind:p.kind,footprintTier:moving?.footprintTier,formerFootprint:moving?.formerFootprint,farmLevel:moving?.farmLevel}:moving;
    const lines=this.placementLines(active?buildingFootprint(active):null);
    if(!p.cell){this.setGridStroke(()=>{
      this.strokePlacementContext(lines);
      if(this.tutorialCell) { const c=finePoint(this.tutorialCell.x,this.tutorialCell.y); this.grid.fillStyle(0xffd966,.5);this.grid.fillRect(c.x,c.y,VISUAL.grid.width,VISUAL.grid.depth);this.grid.lineStyle(3/this.view.zoom,0xffd966);this.grid.strokeRect(c.x,c.y,VISUAL.grid.width,VISUAL.grid.depth); }
    });return;}
    const valid=!buildingPlacementReason(this.current,p.cell.x,p.cell.y,p.movingId,p.kind),corner=finePoint(p.cell.x,p.cell.y),center=toScreen(buildingCenter(active!)),size=buildingFootprint(active!),cellsWide=VISUAL.grid.width*size.width/FINE_GRID,cellsDeep=VISUAL.grid.depth*size.height/FINE_GRID;
    this.setGridStroke(()=>{
      this.strokePlacementContext(lines);
      this.grid.fillStyle(valid?0xe5ffd2:0xf5b7b1,.3);this.grid.fillRect(corner.x,corner.y,cellsWide,cellsDeep);
      this.grid.lineStyle(2.5/this.view.zoom,valid?0x396447:0xa54242);this.grid.strokeRect(corner.x,corner.y,cellsWide,cellsDeep);
    });
    const habitat=p.kind==='enclosure'?(moving?.habitat??{type:p.habitatType??'universal',level:1 as const}):null;
    const illustration=habitatArtFor(habitat ?? undefined,moving?.footprintTier);
    if(illustration&&!this.textures.exists(illustration.texture))return;
    if(this.requiredArt(this.current).some(art=>!this.textures.exists(art.texture)))return;
    if(!this.buildingGhost)this.buildingGhost=this.add.image(0,0,this.buildingTexture({kind:p.kind,habitat,footprintTier:moving?.footprintTier,farmLevel:moving?.farmLevel,id:moving?.id})).setDepth(1.5).setAlpha(.55).setScale(.5);
    const tint=valid?0xe4ffb5:0xf3a6a1;
    this.buildingGhost.setTexture(this.buildingTexture({kind:p.kind,habitat,footprintTier:moving?.footprintTier,farmLevel:moving?.farmLevel,id:moving?.id})).setTint(tint).setVisible(!this.photo);
    this.positionBuildingArt(this.buildingGhost, center.x, center.y, p.kind, habitatArtFor(habitat ?? undefined, moving?.footprintTier), p.kind === 'enclosure' ? enclosureScale(moving ?? {}) : 1, moving?.id);
    // The nursery's preview carries its four cushion states, with the ghost base's own opacity and valid/invalid tint.
    if(p.kind==='nursery')this.nurseryOverlays?.showGhost(this.current,moving??null,center,{alpha:this.buildingGhost.alpha,tint},!this.photo);
  }
  private drawDecorationGrid(): void {
    if (!this.current) return;
    const owned = this.current.decorations.find(d => d.id === this.ghost?.id) ?? (this.ghost?.catalogId ? {id: this.ghost.id, catalogId: this.ghost.catalogId} : null);
    if (!this.ghost?.location || !owned || this.ghost.location.kind === 'inventory') return;
    const valid = !catalogDecorationPlacementReason(this.current, owned.catalogId, this.ghost.location, owned.id);
    const p = this.decorationPoint(this.ghost.location, owned.catalogId)!;
    if (this.ghost.location.kind === 'outside') {
      const loc = this.ghost.location, size = footprint(owned.catalogId, loc.rotation), corner = gridPoint(loc.x / 4, loc.y / 4);
      const lines = this.placementLines({...loc, ...size});
      this.setGridStroke(() => {
        this.strokePlacementContext(lines);
        this.grid.fillStyle(valid ? 0xe5ffd2 : 0xf5b7b1, .6); this.grid.fillRect(corner.x, corner.y, size.width * VISUAL.grid.width / 4, size.height * VISUAL.grid.depth / 4);
        this.grid.lineStyle(2.5 / this.view.zoom, valid ? 0x396447 : 0xa54242);
        this.grid.strokeRect(corner.x, corner.y, size.width * VISUAL.grid.width / 4, size.height * VISUAL.grid.depth / 4);
      });
    }
    this.markers.lineStyle(3, valid ? 0x396447 : 0xa54242);
    if (valid) { this.markers.lineBetween(p.x - 8, p.y + 5, p.x - 2, p.y + 11); this.markers.lineBetween(p.x - 2, p.y + 11, p.x + 10, p.y - 3); }
    else { this.markers.lineBetween(p.x - 8, p.y - 8, p.x + 8, p.y + 8); this.markers.lineBetween(p.x - 8, p.y + 8, p.x + 8, p.y - 8); }
  }
  private tap(screen: Point): void {
    // Cells are read on the ground plane; rabbits, bubbles and decorations are hit where they are drawn.
    const world = this.view.world(screen), ground = toGround(world), cell = gridCell(ground);
    if (this.photo) return;
    if (this.rabbitDrops) {
      const arrow = this.dropHits.find(h => Math.abs(world.x-h.point.x)*this.view.zoom <= 22 && Math.abs(world.y-h.point.y)*this.view.zoom <= 22);
      const b = this.current ? buildingAt(this.current, fineCell(ground)) : null;
      const id = arrow?.id ?? (b?.kind === 'enclosure' ? b.id : null);
      if (id) this.select({kind:'building',id});
      return;
    }
    if (this.purchase) {
      const b = this.current ? buildingAt(this.current, fineCell(ground)) : null;
      if (b && !habitatEntryReason(this.current!, b, this.purchase.species)) this.select({kind:'building',id:b.id});
      return;
    }
    if (this.placement || (this.arrangement && this.ghost)) { this.select({kind:'fineCell',...fineCell(ground)}); return; }
    let nearestBubble: (typeof this.bubbleHits)[number] | null = null, bubbleDistance = Infinity;
    for (const bubble of this.bubbles.visible && this.bubbles.alpha >= .65 ? this.bubbleHits : []) {
      const p = this.view.screen(bubble.point), dx = p.x - screen.x, dy = p.y - screen.y;
      if (Math.abs(dx) <= Math.max(22, Math.min(39, bubble.width * this.view.zoom / 2 + 3)) &&
          Math.abs(dy) <= Math.max(22, Math.min(25, bubble.height * this.view.zoom / 2 + 3)) && dx * dx + dy * dy < bubbleDistance) {
        nearestBubble = bubble; bubbleDistance = dx * dx + dy * dy;
      }
    }
    if (nearestBubble) { this.select(nearestBubble.selection); return; }
    if (this.expanding) {const id=this.current ? expansionTarget(this.current,cell.x,cell.y) : null;if(id)this.select({kind:'extension',parcelId:id});return;}
    if (this.placement) {this.select({kind:'fineCell',...fineCell(ground)});return;}
    if (this.arrangement) {
      const chosen = this.current?.decorations.find(d => d.id === this.ghost?.id);
      if (!chosen) {
        const decorationId = this.decorationAt(screen);
        if (decorationId) { this.select({kind: 'decoration', id: decorationId}); return; }
      }
      if (chosen) {
        this.select({kind: 'fineCell', ...fineCell(ground)}); return;
      }
      const decorationId = this.decorationAt(screen);
      if (decorationId) { this.select({kind: 'decoration', id: decorationId}); return; }
      const home=this.current?buildingAt(this.current,fineCell(ground)):null;
      this.select(home ? {kind: 'building', id: home.id} : {kind: 'empty'}); return;
    }
    // A ready baby on its cushion opens its own reception card; a growing one leaves the touch to the nursery.
    const nursery = this.current?.buildings.find(b => b.kind === 'nursery');
    const birthId = nursery ? nurseryBabyHit(nursery, this.current!.lastSimulatedAt, toScreen(buildingCenter(nursery)), world, this.view.zoom) : null;
    if (birthId) { this.select({kind: 'nurseryBaby', id: birthId}); return; }
    // Benny in the air: a touch on her opens her card.
    if (this.bennyAway && this.bennyFlight?.hit(this.view.world(screen))) { this.select({kind: 'rabbit', id: this.bennyAway}); return; }
    const grounded = this.rabbitViews.filter(r => r.id !== this.bennyAway);
    let closest = rabbitHit(screen, grounded.flatMap(r => {
      if (r.sprite && r.art) {
        // Reference images use their own alpha silhouette, avoiding rectangular hits on adjacent residents.
        const world = this.view.world(screen);
        const local = r.sprite.getWorldTransformMatrix().applyInverse(world.x, world.y);
        const x = Math.floor(local.x + r.art.width / 2), y = Math.floor(local.y + r.art.height);
        if (x < 0 || y < 0 || x >= r.art.width || y >= r.art.height ||
            this.textures.getPixelAlpha(x, y, r.art.texture) < 32) return [];
      }
      return [{id: r.id, point: this.view.screen(this.bodyPoint(r, 0, -7)), depth: r.object.y,
        radius: r.sprite ? Infinity : VISUAL.rabbit.hitRadius * Math.min(1,this.view.zoom/.8)}];
    }));
    if (!closest) closest = rabbitHit(screen, grounded.filter(r => r.sprite && r.art).map(r => ({
      id: r.id, point: this.view.screen(this.bodyPoint(r, 0, -7)), depth: r.object.y, radius: 22
    })));
    // A touched legendary only opens its sheet, whose show button plays the show (owner, 4 November 2026); Benny keeps her touch.
    if (closest) { this.rabbitViews.find(r => r.id === closest!.id)?.benny?.tap(); this.select({kind: 'rabbit', id: closest.id}); return; }
    const decorationId = this.decorationAt(screen);
    if (decorationId) { this.select({kind: 'decoration', id: decorationId}); return; }

    const building=this.current?buildingAt(this.current,fineCell(ground)):null;
    if (!building && this.current?.jumpIsland && this.jumpIslandHit(world)) { this.select({kind: 'jumpIsland'}); return; }
    if (!building && this.marketHit(world)) { this.select({kind: 'christmasMarket'}); return; }
    this.select(building ? {kind: 'building', id: building.id} : {kind: 'empty'});
  }
  /** The islet's picture, by its painted silhouette (a little margin on small zooms). */
  private jumpIslandHit(world: Point): boolean {
    const image = this.jumpIslandImage, f = jumpIslandFrame(); if (!image) return false;
    if (world.x < f.left || world.x > f.right || world.y < f.top || world.y > f.bottom) return false;
    const local = image.getWorldTransformMatrix().applyInverse(world.x, world.y), art = JUMP_ISLAND_ART;
    const x = Math.floor(local.x + art.width * art.originX), y = Math.floor(local.y + art.height * art.originY);
    return x < 0 || y < 0 || x >= art.width || y >= art.height || !this.textures.exists(art.texture) ? true : this.textures.getPixelAlpha(x, y, art.texture) >= 16;
  }
  /** The Christmas market's picture, by its painted silhouette (only while it is drawn). */
  private marketHit(world: Point): boolean {
    const image = this.marketImage, f = christmasMarketFrame(), art = CHRISTMAS_MARKET_ART; if (!image) return false;
    if (world.x < f.left || world.x > f.right || world.y < f.top || world.y > f.bottom) return false;
    const local = image.getWorldTransformMatrix().applyInverse(world.x, world.y), w = image.frame.realWidth, h = image.frame.realHeight;
    const x = Math.floor(local.x + w * art.originX), y = Math.floor(local.y + h * art.originY);
    return x < 0 || y < 0 || x >= w || y >= h ? true : this.textures.getPixelAlpha(x, y, art.texture) >= 16;
  }
  /** Interpolate the canonical simulation clock; resynchronise on every snapshot, including laboratory time changes. */
  private simulationNow(): number {
    return (this.current?.lastSimulatedAt ?? 0) + Math.max(0, this.time.now - this.simulationReceivedAt);
  }
  private syncProgressBars(): void {
    const s = this.current;
    const now = this.simulationNow();
    // Hand over to the existing bubble at the same instant the last segment disappears.
    const crossed = (end: number) => this.progressNow < end && end <= now;
    if (s?.buildings.some(b => (b.kind === 'nest' && b.breeding && crossed(b.breeding.endsAt)) ||
      (b.kind === 'farm' && b.order && crossed(b.order.endsAt)) ||
      (b.kind === 'nursery' && b.nursery?.babies.some(baby => crossed(baby.readyAt)))) ||
      s?.travel?.trips.some(trip => crossed(trip.endsAt)) || (!!s?.care && crossed(s.care.endsAt))) this.drawBubbles(now);
    this.progressNow = now;
    this.progressViews?.sync(progressBars(s, {photo: this.photo, movingId: this.placement?.movingId}, now), s?.buildings.map(b => b.id) ?? []);
    this.progressUpdatedAt = this.time.now;
  }
  update(time: number): void {
    this.drawRabbitDrops(time);
    this.placeTutorialHand(time);
    if (this.time.now - this.progressUpdatedAt >= 100) this.syncProgressBars();
    // A pinch changes the zoom on every pointer event: re-stroke the cached overlay at most once per frame.
    if (this.gridStroke && this.gridZoom !== this.view.zoom) this.gridStroke();
    // Scene time since the last frame; a long gap (inactive tab) is cut short inside the motion step: no jump.
    const dt = this.motionClock === null ? 0 : time - this.motionClock; this.motionClock = time;
    let dadi: ReturnType<DadiReactions['step']> = {speech: null, started: null}, dadiObscured = false;
    const dadiBounds = this.dadiSpeech ? {width: this.scale.width, height: this.scale.height, top: document.getElementById('hud')?.getBoundingClientRect().bottom ?? 0} : null;
    if (this.dadiSpeech) {
      const active = !this.photo && !document.hidden && document.getElementById('loading-screen')?.hidden !== false;
      dadiObscured = document.getElementById('game-panel')?.hidden === false || !!document.querySelector('dialog[open]');
      // A picnic guest stays seated at the cloth: Dadi neither speaks about it nor makes it get up (audit, 4 November 2026).
      const visible = this.rabbitViews.filter(r => r.id !== this.bennyAway && !this.gathered(r.id) && !this.snowballs.isFighting(r.id) && dadiHeadVisible(this.dadiHead(r), dadiBounds!)).map(r => r.id);
      dadi = this.dadi.step(dadiObscured ? 0 : dt, active, dadiObscured ? [] : visible);
      if(dadi.started?.id===this.cozyInteraction.active?.id)this.cozyInteraction.reset();
      if (dadi.started?.salto) {
        this.life.interrupt(dadi.started.id);
        const motion = this.rabbitViews.find(r => r.id === dadi.started!.id)?.motion;
        if (motion) triggerWelcomeSalto(motion, matchMedia('(prefers-reduced-motion: reduce)').matches);
      }
    }
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Christmas: evening and night over the meadow and its sky, and the snow (it keeps falling in a photo).
    const winterNow = new Date(), christmas = christmasActive();
    this.winter?.update(dt, winterNow, christmas && !document.hidden, reducedMotion);
    this.winterLights?.update(christmas ? garlandLevel(localHour(winterNow)) : 0, reducedMotion ? 0 : time);
    this.sky?.setNight(christmas ? this.winter?.nightNow(winterNow) ?? 0 : 0);
    const lifeActive = !this.photo && !document.hidden && document.getElementById('loading-screen')?.hidden !== false &&
      document.getElementById('game-panel')?.hidden !== false && !document.querySelector('dialog[open]') && !this.placement && !this.arrangement;
    const bounds = {width: this.scale.width, height: this.scale.height, top: document.getElementById('hud')?.getBoundingClientRect().bottom ?? 0};
    // Benny up in the air has no speech nor sleep bubble over her empty place.
    const visibleResidents = new Set(this.rabbitViews.filter(r => r.motion && r.id !== this.bennyAway && dadiHeadVisible(this.dadiHead(r), bounds)).map(r => r.id));
    const visitor=this.cozyInteraction.active;
    this.cozyInteraction.step(dt,lifeActive,!!visitor&&visibleResidents.has(visitor.id)&&this.rabbitViews.some(r=>r.id===visitor.id&&r.motion===visitor.motion&&!r.nest)&&!!this.current?.decorations.some(d=>d.id===visitor.objectId&&d.location.kind==='outside'),reducedMotion);
    if(lifeActive&&!reducedMotion&&dt>=0&&dt<=1000){this.interactionIn-=dt;if(this.interactionIn<=0){this.interactionIn=90000;for(const d of this.current?.decorations??[])if(this.interactionDecoration(d.id))break;}}
    this.stepPicnic(dt);
    this.stepSnowman(dt);
    this.syncChristmasMarket(winterNow);
    if (this.time.now - this.snowmanCheckedAt >= 500) { this.snowmanCheckedAt = this.time.now; this.syncSnowman(); }
    this.life.step(dt, this.rabbitViews.flatMap(r => r.motion ? [{id: r.id, group: r.group, motion: r.motion, nest: r.nest, friendId:this.friends.get(r.id),occupied:this.cozyInteraction.active?.id===r.id||this.gathered(r.id)||this.snowballs.isFighting(r.id), visible: visibleResidents.has(r.id)}] : []),
      lifeActive, reducedMotion, dadi.speech && !this.gathered(dadi.speech.id) ? [dadi.speech.id] : []);
    this.chases.step(dt, this.chaseRunners(visibleResidents, dadi.speech?.id), lifeActive, reducedMotion, this.chaseTest);
    this.chaseTest = false;
    // Christmas: the snowball fights, after the chases (a chaser never throws), while the event is on.
    this.snowballs.step(dt, this.snowballThrowers(visibleResidents, dadi.speech?.id), lifeActive, reducedMotion, christmas, this.snowballTest && christmas);
    this.snowballTest = false;
    this.drawSnowballs();
    this.lifeViews?.begin(this.rabbitViews.map(r => r.id));
    let depthChanged = false;
    for (const rabbit of this.rabbitViews) {
      const previousDepth = rabbit.object.depth;
      const t = time / 1000 + rabbit.phase;
      let lift = 0, squashX = 1, squashY = 1, facing: 1 | -1 = 1, rotation = 0, nuzzle = 0;
      if (rabbit.motion) {
        const motion = rabbit.motion;
        const others = this.neighborPoints;
        others.length = 0;
        // Keep the original sequential update order and observe each neighbor's current mode/position.
        for (const other of this.rabbitGroups.get(rabbit.group) ?? []) {
          if (other === rabbit || !other.motion) continue;
          others.push(other.motion.local);
          if (other.motion.mode === 'walk') others.push(other.motion.to);
        }
        const activity = ['sleep', 'zoom', 'meet', 'kiss'].includes(motion.mode);
        if (rabbit.nest ? lifeActive && visibleResidents.has(rabbit.id) && motion.mode !== 'rest' && (!reducedMotion || motion.mode === 'walk' || motion.mode === 'salto' || motion.mode === 'fed') :
          !activity || lifeActive && visibleResidents.has(rabbit.id)) stepRabbitMotion(motion, dt, others);
        // Benny's act may take over the motion (or carry her along her hops) before the pose is read.
        rabbit.benny?.update({dt, time, active: lifeActive && visibleResidents.has(rabbit.id), reduced: reducedMotion});
        const pose = rabbitPose(motion);
        ({lift, squashX, squashY, facing, rotation} = pose);
        if (rabbit.benny) { squashX *= rabbit.benny.squashX; squashY *= rabbit.benny.squashY; }
        nuzzle = pose.nuzzle ?? 0;
        // The ground point drives position and depth; the hop only lifts the body.
        rabbit.object.setPosition(rabbit.center.x + motion.local.x, rabbit.center.y + motion.local.y).setDepth(rabbit.center.y + motion.local.y);
      } else {
        const position = rabbitPosition(rabbit.base, time, rabbit.phase, 0);
        lift = rabbitFedLift(time, rabbit.phase, rabbit.fedUntil);
        rabbit.object.setPosition(position.x, position.y).setDepth(position.y);
      }
      if (rabbit.legendary) {
        const show = rabbit.legendary;
        show.update({time, dt, active: lifeActive && visibleResidents.has(rabbit.id), reduced: reducedMotion, asleep: rabbit.motion?.mode === 'sleep'});
        lift += show.lift; rotation += show.lean;
      }
      rabbit.magicien?.update(dt,lifeActive && visibleResidents.has(rabbit.id) && magicienFree(rabbit.motion?.mode,
        this.gathered(rabbit.id) || this.cozyInteraction.active?.id === rabbit.id || this.chases.isChasing(rabbit.id) || this.snowballs.isFighting(rabbit.id)),reducedMotion);
      if(rabbit.magicien) lift += rabbit.magicien.lift;
      rabbit.lift = lift;
      if (rabbit.object.depth !== previousDepth) depthChanged = true;
      this.poseBody(rabbit, {lift, squashX, squashY, facing, rotation, nuzzle});
      if (rabbit.flames && rabbit.sprite) {
        const pose = ardentFlamePose(rabbit.id, time, matchMedia('(prefers-reduced-motion: reduce)').matches);
        rabbit.flames.setPosition(pose.x, rabbit.art!.groundY).setScale(rabbit.sprite.scaleX, rabbit.sprite.scaleY * pose.stretch).setAlpha(pose.alpha);
      }
      if (rabbit.face) {
        const state = rabbitFaceState(rabbit.face.seed, time, !rabbit.motion || rabbit.motion.mode === 'rest');
        const asleep = rabbit.motion?.mode === 'sleep', kissing = rabbit.motion?.mode === 'kiss' && rabbit.motion.elapsed > 0;
        // Eyes closed while asleep and during a kiss (owner, 4 November 2026); the nose stays still against the partner's.
        rabbit.face.eyes.setVisible(asleep || kissing || (state & 1) !== 0);
        rabbit.face.nose.setVisible(!asleep && !kissing && (state & 2) !== 0);
        if (rabbit.legendary?.mouthOpen) rabbit.face.nose.setVisible(false);
        if (rabbit.legendary?.submerged) { rabbit.face.eyes.setVisible(false); rabbit.face.nose.setVisible(false); }
      }
      // The crown never floats: hidden whenever the head is not the sprite's (a dive, one of Benny's painted acts).
      if (rabbit.crown && rabbit.sprite) rabbit.crown.setVisible((rabbit.sprite.visible || !!rabbit.legendary?.mouthOpen) && !rabbit.legendary?.submerged);
      rabbit.ears.forEach((ear, index) => { ear.rotation = rabbit.motion?.mode === 'sleep' ? 0 : Math.sin(t * 1.4 + index) * .13; });
      if (lifeActive && visibleResidents.has(rabbit.id) && (rabbit.motion?.mode === 'sleep' || rabbit.motion?.mode === 'kiss')) {
        const head = this.dadiHead(rabbit), world = this.view.world(head);
        this.lifeViews?.show(rabbit.id, rabbit.motion.mode, world.x, world.y, rabbit.motion.elapsed, this.view.zoom);
      }
    }
    if (depthChanged) this.animals?.sort('depth');
    this.stepBennyFlight(dt, reducedMotion);
    const speaker = dadi.speech && this.rabbitViews.find(r => r.id === dadi.speech!.id);
    const head = speaker ? this.dadiHead(speaker) : null;
    this.dadiSpeech?.show(dadiObscured ? null : dadi.speech, head, dadiBounds!);
  }
}
