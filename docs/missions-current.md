# Missions principales, découvertes et étapes de la prairie

## Catalogue complet dès le niveau 7 — 26 octobre 2026

Avant le niveau 7, le parcours et les récompenses de départ restent inchangés. Dès le niveau 7, la liste présente **toutes les missions du parcours**, y compris celles déjà réclamées : 93 dans une partie Paille solo, 91 dans une ancienne partie normale. Les trois anciens objectifs retirés restent exclus ; les deux récompenses solo de Neige ne sont pas ajoutées au parcours normal. Le registre de sauvegarde accepte 96 identifiants au total, anciens et nouveaux, toujours en v20.

La vue s’ouvre sur **Toutes**. Les filtres **À réclamer**, **En cours** et **Terminées** affichent chacun leur nombre. Les cartes montrent progression et récompenses complètes ; leurs raccourcis mènent à la collection, aux décorations, aux recettes ou au bâtiment concerné. Les réclamations conservent le défilement au niveau 7 et plus. Un ancien guide non terminé ne verrouille plus les menus à partir de ce niveau ; ses paroles restent inchangées et attendent la fermeture des menus.

### Une mission par découverte

Les 32 espèces actuelles ont une mission stable `discover-<species>`. La récompense est manuelle et unique, même après avoir confié le dernier lapin de cette espèce. Les découvertes déjà enregistrées comptent, sans devoir obtenir à nouveau le lapin. Une naissance encore au nid ou à la nurserie ne compte pas comme une découverte.

| Rareté | Pièces | Nourriture | Cœurs | XP à la réclamation |
|---|---:|---:|---:|---:|
| Commun | 20 | 10 | 0 | 0 |
| Rare | 40 | 20 | 0 | 0 |
| Épique | 60 | 30 | 1 | 0 |
| Légendaire | 80 | 40 | 2 | 0 |

Le catalogue actuel ne contient pas d’espèce Peu commune ; cette rareté utiliserait le petit montant des Communs. Les XP de découverte et de naissance déjà attribués par les actions ne sont pas doublés par ces réclamations.

### Une mission par modèle décoratif

Les 13 modèles ont chacun une mission `decorate-<model>`, pour **10 XP** à réclamer après leur première pose. Cette petite prime est distincte des 10 XP de première pose déjà attribués par le jeu. Acheter en inventaire avec `placementXpProcessed: false` ne termine pas la mission. Déplacer, ranger, reposer, vendre et racheter le même modèle ne donnent jamais une nouvelle prime.

L’historique `rewardedDecorationModels` est conservé même après vente. À défaut, un objet encore posé ou marqué comme déjà traité témoigne de son historique. Les sauvegardes sans cet historique et sans marqueur explicite suivent la convention historique déjà utilisée par les XP de décoration : marqueur absent = exemplaire traité. Aucune nouvelle action passée n’est ajoutée au journal ; aucune récompense n’est versée pendant le chargement.

### Vingt étapes marquantes

Chaque nouvelle étape rapporte **20 XP**, une fois, à sa réclamation : construire Cuisine, agence et Statue de l’Affection ; posséder une deuxième ferme ; améliorer une ferme au niveau 2 et un habitat au niveau 3 ; ouvrir les places 2, 3 et 4 de la nurserie ; améliorer l’agence aux niveaux 2 et 3 ; atteindre affection 10, 15 et 20 ; atteindre niveaux 20, 22, 25 et 30 ; acquérir les huit extensions ; avoir une recette vendue en boutique dans son carnet.

Les conditions se lisent dans la vraie sauvegarde. Pour le carnet, une recette déjà connue compte aussi : certaines anciennes recettes ont pu être offertes, donc cette mission ne prétend pas reconstituer un paiement historique. Les conditions terminées restent acquises même si le lapin ou le bâtiment quitte ensuite la prairie.

### Paiement et compatibilité

Une réclamation verse tous ses composants et ses XP dans **la même transaction sauvegardée**. Un débordement de ressource, un refus ou une écriture refusée ne verse rien et ne consomme pas la mission. Rechargement et import préservent les réclamations, sans versement supplémentaire. Les anciens montants et identifiants ne changent pas, notamment les 630 pièces de `first-birth`. Les quotidiennes gardent leur cycle, leurs délais et leurs récompenses.

Les fonctions de catalogue visible et d’objectifs actifs sont séparées : une mission réclamée reste consultable mais ne revient jamais dans les badges, les commandes réclamables ou les choix du simulateur.

## Décision du propriétaire — 26 octobre 2026

La mission `first-birth` (« Première naissance ») termine les deux parcours initiaux. Sa récompense passe de **50 à 630 pattes** : elle paie à elle seule la **Clairière de feu (450)** et le **Lapin Feu (180)**. La valeur est calculée dans `src/config/missions.ts` avec `habitatPrice('feu') + SPECIES.feu.price`, depuis les prix réellement utilisés par les achats. Une modification de ces prix adapte donc aussi la récompense.

Le paiement reste manuel, unique, à la réclamation. Un joueur qui a déjà réclamé `first-birth` conserve son solde : aucun rattrapage. Une mission terminée mais encore non réclamée donne la nouvelle récompense, y compris après chargement d'une ancienne sauvegarde. Aucun changement de format de sauvegarde (actuellement v20), de prix, de courbe d'XP ou de dialogue de Paille.

## Parcours initiaux

Avant le niveau 7, un seul objectif initial est affiché à la fois : le premier non réclamé. Les actions anticipées réussies restent enregistrées. L'interface guidée termine le tutoriel lors de l'accueil du premier lapereau ; les récompenses nécessitent toujours une réclamation explicite dans les missions.

| Identifiant | Objectif | Récompense |
|---|---|---|
| `snow-habitat` | Posséder le Jardin enneigé | 0 patte |
| `welcome-snow` | Accueillir Neige | 50 pattes |
| `first-meal` | Un lapin atteint affection 2 | 10 nourriture |
| `first-farm` | Posséder une ferme | 20 nourriture |
| `first-harvest` | Récolter 20 nourriture à la ferme | 30 pattes |
| `parents-ready` | Deux lapins à affection 2 ou plus | 20 pattes |
| `at-nest` | Lancer une reproduction gratuite | 20 nourriture |
| `to-nursery` | Transférer manuellement le lapereau | 30 pattes |
| `first-birth` | Accueillir le lapereau de reproduction | **630 pattes**, dérivées des prix de Feu |

Ordre normal (`INITIAL_MISSION_IDS`, conservé pour les parties existantes) : `first-meal`, `first-farm`, `first-harvest`, `parents-ready`, `at-nest`, `to-nursery`, **`first-birth`**.

Ordre `paille-solo` (`SOLO_INITIAL_MISSION_IDS`, nouvelles parties) : `snow-habitat`, `welcome-snow`, `first-meal`, `parents-ready`, `at-nest`, `first-farm`, `first-harvest`, `to-nursery`, **`first-birth`**. Le guide de Paille propose la ferme avant les repas ; les objectifs anticipés sont conservés, même si leur carte n'est pas encore affichée.

## Niveau, budget et obstacles vérifiés

Résultats déterministes avec la graine 20261025, sans récolte de revenus pendant le tutoriel, après réclamation des récompenses indiquées :

| Parcours / moment | Niveau / XP | Ancien solde | Nouveau solde |
|---|---|---|---|
| Normal, juste après `first-birth` | 4 / 587 | 410 pattes | 990 pattes |
| Normal, puis branche disponible `varied-family` | 4 / 627 | 460 pattes | 1 040 pattes |
| `paille-solo`, juste après `first-birth` | 4 / 767 | 180 pattes | 760 pattes |
| `paille-solo`, puis récompenses immédiatement disponibles | 5 / 887 | 230 pattes | 810 pattes |

La simulation réclame les branches prêtes puis `level-five` quand il devient disponible. Le total de 887 XP inclut `varied-family`, `two-habitats` et `level-five`. Réclamer seulement `varied-family` après le tutoriel solo suffit déjà pour atteindre le niveau 5 (807 XP).

- **Niveau** : Feu et sa clairière s'ouvrent au niveau 5 pour les nouvelles parties. Aucune baisse de seuil n'est nécessaire. Le parcours normal finit au niveau 4 mais reste autonome : le test atteint le niveau 5 en réclamant trois quotidiennes de récolte des revenus sur trois jours, sans achat intermédiaire ni nouvelle découverte. Les droits d'achat historiques restent conservés.
- **Collection** : les nouvelles parties possèdent `levelAccessTransition` et utilisent les niveaux. La condition historique de cinq espèces dans `purchaseUnlocks.ts` ne bloque donc pas Feu. Le scénario solo l'achète avec seulement trois espèces découvertes.
- **Place** : la parcelle initiale sud-ouest contient encore une empreinte libre après habitat Paille, Jardin enneigé, nid, nurserie et ferme. Les tests cherchent une empreinte valide puis achètent la clairière et Feu sur cette seule parcelle. Le parcours normal conserve aussi assez de place. Aucune extension ni amélioration d'habitat nécessaire pour ces parcours.
- **Budget** : le paiement final seul couvre les deux achats. Les scénarios utilisent les ressources réellement gagnées et ne paient aucun complément en cœurs. Le joueur garde la liberté de dépenser sa récompense autrement ; elle n'est pas réservée automatiquement à Feu.

## Après le tutoriel

Les branches indépendantes sont : trois espèces (`varied-family`, 50 pattes), cinq espèces (`growing-collection`, 2 cœurs), deux habitats (`two-habitats`, 30 nourriture), affection 5 (`strong-bonds`, 1 cœur), première décoration extérieure (`first-decoration`, 20 pattes), première extension (`bigger-meadow`, 100 pattes), sept espèces (`seven-species`, sans récompense matérielle).

Une chaîne durable accompagne ces branches : niveau 5, accueil de Feu, culture d'au moins une heure, dix espèces, habitat niveau 2, niveau 10, accueil de Bélier Gris, trois extensions, quinze espèces, accueil de Volant, niveau 15, tous les rares ordinaires. Chaque réclamation principale donne toujours 40 XP. Les quotidiennes, leur espacement et leurs récompenses restent inchangés.

## Simulation et validation

Exécuter hors navigateur et sans serveur :

```sh
node docs/progression-simulation.mjs
node docs/progression-simulation.mjs --normal-tutorial
```

Le premier régénère `docs/progression-results.json` et vérifie la cible du propriétaire : niveau 22 vers le jour 20, tolérance de 15 % (jours 17 à 23). Le second rapporte uniquement le tutoriel normal historique et ne remplace pas le JSON du parcours courant. `tutorialFinalMission` mesure l'instant suivant la réclamation de `first-birth` ; `tutorial` inclut les autres récompenses déjà prêtes.

Après modification : niveau **22 au 20e jour calendaire**, soit **19 jours écoulés**, contre le 19e jour avant modification. Niveaux 5 / 10 / 15 / 20 / 22 atteints respectivement aux jours calendaires **1 / 3 / 7 / 16 / 20**. Hypothèses conservées : trois sessions d'environ cinq minutes à 08 h / 13 h / 20 h, au plus 45 commandes et huit repas par session, deux fermes, cultures adaptées aux visites, priorité à la collection, aucune récompense Cuisine ni recette payante. La courbe reste `base: 90, exponent: 0.85`.

Tests concernés :

- `tests/missions-current.test.ts` : récompense suffisante, parcours normal jusqu'au niveau 5 et aux achats Feu, mission sauvegardée non réclamée payée au nouveau tarif et ancienne réclamation sans rattrapage.
- `tests/start-step4.test.ts` : parcours solo complet avec Frisket et Icy, aides gratuites ou délais naturels, sauvegardes/reprises, accès à Feu au niveau 5 sans extension ni cinq espèces.
- `tests/start-economy.test.ts` : attentes historiques de solde relevées exactement de **580 pattes**, différence entre l'ancienne et la nouvelle récompense. Les autres assertions restent conservées.

La simulation représente une stratégie déterministe, pas tous les comportements possibles. Aucun navigateur ni serveur n'a été lancé pour cette mission ; aucune validation tactile ou Safari physique n'a été effectuée.
