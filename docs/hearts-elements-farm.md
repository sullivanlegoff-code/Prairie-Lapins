# Cœur, éléments et ferme de niveau 1

Peintures du 26 octobre 2026, générées par Codex avec son outil d’images intégré, avec pour seule référence de style la pièce et le logo de nourriture du jeu. Aucune image d’un autre jeu.

- **Cœur** (`public/assets/currency/heart.png`, variante B à liseré doré) : remplace le cœur dessiné du HUD, des bulles de la prairie, de l’emblème Affection, et accompagne chaque montant de cœurs dans les textes (`src/display/currency.ts`).
- **Éléments** (`public/assets/elements/<type>.png`, médaillons ronds épurés : épi de blé, flocon, flamme, écrou, plume) : remplacent les mots des types dans les fiches, la boutique, la collection et le carnet ; le nom reste lu par les lecteurs d’écran et s’affiche au survol (`src/display/rabbitPresentation.ts`).
- **Rareté** : contour du portrait et étiquette colorée (commun bois, rare bleu, épique violet, légendaire or avec léger halo ; mythique prévu) via `data-rarity`.
- **Éléments du lapin** : fond de la fiche et des cartes de la boutique teinté selon ses un ou deux éléments, en dégradé doux (`data-elements`, variables `--element-from` / `--element-to`).
- **Ferme de niveau 1** (`public/assets/buildings/farm-level-1.png`) : même cadrage 1254 × 1254 et mêmes sillons que la ferme de niveau 2 (le moulin), pour que les pousses et cultures mûres tombent au même endroit.
- **Flammes d’Ardent** : un calque des pixels de flamme, dérivé au chargement depuis son sprite, ondule doucement (`src/display/ardentFlames.ts`), figé avec « réduire les animations ».

Préparation : `node scripts/prepare-icons-v3.mjs "<dossier des peintures>"`.

## Prompts exacts (notes de Codex)


Créées avec l’outil intégré **imagegen**, puis exportées localement. Aucune image d’un autre jeu utilisée. Références : `public/assets/currency/coin.png`, `public/assets/food/logo.png` pour le style ; `public/assets/buildings/farm-windmill-nest.png` comme cible d’édition des fermes. Aucun changement des ressources du jeu, aucune commande Git, aucun navigateur, aucun build ni test applicatif.

## Exports et vérification

Les sept icônes finales font **1024 × 1024**, sur fond blanc pur. Après constat d’un léger grain dans les premiers fonds, chacune a été régénérée par imagegen sur fond transparent, puis composée sur blanc au moment de l’export. Les cinq médaillons sont normalisés dans le même carré **800 × 800**, centré en **(512, 512)** ; la silhouette peinte reste très légèrement irrégulière. Les sujets ne sont pas coupés et ne comportent pas de texte. L’aperçu joint montre les cœurs à 20 px et les éléments à 18 px.

Les fermes font **1254 × 1254**. Les éditions imagegen seules redessinaient légèrement le champ. Une régénération a été demandée ; les pixels de la référence ont ensuite été réincorporés localement pour conserver les coordonnées du socle, de la clôture et du champ. Le bâtiment et les arbres viennent des peintures imagegen. Le polygone du champ conserve **75 197 pixels RGBA d’origine** ; une petite zone de **6 547 pixels**, correspondant à l’ancienne pale et à sa marge de raccord, a été reconstruite en prolongeant les sillons voisins. Cette partie auparavant masquée ne peut donc pas être identique à l’image du moulin. Un petit morceau de clôture auparavant couvert par le feuillage a aussi été complété à partir de la peinture générée. Le reste de la clôture et le périmètre du socle sont repris aux coordonnées natives.

Le rectangle intérieur du champ **x = [900,1100[, y = [760,840[** présente **0 différence RGBA sur 16 000 pixels**, pour A et B, avec l’image d’origine. Les superpositions ont été inspectées visuellement ; elles ne présentent pas de double contour sur la partie conservée du champ. Ce contrôle local ne signifie pas que chaque pixel de la ferme entière soit identique à la référence. Les régions restaurées et le raccord sont explicités dans `export.ps1`. La source possède un alpha légèrement inférieur à 255 dans certains aplats ; il est conservé dans les pixels recopiés.

## Fichiers et prompts exacts

### `coeur-a.png`

Cœur framboise simple, reflet principal en haut à gauche. Export 1024 × 1024 sur blanc pur ; silhouette centrée, largeur 760 px, hauteur 633 px.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: stylized-concept. Create coeur-a.png, a 1024 x 1024 square currency icon for Prairie Lapins, a cozy mobile rabbit collection game. Input images coin.png and logo.png are STYLE REFERENCES ONLY, not subjects to reproduce. Paint ONE plump raspberry pink heart, immediately recognizable at 20 pixels. Simple silhouette, softly glossy hand-painted rounded volume, discreet dark warm brown outline, one crisp creamy highlight on the upper left lobe, gentle raspberry shadow along the bottom. No accessories, no text, no symbols, no watermark. Front view, centered, entire heart contained within x=152..872 and y=162..862 on a 1024 square, generous clear margins. Background must be uniformly pure solid white #FFFFFF, no ground shadow, no gradient background. Match the friendly painted currency family of the provided gold paw coin and hay bundle. This is a single final icon, not a contact sheet.
```

Prompt exact de régénération retenue (`transparent_background: true`) :

```text
Use case: background-extraction. Edit the provided raspberry heart currency icon. Keep its lovely hand-painted pink volume, warm brown outline, simple shape and crisp highlight. Remove the entire noisy off-white background and replace it with TRUE TRANSPARENCY (alpha zero outside heart). No glow, shadow, texture or white matte outside the silhouette. Slightly simplify highlights into ONE upper-left highlight. Keep heart centered and fully contained with clear margins. This cutout will be exported onto pure white at 1024 x 1024. No text, no added objects. Preserve the heart identity.
```

Finition mécanique : détourage alpha fourni par imagegen, recadrage sur la boîte alpha > 12, mise à l’échelle et centrage sur un canevas blanc opaque ; aucune peinture du symbole par script.

### `coeur-b.png`

Cœur framboise avec liseré doré, sans gemme ni décoration supplémentaire. Export 1024 × 1024 sur blanc pur ; largeur 760 px, hauteur 648 px.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: stylized-concept. Create coeur-b.png, a square 1024 x 1024 currency icon for Prairie Lapins. Input coin.png and hay logo.png are STYLE REFERENCES ONLY. ONE plump raspberry pink heart with a narrow simple gold edging hugging its perimeter, friendly hand-painted rounded softly glossy volume, discreet dark warm brown outline outside the gold, ONE crisp creamy white highlight on the upper left lobe. Keep the golden rim thin and elegant; no gems, no ornaments, no sparkles, no inner symbols. Immediately recognizable at 20 px. Front view, centered, entire heart fits in a 720 x 700 area centered on the canvas, generous blank margin on all sides. Completely uniform pure solid white #FFFFFF background with NO texture, NO gradient and NO shadow. Simplified painted shapes in the same currency family as the gold paw coin and hay bundle. No text, letters, numbers, watermark. Single final icon.
```

Prompt exact de régénération retenue (`transparent_background: true`) :

```text
Use case: background-extraction. Edit the provided gold-edged raspberry heart currency icon. Keep its plump hand-painted raspberry pink volume and thin gold edge, discreet warm brown outline and ONE crisp upper-left white highlight. Remove all noisy off-white background and replace with TRUE TRANSPARENCY, alpha zero outside the heart, no shadow or glow. No ornaments or text. Centered fully contained with margins. Will be exported onto pure solid white at 1024 x 1024.
```

Finition mécanique : détourage alpha fourni par imagegen, recadrage sur la boîte alpha > 12, mise à l’échelle et centrage sur un canevas blanc opaque ; aucune peinture du symbole par script.

### `element-paille.png`

Épi à trois paires de grains et un grain sommital ; disque crème, contour brun fin, un reflet.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: stylized-concept. Asset: ONE very simple element icon for Prairie Lapins cozy rabbit mobile game, 1024 x 1024 square. Input coin.png and logo.png are STYLE REFERENCES ONLY: friendly hand-painted object, discreet warm dark-brown outlines, soft flat colors, minimal rounded volume, ONE crisp upper-left highlight. Must remain instantly recognizable at 18 pixels: very few broad shapes, NO tiny details, NO texture, NO sparkles, NO decorative objects. Fixed common template for a five-icon family: perfectly round face-on pastel medallion, centered at (512,512), outer diameter exactly 800 pixels, bounds x=112..912 y=112..912. Simple fine warm brown outer rim, no gold rim, no ornate borders, no perspective, no cast shadow. Main symbol centered inside a 500 x 560 pixel box. Background outside the medallion is perfectly uniform pure white #FFFFFF, without paper grain, gradient or shadow. No text, letters, numerals, watermark. Single icon only, no contact sheet. Subject for element-paille.png: ONE upright golden wheat ear, short curved stem and exactly three pairs of plump broad golden grains plus a single top grain, no fine awns, no leaves. Pale warm cream yellow medallion. Very simple and bold.
```

Prompt exact de régénération retenue (`transparent_background: true`) :

```text
Use case: precise-object-edit. Refine this wheat element icon for readability at 18 px. Keep ONE golden wheat ear with just three broad grain pairs and top grain on a PALE CREAM ROUND MEDALLION. Make the medallion a SIMPLE flat pale cream disk with a THIN dark warm brown outline; remove the thick shiny gold coin-like rim entirely. Flatten painted shading, keep ONE single small crisp highlight on the wheat only, remove all other glints. Friendly softly painted Prairie Lapins currency style. Keep the EXACT centered circular medallion silhouette and frame size of the input. Very simple broad shapes, minimal details. Background OUTSIDE MEDALLION must be TRUE TRANSPARENT alpha zero, not white. No shadow, no text, no watermark. Will be exported centered onto a pure white 1024 square.
```

Finition mécanique : détourage alpha fourni par imagegen, recadrage sur la boîte alpha > 12, mise à l’échelle et centrage sur un canevas blanc opaque ; aucune peinture du symbole par script.

### `element-neige.png`

Flocon bleu à six branches épaisses ; disque bleu pâle, contour brun fin, un reflet.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: stylized-concept. Asset: ONE very simple element icon for Prairie Lapins cozy rabbit mobile game, 1024 x 1024 square. Input coin.png and logo.png are STYLE REFERENCES ONLY: friendly hand-painted object, discreet warm dark-brown outlines, soft flat colors, minimal rounded volume, ONE crisp upper-left highlight. Must remain instantly recognizable at 18 pixels: very few broad shapes, NO tiny details, NO texture, NO sparkles, NO decorative objects. Fixed common template for a five-icon family: perfectly round face-on pastel medallion, centered at (512,512), outer diameter exactly 800 pixels, bounds x=112..912 y=112..912. Simple fine warm brown outer rim, no gold rim, no ornate borders, no perspective, no cast shadow. Main symbol centered inside a 500 x 560 pixel box. Background outside the medallion is perfectly uniform pure white #FFFFFF, without paper grain, gradient or shadow. No text, letters, numerals, watermark. Single icon only, no contact sheet. Subject for element-neige.png: a bold icy blue SIX-arm snowflake with one short simple fork at the end of each arm, thick rounded arms, no other branches, no tiny details. Pale ice-blue medallion. Supporting input is element-paille.png as the EXACT MEDALLION TEMPLATE: retain exactly its circular silhouette, size, center, framing and border thickness, change the disk to pale icy blue and REPLACE wheat with snowflake. Reduce internal shading and highlight to soft flat paint and ONE highlight only.
```

Prompt exact de régénération retenue (`transparent_background: true`) :

```text
Use case: precise-object-edit. Create the SNOW sibling of the input Prairie Lapins wheat element medallion. Keep EXACT circular medallion outline, thin warm brown rim, diameter, center and canvas framing. Replace wheat with ONE simple icy blue SIX-ARM SNOWFLAKE, thick rounded arms, just one short fork at each tip, no other details. Pale ice blue disk. Soft flat painted colors, discreet warm brown snowflake outline, ONE crisp highlight on upper-left arm only. Minimal form readable at 18 px. Background outside medallion must be TRUE TRANSPARENT alpha zero, no shadow, no glow. No text or watermark. Will be exported on pure white 1024 square.
```

Finition mécanique : détourage alpha fourni par imagegen, recadrage sur la boîte alpha > 12, mise à l’échelle et centrage sur un canevas blanc opaque ; aucune peinture du symbole par script.

### `element-feu.png`

Flamme orange avec goutte jaune centrale ; disque pêche pâle, contour brun fin, un reflet.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: stylized-concept. Asset: ONE very simple element icon for Prairie Lapins cozy rabbit mobile game, 1024 x 1024 square. Input coin.png and logo.png are STYLE REFERENCES ONLY: friendly hand-painted object, discreet warm dark-brown outlines, soft flat colors, minimal rounded volume, ONE crisp upper-left highlight. Must remain instantly recognizable at 18 pixels: very few broad shapes, NO tiny details, NO texture, NO sparkles, NO decorative objects. Fixed common template for a five-icon family: perfectly round face-on pastel medallion, centered at (512,512), outer diameter exactly 800 pixels, bounds x=112..912 y=112..912. Simple fine warm brown outer rim, no gold rim, no ornate borders, no perspective, no cast shadow. Main symbol centered inside a 500 x 560 pixel box. Background outside the medallion is perfectly uniform pure white #FFFFFF, without paper grain, gradient or shadow. No text, letters, numerals, watermark. Single icon only, no contact sheet. Subject for element-feu.png: ONE simple bold orange flame silhouette with two outer tips, a single smaller golden yellow teardrop inside, no sparks, no wood, no smoke. Pale peach medallion. Supporting input element-paille.png is the EXACT MEDALLION TEMPLATE: retain its circular silhouette, size, center, framing and border thickness, change disk to pale peach and replace wheat with flame. One broad highlight only, simple flat painted colors.
```

Prompt exact de régénération retenue (`transparent_background: true`) :

```text
Use case: precise-object-edit. Create the FIRE sibling of the provided Prairie Lapins wheat element medallion. Keep EXACT circular disk silhouette, thin warm brown outline, diameter, center and canvas framing. Replace wheat with ONE simple bold orange flame with a single golden teardrop inside, just three broad tips total. Pale peach disk. Soft flat painted colors, discreet warm brown flame outline, ONE crisp highlight on upper-left of orange flame only, no other glints. Minimal shape readable at 18 px. Background outside medallion must be TRUE TRANSPARENT alpha zero, no shadow, no glow. No text or watermark. Will be exported on pure white 1024 square.
```

Finition mécanique : détourage alpha fourni par imagegen, recadrage sur la boîte alpha > 12, mise à l’échelle et centrage sur un canevas blanc opaque ; aucune peinture du symbole par script.

### `element-metal.png`

Écrou hexagonal acier avec un grand trou rond ; disque gris clair, contour brun fin, un reflet.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: stylized-concept. Asset: ONE very simple element icon for Prairie Lapins cozy rabbit mobile game, 1024 x 1024 square. Input coin.png and logo.png are STYLE REFERENCES ONLY: friendly hand-painted object, discreet warm dark-brown outlines, soft flat colors, minimal rounded volume, ONE crisp upper-left highlight. Must remain instantly recognizable at 18 pixels: very few broad shapes, NO tiny details, NO texture, NO sparkles, NO decorative objects. Fixed common template for a five-icon family: perfectly round face-on pastel medallion, centered at (512,512), outer diameter exactly 800 pixels, bounds x=112..912 y=112..912. Simple fine warm brown outer rim, no gold rim, no ornate borders, no perspective, no cast shadow. Main symbol centered inside a 500 x 560 pixel box. Background outside the medallion is perfectly uniform pure white #FFFFFF, without paper grain, gradient or shadow. No text, letters, numerals, watermark. Single icon only, no contact sheet. Subject for element-metal.png: ONE small front-facing steel gray hexagonal NUT with a single large circular hole, thick six-sided silhouette and one simple lighter bevel, NO screw threads, NO bolts, NO tiny grooves. Pale cool silver-gray medallion. Supporting input element-paille.png is the EXACT MEDALLION TEMPLATE: retain its circular silhouette, size, center, framing and border thickness, change disk to pale cool gray and replace wheat with the steel nut. One broad highlight only, soft flat paint.
```

Prompt exact de régénération retenue (`transparent_background: true`) :

```text
Use case: precise-object-edit. Create the METAL sibling of the provided Prairie Lapins wheat element medallion. Keep EXACT circular disk silhouette, thin warm brown outline, diameter, center and canvas framing. Replace wheat with ONE front-facing small steel gray HEXAGONAL NUT with a large ROUND central hole. Six straight outside edges, one simple pale bevel, flat gray blue main color, no threads or grooves or bolts. Pale silver gray disk. Soft flat painted colors, discreet warm brown nut outline, ONE small crisp highlight upper left only. Minimal form readable at 18 px. Background outside medallion must be TRUE TRANSPARENT alpha zero, no shadow or glow. No text or watermark. Will be exported on pure white 1024 square.
```

Finition mécanique : détourage alpha fourni par imagegen, recadrage sur la boîte alpha > 12, mise à l’échelle et centrage sur un canevas blanc opaque ; aucune peinture du symbole par script.

### `element-vol.png`

Plume blanche et bleu ciel, deux grandes encoches par côté ; disque bleu pâle, contour brun fin, un reflet.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: stylized-concept. Asset: ONE very simple element icon for Prairie Lapins cozy rabbit mobile game, 1024 x 1024 square. Input coin.png and logo.png are STYLE REFERENCES ONLY: friendly hand-painted object, discreet warm dark-brown outlines, soft flat colors, minimal rounded volume, ONE crisp upper-left highlight. Must remain instantly recognizable at 18 pixels: very few broad shapes, NO tiny details, NO texture, NO sparkles, NO decorative objects. Fixed common template for a five-icon family: perfectly round face-on pastel medallion, centered at (512,512), outer diameter exactly 800 pixels, bounds x=112..912 y=112..912. Simple fine warm brown outer rim, no gold rim, no ornate borders, no perspective, no cast shadow. Main symbol centered inside a 500 x 560 pixel box. Background outside the medallion is perfectly uniform pure white #FFFFFF, without paper grain, gradient or shadow. No text, letters, numerals, watermark. Single icon only, no contact sheet. Subject for element-vol.png: ONE bold white and sky blue FEATHER, diagonally upright from lower left to upper right, simple tapered rounded feather silhouette, short quill and a single central shaft, exactly TWO broad notches on each side, NO fine barbs, NO tiny lines, no extra feathers. Pale powder-blue medallion. Supporting input element-paille.png is the EXACT MEDALLION TEMPLATE: retain its circular silhouette, size, center, framing and border thickness, change disk to pale powder blue and replace wheat with feather. One broad highlight only, soft flat paint, thin warm brown feather outline.
```

Prompt exact de régénération retenue (`transparent_background: true`) :

```text
Use case: precise-object-edit. Create the FLIGHT sibling of the provided Prairie Lapins wheat element medallion. Keep EXACT circular disk silhouette, thin warm brown outline, diameter, center and canvas framing. Replace wheat with ONE WHITE AND SKY BLUE FEATHER diagonal lower left to upper right, tapered rounded silhouette, short quill and ONE central shaft, exactly two broad notches per side, NO tiny barbs or fine lines. Pale powder blue disk. Soft flat painted colors, discreet warm brown feather outline, ONE small crisp highlight upper left only. Minimal form readable at 18 px. Background outside medallion must be TRUE TRANSPARENT alpha zero, no shadow or glow. No text or watermark. Will be exported on pure white 1024 square.
```

Finition mécanique : détourage alpha fourni par imagegen, recadrage sur la boîte alpha > 12, mise à l’échelle et centrage sur un canevas blanc opaque ; aucune peinture du symbole par script.

### `ferme-niveau-1-a.png`

Cabane à colombages et chaume, porte arrondie, trois arbres ; sans moulin, drapeau ni cheminée. Le modèle a conservé davantage d’enduit que demandé : variante A plus proche d’une petite chaumière. Recomposition du socle et du champ depuis l’original, détaillée ci-dessous.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: precise-object-edit. Edit the attached Prairie Lapins farm image, keeping its EXACT 1254 x 1254 composition and isometric projection. Deliver variant ferme-niveau-1-a.png. Replace ONLY the big windmill building on the left with a much smaller simple cozy timber garden cabin with a modest golden thatched roof, plain wooden door, tiny round window. Remove every windmill blade, rabbit face hub, flag and flagpole. Keep only TWO trees behind the cabin instead of the large forest; leave clean white background where the removed treetops were. Preserve the ORIGINAL grass island footprint, rocks, flowers, stepping stones, gate and white fence EXACTLY at the same coordinates. CRITICAL LOCKED REGION: the entire bare brown plowed field on the right, its FIVE diagonal furrows, all edges and white fence must remain pixel-aligned with the input at identical size and location, no new objects or plants in the field. Do not redraw, shift, rescale or rotate the island or field. Small simple starter farm for level 1, same soft hand-painted pastel brown-outline style as input. Solid pure white #FFFFFF outside the island, no shadow outside island, no text, numbers, watermark. Full island contained without cropping. Preserve existing source pixels everywhere except the old building and the trees being removed.
```

Prompt exact de correction (`transparent_background: false`) :

```text
Use case: precise-object-edit. Correct the first image (the newly painted starter cabin) using the second image (the ORIGINAL farm) as the strict coordinate reference. Output a new corrected ferme-niveau-1-a.png. Keep the first image's small arched-door cottage with golden thatched roof, but make the walls primarily simple warm timber, REMOVE chimney, and leave only two trees. REPLACE the first image's entire grass island, field, fence and gate with the unchanged corresponding pixels from the ORIGINAL image 2: same five furrows, exact coordinates, exact perimeter, exact rocks flowers stepping stones and fence posts. Do not alter the field in any way. The smaller cabin sits in the original windmill footprint on the left, with no windmill blades, no flag or pole and no rabbit face. Exact original 1254 x 1254 frame. Pure solid #FFFFFF white background, no texture, no text, no watermark. STRICT: original field and fence must match in a 50 percent opacity overlay; restrict edits to building and trees only.
```

Entrées de la correction, dans l’ordre : première peinture de A, puis ferme originale. Finition par conservation des régions d’origine décrite plus haut.

### `ferme-niveau-1-b.png`

Petit abri en bois au toit de chaume et porte rectangulaire, trois arbres ; sans moulin, drapeau ni cheminée. Variante la plus sobre et la plus proche de la cabane en bois demandée. Même conservation des coordonnées du champ que A.

Prompt initial exact (`transparent_background: false`) :

```text
Use case: precise-object-edit. Produce ferme-niveau-1-b.png by editing IMAGE 1, the ORIGINAL farm windmill, at exactly 1254 x 1254. IMAGE 2 is only a cabin concept reference; do NOT copy its field or grass because these drifted. Change the original large windmill to a VERY SMALL simple wooden tool shed, low asymmetrical thatched roof, natural timber plank walls, rectangular wooden door, tiny round window. No chimney, no flag, no windmill, no rabbit head. Keep two small trees. Use original pastel hand-painted style and brown outlines. ALL original pixels of the grass island, flowers, rocks, stepping stones, white fence, gate and especially the right-hand five-furrow soil field are LOCKED: copy them unchanged from IMAGE 1 at exact native coordinates, no rescaling, no shifting, no redesign. Only building and excess trees may change. The building must stay entirely left of the field. Preserve the exact grass island perimeter. Background outside island pure solid WHITE #FFFFFF, no texture, no gradient. No text or watermark. Deliver ONE complete square scene with margins, identical camera framing to IMAGE 1.
```

Entrées, dans l’ordre : ferme originale, puis première peinture de A comme concept de cabane. Finition par conservation des régions d’origine décrite plus haut.

### `ferme-niveau-1.png`

Copie binaire de `ferme-niveau-1-a.png`, fournie aussi sous le nom générique mentionné dans la demande. Aucun appel imagegen distinct ; mêmes prompts exacts que A ci-dessus. B reste disponible comme variante plus sobre.

### `ferme-superposition.png`

Planche **2508 × 1254** : à gauche, référence + A ; à droite, référence + B. Chaque panneau fait 1254 × 1254, avec **50 % référence + 50 % variante**, composées sur blanc. Aucun prompt : mélange arithmétique de chaque canal RGB, sans déplacement ni redimensionnement. Les différences du bâtiment et des arbres sont volontairement visibles.

### `ferme-superposition-a.png`

Panneau A seul, **1254 × 1254**, mêmes proportions 50/50, sans texte ajouté. Aucun appel imagegen distinct.

### `ferme-superposition-b.png`

Panneau B seul, **1254 × 1254**, mêmes proportions 50/50, sans texte ajouté. Aucun appel imagegen distinct.

### `apercu-petites-tailles.png`

Planche **560 × 180** sur blanc. Ordre : cœur A, cœur B, paille, neige, feu, métal, vol. Ligne haute : réduction à 64 px. Ligne basse : cœurs à 20 px, éléments à 18 px. Aucun prompt : réductions des fichiers finaux, sans texte ajouté.

### `sources.json`

Correspondance entre les neuf peintures imagegen retenues et leurs fichiers automatiques d’origine. Aucun prompt propre ; les prompts exacts sont reproduits pour chaque image ci-dessus. Ces chemins permettent de réexécuter l’export dans cette session tant que les fichiers automatiques sont disponibles.

### `export.ps1`

Script auxiliaire d’export et de superposition, limité à ce dossier pour ses sorties. Utilise System.Drawing : dimensions, composition sur blanc, copie des pixels de référence, complément de la zone auparavant couverte par la pale, superpositions et aperçu. Aucun prompt imagegen propre. Aucun code de jeu modifié.

### `bilan-verification.txt`

Relevé des dimensions, de la blancheur des quatre bords et de la comparaison RGBA du rectangle intérieur du champ. Aucun prompt : contrôles des images exportées uniquement, sans build ni test applicatif.

### `NOTES.md`

Ce document : prompts exacts, remarques et limites de la vérification. Aucun prompt imagegen propre.

