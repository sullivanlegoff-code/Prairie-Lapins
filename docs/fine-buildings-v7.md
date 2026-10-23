# Bâtiments sur la grille fine — v7

Tous les bâtiments occupent 4 × 4 petits carrés. Leur origine est entière, indépendante des anciennes grosses cases : (13,14) est admissible. L’empreinte peut traverser deux parcelles acquises ; chaque petit carré doit être acquis et libre. Contact de bord autorisé, chevauchement refusé. Aucun chemin entre l’origine et la destination n’est exigé.

`src/simulation/placement.ts` définit les empreintes et collisions communes aux achats, déplacements, décorations et imports. Seul le bâtiment déplacé est ignoré. L’interface affiche la grille fine, l’illustration en aperçu, toute l’empreinte et le motif de refus. Valider applique une commande du contrôleur ; annuler ne dépense rien et conserve l’ancien placement. Les décorations gênantes doivent être déplacées ou rangées individuellement.

## Sauvegardes et rendu

Le format v7 conserve la clé active. Une partie v6 est validée dans son unité d’origine puis ses coordonnées de bâtiments sont multipliées par quatre, une seule fois. Les décorations, déjà fines, restent intactes. La source v6 est conservée sous `prairie-lapins.backup.before-v7` avant remplacement ; le secours des anciens formats reste disponible. Les anciens imports passent directement en v7. Ressources, identifiants, occupants et échéances restent inchangés. Les clients v6 ne lisent pas les exports v7.

Les conversions pour l’affichage sont explicites. Les positions mondiales après migration restent identiques. Les illustrations de bâtiments ont leur propre cache et leur propre image, indépendante des textures de terrain par parcelle : un bâtiment traversant une frontière ne peut être ni coupé ni dupliqué. Un déplacement change la position de l’image réutilisée sans reconstruire les parcelles ou les textures à chaque image. Les lapins, bulles, noms et sélections suivent le centre fin du bâtiment. Les six illustrations de lapins et leur configuration restent inchangées.

## Vérifications

614 tests dans 19 fichiers, dont 27 contrôles dédiés à la grille fine et au format v7 ; TypeScript et les deux builds. Achats des quatre types, décalages unitaires, frontières acquises, eau/parcelle verrouillée, collisions réciproques, contact de bord, déplacement partiellement superposé à l’origine, obstacle intermédiaire sans chemin, atomicité, sauvegarde/rechargement et conversion exacte.

Chromium tactile : aperçu, annulation, double confirmation, glissement/pincement, migration v6 avec secours brut, caches conservés, travaux en cours et 21 sélections des sept occupants après déplacement aux zooms 0,8 / 1,05 / 1,65. Les contrôles du build utilisent uniquement les commandes réelles et la lecture de sauvegarde, sans injection d’application. [Rapport source](validation/fine-buildings-v7/fine-buildings-browser-report.json) · [Rapport compilé](validation/fine-buildings-v7/fine-buildings-public-report.json).

[Placements décalés](validation/fine-buildings-v7/fine-buildings-placements.png) · [Aperçu 4 × 4](validation/fine-buildings-v7/fine-buildings-preview.png) · [Portrait](validation/fine-buildings-v7/fine-buildings-portrait.png).

## Essai iPhone — trois étapes

1. Dans le laboratoire, charger « Bâtiments décalés — grille fine 4 × 4 » : vérifier la ferme et le nid traversant les frontières, puis sélectionner les sept lapins.
2. Déplacer un bâtiment d’un seul petit carré : annuler, recommencer et valider. Une décoration ou une parcelle verrouillée doit provoquer un refus ; glisser/pincer doit déplacer la caméra sans valider.
3. Recharger : vérifier le placement et les occupants. Revenir au jeu normal pour constater que sa partie est distincte ; ne pas effacer les données Safari.

Chromium est disponible ; aucun iPhone Safari physique pendant cette étape. Les six visuels ont déjà été validés sur Safari par le joueur. Les routes Décorations v5 et Comptes v4 restent figées, Supabase/email en pause.

## Livraison confirmée

Application `687075e8989cb64a9f45db73765b96581372cb3c`, [PR nº 8 fusionnée](https://github.com/sullivanlegoff-code/Project-L/pull/8). [CI réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38049916234) : 614 tests / 19 fichiers, TypeScript, deux builds et tous les parcours ; arbre livré identique à celui testé. [Publication réussie](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38050582414) : sept suites et 27 contrôles publics sans erreur, quatre routes confirmées (v7/v7/v4/v5), six PNG servis inchangés. [Rapport durable](validation/fine-buildings-v7/publication.json) · [Captures publiques](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38050582414/artifacts/11669092804).
