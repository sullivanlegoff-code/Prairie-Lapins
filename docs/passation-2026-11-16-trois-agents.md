# Passation — « Cours cours Benny ! », trois agents en parallèle (16 novembre 2026, soir)

Pour l'agent qui reprend la coordination. Le propriétaire veut « reprendre exactement la même chose » : trois agents Claude en parallèle sur le plan `docs/plan-qualite-cours-benny-2026-11-16.md`, avec pour objectif un jeu de course aussi proche que possible de Blade of Brim **dans le genre**. On garde nos personnages, nos dessins et notre monde ; on ne copie aucun dessin, personnage, texte ni niveau de Blade of Brim.

À lire d'abord, dans l'ordre :
1. `AGENTS.md`.
2. `docs/passation-2026-11-13-cours-benny-suite.md` (fichiers, commandes, banc Chromium).
3. `docs/plan-qualite-cours-benny-2026-11-16.md` (audit et plan en 5 phases).
4. Ce fichier.

## 1. Où en est chaque chose

- **Branche de base** : `feature/cours-benny`, arbre `.claude/worktrees/cours-benny`.
  - Dernier commit avant les agents : `4732150` (plan d'action), après le lot 162 `10e0e9b` (objets et ennemis à l'échelle de Blade of Brim).
  - Rien n'est fusionné dans `main`, rien n'est envoyé sur GitHub.
- **Trois arbres d'agents**, créés depuis `4732150`. Leur `node_modules` est une jonction vers celui du dépôt principal : ne jamais lancer `npm install`.

| Agent | Arbre (sous `.claude/worktrees/`) | Branche | Port | Commits faits |
|---|---|---|---|---|
| A — écran | `cb-ecran` | `feature/cours-benny-ecran` | 5201 | `297d8a2` centre libre, une aide à la fois · `76345dd` bandeau du haut (2 cœurs = chocs avant la Dragon, règle inchangée) · `2a7597a` chiffres dorés, pièces qui volent au compteur · `b48b032` écran de fin animé |
| B — obstacles et combat | `cb-obstacles` | `feature/cours-benny-obstacles` | 5202 | `285a934` obstacles peints en volume (nouveaux atlas `obstacles` et `eclats`) · `9c26013` flèches au lieu de « saute » / « roulade » · `db30eed` coups plus francs (projection, éclair blanc, tessons peints, arc du bâton) |
| C — mondes et rythme | `cb-mondes` | `feature/cours-benny-mondes` | 5203 | `3b862c1` objets de bord et ciel pour la lave et la neige · `3177e20` arche peinte entre les mondes, braises et flocons |

- **Travail non commité laissé dans les arbres** (arrêt demandé par le propriétaire pendant qu'ils travaillaient) :
  - **A** : `BennyRunActivity.ts` (7 lignes) : boutons du départ et de la pause au style de l'écran de fin. C'est le lot 5, en cours.
  - **B** : `BennyRunActivity.ts` (25 lignes) : poussière peinte (`dust()`) à l'atterrissage et sur les murs. C'est le lot 4, effets peints, en cours.
  - **C** : lot 4, les grands moments, en cours :
    - dans `bennyRun.ts` (+92 lignes) : `momentFirstMs`, `momentMs` 30–45 s, `RunMoment` (bridge, corridor, coinRain, descent), `momentFits` / `momentDue`, `laneGap` 8 m entre deux objets d'une même voie ;
    - dans `BennyRunActivity.ts` : la route descend pendant une « longue descente » (`DESCENT`) ;
    - dans `tests/benny-run.test.ts` : +54 lignes de tests.
  - **C** a aussi laissé quatre textures non suivies, `decor-lianes-lave/-neige.webp` et `decor-touffes-lave/-neige.webp` (lot 5, pas encore branchées ni dans le script de décor).
  - **C** comparait les pièces par partie avant/après (script `coins.mjs` du banc) pour vérifier que l'économie ne bouge pas : **résultat non obtenu**.
- **Rien de ce que les agents ont fait n'a été relu par le coordinateur** :
  - je n'ai regardé ni diffs ni captures ;
  - aucun des trois n'a rendu son rapport final ;
  - les trois branches ne sont **pas** fusionnées dans `feature/cours-benny`.
  - Leurs messages de commit disent que tsc et les tests `tests/benny` étaient verts à chaque commit : à revérifier.

## 2. Pour reprendre

1. Pour chaque arbre :
   - lire `git log feature/cours-benny..HEAD`, `git status` et `git diff` ;
   - regarder les captures de l'agent dans `output/cours-benny-nuit/captures/A-*`, `B-*`, `C-*`.
2. Relancer chaque agent avec sa mission (section 4) en lui disant ce qui est déjà commité et ce qui reste dans son arbre. Ou bien finir soi-même un petit reste.
3. Quand un agent a fini, relire son diff et ses captures, puis lancer tsc et `tests/benny` dans son arbre.
4. Fusionner les trois branches dans `feature/cours-benny`, dans l'ordre C, B, A :
   - `git merge --no-ff`, branche par branche ;
   - les conflits probables sont tous dans `src/ui/BennyRunActivity.ts`, chaque agent ayant sa zone.
5. Après fusion :
   - lancer tsc, `tests/benny` et une partie réelle dans Chromium (`vitrine.cjs`) ;
   - puis `npm run build:netlify` et l'aperçu iPhone (port 5174 ; le serveur d'aperçu tourne déjà, il sert `netlify-site/` : reconstruire suffit).
6. **Ne pas lancer la suite complète** (10 min) : le propriétaire l'a redemandé le 16 novembre. Seulement avant une publication.

## 3. Outils du banc (dans `output/`, ignoré par Git, présents sur la machine)

- **Feu rouge mémoire** : `output/verrous/lourd.sh <commande>`.
  - Au plus 2 commandes lourdes en même temps pour tous les agents (tsc, vitest, Chromium, `codex exec`, scripts d'atlas). La machine a 7,8 Go, souvent moins de 1 Go libre.
  - Les places sont des dossiers `output/verrous/slot-1` et `slot-2`. Une place de plus de 20 minutes est reprise d'office.
  - **Après un arrêt d'agents, vérifier qu'il n'en reste pas** : c'était le cas ce soir, et je les ai supprimées.
- **Capture Chromium** : `output/cours-benny-nuit/capture.sh <arbre> <port> <scène.cjs> [nom]`.
  - Elle lance le serveur de dev de l'arbre sur son port, joue la scène et arrête ce serveur, le tout sous le feu rouge.
  - `harness.cjs` lit le port dans `RUN_PORT`.
- **Règles communes données aux agents** : `output/verrous/regles-communes.md`.
  - Elles couvrent le contexte, l'arbre, la mémoire, le banc, les images Codex (intégration directe autorisée, sans planche de concepts), les règles du propriétaire, Git et le rapport.
  - Chaque prompt d'agent commence par « lis et applique ce fichier ».

## 4. Les trois missions (à redonner telles quelles, avec ce qui est déjà fait)

- **A — écran** (phases 1 et 4, interface) :
  1. centre de l'écran libre, une aide à la fois, danger montré par le bord rouge ;
  2. bandeau du haut au style du jeu (look B, Lilita One), cœurs pour les chocs sans changer la règle ;
  3. chiffres de coups dorés qui sautent, pièces qui volent au compteur ;
  4. écran de fin animé, seulement les lignes non nulles, « Rejouer » mis en avant, économie inchangée ;
  5. départ et pause dans le même style.
  - **Zone** : DOM, CSS (`src/display/benny-run.css`), `flashes`, appel dans `GameUI.ts`.
  - **Lots 1 à 4 faits**, le 5 est en cours.
- **B — obstacles et combat** (phases 1 et 2) :
  1. obstacles peints en volume ;
  2. pictogrammes au lieu des mots ;
  3. coups plus forts ;
  4. effets peints (poussière, étincelles, éclats) à la place des points de `burst()` ;
  5. bâton dans la patte pendant tout le coup sauté, si c'est faisable proprement.
  - **Zone** : `figure()`, `thing()`, `vanish()`, `burst()`, `SHAPES` / `GROW`, `scripts/prepare-benny-run-art.mjs`, `tests/benny-run-art.test.ts`.
  - **Lots 1 à 3 faits**, le 4 est en cours.
- **C — mondes et rythme** (phases 2 et 3) :
  1. objets de bord pour la lave et la neige ;
  2. un ciel par monde ;
  3. le passage d'un monde à l'autre comme une scène ;
  4. grands moments toutes les 30 à 45 s avec les règles existantes, plus l'écart minimal dans une voie. Il faut vérifier par les robots du banc que la survie médiane reste vers 85–100 s et que le début reste doux, et donner les chiffres avant/après ;
  5. lianes et touffes propres à la lave et à la neige.
  - **Zone** : `roadside()`, `PROPS`, `backdrop()`, décor et murs, `scripts/prepare-benny-run-decor.mjs`, génération dans `bennyRun.ts`, leurs tests.
  - **Lots 1 à 3 faits** (le 2 dans le 1), le 4 est en cours et non commité.

## 5. Leçons de ce premier essai

- **Arrêts.** Les trois agents ont été arrêtés une fois par le système, presque en même temps, sur « aucun progrès pendant 600 s ».
  - Cause probable : une commande longue tenue au premier plan (`codex exec` de plusieurs minutes, ou attente du feu rouge).
  - Consigne donnée à la reprise, qui a marché : toute commande qui peut dépasser 3 minutes part en arrière-plan (`run_in_background`), et l'agent attend sa notification.
  - **Mets-la dans le prompt dès le départ.**
- **Commits.** Ils ont bien avancé une fois relancés : 9 commits en tout. Demande-leur de committer chaque lot dès qu'il est contrôlé (c'est ce qu'ils ont fait).
- **Processus orphelins.** Un agent arrêté peut laisser des processus et des places du feu rouge occupées. Vérifie-les : `Get-Process node,codex`, les ports 5201 à 5203 et `output/verrous/slot-*`.
  - Le serveur d'aperçu iPhone (`vite preview … --port 5174`) est un processus `node` lancé à 12:23 le 16 novembre : **ne pas l'arrêter**.
- **Images.** Codex produit les images sans difficulté. Les sources sont dans `output/imagegen/` (par exemple `course-obstacles-v1`, `course-murs-mondes-v1`).

## 6. Règles à garder

- Pas de fusion dans `main`, pas d'envoi sur GitHub : c'est le propriétaire qui les demande.
- Pas de changement d'économie sans le signaler et sans relancer `node docs/progression-simulation.mjs`.
- Tutoiement dans les textes, et jamais toucher aux dialogues de Paille.
- Jamais `git add -A`. Jamais `output/`, `assets-source/`, `.claude/` ni une capture de Blade of Brim dans Git.
- Aucun essai iPhone n'a été fait. Les contrôles se font dans Chromium seulement.
