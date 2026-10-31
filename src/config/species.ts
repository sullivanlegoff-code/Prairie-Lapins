/**
 * Canonical species registry: the one ordered list of species definitions. Pure data and types, independent of balance, Phaser, the
 * DOM and persistence (it only reads the `Rarity` type from the rarities data module). The order matters (catalogue display and the cumulative breeding draw): it is the order of `REGISTRY`.
 * How a species can be obtained is declared, never deduced: each entry lists its acquisition sources. `price` and `recipe` stay on
 * the definition as compatibility views derived from those sources (`null` means "not sold" / "no recipe"); they are not a second authority.
 */
export const RABBIT_TYPES = ['paille', 'neige', 'feu', 'metal', 'vol', 'arc-en-ciel'] as const;
export type RabbitType = typeof RABBIT_TYPES[number];
import type {Rarity} from './rarities';
export type {Rarity};
/** Historical procedural appearance data, shared by SVG and world rendering. */
export interface Coat {
  body: string; patch: string;
  lop?: boolean; wings?: boolean; flame?: boolean; metal?: boolean; glasses?: boolean; plumage?: boolean; frost?: boolean;
}
/** Presentation mode is independent of acquisition; asset URLs are resolved by the presentation adapter. */
export type SpeciesArt =
  | {readonly kind: 'procedural'; readonly coat: Coat}
  | {readonly kind: 'static-sprite'; readonly file: string; readonly texture: string;
      readonly width: number; readonly height: number; readonly worldWidth: number; readonly groundY: number;
      /** Direction the picture looks in; absent means right, so existing definitions are unchanged. */
      readonly facing?: 'left' | 'right';
      /** Preserve the historical loading order independently of catalogue order. */
      readonly preloadOrder: number};
/** A registry entry; recipe parents are checked against the registry's own ids below. */
interface Entry {
  readonly id: string; readonly progression: {readonly unlockLevel: number}; readonly name: string; readonly description?: string; readonly types: readonly RabbitType[]; readonly rarity: Rarity;
  readonly acquisition: readonly EntryAcquisition[]; readonly art: SpeciesArt;
}
/** Optional policies on a recipe source: absence means no sale, no starting gift and no guarantee. */
export interface RecipePolicy {
  readonly knowledgePrice?: number; readonly giftedAtStart?: boolean; readonly guaranteeEligible?: boolean;
}
/** The ways to obtain a species. The price lives in the shop source; an existing recipe lives in the recipe source. */
type EntryAcquisition =
  | {readonly kind: 'shop'; readonly price: number}
  // Transitional: the historical rule that lets a species without a recipe come out of ordinary breeding (type match). Not the final decision about Commons.
  | {readonly kind: 'historical-breeding'}
  | ({readonly kind: 'recipe'; readonly minAffection: number; readonly requiredTypes?: readonly RabbitType[]; readonly parents?: readonly [string, string]; readonly probability?: number} & RecipePolicy);

const REGISTRY = [
  {id: 'paille', name: 'Lapin Paille', types: ['paille'], rarity: 'common', acquisition: [{kind: 'shop', price: 80}, {kind: 'historical-breeding'}], art: {kind: 'static-sprite', file: 'assets/rabbits/paille/paille-v1.png', texture: 'rabbit-paille-original-v1', width: 303, height: 429, worldWidth: 40, groundY: 12, preloadOrder: 1, facing: 'left'}, progression: {unlockLevel: 1}},
  {id: 'neige', name: 'Lapin Neige', types: ['neige'], rarity: 'common', acquisition: [{kind: 'shop', price: 80}, {kind: 'historical-breeding'}], art: {kind: 'static-sprite', file: 'assets/rabbits/neige/neige-v1.png', texture: 'rabbit-neige-original-v1', width: 461, height: 421, worldWidth: 48, groundY: 12, preloadOrder: 0}, progression: {unlockLevel: 1}},
  {id: 'feu', name: 'Lapin Feu', types: ['feu'], rarity: 'common', acquisition: [{kind: 'shop', price: 180}, {kind: 'historical-breeding'}], art: {kind: 'static-sprite', file: 'assets/rabbits/feu/feu-v1.png', texture: 'rabbit-feu-original-v1', width: 461, height: 380, worldWidth: 50, groundY: 12, preloadOrder: 4}, progression: {unlockLevel: 5}},
  {id: 'belier-gris', name: 'Lapin Bélier Gris', types: ['metal'], rarity: 'common', acquisition: [{kind: 'shop', price: 350}, {kind: 'historical-breeding'}], art: {kind: 'static-sprite', file: 'assets/rabbits/belier-gris/belier-gris-v1.png', texture: 'rabbit-belier-gris-original-v1', width: 461, height: 427, worldWidth: 48, groundY: 12, preloadOrder: 3}, progression: {unlockLevel: 7}},
  {id: 'volant', name: 'Lapin Volant', types: ['vol'], rarity: 'common', acquisition: [{kind: 'shop', price: 600}, {kind: 'historical-breeding'}], art: {kind: 'static-sprite', file: 'assets/rabbits/volant/volant-v1.png', texture: 'rabbit-volant-original-v1', width: 369, height: 438, worldWidth: 50, groundY: 12, preloadOrder: 5}, progression: {unlockLevel: 9}},
  {id: 'magicien', name: 'Lapin Magicien', description: 'Un lapin brun en cape et chapeau de magicien étoilés, baguette à la main.', types: ['paille', 'metal'], rarity: 'epic', acquisition: [{kind: 'recipe', knowledgePrice: 450, requiredTypes: ['paille', 'metal'], minAffection: 6, probability: 10}], art: {kind: 'static-sprite', file: 'assets/rabbits/magicien/magicien-v1.png', texture: 'rabbit-magicien-original-v1', width: 384, height: 431, worldWidth: 52, groundY: 12, preloadOrder: 28}, progression: {unlockLevel: 11}},
  {id: 'dragon', name: 'Lapin Dragon', description: 'Un lapin bélier rouge aux écailles de dragon, avec des cornes et des ailes.', types: ['feu', 'vol'], rarity: 'legendary', acquisition: [{kind: 'recipe', knowledgePrice: 900, minAffection: 10, parents: ['dadi', 'phoenix'], probability: 7}], art: {kind: 'static-sprite', file: 'assets/rabbits/dragon/dragon-v1.png', texture: 'rabbit-dragon-original-v1', width: 418, height: 428, worldWidth: 54, groundY: 12, preloadOrder: 29}, progression: {unlockLevel: 14}},
  {id: 'frisket', name: 'Frisket', description: 'Lapin très original, uniquement en neige et en branches. Oreilles faites en branches (pas beaucoup de branches), bout des pattes en branches, visage en neige avec les yeux bleu foncé profonds, il a une petite écharpe rouge.', types: ['neige', 'paille'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['paille', 'neige'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/frisket/frisket-v1.png', texture: 'rabbit-frisket-original-v1', width: 410, height: 428, worldWidth: 52, groundY: 12, preloadOrder: 6}, progression: {unlockLevel: 1}},
  {id: 'icy', name: 'Icy', description: 'Lapin avec deux petits nœuds roses dans les cheveux. Les nœuds sont longs et fins. Lapin beige clair.', types: ['paille', 'neige'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['paille', 'neige'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/icy/icy-v1.png', texture: 'rabbit-icy-original-v1', width: 402, height: 428, worldWidth: 48, groundY: 12, preloadOrder: 7}, progression: {unlockLevel: 1}},
  {id: 'ardent', name: 'Ardent', description: 'Un lapin semblable à une torche humaine, entièrement composé de feu.', types: ['feu', 'paille'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['feu', 'paille'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/ardent/ardent-v1.png', texture: 'rabbit-ardent-original-v1', width: 461, height: 421, worldWidth: 52, groundY: 13, preloadOrder: 8}, progression: {unlockLevel: 1}},
  {id: 'snk', name: 'SNK', description: 'Lapin habillé comme Eren de L’Attaque des Titans.', types: ['paille', 'feu'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['paille', 'feu'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/snk/snk-v1.png', texture: 'rabbit-snk-original-v1', width: 461, height: 369, worldWidth: 56, groundY: 15.5, preloadOrder: 9}, progression: {unlockLevel: 1}},
  {id: 'pic-pic', name: 'Pic Pic', description: 'Un lapin accompagné de pointes de glace flottant autour de lui.', types: ['vol', 'neige'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['vol', 'neige'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/pic-pic/pic-pic-v1.png', texture: 'rabbit-pic-pic-original-v1', width: 428, height: 428, worldWidth: 54, groundY: 12.5, preloadOrder: 10}, progression: {unlockLevel: 1}},
  {id: 'amethyste', name: 'Améthyste', description: 'Un lapin violet à la texture d’améthyste.', types: ['metal', 'feu'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['metal', 'feu'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/amethyste/amethyste-v1.png', texture: 'rabbit-amethyste-original-v1', width: 461, height: 407, worldWidth: 56, groundY: 14.5, preloadOrder: 11}, progression: {unlockLevel: 1}},
  {id: 'princesse-neige', name: 'Princesse Neige', description: 'Une lapine blanche et féérique, vêtue d’une robe de princesse.', types: ['neige', 'metal'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['neige', 'metal'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/princesse-neige/princesse-neige-v1.png', texture: 'rabbit-princesse-neige-original-v1', width: 412, height: 428, worldWidth: 50, groundY: 13.5, preloadOrder: 12}, progression: {unlockLevel: 1}},
  {id: 'fluffy', name: 'Fluffy', description: 'Un lapin blanc à l’allure de peluche, tenant une rose dans ses pattes.', types: ['metal', 'neige'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['metal', 'neige'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/fluffy/fluffy-v1.png', texture: 'rabbit-fluffy-original-v1', width: 459, height: 428, worldWidth: 52, groundY: 13.5, preloadOrder: 13}, progression: {unlockLevel: 1}},
  {id: 'virvoletant', name: 'Virvoletant', description: 'Un lapin tout rond, composé de brindilles comme un virevoltant du Far West.', types: ['paille', 'vol'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['paille', 'vol'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/virvoletant/virvoletant-v1.png', texture: 'rabbit-virvoletant-original-v1', width: 428, height: 428, worldWidth: 52, groundY: 12.5, preloadOrder: 14}, progression: {unlockLevel: 1}},
  {id: 'phoenix', name: 'Phoenix', description: 'Un lapin ailé aux couleurs flamboyantes d’un phénix.', types: ['feu', 'vol'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['feu', 'vol'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/phoenix/phoenix-v1.png', texture: 'rabbit-phoenix-original-v1', width: 428, height: 428, worldWidth: 54, groundY: 14.5, preloadOrder: 15}, progression: {unlockLevel: 1}},
  {id: 'roukette', name: 'Roukette', description: 'Un lapin doré à la coiffure ébouriffée, portant des accessoires noirs et métalliques.', types: ['paille', 'metal'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['paille', 'metal'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/roukette/roukette-v1.png', texture: 'rabbit-roukette-original-v1', width: 461, height: 421, worldWidth: 52, groundY: 12, preloadOrder: 16}, progression: {unlockLevel: 1}},
  {id: 'wat-wat', name: 'Wat Wat', description: 'Un lapin bleu aux motifs ondoyants, avec une touche dorée sur le poitrail.', types: ['neige', 'feu'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['neige', 'feu'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/wat-wat/wat-wat-v1.png', texture: 'rabbit-wat-wat-original-v1', width: 428, height: 428, worldWidth: 52, groundY: 15, preloadOrder: 17}, progression: {unlockLevel: 1}},
  {id: 'glassofeu', name: 'Glassofeu', description: 'Un lapin blanc mêlant flammes et cristaux de glace, avec un œil de feu et un œil glacé.', types: ['feu', 'neige'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['feu', 'neige'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/glassofeu/glassofeu-v1.png', texture: 'rabbit-glassofeu-original-v1', width: 461, height: 421, worldWidth: 52, groundY: 12, preloadOrder: 18, facing: 'left'}, progression: {unlockLevel: 1}},
  {id: 'plume', name: 'Plume', description: 'Un lapin doré au pelage léger, avec de longues oreilles en forme de plumes.', types: ['vol', 'paille'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['vol', 'paille'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/plume/plume-v1.png', texture: 'rabbit-plume-original-v1', width: 461, height: 421, worldWidth: 52, groundY: 12.5, preloadOrder: 19}, progression: {unlockLevel: 1}},
  {id: 'boudinet', name: 'Boudinet', description: 'Un lapin bélier tout rond au pelage caramel, avec une petite houppette sur la tête.', types: ['metal', 'paille'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['metal', 'paille'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/boudinet/boudinet-v1.png', texture: 'rabbit-boudinet-original-v1', width: 454, height: 428, worldWidth: 52, groundY: 12, preloadOrder: 20}, progression: {unlockLevel: 1}},
  {id: 'bouee', name: 'Lapin en Bouée', description: 'Un lapin gris en vacances dans une bouée turquoise à pois blancs, avec des lunettes de soleil en cœur roses et un jus de fruit à ombrelle.', types: ['feu', 'metal'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['feu', 'metal'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/bouee/bouee-v1.png', texture: 'rabbit-bouee-original-v1', width: 425, height: 428, worldWidth: 54, groundY: 12, preloadOrder: 32}, progression: {unlockLevel: 1}},
  {id: 'egiiipte', name: 'Egiiipte', description: 'Un lapin bélier brun au pelage soyeux, avec une petite houppette blonde.', types: ['vol', 'metal'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['vol', 'metal'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/egiiipte/egiiipte-v1.png', texture: 'rabbit-egiiipte-original-v1', width: 450, height: 428, worldWidth: 52, groundY: 12, preloadOrder: 22}, progression: {unlockLevel: 1}},
  {id: 'piment', name: 'Piment', description: 'Un lapin blanc dans un déguisement de piment rouge.', types: ['vol', 'feu'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['vol', 'feu'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/piment/piment-v1.png', texture: 'rabbit-piment-original-v1', width: 461, height: 363, worldWidth: 58, groundY: 12, preloadOrder: 23}, progression: {unlockLevel: 1}},
  {id: 'tunini', name: 'Tunini', description: 'Un lapin blanc et givré, avec des ailes en mosaïque, une auréole et des cristaux de glace.', types: ['neige', 'vol'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['neige', 'vol'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/tunini/tunini-v1.png', texture: 'rabbit-tunini-original-v1', width: 384, height: 449, worldWidth: 52, groundY: 12, preloadOrder: 24}, progression: {unlockLevel: 1}},
  {id: 'bretonette', name: 'Bretonette', description: 'Un lapin noir et blanc aux ailes de plumes, coiffé d’une coiffe bretonne en dentelle.', types: ['metal', 'vol'], rarity: 'rare', acquisition: [{kind: 'recipe', guaranteeEligible: true, requiredTypes: ['metal', 'vol'], minAffection: 2}], art: {kind: 'static-sprite', file: 'assets/rabbits/bretonette/bretonette-v1.png', texture: 'rabbit-bretonette-original-v1', width: 437, height: 428, worldWidth: 56, groundY: 12, preloadOrder: 25}, progression: {unlockLevel: 1}},
  {id: 'dadi', name: 'Dadi', description: 'Un lapin blanc à casquette rouge, avec une chaîne et des baskets.', types: ['feu', 'metal'], rarity: 'epic', acquisition: [{kind: 'recipe', knowledgePrice: 450, requiredTypes: ['feu', 'metal'], minAffection: 6, probability: 10}], art: {kind: 'static-sprite', file: 'assets/rabbits/dadi/dadi-v1.png', texture: 'rabbit-dadi-original-v1', width: 262, height: 364, worldWidth: 42, groundY: 13, preloadOrder: 26}, progression: {unlockLevel: 11}},
  {id: 'maxou', name: 'Maxou', description: 'Un lapin dauphin gris, avec un aileron et une queue de dauphin.', types: ['neige', 'vol'], rarity: 'epic', acquisition: [{kind: 'recipe', knowledgePrice: 450, requiredTypes: ['neige', 'vol'], minAffection: 6, probability: 10}], art: {kind: 'static-sprite', file: 'assets/rabbits/maxou/maxou-v1.png', texture: 'rabbit-maxou-original-v1', width: 461, height: 414, worldWidth: 56, groundY: 12, preloadOrder: 27}, progression: {unlockLevel: 11}},
  {id: 'orange', name: 'Orange', description: 'Une petite lapine blanche à la robe orange.', types: ['paille', 'neige'], rarity: 'epic', acquisition: [{kind: 'recipe', knowledgePrice: 450, requiredTypes: ['paille', 'neige'], minAffection: 6, probability: 10}], art: {kind: 'static-sprite', file: 'assets/rabbits/orange/orange-v1.png', texture: 'rabbit-orange-original-v1', width: 339, height: 430, worldWidth: 46, groundY: 12, preloadOrder: 31}, progression: {unlockLevel: 11}},
  {id: 'dinono', name: 'Dinono', description: 'Un lapin bélier dans un déguisement de dinosaure vert, avec des pointes orange sur le dos.', types: ['feu', 'metal'], rarity: 'epic', acquisition: [{kind: 'recipe', knowledgePrice: 450, requiredTypes: ['feu', 'metal'], minAffection: 6, probability: 10}], art: {kind: 'static-sprite', file: 'assets/rabbits/dinono/dinono-v1.png', texture: 'rabbit-dinono-original-v1', width: 461, height: 388, worldWidth: 56, groundY: 12, preloadOrder: 21}, progression: {unlockLevel: 1}},
  {id: 'dinenette', name: 'Dinenette', description: 'Une lapine bélier noire aux yeux bleus, dans un déguisement de dinosaure rose avec un nœud et une queue en cœur.', types: ['paille', 'vol'], rarity: 'epic', acquisition: [{kind: 'recipe', knowledgePrice: 450, requiredTypes: ['paille', 'vol'], minAffection: 6, probability: 10}], art: {kind: 'static-sprite', file: 'assets/rabbits/dinenette/dinenette-v1.png', texture: 'rabbit-dinenette-original-v1', width: 434, height: 428, worldWidth: 54, groundY: 12, preloadOrder: 33}, progression: {unlockLevel: 11}},
  {id: 'requin', name: 'Lapin Requin', description: 'Un lapin bélier gris aux rayures de requin, avec un aileron bleu et un sourire pointu.', types: ['neige', 'metal'], rarity: 'legendary', acquisition: [{kind: 'recipe', knowledgePrice: 900, minAffection: 10, parents: ['maxou', 'wat-wat'], probability: 7}], art: {kind: 'static-sprite', file: 'assets/rabbits/requin/requin-v1.png', texture: 'rabbit-requin-original-v1', width: 430, height: 428, worldWidth: 56, groundY: 12, preloadOrder: 30}, progression: {unlockLevel: 14}},
] as const satisfies readonly Entry[];

/** Readonly view of the original entries, before lookup projection; retains duplicate ids for catalogue validation. */
export const SPECIES_ENTRIES = REGISTRY;

type Registry = typeof REGISTRY;
export type ProceduralSpeciesId = Extract<Registry[number], {readonly art: {readonly kind: 'procedural'}}>['id'];
export type SpeciesId = Registry[number]['id'];
export type Acquisition =
  | {kind: 'shop'; price: number}
  | {kind: 'historical-breeding'}
  | ({kind: 'recipe'; minAffection: number; requiredTypes?: readonly RabbitType[]; parents?: readonly [SpeciesId, SpeciesId]; probability?: number} & RecipePolicy);
export type Recipe = Omit<Extract<Acquisition, {kind: 'recipe'}>, 'kind' | keyof RecipePolicy>;
export interface SpeciesDefinition {
  /** `unlockLevel`: the player level from which this species is available; the default progression configuration is derived from it. */
  progression: {unlockLevel: number};
  name: string; description?: string; types: RabbitType[]; rarity: Rarity; acquisition: readonly Acquisition[]; art: SpeciesArt;
  /** Compatibility views derived from `acquisition`: the shop price, and the recipe of the recipe source. */
  price: number | null; recipe: Recipe | null;
}
// Compile-time guard: every recipe parent is a registered species (the registry cannot name its own ids beforehand).
type RecipeParent = Extract<Registry[number]['acquisition'][number], {readonly parents: readonly [string, string]}>['parents'][number];
const parentsAreSpecies: RecipeParent extends SpeciesId ? true : never = true; void parentsAreSpecies;

/** The ids in registry order, as the readonly non-empty tuple `z.enum` expects. The one assertion is local: it only restates, as a tuple type, what `map` returns for the non-empty registry. */
function idsOf<const T extends readonly {readonly id: string}[]>(registry: T): {readonly [K in keyof T]: T[K]['id']} {
  return registry.map(entry => entry.id) as unknown as {readonly [K in keyof T]: T[K]['id']};
}
export const SPECIES_IDS = idsOf(REGISTRY);
/** Historical ids (the first two): a list of ids only, never a second source of definitions. */
export const LEGACY_SPECIES_IDS = ['paille', 'neige'] as const satisfies readonly SpeciesId[];
/** A record over every species, in registry order, from a pure projection of its definition (the one assertion: `fromEntries` is untyped by key). */
export function mapSpecies<T>(project: (definition: SpeciesDefinition) => T): Record<SpeciesId, T> {
  return Object.fromEntries(SPECIES_IDS.map(id => [id, project(SPECIES[id])])) as Record<SpeciesId, T>;
}
/** Acquisition readers: pure, on a definition, so eligibility is always read from declared sources and never from the absence of one. */
type ShopSource = Extract<Acquisition, {kind: 'shop'}>;
export type RecipeSource = Extract<Acquisition, {kind: 'recipe'}>;
export const shopPrice = (acquisition: readonly Acquisition[]): number | null => acquisition.find((source): source is ShopSource => source.kind === 'shop')?.price ?? null;
export const recipeSource = (acquisition: readonly Acquisition[]): RecipeSource | undefined => acquisition.find((candidate): candidate is RecipeSource => candidate.kind === 'recipe');
export function recipeOf(acquisition: readonly Acquisition[]): Recipe | null {
  const source = recipeSource(acquisition);
  if (!source) return null;
  if (!source.parents && !source.requiredTypes?.length) throw new RangeError('Recipe needs requiredTypes or exact parents');
  const {kind, knowledgePrice, giftedAtStart, guaranteeEligible, ...recipe} = source;
  void kind; void knowledgePrice; void giftedAtStart; void guaranteeEligible;
  return recipe;
}
/** Lookup by id; keys are inserted in registry order. */
export const SPECIES = Object.fromEntries(REGISTRY.map(({id, ...definition}) => {
  const acquisition: readonly Acquisition[] = definition.acquisition as readonly Acquisition[]; // the registry is checked against Entry; this only widens its ids
  return [id, {...definition, types: [...definition.types], acquisition, price: shopPrice(acquisition), recipe: recipeOf(acquisition)}];
})) as Record<SpeciesId, SpeciesDefinition>;

type Sourced = Pick<SpeciesDefinition, 'acquisition'>;
export const isSold = (definition: Sourced): boolean => definition.acquisition.some(source => source.kind === 'shop');
export const hasRecipe = (definition: Sourced): boolean => definition.acquisition.some(source => source.kind === 'recipe');
/** Transitional: the species may come out of ordinary type-matching breeding by the historical rule. */
export const breedsHistorically = (definition: Sourced): boolean => definition.acquisition.some(source => source.kind === 'historical-breeding');
/** The one authority on whether breeding may produce a species: a declared historical-breeding or recipe source, never the mere absence of one. */
export const breedable = (definition: Sourced): boolean => breedsHistorically(definition) || hasRecipe(definition);

/** Rendering requires complete procedural data; illustrated species and malformed definitions never get a generic fallback. */
export function proceduralCoat(art: SpeciesArt): Coat {
  if (art.kind !== 'procedural' || !art.coat || typeof art.coat.body !== 'string' || typeof art.coat.patch !== 'string')
    throw new RangeError('Procedural art requires a coat with body and patch');
  return art.coat;
}
