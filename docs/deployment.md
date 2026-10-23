# Publication v6

Jeu : https://sullivanlegoff-code.github.io/Project-L/ ; laboratoire : https://sullivanlegoff-code.github.io/Project-L/dev/.

Révision applicative `ecb8953ffd1b2df2e414d31bb162d60b2c9e3e79`, PR nº 3 intégrée après [validation GitHub](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37983514087). [Publisher](https://github.com/sullivanlegoff-code/Project-L/actions/runs/37984029226), [preuve durable](validation/production-v6-2026-10-09.json). Les commits documentaires ultérieurs avec `[skip ci]` ne remplacent pas la révision applicative réellement servie.

Le workflow `deploy-pages.yml` construit depuis `production` le normal et le laboratoire en v6, puis reconstruit les routes figées Décorations v5 `85fe255ec8e7e65213cd570f91f5bb1fe66a30d7` et Comptes v4 `3e70d9e8cbe9228c63c73db007fff199199d6470`. `verify-land-integration.mjs` vérifie les quatre formats, révisions, chemins et outils avant l’artefact unique. Après Pages, `verify-published.mjs` vérifie les fichiers HTTPS puis Chromium teste les interactions normales et le laboratoire dans un profil jetable. Aucun client de comptes dans le normal/laboratoire ; aucune action email/Supabase/SQL pendant cette livraison.

La version se lit dans Paramètres et `build-revision.txt` sur chaque route. Le laboratoire possède des clés distinctes ; aucun transfert automatique. Les exports v6 sont incompatibles avec les clients figés v5/v4. [Conversion et récupération](land-v6.md). Ne pas effacer les données Safari.
