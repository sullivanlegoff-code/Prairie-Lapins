# Les menus — carnet de prairie

## Direction artistique

Une interface de jeu mobile chaleureuse, construite comme un carnet de terrain : papier de lin, chêne miel sculpté, coutures de ficelle et petites feuilles de sauge. L'illustration reste sur les bords ; le centre clair laisse respirer les textes existants. Aucun visuel d'un autre jeu n'est utilisé.

Les boutons, les couleurs de leurs faces, les croix rouges, le HUD, la navigation et le cadre extérieur de pierre sont conservés. Les nouvelles règles sont dans `src/display/menus.css`, importé après les autres feuilles globales. `GameUI.ts` ajoute uniquement des illustrations décoratives et des classes ; les textes, identifiants, données et commandes restent inchangés.

## Matériaux

Master original créé avec l'outil intégré imagegen : `assets-source/ui/menus/meadow-materials.png` (1254 × 1254, alpha). Le master est une planche de quatre matériaux. Aucun texte n'est incorporé dans les images.

| Texture servie | Dimensions | Octets | Usage |
| --- | --- | ---: | --- |
| `linen.png` | 192 × 192 | 57 466 | Fond de lecture, grain répété avec vignettage doux |
| `oak.png` | 224 × 224 | 112 712 | Cartes d'action, accueil boutique, statistiques |
| `stitched.png` | 224 × 224 | 98 422 | Informations, collection, carnet, paramètres, étiquettes |
| `sage.png` | 224 × 224 | 105 762 | Titres de section, états de travail, choix des parents |
| **Total** | | **374 362** | **Sous la limite de 450 000 octets** |

Versions servies : `public/assets/ui/menus/`. Le script `scripts/prepare-menu-assets.ps1` découpe et réduit le master avec System.Drawing, conserve l'alpha et refuse un total supérieur à 450 000 octets. Il utilise uniquement des chemins relatifs à son emplacement. Sur les postes où l'exécution des scripts PowerShell est autorisée : `powershell -NoProfile -File scripts/prepare-menu-assets.ps1`.

Les plaques utilisent `border-image` avec remplissage central et découpe en neuf tranches. Les coins restent fixes, les bords s'étirent. Les tailles de bordure sont adaptées à l'usage : cadre d'action 22 px, carte cousue 18 px, statistique 10 px, étiquette 8 px. Le grain de fond reste petit et discret. Les coins feuillus ne passent jamais sous le texte.

## Règles d'usage et couverture

- Chêne : cartes permettant une action principale, récompenses de missions, catégories de boutique et médaillons de statistiques. Réutiliser les images de lapin, de monnaie et de statue pour identifier les statistiques.
- Parchemin cousu : cartes de consultation et cartes verrouillées ; les restrictions restent écrites, avec leurs motifs et leurs boutons désactivés. Aucun filtre n'est appliqué aux textes pour représenter le verrouillage.
- Sauge : titres de section épinglés et états de bâtiment. Les titres des cartes restent directement dans leur cadre pour éviter d'empiler deux cadres à chaque ligne.
- Étiquettes cousues : badges, raisons d'indisponibilité, délais. Les erreurs utilisent une encre terre cuite foncée ; les états ne dépendent jamais seulement de la couleur.
- Séparateurs : tige douce dans les en-têtes de carte, ficelle torsadée entre les groupes de recettes, accélérations et actions de placement.
- Progression : auge brun foncé, bord ocre et remplissage vert peint. Onglets : boutons de pierre approuvés, sans deuxième boîte autour.
- Bâtiments et habitats : vignette de leur illustration existante dans l'en-tête. Fiche de lapin : portrait de l'espèce, nom sur papier cousu, statistiques illustrées.
- Missions principales et quotidiennes, boutique (recettes, lapins, habitats, bâtiments, décorations), collection et carnet, cœurs et comptoir de Paille, habitats, dix cultures, nid, nurserie, cuisine, statue, agence et bulles de Coco, fiche et déplacement du lapin, paramètres, confirmations, choix des parents et aménagement partagent ces règles. Les objets manipulables de la cuisine gardent leur illustration et leur géométrie.

## Lisibilité et adaptation

Encre principale `#342f22`, encre secondaire `#534b38`, titres sauge `#252c18`, motifs d'erreur `#6b3020`. Les surfaces de lecture sont claires ; aucun texte nouveau n'est dessiné dans une texture. Les listes de parents conservent une encre crème sur leurs lignes sombres. Les éléments décoratifs sont `aria-hidden`, les images ajoutées ont un texte alternatif vide. Les noms accessibles et les relations ARIA existantes sont conservés.

Mesure WCAG des pixels centraux des textures servies (carré central de 50 %, échantillonnage tous les deux pixels, sans les bordures décoratives) : lin/encre secondaire **5,96:1**, chêne/encre de libellé **6,68:1**, parchemin/encre d'erreur **7,92:1**, sauge/encre de titre **4,88:1** au minimum. Ce contrôle des matériaux ne remplace pas une mesure exhaustive de chaque pixel de chaque état superposé.

Les champs gardent une hauteur minimale de 46 px ; boutons de pierre d'au moins 44 px ; résumés de sections de 44 px minimum. Le focus de la famille pierre est conservé. Aucune animation n'est ajoutée ; `prefers-reduced-motion` force aussi le défilement immédiat dans les menus.

À 844 × 390, les trois statistiques d'habitat tiennent sur une ligne, le nom du lapin et son bouton partagent une ligne et les cartes de boutique sont resserrées. À 390 × 844, les cartes restent sur une colonne, les valeurs sur deux colonnes, les textes se replient et le contenu défile sous l'en-tête fixe. Les fiches de bâtiment, habitat et lapin conservent `#game-panel.center-card`.

## Prompt exact

Outil intégré `image_gen.imagegen`, `transparent_background: true`, nouvelle image sans référence ni image d'un autre jeu :

```text
Use case: stylized-concept. Asset type: production texture atlas for original cozy meadow mobile game UI, hand painted gouache, warm honey wood and flax paper, carefully art directed, restrained painterly brushwork, crisp readable silhouettes, no text or letters or symbols. Square 1536x1536 atlas divided into exactly FOUR equal square quadrants, no gaps. TOP LEFT: full bleed pale warm ivory handmade paper texture, extremely subtle fibers and soft variation, no objects no edges, suitable behind dark text. TOP RIGHT: one square pale honey wooden plaque seen perfectly front-on orthographic, fills quadrant with only 20px transparent margin; thin carved oak rim, tiny natural tool marks, broad nearly blank light parchment center occupying 85%, small sage leaves attached only to top left and bottom right corners; all four edges straight for nine slice stretching. BOTTOM LEFT: one square stitched ivory parchment card seen front-on, fills quadrant with 20px transparent margin, thin ochre edge and sparse linen stitches around edges, broad blank ivory center occupying 88%, no curled corners; straight sides for nine slice. BOTTOM RIGHT: one square muted sage green painted wood plaque, fills quadrant with 20px transparent margin, thin olive carved rim, softly textured pale sage center occupying 85%, tiny brass pins at four corners; straight sides for nine slice. Transparent background outside the three plaques, actual alpha. Consistent light from top left. Original artwork only, no existing game imagery, no typography, no glossy plastic, no heavy grunge, no 3D perspective, no large decoration in centers. The atlas is a set of four separate reusable game UI materials, not a mockup.
```

## Contrôle visuel reproductible

Un seul navigateur à la fois. Démarrer Vite avec `node node_modules/vite/bin/vite.js --configLoader runner --port 5199 --strictPort --host 127.0.0.1`. Définir `PLAYWRIGHT_MODULE` vers le module Playwright disponible sur le poste, puis exécuter séquentiellement :

```text
node output/imagegen/menus-v2/ui-tour.cjs output/imagegen/menus-v2/after 5199
node docs/ui-menus-check.cjs output/imagegen/menus-v2/after 5199
```

Le premier script fourni avec la demande capture l'écran de jeu et les 15 vues principales dans les deux orientations. Le second ajoute les sous-boutiques, les dix cultures (début et fin de liste), Coco (accueil, voyageurs et départ), la statue, la cuisine, le déplacement et le comptoir. Il contrôle aussi le débordement horizontal et les dimensions des contrôles du panneau. Ses fixtures passent par la validation d'import du jeu, dans une partie de développement séparée. Les navigateurs sont fermés dans `finally`. Arrêter Vite avant TypeScript, Vitest et le build.

Les captures restent dans `output/imagegen/menus-v2/after/` (répertoire ignoré par Git). Les tests visuels complètent les tests DOM existants sans les modifier.

## Limites artistiques

Les matériaux sont communs à tous les menus pour conserver une famille cohérente et un poids faible. Une passe ultérieure pourrait créer des bordures propres à chaque métier, des sceaux distincts par rareté et une icône de coffre dédiée au stockage. Les longs textes explicatifs du nid conservent leur longueur et nécessitent le défilement prévu ; aucun texte n'a été raccourci.
