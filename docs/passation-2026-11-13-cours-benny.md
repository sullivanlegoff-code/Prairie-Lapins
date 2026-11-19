# Passation — « Cours cours Benny ! » (13 novembre 2026)

Pour l'agent qui reprend le mini-jeu. Lire d'abord `AGENTS.md`, puis `docs/passation-2026-11-12-cours-benny.md` (règles, fichiers, commandes), puis ce fichier. Ce fichier remplace la section « Ce qui reste à faire » de la passation du 12 novembre.

> **Mise à jour (lots 114 à 119)** : les trois objectifs sont faits ; voir la section 7, qui remplace la section 2 pour l'état actuel.

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
  `PLAYWRIGHT_MODULE="<chemin vers playwright>/index.js" node scripts/prepare-benny-run-art.mjs --sources ../../../output/imagegen/course-benny-final-v1 --reference ../../../output/imagegen/benny-enclos-final-v1/A1-reference.png`
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

## 7. Suite du 13 novembre : lots 114 à 119

### Objectif 1 — Benny (lots 115 et 119)
- **Fidélité, pose par pose**, contre la Benny du jeu (`public/assets/rabbits/benny/benny-v1.png`). Écarts de couleur en ΔE (sous 5 : à peine visible).
  - Avant : pelage fidèle (0,4 à 2,2), mais contour trop clair sur les dix poses (8,5 à 11,9 ; brun `#82512c` contre `#693f26`) et crème de l'atterrissage trop blanche (7,2).
  - Correction dans `scripts/prepare-benny-run-art.mjs` (`matchBenny`) : chaque pose reprend le contour et la crème de la Benny du jeu.
  - Après :

| Pose | ΔE pelage | ΔE crème | ΔE contour |
|---|---|---|---|
| run-1 | 0,9 | 1,4 | 2,9 |
| run-2 | 0,5 | 1,4 | 4,2 |
| jump | 1,1 | 1,7 | 2,6 |
| roll | 1,1 | 0,0 | 3,7 |
| wall | 0,9 | 0,5 | 3,4 |
| strike | 1,2 | 0,0 | 2,8 |
| windup | 1,6 | 0,5 | 2,5 |
| land | 3,0 | 0,9 | 2,7 |
| fall | 1,2 | 0,5 | 3,7 |
| push | 1,5 | 1,0 | 3,3 |

- **Durées** (`POSE_MS` et `landHold` dans `src/ui/BennyRunActivity.ts`), relevées image par image à 60 images par seconde :
  - frappe : préparation 40 ms (avant : 80 ms, alors que les points et l'arc-en-ciel étaient déjà là), coup jusqu'à 200 ms, comme l'arc (220 ms). Frise : `windup×2 strike×10` ;
  - atterrissage : une demi-foulée (une foulée tous les 1,6 m), 50 ms au moins. Avant : environ 112 ms, soit plus de trois images de course figées à pleine vitesse. Frise : `land×5` à 11 m/s, `land×3` à 24 m/s ;
  - poussée au départ d'un mur : 180 ms, pendant lesquelles Benny bascule peu à peu vers le mur. Frise : `push×10 wall×6`.
- Chute : Benny descend et rapetisse au-dessus du vide ; la Dragon la rattrape (sa peinture la tient déjà, elle n'est plus dessinée deux fois).

### Objectif 2 — Coffres et créatures (lots 114 et 116)
- Atlas `chests` (une case par coffre, les morceaux d'une case gardés ensemble) : intact, projeté (il culbute), brisé.
- Planche `sheet-foes.png` (3 × 3) : dragonnet endormi, réveillé (à 7 m de Benny), étourdi ; braise haute, basse, en fumée ; volant ailes levées, baissées, étourdi.
- Disparition par type (`vanish`, `GHOST_MS`) : le coffre s'ouvre et saute, le dragonnet culbute, la braise part en fumée, le volant tournoie. Le monstre frappé reste devant Benny le temps de disparaître.

### Objectif 3 — Piste peinte (lots 117 et 118)
- Textures (`scripts/prepare-benny-run-decor.mjs`, sources dans `output/imagegen/course-decor-final-v1/`) : planches, herbe, mur de terre et d'herbe, mur de pierre, falaise. Le ciel passe en WebP (69 Ko).
- Rendu : le sol en bandes de profondeur ; les murs en colonnes ; la falaise au bout des trous et des fosses ; une lèvre d'herbe et un flanc de roche là où il n'y a pas de mur (le vide). Le tout est dessiné sur un calque à un pixel par point.
- Coût mesuré dans Chromium sans carte graphique : 14 ms par image d'abord, 10 ms avec le calque. En temps réel : 60 images par seconde, médiane 16,6 ms, sans retour aux couleurs plates. Si un appareil reste trop lent même en image adoucie, la piste revient d'elle-même aux couleurs plates.
- Pas encore essayé sur iPhone.

### Lot 120 — attaque sautée et vraie roulade
- Deux planches peintes (`benny-strike` : élan, bond, coup, retombée ; `benny-roll` : quatre quarts d'une roulade avant, le bâton au-dessus de la tête qui tourne avec elle), à la taille des poses de course (mesurée sur le pompon).
- Frise relevée dans Chromium à 60 images par seconde : coup sauté `hop-1×2 hop-2×3 hop-3×7 hop-4×7` (le coup porte à 90 ms : éclats, points et disparition attendent ce moment) ; roulade `roll-1 … roll-4` deux fois, finie debout ; saut `jump×24 fall×14 land×5`.

### Contrôle final dans Chromium (après le lot 120)
- Coffre : projeté au premier coup, puis brisé (il s'ouvre et saute, les pièces volent, il s'efface). Dragonnet : étourdi puis culbute et s'efface. Braise : part en fumée. Volant : tournoie et s'efface.
- Décor : planches et herbe peintes, mur de terre et d'herbe distinct du mur de pierre, falaise au bout des trous et des fosses, bord du vide lisible à 390 × 844.
- Vitesse en temps réel (6 s, Chromium sans carte graphique), trois mesures : la première, pendant que la machine se chauffait, médiane 17,9 ms, p95 29,1 ms ; les deux suivantes médiane 16,8 puis 16,6 ms, p95 22,0 puis 18,3 ms. Sans décor : médiane 16,7 ms, p95 18,2 ms. Le décor peint ne ralentit donc plus la course.

### Contre-vérification (même jour, version c6a45c3, écran 390 × 844 à densité 2, la taille d'un iPhone)
- Toutes les transitions de Benny refaites au ralenti : frappe sautée `hop-1×2 hop-2×3 hop-3×7 hop-4×6` ; saut et atterrissage à 11 m/s `jump×23 fall×15 land×5` ; à 24 m/s `jump×24 fall×14 land×3` ; départ sur un mur `push×10 wall×6` ; roulade finie debout ; chute au-dessus du vide (elle descend, rapetisse et s'efface, la Dragon la rattrape).
- Vitesse, six mesures de 6 s en alternant décor peint et sans décor : avec le décor, médiane 16,6 ms trois fois, p95 18,5 à 18,6 ms, 2 à 4 images sur 360 au-dessus de 20 ms ; sans décor, médiane 16,6 ms, p95 17,9 à 18,1 ms, 1 à 3 images. Le décor coûte moins d'une milliseconde au p95. La mesure plus lente de la première série n'est pas revenue.

### Validation
- `npx tsc --noEmit` sans erreur ; suite complète verte : 2 246 tests, 1 ignoré (240 fichiers) ; `git diff --check` propre.
