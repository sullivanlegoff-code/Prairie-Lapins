import {HOUR, SPECIES, SPECIES_IDS, type BuildingKind, type SpeciesId} from './balance';
import {habitatPrice, type HabitatType} from './habitats';
import {DECORATIONS, DECORATION_IDS, type DecorationId} from './decorations';

export type Reward = {resource: 'pattes' | 'grass' | 'hearts'; amount: number} | {resource: 'none'; amount: 0};
export type MainCondition = {kind: 'building'; building: BuildingKind; habitatType?: HabitatType; target?: number} | {kind: 'discoveries' | 'affection'; target: number} | {kind: 'extension' | 'rare'} | {kind: 'level' | 'extensions' | 'habitatLevel'; target: number} | {kind: 'ordinaryRares' | 'nightOrder' | 'paidRecipe'} | {kind: 'species'; species: SpeciesId} | {kind: 'decoration'; model: DecorationId} | {kind: 'buildingLevel'; building: 'farm' | 'agency' | 'nursery'; target: number} | {kind: 'parents'; target: number} | {kind: 'event'; event: MainEvent; target: number};
export type MainDefinition = {title: string; description: string; condition: MainCondition; reward: Reward; extraRewards?: readonly Reward[]; claimXp?: number};
export const MAIN_EVENT_IDS = ['collectOrder', 'breed', 'transferBirth', 'welcome', 'placeDecoration'] as const;
export type MainEvent = typeof MAIN_EVENT_IDS[number];
export const INITIAL_MISSION_IDS = ['first-meal', 'first-farm', 'first-harvest', 'parents-ready', 'at-nest', 'to-nursery', 'first-birth'] as const;
export const SOLO_INITIAL_MISSION_IDS = ['snow-habitat', 'welcome-snow', 'first-meal', 'parents-ready', 'at-nest', 'first-farm', 'first-harvest', 'to-nursery', 'first-birth'] as const;
export const BRANCH_MISSION_IDS = ['varied-family', 'growing-collection', 'two-habitats', 'strong-bonds', 'first-decoration', 'bigger-meadow','seven-species'] as const;
export const DURABLE_MISSION_IDS = ['level-five', 'welcome-fire', 'night-order', 'ten-species', 'habitat-two', 'level-ten', 'welcome-metal', 'three-extensions', 'fifteen-species', 'welcome-flight', 'level-fifteen', 'all-ordinary-rares'] as const;
export const DISCOVERY_MISSION_IDS = SPECIES_IDS.map(id => `discover-${id}` as const);
export const DECORATION_MISSION_IDS = DECORATION_IDS.map(id => `decorate-${id}` as const);
const MILESTONE_MISSIONS = {
  'build-kitchen': {title: 'Une cuisine dans la prairie', description: 'Construis la Cuisine.', condition: {kind: 'building', building: 'kitchen'}},
  'build-agency': {title: 'Prêts pour les vacances', description: 'Construis l’agence de voyage.', condition: {kind: 'building', building: 'agency'}},
  'build-affection-statue': {title: 'La Statue de l’Affection', description: 'Construis la Statue de l’Affection.', condition: {kind: 'building', building: 'statue'}},
  'second-farm': {title: 'Deux fermes pour la prairie', description: 'Possède deux fermes.', condition: {kind: 'building', building: 'farm', target: 2}},
  'farm-level-two': {title: 'Une ferme améliorée', description: 'Améliore une ferme au niveau 2.', condition: {kind: 'buildingLevel', building: 'farm', target: 2}},
  'habitat-level-three': {title: 'Un habitat au grand complet', description: 'Améliore un habitat au niveau 3.', condition: {kind: 'habitatLevel', target: 3}},
  'nursery-capacity-two': {title: 'Deux places pour les petits', description: 'Débloque deux places dans la nurserie.', condition: {kind: 'buildingLevel', building: 'nursery', target: 2}},
  'nursery-capacity-three': {title: 'Trois places pour les petits', description: 'Débloque trois places dans la nurserie.', condition: {kind: 'buildingLevel', building: 'nursery', target: 3}},
  'nursery-capacity-four': {title: 'Une nurserie bien remplie', description: 'Débloque les quatre places de la nurserie.', condition: {kind: 'buildingLevel', building: 'nursery', target: 4}},
  'agency-level-two': {title: 'Une agence qui grandit', description: 'Améliore l’agence au niveau 2.', condition: {kind: 'buildingLevel', building: 'agency', target: 2}},
  'agency-level-three': {title: 'Des vacances pour trois', description: 'Améliore l’agence au niveau 3.', condition: {kind: 'buildingLevel', building: 'agency', target: 3}},
  'affection-ten': {title: 'De vrais complices', description: 'Amène un lapin à l’affection 10.', condition: {kind: 'affection', target: 10}},
  'affection-fifteen': {title: 'Inséparables', description: 'Amène un lapin à l’affection 15.', condition: {kind: 'affection', target: 15}},
  'affection-twenty': {title: 'Une affection au sommet', description: 'Amène un lapin à l’affection 20.', condition: {kind: 'affection', target: 20}},
  'level-twenty': {title: 'Atteindre le niveau 20', description: 'Atteins le niveau 20.', condition: {kind: 'level', target: 20}},
  'level-twenty-two': {title: 'Atteindre le niveau 22', description: 'Atteins le niveau 22.', condition: {kind: 'level', target: 22}},
  'level-twenty-five': {title: 'Atteindre le niveau 25', description: 'Atteins le niveau 25.', condition: {kind: 'level', target: 25}},
  'level-thirty': {title: 'Atteindre le niveau 30', description: 'Atteins le niveau 30.', condition: {kind: 'level', target: 30}},
  'island-complete': {title: 'Toute l’île pour tes lapins', description: 'Achète les huit extensions de l’île.', condition: {kind: 'extensions', target: 8}},
  'first-paid-recipe': {title: 'Une recette dans ton carnet', description: 'Ajoute une recette de la boutique à ton carnet. Une recette déjà enregistrée compte aussi.', condition: {kind: 'paidRecipe'}},
} as const satisfies Record<string, Omit<MainDefinition, 'reward'>>;
export const MILESTONE_MISSION_IDS = Object.keys(MILESTONE_MISSIONS) as (keyof typeof MILESTONE_MISSIONS)[];
export const NEW_MAIN_MISSION_IDS = [...DISCOVERY_MISSION_IDS, ...DECORATION_MISSION_IDS, ...MILESTONE_MISSION_IDS];
export const ACTIVE_MAIN_MISSION_IDS = [...DURABLE_MISSION_IDS, ...INITIAL_MISSION_IDS, ...BRANCH_MISSION_IDS, 'snow-habitat', 'welcome-snow', ...NEW_MAIN_MISSION_IDS] as const;
// Historical identifiers remain readable; retired rewards cannot be claimed again.
export const MAIN_MISSION_IDS = [...DURABLE_MISSION_IDS, 'first-farm', 'cozy-nest', 'welcome-babies', 'varied-family', 'strong-bonds', 'growing-collection', 'bigger-meadow', 'first-rare', 'first-meal', 'first-harvest', 'parents-ready', 'at-nest', 'to-nursery', 'first-birth', 'two-habitats', 'first-decoration','seven-species','snow-habitat','welcome-snow', ...NEW_MAIN_MISSION_IDS] as const;
export type MainMissionId = typeof MAIN_MISSION_IDS[number];
export const MAIN_MISSIONS: Record<MainMissionId, MainDefinition> = {
  ...Object.fromEntries<MainDefinition>(SPECIES_IDS.map(species => {
    const info = SPECIES[species], rank = info.rarity === 'legendary' ? 4 : info.rarity === 'epic' ? 3 : info.rarity === 'rare' ? 2 : 1;
    const extraRewards: Reward[] = [{resource: 'grass', amount: rank * 10}];
    if (rank >= 3) extraRewards.push({resource: 'hearts', amount: rank - 2});
    return [`discover-${species}`, {title: `Découvrir ${info.name}`, description: `Accueille ${info.name} pour la première fois.`, condition: {kind: 'species', species}, reward: {resource: 'pattes', amount: rank * 20}, extraRewards, claimXp: 0} satisfies MainDefinition];
  })) as Record<typeof DISCOVERY_MISSION_IDS[number], MainDefinition>,
  ...Object.fromEntries(DECORATION_IDS.map(model => [`decorate-${model}`, {title: `Installer : ${DECORATIONS[model].name}`, description: `Pose ${DECORATIONS[model].name} dans la prairie pour la première fois. Chaque modèle compte une seule fois.`, condition: {kind: 'decoration', model}, reward: {resource: 'none', amount: 0}, claimXp: 10}])) as Record<typeof DECORATION_MISSION_IDS[number], MainDefinition>,
  ...Object.fromEntries(MILESTONE_MISSION_IDS.map(id => [id, {...MILESTONE_MISSIONS[id], reward: {resource: 'none', amount: 0}, claimXp: 20}])) as Record<typeof MILESTONE_MISSION_IDS[number], MainDefinition>,
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
/** All components belong to the same manual, atomic claim; legacy single-resource rewards are unchanged. */
export const mainMissionRewards = (mission: MainDefinition): readonly Reward[] => [mission.reward, ...(mission.extraRewards ?? [])];
/**
 * Daily pool. Each cycle shows THREE of these at once, all open from the start, to complete in any order (see
 * `dailyMissionsFor`). `gain-affection` keeps its id from the first version; it is the breeding mission.
 */
export const DAILY_MISSION_IDS = ['collect-pattes', 'collect-grass', 'feed-rabbit', 'gain-affection', 'welcome-baby', 'decorate'] as const;
export type DailyMissionId = typeof DAILY_MISSION_IDS[number];
/** How many daily missions are shown and must be claimed before the cycle bonus. */
export const DAILY_PICK_COUNT = 3;
export type MissionEvent = 'collectIncome' | 'collectOrder' | 'feed' | 'breed' | 'welcome' | 'placeDecoration';
export type DailyCategory = 'collect' | 'care' | 'breed' | 'nursery' | 'decor';
/** `place` is where the shortcut button leads; `category` keeps the three shown missions varied (one per category). */
export const DAILY_MISSIONS: Record<DailyMissionId, {title: string; description: string; event: MissionEvent; category: DailyCategory; target: number; reward: Reward; place: BuildingKind | 'collection' | 'arrange'}> = {
  'collect-pattes': {title: 'Récolte de pattes', description: 'Récolter 100 pattes dans les habitats.', event: 'collectIncome', category: 'collect', target: 100, reward: {resource: 'pattes', amount: 60}, place: 'enclosure'},
  'collect-grass': {title: 'Une réserve de nourriture', description: 'Récolter 40 nourriture dans les fermes.', event: 'collectOrder', category: 'collect', target: 40, reward: {resource: 'grass', amount: 30}, place: 'farm'},
  'feed-rabbit': {title: 'Un petit goûter', description: 'Nourrir trois fois un lapin.', event: 'feed', category: 'care', target: 3, reward: {resource: 'pattes', amount: 30}, place: 'enclosure'},
  'gain-affection': {title: 'Lancer une reproduction', description: 'Lance une reproduction au nid.', event: 'breed', category: 'breed', target: 1, reward: {resource: 'pattes', amount: 40}, place: 'nest'},
  'welcome-baby': {title: 'Accueillir un lapereau', description: 'Accueille un lapereau prêt depuis la nurserie.', event: 'welcome', category: 'nursery', target: 1, reward: {resource: 'pattes', amount: 40}, place: 'nursery'},
  'decorate': {title: 'Un coin joli', description: 'Poser une décoration dans la prairie.', event: 'placeDecoration', category: 'decor', target: 1, reward: {resource: 'pattes', amount: 40}, place: 'arrange'},
};
export const MISSION_CYCLE_DURATION = 24 * HOUR;
/** The cycle bonus, claimed once the three shown missions are claimed: hearts and food here, XP in progression.ts. */
export const DAILY_BONUS: readonly Reward[] = [{resource: 'hearts', amount: 2}, {resource: 'grass', amount: 20}];
