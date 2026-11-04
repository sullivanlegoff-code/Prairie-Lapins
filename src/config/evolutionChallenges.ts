import type {SpeciesId} from './species';
import type {Rarity} from './rarities';

export type EvolutionChallenge = 'voyage' | 'soin' | 'piquenique' | 'parent' | 'cuisine:chicken' | 'cuisine:moelleux' | 'cuisine:avocado-toast' | 'corde:10' | 'corde:20';
export const EVOLUTION_CHALLENGES: Readonly<Partial<Record<SpeciesId, readonly EvolutionChallenge[]>>> = {
  paille: ['voyage'], neige: ['soin'], feu: ['cuisine:chicken'], 'belier-gris': ['piquenique'], volant: ['voyage'],
  frisket: ['piquenique', 'soin'], icy: ['soin', 'cuisine:moelleux'], ardent: ['cuisine:chicken', 'voyage'], snk: ['voyage', 'voyage'],
  'pic-pic': ['voyage', 'piquenique'], amethyste: ['soin', 'parent'], 'princesse-neige': ['soin', 'piquenique'], fluffy: ['piquenique', 'parent'],
  virvoletant: ['voyage', 'voyage'], phoenix: ['voyage', 'cuisine:chicken'], roukette: ['corde:20', 'voyage'], 'wat-wat': ['piquenique', 'voyage'],
  glassofeu: ['cuisine:avocado-toast', 'soin'], plume: ['voyage', 'piquenique'], boudinet: ['cuisine:moelleux', 'cuisine:chicken'], bouee: ['voyage', 'piquenique'],
  egiiipte: ['voyage', 'voyage'], piment: ['cuisine:chicken', 'piquenique'], tunini: ['voyage', 'soin'], bretonette: ['cuisine:moelleux', 'voyage'],
  dadi: ['voyage', 'corde:20', 'soin'], maxou: ['voyage', 'piquenique', 'parent'], orange: ['soin', 'cuisine:moelleux', 'piquenique'],
  dinono: ['parent', 'piquenique', 'corde:10'], dinenette: ['parent', 'soin', 'cuisine:moelleux'], calinou: ['soin', 'piquenique', 'parent'],
  magicien: ['cuisine:avocado-toast', 'voyage', 'soin'], dragon: ['cuisine:chicken', 'voyage', 'corde:20'], requin: ['voyage', 'corde:20', 'piquenique'],
  ankylosaure: ['parent', 'corde:20', 'soin'],
};
export const EVOLUTION_CHALLENGE_IDS = [...new Set(Object.values(EVOLUTION_CHALLENGES).flatMap(challenges => challenges ?? []))] as readonly EvolutionChallenge[];

export const evolutionChallengeTarget = (species: SpeciesId, challenge: EvolutionChallenge): number =>
  Math.max(1, EVOLUTION_CHALLENGES[species]?.filter(item => item === challenge).length ?? 0);
export const evolutionChallengeLabel = (challenge: EvolutionChallenge): string => {
  if (challenge === 'voyage') return 'voyages';
  if (challenge === 'soin') return 'soins';
  if (challenge === 'piquenique') return 'pique-niques';
  if (challenge === 'parent') return 'lapereaux comme parent';
  if (challenge.startsWith('cuisine:')) return `recette ${challenge.slice('cuisine:'.length)}`;
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
