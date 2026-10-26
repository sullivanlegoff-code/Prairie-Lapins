import {rabbitDropTargets} from './rabbitDropTargets';
import {accountKnown} from '../cloud/accountState';
import {cloudConfig} from '../cloud/config';
import {AccountReminder} from './accountReminder';
import {decorateRabbitText, rabbitTheme, clearRabbitTheme} from '../display/rabbitPresentation';
import {heartIcon} from '../display/currency';
import {cuisineQuotaText, heartGift, recipeHint, orderReadyText} from './economyFeedback';
import type {AudioEngine} from '../audio/audioEngine';
import {mountCuisineActivity} from './CuisineActivity';
import type {RecipeCompletion} from '../../cooktap-prototype/main';
import {missionClaimXp} from '../simulation/progression';
import {PROGRESSION} from '../config/progression';
import {recipeSource} from '../config/species';
import {stateLevelAccess} from '../simulation/levelRights';
import type {LevelAccessTarget} from '../simulation/levelAccess';
import {mountLevelLock} from '../display/LevelLock';
import {PARCELS, PARCEL_IDS, extensionPrice, purchasableParcels, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';
import {setCurrencyText} from '../display/currency';
import {CROP_IDS, cropDuration, cropIcon, statueThumbnail} from '../display/food';
import {COCO_WELCOME, HOST_NAME, agencyThumbnail, cocoPortrait, fromPlace, toPlace} from '../display/agency';
import {travelling} from '../simulation/travel';
import {feedReason, playerLevel} from '../simulation/affection';
import type {Building, Rabbit} from '../state/types';
import {MAX_RABBIT_NAME_LENGTH, normalizeRabbitName} from '../simulation/rabbitNames';
import {HABITATS, HABITAT_TYPES, habitatLevel, habitatPrice, type HabitatType} from '../config/habitats';
import {habitatFootprint} from '../config/habitatSizes';
import {habitatThumbnail} from './habitatThumbnails';
import {FARM_ART, FARM_LEVEL_1_ART} from '../config/farmArt';
import {NEST_ART} from '../config/nestArt';
import {NURSERY_ART} from '../config/nurseryArt';
import {KITCHEN_ART} from '../config/kitchenArt';
import {upgradeFootprintReason} from '../simulation/placement';
import {habitatStats, habitatName, habitatEntryReason, habitatAccepts, welcomeDestinations} from '../simulation/habitats';
import {MAIN_MISSIONS, DAILY_MISSION_GAP, DAILY_MISSION_IDS, DAILY_MISSIONS, DAILY_BONUS, type Reward} from '../config/missions';
import {initialMissionIds, activeMainMissions, availableMissionRewards, mainProgress, dailyCycleStart, dailyCycleEnd, cycleIndexAt, currentDailyMission, dailyOpensAt} from '../simulation/missions';
import type {GameController, Snapshot} from '../application/GameController';
import {AFFECTION_STATUE, BALANCE, HOUR, MARKET, NURSERY, ORDERS, RARE_BIRTH_BONUS, TRAVEL, feedCost, type Destination, SPECIES, SPECIES_IDS, SHOP_SPECIES, growthDuration, type BuildingKind, type SpeciesId, type RabbitType} from '../config/balance';
import type {Command, DecorationLocation, GameState, PattesCommand, TimedStage} from '../state/types';
import {DECORATIONS, DECORATION_IDS, FINE_GRID, ownedDecorationResalePrice, type DecorationId} from '../config/decorations';
import {catalogDecorationPlacementReason, purchaseDecorationReason} from '../simulation/decorations';
import {decorationUrl} from '../display/decorationArt';
import {quoteComplement} from '../simulation/actions';
import {initiationAvailable} from '../simulation/initiation';
import {marketExchanges, marketPrice, marketUnlocked} from '../simulation/market';
import {automaticNurseryTransfer, nurseryBuilding, nurseryFull, nurseryUnlockQuote} from '../simulation/nursery';
import {accelerationCost, quoteAcceleration} from '../simulation/hearts';
import {rabbitIncome} from '../simulation/time';
import type {MeadowScene, MeadowSelection} from '../display/MeadowScene';
import {ActionGate} from './gestures';
import {portrait} from './portraits';
import {PreferenceStore, Sounds} from './preferences';
import {onboardingTask} from './onboarding';
import {PailleDialogue} from './PailleDialogue';
import {guidedStep, type GuideStep} from './guidance';
import {BUILDING_NAMES, REFUSALS, RARITY_NAMES, busyReason, TYPE_NAMES, typeNames, recipeBook, recipePairs, buildingReason, collectionView, incomeWhole, moneyReason, nurseryView, occupants, oddsTexts, oddsView, placementReason, rabbitAvailability, parentBusy, releaseReason, timeLeft, type Placement, type CollectionFilter} from './models';

type ShopTab = 'home' | 'recipes' | 'rabbits' | 'habitats' | 'buildings' | 'decorations';
type View = {kind:'levelRequirement';target:LevelAccessTarget} | {kind: 'missions'; tab: 'main' | 'daily'} | {kind: 'shop'; tab: ShopTab} | {kind: 'building' | 'rabbit' | 'moveRabbit' | 'decoration'; id: string} |
  {kind: 'buyRabbit' | 'species'; species: SpeciesId} | {kind:'extension';parcelId?:ParcelId} | {kind: 'cuisineRabbit' | 'collection' | 'settings' | 'placement' | 'hearts' | 'recipes' | 'arrange' | 'decorationPlacement'} | null;
/** Views drawn as a centred card over the dimmed meadow. Placement, purchase, extension and arrangement views keep the side sheet: they need the island visible. */
const CENTER_CARD_VIEWS: readonly NonNullable<View>['kind'][] = ['rabbit', 'moveRabbit', 'building', 'missions', 'collection', 'recipes', 'hearts', 'species', 'levelRequirement'];
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag); setCurrencyText(element, text); decorateRabbitText(element); element.className = className; return element;
}
const rewardLabel = (r: Reward) => r.resource==='none' ? 'Objectif de collection accompli' : `${r.amount} ${{pattes: 'pattes', grass: 'nourriture', hearts: r.amount === 1 ? 'cœur' : 'cœurs'}[r.resource]}`;
const heartAmount = (n: number) => `${n} ${n === 1 ? 'cœur' : 'cœurs'}`;
/** The painted heart of the HUD, as the affection emblem: affection is there from the first meal. */
function heartEmblem(): HTMLImageElement { return heartIcon(); }

function avatar(species?: SpeciesId, large = false): HTMLElement {
  const element = node('span', '', large ? 'portrait large' : 'portrait'); element.innerHTML = portrait(species); if (species) rabbitTheme(element, species); return element;
}
export class GameUI {
  private accountReminder: AccountReminder;
  private pailleDialogue: PailleDialogue;
  private get stagedOnboarding(): boolean { return this.controller.storageScope !== 'laboratory'; }
  private get onboardingActive(): boolean { const s = this.snapshot.state; return this.stagedOnboarding && s?.startCourse === 'paille-solo' && this.preferences.value.tutorial && !this.preferences.value.tutorialDone && !s.missions.events.welcome; }
  private shopHabitatSpecies: SpeciesId | null = null;
  private view: View = null;
  private purchaseReturn: {view: NonNullable<View>; history: NonNullable<View>[]} | null = null;
  private rabbitDestination: string | null = null;
  private shopRabbitIssue: SpeciesId | null = null;
  private savePurchaseOrigin(): void {
    if (this.view?.kind !== 'shop') return;
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
  private gate = new ActionGate();
  private sounds: Sounds;
  private toastTimer = 0;
  private frame = 0;
  private abort = new AbortController();
  /** The control focused when a menu opened from the meadow; it gets the focus back when that menu closes. */
  private returnFocus: HTMLElement | null = null;
  private oddsOpen = false;
  private collectionFilter: CollectionFilter = {};
  private recipeDetails = new Set<SpeciesId>();
  private recipeClosed = new Set<SpeciesId>();
  private recipeExpanded = new Set<SpeciesId>();
  private placedListOpen = false;
  private history: NonNullable<View>[] = [];
  private scrollPositions = new Map<string, number>();
  private requestedScroll: number | null = null;
  private shopReturn: {view: View; history: NonNullable<View>[]; arranging: boolean} | null = null;
  private shopResources = node('div', '', 'shop-resources');
  private interactionPointers = new Set<number>();
  private pendingRender = false;
  /** The name being typed in a rabbit's sheet: kept here, not in the DOM, so a refresh never loses the text, the caret or the focus. */
  private rename: {id: string; text: string; caret: number; error: string | null} | null = null;
  /** Which bubble of Coco's first welcome is shown (interface only: the welcome itself is saved once finished). */
  private agencyWelcomeStep = 0;
  private reasonId = 0;
  private lastSecond = -1;
  private confirmationGeneration = 0;
  private arranging = false;
  private decorationDraft: {id: string; catalogId?: DecorationId; location: DecorationLocation | null; rotation: 0 | 1;} | null = null;
  private photo = false;
  private cuisine: ReturnType<typeof mountCuisineActivity>;
  constructor(private controller: GameController, private scene: MeadowScene, private clock: () => number, private preferences: PreferenceStore, audio?: AudioEngine,
    activityOptions: {onlineServicesAllowed?: boolean; accountKnown?: () => boolean; onCuisineCompleted?: (result: RecipeCompletion) => void} = {}) {
    this.snapshot = controller.getSnapshot(); this.sounds = audio ? new Sounds(preferences, audio) : new Sounds(preferences);
    this.pailleDialogue = new PailleDialogue(preferences, (id, name) => controller.perform({type: 'renameRabbit', id, name}).ok,
      () => { const s = this.snapshot.state; if (!s) return; const task = onboardingTask(s,this.preferences.value,this.now()); if (task.step.done) this.preferences.set({tutorialDone:true}); this.guide(task.step); this.render(); },
      () => { this.renderPreferences(); this.render(); }, () => this.open({kind:'settings'}, 'root'));
    this.cuisine = mountCuisineActivity(document.getElementById('app')!, {onRecipeCompleted: result => {
      const rabbit = this.cuisine.selectedRabbit;
      const granted = rabbit ? this.controller.perform({type: 'rewardCuisine', rabbitId: rabbit.id, recipeId: result.recipeId}) : {ok: false as const, reason: 'NOT_FOUND' as const};
      activityOptions.onCuisineCompleted?.(result);
      if (!granted.ok) return `Récompense non enregistrée : ${REFUSALS[granted.reason]}`;
      const reward = granted.cuisineReward!;
      return `+${reward.pattes} pattes · +${reward.grass} nourriture${reward.affectionGranted ? ' · +1 Affection' : reward.affectionAtCap ? ' · Affection maximale' : reward.affectionStatueRequired ? ' · La Statue de l’Affection permet de dépasser 14.' : ''}${reward.heartGranted ? ' · +1 Cœur' : ''}`;
    }, quotaText: () => { const state = this.controller.getSnapshot().state; return state ? cuisineQuotaText(state, this.now()) : ''; }, onExit: () => this.render()});
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
    const options = {signal: this.abort.signal};
    const skip = node('button','Passer le tutoriel','onboarding-skip'); skip.id='onboarding-skip';
    skip.onclick=()=>{this.preferences.set({tutorial:false});this.pailleDialogue.close();this.renderPreferences();this.render();};
    document.getElementById('app')!.append(skip);
    document.addEventListener('click', event => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('button, a, input, select');
      if (this.onboardingActive && target && !this.onboardingAllowed(target)) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, {...options, capture:true});
    document.getElementById('open-arrange')!.addEventListener('click', () => this.open({kind: 'arrange'}), options);
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
    document.getElementById('close-panel')!.addEventListener('click', () => this.close(), options);
    document.getElementById('panel-backdrop')?.addEventListener('click', () => this.close(), options);
    document.getElementById('panel-back')!.addEventListener('click', () => this.back(), options);
    // Escape closes the open menu like its cross; fields and dialogs that handle Escape themselves have already consumed it.
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (this.movingRabbit) { event.preventDefault(); this.cancelRabbitMove(); return; }
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
    const animate = () => {
      const second = Math.floor(this.clock() / 1000);
      if (second !== this.lastSecond && !document.hidden) { this.lastSecond = second; this.updateTimers(); this.accountReminder.flush(); }
      this.frame = requestAnimationFrame(animate);
    };
    this.frame = requestAnimationFrame(animate);
  }
  private now(): number { return Math.max(this.clock(), this.snapshot.state?.lastSimulatedAt ?? 0); }
  private renderPreferences(): void {
    document.getElementById('tutorial-toggle')!.textContent = this.preferences.value.tutorial && !this.preferences.value.tutorialDone ? 'Quitter le guidage' : 'Reprendre le guidage';
  }
  private notice(message: string): void {
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
  private execute(command: Command, success: string | ((value?: string | number) => string), after?: (value?: string | number) => void): void {
    this.gate.run(JSON.stringify(command), () => {
      const fireBreeding = command.type === 'breed' && command.parents.some(id => this.snapshot.state?.rabbits.some(r => r.id === id && r.species === 'feu'));
      const result = this.controller.perform(command);
      if (!result.ok) { this.notice(REFUSALS[result.reason]); this.render(); return; }
      this.sounds.ping(); const message=typeof success === 'function' ? success(result.value) : success;
      this.notice(message); after?.(result.value); this.render();
      if (fireBreeding) this.accountReminder.request();
    });
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
    this.content.append(node('p',`Niveau du joueur : ${access.currentLevel} · Niveau ${access.requiredLevel} requis`,'badge'),node('p',access.historicalException?'Droit historique conservé pour cette action.':access.accessible?'Niveau suffisant. Les ressources, la compatibilité et les places restent à vérifier.':'Progresse en jouant et en réclamant tes récompenses de missions. Les cœurs ne contournent pas ce niveau.','small'));
    this.button(this.content,'Voir les missions',()=>this.open({kind:'missions',tab:'main'}),null,true);
  }
  private compatibleHabitats(species:SpeciesId):void {
    this.shopHabitatSpecies=species;this.open({kind:'shop',tab:'habitats'});
  }
  private card(title: string, description = '', species?: SpeciesId): HTMLElement {
    const card = node('article', '', 'card'); if (species) rabbitTheme(card, species);
    const heading = node('div', '', 'card-heading'); if (species) heading.append(avatar(species));
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
  private renderCuisineRabbits(s: GameState): void {
    this.title.textContent = 'Choisis ton lapin';
    if (window.innerHeight > window.innerWidth) this.content.append(node('p', 'La Cuisine se joue en paysage : tourne ton téléphone.', 'reason'));
    this.content.append(node('p', cuisineQuotaText(s, this.now()), 'cuisine-quota'));
    if (!s.rabbits.length) this.content.append(node('p', 'Tu as besoin d’un lapin pour cuisiner.'));
    for (const rabbit of s.rabbits) {
      const card = this.rabbitCard(s, rabbit.id);
      const choose = this.button(card, 'Choisir ce lapin', () => {
        if (this.view?.kind !== 'cuisineRabbit' || this.cuisine.active) return;
        const current = this.controller.getSnapshot().state?.rabbits.find(r => r.id === rabbit.id);
        if (!current || travelling(this.controller.getSnapshot().state!, current.id)) { this.render(); return; }
        this.back();
        this.cuisine.open({id: current.id, species: current.species});
      }, travelling(s, rabbit.id) ? REFUSALS.TRAVELING : null);
      choose.dataset.cuisineRabbit = rabbit.id;
      this.content.append(card);
    }
  }
  private back(): void {
    let previous = this.history.pop();
    // A completed or canceled preview has no draft to restore.
    while (previous && ((previous.kind === 'placement' && !this.placement) || (previous.kind === 'decorationPlacement' && !this.decorationDraft))) previous = this.history.pop();
    if (previous) this.open(previous, 'back'); else if (this.view?.kind === 'shop' && this.view.tab !== 'home') this.open({kind: 'shop', tab: 'home'}, 'back'); else this.close();
  }
  private interactionActive(): boolean {
    // A field being typed in keeps the keyboard open: passive refreshes wait until it loses the focus.
    return this.interactionPointers.size > 0 || ((document.activeElement instanceof HTMLSelectElement || document.activeElement instanceof HTMLInputElement) && this.panel.contains(document.activeElement));
  }
  private flushRender(): void { if (this.pendingRender && !this.interactionActive()) this.render(); }
  open(view: NonNullable<View>, navigation: 'push' | 'root' | 'tab' | 'back' = 'push'): void {
    if (view.kind === 'settings') this.pailleDialogue.close();
    if (this.onboardingActive && !this.onboardingViewAllowed(view)) return;
    if (this.cuisine.active || this.pailleDialogue.element.open) return;
    if (this.dialog.open || (document.getElementById('import-dialog') as HTMLDialogElement).open) return;
    if(view.kind==='buyRabbit') {
      const state=this.controller.getSnapshot().state,target={family:'species',id:view.species,action:'purchase'} as const;
      if(state && stateLevelAccess(state,target).locked){this.open({kind:'levelRequirement',target});return;}
    }
    if(view.kind==='shop' && view.tab==='home')this.shopHabitatSpecies=null;
    if (view.kind === 'buyRabbit' && this.view?.kind !== 'buyRabbit') {
      const state = this.controller.getSnapshot().state;
      if (state && !state.buildings.some(b => !habitatEntryReason(state,b,view.species))) {
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
    this.clearRabbitMove();
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
    if (this.onboardingActive) {
      this.purchaseReturn=null;this.shopReturn=null;this.history=[];this.view=null;this.placement=null;this.arranging=false;
      this.scene.setPlacement(null);this.scene.setTutorialCell(null);this.scene.setRabbitPurchase(null);
      this.pailleDialogue.invite();this.syncArrangement();this.render();return;
    }
    if (this.cuisine.active) { this.cuisine.close(); return; }
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
    this.clearRabbitMove();
    this.pailleDialogue.close();
    this.cuisine.close(false);
    this.history = []; this.scrollPositions.clear(); this.interactionPointers.clear(); this.pendingRender = false;
    this.shopHabitatSpecies=null;
    this.purchaseReturn = null; this.rabbitDestination = null; this.shopRabbitIssue = null; this.scene.setRabbitPurchase(null);
    this.collectionFilter = {}; this.recipeDetails.clear(); this.recipeClosed.clear(); this.recipeExpanded.clear(); this.placedListOpen = false; this.shopReturn = null; this.content.scrollTop = 0; this.settings.scrollTop = 0;
    this.content.replaceChildren();
    this.scene.setExpansion(false);
    if (fresh) this.preferences.restartGuidance();
    this.renderPreferences();
    this.confirmationGeneration++;
    this.arranging = false; this.decorationDraft = null; this.setPhoto(false); this.syncArrangement();
    this.parents = [null, null]; this.placement = null; this.scene.setPlacement(null);
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
    if (selection.kind === 'income') { this.execute({type: 'collectIncome', id: selection.id}, value => `+ ${value} pattes`); return; }
    if (selection.kind === 'grass') { this.execute({type: 'collectOrder', id: selection.id}, value => `+ ${value} nourriture`); return; }
    if (selection.kind === 'birth') { this.sendBirth(selection.id); return; }
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
    else if (selection.kind === 'building' || selection.kind === 'rabbit') this.open({kind: selection.kind, id: selection.id});
  }
  private render(passive = false): void {
    if (passive && this.interactionActive()) { this.pendingRender = true; return; }
    this.pendingRender = false;
    this.syncRabbitMove();
    this.renderTutorial();
    this.applyOnboardingLock();
    if (this.breedingDialog.open) this.renderBreeding();
    const available = this.snapshot.state ? availableMissionRewards(this.snapshot.state) : 0;
    const badge = document.getElementById('missions-badge')!;
    badge.hidden = !available; badge.textContent = String(available);
    document.getElementById('open-missions')!.setAttribute('aria-label', available ? `Missions · ${available} récompense${available > 1 ? 's' : ''} disponible${available > 1 ? 's' : ''}` : 'Missions');
    const scroll = this.requestedScroll ?? this.content.scrollTop;
    this.requestedScroll = null;
    const placedListOpen = this.content.querySelector<HTMLDetailsElement>('[data-placed-list]')?.open ?? this.placedListOpen;
    this.placedListOpen = placedListOpen;
    if (this.rename && !(this.view?.kind === 'rabbit' && this.view.id === this.rename.id)) this.rename = null;
    const focusId = (document.activeElement as HTMLElement | null)?.dataset.focus;
    this.panel.hidden = !this.view;
    document.body.classList.toggle('panel-open', !!this.view);
    const fullShop = this.view?.kind === 'shop' || this.view?.kind==='levelRequirement' && this.view.target.family==='decoration' && this.history.some(view=>view.kind==='shop');
    this.panel.classList.toggle('shop-fullscreen', fullShop);
    document.body.classList.toggle('shop-open', fullShop);
    this.shopResources.hidden = !fullShop;
    if (fullShop && this.snapshot.state) {
      const s = this.snapshot.state; this.shopResources.replaceChildren(node('span', `${s.pattes} pattes`), node('span', `${s.grass} nourriture`), node('span', heartAmount(s.hearts)));
    }
    this.panel.dataset.view = this.view?.kind ?? '';
    // Settings, the list menus, a rabbit's card and a building's menu open in the middle of the screen, over the dimmed meadow, with
    // the full height to scroll (a phone in landscape left the side panel about 240 px). The guided start keeps the side panel, except Settings.
    const card = !!this.view && (this.view.kind === 'settings' || (!this.onboardingActive && CENTER_CARD_VIEWS.includes(this.view.kind)));
    clearRabbitTheme(this.panel);
    this.panel.classList.toggle('center-card', card); document.body.classList.toggle('center-card-open', card);
    const backdrop = document.getElementById('panel-backdrop'); if (backdrop) backdrop.hidden = !card;
    document.getElementById('panel-back')!.hidden = !this.history.length && !fullShop;
    this.settings.hidden = this.view?.kind !== 'settings'; this.content.hidden = this.view?.kind === 'settings';
    this.content.replaceChildren(); if (!this.view) return;
    this.panel.querySelector('.menu-identity')?.remove();
    if (this.view.kind === 'settings') { this.title.textContent = 'Paramètres'; return; }
    const s = this.snapshot.state; if (!s) { this.title.textContent = 'Partie indisponible'; return; }
    switch (this.view.kind) {
      case 'cuisineRabbit': this.renderCuisineRabbits(s); break;
      case 'missions': this.renderMissions(s, this.view.tab); break;
      case 'hearts': this.renderHearts(s); break;
      case 'shop': this.renderShop(s, this.view.tab); break;
      case 'building': this.renderBuilding(s, this.view.id); break;
      case 'rabbit': this.renderRabbit(s, this.view.id); break;
      case 'moveRabbit': this.renderDestinations(s, this.view.id); break;
      case 'levelRequirement':this.renderLevelRequirement(s,this.view.target);break;
      case 'buyRabbit': this.renderBuyRabbit(s, this.view.species); break;
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
    if (focusId) for (const el of this.content.querySelectorAll<HTMLElement>('[data-focus]')) if (el.dataset.focus === focusId) el.focus({preventScroll: true});
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
    if (tab === 'recipes') { this.renderRecipes(s, true); return; }
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
      const utility: Record<BuildingKind, string> = {enclosure: `${basic.capacity} places · tous les types · stocke ${basic.cap} pattes`, farm: 'Ferme niveau 1 : 5 cultures · maximum 2', kitchen: 'Cuisine - maximum 1', statue: 'Ouvre l’affection 15 à 20 à tous tes lapins · maximum 1', agency: 'Fait voyager tes lapins · des cœurs au retour · maximum 1', nest: 'Deux parents · maximum 1', nursery: 'Une place pour grandir · maximum 1'};
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
      for (const kind of ['farm', 'kitchen', 'agency', 'statue'] as const) {
        const card = this.card(BUILDING_NAMES[kind], `${utility[kind]} · empreinte 4 × 4`);
        if (kind === 'agency') { card.classList.add('statue-offer'); card.querySelector('.card-heading')!.prepend(agencyThumbnail()); card.append(node('p', `Dès le niveau ${TRAVEL.unlockLevel}, ${HOST_NAME} envoie tes lapins en vacances : voyages de 3 à 10 heures, cœurs en souvenir au retour.`, 'small')); }
        if (kind === 'statue') { card.classList.add('statue-offer'); card.querySelector('.card-heading')!.prepend(statueThumbnail()); card.append(node('p', `La Statue de l’Affection récompense tes soins : sans elle, l’affection s’arrête à ${AFFECTION_STATUE.cap}. Avec elle, chaque lapin peut atteindre 20, et deux parents d’affection 15 doublent leurs chances d’épique et de légendaire.`, 'small')); }
        this.button(card, `Placer · ${BALANCE.buildings[kind].price} pattes`, () => this.beginPlacement(kind), buildingReason(s, kind, true)); this.content.append(card);
      }
      }
    } else for (const species of SHOP_SPECIES) {
      const card = this.card(SPECIES[species].name, `${typeNames(SPECIES[species].types)} · ${RARITY_NAMES[SPECIES[species].rarity]} · affection 1 · 10 pattes / h`, species);
      const full = !s.buildings.some(b => b.kind === 'enclosure' && !habitatEntryReason(s, b, species));
      const target={family:'species',id:species,action:'purchase'} as const;
      const action=this.button(card, `Choisir un habitat · ${SPECIES[species].price} pattes`, () => this.open({kind: 'buyRabbit', species}));
      this.levelAction(card,action,s,target);
      if(stateLevelAccess(s,target).locked){this.content.append(card);continue;}
      if (full && this.shopRabbitIssue === species) this.rabbitNoRoom(card,s,species);
      this.content.append(card);
    }
  }
  private beginPlacement(kind: BuildingKind, movingId?: string, habitatType?: HabitatType, starter = false): void {
    if (!movingId && (kind==='nest'||kind==='nursery') && !starter) return;
    const state=this.controller.getSnapshot().state,target={family:'habitatPurchase',id:habitatType??'universal'} as const;
    if(!movingId && !starter && kind==='enclosure' && state && stateLevelAccess(state,target).locked){this.open({kind:'levelRequirement',target});return;}
    this.savePurchaseOrigin();
    this.arranging=true;this.decorationDraft=null;this.syncArrangement();
    this.placement = {kind, movingId, habitatType, starter, cell: null};
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
    const price = p.kind === 'enclosure' ? habitatPrice(p.habitatType ?? 'universal') : BALANCE.buildings[p.kind].price;
    const name = p.kind === 'enclosure' ? HABITATS[p.habitatType ?? s.buildings.find(b => b.id === p.movingId)?.habitat?.type ?? 'universal'].name : BUILDING_NAMES[p.kind];
    this.title.textContent = `${p.movingId ? 'Déplacer' : 'Placer'} : ${name}`;
    // The footprint shown is the building's real one: an enlarged enclosure keeps its tier when it moves.
    const size = habitatFootprint(s.buildings.find(b => b.id === p.movingId)?.footprintTier), footprint = `${size.width} × ${size.depth}`;
    this.content.append(node('p', `Touche un petit carré pour choisir le coin de l’empreinte ${footprint}. Déplacement par pas d’un carré. Glisse ou pince pour ajuster la vue.`));
    this.content.append(node('p', p.cell ? `Grille fine : (${p.cell.x}, ${p.cell.y}) · empreinte ${footprint}` : 'Aucune case sélectionnée.', 'badge'));
    const reason = placementReason(s, p);
    this.content.append(node('p', !p.cell ? 'Choisis une destination.' : reason ? `× ${reason}` : `✓ Emplacement valide · empreinte ${footprint}`, !p.cell ? 'placement-pending' : reason ? 'placement-invalid' : 'placement-valid'));
    this.button(this.content, p.movingId ? 'Confirmer le déplacement · gratuit' : p.starter ? 'Placer gratuitement' : this.onboardingActive ? `Confirmer · ${price} pattes` : `Acheter et placer · ${price} pattes`, () => {
      if (this.placement !== p || !p.cell) return;
      const cmd: Command = p.movingId ? {type: 'moveBuilding', id: p.movingId, ...p.cell} : p.starter && (p.kind==='nest'||p.kind==='nursery') ? {type:'placeStarterBuilding',kind:p.kind,...p.cell} : {type: 'buyBuilding', kind: p.kind, habitatType: p.habitatType, ...p.cell};
      this.execute(cmd, p.movingId ? 'Bâtiment déplacé.' : `${name} construit.`, value => this.finishPurchase('building', p.movingId ?? String(value)));
    }, placementReason(s, p));
    if (!p.movingId && !p.starter && p.cell) this.complement(this.content, s, {type: 'buyBuilding', kind: p.kind, habitatType: p.habitatType, ...p.cell},
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
    document.getElementById('photo-return')!.hidden = !active; this.scene.setPhoto(active);
  }
  private decorationCard(id: DecorationId, description = ''): HTMLElement {
    const card = this.card(DECORATIONS[id].name, description), icon = node('span', '', 'decoration-icon');
    const img = document.createElement('img'); img.src = decorationUrl(id); img.alt = DECORATIONS[id].name; icon.append(img); card.querySelector('.card-heading')!.prepend(icon); return card;
  }
  private renderDecorationShop(s: GameState): void {
    this.content.append(node('p', 'Objets esthétiques, sans bonus. Acheter ouvre un aperçu gratuit : le paiement a lieu à la pose confirmée. Acheter pour l’inventaire est un achat immédiat sans placement. Les objets précieux se paient en cœurs.', 'small'));
    this.content.append(node('h3', 'Décorations extérieures'));
      for (const id of DECORATION_IDS) {
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
    this.title.textContent = 'Aménager · inventaire';
    for (const kind of ['nest','nursery'] as const) if (!s.buildings.some(b=>b.kind===kind)) {
      const card=this.card(`${BUILDING_NAMES[kind]} offert`, 'Libère une empreinte 4 × 4 sur le terrain acquis, puis place gratuitement cet équipement. Aucun objet ne sera déplacé automatiquement.');
      this.button(card,`Placer gratuitement : ${BUILDING_NAMES[kind]}`,()=>this.beginPlacement(kind,undefined,undefined,true));this.content.append(card);
    }
    this.content.append(node('p', 'Touche directement un objet posé pour le déplacer, le ranger ou le vendre. Glisse pour explorer, pince pour zoomer. Toute pose demande une validation.', 'small'));
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
    if (DECORATIONS[d.catalogId].rotates && d.location.kind === 'outside') this.button(this.content, 'Tourner de 90°', () => { this.beginDecorationPlacement(id); this.rotateDecoration(); }, null, true);
    this.button(this.content, 'Ranger dans l’inventaire', () => this.execute({type: 'placeDecoration', id, location: {kind: 'inventory'}}, 'Objet rangé, toujours possédé.', () => this.finishDecorationAction()), d.location.kind === 'inventory' ? 'Cet objet est déjà dans l’inventaire.' : null, true);
    const resale = ownedDecorationResalePrice(d);
    this.button(this.content, `Vendre · ${resale} pattes`, () => this.confirm(
      `Vendre ${DECORATIONS[d.catalogId].name} pour ${resale} pattes ?`,
      'Cet exemplaire sera retiré définitivement. Aucun remboursement en cœurs.',
      () => this.execute({type: 'sellDecoration', id}, value => `Objet vendu · + ${value} pattes.`, () => this.finishDecorationAction())
    ), d.paidHearts !== undefined ? 'Objet précieux : il ne se revend pas.' : Number.isSafeInteger(s.pattes + resale) ? null : REFUSALS.RESOURCE_LIMIT, true).classList.add('action-danger');
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
    this.content.append(node('p', draft.catalogId ? 'Aperçu gratuit · aucun achat avant validation.' : d.location.kind === 'inventory' ? 'En cas d’annulation, l’objet reste dans ton inventaire.' : 'En cas d’annulation, l’objet reste à son emplacement actuel.', 'small'));
    if (DECORATIONS[d.catalogId].rotates) this.button(this.content, `Tourner de 90° · orientation ${draft.rotation ? 'verticale' : 'horizontale'}`, () => this.rotateDecoration(), null, true);
    const definition = DECORATIONS[d.catalogId];
    this.content.append(node('p', `${definition.width} × ${definition.height} cases fines · ${draft.catalogId ? `${definition.heartPrice !== undefined ? heartAmount(definition.heartPrice) : `${definition.price} pattes`}` : 'pose gratuite'}`, 'badge'));
    const reason = draft.location ? catalogDecorationPlacementReason(s, d.catalogId, draft.location, draft.catalogId ? undefined : d.id) ?? (draft.catalogId ? purchaseDecorationReason(s,d.catalogId) : null) : null;
    const actions = node('div', '', 'decoration-placement-actions');
    const status = node('p', !draft.location ? 'Choisis une destination · aucun objet posé' : reason ? `× ${REFUSALS[reason]}` : draft.catalogId ? '✓ Emplacement valide · paiement à la validation' : '✓ Emplacement valide · pose gratuite', !draft.location ? 'placement-pending' : reason ? 'placement-invalid' : 'placement-valid');
    status.setAttribute('role', 'status'); actions.append(status);
    const choices = node('div', '', 'placement-choices'); actions.append(choices);
    const confirm = this.button(choices, draft.catalogId ? `Acheter et placer · ${definition.heartPrice !== undefined ? heartAmount(definition.heartPrice) : `${definition.price} pattes`}` : 'Confirmer la pose · gratuit', () => {
      if (this.decorationDraft !== draft || !draft.location || draft.location.kind !== 'outside') return;
      const command: Command = draft.catalogId ? {type:'buyDecoration',catalogId:d.catalogId,location:structuredClone(draft.location)} : {type:'placeDecoration',id:d.id,location:structuredClone(draft.location)};
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
    const card = this.card(r.name || SPECIES[r.species].name, `${r.name ? SPECIES[r.species].name + ' · ' : ''}${this.enclosureName(s, r.enclosureId)} · Affection ${r.affection} · ${rabbitIncome(r.affection, r.species)} pattes / h`, r.species);
    card.classList.add('compact-list-card'); return card;
  }
  private renderBuilding(s: GameState, id: string): void {
    const b = s.buildings.find(b => b.id === id); if (!b) { this.close(); return; }
    this.title.textContent = b.kind === 'enclosure' ? this.enclosureName(s, id) : BUILDING_NAMES[b.kind];
    if (b.kind === 'enclosure') this.menuPortrait(habitatThumbnail(b.habitat!.type));
    else if (b.kind === 'agency') this.menuPortrait(agencyThumbnail());
    else if (b.kind === 'statue') this.menuPortrait(statueThumbnail());
    else {
      const image = node('img'); image.src = {farm: b.farmLevel === 2 ? FARM_ART.url : FARM_LEVEL_1_ART.url, nest: NEST_ART.url, nursery: NURSERY_ART.url, kitchen: KITCHEN_ART.url}[b.kind];
      this.menuPortrait(image);
    }
    if (b.kind === 'enclosure') {
      const residents = occupants(s, id), income = incomeWhole(b.incomeUnits), stats = habitatStats(b);
      this.content.append(node('p', `${habitatName(b)} · ${HABITATS[b.habitat!.type].accepted} · niveau ${b.habitat!.level}`, 'badge'));
      this.content.append(this.stats([['Occupants', `${residents.length} / ${stats.capacity} places`], ['Stock', `${income} / ${stats.cap} pattes`], ['Revenu', `${residents.reduce((sum, r) => sum + rabbitIncome(r.affection, r.species), 0)} pattes / h`]]));
      if (income >= stats.cap) this.content.append(node('p', 'Stock plein : récolte pour relancer les revenus.', 'reason'));
      this.button(this.content, `Récolter ${income} pattes`, () => this.execute({type: 'collectIncome', id}, value => `+ ${value} pattes`), income < 1 ? 'La récolte sera disponible à partir d’une pièce.' : null);
      if (b.habitat!.level < 3) {
        const level=b.habitat!.level,targetLevel=(level+1) as 2|3,next=habitatLevel(b.habitat!.type,targetLevel);
        const target={family:'habitatUpgrade',id:b.habitat!.type,toLevel:targetLevel} as const,access=stateLevelAccess(s,target);
        const command:PattesCommand={type:'upgradeHabitat',id,fromLevel:level};
        // The upgrade also acquires the larger footprint, anchored at the same top-left cell; it needs the room before any payment.
        const from=habitatFootprint(b.footprintTier),to=habitatFootprint(targetLevel),room=upgradeFootprintReason(s,id,targetLevel);
        const description=`Niveau de l’habitat ${level} → ${targetLevel} : places ${stats.capacity} → ${next.capacity} · stockage ${stats.cap} → ${next.cap} pattes · emprise ${from.width} × ${from.depth} → ${to.width} × ${to.depth} cases, vers la droite et vers le bas. Occupants, emplacement et stock actuel conservés.`;
        const card=this.card('Amélioration de l’habitat',description);card.dataset.upgradeHabitat=id;
        const inHearts=next.currency==='hearts';
        const action=inHearts ?
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
        if(access.accessible&&!inHearts&&!room)this.complement(card,s,command,`Améliorer : ${description}`,'Habitat amélioré.');
        this.content.append(card);
      } else this.content.append(node('p', 'Niveau maximal atteint.', 'badge'));
      for (const r of residents) { const card = this.rabbitCard(s, r.id); this.button(card, 'Voir ce lapin', () => this.open({kind: 'rabbit', id: r.id}), null, true); this.content.append(card); }
      if (residents.length < stats.capacity) this.button(this.content, 'Acheter un lapin', () => this.open({kind: 'shop', tab: 'rabbits'}), null, true);
    } else if (b.kind === 'farm') {
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
        for (const recipe of CROP_IDS) {
          const order = ORDERS[recipe], card = this.card(order.name, `${cropDuration(order.duration)} · ${order.grass} nourriture par récolte`); card.classList.add('compact-list-card');
          card.classList.add('farm-order'); card.dataset.crop = recipe; card.querySelector('.card-heading')!.prepend(cropIcon(recipe));
          if (!b.farmLevel && order.level >= ORDERS.fanes.level) { card.classList.add('farm-order-locked'); card.append(node('p', 'Ferme niveau 2', 'badge')); choices.append(card); continue; }
          if (level < order.level) { card.classList.add('farm-order-locked'); card.append(node('p', `Niveau ${order.level} requis`, 'badge')); choices.append(card); continue; }
          this.button(card, `Cultiver · ${order.cost} pattes`, () => this.execute({type: 'startOrder', id, recipe}, 'Culture lancée.'), moneyReason(s, order.cost));
          this.complement(card, s, {type: 'startOrder', id, recipe}, `Cultiver ${order.name.toLowerCase()} : ${order.grass} nourriture`, 'Culture lancée.'); choices.append(card);
        }
      }
      if (!b.farmLevel) this.heartUpgrade(s, 'Agrandir la ferme', 'Le moulin et cinq nouvelles cultures : fanes de carotte, fenouil, pomme, fraise et banane.', 30, {type: 'upgradeFarm', id}, playerLevel(s) < ORDERS.fanes.level ? 'Niveau 9 requis' : null);
    } else if (b.kind === 'nest') this.renderNest(s, id);
    else if (b.kind === 'nursery') this.renderNursery(s);
    else if (b.kind === 'kitchen') this.button(this.content, 'Entrer dans la Cuisine', () => this.openCuisine());
    else if (b.kind === 'agency') this.renderAgency(s);
    else if (b.kind === 'statue') this.content.append(node('p', `La statue veille sur la prairie : tes lapins peuvent dépasser l’affection ${AFFECTION_STATUE.cap} et atteindre 20. Deux parents d’affection 15 doublent leurs chances d’épique et de légendaire.`, 'badge'));
    this.button(this.content, 'Déplacer ce bâtiment', () => this.beginPlacement(b.kind, id), null, true);
  }
  /** Coco speaks in a bubble beside its portrait; the first visit is a short guided welcome, later visits are not guided. */
  private agencyHost(line: string): HTMLElement {
    const box = node('div', '', 'agency-host'), bubble = node('div', '', 'agency-bubble');
    bubble.append(node('p', line)); box.append(cocoPortrait(), bubble); this.content.append(box); return bubble;
  }
  private renderAgency(s: GameState): void {
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
    this.content.append(node('p', `Agence niveau ${level} : ${level} voyage${level > 1 ? 's' : ''} à la fois, de 3 à 10 heures : 1 cœur jusqu’à 4 h, 2 jusqu’à 7 h, 3 au-delà. Le voyageur garde sa place et ses revenus.${level >= 2 ? ' Chaque voyage rapporte aussi 25 nourriture par heure.' : ''}`, 'small'));
    for (const trip of s.travel.trips) {
      const traveller = s.rabbits.find(r => r.id === trip.rabbitId)!, name = traveller.name || SPECIES[traveller.species].name;
      const food = trip.grass ? ` et ${trip.grass} nourriture` : '';
      if (trip.endsAt <= now) {
        const card = node('article', '', 'card agency-return'); card.dataset.trip = 'ready';
        const words = node('div', '', 'agency-bubble traveller-bubble'); words.append(node('p', `Ces vacances ${toPlace(trip.destination)} étaient super ! Je t’ai rapporté ${heartAmount(trip.hearts)}${food} en souvenir.`));
        const heading = node('div', '', 'card-heading'); heading.append(avatar(traveller.species), words); card.append(heading);
        this.button(card, `Accueillir · + ${heartAmount(trip.hearts)}${food}`, () => this.execute({type: 'claimTrip', rabbitId: trip.rabbitId}, `+ ${heartAmount(trip.hearts)}${food} rapportés ${fromPlace(trip.destination)} !`)).classList.add('heart-gift');
        this.content.append(card);
      } else {
        const card = this.card(`${name} · en voyage`, `${trip.destination} · souvenir prévu : ${heartAmount(trip.hearts)}${food}`, traveller.species); card.dataset.trip = 'away'; this.content.append(card);
        this.timer(trip.startedAt, trip.endsAt); this.content.append(node('p', orderReadyText(trip.endsAt).replace('Prête', 'Retour'), 'order-ready-time'));
      }
    }
    if (s.travel.trips.length < level) {
      this.content.append(node('p', 'Jusqu’à son retour, le voyageur ne pourra ni manger, ni aller au nid, ni cuisiner, ni déménager.', 'small'));
      const list = node('div', '', 'agency-travellers'); this.content.append(list);
      for (const r of [...s.rabbits].filter(r => !travelling(s, r.id)).sort((a, b) => b.affection - a.affection)) {
        const card = this.card(r.name || SPECIES[r.species].name, `${r.name ? SPECIES[r.species].name + ' · ' : ''}${RARITY_NAMES[SPECIES[r.species].rarity]} · affection ${r.affection}`, r.species); card.dataset.traveller = r.id; card.classList.add('compact-list-card');
        this.button(card, 'Partir en voyage', () => this.execute({type: 'startTrip', rabbitId: r.id}, value => `${r.name || SPECIES[r.species].name} part en vacances ${toPlace(value as Destination)} !`), parentBusy(s, r.id, now) ? busyReason(s, r.id) : null); list.append(card);
      }
    }
    if (level < 3) this.heartUpgrade(s, 'Agrandir l’agence', level === 1 ? 'Deux voyages à la fois et 25 nourriture par heure de voyage.' : 'Trois voyages à la fois, avec la nourriture au retour.', level === 1 ? 40 : 120, {type: 'upgradeAgency', id: agency.id, fromLevel: level});
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
    rabbitTheme(this.panel, r.species);
    const species = SPECIES[r.species]; this.title.textContent = species.name;
    this.menuPortrait(avatar(r.species));
    const overview = node('div', '', 'rabbit-overview'), essential = node('div');
    essential.append(this.stats([['Affection', `${r.affection} / 20`], ['Revenu', `${rabbitIncome(r.affection, r.species)} pattes / h`]]));
    overview.append(avatar(r.species, true), essential); this.content.append(overview);
    const cost = feedCost(r.affection), away = travelling(s, id), reason = away ? 'TRAVELING' as const : feedReason(s, r.affection);
    if (away) essential.append(node('p', `En voyage ${toPlace(s.travel!.trips.find(t => t.rabbitId === id)!.destination)} · retour à l’agence`, 'badge rabbit-away'));
    if (reason !== 'MAX_AFFECTION' && reason !== 'STATUE_REQUIRED' && reason !== 'TRAVELING') essential.append(node('p', `Prochain repas : ${cost} nourriture → affection ${r.affection + 1}, revenu ${rabbitIncome(r.affection + 1, r.species)} pattes / h.`, 'small'));
    if (r.affection === AFFECTION_STATUE.cap && reason !== 'STATUE_REQUIRED') essential.append(node('p', 'Le grand repas de l’affection 15 : un vrai festin, à la hauteur de la récompense.', 'small rabbit-milestone'));
    this.button(essential, reason === 'MAX_AFFECTION' ? 'Affection maximale' : `Nourrir · ${cost} nourriture`, () => this.execute({type: 'feed', id}, `Affection ${r.affection + 1} !`, () => this.scene.reactToFeed(id)), reason && REFUSALS[reason]).dataset.focus = 'feed';
    this.renderNickname(r);
    const factors = [1, ...RARE_BIRTH_BONUS.map(step => step.factor)].sort((a, b) => a - b);
    const factor = RARE_BIRTH_BONUS.find(step => r.affection >= step.affection)?.factor ?? 1;
    const tier = factors.indexOf(factor);
    const chance = node('div', '', 'rabbit-birth-chance badge');
    chance.append(node('span', 'Chance de reproduction'), node('strong', ['Normale', 'Légèrement meilleure', 'Meilleure'][tier]));
    const indicator = node('span', '', 'birth-chance-indicator'); indicator.setAttribute('aria-hidden', 'true');
    for (let notch = 0; notch < factors.length; notch++) indicator.append(node('span', '', notch <= tier ? 'is-active' : ''));
    chance.append(indicator); this.content.append(chance);
    if (parentBusy(s,id,this.now()) && !travelling(s, id)) this.content.append(node('p','Au nid · place réservée dans son habitat · revenus conservés','badge'));
    this.content.append(node('p', `${typeNames(species.types)} · ${RARITY_NAMES[species.rarity]}`, 'badge'), node('p', this.enclosureName(s, r.enclosureId), 'small'));
    this.content.append(node('p', 'Nourrir augmente l’affection ; il n’y a ni faim ni entretien obligatoire.', 'small'), node('h3', 'Autres actions'));
    const hasDestination = rabbitDropTargets(s, id, this.now()).length > 0;
    this.button(this.content, 'Déplacer', () => this.beginRabbitMove(id), parentBusy(s,id,this.now()) ? busyReason(s, id) : hasDestination ? null : 'Aucun autre habitat compatible avec une place libre.', true);
    this.button(this.content, 'Confier ce lapin', () => this.confirm('Confier ce lapin ?', 'Ce lapin quittera définitivement ta prairie, sans remboursement.', () => this.execute({type: 'release', id}, 'Lapin confié.', () => { this.view = {kind: 'building', id: r.enclosureId}; })), releaseReason(s, id, this.now()), true).classList.add('action-danger');
  }
  /** The personal name, in a box after the feeding action: the species stays in the title and the badge. Text only, never HTML. */
  private renderNickname(r: Rabbit): void {
    const box = node('section', '', 'rabbit-nickname'); box.dataset.rabbitNickname = r.id;
    box.append(node('p', 'Nom personnel', 'small'), node('p', r.name ?? 'Sans nom', r.name ? 'rabbit-nickname-name' : 'rabbit-nickname-name empty'));
    const draft = this.rename?.id === r.id ? this.rename : null;
    if (!draft) {
      this.button(box, r.name ? 'Modifier le nom' : 'Donner un nom', () => {
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
    box.append(form); this.content.append(box);
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
  private openRecipe(species: SpeciesId): void {
    this.recipeDetails.add(species); this.open({kind:'recipes'});
    this.content.querySelector<HTMLElement>(`[data-recipe="${species}"]`)?.scrollIntoView?.({block:'start'});
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
    this.content.append(node('p','Touche un habitat encadré sur l’île, puis confirme. Glisse ou pince pour explorer. Aucun paiement avant confirmation.','small'));
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
      this.content.append(node('p', (automatic ? 'Les parents restent au nid jusqu’au départ du lapereau vers la nurserie.' : 'Les parents restent au nid jusqu’au transfert manuel.') + ' Leurs places et revenus sont conservés dans leurs habitats. L’espèce du lapereau reste secrète jusqu’à la fin de croissance.'));
      for(const parentId of job.parents) {
        const parent=s.rabbits.find(r=>r.id===parentId);
        if(parent) {const card=this.rabbitCard(s,parentId);card.append(node('p','Au nid · '+this.enclosureName(s,parent.enclosureId),'badge'));this.button(card,'Voir ce parent',()=>this.open({kind:'rabbit',id:parentId}),null,true);this.content.append(card);}
        else this.content.append(node('p','Ancienne reproduction : un parent déjà confié reste absent. Le lapereau est conservé ; aucun individu ne sera recréé.','small'));
      }
      return;
    }
    if (!s.buildings.some(b => b.kind === 'nursery')) { this.workState('blocked', 'Place la nurserie offerte avant de lancer une reproduction.'); this.button(this.content, 'Placer gratuitement la nurserie', () => this.beginPlacement('nursery',undefined,undefined,true)); return; }
    this.workState('free', 'Choisis deux parents distincts, chacun d’affection 2 minimum. Le lancement est gratuit.');
    this.content.append(node('p', automaticNurseryTransfer(s) ? 'Gratuit · 20 minutes de reproduction, puis le lapereau rejoint seul un couchage libre de la nurserie et grandit pendant ton absence.' : 'Gratuit · 20 minutes de reproduction, puis transfert manuel et croissance en nurserie.'));
    this.button(this.content, 'Croiser', () => this.openBreeding(id));
    this.content.append(node('p', 'La reproduction est possible dès affection 2 chez chacun des deux parents. Chaque recette possède ses propres conditions ; les résultats inadmissibles sont exclus. Les conditions détaillées sont visibles dans le carnet une fois la recette connue.', 'small'));
    this.button(this.content, 'Carnet de reproduction', () => this.open({kind: 'recipes'}), null, true);
    this.content.append(node('p', `Garantie : ${s.pityFailures}/7 échecs admissibles. Après sept échecs, la tentative admissible suivante garantit une espèce non découverte parmi les résultats ordinaires explicitement éligibles à la garantie et admissibles à cette paire, à parts égales s’il y en a plusieurs ; les recettes à probabilité fixe n’en font pas partie. Un résultat inédit éligible à la garantie réservé remet le compteur à zéro ; la découverte n’est enregistrée qu’à l’accueil.`, 'small'));
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
  /** The pairing window: Lapin 1 on the left, Lapin 2 on the right, the shared tools between, Croiser below. */
  private openBreeding(nestId: string): void {
    if (this.onboardingActive) this.parents = ['paille','neige'].map(species => this.snapshot.state!.rabbits.find(r => r.species === species)?.id ?? null) as [string|null,string|null];
    this.breedingNestId = nestId; this.renderBreeding();
    if (!this.breedingDialog.open) this.breedingDialog.showModal();
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
    const scroll = [...this.breedingDialog.querySelectorAll<HTMLElement>('.breeding-list')].map(list => list.scrollTop);
    const header = node('div', '', 'breeding-header');
    header.append(node('h2', 'Choisir les parents', 'breeding-badge'));
    header.lastElementChild!.id = 'breeding-title';
    const close = this.button(header, '×', () => this.closeBreeding(), null, true); close.classList.add('icon', 'breeding-close'); close.setAttribute('aria-label', 'Fermer le croisement');
    const columns = node('div', '', 'breeding-columns');
    const column = (slot: 0 | 1) => {
      const box = node('section', '', 'breeding-column'), list = node('div', '', 'breeding-list');
      box.append(node('h3', `Lapin ${slot + 1}`));
      for (const r of s.rabbits) {
        const busy = rabbitAvailability(s, r.id, this.now()), other = this.parents[1 - slot] === r.id, chosen = this.parents[slot] === r.id;
        const row = node('button', '', `breeding-row${chosen ? ' selected' : ''}`); row.type = 'button';
        row.disabled = !!busy || other; row.setAttribute('aria-pressed', String(chosen));
        const text = node('span', '', 'breeding-row-text');
        text.append(node('strong', r.name ?? SPECIES[r.species].name), node('span', r.name ? SPECIES[r.species].name : `Affection ${r.affection}`));
        text.append(node('small', other ? `Déjà choisi comme lapin ${2 - slot}` : busy ?? `${this.enclosureName(s, r.enclosureId)} · affection ${r.affection}`));
        if (row.disabled) text.lastElementChild!.classList.add('breeding-unavailable-reason');
        row.append(avatar(r.species), text);
        row.addEventListener('click', () => { if (row.disabled) return; this.parents[slot] = chosen ? null : r.id; this.renderBreeding(); });
        list.append(row);
      }
      box.append(list); return box;
    };
    const tools = node('div', '', 'breeding-tools');
    this.button(tools, 'Carnet', () => { this.closeBreeding(); this.open({kind: 'recipes'}); }, null, true);
    const oddsButton = this.button(tools, 'Probabilités', () => { this.oddsOpen = !this.oddsOpen; this.renderBreeding(); }, selected[0] && selected[1] ? null : 'Choisis d’abord les deux parents.', true);
    oddsButton.setAttribute('aria-pressed', String(this.oddsOpen));
    columns.append(column(0), tools, column(1));
    const footer = node('div', '', 'breeding-footer');
    let reason: string | null = selected[0] && selected[1] ? (rabbitAvailability(s, selected[0].id, this.now()) ?? rabbitAvailability(s, selected[1].id, this.now())) : 'Choisis un lapin dans chaque liste.';
    if (selected[0] && selected[1]) {
      const odds = oddsView(s, selected[0].species, selected[1].species, selected[0].affection, selected[1].affection), texts = oddsTexts(odds);
      if (!odds.possible) reason = REFUSALS.NO_BREEDING_RESULT;
      footer.append(node('p', texts.summary, 'small'));
      for (const line of texts.excluded) footer.append(node('p', line, 'reason'));
      if (this.oddsOpen) { const details = node('div', '', 'breeding-odds'); for (const line of texts.lines) details.append(node('p', line)); details.append(node('p', texts.guarantee, 'badge')); footer.append(details); }
    }
    if (this.parents[0] && this.parents[0] === this.parents[1]) reason = REFUSALS.SAME_PARENT;
    const launch = this.button(footer, 'Croiser', () => {
      if (this.parents[0] && this.parents[1]) this.execute({type: 'breed', parents: [this.parents[0], this.parents[1]]}, 'Reproduction lancée. Le résultat reste une surprise !', () => this.closeBreeding());
    }, reason);
    launch.classList.add('breeding-launch');
    if (this.onboardingActive) launch.classList.add('guide-target');
    if(this.onboardingActive) {
      const escape=node('div','','onboarding-escape');
      this.button(escape,'Paramètres',()=>{this.closeBreeding();this.open({kind:'settings'});},null,true);
      this.button(escape,'Passer le tutoriel',()=>{this.preferences.set({tutorial:false});this.closeBreeding();this.render();},null,true);
      footer.append(escape);
    }
    this.breedingDialog.replaceChildren(header, columns, footer);
    this.applyOnboardingLock();
    this.breedingDialog.querySelectorAll<HTMLElement>('.breeding-list').forEach((list, i) => { list.scrollTop = scroll[i] ?? 0; });
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
      const species = baby.species, full = !welcomeDestinations(s, species).length;
      this.workState(full ? 'blocked' : 'ready', full ? 'Aucun habitat compatible avec une place libre. Le lapereau reste en sécurité ici.' : 'Ton lapereau est prêt. Choisis son habitat.');
      this.content.append(avatar(species, true), node('h3', SPECIES[species].name));
      if (full) this.rabbitNoRoom(this.content, s, species);
      this.destinations(s, enclosureId => {
        const discovery = !s.discovered.includes(species), first = s.missions.events.welcome === 0 && !!s.initiation;
        this.execute({type: 'welcome', enclosureId, birthId: baby.birthId}, 'Lapereau accueilli !', () => { this.view = {kind: 'building', id: enclosureId}; if (first) this.firstBirth(species, discovery); else if (discovery) this.discovery(species); });
      }, species);
    }
    // After the babies: their timers stay visible without scrolling in landscape.
    const slotNames = {locked: 'verrouillé', empty: 'libre', growing: 'occupé', ready: 'prêt'};
    this.content.append(node('p', `Couchages : ${view.capacity} / ${NURSERY.maxCapacity}`, 'badge'),
      node('p', view.slots.map((state, slot) => `${slot + 1} : ${slotNames[state]}`).join(' · '), 'small'));
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
    this.title.textContent = `Collection · ${s.discovered.length}/${SPECIES_IDS.length}`;
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
    const entries = collectionView(s, this.collectionFilter);
    toolbar.append(node('p', `${entries.length} espèce${entries.length > 1 ? 's' : ''} affichée${entries.length > 1 ? 's' : ''}`, 'small'));
    if (!entries.length) this.content.append(node('p', 'Aucune espèce ne correspond à ces filtres.'));
    if (Object.values(this.collectionFilter).some(Boolean)) this.button(this.content, 'Réinitialiser les filtres', () => { this.collectionFilter = {}; this.render(); }, null, true);
    for (const entry of entries) {
      const info = entry.known ? SPECIES[entry.species] : null, card = this.card(entry.name, entry.known && info ? `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]} · Découverte` : 'Silhouette · à découvrir');
      card.querySelector('.card-heading')!.prepend(avatar(entry.known ? entry.species : undefined));
      if (entry.known && entry.description) {
        const description = node('p'); description.textContent = entry.description; card.append(description);
      }
      const hint = entry.known ? recipeHint(entry.species) : entry.hint; if (hint) card.append(node('p', hint, 'recipe-hint'));
      if (entry.known) this.button(card, 'Consulter l’espèce', () => this.open({kind: 'species', species: entry.species}), null, true);
      else card.append(node('p', 'À découvrir', 'small'));
      this.content.append(card);
    }
  }
  private renderRecipes(s: GameState, readOnly = false): void {
    this.title.textContent = 'Carnet de reproduction';
    this.content.append(node('p', 'Les types nécessaires doivent être réunis par deux individus distincts. Une recette possible reste un tirage aléatoire.'));
    const explanation = node('details'); explanation.append(node('summary', 'Comprendre les probabilités'),
      node('p', 'Les probabilités ci-dessous incluent la garantie actuelle.'),
      node('p', 'Une espèce découverte révèle sa recette. Une recette inconnue n’empêche aucune reproduction : seules ses conditions détaillées restent cachées.'),
      node('p', 'La garantie choisit à parts égales parmi les espèces explicitement éligibles à la garantie, non découvertes et admissibles à cette paire. Les recettes à probabilité fixe n’en font pas partie. Pendant une tentative garantie, une espèce déjà découverte est donc temporairement exclue du tirage.'));
    this.content.append(explanation);
    if (!readOnly && !this.history.length) this.button(this.content, 'Retour à la collection', () => this.open({kind: 'collection'}), null, true);
    const nest = s.buildings.find(b => b.kind === 'nest'), nursery = s.buildings.find(b => b.kind === 'nursery');
    const setupReason = !nest || !nursery ? 'Place les équipements offerts depuis Aménagement.' : nest.breeding ? 'Le nid est occupé.' : null;
    if (setupReason) this.content.append(node('p', setupReason, 'reason'));
    for (const recipe of recipeBook(s, this.now())) {
      const info = SPECIES[recipe.species];
      const card = this.card(info.name, `${typeNames(recipe.types)} · ${RARITY_NAMES[info.rarity]}`);
      const hint = recipeHint(recipe.species); if (hint) card.append(node('p', hint, 'recipe-hint'));
      card.dataset.recipe = recipe.species; card.dataset.recipeKnown = String(recipe.known);
      card.querySelector('.card-heading')!.prepend(avatar(recipe.discovered ? recipe.species : undefined));
      if(recipe.levelAccess.locked)card.append(node('p',`Niveau ${recipe.levelAccess.requiredLevel} requis · exclu des nouvelles reproductions.`,'reason'));
      if (!recipe.known) {
        const price = recipe.price, priced = price === null ? '' : ` · ${price} pattes`;
        // A locked level is stated once, by the reason line above.
        card.append(node('p', recipe.levelAccess.locked ? `Recette inconnue${priced}` : `Recette inconnue · niveau ${recipe.levelAccess.requiredLevel} atteint${priced}`));
        if (price !== null && recipe.levelAccess.accessible) this.recipePurchase(card, s, recipe.species, price);
        card.append(node('p', 'Conditions détaillées et paires conseillées visibles une fois la recette connue.', 'small'));
        this.content.append(card); continue;
      }
      card.append(node('p', `Affection ${recipe.minAffection} minimum pour chacun des deux parents. Croissance : ${growthDuration(recipe.species) / 60_000} min.`));
      card.append(node('p', 'Reproduction : 20 min · lancement gratuit.', 'small'));
      if (info.recipe?.parents) card.append(node('p', `Parents requis : ${info.recipe.parents.map(id => SPECIES[id].name).join(' × ')}. Les types seuls ne suffisent pas.`));
      card.append(node('p', info.recipe?.probability !== undefined ? `${recipe.levelAccess.locked ? 'Après déblocage du niveau requis' : 'Si la recette est admissible'}, hors garantie ordinaire : ${info.recipe.probability} %. Cette espèce ne bénéficie pas de la garantie de découverte.` : recipeSource(info.acquisition)?.guaranteeEligible === true ? 'Cette espèce bénéficie de la garantie ordinaire si elle n’est pas encore découverte et reste admissible.' : 'Cette espèce ne bénéficie pas de la garantie de découverte.', 'small'));
      if (!recipe.pairCount) card.append(node('p', info.recipe?.parents ? 'Possède les deux espèces requises pour préparer cette paire.' : 'Aucune paire possédée n’est admissible à cette recette.', 'small'));
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
              if (!readOnly) for (const id of pair.feeding) {
                const parent = s.rabbits.find(r => r.id === id)!;
                this.button(block, `Nourrir ${parent.name || SPECIES[parent.species].name} · ${this.enclosureName(s, parent.enclosureId)}`, () => this.open({kind: 'rabbit', id}), null, true);
              }
            } else {
              const label = pair.blocked ? 'Aucun résultat ordinaire accessible à ce niveau' : recipe.levelAccess.locked ? `Niveau ${recipe.levelAccess.requiredLevel} requis` : pair.certain ? 'Résultat garanti pour cette recette' : pair.guaranteed ? 'Garantie partagée entre espèces non découvertes' : pair.probability === '0 %' ? 'La garantie actuelle privilégie une autre espèce non découverte' : 'Recette possible, résultat non garanti';
              block.append(node('p', `${label} · ${pair.probability}`, 'badge'));
              if (pair.busy) block.append(node('p', 'Un parent est occupé ; attends sa disponibilité.', 'reason'));
            }
            if (!readOnly) this.button(block, 'Préparer cette paire au nid', () => {
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
    const name = SPECIES[species].name;
    this.button(card, `Acheter · ${price} pattes`, () => this.confirm(`Acheter la recette : ${name} ?`,
      `${price} pattes. Révèle les conditions d’obtention et les paires conseillées. Ne donne aucun lapin et ne garantit aucune naissance.`,
      () => this.execute({type: 'buyRecipe', species}, 'Recette ajoutée au carnet.', () => this.recipeDetails.add(species))), moneyReason(s, price)).dataset.buyRecipe = species;
  }
  private renderSpecies(s: GameState, species: SpeciesId): void {
    if (!s.discovered.includes(species)) { this.view = {kind: 'collection'}; this.renderCollection(s); return; }
    const info = SPECIES[species]; this.title.textContent = info.name;
    this.content.append(avatar(species, true), node('p', `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`),
      node('p', `${s.rabbits.filter(r => r.species === species).length} lapin${s.rabbits.filter(r => r.species === species).length > 1 ? 's' : ''} dans la prairie.`), node('p', info.price === null ? 'Obtention : reproduction.' : 'Obtention : boutique ou reproduction.'), node('p', `Croissance : ${growthDuration(species) / 60_000} minutes.`));
    if (info.recipe) this.button(this.content, 'Consulter la recette', () => this.openRecipe(species), null, true);
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
    this.content.append(tabs);
    const claim = (card: HTMLElement, command: Command, reward: Reward, ready: boolean, claimed: boolean) => {
      const stage = claimed ? 'Réclamée' : ready ? 'À réclamer' : 'En cours';
      const xp = command.type === 'claimMainMission' ? missionClaimXp('main',command.id) : command.type === 'claimDailyMission' ? missionClaimXp('daily',command.id) : PROGRESSION.xp.claims.dailyBonus;
      card.append(node('p', (reward.resource==='none' ? 'Objectif de collection · sans monnaie supplémentaire' : reward.amount===0 ? (xp > 0 ? 'Objectif de départ' : 'Objectif de départ · sans récompense supplémentaire') : `Gratuit · Récompense : + ${rewardLabel(reward)}`) + (xp > 0 ? ` · ${xp} XP` : ''), 'small'), node('p', stage, 'badge'));
      const generation = this.confirmationGeneration;
      const button = this.button(card, claimed ? 'Récompense réclamée' : reward.amount===0 ? 'Valider l’objectif' : `Réclamer · + ${rewardLabel(reward)}`, () => {
        if (!button.isConnected || generation !== this.confirmationGeneration) return;
        this.execute(command, reward.amount===0 ? 'Objectif validé.' : `Récompense reçue · + ${rewardLabel(reward)}`, () => {
          if (command.type === 'claimMainMission' && (initialMissionIds(this.snapshot.state!) as readonly string[]).includes(command.id)) this.content.scrollTop = 0;
          void this.toast.offsetWidth; this.toast.classList.add('mission-reward');
        });
      }, claimed ? 'Déjà réclamée.' : !ready ? 'Objectif à compléter.' : null);
      button.classList.add('mission-claim');
    };
    const progress = (card: HTMLElement, value: number, target: number) => {
      const bar = node('progress'); bar.max = target; bar.value = Math.min(value, target); bar.setAttribute('aria-label', `Progression : ${value} sur ${target}`);
      card.append(node('p', `Progression : ${value} / ${target}`), bar);
    };
    const shortcut = (card: HTMLElement, kind: BuildingKind | 'collection' | 'affection' | 'extension') => {
      if(kind==='extension' && s.acquiredParcels.length<PARCEL_IDS.length){const access=stateLevelAccess(s,{family:'extension',rank:s.acquiredParcels.length});if(access.locked)card.append(node('p',`Extension ${s.acquiredParcels.length} · Niveau ${access.requiredLevel} requis`,'reason'));}
      this.button(card, kind === 'collection' ? 'Voir la collection' : kind === 'affection' ? 'Voir un lapin' : kind === 'extension' ? 'Voir l’extension' : 'Voir le bâtiment ou la boutique', () => {
        if (kind === 'extension') { this.open({kind:'shop',tab:'home'}, 'root'); this.open({kind:'extension'}); }
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
      this.content.append(node('p', s.missions.claimed.includes('first-birth') ? 'Choisis librement tes objectifs.' : 'Réclame pour continuer. Les actions anticipées comptent.', 'small'));
      if(s.missions.claimed.includes('first-birth')) this.button(this.content,'Consulter le carnet',()=>this.open({kind:'recipes'}),null,true);
      const active = this.onboardingActive && onboardingTask(s,this.preferences.value,this.now()).step.id === 'snowReward' ? ['welcome-snow'] as const : activeMainMissions(s);
      if (!active.length) this.content.append(node('p', 'Toutes les missions principales ont été récompensées. Profite de ta prairie.', 'small'));
      for (const id of active) {
        const mission = MAIN_MISSIONS[id], acquired = s.missions.completed.includes(id), claimed = s.missions.claimed.includes(id);
        const p = mainProgress(s, id), card = this.card(mission.title, mission.description); card.dataset.mission = id;
        progress(card, acquired ? p.target : Math.min(p.value, p.target), p.target);
        if (acquired) card.append(node('p', 'Condition acquise', 'small'));
        claim(card, {type: 'claimMainMission', id}, mission.reward, acquired, claimed);
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
          else if (c.kind === 'habitatLevel') shortcut(card, 'enclosure');
          else if (c.kind === 'extensions') shortcut(card, 'extension');
          else if (c.kind === 'ordinaryRares') shortcut(card, 'collection');
          else shortcut(card, c.kind === 'building' ? c.building : c.kind === 'event' ? c.event === 'collectOrder' ? 'farm' : c.event === 'breed' ? 'nest' : 'nursery' : c.kind === 'discoveries' || c.kind === 'rare' || c.kind === 'species' ? 'collection' : c.kind);
        }
        this.content.append(card);
      }
    } else {
      const daily = s.missions.daily, cycleStart = dailyCycleStart(s);
      this.content.append(node('p', 'Renouvellement dans :'));
      const timer = node('p', '', 'timer'); timer.dataset.end = String(dailyCycleEnd(s)); this.content.append(timer);
      this.content.append(node('p', 'À la fin des 24 heures, la progression et toutes les récompenses non réclamées, bonus compris, expirent. Les cycles manqués ne se cumulent pas.', 'small'));
      // One mission per session: only the open one progresses; the next opens a few hours after each claim.
      this.content.append(node('p', `Une mission à la fois : la suivante s’ouvre ${DAILY_MISSION_GAP / HOUR} heures après chaque réclamation, pour ta prochaine visite.`, 'small'));
      const id = currentDailyMission(s), opensAt = dailyOpensAt(s);
      if (id) {
        const mission = DAILY_MISSIONS[id], card = this.card(mission.title, mission.description); card.dataset.mission = id;
        if (this.now() < opensAt) {
          const wait = node('p', '', 'timer'); wait.dataset.end = String(opensAt);
          card.append(node('p', 'Ouverture dans :'), wait, node('p', 'Bientôt', 'badge'));
        } else {
          progress(card, daily.progress[id], mission.target);
          claim(card, {type: 'claimDailyMission', id, cycleStart}, mission.reward, daily.progress[id] >= mission.target, false);
          if (daily.progress[id] < mission.target) shortcut(card, id === 'collect-pattes' ? 'enclosure' : id === 'collect-grass' ? 'farm' : 'nest');
        }
        this.content.append(card);
        const later = DAILY_MISSION_IDS.filter(other => other !== id && !daily.claimed.includes(other));
        if (later.length) this.content.append(node('p', `Ensuite : ${later.map(other => DAILY_MISSIONS[other].title).join(' · ')}`, 'small'));
      }
      const bonus = this.card('Bonus du cycle', 'Réclame les trois récompenses quotidiennes, puis ce bonus. Il est distinct du cadeau de cœurs disponible toutes les 24 heures.'); bonus.dataset.mission = 'daily-bonus';
      progress(bonus, daily.claimed.length, DAILY_MISSION_IDS.length);
      claim(bonus, {type: 'claimDailyBonus', cycleStart}, DAILY_BONUS, daily.claimed.length === DAILY_MISSION_IDS.length, daily.bonusClaimed);
      if (!daily.bonusClaimed) this.content.append(bonus);
      else if (daily.claimed.length === DAILY_MISSION_IDS.length) this.content.append(node('p', 'Toutes les récompenses de ce cycle ont été réclamées. Les missions reviendront au prochain cycle.', 'small'));
    }
  }
  private renderHearts(s: GameState): void {
    this.title.textContent = 'Les cœurs';
    const giftInfo = heartGift(s, this.now());
    this.content.append(node('p', `${s.hearts} cœurs disponibles`, 'badge'),
      node('p', 'Termine un délai ou complète un paiement insuffisant. Chaque dépense demande ta confirmation. Les cœurs ne remplacent pas la nourriture.'),
      node('p', 'Tu peux développer ta prairie sans cœurs. Aucun achat réel ni publicité.'),
      node('h3', 'Ton cadeau gratuit'),
      node('p', 'Deux cœurs toutes les 24 heures, jusqu’à trois cadeaux en réserve.'),
      node('p', giftInfo.text, 'heart-gift-count'));
    const gift = this.button(this.content, giftInfo.gifts ? `Réclamer · ${giftInfo.text}` : 'Réclamer', () => this.execute({type: 'claimHearts'}, value => `+ ${value} cœurs gratuits`));
    gift.disabled = !giftInfo.gifts;
    gift.className = 'heart-gift'; gift.dataset.giftAt = String(s.nextHeartGiftAt);
    if (!giftInfo.gifts) {
      this.content.append(node('p', 'Prochain cadeau dans :'));
      const wait = node('p', '', 'timer'); wait.dataset.end = String(s.nextHeartGiftAt); this.content.append(wait);
      wait.id = `action-reason-${++this.reasonId}`; gift.setAttribute('aria-describedby', wait.id);
    }
    this.renderMarket(s);
  }
  /** Late game: surplus pattes and grass become Hearts, each exchange of the day a little dearer. */
  private renderMarket(s: GameState): void {
    this.content.append(node('h3', 'Le comptoir de Paille'));
    if (!marketUnlocked(s)) { this.content.append(node('p', `Niveau ${MARKET.unlockLevel} requis. Tu pourras y échanger tes pattes et ta nourriture en trop contre des cœurs.`, 'small')); return; }
    this.content.append(node('p', 'Échange tes pattes ou ta nourriture en trop contre des cœurs. Chaque échange du jour coûte un peu plus que le précédent ; les prix reviennent au départ au prochain cycle.', 'small'));
    for (const [resource, label, unit] of [['pattes', 'Pièces', 'pattes'], ['grass', 'Nourriture', 'nourriture']] as const) {
      const price = marketPrice(s, resource), owned = resource === 'pattes' ? s.pattes : s.grass;
      const card = this.card(`${label} → 1 cœur`, price === null ? REFUSALS.MARKET_LIMIT : `Échanges du jour : ${marketExchanges(s, resource)} / ${MARKET.maximumPerCycle}`);
      card.dataset.market = resource;
      if (price !== null) this.button(card, `Échanger · ${price} ${unit}`, () => this.execute({type: 'exchangeForHeart', resource, expectedCost: price}, `+ 1 cœur · − ${price} ${unit}`),
        owned < price ? REFUSALS[resource === 'pattes' ? 'NOT_ENOUGH_PATTES' : 'NOT_ENOUGH_GRASS'] : null);
      this.content.append(card);
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
      due(state.nextHeartGiftAt) || due(dailyOpensAt(state)) || (state.travel?.trips.some(t => due(t.endsAt)) ?? false) || state.buildings.some(b =>
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
  private confirm(title: string, message: string, action: () => void): void {
    if (this.dialog.open) return;
    const generation = ++this.confirmationGeneration; let used = false;
    this.dialog.replaceChildren(node('h2', title), node('p', message));
    this.button(this.dialog, 'Confirmer', () => {
      if (used || !this.dialog.open || generation !== this.confirmationGeneration) return;
      used = true; this.dialog.close(); action();
    }); this.button(this.dialog, 'Annuler', () => this.dialog.close(), null, true); this.dialog.showModal();
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
    const info = SPECIES[species]; this.dialog.replaceChildren(node('h2', 'Nouvelle découverte !'), avatar(species, true), node('h3', info.name), node('p', `${typeNames(info.types)} · ${RARITY_NAMES[info.rarity]}`));
    this.button(this.dialog, 'Bienvenue dans la prairie', () => this.dialog.close()); this.dialog.showModal();
  }
  private guide(step: GuideStep): void {
    const s = this.snapshot.state; if (!s) return;
    if(this.onboardingActive && step.id === 'transfer' && !onboardingTask(s,this.preferences.value,this.now()).waiting) {
      // « Rejoindre la nurserie » does what it says: the same transfer as the heart bubble, then the camera follows the baby.
      const nest=s.buildings.find(b=>b.kind==='nest');
      this.view=null;this.history=[];this.render();if(nest)this.sendBirth(nest.id);return;
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
    if (view.kind === 'rabbit') return s.rabbits.find(r => r.id === view.id)?.species === step.target;
    if (view.kind === 'building') return s.buildings.find(b => b.id === view.id)?.kind === step.target;
    return false;
  }
  private onboardingAllowed(element: HTMLElement): boolean {
    if (element.closest('#paille-dialogue') || ['open-settings','save-warning','recenter-view','close-panel','panel-back','tutorial-toggle','onboarding-skip','continue-portrait'].includes(element.id)) return true;
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
    if (this.view?.kind === 'placement') target = buttons.find(b => /^(Acheter et placer|Confirmer)/.test(b.textContent ?? ''));
    else if (this.view?.kind === 'buyRabbit') target = this.rabbitDestination ? buttons.find(b => b.hasAttribute('data-confirm-purchase')) : buttons.find(b => /Jardin enneigé/.test(b.textContent ?? ''));
    else if (this.view?.kind === 'shop') {
      const title = ({snowShop:'Jardin enneigé',rabbitShop:SPECIES.neige.name,farmShop:'Ferme'} as Record<string,string>)[task.step.id];
      target = [...this.content.querySelectorAll('.card')].find(card => card.querySelector('h3')?.textContent === title)?.querySelector<HTMLButtonElement>('button') ?? undefined;
    } else if (task.step.id === 'snowReward') target = this.content.querySelector<HTMLButtonElement>('[data-mission="welcome-snow"] .mission-claim') ?? undefined;
    else if (task.waiting) target = this.content.querySelector<HTMLButtonElement>('.initiation-aid button') ?? this.content.querySelector<HTMLButtonElement>('.paid-acceleration button') ?? undefined;
    else if (task.step.id === 'welcomeBirth') target = buttons.find(b => !b.disabled && / · \d+\//.test(b.textContent ?? ''));
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
    const speaking = this.pailleDialogue.update(s, this.stagedOnboarding, this.now(), this.view?.kind !== 'settings');
    if (s?.startCourse === 'paille-solo' && this.stagedOnboarding && preferences.tutorial && !preferences.tutorialDone) { this.tutorial.hidden = true; return; }
    this.tutorial.replaceChildren(); this.tutorial.hidden = !s || speaking || !!this.view || !preferences.tutorial || preferences.tutorialDone;
    if (this.tutorial.hidden || !s) return;
    const step = guidedStep(s, preferences, this.now(), this.stagedOnboarding); this.tutorial.dataset.step = step.id;
    const missionId = activeMainMissions(s).find(id => s.missions.completed.includes(id));
    this.tutorial.append(node('strong', missionId ? MAIN_MISSIONS[missionId].title : step.title), node('p', step.text));
    this.button(this.tutorial, 'Me guider', () => this.guide(step));
    if (missionId) {
      const mission = MAIN_MISSIONS[missionId];
      this.button(this.tutorial, mission.reward.amount === 0 ? 'Valider l’objectif' : `Réclamer · ${rewardLabel(mission.reward)}`, () => this.execute({type: 'claimMainMission', id: missionId}, mission.reward.amount===0 ? 'Objectif validé.' : `Récompense : ${rewardLabel(mission.reward)}`));
      const xp = missionClaimXp('main',missionId);
      this.tutorial.append(node('p', mission.title, 'small'));
      if (xp > 0) this.tutorial.append(node('p', `Récompense : ${mission.reward.amount > 0 ? rewardLabel(mission.reward) + ' · ' : ''}${xp} XP`, 'small'));
    }
    const income = s.buildings.find(b => b.kind === 'enclosure' && incomeWhole(b.incomeUnits) >= 1);
    if (income) this.button(this.tutorial, 'Pattes disponibles', () => this.open({kind: 'building', id: income.id}), null, true);
    if (step.done) this.button(this.tutorial, 'Terminer le guidage', () => { this.preferences.set({tutorialDone: true}); this.renderPreferences(); this.renderTutorial(); }, null, true);
    this.button(this.tutorial, 'Masquer', () => { this.preferences.set({tutorial: false}); this.renderPreferences(); this.renderTutorial(); }, null, true);
  }
  dispose(): void { this.clearRabbitMove(); this.moveBanner.remove(); this.accountReminder.dispose(); document.getElementById('onboarding-skip')?.remove(); this.pailleDialogue.dispose(); this.cuisine.dispose(); this.confirmationGeneration++; if (this.dialog.open) this.dialog.close(); this.dialog.replaceChildren(); this.unsubscribe(); this.abort.abort(); cancelAnimationFrame(this.frame); clearTimeout(this.toastTimer); this.sounds.dispose(); }
}
