# Idées du propriétaire : dépenser les pièces et affection jusqu'à 50

Demandes du propriétaire du 2 novembre 2026. **Rien n'est encore dans le jeu** : il a demandé de garder ces idées sans les intégrer pour l'instant. Elles iront dans la même version que la nouvelle réception des lapereaux (branche `feature/reception-lapereaux`), qui ne sera fusionnée et publiée que sur sa demande.

Le point de départ : les joueurs ne dépensent pas assez de pièces. Aujourd'hui, presque toutes les dépenses sont uniques (habitats, fermes, extensions, lapins de la boutique), alors que les revenus des lapins grandissent chaque jour.

## 1. Salon de soins (nouveau bâtiment)

- On y confie un lapin pour un soin (bain, brossage, massage) pendant 1 à 3 h. Il revient avec un peu d'affection et d'XP.
- Chaque soin coûte des pièces, plus cher selon la rareté du lapin. C'est une dépense qu'on relance à chaque session (matin, midi, soir).
- À préciser : le prix, la durée, le gain d'affection, le niveau de déblocage et le nombre de lapins soignés à la fois.

## 2. Pique-nique

- Une fois par jour, on paie des pièces pour organiser un pique-nique dans un enclos. Tous ses lapins gagnent un peu d'affection, et on voit une petite animation.
- À préciser : le prix (fixe ou selon le nombre de lapins), le gain, et s'il y a un pique-nique par jour au total ou un par enclos.

## 3. L'île plus chère à agrandir

- Prix actuels des 8 extensions (`EXTENSION_PRICES`, `src/config/land.ts`) : 600, 1 800, 4 500, 9 000, 16 000, 26 000, 40 000, 60 000.
- Décision du propriétaire : **la dernière coûte 100 000 et l'avant-dernière 75 000.**
- Nouveaux prix, validés par le propriétaire le 2 novembre 2026 : **600, 2 000, 6 000, 12 000, 25 000, 45 000, 75 000, 100 000.**
- Les extensions déjà achetées ne sont pas refacturées.

## 4. Affection jusqu'à 50

- Aujourd'hui : affection maximale 20, et l'affection 15 et plus demande la Statue de l'Affection (niveau de joueur 15, 60 cœurs).
- Décision du propriétaire : **les lapins peuvent monter jusqu'à l'affection 50.**
- **Pour dépasser l'affection 30, il faut les deux statues de l'affection.** On doit donc pouvoir acheter une deuxième statue (aujourd'hui le maximum est 1).
- À préciser :
  - le coût en nourriture de chaque palier de 20 à 50 (`FEED_COSTS`, `src/config/balance.ts`) ;
  - le prix et le niveau de joueur de la deuxième statue ;
  - si elle a le même dessin que la première ;
  - l'effet sur les revenus des lapins, qui augmentent avec l'affection.
- Il faudra relancer `node docs/progression-simulation.mjs` : l'affection touche les revenus et les chances de naissance.

## 5. Ce que l'affection 30 et l'affection 50 apportent

- **Affection 30** :
  - les chances de croisement sont encore meilleures. Aujourd'hui, les chances d'Épique, de Légendaire ou du Mythique sont multipliées par 1,5 quand les deux parents ont l'affection 10, et par 2 à l'affection 15. Il faut un nouveau palier à 30 ; la valeur est à choisir par le propriétaire ;
  - **le dessin du lapin évolue.** Avec 36 espèces (5 communes, 20 rares, 7 épiques, 3 légendaires et Benny), cela fait 36 nouveaux dessins. On procède comme d'habitude : planches de concepts peints, choix du propriétaire, puis intégration.
- **Affection 50** :
  - le lapin devient un **lapin ultime** ;
  - on peut **mettre une couronne sur sa tête** (une option qu'on active ou non).
  - À préciser : ce que change concrètement « lapin ultime » (un titre, un badge, des revenus, autre chose), et si la couronne est la même pour tous ou propre à chaque type.

### Précisions du propriétaire (2 novembre 2026)

- **Lapin ultime (affection 50)** : on peut lui mettre une couronne sur la tête, et **sa fiche est adaptée** à son statut de lapin ultime (une fiche spéciale quand on l'ouvre).
- **Chances de croisement, sur 5 paliers.** Les deux parents doivent atteindre l'affection du palier, et c'est le plus haut palier atteint qui compte.

  | Palier | Affection des deux parents | Multiplicateur actuel | Multiplicateur voulu |
  |---|---|---|---|
  | 1 | moins de 10 | ×1 | ×1 |
  | 2 | 10 | ×1,5 | **×1,15** |
  | 3 | 15 | ×2 | **×1,3** |
  | 4 | 30 | n'existe pas | **×1,5** |
  | 5 | 50 | n'existe pas | **×2** |

  Baisse des paliers 2 et 3 validée par le propriétaire le 2 novembre 2026 : **×1,15 à l'affection 10 et ×1,3 à l'affection 15.** Attention : cette baisse touche aussi les parties en cours. Les Épiques, Légendaires et Benny seront plus durs à obtenir tant que les lapins n'auront pas atteint l'affection 30.
- **Nouveau dessin à l'affection 30, pour chaque lapin**, donc les 36 espèces.
- **Nouveau bâtiment** qui permet de remettre un lapin à son ancien dessin, même s'il a dépassé l'affection 30. Ce choix est propre à chaque lapin, et on peut sans doute revenir au nouveau dessin. Le prix et les autres règles sont à préciser.

## 6. Fermes niveau 3 et nourritures fantaisie

- Aujourd'hui : fermes niveau 1 et 2, 10 cultures, un seul stock de nourriture.
- Décision du propriétaire : **une ferme peut passer au niveau 3**, ce qui donne accès à des **nourritures fantaisie**. Elles fonctionnent comme les autres : coût, durée, rendement, et elles vont dans le même stock de nourriture.
- À préciser :
  - le prix de l'amélioration (pièces ou cœurs) ;
  - les noms et les dessins des nourritures fantaisie ;
  - leur nombre, leur durée, leur rendement et leur niveau de déblocage.

## Réponses du propriétaire aux questions (2 novembre 2026)

Ces réponses remplacent les « À préciser » des sections ci-dessus.

- **Salon de soins** :
  - un soin (bain, brossage, massage) dure de 1 à 3 h, pour un lapin à la fois ;
  - le lapin revient avec **+1 d'affection** et un peu d'XP ;
  - on paie en pièces, plus cher pour un lapin plus rare ;
  - le salon s'ouvre au **niveau de joueur 12** (bâtiment à 5 000 pièces).
- **Pique-nique** :
  - **un par jour au total**, dans l'enclos de ton choix ;
  - **+1 d'affection** à tous les lapins de l'enclos ;
  - le prix dépend du nombre de lapins ;
  - il s'ouvre au **niveau de joueur 8**.
- **Deuxième Statue de l'Affection** : **150 cœurs, à partir du niveau de joueur 25.**
- **Ferme niveau 3** : **60 000 pièces par ferme, à partir du niveau de joueur 20.**
- **Nourritures fantaisie** (ferme niveau 3) :
  - **trèfle doré, carotte arc-en-ciel, fraise étoilée, pomme d'amour** ;
  - de plus en plus longues (10 à 16 h) et de plus en plus nourrissantes, au-dessus de la banane ;
  - elles vont dans le même stock de nourriture que les autres.
- **Bâtiment de l'ancien dessin** :
  - on l'achète une fois (proposition : 10 000 pièces, niveau 20) ;
  - ensuite, on choisit **librement et gratuitement** le dessin de chaque lapin de plus de 30 d'affection, dans les deux sens.
- **Couronne des lapins ultimes** : **une seule couronne dorée**, la même pour tous.
- **Rythme de l'affection** : un lapin soigné régulièrement (3 sessions par jour) passe de **l'affection 20 à 50 en environ 30 jours**. Les coûts en nourriture de 20 à 50 seront calculés pour ça, avec un mur à 29 → 30 comme à 14 → 15, puis vérifiés par simulation.

Valeurs encore à fixer par le coordinateur, puis à vérifier par simulation et à montrer au propriétaire avant de coder :
- le prix d'un soin selon la rareté ;
- le prix du pique-nique par lapin ;
- la durée et le rendement exacts des nourritures fantaisie ;
- le tableau des coûts d'affection de 20 à 50.

## Valeurs choisies par le coordinateur (2 novembre 2026)

Le propriétaire a laissé le choix des valeurs au coordinateur (« je te laisse liberté pour les choix »).

**Mesure de départ** (copie instrumentée de `docs/progression-simulation.mjs`, mêmes réglages) :
- revenus encaissés : environ 9 000 pièces par jour au jour 10, 11 000 au jour 20, 15 000 au jour 40 ;
- nourriture : environ 3 900 par jour avec deux fermes ;
- surplus : 6 000 à 13 000 pièces par jour partent au comptoir de Paille (échange contre des cœurs), faute d'autre dépense.

Les nouvelles dépenses visent à absorber une bonne partie de ce surplus.

### Île
600, 2 000, 6 000, 12 000, 25 000, 45 000, 75 000, 100 000 (`EXTENSION_PRICES`).

### Affection jusqu'à 50
- Coût en nourriture de chaque palier (`FEED_COSTS[a]` = passer de a à a + 1), de 20 → 21 à 49 → 50 :
  - de 20 → 21 à 28 → 29 : 900, 1 000, 1 100, 1 200, 1 300, 1 400, 1 500, 1 600, 1 700 ;
  - **29 → 30 : 6 000** (un mur, comme 14 → 15) ;
  - de 30 → 31 à 48 → 49 : 1 900, puis +100 à chaque palier, jusqu'à 3 700 ;
  - **49 → 50 : 10 000** (un mur).
- Total de 20 à 50 : environ 81 000 de nourriture.
- Statues :
  - l'affection 15 et plus demande toujours une statue ;
  - **passer de 30 à 31 et au-delà demande deux statues** ;
  - la deuxième statue coûte **150 cœurs, au niveau 25** ;
  - elle reprend le dessin de la première (décision du coordinateur, qu'on pourra changer).
- Les revenus continuent de grandir avec l'affection, avec la même pente qu'aujourd'hui. Le stockage des habitats limite déjà ce qu'on encaisse à chaque session.
- **Chances de croisement** : ×1,15 si les deux parents ont l'affection 10, ×1,3 à 15, ×1,5 à 30, ×2 à 50.

### Soins et pique-nique
Ces deux règles servent à tenir l'objectif de 30 jours pour passer de 20 à 50 :
- **Un seul cadeau d'affection par lapin et par jour** : un soin ou un pique-nique, pas les deux.
- **Les cadeaux ne franchissent jamais un mur** (14 → 15, 29 → 30, 49 → 50) et respectent les statues. Ces paliers se gagnent en nourrissant.

**Salon de soins**
- 5 000 pièces, à partir du niveau 12, un seul salon ;
- un lapin à la fois, avec trois soins au choix :
  - **bain** : 1 h, prix plein, 10 XP ;
  - **brossage** : 2 h, 75 % du prix, 20 XP ;
  - **massage** : 3 h, 50 % du prix, 30 XP ;
- chaque soin donne **+1 d'affection** au retour ;
- prix plein selon la rareté : commun 300, rare 800, épique 2 000, légendaire 3 500, mythique 5 000 pièces.

**Pique-nique**
- à partir du niveau 8, **un par jour** (même cycle que les missions quotidiennes), dans l'enclos de ton choix ;
- **300 pièces par lapin** de l'enclos, et 5 XP par lapin ;
- **+1 d'affection** à chaque lapin qui n'a pas encore reçu de cadeau ce jour-là.

### Ferme niveau 3 et nourritures fantaisie
- 60 000 pièces par ferme, à partir du niveau 20. Les cultures restent 20 % plus courtes, comme au niveau 2.
- Nourritures fantaisie, réservées à une ferme de niveau 3 :

  | Nourriture | Niveau | Prix | Durée | Nourriture obtenue |
  |---|---|---|---|---|
  | Trèfle doré | 20 | 600 | 10 h | 1 400 |
  | Carotte arc-en-ciel | 22 | 800 | 12 h | 1 800 |
  | Fraise étoilée | 24 | 1 000 | 14 h | 2 200 |
  | Pomme d'amour | 26 | 1 200 | 16 h | 2 700 |

  Pour comparer, la banane coûte 450 et donne 1 000 de nourriture en 10 h.

### Bâtiment de l'ancien dessin
10 000 pièces, à partir du niveau 20. Il ne sert qu'une fois les nouveaux dessins de l'affection 30 faits.

### Dessins choisis par le propriétaire (2 novembre 2026)
Les planches ont été faites dans ChatGPT, dans la conversation « Créer une planche de concepts ».
- **Salon de soins** : concept **A**, petit spa cosy avec une baignoire en bois et des bulles de savon.
- **Pique-nique** : concept **A**, nappe à carreaux rouges et blancs, panier en osier, carottes, pommes et théière.
- **Nourritures fantaisie** : série **A**, magiques et scintillantes, avec de petites étoiles et des reflets.
- **Lapin ultime** : couronne **A**, petite couronne dorée à pointes et perles, posée entre les oreilles. Fiche **1**, cadre doré avec lauriers et rubans pourpres.

### Ordre de travail
1. **Sans nouveau dessin** : prix de l'île, affection jusqu'à 50, deuxième statue, chances de croisement, sauvegarde v23, simulation.
2. Ferme niveau 3 et nourritures fantaisie (concepts peints d'abord).
3. Salon de soins et pique-nique (concepts peints d'abord).
4. Lapin ultime : couronne dorée et fiche spéciale (concepts peints d'abord).
5. Nouveaux dessins à l'affection 30 (36 espèces) et bâtiment de l'ancien dessin.

Ces valeurs seront vérifiées par la simulation à chaque étape, et ajustées si le rythme dérape.

## Points de vigilance

- Règle permanente du propriétaire : ne rien inventer sur les Épiques, les Légendaires ou le Mythique. Toutes les valeurs du palier 30 et le sens de « lapin ultime » lui reviennent.
- Le format de sauvegarde changera (deuxième statue, affection au-delà de 20, ferme niveau 3, état des soins et des pique-niques) : il faudra une migration depuis v22.
- Tout le travail visuel (salon, pique-nique, deuxième statue, nourritures fantaisie, évolutions à 30, couronne) passe d'abord par des planches de concepts peints.
