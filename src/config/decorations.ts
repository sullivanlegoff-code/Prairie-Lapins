/** Removed catalogue IDs: discard owned copies when decoding v16 saves, without compensation. */
export const RETIRED_DECORATION_IDS = ['wildflowers', 'flowering-bush', 'moss-rock', 'garden-lantern', 'wood-bench', 'flower-arch', 'fruit-tree', 'small-pond', 'soft-cushion', 'ball-toys', 'play-tunnel', 'small-parasol'] as const;
/** Stable save identifiers. Precious objects have a Heart price; decoration has no gameplay bonus. */
export const DECORATION_IDS = ['dirt-path', 'bush', 'tree', 'hay-bale', 'bunny-slippers', 'birthday-candle', 'small-bookcase', 'coconut-palm', 'otter-plush', 'large-bookcase', 'hanukkah-menorah', 'honey-pot', 'robot-statue', 'penguin-bookcase', 'ironing-board', 'climbing-rock', 'white-bouquet', 'rabbit-fountain', 'shark-slippers', 'vintage-microscope', 'game-console', 'chocolate-cake'] as const;
export type DecorationId = typeof DECORATION_IDS[number];
export interface DecorationDefinition {name: string; price: number; heartPrice?: number; area: 'outside'; width: number; height: number; rotates: boolean; level?: number; art: {
  /** Relative to the Vite base; displayed width in world units before camera zoom. */
  file: string; worldWidth: number;
  /** Normalised ground contact within the cropped texture. */
  anchor: {x: number; y: number};
}}
export const DECORATIONS: Record<DecorationId, DecorationDefinition> = {
  'dirt-path': {name: 'Chemin en terre', price: 1, area: 'outside', width: 1, height: 1, rotates: false, level: 1, art: {file: 'assets/decorations/dirt-path.png', worldWidth: 54, anchor: {x: .5, y: 0.5}}},
  'bush': {name: 'Buisson', price: 20, area: 'outside', width: 1, height: 1, rotates: false, level: 1, art: {file: 'assets/decorations/bush.png', worldWidth: 44, anchor: {x: .5, y: 0.87}}},
  'tree': {name: 'Arbre', price: 30, area: 'outside', width: 2, height: 2, rotates: false, level: 1, art: {file: 'assets/decorations/tree.png', worldWidth: 138, anchor: {x: .5, y: 0.95}}},
  'hay-bale': {name: 'Botte de foin', price: 50, area: 'outside', width: 1, height: 1, rotates: false, level: 2, art: {file: 'assets/decorations/hay-bale.png', worldWidth: 43, anchor: {x: .5, y: 0.85}}},
  'bunny-slippers': {name: 'Chaussons lapins', price: 30, area: 'outside', width: 1, height: 1, rotates: false, level: 3, art: {file: 'assets/decorations/bunny-slippers.png', worldWidth: 34, anchor: {x: .5, y: 0.8}}},
  'birthday-candle': {name: 'Bougie « 1 an »', price: 50, area: 'outside', width: 2, height: 2, rotates: false, level: 5, art: {file: 'assets/decorations/birthday-candle.png', worldWidth: 82, anchor: {x: .5, y: 0.94}}},
  'small-bookcase': {name: 'Petite bibliothèque', price: 600, area: 'outside', width: 1, height: 1, rotates: false, level: 6, art: {file: 'assets/decorations/small-bookcase.png', worldWidth: 47, anchor: {x: .5, y: 0.93}}},
  'coconut-palm': {name: 'Cocotier', price: 800, area: 'outside', width: 2, height: 2, rotates: false, level: 8, art: {file: 'assets/decorations/coconut-palm.png', worldWidth: 150, anchor: {x: .5, y: 0.95}}},
  'otter-plush': {name: 'Peluche de loutre géante', price: 1500, area: 'outside', width: 2, height: 2, rotates: false, level: 10, art: {file: 'assets/decorations/otter-plush.png', worldWidth: 100, anchor: {x: .5, y: 0.93}}},
  'large-bookcase': {name: 'Grande bibliothèque', price: 4000, area: 'outside', width: 2, height: 1, rotates: false, level: 12, art: {file: 'assets/decorations/large-bookcase.png', worldWidth: 91, anchor: {x: .5, y: 0.93}}},
  'hanukkah-menorah': {name: 'Ménorah de Hanoucca', price: 2500, area: 'outside', width: 1, height: 1, rotates: false, level: 14, art: {file: 'assets/decorations/hanukkah-menorah.png', worldWidth: 43, anchor: {x: .5, y: 0.94}}},
  // Owner's own artwork, shipped unchanged (only cropped and reduced like every decoration).
  'honey-pot': {name: 'Pot de miel géant', price: 70, area: 'outside', width: 2, height: 2, rotates: false, level: 4, art: {file: 'assets/decorations/honey-pot.png', worldWidth: 95, anchor: {x: .5, y: 0.9}}},
  'robot-statue': {name: 'Statue du robot noir et doré', price: 15000, heartPrice: 80, area: 'outside', width: 2, height: 2, rotates: false, level: 22, art: {file: 'assets/decorations/robot-statue.png', worldWidth: 52, anchor: {x: .5, y: 0.95}}},
  'penguin-bookcase': {name: 'Armoire de livres Penguin', price: 5000, area: 'outside', width: 2, height: 1, rotates: false, level: 14, art: {file: 'assets/decorations/penguin-bookcase.png', worldWidth: 96, anchor: {x: .5, y: .93}}},
  'ironing-board': {name: 'Table à repasser jaune', price: 300, area: 'outside', width: 2, height: 1, rotates: false, level: 6, art: {file: 'assets/decorations/ironing-board.png', worldWidth: 70, anchor: {x: .5, y: .93}}},
  'climbing-rock': {name: 'Rocher d’escalade', price: 900, area: 'outside', width: 2, height: 2, rotates: false, level: 8, art: {file: 'assets/decorations/climbing-rock.png', worldWidth: 85, anchor: {x: .5, y: .93}}},
  'white-bouquet': {name: 'Vase de fleurs blanches', price: 100, area: 'outside', width: 1, height: 1, rotates: false, level: 4, art: {file: 'assets/decorations/white-bouquet.png', worldWidth: 40, anchor: {x: .5, y: .93}}},
  'rabbit-fountain': {name: 'Vasque lapin en pierre', price: 1500, area: 'outside', width: 2, height: 2, rotates: false, level: 10, art: {file: 'assets/decorations/rabbit-fountain.png', worldWidth: 85, anchor: {x: .5, y: .93}}},
  'shark-slippers': {name: 'Chaussons requins', price: 50, area: 'outside', width: 1, height: 1, rotates: false, level: 3, art: {file: 'assets/decorations/shark-slippers.png', worldWidth: 38, anchor: {x: .5, y: .8}}},
  'vintage-microscope': {name: 'Vaccin contre la tuberculose', price: 3500, area: 'outside', width: 2, height: 1, rotates: false, level: 15, art: {file: 'assets/decorations/vintage-microscope.png', worldWidth: 78, anchor: {x: .5, y: .93}}},
  'game-console': {name: 'Nintendo Switch', price: 5000, area: 'outside', width: 2, height: 1, rotates: false, level: 16, art: {file: 'assets/decorations/game-console.png', worldWidth: 65, anchor: {x: .5, y: .93}}},
  'chocolate-cake': {name: 'Gâteau chocolat « je t’aime »', price: 150, area: 'outside', width: 2, height: 2, rotates: false, level: 5, art: {file: 'assets/decorations/chocolate-cake.png', worldWidth: 80, anchor: {x: .5, y: .93}}},
};
export const FINE_GRID = 4;
/** A generous bound keeps imports and low-end devices bounded; never discards owned objects. */
export const MAX_DECORATIONS = 512;

/** Decorations only: refund pattes for historical coin receipts only, never hearts. */
export const DECORATION_RESALE_RATE = .5;
const LEGACY_PRICES: Partial<Record<DecorationId, number>> = {'small-bookcase': 160, 'coconut-palm': 130, 'otter-plush': 200, 'hanukkah-menorah': 150, 'large-bookcase': 400, 'robot-statue': 500};
export const decorationResalePrice = (id: DecorationId): number => Math.floor(DECORATIONS[id].price * DECORATION_RESALE_RATE);
/** Old exemplars have no receipt; use the pre-refonte catalogue as their paid-price cap. */
export const ownedDecorationResalePrice = (owned: {catalogId: DecorationId; paidPrice?: number; paidHearts?: number}): number =>
  owned.paidHearts !== undefined ? 0 :
  Math.min(decorationResalePrice(owned.catalogId), owned.paidPrice ?? LEGACY_PRICES[owned.catalogId] ?? DECORATIONS[owned.catalogId].price);
