import type {SpeciesId} from './species';

/**
 * Evolved drawings (owner, 3 November 2026): from affection `EVOLUTION_AFFECTION`, a rabbit of a species listed here shows its
 * evolved drawing wherever that rabbit is shown (meadow, sheet, portraits, menus); the catalogue and the shop keep the species'
 * own drawing. A species without an entry keeps its v1 for ever: adding an evolution is adding one line below (and its manifest
 * entry in scripts/rabbit-art-manifest.json). Pure data, independent of Phaser, the DOM and the deployment URL.
 */
export const EVOLUTION_AFFECTION = 30;
/** An evolved rabbit looks about 15 % bigger in the game: applied in code to its world width, never baked in the picture. */
export const EVOLVED_SCALE = 1.15;

/** Same fields as a static sprite of the registry; `worldWidth` is the size before `EVOLVED_SCALE`, coherent with the v1. */
export interface EvolvedSprite {
  readonly id: SpeciesId; readonly file: string; readonly texture: string;
  readonly width: number; readonly height: number; readonly worldWidth: number; readonly groundY: number;
  readonly facing?: 'left' | 'right';
}
/**
 * Masters cut out by scripts/prepare-rabbit-masters.mjs, derived by scripts/derive-rabbit-art.mjs (which writes width and height
 * here). World widths keep the area of the v1 drawing of the same species (the evolution grows only by `EVOLVED_SCALE`).
 */
export const EVOLVED_ART: readonly EvolvedSprite[] = [
  // Paille B « Cœur des moissons ».
  {id: 'paille', file: 'assets/rabbits/paille/paille-v2.png', texture: 'rabbit-paille-evolved-v2', width: 331, height: 484, worldWidth: 39, groundY: 12, facing: 'left'},
  // Neige B « Petit matin d'hiver ».
  {id: 'neige', file: 'assets/rabbits/neige/neige-v2.png', texture: 'rabbit-neige-evolved-v2', width: 451, height: 428, worldWidth: 47, groundY: 12},
  // Feu B « Cœur ardent ».
  {id: 'feu', file: 'assets/rabbits/feu/feu-v2.png', texture: 'rabbit-feu-evolved-v2', width: 459, height: 428, worldWidth: 47, groundY: 12},
  // Bélier Gris A « Gardien d'argent ».
  {id: 'belier-gris', file: 'assets/rabbits/belier-gris/belier-gris-v2.png', texture: 'rabbit-belier-gris-evolved-v2', width: 445, height: 428, worldWidth: 47, groundY: 12},
  // Volant A1 « Zéphyr céleste ».
  {id: 'volant', file: 'assets/rabbits/volant/volant-v2.png', texture: 'rabbit-volant-evolved-v2', width: 450, height: 482, worldWidth: 53, groundY: 12},
  // Dinono « armure jade ».
  {id: 'dinono', file: 'assets/rabbits/dinono/dinono-v2.png', texture: 'rabbit-dinono-evolved-v2', width: 450, height: 430, worldWidth: 53, groundY: 12},
  // Dinenette « pendentif cœur ».
  {id: 'dinenette', file: 'assets/rabbits/dinenette/dinenette-v2.png', texture: 'rabbit-dinenette-evolved-v2', width: 458, height: 453, worldWidth: 54, groundY: 12},
  // Améthyste Cristal.
  {id: 'amethyste', file: 'assets/rabbits/amethyste/amethyste-v2.png', texture: 'rabbit-amethyste-evolved-v2', width: 441, height: 452, worldWidth: 52, groundY: 14.5},
  // Ardent Brasier.
  {id: 'ardent', file: 'assets/rabbits/ardent/ardent-v2.png', texture: 'rabbit-ardent-evolved-v2', width: 432, height: 428, worldWidth: 49.9, groundY: 13},
  // Boudinet Gourmand.
  {id: 'boudinet', file: 'assets/rabbits/boudinet/boudinet-v2.png', texture: 'rabbit-boudinet-evolved-v2', width: 402, height: 457, worldWidth: 47.4, groundY: 12},
  // Bouée Vacancière.
  {id: 'bouee', file: 'assets/rabbits/bouee/bouee-v2.png', texture: 'rabbit-bouee-evolved-v2', width: 433, height: 486, worldWidth: 51.1, groundY: 12},
  // Bretonette Bigoudène.
  {id: 'bretonette', file: 'assets/rabbits/bretonette/bretonette-v2.png', texture: 'rabbit-bretonette-evolved-v2', width: 436, height: 507, worldWidth: 51.4, groundY: 12},
  // Egiiipte Caravanier.
  {id: 'egiiipte', file: 'assets/rabbits/egiiipte/egiiipte-v2.png', texture: 'rabbit-egiiipte-evolved-v2', width: 461, height: 424, worldWidth: 52.9, groundY: 12},
  // Fluffy Rose-Parapluie.
  {id: 'fluffy', file: 'assets/rabbits/fluffy/fluffy-v2.png', texture: 'rabbit-fluffy-evolved-v2', width: 422, height: 431, worldWidth: 49.7, groundY: 13.5},
  // Frisket Jardinier des Neiges.
  {id: 'frisket', file: 'assets/rabbits/frisket/frisket-v2.png', texture: 'rabbit-frisket-evolved-v2', width: 354, height: 574, worldWidth: 41.7, groundY: 12},
  // Glassofeu Équinoxe.
  {id: 'glassofeu', file: 'assets/rabbits/glassofeu/glassofeu-v2.png', texture: 'rabbit-glassofeu-evolved-v2', width: 389, height: 459, worldWidth: 45.8, groundY: 12, facing: 'left'},
  // Icy Romantique.
  {id: 'icy', file: 'assets/rabbits/icy/icy-v2.png', texture: 'rabbit-icy-evolved-v2', width: 394, height: 450, worldWidth: 46.4, groundY: 12},
  // Phoenix Flamboyant.
  {id: 'phoenix', file: 'assets/rabbits/phoenix/phoenix-v2.png', texture: 'rabbit-phoenix-evolved-v2', width: 453, height: 463, worldWidth: 53.4, groundY: 14.5},
  // Pic Pic Armure de Cristal.
  {id: 'pic-pic', file: 'assets/rabbits/pic-pic/pic-pic-v2.png', texture: 'rabbit-pic-pic-evolved-v2', width: 414, height: 507, worldWidth: 48.8, groundY: 12.5},
  // Piment Fiesta.
  {id: 'piment', file: 'assets/rabbits/piment/piment-v2.png', texture: 'rabbit-piment-evolved-v2', width: 443, height: 431, worldWidth: 52.2, groundY: 12},
  // Plume Ailé.
  {id: 'plume', file: 'assets/rabbits/plume/plume-v2.png', texture: 'rabbit-plume-evolved-v2', width: 418, height: 428, worldWidth: 49.1, groundY: 12.5},
  // Princesse Neige Reine des Glaces.
  {id: 'princesse-neige', file: 'assets/rabbits/princesse-neige/princesse-neige-v2.png', texture: 'rabbit-princesse-neige-evolved-v2', width: 435, height: 429, worldWidth: 51.3, groundY: 13.5},
  // Roukette Star du Rock.
  {id: 'roukette', file: 'assets/rabbits/roukette/roukette-v2.png', texture: 'rabbit-roukette-evolved-v2', width: 383, height: 462, worldWidth: 45.2, groundY: 12},
  // SNK Vétéran.
  {id: 'snk', file: 'assets/rabbits/snk/snk-v2.png', texture: 'rabbit-snk-evolved-v2', width: 471, height: 384, worldWidth: 55.5, groundY: 15.5},
  // Tunini Séraphique.
  {id: 'tunini', file: 'assets/rabbits/tunini/tunini-v2.png', texture: 'rabbit-tunini-evolved-v2', width: 472, height: 482, worldWidth: 55.7, groundY: 12},
  // Virvoletant Cow-boy du Désert.
  {id: 'virvoletant', file: 'assets/rabbits/virvoletant/virvoletant-v2.png', texture: 'rabbit-virvoletant-evolved-v2', width: 376, height: 518, worldWidth: 44.3, groundY: 12.5},
  // Wat Wat Vague Céleste.
  {id: 'wat-wat', file: 'assets/rabbits/wat-wat/wat-wat-v2.png', texture: 'rabbit-wat-wat-evolved-v2', width: 469, height: 415, worldWidth: 55.3, groundY: 15},
  // Câlinou Nuage Câlineur.
  {id: 'calinou', file: 'assets/rabbits/calinou/calinou-v2.png', texture: 'rabbit-calinou-evolved-v2', width: 682, height: 641, worldWidth: 80.5, groundY: 12},
  // Dadi Superstar.
  {id: 'dadi', file: 'assets/rabbits/dadi/dadi-v2.png', texture: 'rabbit-dadi-evolved-v2', width: 334, height: 528, worldWidth: 39.4, groundY: 13},
  // Archimage Étoilé.
  {id: 'magicien', file: 'assets/rabbits/magicien/magicien-v2.png', texture: 'rabbit-magicien-evolved-v2', width: 448, height: 487, worldWidth: 52.8, groundY: 12},
  // Maxou des Abysses.
  {id: 'maxou', file: 'assets/rabbits/maxou/maxou-v2.png', texture: 'rabbit-maxou-evolved-v2', width: 455, height: 445, worldWidth: 53.7, groundY: 12},
  // Orange Créatrice de Mode.
  {id: 'orange', file: 'assets/rabbits/orange/orange-v2.png', texture: 'rabbit-orange-evolved-v2', width: 381, height: 508, worldWidth: 44.9, groundY: 12},
  // Anky Gardien Cuirassé.
  {id: 'ankylosaure', file: 'assets/rabbits/ankylosaure/ankylosaure-v2.png', texture: 'rabbit-ankylosaure-evolved-v2', width: 498, height: 403, worldWidth: 58.7, groundY: 12},
  // Lapin Dragon Écarlate Majestueux.
  {id: 'dragon', file: 'assets/rabbits/dragon/dragon-v2.png', texture: 'rabbit-dragon-evolved-v2', width: 477, height: 449, worldWidth: 56.3, groundY: 12},
  // Lapin Requin Roi des Océans.
  {id: 'requin', file: 'assets/rabbits/requin/requin-v2.png', texture: 'rabbit-requin-evolved-v2', width: 465, height: 484, worldWidth: 54.8, groundY: 12},
];
export const evolvedSprite = (species: SpeciesId): EvolvedSprite | undefined => EVOLVED_ART.find(art => art.id === species);
export const hasEvolvedArt = (species: SpeciesId): boolean => !!evolvedSprite(species);
/** What decides a rabbit's drawing: its species, its affection and the player's choice at the Forêt de Brocéliande. */
export interface LookRabbit {readonly species: SpeciesId; readonly affection: number; readonly classicLook?: true}
/** Affection 30 or more on a species with an evolved drawing shows it, unless the player put back the old one (`classicLook`). */
export const canEvolve = (rabbit: Pick<LookRabbit, 'species' | 'affection'>): boolean => hasEvolvedArt(rabbit.species) && rabbit.affection >= EVOLUTION_AFFECTION;
export const showsEvolvedArt = (rabbit: LookRabbit): boolean => canEvolve(rabbit) && !rabbit.classicLook;
