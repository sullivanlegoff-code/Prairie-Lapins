# Atelier cuisine — prototype isolé

## État actuel

Prototype disponible à **`/cooktap-prototype/`**, indépendant du jeu Prairie Lapins, et intégré au jeu principal (bâtiment Cuisine, choix du lapin, récompenses), voir « Intégration dans le jeu principal ». Trois recettes jouables : **Avocado toast**, **Moelleux au chocolat** et **Poulet soja-miel & patate douce**. Chaque recette n’affiche que les objets utiles.

Refonte du 1er novembre 2026 (demande du propriétaire, carte blanche sur le design) : la Salade est retirée, l’Avocado toast et le Moelleux sont ajoutés, et toute la cuisine est peinte (aliments, ustensiles, récipients dans chacun de leurs états, assiettes finales, décor de cuisine). Le gameplay reste le même geste : glisser un objet sur un autre.

## Déroulé des recettes

Chaque recette est une suite d’étapes déclarées dans `cooktap-prototype/recipes.ts` : `chains` (suites indépendantes que l’on peut entrelacer), puis `finale`. Une étape dit quel objet glisser (`actor`) sur quel autre (`target`), et ce qui change (`set` : états des objets ; `hide` : l’objet disparaît dans le récipient ; `cook` : cuisson). Le guide en haut montre l’étape suivante ; l’objet à déplacer flotte doucement et la cible est entourée.

- **Avocado toast** (ordre strict, voulu par le propriétaire) : avocat sur la planche → couteau sur l’avocat → avocat coupé dans le saladier → miel → sauce soja → échalote sur la planche → couteau → échalote dans le saladier → cuillère en bois pour mélanger → tartines dans la poêle (3 s de cuisson, elles arrivent seules sur l’assiette) → saladier sur l’assiette (avocat étalé) → saumon fumé sur l’assiette.
- **Moelleux au chocolat** : d’un côté chocolat puis beurre dans la casserole (fondus) ; de l’autre œufs, sucre puis fouet dans le saladier. Ensuite chocolat fondu dans le saladier → farine → fouet (pâte) → pâte dans le moule → moule au four (5 s).
- **Poulet soja-miel & patate douce** : poulet sur la planche → couteau → soja → miel → plat ; patate douce sur la planche → économe → couteau → plat (les deux préparations dans l’ordre voulu) ; plat au four (5 s).

Un seul aliment à la fois sur la planche. Les cuissons comptent du temps actif : elles se figent en portrait, en arrière-plan et lors des pauses. Un dépôt hors de l’ordre est refusé avec un message (« Pas encore : … ») et compte une action invalide ; une annulation de geste, une rotation ou une interruption n’en compte pas. Rejouer remet tout à zéro.

## Architecture

| Module | Responsabilité |
| --- | --- |
| `cooktap-prototype/recipes.ts` | objets (`ITEMS`), recettes, étapes, cuissons et disposition de chaque recette |
| `cooktap-prototype/engine.ts` | moteur d’étapes générique : source de vérité, validation, prévisualisation, cuisson active, guide |
| `cooktap-prototype/geometry.ts` | repère logique 1000×440, mise à l’échelle, hitboxes ; la cible d’un dépôt est l’objet visible sous le doigt que le moteur accepte |
| `cooktap-prototype/scene.ts` / `art.ts` | objets DOM, image peinte de l’état courant (`<art>-<état>`), étiquettes, vapeur, anneau de cuisson, effets |
| `cooktap-prototype/drag.ts` | Pointer Events, capture, seuil 7 px |
| `cooktap-prototype/main.ts` / `ui.ts` | orientation, visibilité, horloge active, guide d’étapes, choix de recette, résultat |

### Cuisine à deux lapins

Demande du propriétaire (1er novembre 2026) : on choisit d’abord le **commis** (toque), puis le **goûteur** (bavoir), deux lapins différents. Le commis reste sur son tabouret à gauche et réagit (saut à chaque étape, pattes sur les yeux tant que l’échalote est sur la planche, renifle le chocolat et le pain qui grille, s’impatiente devant le four) ; le goûteur attend à droite et goûte le plat à la fin (« Miam ! », cœurs). Avec un seul lapin dans la prairie, il est à la fois commis et goûteur ; si tous les autres lapins sont en voyage, « Cuisiner sans goûteur » reste possible.

Récompenses inchangées. La commande `rewardCuisine` reçoit `rabbitId` (commis) et `tasterId` facultatif : l’affection va à un seul des deux, tiré au sort par la source aléatoire du jeu, parmi ceux qui peuvent encore la recevoir aujourd’hui ; le résultat affiche « +1 Affection pour … » et un « +1 ♥ » au-dessus du gagnant. Aucune migration : la sauvegarde garde déjà l’affection de cuisine par lapin.

La toque (concept C) et le bavoir (concept A), choisis par le propriétaire, sont posés sur chaque sprite aux points de `src/config/cuisineAnchors.ts` (haut du crâne, cou, yeux), relevés espèce par espèce ; une espèce sans entrée reçoit un placement par défaut selon son orientation.

### Ce que disent les cuisiniers

Demande du propriétaire (1er novembre 2026) : le commis bouge moins et guide davantage. Tout est dans `src/ui/cuisineTalk.ts`, module pur piloté par l’horloge et l’état de la cuisine. Après plus de 2 secondes sans action, le commis dit l’étape suivante avec les mots du guide (bulle verte) ; la bulle reste stable, ressaute toutes les 4 secondes et disparaît dès que le joueur touche la cuisine. Sinon, il encourage une étape sur trois selon l’avancée (« Le plat est bientôt prêt ! ») et annonce la cuisson (« Prépare tes papilles, la masterclass arrive ! » au four). Le goûteur réagit parfois à une réussite (2e étape, puis toutes les 5), jamais quand le commis parle, et dit toujours « Miam ! » à la fin. Aucune phrase en « vous ». Rien ne parle pendant une pause (téléphone en portrait). Les tests sont dans `tests/cuisine-duo.test.ts` et `tests/cuisine-integration.test.ts` (horloge simulée).

### Le repas du goûteur

Demande du propriétaire (1er novembre 2026) : « au moins 3 secondes et amélioré ». À la fin d’une recette, l’assiette quitte la table et est servie au goûteur (au commis s’il cuisine seul). Il se penche et mâche, cinq bouchées vident l’assiette (masques CSS sur l’image peinte du plat, l’assiette vide peinte apparaît dessous, miettes à la couleur du plat), puis « Miam ! », des cœurs et un saut de joie ; le commis regarde, fier. « Miam ! » arrive à 3,9 s, la carte de résultat à 5 s ; un toucher sur la cuisine passe directement au résultat. Les récompenses ne changent pas et sont données une seule fois, dès la fin de la recette. Avec « réduire les animations » : assiette vide et « Miam ! » tout de suite, résultat à 1,6 s. Réglages dans `src/ui/CuisineActivity.ts` (`BITES`, `MEAL`, `CALM_MEAL`). Aucune nouvelle image.

### Images peintes

Les images ont été peintes avec ChatGPT le 1er novembre 2026 sur des planches à fond magenta. `scripts/prepare-cuisine-art.mjs` les prépare en deux temps : avec `--sources <dossier des planches>`, il détoure le magenta, découpe chaque planche par case et écrit les originaux dans `assets-source/cuisine/` ; sans option (avec `PLAYWRIGHT_MODULE`), il les réduit et les encode en WebP dans `cooktap-prototype/art/` avec `assets-source/cuisine/manifest.json`. Les planches d’origine restent hors Git (`output/imagegen/cuisine-v1/`). Le code charge les images par `import.meta.glob`, donc le jeu, le prototype autonome et les tests utilisent les mêmes fichiers.

### Montage réutilisable

`mountKitchen(host, options?)`, exporté par `cooktap-prototype/main.ts`, ne démarre rien à l’import. Le parent fournit un conteneur connecté et dimensionné ; le montage y ajoute sa propre section `.cuisine-root`, le contenu de `shell.html` et une feuille de style limitée à cette section. Les IDs internes sont fournis par le montage, jamais à reproduire dans l’application. Une seule instance active est prévue.

Le résultat expose `root`, `engine`, `scene`, `drag`, `refresh()` et `dispose()`. Les options existantes `portraitQuery` et `measureSurface` permettent notamment les contrôles automatisés. Appeler `dispose()` avant de retirer le conteneur : intervalle, écouteurs, capture/geste, frames, observateur et délais sont nettoyés ; seule la section possédée est retirée, avec sa feuille de style. Un second appel est sans effet. Un nouveau montage crée un moteur neuf.

`index.html` fournit seulement le conteneur autonome. `standalone.ts` appelle explicitement le montage et charge `standalone.css`, seul propriétaire des règles `html/body` et de la hauteur plein écran. Les styles réutilisables n’affectent aucun élément extérieur ; les noms d’animations sont préfixés `cuisine-`.

### Intégration dans le jeu principal

Parcours : Prairie → bâtiment Cuisine → « Entrer dans la Cuisine » → « Choisis ton lapin » → activité. L’ancienne entrée temporaire du Laboratoire a été retirée ; le bâtiment est l’unique accès. `GameUI` possède un dialogue plein écran `CuisineActivity`, placé hors du panneau reconstruit par les rendus passifs. Son hôte est stable ; un seul montage existe tant que le dialogue est ouvert. La Prairie est rendue inerte et le blocage existant `dialog[open]` protège ses entrées.

« Quitter Cuisine » ou Échap dispose le montage avant de fermer le dialogue, restaure les entrées et le panneau précédent. Rejouer et Choisir une recette restent internes à Cuisine. Remplacement de partie (import/recommencer) et destruction de l’interface ferment aussi l’activité ; aucun moteur précédent ne survit à une réouverture.

L’option `mountKitchen(..., {onRecipeCompleted})` reçoit une fois par réussite `{recipeId, activeTimeMs, invalidActions}`. Rejouer réarme cette notification pour la partie suivante. `GameUI` la transmet à son option `onCuisineCompleted` ; `CuisineActivity` expose aussi `onExit`. Aucun callback ne crédite de ressource ni n’écrit dans la sauvegarde : `GameUI` envoie la commande `rewardCuisine` (pièces selon la recette — Avocado toast 45, Moelleux 45, Poulet 60 — et +3 nourriture à chaque réussite ; +1 affection par lapin et +1 Cœur global à la première réussite du cycle canonique de 24 h), seule la simulation décide.

Les contrôles `docs/cuisine-integration-check.cjs` et `docs/cuisine-reward-flow-check.cjs <URL locale> <dossier hors Git>` partent d’une sauvegarde v12 générée par `docs/cuisine-seed.cjs` (Cuisine achetée, deux lapins) et passent par le bâtiment. Le premier exerce l’ouverture, un rendu passif réel, le blocage de la Prairie, les deux recettes, la sortie et la réouverture dans Chromium/WebKit. Il utilise les attentes de placement visuel du contrôle autonome et écrit captures/rapport uniquement dans le dossier fourni. Le second vérifie récompenses, Cœur, affection par lapin, rejeu, sortie, rechargement et absence d’erreur JS.

## Vérifications

Les tests `tests/cooking-prototype.test.ts` (recettes, moteur, géométrie, gestes) et `tests/cuisine-*.test.ts` (intégration, récompenses, sauvegarde) couvrent les trois recettes. Les anciens scripts navigateur `docs/cooking-prototype-check.cjs` et `docs/cuisine-integration-check.cjs` datent de la version Salade (zones de dépôt) et ne sont plus à jour ; `docs/cuisine-seed.cjs` et `docs/check-camera.cjs` restent utilisables pour ouvrir la Cuisine dans une partie générée.

## Test iPhone réel du prototype autonome (procédure)

Sur le même Wi-Fi que le PC, lancer `ipconfig`, puis depuis le dossier du projet :

```powershell
npm.cmd run preview -- --outDir netlify-site --port 5186 --strictPort
```

Dans Safari iPhone, ouvrir `http://<IPv4 Wi-Fi du PC>:5186/cooktap-prototype/`. Jouer les trois recettes et vérifier les objets faciles à saisir, la lisibilité du guide et des images, la visée des récipients, les cuissons, les pauses portrait/arrière-plan, le résultat et Rejouer. Vérifier paysage stable, cibles tactiles, safe areas, absence de défilement et d’objet coincé. Ne pas utiliser `localhost` sur l’iPhone. L’ouverture PWA en autonome depuis l’URL LAN HTTP dépend de Safari/iOS et n’est pas présumée.

## Provenance Cook Tap

Dépôt : [nascarjake/cooktap](https://github.com/nascarjake/cooktap), révision source `2d853495b03f837ef86bf20a591547bc1161a88f`, conservée uniquement pour audit sous `vendor/cooktap-original/`. README et `package.json` annoncent MIT, mais l’archive amont ne contient ni fichier LICENSE/COPYING ni avis de copyright explicite. Voir `vendor/COOKTAP-PROVENANCE.md`, `cooktap-prototype/public/NOTICE.txt` et `cooktap-prototype/public/MIT.txt` pour distinguer la déclaration amont de la notice MIT standard locale. Aucun asset graphique, police ou son amont n’est utilisé.

## Hors périmètre

Le moteur `KitchenEngine` reste indépendant des lapins, de l’économie et de la sauvegarde : récompenses et règles quotidiennes passent uniquement par la commande `rewardCuisine` côté jeu. Ne pas ajouter de recette, niveau, audio ni nouvelle règle économique sans demande distincte.
