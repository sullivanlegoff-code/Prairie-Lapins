# Pièce — preuves de publication

Application publiée : `fe9a70e3122d05471fc88eb0ce31862f6b8232a8` (normal et laboratoire, sauvegardes v8).

- [Compteur](coin-counter.png).
- [Prix et stock de la boutique](coin-price.png).
- [Mission et récompense](coin-mission.png).
- [Confirmation de vente](coin-confirmation.png).
- [Confirmation pièces/cœurs](coin-mixed-hearts.png).
- [Portrait](coin-portrait.png).
- [Montant regroupé](coin-large-landscape.png).
- [Tailles réelles de l’icône](coin-sizes.png).

Ces captures viennent du navigateur exécuté sur les URL publiques par GitHub Actions, et non d’un serveur local. [Rapport dédié](coin-public-report.json) et [révisions des quatre routes](published-revisions.json).

Validation source/build : [exécution 38163886451](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38163886451), 696 tests, TypeScript, builds normal/laboratoire, neuf parcours de source et quinze parcours de builds (56 vérifications).

Publication : [exécution 38164573505](https://github.com/sullivanlegoff-code/Project-L/actions/runs/38164573505), quatre builds et leurs contrôles. Les quinze parcours publics et leurs 56 vérifications ont réussi, sans erreur JavaScript. Un premier démarrage du parcours d’initiation avait envoyé le geste avant que la prairie soit prête ; le jeu a correctement refusé la destination occupée. La relance du contrôle a réussi avec exactement le même build. Les parcours guidés attendent désormais les six textures de lapins et deux rafraîchissements de l’écran avant les gestes : synchronisation du test seulement.

Aucune modification d’économie, de données ou de migration. Les prévisualisations conservent leurs révisions : comptes `3e70d9e` (v4), décorations `85fe255` (v5).

Le montant 1 234 567 a aussi été importé volontairement dans un laboratoire local de la même révision et vérifié en 667 × 375 et 390 × 844, avec groupement français et sans débordement. L’arbre d’accessibilité expose le compteur comme « Pièces » avec son montant ; les autres groupes possèdent le libellé masqué « pièces ».

Contrôles Chromium tactiles ; aucun essai Safari physique. Cet archivage de preuves ne change pas le build publié.
