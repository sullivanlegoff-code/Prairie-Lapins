/** Stable save identifiers. Prices are pattes only; decoration has no gameplay bonus. */
export const DECORATION_IDS = ['wildflowers', 'flowering-bush', 'moss-rock', 'garden-lantern', 'wood-bench', 'flower-arch', 'fruit-tree', 'small-pond', 'soft-cushion', 'ball-toys', 'play-tunnel', 'small-parasol'] as const;
export type DecorationId = typeof DECORATION_IDS[number];
export interface DecorationDefinition {name: string; price: number; area: 'outside'; width: number; height: number; rotates: boolean}
export const DECORATIONS: Record<DecorationId, DecorationDefinition> = {
  wildflowers: {name: 'Massif de fleurs sauvages', price: 20, area: 'outside', width: 1, height: 1, rotates: false},
  'flowering-bush': {name: 'Buisson fleuri', price: 30, area: 'outside', width: 1, height: 1, rotates: false},
  'moss-rock': {name: 'Petit rocher moussu', price: 40, area: 'outside', width: 1, height: 1, rotates: false},
  'garden-lantern': {name: 'Lanterne de jardin', price: 60, area: 'outside', width: 1, height: 1, rotates: false},
  'wood-bench': {name: 'Banc en bois', price: 80, area: 'outside', width: 2, height: 1, rotates: true},
  'flower-arch': {name: 'Arche fleurie', price: 100, area: 'outside', width: 2, height: 1, rotates: true},
  'fruit-tree': {name: 'Petit arbre fruitier', price: 120, area: 'outside', width: 2, height: 2, rotates: false},
  'small-pond': {name: 'Petit bassin', price: 150, area: 'outside', width: 2, height: 2, rotates: false},
  'soft-cushion': {name: 'Coussin douillet', price: 30, area: 'outside', width: 1, height: 1, rotates: false},
  'ball-toys': {name: 'Balle et jouets', price: 40, area: 'outside', width: 1, height: 1, rotates: false},
  'play-tunnel': {name: 'Tunnel de jeu', price: 60, area: 'outside', width: 2, height: 1, rotates: true},
  'small-parasol': {name: 'Petit parasol', price: 80, area: 'outside', width: 1, height: 1, rotates: false},
};
export const FINE_GRID = 4;
/** A generous bound keeps imports and low-end devices bounded; never discards owned objects. */
export const MAX_DECORATIONS = 512;

/** Decorations only: refund pattes, never hearts. */
export const DECORATION_RESALE_RATE = .5;
export const decorationResalePrice = (id: DecorationId): number => Math.floor(DECORATIONS[id].price * DECORATION_RESALE_RATE);
