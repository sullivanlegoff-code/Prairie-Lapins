# Passation — « Cours cours Benny ! » (13 novembre 2026)

Pour l'agent qui reprend le mini-jeu. Lire d'abord `AGENTS.md`, puis `docs/passation-2026-11-12-cours-benny.md` (règles, fichiers, commandes), puis ce fichier. Ce fichier remplace la section « Ce qui reste à faire » de la passation du 12 novembre.

## 1. Où en est le chantier

- **Branche** : `feature/cours-benny`, dernier commit `c1d7814` (lot 113). Arbre dédié : `.claude/worktrees/cours-benny`.
- **Rien n'est fusionné ni publié.** Ne pas faire `git merge` dans `main` ni `git push` : le propriétaire le dit lui-même. Ne jamais lancer la mise en production.
- **Derniers lots** :
  - 108 : fond de ciel peint (concept C), palette commune aux trois décors ;
  - 109 : objets (pièces, obstacles) posés à la hauteur des marches et des plateformes ;
  - 110 : chute dans le vide, le dragon rattrape Benny sur son dos (animation `fallCatch`) ;
  - 111 : monstre frappé qui s'estompe (`ghosts`) ;
  - 112 : quatre poses de Benny ajoutées à l'atlas `benny-moves` (`windup`, `land`, `fall`, `push`) ;
  - 113 : pose `push` pendant les 180 ms de départ d'une course sur mur.
- **Validation à la dernière passe** : suite complète verte (239 fichiers, 2 241 tests réussis, 1 ignoré) ; `npx tsc --noEmit` sans erreur ; tests de la course 98/98.

## 2. Ce qui est fait et ce qui manque

### Objectif 1 — Benny animée dans le jeu
- Fait : l'atlas `benny` (six poses validées : `run-1`, `run-2`, `jump`, `roll`, `wall`, `strike`) est le même qu'avant. L'atlas `benny-moves` existe (quatre poses) et est utilisé : `windup` (80 ms après un coup), `land` (`land > .25`), `fall` (chute), `push` (180 ms au départ d'un mur).
- Reste :
  - vérifier au ralenti chaque transition dans Chromium (l'ordre et la durée des poses) ;
  - comparer chaque pose à la Benny du jeu (couleurs, contour, proportions). Les planches de transition sont plus proches de la planche validée que les premières tentatives, mais ce n'est pas contrôlé pose par pose ;
  - ajuster les durées (80 / 150 / 180 ms) d'après ces essais.
- Fichiers : `scripts/prepare-benny-run-art.mjs` (table `CHARACTERS`), `src/config/bennyRunArt.json`, `public/assets/benny-run/benny-moves.webp`, `src/ui/BennyRunActivity.ts` (fonction `benny`).

### Objectif 2 — Monstres et ennemis dans le style du concept C
- Fait : la disparition en fondu quand Benny frappe (`ghosts`, lot 111). La chute avec le dragon (lot 110).
- **Bloqué** : la planche des trois états du coffre (intact, projeté, brisé) est dans `output/imagegen/coffres-v1/planche-coffres2.png` (copie de travail dans `output/imagegen/course-benny-final-v1/sheet-chests.png`). Le script d'atlas trouve **4 dessins** là où il en attend **3** : un élément détaché reste (une étincelle, un morceau de pièces). L'effacement par canevas n'a pas suffi. Solution à faire : une planche « un coffre par case, rien autour », ou un nettoyage manuel.
- Reste :
  - intégrer les coffres (états intact / projeté après le premier coup / brisé) : l'entité a déjà `hp` (2 coups) et `knock` (projection) côté simulation ;
  - dragonnets, braises, volants dans le même style (planches peintes) et intégration (atlas `creatures`) ;
  - disparition animée adaptée à chaque type.

### Objectif 3 — Décor peint de la piste
- **Pas commencé.** Reste : textures d'herbe et de planches de bois ; murs praticables en terre et herbe, distincts des murs de pierre grise (la règle est en place dans la simulation, `runnable`, `void`) ; bord du vide ; rendu puis contrôle de lisibilité sur petit écran.
- Le fond de ciel (`public/assets/benny-run/fond-ciel.png`, 1,5 Mo) doit être réduit (webp) avant publication.

## 3. Règles à respecter (en plus d'`AGENTS.md`)

- **Codex sert uniquement à produire des images**, jamais à coder. Le code est écrit par l'agent. Scripts de génération dans `output/imagegen/<sujet>/` (ignorés par Git), avec `run.sh` et les prompts `p-*.txt`.
- **Ne jamais donner les captures de Blade of Brim à un outil d'image** (ni les images de ce jeu). Le propriétaire le demande pour la mécanique seulement : on ne copie ni les images, ni le nom, ni les personnages. Références autorisées : nos captures, la fiche de Benny (`output/imagegen/benny-enclos-final-v1/A1-reference.png`), la planche validée (`output/imagegen/course-benny-final-v1/concept-benny-A.png`), la planche de créatures (`sheet-creatures.png`).
- **Benny doit rester très proche de celle du jeu** : c'est le seul garde-fou visuel. Toute planche de Benny est comparée à la Benny du jeu avant intégration.
- **Pas de son, pas d'économie, pas de progression** (décisions du propriétaire, à ne pas toucher).
- **Pas de mise en production**, pas de fusion dans `main`, pas de `push`.
- **Interface et confort, et tests de qualité** : à faire dans le jeu, puis test complet.
- **Atlas** : la commande de l'atlas se lance depuis le worktree avec les chemins de la passation du 12 novembre :
  `PLAYWRIGHT_MODULE="C:/Users/sulli/Documents/Project-L/prairie-lapins-prototype/node_modules/playwright/index.js" node scripts/prepare-benny-run-art.mjs --sources ../../../output/imagegen/course-benny-final-v1 --reference ../../../output/imagegen/benny-enclos-final-v1/A1-reference.png`
  Le script exige exactement autant de dessins que de poses dans la planche.
- **Chromium** : serveur de dev sur `127.0.0.1:5199` (`node node_modules/vite/bin/vite.js --port 5199 --strictPort --host 127.0.0.1`), puis Playwright ; arrêter seulement son propre processus. Aperçu iPhone : `npm run build:netlify -- --configLoader runner`, puis le serveur de prévisualisation sur le port 5175 (le 5174 est occupé par un autre processus : ne pas le toucher).

## 4. Commandes de validation

- `npx tsc --noEmit`
- `npx vitest run --configLoader runner --maxWorkers 1 --testTimeout 120000 benny-run` (tests de la course, environ 1 minute)
- `npx vitest run --configLoader runner --maxWorkers 1 --testTimeout 30000` (suite complète, environ 10 minutes, seule)
- `git diff --check`, et `git restore tests/__snapshots__/procedural-art.test.ts.snap` si seul le changement de fin de ligne apparaît.

## 5. Décisions du propriétaire déjà prises

- Seule la course change pour cette phase (pas le reste du jeu).
- Benny : la peinture du jeu comme référence.
- Le concept C remplace les trois décors (grotte, pont, montagne) ; les trois décors partagent la palette C pour l'instant.
- Chute dans le vide : fin de partie, avec l'animation du dragon qui rattrape Benny.
- Les murs praticables doivent se distinguer des murs de pierre ; le vide est une zone où l'on perd.

## 6. Ordre conseillé

1. Débloquer les coffres (planche « un coffre par case »), puis intégrer les trois états et la version projetée.
2. Dragonnets, braises, volants : planches, intégration, disparition animée.
3. Décor peint de la piste (textures, murs, bord du vide), contrôle de lisibilité.
4. Retour sur Benny : vérification au ralenti de chaque transition, comparaison de fidélité pose par pose, réglage des durées.
5. Interface et confort, puis tests de qualité complets.
