/** Logical scene and declarative recipe data. */
export interface Point {x: number; y: number}
export type Preparation = 'none' | 'whole' | 'peeled' | 'cut' | 'raw' | 'cooked';
export type ItemKind = 'food' | 'tool' | 'bottle' | 'fixture';
export interface ItemDefinition {
  id: string; type: string; kind: ItemKind; name: string; preparation: Preparation;
  home: string; anchor: Point; width: number; height: number;
  draggable: boolean; visible: boolean; interactive: boolean;
}
export interface ZoneDefinition {
  id: string; location: string; anchor: Point; width: number; height: number;
  accepts: readonly ItemKind[]; capacity: number; enabled: boolean; owner?: string; priority: number;
}
const item = (id: string, name: string, kind: ItemKind, anchor: Point, width: number, height: number, preparation: Preparation = 'none'): ItemDefinition => ({
  id, type: id, kind, name, anchor, width, height, preparation,
  home: kind === 'food' ? `reserve-${id}` : kind === 'tool' ? `tool-rack-${id}` : `fixture-${id}`,
  draggable: kind === 'food' || kind === 'tool' || kind === 'bottle', visible: true, interactive: kind !== 'fixture',
});
const dish = {...item('baking-dish', 'Plat de cuisson', 'fixture', {x: 704, y: 302}, 174, 112), home: 'dish-rack', draggable: true, interactive: true};
export const ITEMS: readonly ItemDefinition[] = [
  item('cutting-board', 'Planche à découper', 'fixture', {x: 490, y: 238}, 270, 158),
  item('bowl', 'Saladier', 'fixture', {x: 740, y: 310}, 164, 124),
  item('oven', 'Four', 'fixture', {x: 882, y: 205}, 150, 151),
  dish,
  item('knife', 'Couteau', 'tool', {x: 391, y: 114}, 148, 58),
  item('peeler', 'Économe', 'tool', {x: 512, y: 112}, 116, 58),
  item('mozzarella', 'Mozzarella', 'food', {x: 190, y: 155}, 86, 72, 'whole'),
  item('tomato', 'Tomate', 'food', {x: 190, y: 267}, 78, 78, 'whole'),
  item('cucumber', 'Concombre', 'food', {x: 289, y: 353}, 133, 60, 'whole'),
  item('chicken', 'Morceaux de poulet cru', 'food', {x: 180, y: 216}, 144, 94, 'raw'),
  item('sweet-potato', 'Patate douce entière', 'food', {x: 300, y: 348}, 130, 76, 'whole'),
  item('soy', 'Sauce soja', 'bottle', {x: 636, y: 110}, 58, 100),
  item('honey', 'Miel', 'bottle', {x: 730, y: 104}, 66, 90),
  item('olive-oil', 'Huile d’olive', 'bottle', {x: 795, y: 86}, 55, 109),
];
const zones: ZoneDefinition[] = [
  {id: 'cutting-board', location: 'cutting-board', anchor: {x: 490, y: 238}, width: 226, height: 112, accepts: ['food'], capacity: 1, enabled: true, priority: 20},
  {id: 'bowl', location: 'bowl', anchor: {x: 740, y: 310}, width: 130, height: 82, accepts: ['food'], capacity: 3, enabled: true, priority: 20},
  {id: 'baking-dish', location: 'baking-dish', anchor: {x: 704, y: 302}, width: 148, height: 74, accepts: ['food'], capacity: 2, enabled: true, priority: 22},
  {id: 'oven', location: 'oven', anchor: {x: 882, y: 205}, width: 126, height: 108, accepts: ['fixture'], capacity: 1, enabled: true, priority: 24},
  ...ITEMS.filter(i => i.draggable).map(i => ({id: i.home, location: i.kind === 'tool' ? 'tool-rack' : i.kind === 'fixture' ? 'dish-rack' : 'reserve', anchor: {...i.anchor}, width: Math.max(66, i.width), height: 66,
    accepts: [i.kind], capacity: 1, enabled: true, owner: i.id, priority: 10})),
];
export const ZONES: readonly ZoneDefinition[] = zones;
export const FUTURE_RECIPES = [
  {id: 'salad', name: 'Salade mozzarella', items: ['mozzarella', 'tomato', 'cucumber', 'olive-oil'], enabled: true},
  {id: 'chicken', name: 'Poulet soja-miel & patate douce', items: ['chicken', 'sweet-potato', 'soy', 'honey', 'baking-dish', 'oven'], enabled: true},
] as const;

/** Requirements are data so tools and containers share one generic transition path. */
export const TOOL_RULES = [
  {recipe: 'salad', tool: 'knife', target: 'salad-food', requiredLocation: 'cutting-board', requiredPreparation: 'whole', resultPreparation: 'cut', message: 'Coupe d’abord l’ingrédient.'},
  {recipe: 'chicken', tool: 'knife', target: 'chicken', requiredLocation: 'cutting-board', requiredPreparation: 'raw', resultPreparation: 'cut', message: 'Le poulet est déjà préparé.'},
  {recipe: 'chicken', tool: 'knife', target: 'sweet-potato', requiredLocation: 'cutting-board', requiredPreparation: 'peeled', resultPreparation: 'cut', message: 'Épluche-la d’abord.'},
  {recipe: 'chicken', tool: 'peeler', target: 'sweet-potato', requiredLocation: 'cutting-board', requiredPreparation: 'whole', resultPreparation: 'peeled', message: 'L’économe s’utilise sur la patate douce entière, sur la planche.'},
] as const;

export interface BottleRule {
  recipe: 'salad' | 'chicken'; bottle: string; target: string;
  preparation?: Preparation; requiredFlag?: string; contents?: readonly string[];
  flag: string; flagOwner: 'bottle' | 'target'; effect: 'pour' | 'season';
  preparationMessage?: string; flagMessage?: string; duplicateMessage: string; message: string;
}
export const BOTTLE_RULES: readonly BottleRule[] = [
  {recipe: 'chicken', bottle: 'soy', target: 'chicken', preparation: 'cut', flag: 'soyAdded', flagOwner: 'target', effect: 'season', preparationMessage: 'Coupe d’abord le poulet', duplicateMessage: 'La sauce soja est déjà ajoutée.', message: 'Sauce soja ajoutée au poulet.'},
  {recipe: 'chicken', bottle: 'honey', target: 'chicken', preparation: 'cut', requiredFlag: 'soyAdded', flag: 'honeyAdded', flagOwner: 'target', effect: 'season', preparationMessage: 'Coupe d’abord le poulet', flagMessage: 'Ajoute d’abord la sauce soja', duplicateMessage: 'Le miel est déjà ajouté.', message: 'Miel ajouté au poulet. Prépare la patate douce.'},
  {recipe: 'salad', bottle: 'olive-oil', target: 'bowl', contents: ['mozzarella', 'tomato', 'cucumber'], flag: 'oliveOilAdded', flagOwner: 'bottle', effect: 'pour', duplicateMessage: 'L’huile est déjà ajoutée.', message: 'Salade réussie !'},
];
