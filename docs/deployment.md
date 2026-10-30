# Publication

## GitHub Pages (automatique)

Jeu : https://sullivanlegoff-code.github.io/Prairie-Lapins/ ; laboratoire : https://sullivanlegoff-code.github.io/Prairie-Lapins/dev/ ; prototype cuisine : `.../Prairie-Lapins/cooktap-prototype/`.

Chaque envoi sur `main` lance le workflow `.github/workflows/deploy-pages.yml` (onglet Actions). Il exécute `npm run build:github` (le même `scripts/build-pages.mjs` que Netlify, avec la base `/Prairie-Lapins/`), puis publie le dossier `_site/`. On peut aussi le relancer à la main : Actions → « Publier sur GitHub Pages » → Run workflow.

Réglages du dépôt, faits une seule fois :
- Settings → Pages → Source : **GitHub Actions**.
- Settings → Secrets and variables → Actions → onglet **Variables** : `VITE_SUPABASE_URL` (URL du projet `vulkepfrnnqtgijitkwg`) et `VITE_SUPABASE_PUBLISHABLE_KEY` (clé `sb_publishable_…`). Le workflow échoue si l'une manque. Jamais de clé `sb_secret_` ni `service_role`.

La révision servie se lit dans `build-revision.txt` (le commit GitHub) et dans Paramètres.

Les parties sans compte sont rangées dans le navigateur par adresse : une partie locale jouée sur Netlify n'apparaît pas sur GitHub Pages. Les parties liées à un compte se retrouvent en se reconnectant.

## Netlify (hors ligne)

Le site `velvety-squirrel-142402.netlify.app` a été désactivé par le propriétaire le 30 octobre 2026 ; il répond 404. `npm run build:netlify` reste utile pour construire `netlify-site/` en local (aperçu sur iPhone par le Wi-Fi), mais rien n'y est plus publié.

## Historique

Les versions v6 et antérieures étaient publiées depuis le dépôt `Project-L` (base `/Project-L/`) ; voir `docs/history/`.
