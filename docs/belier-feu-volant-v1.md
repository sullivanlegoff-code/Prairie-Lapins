# Bélier Gris, Feu et Volant — originaux intégrés

Base : production `e455986`, application précédente `5248235`. Neige, Paille et Terre validés sur iPhone restent inchangés, fichiers et paramètres compris. Règles, sauvegardes, caméra, île, habitats, décorations et autres espèces inchangés ; Supabase en pause.

Les trois espèces réutilisent la méthode existante : une texture par espèce, même PNG dans habitats, fiches, boutique, collection et parents, image entière animée par translation sans déformation, masque alpha pour la sélection. Les noms des portraits proviennent du catalogue `SPECIES`.

| Espèce | Source | Asset | Dimensions | Largeur monde |
| --- | --- | --- | --- | --- |
| Bélier Gris | [original](reference/belier-gris/source.png) | [PNG](../public/assets/rabbits/belier-gris/belier-gris-v1.png) | 527 × 488 | 48 |
| Feu | [original](reference/feu/source.png) | [PNG](../public/assets/rabbits/feu/feu-v1.png) | 1004 × 827 | 50 |
| Volant | [nouvel original](reference/volant/source.png) | [PNG](../public/assets/rabbits/volant/volant-v1.png) | 814 × 966 | 50 |

Volant utilise `Design des lapins/volant.png`, blob `007d40a6e1a5ecefe5492999d187efb4a9fe1a82` fourni sur main `e316c14`. L’ancienne référence `Lapin Volant.png`, au museau coupé, est supprimée de la branche livrée. Aucun redessin ni illustration générée. Le corps de Volant conserve une taille comparable à Paille : les ailes ne déterminent pas seules l’échelle. Ancrage commun `(0.5, 1)`, y = 12.

[Préparation reproductible](reference/prepare-belier-feu.sh) : suppression du fond connecté, nettoyage du masque alpha, quatre pixels transparents autour, RGB conservés. [Comparaison des pixels](validation/belier-feu-v1/pixel-fidelity.json) : différence RGB maximale 0 pour les pixels opaques des trois PNG.

Comparaisons référence à gauche / capture réelle de la fiche à droite : [Bélier Gris](validation/belier-feu-v1/belier-gris-reference-vs-game.png), [Feu](validation/belier-feu-v1/feu-reference-vs-game.png), [Volant](validation/belier-feu-v1/volant-reference-vs-game.png). [Habitat mixte](validation/belier-feu-v1/seven-occupants.png).

Contrôles locaux : 586 tests / 18 fichiers, TypeScript, builds normal et laboratoire ; 21 sélections aux zooms 0,8 / 1,05 / 1,65, oreilles, profils, boutique, collection, parents et écran portrait. [Rapport navigateur](validation/belier-feu-v1/browser.json). Le fixture mixte et les sondes sont limités au script ; aucun hook dans l’application livrée. Vérification Chromium tactile, sans iPhone physique disponible.

[PR nº 7 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/7), application publiée `550dceb49c4c42f54da799137dd37e0c9c9c4fe9`, arbre `c73d6fb2a661354f79a21677b7ca00ffe13af1b3` identique à la fusion testée. [CI réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38045871955) et [captures CI](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38045871955/artifacts/11666579253).

[Publication réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38046399231) : quatre routes et révisions vérifiées, six suites Chromium et 25 contrôles publics réussis ; dimensions, transparence et SHA-256 des six PNG confirmés. [Captures publiques](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38046399231/artifacts/11667004162) · [preuve durable](validation/belier-feu-v1/publication.json). Décorations reste en v5 `85fe255`, Comptes en v4 `3e70d9e` ; leurs sources et sauvegardes sont conservées.
