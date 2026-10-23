# État du développement — étape 7 : missions, 7 octobre 2026

## Livraison

Huit missions principales et trois quotidiennes avec bonus de cycle, implémentées dans la configuration, la simulation, le contrôleur/persistance et l'interface. Projet complet livré dans `prairie-lapins-missions-v3.zip`, avec sources, tests, documentation et build. Aucune dépendance ajoutée, aucun nouveau lapin, habitat spécialisé, décoration, mini-jeu, déploiement HTTPS ou PWA.

## Dernier retour humain sur iPhone

L'humain confirme maintenant :

- Prairie stable, sans impression de terrain penché ou déformé.
- Lapins grands et reconnaissables, zoom confortable et bien calibré.
- Déplacement, pincement et Recentrer fonctionnels.
- Collection de onze espèces fonctionnelle ; trois nouveaux communs présents en boutique ; rares non achetables.
- Conditions du carnet affichées ; listes et panneaux lisibles et faciles à toucher.

**La caméra et cette ergonomie sont donc validées par l'humain et conservées.** Ce retour ne valide pas les nouvelles reproductions, les dépenses de cœurs ou l'export/import sur iPhone. Les missions ajoutées ici attendent aussi leur essai humain. Aucun test iPhone réalisé par l'assistant n'est revendiqué.

Le premier retour humain, à l'étape 3, avait déjà validé la boucle initiale : nourriture/affection, placements et refus, fermes, reproduction initiale cachée puis accueil, revenus/capacités/déplacements, extension, attente au nid/enclos pleins/protection des dernières espèces, sauvegarde au rechargement et reprise après arrière-plan.

## Ce qui fonctionne dans cette livraison

- Les huit principales sont toutes visibles dès le départ. Une condition acquise est conservée ; réclamation manuelle gratuite et unique. À la migration, seules les conditions observables sont acquises, sans récompense encaissée automatiquement ni niveau ancien inventé.
- Les trois quotidiennes comptent exclusivement les pattes effectivement récoltées dans les enclos, les herbes effectivement récoltées et les niveaux gagnés par nourriture. Les ressources importées, les récompenses, les compléments de pattes et les attentes ne sont pas des événements de progression.
- Cycles de 24 h ancrés à la création/migration. Le renouvellement est appliqué avant l'action, à la frontière exacte ; après absence, seul le cycle courant existe. Une horloge reculée ne réactive pas un cycle précédent. Progression et récompenses non réclamées expirent, bonus compris.
- Le bonus gratuit de 2 cœurs est réclamable après les trois réclamations quotidiennes. Il ne remplace pas et ne décale pas le cadeau de 2 cœurs existant.
- Réclamations atomiques, marquage et attribution ensemble. Refus sans dépense, double pression protégée, ancien bouton de cycle/import inactif. La mémoire reste cohérente si le stockage échoue, avec l'avertissement et l'export existants.
- Bouton Missions sous les compteurs, indicateur discret, onglets Principales/Quotidiennes, descriptions, progressions, états, récompenses et gratuité explicites. Courte animation respectant la réduction des mouvements, aucune ouverture automatique ni pop-up répétitif. Raccourcis vers les panneaux utiles sans achat ; tutoriel conservé.

## Architecture et sauvegardes

`src/config/missions.ts` contient identifiants, conditions, objectifs, récompenses, durée de cycle et bonus. `src/simulation/missions.ts` évalue les principales, renouvelle les cycles et compte les événements validés. Le calcul reste indépendant de Phaser et des API du navigateur. `advance` actualise les missions avant la transaction ; `act` ne compte un événement qu'après sa réussite. Le contrôleur conserve son avancement séparé même si l'action est refusée.

Commandes explicites : `claimMainMission`, `claimDailyMission`, `claimDailyBonus`. Une commande quotidienne comporte la date de début du cycle visé ; le cycle expiré est refusé. Les claims sont vérifiés dans la simulation et sauvegardés par le contrôleur, jamais déduits des clics ou animations.

**Format v3** : ajout du bloc `missions`, avec principales acquises/réclamées et état du cycle quotidien. Migration v2 : tous les anciens champs conservés, aucun cœur ajouté, cadeau inchangé. Migration v1 : dotation historique de 12 cœurs et échéance du cadeau, puis mêmes missions. Résultats et réservations de reproduction, revenus fractionnaires, ressources, individus et positions sont préservés. La référence du premier cycle est l'heure monotone de migration ; à l'import ancien, elle est fixée à la confirmation effective.

Les imports v3 conservent leurs réclamations et progressions, puis appliquent l'expiration normale éventuelle. Aucune fusion avec la partie remplacée. Validation stricte des identifiants, doublons, réclamations non acquises, bonus prématuré et cycles incohérents. Les limites de taille de fichier et protections contre écritures/lectures impossibles restent actives.

Clé active historique conservée : `prairie-lapins.save.v1`, contenu v3. Avant écriture d'une migration v2, copie brute sous `prairie-lapins.backup.before-v3`. Pour v1, la clé de copie historique `prairie-lapins.backup.before-v2` reste utilisée. Échec de copie ou d'écriture : ancien contenu actif intact. Les anciens clients ne lisent pas les exports v3 ; continuer avec cette livraison après migration.

Une récompense non enregistrée reste en mémoire, avec son marquage, et peut être exportée ou sauvegardée par nouvel essai. Fermer avant réussite peut perdre ces dernières modifications, comme pour toute action locale non sauvegardée ; il n'y a pas de garantie de stockage permanent.

## Vérifications finales

| Ensemble | Résultat |
|---|---:|
| Simulation initiale | 38 réussis |
| Contrôleur et cycle de vie | 32 réussis |
| Adaptateurs/export | 6 réussis |
| Gestes/caméra/modèles de présentation | 19 réussis |
| Cœurs et migrations | 40 réussis |
| Collection et reproduction étendue | 27 réussis |
| Missions, temps, migrations et transactions | 39 réussis |
| Parcours HTML happy-dom | 29 réussis |
| `npm test` | **230 réussis, 8 fichiers** |
| `npm run typecheck` | **réussi** |
| `npm run build` | **réussi** |
| Démarrage Vite local | réussi |
| Vérification navigateur réelle | impossible : **ERR_CONNECTION_REFUSED** sur le serveur local |

Les 187 tests précédents sont conservés, avec les attentes de version et les fixtures adaptées explicitement aux migrations v3. Les anciens fichiers v2 de référence sont conservés. Les 43 nouveaux tests comprennent :

- Conditions principales, récompense exacte de chacune des huit missions, acquisition rétrospective vérifiable, condition conservée après départ du lapin, réclamation unique et refus sans mutation.
- Comptage des trois événements réels, exclusion des récompenses/imports/refus, récolte d'une production prête avant le cycle, progression au-delà du seuil sans double comptage.
- Frontière exacte de 24 h, référence indépendante de minuit, longue absence et équivalence avec reprises multiples, horloge reculée, expiration des récompenses et bonus non réclamés.
- Bonus seulement après les trois réclamations, cadeau indépendant inchangé, réclamations obsolètes refusées.
- Migrations v1/v2, vraie sauvegarde avec résultat réservé et fractions, aucune redotation v2, sauvegarde/relance des claims, échecs d'écriture et copie de migration, annulation/import sans fusion, validation des états incohérents.
- Quatre parcours HTML nouveaux : principales et raccourci sans dépense, réclamation/double pression, trois quotidiennes puis bonus/renouvellement, ancien callback invalidé à l'import, isolation du mode développement. Ces éléments sont regroupés en quatre tests.

La vérification TypeScript a signalé deux problèmes dans le nouveau fichier de tests (import inutilisé et assertion volontaire d'un identifiant invalide) ; ils ont été corrigés avant l'exécution finale. Les premiers échecs d'attentes v2 ont été adaptés à la migration v3 sans changer les ressources ou comportements vérifiés.

Comparaison avec l'archive de l'étape 6 : **12 fichiers identiques**, dont configuration d'équilibrage, configuration visuelle, reproduction, cœurs, scène Phaser, sélection du canvas, gestes/caméra, portraits, outils de développement, démarrage, package et lockfile. Le nouveau CSS porte sur le bouton Missions, son indicateur et le retour de récompense ; compteurs et dimensions des panneaux existants sont conservés.

Build : 43 modules, JavaScript **1 352,63 ko minifié / 375,48 ko gzip**, CSS **6,91 ko**. L'avertissement de taille du bundle Phaser est non bloquant. L'avertissement npm de configuration `http-proxy` est propre à l'environnement et n'empêche pas les commandes.

Le navigateur disponible ne peut pas joindre le serveur, malgré Vite démarré. Les parcours HTML sont exécutés dans un **DOM simulé** : textes, boutons, commandes et état sont vérifiés, mais pas le rendu Safari ni le toucher physique. Aucune capture de jeu ni validation iPhone des missions n'est revendiquée.

## Test humain et limites ouvertes

Parcours court : `docs/missions-iphone-test.md`. Vérifier sur iPhone : emplacement du bouton sans gêne pour les compteurs, onglets/défilement, indicateur, récompenses uniques, absence de comptage des récompenses, bonus, expiration et reprise après arrière-plan/rechargement. Les nouvelles reproductions, dépenses de cœurs et export/import restent explicitement ouverts ; les anciens guides correspondants sont conservés et annotés.

Sur Windows :

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Sur l'iPhone du même réseau : adresse **Network** affichée par Vite avec **`?dev=1`**. Vérifier le badge de partie séparée avant tout redémarrage/import de test. Le scénario facultatif v2 de collection reste importable et permet de constater les principales proposées sans récompense automatique.

Les sauvegardes dépendent du protocole, domaine et port ; changement d'origine ou passage au futur HTTPS → export/import. Stockage local sans permanence garantie ni synchronisation entre onglets/appareils. Restaurer volontairement un ancien export restaure ses propres droits aux récompenses ; ce jeu solo sans serveur ne bloque pas cette manipulation.

Prochaine étape recommandée : valider les missions et les opérations encore ouvertes sur iPhone, puis concevoir un palier d'aménagement avec habitats spécialisés et objectifs de collection. Définir d'abord leurs coûts, capacités et liens avec les types, sans refonte de la caméra validée. Ce palier n'est pas implémenté ici.

## Historique

| Étape | Livré | Tests |
|---|---|---:|
| 1 | Socle et simulation | 38 |
| 2 | Sauvegarde locale et export/import | 76 |
| 3 | Interface jouable et outils de test | 100 |
| 4 | Perspective, cadrage et recentrage | 107 |
| 5 | Cœurs, transactions et migration v2 | 155 |
| 6 | Onze espèces, règles étendues et carnet | 187 |
| 7 — actuelle | Missions et migrations v3 | 230 |
