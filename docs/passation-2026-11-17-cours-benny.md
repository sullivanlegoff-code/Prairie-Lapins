# Passation — « Cours cours Benny ! » (17 novembre 2026)

Pour l'IA qui reprend le travail sur la course de Benny. Tu as accès au dossier du jeu ; le propriétaire parle français, tu le tutoies, il n'est pas développeur.

À lire d'abord, dans l'ordre :
1. `AGENTS.md` (règles permanentes du propriétaire, sécurité, Git, commandes).
2. `docs/passation-2026-11-13-cours-benny-suite.md` : fichiers, commandes, banc Chromium.
3. `docs/passation-2026-11-16-trois-agents.md` : outils du banc (feu rouge mémoire, captures). **Sa partie « restes non commités » est dépassée** : voir la section 1 ci-dessous.
4. Ce fichier.

## 1. État Git

- **Branche** : `feature/cours-benny`, dans l'arbre `.claude/worktrees/cours-benny`. Travaille là, pas dans le dossier principal (qui est sur `main`).
- **Dernier commit** : `50ad56b` (le monstre volant). L'arbre est propre : il n'y a rien d'autre à committer.
- La branche contient tout `main` (`8ac8f81`) et a 202 commits de plus (157 fichiers).
- **Rien n'est fusionné dans `main` et rien n'est envoyé sur GitHub.** Le propriétaire dira « Publie » quand il voudra. Un envoi sur `main` publie le jeu pour tous les joueurs. Avant de publier : suite complète, builds, puis `git merge --no-ff` dans `main`.
- **Arbres d'agents `cb-ecran`, `cb-mondes`, `cb-obstacles`** : leurs restes non commités ont été refaits et commités sur `feature/cours-benny` :
  - `47f3100` : boutons du départ et de la pause, poussière ;
  - `d842fd2` : grands moments ;
  - `13a75e5` : lianes et touffes de la lave et de la neige.

  Ces trois arbres ne servent plus. Ne les supprime pas sans l'accord du propriétaire.
- Les autres arbres sous `.claude/worktrees/` sont d'autres chantiers : enclos, mini-jeu de la corde, agent. N'y touche pas.

## 2. Ce qui a été fait le 17 novembre (lots 165 à 175)

| Commit | Contenu |
|---|---|
| `d842fd2` | Un grand moment toutes les 30 à 45 s (pont, couloir, pluie de pièces, longue descente) ; 8 m au moins entre deux objets d'une même voie. |
| `13a75e5` | Lianes et touffes propres à la lave et à la neige. |
| `08bed50` | Le long mur bas au milieu des zones à 5 voies est bâti comme un mur de son monde. |
| `97aaed3` | Les ennemis visent Benny, bondissent vers sa voie et l'attaquent. Ennemis propres à chaque monde (basalte et magma, glace et neige). |
| `027a84f` → `0cc7a7c` | Reliefs assemblés sur les murs, **refusés puis retirés** : le propriétaire veut de grands murs peints cohérents. |
| `01261de`, `8fa6b21` | 30 grands murs peints pour la prairie (un par tronçon de 100 m). |
| `5ddeca0` → `a56d50d` | Murs en cubes « à la Blade of Brim », **refusés** (« trop carré et cubique ») puis retirés. |
| `9ea849a` | **30 décors peints « en volume »** au bord de la prairie : bâtiments, grands arbres, éléments de prairie. Le propriétaire a laissé le choix des sujets. Départ au hasard dans la série, chargement paresseux. |
| `50ad56b` | **Le monstre volant se comporte comme les autres monstres.** |

### Détail des 30 décors (`9ea849a`)

- **Images** : `public/assets/benny-run/grand-mur-01.webp` à `grand-mur-30.webp`, environ 12 Mo en tout, 2048 px de large, raccord gauche-droite sans couture.
- **Code** : dans `src/ui/BennyRunActivity.ts`.
  - `BIG_WALLS`, `bigWallOf(k)` : image du tronçon `k`, décalée de `bigWallStart`, tiré au hasard à chaque partie.
  - `keepBigWalls(g)` ne garde en mémoire que les tronçons proches et libère les autres.
  - `bigWall()` dessine l'image en colonnes cisaillées, avec une brume en bas quand c'est loin.
  - Ces décors ne servent que pour les grands murs **non courables** de la prairie. Les murs courables à socle bleu clair restent en tranches.
  - Tant que l'image d'un tronçon n'est pas chargée, le mur est dessiné en tranches.
- **Encodage** : `scripts/prepare-benny-run-decor.mjs` (liste `BIG_WALLS`), depuis `output/imagegen/course-decor-final-v2/grand-mur-NN.png`.
- **Sources** (ignorées par Git) : `output/imagegen/course-grands-murs-v1/`.
  - `brut-*.png` : peintures brutes de Codex.
  - `finalise2.py` : découpe du ciel magenta, retrait de ce qui flotte, raccord en fondu.
  - `libre.py` et `volume*.txt` : les consignes de peinture.
- **Contrôle** : dans Chromium, sur 12 tronçons. Pas encore vu par le propriétaire sur iPhone.

### Détail du monstre volant (`50ad56b`)

Demande du propriétaire, mot pour mot : « Je veux que le monstre volant se comporte exactement comme les autres monstres. Il vole mais on n'en tiens pas vraiment compte dans le gameplay. »

- **Comment on le frappe** :
  - en glissant vers sa voie ;
  - par une roulade ;
  - par une charge au sol.
- **Un saut ne le frappe plus.**
- **Il touche Benny** dans deux cas :
  - elle le prend de face ;
  - elle le dépasse à côté sans l'avoir frappé.
- **Sur un mur**, il ne l'atteint plus.
- **Dessin** : il plane toujours en hauteur, et seul le dessin en tient compte.
- **Code** :
  - `meet()` dans `src/simulation/bennyRun.ts` (même cas que dragonnet, coffre et braise) ;
  - la visée dans `BennyRunActivity.ts` ;
  - le texte des règles à l'écran ;
  - trois tests dans `tests/benny-run.test.ts`.

## 3. Décisions du propriétaire à respecter

Les décisions plus anciennes sont dans les passations précédentes. À retenir surtout :

- **Murs** :
  - Benny ne court que sur les grands murs dont la tranche du bas est **bleu clair** ;
  - il n'y a plus de muret bas courable ;
  - les décors non courables sont de **grandes planches peintes en volume** qui s'étendent sur plusieurs colonnes et se succèdent ;
  - refusés : les reliefs assemblés, les cubes, mes 5 idées de relief ;
  - avant d'en peindre d'autres, propose-lui.
- **Blade of Brim** : on s'en inspire **dans le genre** (cadrage, rythme, échelle, effets). On ne copie aucun dessin, personnage, texte ni niveau. Ses captures, dans `assets-source/Cours cours benny/`, ne vont **jamais** dans Git ni chez Codex.
- **Benny** : elle reste très fidèle à la Benny du jeu. La Dragon de la course utilise **toujours** le dessin évolué (Écarlate Majestueux).
- **Règles fixes** :
  - écran en **portrait** seulement ;
  - la course se débloque au niveau 25, avec l'Antre du dragon ;
  - les pots cassent sur place, ils ne volent pas ;
  - deux chocs en 10 s, et la Dragon attrape Benny.
- **Économie** : ne touche pas à l'économie de la partie normale ni à la courbe de niveau. Les récompenses de la course sont « à décider plus tard ».
- **Textes** : tutoiement partout, sans le mot « herbe ». **Ne jamais modifier les dialogues de Paille.**
- **Sauvegarde** : elle doit rester compatible. La course n'enregistre que `bennyRun` (record, mètres, records par monde), sans changer de version.

## 4. Questions qui restent au propriétaire (ne pas décider à sa place)

- les récompenses de la course et le nombre de parties récompensées par jour ;
- la musique et le son de la course ;
- un méta-jeu (améliorations, objectifs) ;
- les cœurs comme vies ;
- d'autres décors peints pour la lave et la neige, dans le même esprit que les 30 de la prairie : seulement s'il le demande.

## 5. Vérifications faites (et pas faites)

- `npx tsc --noEmit` : OK.
- `npx vitest run --configLoader runner --maxWorkers 1 tests/benny` : 221 tests OK à `50ad56b`.
- `git diff --check` : OK.
- `npm run build:netlify` : OK à `50ad56b`. L'aperçu iPhone (port 5174, sert `netlify-site/` du dépôt principal) est à jour.
- **Contrôles Chromium** : scènes `volant.cjs` et `trentemurs.cjs` dans `output/cours-benny-nuit/`. Planches `volant.png` et `trentemurs*.png`.
- **Suite complète** : non relancée depuis le 16 novembre. Le propriétaire la veut seulement avant une publication : environ 10 min, sous le feu rouge.
- **Aucun essai iPhone** n'a été fait par l'IA. Le propriétaire teste lui-même.

## 6. Outils et commandes (rappel)

- **Feu rouge mémoire** : `bash output/verrous/lourd.sh <commande>`.
  - Au plus 2 commandes lourdes en même temps (tsc, vitest, Chromium, `codex exec`, encodage) ; la machine a 7,8 Go.
  - Lance en arrière-plan toute commande qui peut dépasser 2 à 3 minutes.
- **Capture Chromium** : `bash output/cours-benny-nuit/capture.sh <arbre> 5199 <scène.cjs> [nom]`.
  - Écrire une scène : voir `volant.cjs`, avec `api.step`, `api.game(fn)`, `api.input(sens)` et `api.snap(nom)`.
  - Planche : `python output/cours-benny-nuit/sheet.py "<motif>" sortie.png colonnes largeur`.
  - Playwright : `PLAYWRIGHT_MODULE=../Project-L/prairie-lapins-prototype/node_modules/playwright`, en chemin absolu.
- **Images Codex** : `codex exec -m gpt-6-luna -c model_reasoning_effort=low --skip-git-repo-check --sandbox workspace-write -C . -i <référence> < consigne.txt`.
  - L'image sort dans `~/.codex/generated_images/<session>`.
  - Toujours sous le feu rouge, en arrière-plan.
- **Encodage des décors** : depuis l'arbre, `node scripts/prepare-benny-run-decor.mjs --sources ../../../output/imagegen/course-decor-final-v2`, avec `PLAYWRIGHT_MODULE` défini.
- **Serveurs** :
  - n'arrête que **tes** serveurs, par leur numéro, jamais tous les `node` ;
  - le serveur d'aperçu iPhone (`vite preview … --port 5174 --host 0.0.0.0`) doit rester allumé ;
  - reconstruire avec `npm run build:netlify` suffit pour qu'il serve la nouvelle version.
- **Journal des lots** : `output/cours-benny-nuit/journal.md`. Ajoute une ligne par lot.

## 7. Git : rappels

- Ajoute les fichiers un par un : jamais `git add -A`, `git add .`, `reset --hard`, `clean`, ni de réécriture d'historique.
- Ne committe jamais `output/`, `assets-source/` ni `.claude/`. Aucun secret ni chemin personnel dans un fichier suivi : le dépôt est public.
- Messages de commit en français.
- Fusion dans `main` et `git push` : **seulement sur « Publie »** du propriétaire.

## 8. Prochaine étape conseillée

Attendre le retour du propriétaire sur son iPhone : les 30 décors de la prairie et le monstre volant. Ensuite :
- corriger ce qu'il signale ;
- puis, quand il dit « Publie » : suite complète, builds, fusion `--no-ff` dans `main`, envoi.
