# Résolution des images et chargement différé (T1)

Les maîtres restent dans `assets-source/rabbits/<id>/sprite.png` (19 sprites ; 18 espèces ont aussi deux patches approuvés et un `blink.json`). Les PNG publiés sont des dérivés, jamais des maîtres. Aucun dessin, prix, temps ou règle de simulation ne change.

`node scripts/derive-rabbit-art.mjs` vérifie les SHA-1 des maîtres, réduit les sprites et met à jour leurs dimensions dans `src/config/species.ts`. Le manifeste `scripts/rabbit-art-manifest.json` conserve dimensions originales, largeur monde, dimensions utiles et SHA-1 source/dérivé. `node scripts/derive-rabbit-blinks.mjs` réduit ensuite les patches approuvés et écrit `src/config/rabbitBlinkArt.json`. Exécuter ces commandes dans cet ordre ; chacune accepte `--check` en lecture seule. Les contrôles des JSON sont structurels ou normalisent CRLF : ils ne dépendent pas des fins de ligne du checkout.

Le filtre déterministe de `scripts/resize-rgba.mjs` utilise une moyenne d'aire en couleur prémultipliée par l'alpha (Node seul). Un patch est échantillonné avec son décalage sur la grille du sprite entier, avec arrondi extérieur de ses limites. Il ne subit donc pas un redimensionnement indépendant qui déplacerait ses paupières. Les SHA-256 historiques des illustrations approuvées sont toujours vérifiés sur les maîtres par les tests.

## Calcul des lapins

La largeur requise en prairie est `worldWidth × 1,3 × 1,06 × 1,65 × 3` : échelle du conteneur, étirement maximal de l'animation, zoom maximal et DPR 3. Une rotation ne modifie pas la densité de texels nécessaire. Le plus grand portrait CSS est 150 × 140, avec 4 px de padding de chaque côté et `object-fit: contain` ; sa largeur utile en pixels est `min(142 × 3, 132 × 3 × largeurOriginale / hauteurOriginale)`. Les portraits ordinaires font 64 × 64, ceux du croisement au maximum 52 × 52 et ceux de cuisine 32 × 32 : ils sont couverts par ce maximum.

La largeur publiée est `min(largeurOriginale, ceil(max(prairie, DOM) × 1,08))`. La hauteur suit le rapport original, arrondi au pixel. `worldWidth` et `groundY` restent identiques ; l'erreur de hauteur due à cet arrondi est inférieure à un pixel écran même au zoom maximal. Aucun agrandissement. Les patches partagent les facteurs X/Y du sprite arrondi.

| Espèce | Largeur monde | Prairie DPR 3 | DOM DPR 3 | Maître | Publié |
|---|---:|---:|---:|---|---|
| paille | 40 | 272,8 | 280,0 | 350 × 495 | 303 × 429 |
| neige | 48 | 327,4 | 426,0 | 518 × 473 | 461 × 421 |
| feu | 50 | 341,1 | 426,0 | 1004 × 827 | 461 × 380 |
| belier-gris | 48 | 327,4 | 426,0 | 527 × 488 | 461 × 427 |
| volant | 50 | 341,1 | 333,7 | 814 × 966 | 369 × 438 |
| frisket | 52 | 354,7 | 379,0 | 1227 × 1282 | 410 × 428 |
| icy | 48 | 327,4 | 371,5 | 1215 × 1295 | 402 × 428 |
| ardent | 52 | 354,7 | 426,0 | 1312 × 1199 | 461 × 421 |
| snk | 56 | 382,0 | 426,0 | 1402 × 1122 | 461 × 369 |
| pic-pic | 54 | 368,3 | 396,0 | 1254 × 1254 | 428 × 428 |
| amethyste | 56 | 382,0 | 426,0 | 1334 × 1179 | 461 × 407 |
| princesse-neige | 50 | 341,1 | 381,1 | 1230 × 1278 | 412 × 428 |
| fluffy | 52 | 354,7 | 424,8 | 1299 × 1211 | 459 × 428 |
| virvoletant | 52 | 354,7 | 396,0 | 1254 × 1254 | 428 × 428 |
| phoenix | 54 | 368,3 | 396,0 | 1254 × 1254 | 428 × 428 |
| roukette | 52 | 354,7 | 426,0 | 1312 × 1199 | 461 × 421 |
| wat-wat | 52 | 354,7 | 396,0 | 1254 × 1254 | 428 × 428 |
| glassofeu | 52 | 354,7 | 426,0 | 1312 × 1199 | 461 × 421 |
| plume | 52 | 354,7 | 426,0 | 1312 × 1199 | 461 × 421 |

## Calcul des habitats

Les 18 habitats ont déjà des maîtres 1254 × 1254 dans `assets-source/habitats/` et des dérivés recadrés à moitié avec `scripts/derive-habitat-art.mjs`. Au zoom maximal, la largeur monde est `crop.width × largeurMondeDuCanvas / 1254` ; les canvas font respectivement 190, 280 et 352 unités aux niveaux 1, 2 et 3. La demande DPR 3 est donc cette largeur × 1,65 × 3 (puis × 1,08 de marge). Dans la boutique, `max-height: 150px` borne l'image à 450 pixels physiques de haut : sa largeur dessinée est au plus `450 × crop.width / crop.height`. On retient le maximum de ces deux demandes.

| Type | Publié N1 | Publié N2 | Publié N3 |
|---|---|---|---|
| paille | 605 × 436 | 627 × 471 | 627 × 477 |
| neige | 613 × 393 | 623 × 524 | 627 × 487 |
| feu | 623 × 396 | 622 × 497 | 624 × 463 |
| metal | 623 × 438 | 627 × 454 | 627 × 451 |
| vol | 615 × 438 | 627 × 460 | 627 × 426 |
| universal | 618 × 416 | 627 × 489 | 627 × 497 |

Pour chacun des 18 fichiers, la demande prairie seule (environ 908–941 px au N1, 1375–1386 au N2, 1734–1742 au N3, avant marge) dépasse déjà la largeur publiée. La règle « ne jamais agrandir » impose donc de conserver les PNG actuels. Leurs métadonnées, ancrages et dimensions monde restent inchangés. Réduire davantage dégraderait la netteté. Le contrôle existant vérifie les SHA-1 des maîtres et les pixels exacts des dérivés.

## Chargement

`MeadowScene.preload()` ne demande que les sprites et patches des espèces présentes dans la sauvegarde et les habitats effectivement illustrés. Les autres assets fixes conservent leur circuit existant. Une naissance, un achat, un import ou une amélioration peut demander un nouveau lot. `ensureArt()` conserve la scène complète précédente tant que le lot n'est pas disponible ; il relit ensuite l'état courant, ce qui couvre aussi un second changement pendant le téléchargement. Les demandes sont dédupliquées par clé de texture. Une erreur conserve le rendu précédent et autorise une nouvelle tentative à la notification suivante, sans boucle immédiate.

Le placement demande l'illustration du fantôme sélectionné ; aucune image Phaser n'est créée avant sa disponibilité. Les portraits DOM utilisent leurs requêtes `<img>` ordinaires à l'ouverture du panneau (collection, boutique, croisement), sans charger leurs patches dans Phaser. Les textures déjà chargées restent en cache pendant la session ; il n'y a pas d'éviction ni de promesse de mémoire constante pour une partie ayant parcouru tout le catalogue.

## Mesures du catalogue publié

Mesures par taille des fichiers PNG et somme `width × height × 4 / 1048576`, sans navigateur. Elles couvrent le catalogue entier, indépendamment du sous-ensemble chargé.

| Groupe | PNG | Octets avant | Octets après | Mio RGBA avant | Mio RGBA après |
|---|---:|---:|---:|---:|---:|
| Lapins et patches | 55 | 19 634 718 | 3 390 039 | 97,1949 | 13,8282 |
| Habitats | 18 | 9 154 318 | 9 154 318 | 19,5166 | 19,5166 |
| Total | 73 | 28 789 036 | 12 544 357 | 116,7115 | 33,3448 |

Soit −56,4 % des octets et −71,4 % du RGBA pour ce catalogue complet ; −85,8 % du RGBA des lapins. Dans la nouvelle partie contrôlée sous Chromium, le démarrage passe de 73 demandes d'images lapins/habitats à 4 : Paille, ses deux patches et l'habitat Paille N1, soit 600 301 octets et 1,5575 Mio RGBA. Les autres assets fixes ne sont pas compris dans ces chiffres.

Ces valeurs ne sont pas des mesures de mémoire totale Safari/GPU. Les dix captures Chromium DPR 3 avant/après sont hors dépôt dans `%TEMP%\prairie-fond-2` (`before-`/`after-` : `rabbits`, `glass-left-closed`, `habitats`, `collection`, `breeding`). Elles ont toutes été regardées : pas de différence perceptible de taille ou de netteté, paupières alignées sur Glassofeu tourné à gauche. Les poses des autres lapins varient entre les captures. Aucune mesure d'`update()` pour T1 ; aucun essai sur un iPhone physique.

Validation locale : `npm run typecheck`, suite complète `npm test -- --configLoader runner --maxWorkers 1 --testTimeout 30000` (131 fichiers, 2 037 tests), `npm run build -- --configLoader runner`, `git diff --check` et les sept dérivations `--check` (sprites, clignements, habitats, art d'île, étapes d'île, décorations, overlays de nurserie). Le build conserve l'avertissement de chunk JavaScript > 500 ko.

`scripts/check-t1.cjs` utilise `PLAYWRIGHT_MODULE` et un seul Chromium temporaire. Il vérifie aussi le fantôme d'un habitat absent au démarrage, les portraits d'espèces découvertes sans résidents (sans importer leurs patches dans Phaser), l'échec d'un patch puis sa reprise et le remplacement d'état pendant un téléchargement retardé. Zéro erreur JavaScript ; un échec réseau de patch est provoqué volontairement. Chromium et Vite sont arrêtés après les captures. Les travaux T2/T4 déjà présents sont conservés ; seul le premier rendu de GameUI a nécessité une correction de reprise pour laisser fonctionner l'accueil guidé. Le test de niveaux utilise désormais une requête simulée au lieu de modifier la configuration figée.
