# Illustrations de la nourriture

Peintures du 25 octobre 2026, générées par Codex avec son outil d’images intégré, à partir de trois images du jeu prises comme référence de style seulement : la pièce (`public/assets/currency/coin.png`), la ferme et la Cuisine. Aucune image d’un autre jeu. Choix du propriétaire : le logo est une botte de foin nouée avec un brin de trèfle, sans carotte ; la statue est laissée au choix de l’équipe (variante B retenue, avec lanternes et cœur facetté).

## Chaîne de préparation

Les peintures sources (fond blanc pur, 1024 × 1024) restent hors du dépôt. `node scripts/prepare-food-art.mjs "<dossier des peintures>"` détoure le fond blanc, recadre, écrit les masters pleine résolution puis les versions servies :

| Fichier servi | Master | Taille |
|---|---|---|
| `public/assets/food/logo.png` | `assets-source/food/logo.png` | 128 × 128 |
| `public/assets/food/<culture>.png` (dix) | `assets-source/food/<culture>.png` | 128 × 128 |
| `public/assets/food/pousse.png` | `assets-source/food/pousse.png` | 96 × 96 |
| `public/assets/buildings/statue-affection.png` | `assets-source/buildings/statue-affection.png` | 478 × 512 |

Dans le jeu : le logo accompagne chaque montant de nourriture (`src/display/currency.ts`) et remplace le trèfle du HUD ; chaque culture a son icône dans la ferme (`src/display/food.ts`) ; pendant la culture, 25 pousses sont posées sur les cinq sillons du dessin de la ferme, et l’icône de l’aliment les remplace à maturité (`src/display/farmCrops.ts`, sillons décrits dans `FARM_ART.furrows`). La statue occupe l’empreinte 4 × 4 d’un bâtiment, calée comme la Cuisine (`src/config/statueArt.ts`).

## Prompts exacts

### logo-a.png

Remarques : Botte verticale, ficelle brune, trèfle vert ; aucune carotte. Premier essai régénéré après détection d'un fond blanc cassé.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: A small compact golden hay bundle tied in its middle with natural brown twine, one fresh green three-leaf clover sprig tucked into the binding. Rounded upright bundle, short tidy ends and clearly visible knot. This is the food emblem. No carrot, no orange vegetable, no extra objects.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### foin.png

Remarques : Poignée de foin libre, sans lien ni trèfle.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One compact handful of golden hay, loose gathered curved straw blades with softly fanned ends. Broad simplified honey-gold volumes, no binding and no clover, no container, no extra objects.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### pissenlit.png

Remarques : Feuilles dentelées, une fleur jaune.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One joined small sprig of dandelion: several unmistakably toothed green basal leaves and exactly one cheerful yellow dandelion flower. Bold compact silhouette, no pot, no soil.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### trefle.png

Remarques : Bouquet de trèfles à trois folioles et une fleur rose pâle.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One compact bouquet of fresh green three-leaf clover sprigs, each clover has exactly three rounded leaflets, with one small pale pink-white clover blossom. No pot, no soil.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### persil.png

Remarques : Persil plat à feuilles lobées.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One fresh flat-leaf parsley sprig with a short green stem and a few broad lobed flat parsley leaves, clean compact recognizable silhouette. No curly parsley, no pot, no soil.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### laitue.png

Remarques : Romaine allongée, nervures claires et feuilles vert vif.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One small whole romaine lettuce head, elongated bright green upright leaves overlapping into a compact long oval form, pale central ribs, clearly romaine rather than round iceberg lettuce. No pot, no soil.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### fanes.png

Remarques : Feuillage plumeux seul et tiges vertes coupées ; aucune racine ni zone orange.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One gathered bouquet consisting ONLY of feathery green carrot tops: fine green branching leaves and short GREEN cut stems, arranged in a compact leafy fan. Every visible part is green. Absolutely NO carrot root, NO orange anywhere, NO vegetable bulb, NO binding, NO soil, NO container.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### fenouil.png

Remarques : Un bulbe blanc-vert, tiges et feuillage fin entièrement visibles.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One white and light-green fennel bulb with softly sculpted vertical ribs, a few fine pale green stalks and delicate wispy fennel fronds attached. Entire bulb and fronds visible, compact silhouette. No soil, no pot.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### pomme.png

Remarques : Une pomme rouge entière, une feuille.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One whole plump glossy warm red apple, small brown stem and one fresh green leaf. Simple rounded silhouette and broad soft painted highlights. No slice, no other fruit.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### fraise.png

Remarques : Une fraise entière et sa collerette verte.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One plump ripe red strawberry with a fresh green leafy calyx, tiny golden seeds painted sparingly, broad glossy highlights. No stem sprig, no other fruit.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### banane.png

Remarques : Une seule banane jaune, non épluchée.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One single curved ripe yellow banana, unpeeled, with softly rounded ridges and small warm brown tips. No bunch, no peel hanging down, no other fruit.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### pousse.png

Remarques : Deux feuilles rondes, courte tige et petite motte brune ; asset à réduire pour la répétition dans un champ.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: Prairie Lapins cozy rabbit collection mobile game, single inventory icon, readable at 20 pixels.
Style reference: the user-provided coin.png only: hand-painted object, soft rounded glossy volume, subtle dark brown outline, warm saturated colors, broad simple highlights, clean strong silhouette; no pixel art, no photorealism. Do not reference any other game.
Composition: one subject centered, entirely visible with comfortable white margin, occupying about 75% of the square. Pure solid white #ffffff opaque background, absolutely no cast shadow or ambient shadow on background, no gradient, no setting, no scenery, no text, no lettering, no frame, no watermark. Square 1024 x 1024 pixels.
Subject: One very small green seedling: a short stem with exactly two to three round green leaves emerging from one small compact mound of warm brown earth. Simple bold silhouette suitable for repeating in crop field rows. No pot, no field, no grass patch, no extra seedlings.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```

### statue-b.png

Remarques : Lapin en pierre ivoire tenant un cœur rose, socle rond à deux niveaux, deux lanternes douces et fleurs sur carré d'herbe isométrique.

Prompt exact envoyé à imagegen (`transparent_background: false`) :

```text
Use case: stylized-concept.
Asset: rare precious Statue de l'Affection building for Prairie Lapins cozy rabbit collection mobile game.
Style references: user-provided farm-windmill-nest.png for soft pastel hand-painted isometric 3/4 building illustration, clean subtle warm brown outlines and little grassy foundation; kitchen-chef-lapin.png only for building scale and framing. Not pixelated. Do not reference any other game.
Subject: one unified decorative building asset, a seated rabbit statue carved from pale warm ivory stone, both paws held close around one large glossy pink heart. Both long ears fully visible. The statue sits on a circular stepped pedestal, surrounded by a few flowers on one small square isometric grass tile. Precious, tender, warm and wondrous; charming rounded forms.
Composition: fixed isometric three-quarter view, whole building and whole grass square fully visible, centered with generous white margins, occupies about 80% of canvas. Square 1024 x 1024 pixels. Pure solid opaque white #ffffff background, no shadows cast onto white background, no gradient, no surrounding scenery, no lettering, no text, no plaque writing, no frame, no watermark. Internal shading on statue and grass tile only.
Variant: A slightly taller two-tier round pale stone pedestal with two small rounded cream garden lanterns attached to the grass tile, their windows glowing soft warm peach, and a few pastel pink and white flowers. No wall. Rabbit's softly tilted head and folded close paws embrace a large luminous glossy rose-pink heart. Gentle stone ear and cheek carving. Compact harmonious silhouette.
Technical hard requirements: output exactly 1024 by 1024 pixels. Background must be digitally flat pure RGB (255,255,255) everywhere outside the subject, including every corner. NO paper texture, NO gray or off-white background noise. Subject fits inside central 80% with blank white margin on every side.
```
