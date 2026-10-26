# Passation Claude → Codex — 26 octobre 2026

Document factuel. Les règles permanentes sont dans `AGENTS.md` (racine du dépôt). Les anciennes passations (`docs/claude-handoff-2026-10-22.md`, `docs/codex-handoff-2026-10-23.md`) décrivent un état dépassé : ne t'y fie que pour l'historique.

À partir de maintenant, le propriétaire travaille uniquement avec Codex. Tu es le coordinateur ; tu confies les missions à des agents Codex (voir `AGENTS.md`, sections 2 et 6).

## 1. Point de reprise

- **Branche de travail : `feature/missions-octobre-2`**, non fusionnée et non poussée. Elle part de `main` (`f968acd`).
- **`main` = `f968acd`** (rappel de création de compte), poussé sur `origin`. La publication de `f968acd` sur Netlify n'a pas été vérifiée. Dernière version vérifiée en ligne : `c79f701`. Ne publie rien : le propriétaire publiera plus tard.
- Le propriétaire a testé la branche sur son iPhone (aperçu local) : « ça fonctionne bien ». Il ne veut **pas encore publier** sur Netlify : d'autres missions vont suivre sur cette branche (ou une suivante).
- Fusion dans `main` et push : **seulement quand le propriétaire le demande**.
- Hors Git, à préserver : `.claude/` (non suivi), `.env.local` (ignoré, contient l'URL et la clé publishable Supabase), `output/` (ignoré, concepts imagegen).

## 2. Ce que contient la branche

Commits, du plus ancien au plus récent :

| Commit | Contenu |
|---|---|
| `5b5e5b7` | Catalogue **v20** : Lapin à Lunettes, Feu Glacé et Perroquet retirés (lapins possédés convertis en Boudinet, Glassofeu, Phoenix ; recettes achetées remboursées) ; **Dinono épique** ; **Lapin en Bouée feu + métal** à l'ancienne place de Dinono. |
| `c1d3602` | Bulle de récolte d'un habitat seulement dès **200 pattes** ou stock plein (`INCOME_BUBBLE_THRESHOLD`, `src/config/visual.ts`) ; noms retirés sous les bâtiments ; encadré « **Chance de reproduction** » (Normale / Légèrement meilleure / Meilleure, sans chiffre) dans la fiche du lapin. |
| `e167a0c`, `7a00cbc` | **Barres d'avancement** discrètes : nid, ferme, et sous chaque lapereau de la nurserie (`src/display/progressBars.ts`, `progressBarViews.ts`). |
| `3099ec2` | Fin du tutoriel : « Première naissance » donne **630 pattes** (prix de la Clairière de feu + Lapin Feu, dérivé des prix). Niveau 22 toujours au jour 20. |
| `e334d25` | **Écran de chargement** : Paille traverse l'écran en courant ; 10 messages du propriétaire tirés au hasard (`src/config/loadingMessages.ts`, à ne pas modifier). |
| `aae2eb4` | **Menus sur téléphone** : Paramètres, Missions, Collection, Recettes, Cœurs, fiche d'espèce centrés sur le jeu grisé (`CENTER_CARD_VIEWS` dans `src/ui/GameUI.ts`), Échap, retour du focus. |
| `078336b` | **Déplacer un lapin** : vue dézoomée, flèches au-dessus des habitats compatibles avec une place, bandeau « Annuler » / « Choisir dans une liste » (`src/ui/rabbitDropTargets.ts`). |
| `a722cd0` | **Lapin en Bouée** : design peint « Cocktail » choisi par le propriétaire (vacances, bouée turquoise à pois, lunettes de soleil en cœur). Pas de clignement (il porte des lunettes). |
| `6d6c8b5` | Audit, défaut bloquant : **retirer un habitat vide** (`removeHabitat`), stock récolté, **sans remboursement**, décorations gardées. |
| `d3f272c` | Audit : horloge reculée (quotidiennes), sauvegardes toujours relisibles (JSON compact, limite vérifiée avant écriture), panneaux à jour aux échéances (voyage, quotidienne), filet de démarrage si le JavaScript ne se charge pas (`index.html`). |
| `bdcdf9d`, `1698960` | Audit, défauts mineurs : « Confier » annonce la nourriture reçue ; le croisement garde le focus ; raisons d'indisponibilité visibles sur mobile. |
| `4554803` | Tutoriel : une flèche montre la case à toucher pour placer la ferme ; la main ne pointe plus un « Confirmer » grisé. |

Plus la passation elle-même (`AGENTS.md`, ce document, `docs/playthrough-check.cjs`).

## 3. Validation réellement effectuée

- Sur `4554803` : `npx tsc --noEmit` OK ; vitest **161 fichiers, 2 405 tests** OK ; `build` et `build:lab` OK ; `git diff --check` OK.
- `npm run build:netlify` (avec `verify-production`) OK sur `1698960` (production 406 fichiers, laboratoire 400). **`netlify-site/` n'a pas été reconstruit depuis** : reconstruis-le avant toute publication.
- Chromium, écran de téléphone : écran de chargement ; menus centrés et défilement au doigt ; déplacement d'un lapin ; barres d'avancement ; encadré de chance ; flèche de placement de la ferme ; partie automatique d'une nouvelle partie jusqu'à l'accueil du premier lapereau, sans erreur JavaScript.
- iPhone : le propriétaire a testé la branche avant les derniers correctifs d'audit et dit que tout fonctionne. Les correctifs d'audit et la flèche de la ferme **n'ont pas été essayés sur iPhone**.
- Non vérifié dans un navigateur : l'arrivée des 630 pattes en fin de tutoriel (couvert par les tests seulement).

## 4. Décisions prises sans validation explicite du propriétaire

Il a été informé et n'a pas objecté, mais confirme-les si le sujet revient :
- Le **Perroquet** a été retiré avec Lunettes et Feu Glacé (son message demandait deux fois « lapin à lunette » ; le Perroquet était le seul autre lapin sans sprite).
- **Retirer un habitat** ne rembourse ni le prix ni les améliorations.

## 5. Points ouverts connus

- Démarrage **hors ligne** non garanti (pas de service worker). Le filet de démarrage affiche seulement un message et « Réessayer ».
- Sauvegarde en ligne : coupure réseau pendant un envoi et expiration réelle de session **non testées sur appareil**.
- `vite build` affiche un avertissement d'import statique/dynamique de `src/cloud/config.ts` : sans effet connu.
- Les anciens scripts `docs/*-check.cjs` (sauf `docs/playthrough-check.cjs`) sont obsolètes.
- Le propriétaire n'a pas encore donné ses autres idées de dépenses en cœurs.

## 6. Repères utiles

- Règles de jeu : `src/config/` (données) et `src/simulation/` (règles pures) ; interface : `src/ui/GameUI.ts` (gros fichier central), `src/display/MeadowScene.ts` (scène Phaser) ; sauvegarde : `src/persistence/json.ts` ; contrôleur : `src/application/GameController.ts` ; comptes : `src/cloud/`, `supabase/migrations/001_cloud_saves.sql`, `docs/accounts.md`, `docs/supabase-setup.md`.
- Guide de départ de Paille : `src/ui/onboarding.ts`, `src/ui/guidance.ts`, `src/ui/PailleDialogue.ts` (dialogues intouchables), tests `tests/onboarding-dom.test.ts`, `tests/start-step4.test.ts`.
- Économie et rythme : `src/config/balance.ts`, `src/config/missions.ts`, `docs/progression-simulation.mjs`, `docs/missions-current.md`.
- Art des lapins : `assets-source/rabbits/<id>/sprite.png` (masters), `public/assets/rabbits/<id>/<id>-v1.png` (jeu), scripts dans `scripts/`.
- Laboratoire (`/dev/`) : `src/dev/`, `docs/laboratory.md`.
