# Passation

## 2026-10-19 · Codex — checkpoint île/caméra/projection/côte préparé, non commité

**Cette entrée décrit l'état courant ; les entrées suivantes sont historiques.** Branche locale `feature/purchasable-recipes`, dernier commit `aa69a4f feat: integrate rabbit cooking activity` : **Cuisine est terminée et déjà commitée**. Le jalon île/caméra/projection/côte reste **non commité**, y compris les réglages d'ancrage/libellés Nid/Nurserie/Cuisine, les tests et les helpers navigateur associés. Revue du diff et plan de commit local préparés ; cette tâche ne modifie que la passation, sans changement de code, stage, commit ou publication.

- **Départ et extensions** : nouvelles parties sur `southwest`, marqueur optionnel `islandStart: 'southwest'` en sauvegarde **v12**. Croissance vers le haut et la droite depuis le départ ; chaque achat doit partager un côté avec une parcelle possédée. Sans marqueur : sauvegarde legacy à départ centre, extensions libres conservées. Coordonnées logiques et footprints inchangés.
- **Côte directionnelle** : grande plage avant/bas, plage plus petite à gauche, bords discrets en haut/droite pour l'extension. La côte est visuelle, extérieure à la grille ; chaque parcelle constructible reste rectangulaire.
- **Passe terrain organique finale** : profils déterministes communs à l'herbe, la terre et le sable ; bosses/creux avant et gauche, coins adoucis, épaisseurs de strates variables et fin liseré chaud. Accents procéduraux très espacés (touffes, petites pierres, formes végétales basses), uniquement hors des cases, recalculés selon le voisinage. Les côtés devenus intérieurs perdent leur côte et leurs accents. Aucun nouvel asset raster, aucune couche de texture supplémentaire ; marges gauche/droite/haut/bas **60/24/20/76** et résolution maximale **1.8** conservées. Île complète : union exacte des rectangles possédés, sans réduction de surface constructible.
- **Caméra adaptative** : zoom/pan, vue d'ensemble jusqu'à 3 × 3 parcelles et Recentrer selon l'île possédée, les bâtiments, les plages avant/gauche et l'espace libre autour de l'interface. `readableZoom = 0.6`, plancher de cadrage proportionnel à `1 / √(nombre de parcelles)` ; aucun réglage caméra supplémentaire nécessaire pour B.
- **Projection approuvée** : affine 2D `S = C + A · (P − C)`, **θ = 4°, q = 0.84** (`src/config/visual.ts`, `src/ui/projection.ts`). Helpers `toScreen`, `toGround`, `screenBounds`, `groundBounds` ; les taps et placements reviennent aux coordonnées historiques par la transformation inverse. Cette vue devient la baseline avant la prochaine phase visuelle.
- **Rendu séparé** : couche **ground** projetée pour terrain, plages, grilles, footprints et contours d'extension ; couche **upright** pour bâtiments, lapins, décorations, labels, ghosts, bulles et marqueurs lisibles, droits à leurs ancrages projetés. Réglages artistiques Nid/Nurserie/Cuisine conservés.
- **Validation iPhone** : le propriétaire a validé la vue/projection sur iPhone réel et jugé la côte organique intermédiaire clairement meilleure. La toute dernière passe de strates et d'accents n'a pas encore de confirmation iPhone explicite. Aucun retour ne confirme le mode standalone.
- **Vérifications de cette tâche** : `npm.cmd test -- --maxWorkers=1` **1314/1314** (68 fichiers), `npm.cmd run typecheck` et `git diff --check` réussis. Les tests de côte couvrent les **511 possessions non vides**, les surfaces remplies et accents hors herbe possédée, les marges, le déterminisme, l'ordre d'achat et les contacts diagonaux. Navigateur et build non relancés pendant cette revue de checkpoint. La dernière passe Chromium complet a réussi sur neuf scènes : départ 844 × 390 et 667 × 375, deux parcelles, L, 2 × 2, île complète, legacy centre, legacy détaché et extension ; taps, placements avant/gauche/angle avant-gauche, pinch/zoom/pan et Recentrer contrôlés ; raccords à zoom **1.65**, 60 échantillons sur trois positions, et capture de côte à fort zoom. Ce contrôle ciblé et ses captures sont des artefacts temporaires hors dépôt ; les helpers navigateur versionnables utilisent `docs/screen-points.ts` pour les coordonnées projetées.
- **Dette visuelle restante** : la masse de l'île complète reste globalement rectangulaire, contrainte par les cases et les marges conservées. Bâtiments encore conçus selon les anciens angles (dont jardin du Nid et bases Ferme/Nurserie/Cuisine) ; habitat/enclos à redessiner plus tard. Aucun chantier de refonte des bâtiments commencé ; conserver l'angle approuvé.
- **Incohérence connue, sans correction ici** : le texte d'aide d'extension annonce encore « neuf cases » (`src/ui/GameUI.ts`), alors que les parcelles actuelles sont de 4 × 4, soit 16 cases. Les anciennes versions et anciens comptes de tests ci-dessous décrivent leurs dates respectives.

## 2026-10-19 · Claude Code — état canonique : Cuisine terminée, prête au commit (HISTORIQUE)

**Cette entrée est la seule description de l'état courant.** Toutes les entrées datées qui suivent (y compris la « synthèse de reprise » Codex du 2026-10-18 et l'ancien bloc « État du dépôt à transmettre » du 2026-10-17) sont **historiques** : elles décrivent l'état au moment de leur rédaction, et leurs « reste à faire », « non implémenté » ou versions de sauvegarde ne s'appliquent plus.

**Cuisine est fonctionnellement complète** et validée physiquement par le propriétaire sur iPhone réel : bâtiment, choix du lapin, lapin dans la scène et ses réactions, dégustation, deux recettes, récompenses, interface. Dernier commit inchangé : `04fdde4` ; tout le travail ci-dessous est non commité. Sauvegarde courante : **v12**.

- **Récapitulatif fonctionnel** : bâtiment Cuisine dans la Prairie (empreinte 4 × 4, illustration PNG) ; deux recettes seulement, Salade fraîche et Poulet soja-miel ; lapin choisi avant de cuisiner, visible dans la scène pendant toute l'activité et réagissant aux actions ; plat fini présenté, saut du lapin, « Miam ! », 5 cœurs ; +50 pièces et +3 herbes à chaque réussite ; +1 affection à la première réussite éligible d'un lapin dans le cycle ; **+1 Cœur à la première réussite Cuisine du cycle, tous lapins confondus (implémenté)** ; intérieur, interface et art finalisés ; aucune entrée Laboratoire.

- **Bâtiment** : `kitchen`, « Cuisine », 100 pièces, maximum 1, empreinte **4 × 4 inchangée**. Illustration `public/assets/buildings/kitchen-chef-lapin.png` (768 × 711, alpha), tirée de `docs/art-references/cuisine-chef-lapin.png.png` : fond vert rendu transparent et recadré, pixels conservés. Réglages dans `src/config/kitchenArt.ts` (largeur 177, ancrage vertical abaissé de 18 unités, libellé à +86), branchés dans `MeadowScene` comme Ferme/Nid/Nurserie. Sélection par l'empreinte (règle commune) : toit et cheminée au-dessus ne sont pas cliquables, comme pour le Nid. L'ancien dessin procédural `drawKitchen()` a été supprimé.
- **Parcours** : Prairie → Cuisine → « Entrer dans la Cuisine » → choix d'un lapin possédé → recette → résultat → Rejouer / Choisir une recette / Quitter. L'entrée temporaire du Laboratoire est supprimée.
- **Lapin** : portrait et nom dans la barre du haut ; le même lapin (image de son espèce, tourné vers le plan de travail) est assis sur un tabouret à gauche du plan de travail pendant toute l'activité (`.cuisine-chef`, posé par `CuisineActivity`, sans interaction ; `KitchenEngine` reste indépendant des lapins). Réactions : hochement (action réussie), secousse (erreur), joie (réussite).
- **Dégustation finale** (2 s) : le plat fini glisse jusqu'au lapin, deux sauts, bulle « Miam ! », 5 cœurs ; la carte de résultat attend la fin. Rejouer, Choisir une recette, Quitter et la destruction de l'UI nettoient nœuds et minuteurs.
- **Recettes** : Salade fraîche et Poulet soja-miel uniquement. Intérieur, objets et interface aux couleurs de la Maison du Chef Lapin ; positions, zones de dépôt et gestes inchangés.
- **Récompenses** (`rewardCuisine`) : chaque réussite +50 pièces et +3 herbes ; +1 affection pour la première réussite de ce lapin dans le cycle quotidien canonique (plafond 20) ; +1 Cœur pour la première réussite Cuisine du cycle, tous lapins confondus. Sauvegarde **v12** : `cuisine: {affectionCycles, heartCycle}`.
- **Contrôles navigateur** : `docs/cuisine-integration-check.cjs`, `docs/cuisine-reward-flow-check.cjs` (sauvegarde de départ `docs/cuisine-seed.cjs`), `docs/cooking-prototype-check.cjs` pour la version autonome.
- **Vérifications** : suite complète 1266/1266 (64 fichiers, `--maxWorkers=1`), typecheck et `build:netlify` réussis ; Chromium + WebKit Windows : autonome 356/356, intégration 46/46, récompenses 50/50. iPhone : accepté par le propriétaire. Relancé le 2026-10-19 après la mise à jour de la documentation : `npm.cmd test -- --maxWorkers=1` **1266/1266** (64 fichiers), `npm.cmd run typecheck` et `git diff --check` réussis ; navigateur non relancé (aucun code source touché).
- **Reste** : aucun travail Cuisine. Seul reste le commit local de ce travail, sur demande explicite du propriétaire ; `../.gitignore`, `docs/_debug-guided.cjs` et la source `docs/art-references/cuisine-chef-lapin.png.png` restent exclus sauf décision du propriétaire.

## 2026-10-18 · Codex → Claude Code — état de reprise (HISTORIQUE)

> **Historique.** Cette synthèse a été rédigée avant le Cœur quotidien, l'illustration PNG, le lapin dans la scène et la dégustation. Elle est remplacée par l'entrée canonique en tête de fichier. En particulier, ses sections 9, 10, 11 et 12 ne décrivent plus l'état courant (voir les notes « Mis à jour » insérées ci-dessous).

Passation documentaire seulement : état Git et points d'entrée relus, aucun changement de source/gameplay, aucun test/build/navigateur relancé, aucun commit. Dernier commit : `04fdde4`. Les notes historiques ci-dessous décrivent leurs étapes respectives ; le code actuel prime (sauvegarde v12).

### 1. Résumé du projet

**Prairie Lapins** est un jeu mobile de collection et de progression de lapins, dans une philosophie de collection/gestion comparable à DragonVale. Priorité actuelle : intégrer progressivement l'activité Cuisine au jeu principal. Fiction : le joueur manipule les objets pour aider son lapin choisi à cuisiner.

Méthode : **petite étape vérifiable → tests ciblés → compte rendu → étape suivante**. Ne pas recommencer l'audit global, reconstruire Cuisine ou refondre le projet pour élégance. Un seul agent travaille dans le dépôt à la fois ; Codex passe la main à Claude Code.

### 2. Architecture principale

- Phaser 3 + TypeScript + Vite. `src/main.ts` monte `GameController`, `MeadowScene` et `GameUI`, et détruit l'UI avant les autres présentations lors du nettoyage.
- `src/display/MeadowScene.ts:MeadowScene` rend la Prairie ; `tap()` résout les sélections, transmises à `GameUI.select()`. Les dialogues ouverts, la boutique plein écran et le portrait bloquent déjà les entrées monde (`src/main.ts`).
- `src/ui/GameUI.ts:GameUI` possède les panneaux DOM et leur navigation `View`/historique en mémoire. `render()` reconstruit le contenu ordinaire avec `replaceChildren()` ; ne jamais y placer une activité Cuisine vivante.
- `src/application/GameController.ts:perform()` est la frontière canonique des commandes, état mutable, notifications et sauvegarde. `finishAction()` peut enregistrer le candidat avant adoption ; `rewardCuisine` utilise ce chemin. Un échec ne valide pas de gain partiel.
- `src/simulation/actions.ts:act()/runAction()` applique les commandes sur une copie avancée au temps courant, avec refus atomique ; helper `credit()` protège les soldes. `src/state/types.ts` définit `GameState`, `Rabbit`, `Command`, `ActionResult`, `CuisineReward` ; `src/state/initial.ts:createGame()` fournit les défauts.
- `src/persistence/json.ts` : Zod strict/versionné, `encodeGame()`/`decodeGame()` et migrations ; `src/persistence/storage.ts` : contrat `SaveStorage`, clé active historique `prairie-lapins.save.v1` (la clé ne désigne pas la version du schéma). Persistance navigateur locale via le contrôleur ; pas de nouvelle couche de stockage Cuisine.

### 3. Minijeu Cuisine : déjà fonctionnel

Deux recettes jouables : **Salade** et **Poulet soja-miel & patate douce**. Règles transitoires dans `cooktap-prototype/engine.ts:KitchenEngine`, définitions/règles dans `recipes.ts`, Pointer Events/capture/annulations dans `drag.ts`, positions/hit-tests dans `geometry.ts`, rendu et effets dans `scene.ts`/`art.ts`, écrans dans `ui.ts`.

- Salade : mozzarella/tomate/concombre → planche → couteau → saladier ; huile d'olive **glissée-déposée sur le saladier prêt**, puis résultat, Rejouer, Choisir une recette.
- Poulet : morceaux de poulet → planche → couteau → soja → miel ; soja/miel **glissés-déposés sur le poulet**, dans cet ordre. Patate douce entière → planche → économe → couteau. Planche exclusive à un aliment. Les deux préparations rejoignent le même plat, dans l'un ou l'autre ordre ; seuls les aliments prêts sont admis et deviennent non interactifs.
- Plat complet déplaçable vers le four ; environ **5 secondes de temps actif**. Portrait, document masqué et pauses existantes gèlent le temps. Cuisson complète automatiquement la recette ; résultat avec temps actif/erreurs, rejeu et choix.
- Correctifs déjà terminés : plat incomplet immobile (éligibilité réelle `engine.canDrag()`), contenu suivant le plat pendant le drag, plat/barre de progression visibles au four. Les bouteilles ne versent plus par tap, suivent le pointeur et reviennent à leur réserve après usage/refus. Annulations techniques sans erreur de gameplay.

**Ne pas réimplémenter ces points ni modifier le gameplay en ajoutant des récompenses.**

### 4. Frontière de montage réutilisable

`cooktap-prototype/main.ts:mountKitchen(host, options?)` possède son sous-arbre (`shell.html`), son moteur et ses styles, et retourne notamment `root`, `engine`, `refresh()` et `dispose()` idempotent. L'hôte doit être connecté/dimensionné. L'import ne monte rien. `standalone.ts` effectue le bootstrap explicite de `/cooktap-prototype/` ; `standalone.css` porte les resets de page. CSS réutilisable sous `.cuisine-root`, animations préfixées ; pas de resets `html/body` importés dans le jeu.

Nettoyage : intervalle, ResizeObserver, écouteurs orientation/resize/visualViewport/visibilité/pagehide/pageshow, Pointer Events/capture/frames, effets et messages temporisés, UI et DOM/styles possédés. Ne pas ajouter un second système de pointeurs ni laisser des timers survivre à la sortie.

`onRecipeCompleted({recipeId, activeTimeMs, invalidActions})` est verrouillé **avant** notification, une fois par run ; Replay/nouveau choix réarme le verrou. `onPresentationEvent(success | invalid | reset | complete)` observe les changements effectivement engagés, sans nouvelle validation métier. Aucun de ces callbacks ne connaît lapins ou économie.

`src/ui/CuisineActivity.ts:mountCuisineActivity()` crée le dialogue stable plein écran, **hors du contenu reconstruit de GameUI**. `open(rabbit)` monte une seule instance, `close()` dispose avant fermeture, `dispose()` nettoie l'hôte. `#app.inert` + gate existante `dialog[open]` bloquent la Prairie ; sortie explicite « Quitter Cuisine »/Échap et restauration des entrées. Import/restart/remplacement et destruction UI ferment l'activité. Replay/Choisir une recette restent internes, distincts de quitter l'activité.

### 5. Intégration principale déjà présente

Parcours : **Prairie → bâtiment Cuisine → Entrer dans la Cuisine → Choisis ton lapin → individu choisi → activité → complétion/récompenses/résultat → Quitter → contexte du bâtiment/Prairie**.

Bâtiment `kitchen`, nom « Cuisine », prix **provisoire 100 pièces**, maximum **1**, empreinte **4 × 4** ; achat dans Bâtiments et décorations. Config/type dans `src/config/balance.ts`, nom dans `src/ui/models.ts`, placement générique dans `src/simulation/placement.ts`, rendu procédural provisoire dans `src/display/buildingArt.ts:drawBuildingArt()` (maison/toit/cheminée/enseigne casserole). Texture et aperçu utilisés par MeadowScene. Persistant, sélectionnable, déplaçable ; ni nurserie implicite ni XP d'habitat attribué à sa construction.

Le panneau garde « Déplacer ce bâtiment ». `GameUI.openCuisine()` ouvre le choix du lapin ; la sélection restaure le panneau d'origine derrière l'activité. **L'entrée temporaire du Laboratoire a été retirée (2026-10-18, Claude Code)** : `#open-cuisine-preview` et son écouteur n'existent plus ; le bâtiment Cuisine est l'unique accès. Les contrôles navigateur (`docs/cuisine-integration-check.cjs`, `docs/cuisine-reward-flow-check.cjs`) partent d'une sauvegarde v12 de `docs/cuisine-seed.cjs` (Cuisine + deux lapins) et passent par le bâtiment.

### 6. Lapin : sélection, identité, présentation

- Liste = `GameState.rabbits`, individus possédés. Identité = **exact `Rabbit.id`**, jamais l'espèce (plusieurs individus peuvent partager une espèce). Ne pas supposer un préfixe `rabbit-` ; les tests emploient aussi `birth-*`.
- Panneau `View.kind = 'cuisineRabbit'`, titre « Choisis ton lapin » : portrait, nom d'espèce, affection, ID complet pour distinguer les individus. Liste vide : message, pas de création automatique ; possession revérifiée au clic.
- Hôte : `CuisineRabbit = Readonly<Pick<Rabbit, 'id' | 'species'>>`, copie gelée transitoire exposée par `selectedRabbit`. Aucun choix persistant. Effacé à sortie/dispose/échec ; garde la session à travers Replay et Choisir une recette.
- `src/ui/portraits.ts:portrait(species)` réutilise les PNG configurés dans `src/config/rabbitArt.ts` ou le SVG de repli ; `SPECIES[species].name` fournit le nom. Affichage compact 40 × 40 dans la barre hôte, à gauche de Quitter, au-dessus du plan de travail ; pas d'ID affiché. Bloc et descendants `pointer-events: none`, aucune géométrie ou zone tactile changée. CSS dans `src/display/styles.css`.
- Réactions déjà présentes : `idle`, `positive`, `mistake`, `celebrate`. Positive après préparation/assaisonnement/insertion réellement engagés ; mistake après hausse du compteur réel d'erreurs, jamais après annulation technique. Réactions brèves **550 ms**, timer unique possédé/nettoyé par l'hôte. Celebrate reste au résultat ; reset/choix/nouveau run restaure idle. Fonds et petits mouvements du seul portrait ; reduced-motion supprime les mouvements. Aucun artwork nouveau ni logique lapin dans KitchenEngine.

### 7. Récompense de base déjà présente

`src/config/balance.ts:CUISINE_REWARD = {pattes: 50, grass: 3}` : valeurs provisoires uniques pour **chaque réussite**, quelle que soit la recette. Champs canoniques : pièces = `pattes`, herbes = `grass`.

Commande : `{type: 'rewardCuisine', rabbitId, recipeId}` (`src/state/types.ts`). Le callback intégré dans le constructeur de GameUI lit l'individu de la session, appelle `GameController.perform()`, puis présente le résultat sauvegardé. La simulation valide individu/recette et crédite via `credit()` ; l'hôte et KitchenEngine n'écrivent jamais les soldes/localStorage.

Le callback unique du run empêche les doubles versements sur ticks/rendus ; Replay réussi autorise un nouveau versement. **La commande interne n'est pas une preuve autonome de réussite ni une API de déduplication persistante** : préserver ce branchement de complétion, ne pas le remplacer par une récompense dans render(). En cas de sauvegarde refusée, aucun candidat adopté ; feedback « Récompense non enregistrée », pas de faux gain confirmé ni de retry automatique au rendu.

`CuisineActivity` affiche le texte retourné dans `.cuisine-reward-feedback` du résultat, retiré au reset. `src/display/currency.ts:setCurrencyText()` remplace le mot interne `pattes` par une icône pièce ; conserver cette convention d'affichage.

### 8. Affection Cuisine quotidienne déjà présente

État sauvegardé **v12** :

```ts
cuisine: {
  affectionCycles: Record<string, number>
}
```

`src/persistence/json.ts:v12` exige cette section, valide les cycles entiers sûrs/non négatifs et refuse un cycle supérieur au cycle courant des missions. Défaut vide dans `createGame()`. v11 → v12 ajoute uniquement cette section ; v1–v10 conservent leurs migrations existantes, dont le remap géométrique historique, puis arrivent en v12 vide. La migration v11 conserve ressources/coordonnées. Backup local de l'ancien JSON via `CUISINE_MIGRATION_BACKUP_KEY` = `prairie-lapins.backup.before-v12`, avant écriture de la clé active ; `GameController.migrationBackup()` connaît cette clé. Ce sont des clés de stockage, pas des fichiers à déplacer/supprimer. `presentationId` reste reconnu en v12.

Cycle canonique : `src/simulation/missions.ts:cycleIndexAt(referenceAt, now) = floor(max(0, now-referenceAt) / MISSION_CYCLE_DURATION)` ; `MISSION_CYCLE_DURATION` vaut 24 h. `updateMissions()` synchronise `missions.daily.cycleIndex`. `rewardCuisine` intervient après `advance`, utilise cet index enregistré ; **ni minuit local, ni minuit UTC, ni second compteur de jours**.

Première réussite d'un individu dans ce cycle : +1 affection sous `BALANCE.maxAffection` (20). Même individu/même cycle : aucune affection supplémentaire. Autre individu, même espèce comprise : sa propre éligibilité. Cycle suivant : éligible à nouveau. Occasion consommée même déjà à 20 ; aucun dépassement. **+50 pièces/+3 herbes restent attribués à chaque réussite.** Ne pas appeler `feed` : aucun coût d'herbes, XP de nourrissage ou récompense Cœur ajouté.

Transaction unique `rewardCuisine` : ressources + affection éventuelle + marqueur, avec rollback sur refus/échec d'enregistrement. `ActionResult` réussi expose `cuisineReward: {pattes, grass, affectionGranted, affectionAtCap}` ; l'UI ne recalcule pas l'éligibilité, affiche seulement le +1 réel ou « Affection maximale ».

Nuance existante à conserver : la mission `first-meal` est fondée sur le seuil d'affection et devient naturellement complète à 2, même via Cuisine. Ce n'est pas un appel à feed ; aucun XP ni progression quotidienne de nourrissage attribué par cette commande.

### 9. Cœur quotidien global (implémenté) et suites produit

**Cœur quotidien global Cuisine : implémenté (2026-10-18, Claude Code, non commité).** `cuisine` devient `{affectionCycles, heartCycle: number | null}` (toujours v12, version non incrémentée car v12 n'est pas publiée ; un v12 sans `heartCycle` est lu comme `null`). `rewardCuisine` accorde +1 Cœur (`credit('hearts', 1)`) à la première réussite du cycle `missions.daily.cycleIndex`, tous lapins confondus, dans la même transaction atomique ; `cuisineReward.heartGranted` pilote la ligne « +1 Cœur » du résultat. Indépendant de l'affection ; pièces/herbes à chaque run. Assertions existantes adaptées (forme `cuisine`, `hearts` +1) : `tests/cuisine-integration.test.ts`, `tests/progression-save.test.ts`, `tests/cuisine-persistence.test.ts`, `tests/cuisine-rewards.test.ts`. Suite complète à ce moment-là : 122 échecs dans 18 autres fichiers (attentes v11 / schémas legacy rejetant `cuisine`), dus au passage v12 antérieur. *Mis à jour : ces fixtures ont depuis été adaptées à v12 et la suite complète passe (voir l'entrée canonique).*

*Mis à jour : finition du résultat, validation navigateur et iPhone du parcours final, polish du bâtiment et du minijeu sont terminés.* Restent seulement l'équilibrage futur recettes/progression/économie, hors Cuisine, et le commit local **sur demande explicite du propriétaire**.

### 10. Git et protections

Projet actif/cwd : `C:\Users\sulli\Documents\Project-L\prairie-lapins-prototype`. Racine Git vérifiée : `C:\Users\sulli\Documents\Project-L`. Branche : `feature/purchasable-recipes`. HEAD `04fdde4 feat: add chicken and sweet potato recipe` ; les sept précédents sont `0d7421b`, `5a7c89c`, `799fc5f`, `cab49fc`, `661ab84`, `8ca8f7e`, `a7bf93b`.

*Mis à jour : la liste ci-dessous est un instantané historique ; elle ne correspond plus à l'arbre de travail actuel (plus de fichiers Cuisine, `src/display/buildingArt.ts` et `index.html` non modifiés, `../.claude/` absent du statut).*

**Tous les changements ci-dessous préexistent à cette passation ; seul ce document est enrichi ici.** Ils contiennent du travail Cuisine validé, non commité : ne pas réinitialiser, écarter ou nettoyer en masse. Pas de `git reset --hard`. Ne jamais stage/delete/revert/nettoyer `../.gitignore`, `../.claude/`, `docs/_debug-guided.cjs` sans ordre explicite. Avertissement d'accès refusé `C:\Users\sulli\.config\git\ignore` connu : ne pas réparer la configuration Git.

État `git status --short` vérifié depuis le projet :

```text
 M ../.gitignore
 M cooktap-prototype/drag.ts
 M cooktap-prototype/engine.ts
 M cooktap-prototype/geometry.ts
 M cooktap-prototype/index.html
 M cooktap-prototype/main.ts
 M cooktap-prototype/recipes.ts
 M cooktap-prototype/scene.ts
 M cooktap-prototype/style.css
 M docs/cooking-minigame.md
 M docs/cooking-prototype-check.cjs
 M docs/progress.md
 M index.html
 M scripts/build-pages.mjs
 M src/application/GameController.ts
 M src/config/balance.ts
 M src/display/buildingArt.ts
 M src/display/stone-buttons.css
 M src/display/styles.css
 M src/main.ts
 M src/persistence/json.ts
 M src/persistence/storage.ts
 M src/simulation/actions.ts
 M src/simulation/starterBuildings.ts
 M src/state/initial.ts
 M src/state/types.ts
 M src/ui/GameUI.ts
 M src/ui/models.ts
 M tests/buildings-v7.test.ts
 M tests/cooking-prototype.test.ts
 M tests/progression-save.test.ts
 M tests/ui-dom.test.ts
 M vite.config.ts
?? ../.claude/
?? cooktap-prototype/shell.html
?? cooktap-prototype/standalone.css
?? cooktap-prototype/standalone.ts
?? docs/_debug-guided.cjs
?? docs/cuisine-integration-check.cjs
?? src/ui/CuisineActivity.ts
?? tests/cuisine-integration.test.ts
?? tests/cuisine-persistence.test.ts
?? tests/cuisine-rewards.test.ts
?? tests/kitchen-building.test.ts
```

Pas de commit sans demande explicite (prime sur la règle générale de commit AGENTS). Pas d'opération GitHub : compte suspendu. Pas de publication Netlify sans autorisation ; builds/tests locaux seulement. Supabase/comptes/emails en pause. Lire la Passation et Git au démarrage, préserver les modifications ; mettre à jour cette section en fin de prochaine tâche.

### 11. Validation acquise et limites

Résultats **historiques réellement obtenus**, pas de nouvelles exécutions pendant cette passation :

- Minijeu autonome : **51 tests Cuisine** lors des dernières exécutions complètes du fichier. Recettes/Pointer Events/bouteilles/four/pause/cleanup couverts. Avant les derniers ajouts économiques, Cuisine + intégration réactions : **64/64** (51 + 13).
- Intégration de base : **46 contrôles navigateur** (23 Chromium tactile CDP, 23 WebKit Windows souris Pointer Events) sur build, deux recettes complètes, sorties/réouverture, stabilité du host et blocage Prairie. Autonome : **356 contrôles**, 178 par navigateur, sur build. Ces validations précèdent bâtiment/choix du lapin et récompenses finaux ; ne pas les présenter comme validation navigateur de v12.
- Le propriétaire a confirmé les deux recettes du prototype sur **vrai iPhone** avant les étapes d'intégration ultérieures. Ne pas revendiquer un test iPhone du parcours final bâtiment → lapin → réactions → récompenses v12. WebKit Windows ne vaut pas Safari iPhone.
- Portrait statique Chromium : 844 × 390 et 667 × 375 ; chargé, hors surface, pointer-events none. Réactions Chromium 844 × 390 : coupe/erreur, retour idle, reduced-motion, dimensions stables, aucune erreur JS. Artefacts temporaires historiques `prairie-cuisine-portrait-qBWAUx` et `prairie-cuisine-reactions-2v2qBf` sous `%TEMP%`, pas dans Git.
- Récompenses de base avant affection : **104/104** ciblés (Cuisine 51, intégration 16, contrôleur 32, récompenses 5), typecheck réussi.
- **Dernière validation v12** : `npm.cmd test -- tests/cuisine-rewards.test.ts tests/cuisine-persistence.test.ts tests/progression-save.test.ts --maxWorkers=1` : **40/40** (7 + 4 + 29). `npm.cmd test -- tests/cuisine-integration.test.ts --maxWorkers=1 -t 'base reward|rewards each run|save fails|cap feedback'` : **5/5**, 12 ignorés. Cycle exact/individus identiques/plafond/ressources/Hearts inchangés/absence feed XP/roundtrip/rechargement/migrations v8-v11/backups/refus atomiques et échec de sauvegarde testés. `npm.cmd run typecheck` réussi ; `git diff --check` réussi à chaque étape.
- Tests à connaître : `tests/cooking-prototype.test.ts`, `tests/cuisine-integration.test.ts`, `tests/cuisine-rewards.test.ts`, `tests/cuisine-persistence.test.ts`, `tests/progression-save.test.ts`, `tests/kitchen-building.test.ts`, `tests/buildings-v7.test.ts`, `tests/ui-dom.test.ts`.
- **Limites connues à ne pas masquer** : suite globale non relancée après v12 ; d'autres anciens tests/fixtures attendent encore explicitement v11 ou fabriquent des sauvegardes historiques par spread d'un état courant (il faut alors omettre `cuisine` du format ancien). Adapter attentes/fixtures à la nouvelle version sans affaiblir leurs garanties ; ce n'est pas une raison de supprimer la validation stricte. `docs/cuisine-integration-check.cjs` inclut le choix du lapin mais affirme encore « no currency or rabbit rewards » : mettre à jour cette attente avant réutilisation, ne pas supprimer l'assertion sans remplacement. Pas de browser/build/iPhone global après les dernières récompenses. Aucun serveur lancé pour cette passation.

*Mis à jour : ces limites sont levées. La suite globale passe en v12, l'assertion « no currency or rabbit rewards » n'existe plus dans `docs/cuisine-integration-check.cjs`, et les récompenses (pièces, herbes, affection, Cœur) sont vérifiées par `docs/cuisine-reward-flow-check.cjs`. Navigateur, build et iPhone du parcours final ont été validés.*

### 12. Prochaine tâche recommandée à l'époque : Cœur Cuisine quotidien — RÉALISÉE

*Mis à jour : le Cœur Cuisine quotidien global est **implémenté** (`cuisine.heartCycle`, `rewardCuisine` dans `src/simulation/actions.ts`, tests `cuisine-rewards`, `cuisine-persistence`, `cuisine-integration`). Ce n'est plus une tâche à faire.* Spécification d'origine, conservée pour mémoire : marqueur global persistant, même cycle canonique des missions, +1 Cœur à la première réussite du cycle tous lapins confondus, pièces/herbes et affection par individu inchangées.

## 2026-10-18 · Codex — affection Cuisine une fois par individu et cycle canonique

- Dernier commit inchangé : `04fdde4`. Aucun commit/staging/publication ; changements précédents et fichiers protégés préservés. Aucun Cœur Cuisine, marqueur global, XP, coût d'herbe, appel feed, variation par recette ni nouveau calendrier.
- Sauvegarde **v12**, section obligatoire `cuisine: {affectionCycles: Record<string, number>}` ; clés = ID individuel exact, valeur = dernier index de cycle consommé. Nouveaux jeux : dictionnaire vide. v11 → v12 ajoute seulement cette section ; anciens chemins géométriques restent inchangés et arrivent en v12 avec la section vide. Schéma strict, cycles entiers sûrs/non négatifs et pas de cycle futur. Backup v11 dédié `prairie-lapins.backup.before-v12`, lecture/récupération contrôleur compatibles ; métadonnée presentationId reconnue en v12. Signature du helper historique de bâtiments exclut aussi Cuisine, sans changement de comportement.
- `rewardCuisine` travaille sur la copie atomique après `advance`, donc utilise `missions.daily.cycleIndex` déjà synchronisé par `cycleIndexAt(referenceAt, now)` : cycles de 24 h ancrés sur la référence sauvée, aucun minuit local/UTC. Première réussite par ID/cycle : affection +1 sous `BALANCE.maxAffection` ; même au plafond 20, marqueur consommé. Réussites suivantes : pièces/herbes conservées, pas de seconde affection. Retour structuré `cuisineReward: {pattes, grass, affectionGranted, affectionAtCap}` ; UI affiche les montants et seulement le +1 réel, ou Affection maximale.
- Tests `cuisine-rewards`, `cuisine-persistence`, `progression-save` : **40/40** ; sélection récompense/feedback de `cuisine-integration` : **5/5** (12 autres ignorés). Typecheck réussi. Frontière exacte 24 h avec référence non minuit, deux individus même espèce aux IDs `birth-*`, plafond et consommation, ressources à chaque run, Cœurs/XP inchangés, roundtrip/rechargement, migration réelle v8/v11, backups et refus atomiques/échec stockage couverts. Les assertions de version du test de persistance passent à 12 et sa fixture v8 omet explicitement Cuisine ; anciennes assertions de récompense sont ajustées aux effets nouvellement demandés, sans affaiblissement.
- Observation : la mission existante `first-meal` est fondée sur l'affection et devient naturellement complète à 2 ; conservée selon les règles canoniques, sans appel feed, sans XP ni progression quotidienne de nourrissage. Premier essai de fixture historique utilisait l'enveloppe du fichier au lieu de `saves.beginner`, corrigé. Typecheck initial a signalé le type historique de bâtiments, ajusté comme décrit ci-dessus.
- Non lancés : suite Vitest globale, autres suites navigateur/Cuisine, build, iPhone. Les tests historiques hors périmètre qui fabriquent d'anciennes sauvegardes depuis un état courant ou attendent explicitement v11 devront tenir compte de v12 lors de leur prochaine maintenance ; aucune exécution globale revendiquée. Le prochain Cœur quotidien pourra réutiliser ce cycle mais devra disposer d'un marqueur global séparé, non ajouté ici.

## 2026-10-18 · Codex — récompense Cuisine de base

- Dernier commit inchangé : `04fdde4`. Aucun commit/staging/publication ; travail précédent et fichiers protégés préservés. Aucune affection, XP, récompense Cœur, logique quotidienne ni évolution de schéma.
- Balance provisoire unique `CUISINE_REWARD` dans `src/config/balance.ts` : `pattes: 50`, `grass: 3`. Commande principale `rewardCuisine({rabbitId, recipeId})` valide individu possédé/recette connue puis crédite les deux ressources via `credit`, avec refus atomique si dépassement. Aucun lien moteur Cuisine/économie.
- `GameUI` reçoit la complétion unique du run, appelle `GameController.perform`, puis transmet l'observation existante. Commande ajoutée au chemin save-before-adopt du contrôleur : échec de sauvegarde ne valide aucun gain. L'hôte affiche seulement le message retourné dans le résultat, avec conversion pièce existante, ou un refus explicite ; feedback retiré au reset. Hôte ne modifie ni état ni stockage.
- Anti-doublon conservé au callback de complétion existant : latch avant notification, une fois par run, réarmé au rejeu/choix ; pas de marqueur persistant ni déduplication quotidienne. La commande seule est une commande interne de récompense, pas une preuve de réussite/revendication publique.
- Tests ciblés récompenses/intégration **21/21**, puis `npm.cmd test -- tests/cuisine-rewards.test.ts tests/cuisine-integration.test.ts tests/controller.test.ts tests/cooking-prototype.test.ts --maxWorkers=1` : **104/104**. Typecheck réussi. Salade/Poulet, ticks/rendus, rejeu/deux gains, aucune récompense à ouverture/erreur/sortie, ressources sauvegardées, lapins/Cœurs/XP inchangés, garde overflow/recette/individu et échec stockage vérifiés. Ancienne assertion état entièrement inchangé après deux réussites remplacée explicitement par état identique sauf les deux crédits attendus ; aucune assertion affaiblie pour contourner un échec.
- Non lancés : navigateur, build, suite globale, iPhone. Le harness navigateur historique `cuisine-integration-check.cjs` affirme encore l'absence de récompenses et devra être adapté avant sa prochaine exécution ; non exécuté ni modifié ici. Futur chantier quotidien/affection : préciser définition du jour et extension de sauvegarde séparément.

## 2026-10-18 · Codex — réactions légères du partenaire Cuisine

- Dernier commit inchangé : `04fdde4`. Aucun commit/staging/publication. Changements précédents et fichiers protégés préservés ; aucun changement de moteur, règles, récompense, affection, sauvegarde ou quotidien.
- `mountKitchen` expose un callback facultatif générique `onPresentationEvent(success | invalid | reset | complete)`, dérivé des snapshots engagés : préparation/flags modifiés ou insertion effective dans conteneur/four ; hausse réelle d'erreurs ; nouveau run/choix/rejeu ; passage à completed. Aucune validation dupliquée, aucun lapin dans le moteur, aucune réaction aux previews/sélections/mouvements/annulations techniques. Le montage autonome ne fournit pas ce callback et n'affiche toujours aucun lapin.
- L'hôte mappe ces événements sur `idle`, `positive`, `mistake`, `celebrate`. Fond doux et petit mouvement CSS du seul portrait ; aucune modification du layout/hitbox. Positive/mistake reviennent idle après 550 ms ; celebrate reste au résultat, rejeu/choix/démarrage rétablissent idle. Temporisation unique remplacée/effacée à reset, sortie, dispose et échec ; reduced-motion désactive les mouvements et conserve les fonds.
- Tests ciblés **2/2** ; `npm.cmd test -- tests/cuisine-integration.test.ts tests/cooking-prototype.test.ts --maxWorkers=1` : **64/64** (13 intégration + 51 Cuisine). `npm.cmd run typecheck` réussi. Couverture état initial, action positive/retour, erreur/retour, véritable pointercancel sans erreur/réaction, insertion, célébration persistante, rejeu/choix, absence de timer après dispose ; assertions précédentes conservées.
- Chromium local 844 × 390 : vraies interactions souris Pointer Events dans contexte tactile, coupe → positive, dépôt invalide → mistake, retours idle, reduced-motion et fermeture réussis ; bloc de même rectangle, portrait hors surface, pointer-events none, aucune erreur JS. Premier script échouait sur formats différents de DOMRect ; comparaison corrigée sans changement applicatif. Rapport/capture hors Git : `C:/Users/sulli/AppData/Local/Temp/prairie-cuisine-reactions-2v2qBf`. Vite port 5191 arrêté. Aucun essai physique iPhone revendiqué.
- Non lancés : WebKit, suite navigateur complète, build, suite Vitest globale, iPhone. Les futures récompenses nécessiteront leurs règles produit et leur intégration persistante séparées ; aucune implémentation engagée ici.

## 2026-10-18 · Codex — portrait statique du partenaire Cuisine

- Dernier commit inchangé : `04fdde4`. Aucun commit/staging/publication ; travail précédent et fichiers protégés préservés.
- `CuisineActivity` affiche le portrait existant `portrait(species)` et `SPECIES[species].name` à gauche de Quitter, dans la barre hôte déjà réservée au-dessus du plan de travail. Portrait compact 40 × 40, PNG configuré ou SVG de repli, aucun ID affiché. Bloc et descendants `pointer-events: none`, largeur limitée et nom repliable ; aucune géométrie/zone tactile déplacée. Présentation nettoyée à sortie/échec ; l'identité reste uniquement côté hôte, aucun changement moteur/recette/sauvegarde/récompense/affection/quotidien/réaction.
- Tests ciblés **2/2** ; `npm.cmd test -- tests/cuisine-integration.test.ts tests/cooking-prototype.test.ts --maxWorkers=1` : **62/62** (11 intégration + 51 Cuisine). Typecheck réussi. Tests contrôlent l'art exact PNG/SVG, nom/absence d'ID, nouveau lapin à la session suivante, CSS réel sans capture des pointeurs, nettoyage et absence de lapin dans le montage autonome. Vitest autorise désormais aussi `src/display/styles.css` pour tester ses propriétés réelles ; assertions non affaiblies. Premiers essais ont révélé une fixture à une seule espèce puis la neutralisation CSS Vitest, toutes deux corrigées.
- Smoke Chromium tactile local via Vite port 5191 : tailles **844 × 390** et **667 × 375**, portrait chargé, séparation des rectangles portrait/surface, pointeurs non interceptés, fermeture et aucune erreur JS. Capture 667 × 375 examinée. Script Node ad hoc envoyé sur stdin, sans fichier de harness ajouté ; rapport et deux captures hors dépôt : `C:/Users/sulli/AppData/Local/Temp/prairie-cuisine-portrait-qBWAUx`. Serveur arrêté. Aucun test physique iPhone revendiqué.
- Non lancés : WebKit, build, suite globale, validation navigateur complète, iPhone. Prochaine étape possible : réactions simples côté présentation, non implémentées.

## 2026-10-18 · Codex — choix individuel du lapin avant Cuisine

- Dernier commit inchangé : `04fdde4`. Aucun commit/staging/publication ; modifications précédentes et fichiers protégés préservés.
- Les deux entrées Cuisine passent maintenant par le panneau `cuisineRabbit` : « Choisis ton lapin », portraits existants, nom d'espèce, affection et ID individuel complet. Liste issue de `GameState.rabbits`, sans filtre d'espèce ni disponibilité de reproduction. Aucun lapin : message explicatif et retour standard. La sélection relit la propriété actuelle de l'individu avant ouverture.
- L'hôte `CuisineActivity.open(rabbit)` reçoit un `Readonly<Pick<Rabbit, 'id' | 'species'>>`, copie gelée exposée par `selectedRabbit`. Aucun passage au moteur, champ sauvegardé, récompense, affection ou quotidien. Le panneau d'origine est restauré derrière l'activité avant montage : sortie vers Cuisine (ou Paramètres pour l'entrée labo). Identité transitoire effacée à sortie/dispose/remplacement et échec de montage ; Replay et Choisir une recette gardent la session courante.
- Tests intégration **9/9**, puis `npm.cmd test -- tests/cuisine-integration.test.ts tests/ui-dom.test.ts --maxWorkers=1` : **98/98**. Typecheck réussi ; syntaxe `docs/cuisine-integration-check.cjs` vérifiée par `node --check` après adaptation de son ouverture au choix du premier lapin. Couverture : individus de même espèce, identité exacte côté hôte, montage unique, aucune mutation/complétion à l'entrée/sortie, cas vide, réentrée et nettoyage existant. Les parcours existants sélectionnent désormais explicitement un lapin, assertions métier conservées.
- Non lancés : navigateur (non requis), suite Cuisine autonome, suite globale, build, iPhone. Aucun lapin dessiné dans le plan de travail ; prochaine étape possible : présentation de cette identité côté hôte, sans dépendance du moteur.

## 2026-10-18 · Codex — entrée Cuisine depuis le bâtiment

- Dernier commit inchangé : `04fdde4`. Aucun commit/staging/publication ; travail précédent et fichiers protégés conservés.
- Le panneau `kitchen` propose « Entrer dans la Cuisine » et conserve Déplacer. Méthode `GameUI.openCuisine()` commune au bâtiment et à l'entrée Laboratoire provisoirement conservée pour les contrôles navigateur existants. Même hôte/modal/montage/dispose, aucune nouvelle voie de montage. La sortie conserve le contexte du panneau Cuisine et rétablit les entrées Prairie.
- Aucun changement moteur, sauvegarde, sélection de lapin ou récompense. Tests : ciblés **2/2**, puis suites `cuisine-integration`, `ui-dom`, `kitchen-building`, `buildings-v7` **126/126** ; typecheck réussi. Ajout couverture bâtiment → entrer deux fois → rendu passif → sortir → réentrer, état inchangé/callback absent, timers/DOM/styles et entrées ; test UI vérifie encore le déplacement réel. Assertion placeholder remplacée par l'action attendue, aucune assertion affaiblie. Premier essai utilisait un emplacement occupé : fixture corrigée pour chercher une empreinte libre.
- Non lancés : navigateur, build, suite globale, contrôles autonomes Cuisine, iPhone. Reste la suppression ultérieure de l'entrée Laboratoire et l'adaptation de son harness navigateur ; choix du lapin/récompenses hors périmètre.

## 2026-10-18 · Codex — bâtiment Cuisine uniquement

- Dernier commit inchangé : `04fdde4`. Aucun commit/staging/publication. Travail précédent et fichiers protégés préservés.
- Nouveau type `kitchen`, nom Cuisine, achat via Bâtiments et décorations, prix provisoire 100 pièces / maximum 1, empreinte et déplacement existants 4 × 4. Aucun XP de construction attribué à Cuisine ; règles XP ferme/habitat conservées.
- Sauvegarde v11 reconnaît ce type dans les bâtiments existants, sans champ ni migration/version supplémentaire ; schémas historiques inchangés. Visuel procédural provisoire maison/toit/cheminée/enseigne casserole, partagé entre aperçu et bâtiment placé par MeadowScene. Sélection : titre Cuisine, « Cuisine — bientôt disponible. », action Déplacer ; aucun lancement du minijeu, choix de lapin ou récompense.
- Tests ciblés **8/8** ; suites `kitchen-building`, `buildings-v7`, `ui-dom`, `progression-save` : **148/148** ; `npm.cmd run typecheck` réussi. Assertions préexistantes conservées. Premier lancement sandbox bloqué par esbuild ; relancé hors sandbox. Premier test UI utilisait une case occupée, préparation corrigée ; premier typecheck signalait un import de test inutilisé, retiré.
- Non lancés : build, navigateur, iPhone, suite globale et suite navigateur Cuisine (hors périmètre). Reste à brancher explicitement le bâtiment à l’activité intégrée lors d’une tâche séparée ; prix/limite provisoires à confirmer côté produit.

## 2026-10-18 · Codex — première entrée Cuisine dans le jeu principal

- Dernier commit inchangé : `04fdde4`. Aucun commit/staging/publication. Aucun bâtiment, lapin sélectionné, récompense, règle moteur ou schéma de sauvegarde ajouté/modifié. Changements précédents et fichiers protégés conservés.
- Entrée temporaire : Paramètres → Laboratoire → « Cuisine — essai d’intégration temporaire ». `GameUI` possède `CuisineActivity`, dialogue plein écran hors du panneau reconstruit ; état/navigation du panneau conservé. Montage unique, racine stable pendant les rendus passifs, `#app.inert` et blocage existant `dialog[open]` pour la Prairie. Bouton Quitter/Échap : dispose puis fermeture, restitution des entrées/focus ; réouverture neuve. Import/recommencer et `GameUI.dispose()` nettoient l’activité ; bootstrap détruit l’UI avant les autres présentations.
- `mountKitchen` propose `onRecipeCompleted({recipeId, activeTimeMs, invalidActions})`, une fois par réussite, réarmé par Rejouer/choix d’une nouvelle recette. `GameUI` transmet via `onCuisineCompleted` ; `CuisineActivity.onExit` reste distinct de Choisir une recette. Aucun lien à l’économie. Skin pierre et contrainte globale du titre exclus de Cuisine afin de préserver la présentation déjà existante.
- Tests : intégration **6/6** ; ciblés jeu principal + intégration **150/150** (5 fichiers : UI DOM/modèles, confidentialité recettes, contrôleur, Cuisine) ; Cuisine **51/51** ; typecheck réussi. Les parcours DOM réels Salade/Poulet vérifient le callback, ticks répétés et rejeu ; intégration vérifie import/restart/dispose, absence de doublons et ressources inchangées. Assertions existantes conservées. Premier typecheck a signalé les résultats de spies non typés dans le nouveau test, corrigés explicitement.
- Build final des trois entrées : `npm.cmd run build:pages -- C:/Users/sulli/AppData/Local/Temp/prairie-cuisine-main-AjUX3a/final-site --base=/`, réussi (premier build également réussi dans `site`). Avertissements historiques bundle >500 Ko/script labo inchangés ; isolation autonome et musique partagée vérifiées. Preview locale port 5189, arrêtée après contrôles ; Netlify existant intact.
- Navigateurs : `node docs/cuisine-integration-check.cjs http://127.0.0.1:5189/ C:/Users/sulli/AppData/Local/Temp/prairie-cuisine-main-AjUX3a/verified-integration` : **46/46** (Chromium tactile CDP **23**, WebKit Windows souris **23**), aucune erreur JS. Salade/Poulet intégrés complets, rendu passif réel, blocage des actions derrière le dialogue, sortie/réouverture, bâtiment Prairie à nouveau réactif, bouton Quitter visible. Le premier smoke WebKit échouait de façon reproductible sur un couteau lancé pendant le déplacement visuel ; ajout au harness des attentes de placement déjà utilisées par le contrôle autonome, sans changement de gameplay.
- Compatibilité autonome : `node docs/cooking-prototype-check.cjs http://127.0.0.1:5189/ C:/Users/sulli/AppData/Local/Temp/prairie-cuisine-main-AjUX3a/standalone` : **356/356** (178 par navigateur), aucune erreur JS. Rapports/captures hors Git sous le dossier temporaire ci-dessus. `git diff --check` réussi. Non lancés : suite Vitest globale, nouvel essai iPhone/standalone iOS. Restent les étapes produit bâtiment/sélection/récompenses, volontairement hors périmètre.

## 2026-10-18 · Codex — montage Cuisine réutilisable et styles isolés

- Dernier commit inchangé : `04fdde4`. Aucun commit, staging, bâtiment, récompense, migration ou branchement au jeu. Modifications validées précédentes et fichiers protégés conservés.
- `main.ts` exporte `mountKitchen(host, options?)` sans démarrage ni injection CSS à l’import. Le montage crée sa section `.cuisine-root`, le DOM de `shell.html` et sa feuille de style ; retourne notamment `root` et `dispose()`. Le parent dimensionne l’hôte, une seule instance active est prévue. Les IDs internes restent fournis/scopés par l’activité.
- Bootstrap autonome séparé dans `standalone.ts`, appelé par `index.html` ; resets `html/body` et hauteur écran limités à `standalone.css`. Toutes les règles réutilisables sont préfixées `.cuisine-root`, animations `cuisine-`. Disposer nettoie le cycle existant puis retire seulement le sous-arbre possédé et ses styles ; second appel sans effet. Gameplay inchangé.
- Cinq tests ajoutés : import sans effets hors mode test, hôte arbitraire/DOM possédé/idempotence, arrêt cuisson/observateur/événements/remontage neuf, geste/capture/frames/effets/messages nettoyés, isolation des sélecteurs/styles. Helper de tests utilise maintenant le DOM créé par le montage et enregistre son nettoyage ; assertions métier conservées. Ciblés **15/15** (36 ignorés), Cuisine **51/51**, typecheck réussi.
- Build des trois entrées réussi dans `%TEMP%/prairie-cuisine-mount-S2kFDd/site` via `npm.cmd run build:pages -- C:/Users/sulli/AppData/Local/Temp/prairie-cuisine-mount-S2kFDd/site --base=/` ; isolation prototype et musique partagée vérifiées. Avertissements historiques bundle >500 Ko/script labo inchangés. Build Netlify existant intact, rien publié.
- Navigateur sur build : `npm.cmd run preview -- --outDir C:/Users/sulli/AppData/Local/Temp/prairie-cuisine-mount-S2kFDd/site --port 5188 --strictPort`, puis `node docs/cooking-prototype-check.cjs http://127.0.0.1:5188/ C:/Users/sulli/AppData/Local/Temp/prairie-cuisine-mount-S2kFDd/browser`. **356/356** contrôles : Chromium tactile CDP **178**, WebKit Windows souris Pointer Events **178**, aucune erreur JS ; démarrage jeu/labo et recettes autonomes complets, bouteilles/drop, portrait, résultat/rejeu. Quatre captures et rapport hors dépôt ; serveur arrêté.
- Documentation API actualisée. Restent pour l’intégration future : hôte stable hors `GameUI.render()` reconstructif, blocage des entrées Prairie, sorties et callbacks métier. Non lancés : suite globale Vitest, nouvel essai iPhone ou standalone iOS. `git diff --check` réussi.

## 2026-10-18 · Codex — bouteilles applicatrices par drag/drop

- Dernier commit inchangé : `04fdde4`. Aucun commit, staging, build ou publication. Correctifs précédents et fichiers protégés conservés. Le propriétaire confirme les deux recettes sur iPhone avant cette modification ; les nouveaux gestes restent à tester sur iPhone.
- Soja, miel, huile déplaçables via les Pointer Events existants. `BOTTLE_RULES` déclare cible/préparation/flags/contenu requis ; `preview` valide le dépôt et `dispatch` applique seulement après relâchement. Soja/miel ciblent le poulet visible et non inséré (sur planche ou en réserve) ; huile cible le vrai saladier. Tap/clic sélectionne sans verser. Les bouteilles conservent leur ancre moteur et reviennent après acceptation/refus ; annulation technique sans erreur, mauvais dépôt/état/doublon compté.
- Tests adaptés du tap au drop (assertion de mouvement auparavant ignoré remplacée par erreur de dépôt délibéré conformément à la demande, aucune assertion affaiblie pour contourner un échec). Quatre cas ajoutés : soja, miel, mauvaise cible, huile avec retour/annulation. Ciblés **14/14** (32 ignorés), Cuisine **46/46**. Typecheck réussi après correction d’un problème antérieur : import `node:fs` du test CSS sans types Node. Import CSS brut Vite et activation limitée à cette feuille dans Vitest, assertions CSS conservées. Premier typecheck avait échoué sur cet import.
- Script navigateur existant adapté aux bouteilles : tap sans effet, mouvement visible, aucun effet avant drop, retour à la réserve. Copie temporaire sans les contrôles d’entrées production, sources via `npm.cmd run dev -- --port 5187 --strictPort` ; serveur arrêté. Commande : `node C:/Users/sulli/AppData/Local/Temp/prairie-bottle-validation-XcJXLr/validation.cjs http://127.0.0.1:5187/ C:/Users/sulli/AppData/Local/Temp/prairie-bottle-validation-XcJXLr`. **352/352** contrôles (Chromium tactile CDP **176**, WebKit Windows Pointer Events souris **176**), aucune erreur JS. Quatre PNG et rapport hors dépôt. Syntaxe du script et `git diff --check` réussis.
- Documentation des gestes actualisée. Non lancés : suite Vitest globale, build production, essai iPhone des bouteilles. Aucun polish graphique ; couleur finale/labels inchangés.

## 2026-10-18 · Codex — validation navigateur Poulet et Salade

- Dernier commit inchangé : `04fdde4`. Validation seule : aucun changement source/test, aucun commit, staging, build ou publication ; correctifs précédents conservés.
- Sources actuelles servies par `npm.cmd run dev -- --port 5187 --strictPort` (serveur arrêté après validation). Copie temporaire enrichie de `docs/cooking-prototype-check.cjs`, sans modifier le script du dépôt ni rejouer les entrées production `/` et `/dev/` : `node C:/Users/sulli/AppData/Local/Temp/prairie-cooking-validation-6hXuv1/validation.cjs http://127.0.0.1:5187/ C:/Users/sulli/AppData/Local/Temp/prairie-cooking-validation-6hXuv1`.
- Playwright 1.56.1 : **398/398** contrôles, Chromium tactile CDP **199**, WebKit Windows souris Pointer Events **199**, aucune erreur JS. Deux ordres d’insertion du Poulet, refus de préparation/planche occupée, plat incomplet immobile, contenu suivi à 25/50/75 % du drag, aliments verrouillés, plat/barre affichés au four, gradient de progression réellement modifié, gel portrait, résultat/6 erreurs/temps, rejeu puis nouvelle réussite et Choisir. Cuissons actives estimées : **5,062 / 5,156 / 5,027 / 5,000 s**. Salade : flux complets aux tailles 844×390 et 667×375, deux ordres, huile/résultat et rejeu.
- Artefacts hors dépôt : **16 PNG**, `report.json`, script temporaire dans le dossier ci-dessus ; captures Chromium/WebKit examinées. Aucune sortie générée dans le dépôt. Libellés plat/four rapprochés observés, sans correction. Couleur finale connue hors périmètre.
- Non vérifiés : arrière-plan réel (pas de simulation fiable dans le harness), iPhone physique, standalone, build production, typecheck et Vitest non relancés durant cette validation. État Git final identique aux chemins initiaux ; seule cette passation a été enrichie. Fichiers protégés intacts.

## 2026-10-18 · Codex — visibilité du plat au four

- Dernier commit inchangé : `04fdde4` ; aucun commit ni staging. Les deux correctifs de drag précédents sont conservés.
- Cause confirmée : `data-in-dish` masquait aussi le conteneur situé au four et sa barre `::after`. Ce flag est désormais réservé aux objets `food` contenus dans le plat/four. Aucun changement CSS, moteur, progression ou couleurs finales.
- Test DOM ajouté avec la feuille CSS réelle : plat affichable, règle de barre active et dimensionnée, aliments indépendants masqués/verrouillés, progression 0 → 40 % après 2 s puis résultat à 5 s. Assertions existantes intactes. Ciblés **11/11** (31 ignorés), suite Cuisine **42/42**, `git diff --check` réussi. Les premiers essais du nouveau test échouaient car Vitest neutralise les imports CSS ; lecture locale seule du CSS pour les assertions corrigée.
- Non lancés : Playwright, build, typecheck, suite globale, essai iPhone. Couleur du contenu après cuisson toujours hors périmètre. Éléments préexistants protégés intacts ; aucune publication.

## 2026-10-18 · Codex — contenu du plat pendant le drag

- Dernier commit inchangé : `04fdde4`. Aucun commit demandé ; changements validés de l’étape précédente conservés.
- Défaut confirmé : le calque du contenu restait à l’ancre moteur jusqu’au drop. `scene.move()` positionne maintenant le calque associé au conteneur avec la même ancre transitoire et le place au-dessus pendant le drag. Le rendu périodique conserve cette position ; aucun changement moteur, drag, art ou CSS pour cette étape.
- Test ajouté : déplacement relatif du contenu à mi-drag, maintien après rendu périodique, aliments verrouillés et drop au four. Assertions existantes conservées. Ciblés **8/8** (33 ignorés), suite Cuisine **41/41**, `git diff --check` réussi. Aucun Playwright, build, essai iPhone, typecheck ou suite globale lancé.
- Visibilité/progression au four et couleur finale hors périmètre. Éléments préexistants `../.gitignore`, `../.claude/` et `docs/_debug-guided.cjs` intacts ; aucun staging ni publication.

## 2026-10-18 · Codex — éligibilité du drag du plat

- Dernier commit inchangé : `04fdde4`. Aucun commit pour cette tâche, conformément à la demande.
- `drag.ts` utilise désormais `engine.canDrag(id)` pour autoriser le mouvement, tout en conservant la sélection par tap. Aucun changement des règles moteur ou de la Salade.
- Test ajouté : plat vide puis à un aliment immobile et sans geste de drag, tap conservé ; plat complet déplaçable au four. Aucune assertion existante modifiée.
- Vérifications : ciblés interaction Salade et nouveau test **7/7** (33 ignorés), suite Cuisine **40/40**. Premier lancement ciblé bloqué au chargement Vite par la sandbox, relance hors sandbox réussie. Aucun build, Playwright, essai iPhone, typecheck ou suite globale lancé.
- Restent hors périmètre : visibilité du plat/progression au four et déplacement de son overlay de contenu. Éléments préexistants `../.gitignore`, `../.claude/` et `docs/_debug-guided.cjs` intacts. Aucun staging ni publication.

## 2026-10-17 · Codex — recette Poulet soja-miel et patate douce jouable

Références de départ : socle `799fc5f`, Salade `5a7c89c`, validation propriétaire de la Salade `0d7421b`. La recette Poulet est ajoutée au prototype isolé `/cooktap-prototype/`, sans intégration au jeu, bâtiment, économie, sauvegarde, récompense ou audio. Les fichiers préexistants non suivis `../.claude/` et `docs/_debug-guided.cjs` sont conservés intacts et exclus.

- Poulet en morceaux crus, découpe sur planche, sauce soja puis miel par taps, patate douce épluchée à l’économe puis coupée au couteau. Les règles d’outil sont déclarées dans `TOOL_RULES` et passent par les intentions existantes du moteur ; la planche reste à une place et les deux aliments peuvent revenir en réserve avec leurs préparations/flags.
- Le plat accepte les aliments prêts dans les deux ordres ; il ne devient draggable qu’une fois complet et c’est le plat complet qui entre au four. Cuisson de **5 s actives**, gelée en portrait et arrière-plan ; les deux aliments passent à `cooked`, puis écran résultat avec temps/erreurs et rejeu à zéro. Les zones de drop filtrées par recette évitent l’interception des drops du saladier par le plat.
- Visuels SVG locaux pour morceaux de poulet, patate douce entière/épluchée/coupée/cuite, économe et plat garni. Objets et labels accessibles adaptés aux états. La Salade conserve ses règles et reste jouable ; le propriétaire l’avait validée sur iPhone réel. La nouvelle recette Poulet reste à tester sur iPhone réel.
- Vérifications : typecheck réussi ; ciblés Cuisine **39/39** ; navigateur sur build **276/276** (Chromium **138**, WebKit Windows **138**), zéro erreur JS. Salade complète jouée dans les deux moteurs ; Poulet complet dans les deux moteurs, actions refusées, cuisson, gel portrait, résultat et rejeu. Build `build:netlify` réussi pour `/`, `/dev/` et `/cooktap-prototype/` ; avertissements Vite historiques (bundle principal >500 Ko et script labo non bundlé) inchangés. Suite complète exécutée une fois, un worker : **1202/1202 tests, 60 fichiers, 63,85 s**. `git diff --check` propre. Aucun essai iPhone Poulet revendiqué.
- Test iPhone à faire : `npm.cmd run build:netlify`, puis `npm.cmd run preview -- --outDir netlify-site --port 5186 --strictPort`; Safari iPhone, même Wi-Fi, ouvrir `http://<IPv4 Wi-Fi PC>:5186/cooktap-prototype/`. Voir les vérifications détaillées dans [cooking-minigame.md](cooking-minigame.md).

Dernier commit applicatif et de passation : `feat: add chicken and sweet potato recipe`. Aucun push, aucune publication Netlify.

## 2026-10-17 · Codex — recette Salade jouable dans le prototype isolé

Socle de départ : **`799fc5f`**. Commit applicatif : **`5a7c89c`** (`feat: add playable salad cooking recipe`). Commit de passation : ce commit. Route **`/cooktap-prototype/`** conservée. Le Poulet reste indisponible ; aucun bâtiment, boutique, niveau, pièce, herbe, cœur, sauvegarde, audio ou intégration au jeu principal ajouté.

- Écran de choix « Cuisine » : Salade active ; Poulet désactivé « Bientôt disponible ». Après sélection, seuls planche, couteau, trois aliments, saladier et huile sont visibles. Guide visuel compact persistant.
- Salade : les ingrédients `whole`/`cut` et leurs emplacements `reserve`/`cutting-board`/`bowl` restent indépendants. Planche une place. Intention moteur `use-tool(knife, food)` coupe l'aliment entier sur planche ; le couteau retourne au support. L'aliment coupé va au saladier ou revient en réserve sans perdre son état ; au saladier, il est verrouillé. Contenu et nom accessible du saladier reflètent les objets réellement ajoutés. Tap court d'huile refusé avant les trois aliments coupés, accepté ensuite (`oliveOilAdded`) avec feedback de versement et réussite. Six permutations préparées et vérifiées.
- Temps écoulé (pas de compte à rebours) depuis le démarrage de la recette, gelé en pause/arrière-plan/portrait et arrêté à la fin. Les drops/taps culinaires refusés sont comptés ; pointercancel, rotation, multitouch et interruption n'ajoutent pas d'erreur. Résultat : durée + erreurs, boutons Rejouer/Choisir. Rejouer réinitialise états/flags/temps/erreurs et replace sans transition afin que les premiers drags ne saisissent pas l'ancien sprite en déplacement.
- Les images des trois aliments changent à la découpe ; le filet d'huile et les feedbacks sont dessinés en SVG/CSS locaux. Tap bouteille géré par Pointer Events, seuil 7 px ; au-delà, la bouteille n'agit pas. Le clic clavier accessible reste pris en charge et le clic synthétique éventuel est supprimé pour éviter le double versement. Pas de dépendance ni asset externe ajouté. Aide après inactivité différée comme polish.
- Documentation mise à jour : [cooking-minigame.md](cooking-minigame.md) et [plan](cooking-refactor-plan.md). Contrôle construit mis à jour dans `docs/cooking-prototype-check.cjs`.
- Vérifications : typecheck réussi ; Cuisine ciblée **32/32** ; navigateur sur build statique **242/242**, Chromium **121**, WebKit Windows **121**, zéro erreur JS. Chromium : touch CDP ; WebKit Windows : souris Pointer Events (pas un vrai drag tactile WebKit). `/` et `/dev/` démarrent via Jouer ; Salade complète en deux ordres, refus/huile prématurée, rotation pendant un geste, résultats/erreurs/temps, contenu, effets et rejeu vérifiés. Build `build:netlify` réussi : jeu 32 fichiers, labo 28 fichiers, prototype isolé et quatre MP3 partagés validés. Suite complète exécutée **une fois, un worker : 1195/1195 tests, 60 fichiers, 43,35 s**. `git diff --check` et syntaxe du contrôle navigateur réussis. Aucun essai physique iPhone de cette étape.
- Avertissements de build inchangés : chunk principal Vite supérieur à 500 Ko et script standalone du laboratoire non bundlé. Aucun échec.
- Essai propriétaire iPhone à faire : PowerShell depuis le projet, `ipconfig`, puis `npm.cmd run preview -- --outDir netlify-site --port 5186 --strictPort`. Safari, même Wi-Fi : `http://<IPv4 Wi-Fi PC>:5186/cooktap-prototype/`. Vérifier précision du drag, saisie du couteau, aliments coupés, contenu/visée du saladier et tap huile, orientation, safe areas, absence de scroll/objet coincé, résultat et rejeu. Le vrai Safari iPhone et le mode écran d'accueil LAN HTTP restent à valider par le propriétaire.
- État avant commits : changements suivis limités aux 13 fichiers de recette/scène/tests/docs et au présent document ; `../.claude/` et `docs/_debug-guided.cjs` laissés intacts/non commités. Aucune publication, aucun accès distant ou commit distant.

## 2026-10-17 · Codex — socle Cuisine paysage et drag Pointer Events terminé, recettes non implémentées

Référence initiale **cab49fc** (plan validé). Commit du socle : voir `git log -1`. Route conservée : **/cooktap-prototype/**. Aucun bâtiment Cuisine ni économie/récompense/sauvegarde/boutique/déblocage ajouté ; `src/`, audio et préférences du jeu inchangés.

- Réalisé : scène fixe DOM/SVG/CSS, table chaleureuse en perspective, planche, couteau/support, mozzarella/tomate/concombre, poulet cru, saladier, huile, soja, miel, four. Modules `recipes/engine/geometry/scene/drag/main/ui` plus `art.ts`, sans dépendance supplémentaire. Ancien service/75 s/score/commandes/expirations/pizza/pâtes retiré de l'interface et du moteur actifs.
- Modèle par objet : id/type/kind, préparation, emplacement/zone, flags, ancre/home, draggable/visible/interactive ; snapshots copiés, intentions select/drop et validation uniquement dans le moteur. Repère **1000×440**, échelle uniforme, hitboxes effectives **≥48 px CSS** séparées des dessins et des zones. Une place sur la planche ; retour à sa propre réserve ; état de préparation conservé. Couteau sur aliment détecté mais refusé avec message. Saladier/four désactivés, bouteilles sans effet culinaire : **aucune découpe, sauce, cuisson ou réussite de recette** dans ce prompt.
- Pointer Events/capture surface stable, seuil **7 px CSS**, offset de prise, rendu temporaire rAF et commit au relâchement. Refus sans mutation, retour doux, feedback et highlight. Second doigt, cancel/perte de capture, rotation, resize et arrière-plan annulent ; pointeurs périmés oubliés après interruption système. Portrait caché/inert et moteur bloqué ; pauses cumulées, retour paysage avec géométrie recalculée. Horloge active réservée aux futures cuissons, aucun chrono de partie. Touch-action **pinch-zoom** sur scène conservé après essais ; aucun verrou global des gestes Safari.
- Correctif découvert en navigateur : les positions s'interpolaient encore après rotation et perturbaient le geste suivant. Resize désormais immédiat, animations limitées aux fins de dépôt, hauteur du feedback stabilisée. Les tests navigateur attendent la mise en page par frames, pas un sommeil arbitraire.
- Vérifications : typecheck réussi ; ciblés **25/25**. Ancien fichier de 14 tests des règles supprimées remplacé, conformément au nouveau périmètre ; **aucune assertion hors Cuisine modifiée/affaiblie**. Navigateur sur build : **202/202**, Chromium **101** (vrais drags tactiles CDP), WebKit Windows **101** (vrais drags souris via Pointer Events, second doigt injecté ; pas de touchmove natif WebKit disponible via Playwright). Tailles 844×390, 667×375 et 1280×800, portrait 390×844 ; capture, dépôts acceptés/refusés, retour, multitouch, rotation, pas de scroll, stockage jeu/labo inchangé et démarrage `/`/`/dev/`. Aucun essai iPhone réel revendiqué. Preuves : `%TEMP%/prairie-cooking-foundation/`.
- `build:netlify` local des trois routes réussi ; isolation et **4 MP3 partagés** vérifiés. Prototype **27 861 octets**, build complet **64 314 197**. Suite complète **une fois, un worker : 1188/1188 tests, 60 fichiers, 47,54 s**. `git diff --check` réussi. Autres anciens contrôles navigateur non tous rejoués ; avertissements Vite historiques seulement.
- Reste : essai propriétaire de ce socle sur iPhone, puis prompts Salade et Poulet séparés. Documentation actualisée : [prototype/procédure](cooking-minigame.md), [plan et état réalisé](cooking-refactor-plan.md). Alternative accessible sélection/destination préparée, pas finalisée ; illustrations provisoires. Écran d'accueil HTTP toujours non confirmé pour cette scène. Les validations iPhone précédentes du jeu/audio/île restent conservées.
- Le port 5174 était occupé : serveur existant laissé intact ; vérifications effectuées sur **5184**. Aucun accès GitHub, push ou publication. Fichiers non suivis `../.claude/` et `docs/_debug-guided.cjs` intacts et hors commit.

## 2026-10-17 · Codex — audit et plan de refonte cuisine par objets, sans implémentation

Référence applicative inchangée : **661ab84**. Rapport technique : [cooking-refactor-plan.md](cooking-refactor-plan.md) ; commit documentaire de cette tâche : voir `git log -1`.

- État réel audité : route `/cooktap-prototype/`, rendu DOM/CSS par boutons, moteur commandes/score/75 s, horloge 100 ms, tests et troisième build isolé. Aucune interaction drag-and-drop existante. État Git initial : seulement `../.claude/` et `docs/_debug-guided.cjs` non suivis, laissés intacts.
- Nouvelle direction consignée : paysage obligatoire, table isométrique DOM + SVG, états d'objets/emplacements et transitions déclaratives, salade mozzarella/tomate/concombre/huile dans tout ordre de préparation ; poulet découpé, soja puis miel, four 5 s actives. Abandon proposé des commandes, délais et score. Pointer Events/capture, géométrie explicite des drops, retour sans pénalité, blocage logique en portrait et pauses cumulées.
- **Aucun code, test ou build modifié/rejoué** : audit et plan uniquement, comme demandé. Deux fichiers documentaires mis à jour/créés, vérification `git diff --check`. Aucun bâtiment, intégration, récompense, sauvegarde, boutique, dépendance ou illustration ajouté. Aucun accès GitHub, aucune publication.
- Reste : réalisation du plan lors d'une prochaine demande, puis tests des nouveaux gestes Chromium/WebKit et iPhone réel. Les résultats 14/14, 180 contrôles et 1177/1177 de la version précédente ne valident pas la future interaction.

## 2026-10-17 · Codex — prototype tactile cuisine isolé, en attente d'essai iPhone

Référence de départ **a7bf93b**. Source Cook Tap : **2d853495b03f837ef86bf20a591547bc1161a88f**, copie et provenance commitées en **8ca8f7e** ; implémentation et rapport : voir `git log -1`. Seule exception GitHub autorisée : lecture/téléchargement de ce dépôt public. Aucun accès distant à Prairie Lapins, aucun push, aucune publication.

- Audit : 10 fichiers upstream, 124 636 octets de blobs (128 676 sur Windows/CRLF), aucune dépendance ni asset externe binaire. README/package.json déclarent MIT, **pas de fichier LICENSE ni de notice de copyright explicite**. Notices de provenance et termes MIT standard ajoutés en distinguant clairement leur origine ; réserve documentaire à clarifier avant diffusion future. Pas d'asset de provenance inconnue utilisé. [Audit et procédure](cooking-minigame.md).
- Prototype : **/cooktap-prototype/**, entrée/bundle/public dédiés hors `src/`. Salade, Pizza, Pâtes ; **75 s actives**, patience 24 s, jusqu'à 3 commandes, arrivées toutes les 6 s. Cartes/ingrédients/actions/cuisson/service/Refaire/pause/Rejouer entièrement tactiles. Barème 100/60/30 adapté de Cook Tap ; erreurs/expiration 0. État par commande et timers déterministes réécrits, classes originales conservées uniquement pour audit. Pause en arrière-plan, reprise explicite. CSS doux, safe areas, portrait/paysage ; cibles ≥44 px contrôlées, pas de clavier requis.
- **Aucune intégration** : pas de bâtiment Cuisine, boutique, niveau, récompense, économie, sauvegarde, compte ou audio. Le prototype n'écrit pas de stockage et ne charge pas la musique du jeu. Le build vérifie l'isolation, les notices et les 4 MP3 partagés. Aucune nouvelle illustration.
- Vérifications : typecheck réussi ; ciblés **14/14** ; navigateur **180/180** contrôles, Chromium + WebKit Windows en **390×844 et 844×390** (trois recettes, cuisson, score, pause, fin, redémarrage uniquement au toucher, état du stockage inchangé, démarrage `/` et `/dev/`). Cadrage du bouton Commencer en paysage corrigé après le premier essai. Source dev et notice accessibles en HTTP 200. Preuves : `%TEMP%/prairie-cooking-prototype/`. Build Netlify **local** des trois routes réussi ; suite complète **une fois, un seul worker : 1177/1177, 60 fichiers, 42,49 s**. `git diff --check` et syntaxe des contrôles réussis. Aucun test/assertion existant modifié pour le faire passer. Contrôle production adapté à la nouvelle entrée, validée séparément. Autres anciens contrôles navigateur non tous rejoués.
- Poids : prototype compilé **16 382 octets** ; build complet **64 302 718** (avant 64 286 336, **+16 382**). Nouveaux fichiers projet environ **0,18 Mo**, dont source vendor/tests/docs, hors métadonnées Git ignorées.
- Reste : **essai réel Safari/iPhone du propriétaire avant toute intégration** ; les simulations Windows ne valident ni safe areas physiques ni écran d'accueil HTTP. Métadonnées iOS présentes ; aucun service worker/offline, aucun standalone prétendu testé. Procédure exacte et limites dans `docs/cooking-minigame.md`. Audio/chargement du jeu et île agrandie restent validés sur iPhone selon les retours précédents.
- `docs/_debug-guided.cjs` et `../.claude/` préexistants intacts, hors commits. Les métadonnées du clone Cook Tap ont été déplacées sous `vendor/.cooktap-git/` et ignorées ; la copie commise n'est pas un sous-module. Aucun autre chantier entrepris.

## 2026-10-17 · Codex — déduplication des musiques du build final terminée

Référence de départ : **81dd2b7** ; commit dédié de cette optimisation : voir `git log -1`. La validation réelle iPhone précédente (audio, chargement, réglages, arrière-plan/retour, utilisation mobile) et celle de l'île agrandie sont conservées. Aucun nouveau test iPhone revendiqué pour ce changement de chemins.

- Cause vérifiée : `scripts/build-pages.mjs` lance deux builds Vite ; chacun copie intégralement `public/`, respectivement dans l'artefact racine et dans `dev/`. Le lecteur utilisait `BASE_URL`, donc les URLs du laboratoire visaient sa copie `/dev/assets/audio/music/`.
- Solution limitée aux musiques : le build combiné transmet la base commune du site via `VITE_SHARED_MUSIC_BASE` (`/` pour Netlify, `/Project-L/` pour le build historique). `src/main.ts` l'utilise pour toutes les URLs du lecteur, avec repli sur `BASE_URL` pour les builds isolés et le serveur de développement. Après les deux sous-builds, seules les copies musicales identiques du laboratoire sont retirées. Ni lecteur, volumes, préférences ni MP3 modifiés ; dossier source externe non touché, aucun symlink.
- Audit avant : **8 MP3**, deux copies de chaque piste sous `assets/audio/music/` et `dev/assets/audio/music/`. Après : **4 MP3**, uniquement sous `netlify-site/assets/audio/music/` : `indian-vibe-1.mp3` **5 008 420 octets**, `indian-vibe-2.mp3` **4 791 761**, `indian-vibe-3.mp3` **4 998 823**, `dragon-chill.mp3` **19 475 582**. Audio : **68 549 172 → 34 274 586 octets (−50 %)**. Build complet : **98 560 912 → 64 286 336 octets** ; économie **34 274 576 octets = 34,274576 Mo = 34,775 %** (10 octets d'écart hors audio dans les bundles).
- Garde-fou automatique : `scripts/verify-shared-music.mjs`, exécuté dans le build combiné, impose les quatre noms, leur emplacement unique, aucune copie sous dev/, aucun symlink, et l'identité octet par octet avec `public/`, sans figer leur taille. Commande indépendante : `node scripts/verify-shared-music.mjs netlify-site`.
- Vérifications réussies : `npm.cmd run typecheck` ; ciblés audio/chargement/réglages **26/26**, 3 fichiers ; `npm.cmd run build:netlify`, vérification production **32 fichiers** et labo **28 fichiers** ; Chromium sur le build, ouverture directe `/` et `/dev/`, **33/33** contrôles (chargement, Jouer, son, pause/reprise, réglages, mêmes URLs partagées, Range initial, réponses audio 200/206 sans 404 hors scénario d'erreur volontaire). Preuves hors Git : `%TEMP%/prairie-shared-music`. Suite complète ensuite, **une seule fois, un seul worker : 1163/1163 tests, 59 fichiers, 43,45 s**. Syntaxe des scripts et `git diff --check` réussis. Aucune assertion affaiblie.
- Rien à faire pour ce chantier. Aucun push, accès GitHub ou publication Netlify. Les fichiers non suivis `../.claude/` et `docs/_debug-guided.cjs` restent intacts et hors commit. Le build reste local ; avertissements Vite historiques inchangés.

## 2026-10-17 · Codex — validation finale iPhone et suite complète : audio + chargement entièrement terminés

Référence précédente : **70ae0e2** ; dernier commit applicatif : **67157c5**. Commit de cette validation documentaire : voir `git log -1`.

- **Validation réelle sur iPhone confirmée par le propriétaire** : écran de chargement validé ; musique validée ; réglages Musique/Bruitages validés ; passage en arrière-plan et retour validés ; utilisation mobile globale validée. Tous fonctionnent correctement. Ce retour clôt la réserve iPhone de la passation précédente, sans extrapoler des essais particuliers non détaillés par le propriétaire.
- **Dernier point automatisé fermé** : `npm.cmd test -- --maxWorkers=1`, exécuté **une seule fois** après la correction du montage du test de focus : **1163/1163 tests, 59/59 fichiers, 43,86 s, aucun échec**. Aucun code ni aucune assertion de test modifiés pour cette validation.
- **Fonctionnalité audio + chargement entièrement terminée**, aucun travail restant pour ce chantier. L'agrandissement précédent de l'île reste également validé sur iPhone en local.
- État Git vérifié avant intervention : seuls `../.claude/` et `docs/_debug-guided.cjs` étaient non suivis ; ils restent intacts. Seul `docs/progress.md` est modifié pour cette tâche. Typecheck, tests ciblés, contrôles navigateur et build non relancés : leurs résultats précédents sont conservés. Aucun push, aucune opération GitHub, aucune publication Netlify.

## 2026-10-17 · Codex — reprise Claude : musique, réglages audio et chargement terminés localement

Dernier commit applicatif : **67157c5** (précédent : **5dd183c**). Commits Claude conservés : **8bbeab3**, **be8d09d**, **7ed87a1**, **28a7677** ; clôture documentaire et adaptations navigateur : voir `git log -1`. Audit initial : ces quatre fonctionnalités étaient déjà commitées ; restaient la passation et des adaptations non commitées des contrôles navigateur (conservées). Aucun reset, accès GitHub, changement du dossier musical source ou publication.

- Fait : correction des sondes musicales tardives (Jouer avant réponse, destruction), nettoyage des listeners, arrêt du téléchargement si Range est ignoré, erreur play non supportée → autre piste, inert dès le HTML, message/Réessayer sur rejet du démarrage. Tests de non-régression ajoutés. Le test DOM monte désormais l'état après Jouer ; **aucune assertion modifiée**. Préférences séparées jeu/labo ; musique 50 % conservée, bruitages 80 % ; un moteur partagé, un seul ping existant.
- Vérifications : typecheck réussi ; ciblés **26/26**, 3 fichiers ; suite complète **une seule fois**, **un worker**, **1160/1161**, puis correction du montage du test focus (inert initial) et rejeu du fichier **88/88**. Aucun échec restant connu, suite complète non relancée. Build local `build:netlify` réussi (32 fichiers par route), non publié. Chromium : audio/chargement **27/27**, production **9/9**, laboratoire **7/7** ; WebKit Windows : politique tactile **6/6 groupes**, portrait/paysage. Autres contrôles navigateur adaptés mais pas tous rejoués. Pas d'essai de cette fonctionnalité sur iPhone physique.
- Mesures : source 71 183 578 octets → MP3 128 kb/s 34 274 586 octets ; build deux routes **98 560 912 octets**, dont **68 549 172** d'audio, augmentation approximative **68,6 Mo**. Détail des pistes, durées vérifiées, architecture et limites : [audio.md](audio.md). Preuves hors Git : `%TEMP%/prairie-audio-resume`, `prairie-audio-regression`, `prairie-audio-lab`, `prairie-audio-webkit`.
- Reste : essai propriétaire Safari iPhone, silence matériel, changements d'app, verrouillage, retour, mode écran d'accueil et écoute des pistes ; [procédure](local-iphone-testing.md). Le mode ambient est une demande dépendante de Safari/iOS, pas une garantie. Le timer ne peut pas interrompre une migration synchrone ou réparer un bundle non téléchargé.
- **Information propriétaire conservée : l'agrandissement précédent de l'île a déjà été testé avec succès sur iPhone en local.** Cela remplace la réserve de l'ancienne passation ci-dessous et ne vaut pas validation iPhone de l'audio.
- Fichiers de travail préexistants laissés intacts hors commits : `docs/_debug-guided.cjs`, `../.claude/`. Le MP3 silencieux de `docs/test-assets/` sert exclusivement aux contrôles navigateur non audio, jamais au build.

## 2026-10-17 · Claude Code — agrandissement de l'île, étape C (rendu, performances, vérifications) — CHANTIER TERMINÉ

Étape B acceptée. **Le chantier d'agrandissement de l'île (étapes A, B, C de [island-size-plan.md](island-size-plan.md)) est terminé**, sous réserve de l'essai iPhone du propriétaire. Commits : **73cc9e3** jointure, **8478cc5** mémoire, **c1e3414** Recentrer, **ff39264** grille, **1c0d6dd** lots de 400 îles, **cdc49a3** passation intermédiaire et `scripts/replay-land-checks.sh`, **4143e6e** ferme du scénario à cheval sur Centre/Est, **d02cca1**, **49c776c**, **899c644** contrôles navigateur, puis ce commit documentaire (hash dans git log -1).

- **Jointure** : chaque texture de parcelle s'arrête pile sur la frontière avec des texels transparents au-delà ; au filtrage bilinéaire sous-pixel, les deux textures sont partiellement transparentes sur le pixel de frontière et l'eau transparaît (ligne d'1 px, g−b 63–70 au lieu de 82, mesurée aux zooms 1,05 et 1,65). Correctif : bande d'herbe vectorielle sous chaque frontière partagée. Mesure `docs/island-seam-check.cjs` (île maximale, coin Centre/Est/Sud/Sud-est, zooms min/1,05/1,65, 390 × 844 et 844 × 390, balayage de toute l'île sur 5 positions sous-pixel) : avant, écarts 12–19 exactement aux frontières ; après, ≤ 4,3 hors frontières (bruit).
- **Mémoire** (textures de terrain résidentes, mesurées par interception WebGL, `docs/island-texture-memory-check.cjs`) : 9 × 1768 × 1544 = **98,27 Mo** → 9 × 1412 × 1210 = **61,51 Mo** (marge 40, résolution plafonnée à 1,8, au-dessus du zoom maximal 1,65 ; le canevas n'est pas mis à l'échelle devicePixelRatio). Ancienne île 9 × 9 : 63,6 Mo calculés.
- **Recentrer** (et vue initiale) : cadre entièrement nid, nurserie et premier habitat (Paille), illustrations et noms, zoom ≤ 1,05, à côté de la colonne de boutons en paysage, dessous en portrait. Module pur `src/display/recenter.ts`, tests `tests/recenter.test.ts` (ancrage du pincement, clamp, repli sans partie). Vérifié en WebKit 844 × 390 et Chromium 390 × 844. La bande crème en bas des captures **Chromium headless** est un artefact de composition lié au HUD (absente en WebKit ; canevas, caméra et rendu WebGL couvrent bien 844 × 390).
- **Grille de placement** : seules les cases visibles (+ 8) sont dessinées, redessin quand la vue sort de la zone. Rendu par image en placement, processeur ×4, île dense : 11,1 ms (36 × 36) → 15,7 ms (48 × 48) → **12,0 ms** ; sans ralentissement 2,3 / 2,7 / 2,2 ms. Builds de diagnostic temporaires (objet du jeu exposé, jamais commités).
- **Test instable** : `decorations.test.ts` « decorationDense » : 68/68 cinq fois seul (1,3 s), suite complète réussie trois fois en parallèle mais 4,2–4,8 s pour une limite de 5 s (un dépassement à 5,3 s pendant l'étape B). Sensible à la charge, pas un défaut fonctionnel (construction du scénario par 1 024 commandes réelles) ; non modifié. Mes 400 îles aléatoires découpées en 4 lots (même graine, mêmes îles, mêmes assertions). **Lancer la suite avec un seul worker.**
- **Contrôles navigateur** : rejeu local de `.github/workflows/validate-land.yml` avec `bash scripts/replay-land-checks.sh <dossier hors Git>` (serveur de dev /Project-L/ puis `build:pages` servi en statique) : **27/28 réussis**, seul échec `nest-art-browser-check`, historique (ancienne grotte). Adaptations : versions 10 → 11 ; `docs/check-camera.cjs` (modèle de caméra positionné par un vrai Recentrer ou comme au démarrage, points d'un bâtiment ou d'un lapin) ; projections figées de l'ancienne caméra remplacées ; cases converties par la règle v10 → v11 ; cas de bord rechoisis (32, 16, 48) ; touches conservées aux anciens points écran dégagés par un vrai glisser ; camera-overview vérifie Recentrer par « trois bâtiments entièrement visibles, zoom ≤ 1,05 » au lieu de « zoom = 1,05 » (comportement changé à la demande du propriétaire) ; corrections de glisser < 8 px (ignorés par le jeu) faites en deux glissers réels. Hors workflow : `nest-design-check` (35 et 40 vérifications), `nest-palette-check` (103), `farm-palette-check` (63) réussis. Les `*-public-check` sont **adaptés** (le workflow les lance sur le build local) ; **historiques** sans autre modification : `nest-art-browser-check` et les 5 contrôles de la prévisualisation Décorations v8 / visuels v4 (decorations-flow, decorations-browser, island-browser, visual-browser, stability).
- **Scénario** `fineBuildings` : ferme en (30,23), à cheval sur la frontière Centre/Est comme en v10 (test unitaire adapté : déplacement d'une case vers (31,23)).
- **Captures** hors Git (WebKit Windows, pas un iPhone) : `C:\Users\sulli\AppData\Local\Temp\prairie-island-captures-stepC\` (`depart-recentrer-*`, `ile-maximale-zoom-minimal-*`, `amenager-ile-maximale-*`, en 390 × 844 et 844 × 390). Mesures, journaux et rejeux : `C:\Users\sulli\AppData\Local\Temp\prairie-island-stepC\`.
- **Vérifications finales** : `npm.cmd run typecheck` réussi ; **suite complète une fois, `--maxWorkers=1` : 1137/1137, 56 fichiers**, aucun délai dépassé (1,36 s max) ; `npm.cmd run build:netlify` réussi, 28 fichiers par route, `build-revision.txt` = `899c644bf67e4304e6b2551a81b4472ffe6dc00b` (jeu et labo ; le commit suivant ne touche que la documentation), **non publié** ; démarrage jeu/labo Chromium + WebKit, 2 orientations : 8/8. Serveurs arrêtés, worktree temporaire supprimé.
- **Essai iPhone** : marche à suivre dans [local-iphone-testing.md](local-iphone-testing.md) (section « Essai de l'île agrandie »). Non réalisé. Mode écran d'accueil en HTTP local non confirmé.

## 2026-10-17 · Claude Code — agrandissement de l'île, étape B (parcelles 4 × 4, sauvegarde v11)

Étape A acceptée par le propriétaire (`12404f9`, `48122c2`). Commits de l'étape B : **72d8240** géométrie et positions de départ, **cc78052** sauvegarde v11, **7eafcea** laboratoire, **13ca1f6** correctif caméra, **a134144** tests, puis ce commit documentaire (hash dans git log -1). Les commits intermédiaires ne passent pas seuls la suite : seul l'ensemble est vérifié.

- **Géométrie** (`src/config/islandGeometry.ts`) : `ISLAND` = parcelle 4 × 4 cases, 16 × 16 cases fines, 704 × 592 unités ; île maximale 12 × 12 = 144 cases, 48 × 48 fines, 2112 × 1776 ; case 176 × 148 inchangée ; recentrage 6 ; 169 touffes d'herbe par parcelle. `LEGACY_ISLAND` (3 × 3, 9 × 9) figée, utilisée uniquement pour lire et valider v1–v10 (dont `LAND` de `config/habitats.ts`, conversions anciennes et attribution des bâtiments de départ manquants). Les fonctions de terrain/placement/décoration prennent la géométrie en paramètre (courante par défaut). Positions de départ : nid (18,20), nurserie (26,20), Paille (22,24). Textes : « + 16 cases », « 144 cases », message « aucune case libre » à 16 bâtiments par parcelle. Oubli de l'étape A corrigé : deux boucles `36` des grilles de placement de `MeadowScene` dérivent désormais de la source.
- **Sauvegarde v11** (`src/persistence/json.ts`, `islandMigration.ts`) : v1–v10 lues et validées sur la géométrie figée jusqu'à un état v10, puis remappées une seule fois : x' = 16⌊x/12⌋ + 2 + x mod 12, y' = 16⌊y/12⌋ + 4 + y mod 12 (bâtiments et décorations posées ; seules coordonnées stockées). Parcelles, ressources, lapins, recettes, missions, reproductions/naissances, niveau, aides et inventaire inchangés. Copie brute sous `prairie-lapins.backup.before-v11` (écrite avant la v11) ; l'export de secours « Exporter la source avant migration » renvoie la source lue dans la session, sinon `before-v11` en premier, puis les anciennes copies (une v9 migrée garde sa copie `before-v10`). Décoration devenue invalide → inventaire ; bâtiment invalide → `INVALID_STATE`, statut `invalid-save`, rien n'est écrit. v11 accepte jusqu'à 144 bâtiments. Un client v10 ne lit pas une v11.
- **Laboratoire** : coordonnées des scénarios = remappage de leurs anciennes dispositions ; `parcelEdges` garde la nurserie contre le bord Centre/Est et le banc à cheval ; libellés « Centre seul — 4 × 4 », « Île complète — 12 × 12 ».
- **Caméra** : un recadrage sans effet ne réécrit plus la position (dérive d'un ulp sur la grande île, qui faisait échouer l'assertion existante d'immobilité au redimensionnement) ; comportement sinon identique.
- **Tests** : coordonnées fines converties par la même règle (disposition identique), cas de bord de parcelle/carte rechoisis sur les nouveaux bords, versions attendues 11, attentes après migration calculées par la règle (copie indépendante `tests/island-remap.ts`). Sauvegardes de test anciennes non modifiées. Nouveaux : `island-migration-v11` (v1→v10 vers v11, partie neuve = disposition cible, île maximale pleine avec objets à cheval sur les parcelles, 400 îles aléatoires à graine fixe, conservation complète, copie before-v11, export/import, pas de relecture en géométrie figée) et `island-migration-safety` (filet de sécurité par remappage volontairement défaillant). Liste détaillée des assertions modifiées : réponse de l'étape B.
- **Vérifications** : `npm.cmd run typecheck` réussi ; **suite complète une fois, `--maxWorkers=1` : 1127/1127, 55 fichiers**, aucun délai dépassé (≈ 1,4 s max) ; `npm.cmd run build:netlify` réussi, 28 fichiers par route, `build-revision.txt` = `a134144dea28db5de1310ef3bd299c7a6a0d9c62`, **non publié** ; démarrage jeu/labo Chromium + WebKit Windows en 390 × 844 et 844 × 390 (8/8) ; contrôle local Chromium : partie neuve v11 aux positions cibles, achat réel de l'extension Ouest au labo (« + 16 cases »), ancienne partie v10 et export v8 publié chargés et migrés, copie before-v11 présente, aucune erreur. Pas un iPhone. Preuves hors Git : `C:\Users\sulli\AppData\Local\Temp\prairie-island-stepB\`.
- **Pour l'étape C** : jointure entre parcelles, mémoire des textures (≈ 98 Mo à résolution 2 pour 9 parcelles), contrôles navigateur (coordonnées anciennes : voir `island-size-plan.md` §5), cadrage du Recentrer (le groupe de départ est centré : l'habitat Paille est désormais une demi-case sous le point de recentrage et apparaît rogné en 844 × 390), coût des grilles de placement (48 × 48 au lieu de 36 × 36 vérifications par dessin), essai iPhone local.

## 2026-10-17 · Claude Code — agrandissement de l'île, étape A (géométrie centralisée)

**Décision du propriétaire (transmise par l'agent de pilotage) : [plan d'agrandissement](island-size-plan.md) validé tel quel** (`877b587`) : parcelles 4 × 4 (+33,3 % par axe, île maximale 12 × 12), cases 176 × 148 inchangées, bâtiments de départ aux positions proposées, prix et niveaux inchangés, sauvegarde v11 avec la migration décrite, découpage A/B/C.

Étape A commitée en **12404f9**, puis ce commit documentaire (hash dans git log -1). **Aucun changement visible ni de sauvegarde.**

- Source unique : `src/config/islandGeometry.ts` (`ISLAND`, `parcelOrigin`). Valeurs : parcelle 3 × 3 cases, 3 parcelles par côté, carte 9 × 9 (81 cases, 9 par parcelle), 12 / 36 cases fines, case 176 × 148, origine 120, parcelle 528 × 444, carte 1584 × 1332, recentrage 4,5, 95 touffes d'herbe par parcelle.
- Utilisée par : `config/land.ts` (positions des parcelles, `MAP_SIZE`, `PARCEL_SIZE`, `parcelAt`), `config/visual.ts` (grille et point de recentrage, donc caméra : limites, zoom minimal, Recentrer), `simulation/habitats.ts` (colonnes), `display/parcelArt.ts` (terrain), `display/MeadowScene.ts` (vue d'ensemble, régions visibles, textures, mode Agrandissement), `ui/GameUI.ts` (« + 9 cases », « 81 cases », île complète), `ui/models.ts` (aucune case libre), `dev/scenarios.ts` (parcours de la carte du scénario dense).
- Volontairement laissé à l'étape B : positions de départ (`state/initial.ts`), coordonnées des scénarios du laboratoire, toute la sauvegarde (`persistence/json.ts`, y compris la largeur héritée `9` des versions ≤ 6 et `config/habitats.ts` `LAND` des v1-v5). `display/islandArt.ts` (non appelé) dérive déjà de `VISUAL.grid`.
- Tests : **aucun fichier de test existant modifié** (git diff vide sur tests/). Nouveau `tests/island-geometry.test.ts` (3 tests) : valeurs dérivées = anciennes valeurs, positions des parcelles, projection, caméra initiale et limites, `parcelAt` identique à l'ancienne implémentation littérale sur toute la carte, `acquiredFootprint`.
- Vérifications : `npm.cmd run typecheck` réussi ; **suite complète une fois, `--maxWorkers=1` d'emblée : 1093/1093, 53 fichiers**, aucun délai dépassé (test le plus long ≈ 1,9 s) ; `npm.cmd run build:netlify` réussi, 28 fichiers par route, `build-revision.txt` = `12404f996db9a52e8e07642f3e9e7e1162870c9b` (jeu et labo), **non publié** ; démarrage jeu `/` et labo `/dev/` en Chromium et WebKit Windows, 390 × 844 et 844 × 390 : 8/8 avec canvas, statut saved, bonne révision, badge labo seulement sur `/dev/`, aucune erreur ni ressource en échec. Captures île de départ/maximale comparées au pixel à celles du build `9b47b07` : écarts limités aux lapins animés de l'habitat, de même ampleur que deux captures du même build ; terrain, bâtiments et interface identiques. Chromium/WebKit PC, pas un iPhone. Preuves hors Git : `C:\Users\sulli\AppData\Local\Temp\prairie-island-stepA-20261017\`.
- Coordonnées en dur restant pour l'étape B : voir la liste dans la réponse de cette étape et le plan ; les fixtures de sauvegardes anciennes ne changent pas (entrées de migration), seules leurs attentes après migration.
- Suite : **étape B** (passage à 4 × 4, v11, migration, positions de départ, scénarios, adaptation des tests avec liste des assertions modifiées), puis **étape C** (rendu, mémoire des textures, jointure, caméra, contrôles navigateur).

## 2026-10-17 · Claude Code — palette de la ferme alignée sur le nid « strong »

**Décision du propriétaire (transmise par l'agent de pilotage) : variante `nest` de la ferme validée et conservée intégrée** (`FARM_PALETTE = 'nest'`). Validation sur les captures ; aucun essai iPhone précisé. Contrôle historique `node docs/farm-art-browser-check.cjs http://localhost:5174/ 9b47b07` rejoué après coup sur le build local `9b47b07` (servi par `npm.cmd run preview`, non publié) : **réussi**, aucune erreur navigateur, texture `farm-windmill-nest.png` chargée une seule fois, alpha 53,94 % transparent sans bord opaque, 13 captures dans `C:\tmp\farm-proof` (dossier par défaut du script, hors Git). Chromium tactile simulé, pas un iPhone.

Branche locale **feature/purchasable-recipes**. Commits : variantes **df06b5a**, intégration **9b47b07**, puis ce commit documentaire (hash dans git log -1). Détails, mesures et méthode : [farm-palette.md](farm-palette.md).

- Fait : recoloration programmatique par familles HSV de la ferme (`scripts/recolor-farm.mjs`, même logique que `recolor-nest.mjs`), sans génération. Herbe olive de l'île, arbres sauge cohérents avec le nid, toit rose poudré, bois/terre/contours légèrement adoucis ; dessin, 1254 × 1254, alpha exact, cadrage, empreinte, bulle de récolte, règles, sauvegardes et textes inchangés ; couleurs de la tête de lapin identiques (vérifié par le script). Pas d'eau dans la ferme.
- Fichiers : original `farm-windmill.png` intact (1 256 162 o) ; `farm-windmill-light.png` 987 686 o (−21,37 %) ; `farm-windmill-nest.png` 954 855 o (−23,99 %).
- Choix en une ligne : `src/config/farmArt.ts:2`, `FARM_PALETTE = 'nest'` (`'original' | 'light' | 'nest'`). Nid et nurserie non touchés.
- `docs/farm-art-browser-check.cjs` suit désormais le fichier sélectionné (non rejoué). Nouveau contrôle `docs/farm-palette-check.cjs`.
- Vérifications : `npm.cmd run typecheck` réussi ; **suite complète une fois, `--maxWorkers=1` d'emblée** (méthode recommandée ci-dessous) : **1090/1090, 52 fichiers**, aucun délai dépassé, test le plus long ≈ 1395 ms ; `npm.cmd run build:netlify` réussi, 28 fichiers vérifiés par route, `build-revision.txt` = `9b47b07f281b6d1069288f68fdb85bcd1ac2a70a` (jeu et labo), PNG du build identiques aux sources. **Non publié.** Contrôle des captures sur ce build servi en local : **63 contrôles réussis, 12 captures**, aucune erreur navigateur (Chromium PC ; décodage aussi WebKit Windows ; pas un iPhone).
- Captures hors Git : `C:\Users\sulli\AppData\Local\Temp\prairie-farm-palette-20261017\{original,light,nest}\` (île entière et ferme avec bulle « Herbe ✓ » prête, 390 × 844 et 844 × 390) + `report.json`, `tests.json`.
- Reste : validation de la variante par le propriétaire (aucun essai iPhone réalisé). Ensuite, selon la suite prévue ci-dessous : agrandissement de l'île de départ et des extensions. La nurserie reste hors périmètre sauf nouvelle demande.

## 2026-10-17 · Codex → Claude Code (HISTORIQUE — sections suivantes jusqu'à « État du dépôt à transmettre » incluses)

**2026-10-17 · Codex → Claude Code.** Le propriétaire garde la décision finale. Tous les changements applicatifs terminés sont commités sur la branche locale **feature/purchasable-recipes**. Dernier commit applicatif : **b1b1dc13bc494398b3ef974eda8c017b3d3ce717** ; validation précédente 628138d ; suppression séparée de l'ancienne référence **0bdd1454f26ecd16b956e04d48f10385b79f233c**. Cette passation est le commit documentaire suivant (hash final dans git log -1). Lire AGENTS.md à la racine avant toute reprise. Un seul agent travaille sur le dépôt à la fois.

## Travaux terminés depuis la reprise de Claude Code

| Travail | Résultat et commits locaux |
| --- | --- |
| Réorganisation de l'interface | **51c79b8**, contrôles/validation ce98340 : HUD sur une ligne, niveau/XP puis pièces/herbes/cœurs avec icône à droite ; Recentrer, photo, engrenage Paramètres à droite ; titre retiré. Colonne Missions, Boutique, Aménager, Collection. Agrandissement déplacé dans Boutique → Île, même logique. Bouton Vue d'ensemble retiré ; méthode de cadrage conservée pour extensions/laboratoire. Safe areas conservées. |
| Écran d'accueil iPhone | **56e33f6**, correctif HUD **80de283**, validation a8a6e58 : manifeste relatif, icônes Paille opaques 180/192/512, balises Apple, barre d'état default, safe areas. Bases / et /Project-L/ vérifiées ; laboratoire sans identité d'application du jeu. Aucun service worker/cache hors ligne ni verrou d'orientation. |
| Zoom Phaser et zoom de page | Caméra **a28a41d**, adaptation d'assertion 974e25e, garde standalone **c36c24f**, validation 725d68e. Le clamp conserve de la terre visible sans recentrage forcé au dézoom ; ancrage au centre du pincement conservé. Politique de zoom natif réappliquée à la reprise de l'app ; Safari classique conserve le zoom d'accessibilité hors surfaces qui le restreignaient déjà. Impression de plateau penché : diagnostic seulement, aucune projection modifiée. |
| Boutons en pierre | Règle de tests locaux **75b80d4**, ressources **a3bd144**, style partagé **56ac091**, validation 17fd025. Cadre transparent neuf zones et grain ; principal sauge, secondaire calcaire, appui assombri, désactivé distinct ; tailles conservées, cibles vérifiées ≥ 44 px. Compteurs exclus. |
| Démarrage en HTTP local | **d74795a** : repli de crypto.randomUUID() sur crypto.getRandomValues() quand l'API manque sur une adresse LAN HTTP. UUID v4 cryptographique ; aucun changement de sauvegarde/règle. Démarrage jeu/labo réellement vérifié sur l'IPv4 du PC. |
| Nouveau nid | Référence **9f3e77b**, illustration **c428ea3**, intégration **dbeb7ea**, validation bf8a341. Jardin rectangulaire 176 × 148 unités remplissant exactement 4 × 4 cases fines ; PNG 704 × 810, origine au pixel (352,514), échelle uniforme 0,25. Les éléments hauts seuls dépassent vers l'arrière ; aucun débord latéral/frontal. Parents séparés à (-27,-16) et (43,-16), devant l'entrée, sélectionnables. Anciennes images intactes. |
| Palette du nid | Variantes programmatiques **281d864**, intégration **b1b1dc1**, validation 628138d. Aucune nouvelle génération : dessin et alpha exacts conservés. Herbe olive, eau turquoise, arbres sauge, dôme rose adouci. PNG légère 724714 octets, moyenne 699459, forte 666614 contre 1256569 avant. **strong sélectionnée et validée par le propriétaire.** Ferme et nurserie inchangées. |

Le correctif badge Netlify 8582a8b a été annulé par fc9e2a7, puis documentation corrigée dans 7ef04bd : badge désactivé par le propriétaire dans les réglages Netlify, réserve de 72 px et contrôle associé retirés.

## Retours explicites du propriétaire

- Build **3bddf78** : jeu, laboratoire et scénario d'achat de recettes fonctionnent sur son **iPhone Safari**.
- Build **80de283** : installation et plein écran validés en **mode écran d'accueil iPhone** ; problèmes de zoom signalés ensuite.
- Build **c36c24f** : corrections du zoom validées sur son **iPhone en mode écran d'accueil**.
- Boutons pierre : **rendu validé sur les captures** ; ne pas présenter cela comme un essai iPhone.
- Nid **dbeb7ea** : **design et occupation de l'empreinte appréciés**, couleurs initialement jugées mal assorties.
- Décision transmise pour cette passation : **variante strong validée et conservée intégrée**. Aucun nouveau test physique iPhone n'est précisé.
- Déplacement de Design île/design île.jpeg vers Design nid/nid.jpeg confirmé par le propriétaire dans la demande de passation : suppression de l'ancien chemin seule commitée dans **0bdd145**. Le contenu conservé est identique (SHA-256 5e96b0274acbd7f5035dfab7a91be1e4ba161b3d67d4dd80e46b2dbf6a1121f6).

Ces essais sont ceux du propriétaire. Chromium/WebKit Windows, même avec un viewport iPhone, ne constituent pas un Safari iPhone physique.

## Suite prévue, non commencée

1. Harmoniser les **couleurs de la nurserie et de la ferme avec l'île**. Ces bâtiments n'ont été modifiés ni pendant le nouveau nid ni pendant ses recolorations.
2. Ensuite, **agrandir l'île de départ, et donc toutes les extensions**. Aucun changement de dimensions, de grille, de règles, d'économie ou de sauvegarde réalisé pour ce chantier.
3. Préserver le nid strong validé, l'empreinte exacte et les parents. Ne pas rouvrir l'harmonisation du dessin des trois bâtiments : ce plan avait été remplacé par le nid seul ; la nouvelle suite porte d'abord sur les couleurs des deux autres bâtiments.

## État vérifié des tests et du build

- Dernière validation applicative : **TypeScript réussi**, **1090/1090 tests réussis dans 52 fichiers**, une seule suite complète lancée pour la tâche palette. Commande depuis le projet : npm.cmd test -- --maxWorkers=1 --reporter=json --outputFile=C:/Users/sulli/AppData/Local/Temp/prairie-nest-palette-20261017/tests.json. Aucun délai dépassé ; test le plus long environ 1369 ms. Aucun délai ni aucune assertion modifiés pendant les tâches artistiques.
- Incident lors de la tâche du nouveau nid : suite complète avec concurrence pendant Chromium, **1081 succès et 9 expirations à 5000 ms**. Huit fichiers concernés : simulation, decorations, collection, new-species, foundations, laboratory, purchasable-recipes, recipe-privacy (tous dans tests/*.test.ts). Relance de ces seuls fichiers, sans navigateur et avec **--maxWorkers=1** : **242/242 succès**, délai original conservé. La suite palette suivante passe entièrement avec un worker : concurrence CPU plausible, cause non prouvée. Garder cette façon de lancer la suite pour limiter la contention.
- Historique zoom : deux anciennes assertions adaptées au comportement demandé (limite caméra dans tests/habitats.test.ts et stabilité exacte au redimensionnement dans tests/ui-models.test.ts, 974e25e) ; aucune assertion économique affaiblie. Détails dans 725d68e et [diagnostic zoom](iphone-zoom-diagnosis.md).
- Contrôles navigateur récents : pierre **55 avant / 279 après**, nid **35 avant / 40 après**, palettes **103 réussis**. Décodage des quatre versions du nid aussi vérifié dans WebKit Windows. Les scripts historiques n'ont pas tous été rejoués ; nest-art-browser-check.cjs référence l'ancienne texture et reste historique, les contrôles actuels sont nest-design-check.cjs et nest-palette-check.cjs.
- Dernier npm.cmd run build:netlify réussi : **26 fichiers vérifiés par route**, jeu / et labo /dev/. Six variantes copiées identiques aux PNG sources ; quatre démarrages finaux Chromium/WebKit × jeu/labo, statut saved, forte seule chargée une fois, aucune erreur.
- Les deux netlify-site/build-revision.txt contiennent **b1b1dc13bc494398b3ef974eda8c017b3d3ce717**, sans suffixe. Hash fourni explicitement via VITE_BUILD_REVISION après vérification d'un diff vide sur les inputs applicatifs, afin de préserver les écarts documentaires/utilisateur hors build. L'artefact est ignoré par Git et n'a pas été publié.
- Avertissements Vite connus : chunks > 500 ko (JS principal du jeu environ 1,49 Mo non compressé / 416 ko gzip) et script classique précoce du laboratoire volontairement non bundlé, effectivement présent et chargé. Aucun découpage de bundle entrepris.
- Pour **cette passation documentaire**, les rapports existants, le code de sélection, les hashes, les références et AGENTS.md ont été vérifiés. **Aucune nouvelle suite, aucun typecheck, aucun build ni essai iPhone relancés** : aucune modification applicative. Serveurs précédents arrêtés ; aucun serveur lancé pour cette passation.

## Règles et test local iPhone

AGENTS.md a été relu : règles à jour, **aucune modification nécessaire**. Aucune opération GitHub (compte suspendu), aucune publication Netlify sans demande explicite du propriétaire : crédits limités. Construire netlify-site/ n'est pas publier. Supabase/comptes/emails restent en pause. Le propriétaire décide des publications, sans dépôt automatique proposé comme validation.

PC et iPhone sur le même Wi-Fi, PC allumé. Depuis prairie-lapins-prototype/ :

    ipconfig
    npm.cmd run dev -- --port 5173 --strictPort

Pour le build local de production déjà préparé, utiliser plutôt :

    npm.cmd run preview -- --outDir netlify-site --port 5174 --strictPort

Relever l'IPv4 Wi-Fi actuelle (192.168.1.13 précédemment, susceptible de changer). Safari iPhone : http://<IPv4>:5173/ pour le jeu, http://<IPv4>:5173/?dev=1 pour le laboratoire ; build local : http://<IPv4>:5174/ et http://<IPv4>:5174/dev/. Ne pas utiliser localhost sur l'iPhone. Ctrl+C arrête le serveur. Accès réel via le Wi-Fi/pare-feu à vérifier depuis l'iPhone ; ne pas modifier le pare-feu automatiquement.

**Standalone via l'adresse LAN HTTP non confirmé sur l'iPhone du propriétaire.** Essayer Partager → Sur l'écran d'accueil → Ouvrir comme app web si disponible, vérifier l'absence de barre du navigateur. Une icône seule ne prouve rien. Si HTTP ne le permet pas, préparer séparément un HTTPS local avec certificat approuvé ; ne pas publier sur Netlify comme contournement automatique. [Procédure et vérifications LAN](local-iphone-testing.md). Stockage local distinct entre Safari et standalone accepté par le propriétaire ; pas de migration automatique.

Windows : Node v24.21.0 / npm 11.19.0 lors des tâches applicatives. Si la politique PowerShell bloque npm.ps1, utiliser npm.cmd / npx.cmd. Git et Vite avaient nécessité des relances autorisées hors bac à sable, aucune modification de sécurité système. Playwright 1.56.1 installé en --no-save ; npm ci le supprime. Réinstallation sans changer package.json : npm.cmd install --no-save --package-lock=false playwright@1.56.1, puis npx.cmd playwright install chromium webkit.

## Références, ressources et preuves

Tout chemin ci-dessous est relatif à prairie-lapins-prototype/ :

- Nouvelle référence du nid : **docs/references/Design nid/nid.jpeg**, JPEG opaque 3024 × 1296. Ancienne référence distincte : docs/references/nest/Nid-original.png.
- Autres références : docs/references/farm/Ferme-original.png, docs/references/nursery/Nurserie-original.png ; boutons : **docs/references/Stone Bouton/bouton-pierre.png.png**, double extension réelle conservée, PNG opaque 1066 × 511.
- L'ancien docs/references/Design île/design île.jpeg était la même image que le nouveau nid ; ce n'est **pas une référence distincte disponible pour le futur agrandissement de l'île**.
- Sélection du nid en une ligne dans **src/config/nestArt.ts:2** : NEST_PALETTE = 'strong', choix 'v2' | 'light' | 'medium' | 'strong'. v2 remet le dessin avant recoloration, pas l'ancienne grotte. Quatre PNG public/assets/buildings/nest-garden-*.png ; ancienne grotte nest-heart-cave.png intacte. Seule la variante choisie est chargée.
- Sources utiles : [nid et empreinte](nest-garden-v2.md), [palettes et script](nest-palette.md), nest-palette-data.json, [boutons](stone-buttons.md), [mode écran d'accueil](iphone-home-screen.md), [zoom](iphone-zoom-diagnosis.md).
- Captures **hors Git**, dossiers existants sur ce PC sous **C:\Users\sulli\AppData\Local\Temp** : prairie-stone-buttons-20261017 (18 PNG), prairie-nest-design-20261017 (20 PNG), prairie-nest-palette-20261017 (16 PNG, dossiers current/light/medium/strong + rapports). Ces fichiers temporaires ne sont pas des sauvegardes durables.

## État du dépôt à transmettre (HISTORIQUE, 2026-10-17)

> **Historique**, antérieur à Cuisine : ne décrit plus l'état courant (travail Cuisine non commité, sauvegarde v12). Voir l'entrée canonique en tête de fichier.

Tout le travail terminé est commité ; la seule entrée locale non suivie à conserver est **.claude/settings.local.json**, configuration de permissions de Claude Code, **ni modifiée ni commitée**. SHA-256 relu : baa0664bb85c89db0ae24e638c9475e31d25884388d7ec0becb0a4e23342651d. La suppression confirmée de l'ancien chemin de référence est désormais commitée séparément.

Sauvegardes **v10** (recipeBook), règles des recettes achetables inchangées. La confidentialité est un filtre d'affichage, jamais une modification du tirage ; aucun complément en cœurs pour les recettes. Migration v10 non lisible par client v9, backup prairie-lapins.backup.before-v10. Détails du chantier initial ci-dessous et dans purchasable-recipes-plan.md. Les anciennes mentions de publication/CI dans le journal historique ci-dessous décrivent le passé : les règles actuelles ci-dessus et AGENTS.md font foi.

# Recettes achetables — v10 (branche `feature/purchasable-recipes`, publiée manuellement sur Netlify)

Publication du build `3bddf78` sur https://velvety-squirrel-142402.netlify.app confirmée par le propriétaire. Selon son retour du 2026-10-16, le jeu, le laboratoire et le scénario d'achat de recettes fonctionnent sur son iPhone Safari. Cet essai est celui du propriétaire, sans détail supplémentaire fourni.

Acheter une recette révèle ses conditions ; aucun lapin, aucune naissance garantie, aucune XP ni mission. Le tirage, la garantie, les seuils d'affection, les parents imposés et les niveaux sont inchangés : une recette inconnue n'empêche aucune reproduction. Recette connue = espèce découverte ou recette possédée ; Brumelin est offert à toutes les parties ; les communs sont révélés par leur découverte. Achat en pièces uniquement, au niveau de l'espèce, jamais complété en cœurs. Prix : Mottelin 60, Bouée 150, Feu Glacé 180, Géant 350, Lunettes 220, Perroquet 250, Magicien 450, Dragon 900. [Spécification et décisions](purchasable-recipes-plan.md).

Confidentialité : au nid, les résultats de recettes inconnues forment une seule ligne exacte « Résultats inconnus : X % » (somme des poids entiers du tirage) ; exclusions par niveau anonymes ; parents du Dragon et espèces hors garantie retirés des textes fixes. Carnet (Collection et onglet Recettes de la boutique, même rendu) : nom, types, rareté, niveau et prix [pièce] avant achat ; bouton `Acheter · N` avec confirmation ; conditions, paires et raccourci après. Annonce de niveau `Recette(s) en boutique · N`. Laboratoire : scénario « Recettes — achats au niveau 14 » et outil de réinitialisation des recettes achetées.

Sauvegarde v10 : champ `recipeBook`, migration unique des v1 à v9 avec Brumelin offert, aucun débit, résultats en cours conservés ; copie brute dans `prairie-lapins.backup.before-v10`. Aller simple : un client v9 ne lit pas une partie ni un export v10.

Validation initiale : 1 074 tests / 48 fichiers et TypeScript. Depuis, le script de build Windows a été corrigé (`f37e47c`) et les 28 contrôles navigateur ont été rejoués localement par Claude Code (voir Passation). Essai Safari iPhone du propriétaire sur `3bddf78` consigné ci-dessus ; aucun résultat de CI connu.

# Niveaux joueur — validation finale v9

Série issue de `feature/player-levels` / `34ed85a`, cinq familles actives. Validation complète : 1 015 tests initiaux, plus quatre migrations de sauvegardes réellement produites par production v8 ; parcours neuf sur build normal, aides et commandes réelles, zéro ressource/XP injectée. Naissance commune observée : 305 XP, niveau 3, 140 pièces/76 herbes/14 cœurs ; Brumelin et délais normaux en simulation. Correction du HUD à grands soldes (hauteur réellement occupée, commandes accessibles en petit paysage/portrait), du raccourci Terre (habitat compatible supplémentaire), des attentes historiques des scripts de contrôle et de la documentation courante. Aucun réglage de barème ni changement d’économie.

[Configuration, tableau du début, simulations reproductibles, limites et retour arrière compatible v9](player-progression.md#validation-finale-et-livraison-de-la-série). Publication subordonnée à la CI de PR puis aux contrôles publics des quatre routes. Prévisualisations et Supabase préservés.

## Étape précédente

# Départ Paille seul — étape 4 publiée `acb64e4`

Nouvelle partie : parcelle centrale, habitat Paille niveau 1 avec Paille affection 1 seul, nid et nurserie offerts ; 300 pièces, 10 herbes, 12 cœurs, seule Paille découverte. Achats guidés du Jardin enneigé (200) puis Neige (80), placement/accueil confirmés manuellement et récompense unique de 60 à réclamer. Deux nouveaux objectifs, ancien ordre réorganisé sans doubler les récompenses, actions anticipées reconnues et deux habitats conservé comme branche ultérieure. Les parties précédentes gardent leurs habitats, occupants, missions et aides ; le marqueur optionnel v8 distingue le nouveau parcours sans récompense rétroactive.

Recette de Brumelin en consultation avant reproduction gratuite, ferme pendant l’attente, aides facultatives liées aux travaux, récolte/transfert/accueil manuels ; naissance commune suffisante et Terre débloqué à l’accueil. Budget minimal sans revenus ni cœurs : 300 − 200 − 80 + 60 = 80 ; ferme 60 + petite production 10 laisse 10. Parcours complet observé par commandes avec les récompenses initiales : 140 pièces, 76 herbes, 12 cœurs, hors branches et quotidiennes.

Validation : tests ciblés, TypeScript, builds normal/laboratoire, [CI obligatoire](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38430028317), 720 tests et contrôles sources/builds. Chromium tactile 667 × 375 et portrait 390 × 844 : achats annulés puis confirmés, reprise, parents dans deux habitats et retour, trois aides et attente normale simulée au laboratoire. Tests des résultats commun/Brumelin et de la conservation des anciennes parties. [Publication et contrôles publics](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38431910313) : révision servie et quatre routes préservées. Safari physique non testé. Captures : [accueil de Neige en paysage](proofs/start-step4/neige-landscape.png), [boutique en portrait](proofs/start-step4/shop-portrait.png). Prix, probabilités, illustrations, caméra et prévisualisations conservés ; Supabase en pause. Étape 5 non commencée.

Essai iPhone, au laboratoire pour préserver la partie normale :

1. Charger « Début guidé — nouvelle partie » : Paille seul, habitat Paille, nid/nurserie et 300/10/12.
2. Annuler puis confirmer l’habitat Neige et Neige ; réclamer 60, constater le solde de 80.
3. Nourrir les deux jusqu’à 2, consulter Brumelin et lancer gratuitement ; parents au nid, places réservées.
4. Acheter la ferme pendant l’attente, produire/récolter ; essayer les aides facultatives puis transférer manuellement, parents de retour.
5. Accueillir après croissance dans un habitat compatible, réclamer la naissance, vérifier Terre puis recharger : progression et aides conservées, récompenses disparues.


# Déblocages d’achat — étape 3 publiée `b2fd16a`

Terre après une naissance accueillie, universel à 3 découvertes, Feu à 5 et Volant à 7 : droits permanents, indépendants de la réclamation et de l’affichage des missions. Cartes verrouillées visibles, suivi du palier, notifications groupées et raccourcis d’habitats compatibles achetables. Le nouvel objectif 7 espèces ne donne aucune monnaie. Registre optionnel v8 et droits historiques reconnus sans inventer de naissance ou de récompense. Départ Paille/Neige, prix, reproduction, illustrations, caméra et parcours d’achat conservés ; Supabase en pause.

Validation : tests ciblés, TypeScript et builds ; [CI obligatoire](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38180231732), 714 tests et parcours navigateur réussis. Chromium tactile 667 × 375 et contrôle portrait 390 × 844 : suivi sans dépense, achat Bélier → troisième découverte/universel sans naissance fictive, rechargement, accueil du scénario à cinq découvertes → Feu, Volant à 5/7 et isolation normal/laboratoire. [Publication et contrôles publics](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38180819953) : révisions servies et prévisualisations préservées. Safari physique non testé. Captures : [cartes verrouillées en paysage](proofs/purchase-step3/locked-landscape.png), [palier 5 acquis en portrait](proofs/purchase-step3/unlocked-portrait.png).

# Achats et placement — étape 2 publiée `6fd3cf3`

Aperçus gratuits de bâtiments/décorations, paiement et création à la pose confirmée, annulation vers la catégorie et son défilement, objet sélectionné après réussite. Achat explicite de décoration pour l’inventaire et pose gratuite des exemplaires possédés. Choix d’habitat sur l’île et confirmation distincte pour les lapins, places des parents réservées et raccourcis sans achat quand les habitats manquent ou sont pleins. Achats sauvegardés atomiquement ; compléments en cœurs liés à la destination définitive. Prix, disponibilités, tutoriel, sauvegardes v8, illustrations, caméra et prévisualisations conservés ; Supabase en pause.

Validation : 366 tests ciblés ; [CI obligatoire réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38173343265), 701 tests, TypeScript et builds. Chromium tactile 667 × 375 puis disposition 390 × 844 : placement refusé/annulé/validé, deux habitats admissibles, confirmation double, achat d’inventaire puis pose gratuite, rechargement d’un aperçu sans achat. Contrôle ciblé du déplacement et des occupants après adaptation à la sélection conservée. [Publication et contrôles publics](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38176933681) : normal/laboratoire et prévisualisations vérifiés. Safari physique non testé. Captures : [choix d’habitat en paysage](proofs/purchase-step2/rabbit-landscape.png), [aperçu gratuit en portrait](proofs/purchase-step2/decoration-portrait.png).

# Boutique plein écran — publiée `14f9d02`

Écran opaque à quatre catégories, carnet en consultation et onglets Bâtiments/Décorations. En-tête fixe : ressources, Retour, Fermer. Navigation et défilement conservés ; fermeture restaurant la vue et le mode Aménagement précédents. Achats, placements et choix d’habitat existants ; raccourcis adaptés. Gestes bloqués vers la prairie, simulation et sauvegarde actives. Règles, prix, sauvegardes v8, illustrations et caméra conservés ; Supabase en pause.

Validation : 72 tests d’interface ciblés, TypeScript et deux builds ; [CI obligatoire réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38169792940) (697 tests), [publication et contrôles publics](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38170437604). Chromium tactile 667 × 375 et 390 × 844 : navigation, défilement, absence de gestes traversants, achat annulé, raccourci du tutoriel et retour en Aménagement. Révisions servies vérifiées, prévisualisations figées conservées. Safari physique non testé. Captures : [accueil en paysage](proofs/fullscreen-shop/home-landscape.png), [lapins en portrait](proofs/fullscreen-shop/rabbits-portrait.png).

# Menus et confort tactile — publiés `3516218`

Harmonisation des onze menus, états et actions, Retour avec contexte, filtres/défilement conservés, contrôles protégés pendant les actualisations et paramètres regroupés. 694 tests, TypeScript, quatre builds, neuf suites sur sources et 54 contrôles HTTPS réussis ; 52 vues de menus aux quatre formats demandés. Quatre routes vérifiées, prévisualisations conservées. Règles, illustrations, caméra et sauvegardes v8 inchangées ; Supabase en pause. Voir [comparaisons avant/après, preuves et essai iPhone](ui-comfort.md). Safari physique reste à vérifier.

# Validation finale du début — publiée `63d74eb`

Budget initial et projections 24 h vérifiés par simulation ; corrections du guidage de ferme/nurserie, du raccourci Terre et du carnet après tutoriel. 689 tests, TypeScript, quatre builds et 48 contrôles publics réussis, sans erreur navigateur ; quatre routes HTTPS et prévisualisations conservées. Partie neuve complète sur normal sans ressources ajoutées : 17,620 s d’automate, pas une mesure humaine ; attente normale testée par horloge explicite de laboratoire. Voir [bilan économique, preuves et essai iPhone](start-validation.md). Aucun changement d’équilibrage ; Safari physique reste à vérifier.

# Aides d’initiation — publiées `f2c3ad9`

Trois droits persistés sur des travaux précis, récolte/transfert/accueil manuels, célébration unique de première naissance. 682 tests, TypeScript, quatre builds et 45 contrôles navigateur publics réussis ; normal/laboratoire v8, deux prévisualisations préservées. Voir [règles et essai iPhone](initiation-aids.md).

# Début guidé facultatif — livré v8

Normal et laboratoire : `251391c1ae16b7b1a5453be53ac8cfdb636f1848`, sauvegardes v8. Parcours jusqu’à l’accueil, y compris d’un commun ; délais normaux, aucun hybride promis, aucune aide d’initiation. Récompenses par les missions existantes, consultations et reprise persistées dans les préférences d’interface. Anciennes parties non inscrites automatiquement. Scénario de nouvelle partie et correction de hauteur de carte sur petit paysage. [Règles, preuves, captures et essai iPhone](guided-start.md).

Validation finale : 668 tests, TypeScript, quatre builds et 40 contrôles publics sans erreur. Prévisualisations conservées ; règles, sauvegardes, illustrations et caméra inchangées. Le navigateur est Chromium tactile, pas Safari physique.

# Missions du début actuel — livrées v8

Application `ff8966c9d53404d8c160860fd17c6aef11912fc0`, depuis `fc882e3`. Sept objectifs initiaux successifs après réclamation, puis huit objectifs parallèles. Cartes récompensées masquées ; réclamations historiques et identifiants équivalents conservés. Cinq compteurs d’actions réussies, sans historique inventé ni naissance déduite d’un achat. Quotidiennes et bonus inchangés, réapparition au nouveau cycle. Scénario `missionJourney` avec dotation initiale et commandes réelles. Raccourci du deuxième parent corrigé ; aucun nouveau tutoriel, visuel ou règle économique.

659 tests / 22 fichiers, TypeScript, builds normal/laboratoire ; [publication](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38086664490) avec quatre routes contrôlées et dix suites / 36 contrôles publics sans erreur. Prévisualisations Comptes v4 et Décorations v5 conservées, Supabase en pause. [Règles, migration, captures, preuves et essai iPhone](missions-current.md).

# Vue d’ensemble — livrée

Application `c37966c10756dfe45bbfefae9e4ce63c446f599f`, [PR nº 9 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/9), depuis production `8bd2263` (application `687075e`). Minimum de référence 0,4, limite adaptative selon écran et espace visible ; Vue d’ensemble pour les parcelles acquises, Agrandir pour les neuf possibles. Recentrer 1,05 et maximum 1,65 conservés. Noms/bulles progressivement masqués, sélection sans agrandissement des voisins, sauvegardes v7 inchangées.

[CI réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38064379170) : TypeScript, 627 tests / 20 fichiers, deux builds, contrôles Chromium tactiles et huit suites / 31 contrôles des builds réels. Arbre livré `a70db89048f90dea5d1b386661bfd3972c0d223c` identique à la fusion testée. [Preuves CI](validation/camera-overview/ci.json). [Publication réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38065148706) : quatre révisions et formats confirmés, huit suites / 31 contrôles publics sans erreur. [Preuves durables](validation/camera-overview/publication.json). Décorations v5 et Comptes v4 conservés ; Supabase en pause. [Cadrage, captures avant/après et essai iPhone](camera-overview.md).

# Placement fin des bâtiments — livré v7

Travail depuis production `45e2d2d` (application `550dceb`). Tous les bâtiments utilisent les coordonnées entières fines et l’empreinte commune 4 × 4 ; achats et déplacements unitaires, collisions partagées, aperçu, confirmation et annulation. Migration v6 → v7 sans décalage, décorations inchangées et secours brut conservé. Cache des bâtiments indépendant des parcelles, illustrations réutilisées sans coupure ni duplication. Les six visuels de lapins validés sur Safari sont conservés.

614 tests / 19 fichiers, TypeScript et deux builds réussis. Chromium tactile et build réel : refus, annulations, doubles pressions, gestes, rechargement, cache et sept lapins sélectionnés à trois zooms après déplacement. Scénario `fineBuildings` ajouté aux quinze scénarios du laboratoire. [Règles, captures et essai iPhone](fine-buildings-v7.md). Application `687075e8989cb64a9f45db73765b96581372cb3c`, [PR nº 8 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/8). [CI réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38049916234) : arbre livré identique à la fusion testée. [Publication réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38050582414) : quatre révisions et formats confirmés, sept suites navigateur, 27 contrôles publics sans erreur. [Preuves durables](validation/fine-buildings-v7/publication.json) · [Captures publiques](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38050582414/artifacts/11669092804). Décorations v5 et Comptes v4 restent figés, Supabase en pause.

# Bélier Gris, Feu et nouveau Volant — livrés

Jeu normal et laboratoire : application `550dceb49c4c42f54da799137dd37e0c9c9c4fe9`, [PR nº 7 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/7). Le nouvel original complet `volant.png` remplace l’ancien museau coupé ; ancien fichier supprimé. Bélier Gris et Feu sont également finalisés. Trois PNG fidèles, transparence préparée sans changement des RGB opaques, textures réutilisées dans habitats et tous les portraits, taille uniforme selon le corps, ancrage et animation légère de l’image entière. [Sources, méthode et comparaisons](belier-feu-volant-v1.md) · [preuve de publication](validation/belier-feu-v1/publication.json).

[CI réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38045871955) : 586 tests / 18 fichiers, TypeScript, deux builds, parcours existants, 21 sélections des sept occupants mixtes aux trois zooms, oreilles et aile, rejet des marges transparentes, profils, boutique, collection, parents et orientation portrait. Arbre livré identique à la fusion testée. [Captures CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38045871955/artifacts/11666579253).

[Publication réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38046399231) : quatre routes et révisions confirmées, six suites navigateur, 25 contrôles publics. Les six PNG servis sont vérifiés par SHA-256, dimensions et transparence. [Captures publiques](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38046399231/artifacts/11667004162).

Neige, Paille et Terre validés sur iPhone par le joueur conservent exactement leurs assets et paramètres. Autres espèces, règles, sauvegardes, caméra, île, habitats et décorations inchangés. Décorations v5 `85fe255` et Comptes v4 `3e70d9e` conservés ; Supabase en pause. Les trois nouveaux rendus sont vérifiés par Chromium tactile, sans iPhone physique disponible.

# Paille et Terre originales v1 — livrées

Jeu normal et laboratoire : application `5248235b964947d67ae295f64d5832525d2e1d93`, [PR nº 6 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/6). Deux visuels remplacés depuis les fichiers ajoutés par le joueur, transparence préparée avec conservation des couleurs opaques (différence RGB maximale 0). Même texture dans habitats, fiches, boutique, collection, carnet et parents. Échelle uniforme, ancrage et animation légère de l’image entière ; sélection par la silhouette alpha propre à chaque espèce, oreilles comprises. [Sources, méthode et comparaisons](paille-terre-v1.md) · [Preuve de publication](validation/paille-terre-v1/publication.json).

[CI réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38043020922) : **586 tests / 18 fichiers**, TypeScript, builds normal/laboratoire, parcours existants et Neige, 21 sélections parmi sept occupants mixtes aux zooms 0,8 / 1,05 / 1,65, oreilles, fiches, boutique, collection, parents et écran portrait. L’arbre Git de la livraison est identique à celui de la fusion testée. [Captures et rapports CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38043020922/artifacts/11666244571).

[Publication et essais publics réussis](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38043530418) : quatre routes et révisions confirmées, cinq suites Chromium et 23 contrôles réussis. Les deux routes actives servent les bons PNG Paille 350 × 495 et Terre 992 × 907, vérifiés par SHA-256, dimensions et transparence ; portraits contrôlés sans hook ni injection de sauvegarde. [Preuves et captures publiques](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38043530418/artifacts/11667290388).

Neige conserve son PNG `b85337b3d3b3079644fb3df3e7f13f50e4226a0389a5b1a1c95fabf3f348276a`, son échelle, son ancrage et son rendu. Autres espèces, règles, sauvegardes, caméra, île, habitats et décorations conservés. Décorations reste en v5 `85fe255`, Comptes en v4 `3e70d9e` ; Supabase/email restent en pause. Les autres designs ajoutés sur GitHub sont conservés pour une future demande. Chromium avec émulation tactile ; Safari sur iPhone physique reste à vérifier.

# Neige originale v1 — livrée

Jeu normal et laboratoire : application `28eb90712608aab08517cc551d0ed8d1d508f613`, [PR nº 5 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/5). Remplacement du seul visuel `neige` depuis l’original fourni, détouré avec conservation des RGB opaques (différence maximale 0). Même asset dans l’habitat, la fiche, la boutique, la collection et les parents ; échelle uniforme, ancrage au sol, translation de l’image entière et sélection par silhouette alpha. [Original et préparation](neige-v1.md) · [Comparaison référence/jeu](validation/neige-v1/reference-vs-game.png) · [Preuve de publication](validation/neige-v1/publication.json).

[CI réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37994018115) : **584 tests / 17 fichiers**, TypeScript, builds normal/laboratoire et parcours existants. Vingt-et-une sélections individuelles parmi sept occupants mixtes aux zooms 0,8 / 1,05 / 1,65 ; fiche, boutique, collection, choix des parents et orientation portrait. Les sources de la branche, de la fusion testée et de la livraison ont exactement le même arbre Git. [Captures et rapports CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37994018115/artifacts/11645989160).

[Publication et essais publics réussis](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37994696234) : quatre révisions vérifiées et quatre parcours Chromium réussis. Normal et laboratoire servent le PNG SHA-256 `b85337b3d3b3079644fb3df3e7f13f50e4226a0389a5b1a1c95fabf3f348276a`, avec dimensions 518 × 473, transparence et pixel du pelage confirmés. Aucun hook ni injection de sauvegarde dans ce contrôle des builds. [Captures et preuves publiques](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37994696234/artifacts/11646487897).

Autres lapins, règles, sauvegardes v6, caméra, île et décorations conservés. Décorations reste en v5 `85fe255`, Comptes en v4 `3e70d9e` ; Supabase/email restent en pause. Aucun travail engagé sur le prochain lapin. Chromium avec émulation tactile ; Safari sur iPhone physique reste à vérifier selon le [parcours court](neige-v1.md).

## Fondations techniques v6 — livrées

Jeu normal et laboratoire : application `49cab78a87e4b68ca7f8ec90390980e391846cb4`, [PR nº 4 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/4). Publication et contrôles des quatre routes réussis. [Preuve durable](validation/foundations-v6-2026-10-09.json) · [Architecture, invariants et limites inter-onglets](technical-foundations.md).

Corrections des crédits numériques, allocations et échéances avant paiement ou tirage ; arrêt des commandes d’un onglet obsolète avec export de sa copie en mémoire ; confirmations liées au remplacement réel de la partie ; nettoyage des listeners et expiration du cache anti-double pression ; conservation de la source illisible exportable lors d’une notification externe. Aucun contenu, équilibrage ou visuel ajouté ; format v6, migrations, clés et cache du terrain conservés.

[CI finale réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37989448529) : 582 tests / 16 fichiers, TypeScript, builds normal/laboratoire, migration et gestes tactiles. Trois traces reproductibles de 180 commandes avec vérification des invariants, sauvegardes, tirages et équivalence temporelle à chaque étape. [Captures et rapports CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37989442388/artifacts/11644646696).

[Publication et essais publics réussis](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37990079926) : neuf groupes normal, sept laboratoire et trois sessions/conflits, sans injection dans les builds. Les révisions réellement servies sont vérifiées dans le JSON public et le JavaScript applicatif : normal/laboratoire `49cab78`, Décorations v5 `85fe255`, Comptes v4 `3e70d9e`. [Preuves publiques](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37990079926/artifacts/11644393022).

Chromium ne remplace pas Safari sur iPhone. Lecture/comparaison/écriture de localStorage ne constitue pas une transaction entre onglets : utiliser un seul onglet actif par partie. Le [parcours iPhone](technical-foundations.md#vérifications-reproductibles) comporte trois étapes. Comptes email et Supabase toujours en pause.

## Livraison précédente v6 — île à neuf parcelles et objets extérieurs

Jeu normal et laboratoire : application `ecb8953ffd1b2df2e414d31bb162d60b2c9e3e79`, [PR nº 3 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/3). Huit achats libres de 500 à 4000 pattes, diagonales comprises ; douze objets exclusivement extérieurs ; une conversion vers v6 conservant les exemplaires, missions, ressources et travaux. Quinze espèces et règles économiques/reproduction inchangées. [Règles, conversion et parcours iPhone](land-v6.md), [preuve de publication](validation/production-v6-2026-10-09.json).

[CI réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37983514087) : 569 tests / 15 fichiers, TypeScript, builds normal/laboratoire, conversion avec message unique, douze sélections tactiles, acquisition diagonale sans intermédiaire, forme en L/île complète et contrôle ciblé du cache. Neuf groupes normal et sept laboratoire avec quatorze scénarios, sans injection dans les builds. [Captures et rapports CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37983514087/artifacts/11642701225). Caméra et sélection également contrôlées aux quatre diagonales éloignées en paysage 852 × 393. Chromium ; aucun nouvel essai Safari physique prétendu.

Les quatre routes restent dans un artefact Pages unique : normal/laboratoire v6, Décorations figé en v5 `85fe255`, Comptes figés en v4 `3e70d9e`. Partie, horloge, préférences et secours du laboratoire restent isolés ; aucune action email, Supabase ou SQL. Les exports v6 ne sont pas compatibles avec les anciens clients et Comptes v4. Ne pas effacer les données Safari ; fermer les anciens onglets avant de rouvrir.

Les bilans précédents restent dans l’historique Git.
