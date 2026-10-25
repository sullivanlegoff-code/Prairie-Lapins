# Nid : harmonisation chromatique — 2026-10-17

Le propriétaire apprécie le design et le remplissage de l'empreinte du build `dbeb7ea`, mais demande un meilleur accord des couleurs avec l'île. Cette tâche conserve le dessin, les dimensions 704 × 810, l'alpha, l'origine, l'échelle, l'empreinte, les parents et toutes les autres illustrations.

## Palette mesurée et écart

Sources du terrain : `src/display/parcelArt.ts`, fond de caméra dans `MeadowScene.ts`. Les couleurs translucides sont composées sur le fond ; ne pas confondre couleur de peinture et couleur résultante.

| Élément de l'île | Couleur réelle / traitement |
| --- | --- |
| Herbe de base | `#cbd785` ; HSV 68,8°, 38,1 %, 84,3 % |
| Taches claires | `#e6df95` à 25 % sur la base, environ `#d2d989` |
| Taches foncées | `#abc779` à 25 %, environ `#c3d382` |
| Brins d'herbe | `#829e65` à 50 % |
| Chemin | `#ded09a` à 33 % sur l'herbe, environ `#d1d58c` |
| Bordure | sable `#eed5a2`, trait olive `#9db66c` à 85 % |
| Eau | `#91d3ce` ; HSV 175,5°, 31,3 %, 82,7 % |
| Ombre côtière | `#6ab7b9` à 24 %, reflets `#d9f0e8` à 55 % |
| Ombres habitats / lapins | `#50684b` à 12 % / `#6b7755` à 16 % |

Autres repères existants, sans prétendre qu'ils ont tous été explicitement validés par le propriétaire : habitat universel `#c2dc9f`, Paille `#e4d49b`, Terre `#c4ab8e`, Feu `#e2b899`, clôtures brunes/beiges. Boutons pierre effectivement validés sur captures : sauge `#c6d0b6`, calcaire `#d6d6cb`, inscription sombre `#24311f`. Les illustrations des parents et des autres bâtiments ne sont pas recolorées.

Mesures sur les PNG des lapins, pixels alpha ≥ 220 regroupés en cubes RGB de 16 niveaux, moyennes des groupes les plus fréquents : Paille crème `#ead9c7` / `#f5e6d5`, ombre beige `#d3bda9` ; Bélier Gris `#9a9598` / `#aaa5a5`, ombre `#8b8589` ; Volant bleu `#4878c6` / `#2955b7`, lumière `#99c7e9`. Le bleu vif du Volant appartient au personnage et reste inchangé ; il ne sert pas de cible pour recolorer l'eau ou la prairie.

Échantillons du PNG actuel, médiane RGB sur zones identifiées dans `nest-palette-data.json` (coordonnées exactes, pixels identiques comparés dans toutes les variantes) :

| Zone du nid | Actuel | Variante forte |
| --- | --- | --- |
| Sol herbeux | `#d7e75c` | `#d0dc82` |
| Arbres éclairés | `#99d095` | `#a0ca88` |
| Arbres ombrés | `#51a695` | `#62a876` |
| Dôme rose | `#f7a493` | `#f2baac` |
| Lumière du dôme | `#fbceb5` | `#f6d4c4` |
| Ruisseau | `#98e3fb` | `#9ce8e4` |
| Chemin | `#f7b070` | `#f2b892` |
| Fleurs roses | `#fb9b90` | `#f6b4a8` |
| Fleurs jaunes | `#fbf699` | `#ecee9c` |
| Ombre d'entrée | `#82362e` | `#8a544a` |

Le sol actuel est proche en teinte (66,9° contre 68,8°) mais beaucoup plus saturé (60,2 % contre 38,1 %) et plus lumineux en valeur HSV (90,6 % contre 84,3 %). L'écart est surtout un jaune citron intense. L'eau du nid est plus bleue (194,5°), plus saturée (39,4 %) et très claire (98,4 %), face au turquoise grisé de l'île. Les arbres comportent des ombres cyan froides, alors que la prairie et ses ombres sont olive/sauge. Le chemin orange (54,7 % de saturation, valeur 96,9 %) et le rose corail du dôme produisent un contraste chaud/froid fort avec ces verts bleutés. L'entrée est brun rouge sombre et contrastée ; la correction réduit sa saturation sans effacer l'ouverture. Les textures de l'île sont beaucoup moins contrastées que le modelé peint du nid : ce modelé est conservé, seulement adouci chromatiquement.

## Méthode et trois variantes

**Aucune génération d'image.** `node scripts/recolor-nest.mjs` lit l'original intact et applique une correction déterministe par familles de couleurs HSV avec transitions cubiques continues. Pas de sélection à bord dur, flou, redessin, déplacement ou rééchantillonnage. Les dimensions et **chaque octet alpha** sont conservés, y compris les pixels semi-transparents des arbres. Le code traite le RGB non prémultiplié pour éviter une frange de détourage.

- Herbe : désaturation, rapprochement du jaune-olive et réduction modérée des écarts de luminosité. Une correction supplémentaire, commune aux variantes, rapproche doucement l'herbe des bords de `#cbd785` sur 64 pixels de texture (16 unités monde). Seule la famille herbeuse est concernée ; aucun changement d'alpha.
- Arbres : réchauffement vers un vert sauge/olive, ombres moins cyan.
- Eau : déplacement vers le turquoise 175°, saturation réduite ; reflets et mouvements peints conservés, plus clairs que l'eau extérieure.
- Dôme : rose corail adouci vers un rose poudré chaud ; chemin moins orange saturé ; fleurs moins éclatantes. Les contours existants restent à leur place et lisibles.
- Intensités globales : **légère 45 %**, **moyenne 72 %**, **forte 100 %** de la correction cible. La version forte est recommandée : son sol médian se rapproche le plus de celui de l'île (HSV 68°, 40,9 %, 86,3 %) tout en conservant le rose du dôme et les détails. Ce choix artistique reste à confirmer par le propriétaire.

Limite imposée par le dessin conservé : le ruisseau et le chemin atteignent le bord avant et le ruisseau le bord gauche. Leurs terminaisons restent visibles sur l'herbe ; supprimer ces limites serait une modification du dessin. La texture végétale reste plus détaillée que le terrain procédural. La recoloration améliore le raccord herbe/herbe ; elle ne promet pas une continuité pixel à pixel avec les taches procédurales variables de chaque emplacement.

## Compression

PNG RGBA conservé, sans nouveau besoin WebP. Filtrage PNG adaptatif par ligne et DEFLATE niveau 9. Arrondi RGB sur un pas de 2 : écart de quantification maximal de **1 niveau sur 255 par canal**, alpha exact. L'encodage/décodage PNG lui-même est sans perte ; les couleurs sont volontairement corrigées, puis très légèrement quantifiées. Aucune réduction de résolution ni de géométrie. Contrôle aller-retour RGBA et alpha original exécuté par le script.

| Version | Octets | Réduction |
| --- | ---: | ---: |
| Actuelle, intacte | 1 256 569 | — |
| Légère | 724 714 | 42,33 % |
| Moyenne | 699 459 | 44,34 % |
| Forte | 666 614 | 46,95 % |

Originaux, SHA-256 et médianes détaillées : `nest-palette-data.json`. Aucun paquet installé et aucun changement de dépendances. Les trois PNG sont prêts dans `public/assets/buildings/` ; seule la variante sélectionnée est chargée par Phaser.

Pour changer de variante, modifier uniquement la ligne 2 de `src/config/nestArt.ts` :

```ts
export const NEST_PALETTE: 'v2' | 'light' | 'medium' | 'strong' = 'strong';
```

`v2` remet l'image précédente intacte ; `light`, `medium`, `strong` sélectionnent les trois recolorations. Recompiler ensuite normalement. Aucune option de jeu ni donnée de sauvegarde ajoutée.

## Comparaisons locales

`node docs/nest-palette-check.cjs http://localhost:5174/ <dossier-temporaire>/prairie-nest-palette-20261017`

Le script ouvre le build compilé avec le scénario existant Bâtiments décalés du laboratoire dans des contextes neufs. Il remplace uniquement la réponse PNG du nid par la variante locale, sans changer de code de jeu ni écrire une sauvegarde normale. Quatre sous-dossiers : `current`, `light`, `medium`, `strong`. Chaque dossier contient île entière (ferme, nid, nurserie) et nid avec deux parents, en 390 × 844 et 844 × 390 : **16 PNG**. Cadrages/zooms identiques entre variantes, vérifiés ; parents sélectionnés séparément via les vrais contrôles. PNG décodés aussi par WebKit Windows, sans assimiler cela à Safari iPhone.

Résultat : **103 contrôles réussis**, 16 captures, aucune erreur navigateur. Inspection visuelle de l'île avant/forte et des parents en moyenne/forte : contours propres, bords herbeux plus discrets, texte et personnages inchangés. Les microvariations RGB de compression ne sont pas perceptibles à ces tailles lors de cette inspection ; ce n'est pas une garantie perceptuelle universelle.

## Tests

`npm.cmd run typecheck` réussi. **Une seule suite complète** : `npm.cmd test -- --maxWorkers=1 --reporter=json --outputFile=<dossier-temporaire>/prairie-nest-palette-20261017/tests.json` : **1090/1090 réussis, 52 fichiers, aucun délai dépassé**, aucune relance ciblée nécessaire. Le nombre de workers est limité pour réduire la contention ; les assertions, le code des tests et le délai de 5000 ms restent inchangés. La session précédente avait neuf expirations dans `simulation`, `decorations`, `collection`, `new-species`, `foundations`, `laboratory`, `purchasable-recipes`, `recipe-privacy` ; toutes passent cette fois. Ce résultat est compatible avec l'hypothèse de concurrence CPU précédente, sans en prouver à lui seul la cause.
