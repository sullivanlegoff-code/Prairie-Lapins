# Ferme : palette alignée sur le nid « strong » — 2026-10-17

Le propriétaire a validé la recoloration « strong » du nid (`b1b1dc1`) et demande une palette similaire pour la ferme. La nurserie n'est pas concernée. Cette tâche ne modifie ni le dessin, ni les dimensions 1254 × 1254, ni l'alpha, ni l'origine (0,5 ; 0,70), ni la largeur 156, ni l'empreinte 4 × 4, ni la bulle de récolte (`harvestY` 38), ni aucune règle, sauvegarde ou texte. Pales statiques, tête de lapin conservée à l'identique.

## Écarts mesurés

Médianes RGB sur des zones de l'original filtrées par couleur (`docs/farm-palette-data.json`, mêmes pixels comparés dans chaque variante). HSV : teinte°/saturation %/valeur %. Repères du nid « strong » et de l'île : [nest-palette.md](nest-palette.md).

| Famille | Ferme d'origine | Repère nid strong / île | Variante `nest` |
| --- | --- | --- | --- |
| Herbe | `#b3e97b` 89/47/91 | nid `#d0dc82` 68/41/86 ; île `#cbd785` 69/38/84 | `#ccda86` 70/39/85 |
| Herbe ombrée, buissons | `#5fa455` 112/48/64 | olives sombres du nid ≈ 70–100° | `#a0ba70` 81/40/73 |
| Arbres éclairés | `#92ecac` 137/38/93 | `#a0ca88` 98/33/79 | `#98d286` 106/36/82 |
| Arbres ombrés | `#54b084` 151/52/69 | `#62a876` | `#6caa64` 113/41/67 |
| Toit, drapeau | `#d2767e` 355/44/82 | dôme `#f2baac` 12/29/95 | `#da9894` 3/32/85 |
| Tour crème | `#fdd4aa` 30/33/99 | crème du nid ≈ 33/18/96 | `#fed8b6` 28/28/100 |
| Socle pêche | `#fca67d` 19/50/99 | chemin `#f2b892` 24/40/95 | `#fcb48e` 21/44/99 |
| Pales en bois | `#eeb67d` 30/47/93 | chemin `#f2b892` | `#eebc8c` 29/41/93 |
| Terre du potager | `#ac6f52` 19/52/67 | brun du nid ≈ `#a5725a` 19/45/65 | `#ac7a60` 21/44/67 |
| Porte | `#b16546` 17/60/69 | — | `#b27458` 19/51/70 |
| Contours brun foncé | `#702e16` 16/80/44 | contours du nid ≈ 9/51/45 | `#703a28` 15/64/44 |
| Clôture, pierres | `#fcf4e4`, gris | inchangés | inchangés |
| Tête, oreilles | `#fdfbf8`, `#fdc1b1` | — | **identiques** |

Écarts principaux : herbe vert-jaune vif (89°, 47 %) au lieu de l'olive pâle de l'île (69°, 38 %) ; arbres vert menthe (137–151°) alors que les arbres du nid sont sauge (98–114°), donc incohérents côte à côte ; toit framboise plus saturé et plus froid que le rose poudré du dôme ; contours brun-rouge très saturés (80 %) ; bois, crème et terre déjà proches du chemin du nid, écart faible. **Pas d'eau** dans la ferme. Les ombres peintes sont conservées en valeur, seulement recolorées avec leur famille.

## Méthode

**Aucune génération d'image.** `node scripts/recolor-farm.mjs` lit `farm-windmill.png` intact et applique la même logique que `recolor-nest.mjs` : appartenance douce à des familles HSV (transitions cubiques), RGB non prémultiplié, alpha copié octet par octet, aucun flou, masque dur, déplacement ni rééchantillonnage.

- Herbe : même cible que le nid (teinte vers 69°, saturation vers 38 %, contraste de valeur réduit), plus le même raccord commun aux variantes vers `#cbd785` près du bord, ici sur 96 pixels de texture (≈ 12 unités monde à l'échelle 0,124), calculé par distance au bord transparent et limité au sol (y ≥ 560). Seule la famille herbe est concernée : pas de halo ni de contour ajouté.
- Arbres : menthe vers sauge, teinte 108 + (h − 142) × 0,55, saturation vers 34 %, valeur légèrement abaissée ; le modelé lumière/ombre reste.
- Toit et drapeau : framboise vers rose poudré chaud (teinte vers 8°, saturation × 0,74), valeur conservée.
- Bois, tour, socle, terre, porte : retenue légère de saturation (× 0,84–0,86), teinte à peine rapprochée de 24°.
- Contours très saturés : saturation ramenée vers 56 %, **valeur identique**, donc lisibilité conservée.
- Petites fleurs bleues/violettes/roses : même retenue de 16 % vers la luminance que le nid.
- **Tête de lapin** : dans une ellipse douce autour du moyeu, seules les couleurs propres à la tête (blanc, rose pâle des oreilles, yeux/contour sombres) sont protégées ; feuillage, toit et pales autour sont recolorés normalement, ce qui évite une plage non corrigée. Le script vérifie que tous les pixels entièrement protégés sont identiques à l'original.
- Intensités : **`light` 50 %**, **`nest` 100 %** de la correction. `nest` est intégrée.

## Poids

PNG RGBA, filtrage adaptatif par ligne, DEFLATE niveau 9, RGB arrondi au pas de 2 (≤ 1 niveau sur 255 par canal), alpha exact ; contrôle aller-retour dans le script.

| Version | Octets | Réduction | SHA-256 |
| --- | ---: | ---: | --- |
| `farm-windmill.png` intacte | 1 256 162 | — | `2aadc592…54a8e` |
| `farm-windmill-light.png` | 987 686 | 21,37 % | `9150fedf…8f159` |
| `farm-windmill-nest.png` | 954 855 | 23,99 % | `0c9a3c9e…9a562` |

Gain plus faible que pour le nid (47 %) : l'original de la ferme était déjà mieux compressé. Pas de réduction de résolution.

## Choix de variante

Une ligne, `src/config/farmArt.ts:2` :

```ts
export const FARM_PALETTE: 'original' | 'light' | 'nest' = 'nest';
```

`original` recharge `farm-windmill.png` intact. Seule la variante choisie est chargée. `scripts/verify-production.mjs` continue de vérifier le blob de l'original (toujours copié dans le build). `docs/farm-art-browser-check.cjs` suit désormais le fichier sélectionné.

## Comparaisons locales

`node docs/farm-palette-check.cjs http://localhost:5174/ <dossier hors Git>` sur le build local servi par `npm run preview`. Le script remplace seulement la réponse PNG de la ferme, charge le scénario existant « Bâtiments décalés » du laboratoire, lance une production par le vrai bouton si la ferme est libre, avance l'horloge du laboratoire de 5 minutes, vérifie l'état « prêt » puis capture : île entière (ferme, nid, nurserie) et gros plan de la ferme avec bulle de récolte, en 390 × 844 et 844 × 390, cadrages identiques entre variantes. Rien n'est récolté ; sauvegarde normale intacte.
