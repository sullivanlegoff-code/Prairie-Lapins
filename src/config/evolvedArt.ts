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
];
export const evolvedSprite = (species: SpeciesId): EvolvedSprite | undefined => EVOLVED_ART.find(art => art.id === species);
export const hasEvolvedArt = (species: SpeciesId): boolean => !!evolvedSprite(species);
/** What decides a rabbit's drawing: its species, its affection and the player's choice at the Forêt de Brocéliande. */
export interface LookRabbit {readonly species: SpeciesId; readonly affection: number; readonly classicLook?: true}
/** Affection 30 or more on a species with an evolved drawing shows it, unless the player put back the old one (`classicLook`). */
export const canEvolve = (rabbit: Pick<LookRabbit, 'species' | 'affection'>): boolean => hasEvolvedArt(rabbit.species) && rabbit.affection >= EVOLUTION_AFFECTION;
export const showsEvolvedArt = (rabbit: LookRabbit): boolean => canEvolve(rabbit) && !rabbit.classicLook;
