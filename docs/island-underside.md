# Dessous peint de l’île — étape C, corrections C2

> **Statut (24 octobre 2026) :** ce relief généré ne sert plus qu’aux îles dont les parcelles ne forment pas un des neuf états peints (parties agrandies dans un autre ordre avant la règle de l’ordre fixe) ; voir [island-stages.md](island-stages.md). Le script `docs/island-underside-check.cjs` cité plus bas a été retiré avec l’ancienne herbe procédurale (`parcelArt.ts`).

Kit peint pour le jeu mobile : grès miel, ombres terre cuite, lumière en haut à gauche. Vue trois-quarts droite : θ = 0, q = 0,78. Cette reprise ne modifie ni gameplay, prix, géométrie logique, sauvegardes, ni interface DOM/CSS. Aucune nouvelle génération imagegen pendant C2.

## Sources et sélection

Les trois prompts exacts de la session du 24 octobre 2026 ont été récupérés dans son journal local ; ils sont reproduits intégralement plus bas.

- Rejeté : `output/imagegen/island-underside-v1/rejected-background-v1.png`. Première demande avec transparence ; fond et composition impropres au découpage de production.
- Retenu : `assets-source/island/underside/kit-v2.png`. Fond magenta, six pièces séparées. SHA-1 : `c023d410093741dc5618e7ef10a826143f32c9ac`.
- Retenu : `assets-source/island/underside/foundation-v3.png`. Fondation large continue pour éviter une rangée de stalactites et assurer le recouvrement des blocs. SHA-1 : `5cde054efe4b411762d3dffa7544fd436e0b83ee`.

Les originaux retenus sont aussi conservés sous `output/imagegen/island-underside-v1/`, hors suivi Git. Aucun dérivé rejeté dans le répertoire de production.

## Dérivation et détourage

`node scripts/derive-island-art.mjs` utilise uniquement les modules intégrés de Node. Les empreintes des deux sources sont vérifiées. `--check` recalcule les sept PNG et compare leurs octets sans écrire. Les rectangles de découpage sont dans `CROPS`.

Extraction de la clé #FF00FF, estimation de couverture alpha par projection sur une couleur voisine propre, puis décontamination. C2 propage les couleurs opaques propres par parcours déterministe des voisins ; les franges reçoivent ces couleurs en conservant leur couverture alpha. Les pixels entièrement transparents sont remis à zéro. Un parcours depuis les bords distingue le ciel extérieur des trous alpha enfermés ; seuls les trous enfermés sont comblés. La silhouette et les racines ne sont pas érodées.

La tache claire du dessous venait surtout d’une inclusion lavande presque blanche **opaque dans la source du bloc profond**, pas d’une fuite du ciel : échantillons RVB autour de (254,248,253), alpha 255. Le premier cycle de décontamination la laissait visible. Le deuxième remplace aussi cette inclusion par les couleurs rocheuses voisines. Ce seuil de quasi-blanc s’applique seulement à `chunk-deep`, pour conserver notamment les fleurs blanches des îlots. Les fissures sombres restent présentes.

La bande `cliff` devient périodique par fondu de 64 pixels. La fondation est réduite exactement de moitié avec moyenne prémultipliée par l’alpha. Les autres pièces ne sont pas redimensionnées. Chaque composante reçoit une fondation continue, trois blocs superposés par face avant et deux îlots. Le clipping pair/impair évite de remplir une concavité ou le trou central ; le col rocheux suit les arrondis avec UV continus et segments superposés.

| PNG dans public/assets/island | Dimensions | Octets RGBA GPU |
| --- | --- | ---: |
| cliff.png | 400 × 82 | 131200 |
| foundation.png | 752 × 304 | 914432 |
| chunk-wide.png | 420 × 384 | 645120 |
| chunk-round.png | 410 × 350 | 574000 |
| chunk-deep.png | 300 × 460 | 552000 |
| islet-wide.png | 400 × 360 | 576000 |
| islet-small.png | 360 × 310 | 446400 |

Budget kit mesuré : **1 241 737 octets PNG** (1,184 Mio), **3 839 152 octets GPU** (3,661 Mio). Pas de mipmaps, aucune dimension au-delà de 2048 px. Le cache adaptatif vise 890 000 pixels au total ; le test parcourt les 512 ensembles de parcelles et compte les dimensions arrondies, y compris le pic ancien + nouveau + kit partagé, sous **12 Mio**. Ce budget concerne le dessous. L’herbe garde son budget séparé de **50 184 864 octets** (47,860 Mio).

## Jointures et netteté du dessus

Cause confirmée : les parcelles peignaient jusqu’au bord exact sur un canvas à résolution 1,8 ; le bord droit et le bord bas tombent entre texels. Le filtre linéaire mélangeait les pixels partiellement transparents avec la marge vide, produisant une ligne claire selon la phase caméra. Mesures sur les neuf textures de référence : alpha **51 au bord droit**, **154 au bord bas**.

Correction : débord opaque de **deux unités monde**, avec les mêmes marques en coordonnées monde, dans les marges de cinq unités déjà allouées. Le masque global conserve les contours arrondis et les trous. Les deux bords mesurés ont maintenant un alpha **255**. La signature du cache inclut le débord.

Aucune baisse de résolution ni nouveau filtre du dessus : neuf textures de **1286 × 1084**, résolution **1,8**, filtre linéaire ; à ×1,65 et DPR 1, **1,0909 texel/pixel écran en X** et **1,3986 en Y**. `islandRaster` ne contient que les rochers ; le dessus reste indépendant et son masque est géométrique. L’empreinte des commandes d’herbe B2 reste inchangée.

La comparaison des pixels intérieurs entre B2 reconstruit et C2 donne au plus deux niveaux RVB d’écart sur moins de 1200 canaux par texture (~0,02 %), dus à la rasterisation des polygones découpés sur le rectangle légèrement étendu. Aucun flou ajouté. Les captures B2 initiales étaient en 844 × 390, contre 1100 × 850 pour C : les vues finales `B2-matched-*` reprennent le format B2 pour comparer le rendu éloigné.

## Tests et captures

- `tests/island-art.test.js` : registre, présence et dimensions des sept PNG, budget réel du kit, pollution magenta, reproduction exacte des dérivés, réparation d’un trou et d’une inclusion pâle, maintien de l’alpha extérieur.
- `tests/floating-island.test.ts` : déterminisme ; budget de remplacement sur les 512 configurations ; composantes détachées chacune avec fondation, col, cache et îlots ; réutilisation ; échec atomique et nouvelle tentative ; destruction complète et idempotente des images, textures et écouteurs.
- `tests/parcel-render-baseline.test.ts` : empreintes B2 du dessus et disposition de l’île inchangées.
- `docs/island-underside-check.cjs` : Chromium réel ; assertions sur pixels, alpha et résolution ; quatre intersections internes aux deux zooms et trois phases sous-pixel ; esquisse « Terrain réservé » présente sans nouvelle texture de dessous, sans acquisition et sans nouvelle génération du cache. Captures des composantes détachées et du trou central.

Contrôle visuel : serveur Vite sur 5174, puis `node docs/island-underside-check.cjs final`. Playwright doit être disponible ; `PLAYWRIGHT_MODULE` peut indiquer son chemin local. L’exposition de la scène est injectée uniquement dans le navigateur de contrôle.

Captures hors dépôt : **%TEMP%/prairie-underside-C2/**. Deux cycles complets `cycle1-*` et `cycle2-*` ont été ouverts avec l’outil de lecture d’images : départ, deux parcelles, L, 3×3, jointure ×1 et ×1,65, détachée, trou, dessous et col ×1,65, coin arrondi ×1,65, portrait 390×844 et planche du kit. Le cycle 1 a révélé l’inclusion pâle restante ; le cycle 2 la corrige. Les rapports JSON enregistrent les tailles et la réutilisation des caches. La série `final-*` ajoute les autres intersections, l’esquisse réservée et les vues au format B2.

Audit : aucun ancien dessin vectoriel de roche actif ou mort dans les modules d’île. Le générateur inutilisé `edgeEllipse` a été supprimé de `terrainEdges.ts`. Les commandes vectorielles restantes dessinent la lèvre d’herbe et l’ombre atmosphérique, effectivement utilisées. Les anciens modules coast/islandArt étaient déjà supprimés dans l’état reçu ; aucune réintroduction.

Pic GPU mesuré sur les 512 configurations : cache maximal **3 570 860 octets**, ancien + nouveau + kit **10 980 872 octets**, soit **10,472 Mio**. Le test utilise aussi une borne prudente de 4 000 000 octets pour le kit.

Limites : Chromium avec SwiftShader, DPR 1, sans appareil mobile physique. La résolution du cache des rochers baisse avec la taille de l’île pour respecter le budget. La bordure d’herbe existante reste présente ; aucune végétation décorative de bord ajoutée dans C2.

## Validation finale C2

- `npm run typecheck` : réussi.
- `npm test -- --configLoader runner --maxWorkers 2` : **120 fichiers / 1930 tests réussis**, dernier passage en 102,16 s. Un passage intermédiaire en concurrence avec les captures SwiftShader a rencontré six timeouts de cinq secondes ; la relance seule a réussi, sans modification des délais ou des tests concernés.
- `git diff --check` : réussi.
- `node scripts/derive-island-art.mjs --check` : sept dérivés conformes.
- `npm run build -- --outDir output/island-underside-build` : échec du chargement esbuild de la configuration, lecture du dossier parent interdite par le sandbox. Relance avec `--configLoader runner` : réussie. Avertissement Vite sur le chunk JavaScript de plus de 500 ko ; aucune erreur de compilation.
- Les **sept PNG** sont présents dans `output/island-underside-build/assets/island/` et identiques aux dérivés de production. La sortie reste ignorée par Git.
- Contrôle navigateur final : **24 mesures** (quatre intersections × deux zooms × trois phases), réussi ; écart maximal de la somme RVB moyenne au raccord par rapport aux voisins : **4,641**, seuil 5. Aucun événement `pageerror`. Esquisse réservée : même ensemble acquis, même génération et mêmes clés de cache avant/après.
- **24 PNG finaux ouverts et examinés**, en plus des deux cycles de 13 PNG chacun. Rapports : `final-report.json`, `final-grass-report.json`, `final-seams-report.json`, `final-reserved-report.json` ; journal de tests : `tests-final.log`, tous dans le dossier temporaire C2.
- `debug.log` supprimé ; aucun fichier parasite à la racine. Aucun commit, push ou ajout à l’index.

Fichiers modifiés par cette reprise : `src/display/MeadowScene.ts`, `parcelArt.ts`, `terrainEdges.ts`, `scripts/derive-island-art.mjs`, les sept PNG de `public/assets/island/`, `tests/floating-island.test.ts`. Fichiers ajoutés : `tests/island-art.test.js`, ce document et `docs/island-underside-check.cjs`. Les autres changements présents à l’arrivée ont été conservés ; notamment `tests/decorations.test.ts` n’a pas été retouché dans C2.

## Prompts imagegen exacts de la session d’origine

### V1 - transparent_background: true

```text
Use case: stylized-concept. Production game art sprite atlas, transparent background. Paint a modular floating island underside kit, beautifully polished cozy mobile game illustration. Warm honey sandstone, terracotta shaded rock, softly rounded geological strata, dimensional painterly bevels, upper-left golden lighting, cool muted plum recesses. NOT low-poly, NOT vector. Atlas layout: 3 columns by 2 rows with very generous transparent gutters, each separate object fully inside its cell. Top left: wide shallow horizontal cliff shoulder, flat continuous brown upper edge, darker soil overhang, subtle winding strata, no grass; top middle: large hanging rock mass, broad flat cut top, organic inverted pear silhouette, rounded hanging stone lobes, tiny root tendrils, very sparse pale turquoise crystals; top right: different medium hanging mass, broad flat cut top, two rounded tapered lobes, warm detailed rock, a little moss in cracks. Bottom left: narrow deep hanging rock pendant with several rounded lobes, broad cut top, roots and a small inset lavender crystal; bottom middle: small floating grassy rock islet, soft green cushion atop warm layered rounded tapered rock; bottom right: different tiny grassy satellite islet with two round stone lobes. All rock tops are meant to overlap and disappear behind other rock pieces. Consistent scale and materials across kit. Surfaces detailed with painterly warm/cool modelling and restrained fine grain. Clean antialiased alpha silhouettes, NO cast shadows outside objects, NO background, NO ground, NO text, NO grid lines, NO frame, NO buildings, NO recognizable protected game elements. Landscape 1536x1024 atlas if possible.
```

### V2 - transparent_background: false

```text
Production sprite sheet, stylized-concept, 1536x1024 landscape. SIX SEPARATE floating-island rock pieces in strict 3 columns x 2 rows, each object fully within its own 512x512 cell and at least 35px empty space between objects. Background MUST be perfectly uniform solid pure bright magenta #FF00FF, every background pixel exactly magenta, no gradient, no glow, no shadows on background. Illustrated cozy mobile game painted style, smooth softly outlined forms, beautiful rounded sandstone boulders with warm ochre and caramel strata, matte surfaces with delicate brushwork. LIGHT COMES FROM UPPER LEFT: upper-left surfaces light cream ochre, right surfaces muted terracotta brown shade, no strong bloom. Clear readable gentle material modelling rather than photoreal craggy rocks. Top-left cell: wide horizontal SHALLOW cliff band, almost rectangular, 430 wide 150 high, flat horizontal top and bottom, seamless brown strata with some tiny embedded stones, dark narrow soil undercut at upper edge, NO grass. Top-middle: broad hanging rock chunk, 400 wide 390 high, flat wide cut top, inverted pear organic taper, softly rounded stone lobes, a few thin hanging roots, one small pale mint crystal in a crevice. Top-right: different hanging rock chunk, 380 wide 320 high, broad flat cut top, rounded tapering lobes, small moss flecks in crevices. Bottom-left: deep narrow pendant rock, 250 wide 390 high, flat cut top, several rounded tapering stone lobes, small lavender crystal inset, very fine roots. Bottom-middle: small isolated floating rock island, 300 wide 270 high, softly domed green grass cushion on top, chunky warm rounded stone below, a few tiny flowers. Bottom-right: different small floating grassy rock island, 260 wide 230 high, two round hanging lobes. All six assets must have identical paint style, materials and upper-left lighting. NO typography, NO labels, NO grid, NO buildings, NO characters, NO cast shadows, NO atmosphere, NO copyrighted game references. Pure flat magenta around every piece, no spill or colored ambient light.
```

### V3 - transparent_background: false

```text
Use case stylized-concept. ONE isolated production sprite of the broad underside foundation of a floating island. Background perfectly uniform solid pure magenta #FF00FF, no shadow or gradient or glow. Wide landscape 1536x1024 image. Object occupies x=100..1436 and y=220..820 approximately. A very broad shallow inverted mountain of warmly painted sandstone, width about 1300, height about 550. Flat straight horizontal broad cut top, sides curve inward down to a rounded central hanging stone lobe, overall organic inverted hill silhouette with an asymmetrical rounded tip. Upper edge full width, lower tip roughly centered. Many INTERLOCKING warm caramel and ochre boulders with subtly winding strata, small embedded pebble seams, matte painterly surfaces and soft illustrated edges, NO sharp triangular teeth, NOT faceted low poly. Cosy polished mobile game illustration, smooth soft brushwork, sunlit cream highlights on UPPER LEFT surfaces, muted terracotta and plum brown shadow on RIGHT and beneath ledges. A few tiny moss flecks in deep cracks, two subtle small pale mint crystals embedded in rock, sparse thin roots dangling near the sides. No green grass cap, no vegetation on top, no scene, no landscape background, no labels, no frame, no cast ground shadows, no text, no recognizable copyrighted game assets. Entire silhouette must fit well inside image with a clean solid magenta margin around it. Large continuous rocky mass, NOT a row of separate stalactites.
```
