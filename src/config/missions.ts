import {HOUR, SPECIES, type BuildingKind} from './balance';
import {habitatPrice, type HabitatType} from './habitats';

export type Reward = {resource: 'pattes' | 'grass' | 'hearts'; amount: number} | {resource: 'none'; amount: 0};
export type MainCondition = {kind: 'building'; building: BuildingKind; habitatType?: HabitatType; target?: number} | {kind: 'discoveries' | 'affection'; target: number} | {kind: 'extension' | 'rare'} | {kind: 'level' | 'extensions' | 'habitatLevel'; target: number} | {kind: 'ordinaryRares' | 'nightOrder'} | {kind: 'species'; species: 'neige' | 'feu' | 'belier-gris' | 'volant'} | {kind: 'parents'; target: number} | {kind: 'event'; event: MainEvent; target: number};
export type MainDefinition = {title: string; description: string; condition: MainCondition; reward: Reward};
export const MAIN_EVENT_IDS = ['collectOrder', 'breed', 'transferBirth', 'welcome', 'placeDecoration'] as const;
export type MainEvent = typeof MAIN_EVENT_IDS[number];
export const INITIAL_MISSION_IDS = ['first-meal', 'first-farm', 'first-harvest', 'parents-ready', 'at-nest', 'to-nursery', 'first-birth'] as const;
export const SOLO_INITIAL_MISSION_IDS = ['snow-habitat', 'welcome-snow', 'first-meal', 'parents-ready', 'at-nest', 'first-farm', 'first-harvest', 'to-nursery', 'first-birth'] as const;
export const BRANCH_MISSION_IDS = ['varied-family', 'growing-collection', 'two-habitats', 'strong-bonds', 'first-decoration', 'bigger-meadow','seven-species'] as const;
export const DURABLE_MISSION_IDS = ['level-five', 'welcome-fire', 'night-order', 'ten-species', 'habitat-two', 'level-ten', 'welcome-metal', 'three-extensions', 'fifteen-species', 'welcome-flight', 'level-fifteen', 'all-ordinary-rares'] as const;
export const ACTIVE_MAIN_MISSION_IDS = [...DURABLE_MISSION_IDS, ...INITIAL_MISSION_IDS, ...BRANCH_MISSION_IDS, 'snow-habitat', 'welcome-snow'] as const;
// Historical identifiers remain readable; retired rewards cannot be claimed again.
export const MAIN_MISSION_IDS = [...DURABLE_MISSION_IDS, 'first-farm', 'cozy-nest', 'welcome-babies', 'varied-family', 'strong-bonds', 'growing-collection', 'bigger-meadow', 'first-rare', 'first-meal', 'first-harvest', 'parents-ready', 'at-nest', 'to-nursery', 'first-birth', 'two-habitats', 'first-decoration','seven-species','snow-habitat','welcome-snow'] as const;
export type MainMissionId = typeof MAIN_MISSION_IDS[number];
export const MAIN_MISSIONS: Record<MainMissionId, MainDefinition> = {
  'level-five': {title:'Atteindre le niveau 5',description:'Atteindre le niveau 5.',condition:{kind:'level',target:5},reward:{resource:'hearts',amount:2}},
  'welcome-fire': {title:'Accueillir Feu',description:'Accueillir Feu.',condition:{kind:'species',species:'feu'},reward:{resource:'pattes',amount:100}},
  'night-order': {title:'Une culture plus longue',description:'Lancer à la ferme une culture d’une heure ou plus.',condition:{kind:'nightOrder'},reward:{resource:'grass',amount:60}},
  'ten-species': {title:'Découvrir 10 espèces',description:'Découvrir 10 espèces.',condition:{kind:'discoveries',target:10},reward:{resource:'hearts',amount:3}},
  'habitat-two': {title:'Améliorer un habitat au niveau 2',description:'Améliorer un habitat au niveau 2.',condition:{kind:'habitatLevel',target:2},reward:{resource:'pattes',amount:150}},
  'level-ten': {title:'Atteindre le niveau 10',description:'Atteindre le niveau 10.',condition:{kind:'level',target:10},reward:{resource:'hearts',amount:3}},
  'welcome-metal': {title:'Accueillir Bélier Gris',description:'Accueillir Bélier Gris.',condition:{kind:'species',species:'belier-gris'},reward:{resource:'pattes',amount:300}},
  'three-extensions': {title:'Agrandir l’île trois fois',description:'Agrandir l’île trois fois.',condition:{kind:'extensions',target:3},reward:{resource:'hearts',amount:5}},
  'fifteen-species': {title:'Découvrir 15 espèces',description:'Découvrir 15 espèces.',condition:{kind:'discoveries',target:15},reward:{resource:'hearts',amount:5}},
  'welcome-flight': {title:'Accueillir Volant',description:'Accueillir Volant.',condition:{kind:'species',species:'volant'},reward:{resource:'pattes',amount:500}},
  'level-fifteen': {title:'Atteindre le niveau 15',description:'Atteindre le niveau 15.',condition:{kind:'level',target:15},reward:{resource:'hearts',amount:5}},
  'all-ordinary-rares': {title:'Découvrir tous les rares ordinaires',description:'Découvrir tous les rares ordinaires.',condition:{kind:'ordinaryRares'},reward:{resource:'hearts',amount:10}},
  'snow-habitat': {title:'Posséder un habitat Neige', description:'Acheter le Jardin enneigé et confirmer son placement.', condition:{kind:'building',building:'enclosure',habitatType:'neige'},reward:{resource:'pattes',amount:0}},
  'welcome-snow': {title:'Accueillir Neige', description:'Accueillir Neige dans la prairie. Récompense unique de départ.',condition:{kind:'species',species:'neige'},reward:{resource:'pattes',amount:50}},
  'seven-species':{title:'Découvrir 7 espèces',description:'Découvrir 7 espèces distinctes. Le niveau du joueur détermine les achats disponibles.',condition:{kind:'discoveries',target:7},reward:{resource:'none',amount:0}},
  'first-meal': {title: 'Un premier repas', description: 'Un lapin atteint l’affection 2.', condition: {kind: 'affection', target: 2}, reward: {resource: 'grass', amount: 10}},
  'first-harvest': {title: 'Première récolte', description: 'Récolter 20 nourriture dans une ferme.', condition: {kind: 'event', event: 'collectOrder', target: 20}, reward: {resource: 'pattes', amount: 30}},
  'parents-ready': {title: 'Deux parents prêts', description: 'Posséder deux lapins d’affection au moins 2.', condition: {kind: 'parents', target: 2}, reward: {resource: 'pattes', amount: 20}},
  'at-nest': {title: 'Au nid', description: 'Lancer une reproduction gratuite.', condition: {kind: 'event', event: 'breed', target: 1}, reward: {resource: 'grass', amount: 20}},
  'to-nursery': {title: 'Vers la nurserie', description: 'Transférer manuellement un lapereau dans la nurserie.', condition: {kind: 'event', event: 'transferBirth', target: 1}, reward: {resource: 'pattes', amount: 30}},
  // The final tutorial reward alone funds the Fire home and its common rabbit, at current shop prices.
  'first-birth': {title: 'Première naissance', description: 'Accueillir un lapereau issu d’une reproduction.', condition: {kind: 'event', event: 'welcome', target: 1}, reward: {resource: 'pattes', amount: habitatPrice('feu') + SPECIES.feu.price!}},
  'two-habitats': {title: 'Deux habitats', description: 'Posséder deux habitats.', condition: {kind: 'building', building: 'enclosure', target: 2}, reward: {resource: 'grass', amount: 30}},
  'first-decoration': {title: 'Décorer la prairie', description: 'Poser une décoration extérieure, un objectif facultatif.', condition: {kind: 'event', event: 'placeDecoration', target: 1}, reward: {resource: 'pattes', amount: 20}},
  'first-farm': {title: 'Notre ferme', description: 'Posséder une ferme.', condition: {kind: 'building', building: 'farm'}, reward: {resource: 'grass', amount: 20}},
  'cozy-nest': {title: 'Un nid douillet', description: 'Posséder un nid.', condition: {kind: 'building', building: 'nest'}, reward: {resource: 'pattes', amount: 30}},
  'welcome-babies': {title: 'Bienvenue aux lapereaux', description: 'Posséder une nurserie.', condition: {kind: 'building', building: 'nursery'}, reward: {resource: 'grass', amount: 20}},
  'varied-family': {title: 'Une famille variée', description: 'Avoir découvert 3 espèces.', condition: {kind: 'discoveries', target: 3}, reward: {resource: 'pattes', amount: 50}},
  'strong-bonds': {title: 'Des liens plus forts', description: 'Avoir un lapin d’affection 5.', condition: {kind: 'affection', target: 5}, reward: {resource: 'hearts', amount: 1}},
  'growing-collection': {title: 'Collection naissante', description: 'Avoir découvert 5 espèces.', condition: {kind: 'discoveries', target: 5}, reward: {resource: 'hearts', amount: 2}},
  'bigger-meadow': {title: 'Une prairie plus grande', description: 'Avoir acheté la première extension.', condition: {kind: 'extension'}, reward: {resource: 'pattes', amount: 100}},
  'first-rare': {title: 'Première espèce rare', description: 'Découvrir une espèce rare.', condition: {kind: 'rare'}, reward: {resource: 'hearts', amount: 3}},
};
export const DAILY_MISSION_IDS = ['collect-pattes', 'collect-grass', 'gain-affection'] as const;
export type DailyMissionId = typeof DAILY_MISSION_IDS[number];
export type MissionEvent = 'collectIncome' | 'collectOrder' | 'gainAffection' | 'breed';
export const DAILY_MISSIONS: Record<DailyMissionId, {title: string; description: string; event: MissionEvent; target: number; reward: Reward}> = {
  'collect-pattes': {title: 'Récolte de pattes', description: 'Récolter 100 pattes dans les habitats.', event: 'collectIncome', target: 100, reward: {resource: 'pattes', amount: 60}},
  'collect-grass': {title: 'Une réserve de nourriture', description: 'Récolter 40 nourriture dans les fermes.', event: 'collectOrder', target: 40, reward: {resource: 'grass', amount: 30}},
  'gain-affection': {title: 'Lancer une reproduction', description: 'Lance une reproduction au nid.', event: 'breed', target: 1, reward: {resource: 'pattes', amount: 40}},
};
export const MISSION_CYCLE_DURATION = 24 * HOUR;
/** One daily mission per session: the next one opens this long after the previous claim (target: three 5-minute sessions a day). */
export const DAILY_MISSION_GAP = 4 * HOUR;
export const DAILY_BONUS: Reward = {resource: 'hearts', amount: 2};
