import {HOUR, type BuildingKind} from './balance';
import type {HabitatType} from './habitats';

export type Reward = {resource: 'pattes' | 'grass' | 'hearts'; amount: number} | {resource: 'none'; amount: 0};
export type MainCondition = {kind: 'building'; building: BuildingKind; habitatType?: HabitatType; target?: number} | {kind: 'discoveries' | 'affection'; target: number} | {kind: 'extension' | 'rare'} | {kind: 'species'; species: 'neige'} | {kind: 'parents'; target: number} | {kind: 'event'; event: MainEvent; target: number};
export type MainDefinition = {title: string; description: string; condition: MainCondition; reward: Reward};
export const MAIN_EVENT_IDS = ['collectOrder', 'breed', 'transferBirth', 'welcome', 'placeDecoration'] as const;
export type MainEvent = typeof MAIN_EVENT_IDS[number];
export const INITIAL_MISSION_IDS = ['first-meal', 'first-farm', 'first-harvest', 'parents-ready', 'at-nest', 'to-nursery', 'first-birth'] as const;
export const SOLO_INITIAL_MISSION_IDS = ['snow-habitat', 'welcome-snow', 'first-meal', 'parents-ready', 'at-nest', 'first-farm', 'first-harvest', 'to-nursery', 'first-birth'] as const;
export const BRANCH_MISSION_IDS = ['varied-family', 'growing-collection', 'two-habitats', 'strong-bonds', 'first-decoration', 'bigger-meadow','seven-species'] as const;
export const ACTIVE_MAIN_MISSION_IDS = [...INITIAL_MISSION_IDS, ...BRANCH_MISSION_IDS, 'snow-habitat', 'welcome-snow'] as const;
// Historical identifiers remain readable; retired rewards cannot be claimed again.
export const MAIN_MISSION_IDS = ['first-farm', 'cozy-nest', 'welcome-babies', 'varied-family', 'strong-bonds', 'growing-collection', 'bigger-meadow', 'first-rare', 'first-meal', 'first-harvest', 'parents-ready', 'at-nest', 'to-nursery', 'first-birth', 'two-habitats', 'first-decoration','seven-species','snow-habitat','welcome-snow'] as const;
export type MainMissionId = typeof MAIN_MISSION_IDS[number];
export const MAIN_MISSIONS: Record<MainMissionId, MainDefinition> = {
  'snow-habitat': {title:'Posséder un habitat Neige', description:'Acheter le Jardin enneigé et confirmer son placement.', condition:{kind:'building',building:'enclosure',habitatType:'neige'},reward:{resource:'pattes',amount:0}},
  'welcome-snow': {title:'Accueillir Neige', description:'Accueillir Neige dans la prairie. Récompense unique de départ.',condition:{kind:'species',species:'neige'},reward:{resource:'pattes',amount:50}},
  'seven-species':{title:'Découvrir 7 espèces',description:'Découvrir 7 espèces distinctes. Le niveau du joueur détermine les achats disponibles.',condition:{kind:'discoveries',target:7},reward:{resource:'none',amount:0}},
  'first-meal': {title: 'Un premier repas', description: 'Un lapin atteint l’affection 2.', condition: {kind: 'affection', target: 2}, reward: {resource: 'grass', amount: 10}},
  'first-harvest': {title: 'Première récolte', description: 'Récolter 20 herbes dans une ferme.', condition: {kind: 'event', event: 'collectOrder', target: 20}, reward: {resource: 'pattes', amount: 30}},
  'parents-ready': {title: 'Deux parents prêts', description: 'Posséder deux lapins d’affection au moins 2.', condition: {kind: 'parents', target: 2}, reward: {resource: 'pattes', amount: 20}},
  'at-nest': {title: 'Au nid', description: 'Lancer une reproduction gratuite.', condition: {kind: 'event', event: 'breed', target: 1}, reward: {resource: 'grass', amount: 20}},
  'to-nursery': {title: 'Vers la nurserie', description: 'Transférer manuellement un lapereau dans la nurserie.', condition: {kind: 'event', event: 'transferBirth', target: 1}, reward: {resource: 'pattes', amount: 30}},
  'first-birth': {title: 'Première naissance', description: 'Accueillir un lapereau issu d’une reproduction.', condition: {kind: 'event', event: 'welcome', target: 1}, reward: {resource: 'pattes', amount: 50}},
  'two-habitats': {title: 'Deux habitats', description: 'Posséder deux habitats.', condition: {kind: 'building', building: 'enclosure', target: 2}, reward: {resource: 'grass', amount: 30}},
  'first-decoration': {title: 'Décorer la prairie', description: 'Poser une décoration extérieure, un objectif facultatif.', condition: {kind: 'event', event: 'placeDecoration', target: 1}, reward: {resource: 'pattes', amount: 20}},
  'first-farm': {title: 'Notre ferme', description: 'Posséder une ferme.', condition: {kind: 'building', building: 'farm'}, reward: {resource: 'grass', amount: 20}},
  'cozy-nest': {title: 'Un nid douillet', description: 'Posséder un nid.', condition: {kind: 'building', building: 'nest'}, reward: {resource: 'pattes', amount: 30}},
  'welcome-babies': {title: 'Bienvenue aux lapereaux', description: 'Posséder une nurserie.', condition: {kind: 'building', building: 'nursery'}, reward: {resource: 'grass', amount: 20}},
  'varied-family': {title: 'Une famille variée', description: 'Avoir découvert 3 espèces.', condition: {kind: 'discoveries', target: 3}, reward: {resource: 'pattes', amount: 50}},
  'strong-bonds': {title: 'Des liens plus forts', description: 'Avoir un lapin d’affection 5.', condition: {kind: 'affection', target: 5}, reward: {resource: 'hearts', amount: 1}},
  'growing-collection': {title: 'Collection naissante', description: 'Avoir découvert 5 espèces.', condition: {kind: 'discoveries', target: 5}, reward: {resource: 'hearts', amount: 2}},
  'bigger-meadow': {title: 'Une prairie plus grande', description: 'Avoir acheté la première extension.', condition: {kind: 'extension'}, reward: {resource: 'pattes', amount: 100}},
  'first-rare': {title: 'Première espèce rare', description: 'Découvrir Lunettes, Perroquet ou Feu Glacé.', condition: {kind: 'rare'}, reward: {resource: 'hearts', amount: 3}},
};
export const DAILY_MISSION_IDS = ['collect-pattes', 'collect-grass', 'gain-affection'] as const;
export type DailyMissionId = typeof DAILY_MISSION_IDS[number];
export type MissionEvent = 'collectIncome' | 'collectOrder' | 'gainAffection';
export const DAILY_MISSIONS: Record<DailyMissionId, {title: string; description: string; event: MissionEvent; target: number; reward: Reward}> = {
  'collect-pattes': {title: 'Récolte de pattes', description: 'Récolter 100 pattes dans les habitats.', event: 'collectIncome', target: 100, reward: {resource: 'pattes', amount: 30}},
  'collect-grass': {title: 'Une réserve d’herbe', description: 'Récolter 40 herbes dans les fermes.', event: 'collectOrder', target: 40, reward: {resource: 'grass', amount: 10}},
  'gain-affection': {title: 'Des lapins choyés', description: 'Gagner 3 niveaux d’affection au total.', event: 'gainAffection', target: 3, reward: {resource: 'pattes', amount: 20}},
};
export const MISSION_CYCLE_DURATION = 24 * HOUR;
export const DAILY_BONUS: Reward = {resource: 'hearts', amount: 2};
