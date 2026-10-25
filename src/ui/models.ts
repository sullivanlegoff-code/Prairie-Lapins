import {stateLevelAccess} from '../simulation/levelRights';
import {buildingPlacementReason} from '../simulation/placement';
import {habitatPrice, type HabitatType} from '../config/habitats';
import {BALANCE, HOUR, SPECIES, SPECIES_IDS, RECIPE_SPECIES, type BuildingKind, type SpeciesId, type RabbitType, type Rarity} from '../config/balance';
import {breedingPool, recipeMatches, ordinaryPoolAllows, nestForParent} from '../simulation/breeding';
import {recipeKnown, recipePrice} from '../simulation/recipes';
import {babiesBySlot, freeNurserySlots, nurseryBuilding, nurserySlotStates, nurseryUnlockQuote, type NurserySlotState} from '../simulation/nursery';
import type {GameState, NurserySlot, Refusal} from '../state/types';
import {ISLAND} from '../config/islandGeometry';
import {mapRarities} from '../config/rarities';

export const BUILDING_NAMES: Record<BuildingKind, string> = {enclosure: 'Enclos', farm: 'Ferme', nest: 'Nid', nursery: 'Nurserie', kitchen: 'Cuisine'};
export const REFUSALS: Record<Refusal | 'NO_GAME' | 'DISPOSED' | 'SALE_NOT_SAVED' | 'ACTION_NOT_SAVED' | 'STORAGE_CHANGED', string> = {
  LEVEL_REQUIRED:'Niveau du joueur insuffisant pour cette action.',
  NO_BREEDING_RESULT:'Aucun résultat ordinaire accessible à ce niveau. La reproduction attend pour conserver les probabilités spéciales. Consultez le carnet.',
  PURCHASE_LOCKED:'Cet achat est verrouillé. Consultez son niveau requis.',
  RECIPE_KNOWN:'Cette recette est déjà dans votre carnet. Aucun nouvel achat n’est nécessaire.',
  ACTION_NOT_SAVED: 'L’action n’a pas pu être sauvegardée. Aucun paiement ni changement validé. Réessayez après avoir résolu le problème de sauvegarde.',
  STORAGE_CHANGED: 'Une autre fenêtre a modifié cette partie. Exportez la copie en mémoire puis rechargez la page pour continuer.',
  SALE_NOT_SAVED: 'La vente n’a pas pu être sauvegardée. Objet et solde conservés. Réessayez après avoir résolu le problème de sauvegarde.',
  DECORATION_LIMIT: 'Inventaire limité à 512 exemplaires pour préserver les performances.',
  DECORATION_OVERLAP: 'Cette empreinte chevauche une autre décoration.',
  DECORATION_BLOCKS_BUILDING: 'Cette empreinte chevauche une décoration. Déplacez ou rangez cet objet avant de poser le bâtiment.',
  INVALID_NAME: 'Nom refusé : 32 caractères au plus, sans retour à la ligne ni caractère de contrôle.',
  UPGRADE_BLOCKED_BUILDING: 'Pas assez de place pour agrandir : un autre bâtiment occupe la zone voisine. Déplacez-le d’abord ; rien n’est déplacé automatiquement, rien n’est payé.',
  UPGRADE_BLOCKED_DECORATION: 'Pas assez de place pour agrandir : une décoration occupe la zone voisine. Déplacez ou rangez-la d’abord ; rien n’est payé.',
  UPGRADE_BLOCKED_LAND: 'Pas assez de place pour agrandir : la zone voisine n’est pas du terrain acquis. Déplacez l’enclos ou agrandissez l’île ; rien n’est payé.',
  TYPE_INCOMPATIBLE: 'Type incompatible.', MAX_HABITAT_LEVEL: 'Niveau maximal atteint.', MAX_NURSERY_CAPACITY: 'Capacité maximale : les quatre couchages sont débloqués.',
  ALREADY_CLAIMED: 'Cette récompense a déjà été réclamée.', CYCLE_EXPIRED: 'Ce cycle a expiré. Consultez les nouvelles missions.', RESOURCE_LIMIT: 'Le solde est trop élevé pour recevoir cette récompense.',
  NOT_ENOUGH_HEARTS: 'Pas assez de cœurs. Vous pouvez continuer en attendant ou en récoltant dans les habitats.',
  ACTION_FINISHED: 'Cette étape est déjà terminée : aucun cœur dépensé.', STALE_ACTION: 'Cette action a changé. Ouvrez à nouveau son panneau.',
  PRICE_CHANGED: 'Le paiement a changé. Vérifiez le nouveau prix avant de confirmer.', NO_MISSING_PATTES: 'Votre solde suffit maintenant. Utilisez le paiement normal.',
  INVALID_TIME: 'L’heure de l’appareil est invalide.', INVALID_RANDOM: 'Le tirage n’a pas pu aboutir. Réessayez.', INVALID_CHOICE: 'Ce choix n’est pas disponible.',
  NOT_FOUND: 'Cet élément n’est plus présent.', NOT_ENOUGH_PATTES: 'Solde insuffisant.', NOT_ENOUGH_GRASS: 'Pas assez d’herbe.',
  INVALID_CELL: 'Cette case n’est pas encore disponible.', CELL_OCCUPIED: 'Cette case est occupée.', BUILDING_LIMIT: 'Limite de bâtiments atteinte.',
  CAPACITY_FULL: 'Habitat plein.', BUSY: 'Ce bâtiment est occupé.', NOT_READY: 'Ce n’est pas encore prêt.', MAX_AFFECTION: 'Affection maximale atteinte.',
  SAME_PARENT: 'Choisissez deux lapins différents.', AFFECTION_TOO_LOW: 'Chaque parent doit avoir au moins 2 d’affection.',
  MISSING_BUILDING: 'Il manque un bâtiment nécessaire : nid, nurserie ou cuisine.', ALREADY_EXPANDED: 'L’extension est déjà achetée.', PARCEL_UNAVAILABLE: 'Cette parcelle n’est pas encore accessible : l’île s’agrandit dans un ordre fixe, une parcelle après l’autre.', LAST_OF_SPECIES: 'Gardez au moins un lapin de chaque espèce possédée.',
  PARENT_BUSY: 'Au nid : ce parent reste indisponible jusqu’au transfert du lapereau dans la nurserie.', NO_GAME: 'Chargez une partie dans les paramètres.', DISPOSED: 'Rechargez la page.',
};
export const moneyReason = (s: GameState, price: number) => s.pattes < price ? 'Solde insuffisant.' : null;
export const occupants = (s: GameState, id: string) => s.rabbits.filter(r => r.enclosureId === id);
export const parentBusy = (s: GameState, id: string, _now: number) => !!nestForParent(s,id);
export function rabbitAvailability(s: GameState, id: string, now: number): string | null {
  const r = s.rabbits.find(r => r.id === id);
  return !r ? 'Lapin absent.' : parentBusy(s, id, now) ? 'Au nid.' : r.affection < BALANCE.breedingAffection ? 'Affection 2 nécessaire.' : null;
}
export function releaseReason(s: GameState, id: string, now: number): string | null {
  const r = s.rabbits.find(r => r.id === id);
  return !r ? 'Lapin absent.' : parentBusy(s, id, now) ? REFUSALS.PARENT_BUSY : s.rabbits.filter(other => other.species === r.species).length <= 1 ? REFUSALS.LAST_OF_SPECIES : null;
}
export function buildingReason(s: GameState, kind: BuildingKind, ignorePrice = false, habitatType: HabitatType = 'universal'): string | null {
  if (kind === 'nest' || kind === 'nursery') return 'Cet équipement est offert et ne s’achète pas.';
  if(kind==='enclosure') {const access=stateLevelAccess(s,{family:'habitatPurchase',id:habitatType});if(access.locked)return `Niveau ${access.requiredLevel} requis`;}
  const config = BALANCE.buildings[kind];
  if (config.maximum !== null && s.buildings.filter(b => b.kind === kind).length >= config.maximum) return REFUSALS.BUILDING_LIMIT;
  if (s.buildings.length >= s.acquiredParcels.length * ISLAND.parcelArea) return 'Aucune case libre. Agrandissez la prairie.';
  return ignorePrice ? null : moneyReason(s, kind === 'enclosure' ? habitatPrice(habitatType) : config.price);
}
export type Placement = {kind: BuildingKind; movingId?: string; starter?: boolean; habitatType?: HabitatType; cell: {x: number; y: number} | null};
export function placementReason(s: GameState, placement: Placement): string | null {
  const cell = placement.cell;
  if (!cell) return 'Touchez un petit carré de la prairie.';
  const reason = buildingPlacementReason(s, cell.x, cell.y, placement.movingId);
  if (reason) return REFUSALS[reason];
  if (placement.movingId) return null;
  if (placement.starter) return (placement.kind !== 'nest' && placement.kind !== 'nursery') ? REFUSALS.INVALID_CHOICE : s.buildings.some(b=>b.kind===placement.kind) ? REFUSALS.BUILDING_LIMIT : null;
  return buildingReason(s, placement.kind, false, placement.habitatType);
}
/** One entry per nursery baby, in slot order. The species appears only once the baby is ready. */
export type NurseryBabyView = {slot: NurserySlot; birthId: string} & ({stage: 'growing'; startedAt: number; readyAt: number} | {stage: 'ready'; species: SpeciesId});
export function nurseryView(s: GameState, now: number): {capacity: number; free: number; slots: NurserySlotState[]; nextUnlock: ReturnType<typeof nurseryUnlockQuote>; babies: NurseryBabyView[]} {
  const nursery = nurseryBuilding(s);
  return {capacity: nursery?.nursery?.capacity ?? 0, free: freeNurserySlots(nursery).length, slots: nurserySlotStates(nursery, now), nextUnlock: nurseryUnlockQuote(nursery), babies: babiesBySlot(nursery).map(baby => baby.readyAt > now
    ? {slot: baby.slot, birthId: baby.birth.id, stage: 'growing' as const, startedAt: baby.startedAt, readyAt: baby.readyAt}
    : {slot: baby.slot, birthId: baby.birth.id, stage: 'ready' as const, species: baby.birth.species})};
}
export type CollectionFilter = {type?: RabbitType; rarity?: Rarity; discovery?: 'known' | 'unknown'};
export function collectionView(s: GameState, filter: CollectionFilter = {}) {
  return SPECIES_IDS.filter(id => (!filter.type || SPECIES[id].types.includes(filter.type)) &&
    (!filter.rarity || SPECIES[id].rarity === filter.rarity) &&
    (!filter.discovery || s.discovered.includes(id) === (filter.discovery === 'known'))).map(id => s.discovered.includes(id) ? {known: true as const, species: id, name: SPECIES[id].name, ...(SPECIES[id].description ? {description: SPECIES[id].description} : {})} : {known: false as const, name: '???'});
}
export const TYPE_NAMES: Record<RabbitType, string> = {paille: 'paille', neige: 'neige', feu: 'feu', metal: 'métal', vol: 'vol', 'arc-en-ciel': 'arc-en-ciel'};
export const RARITY_NAMES: Record<Rarity, string> = mapRarities(definition => definition.label);
export const typeNames = (types: RabbitType[]) => types.map(type => TYPE_NAMES[type]).join(' + ');
/** A repeating decimal is shown alongside its exact fraction, never as an exact rounded percent. */
export function probabilityLabel(weight: number, total: number): string {
  if (!total || !weight) return '0 %';
  if (weight * 100 % total === 0) return `${weight * 100 / total} %`;
  if (weight * 10000 % total === 0) return `${String(weight * 100 / total).replace('.', ',')} %`;
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(weight, total);
  return `${weight / divisor}/${total / divisor} (≈ ${(weight * 100 / total).toFixed(2).replace('.', ',')} %)`;
}
/** Presentation of the unchanged draw: unknown recipes are summed from the same integer weights, never named. */
export function oddsView(s: GameState, a: SpeciesId, b: SpeciesId, affectionA = 2, affectionB = 2) {
  const pool = breedingPool(s, a, b, affectionA, affectionB);
  const ids = Object.keys(pool.weights) as SpeciesId[], known = (id: SpeciesId) => recipeKnown(s, id);
  const unknownWeight = ids.filter(id => !known(id)).reduce((sum, id) => sum + pool.weights[id]!, 0);
  return {eligible: pool.eligible, guaranteed: pool.guaranteed, possible: pool.total > 0,
    excluded: pool.excluded.filter(e => known(e.species)), hiddenExcluded: pool.excluded.some(e => !known(e.species)),
    entries: ids.filter(known).map(id => ({
      name: SPECIES[id].name,
      description: `${typeNames(SPECIES[id].types)} · ${RARITY_NAMES[SPECIES[id].rarity]}`,
      weight: pool.weights[id]! * 100 / pool.total,
      probability: probabilityLabel(pool.weights[id]!, pool.total),
    })),
    unknown: unknownWeight ? {weight: unknownWeight * 100 / pool.total, probability: probabilityLabel(unknownWeight, pool.total)} : null};
}
/** Every nest odds text, from oddsView only: unknown recipes appear solely as the cumulative line or anonymous exclusion. */
export function oddsTexts(odds: ReturnType<typeof oddsView>) {
  const names = [...new Set(odds.entries.map(e => e.name))].join(', ');
  const listed = !odds.unknown ? names : names ? `${names} et des résultats inconnus` : 'inconnus';
  return {
    summary: odds.possible ? `Résultats possibles : ${listed}.` : REFUSALS.NO_BREEDING_RESULT,
    excluded: [...odds.excluded.map(e => `${SPECIES[e.species].name} : Niveau ${e.requiredLevel} requis · exclu du tirage actuel.`),
      ...(odds.hiddenExcluded ? ['Certains résultats demandent un niveau supérieur · exclus du tirage actuel.'] : [])],
    lines: [...odds.entries.map(e => `${e.name} · ${e.description} : ${e.probability}`), ...(odds.unknown ? [`Résultats inconnus : ${odds.unknown.probability}`] : [])],
    guarantee: odds.guaranteed ? 'Cette tentative garantit une espèce non découverte, à parts égales entre les résultats admissibles.' : odds.eligible ? 'Cette paire est admissible à la garantie.' : 'Cette paire ne fait pas avancer la garantie.',
  };
}
/** Group compatible species before considering individuals. No odds or pair DOM yet. */
function recipeGroups(s: GameState, species: SpeciesId) {
  const groups = new Map<SpeciesId, GameState['rabbits']>();
  for (const rabbit of s.rabbits) {
    const group = groups.get(rabbit.species) ?? [];
    if (!groups.has(rabbit.species)) groups.set(rabbit.species, group);
    group.push(rabbit);
  }
  const entries = [...groups], result = [];
  for (let i = 0; i < entries.length; i++) for (let j = i; j < entries.length; j++) {
    const [a, first] = entries[i], [b, second] = entries[j];
    if (recipeMatches(species, a, b) && (SPECIES[species].recipe!.probability !== undefined || ordinaryPoolAllows(species, a, b)))
      result.push({first, second, same: i === j});
  }
  return result;
}
/** Only requested pairs get a pool/probability. Ready, fed parents come first. */
export function recipePairs(s: GameState, species: SpeciesId, now: number, limit = Infinity): {
  parents: [string, string]; feeding: string[]; busy: boolean; probability: string;
  blocked: boolean; guaranteed: boolean; certain: boolean; possible: boolean;
}[] {
  const result: ReturnType<typeof recipePairs> = [], minimum = SPECIES[species].recipe!.minAffection;
  if (!recipeKnown(s, species)) return result;
  const groups = recipeGroups(s, species);
  const rank = (r: GameState['rabbits'][number]) => r.affection < minimum ? 2 : parentBusy(s, r.id, now) ? 1 : 0;
  const ranks = new Map(s.rabbits.map(r => [r.id, rank(r)]));
  // Three passes avoid allocating or sorting all n*(n-1)/2 candidates.
  for (let priority = 0; priority < 3; priority++) for (const {first, second, same} of groups)
    for (let i = 0; i < first.length; i++) for (let j = same ? i + 1 : 0; j < second.length; j++) {
      const a = first[i], b = second[j];
      if (Math.max(ranks.get(a.id)!, ranks.get(b.id)!) !== priority) continue;
      if (result.length >= limit) return result;
      const feeding = [a, b].filter(r => r.affection < minimum).map(r => r.id);
      const busy = parentBusy(s, a.id, now) || parentBusy(s, b.id, now);
      const pool = breedingPool(s, a.species, b.species, a.affection, b.affection);
      const weight = feeding.length ? 0 : pool.weights[species] ?? 0;
      result.push({parents: [a.id, b.id] as [string, string], feeding, busy,
        probability: probabilityLabel(weight, pool.total), blocked: !pool.total,
        guaranteed: !feeding.length && pool.guaranteed && weight > 0,
        certain: !feeding.length && pool.guaranteed && weight === pool.total,
        possible: !feeding.length && !busy && weight > 0});
    }
  return result;
}
/** Metadata/counts do not enumerate individual pairs; full pairs remain lazy for consumers. */
export function recipeBook(s: GameState, now: number) {
  return RECIPE_SPECIES.map(species => {
    const config = SPECIES[species], known = recipeKnown(s, species);
    const pairCount = known ? recipeGroups(s, species).reduce((sum, {first, second, same}) =>
      sum + (same ? first.length * (first.length - 1) / 2 : first.length * second.length), 0) : 0;
    let pairs: ReturnType<typeof recipePairs> | undefined;
    return {species, levelAccess: stateLevelAccess(s, {family:'species', id:species, action:'breedingResult'}),
      known, discovered: s.discovered.includes(species), price: recipePrice(species), types: config.types,
      ...(known ? {minAffection: config.recipe!.minAffection} : {}), pairCount,
      get pairs() { return pairs ??= recipePairs(s, species, now); }};
  });
}
export function timeLeft(end: number, now: number): string {
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  if (!seconds) return 'Prêt';
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min ${seconds % 60} s`;
}
export const incomeWhole = (units: number) => Math.floor(units / HOUR);
export function tutorialStep(s: GameState, intro: boolean): {text: string; rabbitId?: string; building?: BuildingKind; done?: boolean} {
  if (!intro) return {text: 'Les récoltes financent la prairie. L’herbe augmente l’affection et les revenus. Aucune faim à gérer.'};
  const candidate = ['paille', 'neige'].map(species => s.rabbits.find(r => r.species === species)).find(r => r && r.affection < 2);
  if (candidate) return {text: 'Nourrissez les deux lapins de départ jusqu’à l’affection 2.', rabbitId: candidate.id};
  for (const building of ['nest', 'nursery'] as const) if (!s.buildings.some(b => b.kind === building)) return {text: `Placez gratuitement votre ${BUILDING_NAMES[building].toLowerCase()} depuis Aménagement. Libérez une empreinte 4 × 4 si nécessaire.`, building};
  if (s.buildings.some(b=>b.breeding)) return {text:'Les parents restent au nid. À la fin des 20 minutes, envoyez manuellement le lapereau dans la nurserie libre.',building:'nest'};
  if (!s.buildings.some(b=>b.kind==='farm')) return {text:'Achetez et placez votre ferme pour produire de l’herbe.',building:'farm'};
  if (s.buildings.some(b => b.breeding || b.nursery?.babies.length) || s.discovered.some(id => SPECIES[id].recipe !== null)) return {text: 'Votre prairie prend vie ! Revenez accueillir le lapereau après sa croissance.', done: true};
  return {text: 'Choisissez vos deux parents dans le nid et lancez une reproduction. Vous pouvez jouer pendant l’attente.', building: 'nest'};
}
