/** Logical scene and declarative recipe data: every recipe is a list of drag steps, the engine stays generic. */
export interface Point {x: number; y: number}
export type ItemKind = 'food' | 'tool' | 'bottle' | 'container' | 'fixture';
export type RecipeId = 'chicken' | 'moelleux' | 'avocado-toast';
export const RECIPE_IDS: readonly RecipeId[] = ['avocado-toast', 'moelleux', 'chicken'];
export type StepEffect = 'place' | 'cut' | 'peel' | 'pour' | 'season' | 'melt' | 'whisk' | 'mix' | 'spread' | 'oven' | 'toast';
export interface ItemDefinition {
  id: string; kind: ItemKind; name: string;
  /** Painted art prefix: the picture shown is `${art}-${state}` when it exists, otherwise `art` itself. */
  art: string; state: string; width: number; height: number;
  /** Grammatical gender, for state labels (« coupée », « cuit »…). */
  feminine?: boolean; plural?: boolean;
  draggable: boolean;
}
/** New state by item; a map picks it from the current state (two chains filling the same dish). */
export type StateChanges = Readonly<Record<string, string | Readonly<Record<string, string>>>>;
export interface CookDefinition {
  ms: number;
  /** Item that shows the heat (oven or stove) and the container that cooks; hidden containers come back once cooked. */
  heater: string; container: string;
  set?: StateChanges; hide?: readonly string[]; show?: readonly string[];
  message: string;
}
export interface StepDefinition {
  actor: string; target: string;
  /** Instruction while the step is next, as an imperative addressed to the player. */
  hint: string;
  /** Short chip for the step list. */
  chip: string;
  message: string; effect: StepEffect;
  /** The actor settles on the target (a food on the cutting board). */
  move?: boolean;
  /** The actor joins the target and is no longer shown on its own. */
  hide?: boolean;
  set?: StateChanges;
  cook?: CookDefinition;
}
export interface RecipeDefinition {
  id: RecipeId; name: string; title: string; summary: string; resultTitle: string; resultCopy: string;
  /** Finished-dish picture (item art key). */
  dish: string;
  layout: Readonly<Record<string, Point>>;
  /** Independent step chains (any interleaving), then the finale in order. */
  chains: readonly (readonly StepDefinition[])[];
  finale: readonly StepDefinition[];
}

/** Movable objects are drawn a little larger than their slot so the painted food reads well on a phone. */
const LIFT = 1.15;
const item = (id: string, name: string, kind: ItemKind, width: number, height: number, extra: Partial<ItemDefinition> = {}): ItemDefinition => ({
  id, name, kind, width: Math.round(width * (kind === 'fixture' ? 1 : LIFT)), height: Math.round(height * (kind === 'fixture' ? 1 : LIFT)),
  art: id, state: '', draggable: kind !== 'fixture', ...extra,
});
export const ITEMS: readonly ItemDefinition[] = [
  item('cutting-board', 'Planche à découper', 'fixture', 270, 160, {feminine: true}),
  item('stove', 'Réchaud', 'fixture', 210, 120),
  item('oven', 'Four', 'fixture', 172, 172),
  item('bowl', 'Saladier', 'container', 176, 122, {state: 'empty'}),
  item('saucepan', 'Casserole', 'container', 176, 104, {state: 'empty', feminine: true}),
  item('pan', 'Poêle', 'container', 196, 100, {state: 'empty', feminine: true, draggable: false}),
  item('mould', 'Moule', 'container', 150, 96, {state: 'empty'}),
  item('baking-dish', 'Plat de cuisson', 'container', 190, 116, {art: 'dish', state: 'empty'}),
  item('plate', 'Assiette', 'container', 190, 112, {state: 'empty', feminine: true, draggable: false}),
  item('knife', 'Couteau', 'tool', 150, 62),
  item('peeler', 'Économe', 'tool', 118, 60),
  item('whisk', 'Fouet', 'tool', 136, 62),
  item('spoon', 'Cuillère en bois', 'tool', 136, 56, {feminine: true}),
  item('soy', 'Sauce soja', 'bottle', 56, 98, {feminine: true}),
  item('honey', 'Miel', 'bottle', 82, 86),
  item('sugar', 'Sucre', 'bottle', 70, 86),
  item('flour', 'Farine', 'bottle', 84, 92, {feminine: true}),
  item('chicken', 'Poulet', 'food', 136, 90, {state: 'raw'}),
  item('sweet-potato', 'Patate douce', 'food', 130, 78, {state: 'whole', feminine: true}),
  item('avocado', 'Avocat', 'food', 92, 100, {state: 'whole'}),
  item('shallot', 'Échalote', 'food', 80, 92, {state: 'whole', feminine: true}),
  item('bread', 'Tartines', 'food', 132, 92, {state: 'raw', feminine: true, plural: true}),
  item('salmon', 'Saumon fumé', 'food', 118, 76),
  item('chocolate', 'Chocolat', 'food', 104, 92),
  item('butter', 'Beurre', 'food', 104, 80),
  item('eggs', 'Œufs', 'food', 98, 86, {plural: true}),
];

const step = (actor: string, target: string, chip: string, hint: string, message: string, effect: StepEffect, extra: Partial<StepDefinition> = {}): StepDefinition =>
  ({actor, target, chip, hint, message, effect, ...extra});
const onBoard = (actor: string, chip: string, hint: string, message: string) => step(actor, 'cutting-board', chip, hint, message, 'place', {move: true});

export const RECIPES: readonly RecipeDefinition[] = [
  {
    id: 'avocado-toast', name: 'Avocado toast', title: 'Avocado toast', dish: 'plate-salmon',
    summary: 'Avocat miel-soja, échalote et saumon fumé sur tartine grillée',
    resultTitle: 'Avocado toast réussi !', resultCopy: 'Tartines croustillantes, avocat à l’échalote et saumon fumé.',
    layout: {
      avocado: {x: 195, y: 152}, shallot: {x: 195, y: 262}, bread: {x: 215, y: 378},
      knife: {x: 345, y: 92}, honey: {x: 452, y: 88}, soy: {x: 530, y: 86}, spoon: {x: 620, y: 96}, salmon: {x: 740, y: 96},
      'cutting-board': {x: 425, y: 285}, bowl: {x: 655, y: 285},
      stove: {x: 885, y: 222}, pan: {x: 885, y: 198}, plate: {x: 862, y: 362},
    },
    chains: [[
      onBoard('avocado', 'Avocat', 'Pose l’avocat sur la planche', 'L’avocat est sur la planche.'),
      step('knife', 'avocado', 'Couper', 'Coupe l’avocat avec le couteau', 'Avocat coupé !', 'cut', {set: {avocado: 'cut'}}),
      step('avocado', 'bowl', 'Saladier', 'Mets l’avocat coupé dans le saladier', 'L’avocat est dans le saladier.', 'place', {hide: true, set: {bowl: 'avocado'}}),
      step('honey', 'bowl', 'Miel', 'Verse le miel sur l’avocat', 'Un filet de miel !', 'pour', {set: {bowl: 'honey'}}),
      step('soy', 'bowl', 'Soja', 'Ajoute la sauce soja', 'Sauce soja ajoutée.', 'pour', {set: {bowl: 'soy'}}),
      onBoard('shallot', 'Échalote', 'Pose l’échalote sur la planche', 'L’échalote est sur la planche.'),
      step('knife', 'shallot', 'Couper', 'Coupe l’échalote avec le couteau', 'Échalote ciselée !', 'cut', {set: {shallot: 'cut'}}),
      step('shallot', 'bowl', 'Saladier', 'Ajoute l’échalote dans le saladier', 'L’échalote rejoint l’avocat.', 'place', {hide: true, set: {bowl: 'shallot'}}),
      step('spoon', 'bowl', 'Mélanger', 'Mélange avec la cuillère en bois', 'Avocat et échalote bien mélangés.', 'mix', {set: {bowl: 'mixed'}}),
      step('bread', 'pan', 'Griller', 'Fais griller les tartines dans la poêle', 'Les tartines grillent…', 'toast', {hide: true, set: {pan: 'bread'},
        cook: {ms: 3000, heater: 'stove', container: 'pan', set: {pan: 'empty', plate: 'toast'}, message: 'Tartines dorées, posées sur l’assiette !'}}),
      step('bowl', 'plate', 'Tartiner', 'Étale l’avocat sur les tartines', 'Avocat étalé sur les tartines.', 'spread', {set: {bowl: 'empty', plate: 'avocado'}}),
      step('salmon', 'plate', 'Saumon', 'Ajoute la tranche de saumon fumé', 'Une belle tranche de saumon !', 'place', {hide: true, set: {plate: 'salmon'}}),
    ]],
    finale: [],
  },
  {
    id: 'moelleux', name: 'Moelleux au chocolat', title: 'Moelleux au chocolat', dish: 'plate-moelleux',
    summary: 'Chocolat fondu, œufs, sucre et farine, cuit au four',
    resultTitle: 'Moelleux réussi !', resultCopy: 'Un gâteau fondant, encore tiède en sortant du four.',
    layout: {
      chocolate: {x: 190, y: 160}, butter: {x: 190, y: 266}, eggs: {x: 205, y: 370},
      sugar: {x: 350, y: 90}, flour: {x: 438, y: 88}, whisk: {x: 548, y: 96},
      stove: {x: 385, y: 300}, saucepan: {x: 385, y: 276}, bowl: {x: 610, y: 290}, mould: {x: 775, y: 358}, oven: {x: 885, y: 210},
    },
    chains: [[
      step('chocolate', 'saucepan', 'Chocolat', 'Mets le chocolat dans la casserole', 'Le chocolat est dans la casserole.', 'place', {hide: true, set: {saucepan: 'chocolate'}}),
      step('butter', 'saucepan', 'Beurre', 'Ajoute le beurre pour faire fondre', 'Chocolat et beurre fondus !', 'melt', {hide: true, set: {saucepan: 'melted'}}),
    ], [
      step('eggs', 'bowl', 'Œufs', 'Casse les œufs dans le saladier', 'Les œufs sont dans le saladier.', 'place', {hide: true, set: {bowl: 'eggs'}}),
      step('sugar', 'bowl', 'Sucre', 'Verse le sucre sur les œufs', 'Sucre ajouté.', 'pour', {set: {bowl: 'sugar'}}),
      step('whisk', 'bowl', 'Fouetter', 'Fouette les œufs et le sucre', 'Le mélange blanchit et mousse !', 'whisk', {set: {bowl: 'whisked'}}),
    ]],
    finale: [
      step('saucepan', 'bowl', 'Chocolat fondu', 'Verse le chocolat fondu dans le saladier', 'Chocolat fondu versé.', 'pour', {set: {saucepan: 'empty', bowl: 'chocolate'}}),
      step('flour', 'bowl', 'Farine', 'Ajoute la farine', 'Farine ajoutée.', 'pour', {set: {bowl: 'flour'}}),
      step('whisk', 'bowl', 'Fouetter', 'Fouette jusqu’à une pâte lisse', 'Une pâte bien lisse !', 'whisk', {set: {bowl: 'batter'}}),
      step('bowl', 'mould', 'Moule', 'Verse la pâte dans le moule', 'La pâte est dans le moule.', 'pour', {set: {bowl: 'empty', mould: 'batter'}}),
      step('mould', 'oven', 'Four', 'Enfourne le moule', 'Le moelleux cuit au four…', 'oven', {hide: true,
        cook: {ms: 5000, heater: 'oven', container: 'mould', set: {mould: 'baked'}, show: ['mould'], message: 'Le moelleux est cuit !'}}),
    ],
  },
  {
    id: 'chicken', name: 'Poulet soja-miel', title: 'Poulet soja-miel', dish: 'plate-chicken',
    summary: 'Poulet glacé et patate douce rôtie au four',
    resultTitle: 'Poulet soja-miel réussi !', resultCopy: 'Le poulet et la patate douce sont cuits à point.',
    layout: {
      chicken: {x: 200, y: 175}, 'sweet-potato': {x: 200, y: 335},
      knife: {x: 350, y: 96}, peeler: {x: 470, y: 94}, soy: {x: 585, y: 86}, honey: {x: 665, y: 90},
      'cutting-board': {x: 440, y: 285}, 'baking-dish': {x: 685, y: 320}, oven: {x: 885, y: 210},
    },
    chains: [[
      onBoard('chicken', 'Poulet', 'Pose le poulet sur la planche', 'Le poulet est sur la planche.'),
      step('knife', 'chicken', 'Couper', 'Coupe le poulet avec le couteau', 'Poulet coupé !', 'cut', {set: {chicken: 'cut'}}),
      step('soy', 'chicken', 'Soja', 'Verse la sauce soja sur le poulet', 'Sauce soja ajoutée au poulet.', 'season', {set: {chicken: 'soy'}}),
      step('honey', 'chicken', 'Miel', 'Ajoute le miel sur le poulet', 'Miel ajouté : le poulet est glacé !', 'season', {set: {chicken: 'glazed'}}),
      step('chicken', 'baking-dish', 'Plat', 'Mets le poulet dans le plat', 'Le poulet est dans le plat.', 'place', {hide: true, set: {'baking-dish': {empty: 'chicken', 'sweet-potato': 'both'}}}),
    ], [
      onBoard('sweet-potato', 'Patate douce', 'Pose la patate douce sur la planche', 'La patate douce est sur la planche.'),
      step('peeler', 'sweet-potato', 'Éplucher', 'Épluche la patate douce avec l’économe', 'Patate douce épluchée.', 'peel', {set: {'sweet-potato': 'peeled'}}),
      step('knife', 'sweet-potato', 'Couper', 'Coupe la patate douce avec le couteau', 'Patate douce coupée !', 'cut', {set: {'sweet-potato': 'cut'}}),
      step('sweet-potato', 'baking-dish', 'Plat', 'Mets la patate douce dans le plat', 'La patate douce est dans le plat.', 'place', {hide: true, set: {'baking-dish': {empty: 'sweet-potato', chicken: 'both'}}}),
    ]],
    finale: [
      step('baking-dish', 'oven', 'Four', 'Enfourne le plat', 'Le plat cuit au four…', 'oven', {hide: true,
        cook: {ms: 5000, heater: 'oven', container: 'baking-dish', set: {'baking-dish': 'cooked'}, show: ['baking-dish'], message: 'Le poulet est cuit à point !'}}),
    ],
  },
];
export const recipe = (id: RecipeId): RecipeDefinition => RECIPES.find(r => r.id === id)!;
/** Every step of a recipe in a stable reading order (chains first, then the finale). */
export const allSteps = (r: RecipeDefinition): readonly StepDefinition[] => [...r.chains.flat(), ...r.finale];
