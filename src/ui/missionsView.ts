import {missionClaimXp} from '../simulation/progression';
import {PROGRESSION} from '../config/progression';
import {stateLevelAccess} from '../simulation/levelRights';
import {PARCEL_IDS} from '../config/land';
import {MAIN_MISSIONS, DAILY_MISSIONS, DAILY_BONUS, DAILY_PICK_COUNT, type Reward} from '../config/missions';
import {initialMissionIds, visibleMainMissions, mainCatalogueUnlocked, mainProgress, dailyCycleStart, dailyCycleEnd, dailyBonusReady, dailyClaimable, dailyMissionsOf, dailyProgress} from '../simulation/missions';
import type {Snapshot} from '../application/GameController';
import {BALANCE, type BuildingKind, type SpeciesId} from '../config/balance';
import type {Command, GameState} from '../state/types';
import {christmasActive} from '../config/christmas';
import {availableChristmasRewards} from '../simulation/christmas';
import type {PreferenceStore} from './preferences';
import {onboardingTask} from './onboarding';
import {node, rewardLabel} from './viewHelpers';
import type {Subject, View} from './GameUI';

/**
 * The Missions menu, its main and daily tabs (plan 6.4, 23 November 2026: the first menu moved out of GameUI.ts, unchanged).
 * `ui` is the part of the game interface this menu uses.
 */
export interface MissionsHost {
  readonly content: HTMLElement; readonly title: HTMLElement; readonly toast: HTMLElement; readonly snapshot: Snapshot;
  readonly confirmationGeneration: number; missionFilter: MissionFilter; shopHabitatSpecies: SpeciesId | null;
  readonly onboardingActive: boolean; readonly preferences: PreferenceStore;
  open(view: NonNullable<View>, navigation?: 'push' | 'root' | 'tab' | 'back'): void;
  button(parent: HTMLElement, label: string, action: () => void, reason?: string | null, secondary?: boolean): HTMLButtonElement;
  card(title: string, description?: string, subject?: Subject): HTMLElement;
  render(passive?: boolean): void;
  now(): number;
  execute(command: Command, success: string | ((value?: string | number) => string), after?: (value?: string | number) => void): void;
}
export type MissionFilter = 'all' | 'ready' | 'pending' | 'claimed';
export function renderMissions(ui: MissionsHost, s: GameState, tab: 'main' | 'daily'): void {
    ui.title.textContent = 'Missions';
    const tabs = node('div', '', 'tabs');
    for (const [key, label] of [['main', 'Principales'], ['daily', 'Quotidiennes']] as const) {
      const b = ui.button(tabs, label, () => ui.open({kind: 'missions', tab: key}, 'tab'), null, tab !== key);
      b.setAttribute('aria-pressed', String(tab === key));
    }
    if (tab === 'main' && s.missions.claimed.includes('first-birth')) ui.button(tabs, 'Consulter le carnet', () => ui.open({kind: 'recipes'}), null, true);
    tabs.classList.add('mission-tabs');
    ui.content.append(tabs);
    const claim = (card: HTMLElement, command: Command, reward: Reward, ready: boolean, claimed: boolean, extraRewards: readonly Reward[] = []) => {
      const stage = claimed ? 'Réclamée' : ready ? 'À réclamer' : 'En cours';
      const xp = command.type === 'claimMainMission' ? missionClaimXp('main',command.id) : command.type === 'claimDailyMission' ? missionClaimXp('daily',command.id) : PROGRESSION.xp.claims.dailyBonus;
      const resources = [reward, ...extraRewards].filter(r => r.resource !== 'none' && r.amount > 0);
      const resourceText = resources.map(rewardLabel).join(' · + ');
      const xpOnly = command.type === 'claimMainMission' && MAIN_MISSIONS[command.id].claimXp !== undefined && !resources.length && xp > 0;
      const message = resources.length ? `Récompense reçue · + ${resourceText}${xp > 0 ? ` · + ${xp} XP` : ''}` : xpOnly ? `Récompense reçue · + ${xp} XP` : 'Objectif validé.';
      card.append(node('p', (resources.length ? `Gratuit · Récompense : + ${resourceText}` : xp > 0 ? 'Récompense :' : 'Objectif de collection · sans récompense supplémentaire') + (xp > 0 ? ` ${resources.length ? '· ' : ''}${xp} XP` : ''), 'small'), node('p', stage, 'badge'));
      const generation = ui.confirmationGeneration;
      const button = ui.button(card, claimed ? 'Récompense réclamée' : xpOnly ? `Réclamer · ${xp} XP` : resources.length ? `Réclamer · + ${resourceText}` : 'Valider l’objectif', () => {
        if (!button.isConnected || generation !== ui.confirmationGeneration) return;
        ui.execute(command, message, () => {
          if (command.type === 'claimMainMission' && !mainCatalogueUnlocked(ui.snapshot.state!) && (initialMissionIds(ui.snapshot.state!) as readonly string[]).includes(command.id)) ui.content.scrollTop = 0;
          void ui.toast.offsetWidth; ui.toast.classList.add('mission-reward');
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
      if (kind === 'jumpIsland') { ui.button(card, 'Aller sur ta petite île', () => ui.open({kind: 'jumpIsland'}), null, true); return; }
      if (kind === 'pet') {
        // The first rabbit not caressed yet in this cycle: its sheet opens on the portrait to rub.
        const petted = s.missions.daily.petted ?? [], rabbit = s.rabbits.find(r => !petted.includes(r.id)) ?? s.rabbits[0];
        if (rabbit) ui.button(card, 'Caresser un lapin', () => ui.open({kind: 'rabbit', id: rabbit.id}), null, true);
        return;
      }
      if(kind==='extension' && s.acquiredParcels.length<PARCEL_IDS.length){const access=stateLevelAccess(s,{family:'extension',rank:s.acquiredParcels.length});if(access.locked)card.append(node('p',`Extension ${s.acquiredParcels.length} · Niveau ${access.requiredLevel} requis`,'reason'));}
      ui.button(card, kind === 'collection' ? 'Voir la collection' : kind === 'affection' ? 'Voir un lapin' : kind === 'extension' ? 'Voir l’extension' : kind === 'arrange' ? 'Aménager la prairie' : 'Voir le bâtiment ou la boutique', () => {
        if (kind === 'arrange') ui.open({kind:'arrange'});
        else if (kind === 'extension') { ui.open({kind:'shop',tab:'home'}, 'root'); ui.open({kind:'extension'}); }
        else if (kind === 'collection') ui.open({kind});
        else if (kind === 'affection') {
          const rabbit = [...s.rabbits].filter(r => r.affection < BALANCE.maxAffection).sort((a, b) => b.affection - a.affection)[0] ?? s.rabbits[0];
          if (rabbit) ui.open({kind: 'rabbit', id: rabbit.id});
        } else {
          const b = s.buildings.find(b => b.kind === kind);
          ui.open(b ? {kind: 'building', id: b.id} : {kind: 'shop', tab: kind === 'enclosure' ? 'habitats' : 'buildings'});
        }
      }, null, true);
    };
    if (tab === 'main') {
      const unlocked = mainCatalogueUnlocked(s);
      ui.content.append(node('p', unlocked ? 'Tes récompenses et objectifs en progression passent en premier.' : s.missions.claimed.includes('first-birth') ? 'Choisis librement tes objectifs. Toutes les missions seront visibles au niveau 7.' : 'Réclame pour continuer. Les actions anticipées comptent.', 'small mission-intro'));
      const catalogue = !unlocked && ui.onboardingActive && onboardingTask(s,ui.preferences.value,ui.now()).step.id === 'snowReward' ? ['welcome-snow'] as const : visibleMainMissions(s);
      const status = (id: typeof catalogue[number]) => s.missions.claimed.includes(id) ? 'claimed' : s.missions.completed.includes(id) ? 'ready' : 'pending';
      if (unlocked) {
        const filters = node('div', '', 'mission-filters'); filters.setAttribute('aria-label', 'Filtrer les missions principales');
        for (const [filter, label] of [['all', 'Toutes'], ['ready', 'À réclamer'], ['pending', 'En cours'], ['claimed', 'Terminées']] as const) {
          const count = filter === 'all' ? catalogue.length : catalogue.filter(id => status(id) === filter).length;
          const b = ui.button(filters, `${label} (${count})`, () => { ui.missionFilter = filter; ui.render(); }, null, filter !== ui.missionFilter);
          b.dataset.missionFilter = filter; b.dataset.focus = `mission-filter-${filter}`; b.setAttribute('aria-pressed', String(filter === ui.missionFilter));
        }
        ui.content.append(filters);
      }
      const active = [...(unlocked && ui.missionFilter !== 'all' ? catalogue.filter(id => status(id) === ui.missionFilter) : catalogue)];
      if (unlocked) {
        const rank = (id: typeof catalogue[number]) => status(id) === 'ready' ? 0 : status(id) === 'claimed' ? 3 : mainProgress(s, id).value > 0 ? 1 : 2;
        active.sort((a, b) => rank(a) - rank(b));
      }
      if (!active.length) ui.content.append(node('p', unlocked ? 'Aucune mission dans cette sélection.' : 'Toutes les missions principales ont été récompensées. Profite de ta prairie.', 'small'));
      for (const id of active) {
        const mission = MAIN_MISSIONS[id], acquired = s.missions.completed.includes(id), claimed = s.missions.claimed.includes(id);
        const p = mainProgress(s, id), card = ui.card(mission.title, mission.description); card.dataset.mission = id;
        card.dataset.missionStatus = status(id);
        card.classList.add('compact-list-card');
        if (unlocked && !acquired && !claimed && mainProgress(s, id).value > 0) card.classList.add('mission-progressing');
        progress(card, acquired ? p.target : Math.min(p.value, p.target), p.target);
        if (acquired) card.append(node('p', 'Condition acquise', 'small'));
        claim(card, {type: 'claimMainMission', id}, mission.reward, acquired, claimed, mission.extraRewards);
        if (!acquired) {
          const c = mission.condition;
          if (id === 'snow-habitat') ui.button(card,'Voir les habitats Neige',()=>{ui.shopHabitatSpecies='neige';ui.open({kind:'shop',tab:'habitats'});},null,true);
          else if (id === 'welcome-snow') ui.button(card,'Voir Neige',()=>ui.open({kind:'shop',tab:'rabbits'}),null,true);
          else if (c.kind === 'event' && c.event === 'placeDecoration') ui.button(card, 'Voir les décorations', () => ui.open({kind:'shop',tab:'decorations'}), null, true);
          else if (c.kind === 'parents') {
            const parent = s.rabbits.find(r => r.affection < 2);
            ui.button(card, parent ? 'Voir le parent à nourrir' : 'Voir les lapins', () => ui.open(parent ? {kind:'rabbit',id:parent.id} : {kind:'shop',tab:'rabbits'}), null, true);
          }
          else if (c.kind === 'level') card.append(node('p', 'Prends soin de tes lapins et explore la prairie.'));
          else if (c.kind === 'nightOrder') shortcut(card, 'farm');
          else if (c.kind === 'jumpRopeGame') ui.button(card, 'Aller sur ta petite île', () => ui.open({kind: 'jumpIsland'}), null, true);
          else if (c.kind === 'habitatLevel') shortcut(card, 'enclosure');
          else if (c.kind === 'extensions') shortcut(card, 'extension');
          else if (c.kind === 'ordinaryRares') shortcut(card, 'collection');
          else if (c.kind === 'decoration') ui.button(card, 'Voir les décorations', () => ui.open({kind: 'shop', tab: 'decorations'}), null, true);
          else if (c.kind === 'buildingLevel') shortcut(card, c.building);
          else if (c.kind === 'paidRecipe') ui.button(card, 'Voir les recettes de la boutique', () => ui.open({kind: 'shop', tab: 'recipes'}), null, true);
          else if (c.kind === 'evolutions') shortcut(card, 'collection');
          else if (c.kind === 'bennyRunGame') shortcut(card, 'lair');
          else shortcut(card, c.kind === 'building' ? c.building : c.kind === 'event' ? c.event === 'collectOrder' ? 'farm' : c.event === 'breed' ? 'nest' : 'nursery' : c.kind === 'discoveries' || c.kind === 'rare' || c.kind === 'species' ? 'collection' : c.kind);
        }
        ui.content.append(card);
      }
    } else {
      const daily = s.missions.daily, cycleStart = dailyCycleStart(s), shown = dailyMissionsOf(s), done = shown.filter(id => daily.claimed.includes(id)).length;
      // Three missions, all open from the start, to do in any order. The cycle bonus follows the three claims.
      const intro = node('section', '', 'mission-day-intro');
      intro.append(node('p', 'Trois missions aujourd’hui, dans l’ordre que tu veux.', 'mission-day-lead'), node('p', 'Renouvellement dans :', 'small'));
      const timer = node('p', '', 'timer'); timer.dataset.end = String(dailyCycleEnd(s)); intro.append(timer);
      intro.append(node('p', 'À réclamer avant le renouvellement.', 'small'));
      ui.content.append(intro);
      for (const id of shown) {
        const mission = DAILY_MISSIONS[id], value = dailyProgress(s, id), claimed = daily.claimed.includes(id), ready = dailyClaimable(s, id);
        const card = ui.card(mission.title, mission.description); card.dataset.mission = id; card.dataset.missionStatus = claimed ? 'claimed' : ready ? 'ready' : 'pending';
        card.classList.add('mission-day-card');
        progress(card, Math.min(value, mission.target), mission.target);
        claim(card, {type: 'claimDailyMission', id, cycleStart}, mission.reward, ready, claimed);
        if (!claimed && !ready) shortcut(card, mission.place);
        ui.content.append(card);
      }
      const bonus = ui.card('Bonus du cycle', 'Réclame les trois missions pour recevoir ce bonus.'); bonus.dataset.mission = 'daily-bonus'; bonus.classList.add('mission-day-card', 'mission-bonus');
      progress(bonus, done, DAILY_PICK_COUNT);
      claim(bonus, {type: 'claimDailyBonus', cycleStart}, DAILY_BONUS[0], dailyBonusReady(s), daily.bonusClaimed, DAILY_BONUS.slice(1));
      ui.content.append(bonus);
      // Christmas: the challenges and their sucres d'orge are at the market (they count in the Missions badge).
      if (christmasActive()) {
        const waiting = availableChristmasRewards(s), noel = ui.card('Défis de Noël', waiting ? `${waiting} récompense${waiting > 1 ? 's' : ''} de Noël à réclamer au marché.` : 'Trois défis de Noël chaque jour, au Marché de Noël.');
        noel.dataset.mission = 'christmas'; noel.classList.add('mission-day-card');
        ui.button(noel, 'Aller au Marché de Noël', () => ui.open({kind: 'christmasMarket'}), null, true); ui.content.append(noel);
      }

    }
}
