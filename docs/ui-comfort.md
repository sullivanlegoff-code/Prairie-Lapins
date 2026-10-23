# Menus et confort tactile

Livraison publiée : **`3516218`**, jeu normal et laboratoire. [Jeu](https://sullivanlegoff-code.github.io/Project-L/) · [Laboratoire](https://sullivanlegoff-code.github.io/Project-L/dev/).

Base vérifiée : `production` `c5c206b`, application `63d74eb`, sauvegardes v8. Cette livraison harmonise les menus sans modifier économie, probabilités, délais, missions, guidage, aides ou sauvegardes. Les illustrations, la prairie et la caméra restent inchangées ; comptes/Supabase restent en pause.

## Examen avant modification

Boutique, collection, carnet, missions, fiche de lapin, habitat, ferme, nid, nurserie, aménagement et paramètres ont été examinés dans Chromium avec commandes réelles aux formats 852 × 393, 667 × 375, 390 × 844 et 1280 × 800. L'audit initial conserve 51 vues et une capture directe de ferme.

Les principaux défauts étaient la perte de position au retour d'une fiche, le remplacement d'un sélecteur ou d'un bouton pendant une actualisation, les recettes refermées qui se rouvraient, et le manque de place pour les actions sur petit paysage. Les boutons existants atteignaient déjà généralement 44 pixels ; les sélecteurs, liens, retours et présentations ont été harmonisés avec le même minimum. Aucune nouvelle bibliothèque.

## Changements

- Palette commune crème, vert doux et doré, contrastes de texte préservés, cartes et boutons arrondis. Pattes, herbes et cœurs conservent leurs couleurs distinctes.
- Un panneau principal, une entête fixe avec Retour/Fermer, contenu seul défilable. Les listes utilisent deux colonnes lorsque la largeur du panneau le permet ; portrait en colonne. Les panneaux de placement restent plus étroits pour conserver l'accès à la prairie.
- Retour suit le menu d'origine, avec filtres et défilement. La boutique mémorise chaque catégorie et sa position pendant la session, y compris après achat ou annulation de placement. Les anciens aperçus terminés ou annulés sont sautés : Retour ne réouvre pas un brouillon absent. Ces préférences d'affichage ne changent pas le format de sauvegarde.
- Les actualisations de la simulation et sauvegardes préservent le contrôle touché et les sélecteurs focalisés. Le dernier état est affiché après relâchement ; les commandes réelles restent immédiates. Les listes de paires du carnet gardent un choix explicite ouvert/fermé.
- Collection : portraits dans l'entête des cartes, types/rareté/découverte lisibles pour les espèces connues, filtres compacts, état vide expliqué et remise à zéro. Carnet : conditions, parents, reproduction de 20 min, croissance et probabilités effectivement applicables.
- Fiche : portrait conservé, affection/revenu séparés, coût et effet du prochain repas, Nourrir en avant ; « Au nid », habitat et actions secondaires restent accessibles. Il n'y a ni faim ni entretien obligatoire.
- Habitat : capacité, stockage/plafond et revenu distincts ; récolte en avant, amélioration et déplacement secondaires.
- Ferme/nid/nurserie : états Libre, En cours, Prêt ou Bloqué, prochaine action et obstacle précis. Les aides gratuites sont séparées des accélérations payées en cœurs. Récolte, transfert et accueil restent manuels.
- Missions : réclamations retirées comme auparavant, progression/récompense/action lisibles, bonus quotidien et branches libres conservés.
- Aménagement : réserve, objet posé et aperçu distingués, vente secondaire confirmée, aucun changement avant validation. Pied de placement dans le flux, sans masquer les instructions.
- Paramètres : Jeu, Son/accessibilité, Sauvegarde, remplacement de partie et Laboratoire séparés. Import/réinitialisation demandent toujours confirmation. Le guidage compact se retrouve après fermeture des menus ; il ne recouvre pas leurs contrôles.

Les transitions suivent la réduction des mouvements ; aucun nouveau son ou illustration. Les zones sûres Safari sont prises en compte par CSS. Le défilement d'un panneau ne déclenche pas les gestes de caméra : les gestionnaires restent attachés au canvas.

## Comparaisons avant/après

Captures locales de builds compilés, même scénario existant « Reproduction — parents prêts », mêmes ressources et même format. Les 500 000 pattes visibles appartiennent à cette fixture du laboratoire, pas à une nouvelle dotation du jeu normal. Paramètres comparés en haut de leur contenu. Les captures avant utilisent l'interface de la livraison précédente ; les captures après sont celles de ce travail. Aucun traitement ni génération d'image.

| Menu | Avant | Après |
|---|---|---|
| Boutique, 852 × 393 | [Avant](proofs/ui-comfort/before-shop.png) | [Après](proofs/ui-comfort/after-shop.png) |
| Fiche Paille, 852 × 393 | [Avant](proofs/ui-comfort/before-rabbit.png) | [Après](proofs/ui-comfort/after-rabbit.png) |
| Collection, 390 × 844 | [Avant](proofs/ui-comfort/before-collection.png) | [Après](proofs/ui-comfort/after-collection.png) |
| Paramètres, 667 × 375 | [Avant](proofs/ui-comfort/before-settings.png) | [Après](proofs/ui-comfort/after-settings.png) |

## Validation

Cinq tests DOM ciblés couvrent le retour avec filtres/défilement, la boutique après transaction/annulation, la stabilité pendant un geste ou un sélecteur (panneau et guidage), les recettes fermées et les motifs/états de travaux. Les deux assertions d'habitat ont été adaptées à la séparation des statistiques. Aucun nouveau test qui reproduit les styles pixel par pixel.

Le contrôle navigateur dédié utilise les boutons réels, gestes tactiles, molette et lectures de stockage. Scénarios explicitement chargés par le laboratoire ; aucun ajout de ressources en cours de parcours, écriture de stockage ou remplacement de tirage. Il audite les onze menus aux quatre formats, les cibles tactiles de 44 pixels, l'absence de débordement, Retour/Fermer, filtres et actualisations, annulations, nid bloqué et vente annulée. Les parcours existants contrôlent repas, récolte, reproduction, transfert, missions, aides, rotation et rechargement.

Validation finale : **694 tests / 25 fichiers**, TypeScript et quatre builds réussis. Les sources figées des prévisualisations ont aussi conservé leurs 415 et 544 tests. La [CI finale](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38138172414) a exécuté neuf suites sur sources puis quatorze suites sur builds, soit 54 contrôles sans erreur navigateur. Les deux anciennes fixtures de sélection ferment désormais explicitement Paramètres après import avant de toucher le canvas ; aucune assertion n'a été retirée.

Le [déploiement](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38140077673) a réussi les quatorze suites HTTPS : **54 contrôles**, aucune erreur. L'audit dédié couvre 52 vues de menus en 852 × 393, 667 × 375, 390 × 844 et 1280 × 800. Retour après annulation d'un aperçu, filtres/défilement, sélecteurs et actualisations, défilement tactile sans mouvement du terrain, états bloqués et vente annulée sont vérifiés avec les vrais contrôles. Normal/laboratoire servent `3516218` en v8 ; Comptes reste `3e70d9e` en v4, Décorations `85fe255` en v5. Les quatre routes et leurs applications répondent HTTP 200.

[Rapport public permanent](proofs/ui-comfort/public-validation.json). Rapports et captures HTTPS complets : [artefact de publication](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38140077673/artifacts/11703320393), conservé jusqu'au 10 novembre 2026. Les huit captures avant/après et rapports locaux restent dans le dépôt. Chromium tactile n'est pas un essai Safari physique.

## Essai iPhone : dix vérifications

1. Ouvrir Boutique en paysage : comparer les catégories, prix et raisons d'indisponibilité, puis défiler.
2. Lancer le placement d'un bâtiment, annuler, rouvrir Boutique : catégorie/position conservées et aucun paiement d'achat.
3. Filtrer la collection, ouvrir une fiche puis le carnet ; Retour doit conserver filtres et position.
4. Nourrir un lapin : coût/effet lisibles, affection/revenu actualisés, action secondaire distincte.
5. Ouvrir habitat et ferme : capacité, stock, revenu et récolte distincts ; récolter un travail prêt.
6. Au nid, vérifier gratuité, compte à rebours et aide séparée des cœurs ; transfert encore manuel et motif si nurserie occupée.
7. Réclamer une récompense : sa mission disparaît ; autres branches et quotidiennes restent accessibles.
8. Sélectionner une décoration, déplacer puis annuler ; ouvrir Vendre puis annuler : exemplaire et pattes conservés.
9. En portrait puis petit paysage, défiler dans un menu : prairie immobile, aucun texte/bouton hors écran, Retour/Fermer accessibles.
10. Fermer/reprendre le guidage depuis Paramètres puis recharger : progression et aides conservées, import/réinitialisation toujours séparés des actions courantes.
