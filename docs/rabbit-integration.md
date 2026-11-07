# Intégrer un nouveau lapin Rare standard

Procédure courte pour un Rare approuvé : reproduction uniquement, deux éléments requis, affection 2 chez chacun des parents, niveau 1, sans prix, cadeau, garantie ni pourcentage fixe. Aucun scénario par espèce, aucune branche par ID dans le moteur, aucun code d'interface.

## Fichiers à renseigner (trois)

1. **PNG** : conserver le design approuvé dans `assets-source/rabbits/<id>/sprite.png`, renseigner `scripts/rabbit-art-manifest.json` et dériver le PNG public avec `node scripts/derive-rabbit-art.mjs`. Voir [le calcul des dimensions utiles et les patches](image-resolution.md). Ne pas modifier le dossier source sous `docs/art-references/`.
2. **Définition canonique** : une ligne à la fin de `REGISTRY` dans `src/config/species.ts`, sur le modèle des Rares existants (`id`, `name`, `description`, `types` ordonnés, `acquisition` recette `requiredTypes` + `minAffection: 2`, `art` `static-sprite`, `progression: {unlockLevel: 1}`). Mesurer `width`/`height` du PNG, choisir `worldWidth`, et régler `groundY` pour que le contact au sol (`groundY - (height - dernière ligne opaque) × worldWidth / width`) reste entre 11 et 12. `preloadOrder` est le suivant de la liste.
3. **Fiche d'attentes indépendante** : une entrée dans `NEW_RARES` de `tests/rabbit-art-fixtures.ts`, écrite à la main depuis le design approuvé et non recopiée du registre : nom, description, types, `requiredTypes`, `art` (via `sprite(...)`, dimensions du dérivé), `source` (chemin sous `Design des lapins/Rare/`), `foot` (dernière ligne opaque du maître PNG) et `exactUnion` (deux espèces dont l'union fournit exactement ses éléments, avec le tirage exact attendu à affection 2/2, dans l'ordre du catalogue).

Tout le reste se déduit de cette fiche : listes et compteurs du catalogue, raretés, niveaux, art et ordre de préchargement, acquisition, parcours paramétré (`tests/rare-journeys.test.ts` : sauvegarde, transfert, croissance, accueil, confidentialité), oracle des distributions, PNG identique, libellés du laboratoire et sélecteur « Lapins de test ».

## Quand une fiche existante doit aussi changer

- Si les éléments du nouveau Rare rejoignent l'union exacte d'un autre Rare, mettre à jour l'`exactUnion` de ce dernier : le pool exact change réellement.
- Idem pour les trois scénarios existants de `tests/laboratory.test.ts` (Pic Pic, Améthyste, Ardent/SNK) dont les poids exacts sont écrits dans le test.
- Un Rare hors du standard (prix, cadeau, garantie, parents précis, affection différente) demande une décision du propriétaire : ne pas l'ajouter à `NEW_RARES` sans étendre `STANDARD_RARE` ou la fiche.

## Commandes (depuis `prairie-lapins-prototype`)

```powershell
npm run typecheck
npm test                 # suite complète ; ciblé : npx vitest run tests/rare-journeys.test.ts tests/species-registry.test.ts
git diff --check
npm run build:netlify    # un seul build, avec verify-production
```

Construire une fois à la fin ; le dossier `netlify-site/` est ignoré par Git. Ne pas publier. La révision du build porte le suffixe `-modifie` tant que des modifications non commitées existent.

## Contrôle Chromium ciblé (build compilé, sans scénario dédié)

1. Servir `netlify-site/` (preview existant sur `http://localhost:5174/dev/?dev=1`).
2. Paramètres → section **« Lapins de test »** : choisir l'espèce, un habitat compatible avec place, **« Ajouter à la partie de test »**. Le lapin est un adulte à l'affection initiale ; ajouter les éléments nécessaires avec les mêmes boutons, nourrir si l'affection 2 est requise.
3. Vérifier : sélecteur contenant l'espèce, rendu dans le monde sans découpe et à bonne échelle, portrait de collection (dimensions, description après découverte), paire préparée au Nid avec les probabilités attendues, aucune erreur de page.
4. Un essai iPhone n'est pas systématique : seulement sur demande du propriétaire.

## Dessin livré avec un fond opaque

Quand un design arrive en RGB (fond blanc, damier imprimé ou fond uni), l'ajouter à `DESIGNS` dans `scripts/prepare-rabbit-masters.mjs` avec son mode de fond (`light`, `checker` ou `corner`), puis lancer `node scripts/prepare-rabbit-masters.mjs "<dossier Design des lapins>" <id>`. Le script détoure le fond relié au bord, recadre au dessin avec une marge de 8 px et écrit `assets-source/rabbits/<id>/sprite.png`. Pour une nouvelle entrée de `scripts/rabbit-art-manifest.json`, il suffit d'indiquer `file` et `worldWidth` : `node scripts/derive-rabbit-art.mjs` enregistre alors le maître, ses dimensions utiles et le registre ; `--check` reste strict. Regarder le maître sur un fond coloré avant de l'intégrer.

## Clignements et truffes dans la prairie

Depuis le 7 novembre 2026, chaque dessin cligne des yeux et bouge la truffe : tous les premiers dessins et les 48 évolutions. Exceptions : le premier dessin d'Ardent (cinq images peintes de flammes et de pose, voir plus bas), les lunettes de soleil (Bouée sur ses deux dessins, Dadi et Fantôme évolués : une truffe, pas de paupières) et Benny (son propre clignement peint, `bennyView`). Une espèce entre dans le manifeste dès que son dossier contient un `blink.json` ; une évolution, dès que ce fichier a une section `evolution` (masters `evolution-eyes-closed.png` et `evolution-nose-twitch.png`, placés sur `<id>-evolution-sprite.png`). Les espèces procédurales conservent leur animation existante.

Méthode du 7 novembre (outils ignorés par Git dans `output/imagegen/visages-v1/`) : Codex repeint le master avec les yeux fermés ; la différence avec le master isole les paupières, recalées en teinte sur la fourrure voisine et adoucies au bord. Quand la peinture laisse une tache claire autour de l'œil, la zone reçoit la couleur de la fourrure voisine et seul le trait sombre de la paupière est gardé. La truffe n'est pas peinte : le master est déformé autour d'elle (remontée et léger pincement), sans couture. Chaque master est un recadrage du dessin, même alpha, bord de 4 px inchangé. Les huit paupières à tache claire (Boudinet, Dinono, Egiiipte, Maxou, Requin, Roukette, Tunini, Dragon) et les truffes peu visibles (Wat-wat, Feu, Phoenix, Améthyste) ont été refaites ainsi.

Pour les 13 jeux ajoutés le 25 octobre 2026 (Ardent, Boudinet, Dinono, Egiiipte, Piment, Tunini, Bretonette, Dadi, Maxou, Magicien, Dragon, Requin, Orange), les yeux visibles ont été repérés sur le master en pleine résolution. Les retouches sont limitées aux yeux (fourrure interpolée depuis le bord, paupières en arc et cils) et à la truffe (déformation locale, remontée de 1–2 pixels du master et léger pincement). Les pixels hors retouche restent identiques au master. Cas particulier : Ardent est entièrement composé de flammes, sans yeux ni truffe discernables ; ses deux patches compriment doucement les flammes du visage et du museau, sans ajouter d'anatomie, avec les mêmes rythmes que les autres lapins.

Les planches de contrôle locales sont dans `output/imagegen/blink-v2/` (ignoré par Git) : pour chacun des 13 lapins, sprite servi, yeux fermés et truffe froncée côte à côte, agrandis à 3× depuis les fichiers servis. `NOTES.md` décrit la méthode, les repères et les particularités par lapin. Aucun navigateur n'est nécessaire pour ce contrôle.

Les masters approuvés et leurs décalages sont sous `assets-source/rabbits/<id>/` (`blink.json`). `node scripts/derive-rabbit-blinks.mjs` réduit les patches sur la grille du sprite servi dans `public/assets/rabbits/` et produit `src/config/rabbitBlinkArt.json` ; `--check` contrôle les dimensions, limites, empreintes des originaux/masters et les octets dérivés sans écrire. Ne pas retoucher les sprites d’origine. L’adaptateur typé `rabbitBlinkArt.ts` valide le manifeste contre les espèces et leurs dimensions.

Dans Phaser, les deux images, invisibles par défaut, appartiennent au même `body` que le sprite. Leur origine haut-gauche est placée à `(-largeur/2 + x, -hauteur + y) × échelle`, avec `groundY` ajouté en ordonnée. Elles partagent ainsi son miroir, ses compressions, sa hauteur et sa rotation, y compris pendant un salto.

Le rythme pur `rabbitBlink.ts` dépend de l’identifiant et du temps de scène, sans timer/tween ni état aléatoire par image : fermeture de 110–160 ms, intervalles de 2,5–5,8 s, environ 20 % de doubles séparés de 80–110 ms. La truffe produit 2 ou 3 battements de 80–110 ms séparés de 80–110 ms, toutes les 2 à 4 s (souhait du propriétaire, 7 novembre 2026), uniquement au repos. Les deux rythmes sont indépendants et désynchronisés entre lapins. Le clignement reste actif avec « réduire les animations » ; le nourrissage et les mouvements conservent leur animation existante.

## Les flammes d'Ardent

Le premier dessin d'Ardent ne cligne pas des yeux : cinq images peintes font bouger ses flammes et changent un peu sa pose (souhait du propriétaire, 7 novembre 2026). `node scripts/prepare-ardent-frames.mjs <planche.png>` découpe une planche de cinq images sur fond magenta, les met à l'échelle du sprite servi et les aligne sur ses pattes, sur une toile commune qui garde le bas-centre du sprite : masters dans `assets-source/rabbits/ardent/frames/`, images servies `public/assets/rabbits/ardent/ardent-frame-<n>.png`. Dans la prairie, `ardentFrame` (`src/display/ardentFlames.ts`) les fait défiler en aller-retour, environ sept par seconde, avec une phase propre à chaque Ardent ; la première image reste fixe avec « réduire les animations ». Son évolution (Brasier) cligne comme les autres lapins.

## Dessins évolués (affection 30)

Depuis le 3 novembre 2026, les 35 espèces listées dans `src/config/evolvedArt.ts` ont un dessin évolué à partir de l'affection 30 ; Benny n'évolue pas. Le dessin paraît 15 % plus grand : `EVOLVED_SCALE = 1.15`, appliqué dans le code à sa largeur monde, jamais dans l'image. Pour ajouter une évolution :

1. copier la peinture approuvée (fond blanc ; sur un fond noir uni, comme Dinono et Dinenette, mode `corner` avec une `tolerance` réduite à 24 pour garder les ombres sombres) dans `assets-source/rabbits/<id>/<id>-evolution-source.png` et ajouter l'espèce à la liste des évolutions de `scripts/prepare-rabbit-masters.mjs`, puis `node scripts/prepare-rabbit-masters.mjs . <id>-evolution` (écrit `<id>-evolution-sprite.png`) ;
2. ajouter une ligne à `EVOLVED_ART` (largeur et hauteur à 0, largeur monde qui garde la surface du v1) et une entrée `<id>-evolution` à `scripts/rabbit-art-manifest.json` (`species`, `master`, `registry`, `displayScale`, `file`, `worldWidth`), puis `node scripts/derive-rabbit-art.mjs <id>-evolution` ;
3. lire les ancrages de la toque et de la couronne sur le v2 (`EVOLVED_CUISINE_ANCHORS`, `src/config/cuisineAnchors.ts`).

Chaque évolution a ses propres paupières et sa propre truffe (7 novembre 2026), choisies d'après le dessin affiché ; pendant les poses peintes de Dadi évolué, elles sont cachées. La Forêt de Brocéliande (10 000 pièces, niveau 20) permet ensuite de remettre l'ancien dessin, lapin par lapin (`classicLook` dans la sauvegarde v23).
