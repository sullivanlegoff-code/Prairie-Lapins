# Île volante E3 — neuf états peints

Choix du propriétaire : bord E3 « Falaise vivante » (24 octobre 2026, calcaire gris clair, lierre et racines sur la falaise), **herbe B « Pré fleuri de ferme » (25 octobre 2026)**, qui remplace H2 « émeraude intense ». Agrandissement dans un **ordre fixe** identique pour tous les joueurs, chaque état étant une illustration peinte complète.

## Ordre et règle de jeu

`ISLAND_ORDER` (`src/config/islandStages.ts`) : sud-ouest → sud → ouest → centre → sud-est → est → nord-ouest → nord → nord-est. Pour une île démarrée au sud-ouest, `purchasableParcels` (`src/config/land.ts`) ne propose que la première parcelle non possédée de cet ordre ; elle touche toujours une parcelle possédée, même sur une île agrandie autrement avant cette règle. Les îles historiques démarrées au centre gardent l'ancienne règle.

## Rendu

- Herbe : une tuile répétée (`grass-tile.webp`, 352 unités monde), une `TileSprite` par parcelle ancrée sur l'origine du monde, dans le conteneur `ground`.
- Peinture de l'état : `IslandStageLayer` (`src/display/islandStageLayer.ts`), profondeur 0,05, entre l'herbe (0) et les bâtiments (0,1). Seul l'état courant est chargé : préchargé au démarrage, puis l'état suivant est chargé à l'achat ; l'ancienne image reste affichée jusqu'au remplacement, et ses textures sont libérées.
- Une île dont les parcelles ne forment pas un état de l'ordre (partie ancienne) garde le relief généré (`FloatingIslandLayer`, voir `island-underside.md`).

## Pipeline

1. Contrat géométrique : canevas de chaque état = pelouse jouable projetée (θ = 0, q = 0,78) + 96 unités à gauche, à droite et en haut + 580 unités en bas, à 1,5 pixel par unité.
2. Maîtres peints (imagegen, Codex) : `assets-source/island/stages/stage-1.png` … `stage-9.png` et `grass-tile.png`. Prompts, méthode et retouches : notes de production (hors dépôt) `output/imagegen/island-stages-v1/NOTES.md`.
3. `PLAYWRIGHT_MODULE=<playwright> node scripts/derive-island-stages.mjs` : adaptation déterministe de la pelouse, fondu d'alpha de 8 à 40 unités vers l'intérieur, découpe en tuiles de 500 px (les tuiles vides sont écartées), encodage WebP avec perte par Chromium (qualité 0,86), manifeste `src/config/islandStageArt.json` avec les empreintes SHA-1 des sources et des fichiers. Dans PowerShell, définir d'abord `$env:PLAYWRIGHT_MODULE`.
4. `node scripts/derive-island-stages.mjs --check` : sources, disposition et intégrité de chaque fichier publié, sans navigateur. `tests/island-stages-art.test.js` vérifie séparément les SHA-1 des maîtres et dérivés et la liste des fichiers.

## Adaptation à l'herbe B (25 octobre 2026)

Le PNG de `output/imagegen/grass-v2/B/tile.png` est copié sans retouche dans `grass-tile.png` : 1024 × 1024 pixels, toujours 352 unités monde. Trèfles et rares petites fleurs sont conservés. Sa répétition reste perceptible sur une grande île vide ; aucun détail fleuri supplémentaire n'est ajouté.

Les neuf maîtres `stage-N.png` restent inchangés. Toute la retouche est reproductible dans `derive-island-stages.mjs`, avant l'encodage :

- Distance au bord de l'union des parcelles, y compris les angles rentrants. Les pixels extérieurs ne sont jamais retouchés.
- Protection du calcaire (y compris les petits cailloux détachés) et des plantes olive reliées au rebord : masque chromatique RGB, propagation par voisinage, arrêt à 48 unités. Le contour de protection décroît sur six pixels pour éviter un liseré découpé. Le masque ne dépend d'aucun tirage aléatoire.
- La pelouse restante est rapprochée de B avec une luminance Rec.709 et une palette centrée sur RGB (151,177,91), dont le contraste des anciennes lames est comprimé. Fondu de 8 à 40 unités, au lieu de 48 à 160 : seule une bande étroite subsiste au pied du rebord.
- Lierre, falaise et dessous extérieurs gardent leurs pixels ; aucune régénération des illustrations. L'encodage WebP avec perte peut néanmoins modifier légèrement les pixels décodés près d'une zone retouchée.
- Pour les îles hors ordre, seules les couleurs de la lèvre générée de `floatingIslandArt.ts` sont accordées à B. Géométrie, pierres et placements conservés.

Captures Chromium/SwiftShader : outil hors suivi `output/imagegen/grass-v2/tools/integration-shot.cjs`, sorties `%TEMP%/prairie-herbe-B/cycle-1` à `cycle-4` (final). Neuf états, nid et enclos à ×1,65, deux bords par état et portrait 390 × 844. Deux corrections visuelles : protection des éléments du rebord, puis suppression du liseré vert créé par cette protection. Le premier cadrage du bord inférieur était incorrect ; il est corrigé à partir du cycle 2. Le cycle 3 ajoute l'île historique hors ordre, mais certaines vues sont prises trop tôt ou déplacées par un recentrage automatique : le cycle 4 attend l'étape effectivement affichée et maintient la caméra pendant la capture. Les planches `review-*.png` rassemblent les captures complètes pour inspection. Pas de contrôle sur téléphone physique.

Poids publiés avant intégration : **10 527 908 octets** (10,53 Mo), dont 356 072 pour l'herbe. Après : **4 537 904 octets** (4,54 Mo, −56,9 %), dont **62 714 octets** pour l'herbe. Par état : 215 680 / 369 454 / 416 250 / 412 824 / 612 422 / 593 856 / 622 334 / 618 442 / 613 928 octets. Les tuiles devenues transparentes sont supprimées automatiquement : 205 tuiles d'étapes, plus l'herbe, contre 229 fichiers auparavant. Mémoire GPU maximale des étapes : 27 465 600 octets, plus 4 194 304 pour l'herbe (auparavant environ 36,6 Mo pour les étapes).
