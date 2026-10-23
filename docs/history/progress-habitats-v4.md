# Progression — étape 8 : habitats et aménagement

Étape terminée. Livraison : projet Phaser/TypeScript, configuration, simulation, contrôleur, interface HTML et rendu Phaser, tests, documentation, scénario de test et build. Aucun déploiement, PWA, nouveau lapin, mini-jeu ou décoration indépendante. Aucune dépendance ajoutée.

## Résultats humains conservés

Le dernier compte rendu humain valide sur iPhone Safari : prairie sans impression de pente/déformation, lapins reconnaissables, zoom confortable, glissade/pincement/Recentrer, collection de onze espèces, trois nouveaux communs en boutique, rares non achetables, carnet des conditions et listes/panneaux lisibles au toucher.

Ces résultats concernent la version testée par l'humain. **Ils ne valident pas les nouvelles reproductions, dépenses de cœurs, export/import, missions ni les habitats de cette livraison.** Tous restent ouverts sur iPhone. Les valeurs de zoom, projection et rayon de sélection, les compteurs et dimensions des panneaux sont conservés.

## Implémentation réelle

- `src/config/habitats.ts` : types stables, noms/couleurs, prix, trois niveaux et deux extensions, selon les chiffres demandés.
- `src/simulation/habitats.ts` : compatibilité, statistiques, places, largeur et prochaine extension. Tous les habitats réutilisent `kind: enclosure`, les revenus, récoltes et transferts existants.
- Achat, accueil et déplacement contrôlent type/place avant paiement ou transfert. Un hybride est compatible avec chacun de ses types ; l'universel accepte toutes les espèces. Aucun déménagement des anciens lapins.
- `upgradeHabitat` : niveau attendu porté par la commande, paiement et effet atomiques, refus des confirmations périmées, niveau maximal 3. Stock et fractions conservés ; calcul jusqu'au paiement avec l'ancien plafond, sans récupérer de revenus perdus.
- Deuxième extension : 1 000 pattes après la première, terrain 9 × 2, coordonnées conservées. La mission de première extension ne redonne rien.
- Compléments facultatifs en cœurs réutilisés pour achat spécialisé, amélioration et deuxième extension ; conditions, prix maximum et confirmations uniques conservés. Un placement annulé ne paie rien.
- Boutique en sections, destinations avec type/effectif/capacité et motifs ; panneau d'habitat complet, amélioration et extensions confirmées. Vocabulaire « habitat » pour les destinations.
- Rendu pastel différencié, repères de niveau et rangées pour cinq/sept lapins. Même empreinte logique, taille des lapins et zone de toucher. Caméra avec bornes adaptées à la prochaine bande de terrain ; zoom initial/min/max inchangés, aucun recentrage automatique lors des achats. Changements de bornes/orientation différés pendant un geste.
- JSON v4 : propriété `habitat` et `secondExpanded`. Migrations v1/v2/v3 ; v3 conserve toutes les missions, cœurs, échéances et autres champs. Ancien enclos = universel niveau 1. Validation stricte des types, niveaux, capacités, compatibilités, plafonds et extensions.
- Copie brute v3 avant écriture v4 ; import écrit avant remplacement actif, échec/annulation sans perte. Export v4. Horloge et stockage de développement restent séparés.

L'économie historique, la reproduction et le cadeau de cœurs sont conservés. Seuls les coûts/capacités/plafonds nouveaux explicitement validés sont ajoutés. La description de la mission d'extension précise désormais « première extension » ; son identifiant, sa condition et sa récompense ne changent pas.

## Vérifications exécutées

| Ensemble | Résultat |
|---|---:|
| Simulation initiale | 38 réussis |
| Contrôleur et cycle de vie | 32 réussis |
| Adaptateurs/export | 6 réussis |
| Gestes/caméra/modèles historiques | 19 réussis |
| Cœurs et migrations | 40 réussis |
| Collection et reproduction étendue | 27 réussis |
| Missions, temps et transactions | 39 réussis |
| Habitats, niveaux, extensions, caméra et migrations | 125 réussis |
| Parcours HTML happy-dom | 35 réussis |
| `npm test` | **361 réussis, 9 fichiers** |
| `npm run typecheck` | **réussi** |
| `npm run build` | **réussi** |
| Démarrage Vite | **réussi**, port 5173 |
| Navigateur réel | **bloqué : ERR_CONNECTION_REFUSED** à l'ouverture du serveur local |
| iPhone pour cette livraison | **non testé par l'IA, validation humaine attendue** |

Les 230 tests précédents sont conservés, avec adaptation des attentes de version, des fixtures historiques et de la confirmation explicite d'extension. Les 131 nouveaux tests comprennent :

- Matrice de 77 cas : onze espèces × sept types d'habitat ; achat des six habitats et de leurs communs, compatibilité des hybrides, refus sans mutation, accueil réservé et déplacement.
- Niveaux successifs et plafond maximal, capacités 3/5/7, revenus fractionnaires, ancien plafond avant amélioration, absence de production rétroactive, revenu des parents en reproduction.
- Compléments exacts, manque de cœurs, confirmations périmées/doubles pressions, accélération de croissance tenant compte des capacités améliorées sans nouveau tirage.
- Séquence des extensions, paiement unique, mission conservée, placement jusqu'à la colonne 9, aller-retour projection/sélection, bornes de caméra, zoom conservé et report pendant les gestes/orientations.
- Migrations 1/2/3 et export/import v4, absence de redotation, copies de secours et échecs d'écriture, validation de fichiers corrompus, refus d'import sans remplacement.
- Un export v3 a été généré par le **code non modifié de la livraison précédente**, conservé dans `tests/fixtures/before-habitats-v3.json`. Le test compare tous ses champs après migration en retirant uniquement les nouveaux champs : ressources, cœurs, missions réclamées, extension, fractions et résultat réservé sont identiques.
- Six parcours HTML supplémentaires : catalogue/placement annulé/complément, améliorations confirmées, destinations compatibles/pleines, complément d'amélioration et invalidation après import, deuxième extension confirmée, isolation du mode test.

Les premiers échecs portaient sur les anciens helpers fabriquant du JSON v1/v2 à partir de l'état courant : ils ont été corrigés pour retirer les nouveaux champs v4 avant validation de l'ancien format. Aucun test historique n'a été supprimé. Le parcours de première extension a été adapté à la confirmation désormais exigée.

Build : **45 modules**, JavaScript **1 360,20 ko minifié / 377,90 ko gzip**, CSS **6,91 ko**. L'avertissement de taille du bundle Phaser est non bloquant ; l'avertissement npm `http-proxy` est propre à l'environnement. Aucun ajout de dépendance.

Le navigateur disponible n'a pas pu joindre Vite malgré son démarrage. Les 35 parcours HTML utilisent un **DOM simulé**, pas Safari : ils vérifient les boutons/textes/transactions, pas le rendu ni le toucher. Aucune capture de rendu réel n'est livrée. La disposition à sept lapins nécessite particulièrement un essai humain.

## Parcours humain et fichiers

Guide : `docs/habitats-iphone-test.md`. Scénario facultatif : `docs/test-saves/habitats-ready-v4.json`, à importer seulement après vérification du badge Mode test. Il contient des ressources de test, les six habitats, neuf espèces dont les trois rares, et la première extension déjà achetée/récompensée ; aucune ressource n'est ajoutée automatiquement au jeu normal.

Sous Windows, extraire l'archive puis ouvrir un terminal dans `prairie-lapins-prototype` :

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Sur l'iPhone du même Wi-Fi : adresse **Network** avec **`?dev=1`**. Tester achat/annulation, compatibilités des trois rares, deux améliorations, stockage plein, seconde extension, déplacement d'un habitat occupé, rechargement et reprise. Les guides précédents de missions, collection et cœurs complètent les essais encore ouverts.

**L'export/import iPhone demeure à vérifier**, y compris l'enregistrement réel du JSON dans Fichiers, l'annulation, le remplacement confirmé et le refus des fichiers invalides. Les sauvegardes sont liées à l'origine (protocole, adresse, port). Changement de domaine/adresse ou passage du serveur de développement au futur site HTTPS : export/import nécessaire. Le stockage local peut être effacé ; aucune permanence ni synchronisation entre appareils n'est promise.

## Prochaine étape recommandée

Faire le parcours humain des habitats et des fonctions restées ouvertes. Ensuite, préparer un palier de collection avec recettes dépendant d'espèces précises et objectifs d'aménagement, afin de donner un usage durable à la place créée par les améliorations. Définir et valider son contenu et ses chiffres avant de développer. Aucun élément de cette prochaine étape n'est implémenté ici.

## Historique

| Étape | Livré | Tests |
|---|---|---:|
| 1 | Socle et simulation | 38 |
| 2 | Sauvegarde locale et export/import | 76 |
| 3 | Interface jouable et outils de test | 100 |
| 4 | Perspective, cadrage et recentrage | 107 |
| 5 | Cœurs et migration v2 | 155 |
| 6 | Onze espèces et carnet | 187 |
| 7 | Missions et migration v3 | 230 |
| 8 — actuelle | Habitats, améliorations, deuxième extension et migration v4 | **361** |

Le bilan complet de l'étape 7 est conservé sous `docs/history/progress-missions-v3.md` ; ses validations et limites sont historiques.
