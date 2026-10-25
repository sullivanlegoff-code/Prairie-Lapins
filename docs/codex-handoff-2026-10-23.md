# Passation Claude → Codex — 2026-10-23

Document factuel. Il complète `docs/claude-handoff-2026-10-22.md` et `AGENTS.md` (racine du dépôt), qui restent valables.

## 1. Point de reprise

- Branche : `feature/purchasable-recipes`. HEAD du code : `71188f1`.
- Derniers commits : `71188f1` sources d'habitats suivies et contrôles stricts · `bef95f1` six habitats illustrés de niveau 1 · `5cef8cd` retrait Terre/Mottelin/Géant/Brumelin (v16) · `a0fd764` nommage individuel (v15) · `6243090` · `eb11988` trois tailles d'enclos.
- Dernier build : `netlify-site/build-revision.txt` contient `bef95f1572b9249f549773656b13ab6a93f9f26e-modifie` (vérifié). Aucun build depuis `71188f1`, qui ne change que des sources et des contrôles (les PNG de production sont identiques octet pour octet). Le suffixe `-modifie` vient des fichiers préexistants non commités ; il n'est pas masqué.
- Preview : `http://192.168.1.13:5174/dev/` (laboratoire) et `/` (jeu normal). Processus `node node_modules/vite/bin/vite.js preview --outDir netlify-site --port 5174 --strictPort --host 0.0.0.0`, PID 14776, vérifié actif (HTTP 200 sur `/dev/`). Il sert le build `bef95f1-modifie`. Ne pas le relancer sans besoin.
- État du dépôt : `git status --short` ne montre que `M ../.gitignore`, `M docs/progress.md`, `?? docs/_debug-guided.cjs`, `?? docs/art-bible-buildings.md`, `?? docs/art-references/`, `?? docs/rabbit-breeding-rules.md`, `?? output/` (plus ce document tant qu'il n'est pas commité).

## 2. Changements récents

- **Retrait Terre, Mottelin, Géant, Brumelin** : type, habitat, espèces, achats, recettes, garanties et missions « Découvrir Terre/Brumelin » supprimés, sans compensation. Frontière de sauvegarde **v16** (schéma unique, pas de chaîne de migration) : les anciennes parties (versions 1 à 15) repartent sur une nouvelle partie avec un message clair, l'import incompatible est refusé sans rien modifier. Détails : `docs/catalog-boundary-v16.md`. Carnet de recettes vide au départ.
- **Trois tailles d'enclos** (4×4, 6×5, 8×6 cellules fines) et amélioration au niveau 3 payée 10 cœurs. Le rendu vectoriel reste utilisé aux niveaux 2 et 3 et pour les enclos compacts au-dessus du niveau 1.
- **Nommage individuel** des lapins depuis leur fiche, animations de déplacement existantes inchangées.
- **Six habitats illustrés de niveau 1** (paille, neige, feu, métal, vol, universel ; jamais Terre) dans le monde, le fantôme de placement/déplacement et les cartes de boutique. Autorité unique : `src/config/habitatArt.ts` (`habitatArtFor`, `HABITAT_LEVEL1_ART`, `HABITAT_ART_LAYOUT`). Miniatures : `src/ui/habitatThumbnails.ts`. Fichiers livrés : `public/assets/habitats/habitat-<type>-level1.png` (copies recadrées et réduites de moitié, 605×436 à 623×438).
- **Sources suivies** : les six originaux 1254² sont dans `assets-source/habitats/level1/` (hors `public/`). `node scripts/derive-habitat-art.mjs --check` vérifie leurs SHA-1 et échoue si une source ou un dérivé manque, est altéré ou diffère ; `--sources=<dossier>` et `--target=<dossier>` permettent de le tester sur un dossier temporaire. Les originaux de `output/imagegen/habitats-level1-v1/` restent intacts et non indexés.

## 3. Points ouverts

- `HABITAT_ART_LAYOUT` resserre les trois places de repos (−34/+34 en arrière, 0 devant) et la zone de promenade des enclos illustrés, car la pelouse illustrée est bien moins profonde que l'ancienne (environ 35 unités contre 103). **À valider visuellement par le propriétaire.**
- Les captures montrent des lapins serrés, qui se chevauchent entre eux et devant les refuges (taille des lapins inchangée). Ne pas présenter cette composition comme définitivement approuvée.
- `tests/habitat-art.test.js` contient un caractère NUL (dans la chaîne d'empreinte `'blob ' + … + '\0'`), détecté par Codex ; git traite le fichier comme binaire. Signalé ici, **non corrigé** dans cette mission. Les tests passent.
- Propositions artistiques des niveaux 2 et 3 dans `output/imagegen/habitats-level2-v1/` et `habitats-level3-v1/` : **non intégrées**. Le concept Paille niveau 2 garde un fond coloré à corriger avant toute intégration.
- Orphelins connus : clés `prairie-lapins.backup.before-v*` éventuelles dans d'anciens navigateurs (plus lues) ; `docs/test-saves/*.json` (v2 à v4) ne se chargent plus.
- Aucun nouvel essai iPhone déclaré ; seuls des contrôles Chromium ont été faits.

## 4. Validation réellement effectuée

- **Dernier passage complet** (pour `bef95f1`) : `vitest run` 1880 tests / 105 fichiers verts, `tsc --noEmit` propre, `git diff --check` propre, `build:netlify` avec `verify-production` OK (production 61 fichiers, laboratoire 57), contrôle Chromium sur le build compilé (six cartes de boutique, six enclos et résidents en mouvement, achat/fantôme/sélection/déplacement, zoom maximal/pan/Recentrer, niveaux 2 et 3 inchangés, aucune erreur JavaScript).
- **Mission `71188f1`** : 41 tests ciblés (`tests/habitat-art.test.js`, `tests/habitat-shop-art-dom.test.ts`), typecheck, `git diff --check`, `--check` positif, et trois vérifications négatives sur un dossier temporaire (source absente, dérivé absent, source altérée : code de sortie 1 à chaque fois). SHA-1 des six PNG de production identiques avant/après.
- **Pas de suite complète ni de build après `71188f1`.**
- Captures (dossier temporaire, hors dépôt) : `<dossier-temporaire>\prairie-habitat-final\` — `shop-six-cards.png`, `planche-six-habitats.png`, `ghost.png`, `max-zoom-pan.png`, `levels.png`, `selected.png`, `recentred.png`, `normal-start.png`, `final-<type>.png`, `report.json`. Elles peuvent disparaître : les régénérer si besoin.

## 5. Règles de reprise

- Une seule mission courte à la fois. Le propriétaire transmet les prompts via son orchestrateur ; ne pas choisir de nouveau chantier.
- Ne pas intégrer tous les niveaux ni tous les types en une seule mission.
- Lire `docs/rabbit-breeding-rules.md` avant les missions de reproduction, en distinguant les règles cibles du comportement actuel.
- Préserver tous les changements inconnus ou protégés : `../.gitignore`, `../.claude/`, `docs/progress.md`, `docs/_debug-guided.cjs`, `docs/art-bible-buildings.md`, `docs/art-references/`, `docs/rabbit-breeding-rules.md` (non suivi, hors de tout commit) et `output/` (images générées, non indexé).
- Jamais : `git add -A`, reset, clean global, GitHub (compte suspendu), push, publication, ni modification de `dist/`.
- Pas de `-modifie` masqué, pas d'assertion affaiblie sans le dire, et commit avec le trailer `Co-Authored-By`.
