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
- Proposition pour les autres, à valider : 600, 2 000, 6 000, 12 000, 25 000, 45 000, 75 000, 100 000.
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

## 6. Fermes niveau 3 et nourritures fantaisie

- Aujourd'hui : fermes niveau 1 et 2, 10 cultures, un seul stock de nourriture.
- Décision du propriétaire : **une ferme peut passer au niveau 3**, ce qui donne accès à des **nourritures fantaisie**. Elles fonctionnent comme les autres : coût, durée, rendement, et elles vont dans le même stock de nourriture.
- À préciser :
  - le prix de l'amélioration (pièces ou cœurs) ;
  - les noms et les dessins des nourritures fantaisie ;
  - leur nombre, leur durée, leur rendement et leur niveau de déblocage.

## Points de vigilance

- Règle permanente du propriétaire : ne rien inventer sur les Épiques, les Légendaires ou le Mythique. Toutes les valeurs du palier 30 et le sens de « lapin ultime » lui reviennent.
- Le format de sauvegarde changera (deuxième statue, affection au-delà de 20, ferme niveau 3, état des soins et des pique-niques) : il faudra une migration depuis v22.
- Tout le travail visuel (salon, pique-nique, deuxième statue, nourritures fantaisie, évolutions à 30, couronne) passe d'abord par des planches de concepts peints.
