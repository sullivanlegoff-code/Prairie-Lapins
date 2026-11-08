/** Removed catalogue IDs: discard owned copies when decoding v16 saves, without compensation. */
export const RETIRED_DECORATION_IDS = ['wildflowers', 'flowering-bush', 'moss-rock', 'garden-lantern', 'wood-bench', 'flower-arch', 'fruit-tree', 'small-pond', 'soft-cushion', 'ball-toys', 'play-tunnel', 'small-parasol'] as const;
/** Stable save identifiers. Precious objects have a Heart price; decoration has no gameplay bonus. */
export const DECORATION_IDS = ['dirt-path', 'bush', 'tree', 'hay-bale', 'bunny-slippers', 'birthday-candle', 'small-bookcase', 'coconut-palm', 'otter-plush', 'large-bookcase', 'hanukkah-menorah', 'honey-pot', 'robot-statue', 'penguin-bookcase', 'ironing-board', 'climbing-rock', 'white-bouquet', 'rabbit-fountain', 'shark-slippers', 'vintage-microscope', 'game-console', 'chocolate-cake'] as const;
/**
 * The Christmas market's decorations (owner, 4 November 2026): sold only at the market, for sucres d'orge (`candyPrice`), while
 * the event is on (`buyChristmasDecoration`); never in the decoration shop above, never for pattes or Hearts, no level needed,
 * no XP and no « Installer » mission. Once bought they stay owned and placeable after the event, and are never resold.
 */
export const CHRISTMAS_DECORATION_IDS = ['christmas-tree', 'gift-pile', 'candy-cane', 'lantern-post', 'wreath-arch', 'sled', 'reindeer', 'snow-globe',
  // Five more, chosen by the owner on 7 November 2026 (the two stands are decoration only: nothing is sold there).
  'hot-chocolate', 'raclette-stand', 'souvenir-stand', 'snow-castle', 'mini-igloo'] as const;
/** Every decoration a save may hold: the shop's and the Christmas market's. */
export const ALL_DECORATION_IDS = [...DECORATION_IDS, ...CHRISTMAS_DECORATION_IDS] as const;
export type ShopDecorationId = typeof DECORATION_IDS[number];
export type ChristmasDecorationId = typeof CHRISTMAS_DECORATION_IDS[number];
export type DecorationId = ShopDecorationId | ChristmasDecorationId;
export const isChristmasDecoration = (id: string): id is ChristmasDecorationId => (CHRISTMAS_DECORATION_IDS as readonly string[]).includes(id);
export interface DecorationDefinition {name: string; price: number; heartPrice?: number;
  /** Christmas market only: the price in sucres d'orge, with `christmas: true` and `price: 0`. */
  candyPrice?: number; christmas?: true; area: 'outside'; width: number; height: number; rotates: boolean; level?: number; art: {
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
  'bunny-slippers': {name: 'Chaussons lapins', price: 30, area: 'outside', width: 1, height: 1, rotates: false, level: 3, art: {file: 'assets/decorations/bunny-slippers.png', worldWidth: 68, anchor: {x: .5, y: 0.8}}},
  'birthday-candle': {name: 'Bougie « 1 an »', price: 50, area: 'outside', width: 2, height: 2, rotates: false, level: 5, art: {file: 'assets/decorations/birthday-candle.png', worldWidth: 82, anchor: {x: .5, y: 0.94}}},
  'small-bookcase': {name: 'Petite bibliothèque', price: 600, area: 'outside', width: 1, height: 1, rotates: false, level: 6, art: {file: 'assets/decorations/small-bookcase.png', worldWidth: 47, anchor: {x: .5, y: 0.93}}},
  'coconut-palm': {name: 'Cocotier', price: 800, area: 'outside', width: 2, height: 2, rotates: false, level: 8, art: {file: 'assets/decorations/coconut-palm.png', worldWidth: 150, anchor: {x: .5, y: 0.95}}},
  'otter-plush': {name: 'Peluche de loutre géante', price: 1500, area: 'outside', width: 2, height: 2, rotates: false, level: 10, art: {file: 'assets/decorations/otter-plush.png', worldWidth: 100, anchor: {x: .5, y: 0.93}}},
  'large-bookcase': {name: 'Grande bibliothèque', price: 4000, area: 'outside', width: 2, height: 1, rotates: false, level: 12, art: {file: 'assets/decorations/large-bookcase.png', worldWidth: 91, anchor: {x: .5, y: 0.93}}},
  'hanukkah-menorah': {name: 'Ménorah de Hanoucca', price: 2500, area: 'outside', width: 1, height: 1, rotates: false, level: 14, art: {file: 'assets/decorations/hanukkah-menorah.png', worldWidth: 43, anchor: {x: .5, y: 0.94}}},
  // Owner's own artwork, shipped unchanged (only cropped and reduced like every decoration).
  'honey-pot': {name: 'Pot de miel géant', price: 70, area: 'outside', width: 2, height: 2, rotates: false, level: 4, art: {file: 'assets/decorations/honey-pot.png', worldWidth: 95, anchor: {x: .5, y: 0.9}}},
  'robot-statue': {name: 'Statue du robot noir et doré', price: 15000, heartPrice: 50, area: 'outside', width: 2, height: 2, rotates: false, level: 22, art: {file: 'assets/decorations/robot-statue.png', worldWidth: 52, anchor: {x: .5, y: 0.95}}},
  'penguin-bookcase': {name: 'Armoire de livres Penguin', price: 5000, area: 'outside', width: 2, height: 1, rotates: false, level: 14, art: {file: 'assets/decorations/penguin-bookcase.png', worldWidth: 96, anchor: {x: .5, y: .93}}},
  'ironing-board': {name: 'Table à repasser jaune', price: 300, area: 'outside', width: 2, height: 1, rotates: false, level: 6, art: {file: 'assets/decorations/ironing-board.png', worldWidth: 70, anchor: {x: .5, y: .93}}},
  'climbing-rock': {name: 'Rocher d’escalade', price: 900, area: 'outside', width: 2, height: 2, rotates: false, level: 8, art: {file: 'assets/decorations/climbing-rock.png', worldWidth: 85, anchor: {x: .5, y: .93}}},
  'white-bouquet': {name: 'Grand vase de fleurs blanches', price: 100, area: 'outside', width: 1, height: 1, rotates: false, level: 4, art: {file: 'assets/decorations/white-bouquet.png', worldWidth: 100, anchor: {x: .5, y: .93}}},
  'rabbit-fountain': {name: 'Vasque lapin en pierre', price: 1500, area: 'outside', width: 2, height: 2, rotates: false, level: 10, art: {file: 'assets/decorations/rabbit-fountain.png', worldWidth: 85, anchor: {x: .5, y: .93}}},
  'shark-slippers': {name: 'Chaussons requins', price: 50, area: 'outside', width: 1, height: 1, rotates: false, level: 3, art: {file: 'assets/decorations/shark-slippers.png', worldWidth: 76, anchor: {x: .5, y: .8}}},
  'vintage-microscope': {name: 'Vaccin contre la tuberculose', price: 3500, area: 'outside', width: 2, height: 1, rotates: false, level: 15, art: {file: 'assets/decorations/vintage-microscope.png', worldWidth: 78, anchor: {x: .5, y: .93}}},
  'game-console': {name: 'Nintendo Switch et télévision', price: 5000, area: 'outside', width: 2, height: 1, rotates: false, level: 16, art: {file: 'assets/decorations/game-console.png', worldWidth: 130, anchor: {x: .5, y: .93}}},
  'chocolate-cake': {name: 'Gâteau chocolat « je t’aime »', price: 150, area: 'outside', width: 2, height: 2, rotates: false, level: 5, art: {file: 'assets/decorations/chocolate-cake.png', worldWidth: 80, anchor: {x: .5, y: .93}}},
  // The Christmas market (art: assets/noel/decorations/<id>.png, repainted in the game's plainer style on 7 November 2026).
  'christmas-tree': {name: 'Sapin de Noël', price: 0, candyPrice: 120, christmas: true, area: 'outside', width: 2, height: 2, rotates: false, level: 1, art: {file: 'assets/noel/decorations/christmas-tree.png', worldWidth: 130, anchor: {x: .5, y: .95}}},
  'gift-pile': {name: 'Pile de cadeaux', price: 0, candyPrice: 40, christmas: true, area: 'outside', width: 1, height: 1, rotates: false, level: 1, art: {file: 'assets/noel/decorations/gift-pile.png', worldWidth: 46, anchor: {x: .5, y: .88}}},
  'candy-cane': {name: 'Sucre d’orge géant', price: 0, candyPrice: 30, christmas: true, area: 'outside', width: 1, height: 1, rotates: false, level: 1, art: {file: 'assets/noel/decorations/candy-cane.png', worldWidth: 40, anchor: {x: .5, y: .93}}},
  'lantern-post': {name: 'Lanterne d’hiver', price: 0, candyPrice: 35, christmas: true, area: 'outside', width: 1, height: 1, rotates: false, level: 1, art: {file: 'assets/noel/decorations/lantern-post.png', worldWidth: 40, anchor: {x: .5, y: .94}}},
  'wreath-arch': {name: 'Arche de houx', price: 0, candyPrice: 90, christmas: true, area: 'outside', width: 2, height: 1, rotates: false, level: 1, art: {file: 'assets/noel/decorations/wreath-arch.png', worldWidth: 92, anchor: {x: .5, y: .93}}},
  'sled': {name: 'Petit traîneau', price: 0, candyPrice: 70, christmas: true, area: 'outside', width: 2, height: 1, rotates: false, level: 1, art: {file: 'assets/noel/decorations/sled.png', worldWidth: 88, anchor: {x: .5, y: .88}}},
  'reindeer': {name: 'Renne en paille', price: 0, candyPrice: 100, christmas: true, area: 'outside', width: 2, height: 2, rotates: false, level: 1, art: {file: 'assets/noel/decorations/reindeer.png', worldWidth: 95, anchor: {x: .5, y: .93}}},
  'snow-globe': {name: 'Boule à neige géante', price: 0, candyPrice: 60, christmas: true, area: 'outside', width: 1, height: 1, rotates: false, level: 1, art: {file: 'assets/noel/decorations/snow-globe.png', worldWidth: 46, anchor: {x: .5, y: .92}}},
  'hot-chocolate': {name: 'Chocolat chaud géant', price: 0, candyPrice: 40, christmas: true, area: 'outside', width: 1, height: 1, rotates: false, level: 1, art: {file: 'assets/noel/decorations/hot-chocolate.png', worldWidth: 58, anchor: {x: .5, y: .92}}},
  'raclette-stand': {name: 'Stand de raclette', price: 0, candyPrice: 90, christmas: true, area: 'outside', width: 2, height: 2, rotates: false, level: 1, art: {file: 'assets/noel/decorations/raclette-stand.png', worldWidth: 100, anchor: {x: .5, y: .92}}},
  'souvenir-stand': {name: 'Stand de bijoux et souvenirs', price: 0, candyPrice: 90, christmas: true, area: 'outside', width: 2, height: 2, rotates: false, level: 1, art: {file: 'assets/noel/decorations/souvenir-stand.png', worldWidth: 90, anchor: {x: .5, y: .92}}},
  'snow-castle': {name: 'Château de neige', price: 0, candyPrice: 200, christmas: true, area: 'outside', width: 4, height: 4, rotates: false, level: 1, art: {file: 'assets/noel/decorations/snow-castle.png', worldWidth: 240, anchor: {x: .5, y: .92}}},
  'mini-igloo': {name: 'Mini igloo', price: 0, candyPrice: 75, christmas: true, area: 'outside', width: 2, height: 2, rotates: false, level: 1, art: {file: 'assets/noel/decorations/mini-igloo.png', worldWidth: 112, anchor: {x: .5, y: .9}}},
};
export const FINE_GRID = 4;
/** A generous bound keeps imports and low-end devices bounded; never discards owned objects. */
export const MAX_DECORATIONS = 512;

/** Decorations only: refund pattes for historical coin receipts only, never hearts. */
export const DECORATION_RESALE_RATE = .5;
const LEGACY_PRICES: Partial<Record<DecorationId, number>> = {'small-bookcase': 160, 'coconut-palm': 130, 'otter-plush': 200, 'hanukkah-menorah': 150, 'large-bookcase': 400, 'robot-statue': 500};
export const decorationResalePrice = (id: DecorationId): number => Math.floor(DECORATIONS[id].price * DECORATION_RESALE_RATE);
/** Old exemplars have no receipt; use the pre-refonte catalogue as their paid-price cap. */
/** Heart-paid and Christmas (sucres d'orge) exemplars are never resold: 0. */
export const ownedDecorationResalePrice = (owned: {catalogId: DecorationId; paidPrice?: number; paidHearts?: number; paidCandies?: number}): number =>
  owned.paidHearts !== undefined || owned.paidCandies !== undefined || isChristmasDecoration(owned.catalogId) ? 0 :
  Math.min(decorationResalePrice(owned.catalogId), owned.paidPrice ?? LEGACY_PRICES[owned.catalogId] ?? DECORATIONS[owned.catalogId].price);
