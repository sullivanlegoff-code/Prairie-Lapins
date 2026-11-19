# Passation — « Cours cours Benny ! », suite du 13 novembre 2026 (lots 114 à 122)

Pour l'agent Claude qui reprend le mini-jeu. À lire dans l'ordre : `AGENTS.md`, `docs/passation-2026-11-12-cours-benny.md` (fichiers, règles, commandes), `docs/passation-2026-11-13-cours-benny.md` (section 7 : mesures des lots 114 à 120), puis ce fichier, qui donne l'état actuel.

## 1. État

- **Branche** `feature/cours-benny`, arbre dédié `.claude/worktrees/cours-benny`. Dernier lot : `bdeef75` (lot 122). L'arbre est propre.
- **Rien n'est fusionné dans `main`, rien n'est envoyé sur GitHub.** Ne fais ni `git merge` dans `main` ni `git push` ni mise en production : le propriétaire le demande lui-même (un envoi sur `main` publie le jeu).
- **Rien n'a été essayé sur iPhone.** Tous les contrôles sont faits dans Chromium (sans carte graphique), en 390 × 844 à densité 2.
- **Validation** : `npx tsc --noEmit` sans erreur ; tests de la course : 194 sur 194 (`tests/benny*`).
  - Dernière suite complète, avant la correction d'un test : 2 247 réussis, 1 échoué, 1 ignoré.
  - Le test échoué (`tests/benny-run-art.test.ts`, états du coffre) attendait 3 images au lieu de 4 ; il est corrigé.
  - **La suite complète n'a pas été relancée depuis : c'est la première chose à faire** (`npx vitest run --configLoader runner --maxWorkers 1 --testTimeout 30000`, seule, environ 8 minutes).

## 2. Ce qui a été fait (en langage de joueur)

| Lot | Commit | Contenu |
|---|---|---|
| 114 | `58a595f` | Coffre en trois états peints : intact, projeté, brisé |
| 115 | `f3980ff` | Benny tombe dans le vide (la Dragon la rattrape) ; elle se penche vers le mur |
| 116 | `1fed450` | Dragonnets, braises, volants repeints (style concept C), disparition propre à chacun |
| 117 | `c266e54` | Piste peinte : planches, herbe, mur de terre et d'herbe (praticable) distinct du mur de pierre, falaise, bord du vide |
| 118 | `06e6291` | Le sol peint sur un calque à un pixel par point : 60 images par seconde |
| 119 | `49d5da9` | Chaque pose de Benny reprend le contour et la crème de la Benny du jeu (écart sous 5) ; durées des poses réglées |
| 120 | `b852d9e` | Attaque en changeant de voie = petit bond peint (élan, bond, coup, retombée) ; vraie roulade avant peinte, le bâton au-dessus de la tête qui tourne avec elle ; glissement entre voies avec inertie |
| 121 | `de40403` | Course sur les murs : la caméra bascule vers le mur, Benny couchée dessus enchaîne ses foulées, terre qui vole, bond d'un mur à l'autre |
| 122 | `bdeef75` | Coup lointain (voie d'après) ; coffre projeté à 28 m au lieu de 7, et peint « abîmé » jusqu'au second coup |

Détails des règles du lot 122 (demande du propriétaire, mot pour mot dans le code, `arrive` dans `src/simulation/bennyRun.ts`) :
- Benny tout à gauche, un ennemi tout à droite : un glissement vers la droite le frappe (coup `'far'`) et elle finit au milieu.
- Un ennemi au milieu et un à droite sur la même ligne (`farLine` : 1,5 m au plus) : les deux d'un coup.
- Seulement les ennemis, pas les pots (décision prise sans le propriétaire, à lui signaler s'il en parle).

## 3. Où est quoi

- **Règles** : `src/simulation/bennyRun.ts`. Constantes dans `BENNY_RUN` (`chestKnock: 28`, `farLine`, `wallRunHeight`…) ; fonctions `arrive` (frappe en changeant de voie), `strike`, `leap` (d'un mur à l'autre, seulement au-dessus d'un trou).
- **Rendu** : `src/ui/BennyRunActivity.ts`.
  - Durées : `POSE_MS`, `HOP_MS` (bond d'attaque : 40 / 90 / 200 / 320 ms), `ROLL_TURN` (300 ms par tour), `GLIDE` (ressort entre voies), `WALL_ROLL` / `WALL_TILT` / `WALL_ZOOM` (course sur mur), `GHOST_MS` (disparitions).
  - Les effets d'un coup sauté (éclats, anneau, points, petite pause, disparition) attendent `HOP_MS.bound`, via `later()`.
  - La bascule du monde sur un mur est appliquée dans `road()`, après le fond, et défaite par le `c.restore()` de `draw()`.
- **Images** : `scripts/prepare-benny-run-art.mjs`.
  - Table `CHARACTERS` : `benny`, `benny-moves`, `benny-strike`, `benny-roll`, `dragon`, `creatures`, `chests` (quatre cases : `intact`, `knocked`, `broken`, `damaged`), `objets`.
  - Sorties : `public/assets/benny-run/*.webp` et `src/config/bennyRunArt.json`.
  - Décor : `scripts/prepare-benny-run-decor.mjs`.
- **Sources peintes** (ignorées par Git) : `output/imagegen/course-benny-final-v1/` (`sheet-*.png`, `sheet-chests4.png`). Planches d'origine dans `benny-attaque-v1/`, `coffre-abime-v1/`, `course-decor-final-v1/`.
- **Commande d'atlas**, à lancer depuis l'arbre `cours-benny`. Les chemins par défaut du script n'existent pas dans l'arbre : donne-les. `PLAYWRIGHT_MODULE` doit être le chemin **absolu** du dossier `Project-L/prairie-lapins-prototype/node_modules/playwright`, voisin du dépôt (voir `AGENTS.md`, section 5) :
  `PLAYWRIGHT_MODULE=<chemin absolu de playwright> node scripts/prepare-benny-run-art.mjs --sources ../../../output/imagegen/course-benny-final-v1 --reference ../../../output/imagegen/benny-enclos-final-v1/A1-reference.png`

## 4. Banc de contrôle Chromium (ignoré par Git)

Dossier `output/cours-benny-nuit/` :

1. Lance le serveur de dev depuis l'arbre : `node node_modules/vite/bin/vite.js --port 5199 --strictPort --host 127.0.0.1`. À la fin, arrête seulement ce processus, retrouvé par son port (`Get-NetTCPConnection -LocalPort 5199`).
2. Le banc `harness.cjs` monte la course avec une horloge pilotée, image par image. Les scènes sont dans `scenes.cjs` (`chest`, `foes`, `benny`), plus des fichiers à part : `attaque.cjs`, `mur.cjs`, `loin.cjs`, `decor.cjs`, `decor2.cjs`, `timeline.cjs` (frise des poses), `perf.cjs`.
3. Pour une scène dans un fichier à part :
   `node -e "const s=require('./scenes.cjs'); s.X=require('./X.cjs'); process.argv[2]='X'; require('./harness.cjs')" X`
   Les captures vont dans `captures/X/`.
4. Pour en faire une planche : `python sheet.py "<glob>" out.png <colonnes> <largeur>`, ou `crop.py` avec une zone.
5. `realtime.cjs` mesure la course en temps réel (`NODECOR=1` pour comparer sans décor). Dernières mesures : 16,6 ms en médiane avec et sans décor.
6. Le message `pageerror: Framebuffer status: Incomplete Attachment` vient de Phaser au démarrage de la page, pas de la course : ignore-le.
7. Le journal du chantier est dans `output/cours-benny-nuit/journal.md`.

## 5. Règles à garder (en plus d'`AGENTS.md`)

- Codex ne sert qu'à **produire des images**, jamais à coder. Gabarit : `output/imagegen/benny-attaque-v1/run.sh` (`codex exec -m gpt-6-luna … -i <références> < p-*.txt`, puis copie depuis `~/.codex/generated_images/<session>`).
- **Benny reste très proche de celle du jeu.** Toute nouvelle pose passe par `matchBenny` (automatique pour les noms en `benny…`). Vérifie la taille sur le pompon (option `zoom` dans `CHARACTERS`).
- **Blade of Brim** : l'objectif du propriétaire demandait de donner ses captures à Codex pour la direction artistique. Elles ont servi seulement pour le mouvement, avec la consigne écrite « ne copie rien ». Les vidéos du propriétaire sont dans `assets-source/Cours cours benny/` (jamais dans Git).
- Pas de son, pas d'économie ni de progression, pas de mise en production. Tutoiement dans les textes ; ne jamais toucher aux dialogues de Paille.
- Ajoute à Git uniquement les fichiers concernés (jamais `git add -A`). Jamais `.claude/`, `output/`, `assets-source/`.
- Si `tests/__snapshots__/procedural-art.test.ts.snap` ne change que par ses fins de ligne, restaure-le.

## 6. Défauts connus et pistes

- **À vérifier sur iPhone** : le rythme du bond d'attaque et de la roulade, l'angle de bascule sur mur (environ 13°), la longueur du vol du coffre, et la fluidité (notamment pendant la bascule sur mur, jamais mesurée seule).
- Pendant le coup sauté, Benny tient le bâton dans la patte ; en courant, elle le tient dans la bouche. Le passage est très rapide.
- La pose de retombée du coup a les deux oreilles sur le côté : c'est voulu, mais l'effet est un peu marqué.
- Sur le coffre abîmé, le « ! » d'alerte cache en partie ses étoiles.
- Au premier coup sur un coffre, le jeu affiche « +0 ». C'était déjà le cas avant ; ce n'est pas réglé.
- Quand le monstre est à la limite de portée, le bâton ne le touche pas tout à fait à l'écran.
- Sur un mur, Benny réutilise ses poses de course couchées (pas de planche dédiée). Le propriétaire peut demander des poses peintes exprès.

## 7. Prochaine étape conseillée

1. Relance la suite complète.
2. Prépare l'aperçu iPhone pour le propriétaire : `npm run build:netlify` dans l'arbre, puis le serveur d'aperçu (voir `AGENTS.md`, section 5).
3. Attends ses retours avant de fusionner quoi que ce soit.
