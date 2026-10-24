# Île volante E3 — neuf états peints

Choix du propriétaire (24 octobre 2026) : bord E3 « Falaise vivante » (calcaire gris clair, lierre et racines sur la falaise), herbe H2 « émeraude intense », agrandissement dans un **ordre fixe** identique pour tous les joueurs, chaque état étant une illustration peinte complète.

## Ordre et règle de jeu

`ISLAND_ORDER` (`src/config/islandStages.ts`) : sud-ouest → sud → ouest → centre → sud-est → est → nord-ouest → nord → nord-est. Pour une île démarrée au sud-ouest, `purchasableParcels` (`src/config/land.ts`) ne propose que la première parcelle non possédée de cet ordre ; elle touche toujours une parcelle possédée, même sur une île agrandie autrement avant cette règle. Les îles historiques démarrées au centre gardent l'ancienne règle.

## Rendu

- Herbe : une tuile répétée (`grass-tile.webp`, 352 unités monde), une `TileSprite` par parcelle ancrée sur l'origine du monde, dans le conteneur `ground`.
- Peinture de l'état : `IslandStageLayer` (`src/display/islandStageLayer.ts`), profondeur 0,05, entre l'herbe (0) et les bâtiments (0,1). Seul l'état courant est chargé : préchargé au démarrage, puis l'état suivant est chargé à l'achat ; l'ancienne image reste affichée jusqu'au remplacement, et ses textures sont libérées.
- Une île dont les parcelles ne forment pas un état de l'ordre (partie ancienne) garde le relief généré (`FloatingIslandLayer`, voir `island-underside.md`).

## Pipeline

1. Contrat géométrique : canevas de chaque état = pelouse jouable projetée (θ = 0, q = 0,78) + 96 unités à gauche, à droite et en haut + 580 unités en bas, à 1,5 pixel par unité.
2. Maîtres peints (imagegen, Codex) : `assets-source/island/stages/stage-1.png` … `stage-9.png` et `grass-tile.png`. Prompts, méthode et retouches : notes de production (hors dépôt) `output/imagegen/island-stages-v1/NOTES.md`.
3. `PLAYWRIGHT_MODULE=<playwright> node scripts/derive-island-stages.mjs` : fondu d'alpha de la pelouse peinte de 48 à 160 unités vers l'intérieur, découpe en tuiles de 500 px (les tuiles vides sont écartées), encodage WebP avec perte par Chromium (qualité 0,86), manifeste `src/config/islandStageArt.json` avec les empreintes SHA-1 des sources et des fichiers.
4. `node scripts/derive-island-stages.mjs --check` (aussi lancé par `tests/island-stages-art.test.js`) : sources, disposition et intégrité de chaque fichier publié, sans navigateur.

Poids publiés : 10,5 Mo au total, de 0,43 Mo (état 1) à 1,5 Mo (état 7) par état téléchargé. Mémoire GPU de l'état le plus lourd : 36,6 Mo, plus 4 Mo pour la tuile d'herbe (l'ancienne herbe procédurale prenait 47,9 Mo pour l'île complète).
