import type {SpeciesId} from './species';

/**
 * The owner's descriptions of each rabbit (« Tous les lapins et les descriptions », 5 November 2026), shown only on a rabbit's
 * sheet. Spelling corrected and the player addressed with « tu », the jokes kept as written. Tunini's stays in Arabic, with no
 * translation (owner's decision). A species without an entry shows no description: the owner writes the missing ones himself.
 */
export const RABBIT_STORIES: Partial<Record<SpeciesId, string>> = {
  feu: 'Ffff… Flo ?!! Flouuu !!! Floufff !?!? FLOUUUUFFFF !!! C’est une véritable invasion ! J’ai fait un rêve brûlant avec des floufs partout, je crois que je suis en train de perdre la tête…',
  volant: 'SCANDALE ! Lors de sa découverte, les chercheurs se sont rendu compte que le lapin volant est un descendant direct des dinosaures ! Bien plus que les cosplayeurs Dinono et Dinenette… Il est l’un des lapins préférés de celle qui veille sur ces lieux.',
  paille: 'On raconte que le cœur blanc sur son pelage est une représentation de sa vitalité ! Le lapin paille est le premier habitant de cette île. Son apparition ici est mystérieuse…',
  'belier-gris': 'Son poil est dur, il vaut mieux le caresser dans le sens du poil. On dit que le lapin métal est froid, mais il est l’un des lapins les plus tendres.',
  neige: 'Les lapins neige sont des descendants des lapins Hotot. On raconte qu’ils ont vécu si longtemps avec la neige qu’ils ont fusionné avec elle. C’est comme Bouleto et les boulettes !',
  icy: 'Ne te fie pas à ses oreilles… C’est bel et bien un lapin bélier ! Icy est une amoureuse de l’amour. Elle est toujours très classe. Elle est secrètement fan de Dadi.',
  roukette: 'Malgré son air malicieux, Roukette est le lapin avec le plus de flow de la prairie. Il fait des concerts. Ne le lance pas sur MPC de Luv Resval : tu vas prendre le tunnel de ta vie !',
  snk: 'SASAGEYO SASAGEYO !!!! La maîtresse de ces lieux est secrètement amoureuse d’Eren. SNK a eu une cicatrice en sauvant Icy des griffes d’un lapin titan.',
  virvoletant: 'Il rêve de devenir un cowboy, mais pour l’instant c’est une grosse victime ! Il est amoureux de Pic Pic et il est fan de Saitama.',
  frisket: 'Elle a grandi dans le froid, elle est toujours souriante et volontaire. Elle est fan de Noël. Elle n’a jamais passé un mois de décembre sans au moins 3 calendriers de l’Avent !',
  'princesse-neige': 'Elle est tombée love d’un voyou. Il faut le LIBÉRER, DÉLIVRER !! C’est une princesse forte et indépendante. Elle est fan de Choco Brauwn depuis Nouvelle École.',
  'wat-wat': 'Son flow est légendaire, Wat Wat est too smoooooth for this world on god. Elle côtoie les plus grands. On dit même qu’elle est amie avec le lapin requin.',
  tunini: 'تونيني يهودي تونسي. وُلد في طنجة ويعيش الآن في فرنسا حيث أصبح من كبار المتخصصين في جين أوستن.',
  bretonette: 'Née mystérieusement dans la forêt de Brocéliande, Bretonette a trois queues. Un ami lui a fait découvrir Jane Austen et depuis, elle attend son prince charmant.',
  boudinet: 'Son CV est des plus impressionnants. Après un court séjour à Lille et à Paris, il est devenu le bras droit de Cédric Bourlet. C’est un spécialiste des pains aux bisous et des moelleux aux câlins. C’est le frère d’Egiiipte.',
  fluffy: 'Douce, belle, attentionnée : voilà comment ses amis la décrivent. Elle est secrètement amoureuse de Bouleta Zebiiiiiiii !!!!',
  amethyste: 'Love love love. L’améthyste est la pierre de l’amour. Sa boucle d’oreille scelle et symbolise cet amour.',
  ardent: 'Un design étonnant, un cœur brûlant de passion, des flammes aussi chaudes que le soleil : telle est la vie que mène le lapin ardent ! ARDENT ARDENT',
  glassofeu: 'Glasso Glasso Glassofeu !!! Gla gla gla ! Feu Feu Feu ! (Il est complètement fou : la moitié de son cerveau est congelée, l’autre est cramée.)',
  dinono: 'Agressif, provocateur, dans tous les coups fourrés, un seul nom revient : DINONO !!! Il saute au cou de ses proies pour des attaques de bisous !',
  phoenix: 'Il est condamné à être majestueux, mais il veut juste être émo. Il est secrètement amoureux de Roukette. Il déteste les fontaines depuis qu’on l’a comparé à un corbeau.',
  plume: 'Attention au coup de vent ! Ses oreilles sont semblables à des épis de blé, elle adore le risotto et Animal Crossing !',
  'pic-pic': 'Elle a de grands pouvoirs, des capacités télépathiques hors normes. Mais son QI n’a jamais dépassé 70. Elle se pète dessus régulièrement.',
  egiiipte: 'C’est un grand voyageur. C’est le frère de Boudinet. Il est vaillant et habile. En été, il adore aller au Lavandou pour parfaire son bronzage caramel.',
  piment: 'Un tempérament calme mais un humour très piquant. Elle n’a jamais perdu un Rap Contenders.',
  maxou: 'Maxou est tout-terrain. Sa queue puissante lui permet de se propulser haut dans le ciel. C’est un cousin très éloigné du célèbre Max.',
  dadi: 'A-t-on besoin de le présenter ?? C’est Dadi, on t’a dit ! Star internationale.',
  magicien: 'Abracadabra, j’ai mangé ton caca !',
  orange: 'Elle a toujours de la co partout où elle va. Fan de Monet et de monnaie, c’est une vraie baddie.',
  requin: 'Ami avec Poséidon et Wat Wat, son drip est toujours parfait. Ses pouvoirs sont mystiques et son flow est diabolique.',
  dragon: 'Elle cache un trésor immense. Son comportement est sage et brûlant. Elle ne se laisse jamais faire.',
  benny: 'Un lapin joueur, doux et aimant. Benny est un vent de fraîcheur sur cette île. Elle est capable de voler !',
  dinenette: 'Le cœur au bout de sa queue est source de vitalité. Elle est indépendante, c’est une chasseuse hors pair !',
  ankylosaure: 'Fan d’ankylosaures et de glaces Häagen-Dazs. Ses pouvoirs sont immenses. Il est capable de faire trembler le sol.',
  calinou: 'Experte en câlins et en réconfort. Elle est capable de transformer sa fourrure en barbe à papa !',
};
