/**
 * The Christmas event's rules (owner, 4 November 2026), on while `CHRISTMAS_EVENT.active` (src/config/christmas.ts) is true:
 * the « défis de Noël » paid in « sucres d'orge » (code name `candies`), the snowman, the mini-game « Les cadeaux du ciel » and
 * the Christmas market (its decorations are in src/config/decorations.ts, `CHRISTMAS_DECORATION_IDS`). The sucres d'orge are
 * earned only through these challenges and their bonus; they are never bought and never come from anything else. None of this
 * gives XP: the level pacing does not change.
 */
export const CHRISTMAS_CHALLENGE_IDS = ['snowman', 'sky-gifts', 'catch-gifts', 'feed', 'collect', 'harvest', 'pet', 'breed'] as const;
export type ChristmasChallengeId = typeof CHRISTMAS_CHALLENGE_IDS[number];
/**
 * What makes a challenge progress: the same event names and amounts as the daily missions for the existing actions (a meal, a
 * breeding, the pattes of a habitat, the food of a farm, a new rabbit caressed), and the event's own ones.
 */
export type ChristmasEventName = 'buildSnowman' | 'rewardSkyGifts' | 'catchGifts' | 'feed' | 'collectIncome' | 'collectOrder' | 'petRabbit' | 'breed';
export interface ChristmasChallenge {
  title: string; description: string; event: ChristmasEventName; target: number;
  /** Sucres d'orge won when it is claimed. */
  candies: number;
  /** The two « activity » challenges (the snowman, the mini-game): exactly one of them is among the three of each cycle. */
  activity: boolean;
}
export const CHRISTMAS_CHALLENGES: Record<ChristmasChallengeId, ChristmasChallenge> = {
  'snowman': {title: 'Un bonhomme de neige', description: 'Construis un bonhomme de neige dans un enclos.', event: 'buildSnowman', target: 1, candies: 6, activity: true},
  'sky-gifts': {title: 'Les cadeaux du ciel', description: 'Joue une partie des cadeaux du ciel.', event: 'rewardSkyGifts', target: 1, candies: 6, activity: true},
  'catch-gifts': {title: 'Une hotte bien pleine', description: 'Attrape 25 cadeaux en tout aux cadeaux du ciel.', event: 'catchGifts', target: 25, candies: 8, activity: false},
  'feed': {title: 'Un goûter d’hiver', description: 'Nourris un lapin trois fois.', event: 'feed', target: 3, candies: 4, activity: false},
  'collect': {title: 'Récolte au chaud', description: 'Récolte 150 pattes dans les habitats.', event: 'collectIncome', target: 150, candies: 4, activity: false},
  'harvest': {title: 'Provisions d’hiver', description: 'Récolte 40 nourriture dans les fermes.', event: 'collectOrder', target: 40, candies: 4, activity: false},
  'pet': {title: 'Des câlins au chaud', description: 'Caresse 2 lapins différents : frotte doucement leur portrait dans leur fiche.', event: 'petRabbit', target: 2, candies: 4, activity: false},
  'breed': {title: 'Une famille qui grandit', description: 'Lance une reproduction au nid.', event: 'breed', target: 1, candies: 5, activity: false},
};
/** How many Christmas challenges each daily cycle shows (one activity among them). */
export const CHRISTMAS_PICK_COUNT = 3;
/** Sucres d'orge of the cycle bonus, once the three challenges are claimed. */
export const CHRISTMAS_BONUS_CANDIES = 10;
/** A generous bound on the balance, so a save can never overflow. */
export const MAX_CANDIES = 1_000_000;
/** The snowman: free, one a day in all, in an enclosure with at least one rabbit present, from player level 2. */
export const SNOWMAN = {unlockLevel: 2} as const;
/**
 * « Les cadeaux du ciel »: a game lasts `gameMs` with `lives` lives; the first `rewardedGamesPerCycle` games of a daily cycle pay
 * `pattesPerGift` pattes per gift caught, at most `maxPattes` (the jump rope's scale), and never XP. `caught` is at most `maxCaught`.
 */
export const SKY_GIFTS = {rewardedGamesPerCycle: 3, pattesPerGift: 2, maxPattes: 60, maxCaught: 200, gameMs: 45_000, lives: 3} as const;

/** The Christmas rabbits (Yetiti, Rennes, Susucre) may also be bought at the market, for sucres d'orge: a dear shortcut, since
  * breeding them during the event is the way (owner, 5 November 2026). About nine days of challenges and bonuses. */
export const CHRISTMAS_RABBIT_CANDY_PRICE = 250;
