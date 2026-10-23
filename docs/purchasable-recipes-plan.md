# Recettes achetables — spécification

Branche `feature/purchasable-recipes`, depuis production `f45720e`. Rien n'est publié.

## Décisions validées par le joueur

Prix du tableau ci-dessous ; types visibles avant achat ; seuils d'affection par rareté publics, espèces hors garantie non nommées ; collection inchangée ; Brumelin offert à toutes les parties ; sauvegarde v10 avec migration ; aucune XP à l'achat.

## Étape 1 — données et règles (réalisée, sans changement d'interface)

- `src/config/recipes.ts` : prix et recette offerte (Brumelin). `src/simulation/recipes.ts` : `recipeKnown`, `recipePrice`, `recipePurchaseReason`.
- État v10 : champ `recipeBook` (sans doublon, espèces à recette uniquement). Nouvelle partie et migration v9/v8/anciennes → `['brumelin']`. Sauvegarde brute v9 conservée sous `prairie-lapins.backup.before-v10` avant l'écriture v10.
- Commande `buyRecipe` : refus `INVALID_CHOICE` (commun, offerte, inconnue), `RECIPE_KNOWN` (achetée ou découverte), `LEVEL_REQUIRED` (niveau de l'espèce), `NOT_ENOUGH_PATTES` ; exclue des compléments en cœurs ; aucune XP, mission ni tirage. Contrôleur : enregistrement avant adoption (échec d'écriture = ni paiement ni propriété).
- Tirage inchangé, vérifié pour toutes les paires, affections 2/4/6/10, garantie active ou non.
- Contrôles navigateur, vérification publique et libellé de version passés de v9 à v10. Un client v9 publié ne peut pas relire un export v10.
- `npm run build:pages` échoue sous Windows (appel de `npm` sans `.cmd`, antérieur à ce chantier) ; ses étapes passent une à une. Non corrigé.

## Étape 2 — confidentialité de l'affichage (réalisée, tirage inchangé)

- `oddsView` (`src/ui/models.ts`) : lignes exactes pour les recettes connues ; les autres sont additionnées en poids entiers puis formatées une seule fois par `probabilityLabel` (« Résultats inconnus : X »). Exclusions par niveau nommées si connues, sinon « Certains résultats demandent un niveau supérieur · exclus du tirage actuel. ». `possible` remplace le test « au moins une ligne » pour autoriser le lancement.
- `oddsTexts` : tous les textes du nid, construits hors DOM et testés sur toutes les paires.
- Textes fixes : parents du Dragon retirés du nid ; garantie formulée avec « espèces non découvertes », sans nommer Géant, Magicien ni Dragon ; seuils 4 / 6 / 10 conservés.
- Carnet : nom, types, rareté, niveau et prix (icône de pièce) pour une recette inconnue ; conditions, paires compatibles et « Préparer cette paire au nid » seulement si connue. Portrait révélé seulement après découverte. Collection inchangée.
## Étape 3 — achat (réalisée)

- Le carnet de la Collection et l'onglet Recettes de la boutique sont le même rendu (`renderRecipes`) ; la boutique est en consultation (sans « Préparer cette paire au nid » ni « Voir le parent »). Bouton `Acheter · N [pièce]` sur une recette inconnue dont le niveau est atteint, dans les deux contextes, par le même circuit.
- Confirmation : même dialogue que les autres achats directs depuis une carte (décoration pour l'inventaire, extension, amélioration). Solde insuffisant : bouton désactivé, « Solde insuffisant. ». Niveau non atteint : pas de bouton, niveau mentionné une seule fois.
- Aucun complément en cœurs : liste partagée `HEART_COMPLEMENT_COMMANDS` pour `payWithHearts` et `quoteComplement`.
- Annonce de niveau : `Recette en boutique · 1` / `Recettes en boutique · N`, recettes inconnues et vendues seulement.
- Laboratoire : scénario « Recettes — achats au niveau 14 », outil « Réinitialiser les recettes achetées » (sans remboursement).

## État actuel constaté (code de production)

- Le « carnet de reproduction » (`renderRecipes`, `recipeBook` dans `src/ui/models.ts`) liste les dix espèces à recette (`RECIPE_SPECIES`) et montre **gratuitement** : affection minimale, parents imposés (Dragon), probabilité fixe (Géant, Magicien, Dragon), paires possédées compatibles et leur probabilité, ainsi que le raccourci « Préparer cette paire au nid ». Une espèce non découverte apparaît comme « Espèce à découvrir », avec ses types et sa rareté.
- Le panneau du nid (`oddsView`) détaille chaque résultat avec son pourcentage. Une espèce non découverte devient « Espèce inconnue », mais ses types, sa rareté et sa probabilité restent affichés. Les résultats exclus par le niveau sont **nommés** (« Géant : Niveau 7 requis · exclu du tirage actuel »).
- Textes fixes qui divulguent des conditions : au nid, « Dragon : 10 … avec Perroquet et Feu obligatoires » (`GameUI.ts` ~l. 747) ; dans le carnet, « Géant, Magicien et Dragon en sont exclus » de la garantie (~l. 823).
- L'onglet boutique « Recettes » ouvre ce même carnet en lecture seule. **Aucun achat de recette n'existe.**
- Le mot `recipe` désigne déjà les commandes de ferme (`order.recipe`, `startOrder.recipe`). Le nouveau champ devra avoir un autre nom.
- Les achats en cœurs passent par une liste blanche (`actions.ts` l. 34) : une nouvelle commande en est exclue par défaut.

## Règles

1. **Recette connue** = espèce découverte (`discovered`) **ou** recette possédée (`recipeBook`). C'est une notion d'affichage uniquement.
2. Acheter une recette ne donne aucun lapin, aucune naissance, aucune XP et ne modifie pas le tirage.
3. Le tirage (`breedingPool`, `chooseBirth`), la garantie, les seuils d'affection, les parents imposés, les probabilités fixes et les niveaux sont **inchangés**. Une recette non possédée n'exclut rien : une reproduction admissible peut donner une espèce dont la recette est inconnue.
4. Avant l'achat, visibles : nom, types, rareté, niveau requis, prix, silhouette (portrait inconnu tant que l'espèce n'est pas découverte).
5. Après l'achat (ou la découverte), visibles : affection minimale, parents imposés, probabilité fixe et garantie, durée de croissance, paires possédées compatibles avec leur probabilité actuelle, et le raccourci « Préparer cette paire au nid ».
6. Communs : leur recette est offerte dès leur découverte, donc dès l'achat du lapin. Ils ne sont jamais vendus.
7. Brumelin est offert dès la nouvelle partie, avant la première reproduction, puisque le tutoriel le présente. La possession est stockée dans l'état du jeu et non dans les préférences.
8. Une espèce découverte révèle sa recette gratuitement. Aucun bouton d'achat n'apparaît pour une recette connue, et une commande d'achat sur une recette connue est refusée sans paiement.
9. Le niveau requis est celui de `PROGRESSION.requirements.species` (le même que pour le résultat de reproduction). En dessous de ce niveau : carte visible, achat verrouillé (« Niveau N requis »).
10. Paiement en pièces uniquement : aucun complément en cœurs et aucun achat de recette avec des cœurs.

## Prix proposés

Repères de revenus : un lapin rapporte `12 + 2 × (affection − 1)` pièces par heure, soit 14/h à l'affection 2, 18/h à 4, 22/h à 6 et 30/h à 10. Un lapin commun coûte 80, un habitat spécialisé 200 (niveau 2 à 300, niveau 3 à 600), et les extensions vont de 500 à 4 000. Le début validé atteint le niveau 3 avec environ 140 pièces.

Principe : une recette coûte moins cher que l'habitat nécessaire pour accueillir le résultat, et à peu près entre 1 et 3 heures de revenus d'un petit troupeau au niveau où elle se débloque. Elle accélère sans bloquer, puisque la reproduction reste possible sans recette.

| Espèce | Rareté | Types | Niveau | Recette | Prix | Information révélée (après acquisition) |
|---|---|---|---|---|---|---|
| Paille | Commun | paille | 1 | Offerte à la découverte | — | Deux parents réunissant le type paille |
| Neige | Commun | neige | 1 | Offerte à la découverte | — | Type neige |
| Terre | Commun | terre | 3 | Offerte à la découverte | — | Type terre |
| Feu | Commun | feu | 5 | Offerte à la découverte | — | Type feu |
| Bélier Gris | Commun | métal | 7 | Offerte à la découverte | — | Type métal |
| Volant | Commun | vol | 9 | Offerte à la découverte | — | Type vol |
| Brumelin | Peu commun | paille + neige | 1 | Offerte (nouvelle partie) | — | Affection 2, paires paille × neige, probabilité |
| Mottelin | Peu commun | paille + terre | 3 | Payante | 60 | Affection 2, paires, probabilité |
| Bouée | Rare | paille + feu | 5 | Payante | 150 | Affection 4, paires, probabilité |
| Feu Glacé | Rare | feu + neige | 6 | Payante | 180 | Affection 4, paires, probabilité |
| Géant | Épique | terre + paille | 7 | Payante | 350 | Affection 6, probabilité fixe 5 %, hors garantie |
| Lunettes | Rare | métal + paille | 8 | Payante | 220 | Affection 4, paires, probabilité |
| Perroquet | Rare | vol + feu | 9 | Payante | 250 | Affection 4, paires, probabilité |
| Magicien | Épique | métal + vol | 11 | Payante | 450 | Affection 6, probabilité fixe 5 %, hors garantie |
| Dragon | Légendaire | vol + feu | 14 | Payante | 900 | Parents Perroquet × Feu imposés, affection 10, 2 %, hors garantie |

Total des huit recettes payantes : 2 560 pièces. Ces prix sont des estimations tirées des formules : il faudra les vérifier par une simulation au laboratoire avant de les figer.

## Informations inconnues : carnet, nid, annonces

**Principe : l'affichage filtre, le tirage ne change jamais.** Les poids viennent toujours de `breedingPool`. Seule la présentation regroupe ou masque des éléments.

- **Nid, probabilités d'une paire** : afficher une ligne par résultat dont la recette est connue (nom, types, rareté, pourcentage exact). Les résultats à recette inconnue sont regroupés en **une seule ligne « Résultats inconnus : X % »**, où X est la somme exacte de leurs poids, au format `probabilityLabel`. Cette ligne ne précise ni le nombre de résultats, ni leurs types, ni leur rareté. La ligne « Résultats possibles : … » suit la même règle (« … et des résultats inconnus »). Si la garantie s'applique et que toutes les espèces garanties ont une recette inconnue, l'interface affiche « Résultats inconnus : 100 % » avec la mention existante sur la garantie : l'information reste honnête et ne révèle rien de plus.
- **Exclusions par niveau, au nid** : elles restent nommées si la recette est connue. Sinon, une mention groupée : « Un ou plusieurs résultats de recettes inconnues sont exclus par votre niveau. »
- **Textes fixes** : retirer la mention Perroquet × Feu du texte du nid. Garder les seuils généraux par rareté (rares 4, épiques 6, légendaire 10), qui sont une règle du jeu publique. Formuler la règle de garantie sans nommer les espèces (« les trois recettes à probabilité fixe »), ou la garder telle quelle : voir l'ambiguïté 2.
- **Carnet** : une carte par espèce à recette, avec quatre états.
  - **Inconnue** : nom, types, rareté, niveau, prix, bouton « Acheter la recette · [icône pièce] N », ou bouton verrouillé si le niveau est insuffisant.
  - **Possédée sans découverte** : détails complets, silhouette conservée.
  - **Découverte** : détails complets avec le portrait.
  - **Offerte** : une mention « Offerte » à la place du prix.

  Les paires possédées et le raccourci de préparation n'apparaissent que si la recette est connue.
- **Vocabulaire** : la garantie parle aujourd'hui de « recettes inconnues » au sens d'espèces non découvertes. Il faudra la renommer « espèces non découvertes » pour ne pas la confondre avec une recette non achetée.
- **Annonces de niveau** (`progressionNotices` / `ProgressionFeedback`) : pour une espèce à recette, ajouter « Recette en boutique · N » si elle n'est pas possédée, avec un raccourci vers sa carte. Sans révéler de condition.
- **Découverte et première naissance** : si l'espèce n'était ni découverte ni possédée, ajouter « Recette ajoutée au carnet ». Rien d'autre ne change.
- **Missions** : aucune mission ne porte sur les recettes (vérifié dans `config/missions.ts`), donc aucune adaptation obligatoire, aucune nouvelle mission et aucune XP.
- **Tutoriel** (`guidance.ts`, étapes `recipe`) : il continue à pointer vers Brumelin, qui est déjà possédé. Seul le libellé « carnet actuel » serait à revoir, sans changer le parcours.
- **Raccourcis** : `NO_BREEDING_RESULT` (« Consultez le carnet ») ne change pas. L'accueil de la boutique devient « Achetez et consultez les recettes de reproduction ».
- **Collection** : elle reste inchangée (« ??? » pour les espèces non découvertes). Voir l'ambiguïté 3.

## Parties existantes

**Données** (proposition : passer à la version 10) : ajouter un champ obligatoire `recipeBook: SpeciesId[]` à l'état, sans doublons, limité aux espèces à recette.

- **Migration v9 → v10** (`src/persistence/json.ts`, une seule fois, déterministe) : `recipeBook = ['brumelin']`. Les recettes des espèces découvertes ne sont pas recopiées, puisqu'elles sont connues par dérivation. Aucun débit et aucune réclamation, les autres champs sont intacts. Une partie qui a déjà découvert Lunettes voit donc sa recette sans payer. Le résultat déjà tiré dans `nest.breeding` ou `nursery.baby` est conservé tel quel : il reste secret jusqu'à la fin de la croissance, puis sa découverte à l'accueil révèle la recette.
- **Nouvelle partie** (`state/initial.ts`) : `recipeBook: ['brumelin']`.
- **Commande** `{type: 'buyRecipe', species}` dans `simulation/actions.ts`. Vérifications : espèce à recette ; recette non connue (`RECIPE_KNOWN`) ; niveau atteint (`stateLevelAccess`, action `breedingResult`) ; puis `pay(prix)` et ajout à `recipeBook` dans la même transaction. La commande ne figure pas dans la liste blanche `payWithHearts`. Une double pression ou une seconde commande est refusée sans paiement, et le cache anti-double pression existant du contrôleur s'applique aussi.
- **Import et export** : un export v9 est migré à l'import. Un export v10 est relu tel quel, et un `recipeBook` invalide (espèce commune, inconnue ou en double) est refusé comme les autres incohérences. Recharger une sauvegarde ne rejoue aucun achat.

**Fichiers concernés**

- `src/config/recipes.ts` (nouveau) : prix et recettes offertes.
- `src/state/types.ts` (champ, commande, refus), `src/state/initial.ts`.
- `src/persistence/json.ts` : schéma v10 et migration.
- `src/simulation/recipes.ts` (nouveau, `recipeKnown`) et `src/simulation/actions.ts`.
- `src/ui/models.ts` : `oddsView` regroupé, `recipeBook` filtré.
- `src/ui/GameUI.ts` : carnet, nid, boutique, découverte.
- `src/ui/progressionNotices.ts` / `src/display/ProgressionFeedback.ts`.
- `src/dev/scenarios.ts` : les scénarios qui supposent des recettes visibles reçoivent les recettes nécessaires, et un scénario « Recettes » est ajouté.
- `tests/*`.

**Tests indispensables**

- Le tirage est identique, à graine égale, avec et sans recette possédée, sur toutes les paires (comparaison de `breedingPool` et `chooseBirth`).
- Achat : débit exact, propriété enregistrée ; refus pour fonds insuffisants, niveau insuffisant, recette connue, espèce commune et paiement en cœurs ; double commande avec un seul débit.
- Migration v9 → v10 : ressources, résultats en cours et `pityFailures` identiques ; Brumelin ajouté ; espèces découvertes connues ; anciens fixtures v5 à v9 (`migration-fixtures.ts`, `published-v8-progression.test.ts`).
- Import et rechargement après achat : aucun achat répété ; `recipeBook` invalide refusé.
- `oddsView` : la somme des lignes connues et de « Résultats inconnus » vaut le total exact ; aucun nom, type ou rareté d'une recette inconnue dans le DOM du nid ; exclusion par niveau groupée.
- Carnet (`ui-dom.test.ts`, `ui-models.test.ts`) : les quatre états, aucune condition affichée pour une recette inconnue, bouton verrouillé sous le niveau requis.
- Tutoriel et départ (`start-step4`, `guidance`, `initiation`) : Brumelin consultable sans achat, budget de départ inchangé.

## Découpage proposé

1. **Données et règles**, sans changement d'interface visible : `config/recipes.ts`, champ `recipeBook`, sauvegarde v10 et migration, commande `buyRecipe`, `recipeKnown`, tests de règles, de migration et d'équivalence du tirage.
2. **Confidentialité de l'affichage** : regroupement « Résultats inconnus » au nid, exclusions groupées, textes fixes, carnet filtré selon `recipeKnown` (sans bouton d'achat), vocabulaire de la garantie. Tests DOM.
3. **Achat en boutique et annonces** : cartes à quatre états, bouton d'achat avec l'icône de pièce, confirmation, verrou de niveau, mentions dans les annonces de niveau et de découverte, scénario de laboratoire, contrôles navigateur ciblés.

## Ambiguïtés à trancher

1. **Les types révèlent la recette des hybrides.** Montrer les types avant l'achat, comme demandé, revient à donner presque toute la combinaison pour les recettes par types : Brumelin = paille + neige. L'achat apporte alors surtout le seuil exact, la probabilité, les paires possédées, le raccourci de préparation et, pour Dragon, les parents imposés. L'alternative serait de masquer les types avant l'achat, ce qui contredit la règle fixée. **Proposition : garder les types visibles** et l'assumer.
2. **Les seuils généraux et la liste des espèces hors garantie restent-ils publics ?** Proposition : les seuils par rareté restent publics (règle du jeu) ; les espèces hors garantie ne sont plus nommées.
3. **Le nom avant l'achat** : le carnet montrerait le nom d'espèces que la collection affiche encore comme « ??? ». Proposition : nom visible dans le carnet et la boutique, collection inchangée. Sinon, c'est la collection qui afficherait les noms.
4. **Brumelin pour les anciennes parties** : offert à toutes (proposition), ou seulement aux parties qui n'ont pas encore lancé de reproduction.
5. **Version de sauvegarde** : v10 avec migration (proposition, plus explicite), ou champ optionnel dans v9 comme `purchaseUnlocks`. Dans les deux cas, le schéma `.strict()` empêche un client v9 publié de relire un export qui contient des recettes achetées.
6. **XP de l'achat** : aucune (proposition), pour ne pas transformer les pièces en XP.
