# Agence de voyage — 26 octobre 2026

## Améliorations en cœurs (v19)

| Niveau de l’agence | Amélioration | Capacité | Nourriture au retour |
|---|---:|---:|---:|
| 1, à l’achat | — | 1 voyage | aucune |
| 2 | 40 cœurs | 2 voyages | 25 par heure de voyage |
| 3 | 120 cœurs | 3 voyages | 25 par heure de voyage |

`upgradeAgency {id, fromLevel}` paie uniquement en cœurs, sans complément ni accélération ni niveau joueur supplémentaire. `agencyLevel?: 2 | 3` absent signifie niveau 1. Une requête répétée portant l’ancien niveau est refusée. L’amélioration reste possible avec des voyageurs absents.

Chaque départ fige sa nourriture dans `Trip.grass?` : 75 à 250 nourriture aux niveaux 2 et 3, aucune pour un départ au niveau 1, même si l’agence est améliorée ensuite. `travel.trips: Trip[]` garde un voyage par individu ; `claimTrip {rabbitId}` accueille uniquement ce voyageur et crédite une seule fois cœurs et nourriture. Un retour prêt occupe sa place jusqu’à l’accueil.

L’interface liste tous les voyages et retours, chacun avec destination, minuteur ou bulle « Ces vacances … étaient super ! » et bouton Accueillir. Elle propose ensuite un voyageur disponible s’il reste une place, puis l’amélioration en cœurs avec confirmation. Coco reste présent après son guide initial. La bulle cœur dans la prairie signifie qu’au moins un retour est prêt.

La sauvegarde v19 valide la capacité de l’agence, les voyageurs distincts, présents et absents du nid, ainsi que les récompenses figées. Tous les voyages suivent le recalage de l’horloge et le rafraîchissement des minuteurs. La migration depuis v18 conserve le voyage historique dans un tableau, sans lui attribuer de nourriture rétroactive.

## Règles

L’agence de voyage s’achète parmi les bâtiments dès le niveau 8 pour 1 000 pattes, un exemplaire maximum. Coco, hôte non collectionnable en chemise hawaïenne et lunettes de soleil, accueille le joueur en quatre bulles la première fois. Cet accueil terminé est sauvegardé ; Coco reste ensuite présent sans répéter le guide.

Un, deux ou trois lapins voyagent à la fois selon le niveau de l’agence. Un parent au nid ne peut pas partir. La destination surprise et la durée entière de 3 à 10 h sont tirées ensemble parmi les 72 couples possibles : Londres, Vannes, Le Caire, Hammamet, Le Lavandou, Bandol, Lille, Paris, Marrakech. Le départ est gratuit. Le voyageur garde sa place et ses revenus dans son habitat ; il disparaît visuellement de celui-ci et ne peut être nourri, reproduire, déménager, être confié ou cuisiner jusqu’à son accueil au retour.

Le voyage rapporte 1 cœur pour 3–4 h, 2 pour 5–7 h, 3 pour 8–10 h. La destination et le minuteur sont affichés pendant le voyage. À la fin, une bulle cœur apparaît sur l’agence ; le voyageur déclare « Ces vacances à … étaient super ! » (ou « au Caire / au Lavandou »). Le bouton « Accueillir · + N cœurs » crédite le souvenir une seule fois et libère le voyageur. Le retour attend sans péremption ; aucune accélération n’est proposée. L’état est conservé dans la sauvegarde v19 et ses dates suivent le recalage de l’horloge.


Les 72 couples destination/durée sont équiprobables. La sauvegarde v19 conserve `travel: {welcomed, trips}` ; le voyage contient l’identité du lapin, la destination, les dates et les cœurs. Validation : agence et lapin présents, aucun parent simultanément au nid, destination connue, durée entière entre 3 et 10 h, souvenir conforme et départ non futur. Les dates du voyage sont recalées avec les autres travaux si l’horloge recule fortement.

## Textes et accueil

Au premier accueil, Coco présente ces quatre bulles, une à la fois, avec « Suivant » puis « C’est parti ! ». La dernière action sauvegarde l’accueil terminé. Les ouvertures et chargements suivants gardent Coco présent sans recommencer le guide.

1. « Salut ! Moi, c’est Coco. Je tiens l’agence de voyage de l’île. Bienvenue ! »
2. « Ici, tes lapins partent en vacances. Choisis un voyageur : je lui trouve une destination surprise, pour un voyage de 3 à 10 heures. »
3. « Pendant son voyage, il garde sa place et ses revenus à la maison, mais il ne peut ni manger, ni aller au nid, ni déménager. »
4. « À son retour, il te rapporte des cœurs en souvenir : plus le voyage est long, plus il en rapporte. Bon voyage ! »

Ensuite : « Où partons-nous aujourd’hui ? Choisis un voyageur : la destination reste une surprise ! » et bouton « Partir en voyage » pour chaque lapin disponible.

Départ : « {lapin} part en vacances {à/au destination} ! ».
Voyage en cours : « {lapin} profite de ses vacances {à/au destination}. Il reviendra avec un souvenir ! ».
Retour de Coco : « {lapin} est rentré {de/du/d’ destination} ! Viens l’accueillir. ».
Bulle du voyageur : « Ces vacances {à/au destination} étaient super ! Je t’ai rapporté {N cœur/cœurs} en souvenir. ».
Bouton : « Accueillir · + {N cœur/cœurs} ».
Refus : « Ce lapin est en voyage. Accueille-le à l’agence à son retour. ».

Les textes tutoient le joueur. Prépositions : « au Caire », « au Lavandou », « du Caire », « du Lavandou », « d’Hammamet » ; « à » et « de » pour les autres villes.

## Préparation de l’art

Variantes retenues : **agence-b.png** (toit turquoise, petite montgolfière et auvent pêche) et **hote-b.png** (Coco debout, chemise hawaïenne corail à fleurs, collier de fleurs et lunettes de soleil). Coco est un hôte non collectionnable. Les originaux peints sur fond blanc restent hors des fichiers versionnés.

Depuis la racine du dépôt :

```sh
node scripts/prepare-agency-art.mjs "<dossier>"
```

Le dossier contient les deux PNG retenus. Le script réutilise `prepareArt` de `scripts/prepare-food-art.mjs` : lecture PNG, suppression du fond blanc relié aux bords, recadrage, écriture des masters détourés, centrage sur un carré transparent et réduction, puis recadrage final des copies servies. Il prépare uniquement l’agence et Coco :

| Source | Master | Copie servie | Taille de réduction |
|---|---|---|---:|
| agence-b.png | assets-source/buildings/travel-agency.png | public/assets/buildings/travel-agency.png | 512 px |
| hote-b.png | assets-source/agency/coco.png | public/assets/agency/coco.png | 320 px |

Les proportions sont préservées ; le recadrage final peut produire des dimensions rectangulaires. `src/config/agencyArt.ts` règle l’intégration à la scène ; `src/display/agency.ts` fournit le portrait et la vignette de l’interface. Aucun chemin personnel n’est nécessaire à cette chaîne.

## Prompts exacts

Transcription depuis `output/imagegen/agency-v1/NOTES.md`, sans modification.

### agence-b.png

```text
Use case: stylized-concept. Create one original Prairie Lapins mobile game illustration. Use ONLY the four user supplied Prairie Lapins images as style references: farm-windmill-nest and kitchen-chef-lapin for isometric building silhouette, warm pastel palette and clean brown outline; statue-affection for softly painted polish; paille-v1 for cute rabbit proportions. Do not use imagery from any other game. Deliver a square 1024 x 1024 opaque image. Background must be perfectly solid pure white #ffffff everywhere outside the single subject. No ground shadow or drop shadow on the white background, no gradient, no scenery outside the subject, no border, no text, no letters, no numerals, no logos, no watermarks. Center the entire subject with an obvious clean white margin on all four sides; nothing cropped. Soft warm hand-painted illustration with clean smooth warm brown contours, gentle dimensional shading within the subject, cozy appealing proportions, no pixel art.
Subject: ONE cheerful original travel agency for rabbits, an alternative compact rounded seaside kiosk with pale buttercream walls, an aqua teal rounded roof, a peach and cream striped scalloped awning above a small arched entrance, and a small decorative pastel miniature hot-air balloon fixed to the roof by a short stand, clearly part of the building. A blank wooden rabbit-ear-shaped sign has only a simple suitcase pictogram, absolutely no lettering. Two small stacked lilac and tangerine suitcases with blank colored tags beside the door, a short postcard rack displaying only colored picture rectangles, one little potted palm. All props belong to ONE coherent building asset. View: elevated isometric three-quarter view, front and right side visible, same scale and cozy proportions as the farm and kitchen references. The kiosk sits on one small square grass tile in perspective, a broad rhombus spanning nearly the full image width, around 90 percent, with a neat thin earthy edge and a few tiny flowers ON the tile only. Keep every corner of the lawn and the entire balloon visible with at least 45 pixels white margin. No additional trees, no extra landscape, no characters.
Outside the asset use flat digital RGB(255,255,255) fill, no paper texture or noise. Exact 1024 x 1024.
```

### hote-b.png

```text
Use case: stylized-concept. Create one original Prairie Lapins mobile game illustration. Use ONLY the four user supplied Prairie Lapins images as style references: farm-windmill-nest and kitchen-chef-lapin for isometric building silhouette, warm pastel palette and clean brown outline; statue-affection for softly painted polish; paille-v1 for cute rabbit proportions. Do not use imagery from any other game. Deliver a square 1024 x 1024 opaque image. Background must be perfectly solid pure white #ffffff everywhere outside the single subject. No ground shadow or drop shadow on the white background, no gradient, no scenery outside the subject, no border, no text, no letters, no numerals, no logos, no watermarks. Center the entire subject with an obvious clean white margin on all four sides; nothing cropped. Soft warm hand-painted illustration with clean smooth warm brown contours, gentle dimensional shading within the subject, cozy appealing proportions, no pixel art.
Subject: ONE full-body rabbit travel agency host, not a collectible rabbit, cheerful and relaxed, standing upright in a gentle three-quarter welcoming pose. Match paille-v1's cute large rounded head, short plump body, short limbs, soft pale biscuit cream fur, long pink-lined ears with one ear gently tilted, tiny muzzle and paws. Wear dark softly rounded sunglasses and a loose coral Hawaiian short sleeve shirt with large cream and turquoise tropical flowers and muted mint leaves, all painted with no writing. A short colorful flower lei sits naturally around the collar. Friendly small smiling mouth. One forepaw extended in a soft open welcome, the other relaxed at the side. Bare rounded rabbit hind paws and a small fluffy tail fully visible. No pants, no shoes, no additional props, no base, no grass, no setting. Warm softly painted fur and clean brown outline consistent with the supplied rabbit. Whole rabbit including BOTH ear tips, paws and tail centered with generous 80 pixel pure white margin, occupying around 80 percent of image height.
Use completely flat digital pure white background, not paper. Exactly 1024x1024 pixels. Generous margin around both ears and all paws.
```
