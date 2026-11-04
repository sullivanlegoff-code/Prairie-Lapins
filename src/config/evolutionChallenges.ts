import type {SpeciesId} from './species';
import type {Rarity} from './rarities';

/** The three Cuisine recipes an evolution challenge may name. */
export type ChallengeRecipe = 'chicken' | 'moelleux' | 'avocado-toast';
/**
 * `commis:<recette>` counts only for the commis (the rabbit that cooks), `gouteur:<recette>` only for the taster (owner,
 * 4 November 2026). `quotidien`: the daily missions succeeded three days in a row (see `recordDailyStreak`).
 */
export type EvolutionChallenge = 'voyage' | 'soin' | 'piquenique' | 'parent' | 'quotidien' | `commis:${ChallengeRecipe}` | `gouteur:${ChallengeRecipe}` | 'corde:10' | 'corde:20';
/** The owner's distribution (4 November 2026): one challenge for a Common, two for a Rare, three for an Epic or a Legendary. */
export const EVOLUTION_CHALLENGES: Readonly<Partial<Record<SpeciesId, readonly EvolutionChallenge[]>>> = {
  paille: ['voyage'], neige: ['soin'], feu: ['commis:chicken'], 'belier-gris': ['piquenique'], volant: ['quotidien'],
  frisket: ['piquenique', 'soin'], icy: ['soin', 'gouteur:moelleux'], ardent: ['commis:chicken', 'voyage'], snk: ['voyage', 'quotidien'],
  'pic-pic': ['voyage', 'piquenique'], amethyste: ['soin', 'parent'], 'princesse-neige': ['soin', 'gouteur:avocado-toast'], fluffy: ['piquenique', 'parent'],
  virvoletant: ['voyage', 'gouteur:chicken'], phoenix: ['voyage', 'commis:chicken'], roukette: ['corde:20', 'voyage'], 'wat-wat': ['piquenique', 'voyage'],
  glassofeu: ['commis:avocado-toast', 'soin'], plume: ['voyage', 'piquenique'], boudinet: ['commis:moelleux', 'gouteur:chicken'], bouee: ['voyage', 'piquenique'],
  egiiipte: ['voyage', 'voyage'], piment: ['gouteur:chicken', 'piquenique'], tunini: ['voyage', 'soin'], bretonette: ['commis:moelleux', 'voyage'],
  dadi: ['voyage', 'corde:20', 'soin'], maxou: ['voyage', 'quotidien', 'parent'], orange: ['soin', 'gouteur:moelleux', 'piquenique'],
  dinono: ['parent', 'piquenique', 'corde:10'], dinenette: ['parent', 'soin', 'commis:moelleux'], calinou: ['soin', 'piquenique', 'quotidien'],
  magicien: ['commis:avocado-toast', 'voyage', 'soin'], dragon: ['commis:chicken', 'voyage', 'corde:20'], requin: ['voyage', 'corde:20', 'piquenique'],
  ankylosaure: ['parent', 'corde:20', 'quotidien'],
};
export const EVOLUTION_CHALLENGE_IDS = [...new Set(Object.values(EVOLUTION_CHALLENGES).flatMap(challenges => challenges ?? []))] as readonly EvolutionChallenge[];
/** How many daily cycles in a row must end with the cycle bonus claimed for the `quotidien` challenge. */
export const DAILY_STREAK_TARGET = 3;

export const evolutionChallengeTarget = (species: SpeciesId, challenge: EvolutionChallenge): number =>
  Math.max(1, EVOLUTION_CHALLENGES[species]?.filter(item => item === challenge).length ?? 0);
/** The recipe as the sheet names it. */
export const CHALLENGE_RECIPE_NAMES: Readonly<Record<ChallengeRecipe, string>> = {chicken: 'le poulet', moelleux: 'le moelleux', 'avocado-toast': 'l’avocado toast'};
export const evolutionChallengeLabel = (challenge: EvolutionChallenge): string => {
  if (challenge === 'voyage') return 'voyages';
  if (challenge === 'soin') return 'soins';
  if (challenge === 'piquenique') return 'pique-niques';
  if (challenge === 'parent') return 'Devenir parent d’un lapereau';
  if (challenge === 'quotidien') return `Réussir les missions du jour ${DAILY_STREAK_TARGET} jours de suite`;
  if (challenge.startsWith('commis:')) return `Commis : cuisiner ${CHALLENGE_RECIPE_NAMES[challenge.slice('commis:'.length) as ChallengeRecipe]}`;
  if (challenge.startsWith('gouteur:')) return `Goûteur : goûter ${CHALLENGE_RECIPE_NAMES[challenge.slice('gouteur:'.length) as ChallengeRecipe]}`;
  if (challenge.startsWith('corde:')) return `sauts à la corde (minimum ${challenge.slice('corde:'.length)})`;
  return challenge;
};
export function evolutionChallengesComplete(species: SpeciesId, progress: Readonly<{[challenge: string]: number | undefined}> = {}): boolean {
  const challenges = EVOLUTION_CHALLENGES[species];
  return !!challenges?.length && [...new Set(challenges)].every(challenge => (progress[challenge] ?? 0) >= evolutionChallengeTarget(species, challenge));
}
export function expectedEvolutionChallengeCount(rarity: Rarity): number | null {
  return rarity === 'common' ? 1 : rarity === 'rare' ? 2 : rarity === 'epic' || rarity === 'legendary' ? 3 : null;
}
