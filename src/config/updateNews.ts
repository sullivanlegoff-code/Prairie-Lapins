import {EPIC_ISLET, FARM_UPGRADES, FOREST, JUMP_ROPE, PICNIC, SALON, SPECIES, SPECIES_IDS} from './balance';

/**
 * The news of the Christmas update (owner, 8 November 2026): a page that welcomes the player once, at the first launch after
 * the update, then stays open to all with a button under the settings while the Christmas event lasts. Three posters to swipe
 * through, chosen by the owner: the Christmas event, the new rabbits (never an evolution: they stay a surprise) and the new
 * places. Each poster is a painted picture without words; the words are the game's, over its calm bottom part.
 */
export interface NewsPage {id: string; title: string; lines: readonly string[]; poster: string}
/** Changing it opens the page once more for everyone: only for a new update. */
export const UPDATE_NEWS_ID = 'noel-2026';
/** The 13 species of the Christmas update (the game published before it had 36). */
export const NEW_SPECIES = ['vantablack', 'fantome', 'bouyoyo', 'nuage', 'champignon', 'gigi-rarafe', 'yetiti', 'rennes', 'susucre', 'lapin-de-sulli', 'pain-epice', 'flocon-cristal', 'arkoko'] as const;
const count = (rarity: string) => NEW_SPECIES.filter(id => SPECIES[id].rarity === rarity).length;
const poster = (n: number) => `${import.meta.env.BASE_URL}assets/news/noel-2026/affiche-${n}.webp`;

export const NEWS_PAGES: readonly NewsPage[] = [
  {id: 'noel', title: 'Noël arrive sur ta prairie !', poster: poster(1), lines: [
    'Ton île se couvre de neige et, chaque soir, les guirlandes s’allument.',
    'Tes lapins se lancent des boules de neige, et tu peux leur faire construire un bonhomme de neige.',
    'Le marché de Noël ouvre sur son îlot : gagne des sucres d’orge et échange-les contre des trésors de saison.',
    'Attrape les cadeaux que le traîneau lâche dans le ciel !',
  ]},
  {id: 'lapins', title: `${NEW_SPECIES.length} nouveaux lapins`, poster: poster(2), lines: [
    `${count('rare')} lapins rares, ${count('epic')} lapins épiques aux couleurs de Noël et un nouveau légendaire : ${SPECIES.arkoko.name}.`,
    'Découvre leurs recettes dans le nid et complète ta collection.',
    'Avec beaucoup d’affection, tes lapins pourront même évoluer… À toi de découvrir en quoi !',
  ]},
  {id: 'lieux', title: 'De nouveaux lieux à découvrir', poster: poster(3), lines: [
    `Le pique-nique dès le niveau ${PICNIC.unlockLevel}, l’Îlot des Épiques dès le niveau ${EPIC_ISLET.unlockLevel}, le saut à la corde dès le niveau ${JUMP_ROPE.unlockLevel}.`,
    `Le Salon de soins dès le niveau ${SALON.unlockLevel}, la ferme niveau 4 et la Forêt de Brocéliande dès le niveau ${Math.max(FARM_UPGRADES[4].level, FOREST.unlockLevel)}.`,
    'Des enclos plus grands, l’enclos Ultra neige et le perchoir de Benny pour son jeu du vol.',
  ]},
];
export const NEWS_SPECIES_COUNT_BEFORE = SPECIES_IDS.length - NEW_SPECIES.length;
