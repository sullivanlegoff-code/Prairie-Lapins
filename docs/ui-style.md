# Interface pierre de Prairie Lapins

L'interface reprend la pierre grise peinte des commandes approuvées de la prairie : coins arrondis et ébréchés, lumière en haut, ombre en bas, creux en ardoise et inscriptions crème. Les actions principales ont un intérieur mousse, les secondaires une ardoise neutre, les dépenses de cœurs une ardoise rosée et les actions dangereuses une terre cuite sombre. Les textes longs restent sur un calcaire clair et chaud.

## Éléments conservés

Les règles de `meadow-navigation.css`, les images de `public/assets/ui/navigation/`, la barre d'XP, les ressources et les outils du HUD sont inchangés. Le socle historique de `stone-buttons.css` reste présent parce que les commandes illustrées utilisent son positionnement et son pseudo-élément. Les nouvelles règles excluent explicitement ces commandes. L'exclusion de `#player-progress` utilise `:where()` pour ne pas donner artificiellement une spécificité d'identifiant à chaque bouton de menu.

Aucun changement de HTML, de TypeScript, de texte, d'attribut accessible, de règle de jeu ou d'illustration. Les cibles de la scène Cuisine gardent leurs illustrations et leur géométrie de manipulation ; ses commandes de menu et ses fenêtres reçoivent l'habillage partagé.

## Palette et lisibilité

| Usage | Texte | Fond | Contraste des couleurs de base |
| --- | --- | --- | --- |
| Action principale | `#fff1d4` | `#3c5434` | 7,48:1 |
| Secondaire | `#fff1d4` | `#373b3b` | 10,15:1 |
| Danger | `#fff1df` | `#793f37` | 7,33:1 |
| Dépense de cœurs | `#fff0e6` | `#704052` | 7,41:1 |
| Désactivé | `#43473e` | `#c5c5ba` | 5,46:1 |
| Texte secondaire des cartes | `#51594d` | `#e7e3d4` | 5,66:1 |
| Minuteur | `#65461e` | `#eddfba` | 6,48:1 |
| Détail des parents | `#c9c2b0` | `#2d302b` | 7,54:1 |

Les valeurs sont calculées avec la luminance relative sRGB ; elles ne constituent pas une mesure de chaque pixel des textures. Le grain reste discret et les captures sont inspectées visuellement. Pas de nouvelle police. Les titres crème ont un contour sombre ; le corps du texte n'a pas de contour.

## Construction

- Boutons : pseudo-élément non interactif, découpe neuf zones de la pierre originale à 28 pixels source (le bord de pierre seul, sans le creux d'ardoise), bordure affichée à 10 pixels et débordant de 2 pixels pour que la couleur du bouton ne dépasse jamais du bord. La couleur de l'intérieur va ainsi jusqu'à la pierre, sans anneau sombre. Les arêtes s'étirent sans répéter les fissures. Les boutons gardent au moins 44 × 44 pixels, généralement 48 pixels de haut.
- Panneaux et dialogues : même pierre, même découpe à 28 pixels, bordure de 12 pixels, linteau en ardoise et contenu clair. Un seul défilement du contenu conserve l'en-tête du panneau accessible ; les titres des dialogues restent visibles pendant leur défilement. Boutique opaque en plein écran et ressources regroupées dans des creux d'ardoise.
- Cartes : bord minéral, biseau clair, ombre courte, séparateur fin sous le titre. Badges, minuteurs et états utilisent la même lumière ; les refus gardent une teinte terre cuite et une bordure renforcée.
- Progression : rigole sombre et remplissage vert éclairé en haut. La barre d'XP approuvée n'est pas concernée.
- États : pression par assombrissement et relief rentré sans déplacement de cible ; désactivation sans diminuer l'opacité du texte ; focus brun entouré d'un halo crème. L'onglet sélectionné et l'affichage des probabilités ont un liseré doré.
- Petits écrans : outils de reproduction sous les deux listes en portrait ; réglages du son sur deux lignes ; sélecteurs du laboratoire contraints à la largeur disponible. Les boutons et l'ordre du DOM restent identiques.
- Fiche d'un lapin (vues `rabbit` et `moveRabbit`, hors tutoriel guidé) : panneau centré à l'écran (`#game-panel.rabbit-card`), au plus 520 pixels de large, au-dessus d'un voile sombre (`#panel-backdrop`) qui grise tout le jeu, HUD compris. La croix de fermeture, en haut à droite, prend une pierre rouge (`#a3392e`, texte `#fff4e6`, contraste 6,2:1). Un appui sur le voile ferme aussi la fiche. Le cadrage de la caméra ignore la fiche centrée. Pendant le tutoriel guidé, la fiche reste le panneau latéral pour ne pas masquer les repères de Paille.
- Paille : fond clair, bord minéral et ombre douce, avec la bulle, sa pointe, ses textes et ses illustrations conservés. Les nouvelles transitions suivent `prefers-reduced-motion`.

## Textures et budget

| Texture réutilisée, sans modification | Taille | Usage |
| --- | --- | --- |
| `public/assets/ui/navigation/support-pebble.png` | 46 084 octets | Cadres neuf zones |
| `public/assets/ui/stone-grain.png` | 4 503 octets | Grain des boutons |

Total des textures réutilisées : **50 587 octets**. Nouvelles images servies : **0 octet**, sous le plafond de 250 Ko. Aucune génération imagegen, aucun nouveau master ni prompt de génération. La pierre originale est réemployée directement ; aucun fichier du dossier navigation n'est modifié.

## Vérifications

Commandes : `npx tsc --noEmit`, `npx vitest run --configLoader runner --maxWorkers 1 --testTimeout 30000`, `npm run build -- --configLoader runner`, `git diff --check`.

Le test `tests/ui-dom.test.ts` vérifie la fiche centrée : classe `rabbit-card`, voile visible, fermeture par le voile et par la croix, panneau ordinaire pour les autres vues.

Contrôles dans Chromium à **844 × 390** et **390 × 844** (densité 2) : écran principal, missions, quotidiennes, boutique, collection, carnet, cœurs, aménagement, fiche de lapin, habitat, nid, nurserie, paramètres, choix des parents, toast. Les captures de travail restent hors du dépôt, dans `output/imagegen/ui-v1/`. Ces contrôles ne remplacent pas un essai sur téléphone.
